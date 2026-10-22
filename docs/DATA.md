# Mẹ Mây — schema nhập liệu và pilot dữ liệu

## Hai tập dữ liệu khác nhau

[synthetic-books.csv](fixtures/synthetic-books.csv) có **12 bản ghi hoàn toàn giả lập** để review schema/trạng thái. Tên, giá, tuổi, tình trạng và ISBN (nếu có) chỉ phục vụ test; không phải hàng đang bán hoặc dữ liệu OCR. Tất cả `dataset_kind=SYNTHETIC`, `verified=false`, `front_image_ref` rỗng: **không đủ điều kiện xuất bản thật**, kể cả cột publication được đặt PUBLISHED để mô phỏng UX.

Pilot M0 thật cần 10–20 cuốn do chủ chọn. Chưa có dữ liệu thật trong workspace được xác nhận cho mục đích này. Không dùng bìa Kim Đồng, ảnh AI hoặc ảnh cuốn khác để thay bằng chứng của cuốn vật lý.

## Field nhập liệu đề xuất

| Field | Nơi thuộc về | Yêu cầu và kiểm tra |
|---|---|---|
| book_code | BookCopy | Duy nhất, ổn định; fixture có prefix DEMO để không nhầm mã vận hành |
| title | BookCopy | Bắt buộc khi publish; giữ tên sách nguồn |
| format | BookCopy | BOARD / PICTURE / CHAPTER / OTHER; taxonomy có thể điều chỉnh |
| language | BookCopy | Tùy chọn khi chưa xác minh; không mặc định EN |
| isbn | BookCopy | Tùy chọn; trùng giữa các cuốn là hợp lệ; xác minh khi dùng dữ liệu thật |
| author, publisher | BookCopy | Tùy chọn; không suy đoán |
| condition_grade | BookCopy | Nhãn biên tập VERY_GOOD / GOOD / FAIR đề xuất, không thay condition_note |
| condition_note | BookCopy | Mô tả thực tế bắt buộc để publish, nêu lỗi nhìn thấy và phần chưa kiểm tra |
| availability | BookCopy | AVAILABLE / HELD / SOLD, do người có quyền đổi |
| slug | Listing | Duy nhất, ổn định; chứa code khi cần tránh trùng tên |
| price_vnd | Listing | Số nguyên VND >0 khi publish, không suy từ ảnh |
| description | Listing | Nội dung giới thiệu theo dữ liệu có; không tự gán chứng chỉ/reading level |
| publication_status | Listing | DRAFT / PUBLISHED / ARCHIVED; độc lập availability |
| age_min, age_max | Taxonomy listing | Số nguyên nullable; nếu có thì min ≤ max; gợi ý do chủ xác minh |
| topic, collection | Mapping | Nhãn khởi điểm để review, không khóa thành enum cứng |
| front_image_ref | BookMedia | Bắt buộc có bìa thật trước publish; fixture không có ảnh |
| media type/order/alt/defect note | BookMedia | FRONT/BACK/SPINE/INSIDE/DEFECT/OTHER; ghi nhận từng ảnh, không gom thành chuỗi URL khó kiểm tra |
| source_ref | BookMedia | Tùy chọn, tham chiếu nguồn ảnh nội bộ không chứa dữ liệu khách; không public mặc định |
| version/timestamps/actor | Server/audit | Server quản lý khi triển khai, không tin giá trị client tự gửi làm audit |

Các cột `dataset_kind`, `verified` chỉ để quản trị fixture/pilot, không mặc định thêm vào schema production. File CSV là mẫu trao đổi M0, không phải thiết kế importer hay migration database.

## Ca dữ liệu cần review

- Hai cuốn cùng tên, cùng ISBN nhưng khác code/giá/lỗi.
- Cuốn còn, đang giữ, đã bán; published/nháp/lưu trữ độc lập.
- Thiếu ISBN/author/publisher; không chặn nhập nháp.
- Tên dài; dữ liệu tiếng Việt và tiếng Anh; độ tuổi null.
- Ảnh bìa thiếu; lỗi chưa xác minh; giá nháp rỗng: không cho publish thật.
- Cuốn đang ở wishlist rồi bị sold hoặc ẩn.

## Quy trình pilot thật và đầu ra cần ghi

1. Chủ chọn 10–20 cuốn, gán mã và xác nhận giá.
2. Chuẩn bị ảnh bìa/ruột/lỗi đúng từng cuốn; tách dữ liệu khách trên sticker nếu có trước khi đưa lên web.
3. Điền mẫu field, để trống dữ liệu chưa biết; ghi riêng các ảnh và thứ tự cần có.
4. Một người kiểm tra lại mã/giá/ảnh/tình trạng với cuốn thật.
5. Ghi thời gian nhập mỗi cuốn, field khó hiểu và thiếu sót ảnh; không đặt mục tiêu tốc độ khi chưa đo.
6. Sửa schema/taxonomy và brief UI theo phát hiện; ghi quyết định vào DEV_LOG trước khi tạo technical spec.

M0 đã được duyệt về phạm vi/UX; pilot thật vẫn chưa đạt cho tới khi các bước trên có bằng chứng. Bộ demo không phải ground truth nghiên cứu AI hoặc dữ liệu thương mại được phép xuất bản.
