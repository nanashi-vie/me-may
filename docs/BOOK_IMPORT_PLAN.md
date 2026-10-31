# Book Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import mẫu CSV/XLSX hợp lệ thành nguyên lô sách Ẩn, bổ sung ảnh và publish từng sách.
**Architecture:** Backend parse/normalize/preview có giới hạn; commit bằng transaction và biên nhận fingerprint duy nhất. Dùng chung domain/editor/media/publication hiện có; không job nền hoặc DRAFT.
**Tech Stack:** Angular21, Spring Boot4/Java21/PostgreSQL; Commons CSV1.14.1 và POI OOXML6.0.0 ở backend.
**Spec:** [BOOK_IMPORT_SPEC](BOOK_IMPORT_SPEC.md), user duyệt31/10/2026.
**Execution:** Native/tuần tự theo phương thức đã chọn; dev checkout, không tạo worktree mới. Chờ user review plan trước implementation.

## Global Constraints

- Chỉ OWNER import/publish; STAFF đọc theo quyền cũ. Auth/CSRF/no-store/version/audit giữ nguyên.
- Chỉ tạo ARCHIVED/publishedAt=null/media0; không sửa/gộp sách cũ, không tự publish hoặc fetch ảnh/link.
- Schema20cột và quy tắc bắt buộc/optional ở spec§2 là contract; không tự mặc định ô thiếu.
- Chỉ `.csv` UTF-8 có/không BOM và `.xlsx`; không `.xls`/`.xlsm`, formula/date/error/boolean/macro/external link.
- Tối đa2MiB upload/500dòng/100nhóm/100biến thể mỗi nhóm; cell≤10000ký tự, XML giải nén≤20MiB.
- CSV dấu phẩy/quote kép/multiline; XLSX `Sach`/`HuongDan`. Nhóm phân biệt hoa thường; không dùng ISBN/tên làm khóa.
- Preview không ghi DB; lỗi cả file không nhập dòng nào. Confirm parse lại cùng file/fingerprint; rollback cả lô.
- Cùng nội dung chuẩn hóa/schema version → cùng fingerprint, không phụ thuộc thứ tự dòng/header hoặc CSV/XLSX.
- Mỗi OWNER1request đang chạy/10lần bắt đầu mới mỗi10phút; receipt committed miễn quota tạo mới, không quota ảnh.
- Không log file/ô/token/cookie; không lưu file vào localStorage/history/DB; receipt chứa metadata/linkID thôi.
- Chỉ QA scratch/asset giả có ledger; không dữ liệu bán thật, migrate/deploy online, merge/push main.
- Commit/push dev; docs≤400dòng trừ DEV_LOG, chỉ mục docs/README; giữ spec/plan tới khi chuyển đủ tiêu chí.

## Review Focus

1. File mới được chọn hoặc auth epoch đổi khi response cũ đang về: không preview/commit nhầm file hoặc tài khoản.
2. Commit thành công mất response, hai OWNER cùng fingerprint, rồi collection ngừng dùng/sách đã sửa: cùng receipt, không tạo/ghi đè.
3. XLSX nhỏ nhưng giải nén lớn, sparse rows/shared strings/styles/formula cached value: bị chặn trước nạp vô hạn/evaluate.
4. Sách Ẩn tồn>0 đã có ảnh nhưng chưa publish: public mọi đường vẫn404; chỉ publish đầu đặt publishedAt.
5. Lô100sách/500variants và lỗi ở sách cuối: không phần dữ liệu, audit thiếu hoặc ảnh thật bị cleanup.

## File map và contract liên task

Backend prefix `B=code/backend/src/main/java/vn/memay/catalogue/`;
tests `T=code/backend/src/test/java/vn/memay/catalogue/`;
frontend `F=code/frontend/src/app/features/admin/books/`. Các tên dưới là file thật dưới prefix.

