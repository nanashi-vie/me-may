# Mẹ Mây — tiến độ và bàn giao hiện tại

Cập nhật: 22/10/2026 (Asia/Ho_Chi_Minh). Checkpoint: S003-C03 trong [DEV_LOG](DEV_LOG.md).

## Trạng thái

**M0 đã được người dùng duyệt. M1 local đã triển khai và kiểm tra; Docker hóa app, CI/CD và deploy được hoãn theo yêu cầu.** Pilot 10–20 cuốn thật vẫn chuẩn bị song song, chưa có dữ liệu thương mại được xác nhận.

Baseline sản phẩm: [master plan v3.2](Me-May_MASTER_PLAN_v3.2_2026-10-21.md). Phạm vi thực thi M1 mới nhất: [M1 local plan](superpowers/plans/2026-10-22-m1-local.md).

## Đã có

- Angular 21.2 standalone/SSR-ready, public/admin layouts, login form và guard; Home mới là shell, chưa dựng các hàng sách M0.
- Spring Boot 4.1.1/Java21, JPA/Validation/Security/Flyway, session Owner/Staff, CSRF, JSON auth errors, owner bootstrap local idempotent.
- PostgreSQL 18.4 ở container my-postgres, localhost:5432; database riêng me_may_dev và me_may_test, role me_may_app. Credential ngẫu nhiên trong root .env ignored (0600), không ghi vào tài liệu.
- README hướng dẫn chạy/test, check-ssr script; [verification report](m1/VERIFICATION.md).
- Backend 13 tests và JAR verify pass; frontend 7 tests/build pass; npm audit 0; SSR dev + production local metadata/content/404 pass; browser login/logout/wrong-password đã thử.
- Review độc lập phát hiện noindex sau 404, đã sửa và có test hồi quy.

## Chạy local

Từ root: `bash code/backend/run-local.sh`. Frontend: `cd code/frontend` rồi `npm start`.

Mở http://127.0.0.1:4200/admin/dang-nhap. Đọc BOOTSTRAP_OWNER_EMAIL / BOOTSTRAP_OWNER_PASSWORD trong .env local bằng editor; không gửi mật khẩu vào chat. Không commit .env. Xem [README](../README.md) để chạy trên phiên khác hoặc kiểm tra SSR production local.

Ở thời điểm bàn giao, backend 8080 và dev frontend 4200 được giữ chạy để xem thử; kiểm tra lại process trong phiên sau, không giả định còn chạy. SSR preview 4000 chỉ dùng kiểm tra, có thể đã dừng.

## Git và môi trường

Repo đã nối origin https://github.com/nanashi193/me-may.git. Nhánh feat/m1-local dựa trên origin/dev (5d70ec8, cùng initial commit với main); chỉ lưu commit local, không push/merge/deploy. Kiểm tra git status/log khi tiếp tục.

Đã có .agents/skills và graph project Users-daoquanghung-Projects-me-may; refresh index nếu source đổi. Không tạo worktree khác hoặc sửa nguồn Ellora.

## Bước tiếp theo

1. Người dùng xem M1 local. Nếu có lỗi, tái hiện và thêm test trước khi sửa.
2. Chuẩn bị technical spec M2: BookCopy/Listing, publication/availability, media lifecycle, optimistic locking và audit; dựa trên M0 đã duyệt, dùng pilot thật khi có.
3. M2 mới triển khai CRUD nhập sách; Home catalogue hoàn chỉnh thuộc M3, wishlist thuộc M4.
4. Khi quay lại staging, làm Cloudflare rendering spike, domain cookie/CORS/CSRF, VPS/Dokploy, production DB roles, backup/restore và CI/CD. Không đánh dấu các gate đó đạt từ kiểm tra local.

Đọc [AGENTS](../AGENTS.md) → [DEV_LOG](DEV_LOG.md) → [M1 plan](superpowers/plans/2026-10-22-m1-local.md) → [M0](m0/README.md).
