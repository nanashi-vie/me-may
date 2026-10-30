# Tối ưu nhập sách Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans hoặc
superpowers:subagent-driven-development để thực thi từng task. Các bước dùng checkbox để theo dõi.

**Goal:** Tối ưu form nhập, thêm tồn theo biến thể và chọn biến thể khi hỏi mua, giữ khoảng giá chung.

**Architecture:** Giữ aggregate BookCopy/Listing và bộ ảnh chung; thêm bảng biến thể con qua Spring JDBC. Mọi ghi tồn
dùng aggregate version hiện tại; availability là giá trị dẫn xuất được cập nhật trong cùng transaction để các
query/filter/sale hiện có tiếp tục dùng được.

**Tech Stack:** Angular 21 standalone/reactive forms, Spring Boot/Java 21, PostgreSQL/Flyway, JDBC; không thêm dependency.

**Spec:** [BOOK_ENTRY_SPEC — đã duyệt](BOOK_ENTRY_SPEC.md), gồm hai lựa chọn tình trạng user bổ sung.

## Global Constraints

- “Giữ nguyên khoảng giá chung hiện tại”, “không thêm giá riêng từng biến thể”.
- Tồn mỗi biến thể 0..999999; mặc định 1; tổng readonly tự cộng, tổng 0→SOLD.
- OWNER ghi, STAFF chỉ đọc; giữ optimistic locking, audit và final idempotency.
- Giữ ID/mã MM/slug/URL/ảnh/publishedAt; không sinh sách hoặc ảnh mới cho biến thể.
- Không xóa biến thể đã lưu; tên bắt buộc khi có nhiều dòng, không trùng sau trim/không phân biệt hoa thường.
- Ngôn ngữ mặc định chỉ form tạo mới; API giá luôn số nguyên, 1..999999999999.
- Ảnh chung 2–6, FRONT/BACK bắt buộc; dropdown là cách đổi vai trò duy nhất.
- Wishlist vẫn theo sách, dữ liệu localStorage cũ giữ nguyên; không thêm giỏ/order/giữ hàng.
- Chỉ dev hoặc codex/ từ dev; tích hợp/push dev theo workflow, user tự main/deploy.
- Không migrate dev/online hoặc chạm sách bán thật khi QA; dùng database scratch/test có guard.
- Kiểm thử chốt MVP đang tạm gác; vẫn kiểm tra an toàn code vừa sửa, không tuyên bố M5 hoàn thành.

## Review Focus

1. Final response bị mất: retry cùng payload không cộng tồn/tạo biến thể lặp; khác tồn trả409 (task2).
2. Gửi ID biến thể của sách khác hoặc bỏ dòng đã lưu: từ chối, không sửa/xóa nhầm (task2).
3. Chỉ sửa tồn ở hai tab: một version thắng, audit/version/availability không lệch (task2).
4. Gõ/dán giá âm, thập phân hoặc sửa giữa chuỗi: không đổi thành giá dương/sai số (task4).
5. Chọn biến thể rồi hết hàng/đổi sách trước copy: không gửi tên hoặc trạng thái cũ (task6).

## Cấu trúc file và contract chung

- Backend root `code/backend/src/main/java/vn/memay/`; tests tại `code/backend/src/test/java/vn/memay/`.
- Frontend root `code/frontend/src/app/features/`; dùng component/form/service hiện có, không tạo hệ thống sản phẩm thứ hai.
- `BookDtos.VariantWrite(String id, String name, Long stock)`: id null cho dòng mới; id chuỗi UUID cho dòng đã lưu.
  `VariantView(String id, String name, long stock)`; thứ tự theo mảng, tối thiểu1 dòng, tên tối đa100ký tự.
- `BookWrite`, `BookUpdate` thêm `List<VariantWrite> variants`; `BookDetail` và `PreviewBook` thêm `List<VariantView>
  variants`, `long totalStock`. `BookSummary` thêm totalStock.
- Frontend `BookVariantWrite {id: string|null; name: string|null; stock: number}`, `BookVariant extends BookVariantWrite
  {id:string}`; `BookWrite.variants`, detail/preview/summary đồng bộ contract backend.
- Public `Variant(String id,String name,boolean available)` và TS `PublicVariant` cùng shape. Public detail có variants;
  không cần phát số tồn chính xác tới khách. Các projection dùng chung DTO Book luôn có variants (card có thể mảng
  rỗng), không làm N+1 cho shelf/catalogue.
