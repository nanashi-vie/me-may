# M5 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Hoàn thiện scope M5 đã duyệt: hiệu năng, media, tạo sách không nháp,
OWNER ghi/STAFF đọc, trọng lượng, khoảng giá và2–6ảnh.

**Architecture:** Giữ Angular/Spring Boot modular monolith và các service,
transaction, audit, optimistic version hiện có. Upload tạm gắn OWNER, final
khóa phiên để tạo aggregate PUBLISHED và gắn media trong một transaction;
Cloudinary I/O ở ngoài transaction DB. Không thêm framework hoặc dịch vụ nền.

**Tech Stack:** Angular21, Java21/Spring Boot4, PostgreSQL/Flyway,
Cloudinary authenticated, Workers/Render/Neon; Vitest/JUnit.

**Spec:** [M5_COMPLETION_SPEC](M5_COMPLETION_SPEC.md), user duyệt29/10/2026.
**Trạng thái:** User duyệt kế hoạch và chọn thực hiện tuần tự29/10/2026.
**Execution:** Native, agent thực hiện tuần tự trong chat hiện tại.
**Git:** dev d55d611 lúc bắt đầu; mọi commit/push vào dev, user merge main.

## Global Constraints

- Angular/Spring/Cloudinary/Workers/Render/Neon; giữ CSRF/auth/no-store.
- OWNER ghi, STAFF chỉ đọc mọi endpoint quản trị; không tạo sách DRAFT mới.
- Ảnh2–6, FRONT/BACK bắt buộc; thứ tự FRONT/BACK/SPINE/INSIDE_1/INSIDE_2/INSIDE_3.
- Upload tạm riêng tư24giờ; final retry không tạo sách/mã/audit lần hai.
- Giá nguyên1..999999999999VND; priceMinVnd≤priceMaxVnd, cho bằng nhau.
- Giữ nguyên “Giá sẽ thay đổi dựa vào tình trạng sách cụ thể.”
- weightG nguyên dương bắt buộc khi tạo/lưu sửa/hiện lại; cũ null không tựẩn.
- Logo WebP208×208 mục tiêu≤20KiB; public320/640 WebP/JPEG, admin1280.
- Cảnh báo nguồn>5MB, reject>10MB/25MP trước chuẩn hóa2560px/JPEG0,85/EXIF.
- Không crop, không đổi asset gốc/ID; không đưa signedURL/secret ra client/log.
- LCP≤2,5s và CLS≤0,1 từng lần Mobile warm3lần Home/detail/wishlist.
- Không tự deploy/migrateonline/backfill thật; giữ gate recovery/security/quota.
- Chỉ mục docs/README; Markdown≤400dòng trừ DEV_LOG, cập nhật log mỗi task.

## Review Focus

- Final timeout/response mất/2request đồng thời: chỉ một aggregate, retry trả cùng sách.
- Cleanup đua với attach/reorder hoặc upload xong sau hết hạn: không mất ảnh ACTIVE.
- EXIF/PNG alpha/ảnh ngang/nguồn vượt giới hạn: normalize đúng, không che lỗi sách.
- Sách cũ INSIDE/giá đơn/nullweight: giữ ID/asset/giá, không vô tình ẩn/publish.
- Sale hết hạn hoặc ẩn/SOLD giữa lookup và copy: text giá cũ không được gửi.

## Hiện trạng và trách nhiệm file

Graph đã có project `Users-daoquanghung-Projects-me-may`; ưu tiên graph khi tra code.
Không lặp phần đã xong ở60c0404: khung contain, variant JPEG640, backfill63ảnh.
Online detail vẫn FAIL theo3JSON cũ; cần trace mới để chọn fix cụ thể.

- `code/frontend/src/app/layouts/public-layout.ts`: logo/header; catalogue
  `book-detail.*`, wishlist `wishlist-page.*`: layout/SSR/hydration.
- Backend `vn/memay/catalogue`: BookCopy/BookDtos/BookValidation/BookMapper,
  BookCommandService/BookStatusService/BookAccess/BookQueryService,
  AdminBookController và PublicCatalogueService/Dtos/Controller.
