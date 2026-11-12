# Mẹ Mây — thiết kế UX hiện hành

Cập nhật 22/10/2026. Phạm vi M0 và baseline MVP trước M2 đã duyệt; không coi wireframe là UI đã triển khai. Tham khảo [ảnh người dùng cung cấp](assets/nxbkimdong.com.vn.png), không sao chép thương hiệu/nội dung của mẫu. Hạ tầng và phạm vi sản phẩm xem [MASTER_PLAN](MASTER_PLAN.md).

## Sitemap và nhiệm vụ từng trang

| Route gợi ý | Vai trò | Hành động chính |
|---|---|---|
| `/` | Home nhiều hàng sách | Tìm kiếm, mở nhóm, xem cuốn |
| `/sach` | Catalogue đầy đủ | Tìm/lọc/sắp xếp/phân trang; filter lưu URL |
| `/bo-suu-tap/:slug` | Nhóm biên tập | Duyệt các cuốn thuộc nhóm |
| `/sach/:slug` | Chi tiết một cuốn vật lý | Xem 2–8 ảnh và mô tả; trái tim wishlist; liên hệ/tư vấn tương đương qua Zalo; tham gia nhóm |
| `/quan-tam` | Danh sách cục bộ trên thiết bị | Xem trạng thái mới; xóa; sao chép nhiều cuốn; mở kênh chat |
| `/lien-he` | Nội dung cửa hàng | Đọc thông tin thật, chọn liên hệ |
| `/admin/dang-nhap` | Đăng nhập quản trị | Xác thực Owner/Staff |
| `/admin/sach` | Bảng quản trị | Tìm mã, mở editor, xem trạng thái |
| `/admin/sach/moi`, `/admin/sach/:id` | Editor | Nhập cuốn/listing, ảnh, preview, xuất bản/ẩn theo quyền |
| `/admin/danh-muc`, `/admin/bo-suu-tap` | Biên tập taxonomy | Quản lý nhóm và thứ tự hiển thị |

Các tên route là thiết kế, chưa khóa OpenAPI hoặc cấu trúc controller.

## Luồng và các trạng thái cần nhìn thấy

Khách vào Home → mở nhóm/tìm kiếm → chi tiết cuốn → thêm quan tâm hoặc sao chép thông tin sách → Zalo hotline cá nhân có zBusiness → cửa hàng xác nhận và chốt. Bấm liên hệ không giữ sách hoặc thay đổi khả dụng.

Owner nhập dữ liệu/ảnh tạm → kiểm tra trọng lượng/khoảng giá/ảnh → xác nhận tạo và đăng một lần → người có quyền cập nhật sold sau khi chốt ngoài web. Cùng tên vẫn có mã và trang riêng cho từng cuốn.

Danh sách quan tâm đọc lại trạng thái từ API khi mở; nếu API lỗi, ghi “Chưa kiểm tra được tình trạng” thay vì coi cache là còn hàng. Cuốn đã bán được cảnh báo; cuốn ẩn/không tìm thấy hiển thị không còn công khai, không lộ lại dữ liệu nháp. Chỉ sao chép thông tin công khai đã xác nhận, kèm lưu ý không giữ sách.

Publication: `PUBLISHED` / `ARCHIVED`; availability: `AVAILABLE` (Còn hàng) / `SOLD` (Hết hàng). Khả dụng tính từ tổng tồn gộp; publication độc lập. SOLD không tự archive; trang chi tiết vẫn tồn tại nếu còn published. Không có Đang giữ trong MVP.

## Quyền thiết kế M0

| Thao tác | STAFF | OWNER |
|---|---|---|
| Xem quản trị và ảnh đã lưu | Có | Có |
| Tạo/sửa sách và ảnh tạm | Không | Có |
| Preview được bảo vệ | Có | Có |
| Xuất bản/ẩn/khôi phục listing | Không | Có |
| Đổi giá/nội dung/ảnh/khả dụng của cuốn đang công khai | Không | Có |
| Sửa taxonomy/bộ sưu tập/thông tin liên hệ | Không | Có |
| Quản lý tài khoản | Không | Có |

M5 thay quyền Staff nhập nháp bằng STAFF chỉ đọc; mọi ghi do OWNER thực hiện. Không mở rộng quyền qua UI đơn thuần.


## Home theo mẫu NXB Kim Đồng

Trạng thái: bố cục M0 đã được người dùng duyệt; visual chi tiết chưa khóa và Home hiện mới là shell M1. Nguồn thị giác là screenshot local do người dùng cung cấp, không phải kiểm tra website đang chạy. Các nhãn/giá trong wireframe và fixture đều là dữ liệu minh họa. Wireframe/CSV M0 chưa cập nhật bộ lọc, ba ảnh và CTA của baseline trước M2; khi có khác biệt, quy tắc hiện hành trong tài liệu này và MASTER_PLAN được ưu tiên. Chưa dựng lại visual hoặc coi sơ đồ là kiểm thử UI.

## Cách đọc mẫu và lựa chọn đề xuất

Mẫu có nền trắng, màu đỏ làm điểm nhấn, header thấp, ô tìm kiếm, logo, menu danh mục, banner lớn phủ ngang. Nội dung gồm nhiều hàng sách (khoảng 5 thẻ trên desktop), tên nhóm ở giữa, “Xem thêm” bên phải và banner chủ đề xen giữa; footer chứa thông tin/hỗ trợ. Ảnh screenshot không đủ để kết luận hành vi hover, carousel hoặc giao diện mobile của website gốc.

| Hướng | Trade-off | Lựa chọn |
|---|---|---|
| Giữ nhịp banner + hàng sách, đổi nội dung theo Mẹ Mây | Gần mẫu, dễ duyệt sách, giữ phạm vi MVP; cần nội dung nhóm thật | **Đề xuất** |
| Sao chép toàn bộ số nhóm và độ dài mẫu | Cần lượng sách/banner lớn; dễ tạo nhiều mục trống và chính sách không tồn tại | Không chọn làm mặc định |
| Chuyển thành landing kể chuyện, ít hàng sách | Có thể nhấn thương hiệu nhưng khác mong muốn “home giống mẫu” | Không ưu tiên |

## Desktop — thứ tự từ trên xuống

