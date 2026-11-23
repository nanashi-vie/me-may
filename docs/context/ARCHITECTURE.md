# Mẹ Mây — kiến trúc và hạ tầng

Cập nhật12/11/2026 (phần media): Angular/Spring Boot modular monolith, Spring JDBC/Flyway,
Workers/homelab Dell qua Dokploy, ảnh LOCAL + Cloudinary legacy; Render/Neon là testhost cũ.
Giữ code/frontend và code/backend; các package minh họa chưa dùng không cần tạo. [CATALOGUE](../product/CATALOGUE.md) giữ API/quyền/
media quản trị; [DATA](DATA.md) giữ field; [PROGRESS](../PROGRESS.md) giữ việc còn mở.
Khảo sát source cũ và quyết định không tái sử dụng được giữ trong Git/DEV_LOG.

## Thành phần trong repository

| Nguồn | Trách nhiệm |
|---|---|
| `code/frontend/` | Angular public và admin chung ứng dụng. Entry Workers phục vụ HTML SSR, assets và proxy API. |
| `code/backend/` | Spring Boot modular monolith. Các package thực tế gồm auth, catalogue, listing, media, taxonomy, customer, order, attendance, promotion, cache, audit và common. |
| `code/backend/src/main/resources/db/migration/` | Migration Flyway theo phiên bản, từ auth V1 đến chế độ thanh toán khách trên đơn V37 tại mốc 18/11. |
| `code/image-worker/` | Worker xử lý ảnh, tạo biến thể theo recipe bằng Sharp. |
| `ops/images/` | Compose cho worker và origin Nginx nội bộ. |
| `scripts/` | Công cụ đo hiệu năng, vận hành và bàn giao theo từng đầu việc. |
| `docs/` | Đi từ [chỉ mục](../README.md) đến contract, runbook, bằng chứng và tiến độ. |

## Trách nhiệm và phụ thuộc

- Home lấy public catalogue/taxonomy; không đọc trực tiếp database hoặc API quản trị.
- Wishlist dùng mã công khai và storage adapter chỉ chạy ở browser; xác minh lại dữ liệu qua public API, không giữ snapshot làm nguồn giá cuối cùng.
- Admin dùng endpoint có session/CSRF; guard chỉ hỗ trợ UI, backend là nơi quyết định quyền.
- Media xử lý provider; catalogue/listing chỉ dùng định danh và metadata media cần thiết.
- Test đặt gần feature theo convention framework, test backend nằm trong src/test; tránh folder test cấp root rời ngữ cảnh khi chưa cần.
- Frontend component (chốt 02/11/2026): các page, layout và component nghiệp vụ có giao diện đáng kể dùng External Template (`templateUrl`) và gom vào thư mục con `<tên>/<tên>.{ts,html,scss,spec.ts}` (giữ tên ngắn Angular 20; feature chỉ có 1 page như `home/` hoặc `admin/flash-sale/` đặt trực tiếp trong thư mục feature). Chỉ tạo `.scss` khi cần style riêng ngoài utility/global CSS (`admin-layout`, `login`, `contact-page` không cần `.scss`). Inline Template chỉ dùng cho component trình bày/wrapper thực sự nhỏ (`overview`, `not-found`, `public-page`, `public-error`, `wishlist-button`).
- `database/` không chứa dump production/PII; `ops/` không chứa secret hoặc data volume. Mọi config mẫu chỉ có tên biến và giá trị demo an toàn.

## Hệ quả triển khai

### Chạy local, kiểm tra và Auth M1

Điều kiện, lệnh chạy và contract phiên ở [runbook local](../runbooks/LOCAL.md).

### Wishlist M4 local

