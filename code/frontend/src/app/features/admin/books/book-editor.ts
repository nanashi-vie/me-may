import { Component,computed,DestroyRef,ElementRef,HostListener,inject,signal } from '@angular/core';
import { ActivatedRoute,Router,RouterLink } from '@angular/router';
import { ReactiveFormsModule,FormControl,FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { BookApi } from './book-api';
import { BookDetail,Taxonomy,AgeGroup,AdminApiError } from './book.models';
import { buildBookForm,toBookWrite } from './book-form';
import { CollectionApi,CollectionDto } from '../collections/collection-api';
import { AuthService } from '../../../core/auth/auth.service';
import { BookMediaPanel } from './book-media-panel';
import { BookStatusActions } from './book-status-actions';
import { BookAuditPanel } from './book-audit-panel';
import { PRICE_NOTE,READING_NOTE } from './book-copy';
@Component({selector:'app-book-editor',imports:[ReactiveFormsModule,RouterLink,BookMediaPanel,BookStatusActions,BookAuditPanel],templateUrl:'./book-editor.html',styleUrl:'./book-editor.scss'})
export class BookEditor {
 readonly api=inject(BookApi);readonly auth=inject(AuthService);private readonly collectionApi=inject(CollectionApi);private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);private readonly element=inject<ElementRef<HTMLElement>>(ElementRef);private readonly destroy=inject(DestroyRef);
 readonly form=buildBookForm();readonly book=signal<BookDetail|null>(null);readonly taxonomy=signal<Taxonomy>({categories:[],ageGroups:[],bindings:[],readingLevels:[]});readonly collections=signal<CollectionDto[]>([]);readonly busy=signal(false);readonly otherBusy=signal(false);readonly loading=signal(false);readonly loadFailed=signal(false);readonly error=signal('');readonly notice=signal('');readonly fields=signal<Record<string,string[]>>({});readonly needsLogin=signal(false);readonly createUncertain=signal(false);readonly priceNote=PRICE_NOTE;readonly readingNote=READING_NOTE;
 readonly loginForm=new FormGroup({email:new FormControl('',{nonNullable:true}),password:new FormControl('',{nonNullable:true})});
 readonly editable=computed(()=>!this.loadFailed()&&(this.auth.user()?.role==='OWNER'||!this.book()||this.book()?.publication==='DRAFT'));
 fieldErrors(){return Object.entries(this.fields()).map(([key,messages])=>({key,message:messages.join(" ")}));}
 availableCollections(){const existing=this.book()?.collectionIds??[];return this.collections().filter(c=>c.active||existing.includes(c.id));}
 constructor(){this.form.controls.categoryCode.valueChanges.pipe(takeUntilDestroyed()).subscribe(c=>{if(c!=='PICTURE_BOOK')this.form.controls.binding.setValue(null,{emitEvent:false});});}
 ngOnInit(){this.api.taxonomy().pipe(takeUntilDestroyed(this.destroy)).subscribe({next:t=>this.taxonomy.set(t),error:e=>this.fail(e)});this.collectionApi.list().pipe(takeUntilDestroyed(this.destroy)).subscribe({next:c=>this.collections.set(c),error:e=>this.fail(e)});const id=this.route.snapshot.paramMap.get('id');if(id)this.load(id);}
 load(id:string){this.loading.set(true);this.loadFailed.set(false);this.api.get(id).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:b=>{this.accept(b);this.loading.set(false);},error:e=>{this.loadFailed.set(true);this.fail(e);this.loading.set(false);}});}
 accept(b:BookDetail){this.book.set(b);this.form.reset(b);this.form.markAsPristine();this.fields.set({});}
 toggleAge(age:AgeGroup,checked:boolean){const values=this.form.controls.ageGroups;values.setValue(checked?[...values.value,age]:values.value.filter(a=>a!==age));values.markAsDirty();}
 toggleCollection(id:string,checked:boolean){const values=this.form.controls.collectionIds;values.setValue(checked?[...values.value,id]:values.value.filter(c=>c!==id));values.markAsDirty();}
 saveDraft(){
  if(this.busy()||this.otherBusy()||this.loading()||!this.editable()||this.createUncertain())return;this.form.markAllAsTouched();this.error.set('');this.notice.set('');this.fields.set({});
  if(this.form.invalid){this.error.set('Kiểm tra các trường chưa hợp lệ.');this.focusInvalid();return;}
  this.busy.set(true);const b=this.book(),request=b?this.api.update(b.id,b.version,toBookWrite(this.form)):this.api.create(toBookWrite(this.form));request.pipe(takeUntilDestroyed(this.destroy)).subscribe({next:saved=>{this.busy.set(false);this.accept(saved);this.notice.set('Đã lưu sách.');if(!b)void this.router.navigate(['/admin/sach',saved.id]);},error:e=>{this.busy.set(false);if(!b&&(e.status===0||e.status>=500))this.createUncertain.set(true);this.fail(e);}});
 }
 fail(e:HttpErrorResponse){const body=e.error as AdminApiError|undefined;this.fields.set(body?.fieldErrors??{});if(e.status===401){this.needsLogin.set(true);this.error.set('Phiên đã hết hạn. Đăng nhập lại bên dưới; nội dung đang sửa được giữ trên màn hình.');}else if(e.status===409)this.error.set('Dữ liệu đã thay đổi ở nơi khác. Nội dung đang sửa vẫn được giữ; mở bản đã lưu ở tab khác để đối chiếu.');else if(this.createUncertain())this.error.set('Chưa rõ sách đã được tạo hay chưa. Mở danh sách ở tab khác để kiểm tra trước khi tạo thêm.');else this.error.set(body?.message||'Chưa lưu được. Nội dung đang sửa được giữ nguyên.');this.focusInvalid();}
 focusInvalid(){setTimeout(()=>{const key=Object.keys(this.fields())[0]??Object.keys(this.form.errors??{})[0]??Object.entries(this.form.controls).find(([,c])=>c.invalid)?.[0];if(key)this.element.nativeElement.querySelector<HTMLElement>(`[formControlName="${key}"]`)?.focus();else this.element.nativeElement.querySelector<HTMLElement>('[role="alert"]')?.focus();});}
 loginAgain(){if(this.busy())return;this.busy.set(true);const v=this.loginForm.getRawValue();this.auth.login(v.email,v.password).subscribe({next:()=>{this.loginForm.controls.password.reset();this.busy.set(false);this.needsLogin.set(false);this.error.set('');this.notice.set('Đã đăng nhập lại. Kiểm tra rồi lưu khi sẵn sàng.');},error:()=>{this.busy.set(false);this.error.set('Đăng nhập chưa thành công. Nội dung sách vẫn được giữ.');}});}
 canLeave(){return !this.form.dirty||typeof window==='undefined'||window.confirm('Nội dung chưa lưu sẽ mất khi rời trang. Bạn muốn rời trang?');}
 @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent){if(this.form.dirty){event.preventDefault();event.returnValue='';}}
}
