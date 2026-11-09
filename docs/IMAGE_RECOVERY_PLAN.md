# Source Mapping & Disaster Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xác minh Drive source, migrate Cloudinary có rollback và rebuild derived an toàn.
**Architecture:** Spring đọc Drive, sở hữu binding/receipt; xử lý ảnh dùng cùng queue,
lease và Sharp recipe của Storage. Operator tools gọi API OWNER, không ghi thẳng DB.
**Tech Stack:** Spring/JDBC/PostgreSQL, Google Drive API, Angular admin, Node CLI.
**Spec:** [IMAGE_RECOVERY_SPEC.md](IMAGE_RECOVERY_SPEC.md), đã duyệt 08/11/2026.
**Status:** R1–R4 và S7 đã kiểm local, tiếp theo R5. Drive thật chưa kiểm chứng.

## Global Constraints

- User xử lý thủ công khi ảnh gốc Drive bị xóa. Không xây hệ cứu nguồn đã xóa,
  backup Drive thứ hai, tự tìm ảnh thay thế hoặc hệ version retention trên Drive.
- Không có job giám sát Drive liên tục; kiểm khi mapping/rebuild hoặc operator yêu cầu.
- User dựng Ubuntu, cấu hình quyền Drive và backup DB R2 ở hạ tầng của họ.
- Không thay import CSV/XLSX thành importer ảnh, không Google Picker/sync folder.
- Không hứa RTO cố định hay website có đủ ảnh trong lúc rebuild.
- Publish LOCAL chặn nếu bất kỳ ảnh đính kèm chưa VERIFIED; thông báo chỉ rõ ảnh.
- Source metadata chỉ admin/operator; không đưa vào public JSON/ZIP tên file.
- Lô giới hạn 100 ảnh, xử lý tuần tự; dry-run mặc định, apply rõ ràng.
- Không tự xóa derived khi nguồn mất/thay đổi, không tự dùng recipe mới khi rebuild.
- Không SSH/deploy/share folder hoặc chỉnh lịch backup production; commit/push dev.

## Review Focus

1. 403/404 không đủ chứng minh file bị xóa; không xóa derived hoặc binding (R1/R2).
2. Drive đổi bytes giữa dry-run/apply hoặc giữa hai lần metadata GET (R1/R4).
3. Nhiều ảnh cùng một sách: apply tự tăng version không làm dòng kế tiếp conflict giả (R4).
4. DB restore cũ không biết file mới: quarantine, không chạy cleanup live (R5/R6).
5. Worker/dependency khác tạo output hash khác: RECIPE_MISMATCH, không overwrite (R5).

## Liên kết kế hoạch và đường dẫn

Thứ tự và M/C/T/F/D/W aliases giữ đúng [Storage plan](IMAGE_STORAGE_PLAN.md).
S1–S4 phải xong trước R1/R2; S5–S7 trước R3–R5; S8 trước R6.
`O/` = `scripts/image-system/`; `B/` = `code/backend/src/main/java/vn/memay/media/source/`.
`BT/` = `code/backend/src/test/java/vn/memay/media/source/`.
Record/queue/source schema của S2/S3 là nguồn duy nhất, không tạo bản sao DTO nội bộ.
BE/FE/RED/GREEN/commit conventions theo Storage plan; command phải dùng DB test.
Đây là một deliverable phục hồi riêng nhưng không thể bật production trước storage.

## Contract source và operation

R1 định nghĩa `DriveSourceClient.download(String fileId,UUID operationId): DownloadedSource`;
`DownloadedSource(String inputKey,String sha256,long bytes,String mime,String version)`.
Download lưu staging qua S2; decode/validate bằng S4 trước VERIFIED.
Không giao InputStream/credential Drive cho Node. `SourceAccessException` chứa safe code,
retryable và HTTP category, không raw provider response/token/URL.

R2 định nghĩa `SourceBindingService.verify(UUID mediaId,String fileId,long expectedBindingVersion,
Long expectedBookVersion,UUID requestKey,AdminUser actor): UUID` trả operation ID;
`SourceBindingRepository.requireVerifiedForBook(long bookId): void`. Actor/type lấy từ auth hiện tại, không từ client ID.
Pending source candidate không thay binding VERIFIED đang dùng trước khi kiểm thành công.

