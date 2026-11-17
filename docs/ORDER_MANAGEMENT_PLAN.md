# Order Management — Implementation Plan

> **For agentic workers:** dùng superpowers:executing-plans hoặc
> superpowers:subagent-driven-development theo cách owner chọn; thực thi từng task.

**Goal:** Quản lý đơn nội bộ theo spec owner duyệt17/11, có UI tham khảo đã lưu.
**Architecture:** Module order JDBC trong modular monolith; stock dùng catalogue
hiện có, khóa chung book_copy. Command transaction chứa version, receipt,
item/tiền/tồn và audit; Angular giữ form, dùng AdminHttp/CustomerForm hiện có.
**Tech Stack:** Angular21.2, Java21/Spring Boot4.1.1, PostgreSQL/Flyway, Vitest/JUnit.
**Spec:** [ORDER_MANAGEMENT_SPEC](ORDER_MANAGEMENT_SPEC.md), đã duyệt17/11/2026.
**Trạng thái:** thực thi tuần tự17/11; task1–6 đạt, bổ sung lý do xóa keep trước task7.

## Global constraints

- OWNER toàn bộ order GET/write; STAFF403, anonymous401; session/CSRF/no-store.
- API `/api/v1/admin/orders`; BIGINT ID JSON string; page0/size20/max100.
- Giá từng cuốn do admin nhập; khác giá cùng MM là các dòng riêng; không tự gộp.
- Keep trừ stock ngay, ship không trừ nữa; refund/return chỉ khi chủ xác nhận.
- Keep mặc định14ngày, trần30ngày từ đầu; ngày địa phương+N, hết ngày đó.
- Bill=goodsTotal+shippingFee; khai giá=goodsTotal; cọc100000 thuộc paidAmount.
- PP_CASH mặc định, một kiện/lần giao; tracking bắt buộc khi bàn giao→COMPLETED.
- Không public order/checkout, không Excel/API J&T, không sync livestream.
- Không thêm thư viện/framework/extension; giữ legacy variant UUID/tên/thứ tự.
- Tối đa1000item; quantity1..999999; unitPrice≤999999999999; tổng≤9007199254740991.
- Chưa deploy/migrate live; dev hoặc codex/ từ dev, tích hợp/push dev, không main.
- Đọc cùng spec, DATA/CUSTOMERS/CATALOGUE/DEPLOYMENT; log từng task, docs≤400dòng.

## Review focus

1. Response mất sau commit: retry cùng requestId không thêm tiền/trừ tồn — task2/6.
2. Editor sách cũ đua keep/return:409, không hồi sinh tồn đã trừ — task3/11.
3. Hai dòng cùng MM khác giá: tồn cộng đủ, tiền vẫn tách đúng — task4/5.
4. Gửi lại rồi đổi ý: abort về UNSUCCESSFUL, không tự hoàn tồn/tiền — task7/10.
5. DST/ranh tháng/leap day/đến trần: cộng ngày HCM, không reset khi reopen — task5.

## File map và interface chung

Đường dẫn dưới dùng prefix cố định (không phải module/package mới):
`B=code/backend/src/main/java/vn/memay`, `T=code/backend/src/test/java/vn/memay`,
`F=code/frontend/src/app/features/admin/orders`.

