# Mẹ Mây — schema nhập liệu và pilot dữ liệu

## Hai tập dữ liệu khác nhau

[synthetic-books.csv](fixtures/synthetic-books.csv) có **12 bản ghi hoàn toàn giả lập** để review schema/trạng thái. Tên, giá, tuổi, tình trạng và ISBN (nếu có) chỉ phục vụ test; không phải hàng đang bán hoặc dữ liệu OCR. Tất cả `dataset_kind=SYNTHETIC`, `verified=false`, `front_image_ref` rỗng: **không đủ điều kiện xuất bản thật**, kể cả cột publication được đặt PUBLISHED để mô phỏng UX.

Pilot M0 thật cần 10–20 cuốn do chủ chọn. Chưa có dữ liệu thật trong workspace được xác nhận cho mục đích này. Không dùng bìa Kim Đồng, ảnh AI hoặc ảnh cuốn khác để thay bằng chứng của cuốn vật lý.

Fixture CSV và wireframe M0 được giữ làm bằng chứng thiết kế trước đây, **chưa chuyển sang baseline trước M2**: các cột `format`, `age_min/age_max`, trạng thái HELD hoặc nhiều loại ảnh cũ không phải contract nhập liệu hiện hành. Không đưa fixture này thẳng vào production. MVP nhập thủ công; importer CSV/XLSX được duyệt31/10, contract hiện hành ở mục import bên dưới.

## Field nhập liệu hiện hành sau M5

| Field | Nơi thuộc về | Yêu cầu và kiểm tra |
|---|---|---|
| book_code | BookCopy | Website tự sinh mã tăng dần, duy nhất và bất biến sau khi tạo; dùng để dán nhãn/trao đổi với tiệm. Không lấy từ tên sách, ISBN hoặc mã khách; fixture có prefix DEMO để không nhầm mã vận hành |
| title | BookCopy | Bắt buộc khi publish; giữ tên sách nguồn |
| category_id | Listing | Đúng một thể loại: Board book / Picture book / Bách khoa toàn thư & khoa học / Lịch sử / Chapter / Tuyển tập truyện / Tập đọc / Nấu ăn - thủ công - activity book; bắt buộc khi publish |
| binding | BookCopy | Khi nhập Picture book bắt buộc đúng một kiểu Paperback hoặc Hardcover; “Tất cả” chỉ là bộ lọc, không lưu vào sách |
| language | BookCopy | Form tạo mới điền sẵn “Tiếng Anh”, có thể sửa/xóa; mở sách cũ giữ nguyên ngôn ngữ đã lưu |
| isbn | BookCopy | Tùy chọn; trùng giữa các cuốn là hợp lệ; xác minh khi dùng dữ liệu thật |
| author, publisher | BookCopy | Tùy chọn; không suy đoán |
| condition_grade | BookCopy | HIGH_FRESHNESS (Độ mới cao) / MINOR_FLAWS (Có lỗi nhẹ); giữ nguyên mã/nhãn legacy khi đọc, không thay condition_note |
| condition_note | BookCopy | Mô tả thực tế bắt buộc để publish, nêu lỗi nhìn thấy và phần chưa kiểm tra |
| availability | BookCopy | AVAILABLE khi tổng tồn >0, SOLD khi tổng tồn 0; OWNER cập nhật tồn, không có Đang giữ |
| variants | BookVariant | Ít nhất một dòng: UUID ổn định, tên tối đa100 ký tự, stock nguyên0..999999, thứ tự; không xóa dòng đã lưu |
| slug | Listing | Duy nhất, ổn định; chứa code khi cần tránh trùng tên |
| price_min_vnd, price_max_vnd | Listing | Hai đầu khoảng giá nguyên VND 1..999999999999, min≤max (cho bằng nhau), không suy từ ảnh; hiển thị “Giá sẽ thay đổi dựa vào tình trạng sách cụ thể.” |
| weight_g | BookCopy | Gram nguyên dương, tối đa 9007199254740991; bắt buộc tạo/lưu sửa/hiện lại. Sách cũ null không tự ẩn; public bỏ trường chưa biết |
| description | Listing | Nội dung giới thiệu theo dữ liệu có; không tự gán chứng chỉ/reading level |
| publication_status | Listing | PUBLISHED / ARCHIVED; độc lập availability |
| age_groups | Mapping listing | Chọn nhiều nhóm trong 0–3 / 4–6 / 7–9 / 10+; để trống nếu chưa xác định, không tự suy từ mức đọc |
| reading_level | Listing | Một trong Pre A1 / A1 / A2 / B1 / B2 / C1 / C2 hoặc chưa xác định; nhãn Cambridge theo bảng bên dưới |
| reading_video_url | Listing | Link ngoài tới video đọc sách, tùy chọn; không upload video hoặc lưu bản sách trong MVP |
| collection | Mapping | Bộ sưu tập biên tập; không phải bộ lọc chủ đề của MVP |
| ảnh 2–6 vai trò | BookMedia | FRONT/BACK bắt buộc; SPINE/INSIDE_1/INSIDE_2/INSIDE_3 tùy chọn; bìa trước là thumbnail; fixture không có ảnh |
| media type/order/alt | BookMedia | Sáu vai trò theo thứ tự FRONT/BACK/SPINE/INSIDE_1/INSIDE_2/INSIDE_3, mỗi vai trò tối đa một ảnh public; metadata từng ảnh, không gom URL thành chuỗi. Tình trạng/lỗi nằm trong condition_note; ảnh/video bổ sung trao đổi qua Zalo |
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
- Cuốn còn hàng/hết hàng; published/lưu trữ độc lập. Không nhập trạng thái HELD từ fixture cũ vào baseline MVP.
- Thiếu ISBN/author/publisher; không chặn tạo sách khi đủ trường bắt buộc.
- Tên dài, thiếu NXB/tác giả không tạo dấu phân cách thừa; dữ liệu tiếng Việt/Anh; tuổi chưa xác định hoặc gán nhiều nhóm.
- Mỗi cuốn đúng một thể loại; Picture book thiếu kiểu bìa hoặc dùng “Tất cả” bị từ chối; Paperback và Hardcover đều xuất hiện ở bộ lọc “Tất cả”.
- Mức đọc chưa xác định vẫn publish được khi đủ các điều kiện khác; không yêu cầu căn cứ, không suy mức đọc từ tuổi/thể loại.
- Thiếu FRONT/BACK, trọng lượng, lỗi chưa xác minh hoặc khoảng giá rỗng: không cho publish thật; không bắt có mức đọc/link video.
- Cuốn đang ở wishlist rồi bị sold hoặc ẩn.