R3/R4 dùng `MigrationPreview(UUID receiptId,String digest,List<PreviewRow> rows,Instant expiresAt)`;
`PreviewRow(UUID mediaId,long bookId,long bookVersion,String role,String fileId,
String sourceSha256,String sourceVersion,String previewPath,String errorCode)`.
Receipt hết hạn 24h; digest server canonical rows, chứa expected versions/source hashes;
không gửi token, storage key hoặc source credential. Owner được xem File ID trong admin.
Apply nhận receiptId/digest/requestKey/confirmedMediaIds; chỉ chọn dòng hợp lệ đã preview.

### R1 — Drive client chỉ đọc và phân loại lỗi

**Prerequisite:** S2–S4.
**Files:** tạo `B/DriveSourceClient.java`, `B/GoogleDriveSourceClient.java`,
`B/SourceAccessException.java`, `B/DownloadedSource.java`;
sửa `code/backend/pom.xml`, `M/MediaConfiguration.java`, `.env.example`.
**Tests:** tạo `BT/GoogleDriveSourceClientTest.java`; fake HTTP server test-only.
**Interfaces:** download theo Contract; service account OAuth token scope drive.readonly;
credential file path qua `MEMAY_DRIVE_CREDENTIALS_FILE`, secret mount ngoài Git.

- [ ] RED `sourceDownloadChecksStableBytes`: fixture thay metadata version/size
  giữa before/after → reject/retry; SHA-256 khớp bytes, input quá10MiB bị ngắt.
- [ ] RED `sourceErrorsPreserveMeaning`: 403→ACCESS_ERROR, 404→SOURCE_MISSING
  với thông báo không tìm/truy cập được; 429/5xx retryable, input/permission không retry vô hạn.
- [ ] Chạy `BE(GoogleDriveSourceClientTest)` ghi RED.
- [ ] Implement Java HTTP streaming tới fixed Google API, redirect mặc định tắt;
  kiểm capabilities.canDownload/trashed/MIME/blob, metadata before/after.
  Connect10s/request60s/deadline180s; hạn3 attempts dùng cùng queue/backoff S3.
- [ ] Dùng Google auth library chính thức cho service-account credential/token,
  khóa version tại implementation; không tự viết OAuth/JWT, không cài Drive UI SDK.
  Read-only endpoint GET file metadata/media; không nhận arbitrary URL.
- [ ] GREEN BE gồm secret-redaction assertion và đổi credential/quota failure;
  commit `feat(media): add read-only Drive source verification client` cùng log.

### R2 — Binding đã xác minh và publish gate

**Files:** tạo `B/SourceBindingService.java`, `B/SourceVerificationHandler.java`,
`B/AdminSourceController.java`; sửa `M/SourceBindingRepository.java`,
`M/ImageJobDispatcher.java`, `C/BookCommandService.java`;
test `BT/SourceBindingIntegrationTest.java`, `BT/SourcePublicationGateTest.java` mới.
**Interfaces:** service theo Contract; OWNER/CSRF
`PUT /api/v1/admin/media/{mediaId}/source` body
`{fileId,bindingVersion,bookVersion?,requestKey}` →202 operation ID;
`GET .../source` →source status/versions safe DTO; status polling dùng S5 API.

- [ ] RED `onlyMatchingOriginalBecomesVerified`: SHA upload gốc==Drive SHA →VERIFIED;
  JPEG normalized legacy không giả là bản gốc; sai hash không thay source đang dùng.
- [ ] RED `allPublicationPathsRequireVerified`: LOCAL unverified chặn create/publish/
  update/replace trên PUBLISHED; hidden save/preview được; cloud legacy giữ hành vi cũ.
- [ ] RED `staleBindingCannotWin`: concurrent verify và media replacement chỉ candidate
  đúng version được commit; actor mất quyền/session expiry không ghi; audit fail rollback.
- [ ] Chạy `BE(SourceBindingIntegrationTest,SourcePublicationGateTest)` ghi RED.
- [ ] Implement VERIFY job qua dispatcher: Drive download và so hash với input gốc đã qua decode S4;
  atomic compare candidate/binding/book version, ghi audit, trả updated versions.
  Luồng temp kiểm ownership/session; luồng persisted tăng book version khi binding đổi.
