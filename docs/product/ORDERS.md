# Quản lý đơn hàng nội bộ — contract hiện hành

Chuẩn hóa16/11, cập nhật17/11/2026 từ Order Management v1.0 do owner cung cấp.
**Trạng thái:** duyệt và triển khai local17/11/2026, gồm các quyết định mục15.
Bằng chứng và giới hạn: [ORDER_VERIFICATION](../verification/ORDER_VERIFICATION.md); gate ở PROGRESS.
Đây là mở rộng riêng sau catalogue MVP, không đổi wishlist thành giỏ hàng.
Spec này thay giới hạn không có đơn/giữ tồn/thanh toán trong MASTER_PLAN cho
khu admin; public và các gate release hiện hành giữ nguyên.

## 1. Mục tiêu, phạm vi và hướng triển khai

Thay dần Excel theo dõi đơn nội bộ: chọn/tạo khách, đơn giao ngay hoặc keep,
CATALOG/MANUAL, giữ tồn, cọc/thanh toán/hoàn tiền, cân kiện và ghi vận đơn J&T.
Mỗi lần giao một kiện; user mở rộng16/11 cho ghi không thành công, gửi lại hoặc
hoàn hàng/nhập lại tồn bằng tay. Không public checkout, payment gateway,
thông báo tự động, đồng bộ kho livestream, tự đối soát COD/ngân hàng,
chia kiện đồng thời hoặc xuất Excel/API J&T trong bản đầu.

Hướng phù hợp code hiện có: Angular standalone, Spring Boot modular monolith,
PostgreSQL/Flyway; module order dùng Spring JDBC, khóa đơn rồi book ID tăng dần.
Tái sử dụng auth/session/CSRF, CustomerForm, page/errors/version và audit có
điều chỉnh. Không thêm framework CRM, kho hoặc workflow engine.
Order dùng tồn gộp mã MM đã duyệt06/11, giữ dòng legacy, không dựng kho từng vật thể.

## 2. Tích hợp code và dữ liệu

Module `vn.memay.order`, Angular standalone `features/admin/orders`; không thêm dependency.
Flyway V34 tạo orders/items/reservation/payments/shipments/returns/mutation_receipt;
V35 lưu private action notes, V36 snapshot dòng sách/số bỏ sống sau khi xóa item.
OrderRepository JDBC `@Component`; transaction do mutation/services quản lý.
BookStockService dùng chung khóa book với editor/status; pooledRows giữ UUID,
tên/thứ tự legacy. Keep/return cập nhật version/availability/audit/cache sau commit.
BookTrashService chặn trash khi ACTIVE, chặn purge mọi order reference;
scheduled purge loại reference trước limit, không để một FK chặn cả batch.
Auth/session/CSRF, CustomerForm, AdminHttp, VndInput và audit tái sử dụng.
Admin lookup gồm sách Ẩn/hết hàng; giá/sale chỉ tham khảo, không tự gán đơn giá.
Nguồn nền: [DATA](../context/DATA.md), [CUSTOMERS](CUSTOMERS.md), [CATALOGUE](CATALOGUE.md),
[ARCHITECTURE](../context/ARCHITECTURE.md).

## 3. Trạng thái và thao tác

| Trạng thái | Hành vi |
|---|---|
| DRAFT — Nháp | Chọn khách, thêm/sửa/xóa item, chưa giữ tồn |
| KEEPING — Đang keep | Giữ tồn, thêm/sửa/xóa item và ghi nhận tiền |
| READY_TO_SHIP — Chờ giao | Đã chốt item, người nhận, kiện/COD/khai giá; còn giữ tồn |
| COMPLETED — Hoàn tất | Admin xác nhận đã bàn giao vận chuyển; khóa item, không trừ tồn nữa |
| UNSUCCESSFUL — Đơn không thành công | Chủ ghi nhận thủ công đơn hoàn về; chờ gửi lại hoặc hoàn đơn/nhập tồn |
| CANCELLED — Đã hủy hoặc Đã hoàn đơn | Nhãn Đã hoàn đơn khi có `order_returns`, còn lại Đã hủy; lọc riêng (RETURNED); xóa theo [TRASH](TRASH.md) |