- Backend `vn/memay/listing/Listing.java`: giá/trạng thái persisted.
- Backend `vn/memay/media`: MediaDtos/BookMedia/MediaTransactions/MediaService,
  MediaGateway/CloudinaryMediaGateway/ImageValidator/MediaCleanupJob.
- Backend `vn/memay/promotion/FlashSaleService.java`, `audit/AuditService.java`:
  giá sale và snapshot field allowlist; giữ JSON audit lịch sử.
- Frontend `features/admin/books`: book.models/form/api/editor/media-panel,
  status-actions/list/preview; public `catalogue-state/public.models/book-card`,
  wishlist và admin flash-sale: contract giá và quyền xuyên các màn hình.
- Flyway hiện V1–V5; chỉ thêm migration mới, không sửa checksum đã deploy.

### Task 1: Trace hiệu năng, logo và layout ổn định

**Files:** Sửa public-layout.ts, catalogue/book-detail.html/.scss/.spec.ts,
wishlist/wishlist-page.scss/.spec.ts; tạo `code/frontend/public/logo.webp`.
Sửa `docs/VERIFICATION.md` với phép đo/tái hiện. Giữ logo.jpg nguồn tracked.

**Interfaces:** Giữ API hiện tại; không đổi shape sách ở task này.
Đầu ra: header/logo có dimensions, detail/wishlist không shift khi hydrate.

- [x] Trace browser thật trên MM-000020 cố định: ghi LCPelement/TTFB/mediawait/
  download/render và LayoutShift sources, fresh SSR rồi clientnavigation.
- [x] Đo wishlist rỗng/3cuốn, ảnh ngang/dọc, viewport390 và laptop; giữ trace
  trong ignored output, ghi nguyên nhân tái hiện trước khi chọn CSS/hydration fix.
- [x] RED: thêm regression tại điểm gây shift đã tái hiện; chạy `npm test`
  trong code/frontend, xác nhận failure do hành vi cần sửa.
- [x] Tạo logo208×208 bằng công cụ ảnh sẵn có, kiểm bytes/ảnh thật; cập nhật
  src/dimensions/header spacing và fix layout đã có trace, không đổi nhận diện.
- [x] GREEN: `npm test` và browser cùng kịch bản; ghi observed/simulated riêng.
- [x] Commit code+VERIFICATION/PROGRESS/DEV_LOG trên dev, không kết luận gateonline.

### Task 2: Media320/640 WebP/JPEG và chuẩn hóa nguồn upload

**Files:** Sửa media/MediaGateway.java, CloudinaryMediaGateway.java,
ImageValidator.java, PublicCatalogueController.java; catalogue public.models.ts,
book-card.ts, book-detail.html; sửa scripts/deploy/backfill_public_media.py.
Tạo frontend `features/admin/books/image-upload.ts` và `.spec.ts` cho normalize.
Tests: CloudinaryMediaGatewayTest, ImageValidatorTest, PublicMediaApiTest.

**Interfaces:** `MediaGateway.openPublicPreview(String publicId, int width,
String format): InputStream`, width allowlist320/640, format webp/jpg.
Giữ overload/URL không query tương đương JPEG640; preview admin1280.
`prepareImage(file: File): Promise<Blob>` kiểm source trước tạo JPEG chuẩn hóa.

- [x] RED gateway/controller:320/640×webp/jpg đúng MIME/nosniff/no-store;
  size/format sai bị400, ảnh ẩn/thiếu404, URL không lộ provider.
- [x] RED normalize: PNGalpha→trắng, EXIFđúng chiều, cạnh≤2560, không upscale;
  >10MB/25MP reject trước resize, >5MB có cảnh báo, ảnh lỗi không vào queue.
- [x] Run targeted `bash code/backend/run-local.sh -B -ntp
  -Dtest=CloudinaryMediaGatewayTest,ImageValidatorTest,PublicMediaApiTest test`
  (lệnh một dòng ở root) và frontend `npm test`; xác nhận RED.
- [x] Implement allowlist/transform eager và picture/srcset/sizes; FRONT eager/
  fetchpriorityhigh, các ảnh sau lazy, contain và dimensions ổn định.
- [x] Chạy GREEN; test fallback chỉ khi missingvariant404, không che providererror.
- [x] Script có dry-run/checkpoint và liệt kê đủ4variant; thử namespace test
  cách ly khi được phép; chưa backfill asset thật. Ghi bytes/độ rõ và quota.
