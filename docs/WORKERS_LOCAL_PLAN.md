# Frontend Workers local — phạm vi đã chốt 26/10/2026

User chọn chỉ frontend Workers local trước deploy. Giữ Angular 21/Spring Boot;
không deploy, provision Render, migrate Neon hoặc sửa dữ liệu dev.

## Thiết kế và nghiệm thu

- Build Angular riêng với SSR platform neutral; giữ build/dev Node hiện tại.
- Worker dùng AngularAppEngine Request/Response, assets binding, request context
  riêng cho API origin và site origin; không đưa backend origin/secret vào browser.
- Proxy cùng origin /api giữ method/query/body, cookie/CSRF, status, Set-Cookie,
  timestamp và no-store. Đích chỉ từ cấu hình; lỗi backend trả 503.
- Public SSR có HTML/meta/OG/canonical, missing route 404; wishlist/admin privacy.
- Wrangler local 127.0.0.1:8787 với backend local8080. Không token/login cần thiết.
- Cấu hình local nằm file riêng; root .env/Neon không được Wrangler nạp.
- Local workerd đạt chưa chứng minh quota/CPU/cold-start hoặc deployed Workers.

## Task tuần tự

1. Tests RED cho proxy và config/request isolation, implementation GREEN;
   thêm entry/build/config Wrangler local. Chạy frontend suite + build Workers.
2. Kiểm chứng workerd thật: SSR checker, proxy/session/header/body và browser
   hydration/direct route. Chạy build Node và toàn bộ frontend tests.
3. Review độc lập toàn nhánh, sửa Important/Critical bằng RED→GREEN một lượt;
   cập nhật tài liệu chuẩn/bằng chứng, gỡ plan sau chuyển đủ nội dung.

Commit theo phần; branch codex/m5-workers-local từ main cded8a7, giữ local.
Ledger ignored .superpowers/sdd/WORKERS_LOCAL_PLAN/progress.md.

## Review Focus

Kiểm tra static fallback không che SSR/404/privacy; proxy path không đổi đích,
Set-Cookie không bị gộp; cấu hình mỗi request không rò qua request khác;
asset HTML không bypass noindex/no-store; origin không hợp lệ fail closed;
không nạp .env Neon hoặc vô tình cấu hình deploy/account/domain thật.
