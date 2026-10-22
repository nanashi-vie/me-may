# Home brief — Mẹ Mây theo mẫu NXB Kim Đồng

Trạng thái: thiết kế M0 để review, chưa phải UI đã duyệt. Nguồn thị giác là screenshot local do người dùng cung cấp, không phải kiểm tra website đang chạy. Các nhãn/giá trong wireframe và fixture đều là dữ liệu minh họa.

## Cách đọc mẫu và lựa chọn đề xuất

Mẫu có nền trắng, màu đỏ làm điểm nhấn, header thấp, ô tìm kiếm, logo, menu danh mục, banner lớn phủ ngang. Nội dung gồm nhiều hàng sách (khoảng 5 thẻ trên desktop), tên nhóm ở giữa, “Xem thêm” bên phải và banner chủ đề xen giữa; footer chứa thông tin/hỗ trợ. Ảnh screenshot không đủ để kết luận hành vi hover, carousel hoặc giao diện mobile của website gốc.

| Hướng | Trade-off | Lựa chọn |
|---|---|---|
| Giữ nhịp banner + hàng sách, đổi nội dung theo Mẹ Mây | Gần mẫu, dễ duyệt sách, giữ phạm vi MVP; cần nội dung nhóm thật | **Đề xuất** |
| Sao chép toàn bộ số nhóm và độ dài mẫu | Cần lượng sách/banner lớn; dễ tạo nhiều mục trống và chính sách không tồn tại | Không chọn làm mặc định |
| Chuyển thành landing kể chuyện, ít hàng sách | Có thể nhấn thương hiệu nhưng khác mong muốn “home giống mẫu” | Không ưu tiên |

## Desktop — thứ tự từ trên xuống

1. **Utility bar:** thông điệp ngắn “Sách ngoại văn đã qua sử dụng cho bé”; link Facebook/Zalo khi đã có. Không tự nhận freeship/giảm giá.
2. **Header:** logo chữ Mẹ Mây dạng tạm, search lớn, Quan tâm (số cuốn), Hướng dẫn mua/Liên hệ. Không có đăng nhập khách/giỏ hàng. Header admin không dùng chung nguyên cụm này.
3. **Navigation:** Tất cả sách, Sách mới đăng, Theo độ tuổi, Theo loại sách, Bộ sưu tập, Cách mua. Dropdown phải thao tác được bằng bàn phím/touch khi triển khai.
4. **Hero ngang:** một banner tĩnh ban đầu, thông điệp giới thiệu sách cũ/ảnh thật; CTA “Xem tất cả sách”. Không cần autoplay/carousel ở MVP. Banner là asset thương hiệu được duyệt sau, không lấy ảnh sale của mẫu.
5. **Sách mới đăng:** tối đa 5 cuốn ở một hàng desktop, sắp theo published_at; “Xem tất cả” mở catalogue có sort phù hợp.
6. **Board books cho bé nhỏ:** hàng 5 cuốn hoặc ít hơn nếu thiếu; tên nhóm chỉ xuất hiện khi có nội dung công khai.
7. **Banner nhóm 1:** giới thiệu “Cùng bé đọc mỗi ngày” bằng nội dung/asset Mẹ Mây; link tới bộ sưu tập thật.
8. **Picture books:** hàng sách kèm giá, mã và tình trạng đúng cuốn.
9. **Sách theo chủ đề:** một hàng của bộ sưu tập được chủ chọn, ví dụ động vật; không tự gắn nhãn bằng AI.
10. **Banner nhóm 2 + sách cho bé bắt đầu tự đọc:** chỉ hiển thị nếu có cuốn phù hợp; không gán CEFR/Lexile khi thiếu bằng chứng.
11. **Cách hỏi mua:** 3 bước ngắn: chọn sách → sao chép mã/link → nhắn tiệm xác nhận.
12. **Footer:** giới thiệu ngắn, hướng dẫn mua, liên hệ và chính sách do tiệm cung cấp. Không hiển thị chứng nhận, địa chỉ hay chính sách không có thật.

Số hàng sách ban đầu đề xuất 4–5, có thể tăng khi có dữ liệu. Không kéo dài Home bằng các nhóm lặp sách chỉ để đủ chiều cao như screenshot.

## Book card và phân bố responsive

- Bìa dùng `contain` trong khung thống nhất để không cắt mất phần bìa/lỗi. Không chỉnh ảnh thật theo tone làm che tình trạng cuốn.
- Tên tối đa 2 dòng; mã dễ đọc; giá VND nổi bật; nhãn tình trạng vật lý tách khỏi khả dụng; nút quan tâm có tên truy cập rõ.
- Không hiện sale badge, giá gạch ngang, “bán chạy”, rating hoặc preorder khi không có dữ liệu/nghiệp vụ chứng minh.
- Desktop khoảng 1200–1280 px nội dung, 5 cột; tablet 3 cột; mobile 360–390 px: 2 cột, search một hàng riêng, menu cuộn ngang hoặc menu mở bằng nút có nhãn.
- Mobile cho mỗi nhóm tối đa 4 cuốn + Xem tất cả; tránh hàng ngang chỉ có thể kéo mà không có chỉ dẫn. Hero có asset/tỉ lệ riêng cho mobile, không thu nhỏ chữ trên banner desktop.
- Không dùng animation xuất hiện khiến sách/giá bị ẩn trước khi chạy JavaScript. Không autoplay bắt buộc; tôn trọng reduced motion.

## Hướng visual để thử, chưa khóa design system

Nền trắng, màu chữ tối, đỏ trầm làm điểm nhấn điều hướng/giá, kem nhạt ở banner và phân vùng phụ; khoảng cách gọn như cửa hàng sách, ít viền/shadow. Đây là hướng dựa trên screenshot, không tự biến thành phong cách bento/landing của skill.

Logo, font tiếng Việt, màu chính xác và ảnh banner sẽ chốt ở vòng visual sau khi bố cục được review. Wireframe dùng system font và hình khối minh họa để đánh giá cấu trúc.

## Chấp nhận về UX

- Từ phần đầu trang, tìm kiếm và danh sách quan tâm luôn dễ tìm trên desktop/mobile.
- Home → nhóm → detail giữ đường dẫn rõ; tên nhóm phản ánh dữ liệu thật.
- Sold vẫn nhận diện rõ nếu được hiển thị, không trông như cuốn còn sẵn.
- Mọi nút có điểm đến/hành động đã mô tả; liên hệ có sao chép dự phòng.
- Banner không tạo hiểu nhầm có freeship, ưu đãi, checkout hoặc giữ sách tự động.

Wireframe mobile minh họa header và hai nhóm sách để xem nhịp bố cục hai cột, không phải lược bỏ các nhóm còn lại trong brief. Các card hình khối chỉ mô phỏng mật độ trang, không data-bind với CSV 12 cuốn.

Xem [wireframe desktop](wireframes/home-desktop.svg) và [mobile](wireframes/home-mobile.svg). Đây là sơ đồ bố cục, không phải screenshot ứng dụng chạy thật.