| File mới/chạm | Trách nhiệm |
|---|---|
| `code/backend/src/main/resources/db/migration/V34__orders.sql` | Schema additive; kiểm V34 còn trống trước tạo |
| `B/order/OrderDtos.java`, `OrderValidation.java`, `OrderRepository.java` | DTO/checked math/SQL parent+child |
| `B/order/OrderMutations.java` | Auth, requestId/fingerprint, lock/version/audit, response ổn định |
| `B/order/OrderDraftService.java`, `CatalogMatchService.java` | Draft/item/customer snapshot và MANUAL match |
| `B/order/OrderKeepService.java`, `OrderPaymentService.java` | Keep/reopen/cancel, ledger/refund/VOID |
| `B/order/OrderShippingService.java`, `OrderQueryService.java`, `OrderController.java` | Giao/hoàn/gửi lại, read/API |
| `B/catalogue/BookStockService.java`, `BookCopyRepository.java` | Khóa/sửa stock gộp; đọc JPA có khóa |
| `B/catalogue/BookCommandService.java`, `BookStatusService.java`, `BookTrashService.java` | Chung khóa/version; bảo vệ purge |
| `B/auth/SecurityConfiguration.java`, `B/audit/AuditService.java` | OWNER riêng và audit order an toàn |
| `T/support/OrderTestSupport.java`, `PgTestData.java` | Fixture synthetic, cleanup child trước parent |
| `T/order/Order*Test.java` theo tên từng task | Unit/PostgreSQL/API/concurrency |
| `F/order-models.ts`, `order-api.ts`, `order-values.ts`, `orders.scss` | Contract client/API/số-hiển thị/style |
| `F/order-list/order-list.{ts,html}`, `F/order-detail/order-detail.{ts,html}` | Bảng/chi tiết và create route dùng detail |
| `F/order-item-form/order-item-form.{ts,html,scss}` | CATALOG/MANUAL, giá từng cuốn, trùng tên |
| `F/order-shipping-form/order-shipping-form.{ts,html,scss}` | Người nhận/kiện/ship/COD/tracking/return |
| `code/frontend/src/app/app.routes.ts`, `layouts/admin-layout/admin-layout.html` | Route/owner guard/sidebar |
| `B/customer/CustomerDtos.java`, `CustomerRepository.java`, `CustomerService.java` | orderCount nullable/owner aggregate |
| `code/frontend/src/app/features/admin/customers/customer-{models,api}.ts` | Map số đơn owner, không thêm customer endpoint ghi |
| `code/frontend/src/app/features/admin/customers/customer-{list,detail}/` | Count/history owner, STAFF không đọc order |

DTO dưới thuộc OrderDtos, frontend mirror camelCase; toàn bộ field theo spec12.
`MutationMeta(Long version,UUID requestId)`; version null chỉ cho create.
`MutationResult(String id,String orderCode,long version,Status status)` là response
command ổn định, create201/còn lại200; FE GET detail sau thành công để lấy dữ liệu mới.
`OrderDetail`, `OrderSummary`, `OrderFilter`, `OrderStats`, `CatalogCandidate`,
`MatchConfirmation(normalizedTitle,fingerprint,reason)`, `Totals` là read/value DTO.
`ItemValue(Long unitPriceVnd,long quantity,Long unitWeightGrams)` và
`PaymentValue(PaymentType type,long amount,boolean voided)` là input math;
Totals gồm subtotal/goodsTotal/paidAmount, orderTotal/balance/totalBookWeightGrams
nullable khi chưa đủ dữ liệu, provisional flag. OrderDetail có totals/items/version/
status/keepUntil/shipments và serverNow từ Clock cho countdown (backend quyết định hạn).
Request=create/update/item/payment/shipping/return chỉ field whitelist của spec;
version/requestId là field phẳng trên wire, chuyển MutationMeta ở controller.

## Cách chạy kiểm tra trong mỗi task

Backend cwd `code/backend`: `mvn -q -Dtest=TEN_TEST test`; thay TEN_TEST bằng tên
class ngay trong task. RED phải là assertion/contract còn thiếu, GREEN exit0.
Frontend cwd `code/frontend`: `npm test -- --include=src/app/features/admin/orders/TEN.spec.ts`.
Nếu đổi test runner options, kiểm `ng test --help` tại máy trước, không đoán cờ mới.
Tất cả DB test dùng PostgreSQL cách ly tên **me_may_test**, env TEST_DB_URL,
DB_USER/DB_PASSWORD của instance QA; không source .env bán thật/không dùng Flyway CLI live.
CatalogueTestSupport/PgTestData đã xóa dữ liệu: phải xác minh đúng instance và
`current_database()` trước chạy. Không khởi động lại dịch vụ đang dùng chỉ để test.
Mỗi task giữ RED→code tối thiểu→GREEN→commit; không push phần chưa kiểm.

## Task 1 — Schema, validation và test fixture an toàn

