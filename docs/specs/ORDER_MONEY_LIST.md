# Nhận tiền có ảnh bill, gộp hoàn đơn và bảng danh sách đơn — spec

Owner chốt qua 5 vòng hỏi ngày 26/11/2026. **Trạng thái:** chờ owner duyệt spec.
Mã việc `ORDER-MONEY-LIST-01`. Khi xong, gộp quyết định vào
[ORDERS](../product/ORDERS.md) (mục 3, 4.1, 7, 9–15), bằng chứng vào
[ORDER_VERIFICATION](../verification/ORDER_VERIFICATION.md), rồi xóa spec này.

## 1. Mục tiêu

- Ghi nhận tiền đơn giản theo cách tiệm bán online: mọi khoản đều chuyển khoản,
  chỉ có **Nhận cọc** và **Hoàn tiền**, mỗi giao dịch bắt buộc **1 ảnh bill**.
- Bỏ trạng thái "Không thành công" và luồng gửi lại: đơn bị hoàn về là đơn hủy
  và hàng về kho, nên đi thẳng sang **Đã hoàn đơn**.
- Thiết kế lại bảng `/admin/orders` theo mẫu bảng gọn (ảnh tham khảo owner gửi),
  giữ tab, thêm tab **Đang đóng gói**.

## 2. Ngoài phạm vi

- Không đổi cách tính tồn, keep, gia hạn, chốt giao, COD, cân kiện, bill gửi khách
  (trừ nhãn trạng thái).
- Không thêm tìm kiếm theo tên TikTok/Threads/Zalo ở danh sách đơn.
- Không thêm checkbox chọn nhiều, nút làm mới, chế độ lưới, lọc "tháng này".
- Không dependency mới; không xử lý ảnh bill thành biến thể.

## 3. Phần A — Nhận tiền

### 3.1 Giao dịch

| Hiện tại | Sau thay đổi |
|---|---|
| Loại DEPOSIT / PAYMENT / REFUND | Chỉ **DEPOSIT** (nhãn "Nhận cọc") và **REFUND** ("Hoàn tiền") |
| Phương thức BANK_TRANSFER / OTHER (CASH cũ) | Bỏ; mọi giao dịch là chuyển khoản, không lưu cột phương thức |
| Thời điểm thực tế nhập tay, trống = lúc ghi | Bỏ ô nhập; `occurred_at` = thời điểm server ghi nhận |
| Ghi chú tùy chọn | Giữ, tối đa 1000 ký tự |
| Không có ảnh | **Bắt buộc đúng 1 ảnh bill** cho cả Nhận cọc và Hoàn tiền |

- Khách cọc nhiều đợt thì ghi nhiều giao dịch Nhận cọc, mỗi giao dịch 1 ảnh.
- Tiền COD không ghi bằng giao dịch (mục 8).
- `paidAmount` = SUM(DEPOSIT) − SUM(REFUND) của giao dịch chưa VOID. Ngưỡng cọc
  keep 100.000đ, Thùng rác ("tiền còn giữ"), COD gợi ý giữ nguyên công thức.
- VOID giữ nguyên: lý do bắt buộc, không sửa/xóa giao dịch. Giao dịch bị VOID vẫn
  giữ ảnh để đối soát.
- Refund không vượt số đang giữ (giữ quy tắc mục 7 ORDERS). Đơn hủy/hoàn chỉ còn
  Hoàn tiền, không Nhận cọc mới (giữ quy tắc mục 10 ORDERS).

### 3.2 Giao diện trang chi tiết đơn

- Thay nút "Ghi nhận thu tiền" bằng hai nút: **Nhận cọc** và **Hoàn tiền**.
  "Hoàn tiền" chỉ hiện khi `paidAmount > 0`. "Nhận cọc" ẩn với đơn hủy/hoàn.
- Mỗi nút mở popup riêng: tiêu đề theo loại, ô Số tiền (VND) *, ô **Ảnh bill
  chuyển khoản** *, Ghi chú. Không có ô loại giao dịch, phương thức, thời điểm.
- Ô ảnh: chọn tệp từ máy (`accept="image/jpeg,image/png"`), xem trước
  ảnh đã chọn, nút đổi ảnh. Sai định dạng hoặc quá 10 MiB báo lỗi ngay tại ô,
  không gửi. Nút Xác nhận khóa đến khi có số tiền hợp lệ và ảnh.
- Lỗi mạng/409: giữ số tiền, ghi chú và ảnh đã chọn để thử lại; không gửi hai lần.
- Mục "Lịch sử thu / hoàn tiền": mỗi dòng có loại, số tiền, thời điểm ghi, người
  ghi, ghi chú, **ảnh nhỏ**. Bấm ảnh nhỏ mở xem ảnh lớn (Esc/nút đóng, focus trả
  về ảnh nhỏ). Bỏ cột phương thức. Dòng cũ không có ảnh hiện "Không có ảnh".
