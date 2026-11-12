# SPEC — Quản lý khách hàng

Ngày12/11/2026 · Customer Management MVP · Backend + Frontend + Database.
**Trạng thái: thiết kế chờ duyệt**, chưa là bằng chứng triển khai.
Nguồn: spec owner cung cấp trong chat và các quyết định bổ sung12/11.

## 1. Mục tiêu và nguồn quyết định

Quản lý hồ sơ người mua thủ công trong admin, làm nền cho Order Management
sau này. Khách không cần tài khoản website, OTP, SĐT hay địa chỉ để được tạo.
Không tự gộp khách hoặc liên kết tài khoản đăng nhập vì cùng SĐT.

Yêu cầu mới mở phạm vi quản lý khách hàng ngoài giai đoạn tối ưu UI tại
[MASTER_PLAN](MASTER_PLAN.md); không mở phạm vi đơn hàng của kế hoạch đó.
Stack giữ Angular + Spring Boot modular monolith + Spring JDBC/PostgreSQL.
Quy ước hiện hành theo [ARCHITECTURE](ARCHITECTURE.md) và
[CATALOGUE](CATALOGUE.md); không thay contract sách/auth.

### Quyết định owner đã chốt

- Mỗi nền tảng một field riêng: `zalo_name`, `tiktok_id`, `threads_id`.
- Cả ba chỉ lưu username/tên nhận diện do admin nhập, không lưu đường dẫn.
- Nhãn UI Zalo chính xác là **Tên Zalo**, không dùng “Username Zalo”.
- OWNER được ghi; STAFF chỉ xem danh sách, chi tiết và tìm kiếm.

### Các hướng đã cân nhắc

| Hướng | Đánh đổi | Kết luận |
|---|---|---|
| Field riêng trong customer | Gọn, dễ form/tìm kiếm; một username mỗi nền tảng | Owner chọn |
| Bảng tài khoản mạng xã hội riêng | Nhiều tài khoản/nền tảng nhưng tăng bảng và luồng quản lý | Không chọn cho MVP |

### Chi tiết kỹ thuật agent đề xuất trong bản chờ duyệt

Dùng prefix API `/api/v1/admin`, ID JSON dạng chuỗi, version chống ghi đè,
chuẩn SĐT nội địa, giữ nguyên dấu `@` và cách viết username do admin nhập.
Các chi tiết này là đề xuất của agent, không ghi thành quyết định owner.
Không làm giao diện lịch sử thay đổi từng field; audit tối thiểu chỉ ghi
actor/thao tác/customerId/version/thời điểm, không sao chép PII vào audit.

## 2. Phạm vi và quyền

| ID | Chức năng bắt buộc |
|---|---|
| CUS-01 | Danh sách khách hàng |
| CUS-02 | Thêm khách thủ công |
| CUS-03 | Chi tiết hồ sơ |
| CUS-04 | Chỉnh sửa hồ sơ |
| CUS-05 | Tìm theo mã/tên/SĐT/Zalo/TikTok/Threads |
| CUS-06 | Cảnh báo và xác nhận trùng SĐT |
| CUS-07 | Lưu trữ và khôi phục |
| CUS-08 | Phân trang/lọc ở backend |

| Thao tác | OWNER | STAFF |
|---|---|---|
| Danh sách/chi tiết/tìm kiếm/tra trùng | Có | Có |
| Tạo/sửa/lưu trữ/khôi phục | Có | Không; API403 |

Khách chưa đăng nhập không đọc được bất kỳ API khách hàng nào (401).
Không chỉ ẩn nút: backend bảo vệ toàn bộ route, kể cả duplicates.
STAFF xem được các field hồ sơ, gồm ghi chú nội bộ, trong khu admin.

Ngoài phạm vi: đơn hàng, checkout, thanh toán, vận chuyển, giữ chỗ, doanh thu,
lịch sử mua thực tế, VIP/tích điểm, nhập/xuất Excel, nhiều địa chỉ mỗi khách,
đồng bộ tài khoản website/danh bạ hoặc nền tảng xã hội, SMS/OTP.
Không xóa cứng khách qua giao diện hoặc cung cấp API DELETE trong module.

## 3. Dữ liệu

### Bảng customer

