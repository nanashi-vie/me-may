# Bill gửi khách và cân kiện gợi ý — contract hiện hành

Owner chốt 25/11/2026. Phần mở rộng của [đơn nội bộ](ORDERS.md), chỉ frontend.

## Cân kiện gợi ý

- Xuất bill và Chuẩn bị gửi lại tự điền Trọng lượng sau đóng gói = tổng trọng lượng
  sách + 1.000 g (cố định trong code, đơn nhỏ cũng cộng đủ), kèm dòng
  "Sách 850 g + 1.000 g đóng gói". Ô vẫn sửa được. Đây là số ước tính, thay quy định
  buộc nhập số cân thật trước đây.
- Sửa thông tin bill giữ số đã lưu, không có dòng gợi ý.
- Có sách thiếu trọng lượng: để trống, ghi "Chưa đủ trọng lượng sách, nhập số cân thật".
- Tải lại do đơn đổi: chưa sửa ô thì tính lại; đã sửa hoặc xóa trắng thì giữ nguyên.
  Vẫn phải bấm "Đã kiểm tra lại COD và cân nặng".

## Bill để chụp màn hình

- Nút "Xem bill gửi khách" ở cả hai tab chi tiết đơn, chỉ OWNER, khi đơn có ít nhất một
  sách và không phải Đã hủy/Đã hoàn đơn. Không có link công khai, tải ảnh hay in.
- Hiện: Mẹ Mây, Sách ngoại văn cho bé, tên khách, ngày tạo đơn; mỗi dòng tên sách,
  SL × đơn giá, thành tiền; các khoản tiền bên dưới.
- Không hiện: mã đơn, mã khách, SĐT, địa chỉ, trọng lượng, COD, mã sách, nguồn sách,
  ghi chú, thông tin chuyển khoản, giảm giá.

| Trường hợp | Bill hiện |
|---|---|
| Đã lưu bill | Tiền sách (n quyển), Phí ship, Tổng bill, Đã thanh toán, dòng cuối |
| Phí ship bằng 0 | Phí ship Miễn phí |
| Chưa lưu bill hoặc đã mở lại | "Tạm tính, chưa gồm phí ship"; không có Phí ship, dòng tổng là Tạm tính |
| Dòng cuối | Cần thanh toán / Đã thanh toán đủ / Tiền thừa |

- Số tiền lấy từ `totals` và `shippingFee` hiện tại của đơn do backend tính. Tiền sách là
  `goodsTotal`; đơn cũ có giảm giá thì đã trừ sẵn. Chưa lưu bill: cần thanh toán = tiền sách − đã nhận.
- Khung 560px, màu cố định, nút nằm ngoài khung bill. 12 dòng mỗi trang, có "Trang 1/3"
  khi nhiều trang, phần tiền chỉ ở trang cuối. Tên dài xuống dòng, không cắt, nên trang
  nhiều tên dài có thể phải cuộn.
- Đóng bằng Esc hoặc nút trả focus về nút mở; mở lại từ trang 1.
