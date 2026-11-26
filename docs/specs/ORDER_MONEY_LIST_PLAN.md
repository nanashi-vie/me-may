# Nhận tiền có ảnh bill, gộp hoàn đơn, bảng danh sách đơn — plan triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nhận cọc/Hoàn tiền bắt buộc 1 ảnh bill, bỏ UNSUCCESSFUL và gửi lại, bảng `/admin/orders` 6 tab 9 cột.

**Architecture:** Backend `vn.memay.order` thêm `PaymentProofStore` (file private dưới root LOCAL)
và đổi `POST /payments` sang multipart; migration V39 dọn dữ liệu thử. Frontend tách popup tiền
thành component riêng, gỡ luồng gửi lại, viết lại bảng danh sách. Hai commit trên `dev`.

**Tech Stack:** Spring Boot + JDBC + Flyway + PostgreSQL; Angular standalone signals; Vitest/Karma theo `npm test`.

**Spec:** [ORDER_MONEY_LIST](ORDER_MONEY_LIST.md) — người thực thi đọc cả spec.

## Global Constraints

- Làm trên `dev` (hoặc branch `claude/` từ `dev`); không push `main`. Không dependency mới.
- Backend test chỉ trên `me_may_test`: `bash code/backend/run-local.sh -B -ntp test -Dtest=<Class>` từ root.
  Nếu `8080` của owner đang chạy từ `target/classes`, chạy từ bản sao ở scratchpad (như ORDER-LIST-TABS-01).
- Frontend: từ `code/frontend` chạy `npm test`, `npm run build`. `orders.scss` sát budget 6 kB: style mới để ở file riêng.
- Ảnh bill: JPEG/PNG, ≤ 10 MiB (`ImageValidator.MAX_BYTES`), ≤ 25.000.000 pixel, đúng 1 file/giao dịch.
- Nhãn: "Nhận cọc", "Hoàn tiền", "Ảnh bill chuyển khoản", "Hoàn đơn", "Đang đóng gói", "Đã cọc", "Không có ảnh".
- Tiền COD không ghi giao dịch. `paidAmount` = DEPOSIT − REFUND chưa VOID.
- Không ghi secret, ảnh bill, nội dung khách vào log/DEV_LOG.

## Review Focus

1. Gửi lại cùng `requestId` sau khi mạng rớt lúc upload → không tạo giao dịch/file thứ hai (Task 2 test `replaySameProofReturnsSameResultWithoutSecondFile`).
2. File đổi đuôi `.png` nhưng không phải ảnh, hoặc PNG 0 byte → 415, không còn file trên đĩa (Task 2 `rejectsFakeImageAndLeavesNoFile`).
3. Ghi DB lỗi sau khi file đã lưu (vd. refund vượt số giữ) → file bị xóa (Task 2 `failedWriteRemovesStoredProof`).
4. Đọc ảnh bằng `paymentId` của đơn khác → 404, không lộ ảnh (Task 2 `proofOfOtherOrderIs404`).
5. Bấm Enter khi focus đang ở nút ⋮ hoặc menu → không mở đơn (Task 7 `enterOnMenuDoesNotOpenOrder`).

## File Structure

| File | Trách nhiệm |
|---|---|
| `code/backend/src/main/resources/db/migration/V39__order_payment_proofs.sql` | Dọn PAYMENT/UNSUCCESSFUL, bỏ `payment_method`, thêm cột proof |
| `code/backend/src/main/java/vn/memay/order/PaymentProofStore.java` (mới) | Lưu/đọc/xóa file ảnh bill private |
| `.../order/OrderPaymentService.java`, `OrderController.java`, `OrderDtos.java` | Multipart record, GET proof, DTO |
| `.../order/OrderShippingService.java`, `OrderKeepService.java` | Hoàn đơn từ COMPLETED; gỡ fail/resend/abort |
| `.../order/OrderQueryService.java`, `OrderTrashService.java` | Nhóm tab, stats, `customerChannel`; xóa file khi purge |
| `code/frontend/.../orders/order-payment-dialog/*` (mới) | Popup Nhận cọc/Hoàn tiền có chọn ảnh |
| `code/frontend/.../orders/order-detail/*` | Hai nút tiền, lịch sử có ảnh, Hoàn đơn, gỡ gửi lại |
| `code/frontend/.../orders/order-list/*` | 6 tab, bảng 9 cột, dòng bàn phím, menu ⋮, badge |

---

## Phần 1 — Nhận tiền và trạng thái (commit 1)