- Giao ngay: DRAFT → READY_TO_SHIP → COMPLETED; keep thêm KEEPING sau DRAFT.
- COMPLETED → UNSUCCESSFUL do chủ xác nhận hoàn về, lưu lý do/thời điểm.
- UNSUCCESSFUL → READY_TO_SHIP để gửi lại, hoặc CANCELLED để hoàn đơn/nhập tồn.
- READY lần gửi lại → UNSUCCESSFUL nếu chủ dừng gửi lại; không hoàn tồn/tiền.
- Hủy thường từ DRAFT/KEEPING/READY_TO_SHIP trước lần gửi đầu; sau bàn giao
  đi qua luồng không thành công/hoàn đơn. Không giữ SHIPPED làm trạng thái riêng.
- Không EXPIRED; quá hạn là thuộc tính tính từ thời gian, không tự hủy/nhả tồn.
- READY trước lần gửi đầu được reopen có lý do: KEEP về KEEPING giữ hạn cũ;
  IMMEDIATE về DRAFT và hoàn tồn; KEEP chưa từng bắt đầu giữ cũng về DRAFT/nhả tồn.
  Chỉ keep đã có start/until mới về KEEPING; lần keep đầu vẫn kiểm cọc/khởi tạo hạn.
- COMPLETED/UNSUCCESSFUL khóa item/giá; luồng gửi lại chỉ sửa snapshot giao mới.
  Thanh toán độc lập: vẫn ghi thực nhận/hoàn tiền, không sửa tổng đã nhận bằng tay.

## 4. Danh sách, tạo đơn và khách hàng

Route `/admin/orders`, `/admin/orders/new`, `/admin/orders/:id`.
Tiêu đề Quản lý đơn hàng; nút + Tạo đơn hàng. Bảng mã DH, tên/SĐT khách, ngày tạo dd/MM/yyyy, tổng quantity, orderTotal, paidAmount, trạng thái,
hạn keep (chỉ đơn KEEPING, còn lại "—"; COMPLETED/UNSUCCESSFUL ghi một dòng keep → bàn giao lần đầu → hạn ở chi tiết;
keep_until giữ nguyên trong DB) và thao tác phù hợp trạng thái/quyền. Sắp mới nhất createdAt,id.
Tìm mã đơn/tên/SĐT/mã KH; lọc status, khoảng ngày tạo và keep sắp/đến/quá hạn.
Pagination backend20/max100, page bắt đầu0; đổi q/filter reset page.
Thống kê Đang keep/Sắp hết hạn/Quá hạn/Chờ giao/Hoàn tất/Không thành công do backend tính,
không cộng chỉ các dòng trong trang; dùng cùng bộ lọc danh sách.

Chọn khách ACTIVE bằng API customer hiện có, tìm cả ba username đã hỗ trợ.
Tạo nhanh mở CustomerForm, giữ logic trùng SĐT và nhận saved để chọn ngay;
không sao chép validation/customer API. Không tải hết khách về browser.
Lưu customer_id ổn định cùng snapshot mã/tên/SĐT khách và người nhận/địa chỉ.
Sửa hồ sơ gốc không đổi đơn cũ; nút lấy lại thông tin phải được xác nhận/audit.
Khách có nhiều KEEPING: hiển thị danh sách mã/hạn để chọn thêm hoặc tạo mới;
không unique constraint một keep/khách. Khách ARCHIVED vẫn có lịch sử và đơn
đang xử lý; không tự hủy đơn khi lưu trữ khách, không chọn cho đơn mới.
Khóa đổi customer_id sau khi đơn rời DRAFT hoặc đã có giao dịch tiền.

## 5. Item CATALOG/MANUAL và giá chốt từng cuốn

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

## 6. Cảnh báo MANUAL giống danh mục

Debounce300–500ms, backend tìm tối đa5 kết quả cả Ẩn/hết hàng, không chỉ public.
Chuẩn hóa trim/khoảng trắng/chữ hoa-thường/không dấu; so khớp chính
xác trước rồi gần giống bằng PostgreSQL, chưa tự cài extension/dependency.
SQL lọc tối đa200ứng viên ưu tiên prefix/độ dài/id; Java Levenshtein≥0,8,
trả tối đa5. Giới hạn200 là trần lookup hiện tại; tăng/search index khi dữ liệu cần.
Không tải toàn bộ catalogue hoặc dùng AI để phân loại trùng.
UI cảnh báo, cho chọn CATALOG hoặc vẫn MANUAL với lý do bản khác/kho livestream/
lý do khác. Không đổi nguồn tự động, không chặn tuyệt đối vì cùng tên nhiều cuốn.
Backend kiểm lại lúc lưu; trả409 `manual_match_confirmation_required` kèm
kết quả mới cần xác nhận. Xác nhận gắn normalizedTitle và fingerprint
kết quả (id/version), lưu lý do; đổi tên/kết quả mới làm mất hiệu lực xác nhận.
Không xác nhận vô điều kiện, không tìm sách đã purge; phạm vi Thùng rác ở mục15.

