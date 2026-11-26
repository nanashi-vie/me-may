# Trang chi tiết đơn, bill gửi khách và cân kiện gợi ý — contract hiện hành

Owner chốt 25/11/2026 (bill, cân kiện) và 26/11/2026 (`ORDER-DETAIL-BILL-01`: bố cục 2
cột, tab Xuất bill). Phần mở rộng của [đơn nội bộ](ORDERS.md); tiền và ảnh bill theo
[ORDER_PAYMENTS](ORDER_PAYMENTS.md). Bằng chứng ở
[ORDER_VERIFICATION](../verification/ORDER_VERIFICATION.md#trang-chi-tiết-đơn-2-cột-và-tab-xuất-bill--26112026).

## Header

- Trái: "Đơn DH-…", badge trạng thái cùng màu danh sách (xám Nháp, xanh dương Đang keep,
  cam Đang đóng gói, xanh lá Hoàn tất, đỏ Đã hủy/Đã hoàn đơn), "Tạo lúc …", Keep sách/Giao ngay.
- Phải: **Xuất bill** (chỉ chuyển sang tab Xuất bill; ẩn khi đơn chưa có sách hoặc Đã hủy),
  **1 nút chính** và menu **⋮**. Chọn nút hoặc mục ⋮ mở panel thao tác dưới header như cũ.

| Trạng thái | Nút chính | Mục trong ⋮ |
|---|---|---|
| Nháp, keep | Bắt đầu keep & trừ tồn | Sửa thông tin, Hủy đơn |
| Nháp giao ngay / Đang keep | (không; Xuất bill mang màu nút chính) | Sửa thông tin, Gia hạn keep (Đang keep, còn gia hạn được), Hủy đơn |
| Đang đóng gói | Đã bàn giao vận chuyển | Mở lại đơn đã chốt, Hủy đơn (cả hai khi chưa từng bàn giao) |
| Hoàn tất | Hoàn đơn | Sửa mã vận đơn |
| Đã hủy / Đã hoàn đơn | (không) | (không có ⋮) |

- Menu ⋮: `aria-label "Thao tác DH-…"`, mở thì focus mục đầu, ↑/↓/Home/End, Esc hoặc bấm
  ngoài đóng và trả focus; Hủy đơn chữ đỏ.

## Hai tab

- **Chi tiết đơn** | **Xuất bill**; ←/→/Home/End đổi tab. `?tab=bill` mở tab bill; link cũ
  `?tab=total` cũng vậy. Đổi tab không mất dữ liệu form bill đang nhập.

### Tab Chi tiết đơn

2 cột (trái 2/3, phải 1/3); dưới 1024px còn 1 cột, không cuộn ngang trang.

- **Trái:** Thông tin cơ bản (Mã đơn, Ngày tạo, Hình thức, Hạn keep khi Đang keep, Mã vận
  đơn) · Sách trong đơn (ảnh bìa 40×53 cho sách website có ảnh FRONT, khung xám cho sách
  ngoài; "n quyển · m g") · Thanh toán (badge, Nhận cọc/Hoàn tiền, Tiền sách, Phí ship hoặc
  "Chưa chốt", Tổng/Tạm tính, Đã nhận, Còn thu/Cần hoàn/Đã thanh toán đủ) · Lịch sử thu/hoàn
  luôn mở.
- **Phải:** Thời gian giữ sách (Đang keep) hoặc dòng tóm tắt keep đã bàn giao · Khách hàng
  (tên link hồ sơ, mã, SĐT, 1 kênh TikTok → Threads → Zalo) · Giao hàng ("Chưa chốt bill" +
  "Xuất bill →", hoặc người nhận/SĐT/địa chỉ/J&T/cân/thanh toán ship/COD/mã vận đơn; lịch sử
  giao và hàng hoàn thu gọn) · Lịch sử đơn (timeline) · Ghi chú/lịch sử xử lý (5 mới nhất,
  "Xem tất cả").

| Badge Thanh toán (theo thứ tự) | |
|---|---|
| Đã hủy/Đã hoàn đơn, còn giữ tiền | đỏ "Còn giữ x" (không giữ thì không badge) |
| Chưa nhận đồng nào | đỏ "Chưa cọc" |
| Còn thu ≤ 0 (chưa chốt: tiền sách − đã nhận; đã chốt: `balance`) | xanh lá "Đã thanh toán đủ" |
| Còn lại | xanh dương "Đã cọc" |

Timeline: Tạo đơn → Bắt đầu keep (đơn Keep) → Chốt đơn (ngày tạo lần giao mới nhất không
ABORTED) → Đã bàn giao · Hoàn tất. Đơn hủy chỉ giữ các mốc đã qua rồi "Đã hủy" đỏ; đơn hoàn
thêm "Đã hoàn đơn" đỏ sau mốc bàn giao. Mở lại đơn làm mốc Chốt đơn về xám; lý do mở lại
chỉ ở card Ghi chú. Mốc đã qua cuối cùng có `aria-current="step"`.

### Tab Xuất bill

Thay popup Xuất bill, Sửa thông tin bill và Bill gửi khách. Trái là form bill, phải là bill;
dưới 1024px form trên, bill dưới.

| Đơn | Tab |
|---|---|
| Chưa có sách | "Đơn chưa có sách." và nút về tab Chi tiết đơn |
| Đã hủy | "Đơn đã hủy, không xuất bill." |
| Nháp / Đang keep | Form; **Lưu bill** chốt đơn (sang Đang đóng gói, ở lại tab) |
| Đang đóng gói | Form; Lưu bill sửa thông tin bill |
| Hoàn tất / Đã hoàn đơn | Form chỉ xem, không Lưu bill/Hoàn tác/Nhận cọc |

- Form giữ quy tắc điền sẵn, COD gợi ý, retry cùng `requestId`, lỗi theo ô. "Hoàn tác" (khi
  có thay đổi) trả về giá trị đã lưu. Nhận cọc nằm cạnh dòng Đã nhận.
- Đơn tải lại khi form đang có thay đổi (sau Nhận cọc, 409…): giữ chữ đã gõ và bắt bấm
  "Đã kiểm tra lại COD và cân nặng". Sau một lệnh lưu thành công, form lấy lại giá trị đã lưu.

## Cân kiện gợi ý

- Đơn chưa chốt tự điền Trọng lượng sau đóng gói = tổng trọng lượng sách + 1.000 g (cố định
  trong code), kèm dòng "Sách 850 g + 1.000 g đóng gói". Ô vẫn sửa được; là số ước tính.
- Đơn đã chốt giữ số đã lưu, không có dòng gợi ý.
- Có sách thiếu trọng lượng: để trống, ghi "Chưa đủ trọng lượng sách, nhập số cân thật".
- Tải lại do đơn đổi: chưa sửa ô thì tính lại; đã sửa hoặc xóa trắng thì giữ nguyên.

## Bill để chụp màn hình

- Chỉ OWNER, trong tab Xuất bill. Không có link công khai, tải ảnh, in hay PDF.
- Hiện: Mẹ Mây, Sách ngoại văn cho bé, **Khách** (tên khách), **ngày xuất bill** (ngày
  `serverNow`, giờ Việt Nam), **SĐT** (ô SĐT người nhận đang nhập, trống thì SĐT hồ sơ),
  **Địa chỉ** (ô địa chỉ đang nhập, trống thì địa chỉ đã lưu; trống hẳn thì ẩn dòng); mỗi
  dòng tên sách, SL × đơn giá, thành tiền; các khoản tiền bên dưới.
- Không hiện: mã đơn, mã khách, kênh liên hệ, trọng lượng, COD, mã sách, nguồn sách, ghi chú,
  thông tin chuyển khoản, giảm giá.
- Bill đi theo form khi gõ: Tổng bill = tiền sách + phí ship đang nhập; dòng cuối = Tổng bill
  − đã nhận. Form có thay đổi chưa lưu thì dải vàng "Chưa lưu — bấm Lưu bill trước khi chụp
  gửi khách" hiện ngoài khung bill.

| Trường hợp | Bill hiện |
|---|---|
| Có phí ship | Tiền sách (n quyển), Phí ship, Tổng bill, Đã thanh toán, dòng cuối |
| Phí ship bằng 0 | Phí ship Miễn phí |
| Ô phí ship trống | "Tạm tính, chưa gồm phí ship"; không có Phí ship, dòng tổng là Tạm tính |
| Dòng cuối | Cần thanh toán / Đã thanh toán đủ / Tiền thừa |

- Tiền sách là `goodsTotal`; đơn cũ có giảm giá thì đã trừ sẵn.
- Khung 560px, màu cố định, nút ‹ Trước / Sau › nằm ngoài khung. 12 dòng mỗi trang, có
  "Trang 1/3" khi nhiều trang, phần tiền chỉ ở trang cuối; về trang 1 khi số sách đổi. Tên dài
  xuống dòng, không cắt.

## Dữ liệu backend dùng

`GET /api/v1/admin/orders/{id}` trả thêm (chỉ đọc, không migration): `items[].coverUrl`
(endpoint ảnh admin `/admin/books/{id}/media/FRONT/content` khi có FRONT ACTIVE), `shipments[].createdAt`,
`completedAt`, `cancelledAt`, `customerChannel`. Frontend chịu được khi thiếu các field này.
