import { TestBed } from '@angular/core/testing';
import { HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BookMediaPanel } from './book-media-panel';
import { BookApi } from './book-api';
import { testBook } from './book-test-fixture';
describe('BookMediaPanel', () => {
  it('threeFixedSlotsUploadSequentially using each returned version', () => {
    const upload = vi.fn((_id: string, _role: string, version: number) =>
      of(new HttpResponse({ body: { ...testBook(), version: version + 1 } })),
    );
    TestBed.configureTestingModule({ providers: [{ provide: BookApi, useValue: { upload } }] });
    const f = TestBed.createComponent(BookMediaPanel);
    f.componentRef.setInput('book', testBook());
    f.componentRef.setInput('dirty', false);
    f.componentInstance.uploadFiles({
      FRONT: new File(['a'], 'front.jpg'),
      BACK: new File(['b'], 'back.jpg'),
      INSIDE_1: new File(['c'], 'inside.jpg'),
    });
    expect(upload.mock.calls.map((c) => c[2])).toEqual([0, 1, 2]);
    expect(f.componentInstance.roles).toEqual(['FRONT','BACK','SPINE','INSIDE_1','INSIDE_2','INSIDE_3']);
  });
  it('dirtyFormBlocksUpload and replacementFailureKeepsOldPreview', () => {
    const upload = vi.fn(() => throwError(() => ({ status: 502 })));
    TestBed.configureTestingModule({ providers: [{ provide: BookApi, useValue: { upload } }] });
    const f = TestBed.createComponent(BookMediaPanel);
    const b = {
      ...testBook(),
      media: [
        {
          id: 'old',
          role: 'FRONT' as const,
          alt: 'Cover',
          sourceRef: null,
          contentPath: '/private',
        },
      ],
    };
    f.componentRef.setInput('book', b);
    f.componentRef.setInput('dirty', true);
    f.componentInstance.uploadFiles({ FRONT: new File(['a'], 'x.jpg') });
    expect(upload).not.toHaveBeenCalled();
    f.componentRef.setInput('dirty', false);
    f.componentInstance.uploadFiles({ FRONT: new File(['a'], 'x.jpg') });
    expect(f.componentInstance.book().media[0].id).toBe('old');
  });
  it('reportsPendingMetadataUntilSuccessfulPersistence', () => {
    const updateMedia = vi.fn(() => of({ ...testBook(), version: 1 }));
    TestBed.configureTestingModule({
      providers: [{ provide: BookApi, useValue: { updateMedia } }],
    });
    const f = TestBed.createComponent(BookMediaPanel);
    f.componentRef.setInput('book', testBook());
    const pending: boolean[] = [];
    f.componentInstance.pendingChange.subscribe((v) => pending.push(v));
    f.componentInstance.setAlt('FRONT', 'Changed');
    expect(pending.at(-1)).toBe(true);
    f.componentInstance.saveMetadata('FRONT');
    expect(pending.at(-1)).toBe(false);
  });
});
