# Customer Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (thực thi trực tiếp) hoặc superpowers:subagent-driven-development nếu owner
> chọn subagent. Theo dõi từng bước bằng checkbox, chưa tự triển khai từ plan.

**Goal:** Quản lý hồ sơ khách thủ công, username, trùng SĐT và lưu trữ trong admin.
**Architecture:** Module customer dùng Spring JDBC, transaction ngắn, version
chống ghi đè; Angular list/detail và form modal chung. Tái sử dụng auth/CSRF,
AdminHttp, lỗi và audit hiện có; không ghép nghiệp vụ khách vào catalogue.
**Tech Stack:** Angular21, RxJS, Vitest; Java21, Spring Boot4, JDBC, Flyway,
PostgreSQL và JUnit hiện có; không thêm dependency.
**Spec:** [CUSTOMER_SPEC](CUSTOMER_SPEC.md), owner duyệt12/11/2026.

## Global Constraints

- Mỗi nền tảng một field riêng: `zalo_name`, `tiktok_id`, `threads_id`.
- Nhãn UI: **Tên Zalo**, **Tên TikTok**, **Tên Threads**.
- OWNER được ghi; STAFF chỉ xem danh sách, chi tiết và tìm kiếm.
- page bắt đầu0, size mặc định20, hợp lệ1–100; sort cố định
  `created_at DESC, id DESC`. Username chỉ text, không đường dẫn.
- ID JSON dạng chuỗi; phone dạng0, NULL optional; version/currentVersion số nguyên.
- Không order/customer login/OTP/social sync/import/export/hard delete.
- Không migrate/deploy live; không đổi main/dev-ui; code/log tích hợp/push dev.
- Mỗi task: test đỏ vì hành vi thiếu → code tối thiểu → test xanh → commit;
  test không được xanh chỉ vì toàn bộ integration bị skip hoặc thiếu TEST_DB_URL.

## Review Focus

1. Username có dấu/chấm/@ và URL không scheme: giữ tên, chặn link (T1/T4).
2. Query `%`/`_`, chỉ dấu cách, số một phần/+84: kết quả literal/đúng (T2/T5).
3. Đổi phone lúc request tra trùng còn chạy: bỏ response/xác nhận cũ (T4).
4. Logout/đổi quyền khi modal mở: chặn gửi ghi, không lộ snapshot phiên trước (T4/T5).
5. Mất response sau create và version conflict: giữ input, không retry mù (T4/T6).

## File map và bằng chứng hiện tại

Các đường dẫn code dưới đây tính từ root repo. Prefix gọn chỉ dùng trong plan:
`BE=code/backend/src/main/java/vn/memay`, `BT=code/backend/src/test/java/vn/memay`,
`FE=code/frontend/src/app`, `C=FE/features/admin/customers`.
Đường dẫn dạng C/foo nghĩa chính xác FE/features/admin/customers/foo.

| File tạo/sửa | Trách nhiệm |
|---|---|
| BE/customer/CustomerDtos.java | record request/response/Page/status |
| BE/customer/CustomerValidation.java | normalize/validate text, phone, username, query |
| BE/customer/CustomerRepository.java | JDBC read/write/search/sequence |
| BE/customer/CustomerService.java | auth actor, transaction, version, duplicate, audit |
| BE/customer/CustomerController.java | REST và duplicate409 cục bộ module |
| resources/db/migration/V32__customers.sql dưới code/backend/src/main | schema mới; kiểm lại số trước tạo |
| BT/customer/CustomerValidationTest.java | validation thuần |
| BT/customer/CustomerMigrationTest.java | migration/bảo toàn fixture |
| BT/customer/CustomerIntegrationTest.java | API/read/write/quyền/duplicate |
| BT/customer/CustomerConcurrencyTest.java | race/version/audit rollback |
| BT/support/PgTestData.java | clean customer trước admin_user ở DB test |
| C/customer-models.ts, customer-api.ts, customer-validation.ts | type/API/validation FE |
| C/customer-api.spec.ts, customer-validation.spec.ts | test client/validation |
| C/customer-form/customer-form.{ts,html,scss,spec.ts} | modal tái sử dụng |
| C/customer-list/customer-list.{ts,html,scss,spec.ts} | list/filter/paging/action |
| C/customer-detail/customer-detail.{ts,html,scss,spec.ts} | chi tiết/action |
| FE/app.routes.ts | route lazy, canDeactivate cho form dirty |
| FE/layouts/admin-layout/admin-layout.{html,spec.ts} | mục Khách hàng cho hai role |
| docs hiện hành | kết quả, contract, rollout và bàn giao T6 |