**Files:** migration, OrderDtos/OrderValidation/OrderRepository, PgTestData,
OrderTestSupport; tests `T/order/OrderMigrationTest.java`, `OrderValidationTest.java`.
**Produces:** `OrderRepository.find(long id,boolean lock):Optional<OrderDetail>`;
`OrderValidation.totals(List<ItemValue>,long discount,Long shippingFee,List<PaymentValue>):Totals`;
`OrderValidation.keepUntil(Instant started,int days):Instant`, `normalizeTitle(String):String`.
- [x] RED: `totalsIncludeShippingNotDepositTwice` và missingShip/overflow/refund/NULLweight:
  `assertThat(totals.goodsTotal()).isEqualTo(600000);`
  `assertThat(totals.orderTotal()).isEqualTo(635000);`
  `assertThat(totals.balance()).isEqualTo(535000);` với subtotal650000/discount50000/ship35000/paid100000.
- [x] Chạy OrderValidationTest, xác nhận RED; thêm migration test migrate33→34
  giữ nguyên sách/khách/media/auth/variant, DH code concurrent duy nhất, CHECK/FK đúng.
- [x] Tạo7bảng spec12; không CASCADE lịch sử. Mã identity không MAX+1;
  reservation cho quantity0 khi đóng/hoàn hết hoặc xóa row có audit, không lưu ACTIVE0.
  `order_returns` lưu item CATALOG/MANUAL cùng xác nhận, không restock MANUAL.
- [x] Implement checked BigInteger, nullable shipping tổng tạm; SQL prepared;
  thêm fixture synthetic kế thừa CatalogueTestSupport, cleanup tables theo FK trước customer/books/admin.
- [x] Chạy hai test GREEN; commit `feat: add order schema and validated totals`.

## Task 2 — Command transaction, receipt, auth và audit

**Files:** OrderMutations, OrderRepository, AuditService/SecurityConfiguration;
tests `T/order/OrderMutationTest.java`, `OrderAccessTest.java`.
**Consumes:** DTO/repository task1; auth hiện có.
**Produces:** `OrderMutations.run(AdminUser,String operation,Long orderId,MutationMeta,Object payload,LongSupplier write):MutationResult`;
`AuditService.recordOrder(AdminUser,long id,String action,Map before,Map after,long version):void`.
- [x] RED `replayDoesNotRepeatWrite`: gọi cùng request2lần,
  `assertThat(second).isEqualTo(first); assertThat(writeCount.get()).isEqualTo(1);`.
  Thêm sameKeyDifferentPayload409, stale409, auditFailureRollsBack và replayAfterRoleRevoked403.
- [x] Chạy OrderMutationTest/OrderAccessTest để thấy RED.
- [x] Implement domain wrapper @Transactional: kiểm active OWNER trước replay;
  lock unique receipt trước order, lock order/version rồi callback, version+1 (create0),
  ghi safe numeric/ref metadata/audit/MutationResult cùng commit. Key gồm actor/
  operation/requestId; fingerprint normalized payload chứa orderId/version; replay
  trả response cũ, không trả OrderDetail hiện tại hoặc lưu payload PII trong receipt.
- [x] Thêm matcher OWNER `/orders` và `/orders/**` trước generic GET admin.
  Audit order không dùng catalogue FIELDS rồi mất dữ liệu, không mở allowlist PII;
  nested item diff chỉ refs/giá/qty/weight/status. Không public cache cho read order.
- [x] GREEN hai test; commit `feat: protect order mutations with receipts and audit`.

## Task 3 — Stock chung, phiên bản và vòng đời sách

**Files:** BookStockService/BookCopyRepository/BookCommandService/BookStatusService/
BookTrashService; tests `T/order/OrderStockConcurrencyTest.java`, `OrderPurgeTest.java`.
**Produces:** `BookStockService.lockAll(List<Long> ids):void` theo id tăng dần;
`adjust(long bookId,long delta,AdminUser actor):long` trả tổng còn bán;
`BookCopyRepository.findLockedById(Long):Optional<BookCopy>` với JPA PESSIMISTIC_WRITE.
- [x] RED `stockOneHasOneWinner`, `staleEditorCannotResurrectStock`:
  `assertThat(successCount).isEqualTo(1); assertThat(totalStock).isZero();`
  `assertThat(staleResponse.statusCode()).isEqualTo(409);` dùng barrier như CustomerConcurrencyTest.
- [x] Chạy test RED; thêm returnOverflowRollback, metadataOnlyPreservesRows,
  activeReservationBlocksTrash và referencedBookPurgeDoesNotBlockOtherExpiredBooks.