- [ ] Implement requireVerifiedForBook cho LOCAL và mọi publish mutation path;
  READ status không tăng version, public không có source fields; S5 gọi cùng service.
- [ ] GREEN BE; commit `feat(media): require verified originals for local publication` cùng log.

### R3 — Manifest dry-run và preview để owner ghép ảnh

**Prerequisite:** S7, R2.
**Files:** tạo `M/ImageMigrationService.java`, `M/ImageMigrationController.java`,
`M/ImageMigrationDtos.java`, `M/ImageMigrationPreviewQueue.java`, `D/V25__image_operation_receipts.sql`,
`O/media-operations.mjs`, `O/media-operations.test.mjs`;
test `T/ImageMigrationPreviewTest.java` mới.
**Interfaces:** OWNER endpoints `/api/v1/admin/image-migrations`:
`GET /template` export CSV; `POST /preview` multipart CSV→202 operation ID;
`GET /{receiptId}` MigrationPreview; `GET /{receiptId}/photos/{mediaId}` source preview.
CLI `export`, `preview`, `show`; mặc định chỉ đọc, không tự apply.

- [x] RED `manifestIsGuarded`: duplicate/foreign/missing/role/version sai,101 ảnh
  báo lỗi từng dòng; `assertEquals(beforeBookRows, afterBookRows)` sau dry-run.
- [x] RED `previewIsOwnerOnly`: STAFF/anonymous không tải template/source preview;
  receipt hết24h trả410; không public signed/provider URL hoặc input path.
- [x] Chạy `BE(ImageMigrationPreviewTest)` và từ root
  `node --test scripts/image-system/media-operations.test.mjs` ghi RED.
- [x] Implement CSV đúng header spec bằng Commons CSV hiện có; sequential download,
  source candidate preview qua same-origin no-store. Dry-run không sửa book/media/binding;
  chỉ ghi operation/receipt/staging có TTL để apply và owner xem cặp ảnh.
- [x] CLI dùng owner session cookie/CSRF từ file0600 do operator cung cấp;
  không nhận mật khẩu/token qua argv/log; cung cấp đường dẫn admin preview và kết quả dòng.
  Preview trả ảnh cũ + nguồn qua endpoint được bảo vệ, owner xác nhận explicit danh sách ID.
- [x] GREEN BE/Node; commit `feat(media): preview Drive mappings before migration` cùng log.


Chạy CLI từ root. Đặt `MEMAY_SITE_ORIGIN` và `MEMAY_OWNER_SESSION_FILE`
trỏ tới file riêng mode `0600`, thuộc user hiện tại. File chứa JSON với
`cookie` (chỉ cookie `MEMAYSESSION`) và `csrf` (token của cùng phiên OWNER).
Giữ file phiên ngoài Git.

```sh
node scripts/image-system/media-operations.mjs export > mapping.csv
node scripts/image-system/media-operations.mjs preview mapping.csv
node scripts/image-system/media-operations.mjs show <receipt-id>
```

Mỗi trang export tối đa 100 ảnh. Nếu CLI in cursor, dùng `export <cursor>`
cho trang kế. Điền cột `drive_file_id`, giữ các cột kiểm tra như mẫu.
Khi receipt `READY`, mở `currentPhotoPath` và `previewPath` bằng trình
duyệt đang đăng nhập OWNER để đối chiếu. Dòng `INVALID` có mã lỗi riêng.
Receipt hết hạn sau 24 giờ. R4 sẽ dùng digest và danh sách media ID do
owner xác nhận để apply.

### R4 — Migration từng lô và rollback provider

**Files:** sửa `M/ImageMigrationController.java`, `M/ImageJobService.java`,
`M/LocalImageCleanup.java`, `O/media-operations.mjs`; tạo `M/ImageMigrationApplyService.java`,
`M/ImageMigrationHandler.java`, `D/V26__image_migration_apply.sql` và
`T/ImageMigrationApplyTest.java`.
**Interfaces:** `POST /api/v1/admin/image-migrations/{receiptId}/apply`
body `{digest,requestKey,confirmedMediaIds}`→202 operation;
`POST .../{receiptId}/rollback` body `{requestKey,expectedBookVersions}`→operation.
CLI `apply --receipt ... --confirm-media ...`, `rollback`; không auto confirm.

