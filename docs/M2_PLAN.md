# M2 Catalogue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Chỉ chọn phương thức sau review plan; không tự chạy subagent.

**Goal:** Chủ/Staff nhập sách thủ công với mã tự sinh, ba ảnh bảo vệ nháp, Owner xuất bản/đổi khả dụng, có version và audit.

**Architecture:** Angular admin gọi aggregate API Spring Boot. BookCopy/Listing tách bảng, lưu cùng giao dịch và dùng một version ở BookCopy. Media upload qua backend tới Cloudinary authenticated; trạng thái DB theo dõi ảnh đang tải và cleanup.

**Tech Stack:** Angular 21.2/Reactive Forms/Vitest hiện có; Spring Boot 4.1.1/Java 21/JPA/Flyway/PostgreSQL 18.4; Cloudinary HTTP5 SDK 2.5.0.

**Spec:** [M2_SPEC](M2_SPEC.md), được người dùng duyệt ngày 22/10/2026. **Plan đã được người dùng duyệt; thực thi tuần tự trong phiên này.** Task/gate chỉ hoàn tất khi có bằng chứng.

## Global Constraints

- Đọc spec cùng plan; không tự thay enum, API/DTO, quyền hoặc gate. Khi khác biệt, spec được duyệt là nguồn quyết định; báo và sửa plan trước khi code.
- Angular/Spring/PostgreSQL local giữ nguyên; không React/UI kit/state framework, Redis/broker, Docker hóa app, CI/CD hoặc deploy trong M2.
- MM-000001 từ PostgreSQL sequence NO CYCLE, bất biến; có thể khuyết, sau 999999 là MM-1000000. Không COUNT/MAX+1 hoặc reset sequence.
- AVAILABLE/SOLD độc lập DRAFT/PUBLISHED/ARCHIVED; version aggregate; mọi ghi dữ liệu + audit cùng transaction, không giữ transaction khi gọi cloud.
- Picture book bắt buộc PAPERBACK/HARDCOVER; ALL không phải dữ liệu; nhiều nhóm tuổi/một category; PRE_A1/A1/A2/B1/B2/C1/C2 hoặc null.
- Ba role FRONT/BACK/INSIDE; chỉ JPEG/PNG, tối đa 10 MiB/file và 25 megapixel; Cloudinary authenticated, không lộ signed URL/secret.
- Rate upload 30 lần/10 phút/admin; tối đa bốn upload provider đồng thời/instance; timeout upload tổng tối đa 60 giây.
- Cleanup mỗi 10 phút, UPLOADING quá 1 giờ→DELETE_PENDING, tối đa 100 record/lượt; không xóa ACTIVE hoặc tái sử dụng public_id.
- Chỉ me_may_test cho thao tác dọn fixture. Không copy dữ liệu khách từ bảng vận hành; chỉ seed reference, không publish SYNTHETIC.
- M3/M4 mới có public catalogue/contact/wishlist; import CSV/Excel ngay sau MVP. Không hard delete sách, order, in tem hoặc video upload.
- Tài liệu dự án <=400 dòng/file, DEV_LOG ngoại lệ; đăng ký spec/plan trong chỉ mục, checkpoint sau từng task. Không nén dòng để lách trần.

## Review Focus

1. q chứa `%`, `_`, dấu nháy hoặc tiếng Việt phải tìm literal, không biến thành wildcard/truy vấn mở rộng — test ở task 4.
2. Payload thêm bookCode/actor/publication hoặc field lạ phải bị từ chối, không âm thầm sửa metadata server — task 4.
3. Header ảnh khai kích thước lớn/overflow nhưng file ít byte phải bị chặn trước decode tốn bộ nhớ — task 5.
4. Upload chậm trong lúc Owner publish hoặc tab khác thay slot phải trả conflict và cleanup đúng ảnh mới, giữ ảnh thắng — task 6.
5. Mất response create sau khi server đã lưu không được tự POST lại và sinh hai mã cho cùng thao tác — task 8.

## Cấu trúc file và quy ước dùng trong plan

Đường dẫn rút gọn: **B**=`code/backend/src/main/java/vn/memay`, **T**=`code/backend/src/test/java/vn/memay`, **F**=`code/frontend/src/app`, **R**=`code/backend/src/main/resources`. Tên dưới đây là file dự kiến, không phải file đã tồn tại.

