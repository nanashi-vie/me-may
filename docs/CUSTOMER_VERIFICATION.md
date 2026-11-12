# Kiểm chứng quản lý khách hàng

Ngày12/11/2026 · local QA · chưa migrate/deploy online.
Contract hiện hành ở [CUSTOMERS](CUSTOMERS.md); snapshot/gate tại
[PROGRESS](PROGRESS.md). Chưa dùng các kết quả này thay nghiệm thu production.

## Môi trường và lệnh

- PostgreSQL17 container `memay-customer-test`, chỉ bind localhost55436,
  database `me_may_test`, độc lập container/DB đang dùng.
- Backend QA8426, Angular dev4426 proxy tới8426; tài khoản/khách giả.
- Backend từ `code/backend`: `mvn -q test`, với TEST_DB_URL/DB_USER/DB_PASSWORD
  riêng QA. **310tests,0failure,0error,3skip**; cả12test customer chạy thật.
  Skip cũ: CloudinaryLiveTest, CloudinaryVariantLiveTest, MediaLiveTest, chưa
  có credential/provider thật trong task này.
- Frontend từ `code/frontend`: `npm test` **316/316** trên56file.
- `npm run build`, `npm run build:workers`, `npm run check:workers:proxy`
  đạt; proxy gồm POST/query/cookie/CSRF/multipart/Set-Cookie/server-time/no-store/
  context/backend-down. Build không warning tại lượt đã đọc.
- Baseline trước implementation: frontend296đạt, backend không customer exit0.
  Các lượt socket/build/npm DNS bị sandbox chặn đã rerun ngoài sandbox đạt;
  không đổi dependency, không dùng connection string của môi trường thật.

## Test tự động theo hành vi

| Phạm vi | Bằng chứng |
|---|---|
| AC01–03,13–14 | CustomerValidationTest3 + customer-validation.spec3: trim/NULL/tên bắt buộc/giới hạn/phone/URL/Unicode/@/chấm |
| Migration/AC11 | CustomerMigrationTest1: V31→V32 giữ nguyên sách, generated KHcode, mốc1000000, phone không unique, CHECK status/version |
| AC01,02,06–08 | CustomerIntegrationTest.createReadUpdateArchiveRestore: actor/ID/mã/createdAt bất biến, version/status/audit |
| AC04,15 | duplicatesRequirePhoneBoundConfirmation: +84/0, archived/nhiều kết quả/paging/excludeId, xác nhận đúng phone, sửa giữ phone |
| AC05,19 | searchFiltersAndPagination: mã/tên/3username/@/phone/SQLwildcard/query/page/size/status và404 |
| AC09,12,18 | staffAndAnonymousBoundaries: STAFF GET200/write403, anonymous401, CSRF403; audit metadata không PII |
| AC11,17,18 | CustomerConcurrencyTest4:2create khác mã, update/update và update/status1winner, audit fail rollback create/update/status, no-op |
| Client/AC18 | customer-api.spec2: CSRF/version/credentials/no transferCache, duplicate409 payload, không retry500 |
| AC04,13–17 | customer-form.spec5: field labels,2submit1request, dirty, lỗi mạng/version giữ input, duplicate response cũ và xác nhận theo số, auth đổi xóa snapshot |
| AC05,09,19 | customer-list.spec3: query/status/page, response cũ, session đổi xóa data, STAFF read-only |
| AC06–10,12 | customer-detail.spec3: thông tin/text XSS/no order action,404/back, STAFF không ghi; admin-layout test link |

Validation/form/API/page test đầu có RED thiếu module/route trước code.
Regression duplicate response sau đóng/mở form đã thấy RED→GREEN.
Concurrency/no-op test được thêm sau API xanh theo plan và đã chạy PostgreSQL;
không giả rằng nhóm regression đó từng đỏ trên locking đúng sẵn.

## Trình duyệt thật

Playwright CLI + Chrome, backend và PostgreSQL QA thật;21check cuối đạt:

- Detail có Threads và không có hành động tạo đơn.
- Dirty Escape giữ form; Tab nằm trong modal; lưu trữ và khôi phục qua UI.
- Hai tab: ghi ở tab2 rồi tab1 nhận409, giữ draft; tải lại chủ động lấy dữ liệu mới.
- Tìm Threads hoa/thường, query navigation; cảnh báo trùng và xác nhận vẫn tạo;
  tạo mới trả ACTIVE/q rỗng/page0.
- URL username bị chặn đúng field; lỗi mạng giữ input và báo kiểm danh sách,
  không tự gửi lại POST. Lỗi mạng được mô phỏng abort request trong browser.
- Form mobile nằm trong viewport; list/detail390px không tràn ngang toàn trang.
- STAFF không có nút ghi, detail read-only, gọi POST trực tiếp với CSRF hợp lệ403.
- Anonymous API401, route admin về login; initial HTML không chứa hồ sơ riêng.
- SĐT +84 nhập từ form được lưu/hiển thị dạng0.

