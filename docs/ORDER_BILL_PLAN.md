# Order bill và form khách — kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.
> Thực hiện tuần tự trong phiên theo lựa chọn owner; checkbox ghi kết quả thật.

**Goal:** Hai tab đơn hàng và popup bill theo mẫu A, dọn UI cũ, rồi đưa SĐT
lên đầu form khách cùng cảnh báo trùng rõ ràng.

**Architecture:** Giữ OrderDetailPage, transaction/receipt và shipment snapshot.
Thêm mode khách trả bill riêng mã trả cước; tái sử dụng CustomerForm/duplicates.
Không tạo hệ thống invoice hay sổ thu tiền thứ hai.

**Tech Stack:** Angular21, Spring Boot, Spring JDBC/PostgreSQL; không dependency mới.

**Spec:** [ORDER_BILL_DESIGN](ORDER_BILL_DESIGN.md), duyệt18/11;
[ORDERS](ORDERS.md) và [CUSTOMERS](CUSTOMERS.md) cho hành vi không bị thay thế.

## Global Constraints

- Hai tab Chi tiết đơn / Tổng đơn cùng order ID; chỉ lưu bill, không ảnh/PDF.
- Chi tiết có Tiền sách, Tiền cọc, Tổng trọng lượng sách; giá chốt từng dòng giữ.
- Cuối tháng yêu cầu đã nhận đủ cả ship, COD0; không tự tạo PAYMENT.
- Ship nhập tay nguyên≥0, trống khác0; cân kiện nguyên>0, không buộc≥cân sách.
- Bỏ ghi mới CASH/discount; giữ nguyên lịch sử và tổng tiền legacy.
- Giữ OWNER/CSRF/version/requestId, tồn và keep14/trần30, xóa sách phải có lý do.
- Không bulk/J&T mapping, live migration, merge main hoặc deploy.
- Trùng SĐT là cảnh báo có xác nhận, không unique; SĐT vẫn optional.
- Dev là nhánh tích hợp; cập nhật log và tiến độ từng task; docs≤400 dòng.

## Review Focus

1. REFUND/VOID sau lưu bill làm thiếu tiền: chặn bàn giao Cuối tháng (Task1).
2. Bill cũ giảm giá/CASH/mode null: không sửa lịch sử, không tăng phải thu (Task1/3).
3. Ghi tiền khi đang soạn bill/409: giữ draft, rebase version và xác nhận lại (Task2).
4. Đổi đơn khi request cũ về: không ghi đè order/tab hiện hành (Task3).
5. Đổi SĐT nhanh/đóng mở modal/mạng lỗi: không hiển thị kết quả trùng cũ (Task4).

## Task1 — Contract backend và dữ liệu bill

**Files:** `code/backend/src/main/java/vn/memay/order/`:
`OrderDtos.java`, `OrderRepository.java`, `OrderShippingService.java`,
`OrderDraftService.java`, `OrderPaymentService.java`, `OrderMutations.java` nếu
audit whitelist cần cập nhật; migration `V37__order_customer_payment_mode.sql`
(kiểm lại số migration còn trống khi thực thi).
Tests trong `code/backend/src/test/java/vn/memay/order/`:
`OrderShippingTest.java`, `OrderPaymentTest.java`, `OrderDraftTest.java`,
`OrderMigrationTest.java`; sửa fixture constructor ShippingRequest liên quan.

**Interfaces:**
- Thêm `CustomerPaymentMode {RECIPIENT, MONTHLY}` và field `customerPaymentMode`
  vào OrderDetail/ShippingRequest; cột `orders.customer_payment_mode` nullable,
  CHECK chỉ2giá trị; snapshot JSON dùng cùng key. Legacy null không backfill.
- Giữ signatures finalizeOrder/updateShipping/resend/ship và MutationResult.
- Request mới finalize/resend/sửa bill phải có mode; tracking-only không cần.
- `shippingPaymentType` tiếp tục riêng, không suy ra từ mode khách trả bill.

- [ ] RED: tests mode MONTHLY, goods270000+fee30000/paid100000 bị từ chối;
  paid300000/COD0 thành công; COD>0 bị từ chối; RECIPIENT/COD200000 hợp lệ.
- [ ] RED: MONTHLY đã lưu rồi VOID/REFUND làm thiếu bị chặn khi ship; retry
  requestId không sinh thêm shipment/tồn/payment; STAFF403, stale version409.
