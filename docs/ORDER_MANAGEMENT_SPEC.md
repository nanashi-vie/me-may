# SPEC — Quản lý đơn hàng nội bộ

Chuẩn hóa 16/11/2026 từ Order Management v1.0 do owner cung cấp.
**Trạng thái:** nghiệp vụ gốc được user cung cấp là đã chốt; các bổ sung kỹ thuật
và quyết định ở mục 15 còn chờ duyệt trước lập plan/triển khai. Chưa có code order.
User bổ sung 16/11: **admin chỉnh giá bán cụ thể từng cuốn khi thêm vào đơn**.
Đây là mở rộng riêng sau catalogue MVP, không đổi wishlist thành giỏ hàng.
Chỉ sau khi duyệt, spec này mới thay giới hạn không có đơn/giữ tồn/thanh toán
trong MASTER_PLAN cho khu admin; public và các gate release hiện hành giữ nguyên.

## 1. Mục tiêu, phạm vi và hướng triển khai

Thay dần Excel theo dõi đơn nội bộ: chọn/tạo khách, đơn giao ngay hoặc keep,
CATALOG/MANUAL, giữ tồn, cọc/thanh toán/hoàn tiền, cân kiện và ghi vận đơn J&T.
Một đơn một lần giao/một kiện. Không public checkout, payment gateway, thông
báo tự động, đồng bộ kho livestream, tự đối soát COD/ngân hàng, hoàn hàng,
giao thất bại, chia kiện hoặc xuất Excel/API J&T trong bản đầu.

Hướng phù hợp code hiện có: Angular standalone, Spring Boot modular monolith,
PostgreSQL/Flyway; module order dùng Spring JDBC và transaction theo customer.
Tái sử dụng auth/session/CSRF, CustomerForm, page/errors/version và audit có
điều chỉnh. Không thêm framework CRM, kho hoặc workflow engine.
Giữ tồn theo từng vật thể sẽ cần đổi mô hình tồn gộp đã duyệt06/11; không chọn
làm mặc định. Gắn order vào tổng tồn của mã MM, giữ nguyên các dòng legacy.

## 2. Đối chiếu code hiện tại

| Hiện trạng xác minh từ source dev/035d7ab | Chuẩn hóa cần có |
|---|---|
| book_copy là mục sách mã MM; book_variant.stock lưu tồn gộp qua nhiều dòng | CATALOG tham chiếu mục sách, không hứa ID từng vật thể |
| BookVariantStore.pooledRows tăng từ đầu/giảm từ cuối, giữ UUID/tên/thứ tự | Giữ thuật toán và giới hạn dòng; reservation cấp book_copy |
| BookCommandService tính availability từ tổng stock | Reservation cần đổi tính khả dụng và bảo vệ mọi đường sửa tồn |
| Listing có price_min_vnd/price_max_vnd; có Flash Sale | Giá đơn do admin chốt từng cuốn, không lấy khoảng/sale làm giá bán tự động |
| customer V32: tên bắt buộc, phone/address optional; ACTIVE/ARCHIVED | Tạo đơn chưa bắt buộc đủ giao hàng; kiểm đủ khi finalize |
| CustomerForm có saved(CustomerDetail), kiểm trùng phone và dirty guard | Tạo nhanh dùng form hiện có, nhận id rồi chọn ngay |
| /api/v1/admin; BIGINT JSON string; page mặc định20/max100 | Thay /api/admin/orders trong bản gốc bằng prefix v1 |
| SecurityConfiguration: OWNER ghi, STAFF GET admin | Không giả định role ADMIN; chốt ma trận quyền order ở mục15 |
| AuditService chỉ giữ field trong allowlist, customer ghi metadata rỗng | Không truyền payload order rồi cho rằng toàn bộ thay đổi đã được lưu |
| Flyway source mới nhất V33__hero_banners.sql; chưa có order/reservation | Lấy số migration kế tiếp còn trống lúc triển khai; không sửa V1–V33 |

