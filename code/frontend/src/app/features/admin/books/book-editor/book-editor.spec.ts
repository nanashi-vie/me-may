import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BookEditor } from './book-editor';
import { BookApi } from '../book-api';
import { CollectionApi } from '../../collections/collection-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { BookDetail } from '../book.models';
import { HttpErrorResponse } from '@angular/common/http';
import { testBook } from '../book-test-fixture';
import { UploadItem } from '../book-upload-queue';
const saved = {
  ...testBook(),
  publication: 'PUBLISHED',
  title: 'New',
  categoryCode: 'BOARD_BOOK',
  conditionNote: 'Actual',
  weightG: 250,
  priceMinVnd: 20000,
  priceMaxVnd: 30000,
} as BookDetail;
describe('BookEditor safe final saves', () => {
  let create: ReturnType<typeof vi.fn>, update: ReturnType<typeof vi.fn>, list: ReturnType<typeof vi.fn>, role: string;
  beforeEach(() => {
    role = 'OWNER';
    create = vi.fn(() => of(saved));
    update = vi.fn(() => of(saved));
    list = vi.fn(() => of({items:[],page:0,size:20,totalElements:0,totalPages:0}));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() } } },
        {
          provide: BookApi,
          useValue: {
            titleDuplicate: () => of({duplicate:false}),
            create,
            update,
            list,
            cancelSession: () => of(null),
            session:()=>of({id:'session',state:'OPEN',media:[],expiresAt:''}),
            get: () => throwError(() => new HttpErrorResponse({ status: 404 })),
            taxonomy: () => of({ categories: [], ageGroups: [], bindings: [], readingLevels: [] }),
            audit: () => of({items:[],page:0,size:20,totalElements:0,totalPages:0}),
          },
        },
        { provide: CollectionApi, useValue: { list: () => of([]) } },
        { provide: AuthService, useValue: { user: () => ({ role }), epoch:signal(0) } },
      ],
    });
  });
  function editor() {
    return TestBed.createComponent(BookEditor).componentInstance;
  }
  function ready(e: BookEditor) {
    e.form.patchValue({
      title: 'New',
      internalNote: null,
      categoryCode: 'BOARD_BOOK',
      weightG: 250,
      priceMinVnd: 20000,
      priceMaxVnd: 30000,
    });
    e.photos.sessionId.set('session');
    e.photos.rows.set(
      ['FRONT', 'BACK'].map(
        (role, i) =>
          ({
            id: 'client' + i,
            role,
            mediaId: 'server' + i,
            state: 'READY',
            file: null,
            preview: '',
            progress: 100,
            error: '',
            alt: '',
            sourceRef: '',
            storedAlt: '',
            storedSource: '',
          }) as UploadItem,
      ),
    );
    e.confirmed.set(true);
  }
  it('opens the first unfiltered pending book only after a successful publish', async () => {
    const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    const e=editor();
    e.accept({...saved,publication:'ARCHIVED',publishedAt:null});
    ready(e);
    e.queueSearch.setValue('khác');
    const response=new Subject<BookDetail>();
    update.mockReturnValue(response);
    list.mockImplementation((filter: {size?:number}) => of({
      items:filter.size===1 ? [{id:'92'}] : [],page:0,size:1,totalElements:1,totalPages:1,
    }));
    await e.save(true,true);
    expect(navigate).not.toHaveBeenCalled();
    response.next(saved);
    expect(list).toHaveBeenCalledWith({unpublishedOnly:true,page:0,size:1});
    expect(navigate).toHaveBeenCalledWith(['/admin/sach','92'],{queryParamsHandling:'preserve'});
  });
  it('defaults language and makes private notes optional', () => {
    const fixture=TestBed.createComponent(BookEditor);const e=fixture.componentInstance;
    expect(e.form.controls.language.value).toBe('Tiếng Anh');ready(e);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[formControlName="conditionGrade"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[formControlName="internalNote"]')).not.toBeNull();
    expect(e.canPublish()).toBe(true);
    e.accept({...saved,language:null});expect(e.form.controls.language.value).toBeNull();
  });
  it('changes photo roles with the dropdown while retaining upload and replace controls', () => {
    const fixture=TestBed.createComponent(BookEditor);const e=fixture.componentInstance;ready(e);fixture.detectChanges();
    const root=fixture.nativeElement as HTMLElement;
    expect(root.textContent).not.toContain('Đưa lên');expect(root.textContent).not.toContain('Đưa xuống');
    expect(root.querySelector('[draggable="true"]')).toBeNull();
    expect(root.querySelector('input[type="file"][multiple]')).not.toBeNull();
    const role=root.querySelector('.photo-slot select') as HTMLSelectElement;role.value='BACK';role.dispatchEvent(new Event('change'));
    expect(e.photos.assignments()).toEqual([{mediaId:'server1',role:'FRONT'},{mediaId:'server0',role:'BACK'}]);
  });
  it('sends one pooled stock and never sends legacy condition or variant fields', async () => {
    vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    const e=editor();ready(e);expect(e.form.controls.stock.value).toBe(1);
    e.form.controls.stock.setValue(3);await e.save(true);
    const write=create.mock.calls[0][0].write;
    expect(write.stock).toBe(3);expect(write.internalNote).toBeNull();
    expect(write).not.toHaveProperty('variants');expect(write).not.toHaveProperty('conditionNote');
    expect(write).not.toHaveProperty('conditionGrade');
  });
  it('retains large stock and dirty values after a conflict',async()=>{
    const e=editor();e.accept({...saved,variants:[{id:'a',name:'A',stock:999999},{id:'b',name:'B',stock:999999}],totalStock:1999998});
    expect(e.form.controls.stock.value).toBe(1999998);expect(e.form.valid).toBe(true);
    e.form.controls.stock.setValue(1999997);e.form.markAsDirty();
    update.mockReturnValue(throwError(()=>new HttpErrorResponse({status:409})));
    await e.save(true);expect(e.form.controls.stock.value).toBe(1999997);expect(e.form.dirty).toBe(true);
  });
  it('calculates only on input edits and permits manual adjustments',()=>{
    const e=editor();e.accept({...saved,priceMinVnd:36450,priceMaxVnd:41918});
    expect(e.form.controls.priceMinVnd.value).toBe(36450);
    e.form.patchValue({unitPricePerKgVnd:80000,weightG:450});e.calculatePrices();
    expect(e.form.controls.priceMinVnd.value).toBe(36000);expect(e.form.controls.priceMaxVnd.value).toBe(42000);
    e.form.controls.priceMinVnd.setValue(36500);e.priceEdited('min');e.finishPrice('min');
    expect(e.form.controls.priceMinVnd.value).toBe(37000);expect(e.form.controls.priceMaxVnd.value).toBe(43000);
    e.form.controls.priceMaxVnd.setValue(44100);e.priceEdited('max');e.finishPrice('max');
    expect(e.form.controls.priceMaxVnd.value).toBe(45000);expect(e.form.controls.priceMinVnd.value).toBe(37000);
    e.photos.updates.next({...saved,version:1});
    expect(e.form.controls.priceMinVnd.value).toBe(37000);expect(e.form.controls.priceMaxVnd.value).toBe(45000);
    e.form.controls.unitPricePerKgVnd.setValue(null);e.calculatePrices();expect(e.form.controls.priceMaxVnd.value).toBe(45000);
  });
  it('completes an unpriced imported book without recalculating on photo upload',()=>{
    const e=editor();e.accept({...saved,publication:'ARCHIVED',priceMinVnd:null,priceMaxVnd:null,unitPricePerKgVnd:null,weightG:450});
    expect(e.form.controls.priceMinVnd.value).toBeNull();expect(e.form.controls.priceMaxVnd.value).toBeNull();expect(e.canPublish()).toBe(false);
    e.form.controls.unitPricePerKgVnd.setValue(80000);e.calculatePrices();
    expect(e.form.controls.priceMinVnd.value).toBe(36000);expect(e.form.controls.priceMaxVnd.value).toBe(42000);
    e.form.controls.priceMaxVnd.setValue(44000);e.priceEdited('max');e.finishPrice('max');
    e.photos.updates.next({...saved,publication:'ARCHIVED',priceMinVnd:null,priceMaxVnd:null,weightG:450,version:1});
    expect(e.form.controls.priceMinVnd.value).toBe(36000);expect(e.form.controls.priceMaxVnd.value).toBe(44000);
  });
  it('shows duplicate warning without making the form invalid or blocking save',async()=>{
    vi.useFakeTimers();
    try {
      const fixture=TestBed.createComponent(BookEditor);const e=fixture.componentInstance;ready(e);
      vi.spyOn(TestBed.inject(BookApi),'titleDuplicate').mockReturnValue(of({duplicate:true}));
      e.form.controls.title.setValue('Duplicate');await vi.advanceTimersByTimeAsync(300);fixture.detectChanges();
      expect(e.titleWarning()).toContain('Tên sách đã tồn tại');expect(e.form.valid).toBe(true);
      expect(fixture.nativeElement.querySelector('.field-title.has-error')).not.toBeNull();
      vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);await e.save(true);expect(create).toHaveBeenCalledTimes(1);
    } finally {vi.useRealTimers();}
  });
  it('cancels stale title lookups and permits saving when the lookup fails',async()=>{
    vi.useFakeTimers();
    try {
      const e=editor();ready(e);const pending=new Subject<{duplicate:boolean}>();
      const lookup=vi.spyOn(TestBed.inject(BookApi),'titleDuplicate').mockReturnValue(pending);
      e.form.controls.title.setValue('First');await vi.advanceTimersByTimeAsync(300);
      e.form.controls.title.setValue('Second');pending.next({duplicate:true});expect(e.titleWarning()).toBe('');
      lookup.mockReturnValue(throwError(()=>new HttpErrorResponse({status:503})));
      await vi.advanceTimersByTimeAsync(300);expect(e.titleWarning()).toContain('Chưa kiểm tra');expect(e.form.valid).toBe(true);
    } finally {vi.useRealTimers();}
  });
  it('posts a complete final request once and opens the saved book', async () => {
    const pending = new Subject<BookDetail>();
    create.mockReturnValue(pending);
    const e = editor();
    ready(e);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await e.save(true);
    await e.save(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({
      uploadSessionId: 'session',
      confirmedActualCopy: true,
      media: [
        { mediaId: 'server0', role: 'FRONT' },
        { mediaId: 'server1', role: 'BACK' },
      ],
      write: { priceMinVnd: 20000, priceMaxVnd: 30000, weightG: 250 },
    });
    pending.next(saved);
    expect(navigate).toHaveBeenCalledWith(['/admin/sach', saved.id]);
  });
  it('retries the identical final payload after a lost response and preserves fields', async () => {
    create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const e = editor();
    ready(e);
    e.form.markAsDirty();
    await e.save(true);
    const original = create.mock.calls[0][0];
    await e.save(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(e.createUncertain()).toBe(true);
    expect(e.photos.locked()).toBe(true);
    await e.retryCreate();
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[1][0]).toBe(original);
    expect(e.form.controls.title.value).toBe('New');
  });
  it('requires actual-copy confirmation and ready front/back; staff cannot write', async () => {
    const e = editor();
    ready(e);
    e.confirmed.set(false);
    await e.save(true);
    expect(create).not.toHaveBeenCalled();
    e.confirmed.set(true);
    e.photos.rows.update((r) => r.slice(0, 1));
    await e.save(true);
    expect(create).not.toHaveBeenCalled();
    role = 'STAFF';
    const staff = editor();
    ready(staff);
    await staff.save(true);
    expect(create).not.toHaveBeenCalled();
  });
  it('preserves dirty content on a conflict and expired login', async () => {
    const e = editor();
    e.accept(saved);
    e.form.controls.title.setValue('Changed');
    e.form.markAsDirty();
    update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    await e.save(true);
    expect(e.form.dirty).toBe(true);
    expect(e.form.controls.title.value).toBe('Changed');
    update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    await e.save(true);
    expect(e.needsLogin()).toBe(true);
  });
  it('never creates a new book when an existing route failed to load', async () => {
    (TestBed.inject(ActivatedRoute).snapshot.paramMap as unknown as Map<string, string>).set(
      'id',
      'missing',
    );
    const e = editor();
    e.ngOnInit();
    ready(e);
    await e.save(true);
    expect(create).not.toHaveBeenCalled();
  });
  it('warns before leaving unsaved text or photos', () => {
    const e = editor();
    ready(e);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(e.canLeave()).toBe(false);
    const event = new Event('beforeunload', { cancelable: true });
    e.beforeUnload(event as BeforeUnloadEvent);
    expect(event.defaultPrevented).toBe(true);
  });
  it('exposes photo renewal when the final request expires after images were ready', async () => {
    create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 410 })));
    const e = editor();
    ready(e);
    await e.save(true);
    expect(e.photos.expired()).toBe(true);
    expect(e.photos.paused()).toBe(true);
    expect(e.form.controls.title.value).toBe('New');
    expect(e.createUncertain()).toBe(false);
  });
  it('does not accept or navigate a publish response from an earlier login',async()=>{
    const pending=new Subject<BookDetail>();create.mockReturnValueOnce(pending);
    const e=editor();ready(e);await e.save(true);
    const auth=TestBed.inject(AuthService);(auth.epoch as any).set(1);
    pending.next(saved);pending.complete();expect(e.book()).toBeNull();expect(e.createUncertain()).toBe(true);
    expect(e.error()).toContain('Phiên đăng nhập đã thay đổi');
  });
  it('saves a title-only new book as ARCHIVED using an empty upload session',async()=>{
    const e=editor();e.form.controls.title.setValue('Unfinished');
    const session=vi.fn(()=>of({id:'empty-session',state:'OPEN',expiresAt:'',media:[]}));
    (TestBed.inject(BookApi) as any).createSession=session;
    create.mockReturnValue(of({...saved,publication:'ARCHIVED',publishedAt:null}));
    vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    await e.save();
    expect(create.mock.calls[0][0]).toMatchObject({publication:'ARCHIVED',uploadSessionId:'empty-session',media:[],confirmedActualCopy:false,write:{title:'Unfinished',weightG:null}});
    expect(e.notice()).not.toContain('Đã xuất bản');
  });
  it('checks consumed session before retry and opens the confirmed record without another create',async()=>{
    create.mockReturnValue(throwError(()=>new HttpErrorResponse({status:0})));
    const e=editor();ready(e);await e.save(true);
    vi.spyOn(TestBed.inject(BookApi),'session').mockReturnValue(of({id:'session',state:'CONSUMED',bookId:saved.id,media:[],expiresAt:''}));
    vi.spyOn(TestBed.inject(BookApi),'get').mockReturnValue(of(saved));
    vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
    await e.retryCreate();expect(create).toHaveBeenCalledTimes(1);expect(e.book()?.id).toBe(saved.id);expect(e.notice()).toContain('Đã xuất bản');
  });
  it('keeps dirty media metadata inside the aggregate update when publication fails',async()=>{
    const e=editor();e.accept({...saved,publication:'ARCHIVED',media:[{id:'front',role:'FRONT',alt:'Old',sourceRef:null,contentPath:'/a'},{id:'back',role:'BACK',alt:null,sourceRef:null,contentPath:'/b'}]});
    e.confirmed.set(true);e.photos.setMetadata(e.photos.rows()[0].id,'alt','New private description');
    const metadata=vi.fn(()=>of(saved));(TestBed.inject(BookApi) as any).updateMedia=metadata;
    update.mockReturnValue(throwError(()=>new HttpErrorResponse({status:400})));
    await e.save(true);
    expect(metadata).not.toHaveBeenCalled();expect(update.mock.calls[0][6]).toEqual([{mediaId:'front',alt:'New private description',sourceRef:null}]);
    expect(e.photos.rows()[0].alt).toBe('New private description');expect(e.book()?.version).toBe(saved.version);
  });
  it('checks a committed update after its response is lost before allowing another mutation',async()=>{
    const e=editor();e.accept(saved);e.form.controls.title.setValue('Changed');e.form.markAsDirty();
    update.mockReturnValue(throwError(()=>new HttpErrorResponse({status:0})));
    await e.save();await e.save();expect(update).toHaveBeenCalledTimes(1);expect(e.updateUncertain()).toBe(true);
    vi.spyOn(TestBed.inject(BookApi),'get').mockReturnValue(of({...saved,title:'Changed',version:saved.version+1}));
    await e.reconcileUpdate();expect(e.updateUncertain()).toBe(false);expect(e.book()?.version).toBe(saved.version+1);expect(e.form.dirty).toBe(false);
  });
  it('preserves edits when the uncertain saved record contains a different change',async()=>{
    const e=editor();e.accept(saved);e.form.controls.title.setValue('Local');e.form.markAsDirty();
    update.mockReturnValue(throwError(()=>new HttpErrorResponse({status:0})));await e.save();
    vi.spyOn(TestBed.inject(BookApi),'get').mockReturnValue(of({...saved,title:'Other owner',version:saved.version+1}));
    await e.reconcileUpdate();expect(e.form.controls.title.value).toBe('Local');expect(e.form.dirty).toBe(true);expect(e.updateUncertain()).toBe(true);
  });
  it('returns to the filtered list only after a successful save', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const e = editor();
    e.accept(saved);
    e.form.controls.title.setValue('Changed');
    update.mockReturnValueOnce(throwError(() => new HttpErrorResponse({status:400})));
    await e.save(false, false, true);
    expect(navigate).not.toHaveBeenCalled();
    expect(e.form.controls.title.value).toBe('Changed');
    await e.save(false, false, true);
    expect(navigate).toHaveBeenCalledWith(['/admin/sach'], {
      queryParamsHandling:'preserve', state:{savedBookId:saved.id, returnScroll:0},
    });
  });
  it('offers save and return for a published book',()=>{
    const f=TestBed.createComponent(BookEditor);const e=f.componentInstance;f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.save-actions button').length).toBe(2);
    expect(f.nativeElement.textContent).toContain('Chưa từng xuất bản');
    e.accept({...saved,publication:'ARCHIVED',publishedAt:'2026-11-01T00:00:00Z'});f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Đang ẩn');
    expect(f.nativeElement.querySelector('app-book-status-actions .status-actions .buttons button')).toBeNull();
    e.accept(saved);f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.save-actions button').length).toBe(2);
    expect(f.nativeElement.textContent).toContain('Lưu thay đổi và quay lại');
    expect(f.nativeElement.textContent).toContain('Đã xuất bản');
  });
  it('sends content and selected features with one atomic publish update',async()=>{
    const e=editor();e.accept({...saved,publication:'ARCHIVED',media:[
      {id:'front',role:'FRONT',alt:null,sourceRef:null,contentPath:'/a'},
      {id:'back',role:'BACK',alt:null,sourceRef:null,contentPath:'/b'}]});
    e.form.controls.featureCodes.setValue(['SPIN','SOUND']);e.confirmed.set(true);
    await e.save(true);
    expect(update.mock.calls[0]).toEqual([saved.id,saved.version,expect.objectContaining({featureCodes:['SPIN','SOUND']}),undefined,true,true,[]]);
  });
  it('keeps hidden weight optional and prevents publishing without it',async()=>{
    const e=editor();e.accept({...saved,publication:'ARCHIVED',weightG:null});
    expect(e.form.valid).toBe(true);await e.save(true);expect(update).not.toHaveBeenCalled();
    await e.save();expect(update).toHaveBeenCalledTimes(1);
  });
  it('limits features to three and lets the owner promote the first tag',()=>{
    const e=editor();e.toggleFeature('SOUND',true);e.toggleFeature('FLAP',true);e.toggleFeature('SLIDE',true);e.toggleFeature('SPIN',true);
    expect(e.form.controls.featureCodes.value).toEqual(['SOUND','FLAP','SLIDE']);
    e.prioritizeFeature('SLIDE');expect(e.form.controls.featureCodes.value).toEqual(['SLIDE','SOUND','FLAP']);
    e.toggleFeature('SOUND',false);expect(e.form.controls.featureCodes.value).toEqual(['SLIDE','FLAP']);
  });
  it('renders modern admin fields with notched outline field labels and custom Picture book submenu', () => {
    const fixture = TestBed.createComponent(BookEditor);
    const e = fixture.componentInstance;
    fixture.detectChanges();
    e.taxonomy.set({
      categories: [
        { code: 'BOARD_BOOK', label: 'Board book', sortOrder: 0 },
        { code: 'PICTURE_BOOK', label: 'Picture book', sortOrder: 1 },
      ],
      ageGroups: [],
      bindings: [
        { code: 'PAPERBACK', label: 'Paperback', sortOrder: 0 },
        { code: 'HARDCOVER', label: 'Hardcover', sortOrder: 1 },
      ],
      readingLevels: [],
    });
    fixture.detectChanges();
    const titleInput = fixture.nativeElement.querySelector('input[formControlName="title"]');
    const titleField = titleInput?.closest('.admin-field');
    expect(titleField).not.toBeNull();
    expect(titleField?.querySelector('.field-label')?.textContent).toContain('Tên sách');
    const categoryField = fixture.nativeElement.querySelector('.field-category');
    expect(categoryField).not.toBeNull();
    expect(categoryField?.querySelector('.field-label')?.textContent).toContain('Thể loại');

    const trigger = categoryField.querySelector('.dropdown-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    expect(categoryField.querySelector('.dropdown-popover')).not.toBeNull();

    const submenuWrap = categoryField.querySelector('.dropdown-submenu-wrap') as HTMLElement;
    submenuWrap.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    const submenuItems = Array.from(categoryField.querySelectorAll('.dropdown-submenu .dropdown-item')) as HTMLButtonElement[];
    expect(submenuItems.map((b) => b.querySelector('.item-text')?.textContent?.trim() ?? b.textContent?.trim())).toEqual([
      'Chưa xác định',
      'Paperback',
      'Hardcover',
    ]);

    submenuItems[1].click();
    fixture.detectChanges();
    expect(e.form.controls.categoryCode.value).toBe('PICTURE_BOOK');
    expect(e.form.controls.binding.value).toBe('PAPERBACK');
    expect(trigger.textContent).toContain('Picture book · Paperback');
  });
});
