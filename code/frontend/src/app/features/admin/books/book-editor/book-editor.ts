import { BookDetailHandoff } from '../book-detail-handoff';
import { Subscription, of, timer, switchMap, map, catchError } from 'rxjs';
import {calculatedBookPrices,roundPriceUp} from '../book-pricing';
import { VndInput } from '../vnd-input';
import { BookUploadQueue } from '../book-upload-queue';
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
  imports: [VndInput, ReactiveFormsModule, RouterLink, BookMediaPanel, BookStatusActions, BookAuditPanel],
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
  readonly openMenu = signal<'category' | 'reading' | null>(null);
  readonly pictureSubmenuOpen = signal(false);
  readonly priceNote = PRICE_NOTE;
  readonly readingNote = READING_NOTE;
  readonly loginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
  });
  readonly editable = computed(() => !this.loadFailed() && this.auth.user()?.role === 'OWNER');
  readonly formDisabled = computed(() => this.busy() || this.otherBusy() || this.loading() || !this.editable() || this.createUncertain());
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
    this.form.controls.weightG.addValidators(Validators.required);
    this.photos.updates.pipe(takeUntilDestroyed()).subscribe((book) => this.book.set(book));
    this.photos.failures.pipe(takeUntilDestroyed()).subscribe((error) => this.fail(error));
    this.form.controls.categoryCode.valueChanges.pipe(takeUntilDestroyed()).subscribe((c) => {
      if (c !== 'PICTURE_BOOK' && this.form.controls.binding.value) {
        this.form.controls.binding.setValue(null, { emitEvent: false });
        this.notice.set('Đã bỏ kiểu bìa vì thể loại mới không phải Picture book.');
      }
    });
  }
  ngOnInit() {
    this.loadMetadata();
    const id = this.route.snapshot.paramMap.get('id');
    if(id){const seed=this.handoff.take(id);if(seed)this.accept(seed);else this.load(id);}
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
    this.createUncertain.set(false);
    this.pendingCreate = null;
    const limit=b.stockLimit ?? b.variants.length*999999;
    this.stockLimit.set(limit);
    this.form.controls.stock.setValidators([Validators.required,Validators.min(0),Validators.max(limit),
      c=>Number.isSafeInteger(c.value)?null:{integer:true}]);
    this.form.reset({...b, stock:b.totalStock,
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
  canPublish() {
    const w = toBookWrite(this.form);
    return (
      this.form.valid &&
      !!w.title &&
      !!w.categoryCode &&
      w.priceMinVnd !== null &&
      w.priceMaxVnd !== null &&
      this.photos.ready() &&
      this.confirmed()
    );
  }
  async save() {
    if (
      this.busy() ||
      this.otherBusy() ||
      this.loading() ||
      !this.editable() ||
      this.createUncertain() ||
      this.photos.pending()
    )
      return;
    this.finishPrice('min');this.finishPrice('max');
    this.form.markAllAsTouched();
    this.error.set('');
    this.notice.set('');
    this.fields.set({});
    const existing = this.book();
    if (this.form.invalid || (!existing && !this.canPublish())) {
      this.error.set(
        'Nhập đủ thông tin, khoảng giá, trọng lượng; tải xong bìa/lưng và xác nhận đúng cuốn sách.',
      );
      this.focusInvalid();
      return;
    }
    this.busy.set(true);
    this.photos.locked.set(true);
    try {
      await this.photos.flushMetadata();
      if (!existing) {
        this.pendingCreate = {
          write: toBookWrite(this.form),
          uploadSessionId: this.photos.sessionId()!,
          media: this.photos.assignments(),
          confirmedActualCopy: true,
        };
        this.sendCreate();
        return;
      }
      const current = this.book()!;
      this.api
        .update(
          current.id,
          current.version,
          toBookWrite(this.form),
          this.photos.dirty() ? this.photos.assignments() : undefined,
        )
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (saved) => {
            this.busy.set(false);
            this.accept(saved);
            this.notice.set('Đã lưu sách.');
          },
          error: (e) => {
            this.busy.set(false);
            this.photos.locked.set(false);
            this.fail(e);
          },
        });
    } catch (e) {
      this.busy.set(false);
      this.photos.locked.set(false);
      this.fail(e as HttpErrorResponse);
    }
  }
  retryCreate() {
    if (!this.pendingCreate || this.busy() || !this.editable()) return;
    this.busy.set(true);
    this.photos.locked.set(true);
    this.sendCreate();
  }
  private sendCreate() {
    if (!this.pendingCreate) return;
    const epoch=this.auth.epoch();
    this.api
      .create(this.pendingCreate)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (saved) => {
          this.busy.set(false);
          if(epoch!==this.auth.epoch()) {
            this.createUncertain.set(true);this.photos.locked.set(true);
            this.error.set('Phiên đăng nhập đã thay đổi. Kiểm tra sách đã lưu trước khi tiếp tục.');return;
          }
          this.handoff.put(saved);
          this.photos.markConsumed();
          this.accept(saved);
          this.notice.set('Đã đăng sách.');
          void this.router.navigate(['/admin/sach', saved.id]);
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
    else if (this.createUncertain())
      this.error.set(
        'Chưa nhận được xác nhận đăng sách. Thử lại đúng lần đăng này; thông tin và ảnh được giữ nguyên để tránh tạo trùng.',
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
    return (
      (!this.form.dirty && !this.mediaDirty()) ||
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