1. **Utility bar:** dải đỏ trên cùng (`.utility`) trên desktop (>720px; ẩn ở ≤720px) chia 3 vùng trong khung `.wrap`: bên trái là 3 icon trắng mạng xã hội (`Facebook`: `sachngoaivanmemay`, `Threads`: `@sachngoaivanmemay`, `TikTok`: `@andamdaily`); ở giữa là thông điệp “Sách ngoại văn đã qua sử dụng cho bé · Ảnh thật từng cuốn” chạy ngang (`marquee`, tự dừng khi hover hoặc bật `prefers-reduced-motion`); bên phải là icon phong bì kèm email CSKH `support@memaybooks.com` (`mailto:`). Không tự nhận freeship/giảm giá.
2. **Header:** desktop giữ logo Mẹ Mây (`code/frontend/public/favicon/web-app-manifest-192x192.png`), search (`placeholder="Bạn đang tìm…"`, đồng bộ `q` từ URL), Danh sách quan tâm (badge số cuốn) và Nhắn tiệm. Mobile (≤720px) hàng 1 gồm nút ☰ bên trái · logo giữa · Quan tâm bên phải; hàng 2 là search full-width; ẩn Nhắn tiệm trên header (đưa vào sidebar). Không sticky header để giữ ổn định CLS.
3. **Navigation & Sidebar (chốt 02/11):**
   - Desktop (>720px): hàng nav căn giữa, CHỮ IN HOA đậm, thứ tự `Trang chủ · Tất cả sách ▾ · Flash Sale · Bộ sưu tập ▾ · Liên hệ` (tablet 721–960px thu gọn khoảng cách/cỡ chữ; gỡ mục `Cách mua` vì đã tích hợp popup trực tiếp từ box tiện ích Home). Mục đang active tô `--red` (`Tất cả sách` active trên mọi `/sach`; `Bộ sưu tập` active trên `/bo-suu-tap/*`; `Trang chủ` chỉ ở `/`).
   - Dropdown `Tất cả sách` (gồm `Tất cả thể loại` + 9 thể loại từ `/taxonomy`) và `Bộ sưu tập` mở khi hover, focus bàn phím hoặc bấm nút `▾` trên thiết bị chạm; nền xám nhạt, vạch chấm phân cách, gạch `--red` dưới đáy; `aria-expanded`/`aria-controls`, Escape đóng và trả focus về nút/link cha; bấm chữ `Tất cả sách` đi `/sach`, bấm `Bộ sưu tập` chỉ mở/đóng.
   - Mobile (≤720px): `<dialog>` native mở bằng `showModal()`, trượt từ trái (~80vw, tối đa 320px), nền `--red`, chữ trắng IN HOA, nút Đóng ✕; `Tất cả sách ›` và `Bộ sưu tập ›` mở accordion tại chỗ; đóng khi Escape, chạm backdrop, bấm ✕, chọn link hoặc đổi route, khóa cuộn nền và trả focus về ☰; tắt animation khi `prefers-reduced-motion: reduce`.
4. **Hero ngang & Các box tiện ích (cập nhật 06/11):** banner hero, bên dưới là 4 box tiện ích viền xanh IPM (`Ưu đãi vận chuyển`, `Cách hỏi mua sách`, `Cộng đồng Mẹ Mây`, `Hotline: 0966075005 · 0703260005`). Bấm `Cách hỏi mua sách` mở popup dialog 2x2 gồm 4 bước ngắn gọn, tiêu đề in đậm, bước 4 hướng dẫn gửi hotline Zalo; đã gỡ hoàn toàn `/cach-mua` và section cuối trang Home.
   Ô Cộng đồng mở dialog trên desktop với nền xanh theo mẫu Zalo, thẻ trắng chứa logo Mẹ Mây và nhãn `Cộng đồng Zalo · zalo.me`. QR tạo từ link nhóm Zalo, có nút mở tab mới và sao chép liên kết. Android/iOS đi thẳng đến link nhóm. Dialog đóng bằng X, Escape hoặc nhấn ngoài, rồi trả focus về ô Cộng đồng.
5. **Flash Sale (cập nhật 03/11):** ngay dưới hero, nền đỏ cam `#ff625c` tràn toàn chiều ngang (`100vw`) kèm họa tiết tia sét mờ hai bên; bên trong `.wrap` là thanh tiêu đề trắng bo góc gồm `FLASH ⚡ SALE`, đếm ngược 3 ô đen bo góc (`HH : MM : SS`) và `Xem tất cả ›` màu xanh đậm (`#1976d2`). Thẻ sách và trang chi tiết hiển thị giá sale kèm badge `-XX%` màu đỏ (tính theo `priceMaxVnd`, làm tròn `Math.round((1 - salePriceVnd / priceMaxVnd) * 100)`) và khoảng giá gốc gạch ngang; đồng bộ 3 ô đếm ngược trên Home, `/flash-sale` và thanh banner `FLASH ⚡ SALE` ở `/sach/:slug`. Chỉ hiển thị khi có đợt thật đang hiệu lực; không có thanh số đã bán. Mobile hai cột. OWNER biên tập ở `/admin/flash-sale`.
6. **Sách mới đăng:** tối đa 5 cuốn ở một hàng desktop, sắp theo published_at; “Xem tất cả” mở catalogue có sort phù hợp.
6. **Board books cho bé nhỏ:** hàng 5 cuốn hoặc ít hơn nếu thiếu; tên nhóm chỉ xuất hiện khi có nội dung công khai.
7. **Banner nhóm 1:** giới thiệu “Cùng bé đọc mỗi ngày” bằng nội dung/asset Mẹ Mây; link tới bộ sưu tập thật.
8. **Picture books:** hàng sách kèm giá, mã và tình trạng đúng cuốn.
9. **Sách theo chủ đề:** một hàng của bộ sưu tập được chủ chọn, ví dụ động vật; không tự gắn nhãn bằng AI.
10. **Banner nhóm 2 + sách cho bé bắt đầu tự đọc:** chỉ hiển thị nếu có cuốn phù hợp; không gán CEFR/Lexile khi thiếu bằng chứng.
11. **Cách hỏi mua:** 3 bước ngắn: chọn sách → sao chép mã/link → nhắn tiệm xác nhận.
12. **Footer (cập nhật 08/11):** nền tối `#292724` tràn toàn chiều ngang theo mẫu IPM, chia 2 cột trong `.wrap`: cột trái gồm thương hiệu Mẹ Mây, thông điệp, liên kết nhanh (`Khám phá sách`, `Liên hệ`, `Quản trị`), email CSKH `support@memaybooks.com` và lưu ý xác nhận giá/tình trạng; cột phải gồm `KẾT NỐI VỚI CHÚNG TÔI` (khung nhúng Facebook Page Plugin `embed_page` `340x130px` của fanpage `sachngoaivanmemay`) và `CÁC KÊNH KHÁC` (3 nút vuông trắng bo góc chứa logo `Facebook`, `Threads`, `TikTok`). Không hiển thị chứng nhận, địa chỉ hay chính sách không có thật.

Số hàng sách ban đầu đề xuất 4–5, có thể tăng khi có dữ liệu. Không kéo dài Home bằng các nhóm lặp sách chỉ để đủ chiều cao như screenshot.

## Book card và phân bố responsive

