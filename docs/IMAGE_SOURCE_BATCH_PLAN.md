# Kế hoạch nhập ảnh Drive theo lô

> Agent thực thi dùng superpowers:executing-plans theo phương thức Native
> đã chọn trong phiên. Làm từng task, kiểm bằng chứng rồi đánh dấu đạt.

**Mục tiêu** xây IMPORT 1–8 link Drive, MATCH theo SHA-256 khi đã upload,
và giảm request qua trạng thái lô/CSRF theo phiên.

**Kiến trúc** operation/items có lease riêng trong DB. IMPORT tải qua client
Drive và bàn giao staging cho PROCESS. MATCH so hash snapshot. Xác nhận
cấp quyền dùng media và ghi VERIFIED trong transaction.

**Stack** Angular 21, Spring Boot/JDBC, PostgreSQL/Flyway, Node/Sharp.
**Spec** [IMAGE_SOURCE_BATCH_SPEC](IMAGE_SOURCE_BATCH_SPEC.md).
**Trạng thái** 11/11/2026: Task 1–6 đã triển khai và review; Task 7 local
đã kiểm recovery/migration, còn QA Drive thật và rollout owner.
Checklist bên dưới là hợp đồng task; bằng chứng cuối ở DEV_LOG/runbook.

## Ràng buộc chung

- Tối đa 8 link và 8 ảnh/sách, 10 MiB/file, 25 megapixel, JPEG/PNG/WebP tĩnh.
- OWNER, LOCAL, cùng namespace/session hoặc sách. TTL tối đa 24 giờ,
  không vượt hạn session. Giữ hợp đồng upload và verify đơn ảnh.
- Tải tuần tự, I/O ngoài transaction, retry có lease và giới hạn.
- V21–V30 giữ bytes. Dự kiến V31, kiểm lại version trước triển khai.
- Dùng client/store/recipe/job/cleanup hiện có, không thêm thư viện.
- Code vào dev, owner merge main. Backend deploy trước frontend.
- Một folder Drive gốc Viewer, lấy theo từng File ID, không scan 2.000 sách.

## Review Focus

- Hai tab upload/import cùng lúc không vượt chỗ còn lại, task 1/3.
- Consume session khi download đang chạy hủy item còn lại và chặn callback muộn, task 3/4.
- Media READY chưa confirm không thể lọt qua finalize/replacement, task 4.
- Confirm retry sau temporary→book_media vẫn trả receipt cũ, task 4.
- CSRF response đến sau logout không được phục hồi token cũ, task 5.

## Interface chung

Đường dẫn BE là code/backend/src/main/java/vn/memay/media/, source/ ở dưới.
Tests tương ứng tại code/backend/src/test/java/vn/memay/media/.
FE books là code/frontend/src/app/features/admin/books/.

Tạo source/DriveBatchDtos.java với Mode IMPORT/MATCH và records:
Create(mode, sessionId, bookId, bookVersion, fileIds, targets, requestKey);
Target(mediaId, generationId, bindingVersion);
Selection(itemId, mediaId, role);
Confirm(requestKey, digest, selections);
View(id, mode, state, expiresAt, digest, items, bookVersion);
ItemView(id, fileId, state, errorCode, mediaId, contentPath, candidates).
Kiểu session/media/item/generation/requestKey là UUID, bookId/versions là Long.
IMPORT nhận session và không có target. MATCH nhận target IDs rõ ràng.
State operation là PENDING/PROCESSING/READY/CONFIRMED/CANCELLED/EXPIRED.
Item là PENDING/DOWNLOADING/ENCODING/READY/FAILED.
READY operation nghĩa mọi dòng đã có kết quả, kể cả dòng lỗi.
Có ít nhất một selection hợp lệ mới cho confirm.

## Task 1 — Storage, quyền và capacity

Files mới V31__drive_image_batches.sql dưới db/migration,
source/DriveBatchDtos.java, DriveBatchRepository.java, DriveBatchService.java.
Sửa UploadSessionTransactions.java. Test source/DriveBatchIntegrationTest.java.

