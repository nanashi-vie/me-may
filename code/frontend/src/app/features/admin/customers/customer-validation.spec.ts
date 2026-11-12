import { normalizeCustomer, normalizePhone, validateCustomer } from './customer-validation';
const body = {
  fullName: ' Lan ',
  phone: null,
  defaultAddress: null,
  zaloName: 'Lan Nguyễn',
  tiktokId: null,
  threadsId: ' @Lan.Books ',
  note: null,
};
describe('Customer validation', () => {
  it('normalizes names and optional phone without changing handles', () => {
    expect(normalizePhone('+84 987-123.456')).toBe('0987123456');
    expect(normalizeCustomer({ ...body, note: '  ' })).toEqual({
      ...body,
      fullName: 'Lan',
      threadsId: '@Lan.Books',
      note: null,
    });
  });
  it('rejects URL handles and invalid phone while preserving valid dotted names', () => {
    for (const threadsId of [
      'https://threads.com/@lan',
      'HTTP://foo',
      'www.foo.com',
      'zalo.me/123',
      'tiktok.com/@lan',
      'threads.net/@lan',
      'threads.com',
      '//www.tiktok.com/@lan',
      '//threads.net/@lan',
    ])
      expect(validateCustomer({ ...body, threadsId })['threadsId']).toBeDefined();
    expect(validateCustomer(body)).toEqual({});
    for (const phone of ['123', '098712345a', '0287123456', '+849871234567', '0987/123456'])
      expect(validateCustomer({ ...body, phone })['phone']).toBeDefined();
  });
  it('enforces required names and every length boundary', () => {
    expect(validateCustomer({ ...body, fullName: ' ' })['fullName']).toBeDefined();
    for (const [key, max] of [
      ['fullName', 150],
      ['zaloName', 150],
      ['tiktokId', 100],
      ['threadsId', 100],
      ['defaultAddress', 500],
      ['note', 1000],
    ] as const) {
      expect(validateCustomer({ ...body, [key]: 'x'.repeat(max) })[key]).toBeUndefined();
      expect(validateCustomer({ ...body, [key]: 'x'.repeat(max + 1) })[key]).toBeDefined();
    }
  });
});
