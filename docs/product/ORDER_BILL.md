# Trang chi tiết đơn, bill gửi khách và cân kiện gợi ý — contract hiện hành

Owner chốt 25/11/2026 (bill, cân kiện) và 26/11/2026 (`ORDER-DETAIL-BILL-01`: bố cục 2
cột, tab Xuất bill). Phần mở rộng của [đơn nội bộ](ORDERS.md); tiền và ảnh bill theo
[ORDER_PAYMENTS](ORDER_PAYMENTS.md). Bằng chứng ở
[ORDER_VERIFICATION](../verification/ORDER_VERIFICATION.md#trang-chi-tiết-đơn-2-cột-và-tab-xuất-bill--26112026).

## Header

- Trái: "Đơn DH-…", badge trạng thái cùng màu danh sách (xám Nháp, xanh dương Đang keep,
  cam Đang đóng gói, xanh lá Hoàn tất, đỏ Đã hủy/Đã hoàn đơn) và badge Thanh toán ngay cạnh
  (mỗi badge có chấm màu), rồi "Tạo lúc …". Không còn dòng Keep sách/Giao ngay trên tiêu đề.
- Phải: **Xuất bill** (chỉ chuyển sang tab Xuất bill; ẩn khi đơn chưa có sách hoặc Đã hủy),
  **1 nút chính** và menu **⋮**. Chọn nút hoặc mục ⋮ mở panel thao tác dưới header như cũ.

| Trạng thái | Nút chính | Mục trong ⋮ |
|---|---|---|
| Nháp, keep | Bắt đầu keep & trừ tồn | Sửa thông tin, Hủy đơn |
| Nháp giao ngay / Đang keep | (không; Xuất bill mang màu nút chính) | Sửa thông tin, Gia hạn keep (Đang keep, còn gia hạn được), Hủy đơn |
| Đang đóng gói | Đã bàn giao vận chuyển | Mở lại đơn đã chốt, Hủy đơn (cả hai khi chưa từng bàn giao) |
| Hoàn tất | Hoàn đơn | Sửa mã vận đơn |
| Đã hủy / Đã hoàn đơn | (không) | (không có ⋮) |

- Menu ⋮: `aria-label "Thao tác DH-…"`, `aria-controls` trỏ tới menu, mở thì focus mục đầu,
  ↑/↓/Home/End; Esc (cả khi focus ở nút ⋮) đóng và trả focus; bấm ngoài hoặc Tab ra khỏi menu
  thì đóng; Hủy đơn chữ đỏ.
- Form bill còn thay đổi chưa lưu mà bấm nút chính hoặc mục ⋮: hỏi "Bill có thay đổi chưa lưu.
  Bỏ các thay đổi này và tiếp tục?"; không đồng ý thì quay về tab Xuất bill.

## Hai tab

- **Chi tiết đơn** | **Xuất bill**; ←/→/Home/End đổi tab. `?tab=bill` mở tab bill; link cũ
  `?tab=total` cũng vậy. Đổi tab không mất dữ liệu form bill đang nhập.

### Tab Chi tiết đơn

2 cột (trái 2/3, phải 1/3); dưới 1024px còn 1 cột, không cuộn ngang trang.

- **Trái:** Thông tin cơ bản (Hình thức, Hạn keep chỉ với đơn Keep — ngày khi Đang keep,
  "—" khi khác —, Mã vận đơn; mã đơn và ngày tạo chỉ ở header) · Sách trong đơn (nút nhỏ
  "＋ Thêm sách" ở góc phải tiêu đề khi sửa được; ảnh bìa 40×53 cho sách website có ảnh FRONT,
  khung xám cho sách ngoài; Sửa chữ thường, Xóa chữ đỏ; "n quyển · m g" căn phải dưới bảng) ·
  Thanh toán (nút nhỏ Nhận cọc/Hoàn tiền ở góc phải tiêu đề; Tiền sách, Phí ship hoặc "Chưa
  chốt"; **Tổng/Tạm tính** chữ to nhất có kẻ trên; Đã nhận; Còn thu (màu cảnh báo)/Cần hoàn/Đã
  thanh toán đủ (xanh lá) đậm cỡ thường; đơn Đã hủy không thu thêm: tiền còn giữ là Cần hoàn,
  không giữ thì "Không còn giữ tiền") · Lịch sử thu/hoàn luôn mở.
- **Phải:** Thời gian giữ sách (Đang keep) hoặc dòng tóm tắt keep đã bàn giao · Khách hàng
  (2 dòng không nhãn: tên đậm link hồ sơ không gạch chân + chip 1 kênh TikTok → Threads → Zalo;
  "mã · SĐT" chữ mờ) · Giao hàng ("Chưa chốt bill" +
  "Xuất bill →", hoặc người nhận/SĐT/địa chỉ/J&T/cân/thanh toán ship/COD/mã vận đơn; lịch sử
  giao và hàng hoàn thu gọn; đơn đã mở lại ghi "Cần xuất lại bill cho đơn này.") · Lịch sử đơn (timeline) · Ghi chú/lịch sử xử lý (5 mới nhất,
  "Xem tất cả").

| Badge Thanh toán ở header (theo thứ tự) | |
|---|---|
| Đã hủy/Đã hoàn đơn, còn giữ tiền | đỏ "Còn giữ x" (không giữ thì không badge) |
| Chưa nhận đồng nào | đỏ "Chưa cọc" |
| Còn thu ≤ 0 (chưa chốt: tiền sách − đã nhận; đã chốt: `balance`) | xanh lá "Đã thanh toán đủ" |
| Còn lại | xanh dương "Đã cọc" |

Timeline: Tạo đơn → Bắt đầu keep (đơn Keep) → Chốt đơn (ngày tạo lần giao mới nhất không
ABORTED) → Đã bàn giao · Hoàn tất. Đơn hủy chỉ giữ các mốc đã qua (đã từng chốt bill thì vẫn có
Chốt đơn, theo lần chốt mới nhất) rồi "Đã hủy" đỏ; đơn hoàn
thêm "Đã hoàn đơn" đỏ sau mốc bàn giao. Mở lại đơn làm mốc Chốt đơn về xám; lý do mở lại
chỉ ở card Ghi chú. Mốc đã qua cuối cùng có `aria-current="step"`.

### Tab Xuất bill

Một card (rộng tối đa 640px, căn giữa) gộp form và bill (owner chốt 27/11): trên là **bill gửi
khách sửa trực tiếp** — Người nhận/SĐT/Địa chỉ ở đầu trang 1 (điền sẵn từ hồ sơ khách khi đơn chưa
có), **Phí ship** là ô số ở dòng tiền trang cuối (0 → "Miễn phí", trống → Tạm tính); ô trông như chữ
bill, gạch mờ khi rê, khung khi gõ, chữ gợi ý đỏ mờ khi trống. Dưới vạch là **"Nội bộ · không gửi
khách"**: 2 nút chọn Người nhận thanh toán / Thanh toán cuối tháng (giữ nhãn, vẫn lưu
RECIPIENT/MONTHLY cho file J&T sau này), cân nặng + gợi ý, COD, "Còn thiếu: …" khi chưa đủ để
lưu, Hoàn tác / Lưu bill. Không lặp Đã nhận / Còn thu (bill đã có, owner 27/11); chỉ Thanh toán
cuối tháng hoặc Khách tự lấy còn thiếu tiền mới có dòng "Còn thiếu X · Nhận cọc".

