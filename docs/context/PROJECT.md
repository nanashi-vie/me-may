# Tổng quan Mẹ Mây

Tiệm bán sách ngoại văn đã qua sử dụng cho trẻ em. Website giúp khách tìm
sách theo nhu cầu, xem ảnh và giá tham khảo rồi hỏi tiệm. Nhân viên tra cứu
dữ liệu nội bộ; chủ tiệm quản lý sách, khách, đơn và công việc của nhân viên.

| Người sử dụng | Luồng chính | Nguồn quy tắc |
|---|---|---|
| Khách, thường trên điện thoại | Catalogue → chi tiết → quan tâm hoặc sao chép nội dung hỏi mua → Zalo | [Thiết kế public](../product/DESIGN.md) |
| Chủ tiệm | Nhập sách thủ công hoặc từ file, bổ sung ảnh, cập nhật giá và tồn, xuất bản | [Catalogue](../product/CATALOGUE.md), [import](../product/BOOK_IMPORT.md) |
| Chủ tiệm xử lý đơn | Chọn khách, ghi giá chốt, keep hoặc giao ngay, ghi nhận tiền và vận đơn | [Khách hàng](../product/CUSTOMERS.md), [đơn nội bộ](../product/ORDERS.md) |
| Nhân viên | Đọc dữ liệu theo quyền; chấm công bằng hồ sơ và PIN trong phiên OWNER | [Phân quyền](SECURITY.md), [chấm công](../product/ATTENDANCE.md) |

Frontend Angular chạy SSR trên Cloudflare Workers. Spring Boot truy cập PostgreSQL
qua JDBC. Upload ảnh mới dùng bộ lưu trữ self-host; sách cũ có thể dùng Cloudinary.
Khi cần xử lý sự cố, xác định revision, môi trường và provider của cuốn sách trước.
[Xem kiến trúc](ARCHITECTURE.md) và [hạ tầng](INFRASTRUCTURE.md).

Phân kỳ và điều kiện nghiệm thu nằm trong [master plan](MASTER_PLAN.md).
Agent tiếp quản xem [tiến độ](../PROGRESS.md) để biết việc đang mở và
[quyết định](DECISIONS.md) để nhận ra các quy tắc đã đổi sau MVP.