| Nhóm | File tạo mới / file hiện có cần sửa |
|---|---|
| Dữ liệu | R/db/migration/V2__catalogue.sql, V3__catalogue_taxonomy.sql; B/catalogue/BookCopy.java, BookCopyRepository.java, BookCodeGenerator.java, BookValidation.java, BookAccess.java; B/listing/Listing.java, ListingRepository.java; B/media/BookMedia.java, BookMediaRepository.java |
| Aggregate/API | B/catalogue/BookDtos.java, BookMapper.java, BookCommandService.java, BookQueryService.java, BookStatusService.java, AdminBookController.java; B/common/AdminActorResolver.java, AdminApiException.java, AdminApiExceptionHandler.java, TimeConfiguration.java |
| Taxonomy/audit | B/taxonomy/Category.java, CategoryRepository.java, Collection.java, CollectionRepository.java, TaxonomyDtos.java, TaxonomyService.java, CollectionService.java, AdminTaxonomyController.java; B/audit/AuditEvent.java, AuditRepository.java, AuditService.java |
| Media | B/media/MediaDtos.java, MediaGateway.java, CloudinaryMediaGateway.java, UnconfiguredMediaGateway.java, MediaConfiguration.java, ImageValidator.java, UploadLimiter.java, MediaTransactions.java, MediaService.java, MediaCleanupJob.java, AdminMediaController.java |
| Test support | T/support/PgTestData.java, AdminHttpClient.java, FakeMediaGateway.java; test class tại package của task, xem tên cụ thể bên dưới |
| Frontend API | F/core/auth/admin-http.ts; F/features/admin/books/book.models.ts, book-api.ts, book-form.ts, book-copy.ts; F/features/admin/collections/collection-api.ts |
| Frontend UI | F/features/admin/books/book-list.ts/.html/.scss, book-editor.ts/.html/.scss, book-media-panel.ts/.html/.scss, book-status-actions.ts, book-preview.ts/.html/.scss, book-audit-panel.ts; F/features/admin/collections/collection-list.ts/.html/.scss |
| Sửa tích hợp | B/auth/SecurityConfiguration.java; T/auth/AuthIntegrationTest.java, OwnerBootstrapTest.java; F/app.routes.ts, layouts/admin-layout.ts, core/page-metadata.ts; R/application.yml; code/backend/pom.xml; .env.example; README.md; docs/README.md, PROGRESS.md, DEV_LOG.md, VERIFICATION.md |

- Java DTO đặt trong BookDtos/MediaDtos, static record/enum rõ tên; không serialize entity. Type TS cùng tên field/spec, ID là string và version là number.
- BookDtos định nghĩa BookWrite, BookDetail, BookSummary, BookFilter, PreviewBook, AuditSummary, Page<T>, Publication, Availability; MediaDtos có MediaRole, MediaState, ImageInfo, UploadedMedia, DeleteResult; TaxonomyDtos có Taxonomy, CollectionCreate, CollectionUpdate, CollectionDto. DTO field theo spec 7, không tạo shape thứ hai.
- Ký hiệu `book-list.ts/.html/.scss` nghĩa là ba file cùng basename book-list trong cùng thư mục, không phải thư mục con có tên file .ts.
- Method service có actor là `AdminUser` lấy từ session bởi AdminActorResolver, không nhận actor từ JSON. Clock bean chung phục vụ timestamp/limiter/cleanup và fixed-clock tests.
- Mọi integration test dùng profile test/bootstrap=false và DynamicPropertySource gọi PgTestData.requireTestJdbcUrl trước khi Spring/Flyway mở datasource; không chỉ kiểm tên DB sau khi migration đã chạy. Test helper/annotation không được đổi cấu hình production.
- Namespace dev/test tách biệt; FakeMediaGateway chỉ ở test config. Không có profile mock tạo ảnh giả để vượt publish/pilot thật.
- Mỗi task dùng chu trình RED→GREEN→commit local, không push. RED có thể là compile failure khi API chưa tồn tại; GREEN phải chạy lại đúng test, không suy từ code.
- Lệnh backend bên dưới chạy tại code/backend qua run-local.sh (nạp env nhưng không in secret); frontend tại code/frontend. Không chạy các lệnh này trong lượt soạn plan.
- Trước code, kiểm git status và giữ thay đổi người dùng; lưu spec/plan/bàn giao liên quan thành commit tài liệu local rồi tạo nhánh feat/m2-admin-catalogue từ HEAD đó. Dùng workspace hiện có, không thêm worktree hoặc reset nhánh/dữ liệu; nếu nhánh đã tồn tại thì kiểm tra và tiếp tục đúng checkpoint.

## Task 1 — Schema, reference và fixture an toàn

