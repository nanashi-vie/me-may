import { TestBed } from '@angular/core/testing';
import { Pagination, pageTokens } from './pagination';

describe('Pagination', () => {
  it.each([
    [1, 10, 7, [0, 1, 2, 3, 4, 'gap', 9]],
    [4, 10, 7, [0, 'gap', 3, 4, 5, 'gap', 9]],
    [8, 10, 7, [0, 'gap', 5, 6, 7, 8, 9]],
    [1, 10, 5, [0, 1, 2, 'gap', 9]],
    [4, 10, 5, [0, 'gap', 4, 'gap', 9]],
    [8, 10, 5, [0, 'gap', 7, 8, 9]],
    [3, 7, 7, [0, 1, 2, 3, 4, 5, 6]],
    [2, 5, 5, [0, 1, 2, 3, 4]],
    [0, 1, 7, [0]],
    [0, 0, 7, []],
    [500_000, 1_000_000, 7, [0, 'gap', 499_999, 500_000, 500_001, 'gap', 999_999]],
  ])('renders bounded page tokens (%i/%i, %i slots)', (page, total, slots, want) => {
    expect(pageTokens(page as number, total as number, slots as 5 | 7)).toEqual(want);
  });

  function setup(page: number, totalPages: number) {
    const f = TestBed.createComponent(Pagination);
    f.componentRef.setInput('page', page);
    f.componentRef.setInput('totalPages', totalPages);
    f.detectChanges();
    const emitted: number[] = [];
    f.componentInstance.pageChange.subscribe((p) => emitted.push(p));
    const buttons = () => Array.from(f.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const button = (label: string) => buttons().find((b) => b.getAttribute('aria-label') === label)!;
    return { f, emitted, buttons, button };
  }

  it('announces the current page and emits zero-based direct and arrow selections', () => {
    const { f, emitted, buttons, button } = setup(1, 10);
    f.componentRef.setInput('label', 'Trang lịch sử');
    f.detectChanges();
    expect(f.nativeElement.querySelector('nav').getAttribute('aria-label')).toBe('Trang lịch sử');
    expect(f.nativeElement.querySelector('[aria-current="page"]').textContent.trim()).toBe('2');
    button('Trang 5').click();
    button('Trang sau').click();
    button('Trang trước').click();
    button('Trang 2').click();
    expect(emitted).toEqual([4, 2, 0]);
    expect(buttons().every((b) => b.type === 'button')).toBe(true);
    expect(f.nativeElement.querySelectorAll('.gap button, .gap[tabindex]').length).toBe(0);
  });

  it('blocks every selection while disabled, including direct programmatic selection', () => {
    const { f, emitted, buttons } = setup(4, 10);
    f.componentRef.setInput('disabled', true);
    f.detectChanges();
    expect(buttons().every((b) => b.disabled)).toBe(true);
    buttons().forEach((b) => b.click());
    f.componentInstance.select(5);
    expect(emitted).toEqual([]);
  });

  it('handles zero/one page and rejects out-of-range selections', () => {
    const { f, button, emitted } = setup(0, 1);
    expect(button('Trang trước').disabled).toBe(true);
    expect(button('Trang sau').disabled).toBe(true);
    f.componentInstance.select(-1);
    f.componentInstance.select(1);
    f.componentInstance.select(0.5);
    expect(emitted).toEqual([]);
    f.componentRef.setInput('totalPages', 0);
    f.detectChanges();
    expect(f.nativeElement.querySelector('nav')).toBeNull();
    f.componentRef.setInput('totalPages', 10);
    f.componentRef.setInput('page', 9);
    f.detectChanges();
    expect(button('Trang sau').disabled).toBe(true);
    expect(button('Trang trước').disabled).toBe(false);
  });
});
