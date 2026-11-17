# Phân trang dùng chung public/admin

Ngày 17/11/2026. Hướng dùng chung đã được user chọn; màu đỏ theo web đã chốt.
Trạng thái: user duyệt17/11, yêu cầu triển khai tuần tự.

## Mục tiêu và phạm vi

- Thay các thanh phân trang hiện có bằng một component Angular standalone chung.
- Áp dụng public catalogue/collection và admin: sách, Thùng rác, hàng chờ,
  audit sách, khách hàng, đơn, lịch sử đơn, chọn khách/chọn sách có phân trang.
- Giữ hành vi tải thêm gợi ý trùng khách; không biến tải thêm thành phân trang.
- Giữ API, page size, phân quyền, bộ lọc, tìm kiếm và quy ước URL hiện có.

## Các hướng và lựa chọn

- Chỉ sửa CSS từng màn: ít thay template nhưng không bổ sung chuyển bằng số,
  tiếp tục lặp logic và dễ lệch kiểu giữa các trang.
- Component chung: thay các cụm nút hiện có, gom logic số và accessibility;
  user chọn hướng này. Dùng Angular/CSS sẵn có, không thêm dependency.

## Giao diện

- Theo bố cục ảnh: mũi tên trái, số trang, dấu chấm lửng, mũi tên phải.
- Trang hiện tại nền đỏ theo biến thương hiệu hiện có (`--red`, hiện #b32635),
  chữ trắng, bo góc 10–12px; số khác và mũi tên không nền/khung thường trực.
- Hover nền đỏ nhạt, focus có viền đỏ rõ; màu chữ thường theo theme hiện có.
- Không sao chép nền xám toàn ảnh; dùng nền trang đang đặt component.
- Nút tối thiểu 44×44px, font Nunito hiện có, không tràn ngang ở mobile.
- Desktop tối đa 7 vị trí số/dấu chấm (không tính hai mũi tên):
  đầu `1 [2] 3 4 5 … 10`, giữa `1 … 4 [5] 6 … 10`, cuối `1 … 6 7 8 [9] 10`.
- Màn hẹp dùng tối đa 5 vị trí, ưu tiên trang đầu/cuối và trang hiện tại:
  đầu `1 [2] 3 … 10`, giữa `1 … [5] … 10`, cuối `1 … 8 [9] 10`.
  Mũi tên luôn cho phép tiến/lùi từng trang.

## Hành vi và trạng thái

- Hiển thị số từ 1; adapter giữ page index từ 0 ở API hiện có.
- Bấm số hoặc mũi tên gọi đúng luồng chuyển trang của màn chủ;
  giữ query/filter và hành vi cuộn/Back/reload hiện có.
- Khóa lùi ở trang đầu, tiến ở trang cuối; khóa toàn bộ khi màn chủ đang tải
  hoặc đang mutation cần chặn. Không phát sự kiện cho trang đang chọn.
- Dấu chấm là ký hiệu tĩnh; không click/focus. Không lặp số hoặc bỏ trang
  cuối; khoảng trống chỉ một trang thì hiện số thay dấu chấm.
- Không có kết quả thì ẩn thanh; một trang thì hiện số 1 với hai mũi tên khóa.
  Giữ nguyên các trạng thái lỗi/loading và tổng kết quả của màn chủ.
- Navigation có nhãn tiếng Việt, nút số có tên truy cập, trang hiện tại có
  `aria-current="page"`; dùng được bằng bàn phím và tương thích SSR.
- Kiểm màu ở public sáng/tối và admin; các chi tiết CSS theo token hiện hành
  do người triển khai quyết định trong các ràng buộc trên.

## Nghiệm thu

- Kiểm logic 0/1/ít/nhiều trang, đầu/giữa/cuối, dấu chấm, trạng thái khóa.
- Kiểm tích hợp chuyển số giữ filter/URL, đúng request page, không gọi trùng.
- Chạy frontend suite, SSR và Workers build; kiểm proxy nếu liên quan runtime.
- Browser QA public/admin và khung phụ, bàn phím, desktop/mobile 390px,
  thu hẹp 320px và theme sáng/tối; dùng dữ liệu QA, không dữ liệu bán thật.
- Gộp contract vào DESIGN, bằng chứng vào DEV_LOG/VERIFICATION sau hoàn tất;
  gỡ spec/plan hết vai trò và cập nhật chỉ mục cùng thay đổi.