Interfaces:
- Service.create(Create input, AdminUser actor) → View.
- Service.status(UUID operationId, AdminUser actor) → View.
- Bảng drive_image_batch/items lưu owner/namespace, mode, fingerprint,
  idempotency key, lease/attempts, snapshot và receipt.
- IMPORT tạo temporary_media UPLOADING dưới session lock, dùng admission
  của upload thủ công. Placeholder là một slot. Retry giữ media ID.
  Tạo image_asset theo lifecycle hiện có và liên kết item bền với media.

- [ ] Viết createRejectsNinthReservedImage, sameKeyReturnsSameOperation,
  differentPayloadConflicts, ownerCannotReadOtherBatch, duplicateFileIdsRejected.
  Assert tổng <=8 cả khi concurrent create/upload, retry cùng media ID.
- [ ] Từ backend chạy ./mvnw -B -ntp -Dtest=DriveBatchIntegrationTest test
  với TEST_DB_URL fixture. RED do schema/API mới chưa có.
- [ ] Implement DTO/create/status/fingerprint. Chuẩn hóa File ID ở server,
  từ chối folder hoặc URL tùy ý. MATCH chụp generation/hash/version đúng quyền.
- [ ] Chạy lại test và migrate fixture V1–V31/V30→V31, kỳ vọng không lỗi/mất dữ liệu.
- [ ] Log và commit feat(media): persist Drive batches and reserve upload slots.

## Task 2 — Tải Drive và metadata

Files sửa source/DriveSourceClient.java, GoogleDriveSourceClient.java.
Tạo source/DriveSourceMetadata.java, DriveBatchHandler.java.
Tests source/GoogleDriveSourceClientTest.java, DriveBatchDownloadTest.java.

Interfaces:
- DriveSourceMetadata(fileId, version, bytes, mime).
- DriveSourceClient.inspect(String fileId) → DriveSourceMetadata.
  Giữ download(fileId, operationId) và adapter fixture caller cũ hoạt động.
- Handler claim một item, gọi download(fileId, leaseToken), commit snapshot
  qua repository có kiểm lease. Inspect dùng cùng auth/timeout/error codes.

- [ ] Viết stableDownloadHashesOnce, changedVersionRejected, accessDeniedHasCode,
  staleLeaseCannotComplete và restartReclaimsItem, dùng fake HTTP/clock.
- [ ] Chạy hai test class, xác nhận RED phù hợp.
- [ ] Implement tải tuần tự, heartbeat/retry theo mẫu hiện có, tối đa 3 attempts
  và backoff. Lỗi từng dòng riêng. Tải mạng ngoài transaction.
  MATCH so hash snapshot và trả mọi candidates bằng hash.
- [ ] Chạy lại test, assert 1 byte download/source trong lượt thành công,
  version trước/sau khớp, token/body provider không lộ.
- [ ] Log và commit feat(media): stage Drive batch sources with leases.

## Task 3 — IMPORT bàn giao PROCESS và cleanup

Files sửa LocalUploadService.java, UploadSessionTransactions.java,
LocalImageCleanup.java, source/DriveBatchService.java, DriveBatchHandler.java.
Tests source/DriveBatchImportTest.java và UploadSessionIntegrationTest.java.

Interfaces:
- LocalUploadService.enqueueStaged(UUID sessionId, UUID mediaId, AdminUser actor,
  LocalImageStore.StagedInput staged, String revision) → Operation.
  Tách core enqueue dùng chung với upload, không đọc/stage lại bytes.
- Repository bàn giao item lease/source snapshot thành generation/PROCESS atomic.
- Service.cancelRemainingForSession(UUID sessionId), caller giữ session lock.

- [ ] Viết importReusesDownloadedBytes, inputSurvivesHandoff, retryKeepsSlot,
  terminalFailureReleasesSlot, sessionConsumedRejectsLateDownload và
  cleanupPreservesLeasedInput. Assert encode READY vẫn chưa có admission.
