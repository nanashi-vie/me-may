# SPEC — Chấm công nhân viên Mẹ Mây (MVP v1)

## 1. Mục tiêu

Xây dựng tính năng chấm công đơn giản trong khu vực `/admin` của website Sách Ngoại Văn Mẹ Mây.

- Owner tạo và quản lý hồ sơ nhân viên.
- Owner đăng ký lịch làm việc cho nhân viên theo từng tuần.
- Nhân viên chấm công trực tiếp trên máy tính của chủ tiệm.
- Sử dụng phiên đăng nhập OWNER hiện có.
- Không yêu cầu tài khoản đăng nhập riêng cho nhân viên.
- Hệ thống ghi nhận giờ làm thực tế và xuất bảng công Excel.

**Ngoài phạm vi MVP:** Tính lương, GPS, nhận diện khuôn mặt, duyệt nghỉ phép, đăng ký ca theo giờ, chấm công offline và phân quyền nhân viên.

## 2. Quyền truy cập và quy trình sử dụng

### 2.1. Phương án A — Sử dụng phiên OWNER hiện có

Máy tính của chủ tiệm được sử dụng làm thiết bị chấm công tại cửa hàng.

- Owner đăng nhập `/admin` như bình thường.
- Nhân viên dùng máy tính đã đăng nhập, chọn tên trong **Hồ sơ nhân viên** rồi mở **Chấm công** của hồ sơ đó.
- Không yêu cầu nhân viên đăng nhập tài khoản website.
- Không yêu cầu đăng nhập lại OWNER trước mỗi lần chấm công.
- Không xây dựng phiên Kiosk hoặc cơ chế xác thực thiết bị riêng.
- Các trang quản trị khác giữ nguyên cơ chế xác thực hiện tại.

**Giới hạn bảo mật được chấp nhận trong MVP:**

Do nhân viên sử dụng phiên OWNER đang hoạt động, về mặt kỹ thuật họ có thể truy cập các chức năng quản trị khác trên website.

MVP không triển khai cơ chế ngăn chặn việc này. Khi cần tăng cường bảo mật, hệ thống có thể chuyển sang phiên chấm công riêng mà không thay đổi dữ liệu nhân viên hoặc lịch sử công.

### 2.2. Owner quản lý

Owner có thể:

- Tạo, chỉnh sửa và ngừng hoạt động hồ sơ nhân viên.
- Tạo hoặc đặt lại PIN.
- Đăng ký lịch làm việc.
- Sao chép lịch tuần trước.
- Xem và chỉnh sửa chấm công có lưu lịch sử.
- Xuất báo cáo Excel.

### 2.3. Nhân viên chấm công

Quy trình sử dụng thông thường:

1. Mở **Nhân viên → Hồ sơ nhân viên** trong `/admin`.
2. Chọn hồ sơ cá nhân và bấm **Chấm công**.
3. Nhập PIN.
4. Xem lịch làm việc đã đăng ký.
5. Tick **Bắt đầu ca** hoặc **Kết thúc ca**.
6. Xác nhận thao tác trong popup.
7. Xem thông báo chấm công thành công.

PIN được dùng để xác định nhân viên thực hiện chấm công, không được coi là một lớp phân quyền quản trị.

Sau khi chấm công, giao diện tự quay về màn hình chọn nhân viên.

## 3. Quản lý hồ sơ nhân viên

Đường dẫn đề xuất: `/admin/nhan-vien`

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Mã nhân viên | Có | Tự sinh, ví dụ EMP-001 |
| Họ tên | Có | |
| PIN | Có | 6 chữ số |
| Số điện thoại | Không | |
| Ngày bắt đầu | Không | |
| Trạng thái | Có | ACTIVE / INACTIVE |

