# Image Storage & Processing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bỏ ảnh nội bộ, cung cấp upload/processing/delivery LOCAL song song Cloudinary.
**Architecture:** Spring sở hữu DB, lifecycle và authorization; Node/Sharp xử lý bytes
qua queue có lease. Nginx nội bộ phục vụ derived qua gateway hiện hành.
**Tech Stack:** Angular hiện có, Java 21/Spring Boot/JDBC/PostgreSQL, Node/Sharp, Nginx.
**Spec:** [IMAGE_STORAGE_SPEC.md](IMAGE_STORAGE_SPEC.md), đã duyệt 08/11/2026.
**Status:** User chọn Native. S1–S7 và R1/R2 đã triển khai, tiếp theo R3.
Bằng chứng và giới hạn S5–S7 ghi trong DEV_LOG S061/S062.

## Global Constraints

- Tối đa 8 ảnh/sách; ảnh cũ đang ẩn chuyển thành ảnh hiển thị cùng sách.
- User phụ trách dựng Ubuntu server. Agent làm code, kiểm thử local,
  cấu hình mẫu và checklist tích hợp; không SSH/cài server/deploy production.
- Spring sở hữu PostgreSQL queue và transaction; Node/Sharp không giữ credential DB.
- Một worker, concurrency 1; CPU 1, RAM 768 MiB là cấu hình thử nghiệm.
- Lease 5 phút, heartbeat 30 giây; claim lại sau expiry. Kết quả token cũ bị từ chối.
- Tối đa 3 attempts tự động, backoff 10/60 giây; job timeout 3 phút/attempt.
- Giữ browser revalidate, edge tối đa 30 giây và purge sau commit theo ARCHITECTURE.
- Giữ ẩn/xuất bản sách, Thùng rác, ghi chú nội bộ và import CSV/XLSX hiện có.
- LOCAL opt-in; không ngừng Cloudinary trước nghiệm thu recovery/rollback.
- Không sửa migration đã chạy, không ghi DB bán thật; commit/push dev, không main.

## Review Focus

1. Retry final cũ chứa INTERNAL/showOnProduct sau migration vẫn trả receipt cũ (S1).
2. Worker hoàn tất sau khi ảnh bị thay/gỡ không phục sinh ảnh cũ (S3/S5).
3. Disk đầy/DB rollback sau ghi file không làm mất ảnh đang ACTIVE (S2/S5).
4. Tab đang mở giữ capability cũ khi đổi provider: server từ chối rõ, không nén sai nguồn (S5/S6).
5. Cache version cũ/alias role cũ không vượt quyền sách Ẩn hoặc lộ metadata (S7).

## Thứ tự, đường dẫn và cách chạy

Thực hiện **S1 → S2 → S3 → S4 → R1 → R2 → S5 → S6 → S7 → R3 → R4 → R5 → S8 → R6**.
R là task trong [Recovery plan](IMAGE_RECOVERY_PLAN.md). Không chạy song song task
cùng schema/lifecycle. S1 là deliverable độc lập, có thể bàn giao trước hệ self-host.

Đường dẫn rút gọn trong Files được ghép chính xác với các root sau:
- `M/` = `code/backend/src/main/java/vn/memay/media/`.
- `C/` = `code/backend/src/main/java/vn/memay/catalogue/`.
- `T/` = `code/backend/src/test/java/vn/memay/media/`.
- `F/` = `code/frontend/src/app/features/admin/books/`.
- `D/` = `code/backend/src/main/resources/db/migration/`.
- `W/` = `code/image-worker/` (mới); mã Node ESM, test bằng node:test.

`BE(Test)` bên dưới = từ repo root chạy
`bash code/backend/run-local.sh -B -ntp test -Dtest=Test` trên DB test cách ly.
`FE` = từ `code/frontend`: `npm test -- --watch=false`.
Mỗi bước RED phải thất bại ở assertion hành vi mới, không lấy lỗi môi trường làm RED.
Mỗi bước GREEN phải 0 failures/errors; không coi skip là bằng chứng live.
Mỗi commit dùng danh sách Files của task + PROGRESS/DEV_LOG, không `git add .`.
Trước execution fetch dev/kiểm worktree theo skill; có migration mới thì đổi số
V21+ một lần trước viết, cập nhật cả hai plan, không đè migration task khác.

