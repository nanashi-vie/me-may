# Thao tác từ danh sách sách quản trị

Thùng rác: [TRASH](TRASH.md).
Quy tắc aggregate, version và audit chung tại [CATALOGUE](CATALOGUE.md), UI tại [DESIGN](DESIGN.md#hàng-chờ-và-thùng-rác).

## Đánh dấu hết hàng từ danh sách (25/11/2026)

- `POST /api/v1/admin/books/sold-out` nhận `{items: [{id, version}]}` 1–100 cuốn,
  dùng cho cả từng cuốn và hàng loạt; chỉ OWNER. Trả `[{id, version, totalStock,
  availability, updatedAt}]` để giao diện cập nhật tại chỗ.
- Đưa tồn còn bán về 0 và khả dụng SOLD; áp dụng cả sách Ẩn. Không đổi xuất bản,
  không đụng phần đang keep: bỏ/hủy keep vẫn cộng tồn lại và sách thành AVAILABLE.
- Một giao dịch: khóa dòng theo ID tăng dần, sai version của bất kỳ cuốn nào trả
  409 `version_conflict` và không cuốn nào đổi; sách trong Thùng rác 409
  `book_trashed`. Cuốn đã 0 là no-op. Audit `SOLD_OUT` và làm mới cache public.

## Tải ảnh sách từ trang quản trị

- OWNER chọn tối đa 20 cuốn trên trang hiện tại ở `/admin/sach`, rồi bấm
  **Tải ảnh**. Một cuốn nhận `<mã sách>.zip`, nhiều cuốn nhận
  `me-may-anh-sach.zip`. Ảnh trong ZIP có đường dẫn `<mã sách>/<vai trò>.jpg`.
- `GET /api/v1/admin/books/photo-download?ids=1&ids=2` lấy JPEG 1280 px
  của tất cả ảnh ACTIVE, gồm ảnh bổ sung đang ẩn. Sách Ẩn được tải, sách
  trong Thùng rác bị từ chối. ZIP chỉ trả sau khi tạo xong, có `no-store`.
- Giới hạn 32 MiB dữ liệu ảnh và một lượt tạo ZIP đồng thời mỗi instance.
  Sách thiếu ảnh được ghi trong `X-Missing-Book-Codes` để UI báo mã sách.
  Nếu cả lượt thiếu ảnh, vượt giới hạn hoặc đọc ảnh lỗi, UI hiện thông báo.
