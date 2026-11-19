# Quyền truy cập và bảo vệ dữ liệu

## Quyền theo luồng

| Luồng | Người được phép | Kiểm tra tại backend |
|---|---|---|
| Catalogue công khai | Khách chưa đăng nhập | Chỉ trả listing công khai và ảnh được phép xem. Bảo vệ cả detail theo slug, lookup và media trực tiếp. |
| Catalogue quản trị | OWNER và STAFF đọc, OWNER ghi | Kiểm quyền khi sửa, xuất bản, thay vị trí và tải ảnh riêng theo từng API. |
| Hồ sơ khách | OWNER ghi, STAFF đọc và tìm | Giới hạn truy vấn vào vùng admin. Chống ghi đè bằng version, lưu lịch sử thay đổi. |
| Đơn nội bộ, tiền và giao hàng | OWNER | Chặn STAFF cả khi đọc. Lịch sử đơn trong hồ sơ khách cũng phải kiểm theo quyền đơn. |
| Chấm công | Phiên OWNER đang đăng nhập, nhân viên xác nhận hồ sơ bằng PIN | PIN có thời hạn xác nhận ca. Giới hạn lần thử và khóa theo hồ sơ. |

Contract chi tiết ở [catalogue](../product/CATALOGUE.md),
[khách hàng](../product/CUSTOMERS.md), [đơn hàng](../product/ORDERS.md)
và [chấm công](../product/ATTENDANCE.md).

## Phiên, media và vận hành

- Spring Security thực thi quyền sau Worker và frontend. Browser gửi cookie phiên
  tới proxy cùng origin. Dùng CSRF cho thao tác ghi, trả no-store ở vùng admin.
  [Cách kiểm local](../runbooks/LOCAL.md).
- Metadata nguồn và ảnh nội bộ chỉ dành cho quyền tương ứng. Origin Nginx chỉ
  đọc derived qua mạng nội bộ. Worker lấy job bằng credential riêng trên cổng
  management. DB/catalogue quyết định quyền kể cả khi bytes vẫn còn trên đĩa.
  [Hệ thống ảnh](../product/IMAGES.md).
- Credential JDBC, token worker và secret Dokploy/Cloudflare Access thuộc môi
  trường vận hành. Khi cần truy cập SSH hoặc Docker, operator kiểm quyền thực tế
  cho tài khoản đang dùng. Ghi nhận revision, kết quả và lỗi đã lược dữ liệu nhạy cảm.
  [Hạ tầng và nguồn xác nhận](INFRASTRUCTURE.md).
- Trước release, đối chiếu runtime DB role với migration role, rate limit đăng
  nhập, cookie/CSRF và quyền trực tiếp qua API trên đúng hostname. Thử đọc
  dữ liệu ẩn qua URL cũ/cache, xác nhận backup off-host phục hồi được DB và
  media. Ghi kết quả theo candidate tại [tiến độ](../PROGRESS.md).
