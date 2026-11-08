# Source Mapping & Disaster Recovery

Ngày 08/11/2026. Thiết kế chi tiết để duyệt trước implementation.
Phụ thuộc [Image Storage & Processing](IMAGE_STORAGE_SPEC.md).
Nguồn: draft user cung cấp; cập nhật quyết định S054-C02/C03.

## 1. Mục tiêu và ranh giới

Ảnh gốc giữ trên Google Drive của cửa hàng; PostgreSQL giữ metadata.
Derived trên SSD có thể dựng lại từ đúng nguồn và đúng recipe; không bắt buộc
backup hằng ngày toàn bộ derived sau khi quy trình đã được kiểm chứng.

- User xử lý thủ công khi ảnh gốc Drive bị xóa. Không xây hệ cứu nguồn đã xóa,
  backup Drive thứ hai, tự tìm ảnh thay thế hoặc hệ version retention trên Drive.
- Vẫn báo SOURCE_MISSING khi verify/rebuild không tìm thấy file, giữ derived còn tốt.
  Không có job giám sát Drive liên tục; kiểm khi mapping/rebuild hoặc operator yêu cầu.
- User dựng Ubuntu, cấu hình quyền Drive và backup DB R2 ở hạ tầng của họ.
  Agent bàn giao code/tool, mẫu manifest và hướng dẫn kiểm chứng; không tự đăng ký
  Google project, chia sẻ folder, SSH hoặc đổi lịch backup production.
- Không thay import CSV/XLSX thành importer ảnh, không Google Picker/sync folder.
- Không hứa RTO cố định hay website có đủ ảnh trong lúc rebuild.

## 2. Phương án

Một spec chung dễ đọc tổng thể nhưng trộn upload với recovery operations.
Tách hai spec giúp nghiệm thu độc lập; phần này sở hữu source metadata và recovery,
Storage sở hữu recipe/variants/queue/output publication. Không nhân bản các contract.

Đề xuất dùng manifest cho backfill/migration và File ID cho ảnh mới.
Picker có UX thuận tiện hơn nhưng thêm OAuth UI và scope; ngoài phạm vi đầu tiên.
Không dùng filename hoặc URL chia sẻ để tự đoán ảnh thuộc sách nào.

## 3. Metadata và trạng thái nguồn

| Field | Quy tắc |
|---|---|
| mediaId | UUID hiện có, khóa liên kết chính; không chỉ dựa book code/role |
| sourceProvider | GOOGLE_DRIVE |
| sourceFileId | File ID chuẩn, không URL tải tùy ý |
| sourceSha256 | SHA-256 bytes tải thật từ Drive, backend tính |
| sourceBytes/MIME | Metadata kiểm chứng; không tin MIME khai báo đơn lẻ |
| sourceVersion | Version/revision nếu API trả; hỗ trợ chẩn đoán, hash quyết định |
| verifiedAt | Thời điểm xác minh; không hứa nguồn vẫn tồn tại về sau |
| sourceStatus | UNVERIFIED, VERIFIED, SOURCE_MISSING, SOURCE_CHANGED, ACCESS_ERROR |
| bindingVersion | Chống ghi đè mapping cũ, cùng cơ chế version/audit |

Recipe version, output hash và generation thuộc contract Storage.
sourceRef cũ tiếp tục là ghi chú tùy chọn, không tự coi là binding đã xác minh.
Không có Visibility/PUBLIC/PRIVATE hoặc metadata ảnh nội bộ.
Source metadata chỉ admin/operator; không đưa vào public JSON/ZIP tên file.

## 4. Truy cập Google Drive

Backend tải blob qua Drive API bằng File ID với credential do operator cấu hình.
Đề xuất service account được chia sẻ quyền đọc thư mục ảnh gốc; chỉ đọc/download,
không upload, delete, sửa metadata hoặc tự mở quyền chia sẻ.
Nếu tài khoản/chính sách Drive không cho phép cách này, dừng tích hợp live để chốt
OAuth read-only; không âm thầm yêu cầu quyền toàn Drive hoặc dùng cookie trình duyệt.
Credential nằm trong secret/env config, không manifest/source control/log.

- Kết nối tới API host cố định, không nhận arbitrary URL; bounded timeout/bytes,
  không theo redirect sang host không được phép. Không tải Google Docs export.
- Xác minh quyền download, file chưa trashed, là blob ảnh được hỗ trợ.
- 401/403 không kết luận file đã xóa; ACCESS_ERROR báo quyền/config/quota phù hợp.
  404 có thể không phân biệt mất file với không được thấy: báo không tìm/truy cập
  được nguồn, không tự xóa binding hoặc derived. 429/5xx retry có giới hạn.
- Tính SHA-256 khi stream vào staging, kiểm giới hạn 10 MiB/25 MP và decode
  như Storage. Không giữ toàn bộ lô ảnh trong RAM.
- Cập nhật metadata giữa lúc tải: kiểm version/size trước và sau download;
  nếu không ổn định, retry thay vì gắn hash cho revision không đúng.

## 5. Ảnh mới và xác minh binding

