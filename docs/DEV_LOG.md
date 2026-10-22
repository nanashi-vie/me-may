# Mẹ Mây — nhật ký phát triển

Nhật ký bàn giao công việc giữa các phiên, không phải log runtime. Thêm checkpoint mới ở cuối; sửa nhận định cũ bằng mục đính chính có tham chiếu. Snapshot hiện tại ở [PROGRESS.md](PROGRESS.md), quy tắc ở [AGENTS.md](../AGENTS.md).

## S001-C01 — 21/10/2026 — Chuẩn bị skill và workflow bàn giao

**Yêu cầu:** Tái sử dụng `.agents` từ Ellora, đọc master plan v3.1 và có file log để phiên sau tiếp tục code thuận lợi. Phạm vi phiên này là tài liệu/workflow, không code website.

**Đã đọc:**

- Toàn bộ `docs/Me-May_MASTER_PLAN_v3.1_2026-10-21.md` (đọc theo ba đoạn để tránh output bị cắt).
- Registry/frontmatter và các đoạn có ràng buộc framework/tool của 19 skill Ellora; đọc toàn bộ rule Ponytail. Chưa áp dụng hay kiểm thử hành vi từng skill thiết kế.
- Superpowers using-superpowers/brainstorming/writing-plans từ lượt trước; tham khảo writing-skills và skill-installer trong phiên này. Không tạo skill mới: quy ước riêng project được đặt trong AGENTS.md.

**Thay đổi:**

- `.agents/skills/`: 19 skill giữ nguyên bản gốc, gồm `stitch-design-taste/DESIGN.md` đi kèm.
- `.agents/rules/ponytail.md`: bản sao nguyên trạng.
- `AGENTS.md`: hướng dẫn bắt đầu/tiếp tục phiên, ưu tiên nguồn phạm vi, tương thích skill với Angular và quy tắc checkpoint.
- `docs/SKILLS.md`: registry, nguồn gốc, cách chọn skill và kiểm kê checksum.
- `docs/PROGRESS.md`, `docs/DEV_LOG.md`: snapshot và lịch sử công việc.

**Quyết định:**

- Dùng bản sao project-local, không symlink vào thư mục Ellora, để chuyển máy/repo không phụ thuộc đường dẫn nguồn.
- Không sửa nội dung 19 skill. Các mặc định React/Next/Tailwind hoặc hướng visual không tự thay đổi stack/UX Mẹ Mây; chọn lọc qua AGENTS và registry.
- Master plan v3.1 là baseline hiện tại: wishlist, OWNER/STAFF, BookCopy/Listing và provider đã chọn; proposal cũ chỉ còn giá trị tham khảo khi có khác biệt.
- Một file tiến độ ngắn và một log nối tiếp, thay vì để mỗi phiên tự tạo tài liệu bàn giao mới. Không tạo thêm ứng dụng hay script logging.

**Kiểm tra và bằng chứng:**

- Tại workspace root, `git status --short --branch`: thất bại với `not a git repository`. Chưa có branch/commit/PR trong workspace này.
- Kiểm kê nguồn qua `find`/Python: 19 SKILL.md, 1 DESIGN.md, 1 rule; bỏ `.DS_Store`.
- Copy lần đầu trong sandbox: thất bại ở bước tạo `.agents` với `Operation not permitted`, chưa sao chép file nào. Chạy lại cùng thao tác với quyền ghi được duyệt: thành công, báo `Copied 21 files; 19 skills; source untouched.`
- Verification bằng Python stdlib tại workspace root: PASS 21 file bản sao khớp từng byte với Ellora; đủ 19 SKILL.md; không có `.DS_Store` hoặc symlink; liên kết local và code fence trong 4 tài liệu workflow hợp lệ; SHA-256 master plan khớp registry và checkpoint `S001-C01` khớp snapshot/log.
- Chưa chạy build/test sản phẩm vì không thay đổi code; chưa xác minh Cloudflare/Supabase/Dokploy hoặc chạy skill UI.

**Đang dở/blocker:** Không có code đang làm dở. Master plan chưa được chuyển thành technical spec hay implementation plan. Không tự commit/push hoặc tạo Git repo.

