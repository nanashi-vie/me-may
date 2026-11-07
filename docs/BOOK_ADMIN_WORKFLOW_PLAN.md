# Kế hoạch triển khai quản trị sách

> Dùng Superpowers Subagent-Driven Development hoặc Executing Plans. Mỗi
> phần có vòng kiểm thử trước và sau khi sửa.

**Mục tiêu** Hoàn tất bốn thay đổi đã duyệt cho quản trị sách.

**Kiến trúc** Angular dùng các form, route và client hiện có. Spring Boot dùng
giao dịch PostgreSQL cho visibility, xuất bản, xóa và khôi phục. Tác vụ định
kỳ dọn sách hết hạn, ghi yêu cầu dọn ảnh bền vững trước khi gọi Cloudinary.

**Stack** Angular standalone, Vitest, Spring Boot, JDBC, Flyway, PostgreSQL.

**Spec** [Thiết kế đã duyệt](BOOK_ADMIN_WORKFLOW_SPEC.md).

## Ràng buộc chung

- Làm từ `dev`. Chạy dữ liệu giả trên PostgreSQL test. Bàn giao qua `dev`.
- Giữ OWNER, CSRF, version và audit cho các thao tác ghi. Hành vi read-only
  của STAFF theo contract hiện có.
- Giữ ảnh mặc định riêng tư, tương thích payload cũ và receipt Excel cũ.
- Tái sử dụng truy vấn và component hiện có, không thêm dependency.
- Mỗi phần chạy ca hồi quy trước khi viết code, chạy lại sau khi sửa và
  commit khi kết quả đạt. Lệnh Maven dưới đây chạy từ `code/backend` với
  cấu hình test local. Lệnh npm chạy từ `code/frontend`.

## Trọng tâm rà soát

- Ảnh 7/8 thay file hoặc đổi từ role công khai sang role bổ sung phải tắt
  visibility nếu chủ tiệm chưa chọn bật cho ảnh đó. Phần 1.
- Lỗi Cloudinary hoặc tiến trình dừng sau commit vẫn còn dữ liệu để thử lại
  việc dọn ảnh. Phần 3.
- Khôi phục đúng thời điểm hết hạn và chạy dọn đồng thời không sinh bản ghi
  nửa khôi phục. Phần 3.
- Biên nhận lô có cả sách còn sống lẫn sách đã dọn vẫn mở được cuốn còn sống.
  Phần 3.
- Route đổi ID ngay trong cùng component editor vẫn chặn rời khi chưa lưu.
  Kết quả xuất bản đã lưu phải được báo ngay cả khi không tải được cuốn tiếp.
  Phần 5.

## 1. Hai ảnh bổ sung và đặc điểm

**Phạm vi** `V17__book_media_visibility_and_features.sql`, `BookDtos`,
`BookEntryInput`, `BookCommandService`, `BookQueryService`,
`UploadSessionTransactions`, `BookMapper`, `PublicCatalogueService`,
`PublicCatalogueController` và `book.models.ts`, `book-upload-queue.ts`,
`book-media-panel`, `book-editor`.

- [ ] Mở rộng `BookMediaFeatureContractTest`. Dùng payload cũ để xác nhận
  hai ảnh bổ sung trả 404 cho khách. Bật từng ảnh, kiểm gallery theo thứ tự
  và endpoint ảnh trả 200. Tắt lại thì cả gallery và ảnh trực tiếp phải
  loại ảnh đó. Kiểm tạo mới, đổi role và thay ảnh. Kiểm preview quản trị.
  Kiểm taxonomy không cung cấp SPIN nhưng sách cũ vẫn hiện **Xoay chuyển**.
- [ ] Chạy `mvn -Dtest=BookMediaFeatureContractTest test`, xác nhận thất bại
  ở hành vi visibility hoặc taxonomy mới.
- [ ] Thêm `book_media.show_on_product boolean not null default false`.
  Chỉ đọc cờ cho INTERNAL_1/2. Bổ sung `showOnProduct?: boolean` trên
  MediaAssignment, MediaMetadata và MediaView, giữ payload cũ hợp lệ. Ở
  update giữ giá trị ảnh cũ khi field vắng mặt và role bổ sung giữ nguyên.
  Thay file hoặc chuyển ảnh sang role bổ sung mặc định tắt trừ lựa chọn
  rõ ràng cho đúng ảnh và role. Lưu trong giao dịch create/update hiện có,
  đưa vào đối chiếu khi chưa rõ kết quả ghi, audit và vô hiệu cache.