## Contract nối hai plan

S2 tạo `ImageTypes.java`: `Provider(CLOUDINARY,LOCAL)`, `JobKind(PROCESS,VERIFY,MIGRATE,REBUILD)`,
`SourceStatus(UNVERIFIED,VERIFIED,SOURCE_MISSING,SOURCE_CHANGED,ACCESS_ERROR)`.
ID media/generation/job/session là UUID; book/version là long; thời gian là Instant.
`Variant(String name,String key,String mime,int width,int height,long bytes,String sha256)`.
`Manifest(UUID mediaId,UUID generationId,String recipeVersion,List<Variant> variants)`.
`JobLease(UUID jobId,UUID token,UUID mediaId,UUID generationId,JobKind kind,
String inputKey,String recipeVersion,Instant expiresAt)`.
`SourceBinding(UUID mediaId,String fileId,String sha256,String sourceVersion,
long sourceBytes,String mime,SourceStatus status,long bindingVersion,Instant verifiedAt)`.
Các record trên là internal; API public/admin dùng DTO đã lọc, không serialize nguyên record.

S2 tạo `SourceBindingRepository.find(UUID mediaId): Optional<SourceBinding>`;
R1/R2 sở hữu verify và mutation nguồn, S5 gọi `requireVerifiedForBook(long bookId)` sau khi flush ảnh ACTIVE,
trong cùng transaction với publish hoặc thay ảnh đang công khai.
S3 tạo `ImageJobService.enqueue(UUID mediaId,UUID generationId,JobKind kind,
String inputKey,String recipeVersion,String dedupeKey,int priority): UUID`;
R tasks dùng cùng queue, không tạo queue/encoder riêng.
Priority nhỏ hơn chạy trước; PROCESS/VERIFY=0, MIGRATE=10, REBUILD=20..23 theo spec.

### S1 — Bỏ visibility và chuyển dữ liệu tám role

**Files:** sửa `M/MediaDtos.java`, `M/BookMedia.java`, `M/MediaTransactions.java`,
`M/UploadSessionTransactions.java`, `C/BookDtos.java`, `C/BookCommandService.java`,
`C/BookMapper.java`, `C/BookValidation.java`, `C/PublicCatalogueService.java`, `C/PublicCatalogueController.java`;
`F/book.models.ts`, `F/book-copy.ts`, `F/book-upload-queue.ts`,
`F/book-media-panel/book-media-panel.{ts,html,scss}`, `F/book-editor/book-editor.ts`,
`code/frontend/src/worker-runtime.ts`; tạo `D/V21__unified_book_photos.sql`.
**Tests:** `T/UnifiedBookPhotosTest.java` mới; sửa `T/BookMediaFeatureContractTest.java`,
`code/backend/src/test/java/vn/memay/catalogue/BookMediaFeatureMigrationTest.java`,
`T/PublicMediaApiTest.java`, `T/BookPhotoDownloadTest.java`,
`F/book-upload-queue.spec.ts`, `F/book-media-panel/book-media-panel.spec.ts`.
**Interfaces:** giữ API URL/final receipts; MediaRole mới gồm FRONT/BACK/SPINE/INSIDE_1..5.

- [ ] Viết RED `hiddenPhotosBecomeGalleryPhotos`: `assertEquals(8, publicMedia.size())`;
  `assertEquals(oldMediaIds, migratedMediaIds)`; sách ARCHIVED/temp/trash vẫn 404.
- [ ] Viết RED `legacyFinalRetryReturnsExistingBook`: cùng raw payload/receipt cũ
  trả cùng book ID, không thêm audit CREATE; 9 ảnh bị chặn, replace đủ 8 vẫn được.
- [ ] Chạy `BE(UnifiedBookPhotosTest,BookMediaFeatureMigrationTest)` và FE, ghi RED.
- [ ] Migration đổi role cho mọi row liên quan, giữ IDs/receipt/audit lịch sử,
  tăng version đúng sách bị đổi; bỏ show_on_product/check constraint cũ, thêm check mới.