**Bàn giao:** Bắt đầu phiên tiếp theo bằng AGENTS → PROGRESS → checkpoint cuối → phần master plan liên quan. Chờ đầu việc thiết kế cụ thể từ người dùng; M0/tài liệu gửi chủ/wireframe là các đầu việc tiếp theo trong master plan. Không bắt đầu M1 chỉ vì đã đọc plan.

### Mẫu cho checkpoint tiếp theo

```markdown
## S002-C01 — YYYY-MM-DD — Tên công việc

**Milestone/ticket và mục tiêu:**
**Phạm vi được yêu cầu:**
**Trạng thái:** đang làm / hoàn tất đã kiểm tra / còn thiếu kiểm tra / bị chặn
**File thay đổi:**
**Quyết định và lý do:**
**Kiểm tra:** lệnh, working directory, kết quả thực tế; ghi rõ chưa chạy.
**Đang dở / lỗi / cách đã thử:**
**Bước tiếp theo:** hành động cụ thể, file/ticket và điều kiện phụ thuộc.
**Git:** branch, commit/PR nếu có; phần chưa commit.
```

## S002-C01 — 21/10/2026 — Bắt đầu M0, đổi database và định hướng home

**Yêu cầu:** Bắt đầu M0; bỏ nhà cung cấp database cũ, chuyển PostgreSQL về VPS/Dokploy; home dựa trên ảnh `docs/nxbkimdong.com.vn.png`; tham khảo cấu trúc Ellora để giữ repo gọn. Người dùng xác nhận giữ Angular trên Cloudflare.

**Trạng thái:** Đang chuẩn bị baseline cập nhật, bản thiết kế M0 và bộ dữ liệu thử có nhãn rõ ràng. Chưa code sản phẩm, scaffold hoặc triển khai hạ tầng.

**Khảo sát:** Đọc bàn giao và master plan; xem ảnh tham khảo; dùng graph Ellora xem cấu trúc folder và đọc architecture/frontend/backend guidelines. Ellora có `code/frontend`, `code/backend`, `database`, `docs`; FE có `features`, `layouts`, `shared` cùng các thư mục service/config; backend phân lớp controller/service/repository. Chỉ tham khảo tổ chức, không kế thừa Cognito, booking hoặc `ddl-auto: update`.

**Quyết định đã xác nhận:** Angular/Cloudflare giữ nguyên; Spring Boot + PostgreSQL tự quản qua VPS/Dokploy. Chỉ bỏ dịch vụ database cũ trong dự án, không xóa tài khoản, plugin, dịch vụ bên ngoài hoặc dữ liệu thật.

**Kiểm tra:** `git status --short --branch` tại root vẫn trả `not a git repository`. Chưa có thay đổi code để build/test. Kết quả kiểm tra tài liệu sẽ bổ sung tại checkpoint kết thúc.

**Bước tiếp theo trong phiên:** Cập nhật baseline; viết brief home, sitemap/wireframe, cấu trúc repo dự kiến và field schema/fixture. M0 chỉ hoàn thành sau review thiết kế và pilot 10–20 cuốn thật.

## S002-C02 — 21/10/2026 — Bàn giao bộ nháp M0 để review

**Trạng thái:** Hoàn tất đầu ra tài liệu/wireframe của phiên này; M0 đang làm, chưa hoàn tất review/pilot. Chưa code sản phẩm hoặc bắt đầu M1.

**File thay đổi:**

- Thêm `docs/Me-May_MASTER_PLAN_v3.2_2026-10-21.md`: PostgreSQL tự quản trên VPS/Dokploy, private network/volume/role, backup ngoài VPS và restore; Angular/Cloudflare giữ nguyên. Cập nhật toàn bộ checklist, milestone và backlog liên quan database.
- Giữ nguyên v3.1 làm lịch sử; AGENTS, PROGRESS và SKILLS chuyển tham chiếu hoạt động sang v3.2.
- Thêm `docs/m0/README.md`, `home-brief.md`, `screens.md`, `repository-structure.md`, `pilot-data.md`.
- Thêm 3 SVG và 3 PNG trong `docs/m0/wireframes/`: Home desktop, Home mobile và board catalogue/detail/wishlist/admin list/editor.
- Thêm CSV 12 bản ghi SYNTHETIC trong `docs/m0/fixtures/`, toàn bộ chưa xác minh/không có ảnh thật; không được publish dù cột trạng thái dùng PUBLISHED để thử UX.