## 7. Tiền, trọng lượng và validation

Backend tính; không tin tổng frontend, không dùng float cho tiền.
- subtotal = SUM(unitPriceVnd × quantity); goodsTotal = subtotal − discountAmount.
- discountAmount chỉ đọc cho đơn cũ; đơn mới chốt giá từng dòng, tiền VND nguyên.
- paidAmount = SUM(DEPOSIT + PAYMENT) − SUM(REFUND) của giao dịch hợp lệ.
- **Tiệm thu cả ship:** orderTotal = goodsTotal + shippingFee (phí thu khách nhập tay).
  balance = orderTotal − paidAmount; còn thu = max(0,balance), dư âm là tiền thừa.
  Chưa nhập phí ship thì tổng/còn thu là tạm tính, không coi phí chưa biết là0;
  finalize bắt nhập phí, cho0 nếu miễn ship. Không cộng ship hai lần vào COD.
- UNPAID khi paidAmount=0<orderTotal; PARTIALLY_PAID khi0<paidAmount<orderTotal;
  PAID khi bằng nhau (kể cả0/0); OVERPAID khi lớn hơn. Ship chưa biết thì trạng
  thái thanh toán tạm tính. Refund không vượt tiền nhận, không tự xóa khoản phải thu.
- itemWeight = unitWeightGrams × quantity; totalBookWeightGrams = SUM(itemWeight).
  Thiếu bất kỳ weight hiển thị “Chưa đủ dữ liệu”, không coi thiếu là0.
- Popup Xuất bill yêu cầu cân kiện sau đóng gói, gram nguyên dương.
  Sau refresh do version thay đổi, admin kiểm lại cân/COD rồi lưu.
  Thay đổi weight sách gốc không sửa snapshot đã bàn giao.

Giới hạn: tối đa1000dòng/đơn; quantity1..999999/dòng; title≤300;
unitPrice≤999999999999; weight dương≤9007199254740991gram như catalogue.
Mọi tích/tổng tiền/gram phải≤9007199254740991, kiểm overflow trước lưu;
tiền ship/COD/discount/khai giá cũng nguyên trong miền cho phép, không clamp.
Backend dùng checked arithmetic, UI không mất chính xác; giá0 được bản gốc cho phép.

## 8. Keep và gia hạn

fulfillmentType IMMEDIATE/KEEP. KEEP mặc định yêu cầu cọc100.000đ thực nhận;
không yêu cầu thanh toán dự kiến, không bắt đủ tiền hàng để giữ/giao ngay.
OWNER có thể xác nhận thiếu cọc kèm lý do và số thiếu; audit cùng giữ tồn.
keepStartedAt do server ghi ở lần xác nhận KEEPING đầu tiên, không reset do thêm sách.
Múi giờ Asia/Ho_Chi_Minh; chuẩn hóa hạn thành mốc kết thúc **không bao gồm**:
bắt đầu16/11/2026 → giữ hết30/11 → keepUntil=01/12/2026 00:00+07.
Tính bằng ngày địa phương +14 ngày rồi đầu ngày kế tiếp, không cộng336giờ.
UI hiển thị hạn30/11; lưu TIMESTAMPTZ, API ISO8601 có offset/UTC.
Quá hạn nếu now≥keepUntil; đến hạn nếu hôm nay là ngày giữ cuối và chưa quá;
sắp hạn nếu còn1..3ngày lịch; chỉ áp dụng đơn KEEPING. Backend/Clock là nguồn giờ.
Gia hạn nhập hạn mới>hạn cũ, lý do bắt buộc; giữ lịch sử cũ/mới, actor/time,
extensionCount. User chốt tổng keep kể cả gia hạn tối đa **30ngày từ đầu**,
đã gồm14ngày ban đầu; không tính tháng lịch hoặc cộng30ngày sau hạn cũ.
Giữ cách tính ngày lịch ở trên: hạn cuối không vượt ngày bắt đầu+30ngày,
cuối ngày đó; bắt đầu16/11 → tối đa hết16/12. Không reset trần khi reopen.
Không tự gia hạn/cancel/release theo timer, kể cả đã vượt trần.
Kết thúc keep mở Chốt giao, kiểm lại dữ liệu rồi READY; không nhả reservation.