Nguồn: [DATA](DATA.md#tồn-gộp-và-tương-thích-biến-thể--quyết-định06112026),
[CUSTOMERS](CUSTOMERS.md), [CATALOGUE](CATALOGUE.md), [ARCHITECTURE](ARCHITECTURE.md).
Các thay đổi trong spec là yêu cầu tương lai, không mô tả chức năng đang chạy.

## 3. Trạng thái và thao tác

| Trạng thái | Hành vi |
|---|---|
| DRAFT — Nháp | Chọn khách, thêm/sửa/xóa item, chưa giữ tồn |
| KEEPING — Đang keep | Giữ tồn, thêm/sửa/xóa item và ghi nhận tiền |
| READY_TO_SHIP — Chờ giao | Đã chốt item, người nhận, kiện/COD/khai giá; còn giữ tồn |
| SHIPPED — Đã gửi | Đã bàn giao, xuất kho đúng một lần, khóa item |
| COMPLETED — Hoàn tất | Xác nhận giao và đối soát; không xuất kho lại |
| CANCELLED — Đã hủy | Trạng thái cuối; giải phóng reservation, giữ lịch sử tiền |

- Giao ngay: DRAFT → READY_TO_SHIP → SHIPPED → COMPLETED.
- Keep: DRAFT → KEEPING → READY_TO_SHIP → SHIPPED → COMPLETED.
- Hủy từ DRAFT/KEEPING/READY_TO_SHIP; không hủy thông thường sau SHIPPED.
- Không EXPIRED; quá hạn là thuộc tính tính từ thời gian, không tự hủy/nhả tồn.
- Không cập nhật status qua PUT/PATCH thường; mỗi chuyển trạng thái có command.
- READY muốn sửa item phải reopen có lý do/audit; đích và hạn keep ở mục15.
- SHIPPED/COMPLETED không sửa item/giá/khai giá/kiện đã chốt; vẫn cần ghi nhận
  tiền thực nhận/hoàn tiền theo quyền, không cho sửa tổng tiền thủ công.

## 4. Danh sách, tạo đơn và khách hàng

Route `/admin/orders`, `/admin/orders/new`, `/admin/orders/:id`.
Tiêu đề Quản lý đơn hàng; nút + Tạo đơn hàng. Bảng mã DH, tên/SĐT khách,
ngày tạo dd/MM/yyyy, tổng quantity, goodsTotal, paidAmount, trạng thái,
hạn keep và thao tác phù hợp trạng thái/quyền. Sắp mới nhất createdAt,id.
Tìm mã đơn/tên/SĐT/mã KH; lọc status, khoảng ngày tạo và keep sắp/đến/quá hạn.
Pagination backend20/max100, page bắt đầu0; đổi q/filter reset page.
Thống kê Đang keep/Sắp hết hạn/Quá hạn/Chờ giao/Đã gửi do backend tính,
không cộng chỉ các dòng trong trang; đề xuất dùng cùng bộ lọc danh sách.

Chọn khách ACTIVE bằng API customer hiện có, tìm cả ba username đã hỗ trợ.
Tạo nhanh mở CustomerForm, giữ logic trùng SĐT và nhận saved để chọn ngay;
không sao chép validation/customer API. Không tải hết khách về browser.
Lưu customer_id ổn định cùng snapshot mã/tên/SĐT khách và người nhận/địa chỉ.
Sửa hồ sơ gốc không đổi đơn cũ; nút lấy lại thông tin phải được xác nhận/audit.
Khách có nhiều KEEPING: hiển thị danh sách mã/hạn để chọn thêm hoặc tạo mới;
không unique constraint một keep/khách. Khách ARCHIVED vẫn có lịch sử và đơn
đang xử lý; không tự hủy đơn khi lưu trữ khách, không chọn cho đơn mới.
Đề xuất khóa đổi customer_id sau khi đơn rời DRAFT hoặc đã có giao dịch tiền.

## 5. Item CATALOG/MANUAL và giá chốt từng cuốn

CATALOG: tìm tên/mã MM qua admin API phân trang, hiển thị bìa, mã, tên,
khoảng giá tham khảo, weightG, tổng tồn/đã giữ/còn khả dụng và publication.
Đề xuất cho chọn sách Ẩn còn tồn; không chọn sách trong Thùng rác. CATALOG
không đồng nghĩa đang public; không publish hay tạo listing mới khi thêm đơn.
Thiếu giá/trọng lượng catalogue không tự điền0: admin bổ sung snapshot.

**Giá user chốt16/11:** admin nhập/chỉnh đơn giá bán cụ thể từng cuốn lúc thêm;
hiển thị khoảng giá/sale để tham khảo, không tự chốt priceMin/priceMax/sale.
Giá cụ thể bắt buộc trước khi lưu dòng, kể cả DRAFT; chưa nhập không thêm dòng.
Giá bán này lưu unitPriceVnd của item; sửa giá sách gốc không đổi dòng đã thêm,
và sửa dòng đơn không cập nhật ngược Listing. Không làm tròn giá theo form sách.
Hai cuốn cùng mã MM giá khác nhau phải là hai dòng riêng quantity1; chỉ dùng
quantity>1 khi cùng giá/trọng lượng snapshot. Không tự gộp dòng theo book_copy_id.
Khi kiểm tồn phải cộng mọi dòng cùng mã MM trong đơn và reservation đơn khác.

MANUAL bắt buộc tên, đơn giá VND, quantity, gram/quyển. Không tạo book_copy,
book_variant/listing, không giữ/trừ tồn website. Các FK catalogue phải NULL.
CATALOG lưu book_copy_id/listing_id khớp nhau, snapshot mã/tên/giá/trọng lượng;
không bắt FK variant hoặc dựng định danh vật thể mới. Ảnh chỉ giúp nhận diện,
không giữ media vĩnh viễn chỉ vì có item; thiếu ảnh có fallback.

DRAFT/KEEPING được thêm/sửa/xóa có xác nhận. KEEPING cập nhật reservation cùng
transaction; không có tình huống item đã lưu nhưng giữ tồn thất bại.
Draft được thiếu weight CATALOG trong lúc bổ sung; đề xuất chỉ giữ/chốt khi
mọi item có giá và weight hợp lệ; constraint weight cho phép NULL ở draft,
khác mâu thuẫn NOT NULL trong logical schema gốc.

## 6. Cảnh báo MANUAL giống danh mục

Debounce300–500ms, backend tìm tối đa5 kết quả cả Ẩn/hết hàng, không chỉ public.
Chuẩn hóa trim/khoảng trắng/chữ hoa-thường/không dấu; đề xuất so khớp chính
xác trước rồi gần giống bằng PostgreSQL, chưa tự cài extension/dependency.
Builder phải mô tả thuật toán/ngưỡng và fixture gần giống trong plan được duyệt.
Không tải toàn bộ catalogue hoặc dùng AI để phân loại trùng.
UI cảnh báo, cho chọn CATALOG hoặc vẫn MANUAL với lý do bản khác/kho livestream/
lý do khác. Không đổi nguồn tự động, không chặn tuyệt đối vì cùng tên nhiều cuốn.
Backend kiểm lại lúc lưu; trả409 `manual_match_confirmation_required` kèm
kết quả mới cần xác nhận. Đề xuất xác nhận gắn normalizedTitle và fingerprint
kết quả (id/version), lưu lý do; đổi tên/kết quả mới làm mất hiệu lực xác nhận.
Không chỉ dùng boolean xác nhận vô điều kiện. Không include sách đã purge;
phạm vi tìm sách Thùng rác chốt ở mục15.

## 7. Tiền, trọng lượng và validation

Backend tính; không tin tổng frontend, không dùng float cho tiền.
- subtotal = SUM(unitPriceVnd × quantity); goodsTotal = subtotal − discountAmount.
- 0 ≤ discountAmount ≤ subtotal; tiền VND nguyên không âm, không cộng cọc vào hàng.
- paidAmount = SUM(DEPOSIT + PAYMENT) − SUM(REFUND) của giao dịch hợp lệ.
- Đề xuất dư tiền hàng = goodsTotal − paidAmount; hiển thị dư âm là cần xử lý
  tiền thừa, không giấu bằng0; số còn thu tham khảo = max(0, dư tiền hàng).
- UNPAID khi paidAmount=0<goodsTotal; PARTIALLY_PAID khi0<paidAmount<goodsTotal;
  PAID khi bằng nhau (kể cả0/0); OVERPAID khi lớn hơn. Refund không vượt tiền nhận.
- itemWeight = unitWeightGrams × quantity; totalBookWeightGrams = SUM(itemWeight).
  Thiếu bất kỳ weight hiển thị “Chưa đủ dữ liệu”, không coi thiếu là0.
- parcelWeightGrams mặc định bằng tổng khi đầy đủ; chưa override thì theo item.
  Đã override thì giữ giá trị, đổi danh sách/quantity/weight đặt needsReview;
  admin xác nhận lại trước finalize. Đổi riêng giá không làm sai trọng lượng.
- Reset về tự tính có xác nhận; snapshot không thay theo weight sách gốc.

Đề xuất giới hạn: tối đa1000dòng/đơn; quantity1..999999/dòng; title≤300;
unitPrice≤999999999999; weight dương≤9007199254740991gram như catalogue.
Mọi tích/tổng tiền/gram phải≤9007199254740991, kiểm overflow trước lưu;
tiền ship/COD/discount/khai giá cũng nguyên trong miền cho phép, không clamp.
Backend dùng số nguyên đủ rộng/checked arithmetic, UI không mất độ chính xác.
Giá0 được bản gốc cho phép; nếu cửa hàng không cho tặng sách cần chốt lại.

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
extensionCount. Không tự gia hạn/cancel/release theo timer. Chính sách trần ở mục15.
Kết thúc keep mở Chốt giao, kiểm lại dữ liệu rồi READY; không nhả reservation.

## 9. Reservation và tích hợp tồn gộp — đề xuất kỹ thuật

S = SUM(book_variant.stock), tổng chưa xuất kho; R = tổng reservation ACTIVE.
availableStock = S − R, bất biến 0≤R≤S. CATALOG reserve theo book_copy_id và
quantity gộp các dòng; không lưu variant allocation vì UI đã bỏ chọn biến thể.
DRAFT chỉ kiểm/thông báo tồn hiện tại, không đảm bảo giữ; phải kiểm lại lúc xác nhận.

| Thao tác | S/R và kết quả |
|---|---|
| DRAFT → KEEPING hoặc READY | Kiểm toàn bộ, R tăng cùng transaction, thiếu một sách rollback tất cả |
| KEEPING thêm/sửa/xóa | Điều chỉnh chênh R, không đổi S |
| KEEPING → READY | Giữ reservation hiện có, không giữ lần hai |
| Cancel trước ship | Reservation RELEASED, R giảm, S không tăng vì chưa trừ |
| READY → SHIPPED | S giảm lượng đã giữ theo pooledRows; reservation CONSUMED, R giảm |
| COMPLETED hoặc retry ship/cancel | Không trừ/nhả tồn thêm |

Khóa order rồi book_copy theo id tăng dần và các dòng/reservation liên quan;
kiểm version và S/R sau khóa. Mọi đường ghi tồn, kể cả BookCommandService và
legacy variants API, phải cùng quy ước khóa/version; không chỉ khóa ở OrderService.
Sửa tồn tay vẫn nhập tổng S, không được giảm dưới R; metadata-only không mang
tổng tồn cũ ghi đè sau ship. Tăng version book khi reservation/tồn thay đổi để
editor cũ nhận409. Không gọi lại command sửa sách buộc ảnh/weight/publish chỉ
để trừ tồn của sáchẨn; dùng thao tác tồn hẹp cùng transaction và audit.

Đề xuất availability AVAILABLE khi S−R>0, ngược lại SOLD (UI “Hết hàng” theo
khả dụng); không thêm trạng thái public Đang giữ. Đây là đổi contract cần duyệt.
Phải đồng bộ admin mapper, public list/detail/lookup/wishlist/Home/collection/
Flash Sale và cache invalidation sau commit; không chỉ đổi một DTO.
Ẩn listing không nhả tồn đơn. Chặn trash khi còn reservation ACTIVE; các FK
order phải bảo vệ lịch sử khỏi hard purge, không CASCADE xóa item/đơn/thanh toán.
Kiểm tra job purge hiện có, không tự thêm cơ chế xóa dữ liệu đơn.

## 10. Giao dịch tiền, retry và hủy đơn

DEPOSIT/PAYMENT/REFUND lưu amount>0, method, occurredAt thực nhận/hoàn,
note, createdBy/createdAt; phương thức đề xuất CASH/BANK_TRANSFER/OTHER.
Không tạo PAYMENT giả cho COD khi SHIPPED/COMPLETED. Khi thực nhận COD,
OWNER ghi PAYMENT thủ công. Không sửa/xóa trực tiếp giao dịch đã xác nhận.
Đề xuất điều chỉnh sai bằng VOID có lý do/actor/time, giữ bản gốc; tổng bỏ
giao dịch VOID, kiểm lại tổng refund không vượt nhận hợp lệ. Cần duyệt mục15.

Mọi mutation order gửi version; khóa order và tăng version một lần/command.
Stale trả409 `version_conflict` + currentVersion, giữ form, không auto retry/merge.
Create/payment/ship/cancel và các mutation khác dùng requestId UUID bền qua
retry: unique scope actor/operation/requestId, fingerprint payload/order/version.
Replay cùng request trả cùng kết quả, không tăng version/tạo tiền/xuất kho lại;
khác payload trả409 `idempotency_conflict`; kiểm auth hiện tại trước replay.
Receipt cùng transaction với item/reservation/payment/audit; lỗi rollback hết.
Không coi disable nút hoặc optimistic locking đủ ngăn payment lặp.

Cancel lưu lý do, actor/time và giải phóng toàn bộ tồn một lần. Tiền đã nhận
vẫn còn trong sổ, không tự REFUND/VOID hoặc coi hoàn xong. Đề xuất đơn đã hủy
có cờ/chỉ báo số tiền cần hoàn, chỉ cho REFUND/điều chỉnh hợp lệ sau hủy;
không nhận tiền mới. Quy tắc giữ cọc/hoàn hết và complete ở mục15.

## 11. Chốt giao, J&T và snapshot

Người nhận mặc định từ customer, sửa riêng cho đơn. Validate tên≤150 không
trắng, SĐT theo CustomerValidation hiện hành (+84→0), địa chỉ≤500 không trắng.
Không ghi đè hồ sơ customer khi sửa địa chỉ giao. Không bắt có SĐT lúc DRAFT.

Finalize: ≥1item, giá/quantity/weight hợp lệ, đủ reservation (DRAFT tạo mới,
KEEPING tái dùng), parcelWeight>0 hết needsReview, đủ người nhận và shipping.
Backend tính/chốt declaredValue=goodsTotal; không gồm phí ship, không trừ cọc.
Ví dụ hàng650.000−giảm50.000, ship35.000, cọc100.000 → khai giá600.000đ.
Không cho frontend tự ghi declaredValue hoặc paidAmount.

Cấu hình theo bản user cung cấp: J&T Express, EXPRESS, sản phẩm Sách,
HÀNG HÓA, không gửi tại bưu cục, parcelCount1, không dùng dài/rộng/cao.
shippingPaymentType: CC_CASH mặc định (người nhận), PP_CASH (người gửi),
PP_PM (cuối tháng); tách khỏi phương thức thanh toán tiền hàng.
shippingFee nullable khi chưa biết; COD nguyên≥0 mặc định0, admin nhập/xác nhận.
Đổi hàng/giảm giá/tiền nhận hoặc hoàn làm thay số dư → COD needsReview;
không tự sửa COD. Finalize phải xác nhận COD theo version đang đọc.
Sau READY có giao dịch làm đổi số dư: đề xuất chặn ship đến khi review COD
qua command shipping; không tự reopen/chỉnh declaredValue vì nhận thêm cọc.
Phí ship khách phải trả tiệm và xử lý thay đổi phí sau ship ở mục15.

READY nhập trackingCode và xác nhận bàn giao → SHIPPED, lưu actor/time,
consume reservation cùng transaction. Bản gốc cho nhập vận đơn khi có;
đề xuất không bắt trackingCode khi ship, cho bổ sung sau bằng command audit.
COMPLETED yêu cầu xác nhận giao và đối soát; điều kiện tiền cần chốt ở mục15.

Sau MVP mới xuất .xlsx theo file mẫu J&T gốc: STT, người nhận/SĐT/địa chỉ,
mã đơn, EXPRESS, không gửi bưu cục, paymentType, Sách/HÀNG HÓA, gram/1000
thành số Excel kg, ba kích thước trống, số kiện1, COD và declaredValue;
giao một phần trống. Có lịch sử lô/cảnh báo xuất trùng; xuất không đổi SHIPPED.
Chưa có file mẫu gốc trong phiên này: không khẳng định mapping/mã dịch vụ
hoặc kích thước trống đã được J&T chấp nhận; kiểm template thật khi làm export.

## 12. Schema logic cần bổ sung

| Bảng mới (đề xuất) | Trường/constraint chính |
|---|---|
| orders | BIGINT id; order_code UNIQUE DH-000001 theo identity/sequence, không MAX+1; customer_id FK; customer_code/name/phone_snapshot; status/fulfillment_type CHECK; version≥0; actor/time |
| orders — keep | keep_started_at/keep_until TIMESTAMPTZ; keep_extension_count; required_deposit_vnd; deposit_override_reason/actor/time; không unique keep/customer |
| orders — giao | recipient_name/phone/shipping_address; shipping_provider/service/payment_type; shipping_fee nullable; parcel_weight_grams/overridden/needs_review; parcel_count=1; cod_amount/cod_needs_review; declared_value; tracking_code; shipped/completed/cancelled actor/time; cancellation_reason |
| order_items | id/order_id; source_type; book_copy_id/listing_id nullable theo source; book_code/title_snapshot; unit_price_vnd NOT NULL≥0; quantity>0; unit_weight_grams nullable khi draft; manual_match_override_reason/evidence; created_by/added_at; không unique(order,book) |
| order_reservation | id/order_id/book_copy_id; quantity>0; state ACTIVE/RELEASED/CONSUMED; timestamps; UNIQUE(order_id,book_copy_id), điều chỉnh row theo tổng item |
| order_payments | id/order_id; transaction_type; amount>0; payment_method; occurred_at/note; actor/time; void metadata nếu duyệt |
| order_mutation_receipt | request_id/actor/operation/order_id/fingerprint/kết quả tối thiểu; unique scope; không log raw payload hoặc trả dữ liệu trước auth |

orders có discount_amount≥0; tổng hàng/weight/paid/paymentStatus tính backend,
không phải field client được sửa. Finalize lưu snapshot declaredValue/parcel.
Keep extension và thay đổi giá/quantity/weight/shipping cần audit đủ before/after
có cấu trúc; không chỉ đếm extensionCount. R≤S kiểm dưới khóa trong transaction,
không mô tả CHECK liên bảng như constraint SQL có sẵn. Index theo status/created,
customer/created, keepUntil và reservation book/state; tiền/order và audit target.
FK không hard delete lịch sử; migration additive thử trên bản sao schema cũ.

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
| PATCH /{id}/items/{itemId} | quantity/giá/weight cho phép + version/requestId |
| DELETE /{id}/items/{itemId} | Expected version/requestId qua query/header đã quy định trong plan; UI confirm |
| POST /{id}/payments, /payments/{paymentId}/void | Ghi nhận tiền/điều chỉnh nếu duyệt; version/requestId/lý do |
| POST /{id}/keep, /extend-keep | Kiểm cọc/reserve hoặc gia hạn có lý do |
| POST /{id}/finalize, /reopen | Chốt giao hoặc mở sửa có audit, không PATCH status |
| PATCH /{id}/shipping | Field whitelist theo trạng thái, review COD/kiện hoặc bổ sung tracking |
| POST /{id}/ship, /complete, /cancel | Command trạng thái, version/requestId và xác nhận/lý do cần thiết |

Customer search/create dùng `/api/v1/admin/customers`, không nhân đôi endpoint.
Order customer history dùng list với customerId; thay placeholder/tổng đơn ở
customer bằng query phân trang/tổng aggregate, tránh N+1 và chưa tự định nghĩa
“Tổng số đơn” gồm CANCELLED/DRAFT khi user chưa chốt (mục15).
400 validation/query;401 anonymous;403 quyền/CSRF;404 không tồn tại/khác order;
409 version/transition/stock/manual-match/idempotency; lỗi `{error,fieldErrors?,
currentVersion?}` theo convention, không lộ SQL/stack. Item/payment id phải thuộc đơn.

Đề xuất OWNER mọi ghi/ngoại lệ, STAFF chỉ đọc/tìm như customer; không tạo role
ADMIN hay hệ permission riêng. Quyền mới phải bảo vệ ở API/service, không chỉ UI.
Audit actor server, order/version/requestId/action, item/payment refs và số tiền/
giá/weight/trạng thái/hạn cũ-mới; thay địa chỉ chỉ ghi field changed, không copy PII.
Cần mở rộng audit có scope hoặc writer hẹp; allowlist hiện tại bỏ mất field order.
Lý do/ghi chú có thể chứa PII: giữ riêng trong dữ liệu admin có quyền, audit chỉ ref.
Audit fail rollback; invalidate public cache khi tồn khả dụng đổi sau commit.
Session/cookie/CSRF/no-store hiện hành; SQL parameterized/sort allowlist,
text thuần không innerHTML. Không PII trong log/analytics/public SSR/TransferState/cache.

## 14. UI, nghiệm thu và rollout

Admin desktop-first theo form/table/custom dropdown hiện có; g/tab/mobile không
tràn khung. Loading/error/empty, keyboard/focus, dirty guard và double-submit.
Giữ form khi lỗi; stale response không đè mới. Xác nhận xóa/hủy/ship/ngoại lệ,
không tải hết sách/khách. Hiển thị giá bán cụ thể/quantity/gram rõ từng dòng.

AC gốc01–20 được giữ qua nhóm kiểm tra sau và bổ sung các case tích hợp:
- 01–04: chọn/tạo khách, CATALOG/MANUAL, duplicate confirm FE/BE; hai dòng
  cùng mã khác giá giữ độc lập; giá catalogue sửa sau không đổi giá đơn.
- 05–07: tổng gram đúng, thiếu weight không thành0, override không bị đè,
  sửa quantity/weight buộc review; giá riêng không gây review cân sai.
- 08–09: keep qua ranh ngày/tháng, hạn+14ngày lịch, thêm sách không gia hạn,
  thiếu cọc chỉ OWNER ngoại lệ có lý do; quá hạn không tự nhả tồn.
- 10/14/15: nhiều lần cọc/payment/refund, discount/overpaid/0đ, COD review,
  khai giá không trừ cọc/ship; retry/time-out không ghi tiền hai lần.
- 11/12: hai đơn giành tồn1 chỉ một thành công; nhiều dòng cùng MM cộng đủ;
  hủy/retry/ship/retry/complete không trừ/nhả lặp; hủy còn tiền chưa coi đã hoàn.
- 13/16/17: finalize DRAFT reserve đủ hoặc rollback tất cả, người nhận/kiện/
  COD hợp lệ; J&T defaults đúng cấu hình nội bộ; snapshot không đổi theo gốc.
- 18/19: version409, command replay/different payload, OWNER/STAFF/anonymous,
  CSRF, cross-order id, audit rollback, no PII public/cache/log.
- 20: race edit stock↔reserve/ship, metadata editor cũ, trash/purge có FK,
  giữ legacy variant UUID/tên/thứ tự; public/Home/sale/wishlist/SEO/cache nhất quán.

DoD: PostgreSQL integration thật cho transaction/concurrency/migration/RBAC,
frontend test tính tiền/weight/review/errors/permissions; build SSR/Workers;
browser OWNER/STAFF tạo nhanh/dirty/keep/cancel/ship/retry và hồi quy sách/khách.
Dùng dữ liệu synthetic, không test mutation trên khách/đơn thật. Ghi bằng chứng
vào VERIFICATION/DEV_LOG, snapshot PROGRESS; chưa chạy các kiểm tra runtime này.
Trước rollout xác minh Flyway thực tế, backup DB/media/offhost và restore,
schema additive/backend trước FE tương thích; không đánh đồng local với live.
Rollback không drop đơn/receipt/payment hoặc xóa giao dịch phát sinh; user merge
main/deploy theo workflow. Chưa lập implementation plan, không tự migrate live.

## 15. Các quyết định đề xuất cần owner chốt trước triển khai

1. **Tồn khả dụng:** giữ S trong stock đến ship, reserve riêng R, public dựa S−R;
   hết khả dụng hiển thị Hết hàng. Cho CATALOG sáchẨn, chặn Thùng rác; match
   MANUAL mặc định không tìm Thùng rác. Mọi editor phải tuân thủ reserve.
2. **Quyền:** OWNER ghi, STAFF đọc toàn bộ đơn/PII như customer; chưa cấp STAFF
   thao tác nghiệp vụ riêng. Nếu cần STAFF lên đơn phải chỉ rõ hành động được làm.
3. **Tiền ship:** đề xuất paid/paymentStatus chỉ so với goodsTotal; shippingFee là
   thông tin vận chuyển, chưa tính khoản khách nợ tiệm. Nếu tiệm thu phí ship
   cùng tiền hàng cần thêm charge riêng trước khi triển khai, không suy từ PP/CC.
4. **Hủy/điều chỉnh/hoàn tất:** đề xuất hoàn hết tiền thực nhận khi hủy, cờ chờ
   hoàn cho đến khi ghi REFUND thực tế; không tự giữ cọc. VOID có lý do sửa sai;
   COMPLETED chỉ khi xác nhận giao/đối soát và paidAmount=goodsTotal. Giữ cọc,
   công nợ hoặc tiền ship thu hộ cần chính sách khác rõ ràng.
5. **Reopen/gia hạn:** đề xuất KEEP quay KEEPING giữ hạn ban đầu, IMMEDIATE về
   DRAFT và nhả reservation; cảnh báo trước khi nhả. Gia hạn có lý do, chưa
   đặt trần mới thay vì tự hiểu “tối đa14ngày” cho mọi lần gia hạn.
6. **Các mặc định còn lại:** giới hạn mục7, catalog thiếu weight phải bổ sung
   trước keep, khóa đổi khách sau có tiền/rời DRAFT, cho ship chưa có tracking
   rồi bổ sung, stats theo filter, tổng số đơn khách đếm mọi trạng thái hay bỏ
   nháp/hủy. Đề xuất bỏ DRAFT/CANCELLED khỏi số đơn mua; lịch sử vẫn hiển thị đủ.

Giá bán cụ thể do admin chốt từng cuốn đã được user xác nhận16/11, không còn là
câu hỏi chọn min/max/sale. Các đề xuất trên chưa được coi là nghiệp vụ đã duyệt.