| File | Trách nhiệm |
|---|---|
| B/BookImportDtos.java, BookImportSchema.java | DTO hàng/lỗi/nhóm/preview/receipt và header/schema version/giới hạn |
| B/BookImportParser.java, BookImportXlsxReader.java | CSV/XLSX bounded → hàng có vị trí; không DB hoặc ghi |
| B/BookImportValidator.java, BookImportFingerprint.java | Chuẩn hóa/nhóm/check/import-only rules và digest không phụ thuộc DB |
| B/BookImportStore.java, BookImportTransaction.java | Receipt unique, resolve refs, transaction nguyên lô |
| B/BookImportService.java, BookImportGate.java | Preview/confirm orchestration/quota/concurrency, không transaction lúc parse |
| B/AdminBookImportController.java, BookImportTemplate.java | HTTP và mẫu CSV/XLSX/hướng dẫn động |
| B/BookValidation.java, BookCommandService.java | Chia sẻ validation và tạo sách ẩn có audit, giữ manual publish |
| B/{BookDtos,BookQueryService,AdminBookController}.java | publishedAt summary và query chưa xuất bản |
| F/book-import{.ts,.html,.scss,-api.ts,-models.ts} | Chọn file/preview/lỗi/confirm/receipt, chỉ state của tab |
| F/book-list.*, book.models.ts, book-status-actions.ts | Link/import/filter/nhãn/placeholder, không queue mới |

DTO nested records trong BookImportDtos:
- `CellRow(String sheet,int row,Map<String,String> cells)`; numeric XLSX đã chuyển chuỗi nguyên an toàn.
- `ImportIssue(String sheet,Integer row,String column,String code,String message)`.
- `ImportGroup(String key,BookWrite write,List<String> collectionSlugs,List<Integer> rows)`;
  canonical write chưa chứa collectionIds, chỉ resolve refs sau lookup receipt.
- `ImportDocument(List<ImportGroup> groups,List<ImportIssue> issues,int totalIssues,int rowCount,String fingerprint)`;
  fingerprint=null khi invalid; cap1000 chi tiết, totalIssues không bị cap.
- `ImportReceipt(UUID id,String fingerprint,Instant createdAt,List<ImportedBook> books)`;
  `ImportedBook(String groupKey,String id,String bookCode,String title)` là snapshot biên nhận, không overwrite sách.
- `ImportPreview(ImportDocument document,ImportReceipt receipt)`; receipt!=null là đã nhập, không commit lại.
- `ResolvedImport(List<ImportGroup> groups)` chứa write với collectionIds sau kiểm DB, không dùng cho digest.

HTTP `/api/v1/admin/book-imports`:
- `POST /preview` multipart `file` →200preview (kể cả lỗi ô/cột),413oversize,422file không đọc được.
- `POST /confirm` multipart `file`,`fingerprint` →201receipt mới/200receipt cũ;
  422issues invalid,409fingerprint mismatch,429Retry-After,401/403 như admin.
- `GET /templates?format=csv|xlsx` →attachment/no-store, OWNER, tên cố định;
  header-only data, hướng dẫn có ví dụ; không đưa dòng ví dụ thành dữ liệu nhập.
- `GET /options` →taxonomy mã/nhãn và active collections slug/tên, no-store, OWNER.
Lỗi import422 body `{error:'import_validation_error',issues,totalIssues}` qua exception/handler riêng của importer;
không đổi shape lỗi API hiện hành. Enum/file structure errors không lộ exception/parser/đường dẫn.

## Task 1: Schema, canonical validation và fingerprint

**Files:** B/BookImport{Dtos,Schema,Validator,Fingerprint}.java; B/BookValidation.java;
T/BookImportValidationTest.java; tests BookStatusIntegrationTest/BookVariantIntegrationTest giữ đạt.
**Interfaces:** `BookImportValidator.normalize(List<CellRow>) -> ImportDocument` pure;
`BookImportFingerprint.digest(List<ImportGroup>) -> String`; `BookValidation.writeErrors(BookWrite) -> Map<String,List<String>>`.