- `WishlistStore`: Angular signals; localStorage `memay.wishlist.v1` là mảng mã duy nhất/thứ tự thêm, tối đa100. Mã canonical theo generator Java Long dương, tối thiểu6 chữ số, không ép đúng6. Không lưu snapshot tên/ảnh/giá, selection hoặc token. Init bằng afterNextRender; cleanup listener khi destroy.
- Storage parse lọc mã invalid/trùng/quá100 và warning; malformed JSON/root sai dùng danh sách rỗng có cảnh báo, không overwrite trước thao tác lưu mới. Storage unavailable/read/write lỗi chuyển sang memory-only giữ trạng thái đang có và cảnh báo. Event key đúng hoặc clear đọc lại latest; mutation reread latest trước ghi. Đồng bộ best-effort cùng origin, không transaction/CRDT; ghi tab đồng thời vẫn có thể last-write-wins.
- Public `GET /api/v1/books/lookup?code=...` repeated:1–100 tham số trước dedupe, validate canonical/Long, thiếu/sai/quá giới hạn400. Response `PublicBook[]` giữ thứ tự mã input sau dedupe, chỉ PUBLISHED gồm SOLD; mã thiếu/không public bị bỏ qua không phân biệt lý do. Parameterized JDBC tái sử dụng SELECT/FROM/mapper, giá sale/server clock M3, ACTIVE media. Không cần migration.
- `PublicApi.lookup(codes)` dùng omit credentials/no transfer cache, no-store và X-Memay-Server-Time hiện có. Empty local list không gọi lookup. Page dùng stream switchMap/takeUntilDestroyed; refresh và prepare cùng stream hủy request cũ; response chỉ nhận mã còn trong local list/request hiện tại.
- Revalidation lifecycle/selection/dialog theo DESIGN. Prepared text được tính từ dữ liệu đã xác minh, selection/codes hiện hành và PublicClock; expiry hoặc mã đã xóa làm text rỗng ngay, trước khi refresh hoàn tất. Chỉ copy sau thao tác riêng của khách; không tự gửi hoặc ghi availability.
- Route /quan-tam có SSR shell + X-Robots-Tag/meta noindex/no-store; sau browser render mới đọc storage. PUBLIC_SITE_ORIGIN qua TransferState M3 cung cấp URL canonical. Không thêm dependency, customer auth, order hoặc backend wishlist persistence.

