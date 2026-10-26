# Tiến độ Mẹ Mây

Cập nhật26/10/2026 (Asia/Ho_Chi_Minh). Bắt đầu [chỉ mục](README.md), checkpoint S015-C03/C04 cuối [DEV_LOG](DEV_LOG.md). Đối chiếu Git/process thực tế khi tiếp tục.

## Đang làm — frontend Workers local

- User chọn chỉ frontend Workers local; branch codex/m5-workers-local từ main cded8a7.
- SSR neutral/proxy/workerd8787 đã chạy; tests89/89, SSR/proxy/browser và Node compatibility PASS. Đang review theo WORKERS_LOCAL_PLAN.
- Không deploy Cloudflare, chuẩn bị Render hoặc migrate Neon. Backend local8080 còn listen.

## Trạng thái

- User25/10 xác nhận đã test xong M3/M4; đã merge M4 vào main dfecf8a và push origin/main thành công. Source M4 a02b697, cập nhật nghiệm thu/hướng M5 ở61d6f88; không deploy website hoặc triển khai M5 trong task publish.
- Frontend82/82 (25files), backend87total/85PASS/2live skipped, verify/JAR/build PASS. Fresh review1Important + browser focus đã sửa một lượt RED→GREEN; recovery notice cũng có regression. Không deferred Minor.
- SSR private shell/noindex/no-store, public metadata/404/ảnh; browser360/390/desktop1440, save/reload/subset/multi/cross-tab/copycallback+manualfallback/SOLDhiddenoffline fixture/retry/nativeEscape/focus/noindexreset đạt. Fingerprint dev6books/18media/46audit trước–sau khớp.

- M0/M1 local đã duyệt. M2 gate kỹ thuật đạt; checkpoint24/10 có6cuốn/18ảnh ACTIVE, pilot10–20 chưa có xác nhận mới. Phiên publish không đọc/sửa dữ liệu dev; giữ M2_SPEC/M2_PLAN khi gate còn mở.
- M1/M2 đã có trong lịch sử dev2a73249 rồi main. M3/M4 source và review kỹ thuật hoàn tất; một số chỉnh sửa user chưa mô tả được hoãn sau MVP, không tự triển khai/bịa backlog chi tiết.
- Người dùng xác nhận code hiện tại ổn định ngày 24/10. Đã merge feat/m3-public-catalogue (gồm M1/M2) vào main tại 38c908f, không conflict; kiểm tra sau merge đạt. /input/ đã được ignore; user yêu cầu commit/push cả thay đổi Angular CLI analytics trong angular.json.

## Đã kiểm chứng M3

- Backup .local/backups/S012-before-m3.dump mode0600; dev V4/V5 chạy sau backup. Fingerprint books/listing(trừ cột căn cứ)/media/audit/sequence trước-sau khớp,6 cuốn/18 ảnh giữ nguyên. Không reset mã hoặc tạo sale giả trong dev.
- Reading basis bỏ khỏi schema/API/form/audit mới; audit lịch sử giữ. Video optional/null; có nhập kiểm tra HTTPS. Backend migration test giữ mức đọc/media/audit/sequence.
- Public PUBLISHED-only incl SOLD, tuổiOR/thể loạiAND/kiểu bìa, literal search, sort/page20, active collection; ảnh ACTIVE qua endpoint kiểm publication; no-store.
- Flash Sale do OWNER biên tập, thời gian Việt Nam, version/audit. Giá gốc từ reference; chỉ hiệu lực khi campaign bật/đúng giờ/PUBLISHED/AVAILABLE/sale<reference. Không số đã bán. Tắt campaign sau sold vẫn được.
- Home/catalogue/collection/detail3 ảnh/contact dialog/copyfallback; không wishlist trước M4. Frontend56/56 PASS; backend85 total/83 PASS/2 live skipped, verify/JAR PASS. Build PASS ngoài sandbox.
- SSRdev4200 và built4000: HTML/meta/OG/ảnh thật,404 missing book/collection và no-store PASS. Isolatedbackenddown4001:Home/catalogue/detail/sale503 PASS; sửa sale200→503 có RED/GREEN.
- Browser detail390 ảnh3/3load, không tràn ngang, Escape trả focus; copy/manualfallback có kiểm tra. Catalogue/back/tìm mã đã kiểm chứng bằng built4000; screenshot sale là response fixture browser-only, không giá giả trong DB.

## Local và điều kiện còn thiếu

- Pilot frontend4200/backend8080 phục vụ M4; QA4000/browser phiên này dừng sau bàn giao. [Quan tâm](http://127.0.0.1:4200/quan-tam), [Home](http://127.0.0.1:4200/), [admin sách](http://127.0.0.1:4200/admin/sach).
- User đã thêm CONTACT_ZALO_HOTLINE_URL/CONTACT_ZALO_GROUP_URL vào .env; backend đã restart, cả hai link có trong cấu hình public. Chưa nghiệm thu mở native Zalo trên điện thoại; copy/thủ công đã kiểm chứng.
- User đã chốt **Cloudflare Workers cho Angular SSR**, thay Pages; đã cung cấp Neon trong .env. Chuẩn hóa URL thô thành NEON_DATABASE_URL, pooled/TLS và read-only connection PASS PostgreSQL18.6/public0tables/noFlyway. DB_URL/TEST_DB_URL vẫn local; chưa migration/deploy. Render Free là đề xuất backend; chưa có VPS. SSR/auth/backup/restore vẫn gate môi trường thật.

## Tiếp theo

1. Publish main M3/M4 đã xong ở37f8919. User chốt Workers/Neon; frontend Workers local đã triển khai; bước tiếp chốt backend Render đề xuất và deployed SSR gate. Credential không phải ủy quyền migrate/deploy.
2. Tiệm thử public UX và cấu hình sale thật/linkZalo khi sẵn sàng; tiếp tục pilotM2 lên10–20 cuốn. Không xóa plan/spec còn gate chưa chuyển.
3. Cần NEON_DATABASE_URL_UNPOOLED cho Flyway (hiện chưa có), tách datasource/migration config, chốt host/region/domain hoặc /api cùng origin/cookie/CSRF và Worker runtime/SSR/cold-start. Chưa có spec M5/lệnh deploy được duyệt. Usertest chưa bổ sung thiết bị/nativeZalo; giữ gate cụ thể. ImportCSV/Excel/chỉnh sửa sau MVP.

## Tài liệu và giới hạn

- docs/README là chỉ mục duy nhất; M2_SPEC/M2_PLAN còn pilot. Markdownmax400, DEV_LOG ngoại lệ. input/.env/.local/.superpowers/output bịignore, asset nguồn/logo tracked; không commit ảnh/dump/secrets.
- Codebase graph đã index lại fast/persistencefalse trongM3; media bị default exclusion, dùng fallback khi không đủ kết quả.