- [ ] RED: CASH request mới bị từ chối; CASH cũ vẫn đọc; discount ghi mới bị
  từ chối, omitted giữ khoản cũ; legacy bill giữ tổng/declaredValue và snapshot.
- [ ] Chạy `mvn -Dtest=OrderShippingTest,OrderPaymentTest,OrderDraftTest,OrderMigrationTest test`
  tại `code/backend`; xác nhận fail đúng yêu cầu trước sửa, dùng DB QA cách ly.
- [ ] Implement migration/DTO/read mapping/snapshot; validate mode/COD/paid net
  ở apply và ship dưới order lock. Lấy tổng từ backend; không tin FE preview.
  Thêm mode vào audit dữ liệu không PII; bảo toàn replay receipt cũ.
- [ ] Loại CASH khỏi write validation. Với discountAmount trong API cũ, từ chối
  thay đổi khác giá trị hiện tại; không xóa field đọc/cột/receipt lịch sử.
- [ ] Chạy lại focused tests đến PASS; ghi log và commit backend.

## Task2 — Popup bill và ghi tiền

**Files:** `code/frontend/src/app/features/admin/orders/`:
`order-models.ts`, `order-shipping-form/order-shipping-form.{ts,html,spec.ts}`,
`order-detail/order-detail.{ts,html,spec.ts}`, `orders.scss`;
tạo `order-payment-form/order-payment-form.{ts,html,spec.ts}`.

**Interfaces:**
- FE `CustomerPaymentMode = 'RECIPIENT' | 'MONTHLY'`; read nullable legacy;
  ShippingDraft có mode; shipment snapshot field optional/null cho legacy.
- OrderShippingForm giữ open(order, mode), rebase(order), saved(ShippingDraft).
  Thêm `paymentRequested` output; giữ draft bill khi mở modal thu riêng.
- OrderPaymentForm `open(order: OrderDetail)`, `saved` output draft gồm
  transactionType/amount/paymentMethod/occurredAt/note/actualConfirmed;
  parent giữ gửi command, immutable retry và reload; modal không tự gọi API.
- PaymentMethod ghi mới chỉ BANK_TRANSFER/OTHER; loại transaction giữ3loại.

- [ ] RED: shipping-form tests COD gợi ý200000, chỉnh tay giữ; fee0 hợp lệ,
  fee trống sai; cân kiện1 hợp lệ; monthly ẩnCOD0/chặn thiếu, không phát PAYMENT.
- [ ] RED: detail/form tests mở thu từ bill giữ recipient/fee/cân; thu thành công
  rebase version/số dư, hủy xác nhận cũ;409 giữ draft, retry dùng payload cũ.
- [ ] Chạy `npm test -- --include='**/order-shipping-form.spec.ts' --include='**/order-detail.spec.ts'`
  tại `code/frontend`, xác nhận RED cho hành vi mới.
- [ ] Sửa modal bill theo mẫu; cân thực tế luôn dùng override=true nội bộ;
  ẩn trả cước/tracking/giảm giá. Lưu bill là xác nhận COD/cân tại version đang xem;
  sau rebase phải bấm lưu lại, không tự submit. Resend giữ phí thu thêm/lý do.
- [ ] Tách form thu modal, reuse field/validation/command; giữ actual refund và
  reason VOID. Modal busy/dirty/Escape/focus return và auth reset như hiện có.
- [ ] Ghi tiền xong lấy detail mới, quay lại draft bill; không cộng cọc hai lần,
  không âm thầm đổi COD đã nhập. Monthly đủ tiền mới cho lưu.
- [ ] Chạy tests focused gồm payment-form đến PASS; ghi log và commit.

## Task3 — Hai tab và dọn luồng cũ

**Files:** `order-detail/order-detail.{ts,html,spec.ts}`, `orders.scss`,
`order-values.ts` trong thư mục orders trên; fixture `order-api.spec.ts` nếu cần.

**Interfaces:** OrderDetailPage `activeTab: 'detail' | 'total'`,
`selectTab(tab: 'detail' | 'total'): void`; query `tab=total`, mặc định detail.
Back-list loại riêng param tab, giữ q/status/paging cũ; đổi tab không mutation.

