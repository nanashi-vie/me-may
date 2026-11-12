import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CustomerDetailPage } from './customer-detail';
import { CustomerApi } from '../customer-api';
import { AuthService } from '../../../../core/auth/auth.service';
const customer = {
  id: '1',
  customerCode: 'KH-000001',
  fullName: 'Lan',
  phone: '0987123456',
  defaultAddress: 'Hà Nội',
  status: 'ACTIVE' as const,
  version: 0,
  createdAt: '2026-11-12T00:00:00Z',
  updatedAt: '2026-11-12T00:00:00Z',
  createdBy: '1',
  zaloName: 'Lan Nguyễn',
  tiktokId: '@lan',
  threadsId: '@lan.books',
  note: '<script>alert(1)</script>',
};
describe('CustomerDetailPage', () => {
  function setup(role = 'OWNER') {
    const api = {
      detail: vi.fn(() => of(customer)),
      setStatus: vi.fn(() => of({ ...customer, status: 'ARCHIVED' })),
      duplicates: vi.fn(() => of({ items: [] })),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: new BehaviorSubject(convertToParamMap({ id: '1' })),
            snapshot: { queryParams: { q: 'lan' } },
          },
        },
        { provide: CustomerApi, useValue: api },
        {
          provide: AuthService,
          useValue: { user: signal({ id: 1, email: 'test@example.com', role }), epoch: signal(0) },
        },
      ],
    });
    const f = TestBed.createComponent(CustomerDetailPage);
    f.detectChanges();
    return { f, c: f.componentInstance, api };
  }
  it('renders all fields as plain text without order or username links', async () => {
    const { f } = setup();
    await f.whenStable();
    f.detectChanges();
    const text = f.nativeElement.textContent;
    for (const value of [
      'Tên Zalo',
      'Tên TikTok',
      'Tên Threads',
      '@lan.books',
      'Khách hàng chưa có đơn hàng.',
      '<script>alert(1)</script>',
    ])
      expect(text).toContain(value);
    expect(f.nativeElement.querySelector('script')).toBeNull();
    expect(f.nativeElement.textContent).not.toContain('Tạo đơn hàng');
  });
  it('handles not found and offers a route back', async () => {
    const { f, c, api } = setup();
    api.detail.mockReturnValue(throwError(() => ({ status: 404 })) as any);
    c.refresh();
    await f.whenStable();
    f.detectChanges();
    expect(c.error()).toContain('Không tìm thấy');
    expect(f.nativeElement.querySelector('a[href*="/admin/customers"]')).not.toBeNull();
  });
  it('confirms archive and prevents staff writes', async () => {
    const { f, c, api } = setup('STAFF');
    await f.whenStable();
    c.changeCustomerStatus();
    expect(api.setStatus).not.toHaveBeenCalled();
  });
});