Tham khảo: BE/common/AdminApiException(.field/.conflict), AuditService.record;
FE/core/auth/admin-http.ts, auth.service.ts và app.routes.server.ts.
SecurityConfiguration đã cho OWNER/STAFF GET admin, OWNER mutation; không cần
nới rule. AdminHttp đã credentials/no transferCache, retry riêng csrf_invalid
trước ghi; không thêm retry lỗi mạng. AuditService.record nhận map rỗng được,
ghi actor/target/action/version/time; không thêm field PII vào whitelist.
Public cache có thể invalidated theo audit hiện có, không cần tối ưu task này.

## T1 — Dữ liệu và chuẩn hóa (AC01–03,11,13–15)

**Files:** CustomerDtos/Validation/Repository; V32; CustomerValidationTest,
CustomerMigrationTest; PgTestData theo file map. Repository T1 chỉ insert/detail.
**Interfaces:** CustomerDtos chứa enum Status {ACTIVE,ARCHIVED}, record
CustomerWrite(fullName,phone,defaultAddress,zaloName,tiktokId,threadsId,note),
CreateRequest(bảy field,confirmDuplicatePhone,confirmedPhone),
UpdateRequest(bảy field,Long version,confirmDuplicatePhone,confirmedPhone),
StatusRequest(Status status,Long version). Wrapper Boolean xác nhận mặc định false.
CustomerDetail/Summary/DuplicateSummary và Page<T> đúng spec§8; thời gian Instant,
ID/createdBy String nullable. Validation.normalize(CustomerWrite): CustomerWrite;
normalizePhone(String): String nullable; normalizeQuery(String): String.
Repository.insert(CustomerWrite,long actorId,Instant now): CustomerDetail;
find(long id,boolean forUpdate): Optional<CustomerDetail> (forUpdate trong tx).

- [ ] Viết CustomerValidationTest: `normalizesOptionalAndPhone`,
  `rejectsInvalidTextAndLinks`, `keepsUsernameSpelling`; assertions:
  `assertThat(normalizePhone("+84 987-123.456")).isEqualTo("0987123456");`
  `assertThat(normalizePhone("   ")).isNull();`
  `assertThat(normalize(write(" Lan ","@Lan.Books" )).fullName()).isEqualTo("Lan");`
  Helper write trong test điền fullName/threadsId và optional null.
  Assert threadsId giữ @/hoa/chấm, Zalo “Lan Nguyễn” hợp lệ; các boundary
  150/100/500/1000 và +1, tên trắng, phone chữ/sai đầu số/sai độ dài bị400.
  URL http(s)/www/zalo.me/tiktok.com/threads.net/threads.com có path bị400;
  không cấm một username có dấu chấm. FE dùng cùng corpus ở T3.
- [ ] Chạy từ code/backend: `mvn -Dtest=CustomerValidationTest test`;
  kỳ vọng đỏ vì chưa có class/hành vi, không vì môi trường sai.
- [ ] Tạo DTO/validation: trim, NULL optional, không cắt quá dài; URL match
  không phân biệt hoa/thường và theo prefix/domain boundary, không cấm substring tên.
  Request field ngoài whitelist trả400 theo Jackson config hiện có.
