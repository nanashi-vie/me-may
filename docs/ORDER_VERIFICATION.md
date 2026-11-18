# Kiểm chứng quản lý đơn nội bộ — 17/11/2026

Contract duy nhất: [ORDERS](ORDERS.md). Bằng chứng local, dữ liệu synthetic;
không là nghiệm thu live, không migrate/deploy hoặc kết nối carrier/payment API.
Branch triển khai `codex/order-management` từ dev/3898e40; workflow tích hợp dev.
Hai hero image deletion có sẵn ngoài phạm vi được giữ nguyên, không stage.

## Môi trường và kiểm tra tự động

- PostgreSQL17.11 container QA riêng `memay-order-test`, cổng127.0.0.1:55447;
  suite DB `me_may_test`; browser DB riêng `me_may_orders_browser`.
- Backend Java21/Spring Boot4.1.1: `mvn -q test`, cwd `code/backend`,
  TEST_DB_URL/DB_USER/DB_PASSWORD trỏ QA; không source .env bán thật.
- **383 tests, 0failure, 0error, 3skip**. Ba skip là CloudinaryLiveTest,
  CloudinaryVariantLiveTest, MediaLiveTest; tất cả test order/concurrency/privacy
  chạy thật, không skip. Baseline trước module320test/3skip.
- Frontend cwd `code/frontend`: `npm test` **391 passed**; baseline367.
- `CI=1 NO_COLOR=1 npm run build`: SSR/browser exit0, không warning/budget tăng.
- `npm run build:workers`: exit0, không warning. `npm run check:workers:proxy`:
  PASS POST/query/cookie/CSRF/multipart/separate Set-Cookie/server-time/no-store/
  context/backend-down. Không deploy Workers.
- Wrapper QA chỉ đặt env, tách DB và ghi log; không thay test runner/assertion.
  Full cuối run-be-73/run-fe-72 và final gate391FE; SSR74/Workers75/proxy76.

Giới hạn môi trường: build đầu trong sandbox esbuild deadlock; chạy lại ngoài
sandbox/noninteractive đạt. Proxy lần đầu EPERM listen localhost, chạy ngoài
sandbox đạt. Baseline từng có ShippingPromoDialog spy history intermittent;
isolated và full kế tiếp đạt không sửa public code; full cuối không tái hiện.

## Backend và dữ liệu

| Nhóm | Kết quả được bảo vệ |
|---|---|
| Schema | V34–V36 additive, constraint/FK/index; action notes sống sau item delete |
| Toán | Ship trong bill, cọc không cộng hai lần, thiếu weight/ship nullable, overflow/0đ/overpaid/refund |
| Receipt | Cùng actor/operation/key/payload replay kết quả cũ; đổi payload409; current OWNER trước replay |
| Transaction | Data/stock/version/receipt/audit atomic; audit fail rollback, không side effect trước commit |
| Stock | Hai order tranh tồn cuối chỉ một thắng; book editor cũ409 không hồi sinh tồn; pooled UUID/tên/thứ tự giữ |
| Keep | Trừ ngay, thêm không reset hạn, HCM+14/trần30/ranh tháng/leap day, hết hạn không tự nhả |
| Xóa/giảm | KEEPING bắt lý do nonblank≤1000; thiếu400 không đổi tồn/version; reason/item/số bỏ/actor/time retained |
| Giao/hoàn | Handoff COMPLETED không tự thu tiền/trừ tồn; fail/resend/abort/actual return/refund tách biệt |
| Purge | ACTIVE chặn trash; order ref chặn purge; scheduled batch vẫn purge sách khác hợp lệ |
| API/privacy | Strict JSON integer/string IDs/whitelist, paging/date/search literal, cross-order404, OWNER/STAFF/CSRF/no-store |

## Browser và HTTP QA thực tế

Playwright CLI, backend8087/frontend4207, chỉ dữ liệu giả. Ảnh/trace local tại
`output/playwright/orders/`; script/log QA được ignore dưới `.local/orders/`.

- Tạo khách ngay trong form, saved chọn đúng ID, tạo đơn nháp; MANUAL2×75000đ,
  250g/quyển →150000đ/500g. CATALOG Ẩn vẫn chọn được; không tự lấy giá tham khảo.
- Cùng MM hai dòng120000/110000đ độc lập; keep ngoại lệ cọc trừ2tồn.
  Xóa thiếu lý do bị chặn, tồn vẫn6/history0; lý do hợp lệ →tồn7/history1,
  snapshot mã/tên/số bỏ/người xử lý được giữ lại.
- Chốt ship30000đ: bill290000đ, khai giá260000đ. Handoff tracking bắt buộc,
  COMPLETED nhưng payment0, stock7; fail không tự hoàn tiền/tồn.
- Resend thêm20000đ; abort về UNSUCCESSFUL không tự nhập tồn/hoàn tiền.
  Lần giao thứ3 giữ lịch sử mã cũ; actual return chỉ CATALOG thực nhập →stock8.
  Replay return vẫn8, đóng hoàn không resend; MANUAL không nhập tồn website.
- Ledger: partial/overpaid, actual refund checkbox, VOID giữ bản gốc/lý do;
  cancel giữ ledger, không tự coi đã hoàn. Gia hạn vượt30 bị400/không đổi hạn.
