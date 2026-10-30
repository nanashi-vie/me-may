import { Directive, ElementRef, HostListener, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, Validator } from '@angular/forms';

const format = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

@Directive({
  selector: 'input[appVndInput]',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => VndInput), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => VndInput), multi: true },
  ],
})
export class VndInput implements ControlValueAccessor, Validator {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private invalid = false;
  private change: (value: number | null) => void = () => {};
  private touched = () => {};
  private validationChanged = () => {};

  writeValue(value: number | null) {
    this.invalid = false;
    this.input.value = value == null ? '' : format.format(value);
  }
  registerOnChange(fn: (value: number | null) => void) { this.change = fn; }
  registerOnTouched(fn: () => void) { this.touched = fn; }
  registerOnValidatorChange(fn: () => void) { this.validationChanged = fn; }
  setDisabledState(disabled: boolean) { this.input.disabled = disabled; }
  validate() { return this.invalid ? { vnd: true } : null; }

  @HostListener('blur') blur() { this.touched(); }
  @HostListener('input', ['$event']) update(event: Event) {
    const inputEvent = event as InputEvent;
    const raw = this.input.value;
    const digitsBeforeCaret = raw.slice(0, this.input.selectionStart ?? raw.length).replace(/\D/g, '').length;
    const editingDigits = !this.invalid &&
      ((inputEvent.inputType === 'insertText' && /^[0-9]+$/.test(inputEvent.data ?? '')) || inputEvent.inputType?.startsWith('delete'));
    const validText = raw === '' || (editingDigits ? /^[0-9.]+$/.test(raw) : /^(?:[0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+)$/.test(raw));
    const value = raw === '' ? null : Number(raw.replace(/\./g, ''));
    this.invalid = !validText || (value !== null && !Number.isSafeInteger(value));
    this.change(this.invalid ? null : value);
    this.validationChanged();
    if (this.invalid) return;
    this.input.value = value === null ? '' : format.format(value);
    let caret = 0, digits = 0;
    while (caret < this.input.value.length && digits < digitsBeforeCaret) {
      if (/\d/.test(this.input.value[caret])) digits++;
      caret++;
    }
    this.input.setSelectionRange(caret, caret);
  }
}