- Một dòng mặc định được phép name null; nhiều dòng yêu cầu tên riêng. Public một dòng có tên vẫn đưa tên vào hỏi mua;
  một dòng không tên dùng luồng cũ.
- Lựa chọn tình trạng mới: `HIGH_FRESHNESS`→“Độ mới cao”, `MINOR_FLAWS`→“Có lỗi nhẹ”. Giữ null tùy chọn; các mã legacy
  VERY_GOOD/GOOD/FAIR giữ nguyên, hiển thị nhãn cũ khi đọc và một option legacy chỉ khi đang sửa bản cũ; không tự ánh xạ
  tình trạng sách.
- Tổng tồn tính bằng long/backend, number/frontend; không lưu tổng riêng. Cột availability giữ cho query hiện tại, mọi
  ghi xuất phát từ tổng tồn đã validate.

### Task 1: Schema tồn kho và tương thích tình trạng cũ

**Files:** Create `code/backend/src/main/resources/db/migration/V10__book_variants.sql`; create tests
`catalogue/BookVariantMigrationTest.java`; modify `support/BookTestData.java`.

**Interfaces:** Bảng `book_variant(id UUID PK, book_copy_id BIGINT FK, name VARCHAR(100), stock BIGINT, sort_order
INT)`; CHECK stock 0..999999, sort_order≥0, unique(book_copy_id,sort_order), unique tên đã lower/trim trong sách khi
name khác null. Migration mở CHECK condition_grade cho hai mã mới, giữ ba mã cũ.

- [ ] Viết migration test `migratesAvailableAndSoldWithoutChangingIdentity`: seed V9 AVAILABLE/SOLD với ảnh, price
  range, slug và legacygrade; assert upgrade có đúng1variant/sách, stock1/0, cùng
  ID/code/URL/media/price/publishedAt/grade, sequence mã không reset.
- [ ] Chạy từ `code/backend`: `bash run-local.sh -B -ntp -Dtest=BookVariantMigrationTest test`; mong RED vì thiếu V10/bảng.
- [ ] Viết V10 thêm bảng/index và backfill bằng UUID sinh trong PostgreSQL; không sửa V1–V9, không gộp sách trùng
  tên/ISBN. Seed helper thêm một variant mặc định để fixture sau migration vẫn hợp lệ.
- [ ] Chạy lại lệnh trên: PASS trên scratch được test tạo/guard; kiểm duplicate tên và stock âm/999999/1000000 ở boundary SQL.
- [ ] Cập nhật DEV_LOG/PROGRESS và commit dev: `feat(catalogue): add variant stock schema`.

### Task 2: Ghi biến thể nguyên tử, khóa phiên bản và retry

**Files:** Create `catalogue/BookVariantStore.java`, `catalogue/BookVariantIntegrationTest.java`; modify
`catalogue/BookDtos.java`, `BookValidation.java`, `BookCommandService.java`, `BookMapper.java`,
`BookStatusService.java`, `AdminBookController.java`, `audit/AuditService.java`; tests
`media/BookCreateFinalizationTest.java`, `catalogue/BookRaceIntegrationTest.java`, `BookStatusIntegrationTest.java`.

**Interfaces:** `BookVariantStore.read(long bookId): List<VariantView>`, `save(long bookId,List<VariantWrite> variants):
List<VariantView>` trong transaction caller; `BookValidation.normalizeVariants(List<VariantWrite>): List<VariantWrite>`.
Store đọc sorted, giữ ID, chỉ insert ID null; không delete/recreate mọi dòng. Commands nhận variants qua BookWrite;
mapper dùng read và long sum. Audit snapshot thêm variants và totalStock.

- [ ] Viết `stockAndAvailabilityCommitTogether`: create2+1→3/AVAILABLE; update0+1→1/AVAILABLE; update0+0→0/SOLD; assert
  cùng1book/1listing/bộasset, giá chung không đổi, version tăng1 mỗi thay đổi, no-op không tăng.
- [ ] Viết `rejectsInvalidOrForeignVariants`: mảng rỗng/null, row null, stocknull/âm/phân số/1000000, tên>100, tên trùng
  trim/case, nhiều dòng không tên, ID trùng/ID lạ/foreignID/bỏ persistedID đều bị400/409 và rollback toàn bộ. Single
  default name null hợp lệ; unknown conditiongrade bị từ chối, hai mã mới và legacy roundtrip được.