### Task 1: Migration V39 và thu gọn enum/DTO

**Files:**
- Create: `code/backend/src/main/resources/db/migration/V39__order_payment_proofs.sql`
- Modify: `code/backend/src/main/java/vn/memay/order/OrderDtos.java` (enum `Status`, `PaymentType`, `OrderPayment`, `OrderStats`, `PaymentRequest`), `OrderRepository.java:21`
- Test: `code/backend/src/test/java/vn/memay/order/OrderMigrationTest.java`

**Interfaces:**
- Produces: `enum PaymentType {DEPOSIT,REFUND}`; `enum Status {DRAFT,KEEPING,READY_TO_SHIP,COMPLETED,CANCELLED}`;
  `record OrderPayment(String id,PaymentType transactionType,long amount,Instant occurredAt,String note,String createdBy,Instant createdAt,Instant voidedAt,String voidReason,boolean hasProof)`;
  `record PaymentRequest(Long version,UUID requestId,PaymentType transactionType,Long amount,String note,Boolean actualConfirmed)`;
  `OrderStats` bỏ `unsuccessful`. Cột mới `order_payments.proof_key/proof_mime/proof_bytes/proof_sha256`.

- [ ] **Step 1: Viết test đỏ `v39MergesPaymentsAndClosesUnsuccessful`** theo mẫu `addsOrdersWithoutChangingBooksOrCustomers`:
  migrate `target("38")`, chèn 1 đơn UNSUCCESSFUL có shipment FAILED và 3 payment (DEPOSIT/PAYMENT 200000/REFUND, method BANK_TRANSFER/CASH/OTHER), migrate `target("39")`.
  Assert: đơn `status='COMPLETED'`, shipment vẫn `FAILED`; không còn `transaction_type='PAYMENT'`; tổng DEPOSIT−REFUND không đổi;
  cột `payment_method` không tồn tại (`information_schema.columns`); insert `transaction_type='PAYMENT'` hoặc `status='UNSUCCESSFUL'` ném
  `DataIntegrityViolationException`; 3 dòng có `proof_key is null`.
- [ ] **Step 2: Chạy** `bash code/backend/run-local.sh -B -ntp test -Dtest=OrderMigrationTest` → FAIL (chưa có V39).
- [ ] **Step 3: Viết V39**: UPDATE PAYMENT→DEPOSIT; UPDATE orders UNSUCCESSFUL→COMPLETED; drop/re-add CHECK của `transaction_type` và `status` (tra
  tên constraint trong V34); `DROP COLUMN payment_method`;
  `ADD proof_key VARCHAR(200), proof_mime VARCHAR(16), proof_bytes INTEGER, proof_sha256 CHAR(64)`, CHECK cả 4 cùng null hoặc cùng có giá trị.
- [ ] **Step 4: Sửa DTO/enum/mapper** theo Interfaces; `OrderRepository.payments` đọc `proof_key is not null` thành `hasProof`. Sửa mọi chỗ compile lỗi
  (`OrderDtos` group ACTION bỏ `'UNSUCCESSFUL'`, stats SQL bỏ cột `unsuccessful`, `reviewCod` bỏ `'UNSUCCESSFUL'`).
  `fail`, `resend`, `abortResend` dựa vào `Status.UNSUCCESSFUL` nên xóa luôn 3 method này và 3 mapping controller ở bước này; Task 3 chỉ sửa `returnOrder`.
- [ ] **Step 5: Chạy** `OrderMigrationTest` → PASS. Chạy cả gói order `-Dtest='Order*Test'`; test đỏ do PAYMENT/resend sẽ sửa ở Task 2–3, ghi danh sách lại.

### Task 2: Lưu ảnh bill và API multipart

**Files:**
- Create: `code/backend/src/main/java/vn/memay/order/PaymentProofStore.java`, `code/backend/src/test/java/vn/memay/order/OrderPaymentProofApiTest.java`
- Modify: `OrderPaymentService.java`, `OrderController.java:40`, `OrderTrashService.java` (purge),
  `code/backend/src/test/java/vn/memay/support/OrderTestSupport.java`, `OrderPaymentTest.java`, `OrderPurgeTest.java` và các test đang gọi
  `payments.record`
- Test: `OrderPaymentProofApiTest`, `OrderPaymentTest`, `OrderPurgeTest`