## 9. Keep trừ tồn ngay và tích hợp tồn gộp

**User chốt16/11:** xác nhận keep là trừ tồn kho ngay. S = SUM(book_variant.stock)
là lượng còn bán được; availableStock = S. Reservation chỉ theo dõi lượng đã
trừ đang thuộc đơn nào, phục vụ hoàn tồn/handoff; không lấy S trừ reservation nữa.
CATALOG theo book_copy_id và quantity gộp các dòng, không lưu variant allocation.
Tồn vật lý tại tiệm còn gồm phần đã keep; S chỉ là lượng còn bán được.
DRAFT chỉ kiểm/thông báo tồn hiện tại, không đảm bảo giữ; phải kiểm lại lúc xác nhận.

| Thao tác | Tồn bán được và kết quả |
|---|---|
| DRAFT → KEEPING hoặc READY | Kiểm toàn bộ, S giảm quantity và ghi reservation ACTIVE cùng transaction; thiếu một sách rollback tất cả |
| KEEPING thêm/tăng quantity | Trừ S phần tăng, tăng reservation; thiếu tồn rollback |
| KEEPING giảm/xóa item | Cộng S phần bỏ, giảm/đóng reservation đúng một lần |
| KEEPING → READY | Giữ reservation hiện có, không giữ lần hai |
| Cancel trước ship | Reservation RELEASED, cộng S phần đã trừ chưa hoàn đúng một lần |
| READY → COMPLETED | Reservation CONSUMED; S không đổi vì đã trừ lúc keep/chốt giao ngay |
| COMPLETED → UNSUCCESSFUL | Không tự hoàn tồn/hoàn tiền chỉ vì đổi trạng thái |
| Gửi lại sau không thành công | Không trừ tồn lần nữa, giữ phần đã trừ của đơn |
| Xác nhận hoàn đơn sau thất bại | Chủ xác nhận hàng thực nhập và cộng tồn CATALOG đúng một lần |
| Retry ship/cancel/return | Không trừ/nhả tồn thêm |

Khóa order rồi book_copy theo id tăng dần và các dòng/reservation liên quan;
kiểm version và S sau khóa. Mọi đường ghi tồn, kể cả BookCommandService và
legacy variants API, phải cùng quy ước khóa/version; không chỉ khóa ở OrderService.
Sửa tồn tay là sửa số còn bán S, không gồm sách đã keep; metadata-only không mang
tồn cũ ghi đè sau keep/hoàn tồn. Tăng version book khi reservation/tồn thay đổi để
editor cũ nhận409. Không gọi lại command sửa sách buộc ảnh/weight/publish chỉ
để trừ tồn của sáchẨn; dùng thao tác tồn hẹp cùng transaction và audit.

Availability giữ AVAILABLE khi S>0, ngược lại SOLD (UI “Hết hàng”);
không thêm trạng thái public Đang giữ, không tính reservation thêm lần nữa.
Phải đồng bộ admin mapper, public list/detail/lookup/wishlist/Home/collection/
Flash Sale và cache invalidation sau commit; không chỉ đổi một DTO.
Ẩn listing không nhả tồn đơn. Chặn trash khi còn reservation ACTIVE; các FK
order phải bảo vệ lịch sử khỏi hard purge, không CASCADE xóa item/đơn/thanh toán.
Xóa đơn chỉ theo điều kiện ở [Thùng rác](TRASH.md) (25/11). Hoàn tồn phải
giữ giới hạn mỗi dòng legacy; nếu không đủ sức chứa thì rollback và báo lỗi,
không clamp hoặc âm thầm bỏ lượng hoàn. Plan phải kiểm case tăng tồn tay rồi hủy.

## 10. Giao dịch tiền, retry và hủy đơn

DEPOSIT/PAYMENT/REFUND lưu amount>0, method, occurredAt thực nhận/hoàn,
note, createdBy/createdAt; ghi mới BANK_TRANSFER/OTHER. CASH lịch sử vẫn đọc được.
Không tạo PAYMENT giả cho COD khi COMPLETED. Khi thực nhận COD,
OWNER ghi PAYMENT thủ công. Không sửa/xóa trực tiếp giao dịch đã xác nhận.
Điều chỉnh sai bằng VOID có lý do/actor/time, giữ bản gốc; tổng bỏ giao dịch VOID,
kiểm lại tổng refund không vượt nhận hợp lệ; VOID không phải hoàn tiền thực tế.

