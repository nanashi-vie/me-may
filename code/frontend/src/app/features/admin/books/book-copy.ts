export const PRICE_NOTE = 'Giá sẽ thay đổi dựa vào tình trạng sách cụ thể.';
export const READING_NOTE =
  'Trình độ đọc là gợi ý của tiệm, không phải chứng nhận Cambridge cho sách.';
export const PUBLICATION_LABELS = { DRAFT: 'Nháp', PUBLISHED: 'Công khai', ARCHIVED: 'Ẩn' };
export const AVAILABILITY_LABELS = { AVAILABLE: 'Còn hàng', SOLD: 'Hết hàng' };
export const AGE_LABELS = { AGE_0_3: '0–3', AGE_4_6: '4–6', AGE_7_9: '7–9', AGE_10_PLUS: '10+' };
export const READING_LABELS = {
  PRE_A1: 'Starters · Pre A1',
  A1: 'Movers · A1',
  A2: 'Flyers / Key · A2',
  B1: 'Preliminary · B1',
  B2: 'First · B2',
  C1: 'Advanced · C1',
  C2: 'Proficiency · C2',
};

const vndFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
export function formatPrice(value: number | null): string {
  return value === null ? '—' : vndFormat.format(value) + ' VNĐ';
}

export const MEDIA_ROLES = ['FRONT','BACK','SPINE','INSIDE_1','INSIDE_2','INSIDE_3'] as const;
export const MEDIA_LABELS = { FRONT:'Bìa', BACK:'Lưng', SPINE:'Gáy', INSIDE_1:'Nội dung 1', INSIDE_2:'Nội dung 2', INSIDE_3:'Nội dung 3' };
export function formatPriceRange(min: number | null, max: number | null): string {
  if (min === null || max === null) return '—';
  return (min === max ? vndFormat.format(min) : vndFormat.format(min) + ' - ' + vndFormat.format(max)) + ' VNĐ';
}