- [x] Ghi quyết định cache: giữ no-store; lợi ích cache chưa chứng minh được
  invalidation/ẩn ngay thì không bật. Commit cùng docs bàn giao.

### Task 3: Khoảng giá/trọng lượng/sáu role xuyên backend và public

**Files:** Tạo `db/migration/V6__book_fields_and_media_roles.sql`.
Sửa catalogue/BookCopy.java, BookDtos.java, BookMapper.java, BookValidation.java,
BookCommandService.java, BookQueryService.java, PublicCatalogueDtos.java,
PublicCatalogueService.java; listing/Listing.java, media/MediaDtos.java,
MediaTransactions.java; promotion/FlashSaleService.java, audit/AuditService.java.
Frontend sửa admin book.models/form/editor/preview/list và public.models,
catalogue-state/book-card/book-detail, wishlist-page, flash-sale.
Tạo catalogue/M5MigrationTest.java và frontend price-range tests cạnh book-copy.ts.

**Interfaces:** JSON `weightG: number|null`, `priceMinVnd/priceMaxVnd: number|null`;
public có cả khoảng gốc và `salePriceVnd/saleEndsAt` khi sale hợp lệ.
MediaRole=FRONT/BACK/SPINE/INSIDE_1/INSIDE_2/INSIDE_3.
`formatPriceRange(min: number|null,max: number|null): string` dùng mọi nơi.

- [x] RED migration trên scratch V5 có PUBLISHED/DRAFT, giá và media cũ:
  nângV6 giữ ID/slug/audit/asset, giá đơn→hai đầu bằng nhau, INSIDE→INSIDE_1,
  weightGnull và không đổi trạng thái ở task này. Không sửa migrationV1–V5.
- [x] RED API/form: giá20k–30k và20k–20k hợp lệ; thiếuđầu/đảo/float/0/âm bịchặn;
  weightG250 hợp lệ, null cho sách cũ đọc được, inputmới thiếu/float/0 bịchặn.
- [x] RED publicsort: min rồi max cùng chiều, code làm tie-break; sale thấp hơn
  min mới hiện, hết hạn/hidden/SOLD không sale, không %giảm từ khoảng.
- [x] Run targeted M5MigrationTest/BookCommandIntegrationTest/PublicCatalogueApiTest/
  FlashSaleApiTest và frontend npm test; ghi RED, triển khai field/mapping/check.
- [x] Đổi mọi consumer trong cùng task: detail/card/home/collection/preview/list/
  wishlist/enquiry/metadata; giữ priceNote y nguyên, không chọn một đầu làm giáchốt.
- [x] GREEN API/schema/frontend; browser tích hợp chuyển task6/7 theo ledger để migrate scratch một lần; update test fixture/old assertion
  vì contract đổi, giữ regression privacy/lookup/timing; commit code+docs.

### Task 4: Phiên upload riêng tư và cleanup an toàn

**Files:** Tạo V7__temporary_media_sessions.sql, media/UploadSessionDtos.java,
UploadSessionController.java, UploadSessionService.java,
UploadSessionTransactions.java; sửa MediaCleanupJob và reuse UploadLimiter/
ImageValidator/MediaGateway. Tạo UploadSessionApiTest/UploadSessionIntegrationTest.

**Interfaces:** `/api/v1/admin/upload-sessions`: POST tạo `{id,expiresAt,media}`,
GET `/{id}`, DELETE `/{id}` hủy; POST `/{id}/media` multipart từng ảnh,
GET/DELETE `/{id}/media/{mediaId}` preview/xóa. Không nhận URL client.
Service `create(AdminUser): UploadSession`, `upload(UUID,AdminUser,byte[],
String alt,String sourceRef): TemporaryMedia`; ảnh trả ID/trạng thái/dimensions.
Session có OPEN/CONSUMED/CANCELLED, createdAt/expiresAt/ownerId/bookId;
media có UPLOADING/READY/DELETE_PENDING, storagePublicId unique, owner-bound.

- [ ] RED anonymous401/STAFF403/ownerkhác404, GETcontent no-store không SSRcache;
  tối đa6ảnh còn sử dụng, ảnh lỗi không mất READY cũ, expiredsession khôngupload.
