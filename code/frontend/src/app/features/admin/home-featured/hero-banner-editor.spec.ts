import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { of, Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HeroBannerEditor } from './hero-banner-editor';
import { AdminHttp } from '../../../core/auth/admin-http';
import { AuthService } from '../../../core/auth/auth.service';

describe('HeroBannerEditor', () => {
  afterEach(() => vi.useRealTimers());
  function setup() {
    const get = vi.fn().mockReturnValue(
      of({
        version: 2,
        banners: [
          { id: 'a', alt: 'A', src: 'a.webp' },
          { id: 'b', alt: 'B', src: 'b.webp' },
        ],
      }),
    );
    const mutate = vi.fn(),
      upload = vi.fn(),
      epoch = signal(0);
    TestBed.configureTestingModule({
      imports: [HeroBannerEditor],
      providers: [
        { provide: AdminHttp, useValue: { get, mutate, upload } },
        { provide: AuthService, useValue: { user: signal({ role: 'OWNER' }), epoch } },
      ],
    });
    const fixture = TestBed.createComponent(HeroBannerEditor);
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, get, mutate, upload, epoch };
  }
  it('reorders/removes and sends a separate versioned save, preserving a conflict draft', () => {
    const { c, mutate } = setup();
    c.move(1, -1);
    expect(c.rows().map((r) => r.id)).toEqual(['b', 'a']);
    c.remove(c.rows()[1]);
    const result = new Subject();
    mutate.mockReturnValue(result);
    c.save();
    c.save();
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]).toEqual([
      'PUT',
      '/hero-banners',
      { version: 2, banners: [{ id: 'b', alt: 'B' }] },
    ]);
    result.error({ status: 409 });
    expect(c.dirty()).toBe(true);
    expect(c.rows()[0].id).toBe('b');
    expect(c.error()).toContain('thay đổi');
  });
  it.each([
    ['banner_recipe_unavailable', 'hero-v1'],
    ['local_media_unavailable', 'chưa được bật'],
  ])('explains configuration error %s while preserving the previous image', (code, message) => {
    const { c, upload, fixture } = setup();
    const response = new Subject();
    upload.mockReturnValue(response);
    const row = c.rows()[0];
    c.select(new File(['x'], 'banner.jpg', {type:'image/jpeg'}), row);
    response.error({status:503,error:{error:code}});
    fixture.detectChanges();
    expect(row.id).toBe('a');
    expect(row.pending).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(message);
  });
  it('retains the previous image after failed replacement and reuses requestKey on retry', () => {
    const { c, upload } = setup();
    const row = c.rows()[0];
    const first = new Subject();
    upload.mockReturnValueOnce(first).mockReturnValueOnce(new Subject());
    c.select(new File(['x'], 'banner.jpg', { type: 'image/jpeg' }), row);
    const key = (upload.mock.calls[0][1] as FormData).get('requestKey');
    // Start again with the same file via retry after a network error.
    first.error({ status: 0 });
    c.retry(row);
    expect((upload.mock.calls[1][1] as FormData).get('requestKey')).toBe(key);
    expect(row.id).toBe('a');
  });
  it('ignores stale upload responses after remove or logout and caps the draft at ten', () => {
    const { c, upload, epoch, fixture } = setup();
    const response = new Subject();
    upload.mockReturnValue(response);
    const row = c.rows()[0];
    c.select(new File(['x'], 'x.png'), row);
    c.remove(row);
    response.next(
      new HttpResponse({ body: { id: 'stale', status: 'READY', previewUrl: 'stale' } }),
    );
    expect(c.rows().some((r) => r.id === 'stale')).toBe(false);
    const another = new Subject();
    upload.mockReturnValue(another);
    c.select(new File(['x'], 'y.jpg'));
    epoch.set(1);
    fixture.detectChanges();
    another.next(
      new HttpResponse({ body: { id: 'logged-out', status: 'READY', previewUrl: 'bad' } }),
    );
    expect(c.rows().some((r) => r.id === 'logged-out')).toBe(false);
    while (c.rows().length < 10) c.select(new File(['x'], 'z.jpg'));
    const n = upload.mock.calls.length;
    c.select(new File(['x'], 'extra.jpg'));
    expect(upload.mock.calls.length).toBe(n);
  });
  it('adds/replaces only after READY and discards a superseded replacement', () => {
    vi.useFakeTimers();
    const { c, upload, get } = setup();
    const first = new Subject(),
      second = new Subject();
    upload.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const row = c.rows()[0];
    c.select(new File(['old'], 'old.jpg'), row);
    c.select(new File(['new'], 'new.jpg'), row);
    first.next(new HttpResponse({ body: { id: 'old', status: 'READY', previewUrl: 'old.jpg' } }));
    expect(row.id).toBe('a');
    get.mockReturnValue(of({ id: 'new', status: 'READY', previewUrl: 'new.jpg' }));
    second.next(new HttpResponse({ body: { id: 'new', status: 'PENDING' } }));
    vi.advanceTimersByTime(1);
    expect(row.id).toBe('new');
    expect(row.preview).toBe('new.jpg');
    expect(c.canSave()).toBe(true);
  });
  it('rechecks a timed-out job without posting the file again and stops on destroy', () => {
    vi.useFakeTimers();
    const { c, upload, get, fixture } = setup();
    const response = new Subject();
    upload.mockReturnValue(response);
    get.mockReturnValue(of({ id: 'slow', status: 'PROCESSING' }));
    c.select(new File(['x'], 'slow.jpg'));
    const row = c.rows()[2];
    response.next(new HttpResponse({ body: { id: 'slow', status: 'PENDING' } }));
    vi.advanceTimersByTime(180001);
    expect(row.pending).toBe(false);
    expect(row.uploadId).toBe('slow');
    expect(row.error).toBeTruthy();
    c.retry(row);
    expect(upload).toHaveBeenCalledTimes(1);
    fixture.destroy();
    const calls = get.mock.calls.length;
    vi.advanceTimersByTime(2000);
    expect(get.mock.calls.length).toBe(calls);
  });
  it('polls READY without another upload and preserves old image when encoding fails', () => {
    vi.useFakeTimers();
    const { c, upload, get } = setup();
    const response = new Subject();
    upload.mockReturnValue(response);
    get.mockReturnValue(of({ id: 'new', status: 'FAILED', errorCode: 'invalid_image' }));
    const row = c.rows()[0];
    c.select(new File(['x'], 'x.jpg'), row);
    response.next(new HttpResponse({ body: { id: 'new', status: 'PENDING' } }));
    vi.advanceTimersByTime(1000);
    expect(row.id).toBe('a');
    expect(row.error).toBeTruthy();
    expect(row.pending).toBe(false);
  });
});
