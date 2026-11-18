import { TestBed } from '@angular/core/testing';
import { Pagination, pageTokens } from './pagination';

describe('Pagination', () => {
  it.each([
    [1, 10, [0, 1, 2, 3, 4, 'gap', 9]],
    [4, 32, [0, 1, 2, 3, 4, 5, 6, 'gap', 31]],
    [15, 32, [0, 'gap', 13, 14, 15, 16, 17, 'gap', 31]],
    [8, 10, [0, 'gap', 5, 6, 7, 8, 9]],
    [3, 7, [0, 1, 2, 3, 4, 5, 6]],
    [2, 5, [0, 1, 2, 3, 4]],
    [0, 1, [0]],
    [0, 0, []],
    [500_000, 1_000_000, [0, 'gap', 499_998, 499_999, 500_000, 500_001, 500_002, 'gap', 999_999]],
  ])('keeps two neighbours each side (%i/%i)', (page, total, want) => {
    expect(pageTokens(page as number, total as number)).toEqual(want);
  });

  it('keeps both nearby pages available as real numbered buttons', () => {
    const { f } = setup(15, 32);
    const labels = Array.from(f.nativeElement.querySelectorAll('button')).map((b) =>
      (b as HTMLButtonElement).getAttribute('aria-label'),
    );
    for (const n of [14, 15, 16, 17, 18]) expect(labels).toContain('Trang ' + n);
  });

  function setup(page: number, totalPages: number) {
    const f = TestBed.createComponent(Pagination);
    f.componentRef.setInput('page', page);
    f.componentRef.setInput('totalPages', totalPages);
    f.detectChanges();
    const emitted: number[] = [];
    f.componentInstance.pageChange.subscribe((p) => emitted.push(p));
    const buttons = () =>
      Array.from(f.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const button = (label: string) =>
      buttons().find((b) => b.getAttribute('aria-label') === label)!;
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