- [x] RED `changedSourceOrBookRejectsApply`: source hash/version hoặc book version
  thay đổi sau dry-run: version sai lúc nhận apply trả 409; nguồn sai lúc tải lại
  trả lỗi theo sách trong kết quả operation, giữ pointer/binding cũ.
- [x] RED `batchSameBookCommitsOnce`: nhiều ảnh cùng book kiểm expected version một lần,
  READY tất cả ảnh đã chọn của book rồi swap cùng transaction, bump book version một lần.
- [x] RED `rollbackDoesNotLoseNewUploads`: receipt migrated giữ ref cloud cũ;
  chỉ rollback pointer vẫn thuộc generation receipt; ảnh mới/thay sau đó gây conflict,
  LOCAL-only mới vẫn đọc được trên binary tương thích, không xóa ghi phát sinh.
- [x] Chạy `BE(ImageMigrationApplyTest)` ghi RED.
- [x] Implement apply re-download/recheck SHA/version, enqueue MIGRATE dùng recipe S4;
  không giữ book lock trong download. Completion gom theo book rồi recheck/swap/audit/purge;
  book khác thành công được giữ, book lỗi báo riêng, retry receipt không apply lại book đã xong.
- [x] Persist snapshot refs/book versions/source hash trong receipt; rollback recheck
  current pointer/version và đổi lại cloud có audit/purge, không drop schema.
- [x] Cleanup giữ cloud refs còn rollback; không có bulk delete cloud endpoint trong task.
- [x] GREEN BE/CLI Node tests; commit `feat(media): migrate image providers with guarded rollback` cùng log.

Cùng cấu hình CLI của R3. Tạo UUID riêng cho mỗi thao tác và dùng lại UUID đó
khi gửi lại cùng yêu cầu.

```sh
node scripts/image-system/media-operations.mjs apply --receipt <receipt-id> \
  --digest <preview-digest> --request-key <uuid> --confirm-media <media-id>
node scripts/image-system/media-operations.mjs show-apply <receipt-id>
node scripts/image-system/media-operations.mjs rollback --receipt <receipt-id> \
  --request-key <uuid-khác> --expect-book <book-id>:<applied-version>
```

Lặp `--confirm-media` cho từng ảnh đã đối chiếu và `--expect-book` cho từng
sách cần rollback. Apply trả 202 và xử lý qua queue. `show-apply` trả kết quả
theo sách, gồm version dùng cho rollback và mã lỗi nếu có. Sau lỗi do nguồn
hoặc version đổi, lập dry-run mới cho ảnh cần xử lý lại.

### R5 — Inventory và rebuild cùng recipe

**Files:** tạo `B/ImageRecoveryService.java`, `B/ImageRecoveryController.java`,
`B/ImageRecoveryHandler.java`, `B/ImageInventoryService.java`;
sửa `M/ImageJobDispatcher.java`, `M/MediaCleanupJob.java`, `O/media-operations.mjs`;
test `BT/ImageRecoveryIntegrationTest.java`, `BT/ImageRestoreIsolationTest.java` mới.
**Interfaces:** `inventory(List<UUID> mediaIds,String scope): InventoryReport`;
`rebuild(List<UUID> mediaIds,String scope,boolean apply,UUID requestKey,AdminUser actor): RecoveryReport`;
scope `published|all`, explicit IDs giới hạn100/lô, paging cho all.
OWNER GET `/api/v1/admin/image-recovery/inventory`; POST `/rebuild`, apply default false.

- [ ] RED `missingDerivedRebuildsExactManifest`: xóa fixture output, rebuild hash/key
  đúng; lặp request không job trùng; SOURCE_MISSING giữ derived còn tốt và báo mã rõ.
- [ ] RED `recipeMismatchNeverOverwrites`: recipe/config/worker digest không có hoặc
  output hash khác →RECIPE_MISMATCH; không pointer mới/overwrite key; nguồn đổi →SOURCE_CHANGED.
- [ ] RED `recoveryCannotResurrectDeletedMedia`: restart/lease hết/replace/delete giữa
  download và complete không attach lại; Ẩn vẫn Ẩn, FRONT published được ưu tiên.
