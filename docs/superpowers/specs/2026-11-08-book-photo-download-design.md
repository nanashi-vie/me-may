# Tải ảnh sách từ trang quản trị

## Hành vi đề xuất

- Trên `/admin/sach`, OWNER dùng checkbox hiện có để chọn một hoặc nhiều cuốn
  trên trang đang xem. Nút **Tải ảnh (N cuốn)** nằm trong thanh thao tác, vô hiệu
  khi chưa chọn hoặc trong lúc đang tạo file.
- Mỗi lượt tải trả một ZIP. Một cuốn có tên file theo mã sách. Nhiều cuốn dùng
  tên chung `me-may-anh-sach.zip`. Trong cả hai trường hợp, mỗi cuốn có thư
  mục theo mã sách với tên ảnh theo vai trò, ví dụ `MM-000019/FRONT.jpg`.
- Lấy mọi ảnh đang gắn với sách, gồm ảnh bổ sung đang ẩn trên web. Đề xuất
  dùng JPEG 1280 px sẵn có của trang quản trị. Sách Ẩn vẫn tải được từ danh
  sách quản trị. Luồng này áp dụng cho sách ngoài Thùng rác.
- Nếu một số cuốn chưa có ảnh, hiển thị mã những cuốn đó và vẫn tải phần
  có ảnh. Nếu cả lượt thiếu ảnh hoặc Cloudinary gặp lỗi, hiện thông báo rõ.
  Lỗi đọc ảnh phải được phát hiện trước khi trả ZIP thành công.

## Cách thực hiện

- Phương án đã chọn là một ZIP chung, chia theo mã sách. ZIP riêng theo
  từng cuốn dễ gửi riêng nhưng tạo nhiều lượt tải khi chọn nhiều sách.
- Backend tạo ZIP từ mã định danh sách đã được kiểm tra quyền OWNER, tái
  sử dụng đường lấy ảnh quản trị. Cách này cho phép dùng trực tiếp cơ chế
  bảo vệ ảnh hiện có. Gom ở trình duyệt sẽ phải tải từng ảnh và thêm logic
  đóng gói phía frontend.
- Giới hạn số cuốn và tổng dung lượng mỗi lượt, dọn dữ liệu tạm khi hoàn
  tất hoặc lỗi. Không đổi schema hoặc quyền ảnh public.

## Nghiệm thu

Kiểm thử tải một cuốn, nhiều cuốn, ảnh bổ sung ẩn, sách thiếu ảnh, lỗi
Cloudinary và quyền truy cập. Kiểm tra nội dung ZIP và thử tải qua nút
trên trang quản trị.
