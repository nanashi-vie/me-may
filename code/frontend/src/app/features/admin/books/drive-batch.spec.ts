import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { DriveBatch } from './drive-batch';
import { BookApi } from './book-api';
import { BookUploadQueue } from './book-upload-queue';
import { AuthService } from '../../../core/auth/auth.service';

describe('Drive batch lifecycle', () => {
  const result = (state = 'PROCESSING') => ({
    id: 'batch-1', mode: 'IMPORT', state, expiresAt: '2099-01-01T00:00:00Z', digest: 'digest',
    bookVersion: null, selections: [], items: [{
      id:'item-1', fileId:'file-1', state:state==='READY'?'READY':'DOWNLOADING',
      errorCode:null, mediaId:'media-1', contentPath:'/preview', candidates:['media-1'],
    }],
  });
  let api: any, photos: any, auth: any;
  beforeEach(() => {
    sessionStorage.clear();
    api = { createDriveBatch:vi.fn(()=>of(result())), driveBatch:vi.fn(()=>of(result('READY'))),
      confirmDriveBatch:vi.fn(()=>of({...result('CONFIRMED'), selections:[{itemId:'item-1',mediaId:'media-1',role:'FRONT'}]})),
      cancelDriveBatch:vi.fn(()=>of(null)), session:vi.fn(()=>of({state:'OPEN'})) };
    photos={ persisted:signal(null), rows:signal([]), sessionId:signal('session-1'),
      driveContext:vi.fn(async()=>({sessionId:'session-1',bookId:null,bookVersion:null,targets:[]})),
      acceptDriveBatch:vi.fn(), restoreDriveSession:vi.fn(async()=>({state:'OPEN',media:[]})) };
    auth={user:signal({id:1}), epoch:signal(1)};
    TestBed.configureTestingModule({providers:[DriveBatch,{provide:BookApi,useValue:api},
      {provide:BookUploadQueue,useValue:photos},{provide:AuthService,useValue:auth}]});
  });
  afterEach(()=>{vi.useRealTimers();sessionStorage.clear();});
  it('imports links in any order and confirms only after thumbnail selection',async()=>{
    vi.useFakeTimers();
    const batch=TestBed.inject(DriveBatch);TestBed.tick();
    await batch.submit('IMPORT','file-2, file-1');
    expect(api.createDriveBatch.mock.calls[0][0].fileIds).toEqual(['file-2','file-1']);
    expect(api.confirmDriveBatch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(batch.view()?.state).toBe('READY');
    await batch.confirm();
    expect(api.confirmDriveBatch).toHaveBeenCalledTimes(1);
    expect(photos.acceptDriveBatch).toHaveBeenCalledTimes(1);
  });
  it('uses one poller and stops polling at READY',async()=>{
    vi.useFakeTimers();
    const batch=TestBed.inject(DriveBatch);TestBed.tick();
    await batch.submit('IMPORT','file-1');
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(30000);
    expect(api.driveBatch).toHaveBeenCalledTimes(1);
  });
  it('discards old-session responses after logout',async()=>{
    const response=new Subject<any>();
    api.createDriveBatch.mockReturnValue(response);
    const batch=TestBed.inject(DriveBatch);TestBed.tick();
    const submitted=batch.submit('IMPORT','file-1');
    await Promise.resolve();
    auth.user.set(null);auth.epoch.set(2);TestBed.tick();
    response.next(result());response.complete();
    await submitted;
    expect(batch.view()).toBeNull();
    expect(photos.acceptDriveBatch).not.toHaveBeenCalled();
  });
  it('requires an explicit unique target when hashes are ambiguous',async()=>{
    api.createDriveBatch.mockReturnValue(of({...result('READY'),mode:'MATCH',
      items:[{...result('READY').items[0],candidates:['a','b']}] }));
    const batch=TestBed.inject(DriveBatch);TestBed.tick();
    await batch.submit('MATCH','file-1');
    expect(batch.canConfirm()).toBe(false);
    batch.selectMedia('item-1','b');
    expect(batch.canConfirm()).toBe(true);
  });
  it('pauses in a hidden tab and resumes one aggregate request',async()=>{
    vi.useFakeTimers();
    const visibility=vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');
    const batch=TestBed.inject(DriveBatch);TestBed.tick();
    await batch.submit('IMPORT','file-1');
    visibility.mockReturnValue('hidden');document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(30000);
    expect(api.driveBatch).not.toHaveBeenCalled();
    visibility.mockReturnValue('visible');document.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(api.driveBatch).toHaveBeenCalledTimes(1);
    visibility.mockRestore();
  });
  it('resumes the owned operation after reload without creating a new batch',async()=>{
    sessionStorage.setItem('memay.drive-batch.1.new',JSON.stringify({id:'batch-1',session:'session-1'}));
    const batch=TestBed.inject(DriveBatch);TestBed.tick();
    await new Promise(resolve=>setTimeout(resolve,0));
    expect(photos.restoreDriveSession).toHaveBeenCalledWith('session-1');
    expect(api.driveBatch).toHaveBeenCalledTimes(1);
    expect(api.createDriveBatch).not.toHaveBeenCalled();
    expect(batch.view()?.state).toBe('READY');
  });
  it('stops polling after permanent denial',async()=>{
    vi.useFakeTimers();
    const {throwError}=await import('rxjs');
    const {HttpErrorResponse}=await import('@angular/common/http');
    api.driveBatch.mockReturnValue(throwError(()=>new HttpErrorResponse({status:403})));
    const batch=TestBed.inject(DriveBatch);TestBed.tick();
    await batch.submit('IMPORT','file-1');
    await vi.advanceTimersByTimeAsync(30000);
    expect(api.driveBatch).toHaveBeenCalledTimes(1);
  });
  it('retries the same creation key before accepting changed links after a lost response',async()=>{
    const {throwError}=await import('rxjs');
    const {HttpErrorResponse}=await import('@angular/common/http');
    api.createDriveBatch.mockReturnValueOnce(throwError(()=>new HttpErrorResponse({status:0})));
    const batch=TestBed.inject(DriveBatch);TestBed.tick();
    await batch.submit('IMPORT','file-1');
    const key=api.createDriveBatch.mock.calls[0][0].requestKey;
    await batch.submit('IMPORT','file-2');
    expect(api.createDriveBatch.mock.calls[1][0].requestKey).toBe(key);
    expect(api.createDriveBatch.mock.calls[1][0].fileIds).toEqual(['file-1']);
  });

  it('accepts corrected links after a definitive capacity rejection',async()=>{
    const {throwError}=await import('rxjs');
    const {HttpErrorResponse}=await import('@angular/common/http');
    api.createDriveBatch.mockReturnValueOnce(throwError(()=>new HttpErrorResponse({status:409,error:{error:'media_limit'}})));
    const batch=TestBed.inject(DriveBatch);TestBed.tick();
    await batch.submit('IMPORT','file-1,file-2');
    await batch.submit('IMPORT','file-1');
    expect(api.createDriveBatch.mock.calls[1][0].fileIds).toEqual(['file-1']);
  });

  it('uses the refreshed digest after a rejected confirmation instead of replaying stale input',async()=>{
    const {throwError}=await import('rxjs');
    const {HttpErrorResponse}=await import('@angular/common/http');
    api.createDriveBatch.mockReturnValue(of(result('READY')));
    api.confirmDriveBatch.mockReturnValueOnce(throwError(()=>new HttpErrorResponse({status:409,error:{error:'drive_batch_conflict'}})));
    api.driveBatch.mockReturnValue(of({...result('READY'),digest:'fresh-digest'}));
    const batch=TestBed.inject(DriveBatch);TestBed.tick();
    await batch.submit('IMPORT','file-1');await batch.confirm();
    await batch.read();await batch.confirm();
    expect(api.confirmDriveBatch.mock.calls[1][1].digest).toBe('fresh-digest');
    expect(batch.view()?.state).toBe('CONFIRMED');
  });

  it('explains duplicate roles and allows confirming only the checked successful photos',async()=>{
    const items=Array.from({length:8},(_,i)=>({...result('READY').items[0],id:'item-'+i,mediaId:'media-'+i,
      candidates:['media-'+i],fileId:'file-'+i}));
    api.createDriveBatch.mockReturnValue(of({...result('READY'),items}));
    const batch=TestBed.inject(DriveBatch);TestBed.tick();
    await batch.submit('IMPORT',items.map(item=>item.fileId).join(','));
    expect(batch.canConfirm()).toBe(true);
    batch.selectRole('item-0','BACK');
    expect(batch.canConfirm()).toBe(false);
    expect(batch.confirmProblem()).toContain('Lưng');
    batch.selectMedia('item-1','');
    expect(batch.canConfirm()).toBe(true);
    expect(batch.selected()).toHaveLength(7);
    batch.selectMedia('item-1','media-1');batch.selectRole('item-0','FRONT');
    expect(batch.canConfirm()).toBe(true);
  });

});

describe('Drive batch with the actual photo queue',()=>{
  afterEach(()=>sessionStorage.clear());
  for (const queueFirst of [true,false]) it('hydrates existing photos without losing roles, queueFirst='+queueFirst,async()=>{
    await hydrate(queueFirst,true);
  });
  it('does not resurrect a removed photo from a historical receipt',async()=>{await hydrate(false,false);});
  async function hydrate(queueFirst:boolean,keepImported:boolean) {
    sessionStorage.clear();
    sessionStorage.setItem('memay.image-session.new',JSON.stringify({session:'session-1',roles:{manual:'FRONT',imported:'BACK'}}));
    sessionStorage.setItem('memay.drive-batch.1.new',JSON.stringify({id:'batch-1',session:'session-1'}));
    const response=new Subject<any>();
    const media=(id:string,key:string)=>({id,requestKey:key,jobId:'job-'+id,provider:'LOCAL',state:'READY',contentPath:'/preview/'+id});
    const api={session:vi.fn(()=>response),driveBatch:()=>of({id:'batch-1',mode:'IMPORT',state:'CONFIRMED',digest:'d',
      selections:[{itemId:'imported',mediaId:'import-media',role:'BACK'}],
      items:[{id:'imported',fileId:'file',mediaId:'import-media',contentPath:'/preview/import-media',state:'READY',candidates:['import-media']}]})};
    TestBed.configureTestingModule({providers:[BookUploadQueue,DriveBatch,{provide:BookApi,useValue:api},
      {provide:AuthService,useValue:{user:signal({id:1}),epoch:signal(1)}}]});
    const queue=TestBed.inject(BookUploadQueue);
    if(queueFirst) queue.restoreDraft();
    TestBed.inject(DriveBatch);TestBed.tick();
    if(!queueFirst) queue.restoreDraft();
    const current=[media('manual-media','manual'),...(keepImported?[media('import-media','imported')]:[])];
    response.next({id:'session-1',state:'OPEN',media:current});response.complete();
    await new Promise(resolve=>setTimeout(resolve,0));
    expect(queue.rows().map(row=>[row.mediaId,row.role])).toEqual(keepImported?
      [['manual-media','FRONT'],['import-media','BACK']]:[['manual-media','FRONT']]);
    expect(JSON.parse(sessionStorage.getItem('memay.image-session.new')!).roles.manual).toBe('FRONT');
  }
});
