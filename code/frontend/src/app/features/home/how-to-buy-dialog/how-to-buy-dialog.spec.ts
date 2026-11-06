import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HowToBuyDialog } from './how-to-buy-dialog';

describe('HowToBuyDialog', () => {
  let fixture: ComponentFixture<HowToBuyDialog>;
  let component: HowToBuyDialog;
  let nativeDialog: HTMLDialogElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HowToBuyDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(HowToBuyDialog);
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

  it('renders 4 steps in 2x2 grid and illustration image', () => {
    const el = fixture.nativeElement as HTMLElement;
    const title = el.querySelector('#how-to-buy-title');
    expect(title?.textContent?.trim()).toBe('Cách hỏi mua sách tại Mẹ Mây');

    const steps = el.querySelectorAll('.step-card');
    expect(steps.length).toBe(4);

    const badges = Array.from(el.querySelectorAll('.step-badge')).map((b) => b.textContent?.trim());
    expect(badges).toEqual(['1', '2', '3', '4']);

    const titles = Array.from(el.querySelectorAll('.step-title')).map((t) => t.textContent?.trim());
    expect(titles).toEqual([
      'Thêm sách vào “Danh sách quan tâm”',
      'Vào “Danh sách quan tâm” chọn tất cả sách cần kiểm tra video tình trạng thật',
      'Bấm “Chuẩn bị nội dung hỏi mua”',
      'Gửi yêu cầu qua Zalo Hotline',
    ]);

    // Steps 1, 2, 3 have no small description
    expect(steps[0].querySelector('.step-desc')).toBeNull();
    expect(steps[1].querySelector('.step-desc')).toBeNull();
    expect(steps[2].querySelector('.step-desc')).toBeNull();

    // Step 4 keeps the instruction text
    const desc4 = steps[3].querySelector('.step-desc')?.textContent?.trim();
    expect(desc4).toContain('Bấm “Sao chép nội dung” => “Mở zalo” => Dán & gửi tin nhắn yêu cầu cho tiệm qua hotline zalo');

    const img = el.querySelector('.illustration-img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('/images/how-to-buy-contact.jpg');
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