**Files:** migrations/entities/repositories trong bảng cấu trúc, enum tối thiểu BookDtos/MediaDtos dùng bởi entity; T/support/PgTestData.java, PgTestDataTest.java; sửa hai test auth M1 để guard trước Flyway và cleanup có guard; tạo T/catalogue/M2MigrationTest.java, BookCodeGeneratorTest.java.

**Interfaces:** BookCodeGenerator.nextCode():String, static format(long):String; BookCopy có @Version và touch(Instant); PgTestData.requireTestJdbcUrl(String):String chỉ chấp nhận JDBC PostgreSQL database me_may_test; clean(JdbcTemplate):void kiểm lại current_database()=me_may_test trước cleanup.

- [x] Viết failing `M2MigrationTest.upgradesM1WithoutLosingAdmin` và `rejectsMultipleActiveMediaPerRole`: migration V1→V3 giữ user, FK/partial unique/code unique đúng. Dùng schema UUID tạm trong me_may_test để thử migration mới/nâng cấp; không clean public schema bằng Flyway.
- [x] Viết `BookCodeGeneratorTest.expandsBeyondSixDigits`: `assertThat(BookCodeGenerator.format(1000000L)).isEqualTo("MM-1000000")`; test concurrent nextCode không trùng, rollback không trả lại số. Định dạng dùng Locale.ROOT và độ rộng tối thiểu, không lpad cắt số.
- [x] Viết `PgTestDataTest.rejectsDevDatabaseBeforeConnecting`: `assertThatThrownBy(() -> PgTestData.requireTestJdbcUrl("jdbc:postgresql://localhost:5432/me_may_dev")).isInstanceOf(IllegalArgumentException.class)`; null/malformed cũng bị từ chối, test URL pass không mở connection.
- [x] Chạy RED: `bash run-local.sh -B -ntp -Dtest=M2MigrationTest,BookCodeGeneratorTest,PgTestDataTest test`; lưu failure thật trước tạo schema/code.
- [x] Thêm migrations/seed đúng spec; mapping entity trùng SQL. PgTestData dọn audit/media/mapping/listing/book/collection trước admin_user; giữ reference, không reset sequence hoặc đụng DB dev. Schema test tạm được xóa trong finally sau guard.
- [x] Chạy lại GREEN cùng lệnh rồi `bash run-local.sh -B -ntp -Dtest=AuthIntegrationTest,OwnerBootstrapTest test`; xác nhận auth cũ không hỏng vì FK mới và Flyway không thể nhận DB dev qua test config.
- [x] Cập nhật checkpoint và commit `feat: add M2 catalogue schema and generated codes`; stage đúng file task, không git add . mù quáng.

## Task 2 — Lưu aggregate, validation và audit nguyên tử

**Files:** BookDtos/BookValidation/BookAccess/BookMapper/BookCommandService; AuditEvent/AuditRepository/AuditService; B/common/TimeConfiguration.java; T/catalogue/BookCommandIntegrationTest.java.

**Interfaces:** BookCommandService.create(AdminUser,BookWrite):BookDetail; update(long id,long version,AdminUser,BookWrite):BookDetail. BookValidation.validateDraft(BookWrite):void; BookAccess.requireWritable(AdminUser,Publication):void. AuditService.record(AdminUser,String targetType,long targetId,String action,Map before,Map after,long version):void.

- [x] Viết failing `createsDraftAndListingAtomically`, `duplicateTitleIsTwoPhysicalCopies`, `rejectsMissingPictureBinding`, `nullableLevelClearsBasis`, `staleWriteDoesNotChangeListingOrAudit`; assert create có DRAFT/AVAILABLE, hai mã khác, update cũ trả conflict và dữ liệu/audit không đổi.
- [x] Viết `auditFailureRollsBackBothTables` bằng audit collaborator test-only ném lỗi; `noOpDoesNotBumpVersion` so sánh root version và số audit. Test biên giá 1/999999999999, 0/float, text trim/null và link HTTPS không userinfo.
- [x] RED: `bash run-local.sh -B -ntp -Dtest=BookCommandIntegrationTest test`.
- [x] Implement transaction create/update, set root updatedAt + @Version, flush trước map DTO; validate full BookWrite theo spec 4–5. Check version kể cả no-op; mapping age/collection cùng transaction, không delete/recreate Listing khi update.
- [x] Audit field allowlist, actor/time server, không secret/cloud URL; Clock bean trong TimeConfiguration tiêm vào service, không mock thời gian hệ thống toàn JVM.
- [x] GREEN cùng lệnh; checkpoint và commit `feat: save book aggregates with validation and audit`.

