# Import V2 Implementation Plan

> For agentic workers: use superpowers:executing-plans, Native/tuần tự như đã chốt.

**Goal:** Nhận workbook16cột/nhãn dễ đọc của chủ, mặc định tiếng Anh/tồn1;
giữ fileV1 và biên nhận cũ, một dòngV2 tạo một sáchẨn.
**Architecture:** Nhận diện schema từ header; CSV/XLSX dùng chung canonical header.
V2 ánh xạ nhãn/defaults rồi dùng validator/domain hiện có. FingerprintV1 giữ byte
serialization/version cũ; V2 canonicalize một multiset sách, không bỏ dòng trùng.
ImportV2 không migrationDB/dependency/provider mới; user bổ sung2category cầnV12. Frontend hướng dẫn16field và preview
theo dòng; flowcheck/confirm/retry/editor/publish giữ nguyên.
**Tech Stack:** Angular, SpringJDBC, CommonsCSV, POI event/SAX hiện có.
**Spec:** [BOOK_IMPORT — V2 đã chốt](BOOK_IMPORT.md#format-v2--chốt0111-chờ-triển-khai).
User01/11 đã yêu cầu bắt đầu triển khai, không mở lại approval format/phương thức.

## Global Constraints

-16cột gồm aliasheader `kieu_bia (nếu là picture book)`; canonical kieu_bia.
- Mỗi dòngV2 một sáchARCHIVED, language="Tiếng Anh", variantname=null/stock=1.
- V2 tốiđa100dòng sách/2MiB; V1 giữ500rows/100groups/100variants. XML20MiB,
  10000chars/cell, formula/macro/external/date/unknownheader vẫn bị chặn.
- V2 nhận code hoặc nhãn dropdown sau trim/casefold, không fuzzyguess;
  tuổi nhiều giá trị ngăn`;`, collections giữ slugactive. Seven required metadata
  và Picturebookbinding giữ đúng contract. API vẫnOWNER/CSRF/no-store.
- Giữ receipt/digestV1, fileV1 retry không ghi đè; V2 hash schema2, gồm multiplicity,
  không gồm vị trí dòng/header/filetype. Không rewrite bảngreceipt hoặc migrateDB.
- Không đổi ảnh/publish/authcache/uploadconcurrency, không thêm nút tải mẫu.
- Steeringuser: thêm Tập đọc (READING_PRACTICE/tap-doc) và Nấu ăn - thủ công - activity book
  (COOKING_CRAFT_ACTIVITY/nau-an-thu-cong-activity-book), append sort6/7 quaV12;
  không sửa checksumseedV3, không tự migrateonline.
- Workbookuser read-only; fixture chỉ copy header/dropdowns không chứa dữ liệu bán.
- Code/tài liệu trêndev hiện có theo preference trước; không tạo worktree mới,
  khôngmerge/deploymain. Test trên DBtest cóguard; khôngtạo scratchDB/providerasset.

## Review Focus

1. V1 serialization/order giữ nguyên → golden hash và replay receipt sau đổi sách.
2. V2 hai dòng giống nhau không gộp, reorder/code-label parity → multiset tests.
3. Sparse XLSX/ô ngoài16cột/duplicatealias/unknownheader → bounded reader rejects.
4. Reference validation422 không làm mất schema2 → APIpreview/reference tests.
5. V2 UI không hiển thị khóa nhóm/fieldbỏ nhưng preview thấy defaults → DOMtest.

## Task 1: Backend nhận16cột và giữ biên nhậnV1

**Files:** `code/backend/src/main/java/vn/memay/catalogue/BookImport{Schema,Dtos,
Parser,XlsxReader,Validator,Fingerprint,Service,Transaction,Template}.java`;
test `.../src/test/java/vn/memay/catalogue/BookImportV2Test.java`,
`BookImportV2IntegrationTest.java`, existing TemplateTest;
fixture `.../src/test/resources/fixtures/book-import-v2.xlsx`.
**Interfaces:** CellRow/ImportDocument thêm `int schemaVersion` với constructorV1
giữ callers cũ; canonicalHeaders(List<String>)→List<String>, version(headers)→int;
digest(groups,int) với digest(groups) giữV1; DB schema_version lấy từ document.
NormalizeV2 tạo từng group qua validation hiện có, sort semantic content rồi cấp
keyR001..R100 ổn định; duplicates vẫn thành nhóm riêng, rows dùng số dòng thật.

- [ ] RED unit: filleduserworkbook16headers/dropdowns→defaults, alias/case/code/
  age/readinglabel; CSV/XLSX/headerorder/roworder fingerprint bằng nhau;
  duperows có2groups/hash khác1row; invalidlabels/required/optional/binding,
 100/101rows, duplicatealias, extra/nonemptycell ngoàiheader và formulas.
  GoldenV1 hash từ fixture cũ, unchangedV1 validation và groupkeys.
- [ ] Run root `bash code/backend/run-local.sh -B -ntp -Dtest=BookImportV2Test clean test`
  Expected RED do header20-only. Implement minimal schema/parser/normalize/hash.
- [ ] RED integration qua service/controller: confirmV2 schema_version2, duplicate
  rows→2hiddenbooks/stock1/media0/audit/receipt; retry reordered/codefile cùngID,
  referenceerrorpreview giữ schema2; V1 receipt giữ version1/hash; STAFF403.
  Run focused test Expected RED trước đổi service/transaction versionpropagation.
- [ ] TemplateAPI xuấtV2/16headers, guide defaults/nhãn; giữ UI khôngdownloadbutton.
  Update template contract assertion, giữ legacy workbook/parser casesV1.
- [ ] Full root `bash code/backend/run-local.sh -B -ntp clean verify` Expected PASS,
  liveproviderskip rõ. Commit `feat(import): support sixteen-column owner format`.

## Task 2: UI hướng dẫn và previewV2

**Files:** `code/frontend/src/app/features/admin/books/book-import{.html,-models.ts,
.spec.ts}` và book-import.ts nếu cần nhãn/rowformat.
**Interfaces:** ImportDocument.schemaVersion?:number để fixtures/V1caller cũ vẫn
đọc; schema2 preview gắn số dòng, V1 giữgroupkey. Request file/fingerprint unchanged.

- [ ] RED DOMtest guide chỉ16headers, không nhom_sach/ngon_ngu/bien_the/ton_kho;
  defaultTiếngAnh/tồn1, humanlabels, optionalfields và tênalias đọc được.
  V2preview hiện dòng/thông tin/defaultvariantstock1; V1receipt/group còn đọc.
- [ ] `npm --prefix code/frontend test` Expected RED guide20field; sửa template
  ngắn gọn, show labelcode như hiện có ở dropdownlist thu gọn; không thay transport.
- [ ] Full frontend test và buildWorkers Expected PASS. Commit
  `feat(admin): explain simplified book import format`.

## Task 3: Hai thể loại chung — user bổ sung trong lúc triển khai

**Files:** migrationV12__add_book_categories.sql; BookImportSchema.java;
frontend book.models.ts/catalogue-state.ts; tests CategoryExpansionTest.java,
BookImportV2Test.java/catalogue-state.spec.ts.
**Interfaces:** taxonomy hiện có đọc database nhận thêm READING_PRACTICE và
COOKING_CRAFT_ACTIVITY; không thêm endpoint/entity hoặc đổi category sách cũ.

- [ ] RED API/DB: taxonomy public/admin có2nhãn/mã, manualsave/publicfilter hoạt động,
  import16cột nhận cảlabel/code; migrationV11→12 giữ6categorycũ và existingbooks.
  Frontend readFilters giữ2categorymới qua URL, vẫn bỏbinding khi khôngPicturebook.
- [ ] Implement V12insert2category sort6/7, importaliases/CATEGORIES và TSunion/
  catalogueallowlist. Không cài dependency hoặc sửaV3.
- [ ] Backendcleanverify + fullfrontend + Workersbuild Expected PASS; sourcechange
  mới cho phép rerun suites. Commit feat(catalogue): add requested book categories.

## Task 4: Regression, một review và bàn giao

**Files:** docs hiện hành DATA/BOOK_IMPORT/VERIFICATION chủ đề/PROGRESS/DEV_LOG/
README soleindex; owned ignored workspace BOOK_IMPORT_V2_PLAN.

- [ ] Đọc kết quả backend/frontend đầy đủ, NodeSSR/Workersbuild, Workersproxy.
  Không lặp fullsuite nếu không có sourcechange; kiểm static docs/link/anchors.
- [ ] Browser UI với mocked APIs/fixtureV2 hoặc QA local cách ly nếu cần; đồng
  thời integration thậtDB kiểm import→edit thêmvariants→publish bằng fakeprovider,
  public404trước/200sau, không dùng ảnhCloudinary hoặc tạo DB mới chỉ để QA.
- [ ] Fresh wholebranch review theo executing-plans; mộtfixpass nếu Important,
  RED→GREEN/affectedchecks; ledger rulings/minors, không rereview.
- [ ] Gộp V2 thành contract đangchạy, chuyển V1 thành phầncompatibility chính xác;
  hướng dẫn/currentlimits/measurementgate phân biệtV1V2. Giữ gate online cũ.
  Retire plan này sau chuyển đủ/verify; save safeledger ignored rồi xóa ownworkspace.
- [ ] Commit/pushdev, remote0/0/treeclean, userworkbook checksumkhôngđổi;
  khôngdeploy/migrate/providerasset/scratchDB. Báo kếtquả/giới hạn thực tế.

## Self-review

Spec defaults/16headers/aliases→Task1/2; labels/limits/security→Task1;
rowmultiplicity/receipt/V1→Task1; UI→Task2; editor/publish/review/docs→Task4.
Năm ReviewFocus có testcase tại task tương ứng. Không đổi field/domain ngoàiimport.
