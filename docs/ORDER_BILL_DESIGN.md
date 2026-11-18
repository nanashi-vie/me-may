# Tách Chi tiết đơn / Tổng đơn và popup xuất bill

Ngày18/11/2026. **Hướng A hai tab đã được owner chọn qua bản mẫu.**
Owner duyệt toàn bộ thiết kế18/11/2026; chưa sửa application code.
Contract đang chạy: [ORDERS](ORDERS.md); tài liệu này chỉ thay các mục được
nêu dưới đây sau khi được duyệt. Không mở public checkout hoặc tự deploy.

## 1. Mục tiêu và quyết định đã có

Trang hiện tại đặt sách, tổng tiền, cọc, giao hàng và ledger trên cùng một màn,
khiến thao tác gom/keep sách phải đọc quá nhiều thông tin không cùng thời điểm.
Tách quản lý sách khỏi chốt bill, giữ Angular/Spring Boot và các kiểm soát hiện có.

Owner đã yêu cầu/chốt:
- Hai tab **Chi tiết đơn / Tổng đơn** trong cùng đơn, chọn hướng A từ bản mẫu.
- Chi tiết đơn tập trung tiền sách, tiền cọc, tổng trọng lượng sách và từng sách.
- Bỏ Giảm giá; giá cụ thể vẫn chốt riêng từng dòng sách.
- Xuất bill mở popup theo kiểu Thêm khách mới, lưu thông tin; không ảnh/PDF.
- Popup: tên/SĐT/địa chỉ nhận, trọng lượng sau đóng gói, ship nhập tay,
  phương thức Người nhận thanh toán / Thanh toán cuối tháng và COD có điều kiện.
- Đây là cách khách trả bill cho tiệm: khách đã trả đủ trước chọn Cuối tháng.
- Chuyển khoản được ghi qua Ghi nhận thu tiền hiện có; không ghi thu qua xuất bill.
- Bỏ Tiền mặt khỏi lựa chọn giao dịch mới; giữ Chuyển khoản / Khác.
- Chuẩn bị dữ liệu cho tạo đơn hàng loạt sau này; chưa làm tính năng hàng loạt.

## 2. Hai cách đã cân nhắc

| Cách | Điểm được / đánh đổi |
|---|---|
| A — Hai tab trong một đơn, owner đã chọn | Chuyển nhanh, giữ ngữ cảnh/mã đơn; cần trạng thái tab chưa có bill rõ ràng |
| B — Hai trang riêng | Tách nội dung mạnh hơn, nhưng thêm điều hướng/quay lại; không triển khai |

Bản mẫu tương tác dùng dữ liệu giả, ở `.superpowers/brainstorm/` được ignore.
Không coi prototype, số liệu mẫu hoặc các nút minh họa là code production.

## 3. Cấu trúc giao diện được đề xuất

Header chung: mã đơn, khách, trạng thái; giữ tóm tắt hạn keep khi đang keep.
Hai tab nằm dưới header. Mặc định mở Chi tiết đơn; có thể chuyển qua lại.
Đổi tab chỉ đổi cách xem, không ghi dữ liệu, không giữ/trả tồn hay tạo shipment.

**Chi tiết đơn**:
- Ba số chính: Tiền sách, Tiền cọc, Tổng trọng lượng sách (gram).
- Tiền cọc giữ nghĩa hiện tại: tổng DEPOSIT chưa VOID, có thể ghi “Đã ghi nhận”;
  REFUND chung không tự phân bổ trừ vào cọc. Tiền đã nhận ròng/số dư ở Tổng đơn
  mới phản ánh cả hoàn tiền, tránh hiểu chỉ số cọc là số tiền tiệm còn đang giữ.
- Bảng sách: tên/nguồn/mã MM, đơn giá chốt, quantity, gram/quyển, thành tiền.
- Giữ Thêm/Sửa/Xóa theo trạng thái. Xóa/giảm KEEPING vẫn bắt lý do.
- Giữ Bắt đầu keep/Gia hạn/Hủy theo quyền và điều kiện hiện hành.
- Ghi nhận thu tiền là thao tác riêng; Xuất bill là CTA chính khi được chốt.
- Ledger không dàn thành khối lớn: lịch sử giao dịch thu gọn, mở khi cần.
- Sau chốt, item khóa như hiện có; dùng Mở lại đơn có lý do để sửa.

