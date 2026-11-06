# Đơn giản hóa nhập sách — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (khuyến nghị cho plan này) hoặc superpowers:subagent-driven-development để
> triển khai từng task. Dùng checkbox theo dõi; đọc cả spec trước khi làm.

**Goal:** Nhập giá/kg, tồn gộp, ghi chú riêng optional và cảnh báo tên trùng,
không làm mất dữ liệu cũ hoặc lộ ghi chú cho khách.

**Architecture:** DTO quản trị mới chuyển sang aggregate hiện có; vẫn lưu tồn
trong book_variant và ghi chú trong condition_note. Backend kiểm dữ liệu cuối,
frontend tính giá có thể sửa; public không nhận thông tin riêng.

**Tech Stack:** Angular21 Reactive Forms/RxJS, Java21/Spring Boot, PostgreSQL/
Flyway, repositories JPA đang có và JdbcTemplate; không đổi stack/thêm dependency.

**Spec:** [BOOK_ENTRY_SIMPLIFICATION_DESIGN](BOOK_ENTRY_SIMPLIFICATION_DESIGN.md),
user duyệt06/11/2026. Đã triển khai và kiểm local; chờ review cuối. Base khảo sát: dev84c8c53 sau merge dev-ui.

## Global Constraints

- Ghi chú nội bộ optional, plain text≤4.000; OWNER sửa, OWNER/STAFF đọc quản trị.
- Đơn giá optional: nguyên1..999999999999 VND/kg; trọng lượng gram theo contract cũ.
- Giá từ R(U×W/1000), giá đến R(U×W×115/100000); R làm tròn lên nghìn.
- Giữ giá1..999999999999, min≤max; giá tới tính từ cơ sở chưa làm tròn.
- Giữ ID/mã/slug/publishedAt/ảnh, UUID và tên variant legacy; không tự gộp sách.
- Không leak ghi chú/grade qua public/preview/SSR/SEO/wishlist/enquiry.
- Không mở thêm quyền; giữ version409/audit/atomicity/idempotency.
- Không sửa migration đã phát hành, không thay workbook/header V1/V2.
- Làm trên dev; user tự merge main/deploy. Không migrate/backfill live.
- Giữ các thay đổi dev-ui mới (wishlist CTA, related shelves, tìm publisher).

## Review Focus

1. Client cũ thiếu field mới: không xóa đơn giá/ghi chú/grade khi sửa ảnh hoặc metadata (T1).
2. Tổng tồn nhiều dòng lớn hơn999999: không mất số lượng hoặc đổi ID khi sửa ghi chú (T2).
3. Response upload đến sau sửa giá: không ghi đè hoặc chạy lại công thức (T4).
4. Đổi shape DTO làm fingerprint thay: retry file/phiên đã commit vẫn nhận đúng sách cũ (T1,T6).
5. Nội dung cũ còn trong SSR/cache hoặc rollback backend: ghi chú không tái lộ (T5,T7).

## Quyết định giao tiếp và dữ liệu

- POST/PUT vẫn path cũ; DTO request nhận thêm `stock`, `internalNote`,
  `unitPricePerKgVnd`. DTO detail thêm ba field này và `stockLimit` (số nguyên).
  Giữ `totalStock`/`variants`/condition legacy ở admin để client cũ còn đọc được.
- Có stock và variants cùng có giá trị →400; stock=null explicit →400. Thiếu cả
  hai ở update → giữ tồn hiện có; create thiếu cả hai →400, không tự ghi tồn0.
- Presence phải giữ ở boundary: class DTO typed dùng setter/creator theo Jackson
  hiện có (tools.jackson), kèm các boolean `...Supplied`; không dùng null đơn thuần
  để suy field vắng. Nếu đổi từ record, giữ constructor Java tiện dụng cho tests/
  importer và normalize thành BookWrite canonical trước command.
