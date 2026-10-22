import { formatPrice } from './book-copy';
describe('VND display', () => {
  it('uses Vietnamese separators and never changes stored numeric price', () => {
    expect(formatPrice(25000)).toBe('25.000 ₫');
    expect(formatPrice(null)).toBe('—');
  });
});
