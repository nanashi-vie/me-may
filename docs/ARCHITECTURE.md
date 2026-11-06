# Mẹ Mây — kiến trúc và hạ tầng

Cập nhật05/11/2026: Angular/Spring Boot modular monolith, Spring JDBC/Flyway,
Workers/homelab Dell qua Dokploy và Cloudinary; Render/Neon là testhost cũ.
Giữ code/frontend và code/backend; các package minh họa chưa dùng không cần tạo. [CATALOGUE](CATALOGUE.md) giữ API/quyền/
media quản trị; [DATA](DATA.md) giữ field; [PROGRESS](PROGRESS.md) giữ việc còn mở.
Khảo sát source cũ và quyết định không tái sử dụng được giữ trong Git/DEV_LOG.

## Layout dự kiến

```text
me-may/
├── AGENTS.md
├── .agents/                      # Skill local, Git ignored
├── code/
│   ├── frontend/                 # Một Angular app
│   │   ├── public/               # Logo/font/icon được phép dùng, không phải ảnh kho sách
│   │   └── src/app/
│   │       ├── app.config.ts
│   │       ├── app.routes.ts
│   │       ├── core/             # HTTP config, session/CSRF, SEO, browser storage adapter
│   │       ├── layouts/          # public-layout/, admin-layout/ (External Template)
│   │       └── features/
│   │           ├── home/         # home-page.{ts,html,scss}
│   │           ├── catalogue/    # catalogue-page/, book-detail/, book-card/, contact-dialog/, flash-sale-page/ + state/API/models
│   │           ├── wishlist/     # wishlist-page/ + wishlist-button (inline) + wishlist-store
│   │           ├── information/  # contact-page/ + not-found/public-page (inline)
│   │           └── admin/        # login/, flash-sale/, collections/collection-list/, books/<component>/ + services/models
│   └── backend/
│       ├── pom.xml
│       ├── run-local.sh          # Chạy backend local; Dockerfile Render đã có
│       └── src/
│           ├── main/java/vn/memay/
│           │   ├── catalogue/   # BookCopy, public catalogue; controller/service/repository/DTO
│           │   ├── listing/     # publication/price
│           │   ├── media/       # Cloudinary adapter + media lifecycle
│           │   ├── taxonomy/    # nhóm/collection
│           │   ├── auth/        # session, OWNER/STAFF
│           │   ├── audit/
│           │   ├── contact/     # contact configuration
│           │   └── common/      # config/error primitives dùng thật, không generic framework
│           ├── main/resources/db/migration/  # Nguồn Flyway duy nhất
│           └── test/            # test theo domain tương ứng
├── database/                     # ERD, fixture/import được duyệt; không nhân đôi Flyway SQL
├── ops/                          # Chỉ tạo khi có nhu cầu; tooling deploy ở scripts/deploy
└── docs/                         # Tên cố định, ghi đè bản hiện hành
    ├── README.md                 # Mục lục và quy tắc tài liệu
    ├── MASTER_PLAN.md
    ├── DESIGN.md
    ├── DATA.md
    ├── ARCHITECTURE.md
    ├── VERIFICATION.md
    ├── PROGRESS.md
    ├── DEV_LOG.md
    ├── assets/                   # Ảnh tham khảo và wireframe
    └── fixtures/                 # Dữ liệu minh họa có nhãn
```

Package thực tế ở M1 là `vn.memay`; các domain chưa dùng trong sơ đồ không phải module đã triển khai. Không tạo các file/thư mục trống chỉ để giống sơ đồ. Không thêm Nx, Maven multi-module, NgRx hoặc module “AI/order/email” khi chưa dùng.

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