- [ ] Viết CustomerMigrationTest dùng PgTestData và Flyway như test migration
  hiện có: seed sách/admin trước migration mới trong schema test riêng, migrate,
  assert dữ liệu/mã/version cũ giữ nguyên; customer optional NULL/status ACTIVE/
  version0, UNIQUE mã, phone trùng hợp lệ, CHECK status/length/version.
  Assert lấy2 mã sequence khác nhau; format id1000000 → KH-1000000.
- [ ] Chạy `mvn -Dtest=CustomerMigrationTest test` với DB test tách biệt;
  kỳ vọng đỏ vì thiếu customer, không chạm schema ứng dụng đang dùng.
- [ ] Xác minh migration max vẫn31 rồi tạo V32 (nếu đổi, cập nhật plan trước chạy).
  customer id identity; customer_code sinh từ chính id đã cấp bằng sequence,
  tối thiểu6 chữ số và không cắt số lớn; VARCHAR20. FK created_by không cascade;
  CHECK enum/version/độ dài; index theo spec§3. Insert trả detail bằng RETURNING.
  Thêm customer vào clean trước admin_user, giữ guard me_may_test.
- [ ] Chạy hai test T1 xanh; commit `feat: add customer schema and normalization`.

## T2 — Backend API đầy đủ (AC01–12,15,17–18)

**Files:** CustomerRepository/Service/Controller; CustomerIntegrationTest và
CustomerConcurrencyTest. Không sửa common error handler chỉ để thêm duplicates.
**Interfaces:** Repository.list(q,status,page,size): Page<CustomerSummary>;
duplicates(phone,Long excludeId,page,size): Page<DuplicateSummary>;
update(long id,long expectedVersion,CustomerWrite,Instant): int;
setStatus(long id,long expectedVersion,Status,Instant): int.
Service.list(q,status,page,size,AdminUser), detail(long,AdminUser),
duplicates(phone,excludeId,page,size,AdminUser), create(CreateRequest,AdminUser),
update(long,UpdateRequest,AdminUser), status(long,StatusRequest,AdminUser)
trả Page/Detail tương ứng. Controller principal → AdminUser như controller hiện có.
DuplicatePhoneException local chứa Page<DuplicateSummary>; controller handler
trả409 {error:"CUSTOMER_PHONE_DUPLICATE",duplicates:Page}, header no-store.

- [ ] Viết CustomerIntegrationTest kế thừa CatalogueTestSupport/AdminHttpClient:
  `createReadUpdateArchiveRestore` assert201, JSON id textual, actor/mã bất biến,
  optional null; `staffAndAnonymousBoundaries` assert GET/list/detail/duplicates
  STAFF200, mọi mutation STAFF403, anonymous401, thiếu CSRF403; không ghi DB/audit.
- [ ] Thêm `duplicatesRequirePhoneBoundConfirmation`: cả archived và nhiều hồ sơ
  xuất hiện; 0/+84 trùng; error code/page đúng; false→409, true+số khớp→201,
  true+số khác→400, giữ nguyên phone khi sửa không409, excludeId bỏ chính mình.
- [ ] Thêm `searchFiltersAndPagination`: case-insensitive/mã/tên/ba username,
  có/không @, phone một phần/+84; `%`/`_` literal; q trắng thành list,
  sort tie theo id; size20/default, size101/page âm/status sai400; page vượt rỗng;
  UNKNOWN field400, id không có404; không tìm bằng note/địa chỉ.
- [ ] Chạy `mvn -Dtest=CustomerIntegrationTest test`; kỳ vọng đỏ vì API thiếu.
- [ ] Cài repository SQL bind parameters, ESCAPE wildcard, filter/count đồng nhất,
  skip phone branch khi không phù hợp; normalizeQuery gom khoảng trắng.
  Chuỗi phone đầy đủ +84 chuẩn hóa; query số một phần tìm cả nhánh local và
  biểu diễn +84 tương ứng. username bỏ tối đa một @ đầu ở cả query/cột để tìm.