- [ ] Sửa enum/DTO/query/UI; bỏ cờ/nhóm nội bộ. Legacy alias chỉ parse boundary;
  tra receipt/hash legacy trước normalize role, không thay canonical dữ liệu đã lưu.
- [ ] Bổ sung test đổi role/gỡ/thay/ZIP và Worker cache alias; chạy BE các test Files + FE.
- [ ] Cập nhật DATA/CATALOGUE/DESIGN/MASTER_PLAN và BOOK_ENTRY_ROLLOUT cho contract
  đã triển khai; ghi downtime/reload/backup yêu cầu, không sửa bằng chứng lịch sử.
- [ ] `git diff --check`; commit `feat(media): unify all eight book photos` cùng log.

### S2 — Metadata provider/generation và filesystem an toàn

**Files:** tạo `D/V22__image_generations_and_jobs.sql`, `M/ImageTypes.java`,
`M/ImageGenerationRepository.java`, `M/SourceBindingRepository.java`,
`M/LocalImageStore.java`; sửa `M/MediaConfiguration.java`,
`code/backend/src/main/resources/application.yml`, `.env.example`, root `.gitignore`.
**Tests:** tạo `T/LocalImageStoreTest.java`, `T/ImageGenerationRepositoryTest.java`.
**Interfaces:** `LocalImageStore.stage(UUID operationId,InputStream input): StagedInput`
với `StagedInput(String key,long bytes,String sha256)`;
`validate(Manifest manifest): void`, `publish(Manifest manifest): void` atomic rename.

- [ ] Viết RED `stageLimitsAndHashes`: `assertEquals(10*1024*1024, maxBytes)`;
  file quá ngưỡng/path traversal/symlink bị từ chối; input hash từ bytes thật.
- [ ] Viết RED `failedPublicationKeepsOldGeneration`: rollback/disk full không đổi
  serving pointer; `assertEquals(oldGeneration, currentGeneration)`; orphan được report.
- [ ] Chạy `BE(LocalImageStoreTest,ImageGenerationRepositoryTest)` ghi RED.
- [ ] Tạo schema generation/variant/job/source binding/recipe; backfill provider CLOUDINARY,
  giữ storage_public_id và legacy ref; unique media+generation+variant và active dedupe job.
  book_media lưu serving_generation nullable; source FK theo media, không theo role.
- [ ] Implement stage/publish/validate theo chữ ký; server-generated keys, giới hạn bytes,
  check root containment/no symlink; không public staging. State filesystem không thay DB commit.
- [ ] Thêm config LOCAL disabled mặc định, root và internal Nginx origin;
  ignore `.local/` staging/fixtures, không ignore asset nguồn frontend.
- [ ] Chạy GREEN BE; commit `feat(media): add versioned local image storage` cùng log.

### S3 — Queue bền vững, lease và internal worker API

**Files:** tạo `M/ImageJobService.java`, `M/ImageJobRepository.java`,
`M/ImageJobEndpoint.java`, `M/ImageJobDispatcher.java`, `M/ImageJobMetrics.java`;
sửa `code/backend/src/main/java/vn/memay/auth/SecurityConfiguration.java`,
`code/backend/src/main/resources/application.yml`.
**Tests:** tạo `T/ImageJobLeaseTest.java`, `T/ImageWorkerSecurityTest.java`.
**Interfaces:** enqueue theo Contract; `claim(): Optional<JobLease>`;
`heartbeat(UUID jobId,UUID token): Instant`; `complete(UUID jobId,UUID token,Manifest result): void`;
`fail(UUID jobId,UUID token,String code,boolean retryable): void`.
Internal actuator endpoint `POST /actuator/imagejobs` trên management port riêng 8081,
command CLAIM/HEARTBEAT/COMPLETE/FAIL; bearer service token, không dùng session user.

- [ ] RED `lateLeaseCannotPublish`: lease cũ hết 5 phút trả 409 khi complete,
  chỉ claimant mới được công bố; restart claim lại, attempt 3 lỗi thành FAILED.
