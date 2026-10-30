import { TestBed } from '@angular/core/testing';
import { BookPerformance, BOOK_PERFORMANCE_ENABLED } from './book-performance';
describe('BookPerformance', () => {
  it('does not record unless explicitly enabled', () => {
    const metrics = TestBed.inject(BookPerformance);
    metrics.record({phase:'prepare',item:'row-1',durationMs:10});
    expect(metrics.events()).toEqual([]);
  });
  it('bounds records and copies only numeric metadata and allowed phases', () => {
    TestBed.configureTestingModule({providers:[{provide:BOOK_PERFORMANCE_ENABLED,useValue:true}]});
    const metrics = TestBed.inject(BookPerformance);
    for(let i=0;i<1001;i++) metrics.record({phase:'prepare',item:'row-1',durationMs:i, sourceBytes:10, outputBytes:5, fileName:'SECRET'} as any);
    expect(metrics.events().length).toBe(1000);
    expect(metrics.events()[0].durationMs).toBe(1);
    expect(JSON.stringify(metrics.events())).not.toContain('SECRET');
    metrics.record({phase:'SECRET',item:'SECRET',durationMs:-1});
    expect(metrics.events().length).toBe(1000);
  });
});