Ảnh local ignored `output/playwright/customer-{list,form,detail}-{desktop,mobile}.png`
và `customer-staff-desktop.png`. Đã mở xem ảnh; ảnh detail đầu chụp trúng
startup-splash được chụp lại sau khi splash hidden. Desktop1280, mobile390×844;
mobile là viewport giả lập trên Chrome, chưa iPhone/Android thật.

Ca confirm đầu thử native dialog; replay sau điều khiển `window.confirm` để
kiểm nhánh xác nhận/dirty mà không bị CLI ngắt. Kịch bản có lượt timeout do
URL @ không encode, nhãn bắt buộc có*, hoặc ghi lặp thành no-op; đã sửa script,
không thay code để làm hợp thức hóa kết quả. Runtime console chỉ có409/403 và
request abort theo các ca chủ động gây lỗi, không ghi payload khách thật.

## Giới hạn và rollout

- Chưa smoke online, migrate V32 thật hoặc kiểm thiết bị thật; không đóng gate
  release chung. Trước rollout cần backup/restore DB theo DEPLOYMENT, xác minh
  revision/migration mới nhất, thử trên bản sao, migrate backend rồi frontend
  và smoke OWNER/STAFF/anonymous/CSRF/duplicate/version trên domain thật.
- Chưa stress/load khách lớn; SQL substring đơn giản, page tối đa100. Chỉ thêm
  pg_trgm/index mở rộng khi có số đo cần thiết.
- Mất response sau create chưa có idempotency cross-request: không tự retry,
  owner kiểm danh sách trước tạo lại. Hai request tạo độc lập có thể tạo2hồ sơ.
- Customer không phải tài khoản website; phone/username trùng được phép,
  không liên kết/gộp tự động. Order Management chưa được triển khai.
- Không rollback bằng drop customer khi đã có dữ liệu; rollback app về bản cũ
  có thể để bảng mới nguyên trạng, giữ backup và xác minh schema tương thích.

## Review độc lập và sửa lỗi

Review whole branch5c5ddac..5734dc3:0Critical/4Important/1Minor. Đã xử lý
trong một fix pass, không re-review;5regression frontend thấy đỏ rồi xanh:

- Edit request cũ không thay draft tạo mới; hủy request và guard generation.
- Browser Back/Forward đổi id hoặc query cùng component: từ chối giữ editor,
  đồng ý đóng/xóa editor cũ; không lưu hồ sơ B vào màn hình có URL A.
- Tìm lại cùng từ khóa sau URL reset/create/back hoạt động theo filter hiện tại.
- Protocol-relative URL// bị chặn đồng nhất FE/BE; dotted username/@ vẫn hợp lệ.
- Duplicate link chỉ có một quyết định dirty, không có RouterLink khởi chạy
  navigation song song sau khi người dùng từ chối. Tác giả regrade từ Minor
  thành Important do nguy cơ điều hướng/discard trái quyết định vừa chọn.

Frontend cuối316/316,56file; targeted customer20/20 gồm RouterTestingHarness
với config route thật. Backend protocol-relative regression cũng RED→GREEN;
full backend cuối ghi ở mục Môi trường. Không có minor còn defer sau fix pass.
Các phạm vi reviewer không xét (live/device/order/replay/doc cleanup) được giữ
thành gate/non-goal nêu trên; không coi là đã nghiệm thu.

## Smoke cuối sau sửa review

Backend/frontend QA restart, frontend tắt HMR để loại template cache cũ.
6check cuối đạt: backend chặn URL//; duplicate link hỏi đúng1lần; chọn không
giữ draft B; chọn có đóng editor trước mở A; Browser Back giữa2detail cùng
component đóng editor đã đồng ý bỏ; tìm lại q sau create reset.
Thêm assert href trong test link, form6/6 đạt. Fullsuite cuối316/316 và
backend310total/3skip; SSR/Workers/proxy cuối đều đạt. Code fix tại788f38e.

Một lượt devserver HMR phục vụ template RouterLink cũ dù TypeScript đã mới,
được xác định từ compiled binding và xử lý bằng restart --no-hmr; không sửa
production code chỉ để bù cache dev. Screenshot owner cuối đã lưu local.

## Các quyết định khi thực thi

- Task-brief script đòi heading Task N nhưng plan dùng T1–T6: trích cùng nội
  dung thủ công; chỉ thay bookkeeping, không đổi scope.
- Worktree native bị sandbox chặn ghi: dùng root trên codex/customers sạch,
  tách branch; đánh đổi là không có checkout thứ hai cho implementation.
- Mã KH là generated column từ identity: unique/đồng thời được DB bảo vệ;
  phụ thuộc PostgreSQL theo stack đã chọn.
- Form.open(customer) thay input+open rời: tránh timing input; caller dùng
  tham số tùy chọn, không có caller ngoài module cần tương thích.
- List/detail dùng chung stylesheet: bớt lặp theme; đổi chung cần xem cả hai
  trang, đã QA desktop/mobile.
- Confirm được điều khiển trong replay sau ca native đầu: kiểm logic, không
  thay bằng chứng native device/OS prompt chưa thử.
- Duplicate-link regrade và xử lý trong pass Important: từ chối phải ngăn
  navigation; nếu bỏ qua có nguy cơ discard trái quyết định vừa chọn.

