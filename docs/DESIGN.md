# Mẹ Mây — thiết kế UX hiện hành

Cập nhật 22/10/2026. Phạm vi M0 và baseline MVP trước M2 đã duyệt; không coi wireframe là UI đã triển khai. Tham khảo [ảnh người dùng cung cấp](assets/nxbkimdong.com.vn.png), không sao chép thương hiệu/nội dung của mẫu. Hạ tầng và phạm vi sản phẩm xem [MASTER_PLAN](MASTER_PLAN.md).

## Sitemap và nhiệm vụ từng trang

| Route gợi ý | Vai trò | Hành động chính |
|---|---|---|
| `/` | Home nhiều hàng sách | Tìm kiếm, mở nhóm, xem cuốn |
| `/sach` | Catalogue đầy đủ | Tìm/lọc/sắp xếp/phân trang; filter lưu URL |
| `/bo-suu-tap/:slug` | Nhóm biên tập | Duyệt các cuốn thuộc nhóm |
| `/sach/:slug` | Chi tiết một cuốn vật lý | Xem ba ảnh và mô tả lỗi; trái tim wishlist; liên hệ/tư vấn tương đương qua Zalo; tham gia nhóm |
| `/quan-tam` | Danh sách cục bộ trên thiết bị | Xem trạng thái mới; xóa; sao chép nhiều cuốn; mở kênh chat |
| `/gioi-thieu`, `/cach-mua`, `/lien-he` | Nội dung cửa hàng | Đọc thông tin thật, chọn liên hệ |
| `/admin/dang-nhap` | Đăng nhập quản trị | Xác thực Owner/Staff |
| `/admin/sach` | Bảng quản trị | Tìm mã, mở editor, xem trạng thái |
| `/admin/sach/moi`, `/admin/sach/:id` | Editor | Nhập cuốn/listing, ảnh, preview, xuất bản/ẩn theo quyền |
| `/admin/danh-muc`, `/admin/bo-suu-tap` | Biên tập taxonomy | Quản lý nhóm và thứ tự hiển thị |

Các tên route là thiết kế, chưa khóa OpenAPI hoặc cấu trúc controller.

## Luồng và các trạng thái cần nhìn thấy

Khách vào Home → mở nhóm/tìm kiếm → chi tiết cuốn → thêm quan tâm hoặc sao chép thông tin sách → Zalo hotline cá nhân có zBusiness → cửa hàng xác nhận và chốt. Bấm liên hệ không giữ sách hoặc thay đổi khả dụng.

Quản trị tạo nháp → nhập dữ liệu/ảnh thật → preview → Owner xuất bản → người có quyền cập nhật sold sau khi chốt ngoài web. Cùng tên vẫn có mã và trang riêng cho từng cuốn.

Danh sách quan tâm đọc lại trạng thái từ API khi mở; nếu API lỗi, ghi “Chưa kiểm tra được tình trạng” thay vì coi cache là còn hàng. Cuốn đã bán được cảnh báo; cuốn ẩn/không tìm thấy hiển thị không còn công khai, không lộ lại dữ liệu nháp. Chỉ sao chép thông tin công khai đã xác nhận, kèm lưu ý không giữ sách.

Publication: `DRAFT` / `PUBLISHED` / `ARCHIVED`; availability: `AVAILABLE` (Còn hàng) / `SOLD` (Hết hàng). Hai nhóm độc lập. SOLD không tự archive; trang chi tiết vẫn tồn tại nếu còn published. Không có Đang giữ trong MVP.

## Quyền thiết kế M0

| Thao tác | STAFF | OWNER |
|---|---|---|
| Xem quản trị, tạo/sửa nháp và ảnh nháp | Có | Có |
| Preview nháp được bảo vệ | Có | Có |
| Xuất bản/ẩn/khôi phục listing | Không | Có |
| Đổi giá/nội dung/ảnh/khả dụng của cuốn đang công khai | Không | Có |
| Sửa taxonomy/bộ sưu tập/thông tin liên hệ | Không | Có |
| Quản lý tài khoản | Không | Có |

