# Kế hoạch hiệu năng nhập và xuất bản sách

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giảm request/bytes và thời gian nhập–đăng–xem lại sách, có số đo đối chứng.
**Architecture:** Đo từng tầng trước; giữ eager đồng bộ và endpoint media được xác thực.
Dùng JPEG320 hiện có cho grid, handoff BookDetail một lần, cache metadata memory,
audit theo nhu cầu và prefetch chuẩn hóa một ảnh. Query/parallel upload có gate đo.
**Tech Stack:** Angular21/RxJS, Spring Boot4/Java21, PostgreSQL, Cloudinary, Pythonstdlib.
**Spec:** [BOOK_PUBLISH_PERFORMANCE_SPEC](BOOK_PUBLISH_PERFORMANCE_SPEC.md), user duyệt30/10.
**Status:** Kế hoạch chờ user review; chưa triển khai product code.
**Execution:** Native/tuần tự trong phiên theo phương thức đã dùng; code/commit/pushdev.

## Global Constraints

- Giữ authenticated/no-store/nosniff/OWNER ghi, STAFF đọc, audit và version conflict.
- Giữ eager5bản đồng bộ; không thêm dịch vụ/dependency, không bật public/async/cachemedia.
- JPEGquality0,85, cạnh dài≤2560px, alpha trắng, EXIF, nguồn≤10MB/25MP.
- Preview1280 giữ nguyên; grid JPEG320; không tạo eager thứsáu hoặc bỏ bản còn consumer.
- UploadLimiter backend4inflight/30attempt10phút; final2–6ảnh, FRONT/BACK bắt buộc.
- 5vòng warm/workload2và6ảnh, median/min/max; first-hit/cold/Neonresume ghi riêng.
- Chỉ QA riêng được ghi; không sửa catalogue/asset bán thật, không tựmain/deploy/migrateonline.
- Evidence/HAR/assets ledger ignored; docs≤400dòng trừDEV_LOG; giữ chỉ mục docs/README.

## Review Focus

1. Logout/401 trong khi metadata hoặc POST response đang về: không để cache/seed lọt phiên khác (Task5).
2. Streaming preview lỗi sau khi đã gửi header: timing vẫn kết thúc đúng, không log URL/token (Task2/4).
3. Xóa/thay/expire row đang prefetch: không upload row ma, không revoke blob còn dùng (Task6).
4. Retry final sau dữ liệu sách thay đổi: không seed response cũ đè bản đang sửa, không tạo sách thứhai (Task5/7).
5. Ảnh cũ thiếu320 và lỗi401/timeout: chỉ trường hợp thiếu bản mới được fallback1280 (Task4).

## File boundaries và phụ thuộc

- `scripts/book-performance/`: công cụ sanitize/tổng hợp evidence, hướng dẫn đo;
  không chứa credentials, rawHAR hoặc automation transcript.
- `vn.memay.common` performance classes: trace/scope/filter và JDBC counters opt-in;
  không triển khai framework telemetry hoặc log SQL/payload.
- `media`: gateway/endpoint chọn320/1280; transaction/lifecycle không đổi.
- `core/auth`: epoch của phiên và memory cache invalidation; không cache quyền.
- `admin/books`: handoff, ảnh grid/viewer, audit, queue preparation và metrics opt-in.
- Task1→2→3 tạo baseline. Task4/5/6 dùng baseline, kiểm riêng từng thay đổi.
  Task7 tối ưuSQL đã đo. Task8 chỉ spikeparallel nếu có lợi. Task9 đóng regression/evidence.

### Task1 — Bộ công cụ đo và HAR an toàn

**Files:** Create `scripts/book-performance/{evidence.py,test_evidence.py,README.md}`.
**Interfaces:** `sanitize_har(data: dict) -> dict`; `summarize(records: list[dict]) -> dict`.
CLI `python3 scripts/book-performance/evidence.py sanitize INPUT OUTPUT` và
`... summarize INPUT OUTPUT`; đầu ra chỉmetadata allowlist, median/min/max/count.

- [ ] Viết `test_sanitize_strips_secrets`: fixture có Cookie/Set-Cookie/CSRF,
  Authorization, multipart, responsebody, signedURL/query/sourceRef; serialized
  output không chứa secret giả, headers/body/query; giữ method/status/timings/bytes.
