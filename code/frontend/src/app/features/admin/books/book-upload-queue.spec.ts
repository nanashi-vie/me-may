import { testBook } from './book-test-fixture';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
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
  function setup(prepare:(f:File)=>Promise<Blob> = async f=>f) {
    const uploads: Subject<any>[] = [];
    const api = {
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
  it('uploads eight with last two internal, preserves roles on removal and replaces at capacity',async()=>{
    const {q,api,uploads}=setup();q.add(Array.from({length:8},photo));
    expect(q.rows().map(r=>r.role)).toEqual(['FRONT','BACK','SPINE','INSIDE_1','INSIDE_2','INSIDE_3','INTERNAL_1','INTERNAL_2']);
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
    expect(q.rows().find(r=>r.mediaId==='replacement')?.role).toBe('INTERNAL_1');
    expect(q.rows().find(r=>r.mediaId==='photo-7')?.role).toBe('INTERNAL_2');
  });
  it('uploads new internal photos into an internal server slot even when public slots are empty',async()=>{
    const upload=vi.fn((id:string,role:string,version:number,body:FormData)=>of(new HttpResponse({body:{...testBook(),version:1,media:[{id:'private',role,alt:null,sourceRef:null,contentPath:'/private'}]}})));
    TestBed.configureTestingModule({providers:[BookUploadQueue,{provide:BookApi,useValue:{upload,cancelSession:()=>of(null)}},{provide:PREPARE_BOOK_IMAGE,useValue:async(f:File)=>f}]});
    const q=TestBed.inject(BookUploadQueue);q.configure(testBook());q.add([photo()]);q.assignRole(q.rows()[0].id,'INTERNAL_2');
    await vi.waitFor(()=>expect(q.pending()).toBe(false));
    expect(upload.mock.calls[0][1]).toMatch(/^INTERNAL_/);expect(q.rows()[0].role).toBe('INTERNAL_2');
  });
  it('requires saving visibility before replacing a public photo shown in the internal group',async()=>{
    const {q}=setup();const book={...testBook(),publication:'PUBLISHED' as const,media:[{id:'public',role:'FRONT' as const,alt:null,sourceRef:null,contentPath:'/public'}]};
    q.configure(book);const row=q.rows()[0];q.assignRole(row.id,'INTERNAL_1');q.replace(row.id,photo());
    expect(q.rows()[0].state).toBe('READY');expect(q.rows()[0].file).toBeNull();expect(q.error()).toContain('Lưu vai trò');
  });
  it('does not move an inflight public upload into an internal group or swap a pending internal upload',async()=>{
    const response=new Subject<any>();const upload=vi.fn(()=>response);
    TestBed.configureTestingModule({providers:[BookUploadQueue,{provide:BookApi,useValue:{upload,cancelSession:()=>of(null)}},{provide:PREPARE_BOOK_IMAGE,useValue:async(f:File)=>f}]});
    const q=TestBed.inject(BookUploadQueue);q.configure(testBook());q.add([photo()]);
    await vi.waitFor(()=>expect(upload).toHaveBeenCalledTimes(1));const id=q.rows()[0].id;
    q.assignRole(id,'INTERNAL_1');expect(q.rows()[0].role).toBe('FRONT');expect(q.error()).toContain('đang tải');
  });
  it('keeps replacement visibility fixed while its file is being prepared',()=>{
    const pending=new Promise<Blob>(()=>{});
    const {q}=setup(async()=>pending);
    q.configure({...testBook(),media:[{id:'front',role:'FRONT',alt:null,sourceRef:null,contentPath:'/a'}]});
    q.replace(q.rows()[0].id,photo());q.assignRole(q.rows()[0].id,'INTERNAL_1');
    expect(q.rows()[0].role).toBe('FRONT');
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
    const api = { upload: vi.fn(() => response), cancelSession: () => of(null) };
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
    const api = {
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
