# M0 — đặc tả màn hình low-fidelity

Đọc cùng [Home brief](home-brief.md) và [screen board](wireframes/screens.svg). Nội dung này mô tả UX, chưa khóa cấu trúc component hoặc OpenAPI.

## Catalogue / collection — khách mobile

Header tìm kiếm và Quan tâm dùng chung với Home. Breadcrumb → tên nhóm/số kết quả → sort và nút “Lọc” → grid hai cột → pagination. Bộ lọc nằm trong sheet trên mobile, trong panel trên desktop: độ tuổi gợi ý, format, chủ đề, giá, availability. Chỉ dùng taxonomy đã có dữ liệu; không ép lọc ngôn ngữ khi nguồn chưa đủ.

Nhấn áp dụng cập nhật URL và đưa người dùng tới đầu kết quả; browser back giữ query/filter/page. Xóa tất cả có thể trở lại catalogue mặc định. Khi đổi filter, page về 1. Page/giá không hợp lệ được chuẩn hóa hoặc báo lỗi có hướng dẫn, không crash. Trạng thái không kết quả có nút bỏ bớt bộ lọc; lỗi tải có nút thử lại; loading không giả thành “0 cuốn”.

## Chi tiết cuốn — khách mobile

Breadcrumb → gallery (bìa lớn, thumbnails theo loại ảnh) → tên/mã → giá và availability → mô tả tình trạng/lỗi → thông tin đã xác minh → nút Quan tâm, Sao chép mã/link, Facebook/Zalo → hướng dẫn cửa hàng xác nhận. Trên desktop gallery và thông tin thành hai cột; mobile một cột, vùng CTA không che nội dung.

SOLD hiển thị rõ, bỏ CTA hỏi mua theo nghĩa còn sẵn và gợi ý quay lại catalogue/sách tương tự. HELD có nhãn đang giữ, chỉ cho hỏi tình trạng. Ảnh lỗi không giấu dưới nhiều accordion; không có ảnh không có nghĩa không có lỗi. Nhãn “chưa rõ”/bỏ trường là lựa chọn khi thiếu thông tin; không bịa ISBN/tuổi/author. Khi archived, public URL không trả chi tiết cuốn; public preview không dùng endpoint admin.

## Danh sách quan tâm — khách mobile

Mỗi dòng: ảnh nhỏ, tên, mã, giá mới nhất, trạng thái mới nhất, mở chi tiết và xóa. Không có quantity, phí ship, nút thanh toán hoặc tổng đơn. Dưới danh sách: Sao chép danh sách hỏi mua, mở Facebook/Zalo; giải thích danh sách lưu trên thiết bị, không giữ sách.

Format copy một cuốn: `Mã | Tên | Giá tham khảo | URL`. Nhiều cuốn: một dòng/cuốn và câu cuối đề nghị tiệm xác nhận còn/giá. Cuốn sold/hidden được loại khỏi danh sách hỏi mua còn sẵn và báo lý do; khi API lỗi không âm thầm gửi giá cũ. Clipboard lỗi có ô văn bản để chọn/copy thủ công.

## Bảng quản trị — desktop

Sidebar nhỏ: Sách, Bộ sưu tập, Danh mục, Tài khoản (Owner), Cấu hình (Owner). Main: tiêu đề → Thêm sách → search mã/tên, filter publication/availability → bảng bìa/mã/tên/giá/khả dụng/xuất bản/cập nhật/thao tác → pagination.

Không có doanh thu/đơn hàng dashboard. Owner đổi trạng thái bằng control rõ ràng, cập nhật server thành công mới báo thành công; network error giữ nguyên trạng thái đã xác nhận trước đó. STAFF không có control xuất bản hoặc đổi sách đang công khai. Backend từ chối request vượt quyền kể cả tự gọi API.

## Editor — desktop

Cột nội dung chính: thông tin cuốn (mã, tên, format, condition, ngôn ngữ, dữ liệu tùy chọn) → gallery upload/loại ảnh/thứ tự/thumbnail/alt → listing mô tả + giá + chủ đề/tuổi/collection. Sidebar phải: publication, availability, version/cập nhật, lưu nháp/preview/xuất bản theo quyền.

Mã bất biến sau khi tạo. Lưu nháp cho phép thiếu field xuất bản; publish yêu cầu tên, mã, giá nguyên >0, format, condition note và ảnh bìa đã kiểm tra. Có lỗi phải nêu trường/ảnh nào và giữ dữ liệu người dùng vừa nhập. Rời form chưa lưu có cảnh báo. Version conflict không ghi đè; cho tải bản mới và đối chiếu thay đổi. Upload có progress/lỗi từng ảnh; không báo lưu hoàn tất khi ảnh chưa gắn vào cuốn.

## Trạng thái UX dùng chung

Loading, empty, error, forbidden, not-found, unsaved changes và concurrent edit đều cần mô tả/test khi chuyển thành technical spec. Focus rõ, nút có nhãn, form có label, badge không dựa duy nhất vào màu. Public đọc được từ HTML đầu tiên theo chiến lược render đã qua spike; browser API của wishlist/clipboard không chạy trong server initialization.