- `internalNote` có mặt ưu tiên; nếu có cả alias conditionNote khác nội dung
  sau trim →400. null/blank explicit xóa ghi chú; thiếu cả hai giữ ghi chú cũ.
  Grade thiếu giữ cũ; null explicit chỉ được xóa qua legacy API có chủ ý.
- Đơn giá thiếu giữ cũ; null explicit xóa; create thiếu đơn giá/ghi chú →null.
  Các field còn lại giữ semantics PUT hiện hành. Unknown fields vẫn400.
- Audit snapshot thêm unitPricePerKgVnd/internalNote/stock; chỉ admin đọc.
- Fingerprint mới canonical theo dữ liệu người dùng, trước sinh UUID; preserve
  serializer cũ cho retry legacy. Không serialize presence flags vào fingerprint.
- Tồn tổng update nằm0..stockLimit; stockLimit=min(9007199254740991,
  số dòng hiện có×999999), create0..999999. Không cần sinh thêm dòng cho update.
  Những giới hạn này giữ đủ mọi tổng cũ trong miền số JSON an toàn hiện hành.
- Phân bổ: nếu tổng không đổi giữ nguyên; giảm thì trừ từ dòng cuối về đầu;
  tăng thì lấp sức chứa từ dòng đầu về cuối, mỗi dòng≤999999. Không sửa tên/ID/
  thứ tự hoặc thêm/xóa dòng; create tạo một dòng không tên. Ví dụ [2,3]→4=[2,2],
  →6=[3,3], →0=[0,0]. Tính trước rồi save trong aggregate transaction.
- Lookup GET `/api/v1/admin/books/title-duplicate?title=...&excludeId=...`
  trả `{duplicate:boolean}`, no-store. title≤300, excludeId positive bigint;
  session OWNER/STAFF; exact lower(trim(title)), gồm sách ẩn/hết hàng.

## Task 1 — DTO, đơn giá và ghi chú riêng ở backend

**Files:**
- Modify: `code/backend/src/main/java/vn/memay/catalogue/BookDtos.java`
- Modify: cùng thư mục `BookCopy.java`, `BookMapper.java`, `BookValidation.java`,
  `BookCommandService.java`; `code/backend/src/main/java/vn/memay/audit/AuditService.java`.
- Create: `code/backend/src/main/resources/db/migration/V14__book_unit_price.sql`
  (kiểm lại số migration trước tạo nếu dev đã tiến thêm).
- Test: `code/backend/src/test/java/vn/memay/catalogue/BookEntryContractTest.java`;
  `BookCommandIntegrationTest.java`, `BookStatusIntegrationTest.java` cùng thư mục.

**Interfaces:** request/detail fields và presence theo mục trên; giữ public
signatures command create/update và `BookMapper.write(BookDetail):BookWrite`.
Field entity `Long unitPricePerKgVnd`; column `unit_price_per_kg_vnd` nullable.

- [x] Viết failing tests `emptyInternalNoteDoesNotBlockPublishing`,
  `legacyMetadataUpdatePreservesNewFields`, `explicitNullClearsOptionalFields`,
  `manualPricesWinOverUnitPrice`, `legacyConsumedSessionStillReplays`.
  Assertions: publish không note đạt; thiếu field giữ giá trị đã lưu; null xóa;
  đơn giá80000/450g nhưng giá thủ công40000..48000 lưu đúng40000..48000;
  consumed legacy session trả cùng ID/version, không thêm ảnh/audit.
- [x] Root: `bash code/backend/run-local.sh -B -ntp -Dtest=BookEntryContractTest,BookCommandIntegrationTest,BookStatusIntegrationTest test`.
  Kỳ vọng RED đúng thiếu hành vi mới; lỗi DB/môi trường không tính là RED.