- Bìa dùng `contain` trong khung `.cover-link` tỉ lệ `4:5` cố định (`grid-template-rows: minmax(0, 1fr); overflow: hidden; flex-shrink: 0`) để không cắt mất phần bìa/lỗi và giữ mọi card ảnh dọc/ảnh ngang thẳng hàng ngang trên cùng hàng. Thẻ `.book-card` có viền mảnh `1px solid var(--line, #ddd7ce)`. Không chỉnh ảnh thật theo tone làm che tình trạng cuốn.
- Tên tối đa 2 dòng; mã dễ đọc; giá tham khảo VND nổi bật; nhãn tình trạng vật lý tách khỏi khả dụng; nút trái tim quan tâm có tên truy cập rõ và thể hiện trạng thái đã thêm/xóa.
- Chỉ hiện sale badge/giá gạch ngang khi API xác nhận Flash Sale còn hiệu lực; không có số đã bán, “bán chạy”, rating hoặc preorder giả.
- Desktop khoảng 1200–1280 px nội dung, 5 cột; tablet 3 cột; mobile 360–390 px: 2 cột, search một hàng riêng, menu cuộn ngang hoặc menu mở bằng nút có nhãn.
- Mobile cho mỗi nhóm tối đa 4 cuốn + Xem tất cả; tránh hàng ngang chỉ có thể kéo mà không có chỉ dẫn. Hero có asset/tỉ lệ riêng cho mobile, không thu nhỏ chữ trên banner desktop.
- Không dùng animation xuất hiện khiến sách/giá bị ẩn trước khi chạy JavaScript. Không autoplay bắt buộc; tôn trọng reduced motion.

## Hướng visual để thử, chưa khóa design system

Nền trắng, màu chữ tối, đỏ trầm làm điểm nhấn điều hướng/giá, kem nhạt ở banner và phân vùng phụ; khoảng cách gọn như cửa hàng sách, ít viền/shadow. Đây là hướng dựa trên screenshot, không tự biến thành phong cách bento/landing của skill.

Bộ font tiếng Việt chốt 04/11: tự host `.woff2` variable font (`public/fonts/`, subset `vietnamese` + `latin`, cache `immutable` 1 năm) gồm `--font-display: 'Baloo 2'` (độ đậm 700) cho tiêu đề lớn public (`.brand-name`, `h1`, `h2`, tiêu đề mục/trang) và `--font-sans: 'Nunito'` (400–800) cho nội dung body, tên sách trên thẻ (`h3` và dòng sách wishlist), giá, nút bấm, thanh menu và toàn bộ trang Admin. Wireframe SVG cũ dùng system font và hình khối minh họa để đánh giá cấu trúc.

## Chấp nhận về UX

- Từ phần đầu trang, tìm kiếm và danh sách quan tâm luôn dễ tìm trên desktop/mobile.
- Home → nhóm → detail giữ đường dẫn rõ; tên nhóm phản ánh dữ liệu thật.
- Sold vẫn nhận diện rõ nếu được hiển thị, không trông như cuốn còn sẵn.
- Mọi nút có điểm đến/hành động đã mô tả; liên hệ có sao chép dự phòng.
- Banner không tạo hiểu nhầm có freeship, ưu đãi, checkout hoặc giữ sách tự động.

Wireframe mobile minh họa header và hai nhóm sách để xem nhịp bố cục hai cột, không phải lược bỏ các nhóm còn lại trong brief. Các card hình khối chỉ mô phỏng mật độ trang, không data-bind với CSV 12 cuốn.

Xem [wireframe desktop](assets/wireframes/home-desktop.svg) và [mobile](assets/wireframes/home-mobile.svg). Đây là sơ đồ bố cục, không phải screenshot ứng dụng chạy thật.

## Các màn hình và trạng thái

Đọc cùng phần Home trong tài liệu này và [screen board](assets/wireframes/screens.svg). Nội dung này mô tả UX, chưa khóa cấu trúc component hoặc OpenAPI.

## Catalogue / collection — desktop và mobile (chốt 02/11)

Header tìm kiếm và Quan tâm dùng chung với Home. Contract URL `q`, `category`, `binding`, `age` (lặp), `sort`, `page` giữ nguyên.

- **Desktop (>720px):** Breadcrumb (`Trang chủ / Tất cả sách [/ Thể loại]` hoặc `Trang chủ / Bộ sưu tập / Tên`) → bố cục 2 cột:
  - Cột trái: `DANH MỤC` gồm link `Tất cả sách` + 9 thể loại (trên `/sach` giữ `q/age/sort`, reset `page/binding`, mục đang chọn tô `--red`; trên `/bo-suu-tap/:slug` là link rời trang sang `/sach?category=CODE`, không tô active); bên dưới là nhóm `Độ tuổi` (checkbox 0–3, 4–6, 7–9, 10+ chọn nhiều) kèm nút **Áp dụng**.
  - Vùng phải: tiêu đề IN HOA theo thể loại đang chọn (mặc định `TẤT CẢ SÁCH`, `<title>` `{Tên thể loại} | Mẹ Mây`), số cuốn và select `Sắp xếp theo:` ở góc phải (đổi là áp ngay, về trang 1). Khi chọn một thể loại ngoài Board book, hiện 3 chip ngay dưới tiêu đề: `Tất cả · Paperback · Hardcover` (`aria-current` cho chip đang chọn). Khi URL có `q` hiện dòng `Kết quả cho “q”` + nút `✕ Xóa` (bỏ `q`, giữ filter khác). Bỏ ô tìm tên/mã và select Thể loại/Kiểu bìa cũ trong panel lọc.
- **Mobile (≤720px):** ẩn tiêu đề cột trái; thứ tự dưới breadcrumb là hàng chip cuộn ngang thể loại (có bóng mờ cạnh phải, vùng chạm ≥44px) → hàng chip checkbox độ tuổi cuộn ngang + nút Áp dụng → tiêu đề + số cuốn + Sắp xếp → chip Paperback/Hardcover (khi lọc thể loại ngoài Board book) → dòng kết quả `q` → grid 2 cột → pagination.

Nhấn áp dụng cập nhật URL và đưa người dùng tới đầu kết quả; browser back giữ query/filter/page. Xóa tất cả có thể trở lại catalogue mặc định. Khi đổi filter, page về 1. Page/filter không hợp lệ được chuẩn hóa hoặc báo lỗi có hướng dẫn, không crash. Trạng thái không kết quả có nút bỏ bớt bộ lọc; lỗi tải có nút thử lại; loading không giả thành “0 cuốn”.

## Chi tiết cuốn — khách mobile

