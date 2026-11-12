import {Component,DestroyRef,computed,inject,signal,viewChild} from '@angular/core';
import {DatePipe} from '@angular/common';
import {ActivatedRoute,Router,RouterLink} from '@angular/router';
import {takeUntilDestroyed,toObservable} from '@angular/core/rxjs-interop';
import {Subject,catchError,combineLatest,debounceTime,distinctUntilChanged,of,startWith,switchMap} from 'rxjs';
import {AuthService} from '../../../../core/auth/auth.service';
import {CustomerApi} from '../customer-api';
import {CustomerDetail,CustomerFilter,CustomerSummary,Page} from '../customer-models';
import {CustomerForm} from '../customer-form/customer-form';

@Component({selector:'app-customer-list',imports:[DatePipe,RouterLink,CustomerForm],templateUrl:'./customer-list.html',styleUrls:['../customer-pages.scss']})
export class CustomerList {
 private readonly api=inject(CustomerApi);
 private readonly auth=inject(AuthService);
 private readonly route=inject(ActivatedRoute);
 private readonly router=inject(Router);
 private readonly destroy=inject(DestroyRef);
 private readonly editor=viewChild(CustomerForm);
 private readonly reloads=new Subject<void>();
 private readonly searches=new Subject<string>();
 private creating=false;
 readonly owner=computed(()=>this.auth.user()?.role==='OWNER');
 readonly page=signal<Page<CustomerSummary>|null>(null);
 readonly loading=signal(true);
 readonly actionBusy=signal(false);
 readonly error=signal('');
 readonly toast=signal('');
 readonly filter=signal<CustomerFilter>({q:'',status:'ACTIVE',page:0,size:20});
 constructor(){
  combineLatest([this.route.queryParamMap,this.reloads.pipe(startWith(undefined)),toObservable(this.auth.epoch)]).pipe(switchMap(([params])=>{
   this.page.set(null);this.error.set('');this.loading.set(true);this.actionBusy.set(false);
   const n=(key:string,defaultValue:number,max:number)=>{const v=Number(params.get(key)??defaultValue);return Number.isSafeInteger(v)&&v>=0&&v<=max?v:defaultValue;};
   const status=params.get('status'),size=n('size',20,100);
   const filter:CustomerFilter={q:(params.get('q')||'').trim().replace(/\s+/g,' '),status:status==='ALL'||status==='ARCHIVED'?status:'ACTIVE',page:n('page',0,2147483647),size:size||20};this.filter.set(filter);
   if(!this.auth.user()){this.toast.set('');return of(null);}
   return this.api.list(filter).pipe(catchError(()=>{this.error.set('Chưa tải được khách hàng. Vui lòng thử lại.');return of(null);}));
  }),takeUntilDestroyed(this.destroy)).subscribe(page=>{this.page.set(page);this.loading.set(false);});
  this.searches.pipe(debounceTime(300),distinctUntilChanged(),takeUntilDestroyed(this.destroy)).subscribe(q=>this.navigate({q,page:0}));
 }
 search(value:string){this.searches.next(value);}
 changeStatus(value:string){if(value==='ACTIVE'||value==='ARCHIVED'||value==='ALL')this.navigate({status:value,page:0});}
 private navigate(patch:Partial<CustomerFilter>){void this.router.navigate([],{relativeTo:this.route,queryParams:{...this.filter(),...patch}});}
 goPage(page:number){this.navigate({page});}
 refresh(){this.reloads.next();}
 openNew(){if(!this.owner())return;this.creating=true;this.editor()?.open();}
 edit(row:CustomerSummary){
  if(!this.owner()||this.actionBusy())return;this.creating=false;this.actionBusy.set(true);const epoch=this.auth.epoch();
  this.api.detail(row.id).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:c=>{if(epoch!==this.auth.epoch()||!this.owner())return;this.actionBusy.set(false);this.editor()?.open(c);},error:()=>{if(epoch===this.auth.epoch()){this.actionBusy.set(false);this.error.set('Chưa tải được hồ sơ để chỉnh sửa.');}}});
 }
 onSaved(_customer:CustomerDetail){
  this.toast.set(this.creating?'Đã thêm khách hàng thành công':'Đã cập nhật khách hàng');
  if(this.creating)this.navigate({q:'',status:'ACTIVE',page:0});this.creating=false;this.refresh();
 }
 changeCustomerStatus(row:CustomerSummary){
  if(!this.owner()||this.actionBusy())return;
  if(row.status==='ACTIVE'&&!window.confirm('Bạn có chắc muốn lưu trữ khách hàng này? Thông tin khách hàng sẽ được giữ lại nhưng không còn xuất hiện trong danh sách đang hoạt động.'))return;
  const status=row.status==='ACTIVE'?'ARCHIVED':'ACTIVE',epoch=this.auth.epoch();this.actionBusy.set(true);this.error.set('');
  this.api.setStatus(row.id,row.version,status).pipe(takeUntilDestroyed(this.destroy)).subscribe({next:()=>{if(epoch!==this.auth.epoch())return;this.toast.set(status==='ACTIVE'?'Đã khôi phục khách hàng':'Đã lưu trữ khách hàng');const page=this.page();if(page?.items.length===1&&this.filter().page>0&&this.filter().status!=='ALL')this.goPage(this.filter().page-1);this.refresh();},error:e=>{if(epoch===this.auth.epoch()){this.actionBusy.set(false);this.error.set(e.status===409?'Dữ liệu đã thay đổi. Tải lại danh sách trước khi thao tác.':'Chưa thay đổi được trạng thái. Vui lòng thử lại.');}}});
 }
 canLeave(){return this.editor()?.canLeave()??true;}
}
