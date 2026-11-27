# Quyết định chi phối triển khai

| Mốc | Quyết định và lý do | Nguồn áp dụng |
|---|---|---|
| 21–25/10 | Catalogue public ưu tiên điện thoại, admin ưu tiên desktop. Dùng Workers để phục vụ Angular SSR và metadata cho trang chia sẻ. | [Thiết kế](../product/DESIGN.md), [kiến trúc](ARCHITECTURE.md) |
| 27/10 | Bàn giao qua dev; owner kiểm soát lần đưa lên main và môi trường thật. | [Quy tắc Git](../../AGENTS.md) |
| 31/10 | Import tạo nguyên lô sách Ẩn sau kiểm tra. Receipt giúp retry an toàn, chủ bổ sung ảnh rồi xuất bản. | [Import](../product/BOOK_IMPORT.md) |
| 04/11 | Backend chuyển hướng sang Dell/Dokploy qua Cloudflare Tunnel. Các số đo Render/Neon thuộc môi trường thử trước đó. | [Hạ tầng](INFRASTRUCTURE.md) |
| 06/11 | Chủ quản lý tồn gộp theo mã MM, giữ dòng biến thể legacy cho tương thích. Tình trạng và giá từng bản được chốt khi trao đổi. | [Dữ liệu](DATA.md) |
| 07–08/11 | Bộ lọc thiếu thông tin hỗ trợ bổ sung dữ liệu. Danh sách thùng dùng số duy nhất, tạo có chủ đích để tránh phát sinh vị trí do gõ sai. | [Catalogue](../product/CATALOGUE.md) |
| 09/11 | Chấm công dùng phiên OWNER và PIN để xác định hồ sơ. Lịch đăng ký độc lập với số giờ thực tế. | [Chấm công](../product/ATTENDANCE.md) |
| 12/11 | Tiếp tục phục vụ ảnh Cloudinary cũ, dùng LOCAL cho upload mới. Thiếu nguồn đã xác minh được cảnh báo trong admin để chủ có thể tiếp tục xuất bản. | [Ảnh](../product/IMAGES.md) |
| 12–18/11 | Thêm hồ sơ khách và đơn riêng trong admin để thay dần sổ Excel. Giá chốt, keep, thu tiền, giao và hoàn theo đơn nội bộ. Public vẫn hỏi mua qua tin nhắn. | [Khách](../product/CUSTOMERS.md), [đơn](../product/ORDERS.md) |
| 18/11 | Dùng một chỉ mục theo đầu việc. Contract, runbook, bằng chứng và snapshot có nơi cập nhật riêng để agent khác có thể tiếp quản. | [Chỉ mục](../README.md) |
| 25/11 | Thùng rác chung cho sách, khách, đơn. Xóa khách Đã lưu trữ không có đơn và đơn Nháp chưa có tiền hoặc Đã hủy/Đã hoàn đơn không còn giữ tiền (đã hoàn hết hoặc vô hiệu); dọn đơn xóa luôn lịch sử giao dịch. Giữ đơn còn tiền và khách có đơn. Nhãn Đã hủy và Đã hoàn đơn tách riêng. | [Thùng rác](../product/TRASH.md) |
| 27/11 | Khi backend không phản hồi (530/52x/502/504/lỗi mạng), public thay cả trang bằng màn "Tiệm tạm nghỉ" trả 503 + Retry-After và tự tải lại khi origin sống; admin giữ trang với banner, không bị đẩy ra đăng nhập. Chỉ tự phát hiện; bảo trì thủ công và uptime monitor để sau. | [Máy chủ không phản hồi](../product/OUTAGE.md) |