- [ ] Viết `test_summary_preserves_workloads_and_cold`: durations[1,2,3,4,100]
  warm2ảnh→median3/min1/max100/count5, không p95; cold1000/workload6 không trộn vào.
  Thiếu timing giữunknown/-1 đúng HAR, không đổi thành0; URL chỉgiữroute allowlist.
- [ ] Chạy `python3 -m unittest discover -s scripts/book-performance -p 'test_*.py'`
  trước implementation→FAIL missinginterface; viết parserstdlib, chạy lại→PASS.
- [ ] README ghi manifest ảnh/hash/bytes, revision/runtime, lịch rate-limit,
  cách capture bằng PlaywrightCLI/DevTools và phép đo browser+backend; không tự
  mở network endpoint từ URL trong HAR. Output mặc định `.local/book-performance/`.
- [ ] Kiểm raw/secrets không tracked, cập nhật DEV_LOG/PROGRESS; commit `test(perf): add safe benchmark evidence tools`.

### Task2 — Timings backend và frontend opt-in

**Files:** Create `code/backend/src/main/java/vn/memay/common/PerformanceTimings.java`,
`PerformanceTimingFilter.java`, `PerformanceDataSourceConfiguration.java`;
tests cùng tên trong `src/test/java/vn/memay/common/`.
Modify `application.yml`, `catalogue/{AdminBookController,BookCommandService,BookMapper}.java`,
`media/{UploadSessionService,MediaService,AdminMediaController,UploadSessionController,CloudinaryMediaGateway}.java`.
Create `code/frontend/src/app/features/admin/books/book-performance.ts` và `.spec.ts`;
modify `book-upload-queue.ts` tại chọn/preparing/JPEG/upload/READY.

**Interfaces:** Backend `PerformanceTimings.measure(String phase, Supplier<T> action): T`,
`capture(): Trace` và `Trace.measureIo(String phase, IoAction action): void throws IOException`
cho streamthread; `IoAction.run(): void throws IOException` là functional interface.
Allowlist phase; flag `memay.performance.enabled` defaultfalse, env `MEMAY_PERFORMANCE_ENABLED`.
Trace serverUUID/request; nested phase elapsed không cộng thành total.
Frontend `BookPerformance.record(event: {phase: string; item: string; durationMs: number;
sourceBytes?: number; outputBytes?: number}): void`; memorybuffer bounded1000,
opt-in qua InjectionToken `BOOK_PERFORMANCE_ENABLED` defaultfalse, không export tênfile/blob/PII.

- [ ] RED tests `disabledDoesNotRecord`, `recordsFailureAndClearsThreadContext`,
  `streamUsesCapturedTraceWithoutLeakingNextRequest`, `neverLogsSqlOrCredentials`.
  Test JDBC fake delegate: getConnection/execute success/failure/batch/count,
  unwrap/isWrapperFor/close delegate đúng; countexecution, không logstatement text.
- [ ] Run `bash run-local.sh -B -ntp -Dtest=PerformanceTimingsTest,PerformanceTimingFilterTest,PerformanceDataSourceConfigurationTest test`
  tại backend→FAIL missingclasses; implement stdlib/Spring có sẵn, rerun→PASS.
  DataSource opt-in wrapper đo acquisition/execute metadata-only, không đổi pool/lifecycle.
- [ ] Đặt measure quanh proxied createPublished/begin/ready để tính commit;
  phase validation/fingerprint/mapping/provider; đo content authorization,
  provideropen và transferTo riêng. Async filter cleanup đúng completion/error;
  không hứa precise lockwait, không log exceptionmessage chứaproviderURL.
- [ ] Frontend RED test metrics không chứafile name, disabled/buffer bound,
  táchqueuetime/preptime với performance.now và source/outputbytes; implement,
  `npm test -- --include=src/app/features/admin/books/book-performance.spec.ts`→PASS.
  Nếu AngularCLI không nhận include dùng `npm test` thay, ghi lệnh thực tế.
- [ ] Integration smoke xác nhận logphase và disabled không thêm output;
  cập nhật logs; commit `feat(perf): measure book upload and publish phases`.

### Task3 — Baseline trước tối ưu

**Files:** Create `docs/BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md`;
create `scripts/book-performance/CloudinaryEagerProbe.java` dùng SDK đã có,
env QA và UUID ledger cụ thể cho upload-only/explicit đối chứng;
Task1 README ghi quy trình; rawtiming/HAR/manifests/ledger đểignored.
**Interfaces:** Record nhómrequest + run/workload/environment/revision/warmstate;
summary Task1 nhận các trường đó. Baseline sản phẩm là commitTask2.

