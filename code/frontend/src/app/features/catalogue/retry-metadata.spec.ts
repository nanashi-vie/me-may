import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';
import { Meta, Title } from '@angular/platform-browser';
import { HomePage } from '../home/home-page';
import { FlashSalePage } from './flash-sale-page';
import { PublicApi } from './public-api';
describe('Retry restores successful page metadata', () => {
  for (const kind of ['home', 'sale'])
    it(kind + ' clears error title/noindex after retry', () => {
      const pending = new Subject<any>();
      const data =
        kind === 'home'
          ? { shelves: [] }
          : { serverNow: new Date().toISOString(), endsAt: null, items: [] };
      const request = vi.fn().mockReturnValueOnce(pending).mockReturnValueOnce(of(data));
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          {
            provide: PublicApi,
            useValue: {
              home: kind === 'home' ? request : () => of({ shelves: [] }),
              sale:
                kind === 'sale'
                  ? request
                  : () => of({ serverNow: new Date().toISOString(), endsAt: null, items: [] }),
            },
          },
        ],
      });
      const f =
        kind === 'home'
          ? TestBed.createComponent(HomePage)
          : TestBed.createComponent(FlashSalePage);
      pending.error({ status: 503 });
      f.componentInstance.load();
      expect(TestBed.inject(Title).getTitle()).toContain(
        kind === 'home' ? 'Mẹ Mây — Sách ngoại văn cho bé' : 'Flash Sale',
      );
      expect(TestBed.inject(Meta).getTag('name="robots"')).toBeNull();
    });
});

describe('Leaving page cancels its metadata updates', () => {
  for (const kind of ['home', 'sale'])
    it(kind + ' ignores a late failure after navigation', () => {
      const pending = new Subject<any>();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          {
            provide: PublicApi,
            useValue: {
              home: kind === 'home' ? () => pending : () => of({ shelves: [] }),
              sale:
                kind === 'sale'
                  ? () => pending
                  : () => of({ serverNow: new Date().toISOString(), endsAt: null, items: [] }),
            },
          },
        ],
      });
      const f =
        kind === 'home'
          ? TestBed.createComponent(HomePage)
          : TestBed.createComponent(FlashSalePage);
      f.destroy();
      TestBed.inject(Title).setTitle('Next page');
      pending.error({ status: 503 });
      expect(TestBed.inject(Title).getTitle()).toBe('Next page');
    });
});
