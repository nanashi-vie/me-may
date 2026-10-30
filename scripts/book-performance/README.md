# Đo hiệu năng nhập sách

Spec/plan và trạng thái ở [chỉ mục dự án](../../docs/README.md).
Không dùng script này để tạo dữ liệu bán thật; không mở URL lấy từ HAR.

1. Lưu revision frontend/backend, môi trường/vùng, browser/device/viewport,
   kết nối, thời điểm, SHA256/kích thước/bytes bộ ảnh QA ngang và dọc.
2. QA DB, tài khoản và Cloudinary namespace riêng; ledger UUID chính xác của
   từng asset. Trước ghi, kiểm DB/namespace. Không cleanup toàn prefix.
3. Warm-up bỏ ngoài mẫu; 5 vòng bộ2ảnh và5vòng bộ6ảnh. Mỗi vòng tạo sách QA mới.
   Giới hạn30attempt/10phút kể cả retry/probe: chia đợt, không tăng limiter.
4. DevTools Network Preserve log: ghi upload/books/content/book/taxonomy/
   collections/audit/CSRF; xuất HAR vào `.local/book-performance/` ignored.
   Hoặc capture qua PlaywrightCLI theo skill của runtime, cùng lịch thao tác.
5. Ghi queue/normalize/JPEG bytes/upload/READY; chọn→đăng→editor dùng được và
   ảnh đầu hiện. Backend timings dùng `MEMAY_PERFORMANCE_ENABLED=true` chỉ khi đo.
6. Không gọi first-hit là cold nếu thiếu logs lifecycle. Render sleep, Neon
   resume và provider CDN trạng thái riêng. Không cộng duration request overlap.

```sh
python3 -m unittest discover -s scripts/book-performance -p 'test_*.py'
python3 scripts/book-performance/evidence.py sanitize .local/book-performance/raw.har .local/book-performance/safe.har
python3 scripts/book-performance/evidence.py summarize .local/book-performance/records.json .local/book-performance/summary.json
```

Records JSON: array các object có `environment`, `revision`, `workload` (2/6),
`warmState` (warm/cold/unknown), `group`, `durationMs` và run ID ở evidence nguồn.
Summary giữ tách các nhóm; báo cả5mẫu, median/min/max; không báo p95 cho5mẫu.
HAR sanitizer chỉ giữ route allowlist đã bỏ IDs/host/query, method/status,
bytes, startedDateTime và timings số; không giữ headers/body/PII/providerURL.
Đọc lại sanitized output trước chia sẻ. Raw HAR luôn ở local ignored.

Cloudinary upload+eager là một call; muốn đối chứng eager cần QA probe
upload-only rồi explicit eager trên asset ledger. Không coi chênh lệch các
call riêng là phân rã chính xác call cũ. Giữ đủ5derived và xem quota trước đo.
Render QA cần user deploy revision/cấu hình cách ly; local không thay phép đo online.