| Cột DB | API | Kiểu/giới hạn/quy tắc |
|---|---|---|
| id | id | BIGINT generated PK; JSON string |
| customer_code | customerCode | VARCHAR(20), UNIQUE NOT NULL; backend sinh |
| full_name | fullName | VARCHAR(150), NOT NULL, trim xong không rỗng |
| phone | phone | VARCHAR(20), NULL; dạng chuẩn hóa |
| default_address | defaultAddress | TEXT, NULL; tối đa500 ký tự |
| zalo_name | zaloName | VARCHAR(150), NULL; username/tên nhận diện |
| tiktok_id | tiktokId | VARCHAR(100), NULL; username |
| threads_id | threadsId | VARCHAR(100), NULL; username |
| note | note | TEXT, NULL; tối đa1000 ký tự |
| status | status | VARCHAR(20), NOT NULL DEFAULT ACTIVE; CHECK enum |
| version | version | BIGINT NOT NULL DEFAULT0; không âm |
| created_by | createdBy | BIGINT FK admin_user; lấy từ principal, không từ client |
| created_at | createdAt | TIMESTAMPTZ NOT NULL, server quản lý |
| updated_at | updatedAt | TIMESTAMPTZ NOT NULL, server quản lý |

Chỉ có ACTIVE/ARCHIVED. created_by có thể NULL để tương thích dữ liệu quản trị
được nạp về sau; tạo qua API hiện tại luôn ghi actor hợp lệ.
Không có email bắt buộc. Không UNIQUE SĐT/username; không tự suy ra cùng người.
Không cascade xóa khách khi tài khoản admin bị thay đổi/xóa.

Sinh mã `KH-000001` từ sequence/identity an toàn đồng thời, không MAX+1;
phần số tối thiểu6 chữ số, được tăng độ dài khi lớn hơn999999, không tái dùng.
Không cam kết mã liên tục khi transaction rollback.

Index: UNIQUE customer_code đã tạo index; phone không unique;
`(status, created_at DESC, id DESC)` và `(created_at DESC, id DESC)` cho list.
Tìm chuỗi bằng PostgreSQL đơn giản trước; không thêm pg_trgm/full-text hoặc
index username không có bằng chứng cần thiết. Builder được chọn SQL/index
tối ưu theo query thật mà vẫn giữ hành vi đặc tả.

Timestamp lưu UTC, UI giờ Việt Nam; ngày danh sách dd/MM/yyyy.
Migration Flyway thêm bảng/sequence/index, không sửa dữ liệu sách/auth/media.
Số migration kế tiếp phải xác minh khi triển khai, không cố định từ checkpoint.

## 4. Chuẩn hóa và validation

Backend là nguồn xác thực cuối cùng; frontend áp dụng cùng quy tắc.
Trim đầu/cuối mọi văn bản; optional rỗng thành NULL; không cắt dữ liệu quá dài.
Tên chỉ khoảng trắng hoặc vượt150 ký tự trả400 tại field.
Địa chỉ/note/ba username đều tùy chọn, giới hạn theo bảng dữ liệu.

Tên Zalo/TikTok ID/Threads ID là text thuần, cho phép có hoặc không có `@`;
giữ nguyên chữ hoa/thường và dấu `@` khi lưu. Không tự xây link, không gọi
nền tảng để kiểm username, không ép Zalo dùng regex handle của TikTok.
Từ chối giá trị dạng URL (`http://`, `https://`, `www.` hoặc tên miền/link
trang cá nhân của Zalo/TikTok/Threads); báo “Chỉ nhập tên tài khoản, không nhập
đường dẫn”. Builder chọn bộ kiểm tra nhất quán FE/BE, không cấm tên có dấu/chấm.

SĐT tùy chọn, chỉ hỗ trợ di động Việt Nam trong MVP: nhận10 chữ số bắt đầu
03/05/07/08/09 hoặc dạng +84 thay số0 đầu. Loại khoảng trắng, dấu chấm,
dấu gạch ngang trong đầu vào; từ chối chữ, ký tự khác, số sai độ dài/đầu số.
Lưu dạng `0xxxxxxxxx`; +84 và dạng nội địa tương đương khi tìm/so trùng.
Không OTP, không xác minh số có người sử dụng thực tế, không dùng UNIQUE phone.

## 5. Danh sách và tìm kiếm

Route `/admin/customers`; mục **Khách hàng** trong sidebar cho OWNER/STAFF.
Tiêu đề **Khách hàng**, nút OWNER **+ Thêm khách mới**.
Toolbar: một ô tìm kiếm; trạng thái Đang hoạt động/Đã lưu trữ/Tất cả,
mặc định ACTIVE. Bảng: Mã KH, Tên khách hàng, Số điện thoại, Địa chỉ mặc định
rút gọn (có thể xem đầy đủ bằng focus/chạm), Ngày tạo, Thao tác.
OWNER có Xem/Sửa/Lưu trữ hoặc Khôi phục theo trạng thái; STAFF chỉ Xem.