- Mỗi nhân viên có một hồ sơ độc lập. Danh sách ở cột trái 40%. Khung bên phải 60% trên desktop chỉ mở khi bấm Thêm nhân viên hoặc chọn Thông tin hồ sơ.
- Mục cha **Nhân viên** chứa **Hồ sơ nhân viên**, **Lịch làm việc** và **Bảng công**. Rê chuột, bấm hoặc dùng bàn phím trên hàng nhân viên để mở menu Thông tin hồ sơ, Lịch làm việc và Chấm công của người đó.
- Họ tên dùng trên giao diện, bảng công và Excel. Tên hiển thị đã lưu được giữ để tương thích dữ liệu.
- PIN được hash tại backend, không lưu bản rõ.
- Owner có thể cấp lại PIN.
- Nhân viên nghỉ việc không bị xóa lịch sử chấm công.
- Thiết kế sẵn liên kết tài khoản tùy chọn cho tương lai, chưa cần triển khai tài khoản nhân viên.

## 4. Quản lý lịch đăng ký theo tuần

### 4.1. Giao diện

Lịch tổng hợp dùng `/admin/cham-cong/lich`. Lịch cá nhân dùng `/admin/nhan-vien/:employeeId/lich` và chỉ sửa lịch của hồ sơ đó.

Hiển thị dạng bảng:

- Hàng: Danh sách nhân viên đang hoạt động.
- Cột: Thứ Hai đến Chủ nhật.
- Ô checkbox: Có hoặc không đăng ký làm việc.
- Tuần được tính từ thứ Hai đến Chủ nhật theo múi giờ Việt Nam.
- Không nhập giờ bắt đầu hoặc giờ kết thúc dự kiến.

Các chức năng:

1. Chuyển tuần trước / tuần sau.
2. Quay về tuần hiện tại.
3. Tick hoặc bỏ tick ngày đăng ký.
4. Lưu lịch.
5. Sao chép lịch tuần trước.
6. Hiển thị trạng thái có thay đổi chưa lưu.

Lịch được lưu theo từng tuần thực tế, không phải cấu hình lặp vĩnh viễn.

### 4.2. Sao chép lịch tuần trước

**Mục đích:** Giảm thời gian đăng ký lịch khi nhân viên có ngày làm tương tự tuần trước.

Luồng:

1. Owner mở tuần cần đăng ký.
2. Bấm **Sao chép tuần trước**.
3. Hệ thống đọc lịch tuần liền trước.
4. Sao chép các thứ đã chọn của từng nhân viên sang tuần đang mở.
5. Hiển thị kết quả trong bảng dưới dạng thay đổi chưa lưu.
6. Owner điều chỉnh checkbox nếu cần.
7. Bấm **Lưu lịch** để xác nhận.

Ví dụ:

Tuần 09/11–15/11:
- An: T2, T4, T6.
- Bình: T3, T5, T7.

Sao chép sang tuần 16/11–22/11:
- An: T2 (16/11), T4 (18/11), T6 (20/11).
- Bình: T3 (17/11), T5 (19/11), T7 (21/11).

**Quy tắc sao chép:**

- Sao chép theo thứ trong tuần, không sao chép ngày tháng gốc.
- Ghép nhân viên bằng `employee_id`, không dựa trên tên.
- Chỉ sao chép nhân viên còn hoạt động.
- Nhân viên mới không có lịch nguồn thì mặc định chưa đăng ký.
- Không sao chép bản ghi chấm công hay giờ làm.
- Nếu tuần đích đã có lịch, hiển thị cảnh báo trước khi thay thế các checkbox của tuần đích.
- Thao tác sao chép không tự lưu vào database.
- Không tự động sửa lịch các tuần khác.
- Chỉ cho phép chỉnh sửa lịch tuần hiện tại hoặc tương lai trong MVP; lịch quá khứ ở chế độ chỉ đọc để tránh thay đổi dữ liệu đối chiếu.

### 4.3. Lưu và kiểm tra

- Owner chỉ lưu được lịch hợp lệ.
- Lưu toàn bộ lịch của tuần trong một transaction.
- Nếu lưu thất bại, không để trạng thái lưu dở.
- Khi rời trang với thay đổi chưa lưu, hiển thị cảnh báo.
- Lịch sau khi lưu được hiển thị cho nhân viên khi chấm công.