- [ ] Cài service tx: load lại actor active từ admin_user khi ghi, kiểm OWNER;
  khóa row customer SELECT FOR UPDATE, so version trước no-op/duplicate;
  UPDATE vẫn có WHERE id/version; lệch trả conflict(currentVersion).
  Normalize rồi so phone cũ, kiểm duplicate trong tx, xác nhận ràng buộc phone.
  Audit.record(actor,"CUSTOMER",id,action,Map.of(),Map.of(),version) cùng tx;
  không snapshot hồ sơ. No-op không timestamp/version/audit mới.
- [ ] Cài REST theo spec§8, default/page/enum/DTO validation, lỗi thiếu version400;
  auth/CSRF dùng chain hiện có. Duplicate handler cục bộ không log PII.
- [ ] Chạy CustomerIntegrationTest xanh; viết CustomerConcurrencyTest:
  `parallelCreatesHaveDistinctCodes` chạy2 create bằng barrier, assert2 mã khác;
  `sameVersionHasOneWinner` update/update và update/status assert1 success/1 conflict,
  currentVersion mới và1 audit mutation; `auditFailureRollsBack` làm audit thất bại
  trong schema test, assert profile/version/status/created count không đổi;
  `noopDoesNotAudit` assert audit count/version/updatedAt không tăng.
- [ ] Chạy `mvn -Dtest=CustomerIntegrationTest,CustomerConcurrencyTest test`
  xanh, không skip; commit `feat: implement protected customer APIs`.

## T3 — Angular type/API/validation (AC03,09,13–15,18)

**Files:** C/customer-models.ts, customer-api.ts, customer-validation.ts và2spec.
**Interfaces:** TS types cùng tên DTO T1; CustomerStatus='ACTIVE'|'ARCHIVED';
CustomerFilter={q,status:CustomerStatus|'ALL',page,size}; CustomerMutation gồm
CustomerWrite, confirmDuplicatePhone?:boolean, confirmedPhone?:string;
CustomerApi.list(filter): Observable<Page<CustomerSummary>>;
detail(id:string): Observable<CustomerDetail>; duplicates(phone:string,
excludeId?:string,page=0,size=20): Observable<Page<DuplicateSummary>>;
create(body:CustomerMutation), update(id:string,version:number,body:CustomerMutation),
setStatus(id:string,version:number,status:CustomerStatus): Observable<CustomerDetail>.
normalizeCustomer/normalizePhone/validateCustomer là hàm thuần tương ứng BE;
validateCustomer(CustomerWrite): Record<string,string[]> lỗi field.

- [ ] Viết customer-api.spec: với HttpTestingController, gọi update('4',3,body),
  assert request PUT `/api/v1/admin/customers/4`, body version3/threadsId,
  withCredentials true/transferCache false, CSRF header; flush409 duplicates giữ
  nguyên error/page. List/duplicate query encoded đúng, không POST tự retry khi500.
- [ ] Viết customer-validation.spec chạy corpus boundary/URL/Unicode/@/phone T1;
  `expect(normalizePhone('+84 987-123.456')).toBe('0987123456')`;
  optional trắng→null, Tên Zalo có khoảng trắng/dấu hợp lệ.
- [ ] Từ code/frontend chạy `npm test -- --include='**/customers/customer-*.spec.ts'`;
  kỳ vọng đỏ hành vi thiếu; nếu CLI không nhận include, chạy npm test toàn suite.
- [ ] Cài types/functions/API bằng AdminHttp, không AdminSessionCache/localStorage,
  không public API/TransferState; giữ error.code/page/version cho UI.
- [ ] Chạy test T3 xanh; commit `feat: add customer API client and validation`.

## T4 — Form modal tái sử dụng (AC02–04,06,13–18)

**Files:** C/customer-form/customer-form.{ts,html,scss,spec.ts}.
**Interfaces:** CustomerForm standalone; input customer:CustomerDetail|null,
output saved:CustomerDetail và cancelled:void; open():void, requestClose():boolean,
canLeave():boolean, save():void; form chứa7field, busy/dirty/errors/duplicate page.
Parent gọi open khi tạo/sửa; saved phát duy nhất sau response thành công.