## Task 3 — Publication, availability và quyền tại transaction

**Files:** B/catalogue/BookStatusService.java; cập nhật BookAccess/BookValidation; T/catalogue/BookStatusIntegrationTest.java, BookRaceIntegrationTest.java.

**Interfaces:** BookStatusService.publication(long id,long version,AdminUser,Publication status,boolean confirmedActualCopy):BookDetail; availability(long id,long version,AdminUser,Availability status):BookDetail.

- [x] Viết failing `ownerPublishesOnlyWithThreeActiveRoles`, `staffCannotPublishOrChangeAvailability`, `archiveRestorePreservesCodeAndFirstPublishedAt`; assert từng field/ảnh thiếu bị từ chối và no-op không tạo publish time mới.
- [x] Viết `staffSaveRacingOwnerPublish` và `twoVersionsHaveOneWinner` dùng barrier/latch, hai transaction/connection; assert tối đa một thành công, không có cập nhật một phần hoặc audit thành công cho request thua.
- [x] RED: `bash run-local.sh -B -ntp -Dtest=BookStatusIntegrationTest,BookRaceIntegrationTest test`.
- [x] Implement role/state/version checks trong transaction; DRAFT→PUBLISHED→ARCHIVED→DRAFT, không hard delete; publish cần confirmedActualCopy và validated active slots. Giá/availability khác publication; published update không làm mất field bắt buộc.
- [x] Dùng fixture DB ACTIVE ở test nội bộ cho state machine, ghi rõ không phải chứng minh ảnh thật; không cung cấp endpoint tạo metadata ACTIVE cho client.
- [x] GREEN cùng lệnh; checkpoint và commit `feat: guard publication and availability transitions`.

## Task 4 — REST, tìm kiếm, taxonomy, collection và preview projection

**Files:** AdminBookController/BookQueryService, common resolver/error handler; taxonomy DTO/services/controller; T/support/AdminHttpClient.java; T/catalogue/AdminBooksApiTest.java, T/taxonomy/CollectionsApiTest.java; sửa SecurityConfiguration cho no-store admin và application.yml cho strict JSON unknown fields.

**Interfaces:** AdminActorResolver.current(Authentication):AdminUser; BookQueryService.list(AdminUser,BookFilter):Page<BookSummary>, detail(long,AdminUser):BookDetail, preview(long,AdminUser):PreviewBook, audit(long,AdminUser,PageRequest):Page<AuditSummary>; TaxonomyService.get():Taxonomy; CollectionService.list(AdminUser):List<CollectionDto>, create(AdminUser,CollectionCreate):CollectionDto, update(long,long,AdminUser,CollectionUpdate):CollectionDto.

- [ ] Viết failing API tests đúng status/body/Location/ID string tại spec 6–7; assert `forgedBookCodeOrActorReturns400` và unknown field bị từ chối bằng DTO strict parsing, không đổi contract auth `{error}`.
- [ ] Viết `searchTreatsPercentAndUnderscoreLiterally`, tên có dấu/nháy; q>200, page<0,size>100 và enum sai→400; list ổn định updatedAt/id, collection sortOrder/id. Anonymous/CSRF/Staff gọi thẳng đều đúng quyền.
- [ ] Viết `previewDoesNotLeakInternalFields`: `assertThat(json).doesNotContain("readingLevelBasis", "sourceRef", "storagePublicId", "cloudinary")`; preview có nội dung thiếu được gắn trạng thái nháp qua UI, không public API.
- [ ] RED: `bash run-local.sh -B -ntp -Dtest=AdminBooksApiTest,CollectionsApiTest test`.
- [ ] Implement mọi endpoint JSON spec 7, binding parameters/escape LIKE, no-store, DTO projection và mapping lỗi 400/403/404/409. Owner collection tạo/sửa/active/version; slug bất biến, inactive không gán mới, mapping cũ được giữ/bỏ.
- [ ] AdminHttpClient test helper dùng cookie jar, CSRF mới sau login và request JSON/multipart; không nới security để test pass. Kiểm strict parsing không đổi login form-encoded hoặc auth `{error}`.
- [ ] GREEN cùng lệnh, rồi auth regression; checkpoint và commit `feat: expose guarded admin catalogue APIs`.

## Task 5 — Cloudinary adapter, validation ảnh và giới hạn tài nguyên