## 5. Giao diện chấm công nhân viên

Đường dẫn chấm công cá nhân là `/admin/nhan-vien/:employeeId/cham-cong`. URL chấm công cũ đưa về danh sách hồ sơ.

Giao diện được tối ưu cho thao tác nhanh trên máy tính của chủ tiệm.

Luồng:

1. Mở danh sách **Hồ sơ nhân viên**.
2. Chọn hồ sơ và bấm **Chấm công**.
3. Nhập PIN 6 chữ số.
4. Backend kiểm tra PIN.
5. Xác thực thành công.
6. Hiển thị:
   - Họ tên nhân viên.
   - Lịch đăng ký từ thứ Hai đến Chủ nhật của tuần hiện tại.
   - Đánh dấu ngày hiện tại.
   - Trạng thái ca hiện tại.
   - Checkbox **Bắt đầu ca**.
   - Checkbox **Kết thúc ca**.
7. Khi tick một checkbox, hiển thị hộp thoại xác nhận.
8. Chỉ ghi nhận khi nhân viên xác nhận.
9. Hiển thị thông báo thành công.
10. Tự quay về màn hình chọn hồ sơ sau khi hoàn tất.

Hai checkbox là các hành động có trạng thái, không cho phép bỏ tick để xóa bản ghi đã lưu.

PIN phải được backend kiểm tra khi ghi nhận thao tác, không chỉ kiểm tra ở giao diện. Có thể sử dụng một phiên xác thực chấm công ngắn hạn gắn với nhân viên đã chọn.

### 5.1. Bắt đầu ca

Điều kiện: Nhân viên không có ca đang mở.

- Nhân viên tick **Bắt đầu ca**.
- Popup xác nhận: "Bạn có chắc chắn muốn bắt đầu ca làm?"
- Hiển thị ngày và giờ hiện tại để tham khảo.
- Nhấn Xác nhận.
- Backend ghi thời gian thực tế.
- Trạng thái chuyển sang `WORKING`.

### 5.2. Kết thúc ca

Điều kiện: Nhân viên có ca đang mở.

- Nhân viên tick **Kết thúc ca**.
- Popup xác nhận: "Bạn có chắc chắn muốn kết thúc ca làm?"
- Nhấn Xác nhận.
- Backend ghi giờ kết thúc.
- Trạng thái chuyển sang `COMPLETED`.

### 5.3. Nhiều ca trong một ngày

Cho phép nhân viên bắt đầu ca mới sau khi ca trước đã kết thúc.

Ví dụ:

- Ca 1: 08:00–12:00.
- Ca 2: 13:00–17:00.
- Tổng giờ: 8 giờ.

Không cho phép hai ca đang mở cùng lúc.

### 5.4. Chấm công ngoài lịch đăng ký

Nếu nhân viên chấm công vào ngày chưa đăng ký:

- Hiển thị cảnh báo: "Hôm nay bạn chưa đăng ký lịch làm việc."
- Vẫn cho phép tiếp tục chấm công sau khi xác nhận.
- Đánh dấu bản ghi `OUT_OF_SCHEDULE`.
- Owner có thể lọc các trường hợp này trong bảng công.

Lịch đăng ký không phải cơ chế giới hạn quyền chấm công.

### 5.5. Tự động thoát hồ sơ

- Sau khi thao tác thành công, quay về màn hình chọn nhân viên.
- Nếu không hoạt động trong khoảng 30 giây sau khi nhập PIN, tự thoát hồ sơ.
- Thoát hồ sơ chấm công không đăng xuất tài khoản OWNER khỏi `/admin`.

## 6. Quy tắc dữ liệu

