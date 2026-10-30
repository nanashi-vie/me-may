import { VndInput } from './vnd-input';
import { BookUploadQueue } from './book-upload-queue';
import { BookCreate } from './book.models';
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
import { BookApi } from './book-api';
import { BookDetail, Taxonomy, AgeGroup, AdminApiError } from './book.models';
import { buildBookForm, buildVariantForm, toBookWrite } from './book-form';
import { CollectionApi, CollectionDto } from '../collections/collection-api';
import { AuthService } from '../../../core/auth/auth.service';
import { BookMediaPanel } from './book-media-panel';
import { BookStatusActions } from './book-status-actions';
import { BookAuditPanel } from './book-audit-panel';
import { PRICE_NOTE, READING_NOTE } from './book-copy';
@Component({
  selector: 'app-book-editor',
  providers: [BookUploadQueue],
  imports: [VndInput, ReactiveFormsModule, RouterLink, BookMediaPanel, BookStatusActions, BookAuditPanel],
  templateUrl: './book-editor.html',
  styleUrl: './book-editor.scss',
})
export class BookEditor {
  readonly api = inject(BookApi);
  readonly auth = inject(AuthService);
  private readonly collectionApi = inject(CollectionApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  readonly form = buildBookForm();
  readonly variantNamesVisible = signal(false);
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
  readonly legacyConditions: Record<string,string> = { VERY_GOOD: 'Rất tốt', GOOD: 'Tốt', FAIR: 'Có hao mòn' };
  readonly priceNote = PRICE_NOTE;
  readonly readingNote = READING_NOTE;
  readonly loginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
  });
  readonly editable = computed(() => !this.loadFailed() && this.auth.user()?.role === 'OWNER');
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
    this.api
      .taxonomy()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({ next: (t) => this.taxonomy.set(t), error: (e) => this.fail(e) });
    this.collectionApi
      .list()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({ next: (c) => this.collections.set(c), error: (e) => this.fail(e) });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }
  load(id: string) {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.api
      .get(id)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (b) => {
          this.accept(b);
          this.loading.set(false);
        },
        error: (e) => {
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
    this.variantNamesVisible.set(b.variants.length > 1 || b.variants.some(v => !!v.name));
    this.form.controls.variants.clear({emitEvent:false});
    for (const row of b.variants) this.form.controls.variants.push(buildVariantForm(row),{emitEvent:false});
    this.form.reset(b);
    this.form.markAsPristine();
    this.fields.set({});
  }
  addVariant() {
    if (!this.editable() || this.busy() || this.otherBusy() || this.loading() || this.createUncertain()) return;
    this.form.controls.variants.push(buildVariantForm());
    this.variantNamesVisible.set(true);
    this.form.controls.variants.markAsDirty();
  }
  removeNewVariant(index: number) {
    if (!this.editable() || this.busy() || this.otherBusy() || this.loading() || this.createUncertain()) return;
    const rows = this.form.controls.variants;
    if (rows.length > 1 && rows.at(index)?.controls.id.value === null) {
      rows.removeAt(index); rows.markAsDirty();
    }
  }
  totalStock() {
    return this.form.controls.variants.controls.reduce((sum,row)=>{
      const n=row.controls.stock.value;return sum+(n !== null && Number.isSafeInteger(n) && n>=0 ? n : 0);
    },0);
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
      !!w.conditionNote &&
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
    this.api
      .create(this.pendingCreate)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (saved) => {
          this.busy.set(false);
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