Self-host upload giữ bytes gốc như Storage; owner có thể nhập File ID ngay hoặc
bổ sung qua metadata sau upload. Chưa mapping vẫn xử lý/preview/lưu sách Ẩn được.
Publish LOCAL chặn nếu bất kỳ ảnh đính kèm chưa VERIFIED; thông báo chỉ rõ ảnh.
Đây là đề xuất để bảo đảm mọi ảnh production LOCAL có khả năng phục hồi.

1. Backend ghi inputSha256 khi upload gốc; sourceStatus mặc định UNVERIFIED.
2. Owner gắn File ID; backend tải file thật và kiểm SHA-256 trùng inputSha256.
3. Trùng → VERIFIED, ghi audit/version; không trùng → lỗi binding, không thay ảnh.
4. User chọn lại đúng file gốc hoặc thực hiện replacement mới từ nguồn mong muốn.
5. File local không tự được copy lên Drive; user phải lưu nguồn vào Drive trước.

Không lấy hash JPEG browser-normalized của Cloudinary làm hash ảnh gốc.
Nếu một ảnh LOCAL đang VERIFIED đổi source binding, giữ binding đang dùng
cho đến khi binding mới được kiểm; không gắn nguồn mới vào generation cũ.
Khi nội dung nguồn khác, phải tạo media/generation mới qua replacement.

## 6. Mapping và chuyển ảnh Cloudinary cũ

Manifest CSV UTF-8: media_id, book_code, role, drive_file_id, expected_book_version.
media_id là khóa; book_code/role là guard chống ghép nhầm. Không có credential/URL.
Operator xuất manifest template từ DB qua công cụ được xác thực; điền File ID.
Dry-run kiểm duplicate/missing/foreign ID/version, quyền đọc, file hash và decode;
báo rõ từng dòng, không sửa sách/asset. Lô giới hạn 100 ảnh, xử lý tuần tự.

Ảnh cloud có thể đã nén nên không thể xác minh ghép nguồn bằng so hash cloud.
Owner xác nhận cặp ảnh cũ/ảnh nguồn qua preview trước apply. Apply dùng receipt
của dry-run và hash manifest, recheck book/source version/hash tại thời điểm ghi.
Sai khác phải dry-run lại; không tự chấp nhận ảnh nguồn đã thay đổi.

Tạo generation LOCAL từ chính bytes Drive, giữ media identity và Cloudinary ref
để rollback; chỉ đổi serving pointer sau output READY và xác nhận ghép đúng.
Không đánh VERIFIED chỉ vì File ID tồn tại. Không xóa cloud khi apply xong.
Retry apply cùng receipt trả cùng kết quả, không tạo generation hoặc audit trùng.
Không chuyển nhầm ảnh mới được thay bởi người khác trong lúc dry-run.

## 7. Recovery dùng chung pipeline

Operator tool có dry-run mặc định và apply rõ ràng, phạm vi media IDs hoặc
published/all; quyền OWNER và audit. Không có thao tác phá hủy tự chạy trên live.
Dùng chung queue, recipe và lease Storage, kind VERIFY/REBUILD/MIGRATE;
không viết lại encoder riêng trong script recovery.

1. Inventory đối chiếu metadata với file thật trên SSD, MIME/size/hash.
2. Chỉ enqueue thiếu/hỏng hoặc rebuild được yêu cầu; dedupe theo media/generation/recipe.
3. Tải nguồn và so sourceSha256 đã lưu; thiếu/khác/quyền lỗi thì báo trạng thái,
   giữ mọi derived còn tốt. Không tạo ảnh mới dưới URL cũ từ nguồn đã đổi.
4. Recipe cũ phải còn image/config digest dùng được; không tự dùng recipe mới.
5. Tạo output staging, xác minh toàn bộ manifest, rồi công bố atomically.
6. Nếu bytes tái tạo đúng hash cũ, có thể khôi phục key cũ. Nếu hash khác,
   báo RECIPE_MISMATCH và dừng công bố; operator điều tra, không overwrite immutable key.
7. Recheck media còn thuộc sách, generation không bị thay và chưa DELETE_PENDING.
   Sách đã chuyển Ẩn vẫn có thể phục hồi file nhưng tuyệt đối không tự xuất bản.
8. Tiếp tục được sau restart; báo tổng số thành công/thất bại/skip và lý do từng ảnh.

Ưu tiên: FRONT sách PUBLISHED → ảnh khác PUBLISHED → sách ARCHIVED → Thùng rác
còn thời gian giữ. Trong project, ARCHIVED chính là Ẩn; không tạo thêm trạng thái.
Không phục hồi media đã dọn vĩnh viễn chỉ vì còn bản gốc trên Drive.
Job nhập/thay ảnh tương tác được ưu tiên trước bulk recovery, cùng giới hạn tài nguyên.

## 8. Tình huống vận hành

