# Hiệu năng nhập và xuất bản sách

Trạng thái: **user đã duyệt**, 30/10/2026, Asia/Ho_Chi_Minh.
Nguồn: checklist P0/P1/P2 và baseline người dùng cung cấp trong chat.
Phạm vi mới này không thay nghiệm thu SEO/recovery/bảo mật M5.

## 1. Mục tiêu và baseline

Giảm thời gian chủ tiệm chọn ảnh, nhập thông tin, đăng sách và xem lại kết quả.
Giữ Angular/Spring Boot, ảnh Cloudinary authenticated, quyền OWNER/STAFF,
no-store, audit, optimistic locking và final create idempotent hiện có.

Baseline người dùng ngày30/10 là thời gian request, chưa phải service timing:

| Nhóm | Thời gian |
|---|---|
| Upload một ảnh | 4,55–6,03s |
| POST tạo và publish sách | 6,18s |
| GET ảnh quản trị | 7,61–8,39s |
| GET taxonomy / collections | 4,06s / 4,26s |
| GET audit | 1,69–2,12s |

Chưa biết số mẫu, trạng thái warm hay phiên bản của từng request trên ảnh.
Không suy nguyên nhân từ thời gian request hoặc cộng các request chạy chồng lấn.
Ngày30/10 đã đọc Render dashboard: Live main24e1a3f, Free instance;
checkout dev2fc3f0b sạch. Phải ghi lại revision khi bắt đầu phép đo thực tế.

## 2. Hướng triển khai

| Hướng | Đánh đổi | Lựa chọn |
|---|---|---|
| Đo trước, tối ưu request/query/thumbnail, eager đồng bộ | Ít thay đổi lifecycle, có baseline so sánh | Theo checklist user, thực hiện trước |
| Eager async + webhook | Trả upload sớm; thêm PROCESSING/retry và readiness | Có điều kiện, chưa triển khai ở vòng này |
| Public media hoặc chuyển hosting ngay | Đổi quyền truy cập/hạ tầng, khó quy tác động | Không chọn; VPS chỉ đối chứng nếu còn chậm |

Không cam kết giảm số eager: năm bản hiện có đều có consumer.
Giữ preview1280 cho đọc chữ nhỏ,320/640 JPEG+WebP cho public.
Admin grid dùng lại JPEG320 đã có, không sinh loại thumbnail thứ sáu.
Không coi việc sửa ảnh quản trị là bằng chứng upload sẽ nhanh hơn.

## 3. P0 — phép đo có thể lặp lại

- [ ] Ghi revision frontend/backend, môi trường, vùng dịch vụ nếu đọc được,
  browser/device, kích thước cửa sổ, kết nối, bộ dữ liệu và thời điểm.
- [ ] Dùng bộ ảnh QA cố định, có ngang/dọc; ghi SHA256, kích thước, bytes.
  Mỗi vòng dùng cùng nội dung và thao tác. So sánh trước/sau cùng môi trường.
- [ ] Đo5vòng warm/workload; warm-up không tính mẫu. Xác nhận app sẵn sàng
  và chạy liên tiếp, không cố ý restart dịch vụ đang dùng để tạo cold-start.
- [ ] Render cold và Neon resume/connection warm là hai yếu tố riêng.
  Ghi first-hit riêng, chỉ gọi cold-start khi có bằng chứng logs/lifecycle;
  thiếu bằng chứng thì ghi unknown, không bỏ mẫu chậm tùy ý.
- [ ] Hai workload chính:2ảnh và6ảnh; kiểm regression3ảnh và4–5ảnh riêng.
  Giữ cùng lịch song song khi đối chiếu; mỗi vòng publish tạo một sách QA mới.
- [ ] Ghi POST upload (temporary và edit khi có), POST/books, GET content,
  GET book, taxonomy, collections, audit và CSRF. HAR gồm blocked/queue,
  DNS/connect/TLS nếu có, send/wait/receive, total, status, bytes và overlap.
- [ ] Tách thời gian queue browser khỏi normalize ảnh bằng monotonic clock:
  chọn→bắt đầu chuẩn hóa→JPEG xong→upload→READY; bytes trước/sau.
  Đo cả tổng thao tác chọn→đăng→editor dùng được và ảnh đầu tiên hiện.
- [ ] Báo median/min/max và cả5mẫu cho từng nhóm/workload. Không báo p95
  như số đại diện với5mẫu; chỉ bổ sung khi có bộ mẫu lớn hơn và ghi phương pháp.
  Không cộng median của các chặng để thay tổng elapsed thực tế.
