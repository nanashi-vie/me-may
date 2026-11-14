# Kiểm chứng switch sáng/tối public —14/11/2026

## Phạm vi và nguồn

User duyệt chỉ phần khách, Rive tải sau/HTML fallback; bổ sung bỏ hover.
File user cung cấp 14375-27096-d-to-n.riv, copy nguyên bản day-night.riv.
Contract ở [DESIGN](DESIGN.md#sángtối-public--duyệt14112026),
kiến trúc ở [ARCHITECTURE](ARCHITECTURE.md#rive-switch-và-theme-public--14112026).

## Kiểm tra tự động

- Baseline tại code/frontend: npm test58files/343tests PASS.
- Bản cuối npm test61files/356tests PASS;13tests mới cho persistence/storage
  denied/malformed, click trước mount, deferred import/reduced motion/failure,
  late destroy, latest input, Rive hover=false/coalescing/visibility/cleanup.
- Test RED trước triển khai; sửa assertion header admin cũ theo UI được duyệt.
- Regression input effect: luôn đọc signal trước optional animation; nếu không,
  sau mount Angular không theo dõi các lần đổi theme.
- Regression crop: Layout bounds là destination pixels; translate artboard500px
  để chỉ hiện vùng nút tròn124px. Không scale toàn artboard làm nút quá nhỏ.
- npm run build: PASS,0warning/error; HTML QA từ Node SSR trả200 và có dữ liệu.
- npm run build:workers và npm run check:workers:proxy: PASS;0warning/error
  ở build; proxy/workerd POST/query/cookie/CSRF/multipart/context PASS.

## Browser local và SSR

Playwright Chromium trên Mac, Node SSR4399 + API giả4321, không DB/live mutation.
Dev server4320 ban đầu không có backend nên503; chỉ dùng để inspect canvas,
không lấy503 đó làm bằng chứng SEO. Nghiệm thu trang dùng API giả/SSR riêng.

- Canvas pixel: trạng thái ngày/đêm khác nhau; hover/idle hash giữ nguyên.
  State machine input Click điều khiển, listener pointer tắt, Hover=false.
- File có transition60frames/30fps=2s. Idle entry không đồng nghĩa pose đã xong:
  cho settling1s sau entry rồi pause/stop bên ngoài draw. Pause ngay entry/twoRAF
  đóng băng pose cũ; stopRendering trong callback bị runtime requeue cuối draw.
- Click/Space/Enter/rapid/reload/route/detail/admin: PASS; không pageerror.
  Utility giữ nền rgb(179,38,53), admin body rgb(255,255,255).
- Responsive320/390/768/1440: PASS, switch44×44, không tràn header.
  Reduced motion0request Rive; chặn toàn bộ /rive/** vẫn đổi theme bằng fallback.
- Initial HTML home/detail có dữ liệu QA/OG/native switch; không cần runtime
  Rive trên server. Home/list/detail/contact/wishlist200, unknown404; detail
  có canonical/OG. Wishlist/admin có noindex qua HTML hoặc HTTP header.
  Admin dùng CSR nên initial title chung; sau browser render là title đăng nhập.

## Dung lượng và giới hạn

- canvas-lite2.50.0 exact, không có dependency con; không wrapper Angular.
- Rive lazy chunk≈223KB raw/~63KB gzip; WASM≈859KB raw/~353KB gzip;
  .riv11694bytes/~4.8KB gzip. Tổng tải sau≈420KB gzip; không gộp runtime vào
  initial bundle. Gzip là đo local bằng Python, không phải transfer production.
- WASM fallback≈355KB gzip, chỉ dùng khi runtime cần; không tải cả hai mặc định.
- Runtime/WASM/RIV self-host; không phụ thuộc CDN ngoài. CommonJS allowlist cho
  package UMD chính thức; không tăng budget hoặc tắt warning toàn bộ build.
- npm audit:18moderate/0high/0critical; không có finding Rive. Không tự audit fix
  dependency khác ngoài phạm vi. Lock chỉ bổ sung package Rive exact.
- Chưa chạy Lighthouse production, thiết bị iPhone/Android thật, RAM/pin hoặc
  benchmark chatbot. Chưa kết luận LCP≤2.5s/CLS≤0.1 từ smoke local.
- SSR mặc định light; lựa chọn máy đọc sau hydration, splash hiện hành vẫn giữ.
  Không cam kết không có đổi màu trong thời gian bootstrap khi reload dark.
- Nhân vật chatbot là phạm vi sau; chỉ chia sẻ runtime nếu tương thích renderer.
