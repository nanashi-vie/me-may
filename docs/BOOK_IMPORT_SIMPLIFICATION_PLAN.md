# Minimal Excel Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import7cột tạo sáchẨn chưa có giá; chủ thêm ảnh/đơn giá rồi xuất bản.

**Architecture:** Thêm schemaV3 riêng, dùng domain nullable price hiện có;
không migration. V1/V2 giữ validation/digest/receipt cũ. Angular tiếp tục dùng
editor hiện có để tính giá; template và hướng dẫn chuyển sang7cột.

**Tech Stack:** Java21/Spring Boot/Spring JDBC, PostgreSQL, Apache POI,
Angular21/Vitest; không thêm dependency.

**Spec:** [BOOK_IMPORT_SIMPLIFICATION](BOOK_IMPORT_SIMPLIFICATION.md), user duyệt06/11.

## Global Constraints

-7header: ten_sach,nha_xuat_ban,tac_gia,the_loai,kieu_bia,trong_luong_g,mo_ta_sach.
- Nhà xuất bản/Tác giả/Mô tả sách optional; binding bắt buộc chỉ Picture Book.
- Mỗi dòng một sáchẨn, Tiếng Anh/tồn1; không tự gộp tên, không thêm đơn giá vào Excel.
- Hai giá V3 null, không dùng0/giá giả; giá/ảnh đầy đủ trước publish.
- Giữ file gốc input/me-may-sach-v2.xlsx, V1/V2 canonical/digest/receipt nguyên vẹn.
- Giữ2MiB/100sách, XLSX Sach/HuongDan, chống formula/XXE/zipbomb, quyền/CSRF.
- Tuần tự trên dev theo yêu cầu user; không push main/deploy hoặc truy cập DB bán thật.

## Review Focus

- Dòng XLSX sparse sau header/reorder: giữ đúng số hàng lỗi, không đổi field mapping (T1).
- Cả7header bắt buộc tồn tại nhưng giá trị3field optional có thể rỗng (T1/T3).
- Retry file cũ sau sửa giá/note/tồn của sách: trả receipt cũ, không ghi đè (T2).
- Upload/load editor không tính lại giá; chỉ nhập đơn giá/trọng lượng mới tính (T3).
- Đủ ảnh nhưng chưa có giá vẫn không publish; public không lộ sáchẨn (T2/T4).

## File structure và trách nhiệm

- Backend catalogue BookImportSchema/Parser/XlsxReader: nhận diện/giới hạnV3.
- BookImportValidator/Fingerprint: normalize metadataV3 và digest riêng.
- BookValidation/BookCommandService/BookImportTransaction: allow null giá chỉ
  khi tạo importV3, giữ kiểm tra publish và input cũ.
- BookImportTemplate: sinh CSV/XLSX7cột, hướng dẫn và dropdown taxonomy hiện hành.
- Frontend features/admin/books/book-import: hướng dẫn7cột và preview chưa có giá.
- book-editor/book-list: tái dùng null giá/tính giá; chỉ sửa nếu test chỉ ra thiếu.
- Tests backend/frontend xác nhận contract, privacy, retry và bước hoàn thiện giá.

### Task 1: Parser và validationV3

**Files** (backend paths relative `code/backend/src/`):
- Modify main/java/vn/memay/catalogue/BookImportSchema.java,
  BookImportParser.java, BookImportXlsxReader.java, BookImportValidator.java,
  BookImportFingerprint.java, BookValidation.java.
- Create test/java/vn/memay/catalogue/BookImportV3Test.java.
- Reuse test/java/vn/memay/catalogue/BookImportV2Test.java,
  BookLegacyFingerprintTest.java và BookImportParserTest.java.

**Interfaces:** `parse(String,byte[]) -> List<CellRow>` và
`normalize(List<CellRow>) -> ImportDocument` giữ nguyên; schemaVersion=3 mới.
Thêm `BookValidation.importMetadataErrors(BookWrite)` kiểm title/category/weight,
không bắt buộc giá; `metadataErrors(BookWrite)` và publish giữ nguyên.