Mặc định này làm rõ ranh giới “Staff nhập nháp” trong master plan; nếu cần nhân viên đánh dấu sold, bổ sung quyền riêng qua quyết định được ghi lại. Không mở rộng quyền qua UI đơn thuần.


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

1. **Utility bar:** thông điệp ngắn “Sách ngoại văn đã qua sử dụng cho bé”; link Facebook/Zalo khi đã có. Không tự nhận freeship/giảm giá.
2. **Header:** logo Mẹ Mây (asset mới: `code/frontend/public/logo.jpg`, chưa tích hợp UI), search lớn, Quan tâm (số cuốn), Hướng dẫn mua/Liên hệ. Không có đăng nhập khách/giỏ hàng. Header admin không dùng chung nguyên cụm này.
3. **Navigation:** Tất cả sách, Sách mới đăng, Theo độ tuổi, Theo loại sách, Bộ sưu tập, Cách mua. Dropdown phải thao tác được bằng bàn phím/touch khi triển khai.
4. **Hero ngang:** một banner tĩnh ban đầu, thông điệp giới thiệu sách cũ/ảnh thật; CTA “Xem tất cả sách”. Không cần autoplay/carousel ở MVP. Banner là asset thương hiệu được duyệt sau, không lấy ảnh sale của mẫu.
5. **Flash Sale:** ngay dưới hero, nền đỏ cam, thanh tiêu đề và countdown, thẻ có giá gốc/giá sale/% giảm cùng Xem tất cả. Chỉ hiển thị khi có đợt thật đang hiệu lực; không có thanh số đã bán. Mobile hai cột. OWNER biên tập ở `/admin/flash-sale`.
6. **Sách mới đăng:** tối đa 5 cuốn ở một hàng desktop, sắp theo published_at; “Xem tất cả” mở catalogue có sort phù hợp.
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
- Tên tối đa 2 dòng; mã dễ đọc; giá tham khảo VND nổi bật; nhãn tình trạng vật lý tách khỏi khả dụng; nút trái tim quan tâm có tên truy cập rõ và thể hiện trạng thái đã thêm/xóa.
- Chỉ hiện sale badge/giá gạch ngang khi API xác nhận Flash Sale còn hiệu lực; không có số đã bán, “bán chạy”, rating hoặc preorder giả.
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

Xem [wireframe desktop](assets/wireframes/home-desktop.svg) và [mobile](assets/wireframes/home-mobile.svg). Đây là sơ đồ bố cục, không phải screenshot ứng dụng chạy thật.

## Các màn hình và trạng thái

Đọc cùng phần Home trong tài liệu này và [screen board](assets/wireframes/screens.svg). Nội dung này mô tả UX, chưa khóa cấu trúc component hoặc OpenAPI.

## Catalogue / collection — khách mobile

Header tìm kiếm và Quan tâm dùng chung với Home. Breadcrumb → tên nhóm/số kết quả → sort và nút “Lọc” → grid hai cột → pagination. Bộ lọc nằm trong sheet trên mobile, trong panel trên desktop: chỉ độ tuổi (0–3, 4–6, 7–9, 10+) và thể loại (Board book, Picture book, Bách khoa toàn thư & khoa học, Lịch sử, Chapter, Tuyển tập truyện). Một cuốn có thể gán nhiều nhóm tuổi nhưng chỉ một thể loại. Riêng Picture book có Paperback / Hardcover / Tất cả; “Tất cả” lấy cả hai kiểu, không phải dạng sách để nhập. Không có lọc giá/chủ đề/khả dụng/mức đọc/ngôn ngữ trong MVP. Giữ sort mới nhất và giá tham khảo tăng/giảm.

