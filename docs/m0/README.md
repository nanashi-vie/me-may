# M0 — phạm vi, dữ liệu và UX

Ngày: 21/10/2026. Trạng thái: **bản thiết kế để review; M0 đang làm**. Không phải scaffold hoặc code ứng dụng.

## Quyết định hiện tại

- Dùng [master plan v3.2](../Me-May_MASTER_PLAN_v3.2_2026-10-21.md). Database tự quản PostgreSQL trên VPS/Dokploy; Angular tiếp tục Cloudflare; Spring Boot trên VPS/Dokploy; ảnh Cloudinary. Không cần SDK, auth, pooler hoặc workflow của nhà cung cấp database cũ.
- Home theo bố cục [ảnh tham khảo người dùng cung cấp](../nxbkimdong.com.vn.png): header/tìm kiếm, menu danh mục, banner ngang lớn, nhiều hàng sách theo nhóm, banner xen kẽ và footer. Chỉ tham khảo cấu trúc; không lấy logo, bìa sách, chính sách freeship, sale hoặc nội dung của NXB Kim Đồng làm dữ liệu Mẹ Mây.
- Giữ MVP A+B: catalogue + danh sách quan tâm + hỏi mua ngoài web + admin desktop. Không thêm order/checkout để làm giống website tham khảo.
- Giữ `code/frontend`, `code/backend`, `database`, `docs` đang có; cấu trúc bên trong xem [repository structure](repository-structure.md).

## Bộ tài liệu M0

| Đầu ra | Tài liệu | Trạng thái |
|---|---|---|
| Phạm vi, sitemap và luồng | Tài liệu này | Bản review |
| Home theo ảnh mẫu | [Home brief](home-brief.md), [desktop wireframe](wireframes/home-desktop.svg), [mobile wireframe](wireframes/home-mobile.svg) | Low-fidelity, chưa duyệt style |
| Các màn hình còn lại | [Screen specifications](screens.md), [screen board](wireframes/screens.svg) | Low-fidelity, cần review |
| Field schema và kiểm tra dữ liệu | [Pilot data guide](pilot-data.md), [fixture 12 bản ghi](fixtures/synthetic-books.csv) | Dữ liệu giả lập rõ nhãn, chưa phải pilot thật |
| Cấu trúc thư mục | [Repository structure](repository-structure.md) | Đề xuất, chưa scaffold |
| Tiêu chí qua M0 | Checklist cuối tài liệu này | Chưa đủ điều kiện hoàn tất |

## Sitemap và nhiệm vụ từng trang

| Route gợi ý | Vai trò | Hành động chính |
|---|---|---|
| `/` | Home nhiều hàng sách | Tìm kiếm, mở nhóm, xem cuốn |
| `/sach` | Catalogue đầy đủ | Tìm/lọc/sắp xếp/phân trang; filter lưu URL |
| `/bo-suu-tap/:slug` | Nhóm biên tập | Duyệt các cuốn thuộc nhóm |
| `/sach/:slug` | Chi tiết một cuốn vật lý | Xem ảnh và lỗi; thêm quan tâm; sao chép mã/link; hỏi qua chat |
| `/quan-tam` | Danh sách cục bộ trên thiết bị | Xem trạng thái mới; xóa; sao chép nhiều cuốn; mở kênh chat |
| `/gioi-thieu`, `/cach-mua`, `/lien-he` | Nội dung cửa hàng | Đọc thông tin thật, chọn liên hệ |
| `/admin/dang-nhap` | Đăng nhập quản trị | Xác thực Owner/Staff |
| `/admin/sach` | Bảng quản trị | Tìm mã, mở editor, xem trạng thái |
| `/admin/sach/moi`, `/admin/sach/:id` | Editor | Nhập cuốn/listing, ảnh, preview, xuất bản/ẩn theo quyền |
| `/admin/danh-muc`, `/admin/bo-suu-tap` | Biên tập taxonomy | Quản lý nhóm và thứ tự hiển thị |

Các tên route là thiết kế, chưa khóa OpenAPI hoặc cấu trúc controller.

## Luồng và các trạng thái cần nhìn thấy

