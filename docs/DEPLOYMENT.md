# Deploy test — Workers + Render + Neon

Phạm vi đã chọn26/10/2026: AngularSSR trên Worker `me-may`, Spring Boot Docker
trên Render `me-may-api`, PostgreSQL Neon đã migrate schema. User tự deploy hai
service qua dashboard. Local DB_URL/TEST_DB_URL không đổi; không chuyển sách/ảnh dev.

## 1. Cloudflare Workers Git integration

- Repository: `nanashi193/me-may`, production branch `main`.
- Root directory/Path: `code/frontend` (ảnh dashboard đang chọn thư mục frontend).
- Worker name: **me-may**, phải khớp `wrangler.jsonc`.
- Build command: để trống; Wrangler custom build tự chạy `npm run build:workers`.
- Deploy command: `npm run deploy:workers` (hoặc `npx wrangler deploy`).
- Node.js:22.12+; có thể đặt build variable `NODE_VERSION=22`.
- Không đặt output browser làm SPA/Pages: entry là `dist/me-may-workers/server/server.mjs`.
- Không cần copy account token vào Git; token do dashboard tạo dùng cho Git integration.

Cấu hình `code/frontend/wrangler.jsonc`: Workers Assets+AngularSSR, workers.dev bật,
preview URLs tắt, không SPA fallback. API origin dự kiến
`https://me-may-api.onrender.com`; nếu Render cấp tên khác, sửa MEMAY_API_ORIGIN rồi
redeploy. Backend chưa lên thì route cần dữ liệu có thể503; shell vẫn chạy.

Chưa biết subdomain tài khoản: Worker chỉ nhận URL HTTPS
`me-may.<account>.workers.dev` đúng mẫu, dùng origin đó cho SSR/canonical/enquiry.
Khi gắn custom domain đặt `MEMAY_SITE_ORIGIN=https://domain-thật` trong config rồi
redeploy; URL request phải khớp origin. Không wildcard allowed hosts. Forwarded
headers bị bỏ trước Angular để không ép CSR hoặc thay origin. Site origin được
chuyển qua TransferState; backend/DB secret không đưa vào browser.

Không dùng `wrangler.local.jsonc` cho deploy. Local: `npm run dev:workers`8787.
`npm run deploy:workers -- --dry-run` chỉ build/kiểm bundle, không upload.

## 2. Render Web Service

Tạo **Web Service**, tên `me-may-api`, repository/branch `main`, runtime **Docker**.
Chọn region gần Neon khi có lựa chọn; project hiện ở AWS US East Ohio.

| Ô cấu hình | Giá trị |
|---|---|
| Root Directory | `code/backend` |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` (root directory đã chọn) |
| Docker Command | để trống, dùng ENTRYPOINT trong image |
| Health Check Path | `/actuator/health` |
| Instance | Free cho test theo lựa chọn hiện tại |

Image multi-stage Temurin Java21, chạy UID10001, bind0.0.0.0 và PORT Render cấp;
heap tối đa65% RAM. Không lấy secret qua Docker build args. .dockerignore allowlist
chỉ source/Maven cần thiết; .env/target/local tool không vào context.

Tạo file env private trên máy, từ repo root:

```bash
python3 scripts/deploy/prepare_render_env.py
```

File `.local/render.env` (0600, ignored) đã được tạo cho môi trường hiện tại.
Trong Render Environment dùng **Add from .env** để nhập nội dung file này qua editor;
không gửi file/secret vào chat hoặc commit. File là dotenv cho import, không phải
shell script để source. Nó chứa:

- SPRING_PROFILES_ACTIVE=render, SERVER_ADDRESS=0.0.0.0.
- NEON_JDBC_URL: pooled, NEON_JDBC_URL_UNPOOLED: direct; cùng user/password tách riêng
  NEON_DB_USER/NEON_DB_PASSWORD. TLS verify-full + JVM trusted CA + channel binding.
- CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET nếu có trong root.env; namespace riêng
  `memay/online-test`, không dùng chung dev hoặc integration-test.
- CONTACT_ZALO_HOTLINE_URL/GROUP_URL nếu có.
- BOOTSTRAP_OWNER_EMAIL/PASSWORD lấy từ root.env, BOOTSTRAP_OWNER_ENABLED=false.

### Tạo owner lần đầu

Trước lần deploy đầu, trên Render đổi **BOOTSTRAP_OWNER_ENABLED=true** và kiểm tra
BOOTSTRAP_OWNER_EMAIL/PASSWORD (password16–72bytes). Profile render vẫn giữ cookie
Secure/SameSiteLax/HttpOnly và CSRF. Khi deploy thành công, đăng nhập ở
`https://me-may.<account>.workers.dev/admin/dang-nhap`; sau đó đặt flag false và
xóa hai credential bootstrap khỏi env nếu muốn, redeploy. Bootstrap không reset
password/account có sẵn và không nâng STAFF thành OWNER. Chưa tạo owner trên Neon
trong bước migration schema; không bật profile local trên Render.