- [ ] Viết `retryFinalDoesNotDuplicateStock`: cùng uploadsession+payload hai lần→cùngbook/variantID/count/stock; khác
  tên/tồn→409. `concurrentStockUpdatesShareAggregateVersion`: hai update chỉ tồn cùngversion→một thắng, một409;
  audit/availability khớp bên thắng. Thiếu quyền/CSRF không ghi tồn.
- [ ] Chạy `bash run-local.sh -B -ntp
  -Dtest=BookVariantIntegrationTest,BookCreateFinalizationTest,BookRaceIntegrationTest,BookStatusIntegrationTest test`
  (backend): RED vì contract chưa có variants.
- [ ] Implement normalize/validate trong boundary, UUID mới sinh server sau fingerprint, normalize tên bằng Locale.ROOT;
  save cùng BookCopy/Listing/media/audit. Tính availability từ tổng; touch aggregate kể cả chỉ stock đổi để optimistic
  lock bắt conflict; rollback bao gồm insertvariants.
- [ ] Ngừng mutation availability độc lập: giữ endpoint cũ để trả409 `stock_managed_availability` cho OWNER, kiểm quyền
  trước; không tạo tồn giả hoặc làm mất phân bổ tồn khi client cũ gọi. Publication vẫn hoạt động; validate published
  chấp nhận ảnh chung với mô tả đúng phạm vi.
- [ ] Fingerprint final bao gồm normalizedvariants; cập nhật mapper.write, so sánh no-op và reconciliation để thay đổi
  tồn không bị bỏ sót. Không tự đổi request đã pending nếu form khác payload.
- [ ] Chạy lại targeted: PASS; `bash run-local.sh -B -ntp verify`: PASS, ghi live skipped riêng. Sửa constructor/fixture
  test bị ảnh hưởng bằng variants mặc định, không bỏ test race/quyền/media.
- [ ] Cập nhật log và commit dev: `feat(catalogue): save variant stock atomically`.

### Task 3: Projection public và preview từ tồn biến thể

**Files:** Modify `catalogue/PublicCatalogueDtos.java`, `PublicCatalogueService.java`, `BookQueryService.java`; tests
`catalogue/PublicCatalogueApiTest.java`, `BookVariantIntegrationTest.java`; mapper/DTO task2 nếu cần preview.

**Interfaces:** Public Book thêm `List<PublicCatalogueDtos.Variant> variants`; detail lấy stable ID/name/available,
lookup/shelf/catalogue giữ availability đã đồng bộ. Admin list trả totalStock và preview trả variants/totalStock.

- [ ] Viết `publicVariantsUseOwnStockAndSharedPrice`: book2+0→một card, range cũ, detailhai lựa chọn available
  true/false; không sourceRef/internalstock; tổng0 thì hết hàng và còn detail, archive404. Grade mới/legacy không đổi dữ
  liệu.
- [ ] Viết `stockUpdatesAffectLookupFiltersAndSale`: sửa tổng0 làm lookup/availablefilter/sale bỏ trạng thái còn hàng;
  publicquery không phụ thuộc công tắc availability đã bỏ. Assert media paths/slug/publishedAt giữ nguyên.
- [ ] Chạy `bash run-local.sh -B -ntp -Dtest=PublicCatalogueApiTest,BookVariantIntegrationTest test`: RED, rồi implement
  projection; tránh fanout join làm trùng card/totalElements và tránh queryvariants cho từng card.
- [ ] Chạy lại: PASS; kiểm no-store/privacy public và adminpreview quyền hiện có vẫn đạt.
- [ ] Cập nhật log và commit dev: `feat(catalogue): expose book variants in public detail`.

### Task 4: Default ngôn ngữ, giá dễ nhập, ảnh chỉ đổi vai trò

**Files:** Create frontend `admin/books/vnd-input.ts`, `vnd-input.spec.ts`; modify `book-editor.ts`, `book-editor.html`,
`book-form.ts`, `book-copy.ts`, `book-media-panel.ts`, `book-media-panel.html`, `book-upload-queue.ts`; tests
`book-editor.spec.ts`, `book-form.spec.ts`, `book-upload-queue.spec.ts`.

**Interfaces:** Standalone directive `[appVndInput]`, ControlValueAccessor number|null, validator lỗi nhập invalid;
selector chỉ hai ô giá dùng type=text/inputmode=numeric. `formatPrice` public giữ hậu tố VNĐ, directive chỉ phân nhóm
không hậu tố. `buildBookForm()` default language “Tiếng Anh”; accept server luôn patch null/giá trị thật.