- [x] Implement delta bằng pooledRows hiện có, không delete/recreate variant;
  update availability/version/time và invalidate PublicCacheInvalidation sau commit.
  Mọi đường edit/legacy variants lấy cùng khóa trước đọc version/stock;
  JDBC order không đi qua command publish buộc ảnh; JPA không flush bản cũ đè JDBC.
- [x] Trash chặn ACTIVE; purge thủ công409 khi có order ref; scheduled purge
  bỏ qua sách có ref để không rollback cả100sách hoặc lặp mãi chỉ các sách bị chặn.
- [x] GREEN tests + BookVariantIntegrationTest/BookEntryContractTest/BookTrashApiTest;
  commit `feat: serialize order stock with catalogue writers`.

## Task 4 — Draft, item và tra sách tương tự

**Files:** OrderDraftService/CatalogMatchService/OrderRepository;
tests `T/order/OrderDraftTest.java`, `OrderCatalogMatchTest.java`.
**Produces:** `create(CreateRequest,AdminUser):MutationResult`,
`update(long,UpdateRequest,AdminUser)`, `addItem(long,ItemRequest,AdminUser)`,
`updateItem(long,long,ItemRequest,AdminUser)`, `removeItem(long,long,ReasonRequest,AdminUser)` →MutationResult;
`CatalogMatchService.find(String title):List<CatalogCandidate>`.
- [x] RED `sameBookDifferentPricesStaySeparate`:
  `assertThat(detail.items()).hasSize(2); assertThat(detail.totalQuantity()).isEqualTo(2);`
  giá120000/150000, customer ACTIVE, sáchẨn, null catalogue price bắt nhập giá cụ thể.
- [x] Chạy RED; test MANUAL refs NULL, archived customer reject, đổi khách có tiền409,
  source snapshot bất biến, title changed làm mất match-confirm, backend phát hiện kết quả mới.
- [x] Implement services qua task2, create chưa trừ stock. Lock customer khi chọn;
  kiểm thuộc order/itemId, tối đa1000, quantity/weight/price đúng miền và capacity.
- [x] Match không dependency: SQL normalize NFD/lower/đ→d/bỏ combining marks/
  gộp whitespace, loại trash; exact đứng đầu. Fuzzy lấy≤200candidate theo prefix
  3ký tự từng token hoặc substring title, thứ tự shared-prefix/độ lệch chiều dài/id;
  Java Levenshtein normalized≥0.8, trả tối đa5, fingerprint(sorted id/version,title).
  Test `Hary Poter`→`Harry Potter`, không dấu/case, exact Ẩn/hết tồn; ghi ceiling
 200candidate, không hứa phát hiện mọi biến thể tên hoặc tải catalogue về browser.
- [x] GREEN tests; commit `feat: add priced order items and manual match confirmation`.
- [ ] Bổ sung user17/11: xóa/giảm quantity KEEPING bắt reason; snapshot item/số bỏ
  trong private history, thiếu/trắng400 không đổi tồn; UI/API cũng phải kiểm.

## Task 5 — Keep, gia hạn, reopen và hủy trước gửi

**Files:** OrderKeepService/OrderDraftService; test `T/order/OrderKeepTest.java`.
**Consumes:** task2 wrapper, task3 stock, task4 items; ledger đọc từ task1.
**Produces:** `keep(long,KeepRequest,AdminUser)`, `extend(long,ExtendRequest,AdminUser)`,
`reopen(long,ReasonRequest,AdminUser)`, `cancel(long,ReasonRequest,AdminUser)` →MutationResult.
- [x] RED `keepDeductsOnceAndDoesNotExtendOnAdd`:
  `assertThat(stockAfterKeep).isEqualTo(stockBefore-2);`
  `assertThat(afterAdd.keepUntil()).isEqualTo(first.keepUntil());`.
- [x] Chạy RED; Clock fixture16/11/2026: mặc định hết30/11, trần hết16/12;
  thêm leap/end-month, vượt trần400, shortage rollback toàn đơn, cọc100000/
  owner thiếu cọc có lý do, gia hạn quá hạn nhưng không vượt trần, hết hạn không auto-release.
- [x] Implement giữ/reservation cấp book và cộng các dòng cùng MM. Thêm/giảm/xóa
  item KEEPING điều chỉnh delta, không dùng toàn quantity trừ lại. Đủ giá/weight
  mới keep; lý do/time/actor do server; sửa item không đổi keepStartedAt.
