import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminHttp } from '../../../core/auth/admin-http';
import { AuthService } from '../../../core/auth/auth.service';
import { Campaign } from '../../catalogue/public.models';
@Component({
  selector: 'app-flash-sale-editor',
  imports: [FormsModule],
  templateUrl: './flash-sale.html',
  styles: `
    form {
      max-width: 800px;
    }
    .dates {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .enabled {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .enabled input {
      width: auto;
    }
    .sale-item {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 1rem;
      align-items: end;
    }
    .sale-item button {
      margin-bottom: 0;
    }
    .actions {
      display: flex;
      gap: 1rem;
      margin: 2rem 0;
    }
    .actions button {
      width: auto;
      margin: 0;
    }
    small {
      color: var(--muted);
    }
    @media (max-width: 600px) {
      .dates,
      .sale-item {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class FlashSaleEditor {
  private readonly http = inject(AdminHttp);
  readonly auth = inject(AuthService);
  readonly campaign = signal<Campaign | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  enabled = false;
  startsAt = '';
  endsAt = '';
  items: Campaign['items'] = [];
  dirty = false;
  ngOnInit() {
    this.load();
  }
  private local(iso: string | null) {
    return iso ? new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(0, 16) : '';
  }
  private accept(c: Campaign) {
    this.campaign.set(c);
    this.enabled = c.enabled;
    this.startsAt = this.local(c.startsAt);
    this.endsAt = this.local(c.endsAt);
    this.items = c.items.map((i) => ({ ...i }));
    this.dirty = false;
  }
  load() {
    if (this.busy() || (this.dirty && !this.canLeave())) return;
    this.error.set('');
    this.busy.set(true);
    this.http.get<Campaign>('/flash-sale').subscribe({
      next: (c) => {
        this.accept(c);
        this.busy.set(false);
      },
      error: () => {
        this.busy.set(false);
        this.error.set('Chưa tải được Flash Sale. Kiểm tra phiên đăng nhập rồi thử lại.');
      },
    });
  }
  add() {
    this.items = [...this.items, { bookCode: '', salePriceVnd: 1 }];
    this.dirty = true;
  }
  remove(i: number) {
    this.items = this.items.filter((_, n) => n !== i);
    this.dirty = true;
  }
  save() {
    if (this.busy() || !this.campaign() || this.auth.user()?.role !== 'OWNER') return;
    this.error.set('');
    this.notice.set('');
    let start: string | null = null,
      end: string | null = null;
    try {
      start = this.startsAt ? new Date(this.startsAt + ':00+07:00').toISOString() : null;
      end = this.endsAt ? new Date(this.endsAt + ':00+07:00').toISOString() : null;
      if (
        (start === null) !== (end === null) ||
        (start && end && start >= end) ||
        (this.enabled && (!start || !this.items.length)) ||
        this.items.some(
          (i) => !i.bookCode.trim() || !Number.isSafeInteger(i.salePriceVnd) || i.salePriceVnd < 1,
        )
      )
        throw new Error();
    } catch {
      this.error.set('Kiểm tra thời gian và giá sale nguyên VND; đợt bật cần ít nhất một cuốn.');
      return;
    }
    this.busy.set(true);
    this.http
      .mutate<Campaign>('PUT', '/flash-sale', {
        version: this.campaign()!.version,
        enabled: this.enabled,
        startsAt: start,
        endsAt: end,
        items: this.items.map((i) => ({ ...i, bookCode: i.bookCode.trim().toUpperCase() })),
      })
      .subscribe({
        next: (c) => {
          this.accept(c);
          this.busy.set(false);
          this.notice.set('Đã lưu Flash Sale.');
        },
        error: (e: HttpErrorResponse) => {
          this.busy.set(false);
          const fields = e.error?.fieldErrors as Record<string, string[]> | undefined;
          this.error.set(
            e.status === 409
              ? 'Dữ liệu đã thay đổi. Nội dung đang sửa được giữ nguyên; tải lại để đối chiếu.'
              : e.status === 401
                ? 'Phiên hết hạn. Đăng nhập lại ở tab khác rồi lưu; nội dung đang sửa được giữ nguyên.'
                : fields
                  ? Object.values(fields).flat().join(' ')
                  : 'Chưa lưu được. Kiểm tra dữ liệu và thử lại.',
          );
        },
      });
  }
  canLeave() {
    return (
      !this.dirty ||
      typeof window === 'undefined' ||
      window.confirm('Flash Sale có thay đổi chưa lưu. Bỏ thay đổi?')
    );
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(e: BeforeUnloadEvent) {
    if (this.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }
}