- [ ] Chạy hai test class, xác nhận RED.
- [ ] Implement pointer/state handoff atomic, rollback chỉ xóa file thuộc lease.
  Sweeper bảo vệ staging bởi item hoặc PROCESS. Terminal khi encode mọi dòng xong.
  Session consume hủy phần còn lại, media bỏ lại DELETE_PENDING theo lifecycle.
- [ ] Chạy lại test, pin restart giữa stage/commit, retryable giữ slot và TTL cleanup.
- [ ] Log và commit feat(media): process Drive imports through LOCAL jobs.

## Task 4 — Confirm, admission và API

Files mới source/DriveBatchController.java. Sửa DriveBatchService.java,
SourceBindingService.java, SourceBindingRepository.java, UploadSessionTransactions.java,
MediaTransactions.java và catalogue/BookCommandService.java.
Tests source/DriveBatchApiTest.java, DriveBatchConfirmTest.java,
SourceBindingIntegrationTest.java, SourcePublicationGateTest.java.

Interfaces:
- POST /api/v1/admin/drive-image-batches nhận Create → 202 View.
- GET /api/v1/admin/drive-image-batches/{id} → View.
- POST /api/v1/admin/drive-image-batches/{id}/confirm nhận Confirm → View.
- Service.confirm(UUID id, Confirm input, AdminUser actor) → receipt View.
- Inspect metadata Drive ngoài transaction trước confirm, rồi khóa/kiểm lại
  session/book, target generation.input_sha256/recipe và PROCESS READY.
- IMPORT confirm cấp admission/role cho tập chọn, ghi VERIFIED cùng transaction.
  MATCH khóa sách một lần và tăng version một lần, audit từng binding.
- Receipt confirm sống qua consume/delete temporary media.

- [ ] Viết partialSuccessConfirmsSelectedOnly, duplicateHashNeedsExplicitPair,
  sourceChangedBeforeConfirmRejected, forgedReadyMediaCannotFinalize,
  repeatedConfirmAfterBookSaveReturnsReceipt và concurrentConfirmConflicts.
- [ ] Chạy test mới cùng source/publication gate hiện có, xác nhận RED.
- [ ] Implement mapping một-một, digest/snapshot pin, confirm atomic/idempotency,
  409/410 và OWNER checks. IMPORT chưa confirm bị chặn ở session view,
  finalize/consumeReady/replacement kể cả media ID hợp lệ. Cleanup dòng bỏ chọn.
- [ ] Chạy lại test, kiểm OWNER/STAFF/logout, single verify và publication gate.
- [ ] Log và commit feat(media): confirm Drive batches with verified bindings.

## Task 5 — CSRF theo phiên

Files sửa FE core/auth/auth.service.ts, admin-http.ts và specs tương ứng.
Sửa BE auth/SecurityConfiguration.java và AuthIntegrationTest.java.

Interfaces:
- AuthService.csrf() public → Observable<CsrfResponse>, cache/in-flight theo epoch.
- AuthService.refreshCsrf() xóa cache epoch hiện tại và lấy mới.
- AdminHttp mutate/upload refresh/retry một lần chỉ khi HTTP 403 + csrf_invalid,
  do backend nhận đúng MissingCsrfTokenException/InvalidCsrfTokenException.
- Login/logout invalidate. Response epoch cũ không được dùng cho mutation mới.
  Giữ XHR progress/FormData, role forbidden và network error không replay.

- [ ] Viết concurrentMutationsFetchCsrfOnce, logoutDiscardsLateToken,
  csrfFailureRefreshesOnce, role403DoesNotRetry và networkErrorDoesNotReplay.
- [ ] Chạy FE auth/admin-http tests và AuthIntegrationTest, xác nhận RED.
- [ ] Implement memory cache và phân biệt CSRF exception với forbidden hiện tại.
- [ ] Chạy test cùng login/logout/upload hồi quy, kỳ vọng PASS.
- [ ] Log và commit perf(auth): reuse CSRF tokens within the current session.

