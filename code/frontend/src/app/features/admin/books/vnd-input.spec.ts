import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { VndInput } from './vnd-input';

@Component({imports:[ReactiveFormsModule,VndInput],template:'<input appVndInput [formControl]="price" />'})
class Host { price = new FormControl<number|null>(null,[Validators.min(1),Validators.max(999999999999)]); }

describe('VND price input',()=>{
  function setup(){const f=TestBed.createComponent(Host);f.detectChanges();return {f,c:f.componentInstance.price,input:f.nativeElement.querySelector('input') as HTMLInputElement};}
  function enter(input:HTMLInputElement,value:string,inputType='insertFromPaste',data:string|null=null,caret=value.length){
    input.value=value;input.setSelectionRange(caret,caret);input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType,data}));
  }
  it('formatsAndPreservesNumericModel',()=>{
    const {c,input}=setup();enter(input,'21000');expect(input.value).toBe('21.000');expect(c.value).toBe(21000);
    enter(input,'21.0000','insertText','0');expect(input.value).toBe('210.000');expect(c.value).toBe(210000);
    enter(input,'21.000');expect(c.value).toBe(21000);
    enter(input,'291.000','insertText','9',2);expect(c.value).toBe(291000);expect(input.selectionStart).toBe(2);
    enter(input,'');expect(c.value).toBeNull();
    c.setValue(999999999999);expect(input.value).toBe('999.999.999.999');expect(c.valid).toBe(true);
    enter(input,'1000000000000');expect(c.invalid).toBe(true);
    input.dispatchEvent(new Event('blur'));expect(c.touched).toBe(true);c.disable();expect(input.disabled).toBe(true);
  });
  it('rejectsNegativeAndDecimalPrices',()=>{
    const {c,input}=setup();
    for(const value of ['-21000','21,5','21.50','1e3','2 100','9007199254740992']){
      enter(input,value);expect(c.invalid).toBe(true);expect(input.value).toBe(value);expect(c.value).toBeNull();
    }
    enter(input,'21000');expect(c.valid).toBe(true);expect(c.value).toBe(21000);
    enter(input,'21.000.','insertText','.');expect(c.invalid).toBe(true);
  });
});