- [ ] Viết test tên `rendersApprovedLabels`, `dirtyAndDoubleSubmit`,
  `duplicateConfirmationBelongsToCurrentPhone`, `staleAndNetworkErrorsKeepForm`,
  `sessionChangeClearsPrivateState`. Assert label Tên Zalo/Tên TikTok/Tên Threads;
  gọi save2lần khi Subject chưa resolve → create1lần; dirty cancel giữ modal
  khi confirm false; saved1lần/đóng khi thành công, lỗi giữ mọi input.
  Response duplicate cũ sau đổi phone không đổi cảnh báo; đổi số xóa confirmedPhone;
  409 version không tự submit, error mạng không retry; STAFF không gọi mutate.
  Đổi auth epoch/quyền đóng và xóa snapshot; không gửi theo quyền stale.
- [ ] Chạy `npm test -- --include='**/customer-form.spec.ts'` đỏ hành vi thiếu.
- [ ] Cài reactive form + dialog native: focus trap/name/error/return focus,
  Escape/backdrop/Hủy qua cùng requestClose; canLeave hỏi dirty đúng spec§6.
  Khóa busy ngay trước subscribe; recheck auth, normalize/validate trước gửi.
  Tra trùng phone hợp lệ bằng debounce/switchMap, cancel khi đổi số/destroy;
  duplicate page có link xem/tải thêm, link đi qua dirty guard.
  Confirmation true chỉ cùng normalized phone; phản hồi409 backend cập nhật
  danh sách trùng. Reload conflict yêu cầu xác nhận bỏ draft, không tự merge.
  Thông báo mất response: giữ input, nhắc kiểm tra danh sách trước tạo lại.
- [ ] Chạy form test xanh; commit `feat: add reusable customer editor modal`.

## T5 — List/detail/router/sidebar (AC05–10,12,14,16,19)

**Files:** C/customer-list và customer-detail bộ4file mỗi component;
FE/app.routes.ts, FE/layouts/admin-layout/admin-layout.html và .spec.ts.
**Interfaces:** CustomerList/CustomerDetailPage standalone đều canLeave():boolean
ủy quyền form đang mở. List dùng route query params làm nguồn filter/page;
Detail giữ query params trong link quay lại; hai trang dùng T4 saved event.

- [ ] Viết list tests `queryPagingAndBackState`, `latestSearchWins`,
  `createResetsListButEditPreservesFilters`, `staffReadOnlyEmptyState`:
  q/status đổi page0, back khôi phục URL; response cũ không đè mới;
  create success chuyển ACTIVE/q rỗng/page0, edit giữ filter/page; khi archive
  hết trang hiện tại cho về trang hợp lệ. STAFF chỉ Xem/empty không mời tạo;
  auth epoch đổi xóa list/detail/đóng modal và không nhận response phiên cũ.
- [ ] Viết detail tests `allFieldsAndNoOrderAction`, `missingAndConflict`,
  `archiveAndRestore`: đủ field/nhãn/placeholder, text XSS hiển thị literal,
  không link username; OWNER confirm archive gọi đúng version, STAFF không ghi;
  404 đường về, conflict giữ draft và mời reload. Sidebar test hai role thấy mục.
- [ ] Chạy `npm test -- --include='**/customers/**/*.spec.ts'` đỏ hành vi thiếu.
- [ ] Cài list/details/state/error/loading/empty theo spec§5–7; table desktop,
  mobile cuộn trong vùng bảng, địa chỉ đầy đủ có focus/chạm; success/error aria-live.
  Status action disabled khi gửi,409 không retry. Date Việt Nam.
  API tách query stream với auth epoch, hủy subscriptions khi destroy/logout.