- [x] RED tests nhóm không liền dòng/optional trống/ISBN0/100variant/cùng tên khác key;
  nhóm lệch commonfield chỉ rõ các dòng/cột; nhiều mandatory trống trả đủ lỗi.
  Assert stock0 hợp lệ; blank stock/lang/grade, tên trùng trim/case, age trùng,
  giá21.000/âm/phân/exponent/overflow, videoHTTP, binding sai đều lỗi đúng cột.
  `normalizationPreservesLogicalBooksAndReportsAllMissingFields` assert lỗi chứa
  `ngon_ngu`,`ton_kho`; `fingerprintIgnoresRowAndHeaderOrder` assert digest bằng nhau,
  `changedStockChangesFingerprint` assert digest khác.
- [x] Run root `bash code/backend/run-local.sh -B -ntp -Dtest=BookImportValidationTest test`.
  Expected RED thiếu DTO/validator; ghi fail thực tế, không coi compile lỗi fixture là RED nghiệp vụ.
- [x] Implement shared `writeErrors`; `validateWrite` dùng collector và vẫn ném AdminApiException400.
  Tách metadata-required checks khỏi media checks của validatePublished để import dùng chung;
  không làm ngôn ngữ/grade bắt buộc ở editor cũ. Import thêm mandatory/grade mới riêng.
  Normalize lists thành thứ tự chuẩn; canonical groups sort key theo natural String,
  variants sort tên null trước rồi tên exact; giữ Unicode/case của dữ liệu, không làm tròn số.
  Group canonical dùng collectionSlugs, collectionIds rỗng; schemaVersion=1 trong digest.
- [x] Digest test cùng dữ liệu/header/dòng đổi thứ tự bằng nhau; thay key/name/stock/price khác digest;
  khi nhiều lỗi không tạo partial fingerprint;1001issue giữ1000detail/total1001.
- [x] Run targeted plus `-Dtest=BookImportValidationTest,BookStatusIntegrationTest,BookVariantIntegrationTest test`.
  Expected0failure/error; commit `feat(import): define canonical book file validation`.

## Task 2: Parser và template CSV/XLSX an toàn

**Files:** code/backend/pom.xml; B/BookImport{Parser,XlsxReader,Template}.java;
T/BookImportParserTest.java, BookImportTemplateTest.java.
**Interfaces:** `BookImportParser.parse(String filename,byte[] bytes) -> List<CellRow>`;
`BookImportTemplate.render(String format,ImportOptions options) -> byte[]`;
DTO `ImportOptions(Taxonomy taxonomy,List<CollectionOption> collections)` slug/name active.

- [x] RED fixtures CSV BOM/CRLF/quote/comma/multiline/header đổi thứ tự; XLSX Sach/HuongDan,
  text ISBN000123/numeric integer; cùng semanticdocument/digest, mandatory header20cột.
  Header thiếu/trùng/lạ/semicolon, `.xls`/`.xlsm`/ZIP giả/UTF8 lỗi/empty fail rõ.
  `csvAndXlsxProduceSameCanonicalFingerprint` so digest đãnormalize;
  `formulaCachedValuesAreNeverAccepted` assert422issues và không evaluator/networkcall.
- [x] Run `bash code/backend/run-local.sh -B -ntp -Dtest=BookImportParserTest,BookImportTemplateTest test`.
  Expected RED missing parser. Pin org.apache.commons:commons-csv:1.14.1,
  org.apache.poi:poi-ooxml:6.0.0; verify Maven resolves/Java21/dependency tree,
  không tự downgrade nếu unavailable; ghi blocker/ruling theo nguồn official.
- [x] CSV dùng Commons CSV RFC4180 strict, UTF8 decoder REPORT, bỏ BOM đầu,
  validate header trước map; dòng logic kể cả multiline/blank có vị trí rõ.
  XLSX POI OPCPackage/XSSFReader event/SAX hardened, không FormulaEvaluator;
  tách reader riêng, không WorkbookFactory nạp không giới hạn vào RAM.
  Bounded preflight với POI ZipSecureFile:≤100entries, mỗi entry và tổng uncompressed≤20MiB,
  inflate ratio≥0.01; đếm byte thực khi đọc, không chỉ tin ZIP headers.
  Set POI global limits một lần startup, không đổi/restore theo request.
