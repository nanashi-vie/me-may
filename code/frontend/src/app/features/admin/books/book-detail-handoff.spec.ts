import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService } from '../../../core/auth/auth.service';
import { BookDetailHandoff } from './book-detail-handoff';
import { testBook } from './book-test-fixture';
describe('BookDetailHandoff',()=>{
 const epoch=signal(1);
 beforeEach(()=>{epoch.set(1);TestBed.configureTestingModule({providers:[{provide:AuthService,useValue:{epoch}}]});});
 afterEach(()=>vi.useRealTimers());
 it('accepts only matching ID and consumes a confirmed response once',()=>{
  const handoff=TestBed.inject(BookDetailHandoff);handoff.put(testBook());
  expect(handoff.take('other')).toBeNull();
  handoff.put(testBook());expect(handoff.take('1')?.bookCode).toBe('MM-000001');expect(handoff.take('1')).toBeNull();
 });
 it('expires and clears across logout or a new login',()=>{
  vi.useFakeTimers();const handoff=TestBed.inject(BookDetailHandoff);handoff.put(testBook());vi.advanceTimersByTime(10001);
  expect(handoff.take('1')).toBeNull();handoff.put(testBook());epoch.set(2);expect(handoff.take('1')).toBeNull();
 });
});
