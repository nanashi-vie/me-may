import {AuthService} from '../../../../core/auth/auth.service';
import { formatAdminPriceRange } from '../book-copy';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatePipe, DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookApi } from '../book-api';
import { Availability, BookFilter, BookSummary, Page, Publication, TrashBook } from '../book.models';
import { CATEGORY_LABELS, PUBLICATION_LABELS } from '../book-copy';
@Component({
  selector: 'app-book-list',
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  templateUrl: './book-list.html',
  styleUrl: './book-list.scss',
})
export class BookList {
  readonly auth=inject(AuthService);
  readonly price = formatAdminPriceRange;
  private readonly api = inject(BookApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  readonly categories = Object.entries(CATEGORY_LABELS);
  readonly notice = signal('');
  private focusId?: string;
  private returnScroll = 0;
  readonly filters = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    publication: new FormControl('', { nonNullable: true }),
    availability: new FormControl('', { nonNullable: true }),
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
  readonly bulkTarget = signal<{items: readonly {id:string;version:number}[]; permanent:boolean; all:boolean} | null>(null);
  readonly target = signal<BookSummary | null>(null);
  private filter: BookFilter = {};
  private sequence = 0;
  private trashSequence = 0;
  constructor() {
    const state = this.router.currentNavigation?.()?.extras.state;
    this.focusId = typeof state?.['savedBookId'] === 'string' ? state['savedBookId'] : undefined;
    this.returnScroll = typeof state?.['returnScroll'] === 'number' ? state['returnScroll'] : 0;
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      const publication = p.get('publication'),
        availability = p.get('availability');
      this.filters.setValue({
        q: p.get('q') ?? '',
        publication: publication ?? '',
        availability: availability ?? '',
        category: p.get('category') ?? '',
        binding: p.get('binding') ?? '',
        missingOnly: p.get('missingOnly') === 'true',
        unpublishedOnly: p.get('unpublishedOnly')==='true',
      });
      this.filter = {
        ...(this.focusId ? {focusId: this.focusId} : {}),
        ...(this.filters.controls.category.value ? {category: this.filters.controls.category.value} : {}),
        ...(this.filters.controls.binding.value ? {binding: this.filters.controls.binding.value} : {}),
        ...(this.filters.controls.missingOnly.value ? {missingOnly: true} : {}),
        ...(p.get('unpublishedOnly')==='true'?{unpublishedOnly:true}:{}),
        q: p.get('q') ?? '',
        page: Math.max(0, Number(p.get('page')) || 0),
        publication: ['PUBLISHED', 'ARCHIVED'].includes(publication ?? '')
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
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.filters.getRawValue(), page },
      queryParamsHandling: 'merge',
    });
  }
}
