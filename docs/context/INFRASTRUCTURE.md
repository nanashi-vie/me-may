# Hạ tầng và nguồn xác nhận

## Đích vận hành

Trình duyệt gọi `memaybooks.com/api` cùng origin. Worker chuyển request đến
`api.memaybooks.com` qua HTTPS. Theo xác nhận ngày 04/11, Cloudflare Tunnel nối
vào Dokploy trên Dell homelab và Spring Boot phục vụ API. Spring truy cập
PostgreSQL qua JDBC. Angular và Worker không có thông tin đăng nhập DB.

| Nguồn | Điều xác định được | Điều cần kiểm trên môi trường đích |
|---|---|---|
| [Wrangler](../../code/frontend/wrangler.jsonc) | Custom domain, Worker entry, assets binding, API origin, public cache | Revision đang phục vụ, HTML/OG, cache và origin của preview |
| [Workflow backend](../../.github/workflows/publish-backend.yml) | PR nhắm main chạy test backend/worker. Push main theo path hoặc chạy thủ công trên main có thể publish image và gọi Dokploy | Image digest và log của deployment cụ thể |
| [Dockerfile](../../code/backend/Dockerfile) | Java 21, user 10001, profile mặc định render | Profile, biến JDBC và revision thực tế sau khi Dokploy áp cấu hình |
| [Compose ảnh](../../ops/images/compose.yml) | Worker và Nginx dùng mạng nội bộ, volume ảnh trên host | Mount, quyền, recipe, dung lượng, giám sát backup và restore |
| Nhật ký S8/R6 và HERO-FIX-C02/C03 | Ubuntu đã được tiếp cận qua SSH; ngày 12/11 SSH đi qua Cloudflare Access. Owner xác nhận xử lý được upload banner | Quyền hiện tại, chính sách Access và cấu hình host sau các lần rollout |

Docker Compose v2 có trong runbook ảnh. Repo chưa xác nhận cấu hình Docker Swarm
của toàn cụm, số node hoặc placement đang chạy. Nguồn bàn giao vận hành là
[runbook deploy](../runbooks/DEPLOYMENT.md) và [nhật ký](../DEV_LOG.md).

### Luồng mạng / domain hiện hành (cấu hình repo, chưa nghiệm thu release)

| URL / dịch vụ | Nơi chạy | Bảo mật / ghi chú |
|---|---|---|
| `memaybooks.com` | Cloudflare Workers / Angular SSR + assets | Repo đã cấu hình; cần smoke candidate đang deploy |
| `memaybooks.com/admin` | Cùng Cloudflare FE | Frontend route admin; **quyền thực thi do Spring API kiểm tra** |
| `api.memaybooks.com` | Dell/Dokploy qua Cloudflare Tunnel | Browser dùng proxy cùng origin; giữ CSRF/Secure cookie; DB/profile live chưa xác minh |
| PostgreSQL test endpoint / internal service:5432 | Neon test cũ; đích DB Dell chưa xác minh | JDBC chỉ từ Spring backend, TLS mạng ngoài, direct migrations riêng |
| Cloudinary delivery domain | Provider legacy | Backend đọc authenticated asset qua adapter; LOCAL đọc Nginx nội bộ; quyền public theo sách |
| Resend API | Resend, **chưa kích hoạt ở MVP** | Gọi từ Spring Boot khi đã có tính năng email |

**Yêu cầu cho PostgreSQL tự quản trên môi trường đích**

- Backend kết nối service hostname trong private network, port nội bộ 5432; không dùng public DNS cho luồng DB cùng VPS và không public port database.
- Tách database role ứng dụng khỏi role migration/admin; giới hạn quyền theo schema, giữ credential trong secret/env của Dokploy, không ghi vào source hoặc browser bundle.
- Volume bền vững tách khỏi vòng đời container; không lưu data trong filesystem tạm. Tách database/role/volume của staging và production.
- Nếu DB và API khác máy, cần mạng riêng/VPN và TLS có xác minh certificate; cấu hình JDBC, authentication và network cụ thể phải được kiểm chứng tại M1. Không coi mạng Docker là cơ chế mã hóa.
- Chỉnh Hikari `maximumPoolSize` theo tài nguyên PostgreSQL, connection limit và số instance; Flyway chạy có kiểm soát trong release, không tự tạo schema bằng `ddl-auto: update` ở production.
- Theo dõi dung lượng disk, memory, connection count; chọn VPS sau đo tải. Ban đầu API/DB có thể cùng máy, không tuyên bố high availability.
- Backup database hằng ngày ra nơi lưu tách khỏi VPS, có retention và cảnh báo lỗi. Dùng `pg_dump`/`pg_restore` phù hợp định dạng; kiểm thử restore sang database trống, bao gồm quyền/extension cần thiết. Snapshot VPS/volume không thay cho kiểm thử phục hồi database.

**Tiêu chí spike Cloudflare / SEO của M0/M1 (áp dụng lại khi đổi runtime):**

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
- DB backup **không đồng nghĩa backup bytes ảnh**; LOCAL cần nguồn Drive và recipe đúng theo [IMAGES](../product/IMAGES.md). Với Cloudinary legacy, ghi nhận public IDs, phương án giữ ảnh gốc trên Drive hoặc xuất file định kỳ. Không mất tham chiếu media khi restore DB; kiểm thử phục hồi chéo DB/media.
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

## Môi trường kiểm thử và quyết định theo thời điểm


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

### Deploy setup — 26/10/2026

[DEPLOYMENT](../runbooks/DEPLOYMENT.md) là nguồn hướng dẫn dashboard/secret/migration hiện hành.
Production wrangler.jsonc gắn Custom Domain memaybooks.com vào Worker me-may,
đặt HTTPS origin chính thức và proxy /api đến me-may-api.onrender.com. Per-request
AngularAppEngine allowedHosts exact; x-forwarded headers bị bỏ để giữ SSR và origin.
Render Docker Java21/nonroot/profile render, owner cấp riêng bằng one-shot command, không startup bootstrap hoặc
profile local trên Render; datasource pooled/Flywaydirect/public/cleanDisabled. NamespaceCloudinary
online-test tách dev/test. Migrations V1–V5 đã chạy và validate trên Neon target, không
copy dữ liệu dev hoặc dùng neon_auth. User tự deploy; CPU/quota/auth/restore online
vẫn là gate riêng. Local config và Node SSR giữ nguyên.