- [ ] RED: chỉ3metric ở detail, item/keep/remove reason vẫn đủ; không discount
  hoặc CASH input; ledger collapsed; tổng bill và số dư ở total, nhãn tiếng Việt.
- [ ] RED: URL/back/refresh/route đổi đơn; finalize mở total; draft empty,
  reopened có ABORTED báo cần xuất lại; completed/failed/cancel xem lịch sử đúng.
- [ ] RED: legacy discount/CASH/null mode không bị gán0/đổi phương thức;
  draft edit customer/fulfillment vẫn dùng được sau bỏ discount control.
- [ ] Chạy focused order-detail tests, xác nhận RED; implement hai tab semantics
  keyboard/aria, từng nhóm action theo trạng thái; giữ guard request generations.
- [ ] Xóa template payment inline sau Task2, các metric/layout/handler/CSS chỉ
  phục vụ Giảm giá và tùy chọn cũ. Giữ edit thông tin còn dùng, returns/resend/
  tracking/cancel/keep và lịch sử; không xóa migration/receipt/ledger dữ liệu.
- [ ] Chạy focused tests PASS; rà tham chiếu trước xóa component/helper;
  ghi log và commit UI. Không giữ cả flow cũ lẫn mới sau chuyển đổi.

## Task4 — SĐT đầu form khách và kiểm trùng

**Files:** `code/frontend/src/app/features/admin/customers/customer-form/`
`customer-form.{ts,html,scss,spec.ts}`; `docs/CUSTOMERS.md`.
CustomerApi.duplicates(phone, excludeId?, page?, size?) và backend đã có, reuse.

**Interfaces:** giữ open/save/saved và confirmDuplicates; thêm signal
`duplicateLookupState: 'idle' | 'checking' | 'ready' | 'error'` và
`retryDuplicateLookup(): void`; reset/cancel theo vòng đời modal và auth.

- [ ] RED: phone đứng trước name, autofocus phone khi thêm; cảnh báo ngay dưới
  số, +84/0 cùng kết quả; ARCHIVED vẫn cảnh báo, edit bỏ chính mình, rỗng không gọi.
- [ ] RED: A→B chỉ render B; đóng/mở không nhận A; lỗi hiển thị retry thay vì
  “không trùng”; submit vẫn được backend kiểm,409 hiện hồ sơ để xác nhận lại.
- [ ] Chạy `npm test -- --include='**/customer-form.spec.ts'` xác nhận RED;
  di chuyển field+warning, giữ debounce300ms/switchMap, reset trạng thái/focus,
  thêm checking/error/retry có aria-live. Không tải tất cả khách để so trùng.
- [ ] Giữ nút Vẫn tạo khách mới/Vẫn lưu thay đổi; đổi số xóa xác nhận.
  Chạy focused tests PASS, cập nhật contract; commit sau phần order.

## Task5 — Hồi quy, review và bàn giao sạch

- [ ] `mvn test` tại backend với PostgreSQL QA riêng; `npm test`, `npm run build`,
  `npm run build:workers`, `npm run check:workers:proxy` tại frontend: PASS;
  báo riêng skipped và giới hạn, không tính prototype QA là application QA.
- [ ] Browser synthetic desktop/mobile390: keep→bill COD, ghi tiền→monthly,
  reopen→bill lại, fail/resend/return; khách tạo từ cả list và order, trùng/mạng lỗi;
  kiểm focus/Escape/dirty/409/refresh/back, không outer overflow. Không dữ liệu thật.
- [ ] Review diff cuối theo spec, quyền/tồn/tiền/legacy và xóa dead references;
  sửa vấn đề phát hiện rồi chạy lại kiểm tra chịu ảnh hưởng.
- [ ] Gộp quyết định đã thực thi vào ORDERS/CUSTOMERS; bằng chứng vào
  ORDER_VERIFICATION/CUSTOMER_VERIFICATION, cập nhật README/PROGRESS/DEV_LOG.
  Gỡ DESIGN/PLAN này khi đã chuyển đủ tiêu chí; không archive/để doc mâu thuẫn.
- [ ] `git diff --check`, kiểm link và Markdown≤400 (trừ DEV_LOG), kiểm env/artifact
  ignore; chỉ commit file scope, tích hợp/push dev, giữ main/deploy cho owner.
- [ ] Dừng QA/browser/server chỉ do task tạo; bàn giao commit, kết quả và giới hạn.
