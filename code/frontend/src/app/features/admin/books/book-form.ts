import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { AgeGroup, Binding, BookWrite, BookVariantWrite, CategoryCode, ReadingLevel } from './book.models';
export function buildVariantForm(row: BookVariantWrite = {id:null,name:null,stock:1}) {
  return new FormGroup({
    id: new FormControl<string|null>(row.id),
    name: new FormControl<string|null>(row.name, Validators.maxLength(100)),
    stock: new FormControl<number|null>(row.stock, [Validators.required,Validators.min(0),Validators.max(999999),
      c => Number.isSafeInteger(c.value) ? null : {integer:true}]),
  });
}
export function buildBookForm() {
  const text = (max: number) => new FormControl<string | null>(null, Validators.maxLength(max));
  return new FormGroup(
    {
      stock: new FormControl<number|null>(1,[Validators.required,Validators.min(0),Validators.max(999999),
        c => Number.isSafeInteger(c.value) ? null : {integer:true}]),
      internalNote: text(4000),
      unitPricePerKgVnd: new FormControl<number|null>(null,[Validators.min(1),Validators.max(999999999999),
        c => c.value === null || Number.isSafeInteger(c.value) ? null : {integer:true}]),
      title: text(300),
      isbn: text(32),
      publisher: text(200),
      author: text(200),
      language: new FormControl<string | null>('Tiếng Anh', Validators.maxLength(50)),
      binding: new FormControl<Binding | null>(null),
      priceMinVnd: new FormControl<number | null>(null, [
        Validators.min(1),
        Validators.max(999999999999),
        (c) => (c.value === null || Number.isSafeInteger(c.value) ? null : { integer: true }),
      ]),
      priceMaxVnd: new FormControl<number | null>(null, [
        Validators.min(1),
        Validators.max(999999999999),
        (c) => (c.value === null || Number.isSafeInteger(c.value) ? null : { integer: true }),
      ]),
      weightG: new FormControl<number | null>(null, [
        Validators.min(1),
        Validators.max(Number.MAX_SAFE_INTEGER),
        (c) => (c.value === null || Number.isSafeInteger(c.value) ? null : { integer: true }),
      ]),
      description: text(10000),
      categoryCode: new FormControl<CategoryCode | null>(null),
      ageGroups: new FormControl<AgeGroup[]>([], { nonNullable: true }),
      readingLevel: new FormControl<ReadingLevel | null>(null),
      readingVideoUrl: text(2048),
      collectionIds: new FormControl<string[]>([], { nonNullable: true }),
    },
    {
      validators: (group: AbstractControl) => {
        const w = group.value as BookWrite;
        const errors: Record<string, boolean> = {};
        if ((w.priceMinVnd === null) !== (w.priceMaxVnd === null) || (w.priceMinVnd !== null && w.priceMaxVnd !== null && w.priceMinVnd > w.priceMaxVnd)) errors['priceMaxVnd'] = true;
        if (w.categoryCode === 'PICTURE_BOOK' && !w.binding) errors['binding'] = true;
        if (w.readingVideoUrl?.trim()) {
          try {
            const u = new URL(w.readingVideoUrl.trim());
            if (
              u.protocol !== 'https:' ||
              u.username ||
              u.password ||
              /[\x00-\x1f\x7f]/.test(w.readingVideoUrl)
            )
              errors['readingVideoUrl'] = true;
          } catch {
            errors['readingVideoUrl'] = true;
          }
        }
        return Object.keys(errors).length ? errors : null;
      },
    },
  );
}
export type BookForm = ReturnType<typeof buildBookForm>;
export function toBookWrite(form: BookForm): BookWrite {
  const w = form.getRawValue();
  const trim = (v: string | null) => v?.trim() || null;
  return {
    ...w,
    stock: w.stock!,
    title: trim(w.title),
    isbn: trim(w.isbn),
    publisher: trim(w.publisher),
    author: trim(w.author),
    language: trim(w.language),
    internalNote: trim(w.internalNote),
    description: trim(w.description),
    binding: w.categoryCode === 'PICTURE_BOOK' ? w.binding : null,
    readingVideoUrl: trim(w.readingVideoUrl),
  };
}
