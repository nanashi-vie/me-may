import { CustomerWrite } from './customer-models';
const limits: Record<keyof CustomerWrite, number> = {
  fullName: 150,
  phone: 20,
  defaultAddress: 500,
  zaloName: 150,
  tiktokId: 100,
  threadsId: 100,
  note: 1000,
};
const link =
  /^(?:[a-z][a-z0-9+.-]*:\/\/|\/\/|www\.|(?:[a-z0-9-]+\.)*(?:zalo\.me|zalo\.com|tiktok\.com|threads\.net|threads\.com)(?:[/:?#]|$))/i;
export function normalizePhone(value: string | null): string | null {
  let phone = value?.replace(/[\s.\-]/g, '') || null;
  if (phone?.startsWith('+84')) phone = '0' + phone.slice(3);
  return phone;
}
export function normalizeCustomer(body: CustomerWrite): CustomerWrite {
  const result = { ...body };
  for (const key of [
    'phone',
    'defaultAddress',
    'zaloName',
    'tiktokId',
    'threadsId',
    'note',
  ] as const)
    result[key] = body[key]?.trim() || null;
  result.fullName = body.fullName.trim();
  result.phone = normalizePhone(body.phone);
  return result;
}
export function validateCustomer(body: CustomerWrite): Record<string, string[]> {
  const w = normalizeCustomer(body),
    errors: Record<string, string[]> = {};
  for (const key of Object.keys(limits) as (keyof CustomerWrite)[])
    if ([...(w[key] || '')].length > limits[key]) errors[key] = [`Tối đa ${limits[key]} ký tự`];
  if (!w.fullName) errors['fullName'] = ['Vui lòng nhập tên khách hàng'];
  if (w.phone && !/^0[35789][0-9]{8}$/.test(w.phone))
    errors['phone'] = ['Số di động Việt Nam không hợp lệ'];
  for (const key of ['zaloName', 'tiktokId', 'threadsId'] as const)
    if (w[key] && link.test(w[key])) errors[key] = ['Chỉ nhập tên tài khoản, không nhập đường dẫn'];
  return errors;
}
