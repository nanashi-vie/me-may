# Tiến độ Mẹ Mây

Cập nhật 06/11/2026 (Asia/Ho_Chi_Minh). Đọc [chỉ mục](README.md) và checkpoint mới nhất
[DEV_LOG](DEV_LOG.md); đây là snapshot theo bằng chứng đã ghi, không là kiểm tra live mới.

## Sao chép mobile và markup detail — đã sửa local06/11/2026

- S044: ClipboardItem promise khởi tạo write ngay click, giữ revalidation; fallback
  chọn đầy đủ nội dung. Gỡ p/h2 rỗng theo localedit user, giữ description.
- Frontend221PASS; SSR/Workers/proxyPASS; reviewer0finding. WebKitmobile copy/paste
  detail/wishlist và offline guard PASS. Chưa kiểm iPhone vật lý hoặc deploy.
- Bằng chứng CONTACT_VERIFICATION; source5844b4e đã pushdev, user merge main/deploy.

## 8ảnh, lưu/xuất bản và đặc điểm sách — triển khai local06/11/2026

- Sáu ảnh công khai + hai nội bộ; backend lọc mọi projection và direct INTERNAL404.
- Save-only mới/Ẩn giữARCHIVED, mọiẨn được thiếuweight; atomic save+publish và
  mediaMetadata/features/audit/version cùngtransaction, publishedAt giữ lần đầu.
- 0–3tags theoorder, card tagđầu/detail tấtcả; importV1–V4/fingerprint cũ giữ nguyên.
- Backend227run/0failure/0error/3live skip, frontend217PASS; SSR/Workers/proxyPASS.
  Reviewer3Important đã sửa và regression; browserChrome desktop/390px đã kiểm
  8ảnh/public6/internal404/save-only/publish/hide/priority/PUTlost-response.
- QA đã dọn, schema/cổng/browser đóng; source15d1138 trên dev, bàn giao/push theo
  workflow. Chưa migrate/deployproduction; user merge main và cho phép rolloutV15.
  ContractCATALOGUE/DATA/DESIGN, rolloutBOOK_ENTRY_ROLLOUT; checkpointS043.

## Import Excel8cột/đơn giá optional — đã triển khai06/11/2026

- User bổ sung don_gia_kg optional vào7cột rút gọn: có số thì tính/lưu hai giá,
  trống/bỏ cột vẫn được. NXB/tác giả/mô tả optional, sáchẨn/Tiếng Anh/tồn1.
- File7/16/20cột và receipt cũ giữ nguyên, không ghi đè sau edit. Chủ vẫn sửa
  đơn giá/hai giá khi thêm ảnh, thiếu giá không xuất bản; không tự gộp tên.
- Backend219run/0failure/0error/3live-provider skip, frontend201PASS, SSR/Workers/
  proxyPASS. V4 realHTTP/DOM tests và review độc lập không finding; chưa browser/
  deviceV4 mới. BrowserV3 trước đó đã kiểm, QA schema/services đã dọn.