**Interfaces:**
- Consumes: Task 1 `PaymentRequest`, cột proof.
- Produces:
  - `@Component PaymentProofStore(@Value("${memay.media.local.root}") String root, ImageValidator validator)`; thư mục `root/private/payment-proofs`.
  - `record Proof(String key,String mime,int bytes,String sha256)`; `Proof store(byte[] bytes)` (validate → ghi tạm → `ATOMIC_MOVE` thành
    `<uuid>.jpg|png`); `byte[] read(String key)`; `void delete(String key)` (bỏ qua file không tồn tại).
  - `static String sha256(byte[] bytes)`.
  - `MutationResult OrderPaymentService.record(long id, PaymentRequest r, byte[] proof, AdminUser actor)`.
  - `ResponseEntity<byte[]> OrderController.proof(Authentication a, long id, long paymentId)` tại `GET /{id}/payments/{paymentId}/proof`.
  - Test helper `OrderTestSupport.PNG` (byte[] PNG 1×1 hợp lệ) và `MutationResult deposit(long id,long version,long amount)`.

- [ ] **Step 1: `OrderTestSupport`** thêm `@DynamicPropertySource` đặt `memay.media.local.root` vào `@TempDir`-tương đương (thư mục tạm tĩnh tạo bằng
  `Files.createTempDirectory`), hằng `PNG`, helper `deposit`.
- [ ] **Step 2: Viết test đỏ trong `OrderPaymentProofApiTest`** (gọi HTTP qua `AdminHttpClient` như các ApiTest khác):
  - `recordsDepositWithOneProof`: multipart `payment` JSON + `proof` PNG → 200; detail có 1 payment `hasProof=true`; đúng 1 file trong thư mục.
  - `missingProofIs400` (fieldErrors có `proof`), `twoFilesIs400`, `paymentTypeIs400` (`transactionType:"PAYMENT"` → 400).
  - `rejectsFakeImageAndLeavesNoFile`: bytes `"not an image"` tên `a.png` → 415, thư mục rỗng.
  - `replaySameProofReturnsSameResultWithoutSecondFile`; `sameRequestDifferentProofIs409` (`idempotency_conflict`).
  - `failedWriteRemovesStoredProof`: REFUND vượt số đang giữ → 400/409, thư mục rỗng.
  - `ownerReadsProofWithPrivateHeaders`: GET → 200, `Content-Type: image/png`, `Cache-Control` chứa `no-store`, `X-Content-Type-Options: nosniff`, body = PNG.
  - `staffIs403AnonymousIs401`, `proofOfOtherOrderIs404`, `paymentWithoutProofIs404` (dòng cũ chèn bằng SQL).
  - `oversizedRequestIs413NotServerError`: file 11 MiB → 400 hoặc 413, không 500.
- [ ] **Step 3: Chạy** `-Dtest=OrderPaymentProofApiTest` → FAIL.
- [ ] **Step 4: Cài đặt.** Controller: `@PostMapping(value="/{id}/payments", consumes=MULTIPART_FORM_DATA_VALUE)` với `@RequestPart("payment")
  JsonNode` + `@RequestParam(value="proof",required=false) List<MultipartFile>`; số file ≠ 1 → `AdminApiException.field("proof","Chọn đúng 1 ảnh bill
  chuyển khoản")`.
  Service: fingerprint dùng payload `Map.of("payment",r,"proofSha256",sha256(bytes))`; store file **trong** write lambda chỉ khi không phải replay;
  đăng ký `TransactionSynchronization.afterCompletion` xóa file khi rollback.
  `occurred_at` = `db.clock.instant()`. Bỏ kiểm `paymentMethod`. GET proof kiểm owner (`mutations.requireOwner` tương đương), payment thuộc đơn, `proof_key` khác null.
  Handler `MaxUploadSizeExceededException` → 413 `image_too_large` (kiểm xem `GlobalExceptionHandler`/tương đương đã có chưa trước khi thêm).
- [ ] **Step 5: Purge** — trong `OrderTrashService` lấy `proof_key` của đơn trước khi `delete from order_payments`, xóa file trong `afterCommit`; lỗi
  IO chỉ log mã lỗi. Test `OrderPurgeTest.purgeDeletesProofFilesAfterCommit` và `voidKeepsProof` (VOID xong file vẫn còn, GET vẫn 200).
- [ ] **Step 6: Sửa test cũ** gọi `payments.record` sang helper `deposit`/signature mới; `PaymentType.PAYMENT` → `DEPOSIT`; xóa `rejectsNewCashReceipt`.
- [ ] **Step 7: Chạy** `-Dtest='Order*Test'` → PASS trừ test resend/fail (Task 3).

### Task 3: Hoàn đơn từ Hoàn tất

