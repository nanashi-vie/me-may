# Tiến độ Mẹ Mây

Cập nhật 29/10/2026 (Asia/Ho_Chi_Minh). Đọc [chỉ mục](README.md) và checkpoint S024 cuối [DEV_LOG](DEV_LOG.md); xác minh lại môi trường khi tiếp tục.

## M5 completion — đã triển khai local, còn gate online

- User đã duyệt [spec](M5_COMPLETION_SPEC.md) và [plan](M5_COMPLETION_PLAN.md), chọn thực hiện tuần tự. Task1–6 đã triển khai; task7 đã kiểm tra local, review và cập nhật tài liệu. Chưa deploy hoặc migrate online trong phiên này.
- Có trọng lượng gram, khoảng giá từ–đến và giữ nguyên chú thích giá. Cho chọn/thả 2–6 ảnh theo thứ tự FRONT/BACK/SPINE/INSIDE_1/INSIDE_2/INSIDE_3; FRONT/BACK bắt buộc, bốn vai trò sau tùy chọn. Bỏ DRAFT; OWNER thực hiện mọi ghi, STAFF chỉ đọc.
- Phiên ảnh tạm 24 giờ chưa sinh sách/mã. Final tạo PUBLISHED + media + audit nguyên tử; retry cùng payload trả cùng sách. Queue chung create/edit có reorder, nút bàn phím, progress và retry; đổi thứ tự không upload lại ảnh READY.
- Logo WebP208 khoảng10KB; public JPEG/WebP320/640, normalize EXIF/alpha/JPEG0,85/cạnh≤2560. Giữ no-store. Public detail dùng public SSR seed, luôn xác nhận dữ liệu mới để tránh hydration CLS và khóa liên hệ đến response.
- V6–V9 giữ ID/asset/published_at, chuyển giá cũ thành hai đầu bằng nhau, INSIDE→INSIDE_1, DRAFT→ARCHIVED; sách cũ nullweight không tự ẩn. Chưa migrate DBdev/online; QA dùng scratch me_may_m5_qa và namespace memay/test riêng.
- Backend clean verify:107run/0failure/0error/3live skipped; frontend110/110 PASS. NodeSSR/Workers build, Workers proxy và SSR checker PASS, gồm bốn variant đúng MIME/magic/no-store và không lộ sourceRef.
- Browser OWNER tạo2/6ảnh, reorder khi upload/sau đăng, metadata, ẩn404/hiện giữ publishedAt/SOLD đều đạt. STAFF readonly và directPOST403; mobile390px không overflow. Hết hạn phiên giữ form/file; mất final response chỉ tạo một sách khi retry.
- Review độc lập có4Important, không Critical/minor; cả4 đã có RED→GREEN: gỡ file lỗi, phục hồi khi final410, đối chiếu edit upload mất response, lookup lại giá/trạng thái khi copy. Không nâng version hoặc tự merge khi bản đã lưu có thay đổi khác.

## Gate còn mở và bước tiếp

1. User merge dev→main rồi deploy theo [DEPLOYMENT](DEPLOYMENT.md#rollout-contract-m5-chưa-chạy-online). Backup/counts/fingerprint/restore scratch trước V6–V9; backend và backfill phải sẵn sàng trước frontend mới.
2. Backfill4variant trên ảnh bán thật: dryrun63pending, chưa apply v2. Không dùng checkpoint JPEG640 cũ; thiếu WebP có thể làm picture trống. Liveprobe cách ly đã đạt, không thay bằng chứng backfill.
3. Đo Mobile Lighthouse3run mỗi Home/detailMM-000020/wishlist, từng run LCP≤2,5s và CLS≤0,1. MM20 online trả503 trong phiên; local trace không thay Lighthouse online. Đo cold-start Render riêng.
4. Recovery/rollback/quota/rate-limit/runtime least privilege/quyền-lịch-retention offhost và production VPS/Dokploy vẫn cần bằng chứng ở [VERIFICATION](VERIFICATION.md). Render/Neon test chưa thay nghiệm thu production.
5. User28/10 đã xác nhận pilot publish21/21 và các ca người dùng còn lại; không yêu cầu nhập lại21cuốn. Backup DB21sách/63media và recovery media cách ly đã có checkpoint; không copy dev hoặc sửa catalogue bán thật để QA.

## Git và bàn giao

- Chỉ commit/push dev; user tự merge main và deploy. Tasks1–6:4a0683f..19c0138; commit sửa review/task7 ghi ở checkpoint cuối DEV_LOG.
- Online theo release cũ: Workers https://me-may.dqhungg8357.workers.dev, API https://me-may-api.onrender.com; chưa xác minh release mới trong phiên.
- .env/.local/dump/cookie/workspace QA ignored; asset nguồn public/logo vẫn tracked. Giữ spec/plan M5 vì gate online còn mở. Bằng chứng local: [VERIFICATION](VERIFICATION.md#m5-completion-local--29102026).
