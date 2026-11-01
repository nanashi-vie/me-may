# Import CSV/Excel — contract hiện hành

Triển khai local31/10–01/11/2026; chưa migrate/deploy online.
[Bằng chứng](BOOK_IMPORT_VERIFICATION.md) và [rollout](DEPLOYMENT.md#import-csvxlsx--v11).

## 1. Mục tiêu và quyết định

User chọn file theo format website, nhập đủ thông tin; tạo sách Ẩn, thêm ảnh
từng sách và chủ tự xuất bản. File thiếu/sai phải được sửa ngoài website rồi
tải lại. Toàn file hợp lệ mới cho xác nhận import; không nhập riêng dòng đúng.

Các lựa chọn đã cân nhắc:
- Nhập dòng đúng/bỏ dòng lỗi: ít chặn hơn nhưng khó theo dõi và dễ nhập lại.
- Kiểm cả file, sửa ngoài Excel, nhập nguyên lô: user chọn; bản đầu dùng hướng này.
- Sửa từng ô trên website: thêm một spreadsheet editor không cần cho bản đầu.

Dùng ARCHIVED hiện có, không thêm DRAFT hoặc pipeline xử lý nền. Chỉ tạo mới;
không sửa sách đã có, không gộp theo tên/ISBN, không import ảnh/URL ảnh/đơn/khách.
Luồng nhập thủ công đã duyệt tiếp tục tạo và publish nguyên tử như hiện tại.
Đặc tả được duyệt này thay quyết định importer cũ “tạo nháp” bằng ARCHIVED;
Contract này thay đặc tả triển khai31/10; DATA giữ schema file hiện hành.

## 2. Format file

V2/16cột đã triển khai local01/11; format/validation tại [DATA](DATA.md#format-file-import--contract-duyệt31102026).
Một dòng=một sáchẨn, mặc định Tiếng Anh/một biến thểkhôngtên/tồn1; thêmảnh rồi sửa
biếnthể/tồn và tựpublish. V1/20cột vẫn nhận để retrylôcũ, không rewrite digest/receipt.
UI hướng dẫn ngắn16field/nhãn, không có bước/nút tải mẫu.

## 3. Kiểm file và xác nhận

OWNER mở “Import sách” từ danh sách admin; xem hướng dẫn field và mã lựa chọn.
Chọn một file → bấm “Kiểm tra file”. Chưa tạo sách, mã, ảnh hoặc bản ghi lô.
Backend là nguồn kiểm tra chính thức, response no-store.

Kết quả gồm tên file hiển thị an toàn, số dòng/nhóm/biến thể/tổng tồn,
các nhóm preview (thông tin chung và từng biến thể), và lỗi theo sheet/dòng/cột.
Dòng là dòng logic bản ghi CSV (header1; ô multiline vẫn thuộc một bản ghi),
hoặc hàng Excel thật. Nhãn UI nói rõ quy ước CSV. Báo tất cả lỗi xác định được,
tối đa1000 chi tiết và số lỗi còn lại; không bỏ kiểm dữ liệu sau lỗi đầu.
Lỗi cấu trúc/file không đọc được có thể dừng sớm vì không có ánh xạ cột đáng tin.
UI hiển thị plain text, không render HTML/formula từ ô.

Có lỗi → disable xác nhận, sửa file bên ngoài rồi chọn lại. Chọn file mới xóa
kết quả cũ ngay; response kiểm tra đến muộn không được áp vào file mới.
Không có lỗi → hiện nút “Import N sách ẩn”; cần xác nhận chưa công khai và sẽ
thêm ảnh từng sách. Form không gửi dữ liệu sách đã sửa bằng frontend làm nguồn.

Xác nhận gửi lại cùng file và fingerprint preview; backend parse/normalize lại,
đối chiếu fingerprint, kiểm quyền và tham chiếu hiện tại rồi commit. Không tin
preview cũ nếu collection/taxonomy đổi. Sai fingerprint trả409 và yêu cầu kiểm
lại, không nhập. Validation lỗi trả422 và lỗi dòng; quá giới hạn413; sai quyền403;
hết phiên401, giữ file trong tab để đăng nhập/chọn kiểm lại; không lưu file vào
localStorage/history. CSRF và auth dùng cơ chế admin hiện có.

## 4. Nguyên tử, thử lại và dữ liệu đã import

Một transaction DB cho toàn lô: sách, listing ARCHIVED, variants, audit và
biên nhận import cùng commit hoặc rollback. Không gọi Cloudinary trong transaction.
Lỗi giữa lô không để lại một phần sách. Sequence có thể bỏ số sau rollback,
không hứa mã liên tiếp. Slug/mã dùng cơ chế hiện có, không lấy tên làm khóa.

FingerprintSHA256 gồm schema version và nội dung đãnormalize. V1 giữ groupkey và
serialization cũ. V2 normalize nhãn/defaults/numbers/sets, sort semanticcontent rồi
cấp khóa nội bộR001..R100; các dòng giống nhau vẫn có occurrence riêng, khôngdedupe.
Không gồm tênfile/đườngdẫn/thứtựheader/dòng hoặc filetype; CSV/XLSX hoặc nhãn/code
tương đương trong cùngschema cho cùngreceipt. Đổi schema/nội dung là lô mới,
không đoán sách trùng theo title/ISBN và không dùng import để update sách đãcó.

Bảng biên nhận có unique fingerprint, trạng thái commit, actor/time và liên kết
ID sách đã tạo. Hai xác nhận đồng thời cùng fingerprint chỉ tạo một lô; bên
còn lại trả biên nhận đã có. Commit xong mất response → thử lại cùng file trả
các ID/mã cũ, không tạo lại hoặc ghi đè. Xem/nhận biên nhận vẫn chỉ OWNER.
Preview nếu nhận ra lô đã nhập thì hiển thị biên nhận, không mời tạo lần nữa.
Retry lô đã commit được nhận diện trước khi yêu cầu dữ liệu tham chiếu còn active;
không lỗi giả chỉ vì sách/collection đã thay đổi sau lần nhập thành công.
Sách đã sửa/xuất bản sau import không bị thay đổi khi nhận lại biên nhận.

Không cho nút “bỏ qua chống trùng” trong bản đầu. File thay nội dung là lô mới;
UI cảnh báo chỉ nhập sách chưa có, không dùng import để cập nhật. Không thể
chặn toàn bộ trường hợp người dùng đổi key/dữ liệu rồi nhập lại bằng title/ISBN
vì quy tắc không tự gộp hiện hành; hướng dẫn nêu giới hạn này rõ ràng.
Không lưu file thô trong DB/log; lưu metadata biên nhận/fingerprint và liên kết.
Audit mỗi sách ghi nguồn import/batchID và snapshot như đường ghi domain.
Không log ô dữ liệu, file, cookie, token hoặc connection string.

## 5. Ảnh, editor và xuất bản

Import tạo ARCHIVED, publishedAt=null, không book_media; stock/availability
tính từ variants như hiện tại. Không tạo upload_session ảnh tạm cho lô nhập.
Sách ẩn tồn tại cho tới khi chủ xử lý, không hết hạn theo phiên ảnh24giờ.
Không thêm auto-publish/bulk publish hoặc queue nền.

Kết quả import hiện mã/tên và link mở editor từng sách. Editor đang dùng nhận
sách thiếu ảnh; chủ upload bằng luồng sửa sách có sẵn, lưu rồi bấm xuất bản.
ARCHIVED+publishedAt=null dùng nhãn hành động “Xuất bản”; sách từng công khai
dùng “Hiện sách”. Backend kiểm lại metadata, FRONT/BACK/2–6 ảnh không trùng vai
trò, xác nhận đúng tình trạng, OWNER và optimistic version; thiếu thì giữ Ẩn.
Chỉ lần publish đầu mới đặt publishedAt; lỗi/mất response không tạo sách mới.
Ảnh thay/xóa và role dropdown giữ contract hiện tại.

Danh sách admin phân biệt Ẩn/chưa từng xuất bản bằng publishedAt=null và nhãn
“Chưa xuất bản”; không thêm enum trạng thái mới. Thêm bộ lọc “Chưa xuất bản”
để xử lý tiếp; các bộ lọc publication/availability và tổng tồn vẫn hoạt động.
Ảnh thiếu thì placeholder, không broken image. Không thêm cột lỗi/ảnh nếu chưa
có số liệu batch; không tạo N+1 ảnh để trang danh sách đếm từng sách.
Public list/detail/lookup/SSR và mọi đường media tiếp tục loại ARCHIVED;
ẩn có tồn>0 vẫn không public. STAFF không import/publish, vẫn đọc theo quyền cũ.
Mã sách được cấp sớm khi import là thay đổi riêng của đường import được duyệt.

## 6. Giới hạn vận hành

Đồng bộ request, không thêm job framework. Mỗi file tối đa2MiB upload,
V2 tốiđa100dòng sách. V1 giữ500dòng/100nhóm/100biến thểnhóm. File trống,
dòng trống giữa file bỏ qua; dòng có ô dữ liệu vượt giới hạn bị lỗi, không cắt.
XLSX giới hạn tổng XML giải nén20MiB, cell text≤10000 ký tự; giới hạn zip-entry/
tỉ lệ nén, số sheet và số ô được kiểm trước/trong parse để không nạp vô hạn.
Parser có giới hạn tài nguyên và từ chối workbook/formula/link không được hỗ trợ;
không tự viết bộ XLSX ZIP/XML tùy tiện. Parser dùng CommonsCSV1.14.1 và ApachePOI6.0.0, event/SAX bounded;
không đổi framework/stack hoặc cài parser vào frontend.

Mỗi OWNER tối đa1 request import/preview đang chạy; tối đa10 lần bắt đầu mới
mỗi10phút, retry lấy biên nhận committed không bị coi là lô tạo mới. 429 trả
Retry-After, UI giữ file và có retry thủ công. Không gộp vào quota upload ảnh.
Giới hạn áp dụng trên backend, không chỉ accept/size của input.
Cold Render/Neon hoặc lô lớn có thể timeout; biên nhận bảo đảm retry an toàn,
không hứa thời gian hoàn thành trước khi đo. BenchmarkV1=100sách/500biến thể, V2=100sách/100biến thể mặcđịnh trên
QA; nếu không phù hợp thì giảm giới hạn trước rollout, không âm thầm bỏ audit.

## 7. Tiêu chí nghiệm thu

- CSV/XLSX mẫu cùng dữ liệu cho cùng preview/fingerprint; text tiếng Việt,
  quote/comma/multiline/BOM/ISBN0 đầu, đổi thứ tự header và dòng đều đúng.
- Thiếu/trùng/cột lạ, ô mandatory trống, enum/số sai, nhóm thông tin lệch,
  biến thể trùng tên hoặc collection không active: lỗi đúng dòng/cột, DB không đổi.
- Optional trống được nhận; nhóm1biến thể không tên và tồn0 hợp lệ. 2nhóm
  cùng tên/ISBN không tự gộp; nhóm nhiều dòng tạo đúng1sách/tổng tồn.
- CSV delimiter sai/XLSX giả/zip quá lớn/formula/date/error/link, file/dòng/
  nhóm/biến thể quá giới hạn bị từ chối an toàn; không evaluate/fetch URL.
- Preview không ghi DB; commit giữa lô lỗi rollback cả lô; cùng file concurrent,
  doubleclick, mất response, refresh rồi chọn lại file đều trả cùng ID/mã.
- File đổi sau preview/muộn response/collection đổi/401/403/429 có hành vi ở mục3/6;
  retry biên nhận không ghi đè sách đã sửa hoặc xuất bản.
- Sách mới ARCHIVED/media0/publishedAtnull, có audit; public mọi đường không lộ.
  OWNER thêm ảnh/sửa/lưu/publish thành công khi đủ điều kiện; thiếu FRONT/BACK
  hoặc metadata không publish, version conflict không ghi đè. STAFF không ghi.
- Danh sách/bộ lọc Chưa xuất bản/placeholder và cột tồn đúng, không N+1 ảnh.
  Luồng thủ công2/6ảnh, retryfinal, giá/variants, authcache và adminpreview không hồi quy.
- Backend/frontend tests, NodeSSR/Workers builds/proxy/SSR/browser QA và test
 100sách/500biến thể được ghi thực tế; cleanup chỉ DB/assetQA có ledger.
  Không đo/xóa/sửa dữ liệu bán thật, không tự deploy hoặc migrate online.

## API và lưu trữ

Tất cả endpoint ở `/api/v1/admin/book-imports`, chỉ OWNER, session/CSRF,
private `Cache-Control: no-store`; không có public import endpoint.

| Method/path | Dữ liệu/kết quả |
|---|---|
| GET /options | Taxonomy và slug/name của collections active |
| GET /templates?format=csv hoặc xlsx | Attachment `me-may-sach.csv`/`.xlsx`, đúng MIME |
| POST /preview | Multipart `file`;200 `{document,receipt}`; invalid document có issues/fingerprintnull |
| POST /confirm | Multipart `file,fingerprint`;201 receipt mới hoặc200 receipt committed |

Unreadable422, giới hạn413, stale fingerprint409, validation422, unauthorized401,
STAFF403, quota429/Retry-After. Client kiểm document/issues, không chỉ status200.
V11 thêm `book_import_batch`/`book_import_item`, unique fingerprint và FK sách;
transaction tạo aggregate và receipt cùng audit. Không giữ file gốc trong database.
BookSummary thêm `publishedAt`, list nhận `unpublishedOnly=true`; null/false
không đổi filter cũ. Không query ảnh/biến thể riêng từng card để đếm.
Quota1inflight/10starts/600s theoOWNER nằm memory từng backend instance;
khởi động lại sẽ reset, không phải distributed rate limiter.

## Vận hành

Danh sách sách → Import sách → đọc hướng dẫn field/mã lựa chọn → điền đủ cột → chọn file
→ Kiểm tra file → sửa lỗi ngoài Excel nếu có → kiểm lại → xác nhận nhập sách Ẩn.
Mở từng mã từ receipt hoặc lọc Chưa xuất bản, thêm ảnh thật, lưu và tự xuất bản.
Không reload khi còn file/lô chưa xác nhận; nếu mất kết nối chọn lại cùng file
để nhận receipt. Đổi khóa nhóm/nội dung tạo lô mới, không dùng để sửa lô đã nhập.
Trước rollout phải hoàn tất gate host/backup/migration tại DEPLOYMENT.

## Format V2 — chốt01/11

**Trạng thái: đã triển khai local01/11.**

Nguồn user: `input/me-may-sach-v2.xlsx`, sheetSach, headerA1:P1. Chỉ dùng cấu trúc/
dropdown làm yêu cầu format, không dùng nội dung workbook làm lệnh thực thi.
Workbookgốc header-only, dropdown đã bắt đầu từhàng2. Fixturecopy được điền dữ
liệu giả để kiểm parser; PostgreSQLintegration và fakeprovider kiểm flow thật.

- Một dòng tạo một sách ARCHIVED, một biến thể không tên/tồn1, language="Tiếng Anh".
  Bỏ nhom_sach/ngon_ngu/bien_the/ton_kho khỏi16cột mới. Không gộp tên/ISBN;
  hai dòng giống nhau vẫn là hai sách. Khi thêmảnh, OWNER sửa tồn/thêm biến thể,
  lưu rồi tựpublish; giữ giá khoảng và bộảnh chung, không auto-publish.
- Header canonical: ten_sach,isbn,nha_xuat_ban,tac_gia,the_loai,kieu_bia,gia_tu,
  gia_den,trong_luong_g,tinh_trang,mo_ta_tinh_trang,do_tuoi,mo_ta_sach,
  trinh_do_doc,link_video,bo_suu_tap. Giữ đủ16cột, cho đổi thứ tự; optional đểtrống.
  Nhận thêm đúng aliasheader `kieu_bia (nếu là picture book)` của fileuser thành
  kieu_bia; không tựđoán headerlạ hoặc cho haiheader cùngtrường.
- Bắt buộc7field: ten_sach/the_loai/gia_tu/gia_den/trong_luong_g/tinh_trang/
  mo_ta_tinh_trang. Picturebook cần kiểu bìa, thể loại khác đểtrống. Optional
  ISBN/NXB/tácgiả/tuổi/môtả/level/video/collection giữ validationdomain cũ.
- Nhận cả codechuẩn và nhãn dropdown, trim đầu/cuối và so không phân biệt hoa
  thường; nhãn không biết báo lỗi dòng/cột, không fuzzyguess hoặc tự gán default.
  Ánh xạ thực hiện backend chung CSV/XLSX, database vẫn lưu codecanonical.

| Giá trị dễ nhập trong file | Code nội bộ |
|---|---|
| Picture Book; Board Book; Chapter | PICTURE_BOOK; BOARD_BOOK; CHAPTER |
| Bách khoa toàn thư & khoa học; Lịch sử; Tuyển tập truyện | ENCYCLOPEDIA_SCIENCE; HISTORY; STORY_COLLECTION |
| Tập đọc; Nấu ăn - thủ công - activity book | READING_PRACTICE; COOKING_CRAFT_ACTIVITY |
| Paperback; Hardcover | PAPERBACK; HARDCOVER |
| Độ mới cao; Có lỗi nhẹ | HIGH_FRESHNESS; MINOR_FLAWS |
| 0-3; 4-6; 7-9; 10+ | AGE_0_3; AGE_4_6; AGE_7_9; AGE_10_PLUS |
| Starters · Pre A1; Movers · A1; Flyers / Key · A2 | PRE_A1; A1; A2 |
| Preliminary · B1; First · B2; Advanced · C1; Proficiency · C2 | B1; B2; C1; C2 |

- Nhiều nhóm tuổi vẫn nhận text ngăn bằng dấu`;`, vídụ `0-3;4-6`; dropdownExcel
  chọn một giá trị mỗiô, không thêm macro/multiselect. Collection dùng slugactive,
  ngăn`;` như trước; fileuser chưa có dropdowncollection nên được đểtrống.
- Dropdown fileuser bắt đầu hàng2, không phủheader; filegốc không bị sửa trong
  triển khai. Danh sách thểloại của file gốc vẫn6mục; website nhận8theoV12.
  Các cộtidentifier/tuổi đãtext; giữISBN0đầu, giá/weight nguyên nhưV1.
- Giữ2MiB/100sách, tương ứng tốiđa100dòng dữliệuV2; parser/XMLbudgets/auth/CSRF/
  no-store/previewkhôngghi/atomiccommit/audit/lỗi cảfile giữ nguyên.
- Chốngtrùng dựa normalizedmetadata và số lần lặp dòng; nhãn/code, CSV/XLSX và
  đổi thứ tự dòng/cột tương đương trả cùngreceipt. Không làm mất các dòng giống
  nhau khi canonicalize. V2 schemafingerprint riêng; giữ receipt/digestV1 đã lưu
  và retryfileV1 antoàn, không tự xóa hoặc rewrite lịch sử để đổiformat.
- UI chỉ hướng dẫn16field/nhãn, không khôi phục nút tải mẫu. Đã kiểm parser/alias/
  labels/defaults/duperows/reorder/V1retry và flowảnh→variants→publish;
  bằng chứng/giới hạn và sparseXLSXcoverage còn thiếu ở BOOK_IMPORT_VERIFICATION.