- [x] Trước đổi DTO, pin final-session hash và hash/receipt importV1/V2 bằng
  golden fixtures từ base hiện hành. T6 dùng lại fixtures này, không tái tạo
  expected từ serializer mới. Thêm migration cột nullable CHECK1..999999999999,
  không UPDATE dữ liệu cũ;
  update entity/mapper/DTO/normalization theo presence. Bỏ metadata-required note,
  không tự xóa legacy grade; chỉnh wording xác nhận ảnh ở create/status service.
  Mọi snapshot/final fingerprint mới phải gồm field mới; retry legacy dùng shape
  JSON legacy cố định (ghi golden hash trước đổi DTO), có media/session cùng thứ tự.
- [x] Chạy lại lệnh trên GREEN; thêm migration test từV13 giữ note/grade/giá/ID.
  Kiểm no-op không tăng version và audit failure rollback unit price/note.
- [x] Commit runtime/tests/migration và checkpoint docs: `feat: support optional private book notes and unit prices`.

## Task 2 — Tổng tồn qua lớp tương thích biến thể

**Files:** Modify `code/backend/src/main/java/vn/memay/catalogue/BookVariantStore.java`,
`BookCommandService.java`, `BookDtos.java`, `BookMapper.java`, `BookValidation.java`.
Test `code/backend/src/test/java/vn/memay/catalogue/BookVariantIntegrationTest.java`
và `BookEntryContractTest.java`.

**Interfaces:** thêm `BookVariantStore.pooledRows(long bookId,long stock):List<VariantWrite>`
(không ghi DB), `stockLimit(long bookId):long`; create dùng một VariantWrite null-ID.
Command lấy snapshot hiện có, map stock trước normalize, rồi dùng save hiện hành.
Detail expose stock=totalStock và stockLimit; API legacy variants giữ validation cũ.

- [x] Test `pooledStockPreservesLegacyRows` assertions IDs/tên/thứ tự giữ nguyên;
  [2,3] đổi4/6/0 đúng quy tắc trên; note-only update không sửa [2,3].
  `largeLegacyStockRemainsEditable`: [999999,999999]→tổng1999998,
  stockLimit1999998; sửa note giữ tổng, giảm/tăng trong limit thành công.
- [x] Chạy RED: root `bash code/backend/run-local.sh -B -ntp -Dtest=BookVariantIntegrationTest,BookEntryContractTest test`.
- [x] Implement pooledRows/stockLimit và route payload pooled/legacy trước apply;
  từ chối null/âm/float/over-limit/mixed stock+variants. Availability từ tổng;
  giữ kiểm version trước ghi, không save một phần dòng nếu validation fail.
- [x] GREEN cùng lệnh; reuse concurrentStockUpdatesShareAggregateVersion,
  no-op/audit rollback tests; thêm create stock0→SOLD, stock1→AVAILABLE.
  Gửi request stock thay phiên variants phải cùng khóa version aggregate.
- [x] Commit: `feat: edit pooled stock without replacing legacy variants`.

## Task 3 — Endpoint cảnh báo tên trùng

**Files:** Modify `code/backend/src/main/java/vn/memay/catalogue/AdminBookController.java`,
`BookQueryService.java`, `BookDtos.java`; test
`code/backend/src/test/java/vn/memay/catalogue/BookEntryContractTest.java`.

**Interfaces:** `BookQueryService.titleDuplicate(AdminUser actor,String title,Long excludeId):boolean`;
record `TitleDuplicate(boolean duplicate)` cho endpoint đã chốt.

- [x] Test `titleDuplicateIsAdvisoryAcrossAllStatuses`: lưu “Sách A” ẩn/hết hàng;
  lookup “  SÁCH A  ” true, exclude chính ID false, “Sach A” false;
  dấu `%`, `_`, quote là literal. Tên301ký tự→400; STAFF đọc200, anonymous401.
  Tạo sách thứ hai trùng tên vẫn201 nếu metadata/media hợp lệ.