**Files:**
- Modify: `OrderShippingService.java:57-74` (`returnOrder`), `OrderKeepService.java` (`everShipped` nếu cần), `OrderQueryService.java` (customer history loại trạng thái cũ)
- Test: `OrderReturnTest.java`, `OrderShippingTest.java`, `OrderApiTest.java`

**Interfaces:**
- Consumes: `ReturnRequest` hiện có (giữ nguyên field).
- Produces: `POST /{id}/return` nhận đơn `COMPLETED`; `/fail`, `/resend`, `/abort-resend` trả 404/405.

- [ ] **Step 1: Test đỏ** `OrderReturnTest.returnFromCompletedMarksShipmentFailedAndRestocksOnce`: đơn ship xong → return (1 dòng CATALOG nhận 1, nhập 1) →
  status CANCELLED, `returns` có 1 dòng, shipment cuối `FAILED` với `failure_reason` = lý do, tồn +1; replay cùng request không +1 nữa; `paidAmount` không đổi.
  `returnRejectsDraftKeepingReady` (409). `OrderApiTest.removedEndpointsAreGone`: POST `/fail`, `/resend`, `/abort-resend` → 404 hoặc 405.
- [ ] **Step 2: Chạy** `-Dtest='OrderReturnTest,OrderApiTest'` → FAIL.
- [ ] **Step 3: Sửa `returnOrder`**: điều kiện `d.status()==Status.COMPLETED&&everShipped(d)`; trong cùng write cập nhật shipment HANDED_OVER gần nhất
  → FAILED (`failed_at/failed_by/failure_reason`) như code `fail` cũ.
- [ ] **Step 4: Xóa test resend/fail cũ** (`failedResendAndAbortKeepStockMoneyAndWaybillHistory`, `actualReturnRestocksOnceAndCannotResendClosedOrder`
  viết lại thành bản COMPLETED) và mọi helper resend trong `OrderShippingTestSupport`.
- [ ] **Step 5: Chạy** `bash code/backend/run-local.sh -B -ntp verify` → toàn bộ PASS.

### Task 4: Frontend popup tiền và lịch sử có ảnh

**Files:**
- Create: `code/frontend/src/app/features/admin/orders/order-payment-dialog/order-payment-dialog.{ts,html,scss,spec.ts}`
- Modify: `order-api.ts`, `order-models.ts`, `order-detail/order-detail.{ts,html,spec.ts}`, `order-shipping-form/*` (sự kiện `paymentRequested`), `core/auth/admin-http.ts` chỉ nếu cần
- Test: `order-payment-dialog.spec.ts`, `order-detail.spec.ts`, `order-api.spec.ts`

**Interfaces:**
- Consumes: API Task 2.
- Produces:
  - `type PaymentType = 'DEPOSIT' | 'REFUND'`; `OrderPayment` bỏ `paymentMethod`, thêm `hasProof: boolean`.
  - `OrderApi.recordPayment(id: string, body: {transactionType: PaymentType; amount: number; note: string; actualConfirmed?: boolean; version: number;
    requestId: string}, proof: File): Observable<MutationResult>` — `FormData` part `payment` là `Blob` JSON `application/json`, part `proof`; gửi qua
    `AdminHttp.upload` và lấy `HttpResponse.body`.
  - `OrderApi.proofUrl(id: string, paymentId: string): string` → `/api/v1/admin/orders/{id}/payments/{paymentId}/proof`.
  - `OrderPaymentDialog` inputs `order: OrderDetail`, `type: PaymentType`; output `saved: MutationResult`, `closed: void`; method `open()`.

- [ ] **Step 1: Test đỏ dialog**: tiêu đề "Nhận cọc"/"Hoàn tiền"; không có select loại/phương thức, không có ô thời điểm; Xác nhận disabled khi thiếu số tiền hoặc ảnh;
  chọn file `image/gif` hoặc > 10 MiB → lỗi tại ô, không gọi API; chọn PNG hiện ảnh xem trước (`URL.createObjectURL`, thu hồi khi đóng); submit gọi `recordPayment` đúng body + file;
  lỗi 409/mạng giữ số tiền, ghi chú, file và dùng lại `requestId` khi thử lại; REFUND có ô xác nhận hoàn thực tế như hiện tại.