Cloudflare build root là `code/frontend`; Spring build context `code/backend`. Đích backend hiện hành là Dell/Dokploy qua Tunnel; database/profile/revision live chưa xác minh. Không nhét database binary hoặc ảnh thật lớn vào repo. Dockerfile đã có; CI test/publish GHCR có trong repo, kích hoạt theo sự kiện nhắm main, xem [DEPLOYMENT — Git workflow](../runbooks/DEPLOYMENT.md#git-workflow).


## Hạ tầng triển khai

[Topology, nguồn xác nhận và giới hạn](INFRASTRUCTURE.md).

### Public M3 — contract đã triển khai

- Public GET `/api/v1/books?q&category&binding&age&sort&page`: page0-based/size20; ageOR + categoryAND; quy tắc binding hiện áp dụng mọi thể loại trừ Board book; ALL bỏ giới hạn; sort newest/price_asc/price_desc và IDdesc tie-break. Search literal theo mã hoặc tên, PUBLISHED-only gồm SOLD. Collections chỉ active; Home ưu tiên available. DTO không field nội bộ.
- GET `/books/{slug}`, `/books/{slug}/media/{FRONT|BACK|INSIDE}`, `/taxonomy`, `/collections`, `/collections/{slug}`, `/home`, `/contact`, `/flash-sale`. Media chỉ ACTIVE của PUBLISHED, no-store kể cả lỗi. Initial HTML public có metadata/canonical/OG, missing404, backend failure503; admin noindex/no-store.
- Flash Sale singleton id1/version0, startsAt/endsAt/items[{bookCode,salePriceVnd}], OWNER GET/PUT `/api/v1/admin/flash-sale`, version/audit. Original price từ listing; effective chỉ enabled/[start,end)/PUBLISHED/AVAILABLE/sale<reference. List/detail/sort/enquiry dùng cùng DBclock; response timestamp sync PublicClock, origin qua TransferState. Không sold counts. Tắt campaign sau sold vẫn được.
- V4 bỏ reading basis khỏi field/storage/audit mới, giữ audit lịch sử và optional HTTPS video; V5 thêm campaign mặc định tắt. Backup/fingerprint/migration bảo toàn sách/media/audit/sequence đã kiểm chứng. Không cần chạy lại hoặc reset dữ liệu vì user nghiệm thu.

### M3 local đã triển khai

Public AngularSSR đọc backend qua MEMAY_API_ORIGIN server-only; browser dùng relative /api, omit credentials và không HttpTransferCache. Built Node server có APIbridge phục vụ QA local, không thay phương án deploy Cloudflare. MEMAY_SITE_ORIGIN được chuyển bằng AngularTransferState để metadata/enquiry không đổi origin khi hydrate.

Public GET trả X-Memay-Server-Time theo database; PublicClock dùng cùng giờ cho giá/countdown/enquiry. Khi triển khai khác origin, phải expose header này qua CORS và xác minh HTML/cache/ảnh sau đổi trạng thái. Gate đó chưa đạt chỉ bằng localhost.

### Frontend Workers local — 26/10/2026

User chọn phạm vi frontend local trước. `src/server.worker.ts` dùng Angular21
AngularAppEngine Request/Response; config production,workers dùng experimentalPlatform
neutral, output riêng me-may-workers. Node Express/dev4200 giữ entry/output cũ.
Wrangler4.152.0/workerd local8787, compatibility date2026-10-26 + nodejs_compat;
chưa có cấu hình account/domain/deploy và chưa xác nhận Free CPU/quota thực tế.

assets binding run_worker_first=true, html_handling/not_found_handling=none;
Worker chỉ giao URL extension không phải HTML cho assets. HTML qua Angular, giữ
SSR/no-store/404; admin/quan-tam luôn noindex/nofollow/nosnippet, kể cả asset-like URL.
Không dùng SPA fallback/index.html để che server response.

MEMAY_API_ORIGIN/MEMAY_SITE_ORIGIN được validate HTTPS origin hoặc HTTP loopback;
Worker truyền đúng hai origin qua REQUEST_CONTEXT, provider factory mỗi render.
Không sửa process.env/global giữa requests. Browser chỉ nhận site origin qua
TransferState; backend origin/DB credentials không đưa vào HTML. Node vẫn fallback
env và default8080/4200 khi không có request context.

/api chỉ tới configured origin; giữ path/query/method/stream body, allowlist
accept/content-type/cookie/x-csrf-token. Redirect manual, timeout70s, status/body/
Set-Cookie/server-time được giữ và Cache-Control ép no-store; lỗi transport503
backend_unavailable. Spring tiếp tục quyết định auth/quyền/CSRF; không thêm auth mới.
Config local tách root.env/Neon; dev script tắt Wrangler dotenv auto-loading.
.dev.vars và .wrangler ignored ở root. Chỉ origin không secret được phép override.

Nguồn chính thức đối chiếu: [Angular non-Node SSR](https://angular.dev/guide/ssr#non-nodejs),
[Workers assets binding](https://developers.cloudflare.com/workers/static-assets/binding/).
Installed Angular builder schema21.2.27 xác nhận neutral platform còn experimental;
phải build/check runtime lại khi nâng Angular/Wrangler. Không cài framework adapter khác.

### Owner cố định — 27/10/2026

User hoãn auth sốđiệnthoại sauMVP. Giữ email/password/BCrypt12 và session/CSRF hiện có;
xóa OwnerBootstrap cùng config local/render, không migration thay schema. Operator
OwnerAccountCommand không là bean và chạy qua PropertiesLauncher riêng, JDBC direct,
prepared statements/transaction/advisorylock. Create-only khi chưa có owner; cùng
credential no-op, conflict/disabled/STAFF/owner khác fail closed, không reset/elevate.
Wrapper dùng OWNER_EMAIL/PASSWORD private, không argv; run-local unset ownersecret,
Render export loại toàn bộ owner/bootstrap fields. Lệnh local phải explicit và chỉ
loopback/me_may_dev. Cách chạy ở DEPLOYMENT; future auth không triển khai ở bước này.

### M5 media — triển khai local29/10
- Public media nhận allowlist size320/640 và formatjpg/webp; URL cũ mặc địnhJPEG640, chỉ JPEG640thiếuvariant mới fallback1280. WebP thiếuvariant không trảJPEG dưới MIMEWebP; cần backfill đủ4variant trước releasefrontendpicture. Adminpreview1280 giữ nguyên, tất cả vẫn authenticated/no-store, không lộsignedURL.
- Cache public được bổ sung 04/11 theo contract cuối file; URL ảnh cũ tiếp tục no-store.
  Backfill checkpoint public-variants-v2.done vẫn cần đủ4variant.

### M5 aggregate và media tạm — local29/10

- V6 đổi giá thành min/max, thêm weight_g và INSIDE→INSIDE_1; V7 thêm upload_session/temporary_media; V8 DRAFT→ARCHIVED; V9 thêm request_key/fingerprint ảnh tạm. Không sửa checksum V1–V5. Dữ liệu cũ giữ ID/asset/giá và published_at; nullweight không tựẩn.
- OWNER mọi ghi, STAFF đọc. Phiên24giờ, intent→provider ngoài transaction→READY; final khóa phiên/kiểm owner/expiry, attachmedia+tạoARCHIVED/PUBLISHED+audit+consume cùngtransaction. Cùngnormalizedpayload retry trảcùngbook; khác409. Cleanup cùngsessionlock, UPLOADING/ambiguous giữgrace1giờ.
- Reorder theo mediaID/version, tất cả mapping/audit nguyên tử. QueueclientID riêngserverID, uploadtuần tự, metadata lưu trước final; retry ảnh tạm dùngrequestKey/hash để không chiếm thêm slot khi mấtresponse.
- Public detail seed dữ liệu publicSSR trong TransferState riêng; luôn revalidate no-store, giữ DOM khi cùngslug, khóa contact đến dữliệumới. Admin/wishlist vẫn không transfercache. Logo WebP208; favicon dùng cùngasset.

## Tồn gộp và tương thích biến thể — contract06/11/2026

- V10/storage book_variant giữ UUID/tên/thứ tự và stock0..999999 từng dòng.
  Từ06/11 form mới gửi stock tổng; thuật toán/limit theo DATA, không xóa dòng.
- BookEntryInput tách HTTP extras/presence khỏi BookWrite canonical legacy;
  resolve note/grade/variants trước normalize. Không đổi byte shape import hash.
- V14 chỉ thêm unit_price_per_kg_vnd nullable, không UPDATE/drop dữ liệu cũ.
  Mapper quản trị thêm internalNote/stock/stockLimit/unitPricePerKgVnd;
  alias conditionNote/conditionGrade/variants vẫn đọc được trong admin.
- Update stock/U/note dùng aggregate version; no-op không tăng, audit failure
  rollback toàn bộ; concurrent request chỉ một bên ghi thành công, bên còn409.
- Final fingerprint mới thêm đơn giá khi có field; canonical stock trước sinhUUID.
  Legacy final hash vẫn giữ nguyên; retry không nhân sách/tồn/media.
- Media response chỉ adopt version khi mọi field còn lại (gồm field mới) giữ
  nguyên. Không tự merge một cập nhật tồn/giá/note khác.
- Public list/detail/home/related/lookup trả grade/note null, variants=[]; không
  query nội dung riêng hoặc nhóm tồn. Preview không chứa note hoặc nhóm tồn.
- PATCH availability legacy409/STAFF403; public dùng availability đã đồng bộ,
  publication độc lập. Liên hệ/wishlist không mutation kho hoặc chọn biến thể.
- Lookup title-duplicate admin SELECT EXISTS với bind params, không dùng public
  list/paging. Không thêm unique title; form cảnh báo nonblocking, hủy stale request.
- Giá/kg frontend dùng BigInt; server chỉ kiểm và lưu giá cuối. Load/handoff/
  upload không chạy lại công thức. Contract U/note optional theo DATA/CATALOGUE.

## Hiệu năng nhập và xuất bản —30/10

- Admin persisted/temporary media nhận `?size=320|1280`, mặc định1280;
  JPEG320 dùng eager hiện có. Fallback1280 chỉ khi provider báo thiếuvariant;
  auth/no-store/nosniff/MIME/khôngredirect giữ nguyên, không lộ signedURL.
- Eager vẫn5bản đồng bộ. Queue mộtdecode, mộtpreparedlookahead, uploadserial;
  edit giữ chuỗi version/idempotency. Không chạy provider khi giữ transactionlock.
- Finalcreate giữentities để gắnmedia, mapdetail1lần rồi immutablecopy publication;
 9DBexecutions được bỏ trong workloadQA, auditCREATE/PUBLISHED vàretry giữ nguyên.
- Taxonomy/collections cachememory60s/dedupe; invalidation theo auth epoch,
  collectionswrite vàmanualrefresh. Lỗi khôngcache, stale response/replay bịchặn.
  POSTdetail handoff10s/single-use/đúngID+epoch, khônghistory/localStorage;
  deep-link/refresh luônGETserver. Audit chỉfetch khi mở, versionđổi đánhdấustale.
- `MEMAY_PERFORMANCE_ENABLED` defaultfalse: request/phase/counters metadata-only;
  datasource proxy đo acquisition/execution, transaction đượcđo ngoài proxy để
  gồmcommit. Không gọi đó là exactlockwait hoặc thời gianNeon riêng.
  Asyncstream dùngcapturedtrace; terminalstreamerror không bịHTTP200 hạthànhok.
- Bằngchứng vàgiớihạn: [hiệu năng nhập sách](../verification/BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md).

## Import CSV/XLSX —31/10

[BOOK_IMPORT](../product/BOOK_IMPORT.md#api-và-lưu-trữ) là nguồn API/schemaV11/retry/quota hiện hành;
[DATA](DATA.md#format-file-import--contract-duyệt31102026) giữV4/8cột mặc định,
V3/7cột,V2/16cột,V1/20cột tương thích. Parser bounded, canonicalSHA256 theo schema;
V2–V4 không gộp dòng giốngnhau; một transaction tạo ARCHIVED/variants/audit/receipt,
không Cloudinary. V3/V4 cho null giá; V4 có unit thì tính BigInteger trong validator.
ImportGroup mang unit ngoài BookWrite qua resolve/create/audit; digest4 chứa unit,
V1–V3 canonical giữ nguyên. Schema DB đã hỗ trợ unit/null giá, publish kiểm đủ giá/ảnh.
Tái sử dụng aggregate/validation/editor/publish; private no-store và OWNER/CSRF.
[Kiểm chứng](../verification/BOOK_IMPORT_VERIFICATION.md) gồm rollback100sách, mất phản hồi và giới hạn host.

### Thể loại bổ sung01/11

V12 append READING_PRACTICE và COOKING_CRAFT_ACTIVITY, giữcategoryID/slug/sort cũ;
form/taxonomy public/admin đọcDB, publicURLallowlist và importer nhận2code mới.
Giới hạn/thứtự/nhãn ở DATA; rolloutbackend trướcfrontend và gate ở DEPLOYMENT.


## Cache public và giảm request — 04/11/2026

- Worker Cache API lưu HTML GET / không query và ảnh có cacheKey hợp lệ tối đa30s.
  Cookie/Authorization, admin/wishlist, API JSON, lỗi và Set-Cookie không cache.
  Browser HTML no-store; ảnh browser revalidate bằng ETag, edge giữ bytes.
- Backend /api/v1/cache-policy chỉ bật cache khi có cấu hình purge. Deadline lấy
  giờ database và mốc sale sắp tới, trừ thời gian chờ policy/render trước khi lưu.
  Cache key HTML chứa Worker version metadata; deploy tránh HTML/bundle cũ.
- Audit BOOK/COLLECTION/FLASH_SALE/media đánh dấu sau commit, rollback không purge.
  Job coalesce, tối đa một purge toàn zone mỗi12s; lỗi giữ pending để retry.
  Startup backend cũng yêu cầu purge. Một instance homelab là phạm vi hiện tại.
- Purge là eventual. Dữ liệu cũ có thể còn tối đa30s, kể cả fill đang chạy trong
  lúc purge. Browser ảnh revalidate thay vì giữ immutable sau khi sách bị ẩn.
  API detail/lookup/contact verification vẫn fresh, không dựa cache HTML.
- Media DTO dùng asset ID cho Cloudinary và generation cho LOCAL. Cloudinary
  giữ URL cũ. LOCAL trả URL mặc định kèm version và các variant sẵn có.
  Sai version, ảnh không ACTIVE, sách ẩn hoặc bị đưa vào thùng rác trả 404
  khi tới backend. Storage key và signed URL chỉ dùng bên trong gateway.
- CSS/JS root có hash và200 cache1năm immutable. Asset lỗi/unhashed không đổi policy.
- Angular metadata taxonomy/collections/contact chia sẻ request và TTL60s theo
  instance DI, xóa sau admin mutate. Home/listing/metadata SSR transfer body và giờ
  server một lần; không bật transfer cho lookup/detail verification hoặc sale.
  Sale vẫn lấy giờ mới; metadata replay không chỉnh đồng hồ ngược mỗi lần đọc.
- CDN cache chỉ bật trong production config; local/preview mặc định không bật.
  Thiết lập và smoke online nằm DEPLOYMENT. Chưa có đo cải thiện sau deploy.

## Hệ ảnh hiện hành — cập nhật12/11/2026

Theo quyết định08–11/11, LOCAL nhận upload mới qua worker Sharp/SSD/Nginx
nội bộ; Cloudinary giữ ảnh cũ. Backend sở hữu nguồn Drive, queue/lease,
generation và gate publication. [IMAGES](../product/IMAGES.md) giữ toàn bộ contract;
[runbook](../runbooks/IMAGE_OPERATIONS.md) giữ cấu hình/lệnh, [kiểm chứng](../verification/IMAGE_VERIFICATION.md)
giữ bằng chứng và tiêu chí. Không dùng mô tả adapter cloud legacy làm
contract duy nhất cho LOCAL; quyết định cũ về visibility đã được V24 thay thế.

## Media/save/features —06/11/2026

V15 mở rộng2internal roles và feature catalogue/mapping; giữ Angular/Spring/JDBC,
không dependency mới. Aggregate PUT gộp content/mediaMetadata/features/publication
trong transaction/version/audit; public features SQL aggregate không thêm per-book
query. Contract/bảo mật/idempotency ở [CATALOGUE](../product/CATALOGUE.md), UX ở DESIGN,
rollout/rollbackV15 ở [BOOK_ENTRY_ROLLOUT](../runbooks/BOOK_ENTRY_ROLLOUT.md).

## Module customer —12/11/2026

`vn.memay.customer` dùng Spring JDBC/FlywayV32, không thêm entity JPA/dependency.
Service transaction khóa row/version và actor OWNER còn active; metadata audit
cùng transaction, không PII. API `/api/v1/admin/customers` dùng chain session/
CSRF hiện có. Frontend customer dùng AdminHttp, không session cache/TransferState;
admin SSR Client/no-store/noindex. Hủy stream/request cũ khi đổi query/session
hoặc mở form mới; dirty guard đóng editor khi chấp nhận rời route tái sử dụng.
Contract/rollout ở [CUSTOMERS](../product/CUSTOMERS.md),
[bằng chứng](../verification/CUSTOMER_VERIFICATION.md). Không có customer login hoặc order.

## Theme public và switch sáng/tối — cập nhật23/11/2026

- PublicLayout sở hữu data-theme/light/dark; token ở _public-theme.scss,
  không ghi theme lên html/body nên admin không kế thừa. Storage đọc sau render.
- ThemeSwitch là button role=switch/aria-checked, hình vẽ CSS + SVG inline
  (Uiverse jolly-chicken-91, MIT, credit ở đầu file). Không dependency, không
  lazy chunk/WASM/canvas; có ngay trong HTML SSR.
- 23/11 gỡ @rive-app/canvas-lite, theme-rive.ts, /rive/day-night.riv và bước
  copy WASM trong angular.json (trước đó ≈420KB gzip tải sau window load/idle).
- Reduced motion tắt animation/transition. Bằng chứng ở
  [THEME_VERIFICATION](../verification/THEME_VERIFICATION.md).


## Đơn nội bộ — triển khai17/11

`vn.memay.order` Spring JDBC dùng transaction command/receipt/version/audit,
khóa order rồi book IDs tăng dần qua BookStockService; không gọi carrier/payment API.
Angular owner-only routes và AdminHttp no-store/CSRF; form retry cùng payload/key,
sau mutation đọc detail thật, refresh guard route/version và rebase form khi409.
Schema/API/quyền/flow: [ORDERS](../product/ORDERS.md); kiểm tra: [ORDER_VERIFICATION](../verification/ORDER_VERIFICATION.md).
Không tự migrate/deploy live; rollout/backup/restore theo DEPLOYMENT.