- [x] SAX bounded XML, DTD/external entities off; sharedStrings/styles count≤20000,
  cell events≤20000 toàn workbook;≤2sheet đúng tên, không data ở sheet lạ.
  Từ chối encryption/VBA/OLE/embedded objects/external relationships (kể cả hyperlink),
  formula dù có cachedvalue; data type/date/boolean/error sai báo hàng/cột.
  Numeric dùng raw XML BigDecimal→long exact trong giới hạn safe integer;
  cell numeric vào ISBN/nhom_sach báo nhập text để không đoán số0 đã mất.
  Header cells string; hàng Sach có data tối đa500, nhóm/variant limit ở validator.
- [x] Template header-only, numeric/ISBN/key text; HuongDan chứa schema/version,
  ví dụ nhóm2biến thể/enum/slug, ghi cách paste URL plain text không hyperlink,
  giới hạn, quy tắc CSV dòng logic và không dùng file để cập nhật sách.
  CSV template tải kèm hướng dẫn hiển thị ở UI/options; không dựng fileCSV nhiều sheet.
- [x] Adversarial tests2MiB+1/501rows/101groups/101variants/10001char/21MiBexpanded/
  >100entries/ratio/XXE/sharedstrings hoặc sparse/style bombs/missing references/merged Sach cells;
  test không network/evaluate; run focused0fail rồi commit `feat(import): parse bounded CSV and XLSX templates`.

## Task 3: Biên nhận và commit nguyên lô có retry an toàn

**Files:** code/backend/src/main/resources/db/migration/V11__book_import_receipts.sql;
B/BookImport{Store,Transaction}.java; B/BookCommandService.java;
T/BookImportMigrationTest.java, BookImportTransactionTest.java;
code/backend/src/test/java/vn/memay/support/CatalogueTestSupport.java.
**Interfaces:** `BookImportStore.find(String fingerprint) -> Optional<ImportReceipt>`;
`BookImportTransaction.commit(AdminUser actor,ImportDocument document) -> CommitResult(receipt,created)`;
`BookCommandService.createImported(AdminUser actor,BookWrite write,UUID batchId) -> BookDetail` (package-private).

- [x] RED migration on disposable PostgreSQL V10→V11: existingdata/counts/IDs untouched;
  unique fingerprint64hex; receiptitem groupkey/bookID unique perbatch/FK valid.
  Tables `book_import_batch(id UUID,fingerprint CHAR(64) UNIQUE,schema_version INT,
  owner_id BIGINT FK,created_at TIMESTAMPTZ,state CHECK='COMMITTED')` and
  `book_import_item(batch_id UUID FK,group_key VARCHAR(50),book_id BIGINT FK,
  book_code VARCHAR(30),title VARCHAR(300),PRIMARY KEY(batch_id,group_key),UNIQUE(batch_id,book_id))`.
  Add exact newtables cleanup before book_copy in test fixture, never disable foreign keys.
- [x] RED commit2groups/3variants→2ARCHIVED/media0/session0/publishedAtnull/stock đúng,
  CREATE audit nguồnimport/batchID, không PUBLISHED audit. Mid-batch invalid nhóm cuối
  rollback book/listing/variant/audit/receipt; không cần sequence không bỏ số.
- [x] Run `bash code/backend/run-local.sh -B -ntp -Dtest=BookImportMigrationTest,BookImportTransactionTest test`;
  Expected RED missing tables/service. Implement receipt-first conflict arbitration
  `INSERT ... ON CONFLICT(fingerprint) DO NOTHING RETURNING id` trong transaction;
  conflict chờ commit rồi read receipt; rollback contender không để record rỗng đã commit.
  RequireOwner trước mọi lookup, receipt cũ trả ngay trước resolve DB references.