- Bill gửi khách không hiện ảnh.

### 3.3 Lưu ảnh

- Dùng lại thư mục gốc LOCAL và `ImageValidator`: **JPEG/PNG** (ảnh chụp màn hình điện
  thoại), ≤ 10 MiB, ≤ 25.000.000 pixel, kiểm magic + giải mã. Không nhận WebP vì
  `ImageValidator` chỉ giải mã JPEG/PNG (chỉnh khi lập plan 26/11); không HEIC/SVG/PDF.
- Ảnh là dữ liệu tài chính nội bộ: lưu nguyên bản dưới nhánh **private** riêng
  (ví dụ `private/payment-proofs/<uuid>.<ext>`), không tạo biến thể, không qua
  gateway/CDN public, không xuất hiện trong ZIP ảnh sách hay inventory ảnh sách.
- Đọc ảnh qua API admin chỉ OWNER: `GET /api/v1/admin/orders/{id}/payments/{paymentId}/proof`.
  Kiểm payment thuộc đơn; trả đúng MIME đã lưu, `Cache-Control: private, no-store`,
  `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`. STAFF 403, ẩn danh 401.
- Ghi file tạm → kiểm → chuyển nguyên tử vào chỗ cuối, rồi mới ghi DB trong
  transaction. Transaction lỗi thì xóa file đã chuyển; file mồ côi do sự cố được
  dọn theo cơ chế cleanup có grace hiện có.
- Ảnh chỉ bị xóa khi đơn bị xóa vĩnh viễn khỏi Thùng rác: xóa file **sau** commit
  purge; lỗi xóa file chỉ log mã lỗi, không rollback purge.
- Thư mục private phải nằm trong phạm vi backup/restore media; khi lập plan kiểm lại
  [vận hành ảnh](../runbooks/IMAGE_OPERATIONS.md) và bổ sung nếu chưa gồm.

### 3.4 API

`POST /api/v1/admin/orders/{id}/payments` đổi sang `multipart/form-data`:

| Part | Nội dung |
|---|---|
| `payment` | JSON `{transactionType: DEPOSIT\|REFUND, amount, note?, version, requestId}` |
| `proof` | 1 file ảnh, bắt buộc |

- Thiếu ảnh, nhiều hơn 1 file, loại khác DEPOSIT/REFUND → 400 với `fieldErrors`.
- Idempotency giữ như cũ; fingerprint gồm thêm SHA-256 của ảnh. Replay cùng request
  trả cùng kết quả và không lưu file lần hai; khác ảnh → 409 `idempotency_conflict`.
- Giới hạn multipart của Spring/proxy phải cho ≥ 10 MiB + phần JSON; quá giới hạn
  trả 400/413 có thông báo tiếng Việt, không 500.
- DTO giao dịch thêm `hasProof` (boolean); bỏ `paymentMethod`. Không trả đường dẫn file.

### 3.5 Dữ liệu (migration V39)

Dữ liệu hiện tại là dữ liệu thử, owner cho phép sửa:

- `UPDATE order_payments SET transaction_type='DEPOSIT' WHERE transaction_type='PAYMENT'`.
- Drop cột `payment_method`; CHECK `transaction_type IN ('DEPOSIT','REFUND')`.
- Thêm cột nullable `proof_key`, `proof_mime`, `proof_bytes`, `proof_sha256`; dòng cũ
  để trống. API bắt buộc ảnh cho giao dịch mới, DB không ép NOT NULL.
- Không xóa giao dịch thử.

## 4. Phần B — Trạng thái đơn

### 4.1 Bỏ UNSUCCESSFUL và gửi lại

- Đơn **Hoàn tất** có nút **Hoàn đơn** (thay "Ghi không thành công"). Popup: lý do
  bắt buộc, xác nhận số sách CATALOG thực nhập lại kho từng dòng (0..quantity),
  phần không nhập có lý do như luồng hoàn đơn hiện tại.
- Một command, một transaction: lần giao gần nhất HANDED_OVER → FAILED kèm lý do,
  ghi `order_returns`, cộng tồn CATALOG đúng một lần, đơn → CANCELLED (nhãn
  "Đã hoàn đơn"). Không tự hoàn tiền; tiền hoàn bằng nút Hoàn tiền.
- Đơn Nháp, Đang keep, Đang đóng gói vẫn dùng "Hủy đơn" như cũ.
- Gỡ endpoint `/fail`, `/resend`, `/abort-resend`; `/return` nhận đơn COMPLETED thay
  cho UNSUCCESSFUL. Retry/idempotency/version giữ như hiện tại, không nhập tồn lặp.