- [ ] Viết BookImportV3Test: CSV/XLSX7cột, label/code/reorder tương đương;
  `assertThat(doc.schemaVersion()).isEqualTo(3)`;
  `assertThat(doc.groups().getFirst().write().priceMinVnd()).isNull()` và max null.
  Kiểm optional3field trống/mô tả multiline, binding/weight/title/category lỗi,
  sparse row7 trả issue.row7, header thiếu/trùng/lạ bị chặn,101dòng bị chặn.
  Hai dòng giống nhau vẫn2group; digestV3 khácV2, CSV/XLSX cùng metadata cùng digest.
- [ ] Run root: `bash code/backend/run-local.sh -B -ntp -Dtest=BookImportV3Test test`;
  phải FAIL do chưa nhận7header, không phải lỗi compile/test setup.
- [ ] Thêm V3_HEADERS và nhận diện version3; alias kiểu bìa hiện có áp dụngV3.
  Limits parser/XLSX dùng100dòng cho version2/3. NormalizeV3 chung logic một
  dòng một sách vớiV2, nhưng chỉV3 cho hai giá null; không đổi canonicalV1/V2.
  Giữ required/range/integer/length/enum kiểm trên field có trongV3; cho digest3.
- [ ] Run root: `bash code/backend/run-local.sh -B -ntp -Dtest=BookImportV3Test,BookImportV2Test,BookImportParserTest,BookLegacyFingerprintTest test`;
  tất cả PASS, digestV1 fixture cố định không đổi.
- [ ] Cập nhật log/progress rồi commit `feat: parse minimal seven-column book imports`.

### Task 2: Commit sáchẨn chưa có giá và tương thích

**Files:** backend main/java/vn/memay/catalogue/BookCommandService.java,
BookImportTransaction.java; create test/java/vn/memay/catalogue/BookImportV3IntegrationTest.java.
Reuse BookImportV2IntegrationTest/BookImportTransactionTest/BookImportApiTest.

**Interfaces:** thêm overload package-private
`createImported(AdminUser,BookWrite,UUID,int schemaVersion) -> BookDetail`;
3arg hiện tại delegate version1. Transaction truyền document.schemaVersion().

- [ ] Viết integration test preview không ghi, confirm201: hai giá và đơn giá
  null, publication ARCHIVED/publishedAt null, tồn1, đúng NXB/tác giả/mô tả.
  V3 đủ FRONT/BACK nhưng thiếu giá publish400; public không tìm thấy sách đó.
  Sửa giá/tồn/note rồi retry cùng file trả200/cùng IDs, không ghi đè.
  Lỗi ở sách cuối rollback toàn lô; STAFF403; lỗi category không tạo receipt.
  V1/V2 file cũ vẫn giữ giá và retry receipt, schema_version1/2/3 cùng tồn tại.
- [ ] Run root: `bash code/backend/run-local.sh -B -ntp -Dtest=BookImportV3IntegrationTest test`;
  xác nhận FAIL đúng missing-price gate tại createImported.
- [ ] Dùng importMetadataErrors chỉ khi schemaVersion3; version1/2 giữ
  metadataErrors. createAggregate tiếp tục validateWrite và persist nullable giá.
  Không đổi publish/privacy predicate, BookWrite JSON shape hoặc receipt tables.
- [ ] Run root: `bash code/backend/run-local.sh -B -ntp -Dtest=BookImportV3IntegrationTest,BookImportV2IntegrationTest,BookImportTransactionTest,BookImportApiTest test`;
  PASS trên me_may_test với PgTestData guard; không chạy trên DB dev/bán thật.
- [ ] Cập nhật log/progress rồi commit `feat: create unpriced hidden books from import v3`.

### Task 3: Hướng dẫn, preview/editor và mẫu mới

**Files:** backend BookImportTemplate.java/BookImportTemplateTest.java;
frontend `code/frontend/src/app/features/admin/books/`:
book-import/book-import.html, book-import/book-import.ts, book-import/book-import.spec.ts,
book-editor/book-editor.spec.ts, book-list/book-list.spec.ts; book-editor.ts hoặc
book-list.html chỉ nếu null-price flow hiện có thiếu.
Create backend test/resources/fixtures/book-import-v3.xlsx và bản giao riêng
`input/me-may-sach-v3.xlsx` (input ignored, không ghi đè workbookV2).

