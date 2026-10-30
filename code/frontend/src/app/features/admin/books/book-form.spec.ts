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
    expect(f.valid).toBe(true);
  });
  it('sends only current fields and allows blank optional video', () => {
    const f = buildBookForm();
    expect(Object.keys(toBookWrite(f))).not.toContain('readingLevelBasis');
    expect(Object.keys(toBookWrite(f))).toHaveLength(18);
    expect(toBookWrite(f).readingVideoUrl).toBeNull();
    f.controls.readingVideoUrl.setValue('http://example.com');
    expect(f.invalid).toBe(true);
    f.controls.readingVideoUrl.setValue('https://example.com/read');
    expect(f.valid).toBe(true);
    f.controls.priceMinVnd.setValue(1.5);
    expect(f.invalid).toBe(true);
  });
});
