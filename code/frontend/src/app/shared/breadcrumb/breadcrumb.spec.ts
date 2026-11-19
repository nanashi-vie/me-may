import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { Breadcrumb, BreadcrumbItem } from './breadcrumb';

describe('Breadcrumb', () => {
  it('renders parent links, slash separators, and muted current page', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Breadcrumb);
    const items: BreadcrumbItem[] = [
      { label: 'Trang chủ', link: '/' },
      { label: 'Picture book', link: '/sach', queryParams: { category: 'PICTURE_BOOK' } },
      { label: 'Peppa Pig Goes Swimming' },
    ];
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const links = el.querySelectorAll('a');
    expect(links.length).toBe(2);
    expect(links[0].textContent?.trim()).toBe('Trang chủ');
    expect(links[0].getAttribute('href')).toBe('/');
    expect(links[1].textContent?.trim()).toBe('Picture book');
    expect(links[1].getAttribute('href')).toBe('/sach?category=PICTURE_BOOK');

    expect(el.querySelectorAll('.sep').length).toBe(2);
    const current = el.querySelector('li.current span');
    expect(current?.textContent?.trim()).toBe('Peppa Pig Goes Swimming');
    expect(current?.getAttribute('aria-current')).toBe('page');
  });
});