- [ ] Viết `formatsAndPreservesNumericModel`: gõ21000→DOM21.000/model21000; paste21.000→21000; clear→null; min/max;
  caret khi chèn/xóa giữa số đúng vị trí chữ số; blur/touched/disabled hoạt động.
- [ ] Viết `rejectsNegativeAndDecimalPrices`: paste-21000,21,5,21.50,1e3 không bị strip thành số dương khác hoặc gửi giá
  trị hợp lệ; chỉ nhận số nguyên thô hoặc grouping chấm chuẩn. Chặn save khi invalid, giữ hiển thị để sửa; test cả hai
  controls và min≤max.
- [ ] Viết editor default mới/languagecũnull/languagecũkhác và chỉhai optiongrade mới khi tạo, legacylabel giữ khi mở.
  Media test không nút lên/xuống/dragcard, vẫn filedrop; dropdown đổiFRONT/BACK hoán đổi an toàn và không upload lại
  READY.
- [ ] Chạy từ `code/frontend`: `npm test -- --include='src/app/features/admin/books/*.spec.ts'`: RED, rồi implement
  directive/default/conditionlabels và bỏ dragcard/step nếu hết caller. Không bỏ dropfile handlers hoặc giới hạn
  ảnh/quyền.
- [ ] Chạy lại targeted: PASS; dùng bàn phím đổi role vẫn đủ FRONT/BACK, không làm thayversion/upload ngoài ý muốn.
- [ ] Cập nhật log và commit dev: `feat(admin): simplify book language price and photo inputs`.

### Task 5: Form tồn kho và thêm biến thể

**Files:** Modify frontend `admin/books/book.models.ts`, `book-form.ts`, `book-editor.ts`, `book-editor.html`,
`book-editor.scss`, `book-status-actions.ts`, `book-api.ts`, `book-preview.ts`; tests `book-form.spec.ts`,
`book-editor.spec.ts`, `book-status-actions.spec.ts` (tạo nếu chưa có).

**Interfaces:** FormArray variants gồm controls id/name/stock, `addVariant():void`,
`removeNewVariant(index:number):void`, `totalStock():number`; toBookWrite tạo payload task2. BookStatusActions chỉ
publication; thông tin tồn ở form, không api.availability caller. BookDetail/preview đồng bộ task2/3.

- [ ] Viết `startsWithOneStockAndAddsNamedVariants`: mới1dòng/nullname/stock1; add→2dòng, dòng mới1; hai tên khác
  với2+1→readonly3; payload numbers/IDs đúng, một price range chung; không thêmupload/books.
- [ ] Viết `preservesPersistedVariantIdsAndDirtyForm`: accept load cóIDs, sửa stock rồi mediaupdate/410/relogin/conflict
  không reset; dòng đã lưu không có gỡ, dòng mới được gỡ; min1row; validate tên trùng/khoâm/phân số; STAFF
  disabled/cannotadd.
- [ ] Chạy targeted admin specs như task4: RED; implement form/template với label/error/focus, patch FormArray khi
  accept bản server đã xác nhận, không patch khi cần giữ dirty fields. Reconciliation media phải so sánh cả variants
  trước adoptversion.
- [ ] Đổi nội dung xác nhận và heading ảnh thành bộ ảnh chung/mô tả tình trạng không hứa đúng mọi bản; preview hiện biến
  thể/totalstock/pricechung; bỏavailability button/method client đã hết caller, giữ ẩn/hiện.
- [ ] Chạy targeted rồi `npm test`: PASS, sửa fixture public/admin có field mới, không nới type thành any/optional để né contract.
- [ ] Cập nhật log và commit dev: `feat(admin): add stock and variant entry`.

### Task 6: Khách chọn biến thể và hỏi mua

**Files:** Modify frontend `catalogue/public.models.ts`, `book-detail.ts`, `book-detail.html`, `book-detail.scss`,
`catalogue-state.ts`; tests `catalogue/book-detail.spec.ts`, `catalogue/catalogue-state.spec.ts`,
`wishlist/wishlist-page.spec.ts`. Wishlist store không đổi schema.

**Interfaces:** `BookDetail.selectedVariantId` signal<string|null>; `selectVariant(id:string):void`;
`enquiryText(book:PublicBook,url:string,variant?:PublicVariant):string` chỉ thêm tên khi variant đã chọn/available.
`verifyContact()` fetch fresh book, đối chiếu selectedID trước buildtext, đồng bộ UI khi hết và yêu cầu chọn lại.

