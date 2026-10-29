import { formatPriceRange } from './book-copy';
import { buildBookForm } from './book-form';
describe('book price ranges', () => {
 it('formats both endpoints without picking a final sale price', () => {
  expect(formatPriceRange(20000,30000)).toBe('20.000 - 30.000 VNĐ');
  expect(formatPriceRange(20000,20000)).toBe('20.000 VNĐ');
  expect(formatPriceRange(null,30000)).toBe('—');
 });
 it('rejects reversed and incomplete ranges while allowing equal endpoints', () => {
  const f=buildBookForm(); f.patchValue({priceMinVnd:20000,priceMaxVnd:30000,weightG:250});
  expect(f.valid).toBe(true);f.controls.priceMaxVnd.setValue(10000);expect(f.invalid).toBe(true);
  f.controls.priceMaxVnd.setValue(null);expect(f.invalid).toBe(true);
  f.controls.priceMaxVnd.setValue(20000);expect(f.valid).toBe(true);
  f.controls.weightG.setValue(1.5);expect(f.invalid).toBe(true);
 });
});
