# Sách trong đơn và chọn khách — contract hiện hành

Tách từ mục 5–6 [đơn nội bộ](ORDERS.md) ngày 25/11/2026; cập nhật theo `ORDER-PICKER-01`
owner duyệt cùng ngày. Bằng chứng: [ORDER_VERIFICATION](../verification/ORDER_VERIFICATION.md).

## 1. Item CATALOG/MANUAL và giá chốt từng cuốn

CATALOG: tìm tên/mã MM qua admin API phân trang, hiển thị bìa, mã, tên,
khoảng giá/sale tham khảo, weightG, totalStock/reservedQuantity/stock và publication.
stock là còn bán; reservedQuantity là ACTIVE; tổng tại tiệm = stock + ACTIVE.
Cho chọn sách Ẩn còn tồn; không chọn sách trong Thùng rác. CATALOG
không đồng nghĩa đang public; không publish hay tạo listing mới khi thêm đơn.
Thiếu giá/trọng lượng catalogue không tự điền0: admin bổ sung snapshot.

**Giá user chốt16/11:** admin nhập/chỉnh đơn giá bán cụ thể từng cuốn lúc thêm;
hiển thị khoảng giá/sale để tham khảo, không tự chốt priceMin/priceMax/sale.
Giá cụ thể bắt buộc trước khi lưu dòng, kể cả DRAFT; chưa nhập không thêm dòng.
Giá bán này lưu unitPriceVnd của item; sửa giá sách gốc không đổi dòng đã thêm,
và sửa dòng đơn không cập nhật ngược Listing. Không làm tròn giá theo form sách.
Hai cuốn cùng mã MM giá khác nhau phải là hai dòng riêng quantity1; chỉ dùng
quantity>1 khi cùng giá/trọng lượng snapshot. Không tự gộp dòng theo book_copy_id.
Khi kiểm tồn phải cộng mọi dòng cùng mã MM trong đơn; stock hiện tại đã trừ
các lượng giữ trước đó, không trừ reservation đơn khác thêm lần nữa.

MANUAL bắt buộc tên, đơn giá VND, quantity, gram/quyển. Không tạo book_copy,
book_variant/listing, không giữ/trừ tồn website. Các FK catalogue phải NULL.
CATALOG lưu book_copy_id/listing_id khớp nhau và snapshot mã/tên/giá/trọng lượng.
Ảnh để nhận diện, thiếu có fallback; không giữ media vĩnh viễn vì item.

DRAFT/KEEPING được thêm/sửa/xóa; KEEPING xóa/giảm quantity bắt buộc nhập lý do.
Lưu snapshot cuốn/số bỏ/actor/time trong history; hoàn tồn cùng transaction.
Draft được thiếu weight CATALOG trong lúc bổ sung; chỉ giữ/chốt khi
mọi item có giá và weight hợp lệ; constraint weight cho phép NULL ở draft.

## 2. Gợi ý và cảnh báo khi nhập sách ngoài

Chờ 350ms, hủy lượt cũ, quá 8 giây coi là lỗi. Backend trả tối đa 5 kết quả, cả
sách Ẩn/hết hàng, không gồm Thùng rác hoặc sách đã purge.

**Chuẩn hóa** (`TitleMatch` và SQL phải giống nhau; `everyTitleIsExactAgainstItself` khóa
việc này): bỏ dấu, đ→d, thường hóa từng ký tự, bỏ dấu nháy; dấu câu và khoảng trắng Unicode
liệt kê tường minh thành khoảng trắng, gộp. DB locale `C` chỉ thường hóa ASCII sau khi bỏ dấu:
tiếng Việt đúng, chữ Nga/Hy Lạp hoa có thể không nhận trùng. Tên chỉ có dấu câu không gợi ý.

**Điểm** = ký tự khớp / ký tự đã nhập, gợi ý từ 0,6, không phụ thuộc thứ tự từ. Mỗi từ
ghép một từ chưa dùng: bằng nhau hoặc là phần đầu (từ 2 ký tự) đủ điểm; hai từ ≥ 4 ký tự
và Levenshtein ≥ 0,75 được theo tỷ lệ; từ có chữ số phải bằng nhau. Chuỗi bỏ khoảng trắng
≥ 4 ký tự, không có số, nằm trọn trong tên sách thì đạt 1. Một ký tự chỉ nhận trùng hẳn.
Xếp: trùng hẳn, điểm, lệch độ dài, id.

**Hiệu năng:** CTE chuẩn hóa mỗi tên một lần, lọc theo 3 ký tự đầu từng từ, tối đa 200
cặp id/tên; Java chấm điểm, rồi mới đọc chi tiết tối đa 5 cuốn. Sai 3 ký tự đầu của mọi từ
thì có thể sót (owner chấp nhận). Tăng trần hoặc thêm index khi có số đo; không AI,
extension/dependency. Không trả toàn bộ catalogue về Java hoặc trình duyệt.

