# Tối ưu nhập sách — tồn kho và biến thể

Trạng thái: **đã được user duyệt ngày 30/10/2026**, gồm bổ sung lựa chọn tình trạng. Checkpoint S025.

## 1. Yêu cầu đã chốt

- Tạm gác đợt kiểm thử chốt MVP; giữ các gate M5 để tiếp tục sau.
- Ngôn ngữ mặc định “Tiếng Anh” khi thêm sách, có thể sửa/xóa.
- Hai ô giá hiển thị dấu chấm phân nhóm nghìn ngay khi nhập.
- Bỏ nút Đưa lên/Đưa xuống trong quản lý ảnh; đổi vai trò bằng dropdown.
- Tồn kho mặc định 1, cho chỉnh sửa; có nút “Thêm biến thể”.
- Biến thể theo tình trạng, ví dụ “Độ mới cao”, “Có cấn góc”, tồn riêng.
- Đổi lựa chọn mục đánh giá tình trạng thành “Độ mới cao”, “Có lỗi nhẹ”.
- **Giữ nguyên khoảng giá chung hiện tại**, không thêm giá riêng từng biến thể.
- Các biến thể dùng chung thông tin và bộ ảnh của sách, không tải lại ảnh.

## 2. Các hướng đã trao đổi

1. Một tồn kho chung cho mọi biến thể: gọn nhưng không xác định được lựa chọn nào hết.
2. Một trang sách, tồn riêng từng biến thể, tổng tồn tự cộng: user đã chọn.
3. Mỗi bản tạo thành sách riêng: giữ mô hình cũ nhưng lặp nhập liệu/ảnh, không đáp ứng mục tiêu.

User đã chọn hướng 2, yêu cầu giữ khoảng giá chung và duyệt các chi tiết dưới đây.

## 3. Form nhập và sửa

- Thêm sách mở với một ô “Tồn kho” giá trị 1. Số lượng là số nguyên không âm;
  giới hạn mỗi biến thể 0..999999, kiểm tra cả frontend và backend.
- Chưa thêm biến thể thì không bắt chủ đặt tên; nội bộ vẫn có một biến thể mặc định.
- Bấm “Thêm biến thể” hiện danh sách gồm dòng ban đầu và dòng mới, mỗi dòng có
  “Tên biến thể” và “Tồn kho”; dòng mới mặc định 1.
- Khi có nhiều biến thể, bắt buộc tên riêng không trống, không trùng sau trim và
  so sánh không phân biệt hoa/thường; ví dụ “Độ mới cao — 2”, “Có cấn góc — 1”.
- Hiển thị tổng tồn tự cộng, readonly; không lưu một tổng khác để chủ sửa riêng.
- Cho thêm/sửa tên và tồn khi chỉnh sách; không xóa biến thể đã lưu trong đợt này,
  đặt tồn 0 khi hết. Dòng mới chưa lưu được gỡ; luôn còn ít nhất một dòng.
- Mô tả tình trạng chung vẫn giữ; tên biến thể bổ sung sự khác biệt. Bộ ảnh chung
  không được mô tả là bằng chứng chính xác tình trạng của mọi bản vật lý.
- Không thêm bộ ảnh riêng từng biến thể trong phạm vi này.
- Khoảng giá, trọng lượng, thông tin sách và publication thuộc sách dùng chung.
- Giữ xác nhận đăng, phiên ảnh tạm, chống tạo trùng khi retry và cảnh báo chưa lưu.

## 4. Ngôn ngữ, giá và ảnh

- Default “Tiếng Anh” chỉ áp dụng form tạo mới; không ghi đè sách cũ hoặc dữ liệu
  ngôn ngữ rỗng đã lưu khi mở editor.
- Giá nhập 21000 thành 21.000 ngay khi gõ; dùng bàn phím số trên mobile. Hỗ trợ
  dán số và chỉnh giữa chuỗi, xóa trắng; không tự làm tròn số thập phân hoặc âm.
- Form/API vẫn dùng số nguyên VND, không gửi chuỗi có dấu chấm; giữ giới hạn
  1..999999999999 và giá từ ≤ giá đến như hiện tại.
- Bỏ hai nút di chuyển và kéo đổi vị trí card để dropdown là cách duy nhất đổi
  vai trò. Giữ kéo file vào vùng tải, chọn/thay/gỡ ảnh, retry, metadata và progress.
- Dropdown giữ hoán đổi vai trò an toàn, không tạo hai ảnh cùng vai trò, không
  tải lại ảnh READY; thứ tự hiển thị theo vai trò FRONT/BACK/SPINE/INSIDE_1..3.

