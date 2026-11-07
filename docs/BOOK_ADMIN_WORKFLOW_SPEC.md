# Ảnh bổ sung, đặc điểm, thùng rác và hàng chờ xuất bản

Đề xuất 07/11/2026. Đã chốt hướng danh sách ghim bên phải kèm nút xuất bản
và mở cuốn tiếp theo. Các hành vi cụ thể bên dưới chờ duyệt trước khi viết code.

## Hướng đã chọn

Danh sách ghim dùng khoảng trống bên phải form desktop và cho phép mở cuốn
bất kỳ. Popup chỉ mở khi bấm làm tăng số thao tác trên desktop, nhưng phù hợp
với màn hình hẹp. Chỉ thêm nút sang cuốn tiếp theo sẽ nhanh khi làm đúng thứ
tự, nhưng khó nhảy đến cuốn đang có sẵn ảnh. Phương án đã chọn kết hợp danh
sách ghim và nút sang cuốn tiếp theo.

## Hàng chờ trên trang chỉnh sửa

- Dùng bộ lọc hiện có **Chưa từng xuất bản**. Sách đủ điều kiện khi đang Ẩn,
  chưa có ngày xuất bản đầu tiên và chưa bị xóa mềm. Dùng thứ tự hiện có ở
  danh sách quản trị, cập nhật mới nhất trước rồi đến ID giảm dần.
- Desktop có panel ghim bên phải, cuộn riêng. Màn hình hẹp mở danh sách từ nút
  **Chưa xuất bản (N)**. Mỗi dòng có tên và mã, đánh dấu cuốn đang mở. Dùng
  tìm kiếm tên/mã và phân trang hiện có để truy cập các cuốn ngoài trang đầu.
- Giữ **Xuất bản** để ở lại cuốn hiện tại. Với sách thuộc hàng chờ, thêm
  **Xuất bản và mở cuốn tiếp theo**, chạy cùng thao tác lưu/xuất bản hiện có.
  Sau khi server xác nhận thành công, làm mới danh sách và mở cuốn đầu tiên
  còn đủ điều kiện theo thứ tự trên. Bộ lọc tìm kiếm trong panel chỉ áp dụng
  cho thao tác chọn tay. Nếu hết sách hoặc tải danh sách lỗi, ở lại cuốn vừa
  đăng và báo kết quả tương ứng.
- Xuất bản thất bại hoặc kết quả chưa rõ thì ở lại form, giữ thay đổi và cho
  đối chiếu theo luồng hiện có. Chuyển cuốn bằng panel phải dùng kiểm tra
  thay đổi chưa lưu và xử lý tải ảnh đang chạy như khi rời trang.
- Kiểm thử qua nhiều cuốn liên tiếp, lần cuối, chuyển cuốn khi form đang sửa,
  lỗi lưu và hiển thị trên desktop/màn hình hẹp.

## Ảnh 7 và 8

- Hai vai trò bổ sung có lựa chọn **Hiện trên trang sách** độc lập từng ảnh,
  mặc định tắt với ảnh hiện có và ảnh mới. Lưu cùng thao tác lưu sách. Khi
  thay file trong một vai trò bổ sung, ảnh mới bắt đầu ở trạng thái tắt.
- Sách đã xuất bản có thể hiển thị tối đa tám ảnh. Ảnh bổ sung đã bật nằm
  sau sáu vai trò công khai. Bìa trước và bìa sau vẫn là điều kiện xuất bản.
- Backend dùng cùng quy tắc visibility cho dữ liệu public, gallery và đường
  dẫn ảnh trực tiếp. Khi tắt, endpoint ảnh không cấp quyền public và cache
  công khai được làm mới theo cơ chế hiện có. Kiểm tra ảnh cũ, bật một ảnh,
  bật cả hai và tắt lại, bao gồm truy cập trực tiếp với tư cách khách.

## Đặc điểm

- Đổi nhãn TOUCH thành **Sờ chạm/Đục lỗ**. Thêm **Tìm kiếm** và **Tương tác
  khác** vào các lựa chọn mới. Giữ **Xoay chuyển** trên sách đã gắn SPIN và
  bỏ SPIN khỏi danh sách gán mới, vì hai đặc điểm khác nghĩa. Chủ tiệm có
  thể gỡ hoặc thay nhãn cũ khi sửa sách.
- Giữ thứ tự đã lưu và giới hạn ba đặc điểm mỗi cuốn. Kiểm tra các nhãn ở
  form, thẻ và trang chi tiết, gồm sách đã gắn nhãn cũ.

## Xóa mềm

- Icon thùng rác bên phải cột **Cập nhật** tại `/admin/sach`, có nhãn trợ
  năng và xác nhận theo tên/mã sách. Chỉ OWNER được xóa và khôi phục. Giữ
  mã sách, ảnh, tồn, dấu mốc xuất bản và audit. Kiểm tra version khi ghi.
- Sách vào **Thùng rác**, rời danh sách thông thường, hàng chờ, kết quả chọn
  sách quản trị, catalogue công khai và endpoint ảnh công khai. Vô hiệu
  cache sau commit. Link public của sách đã xóa trả 404.
- Khôi phục từ Thùng rác đưa sách về **Ẩn**. Sách chưa từng đăng có thể vào
  lại hàng chờ. Sách từng đăng vẫn được nhận diện là đã từng xuất bản.
- Đề xuất giữ cấu hình ghim và Flash Sale đã gán như khi Ẩn. Sách vắng mặt
  khỏi các kệ và Flash Sale trong lúc bị xóa hoặc Ẩn. Sau khi chủ tiệm chủ
  động đăng lại, cấu hình còn hiệu lực mới có thể hiển thị trở lại.
- Đề xuất giữ tên sách trong Thùng rác trong phạm vi kiểm tra trùng để có
  thể khôi phục theo mã cũ. Import lại đúng file cũ vẫn trả biên nhận đã
  lưu. Kiểm tra quyền, xóa/khôi phục sách từng đăng, ảnh public và hàng chờ.

Chi tiết migration, API và tên trường lưu trữ sẽ được chọn ở bước lập kế
hoạch, sau khi thiết kế được duyệt.