**Files:** MediaDtos/MediaGateway/CloudinaryMediaGateway/UnconfiguredMediaGateway/MediaConfiguration/ImageValidator/UploadLimiter; pom.xml, application.yml, .env.example; T/media/ImageValidatorTest.java, UploadLimiterTest.java, CloudinaryMediaGatewayTest.java, T/support/FakeMediaGateway.java.

**Interfaces:** MediaGateway.upload(String publicId,byte[] bytes):UploadedMedia; openPreview(String publicId):InputStream; delete(String publicId):DeleteResult. UploadedMedia record(assetId,publicId,format,bytes,width,height); DeleteResult=DELETED/NOT_FOUND. ImageValidator.validate(byte[]):ImageInfo. UploadLimiter.acquire(long actorId):AutoCloseable, ném lỗi 429 nếu hết hạn mức/chỗ.

- [ ] Viết failing `rejectsSpoofedAndTruncatedImages`, biên 10 MiB/25 MP; `hugeHeaderFailsBeforeDecode` đọc dimensions bằng ImageReader trước decode và nhân (long)width*height để tránh overflow; JPEG/PNG thật pass, HEIC/WebP/SVG/PDF fail.
- [ ] Viết `thirtyFirstUploadIs429`, cửa sổ 10 phút, slot đồng thời thứ năm bị chặn; exception không rò permit; fixed Clock và dọn limiter entry hết hạn.
- [ ] Viết adapter test kiểm resource_type=image,type=authenticated, namespace/UUID, eager JPEG <=1280px/giữ tỉ lệ/orient/strip metadata, overwrite=false; không trả/log signed URL, không theo URL host/redirect tùy ý.
- [ ] RED: `bash run-local.sh -B -ntp -Dtest=ImageValidatorTest,UploadLimiterTest,CloudinaryMediaGatewayTest test`.
- [ ] Thêm duy nhất com.cloudinary:cloudinary-http5:2.5.0; giữ version stack khác. Adapter cấu hình connect/read timeout hữu hạn và deadline upload 60s có hủy I/O, không chỉ timeout Future rồi bỏ request chạy ngầm; test bằng transport giả chậm, không gọi cloud thật.
- [ ] Configure multipart file 10MB/request 11MB để có chỗ cho metadata; giới hạn ImageIO vẫn tính chính xác 10*1024*1024 byte. Config thiếu dùng UnconfiguredMediaGateway trả 503, không làm auth/startup fail và không dùng fake production.
- [ ] GREEN cùng lệnh, dependency tree kiểm không kéo SDK frontend; checkpoint và commit `feat: add private Cloudinary media adapter`.

## Task 6 — Vòng đời ảnh, cleanup và API stream bảo vệ nháp

**Files:** MediaTransactions/MediaService/MediaCleanupJob/AdminMediaController/BookMediaRepository; T/media/MediaLifecycleIntegrationTest.java, MediaCleanupIntegrationTest.java, MediaPrivacyApiTest.java.

**Interfaces:** MediaService.upload(long bookId,MediaRole,long version,AdminUser,byte[] file,String alt,String sourceRef):BookDetail; updateMetadata(long,MediaRole,long,AdminUser,String alt,String sourceRef):BookDetail; remove(long,MediaRole,long,AdminUser):BookDetail; content(long,MediaRole,AdminUser):InputStream. MediaTransactions.begin/attach/fail là bean transaction riêng; MediaCleanupJob.runOnce():void dùng Clock.

- [ ] Viết failing `failedReplacementKeepsOldImage`, `dbFailureAfterUploadLeavesRecoverableIntent`, `uploadFinishesAfterPublishReturns409`, `twoUploadsSameSlotOnlyOneActive`; FakeMediaGateway có latch để chủ động giữ/release upload và lỗi theo từng operation.
- [ ] Viết cleanup `restartRecoversStaleUploading`, `deleteNotFoundIsSuccess`, `retryDoesNotDeleteWinner`, `cleanupClaimCannotRaceAttach`; assert UPLOADING chưa đủ 1h/ACTIVE không bị xóa, tối đa100/lượt và failure giữ DELETE_PENDING.
- [ ] Viết API tests anonymous content→401, authenticated stream JPEG/no-store/nosniff/không redirect; metadata không cloud URL; 502/503/413/415/429 đúng; invalid role/CSRF/Staff published bị chặn trước provider; published DELETE ảnh→409.
- [ ] RED: `bash run-local.sh -B -ntp -Dtest=MediaLifecycleIntegrationTest,MediaCleanupIntegrationTest,MediaPrivacyApiTest test`.
- [ ] Implement đúng hai transaction trước/sau cloud theo spec 8; dùng bean MediaTransactions tránh @Transactional self-invocation. Attach recheck state/role/version, chuyển ảnh cũ DELETE_PENDING và tăng root version/audit cùng transaction.
- [ ] Worker conditional state update và provider destroy invalidate=true; giữ key không tái sử dụng, không giữ DB transaction khi upload/delete/stream. Preview stream đóng InputStream khi client disconnect/lỗi, không log token/URL.
- [ ] Implement PATCH metadata/default alt theo role+mã; UI-independent content path chỉ từ ACTIVE row; private stream ký URL ở backend, không cung cấp public CDN endpoint M2.
- [ ] GREEN cùng lệnh rồi toàn bộ backend `bash run-local.sh -B -ntp verify`; checkpoint và commit `feat: manage recoverable three-photo lifecycle`.