- [ ] **Step 2: Test đỏ detail**: có nút "Nhận cọc"; "Hoàn tiền" chỉ khi `paidAmount > 0`; "Nhận cọc" ẩn khi CANCELLED; lịch sử không còn phương thức,
  có `<img>` khi `hasProof`, "Không có ảnh" khi không;
  bấm ảnh mở xem lớn, Esc đóng và focus về ảnh nhỏ; `paymentRequested` từ form giao mở popup Nhận cọc.
- [ ] **Step 3: Chạy** `npm test` → FAIL.
- [ ] **Step 4: Cài đặt** dialog theo Interfaces (dùng `<dialog>` và class form sẵn có trong `orders.scss`); gỡ panel `payment` cũ khỏi `order-detail`
  (`payment` object, `paymentConflict`, `OrderAction 'payment'`), xem ảnh lớn bằng `<dialog>` riêng trong detail.
- [ ] **Step 5: Chạy** `npm test` và `npm run build` → PASS.

### Task 5: Frontend trạng thái và nhãn

**Files:**
- Modify: `order-models.ts` (`OrderStatus`, `STATUS_LABELS`, `OrderStats`), `order-detail/*`, `order-list/order-groups.ts`, `order-bill/*` nếu có chữ "Chờ giao", các spec liên quan
- Test: `order-detail.spec.ts`, `order-groups.spec.ts`

**Interfaces:**
- Produces: `STATUS_LABELS.READY_TO_SHIP = 'Đang đóng gói'`; `OrderAction` bỏ `'fail' | 'resend' | 'abort-resend'`; `OrderStats` bỏ `unsuccessful`.

- [ ] **Step 1: Test đỏ**: đơn COMPLETED có nút "Hoàn đơn" mở form hoàn (lý do + số nhập lại từng dòng) và gọi `command(id,'return',…)`;
  không còn nút "Ghi không thành công", "Gửi lại", "Dừng gửi lại"; DRAFT/KEEPING/READY vẫn "Hủy đơn"; `grep -rn "Chờ giao" code/frontend/src` rỗng (test đọc `STATUS_LABELS`).
- [ ] **Step 2: Chạy** `npm test` → FAIL.
- [ ] **Step 3: Cài đặt**: gỡ nhánh `UNSUCCESSFUL`/resend ở detail (gồm `keepSummary` dùng `['COMPLETED','UNSUCCESSFUL']`), tab ACTION bỏ sub Không thành công (tab đầy đủ làm ở Task 7).
- [ ] **Step 4: Chạy** `npm test`, `npm run build` → PASS.
- [ ] **Step 5: Kiểm trình duyệt** (backend local mới + `npm start`, OWNER, dữ liệu synthetic): ghi cọc có ảnh, xem ảnh lớn, hoàn tiền, void, hoàn đơn; ghi kết quả.
- [ ] **Step 6: Commit 1**

```bash
git add code/backend code/frontend
git commit -m "feat(orders): require a transfer receipt for deposits and refunds, close returns in one step"
```

## Phần 2 — Danh sách đơn (commit 2)

### Task 6: API nhóm tab và kênh khách

**Files:**
- Modify: `OrderDtos.java` (enum group, `OrderSummary`), `OrderQueryService.java`, `OrderController.java` (filter)
- Test: `OrderListApiTest.java`

**Interfaces:**
- Produces: group `ACTION` = `DRAFT`, group mới `PACKING` = `READY_TO_SHIP` thứ tự `o.created_at,o.id` tăng;
  `record CustomerChannel(String type,String value)` với `type` ∈ `TIKTOK|THREADS|ZALO`; `OrderSummary` thêm field cuối `CustomerChannel customerChannel` (null khi không có).

- [ ] **Step 1: Test đỏ** `actionIsDraftOnly`, `packingGroupListsReadyOldestFirst`, `statsSumOfFiveGroupsEqualsAll`, `unsuccessfulStatusIs400`,
  `customerChannelPrefersTiktokThenThreadsThenZalo` (3 khách: đủ 3 kênh → TIKTOK; chỉ threads+zalo → THREADS; không kênh → null; giá trị trắng coi như không có),
  `channelFollowsCurrentProfile` (sửa `tiktok_id` sau khi tạo đơn → list trả giá trị mới).
- [ ] **Step 2: Chạy** `-Dtest=OrderListApiTest` → FAIL.
- [ ] **Step 3: Cài đặt**: join `customer` trong truy vấn list (một câu, không N+1), `coalesce(nullif(trim(tiktok_id),''),…)` kèm type.
- [ ] **Step 4: Chạy** `-Dtest=OrderListApiTest` → PASS.

### Task 7: Bảng danh sách mới