- [ ] RED `workerCredentialsCannotWriteBooks`: service token không vào admin API;
  port app không expose imagejobs; thiếu/sai token 401/403, không claim job.
- [ ] Chạy `BE(ImageJobLeaseTest,ImageWorkerSecurityTest)` ghi RED.
- [ ] Implement claim transaction ngắn/lease token, retry 10/60s, heartbeat 30s;
  metrics pending/failed/age; recheck delete/generation/source input trước complete.
- [ ] Dispatcher route PROCESS cho Sharp; VERIFY/MIGRATE/REBUILD do Spring chuẩn bị
  nguồn qua handler R2/R4/R5 rồi chuyển encode stage cùng job, không giao Drive token cho Node.
  Kind chưa có handler phải FAILED có mã unsupported, không treo job hoặc giả READY.
- [ ] Implement endpoint trên management port nội bộ, không expose các actuator khác;
  user API không chấp nhận worker token, health được giữ theo contract hiện có.
- [ ] GREEN BE; commit `feat(media): add leased image jobs and worker boundary` cùng log.

### S4 — Sharp worker và recipe có thể tái tạo

**Files:** tạo `W/package.json`, `W/package-lock.json`, `W/Dockerfile`,
`W/src/{index,processor,recipes,client}.mjs`, `W/test/{processor,worker}.test.mjs`.
**Interfaces:** `processImage({inputPath,outputDir,mediaId,generationId,recipeVersion}): Promise<Manifest>`;
wire manifest khớp S2; worker chỉ lấy key được validate, recipe từ registry allowlist.

- [ ] RED `rejectsInvalidDecode`: magic giả/25MP+1/animated WebP/HEIC/SVG bị từ chối;
  `assert.equal(result.variants.some(v=>v.name==='internal'), false)`.
- [ ] RED `recipeIsReproducible`: hai lượt cùng input/pinned recipe cùng hash;
  ảnh nhỏ không upscale; EXIF đúng chiều, alpha trắng, không EXIF/GPS output.
- [ ] Chạy từ W `npm test` ghi RED (node:test, fixture tổng hợp không ảnh bán thật).
- [ ] Khóa Node image digest/Sharp version/lockfile tại implementation; processor
  WebP82/JPEG85, bounding boxes 320/640/480/1400 và JPEG1280 compatibility.
  Không resize động. Worker 1 job, deadline 3 phút; heartbeat trong khi encode,
  lease mất thì bỏ completion. Recipe digest gồm dependency/config/worker image.
- [ ] Kiểm manifest/key/hash trước báo complete; crash sau rename retry dùng output
  khớp manifest hoặc tái tạo staging, không overwrite output đã công bố.
- [ ] GREEN `npm test`; smoke container với resource limits và fixture;
  commit `feat(media): process images with a pinned Sharp recipe` cùng log.

### S5 — Upload async, finalize và replacement nguyên tử

**Prerequisite:** S4 và R2; publish gate nguồn phải hoạt động trước bật LOCAL.
**Files:** sửa `M/{MediaService,MediaTransactions,UploadSessionService,UploadSessionTransactions,
UploadSessionController,UploadSessionDtos,AdminMediaController,MediaCleanupJob}.java`,
`C/BookCommandService.java`, `C/BookValidation.java`; tạo `M/LocalUploadService.java`, `M/ImageOperationController.java`.
**Tests:** tạo `T/LocalUploadIntegrationTest.java`; sửa `T/BookCreateFinalizationTest.java`.
**Interfaces:** upload LOCAL trả `202 {mediaId,jobId,status,statusPath}`;
`GET /api/v1/admin/image-operations/{jobId}`, `POST .../{jobId}/retry`;
`POST /api/v1/admin/books/{id}/media/replacements/{mediaId}/commit`
body `{version,role,requestKey}`, trả BookDetail; capability OWNER GET `/api/v1/admin/media-capabilities`.

- [ ] RED `duplicateUploadAndLostFinalAreIdempotent`: cùng requestKey trả cùng ID,
  payload khác 409, final pending 409 `media_not_ready`, retry final cùng book ID.
