import { buildBookForm, toBookWrite } from './book-form';
describe('Book form', () => {
  it('pictureBookRequiresOneBinding', () => {
    const f = buildBookForm();
    f.controls.categoryCode.setValue('PICTURE_BOOK');
    expect(f.invalid).toBe(true);
    f.controls.binding.setValue('PAPERBACK');
    expect(f.valid).toBe(true);
  });
  it('ageGroupsAllowMultiple and unknownReadingLevelIsOptional', () => {
    const f = buildBookForm();
    f.controls.ageGroups.setValue(['AGE_0_3', 'AGE_4_6']);
    expect(f.valid).toBe(true);
    expect(toBookWrite(f).ageGroups).toHaveLength(2);
    expect(toBookWrite(f).readingLevel).toBeNull();
    f.controls.readingLevel.setValue('A1');
    expect(f.invalid).toBe(true);
    f.controls.readingLevelBasis.setValue('Đọc thử');
    expect(f.valid).toBe(true);
  });
  it('clears basis when level is unknown and sends all nullable fields', () => {
    const f = buildBookForm();
    f.controls.readingLevelBasis.setValue('old');
    expect(toBookWrite(f).readingLevelBasis).toBeNull();
    expect(Object.keys(toBookWrite(f))).toHaveLength(16);
    f.controls.priceVnd.setValue(1.5);
    expect(f.invalid).toBe(true);
  });
});
