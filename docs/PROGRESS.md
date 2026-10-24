# Tiến độ Mẹ Mây

Cập nhật 24/10/2026 (Asia/Ho_Chi_Minh). Bắt đầu [chỉ mục](README.md), checkpoint mới nhất cuối [DEV_LOG](DEV_LOG.md). Đối chiếu Git/process thực tế khi tiếp tục.

## Trạng thái

- M0/M1 local đã duyệt. M2 gate kỹ thuật đã đạt; pilot chủ tiệm hiện6 cuốn/18 ảnh ACTIVE, còn thiếu10–20 cuốn và đối chiếu nghiệp vụ. Giữ M2_SPEC/M2_PLAN khi gate còn mở.
- Người dùng đã duyệt M3 local và cho bắt đầu dù pilot M2 còn mở. Yêu cầu gộp feat/m1-local và feat/m2-admin-catalogue vào dev đã thực hiện/push2a73249. M3 ở feat/m3-public-catalogue.
- Người dùng xác nhận code hiện tại ổn định ngày 24/10 và yêu cầu merge vào main trước M4. Đang kiểm tra lại và tích hợp feat/m3-public-catalogue (đã gồm M1/M2) vào main; thêm /input/ vào .gitignore theo yêu cầu.

## Đã kiểm chứng M3

- Backup .local/backups/S012-before-m3.dump mode0600; dev V4/V5 chạy sau backup. Fingerprint books/listing(trừ cột căn cứ)/media/audit/sequence trước-sau khớp,6 cuốn/18 ảnh giữ nguyên. Không reset mã hoặc tạo sale giả trong dev.
- Reading basis bỏ khỏi schema/API/form/audit mới; audit lịch sử giữ. Video optional/null; có nhập kiểm tra HTTPS. Backend migration test giữ mức đọc/media/audit/sequence.
- Public PUBLISHED-only incl SOLD, tuổiOR/thể loạiAND/kiểu bìa, literal search, sort/page20, active collection; ảnh ACTIVE qua endpoint kiểm publication; no-store.
- Flash Sale do OWNER biên tập, thời gian Việt Nam, version/audit. Giá gốc từ reference; chỉ hiệu lực khi campaign bật/đúng giờ/PUBLISHED/AVAILABLE/sale<reference. Không số đã bán. Tắt campaign sau sold vẫn được.
- Home/catalogue/collection/detail3 ảnh/contact dialog/copyfallback; không wishlist trước M4. Frontend56/56 PASS; backend85 total/83 PASS/2 live skipped, verify/JAR PASS. Build PASS ngoài sandbox.
- SSRdev4200 và built4000: HTML/meta/OG/ảnh thật,404 missing book/collection và no-store PASS. Isolatedbackenddown4001:Home/catalogue/detail/sale503 PASS; sửa sale200→503 có RED/GREEN.
- Browser detail390 ảnh3/3load, không tràn ngang, Escape trả focus; copy/manualfallback có kiểm tra. Catalogue/back/tìm mã đã kiểm chứng bằng built4000; screenshot sale là response fixture browser-only, không giá giả trong DB.

## Local và điều kiện còn thiếu

- Pilot frontend4200/backend8080; built QA4000/backenddown QA4001 đã dừng sau kiểm thử. [Home](http://127.0.0.1:4200/), [admin sách](http://127.0.0.1:4200/admin/sach), [admin Flash Sale](http://127.0.0.1:4200/admin/flash-sale).
- User đã thêm CONTACT_ZALO_HOTLINE_URL/CONTACT_ZALO_GROUP_URL vào .env; backend đã restart, cả hai link có trong cấu hình public. Chưa nghiệm thu mở native Zalo trên điện thoại; copy/thủ công đã kiểm chứng.
- CloudflareSEO/OG/crawler, staging/VPS/Dokploy, deploy/CI/CD và backup ngoài VPS vẫn gate riêng trước release. Không coi localSSR là đã đạt Cloudflare.

## Tiếp theo

1. Hoàn tất kiểm tra, merge và push main theo xác nhận của người dùng; chưa bắt đầu M4 hoặc deploy.
2. Tiệm thử public UX và cấu hình sale thật/linkZalo khi sẵn sàng; tiếp tục pilotM2 lên10–20 cuốn. Không xóa plan/spec còn gate chưa chuyển.
3. M4 wishlist thiết bị; importCSV/Excel tạo nháp ngay sauMVP. Không có order/checkout/giữ sách.

## Tài liệu và giới hạn

- docs/README là chỉ mục duy nhất; M3_PLAN giữ các tiêu chí chưa chuyển hết và gate thiết bị. Markdownmax 400 dòng, DEV_LOG ngoại lệ. input/ được ignore ở root, không commit ảnh/dump/.env/cookie.
- Codebase graph đã index lại fast/persistencefalse trongM3; media bị default exclusion, dùng fallback khi không đủ kết quả.