Free host có thể ngủ/restart, session in-memory mất và public timeout10s có thể ngắn
hơn cold-start; khi vừa deploy hãy mở health endpoint Render trước rồi thử website.
Không tắt CSRF/Secure cookie hoặc dùng browser gọi Render khác site để né lỗi.

## 3. Neon migration và vận hành

Root.env giữ raw NEON_DATABASE_URL. Nếu chưa có direct URL, script derive direct
cùng endpoint bằng cách bỏ -pooler và validate cùng host/database/role; endpoint đã
đối chiếu Neon API và kết nối TLS thành công. Có thể đặt NEON_DATABASE_URL_UNPOOLED
explicit; script từ chối nếu khác database/role. Không đổi DB_URL/TEST_DB_URL local.

Đã migrate V1–V5 bằng Flyway12.4.0, schema **public**, validate tracking. Chỉ schema,
taxonomy seed và campaign singleton tắt;0sách/0ảnh/0admin trong target khi bàn giao.
Schema neon_auth có sẵn thuộc dịch vụ khác, app không dùng hoặc thay đổi.

Lệnh cho lần sau (root repo, Java21/Maven Wrapper, credentials ở ignored.env):

```bash
python3 scripts/deploy/migrate_neon.py --info-only
python3 scripts/deploy/migrate_neon.py
```

Migrate idempotent qua Flyway history; không sửa SQL V1–V5 đã áp dụng. Schema mới cần
migration version tiếp theo. Plugin và render profile cùng direct URL/public schema,
clean bị khóa, baseline-on-migrate=false. Startup Render kiểm tra/apply migration
pending; người vận hành nên thử migration mới ở branch riêng trước.

Logs đầy đủ trong `.local/neon-migration.log` mode0600; không commit hoặc đưa log
chứa endpoint/credential ra public. Migrate script không dùng local DB_URL. Branch
Neon `m5-migration-verification` đã xóa sau khi user xác nhận, giữ kết quả/log thử.
Không chạy backend integration tests trên Neon; tests yêu cầu me_may_test local.

## 4. Kiểm tra sau khi user deploy

1. Render `/actuator/health`200; không log chi tiết health hoặc secrets ra public.
2. Worker Home/detail có HTML đầu tiên/title/OG/canonical đúng origin; route thiếu404.
3. /quan-tam và /admin/** noindex/no-store; API/media không cache dữ liệu cũ.
4. Đăng nhập/CSRF, CRUD/version/audit, ảnh trong namespace online-test, wishlist và
   copy→Zalo; test thật Safari/Chrome/in-app khi có thiết bị.
5. Đo CPU/quota Workers/cold-start Render, kiểm tra backend-down503, DB connections,
   quyền/token/domain TLS và backup/restore trước nghiệm thu online/release.

Local dry-run/workerd/Docker không thay kết quả triển khai online. Chưa bật CI/CD
release khác hoặc provision Render/Cloudflare resources trong task code này.

Nguồn đối chiếu: [Cloudflare Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/),
[Render Docker](https://render.com/docs/docker),
[Neon pooling](https://neon.com/docs/connect/connection-pooling).