Breadcrumb → cột ảnh/CTA (chốt 04/11, theo mẫu Fahasa): một ảnh lớn khung 3:4 `contain` (ảnh FRONT eager/high priority) + hàng thumbnail 2–8 ảnh (bìa, lưng bắt buộc; gáy, nội dung 1–3 tùy chọn; button `aria-label`/`aria-pressed`, chỉ đổi ảnh khi bấm, nhãn Bìa/Lưng/… ở chú thích ảnh lớn) → hai nút `♡ Thêm vào danh sách quan tâm` (viền đỏ, khi đã lưu đổi thành `♥ Đã thêm vào danh sách`) và `Liên hệ` (nền đỏ) → link cộng đồng và ghi chú “Liên hệ không giữ sách”. Cột phải: tiêu đề `<h1>` chỉ hiển thị `Tên sách` (thẻ `<title>`/SEO vẫn đủ NXB/Tác giả) → mã/khả dụng → Flash Sale/giá → khối `<dl>` thông số cơ bản (có đường kẻ phân cách mảnh) → mô tả sách. Desktop: cột ảnh sticky khi đọc mô tả; mobile: một cột, thumbnail cuộn ngang, nút quan tâm/`Liên hệ` dính thanh dưới màn hình. `Liên hệ` luôn bấm được (trừ lúc đang xác minh); không yêu cầu chọn bản; tiệm xác nhận tình trạng qua tin nhắn. Các trường tiêu đề lưu riêng; bỏ phần thiếu và dấu phân cách thừa.

Giá tham khảo kèm “Giá sẽ thay đổi dựa vào tình trạng sách cụ thể.” Khối `<dl>` thông số nằm ngay trên mô tả, hiển thị theo thứ tự: `Nhà xuất bản` → `Tác giả` → `Kiểu bìa` → `Độ tuổi` → `Trình độ đọc` → `Đọc tham khảo` (không hiển thị trọng lượng sách phía người dùng). Mức đọc theo bảy nhãn tại [DATA](DATA.md), từ Starters · Pre A1 đến Proficiency · C2; Flyers / Key cùng A2. Có mức thì kèm chú thích “Độ tuổi & trình độ đọc là gợi ý tham khảo từ tiệm. Khách hàng tự kiểm tra mức độ phù hợp trước khi mua hàng.” Chưa xác định thì ẩn trường; không tự gán từ tuổi/thể loại. Link đọc tham khảo mở video đọc sách bên ngoài, không yêu cầu upload/player video.

Các nút trên detail:

- Trái tim thêm/xóa wishlist trên thiết bị, không cần tài khoản; có nhãn truy cập và trạng thái rõ.
- AVAILABLE: “Liên hệ” để hỏi thêm và xem ảnh/video thật.
- SOLD: hiển thị “Hết hàng”, đổi nút thành “Tư vấn sách tương đương”; giữ thông tin cuốn khách đang xem, không hứa cuốn còn sẵn hoặc tự gợi ý bằng hệ thống.
- “Tham gia cộng đồng để nhận thông tin ưu đãi” mở nhóm Zalo riêng, dùng cho cả còn/hết hàng.

Hai nút tư vấn dùng chung hotline Zalo cá nhân có zBusiness. Nội dung soạn sẵn gồm mục đích hỏi, mã, tên, giá tham khảo và URL; hết hàng đổi mục đích thành hỏi sách tương đương. Chỉ dùng điền sẵn khi đã kiểm chứng được với kênh thực tế. Phương án MVP: mở hướng dẫn với nội dung đã soạn, nút “Sao chép” và “Mở Zalo”; khách dán rồi gửi. Clipboard thất bại có ô văn bản chọn/copy thủ công. Không tự gửi tin, không tự giữ sách; thiếu link hotline/nhóm thật phải được giải quyết trước nghiệm thu.

Tối đa sáu ảnh public; ảnh/video thực tế bổ sung trao đổi qua Zalo. Tình trạng/lỗi của bản cụ thể do tiệm xác nhận qua tin nhắn; không hiển thị ghi chú nội bộ. Không bịa ISBN/tuổi/author. Khi archived, public URL không trả chi tiết cuốn; public preview không dùng endpoint admin.

### Kệ sách cùng NXB và cùng thể loại (duyệt 05/11)

Dưới phần thông tin chi tiết cuốn, hiển thị 2 section kệ sách liên quan theo mẫu:
1. `SÁCH CÙNG NHÀ XUẤT BẢN`
2. `SÁCH CÙNG THỂ LOẠI`

- **Tiêu đề section:** In hoa, căn giữa với hai đường kẻ ngang mảnh phân cách (`.section-divider`).
- **Bố cục kệ:** Dùng carousel ngang với thẻ `app-book-card` chuẩn Mẹ Mây. Desktop hiển thị 5 thẻ/khung kèm hai nút tròn điều hướng `<` và `>` ở hai mép ngoài; tablet 3 thẻ; mobile 2 thẻ (hoặc vuốt ngang cảm ứng mượt mà).
- **Link "Xem thêm >>":** Nằm ở góc dưới bên phải mỗi kệ. Kệ NXB dẫn tới `/sach?q={publisher}` (backend mở rộng match `q` với publisher); Kệ thể loại dẫn tới `/sach?category={categoryCode}`.
- **Trạng thái rỗng:** Nếu cuốn sách không có NXB hoặc không có cuốn khác cùng NXB/thể loại, hiển thị thông báo "Chưa có sách khác cùng nhà xuất bản." / "Chưa có sách khác cùng thể loại." và ẩn link "Xem thêm >>".
- **Dữ liệu:** Endpoint `GET /api/v1/books/{slug}/related`, tối đa 10 cuốn mỗi mục, chỉ lấy sách `PUBLISHED`, loại trừ chính cuốn đang xem (`id != currentId`), ưu tiên `AVAILABLE` trước và sắp xếp `published_at DESC`.

## Danh sách quan tâm — khách mobile

Mỗi dòng: ảnh nhỏ, tên, mã, giá tham khảo mới nhất, trạng thái mới nhất, mở chi tiết và xóa. Không có quantity, phí ship, nút thanh toán hoặc tổng đơn. Dưới danh sách: Sao chép danh sách hỏi mua, mở Zalo hotline với luồng copy dự phòng như detail; giải thích danh sách lưu trên thiết bị, không giữ sách.

M4 duyệt24/10: trái tim chung card/detail có nhãn truy cập/aria-pressed; header badge đếm toàn bộ mã đã lưu (kể cả sold/mã không public). Tối đa100 cuốn. Checkbox mặc định chưa chọn; “Chọn tất cả sách còn hàng”/“Bỏ chọn tất cả”; chọn một phần để hỏi hôm nay vẫn giữ các cuốn khác. Selection chỉ sống trong lần mở trang, không persist.