## Import ngay sau MVP

CSV/XLSX mẫu website đã triển khai local: đủ metadata, kiểm cả file trước khi
tạo nguyên lô sách mới ARCHIVED; thêm ảnh rồi OWNER tự publish. Không thêm DRAFT,
không cập nhật/gộp theo tên/ISBN, không import ảnh. Receipt bảo đảm retry cùng
nội dung không nhân sách. Quy trình và tiêu chí ở [BOOK_IMPORT](BOOK_IMPORT.md),
bằng chứng và gate online ở [BOOK_IMPORT_VERIFICATION](BOOK_IMPORT_VERIFICATION.md).

## Format file import — contract duyệt31/10/2026

V2/16cột là format hiện hành01/11, cùng schema cho CSV UTF-8 (BOM tùy chọn) và
XLSX sheet `Sach`/headerhàng1. Không nhận xls/xlsm, công thức/macro/date/boolean/
error/merge/external links. Sheet `HuongDan` chỉ hướng dẫn, không là dữ liệu.
Header trim, cho đổi thứ tự; đúng16cột, không thiếu/trùng/cộtlạ. Alias đúng
`kieu_bia (nếu là picture book)` được nhận thành `kieu_bia`, không nhận cả hai cùngfile.
Optional trống không có nghĩa được thiếu cột. Website không có nút tải mẫu.

Mỗi dòng là một sách riêng, không ghép theo tên/ISBN. Tự điền ngôn ngữ **Tiếng Anh**,
một biến thể không tên/tồn1. OWNER thêm ảnh, sửa ngôn ngữ/tồn/thêm biến thể trong
editor rồi tự xuất bản. Hai dòng giống nhau vẫn tạo hai sách trong cùng lô.