- [ ] Khởi động QA DB/media/tài khoản riêng bằng cấu hìnhlocal ignored; xác minh
  namespace và DB trước ghi. Dùng bộảnhQA cốđịnh gồm ngang/dọc; ghiSHA256/bytes.
- [ ] Capture local warm5vòng2ảnh và5vòng6ảnh cùng thao tác chọn→đăng→editor
  dùng được/firstimage. Theo dõi limiter, chia đợt và tổngattempt, không nới limit.
  Capture editupload/preview/taxonomy/collections/audit/CSRF, concurrency và status.
- [ ] Đọc timings và querycounts, ghi expectedbottleneck theo bằngchứng.
  Đo Cloudinarycombined; đốichứng upload-only→explicit eager chỉassetQA nếu quota
  đủ, kiểm5derived vàledger, không coi chênh lệch là exact decomposition.
- [ ] RenderQA: chỉ đo khi user deploy đúngrevision/cấu hìnhcáchly; warm5vòng
  vàcold cóloglifecycle riêng, không restartprod. Thiếu môi trường ghi NOT RUN,
  tiếp tục local có nhãn rõ, giữ baseline online user như reference chưa controlled.
- [ ] SanitizeHAR/test fixturePASS, đọc lại output khôngsecret; logevidence paths,
  health/quotas available hoặc unknown; commit `docs(perf): record controlled entry baseline`.

### Task4 — Thumbnail quản trị và viewer1280

**Files:** Modify `media/{MediaGateway,CloudinaryMediaGateway,MediaService,UploadSessionService,AdminMediaController,UploadSessionController}.java`;
tests `CloudinaryMediaGatewayTest.java`, new `AdminThumbnailIntegrationTest.java`.
Modify frontend `book-media-panel.{ts,html,scss}`, `book-upload-queue.ts`;
create `book-media-panel.spec.ts`; check `book-preview.html` consumers.
**Interfaces:** `MediaGateway.openAdminPreview(String publicId, int width): InputStream`;
`content(..., int width)` overloads services. `?size=320|1280`, absent→1280;
invalid→400, jpgonly. Queue keeps largepreviewpath, grid appends size320 safely.

- [ ] RED gateway tests 320usesexistingtransform/default1280, missing320→1280;
  401/403/timeout/5xx khôngfallback; invalidsize khôngprovidercall.
  Integration persisted/temporary OWNER/STAFF/foreignsession/anonymous/hiddenpublic,
  image/jpeg/no-store/nosniff vàkhôngsignedURL. Run backend focused→RED.
- [ ] Implement gateway overload vàcontrollerallowlist, giữ URL/default cũ,
  không đổi eager list; focusedtests→PASS.
- [ ] RED UItest grid URL320 vàlazy/async/contain/stableframe; blob khôngfetchserver.
  Button mởviewer dùng1280 theo thao tác, dialogEscape/close/focustrap/restorefocus,
  errorretry độc lập upload. Implement native `<dialog>` khôngdependency;
  `npm test`→PASS; browser kiểmngang/dọc/chữnhỏ/ảnhcũ/keyboard.
- [ ] Đo bytes/GETcontent5lượt so baselineTask3, phân biệt providerCDN hitstate;
  cập nhậtlogs; commit `perf(admin): load protected thumbnails in photo grid`.

### Task5 — Publish handoff, metadata cache và audit theo nhu cầu

**Files:** Modify frontend `core/auth/{auth.service,admin-http}.ts` vàtests;
create `core/auth/admin-session-cache.ts` và`.spec.ts`;
modify `admin/collections/collection-api.ts`, `admin/books/{book-api,book-editor,book-audit-panel}.ts`,
`book-editor.html`; create `admin/books/book-detail-handoff.ts` và`.spec.ts`;
extend `book-editor.spec.ts`/`book-audit-panel.spec.ts`.
**Interfaces:** `AuthService.epoch: Signal<number>` tăng mỗi login/logout/401 transition;
`invalidateSession(): void` clearuser/bump epoch. `AdminSessionCache.get<T>(key,load,ttlMs): Observable<T>`,
`invalidate(key): void`, `clear(): void`; TTL taxonomy/collections60000ms, errors notcached.
`BookDetailHandoff.put(book: BookDetail): void`, `take(id: string): BookDetail|null`,
`clear(): void`; TTL10000ms, epochmatch, singleuse; khôngrouterstate/localStorage.