- [ ] RED `staleReplacementLeavesOldImage`: READY rồi book version thay đổi → 409;
  expiry/gỡ ảnh/failed audit giữ old pointer; job completion không tự attach.
- [ ] RED `unverifiedLocalCannotPublish`: source gate chặn cả create/update/publish/
  replacement trên PUBLISHED; CLOUDINARY legacy vẫn được publish như trước.
- [ ] Chạy `BE(LocalUploadIntegrationTest,BookCreateFinalizationTest)` ghi RED.
- [ ] Implement stage→enqueue→poll/commit; final tối đa8, một replacement tạm,
  session24h, owner/CSRF và capability/provider revision được kiểm server-side.
- [ ] Cleanup phải loại trừ active lease/session/generation/source verify;
  orphan unreferenced chỉ dọn sau grace1h; session expired có lease phải cancel trước dọn.
  Retry không reset quyền/expiry, manual retry FAILED tạo lease mới và audit.
- [ ] GREEN BE thêm UploadSessionIntegrationTest/MediaCleanupIntegrationTest;
  commit `feat(media): integrate asynchronous local uploads` cùng log.

### S6 — UI upload và source mapping trên form hiện có

**Files:** sửa `F/{book-api,book.models,book-upload-queue,image-upload}.ts`,
`F/book-media-panel/book-media-panel.{ts,html}`, `F/book-editor/book-editor.ts`;
sửa test `.spec.ts` tương ứng. Không tạo framework/state store mới.
**Interfaces:** `BookApi.capabilities()`, `imageOperation(jobId)`, `retryImageOperation(jobId)`,
`commitReplacement(bookId,mediaId,{version,role,requestKey})` trả Observable DTO S5;
source binding dùng R2 API, không serialize internal SourceBinding ra public.

- [ ] RED `localUploadsOriginalBytes`: `expect(sentFile).toBe(originalFile)`;
  cloud vẫn normalize, stale capability 409 giữ file và yêu cầu refresh.
- [ ] RED `pollResumesWithoutReupload`: lost-response/reload tra session/job,
  READY không upload lại, timeout/error giữ form; verify xong nhận book version mới.
- [ ] RED `eightPhotosHaveNoVisibilityControls`: 8 slot, không khóa/checkbox/nội bộ;
  pending không final, bỏ ảnh lỗi cần user thao tác, replacement không mất ảnh cũ.
- [ ] Chạy FE ghi RED; implement polling 1/2/5s tối đa5s, unsubscribe khi destroy,
  retry thủ công sau lỗi; session expiry dừng poll; không tự publish nền khi đóng trang.
- [ ] Nguồn ảnh nhận link file Drive hoặc File ID. Hỗ trợ dán nhiều mục theo
  dòng, tối đa tám, xem và chỉnh ghép ảnh trước khi xác minh. Từ chối link
  thư mục và báo lỗi theo từng mục. Backend nhận File ID đã tách từ link.
- [ ] Hiện trạng thái xác minh ở metadata mỗi ảnh. Phân biệt lỗi nguồn và encode,
  binding input chỉ admin. Giữ focus/status announcement và preview không nén file gốc.
- [ ] GREEN FE; commit `feat(admin): support async image processing and source verification` cùng log.

### S7 — Delivery, preview, ZIP và thiếu ảnh trong recovery

**Files:** tạo `M/LocalMediaGateway.java`, `M/MediaReadService.java`;
sửa `M/{MediaGateway,MediaConfiguration,MediaService,BookPhotoDownloadService}.java`,
`C/{PublicCatalogueController,PublicCatalogueService}.java`, `code/frontend/src/worker-runtime.ts`,
`code/frontend/src/app/features/catalogue/book-card/book-card.{ts,html,spec.ts}`,
`code/frontend/src/app/features/catalogue/book-detail/book-detail.{ts,html,spec.ts}`;
mở rộng fixture HTTP/DB trong `T/LocalUploadIntegrationTest.java`.
**Interfaces:** `MediaReadService` nhận media ID, generation đã được phân quyền
và size/format. Cloudinary dùng adapter cũ; LOCAL đối chiếu manifest và file
trên mount dùng chung trước khi đọc Nginx nội bộ.