Mọi mutation order gửi version; khóa order và tăng version một lần/command.
Stale trả409 `version_conflict` + currentVersion, giữ form, không auto retry/merge.
Create/payment/ship/cancel và các mutation khác dùng requestId UUID bền qua
retry: unique scope actor/operation/requestId, fingerprint payload/order/version.
Replay cùng request trả cùng kết quả, không tăng version/tạo tiền/xuất kho lại;
khác payload trả409 `idempotency_conflict`; kiểm auth hiện tại trước replay.
Receipt cùng transaction với item/reservation/payment/audit; lỗi rollback hết.
Không coi disable nút hoặc optimistic locking đủ ngăn payment lặp.

Hủy trước gửi lưu lý do/actor/time và hoàn phần tồn đang giữ đúng một lần.
Hoàn đơn sau thất bại chỉ nhập lại tồn khi chủ xác nhận hàng thực nhận; không
tự cộng khi đơn bị trả. MANUAL không cập nhật kho web; không cộng phần đã nhập.
**User chốt:** chỉ ghi REFUND khi admin xác nhận hoàn thực tế, nhập số tiền/thời
gian/phương thức. Không tự hoàn hết, tự giữ cọc hoặc coi đổi trạng thái là hoàn tiền.
Tiền cần hoàn/giữ lại do chủ quyết định thủ công theo từng trường hợp, lưu lý do;
đơn hủy/hoàn vẫn xem tiền còn giữ, chỉ REFUND/điều chỉnh hợp lệ, không nhận tiền mới.

## 11. Chốt giao, J&T và snapshot

Người nhận mặc định từ customer, sửa riêng cho đơn. Validate tên≤150 không
trắng, SĐT theo CustomerValidation hiện hành (+84→0), địa chỉ≤500 không trắng.
Không ghi đè hồ sơ customer khi sửa địa chỉ giao. Không bắt có SĐT lúc DRAFT.

Finalize lần đầu: ≥1item, giá/quantity/weight hợp lệ, đủ reservation (DRAFT tạo mới,
KEEPING tái dùng), parcelWeight>0 hết needsReview, đủ người nhận và shipping.
Backend tính/chốt declaredValue=goodsTotal; không gồm phí ship, không trừ cọc.
Mode RECIPIENT cho nhập COD; MONTHLY lưu COD0, kiểm đã thu đủ bill lúc lưu và bàn giao.
Mode nullable cho bill cũ, ghi riêng trên order và snapshot V37; không suy ra từ mã trả cước.

Cấu hình theo bản user cung cấp: J&T Express, EXPRESS, sản phẩm Sách,
HÀNG HÓA, không gửi tại bưu cục, parcelCount1, không dùng dài/rộng/cao.
shippingPaymentType: CC_CASH (người nhận), PP_CASH (người gửi), PP_PM (cuối tháng);
tách khỏi tiền khách trả tiệm. User chốt17/11: bill khách gồm tiền hàng+ship,
tiệm trả J&T từng đơn; mặc định PP_CASH, thay CC_CASH trong bản gốc.
**User chốt:** shippingFee do admin nhập thủ công, không tự tra/tính phí J&T;
nullable khi chưa biết ở draft/keep, phải có khi chốt (0 nếu miễn). COD nguyên≥0
gợi ý max(0, tiền hàng + ship − đã nhận ròng), admin được sửa.
Đổi hàng/phí ship (kể cả gửi lại)/tiền nhận hoặc hoàn → COD needsReview;
không tự sửa COD. Finalize phải xác nhận COD theo version đang đọc.
Sau READY có giao dịch làm đổi số dư: chặn ship đến khi review COD
qua command shipping; không tự reopen/chỉnh declaredValue vì nhận thêm cọc.
READY nhập trackingCode do chủ nhập và xác nhận bàn giao → COMPLETED, lưu
actor/time và consume reservation cùng transaction; không đợi giao thành công
hoặc nhận đủ tiền. Bắt mã vận đơn trước bàn giao; sửa mã có lý do/audit.
COMPLETED → UNSUCCESSFUL khi chủ ghi hoàn về. Chủ chọn gửi lại: tạo lần giao
mới READY, giữ item/giá/tồn đã trừ, nhập mã mới và kiểm người nhận/kiện/COD/ship
rồi bàn giao → COMPLETED. Không ghi đè mất mã/lịch sử lần giao trước.
Resend kiểm lượng CONSUMED chưa nhập lại, không đòi ACTIVE/reserve/trừ tồn lần nữa.
Chọn hoàn đơn: xác nhận số lượng CATALOG thực nhập lại (0..quantity từng dòng),
lưu phần không nhập/lý do, đóng CANCELLED và ghi hoàn tồn một lần; refund riêng.
Không cho gửi lại đơn đã đóng hoàn/nhập tồn. Phí phát sinh gửi lại nhập thủ công;
chỉ khoản chủ xác nhận thu thêm khách mới tăng shippingFee/orderTotal, không tự
thu lại phí cũ. Snapshot mỗi lần giao giữ fee/COD/weight/tracking tại lần đó.

