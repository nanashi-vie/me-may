import { Component,DestroyRef,HostListener,computed,effect,inject,signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl,FormGroup,ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { BookImportApi } from './book-import-api';
import { ImportIssue,ImportOptions,ImportPreview,ImportReceipt,ImportWrite } from './book-import-models';
import { formatPriceRange } from './book-copy';

@Component({selector:'app-book-import',imports:[RouterLink,ReactiveFormsModule],templateUrl:'./book-import.html',styleUrl:'./book-import.scss'})
export class BookImport {
  readonly auth=inject(AuthService);private readonly api=inject(BookImportApi);private readonly destroy=inject(DestroyRef);
  readonly selectedFile=signal<File|null>(null);readonly preview=signal<ImportPreview|null>(null);readonly receipt=signal<ImportReceipt|null>(null);
  readonly options=signal<ImportOptions|null>(null);readonly busy=signal(false);readonly confirmed=signal(false);
  readonly error=signal('');readonly notice=signal('');readonly issues=signal<ImportIssue[]>([]);readonly totalIssues=signal(0);
  readonly uncertain=signal(false);readonly retryable=signal(false);readonly retryAfter=signal('');readonly needsLogin=signal(false);
  readonly loginForm=new FormGroup({email:new FormControl('',{nonNullable:true}),password:new FormControl('',{nonNullable:true})});
  readonly editable=computed(()=>this.auth.user()?.role==='OWNER');readonly price=formatPriceRange;
  readonly canConfirm=computed(()=>this.editable()&&!this.busy()&&!this.needsLogin()&&!this.retryable()&&!!this.preview()?.document.fingerprint&&this.totalIssues()===0&&!this.receipt()&&!!this.selectedFile());
  readonly totalStock=computed(()=>this.totalIssues()?null:this.preview()?.document.groups.reduce((sum,g)=>sum+g.write.variants.reduce((n,v)=>n+(v.stock??0),0),0));
  readonly metadata:{label:string;key:keyof ImportWrite}[]=[
    {label:'ISBN',key:'isbn'},{label:'Nhà xuất bản',key:'publisher'},{label:'Tác giả',key:'author'},{label:'Ngôn ngữ',key:'language'},
    {label:'Thể loại',key:'categoryCode'},{label:'Kiểu bìa',key:'binding'},{label:'Giá từ',key:'priceMinVnd'},{label:'Giá đến',key:'priceMaxVnd'},
    {label:'Trọng lượng (g)',key:'weightG'},{label:'Tình trạng',key:'conditionGrade'},{label:'Mô tả tình trạng',key:'conditionNote'},
    {label:'Độ tuổi',key:'ageGroups'},{label:'Mô tả sách',key:'description'},{label:'Mức đọc',key:'readingLevel'},{label:'Video',key:'readingVideoUrl'}];
  private request?:Subscription;private optionRequest?:Subscription;private sequence=0;
  private seenEpoch=this.auth.epoch();private ownerId=this.auth.user()?.id;
  private previewFile:File|null=null;private previewEpoch=-1;
  private pending:{file:File;fingerprint:string;epoch:number}|null=null;
  constructor(){
    effect(()=>{
      const epoch=this.auth.epoch(),user=this.auth.user();if(epoch===this.seenEpoch)return;
      this.seenEpoch=epoch;const pending=!!this.pending;this.cancel();this.clearResult();
      if(user&&(user.role!=='OWNER'||(this.ownerId!==undefined&&user.id!==this.ownerId)))this.selectedFile.set(null);
      if(user)this.ownerId=user.id;
      this.notice.set(pending?'Phiên đăng nhập đã đổi. Lô trước có thể đã được xử lý; kiểm lại cùng file để nhận biên nhận.':'Phiên đăng nhập đã đổi. Kiểm tra lại file trước khi import.');
      if(user?.role==='OWNER')this.loadOptions();
    });
    this.destroy.onDestroy(()=>{this.cancel();this.optionRequest?.unsubscribe();});
  }
  ngOnInit(){if(this.editable())this.loadOptions();}
  private cancel(){++this.sequence;this.request?.unsubscribe();this.busy.set(false);}
  private clearResult(){this.preview.set(null);this.receipt.set(null);this.issues.set([]);this.totalIssues.set(0);this.confirmed.set(false);this.previewFile=null;this.previewEpoch=-1;this.pending=null;this.retryable.set(false);this.uncertain.set(false);this.retryAfter.set('');}
  select(file:File|null){this.cancel();this.clearResult();this.selectedFile.set(file);this.error.set('');this.notice.set('');if(file&&!this.validFile(file))this.error.set('Dùng file .csv hoặc .xlsx không rỗng, tối đa 2 MiB.');}
  fileChanged(event:Event){this.select((event.target as HTMLInputElement).files?.item(0)??null);}
  private validFile(file:File){return /\.(csv|xlsx)$/i.test(file.name)&&file.size>0&&file.size<=2097152;}
  private current(sequence:number,epoch:number,file:File){return sequence===this.sequence&&epoch===this.auth.epoch()&&file===this.selectedFile()&&this.editable();}
  checkFile(){
    const file=this.selectedFile();if(!file||!this.validFile(file)||this.busy()||!this.editable()||this.needsLogin())return;
    this.clearResult();this.error.set('');this.notice.set('');this.busy.set(true);const sequence=++this.sequence,epoch=this.auth.epoch();
    this.request=this.api.preview(file).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next:result=>{if(!this.current(sequence,epoch,file))return;this.busy.set(false);this.preview.set(result);this.receipt.set(result.receipt);this.issues.set(result.document.issues);this.totalIssues.set(result.document.totalIssues);this.previewFile=file;this.previewEpoch=epoch;},
      error:e=>{if(sequence!==this.sequence)return;if(!this.acceptFailure(epoch,e))return;this.failed(e,false);}});
  }
  confirm(){
    const fingerprint=this.preview()?.document.fingerprint,file=this.selectedFile();
    if(!this.canConfirm()||!this.confirmed()||!fingerprint||!file||file!==this.previewFile||this.previewEpoch!==this.auth.epoch())return;
    this.pending={file,fingerprint,epoch:this.auth.epoch()};this.sendCommit();
  }
  retryCommit(){if(this.retryable())this.sendCommit();}
  private sendCommit(){
    const pending=this.pending;if(!pending||this.busy()||!this.editable()||pending.file!==this.selectedFile()||pending.epoch!==this.auth.epoch())return;
    this.busy.set(true);this.error.set('');this.retryAfter.set('');const sequence=++this.sequence;
    this.request=this.api.confirm(pending.file,pending.fingerprint).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next:receipt=>{if(!this.current(sequence,pending.epoch,pending.file))return;this.busy.set(false);this.receipt.set(receipt);this.pending=null;this.retryable.set(false);this.uncertain.set(false);this.confirmed.set(false);},
      error:e=>{if(sequence!==this.sequence)return;if(!this.acceptFailure(pending.epoch,e))return;this.failed(e,true);}});
  }
  private acceptFailure(epoch:number,e:HttpErrorResponse){return epoch===this.auth.epoch()||(e.status===401&&this.auth.user()===null);}
  private auxiliaryFailed(e:HttpErrorResponse){
    if(e.status===401){this.cancel();this.failed(e,false);return;}
    this.error.set(e.status===403?"Chỉ chủ tiệm được tải mẫu và mã lựa chọn.":"Chưa tải được mẫu hoặc mã lựa chọn. Bạn có thể thử lại; file đang kiểm tra được giữ nguyên.");
  }
  private failed(e:HttpErrorResponse,commit:boolean){
    this.busy.set(false);this.confirmed.set(false);this.retryAfter.set(e.headers?.get('Retry-After')??'');
    if(e.status===401){this.needsLogin.set(true);this.clearResult();this.error.set('Phiên đã hết hạn. File được giữ trong tab; đăng nhập lại rồi kiểm tra file.');return;}
    if(e.status===429){this.retryable.set(commit);this.error.set('Đang có import khác hoặc đã đạt giới hạn. Giữ file và thử lại sau.');return;}
    if(commit&&(e.status===0||e.status>=500)){this.retryable.set(true);this.uncertain.set(true);this.error.set('Chưa nhận được xác nhận. Thử lại đúng lần import này với cùng file để tránh tạo trùng.');return;}
    this.pending=null;this.retryable.set(false);this.preview.set(null);this.previewFile=null;
    const body=e.error;this.issues.set(Array.isArray(body?.issues)?body.issues:[]);this.totalIssues.set(body?.totalIssues??this.issues().length);
    this.error.set(e.status===409?'File hoặc dữ liệu đã đổi. Kiểm tra lại file trước khi import.':e.status===403?'Chỉ chủ tiệm được import sách.':e.status===413?'File vượt giới hạn. Tách thành file nhỏ hơn theo mẫu.':'Chưa kiểm tra hoặc import được. Sửa các lỗi trong file rồi tải lại.');
  }
  loadOptions(){
    if(!this.editable())return;this.optionRequest?.unsubscribe();const epoch=this.auth.epoch();
    this.optionRequest=this.api.options().pipe(takeUntilDestroyed(this.destroy)).subscribe({next:value=>{if(epoch===this.auth.epoch())this.options.set(value);},error:e=>{if(this.acceptFailure(epoch,e))this.auxiliaryFailed(e);}});
  }
  download(format:'csv'|'xlsx'){
    if(!this.editable())return;const epoch=this.auth.epoch();
    this.api.template(format).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:blob=>{
      if(epoch!==this.auth.epoch())return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='me-may-sach.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
    },error:e=>{if(this.acceptFailure(epoch,e))this.auxiliaryFailed(e);}});
  }
  loginAgain(){
    if(this.busy())return;this.busy.set(true);const values=this.loginForm.getRawValue();
    this.auth.login(values.email,values.password).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:()=>{this.busy.set(false);this.loginForm.controls.password.reset();this.needsLogin.set(false);this.notice.set('Đã đăng nhập lại. Kiểm tra lại file trước khi import.');},error:()=>{this.busy.set(false);this.error.set('Chưa đăng nhập được. File vẫn được giữ trong tab.');}});
  }
  display(value:unknown){return value===null||value===undefined||value===''?'—':Array.isArray(value)?value.join('; '):String(value);}
  canLeave(){return (!this.selectedFile()&&!this.busy()||!!this.receipt())||typeof window==='undefined'||window.confirm('File hoặc lần import chưa được xác nhận sẽ không còn trên màn hình. Lô đã gửi có thể vẫn được xử lý; chọn lại cùng file để kiểm tra biên nhận. Rời trang?');}
  @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent){if((this.selectedFile()&&!this.receipt())||this.busy()){event.preventDefault();event.returnValue='';}}
}
