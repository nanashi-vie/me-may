# Phân trang public và admin

Contract duyệt và triển khai local17/11/2026, theo ảnh user; màu đỏ đồng bộ web.
Bằng chứng, giới hạn và commit ở [DEV_LOG PAGINATION-C04–C07](DEV_LOG.md).

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
- Desktop tối đa7vị trí số/dấu chấm, không tính2mũi tên:
  `1 [2] 3 4 5 … 10`, `1 … 4 [5] 6 … 10`, `1 … 6 7 8 [9] 10`.
- Container≤440px hoặc viewport≤720px dùng tối đa5vị trí:
  `1 [2] 3 … 10`, `1 … [5] … 10`, `1 … 8 [9] 10`.
- Trong fieldset, tắt container containment để tránh Chromium mất layout flex
  sau đổi trang; vẫn thu gọn theo viewport. Context khác giữ container query.
- Chỉ một bộ nút hiện/nhận focus/được đọc bởi screen reader; bộ còn lại display:none.

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
- Đã kiểm local:410FE, SSR/Workers build, proxy và browser dữ liệu giả.
  Browser CSR không thay bằng chứng hydration/thiết bị thật/live; xem DEV_LOG.