## Task 6 — Giao diện và polling chung

Files sửa books/book-api.ts, book.models.ts, drive-source.ts, book-upload-queue.ts,
book-media-panel/book-media-panel.{ts,html,scss}. Tạo books/drive-batch.ts,
drive-batch.spec.ts. Sửa drive-source.spec.ts, book-upload-queue.spec.ts,
book-media-panel.spec.ts.

Interfaces:
- BookApi.createDriveBatch(Create), driveBatch(id), confirmDriveBatch(id,Confirm).
- DriveBatch giữ operation theo owner/session/book, submit/resume/confirm/dispose.
  Một subscription poll/id. Queue.ensureSession() cung cấp session IMPORT.
- Poll sau 1s, 2s, 5s lặp. Pause khi tab ẩn, refresh một lần khi hiện lại.
  Terminal/dispose/logout hủy timer. GET cuối chứa metadata/version cần update.

- [ ] Viết shuffledEightMatchByHash, driveOnlyImportSelectsRoles,
  commaSeparatedIdsRejectDuplicates, ambiguousHashesRequireSelection,
  onePollerForBatch, reloadResumesOwnedOperation và hiddenTabPauses.
- [ ] Chạy các test FE mới, xác nhận RED.
- [ ] Implement thumbnail/role và lỗi từng dòng. Confirm cập nhật queue chỉ với
  media đã admission, giữ tổng <=8. MATCH không gọi verifySource từng ảnh.
  Giữ upload file và verify đơn ảnh. Render ID/link bằng binding an toàn.
- [ ] Chạy FE tests, npm run build:workers và npm run check:workers:proxy.
- [ ] Log và commit feat(admin): import and match Drive images in batches.

## Task 7 — Đo request, recovery và bàn giao

Files tests source/DriveBatchRecoveryTest.java. Cập nhật IMAGE_OPERATIONS.md,
IMAGE_RECOVERY_SPEC.md, VERIFICATION.md, PROGRESS.md, DEV_LOG.md và README.md.

- [ ] Viết saveImportKeepsSourceBinding và lostDerivedRebuildsSameGeneration.
  Lưu sách, mất derived ở mount test, rebuild R5 đúng nguồn/hash/recipe.
  Chạy RED ở phần chức năng mới chưa đủ.
- [ ] Hoàn thiện nhỏ nhất, chạy backend clean verify trên DB riêng, frontend
  tests, worker tests, build Workers và proxy test. Kỳ vọng PASS.
- [ ] Đo 8 ảnh IMPORT/MATCH trên QA. Tách browser requests, metadata/byte download
  Drive, encode, queue, RSS. Mục tiêu MATCH 3+P khi session đã có, tính riêng
  preview/create-session/retry. Chỉ ghi số đo đã chạy, pin một poller/CSRF fetch.
- [ ] Diễn tập V30→V31 trên bản sao DB. QA backend trước frontend, kiểm UI,
  receipt/reload và ảnh Cloudinary hiện có. Hướng dẫn chia sẻ folder gốc Viewer.
- [ ] Cập nhật contract/bằng chứng, chỉ mục và trần 400 dòng. Gộp spec/plan vào
  tài liệu chuẩn sau nghiệm thu, commit/push dev.
- [ ] Owner merge main, rollout theo runbook và smoke một sách nháp mới.
  Theo dõi tới kết quả hoặc ghi blocker cụ thể.

## Tự rà kế hoạch

Workflow → task 1–4/6, capacity/lifecycle → 1/3/4, auth/request → 5/6/7,
recovery → 4/7. Mỗi Review Focus có test ở task sở hữu.
Interface được định nghĩa trước caller, giữ stack và dependency hiện tại.
Các lệnh trong checklist là việc cần chạy, chưa phải kết quả thực thi.
