# Tiến độ Mẹ Mây

# Tiến độ Mẹ Mây

Cập nhật 06/11/2026 (Asia/Ho_Chi_Minh). Đọc [chỉ mục](README.md) và checkpoint mới nhất
[DEV_LOG](DEV_LOG.md); đây là snapshot theo bằng chứng đã ghi, không là kiểm tra live mới.

## Đơn giản hóa nhập sách — thiết kế chờ duyệt 06/11/2026

- User chọn tồn gộp/tự tăng tồn, giữ cấu trúc biến thể bên trong để tương thích;
  bỏ tình trạng public/form, ghi chú nội bộ optional giữ mô tả cũ.
- Đơn giá/kg × gram → giá từ; giá đến +15%, làm tròn lên 1.000đ; hai giá sửa được.
  Trùng tên chỉ cảnh báo theo style hiện tại, vẫn lưu/publish được.
- [Thiết kế](BOOK_ENTRY_SIMPLIFICATION_DESIGN.md) đã qua builder check, chờ user
  duyệt các đề xuất chi tiết trước lập plan/code. Không đổi baseline/runtime.
- Checkpoint S041-C02 trong DEV_LOG. Tài liệu trên dev, chưa push/deploy.

## Danh sách quan tâm & Kệ sách cùng NXB, cùng Thể loại ở Chi tiết sách (đã gộp vào dev 06/11/2026)

- Đã hoàn tất trên worktree `dev-ui` và gộp vào `dev`:
  - Cập nhật nhãn CTA lưu sách rõ ràng: `♡ Thêm vào danh sách quan tâm` (khi đã lưu đổi thành `♥ Đã thêm vào danh sách`); đổi header public layout thành `Danh sách quan tâm` kèm badge số lượng.
  - Bổ sung 2 kệ sách liên quan dưới trang chi tiết `/sach/:slug`: `SÁCH CÙNG NHÀ XUẤT BẢN` và `SÁCH CÙNG THỂ LOẠI` với đường kẻ ngang phân cách hai bên tiêu đề.
  - Carousel ngang desktop 5 thẻ `app-book-card` kèm nút trượt `<` / `>`, tablet 3 thẻ, mobile 2 thẻ hoặc vuốt mượt mà; link `Xem thêm >>` góc phải dẫn tới `/sach?q={publisher}` hoặc `/sach?category={code}`; fallback thông báo rõ khi rỗng.
  - Backend cung cấp endpoint `GET /api/v1/books/{slug}/related` và mở rộng tìm kiếm `q` khớp cả Nhà xuất bản.
  - Fix type inference & generic ambiguities cho Language Server: kiểu dữ liệu tường minh `List<RelatedTarget>`, `List<Book>`, `List<Timestamp>`, explicit cast varargs.
  - Kiểm chứng: Vitest 37/37 files (189/189 tests PASS), backend integration tests PASS, `npm run build` và `npm run build:workers` hoàn tất 0 warning, 0 error.

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

## Tối ưu UI quản trị — Hệ thống Input Field và bố cục Form nhập sách (đã gộp vào dev 05/11/2026)

- Đã hoàn tất trên worktree `dev-ui` và gộp vào `dev`:
  - Nhãn cố định trên viền trên (Notched / Cutout border, nền trắng che viền), focus màu xanh tím Indigo (`#4F46E5`), bo góc 8px, chiều cao ô 46px.
  - Dropdown select có custom chevron SVG (`∨`), trạng thái lỗi viền đỏ (`#D92D20`) + nhãn đỏ + icon cảnh báo tam giác (⚠️) góc phải + helper text đỏ.
  - Áp dụng toàn bộ `/admin`: Thêm/Sửa sách (`book-editor`), Đăng nhập (`login`), Bộ lọc sách (`book-list`), Flash Sale, Bộ sưu tập (`collection-list`), Import (`book-import`).
  - Tối ưu bố cục form nhập sách (`book-editor`): thu gọn `.book-form` `max-width: 780px` (grid 20 cột); Hàng 1: Tên sách (~75%) - ISBN (~25%); Hàng 2: NXB (40%) - Tác giả (35%) - Ngôn ngữ (25%); Hàng 3: Thể loại (40%) - Tình trạng (30%) - Trọng lượng (30%); Hàng 4: Giá từ (~220px) - Giá đến (~220px); Tồn kho đơn biến thể gọn 150px; Trình độ đọc (35%) - Video URL (65%); xóa câu mô tả thừa tại panel ảnh.
  - Custom Dropdown Popover (Thể loại, Đánh giá tình trạng, Trình độ đọc tham khảo): menu xổ xuống nền sáng `#FFFFFF`, bo góc `10px`, dấu `✓` bên phải; mục `Picture book ›` xổ menu con `[Paperback, Hardcover]` sang phải, chọn xong hiển thị `Picture book · Paperback` (hoặc `Hardcover`) và bỏ cụm radio kiểu bìa rời.
  - Kiểm chứng: Vitest 37/37 files (187/187 tests PASS), `npm run build` và `npm run build:workers` (0 warning), Visual QA qua headless Chrome CDP đạt.

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
| Rollout bản hiện hành | Chưa có xác nhận online candidateV6–V13 và frontend/backend đồng bộ; backup/counts/fingerprint/sequence trước migration, dừng ghi khi đổi payloadvariants; smoke origin/canonical/enquiry sau entryadmin và public, OWNER/STAFF/media/tồn/retry sau deploy |
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