- [ ] Viết `asksForSelectedVariantAtSharedPrice`: nhiềuvariant buộc chọn trước hỏi; hết hàng có label/disabled; chọn còn
  hàng→copy gồm mã/tên/rangechung, không quantitycart. Một dòng không tên dùng luồng cũ; một dòng có tên tự chọn đúng
  ID, kể cả tên sửa sau refresh lấy tên mới.
- [ ] Viết `doesNotCopyStaleVariant`: selectedstockvề0 nhưng siblingcòn→báo chọn lại/không stale copy; cảbookSOLD→tư vấn
  tương đương; routeđổi/404 clearselection, request trảchậm không dùng selectioncủabookkhác. Name mới lấy từfresh
  response, không gọi fallback tự chọn sibling.
- [ ] Viết regression wishlistđãlưu vẫn đọc/theosách, hỏi nhiềucuốn không tự gánvariant, price/status lookup vẫn mới;
  SSRseed có lựa chọn và revalidate vẫn khóa liên hệ tới response.
- [ ] Chạy `npm test -- --include='src/app/features/catalogue/*.spec.ts'
  --include='src/app/features/wishlist/*.spec.ts'`: RED, rồi implement bằng radio/button native accessible,
  labels/reducedmotion/390px không overflow; không đổi giỏ hoặc store schema.
- [ ] Chạy lại targeted và `npm test`: PASS.
- [ ] Cập nhật log và commit dev: `feat(catalogue): select book variant for enquiries`.

### Task 7: Kiểm chứng tích hợp và tài liệu bàn giao

**Files:** Update `docs/DATA.md`, `DESIGN.md`, `ARCHITECTURE.md`, `MASTER_PLAN.md`, `DEPLOYMENT.md`, `VERIFICATION.md`,
`README.md`, `PROGRESS.md`, `DEV_LOG.md`, root `README.md`; spec/plan giữ tới chuyển đủ tiêu chí. QA artifacts chỉ
ignored output/.local.

**Interfaces:** Release có V10 sau V6–V9 và contractvariants; triển khai backend trướcfrontend, clientcũ availability
nhận409 rõ ràng, không quảng bá zero-downtime khi chưa chứngminh. Không đổi quyết định M5 chưa nghiệmthu.

- [ ] Chạy backend `bash run-local.sh -B -ntp clean verify`, frontend `npm test`, `npm run build`, `npm run
  build:workers`, `npm run check:workers:proxy`; PASS hoặc ghi đúng limitation, không dùng kết quả checkpoint cũ.
- [ ] BrowserQA DBscratch/namespaceQA: OWNER tạo2variant2+1 với cùng2ảnh, sửa0+1/0+0, preview/public/lookup/FlashSale;
  retrylostresponse/multitab409; STAFF readonly/directwrite403. Xác nhận khôngreupload/sinhbookmới khi thêmvariant.
- [ ] Browser keyboard/mobile390/laptop: pricegõ/dán/caret/xóa/sai số; language; dropdownảnh;
  chọnvariant/stockthayđổitrướccopy/wishlistcũ. Chạy SSRchecker từ rootfrontend với URL QA: `node scripts/check-ssr.mjs
  http://127.0.0.1:4000` (đổi port đúng runtime đã xác minh).
- [ ] Kiểm migration scratchV9→V10counts/fingerprint/legacygrade; không chạy trên Neon/dev. Ghi backup+rollout hướngdẫn
  riêng, không apply/deployonline.
- [ ] Review toàn diff theo skill requesting-code-review; giải quyết finding rồi chạy lại checks bị ảnh hưởng. Dọn
  assetQA đúng namespace, không xóa dữ liệu bán thật.
- [ ] Gộp quyết định vào tài liệu chuẩn (mã naytheomụcsách, ảnhchung, tồn/grade/default), giữ gateM5 online còn mở;
  DEV_LOG ghi lệnh/cwd/kếtquả/skipped, commit/pushdev theo workflow. Kiểm Markdown≤400 trừDEV_LOG,
  link/index/ignore/publicassettracked và `git diff --check` trước bàn giao.

## Tự review kế hoạch

- Spec§1–4→task4/5; §5→task1/2; §6→task3/6; §7→task7 và các RED→GREEN nêu trên.
- Năm ReviewFocus đều có regression theo task; dữ liệu legacygrade không tự đổi nhãn/tình trạng.
- DTO/id/nullability được nêu chung; variantID thuộc sách, tổnglong, giánumber, wishlistkey vẫnbook.
- Chưa triển khai; kiểmtra/lệnh bên trên là kế hoạch, không phải kết quả đã chạy.