- [ ] Lưu evidence cục bộ ignored, bản tóm tắt không nhạy cảm vào docs.
  HAR dùng allowlist metadata: bỏ Authorization/Cookie/Set-Cookie/CSRF,
  query nhạy cảm, request/response body, multipart, signed/provider URLs,
  sourceRef và PII. Kiểm sanitizer bằng fixture có secret giả trước chia sẻ.

Structured timings backend theo request correlation ID do server tạo:

- [ ] Validation/fingerprint; transaction begin intent; Cloudinary upload
  gồm eager; transaction READY; transaction publish; mapping/queries;
  content authorization/DB lookup, provider open và stream copy khi khả thi.
- [ ] Đo service transaction từ bên ngoài proxy để bao gồm commit;
  phân biệt wall time transaction, query count/elapsed và connection wait.
  Không gọi elapsed một phương thức là thời gian giữ row lock chính xác.
- [ ] Connection pool acquisition/Neon round trips được đo đúng tầng hoặc
  ghi chưa tách được. Không gán phần dư tự động cho Neon/network.
- [ ] Cloudinary upload+eager là một call đồng bộ: đo combined trước.
  Để ước lượng eager riêng, QA có đối chứng cùng ảnh upload-only rồi explicit
  eager; ghi đây là phép đo riêng, không phải phân rã chính xác request cũ.
- [ ] Flyway là startup work; đọc logs startup riêng, không quy vào POST/books.
- [ ] Logs chỉ có operation/phase/status/duration/count/bytes/correlation ID;
  không log URL provider, headers, SQL bindings, payload, tên sách hay ảnh.
  Timings opt-in cấu hình, overhead thấp; không thêm telemetry vendor.

## 4. P1 — ảnh quản trị

- [ ] Grid dùng JPEG320 qua endpoint admin; detail viewer giữ JPEG1280.
  Thêm size allowlist rõ ràng, default1280 tương thích URL cũ.
- [ ] Áp dụng cả ảnh đã lưu và ảnh temporary nếu tải qua server.
  Blob preview vừa chọn tiếp tục local; không fetch thumbnail không cần thiết.
- [ ] Giữ auth/ownership/publication rules cũ, no-store/nosniff/MIME đúng,
  không redirect hoặc đưa signed URL ra frontend. STAFF đọc đúng quyền.
- [ ] Ảnh ngoài viewport lazy, decoding async; ảnh đang xem không bị trì hoãn
  vô lý. Khung có tỷ lệ/kích thước ổn định, contain, giữ ngang/dọc/EXIF.
- [ ] Viewer mở ảnh lớn theo thao tác, có đóng bằng phím/Escape và trả focus;
  kiểm đọc chữ nhỏ và xem tình trạng ảnh thật. Lỗi ảnh có retry riêng.
- [ ] Ảnh cũ thiếu320 fallback1280 tại backend chỉ khi provider báo thiếu
  derived variant; không fallback từ lỗi401/403/timeout/5xx và không lộ gốc.
  Public fallback hiện có giữ nguyên; không backfill catalogue bán thật.
- [ ] DRAFT không còn trong luồng hiện hành; kiểm temporary/HIDDEN/ARCHIVED,
  dữ liệu legacy sau migration thay vì tạo lại tính năng nháp.

## 5. P1 — upload

- [ ] Giữ cạnh dài≤2560/JPEG0,85/white alpha/EXIF và giới hạn10MB/25MP.
  Code hiện sourceImageInfo bị gọi ở queue và prepareImage; chỉ bỏ đọc lặp
  sau khi đo, vẫn giữ validation ở entrypoint standalone và ở backend.
- [ ] Kiểm consumer năm eager; chỉ giảm nếu loại consumer tương ứng bằng
  quyết định được duyệt. Không bỏ1280 hoặc WebP chỉ để đạt số ít variants.
- [ ] Chuẩn bị trước tối đa1ảnh kế tiếp khi ảnh trước upload; cap decode
  concurrency1, bộ nhớ bounded, giữ một lần commit/upload và error từng ảnh.
- [ ] Giữ upload/commit tuần tự cho edit có book version. Đánh giá2upload
  song song chỉ với temporary session sau đo tuần tự/prefetch.
- [ ] Nếu thử2temporary uploads: giữ cap toàn backend4 và30attempt/10phút
  hiện có, idempotency key từng ảnh, session lock và limit6 gồm UPLOADING.
  Role assignment độc lập thứ tự hoàn tất; final chỉ khi đủ READY.
  Kiểm replace/remove/cancel/expire/lost response đồng thời trước bật.
- [ ] Giữ eager sync. Không bật async, thêm PROCESSING hoặc webhook ở vòng
  này nếu chưa có thiết kế/duyệt bổ sung theo điều kiện checklist.

## 6. P1 — publish và điều hướng

