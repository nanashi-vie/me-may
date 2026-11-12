import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute,Router,convertToParamMap,provideRouter} from '@angular/router';
import {BehaviorSubject,Subject,of} from 'rxjs';
import {vi} from 'vitest';
import {CustomerList} from './customer-list';
import {CustomerApi} from '../customer-api';
import {AuthService,CurrentAdmin} from '../../../../core/auth/auth.service';
const row={id:'1',customerCode:'KH-000001',fullName:'Lan',phone:'0987123456',defaultAddress:null,status:'ACTIVE' as const,version:0,createdAt:'2026-11-12T00:00:00Z'};
const page={items:[row],page:0,size:20,totalElements:1,totalPages:1};
describe('CustomerList',()=>{
 function setup(role:'OWNER'|'STAFF'='OWNER'){
  const query=new BehaviorSubject(convertToParamMap({q:'lan',status:'ALL',page:'2',size:'20'}));const user=signal<CurrentAdmin|null>({id:1,email:'test@example.com',role}),epoch=signal(0);
  const api={list:vi.fn((_filter:any)=>of(page)),detail:vi.fn(()=>of({...row,zaloName:null,tiktokId:null,threadsId:null,note:null,createdBy:'1',updatedAt:row.createdAt})),setStatus:vi.fn(()=>of(row)),duplicates:vi.fn(()=>of({items:[],totalElements:0}))};
  TestBed.configureTestingModule({providers:[provideRouter([]),{provide:ActivatedRoute,useValue:{queryParamMap:query}},{provide:CustomerApi,useValue:api},{provide:AuthService,useValue:{user,epoch}}]});
  const nav=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);const f=TestBed.createComponent(CustomerList);f.detectChanges();return {f,c:f.componentInstance,api,query,nav,user,epoch};
 }
 it('preserves route filters and resets page on filter changes',async()=>{
  const {f,c,api,nav}=setup();await f.whenStable();expect(api.list).toHaveBeenCalledWith({q:'lan',status:'ALL',page:2,size:20});c.changeStatus('ARCHIVED');expect(nav).toHaveBeenCalledWith([],expect.objectContaining({queryParams:expect.objectContaining({status:'ARCHIVED',page:0})}));
  c.onSaved({...row,zaloName:null,tiktokId:null,threadsId:null,note:null,createdBy:'1',updatedAt:row.createdAt});expect(c.toast()).toContain('cập nhật');
 });
 it('ignores outdated results and clears profile data on session changes',async()=>{
  const {f,c,api,query,user,epoch}=setup();await f.whenStable();const old=new Subject<any>(),latest=new Subject<any>();api.list.mockReturnValueOnce(old as any).mockReturnValueOnce(latest as any);
  query.next(convertToParamMap({q:'old'}));query.next(convertToParamMap({q:'new'}));latest.next({...page,items:[{...row,fullName:'Latest'}]});old.next(page);expect(c.page()?.items[0].fullName).toBe('Latest');
  user.set(null);epoch.set(1);f.detectChanges();await f.whenStable();expect(c.page()).toBeNull();
 });
 it('shows staff read-only empty state and blocks mutation',async()=>{
  const {f,c,api}=setup('STAFF');api.list.mockReturnValue(of({...page,items:[],totalElements:0,totalPages:0}));c.refresh();await f.whenStable();f.detectChanges();expect(f.nativeElement.textContent).not.toContain('Thêm khách mới');expect(f.nativeElement.textContent).not.toContain('Nhấn');c.changeCustomerStatus(row);expect(api.setStatus).not.toHaveBeenCalled();
 });
});
