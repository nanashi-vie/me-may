import { testBook } from './book-test-fixture';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { BookUploadQueue, PREPARE_BOOK_IMAGE } from './book-upload-queue';
import { BookApi } from './book-api';
const photo = () =>
  new File(
    [
      Uint8Array.from(
        atob(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7VkAAAAASUVORK5CYII=',
        ),
        (c) => c.charCodeAt(0),
      ),
    ],
    'photo.png',
    { type: 'image/png' },
  );
describe('book photo queue', () => {
  function setup() {
    const uploads: Subject<any>[] = [];
    const api = {
      createSession: vi.fn(() => of({ id: 'session', media: [], state: 'OPEN', expiresAt: '' })),
      uploadTemporary: vi.fn(
        (session: string, body: FormData, replace: string | null, key: string) => {
          const s = new Subject<any>();
          uploads.push(s);
          return s;
        },
      ),
      removeTemporary: vi.fn(() => of(null)),
      cancelSession: vi.fn(() => of(null)),
    };
    TestBed.configureTestingModule({
      providers: [
        BookUploadQueue,
        { provide: BookApi, useValue: api },
        { provide: PREPARE_BOOK_IMAGE, useValue: async (f: File) => f },
      ],
    });
    return { q: TestBed.inject(BookUploadQueue), api, uploads };
  }
  it('keeps photo IDs when reordered during async upload; ready files are not uploaded twice', async () => {
    const { q, uploads, api } = setup();
    q.add([photo(), photo()]);
    await vi.waitFor(() => expect(q.rows()[0].state).toBe('uploading'));
    const first = q.rows()[0].id,
      second = q.rows()[1].id;
    q.assignRole(first, 'BACK');
    uploads[0].next(
      new HttpResponse({
        body: {
          id: 'server-first',
          state: 'READY',
          contentPath: '/private/1',
          width: 1,
          height: 1,
        },
      }),
    );
    uploads[0].complete();
    await vi.waitFor(() => expect(uploads.length).toBe(2));
    uploads[1].next(
      new HttpResponse({
        body: {
          id: 'server-second',
          state: 'READY',
          contentPath: '/private/2',
          width: 1,
          height: 1,
        },
      }),
    );
    uploads[1].complete();
    await vi.waitFor(() => expect(q.ready()).toBe(true));
    expect(q.assignments()).toEqual([
      { mediaId: 'server-second', role: 'FRONT' },
      { mediaId: 'server-first', role: 'BACK' },
    ]);
    q.assignRole(first, 'FRONT');
    expect(api.uploadTemporary).toHaveBeenCalledTimes(2);
  });
  it('rejects overflow as a batch and retries only the failed item with the same request key', async () => {
    const { q, uploads, api } = setup();
    q.add([photo(), photo()]);
    q.add([photo(), photo(), photo(), photo(), photo()]);
    expect(q.rows()).toHaveLength(2);
    expect(q.error()).toContain('6');
    await vi.waitFor(() => expect(uploads.length).toBe(1));
    const id = q.rows()[0].id;
    uploads[0].error(new HttpErrorResponse({ status: 502 }));
    await vi.waitFor(() => expect(uploads.length).toBe(2));
    uploads[1].next(
      new HttpResponse({ body: { id: 'other', state: 'READY', contentPath: '/private/2' } }),
    );
    uploads[1].complete();
    await vi.waitFor(() => expect(q.rows().find((r) => r.id !== id)?.state).toBe('READY'));
    q.retry(id);
    await vi.waitFor(() => expect(uploads.length).toBe(3));
    expect(api.uploadTemporary.mock.calls[0][3]).toBe(api.uploadTemporary.mock.calls[2][3]);
    expect(q.rows().find((r) => r.id !== id)?.mediaId).toBe('other');
  });
  it('pauses an expired session and preserves original files for an explicit renewal', async () => {
    const { q, uploads } = setup();
    q.add([photo(), photo()]);
    await vi.waitFor(() => expect(uploads.length).toBe(1));
    uploads[0].error(new HttpErrorResponse({ status: 410 }));
    await vi.waitFor(() => expect(q.expired()).toBe(true));
    expect(q.rows()).toHaveLength(2);
    expect(q.rows()[0].file).not.toBeNull();
    expect(q.ready()).toBe(false);
  });
  it('keeps an existing photo replacement attached to its ID when reordered while uploading', async () => {
    const response = new Subject<any>();
    const api = { upload: vi.fn(() => response), cancelSession: () => of(null) };
    TestBed.configureTestingModule({
      providers: [
        BookUploadQueue,
        { provide: BookApi, useValue: api },
        { provide: PREPARE_BOOK_IMAGE, useValue: async (f: File) => f },
      ],
    });
    const q = TestBed.inject(BookUploadQueue),
      book = {
        ...testBook(),
        media: [
          { id: 'old', role: 'FRONT' as const, alt: 'A', sourceRef: null, contentPath: '/a' },
          { id: 'back', role: 'BACK' as const, alt: 'B', sourceRef: null, contentPath: '/b' },
        ],
      };
    q.configure(book);
    q.replace(q.sorted()[0].id, photo());
    await vi.waitFor(() => expect(q.sorted()[0].state).toBe('uploading'));
    const id = q.sorted()[0].id;
    q.assignRole(id, 'BACK');
    response.next(
      new HttpResponse({
        body: { ...book, version: 1, media: [{ ...book.media[0], id: 'new' }, book.media[1]] },
      }),
    );
    response.complete();
    await vi.waitFor(() => expect(q.pending()).toBe(false));
    expect(q.assignments()).toEqual([
      { mediaId: 'back', role: 'FRONT' },
      { mediaId: 'new', role: 'BACK' },
    ]);
    expect(q.dirty()).toBe(true);
  });
  it('allows discarding a failed unattached edit image without blocking existing edits', async () => {
    const { q } = setup();
    q.configure(testBook());
    q.add([new File(['invalid'], 'bad.jpg', { type: 'image/jpeg' })]);
    await vi.waitFor(() => expect(q.rows().some((r) => r.state === 'error')).toBe(true));
    const row = q.rows().find((r) => r.state === 'error')!;
    expect(q.canRemove(row)).toBe(true);
    await q.remove(row.id);
    expect(q.pending()).toBe(false);
  });
  it('reconciles a committed edit replacement after a lost response without uploading twice', async () => {
    const response = new Subject<any>();
    const book = {
      ...testBook(),
      media: [
        { id: 'old', role: 'FRONT' as const, alt: 'A', sourceRef: null, contentPath: '/a' },
        { id: 'back', role: 'BACK' as const, alt: 'B', sourceRef: null, contentPath: '/b' },
      ],
    };
    const current = {
      ...book,
      version: book.version + 1,
      media: [{ ...book.media[0], id: 'new', contentPath: '/new' }, book.media[1]],
    };
    const api = {
      upload: vi.fn(() => response),
      get: vi.fn(() => of(current)),
      cancelSession: () => of(null),
    };
    TestBed.configureTestingModule({
      providers: [
        BookUploadQueue,
        { provide: BookApi, useValue: api },
        { provide: PREPARE_BOOK_IMAGE, useValue: async (f: File) => f },
      ],
    });
    const q = TestBed.inject(BookUploadQueue);
    q.configure(book);
    q.replace(q.sorted()[0].id, photo());
    await vi.waitFor(() => expect(api.upload).toHaveBeenCalledTimes(1));
    const id = q.sorted()[0].id;
    q.assignRole(id, 'BACK');
    response.error(new HttpErrorResponse({ status: 0 }));
    await vi.waitFor(() => expect(q.pending()).toBe(true));
    q.retry(id);
    await vi.waitFor(() => expect(q.pending()).toBe(false));
    expect(api.upload).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalled();
    expect(q.assignments()).toEqual([
      { mediaId: 'back', role: 'FRONT' },
      { mediaId: 'new', role: 'BACK' },
    ]);
  });
});