- [x] RED `mixedProvidersRespectPublication`: ẩn/temp/trash/version sai/alias cũ
  trả404; public DTO không source/key; ZIP có ảnh từ cả providers, không lộ File ID.
- [x] RED `missingFrontUsesPlaceholder`: gallery bỏ variant biết thiếu; thẻ placeholder
  kích thước cố định, GET mất file giữa chừng có fallback; không rebuild inline GET.
- [x] RED backend cho variant 480 và frontend cho placeholder, ghi S062-C02.
- [x] Implement Nginx internal fetch bounded timeout/allowlist path; routing theo provider
  ở mọi read/delete consumer, dùng manifest generation/version mới tránh cache cloud cũ.
- [x] Worker allowlist tám role và 480/1400 LOCAL; bảo toàn size cũ, no-store admin,
  30s edge/purge, không cache lỗi; placeholder không được thay bằng ảnh sách khác.
  Public media DTO chỉ thêm variant URL/dimensions sẵn có; UI chọn theo từng ảnh,
  không dùng global provider flag để gọi 1400 vào ảnh Cloudinary chỉ có 320/640.
- [x] GREEN BE/FE + `npm run check:workers:proxy` tại frontend;
  commit `feat(media): serve mixed providers through the authorized gateway` cùng log.

### S8 — Local nghiệm thu và bàn giao cấu hình cho owner

**Prerequisite:** R5. **Files:** tạo `ops/images/compose.yml`, `ops/images/nginx.conf`,
`scripts/image-system/benchmark.mjs`, `docs/IMAGE_OPERATIONS.md`;
cập nhật `.env.example`, `docs/{README,DEPLOYMENT,VERIFICATION,PROGRESS,DEV_LOG}.md`.
**Interfaces:** compose template worker/internal Nginx; không tự chạy trên server owner.
Benchmark input fixture manifest, JSON output timings/bytes/RSS/errors, không secrets.

- [ ] Viết smoke fixture 20 sách×2 ảnh và 50 sách×8 ảnh; kiểm limit1worker,
  restart/job retry/kill/disk full và public/admin/ZIP. Tất cả ở namespace/DB test.
- [ ] Chạy full BE `bash code/backend/run-local.sh -B -ntp verify`; FE,
  `npm run build`, `npm run build:workers`, `npm run check:workers:proxy`; W `npm test`.
- [ ] Browser QA desktop/mobile: 0/2/8/9 ảnh, nguồn sai, poll/reload, hai tab,
  replace/ẩn/publish, gallery/ZIP; lưu bằng chứng và hạn chế thật, không chỉ mock UI.
- [ ] Benchmark baseline API không worker và cùng API dưới tải; ghi p50/p95,
  RSS/CPU/disk/output bytes. Không dùng máy local để tuyên bố Dell đạt.
- [ ] Viết compose/nginx/env mẫu: mount persistent cùng filesystem; Nginx read-only,
  không host ports cho Nginx/management8081, 1CPU/768MiB worker, restart/healthchecks;
  cấu hình credential không có giá trị thật, cảnh báo disk/queue/source/HTTP errors.
- [ ] Bàn giao IMAGE_OPERATIONS: owner dựng Ubuntu/Drive/R2, smoke ngoài LAN,
  kiểm text quality và ngưỡng theo đo thực tế; không chặn bàn giao code local vì chưa có server.
- [ ] Review toàn diff theo skill, sửa finding; commit `docs(media): hand off local image system operations`.
  Giữ specs/plans còn gate live; không xóa trước chuyển đủ contract/bằng chứng.

## Coverage và điều kiện hoàn tất

Storage spec §1–3→S1; §4→S2; §5→S5/S6/R2; §6→S3/S4;
§7→S2/S4; §8→S7; §9→R4/S8/R6; §10→S1–S8/R5/R6.
Self-review: mọi Review Focus có test; record dùng chung ở S2, R không tạo bản sao;
LIVE acceptance không được tick từ fake provider/test local. Không đổi scope spec.
Plan local hoàn tất khi S1–S8 và R1–R5 đạt; production cutover chỉ sau R6 và owner duyệt.
