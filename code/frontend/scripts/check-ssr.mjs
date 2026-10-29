import assert from 'node:assert/strict';

const origin = process.argv[2] ?? process.env.SSR_ORIGIN ?? 'http://127.0.0.1:4200';
for (const [path, title, heading] of [
  ['/', 'Mẹ Mây — Sách ngoại văn cho bé', 'Khám phá thế giới lớn.'],
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

const wishlist = await fetch(new URL('/quan-tam', origin));
assert.equal(wishlist.status, 200);
assert.match(wishlist.headers.get('x-robots-tag') ?? '', /noindex/);
assert.match(wishlist.headers.get('cache-control') ?? '', /no-store/);
const wishlistHtml = await wishlist.text();
assert.ok(wishlistHtml.includes('<title>Danh sách quan tâm | Mẹ Mây</title>'));
assert.ok(wishlistHtml.includes('Đang mở danh sách trên thiết bị'));
assert.ok(
  !/<span[^>]*aria-label="Số cuốn đã lưu"(?![^>]*visibility:\s*hidden)[^>]*>/.test(wishlistHtml),
  'SSR must not pretend to know the device count',
);
assert.ok(!/MM-\d{6,}/.test(wishlistHtml), 'SSR wishlist must not contain saved book data');
console.log('PASS wishlist private SSR shell/noindex/no-store');

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

const booksResponse = await fetch(new URL('/api/v1/books', origin));
assert.equal(booksResponse.status, 200);
assert.match(booksResponse.headers.get('cache-control') ?? '', /no-store/);
const books = await booksResponse.json();
for (const path of ['/sach', '/flash-sale', '/lien-he']) {
  const r = await fetch(new URL(path, origin));
  assert.equal(r.status, 200, path);
  assert.match(r.headers.get('cache-control') ?? '', /no-store/);
  const h = await r.text();
  assert.match(h, /<h1[ >]/, path);
  assert.ok(
    !/<meta[^>]+name="robots"[^>]+content="noindex/.test(h),
    'Public page must remain indexable: ' + path,
  );
}
if (books.items.length) {
  const b = books.items[0];
  const r = await fetch(new URL('/sach/' + b.slug, origin));
  assert.equal(r.status, 200);
  assert.match(r.headers.get('cache-control') ?? '', /no-store/);
  const h = await r.text();
  assert.ok(h.includes(b.bookCode));
  assert.ok(h.includes('property="og:image"'));
  assert.ok(h.includes('Giá sẽ thay đổi dựa vào tình trạng sách cụ thể.'));
  assert.ok(!h.includes('readingLevelBasis'));
  console.log('PASS real published detail HTML/OG');
  const image = await fetch(new URL(b.media[0].contentPath, origin));
  assert.equal(image.status, 200);
  assert.match(image.headers.get('cache-control') ?? '', /no-store/);
  assert.match(image.headers.get('content-type') ?? '', /image\/jpeg/);
  console.log('PASS public image delivery');
  assert.ok(!JSON.stringify(b).includes('sourceRef'), 'Public DTO must not expose source metadata');
  assert.ok(b.media.length >= 2 && b.media.length <= 6);
  for (const width of [320, 640]) for (const format of ['jpg', 'webp']) {
    const url = new URL(b.media[0].contentPath, origin);
    url.searchParams.set('size', String(width)); url.searchParams.set('format', format);
    const variant = await fetch(url);
    assert.equal(variant.status, 200, url.pathname + url.search);
    assert.match(variant.headers.get('cache-control') ?? '', /no-store/);
    const bytes = Buffer.from(await variant.arrayBuffer());
    assert.match(variant.headers.get('content-type') ?? '', format === 'jpg' ? /image\/jpeg/ : /image\/webp/);
    if (format === 'jpg') assert.equal(bytes.subarray(0,3).toString('hex'), 'ffd8ff');
    else { assert.equal(bytes.subarray(0,4).toString(), 'RIFF'); assert.equal(bytes.subarray(8,12).toString(), 'WEBP'); }
  }
  console.log('PASS M5 four media variants/MIME/magic/no-store/2–6 photos/private metadata');
}
for (const path of ['/sach/not-a-book', '/bo-suu-tap/not-a-collection']) {
  const r = await fetch(new URL(path, origin));
  assert.equal(r.status, 404, path);
  assert.match(r.headers.get('cache-control') ?? '', /no-store/);
}
console.log('PASS M3 public HTML/API/media no-store and missing book/collection404');
