import { Injectable, effect, inject } from '@angular/core';
import { EMPTY, Observable, catchError, defer, mergeMap, of, shareReplay, tap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
@Injectable({providedIn:'root'})
export class AdminSessionCache {
  private readonly auth=inject(AuthService);
  private epoch=this.auth.epoch();
  private readonly entries=new Map<string,{value:Observable<unknown>;expires:number;loaded:boolean}>();
  constructor(){effect(()=>{if(this.auth.epoch()!==this.epoch)this.clear();});}
  clear(){this.entries.clear();this.epoch=this.auth.epoch();}
  invalidate(key:string){this.entries.delete(key);}
  get<T>(key:string,load:()=>Observable<T>,ttlMs:number):Observable<T> {
    if(this.epoch!==this.auth.epoch())this.clear();
    const cached=this.entries.get(key);
    if(cached && (!cached.loaded || cached.expires>Date.now()))return cached.value as Observable<T>;
    const epoch=this.epoch;
    const entry={value:null as unknown as Observable<T>,expires:0,loaded:false};
    const valid=()=>epoch===this.auth.epoch()&&this.entries.get(key)===entry;
    const shared=defer(load).pipe(
      mergeMap(value=>valid()?of(value):EMPTY),
      tap(()=>{entry.loaded=true;entry.expires=Date.now()+ttlMs;}),
      catchError(error=>{if(this.entries.get(key)===entry)this.entries.delete(key);return throwError(()=>error);}),
      shareReplay({bufferSize:1,refCount:false}),
    );
    entry.value=defer(()=>shared.pipe(mergeMap(value=>valid()?of(value):EMPTY)));
    this.entries.set(key,entry);
    return entry.value;
  }
}
