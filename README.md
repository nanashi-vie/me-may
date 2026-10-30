# Mẹ Mây — Sách ngoại văn cho bé

M3/M4 local được người dùng xác nhận test xong25/10/2026 và publish main. Trước M5 user chốt Cloudflare Workers cho Angular SSR, cung cấp Neon (V1–V5 migrate/validate PASS); user đã deploy Workers/Render27/10, online health/SSR/privacy/auth smoke đạt; M5 còn pilot/recovery/performance. Spring Boot4.1.1/Java21/Cloudinary giữ. User28/10 xác nhận publish21/21(20desktop+1mobile); casebiên/recovery/performance còn mở; chỉnh sửa bổ sung và importer sau MVP.

Hướng dẫn deploy Workers/Render và migration đã chuẩn bị trong [DEPLOYMENT](docs/DEPLOYMENT.md). Neon đã migrate/validate V1–V5; online28/10 đã có20cuốn public, detail3ảnh/OG đạt; xem [checklist M5 hiện hành](docs/VERIFICATION.md#m5-pilot-và-link-hỏi-sách--28102026).

Neon cho M5: `NEON_DATABASE_URL` trong root `.env` là pooled URL; `NEON_DATABASE_URL_UNPOOLED` dành direct URL cho Flyway; tooling hiện derive và validate cùng endpoint nếu chưa đặt. Giữ `DB_URL`/`TEST_DB_URL` local. Profile Render đọc các biến JDBC riêng từ file private được sinh; `run-local.sh` vẫn dùng DB local. Chi tiết trong [ARCHITECTURE](docs/ARCHITECTURE.md#điều-chỉnh-trước-m5--25102026).

Quy ước Git27/10: agent bàn giao trên `dev`; người dùng tự merge qua `main`.

## Chạy trên máy hiện tại

Yêu cầu: Java 21, Node 22.12 trở lên thuộc nhánh 22 (máy hiện tại 22.19), npm và container `my-postgres` đang chạy ở localhost:5432. Maven Wrapper được lưu trong backend.

Hai database riêng đã được tạo: `me_may_dev` cho ứng dụng và `me_may_test` cho integration tests. Role local `me_may_app` chỉ sở hữu hai database này. Không sử dụng database dự án khác.

Credential nằm trong `.env` tại root (Git ignored, mode 0600), gồm thông tin DB và `OWNER_EMAIL` / `OWNER_PASSWORD` (chỉ lệnh cấp owner dùng, không gửi vào runtime). Xem file local bằng editor khi cần đăng nhập; không gửi mật khẩu vào chat hoặc commit. `.env.example` chỉ là mẫu cho máy mới, không phải credential đang hoạt động.

Terminal 1, từ root repo:

```bash
bash code/backend/run-local.sh
```

Terminal 2:

```bash
cd code/frontend
npm ci
npm start
```

Mở [website local](http://127.0.0.1:4200) hoặc [đăng nhập quản trị](http://127.0.0.1:4200/admin/dang-nhap). API: `http://127.0.0.1:8080`; health: `/actuator/health`. Dùng cùng hostname `127.0.0.1` khi kiểm tra qua proxy; không trộn cookie từ localhost và 127.0.0.1.

Nếu npm10 gặp lỗi Arborist `edgesOut` khi cài dependency, dùng npm11 tạm thời, không cần đổi npm toàn hệ thống:

```bash
npm exec --yes --package=npm@11 -- npm ci
```

## Kiểm tra

```bash
# Root: integration tests + JAR, dùng me_may_test, không me_may_dev
bash code/backend/run-local.sh -B -ntp verify

# Trong code/frontend
npm test
npm run build
node scripts/check-ssr.mjs
npm audit
```

`check-ssr.mjs` cần frontend server đang chạy; kiểm tra HTML ban đầu của Home/Cách mua và HTTP 404. Để kiểm tra production SSR local, chạy `npm run serve:ssr:me-may-web` sau build, rồi dùng `node scripts/check-ssr.mjs http://127.0.0.1:4000`. Runtime SSR này phục vụ FE, không proxy API; kiểm tra đăng nhập local bằng `npm start` có proxy.

Trên môi trường sandbox hạn chế quyền localhost/worker, build SSR có thể cần chạy ngoài sandbox. Không đổi source chỉ để bỏ SSR khi gặp giới hạn môi trường.

## Nhập sách và pilot M2

- Đăng nhập Owner rồi mở [Quản lý sách](http://127.0.0.1:4200/admin/sach). Tạo tại `/admin/sach/moi`; lưu nháp trước để nhận mã tự sinh và thêm ảnh. Mã không sửa hoặc tái sử dụng; số có thể khuyết.
- Mỗi cuốn một thể loại, nhiều nhóm tuổi. Picture book chọn Paperback hoặc Hardcover. Mức đọc có thể chưa xác định; khi chọn mức phải ghi căn cứ nội bộ.
- OWNER nhập khoảng giá từ–đến nguyên VND, trọng lượng gram dương và tình trạng/lỗi; chọn/thả 2–6 ảnh thật (bìa/lưng bắt buộc; gáy/nội dung1–3 tùy chọn), JPEG/PNG <=10 MiB và 25 MP. Lưu nội dung trước khi chỉnh ảnh; ảnh được tải tuần tự theo version mới.
- Ảnh mới dùng phiên tạm24giờ; chưa sinh sách/mã trước khi xác nhận Đăng sách. Final nguyên tử và retry cùng payload trả cùng sách. STAFF chỉ đọc. Còn hàng/Hết hàng độc lập Công khai/Ẩn; ẩn↔hiện trực tiếp, không có Nháp.
- Staff chỉ sửa nháp; Owner quản trị trạng thái và bộ sưu tập. Không có UI quản lý tài khoản; không tạo tài khoản demo trong dữ liệu vận hành.
- Khi xung đột hoặc hết phiên, nội dung chưa lưu được giữ trong tab. Có đăng nhập lại ngay trên editor. Không tự gửi lại yêu cầu tạo nếu chưa rõ kết quả; mở danh sách ở tab khác để kiểm tra. Reload/đóng tab có thể mất nội dung chưa lưu.
- Pilot: chủ tự nhập 10–20 cuốn thật, dán/đối chiếu mã, kiểm giá/ảnh/tình trạng; thử tìm/sửa/preview/publish/sold/ẩn/khôi phục và ghi thời gian nhập/tìm/sửa cùng lỗi gặp phải. User28/10 đã xác nhận publish21/21; chưa có xác nhận đầy đủ case sold/error và thời gian nhập/tìm/sửa.

Cloudinary chỉ backend đọc `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`; `CLOUDINARY_NAMESPACE` mặc định `memay/dev`. Thiếu cấu hình vẫn nhập nháp được, thao tác media trả503. Ảnh dùng authenticated delivery, browser chỉ nhận stream qua API có session, không nhận signed cloud URL.

Contract API đầy đủ và quyền: [M2_SPEC §6–9](docs/M2_SPEC.md#6-quyền-và-lỗi). `/api/v1/admin/books` gồm list/create/detail/update, publication, preview, audit và2–6vai trò media; availability dẫn xuất từ tồn; taxonomy chỉ đọc, collection Owner create/update. ID là chuỗi; mutation gửi CSRF mới và version hiện hành. JSON admin/HTML admin/ảnh không cache; public API sách triển khai ở M3 (xem phần bên dưới).

Gate live opt-in: đặt namespace test trong môi trường sau khi nạp `.env` (run-local.sh nạp lại `.env`, nên không để namespace dev ghi đè lệnh test); chỉ chạy `MediaLiveTest,CloudinaryLiveTest` với `MEMAY_LIVE_MEDIA_TEST=true` và `CLOUDINARY_NAMESPACE=memay/test`. Guard `me_may_test` và namespace phải đạt trước upload/delete. Test mặc định không gọi cloud thật; cleanup chỉ public_id do gate tạo.

Trước migration/pilot, dùng `pg_dump -Fc` và quyền file 0600 ở thư mục ignored. Restore thử vào database scratch riêng, đối chiếu auth/audit/book/media references và cả `last_value/is_called` của sequence. Không restore đè dev/test hoặc reset mã từ MAX một cách mù quáng. Bằng chứng local tại [VERIFICATION](docs/VERIFICATION.md#m2--gate-kỹ-thuật-và-pilot).

## Frontend Workers local

Backend local8080 cần chạy như trên. Từ `code/frontend` (Node22.12+):

```bash
npm ci
npm run dev:workers
```

Mở [Workers local](http://127.0.0.1:8787). Lệnh build Angular SSR riêng
`dist/me-may-workers`, rồi chạy Wrangler/workerd local; sửa code cần chạy lại lệnh.
`npm start`4200 và `npm run build`/Node SSR cũ vẫn dùng riêng.

`wrangler.local.jsonc` chỉ có origin local8080/8787, asset binding và compatibility
flag `nodejs_compat`. `/api` được proxy cùng origin, giữ session/CSRF/upload và
no-store; SSR nhận origin qua request context. Không đặt DB/Neon/Cloudinary key
trong frontend. Root `.env` không được nạp; script tắt Wrangler dotenv loading.
Nếu cần override dùng `code/frontend/.dev.vars` (ignored), chỉ hai origin trên.
Không dùng config local để publish; chưa có domain/account/backend online.

Kiểm tra sau khi Worker đã chạy:

```bash
node scripts/check-ssr.mjs http://127.0.0.1:8787
npm run check:workers:proxy
```

Probe thứ hai tự chạy mock backend và workerd8788 (inspector9231), kiểm tra
body/multipart/cookie/CSRF/Set-Cookie/time/down503 rồi dừng, không dùng DB dev.
Tránh dùng các cổng8788/9231 khi probe chạy. Bằng chứng local không thay kiểm tra
Cloudflare thực tế về CPU/quota/cold-start/domain/TLS/cookie Secure.

## Auth/API M1

| Endpoint | Hành vi |
|---|---|
| GET `/api/v1/auth/csrf` | Lấy `{headerName, token}` để gửi header CSRF; `no-store` |
| POST `/api/v1/auth/login` | Form-urlencoded `username`, `password`, kèm CSRF; trả user DTO hoặc 401 |
| GET `/api/v1/auth/me` | User hiện tại; anonymous/expired trả 401 JSON |
| POST `/api/v1/auth/logout` | Lấy CSRF mới sau login rồi POST; trả 204, hủy session/cookie |
| GET `/api/v1/admin/access` | Kiểm tra OWNER/STAFF, không chứa dữ liệu sách |
| GET `/api/v1/admin/owner-access` | Kiểm tra OWNER; STAFF trả 403 |

Không có đăng ký công khai. Owner cố định được cấp bằng `python3 scripts/deploy/create_owner.py` cho Neon hoặc thêm `--target local` cho dev, hash BCrypt. Backend không tạo account khi startup; lệnh cấp không ghi đè password/nâng quyền hoặc tự tạo owner thứ hai. Không có user management UI ở M1; STAFF được kiểm chứng bằng fixture trong database test.

Session mặc định 30 phút không hoạt động, in-memory (restart backend phải đăng nhập lại). Cookie HttpOnly/SameSite=Lax, Secure chỉ tắt ở profile local để dùng HTTP. Mặc định ngoài profile local là Secure=true và không có startup bootstrap. Không có token quản trị trong localStorage hoặc Angular transfer cache.

## Cấu hình và ranh giới

- Chỉ backend đọc credential DB. Local URL trong Angular/proxy không chứa secret.
- Flyway là nguồn migration duy nhất: `code/backend/src/main/resources/db/migration`. Hibernate validate, không dùng ddl-auto update.
- Database dev/test phải tách riêng. Tests từ chối dọn fixture nếu current_database không phải me_may_test.
- Profile local được bật bởi run-local.sh; khi triển khai sau này cấu hình profile/secrets/domain/CSRF/CORS tương ứng, không dùng profile local trên Internet.
- Local dùng role sở hữu schema để phát triển; production cần tách role migration và role runtime, thêm login rate limit, backup/restore và deployment gates theo master plan.
- Canonical local `http://localhost:4200`; M3 có OG ảnh public theo sách. Cloudflare compatibility/SEO/OG crawler phải kiểm chứng riêng trên staging.
- SSR local chỉ bind `127.0.0.1`; host allowlist gồm `localhost` và `127.0.0.1`. Khi có domain staging, cấu hình allowlist và canonical theo domain thật; không dùng wildcard để bỏ SSRF protection.

## Bàn giao

Bắt đầu từ [chỉ mục tài liệu duy nhất](docs/README.md): đọc trạng thái/checkpoint mới nhất rồi chọn file hoặc mục theo đầu việc. Không cần đọc toàn bộ nhật ký và bộ tài liệu. Quy tắc làm việc nằm trong [AGENTS](AGENTS.md).

## M3 public và Flash Sale local

- Public: `/`, `/sach`, `/sach/:slug`, `/bo-suu-tap/:slug`, `/flash-sale`, `/cach-mua`, `/lien-he`, `/quan-tam`. Không cần tài khoản.
- API GET `/api/v1/books` có q/category/binding/age(repeated)/sort/page0-based,20 cuốn/trang; sort newest/price_asc/price_desc. Public chỉ PUBLISHED, gồm AVAILABLE/SOLD; không có lọc availability/giá/mức đọc.
- GET `/api/v1/books/{slug}`, `/books/{slug}/media/{FRONT|BACK|SPINE|INSIDE_1|INSIDE_2|INSIDE_3}`, `/taxonomy`, `/collections`, `/collections/{slug}`, `/home`, `/flash-sale`, `/contact`. API/HTML/media public no-store trongM3 local.
- OWNER mở `/admin/flash-sale`: một campaign bật/tắt, giờ Việt Nam UTC+7, mã sách+giá sale; tối đa50 cuốn. Giá gốc lấy giá tham khảo hiện tại; chỉ sách công khai/còn hàng/sale thấp hơn giá từ, giữ khoảng gốc và không % giảm trong [start,end). Campaign version/audit, STAFF không sửa. Không số đã bán/order.
- Link video optional; trường căn cứ đã bỏ qua migrationV4, audit lịch sử vẫn giữ. MigrationV5 thêm campaign mặc định tắt, không tạo sale thật tự động.
- Thêm `CONTACT_ZALO_HOTLINE_URL` và `CONTACT_ZALO_GROUP_URL` vào root`.env`, dùng HTTPS zalo.me; restart backend sau đổi. Thiếu cấu hình hiện đang cập nhật; dialog luôn có copy/thủ công, không tự gửi.
- SSR backend origin server-only `MEMAY_API_ORIGIN` mặc định http://127.0.0.1:8080; canonical/enquiry origin `MEMAY_SITE_ORIGIN` mặc định http://localhost:4200. M3 chỉ chốt local; cấu hình origin browser/deployment cần spike Cloudflare riêng trước phát hành.
- `npm run build` rồi `PORT=4000 npm run serve:ssr:me-may-web` (cwd code/frontend) để thử builtSSR và APIbridge local; `node code/frontend/scripts/check-ssr.mjs http://127.0.0.1:4000` (cwd root) kiểm HTML/OG/404/media/headers. Không coi localserver Node là phương án deploy lên VPS.

## Wishlist M4 local

- Bấm “Quan tâm” trên card/detail; header mở `/quan-tam` và badge tổng số cuốn. Tối đa100 mã lưu trong cùng browser qua `memay.wishlist.v1`; không lưu giá/ảnh. Storage lỗi hiện cảnh báo, tiếp tục dùng bộ nhớ. Xóa dữ liệu/ẩn danh có thể mất danh sách.
- Checkbox chọn các cuốn muốn hỏi, ban đầu chưa chọn; chọn tất cả chỉ còn hàng. SOLD cảnh báo/không chọn; mã ẩn/thiếu chỉ hiện “Không còn hiển thị”. Những cuốn chưa chọn vẫn được lưu.
- “Chuẩn bị nội dung hỏi mua” gọi GET `/api/v1/books/lookup?code=...&code=...` (1–100 mã,400 nếu sai/thiếu/quá nhiều), cập nhật giá và loại sold/hidden. Copy → mở Zalo → khách dán/gửi; luôn có textarea copy thủ công, không tự gửi/giữ sách/tạo đơn.
- Foreground/sale expiry/thay đổi tab khác làm mới trạng thái và vô hiệu hóa nội dung cũ; mất mạng không copy giá cũ. `/quan-tam` noindex/no-store, SSR không chứa dữ liệu đã lưu. Thiết bị thật/Zalo in-app vẫn cần nghiệm thu riêng.

## Nhập sách, tồn kho và biến thể (30/10/2026)

- Form mới: “Tiếng Anh” sửa được, hai ô giá phân nhóm nghìn ngay khi gõ; vẫn lưu số nguyên VND.
- Tình trạng mới “Độ mới cao”/“Có lỗi nhẹ”; grade/ngôn ngữ sách cũ được bảo toàn.
- Tồn mặc định1; “Thêm biến thể” để thêm tên/tồn riêng, tổng readonly. Dòng đã lưu không xóa,
  đặt0 khi hết; tổng0 thành hết hàng. Khoảng giá và bộ ảnh chung, không tải lại ảnh cho biến thể.
- Dropdown đổi vai trò ảnh; giữ chọn/thả file/thay/gỡ/retry. Chủ sửa tồn sau bán ngoài web.
- Detail cho chọn biến thể và đưa tên vào hỏi mua; wishlist vẫn theo sách, không giữ/trừ kho.
- Contract/validation tại [DATA](docs/DATA.md), [ARCHITECTURE](docs/ARCHITECTURE.md);
  rolloutV10 tại [DEPLOYMENT](docs/DEPLOYMENT.md#bổ-sung-rollout-tồn-khobiến-thể-v10-chưa-chạy-online).
  Chỉ triển khai local/test; chưa migrate hoặc deploy online, chưa chốtMVP.

## Đo hiệu năng nhập sách (QA)

`MEMAY_PERFORMANCE_ENABLED=true` bật timings backend chỉmetadata; mặcđịnhfalse.
Quy trình sanitizeHAR/summary ở [scripts/book-performance](scripts/book-performance/README.md),
contract/gateonline vàkếtquả5vòng ở [bằng chứng](docs/BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md).
Không dùng catalogue/ảnhbán thật để benchmarkghi hoặccleanup.
