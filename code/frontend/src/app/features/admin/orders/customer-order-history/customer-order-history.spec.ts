import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CustomerOrderHistory } from './customer-order-history';
import { OrderApi } from '../order-api';
import { AuthService } from '../../../../core/auth/auth.service';
describe('CustomerOrderHistory', () => {
  async function setup(role = 'OWNER', failed = false) {
    const api = {
      list: vi.fn(() =>
        failed
          ? throwError(() => ({ status: 500 }))
          : of({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }),
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: OrderApi, useValue: api },
        { provide: AuthService, useValue: { user: signal({ role }), epoch: signal(0) } },
      ],
    });
    const f = TestBed.createComponent(CustomerOrderHistory);
    f.componentRef.setInput('customerId', '9007199254740993');
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return { f, api };
  }
  it('uses paged customer ID filter and displays real empty result', async () => {
    const { f, api } = await setup();
    expect(api.list).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: '9007199254740993', size: 20 }),
    );
    expect(f.nativeElement.textContent).toContain('Khách hàng chưa có đơn hàng.');
  });
  it('does not hide a load error as empty history', async () => {
    const { f } = await setup('OWNER', true);
    expect(f.nativeElement.textContent).toContain('Chưa tải được');
    expect(f.nativeElement.textContent).not.toContain('chưa có đơn hàng');
  });
  it('staff makes no order request and sees no history', async () => {
    const { f, api } = await setup('STAFF');
    expect(api.list).not.toHaveBeenCalled();
    expect(f.nativeElement.textContent).not.toContain('Lịch sử đơn');
  });
});