Nhấn áp dụng cập nhật URL và đưa người dùng tới đầu kết quả; browser back giữ query/filter/page. Xóa tất cả có thể trở lại catalogue mặc định. Khi đổi filter, page về 1. Page/filter không hợp lệ được chuẩn hóa hoặc báo lỗi có hướng dẫn, không crash. Trạng thái không kết quả có nút bỏ bớt bộ lọc; lỗi tải có nút thử lại; loading không giả thành “0 cuốn”.

## Chi tiết cuốn — khách mobile

Breadcrumb → gallery ba ảnh (bìa trước, mặt sau, một trang nội dung) → tiêu đề `Tên | NXB | Tác giả | Độ tuổi` → mã → giá tham khảo và khả dụng → mô tả/tình trạng/lỗi → độ tuổi, mức đọc tham khảo và link video đọc sách → trái tim wishlist và các CTA Zalo. Các trường tiêu đề lưu riêng; bỏ phần thiếu và dấu phân cách thừa. Trên desktop gallery và thông tin thành hai cột; mobile một cột, vùng CTA không che nội dung.

Giá tham khảo kèm “Giá sẽ thay đổi dựa vào tình trạng sách cụ thể.” Mức đọc theo bảy nhãn tại [DATA](DATA.md), từ Starters · Pre A1 đến Proficiency · C2; Flyers / Key cùng A2. Có mức thì kèm chú thích “Mức gợi ý do tiệm tổng hợp, không phải chứng nhận Cambridge cho cuốn sách.” Chưa xác định thì ẩn trường; không tự gán từ tuổi/thể loại. Link đọc tham khảo mở video đọc sách bên ngoài, không yêu cầu upload/player video.

Các nút trên detail:

- Trái tim thêm/xóa wishlist trên thiết bị, không cần tài khoản; có nhãn truy cập và trạng thái rõ.
- AVAILABLE: “Liên hệ” để hỏi thêm và xem ảnh/video thật.
- SOLD: hiển thị “Hết hàng”, đổi nút thành “Tư vấn sách tương đương”; giữ thông tin cuốn khách đang xem, không hứa cuốn còn sẵn hoặc tự gợi ý bằng hệ thống.
- “Tham gia cộng đồng để nhận thông tin ưu đãi” mở nhóm Zalo riêng, dùng cho cả còn/hết hàng.

Hai nút tư vấn dùng chung hotline Zalo cá nhân có zBusiness. Nội dung soạn sẵn gồm mục đích hỏi, mã, tên, giá tham khảo và URL; hết hàng đổi mục đích thành hỏi sách tương đương. Chỉ dùng điền sẵn khi đã kiểm chứng được với kênh thực tế. Phương án MVP: mở hướng dẫn với nội dung đã soạn, nút “Sao chép” và “Mở Zalo”; khách dán rồi gửi. Clipboard thất bại có ô văn bản chọn/copy thủ công. Không tự gửi tin, không tự giữ sách; thiếu link hotline/nhóm thật phải được giải quyết trước nghiệm thu.

Chỉ ba ảnh public; ảnh/video thực tế bổ sung trao đổi qua Zalo. Mô tả tình trạng/lỗi phải dễ thấy, không có ảnh lỗi không có nghĩa không có lỗi. Không bịa ISBN/tuổi/author. Khi archived, public URL không trả chi tiết cuốn; public preview không dùng endpoint admin.

## Danh sách quan tâm — khách mobile

Mỗi dòng: ảnh nhỏ, tên, mã, giá tham khảo mới nhất, trạng thái mới nhất, mở chi tiết và xóa. Không có quantity, phí ship, nút thanh toán hoặc tổng đơn. Dưới danh sách: Sao chép danh sách hỏi mua, mở Zalo hotline với luồng copy dự phòng như detail; giải thích danh sách lưu trên thiết bị, không giữ sách.