- [x] Reopen KEEP giữ reserve/hạn; IMMEDIATE về draft hoàn phần ACTIVE và cảnh báo;
  chỉ trước lần giao đầu. Cancel hoàn phần ACTIVE một lần, không tự refund.
- [x] GREEN test + OrderStockConcurrencyTest; commit `feat: implement keep and pre-shipment cancellation`.

## Task 6 — Sổ tiền, hoàn thực tế và VOID

**Files:** OrderPaymentService/OrderRepository; test `T/order/OrderPaymentTest.java`.
**Produces:** `record(long,PaymentRequest,AdminUser):MutationResult`,
`voidPayment(long,long paymentId,ReasonRequest,AdminUser):MutationResult`.
- [ ] RED `depositPlusShippingBalance`/`refundRequiresActualConfirmation`:
  `assertThat(detail.totals().balance()).isEqualTo(430000);`
  với goods500000/ship30000/deposit100000; đổi status không tự tạo REFUND/PAYMENT.
- [ ] Chạy RED; test multiple/partial/overpaid/0/overflow, refund>received400,
  VOID nhận tiền làm refund vượt nhận bị chặn, nhập sai giữ dấu vết, reason bắt buộc.
- [ ] Implement ledger dương/actor/time/method và actualConfirmed cho REFUND;
  không tự quyết giữ cọc/hoàn hết. Order đã hủy chỉ refund/VOID hợp lệ, không nhận mới.
  Changes balance đặt codNeedsReview cho lần giao chưa bàn giao; replay chống thu hai lần.
- [ ] Chạy GREEN + OrderMutationTest; commit `feat: record actual payments refunds and corrections`.

## Task 7 — Chốt giao, hoàn tất, gửi lại và hoàn đơn

**Files:** OrderShippingService/OrderRepository;
tests `T/order/OrderShippingTest.java`, `OrderReturnTest.java`.
**Produces:** `finalizeOrder(long,ShippingRequest,AdminUser)`, `ship(long,ShipRequest,AdminUser)`,
`updateShipping(long,ShippingRequest,AdminUser)` cho PATCH shipping,
`fail(long,ReasonRequest,AdminUser)`, `resend(long,ShippingRequest,AdminUser)`,
`abortResend(long,ReasonRequest,AdminUser)`, `returnOrder(long,ReturnRequest,AdminUser)` →MutationResult.
- [ ] RED `handoffCompletesWithoutMarkingPaid`:
  `assertThat(result.status()).isEqualTo(Status.COMPLETED);`
  `assertThat(after.totals().paidAmount()).isEqualTo(before.totals().paidAmount());`
  `assertThat(stockAfter).isEqualTo(stockBefore);`.
- [ ] Chạy RED; test finalize thiếu phone/address/weight/ship, overrideReview,
  declaredValue excludes ship, COD0 hợp lệ, đổi ship/payment/refund buộc review,
  tracking bắt buộc, snapshot khác lần giao, invalid transition409.
- [ ] Implement finalize lần đầu trừ draft/giữ ACTIVE keep; một PLANNED shipment,
  fee/COD/recipient/weight snapshot; PP_CASH/EXPRESS/parcel1, không cộng ship hai lần.
  PATCH shipping: READY review field/kiện/COD; COMPLETED chỉ sửa tracking có lý do,
  không sửa fee/recipient/weight của lần đã bàn giao, không đè lịch sử lần trước.
- [ ] Ship consume ACTIVE lần đầu, CONSUMED giữ nguyên ở resend; COMPLETED
  không đợi delivery hoặc paid. Fail chỉ ghi owner/time/reason, không hoàn gì.
  Resend dùng CONSUMED chưa return, snapshot mới/tracking mới; phụ phí chỉ
  tăng charge đúng phần owner nhập thu thêm, review COD; abort về UNSUCCESSFUL.
- [ ] Return nhận từng item0..quantity, nhập lại chỉ CATALOG thực nhập;
  0≤quantityRestocked≤quantityReceived≤quantity; vượt trả400, không đổi stock.
  đồng thời lưu phần không restock/lý do, đóng CANCELLED; retry không cộng lại,
  audit lỗi rollback; sau đóng không resend; refund qua task6 độc lập.