- [x] RED: root `bash code/backend/run-local.sh -B -ntp -Dtest=BookEntryContractTest test`.
- [x] Implement SELECT EXISTS với bind params, lower(trim), exclude nullable;
  không dùng list paging/search substring và không đặt unique constraint.
  Đặt route literal rõ trước `/{id}`; giữ auth/no-store hiện hành.
- [x] GREEN cùng lệnh; kiểm body chỉ boolean, không lộ ghi chú hay sách ẩn public.
- [x] Commit: `feat: add advisory duplicate title lookup for admins`.

## Task 4 — Form giá/kg, ghi chú optional, tồn gộp và warning

**Files:** Modify `code/frontend/src/app/features/admin/books/book.models.ts`,
`book-api.ts`, `book-form.ts`, `book-detail-handoff.ts`;
`book-editor/book-editor.{ts,html,scss}` trong cùng thư mục books.
Create `code/frontend/src/app/features/admin/books/book-pricing.ts`, `book-pricing.spec.ts`.
Tests: `book-form.spec.ts`, `book-detail-handoff.spec.ts`, `book-api.spec.ts`,
`book-editor/book-editor.spec.ts`, `book-performance.spec.ts` trong books.

**Interfaces:** `calculatedBookPrices(unitPrice:number,weightG:number):{priceMinVnd:number;priceMaxVnd:number}|null`;
`roundPriceUp(value:number):number|null`; null nghĩa input sai hoặc kết quả ngoài range.
`BookApi.titleDuplicate(title:string,excludeId?:string):Observable<{duplicate:boolean}>`.
Form mới gửi stock/internalNote/unitPricePerKgVnd, không gửi variants/grade/conditionNote.

- [x] Viết `book-pricing.spec.ts` bằng assertions:
  `expect(calculatedBookPrices(80000,450)).toEqual({priceMinVnd:36000,priceMaxVnd:42000})`;
  81000/450→37000..42000; 1000/1000→1000..2000; 0/âm/null/overflow→null.
  Test manual-min36500 blur→37000..43000; manual-max42100→43000, min giữ nguyên.
- [x] Editor tests: đơn giá/trọng lượng user change tính lại; load sách cũ giá
  36450..41918 giữ nguyên; upload response sau manual edit không đổi giá/đơn giá;
  ghi chú trống vẫn publish được; stockLimit lớn hơn999999 được tôn trọng.
  Lookup debounce300ms + switchMap, response stale không hiện warning sai;
  network error hiện “Chưa kiểm tra được tên trùng”, vẫn lưu được.
- [x] RED từ `code/frontend`: `npm test -- --include='src/app/features/admin/books/**/*.spec.ts'`.
  Nếu CLI không nhận glob, dùng `npm test`; kiểm log RED đúng assertions mới.
- [x] Implement BigInt numerator/ceiling (không chuyển sang Number trước kiểm range);
  U×W chia1000000 để tính min theo nghìn; U×W×115 chia100000000 cho max.
  Giữ VND input/caret, chỉ làm tròn manual ở blur. Programmatic patch dùng
  emitEvent:false; event do user mới tính giá, không tạo valueChanges loop.
- [x] Replace hai field tình trạng bằng textarea note optional; thêm đơn giá/kg;
  một ô stock với limit từ server (create999999). Giữ bố cục/style hiện tại.
  Helper: “Đổi đơn giá hoặc trọng lượng sẽ tính lại hai mức giá.”
- [x] Add warning state riêng, không setErrors/disable save; copy chuẩn từ spec,
  field viền/nhãn/icon đỏ và aria-describedby. Ưu tiên lỗi validation thật.
  Update handoff/retry fingerprints ở frontend, adopt version chỉ khi mọi field
  gồm unit/note/stock giữ nguyên; không overwrite edits trong lúc upload.
- [x] GREEN cùng lệnh; kiểm test model fixtures loại assumptions note bắt buộc/
  variant selector; giữ coverage xung đột/retry/media và test trên189 hiện hành.
