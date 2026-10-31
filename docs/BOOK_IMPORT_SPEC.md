# Import CSV/Excel thành sách ẩn

Trạng thái: user duyệt đặc tả31/10/2026 sau builder review; kế hoạch triển khai
ở [BOOK_IMPORT_PLAN](BOOK_IMPORT_PLAN.md) đang chờ review. Chưa code importer;
không là gate nghiệm thu MVP.

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
MASTER_PLAN/DATA dẫn tới contract hiện hành ở đây trong thời gian triển khai.

## 2. Format file — đề xuất cụ thể của agent

Hỗ trợ `.csv` UTF-8 có/không BOM và `.xlsx`; không nhận `.xls`/`.xlsm`.
Một schema/cùng header cho hai định dạng. Website cung cấp mẫu CSV/XLSX và
hướng dẫn mã lựa chọn hiện hành; CSV demo M0 không phải mẫu importer.

Header ASCII cố định, cho đổi thứ tự cột; mọi cột dưới đây phải có đúng một
lần. Thiếu/trùng/cột lạ đều báo lỗi cấu trúc, không đoán cột. Giá trị ô optional
có thể trống, không đồng nghĩa file được thiếu cột. Header trim nhưng không
tự dịch hoặc đổi tên. XLSX có một sheet dữ liệu `Sach`, hàng1 là header;
sheet hướng dẫn `HuongDan` không được đọc thành dữ liệu. Sheet lạ có dữ liệu
bị từ chối. CSV dấu phẩy, quote kép/escape kép, cho phép xuống dòng trong ô.
CSV dùng dấu phân cách khác báo dùng mẫu chuẩn, không âm thầm hiểu sai.

| Cột | Bắt buộc có giá trị | Quy tắc |
|---|---|---|
| nhom_sach | Có | Khóa nhóm trong file, 1–50 ký tự ASCII chữ/số/`_-`; không phải mã MM |
| ten_sach | Có | Trim, tối đa300 ký tự |
| isbn | Không | Text tối đa32, giữ số0 đầu; không coi ISBN là khóa duy nhất |
| nha_xuat_ban | Không | Text tối đa200 |
| tac_gia | Không | Text tối đa200 |
| ngon_ngu | Có | Text tối đa50; mẫu gợi ý Tiếng Anh, không tự điền ô trống |
| the_loai | Có | Category code hợp lệ của website |
| kieu_bia | Có điều kiện | PAPERBACK/HARDCOVER khi PICTURE_BOOK; thể loại khác để trống |
| gia_tu | Có | Số nguyên VND1..999999999999 |
| gia_den | Có | Cùng giới hạn, không nhỏ hơn gia_tu |
| trong_luong_g | Có | Số nguyên1..9007199254740991 theo contract hiện tại |
| tinh_trang | Có | HIGH_FRESHNESS hoặc MINOR_FLAWS; mã legacy không cho tạo mới qua import |
| mo_ta_tinh_trang | Có | Text tối đa4000, không tự sinh nội dung |
| do_tuoi | Không | Các age code hiện có, phân cách `;`, không trùng |
| mo_ta_sach | Không | Text tối đa10000 |
| trinh_do_doc | Không | PRE_A1/A1/A2/B1/B2/C1/C2; trống là chưa xác định |
| link_video | Không | HTTPS hợp lệ như editor, không fetch URL |
| bo_suu_tap | Không | Slug collection đang active, phân cách `;`, tối đa100, không trùng |
| bien_the | Có điều kiện | Tên tối đa100; nhóm nhiều dòng bắt buộc tên riêng không trùng |
| ton_kho | Có | Số nguyên0..999999; trống báo lỗi, không tự dùng1 |

Mỗi dòng là một biến thể. Cùng nhom_sach là cùng một sách; các dòng có thể
không liền nhau. Toàn bộ cột ngoài bien_the/ton_kho phải giống nhau sau chuẩn
hóa trong cùng nhóm; báo các dòng/cột lệch, không chọn dòng đầu để ghi đè.
Một nhóm một dòng được để trống tên biến thể. Không nhận variant ID/mã MM.
Website sinh mã MM khi commit; nhom_sach chỉ dùng ghép dòng và chống nhầm file.
Khóa nhóm phân biệt hoa thường; A01 và a01 là hai nhóm, hướng dẫn nêu rõ.
Các nhóm khác nhau dù cùng tên/ISBN vẫn là sách khác, không tự gộp.

Số trong CSV là chữ số ASCII, không dấu nhóm nghìn, âm/phân số/exponent.
XLSX nhận ô text chữ số hoặc numeric chính xác là số nguyên trong giới hạn;
không nhận formula/date/boolean/error hoặc số mất độ chính xác. Mẫu định dạng
ISBN/khóa nhóm và cột số là text để giữ nguyên giá trị. Không evaluate formula,
macro hoặc external link; không tự ép `21.000` thành21000 hoặc21.
Trim text, giữ Unicode/xuống dòng bên trong. Mọi check enum/độ dài/link/biến thể
và tham chiếu DB tái sử dụng logic domain, không chỉ validate ở trình duyệt.

## 3. Kiểm file và xác nhận

OWNER mở “Import sách” từ danh sách admin; chọn/tải mẫu và đọc hướng dẫn.
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

Fingerprint SHA-256 trên schema version và nội dung đã normalize: group key,
thông tin chung, biến thể và tồn, sắp xếp nhóm/biến thể xác định; không gồm tên
file/đường dẫn/thứ tự header hoặc thứ tự dòng. Cùng nội dung CSV/XLSX cho cùng
fingerprint. Group key là một phần nội dung; đổi key hoặc dữ liệu là lô khác.
Không dùng fingerprint để đoán hai sách cùng tên là trùng.

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

## 6. Giới hạn vận hành — đề xuất của agent

Đồng bộ request, không thêm job framework. Mỗi file tối đa2MiB upload,
500 dòng dữ liệu và100 nhóm sách; mỗi nhóm tối đa100 biến thể. File trống,
dòng trống giữa file bỏ qua; dòng có ô dữ liệu vượt giới hạn bị lỗi, không cắt.
XLSX giới hạn tổng XML giải nén20MiB, cell text≤10000 ký tự; giới hạn zip-entry/
tỉ lệ nén, số sheet và số ô được kiểm trước/trong parse để không nạp vô hạn.
Parser có giới hạn tài nguyên và từ chối workbook/formula/link không được hỗ trợ;
không tự viết bộ XLSX ZIP/XML tùy tiện. Dependency parser sẽ chọn ở plan sau
kiểm tài liệu chính thức, không đổi framework/stack hoặc cài vào frontend.

Mỗi OWNER tối đa1 request import/preview đang chạy; tối đa10 lần bắt đầu mới
mỗi10phút, retry lấy biên nhận committed không bị coi là lô tạo mới. 429 trả
Retry-After, UI giữ file và có retry thủ công. Không gộp vào quota upload ảnh.
Giới hạn áp dụng trên backend, không chỉ accept/size của input.
Cold Render/Neon hoặc lô lớn có thể timeout; biên nhận bảo đảm retry an toàn,
không hứa thời gian hoàn thành trước khi đo. Benchmark100sách/500biến thể trên
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

## 8. Bước tiếp

Builder review và user duyệt đặc tả → writing-plans → user review plan →
thực thi Native/tuần tự theo workflow hiện hành. Commit/push dev; user merge
main/deploy. Sau kiểm chứng gộp quyết định vào DATA/DESIGN/ARCHITECTURE,
bằng chứng vào VERIFICATION chủ đề và retire spec/plan khi chuyển đủ tiêu chí.