- [ ] Dùng chung predicate public cho SQL gallery và ảnh trực tiếp, đồng
  thời áp dụng tương đương cho preview. Giữ projection public chỉ có
  thuộc tính ảnh công khai. Sắp hai vai trò bổ sung sau sáu role hiện tại.
- [ ] Migration cập nhật TOUCH, vô hiệu SPIN, thêm SEARCH và OTHER_INTERACTION
  với nhãn đã duyệt. Giữ feature code, thứ tự gán và giới hạn hiện tại.
- [ ] Bổ sung test cho media panel/upload queue về giá trị mặc định, đổi
  độc lập hai checkbox và trạng thái sau thay file. Thêm checkbox vào hai
  role bổ sung và đưa giá trị vào payload, kiểm bằng `npm test -- --watch=false`.
  Chạy lại test backend và commit.

## 2. Xóa mềm và khôi phục ở backend

**Phạm vi** `V18__book_trash.sql`, `AdminBookController`, `BookQueryService`,
`BookAccess`, `BookStatusService`, `BookCommandService`, `HomeFeaturedService`,
`MediaTransactions`, `AdminMediaController`, `AuditService`. Thêm
`BookTrashService` và `BookTrashApiTest`.

**Giao diện** `GET /api/v1/admin/books/trash?page=&size=` trả
`Page<TrashBook>` với `id, bookCode, title, version, deletedAt, expiresAt`.
`PATCH /api/v1/admin/books/{id}/trash` nhận
`{version, trashed}`, trả 204, từ chối sai version bằng 409. Khôi phục hết
hạn trả 409 `trash_expired`.

- [ ] Tạo ca HTTP cho OWNER/STAFF, stale version, khôi phục trước hạn, xóa
  khi đã đăng, public 404 cả detail và ảnh, admin list/candidate/queue loại
  sách đã xóa, restore về Ẩn và giữ publishedAt cũ. Kiểm đường ghi sách
  thường và media không thể sửa hoặc đăng sách đã vào Thùng rác.
- [ ] Chạy `mvn -Dtest=BookTrashApiTest test`, xác nhận route còn thiếu.
- [ ] Thêm `book_copy.deleted_at timestamptz` và index thời gian cho các
  dòng có deleted_at. Khi xóa, khóa dòng và kiểm version, cập nhật trạng
  thái Ẩn cùng giao dịch. Khi khôi phục, kiểm chưa quá hạn và giữ Ẩn.
  Dùng cùng mốc `deletedAt + Duration.ofDays(7)` để tính expiresAt và
  kiểm quyền khôi phục. Giữ metadata, ghim, Flash Sale và audit. Cập nhật
  version và cache theo đường ghi hiện có.
- [ ] Lọc deleted_at trong query quản trị thông thường và các candidate
  theo sách. Chặn các đường ghi, gồm sửa ảnh sau khi đã lấy khóa tương ứng.
  Giữ kiểm tra tên trùng với sách đang trong Thùng rác. Test phải chứng
  minh điều kiện Ẩn chặn mọi public projection hiện có.
- [ ] Chạy lại `mvn -Dtest=BookTrashApiTest,PublicCatalogueApiTest,BookEntryContractTest,HomeFeaturedApiTest test` và commit.

## 3. Dọn sách và ảnh sau hạn

**Phạm vi** `V19__book_trash_cleanup.sql`, `BookTrashService`, tác vụ
`BookTrashCleanupJob`, `MediaCleanupJob`, `BookImportStore`,
`BookImportDtos`, `book-import-models.ts` và `book-import.html`.

**Giao diện** Thêm `purged: boolean` cho từng item của receipt. Giữ id, mã
và tên snapshot. Thêm `purgeExpired(Instant now)` vào service nội bộ.
Job định kỳ lấy theo lô có giới hạn, gọi service qua Spring transaction.

- [ ] Thêm ca dùng Clock kiểm 7 ngày trừ 1 giây, đúng mốc 7 ngày, job chạy
  lại, tranh chấp với restore, receipt trộn sách đã dọn và chưa dọn, và
  gateway xóa ảnh thất bại rồi thành công ở lượt sau. Thêm DOM test cho
  receipt chỉ hiện nhãn **Đã xóa vĩnh viễn** ở dòng đã dọn.