## 5. Dữ liệu, API và tương thích

- Giữ ID sách, mã MM, slug, URL, Listing liên kết hiện tại, ảnh và publishedAt.
  Thêm bảng biến thể con với ID ổn định, tên, tồn và thứ tự trong sách.
- Không tạo BookCopy/Listing/Cloudinary asset mới cho mỗi biến thể. Mã MM hiện
  tại nhận diện mục sách; biến thể nhận diện bằng ID riêng và tên hiển thị.
- Đây là thay đổi có chủ đích so với baseline “mỗi cuốn vật lý có mã riêng”:
  một mục sách nay có thể đại diện nhiều bản theo tình trạng, không theo dõi
  từng bản vật lý trong một biến thể. Cập nhật tài liệu chuẩn khi thiết kế được duyệt.
- Migration mới sau V9: mỗi sách cũ có một biến thể mặc định; AVAILABLE→1,
  SOLD→0; không tự suy số lượng thật cao hơn 1, không đổi ID/ảnh/giá/visibility.
- Tổng tồn >0 thì AVAILABLE, tổng 0 thì SOLD. Không giữ công tắc availability
  độc lập có thể mâu thuẫn tồn; thao tác chủ cập nhật tồn thay cho bật/tắt thủ công.
- Không tự trừ kho khi khách liên hệ/wishlist; chủ cập nhật sau chốt ngoài web.
- Create/update lưu biến thể cùng sách nguyên tử, dùng aggregate version hiện
  có và audit; hai tab sửa cùng version chỉ một bên thắng, 409 giữ form.
- Retry final cùng payload trả cùng sách và cùng tập biến thể; không cộng tồn
  hoặc tạo biến thể lặp khi mất response. Fingerprint bao gồm dữ liệu biến thể.
- OWNER ghi, STAFF chỉ đọc; backend kiểm quyền/validation, không chỉ khóa UI.
- Không tự migrate/deploy online; backup và rollout theo workflow hiện hành.

## 6. Public, wishlist và liên hệ

- Catalogue vẫn một card/một sách, khoảng giá chung; khả dụng dựa tổng tồn.
- Detail hiện lựa chọn theo tên biến thể khi có nhiều dòng; dòng tồn 0 có nhãn
  “Hết hàng”. Không dùng kiểu chọn số lượng mua/giỏ hàng từ ảnh tham khảo.
- Khách chọn biến thể còn hàng để hỏi; nội dung sao chép kèm mã sách, tên biến thể
  và khoảng giá chung. Nếu lựa chọn vừa hết khi kiểm lại, báo rõ để chọn lại.
- Wishlist tiếp tục lưu theo sách, không đổi định dạng dữ liệu đã lưu. Chọn biến
  thể áp dụng hỏi mua trên detail; hỏi nhiều sách vẫn hỏi chung theo mã sách,
  không tự gán biến thể mà khách chưa chọn.
- Kiểm trạng thái mới trước liên hệ như hiện tại, giữ SSR/no-store và không lộ
  dữ liệu admin/sourceRef. Sách tổng tồn 0 giữ trang và luồng tư vấn sách tương đương.

## 7. Nghiệm thu thay đổi và giới hạn

- Tạo sách không biến thể tên riêng: default tồn 1, sửa được; giá lưu dạng số.
- Tạo hai biến thể 2+1: chỉ một sách/bộ ảnh, tổng 3; sửa 0+1 còn hàng, 0+0 hết.
- Kiểm tên trùng/số âm/phân số, version conflict và retry không nhân sách/tồn.
- Sách cũ giữ mã/URL/ảnh/giá; AVAILABLE/SOLD chuyển đúng 1/0 trên DB scratch.
- Kiểm ngôn ngữ default chỉ tạo mới, giá gõ/dán/sửa/xóa, dropdown ảnh và bàn phím.
- Kiểm public chọn biến thể/hỏi mua, hết hàng sau refresh và wishlist cũ còn đọc được.
- Chạy test/build liên quan khi triển khai, không dùng việc hoãn kiểm thử chốt
  MVP để bỏ kiểm tra an toàn của thay đổi; chưa chạy kiểm tra application ở bước thiết kế.
- Không thêm order/checkout/reservation, đồng bộ kho ngoài web, giá hay ảnh riêng
  từng biến thể; chưa đánh dấu MVP/M5 hoàn thành.

Thiết kế bổ sung [M5 completion](M5_COMPLETION_SPEC.md); các gate chưa đạt vẫn giữ.