- [ ] GREEN tests + stock/mutation/payment tests; commit `feat: complete orders on handoff and handle manual returns`.

## Task 8 — API/read model và tích hợp khách hàng

**Files:** OrderController/OrderQueryService/OrderRepository + customer DTO/service/repository;
tests `T/order/OrderApiTest.java`, `OrderPrivacyTest.java`, CustomerIntegrationTest.
**Produces:** `list(OrderFilter,AdminUser):Page<OrderSummary>`, `stats(OrderFilter,AdminUser):OrderStats`,
`detail(long,AdminUser):OrderDetail`; list/catalog/match/read và command endpoints theo spec13.
- [ ] RED `ownerPagesStaffSeesNoOrderData`: assert OWNER200, STAFF403/anonymous401,
  no-store, page20/max100, same filters stats/count toàn bộ kết quả không chỉ page.
- [ ] Chạy RED; test mã/tên/phone/customerId/date range bao gồm ngày đến bằng
  exclusive next-day HCM; wildcard literal, unknown fields400, cross-order id404,
  DELETE JSON ReasonRequest version/requestId/reason (AdminHttp hỗ trợ body).
- [ ] Wire DTO/action whitelist; map lỗi spec, không PATCH status thường. GET
  catalog không lộ trash, lookup không dựa publication public; detail không live-join
  customer/book để dựng snapshot cũ. Catalog/match paging server, match tối đa5.
- [ ] customer orderCount nullable: OWNER count status KEEPING/READY/COMPLETED,
  STAFF null, một aggregate join không N+1; owner history dùng order list customerId,
  STAFF không query order hay trả count qua customer. Giữ API customer ghi hiện có.
- [ ] GREEN tests + toàn bộ Customer*Test; commit `feat: expose owner-only order APIs and customer history`.

## Task 9 — Client contract, danh sách và chọn/tạo khách

