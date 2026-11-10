import { HttpErrorResponse } from '@angular/common/http';
import { Status } from './attendance-api';

const ZONE = 'Asia/Ho_Chi_Minh';
const isoDay = new Intl.DateTimeFormat('sv-SE', { timeZone: ZONE, dateStyle: 'short' });
const dateTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone: ZONE, dateStyle: 'short', timeStyle: 'medium',
});
export const weekdays = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];

export const statusLabel: Record<Status, string> = {
  READY: 'Chưa vào ca', WORKING: 'Đang làm', NEEDS_REVIEW: 'Cần kiểm tra', COMPLETED: 'Hoàn tất',
};

export function today() {
  return isoDay.format(new Date());
}

export function addDays(day: string, days: number) {
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function monday(day: string) {
  const weekday = new Date(day + 'T00:00:00Z').getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

export function displayDay(day: string) {
  return day.split('-').reverse().join('/');
}

export function localInput(value: string) {
  return dateTime.format(new Date(value)).replace(' ', 'T');
}

export function closingTime(value: string) {
  const day = localInput(value).slice(0, 10);
  return Date.parse(day + 'T20:30:00+07:00');
}

export function displayTime(value: string | null) {
  if (!value) return '—';
  const [day, time] = localInput(value).split('T');
  return `${displayDay(day)} ${time}`;
}

export function errorCode(error: unknown): string | undefined {
  return error instanceof HttpErrorResponse ? error.error?.error : undefined;
}

export function errorMessage(error: unknown) {
  switch (errorCode(error)) {
    case 'incorrect_pin': return 'PIN không đúng. Vui lòng thử lại.';
    case 'pin_locked': return 'Đã nhập sai PIN nhiều lần. Vui lòng thử lại sau 5 phút.';
    case 'punch_expired': return 'Phiên chấm công đã hết hạn. Vui lòng chọn lại hồ sơ.';
    case 'shift_changed': return 'Trạng thái ca đã thay đổi. Vui lòng chọn lại hồ sơ.';
    case 'outside_schedule': return 'Hôm nay bạn chưa đăng ký lịch làm việc.';
    case 'inactive_employee': return 'Hồ sơ nhân viên đã ngừng hoạt động.';
    case 'past_week': return 'Lịch tuần đã qua chỉ được xem.';
    case 'employee_list_changed': return 'Danh sách nhân viên đã thay đổi. Vui lòng tải lại lịch.';
    case 'version_conflict': return 'Dữ liệu đã thay đổi. Tải lại trước khi lưu.';
    case 'validation_error': {
      const fields = (error as HttpErrorResponse).error.fieldErrors as Record<string, string[]> | undefined;
      return Object.values(fields ?? {}).flat()[0] ?? 'Vui lòng kiểm tra dữ liệu đã nhập.';
    }
    default: return 'Không thể thực hiện yêu cầu. Vui lòng thử lại.';
  }
}
