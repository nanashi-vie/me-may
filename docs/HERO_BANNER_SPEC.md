# Thiết kế — Banner hero trang chủ

Ngày12/11/2026 · **Chờ duyệt thiết kế** · mở rộng nhỏ trong quản trị Home.

## Mục tiêu và quyết định đã chốt

- OWNER chủ động thay banner tại `/admin/sach-noi-bat`.
- Tối đa10banner, tự chuyển sau5giây và quay vòng theo thứ tự đã lưu.
- Mọi banner dẫn cố định tới **`/sach`**, cùng tab; không có field nhập link.
- Giữ màu đỏ chủ đạo và vị trí hero tràn ngang hiện tại.
- Ảnh tham khảo thể hiện carousel có nút trái/phải; không sao chép artwork.

## Cách triển khai đề xuất

Hiện Home dùng hai asset WebP cố định1584/800px, tỉ lệ4:1; admin Home chỉ
quản lý ghim sách. Upload sách đang gắn với phiên sách và kiểm nguồn Drive,
nên không dùng một cuốn sách giả để chứa banner.

| Hướng | Đánh đổi | Lựa chọn đề xuất |
|---|---|---|
| Cấu hình banner riêng, dùng lại primitive lưu/encode self-host | Thêm metadata/API nhỏ; không ảnh hưởng sách và các kệ ghim | Chọn cho thiết kế này |
| Đưa banner vào upload/BookMedia của sách | Bớt một số helper nhưng kéo theo phiên/role/nguồn/publish của sách | Không phù hợp banner độc lập |

Builder chọn phần primitive Sharp/lưu file có thể tái sử dụng; không thay
recipe/contract của ảnh sách, không thêm image library hoặc carousel library.
Không tạo nền tảng CMS, lịch chiến dịch hoặc pipeline Drive mới cho banner.

## Quản trị

- Thêm khối **Banner trang chủ** ở đầu trang, phía trên các kệ sách hiện có.
- Upload từ máy: JPEG/PNG/WebP tĩnh; tối đa10MiB/file và25MP sau giải mã.
  Validate bytes/MIME/dimensions ở backend, không chỉ dựa đuôi file.
- Từng hàng có thumbnail, thứ tự, mô tả ảnh tùy chọn, **Thay ảnh**, **Xóa**,
  **Lên/Xuống**. Không nhận URL ảnh bên ngoài hoặc link đích tùy chỉnh.
- Khuyến nghị ảnh1584×396 hoặc cùng tỉ lệ4:1; preview cho thấy đúng khung Home.
  Ảnh khác tỉ lệ hiện trọn trong khung, không tự cắt mất chữ; nền kem nếu dư.
- Chọn ảnh mới chỉ làm draft. Chờ ảnh xử lý xong mới **Lưu banner**;
  lỗi upload/lưu giữ cấu hình đang công khai và các dữ liệu draft còn hợp lệ.
- Nút **Lưu banner** độc lập **Lưu thay đổi** của các kệ sách; lưu một phần
  không làm mất draft phần còn lại. Dirty guard chung hỏi khi rời trang.
- OWNER được đọc/ghi; STAFF không thấy mục quản trị này, API tương ứng403.
- API kiểm tối đa10, thứ tự, quyền sở hữu upload và version; phiên khác sửa
  trước trả409, giữ draft để đối chiếu, không tự ghi đè.

## Trang chủ

- Public Home API trả banner đã lưu theo thứ tự; cấu hình rỗng dùng banner
  hiện tại làm fallback. Xóa hết banner tùy chỉnh cũng trở về fallback.
- Một banner: ảnh đứng yên, không có controls dư thừa hoặc timer.
- Hai đến10banner: tự chuyển mỗi5000ms, cuối quay về đầu; nút trái/phải,
  chấm chọn và nút tạm dừng/chạy tiếp dùng được bằng bàn phím.
- Bấm banner nào cũng tới `/sach`; nút carousel không kích hoạt link ảnh.
- Tạm dừng khi hover/focus trong carousel hoặc tab ẩn; thao tác chọn slide
  bắt đầu lại đủ5giây khi chạy tiếp, không nhảy bù các nhịp đã bỏ lỡ.
- Với prefers-reduced-motion, mặc định tắt autoplay; vẫn có chọn slide thủ công.
- Khung4:1 cố định, tràn ngang như hiện tại, mobile co theo chiều rộng;
  không nhảy chiều cao khi đổi ảnh. Giữ h1 ẩn hiện có.
- SSR xuất ảnh đầu ngay trong HTML, ảnh đầu ưu tiên tải; ảnh sau không tranh
  ưu tiên LCP. Timer chỉ chạy phía browser sau hydrate, được dọn khi rời Home.
- Ảnh lỗi bỏ qua khi chuyển; nếu không còn banner tải được thì về fallback,
  không vòng retry vô hạn hoặc để hero trống.

## Lưu trữ và vận hành

- Metadata/ảnh banner thuộc module cấu hình Home, độc lập BookCopy/Listing.
  Giữ nguyên ảnh gốc và bản phục vụ tự host trong namespace banner riêng.
- Không yêu cầu Drive VERIFIED để đăng banner; nguồn phục hồi của banner là
  bản gốc self-host được đưa vào backup media cùng DB theo quy trình hiện có.
- Upload tạm không tự công khai; chỉ ảnh xử lý READY và được cấu hình OWNER
  lưu thành công mới xuất hiện trong public Home/đường đọc public.
- Lưu thứ tự/metadata/version/audit nguyên tử; invalidation public Home sau
  commit. Banner dùng ID/version ổn định trong URL để không đọc ảnh cũ sai cache.
- Khi bỏ/thay ảnh, giữ ảnh từng công khai ít nhất24giờ để HTML/cache cũ còn đọc;
  cleanup không xóa file còn được cấu hình/draft hợp lệ tham chiếu.
- Dọn upload bỏ dở theo TTL; không xóa ảnh public cũ trước khi save thành công.
  Backup/restore phải bao gồm namespace banner; không chạy migrate/deploy live.

## Tiêu chí nghiệm thu

1. OWNER thêm/thay/xóa/sắp xếp1–10banner; lưu và refresh còn đúng cấu hình.
2. Banner thứ11 bị chặn cả frontend/backend; file giả/động/quá giới hạn bị từ chối.
3. Upload hoặc lưu lỗi không làm mất banner đang công khai; draft được giữ.
4. Hai phiên sửa cùng version chỉ một phiên thắng; STAFF/anonymous không ghi.
5. Mọi ảnh dẫn `/sach`; controls không điều hướng ngoài ý muốn.
6. Timer5000ms/quay vòng, chọn thủ công, pause/focus/tab ẩn/reduced motion đúng;
   một ảnh không có timer, không rò timer sau rời trang.
7. SSR có ảnh đầu, khung desktop/mobile ổn định; cấu hình rỗng/ảnh hỏng có fallback.
8. Upload chưa lưu không public; cleanup tôn trọng reference/grace24giờ.
9. Ghim sách và dữ liệu ảnh sách vẫn hoạt động; lưu banner không xóa draft kệ sách.
10. Test backend/frontend, build SSR/Workers/proxy và browser QA với media thật;
    ghi rõ phạm vi chưa kiểm live/thiết bị thật, không suy từ mock thành nghiệm thu.

Phạm vi này không gồm link riêng từng banner, crop editor, banner theo lịch,
analytics click, nhiều banner riêng mobile hoặc thay nội dung các box tiện ích.
