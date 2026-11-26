# Nhận cọc, hoàn tiền và ảnh bill — contract hiện hành

Owner chốt 26/11/2026 (`ORDER-MONEY-LIST-01`), thay phần giao dịch tiền của
[ORDERS](ORDERS.md) mục 10. Bằng chứng ở
[ORDER_VERIFICATION](../verification/ORDER_VERIFICATION.md#nhận-cọc-có-ảnh-bill-và-bảng-danh-sách--26112026).

## Giao dịch

- Chỉ có **DEPOSIT** (nhãn "Nhận cọc") và **REFUND** ("Hoàn tiền"). Tiệm bán online
  nên mọi khoản là chuyển khoản; không lưu phương thức.
- `occurred_at` là thời điểm server ghi nhận; không có ô nhập thời điểm thực tế.
  Ảnh bill là bằng chứng thời gian chuyển.
- Mỗi giao dịch bắt buộc **đúng 1 ảnh bill**. Khách cọc nhiều đợt thì ghi nhiều
  giao dịch Nhận cọc.
- `paidAmount` = SUM(DEPOSIT) − SUM(REFUND) của giao dịch chưa VOID. Ngưỡng cọc keep,
  tiền còn giữ ở Thùng rác và COD gợi ý dùng số này.
- Hoàn tiền vẫn bắt xác nhận "tiệm đã hoàn tiền thực tế", không vượt số đang giữ.
  Đơn hủy/hoàn chỉ còn Hoàn tiền, không Nhận cọc mới.
- VOID giữ như cũ: lý do bắt buộc, không sửa/xóa giao dịch; ảnh của giao dịch VOID
  được giữ để đối soát.
- **Tiền COD không ghi giao dịch.** COD chỉ là số còn thu (`balance`) do J&T thu hộ;
  đơn COD đã bàn giao vẫn hiện "Còn thu". Không có nút hay ảnh đối soát J&T.

## Giao diện chi tiết đơn

- Hai nút **Nhận cọc** (ẩn khi đơn hủy/hoàn) và **Hoàn tiền** (chỉ khi `paidAmount > 0`) ở card Thanh toán.
  Form bill ở tab Xuất bill có nút Nhận cọc cạnh dòng Đã nhận, mở cùng popup.
- Popup: Số tiền (VND) *, **Ảnh bill chuyển khoản** * (JPEG/PNG, ≤ 10 MB, có xem trước),
  Ghi chú; Hoàn tiền thêm ô xác nhận hoàn thực tế. Sai định dạng/quá cỡ báo tại ô.
- Lỗi mạng giữ số tiền, ghi chú, ảnh và gửi lại cùng `requestId`.
- Lịch sử thu/hoàn: loại, ảnh nhỏ (bấm mở ảnh lớn, Esc đóng, focus trở về ảnh nhỏ),
  số tiền, ghi chú/VOID. Dòng cũ không ảnh hiện "Không có ảnh". Bill gửi khách không có ảnh.

## API và lưu trữ

- `POST /api/v1/admin/orders/{id}/payments` là `multipart/form-data`: part `payment`
  (JSON `{transactionType, amount, note?, actualConfirmed?, version, requestId}`) và
  đúng 1 file `proof`. Thiếu/thừa file → 400 `fieldErrors.proof`; loại khác → 400;
  file không phải ảnh → 415; quá 10 MiB → 413.
- Fingerprint idempotency gồm SHA-256 ảnh: replay cùng ảnh trả cùng kết quả, không lưu
  file lần hai; cùng `requestId` khác ảnh → 409 `idempotency_conflict`.
- `GET /api/v1/admin/orders/{id}/payments/{paymentId}/proof`: chỉ OWNER, payment phải
  thuộc đơn và có ảnh (404 nếu không); `Cache-Control: private, no-store`,
  `X-Content-Type-Options: nosniff`. DTO giao dịch có `hasProof`, không lộ đường dẫn.
- `PaymentProofStore` kiểm bằng `ImageValidator` (JPEG/PNG, ≤ 25.000.000 pixel), lưu
  nguyên bản tại `<memay.media.local.root>/private/payment-proofs/<uuid>.jpg|png`,
  không tạo biến thể, không qua gateway/CDN public. Transaction lỗi thì xóa file;
  xóa vĩnh viễn đơn khỏi Thùng rác thì xóa file sau commit. `PaymentProofSweep` mỗi giờ
  xóa file tạm `.upload-*.tmp` và ảnh không còn dòng `proof_key` nào, cũ hơn 1 giờ.
- V39: PAYMENT dữ liệu thử thành DEPOSIT, bỏ cột `payment_method`, thêm
  `proof_key/proof_mime/proof_bytes/proof_sha256` (cả bốn cùng null với dòng cũ).