**Tổng đơn**:
- Chưa xuất bill: empty state và nút Xuất bill, không hiện tổng ship giả bằng0.
- Đã xuất bill: tiền sách, ship, tổng bill, đã nhận (gồm cọc), còn thu/cần hoàn;
  phương thức khách trả bill, COD, người nhận và trọng lượng kiện.
- Hiện “Đã thanh toán đủ”, “Còn thu …” hoặc “Cần hoàn …”, không raw enum/tiền âm.
- Có Sửa thông tin bill, Ghi nhận thu tiền và thao tác giao/hoàn theo trạng thái.
- Tracking/bàn giao ở tab này, không bắt mã vận đơn khi chỉ lưu bill.
- Lịch sử shipment/return/ghi chú xử lý thu gọn, không trộn vào ba số của tab sách.

Đây là đề xuất bố trí trong hướng A; không thêm sidebar/dashboard mới.
Đơn ARCHIVED customer cũ vẫn xem/xử lý như contract, không buộc chọn lại khách.

## 4. Popup Xuất bill

Dùng cùng hình thức modal, field, nút, focus/dirty guard với CustomerForm.
Tham khảo UI, không gọi API tạo khách và không sửa hồ sơ gốc khi đổi người nhận.

| Trường | Hành vi |
|---|---|
| Tên người nhận | Bắt buộc, lấy snapshot hiện tại làm giá trị đầu, cho sửa |
| Số điện thoại | Bắt buộc, tái sử dụng chuẩn hóa/validation người nhận hiện có |
| Địa chỉ nhận | Bắt buộc, nhập theo hiện trạng; không tự suy ra mã địa giới J&T |
| Trọng lượng sau đóng gói | Bắt buộc, gram nguyên dương, nhập cân thực tế; tách trọng lượng sách |
| Phí ship | VND nguyên≥0, nhập tay; 0 là miễn ship, trống không phải0 |
| Phương thức thanh toán | Người nhận thanh toán / Thanh toán cuối tháng |
| Tiền thu hộ COD | Chỉ hiện với Người nhận thanh toán; nguyên≥0, cho sửa |

Preview ngắn: Tiền sách + Ship = Tổng bill; Đã nhận; Còn thu/Cần hoàn.
Không có Giảm giá, mã vận đơn, xuất ảnh/PDF hoặc nút tạo lô trong popup này.
“Lưu bill” xác nhận thông tin và mở tab Tổng đơn sau thành công.

### Người nhận thanh toán

Đề xuất: COD gợi ý = max(0, tổng bill − tiền đã nhận ròng), gồm cả tiền cọc.
Tiền đã nhận ròng dùng ledger hợp lệ hiện có, không cộng cọc thêm lần nữa.
Admin được sửa COD và xác nhận con số này; không tự ghi COD thành tiền đã thu.
Ship chỉ cộng một lần trong tổng bill; không cộng thêm ship lần nữa vào COD gợi ý.

### Thanh toán cuối tháng

Theo ý owner: khách đã trả đủ trước cho tiệm; COD ẩn và lưu0.
Đề xuất chỉ cho lưu lựa chọn này khi ledger đã nhận≥tổng bill có ship.
Nếu chưa đủ, hiện thiếu bao nhiêu và hướng dẫn dùng Ghi nhận thu tiền.
Không tự thêm PAYMENT, không tự ghi đủ tiền và không đổi lịch sử cọc khi chọn.
Nếu dư tiền, vẫn hiện Cần hoàn; hoàn chỉ ghi khi owner xác nhận thực hoàn.

Tên hai lựa chọn biểu thị cách khách trả bill theo cách tiệm đã chốt.
Chúng phải được lưu riêng với trường mã người trả cước J&T hiện có;
không suy ra CC_CASH/PP_PM chỉ từ tên lựa chọn và vô tình thu ship hai lần.
Mapping tạo lô J&T sẽ chốt theo file/template thực tế khi thực hiện phần hàng loạt.
Trong phạm vi này giữ cơ chế trả cước hãng hiện có, không thêm tùy chọn vào popup.