**Xác nhận:** chỉ kết quả `exact` (trùng hẳn sau chuẩn hóa) bắt lý do và tick; gần giống
là gợi ý, bỏ qua được. Không đổi nguồn tự động, không chặn tuyệt đối vì cùng tên nhiều cuốn.
Backend kiểm lại lúc lưu, trả 409 `manual_match_confirmation_required` kèm kết quả. Xác nhận
gắn normalizedTitle và fingerprint (id/version các kết quả exact), lưu lý do; tên hoặc kết quả
exact mới làm mất hiệu lực. Sửa dòng giữ nguyên tên mà không còn trùng hẳn thì giữ lý do và
bằng chứng cũ.

**Giao diện:** khóa Thêm khi đang kiểm; lỗi thì hiện "Thử lại" và vẫn cho Thêm. Gợi ý có
bìa, mã, tên, giá tham khảo, số còn bán, nhãn Ẩn/Hết hàng. Chọn gợi ý chuyển sang Sách
website, giữ giá và số lượng, lấy trọng lượng sách (thiếu thì giữ số đã gõ); quay lại Sách
ngoài khôi phục tên, giá và trọng lượng. Chọn từ danh sách website vẫn để trống giá. Dòng thủ công
đã lưu chỉ xem gợi ý, không đổi nguồn. Chọn sách website xong thu thành thẻ, "Đổi sách" mở
lại đúng từ khóa/trang.

## 3. Chọn khách

Đơn mới: chọn khách (kể cả khách vừa thêm hoặc đến từ hồ sơ) thì ẩn ô tìm, danh sách, phân
trang và Thêm khách; còn thẻ và "Đổi khách". "Đổi khách" giữ từ khóa, trang, loại đơn và bỏ
khách cũ; kết quả kiểm keep về muộn bị bỏ. Lỗi kiểm keep có "Thử lại" cạnh thẻ và chặn tạo đơn;
lỗi tải danh sách khách không chặn khách đã chọn.
Hộp sửa đơn nháp: danh sách chỉ hiện sau khi gõ, chọn xong thu gọn, có "Đổi khách" và "Giữ
khách hiện tại"; đóng không lưu hoặc mở lại thì xóa lựa chọn và từ khóa.
Focus chuyển tới nút đổi sau khi chọn và tới ô tìm sau khi đổi.

Triển khai backend trước frontend; không migration. Giao diện cũ với backend mới tạm thời
vẫn bắt xác nhận cả gợi ý gần giống.

## 4. Ngày bán, lô hàng và bảng sách (owner chốt 28/11/2026)

- **Ngày bán** (`order_items.sold_on`, ngày giờ Việt Nam, V41): tự là ngày thêm dòng; chỉ hộp
  Sửa dòng có ô "Ngày bán", không sau hôm nay (400 `soldOn`). Dòng cũ lấy theo `added_at`.
  Doanh thu theo ngày ở trang Tổng quan (đợt sau) sẽ tính theo ngày bán, còn danh sách đơn lọc
  theo ngày tạo — hai số có thể lệch.
- **Lô hàng** (`lot_label`, tối đa 60 ký tự, V41): chỉ Sách ngoài, chữ tự do theo quy tắc của
  chủ tiệm, không bắt buộc; bỏ khoảng trắng hai đầu, giữ hoa/thường và dấu. Ô nằm ngang Trọng
  lượng (5:5); sách website giữ ô Trọng lượng nửa bên trái. Gợi ý 10 lô dùng gần nhất
  (`GET /orders/lots`, chỉ OWNER) qua `datalist`; dòng mới điền sẵn lô của Sách ngoài thêm gần
  nhất trong đơn. Gửi lô cho sách website: 400 `lotLabel`. Không lên bill, chưa tìm/lọc theo lô.
- Audit dòng (`orderItems`) có ngày bán và lô; request không có `soldOn`/`lotLabel` giữ
  fingerprint cũ (idempotency trước V41).
- **Bảng Sách trong đơn**: Lô hàng · Ngày bán · ảnh · Sách / nguồn · Đơn giá chốt · SL ·
  Gram/quyển · Thành tiền · Thao tác; sắp theo ngày bán tăng dần rồi thứ tự thêm. Dòng gọn (bìa
  36×48), vùng cuộn tối đa 640px (khoảng 10 dòng) với tiêu đề dính; "n quyển · m g" nằm trên tiêu
  đề card cạnh "＋ Thêm sách". Thêm/sửa xong cuộn tới dòng đó trong card và tô sáng 1,2 giây
  (giảm chuyển động: chỉ tô). Tab Xuất bill vẫn đủ mọi sách theo trang bill.
- Card thông tin thêm "Tiền sách" ở cuối (bằng dòng Tiền sách của card Thanh toán, cả hai giữ).
  Cột phải trang chi tiết cố định 340px.