- [x] Commit: `feat: simplify book entry with editable weight pricing and pooled stock`.

## Task 5 — Public/preview bỏ tình trạng và chọn biến thể

**Files:** Modify `code/backend/src/main/java/vn/memay/catalogue/PublicCatalogueService.java`,
`PublicCatalogueDtos.java`, `BookQueryService.java` (preview);
`code/frontend/src/app/features/catalogue/public.models.ts`, `catalogue-state.ts`,
`book-detail/book-detail.{ts,html}`, `contact-dialog/contact-dialog.{ts,html}`;
`code/frontend/src/app/features/admin/books/book-preview/book-preview.{ts,html}`.
Tests: `PublicCatalogueApiTest.java` backend; `book-detail.spec.ts`,
`contact-dialog.spec.ts`, `catalogue-state.spec.ts`, `book-preview.spec.ts` tương ứng.

**Interfaces:** giữ public keys conditionGrade/conditionNote=null, variants=[] để
client cũ đọc shape; không thêm internalNote/unitPrice/stock nội bộ vào public.
`enquiryText(b:PublicBook,url:string):string` bỏ đối số variant; availability vẫn kiểm lại.

- [x] Test privacy với marker note “PRIVATE_NOTE_SENTINEL”; mọi list/detail/
  related/lookup/wishlist/preview response không chứa marker hoặc đơn giá;
  admin detail chứa note đúng. ARCHIVED vẫn404 public; STAFF không được sửa.
- [x] Test detail còn hàng mở liên hệ/copy không chọn variant; SOLD tư vấn sách
  tương đương; stale availability/hidden qua verify không gửi nội dung sai.
  Assert enquiry không có tên/ID biến thể hoặc note; metadata không fallback note.
- [x] RED: root `bash code/backend/run-local.sh -B -ntp -Dtest=PublicCatalogueApiTest,BookEntryContractTest test`;
  frontend `npm test` từ code/frontend.
- [x] Null private fields ngay mapper/query backend; preview theo public boundary,
  không tái dùng admin DTO trực tiếp. Update public TS nullable fields, remove
  selector/guards/bindings, condition block/grade badges nếu còn ở card/filter.
  Không xóa shelves related/publisher search mới; giữ ảnh/giá/SEO/availability.
- [x] GREEN cùng lệnh; SSR fixture marker assert không có trong HTML/transfer-state/
  JSON-LD, kể cả description rỗng. Remove note fallback trong metadata.
- [x] Commit: `feat: remove public condition data and variant selection`.

## Task 6 — Import V1/V2 và retry tương thích

**Files:** Modify `code/backend/src/main/java/vn/memay/catalogue/BookImportValidator.java`,
`BookImportFingerprint.java`, `BookImportTemplate.java`, `BookImportSchema.java` nếu
cần nhãn; `BookCommandService.createImported`;
`code/frontend/src/app/features/admin/books/book-import/book-import.{ts,html}`.
Tests: `BookImportValidationTest.java`, `BookImportV2Test.java`,
`BookImportV2IntegrationTest.java`, `BookImportTransactionTest.java`,
`BookImportApiTest.java`, `BookImportTemplateTest.java` cùng test catalogue.

**Interfaces:** giữ digest(groups,version), semanticContent(group), V1/V2 headers;
serializer legacy field order/values được pin bằng golden fixtures trước đổi DTO.
Importer vẫn tạo qua canonical legacy variants; unitPrice null, note nội bộ.

- [x] Pin hash/receipt fixtures V1/V2 hiện hành trước đổi serializer; assert hash
  sau thay đổi giống byte-for-byte và retry nhận cùng ID, không audit/create mới.
  Note/grade rỗng import thành công; note có nội dung chỉ admin xem.
  V1 nhiều variants bảo toàn ID/tên/tổng khi mở form gộp và sửa metadata.