## Task 7 — Frontend contracts và transport session/CSRF

**Files:** F/core/auth/admin-http.ts; books/book.models.ts, book-api.ts; collections/collection-api.ts; spec files cùng thư mục với mỗi service.

**Interfaces:** AdminHttp.get<T>(path:string,params?):Observable<T>; mutate<T>(method:'POST'|'PUT'|'PATCH'|'DELETE',path:string,body?):Observable<T>; upload<T>(path:string,body:FormData):Observable<HttpEvent<T>>. BookApi.list(BookFilter):Observable<Page<BookSummary>>, get(id:string):Observable<BookDetail>, create(BookWrite):Observable<BookDetail>, update(id:string,version:number,BookWrite):Observable<BookDetail>.

- BookApi.publication(id,version,status,confirmedActualCopy?):Observable<BookDetail>; availability(id,version,status):Observable<BookDetail>; preview(id):Observable<PreviewBook>; audit(id,page):Observable<Page<AuditSummary>>; upload(id,role,version,FormData):Observable<HttpEvent<BookDetail>>; updateMedia(id,role,version,alt,sourceRef):Observable<BookDetail>; removeMedia(id,role,version):Observable<BookDetail>. id:string,version/page:number, role/status dùng union tương ứng spec, không any.
- CollectionApi.list():Observable<CollectionDto[]>; create(CollectionCreate):Observable<CollectionDto>; update(id:string,version:number,CollectionUpdate):Observable<CollectionDto>.

- [ ] Viết failing HttpTestingController tests: credentials=true, transferCache=false, CSRF fetch trước mutation, payload version/enum/ID string đúng; multipart không tự set Content-Type boundary; POST không tự retry khi timeout.
- [ ] Assert chưa login/CSRF cũ/401 lỗi truyền về component để giữ form; mutation không dùng token lưu localStorage và không tự replay POST khi refresh token.
- [ ] RED: `npm test -- --include='src/app/core/auth/admin-http.spec.ts' --include='src/app/features/admin/books/book-api.spec.ts' --include='src/app/features/admin/collections/collection-api.spec.ts'`.
- [ ] Implement typed transport/services; tái dùng auth session/guard M1, không sửa login semantics; media source dùng contentPath same-origin proxy. Upload progress cần fetch/XHR backend có báo progress: dùng HttpClient XHR chỉ cho transport upload, không đổi toàn app/SSR.
- [ ] GREEN cùng lệnh; checkpoint và commit `feat: connect typed admin catalogue client`.

## Task 8 — Bảng sách, editor và lưu nháp an toàn

**Files:** books/book-list.ts/.html/.scss, book-editor.ts/.html/.scss, book-form.ts, book-copy.ts; F/app.routes.ts, layouts/admin-layout.ts; book-list.spec.ts, book-editor.spec.ts, book-form.spec.ts.

**Interfaces:** buildBookForm():FormGroup; toBookWrite(form):BookWrite gửi đủ field; BookEditor.load(id?)/saveDraft():void dùng BookApi; BookList đồng bộ q/publication/availability/page vào query params. book-copy.ts chỉ chứa các chuỗi UI đã chốt, không là framework dịch thuật.