- [ ] RED cache tests dedupe concurrent/subsequent, TTL, errorretry, invalidate
  aftercollectionwrite, 401/logout/identitychange, staleinflight cannotrepopulate.
  REDhandoff tests sameID/epoch/singleuse/expiry/wrongID, logoutwhilePOSTresponse
  arriving cannotseed; refresh/deeplink vẫnGET. `npm test`→RED.
- [ ] Implement sharedmemorycache, wrap AdminHttp GET/mutate/upload401 invalidation;
  khôngcacheauth/media. Collectionwrite success invalidate trước subscriber;
  editor có nút refreshmetadata, giữ inactivecollection đang thuộc sách.
- [ ] POSTsuccess put seed rồinavigate; editor take seed trướcGET. Response chỉ
  dùng trong auth epoch khởiđầu; seed consumed/cleared đúng. Giữserver version,
  current form không bị response từ requestcũ đè. Run tests→PASS.
- [ ] REDaudit tests closed→zeroGET, open→oneGET, versionchangeclosed→staleonly,
  openstale→freshpage0, rapidbookchange/destroy khôngapplyresponsecũ. Implement
  detailstoggle + cancel subscription, không dùng ngOnChanges fetch vôđiềukiện.
- [ ] UI phân biệt đangđăng/đãđăng vàảnh/auditloaderror. Lostresponse giữpayload
  vàsession retry; browserPOST201→edit khôngGETbooktrùng/taxonomycollections
  chỉreusekhihợp lệ/auditclosed zero. FullfrontendPASS; commit `perf(admin): reuse publish response and defer reference reads`.

### Task6 — Chuẩn hóa ảnh kế tiếp khi upload đang chạy

**Files:** Modify `admin/books/{book-upload-queue,image-upload}.ts` vàtests.
**Interfaces:** Giữ `prepareImage(file: File): Promise<Blob>` validatesstandalone;
export `SourceImageInfo = {width: number; height: number; large: boolean}`;
internal `prepareValidatedImage(file: File, info: SourceImageInfo): Promise<Blob>`
chỉ dùng sau `sourceImageInfo` cùngFile. Queue mộtdecode, mộtpreparedlookahead;
edit vàtemporary vẫn mộtupload; metricsTask2 dùng cácpha thực tế.

- [ ] REDtests uploadAunresolved thìprepareB completes, khôngprepareC;
  Berror khôngblockA/ảnhkhác, retry khôngnormalize lạiblobđãchuẩnhóa;
  remove/replace/renew/expire/destroy lúcBprepare→khônguploadrowma/mấtảnhcũ.
  Maxdecoded1/preparedlookahead1; finalready vẫnđủảnh/role.
- [ ] Đo sourceImageInfo lặp baseline rồi implement chỉread1lần trongqueue,
  standaloneprepare vẫnrejectempty/invalid/>10MB/>25MP. KhôngđổiEXIF/alpha/quality.
- [ ] `npm test`→PASS; browser2/6ảnh, errorretry/removeprefetch/cancel;
  đo5vòng đốibaseline, báo overlap/thờigian khôngcộngrequest. Commit `perf(admin): prepare next photo during upload`.

### Task7 — Giảm database round trips đã được đo

**Files:** `catalogue/{BookCommandService,BookMapper,BookVariantStore}.java`;
tests `media/BookCreateFinalizationTest.java`, new `catalogue/BookPublishQueryTest.java`.
**Interfaces:** Internal `createAggregate(...): CreatedAggregate` trả BookCopy/Listing
thay vì map detail ngay; record `CreatedAggregate(BookCopy book, Listing listing)`;
chỉđổi nếuTask3 xácnhận mapperdetail dư.
Khôngđổi BookDetail/BookCreate/public DTO hoặccontract validation.

- [ ] Dùng countersTask2 xác địnhquery lặp createAggregate/validatePublished/result,
  collectionvalidationperID vàmapper; ghi count2/6ảnh. Nếu khôngđángkể ghi
  khôngsửa cùngbằngchứng, khôngthêmSQL/indexđể tick ô.
- [ ] Nếu mapperdư: RED `publishMapsOnlyRequiredSnapshots` asserts one mapper
  detail sau mediaattached, dùng snapshot validation trước publication và final
  immutable copy với publishedAt/status đúng; auditCREATE/PUBLISHED vẫnđủ.
  Nếu collectionN+1: REDquerycount khôngtăngtheosốcollection; batchreadvalidate
  active/previousinactive/unknownIDs, không nhânhàngmedia×variants.