- [x] RED: root `bash code/backend/run-local.sh -B -ntp '-Dtest=BookImport*Test' test`.
- [x] Relax required grade/note ô dữ liệu, vẫn giữ header và kiểm mã khi có grade;
  không suy đơn giá/sửa giá file. Tránh để field mới/presence làm đổi legacy digest
  hoặc occurrence identity V2. Sửa helper/preview import theo tồn gộp và note riêng.
- [x] GREEN cùng lệnh; kiểm file đã nhập rồi có collection inactive vẫn trả receipt;
  V2 hai dòng cùng tên vẫn hai mục; không thêm title lookup theo từng dòng.
- [x] Commit: `fix: preserve import receipts with optional private condition notes`.

## Task 7 — Kiểm chứng tổng thể, rollout và gộp tài liệu

**Files:** docs chuẩn MASTER_PLAN/DATA/CATALOGUE/DESIGN/ARCHITECTURE/BOOK_IMPORT,
DEPLOYMENT/VERIFICATION/PROGRESS/DEV_LOG/README; test SSR/proxy script hiện có
`code/frontend/scripts/check-worker-proxy.mjs` khi cần thêm privacy assertion.
Không tạo thêm spec/plan trùng trách nhiệm; giữ từng Markdown≤400 (trừ DEV_LOG).

- [x] Root: `bash code/backend/run-local.sh -B -ntp verify`; frontend: `npm test`,
  `npm run build`, `npm run build:workers`, `npm run check:workers:proxy`.
  PASS là exit0, không failure/error; live-provider skip phải ghi rõ, không PASS giả.
- [x] Browser QA với DB/asset cách ly: create80000×450→36000..42000, manual edit,
  note trống publish, ghi note rồi reload, tăng/giảm tồn, tên trùng vẫn lưu;
  metadata/upload không đổi giá, OWNER/STAFF, detail/contact/wishlist/related shelves.
  Kiểm desktop/mobile và warning theo ảnh; không ghi note vào HAR/log công khai.
- [x] Thử migration V13→V14 trên DB QA: đối chiếu counts/IDs/tổng stock/note/grade/
  giá/mã/slug/media/publishedAt trước-sau, unit mới null; restore backup kiểm đủ.
- [x] Ghi DEPLOYMENT: backup trước rollout, backend trước frontend, smoke private
  boundary trước cho nhập note mới, purge cache public/SSR và kiểm age của cache;
  HTML đã tải không thể thu hồi. Rollback chỉ tới bản vẫn null public note/grade,
  hoặc bảo trì/public tạm ngừng; không rollback backend legacy khi note đã là riêng.
  Chưa tự thực hiện live; user merge/deploy, gate release cũ giữ mở nếu thiếu chứng cứ.
- [x] Gộp spec/plan đã thực thi vào docs chuẩn và bằng chứng; cập nhật index/link,
  xóa hai file thiết kế/plan chỉ sau khi đã chuyển đủ quyết định/acceptance.
  Chạy markdown line/link checks và `git diff --check`; ghi mọi thiếu sót còn mở.
- [x] Commit: `docs: record pooled stock and private note verification`; review diff
  toàn nhánh theo execution method đã chọn, sửa findings rồi tích hợp/push dev
  theo workflow; không merge/push main hoặc đánh dấu production đã nghiệm thu.

## Thứ tự và self-review

T1→T2→T3→T4→T5→T6→T7. Các task dùng cùng DTO/fingerprint nên nên chạy tuần tự;
đây là một thay đổi nghiệp vụ xuyên form/API, không chia thành nhiều spec độc lập.

Coverage: spec4→T1/T5, spec5→T1/T4, spec6→T2/T4/T5,
spec7→T3/T4, spec8→T1/T6/T7, spec9→tests ở mọi task và T7.
Đã tự rà interfaces/presence, limits, privacy và retry; năm Review Focus có test
ở task sở hữu. Chưa chạy bất kỳ test/build nào chỉ vì viết plan.