Format copy một cuốn: `Mã | Tên | Giá tham khảo | URL`. Nhiều cuốn: một dòng/cuốn và câu cuối đề nghị tiệm xác nhận còn/giá. Cuốn sold/hidden được loại khỏi danh sách hỏi mua còn sẵn và báo lý do; khi API lỗi không âm thầm gửi giá cũ. Clipboard lỗi có ô văn bản để chọn/copy thủ công.

## Bảng quản trị — desktop

Sidebar nhỏ: Sách, Bộ sưu tập, Danh mục, Tài khoản (Owner), Cấu hình (Owner). Main: tiêu đề → Thêm sách → search mã/tên, filter publication/availability → bảng bìa/mã/tên/giá/khả dụng/xuất bản/cập nhật/thao tác → pagination.

MVP chỉ nhập thủ công, không có nút import CSV/Excel. Import là bước ngay sau MVP: tạo mới thành nháp, mã trùng báo lỗi, không ghi đè; file mẫu/preview/lỗi sẽ đặc tả riêng. Cập nhật sách đang có qua import để giai đoạn sau.

Không có doanh thu/đơn hàng dashboard. Owner đổi trạng thái bằng control rõ ràng, cập nhật server thành công mới báo thành công; network error giữ nguyên trạng thái đã xác nhận trước đó. STAFF không có control xuất bản hoặc đổi sách đang công khai. Backend từ chối request vượt quyền kể cả tự gọi API.

## Editor — desktop

Cột nội dung chính: thông tin cuốn (mã, tên, NXB/tác giả, tình trạng/lỗi, ngôn ngữ) → chọn một thể loại, riêng Picture book bắt buộc chọn Paperback hoặc Hardcover → ba vị trí upload FRONT/BACK/INSIDE, alt text, bìa trước làm thumbnail → listing mô tả + giá tham khảo + nhiều nhóm tuổi/collection + mức đọc và link video đọc sách tùy chọn. Sidebar phải: publication, availability, version/cập nhật, lưu nháp/preview/xuất bản theo quyền.

Mã bất biến sau khi tạo. Lưu nháp cho phép thiếu field xuất bản; publish yêu cầu tên, mã, giá tham khảo nguyên >0, một thể loại, đúng một kiểu bìa nếu Picture book, condition note và đủ ba ảnh thật FRONT/BACK/INSIDE đã kiểm tra. Không cho lưu Picture book thiếu kiểu bìa hoặc có giá trị “Tất cả”. Có lựa chọn mức đọc “Chưa xác định”; mức đọc/link video không chặn publish. Có lỗi phải nêu trường/ảnh nào và giữ dữ liệu người dùng vừa nhập. Rời form chưa lưu có cảnh báo. Version conflict không ghi đè; cho tải bản mới và đối chiếu thay đổi. Upload có progress/lỗi từng ảnh; không báo lưu hoàn tất khi ảnh chưa gắn vào cuốn.

## Trạng thái UX dùng chung

Loading, empty, error, forbidden, not-found, unsaved changes và concurrent edit đều cần mô tả/test khi chuyển thành technical spec. Focus rõ, nút có nhãn, form có label, badge không dựa duy nhất vào màu. Public đọc được từ HTML đầu tiên theo chiến lược render đã qua spike; browser API của wishlist/clipboard không chạy trong server initialization.

## Trạng thái triển khai M3 local

Home/catalogue/collection/detail đã nối API, ba ảnh thật, metadata/OG/404 và no-store trên local. Gallery desktop ảnh trước lớn + hai ảnh dưới, mobile một cột nội dung. Bộ lọc dùng details có thể đóng/mở, checkbox tuổi, select thể loại/kiểu bìa; URL giữ query/sort/page. Không hiển thị control wishlist trước M4.

Nội dung liên hệ nằm trong dialog native: textarea chọn được, nút copy, mở Zalo khi có link, Escape đóng và trả focus. Link hotline/nhóm lấy cấu hình môi trường; chưa có thì hiển thị đang cập nhật. Chưa kiểm chứng mở Zalo thật hoặc preview crawler Cloudflare.