- Backend quyết định thời gian ghi nhận.
- Múi giờ hiển thị: `Asia/Ho_Chi_Minh`.
- Không tạo ca trùng do gửi request nhiều lần.
- Không cho phép kết thúc ca chưa bắt đầu.
- Ca chưa kết thúc phải hiển thị trạng thái riêng.
- Không tự tính giờ làm vô hạn khi nhân viên quên kết thúc ca.
- Owner có thể điều chỉnh giờ công, bắt buộc nhập lý do.
- Lưu lịch sử điều chỉnh gồm giá trị cũ, giá trị mới, thời điểm và người thực hiện.
- Các bản ghi điều chỉnh không được làm mất sự kiện chấm công gốc.
- Giới hạn số lần nhập PIN sai để tránh dò mã.

## 7. Cấu trúc dữ liệu đề xuất

### `employee_profile`

Lưu thông tin nhân viên và trạng thái hoạt động.

### `employee_pin_credential`

Lưu PIN hash và thông tin đặt lại PIN.

### `employee_weekly_schedule`

Lưu tuần bắt đầu (`week_start_date`), nhân viên, các thứ đăng ký và thông tin cập nhật.

Ràng buộc duy nhất trên `(employee_id, week_start_date)`.

Có thể biểu diễn lịch bằng bảy trường boolean hoặc một cấu trúc tương đương. Không lưu giờ làm dự kiến.

### `attendance_session`

Lưu một ca làm thực tế:

- `employee_id`
- `started_at`
- `ended_at`
- `status`
- `is_out_of_schedule`
- `created_at`
- `updated_at`

### `attendance_audit_log`

Lưu lịch sử điều chỉnh hoặc hủy công, bao gồm người thao tác và lý do.

Không cần bảng `kiosk_device`, tài khoản nhân viên hoặc hệ thống phân quyền Kiosk riêng trong MVP.

## 8. Bảng công và xuất Excel

Đường dẫn đề xuất: `/admin/cham-cong/bao-cao`

Owner có thể:

- Xem theo tuần hoặc tháng.
- Lọc theo nhân viên.
- Xem tổng số giờ làm.
- Xem số ngày có công.
- Xem ca chưa kết thúc.
- Xem ca ngoài lịch đăng ký.
- Điều chỉnh giờ công.
- Xuất `.xlsx`.

File Excel gồm:

**Sheet 1 — Tổng hợp**

Mã nhân viên, tên, số ngày đăng ký, số ngày làm thực tế, tổng giờ hợp lệ, số ca cần kiểm tra.

**Sheet 2 — Chi tiết**

Ngày, nhân viên, giờ bắt đầu, giờ kết thúc, tổng số phút, trạng thái, ngoài lịch hay không, ghi chú chỉnh sửa.

Một ngày có nhiều ca vẫn chỉ được tính là một ngày làm thực tế. Tổng giờ là tổng các ca hợp lệ.

## 9. Tiêu chí nghiệm thu

- [ ] Owner tạo được hồ sơ nhân viên và cấp PIN.
- [ ] Bảng đăng ký hiển thị đầy đủ nhân viên và bảy thứ.
- [ ] Có thể lưu lịch cho từng tuần.
- [ ] Sao chép tuần trước giữ đúng nhân viên và thứ làm việc.
- [ ] Lịch đã sao chép có thể chỉnh sửa trước khi lưu.
- [ ] Không tự ghi đè lịch đã tồn tại mà không cảnh báo.
- [ ] Nhân viên sử dụng trực tiếp phiên `/admin` đã đăng nhập OWNER.
- [ ] Không cần tạo tài khoản nhân viên hoặc đăng nhập lại OWNER cho mỗi lượt chấm công.
- [ ] PIN đúng mới có thể ghi nhận công vào hồ sơ đã chọn qua luồng chấm công.
- [ ] Hai checkbox có popup xác nhận.
- [ ] Giờ làm được ghi nhận tại server.
- [ ] Hỗ trợ nhiều ca/ngày.
- [ ] Cảnh báo khi chấm công ngoài lịch.
- [ ] Sau khi chấm công, tự thoát hồ sơ nhưng giữ nguyên phiên OWNER.
- [ ] Owner xem và chỉnh sửa công có audit log.
- [ ] Xuất Excel tổng hợp và chi tiết chính xác.

