import {AuthService} from '../../../../core/auth/auth.service';
import { formatAdminPriceRange } from '../book-copy';
import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatePipe, DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { BookApi } from '../book-api';
import { Availability, Binding, BookFilter, BookSummary, CategoryCode, Page, Publication, TrashBook } from '../book.models';
import { AVAILABILITY_LABELS, CATEGORY_LABELS, MEDIA_LABELS, PUBLICATION_LABELS } from '../book-copy';
@Component({
  selector: 'app-book-list',
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  templateUrl: './book-list.html',
  styleUrl: './book-list.scss',
})
export class BookList {
  readonly auth=inject(AuthService);
  readonly price = formatAdminPriceRange;
  sourceWarning(book: BookSummary): string {
    const roles = book.unverifiedSourceRoles ?? [];
    return roles.length ? 'Nguồn ảnh Drive chưa được xác minh: '
      + roles.map(role => MEDIA_LABELS[role]).join(' · ')
      + '. Vẫn được xuất bản; cần bổ sung nguồn để khôi phục ảnh.' : '';
  }
  private readonly api = inject(BookApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  readonly categories = Object.entries(CATEGORY_LABELS) as [CategoryCode, string][];
  readonly bindings: { code: Binding; label: string }[] = [
    { code: 'PAPERBACK', label: 'Paperback' },
    { code: 'HARDCOVER', label: 'Hardcover' },
  ];
  readonly openMenu = signal<'publication' | 'availability' | 'category' | null>(null);
  readonly bindingCategory = signal<CategoryCode | null>(null);
  readonly notice = signal('');
  private focusId?: string;
  private returnScroll = 0;
  readonly storageBoxes = signal<number[]>([]);
  readonly storageBoxesError = signal(false);
  readonly filters = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    publication: new FormControl('', { nonNullable: true }),
    availability: new FormControl('', { nonNullable: true }),
    storageBoxNumber: new FormControl('', { nonNullable: true }),
    category: new FormControl('', { nonNullable: true }),
    binding: new FormControl('', { nonNullable: true }),
    missingOnly: new FormControl(false, { nonNullable: true }),
    unpublishedOnly: new FormControl(false,{nonNullable:true}),
  });
  readonly result = signal<Page<BookSummary> | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly labels = PUBLICATION_LABELS;
  readonly trashOpen = signal(false);
  readonly trashResult = signal<Page<TrashBook> | null>(null);
  readonly mutationBusy = signal(false);
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly photoDownloadBusy = signal(false);
  readonly photoDownloadNotice = signal('');
  readonly photoDownloadError = signal('');
  readonly bulkTarget = signal<{items: readonly {id:string;version:number}[]; permanent:boolean; all:boolean} | null>(null);
  readonly target = signal<BookSummary | null>(null);
  private filter: BookFilter = {};
  private sequence = 0;
  private trashSequence = 0;
  constructor() {
    this.api.storageBoxes().pipe(takeUntilDestroyed()).subscribe({
      next: boxes => this.storageBoxes.set(boxes),
      error: () => this.storageBoxesError.set(true),
    });
    const state = this.router.currentNavigation?.()?.extras.state;
    this.focusId = typeof state?.['savedBookId'] === 'string' ? state['savedBookId'] : undefined;
    this.returnScroll = typeof state?.['returnScroll'] === 'number' ? state['returnScroll'] : 0;
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      const unpublishedOnly = p.get('unpublishedOnly') === 'true',
        publication = unpublishedOnly ? '' : (p.get('publication') ?? ''),
        availability = p.get('availability');
      const rawBox = p.get('storageBoxNumber') ?? '';
      const storageBoxNumber = /^\d+$/.test(rawBox) && Number(rawBox) <= 2147483647 ? rawBox : '';
      this.filters.setValue({
        storageBoxNumber,
        q: p.get('q') ?? '',
        publication,
        availability: availability ?? '',
        category: p.get('category') ?? '',
        binding: p.get('binding') ?? '',
        missingOnly: p.get('missingOnly') === 'true',
        unpublishedOnly,
      });
      this.filter = {
        ...(storageBoxNumber !== '' ? {storageBoxNumber: Number(storageBoxNumber)} : {}),
        ...(this.focusId ? {focusId: this.focusId} : {}),
        ...(this.filters.controls.category.value ? {category: this.filters.controls.category.value} : {}),
        ...(this.filters.controls.binding.value ? {binding: this.filters.controls.binding.value} : {}),
        ...(this.filters.controls.missingOnly.value ? {missingOnly: true} : {}),
        ...(unpublishedOnly ? {unpublishedOnly: true} : {}),
        q: p.get('q') ?? '',
        page: Math.max(0, Number(p.get('page')) || 0),
        publication: !unpublishedOnly && ['PUBLISHED', 'ARCHIVED'].includes(publication)
          ? (publication as Publication)
          : undefined,
        availability: ['AVAILABLE', 'SOLD'].includes(availability ?? '')
          ? (availability as Availability)
          : undefined,
      };
      this.loadBooks();
    });
  }
  private loadBooks() {
      this.selected.set(new Set());
      const seq = ++this.sequence;
      this.loading.set(true);
      this.error.set('');
      this.api
        .list(this.filter)
        .pipe(takeUntilDestroyed(this.destroy))
        .subscribe({
          next: (r) => {
            if (seq === this.sequence) {
              if (r.page > 0 && !r.items.length) {
                this.search(Math.max(0, r.totalPages - 1));
                return;
              }
              this.result.set(r);
              this.loading.set(false);
              this.focusSavedBook(r);
            }
          },
          error: () => {
            if (seq === this.sequence) {
              this.error.set('Chưa tải được danh sách. Kiểm tra phiên đăng nhập và thử lại.');
              this.loading.set(false);
            }
          },
        });
  }
  editUrl(id: string) {
    return this.router.serializeUrl(this.router.createUrlTree(['/admin/sach', id],
      {queryParamsHandling:'preserve'}));
  }

  openBook(event: MouseEvent, id: string) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void this.router.navigate(['/admin/sach', id], {queryParamsHandling:'preserve',
      state:{returnScroll: this.document.defaultView?.scrollY ?? 0}});
  }

  private focusSavedBook(result: Page<BookSummary>) {
    const id = this.focusId;
    if (!id) return;
    this.focusId = undefined;
    this.filter.focusId = undefined;
    const found = result.items.some(book => book.id === id);
    this.notice.set(found ? 'Đã lưu thay đổi.' : 'Đã lưu thay đổi. Cuốn vừa lưu đã rời kết quả lọc.');
    if (result.page !== this.filter.page) {
      void this.router.navigate([], {relativeTo: this.route, queryParams: {page: result.page},
        queryParamsHandling: 'merge', replaceUrl: true}).then(() => this.scrollToSaved(id, found));
    } else this.scrollToSaved(id, found);
  }

  private scrollToSaved(id: string, found: boolean) {
    const view = this.document.defaultView;
    view?.requestAnimationFrame(() => {
      const row = found ? this.document.getElementById('admin-book-' + id) : null;
      if (row) {
        row.classList.add('saved-book');
        row.scrollIntoView({block: 'center'});
      } else {
        view.scrollTo({top: this.returnScroll});
      }
    });
  }

  showTrash(page=0) {
    if (this.mutationBusy()) return;
    this.selected.set(new Set());
    this.trashOpen.set(true);
    this.error.set('');
    const sequence = ++this.trashSequence;
    this.api.trash(page).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: result => {
        if (sequence !== this.trashSequence) return;
        if (page && !result.items.length) this.showTrash(page - 1);
        else this.trashResult.set(result);
      },
      error: () => { if (sequence === this.trashSequence) this.error.set('Chưa tải được Thùng rác.'); },
    });
  }
  closeTrash() {
    this.trashOpen.set(false);
    this.selected.set(new Set());
  }
  toggle(id:string, checked:boolean) {
    const selected=new Set(this.selected());
    if (checked) selected.add(id);
    else selected.delete(id);
    this.selected.set(selected);
  }
  selectPage(items:readonly {id:string}[], checked:boolean) {
    this.selected.set(new Set(checked ? items.map(item=>item.id) : []));
  }

  downloadPhotos() {
    if (this.photoDownloadBusy() || this.loading() || this.trashOpen()
        || this.auth.user()?.role !== 'OWNER') return;
    const books = this.result()?.items.filter(book => this.selected().has(book.id)) ?? [];
    if (!books.length) return;

    const epoch = this.auth.epoch();
    this.photoDownloadBusy.set(true);
    this.photoDownloadNotice.set('');
    this.photoDownloadError.set('');
    this.api.downloadPhotos(books.map(book => book.id)).pipe(
      takeUntilDestroyed(this.destroy),
      finalize(() => this.photoDownloadBusy.set(false)),
    ).subscribe({
      next: response => {
        if (epoch !== this.auth.epoch()) return;
        if (!response.body?.size) {
          this.photoDownloadError.set('File tải về trống. Vui lòng thử lại.');
          return;
        }
        const url = URL.createObjectURL(response.body);
        const link = this.document.createElement('a');
        link.href = url;
        link.download = books.length === 1 ? books[0].bookCode + '.zip' : 'me-may-anh-sach.zip';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        const missing = response.headers.get('X-Missing-Book-Codes');
        if (missing) this.photoDownloadNotice.set('Sách chưa có ảnh: ' + missing.split(',').join(', ') + '.');
      },
      error: ({status}) => {
        const messages: Record<number, string> = {
          401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
          403: 'Bạn không có quyền tải ảnh sách.',
          404: 'Danh sách sách đã thay đổi. Hãy tải lại trang và chọn lại.',
          413: 'Ảnh vượt giới hạn 32 MiB. Hãy chọn ít cuốn hơn.',
          422: 'Các cuốn đã chọn chưa có ảnh.',
          429: 'Hệ thống đang tạo file tải khác. Vui lòng thử lại sau.',
          502: 'Chưa lấy được ảnh từ kho lưu trữ. Vui lòng thử lại.',
        };
        this.photoDownloadError.set(messages[status] ?? 'Chưa tải được ảnh. Vui lòng thử lại.');
      },
    });
  }
  askBulk(dialog:HTMLDialogElement, permanent:boolean, all=false) {
    if (this.mutationBusy()) return;
    const open=(items: readonly {id:string;version:number}[])=>{
      if (!items.length) return;
      this.bulkTarget.set({items,permanent,all});
      dialog.showModal();
    };
    if (!all) {
      const page=permanent ? this.trashResult() : this.result();
      open((page?.items ?? []).filter(item=>this.selected().has(item.id))
        .map(({id,version})=>({id,version})));
      return;
    }
    this.mutationBusy.set(true);
    this.error.set('');
    this.api.trashSelection().pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: items=>{
        this.mutationBusy.set(false);
        if (items.length) open(items);
        else this.showTrash();
      },
      error: ()=>{
        this.mutationBusy.set(false);
        this.error.set('Chưa tải được danh sách sách cần dọn.');
      },
    });
  }
  confirmBulk(dialog:HTMLDialogElement) {
    const target=this.bulkTarget();
    if (!target || this.mutationBusy()) return;
    this.mutationBusy.set(true);
    this.api.bulkTrash(target.items,target.permanent).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: ()=>this.finishBulk(dialog),
      error: error=>{
        this.finishBulk(dialog);
        this.error.set(error.status===409
          ? 'Danh sách đã thay đổi. Hãy chọn và xác nhận lại.'
          : 'Chưa xác nhận được thao tác. Hãy kiểm tra danh sách trước khi thử lại.');
      },
    });
  }
  private finishBulk(dialog:HTMLDialogElement) {
    this.mutationBusy.set(false);
    this.bulkTarget.set(null);
    dialog.close();
    this.loadBooks();
    if (this.trashOpen()) this.showTrash(this.trashResult()?.page ?? 0);
  }
  askTrash(book:BookSummary, dialog:HTMLDialogElement) {
    this.target.set(book);
    dialog.showModal();
  }
  expired(book:TrashBook) {
    return Date.parse(book.expiresAt) <= Date.now();
  }
  changeTrash(book:BookSummary | TrashBook, trashed:boolean, dialog?:HTMLDialogElement) {
    if (this.mutationBusy()) return;
    this.mutationBusy.set(true);
    this.error.set('');
    this.api.changeTrash(book.id,book.version,trashed).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: () => {
        this.mutationBusy.set(false);
        dialog?.close();
        if (this.trashOpen()) this.showTrash(this.trashResult()?.page ?? 0);
        this.loadBooks();
      },
      error: error => {
        this.mutationBusy.set(false);
        dialog?.close();
        this.loadBooks();
        if (this.trashOpen()) this.showTrash(this.trashResult()?.page ?? 0);
        this.error.set(error.status === 409 ? 'Trạng thái sách đã đổi hoặc đã hết hạn khôi phục. Danh sách đang được làm mới.' : 'Chưa xác nhận được thao tác. Kiểm tra danh sách rồi thử lại.');
      },
    });
  }
  search(page = 0) {
    this.openMenu.set(null);
    this.bindingCategory.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.filters.getRawValue(), page },
      queryParamsHandling: 'merge',
    });
  }

  publicationDisplayLabel(): string {
    if (this.filters.controls.unpublishedOnly.value) return 'Chưa xuất bản';
    const val = this.filters.controls.publication.value;
    if (!val) return 'Tất cả';
    return PUBLICATION_LABELS[val as Publication] ?? val;
  }

  availabilityDisplayLabel(): string {
    const val = this.filters.controls.availability.value;
    if (!val) return 'Tất cả';
    return AVAILABILITY_LABELS[val as Availability] ?? val;
  }

  categoryDisplayLabel(): string {
    const code = this.filters.controls.category.value as CategoryCode | '';
    const binding = this.filters.controls.binding.value as Binding | '';
    if (!code) {
      if (binding) return binding === 'PAPERBACK' ? 'Paperback' : 'Hardcover';
      return 'Tất cả';
    }
    const catLabel = CATEGORY_LABELS[code] ?? code;
    if (code !== 'BOARD_BOOK' && binding) {
      const bLabel = binding === 'PAPERBACK' ? 'Paperback' : 'Hardcover';
      return `${catLabel} · ${bLabel}`;
    }
    return catLabel;
  }

  toggleMenu(menu: 'publication' | 'availability' | 'category', event: Event) {
    event.stopPropagation();
    if (this.openMenu() === menu) {
      this.openMenu.set(null);
      this.bindingCategory.set(null);
    } else {
      this.openMenu.set(menu);
      const cat = this.filters.controls.category.value as CategoryCode | '';
      this.bindingCategory.set(menu === 'category' && cat && cat !== 'BOARD_BOOK' ? cat : null);
    }
  }

  selectPublication(value: '' | Publication | 'UNPUBLISHED', event: Event) {
    event.stopPropagation();
    if (value === 'UNPUBLISHED') {
      this.filters.controls.publication.setValue('');
      this.filters.controls.unpublishedOnly.setValue(true);
    } else {
      this.filters.controls.publication.setValue(value);
      this.filters.controls.unpublishedOnly.setValue(false);
    }
    this.search(0);
  }

  selectAvailability(value: '' | Availability, event: Event) {
    event.stopPropagation();
    this.filters.controls.availability.setValue(value);
    this.search(0);
  }

  selectCategoryFilter(category: '' | CategoryCode, binding: '' | Binding, event: Event) {
    event.stopPropagation();
    this.filters.controls.category.setValue(category);
    this.filters.controls.binding.setValue(category === 'BOARD_BOOK' ? '' : binding);
    this.search(0);
  }

  @HostListener('document:click', ['$event']) onDocumentClick(event: MouseEvent) {
    if (!this.openMenu()) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.custom-dropdown')) {
      this.openMenu.set(null);
      this.bindingCategory.set(null);
    }
  }

  @HostListener('document:keydown.escape') onEscapeKey() {
    if (this.openMenu()) {
      this.openMenu.set(null);
      this.bindingCategory.set(null);
    }
  }
}