Tìm chuỗi con trên mã/tên/SĐT/ba username; không phân biệt hoa/thường,
trim và gom khoảng trắng thừa ở truy vấn. Không hứa tìm không dấu.
Nhánh tìm phone chuẩn hóa khi query là số phù hợp; cho phép tìm một phần số.
Username tìm với/không có một dấu `@` đầu cho cùng kết quả, không đổi giá trị lưu.
Escape wildcard SQL `%`/`_` để tìm ký tự literal; dùng bind parameters.
Không tìm trong địa chỉ/note. Debounce khoảng300ms; response cũ không đè query mới.

Backend lọc/phân trang; không tải toàn bộ hồ sơ về frontend.
page bắt đầu0, size mặc định20, hợp lệ1–100; sort cố định
`created_at DESC, id DESC`. page âm/size sai/status sai trả400.
Đổi q/status về page0; query params lưu q/status/page/size để quay về/refresh
giữ trạng thái. Trang ngoài phạm vi trả items rỗng với total đúng; UI cho về trang hợp lệ.

Empty: “Chưa có khách hàng nào. Nhấn \"Thêm khách mới\" để bắt đầu.”
STAFF dùng “Chưa có khách hàng nào.” vì không có quyền tạo.
Không có kết quả lọc/tìm: “Không tìm thấy khách hàng phù hợp.”

## 6. Form thêm/sửa và chi tiết

Thêm/sửa dùng chung modal, không route riêng; form nhận dữ liệu và trả hồ sơ
đã lưu cho caller, để tái sử dụng về sau mà không phụ thuộc trang danh sách.
Giữ thiết kế admin hiện tại, desktop-first, responsive; không thêm UI library.

| Nhóm | Nhãn theo thứ tự | Bắt buộc |
|---|---|---|
| Chính | Tên khách hàng; Số điện thoại; Địa chỉ nhận hàng | Chỉ Tên khách hàng |
| Bổ sung | Tên Zalo; TikTok ID; Threads ID; Ghi chú nội bộ | Không |

Footer **Hủy** / **Lưu khách hàng** (sửa: **Lưu thay đổi**).
Loading khi lấy hồ sơ/gửi; khóa submit đồng bộ ngay khi gửi để double-click,
Enter hoặc nhiều sự kiện submit không tạo hai request. Không tự retry POST
khi mất response; báo kết quả chưa xác định và hướng dẫn kiểm tra danh sách.
MVP không cam kết deduplicate hai request tạo độc lập/replay thủ công.
API lỗi giữ nguyên form, lỗi validation cạnh field và lỗi chung rõ ràng.

Tạo thành công: backend sinh mã, đóng modal, toast “Đã thêm khách hàng thành công”,
về ACTIVE/page0/q rỗng/sort mặc định để thấy khách mới; không reset khi lỗi.
Sửa: điền sẵn, toast và cập nhật snapshot/version mới, giữ trạng thái list.
Chỉ sửa bảy field nghiệp vụ; không sửa ID/mã/ngày/người tạo hoặc status qua PUT.
Hồ sơ archived vẫn xem/sửa được bởi OWNER; khôi phục là hành động riêng.

Đóng modal/Hủy/Escape hoặc rời trang khi dirty hỏi:
“Bạn có thay đổi chưa được lưu. Bạn có chắc muốn thoát?”
Modal có tên truy cập, label/error liên kết, focus trap/return focus,
thao tác keyboard, vùng thông báo và loading phù hợp screen reader.

Route chi tiết `/admin/customers/:id`: mã, tên, SĐT, địa chỉ, Tên Zalo,
TikTok ID, Threads ID, ghi chú, trạng thái, thời gian tạo/cập nhật.
OWNER có Chỉnh sửa/Lưu trữ/Khôi phục; mọi người có Quay về danh sách.
Phần lịch sử đơn chỉ hiển thị “Khách hàng chưa có đơn hàng.”; không tạo bảng,
query đơn hoặc nút Tạo đơn có thể dùng. 404 có thông báo và đường về danh sách.

## 7. Trùng SĐT, lưu trữ và cập nhật đồng thời

