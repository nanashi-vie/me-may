# Phân trang public và admin

Contract17/11, cập nhật18/11/2026: user yêu cầu2trang liền trước/sau trang hiện tại.
Bằng chứng, giới hạn và commit ở [DEV_LOG PAGINATION-C04–C10](DEV_LOG.md).

## Phạm vi và cấu trúc

- Component Angular standalone `shared/pagination` dùng chung, không dependency mới.
- Áp dụng10cụm ở9component: catalogue/collection, sách/Thùng rác/audit/hàng chờ,
  khách hàng, đơn hàng, lịch sử đơn của khách, chọn khách và chọn sách cho đơn.
- Giữ tải thêm gợi ý trùng khách; không thêm phân trang vào màn chưa có.
- Component nhận `page` từ0, `totalPages`, `disabled`, `label` và phát `pageChange`
  từ0. Màn chủ giữ API, page size, quyền, request/cancellation, error/loading.
- Public URL vẫn page từ1; chuyển số giữ bộ lọc đã áp dụng, không apply age nháp.
  Admin giữ handler và query/search/filter hiện có; không đổi backend/schema.

## Hình thức và responsive

- Mũi tên trái/phải, số trang và dấu `…` tĩnh theo ảnh. Trang hiện tại nền
  `--action` (#b32635), chữ trắng, bo11px; số thường theo `--ink`, không viền/nền.
- Dùng --action thay --red cho nền selected để giữ tương phản chữ trắng khi
  --red đổi hồng nhạt trong theme tối. Hover đỏ nhạt/focus rõ theo --red/theme.
- Dùng Nunito hiện có, nền trang; mỗi nút tối thiểu44×44px. Không sao chép nền xám
  ảnh mẫu. Khi quá hẹp có thể xuống dòng trong thanh, không tràn ngang.
- Luôn giữ2trang liền trước và2trang liền sau khi tồn tại, cộng đầu/cuối và dấu
  chấm; tối đa9vị trí số/dấu chấm, không tính2mũi tên. Ví dụ:
  `1 2 3 4 [5] 6 7 … 32`, `1 … 14 15 [16] 17 18 … 32`.
- Gần đầu/cuối, cửa sổ5trang dịch trong biên; ít hơn5trang thì hiện tất cả.
- Mobile/sidebar/dialog giữ đủ các trang lân cận và vùng chạm44px; giảm gap,
  xuống dòng khi cần. Không ẩn bớt2trang lân cận để ép thanh thành một dòng.
- Chỉ còn một bộ nút DOM; không còn container query/hai biến thể riêng. Nút có
  width:auto/margin:0 để không bị CSS form chung kéo toàn chiều ngang.

## Hành vi và accessibility

- Bấm số hoặc mũi tên gọi luồng chuyển trang của màn chủ; giữ Back/reload/URL.
  Không phát event khi chọn trang hiện tại hoặc ngoài biên; dấu chấm không tương tác.
- Luôn có trang đầu/cuối, không lặp số; khoảng trống chỉ1trang thì hiện số đó.
  Số token/work được giới hạn kể cả khi có hàng triệu trang.
- Khóa lùi ở đầu, tiến ở cuối, toàn bộ khi loading/mutation cần chặn. Lookup
  khóa cả searching/locked/refreshing; queue/trash giữ loading theo request sequence.
- 0trang ẩn navigation;1trang hiện1 với2mũi tên khóa. Giữ empty/error/retry
  và tổng kết quả của màn chủ, không giả loading thành0kết quả.
- Navigation có nhãn tiếng Việt, số có tên truy cập và `aria-current="page"`;
  tất cả nút type=button, dùng được bằng bàn phím, không submit form đang sửa.
- Kiểm chứng bản cập nhật18/11 xem checkpoint PAGINATION-C10 trong DEV_LOG.
  Browser CSR không thay bằng chứng hydration/thiết bị thật/live; xem DEV_LOG.