- Yêu cầu local: Java 21, Node 22.12+ (nhánh 22), npm và container PostgreSQL local (`localhost:5432`) với hai database tách biệt `me_may_dev` (ứng dụng) và `me_may_test` (integration test, role `me_may_app`). Credential đặt tại root `.env` (`0600`, Git ignored; mẫu ở `.env.example`).
- Chạy backend local (từ root): `bash code/backend/run-local.sh` (`http://127.0.0.1:8080`, health `/actuator/health`). Integration test + JAR: `bash code/backend/run-local.sh -B -ntp verify` (chỉ chạy trên `me_may_test`).
- Chạy frontend dev/test (từ `code/frontend`): `npm ci && npm start` (`http://127.0.0.1:4200`, giữ cùng hostname `127.0.0.1` cho cookie session), `npm test`, `npm run build`, `npm audit`. Node SSR local: `PORT=4000 npm run serve:ssr:me-may-web` rồi `node scripts/check-ssr.mjs http://127.0.0.1:4000`.
- Workers local (từ `code/frontend`): `npm run dev:workers` (`http://127.0.0.1:8787`, dùng `wrangler.local.jsonc`), kiểm bằng `node scripts/check-ssr.mjs http://127.0.0.1:8787` và `npm run check:workers:proxy` (probe workerd `8788`/`9231`, mock backend).
- Gate media live opt-in: chỉ chạy `MediaLiveTest,CloudinaryLiveTest` khi đặt `MEMAY_LIVE_MEDIA_TEST=true` và `CLOUDINARY_NAMESPACE=memay/test` trên `me_may_test`.
- Auth/API M1 (session in-memory 30 phút, cookie `HttpOnly`/`SameSite=Lax`, `Secure=true` ngoài profile local; cấp owner bằng `python3 scripts/deploy/create_owner.py` hoặc `--target local`):
  - `GET /api/v1/auth/csrf` (`{headerName, token}`, `no-store`)
  - `POST /api/v1/auth/login` (form-urlencoded `username`, `password` + CSRF → user DTO hoặc `401`)
  - `GET /api/v1/auth/me` (user hiện tại hoặc `401` JSON)
  - `POST /api/v1/auth/logout` (CSRF mới sau login → `204`, hủy session/cookie)
  - `GET /api/v1/admin/access` (kiểm tra `OWNER`/`STAFF`) và `GET /api/v1/admin/owner-access` (chỉ `OWNER`, `STAFF` trả `403`)

### Wishlist M4 local

- `WishlistStore`: Angular signals; localStorage `memay.wishlist.v1` là mảng mã duy nhất/thứ tự thêm, tối đa100. Mã canonical theo generator Java Long dương, tối thiểu6 chữ số, không ép đúng6. Không lưu snapshot tên/ảnh/giá, selection hoặc token. Init bằng afterNextRender; cleanup listener khi destroy.
- Storage parse lọc mã invalid/trùng/quá100 và warning; malformed JSON/root sai dùng danh sách rỗng có cảnh báo, không overwrite trước thao tác lưu mới. Storage unavailable/read/write lỗi chuyển sang memory-only giữ trạng thái đang có và cảnh báo. Event key đúng hoặc clear đọc lại latest; mutation reread latest trước ghi. Đồng bộ best-effort cùng origin, không transaction/CRDT; ghi tab đồng thời vẫn có thể last-write-wins.
- Public `GET /api/v1/books/lookup?code=...` repeated:1–100 tham số trước dedupe, validate canonical/Long, thiếu/sai/quá giới hạn400. Response `PublicBook[]` giữ thứ tự mã input sau dedupe, chỉ PUBLISHED gồm SOLD; mã thiếu/không public bị bỏ qua không phân biệt lý do. Parameterized JDBC tái sử dụng SELECT/FROM/mapper, giá sale/server clock M3, ACTIVE media. Không cần migration.
- `PublicApi.lookup(codes)` dùng omit credentials/no transfer cache, no-store và X-Memay-Server-Time hiện có. Empty local list không gọi lookup. Page dùng stream switchMap/takeUntilDestroyed; refresh và prepare cùng stream hủy request cũ; response chỉ nhận mã còn trong local list/request hiện tại.
- Revalidation lifecycle/selection/dialog theo DESIGN. Prepared text được tính từ dữ liệu đã xác minh, selection/codes hiện hành và PublicClock; expiry hoặc mã đã xóa làm text rỗng ngay, trước khi refresh hoàn tất. Chỉ copy sau thao tác riêng của khách; không tự gửi hoặc ghi availability.
- Route /quan-tam có SSR shell + X-Robots-Tag/meta noindex/no-store; sau browser render mới đọc storage. PUBLIC_SITE_ORIGIN qua TransferState M3 cung cấp URL canonical. Không thêm dependency, customer auth, order hoặc backend wishlist persistence.