- [ ] RED provider timeout/restart sau intent hoặc sau upload: cleanup retry
  được, không cần BookCopy/Listing/code/auditCREATE trước final.
- [ ] RED cleanup cạnh tranh attach: chỉ claim trong transaction có rowlock,
  không xóa session CONSUMED/media đã gắn; upload xong sau expiry phải cleanup.
- [ ] Chạy targeted UploadSessionApiTest/UploadSessionIntegrationTest RED;
  implement intent→cloudoutsideDB→READY, dùng clock/testfake hiện có.
- [ ] GREEN cả MediaCleanupIntegrationTest; xác minh DB không có sách/mã mới
  chỉ do upload. Commit migration/service/tests+docs, chưa bật UI tạo mới.

### Task 5: Final tạoPUBLISHED, OWNER-only và bỏDRAFT

**Files:** Tạo V8__retire_draft.sql; sửa AdminBookController, BookCommandService,
BookStatusService, BookAccess, BookDtos, BookValidation, BookQueryService,
MediaTransactions và UploadSessionTransactions; sửa enumPublication trong BookDtos.
Tests: AdminBooksApiTest, BookCommandIntegrationTest, BookStatusIntegrationTest,
MediaLifecycleIntegrationTest; tạo BookCreateFinalizationTest.

**Interfaces:** POST `/api/v1/admin/books` nhận `BookCreate(BookWrite write,
UUID uploadSessionId,List<MediaAssignment> media,boolean confirmedActualCopy)`.
`MediaAssignment(UUID mediaId,MediaRole role)`; final response BookDetail như cũ.
`createPublished(AdminUser,BookCreate): BookDetail` khóa session, chống tạo trùng.
PUT sách thêm mapping reorder theo mediaID/version; publication chỉPUBLISHED/ARCHIVED.

- [ ] RED final2ảnh FRONT/BACK hoặc6ảnh READY thành công, thiếuảnh/requiredfield/
  confirmation/weight/giá bịchặn, foreignID/duplicaterole/id/expired bịchặn.
- [ ] RED doubleclick/concurrentfinal/lostresponse: chỉ1sách/slug/CREATE/PUBLISHED,
  cùng normalizedpayload trả cùngbook; khácpayload409; lưu requestfingerprint.
- [ ] RED final failure rollback không có aggregate nửa chừng; sessionREADY retry;
  final recheck OWNER active, CSRF/quyền sau I/O, không trust client.
- [ ] RED STAFF mọi endpoint ghi403 gồm create/update/media/status/taxonomy/
  collection/sale/config/user; đọc vẫnđược; backend guard kể cả gọiAPI trực tiếp.
- [ ] RED migration DRAFT→ARCHIVED giữdata/audit; PUBLISHED↔ARCHIVED trực tiếp,
  published_at đầu tiên giữ nguyên, không tựpublish; DRAFT request bịreject.
- [ ] RED reorder media nguyên tử/version/audit; conflict409 giữ publicmappingcũ,
  không tạm thiếu FRONT/BACK hoặc đổi IDảnh; không buộc đủ6ảnh.
- [ ] Chạy targeted RED, implement final/guards/state transition, bỏ API tạoDRAFT;
  sách cũ weightnull vẫn public nhưng OWNER lưusửa/hiệnlại phải bổ sung.
- [ ] GREEN fullbackend; commit cùng migration/tests/docs. Không chạy V6–V8 online.

### Task 6: Editor mới, multi-upload/reorder và STAFF chỉ xem

**Files:** Sửa admin/books/book-api.ts, book-editor.ts/.html, book-form.ts,
book-media-panel.ts, book-status-actions.ts, book-list.ts/.html và tests;
reuse image-upload.ts; tạo book-upload-queue.ts/.spec.ts nếu state vượt panel.
Sửa core/auth/admin-http.ts nếu cần progress events, giữ CSRF lifecycle hiện tại.

**Interfaces:** Queue item `{id,role,file,preview,state,progress,error,mediaId}`,
id là client UUID ổn định; mapping final dùng mediaId server, không dùng arrayindex.
BookApi có createSession/uploadTemporary/finalize/reorder theo task4–5.

