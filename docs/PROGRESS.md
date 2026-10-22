# Mẹ Mây — tiến độ và bàn giao hiện tại

Cập nhật: 22/10/2026 (Asia/Ho_Chi_Minh). Checkpoint: S010-C01 trong [DEV_LOG](DEV_LOG.md).

## Trạng thái

**M0 đã được người dùng duyệt. M1 local đã triển khai và kiểm tra; Docker hóa app, CI/CD và deploy được hoãn theo yêu cầu.** Pilot 10–20 cuốn thật vẫn chuẩn bị song song, chưa có dữ liệu thương mại được xác nhận.

Baseline sản phẩm: [MASTER_PLAN](MASTER_PLAN.md). Phạm vi M1 local đã gộp vào bản hiện hành; không giữ plan thực thi đã hoàn tất.

Đã áp dụng rule tài liệu: trần 400 dòng (DEV_LOG ngoại lệ), không có tối thiểu 200 dòng bắt buộc; bắt đầu từ chỉ mục duy nhất [docs/README](README.md) để chọn file/mục theo đầu việc. [M2_SPEC](M2_SPEC.md) đã được người dùng duyệt; [M2_PLAN](M2_PLAN.md) gồm 11 task đã duyệt; **đang thực thi tuần tự, task 1–6 đạt 69 backend tests + live Cloudinary adapter 1/1, task7–8 frontend22/22; tiếp task9 media/status/preview**. Chi tiết hạ tầng ở ARCHITECTURE, provider/gate giữ ở master.

## Baseline trước M2 đã cập nhật

- MVP nhập thủ công; lọc chỉ tuổi/thể loại, nhiều nhóm tuổi và một thể loại/cuốn. Picture book bắt buộc đúng một kiểu Paperback/Hardcover; “Tất cả” chỉ dùng khi lọc.
- Giá tham khảo + ghi chú tình trạng; ba ảnh FRONT/BACK/INSIDE bắt buộc trước xuất bản; bảy mức đọc Cambridge/CEFR chọn thủ công, có thể chưa xác định; link video đọc sách tùy chọn.
- Chỉ Còn hàng/Hết hàng; trái tim wishlist, CTA liên hệ/tư vấn tương đương qua Zalo hotline cá nhân zBusiness và link nhóm riêng. Điền sẵn chưa kiểm chứng; chấp nhận copy → mở Zalo → dán/gửi, có copy thủ công dự phòng.
- Import CSV/Excel ngay sau MVP chỉ tạo mới thành nháp, mã trùng báo lỗi; cập nhật sách có sẵn là giai đoạn sau. Chưa đặc tả file/preview/lỗi, chưa code importer.
- MASTER_PLAN/DATA/DESIGN đã đồng bộ; fixture/wireframe M0 giữ nguyên và ghi rõ chưa khớp baseline mới. Chưa triển khai hoặc nghiệm thu M2; thay đổi phiên này chỉ là tài liệu. Kiểm tra 51 link local, code fence, nội dung baseline/gate giữ lại và `git diff --check` đạt; không chạy lại build/test ứng dụng.

## Đã có

- Angular 21.2 standalone/SSR-ready, public/admin layouts, login form và guard; Home mới là shell, chưa dựng các hàng sách M0.
- Spring Boot 4.1.1/Java21, JPA/Validation/Security/Flyway, session Owner/Staff, CSRF, JSON auth errors, owner bootstrap local idempotent.
- PostgreSQL 18.4 ở container my-postgres, localhost:5432; database riêng me_may_dev và me_may_test, role me_may_app. Credential ngẫu nhiên trong root .env ignored (0600), không ghi vào tài liệu.
- README hướng dẫn chạy/test, check-ssr script; [verification report](VERIFICATION.md).
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

1. Thực thi từng task [M2_PLAN](M2_PLAN.md) theo [spec đã duyệt](M2_SPEC.md), ghi checkpoint và chạy RED/GREEN; task 1–6 đã đạt (69 PASS + 1 opt-in skipped mặc định; live adapter riêng 1/1 PASS), task7–8 frontend đạt22/22; tiếp task9 media/status/preview/audit. Nếu phát hiện lỗi M1, tái hiện và kiểm tra trước khi sửa.
2. Cloudinary đã xác minh upload/preview authenticated và cleanup đúng asset test; chuẩn bị 10–20 cuốn thật cho gate media/pilot M2; không gửi secret qua chat. Link Zalo hotline/nhóm thật cần trước nghiệm thu luồng liên hệ M3; khả năng điền sẵn còn phải kiểm chứng, không chặn các task catalogue local.
3. M2 triển khai CRUD nhập thủ công sau khi plan được duyệt; Home catalogue/detail thuộc M3, wishlist thuộc M4; import CSV/Excel là bước ngay sau MVP.
4. Khi quay lại staging, làm Cloudflare rendering spike, domain cookie/CORS/CSRF, VPS/Dokploy, production DB roles, backup/restore và CI/CD. Không đánh dấu các gate đó đạt từ kiểm tra local.

Chọn file/mục cần đọc theo [chỉ mục duy nhất](README.md#đọc-theo-đầu-việc); không nạp toàn bộ bộ tài liệu hoặc nhật ký. Quy tắc ở [AGENTS](../AGENTS.md).

## Dọn repository theo yêu cầu mới

Đã gộp tài liệu thành bộ hiện hành có tên cố định, bỏ proposal/plan cũ sau khi chuyển nội dung hữu ích. Chỉ dùng một `.gitignore` root; các quy tắc riêng Angular đã được gộp với đường dẫn phù hợp. Skill `.agents/` và cấu hình `.vscode/` được giữ trên máy nhưng bỏ theo dõi Git. Logo mới `code/frontend/public/logo.jpg` được giữ làm asset nguồn, chưa tích hợp UI. Cleanup ở b4bb335; baseline/rule ở b8d32d9; mã/spec S007–S008 ở 35441c2. Plan và cập nhật trạng thái S009 còn local, chưa commit/push/merge/deploy. Quy tắc cập nhật và xóa tài liệu cũ đã ghi trong AGENTS và mục lục docs.