## 5. Ghi nhận thu tiền và bỏ Tiền mặt

Tái sử dụng ledger/command/version/requestId hiện có. Trong bố cục mới,
đề xuất mở form này dạng modal để tránh mở rộng nội dung giữa trang.
Giữ loại nhận cọc/nhận thanh toán/hoàn thực tế, amount, thời điểm và ghi chú.
Phương thức mới chỉ BANK_TRANSFER/OTHER; bỏ CASH cả UI lẫn ghi mới qua order API.
Giao dịch CASH cũ vẫn read-only trong lịch sử, không xóa hoặc đổi thành chuyển khoản.
REFUND/VOID giữ xác nhận thực tế/lý do/chống ghi trùng như hiện có.

Có thể ghi nhận tiền trước khi mở Xuất bill. Nếu đang xem popup bill mà thiếu tiền,
đi tới thao tác ghi nhận riêng rồi trở lại, giữ draft người nhận/ship/cân.
Sau ghi nhận phải đọc lại version và số tiền mới; xác nhận COD/cân cũ hết hiệu lực.
Không thêm tùy chọn Tiền mặt vào các form khác của luồng order.

## 6. Lưu bill và trạng thái đơn

Tái sử dụng ý nghĩa chốt giao hiện có: DRAFT/KEEPING → READY_TO_SHIP.
Lưu thông tin và snapshot giao đầu tiên một lần, gồm mode khách thanh toán.
Không tự đánh dấu COMPLETED, ghi tiền hoặc gọi J&T khi lưu bill.
Keep đã trừ tồn thì không trừ lại. Draft chỉ giữ tồn khi chốt thành công,
nếu thiếu tồn hoặc validation lỗi phải rollback toàn bộ như contract.

READY: sửa thông tin bill qua shipping command, review COD/cân theo version mới.
COMPLETED: giữ snapshot lần đã giao, chỉ sửa tracking có lý do theo contract.
UNSUCCESSFUL/resend/abort/actual return/refund vẫn giữ luồng hiện hành.
Sửa phương thức khách thanh toán sau bàn giao không được thay snapshot cũ.

Mở lại đơn có lý do: keep thật giữ start/hạn; chưa từng keep/giao ngay về DRAFT
và nhả tồn theo hiện có. Bill trước là lịch sử, không còn là bill giao hiện hành.
Tab Tổng đơn báo cần xuất lại bill; không coi snapshot ABORTED là sẵn sàng giao.
Đơn hủy/hoàn vẫn xem bill/lần giao cũ read-only theo trạng thái.

Nhận/hoàn/VOID sau khi đã có bill không xóa lịch sử bill; cập nhật số dư thực tế,
giữ cờ cần review COD. Không tự đổi mode khách thanh toán hoặc số COD đã xác nhận.
Để ship khi mode Cuối tháng, backend kiểm lại đã nhận đủ bill ở thời điểm bàn giao;
nếu tiền bị VOID/hoàn làm thiếu thì phải xử lý tiền hoặc đổi mode/xác nhận lại.

## 7. Bỏ Giảm giá và tương thích dữ liệu cũ

Không hiển thị Giảm giá/nút Sửa thông tin giảm giá hoặc cho tạo khoản giảm mới.
Các đơn mới tính tiền sách bằng tổng đơn giá chốt×quantity, điều chỉnh ở từng dòng.
Không drop dữ liệu discountAmount hoặc sửa các bill/giao dịch cũ trong migration.
Đơn cũ có khoản giảm giữ số tiền hàng đã chốt, tổng phải thu và khai giá cũ;
không gán discount=0 từ form không còn trường đó. Không cho chỉnh khoản giảm cũ.
UI dùng tiền sách đã chốt cho trường hợp legacy, chú thích nguồn bill cũ nếu cần.

Đơn đã chốt/giao hiện có sử dụng snapshot đã có để hiện Tổng đơn, không tạo
shipment giả, payment giả hoặc buộc xuất bill lại chỉ để hiện tab.
Mode mới nullable cho dữ liệu cũ: không suy đoán khách đã trả đủ dựa vào PP_PM;
hiển thị thông tin cũ, cho xác nhận mode khi sửa bill trước bàn giao.