- [ ] RED chọn/thả1–6file, nhiềuđợt, overflow rejectcảđợt và không ghiđè;
  mặc định bìa/lưng/gáy/nộidung1–3, cho bỏ qua optionalrole và2ảnh đủđăng.
- [ ] RED reorder trong upload async/retry/remove/replace: response gắn đúngID,
  không upload lạiREADY, không rò objectURL, concurrency giữ giới hạn hiện có.
- [ ] RED keyboard Đưalên/xuống/mobile và liveannouncement; STAFF không có thao
  tácghi; bỏLưunháp/filterNháp; Đăngsách khóa khi pending/finalbusy/invalid.
- [ ] RED sessionexpired/loginexpired/409/providerfail: giữform và ảnh còn hợp lệ,
  retryfinal dùng cùngsession/payload, không tự tạo thêm khi chưa rõ response.
- [ ] Chạy npm test RED; implement UI/API; confirmation ảnh/tình trạng đúng cuốn,
  cảnh báo rờiform, không lưu nháp/localStorage hoặc hứa phục hồi sau reload.
- [ ] GREEN fullfrontend; browser OWNER tạo2/6ảnh, edit/reorder/ẩn/hiện/SOLD;
  STAFF readonly, expired/concurrentedit/keyboard390px/laptop; commit+docs.

### Task 7: Regression, tài liệu baseline và bàn giao release

**Files:** docs/MASTER_PLAN/DATA/DESIGN/ARCHITECTURE/M2_SPEC/VERIFICATION,
DEPLOYMENT/PROGRESS/DEV_LOG/README và rootREADME; scripts/check-ssr.mjs nếu
assert media role/giá đang cố định. Không sửa fixture synthetic thành data thật.

**Interfaces:** Baseline phản ánh đúng contract đã triển khai và migration V6–V8;
runbook có backup/counts/fingerprint/dryrun/rollback trước userdeploy.

- [ ] Chạy frontend npm test, backend `bash code/backend/run-local.sh -B -ntp
  verify`, Workers `npm run build:workers` (lệnh một dòng, cwd tương ứng).
- [ ] Browser+SSR local:2/6ảnh, ngang/dọc, wishlist0/3cuốn/hidden/SOLD/giáthayđổi,
  expiry sale/foreground/multitab/preparecopy không dùngtextcũ; enquiry đúngorigin.
- [ ] `node scripts/check-ssr.mjs <QAorigin>` và `npm run check:workers:proxy`;
  kiểm privateJSON/no-store/cookie/CSRF và media4variant không lộ hidden/temp.
- [ ] Chuyển đủ baseline đã thay và bằng chứng sang tài liệu chuẩn; bỏ plan
  hếtvai trò chỉ khi còn đủ gate/nghiệmthu, ≤400dòng và linklocal/diff/ignorePASS.
- [ ] Review diff theo spec và rủi ro concurrency/privacy; commit/push dev,
  ghi commit/migration/limitation; user merge main và deploy theo runbook.
- [ ] Sau deploy có phép: smoke origin/media/quyền/giá và Lighthousewarm3lần/
  Home/detailMM-000020/wishlist cùng dữliệu; coldstart đo riêng. Chỉ đóng gate
  khi có output đạt, không lấy unittest hoặc score cũ thay bằng chứng online.
- [ ] Recovery/quota/rollback/ratelimit/runtimeleastprivilege/offhostretention
  tiếp theo VERIFICATION; không bắt chủ nhập lại pilot21cuốn đã xác nhận.

## Coverage và bàn giao lúc lập plan

- Spec§1–2/7→task1–2/7; §3–4→task4–6; §5/5.1→task3/5/6;
  §6→task1–2; §8 và các gate còn mở của performanceplan→task7.
- Đã self-review coverage, interfaces và năm ReviewFocus: task5/idempotency,
  task4/cleanup, task2/imageinputs, task3/legacydata, task7/staletext.
- Frontend baseline29/10: npm test PASS95/95,26files; backend verify PASS93run/0failure/0error/2live skipped (elevated).
- Chưa sửa application/schema, chưa chạy browsertrace hoặc Workersbuild mới;
  chưa migrate/backfill/deployonline. Plan chưa phải bằng chứng hoàn tất M5.