| Cột | Bắt buộc có giá trị | Quy tắc |
|---|---|---|
| ten_sach | Có | Text trim, tối đa300 |
| isbn | Không | Text tối đa32, giữ số0đầu; không là khóa duy nhất |
| nha_xuat_ban | Không | Text tối đa200 |
| tac_gia | Không | Text tối đa200 |
| the_loai | Có | Nhãn dễ đọc hoặc code chuẩn của8thểloại hiện hành |
| kieu_bia | Có điều kiện | Paperback/Hardcover hoặc code tương ứng khi Picture Book; thểloại khác đểtrống |
| gia_tu | Có | NguyênVND1..999999999999 |
| gia_den | Có | Cùng giới hạn, không nhỏ hơn gia_tu |
| trong_luong_g | Có | Gram nguyên1..9007199254740991 |
| tinh_trang | Có | Độ mới cao/HIGH_FRESHNESS hoặc Có lỗi nhẹ/MINOR_FLAWS |
| mo_ta_tinh_trang | Có | Text tối đa4000, không tự sinh |
| do_tuoi | Không | 0-3/4-6/7-9/10+ hoặc code; nhận cả dấu– từtaxonomy, nhiều mục ngăn`;`, khôngtrùng |
| mo_ta_sach | Không | Text tối đa10000 |
| trinh_do_doc | Không | Nhãn website hoặc PRE_A1/A1/A2/B1/B2/C1/C2; trống là chưa xác định |
| link_video | Không | AbsoluteHTTPS plain text theo editor, không fetch URL |
| bo_suu_tap | Không | Slugactive, ngăn`;`, tốiđa100, khôngtrùng |