**Files:**
- Create: `order-list/order-row-menu.{ts,html,spec.ts}` (menu ⋮)
- Modify: `order-list/order-groups.ts`, `order-list/order-list.{ts,html,scss,spec.ts}`, `order-models.ts`
- Test: `order-groups.spec.ts`, `order-list.spec.ts`, `order-row-menu.spec.ts`

**Interfaces:**
- Consumes: Task 6 `customerChannel`, group `PACKING`.
- Produces: `ORDER_TABS` 6 phần tử theo spec mục 5.1 (slug `dang-dong-goi`); `OrderTab` bỏ `showStatus`, `dateColumn`;
  `channelLine(o: OrderSummary): string` → `"TikTok: x"` / `"Threads: x"` / `"Zalo: x"` / SĐT / `"Chưa có SĐT"`;
  `OrderRowMenu` input `order: OrderSummary`, output `remove: OrderSummary`.

- [ ] **Step 1: Test đỏ `order-groups.spec.ts`**: 6 tab đúng nhãn/slug; link cũ `status=READY_TO_SHIP` → PACKING, `status=DRAFT` → ACTION, `status=UNSUCCESSFUL` → ALL, `nhom=dang-dong-goi` → PACKING.
- [ ] **Step 2: Test đỏ `order-list.spec.ts`**: header đúng thứ tự Khách hàng · Mã đơn · Ngày tạo · Số lượng sách · Tổng đơn · Đã cọc · Trạng thái · Hạn keep · Thao tác ở mọi tab;
  mã đơn không có `<a>`; dòng có `tabindex="0"` và `aria-label="Mở đơn DH-…"`, Enter điều hướng, Ctrl/Cmd+click mở tab mới; `enterOnMenuDoesNotOpenOrder`;
  badge có class theo trạng thái (`draft|keeping|packing|completed|closed`); hạn keep "—" ngoài KEEPING; `channelLine` 5 trường hợp.
- [ ] **Step 3: Test đỏ `order-row-menu.spec.ts`**: ⋮ mở menu một mục "Xóa"; Esc/bấm ngoài đóng và trả focus về ⋮; mũi tên chuyển mục; đơn không trashable và không CANCELLED → không render nút.
- [ ] **Step 4: Chạy** `npm test` → FAIL.
- [ ] **Step 5: Cài đặt**. Màu badge bằng token sẵn có trong `styles` (thêm token `--status-*` cho sáng/tối nếu thiếu), kiểm tương phản AA bằng công
  cụ trong trình duyệt; style bảng trong `order-list.scss`.
  Xóa `TrashIcon` khỏi list nếu không còn dùng.
- [ ] **Step 6: Chạy** `npm test`, `npm run build` → PASS.
- [ ] **Step 7: Kiểm trình duyệt** 1440px và 390px, sáng/tối: 6 tab, số đếm, Tab+Enter, menu ⋮ bằng phím, xóa đơn nháp, giải thích đơn hủy còn tiền.

### Task 8: Gộp tài liệu và commit 2

**Files:**
- Modify: `docs/product/ORDERS.md` (mục 3, 4, 4.1, 7, 9, 10, 11, 12, 13, 15), `docs/product/ORDER_BILL.md` nếu nhắc "Chờ giao",
  `docs/product/IMAGES.md` (một dòng: ảnh bill private, không qua gateway), `docs/runbooks/IMAGE_OPERATIONS.md` (backup gồm `private/payment-proofs`),
  `docs/runbooks/ROLLOUT_CHECKS.md` (V39), `docs/verification/ORDER_VERIFICATION.md`, `docs/README.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`
- Delete: `docs/specs/ORDER_MONEY_LIST.md`, `docs/specs/ORDER_MONEY_LIST_PLAN.md`

- [ ] **Step 1: Gộp** quyết định spec vào ORDERS (giữ ≤ 400 dòng; nếu vượt, tách mục tiền sang `docs/product/ORDER_PAYMENTS.md` và đăng ký chỉ mục).
- [ ] **Step 2: Bằng chứng**: số test backend/frontend, build, trình duyệt, giới hạn (Safari, `build:workers`, live chưa kiểm) vào ORDER_VERIFICATION và DEV_LOG.
- [ ] **Step 3: Kiểm** `wc -l` các file docs đã sửa ≤ 400 (trừ DEV_LOG), link local còn đúng, chỉ mục không còn spec/plan đã xóa.
- [ ] **Step 4: Commit 2**

```bash
git add code docs
git commit -m "feat(admin): redesign the order list table with packing tab and contact channel"
```
