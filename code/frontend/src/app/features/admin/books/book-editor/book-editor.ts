import { NgTemplateOutlet } from '@angular/common';
import type { BookSummary, Page } from '../book.models';
import { BookDetailHandoff } from '../book-detail-handoff';
import { firstValueFrom, Subscription, of, timer, switchMap, map, catchError } from 'rxjs';
import {calculatedBookPrices,roundPriceUp} from '../book-pricing';
import { VndInput } from '../vnd-input';
import { BookUploadQueue, mediaAssignment } from '../book-upload-queue';
import { BookCreate } from '../book.models';
import { Validators } from '@angular/forms';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { BookApi } from '../book-api';
import { BookDetail, Taxonomy, AgeGroup, AdminApiError, CategoryCode, Binding, BookWrite, ReadingLevel } from '../book.models';
import { buildBookForm, toBookWrite } from '../book-form';
import { CollectionApi, CollectionDto } from '../../collections/collection-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { BookMediaPanel } from '../book-media-panel/book-media-panel';
import { BookStatusActions } from '../book-status-actions/book-status-actions';
import { BookAuditPanel } from '../book-audit-panel/book-audit-panel';
import { PRICE_NOTE, READING_NOTE } from '../book-copy';
@Component({
  selector: 'app-book-editor',
  providers: [BookUploadQueue],
  imports: [NgTemplateOutlet, VndInput, ReactiveFormsModule, RouterLink, BookMediaPanel, BookStatusActions, BookAuditPanel],
  templateUrl: './book-editor.html',
  styleUrl: './book-editor.scss',
})
export class BookEditor {
  readonly api = inject(BookApi);
  private readonly handoff=inject(BookDetailHandoff);
  private metadataRequests=new Subscription();
  private loadSequence=0;
  readonly auth = inject(AuthService);
  private readonly collectionApi = inject(CollectionApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  readonly form = buildBookForm();
  readonly stockLimit = signal(999999);
  readonly titleWarning = signal('');
  readonly pricingError = signal('');
  private priceEdits={min:false,max:false};
  readonly book = signal<BookDetail | null>(null);
  readonly taxonomy = signal<Taxonomy>({
    categories: [],
    ageGroups: [],
    bindings: [],
    readingLevels: [],
  });
  readonly collections = signal<CollectionDto[]>([]);
  readonly busy = signal(false);
  readonly saveAction=signal<"save"|"publish">("save");
  readonly otherBusy = signal(false);
  readonly photos = inject(BookUploadQueue);
  readonly mediaDirty = this.photos.dirty;
  readonly confirmed = signal(false);
  private pendingCreate: BookCreate | null = null;
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly fields = signal<Record<string, string[]>>({});
  readonly needsLogin = signal(false);
  readonly createUncertain = signal(false);
  readonly updateUncertain=signal(false);
  private pendingUpdate:{version:number;publish:boolean}|null=null;
  readonly openMenu = signal<'category' | 'reading' | null>(null);
  readonly pictureSubmenuOpen = signal(false);
  readonly priceNote = PRICE_NOTE;
  readonly readingNote = READING_NOTE;
  readonly loginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
  });
  readonly editable = computed(() => !this.loadFailed() && this.auth.user()?.role === 'OWNER');
  readonly formDisabled = computed(() => this.busy() || this.otherBusy() || this.loading() || !this.editable() || this.createUncertain() || this.updateUncertain());
  pictureBindings(): { code: Binding; label: string }[] {
    const list = this.taxonomy().bindings;
    return list.length
      ? list
      : [
          { code: 'PAPERBACK', label: 'Paperback' },
          { code: 'HARDCOVER', label: 'Hardcover' },
        ];
  }
  categoryDisplayLabel(): string {
    const code = this.form.controls.categoryCode.value;
    if (!code) return 'Chưa xác định';
    const cat = this.taxonomy().categories.find((c) => c.code === code);
    const catLabel = cat?.label ?? (code === 'PICTURE_BOOK' ? 'Picture book' : code);
    if (code === 'PICTURE_BOOK') {
      const b = this.form.controls.binding.value;
      if (b) {
        const bLabel = this.pictureBindings().find((x) => x.code === b)?.label ?? (b === 'PAPERBACK' ? 'Paperback' : 'Hardcover');
        return `${catLabel} · ${bLabel}`;
      }
      return catLabel;
    }
    return catLabel;
  }
  readingDisplayLabel(): string {
    const val = this.form.controls.readingLevel.value;
    if (!val) return 'Chưa xác định';
    return this.taxonomy().readingLevels.find((l) => l.code === val)?.label ?? val;
  }
  toggleMenu(menu: 'category' | 'reading', event: Event) {
    event.stopPropagation();
    if (this.formDisabled()) return;
    if (this.openMenu() === menu) {
      this.openMenu.set(null);
      this.pictureSubmenuOpen.set(false);
    } else {
      this.openMenu.set(menu);
      this.pictureSubmenuOpen.set(menu === 'category' && this.form.controls.categoryCode.value === 'PICTURE_BOOK');
    }
  }
  togglePictureSubmenu(event: Event) {
    event.stopPropagation();
    this.pictureSubmenuOpen.update((v) => !v);
  }
  selectCategory(code: CategoryCode | null, event: Event) {
    event.stopPropagation();
    this.form.controls.categoryCode.setValue(code);
    this.form.controls.categoryCode.markAsDirty();
    this.form.controls.categoryCode.markAsTouched();
    this.openMenu.set(null);
    this.pictureSubmenuOpen.set(false);
  }
  selectPictureBinding(binding: Binding, event: Event) {
    event.stopPropagation();
    this.form.controls.categoryCode.setValue('PICTURE_BOOK');
    this.form.controls.binding.setValue(binding);
    this.form.controls.categoryCode.markAsDirty();
    this.form.controls.binding.markAsDirty();
    this.form.controls.categoryCode.markAsTouched();
    this.form.controls.binding.markAsTouched();
    this.openMenu.set(null);
    this.pictureSubmenuOpen.set(false);
  }
  selectReadingLevel(level: ReadingLevel | null, event: Event) {
    event.stopPropagation();
    this.form.controls.readingLevel.setValue(level);
    this.form.controls.readingLevel.markAsDirty();
    this.form.controls.readingLevel.markAsTouched();
    this.openMenu.set(null);
  }
  @HostListener('document:click', ['$event']) onDocumentClick(event: MouseEvent) {
    if (!this.openMenu()) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.custom-dropdown')) {
      this.openMenu.set(null);
      this.pictureSubmenuOpen.set(false);
    }
  }
  @HostListener('document:keydown.escape') onEscapeKey() {
    if (this.openMenu()) {
      this.openMenu.set(null);
      this.pictureSubmenuOpen.set(false);
    }
  }
  fieldErrors() {
    return Object.entries(this.fields()).map(([key, messages]) => ({
      key,
      message: messages.join(' '),
    }));
  }
  availableCollections() {
    const existing = this.book()?.collectionIds ?? [];
    return this.collections().filter((c) => c.active || existing.includes(c.id));
  }
  constructor() {
    this.form.controls.title.valueChanges.pipe(
      switchMap(title=>{
        this.titleWarning.set('');
        const name=title?.trim(), id=this.book()?.id;
        if(!name || name.length>300) return of('');
        return timer(300).pipe(switchMap(()=>this.api.titleDuplicate(name,id)),
          map(r=>this.form.controls.title.value===title && this.book()?.id===id && r.duplicate
            ? 'Tên sách đã tồn tại. Vui lòng kiểm tra sách đã có trước khi thêm mới.' : ''),
          catchError(()=>of('Chưa kiểm tra được tên trùng')));
      }), takeUntilDestroyed()
    ).subscribe(message=>this.titleWarning.set(message));

    this.photos.updates.pipe(takeUntilDestroyed()).subscribe((book) => this.book.set(book));
    this.photos.failures.pipe(takeUntilDestroyed()).subscribe((error) => this.fail(error));
    this.form.controls.categoryCode.valueChanges.pipe(takeUntilDestroyed()).subscribe((c) => {
      if (c !== 'PICTURE_BOOK' && this.form.controls.binding.value) {
        this.form.controls.binding.setValue(null, { emitEvent: false });
        this.notice.set('Đã bỏ kiểu bìa vì thể loại mới không phải Picture book.');
      }
    });
  }
  readonly routeBookId = signal<string | null>(null);
  readonly queue = signal<Page<BookSummary> | null>(null);
  readonly queueError = signal('');
  readonly queueTotal = signal<number | null>(null);
  readonly queueSearch = new FormControl('', {nonNullable:true});
  private queueSequence = 0;

  ngOnInit() {
    this.loadMetadata();
    const open = (id:string|null) => {
      if (!id) return;
      ++this.loadSequence;
      this.routeBookId.set(id);
      this.book.set(null);
      this.photos.configure(null);
      this.error.set('');
      this.loadFailed.set(false);
      this.confirmed.set(false);
      const seed=this.handoff.take(id);
      if (seed) { this.accept(seed); this.loading.set(false); }
      else this.load(id);
      if (this.editable()) this.loadQueue();
    };
    if (this.route.paramMap) this.route.paramMap.pipe(takeUntilDestroyed(this.destroy)).subscribe(params=>open(params.get('id')));
    else open(this.route.snapshot.paramMap.get('id'));
  }
  loadQueue(page=0) {
    const sequence=++this.queueSequence;
    const q=this.queueSearch.value.trim();
    this.queueError.set('');
    this.api.list({unpublishedOnly:true,q,page}).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: result => {
        if (sequence!==this.queueSequence) return;
        this.queue.set(result);
        if (!q) this.queueTotal.set(result.totalElements);
      },
      error: () => {
        if (sequence===this.queueSequence) this.queueError.set('Chưa tải được danh sách. Thử lại.');
      },
    });
  }
  private openNextBook() {
    const current=this.book()?.id;
    this.api.list({unpublishedOnly:true,page:0,size:1}).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: result => {
        if (this.book()?.id!==current || this.loading()) return;
        const next=result.items[0];
        if (next) void this.router.navigate(['/admin/sach',next.id],{queryParamsHandling:'preserve'});
        else this.notice.set('Đã xuất bản sách. Hàng chờ đã hết.');
      },
      error: () => this.notice.set('Đã xuất bản sách. Chưa tải được cuốn tiếp theo.'),
    });
  }
  loadMetadata(refresh=false) {
    this.metadataRequests.unsubscribe();this.metadataRequests=new Subscription();
    this.metadataRequests.add((refresh?this.api.refreshTaxonomy():this.api.taxonomy()).pipe(takeUntilDestroyed(this.destroy))
      .subscribe({next:t=>this.taxonomy.set(t),error:e=>this.fail(e)}));
    this.metadataRequests.add((refresh?this.collectionApi.refresh():this.collectionApi.list()).pipe(takeUntilDestroyed(this.destroy))
      .subscribe({next:c=>this.collections.set(c),error:e=>this.fail(e)}));
  }
  load(id: string) {
    const sequence=++this.loadSequence;
    this.loading.set(true);
    this.loadFailed.set(false);
    this.api
      .get(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (b) => {
          if(sequence!==this.loadSequence)return;
          this.accept(b);
          this.loading.set(false);
        },
        error: (e) => {
          if(sequence!==this.loadSequence)return;
          this.loadFailed.set(true);
          this.fail(e);
          this.loading.set(false);
        },
      });
  }
  accept(b: BookDetail) {
    this.book.set(b);
    this.photos.configure(b);
    this.photos.locked.set(false);
    this.createUncertain.set(false);this.updateUncertain.set(false);this.pendingUpdate=null;
    this.pendingCreate = null;
    const limit=b.stockLimit ?? b.variants.length*999999;
    this.stockLimit.set(limit);
    this.form.controls.stock.setValidators([Validators.required,Validators.min(0),Validators.max(limit),
      c=>Number.isSafeInteger(c.value)?null:{integer:true}]);
    this.form.reset({...b, featureCodes:(b.features??[]).map(f=>f.code), stock:b.totalStock,
      internalNote:b.internalNote !== undefined ? b.internalNote : b.conditionNote ?? null,
      unitPricePerKgVnd:b.unitPricePerKgVnd ?? null},{emitEvent:false});
    this.titleWarning.set('');this.pricingError.set('');this.priceEdits={min:false,max:false};
    this.form.markAsPristine();
    this.fields.set({});
  }
  priceEdited(which:'min'|'max') { this.priceEdits[which]=true; }
  calculatePrices() {
    this.priceEdits={min:false,max:false};
    const c=this.form.controls;
    c.unitPricePerKgVnd.updateValueAndValidity({emitEvent:false});
    const unit=c.unitPricePerKgVnd.value, weight=c.weightG.value;
    this.pricingError.set('');
    if(unit===null || weight===null || c.unitPricePerKgVnd.invalid || c.weightG.invalid) return;
    const prices=calculatedBookPrices(unit,weight);
    if(!prices) {
      this.pricingError.set('Giá tính được vượt giới hạn cho phép.');
      c.unitPricePerKgVnd.setErrors({priceCalculation:true});return;
    }
    this.form.patchValue(prices,{emitEvent:false});
    c.priceMinVnd.markAsDirty();c.priceMaxVnd.markAsDirty();
  }
  finishPrice(which:'min'|'max') {
    const c=this.form.controls, field=which==='min'?c.priceMinVnd:c.priceMaxVnd;
    if(!this.priceEdits[which]) return;
    this.priceEdits[which]=false;
    if(field.value===null) return;
    const rounded=roundPriceUp(field.value);
    if(rounded===null) {field.setErrors({priceCalculation:true});return;}
    field.setValue(rounded);
    c.unitPricePerKgVnd.updateValueAndValidity({emitEvent:false});this.pricingError.set('');
    if(which==='min') {
      const prices=calculatedBookPrices(rounded,1000);
      if(prices) {c.priceMaxVnd.setValue(prices.priceMaxVnd);c.priceMaxVnd.markAsDirty();}
      else field.setErrors({priceCalculation:true});
    }
  }
  toggleAge(age: AgeGroup, checked: boolean) {
    const values = this.form.controls.ageGroups;
    values.setValue(checked ? [...values.value, age] : values.value.filter((a) => a !== age));
    values.markAsDirty();
  }
  toggleCollection(id: string, checked: boolean) {
    const values = this.form.controls.collectionIds;
    values.setValue(checked ? [...values.value, id] : values.value.filter((c) => c !== id));
    values.markAsDirty();
  }
  publicationLabel() {
    const b=this.book();
    return b?.publication==='PUBLISHED'?'Đã xuất bản':b?.publishedAt?'Đang ẩn':'Chưa từng xuất bản';
  }
  featureOptions() {
    const options=[...(this.taxonomy().features??[])];
    for(const feature of this.book()?.features??[]) if(!options.some(f=>f.code===feature.code))
      options.push({...feature,sortOrder:options.length});
    return options;
  }
  toggleFeature(code:string,checked:boolean) {
    if(this.formDisabled()) return;
    const c=this.form.controls.featureCodes;
    if(checked && (c.value.length>=3 || c.value.includes(code))) return;
    c.setValue(checked?[...c.value,code]:c.value.filter(v=>v!==code));c.markAsDirty();
  }
  prioritizeFeature(code:string) {
    if(this.formDisabled()) return;
    const c=this.form.controls.featureCodes;if(!c.value.includes(code))return;
    c.setValue([code,...c.value.filter(v=>v!==code)]);c.markAsDirty();
  }
  canPublish() {
    const w = toBookWrite(this.form);
    return (
      this.form.valid &&
      !!w.title &&
      !!w.categoryCode &&
      w.weightG!==null &&
      w.priceMinVnd !== null &&
      w.priceMaxVnd !== null &&
      this.photos.ready() &&
      this.confirmed()
    );
  }
  async save(publish=false, openNext=false) {
    if (
      this.busy() ||
      this.otherBusy() ||
      this.loading() ||
      !this.editable() ||
      this.createUncertain() || this.updateUncertain() ||
      this.photos.pending()
    )
      return;
    this.finishPrice('min');this.finishPrice('max');
    this.form.markAllAsTouched();
    this.error.set('');
    this.notice.set('');
    this.fields.set({});
    const existing = this.book();
    const needsPublished=publish || existing?.publication==='PUBLISHED';
    const hasPublishedMetadata=!!this.form.controls.title.value?.trim() && !!this.form.controls.categoryCode.value &&
      this.form.controls.weightG.value!==null && this.form.controls.priceMinVnd.value!==null && this.form.controls.priceMaxVnd.value!==null;
    if (this.form.invalid || (needsPublished && (!hasPublishedMetadata || (existing?.publication!=='PUBLISHED' && !this.canPublish()))) ||
        (!existing && !this.form.controls.title.value?.trim() && !this.photos.rows().length)) {
      this.error.set(
        'Nhập đủ thông tin, khoảng giá, trọng lượng; tải xong bìa/lưng và xác nhận đúng cuốn sách.',
      );
      this.focusInvalid();
      return;
    }
    this.saveAction.set(publish?"publish":"save");
    this.busy.set(true);
    this.photos.locked.set(true);
    try {
      await this.photos.flushMetadata();
      if (!existing) {
        this.pendingCreate = {
          write: toBookWrite(this.form),
          uploadSessionId: await this.photos.ensureSession(),
          media: this.photos.assignments(),
          confirmedActualCopy: publish && this.confirmed(),
          publication: publish?'PUBLISHED':'ARCHIVED',
        };
        this.sendCreate();
        return;
      }
      const current = this.book()!;
      this.pendingUpdate={version:current.version,publish};
      this.api
        .update(
          current.id,
          current.version,
          toBookWrite(this.form),
          this.photos.dirty() ? this.photos.assignments() : undefined,
          publish, this.confirmed(), this.photos.metadataAssignments(),
        )
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (saved) => {
            this.busy.set(false);
            this.accept(saved);
            this.notice.set(publish && saved.publication==='PUBLISHED'?'Đã lưu và xuất bản sách.':'Đã lưu thay đổi.');
            if (publish && saved.publication==='PUBLISHED') {
              this.loadQueue();
              if (openNext) this.openNextBook();
            }
          },
          error: (e) => {
            this.busy.set(false);
            const uncertain=e.status===0 || e.status>=500;
            this.updateUncertain.set(uncertain);this.photos.locked.set(uncertain);
            this.fail(e);
          },
        });
    } catch (e) {
      this.busy.set(false);
      this.photos.locked.set(false);
      this.fail(e as HttpErrorResponse);
    }
  }
  async reconcileUpdate() {
    const b=this.book(),pending=this.pendingUpdate;
    if(!b || !pending || this.busy()) return;
    this.busy.set(true);
    try {
      const current=await firstValueFrom(this.api.get(b.id));
      if(current.version===pending.version) {
        this.updateUncertain.set(false);this.photos.locked.set(false);
        this.notice.set('Chưa ghi nhận lần lưu này. Có thể kiểm tra rồi lưu lại.');return;
      }
      const form=buildBookForm();form.reset({...current,stock:current.totalStock,internalNote:current.internalNote!==undefined?current.internalNote:current.conditionNote??null,featureCodes:(current.features??[]).map(f=>f.code)},{emitEvent:false});
      const media=this.photos.assignments(), actual=current.media.map(m=>mediaAssignment(m.id,m.role,m.showOnProduct));
      const metadata=this.photos.metadataAssignments();
      const metadataMatches=metadata.every(m=>current.media.some(photo=>photo.id===m.mediaId && photo.alt===m.alt && photo.sourceRef===m.sourceRef));
      if(JSON.stringify(toBookWrite(form))===JSON.stringify(toBookWrite(this.form)) && JSON.stringify(media.map(m=>mediaAssignment(m.mediaId,m.role,m.showOnProduct)))===JSON.stringify(actual) && metadataMatches && (!pending.publish || current.publication==='PUBLISHED')) {
        this.accept(current);this.notice.set(current.publication==='PUBLISHED'?'Đã xác nhận lưu sách đang xuất bản.':'Đã xác nhận lưu thay đổi.');
      } else this.error.set('Bản đã lưu có thay đổi khác. Nội dung đang sửa được giữ; mở bản đã lưu ở tab khác để đối chiếu.');
    } catch(e) {this.fail(e as HttpErrorResponse);}
    finally {this.busy.set(false);}
  }
  async retryCreate() {
    if (!this.pendingCreate || this.busy() || !this.editable()) return;
    const original=this.pendingCreate,epoch=this.auth.epoch();
    this.busy.set(true);this.photos.locked.set(true);
    try {
      const session=await firstValueFrom(this.api.session(original.uploadSessionId));
      if(epoch!==this.auth.epoch()) throw new Error('Phiên đăng nhập đã thay đổi.');
      if(session.state==='CONSUMED' && session.bookId) {
        const saved=await firstValueFrom(this.api.get(session.bookId));
        this.created(saved,epoch);return;
      }
      if(session.state!=='OPEN') throw new Error('Phiên ảnh đã đóng. Kiểm tra danh sách sách trước khi tiếp tục.');
      this.sendCreate();
    } catch(e) {
      this.busy.set(false);this.createUncertain.set(true);this.photos.locked.set(true);
      this.fail(e as HttpErrorResponse);
    }
  }
  private created(saved:BookDetail,epoch:number) {
    this.busy.set(false);
    if(epoch!==this.auth.epoch()) {
      this.createUncertain.set(true);this.photos.locked.set(true);
      this.error.set('Phiên đăng nhập đã thay đổi. Kiểm tra sách đã lưu trước khi tiếp tục.');return;
    }
    this.handoff.put(saved);this.photos.markConsumed();this.accept(saved);
    this.notice.set(saved.publication==='PUBLISHED'?'Đã xuất bản sách.':'Đã lưu thay đổi. Sách chưa công khai.');
    void this.router.navigate(['/admin/sach', saved.id]);
  }
  private sendCreate() {
    if (!this.pendingCreate) return;
    const epoch=this.auth.epoch();
    this.api
      .create(this.pendingCreate)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (saved) => {
          this.created(saved,epoch);
        },
        error: (e) => {
          this.busy.set(false);
          const uncertain = e.status === 0 || e.status >= 500 || e.status === 409;
          this.createUncertain.set(uncertain);
          this.photos.locked.set(uncertain);
          if (!uncertain) this.pendingCreate = null;
          this.fail(e);
        },
      });
  }
  fail(e: HttpErrorResponse) {
    const body = e.error as AdminApiError | undefined;
    this.fields.set(body?.fieldErrors ?? {});
    if (e.status === 401) {
      this.needsLogin.set(true);
      this.error.set(
        'Phiên đã hết hạn. Đăng nhập lại bên dưới; nội dung đang sửa được giữ trên màn hình.',
      );
    } else if (e.status === 410) {
      this.photos.expired.set(true);
      this.photos.paused.set(true);
      this.error.set(
        'Phiên ảnh đã hết hạn. Tạo lại phiên ảnh bên dưới; thông tin sách vẫn được giữ.',
      );
    } else if (e.status === 409)
      this.error.set(
        'Dữ liệu đã thay đổi ở nơi khác. Nội dung đang sửa vẫn được giữ; mở bản đã lưu ở tab khác để đối chiếu.',
      );
    else if (this.updateUncertain()) this.error.set('Chưa xác định kết quả lưu. Kiểm tra bản đã lưu trước khi thử lại; nội dung đang sửa được giữ.');
    else if (this.createUncertain())
      this.error.set(
        'Chưa nhận được xác nhận lưu sách. Kiểm tra danh sách rồi thử lại đúng lần lưu này; thông tin và ảnh được giữ nguyên để tránh tạo trùng.',
      );
    else this.error.set(body?.message || 'Chưa lưu được. Nội dung đang sửa được giữ nguyên.');
    this.focusInvalid();
  }
  focusInvalid() {
    setTimeout(() => {
      const key =
        Object.keys(this.fields())[0] ??
        Object.keys(this.form.errors ?? {})[0] ??
        Object.entries(this.form.controls).find(([, c]) => c.invalid)?.[0];
      if (key)
        this.element.nativeElement
          .querySelector<HTMLElement>(`[formControlName="${key}"]`)
          ?.focus();
      else this.element.nativeElement.querySelector<HTMLElement>('[role="alert"]')?.focus();
    });
  }
  loginAgain() {
    if (this.busy()) return;
    this.busy.set(true);
    const v = this.loginForm.getRawValue();
    this.auth.login(v.email, v.password).subscribe({
      next: () => {
        this.loginForm.controls.password.reset();
        this.busy.set(false);
        this.needsLogin.set(false);
        this.error.set('');
        this.notice.set('Đã đăng nhập lại. Kiểm tra rồi lưu khi sẵn sàng.');
        this.photos.resume();
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Đăng nhập chưa thành công. Nội dung sách vẫn được giữ.');
      },
    });
  }
  canLeave() {
    if (this.busy() || this.otherBusy() || this.photos.processing() ||
        this.photos.rows().some(row => row.state === 'removing' || row.state === 'uploading')) return false;
    return (
      (!this.form.dirty && !this.mediaDirty() && !this.createUncertain() && !this.updateUncertain()) ||
      typeof window === 'undefined' ||
      window.confirm('Nội dung chưa lưu sẽ mất khi rời trang. Bạn muốn rời trang?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.form.dirty || this.mediaDirty() || this.busy() || this.otherBusy()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