Sau MVP mới xuất .xlsx theo file mẫu J&T gốc: STT, người nhận/SĐT/địa chỉ,
mã đơn, EXPRESS, không gửi bưu cục, paymentType, Sách/HÀNG HÓA, gram/1000
thành số Excel kg, ba kích thước trống, số kiện1, COD và declaredValue;
giao một phần trống. Có lịch sử lô/cảnh báo xuất trùng; xuất không đổi trạng thái đơn.
Chưa có template gốc để kiểm mapping/mã dịch vụ/kích thước trống; phải kiểm khi export.

## 12. Schema hiện hành

| Bảng mới | Trường/constraint chính |
|---|---|
| orders | BIGINT id; order_code UNIQUE DH-000001 theo identity/sequence, không MAX+1; customer_id FK; customer_code/name/phone_snapshot; status/fulfillment_type CHECK; version≥0; actor/time |
| orders — keep | keep_started_at/keep_until TIMESTAMPTZ; keep_extension_count; required_deposit_vnd; deposit_override_reason/actor/time; không unique keep/customer |
| orders — giao | recipient_name/phone/shipping_address; shipping_provider/service/payment_type; shipping_fee nullable trước chốt; parcel_weight_grams/overridden/needs_review; parcel_count=1; cod_amount/cod_needs_review; declared_value; tracking_code hiện tại; completed/failed/cancelled actor/time/reason |
| order_items | id/order_id; source_type; book_copy_id/listing_id nullable theo source; book_code/title_snapshot; unit_price_vnd NOT NULL≥0; quantity>0; unit_weight_grams nullable khi draft; manual_match_override_reason/evidence; created_by/added_at; không unique(order,book) |
| order_reservation | id/order_id/book_copy_id; quantity>0 khi ACTIVE, RELEASED cho0; state ACTIVE/RELEASED/CONSUMED; timestamps; returned_quantity/restocked_quantity; UNIQUE(order_id,book_copy_id), không nhập lại quá phần đã trừ |
| order_shipments | id/order_id/attempt_no UNIQUE; state PLANNED/HANDED_OVER/FAILED/ABORTED; snapshot người nhận, fee/COD/weight/provider/service/payment_type/tracking; actor/time/reason; một lần giao hiện hành, một kiện/lần |
| order_returns | order_id/item_id/quantity_received/quantity_restocked/reason/actor/time/request_id; giữ xác nhận thực nhập và chống nhập trùng, MANUAL không restock web |
| order_payments | id/order_id; transaction_type; amount>0; payment_method; occurred_at/note; actor/time; void metadata và lý do bắt buộc |
| order_mutation_receipt | request_id/actor/operation/order_id/fingerprint/kết quả tối thiểu; unique scope; không log raw payload hoặc trả dữ liệu trước auth |
| order_action_notes | reason riêng tư, order/version/requestId/operation/actor/time; snapshot item/mã/tên/số lượng bỏ khi xóa/giảm KEEPING; audit chỉ giữ ref |

orders có discount_amount≥0; tổng hàng/weight/paid/paymentStatus tính backend,
không phải field client được sửa. Finalize lưu snapshot declaredValue/parcel.
Keep extension và thay đổi giá/quantity/weight/shipping cần audit đủ before/after
có cấu trúc; không chỉ đếm extensionCount. S≥0 và hoàn/trừ đúng lượng kiểm dưới
khóa trong transaction, không giả định constraint liên bảng sẵn có. Index status/created,
customer/created, keepUntil và reservation book/state; tiền/order và audit target.