## 8. Phạm vi dữ liệu/API và phần dành cho builder

Giữ một order ID và routes admin hiện có. Tab có URL state gọn để Back/refresh
giữ tab, phân biệt với query paging từ danh sách; builder chọn tên param.
Thêm enum/field customer-payment-mode vào read/write order và shipment snapshot;
tên cụ thể do builder chọn, tách khỏi shippingPaymentType.
Migration additive kế tiếp còn trống, legacy null; không tự migrate live.
Tái sử dụng finalize/updateShipping để lưu nguyên tử, không tạo hệ thống bill độc lập.
Frontend chỉ preview; backend tính tiền, kiểm mode/COD/ledger và current OWNER.
Giữ no-store, CSRF, stale version409, immutable requestId retry, audit không PII.
Audit mode mới; free text giữ private notes như hiện có.

Giữ grammar/token/style admin hiện có, không đổi stack, thêm library hoặc tạo ảnh.
Chốt bố cục chi tiết/responsive, chia component và tên test do builder quyết định.
Chưa có template J&T gốc: không cam kết mapping cột/mã địa giới/đơn vị export.
Không tải hết khách/sách hoặc lưu PII trong URL/localStorage/analytics.

## 9. Ngoài phạm vi

Không tạo lô/upload/API J&T/Excel, tự đối soát COD, ảnh/PDF/in bill,
thay đổi public/wishlist, migration live hoặc deploy. Không thay quy tắc
keep14/trần30, xóa sách có lý do, actual refund và hoàn tất khi bàn giao.

## 10. Tiêu chí kiểm tra

- Ba metric ở Chi tiết; sách đầy đủ; không Giảm giá/Tiền mặt mới.
- Hai tab giữ cùng order ID, refresh/back đúng; empty/bill hiện hữu/aborted/cancel đúng.
- Fee trống khác0; trọng lượng kiện độc lập trọng lượng sách; integer/overflow.
- COD gợi ý trừ cọc/thu hợp lệ, cho sửa; Cuối tháng ẩn COD/lưu0, thiếu tiền bị chặn.
- Ghi thu trước/sau popup không nhân cọc/PAYMENT; REFUND/VOID làm thiếu phải review.
- Legacy CASH/discount/bill vẫn đọc đúng, không sửa quá khứ hoặc chuyển0 âm thầm.
- Lưu bill draft/keep, retry mất response, version409 giữ form; không trừ tồn trùng.
- Modal focus/Escape/dirty/mobile; STAFF không gọi/xem order và không ghi tiền.
- Hồi quy order/customer/catalogue, build SSR/Workers; kiểm dữ liệu synthetic.

## 11. Quyết định duyệt và bổ sung18/11

COD gợi ý theo số còn thu; gate Cuối tháng theo số tiền thực nhận; form thu tiền
dạng modal; lịch sử thu gọn; tab lưu trong URL; snapshot legacy/mode mới nullable.
Owner đã duyệt thiết kế đầy đủ18/11, gồm các quy tắc trên.
Kế hoạch triển khai tại [ORDER_BILL_PLAN](ORDER_BILL_PLAN.md).

Bổ sung cùng lần duyệt: dọn UI/luồng cũ bị thay thế, giữ dữ liệu lịch sử.
Sau phần đơn hàng, sửa CustomerForm dùng chung: đưa SĐT và cảnh báo trùng lên
trước tên, autofocus SĐT khi thêm mới. Tái sử dụng tra trùng hiện có (300ms,
chuẩn hóa +84/0, ACTIVE/ARCHIVED, xác nhận vẫn tạo); không bắt buộc nhập SĐT
hay chặn trùng tuyệt đối. Hiện đang kiểm tra/lỗi tra cứu, bỏ kết quả lỗi thời.
Áp dụng cả tạo khách từ danh sách và từ đơn hàng; không tạo wizard mới.

Builder check18/11 đã đọc độc lập: chỉ hỏi nghĩa Tiền cọc sau REFUND;
đã giải bằng contract hiện có ở mục3, không đổi cách phân bổ ledger.