- [ ] Thêm routes customers/customers/:id dưới admin, lazy components,
  canDeactivate canLeave (không owner guard cho trang đọc); sidebar link Khách hàng
  cho hai role. Tận dụng admin/** Client/no-store/noindex server route sẵn có;
  beforeunload chỉ đăng ký khi dirty, không thay route guard của sách.
- [ ] Chạy tests T5 và admin-layout xanh; commit `feat: add customer management pages`.

## T6 — Nghiệm thu, hồi quy và bàn giao

**Files:** test T1–T5 khi phát hiện lỗi; docs/VERIFICATION.md, DEV_LOG.md,
PROGRESS.md, DATA.md, DESIGN.md, ARCHITECTURE.md, README.md, DEPLOYMENT.md.
**Interfaces:** bàn giao AC01–19 có bằng chứng; không giả định deployment từ build.

- [ ] Trước chạy backend tạo/chọn PostgreSQL QA tách biệt có DB me_may_test,
  xác minh host/port/database; đặt TEST_DB_URL, DB_USER, DB_PASSWORD theo runtime
  QA, không đọc/dùng connection production hoặc ghi secret vào log.
  Test support clean xóa dữ liệu test; không chạy trên DB đang nhập sách thật.
- [ ] Từ code/backend chạy `mvn test`; ghi tổng run/failure/error/skipped,
  xác nhận customer integration/concurrency đã chạy thật, không chỉ compile.
- [ ] Từ code/frontend chạy `npm test`, `npm run build`,
  `npm run build:workers`, `npm run check:workers:proxy`; kỳ vọng exit0,
  ghi warning/giới hạn thật. Không lặp lại toàn suite nếu không đổi thêm code.
- [ ] Browser QA với backend+DB QA thật: OWNER tạo chỉ tên/đủ username,
  +84 trùng nhiều hồ sơ/archived/xác nhận/đổi số; sửa/dirty/status/search/paging/back;
  STAFF đọc và gọi mutation trực tiếp403, anonymous401. Hai tab gây version409;
  offline sau submit giữ draft, không tự gửi POST lại. Dùng dữ liệu giả, không PII thật.
- [ ] Kiểm desktop1280/mobile390, keyboard/focus/Escape/chạm địa chỉ/modal,
  URL chi tiết mới404, HTML admin shell không chứa hồ sơ, no-store/noindex;
  smoke login/sách/listing/public; đối chiếu counts và dữ liệu sách QA trước/sau.
  Thiết bị thật chưa thử phải ghi chưa thử, không thay bằng viewport giả lập.
- [ ] Ghi kết quả/AC còn thiếu, hướng dẫn owner thêm/sửa/trùng/lưu trữ ngắn,
  rollout V32 (hoặc số đã cập nhật) và backup/rollback app theo DEPLOYMENT;
  không drop bảng để rollback khi đã có khách, không chạy live trong task này.
- [ ] Khi hoàn thành đủ local acceptance, hợp nhất đầy đủ contract/AC còn mở
  vào docs chuẩn/bằng chứng trước gỡ CUSTOMER_SPEC/PLAN và sửa chỉ mục cùng commit.
  Nếu chưa đủ, giữ nguyên hai tài liệu; PROGRESS chỉ đánh dấu đúng trạng thái.
  Kiểm Markdown≤400 trừ DEV_LOG, local links, git diff --check, env/artifact ignored.
- [ ] Commit kết quả liên quan, review toàn branch theo cách owner chọn;
  sửa lỗi có ảnh hưởng, chạy lại kiểm tra tương ứng. Tích hợp/push dev, không main;
  ghi commit và giới hạn deploy/online. Dọn chỉ runtime/worktree QA do task tạo.

## Coverage và handoff

T1/T2 bao phủ dữ liệu/validation/API/transaction; T3/T4 client/form;
T5 list/detail/accessibility/navigation; T6 runtime/regression/rollout.
AC01–19 đều có task và kiểm chứng cụ thể ở trên. Đã tự rà signature/type,
field/label, năm Review Focus và giới hạn phạm vi; chưa có test nào chạy từ plan.
Khuyến nghị thực thi trực tiếp: các task phụ thuộc DTO/API/form của nhau,
một người giữ liền mạch context, sau đó review độc lập toàn branch.
Chờ owner review plan và chọn trực tiếp hoặc subagent trước implementation.