Tra trùng cả ACTIVE/ARCHIVED, bỏ qua chính id khi sửa; UI hiện trạng thái
và link hồ sơ. Nhiều kết quả phải xem được danh sách, không lấy duy nhất một.
GET duplicates hỗ trợ phân trang20/max100 nếu số trùng lớn.
Ví dụ cảnh báo: “Số điện thoại này đã được sử dụng bởi khách hàng
Nguyễn Thị Lan (KH-000001).” Có **Xem khách hàng hiện có** và
**Vẫn tạo khách mới** (sửa: **Vẫn lưu thay đổi**).

Kiểm khi nhập và kiểm lại trong transaction lúc lưu. Trùng trả409
`CUSTOMER_PHONE_DUPLICATE`, kèm page hồ sơ trùng và totalElements.
Xác nhận gửi `confirmDuplicatePhone=true` và `confirmedPhone` dạng chuẩn hóa.
Backend chỉ chấp nhận khi confirmedPhone bằng phone chuẩn hóa đang lưu;
không khớp trả400. Đổi số phải xóa xác nhận, kiểm lại ở FE/BE.
Sửa chỉ kiểm trùng khi số chuẩn hóa thay đổi; số giữ nguyên không cảnh báo
lại; phone NULL không tra trùng. Không gộp hồ sơ, không chặn trùng tuyệt đối.
Hai create đồng thời có thể cùng lưu một số nếu cùng chưa thấy hồ sơ kia;
đây là hành vi được phép vì phone không unique; customer_code vẫn duy nhất.

Lưu trữ hỏi: “Bạn có chắc muốn lưu trữ khách hàng này? Thông tin khách hàng
sẽ được giữ lại nhưng không còn xuất hiện trong danh sách đang hoạt động.”
Xác nhận đổi ARCHIVED, giữ mã/dữ liệu. Khôi phục đổi ACTIVE; cập nhật UI/filter.
Không hard delete, không tái dùng mã. Không mất khách khỏi danh sách ALL.

PUT/PATCH gửi expected `version`; UPDATE có điều kiện và tăng version một lần
cùng updated_at trong transaction. Cũ trả409 `version_conflict` và currentVersion;
giữ form, mời tải hồ sơ mới, không tự retry/merge hoặc ghi đè âm thầm.
No-op vẫn kiểm quyền/version nhưng không tăng version hoặc tạo audit.
CREATE/UPDATE/ARCHIVE/RESTORE ghi audit metadata tối thiểu cùng transaction;
lỗi audit rollback. Actor/time/version do server lấy, không nhận giả từ client.

## 8. API và tích hợp

Base `/api/v1/admin/customers`; session/cookie/CSRF hiện hành, API no-store.

| Method | Path tương đối | Quyền và kết quả |
|---|---|---|
| GET | rỗng | OWNER/STAFF; q,status,page,size; Page<CustomerSummary> |
| POST | rỗng | OWNER; CustomerWrite + xác nhận trùng; 201 CustomerDetail |
| GET | /duplicates | OWNER/STAFF; phone,excludeId?,page,size; Page<DuplicateSummary> |
| GET | /{id} | OWNER/STAFF; CustomerDetail |
| PUT | /{id} | OWNER; CustomerWrite + version + xác nhận trùng; 200 detail |
| PATCH | /{id}/status | OWNER; {status,version}; 200 detail |

CustomerWrite chỉ fullName/phone/defaultAddress/zaloName/tiktokId/threadsId/note.
Ví dụ username: zaloName="Lan Nguyễn", tiktokId="@lanbooks", threadsId="@lanbooks".
Create bỏ optional coi NULL; PUT thay đủ field, optional bỏ/rỗng thành NULL.
Detail gồm id/customerCode, bảy field, status/version/createdBy/createdAt/updatedAt.
Summary chỉ id/customerCode/fullName/phone/defaultAddress/status/version/createdAt.
DuplicateSummary chỉ id/customerCode/fullName/phone/status.
Page = {items,page,size,totalElements,totalPages}; BIGINT ID JSON string.

400 validation/query sai; 401 chưa login; 403 STAFF ghi hoặc CSRF sai;
404 không có id; 409 trùng cần xác nhận/version cũ; 500 lỗi server đã lược bỏ.
Giữ convention lỗi `{error}` và field errors theo backend hiện hành; code trùng
được phân biệt với version_conflict. Không trả SQL/stack trace hoặc secrets.

Module backend customer độc lập nghiệp vụ sách; frontend customer service,
list/detail/form theo thư mục component external template hiện có. Tái sử dụng
auth/CSRF/error/page/audit khi phù hợp; builder chọn tên/lớp/cấu trúc nhỏ nhất.
Không dựng generic CRM/social-account framework hoặc thêm dependency mặc định.