- [x] Resolve category/collection slug once mỗi batch, không lookup từng biến thể;
  lock collection rows `FOR SHARE` khi validate/commit để active không đổi giữa kiểm và ghi.
  Validate import document đầy đủ, createImported reuse createAggregate/mapper/audit,
  không gọi createPublished hoặc Cloudinary. Không để domain write method cho endpoint khác bỏ qua OWNER.
  Receipt stateCOMMITTED chỉ tồn tại cùng đủ items; đọc bên ngoài transaction không thấy partial.
- [x] Races2owner/cùngfingerprint đúng1batch/IDs; firsttransactionrollback cho contenderretry;
  postcommitresponse mất→retry; sau sửa/publish sách/deactivatecollection vẫn trả receipt cũ,
  không touchversion/audit/stock. Người sửa file/key tạo digest khác, không tự gộp theoISBN.
  `concurrentSameFileReturnsOneReceipt` assert1batch/2book/3variant, receipts IDs bằng nhau;
  `retryAfterCollectionDeactivationDoesNotOverwriteEditedBook` assert version/stock không đổi.
- [x] Run focused và cleanverify backend0failure/error (liveprovider skips ghi rõ);
  commit `feat(import): create hidden book batches atomically`.

## Task 4: API preview/confirm, quota và tải mẫu

**Files:** B/AdminBookImportController.java, BookImport{Service,Gate,ExceptionHandler}.java;
T/BookImportApiTest.java, BookImportGateTest.java.
**Interfaces:** service `preview(AdminUser,String,byte[]) -> ImportPreview`,
`confirm(AdminUser,String,byte[],String expected) -> CommitResult`;
gate `acquire(long ownerId) -> AutoCloseable`, `charge(long ownerId) -> void` dùng Clock.

- [x] RED realHTTP OWNER/multipart/CSRF/no-store; STAFF403/anonymous401;
  previewinvalid200issues/DBnochange, malformed422/413; fingerprintmismatch409/DBnochange;
  validconfirm201/existing200. OPTIONS/template nhận active slug/enum; filenames cố định,
  không echo unsafe path; lỗi không leak parser/internal data.
- [x] Run `bash code/backend/run-local.sh -B -ntp -Dtest=BookImportApiTest,BookImportGateTest test` Expected RED.
  Implement routes ở contract; accept bytes bounded2MiB trước parse; collect all row issues;
  parse ngoài transaction, lookup receipt trước DBvalidation, revalidate refs khi confirm.
  No-store cả downloads/errors; template MIME và Content-Disposition đúng format.
- [x] Gate acquire trước parse, release finally kể cả mọi exception; per-owner counters10/600s,
  receipt retry miễn charge. Parse thất bại/newpreview/newconfirm đều charge một lần;
  gate state prune hết cửa sổ để không tăng theo account vô hạn, không bypass auth.
  Clock deterministic test simultaneous429/Retry-After, boundary600s, failedparse stillcount,
  receiptlookup sau10attempts vẫn200, không sửa image limiter.
- [x] Tests collectioninactive giữapreview/confirm→422issues/no write, collection concurrentchange
  không commit dữ liệu trái validation; response gồm cap1000/total đúng; unknown format400.
  `previewDoesNotAllocateBooksOrCodes` kiểm count/sequence trước-sau;
  `confirmRejectsChangedFingerprint` assert409 và counts không đổi.
- [x] Run focused + backendcleanverify0fail; commit `feat(import): expose preview and confirm APIs`.

## Task 5: Trang import và state của file/auth

**Files:** F/book-import{.ts,.html,.scss,-api.ts,-models.ts,.spec.ts};
code/frontend/src/app/app.routes.ts; F/book-list.html;
code/frontend/src/app/core/auth/admin-http.ts (chỉ nếu cần overload typed download).
**Interfaces:** `BookImportApi.preview(file:File):Observable<ImportPreview>`;
`confirm(file:File,fingerprint:string):Observable<ImportReceipt>`; options/template như contract.
`AdminHttp.mutate` sẵn nhận FormData choPOST; download Blob giữ guarded auth/no transfercache.

