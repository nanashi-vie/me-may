# Mẹ Mây — Sách ngoại văn cho bé

M1 local: Angular 21.2 + Spring Boot 4.1.1/Java 21 + PostgreSQL. Catalogue đầy đủ, nhập sách/ảnh và wishlist thuộc các milestone sau. Docker hóa ứng dụng, CI/CD và deploy chưa thực hiện.

## Chạy trên máy hiện tại

Yêu cầu: Java 21, Node 22.12 trở lên thuộc nhánh 22 (máy hiện tại 22.19), npm và container `my-postgres` đang chạy ở localhost:5432. Maven Wrapper được lưu trong backend.

Hai database riêng đã được tạo: `me_may_dev` cho ứng dụng và `me_may_test` cho integration tests. Role local `me_may_app` chỉ sở hữu hai database này. Không sử dụng database dự án khác.

Credential nằm trong `.env` tại root (Git ignored, mode 0600), gồm thông tin DB và `BOOTSTRAP_OWNER_EMAIL` / `BOOTSTRAP_OWNER_PASSWORD`. Xem file local bằng editor khi cần đăng nhập; không gửi mật khẩu vào chat hoặc commit. `.env.example` chỉ là mẫu cho máy mới, không phải credential đang hoạt động.

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

## Auth/API M1

| Endpoint | Hành vi |
|---|---|
| GET `/api/v1/auth/csrf` | Lấy `{headerName, token}` để gửi header CSRF; `no-store` |
| POST `/api/v1/auth/login` | Form-urlencoded `username`, `password`, kèm CSRF; trả user DTO hoặc 401 |
| GET `/api/v1/auth/me` | User hiện tại; anonymous/expired trả 401 JSON |
| POST `/api/v1/auth/logout` | Lấy CSRF mới sau login rồi POST; trả 204, hủy session/cookie |
| GET `/api/v1/admin/access` | Kiểm tra OWNER/STAFF, không chứa dữ liệu sách |
| GET `/api/v1/admin/owner-access` | Kiểm tra OWNER; STAFF trả 403 |

Không có đăng ký công khai. Owner local được bootstrap từ env, hash BCrypt; khởi động lại không reset mật khẩu và không nâng quyền một tài khoản Staff có sẵn. Không có user management UI ở M1; STAFF được kiểm chứng bằng fixture trong database test.

Session mặc định 30 phút không hoạt động, in-memory (restart backend phải đăng nhập lại). Cookie HttpOnly/SameSite=Lax, Secure chỉ tắt ở profile local để dùng HTTP. Mặc định ngoài profile local là Secure=true và không bootstrap. Không có token quản trị trong localStorage hoặc Angular transfer cache.

## Cấu hình và ranh giới

- Chỉ backend đọc credential DB. Local URL trong Angular/proxy không chứa secret.
- Flyway là nguồn migration duy nhất: `code/backend/src/main/resources/db/migration`. Hibernate validate, không dùng ddl-auto update.
- Database dev/test phải tách riêng. Tests từ chối dọn fixture nếu current_database không phải me_may_test.
- Profile local được bật bởi run-local.sh; khi triển khai sau này cấu hình profile/secrets/domain/CSRF/CORS tương ứng, không dùng profile local trên Internet.
- Local dùng role sở hữu schema để phát triển; production cần tách role migration và role runtime, thêm login rate limit, backup/restore và deployment gates theo master plan.
- Canonical hiện dùng origin local `http://localhost:4200`; chưa có OG ảnh sách vì chưa làm catalogue/media. Cloudflare compatibility/SEO/OG phải kiểm chứng riêng trên staging.
- SSR local chỉ bind `127.0.0.1`; host allowlist gồm `localhost` và `127.0.0.1`. Khi có domain staging, cấu hình allowlist và canonical theo domain thật; không dùng wildcard để bỏ SSRF protection.

## Bàn giao

Đọc [mục lục tài liệu](docs/README.md) → [PROGRESS](docs/PROGRESS.md) → [DEV_LOG](docs/DEV_LOG.md). Baseline sản phẩm: [MASTER_PLAN](docs/MASTER_PLAN.md); phạm vi M1 local đã gộp vào đó, kết quả kiểm tra ở [VERIFICATION](docs/VERIFICATION.md).