Cloudflare build root là `code/frontend`; Spring build context `code/backend`. Đích backend hiện hành là Dell/Dokploy qua Tunnel; database/profile/revision live chưa xác minh. Không nhét database binary hoặc ảnh thật lớn vào repo. Dockerfile đã có; CI test/publish GHCR chỉ có trên main, xem [DEPLOYMENT — Git workflow](DEPLOYMENT.md#git-workflow).


## Hạ tầng triển khai

### Điều chỉnh trước M5 — 25/10/2026

- M3/M4 đã publish; chỉnh sửa chưa mô tả để sau MVP. User chốt **Cloudflare Workers cho frontend SSR** thay Pages và cung cấp URL Neon trong .env; chưa thuê VPS. Ngày26/10 user chọn Render me-may-api, Docker/config đã chuẩn bị.
- Cập nhật04/11: user xác nhận backend chuyển sang Dell homelab/Dokploy qua
  Cloudflare Tunnel, API `https://api.memaybooks.com`; frontend Worker vẫn dùng
  proxy `/api` cùng origin. Repo Wrangler đã đổi sang API homelab04/11, chưa deploy;
  DB/profile thực tế Dell chưa xác minh. Mô tả Render/Neon dưới đây là testhost cũ.
- Hướng test: Workers Angular SSR/assets/API proxy → Spring Boot/Java21 Docker trên Render → Neon PostgreSQL; Cloudinary giữ. Neon V1–V5 đã migrate/validate26/10, user đã deploy Worker/Render27/10; health/SSR/privacy/auth online smoke đạt, pilot/media/recovery/performance còn mở. Production VPS/Dokploy hoãn; không đổi auth/media hoặc thêm Neon Functions/Data API vì skill có mẫu.
- Theo [Render Free](https://render.com/docs/free), service ngủ sau15phút/start~1phút/filesystem ephemeral; Free Postgres hết hạn30ngày. [Docker Render](https://render.com/docs/docker) hỗ trợ JVM. [Neon Free](https://neon.com/docs/introduction/plans) được user chuẩn bị cho DBtest; quota/region/migration/backup còn phải chốt. Không dùng Docker DB cá nhân từ cloud.
- Code hiện tại bind127.0.0.1 mặc định, có PORT env; khi deploy cần SERVER_ADDRESS=0.0.0.0/profile phù hợp, không bật local profile cookie insecure. Session in-memory mất khi restart/sleep; public HTTP timeout10s có thể ngắn hơn cold-start. Đây là đầu vào spec M5, chưa sửa code tại checkpoint publish.
- Workers.dev và Render default domains khác site; cookie SameSite=Lax/API browser-relative cần route/proxy hoặc domain/CORS/credentials/CSRF phù hợp. Frontend local26/10 đã có /api proxy cùng origin; online27/10 login/session/CSRF qua Worker đã đạt; không wildcard credentials hoặc tắt CSRF để làm demo.
- [Angular non-Node SSR](https://angular.dev/guide/ssr#non-nodejs) có AngularAppEngine với Request/Response; version21 đang cài cũng có API này. [Cloudflare Angular guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/angular/) mặc định chỉ Assets, không là bằng chứng SSR. Cần spike entry/bundle/env/allowedHosts/hydration/initialHTML/OG/404/cache thực tế trên Workers, không chỉ upload browser hoặc đổi renderMode.
- Root .env có `NEON_DATABASE_URL` pooled URL được chuẩn hóa từ dòng URL thô; local DB_URL/TEST_DB_URL giữ nguyên. Render profile dùng JDBC vars riêng do tooling sinh. `NEON_DATABASE_URL_UNPOOLED` optional: tooling derive cùng endpoint đã đối chiếu API nếu thiếu. Theo [Neon Flyway](https://neon.com/docs/guides/flyway), schema migration dùng direct/non-pooled endpoint; không tự dùng pooler để chạy migration.
- Kiểm tra25/10 bằng PostgreSQL JDBC driver/JDK sẵn có, transaction read-only/rollback: TLS kết nối thành công, PostgreSQL18.6, public0bảng, chưa flyway_schema_history. Không bootstrap owner/migrate/tạo branch/project, không di chuyển sách hoặc để credential trong frontend/Workers bundle. Spring API vẫn là nơi duy nhất truy cập DB.
- Tách test DB/media namespace/secrets khỏi dữ liệu thật; chưa di chuyển6cuốn/18ảnh hoặc cung cấp dump/secrets lên cloud. M5 còn phải chốt budget/quota, health/rollback, auth/mobile/in-app, backup/restore và chứng cứ SEO; test miễn phí không thay release production.

### Public M3 — contract đã triển khai

- Public GET `/api/v1/books?q&category&binding&age&sort&page`: page0-based/size20; ageOR + categoryAND; binding chỉ Picture book/ALL bỏ giới hạn; sort newest/price_asc/price_desc và IDdesc tie-break. Search literal theo mã hoặc tên, PUBLISHED-only gồm SOLD. Collections chỉ active; Home ưu tiên available. DTO không field nội bộ.
- GET `/books/{slug}`, `/books/{slug}/media/{FRONT|BACK|INSIDE}`, `/taxonomy`, `/collections`, `/collections/{slug}`, `/home`, `/contact`, `/flash-sale`. Media chỉ ACTIVE của PUBLISHED, no-store kể cả lỗi. Initial HTML public có metadata/canonical/OG, missing404, backend failure503; admin noindex/no-store.
- Flash Sale singleton id1/version0, startsAt/endsAt/items[{bookCode,salePriceVnd}], OWNER GET/PUT `/api/v1/admin/flash-sale`, version/audit. Original price từ listing; effective chỉ enabled/[start,end)/PUBLISHED/AVAILABLE/sale<reference. List/detail/sort/enquiry dùng cùng DBclock; response timestamp sync PublicClock, origin qua TransferState. Không sold counts. Tắt campaign sau sold vẫn được.
- V4 bỏ reading basis khỏi field/storage/audit mới, giữ audit lịch sử và optional HTTPS video; V5 thêm campaign mặc định tắt. Backup/fingerprint/migration bảo toàn sách/media/audit/sequence đã kiểm chứng. Không cần chạy lại hoặc reset dữ liệu vì user nghiệm thu.

### Luồng mạng / domain hiện hành (cấu hình repo, chưa nghiệm thu release)

| URL / dịch vụ | Nơi chạy | Bảo mật / ghi chú |
|---|---|---|
| `memaybooks.com` | Cloudflare Workers / Angular SSR + assets | Repo đã cấu hình; cần smoke candidate đang deploy |
| `memaybooks.com/admin` | Cùng Cloudflare FE | Frontend route admin; **quyền thực thi do Spring API kiểm tra** |
| `api.memaybooks.com` | Dell/Dokploy qua Cloudflare Tunnel | Browser dùng proxy cùng origin; giữ CSRF/Secure cookie; DB/profile live chưa xác minh |
| PostgreSQL test endpoint / internal service:5432 | Neon test cũ; đích DB Dell chưa xác minh | JDBC chỉ từ Spring backend, TLS mạng ngoài, direct migrations riêng |
| Cloudinary delivery domain | Cloudinary CDN | Chỉ giao ảnh đã xuất bản; quản lý signed uploads/delete qua API |
| Resend API | Resend, **chưa kích hoạt ở MVP** | Gọi từ Spring Boot khi đã có tính năng email |

**Kết nối PostgreSQL tự quản (hướng production, chưa có VPS):**

- Backend kết nối service hostname trong private network, port nội bộ 5432; không dùng public DNS cho luồng DB cùng VPS và không public port database.
- Tách database role ứng dụng khỏi role migration/admin; giới hạn quyền theo schema, giữ credential trong secret/env của Dokploy, không ghi vào source hoặc browser bundle.
- Volume bền vững tách khỏi vòng đời container; không lưu data trong filesystem tạm. Tách database/role/volume của staging và production.
- Nếu DB và API khác máy, cần mạng riêng/VPN và TLS có xác minh certificate; cấu hình JDBC, authentication và network cụ thể phải được kiểm chứng tại M1. Không coi mạng Docker là cơ chế mã hóa.
- Chỉnh Hikari `maximumPoolSize` theo tài nguyên PostgreSQL, connection limit và số instance; Flyway chạy có kiểm soát trong release, không tự tạo schema bằng `ddl-auto: update` ở production.
- Theo dõi dung lượng disk, memory, connection count; chọn VPS sau đo tải. Ban đầu API/DB có thể cùng máy, không tuyên bố high availability.
- Backup database hằng ngày ra nơi lưu tách khỏi VPS, có retention và cảnh báo lỗi. Dùng `pg_dump`/`pg_restore` phù hợp định dạng; kiểm thử restore sang database trống, bao gồm quyền/extension cần thiết. Snapshot VPS/volume không thay cho kiểm thử phục hồi database.

**Cloudflare / SEO quyết định bằng spike tại M0/M1:**

1. Deploy thử Angular app với **Workers Assets**, cả route `/admin` và `/sach/:slug`.
2. Kiểm tra ở bản build triển khai thật: `curl` HTML ban đầu có **tên sách, mô tả, giá, OG image**, canonical, HTTP 404 cho sách không tồn tại; Facebook/Zalo crawler nhận đúng preview.
3. Kiểm tra sau khi **publish, sửa giá, sold, archive**: HTML/preview/API không giữ dữ liệu cũ do Cloudflare cache.
4. Nếu Workers Angular không có SSR tương thích: lựa chọn có kiểm chứng gồm **(a)** prerender theo danh mục đã publish + cơ chế rebuild khi thay đổi, hoặc **(b)** giải pháp edge-render/SSR tương thích được spike chứng minh. Không tự triển khai một runtime Node SSR truyền thống trên Cloudflare chỉ từ hướng dẫn static assets.
5. Nếu cả hai nhánh không đáp ứng SEO và tốc độ cập nhật, phải ghi lại trade-off và **đổi kiến trúc FE một cách có chủ đích**; không mặc định hạ yêu cầu SEO mà không quyết định.

**VPS / Dokploy (hướng production hoãn, không phải test M5 đã provision):**

- VPS cần đủ RAM cho JVM + PostgreSQL + Dokploy/Traefik + hệ thống; chọn cấu hình từ smoke load test và quan sát memory, **không mặc định một size cố định**.
- Build image Spring Boot (multi-stage), health check `/actuator/health` tối giản, restart policy, giới hạn bộ nhớ và log rotation; Dokploy deploy image ổn định thay vì build production không có kiểm soát.
- Dokploy quản lý domain/routing qua Traefik. Không publish cổng container backend trực tiếp ra Internet nếu không cần; tách quyền quản trị Dokploy, SSH key, firewall, bảo vệ dashboard và định kỳ cập nhật bản vá.
- Cloudflare DNS `api.example.com` trỏ về VPS; origin sử dụng certificate hợp lệ và **Full (strict)** để không để lỏng mã hóa giữa Cloudflare và VPS. Kiểm tra việc cấp/renew certificate thực tế với chế độ proxy DNS.
- Secrets của VPS/Dokploy như `SPRING_DATASOURCE_URL`, `DB_USER`, `DB_PASSWORD`, `CLOUDINARY_*`, `SESSION_SECRET` (nếu cấu hình) nằm trong secret/env của hạ tầng, không commit vào Git; chỉ cấu hình credential PostgreSQL cần thiết cho backend.
- CI tách **PR: lint/build/test** và **release: deploy**; có rollback image tag, migration tương thích ngược khi cần. Nếu chỉ một backend instance, user admin có thể phải đăng nhập lại sau restart khi session in-memory; ghi rõ trước khi scale.

**Backup / khôi phục:**

- PostgreSQL tự quản: chủ dự án chịu trách nhiệm lịch backup, bản vá, retention và restore. Đề xuất RPO tối đa 24 giờ; retention ban đầu 7 bản ngày + 4 bản tuần ngoài VPS, quyền truy cập hạn chế và mã hóa nơi lưu. Chốt RTO sau phép thử phục hồi, không mặc định có PITR hoặc failover.
- DB backup **không đồng nghĩa backup file ảnh Cloudinary**; ghi nhận public IDs, phương án giữ ảnh gốc trên Drive hoặc xuất file định kỳ. Không mất tham chiếu media khi restore DB; kiểm thử phục hồi chéo DB/media.
- Lưu runbook cho lỗi PostgreSQL mất kết nối, DB pool cạn, VPS full disk, Cloudflare deploy lỗi, Cloudinary upload lỗi và certificate hết hạn.

**Resend — mở rộng sau MVP:**

- Không tạo bảng gửi email, OTP, notification jobs hay Resend integration endpoint ở MVP nếu không sử dụng. Có thể ghi `EmailService`/`NotificationSender` thành **contract dự kiến** trong ADR/backlog tương lai.
- Khi làm cart/order sau này: email xác nhận yêu cầu/đơn, cập nhật trạng thái, thông báo quản trị; Spring Boot là bên tạo sự kiện nghiệp vụ và gọi Resend (không để FE chứa API key).
- Khi kích hoạt: xác minh domain gửi, cấu hình DNS SPF/DKIM (xem xét DMARC), cấu hình FROM/REPLY-TO; secrets lưu trên Dokploy, ghi log ID email nhưng không log dữ liệu cá nhân quá mức.
- Xử lý thất bại bằng retry có kiểm soát và idempotency key; khi nghiệp vụ email tăng mới cân nhắc outbox/queue. Database không cung cấp hệ thống auth/email cho ứng dụng; Spring Security tiếp tục phụ trách session quản trị.

**Nguồn tài liệu chính thức để đối chiếu khi bắt đầu:**
- Cloudflare: https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/angular/ và https://developers.cloudflare.com/pages/framework-guides/
- PostgreSQL: https://www.postgresql.org/docs/current/backup-dump.html
- Dokploy database: https://docs.dokploy.com/docs/core/databases
- Dokploy: https://docs.dokploy.com/docs/core/docker-compose/domains và https://docs.dokploy.com/docs/core/docker-compose
- Resend: https://resend.com/java và https://resend.com/changelog/idempotency-keys

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

### Deploy setup — 26/10/2026

[DEPLOYMENT](DEPLOYMENT.md) là nguồn hướng dẫn dashboard/secret/migration hiện hành.
Production wrangler.jsonc gắn Custom Domain memaybooks.com vào Worker me-may,
đặt HTTPS origin chính thức và proxy /api đến me-may-api.onrender.com. Per-request
AngularAppEngine allowedHosts exact; x-forwarded headers bị bỏ để giữ SSR và origin.
Render Docker Java21/nonroot/profile render, owner cấp riêng bằng one-shot command, không startup bootstrap hoặc
profile local trên Render; datasource pooled/Flywaydirect/public/cleanDisabled. NamespaceCloudinary
online-test tách dev/test. Migrations V1–V5 đã chạy và validate trên Neon target, không
copy dữ liệu dev hoặc dùng neon_auth. User tự deploy; CPU/quota/auth/restore online
vẫn là gate riêng. Local config và Node SSR giữ nguyên.

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
- Bằngchứng vàgiớihạn: [hiệu năng nhập sách](BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md).

## Import CSV/XLSX —31/10

[BOOK_IMPORT](BOOK_IMPORT.md#api-và-lưu-trữ) là nguồn API/schemaV11/retry/quota hiện hành;
[DATA](DATA.md#format-file-import--contract-duyệt31102026) giữV4/8cột mặc định,
V3/7cột,V2/16cột,V1/20cột tương thích. Parser bounded, canonicalSHA256 theo schema;
V2–V4 không gộp dòng giốngnhau; một transaction tạo ARCHIVED/variants/audit/receipt,
không Cloudinary. V3/V4 cho null giá; V4 có unit thì tính BigInteger trong validator.
ImportGroup mang unit ngoài BookWrite qua resolve/create/audit; digest4 chứa unit,
V1–V3 canonical giữ nguyên. Schema DB đã hỗ trợ unit/null giá, publish kiểm đủ giá/ảnh.
Tái sử dụng aggregate/validation/editor/publish; private no-store và OWNER/CSRF.
[Kiểm chứng](BOOK_IMPORT_VERIFICATION.md) gồm rollback100sách, mất phản hồi và giới hạn host.

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
- Media DTO thêm cacheKey opaque theo asset ID, URL cũ vẫn dùng được. Version
  sai/ảnh không ACTIVE/sách ẩn trả404 khi tới backend. Storage ID/signed URL không lộ.
- CSS/JS root có hash và200 cache1năm immutable. Asset lỗi/unhashed không đổi policy.
- Angular metadata taxonomy/collections/contact chia sẻ request và TTL60s theo
  instance DI, xóa sau admin mutate. Home/listing/metadata SSR transfer body và giờ
  server một lần; không bật transfer cho lookup/detail verification hoặc sale.
  Sale vẫn lấy giờ mới; metadata replay không chỉnh đồng hồ ngược mỗi lần đọc.
- CDN cache chỉ bật trong production config; local/preview mặc định không bật.
  Thiết lập và smoke online nằm DEPLOYMENT. Chưa có đo cải thiện sau deploy.

## Media/save/features —06/11/2026

V15 mở rộng2internal roles và feature catalogue/mapping; giữ Angular/Spring/JDBC,
không dependency mới. Aggregate PUT gộp content/mediaMetadata/features/publication
trong transaction/version/audit; public features SQL aggregate không thêm per-book
query. Contract/bảo mật/idempotency ở [CATALOGUE](CATALOGUE.md), UX ở DESIGN,
rollout/rollbackV15 ở [BOOK_ENTRY_ROLLOUT](BOOK_ENTRY_ROLLOUT.md).
