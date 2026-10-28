# Mẹ Mây — kiến trúc, hạ tầng và khảo sát nguồn cũ

Cập nhật 22/10/2026: scaffold M1 đã có; các feature catalogue/media bên dưới là hướng tổ chức cho milestone sau. Giữ các thư mục `code/frontend`, `code/backend`, `database`, `docs` đang có. Không tạo thêm `frontend/` hoặc `backend/` ở root gây hai nguồn code.

## Phần đã tham khảo

Graph của Ellora cho thấy code chính ở `code/frontend` và `code/backend`. Frontend dùng `features`, `layouts`, `shared` cùng config/services/models/guards/interceptors; backend phân lớp controller/service/repository/entity/dto. Đã đọc thêm `docs/architecture-and-stack.md`, `docs/frontend-guidelines.md`, `docs/backend-guidelines.md` của Ellora.

Học cách tách giao diện public/admin và shared component, nhưng gom API/model của từng feature vào gần nơi sử dụng, tránh thêm nhiều thư mục dùng chung chỉ có một consumer. Backend vẫn controller → service → repository, nhóm theo domain như master plan để một thay đổi cuốn sách không trải khắp nhiều thư mục lớn.

Không kế thừa Cognito/Amplify, booking, payment, branding, private env, dependency hoặc `ddl-auto: update`. Mẹ Mây dùng session quản trị và Flyway. Không copy source Ellora trong M0.

## Layout dự kiến

