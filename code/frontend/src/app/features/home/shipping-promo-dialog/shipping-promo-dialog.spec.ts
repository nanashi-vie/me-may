import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShippingPromoDialog } from './shipping-promo-dialog';

describe('ShippingPromoDialog', () => {
  let fixture: ComponentFixture<ShippingPromoDialog>;
  let component: ShippingPromoDialog;
  let nativeDialog: HTMLDialogElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShippingPromoDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(ShippingPromoDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    nativeDialog = component.dialog.nativeElement;

    if (!nativeDialog.showModal) {
      nativeDialog.showModal = vi.fn(() => {
        nativeDialog.setAttribute('open', '');
      });
    }
    if (!nativeDialog.close) {
      nativeDialog.close = vi.fn(() => {
        nativeDialog.removeAttribute('open');
        nativeDialog.dispatchEvent(new Event('close'));
      });
    }
  });

  it('renders 5 shipping items, small circle dots, and brand-synchronized header truck SVG', () => {
    const el = fixture.nativeElement as HTMLElement;
    const title = el.querySelector('#shipping-promo-title');
    expect(title?.textContent?.trim()).toBe('Ưu đãi vận chuyển tại Mẹ Mây');

    const steps = el.querySelectorAll('.step-card');
    expect(steps.length).toBe(5);

    const titles = Array.from(el.querySelectorAll('.step-title')).map((t) => t.textContent?.trim());
    expect(titles).toEqual([
      'Đơn dưới 150k',
      'Đơn 150k - 300k',
      'Đơn 300k - 500k',
      'Đơn trên 500k',
      'Quy định khối lượng',
    ]);

    const descs = Array.from(el.querySelectorAll('.step-desc')).map((d) => d.textContent?.trim());
    expect(descs).toEqual([
      'Ship 25k',
      'Ship 20k',
      'Ship 16k',
      'Hỗ trợ 50% ship không quá 50k',
      'Áp dụng cho đơn dưới 3kg. Mỗi kg chênh ra thêm + 6k/kg',
    ]);

    const dots = el.querySelectorAll('.step-dot');
    expect(dots.length).toBe(5);

    const fullCard = el.querySelector('.step-card-full .step-title');
    expect(fullCard?.textContent?.trim()).toBe('Quy định khối lượng');

    const headerSvg = el.querySelector('.illustration-svg');
    expect(headerSvg).toBeTruthy();
  });

  it('opens and closes via dialog API', () => {
    const showModalSpy = vi.spyOn(nativeDialog, 'showModal');
    const closeSpy = vi.spyOn(nativeDialog, 'close');

    const triggerBtn = document.createElement('button');
    document.body.appendChild(triggerBtn);

    component.open(triggerBtn);
    expect(showModalSpy).toHaveBeenCalled();

    const closeBtn = fixture.nativeElement.querySelector('.close-btn') as HTMLButtonElement;
    closeBtn.click();
    expect(closeSpy).toHaveBeenCalled();

    triggerBtn.remove();
  });

  it('closes when clicking confirm button', () => {
    const closeSpy = vi.spyOn(nativeDialog, 'close');
    const confirmBtn = fixture.nativeElement.querySelector('.confirm-btn') as HTMLButtonElement;
    confirmBtn.click();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('closes on backdrop click', () => {
    const closeSpy = vi.spyOn(nativeDialog, 'close');
    component.onBackdropClick({ target: nativeDialog } as unknown as MouseEvent);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('does not close when clicking inside dialog card', () => {
    const closeSpy = vi.spyOn(nativeDialog, 'close');
    const card = fixture.nativeElement.querySelector('.dialog-card') as HTMLElement;
    component.onBackdropClick({ target: card } as unknown as MouseEvent);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('restores focus on close', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const focusSpy = vi.spyOn(trigger, 'focus');

    component.open(trigger);
    component.onClose();

    expect(focusSpy).toHaveBeenCalled();
    trigger.remove();
  });
});
