# Kiểm chứng quản lý đơn nội bộ — 17/11/2026

Contract duy nhất: [ORDERS](../product/ORDERS.md). Bằng chứng local, dữ liệu synthetic;
không là nghiệm thu live, không migrate/deploy hoặc kết nối carrier/payment API.
Branch triển khai `codex/order-management` từ dev/3898e40; workflow tích hợp dev.
Lượt chạy ngày 17/11 dùng V34–V36. Đợt bill ngày 18/11 dùng V37.

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
Gate và cách chạy theo [PROGRESS](../PROGRESS.md), [DEPLOYMENT](../runbooks/DEPLOYMENT.md).

## Hai tab và bill — 18/11/2026

- Migration V37, backend full 384 test với 3 live skip; sau review chạy lại
  22 test shipping/payment/mutation/privacy và 20 shipping/return/API đạt.
- 409 frontend test đạt, build SSR/Workers và proxy đạt.
- Browser với QA DB riêng: bill thu hộ gợi ý theo số dư, chuyển monthly, ghi thu
  trong popup, xác nhận lại, lưu, refresh tab Tổng đơn, mobile390 không tràn.
- Phiên 18/11 chưa kiểm toàn bộ luồng gửi lại và hoàn đơn trên trình duyệt. Các ca backend shipping/return/API đã chạy.
- Commit 6eadf95 đổi màu tab đang mở sang đỏ, tab còn lại màu tối. 8/8 test order-detail đạt.
- Chưa migrate/deploy production. [Checkpoint 18/11](../DEV_LOG.md#2026-11-18--order-bill-exec).

## Chọn khách và gợi ý sách gần giống — 25/11/2026

- `ORDER-PICKER-01`, nền `84fbbdd`. Backend `./mvnw -B -ntp verify` trên PostgreSQL 17 tạm: 430 test, 0 lỗi, 3 live skip.
  Frontend 72 file/484 test, `npm run build` đạt, 0 cảnh báo.
- Đo HTTP `catalog-match`, 5.001 sách giả, 200 lượt/20 tên, cùng máy và container: bản cũ p95 198,4/201,5ms;
  bản mới 71,0/67,7ms, đo lại sau khi sửa chuẩn hóa 82,8ms (ngưỡng 100ms). Dữ liệu giả không có ảnh/tồn.
- Playwright OWNER, 1440×900 và 390px, backend/DB tạm riêng: đơn mới, đổi khách giữ trang, thêm khách mới, sửa nháp,
  gợi ý (Ẩn/Hết hàng), giữ giá, trùng hẳn, lỗi mạng → 409 → xác nhận → lưu, đổi sách, không tràn ngang.
- Reviewer độc lập: 0 Critical; đã sửa lệch chuẩn hóa SQL/Java (test đỏ trước), lỗi danh sách khách chặn nhầm và giá sách
  khác dính dòng thủ công. Ba điểm sửa này chỉ kiểm bằng test, chưa mở lại trình duyệt.
- Chưa kiểm: Safari, thiết bị thật, ảnh bìa thật, STAFF trên trình duyệt, `build:workers`, locale DB đích.

## Tab danh sách đơn — 25/11/2026

- `ORDER-LIST-TABS-01`, nền `b1501ba`. Backend `./mvnw -B -ntp verify` trên PostgreSQL tạm, từ bản sao source: 440 test, 0 lỗi, 3 live skip.
  Frontend 73 file/519 test; `ng build` đạt, 0 cảnh báo. Test viết và thấy đỏ trước code.
- 14 lần làm hỏng có chủ đích đều đỏ rồi trả lại: khóa phụ `id`, thứ tự Tất cả, số theo tab, bỏ kiểm tham số, nhóm thiếu trạng thái,
  giữ nút phụ khi đổi tab, số lỗi, đổi phiên (cả OWNER khác), trang vượt quá, tab đang mở, cảnh báo quá hạn.
- Trình duyệt trong app, OWNER thử, backend/DB tạm riêng, 38 đơn giả, 1440×900: 5 tab, nút phụ, thứ tự/cột, tìm, ngày, khách,
  link cũ `customerId&status`, trang vượt quá, mở đơn rồi quay lại, Back/Forward, xóa đơn cập nhật số, Tab/Enter/Space, focus.
  390px: trang không tràn, tab và nút phụ cuộn ngang.
- Reviewer độc lập: 0 Critical, 1 Important (thiếu test thứ tự Tất cả). Đã bổ sung, kèm test đổi phiên, làm mờ nút "Tất cả" số 0,
  focus nút phụ đang chọn.
- Chưa kiểm: Safari, thiết bị thật, STAFF trên trình duyệt, trình đọc màn hình, `build:workers`, dữ liệu `me_may_dev`, hiệu năng nhiều đơn.

## Bill gửi khách và cân kiện gợi ý — 25/11/2026

- `ORDER-BILL-VIEW-01`, nền `5368373`. Frontend 74 file/541 test, `ng build` đạt, 0 cảnh báo; test viết và thấy đỏ trước code.
  18 lần làm hỏng có chủ đích: 16 đỏ ngay, 2 sống sót (focus về nút mở, ghi đè ô tìm khi đang gõ) đã siết test và đỏ lại.
  Backend không đổi từ lần 440 test của ORDER-LIST-TABS-01.
- Trình duyệt trong app, OWNER thử, backend/DB tạm riêng, 1440×800: bill 3/12/25 dòng (12 dòng có 2 tên dài cao 782px, không cuộn),
  Esc trả focus, sách thiếu trọng lượng, 611 g → 1.611 g, lưu bill rồi số khớp Tổng đơn, sửa bill giữ 1.611 g;
  ✕/Xóa lọc giữ focus, ngày ngược, gõ "Khách " dừng rồi "thử". 390px: bill và trang không tràn ngang.
- Chưa kiểm: đơn thật, gửi lại và tải lại do xung đột trên trình duyệt (chỉ có test), Safari, thiết bị thật,
  trình đọc màn hình, `build:workers`; chưa có reviewer độc lập cho lượt này.

## Nhận cọc có ảnh bill và bảng danh sách — 26/11/2026

- `ORDER-MONEY-LIST-01`, nền `67d7ffd`, commit 1 `4ca3690`. Test viết và thấy đỏ trước code (riêng
  `voidKeepsProof` và `removedEndpointsAreGone` xanh ngay vì hành vi đã có, giữ làm chốt).
- `me_may_test` local lệch checksum V21 (không do thay đổi này) nên backend chạy trên PostgreSQL 17
  container tạm, từ bản sao ở scratchpad để không đụng `8080` của owner. `verify` 457 test: 3 lỗi
  `HeroBannerMediaTest` do bản sao thiếu `node_modules` image-worker, nối lại thì 5/5 đạt.
  Sau phần 2: `verify` 461 test (3 skip) đạt. Frontend 75 file/558 test, `ng build` đạt.
- Trình duyệt trong app, OWNER thử trên backend/DB tạm (20 đơn tổng hợp), 1440px: 6 tab và số đếm,
  9 cột, badge 5 màu, dòng phụ TikTok/Threads/Zalo/SĐT; Enter mở dòng; ⋮ bằng phím (Enter vào "Xóa",
  Esc trả focus), Xóa mở hộp Thùng rác; Nhận cọc với ảnh PNG có xem trước, lịch sử có ảnh nhỏ,
  ảnh lớn đóng bằng Esc trả focus, nút Hoàn tiền xuất hiện; Hoàn đơn từ Hoàn tất → Đã hoàn đơn,
  lần giao FAILED kèm lý do, 1 dòng hoàn. 375px: trang không tràn, bảng cuộn trong khung.
- Sửa khi kiểm: ô đầu/cuối bảng chạm mép khung (thêm padding); menu ⋮ dòng cuối bị khung cuộn
  cắt (đổi sang mở cạnh nút).
- Chưa kiểm: đơn thật, STAFF trên trình duyệt, Safari/thiết bị thật, trình đọc màn hình,
  `build:workers`, migration V39 trên dữ liệu đích, ảnh JPEG chụp từ điện thoại thật.
- Review độc lập toàn nhánh (một reviewer, chỉ đọc): không có lỗi nghiêm trọng; 5 tình huống trọng tâm
  (gửi lại cùng request, ảnh giả/0 byte, ghi DB lỗi sau khi lưu file, ảnh của đơn khác, Enter ở menu)
  đều đúng. Một lỗi quan trọng đã sửa: chưa có job dọn ảnh mồ côi (thêm `PaymentProofSweep`, test đỏ
  trước). Sửa thêm: nút Xác nhận khóa đến khi chọn ảnh. Sau sửa: backend `verify` 462 (3 skip),
  frontend 559, build đạt. Các góp ý nhỏ hoãn ghi ở DEV_LOG.

## Trang chi tiết đơn 2 cột và tab Xuất bill — 26/11/2026

- `ORDER-DETAIL-BILL-01`, nền `8f44a5a`, commit 1 `4d637ef` (backend 5 field đọc). Test viết và
  thấy đỏ trước code ở từng phần (backend 4/4 đỏ vì thiếu field; frontend hàm hiển thị, timeline,
  menu ⋮, bill, form, trang).
- Backend trên PostgreSQL 17 container tạm từ bản sao ở scratchpad (như lần trước): `verify` 466
  test (3 skip) đạt. Frontend 78 file/600 test, `ng build` đạt (không vượt ngân sách CSS).
- Trình duyệt trong app, OWNER thử trên backend/DB tạm (6 đơn tổng hợp đủ trạng thái), 1440px và
  900px: header với nút chính và ⋮ đúng từng trạng thái; 2 cột/1 cột, không cuộn ngang trang;
  `?tab=total` mở tab Xuất bill; gõ phí ship thì bill đổi ngay và hiện dải "Chưa lưu"; đổi tab qua
  lại vẫn giữ số; Lưu bill đơn nháp → Đang đóng gói, ở lại tab, hết dải vàng, card Giao hàng có
  thông tin; Mở lại đơn → mốc Chốt đơn về xám, lý do vào card Ghi chú; đơn Hoàn tất/Đã hoàn đơn
  form chỉ xem; đơn Đã hủy báo không xuất bill, badge "Còn giữ 120.000đ"; timeline hoàn đơn có mốc
  bàn giao rồi "Đã hoàn đơn" đỏ; đơn đã mở lại rồi chốt lại lấy ngày lần chốt mới.
- Sửa khi kiểm: bảng sách bị cuộn ngang trong cột 2/3 (thu gọn ô); badge rớt dòng do `h1` toàn cục
  `max-width: 18ch`; chữ mục đầu của ⋮ trắng do kiểu nút chung.
- Chưa kiểm: đơn thật, ảnh bìa thật (đã có test API/đơn vị), Safari/thiết bị thật, trình đọc màn
  hình, `build:workers`.
- Sửa sau review (owner yêu cầu 26/11): kênh khách chỉ lấy ở API xem chi tiết, cùng câu truy vấn
  (`left join`), lần đọc nội bộ/khóa không truy vấn thêm (test đỏ trước); cờ nạp lại form xóa khi
  tải lại lỗi; form chuyển chỉ xem khi đơn hoàn tất ở phiên khác; xóa cuốn cuối không mất chữ đang
  gõ; menu ⋮ có `aria-controls`, Esc từ nút, đóng khi Tab ra; timeline đơn hủy giữ mốc Chốt đơn;
  dòng "Cần xuất lại bill cho đơn này." Mỗi mục có test đỏ trước. Frontend 610/610, build đạt.

## Gọn trang chi tiết đơn — 27/11/2026

- `npm test` 611/611, `npm run build` đạt (frontend, `dev`).
- Trình duyệt 1440px, frontend tạm 4210 + backend tạm 18080 (code `dev`, `me_may_dev`), 4 đơn mẫu
  `[Mẫu]` DH-000010…013: header hai badge (Đang keep + Đã cọc; Nháp + Chưa cọc; Hoàn tất + Đã
  thanh toán đủ; Đã hủy + Còn giữ 70.000đ); card thông tin không còn Mã đơn/Ngày tạo, Hạn keep
  chỉ ở đơn Keep; "＋ Thêm sách" ở tiêu đề chỉ khi sửa được, "n quyển · m g" dưới bảng; Tổng/Tạm
  tính 20px so với 16px các dòng khác; khách 2 dòng, tên không gạch chân, chip kênh.
- Sửa thêm (owner yêu cầu): đơn Đã hủy không còn "Còn thu"; tiền còn giữ thành "Cần hoàn x" (khớp
  badge "Còn giữ x"), không giữ tiền thì "Không còn giữ tiền". Test đỏ trước; `npm test` 613/613,
  build đạt; DH-000013 hiện "Cần hoàn 70.000đ".
- Chưa kiểm: dưới 1024px, Safari/thiết bị thật, trình đọc màn hình.

## Màu tab danh sách và bill sửa trực tiếp — 27/11/2026

- `npm test` 614/614, `npm run build` đạt (frontend, `dev`).
- Trình duyệt 1440px (frontend tạm 4210 + backend tạm 18080, đơn mẫu): tab Đang keep chữ/gạch xanh
  dương, số đếm các tab là viên màu nhãn. DH-000012 (Nháp): bill hiện Người nhận điền sẵn, "Nhập
  SĐT" đỏ mờ, gõ phí 30000 → Phí ship 30.000đ, Tổng bill 120.000đ, COD gợi ý 120.000, "Còn thiếu:
  SĐT", hiện Hoàn tác (không lưu). DH-000011 (Hoàn tất): bill chỉ xem, ô là chữ thường, không Lưu.
- Sửa khi kiểm: rule toàn cục `.admin-shell input:not(…)` đè kiểu ô trên bill → dùng cùng chuỗi
  `:not` để thắng; khoảng trống giữa số phí và "đ".
- Chưa kiểm: dưới 1024px, bill nhiều trang trên trình duyệt (có test đơn vị), chụp ảnh thật gửi khách.

## Bill có logo và bảng 5 cột — 27/11/2026

- Test bill đỏ trước (8 ca) rồi xanh; `npm test` 614/614, `npm run build` đạt.
- Trình duyệt 1440px, DH-000010 tab Xuất bill: logo tròn cạnh "Mẹ Mây / Sách ngoại văn cho bé";
  bảng STT · Tên sách · SL · Đơn giá · Thành tiền tiêu đề đậm, STT 1–3; Tiền sách (không "n
  quyển"), Phí ship "nhập phí", Tạm tính, Đã thanh toán, Cần thanh toán.
- Chưa kiểm: bill nhiều trang trên trình duyệt (STT liên tục có test đơn vị), dưới 1024px.

## Hãng vận chuyển, mã vận đơn và nhận tiền không ảnh — 27/11/2026

- Backend: `OrderCarrierTest` 8 ca đỏ trước (chưa có hãng/kiểm mã/thanh toán không ảnh) rồi xanh;
  `verify` 476 test (3 skip) đạt trên PostgreSQL 17 container tạm (cổng 55440, đã xóa) vì
  `me_may_test` trên máy còn ở V21 lệch checksum.
- Frontend: `npm test` 620/620, `npm run build` đạt.
- Trình duyệt 1440px (backend 18080 + frontend 4210 tạm, đã dừng): DH-000015 Khách tự lấy — bill
  không Địa chỉ, Phí ship "Khách tự lấy", Nội bộ chỉ còn tiền, nút "Khách đã lấy hàng";
  DH-000014 Shopee Express — hộp bàn giao chọn sẵn Shopee Express, Khách tự lấy bị khóa; Nhận cọc
  tick không ảnh → ẩn ô ảnh, ô "Lý do không có ảnh *".
- Chưa kiểm trên trình duyệt: bấm bàn giao thật (hộp xác nhận của trình duyệt), lỗi mã "hi"/trùng
  (có test backend), dưới 1024px.

## Ngày bán, lô hàng, lọc nhanh và tab kiểu trình duyệt — 28/11/2026

- Backend: `./mvnw -o test` 479 test, 0 lỗi, 3 skip trên PostgreSQL tạm 127.0.0.1:55461
  (locale en_US.UTF-8; locale C làm hỏng 3 test sắp chữ có sẵn; đã xóa) vì `me_may_test` local
  vẫn lệch checksum V21. Test mới (`OrderDraftTest` ngày bán/lô/tìm kênh) viết cùng code, không đỏ trước.
- Frontend: `npm test` 641/641, `npm run build` đạt (đã gọn CSS chi tiết đơn để vừa budget 6 kB).
- Trình duyệt 1440px (backend 18080 áp V41 lên `me_may_dev`, frontend 4210): Hôm qua → URL
  27/11, 6 đơn, số tab theo ngày; tab Đang keep xanh liền tấm có nút phụ; `@giabao` ra khách
  TikTok, `thanhtam` ra khách Zalo. DH-000012: thêm Sách ngoài có lô (ô Lô hàng ngang Trọng lượng),
  Tiền sách 115.000đ ở card thông tin; Sửa → Ngày bán max hôm nay, đổi về 26/11 thì dòng lên đầu,
  sáng rồi tắt, audit `ITEM_UPDATE` có ngày trước/sau. 13 dòng: vùng cuộn 640px, tiêu đề dính,
  thêm dòng mới tự cuộn tới cuối, lô điền sẵn; Xuất bill vẫn chia trang đủ sách, không có lô.
  Sửa lỗi có từ trước: quy tắc `.empty` đệm 84px vào ô bìa trống. Đã xóa 11 dòng thử.
- Chưa kiểm: dưới 1024px, Safari, dòng sách website có ảnh bìa thật trong bảng mới.

## Tấm xám chung, lọc nhanh không nhảy, bảng khách bấm cả dòng — 28/11/2026

- Owner xem bản vẽ ba màu, chọn xám ấm `#ebe9e5`, sau đó đổi nhạt hơn một bậc thành `#f2f0ec`. `npm test` 642/642, `npm run build` đạt.
- Trình duyệt 1440px: Đang keep chữ xanh trên tấm xám phủ tới phân trang; đo vị trí ô tìm/3 nút và
  bảng trước và sau bấm Hôm qua giống hệt; nhập ngày tay → chấm đỏ trong Bộ lọc, Xóa lọc ở hàng
  ngày. Chi tiết đơn tấm xám. Danh sách khách kiểu bảng đơn, bấm ô SĐT mở chi tiết khách giữ query;
  chi tiết khách hai card trắng trên tấm xám (bỏ đường kẻ đầu lịch sử đơn).
- Chưa kiểm: dưới 1024px, Safari, OWNER/STAFF khác nhau trên bảng khách mới (có test đơn vị).
- Bổ sung cùng ngày: tấm `#f4f5f7` (xám lạnh theo mẫu), card viền `#e8e6e1` + bóng `0 1px 2px` 5%,
  tiêu đề bảng `#f9fafb`; ô tìm/Hôm nay/Hôm qua/Bộ lọc/lọc khách lên trên hàng tab; trang khách ô
  tìm ngoài tấm. Sidebar thêm icon Lucide users/receipt/id-card, bỏ đường kẻ giữa Đơn hàng và Nhân
  viên. `npm test` 642/642, build đạt; trình duyệt 1440px: danh sách đơn, chi tiết đơn, danh sách khách.