```text
me-may/
├── AGENTS.md
├── README.md                     # Entrypoint tài liệu khi bắt đầu triển khai
├── .agents/                      # Skill local, Git ignored
├── code/
│   ├── frontend/                 # Một Angular app
│   │   ├── public/               # Logo/font/icon được phép dùng, không phải ảnh kho sách
│   │   └── src/app/
│   │       ├── app.config.ts
│   │       ├── app.routes.ts
│   │       ├── core/             # HTTP config, session/CSRF, SEO, browser storage adapter
│   │       ├── layouts/          # public-layout, admin-layout
│   │       ├── features/
│   │       │   ├── home/
│   │       │   ├── catalogue/    # list/detail và API/model tương ứng
│   │       │   ├── wishlist/     # trạng thái cục bộ + enquiry text
│   │       │   ├── information/  # giới thiệu/cách mua/liên hệ
│   │       │   └── admin/        # login, editor, table, taxonomy; lazy routes
│   │       └── shared/           # book-card, gallery, pagination, filter control đã dùng chung
│   └── backend/
│       ├── pom.xml
│       ├── run-local.sh          # Chạy backend local; Dockerfile đang hoãn
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
├── ops/                          # Chỉ tạo khi làm vận hành; Docker/CI/deploy đang hoãn
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
- `database/` không chứa dump production/PII; `ops/` không chứa secret hoặc data volume. Mọi config mẫu chỉ có tên biến và giá trị demo an toàn.

## Hệ quả triển khai

### Wishlist M4 local

- `WishlistStore`: Angular signals; localStorage `memay.wishlist.v1` là mảng mã duy nhất/thứ tự thêm, tối đa100. Mã canonical theo generator Java Long dương, tối thiểu6 chữ số, không ép đúng6. Không lưu snapshot tên/ảnh/giá, selection hoặc token. Init bằng afterNextRender; cleanup listener khi destroy.
- Storage parse lọc mã invalid/trùng/quá100 và warning; malformed JSON/root sai dùng danh sách rỗng có cảnh báo, không overwrite trước thao tác lưu mới. Storage unavailable/read/write lỗi chuyển sang memory-only giữ trạng thái đang có và cảnh báo. Event key đúng hoặc clear đọc lại latest; mutation reread latest trước ghi. Đồng bộ best-effort cùng origin, không transaction/CRDT; ghi tab đồng thời vẫn có thể last-write-wins.
- Public `GET /api/v1/books/lookup?code=...` repeated:1–100 tham số trước dedupe, validate canonical/Long, thiếu/sai/quá giới hạn400. Response `PublicBook[]` giữ thứ tự mã input sau dedupe, chỉ PUBLISHED gồm SOLD; mã thiếu/không public bị bỏ qua không phân biệt lý do. Parameterized JDBC tái sử dụng SELECT/FROM/mapper, giá sale/server clock M3, ACTIVE media. Không cần migration.
- `PublicApi.lookup(codes)` dùng omit credentials/no transfer cache, no-store và X-Memay-Server-Time hiện có. Empty local list không gọi lookup. Page dùng stream switchMap/takeUntilDestroyed; refresh và prepare cùng stream hủy request cũ; response chỉ nhận mã còn trong local list/request hiện tại.
- Revalidation lifecycle/selection/dialog theo DESIGN. Prepared text được tính từ dữ liệu đã xác minh, selection/codes hiện hành và PublicClock; expiry hoặc mã đã xóa làm text rỗng ngay, trước khi refresh hoàn tất. Chỉ copy sau thao tác riêng của khách; không tự gửi hoặc ghi availability.
- Route /quan-tam có SSR shell + X-Robots-Tag/meta noindex/no-store; sau browser render mới đọc storage. PUBLIC_SITE_ORIGIN qua TransferState M3 cung cấp URL canonical. Không thêm dependency, customer auth, order hoặc backend wishlist persistence.

Cloudflare build root là `code/frontend`; Spring build context `code/backend`. Môi trường online test trước M5 theo điều chỉnh25/10 ở phần hạ tầng dưới đây; PostgreSQL/Dokploy private volume là hướng production hoãn. Không nhét database binary hoặc ảnh thật lớn vào repo. Dockerfile Render đã triển khai; Compose/CI bổ sung khi có phạm vi được duyệt.


## Khảo sát khả năng tận dụng Web Shop cũ

Ngày khảo sát: 21/10/2026. Mã nguồn tham chiếu nằm tại `/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop`. Commit đầu nhánh local quan sát được: `a3eaaeb6` (`docs: update formatting and improve readability in README`).

Khảo sát dùng codebase-memory-mcp để lập chỉ mục tạm, tìm cấu trúc và đọc symbol; đọc trực tiếp các file cấu hình/tài liệu. Không sửa project cũ, không chạy ứng dụng hoặc kiểm thử. Chỉ mục không lưu artifact vào repo cũ.

### Bằng chứng khảo sát

Các số dòng dưới đây thuộc bản local tại thời điểm khảo sát.

| Nhận định | Bằng chứng |
|---|---|
| README khác cấu hình thực tế | [README](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/README.md) ghi Angular 17/Spring Boot 3.0; [package.json](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/frontend/package.json) có Angular `^20.3.0`; [pom.xml](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/pom.xml) dùng parent Boot `3.5.6`, Java `21` |
| Có API catalogue phân trang | [CustomerProductController.java:21](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/controllers/CustomerProductController.java:21): `getProductsForCustomer`, tham số page/size/categoryName/search; trang chi tiết theo ID |
| Có tìm kiếm và lọc cơ bản | [ProductRepository.java:29](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/repositories/ProductRepository.java:29): `search` theo keyword/SKU/category/price và Pageable; query join variants, cần đổi theo sách |
| Product gắn schema và nghiệp vụ cũ | [Product.java:21](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/entity/products/Product.java:21): category, variants, images, billDetails, cartItems, promotions, reviews; mô tả `nvarchar(max)` |
| Variant không phù hợp sách từng cuốn | [ProductVariant.java:16](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/entity/products/ProductVariant.java:16): color, size, quantity, price, SKU, quan hệ cart/bill |
| Có lưu định danh ảnh cloud | [ProductImages.java:9](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/entity/products/ProductImages.java:9): imageUrl và publicId unique; tối đa 5 ảnh |
| Upload cần cải thiện xử lý lỗi từng bước | [ProductController.java:70](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/controllers/ProductController.java:70): `uploadImage`, kiểm tra 10 MB/content type, gọi storage.upload rồi createProductImages; catch trả bad request. Trong method đọc được chưa thấy bước xóa bù ảnh nếu lưu record thất bại; đây là rủi ro cần kiểm chứng khi chuyển, không phải kết luận về mọi lớp storage |
| Giới hạn tổng số ảnh nằm ở service | [ProductService.java:199](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/services/ProductService.java:199): `createProductImages` đếm ảnh và từ chối khi đủ 5; lưu URL và publicId |
| Authentication frontend phụ thuộc browser | [auth.service.ts:23](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/frontend/src/app/services/auth.service.ts:23): khởi tạo BehaviorSubject từ helper đọc localStorage; lưu token/profile ở localStorage |
| Có thể tham khảo BCrypt và Spring Security | [SecurityConfig.java:16](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/configurations/SecurityConfig.java:16): UserDetailsService, BCryptPasswordEncoder, AuthenticationProvider |
| Không nên copy nguyên cấu hình endpoint | [WebSecurityConfig.java:24](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/configurations/WebSecurityConfig.java:24): stateless JWT, CSRF disabled, `/actuator/**` permitAll, nhiều nhóm role và endpoint commerce |
| Có nhiều phụ thuộc ngoài phạm vi catalogue | [pom.xml](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/pom.xml): PayOS, mail, Thymeleaf, websocket, Faker, metrics; Actuator khai báo hai lần; websocket pin `3.5.7` trong project parent `3.5.6` |
| Hạ tầng cũ vượt nhu cầu catalogue ban đầu | [docker-compose.yml](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/docker-compose.yml): SQL Server, 2 backend replica, nginx, Prometheus và Grafana; không phải đề xuất production nguyên trạng |
| CI có thể làm mẫu nhưng cần tách publish | [docker-publish.yml](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/.github/workflows/docker-publish.yml): trigger push/pull_request main; job login registry và build với `push: true`; chưa thấy bước test riêng trong workflow này |

### Giới hạn kết luận

- Có code một tính năng không chứng minh tính năng đã hoạt động đúng trong môi trường hiện tại.
- Chưa chạy build/test, thử credential cloud, xác minh deployment hoặc đo hiệu năng. Chưa đưa ra tỷ lệ code tái sử dụng.
- Không thấy node test từ truy vấn graph đã dùng; điều đó chưa chứng minh toàn repository không có test. Khi triển khai cần kiểm kê test thực tế và thêm kiểm tra cho phần được chuyển.
- Không coi cấu hình có Actuator permitAll là bằng chứng mọi endpoint nhạy cảm đang được expose; vẫn cần xem exposure configuration khi đánh giá deployment. Tuy nhiên không nên copy whitelist này cho dự án mới.
- Giao diện và cấu trúc catalogue có thể tận dụng làm tham khảo; nội dung, ảnh và branding của shop điện tử không tự động phù hợp thương hiệu Mẹ Mây.

### Cách chuyển phần hữu ích khi bắt đầu triển khai

1. Tạo baseline Angular–Spring đúng phiên bản đã chốt và database mới.
2. Chuyển từng phần tiện ích cần dùng: bảo vệ quản trị, kết nối kho ảnh, CRUD và phân trang.
3. Mỗi phần chuyển phải đổi package/config/domain name và kiểm tra hành vi theo sách, không import toàn bộ các module cart/bill/payment.
4. Chỉ đưa dữ liệu sách thật do cửa hàng cung cấp vào môi trường mới; chưa có yêu cầu di chuyển user/order/data của shop cũ.
5. Chạy kiểm tra API công khai/quản trị, SSR và upload lỗi trước khi coi module đã tái sử dụng thành công.

Đây là phương pháp dự kiến, không phải các thao tác đã thực hiện.


## Hạ tầng triển khai

### Điều chỉnh trước M5 — 25/10/2026

- M3/M4 đã publish; chỉnh sửa chưa mô tả để sau MVP. User chốt **Cloudflare Workers cho frontend SSR** thay Pages và cung cấp URL Neon trong .env; chưa thuê VPS. Ngày26/10 user chọn Render me-may-api, Docker/config đã chuẩn bị.
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

### Luồng mạng / domain (tên minh họa, chưa mua domain)

| URL minh họa | Nơi chạy | Bảo mật / ghi chú |
|---|---|---|
| `www.example.com`, `example.com` | Cloudflare Workers / Angular SSR + assets | User đã chốt; SSR workerd local đạt; deployed spike còn mở |
| `www.example.com/admin` | Cùng Cloudflare FE | Frontend route admin; **quyền thực thi do Spring API kiểm tra** |
| `api.example.com` | Test: backend host miễn phí chưa chốt; production VPS/Dokploy hoãn | HTTPS, CORS whitelist, CSRF, auth cookie, health endpoint tối thiểu |
| PostgreSQL test endpoint / internal service:5432 | Neon test có URL; production VPS/Dokploy hoãn | JDBC chỉ từ Spring backend, TLS mạng ngoài, direct migrations riêng |
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
Production wrangler.jsonc dùng tên me-may/APIme-may-api.onrender.com; site origin
chỉ derive từ đúng WorkerHTTPS host hoặc explicit custom origin. Per-request
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
