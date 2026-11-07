# Rà soát thông tin và kiểu bìa sách

Thiết kế ngày 07/11/2026. Phạm vi thay thế quy tắc kiểu bìa chỉ dành cho
Picture book và mở rộng hàng chờ xuất bản hiện hành.

## Cách tổ chức

Gom các điều kiện vào nút **Bộ lọc** tại `/admin/sach`, theo mẫu tương tác
trang khách. Giữ các điều kiện trạng thái xuất bản, khả dụng, thể loại và kiểu
bìa. **Chưa xuất bản** nghĩa là chưa từng đăng, tách khỏi trạng thái **Ẩn**.
**Thiếu thông tin** là một lựa chọn duy nhất, lấy mọi cuốn còn ít nhất một
trường cần bổ sung. Có thể kết hợp với các điều kiện sẵn có. Phương án lọc
riêng theo từng trường đã được bỏ để mở danh sách cần rà bằng một thao tác.

Hàng chờ ghim bên phải trang sửa có hai mục **Chưa xuất bản** và **Thiếu thông
tin**, giữ tìm tên/mã và phân trang. Một cuốn có thể thuộc cả hai mục. Sách
đang hiển thị, đang ẩn hoặc đã bán đều có thể thuộc mục Thiếu thông tin.
Thùng rác nằm ngoài phạm vi của cả hai mục. Mỗi dòng sách thiếu hiển thị lý
do. Thao tác **Xuất bản và mở cuốn tiếp theo** dùng nhóm Chưa xuất bản.
Trong nhóm Thiếu thông tin, **Lưu và mở cuốn tiếp theo** lưu rồi chuyển
sang cuốn khác còn khớp hàng chờ.

## Trường cần rà

- Xét tên, thể loại, kiểu bìa khi áp dụng, nhà xuất bản, tác giả, ngôn ngữ,
  hai đầu khoảng giá, trọng lượng, đơn giá/kg, mô tả, nhóm tuổi, trình độ đọc,
  link video, bộ sưu tập, đặc điểm, ảnh mặt trước và ảnh mặt sau.
- Bỏ qua ISBN và ghi chú nội bộ theo yêu cầu. Đề xuất loại khỏi tiêu chí rà
  các trường hệ thống, tình trạng legacy, các vị trí ảnh tùy chọn và metadata
  ảnh. Tồn kho bằng 0 là giá trị hợp lệ.
- Giá trị null, văn bản chỉ có khoảng trắng, danh sách rỗng, hoặc trạng thái
  nghiệp vụ **Chưa xác định** được tính là thiếu. Chỉ xét kiểu bìa khi đã
  chọn thể loại khác Board book. Ảnh bìa xét ảnh đang gắn và có hiệu lực.
- Dùng cùng quy tắc cho bộ lọc, tổng số và lý do hiển thị. Lọc trước khi phân
  trang. Việc đưa trường tùy chọn vào danh sách rà không đổi điều kiện xuất bản.

## Kiểu bìa

Mỗi cuốn giữ một thể loại. Mọi thể loại ngoài Board book có kiểu bìa
**Paperback** hoặc **Hardcover**. Board book không áp dụng kiểu bìa.
Form lưu sách ẩn có thể để trống, thao tác xuất bản yêu cầu chọn khi áp dụng.
Sách cũ đang hiển thị mà thiếu kiểu bìa giữ trạng thái hiện tại và vào danh
sách rà. Không suy đoán kiểu bìa. Khi sửa một sách cũ đang hiển thị, cho lưu
các chỉnh sửa khác khi kiểu bìa vốn đã thiếu và thể loại giữ nguyên.
Khi đổi sang thể loại áp dụng kiểu bìa hoặc xóa kiểu bìa đang có, sách
đang hiển thị phải có kiểu bìa hợp lệ khi lưu.

Mở rộng bộ lọc khách cho các thể loại áp dụng. Đề xuất cập nhật mẫu CSV/Excel
và bước kiểm tra để nhận hai kiểu bìa theo quy tắc mới. File mẫu cũ thiếu
kiểu bìa vẫn có thể nhập sách ẩn để bổ sung sau. Giữ việc chặn trùng tên
và bước kiểm tra lại trước xác nhận.

## Lưu thay đổi và quay lại

Đặt **Lưu thay đổi và quay lại** cạnh **Lưu thay đổi**. Chỉ chuyển trang
sau khi lưu thành công. Khi lưu lỗi, giữ form và dữ liệu đang sửa.

- Giữ từ khóa, bộ lọc và thứ tự sắp xếp từ danh sách gốc. Nếu cuốn vừa lưu
  vẫn khớp, tìm trang chứa cuốn theo thứ tự hiện tại rồi cuộn tới và làm
  nổi dòng. Cuốn có thể đổi trang khi sắp xếp theo cập nhật mới nhất.
- Nếu cuốn rời kết quả, quay về trang cũ hoặc trang cuối còn kết quả, giữ
  điều kiện lọc, khôi phục vị trí gần chỗ đang làm và báo đã lưu.
- Khi mở trang sửa trực tiếp, dùng danh sách mặc định. Khi đổi cuốn qua
  hàng chờ, giữ ngữ cảnh danh sách ban đầu và tìm theo cuốn vừa lưu.

## Kiểm tra nghiệm thu

Kiểm tra sách đã đăng, đã bán, đang ẩn, chưa từng đăng và trong Thùng rác.
Đối chiếu số đếm và lý do thiếu trên danh sách chính và hàng chờ. Kiểm
tra Board book, sách cũ thiếu kiểu bìa, cả hai kiểu bìa ở một thể loại khác
Picture book và mẫu import cũ. Kiểm tra quay lại khi dòng ở nguyên trang,
đổi trang, rời bộ lọc, trang cũ trống hoặc lưu thất bại.