Nhãn/code V2 bỏ khoảngtrắng đầu/cuối, không phân biệt hoa thường; chỉ ánh xạ
alias biết trước, không đoán gần đúng. [Bảng nhãn](BOOK_IMPORT.md#format-v2--chốt0111).
Giá CSV là chữ số ASCII không dấu nhóm/âm/phân số/exponent. XLSX cho textchữsố
hoặc numericnguyên chính xác; ISBN phải text. Giữ Unicode/xuống dòng trong text.
CSV dấu phẩy/quote kép/escape kép; bản ghi multiline vẫn một dònglogic, header1.
V2 tốiđa2MiB/100dòng sách; blankrows bỏ qua, dữ liệu ngoài header không bị lờ đi.

### Tương thích V1/20cột

V1 giữ16field trên và thêm nhom_sach/ngon_ngu/bien_the/ton_kho; phải đủ20header.
Nhãn/mã V1 theo quy tắc cũ (code chuẩn), ngon_ngu và ton_kho bắt buộc, không áp
mặc địnhV2. nhom_sach là ASCII1–50 chữ/số/`_-`, phân biệt hoa thường; mỗi dòng
một biến thể, cùng nhóm phải lặp đầy đủ thông tin chung, tên riêng khi nhiều dòng.
Tồn nguyên0..999999; tên biến thể≤100. Tốiđa500rows/100groups/100variantsnhóm.
Không đổi semanticdigest/receiptV1; retry file cũ vẫn trả mã cũ, không cập nhật sách.
Không coi đổi nội dung hoặc đổi schemaV1→V2 là yêu cầu update lô cũ.

## Quy trình pilot thật và đầu ra cần ghi

Ảnh bảng vận hành do người dùng cung cấp cho thấy phần đang mở có ngày bán, khách, thể loại, tên sách, giá bán và trọng lượng; người dùng xác nhận tiệm hiện chưa quản lý bằng mã. Chỉ dùng làm tham khảo workflow, không chép dữ liệu khách hoặc dùng các dòng bán hàng làm pilot catalogue. Giá bán lịch sử không tự trở thành giá tham khảo hiện tại; nhãn thể loại trong bảng cần chủ xác nhận trước khi đối chiếu taxonomy web. MVP không nhập ngày bán/khách; trọng lượng gram là field M5, không suy từ bảng cũ hoặc tạo module quản lý đơn từ ảnh này.

1. Chủ chọn 10–20 cuốn và xác nhận giá tham khảo; website tự sinh mã khi tạo cuốn, tiệm dùng mã đó để nhận diện đúng vật thể.
2. Chuẩn bị 2–6 ảnh đúng thứ tự bìa/lưng/gáy/nội dung 1–3, bắt buộc bìa/lưng và mô tả tình trạng; các biến thể dùng chung ảnh, tiệm xác nhận ảnh/video đúng bản khi khách hỏi; tách dữ liệu khách trên sticker nếu có trước khi đưa lên web.
3. Điền mẫu field, để trống dữ liệu chưa biết; ghi riêng các ảnh và thứ tự cần có.
4. Một người kiểm tra lại mã/giá/ảnh/tình trạng với cuốn thật.
5. Ghi thời gian nhập mỗi cuốn, field khó hiểu và thiếu sót ảnh; không đặt mục tiêu tốc độ khi chưa đo.
6. Sửa schema/taxonomy và brief UI theo phát hiện; ghi quyết định vào DEV_LOG trước khi tạo technical spec.

M0 đã được duyệt về phạm vi/UX; pilot thật vẫn chưa đạt cho tới khi các bước trên có bằng chứng. Bộ demo không phải ground truth nghiên cứu AI hoặc dữ liệu thương mại được phép xuất bản.

## Flash Sale M3

Khoảng giá tham khảo trên listing được giữ làm giá gốc; sale là một số nguyên thấp hơn giá từ, không hiển thị % giảm. `flash_sale` singleton lưu enabled/starts_at/ends_at/version; `flash_sale_item` gắn listing và sale_price_vnd. OWNER quản lý thủ công, audit và optimistic version; không import hoặc ghi số đã bán.

Public tính giá theo giờ database: chỉ sale đang hiệu lực, PUBLISHED, AVAILABLE và giá sale thấp hơn giá từ. Hết hạn/sold/ẩn/giá không còn hợp lệ thì không trả nhãn giảm giá. Giá gốc lấy giá tham khảo hiện tại, không phải snapshot cố định lúc tạo campaign.

## Tồn kho và biến thể — quyết định 30/10/2026

- Một mã MM/URL đại diện một mục sách, có nhiều bản vật lý theo biến thể tình trạng.
  Không cấp mã mới cho từng bản trong biến thể; không tự gộp sách đang có cùng tên/ISBN.
- Ban đầu một dòng không tên, tồn1; “Thêm biến thể” thêm dòng tồn1. Khi có nhiều dòng,
  mọi tên phải khác nhau sau trim/không phân biệt hoa thường; không để tên trống.
- Dòng mới chưa lưu được gỡ; dòng đã lưu giữ ID, chỉ sửa tên/tồn; đặt0 khi hết.
- Tổng tồn tự cộng, chỉ đọc. Khoảng giá/trọng lượng/thông tin/ảnh/publication dùng chung;
  không thêm giá hoặc ảnh riêng từng biến thể. Mô tả chung không thay xác nhận từng bản.
- V10 chuyển mỗi sách cũ thành một dòng: AVAILABLE→1, SOLD→0; không suy tồn thật cao hơn1.
  Giữ ID/mã/slug/ảnh/giá/publishedAt và grade legacy; không sửa migrationV1–V9.
- Chủ cập nhật sau bán ngoài web; liên hệ và wishlist không trừ/giữ kho hoặc đồng bộ đa kênh.

## Thể loại bổ sung01/11

V12 append2category, giữ6categorycũ/ID/slug/thứtự và dữ liệu sách. Không tự phân
loại lại sách hoặc suy mức đọc từ thểloại. Tập đọc và nhómactivity không có binding;
chỉ Picture Book cần Paperback/Hardcover.

| Code | Nhãn | Slug | sort_order |
|---|---|---|---:|
| READING_PRACTICE | Tập đọc | tap-doc |6|
| COOKING_CRAFT_ACTIVITY | Nấu ăn - thủ công - activity book | nau-an-thu-cong-activity-book |7|

Taxonomy public/admin/form/filter và importer cùng dùng8thểloại sau migration.
FileExcel gốc user giữ nguyên; danh sách dropdown trong file đó vẫn do chủ chỉnh,
website/API đã nhận hai nhãn/code mới. Không tự sửa workbook khi đổi taxonomyDB.