- [ ] Chạy `mvn -Dtest=BookTrashApiTest test` và frontend test để thấy các
  ca mới thất bại trước thay đổi.
- [ ] Tách snapshot ID trên receipt khỏi FK bắt buộc, giữ lại ID lịch sử
  và đánh dấu purged trong cùng giao dịch. Dọn tham chiếu upload session
  đã tiêu thụ mà vẫn chặn replay tạo sách lại. Rà tất cả FK của listing và
  book_copy, xóa liên kết ghim/Flash Sale/collection/đặc điểm/tuổi/variant
  khi dọn sách. Giữ audit.
- [ ] Ghi hàng đợi xóa ảnh bền vững theo storage_public_id trước khi xóa
  bản ghi ảnh. Dùng mẫu thử lại của MediaCleanupJob, xác nhận deleted hoặc
  not found rồi xóa công việc. Khóa và kiểm lại deleted_at trước khi dọn
  để khôi phục hợp lệ và dọn hết hạn chỉ có một bên thắng.
- [ ] Trả receipt lịch sử ở cả preview và confirm, chỉ hiện link cho item
  còn tồn tại. Chạy lại các ca mới và `mvn -Dtest=BookImportApiTest,BookImportTransactionTest test`, commit.

## 4. Thùng rác trên giao diện quản trị

**Phạm vi** `book-api.ts`, `book.models.ts`, `book-list` và route nếu cần.

- [ ] Thêm DOM test cho icon sau cột **Cập nhật**, STAFF không có thao tác,
  tên/mã và cảnh báo 7 ngày, đóng hoặc Hủy không gọi PATCH, đồng ý gọi một
  lần, 409 làm mới dữ liệu, và hiển thị hạn theo Asia/Ho_Chi_Minh.
- [ ] Chạy `npm test -- --watch=false` để xác nhận các ca mới thất bại.
- [ ] Dùng dialog có quản lý focus và API phần 2. Thêm mục **Thùng rác**
  trên danh sách cho OWNER, đọc theo trang và có nút **Khôi phục** trước
  hạn. Sau thao tác thành công làm mới dữ liệu ở trang hợp lệ. Lỗi mạng
  giữ trạng thái, hiển thị kết quả và tránh gửi lặp khi đang chờ.
- [ ] Chạy lại frontend test, xác nhận DOM và commit.

## 5. Danh sách chưa xuất bản và chuyển cuốn

**Phạm vi** `book-editor`, component con `unpublished-book-queue`,
`book-api.ts`, `app.routes.ts` nếu cần. Dùng `BookApi.list` với
`unpublishedOnly=true` và thứ tự query hiện hành.

- [ ] Mở rộng `book-editor.spec.ts` hoặc test component con. Chốt các ca:
  panel đánh dấu cuốn đang mở, tìm và đổi trang, click khi form dirty bị
  chặn, lưu thường ở nguyên form, nút xuất bản tiếp mở kết quả đầu không
  theo từ khóa panel, hết kết quả hoặc lỗi tải thì ở lại, lỗi xuất bản
  giữ form. Test cùng component khi route chỉ đổi ID.
- [ ] Chạy `npm test -- --watch=false` để xác nhận các ca mới thất bại.
- [ ] Tích hợp panel cuộn riêng bên phải desktop, dialog từ nút có số lượng
  trên màn hình hẹp. Dùng guard đang có, kiểm cả thay đổi form, upload
  và kết quả ghi chưa rõ. Sau xác nhận xuất bản, làm mới hàng chờ và dùng
  query riêng không có từ khóa để chọn cuốn đầu đủ điều kiện. Khi lần ghi
  chưa rõ, chỉ đối chiếu trạng thái, giữ người dùng ở cuốn đang mở.
- [ ] Chạy lại frontend test và commit.

## Nghiệm thu và bàn giao

- [ ] Chạy toàn bộ `mvn test`, `npm test -- --watch=false`, `npm run build`,
  `npm run build:workers` và `git diff --check`.
- [ ] Smoke local desktop và màn hình hẹp bằng sách/ảnh giả. Đối chiếu chuỗi
  xuất bản nhiều cuốn, hộp thoại xóa, Thùng rác và link ảnh của khách.
- [ ] Review toàn nhánh, ghi giới hạn và cập nhật tài liệu contract/rollout.
  Gộp quyết định vào tài liệu hiện hành, cập nhật PROGRESS/DEV_LOG, gỡ
  spec/plan hết vai trò cùng lúc và bàn giao `dev`.
