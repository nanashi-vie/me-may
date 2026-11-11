import { BookDetail } from './book.models';
import { testBook } from './book-test-fixture';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError, Observable } from 'rxjs';
import { HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { BookUploadQueue, PREPARE_BOOK_IMAGE } from './book-upload-queue';
import { BookApi } from './book-api';
const photo = () =>
  new File(
    [
      Uint8Array.from(
        atob(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7VkAAAAASUVORK5CYII=',
        ),
        (c) => c.charCodeAt(0),
      ),
    ],
    'photo.png',
    { type: 'image/png' },
  );
describe('book photo queue', () => {
  const capabilities = () => of({
    provider: 'CLOUDINARY' as const, revision: 'CLOUDINARY:1',
    formats: ['image/jpeg', 'image/png'], maxBytes: 10 * 1024 * 1024,
  });
  function setup(prepare:(f:File)=>Promise<Blob> = async f=>f) {
    const uploads: Subject<any>[] = [];
    const api = { capabilities,
      createSession: vi.fn(() => of({ id: 'session', media: [], state: 'OPEN', expiresAt: '' })),
      uploadTemporary: vi.fn(
        (session: string, body: FormData, replace: string | null, key: string) => {
          const s = new Subject<any>();
          uploads.push(s);
          return s;
        },
      ),
      removeTemporary: vi.fn(() => of(null)),
      cancelSession: vi.fn(() => of(null)),
    };
    TestBed.configureTestingModule({
      providers: [
        BookUploadQueue,
        { provide: BookApi, useValue: api },
        { provide: PREPARE_BOOK_IMAGE, useValue: prepare },
      ],
    });
    return { q: TestBed.inject(BookUploadQueue), api, uploads };
  }
  it('sends the original LOCAL file and polls before accepting it', async () => {
    const file = photo();
    const prepare = vi.fn(async (f: File) => f);
    const operation = { mediaId: 'local-id', jobId: 'job-id', status: 'PENDING' };
    const api = {
      capabilities: () => of({ provider: 'LOCAL', revision: 'LOCAL:v1', formats: [file.type], maxBytes: file.size }),
      createSession: () => of({ id: 'local-session', state: 'OPEN', media: [] }),
      uploadLocal: vi.fn((_session: string, _body: FormData) => of(new HttpResponse({ body: operation }))),
      imageOperation: vi.fn(() => of({ ...operation, status: 'READY' })),
      session: () => of({ media: [{ id: 'local-id', state: 'READY', contentPath: '/local-preview' }] }),
      cancelSession: () => of(null),
    };
    TestBed.configureTestingModule({ providers: [
      BookUploadQueue, { provide: BookApi, useValue: api }, { provide: PREPARE_BOOK_IMAGE, useValue: prepare },
    ] });
    const queue = TestBed.inject(BookUploadQueue);
    queue.add([file]);
    await vi.waitFor(() => expect(queue.rows()[0].state).toBe('READY'));
    expect(api.uploadLocal.mock.calls[0][1].get('file')).toBe(file);
    expect(api.imageOperation).toHaveBeenCalledWith('job-id');
    expect(prepare).not.toHaveBeenCalled();
    queue.markConsumed();
  });
  it('imports Drive photos for a saved book as pending until explicitly attached', async () => {
    sessionStorage.clear();
    const book = {...testBook(), media: []};
    const api = {
      capabilities: () => of({provider:'LOCAL',revision:'LOCAL:v1',formats:['image/jpeg'],maxBytes:10485760}),
      createSession: () => of({id:'drive-session',state:'OPEN',media:[]}),
      commitReplacement: () => of({...book,version:book.version+1,media:[{
        id:'drive-media',role:'FRONT',provider:'LOCAL',alt:null,sourceRef:null,contentPath:'/attached',
      }]}),
    };
    TestBed.configureTestingModule({providers:[BookUploadQueue,{provide:BookApi,useValue:api}]});
    const queue=TestBed.inject(BookUploadQueue);queue.configure(book);
    expect(await queue.driveContext('IMPORT')).toEqual({sessionId:'drive-session',bookId:null,bookVersion:null,targets:[]});
    queue.acceptDriveBatch({id:'batch',mode:'IMPORT',state:'CONFIRMED',digest:'d',expiresAt:'2099-01-01',bookVersion:null,
      selections:[{itemId:'item',mediaId:'drive-media',role:'FRONT'}],
      items:[{id:'item',fileId:'file',state:'READY',errorCode:null,mediaId:'drive-media',contentPath:'/preview',candidates:['drive-media']}],
    },'drive-session');
    expect(queue.rows()[0].pendingLocal).toBe(true);
    expect(queue.rows()[0].sourceStatus).toBe('VERIFIED');
    expect(queue.persisted()?.media).toEqual([]);
    expect(queue.pending()).toBe(true);
    await queue.commitLocal('item');
    expect(queue.rows()[0].pendingLocal).toBe(false);
    expect(queue.persisted()?.media[0].id).toBe('drive-media');
    expect(queue.persisted()?.version).toBe(book.version+1);
    sessionStorage.clear();
  });
  it('uploads eight preserves roles on removal and replaces at capacity',async()=>{
    const {q,api,uploads}=setup();q.add(Array.from({length:8},photo));
    expect(q.rows().map(r=>r.role)).toEqual(['FRONT','BACK','SPINE','INSIDE_1','INSIDE_2','INSIDE_3','INSIDE_4','INSIDE_5']);
    for(let i=0;i<8;i++) {
      await vi.waitFor(()=>expect(uploads.length).toBe(i+1));
      uploads[i].next(new HttpResponse({body:{id:'photo-'+i,state:'READY',contentPath:'/private/'+i}}));uploads[i].complete();
    }
    await vi.waitFor(()=>expect(q.ready()).toBe(true));
    q.replace(q.rows()[6].id,photo());await vi.waitFor(()=>expect(uploads.length).toBe(9));
    expect(api.uploadTemporary.mock.calls[8][2]).toBe('photo-6');
    uploads[8].next(new HttpResponse({body:{id:'replacement',state:'READY',contentPath:'/private/new'}}));uploads[8].complete();
    await vi.waitFor(()=>expect(q.pending()).toBe(false));
    await q.remove(q.rows()[2].id);
    expect(q.rows().find(r=>r.mediaId==='replacement')?.role).toBe('INSIDE_4');
    expect(q.rows().find(r=>r.mediaId==='photo-7')?.role).toBe('INSIDE_5');
  });
  it('prepares only one next photo while the current upload is pending',async()=>{
    const prepare=vi.fn(async(f:File)=>f);const {q,uploads}=setup(prepare);q.add([photo(),photo(),photo()]);
    await vi.waitFor(()=>expect(prepare).toHaveBeenCalledTimes(2));
    expect(uploads).toHaveLength(1);expect(q.rows()[1].prepared).toBeDefined();expect(q.rows()[2].prepared).toBeUndefined();
    uploads[0].next(new HttpResponse({body:{id:'server-a',state:'READY',contentPath:'/a'}}));uploads[0].complete();
    await vi.waitFor(()=>expect(uploads).toHaveLength(2));await vi.waitFor(()=>expect(prepare).toHaveBeenCalledTimes(3));
  });
  it('does not upload a removed lookahead photo after normalization finishes',async()=>{
    let complete!:(value:Blob)=>void;let calls=0;
    const {q,uploads}=setup(async f=>++calls===2?new Promise<Blob>(resolve=>complete=resolve):f);
    q.add([photo(),photo()]);await vi.waitFor(()=>expect(calls).toBe(2));const id=q.rows()[1].id;
    await q.remove(id);complete(photo());uploads[0].next(new HttpResponse({body:{id:'a',state:'READY',contentPath:'/a'}}));uploads[0].complete();
    await vi.waitFor(()=>expect(q.processing()).toBe(false));expect(uploads).toHaveLength(1);expect(q.rows()).toHaveLength(1);
  });
  it('reuses a normalized lookahead on retry and keeps a failed preparation local',async()=>{
    let calls=0;const prepare=vi.fn(async(f:File)=>{calls++;if(calls===2)throw Error('bad bitmap');return f;});
    const {q,uploads}=setup(prepare);q.add([photo(),photo()]);await vi.waitFor(()=>expect(q.rows()[1].state).toBe('error'));
    expect(q.rows()[0].state).toBe('uploading');uploads[0].error(new HttpErrorResponse({status:502}));
    await vi.waitFor(()=>expect(q.processing()).toBe(false));const first=q.rows()[0].id;q.retry(first);
    await vi.waitFor(()=>expect(uploads).toHaveLength(2));expect(prepare).toHaveBeenCalledTimes(2);
  });
  it('discards background preparation on destroy and cleans only its completed upload',async()=>{
    let complete!:(value:Blob)=>void;let calls=0;
    const {q,uploads,api}=setup(async f=>++calls===2?new Promise<Blob>(resolve=>complete=resolve):f);
    q.add([photo(),photo()]);await vi.waitFor(()=>expect(calls).toBe(2));TestBed.resetTestingModule();complete(photo());
    uploads[0].next(new HttpResponse({body:{id:'completed-after-destroy',state:'READY',contentPath:'/a'}}));uploads[0].complete();
    await vi.waitFor(()=>expect(q.processing()).toBe(false));expect(uploads).toHaveLength(1);
    expect(api.removeTemporary).toHaveBeenCalledWith('session','completed-after-destroy');
  });
  it('pauses all uploads on expiry even when lookahead finishes later',async()=>{
    let complete!:(value:Blob)=>void;let calls=0;
    const {q,uploads}=setup(async f=>++calls===2?new Promise<Blob>(resolve=>complete=resolve):f);
    q.add([photo(),photo()]);await vi.waitFor(()=>expect(calls).toBe(2));uploads[0].error(new HttpErrorResponse({status:410}));
    complete(photo());await vi.waitFor(()=>expect(q.processing()).toBe(false));expect(q.expired()).toBe(true);expect(uploads).toHaveLength(1);
    expect(q.rows()[1].prepared).toBeDefined();expect(q.ready()).toBe(false);
  });
  it('keeps photo IDs when reordered during async upload; ready files are not uploaded twice', async () => {
    const { q, uploads, api } = setup();
    q.add([photo(), photo()]);
    await vi.waitFor(() => expect(q.rows()[0].state).toBe('uploading'));
    const first = q.rows()[0].id,
      second = q.rows()[1].id;
    q.assignRole(first, 'BACK');
    uploads[0].next(
      new HttpResponse({
        body: {
          id: 'server-first',
          state: 'READY',
          contentPath: '/private/1',
          width: 1,
          height: 1,
        },
      }),
    );
    uploads[0].complete();
    await vi.waitFor(() => expect(uploads.length).toBe(2));
    uploads[1].next(
      new HttpResponse({
        body: {
          id: 'server-second',
          state: 'READY',
          contentPath: '/private/2',
          width: 1,
          height: 1,
        },
      }),
    );
    uploads[1].complete();
    await vi.waitFor(() => expect(q.ready()).toBe(true));
    expect(q.assignments()).toEqual([
      { mediaId: 'server-second', role: 'FRONT' },
      { mediaId: 'server-first', role: 'BACK' },
    ]);
    q.assignRole(first, 'FRONT');
    expect(api.uploadTemporary).toHaveBeenCalledTimes(2);
  });
  it('rejects overflow as a batch and retries only the failed item with the same request key', async () => {
    const { q, uploads, api } = setup();
    q.add([photo(), photo()]);
    q.add(Array.from({length:7},photo));
    expect(q.rows()).toHaveLength(2);
    expect(q.error()).toContain('8');
    await vi.waitFor(() => expect(uploads.length).toBe(1));
    const id = q.rows()[0].id;
    uploads[0].error(new HttpErrorResponse({ status: 502 }));
    await vi.waitFor(() => expect(uploads.length).toBe(2));
    uploads[1].next(
      new HttpResponse({ body: { id: 'other', state: 'READY', contentPath: '/private/2' } }),
    );
    uploads[1].complete();
    await vi.waitFor(() => expect(q.rows().find((r) => r.id !== id)?.state).toBe('READY'));
    q.retry(id);
    await vi.waitFor(() => expect(uploads.length).toBe(3));
    expect(api.uploadTemporary.mock.calls[0][3]).toBe(api.uploadTemporary.mock.calls[2][3]);
    expect(q.rows().find((r) => r.id !== id)?.mediaId).toBe('other');
  });
  it('pauses an expired session and preserves original files for an explicit renewal', async () => {
    const { q, uploads } = setup();
    q.add([photo(), photo()]);
    await vi.waitFor(() => expect(uploads.length).toBe(1));
    uploads[0].error(new HttpErrorResponse({ status: 410 }));
    await vi.waitFor(() => expect(q.expired()).toBe(true));
    expect(q.rows()).toHaveLength(2);
    expect(q.rows()[0].file).not.toBeNull();
    expect(q.ready()).toBe(false);
  });
  it('keeps an existing photo replacement attached to its ID when reordered while uploading', async () => {
    const response = new Subject<any>();
    const api = { capabilities, upload: vi.fn(() => response), cancelSession: () => of(null) };
    TestBed.configureTestingModule({
      providers: [
        BookUploadQueue,
        { provide: BookApi, useValue: api },
        { provide: PREPARE_BOOK_IMAGE, useValue: async (f: File) => f },
      ],
    });
    const q = TestBed.inject(BookUploadQueue),
      book = {
        ...testBook(),
        media: [
          { id: 'old', role: 'FRONT' as const, alt: 'A', sourceRef: null, contentPath: '/a' },
          { id: 'back', role: 'BACK' as const, alt: 'B', sourceRef: null, contentPath: '/b' },
        ],
      };
    q.configure(book);
    q.replace(q.sorted()[0].id, photo());
    await vi.waitFor(() => expect(q.sorted()[0].state).toBe('uploading'));
    const id = q.sorted()[0].id;
    q.assignRole(id, 'BACK');
    response.next(
      new HttpResponse({
        body: { ...book, version: 1, media: [{ ...book.media[0], id: 'new' }, book.media[1]] },
      }),
    );
    response.complete();
    await vi.waitFor(() => expect(q.pending()).toBe(false));
    expect(q.assignments()).toEqual([
      { mediaId: 'back', role: 'FRONT' },
      { mediaId: 'new', role: 'BACK' },
    ]);
    expect(q.dirty()).toBe(true);
  });
  it('allows discarding a failed unattached edit image without blocking existing edits', async () => {
    const { q } = setup();
    q.configure(testBook());
    q.add([new File(['invalid'], 'bad.jpg', { type: 'image/jpeg' })]);
    await vi.waitFor(() => expect(q.rows().some((r) => r.state === 'error')).toBe(true));
    const row = q.rows().find((r) => r.state === 'error')!;
    expect(q.canRemove(row)).toBe(true);
    await q.remove(row.id);
    expect(q.pending()).toBe(false);
  });
  it.each([false,true])('reconciles a lost media response only when concurrent stock is unchanged (%s)', async (stockChanged) => {
    const response = new Subject<any>();
    const book = {
      ...testBook(),
      media: [
        { id: 'old', role: 'FRONT' as const, alt: 'A', sourceRef: null, contentPath: '/a' },
        { id: 'back', role: 'BACK' as const, alt: 'B', sourceRef: null, contentPath: '/b' },
      ],
    };
    const current = {
      ...book,
      version: book.version + 1,
      variants: stockChanged ? [{...book.variants[0],stock:9}] : book.variants,
      totalStock: stockChanged ? 9 : book.totalStock,
      media: [{ ...book.media[0], id: 'new', contentPath: '/new' }, book.media[1]],
    };
    const api = { capabilities,
      upload: vi.fn(() => response),
      get: vi.fn(() => of(current)),
      cancelSession: () => of(null),
    };
    TestBed.configureTestingModule({
      providers: [
        BookUploadQueue,
        { provide: BookApi, useValue: api },
        { provide: PREPARE_BOOK_IMAGE, useValue: async (f: File) => f },
      ],
    });
    const q = TestBed.inject(BookUploadQueue);
    q.configure(book);
    q.replace(q.sorted()[0].id, photo());
    await vi.waitFor(() => expect(api.upload).toHaveBeenCalledTimes(1));
    const id = q.sorted()[0].id;
    q.assignRole(id, 'BACK');
    response.error(new HttpErrorResponse({ status: 0 }));
    await vi.waitFor(() => expect(q.pending()).toBe(true));
    q.retry(id);
    if (stockChanged) {
      await vi.waitFor(()=>expect(q.rows().find(r=>r.id===id)?.error).toContain('thay đổi khác'));
      expect(q.persisted()?.version).toBe(0);expect(api.upload).toHaveBeenCalledTimes(1);return;
    }
    await vi.waitFor(() => expect(q.pending()).toBe(false));
    expect(api.upload).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalled();
    expect(q.assignments()).toEqual([
      { mediaId: 'back', role: 'FRONT' },
      { mediaId: 'new', role: 'BACK' },
    ]);
  });
});

describe('attaching all pending photos',()=>{
 afterEach(()=>sessionStorage.clear());
 function setup(){
  sessionStorage.clear();
  const response=new Subject<BookDetail>();
  const api={commitReplacement:vi.fn((_book:string,_media:string,_input:{version:number})=>response as Observable<BookDetail>)};
  TestBed.configureTestingModule({providers:[BookUploadQueue,{provide:BookApi,useValue:api}]});
  const q=TestBed.inject(BookUploadQueue);q.configure(testBook());
  q.acceptDriveBatch({id:'batch',mode:'IMPORT',state:'CONFIRMED',digest:'d',expiresAt:'2099',bookVersion:null,
   selections:[{itemId:'front',mediaId:'a',role:'FRONT'},{itemId:'back',mediaId:'b',role:'BACK'}],
   items:[{id:'front',fileId:'fa',mediaId:'a',contentPath:'/a',state:'READY',errorCode:null,candidates:['a']},
    {id:'back',fileId:'fb',mediaId:'b',contentPath:'/b',state:'READY',errorCode:null,candidates:['b']}],
  },'session');
  return{q,api,response};
 }
 it('attaches sequentially with the latest version and counts only successful photos',async()=>{
  const {q,api,response}=setup();
  const running=q.commitAllLocal();
  expect(api.commitReplacement).toHaveBeenCalledTimes(1);
  expect(q.attaching()).toBe(true);
  await q.commitAllLocal();expect(api.commitReplacement).toHaveBeenCalledTimes(1);
  api.commitReplacement.mockReturnValue(of({...testBook(),version:2,media:[
   {id:'a',role:'FRONT',contentPath:'/saved/a',alt:null,sourceRef:null},
   {id:'b',role:'BACK',contentPath:'/saved/b',alt:null,sourceRef:null},
  ]}));
  response.next({...testBook(),version:1,media:[{id:'a',role:'FRONT',contentPath:'/saved/a',alt:null,sourceRef:null}]});response.complete();
  await running;
  expect(api.commitReplacement.mock.calls.map(call=>call[2].version)).toEqual([0,1]);
  expect(q.attachmentProgress()).toEqual({done:2,total:2});
  expect(q.pending()).toBe(false);expect(q.locked()).toBe(false);
 });
 it('stops on failure and retries only photos still pending',async()=>{
  const {q,api}=setup();
  api.commitReplacement.mockReturnValueOnce(of({...testBook(),version:1,media:[{id:'a',role:'FRONT',contentPath:'/saved/a',alt:null,sourceRef:null}]}))
   .mockReturnValueOnce(throwError(()=>new HttpErrorResponse({status:409})));
  await q.commitAllLocal();
  expect(q.rows().map(row=>row.pendingLocal)).toEqual([false,true]);
  expect(q.attachmentProgress()).toEqual({done:1,total:2});
  expect(q.attaching()).toBe(false);expect(q.locked()).toBe(false);
  api.commitReplacement.mockReturnValue(of({...testBook(),version:2,media:[
   {id:'a',role:'FRONT',contentPath:'/saved/a',alt:null,sourceRef:null},{id:'b',role:'BACK',contentPath:'/saved/b',alt:null,sourceRef:null},
  ]}));
  await q.commitAllLocal();
  expect(api.commitReplacement.mock.calls.map(call=>call[1])).toEqual(['a','b','b']);
  expect(q.pending()).toBe(false);
 });
});