| Sự cố | Xử lý |
|---|---|
| Mất một vài derived | Inventory, rebuild có scope, kiểm checksum và endpoint |
| Hỏng SSD/cài lại Ubuntu | Owner dựng lại; restore DB, secrets/config, recipe; inventory/rebuild |
| Mất điện/Internet | Khởi động lại service, health/lease checks; không rebuild nếu file còn tốt |
| Người dùng xóa nguồn Drive | Báo nguồn thiếu; user tự xử lý thủ công; giữ derived hiện có |
| Nguồn bị thay nội dung | SOURCE_CHANGED; user xác nhận replacement mới, không đổi key cũ |
| Drive hết quyền/quota | ACCESS_ERROR/retry có giới hạn; không coi là mất ảnh vĩnh viễn |

Recovery phục hồi từng phần. Public gallery chỉ trả variant đang có và hợp lệ;
ảnh thiếu không phát URL biết chắc hỏng. Nếu FRONT thiếu, thẻ dùng placeholder
có kích thước cố định; không dùng ảnh sách khác, không tự đổi publication/availability.
Lỗi bất ngờ giữa inventory và GET vẫn xử lý fallback UI; recovery không chạy inline GET.
Sau từng batch phục hồi, invalidate public cache để ảnh mới sẵn sàng xuất hiện.

## 9. Backup và tính nhất quán

DB backup R2 là yêu cầu giữ nguyên từ user, chưa có bằng chứng vận hành trong repo.
Trước cutover cần owner cung cấp/ghi nhận lịch, retention, bản backup và restore drill;
không thay lịch hoặc tuyên bố RPO đã đạt từ cấu hình mẫu.

- Backup DB chứa nguồn/binding, recipe, variants, pointers, job/receipt và audit.
- Ghi nhận timestamp backup, app/schema revision và recipe image digest.
- Restore vào DB cách ly trước; khóa outbound queue/cleanup mặc định, không kết nối
  nhầm Cloudinary hoặc xóa ảnh live. Kiểm counts/FK/pointer và source sampling.
- Chỉ bật worker sau khi đặt lại lease quá hạn, xác minh namespace/mount/credential.
- File tồn tại nhưng không có record trong DB restore: quarantine/report,
  không tự attach vào sách hoặc quét xóa ngay.
- Bản backup DB cũ có thể thiếu mapping mới; Drive còn file không đủ để biết
  sách/role tương ứng. RPO media phụ thuộc backup metadata, không chỉ Drive.
- Không cần daily full derived backup sau khi drill đạt; trước đó giữ cloud refs
  và derived đang có, không xóa để ép chứng minh rebuild trên production.
- Không backup source credentials trong dump tài liệu; owner có cách khôi phục
  secret ngoài repo để reconnect Drive/R2 khi máy hỏng.

## 10. Nghiệm thu và bàn giao

- Mapping đúng/sai/duplicate/foreign/version conflict; audit và quyền OWNER.
- Upload mới hash khớp; browser-normalized legacy không được giả là nguồn gốc.
- Fake Drive tests: 404/403/429/timeout/changed bytes/oversize; không xóa derived.
- Manifest dry-run chỉ đọc; apply stale bị từ chối, retry idempotent;
  migration cloud → local → rollback giữ sách/ảnh mới phát sinh.
- Xóa một derived trên fixture, rebuild đúng bytes/key và public/admin/ZIP đọc được.
- Restart worker, lease cũ, asset bị thay/xóa trong lúc tải: không ghi đè ảnh mới.
- Restore DB fixture + mất toàn bộ derived; phục hồi từng phần, ảnh bìa trước;
  các ảnh nguồn mất báo riêng để owner xử lý thủ công.
- Live gate do owner phối hợp: Drive read-only thật, 20–50 sách chọn trước,
  backup R2 restore vào DB cách ly, đo RTO đến ảnh bìa đầu tiên và toàn bộ lô.
- Đo thời gian download/encode, bytes/RSS/CPU, ảnh lỗi và throughput cùng máy;
  không ngoại suy 24.000 ảnh từ một ảnh hoặc cam kết RTO trước benchmark.
- RPO theo lịch DB thực tế và coverage mapping; ghi rõ ảnh sau backup có nguy cơ mất
  liên kết. Owner chấp nhận thiếu một phần ảnh trong thời gian rebuild trước cutover.
- Theo dõi số UNVERIFIED/MISSING/CHANGED/ACCESS_ERROR và job FAILED; log dùng
  ID/mã lỗi, không secret hoặc tên file chứa dữ liệu riêng.
- Bàn giao cách tạo manifest/verify/rebuild/restore/rollback, env names và checklist
  server để owner thực hiện. Không đòi agent dựng Ubuntu để hoàn tất code local.

## 11. Nguồn và giới hạn

- [Drive downloads](https://developers.google.com/workspace/drive/api/guides/manage-downloads):
  API tải blob và kiểm quyền download; manifest không thay quyền truy cập nguồn.
- Baseline: [DEPLOYMENT](DEPLOYMENT.md), [CATALOGUE](CATALOGUE.md),
  [ARCHITECTURE](ARCHITECTURE.md), [Storage spec](IMAGE_STORAGE_SPEC.md).
- Các lựa chọn service account/File ID/publish gate ở trên là đề xuất thiết kế,
  cần duyệt cùng tài liệu trước implementation; cấu hình live owner phụ trách.