- Lịch sử các lần giao (`order_shipments`) giữ nguyên, kể cả bản ghi FAILED/ABORTED cũ.

### 4.2 Đổi nhãn

"Chờ giao" → **"Đang đóng gói"** ở mọi nơi hiển thị: tab, badge, chi tiết đơn,
bill gửi khách, lịch sử thao tác, thông báo. Giá trị `READY_TO_SHIP` giữ nguyên.

### 4.3 Migration dữ liệu thử (cùng V39)

- Đơn UNSUCCESSFUL → COMPLETED (lần giao FAILED vẫn là lịch sử), để owner bấm
  Hoàn đơn nếu cần. Đơn READY_TO_SHIP đang ở lần gửi lại giữ nguyên, bàn giao bình thường.
- CHECK `status` bỏ `UNSUCCESSFUL`.
- Trước khi chạy trên môi trường đích, đếm số đơn UNSUCCESSFUL/PAYMENT/CASH/OTHER để
  ghi vào bằng chứng; local QA không thay gate live.

## 5. Phần C — Danh sách `/admin/orders`

### 5.1 Tab

| Tab (`nhom`, `group` API) | Trạng thái | Nút lọc nhỏ | Thứ tự |
|---|---|---|---|
| Tất cả (trống, `ALL`) | Mọi đơn chưa vào Thùng rác | Không | `created_at` giảm |
| Chờ xử lý (`cho-xu-ly`, `ACTION`) | DRAFT | Không | `created_at` tăng |
| Đang keep (`dang-keep`, `KEEPING`) | KEEPING | Quá hạn, Đến hạn hôm nay, Sắp hết hạn | `keep_until` tăng |
| Đang đóng gói (`dang-dong-goi`, `PACKING`) | READY_TO_SHIP | Không | `created_at` tăng |
| Hoàn tất (`hoan-tat`, `COMPLETED`) | COMPLETED | Không | `completed_at` giảm |
| Hủy/Hoàn (`huy-hoan`, `CLOSED`) | CANCELLED gồm RETURNED | Đã hủy, Đã hoàn đơn | `cancelled_at` giảm |

- Mỗi đơn thuộc đúng một nhóm; tổng năm nhóm bằng Tất cả. Số đếm, bộ lọc ngày,
  lọc khách, ô tìm, đổi tab, trang vượt quá giữ như ORDERS mục 4.1.
- `GET /orders/stats` bỏ `unsuccessful`; `status=UNSUCCESSFUL` hoặc `group` lạ trả 400.
- Link cũ: `status=READY_TO_SHIP` → Đang đóng gói; `status=DRAFT` → Chờ xử lý;
  `status=UNSUCCESSFUL` → Tất cả; còn lại theo quy tắc hiện hành.

### 5.2 Cột (giống nhau ở mọi tab)

| Cột | Nội dung |
|---|---|
| Khách hàng | Tên snapshot trên đơn, dòng phụ là một kênh liên hệ (xem dưới bảng) |
| Mã đơn | Chữ thường, không phải link |
| Ngày tạo | dd/MM/yyyy giờ Việt Nam |
| Số lượng sách | Tổng quantity |
| Tổng đơn | `orderTotal`, chưa có ship thì `goodsTotal` + dòng nhỏ "Tạm tính · chưa có phí ship" |
| Đã cọc | `paidAmount` (cọc − hoàn) |
| Trạng thái | Badge màu (mục 5.3) và cảnh báo hạn keep như hiện tại |
| Hạn keep | "Giữ hết dd/MM/yyyy" khi Đang keep, còn lại "—" |
| Thao tác | Nút ⋮ mở menu |

- Dòng phụ khách: **một** kênh theo thứ tự TikTok → Threads → Zalo kèm nhãn
  ("TikTok: …"), lấy từ hồ sơ khách hiện tại; không có kênh nào thì SĐT snapshot,
  không có SĐT thì "Chưa có SĐT".
- Bỏ cột Ngày bàn giao và Ngày hủy/hoàn (vẫn xem ở chi tiết đơn).
- `OrderSummary` thêm `customerChannel: {type: TIKTOK|THREADS|ZALO, value} | null`,
  tính ở backend bằng join hồ sơ khách trong cùng truy vấn, không N+1.

### 5.3 Badge trạng thái

| Trạng thái | Màu |
|---|---|
| Nháp | Xám |
| Đang keep | Xanh dương |
| Đang đóng gói | Cam |
| Hoàn tất | Xanh lá |
| Đã hủy, Đã hoàn đơn | Đỏ |

Dùng token màu sẵn có (thêm token nếu thiếu), chữ trên nền đạt tương phản WCAG AA
ở cả giao diện sáng và tối; màu không phải tín hiệu duy nhất (luôn có chữ).

### 5.4 Mở đơn và menu ⋮