**Files:** F/order-models.ts/order-api.ts/order-values.ts/orders.scss/order-list/*;
app.routes.ts, admin-layout.html; tests `F/order-api.spec.ts`, `order-list/order-list.spec.ts`.
**Produces:** OrderApi `list/detail/stats/catalog/matches/create` và command methods
mirror task8, Observable<MutationResult>; `OrderList.canLeave():boolean`.
- [ ] RED HTTP specs assert /api/v1/admin/orders, version/requestId giữ nguyên
  khi retry; list spec assert query stale không đè kết quả mới, stats backend,
  OWNER menu/guard và STAFF không phát request; tiền ship chưa biết hiện tạm tính.
- [ ] Chạy hai Vitest file RED. Implement AdminHttp (transferCache:false), ID string,
  immutable mutation draft requestId cho retry; lỗi0/500 giữ payload/key đến khi rõ
  kết quả, không tự sinh key mới vì network timeout hoặc retry CSRF nội bộ.
- [ ] UI theo ảnh order-list: heading/Tạo đơn, metrics, search/filter/table,
  pagination/back query; đủ cột spec có thể scroll ngang, không lược field theo ảnh.
  Dùng style admin hiện có; không tạo ảnh/font/library mới. Create mở route /orders/new.
  “Sắp hết hạn” trong ảnh là cảnh báo của KEEPING, không tạo status mới.
- [ ] Route requireOwner trước load; list busy/empty/error, URL filter không PII
  ngoài q được phép; epoch auth clear dữ liệu. GREEN; commit `feat: add owner order list and API client`.

## Task 10 — Chi tiết keep, item, tiền, giao/hoàn và lịch sử khách

**Files:** F/order-detail/*, order-item-form/*, order-shipping-form/*;
customer models/api/list/detail hiện có; tests trong từng thư mục component `.spec.ts`.
**Produces:** `OrderDetailPage.canLeave():boolean`; form outputs typed request,
detail gọi OrderApi rồi reload, không dùng MutationResult cũ ghi đè detail mới.
- [ ] RED UI tests: hai dòng cùng MM khác giá, MANUAL qty2/unit75000/250g→
  `expect(totalPrice()).toBe(150000); expect(totalWeight()).toBe(500);`;
  CustomerForm.saved chọn id ngay, archived bị chặn, có KEEPING cho chọn/thêm hoặc tạo.
- [ ] Chạy test RED; test debounce350ms/confirmation title, snapshot grams,
  mất weight, dirty/Escape/focus, version409 giữ draft, retry cùng requestId.
- [ ] Implement ảnh keep-detail: code/customer/badge, progress hạn đang dùng
  (không âm/vượt100%), text quá hạn, extend có lý do/trần; money/cọc/ledger,
  item list source/quantity/giá cụ thể/gram, CTA thêm/kết thúc keep/chốt giao.
  Không copy số dư/dates/nút disabled hoặc tên/SĐT trong ảnh làm logic/fixtures.
- [ ] Item form theo ảnh MANUAL, dùng VndInput hiện có không làm tròn nghìn;
  CATALOG có tìm/mã/ảnh/giá tham khảo→nhập giá chốt, MANUAL confirm với backend.
  Xóa/giảm KEEPING mở form reason bắt buộc, giữ form khi400 và hiển thị history.
- [ ] Shipping form nhận recipient/fee/weight/COD PP_CASH; preview tổng có ship,
  khai giá không ship; xác nhận tracking và handoff. Hoàn tất vẫn hiện tiền còn thu;
  fail/resend/abort/return/refund có confirm/lý do, lượng thực nhập và lịch sử mã.
- [ ] Owner customer count/history thật, STAFF ẩn order section/count, giữ quyền
  customer hiện có; empty history chỉ khi API0, không che lỗi thành không có đơn.
- [ ] GREEN toàn bộ specs order/customer/layout/route; commit `feat: add complete order administration workflow`.

## Task 11 — Kiểm hồi quy, browser và bàn giao

**Files:** tests bổ sung tại lớp sở hữu nếu phát hiện lỗi; docs chuẩn/bằng chứng.
**Consumes:** tất cả task trước; không thêm tính năng ngoài spec khi QA.
- [ ] Chạy `mvn -q test` tại backend với PostgreSQL QA cách ly; ghi tổng/skip/thất bại,
  tất cả test concurrency/ledger/receipts/audit/privacy/migration phải thực chạy.
- [ ] Tại frontend chạy `npm test`, `npm run build`, `npm run build:workers`,
  `npm run check:workers:proxy`; exit0, không nới budget hoặc bỏ test để đạt.
- [ ] Browser QA dữ liệu synthetic OWNER: create inline customer,2nguồn giá từng
  cuốn, keep→thêm/gia hạn/reopen/cancel; finalize→ship→fail→resend→abort→return;
  partial/overpaid/VOID/actualRefund, expired/cọc ngoại lệ, server error/conflict.
- [ ] STAFF direct URL/API403 + customer không leak order; anonymous401/CSRF403;
  public Home/detail/sale/wishlist sau keep/return, snapshot/SEO/cache, desktop1440/
  tablet1024/mobile390, keyboard/dialog focus/dirty/long text/no outer overflow.
- [ ] Kiểm restart/retry mất response và race editor stock trên2session; so DB
  counts trước/sau; purge có ref không giết job; screenshot/trace không PII thật.
- [ ] Rà diff độc lập cuối theo requesting-code-review, sửa Important rồi kiểm
  lại đúng khu vực. Ghi VERIFICATION/DEV_LOG/PROGRESS; hợp nhất contract vào tài
  liệu chuẩn, chỉ xóa spec/plan khi đã chuyển đủ AC và hết vai trò.
- [ ] Commit/push dev; giữ2hero deletions ngoài phạm vi. Backup/restore/rollout live
  theo DEPLOYMENT là gate riêng chưa thực hiện; owner merge main/deploy.

## Self-review và bước thực thi

- Spec1–2/12→task1–3;3/8/9→task3/5/7;4/13→task2/8/9;
  5/6→task4/10;7/10→task1/6;11→task7/10;14/15→task9–11.
- Typed interfaces/service names/MutationResult dùng nhất quán; read detail sau
  mutation tránh response replay cũ đè UI; không cần workflow framework/extension.
- Kiểm năm Review focus đều có test task tương ứng; chưa chạy runtime checks.
- Owner duyệt Native/tuần tự17/11; thực thi không check-in giữa task, ledger
  riêng ở .superpowers/sdd/ORDER_MANAGEMENT_PLAN; fresh review cuối trước tích hợp.
