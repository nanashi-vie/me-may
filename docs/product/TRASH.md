# Thùng rác chung — Sách, Khách hàng, Đơn hàng

Owner duyệt 25/11/2026. Thay "không xóa cứng khách" và "không thêm cơ chế xóa dữ
liệu đơn" trước đây, chỉ trong đúng các điều kiện dưới đây. Chỉ OWNER; STAFF 403.

## Điều kiện và vòng đời

| Loại | Được chuyển vào Thùng rác khi | Khôi phục về |
|---|---|---|
| Sách | Không có reservation ACTIVE | Ẩn |
| Khách hàng | Đã lưu trữ và không có đơn nào, kể cả đơn trong Thùng rác | Đã lưu trữ |
| Đơn hàng | Nháp chưa từng có giao dịch tiền (kể cả đã vô hiệu); hoặc Đã hủy/Đã hoàn đơn có tiền còn giữ bằng 0 | Trạng thái trước đó |

- Giữ 7 ngày rồi job xóa vĩnh viễn; OWNER có thể Dọn sớm. Không nhập lý do.
- Trong Thùng rác, khách và đơn không có ở danh sách, tìm kiếm, thống kê, số đơn,
  tra trùng SĐT, chọn khách; mở hoặc sửa theo ID trả 404.
- Tiền còn giữ = thu − hoàn, không tính giao dịch đã vô hiệu. Đơn còn giữ tiền, đơn
  đang keep/chờ giao/hoàn tất/không thành công và khách có đơn không bao giờ bị xóa.
  Điều kiện được kiểm lại lúc dọn và trong job.
- Dọn đơn xóa dòng sách, reservation, kiện, hoàn hàng, ghi chú và lịch sử giao dịch
  của đơn đó (hộp thoại dọn nói rõ);
  không đổi tồn. Receipt chống lặp giữ lại với `order_id` rỗng. Mã không tái dùng.
- Audit ghi TRASHED, UNTRASHED, PURGED cùng người, thời điểm, ID; không chép
  tên, SĐT, địa chỉ. Tự xóa khi hết hạn không có người thực hiện nên không ghi audit.

## API khách hàng và đơn hàng

Prefix `/api/v1/admin/customers` và `/api/v1/admin/orders`, cùng một dạng:

| Method | Path | Kết quả |
|---|---|---|
| GET | `/trash?page&size` | Page `{id, code, name, version, deletedAt, expiresAt}` |
| GET | `/trash/selection` | `[{id, version}]` mọi trang, dùng cho Dọn tất cả |
| PATCH | `/{id}/trash` | `{version, trashed}` → 204 |
| POST | `/trash/purge` | `{items: [{id, version}]}` → 204, cùng thành công hoặc cùng thất bại |

409: `version_conflict`, `customer_not_archived`, `customer_has_orders`,
`order_not_trashable`, `order_has_payments` (Nháp), `order_holds_money`, `trash_expired`, `trash_changed`.
Danh sách khách/đơn trả `trashable` cho OWNER; STAFF luôn `false`.
V38 thêm `deleted_at` nullable và index hết hạn cho `customer`, `orders`; không đổi
dữ liệu cũ. Triển khai backend trước frontend. Rollback backend về trước V38 làm
mục trong Thùng rác hiện lại ở danh sách; không drop cột khi còn dữ liệu.

## Giao diện

- `/admin/thung-rac?loai=sach|khach-hang|don-hang`, mục Thùng rác trong sidebar
  (OWNER). Mỗi tab có Khôi phục, chọn nhiều để Dọn, Dọn tất cả của tab đang mở.
  Trang Sách không có nút Thùng rác riêng.
- Danh sách Khách và Đơn có cột Thao tác căn giữa, chỉ OWNER; dòng không đủ điều
  kiện hiện "—"; đơn hủy/hoàn còn giữ tiền hiện thùng rác xám,
  bấm vào chỉ nêu số tiền cần hoàn trước. Bấm thùng rác mở hộp thoại, nút Hủy được focus sẵn; lỗi báo ngay
  trong hộp thoại và danh sách tự tải lại. Không có nút xóa ở trang chi tiết.
- Danh sách Đơn bỏ link Xem: bấm cả dòng mở chi tiết, Ctrl/Cmd mở tab mới, đang bôi
  chữ thì không chuyển trang; mã đơn vẫn là link cho bàn phím.

## Sách

- OWNER chuyển vào Thùng rác tại `/admin/sach`. API
  `GET /api/v1/admin/books/trash` phân trang. `PATCH /api/v1/admin/books/{id}/trash`
  nhận `{version, trashed}`. Cập nhật version, audit và cache cùng luồng ghi.
- Xóa mềm chuyển listing sang Ẩn và loại khỏi danh sách thường. Khôi phục
  trước hạn đưa về Ẩn, giữ ngày xuất bản đầu tiên, ghim và Flash Sale.
- Hạn là bảy ngày kể từ lúc xóa. Job mặc định chạy mỗi mười phút, khóa dòng
  và dọn theo lô. Ảnh giữ trạng thái dọn để có thể thử lại khi Cloudinary lỗi.
  Audit và receipt giữ dấu vết lịch sử. Tên sách được dùng lại sau khi dọn.

- OWNER có thể chọn từng sách hoặc toàn bộ trang hiện tại để chuyển vào
  Thùng rác. Trong Thùng rác, **Dọn** áp dụng cho sách đã chọn. **Dọn tất
  cả** tải danh sách mọi trang qua `GET /api/v1/admin/books/trash/selection`.
  Hộp thoại xác nhận số cuốn, phạm vi và xóa ảnh vĩnh viễn, kể cả trước hạn.
- `POST /api/v1/admin/books/trash/bulk` nhận `{items: [{id, version}], permanent}`.
  Ghi theo lô trong một giao dịch. Dọn vĩnh viễn chỉ nhận sách còn trong
  Thùng rác với đúng version. Sách vào Thùng rác sau khi mở hộp thoại
  không thuộc lần dọn đó. DB xóa sách khi xác nhận thành công và tác vụ
  ảnh thử lại Cloudinary nếu nhà cung cấp chưa xác nhận đã xóa.