- [ ] RED `restoreStartsInQuarantine`: DB dump cũ+file mới ngoài metadata được report,
  không auto attach/delete; restore mode không outbound provider/queue/cleanup.
- [ ] Chạy `BE(ImageRecoveryIntegrationTest,ImageRestoreIsolationTest)` ghi RED.
- [ ] Implement disk inventory actual existence/MIME/size/hash, paging bounded RAM;
  stale/missing đánh availability, S7 gallery fallback; không lấy cache HIT làm bằng chứng file.
- [ ] REBUILD dùng verified binding/hash/recipe pinned; download R1 →encode S4,
  chỉ công bố hash đúng. priority20 FRONT published/21 detail/22 archived/23 trash còn hạn;
  PROCESS/VERIFY có ưu tiên cao hơn; dedupe media+generation+recipe+kind.
- [ ] Thêm `MEMAY_MEDIA_RECOVERY_MODE=isolated` khóa outbound/cleanup/claim mặc định
  cho restore profile; require operator bật explicit sau kiểm namespace/mount/credentials.
  Report JSON success/fail/skip IDs, safe codes; purge sau batch, không đổi publication.
- [ ] GREEN BE/CLI; drill local backup→restore DB test khác→mất derived→partial/full rebuild;
  commit `feat(media): rebuild verified images with safe restore isolation` cùng log.

### R6 — Bằng chứng vận hành và gate cutover do owner phối hợp

**Prerequisite:** S8 và owner đã có server/Drive/R2. Đây là live gate, không giả là đã chạy.
**Files:** cập nhật `docs/IMAGE_OPERATIONS.md`, `docs/{VERIFICATION,DEPLOYMENT,PROGRESS,DEV_LOG}.md`.
**Interfaces:** dùng CLI R3–R5 và benchmark S8, không tạo pipeline recovery thứ hai.

- [ ] Bàn giao cho owner: secret env names, folder read permission, cách tải credential
  ngoài repo; xác minh service account đọc được ảnh. Nếu bị policy chặn thì ghi blocker,
  chốt OAuth read-only riêng, không tự mở scope/quyền chia sẻ.
- [ ] Owner chọn20–50 sách, dry-run mapping/preview/confirm; chạy upload và migration
  trong namespace thử. Ghi quality chữ, p50/p95/download/encode/RSS/CPU/bytes/output,
  API baseline vs có worker, tốc độ ngoài LAN. Owner chốt ngưỡng chấp nhận từ số đo.
- [ ] Owner cung cấp lịch/retention/bản backup R2; restore DB vào instance cách ly,
  kiểm counts/FK/binding/recipes/receipts, nguồn thiếu/nguồn đổi báo riêng;
  kiểm ảnh bìa đầu tiên và toàn lô, ghi thời gian thực thay vì cam kết dự tính.
- [ ] Drill rollback migrated pointer và bản code vẫn đọc LOCAL; tạo một ảnh LOCAL mới
  trước rollback để chứng minh không mất ghi mới. Không dùng rollback binary cloud-only.
- [ ] Ghi RPO theo backup DB/source coverage, RTO đo được và khoảng thiếu ảnh chấp nhận;
  owner duyệt cutover trước tắt Cloudinary. Không tự delete asset cloud hoặc deploy.
- [ ] Gộp contract/bằng chứng vào tài liệu chuẩn, giữ IMAGE_OPERATIONS làm runbook;
  chỉ xóa specs/plans và sửa README khi tất cả tiêu chí đã được chuyển/đóng.
  Commit/push dev; nếu live chưa sẵn sàng, giữ R6 unchecked và ghi bước owner cần làm.

## Coverage và self-review

Recovery spec §1–2→constraints/R6; §3→S2/R2; §4→R1;
§5→R2/S5/S6; §6→R3/R4; §7→R5/S3/S4; §8→R1/R5/R6;
§9→R5/R6; §10→R1–R6. Review Focus đủ test ở task sở hữu.
Không nhân đôi encoder/queue; signature/source enums tham chiếu S2, apply dùng R3 DTO.
Dry-run không mutate sách nhưng có receipt/staging có hạn; phân biệt với business writes.
Local software done sau R5/S8; R6 không được tick bằng mock Drive hoặc backup giả.