## 10. Không triển khai trong MVP

- Tài khoản nhân viên.
- Phiên đăng nhập Kiosk riêng.
- Phân quyền riêng cho nhân viên.
- Xác thực hoặc đăng ký thiết bị chấm công.
- Tính lương tự động.
- Đăng ký lịch theo giờ.
- Đăng ký nghỉ phép.
- Duyệt lịch nhiều cấp.
- QR/GPS/nhận diện khuôn mặt.
- Chấm công offline.

**Nguyên tắc cuối cùng:**

1. Lịch đăng ký là kế hoạch làm việc; bản ghi vào/ra ca là dữ liệu thực tế.
2. Không được dùng lịch đăng ký để tự sinh công hoặc suy ra số giờ làm việc.
3. PIN xác định nhân viên chấm công, không phải cơ chế phân quyền.
4. Ưu tiên tận dụng hệ thống xác thực OWNER hiện tại để giảm phạm vi phát triển MVP.
5. Dữ liệu nhân viên, lịch và chấm công cần độc lập với cơ chế xác thực để có thể nâng cấp phân quyền trong tương lai.

## 11. Quy tắc ghi giờ và báo cáo

- Giờ hoạt động tham chiếu là 08:30–20:30, múi giờ Asia/Ho_Chi_Minh. Ghi theo giờ thực tế, kể cả đến sớm hoặc về muộn.
- Ca mở hiện trong danh sách cần kiểm tra và chưa cộng vào tổng giờ. Không tự chốt giờ.
- Quy ước đề xuất cho báo cáo: gán ca theo ngày bắt đầu tại Việt Nam, kể cả ca qua nửa đêm. Cờ ngoài lịch được xác định theo lịch của ngày bắt đầu khi ghi nhận ca và giữ làm dữ liệu đối chiếu.

- Ca đang mở từ 20:30 ngày bắt đầu (giờ Việt Nam) hiện **Cần kiểm tra**. Ca vẫn có thể được kết thúc bằng thao tác chấm công.


## 12. Contract triển khai trên dev-ui

- Flyway V21 tạo dữ liệu chấm công tách khỏi catalogue. API dưới `/api/v1/admin/attendance` yêu cầu OWNER. Thao tác ghi dùng CSRF hiện hành.
- PIN 6 chữ số hash BCrypt. Sau 5 lần sai, khóa thử PIN của hồ sơ đó trong 5 phút. Quyền xác nhận ca gắn với phiên OWNER và hồ sơ, có hiệu lực 30 giây. Đặt lại PIN hoặc ngừng hoạt động làm quyền cũ hết hiệu lực.
- Chỉ một ca mở mỗi nhân viên. Lịch, hồ sơ và chỉnh công dùng phiên bản để từ chối dữ liệu cũ. Điều chỉnh lưu giờ hiệu lực và audit trong cùng giao dịch, giữ mốc chấm công gốc.
- Bảng công và Excel dùng chung phép tính. Số phút của mỗi ca hoàn tất lấy phần nguyên của thời lượng thực tế. Ca mở có số phút trống. Cờ Cần kiểm tra áp dụng khi ca vẫn mở từ 20:30 ngày bắt đầu và hết khi ca được đóng.
- Sheet Chi tiết dùng ngày dd/mm/yyyy, giờ HH:mm:ss và thời lượng HH:mm dưới dạng số Excel. Thời lượng trên 24 giờ giữ nguyên tổng giờ. Hai cột giờ trên bảng công web chỉ hiện HH:mm:ss.
- Khi nghiệm thu local, dùng PostgreSQL kiểm thử riêng. Chạy `mvn -Dtest=AttendanceIntegrationTest test` từ `code/backend` với cấu hình DB test và `npm test` từ `code/frontend`. Rollout V21 cần kiểm tra riêng trên môi trường đích.
