import { Component,ElementRef,HostListener,inject,signal } from '@angular/core';
import { FormControl,FormGroup,ReactiveFormsModule,Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { CollectionApi,CollectionDto } from './collection-api';
import { HttpErrorResponse } from '@angular/common/http';
@Component({selector:'app-collection-list',imports:[ReactiveFormsModule],templateUrl:'./collection-list.html',styleUrl:'./collection-list.scss'})
export class CollectionList {
 readonly auth=inject(AuthService);private readonly api=inject(CollectionApi);private readonly element=inject<ElementRef<HTMLElement>>(ElementRef);
 readonly items=signal<CollectionDto[]>([]);readonly editing=signal<CollectionDto|null>(null);readonly busy=signal(false);readonly error=signal('');readonly notice=signal('');readonly createUncertain=signal(false);
 readonly form=new FormGroup({name:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(100)]}),slug:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(120),Validators.pattern('[a-z0-9]+(-[a-z0-9]+)*')]}),sortOrder:new FormControl(0,{nonNullable:true,validators:[Validators.required,Validators.min(0),c=>Number.isSafeInteger(c.value)?null:{integer:true}]}),active:new FormControl(true,{nonNullable:true})});
 ngOnInit(){this.load();}
 load(){this.api.list().subscribe({next:r=>this.items.set(r),error:()=>this.error.set('Chưa tải được bộ sưu tập. Kiểm tra phiên đăng nhập và thử lại.')});}
 edit(c:CollectionDto){if(this.busy()||!this.canLeave())return;this.editing.set(c);this.form.reset({name:c.name,slug:c.slug,sortOrder:c.sortOrder,active:c.active});this.error.set('');this.notice.set('');this.createUncertain.set(false);}
 newCollection(){if(this.busy()||!this.canLeave())return;this.editing.set(null);this.form.reset({name:'',slug:'',sortOrder:0,active:true});this.error.set('');this.notice.set('');this.createUncertain.set(false);}
 save(){
  if(this.busy()||this.auth.user()?.role!=='OWNER'||this.createUncertain())return;this.form.markAllAsTouched();this.error.set('');this.notice.set('');
  if(this.form.invalid||!this.form.controls.name.value.trim()){this.error.set('Kiểm tra tên, đường dẫn và thứ tự.');this.focus();return;}
  const value=this.form.getRawValue(),existing=this.editing();const data={name:value.name.trim(),sortOrder:value.sortOrder,active:value.active};this.busy.set(true);
  (existing?this.api.update(existing.id,existing.version,data):this.api.create({...data,slug:value.slug})).subscribe({next:c=>{this.busy.set(false);this.editing.set(c);this.form.reset({name:c.name,slug:c.slug,sortOrder:c.sortOrder,active:c.active});this.notice.set('Đã lưu bộ sưu tập.');this.load();},error:(e:HttpErrorResponse)=>{this.busy.set(false);if(!existing&&(e.status===0||e.status>=500))this.createUncertain.set(true);this.error.set(e.status===409?'Bộ sưu tập đã thay đổi hoặc đường dẫn bị trùng. Nội dung đang sửa được giữ nguyên.':e.status===401?'Phiên đã hết hạn. Đăng nhập lại ở tab khác rồi lưu; nội dung hiện tại được giữ nguyên.':this.createUncertain()?'Chưa rõ kết quả tạo. Kiểm tra danh sách ở tab khác trước khi tạo tiếp.':'Chưa lưu được. Kiểm tra dữ liệu và thử lại.');this.focus();}});
 }
 private focus(){setTimeout(()=>{const key=Object.entries(this.form.controls).find(([,c])=>c.invalid)?.[0];if(key)this.element.nativeElement.querySelector<HTMLElement>(`[formControlName="${key}"]`)?.focus();else this.element.nativeElement.querySelector<HTMLElement>('[role="alert"]')?.focus();});}
 canLeave(){return !this.form.dirty||typeof window==='undefined'||window.confirm('Bộ sưu tập có thay đổi chưa lưu. Bạn muốn bỏ thay đổi?');}
 @HostListener('window:beforeunload',['$event']) beforeUnload(e:BeforeUnloadEvent){if(this.form.dirty){e.preventDefault();e.returnValue='';}}
}