**Quyết định và giới hạn:**

- Home giữ nhịp header/search/menu/banner lớn/hàng sách/banner nhóm của ảnh mẫu; dùng nội dung Mẹ Mây, không lấy logo, cover, sale, freeship hoặc chính sách từ screenshot.
- Mobile wireframe chỉ minh họa hai nhóm để review nhịp grid; desktop có bốn nhóm. Card không data-bind CSV; giá và hình khối đều minh họa.
- Giữ layout code/frontend và code/backend đang có, FE feature-first, BE domain-first với phân lớp bên trong. Đây là đề xuất cấu trúc, chưa tạo scaffold hoặc copy source Ellora.
- Role matrix đề xuất Owner quản lý cuốn đã công khai, Staff nhập/sửa nháp; cần review trước khi khóa technical spec. Không tự cấp Staff quyền publish/đổi sold.
- Không yêu cầu tài khoản nhà cung cấp DB cũ, không gọi API hoặc xóa dịch vụ bên ngoài. Không xóa plugin toàn cục.

**Kiểm tra thực tế:**

- Dùng tài liệu chính thức Dokploy Databases/Docker Compose và PostgreSQL SQL Dump để đối chiếu hướng quản trị/backup ở mức proposal; chưa chạy hạ tầng thật.
- Render SVG bằng Python cairosvg: không thực hiện được do thiếu module. Dùng sharp có sẵn trong bundled Node runtime, không cài dependency mới: render thành công cả 3 PNG. Đã xem cả 3 ảnh, cập nhật dấu phân cách menu desktop và render lại.
- Python stdlib tại root: PASS không còn provider đã bỏ trong AGENTS/PROGRESS/master plan v3.2/M0; local links và code fence hợp lệ; SHA-256 v3.1 giữ nguyên; CSV đủ 12 mã/slug duy nhất, cả 3 availability và 3 publication, có trường hợp trùng tên/ISBN khác giá; fixture đều SYNTHETIC/unverified/thiếu ảnh; 3 SVG parse được và có PNG; skill sao chép vẫn khớp nguồn Ellora.
- Không chạy build/test ứng dụng, đo LCP, kiểm thử quyền/UI hoặc backup/restore vì chưa có code và môi trường triển khai. Không coi render ảnh là kiểm thử tương tác.

**Bước tiếp theo:** Review bộ M0, chuẩn bị và thử nhập 10–20 cuốn thật, link liên hệ/nội dung chính sách thật; ghi phát hiện trước khi tạo technical spec. Checklist gate nằm trong `docs/m0/README.md`.

**Git:** Workspace root chưa là Git checkout; thay đổi còn local, chưa commit/push/deploy. Script tạo artifact tạm ở `/tmp/me-may-m0-artifacts.py`, không thuộc app/repo và không cần cho việc đọc SVG/PNG đã lưu.

## S003-C01 — 22/10/2026 — M1 local được duyệt và bắt đầu

Người dùng duyệt M0 và M1, yêu cầu tiến hành. Docker hóa app/CI/CD/deploy hoãn; dùng PostgreSQL Docker đang có. Plan: docs/superpowers/plans/2026-10-22-m1-local.md. Thực thi inline, nhánh feat/m1-local nối origin/dev (cùng initial commit với main); chưa push.

Container my-postgres: PostgreSQL 18.4, localhost:5432. Đã tạo role me_may_app, me_may_dev và me_may_test riêng; credential ngẫu nhiên trong .env ignored, mode 0600. Không sửa database khác.

Đã scaffold Angular 21.2 và Maven Wrapper 3.9.15/Spring Boot 4.1.1/Java21. Auth integration tests được viết trước auth logic, đang chạy RED. npm install gặp lỗi nội bộ Arborist edgesOut ở npm10; đang thử npm11 tạm thời, không đổi toolchain hệ thống.