Khách vào Home → mở nhóm/tìm kiếm → chi tiết cuốn → thêm quan tâm hoặc sao chép mã/link → Facebook/Zalo → cửa hàng xác nhận và chốt. Bấm liên hệ không giữ sách hoặc thay đổi khả dụng.

Quản trị tạo nháp → nhập dữ liệu/ảnh thật → preview → Owner xuất bản → người có quyền cập nhật sold sau khi chốt ngoài web. Cùng tên vẫn có mã và trang riêng cho từng cuốn.

Danh sách quan tâm đọc lại trạng thái từ API khi mở; nếu API lỗi, ghi “Chưa kiểm tra được tình trạng” thay vì coi cache là còn hàng. Cuốn đã bán được cảnh báo; cuốn ẩn/không tìm thấy hiển thị không còn công khai, không lộ lại dữ liệu nháp. Chỉ sao chép thông tin công khai đã xác nhận, kèm lưu ý không giữ sách.

Publication: `DRAFT` / `PUBLISHED` / `ARCHIVED`; availability: `AVAILABLE` / `HELD` / `SOLD`. Hai nhóm độc lập. SOLD không tự archive; trang chi tiết vẫn tồn tại nếu còn published. HELD là trạng thái thủ công, không có timer.

## Quyền đề xuất để review

| Thao tác | STAFF | OWNER |
|---|---|---|
| Xem quản trị, tạo/sửa nháp và ảnh nháp | Có | Có |
| Preview nháp được bảo vệ | Có | Có |
| Xuất bản/ẩn/khôi phục listing | Không | Có |
| Đổi giá/nội dung/ảnh/khả dụng của cuốn đang công khai | Không | Có |
| Sửa taxonomy/bộ sưu tập/thông tin liên hệ | Không | Có |
| Quản lý tài khoản | Không | Có |

Mặc định này làm rõ ranh giới “Staff nhập nháp” trong master plan; nếu cần nhân viên đánh dấu sold, bổ sung quyền riêng qua quyết định được ghi lại. Không mở rộng quyền qua UI đơn thuần.

## Hạ tầng sau thay đổi

Frontend vẫn cần spike deployed HTML/SEO/OG trên Cloudflare; không tự chuyển SSR sang VPS. Spring và PostgreSQL có thể cùng VPS ban đầu nhưng tách service, database role và volume. Không public DB port. PostgreSQL tự quản đồng nghĩa dự án chịu trách nhiệm vận hành, nâng cấp và backup ngoài VPS.

Dokploy có hỗ trợ quản lý PostgreSQL và backup; backup chỉ có giá trị nghiệm thu khi restore được. Tài liệu chính thức: [Dokploy databases](https://docs.dokploy.com/docs/core/databases), [PostgreSQL SQL dump](https://www.postgresql.org/docs/current/backup-dump.html). Chưa có server, secret, volume hoặc backup nào được tạo trong M0.

## Điều kiện qua M0

- [x] Ghi nhận thay đổi hạ tầng và xác nhận Angular tiếp tục Cloudflare.
- [x] Xác định bố cục Home từ screenshot và phạm vi A+B.
- [x] Soạn sitemap, wireframe và hướng tổ chức repo để review.
- [x] Soạn field schema và fixture giả lập đủ các trạng thái quan trọng.
- [ ] Người dùng review bố cục Home và các màn hình; thống nhất quyền Owner/Staff và taxonomy khởi điểm.
- [ ] Chủ chọn 10–20 cuốn thật; có mã, giá, mô tả tình trạng, ảnh bìa/ảnh lỗi và xác nhận dữ liệu.
- [ ] Thử điền dữ liệu thật theo mẫu, ghi thời gian/các trường khó nhập và chỉnh schema nếu cần.
- [ ] Chốt link liên hệ thật và nội dung hướng dẫn mua; không giả định chính sách NXB Kim Đồng áp dụng cho Mẹ Mây.
- [ ] Ghi kết quả review/pilot vào DEV_LOG rồi tạo technical specification cho phần triển khai tiếp theo.

Không đánh dấu M0 hoàn thành từ việc có 12 bản ghi giả lập. Chưa có bản Word gửi chủ trong đợt này; nếu cần, biên soạn từ phạm vi đã review thay vì gửi nguyên tài liệu kỹ thuật nội bộ.