- [ ] Viết failing component tests `createsThenNavigatesToEditor`, `pictureBookRequiresOneBinding`, `ageGroupsAllowMultiple`, `unknownReadingLevelIsOptional`, `inactiveCollectionCanBeKeptOrRemoved` và validation field/focus đúng.
- [ ] Viết `lostCreateResponseDoesNotPostAgain`: sau một POST và timeout, `expect(createRequests).toHaveLength(1)` dù component hiện gợi ý kiểm tra danh sách; double-click cũng chỉ một request.
- [ ] Viết `conflictPreservesDirtyForm`, `sessionExpiryKeepsFormInMemory`, `leavingDirtyFormWarns`; 400/409/401/network không xóa nội dung, không báo thành công, không có admin data trong localStorage.
- [ ] RED: `npm test -- --include='src/app/features/admin/books/book-list.spec.ts' --include='src/app/features/admin/books/book-editor.spec.ts' --include='src/app/features/admin/books/book-form.spec.ts'`.
- [ ] Implement list/editor Reactive Forms, guard rời trang, mã readonly/tự tạo khi lưu, giữ state màn hình khi xác thực lại; không lưu bản nháp vào browser storage. Navigation query back/pagination giữ tìm kiếm; chỉ hiện menu chức năng đã có.
- [ ] GREEN cùng lệnh; checkpoint và commit `feat: build admin book list and draft editor`.

## Task 9 — Ba ảnh, Owner actions, preview và audit

**Files:** books/book-media-panel.ts/.html/.scss, book-status-actions.ts, book-preview.ts/.html/.scss, book-audit-panel.ts; gắn vào book-editor; F/core/page-metadata.ts; tests cùng tên .spec.ts.

**Interfaces:** BookMediaPanel nhận BookDetail và dirty:boolean, emit BookDetail mới; BookStatusActions nhận BookDetail/role, emit BookDetail; BookPreview đọc BookApi.preview(id); BookAuditPanel đọc BookApi.audit(id,page).

- [ ] Viết failing `threeFixedSlotsUploadSequentially`, `dirtyFormBlocksUpload`, `replacementFailureKeepsOldPreview`; mỗi response update version trước request ảnh kế tiếp, retry lỗi không mất form hay tạo thêm slot.
- [ ] Viết `staffHasNoOwnerActions`, `publishNeedsActualCopyConfirmation`, hide/restore/sold đúng API/version và modal nêu mã; audit pagination, metadata ảnh chỉnh được không upload lại.
- [ ] Viết `previewHidesInternalFieldsAndMarksIncompleteDraft`, giá note/mức đọc/title ghép đúng DATA; link video dùng anchor HTTPS an toàn, không embed; noindex admin biến mất khi chuyển trang public như regression M1.
- [ ] RED: `npm test -- --include='src/app/features/admin/books/book-media-panel.spec.ts' --include='src/app/features/admin/books/book-status-actions.spec.ts' --include='src/app/features/admin/books/book-preview.spec.ts' --include='src/app/features/admin/books/book-audit-panel.spec.ts'`.
- [ ] Implement ba slot/progress/alt/sourceRef, action theo quyền và preview đã lưu; không trái tim/Zalo giả hoạt động trong M2. Authenticated images dùng contentPath qua proxy, không signed cloud URL trong DOM.
- [ ] GREEN cùng lệnh, `npm test` kiểm metadata regression; checkpoint và commit `feat: add guarded media publication and preview UI`.

## Task 10 — Quản trị collection tối thiểu

**Files:** collections/collection-list.ts/.html/.scss, collection-list.spec.ts; F/app.routes.ts và F/layouts/admin-layout.ts; nối lựa chọn collection trong book-editor.

**Interfaces:** CollectionList.load/save():void dùng CollectionApi; OWNER tạo/sửa/ẩn, STAFF chỉ dùng danh sách để gán nháp, không menu quản trị collection. Không UI tạo/sửa các taxonomy cố định.

- [ ] Viết failing `ownerCanCreateAndDeactivate`, `slugImmutableAfterCreate`, `staleCollectionEditKeepsForm`, `staffCannotMutate`; inactive biến mất khỏi lựa chọn mới nhưng liên kết cũ không tự mất hoặc ẩn sách.
- [ ] RED: `npm test -- --include='src/app/features/admin/collections/collection-list.spec.ts'`.
- [ ] Implement form name/slug/sort/active/version, validate ASCII slug spec, error/unsaved/focus như editor; không xóa collection hoặc cascade sách.
- [ ] GREEN cùng lệnh và book-editor regression; checkpoint và commit `feat: add owner collection management`.

## Task 11 — Tích hợp, cloud thật, restore/pilot và bàn giao

**Files:** T/media/MediaLiveTest.java (opt-in), cập nhật README.md/docs/VERIFICATION.md/PROGRESS.md/DEV_LOG.md, .gitignore root nếu thêm output backup/artifact; không commit ảnh pilot/dump/secret.

**Interfaces:** Live test chỉ bật khi MEMAY_LIVE_MEDIA_TEST=true, dùng me_may_test và CLOUDINARY_NAMESPACE=memay/test; namespace khác/thiếu guard phải từ chối trước upload/delete. Không dùng hook xóa ảnh pilot production.