Ruling: làm tại workspace mới trên nhánh feature để giữ tài liệu local hiện có; không tạo thêm worktree. M0 được duyệt, pilot thật tiếp tục song song. Chưa tạo model sách hoặc upload media.

## S003-C02 — 22/10/2026 — Auth backend và frontend foundation

RED backend: 8 integration tests chạy thật với PostgreSQL, 7 failure do auth/CSRF/JSON chưa có. Sau implementation: 11/11 pass (auth + bootstrap); bổ sung expiry và session-fixation tests, `bash run-local.sh -B -ntp verify` đạt 13/13 và đóng gói JAR thành công.

Đã có Flyway admin_user, session BCrypt Owner/Staff, CSRF login/logout, 401/403 JSON, health tối giản, bootstrap local idempotent không reset/elevate account sẵn có. Test kiểm tra database name me_may_test trước khi xóa fixture. Session expiry test filter chỉ tồn tại trong test code.

Frontend: layouts public/admin, login Reactive Forms, auth service chỉ lưu user trong memory, guard xác minh session, metadata public và route 404. Đã chạy 6/6 unit tests pass. Chỉnh test encoding để kiểm tra giá trị form sau parse thay vì ép raw escaping khác convention hợp lệ của Angular HttpParams.

npm10 lỗi Arborist null edgesOut; npm11 tạm thời cài thành công. Audit phát hiện MCP SDK/Vite dev dependency: xác minh bản vá 1.32.0 và 7.3.7 từ registry, dùng override cùng major, cài lại báo 0 vulnerability. Một test run trùng lúc node_modules đang thay đổi báo module-runner missing; sau install hoàn tất chạy suite pass. Không dùng force upgrade Angular.

Production Angular SSR build trong sandbox abort/esbuild deadlock; đang chạy lại ngoài sandbox để phân biệt giới hạn môi trường. Chưa tuyên bố build frontend thành công. Backend/frontend local smoke tiếp theo.


## S003-C03 — 22/10/2026 — Nghiệm thu M1 local và bàn giao

M1 local đã được triển khai đúng phạm vi mới: không Dockerfile/Compose ứng dụng, không CI/CD, không push/deploy. PostgreSQL my-postgres được giữ nguyên; chỉ thêm role/database riêng cho dự án.

Verification cuối: backend verify 13/13 + JAR; frontend 7/7 + build; audit 0. Browser qua proxy: redirect anonymous, login Owner, logout, wrong-password error. Initial HTML dev4200 và production SSR4000 đều có content/title/description/OG/canonical, missing route trả404. Credential scan file Git dự kiến và dist không thấy secret local. Chi tiết: docs/m1/VERIFICATION.md.

Review fresh-context theo requesting-code-review tìm một P2: noindex từ NotFound còn trên Home khi điều hướng SPA. Test tái hiện RED, sửa PageMetadata.removeTag, suite GREEN 7/7. Không có finding critical/important khác trong phạm vi review.

Smoke production SSR phát hiện scaffold allowedHosts rỗng khiến fallbackCSR: đã đối chiếu log lỗi/Angular security docs, cho phép đúng localhost và127.0.0.1, bind loopback, validate PORT số. Sau build/restart, smoke production PASS. Chưa xác minh Cloudflare. Các lỗi build/test trung gian được ghi trong verification report, không tính là thành công trước khi sửa.

Đã cập nhật README, master-plan amendment, PROGRESS, M1 plan và verification. Commit local trên feat/m1-local sau kiểm tra cuối; checkpoint được lưu cùng commit, đối chiếu mã qua git log. Không merge hoặc push. Backend8080/devFE4200 giữ chạy để người dùng xem; phiên sau cần kiểm tra lại.

Bước tiếp theo: xem M1 local, rồi chốt technical spec M2 và pilot dữ liệu thật. Không mở order/media/AI sớm.

Pre-commit: check whitespace scoped code/tài liệu M1 pass. Full-repo check báo khoảng trắng Markdown của các skill sao chép và master plan nguồn; giữ nguyên các file đó để bảo toàn nội dung/checksum, không xem là test ứng dụng thất bại. Git báo CRLF normalization cho wrapper Windows/CSV demo.