- [ ] Run focused tests→RED; minimalfix theo query đãđo; rerun→PASS.
  Finalizationretry/changedpayload409/parallelfinal/rollback/stableIDs/audit/
  hidden/SOLD/FlashSale vàupdateversion regressionpass. Đoquerycounts/elapsed5vòng;
  commit `perf(catalogue): reduce measured publish round trips` nếu cócodechange.

### Task8 — Đánh giá tối đa2temporary upload có điều kiện

**Files:** Nếugateđạt modify `book-upload-queue.ts` vàtest;
extend `media/BookCreateFinalizationTest.java`/uploadsessionintegrationtests.
**Interfaces:** editconcurrency1; temporarymax2 chỉbật sau kiểmcap/sessionrace,
UI role vẫntheohàngđợi, mediaID/requestKeyổnđịnh. Khôngtănglimiter/backendpool.

- [ ] DựaTask3/6 đo upload cònchiếmchính, kiểmmemory/providerquota vàDBlocks.
  Nếu khôngđủlợi/điềukiện, giữ1, ghi lýdo vàTask8 hoànthànhđánhgiá.
- [ ] Nếu thử: RED outofordercompletion giữroles, lostresponse retry cùngkey,
  twoexpire/replace/removecancel/finalduringupload khôngduplicate/overflow6;
  editversionchain luônserial. Implementmax2 bounded; focusedfrontend/backendPASS.
- [ ] A/B5vòngQA cùng2/6ảnh vàmanifest, cùngratebudget; giữthayđổi chỉkhi
  cải thiệnelapsed khôngtănglỗi. KhôngkếtluậnRender nếu chỉchạyLocal.
  Commit result hoặcdecision `perf(admin): bound temporary photo uploads`.

### Task9 — Regression, đối chứng, review và bàn giao

**Files:** Spec/plan/evidence; docs/{README,PROGRESS,DEV_LOG,ARCHITECTURE,DESIGN,DEPLOYMENT}.md;
rootREADME khi đổi env/chạylocal. Khônggộp gateonline chưađạt thànhPASS.

- [ ] Root `bash code/backend/run-local.sh -B -ntp clean verify`→0failure/error,
  liveprovider skip ghi rõ. Frontend `npm test`, `npm run build`,
  `npm run build:workers`, `npm run check:workers:proxy`→PASS.
- [ ] Browser2/3/4/5/6ảnh, ngang/dọc/ảnhcũ, viewerlớn/keyboard,lazy/layout,
  OWNER/STAFF/anonymous/temporaryforeign/HIDDEN/ARCHIVED, metadatarefresh,
  lostpublishresponse/retry/refresh/multitab409/replacedeletecleanup đúngledger.
- [ ] Đo lại5vòng/2và6ảnh trêntừngmôitrườngđãđobaseline, reportquery/bytes/
  requestcount/median/min/max/elapsed/coldriêng. SanitizeHAR, verifysecretfixture;
  Cloudinaryusage/Neonquota/health/logs ghiobservedhoặcNOTRUN.
- [ ] RenderQA cầnuserdeploy theo workflow. Nếu vẫnchậm, VPSQA cósẵn mớiso
  cùngrevision/workload; thiếuhost/permission ghiopen gate, khôngmua/deploytựđộng.
- [ ] Wholebranchfreshreview theo executing-plans; fixfindings córegression,
  rerunaffectedchecks. CleanupchỉassetQAledger/crosscheckDB; dừngprocessQA.
- [ ] Gộpcontract/evidencehiệnhành, link/line≤400/ignore/diffcheckPASS; chỉretire
  spec/plan khi chuyểnđủtiêuchívàgatecònmở. Commit/pushdev, kiểmremote/status;
  báo kếtquả vàgiớihạnonline, khôngclaimMVPchốtxong.

## Self-review

- Spec3→Task1/2/3; spec4→Task4; spec5→Task6/8; spec6→Task5/7;
  spec7/8→Task9 vàbaselineonlinegateTask3. Khôngrequirementbịbỏ.
- NămReviewFocus đãcótests ởTask2/4/5/6/7; interfaces dùng cùngnêutrongtask.
- Query/eager/parallel/VPS làđánhgiácóđiềukiện, khôngbiếnthànhthayđổibắtbuộc.
- Kếhoạchđượcselfreview; chưachecktaskhoànthành hoặcghiPASSchưachạy.
