import assert from 'node:assert/strict';

const origin = process.argv[2] ?? process.env.SSR_ORIGIN ?? 'http://127.0.0.1:4200';
for (const [path, title, heading] of [
  ['/', 'Mẹ Mây — Sách ngoại văn cho bé', 'Mỗi cuốn sách, một lần khám phá mới.'],
  ['/cach-mua', 'Cách hỏi mua sách | Mẹ Mây', 'Chọn sách và nhắn tiệm'],
]) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(html.includes(`<title>${title}</title>`), `Initial HTML title missing: ${path}`);
  assert.ok(html.includes(heading), `Initial HTML content missing: ${path}`);
  assert.ok(
    /<meta[^>]+name="description"[^>]+content="[^"]+"/.test(html),
    `Description missing: ${path}`,
  );
  assert.ok(html.includes('property="og:title"'), `OG title missing: ${path}`);
  assert.ok(html.includes('rel="canonical"'), `Canonical missing: ${path}`);
  console.log(`PASS initial HTML: ${path}`);
}
const missing = await fetch(new URL('/this-page-does-not-exist', origin));
assert.equal(missing.status, 404, 'Unknown page must return a real HTTP 404');
assert.ok((await missing.text()).includes('Không tìm thấy trang'));
console.log('PASS unknown route: HTTP 404');

for (const path of ['/admin/dang-nhap', '/admin/sach', '/admin/sach/1/xem-truoc']) {
  const response = await fetch(new URL(path, origin));
  assert.match(
    response.headers.get('x-robots-tag') ?? '',
    /noindex/,
    `Admin HTML must be noindex: ${path}`,
  );
  assert.match(
    response.headers.get('cache-control') ?? '',
    /no-store/,
    `Admin HTML must not be cached: ${path}`,
  );
  console.log(`PASS admin HTML privacy headers: ${path}`);
}