SOLD hiện ảnh/tên/giá public với cảnh báo, checkbox bị khóa. Mã nháp/ẩn/không tồn tại chỉ hiện mã + “Không còn hiển thị”, không snapshot tên/ảnh/giá cũ. Có loading/empty/error/retry; xóa được mã không public. Storage hỏng báo rõ, storage chặn/quota dùng bộ nhớ và cảnh báo mất khi tải lại; không hứa đồng bộ khác browser/thiết bị.

Format copy một cuốn: `Mã | Tên | Giá tham khảo | URL`. Nhiều cuốn: một dòng/cuốn và câu cuối đề nghị tiệm xác nhận còn/giá. Cuốn sold/hidden được loại khỏi danh sách hỏi mua còn sẵn và báo lý do; khi API lỗi không âm thầm gửi giá cũ. Clipboard lỗi có ô văn bản để chọn/copy thủ công. Safari gọi clipboard.write ngay click bằng ClipboardItem promise, chỉ cung cấp nội dung sau xác minh; fallback chọn toàn bộ text và hướng dẫn nhấn giữ.

“Chuẩn bị nội dung hỏi mua” lookup lại các mã được chọn rồi mới mở nội dung; giá thay đổi cập nhật, cuốn vừa sold/hidden bị loại và giải thích. Zero valid không copy. Text có mục đích hỏi, các dòng mã/tên/giá tham khảo/URL canonical và câu cuối nhờ xác nhận. Native dialog có nút copy riêng sau tải (giữ user gesture), textarea manual fallback, hotline có cấu hình mới hiện link; thiếu hotline vẫn copy được. Không tự gửi.

Refresh khi vào trang/retry/foreground/codes thay đổi; hủy response cũ. Sale hết hạn/xóa mã tab khác/foreground làm text cũ không copy được và xác minh lại; thất bại không giữ text giá cũ. Thay text hoặc đang xác minh xóa thông báo “Đã sao chép”; khách phải copy nội dung mới. Retry thành công bỏ lỗi cũ. Escape trả focus về nút chuẩn bị, nếu selection đã hết thì về tiêu đề trang. Nút trái tim không nằm trong link mở sách; dùng được bằng bàn phím.

`/quan-tam` SSR chỉ có shell “Đang mở danh sách trên thiết bị”, noindex/no-store và không đụng storage; hydrate mới có badge/dữ liệu cá nhân. Sang trang public khôi phục metadata/indexability. Gate Safari/Chrome/in-app và mở/dán/gửi Zalo trên thiết bị thật phải có bằng chứng riêng, không suy từ browser giả lập.

## Bảng quản trị — desktop

