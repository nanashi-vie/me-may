import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BookEditor } from './book-editor';
import { BookApi } from './book-api';
import { CollectionApi } from '../collections/collection-api';
import { AuthService } from '../../../core/auth/auth.service';
import { BookDetail } from './book.models';
import { HttpErrorResponse } from '@angular/common/http';
import { testBook } from './book-test-fixture';
import { UploadItem } from './book-upload-queue';
const saved = {
  ...testBook(),
  publication: 'PUBLISHED',
  title: 'New',
  categoryCode: 'BOARD_BOOK',
  conditionNote: 'Actual',
  weightG: 250,
  priceMinVnd: 20000,
  priceMaxVnd: 30000,
} as BookDetail;
describe('BookEditor safe final saves', () => {
  let create: ReturnType<typeof vi.fn>, update: ReturnType<typeof vi.fn>, role: string;
  beforeEach(() => {
    role = 'OWNER';
    create = vi.fn(() => of(saved));
    update = vi.fn(() => of(saved));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() } } },
        {
          provide: BookApi,
          useValue: {
            create,
            update,
            cancelSession: () => of(null),
            get: () => throwError(() => new HttpErrorResponse({ status: 404 })),
            taxonomy: () => of({ categories: [], ageGroups: [], bindings: [], readingLevels: [] }),
          },
        },
        { provide: CollectionApi, useValue: { list: () => of([]) } },
        { provide: AuthService, useValue: { user: () => ({ role }) } },
      ],
    });
  });
  function editor() {
    return TestBed.createComponent(BookEditor).componentInstance;
  }
  function ready(e: BookEditor) {
    e.form.patchValue({
      title: 'New',
      conditionNote: 'Actual',
      categoryCode: 'BOARD_BOOK',
      weightG: 250,
      priceMinVnd: 20000,
      priceMaxVnd: 30000,
    });
    e.photos.sessionId.set('session');
    e.photos.rows.set(
      ['FRONT', 'BACK'].map(
        (role, i) =>
          ({
            id: 'client' + i,
            role,
            mediaId: 'server' + i,
            state: 'READY',
            file: null,
            preview: '',
            progress: 100,
            error: '',
            alt: '',
            sourceRef: '',
            storedAlt: '',
            storedSource: '',
          }) as UploadItem,
      ),
    );
    e.confirmed.set(true);
  }
  it('defaults language only for new books and offers the two current condition choices', () => {
    const fixture=TestBed.createComponent(BookEditor);const e=fixture.componentInstance;
    expect(e.form.controls.language.value).toBe('Tiếng Anh');
    fixture.detectChanges();
    const select=fixture.nativeElement.querySelector('select[formControlName="conditionGrade"]') as HTMLSelectElement;
    expect(Array.from(select.options).map(o=>o.text)).toEqual(['Chưa đánh giá','Độ mới cao','Có lỗi nhẹ']);
    e.accept({...saved,language:null});expect(e.form.controls.language.value).toBeNull();
    e.accept({...saved,language:'Tiếng Nhật'});expect(e.form.controls.language.value).toBe('Tiếng Nhật');
  });
  it('changes photo roles with the dropdown while retaining upload and replace controls', () => {
    const fixture=TestBed.createComponent(BookEditor);const e=fixture.componentInstance;ready(e);fixture.detectChanges();
    const root=fixture.nativeElement as HTMLElement;
    expect(root.textContent).not.toContain('Đưa lên');expect(root.textContent).not.toContain('Đưa xuống');
    expect(root.querySelector('[draggable="true"]')).toBeNull();
    expect(root.querySelector('input[type="file"][multiple]')).not.toBeNull();
    const role=root.querySelector('.photo-slot select') as HTMLSelectElement;role.value='BACK';role.dispatchEvent(new Event('change'));
    expect(e.photos.assignments()).toEqual([{mediaId:'server1',role:'FRONT'},{mediaId:'server0',role:'BACK'}]);
  });
  it('posts a complete final request once and opens the saved book', async () => {
    const pending = new Subject<BookDetail>();
    create.mockReturnValue(pending);
    const e = editor();
    ready(e);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await e.save();
    await e.save();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({
      uploadSessionId: 'session',
      confirmedActualCopy: true,
      media: [
        { mediaId: 'server0', role: 'FRONT' },
        { mediaId: 'server1', role: 'BACK' },
      ],
      write: { priceMinVnd: 20000, priceMaxVnd: 30000, weightG: 250 },
    });
    pending.next(saved);
    expect(navigate).toHaveBeenCalledWith(['/admin/sach', saved.id]);
  });
  it('retries the identical final payload after a lost response and preserves fields', async () => {
    create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const e = editor();
    ready(e);
    e.form.markAsDirty();
    await e.save();
    const original = create.mock.calls[0][0];
    await e.save();
    expect(create).toHaveBeenCalledTimes(1);
    expect(e.createUncertain()).toBe(true);
    expect(e.photos.locked()).toBe(true);
    e.retryCreate();
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0]).toBe(original);
    expect(e.form.controls.title.value).toBe('New');
  });
  it('requires actual-copy confirmation and ready front/back; staff cannot write', async () => {
    const e = editor();
    ready(e);
    e.confirmed.set(false);
    await e.save();
    expect(create).not.toHaveBeenCalled();
    e.confirmed.set(true);
    e.photos.rows.update((r) => r.slice(0, 1));
    await e.save();
    expect(create).not.toHaveBeenCalled();
    role = 'STAFF';
    const staff = editor();
    ready(staff);
    await staff.save();
    expect(create).not.toHaveBeenCalled();
  });
  it('preserves dirty content on a conflict and expired login', async () => {
    const e = editor();
    e.accept(saved);
    e.form.controls.title.setValue('Changed');
    e.form.markAsDirty();
    update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    await e.save();
    expect(e.form.dirty).toBe(true);
    expect(e.form.controls.title.value).toBe('Changed');
    update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    await e.save();
    expect(e.needsLogin()).toBe(true);
  });
  it('never creates a new book when an existing route failed to load', async () => {
    (TestBed.inject(ActivatedRoute).snapshot.paramMap as unknown as Map<string, string>).set(
      'id',
      'missing',
    );
    const e = editor();
    e.ngOnInit();
    ready(e);
    await e.save();
    expect(create).not.toHaveBeenCalled();
  });
  it('warns before leaving unsaved text or photos', () => {
    const e = editor();
    ready(e);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(e.canLeave()).toBe(false);
    const event = new Event('beforeunload', { cancelable: true });
    e.beforeUnload(event as BeforeUnloadEvent);
    expect(event.defaultPrevented).toBe(true);
  });
  it('exposes photo renewal when the final request expires after images were ready', async () => {
    create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 410 })));
    const e = editor();
    ready(e);
    await e.save();
    expect(e.photos.expired()).toBe(true);
    expect(e.photos.paused()).toBe(true);
    expect(e.form.controls.title.value).toBe('New');
    expect(e.createUncertain()).toBe(false);
  });
});