- Bấm vào dòng mở chi tiết đơn; Ctrl/Cmd + click mở tab mới; bôi chọn chữ không mở.
- Dòng nhận focus bằng Tab, Enter mở đơn; có nhãn trợ năng "Mở đơn DH-…",
  viền focus rõ. Bấm ⋮ hoặc mục trong menu không mở đơn.
- Menu ⋮ chỉ có **Xóa** (chữ đỏ), giữ logic hiện tại: đơn xóa được → mở hộp xác nhận
  chuyển Thùng rác; đơn hủy còn giữ tiền → vẫn hiện Xóa, bấm mở hộp giải thích;
  đơn không thuộc diện xóa → không hiện nút ⋮ (ô trống "—").
- Menu đóng bằng Esc, bấm ra ngoài hoặc chọn mục; focus trả về nút ⋮; điều hướng
  bằng phím mũi tên.

### 5.5 Hình thức

Khung bảng bo góc, header nền xám nhạt, dòng cao thoáng, hover nhẹ. Giữ ô tìm, Bộ lọc,
"＋ Tạo đơn hàng", tab, nút lọc nhỏ, phân trang hiện có. Admin desktop-first; màn hẹp
cuộn ngang trong khung bảng, trang không tràn.

## 6. Tiêu chí nghiệm thu

1. Popup Nhận cọc/Hoàn tiền không có loại, phương thức, thời điểm; thiếu ảnh hoặc ảnh
   sai định dạng/quá 10 MiB không gửi được, cả FE và BE (400).
2. Ghi nhận thành công lưu đúng 1 ảnh; replay cùng `requestId` không tạo giao dịch/file
   thứ hai; khác ảnh trả 409.
3. Ảnh bill chỉ OWNER xem được qua API admin; STAFF 403, ẩn danh 401, payment của đơn
   khác 404; header `no-store`; không có URL public nào trả ảnh.
4. VOID giữ ảnh; purge đơn khỏi Thùng rác xóa file sau commit.
5. Migration V39 trên bản sao dữ liệu thử: PAYMENT thành DEPOSIT, cột phương thức mất,
   UNSUCCESSFUL thành COMPLETED; `paidAmount`, tiền còn giữ, ngưỡng cọc keep không đổi.
6. Hoàn đơn từ Hoàn tất: một lần bấm ra Đã hoàn đơn, tồn cộng đúng một lần kể cả retry;
   tiền không tự hoàn. Không còn nút/endpoint gửi lại.
7. Không còn chữ "Chờ giao" ở admin, bill, thông báo.
8. Sáu tab đúng tập trạng thái, số đếm cộng khớp, link cũ mở đúng tab.
9. Bảng đủ 9 cột theo thứ tự ở mọi tab; dòng phụ khách đúng thứ tự TikTok → Threads → Zalo
   → SĐT; Đã cọc = cọc − hoàn.
10. Dòng mở được bằng chuột, Ctrl/Cmd + click, Tab + Enter; menu ⋮ dùng được bằng bàn phím.
11. Badge đúng màu, đạt tương phản ở sáng/tối; 1440px và 390px không tràn trang.

## 7. Kiểm tra và rollout

- Backend: test tích hợp PostgreSQL thật cho multipart/validation/idempotency/quyền đọc
  ảnh/purge, migration V39, hoàn đơn từ COMPLETED, stats/group mới, `customerChannel`.
- Frontend: test popup tiền, lịch sử có ảnh, nhóm tab/link cũ, cột, dòng phụ khách,
  bàn phím, menu ⋮; `npm test`, `npm run build`.
- Trình duyệt: OWNER ghi cọc có ảnh, xem ảnh lớn, hoàn đơn, các tab, 1440/390, sáng/tối.
- Thứ tự: hai commit trên `dev` — (1) Phần A + B, (2) Phần C. Rollout backend
  (V39) trước frontend; FE cũ không tương thích API tiền mới, nên triển khai hai phía
  sát nhau. Trước V39 trên môi trường đích: backup DB + media theo runbook.

## 8. Tiền COD (owner chốt 26/11)

- Tiệm vẫn có đơn COD song song, nhưng **không ghi tiền COD vào hệ thống**. Tiền COD
  chỉ là số còn thu của đơn (`balance`), J&T thu hộ ngoài hệ thống.
- Bỏ quy định ORDERS mục 10 "khi thực nhận COD, OWNER ghi PAYMENT thủ công".
  Không có nút hay loại giao dịch cho COD; không bắt ảnh đối soát J&T.
- Công thức COD gợi ý, COD needsReview và kiểm mode MONTHLY giữ nguyên. Đơn COD đã
  bàn giao vẫn hiện "Còn thu" và trạng thái thanh toán chưa đủ; đây là hành vi đúng.