Sidebar Modern Clean (rộng 240px, nền be kem #FBF8F2, viền phải #E8E2D8, sticky 100vh):
- Đầu sidebar: logo Mẹ Mây font Baloo 2 đỏ + nhãn "Trang quản trị".
- Menu điều hướng kèm icon SVG trực quan: Tổng quan (📊), Sách (📚), Bộ sưu tập (🗂️, chỉ OWNER), Flash Sale (⚡, chỉ OWNER), phân cách, Xem website (↗).
- Mục Active: nền đỏ kem nhạt #FDF2F2, chữ và icon đỏ thương hiệu #9B1C28 (font-weight 700), viền trái đỏ 3px. Hover: nền be sáng #F3EDE2.
- Đáy sidebar: Thẻ tài khoản (avatar chữ cái đầu, email, badge OWNER/STAFF) và nút Đăng xuất. Bỏ thanh admin-header phía trên để không gian nội dung bên phải rộng rãi.
- Nút "Quản trị" trên trang public (/ và toàn site): desktop nằm ở header cạnh "Nhắn tiệm ↗", mobile nằm cuối menu trượt; nhận diện phiên đăng nhập để chuyển thẳng /admin hoặc /admin/dang-nhap.

Main: tiêu đề → Thêm sách → search mã/tên, filter publication/availability → bảng bìa/mã/tên/giá/khả dụng/xuất bản/cập nhật/thao tác → pagination.

MVP chỉ nhập thủ công, không có nút import CSV/Excel. Import là bước ngay sau MVP: tạo mới thành nháp, mã trùng báo lỗi, không ghi đè; file mẫu/preview/lỗi sẽ đặc tả riêng. Cập nhật sách đang có qua import để giai đoạn sau.

Không có doanh thu/đơn hàng dashboard. Owner đổi trạng thái bằng control rõ ràng, cập nhật server thành công mới báo thành công; network error giữ nguyên trạng thái đã xác nhận trước đó. STAFF không có control tạo hoặc sửa sách, ảnh, trạng thái. Backend từ chối request vượt quyền kể cả tự gọi API.

## Editor — desktop

Danh sách sách quản trị hiển thị cột “Tồn kho” bằng tổng tồn các biến thể, gồm cả 0;
bộ lọc Còn hàng/Hết hàng vẫn dựa trên khả dụng dẫn xuất từ tổng tồn.

Cột nội dung chính: chọn/thả nhiều file tối đa8ảnh  lên đầu form tạo/sửa, mặc định FRONT/BACK/SPINE/INSIDE_1..INSIDE_5, alt text, bìa trước làm thumbnail → tên sách, ISBN, NXB/tác giả, ngôn ngữ → chọn một thể loại, mọi thể loại ngoài Board book có lựa chọn Paperback hoặc Hardcover → khoảng giá từ–đến, trọng lượng gram, đơn giá/kg optional, tồn gộp/ghi chú riêng optional và các thông tin còn lại. Có thể nhập thông tin trong khi ảnh đang upload. Publication, khả dụng dẫn xuất từ tồn, version/cập nhật và sửa/preview/ẩn/hiện theo quyền; hai nút lưu nằm cuối form; xác nhận bộ ảnh khi xuất bản.

Mã bất biến sau khi tạo. Lưu chưa công khai dùng ARCHIVED, không có DRAFT. Đăng sách yêu cầu tên, khoảng giá nguyên dương, trọng lượng gram nguyên dương, thể loại, kiểu bìa trừ Board book, 2–8 ảnh có FRONT/BACK đã kiểm tra. Upload tạm24giờ không sinh sách/mã; hết hạn giữ form/file để tạo lại phiên. Retry final giữ cùng payload để tránh tạo trùng. Sách ẩn có thể lưu thiếu kiểu bìa. Có lựa chọn mức đọc “Chưa xác định”; mức đọc/link video không chặn publish. Có lỗi phải nêu trường/ảnh nào và giữ dữ liệu người dùng vừa nhập. Rời form chưa lưu có cảnh báo. Version conflict không ghi đè; cho tải bản mới và đối chiếu thay đổi. Upload có progress/lỗi từng ảnh; không báo lưu hoàn tất khi ảnh chưa gắn vào cuốn.

### Nhập giá theo kg và tồn gộp — duyệt06/11

- Ngôn ngữ mới mặc định Tiếng Anh, không điền đè sách cũ. VND input giữ model
  nguyên, dấu phân nhóm/caret. DATA giữ công thức +15% và làm tròn lên nghìn.
- Hai giá tự tính khi user đổi U/W, vẫn sửa tay; không tính khi load/upload.
- Một ô tồn mặc định1, max từ stockLimit; tên trùng không tự gộp hoặc tăng tồn.
- Ghi chú nội bộ optional≤4000, không cần để publish; không hiển thị public.
- Cảnh báo tên trùng dùng has-error của field hiện hành (nhãn/viền đỏ/icon/helper),
  nhưng không setErrors hoặc khóa save/publish; ưu tiên validation thật.
- Nội dung: “Tên sách đã tồn tại. Vui lòng kiểm tra sách đã có trước khi thêm mới.”
- Lookup300ms, hủy stale response, loại ID đang sửa. Lỗi mạng báo chưa kiểm tra,
  vẫn lưu được; helper aria-describedby/live hỗ trợ đọc màn hình.
- Public bỏ selector và Tình trạng thực tế; enquiry không có tên/ID biến thể,
  vẫn kiểm giá/availability trước copy, tổng hết thì tư vấn tương đương.
- Ảnh chung không hứa tình trạng mọi bản; tiệm chốt bản và giá qua tin nhắn.
- Wishlist theo mục sách; không giữ kho/đồng bộ thiết bị. Quyền quản trị giữ nguyên.

### Bố cục form nhập sách (cập nhật06/11)

- Khung form `.book-form` thu gọn `max-width: 780px` với Grid 20 cột (`repeat(20, minmax(0, 1fr))`):
  - Hàng 1: Tên sách (`span 15`, ~75%) · ISBN (`span 5`, ~25%).
  - Hàng 2: Nhà xuất bản (`span 8`, 40%) · Tác giả (`span 7`, 35%) · Ngôn ngữ (`span 5`, 25%).
  - Hàng 3: Thể loại (`span 14`, 70%) · Trọng lượng sách (g) (`span 6`, 30%).
  - Hàng 4: Đơn giá/kg (`span 8`) · Giá từ (`span 6`) · Giá đến (`span 6`).
  - Một ô tồn gộp, `max-width: 180px`; không có nút thêm/tên biến thể.
  - Ghi chú nội bộ optional và Mô tả sách: 100% khung 780px.
  - Meta row: Trình độ đọc tham khảo (`7fr`, 35%) · Link video đọc sách (`13fr`, 65%).
  - Panel ảnh: Bỏ câu thừa "Các biến thể dùng chung bộ ảnh; tiệm xác nhận ảnh/video đúng bản khi khách hỏi.".

### Hệ thống Input Field & Custom Dropdown Popover quản trị /admin (duyệt 05/11)

- Thiết kế Notched Outlined Label: nhãn nằm cố định trên viền trên của ô (`background: #ffffff` che viền), không giật chuyển động khi focus/nhập liệu, chiều cao ô 46px, bo góc 8px.
- Trạng thái Active/Focus: viền và nhãn chuyển màu xanh tím Indigo (`#4F46E5`), kèm focus ring `rgba(79, 70, 229, 0.15)`.
- Custom Dropdown Popover (áp dụng cho Thể loại, Trình độ đọc tham khảo và thanh Bộ lọc tại `/admin/sach`):
  - Menu xổ xuống nền sáng `#FFFFFF`, viền `#E4E7EC`, bo góc `10px`, đổ bóng mềm, hover tím nhạt `#F4F3FF`, mục đang chọn hiển thị dấu `✓` bên phải.
  - Mọi thể loại ngoài Board book có menu con Kiểu bìa (`Chưa xác định / Paperback / Hardcover` ở form nhập/sửa sách, hoặc `Tất cả kiểu bìa / Paperback / Hardcover` ở thanh lọc `/admin/sach`). Chỉ cần hover chuột vào dòng thể loại có `›` là tự động xổ menu con bên phải. Ô Thể loại hiển thị kèm kiểu bìa đã chọn.
  - Thanh Bộ lọc tại `/admin/sach` đặt trực tiếp trên một hàng ngang gồm: `Tên hoặc mã sách`, `Xuất bản`, `Khả dụng`, `Thể loại` (gộp `Kiểu bìa`), 2 pill/checkbox `Chưa xuất bản` & `Thiếu thông tin`, và nút `Tìm sách`; tự động lọc ngay khi chọn dropdown hoặc bật/tắt pill.
- Báo lỗi (Error State): viền và nhãn chuyển đỏ (`#D92D20`), icon cảnh báo tam giác (⚠️) hiển thị ở góc phải của ô, helper text bên dưới đổi màu đỏ.
- Áp dụng đồng bộ cho toàn bộ các trang quản trị: Thêm/Sửa sách, Đăng nhập, Bộ lọc danh sách sách, Flash Sale, Bộ sưu tập, Import.

## Thanh điều hướng Admin Sidebar — 06/11/2026

- **Cấu trúc phân cấp / Accordion**: Thêm mục cha "Quản lý sách" dạng accordion có mũi tên xoay (`v` khi mở, `>` khi đóng), mặc định mở sẵn khi truy cập trang quản trị.
- **Mục con (Submenu)**: Thụt lề với đường kẻ dọc tree-line thanh lịch (`#E8E2D8`), phong cách clean text gồm: "Sách", "Bộ sưu tập", "Flash sale" (chỉ hiển thị mục phân quyền cho OWNER).
- **Trạng thái Active**: Nền đỏ pastel vừa vặn (`#FDE8E8`), bo góc dạng pill (`border-radius: 8px`), chữ đỏ đậm `#9B1C28`, bỏ đường viền nhỏ bên trái (`border-left` indicator).
- **Responsive mobile**: Tự động chuyển layout linh hoạt khi màn hình hẹp ($\le 768px$).

## Trạng thái UX dùng chung

Loading, empty, error, forbidden, not-found, unsaved changes và concurrent edit đều cần mô tả/test khi chuyển thành technical spec. Focus rõ, nút có nhãn, form có label, badge không dựa duy nhất vào màu. Public đọc được từ HTML đầu tiên theo chiến lược render đã qua spike; browser API của wishlist/clipboard không chạy trong server initialization.

## Trạng thái triển khai M3 local

Home/catalogue/collection/detail đã nối API, gallery 2–8 ảnh thật (M5), metadata/OG/404 và no-store trên local. Gallery desktop ảnh trước lớn + hai ảnh dưới, mobile một cột nội dung. Bộ lọc dùng details có thể đóng/mở, checkbox tuổi, select thể loại/kiểu bìa; URL giữ query/sort/page. M4 đã thêm wishlist theo mục trên.

Nội dung liên hệ nằm trong dialog native: textarea chọn được, nút copy, mở Zalo khi có link, Escape đóng và trả focus. Link hotline/nhóm lấy cấu hình môi trường; chưa có thì hiển thị đang cập nhật. Chưa kiểm chứng mở Zalo thật hoặc preview crawler Cloudflare.

## Xem ảnh và phản hồi khi nhập sách —30/10

Grid quản trị dùng thumbnail320, khung220px/contain ổnđịnh và chỉtải khi vào
viewport. Nút “Xem ảnh lớn” giữ preview1280 choOWNER/STAFF đượcphép đọc;
dialog hỗtrợ Escape/đóng/trảfocus. Trạngthái đangtảipreview/lỗipreview/tảilại
riêng với đangupload/đãupload; lỗixemảnh khôngbiến thành lỗitạo sách.
Taxonomy/collections có làm mới thủcông; lịch sử chỉtải khi mở. Đăngthànhcông
đi thẳng sang bảnresponse chínhthức, không GET lại ngay khi handoff còn hợp lệ.
Mất phản hồi vẫn thửlại cùng lầnđăng, không tựtạo cuốn thứhai.

## Import CSV/Excel —31/10

OWNER mở Import sách từ danh sách; giao diện tinh gọn đi thẳng vào bước Kiểm tra file (đã bỏ khối hướng dẫn field),
chọn file, kiểm toàn file rồi xác nhận
nhập sách Ẩn. Bỏ bước chuẩn bị/nút tải mẫu theo yêu cầu01/11. Lỗi chỉ rõ dòng/cột để sửa ngoài Excel; chọn file mới xóa preview cũ.
File chỉ ở memory tab; mất phản hồi có retry đúng file/fingerprint, hết phiên giữ
file để đăng nhập và kiểm lại. Receipt dẫn editor từng sách; không bulk publish.
Danh sách có lọc/nhãn Chưa xuất bản và placeholder; ARCHIVED+publishedAtnull
dùng nút Xuất bản, sách từng công khai dùng Hiện sách. Ảnh/editor giữ nguyên.
V4 giữ NXB/tác giả/mô tả sách optional, thêm don_gia_kg optional. Có thì preview
hiện đơn giá và hai giá tự tính; trống hiện Chưa nhập giá và bổ sung khi thêm ảnh.
Form sửa tay được; load/upload ảnh không tính lại giá, thiếu giá chặn xuất bản.
File7/16/20cột cũ vẫn nhận, giữ giá/receipt, không tự gộp dòng trùng tên.
[Contract và hướng dẫn](BOOK_IMPORT.md), [schema](DATA.md#format-file-import--contract-duyệt31102026).


## Trạng thái khởi động và tải dữ liệu — 04/11/2026

- User đổi yêu cầu05/11: mỗi lần mở/reload document luôn hiện logo Mẹ Mây112px
  giữa nền sáng400ms sau decode ảnh rồi fade120ms. Overlay ngoài app-root nên
  HTML SSR/cache vẫn hiện logo. Chuyển route Angular không lặp màn hình mở trang.
- Reduced-motion giữ400ms và bỏ fade. Failsafe8s để overlay không khóa trang nếu
  ảnh/script lỗi; tắt JS bỏ overlay. CSR chậm tiếp tục có fallback Đang mở tiệm sách,
  sau10s chưa bootstrap hiện link tải lại.
- Home và Flash Sale có skeleton5cột desktop/2cột mobile; danh mục4cột,3cột ở
  ≤1050px và2cột ở≤720px. Detail skeleton ảnh + nội dung, xếp dọc mobile.
- Skeleton có role=status/aria-busy, hình khối trang trí aria-hidden, reduced-motion
  tắt animation; lỗi chuyển sang PublicError hiện hành, không giữ skeleton vô hạn.
- Detail chỉ tải ảnh lớn được chọn; thumbnail ưu tiên WebP320. URL cùng asset/
  size/format/cacheKey ổn định để tái sử dụng cache và xác thực ETag.

## Lưu/xuất bản, nhóm ảnh và tags —06/11/2026

- Mới/ARCHIVED: “Lưu thay đổi” secondary trái và “Lưu và xuất bản” đỏ primary phải,
  grid50:50 cùng cao48px. PUBLISHED: một “Lưu thay đổi” toàn chiều rộng; giữẨn sách,
  bỏ nútXuất bản trùng bên dưới. Trạng thái gần nút: Chưa từng xuất bản/Đang ẩn/Đã xuất bản.
- Save-only cho thiếu metadata ở ARCHIVED; publish mới kiểm đủ và checkbox đúngảnh.
  Đang lưu khóa thao tác xung đột, loading theo hành động, lỗi giữform/ảnh.
  Kết quả chưa rõ phải kiểm session/book trước retry, không tự báo xuất bản.
- Một nhóm tối đa tám ảnh. Chọn nhiều file, thay/gỡ ảnh, đổi vai trò, xem lớn,
  thử lại và chỉnh metadata. Khi xuất bản, tất cả ảnh ACTIVE hiển thị cùng sách.
- Fieldset “Đặc điểm sách” checkbox, đếm n/3; chọn tối đa3, nút “Đặt nổi bật”
  đưa tag chọn lên đầu, không cần drag. Không tự gắn theo tên hoặc thể loại.
- Book card Home/catalogue/collection/related: tối đa1tag đầu ở góc dưới trái ảnh,
  nềncream/chữđỏ có tương phản; không chồng giá/discount/stock/wishlist, pointer-events
  none, text dài ellipsis, label đầy đủ vẫn screenreader đọc và titletooltip.
- Detail dưới tiêu đề hiện tất cảtags theo thứ tự, wrap/mobile, khônglink/filter.
  Khôngfeatures khôngplaceholder; khungảnh giữ kích thước, không layoutshift đáng kể.
- Preview mô phỏng khách với tất cả ảnh ACTIVE và tags; ghi chú và nguồn ảnh chỉ ở admin.

## Box tiện ích & hỗ trợ bên dưới Banner Hero — 06–07/11/2026 (chuẩn mẫu IPM)

- **Vị trí & Bố cục**: Đặt ngay dưới Banner Hero trên Trang chủ (`/`), 4 box ngang trên Desktop (`repeat(4, 1fr)`) và lưới 2x2 trên Mobile (`repeat(2, 1fr)`).
- **Thẻ thông tin**: Nền trắng `#FFFFFF`, viền đỏ thương hiệu 1px `#9B1C28`, bo góc vuông 4px chuẩn mẫu IPM, hover bóng đổ nhẹ và đổi sắc đỏ đậm `#7D131E`. Icon SVG đỏ trần (không nền phụ), tiêu đề in hoa đậm 2 dòng (`font-weight: 800`).
- **4 nội dung**:
  1. "ƯU ĐÃI VẬN CHUYỂN" (icon 🚚): mở popup chi tiết ưu đãi vận chuyển (`ShippingPromoDialog`).
  2. "CÁCH HỎI MUA SÁCH" (icon 💬): mở popup hướng dẫn 4 bước hỏi mua sách (`HowToBuyDialog`).
  3. "CỘNG ĐỒNG MẸ MÂY" (icon 👥): link mở Zalo Group từ cấu hình `contactConfig.groupUrl` (tab mới).
  4. "HOTLINE" (icon 📞 đặc kèm 3 sóng âm IPM): tiêu đề `HOTLINE:` và 2 dòng số `0966 075 005` / `0703 260 005` in đậm căn giữa (link `tel:` trực tiếp).

### Popup "Ưu đãi vận chuyển" & "Cách hỏi mua sách" — 06–07/11/2026

- **Khung & Backdrop dùng chung**: Modal `<dialog>` HTML5 rộng `min(760px, calc(100% - 32px))`, bo góc 20px, bóng đổ mềm `0 16px 48px rgba(41, 39, 36, 0.22)`, backdrop `rgba(30, 27, 24, 0.65)` kèm `backdrop-filter: blur(3px)`. Nút ✕ tròn góc trên bên phải, nút chính `Đã hiểu` đỏ thương hiệu `#9B1C28` ở chân, hỗ trợ phím Escape và click backdrop đóng tự nhiên và trả focus về nút kích hoạt.
- **Popup "Ưu đãi vận chuyển" (`ShippingPromoDialog`)**:
  - **Header**: Hình tròn 105px (85px mobile) nền `#FDF2F2` chứa SVG xe tải giao hàng đồng bộ bảng màu Mẹ Mây (`#9B1C28`, `#FBE4E6`, `#E06C78`, `#F59E0B`), tiêu đề `Ưu đãi vận chuyển tại Mẹ Mây` font `Baloo 2` đỏ `#9B1C28`.
  - **5 khung thông tin** (lưới 2x2 cho 4 mức đơn ở trên + khung thứ 5 trải ngang `grid-column: 1 / -1` ở dưới; mobile `<= 640px` xếp 1 cột), bên trái mỗi khung là chấm tròn nhỏ `.step-dot` viền đỏ `#9B1C28`:
    1. `Đơn dưới 150k` — `Ship 25k`
    2. `Đơn 150k - 300k` — `Ship 20k`
    3. `Đơn 300k - 500k` — `Ship 16k`
    4. `Đơn trên 500k` — `Hỗ trợ 50% ship không quá 50k`
    5. `Quy định khối lượng` — `Áp dụng cho đơn dưới 3kg. Mỗi kg chênh ra thêm + 6k/kg`
- **Popup "Cách hỏi mua sách" (`HowToBuyDialog`)**:
  - **Header**: Hình minh họa liên hệ tròn (`/images/how-to-buy-contact.jpg`), tiêu đề `Cách hỏi mua sách tại Mẹ Mây` font `Baloo 2` đỏ `#9B1C28`.
  - **4 khung bước** (lưới 2x2 trên desktop, 1 cột trên mobile `<= 640px`), huy hiệu tròn đỏ đánh số 1–4:
    - Bước 1: `Thêm sách vào “Danh sách quan tâm”`
    - Bước 2: `Vào “Danh sách quan tâm” chọn tất cả sách cần kiểm tra video tình trạng thật`
    - Bước 3: `Bấm “Chuẩn bị nội dung hỏi mua”`
    - Bước 4: `Gửi yêu cầu qua Zalo Hotline` (`Bấm “Sao chép nội dung” => “Mở zalo” => Dán & gửi tin nhắn yêu cầu cho tiệm qua hotline zalo`)

## Carousel 10 cuốn trên Trang chủ & Quản trị "Hiển thị sách nổi bật" — 07/11/2026

- **Trang chủ (`/`)**:
  - Tất cả các kệ sách (`Sách mới đăng`, `Board books cho bé nhỏ`, `Picture books`, tối đa 2 `Bộ sưu tập` đang bật, và khối `Flash Sale`) hiển thị tối đa **10 cuốn** trên một thanh trượt ngang (`scroll-snap-type: x mandatory`).
  - Khung nhìn hiển thị 5 thẻ trên Desktop, 3 thẻ trên Tablet (`≤ 850px`), 2 thẻ trên Mobile (`≤ 560px`).
  - Nút mũi tên tròn hai bên (`‹` / `›`): mỗi lần bấm trượt đúng **1 cuốn sách** (`1 card width + gap`); tự động làm mờ và khóa (`disabled`) nút trái khi ở đầu dãy hoặc nút phải khi ở cuối dãy; ẩn nút nếu kệ có từ 5 cuốn trở xuống.
- **Quản trị `/admin/sach-noi-bat` ("Hiển thị sách nổi bật")**:
  - Nằm trong nhóm menu **Quản lý sách**, chỉ dành cho quyền `OWNER`.
  - Cho phép tìm kiếm trực quan theo tên sách, mã sách hoặc NXB (lọc theo đúng thể loại/bộ sưu tập của kệ), bấm `+ Ghim` tối đa 10 cuốn/kệ, sắp xếp thứ tự ưu tiên bằng nút `↑` / `↓` hoặc `Bỏ`.
  - Hiển thị nhãn trạng thái từng cuốn ghim: `Đang hiển thị trên Home` (khi `PUBLISHED` & `AVAILABLE`) hoặc cảnh báo `Đã bán / Đang ẩn — tự động nhường chỗ trên Home`.

## Hàng chờ và Thùng rác

- Trang sửa sách có hàng chờ ghim bên phải trên desktop. Màn hình hẹp mở
  hộp thoại qua nút Chưa xuất bản. Danh sách lọc sách Ẩn chưa từng đăng,
  hỗ trợ tìm tên/mã và phân trang.
- **Xuất bản và mở cuốn tiếp theo** chuyển cuốn sau khi xác nhận ghi
  thành công. Chọn cuốn đầu tiên trong hàng chờ theo thứ tự cập nhật mới
  nhất và ID giảm dần, bỏ qua từ khóa trong panel. Hàng chờ hết hoặc tải lỗi
  thì ở lại. **Lưu và xuất bản** ở lại cuốn hiện tại. Đổi cuốn dùng kiểm
  tra thay đổi chưa lưu và thao tác ảnh đang chạy.
- Icon thùng rác nằm bên phải Cập nhật, mở hộp thoại tên/mã và cảnh báo
  xóa vĩnh viễn sau 7 ngày. Hạn hiển thị theo giờ Việt Nam.
- Hai ảnh bổ sung có checkbox **Hiện trên trang sách**, mặc định tắt.