- UI reopen keep thật giữ start/deadline; gia hạn tới đúng max30; cancel hoàn
  đúng ACTIVE. Quick-create Escape từ chối bỏ vẫn giữ form, chấp nhận trả focus.
- Native item modal409 có nút refresh bên trong, giữ giá123456đ không làm tròn.
  Mô phỏng server đã commit nhưng client mất phản hồi: retry cùng payload/key,
  chỉ một item, một stock delta, không tăng version lần hai.
- Native shipping modal409 giữ recipient/fee/cân tay1500g; refresh bỏ xác nhận
  COD/cân cũ, admin phải xác nhận lại; bill503456đ/khai giá473456đ đúng.
- Restart riêng backend QA rồi replay ITEM_ADD cũ sau khi đơn đã cancel:
  trả đúng MutationResult ban đầu, không thêm item/đổi tồn. UI đọc detail mới.
- OWNER orderCount thật; STAFF direct URL chuyển về sách, không gọi API order;
  customer list/detail STAFF không có count/history. API STAFF403, anonymous401,
  OWNER mutation thiếuCSRF403. Không query order N+1 qua customer.
- Public Home/catalogue/sale/wishlist không có customer/order/PII từ fixture;
  CATALOG Ẩn vẫn Không tìm thấy ở public detail. Public suites/cache invalidation đạt.
- Desktop1440/tablet1024/mobile390: không outer overflow; bảng scroll riêng.
  Đã xem screenshot keep desktop/mobile, kiểm label/keyboard/native dialog/focus.

## Review độc lập và một lượt sửa

Fresh reviewer `gpt-6-astra`, range3898e40..dc9b202. Bị ngắt quota, tiếp tục cùng
reviewer, không thêm reviewer/implementer. Kết quả0Critical/4Important/0Minor.

| Important | RED → GREEN và hành vi cuối |
|---|---|
| Reopen KEEP draft chưa từng keep tạo KEEPING không hạn | BE69 expectedDRAFT/actualKEEPING; BE71 đạt: trở về DRAFT/nhả tồn; keep sau đó vẫn kiểm cọc/hạn |
| Refresh A đè B hoặc version mới bị response cũ đè | FE68 thất bại; FE70 đạt: page/read generations + guard ID/version, mutation response theo page |
| Modal409 thiếu cách tải lại giữ draft | FE68 thất bại; FE70 đạt: nút trong dialog, rebase và bỏ xác nhận COD/cân cũ |
| Parent không chặn dirty/busy CustomerForm | FE68 thất bại; FE70 đạt: canLeave ủy quyền child, không bỏ save/draft |

Focused24FE/15BE đạt; full cuối391FE/383BE(3live skip) đạt sau sửa.
Không còn Important được hoãn; không có Minor được reviewer đề xuất.

## Quyết định triển khai và chi phí

- Dùng checkout hiện có/branch riêng sau cleanup, không tạo worktree mới:
  mất cách ly filesystem nếu có actor khác sửa; không giao implementer song song.
- Reservation RELEASED cho quantity0 để giữ lịch sử khi xóa dòng cuối:
  thêm trạng thái constraint, thay việc xóa row lịch sử.
- OrderInventory là helper chung draft/keep/shipping: thêm một file tập trung,
  tránh vòng phụ thuộc service; cần giữ các caller cùng invariant.
- V35 private action notes thay audit free text: thêm bảng/query detail,
  giữ lý do riêng tư và audit chỉ ref. V36 giữ snapshot xóa sách.
- Route list ở task9, new/detail ở task10 khi có component thật:
  CTA tạm chưa resolve trong feature branch chưa tích hợp, không còn ở bản cuối.
- KEEP draft chốt thẳng nhưng chưa bắt đầu keep khi reopen về DRAFT/nhả tồn:
  owner cần bấm Keep rõ ràng sau reopen; không có keep thiếu hạn/né cọc.
- Hero deletions có sẵn được reviewer loại trừ và giữ ngoài commit:
  checkout vẫn bẩn vì thay đổi riêng của user, không ảnh hưởng phạm vi module.
- Live migration/deploy/backup/restore không thuộc nghiệm thu này:
  local pass không xác lập production readiness; gate release vẫn mở.

## Gate rollout còn riêng

Chưa backup/restore/offhost rehearsal, xác minh Flyway/schema live, rollout
backend trước FE, smoke/security/cache/SEO trên hostname production hoặc deploy.
User tự merge dev→main theo workflow; không drop order/payment/receipt để rollback.
Gate và cách chạy theo [PROGRESS](PROGRESS.md), [DEPLOYMENT](DEPLOYMENT.md).

## Hai tab và bill — 18/11/2026

- Migration V37, backend full 384 test với 3 live skip; sau review chạy lại
  22 test shipping/payment/mutation/privacy và 20 shipping/return/API đạt.
- 409 frontend test đạt, build SSR/Workers và proxy đạt.
- Browser với QA DB riêng: bill thu hộ gợi ý theo số dư, chuyển monthly, ghi thu
  trong popup, xác nhận lại, lưu, refresh tab Tổng đơn, mobile390 không tràn.
- Chưa migrate/deploy production.
