# Mẹ Mây — schema nhập liệu và pilot dữ liệu

## Hai tập dữ liệu khác nhau

[synthetic-books.csv](fixtures/synthetic-books.csv) có **12 bản ghi hoàn toàn giả lập** để review schema/trạng thái. Tên, giá, tuổi, tình trạng và ISBN (nếu có) chỉ phục vụ test; không phải hàng đang bán hoặc dữ liệu OCR. Tất cả `dataset_kind=SYNTHETIC`, `verified=false`, `front_image_ref` rỗng: **không đủ điều kiện xuất bản thật**, kể cả cột publication được đặt PUBLISHED để mô phỏng UX.

Pilot M0 thật cần 10–20 cuốn do chủ chọn. Chưa có dữ liệu thật trong workspace được xác nhận cho mục đích này. Không dùng bìa Kim Đồng, ảnh AI hoặc ảnh cuốn khác để thay bằng chứng của cuốn vật lý.

Fixture CSV và wireframe M0 được giữ làm bằng chứng thiết kế trước đây, **chưa chuyển sang baseline trước M2**: các cột `format`, `age_min/age_max`, trạng thái HELD hoặc nhiều loại ảnh cũ không phải contract nhập liệu hiện hành. Không đưa fixture này thẳng vào production. MVP nhập thủ công; CSV/Excel tạo mới thành nháp là bước ngay sau MVP, chưa có định dạng importer được duyệt.

## Field nhập liệu baseline trước M2

| Field | Nơi thuộc về | Yêu cầu và kiểm tra |
|---|---|---|
| book_code | BookCopy | Website tự sinh mã tăng dần, duy nhất và bất biến sau khi tạo; dùng để dán nhãn/trao đổi với tiệm. Không lấy từ tên sách, ISBN hoặc mã khách; fixture có prefix DEMO để không nhầm mã vận hành |
| title | BookCopy | Bắt buộc khi publish; giữ tên sách nguồn |
| category_id | Listing | Đúng một thể loại: Board book / Picture book / Bách khoa toàn thư & khoa học / Lịch sử / Chapter / Tuyển tập truyện; bắt buộc khi publish |
| binding | BookCopy | Khi nhập Picture book bắt buộc đúng một kiểu Paperback hoặc Hardcover; “Tất cả” chỉ là bộ lọc, không lưu vào sách |
| language | BookCopy | Tùy chọn khi chưa xác minh; không mặc định EN |
| isbn | BookCopy | Tùy chọn; trùng giữa các cuốn là hợp lệ; xác minh khi dùng dữ liệu thật |
| author, publisher | BookCopy | Tùy chọn; không suy đoán |
| condition_grade | BookCopy | Nhãn biên tập VERY_GOOD / GOOD / FAIR đề xuất, không thay condition_note |
| condition_note | BookCopy | Mô tả thực tế bắt buộc để publish, nêu lỗi nhìn thấy và phần chưa kiểm tra |
| availability | BookCopy | AVAILABLE (Còn hàng) / SOLD (Hết hàng), do người có quyền đổi; không có Đang giữ trong MVP |
| slug | Listing | Duy nhất, ổn định; chứa code khi cần tránh trùng tên |
| price_vnd | Listing | Một mức giá tham khảo, số nguyên VND >0 khi publish, không suy từ ảnh; hiển thị “Giá sẽ thay đổi dựa vào tình trạng sách cụ thể.” |
| description | Listing | Nội dung giới thiệu theo dữ liệu có; không tự gán chứng chỉ/reading level |
| publication_status | Listing | DRAFT / PUBLISHED / ARCHIVED; độc lập availability |
| age_groups | Mapping listing | Chọn nhiều nhóm trong 0–3 / 4–6 / 7–9 / 10+; để trống nếu chưa xác định, không tự suy từ mức đọc |
| reading_level | Listing | Một trong Pre A1 / A1 / A2 / B1 / B2 / C1 / C2 hoặc chưa xác định; nhãn Cambridge theo bảng bên dưới |
| reading_video_url | Listing | Link ngoài tới video đọc sách, tùy chọn; không upload video hoặc lưu bản sách trong MVP |
| collection | Mapping | Bộ sưu tập biên tập; không phải bộ lọc chủ đề của MVP |
| ảnh FRONT / BACK / INSIDE | BookMedia | Đủ đúng ba ảnh thật trước publish: bìa trước, mặt sau, một trang nội dung; bìa trước là thumbnail; fixture không có ảnh |
| media type/order/alt | BookMedia | Ba vai trò cố định FRONT/BACK/INSIDE, mỗi vai trò một ảnh public; metadata từng ảnh, không gom URL thành chuỗi. Tình trạng/lỗi nằm trong condition_note; ảnh/video bổ sung trao đổi qua Zalo |
| source_ref | BookMedia | Tùy chọn, tham chiếu nguồn ảnh nội bộ không chứa dữ liệu khách; không public mặc định |
| version/timestamps/actor | Server/audit | Server quản lý khi triển khai, không tin giá trị client tự gửi làm audit |

Các cột `dataset_kind`, `verified` chỉ để quản trị fixture/pilot, không mặc định thêm vào schema production. File CSV là mẫu trao đổi M0, không phải thiết kế importer hay migration database.

## Quy tắc hiển thị và mức đọc