## 13. API, quyền, audit và bảo mật

Base **/api/v1/admin/orders**; DTO camelCase, BIGINT ID JSON string,
Page={items,page,size,totalElements,totalPages}, không trả entity trực tiếp.

| Method/path tương đối | Contract |
|---|---|
| GET rỗng, /stats, /{id} | Danh sách/thống kê/detail; stats không bị giới hạn page |
| GET /catalog, /catalog-match | Tìm chọn CATALOG/tương tự MANUAL, không dùng API public |
| POST rỗng | customerId/fulfillmentType/requestId →201 DRAFT, mã server |
| PUT /{id} | Field whitelist của trạng thái chỉnh được + version/requestId |
| POST /{id}/items | CATALOG refs hoặc MANUAL fields, giá cụ thể + version/requestId |
| PATCH /{id}/items/{itemId} | quantity/giá/weight + version/requestId; giảm quantity khi KEEPING phải có reason |
| DELETE /{id}/items/{itemId} | JSON {version,requestId,reason}; KEEPING bắt reason không trắng, tối đa1000; UI confirm |
| POST /{id}/payments, /payments/{paymentId}/void | Ghi nhận tiền/điều chỉnh nếu duyệt; version/requestId/lý do |
| POST /{id}/keep, /extend-keep | Kiểm cọc/reserve hoặc gia hạn có lý do |
| POST /{id}/finalize, /reopen | Chốt giao hoặc mở sửa có audit, không PATCH status |
| PATCH /{id}/shipping | Field whitelist theo trạng thái, review COD/kiện hoặc bổ sung tracking |
| POST /{id}/ship, /cancel | Bàn giao chuyển COMPLETED hoặc hủy trước gửi; version/requestId |
| POST /{id}/fail, /return | Ghi không thành công hoặc đóng hoàn/nhập tồn; version/requestId/lý do |
| POST /{id}/resend, /abort-resend | Chuẩn bị gửi lại hoặc dừng gửi lại về UNSUCCESSFUL, giữ tồn/tiền; version/requestId |

Customer search/create dùng `/api/v1/admin/customers`, không nhân đôi endpoint.
Customer history dùng list với customerId; tổng aggregate không N+1, loại nháp/hủy/thất bại.
400 validation/query;401 anonymous;403 quyền/CSRF;404 không tồn tại/khác order;
409 version/transition/stock/manual-match/idempotency; lỗi `{error,fieldErrors?,
currentVersion?}` theo convention, không lộ SQL/stack. Item/payment id phải thuộc đơn.

**User chốt tạm thời chỉ admin:** ánh xạ OWNER hiện có, STAFF không xem/tìm/ghi
đơn hoặc truy cập stats/catalog-match/history qua API order; anonymous401,
STAFF403 kể cả GET. Không tạo role ADMIN mới. UI/sidebar/route cũng bảo vệ;
không mở số liệu đơn qua hồ sơ customer cho STAFF. Quyền kiểm ở API/service.
Audit actor server, order/version/requestId/action, item/payment refs và số tiền/
giá/weight/trạng thái/hạn cũ-mới; thay địa chỉ chỉ ghi field changed, không copy PII.
Cần mở rộng audit có scope hoặc writer hẹp; allowlist hiện tại bỏ mất field order.
Lý do/ghi chú có thể chứa PII: giữ riêng trong dữ liệu admin có quyền, audit chỉ ref.
Audit fail rollback; invalidate public cache khi tồn khả dụng đổi sau commit.
Session/cookie/CSRF/no-store hiện hành; SQL parameterized/sort allowlist,
text thuần không innerHTML. Không PII trong log/analytics/public SSR/TransferState/cache.

## 14. UI, nghiệm thu và rollout

Admin desktop-first theo form/table/custom dropdown hiện có; tablet/mobile không
tràn khung. Loading/error/empty, keyboard/focus, dirty guard và double-submit.
Giữ form khi lỗi; stale response không đè mới. Xác nhận xóa/hủy/ship/ngoại lệ,
không tải hết sách/khách. Hiển thị giá bán cụ thể/quantity/gram rõ từng dòng.
Chi tiết đơn hiển thị tiền sách, cọc và trọng lượng sách cùng danh sách sách.
Tổng đơn (tab=total) hiển thị bill sau lưu. Mở lại đơn phải xuất bill mới.
Ghi nhận thu/hoàn thực tế qua popup riêng, giữ draft bill khi ghi chuyển khoản.
Lưu bill chốt READY, mở Tổng đơn; khi bàn giao mới bắt mã vận đơn và hoàn tất.

