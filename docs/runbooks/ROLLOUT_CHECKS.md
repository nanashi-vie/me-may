# Kiểm tra nơi lưu trữ và bill trước rollout

Áp dụng khi owner chuẩn bị đưa candidate có V20 hoặc V37 lên môi trường đích.
Dùng dữ liệu tổng hợp trên QA cách ly cho các ca cần ghi. Operator ghi lại
revision backend/frontend, image digest, tên môi trường và phiên bản Flyway.

## Nơi lưu trữ V20

1. Kiểm Flyway trên đích. Với bản sao trước V20, xác nhận migration thêm danh
   mục thùng và khóa ngoại nullable. Kiểm sách cũ và sách import chưa phân thùng.
2. Trên browser, OWNER tạo Thùng 1, lưu sách, mở lại và chọn cùng thùng cho
   sách khác. Tạo/chọn 2 và 10, kiểm thứ tự số. Thử nhập sai/trùng, xác nhận
   dữ liệu form còn nguyên. Hủy form sau khi thêm thùng rồi kiểm thùng còn dùng được.
3. Đổi và bỏ vị trí. Đối chiếu audit và từ chối khi dùng version cũ. Kiểm tiêu đề
   trường và giá trị trên form. Sách chưa phân thùng vẫn lưu và xuất bản theo contract.
4. Lọc danh sách nhiều trang theo từng thùng hoặc Chưa phân thùng, kết hợp với
   bộ lọc khác rồi quay lại từ editor. Kiểm STAFF xem/lọc được, backend từ chối
   tạo/đổi thùng. Kiểm API public và preview không chứa danh mục hoặc vị trí.
5. Ghi kết quả riêng cho create–select–save–reopen–filter. Đối chiếu retry,
   import và contract [nơi lưu trữ](../product/CATALOGUE.md#nơi-lưu-trữ-sách).

## Đơn nội bộ và bill V37

1. Xác định phiên bản thực của Flyway và image đang chạy. Ghi checksum schema,
   bản sao DB/media off-host và kết quả diễn tập restore trên đích cách ly.
   Kiểm schema V34–V36 cho đơn trước khi áp V37 theo chuỗi migration.
2. Diễn tập trên bản sao. V37 thêm cột nullable cho chế độ khách thanh toán.
   Bill cũ có thể chưa có mode. Kiểm dữ liệu cũ, khoản thu và receipt,
   mã trả cước J&T, cách tính số dư và tương thích request gửi lại.
3. Sau khi owner cho rollout, triển khai backend tương thích trước frontend.
   Đối chiếu digest/schema, health, quyền OWNER/STAFF và CSRF qua hostname thật.
   Kiểm public catalogue/cache/SEO sau thay revision. Với QA, kiểm hai tab, bill
   thu hộ và thanh toán theo tháng, ghi thu và tải lại số dư. Chạy ca gửi lại,
   hoàn đơn và kiểm tồn theo contract.
4. Nếu cần rollback, ngừng luồng ghi liên quan, ghi nhận giao dịch phát sinh
   và chọn image tương thích dữ liệu. Giữ đơn, khoản thu, reservation, receipt
   và audit. Đối chiếu trước khi mở lại ghi. Owner ghi lại kết quả/giới hạn ở
   [tiến độ](../PROGRESS.md) và [bằng chứng đơn](../verification/ORDER_VERIFICATION.md).

[Contract đơn](../product/ORDERS.md) · [Runbook triển khai](DEPLOYMENT.md) ·
[Khôi phục media](IMAGE_OPERATIONS.md).