Tiêu đề detail ghép `Tên | NXB | Tác giả | Độ tuổi` từ các trường riêng; thiếu phần nào bỏ phần đó và dấu phân cách thừa, không sửa tên sách nguồn. Mã vẫn hiển thị riêng.

| Mức | Nhãn hiển thị |
|---|---|
| Pre A1 | Starters · Pre A1 |
| A1 | Movers · A1 |
| A2 | Flyers / Key · A2 |
| B1 | Preliminary · B1 |
| B2 | First · B2 |
| C1 | Advanced · C1 |
| C2 | Proficiency · C2 |

Mức đọc do chủ chọn thủ công; không suy từ tuổi/thể loại. “Chưa xác định” không chặn xuất bản và ẩn trường public. Khi có mức, detail kèm “Mức gợi ý do tiệm tổng hợp, không phải chứng nhận Cambridge cho cuốn sách.” Không gán nhãn này như chứng nhận cho sách; Flyers/Key cùng A2. Không dùng mức đọc làm bộ lọc MVP.

## Ca dữ liệu cần review

- Hai cuốn cùng tên, cùng ISBN nhưng khác code/giá/lỗi.
- Cuốn còn hàng/hết hàng; published/nháp/lưu trữ độc lập. Không nhập trạng thái HELD từ fixture cũ vào baseline MVP.
- Thiếu ISBN/author/publisher; không chặn nhập nháp.
- Tên dài, thiếu NXB/tác giả không tạo dấu phân cách thừa; dữ liệu tiếng Việt/Anh; tuổi chưa xác định hoặc gán nhiều nhóm.
- Mỗi cuốn đúng một thể loại; Picture book thiếu kiểu bìa hoặc dùng “Tất cả” bị từ chối; Paperback và Hardcover đều xuất hiện ở bộ lọc “Tất cả”.
- Mức đọc chưa xác định vẫn publish được khi đủ các điều kiện khác; không yêu cầu căn cứ, không suy mức đọc từ tuổi/thể loại.
- Thiếu bất kỳ ảnh FRONT/BACK/INSIDE, lỗi chưa xác minh hoặc giá nháp rỗng: không cho publish thật; không bắt có mức đọc/link video.
- Cuốn đang ở wishlist rồi bị sold hoặc ẩn.

## Import ngay sau MVP

MVP chỉ nhập thủ công qua admin. Bước tiếp theo ngay sau MVP hỗ trợ CSV/Excel tạo sách mới thành nháp; mã trùng trong file hoặc database báo lỗi, không ghi đè. Định dạng file, preview và xử lý lỗi sẽ đặc tả tại bước đó; CSV demo M0 không phải file mẫu importer. Cập nhật cả sách đã công khai qua import chỉ làm về sau, có đối chiếu thay đổi, chống ghi đè và audit.

## Quy trình pilot thật và đầu ra cần ghi

Ảnh bảng vận hành do người dùng cung cấp cho thấy phần đang mở có ngày bán, khách, thể loại, tên sách, giá bán và trọng lượng; người dùng xác nhận tiệm hiện chưa quản lý bằng mã. Chỉ dùng làm tham khảo workflow, không chép dữ liệu khách hoặc dùng các dòng bán hàng làm pilot catalogue. Giá bán lịch sử không tự trở thành giá tham khảo hiện tại; nhãn thể loại trong bảng cần chủ xác nhận trước khi đối chiếu taxonomy web. MVP không nhập ngày bán/khách/trọng lượng hoặc tạo module quản lý đơn từ ảnh này.

1. Chủ chọn 10–20 cuốn và xác nhận giá tham khảo; website tự sinh mã khi tạo cuốn, tiệm dùng mã đó để nhận diện đúng vật thể.
2. Chuẩn bị đủ ba ảnh bìa trước/mặt sau/một trang nội dung và mô tả lỗi đúng từng cuốn; tách dữ liệu khách trên sticker nếu có trước khi đưa lên web.
3. Điền mẫu field, để trống dữ liệu chưa biết; ghi riêng các ảnh và thứ tự cần có.
4. Một người kiểm tra lại mã/giá/ảnh/tình trạng với cuốn thật.
5. Ghi thời gian nhập mỗi cuốn, field khó hiểu và thiếu sót ảnh; không đặt mục tiêu tốc độ khi chưa đo.
6. Sửa schema/taxonomy và brief UI theo phát hiện; ghi quyết định vào DEV_LOG trước khi tạo technical spec.

M0 đã được duyệt về phạm vi/UX; pilot thật vẫn chưa đạt cho tới khi các bước trên có bằng chứng. Bộ demo không phải ground truth nghiên cứu AI hoặc dữ liệu thương mại được phép xuất bản.

## Flash Sale M3

Một giá tham khảo trên listing được giữ làm giá gốc. `flash_sale` singleton lưu enabled/starts_at/ends_at/version; `flash_sale_item` gắn listing và sale_price_vnd. OWNER quản lý thủ công, audit và optimistic version; không import hoặc ghi số đã bán.

Public tính giá theo giờ database: chỉ sale đang hiệu lực, PUBLISHED, AVAILABLE và giá sale thấp hơn giá tham khảo. Hết hạn/sold/ẩn/giá không còn hợp lệ thì không trả nhãn giảm giá. Giá gốc lấy giá tham khảo hiện tại, không phải snapshot cố định lúc tạo campaign.
