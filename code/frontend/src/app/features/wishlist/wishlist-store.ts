import { DOCUMENT } from '@angular/common';
import {
  Injectable,
  InjectionToken,
  afterNextRender,
  inject,
  signal,
  DestroyRef,
} from '@angular/core';

export const WISHLIST_KEY = 'memay.wishlist.v1';
export const WISHLIST_STORAGE = new InjectionToken<() => Storage | null>('Wishlist storage', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    return () => document.defaultView?.localStorage ?? null;
  },
});
export function validBookCode(code: unknown): code is string {
  if (typeof code !== 'string' || !/^MM-[0-9]{6,19}$/.test(code)) return false;
  const value = BigInt(code.slice(3));
  return (
    value > 0n &&
    value <= 9223372036854775807n &&
    code === 'MM-' + value.toString().padStart(6, '0')
  );
}

@Injectable({ providedIn: 'root' })
export class WishlistStore {
  private readonly saved = signal<string[]>([]);
  readonly codes = this.saved.asReadonly();
  readonly ready = signal(false);
  readonly warning = signal('');
  private readonly document = inject(DOCUMENT);
  private readonly getStorage = inject(WISHLIST_STORAGE);
  private readonly destroy = inject(DestroyRef);
  private storage: Storage | null = null;

  constructor() {
    afterNextRender(() => this.initialize());
  }
  initialize() {
    if (this.ready()) return;
    try {
      this.storage = this.getStorage();
      if (!this.storage) throw Error('unavailable');
      this.read(this.storage.getItem(WISHLIST_KEY));
    } catch {
      this.memoryOnly();
    }
    this.ready.set(true);
    const window = this.document.defaultView;
    const listener = (e: StorageEvent) => {
      if (
        !this.storage ||
        (e.key !== WISHLIST_KEY && e.key !== null) ||
        (e.storageArea && e.storageArea !== this.storage)
      )
        return;
      try {
        this.read(this.storage.getItem(WISHLIST_KEY));
      } catch {
        this.memoryOnly();
      }
    };
    window?.addEventListener('storage', listener);
    this.destroy.onDestroy(() => window?.removeEventListener('storage', listener));
  }
  has(code: string) {
    return this.codes().includes(code);
  }
  toggle(code: string) {
    if (!this.ready() || !validBookCode(code)) return;
    this.latest();
    if (this.has(code)) this.write(this.codes().filter((c) => c !== code));
    else if (this.codes().length < 100) this.write([...this.codes(), code]);
    else this.warning.set('Bạn có thể lưu tối đa 100 cuốn. Hãy bỏ bớt một cuốn trước khi thêm.');
  }
  remove(code: string) {
    if (!this.ready()) return;
    this.latest();
    this.write(this.codes().filter((c) => c !== code));
  }
  private latest() {
    if (this.storage) {
      try {
        this.read(this.storage.getItem(WISHLIST_KEY));
      } catch {
        this.memoryOnly();
      }
    }
  }
  private read(raw: string | null) {
    let codes: string[] = [];
    try {
      const value: unknown = raw === null ? [] : JSON.parse(raw);
      if (!Array.isArray(value)) throw Error('invalid');
      codes = [...new Set(value.filter(validBookCode))].slice(0, 100);
      if (codes.length !== value.length)
        this.warning.set(
          'Một phần dữ liệu danh sách không hợp lệ. Chỉ các mã sách hợp lệ được giữ lại.',
        );
    } catch {
      this.warning.set('Dữ liệu danh sách không hợp lệ. Bạn có thể lưu sách lại từ catalogue.');
    }
    if (codes.join(',') !== this.codes().join(',')) this.saved.set(codes);
  }
  private write(codes: string[]) {
    this.saved.set(codes);
    if (this.storage) {
      try {
        this.storage.setItem(WISHLIST_KEY, JSON.stringify(codes));
        this.warning.set('');
      } catch {
        this.memoryOnly();
      }
    }
  }
  private memoryOnly() {
    this.storage = null;
    this.warning.set(
      'Trình duyệt chưa lưu được danh sách trên thiết bị. Danh sách đang giữ trong bộ nhớ và có thể mất khi tải lại.',
    );
  }
}