- Không tạo file hướng dẫn/workbook giao riêng; workbookV2 gốc không đổi.
  [Contract](BOOK_IMPORT.md), [schema](DATA.md#format-file-import--contract-duyệt31102026),
  [bằng chứng](BOOK_IMPORT_VERIFICATION.md). Không migration/dependency/deploy.
- Checkpoint S042-C15; source3d5894a trên dev; user merge/deploy. Bước tiếp theo
  rollout backendV4 trước frontend, smoke file8cột có/không đơn giá online.

## Đơn giản hóa nhập sách — đã triển khai local06/11/2026

- User duyệt và đã thực thi tuần tự: tồn gộp/tự tăng, giữ ID/storage legacy;
  bỏ hai field tình trạng và khối public, ghi chú nội bộ **optional** giữ note cũ.
- Đơn giá/kg optional × gram → giá từ; giá đến +15%, làm tròn lên1.000đ;
  sửa tay được, load/upload không tính lại. Trùng tên chỉ cảnh báo, vẫn lưu/publish.
- Backend clean verify199run/0failure/0error/3live-provider skip, frontend192test,
  SSR/Workers/proxy, Chrome desktop/mobile, migrationV13→V14 và schema restore QA
  PASS. Review độc lập0Critical/0Important/0Minor; source/runtime QA đã dọn.
- Contract ở DATA/CATALOGUE/DESIGN/ARCHITECTURE/BOOK_IMPORT; bằng chứng tại
  [BOOK_ENTRY_VERIFICATION](BOOK_ENTRY_VERIFICATION.md#nhập-sách-tồn-gộp-và-ghi-chú-nội-bộ--06112026).
  [RolloutV14](BOOK_ENTRY_ROLLOUT.md) cần backend trước frontend, purge cache và
  giữ privacy khi rollback. Chưa migrate/deploy dữ liệu thật; gate release giữ mở.
- Checkpoint S041-C13 trong DEV_LOG. Hoàn tất trên dev theo workflow commit/push;
  user merge main/deploy. Spec/plan đã gộp và gỡ, không còn việc triển khai S041.

## Box tiện ích & Popup "Cách hỏi mua sách" — 06/11/2026 (trên worktree dev-ui)

- Hoàn thiện 4 box tiện ích chuẩn mẫu IPM và gắn Popup hướng dẫn hỏi mua sách khi click "CÁCH HỎI MUA SÁCH":
  - Modal dialog `<dialog>` HTML5 bo góc 20px, bóng đổ mềm, backdrop mờ, nút đóng ✕ góc phải và nút "Đã hiểu" ở chân.
  - Header có hình minh họa liên hệ dạng tròn (120px desktop / 95px mobile) kèm tiêu đề "Cách hỏi mua sách tại Mẹ Mây" font Baloo 2 đỏ thương hiệu `#9B1C28`.
  - 4 khung thẻ timeline dọc liên tiếp nối bằng đường line dọc:
    - B1: Thêm sách vào “Danh sách quan tâm”
    - B2: Vào “Danh sách quan tâm” chọn sách cần kiểm tra video tình trạng thật
    - B3: Bấm “Chuẩn bị nội dung hỏi mua”
    - B4: Gửi tin nhắn qua Zalo Hotline (Sao chép nội dung ➔ Mở Zalo ➔ Dán & gửi)
  - Vitest 42/42 test files (231/231 tests PASS, thêm test suite `how-to-buy-dialog.spec.ts`); build SSR và Workers 0 warning, 0 error.
  - CDP headless visual test chụp `how-to-buy-dialog-desktop.png` (1280px) và `how-to-buy-dialog-mobile.png` (390px) xác nhận chuẩn visual. Chưa merge vào `dev`.

## Danh sách quan tâm & Kệ sách cùng NXB, cùng Thể loại ở Chi tiết sách (đã gộp vào dev 06/11/2026)

- Đã hoàn tất trên worktree `dev-ui` và gộp vào `dev`:
  - Cập nhật nhãn CTA lưu sách rõ ràng: `♡ Thêm vào danh sách quan tâm` (khi đã lưu đổi thành `♥ Đã thêm vào danh sách`); đổi header public layout thành `Danh sách quan tâm` kèm badge số lượng.
  - Bổ sung 2 kệ sách liên quan dưới trang chi tiết `/sach/:slug`: `SÁCH CÙNG NHÀ XUẤT BẢN` và `SÁCH CÙNG THỂ LOẠI` với đường kẻ ngang phân cách hai bên tiêu đề.
  - Carousel ngang desktop 5 thẻ `app-book-card` kèm nút trượt `<` / `>`, tablet 3 thẻ, mobile 2 thẻ hoặc vuốt mượt mà; link `Xem thêm >>` góc phải dẫn tới `/sach?q={publisher}` hoặc `/sach?category={code}`; fallback thông báo rõ khi rỗng.
  - Backend cung cấp endpoint `GET /api/v1/books/{slug}/related` và mở rộng tìm kiếm `q` khớp cả Nhà xuất bản.
  - Fix type inference & generic ambiguities cho Language Server: kiểu dữ liệu tường minh `List<RelatedTarget>`, `List<Book>`, `List<Timestamp>`, explicit cast varargs.
  - Kiểm chứng: Vitest 37/37 files (189/189 tests PASS), backend integration tests PASS, `npm run build` và `npm run build:workers` hoàn tất 0 warning, 0 error.
## CI/CD Dokploy — 05/11/2026

- Theo ngoại lệ user duyệt: sửa workflow trực tiếp main, thêm API deploy sau GHCR
  publish thành công; PR/dev không deploy. YAML/shell và8ca request giả PASS.
- Cần Actions secrets DOKPLOY_URL/API_KEY/APPLICATION_ID và source Docker
  `ghcr.io/nanashi-vie/me-may-api:main`; hướng dẫn tại DEPLOYMENT.
- Chưa xác minh secret/live deployment. API2xx chỉ nhận yêu cầu, không là đã deploy.

## Rà soát project — 05/11/2026

- Frontend187/187; backend183run/0failure/0error/3live-provider skip; SSR/Workers
  build, proxy workerd, Wrangler dry-run và11test tooling Python đạt.
- Audit: production0, toàn cây16moderate từ glob/minimatch trong dev tooling;
  chưa sửa dependency. Theo dõi cập nhật tương thích, không downgrade Angular
  theo gợi ý audit. Kết quả/bằng chứng/giới hạn ở DEV_LOG S040-C02.
- Workflow chỉ có main do commit trực tiếp, chưa từng bị xóa khỏi dev. Dev không
  cần file để chạy app; khuyến nghị đồng bộ file, giữ publish main. Chưa đổi CI.
- Docs đã sửa host/CI/repository và thêm rollout V13; chưa smoke live, kiểm thiết
  bị thật hoặc đóng gate release. Chênh lệch local preview trên main cần xem riêng.

## Logo mở trang — 05/11/2026

- Đã sửa trên worktree dev: logo luôn hiện400ms khi mở/reload rồi fade120ms,
  kể cả HTML SSR/cache đã có sẵn. 186test, SSR/Workers/proxy và browser QA đạt.
  Chờ user merge main/deploy bản logo mới.
- Đã xóa `README.md` ở root theo yêu cầu user, gộp phần lệnh chạy/test local và
  bảng Auth M1 vào [ARCHITECTURE](ARCHITECTURE.md#chạy-local-kiểm-tra-và-auth-m1),
  cập nhật toàn bộ liên kết tại `docs/README.md`, `AGENTS.md`, `MASTER_PLAN.md`,
  `VERIFICATION.md` và `code/backend/run-local.sh`.

## Cache public và trạng thái tải — 04/11/2026

- Đã triển khai local cache trang chủ/ảnh, giảm request lặp, logo bootstrap và
  skeleton. Frontend184/184, backend verify182run/3live skip và13test sau review
  đạt; SSR/Workers/proxy/workerd/browser QA đạt.
- User05/11 xác nhận cache đã ổn. Quy trình cấu hình/đo/smoke online theo
  [DEPLOYMENT](DEPLOYMENT.md#cache-public--cấu-hình-và-smoke-04112026).
  Cache edge tự giữ no-store nếu backend chưa có cấu hình purge.
- Purge toàn zone, dữ liệu cũ có thể còn tối đa30s. Bằng chứng ở
  [VERIFICATION](VERIFICATION.md#cache-public-và-trạng-thái-tải--04112026).

## Homelab Dell và kiểm tra API — 04/11/2026

- User xác nhận đã chọn Dell cũ làm homelab, Spring Boot qua Dokploy/network và
  Cloudflare Tunnel; API chính thức `https://api.memaybooks.com`. Không tiếp tục
  coi Render là đích backend hiện hành; các hướng dẫn Render/Neon cũ là lịch sử,
  chưa xác minh database/profile/revision thực tế trên Dell.
- Live GET health/taxonomy/CSRF trên API đạt200; cookie phiên Secure/HttpOnly/
  SameSite=Lax/Path=/api. OPTIONS login với Origin frontend trả401, chưa mở CORS.
- Angular browser dùng `/api` cùng origin qua Worker, không cần mở CORS cho luồng
  này. Đã đổi `wrangler.jsonc` production sang API homelab theo yêu cầu user;
  Workers build/Wrangler dry-run đạt, binding API đúng hostname. User merge/deploy
  rồi smoke; chưa thay cấu hình live.
- Proxy frontend live `/api/v1/taxonomy` trả503 sau70,38s (`backend_unavailable`);
  chưa xác nhận target Worker live hoặc login/CRUD/upload qua homelab.

## Tên miền — 03/11/2026

- SETUP-05 đã cấu hình Custom Domain và SSR origin `https://memaybooks.com` trên dev.
- 172 test frontend, Wrangler dry-run và proxy workerd đạt. Còn kích hoạt zone Cloudflare,
  merge/deploy và kiểm tra HTTPS, SSR, đăng nhập, link hỏi sách trên tên miền mới.
  Xem [hướng dẫn triển khai](DEPLOYMENT.md#1-cloudflare-workers-git-integration).

## Hướng hiện tại — đóng phạm vi tính năng, chuyển tối ưu giao diện

User muốn khép phần xây tính năng MVP tại đây để tối ưu UI. Giữ chức năng hiện có,
không mở thêm feature trong lần tổng hợp này. Chưa đánh dấu nghiệm thu release/
production vì các gate kỹ thuật dưới đây chưa đủ bằng chứng. Chưa thiết kế/code UI mới. Điều chỉnh format importV2 user yêu cầu sau đó được
ghi riêng bên dưới, không mở lại phạm vi tính năng khác.

- Import CSV/XLSX tạoẨn→thêmảnh→OWNERpublish, tồn riêng theo
  biến thể, upload đứng đầu editor và hướng dẫn import ngắn đã triển khai local.
- Backend178run/0failure/0error/3live-provider skips; frontend169/169; NodeSSR/Workers/
  proxy/SSR và browserQA có bằng chứng tại các file kiểm chứng; lần đổi copy cuối
  chạy169frontend và Workersbuild. Không coi các kết quả này là smoke online mới.
- Pilot21/21 và các ca chức năng user đã báo test xong được giữ; không yêu cầu nhập
  lại sách hoặc lặp toàn bộ M2/M3/M4. Thiết bị/case chưa có biên bản chỉ ghi thiếu
  bằng chứng chi tiết, không tự chuyển ca đã được user xác nhận sang FAIL.
- Đã dọn7DB QA/restore tạm và10asset của QA import; giữdev/test/postgres, backupdump
  và media production. QA/browser đã dừng. Các DBscratch trong log cũ không còn.

## Tối ưu UI quản trị — Hệ thống Input Field, Bố cục Form, Sidebar Modern Clean và nút Quản trị Public (trên worktree dev-ui 06/11/2026)

- Đã hoàn tất trên worktree `dev-ui`:
  - Nhãn cố định trên viền trên (Notched / Cutout border, nền trắng che viền), focus màu xanh tím Indigo (`#4F46E5`), bo góc 8px, chiều cao ô 46px.
  - Dropdown select có custom chevron SVG (`∨`), trạng thái lỗi viền đỏ (`#D92D20`) + nhãn đỏ + icon cảnh báo tam giác (⚠️) góc phải + helper text đỏ.
  - Áp dụng toàn bộ `/admin`: Thêm/Sửa sách (`book-editor`), Đăng nhập (`login`), Bộ lọc sách (`book-list`), Flash Sale, Bộ sưu tập (`collection-list`), Import (`book-import`).
  - Tối ưu bố cục form nhập sách (`book-editor`): thu gọn `.book-form` `max-width: 780px` (grid 20 cột); Hàng 1: Tên sách (~75%) - ISBN (~25%); Hàng 2: NXB (40%) - Tác giả (35%) - Ngôn ngữ (25%); Hàng 3: Thể loại (40%) - Tình trạng (30%) - Trọng lượng (30%); Hàng 4: Giá từ (~220px) - Giá đến (~220px); Tồn kho đơn biến thể gọn 150px; Trình độ đọc (35%) - Video URL (65%); xóa câu mô tả thừa tại panel ảnh.
  - Custom Dropdown Popover (Thể loại, Đánh giá tình trạng, Trình độ đọc tham khảo): menu xổ xuống nền sáng `#FFFFFF`, bo góc `10px`, dấu `✓` bên phải; mục `Picture book ›` xổ menu con `[Paperback, Hardcover]` sang phải, chọn xong hiển thị `Picture book · Paperback` (hoặc `Hardcover`) và bỏ cụm radio kiểu bìa rời.
  - Sidebar `/admin` Accordion Tree View: rộng 240px, nền be kem `#FBF8F2`, viền phải `#E8E2D8`, logo Mẹ Mây Baloo 2 đỏ. Mục "Tổng quan", mục cha "Quản lý sách" dạng accordion có mũi tên xoay `v` / `>` (mặc định mở sẵn) chứa các mục con clean text thụt lề có đường kẻ dọc tree-line: "Sách", "Bộ sưu tập", "Flash sale" (chỉ hiện cho OWNER). Active item có nền đỏ pastel `#FDE8E8`, chữ đỏ đậm `#9B1C28`, bỏ đường viền nhỏ bên trái (`border-left`). Đáy sidebar có thẻ tài khoản (avatar tròn chữ cái đầu, email, role badge) và nút Đăng xuất.
  - Nút quay về `/admin` trên trang public (`/` và toàn site): desktop nằm ở header cạnh "Nhắn tiệm ↗", mobile nằm cuối menu trượt; nhận diện phiên đăng nhập để chuyển thẳng `/admin` (khi đã login) hoặc `/admin/dang-nhap`.
  - Kiểm chứng: Vitest 38/38 files (194/194 tests PASS), `npm run build` và `npm run build:workers` (0 warning), Visual QA qua headless Chrome CDP đạt 100%.

## Box tiện ích & hỗ trợ dưới banner trang chủ (trên worktree dev-ui 06/11/2026)

- Đã hoàn tất trên worktree `dev-ui`:
  - 4 box tiện ích theo phong cách IPM đặt ngay dưới banner Hero: "Ưu đãi vận chuyển" (icon xe tải 🚚), "Cách hỏi mua sách" (icon tin nhắn 💬), "Cộng đồng Mẹ Mây" (icon nhóm 👥, link Group Zalo từ `contactConfig.groupUrl`), "Hotline hỗ trợ" (icon điện thoại 📞 kèm 2 số `0966 075 005` và `0703 260 005` link `tel:` trực tiếp).
  - Responsive: Desktop 4 cột thẳng hàng (`repeat(4, 1fr)`), Mobile lưới 2x2 (`repeat(2, 1fr)`) cân đối, dễ chạm bấm.
  - Tông màu đỏ thương hiệu Mẹ Mây `#9B1C28`, nền trắng bo góc 12px viền `#E8E2D8`, hover nổi nhẹ. Hai box đầu sẵn sàng tích hợp popup ở giai đoạn 2.
  - Kiểm chứng: Vitest 40/40 files (204/204 tests PASS), `npm run build` và `npm run build:workers` hoàn tất 0 warning 0 error, Visual QA Chrome headless CDP (Desktop 1280px & Mobile 390px) đạt 100%.

## Tối ưu UI — chi tiết sách gom ảnh + nút, khung BookCard, thể loại Kinh Thánh và bộ font Baloo 2 + Nunito (đã triển khai 04/11)

- `/sach/:slug`: một ảnh lớn + thumbnail, `Quan tâm`/`Liên hệ` dưới ảnh (sticky desktop, thanh dưới mobile), bộ chọn biến thể lên trên mô tả; `Liên hệ` nhắc chọn biến thể thay vì bị khóa. Đổi `VNĐ` → `đ` toàn bộ UI/tài liệu hiện hành; thêm nhãn `(nếu có)` cho Nhà xuất bản/Tác giả và sửa header mobile `390px` cho icon `♡ + badge`.
- Đã hoàn tất và gộp vào `dev`: cố định khung `.cover-link` tỉ lệ `4:5` (`grid-template-rows: minmax(0, 1fr); overflow: hidden; flex-shrink: 0`) kèm viền `1px solid var(--line, #ddd7ce)` cho `.book-card` để các thẻ ảnh dọc/ảnh ngang thẳng hàng ngang tuyệt đối; thêm thể loại dùng chung thứ 9 `Kinh Thánh` (`BIBLE`, slug `kinh-thanh`, `sort_order=8`) qua Flyway `V13`, importer CSV/XLSX và taxonomy frontend/backend.
- Đã hoàn tất và gộp vào `dev`: cấu hình bộ font self-hosted `.woff2` (`Baloo 2` độ đậm 700 cho tiêu đề public `.brand-name`, `h1`, `h2`; `Nunito` cho body, tên sách trên thẻ, giá, nút bấm, thanh menu và toàn bộ trang Admin; cache `immutable` 1 năm trên Worker). Kiểm chứng ở [VERIFICATION](VERIFICATION.md#gom-ảnhnút-chi-tiết-sách-khung-bookcard-thể-loại-kinh-thánh-và-font-baloo-2--nunito--04112026).

## Tối ưu UI — Flash Sale banner, đếm ngược 3 ô, badge -% và chi tiết sách (đã triển khai 03/11)

- Đã hoàn tất trên `dev` sau khi chốt qua grill-me (6 câu):
  1. Helper `discountPercent(book)` tính `Math.round((1 - salePriceVnd / priceMaxVnd) * 100)` và `countdownParts(ms)` tách `[HH, MM, SS]` (`catalogue-state.ts`).
  2. Home Flash Sale: nền đỏ cam `#ff625c` tràn 100vw kèm họa tiết tia sét chìm nhẹ hai bên, nội dung trong khung `.wrap`; thanh tiêu đề trắng gồm `FLASH ⚡ SALE` + `Kết thúc trong` + 3 ô đen bo tròn (`HH : MM : SS`, dấu `:` nằm ngoài) + `Xem tất cả ›` màu xanh dương đậm không gạch chân.
  3. Trang `/flash-sale`: đồng bộ 3 ô đếm ngược `HH : MM : SS`.
  4. `BookCard` và `BookDetail`: hiển thị badge `-XX%` cạnh giá sale; riêng `BookDetail` khi đang Flash Sale có thanh đỏ cam chứa khung trắng `FLASH ⚡ SALE` + 3 ô đếm ngược và hàng giá `Giá sale · Giá gốc gạch ngang · -XX%` theo mẫu.
  5. Kiểm chứng: Vitest 37/37 file (174/174 test) PASS, Node SSR build + Workers build (0 warning) + `check:workers:proxy` PASS, Chrome headless 1280px & 390×844 PASS ([VERIFICATION](VERIFICATION.md#tối-ưu-ui-flash-sale-home-flash-sale-bookcard-sachslug--03112026)).

## Tối ưu UI — navbar và trang danh sách sách (đã triển khai 02/11)

- Đã hoàn tất trên `dev`: navbar desktop IN HOA căn giữa (`Trang chủ · Tất cả sách ▾ · Flash Sale · Bộ sưu tập ▾ · Cách mua · Liên hệ`, dropdown 8 thể loại/bộ sưu tập mở bằng hover/focus/nút `▾`, Escape trả focus); mobile (≤720px) ẩn utility, header ☰/logo/♡ + search full-width (`placeholder="Bạn đang tìm…"`, đồng bộ `q`), sidebar `<dialog>` đỏ accordion.
- Trang `/sach` và `/bo-suu-tap/:slug`: cột `DANH MỤC` link thể loại + `Độ tuổi` checkbox kèm nút Áp dụng, tiêu đề/`<title>` theo thể loại, select `Sắp xếp theo:` áp ngay, chip `Tất cả · Paperback · Hardcover` dưới tiêu đề Picture book, thanh `Kết quả cho “q” ✕ Xóa`; mobile chuyển thành 2 hàng chip cuộn ngang (cao ≥44px).
- Kiểm chứng: Vitest 37/37 file (172/172 test) PASS, Node SSR build + Workers build + `check:workers:proxy` PASS, Chrome headless 1280px/820px/390×844 PASS ([VERIFICATION](VERIFICATION.md#tối-ưu-ui-navbar-và-trang-danh-sách-sách--02112026)). Spec tạm đã gộp vào [DESIGN](DESIGN.md) và gỡ.

## Chuẩn hóa cấu trúc frontend External Template (đã triển khai 02/11)

- Đã hoàn tất trên `dev`: gom 20 page/layout/component nghiệp vụ vào thư mục con `<tên>/<tên>.{ts,html,scss,spec.ts}` (giữ tên ngắn Angular 20); tách `.html` + `.scss` cho các component đang để inline (`public-layout`, `book-audit-panel`, `book-status-actions`, `book-card`, `contact-dialog`, `flash-sale-page`, `flash-sale`); tách `.html` không cần `.scss` cho `admin-layout`, `login`, `contact-page` và bỏ `app.scss` rỗng; giữ Inline Template cho 5 component trình bày nhỏ (`overview`, `not-found`, `public-page`, `public-error`, `wishlist-button`).
- Kiểm chứng: Vitest 37/37 file (172/172 test) PASS, Node SSR build + Workers build (0 warning) + `check:workers:proxy` PASS; quy ước gộp vào [ARCHITECTURE](ARCHITECTURE.md#trách-nhiệm-và-phụ-thuộc).

## Import V2 và hai thể loại — đã triển khai local01/11

-16cột/mỗi dòng=một sáchẨn/defaultTiếngAnh/tồn1; nhãn dễđọc/code/aliasheader;
  V1/20cột và digest/receipt cũ giữ retry. OWNER thêmảnh/sửa tồn/biếnthể rồi publish.
- V12 thêm Tập đọc và Nấu ăn - thủ công - activity book vào taxonomy chung, form,
  publicfilter và importer; giữ6categorycũ/sáchcũ. Chưa migrateonline/dev trongphiên.
- Backend178run/0failure/0error/3skip, frontend169/169, NodeSSR/Workers/proxyPASS;
  browserUI với mockAPI và realDB/fakeproviderintegrationảnh→variants→publishPASS.
- Review0Critical/0Important/1Minor: sparseXLSXfixture/errorrow thiếuregression riêng,
  defer; không giả là đãtest. Workbookuser không đổi; browser/SSRQA riêng đãdừng.
- [Contract](BOOK_IMPORT.md#format-v2--chốt0111), [bằng chứng](BOOK_IMPORT_VERIFICATION.md#importv2-và-thể-loại-chung-01112026).
  Code/QA local đã pushdev tới fdd06f5; online rollout/backupV12 và smokeV2 tiếp tục theoDEPLOYMENT.

## Gate tồn đọng — tổng hợp01/11

| Gate | Bằng chứng còn thiếu / điều kiện đóng |
|---|---|
| Rollout bản hiện hành | Chưa có xác nhận online candidateV6–V14 và frontend/backend đồng bộ; backup/counts/fingerprint/sequence trước migration, dừng ghi khi đổi payloadvariants; smoke origin/canonical/enquiry sau entryadmin và public, OWNER/STAFF/media/tồn/retry sau deploy |
| Backfill ảnh public |63ACTIVE media mới dryrunpending63, chưaapplyv2 đủ320/640×JPEG/WebP; verify MIME/magic/dimensions trước frontendpicture, không dùng checkpointJPEG640 cũ |
| Hiệu năng public |Lighthouse Mobile3run mỗi Home/detail cố định/wishlist; từngrun LCP≤2,5s/CLS≤0,1; detail lần đo online cuối FAIL, wishlist cóoutlier; sourcefix local chưa có đo lại online, cold Render/Neon đo riêng |
| Backup vận hành |Dump21sách/63mediarefs đãrestorelocal và nguồn63JPG verify; còn lịch backup/retention/người phụ trách/bản saooffhost và bằng chứng khôi phục theo chính sách đó; scratchrestore cũ đã xóa theo user |
| Rollback release |Chưa drill rollback app/schema/data có kiểm soát, đối chiếu ghi phát sinh và recovery media; dashboardrollback/localrestore đơn lẻ chưa đủ |
| Hardening/hosting |RuntimeDBrole tối thiểu/tách migrationrole, loginratelimit và review cấu hình runtime/secrets; quota/pool/connection/memory/load; productionVPS/Dokploy/privateJDBC/HTTPS chưa nghiệm thu, Render/Neon hiện là testhost |
| Quy mô/thiết bị/bàn giao |Bộ50–100listing tải/publicpaging chưa đủ bằng chứng (import100 không thay publicload); ghi rõ iPhoneSafari/AndroidChrome/in-app nào đã thử, smoke nhánh bị UI mới tác động; ownerdemo/thời gian nhập-tìm-sửa và hướng dẫn vận hành ngắn cần rà soát |
| Hiệu năng nhập/publish |QAhost cùngrevision/DBmedia cáchly;5vòng2/6ảnh warm, cold riêng, safeHAR/structuredtiming/Neonquota-pool-lock; local đã5vòng nhưng không thay targethost;1Minor edittiming thiếu selectedAt còndefer |
| Import online (ngoài gate MVP gốc) |V11receipt/V12category rollout/backuprestore; QAworkloadV1=100sách/500variants,V2=100sách/100variants trênQAhost: timeout/retry/peakheap-RSS/quota/lock; một mẫu local1,56s không đủ median/p95; quota hiện memory mỗiinstance |

Nguồn: [VERIFICATION](VERIFICATION.md#m5-pilot-và-link-hỏi-sách--28102026),
[DEPLOYMENT](DEPLOYMENT.md#rollout-contract-m5-chưa-chạy-online),
[hiệu năng nhập/publish](BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md#gate-còn-mở),
[import](BOOK_IMPORT_VERIFICATION.md#gate-chưa-chạy).

## Thứ tự xử lý khi quay lại nghiệm thu

1. Chuẩn bị backup/restore và kế hoạch rollback; rollout backend/migration/backfill
   rồi frontend tương thích theo DEPLOYMENT, user merge/deploy theo workflow.
2. Smoke bảo mật/dữ liệu/SEO và hoàn tất recovery/hardening cần cho release.
3. Sau khi UI ổn định, đo lại Lighthouse/thiết bị/publicload trên bản cuối để tránh
   đo lại nhiều lần. TargetQA upload/import tiếp tục là các gate riêng.
4. VPSQA chỉ đối chứng nếu vẫn chậm sau đo Renderwarm; parallel upload/eagerasync,
   giảmderived hoặc collection-heavy batching chưa là việc bắt buộc phải triển khai.

## Tài liệu cần đọc và Git

- [MASTER_PLAN](MASTER_PLAN.md#9-definition-of-done--nghiệm-thu-mvp): DoD và giới hạn;
  [DESIGN](DESIGN.md): UX hiện hành; [DATA](DATA.md): field và tồn/biến thể.
- [CATALOGUE](CATALOGUE.md) giữ contract quản trị/media hiện hành; các spec/plan
  M2/M5/hiệu năng cũ đã gộp/gỡ01/11. Chỉ theo gate chưa xong ở bảng trên và
  [DEPLOYMENT — quy trình đo](DEPLOYMENT.md#quy-trình-đo-qa-còn-phải-thực-hiện).
- [BOOK_IMPORT](BOOK_IMPORT.md)/[BOOK_IMPORT_VERIFICATION](BOOK_IMPORT_VERIFICATION.md):
  contract/schema/hướng dẫn/bằng chứng và gate rolloutV11.
- Chỉ commit/pushdev; user merge main/deploy. Không đọc/mutate live trong lần tổng
  hợp này, không kiểm quota hoặc tái xác minh revision/schemaonline; không coi
  trạng thái từ phiên trước là kiểm tra live01/11.