- [x] RED unit real component: selectfile→clearpreview, check→issues table/cap/instructions;
  validpreview→confirmation checkbox/nút Import N sách ẩn, duplicate receipt→links/no confirm.
  Stale response fileA khi chọnB và oldepoch sau logout/login không áp; doubleclick chỉ1request.
- [x] Run `npm --prefix code/frontend test` Expected RED missing component/API.
  Add OWNER route `/admin/sach/import` trước `sach/:id`, noindex/no-store admin contract;
  link Import sách chỉOWNER. Dùng table/labels hiện có, desktop-first, mobile không tràn trang.
  Không framework spreadsheet hoặc parser frontend; show full preview tất cả nhóm/variants,
  issue plain interpolation, row/column headers, summary/instructions CSV vsExcel.
- [x] Keep selectedFile+previewFingerprint trong memory, immutable captured request pair;
  selection hoặc auth epoch đổi →clearresult/confirmed, cancel/ignoreinflight;
  backend401 giữFile nhưng xóa validity, reauth cùngOWNER rồi kiểm lại; logout không giữ receipt
  của tài khoản cũ. SSR không đụng File/window/localStorage trong initialization.
- [x] 422showissues/disablecommit;409clearvalidity/recheck;429giữfile/Retry-After/manualretry;
  commitnetwork/5xx giữ samefile/fingerprint và hiện “Thử lại lần import này”, không tạo file/key mới.
  Refresh mất memory →chọn lại cùngfile nhận receipt; canDeactivate/beforeunload cảnh báo khi pending,
  không dùng clientrequestcancel làm bằng chứng serverrollback.
- [x] Unit assertions401/403/409/422/429/timeout/latedestroy/HTMLtext/downloadBlob và route precedence;
  `latePreviewCannotEnableAnotherFile` assert nútconfirm disabled/fileB vẫnselected;
  `lostCommitResponseRetriesExactFileAndFingerprint` assert hai request cùng capturedpair;
  fullfrontendPASS rồi `npm run build:workers` ở code/frontend PASS;
  commit `feat(admin): add validated book import workflow`.

## Task 6: Danh sách chưa xuất bản và hoàn thiện ảnh

**Files:** B/{BookDtos,BookQueryService,AdminBookController}.java;
F/{book.models.ts,book-list.ts,book-list.html,book-status-actions.ts};
T/BookImportVisibilityTest.java; F/book-import-visibility.spec.ts.
**Interfaces:** BookSummary thêm `publishedAt:Instant|null`/TSstring|null;
BookFilter thêm `Boolean unpublishedOnly`/TSboolean?; queryparam `unpublishedOnly=true`.
Giữ constructoroverload BookFilter5args cho callsites cũ nếu cần; null/false không thêmpredicate.

- [x] RED imported/hiddenpreviouslypublished/published/stock0/stock3 listing assertions;
  unpublishedOnly thêm `l.publication_status='ARCHIVED' and l.published_at is null`
  cùng search/publication/availability/page; không thêm mediaquery từng dòng.
- [x] Run focused `BookImportVisibilityTest` + fullfrontend Expected RED thiếufield/filter/label.
  Implement query/mapping once; list label “Chưa xuất bản” khiARCHIVED+null, “Ẩn” khiđãpublish,
  placeholderkhi frontContentPathnull. Filtercheckbox “Chưa xuất bản” vẫn cùng URL query/state.
  Statusaction ARCHIVED+null→“Xuất bản”; ARCHIVED+nonnull→“Hiện sách”.