| Đơn | Tab |
|---|---|
| Chưa có sách | "Đơn chưa có sách." và nút về tab Chi tiết đơn; form vẫn giữ chữ đang gõ (ẩn) |
| Đã hủy | "Đơn đã hủy, không xuất bill." |
| Nháp / Đang keep | Form; **Lưu bill** chốt đơn (sang Đang đóng gói, ở lại tab) |
| Đang đóng gói | Form; Lưu bill sửa thông tin bill |
| Hoàn tất / Đã hoàn đơn | Chỉ xem: ô trên bill thành chữ thường, không Lưu bill/Hoàn tác/Nhận cọc |

- **Giao hàng** (owner 27/11): 3 nút J&T Express (mặc định) / Shopee Express / Khách tự lấy
  ở đầu phần Nội bộ. Shopee Express cùng luật J&T. Khách tự lấy: bill ẩn Địa chỉ, Phí ship ghi
  "Khách tự lấy" (phí 0, Tổng tiền = tiền sách); Nội bộ ẩn phương thức/cân/COD; lưu chỉ cần
  tên + SĐT; nút chính "Khách đã lấy hàng", timeline "Khách đã lấy · Hoàn tất", ô Mã vận đơn
  ghi "Khách tự lấy". Contract backend ở [ORDERS mục 11](ORDERS.md#11-chốt-giao-jt-và-snapshot).
- Form giữ quy tắc điền sẵn, COD gợi ý, retry cùng `requestId`, lỗi theo ô. "Hoàn tác" (khi
  có thay đổi) trả về giá trị đã lưu. Nhận cọc nằm cạnh dòng Đã nhận.
- Đơn tải lại khi form đang có thay đổi (sau Nhận cọc, 409…): giữ chữ đã gõ và bắt bấm
  "Đã kiểm tra lại COD và cân nặng". Sau một lệnh lưu thành công, form lấy lại giá trị đã lưu;
  nếu lần tải lại sau lệnh lỗi mạng thì chữ gõ sau đó không bị thay. Đơn bị phiên khác chuyển
  sang Hoàn tất/Đã hoàn đơn: form chuyển chỉ xem với giá trị đã lưu.

## Cân kiện gợi ý

- Đơn chưa chốt tự điền Trọng lượng sau đóng gói = tổng trọng lượng sách + 1.000 g (cố định
  trong code), kèm dòng "Sách 850 g + 1.000 g đóng gói". Ô vẫn sửa được; là số ước tính.
- Đơn đã chốt giữ số đã lưu, không có dòng gợi ý.
- Có sách thiếu trọng lượng: để trống, ghi "Chưa đủ trọng lượng sách, nhập số cân thật".
- Tải lại do đơn đổi: chưa sửa ô thì tính lại; đã sửa hoặc xóa trắng thì giữ nguyên.

## Bill để chụp màn hình

- Chỉ OWNER, trong tab Xuất bill. Không có link công khai, tải ảnh, in hay PDF.
- Hiện: logo tròn (favicon 192px) bên trái "Mẹ Mây" và "Sách ngoại văn cho bé", **ngày xuất bill** (ngày `serverNow`, giờ Việt Nam),
  **Người nhận** (thay "Khách" từ 27/11), **SĐT** (ô SĐT người nhận, trống thì SĐT hồ sơ),
  **Địa chỉ** (ô địa chỉ đang nhập, trống thì địa chỉ đã lưu; trống hẳn thì ẩn dòng); mỗi
  dòng bảng 5 cột tiêu đề đậm **STT · Tên sách · SL · Đơn giá · Thành tiền** (STT đếm liên
  tục qua các trang); các khoản tiền bên dưới.
- Không hiện: mã đơn, mã khách, kênh liên hệ, trọng lượng, COD, mã sách, nguồn sách, ghi chú,
  thông tin chuyển khoản/QR (owner hoãn 27/11; khi làm lại chọn lưu QR trong Git công khai hay
  file riêng phục vụ qua API chỉ OWNER), giảm giá.
- Bill đi theo form khi gõ: Tổng tiền = tiền sách + phí ship đang nhập; dòng cuối = Tổng tiền
  − đã nhận. Form có thay đổi chưa lưu thì dải vàng "Chưa lưu — bấm Lưu bill trước khi chụp
  gửi khách" hiện ngoài khung bill.

| Trường hợp | Bill hiện |
|---|---|
| Có phí ship | Tiền sách, Phí ship, Tổng tiền, Đã thanh toán, dòng cuối |
| Phí ship bằng 0 | Phí ship Miễn phí |
| Ô phí ship trống | "Tạm tính, chưa gồm phí ship"; ô Phí ship "nhập phí", dòng tổng là Tạm tính |
| Dòng cuối | Cần thanh toán / Đã thanh toán đủ / Tiền thừa |

- Tiền sách là `goodsTotal`; đơn cũ có giảm giá thì đã trừ sẵn.
- Khung 560px, màu cố định, nút ‹ Trước / Sau › nằm ngoài khung. 12 dòng mỗi trang, có
  "Trang 1/3" khi nhiều trang, phần tiền chỉ ở trang cuối; về trang 1 khi số sách đổi. Tên dài
  xuống dòng, không cắt.

## Dữ liệu backend dùng

`GET /api/v1/admin/orders/{id}` trả thêm (chỉ đọc, không migration): `items[].coverUrl`
(endpoint ảnh admin `/admin/books/{id}/media/FRONT/content` khi có FRONT ACTIVE), `shipments[].createdAt`,
`completedAt`, `cancelledAt`, `customerChannel`. Frontend chịu được khi thiếu các field này.
Kênh khách lấy trong cùng câu truy vấn của API xem chi tiết (`left join customer`); các lần đọc
đơn nội bộ trong thao tác ghi không truy vấn kênh.
