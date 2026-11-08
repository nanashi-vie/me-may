# Nơi lưu trữ sách

Trạng thái: đã duyệt ngày 08/11/2026.

## Mục tiêu và phạm vi

- Chủ tìm được thùng chứa sách; mỗi mã sách chỉ có một nơi lưu trữ.
- Nếu nhiều bản cùng mã, chủ tự gom về cùng thùng; không phân bổ tồn theo thùng.
- Triển khai cùng đợt: trường ở form nhập/sửa, cột và bộ lọc tại `/admin/sach`.
- Dùng Angular/Spring JDBC hiện có, không thêm dependency hoặc hệ thống kho riêng.

## Các hướng đã cân nhắc

- Nhập trực tiếp số thùng: ít thao tác nhưng dễ sinh vị trí do gõ nhầm.
- Chọn danh sách có sẵn và “Thêm thùng”: dữ liệu thống nhất, tạo vị trí có chủ đích.
  User chọn hướng này; lần đầu tạo Thùng 1, các lần sau chọn lại hoặc thêm thùng khác.

## Hành vi đề xuất

- Nhãn trường: **Nơi lưu trữ**; tùy chọn, mặc định **Chưa phân thùng**.
- Danh sách dùng chung cho mọi sách, hiển thị `Thùng N`, sắp xếp theo số tăng dần.
- “Thêm thùng” mở ô nhập số thùng; chủ nhập số, UI xem trước tên `Thùng N`.
  N là số nguyên dương trong giới hạn integer PostgreSQL; không nhập tên tự do.
- Tạo thành công sẽ chọn ngay thùng mới trong form nhưng chưa lưu sách.
  Thùng được lưu độc lập và vẫn tồn tại nếu chủ hủy form sách.
- Không tạo trùng số, kể cả hai yêu cầu đồng thời; báo rõ thùng đã có và cho chọn lại.
  Thất bại khi tạo không làm mất dữ liệu sách hoặc thay lựa chọn hiện tại.
- Sửa sách mở đúng thùng đã lưu, có thể chọn thùng khác hoặc Chưa phân thùng.
- Cột **Nơi lưu trữ** hiển thị tên thùng hoặc Chưa phân thùng.
- Bộ lọc gồm Tất cả, Chưa phân thùng và các thùng; phối hợp các bộ lọc hiện có.
  Lọc ở backend trước phân trang, về trang đầu khi đổi; giữ khi quay lại danh sách
  theo cơ chế trạng thái/URL hiện hành.
- OWNER tạo thùng và đổi vị trí; OWNER/STAFF xem danh sách thùng, vị trí và lọc.
  Backend kiểm quyền; không trả nơi lưu trữ qua API public/preview public.

## Dữ liệu và tương thích

- Danh mục thùng riêng, số thùng unique; BookCopy tham chiếu tùy chọn tới một thùng.
- Migration chỉ thêm bảng/cột/index cần thiết; sách cũ giữ null, không tự gán Thùng 1.
- Thay vị trí qua luồng lưu sách hiện tại, cùng transaction/version và audit;
  không thay tồn, trạng thái xuất bản hoặc điều kiện publish.
- Payload sửa không có trường vị trí phải giữ giá trị cũ; null chủ động xóa vị trí.
  Kiểm thùng tồn tại, không chấp nhận tham chiếu tùy ý.
- Giữ retry/idempotency hiện tại: payload khác vị trí không được coi là cùng nội dung;
  không làm mất khả năng retry receipt cũ khi bổ sung field.
- Chưa thêm cột import; import cũ tiếp tục hoạt động, sách mới import chưa phân thùng.
- Chưa làm sửa tên/xóa thùng, chuyển hàng loạt hoặc nhiều vị trí trên một mã sách.

## Nghiệm thu

- Tạo Thùng 1, lưu sách, mở lại thấy đúng; sách tiếp theo chọn được Thùng 1.
- Tạo/chọn Thùng 2; Thùng 2 đứng trước Thùng 10; từ chối số sai/trùng.
- Đổi/bỏ vị trí lưu đúng, stale version bị từ chối và audit phản ánh thay đổi.
- Sách cũ/không có vị trí vẫn lưu và xuất bản theo điều kiện hiện hành.
- Cột, lọc từng thùng và Chưa phân thùng đúng trên dữ liệu nhiều trang/kết hợp lọc.
- STAFF đọc/lọc được nhưng không tạo hoặc đổi; public không lộ field/danh mục thùng.
- Kiểm hồi quy tạo/sửa/retry/import, test backend/frontend liên quan, build và
  kiểm tra UI thực tế tạo–chọn–lưu–mở lại–lọc trước bàn giao.

## Phần giao người triển khai

- Chọn tên API/DTO, số migration theo repo tại lúc thực hiện, tái sử dụng control
  và thông báo lỗi hiện có; không cần thay bố cục tổng thể của form/danh sách.
- Các chi tiết đề xuất trong bản này cần duyệt trước writing-plans/implementation.
- Bàn giao trên dev; owner merge main/deploy theo workflow hiện hành.
