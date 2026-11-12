import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { HomeFeaturedEditor, HomeFeaturedConfig } from './home-featured';
import { AuthService } from '../../../core/auth/auth.service';

describe('HomeFeaturedEditor', () => {
  const sampleConfig: HomeFeaturedConfig = {
    version: 2,
    shelves: [
      {
        shelfKey: 'NEWEST',
        title: 'Sách mới đăng',
        href: '/sach',
        categoryCode: null,
        collectionSlug: null,
        items: [
          {
            id: '1',
            bookCode: 'MM-000001',
            title: 'Cuốn số 1',
            priceMinVnd: 15000,
            priceMaxVnd: 15000,
            publicationStatus: 'PUBLISHED',
            availability: 'AVAILABLE',
            coverUrl: null,
            activeOnHome: true,
          },
          {
            id: '2',
            bookCode: 'MM-000002',
            title: 'Cuốn đã bán',
            priceMinVnd: 25000,
            priceMaxVnd: 25000,
            publicationStatus: 'PUBLISHED',
            availability: 'SOLD',
            coverUrl: null,
            activeOnHome: false,
          },
        ],
      },
    ],
  };

  function setup() {
    TestBed.configureTestingModule({
      imports: [HomeFeaturedEditor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: {
            user: signal({ role: 'OWNER' }),
            epoch: signal(0),
            csrf: () => TestBed.inject(HttpClient).get('/api/v1/auth/csrf'),
            invalidateSession: () => {},
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(HomeFeaturedEditor);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/admin/hero-banners').flush({ version: 0, banners: [] });
    return { fixture, component: fixture.componentInstance, http };
  }

  it('loads shelves, displays status badges, reorders, adds candidate, and saves with version', () => {
    const { fixture, component, http } = setup();
    http.expectOne('/api/v1/admin/home-featured').flush(sampleConfig);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Hiển thị sách nổi bật');
    expect(el.textContent).toContain('Đang hiển thị trên Home');
    expect(el.textContent).toContain('Đã bán — tự động nhường chỗ trên Home');

    component.moveUp(component.shelves[0], 1);
    expect(component.shelves[0].items.map((i) => i.bookCode)).toEqual(['MM-000002', 'MM-000001']);
    expect(component.dirty).toBe(true);

    component.searchQuery['NEWEST'] = 'MM-000003';
    component.searchCandidates('NEWEST');
    http.expectOne('/api/v1/admin/home-featured/candidates?shelfKey=NEWEST&q=MM-000003').flush([
      {
        id: '3',
        bookCode: 'MM-000003',
        title: 'Cuốn số 3',
        priceMinVnd: 30000,
        priceMaxVnd: 30000,
        publicationStatus: 'PUBLISHED',
        availability: 'AVAILABLE',
        coverUrl: null,
        activeOnHome: true,
      },
    ]);
    fixture.detectChanges();

    component.addBook(component.shelves[0], component.availableCandidates(component.shelves[0])[0]);
    expect(component.shelves[0].items.map((i) => i.bookCode)).toEqual([
      'MM-000002',
      'MM-000001',
      'MM-000003',
    ]);

    component.removeBook(component.shelves[0], 0);
    expect(component.shelves[0].items.map((i) => i.bookCode)).toEqual(['MM-000001', 'MM-000003']);

    component.save();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'csrf-tok' });
    const putReq = http.expectOne('/api/v1/admin/home-featured');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      version: 2,
      shelves: [{ shelfKey: 'NEWEST', bookCodes: ['MM-000001', 'MM-000003'] }],
    });
    putReq.flush({ ...sampleConfig, version: 3 });
    fixture.detectChanges();

    expect(component.dirty).toBe(false);
    expect(component.notice()).toContain('Đã lưu');
    http.verify();
  });

  it('keeps banner and shelf saves independent and uses one shared leave guard', () => {
    const { fixture, component, http } = setup();
    http.expectOne('/api/v1/admin/home-featured').flush(sampleConfig);
    fixture.detectChanges();
    const banners = component.bannerEditor()!;
    component.removeBook(component.shelves[0], 1);
    banners.dirty.set(true);
    banners.save();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'x' });
    http.expectOne('/api/v1/admin/hero-banners').flush({ version: 1, banners: [] });
    expect(component.dirty).toBe(true);
    banners.dirty.set(true);
    component.save();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'x' });
    http.expectOne('/api/v1/admin/home-featured').flush({ ...sampleConfig, version: 3 });
    expect(banners.dirty()).toBe(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(component.canLeave()).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
    confirm.mockRestore();
    http.verify();
  });

  it('preserves unsaved edits and shows conflict message on 409', () => {
    const { component, http } = setup();
    http.expectOne('/api/v1/admin/home-featured').flush(sampleConfig);

    component.removeBook(component.shelves[0], 1);
    component.save();
    http.expectOne('/api/v1/auth/csrf').flush({ headerName: 'X-CSRF-TOKEN', token: 'csrf-tok' });
    http
      .expectOne('/api/v1/admin/home-featured')
      .flush({ error: 'version_conflict' }, { status: 409, statusText: 'Conflict' });

    expect(component.dirty).toBe(true);
    expect(component.shelves[0].items.length).toBe(1);
    expect(component.error()).toContain('thay đổi');
    http.verify();
  });
});
