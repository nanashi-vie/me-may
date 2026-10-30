import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { AdminSessionCache } from './admin-session-cache';
describe('AdminSessionCache',()=>{
 const epoch=signal(1);
 beforeEach(()=>{epoch.set(1);TestBed.configureTestingModule({providers:[{provide:AuthService,useValue:{epoch}}]});});
 afterEach(()=>vi.useRealTimers());
 it('deduplicates requests, expires results and retries errors',()=>{
  vi.useFakeTimers();const cache=TestBed.inject(AdminSessionCache);const pending=new Subject<number>();
  let loads=0;const load=()=>{loads++;return pending;};const results:number[]=[];
  cache.get('taxonomy',load,60000).subscribe(v=>results.push(v));cache.get('taxonomy',load,60000).subscribe(v=>results.push(v));
  expect(loads).toBe(1);pending.next(7);pending.complete();expect(results).toEqual([7,7]);
  cache.get('taxonomy',()=>of(8),60000).subscribe(v=>results.push(v));expect(results.at(-1)).toBe(7);
  vi.advanceTimersByTime(60001);cache.get('taxonomy',()=>of(8),60000).subscribe(v=>results.push(v));expect(results.at(-1)).toBe(8);
  cache.get('broken',()=>throwError(()=>new Error('failed')),60000).subscribe({error:()=>{}});
  cache.get('broken',()=>of(9),60000).subscribe(v=>results.push(v));expect(results.at(-1)).toBe(9);
 });
 it('drops old in-flight responses after invalidation or auth boundary',()=>{
  const cache=TestBed.inject(AdminSessionCache);const pending=new Subject<number>();const values:number[]=[];
  cache.get('collections',()=>pending,60000).subscribe(v=>values.push(v));cache.invalidate('collections');
  pending.next(1);pending.complete();expect(values).toEqual([]);
  const second=new Subject<number>();cache.get('collections',()=>second,60000).subscribe(v=>values.push(v));
  epoch.set(2);second.next(2);second.complete();expect(values).toEqual([]);
  cache.get('collections',()=>of(3),60000).subscribe(v=>values.push(v));expect(values).toEqual([3]);
 });
 it('never replays a completed old stream into a new login',()=>{
  const cache=TestBed.inject(AdminSessionCache);const old=cache.get('taxonomy',()=>of(7),60000);const values:number[]=[];
  old.subscribe(v=>values.push(v));epoch.set(2);old.subscribe(v=>values.push(v));expect(values).toEqual([7]);
 });
});
