# Thông báo khi máy chủ không phản hồi

Owner chốt 27/11/2026 (grill-me). Khi máy Dell mất điện hoặc tunnel đứt,
Cloudflare trả 530 cho `api.memaybooks.com`, còn Worker frontend vẫn chạy.
Mục tiêu: khách và admin nhận một thông báo thống nhất thay cho các khối lỗi
rời rạc.

## Phát hiện

- Tính là "máy chủ không phản hồi": HTTP 502, 504, 520–524, 530; 503 có
  `{"error":"backend_unavailable"}`; lỗi mạng hoặc timeout (status 0). Không
  tính 500 hay 503 khác (ví dụ image worker DOWN). Status 0 khi trình duyệt
  báo `navigator.onLine === false` cũng bỏ qua, vì là khách mất mạng.
- Interceptor Angular `outageInterceptor` (`core/outage/backend-status.ts`)
  ghi nhận lần đầu (giờ và mã) vào `BackendStatus`. Chạy cả SSR lẫn client;
  SSR chuyển trạng thái sang client qua TransferState để hydrate khớp.
- Proxy `/api/*` của Worker đổi 502/504/52x/530 của origin thành
  `503 {"error":"backend_unavailable","upstreamStatus":<mã gốc>}` kèm
  `Retry-After: 300`, `no-store`, không đẩy HTML lỗi của Cloudflare về trình
  duyệt. Lỗi mạng tới origin trả `upstreamStatus: 0`.
- Chưa có chế độ bảo trì bật thủ công; nếu cần sau này phải lưu cờ phía
  Cloudflare (biến môi trường hoặc KV) vì lúc đó backend đã chết.

## Màn public

- Mọi route ngoài `/admin` được thay toàn bộ bằng `app-outage-page`: chỉ còn
  logo, đám mây đang ngủ (SVG inline, không ảnh từ server), tiêu đề "Tiệm đang
  tạm nghỉ một chút", mô tả "Hệ thống Mẹ Mây đang được bảo trì. Tiệm sẽ mở
  lại sớm.", nút "Liên hệ với tiệm" mở `https://zalo.me/0703260005`
  (hardcode vì link Zalo trong DB không đọc được lúc này) và dòng phụ "Trang
  sẽ tự mở lại khi tiệm sẵn sàng · Thử lại ngay" (link không gạch chân).
- Theo theme sáng/tối khách đã chọn (`memay.theme.v1`); chuyển động tắt khi
  `prefers-reduced-motion`.
- SSR trả `503`, `Retry-After: 300`, `Cache-Control: no-store`,
  `X-Memay-No-Cache`, title "Tiệm tạm nghỉ | Mẹ Mây", robots `noindex`.
- Cứ 30 giây gọi `GET /api/v1/cache-policy`; khi thành công thì tải lại
  trang. "Thử lại ngay" gọi kiểm tra đó ngay.

## Admin

- Admin giữ nguyên trang và có banner cố định trên cùng: "Máy chủ không phản
  hồi từ HH:mm (mã N) — thay đổi chưa lưu sẽ không gửi được. Trang tự kết nối
  lại." kèm nút "Thử lại". Banner ẩn khi kiểm tra 30 giây thành công.
- Guard admin chỉ đẩy về `/admin/dang-nhap` khi không có phiên (401) hoặc lỗi
  khác; lỗi outage giữ admin ở trang, không xóa phiên/CSRF. Dữ liệu vẫn do
  backend kiểm quyền nên không lộ gì khi guard cho qua.
- Trang đăng nhập không tự gọi API khi mở; banner hiện sau lần gửi đăng nhập
  đầu tiên gặp outage.

## Kiểm chứng 27/11/2026

- `npm test` (code/frontend): 632/632; spec mới `backend-status.spec.ts`,
  `outage-page.spec.ts`, `app.outage.spec.ts`, ca guard và Worker 530.
- `npm run build:workers` rồi `wrangler dev` local với `MEMAY_API_ORIGIN` trỏ
  tới origin giả trả 530: `/api/v1/books` → 503 JSON `upstreamStatus: 530`,
  `Retry-After: 300`; `/`, `/sach`, `/lien-he` → 503, title/robots/no-store
  đúng, màn tạm nghỉ trong HTML; trình duyệt không lỗi console. Bật lại origin
  rồi bấm "Thử lại ngay" → trang tự tải lại thành "Tất cả sách".
  `/admin/sach` giữ nguyên trang với banner "(mã 530)".
- Chưa kiểm trên môi trường thật (cần một lần Dell tắt thật hoặc tắt tunnel có
  chủ đích) và chưa kiểm Safari iPhone.
