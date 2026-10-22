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
- Wishlist dùng ID công khai và storage adapter chỉ chạy ở browser; xác minh lại dữ liệu qua public API, không giữ snapshot làm nguồn giá cuối cùng.
- Admin dùng endpoint có session/CSRF; guard chỉ hỗ trợ UI, backend là nơi quyết định quyền.
- Media xử lý provider; catalogue/listing chỉ dùng định danh và metadata media cần thiết.
- Test đặt gần feature theo convention framework, test backend nằm trong src/test; tránh folder test cấp root rời ngữ cảnh khi chưa cần.
- `database/` không chứa dump production/PII; `ops/` không chứa secret hoặc data volume. Mọi config mẫu chỉ có tên biến và giá trị demo an toàn.

## Hệ quả triển khai

Cloudflare build root là `code/frontend`; Spring build context `code/backend`. PostgreSQL là service riêng của Dokploy, có volume và private network. Không nhét database binary hoặc file ảnh thật lớn vào repo. Dockerfile/Compose/CI được hoãn theo yêu cầu; chốt khi quay lại milestone triển khai.


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

### Luồng mạng / domain (tên minh họa, chưa mua domain)

| URL minh họa | Nơi chạy | Bảo mật / ghi chú |
|---|---|---|
| `www.example.com`, `example.com` | Cloudflare Workers Assets / Angular | Domain công khai; SPA/SSG/SSR phụ thuộc quyết định sau spike |
| `www.example.com/admin` | Cùng Cloudflare FE | Frontend route admin; **quyền thực thi do Spring API kiểm tra** |
| `api.example.com` | VPS → Dokploy/Traefik → Spring Boot | HTTPS, CORS whitelist, CSRF, auth cookie, health endpoint tối thiểu |
| PostgreSQL internal service:5432 | VPS/Dokploy, persistent volume | Chỉ JDBC từ backend; không public port hoặc kết nối browser |
| Cloudinary delivery domain | Cloudinary CDN | Chỉ giao ảnh đã xuất bản; quản lý signed uploads/delete qua API |
| Resend API | Resend, **chưa kích hoạt ở MVP** | Gọi từ Spring Boot khi đã có tính năng email |

**Kết nối PostgreSQL tự quản:**

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

**VPS / Dokploy:**

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
