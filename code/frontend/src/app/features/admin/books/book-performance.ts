import { Injectable, InjectionToken, inject, signal } from '@angular/core';
export const BOOK_PERFORMANCE_ENABLED = new InjectionToken<boolean>('Book performance metrics', {
  providedIn:'root', factory:()=> {try{return typeof window !== 'undefined' && window.sessionStorage.getItem('memay-performance') === '1';}catch{return false;}},
});
export interface BookPerformanceEvent { phase:string; item:string; durationMs:number; sourceBytes?:number; outputBytes?:number; }
@Injectable({providedIn:'root'})
export class BookPerformance {
  private readonly enabled=inject(BOOK_PERFORMANCE_ENABLED);
  private readonly buffer=signal<BookPerformanceEvent[]>([]);
  readonly events=this.buffer.asReadonly();
  private readonly items=new Map<string,string>();
  private sequence=0;
  record(event:BookPerformanceEvent) {
    if(!this.enabled || !['queue','prepare','upload','ready'].includes(event.phase) || !Number.isFinite(event.durationMs) || event.durationMs<0) return;
    if(!this.items.has(event.item)) {
      if(this.items.size>=1000)this.items.clear();
      this.items.set(event.item,'photo-'+(++this.sequence));
    }
    const clean:BookPerformanceEvent={phase:event.phase,item:this.items.get(event.item)!,durationMs:event.durationMs};
    for(const key of ['sourceBytes','outputBytes'] as const)
      if(Number.isSafeInteger(event[key]) && event[key]!>=0)clean[key]=event[key];
    const evicted=this.buffer().length>=1000?this.buffer()[0]:null;
    if(evicted&&typeof performance.clearMeasures==='function')performance.clearMeasures('memay-book-'+evicted.item+'-'+evicted.phase);
    this.buffer.update(rows=>[...rows.slice(-999),clean]);
    // QA can read the bounded buffer through User Timing without exporting form data.
    if(typeof performance !== 'undefined' && typeof performance.measure === 'function') {
      const name='memay-book-'+clean.item+'-'+clean.phase;
      performance.clearMeasures(name);
      performance.measure(name,{start:Math.max(0,performance.now()-clean.durationMs),duration:clean.durationMs,detail:clean});
    }
  }
}