- [x] Imported editor tải metadata đủ, pendingảnh/lưu/publish giữ existing flows;
  fakeprovider integration add FRONT/BACK→publish/firsttimestamp rồiẩn/hiện timestampkhôngđổi;
  thiếuBACK/dirty/409/STAFF403 không publish, không sinh sách/sessionfinal mới.
  Publiclist/detail/lookup/SSRseed/media persisted/ID archived phảiẩn kể cảstock>0 vàđãcóảnh.
  `importedHiddenMediaStaysPrivateUntilFirstPublication` assert public404 trước/200 sau,
  publishedAt lầnđầu!=null và restore không đổi timestamp.
- [x] Fullfrontend và backendcleanverifyPASS; commit `feat(admin): finish imported books before publishing`.

## Task 7: QA, giới hạn workload, review và bàn giao

**Files:** docs/{README,DATA,DESIGN,ARCHITECTURE,DEPLOYMENT,PROGRESS,DEV_LOG}.md;
docs/BOOK_IMPORT_VERIFICATION.md và rootREADME; workspace ignored BOOK_IMPORT_PLAN.

- [ ] Root `bash code/backend/run-local.sh -B -ntp clean verify`→0failure/error, live skips rõ;
  frontend `npm test`, `npm run build`, `npm run build:workers`, `npm run check:workers:proxy`→PASS.
- [ ] Scratch `me_may_import_qa`, API8088/SSR4009 (verifyfree trướcstart), fakeOWNER/STAFF,
  CSV/XLSX synthetic khôngcustomer; browsercheck/missingfield/reupload/preview/confirm/receipt,
  timeoutabort finalresponse/retry/refresh/auth/file-switch vàSTAFF403.
- [ ] Import100sách/500variants nguyên lô; đo elapsed/API/backend timings/querycount và heap/coldriêng,
  audit/receipt counts, rollback lỗi ở itemcuối; noCloudinarycalls. Không tự nâng limits nếu chậm.
  Nếu scratchkhôngchứngminh runtimeRender/Neon, giữ gate online rõ trong DEPLOYMENT, khôngclaimonlinePASS.
- [ ] Browser chọn sáchimport→thêm2ảnhQA→save/publish, archive/unarchive/stock0/variants/role/viewportviewer;
  publichidden404/media404 trướcpublish, SSRchecker4009 vàWorkersproxy đúng HTTP/MIME/private/no-store.
  Manualcreate2/6ảnh/retryfinal unchanged; không giả địnhunit là browserproof.
- [ ] Wholebranch fresh-context review theo executing-plans; mộtfixpass Critical/Important RED→GREEN+
  affectedsuite, Minorledger. Cleanup chỉassetQAexactIDs, sáchscratchẩn, dừngprocess/browser;
  giữevidenceignored, khôngdrop/sửaDBbánthật hoặcworkspaceplan khác.
- [ ] Gộp approvedcontract vàđịnhdạng ởDATA, UXởDESIGN, API/schema/retryởARCHITECTURE,
  V11/rollback trướcghiởDEPLOYMENT, verificationởfilechủđề/soleindex;
  spec/planretirechỉkhi chuyểnđủquyếtđịnh/tiêuchí/gate. Link/line/diff/ignorePASS;
  commit/pushdev/remoteverify, khôngmerge/deploymain hoặcclaimMVPdone.

## Tự rà soát và nguồn parser

- Spec§1–2→Task1/2; §3→Task4/5; §4→Task3/4; §5→Task6; §6→Task2/4/7; §7→tests1–7.
- Năm Review Focus có regression sở hữu ởTask5/3/2/6/7; DTO/method names xuyên task khớp.
- POI6.0.0/Java17+ và CSV1.14.1 theo [POI release](https://poi.apache.org/download.cgi),
  [CSV release](https://commons.apache.org/proper/commons-csv/download_csv.cgi);
  bounded event reader theo [POI XSSF/SAX](https://poi.apache.org/components/spreadsheet/how-to.html),
  [ZipSecureFile](https://poi.apache.org/apidocs/dev/org/apache/poi/openxml4j/util/ZipSecureFile.html).
- Mọi ô task còn mở; thiết kế/nguồn đọc không là bằng chứng parser/dependency hoặc app đã chạy.