- [ ] Profile query count/elapsed final transaction gồm role/session locks,
  book/listing/variants/media/taxonomy/collections và audit.
  Tránh N+1 theo số entity và round-trip dư; không gộp query gây nhân hàng.
- [ ] Chỉ tối ưu query đã đo; giữ atomic final, fingerprint/idempotency,
  ownership, version conflict, audit và rollback. Không chạy provider trong
  transaction giữ lock. Không dùng Flyway migration để chữa query chưa đo.
- [ ] Chuyển BookDetail đã xác nhận từ POST sang route edit bằng one-shot
  in-memory handoff đúng ID và auth epoch. Không persist detail trong URL,
  localStorage/history state. Refresh/deep-link fetch server như thường.
  Xóa seed khi dùng/logout/401, không ghi đè sửa mới bằng response cũ.
- [ ] Taxonomy/collections cache memory trong phiên, dedupe in-flight;
  clear khi logout/đổi user/401, reset errors để retry. Collections invalidate
  sau create/update; tab khác có TTL ngắn và refresh thủ công rõ ràng.
  Không cache quyền auth hoặc dữ liệu media; backend vẫn validate trước ghi.
- [ ] Audit chỉ tải khi mở panel; khi version đổi đánh dấu stale và chỉ
  fetch nếu đang mở. Chặn response cũ ghi đè, hủy request khi destroy.
- [ ] Publish có trạng thái đang lưu/đã đăng; tải ảnh hoặc audit lỗi sau đó
  không biến thành publish thất bại. Khi chưa chắc response, giữ payload/
  session và retry cùng lần tạo, không tự tạo session hoặc sách thứhai.

## 7. P2 — kiểm chứng và điều kiện kết thúc

- [ ] Backend/frontend regression liên quan và full checks theo plan;
  NodeSSR/Workers build, proxy auth/content headers khi endpoint thay đổi.
- [ ] Browser2–6ảnh, ngang/dọc/EXIF/ảnh cũ thiếu320; grid/viewer/keyboard;
  temporary/HIDDEN/ARCHIVED không lộ public; OWNER/STAFF/anonymous đúng quyền.
- [ ] Timeout/retry/lost publish response/refresh/replace/remove/cancel/
  expire/multi-tab409; không trùng book/asset, không cleanup nhầm production.
  Refresh chỉ khôi phục theo contract hiện có; không hứa giữ File qua reload.
- [ ] Đo lại5vòng/mỗi workload, ghi bytes/query count/request count và elapsed.
  Mục tiêu: loại GET trùng sau publish khi seed hợp lệ; không gọi audit khi
  đóng; grid request320 khi có; chứng minh giảm request/bytes và quan sát
  elapsed. Không tuyên bố nhanh hơn nếu median không giảm ngoài dao động.
- [ ] Mỗi thay đổi có đối chứng và rollback riêng. Nếu dịch vụ vẫn chậm sau
  giảm round trips, so Render warm với VPS QA có sẵn, cùng revision/data/
  ảnh/browser/lịch request/vùngDB. Thiếu VPS ghi gate, không mua/tạo host.
- [ ] Đọc health/logs/Neon quota/Cloudinary usage khi có quyền; không tăng
  plan/quota hoặc bỏ limit/audit/security để đạt hiệu năng.

## 8. Môi trường, triển khai và bàn giao

Benchmark ghi/publish chỉ trên DB QA riêng, tài khoản QA và Cloudinary
memay/test hoặc memay/online-test có ledger asset từng run. Production chỉ
đọc baseline hiện có/health, không đăng sách giả lên catalogue đang bán.
Cleanup theo UUID trong ledger + namespace + kiểm không được production
tham chiếu; không xóa theo prefix toàn bộ. Không xóa ảnh nguồn người dùng.

Phép đo5vòng upload/publish2/6ảnh phải chia đợt tôn trọng30attempt/10phút,
tính cả upload-only/eager đối chứng và retries; không nới limiter để đo.
Giảm số mẫu ghi nếu quota thực tế không đủ thì báo partial, không ghiPASS.

Online hiện trỏ main; agent code/test/commit/pushdev, user merge/deploy như
workflow đã chốt. Muốn đo instrumentation và bản mới trên Render cần user
deploy bản QA với DB/media cách ly. Không suy local là Render warm.
Chưa có môi trường đó không chặn chuẩn bị code/QA local, nhưng giữ các
ô online tương ứng chưa hoàn tất và báo rõ dependency, không tự deploy.

Sau duyệt thiết kế: writing-plans tạo task thực thi; sau hoàn thành gộp
contract/evidence vào tài liệu chuẩn và gỡ spec/plan hết vai trò.