- [ ] Trước áp migration vào me_may_dev: backup DB dạng custom ở thư mục local ignored/quyền hạn chế; dùng schema test task1 kiểm V1→V3. Không reset V1/checksum hoặc DB khác trong container my-postgres.
- [ ] Viết và chạy RED→GREEN live opt-in bằng credential người dùng cấu hình ở .env ignored: upload JPEG/PNG test, unsigned original/derived bị chặn, admin stream đúng, replace/cleanup/not-found và metadata không rò. Không in signed URLs hoặc secret trong report.
- [ ] Live test có finally cleanup đúng các public_id nó đã tạo trong memay/test, kể cả assertion lỗi; không enumerate/xóa cả namespace hoặc ảnh pilot. Chỉ dọn row test sau khi xác nhận cloud cleanup, nếu thất bại giữ ID/DELETE_PENDING nội bộ để retry.
- [ ] Chạy backend `bash run-local.sh -B -ntp verify`; frontend `npm test`, `npm run build` và `node scripts/check-ssr.mjs http://127.0.0.1:4200` tại code/frontend khi dev server đã chạy. Ghi kết quả mới, không tái dùng số test M1.
- [ ] Browser Owner/Staff tại proxy local: tạo→sửa→ba ảnh→preview→publish→sold→hide→restore; hai tab stale, session hết hạn, disconnect và bàn phím. Không tạo tài khoản Staff demo cố định trong production; tài khoản test local qua fixture có guard, giữ credential ngoài log.
- [ ] Khôi phục backup vào DB scratch riêng `me_may_restore_test` với quyền DBA, không restore đè dev/test; đối chiếu code/high-water sequence/media references/auth. Nếu chưa có quyền DBA thì ghi chưa kiểm chứng, giữ gate restore/pilot còn mở; không tự đổi role global.
- [ ] Chủ thử 10–20 cuốn thật và nhãn mã; xác nhận giá/ba ảnh/tình trạng, đo thời gian nhập/tìm/sửa; không lấy hàng giao dịch từ ảnh Excel hay ảnh AI làm pilot.
- [ ] Review toàn nhánh đối chiếu spec: race/quyền/cloud leak/cleanup/audit và hồi quy M1; sửa finding quan trọng rồi chạy lại test liên quan. Chọn người/agent review theo phương thức đã được người dùng duyệt, không tự dispatch khi chưa được phép.
- [ ] Cập nhật bằng chứng/giới hạn trong VERIFICATION, trạng thái gate trong PROGRESS và checkpoint DEV_LOG; thiếu credential/pilot/live/restore không được đánh dấu M2 hoàn tất. Không tự mở rộng sang M3/deploy/import.
- [ ] Kiểm Markdown/link/giới hạn dòng, secrets/ignore và git diff --check; commit `docs: record M2 verification and handoff`. Chỉ gộp spec/plan vào tài liệu chuẩn rồi xóa khi đã hoàn tất và chuyển đủ tiêu chí, không xóa khi còn gate mở.

## Tự rà soát và cách thực thi

- Coverage: spec 1–4→task1–2; 5–6→task2–4/9; 7→task4/6/7; 8→task5–6/9; 9→task2–4/6; 10→task7–10; 11–12→task1/5/11; 13→global constraints và handover.
- Năm Review Focus đều có test ở task sở hữu code; test helper không bỏ guard database, mock media không bị dùng để nghiệm thu cloud/pilot.
- Người dùng đã chọn thực thi tuần tự bằng executing-plans; không dispatch implementer/reviewer theo từng task. Review độc lập toàn nhánh ở cuối theo skill.
- Đề xuất tự triển khai trong phiên này: các task phụ thuộc chặt vào aggregate version/DTO/media transaction, giữ một người triển khai giúp ít lệch interface; vẫn review toàn nhánh trước nghiệm thu.
- Thông tin cần trước gate live/pilot: credential Cloudinary test và 10–20 cuốn thật; không yêu cầu gửi secret qua chat. Thiếu chúng vẫn có thể làm task code/test giả nhưng phải giữ gate tương ứng chưa đạt.
- SDK được khóa từ [Cloudinary Java guide](https://cloudinary.com/documentation/java_integration) và [Maven Central 2.5.0](https://central.sonatype.com/artifact/com.cloudinary/cloudinary-http5/2.5.0); không dùng kết quả search cache GitHub cũ làm bằng chứng phiên bản mới nhất.