## 9. Bảo mật, dữ liệu cá nhân và quan hệ tương lai

Không endpoint public/customer login; mã dễ đoán không thay kiểm quyền.
Không đưa PII vào log ứng dụng/console/analytics/URL frontend, chỉ q trong
query params khi admin tìm kiếm theo yêu cầu giữ bộ lọc. Cấu hình request log
không ghi query phone/q/body; không lưu hồ sơ vào public cache/TransferState.
Text thuần cho mọi field, không innerHTML; SQL parameterized, sort allowlist.
Audit metadata không chứa phone/địa chỉ/note/username hoặc toàn bộ payload.
Không dùng dữ liệu khách thật trong fixture/screenshot/log kiểm thử.

Tương lai: order tham chiếu customer.id ổn định, không tên/SĐT; chỉ ACTIVE
được chọn mặc định khi tạo mới, ARCHIVED vẫn giữ lịch sử cũ. Form tạo trả id
và hồ sơ để caller chọn ngay. Tìm khách sau này gồm mã/tên/SĐT/ba username.
Order lưu snapshot tên/SĐT/địa chỉ giao hàng, không đọc field hiện tại để tái
dựng lịch sử. Lượt chốt/đặt cọc/thanh toán/kiện giao là phạm vi spec order sau.

## 10. Acceptance và Definition of Done

| AC | Tình huống và kết quả bắt buộc |
|---|---|
| 01 | OWNER nhập tên hợp lệ → tạo201, mã KH duy nhất |
| 02 | Chỉ nhập tên → vẫn tạo; optional NULL |
| 03 | Tên trắng/quá dài/SĐT sai/optional quá dài →400, lỗi đúng field, không ghi |
| 04 | Trùng SĐT → thấy đủ hồ sơ, xem hoặc xác nhận; đổi số hủy xác nhận |
| 05 | Tìm mã/tên/SĐT/Zalo/TikTok/Threads → đúng kết quả, paging/filter backend |
| 06 | Sửa địa chỉ/username → lưu mới, giữ ID/mã/createdBy/createdAt |
| 07 | ACTIVE xác nhận lưu trữ → ARCHIVED, giữ dữ liệu, ẩn ở ACTIVE |
| 08 | Khôi phục ARCHIVED → ACTIVE, giữ nguyên mã |
| 09 | STAFF đọc/tìm được; POST/PUT/PATCH403 kể cả gọi API trực tiếp |
| 10 | ID ổn định phục vụ FK tương lai; không tạo bảng/order query/logic ngoài scope |
| 11 | Create song song → customer_code không trùng, không MAX+1 |
| 12 | Anonymous API401/URL không lộ hồ sơ; public HTML/API/cache không chứa PII |
| 13 | Ba username tùy chọn, trim/NULL/giới hạn đúng; URL bị từ chối, text không thành link |
| 14 | UI ghi đúng Tên Zalo/TikTok ID/Threads ID; username tìm có/không @ đều được |
| 15 | +84 và0 tương đương; trùng kể cả archived; sửa loại chính mình, giữ số không cảnh báo |
| 16 | Lỗi API giữ form; dirty có xác nhận; double-submit chỉ phát một request |
| 17 | Hai update/status cùng version → một thành công, còn lại409; không ghi đè |
| 18 | CSRF sai403, XSS hiển thị text, SQL query an toàn; audit lỗi rollback |
| 19 | Back/refresh giữ filter/page; q/status đổi reset page; response cũ không đè mới |

DoD: migration chạy trên DB test với dữ liệu sách/auth hiện có được bảo toàn;
backend integration test dùng PostgreSQL thật cho quyền/CSRF/duplicate/transaction/
concurrency; frontend test form/search/permission/errors; build frontend phù hợp
repo; browser QA OWNER/STAFF, desktop/mobile layout, keyboard/modal/dirty flow.
Kiểm hồi quy Book Management/Listing/Auth, không tạo/sửa khách thật ngoài yêu cầu.
Ghi lệnh/kết quả/giới hạn vào VERIFICATION/DEV_LOG, cập nhật PROGRESS.
Backup/rollout migration theo quy trình hiện hành; không tự deploy/migrate live.
Sau hoàn tất mới hợp nhất contract/bằng chứng vào tài liệu chuẩn và gỡ spec/plan
đã hết vai trò theo README. Bản thiết kế này cần owner duyệt trước writing-plans.
