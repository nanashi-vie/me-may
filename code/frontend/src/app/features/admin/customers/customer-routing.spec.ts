import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { vi, afterEach } from 'vitest';
import { routes } from '../../../app.routes';
import { AuthService } from '../../../core/auth/auth.service';
import { CustomerApi } from './customer-api';
import { CustomerForm } from './customer-form/customer-form';
import { CustomerDetailPage } from './customer-detail/customer-detail';

describe('Customer route reuse', () => {
  afterEach(() => vi.restoreAllMocks());
  it('clears the previous editor only after approving same-component navigation', async () => {
    const api = {
      detail: vi.fn((id: string) =>
        of({
          id,
          customerCode: 'KH-00000' + id,
          fullName: 'Customer ' + id,
          phone: null,
          defaultAddress: null,
          zaloName: null,
          tiktokId: null,
          threadsId: null,
          note: 'Saved',
          status: 'ACTIVE',
          version: 0,
          createdBy: '1',
          createdAt: '2026-11-12T00:00:00Z',
          updatedAt: '2026-11-12T00:00:00Z',
        }),
      ),
      update: vi.fn(),
      duplicates: vi.fn(() => of({ items: [], totalElements: 0 })),
    };
    const customerRoutes = routes
      .find((r) => r.path === 'admin')!
      .children!.filter((r) => r.path?.startsWith('customers'));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'admin', children: customerRoutes }]),
        {
          provide: AuthService,
          useValue: {
            user: signal({ id: 1, email: 'owner@test', role: 'OWNER' }),
            epoch: signal(0),
          },
        },
        { provide: CustomerApi, useValue: api },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/customers/1', CustomerDetailPage);
    const current = await harness.navigateByUrl('/admin/customers/2', CustomerDetailPage);
    current.edit();
    harness.detectChanges();
    const editor = harness.routeDebugElement!.query(By.directive(CustomerForm))
      .componentInstance as CustomerForm;
    editor.form.controls.note.setValue('Draft for 2');
    editor.form.markAsDirty();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await harness.navigateByUrl('/admin/customers/1');
    expect(TestBed.inject(Router).url).toBe('/admin/customers/2');
    expect(editor.visible()).toBe(true);
    confirm.mockReturnValue(true);
    const reused = await harness.navigateByUrl('/admin/customers/1', CustomerDetailPage);
    expect(reused).toBe(current);
    expect(editor.visible()).toBe(false);
    expect(reused.customer()?.id).toBe('1');
    editor.save();
    expect(api.update).not.toHaveBeenCalled();
    reused.edit();
    harness.detectChanges();
    editor.form.controls.note.setValue('Query draft');
    editor.form.markAsDirty();
    confirm.mockReturnValue(false);
    await harness.navigateByUrl('/admin/customers/1?q=lan');
    expect(TestBed.inject(Router).url).toBe('/admin/customers/1');
  });
});