**Interfaces:** `BookImportTemplate.render(String,ImportOptions) -> byte[]` giữ;
CSV/XLSX mặc địnhV3. Preview nhận schemaVersion3 với price null; models nullable
hiện có giữ nguyên. Editor dùng calculatedBookPrices hiện có, không thêm công thức.

- [ ] Viết test template7header/không dòng mẫu/dropdown9category và2binding.
  Viết UI test previewV3 hiện Dòng7, “Chưa nhập giá”, confirm vẫn bật khi hợp lệ;
  list/editor không hiện0đ. Editor load null giá + weight450 không tự tính;
  nhập80000/kg tính36000/42000, sửa tay được, upload không ghi đè giá.
- [ ] Run root template test và frontend `npm test -- --include='**/book-import.spec.ts' --include='**/book-editor.spec.ts'`;
  FAIL đúng template/hướng dẫn/nhãnV3, tách assertion đã PASS trong editor hiện có.
- [ ] Sinh template7cột với dropdown text danh sách taxonomy/binding trên
  hàng2–101, freeze header, wrap mô tả, sheet HuongDan; không formula/macro/link.
  Template endpoint có sẵn dùngV3; giữ quyết định không thêm nút tải mẫu trên UI.
  Hướng dẫn nhập giá khi thêm ảnh và vẫn nhận16/20cột cũ; preview2/3 dùng số dòng.
  Nhãn chưa có giá chỉ dùng quản trị, không đổi cách hiển thị giá public.
- [ ] Dùng skill Spreadsheets khi tạo/kiểm workbook giao; chạy parser lên template
  và bản sao có dữ liệu; kiểm dropdown/header/format và hashV2 trước/sau không đổi.
  Không commit screenshot/local generator; fixtureV3 tracked để kiểm roundtrip.
- [ ] Run template/UI tests PASS, cập nhật log/progress, commit
  `feat: streamline import guidance and seven-column templates`.

### Task 4: Kiểm chứng tổng thể và bàn giao

**Files:** docs/BOOK_IMPORT.md, DATA.md, CATALOGUE.md, DESIGN.md,
BOOK_IMPORT_VERIFICATION.md, README.md, PROGRESS.md, DEV_LOG.md.

**Interfaces:** contractV3 chính thức và workbook giao; không thay public API.

- [ ] Root backend `bash code/backend/run-local.sh -B -ntp clean verify`;
  frontend `npm test`, `npm run build`, `npm run build:workers`,
  `npm run check:workers:proxy`; ghi số PASS/skips thực tế, không suy từ log cũ.
- [ ] Browser QA dữ liệu giả/cách ly: import7cột → mở sáchẨn/mô tả đúng →
  thêm ảnh → nhập đơn giá → kiểm36000/42000 → sửa tay/lưu → publish.
  Thử publish thiếu giá và retry file đã nhập sau edit; OWNER/STAFF và public
  privacy. Không ghi DB bán thật, dọn dữ liệu/service QA sau kiểm.
- [ ] Review diff toàn phạm vi với spec và5Review Focus; kiểm2phiên bản digest
  cũ và quyền, null giá/array canonical, row limits; sửa lỗi rồi rerun test liên quan.
- [ ] Gộp spec vào contract chuẩn, bằng chứng vào VERIFICATION/DEV_LOG;
  cập nhật chỉ mục/progress, gỡ spec/plan hết vai trò sau chuyển đủ quyết định.
  Kiểm git diff --check, markdown≤400trừDEV_LOG, links, inputV2 hash không đổi,
  local tools/artifacts ignored; commit/push dev, user tự merge main/deploy.

## Self-review / execution handoff

- T1 bao phủ7cột/optional/labels/limits/fingerprint; T2 bao phủ null giá,
  giữẨn/receipt/privacy/atomic; T3 bao phủ mẫu/UX/editor; T4 bàn giao/gates.
- Không đổi schema DB/dependency, không thêm chức năng cảnh báo trùng tên lô
  ngoài thiết kế đã duyệt; hành vi mỗi dòng riêng giữ nguyên.
- User đã chọn thực thi tuần tự. Chờ review kế hoạch theo Writing Plans,
  rồi dùng executing-plans trong phiên hiện tại, không hỏi lại phương thức.

User duyệt plan06/11; không tạo file hướng dẫn hoặc workbook giao riêng.
