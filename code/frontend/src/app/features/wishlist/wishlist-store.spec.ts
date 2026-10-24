import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { WishlistStore, WISHLIST_STORAGE, WISHLIST_KEY } from './wishlist-store';

describe('Device wishlist', () => {
  let data: Map<string, string>;
  let storage: Storage;
  function setup(raw?: string) {
    data = new Map(raw === undefined ? [] : [[WISHLIST_KEY, raw]]);
    storage = {
      getItem: vi.fn((k: string) => data.get(k) ?? null),
      setItem: vi.fn((k: string, v: string) => {
        data.set(k, v);
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };
    TestBed.configureTestingModule({
      providers: [{ provide: WISHLIST_STORAGE, useValue: () => storage }],
    });
    return TestBed.inject(WishlistStore);
  }
  it('does not access storage before browser initialization; persists order and removal', () => {
    const s = setup('["MM-000002"]');
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(s.ready()).toBe(false);
    s.initialize();
    s.toggle('MM-1000000');
    s.toggle('MM-000002');
    expect(s.codes()).toEqual(['MM-1000000']);
    expect(JSON.parse(data.get(WISHLIST_KEY)!)).toEqual(['MM-1000000']);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: WISHLIST_STORAGE, useValue: () => storage }],
    });
    const reopened = TestBed.inject(WishlistStore);
    reopened.initialize();
    expect(reopened.has('MM-1000000')).toBe(true);
  });
  it('sanitizes invalid codes and duplicates without accepting out-of-range or noncanonical codes', () => {
    const s = setup(
      JSON.stringify([
        'MM-000001',
        'MM-000001',
        'MM-000000',
        'MM-0000001',
        'MM-9223372036854775808',
        12,
        'MM-9223372036854775807',
      ]),
    );
    s.initialize();
    expect(s.codes()).toEqual(['MM-000001', 'MM-9223372036854775807']);
    expect(s.warning()).toBeTruthy();
    s.toggle('invalid');
    expect(s.codes()).toHaveLength(2);
  });
  for (const raw of ['broken JSON', '{}', 'null'])
    it('warns about corrupt data: ' + raw, () => {
      const s = setup(raw);
      s.initialize();
      expect(s.codes()).toEqual([]);
      expect(s.warning()).toBeTruthy();
      s.toggle('MM-000001');
      expect(s.has('MM-000001')).toBe(true);
    });
  it('keeps memory state when reading or writing storage is blocked', () => {
    const s = setup();
    vi.mocked(storage.getItem).mockImplementation(() => {
      throw Error('blocked');
    });
    s.initialize();
    s.toggle('MM-000001');
    expect(s.has('MM-000001')).toBe(true);
    expect(s.warning()).toContain('tải lại');
  });
  it('keeps all existing entries and the new entry after a write failure', () => {
    const s = setup('["MM-000001"]');
    s.initialize();
    vi.mocked(storage.setItem).mockImplementation(() => {
      throw Error('quota');
    });
    s.toggle('MM-000002');
    expect(s.codes()).toEqual(['MM-000001', 'MM-000002']);
    expect(s.warning()).toContain('tải lại');
    s.remove('MM-000001');
    expect(s.codes()).toEqual(['MM-000002']);
  });
  it('caps at 100 without dropping existing saves and can remove while full', () => {
    const codes = Array.from({ length: 100 }, (_, i) => 'MM-' + String(i + 1).padStart(6, '0'));
    const s = setup(JSON.stringify(codes));
    s.initialize();
    s.toggle('MM-1000000');
    expect(s.codes()).toEqual(codes);
    expect(s.warning()).toContain('100');
    s.remove(codes[0]);
    s.toggle('MM-1000000');
    expect(s.codes()).toHaveLength(100);
    expect(s.has('MM-1000000')).toBe(true);
  });
  it('reads the latest other-tab value before mutation and handles storage deletion/clear', () => {
    const s = setup('["MM-000001"]');
    s.initialize();
    data.set(WISHLIST_KEY, '["MM-000001","MM-000002"]');
    s.toggle('MM-000003');
    expect(s.codes()).toEqual(['MM-000001', 'MM-000002', 'MM-000003']);
    window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: '[]' }));
    expect(s.codes()).toHaveLength(3);
    data.set(WISHLIST_KEY, '["MM-000002"]');
    window.dispatchEvent(
      new StorageEvent('storage', { key: WISHLIST_KEY, newValue: '["MM-000002"]' }),
    );
    expect(s.codes()).toEqual(['MM-000002']);
    data.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(s.codes()).toEqual([]);
  });
  it('removes the storage listener on destroy', () => {
    const s = setup();
    s.initialize();
    const remove = vi.spyOn(window, 'removeEventListener');
    TestBed.resetTestingModule();
    expect(remove).toHaveBeenCalledWith('storage', expect.any(Function));
    remove.mockRestore();
  });
});
