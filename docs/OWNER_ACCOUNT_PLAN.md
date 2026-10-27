# Tài khoản chủ tiệm cố định — 27/10/2026

User chốt giữ email/password hiện tại, hoãn số điện thoại và auth mở rộng sau MVP.
Không tạo tài khoản khi backend startup; owner do operator tạo bằng lệnh riêng.

- Xóa OwnerBootstrap và cấu hình/credential bootstrap khỏi local/Render env.
- Command tạo owner từ OWNER_EMAIL/OWNER_PASSWORD private, BCrypt12, không hardcode
  secret hoặc đưa credential vào migration/image/runtime Render.
- Một owner cố định: tạo khi chưa có owner; chạy lại cùng email/password là no-op.
  Từ chối credential khác, STAFF, account disabled hoặc owner khác; không reset/nâng quyền.
- Transaction và DB lock serialize provisioning; lỗi rollback. DB schema/auth API,
  session/Secure cookie/CSRF/OWNER-STAFF giữ nguyên, không migration dữ liệu.
- Python wrapper Neon-only dùng direct URL/TLS hiện có, credential process env và
  diagnosticsprivate; không source root.env hoặc đưa password vào argv/log.
- Tạo owner trên Neon khi user cung cấp OWNER_EMAIL/PASSWORD; không dùng giá trị
  BOOTSTRAP cũ hoặc tự sinh password. Local account có sẵn giữ nguyên.

## Triển khai và kiểm chứng

1. RED tests real DBtest cho create/idempotence/conflict/validation; command GREEN.
2. RED startup giữ0account dù còn env bootstrap cũ, bỏ startup hooks/env; tests login
   bằng owner đã cấp, cookieSecure/CSRF giữ. Render export không chứa owner secrets.
3. Backend verify/full suite; tạo owner Neon đúng env user; không log định danh/password.
4. Review độc lập toàn branch, fixImportant/Critical bằng RED→GREEN một lượt;
   docs/env chuẩn, publish main cho luồng deploy hiện hành, giữ dev.

Review Focus: no implicit reset/elevation, không tạo owner khi restart hoặc để
plaintext secrets trong runtime/image/SQL/Git; account existing/disabled/concurrent
fail closed; operator command không khởi động Spring web/app hoặc gọi media jobs.