AC gốc01–20 được giữ qua nhóm kiểm tra sau và bổ sung các case tích hợp:
- 01–04: chọn/tạo khách, CATALOG/MANUAL, duplicate confirm FE/BE; hai dòng
  cùng mã khác giá giữ độc lập; giá catalogue sửa sau không đổi giá đơn.
- 05–07: tổng gram đúng, thiếu weight không thành0, override không bị đè,
  sửa quantity/weight buộc review; giá riêng không gây review cân sai.
- 08–09: keep qua ranh ngày/tháng, hạn+14ngày lịch, thêm sách không gia hạn,
  gia hạn không vượt ngày bắt đầu+30ngày; thiếu cọc chỉ OWNER ngoại lệ có lý do;
  quá hạn không tự nhả tồn, reopen không reset hạn.
- 10/14/15: nhiều lần cọc/payment/refund, discount/overpaid/0đ, COD review,
  tổng phải thu gồm ship, khai giá không gồm ship; hoàn chỉ khi xác nhận thực tế;
  retry/time-out không ghi tiền hai lần, gửi lại không cộng phí cũ lần nữa.
- 11/12: hai đơn giành tồn1 chỉ một thành công; nhiều dòng cùng MM cộng đủ;
  keep trừ ngay, ship không trừ nữa, hủy hoàn đúng lượng đã trừ; mọi retry không
  trừ/nhả lặp; hủy còn tiền chưa coi đã hoàn; test hoàn tồn vượt sức chứa legacy.
- 13/16/17: finalize DRAFT reserve đủ hoặc rollback tất cả, người nhận/kiện/
  COD hợp lệ; J&T defaults đúng cấu hình nội bộ; snapshot không đổi theo gốc.
- 18/19: version409, command replay/different payload, OWNER/STAFF/anonymous,
  CSRF, cross-order id, audit rollback, no PII public/cache/log.
- 20: race edit stock↔reserve/ship, metadata editor cũ, trash/purge có FK,
  giữ legacy variant UUID/tên/thứ tự; public/Home/sale/wishlist/SEO/cache nhất quán.
- Bổ sung16/11: bàn giao→COMPLETED dù tiền chưa đủ; fail không tự hoàn tồn/tiền;
  resend/abort giữ lịch sử mã/tồn, COD review khi đổi phí; return nhập thực tế, retry không
  nhập trùng, không resend sau restock; reopen trước gửi theo đúng loại đơn.

DoD: PostgreSQL integration thật cho transaction/concurrency/migration/RBAC,
frontend test tính tiền/weight/review/errors/permissions; build SSR/Workers;
browser OWNER tạo nhanh/dirty/keep/cancel/ship/retry; STAFF bị chặn cả xem;
hồi quy sách/khách theo quyền hiện có.
Dùng dữ liệu synthetic, không test mutation trên khách/đơn thật. Ghi bằng chứng
vào ORDER_VERIFICATION/DEV_LOG, snapshot PROGRESS; local QA không thay gate live.
Trước rollout xác minh Flyway thực tế, backup DB/media/offhost và restore,
schema additive/backend trước FE tương thích; không đánh đồng local với live.
Rollback không drop đơn/receipt/payment hoặc xóa giao dịch phát sinh; user merge
main/deploy theo workflow. Schema additive/backend trước FE; không tự migrate live.

## 15. Quyết định đã duyệt17/11

Đã chốt16/11: giá cụ thể từng cuốn, keep trừ tồn ngay, chỉ admin, tiệm thu cả
ship nhập tay; hoàn tiền chỉ xác nhận khi thực hoàn; bàn giao→Hoàn tất và nhập
mã vận đơn; chủ ghi Không thành công rồi gửi lại/mã mới hoặc hoàn/nhập tồn.

Chốt17/11: bill gồm hàng+ship; tiệm trả J&T từng đơn, mặc định PP_CASH.
Owner duyệt spec17/11: VOID nhập sai, bắt mã vận đơn trước bàn giao và mặc định
phụ mục4–7/13 (sáchẨn/Thùng rác, weight trước keep, khóa đổi khách, stats theo
filter, giới hạn, đếm đơn mua bỏ nháp/hủy/không thành công) trở thành contract.
