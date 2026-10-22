import { AbstractControl,FormControl,FormGroup,Validators } from '@angular/forms';
import { AgeGroup,Binding,BookWrite,CategoryCode,ReadingLevel } from './book.models';
export function buildBookForm(){
 const text=(max:number)=>new FormControl<string|null>(null,Validators.maxLength(max));
 return new FormGroup({title:text(300),isbn:text(32),publisher:text(200),author:text(200),language:text(50),binding:new FormControl<Binding|null>(null),conditionGrade:new FormControl<BookWrite['conditionGrade']>(null),conditionNote:text(4000),priceVnd:new FormControl<number|null>(null,[Validators.min(1),Validators.max(999999999999),c=>c.value===null||Number.isSafeInteger(c.value)?null:{integer:true}]),description:text(10000),categoryCode:new FormControl<CategoryCode|null>(null),ageGroups:new FormControl<AgeGroup[]>([],{nonNullable:true}),readingLevel:new FormControl<ReadingLevel|null>(null),readingLevelBasis:text(1000),readingVideoUrl:text(2048),collectionIds:new FormControl<string[]>([],{nonNullable:true})},{validators:(group:AbstractControl)=>{
  const w=group.value as BookWrite;const errors:Record<string,boolean>={};
  if(w.categoryCode==='PICTURE_BOOK'&&!w.binding)errors['binding']=true;
  if(w.readingLevel&&!w.readingLevelBasis?.trim())errors['readingLevelBasis']=true;
  if(w.readingVideoUrl?.trim()){try{const u=new URL(w.readingVideoUrl.trim());if(u.protocol!=='https:'||u.username||u.password||/[\x00-\x1f\x7f]/.test(w.readingVideoUrl))errors['readingVideoUrl']=true;}catch{errors['readingVideoUrl']=true;}}
  return Object.keys(errors).length?errors:null;
 }});
}
export type BookForm=ReturnType<typeof buildBookForm>;
export function toBookWrite(form:BookForm):BookWrite {
 const w=form.getRawValue();const trim=(v:string|null)=>v?.trim()||null;
 return {...w,title:trim(w.title),isbn:trim(w.isbn),publisher:trim(w.publisher),author:trim(w.author),language:trim(w.language),conditionNote:trim(w.conditionNote),description:trim(w.description),binding:w.categoryCode==='PICTURE_BOOK'?w.binding:null,readingLevelBasis:w.readingLevel?trim(w.readingLevelBasis):null,readingVideoUrl:trim(w.readingVideoUrl)};
}
