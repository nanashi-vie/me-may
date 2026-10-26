# Workers + Render + Neon — 26/10/2026

User yêu cầu chuẩn bị wrangler.jsonc, Dockerfile Render, setup và migrate Neon.
Giữ Angular/Spring Boot/PostgreSQL/Cloudinary; không tự bấm deploy dịch vụ.

## Thiết kế

- Workers production config riêng local; Angular neutral SSR, assets, /api proxy.
  Chỉ hostname public được cấu hình được SSR; không wildcard allowed hosts.
  Root directory Cloudflare code/frontend, build:workers và wrangler deploy.
- Render multi-stage Java21 Docker, non-root, bind0.0.0.0/PORT, profile render,
  cookie Secure/SameSiteLax và CSRF giữ; bootstrap owner opt-in không bật local.
- Profile render datasource pooled, Flyway direct; credentials runtime riêng;
  script tạo private render.env từ root.env, không đổi DB_URL/TEST_DB_URL local.
- Migration chỉ schema V1–V5 và taxonomy seed hiện có, không copy sách/ảnh dev.
  Xác minh Neon target đang trống, thử trên branch Neon riêng rồi migrate target
  user đã cung cấp; Flyway tracking/validate, không clean/baseline/reset.
- Domain Workers/Render cần user cung cấp; không đoán subdomain tài khoản.

## Trình tự và kiểm chứng

1. Tests RED→GREEN cho chuẩn hóa Neon env và deployment SSR host/proxy boundary;
   cấu hình Workers thực, dry-run bundle (không publish).
2. Dockerfile/profile Render/Flyway; integration test profile/cookie/bootstrap;
   build/run image với database test riêng, không localdev; backend verify.
3. Neon target read-only inventory, branch thử, migration/validate target;
   không xóa branch Neon nếu chưa được phép; giữ evidence, không log secrets.
4. Review độc lập toàn branch, sửa Important/Critical một lượt bằng RED→GREEN;
   frontend tests/build/workerd, docs chuẩn và hướng dẫn dashboard/env/migration.

## Review Focus

SSR không fallbackCSR vì hostname Cloudflare/x-forwarded headers; không mở SSRF
qua Host/forwarded/proxy. Image/env không chứa root.env/secret. Render profile
không dùng DBdev/test ngoài QA, cookiesSecure/CSRF vẫn bảo vệ. Flyway direct
không clean/baseline hoặc dùng pooled; migration schema được tracking đủ.
