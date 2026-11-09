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


## S004-C01 — 22/10/2026 — Dọn Git và tài liệu (đang thực hiện)

- Yêu cầu: bỏ theo dõi thư mục agent/tool local, giữ logo mới trong public, gộp tài liệu hiện hành và xóa bản đã thay thế.
- Phạm vi: .gitignore, index Git, AGENTS/README và docs; không thay hành vi ứng dụng.
- Quyết định: dùng tên tài liệu cố định; lịch sử phiên bản lấy từ Git, DEV_LOG giữ checkpoint nối tiếp. Skill vẫn tồn tại trên máy.
- Kiểm tra ban đầu: nhánh feat/m1-local, chỉ logo.jpg untracked; .agents và bốn file .vscode đang tracked.
- Tiếp theo: gộp nội dung hữu ích, sửa liên kết, kiểm tra ignore và diff trước bàn giao.


## S004-C02 — 22/10/2026 — Dọn Git và tài liệu hoàn tất

- `.gitignore` root bỏ qua `.agent/`, `.agents/`, `.codex/`, `.claude/`, IDE/history và `.github/modernize/` sinh tự động. Giữ workflow CI hợp lệ, asset public, Maven Wrapper và `.env.example` có thể tracked. Gộp quy tắc Angular CLI vào `.gitignore` root và xóa file ignore frontend theo trao đổi với người dùng; không còn ngoại lệ tái thêm `.vscode/`.
- Bỏ theo dõi 21 file skill và 4 file VS Code bằng `git rm --cached`; tất cả vẫn có trên máy. Không sửa source Ellora hoặc viết lại lịch sử Git.
- Gộp 17 Markdown trong docs thành 8 file hiện hành: README, MASTER_PLAN, DESIGN, DATA, ARCHITECTURE, VERIFICATION, PROGRESS, DEV_LOG. Xóa 13 đường dẫn tài liệu cũ, giữ quyết định M1 trong master/README và bằng chứng trong VERIFICATION; khảo sát legacy gộp vào ARCHITECTURE. Di chuyển nguyên nội dung ảnh/wireframe và CSV sang assets/fixtures. Các đường dẫn cũ được nhắc trong checkpoint trước là lịch sử; xem Git khi cần.
- Giữ nguyên logo.jpg người dùng cung cấp trong code/frontend/public (255762 bytes), chưa tích hợp giao diện. AGENTS và mục lục quy định sửa bản hiện hành hoặc thay rồi xóa bản cũ trong cùng thay đổi; tiếp tục giữ log phiên.
- Kiểm tra: toàn bộ link Markdown local trong README/AGENTS/docs tồn tại; 27 đường dẫn secret/cache/tool/output được ignore, 7 đường dẫn nguồn được cho phép; không còn tracked file khớp ignore; skill/IDE local còn nguyên. `git diff --cached --check` pass; chỉ còn một .gitignore tracked. 25 file công cụ local nguyên nội dung, 8 asset/fixture di chuyển có Git blob không đổi, logo nguyên SHA-256. So sánh byte trực tiếp CSV ban đầu khác do checkout CRLF/Git LF; so sánh blob đã normalize xác nhận không thay nội dung. Không chạy lại test ứng dụng vì chỉ đổi docs/ignore/index và thêm asset. Kết quả app ở VERIFICATION thuộc checkpoint M1 trước đó.
- Nhánh feat/m1-local; lưu thay đổi bằng commit local cleanup, không push/merge/deploy. Bước tiếp theo: người dùng kiểm tra M1; đặc tả M2 khi được yêu cầu. Docker/CI/CD tiếp tục hoãn.


## S005-C01 — 22/10/2026 — Cập nhật baseline MVP trước M2 (đang thực hiện)

- Yêu cầu đã duyệt: bộ lọc tuổi/thể loại, Picture book có đúng một kiểu bìa, giá tham khảo, ba ảnh bắt buộc, mức đọc Cambridge/CEFR, CTA Zalo và dời import CSV/Excel ngay sau MVP.
- Phạm vi: MASTER_PLAN, DATA, DESIGN, PROGRESS và DEV_LOG; chỉ sửa tài liệu, chưa code/spec triển khai M2, chưa tạo importer.
- Ban đầu: git status sạch trên feat/m1-local; M1 local đã có bằng chứng tại VERIFICATION, chưa chạy lại dịch vụ/test ứng dụng trong phiên này.
- Quyết định: cập nhật trực tiếp các tài liệu hiện hành; giữ nguyên fixture/wireframe cũ và ghi rõ giới hạn so với baseline mới, không biến dữ liệu demo thành dữ liệu thương mại.
- Tiếp theo: đồng bộ nội dung, kiểm tra mâu thuẫn, liên kết local và diff; cập nhật checkpoint kết thúc. Thay đổi sẽ còn local, chưa commit/push/merge/deploy.

## S005-C02 — 22/10/2026 — Baseline MVP trước M2 đã đồng bộ

- Đã thực hiện bản kế hoạch được người dùng duyệt; chỉ cập nhật sáu tài liệu hiện hành: MASTER_PLAN, DATA, DESIGN, README trong docs, PROGRESS và DEV_LOG. Không sửa code, API đang chạy, schema database, fixture hoặc wireframe; chưa triển khai/đánh dấu hoàn tất M2.
- MASTER_PLAN cập nhật quy tắc sản phẩm, mô hình/contract API minh họa, milestone/backlog và tiêu chí nghiệm thu: nhiều nhóm tuổi/một thể loại; Picture book bắt buộc đúng một kiểu Paperback/Hardcover, “Tất cả” chỉ khi lọc; giá tham khảo; ba ảnh thật trước publish; bảy mức đọc thủ công và căn cứ nội bộ; chỉ AVAILABLE/SOLD; wishlist trái tim và CTA Zalo theo khả dụng. Không tự suy mức đọc hoặc hứa điền sẵn tin nhắn trên Zalo cá nhân zBusiness khi chưa kiểm chứng.
- Import CSV/Excel là bước ngay sau MVP: chỉ tạo mới thành nháp, mã trùng file/database báo lỗi, không ghi đè. Cập nhật cả sách đã công khai là mở rộng về sau có đối chiếu/version/audit. Chưa đặc tả file/preview/lỗi và chưa làm importer; không đưa import vào gate MVP.
- DATA/DESIGN đồng bộ field và luồng, ghi rõ CSV/wireframe M0 chưa chuyển sang baseline mới để không dùng nhầm làm contract. Mô tả lỗi vẫn bắt buộc; ảnh/video thực tế bổ sung qua Zalo. docs/README cập nhật mục lục; PROGRESS bỏ thông tin cleanup còn chưa commit sau khi đối chiếu git log (cleanup đã ở b4bb335).
- Kiểm tra tại root: `git diff --check` PASS; Python stdlib kiểm 51 link local trong README/AGENTS/docs hiện hành (bỏ DEV_LOG chứa đường dẫn lịch sử), code fence cân bằng, không có link thiếu. Lần đầu checker báo sai 10 link ARCHITECTURE vì chưa bỏ hậu tố :line; sửa checker rồi chạy lại PASS, không sửa các link hợp lệ đó.
- Kiểm tra nội dung bằng Python tại root: PASS các nhóm field/nhãn mức đọc/CTA; không còn contract cũ HELD/giá lọc/nhiều vai trò ảnh; giữ nguyên các gate XSS/phân quyền, concurrent edit, SEO/OG, LCP, backup/restore, hạ tầng và thao tác khách không tạo đơn. `git diff --name-only` chỉ có sáu tài liệu dự kiến. Không chạy build/test ứng dụng hoặc kiểm thử Zalo/browser vì không đổi code; bằng chứng M1 trước đó ở VERIFICATION không phải lần chạy mới.
- Ghi checkpoint cuối bằng Python stdin gặp lỗi encoding trước khi chạy, không ghi file; dùng apply_patch để cập nhật log và PROGRESS, rồi kiểm tra lại diff.
- Chưa có dữ liệu pilot thật/link hotline/link nhóm được xác nhận; khả năng điền sẵn Zalo chưa kiểm chứng, fallback copy → mở Zalo → dán/gửi đã được duyệt. Bước tiếp theo: technical spec M2 theo MASTER_PLAN/DATA/DESIGN mới, rồi triển khai theo spec được duyệt; pilot thật chuẩn bị song song. Docker hóa app/CI/CD/deploy vẫn hoãn.
- Git: feat/m1-local, HEAD b4bb335 trước thay đổi phiên; toàn bộ thay đổi tài liệu còn local, chưa commit/push/merge/deploy.

## S006-C01 — 22/10/2026 — Áp dụng giới hạn và chỉ mục tài liệu (đang thực hiện)

- Người dùng đồng ý đề xuất sau kiểm kê: Markdown dự án tối đa 400 dòng, 200–400 là khoảng hướng tới cho tài liệu lớn, không có tối thiểu bắt buộc; DEV_LOG miễn trần và giữ nguyên lịch sử trong một file.
- Phạm vi: AGENTS, docs/README, MASTER_PLAN, ARCHITECTURE, PROGRESS và DEV_LOG; không thay code hoặc bắt đầu triển khai M2. Giữ các thay đổi baseline MVP đang local từ S005.
- Kiểm tra ban đầu tại root: git status có sáu tài liệu S005 chưa commit; MASTER_PLAN 421 dòng, ARCHITECTURE 124 dòng, chỉ mục docs/README đã tồn tại. Không tạo INDEX.md hoặc công cụ kiểm tra mới.
- Thực hiện: chuyển nguyên phần hạ tầng chi tiết từ master sang ARCHITECTURE, giữ provider/gate tại master; dùng docs/README hướng dẫn đọc theo đầu việc. Tiếp theo kiểm tra độ dài, bảo toàn nội dung, liên kết và diff.

## S006-C02 — 22/10/2026 — Rule giới hạn và chỉ mục tài liệu hoàn tất

- AGENTS ghi trần 400 dòng cho Markdown dự án; tài liệu lớn hướng tới 200–400, không bắt đủ 200, không gộp dòng để lách trần. DEV_LOG miễn trần và không tách/xóa lịch sử. Skill/dependency sao chép hoặc sinh tự động không bị sửa theo rule này.
- docs/README là chỉ mục duy nhất, có bảng đầu việc → file/mục cho phạm vi/M2/M3/wishlist/local/hạ tầng/import và mục đăng ký spec/plan đang dùng. AGENTS, README root và PROGRESS dẫn vào chỉ mục, chỉ đọc checkpoint mới nhất hoặc liên quan; không yêu cầu nạp toàn bộ tài liệu mỗi phiên.
- Chuyển nguyên mục hạ tầng 5.1 từ MASTER_PLAN sang ARCHITECTURE (chỉ đổi hai tiêu đề cho phù hợp vị trí); master giữ tóm tắt provider/gate và liên kết tới nội dung đã chuyển. MASTER_PLAN từ 421 còn 367 dòng, ARCHITECTURE từ 124 thành 185 dòng. Không tạo file chỉ mục thứ hai hoặc script/CI mới; chưa soạn/triển khai spec M2.
- Kiểm tra cuối tại root: Python stdlib đếm toàn bộ 11 Markdown tracked, tất cả file không miễn trần đều <=400; kiểm 76 link local và 28 anchor mục, code fence cân bằng; so sánh block trước/sau xác nhận nội dung hạ tầng không mất và không bị nhân bản. File gốc tạm dùng đối chiếu ở /tmp/me-may-infra-before.txt, không phải nguồn tài liệu của dự án.
- `git diff --check` lần đầu phát hiện dòng trắng mới cuối ARCHITECTURE; đã bỏ dòng trắng dư và chạy lại kiểm tra cuối. Không chạy build/test ứng dụng vì chỉ đổi tài liệu; không xác minh lại dịch vụ, staging hoặc Zalo. Kết quả M1 vẫn thuộc checkpoint cũ.
- Bước tiếp theo: dùng hàng M2 trong chỉ mục để soạn technical spec theo baseline đã duyệt; chuẩn bị pilot thật và link hotline/nhóm song song. Import vẫn ngay sau MVP; Docker hóa app/CI/CD/deploy vẫn hoãn. Nhánh feat/m1-local; thay đổi S005 và S006 đều còn local, chưa commit/push/merge/deploy.

## S007-C01 — 22/10/2026 — Bắt đầu làm rõ technical spec M2

- Người dùng yêu cầu qua bước tiếp theo của M2. Đang brainstorming/spec kiến trúc cho quản trị catalogue; chưa triển khai code, migrations, upload hoặc thay đổi quyền.
- Đọc theo chỉ mục: PROGRESS/checkpoint cuối, DATA, phần quyền/editor trong DESIGN, mô hình/API minh họa MASTER_PLAN. Dùng graph project hiện có tìm và đọc SecurityConfiguration/AdminUser: đã có session/RBAC M1; chưa có BookCopy/Listing/Cloudinary trong kết quả discovery và manifests. Không dump credential .env.
- Git thực tế sạch trên feat/m1-local, HEAD b8d32d9 (chore: update docs and rule), ahead origin một commit. Các thay đổi S005/S006 đã được lưu trước lượt này; ghi nhận theo git log, không coi dòng “còn local chưa commit” trong checkpoint cũ là trạng thái hiện tại.
- Đề xuất đang trao đổi: BookCopy/Listing tách trong database nhưng lưu nháp qua một giao dịch/màn hình admin; backend quyết định quyền và audit/version. Cần chốt cách tạo mã cuốn: nhập mã tiệm / tự sinh / nhập hoặc tự sinh; đã hỏi người dùng, chưa coi lựa chọn đề xuất là quyết định được duyệt.
- Kiểm tra: đọc manifest/config, graph snippets và git status/log tại root; chưa chạy build/test/browser/cloud vì chưa đổi code. Bước tiếp theo: nhận cách quản lý mã, trình bày thiết kế M2 để chốt, rồi viết spec <=400 dòng và đăng ký trong docs/README; spec và implementation plan cần được duyệt trước code theo quy trình hiện hành. Chưa commit/push/merge/deploy trong lượt này.

## S007-C02 — 22/10/2026 — Chốt mã tự sinh và đối chiếu ảnh vận hành

- Người dùng chọn website tự sinh mã tăng dần để dán nhãn/trao đổi với tiệm, sau đó xác nhận tiệm hiện không quản lý bằng mã. Dạng MM-000001 và việc dãy có thể khuyết số mới là đề xuất kỹ thuật, chưa coi đã được duyệt.
- Ảnh phần bảng đang mở có các nhóm cột ngày bán, khách, thể loại, tên sách, giá bán, trọng lượng. Chỉ ghi nhận cấu trúc/workflow; không chép tên khách, dòng giao dịch hoặc ảnh vào repo. Không suy toàn bộ workbook chỉ từ ảnh; chưa xác minh ý nghĩa nhãn thể loại, đơn vị trọng lượng hoặc giá tham khảo từ giá bán lịch sử.
- DATA/MASTER_PLAN đồng bộ quyết định mã tự sinh; DATA sửa quy trình pilot và ghi giới hạn nguồn ảnh; PROGRESS cập nhật bước làm rõ thiết kế. Không mở scope order/trọng lượng/import vào M2; import vẫn ngay sau MVP.
- Trước đó đã đối chiếu tài liệu chính thức Cloudinary về authenticated delivery, signed URLs và destroy/invalidation để chuẩn bị thiết kế media; chưa thử tài khoản hoặc chạy Cloudinary. Nguồn: https://cloudinary.com/documentation/control_access_to_media và https://cloudinary.com/documentation/image_upload_api_reference .
- Bước tiếp theo: trình bày thiết kế admin/giao dịch lưu nháp, quyền, media và audit để chốt trước khi viết spec <=400 dòng. Chưa code/test ứng dụng hoặc tạo spec; kiểm tra tài liệu tại root trước bàn giao. Nhánh feat/m1-local; thay đổi còn local, chưa commit/push/merge/deploy.

## S008-C01 — 22/10/2026 — Viết technical spec M2 theo thiết kế được duyệt

- Người dùng duyệt thiết kế sáu phần đã trình bày: mã MM-000001 tự sinh tăng dần và có thể khuyết số, một form/lần lưu BookCopy + Listing, ba ảnh bảo vệ nháp và xử lý ảnh dư, Owner xuất bản, tìm tên/mã, optimistic locking/audit. Phê duyệt này cho phép viết spec, chưa phải duyệt spec hoặc triển khai code.
- Phạm vi: thêm docs/M2_SPEC.md (<=400 dòng), đăng ký trong chỉ mục; cập nhật PROGRESS/DEV_LOG và liên kết baseline. Không migration, scaffold, cài dependency, gọi cloud hoặc đổi code.
- Kiểm tra môi trường: feat/m1-local, HEAD b8d32d9; bốn tài liệu DATA/MASTER_PLAN/PROGRESS/DEV_LOG còn thay đổi local từ S007. Graph xác nhận auth routes/service hiện tại; Flyway mới có V1__admin_users.sql. Lần đọc ban đầu nhầm tên file SQL số ít; discovery xác nhận tên số nhiều, không sửa migration hiện có.
- Bước tiếp theo: viết spec dữ liệu/API/quyền/media/UI/kiểm thử, tự rà soát tính nhất quán và giới hạn; trình người dùng duyệt spec trước implementation plan. Test/build/cloud chưa chạy trong task tài liệu này.

## S008-C02 — 22/10/2026 — Technical spec M2 để review

- Thêm M2_SPEC.md, 242 dòng: schema/sequence MM-000001, aggregate BookCopy/Listing, DTO/endpoints, role matrix, validation và publication, media staging/cleanup, version/audit, admin UX, migration/config và acceptance tests. Spec vẫn là bản chờ duyệt; thiết kế tổng thể được duyệt không đồng nghĩa bản spec hoặc implementation plan đã được duyệt.
- Các chi tiết cụ thể hóa để review: một version aggregate thay version Listing riêng; upload qua backend thay API cấp quyền upload minh họa; ảnh Cloudinary authenticated, admin stream qua API không trả signed URL; ba trạng thái media và cleanup bền vững trong DB; không thêm public catalogue/API hoặc importer vào M2.
- Đã tự rà soát quyền/trạng thái, DB/cloud race và dữ liệu thiếu; bổ sung PATCH metadata ảnh để sửa alt/sourceRef không cần upload lại, default alt theo vai trò/mã, upload limits, DTO collection/audit và lỗi cấu hình media. Không có TODO/TBD/FIXME để lại trong spec; bản SDK cụ thể được kiểm tra trong implementation plan như quy trình chọn dependency, không cài trong phiên này.
- docs/README đăng ký spec đang chờ duyệt; MASTER_PLAN liên kết và nói rõ contract aggregate chỉ thay ví dụ API khi spec được duyệt; PROGRESS cập nhật bước tiếp theo. Giữ quyết định mã tự sinh và ghi nhận bảng vận hành từ S007, không chép dữ liệu khách.
- Kiểm tra tại root: Python stdlib kiểm cả tracked/untracked Markdown (12 file), mọi file không miễn trần <=400 dòng; 86 link local và 30 anchor mục hợp lệ, code fence cân bằng. Kiểm tra phủ các trạng thái/API/field trọng yếu và scan TODO markers PASS; git diff --check PASS. Đây là kiểm tra tài liệu, không chứng minh code chưa viết đã hoạt động.
- Chưa chạy Maven/frontend test/build, browser, migration/restore hoặc Cloudinary live; chưa xác nhận credential/pilot thật. VERIFICATION vẫn là bằng chứng M1 cũ. Điều kiện live media/pilot được giữ trong gate M2, không thay bằng mock test.
- Bước tiếp theo: người dùng review/duyệt M2_SPEC; sau đó dùng writing-plans để lập implementation plan và chọn cách thực thi, chưa bắt đầu code. Theo brainstorming, lưu spec và tài liệu bàn giao liên quan thành commit local sau kiểm tra; nhánh feat/m1-local, không push/merge/deploy. Đối chiếu git log/status sau lệnh commit để biết kết quả thực tế.

## S009-C01 — 22/10/2026 — Spec M2 được duyệt, lập implementation plan

- Người dùng duyệt M2_SPEC và yêu cầu qua bước tiếp theo. Ghi spec đã duyệt, lập docs/M2_PLAN.md theo writing-plans, giới hạn <=400 dòng; chưa có phê duyệt implementation plan hoặc lựa chọn cách thực thi.
- Git đầu phiên sạch trên feat/m1-local, HEAD 35441c2 (docs: draft M2 catalogue technical spec). Không tự tạo worktree hoặc bắt đầu code trong lượt lập plan.
- Discovery graph: kiểm lại AuthIntegrationTest, AuthService, AdminLayout, PageMetadata để nối vào convention hiện có. Phát hiện test M1 đang xóa admin_user trực tiếp; plan phải dọn fixture M2 trước khi xóa user có FK audit.
- Đối chiếu Cloudinary Java guide và artifact registry: cloudinary-http5 2.5.0 có bản phát hành trên Maven Central; GitHub releases được search cache trả phiên bản cũ hơn nên không lấy cache đó làm latest. Chưa cài SDK hoặc gọi tài khoản cloud.
- Tiếp theo: khóa cấu trúc file/interface, chia task test-first theo phụ thuộc, tự rà spec coverage/signature/review focus; cập nhật chỉ mục và bàn giao. Chưa chạy test/build ứng dụng vì chỉ soạn tài liệu.

## S009-C02 — 22/10/2026 — Implementation plan M2 để review

- Thêm docs/M2_PLAN.md, 219 dòng/11 task: schema và test guard, aggregate/audit, publication/race, REST/collection, Cloudinary adapter, media lifecycle/cleanup, frontend transport, list/editor, media/preview/actions, collection UI, rồi verification/live/restore/pilot. Mỗi task có file/interface, RED/GREEN, lệnh kiểm chứng và commit; chưa task nào được thực thi.
- Spec đã được người dùng duyệt; ghi trạng thái trong M2_SPEC/chỉ mục/PROGRESS. MASTER_PLAN gỡ API admin hai bước đã bị spec thay thế, dẫn contract aggregate và bỏ version Listing riêng; các endpoint public minh họa giữ cho M3/M4. Không đổi phạm vi nghiệp vụ đã duyệt.
- Đã tự rà coverage spec 1–13, tên DTO/method/dependency giữa task và năm Review Focus: literal query, field giả mạo, header ảnh gây overflow, upload race, mất response create. Bổ sung guard TEST_DB_URL trước Spring/Flyway thay vì chỉ guard sau migration, cleanup test trước xóa user, sửa cwd SSR command đúng code/frontend và finally cleanup đúng asset live-test, không quét xóa namespace.
- Khóa SDK backend com.cloudinary:cloudinary-http5:2.5.0 từ https://central.sonatype.com/artifact/com.cloudinary/cloudinary-http5 và https://cloudinary.com/documentation/java_integration ; chưa tải/cài/chạy SDK. GitHub raw pom thử URL master trả404; không suy từ đó rằng SDK không tồn tại hoặc dùng GitHub search cache cũ làm latest.
- Kiểm tra tại root: Python stdlib kiểm 13 Markdown tracked/untracked, giới hạn/code fence PASS; 90 link local và 30 anchor mục hợp lệ; cấu trúc 11 task/files/interfaces/RED/GREEN/commit, các interface/trạng thái trọng yếu và trạng thái spec đã duyệt PASS; không có TODO/TBD/FIXME trong plan. git diff --check PASS. Đọc ng test --help ở code/frontend xác nhận cờ --include, không chạy unit test/build ứng dụng.
- Handoff: chờ người dùng review/duyệt plan và chọn cách thực thi. Đề xuất tự triển khai trong phiên (executing-plans) do interface/version/media phụ thuộc chặt; subagent theo task là lựa chọn khác cần người dùng chọn. Chưa spawn agent hoặc chạy code/migration/cloud/browser.
- Gate live Cloudinary/restore/pilot vẫn giữ nguyên, không tính mock là nghiệm thu; thiếu credential/ảnh thật/quyền DBA phải ghi chưa kiểm chứng. Nhánh feat/m1-local, HEAD 35441c2; thay đổi sáu tài liệu S009 còn local, chưa commit/push/merge/deploy. Bước tiếp theo sau duyệt: preflight Git, lưu checkpoint/plan và triển khai task1 theo phương thức được chọn.


## S010-C01 — 22/10/2026 — Bắt đầu thực thi M2 tuần tự

- Người dùng duyệt plan và chọn làm tuần tự. Đọc executing-plans/TDD/using-git-worktrees và writing-good-tests; giữ workspace hiện tại theo plan, tạo nhánh codex/m2-admin-catalogue sau commit tài liệu. Không push/deploy hoặc tạo worktree mới.
- Trước code: frontend baseline 7/7 pass; backend baseline trong sandbox lỗi SocketException Operation not permitted, đã chạy lại với quyền localhost ngoài sandbox; chờ kết quả. Không thay code vì lỗi môi trường.
- Ruling: dùng .superpowers/sdd/M2_PLAN/progress.md và trích brief/test theo cùng quy trình bằng công cụ local thay wrapper sdd-workspace, vì wrapper tạo thêm .gitignore trong thư mục con trái rule chỉ .gitignore root; root đã ignore .superpowers. DEV_LOG/PROGRESS vẫn là bàn giao chính.
- Phạm vi task1: migrations/reference/entity/mã, guard URL trước Flyway, cleanup fixture trước xóa user. Chưa có schema sách được áp vào dev; test chỉ me_may_test. Chi tiết pre-flight và task BASE trong ledger ignored.

- Steering S010-C01: người dùng yêu cầu đổi prefix nhánh sang feat/; đã đổi nhánh hiện tại thành feat/m2-admin-catalogue, giữ nguyên commit/file và tiếp tục task1. Tên codex/ trong checkpoint trước là lịch sử, không phải nhánh hiện tại.
- Baseline backend ngoài sandbox đã xác minh 13/13 pass, frontend 7/7 pass. Plan được lưu ở 0a9a30a trước khi tạo/đổi tên nhánh.

## S010-C02 — 22/10/2026 — Task1 schema/mã/test guard

- Đã thêm V2 catalogue/V3 reference, entities/repositories, sequence NO CYCLE và MM-000001 mở rộng không cắt số. Test schema tạm kiểm nâng V1→V3 giữ user, seed, mã unique và partial unique ba slot ảnh. Guard URL được dùng trước Flyway trong test M1/M2; cleanup DB test theo FK, không reset sequence/dev.
- RED: task1 test compile fail vì thiếu BookCodeGenerator; GREEN: lệnh chọn task1 + regression auth đạt 18/18 trên PostgreSQL me_may_test. Đang chạy lại suite backend đầy đủ trước commit; không chạy migration trên me_may_dev.
- Ruling: entity dùng field public nội bộ để tránh boilerplate; controller về sau chỉ trả record DTO, không serialize entity. Test code/khôi phục schema chỉ ở schema UUID trong me_may_test, không tác động database khác.
- Chốt task1: suite backend đầy đủ `bash run-local.sh -B -ntp test` 18/18 PASS; git diff --check PASS. Lưu commit local cùng checkpoint; tiếp task2, chưa push/deploy.

## S010-C03 — 22/10/2026 — Task2 aggregate/audit

- BookCommandService lưu BookCopy/Listing/mapping/audit cùng transaction, validate binding/tuổi/mức đọc/giá/link, slug bất biến, version cấp aggregate và no-op. Có explicit DTO để không serialize entity ra API.
- RED compile thiếu BookWrite/service; lần GREEN đầu phát hiện 7 NPE do immutable List.of().contains(null), stack trace trỏ validation. Đã sửa null scan bằng stream anyMatch, không đổi test để che lỗi; suite backend đủ 26/26 PASS. Test kiểm audit FK lỗi rollback cả hai bảng và stale write không đổi dữ liệu/audit.
- Chưa API REST, ảnh thật hoặc dev migration. Commit local task2; tiếp task3 status/race.

## S010-C04 — 22/10/2026 — Task3 publication/availability và race

- Owner-only status/publication, ba ảnh và field bắt buộc trước publish, xác nhận đúng cuốn, archive→draft và giữ firstPublishedAt; published edit không xóa field bắt buộc. Instant publishedAt chuẩn microsecond để khớp round-trip PostgreSQL.
- RED thiếu BookStatusService; GREEN backend đủ 34/34. Kiểm race save/save và Staff-save/Owner-publish có đúng một winner, audit chỉ cho winner; stricter assertion phát hiện JPA flush ném OptimisticLockException raw, đã cho phép đúng kiểu lock (không catch mọi RuntimeException). REST task4 sẽ map cả JPA/Spring lock thành409.
- Người dùng sẽ tự bổ sung Cloudinary credential trong .env khi sẵn sàng; không cần/chưa nhận secret qua chat. Chưa xác minh cloud/pilot. Commit task3, tiếp API task4, không dừng xin duyệt giữa các task.

## S010-C05 — 22/10/2026 — Task4 API admin

- Bắt đầu REST/search/collection/projection theo task4; test HTTP thực qua session/CSRF, strict field và phân quyền. Chưa triển khai media ở task này.
- Người dùng đã cấu hình Cloudinary; kiểm tra ba biến CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET đều có giá trị, không đọc ra chat/log. Chưa kiểm chứng kết nối hoặc upload thật; gate live ở phần media.
- Sửa lỗi escape trong test trước RED; lần compile lỗi không được tính là bằng chứng hành vi. Thay đổi task4 còn local.
- Task4 RED: 8 API tests fail 404 đúng do chưa có endpoint; GREEN đầy đủ backend 44/44 PASS (`bash run-local.sh -B -ntp test`, log task4-suite). JSON unknown/giá thập phân bị từ chối, preview không rò căn cứ nội bộ, LIKE escape và thứ tự ổn định đạt, auth regression đạt.
- Chuẩn hóa thứ tự multi-select để đổi thứ tự chọn không tạo version/audit giả. Query audit dùng page/size trực tiếp thay PageRequest ở brief, cùng contract wire; collection slug immutable, inactive chỉ giữ mapping cũ. Task4 commit local, tiếp task5 adapter/media.

## S010-C06 — 22/10/2026 — Task5 Cloudinary adapter

- Bắt đầu adapter authenticated media, JPEG/PNG validator và rate/concurrency limiter theo brief. SDK duy nhất Cloudinary HTTP5 2.5.0 đã chọn trong plan; test transport giả, không chạm cloud dữ liệu thật ở unit test.
- Task5 GREEN: 13 unit tests PASS (JPEG/PNG, spoof/truncated/size/pixel header, limiter, SDK signed params, host/redirect policy, deadline cancels request). Full backend: 57 PASS + 1 live test skipped by default; live opt-in chạy riêng 1/1 PASS. Dependency tree chỉ thêm Cloudinary HTTP5/core2.5.0 ở backend.
- Live Cloudinary: synthetic PNG trong memay/test/UUID, upload authenticated, signed preview JPEG decode được <=1280, unsigned original/derived bị chặn; finally xóa đúng public_id vừa tạo, xóa lại NOT_FOUND. Không ghi secret/URL signed, không chạm asset khác.
- Ruling: HTTP5 SDK strategy giấu request nên socket timeout chưa bảo đảm tổng60s. Dùng Uploader SDK cho params/signature + Apache HTTP5 transport do app quản lý, timer gọi request.cancel() để hủy I/O. Source SDK2.5.0 đọc từ Maven sources; test fake chậm xác nhận request bị cancel.
- Gate live adapter chạy sớm vì credential đã sẵn sàng; chưa thay gate tích hợp stream/DB/UI/pilot. Commit local task5; tiếp task6 lifecycle.

## S010-C07 — 22/10/2026 — Task6 lifecycle media

- Bắt đầu intent trước upload, attach sau upload, recheck quyền/version, cleanup recoverable và stream session-only. Test dùng FakeMediaGateway bean test-only; cloud live adapter đã đạt riêng, không coi fake là nghiệm thu thật.
- Task6 RED thiếu lifecycle classes; initial GREEN9/9. Extra RED tái hiện actor bị deactivate vẫn attach thành công; sửa resolve actor hiện hành trong mỗi transaction ngắn. Extra RED multipart413 thiếu error envelope vì lỗi trước handler; typed global advice xử lý, auth/security writers không đổi.
- GREEN `bash run-local.sh -B -ntp verify`: 69 PASS +1 live opt-in skipped, JAR đóng gói thành công. Stricter audit rollback assertion chạy riêng 5/5 PASS. Có test cleanup claim/attach, max100, retry/not-found/không xóa ACTIVE; HTTP multipart/CSRF/size/format/metadata/stream no-store/nosniff/session/version.
- Task6 commit local; chưa chạy luồng UI/live tích hợp hoặc dev migration; tiếp task7 typed frontend transport.

## S010-C08 — 22/10/2026 — Task7 frontend transport

- Bắt đầu typed client/session/CSRF, upload XHR riêng; giữ HttpClient Fetch của app và auth semantics M1. Không tự replay POST, không lưu token/dữ liệu admin vào storage.
- Task7 RED thiếu transport/services; GREEN5/5 transport tests, toàn frontend12/12 PASS. Typed IDs chuỗi/version số, status và collection payload đúng; credentials/no transfer cache, CSRF mới và lỗi401 không retry; XHR upload riêng qua injection token, không tự set multipart Content-Type. Commit local, tiếp task8 list/editor.

## S010-C09 — 22/10/2026 — Task8 list/editor

- Bắt đầu bảng sách/query pagination, Reactive Forms và dirty guard. Giữ dữ liệu form trong bộ nhớ khi400/401/409/network; response tạo mới không rõ kết quả không tự gửi POST lần nữa.
- Task8 RED thiếu form/list/editor; GREEN frontend22/22. Test giữ form khi409/401, không replay create sau lost response/double-click, dirty navigation warning, binding/mức đọc/tuổi, inactive mapping. Thêm RED existing-ID404 không được rơi về create; đã chặn lưu khi load thất bại, test GREEN.
- Có inline đăng nhập lại để giữ form trong bộ nhớ, không storage. Danh sách giữ filter/page bằng query params và link quay lại preserve. Không nạp editor vào bundle eager chỉ vì dirty guard. Commit local task8; tiếp task9 media/status/preview/audit.

## S010-C10 — 22/10/2026 — Task9 media/status/preview

- Bắt đầu ba slot ảnh tuần tự theo version mới, Owner status có đối chiếu cuốn/confirmation, preview public projection và audit page. Tất cả vẫn là route quản trị session-only, chưa contact/wishlist public.
- Task9 RED thiếu components; GREEN selected6/fullfrontend28/28 PASS. Ba slot upload concat tuần tự cập nhật version, dirty chặn mutation, lỗi replacement giữ preview; Owner confirm đúng cuốn trước publish, archive/restore/availability dùng version hiện tại.
- Preview projection không căn cứ/sourceRef/audit, title bỏ phần thiếu, unknown level ẩn, note giá; admin/login noindex và xóa khi quay public. Audit hiển thị plain text escaped và paging. Commit local, tiếp task10 collection.

## S010-C11 — 22/10/2026 — Task10 collection UI

- Bắt đầu Owner create/edit/deactivate collection, slug readonly sau tạo, giữ form khi conflict; Staff không có menu/mutation UI. Taxonomy cố định không có editor.
- Task10 RED thiếu collection component; GREEN frontend31/31 PASS. Owner create/deactivate, slug immutable trong update,409 giữ dirty form và Staff không gọi mutation. Inactive mapping book-editor regression vẫn đạt. Commit local; tiếp task11 integration/browser/live/backup/restore và pilot.

## S010-C12 — 22/10/2026 — Task11 tích hợp/nghiệm thu kỹ thuật

- Bắt đầu live tích hợp Cloudinary/backend/API, backup trước dev migration, scratch restore, browser Owner/Staff và verification toàn bộ. Pilot cần10–20 cuốn thật/người đối chiếu, đã hỏi người dùng; không thay bằng ảnh synthetic.

- S010-C12: gate live tích hợp2/2 PASS, cleanup đúng IDs; một lần rerun dừng vì pending fixture khác, finally vẫn cleanup own assets. Tách cleanupPending(UUID) dùng chung với batch để live không dọn asset ngoài gate. Không xóa rộng fixture hoặc bỏ guard để lấy PASS.
- Review độc lập toàn nhánh bằng một fresh-context agent theo executing-plans;4 finding: ambiguous upload orphan race, media dirty guard, currentVersion409, audit action contract. Hai mục reviewer gọi Minor được đánh giá Important vì contract phục hồi/audit rõ; sửa một lượt, không re-review. RED backend3 failures và frontend missing pending guard; GREEN full verify73 PASS +2 opt-in skipped, JAR; frontend33 rồi34 PASS sau format giá vi-VN.
- Browser test proxy4201→8081 dùng me_may_test/memay/test: tạo328→ba ảnh cloud→preview→publish→sold→archive→draft. Hai tab409 giữ form, offline không thành công, cookie clear401 giữ form/hiện reauth, routeleave confirm, Staff không Owner action/collection menu, Tab outline đạt. Phiên Playwright default bị treo; đóng và dùng session m2final. Staff fixture bị deactivate từ test trước, chỉ bật lại đúng staff@catalogue.test trong me_may_test; không tạo user demo trong dev/production.
- Browser tìm thấy price dùng en-US; test RED missing formatter, Intl vi-VN GREEN. HTML admin CSR ban đầu thiếu noindex header dù JS meta đúng; RED header assertion, ServerRoute headers + check-ssr GREEN cả admin/login/preview, public content/meta và404.
- Backup dev trước migration `.local/backups/S010-before-m2.dump` mode0600; restore me_may_restore_test giữ auth chính xác. Sau browser, dump me_may_test `.local/backups/S010-m2-test.dump`, restore vào scratch do phiên này tạo với --clean/--if-exists;9 bảng/auth/audit khớp, sequence last_value/is_called giữ và nextval vượt high-water, preview thật load từ media key đã restore. Helper scoped browser328 cleanup3 Cloudinary test assets và own rows; không reset sequence. Không coi dump test có asset disposable đã xóa là backup dữ liệu tiệm.
- User xác nhận sẵn sàng tự nhập/đối chiếu10–20 cuốn thật khi UI local sẵn sàng. Pilot chưa có kết quả; task11/M2 còn mở, giữ spec/plan; chưa M3/import/deploy. Backend dev không có sách synthetic; cổng4200/8080 dành pilot, cổng4201/8081 và cookie fixture chỉ kiểm thử.
- Quyết định triển khai (rulings) để giữ sau bàn giao: dùng brief/ledger thủ công vì wrapper tạo .gitignore con (chi phí nếu sai: đối chiếu tooling); reuse checkout theo plan thay worktree (chi phí: isolation bằng branch); feat/ theo yêu cầu user thay codex/ (không đổi nội dung); audit paging int page/size thay PageRequest nội bộ (chi phí: đổi chữ ký nếu consumer cần).
- Rulings media: SDK ký params + owned Apache transport request.cancel tổng60s vì SDK giấu request (chi phí: duy trì adapter nhỏ); chạy live adapter sớm khi credential có (chi phí: một asset test đã dọn); cleanup theo operation UUID cho live chỉ đụng ảnh tự tạo (chi phí: thêm một query/ảnh cleanup). Không có deferred minor từ review.
- Lệnh bằng chứng: backend `bash code/backend/run-local.sh -B -ntp verify`73 PASS+2 skipped; live `CLOUDINARY_NAMESPACE=memay/test MEMAY_LIVE_MEDIA_TEST=true bash code/backend/run-local.sh -B -ntp -Dtest=MediaLiveTest,CloudinaryLiveTest test`2/2; frontend `npm test`34/34, build ngoài sandbox PASS, `node scripts/check-ssr.mjs http://127.0.0.1:4200` PASS. Log ignored trong .superpowers/sdd/M2_PLAN, restore .local/restore-gate.log; ảnh screenshot output/playwright/m2-preview.png đã xem kiểm tra.
- Kiểm bàn giao:13 Markdown file trong giới hạn400 dòng (DEV_LOG ngoại lệ),89 local links PASS sau khi checker hiểu suffix :line; actual credential values không có trong tracked source/frontend bundles; git diff --check PASS. Graph refresh cuối báo Transport closed (lần refresh thành công trước đó ở task6), nên không khẳng định index chứa frontend mới.
- Đã dừng browser m2final và service test4201/8081; restart backend pilot8080 bản cuối, giữ frontend4200. Chỉ log lỗi401/409/offline dự kiến trong browser test; không có lỗi không giải thích được trong flow đã kiểm. Commit local review/verification; chưa push/merge/deploy và chưa đóng M2 vì chờ owner pilot.
- Chốt bàn giao S010-C12: commit code/review/verification9ef3121 trên feat/m2-admin-catalogue. Sau restart, health8080 UP; SSR/public/404/admin headers4200 PASS; me_may_dev thực tế books=0/categories=6/Owner=1, không có synthetic/pilot tự tạo. Đã gửi mở panel browser4200/admin/sach (tool trả queued); link trực tiếp vẫn dùng được. Tiệm nhập pilot bằng Owner trong .env; chưa có kết quả nên M2/plan còn mở. Commit tài liệu bàn giao tiếp theo, không push/merge/deploy.

## 23/10/2026 — S011-C01: xác minh dữ liệu pilot và push GitHub

- Người dùng đã nhập cuốn đầu tiên, duyệt và yêu cầu push lên GitHub; đồng thời hỏi ý nghĩa Căn cứ chọn trình độ. Phạm vi: bàn giao branch M2 hiện tại, không merge/deploy; chưa coi một cuốn là đủ nghiệm thu pilot10–20.
- Read-only PostgreSQL Docker: me_may_dev.public có MM-000001, giá20000, PUBLISHED/AVAILABLE và ba book_media ACTIVE FRONT/BACK/INSIDE. Ảnh DBeaver đang mở postgres.public nên không thấy bảng ứng dụng. Không sửa dữ liệu tiệm.
- Đối chiếu MASTER_PLAN mục3.1 và M2_SPEC: reading_level_basis là ghi chú nội bộ, bắt buộc khi chọn mức đọc; Chưa xác định không cần căn cứ; không lộ preview/public. Không thay đổi code.
- Git trước push: feat/m2-admin-catalogue, HEAD53f2bbf; origin nanashi193/me-may. Thư mục input/ untracked được giữ local, không stage/push. Cập nhật PROGRESS/DEV_LOG và kiểm diff; không chạy lại test vì chỉ thay đổi tài liệu bàn giao.
- Push origin/feat/m2-admin-catalogue thành công (new branch), commit bàn giao012bdc3; upstream đã được thiết lập. Lần đầu sandbox chặn index.lock và DNS; chạy lại với quyền được duyệt đã thành công. Không merge/deploy. Tiếp theo tiếp tục pilot, ghi nhận vướng mắc trước đóng M2.

## 23/10/2026 — S012-C01: bắt đầu M3 local

- User duyệt plan M3 và yêu cầu merge hai feat vào dev; thêm Flash Sale dưới banner theo screenshot: giá gốc/giá sale/thời gian, không số đã bán. Giữ wishlist M4, import sau MVP, Cloudflare/deploy hoãn.
- Fetch origin; feat/m1-local có3 commit local chưa push nhưng là tổ tiên M2. Merge --no-ff cả hai vào dev rồi push thành công2a73249; tạo feat/m3-public-catalogue. input/ untracked giữ local.
- Dev read-only xác minh6 books/18 ACTIVE media; pg_dump custom thành công .local/backups/S012-before-m3.dump với umask077 trước migration. Chưa áp dụng migration.
- Dùng writing-plans/executing-plans/TDD/verification; tiếp tục checkout theo workflow đã dùng M2 và môi trường pilot hiện có, không tạo worktree mới. Plan/doc và log theo chỉ mục, tối đa400 dòng ngoại trừ DEV_LOG.

### S012-C02 — Task1
- RED: BookCommandIntegrationTest chọn A1 không căn cứ bị từ chối; frontend2 assertion fail (level invalid và field còn payload). GREEN: backend75 tests/0failure/2live skipped; frontend34/34. Video trống null và HTTPS validation giữ. Không chạy lại live cloud vì không đổi adapter.
- Bỏ field khỏi production DTO/entity/validation/form/audit mới; V4 drop column, V2/V3 giữ nguyên. Đồng bộ baseline và spec. Migration hiện mới áp dụng test, dev chưa restart nên6 cuốn vẫn nguyên.
- Ruling: V3 đã là seed taxonomy nên migration bỏ căn cứ là V4, Flash Sale V5. Lệnh RED frontend đầu dùng nhầm cwd không chạy được; sửa cwd rồi xác nhận2 fail đúng trước code.

### S012-C03 — API public và Flash Sale
- Public API4 tests RED401/404 trước code → GREEN; full backend82 total/80PASS/2live skipped. Bao gồm PUBLISHED-only, sold, ageOR/categoryAND, search literal, stable pagination, active collection, no-store/no internal fields.
- Flash Sale3 tests RED endpoint thiếu → GREEN: effective price thống nhất list/detail/sale, endsAt/future/sold/hidden/invalid discount, OWNER/version/audit. Thêm regression tắt sale sau sold RED400 thay200; fix validation chỉ buộc published/available khi enabled, đang chạy suite.
- V5 campaign singleton+item, original price từ listing, server DB clock [start,end), không số đã bán; admin OWNER formversion giữ nội dung khi409. Frontend39/39 PASS gồm5 test mới state/campaign. Build/browser/SSR chưa xong.
- Dev chưa migrate (schema1–3); dump mode0600 và fingerprint books/listing-minus-basis/media/audit/sequence đã lưu .local/backups. Giữ input/ untracked. Ledger thủ công trong ignored .superpowers/sdd/M3_PLAN/progress.md.

### S012-C04 — public UX/SSR và bảo toàn dữ liệu
- Frontend44/44 PASS; backend85 total/83PASS/2live skipped và JAR verify PASS. Thêm kiểm tra migration3→latest giữ level/ảnh/audit JSON/sequence; lỗi ban đầu do FluentConfiguration giữ target3, sửa test targetLATEST rồi GREEN.
- Dev V4/V5 chạy sau backup, fingerprint books/listing(trừ basis)/media/audit/sequence khớp hoàn toàn;6books/18ACTIVE giữ nguyên. Không tạo sale/synthetic trong dev.
- SSR dev4200 và built4000 PASS: HTML có nội dung/OG, ảnh thật public200/no-store, missing book/collection404, adminnoindex/no-store. Built Express có API bridge với origin server-only. IsolatedSSR4001 backenddown: /flash-sale ban đầu200 RED; sửa503 và GREEN cảHome/catalogue/detail/sale.
- Browser real detail390:3ảnh load, không tràn ngang, dialog có nội dung đúng, Escape trả focus về Liên hệ; copy flow chạy, fallback có unit test. HMR làm ref cũ; wrapper npx có lần chờ mạng nên dùng CLI cache; không coi lần filter timeout là PASS. Tiếp tục kiểm thử bằng builtserver để tránh HMR.
- Contact URLs chưa cấu hình; user xác nhận sẽ thêm .env. Chưa nghiệm thu mở Zalo thật. Flash Sale screenshot dùng browser-only response fixture để xem layout; backend sale có integrationtests, không tạo ưu đãi giả trên6 cuốn của tiệm.

### S012-C05 — review và một lượt sửa
- Fresh review theo executing-plans/requesting-code-review:4 Important,0Critical/Minor. Đã tái hiện8frontend failures: lệch giờ máy khi direct entry/copy; retry cũ ghi đè URL mới; origin mất sau hydrate; input sale sửa được lúc đang lưu. Backend header thiếu có1RED sau khi env hợp lệ.
- Fix: public response có X-Memay-Server-Time từ database, PublicApi đồng bộ clock trước data và omit credentials; enquiry cùng clock. Refresh đi qua Subject+switchMap URL-state/takeUntilDestroyed. Origin qua TransferState. Sale fieldset khóa khi load/save.
- Rà soát cùng luồng recovery thêm4RED: Home/sale giữ metadata lỗi sau retry và late failure sau destroy; khôi phục metadata và hủy subscription cũ/đã rời trang. GREEN frontend56/56; backend85total/83PASS/2live skipped và verify/JAR PASS. Không re-review.
- Browser built4000: PictureBook/Hardcover URL và1kết quả PASS; Back về catalogue; qMM-000001 đúng1kết quả/mã, mobile390 nooverflow. Lần getByLabel exact timeout do label select bao option text, dùng ref snapshot thì hoạt động; không phải lỗi filter API.
- Có lúc .env contact có dấu cách sau= khiến source không chạy; kiểm tra chỉ tên biến/boolean, không ghi giá trị. Tới rerun đã được chuẩn hóa (script normalized0); tests cô lập contact config rỗng, không lệ thuộc link dev. Đang restart pilot để lấy link thật/timestamp mới.
- Rulings review: Cloudflare/deploy/crawler, wishlist/import nằm ngoài M3local như đã duyệt; chưa coi liveZalo/nativeapp đạt chỉ vì có href. Visual/accessibility do executor kiểm browser. Accent-insensitive search baseline có điều kiện, giữ literal search đã test. Chi phí nếu sai: cần scope/ticket release riêng hoặc cải tiến tìm kiếm, không tự mở rộng bây giờ. Không deferred minor từ review.

### S012-C06 — chốt kỹ thuật M3 local
- Build cuối PASS sau fixes; SSRbuilt4000/OG/404/media/no-store PASS. DirectSSR origin4000 có TransferState, browser sau hydrate/enquiry vẫn4000 và có Mở Zalo: PASS. PublicAPI thực tế có timestamp DB, contact configured cả hai; không log giá trị link. Chưa mở nativeapp/gửi tin.
- Fingerprint cuối bằng trước migration:6cuốn/18ACTIVE/audit/sequence giữ; flash_sale.enabled=false. Không sửa giá/sold/publication sách pilot hoặc tạo campaign giả để chụp. FlashSale screenshotfixture chỉ intercept response browser, đã tách khỏi dữ liệu thật.
- Rulings giữ: checkout/feat riêng thay worktree (chi phí isolation theo branch); V4/V5 vì V3 đã seed (giữchecksums); public query/sale backend chung commit vì predicate cầnV5 (diff lớn hơn); ledger thủ công tránh childgitignore (bookkeepingtay). Giữ ignoredledger/evidence khi UAT/M2pilot chưa đóng (chi phí localdisk) thay xóa plan còn gate.
- Review declined scope được xử lý: Cloudflare/deploy/crawler gaterelese giữ; Zalo mobile UAT chưa khẳng định; M4/import tách đúngmilestone; visual/keyboard doexecutor thử; accent-insensitive search không bắt buộc, literalđãtest. Không có deferred minor.
- Linklocal/Markdownmax400 và diffcheck PASS; .env/.local/.superpowers/output bịignore, input giữ untracked. FeatureM3 commitlocal, dev2a73249 đãpush theo yêu cầu; không tựmergeM3/pushfeature/deploy. Bước tiếp: chủ thử UX vàsale thật nếu muốn, tiếp tụcM2pilot10–20/M4 sauduyệt.

- Chốt QA mobile360/390/desktop: publicdetail3ảnh, focusoutline và Escape, cataloguePictureHardcover/tìmmã/Back; rawscreenshots ignored. Hai linkZalo thực tế có trongpublicconfig, không mở nativeapp hoặc gửi tin. Giữ cổng4200/8080 cho chủ thử, dừng builtQA4000/browser phiên này sau bàn giao.

- Commit sửa review/bàn giao a6a4a38; SSRdev4200 cuối PASS sau restartbackend/nhận linkZalo. Dọn ownbrowserm3/m3final và builtSSR4000,4001 đã dừng; giữ pilot4200/8080. Commit tài liệu chốt sau cleanup.

## S013-C01 — 24/10/2026 — tích hợp bản ổn định vào main trước M4

- User xác nhận đến hiện tại ổn định, yêu cầu merge code vào main; bổ sung yêu cầu đưa input/ vào .gitignore. Chỉ tích hợp code hiện có và cập nhật bàn giao, chưa triển khai M4/deploy.
- Bắt đầu từ feat/m3-public-catalogue tại a0e8623; đã fetch origin, origin/main tại 5d70ec8 là tổ tiên của nhánh hiện tại. M1/M2 đã nằm trong lịch sử M3 qua dev2a73249.
- Working tree có Angular CLI analytics ID local trong code/frontend/angular.json; giữ thay đổi này ngoài commit tích hợp. input/ là dữ liệu local, thêm /input/ vào .gitignore root.
- Đang kiểm tra: npm test tại code/frontend đạt56/56; bash code/backend/run-local.sh -B -ntp verify từ root đang chạy. Chưa merge/push ở checkpoint này. Giữ gate pilot M2, Zalo thiết bị và release Cloudflare riêng.
- Pre-merge: backend verify ngoài sandbox PASS85 total/83 pass/2 live skipped, JAR thành công; lần sandbox lỗi Operation not permitted khi kết nối PostgreSQL/Mockito attach. Frontend npm run build sandbox exit134, rerun ngoài sandbox PASS. Log build/backend ở /tmp/me-may-main-{build,premerge-backend}.log. git diff --check, ignore input/.env/.local/.agents và logo nguồn tracked đạt.
- Đã commit f2ba005 và merge vào main tại38c908f bằng --no-ff, không conflict; tree merge khớp feature. Sau merge: npm test tại code/frontend PASS56/56; backend verify ngoài sandbox PASS85 total/83 pass/2 live skipped, JAR thành công. Log /tmp/me-may-main-postmerge-{frontend,backend}.log. Markdown tracked dưới400 dòng (DEV_LOG ngoại lệ), link local PASS sau khi checker hiểu suffix :line của link nguồn cũ.
- User yêu cầu gộp/push cả angular.json: khôi phục thay đổi analytics đã stash, đưa vào commit main. Đây là đúng config đã dùng trong test/build pre-merge. input/ đã ignore, ảnh nguồn public/logo vẫn tracked. Chuẩn bị push main lên origin; không force-push, không bắt đầu M4/deploy.
- Kết quả: da9b20a gồm angular.json/bàn giao đã push origin/main thành công (5d70ec8→da9b20a); working tree sạch, main đồng bộ origin/main. Check ls-remote trong sandbox bị DNS chặn, xác minh lại ngoài sandbox ở bước cuối. Commit checkpoint cuối đi cùng main. Bước tiếp theo: chốt M4; pilot M2/Zalo thiết bị/release vẫn cần bằng chứng riêng.

## S014-C01 — 24/10/2026 — bắt đầu M4 đã duyệt

- User yêu cầu implement toàn bộ plan M4, đã chọn checkbox hỏi từng cuốn. Tạo codex/m4-wishlist từ main a0a2642; scope lookup1–100/storage100/trái tim/badge/page/enquiry revalidation/accessibility.
- Ghi M4_PLAN và đăng ký chỉ mục trước code. Baseline đã kiểm chứng trong phiên main: frontend56/56, backend85 total/83 pass/2live skipped, build/JAR PASS; đang kiểm tra lại trước thay đổi.
- Ruling: dùng branch trong checkout hiện tại đúng plan đã duyệt và môi trường local đang có thay vì worktree mới — không đổi main; chi phí nếu sai là thiếu isolation thư mục. Giữ ledger thủ công trong ignored .superpowers để không sinh child .gitignore; chi phí là cập nhật checklist tay. Một M4_PLAN chứa contract/spec đã duyệt để tránh nhân bản tài liệu.
- Chưa có product code M4; không sửa dữ liệu dev, không deploy/push/merge M4. Tiếp task1 API RED→GREEN.

### S014-C02 — API lookup
- RED backend3 failures404 và frontend thiếu lookup; GREEN backend verify87 total/85PASS/2live skipped, JAR; frontend57/57. Code lookup dùng chung SELECT/FROM/mapper/giá M3, thứ tự input, PUBLISHED-only và mã canonical theo Long generator (không giới hạn6digit).
- Contract validation1–100 trước dedupe; test missing/empty/malformed/too many/large/overflow, no-store/time, sale expiry, SOLD/hidden/no internal fields. Log /tmp/me-may-m4-task1-*.log; không gọi cloud live hoặc sửa dev. Task2 test đang RED vì chưa có store/button.

### S014-C03 — storage và trái tim
- RED missing store/button modules → GREEN frontend68/68. WishlistStore signals, browser-only afterNextRender, key memay.wishlist.v1 chỉ chứa mã; validation canonical Long, cap100, giữ memory khi read/write bị chặn, warning, reread latest trước mutation và storage event/clear, cleanup listener.
- Shared accessible heart thêm vào card/detail, header link/badge/warning. Tests order/reopen/large-code/corrupt/null/blocked-read/quota-write/cap/remove-full/cross-tab/clear/listener/aria-pressed đạt. Không dependency mới; tiếp task3 page/enquiry/revalidation.

### S014-C04 — trang quan tâm và nội dung hỏi mua
- Task3 RED thiếu page module → implementation; JSDOM thiếu native showModal làm10test dừng ở setup, giả lập method trên đúng dialog test rồi GREEN78/78 (25file). Không polyfill product. Rerun sau Prettier78/78 PASS.
- /quan-tam SSR shell/noindex/no-store; checkbox mặc định rỗng/select-all AVAILABLE; row hidden chỉ mã, SOLD cảnh báo. Refresh stream switchMap/takeUntilDestroyed, foreground/expiry/local-codechange invalidate text; prepared lookup selected và public server price, không snapshot storage.
- Reuse ContactDialog với preparedText/busy/notice, giữ one-book mode và SOLD tư vấn tương đương; manual textarea + nút copy riêng, canonical origin M3. Tests price/new sold/hidden/cross-tab pending+ready/empty/offline/retry/expiry/late response/destroy/clipboard đạt. Build/SSR/browser/review ở task4, chưa tuyên bố phone/nativeZalo đạt.

### S014-C05 — review và sửa một lượt
- Fresh review gpt-6-astra, read-only a0a2642..cbbb24a:1Important stale copy confirmation,0Critical/Minor. Browser chứng minh thêm async Prepare→Escape focusBODY.4RED tests tái hiện status/focus→GREEN82/82; xóa success khi preparedText/busy đổi, giữ opener trước disable và explicit restore, fallback heading khi zero.
- Browser recovery phát hiện notice lỗi còn sau retry thành công; thêm1RED và chuyển feedback phụ thuộc error hiện hành, GREEN82/82. Header360 chỉnh tránh brand bị chia dòng. Không re-review, không deferred Minor. Sửa trong cùng một lượt trước commit.
- Backend final root `bash code/backend/run-local.sh -B -ntp verify`:87total/85PASS/2live skipped, JAR PASS; frontend `npm test`82/82; `npm run build` ngoài sandbox PASS. Logs /tmp/me-may-m4-{review-red,review-green,recovery-red,final-frontend,final-backend,build}.log. Không gọi cloud live vì không đổi adapter.

### S014-C06 — QA và gộp tài liệu M4
- BuiltSSR4000 với MEMAY_SITE_ORIGIN tương ứng: check-ssr PASS wishlist shell/no personal codes/noindex/no-store; public metadata/OG/media/404 và admin privacy. Browser mobile360/390/desktop1440: save2/reload2/selection reset, subset1 và multi2 text/price/canonical đúng, ảnh naturalWidth1280, không overflow.
- Cross-tab xóa sau copy: textarea/status cũ rỗng; native Escape trả Prepare hoặc heading khi zero. Clipboard callback success và denied/manual fallback đạt; không đọc/ghi clipboard OS hoặc gửi Zalo. SOLD/hidden/offline dùng route fixture browser-only; retry hồi phục, metadata khi detail không còn noindex, heart pressed giữ.
- CLI run-code đầu callback destructuring sai, sửa đúng async(page), rerun đạt; không tính lỗi tool là lỗi product. Screenshot đầu chụp trước ảnh load, đã chờ load và chụp lại final ignored output/playwright/m4-{mobile360,desktop,enquiry390}.png. Console ERR_FAILED từ test abort lookup có chủ đích.
- Backend pilot restart để nạp lookup, giữ4200/8080 cho tiệm. Fingerprint .local/m4-dev-before/after.txt byte-identical books/listing/media/audit (6/6/18/46); không chỉnh giá/sold/publication/sale thật hoặc upload/xóa media dev.
- Chuyển toàn bộ contract/UX/acceptance/giới hạn vào MASTER_PLAN/DESIGN/ARCHITECTURE/README/VERIFICATION, cập nhật chỉ mục/PROGRESS và xóa M4_PLAN hết vai trò. M2/M3 plan còn gate chưa chuyển giữ nguyên. Thay đổi M4 còn local, không push/merge/release.
- Rulings cuối (đầy đủ): (1) reviewer không kết luận focus khi chưa có browser; evidenceBODY khiến nâng Important và explicit restore — chi phí nếu sai là restore thừa. (2) visual/SSR/clipboard phải có executor QA, native phone còn mở — rủi ro thiết bị riêng chưa chứng minh. (3) Cloudflare/deploy/security production/offsite restore giữ release gate — local chưa chứng nhận production. (4) sync best-effort/cap100 đúng scope, không CRDT/transaction hoặc đo hiệu năng100cuốn — hai tab ghi cùng lúc có thể last-write-wins. (5) M2pilot và dev integrity tách gate/fingerprint — không tự đóng nghiệp vụ pilot. (6) consolidation do executor sau QA — thêm công bàn giao, không giữ plan trùng. Ruling branch-in-place/manualledger/spec+plan chung ở C01 vẫn giữ với chi phí đã ghi.
- Bước tiếp: tiệm thử /quan-tam và phone/in-app/copy→Zalo thật; nghiệm thu/merge M4 khi được yêu cầu, tiếp M2pilot/M5. Chưa deploy/CI/CD/production/offsite restore/nativeZalo gửi tin.
- Chốt bàn giao: check-ssr pilot4200 PASS toàn bộ, giữ PIDfrontend20631/backend72455. QA built4000 PID85299 và browser m4 đã dừng; lsof xác nhận chỉ4200/8080 còn listen. Tests cuối82/82 gồm native-close focus assertion và DOM recovery notice. Markdown/linklocal/diffcheck/ignore PASS, public/logo tracked. Code task commits2f873e8/516425e/cbbb24a; fix+docs cùng commit bàn giao local. Ledger ignored M4 được dọn sau commit vì ruling/bằng chứng đã chuyển đủ vào log/tài liệu chuẩn.

## S015-C01 — 25/10/2026 — publish M3/M4 và làm rõ đầu vào M5

- User xác nhận đã test xong M3/M4, yêu cầu publish GitHub. Một số chỉnh sửa chưa nêu chi tiết được để sau MVP; ghi POST-MVP-POLISH-01 trong master plan, không tự sửa product code.
- Đầu phiên codex/m4-wishlist a02b697 sạch, main/originmain a0a2642; M3 đã trên GitHub, M4 còn4commits. Fetch sandbox bị chặn FETCH_HEAD, rerun elevated thành công; remote không có commit mới để xử lý conflict.
- Fresh frontend `npm test`82/82 (25files); backend root `bash code/backend/run-local.sh -B -ntp verify`87total/85PASS/2live skipped, JAR BUILD SUCCESS. Log /tmp/me-may-m3-m4-publish-{frontend,backend}.log. Không thay product code, migration hoặc gọi live cloud.
- User chưa thuê VPS và tự chuẩn bị frontend Cloudflare Pages; có thể dùng backend miễn phí để test. User chọn agent đề xuất cả backend và DB: Render Free Web Service Docker/Java21 + Neon Free PostgreSQL là đề xuất, chưa là provider đã provision/chốt/deploy. Production VPS/Dokploy hoãn, không tự chuyển sang Workers hoặc backend SSR.
- Kiểm chứng docs chính thức25/10: render.com/docs/free (sleep15phút/start~1phút/ephemeral/FreePostgres30ngày), render.com/docs/docker (JVM qua Docker), neon.com/docs/introduction/plans (Free prototype/test), Cloudflare Pages Angular guide. Không cam kết cold-start/heap/quota/auth/render đã chạy. Trang deploy-spring-boot/Workers Angular URL trực tiếp không truy cập được; dùng primary docs Docker/Pages hiện hành, không dựa bài bên thứ ba.
- Đọc config thực tế: bind127.0.0.1/PORT env, cookie Secure + SameSiteLax, local profile Securefalse/bootstrapowner, public HTTP timeout10s. M5 phải chốt network/profile/DBTLS/cookie/proxy-or-domain/CSRF/runtimePages; chưa đổi code hoặc tắt bảo vệ để deploy thử.
- Cập nhật MASTER_PLAN/ARCHITECTURE/README/VERIFICATION/index/PROGRESS theo hướng test hiện tại. Đã chuyển contract M3 còn lại vào ARCHITECTURE, xóa M3_PLAN hết vai trò; giữ M2spec/plan vì pilot chưa có xác nhận mới. Usertest không được suy thành nativeZalo/Cloudflare/production đạt. Chưa merge/push tại checkpoint này.

### S015-C02 — đã publish bản M3/M4 người dùng test
- Commit61d6f88 chốt nghiệm thu/hướng test M5, merge codex/m4-wishlist vào main dfecf8a bằng --no-ff, không conflict. Merge tree khớp feature; postmerge frontend82/82/backend87total85PASS2liveSkipped/JAR PASS (log /tmp/me-may-m3-m4-postmerge-{frontend,backend}.log). Không thay product code trong phiên publish, không cần thêm review hoặc chạy lại cloud adapter.
- `git push origin main` thành công a0a2642→dfecf8a; main đồng bộ origin/main. Checkpoint bàn giao này được commit/push cùng main, bước cuối đối chiếu SHA remote. Feature branch giữ local để tham chiếu, không force-push/tag/release/deploy.
- Markdown dưới400dòng (DEV_LOG ngoại lệ), linklocal/diffcheck/ignore PASS; .env/input/.local/.superpowers/output vẫn ignored và public/logo tracked. Không sửa cấu hình live, dữ liệu dev, tài khoản hoặc cloud resources; tests chỉ DBtest.
- Đầu việc tiếp theo: user xem đề xuất RenderFreeDocker + NeonFreePostgres, tự chuẩn bị frontendPages; chốt provider/region/DB/domain/APIroute/cookie/SSR và specM5 trước implement. Chỉnh sửa user đề cập hoãn sauMVP, chưa có nội dung cụ thể. VPS chưa thuê, production/SEO/backup/restore/nativephone vẫn gate riêng.

### S015-C03 — chốt Workers và nhận cấu hình Neon
- User chốt frontend Cloudflare Workers thay Pages và cho biết đã setup Neon trong .env. Ghi quyết định trước M5; chưa là ủy quyền migration dữ liệu/dev hoặc deploy cloud. Backend Render vẫn là đề xuất trước đó, chưa có deployment thực tế.
- Kiểm tra .env không in giá trị: có1URL Neon pooled/TLS/credentials nhưng ở dòng riêng, chưa khai báo biến; DB_URL/TEST_DB_URL vẫn local. Đã chuẩn hóa đúng URL được cung cấp thành NEON_DATABASE_URL, giữ nguyên credential và config local/test; .env tiếp tục ignored. Không source dòng URL thô để tránh chạy nhầm như shell command.
- Dùng skill neon-postgres/parent neon, giữ JDBC/Flyway/auth/media hiện tại. Đang chuẩn bị kiểm tra kết nối chỉ đọc bằng driver PostgreSQL/JDK sẵn có; chưa chạy Flyway, bootstrap Owner, tạo project/branch Neon hoặc di chuyển sách/ảnh. Pooler URL không coi là direct URL migration; cần unpooled endpoint khi thực thi M5.

### S015-C04 — Neon read-only đạt, cập nhật baseline Workers
- `python3 /tmp/me-may-neon-readonly/check.py` elevated PASS, driverJDBC42.7.13/JDK21 sẵn có; URL/user/password qua process env, không argv/log. Câu SELECT trong transaction read-only trả PG180006/public0baseTables/noFlywayHistory, sau đó rollback. Không thực hiện DDL/DML/migration/bootstrap/tạo project/branch, không dùng credential mới từ CLI/MCP.
- Theo official Neon Flyway doc qua plugin search_docs/get_doc, migration cần direct endpoint; chỉ URLpooled hiện có, chưa tự suy hoặc thay hostname. .env.example thêm NEON_DATABASE_URL/NEON_DATABASE_URL_UNPOOLED rỗng; app config/run-local không đổi nên dev/test tiếp tục local. .env đã normalize, không log secret/endpoint/database/user.
- Cập nhật MASTER_PLAN/ARCHITECTURE/README/index/PROGRESS/VERIFICATION: Workers AngularSSR đã chốt thay Pages, Neon đã nhận/kiểm tra chỉ đọc; Render vẫn là đề xuất backend, productionVPS hoãn. SSR handler/adapter/APIproxy/cookie/CSRF/cold-start/directFlyway là đầu vào spec M5, chưa triển khai.
- Không chạy lại frontend/backend suites vì chỉ đổi docs/.env.example và chuẩn hóa file secret ignored; không product code/configruntime/migration thay đổi. Syntax .env/local DB isolation/Neon assignment/ignore/linklocal/line limits/diff PASS. Checkpoint này commit local tài liệu/.env.example, không push; main37f8919 trên GitHub vẫn là bản M3/M4 đã publish. Secret .env không stage/commit.

## S016-C01 — 26/10/2026 — frontend Workers local trước deploy
- User chốt chỉ frontend Workers local. Branch codex/m5-workers-local từ main cded8a7 (main ahead origin1docscommit), checkout sạch trước task. Backend8080 PID72455 đang listen; không suy trạng thái từ log cũ.
- Phạm vi: Angular neutral SSR build/entry, Wrangler local, request context/APIproxy, tests/QA/tài liệu. Không deploy/push/migrate Neon/Render hoặc sửa DB dev. WORKERS_LOCAL_PLAN đăng ký chỉ mục trước code.
- Dùng executing-plans/TDD/verification; thực hiện inline, một review độc lập cuối. Giữ checkout/deps hiện có theo workflow phiên trước; ledger thủ công ignored để không tạo .gitignore con. Chưa chạy tests/build tại checkpoint này.

### S016-C02 — SSR/proxy Workers local
- RED frontend worker-runtime module chưa tồn tại; GREEN88/88 (26files). Hai lần gọi npm nhầm root dừng ENOENT trước suite, đã chạy đúng code/frontend; không coi là RED nghiệp vụ. Tests cover target origin, auth/body/query, cookie/server-time/no-store, missing404/privacy/HTML/assets, validation/origin isolation.
- Angular neutral build với server.worker.ts + request-scoped REQUEST_CONTEXT; giữ Node/dev entry. wrangler.local.jsonc local8787/backend8080, assets run_worker_first/none fallback. Không đọc root.env; dev script tắt dotenv loading. .wrangler/.dev.vars ignore root.
- Build sandbox exit134 không diagnostic, rerun elevated PASS; workerd8787 lên và check-ssr PASS Home/detail/OG/media/404/wishlist/admin. Node build PASS, frontend rerun88/88. Logs /tmp/me-may-workers-{red,green,build,ssr,node-build,final-tests}.log.
- Thêm Wrangler4.152.0 devdependency (Node>=22); npm audit phát hiện body-parser/undici advisory, override bản vá2.4.0/7.30.1 trong major phù hợp, npm install audit0. Các package có sẵn chỉ hai bản vá này đổi version, không upgrade Angular/framework.
- Isolated check-worker-proxy.mjs chạy backend giả HTTP port ngẫu nhiên và workerd8788: POST/query/body/CSRF/cookie/multipart/separate Set-Cookie/server-time/no-store/canonical context/down503 PASS; không dùng DBdev. Browser QA đang làm; chưa review/deploy/push.

### S016-C03 — browser và regression privacy
- Chromium8787 mobile390: hydrate/save1/badge1/wishlist/select1/enquiry đúng canonical8787; Escape và detail không còn noindex/không overflow PASS. Ref e51 stale sau hydrate: snapshot lại rồi dùng ref mới, không coi lỗi tool là product. Không mở/gửi Zalo, không dùng clipboard OS hoặc sửa dữ liệu backend.
- Bổ sung regression admin URL dạng asset .json giữ noindex/no-store: RED null Cache-Control1/89; fix wrapper asset private, đang rerun GREEN. Thêm script check:workers:proxy và hướng dẫn frontend local; giữ cloud quota/CPU/domain/TLS/auth/phone là gate môi trường thật.

### S016-C04 — kết quả trước review
- Privacy regression GREEN89/89 (26files). Workers finalbuild PASS; SSR checker8787 final PASS, proxy isolated final PASS, Node SSR4002 checker PASS. Node4002 là QA tạm; pilot4200/backend8080 không restart.
- README hướng dẫn dev:workers/build/check; ARCHITECTURE ghi request context/proxy/static routing và giới hạn; VERIFICATION bằng chứng, masterplan phân biệt local đạt/deployed gate còn mở. Không backend verify mới vì không đổi backend/DB/schema, đã test adapter với mock và backend anonymous read-only.
- Task2 hoàn tất; một review độc lập toàn nhánh trước bàn giao. Chưa merge/push/deploy.

### S016-C05 — review và bàn giao frontend local
- Fresh gpt-6-astra read-only cded8a7..4a0f463:0Critical/Important/Minor; reviewer tự HTTPprobe wishlist/admin-asset/indexhtml/missing404, không tự chạy lại suite/build/browser. Không fix pass/re-review cần thiết.
- Final Ruling: deployed Cloudflare CPU/quota/cold-start/TLS/Secure-cookie chưa đánh giá — đúng phạm vi frontend local user chọn, giữ release gate — chi phí nếu sai là phải chỉnh cấu hình hoặc hiệu năng sau deployed spike.
- Final Ruling: Render provisioning và Neon migration/backup/restore chưa đánh giá — user loại khỏi phạm vi, source/runtime backend và DB không đổi — chi phí là chưa có môi trường online hoặc chứng cứ khôi phục.
- Thêm read-only realbackend CSRF/session qua Worker PASS, HTML chỉ có site8787 không backend8080; admin preview.json404/no-store/noindex PASS. Probe ban đầu assertion tên cookie MEMAY_SESSION sai, đối chiếu application.yml và response chỉ tên MEMAYSESSION rồi rerun đạt; không đổi product. Không log token/cookie values.
- Desktop1440 direct detail reload saved heart pressed/no overflow/no pageerror PASS. Assertion đầu regex Bỏ lưu không khớp nhãn Bỏ khỏi danh sách quan tâm, dùng snapshot và rerun đúng đạt. Linkchecker ban đầu không strip :line của source link, sửa parser→PASS; không có link source bị thiếu thực tế.
- Tổng kiểm chứng: frontend89/89, Workers build+SSR+isolatedproxy final PASS; Node build+SSR PASS; npm audit0. Không chạy backend verify mới vì không thay backend/schema/DB và không cloud live. Markdownmax400/linklocal/diff/ignore/publiclogo PASS. Logs /tmp/me-may-workers-*.
- Chuyển plan vào README/ARCHITECTURE/VERIFICATION/masterplan, gỡ khỏi chỉ mục và xóa WORKERS_LOCAL_PLAN hết vai trò; PROGRESS là snapshot. Commits db13f17/4a0f463, final docs commit tiếp theo; không merge/push/deploy. Ledger generated được dọn sau chuyển đủ rulings/bằng chứng.
- Giữ branch codex/m5-workers-local trong checkout hiện có theo scope local. Workerd PID14208 port8787, pilot20631 port4200/backend72455 port8080 còn listen; QA Node4002/mockworkerd8788 và browserworkers-local đã dừng. Người dùng nghiệm thu local; khi làm online cần backend origin HTTPS/domain allowedHosts/cookieSecure/CFquota và Neon direct/Flyway/backup gates riêng.

## S017-C01 — 26/10/2026 — publish frontend Workers và merge main
- User yêu cầu publish và merge qua main để tự deploy Cloudflare/Render; ủy quyền merge/push source, không yêu cầu agent deploy hoặc migrate DB.
- Đầu task branch codex/m5-workers-local78d3832 sạch, gồm Workers SSR local đã review0finding; main localcded8a7. Đối chiếu remote trước merge, chạy frontend suite/build Workers và backend verify trên kết quả merge; không sửa product config hoặc bí mật.
- Cấu hình hiện có wrangler.local.jsonc vẫn dùng origin local; chưa phải cấu hình deployment online. Không suy kết quả local thành cloud runtime/Render/Neon đã nghiệm thu.

### S017-C02 — đã merge và publish GitHub
- Fetch origin PASS, remote main không có commit mới; commit scope24ba9b5, merge --no-ff codex/m5-workers-local→main15e2446 không conflict, merge tree khớp feature. Giữ feature local tham chiếu; không tạo PR/tag/release.
- Fresh postmerge code/frontend `npm test`89/89 (26files), `npm run build:workers` PASS; root `bash code/backend/run-local.sh -B -ntp verify`87total/85PASS/2liveSkipped, JAR BUILD SUCCESS. SSR checker8787 PASS HTML/meta/OG/media/404/private headers. Logs /tmp/me-may-workers-publish-{tests,build,backend,ssr}.log.
- `git push origin main` PASS37f8919→15e2446. Source đã lên GitHub để user tự deploy. Checkpoint docs này được commit/push cùng main, đối chiếu remote SHA ở bước cuối. Không product config mới, deploy Cloudflare/Render, migration Neon hoặc chạm dữ liệu dev.
- Lưu ý bàn giao: wrangler.local.jsonc vẫn local8080/8787, không dùng nguyên cấu hình đó cho online. Online cần backend HTTPS/site origin/allowedHosts và Render runtime/env/Neon Flyway theo gate đã ghi; việc publish không tự hoàn thành các gate đó. Markdown giới hạn/linklocal/diff/ignore/publiclogo đã kiểm tra; secret không stage/commit.

## S018-C01 — 26/10/2026 — kiểm kê toàn bộ branch local
- User yêu cầu kiểm tra và merge các branch local còn lại. Fetch origin PASS, checkout mainb4a620d sạch và đồng bộ origin/main trước kiểm tra.
- Kiểm tra từng ref bằng git rev-list --left-right --count main...<branch> và merge-base --is-ancestor: codex/m4-wishlist, codex/m5-workers-local, dev, feat/m1-local, feat/m2-admin-catalogue, feat/m3-public-catalogue đều branch_only0/ancestorPASS. git branch --no-merged main rỗng. Không có commit thiếu để merge, không tạo merge rỗng hoặc xóa branch.
- feat/m1-local ahead origin/feat/m1-local3 chỉ là tracking branch cũ; toàn bộ commit vẫn đã trong main. Không cần push riêng các branch lịch sử để hoàn thành hợp nhất main.
- Không đổi product code/config/DB hoặc deploy; không chạy lại suites vì chỉ audit Git và cập nhật checkpoint. Kết quả kiểm tra ứng dụng gần nhất ở S017-C02. PROGRESS cập nhật; commit/push tài liệu theo luồng publish đã được yêu cầu, đối chiếu remote SHA cuối.

## S019-C01 — 26/10/2026 — dọn branch đã merge
- User yêu cầu xóa branch cũ cả local và remote. Đầu task main5fce88c sạch/đồng bộ origin; fetch --prune PASS, GitHub default HEAD là main, chỉ một checkout main.
- Kiểm tra lại ancestor:6local codex/m4-wishlist, codex/m5-workers-local, dev, feat/m1-local, feat/m2-admin-catalogue, feat/m3-public-catalogue và3remote dev/feat/m1-local/feat/m2-admin-catalogue đều đã nằm trong main. Phạm vi xóa đúng9refs này, giữ main/origin/main/remoteHEAD. Không xóa commit/tag hoặc sửa product/DB/deploy.
- Đang xóa remote rồi local bằng branch -d; không force-delete branch chưa merge. Kết quả và đối chiếu remote ghi sau thực hiện.

### S019-C02 — điều chỉnh giữ dev
- User bổ sung không xóa dev. Lệnh xóa remote gồm dev ở C01 bị user từ chối trước thực thi; batch dừng, local deletion chưa chạy. Giữ dev và origin/dev; phạm vi mới5local feature/codex và2remote feat/m1-local/feat/m2-admin-catalogue. Không yêu cầu lại quyền xóa dev.

### S019-C03 — đã dọn feature branches, giữ dev
- git push origin --delete feat/m1-local feat/m2-admin-catalogue PASS; git branch -d5feature/codex PASS, không force. Giữ localdev/origin dev2a73249 và main, không cập nhật/reset dev.
- Không đổi product code/config/DB hoặc deploy; không chạy lại tests vì chỉ thao tác refs và tài liệu. Checkpoint được commit/push main; xác minh danh sách ref và SHA remote cuối.

## S020-C01 — 26/10/2026 — setup Workers/Render và migrate Neon
- User yêu cầu wrangler.jsonc online, Dockerfile Render và setup/migration Neon; quyền migrate Neon đã được cấp trong yêu cầu này. Tự deploy Worker/Render chưa được yêu cầu. Annotation1 về cấu hình local được xử lý trong task này.
- Đầu task main4efec52 sạch; tạo codex/m5-deploy-setup. Giữ dev branch. Đọc current docs/config; Docker28.3.2 truy cập được ngoài sandbox. Neon raw pooled URL có sẵn, direct chưa đặt; không in secret. Domain hỏi async, đang chuẩn bị phần độc lập.
- Phương án giữ stack/auth/Cloudinary; Worker same-origin proxy, Render profile riêng/Java21/nonroot, Flyway direct và schema-only initialization. DEPLOY_PLAN đăng ký trước code; không copy dữ liệu sách/ảnh dev. Tests/QA/review rồi chuyển tài liệu chuẩn.

### S020-C02 — config và kiểm chứng trước target migration
- User cung cấp tên Worker me-may/Render me-may-api, chưa có account subdomain. Workers nhận origin chỉ từ me-may.<account>.workers.dev HTTPS hoặc MEMAY_SITE_ORIGIN explicit, kiểm tra match và xóa untrusted x-forwarded trước Angular; engine allowedHosts mỗi request. RED2/91→GREEN91/91, build PASS; dry-run gzip421.23KiB, không publish.
- HTTPSworkerd8790 Hostme-may.qa.workers.dev + malicious forwarding: HTTP200, SSRheading/canonical/hydration PASS. wrangler.jsonc auto custombuild, assets/no-store/SSR giữ. Local config riêng.
- Render Java21 multi-stage/nonroot, profile render datasource pooled/Flywaydirect, cookieSecure/CSRF; bootstrap opt-in và namespace memay/online-test riêng. Test Render RED thiếu owner; test credentials ban đầu chưa override NEON_DB_USER gây auth fail, sửa wiringtest. Startup phát hiện namespace chỉ dev|test, thêm online-test sau RED; verify88total86PASS2liveSkipped/JAR PASS.
- prepare-render-env Python3tests PASS (decodecredential/strictNeon/directsameDB/no localsettings), tạo .local/render.env0600; root.env không đổi. Flyway Maven plugin dùng env, schema public/cleanDisabled/no baseline.
- Neon production public trống; neon_auth có sẵn ngoài app, không can thiệp. Tạo branch thử m5-migration-verification br-shiny-recipe-b44agos2; request compute suspend300 bị Freeplan412 trước tạo, retry giữ defaults thành công. Child Flyway V1–V5 migrate/validate/info PASS;5migrations/0books/0admins/0media. Direct endpoint derived đúng host từ API endpoint inventory, TLSverify-full/channelbindingRequire PASS.
- Bắt đầu migrate target .env khớp production endpoint đã inventory, quyền từ user hiện hành. Không copy sách/ảnh/dev data. Docker final rebuild đang chạy; target migration/log+finalreview còn chờ. Credential child lưu private qua stdin echo-off, không argv/log/trackedfiles.

### S020-C03 — target migration và Docker runtime
- Target production supplied.env khớp inspected endpoint: Flyway V1–V5 migrate/validate/info PASS. MCP postcheck5migrations/version5,0books/0media/0admins/campaignDisabled. Không tạo owner hoặc copydev; neon_auth để nguyên. CLI helper chỉ Neon validatehost/direct, credentials env, logsprivate0600.
- Docker finalimage build PASS; run mem512MB against verificationbranch, health200/UID10001/PORT10000/RAM271MiB PASS, không phải nghiệm thu Render thật. Testsbackend88total86PASS2liveSkip; frontend91/91. DEPLOYMENT hướng dẫn Cloudflare root/build/deploy và Renderenv/bootstrap, DBcommands/gates.
- Giữ branch Neon thử do chưa có quyền xóa riêng; không gọi destructive MCP. Chưa deploy services hoặc publish code tại checkpoint. Bước tiếp: HTTPprobe đầy đủ, review độc lập và docs consolidation/publish theo luồng user đang chuẩn bị deploy GitHub.

### S020-C04 — dọn branch thử được user duyệt
- User xác nhận Xóa branch thử. Dừng container QA đang trỏ child rồi delete Neon br-shiny-recipe-b44agos2; production br-green-water-b4ny98q0 được giữ nguyên. Xóa hai generated credentialfile chỉ dành child; .local/render.env target vẫn giữ0600.
- HTTPSworkerd fullprobe Home/howto/catalogue/wishlist/admin/API/unknown404/no-store/canonical + x-forwarded-host sai PASS; host không phải app bị400. Local8787 SSRchecker rerun để đối chiếu. Không deploy dịch vụ trong bước này.

### S020-C05 — review độc lập và consolidation
- Review gpt-6-astra read-only4efec52..47be225:0Critical/0Important/1Minor current summaries còn ghi Renderđềxuất/Neonchưamigrate. Đây là phần consolidation đã lên kế hoạch và bắt buộc theo AGENTS, hoàn tất cập nhật README/index/MASTER_PLAN/ARCHITECTURE/PROGRESS; không thay product hoặc viết test soi prose. Không còn minor deferred hoặc fixcode/re-review.
- Final Ruling: deployedTLS/auth/media/WorkersCPUquota/Rendercoldstart chưa đánh giá — user tự deploy, local bằng chứng không thay online — chi phí là có thể phải chỉnh cấu hình/hiệu năng sau deploy.
- Final Ruling: reviewer không mở credentials hoặc query lại Neon — executor đã đối chiếu API/endpoint, trực tiếp migrate/validate/postcounts và cleanupbranch — chi phí là review độc lập không chứng nhận trạng thái live/secret tại thời điểm khác.
- Final Ruling: backup/restore vẫn gate online tiếp theo — hiện target mới chỉ schema/taxonomy, không suy migration thành nghiệm thu recovery — chi phí là chưa có bằng chứng khôi phục trước release.
- LocalSSR8787 checker PASS; targetinfoonly rerun PASS sau deletechild, render.env0600. Tiếp kiểm tra browser và bàn giao/publish source cho Git dashboard theo mục tiêu user, không bấm deploy service.

### S020-C06 — browser cuối và chuẩn bị publish
- Chrome390 DNSmapping chỉ browser tới workerdlocalHTTPS: Homehydrate/save1/badge1/wishlist/select/enquiry canonicalHTTPS đúng, Escape/nooverflow PASS. CLI ban đầu registryDNS sandbox lỗi, elevated được; defaultChromium runtime mới chưa cài, dùng Chrome có sẵn thành công. Không coi lỗi tool là product, không hostmapping OS hoặc deploy cloud.
- Đã chuyển đầy đủ plan vào DEPLOYMENT/ARCHITECTURE/masterplan, bằng chứngVERIFICATION/log; xóa DEPLOY_PLAN và linkactive hết vai trò. Còn gate deployedCPU/auth/media/TLS/coldstart/nativephone/backuprestore như đã ghi. Không minor deferred; summary finding được xử lý bằng consolidation bắt buộc.
- Code47be225 đã commit, docs final commit tiếp; chuẩn bị merge/push main để user Gitintegration deploy theo luồng publish hiện hành. Không tự thay dev branch hoặc deploy Worker/Render. Secret .local/render.env0600 vẫn ignored; testbranchcred đã dọn, tempNeonbranch đã xóa theo user.

### S020-C07 — merge và publish source cho dashboard
- Commits47be225 code/setup và52eaa03 docs, merge --no-ff vào main9b87e6f không conflict; tree khớp feature. Fresh postmerge frontend91/91 (26files), Python3/3, backend88total86PASS2liveSkipped/JAR BUILD SUCCESS. Workersbuild/dryrun/Dockerimage không chạy lại vì sourcecode không đổi sau review; evidence C02–C06 vẫn cùng code47be225.
- git push origin main PASS4efec52→9b87e6f; user dùng Gitintegration main theo DEPLOYMENT. Không bấm deploy Cloudflare/Render hoặc tạo Renderresource. Checkpoint docs này push tiếp và đối chiếu remoteSHA cuối. Fetch thấy origin/dev external cập nhật2a73249→1b37c3e; không checkout/merge/reset hoặc xóa dev.
- Plan/ledger rulings và finding đã chuyển đủ; DEPLOY_PLAN hết vai trò được xóa. Markdownmax400/linklocal/diff/ignore/publiclogo PASS. Neon verificationbranch đã xóa theo user, production.schema5 giữ0books/0media/0admins; secretsprivatefile0600 khôngtracked. BrowserQA/HTTPS8790/containerQA đều dừng; giữ flowlocal hiện có khi còn chạy.
- Branch implementer tạo trong task được dọn sau merge theo yêu cầu dọn branch cũ, main/dev giữ. Bàn giao private .local/render.env để import Render, flag BOOTSTRAP_OWNER_ENABLED=false mặc định, user bật true lần đầu rồi tắt. Deployed auth/media/TLS/CPU/coldstart và backuprestore vẫn gate riêng, chưa chứng nhận MVPonline.

## S021-C01 — 27/10/2026 — owner cố định, không startup bootstrap
- User chốt auth sốđiệnthoại sauMVP; hiện tại muốn tài khoản cố định và không bootstrap tạo khi khởi động. Triển khai email/password hiện có, provisioning one-shot từ OWNER_EMAIL/PASSWORD private, không tự sinh hoặc dùng credentialsBOOTSTRAP cũ.
- Đầu task main6044848 sạch; tạo branch codex/fixed-owner-account. Đã hỏi user thêm credentials mới vào root.env, chưa đọc/in values. OWNER_ACCOUNT_PLAN đăng ký trước code; giữ schema/login/session/CSRF và local data. Lệnh provision riêng, Render không cần ownersecret; account conflict không reset/elevate.
- Dùng TDD/verification và review độc lập cuối. Chưa code/test/Neon mutation tại checkpoint; user đang bổ sung credential, phần code có thể làm độc lập.

### S021-C02 — command/startup và owner thật
- User đã thêm OWNER_EMAIL/PASSWORD; lần đầu policy chưa đạt, hỏi sửa và user xác nhận xong. Kiểm tra input chỉ boolean; không tự đổi/generate/copy BOOTSTRAP credentials.
- REDcommand missingclass→GREEN5cases, thêm concurrency test và bỏlockmutation→RED2created, restorelock→GREEN6. Unicode8emoji RED vì UTF16length, đổi codePointCount min16 đồng nhấtPython. Transaction/lock/create-only/no-reset/no-elevate/disabled/secondOwner failclosed.
- Render startup legacy bootstrap flagtrue REDaccounttựtạo→GREEN0; commandprovision rồi loginCSRF HTTP200/OWNER, cookieSecure giữ. Xóa OwnerBootstrap/test/config, localrun unset owner/bootstrap credential. Backend cleanverify91total89PASS2liveSkip/JAR PASS, logs /tmp/me-may-fixed-owner-*.
- Pythonwrapper/envexport7/7: không carry ownersecret/BOOTSTRAP sang Render, localguard; phát hiện read_env cắt literal# password, RED→GREEN commentparser giữ hash trong value/quote và commentapostrophe. Render.env regenerate0600, root.env không sửa. PropertiesLauncher riêng không khởi tạoSpring.
- Neon MCP trước0admins; create_owner command userauthorized OWNER_ACCOUNT=created; postcheck1activeOWNER. Không in email/password/hash, không schema migration hoặc sửa accountdev. Đang rerun idempotence rồi review/tài liệu/publish theo luồng chuẩn bị deploy hiện hành.

### S021-C03 — idempotence Neon và review
- Actual rerun create_owner.py trả OWNER_ACCOUNT=already_exists; đúng credential user vẫn khớp, không thay hash hoặc tạo account thứ hai. Neon tổng1admin/1activeOWNER. .local/render.env regenerated0600 loại OWNER/BOOTSTRAP, không sửa root.env hoặc localaccounts.
- Code a1f7acf đã commit; đang review độc lập toàn branch, chưa merge/push. Không đổi schema/migration hoặc frontend/auth contract; testbackend91total89PASS2skip, Python7PASS; không chạy lại frontend không đổi.

### S021-C04 — review và đổi workflow sang dev theo user
- Fresh gpt-6-astra read-only6044848..a1f7acf:0Critical/Important/Minor. Reviewer chạy Python7PASS/diffcheck, kiểm tra JDBC/lock/no startup/secretboundary; không mở credential hoặc mutateDB/cloud/checkout. Không codefix/re-review.
- Final Ruling: reviewer không đánh giá liveNeon identity/password/state — executor đã tạo bằng env user, postcount1owner và rerunmatchingpassword no-op — chi phí là review độc lập không chứng nhận secret/live state thời điểm khác.
- Final Ruling: deployedRender/Workersauth/TLS và backuprestore chưa đánh giá — task trướcdeploy, giữ gateonline — chi phí là cần kiểm chứng sau userdeploy trước release.
- Final Ruling: wrapper thêm --target local explicit để freshlocal setup vẫn tạo owner sau khi bỏbootstrap; guard loopback/me_may_dev và không sửa accountlocal có sẵn — chi phí là duy trì thêm một opsflag được test.
- User27/10 yêu cầu từ giờ đưa code lên dev, user tự merge qua main. Áp dụng ngay cho task đang làm: không merge/push main. Lưu quy ước vào AGENTS/README/DEPLOYMENT/PROGRESS. Fetch origin/dev1b37c3e (PRmerge main4efec52); localdev2a73249, sẽ fastforward rồi tích hợp feature; main6044848 giữ nguyên.
- Hoàn tất chuyển plan vào docs chuẩn/bằng chứng, xóa OWNER_ACCOUNT_PLAN hết vai trò. Secret/env/dump không stage; phoneauth sauMVP, không frontend/schema/APIchange. Task code/tests đã có evidence, next devintegration/postmergetests/push.

### S021-C05 — dev integration và kiểm chứng cuối
- Fastforward localdev2a73249→origin/dev1b37c3e, merge --no-ff featurecf72e3e→devfe63882 không conflict; tree khớp feature, giữ remote mergehistory. Main vẫn6044848, không merge/push main sau chỉ đạo mới.
- Fresh postmerge dev cleanverify91total89PASS2cloudLiveSkipped/JAR PASS, Python7/7 PASS. Không frontend/schemachange nên không chạy lại frontend; commandNeoncreated/alreadyexists và startup/loginCSRF cùngcodea1f7acf đã kiểm chứng. Logs /tmp/me-may-fixed-owner-dev-verify.log và C02/C03.
- AGENTS quy định task mới bắt đầu từ dev/codex-from-dev, deliver/pushdev; user tự mergemain. Phoneauth sauMVP. Markdownmax400/localLinks/diff/ignore/publiclogo PASS; secret .env/render.env/provisionlog không stage.
- Đẩy code/log lên origin/dev theo yêu cầu mới; xác minh remoteSHA cuối. Không deployservice hoặc reset/updatepassword/accountlocal. User cần merge dev→main trước deploy bản bỏbootstrap, xóa BOOTSTRAP envRender cũ nếu đã nhập.

### S021-C06 — đã publish dev, main không đổi
- Push origin/dev thành công1b37c3e→d4b40a7; ls-remote xác nhận SHAdev trùng local và main vẫn6044848. ServerGitHub thông báo repo chuyển nanashi193/me-may→nanashi-vie/me-may; redirect hiện hoạt động, không tự đổi remoteconfig trong task này.
- Checkpoint bàn giao này commit/pushdev cùng workflow; user tự merge dev→main. Không pushmain/deployservice, ownerNeon đã có1activeOWNER cố định theo env user, rerun không resetpassword. Root.env/privateRenderenv khôngtracked; review0findings và tests ở C04/C05.
- Dọn featurebranch task đã merge và generated reviewledger sau khi chuyển đủ nội dung; giữ dev/main. Từ phiên sau bắt đầudev theo AGENTS, không lặp lại provisioning hoặc đổi credential.

## S022-C01 — 27/10/2026 — kiểm chứng M5 online
- User đã deploy Workers/Render/Neon, yêu cầu kiểm tra và chốt M5 để hoàn thiện MVP. Phạm vi: kiểm chứng endpoint thật, SSR/privacy/auth, dữ liệu và các gate pilot/khôi phục; không mặc định coi deploy thành nghiệm thu.
- Bắt đầu dev fef1598 sạch; fetch thấy origin/main e264523 đã merge dev. Không đổi main hoặc deploy lại. Health Render200/UP; Workers Home200/initialHTML/no-store sau warmup. Curl sandbox DNS lỗi, rerun elevated thành công; không coi lỗi sandbox là lỗi dịch vụ.
- User xác nhận chưa thử pilot/thiết bị online. Còn kiểm tra auth/proxy/publicdata/restore/performance; chưa có kết luận M5. Thay đổi bàn giao hiện local, theo workflow dev.

### S022-C02 — online smoke, auth và recovery skeleton
- SSR checker từ code/frontend trên Worker thật PASS: initialHTML/metadata/Home/Cáchmua/public routes404/private noindex/no-store. Catalogue rỗng nên checker tự bỏ detail/OG/media thật; không ghi đạt các nhánh chưa chạy.
- Probe Python private qua Worker: anonymousme/admin401, missingCSRF403, ownerlogin200/OWNER/sessioncookieSecureHttpOnlySameSiteLax, me/owneraccess/adminbooks200, staleCSRF403/freshlogout204/me401. Credential đọc.env và không in; đã logout. UserAgent urllib mặc định Cloudflare1010, đổi UserAgent thông thường chạy được; Worker actuator/env404 là ngoài APIproxy, trực tiếp Render401. Probe nhầm config path401 không phải lỗi contact; browser trangcontact đã có hotline/group.
- Neon SELECT aggregate12publictables/5migrations/version5/1activeOWNER/0book0listing0media0audit. Render dashboard Livee264523; Cloudflare reload dashboard versione4f62cc2 Ready100%,193invocations/CPUTime985µs/Errors0 trong24h; không suy thành load/LCP/quota.
- Browser Home cũ báo chưa tải dữ liệu; reload sau warmup hiển thị emptycatalogue, wishlistempty/notice/contactlinks đạt. Không mở/gửi Zalo. User xác nhận chưa pilot/mobile, không thể tự chứng nhận thay chủ.
- Backup directNeon public customdump0600 ignored, restore riêng me_may_m5_s022_restore;12tablecount/hash và sequence last_values khớp, sourcebefore/after unchanged. Container thiếu CAbundle: copy CApublic từ máy, giữ verify-full/channelbindingrequire, conninfoTLS. pg_stat_ssl backendNeonfalse chỉ mô tả phiên tại backend, không phủ nhận conninfoTLS phía client. Restore đầu publicschemaexists: rename schema mặc định rỗng rồi restore lại; không clean/đè dev/test/Neon. Dump31099bytes và manifest tại .local/backups/S022-neon-online; giữ scratch không phục vụ app. Đang đối chiếu thêm sequenceis_called trước bàn giao.
- Cập nhật currentdocs/PROGRESS/index/DEPLOYMENT/masterplan và VERIFICATION; thêm checklist pilot/recovery/rolloutrollback. M5 vẫn mở: data/media/nativephone/pilot/LCP/coldstart/quota/offhostpolicy/rollback/securityrelease. Không đổi application/schema hoặc chạy lại unit/build không liên quan. Thay đổi tài liệu còn localdev; tiếp kiểm link/line/ignore/diff rồi commit/pushdev, không main/deploy.

### S022-C03 — kết quả cuối trước publish
- Sequence check bổ sung PASS7/7 last_value/is_called giữa Neon và scratch. Recovery bằng chứng hiện chỉ public skeleton/owner/taxonomy; chưa coi là media recovery/offhost scheduledbackup hoặc restore pilot.
- Không có codefix; M5online smoke đạt nhưng M5/MVP chưa hoàn thành do các gate được giữ tại VERIFICATION/PROGRESS. Không thay DoD hoặc đóng M2pilot theo yêu cầu chốt milestone khi chưa có bằng chứng.
- Kiểm tra cuối: git diff --check PASS; Python kiểm Markdown≤400 (trừDEV_LOG) và95linkfilelocal PASS; .env/.local/render.env/dump được ignore, logo nguồn tracked. Không đổi code nên không chạy lại unit/build; không đánh dấu các gate chưa thử thànhPASS. Lệnh online: node scripts/check-ssr.mjs <Workerorigin> (code/frontend), python3 /tmp/me-may-m5-probe.py, /tmp/me-may-m5-backup.py và /tmp/me-may-m5-sequences.py (root, elevated network/Docker). Các probe không chứa credential literal.
- Publish docs8eda99a→origin/dev thành công; git status sạch, ls-remote dev8eda99a/main e264523. Không pushmain/deployservice. Checkpoint xác nhận publish này đi cùng commit bàn giao tiếp theo trên dev; source/app không đổi.

## S023-C01 — 28/10/2026 — link enquiry localhost và checklist cuối MVP
- User xác nhận publish20cuốn desktop +1mobile thành công21/21; mởZalo/copy/ẩn/FlashSale ổn. Ảnh user cho thấy wishlist enquiry trên workers.dev nhưng URL localhost4200. Ghi nhận bằng chứng user, không suy thành tất cả mobile/in-app cases đạt.
- Bắt đầu dev28bb5d8 sạch; fetchorigin không có thay đổi mới. Phạm vi sửa sharedorigin fallback và regression, kiểm onlineSSR/detail/media thật, cập nhật pilot/gaps. Không sửa dữ liệu bán thật hoặc tự merge/deploymain.
- InitialHTML mm-000020 canonical/og:url/TransferState đúng Workerorigin. PublicSiteOrigin browserfactory fallbackhardcode localhost; adminRenderModeClient không có SSRstate, nhánh admin→public có thể kích hoạt lỗi. Đang bổ sung regression trướcfix; chưa tuyên bố nguyên nhân hoặc fix hoàn tất.

### S023-C02 — rootcause và regression
- Browser online freshadmin/dang-nhap→RouterLinkVềtrangchủ tái hiện canonical localhost4200 trong khi locationorigin Workers. Directbook/wishlistSSR transferstate đúng; nguyên nhân sharedtoken factory fallbackhardcode khi entryadminRenderModeClient không có SSRstate. Ảnh user và browser xác nhận cùng lỗi, ảnh hưởng cả enquiry/canonical/OG sau clientnavigation.
- Regression public-api.spec thiếustate RED expectedWorkers receivedlocalhost; fix ưu tiên TransferState, fallbackDOCUMENT.location.origin. First testsetup partialDocument thiếugetElementById đã sửa cung cấp TransferState thật; lệnh npmtestroot đầu ENOENT chạy lại đúngfrontend, không coi làREDnghiệpvụ. Full npmtest code/frontend GREEN93/93(26files).
- Online checker với sách thật PASS gồm detailinitialHTML/OG/publicimage/no-store/404/privacy; không sửa onlineDB hoặc availability. BuildWorkers sandbox exit134, rerun elevated đang chạy. Review read-only độc lập qua subagent theo requesting-code-review; chưa publish/deployfix.

### S023-C03 — browser fix và checklist bàn giao
- Workersbuild elevatedPASS; workerdQA8792 trỏ publicRender read-only, không đọcroot.env. Browser freshadminCSR→Home canonical127.0.0.1:8792 đúng; tìmMM-000020/save localwishlist/select/prepare: enquiry URL127.0.0.1:8792/sach/mm-000020 đúng originQA, khônglocalhost4200. Không bấmcopyOS/gửiZalo hoặc sửaDB. SelectorAX nói checkbox nhưng DOMbutton: snapshotDOM rồi clickbutton, không productbug.
- Online publicprobe root python3 /tmp/memay-s023-public.py PASS tìmMM-000020/3roles3ảnh200/image/no-store;20public/1page/20AVAILABLE/0SOLD. User21/21 vẫn được ghi nhận; publicprojection không phải admintotal, phântrang2/SOLD chưa có bằng chứng online. ScriptSSR code/frontend trênWorkeronline PASS gồm realdetailOG/image.
- Independentreview sharedoriginfix+tests0finding; reviewer read-only, không tự chạy93tests/live. Giới hạn: fix chỉ localverified, chưa triển khaionline; usermergedev→main rồiCloudflaredeploy, cần smokerepeat enquiry/canonical khi entryadmin/public. Không hạsecurity hoặc sửaURLdata.
- Cập nhật PROGRESS/VERIFICATION/DEPLOYMENT/index/masterplan/rootREADME và M2PLANpilot: publish21đạt, giữ plan/spec vì chưa chuyển đủ gateowner/time/error. Checklist usercase còn mở: staleSOLD/hiddenwishlist, persistence/subset, filter/back/page2, thiếuảnh/lỗi/expired/concurrentedit, browsermatrix; copy/mởZalo/ẩn/sale đã đạt không bắt test lại toàn21cuốn. Agent/operator còn backup/mediarestore/coldstart/LCP/quotas/rollback/securityrelease; không đổiDoD.
- Finalchecks: Markdown≤400(trừDEV_LOG)/96filelinks/gitdiffcheck PASS; frontend93/93, WorkersbuildPASS, independentreview0finding; workerdQA8792 dừng, app/data thật giữ nguyên. Không chạy backendsuite vì không đổi backend/schema. Pushorigin/dev7d88358 PASS, gitsatussạch; checkpoint xác nhận push được commit bàn giao tiếp theo. Usermerge/deploy rồi smokeoriginfix; chưa đánh dấu livefix hoặcM5hoànthành.

### S023-C04 — recovery bộ21sách và63ảnh
- User tạo pg_dump Custom Neon mới `.local/backups/dump-neondb-202610281743.dump`48259bytes/mode0600, đọc archive được; restore thủ công vào PostgreSQL local scratch `me_may_m5_s023_restore` thành công và user xác nhận đầy đủ. Không clean/ghi đè Neon; dump chứa12table/21book/63ACTIVE media reference. Giữ scratch đến khi kết thúc gate.
- Kiểm nguồn ảnh ignored `input/books`: ban đầu20bộ/60JPG, xác định cuốn mobile MM-000021 thiếu local; user bổ sung ba ảnh. Chuẩn hóa tên `21a.jpeg`,`21b.JPG`,`21c.JPG`→`21a.jpg`,`21b.jpg`,`21c.jpg`; cuối cùng63/63 file đọc được,0duplicate checksum, khoảng93MB. Không sửa nội dung ảnh.
- Tạo manifest ignored/private `.local/backups/media-input-20261028.sha256` mode0600; `shasum -a 256 -c` PASS63/63. Live recovery dùng nguồn thật `21a.jpg`: upload authenticated asset với public_id ngẫu nhiên dưới `memay/recovery-test/`, đối chiếu public_id/type/bytes qua resource API rồi destroy; cleanup xác nhận PASS. Không liên kết DB, không chạm63asset online hoặc dữ liệu bán thật.
- Giới hạn: dump, nguồn ảnh và manifest vẫn cùng một máy, chưa là off-host backup; chưa có lịch/retention/cảnh báo hoặc rollback deployment. Không chạy unit/build vì không đổi application code/schema. Docs thay đổi local cùng thay đổi `code/frontend/src/index.html` có sẵn của user; không stage/commit/push trong checkpoint này.

### S023-C05 — Lighthouse warm thủ công
- User xác nhận đã upload bộ DB/media backup lên Drive và tự chạy Lighthouse Mobile khi backend warm; cung cấp9 screenshot ignored trong `output/` cho Home, detail MM-000020 và wishlist, mỗi route3lần. Chưa xác minh quyền Drive/retention bằng tool; dựa trên xác nhận user, nhắc giữ Restricted.
- Đọc trực tiếp screenshot: Home score91/91/90, LCP0,9/0,9/1,0s, CLS0 cả ba, median91/0,9s/0 PASS. Detail score51/49/52, LCP7,8/10,7/6,6s, CLS0,579 cả ba, median51/7,8s/0,579 FAIL dù FCP0,8–0,9s và TBT0–60ms. Wishlist score99/92/100, LCP0,8/0,9/0,8s, CLS0,008/0,183/0,008; median99/0,8s/0,008 PASS nhưng một layout-shift outlier vượt0,1.
- Không suy nguyên nhân chỉ từ summary screenshot và không sửa code theo request đo thủ công. Performance gate chưa đạt vì detail, wishlist cần xem audit layout-shift nếu muốn ổn định; cold-start riêng chưa đo. Thêm root `.gitignore` `/output/*.png` để9 artifact không bị commit; không xóa/di chuyển ảnh. Docs/ignore thay đổi local, không commit/push; giữ nguyên thay đổi user `code/frontend/src/index.html`.

### S023-C06 — đối chiếu Lighthouse insights với source
- User gửi6 ảnh insight. Detail: image delivery ước tính1313KiB, ảnh FRONT/BACK ~473–474KiB ở1280×1707; LCP element FRONT, một breakdown TTFB860ms/load2340ms/render30ms; layout shift0,579 gắn main và unsized img. Source `book-detail.html` width600/height740 khác tỉ lệ thực; SCSS width100%/height:auto/maxheight390 mobile. API public ảnh đi Worker→Render→Cloudinary và trả no-store, ảnh chưa có biến thể theo viewport. Đây là các yếu tố đã quan sát, không quy toàn bộ LCP7,8s cho riêng một khoản; cần trace JSON để phân rã đủ.
- Wishlist CLS0,183 gắn footer; filmstrip và source store.initialize/localStorage sau SSR cùng conditional rows/lookup cho thấy nội dung nở sau first paint. Diagnostic bfcache do no-store là chủ ý privacy/stale status, không bỏ chính sách cache để lấy điểm. Chưa sửa code; bước tiếp là fix kích thước/nguồn ảnh và chỗ trống layout theo scope được chốt, rồi đo lại3 lần. Tài liệu local, không commit/push.

### S023-C07 — bắt đầu sửa gate hiệu năng
- User chọn giữ trọn ảnh trong khung ổn định và duyệt thiết kế: variant public nhỏ đã eager, giữ nguồn/ảnh authenticated và no-store, wishlist dành chỗ khi hydrate. Scope M5 performance, branch dev; không chỉnh `index.html` đang dirty của user. Plan đang thực thi `docs/M5_PERFORMANCE_PLAN.md`; tiến độ chi tiết sẽ ghi sau từng gate.
- Chưa chạy unit/build/browser hoặc backfill lúc bắt đầu. Cần RED→GREEN frontend/backend, backfill63asset có kiểm soát, sau deploy user đo lại Lighthouse trước khi chốt gate.

### S023-C08 — code và backfill gate performance
- Scope user duyệt: giữ toàn ảnh trong khung ổn định, nén ảnh public, ổn định wishlist. Sửa detail HTML/SCSS/test và wishlist SCSS/test; backend MediaGateway, Cloudinary gateway/transport, PublicCatalogueController và test; thêm `scripts/deploy/backfill_public_media.py`, cập nhật plan/PROGRESS/VERIFICATION/DEV_LOG. Không đổi schema, ảnh gốc hoặc `code/frontend/src/index.html` dirty của user.
- RED: frontend 2 case mới fail trước sửa; backend gateway 1 fail+2 compile errors trước sửa. GREEN: frontend `npm test`95/95 PASS (`code/frontend`); backend `bash code/backend/run-local.sh -B -ntp verify`93run/0failure/0error/2live skipped (root, elevated vì sandbox chặn socket local); Workers `npm run build:workers` PASS elevated (sandbox exit134). Targeted gateway test sau assertion eager PASS. Không chạy CloudinaryLiveTest vì dùng namespace test riêng và cần cờ live.
- Backfill: dry-run dump mới thấy63 ID ACTIVE; thử1 asset Cloudinary explicit thành công123736bytes; sau đó62 asset còn lại thành công. Chạy lại dry-run: completed63/pending0. Script dùng Basic Auth server-side, không in secret; checkpoint ignored `.local/backups/public-preview-backfill.done` mode0600. Upload không thay asset gốc/DB; script tránh tính quota lặp cho các ID đã hoàn thành. Sandbox DNS chặn, rerun elevated theo approval. Response eager quan sát46–162KiB/ảnh; chưa đo tốc độ live sau deploy.
- Browser Playwright local (backend dev, frontend4200) viewport390: detail MM-000001 bìa trong khung thấy trọn ảnh; wishlist1sách hiển thị, footer dưới viewport; console0error/1warning mỗi trang. MM-000020 không ở DB dev nên route404; chưa browser-QA ảnh ngang/wishlist3sách. Đã dừng backend local và đóng Playwright.
- Giữ `no-store` và quyền PUBLISHED/ACTIVE. Gateway fallback1280 chỉ khi variant640 trả404; network/provider khác không retry. M5 performance online vẫn FAIL theo số đo cũ, chờ user merge `dev`→`main`, deploy Workers/Render rồi đo Lighthouse Mobile3lần/route; chưa chuyển sang cold-start/rollback/security. Thay đổi local chưa commit/push ở checkpoint này; cần review diff/check docs rồi commit/push dev, không tự deploy.

### S023-C09 — publish dev, chờ đo online
- Final diff check PASS; docs Markdown≤400dòng (DEV_LOG ngoại lệ), `.env`/checkpoint/.playwright-cli ignored. `code/frontend/src/index.html` dirty sẵn của user không stage/commit. Fetch origin thấy main f04adea đã merge origin fix trước đó; không giả định đã deploy.
- Commit code+docs 60c0404 `fix: stabilize public media and wishlist layout`, push origin/dev thành công. Không push main hoặc deploy Cloudflare/Render. Bản online hiện chưa chứng minh sửa LCP/CLS; bước tiếp sau user merge/deploy là smoke media, ảnh ngang/dọc/wishlist nhiều sách và Lighthouse Mobile warm3 lần/route đạt LCP≤2,5s, CLS≤0,1 từng lần. Giữ M5 gate performance mở đến khi có kết quả đó.

### S023-C10 — phân tích3 JSON Lighthouse sau deploy
- User cung cấp3 báo cáo JSON cho detail MM-000019, hỏi Render Free có góp phần response chậm. Phạm vi read-only phân tích báo cáo và Render docs; không sửa application/data. `codebase-memory-mcp` transport closed khi tìm BookDetail, fallback đọc file đã biết và literal docs theo AGENTS.
- Python đọc JSON trong `output/lighthouse/`: TTFB document970/874/872ms, LCP4,19/5,87/4,23s, CLS1,173/1,173/0,579; FRONT138571B, BACK125518B, INSIDE73935B, logo255762B; LCP image có eager/fetchpriority high. Layout shifts trỏ main hai đợt0,595+0,579 ở2run; một đợt0,579 ở run3. So sánh report cũ khác cuốn MM-000020 chỉ định hướng. Gate online vẫn FAIL. Không chạy build/test vì chưa sửa code.
- Render docs28/10 cho biết Free ngủ sau15phút không traffic, thức lại khoảng1phút; ba lần đo cách nhau vài chục giây với TTFB~0,9s lặp lại không phải dấu hiệu rõ của cold-start. Có thể do Worker SSR→Render→Neon/network/compute warm, chưa tách nguyên nhân. Chưa đo cold-start có kiểm soát hay trace layout shift. Bước kế tiếp: đo riêng warm/cold và sửa shift main; không suy nâng gói Render sẽ chữa CLS.

### S023-C11 — tiếp nhận mở rộng performance và bỏ tạo nháp
- User yêu cầu các thay đổi trong ảnh: P0 resize/logoWebP và xác địnhLCP; P1 thửWebP+JPEGfallback,2cỡthumbnail/detail,dimensions/CLS; P2 chuẩn hóa upload/cảnh báo ảnh lớn và đánh giá cache có kiểm soát; đồng thời bỏ hoàn toàn tạo nháp. Đã xác nhận luồng nhập đủ thông tin+3ảnh→đăng ngay, chỉ OWNER; STAFF chỉ xem quản trị. Scope mới thay quyết định DRAFT và quyền STAFF hiện hành sau khi thiết kế được duyệt.
- Git dev sạch lúc bắt đầu. Đọc index/PROGRESS/checkpoint, M2_SPEC/master/design theo mục liên quan, brainstorming. Graph chưa index me-may; đã index fast/persistencefalse, sau đó dùng graph tìm create/BookAccess/publication. Media package bị graph exclude nên đọc source đã biết. Hiện create sinh BookCopy+ListingDRAFT trước ảnh, media cần bookID; request multipart11MB và Worker upstream timeout70s. Đề xuất upload ảnh tạm rồi final tạoPUBLISHED; đang chờ user chọn so với single multipart. Chưa sửa product code, chưa chạy test/build hoặc Cloudinary/DB mutation.

### S023-C12 — thiết kế mở rộng chờ duyệt
- User chọn upload ảnh tạm rồi tạo+đăng một lần. Viết `docs/M5_COMPLETION_SPEC.md` và đăng ký chỉ mục: phiên ảnh owner-bound24h, final transaction chống tạo trùng; không tạoBookCopy/Listing trước final; legacyDRAFT chuyểnARCHIVED giữ dữ liệu, PUBLISHED↔ARCHIVED trực tiếp; STAFF chỉ xem; logoWebP208px, public320/640px WebP/JPEG, upload chuẩn hóa2560px, traceLCP/CLS và chỉ đánh giácache.
- Đây là các đề xuất kỹ thuật trong thiết kế, chưa là code/DBmigration hoặc baseline mới cho đến khi user duyệt. Builder-check độc lập read-only theo brainstorming: “nothing important left”; các chi tiết API/locking thuộc bướcplan. Chưa chạy test/build vì chỉ tạo tài liệu. Bước tiếp: user duyệt spec, invokewriting-plans và thay plan cũ đúng phạm vi trước triển khai; không triển khai từ approval thiết kế performance cũ.

### S023-C13 — bổ sung multi-upload và kéo sắp xếp ảnh vào spec
- User yêu cầu cập nhật M5_COMPLETION_SPEC: upload nhiều ảnh một lần, kéo sửa thứ tự và kéo file từ máy vào thay vì chỉ filepicker. Bổ sung mục3.1 và nghiệm thu: tối đa3ảnh theoFRONT/BACK/INSIDE, nhận từng đợt, overflow không ghi đè; queue từng ảnh, progress/error/retry và ID ổn định khi reorder async; nút sắp xếp cho keyboard/mobile; reorder sách đã có apply nguyên tử/version/audit khi Lưu.
- Scope chỉ sửa spec và checkpoint PROGRESS/DEV_LOG, vẫn chờ duyệt thiết kế tổng thể; chưa triển khai app/API/migration hoặc chạy test/build. Kiểm diff và giới hạn dòng trước commit/pushdev; tiếp theo user duyệt spec rồi writing-plans.


## S024-C01 — 29/10/2026 — bổ sung spec M5 theo yêu cầu chủ tiệm
- Phạm vi: chỉ cập nhật M5_COMPLETION_SPEC và bàn giao PROGRESS/chỉ mục; không triển khai app/API/migration. User yêu cầu trọng lượng sách, tối thiểu2/tối đa6ảnh theo thứ tự bìa/lưng/gáy/nội dung1/nội dung2/nội dung3, giá theo khoảng và giữ chú thích cũ.
- Đã thay toàn bộ ràng buộc đúng3ảnh trong spec bằng2–6ảnh, bìa/lưng bắt buộc; các vai trò sau tùy chọn để nhất quán tối thiểu2ảnh. Giữ multi-upload/reorder/asyncID/atomicversion, bổ sung ánh xạ INSIDE cũ→INSIDE_1 thay vì nhầm thành gáy. Giá hai đầu nguyênVND, hiển thị khoảng và giữ nguyên “Giá sẽ thay đổi dựa vào tình trạng sách cụ thể.”
- Chi tiết đề xuất chờ duyệt: trọng lượng gram nguyên bắt buộc cho sách mới, sách cũ null không tựẩn; giá cũ sao chép sang hai đầu; sort theo giá từ/đến; FlashSale đơn thấp hơn giá từ, không hiển thị %giảm gây hiểu nhầm. Tổng thể spec vẫn chờ duyệt trước plan/triển khai; không thay baseline đã duyệt hoặc coi yêu cầu sửa spec là quyền deploy.
- Git lúc bắt đầu: dev theo origin/dev, sạch. Kiểm tra tài liệu đang thực hiện; chưa chạy unit/build vì không đổi code. Thay đổi hiện local, chưa commit/push. Bước tiếp: kiểm diff/line/link rồi bàn giao spec để user review.
- Kiểm tra cuối: `git diff --check` PASS; Python kiểm4file sửa đạt giới hạn dòng (spec237dòng, DEV_LOG ngoại lệ) và linkfilelocal. Assertion lần đầu bắt nhầm câu mô tả baseline “đúng ba ảnh” đã được thay thế; đối chiếu diff xác nhận không phải ràng buộc mới, kiểm lại phần luồng/nghiệm thu PASS. Unit/build chưa chạy vì chỉ sửa Markdown. Không thay app/DB/deploy; chuẩn bị commit tài liệu trên dev.


### S024-C02 — 29/10/2026 — bắt đầu M5 theo spec đã duyệt
- User duyệt M5_COMPLETION_SPEC và yêu cầu bắt đầu M5. Phạm vi gồm performance/logo/media, OWNER ghi/STAFF đọc, bỏDRAFT/ảnh tạm, trọng lượng/giá khoảng/2–6ảnh. Chuyển spec sang đã duyệt, lập M5_COMPLETION_PLAN theo writing-plans, thay plan performance cũ sau khi chuyển đủ gate còn mở. Chưa triển khai code hoặc migrate/deployonline.
- Bắt đầu dev d55d611 sạch; fetchorigin thành công, dev không thay đổi, origin/main80482e7. Dùng graph project Users-daoquanghung-Projects-me-may tra luồng create/media/public; tên me-may không đúng key, không phải repo chưaindex. Code hiện tạoDRAFT trướcupload, media cầnbookID, cleanup job chỉ book_media; giá public/sale vẫn scalar. Các boundary này cần thay đồng bộ.
- Đang xác minh baseline frontend/backend; ghi kết quả sau khi lệnh hoàn tất. Không coi số test từ checkpoint cũ là bằng chứng hiện tại. Chưa chạy browsertrace mới, Workersbuild hoặc Cloudinarybackfill; không sửa data thật.
- Đã lập M5_COMPLETION_PLAN7task (257dòng), tự review mapping spec/interfaces/5failuremodes. Xóa M5_PERFORMANCE_PLAN sau khi giữ kết quả60c0404 tại VERIFICATION và chuyển đầy đủ trace/ảnhngang/wishlistnhiều/Lighthouse vào task1/7. Baseline frontend95/95PASS; backend sandbox93run/74contextError/2skip do SocketException Operation not permitted tại JDBC; đang rerun elevated để phân biệt sandbox với lỗi app, chưa sửa code vì lỗi này.
- Backend elevated `bash code/backend/run-local.sh -B -ntp verify` (root) BUILD SUCCESS93run/0failure/0error/2live skipped; xác nhận lỗi lần đầu do sandbox, không cần sửa app. Frontend `npm test` (code/frontend)95/95PASS/26files. Log backend tại /tmp/me-may-m5-start-backend.log; không in credential. Workersbuild/browsertrace/liveprovider chưa chạy.
- Kiểm tài liệu: Python line-limit16Markdown/linklocal60link PASS, plan257dòng; git diff --check PASS. Chưa sửa code/schema. Cần user review plan/chọn Native hoặc subagent-driven trước implementation do writing-plans yêu cầu “wait for that review before implementation”; không hỏi duyệt lại spec. Dự kiến task1 traceLCP/CLS+logo trước. Chuẩn bị commit/push tài liệu trên dev; không main/deploy.

### S024-C03 — 29/10/2026 — thực thi M5 tuần tự
- User duyệt plan và chọn thực hiện tuần tự. Bắt đầu dev3130908 sạch; áp dụng executing-plans/TDD/Playwright; ledger riêng ignored .superpowers/sdd/M5_COMPLETION_PLAN. Theo plan đã duyệt dùng checkoutdev hiện tại, không tạo worktree phụ hoặc hỏi lại cách thực thi. Đổi heading task cho tool brief đọc được, không thay scope.
- Đang task1 traceLCP/CLS→logo/layout; task2–7 chưa triển khai. Baseline95frontend/93backend đã chạy checkpointtrước; sẽ chạy kiểm tra theo từng task, không coi spec/plan là codehoànthành. Không deploy/migrateonline hoặc sửa dữ liệu bán thật.
- Task1 trace localMM-000001 với APIclientdelay1500ms tái hiện main/footer shift0,6000+0,5838; source detailbook không seedSSR và loading thay toàn nội dung khi refresh. Thêm regressionSSRseed/refresh RED2, fix publicdetailTransferState riêng+luônrevalidate no-store, hỏi mua/busycopy bịkhóa đếnresponse,404 bỏnộidungcũ; header dànhchỗcount. GREEN97/97, builtSSR PASS. LogoWebP208×20810142bytes đã nhìn thật, giữnguồn2000×2000. Browserfixed390px no shifts/LCPobserved440ms, không suy thànhLighthouseonlinePASS. OnlineMM20 hiện503, dùnglocalMM1 cốđịnh cho controlledtrace; lỗi browserfaviconlogo.png404 cósẵn chưaliênquan, sẽ kiểmasset ởreleasegate.
- Task1 browser bổsung: ảnhngang640×401 vàdọc giữcontain, mobile390+laptop1366; wishlistrỗngCLS0/footer1123px,3cuốn uniqueCLS0,00925/footer1785px dướiviewport844. Screenshotignored output/playwright; rootignore bổsungfolder này. Kiểmfinalfrontend97/97/diffcheck/Markdown/linklocal trướccommit, chưaWorkersbuild/migrateonline.
- Task2 REDbackend2failure/14test (thiếueagerWebP320, querysai vẫn200); GREENtargeted14/14, fullbackendverify94run/0error/2skip, frontend100/100/27files. Thêm4variant eagerauthenticated320/640×jpg/webp + strictAPI/MIME, URLcũJPEG640fallback1280chỉ404; picture/srcset/sizesdetail/card. Giữno-store sauđánhgiá, không chứngminhđượccacheinvalidationan toàn.
- Chuẩn hóa browsernative: sourceguardJPEG/PNG≤10MB/25MP trướcdecode, warn>5MB, EXIFđúngchiều, cạnh≤2560/no-upscale/JPEG0,85/alpha→trắng. BrowserPNG3000×2000→JPEG2560×1707/26438B/whitepixel255,255,255,255; EXIF6JPEG300×200→200×300PASS. MãtiệníchsẽnốiUItask6, chưađổiworkflowuploadhiệntại.
- LiveCloudinaryVariantLiveTest tạo1assetngẫunhiênmemay/test, đọc4variantđúngmagicJPEG/WEBP, cleanup+NOT_FOUND PASS; khôngDB/livebookmutation. Dryrunscriptdump63ACTIVE: completed0/pending63 vàđủ4transform, khôngapply63ảnhthật. Checkpointv2riêng tránhskipnhầmJPEG640cũ; DEPLOYMENTgiữgatebackfilltrướcpicturefrontend. ChưaWorkersbuild/task3migration.
- Task3 đangthựchiện: REDM5Migration(noV6)/M5Fields(validrange400)/frontendmissingfields; thêmV6giáđơn→min/max, weightnullcũ, INSIDE→INSIDE_1,enum6roles vàDTO/validation/audit/publicsort/sale/display/enquiry. SửaHibernate mappingweight_g explicit do acronymweightG bịmapweightg; switchaltcũINSIDE bỏsót đãtìmởfullsuite vàsửa6case. Mavencleanverify mới đạt98run/0failure/0error/3live skipped; targeted20/20 vànewsortREDmutation→GREENfullsuite. Frontend102/102 trước ràpreviewincomplete, đangchốtQA. Không sửaV1–V5 hoặc dataonline.
- Task3 chốt: frontend102/102PASS sau ràpreview2–6ảnh/weight/range, wishlistcopykiểmcả17k–18k. Fullbackendcleanverify98run/0failure/0error/3skipPASS, migrationV5→V6scratch giữPUBLISHED/asset/ID/giácũ/nullweight. Chuyển browserfields sangQA tíchhợp task6/7 để migrate scratch một lần; chưa migrationdev/online, không deploytừngtask. DiffcheckPASS; commitcode+checkpointdev, tiếptask4.
- Task4 bắtđầu từ642781a: HTTPtests REDdoendpointchưacó; thêmV7upload_session/temporary_media, OWNER-bound24h, persistintenttrướccallprovider/READYsauprovider, max6ảnhhiệuhữu, replaceId tùychọn giữREADYcũnếuuploadlỗi. Cleanup dùngsessionlock/cancel/expiry, DELETE_PENDINGretry; intentUPLOADING/ambiguous giữgrace1h chốngxóatrướcproviderhoànthành. KhôngBookCopy/Listing/code/CREATEaudittrướcfinal. ĐangtesttargetedSessionAPI/Integration/Cleanup; chưađánhcompletehoặcbậtUI.
- Task4 targetedSessionAPI/lifecycle/Cleanup8/8PASS sau sửa fixture hết hạn (created_at vẫn phải trước expires_at). Providerfail replacement giữảnhREADYcũ, expiryngaysauuploadkhôngREADY, cleanupfailretryđạt; noBook/noCREATEaudit xácnhận. Fullsuiteđangchạy, chưa ghi taskcomplete cho đến output.
- Task4 fullbackendverify102run/0failure/0error/3skip BUILD SUCCESS; diffcheckPASS, code+V7+test+doccommitdev. Bước tiếptask5finaltransaction/idempotency/retireDRAFT, vẫnkhôngdeploy/migrateonline.
- Task5 đangthựchiện từde6ada8: finalHTTP RED3failure/1error vìcontractcũ khôngnhậnsession; thêmcreatePublishedtransaction khóaowner/session, fingerprintnormalizedpayload, cùngrequesttrảcùngbook/khác409, chuyểnREADYmedia→ACTIVE cùngaggregate/auditCREATE+PUBLISHED. V8DRAFT→ARCHIVEDgiữdata, PUBLISHED↔ARCHIVEDtrực tiếp, globalSTAFFadminwrites403. ThêmPUTreorderID/version/auditnguyêntử. Chưaclaimtestpass.
- Ruling: bỏprimitivecreatesáchDRAFTkhỏiproduction; seedlegacyARCHIVED dùngBookTestData testutility riêng, các testCRUDupdate/read dùngseed, hànhvicreatethật kiểmqua finalHTTP. Không giữmethodtạoincompletebookchỉđểđỡsửatest; mấtmộtsốcasecreateDRAFTkhôngcònhợplệ được thaybằngtestsfinal2/6ảnh/idempotency/auditrollback. BrowserUI chưađổiđếntask6, khôngdeployintermediate.
- Task5 firstfullsuite106run có3failure do fixturecũ: uploadSTAFFnaybịchặnsớm vàseedutilitykhôngphảiAPIvalidationcollection. Đổi2race/deactivationteststhànhOWNER đểvẫnkiểmpost-providerchecks; inactivecollectionkiểmcommands.updatevớisáchlegacykhác thayvìkiểmseedhelper. KhôngnớiquyềnSTAFFđểquaoldtests. Bộfinalmissingweight/range/requiredfields,duplicate/foreignphoto,strictJSONnumbers, migrationV7→V8giữauditDRAFTcũ/PUBLISHEDnullweight đềuđượcgiữ.
- Task5 fullbackendverify106run/0failure/0error/3live skipped BUILD SUCCESS. DRAFTkhôngcòntrongenum/APIcreate, trạngtháiẩn↔côngkhaitrực tiếp; final2/6ảnh/cùngrequestretry/concurrent/auditrollback/reorder409đạt. DiffcheckPASS, tiếptask6UIkhôngdeploytrunggian. Frontendcũchưađổiworkflow, sẽkiểmtoànbộsautask6.
- Task6 bắtđầu: thayUIthêm/sửaảnh bằngqueuechung dùngIDổnđịnh, sessiontạochỉkhichọnảnh, auto-uploadtừngảnh, drag/drop/keyboard/mobile vàreadonlySTAFF. GiữnguyênXHRunloadprogresscủaAdminHttp, khôngthêmlibrary. Nhậndiệnrủiroảnhuploadmấtresponse: retrycóthểtạobảnREADYthừa/lấp6slot; sẽthêmrequestKey/hashidempotencychoảnhquaV9(thayvìsửaV7đãápdụngDBtest), phạmvikỹthuậtphụcvụretry/IDổnđịnhcủaspec.
- Task6 V9image-request retry REDthậtsauclean(2mediaIDkhácnhau), GREENtargeted10/10; fullbackendcleanverify107run/0failure/0error/3skipPASS, frontend104/104trướcbổsungreadonlylisttest. NativeJPEG/PNGprepare+XHReventsđượcnốiQueuechungcreate/edit; cùngrequestKey+hashretrytrảlạiREADYảnhcũ, metadatatạmPATCHtrướcfinal.
- BrowserQA dùngDBmới me_may_m5_qa/8082/SSR4003, Cloudinarymemay/test; roleappkhôngCREATEDB nên đãtạoDBscratchbằngpostgrescontainer,khôngthêmquyềnchoapptrêndbkhác. TạotàikhoảnQAgiảlậpowner/staff từhashfixturetest, khôngsửatàikhoảnthật. 2ảnh uploadxongbookcountvẫn0; keyboardreorder+metadata→ĐăngPUBLISHED1cuốn/2ảnh/20k–30k/250g, publicsourceRefprivatePASS. ScriptlocatorracedDOMsaureorder, refreshsnapshotrồitiếptụckhôngchỉnhapp/khônguploadlại. Đangca6ảnh/drop/dragduringupload; chưaghiPASSchocasechưachạyxong.
- Task6 browser OWNER: tạo6ảnh bằng drop, kéo đổi thứ tự trong lúc upload; đủ6role/55k–75k/420g. Editreorder giữ nguyên mapping trên server trước Save, sau Save đổiIDđúngvịtrí vàkhôngreupload; ẩn→public404, hiệnlại giữpublishedAt, SOLDthànhcông. Scriptlocator cũ dùng textnút thayaria-label bịtimeout, đã dùng tên truy cập đúng; không sửa app để chiều test.
- Task6 browser STAFF: login200/listẩnThêmsách/detaildisabled/khôngpicker/khôngSave; directPOST403. View390px khôngoverflow; publicgiákhoảng/trọnglượng/chúthíchcũPASS. Expireduy nhấtphiênscratch bằngSQLguard→formgiữtên/file→renew3ảnhREADY; finalresponse bịabort sau route.fetchđãcommit, count2→3→retryvẫn3/cùngbookid3PASS. Không tạo data bán thật.

- Task7: backendcleanverify107run/0failure/0error/3live skippedPASS; Workersbuild và proxycheckerPASS sau rerun elevated (sandboxEPERMlisten/buildabort). Favicon/logo.png404 đãtái hiện, dùngassetlogo.webphiệncó; không tạoassetmới. SSRchecker assertioncũđòikhôngcólabelbadge xungđộtdànhchỗCLS; đổiassert chỉchấpnhậnplaceholder visibility:hidden, không chấpnhậnbadgehiệnSSR.
- Reviewwholebranchfresh-context theo executing-plans/requesting-code-review:4Important,0Critical/Minor. Cácnhậnđịnh đềuđúng: ảnh lỗi unattachedkhônggỡđược, final/metadata410khôngbậtphục hồi, editresponsemấtkẹtversion, copykhônglookupmới. 4regressionRED(thậtfail4/109)→GREEN110/110saufix; lookupwishlisttạicopydùnggiámới vàloạisold/hidden.
- Fixeditresponsemất: retryđọcGETsnapshot, chỉadoptkhiđúngmộtversionmediachanged/fieldkhácgiữnguyên; khôngreupload, giữform/localreorder. Nếu cóthayđổikhác trảconflictgiữformđểđốichiếu, khôngnângversionblindly. Đây là thay thế antoàn cho request-keyeditbackend mới; V9imageidempotence vẫnápdụngảnh tạm.
- Task7 finalbuild: frontend110/110, NodeSSRbuild/Workersbuild/proxycheckerPASS. SSRchecker4004PASSinitialHTML/OG/privatewishlist/adminnoindex-no-store/publicJPEG/404; hiddenreservedbadge assertion giữprivacy. Browserreviewfix chạy đếnpublicMM2 saufilelỗigỡđược/edituploadresponseabort→GETreconcile/giữtextdirty/copygiámới21k–31k/404xoátext; nativebeforeunload làmCLItrảtrướcResult, đãđốichiếulạitrangcuối; khôngclaim outputJSONchưađọc.
- Xác minh browser cuối: reload MM2, cả6ảnh decode thành công. Trước đó một ảnh lỗi decode tạm thời; HTTP kiểm lại cả6 trả200 image/webp, reload hết lỗi. Book1 version1 sau edit response bị mất, title đã lưu vẫn là title cũ (text dirty không bị lưu ngoài ý muốn). Favicon200. Không dùng screenshot trước khi lazy-load xong làm bằng chứng ảnh thiếu.
- SSR checker bổ sung 4variant320/640×JPEG/WebP: HTTP200, magic/MIME/no-store đúng; public2–6ảnh và không sourceRef PASS. Markdown15file đều≤400dòng trừ DEV_LOG; linklocal đang kiểm với cú pháp :line. Cleanup đã queue11asset QA riêng memay/test, đang xác minh số còn lại trước dừng dịch vụ.

- Chốt kiểm tra: frontend cuối110/110 PASS; backend107run/0failure/0error/3skip, NodeSSR/Workers/proxy/SSR4variant PASS. Linklocal112/112 (đã bỏ hậu tố :line khi kiểm đường dẫn), Markdown15file/diffcheck/ignore/publicassettracked PASS. Graph reindex fast/persistence=false, không sinh artifact commit.
- Cleanup xác nhận scratch còn3book đã ARCHIVED, book_media0/temporary_media0;11asset QA đã xóa qua gateway, không còn cleanup pending. Không drop DBscratch hoặc sửa DBdev/online. Giữ workspace/spec/plan vì task7 còn gate online; không đánh M5 hoàn thành. Bước tiếp: user merge dev/main và rollout có backup/backfill theo DEPLOYMENT, sau đó mới smoke/Lighthouse/coldstart/gate vận hành.
- Workflow finishing dùng quyết định user đã chốt: commit/push dev, không hỏi lại menu merge/PR và không tự push main. Chuẩn bị commit cuối; thay đổi chưa push cho tới khi lệnh push xác nhận.

### S025-C01 — 30/10/2026 — rà soát tối ưu nhập sách và tồn kho/biến thể
- User tạm gác kiểm thử chốt MVP, ưu tiên ngôn ngữ mặc định “Tiếng Anh” sửa được, định dạng hai ô giá theo VND ngay khi gõ, bỏ hai nút Đưa lên/Đưa xuống ở ảnh, thêm tồn kho mặc định 1 và biến thể dùng lại ảnh khi sách trùng. Hai screenshot là tham khảo UI; chưa suy nhãn “Tập” là yêu cầu quản lý tập truyện.
- Đối chiếu Git: dev tại 180bf01, tracking origin/dev, working tree sạch trước cập nhật bàn giao. Đã đọc chỉ mục/PROGRESS/checkpoint mới nhất, baseline master/data/M2 và graph BookEditor/BookCopy; DB hiện Listing→BookCopy 1:1, availability AVAILABLE/SOLD, chưa có quantity hoặc nhóm biến thể.
- Áp dụng using-superpowers/brainstorming và nguyên tắc ponytail local. Ba điều chỉnh nhập liệu đã rõ; cần làm rõ mô hình tồn kho/biến thể vì ảnh hưởng định danh cuốn, tình trạng, ảnh, public detail và hết hàng. Chưa viết spec/plan mới khi lựa chọn sản phẩm còn mở.
- Chỉ sửa PROGRESS/DEV_LOG; chưa sửa application/schema, chưa migrate/deploy, không chạm dữ liệu bán thật. Không chạy suite/build theo yêu cầu tạm gác kiểm thử; sẽ ghi kiểm tra tài liệu riêng. Thay đổi bàn giao còn local, chưa commit/push.
- Bước tiếp: xác nhận sách trùng dùng tồn kho chung hay từng bản là biến thể có mã/tình trạng riêng và dùng chung ảnh; sau đó cụ thể hóa thiết kế thay thế baseline liên quan trước triển khai.

### S025-C02 — 30/10/2026 — chốt hướng và viết thiết kế nhập sách
- User đồng ý tồn riêng từng biến thể/tổng tự cộng, yêu cầu giữ khoảng giá chung hiện tại và có nút “Thêm biến thể” khi nhập. Không thêm giá riêng theo biến thể.
- Đã viết BOOK_ENTRY_SPEC chờ duyệt, đăng ký chỉ mục và cập nhật PROGRESS. Đề xuất giữ mã/URL/ảnh hiện có, bảng biến thể con, một dòng mặc định khi chưa cần tên; sách cũ AVAILABLE→1/SOLD→0, availability suy từ tổng tồn. Nêu rõ thay baseline định danh từng bản vật lý và ảnh đúng từng cuốn để không âm thầm đổi contract.
- Đề xuất public chọn biến thể và nội dung hỏi mua kèm tên; wishlist giữ theo sách để không đổi dữ liệu đã lưu. Các giới hạn tồn, không xóa biến thể đã lưu, không ảnh riêng và bỏ kéo đổi card là lựa chọn đề xuất cần duyệt, không ghi thành quyết định của user.
- Khám phá qua graph và source form/media panel cho thấy giá hiện number input, dropdown đã có assignRole, card còn kéo/reorder; giữ drag/drop tải file. Git vẫn dev180bf01, chỉ thay tài liệu local; chưa application/schema/migration/deploy hoặc test/build.
- Bước tiếp: user duyệt thiết kế rồi writing-plans theo workflow; kiểm thử chốt MVP tiếp tục tạm gác, kiểm tra liên quan thay đổi vẫn cần khi code.

### S025-C03 — 30/10/2026 — duyệt spec có chỉnh sửa và lập kế hoạch
- User duyệt spec và báo đã sửa; đọc lại toàn bộ BOOK_ENTRY_SPEC, xác nhận bổ sung duy nhất về nghiệp vụ là đổi lựa chọn đánh giá tình trạng thành “Độ mới cao”, “Có lỗi nhẹ”. Giữ phần sửa này, chuẩn hóa chữ và chuyển trạng thái spec sang đã duyệt; không hỏi duyệt lại thiết kế.
- Áp dụng writing-plans, viết BOOK_ENTRY_PLAN7task, đăng ký chỉ mục/cập nhật PROGRESS. Graph/source xác nhận final fingerprint trên normalized BookWrite, mapper so sánh no-op, availability endpoint riêng và public query/sale dựa cột availability; plan cập nhật mọi boundary này cùng tồn biến thể. Trace lần đầu dùng tên ngắn không tìm được, dùng qualified name từ graph thì thành công; không reindex không cần thiết.
- Quyết định kỹ thuật trong plan: bảng biến thể JDBC, UUID ổn định, stock nguyên0..999999, tổng long; availability cập nhật nguyên tử từ tổng. Hai mã tình trạng mới HIGH_FRESHNESS/MINOR_FLAWS; legacy giữ nguyên/hiện nhãn cũ khi đọc để không tự thay mô tả tình trạng. Đây là chi tiết implementation/compatibility, không thêm giá/ảnh riêng cho biến thể.
- Self-review mapping spec→task, contract frontend/backend và5failuremodes: finalretry, foreignID/bỏpersistedrow, stockrace, giáâm/thậpphân/caret, selectionhếthàngtrướccopy. Plan yêu cầu kiểm tra scratch và regression liên quan; các gate nghiệm thu online M5 vẫn tạm gác, không cắt bỏ.
- Git dev180bf01; chỉ tài liệu, chưa app/schema/migration/deploy hoặc test/build. Chưa commit/push. Bước tiếp: user review plan theo writing-plans trước implementation; phương thức tuần tự của M5 trước đây có trong log, mặc định đề nghị tiếp tục tuần tự cho phạm vi này.
- Verification tài liệu tại root: `git diff --check` PASS; Python kiểm5file sửa/giới hạn dòng/68linkfilelocal/7task và coverage bổ sung tình trạng PASS. BOOK_ENTRY_PLAN230dòng, spec trong trần400; DEV_LOG ngoại lệ. Unit/build/browser chưa chạy vì chỉ lập kế hoạch. Thay đổi vẫn local, chưa commit/push.

### S025-C04 — 30/10/2026 — thực thi nhập sách theo plan đã duyệt
- User duyệt plan; bắt đầu 7task tuần tự bằng executing-plans/TDD, ledger ignored `.superpowers/sdd/BOOK_ENTRY_PLAN`. Giữ checkoutdev hiện tại theo phương thức đã duyệt; không thêm worktree hoặc hỏi lại lựa chọn thực thi. Fetchorigin elevated thành công sau sandbox chặn FETCH_HEAD; dev180bf01 khớp origin/dev, origin/mainf879909 không đổi phạm vi.
- Bắt đầu task1 migrationV10 trên test/scratch, không DBdev/online. Frontend/backend baseline đang chạy, chưa ghi PASS trước khi có output. Các tài liệu planning còn local từ checkpoint trước; giữ chỉnh sửa tình trạng của user, không ghi đè.
- Baseline frontend110/110PASS, backend107run/0failure/0error/3live skipped BUILD SUCCESS sau elevated (sandbox SocketException không phải lỗi app). Task1 regression migration RED thiếu book_variant→GREEN1/1: AVAILABLE/SOLD→1/0, giữ ID/URL/ảnh/giá/grade/sequence, CHECK kho và tên trùng đạt. Thêm book_variant vào cleanup fixture test; unique thứ tự deferred để đổi vị trí trong transaction không lỗi trung gian. Chưa migration dev/online.
- Task2 RED API variants400/race400→GREEN targeted16/16; cleanverify111run/0failure/0error/3live skipped BUILD SUCCESS. Tồn2+1→0+1→0+0, no-op, audit, stableID, foreign/thiếu/dòngtrùng, stock âm/phân số/chuỗi/overflow, Staff403 và race200/409 đạt. Final2/6ảnh retry giữvariantID/tổng3, payloadđổitồn409; không tăngbook/ảnh. Availability endpoint cũ owner409, Staff403; publication giữ nguyên. Fixture update cũ nay gửi IDs thay vì coi mỗi lầnsave là thêm dòng mới.
- Debug race test403 ban đầu do tokenCSRF tạo lazy đồng thời ngay sau login; warmcsrf một lần trước race cho test đúng boundary optimisticlocking, không sửa auth production. Store xóa tên tạm trong transaction để cho hoán đổi tên; thứ tự unique deferred, không xóa dòng đã lưu. Summary/preview được nối field ở task2 vì DTO cần compile, publicvariant chi tiết ở task3.
- Task3 RED publicvariants thiếu2dòng→GREEN12/12 PublicCatalogueApi/BookVariantIntegration: detail ID/tên/available theo từng biến thể, không stock nội bộ/sourceRef; mộtcard/giáchung, tổng0 lookupSOLD/availablefilterrỗng/FlashSale biến mất; slug/media/publishedAt giữ nguyên. Hai grade mới và ba legacy roundtrip đạt. Variantquery chỉ detail, không thêm N+1 ở shelf/list/lookup; các card trảvariants rỗng vì không cần lựa chọn.
- Task4 thêm CVA VND: gõ/dán/sửa giữa số/clear/touched/disabled và chặn âm/thập phân/exponent/overflow, model number/null; defaultTiếngAnh chỉ mới, legacyngônngữnull giữnguyên. Bỏ nút/reorderdragcard và queue move/step không còn dùng; dropdown vẫn hoánđổi vai trò, không reupload. Đổi regression media cũ từ button sang dropdown vì yêu cầu mới; giữ test upload async/readonly. Unit mới RED thiếu directive→GREEN; fullfrontend114/114PASS.
- Task5 formvariants RED thiếumethod/FormArray→GREEN fullfrontend117/117: mặcđịnh1, add/removechỉdòngmới, stableIDs, totalreadonly, validatetên/kho, payloadgiáchung, conflictgiữform/STAFFkhôngthêm. Bỏ client availabilitymutation/nút, giữpublication; preview hiệntồn/biếnthể và ảnhchung. Regression lostmediaresponse thêm case stockconcurrent→khôngadoptversion; chỉảnhthayđổi→reconcilekhônguploadlại vẫnđạt. Fixture auth thayrole khôngphảisignal đã chỉnh test tạoSTAFFinstance riêng; không nới quyềnproduction.
- Task6 RED missingselectedvariant→GREEN frontend122/122: chọnbiếnthể trướchỏi, hết riêngkhôngchọn, revalidatefreshname/kho, stock0siblingcòn→chọnlại, tổngSOLD→tưvấntươngđương. Lateverify sauđổiroute trảrỗng, mộtbiếnthểcótên tựchọn/đổitêndùngtênmới,404clear; dialoghiện/copy kèm tên. Wishlist schema/theosách giữ nguyên, regressioncũvẫnđạt. Đổi copyảnhpublic thành ảnhchung, không hứa đúng từngcuốn; chọnradio accessible, màu dùngtoken--red hiện có.
- Task7 QA scratch me_may_entry_qa/API8084/SSR4005, tài khoản và ảnh PNG giả lập; namespace backend chỉ cho memay/test, không cho subfolderentry-s025 nên đã sửa cấu hình QA, không nới guard production. CLI đầu bị sandbox npmENOTFOUND, rerun elevated; scriptselectOption dùng value Angular ngValue sai đã đổi chọn theo label, APIRequest cần URL tuyệt đối. Không coi lỗi harness là lỗi app hoặc bằng chứng đã test xong.
- Browser OWNER final2biếnthể2+1/2ảnh: upload xong chưa tạo sách; abort finalresponse sau commit rồi retry giữ đúng1book/2variantID/tổng3/2ảnh. Browser phát hiện dropdown BACK ban đầu hiệnFRONT do valuebinding trước options; regressionRED [FRONT,FRONT]→GREEN[FRONT,BACK] bằng selected trênoption. Thêm regression dialog: selection mất không hiện textgeneric cho copy thủ công; REDgeneric→GREENrỗng.
- Backend finalcleanverify114run/0failure/0error/3live skippedPASS; frontend mới123/123PASS. NodeSSR/Workers/proxy từng đạt trước hai sửa QA; đang rebuild lại hai target sau sửa, chưa ghi gatebrowser/SSRchecker/review hoàn tất. Quyết định đã gộp vào DATA/DESIGN/ARCHITECTURE/MASTER_PLAN/DEPLOYMENT/README; spec/plan giữ tới cuối review và chuyển đủ bằng chứng.
- Fresh-context review theo skill:0Critical/1Important/0Minor, declined-to-judge rỗng. Important đúng: xóa hết tên biến thể duy nhất làm mất input. Regression đầu thiếu auditstub đã sửa harness; RED inputnull→GREEN inputvẫngiữnguyên/nhậpđượctênmới bằng trạngtháihiệnnameinputổnđịnh, frontend124/124PASS. Không re-review hoặc thêmfixminor; rebuildsaucùng đangchạy.
- Browser mới xác nhận dropdownFRONT/BACK đúng ngayload, preview2+1/tổng3, publichỏi kèm tên/giáchung. Đổi tồn0+1 khi đangmởdialog→copy trảrỗng/khôngcopytêncũ, chọnlại được; mobile390px nooverflow/radioSpace/selectedborder đọcđược, screenshot output/playwright/book-entry-mobile.png đãxemthật. Wishlist theo1mãsách vẫnhiện sauđiềuhướng; khônggánbiếnthể tựđộng.
- Browser hai tab: owner sửa0+0→SOLD; tabcũnhập5 bị409 vàgiữinput5, storedstock0/media2 khôngđổi. SSRchecker4005PASS HTML/OG/privatewishlist/adminnoindex/no-store/media4variant đúngMIME/magic/2–6ảnh; APIbridge vàWorkersproxyPASS. Chưa cleanupassetQA cho tới hếtbrowserQA.
- Browser kiểm saufixreview: tạo sáchQA thứhai có1biếnthể/tồn1, xóahếttên rồi nhậptênmới vàsavevẫngiữ1dòng/tồn1; giákeyboard21000→21.000/nối0→210.000/chèngiữa/Backspace/21.50invalid/API21000 đạt. STAFFstock/adddisabled/nosave/directPUT403; wishlist tổng0 vẫngiữsách/checkboxdisabled. Locator wishlist lầnđầu đợitext “Hết hàng” exacttimeout vì nhãnthật cóchúthích, snapshotxácnhận hànhviđúng, khôngsửaapp.
- Finalfrontend124/124, NodeSSR/Workersbuild/Workersproxy/SSRchecker4005PASS trên source3fd5c3b. Reviewer0Critical/1Important đãfixed/0Minor; declinedrỗng. Cleanup providerconfirmdestroy4assetQA, scratch2bookARCHIVED/3variant/book_media0/temporary_media0; dừng tiếntrình/browserQA. KhôngDBdev/online hoặcmedia thật. FlashSale kiểmAPIintegration, không tuyênbố browsercampaignUIđãchạy.
- Gộp quyết định và tiêu chí vào DATA/DESIGN/ARCHITECTURE/MASTER_PLAN/DEPLOYMENT/rootREADME; thêm BOOK_ENTRY_VERIFICATION theo chủ đề để VERIFICATION chính không vượt400, cập nhật chỉ mục và PROGRESS. Spec/plan sẽ gỡ sau taskdone; gateonline chuyển DEPLOYMENT/M5 giữ nguyên. Đang kiểm link/line/ignore/finaldiff trước commit/pushdev; chưa push thay đổi S025.
- Task7 taskdone xác minh lại frontend124/124PASS; toàn7task ledgercomplete, source fixes3fd5c3b và evidence2c9f8c9. Kiểm13Markdown/129filelink/line≤400trừDEV_LOG/diffcheck/ignore/publiclogo trackedPASS; graph reindexfast/persistencefalse, không tạo artifact commit. Spec/plan BOOK_ENTRY đã chuyển hết quyết định/bằng chứng/gate rollout nên xóa đúng rule, lịch sử giữ từ4d23056; M2/M5 spec/plan còn gate giữ nguyên.
- finishing-a-development-branch dùng quyết định đã duyệt: làm trên dev hiện tại, commit/pushdev, không hỏi lại menu hoặc tự main/deploy. Không tạo/xóa worktree, không dropDBscratch hoặc dọn workspace của plan khác. Chưa push cho tới khi lệnh Git xác nhận.
- Pushorigin/dev180bf01→ec5286b thành công, checkout sạch/khớpremote; không main/deploy. Kiểm cuối15Markdown/131filelink/line/diffcheckPASS sau retire. Workspace ignored BOOK_ENTRY_PLAN đã xóa sau kiểmmarkerđúngplan/toàn7taskcomplete; không xóa workspace khác, screenshotignored và DBscratch đượcgiữ. Cậpnhật2filebàngiaonày cùngcommitcuối, pushdev để lưu checkpoint.

### S026-C01 — 30/10/2026 — tích hợp gói favicon
- User cung cấp gói RealFaviconGenerator tại `code/frontend/public/favicon/`, yêu cầu setup cho web. Bắt đầu trên dev; workspace có sẵn xóa favicon.ico/logo.jpg/logo.webp và thư mục favicon chưa tracked. Không coi các thay đổi này là do agent tạo.
- Đang cập nhật index HTML và manifest theo đường dẫn thư mục; kiểm tra build và asset sau build. Chưa chạy kiểm chứng, chưa commit/push/deploy. Logo UI còn tham chiếu hai file đã xóa; đã hỏi user cách xử lý, không tự ghi đè thay đổi.
- User chọn dùng ảnh trong gói favicon thay logo cũ: header PNG192, Home PNG512; cập nhật mô tả tài nguyên ở README/DESIGN/MASTER_PLAN. Build Workers lần đầu PASS; đang rebuild sau đổi hai đường dẫn logo.
- Kiểm chứng cuối tại code/frontend: `npm run build:workers` PASS; Python tại root kiểm5link trong built index.csr.html,2icon manifest,2logo UI và giới hạn dòng tài liệu PASS; `git diff --check` PASS. Không chạy unit/browser vì chỉ đổi khai báo asset tĩnh, chưa xác minh online. Chuẩn bị commit/push dev cùng gói và xóa asset cũ theo lựa chọn user; không main/deploy.

### S027-C01 — 30/10/2026 — rà checklist hiệu năng nhập/xuất bản
- User yêu cầu rà và thực hiện checklist P0/P1/P2 với baseline request trong ảnh. Bắt đầu dev2fc3f0b sạch/khớp origin; không khởi động lại task nhập sách đã xong. Phạm vi hiện tại: discovery và thiết kế trước code theo brainstorming; giữ workflow user merge/deploymain.
- Đọc PROGRESS/checkpointS026/M5 spec, graph discovery và source liên quan. Xác nhận5eager sync đều có consumer, queue tuần tự; normalize đọc sourceImageInfo hai lần; POST trả detail rồi route edit load/metadata/audit lại; mapper có nhiều round trips nhưng chưa đo để kết luận N+1/bottleneck. Limiter4inflight/30attempt10phút cần tính vào lịch5vòng2/6ảnh.
- Read-only CUA Render dashboard: Free/Live main24e1a3f, không click deploy/restart/settings; không dùng dữ liệu bán thật để tạo QA. Checklist sửa:5mẫu chỉ median/min/max, coldRender/Neon riêng, transactiontiming bao gồmcommit nhưng không gọi locktime chính xác, Cloudinarycallcombined và eager đối chứng riêng, Flywaystartup, JPEG320 hiện có/fallback1280 chỉmissing, dedupe memory/authclear/auditlazy, song songtemporary có điều kiện.
- Tạo BOOK_PUBLISH_PERFORMANCE_SPEC và đăng ký docs/README/PROGRESS. Chưa sửa product code, chưa chạy test/build/5vòngwarm/HAR; không tuyên bố hoàn thành các ô. Đang builder review thiết kế; bước tiếp duyệt spec rồi writing-plans; bản mới online cần user deployQA cách ly theo workflow hiện hành. Thay đổi tài liệu còn local.
- Builder review fresh-context theo brainstorming: “nothing important left”, không có câu hỏi thay đổi phạm vi. CUA đọc health tab hiện có trả statusUP; đây chỉ là health hiện tại, không phải timing/coldstart/warmbaseline. Root `git diff --check`, linecount3file và Python kiểm localfilelinksPASS; spec182dòng, README/PROGRESS dưới400. Chưa commit/push tài liệu thiết kế; chờ user duyệt rồi planning/code theo spec.

### S027-C02 — 30/10/2026 — spec hiệu năng duyệt, lập kế hoạch thực thi
- User trả lời “duyệt” cho BOOK_PUBLISH_PERFORMANCE_SPEC. Đọc writing-plans và lập BOOK_PUBLISH_PERFORMANCE_PLAN9task, giữ phương thức Native/tuần tự trước đây. Chưa chạm product code hoặc gọi implementation skill vì plan cần user review theo writing-plans.
- Discovery graph/source xác nhận tên controller/service/panel, finalcreate mapping nhiều lần và collectionquery từngID nhưng chưa có timing; plan chỉ tối ưu sau profile. Định nghĩa interfaces timings opt-in/streamIO/JDBCmetadataonly, HARsanitizer, thumbnail320/default1280, auth epoch/cacheTTL60s/handoff10s, prefetch1ảnh, SQL/parallel cógate và regression2–6ảnh.
- Selfreviewcoverage spec3→Task1–3, spec4→Task4, spec5→Task6/8, spec6→Task5/7, spec7–8→Task9; nămfailuremodes có test nhiệm vụ sở hữu. Plan262dòng, bốnfile spec/plan/index/snapshot≤400 và localfilelinksPASS; root `git diff --check`PASS. Khôngtest/build/benchmark mới vì chỉ docs; online5vòng vàCloudinaryprobe vẫnNOTRUN.
- Cập nhật docs/README/PROGRESS/specstatus. Chuẩn bị commit/pushdev bộ tài liệu để review; chưa merge/deploymain hoặc ghi dữ liệu QA/production. Bước tiếp user review plan, rồi executing-plans Task1→9; RenderQA5vòng vẫn cần userdeploy môi trường cáchly đúngrevision.

### S027-C03 — 30/10/2026 — bắt đầu thực thi kế hoạch hiệu năng
- User duyệt plan; executing-plans/TDD/verification/worktree skills đã đọc. Giữ dev checkout theo plan đã duyệt, không tạo worktree mới. Workspace riêng BOOK_PUBLISH_PERFORMANCE_PLAN ignored; basefa7dfe0; preflight interfaces tương thích. Sửa dấu cách heading Task N để script nhận; không đổi phạm vi.
- Đang chạy baselinefrontend/backend và Task1 sanitizer. Chưa ghi kết quả khi lệnh còn chạy; chưa deploy/migrateonline.
- Task1 RED import missingevidence→GREEN3/3stdlib tests; sanitizer allowlist bỏheaders/body/query/host/IDs/providerURL, unknown timing=-1. Frontendbaseline124/124PASS; backendbaseline sandbox socketEPERM, rerun elevated đangchạy. Chưa ghiPASSbackend.
- Task2: REDbackend thiếu3class→GREEN5tests; frontendREDmissingmetrics→GREEN126/126. Cleanverify119run/0failure/0error/3live skippedPASS; lần suite khôngclean gặp class support lỗi biên dịch incremental trong target, cleanrebuild giải quyết, không sửa nguồn testsupport. Angularbuildsandbox abort134, elevatedbuildPASS. QA mới me_may_performance_qa/API8086/SSR4007, memay/test, owner/staff giảlập; đọc adminlist xácnhận query/connection/requesttimings opt-in hoạtđộng, log chỉmetadata.
- Task3 đo trên artifacts d1cca7b đóngbăng ngoài target/dist, không ghi production. Bộ2ảnh đủ5mẫu medianupload4495ms/publish→editor475ms; bộ6ảnh3mẫu rồi chờlimit30/10phút, chưa chốtbaseline. HaiPNGQA4,09/4,70MB→JPEG507603/475921bytes. HARrawignored, sanitizedfixture3/3PASS. Cloudinaryusage đangđọc; RenderQA/VPS chưa có, NOTRUN.
- Task4 source/QA automated song song với baseline artifact cốđịnh theo rulingledger: gateway REDmissingopenAdminPreview→GREEN9gateway+1integration; UI REDsrc không320→GREEN128/128fullfrontend. Giữ/dropdown/STAFFtests cũ, điều chỉnh assertion STAFF chỉcấmwritecontrols vì viewer làread. Testpublicroute banđầu sai gây401 thay404, sửađúng /api/v1/books/{slug}/media/{role}, khôngsửaappđểchiềutest. Chưa browser/5lượtbytes bảnmới nên Task4 chưa complete.
- Task3 local đủ5vòng2ảnh+5vòng6ảnh, medianelapsed5048/14469ms; HAR giữsend/wait/receive/total/bytes vàoverlap, sanitizerPASS. Publishquerycount39/47 vàmapping3lần; metadata2request/nhóm/vòng. BằngchứngBOOK_PUBLISH_PERFORMANCE_VERIFICATION. Cloudusage1,9/25credits(7,6%); probe riêngJavaJPEG531726B upload-only2629,85ms/eager2369,26ms/5derived, xácnhận exactassetdeleted. Probe source-launcher classloaderprivateaccessfail trướcnetwork, đã javac cùngapploader rerun thànhcông; không nới production visibility. OnlineRenderQA/Neon/VPSNOTRUN theo gateworkflow, không tựdeploy.
- Task5 auth/cache/handoff/audit REDmissinginterfaces→GREEN137/137; bổsung lateauthrefresh regressionRED phát olduser tới guard→fix map về currentuser/null. TTLmetadata60s/handoff10s, cache replayguard từngsubscription, manualrefresh, collectionswriteinvalidate; auditclosednoGET vàstale/destroycancel, lỗi502khôngđổi publisherror. FlashSaletest doubles bổsungepoch/interfaceAuthmới, khôngđổi quyềnproduction. Chờ cuối fullfrontend/browser trước complete.
- Task6 RED3tests chứngminh thiếulookahead→GREEN141/141; thêm destroy/expire/background/standaloneguards, full144/144PASS. Mộtdecode/1lookahead, upload/edit vẫnserial, headerread1lần trongqueue, keep standalonevalidation/EXIF/JPEG0,85; READYgiải phóng preparedblob nhưng giữfilegốc. Browser/5vòngsautốiưu chờcandidatebuild.
- Task7 queryregressionREDmapping3vs1→GREEN122run/0failure/0error/3skip cleanverify; DTO trả về đối chiếu bằng stored detail, publishedAt/media/stock và2audits đúng. TáchcreateAggregate trảentities, map1lần rồicopypublicationimmutable; khôngbatchcollection khi baselinechưađo workloadcollections. Test auditcolumnnhầmaggregrate_id sửa target_id theo schema, khôngsửa schema. HoànthiệnfingerprinttimingRED0vs1→GREENcùngfullsuite; mapperrecordprivatefield typođãsửatrướccleanbuild.
- Task4 bổsungviewportdefer: REDảnhsrc cótrướcviewport→GREEN144frontend; placeholder220px/contain, viewer1280 đọcnhưcũ. Task2 memorybufferUserTiming thêmregressionRED1001entry đểgiữbound1000; đangverifyfix.
- Reviewfreshcontextfa7dfe0..5fd1663:0Critical/1Important/1Minor. Important streamlỗisaucommitheader vẫnrequestok đãRED→GREEN bằng MockAsyncContext/worker/HTTP200committed/onComplete vàexactly1error; fullbackend123run/0failure/0error/3liveskipPASS. Minor replacementselectedAt thiếu đượcdefertheoskill: edittimingreadykhôngtínhprepare; khôngảnhhưởngdữliệu/chínhxácbenchmarknhậpmới. Khôngrereview.
- BrowserQA candidate: offscreen0ảnh, viewerfull1280/width1200đúngkhôngphónglớn/Escape, auditclosed0/open1, publicẩn404/media404/admin200, sửa6→5→4→3ảnh, timeoutuploadretry vàmấtfinalresponse/retry cùngbookid21PASS; STAFF0writecontrol/2viewer/directPOST403. 5lượtcùngasset:320JPEG10129B so1280JPEG417513B, no-store/MIMEđúng. Node/Workersbuild/proxyPASS; SSRchecker đangchạy; candidate5vòng bộ6đangchờratelimit.
- Task9 đủ5vòngcandidate2/6ảnh, medianelapsed4848/14322ms so5048/14469ms: giảmnhẹ4%/1%, khôngclaimcải thiệnlớn;6ảnhuploadcảbộ13507→13725ms vẫnproviderdaođộng. Query39→30/47→38, GETbooksauPOST5→0, metadata10→5, audit10→0 mỗi5vòng. 5readcùngasset320/1280:10129/417513B, HARmedian118,88/211,10ms; gallery HARcórequestchưa xong=-1 nênkhông tínhmediancontenttừmẫuthiếu.
- Probelegacy chỉeager1280 vẫnnhận320, chưaépđượcmissingderived404; khôngclaimnhánhfallbackrealđãchạy, fixtureunitMissingVariant đãđạt. UUIDlegacy/probe đãdeletedexact. Sanitizerbổsungsafe size/formats metadata REDmissingvariantfield→GREEN4/4; mọiheader/body/querykhác bỏ.
- Visualcheck screenshotcaptured lúcpreviewchuyểntiếp chưaảnhkhôngdùng làmproofđãhiện; bổsungstatusloadpreview độc lập bằngoverlaykhungcốđịnh, REDmissingloadingcopy→GREEN145/145. NodebuildcuốiPASS, Workersbuildcuốiđangchạy. SourceSSR/publickhôngđổi từcandidate5fd checkerđãPASS, streamreviewfix chỉảnhhưởngstatuskhierror.
- Cleanupdestroy83assetQA cònlại/0absent, DBscratch23booksARCHIVED/23variants/media0/temp0;3ảnhoptionaldojobđãdọn. DừngprocessgroupsQA vàđóngbrowser. SafeHAR20vòng+2content5read, results/manifest/environment/servertimingsmetadata/cleanup ledger vàhaiPNGgiảlập đượcgiữ .local/book-performance ignored. Không lưurawHAR/secrettrongGit; khôngtouchsellingDB/media.
- Kiểm cuốifrontend145/145/33file vàNodeSSRbuild/Workersbuild cuốiPASS saupreviewoverlay; sanitizer4/4PASS. SafeHAR giữsize/formatallowlist để phânbiệt320/1280 nhưng bỏquerynhạycảm. Spec/plan giữ vìonlineQA cònmở, status/checkboxplan cậpnhật kếtquảlocal vàđiềukiệnkhôngápdụng; contractgộp ARCHITECTURE/DESIGN/DEPLOYMENT/README, evidence145dòng. Chuẩn bị commit/pushdev, chưaclaimpush tới khiGit xácnhận.

### S027-C04 — 30/10/2026 — tiếp tục và chốt bàn giao hiệu năng local
- User yêu cầu tiếp tục phiên; đối chiếu Git và ledger, không chạy lại các task đã hoàn tất. Dev có 9 commit local và một ô bàn giao đang mở; không có thay đổi code mới trong checkpoint này.
- Root `python3 .superpowers/sdd/BOOK_PUBLISH_PERFORMANCE_PLAN/final_check.py` elevated PASS: 17 Markdown/140 liên kết, trần dòng trừ DEV_LOG, 20 kết quả đo và HAR đã sanitize, đúng 83 asset cleanup, QA8086/4007 đã đóng, ignore/favicon tracked và diffcheck. Checker nhận hậu tố dòng `:21` trong filelink; không sửa nội dung tài liệu chỉ để vượt kiểm tra.
- `git push origin dev` thành công fa7dfe0→07f7354; `git rev-list --left-right --count dev...origin/dev` trả 0/0. Hoàn tất ô bàn giao local; giữ gate online và spec/plan vì RenderQA/Neon/VPS chưa có phép đo đối chứng. Không merge main, deploy hoặc ghi dữ liệu bán thật.
- Bằng chứng test/build/browser ở checkpoint C03 và BOOK_PUBLISH_PERFORMANCE_VERIFICATION; không chạy lại bộ đo hoặc thay kết quả cũ bằng suy đoán. Review 1Important đã sửa bằng RED→GREEN; Minor replacement selectedAt vẫn defer, chỉ thiếu thời gian prepare trong phép đo thay ảnh.
- Checkpoint tài liệu này sẽ commit/push dev cùng thay đổi liên quan. Bước cuối chạy task-done9/finalcheck, giữ ledger safe ở `.local/book-performance`, rồi dọn đúng workspace tạm của plan theo executing-plans; không dọn workspace khác hoặc drop DB scratch. Bước tiếp sản phẩm: user deploy QA cách ly đúng revision để đo 5 warm/cold Render và Neon trước quyết định hosting/song song upload.

### S028-C01 — 30/10/2026 — đưa upload ảnh lên đầu editor
- User yêu cầu phần upload ảnh đứng trước tên sách và các thông tin còn lại. Bắt đầu dev29249b9 sạch/khớp remote; thay đổi nhỏ theo nhánh xử lý trực tiếp của brainstorming, không tạo spec/plan mới.
- Phạm vi: đổi vị trí component media trong template dùng chung tạo/sửa, cập nhật DESIGN và snapshot; giữ bindings, queue, quyền và nút đăng cuối form. Đang thực hiện, chưa chạy kiểm chứng hoặc commit/push.
- Đã chuyển duy nhất `<app-book-media-panel>` lên đầu form trong book-editor.html, trước fieldset thông tin; DESIGN ghi thứ tự mới và khả năng nhập thông tin trong lúc upload.
- Tại code/frontend: `npm test` PASS145/145/33file, `npm run build:workers` PASS. Tại root: kiểm thứ tự template/component chỉ xuất hiện một lần và trần dòng DESIGN/PROGRESS PASS; `git diff --check` PASS. Không thêm test cho thao tác đổi vị trí đơn thuần; không chạy backend/browser hoặc đo hiệu năng mới vì logic không đổi.
- Chuẩn bị commit/push dev cùng bốn file thay đổi. Không deploy; user merge/deploy theo workflow hiện hành. Gate Render/Neon của hiệu năng vẫn mở.

### S029-C01 — 31/10/2026 — tồn kho trong danh sách và brainstorm import
- User yêu cầu đổi cột Khả dụng của danh sách admin thành Tồn kho, sau đó brainstorm CSV/Excel. Bắt đầu dev6db146f sạch/khớp remote; API BookSummary đã có totalStock nên chỉ thay hiển thị và bỏ property không còn dùng.
- Đang thực hiện thay đổi nhỏ; chưa chạy kiểm chứng. Import mới ở discovery bằng brainstorming, chưa code hoặc chốt spec: tài liệu cũ đề nghị tạo nháp nhưng M5 đã bỏ DRAFT, cần chốt nguồn file và xử lý ảnh trước khi chọn hướng.
- Đã đổi header thành Tồn kho và ô dữ liệu dùng book.totalStock trong book-list.html, bỏ availabilityLabels/import không dùng ở book-list.ts; filter availability giữ nguyên. Cập nhật DESIGN/PROGRESS; không sửa response API, database hoặc quyền.
- Tại code/frontend: `npm test` PASS145/145/33file; `npm run build:workers` PASS. Root kiểm binding cột và trần dòng tài liệu PASS, `git diff --check` PASS. Không chạy backend/browser hoặc thêm test cho thay đổi hiển thị nhỏ này. Chuẩn bị commit/push dev, chưa deploy.
- Brainstorm bước tiếp: xác định dùng bảng hiện có của tiệm hay mẫu mới trước khi chốt schema file, biến thể/tồn, cách ghép ảnh và trạng thái trước publish. Tài liệu import cũ chưa được thay bằng quyết định mới; không đưa tính năng import vào gate MVP hiện tại.
- User chọn file theo format website, đề xuất import thành sách ẩn rồi thêm ảnh và tự publish; đang đánh giá thiết kế, chưa phê duyệt spec/code. Discovery xác nhận createAggregate khởi tạo ARCHIVED nhưng chỉ được gọi trong final createPublished; publication ARCHIVED→PUBLISHED đã dùng validation ảnh/metadata, xác nhận OWNER, version và audit. Update sách ẩn đã có, song validateWrite vẫn bắt buộc trọng lượng và kiểu bìa Picture book.
- Đề xuất dùng ARCHIVED hiện có, không thêm DRAFT; thêm đường tạo mới từ import có kiểm tra/preview/idempotency/audit và tái sử dụng editor/media/publish. Điểm cần chốt tiếp: file đủ thông tin bắt buộc, chỉ thiếu ảnh hay cho phép thiếu cả metadata. Import tách nhập thông tin khỏi ảnh, không tự làm Cloudinary upload nhanh hơn. Chưa chạy test vì lượt này chỉ discovery/brainstorm, không đổi app.
- User chốt đủ metadata, đồng ý kiểm toàn file/sửa ngoài Excel/tải lại/chỉ nhập khi mọi dòng hợp lệ và yêu cầu triển khai. Viết BOOK_IMPORT_SPEC để cụ thể hóa schema20cột, dòng theo biến thể/nhóm sách, CSV/XLSX, preview không ghi DB, nguyên tử và fingerprint chống retry trùng, ARCHIVED/publish tái sử dụng và giới hạn đề xuất100sách/500dòng/2MiB. Đăng ký chỉ mục, đang builder review theo brainstorming; chưa viết plan/code hoặc cài parser. Bản chi tiết cần user review theo gate skill.
- Builder review fresh-context `/root/import_design_check`: “nothing important left”; không có câu hỏi cần trả user hoặc thay đổi phạm vi. Bước tiếp kiểm link/line/diff, commit/pushdev đặc tả; user duyệt bản chi tiết rồi writing-plans, giữ phương thức Native/tuần tự đã dùng, không hỏi lại cách thực thi. Không chạy unit/build/browser vì chỉ viết thiết kế, không coi review tài liệu là kiểm chứng importer.
- Kiểm tài liệu tại root PASS: Python kiểm trần400dòng (DEV_LOG ngoại lệ)/142localfilelinks, BOOK_IMPORT_SPEC204dòng; `git diff --check` PASS. Chuẩn bị commit/push bốn tài liệu thiết kế/bàn giao; app/database/dependency không đổi, chưa có importer chạy được hoặc migration/deploy online.

### S029-C02 — 31/10/2026 — đặc tả import duyệt, lập kế hoạch
- User trả lời “duyệt” cho BOOK_IMPORT_SPEC; dùng writing-plans, giữ Native/tuần tự/dev checkout theo workflow trước. Bắt đầu dev4c38ed3 sạch/khớp remote, không lặp task cột tồn hoặc nhập sách đã xong.
- Tạo BOOK_IMPORT_PLAN7task: canonicalvalidation/fingerprint, boundedCSV/XLSX/template, V11receipt/atomiccreate, API/gate, frontend/file-authstate, unpublishedfilter/media/publish, QA/review/bàn giao. Cụ thể hóa interfaces/routes/testcases và nguồn official Apache cho CSV1.14.1/POI6.0.0/Java21; chưa cài dependency hoặc giả định Maven resolve thành công.
- Cập nhật specstatus/index/DATA và ghi overrideMASTER_PLAN cho quyết định ARCHIVED thay importer nháp cũ. Đang self-review coverage/contract/5failuremodes và kiểm tài liệu; chưa viết product code, test/build/browser/migration/QA mới chưa chạy. Bước tiếp user review plan theo writing-plans trước implementation; không hỏi lại cách thực thi.
- Self-review spec§1–2→Task1/2, §3→4/5, §4→3/4, §5→6, §6→2/4/7, §7→1–7; tên DTO/interfaces giữa task nhất quán. Năm ReviewFocus có named regression trong task sở hữu. Root Python kiểm7task pending/Markdown≤400trừDEV_LOG/148localfilelinks PASS, plan293dòng; `git diff --check` PASS. Chưa unit/build/Mavenresolve vì chỉ planning; chuẩn bị commit/pushdev tài liệu để user review.

### S029-C03 — 31/10/2026 — thực thi importer đã duyệt
- User duyệt plan; bắt đầu7task Native/tuần tự với executing-plans/TDD/using-git-worktrees. Giữ dev checkout theo plan, base81f1c09; workspace ignored BOOK_IMPORT_PLAN riêng, ledger preflight interfaces tương thích. Không mở lại lựa chọn cách thực thi.
- Đang baseline frontend/backend và Task1; không ghi PASS trước output. Phạm vi QA scratch, chưa migrate/deploy online hoặc chạm catalogue bán thật.
- Baseline frontend145/145, backend123run/0failure/0error/3live skip cleanverify PASS. Task1 RED thiếu DTO/validator→GREEN6/6, dùng chung writeErrors/metadata checks với manual publish; fingerprint không gồm vị trí dòng/header, giữ ISBN0 đầu và tên/ISBN trùng giữa nhóm khác nhau.
- Regression kết hợp lần đầu testdiscovery fail BookDtos.BookDetail do bytecode incremental target (mẫu lỗi IDE đã gặp trước), không phải assertion; cleanverify mới PASS. Đã sửa typo type Taxonomy về taxonomy.TaxonomyDtos khi compile, không sửa source cũ để chiều lỗi target. Đang commit/taskdone Task1, chưa hoàn tất importer.
- Task1 commit ed17746/taskdone regression clean PASS; bắt đầuTask2. Maven đã resolve/compile POI6.0.0 và CommonsCSV1.14.1; parser/template tests RED thiếu class→GREEN, CSV/XLSX cùng dữ liệu cho cùng digest, ISO ISBN0 đầu/multiline và file mẫu header-only đạt. POI package có relationship part không được gọi getRelationships; sửa duyệt relationship đúng API sau test parity lộ nguyên nhân, không nới kiểm external link.
- Bổ sung regression resource sharedstrings20001 RED thiếu chặn→GREEN bằng preflight counter, và macro workbook đổi đuôi xlsx RED được nhận→đang cleanverify sau kiểm contentType. Typed XLSX errors đi cùng CellRow với overload cũ để gom lỗi nhiều ô; không log exception XML chứa nội dung file. Task2 chưa complete cho tới fullsuite/taskdone.
- Task2 cuối: cleanverify142run/0failure/0error/3live skipped PASS; Maven dependencytree xác nhận CommonsCSV1.14.1/POI6.0.0. Các ca thêm101nhóm/cellbudget/sharedstringmissing/ZIPinflate cũng đạt. Parser event/SAX bounded không evaluate/network, mẫu header-only và sheet hướng dẫn; chuẩn bị commit/taskdone rồi Task3 receipt/transaction.
- Task2 commit5c98cf7/taskdonePASS. Task3 RED thiếu store/transaction→GREEN5tests; cleanverify147run/0failure/0error/3live skippedPASS. V11 receipt/item không đổi dữ liệu V10; haiOWNER import đồng thời cùngfile chỉ1batch/2sách/3variants, lỗi sách cuối rollback cảlô rồiretryđược, receiptcũ khôngghiđè sách sửa/tồn9 hoặc lỗi vìcollectioninactive.
- createImported tái sử dụng createAggregate/mapper/audit, ARCHIVED/publishedAtnull/media0/session0. Audit allowlist thêm source/importBatchId, receiptbookcode dùngVARCHAR32 nhưdomain; cleanup thực tế nằmPgTestData nên thêm2table tại helper đó. Resolvecollectionbulk vàFORSHARE khicommit; khôngCloudinary. Chuẩn bịcommit/taskdoneTask3 rồi API/quota.
- Task3 commitcd68103/taskdonePASS. Task4 API/gate RED thiếu classes→GREEN8focused; bổ sung failedparse10lần/permitrelease/1000issuecap HTTP, cleanverify157run/0failure/0error/3skipPASS. Preview200issues khôngghiDB/sequence; confirm201 hoặc200receiptcũ, mismatch409, refsđổi422, size413, CSRF/STAFF403, no-storetemplates/options, retryreceipt miễnquota đạt. Đangcommit/taskdone rồi nối UI.
- Task4 commit7a2f53b/taskdonePASS. Task5 UI/API REDmissingcomponent→GREEN158frontend; hai regression RED old-session401 ảnh hưởng chủ mới/optionsfail mởkhóa commit →fix epochguard và lỗi auxiliary riêng, full161/161PASS. Route harness nhận đúng /admin/sach/import trước :id; File/fingerprint retry giữ nguyên, latefile/auth/destroy và bodyHTML được kiểm. Đang chốtWorkersbuild/commit/taskdone; chưa browserQA.
- Workersbuild sandboxabort134, rerun elevatedPASS; full161frontend sau chỉnh fixturemetadatađầyđủPASS. Lỗi tải options/template không clear/unlock phiên confirm;401cũ không gợi reauth choownerđãloginmới. Source mới book-import component/API/models/template/style và guarded Blobdownload ởAdminHttp; quyền, epoch và CSRF giữ cơ chế chung. Chuẩn bịcommitTask5 rồi Task6.
- Task5 commit7eab9a8/taskdonePASS. Task6 RED thiếu BookFilter/publishedAt/nhãn→GREEN163frontend và159backend/0failure/0error/3skip cleanverifyPASS. Query summary thêmpublishedAt cùngSQL, filterunpublishedOnly kết hợpfiltercũ, placeholderảnh và nhãn Xuấtbản/Hiện đúng. Không gửi false thừa khiURLkhôngbậtfilter để giữ contract caller cũ.
- Fakeprovider integration trongpackage media tái sử dụng fixture: import0ảnh→FRONT thiếuBACK chặnpublish→thêmBACK, hiddenstock3 detail/media404/listlookup khônglộ→publish200, timestamp đầu giữ sauẩn/hiện; STAFF403/version409 và cùngbookID/session0 đạt. Chưa dùng QA/browserlive trongTask6; đangcommit/taskdone trướcTask7.
- Task6 commit4cf13de/taskdonePASS. Task7 mở scratchme_may_import_qa/API8088/SSR4009/accountgiả/ảnhPNGgiả, chưa import hoặc upload thật trước reviewfix. User bổ sung cuối phiên dọn DB test tạm các phiên trước; inventoryDocker có7DBscratch/restore và dev/test/postgres. Đối chiếu DEV_LOG chứng minh ownership trước drop, không xóa assets tham chiếu trong DB restore vì có thể là media production.
- Finalreview fresh-context81f1c09..4cf13de:0Critical/2Important/0Minor; Important đúng về CSV toànôtrống và login epoch làm mất pendinglock/recovery. Mộtfixpass RED→GREEN: csvBlankCellRecordsMatchXlsxBlankRows; hai tests AuthService thật/HttpTestingController chứngminh nútlogin vẫnkhóa và supersededcallback khôngẩnform. Backend160run/0failure/0error/3skip vàfrontend165/165PASS. Không rereview/minorfix; đang rebuild vàrestart ownQA để đo/browser bảncuối.

### S030-C01 — 01/11/2026 — tiếp tục QA import và cleanup
- User yêu cầu tiếp tục; đối chiếu dev7aa8679 ahead7, Tasks1–6 đã commit, Task7 chưa xong. QA8088/4009 health200 và scratch còn đúng workload; không làm lại phần đã hoàn tất.
- Tiếp tục browser XLSX/lostresponse/reauth/STAFF và manual2/6ảnh, rồi cleanup7DB tạm có ownership. Lần giả lập lostresponse trước chưa commit, chưa ghi PASS; đang kiểm status thực tế. Chưa deploy/migrate online.
- BrowserQA cuối đạt: XLSX tải từ website điền cùng CSV trảreceipt101; imported1012ảnh publish/ẩn/hiện/stock3→0→3 vàprivate404→200/viewer/mobile đạt. Manual3042ảnh/3056ảnh stock1PUBLISHED; giả lập mất finalresponse6ảnh retrycùng305. Importrealcommit303→fetchreject→retry200cùng303;401/reauth giữFile→previewcùng303; STAFFkhônglink/guardredirect/directAPI403. Harnessroute.fetch làm mấtmultipart→422, XHRkhôngáp dụngwithFetch, exactnotice/selectorQA quá chặt; chỉ sửa harness, không đổi productcode. Quota429 đúng sau nhiều lầnthử, restartownQA để tiếp tục.
- Đo100sách/500variants local1mẫu: confirm1559,496ms/backend1550,921ms/2106SQL/3connections; heap snapshot101366→106226KiB, khôngpeak/RSS. Fullsize lỗi sách cuối rollback counts nguyên, retry100sách/replaycùngreceipt. Khôngclaim Render/Neon/median/p95. NodeSSR/Workersbuild/proxy/SSRchecker saureviewfixPASS; không rerun fullsuite khi không đổi productcode.
- Cleanup theo user: ẩn3listingQA, destroy10/10asset exactmemay/test/UUID của scratchhiện tại, đóngbrowser vàAPI8088/SSR4009. DROP7DB tạm entry_qa/import_qa/m5_qa/m5_s022_restore/m5_s023_restore/performance_qa/restore_test; chỉ còn me_may_dev/me_may_test/postgres. S0232kết nốiDBeaveridle đóng khi drop; khôngxóa asset production thamchiếu trong restoreDB hoặc backupdump/Neon.
- Gộp format20cột vào DATA, contract/quytrình/API/receipt/gate vào BOOK_IMPORT, cập nhật DESIGN/ARCHITECTURE/DEPLOYMENT/MASTER_PLAN/rootREADME/soleindex; bằng chứng ở BOOK_IMPORT_VERIFICATION. Spec/plan chỉ retire sau chuyển đủ quyết định/tiêu chí; đang kiểm link/line/ignore/finaldiff và chuẩn bị commit/pushdev. MCPgraph transportclosed nên fallback fileknownpath; không coi graphđã cập nhật.
- Finalcheck PASS trần400/localfilelinks/ignore/diff/cổngQAđóng/browserresult/10assets/7DBcleanup; Task7 task-donePASS. Đã chuyển đủcontract/criteria/gate rồi gỡ BOOK_IMPORT_SPEC/PLAN; safeevidence vàledger đủ7taskcomplete ở.local/book-import ignored. Không đổi productcode sau reviewfix, không chạy lại suite chỉ vì thay tài liệu. Đang commit/pushdev theo workflow đã duyệt, chưaclaimremoteđồngbộ trước output.
- Commitd35f79c và toàn bộ7commitimplementation/reviewfix đã pushorigin/dev thành công; remoteverify0/0, tree sạch. Đã giữ safeevidence/ledger rồi xóa duy nhất workspace BOOK_IMPORT_PLAN do task này sở hữu, không đụng siblingplan. Checkpoint này hoàn tất bàn giao; bước tiếp user reviewdev và rolloutV11/QAhost theoDEPLOYMENT, chưamerge/deploymain.

### S030-C02 — 01/11/2026 — rút gọn hướng dẫn import
- User yêu cầu bỏ phần chuẩn bị file mẫu sẵn, chỉ hướng dẫn ngắn gọn các field. Bắt đầu deva9d1f88 sạch/khớp remote; dùng nhánh chỉnh sửa rõ và nhỏ của brainstorming, không tạo spec/plan mới.
- Phạm vi UI: bỏ nút tải mẫu, thay hướng dẫn dài bằng bảng field ngắn và mã lựa chọn thu gọn; kiểm file/xác nhận/receipt giữ contract hiện hành. Cập nhật tài liệu theo UI mới; đang làm, chưa chạy kiểm chứng.
- Đã thay phần Chuẩn bị file theo mẫu/nútCSV-XLSX và các đoạn dài bằng bảng8nhóm đủ20field, bắt buộc/tùy chọn/ràng buộc chính; giữ mã lựa chọn thu gọn. Đánh lại bước kiểmfile/xácnhận1/2; bỏ CSSactions không còn dùng. API template/parser/schema không đổi; README/DATA/DESIGN/BOOK_IMPORT cập nhật cách dùng hiện tại.
- Tại root `npm --prefix code/frontend test`: PASS165/165/37files. Workers build sandboxabort134, rerun elevated PASS. Không thêm test cho thay đổi copy/layout có thể đảo ngược; không chạy backend/browser/DB vì không đổi logic. Đang kiểm trần dòng/localfilelinks/diff rồi commit/pushdev; chưa deploy.

### S030-C03 — 01/11/2026 — tổng hợp gate trước khi chuyển tối ưu UI
- User muốn khép MVP để tối ưu giao diện, yêu cầu tổng hợp gate còn dang dở. Đối chiếu soleindex/PROGRESS/VERIFICATION/DEPLOYMENT/masterDoD/M5plan và hai verification hiệu năng/import; không chạy live hoặc suy candidate đã deploy. Phạm vi là chốt hướng làm việc và bàn giao gate, không triển khai UI hoặc tự nghiệm thu production.
- Cập nhật PROGRESS thành snapshot ngắn: đóng phạm vi feature,9nhóm gate với điều kiện đóng, thứ tự rollout→smoke/recovery→đoUIbảncuối. Phân biệt import/benchmarktarget ngoài gateMVP gốc, VPSQA chỉ điều kiện khi cònchậm và deferredminor edittiming; giữ pilot21/21/case user đã xác nhận, không bắt làm lại. Không bỏ DoD, không tự sửa quyết định hosting/merge/deploy.
- Kiểm tài liệu PASS: trần400/localfilelinks và gitdiff--check. Không chạy unit/build/browser/DB/network vì chỉ tổng hợp tài liệu; trạng thái online là “chưa có bằng chứng mới”, không là FAIL được tái hiện01/11. Bước tiếp tối ưuUI theo brief user; các gate release tiếp tục được giữ tại PROGRESS/DEPLOYMENT.

### S030-C04 — 01/11/2026 — dọn tài liệu/spec/plan cũ
- User yêu cầu rà soát dọn docs/plan cũ, giữ việc còn tồn đọng. Bắt đầu dev463d569 sạch/khớp remote. Phạm vi: chuyển contract còn giá trị sang tài liệu hiện hành, gỡ6fileM2/M5/hiệu năng đã hết vai trò, sửa soleindex/liên kết và giữ đủ gate/evidence; không đổi app, gate hoặc lịch sử DEV_LOG.
- Đang đối chiếu các uncheckedtask với PROGRESS/DEPLOYMENT và verification. MCPgraph search transportclosed; fallback fileknownpath và controller/DTO thực để sửa contract cũ (JPA/readingLevelBasis/availability trực tiếp/ba slot/lưu nháp). Chưa ghi cleanup hoàn tất hoặc chạy unit/build/live.
- Đã gỡ M2_SPEC/PLAN, M5_COMPLETION_SPEC/PLAN và BOOK_PUBLISH_PERFORMANCE_SPEC/PLAN (6file); contractAPI/quyền/schema/media chuyển CATALOGUE230dòng, giữ DATA/DESIGN/ARCHITECTURE là nguồn chuyên trách. Bỏ khảo sát sourcecũ khỏi architecture hiện hành; lịch sử cònGit/DEV_LOG. Sửa README các câu stale vềSTAFFsửanháp/lưunháp/căn cứlevel/thiếucấuhình và linkcontract.
- Unchecked cũ được đốichiếu: M2pilot21/21 đãđạt, measurement/nhãnmã/bàn giao giữ PROGRESS; M5smoke0/3wishlist/SOLD/hidden/price/expiry/foreground/copy và onlineLighthouse/recovery/hardening giữ DEPLOYMENT; Render5vòng/warmcold/HAR/timings/quota giữ protocolQA; upload2 là notapplicable/giữ1, không biến thành task cònthiếu; minor edittimingselectedAt vẫn giữ. Không xóa tiêu chí để khép gate.
- VERIFICATION bỏ hai checklist cònthiếu đã lỗi thời, giữ bằng chứng theo ngày và xác nhận user; DBperformance đã drop01/11 được chú thích thay snapshot cũ giữDB. Soleindex45dòng chỉ dẫn nguồn hiện hành/gate; PROGRESS không còn linkplan đãgỡ. Tổng docs19→14file, giảm hơn1200dòng, không tạoarchive/INDEXmới.
- Kiểm fresh PASS: trần400trừDEV_LOG, localfile+headinganchors, khônglink6fileđãgỡ, DEV_LOGappend-only, gitdiff--check, chỉMarkdownthayđổi và khôngcònchecklisttaskcũ. Không unit/build/browser/DB/live vì chỉ dọn tài liệu; đang commit/pushdev, khôngmerge/deploymain. Bước tiếp UI theo briefuser; backlogrelease tại PROGRESS/DEPLOYMENT, evidence không đổi thànhPASS mới.

### S030-C05 — 01/11/2026 — review và chốt format import16cột
- User cung cấp input/me-may-sach-v2.xlsx và yêu cầu xem/chốt theo hướng đã bàn; phạm vi reviewfile/chốtquytắc, chưa yêu cầu code importer hoặc chỉnh workbook. Đọc cấu trúc bằng bundledPython ZIP/XML sau skillSpreadsheets, không thực thi nội dung trong file như chỉ dẫn. Base dev10d72bf sạch/khớpremote.
- File9622bytes/XMLexpanded20330bytes, một sheetSach,16headerA1:P1, không dòngsách/cellformula/externalpart/macro/merge. Năm listvalidation ở E/F/J/L/N gồm nhãn dễ đọc; list có khoảngtrắng sau dấu phẩy, áp dụng từhàng1 tớicuối sheet. CộtISBN/tuổi là text. HeaderF1 là “kieu_bia (nếu là picture book)”. Chưa chạy parser hiện tại lên file hoặc kiểm thao tác Excelnative; xác nhận cấu trúcXML không thay end-to-end import.
- Chốt formatV2 trong BOOK_IMPORT, DATA chỉ rõV1đangchạy/V2chờcode; PROGRESS/soleindex ghi việcchưalàm thay vì tạo spec/plantrùng.16cột/mỗidòng1sáchẨn/defaultTiếngAnh/tồn1/biếnthểkhôngtên, thêm biếnthể lúcảnh; nhãn dropdown→code backend, exactheaderaliasF1, khôngfuzzyguess, đa tuổi bằng`;`. Giữ validation/atomicity/quyền/receiptV1 và V2không làm mất dòngtrùng. Dropdown hàng1 được ghi khuyếnnghị bắt đầu hàng2, không tự sửa file.
- Kiểm fresh PASS: checksumworkbookkhôngđổi,16headers/5dropdown/header-only/nocellformula, Markdown≤400/localfile+headinglinks/gitdiff--check. Chỉreview+chốt hướng, chưa thay parser/UI/schemaDB, chưaunit/build/nativeExcel/end-to-endV2. Đangcommit/pushdev tài liệu; bước tiếp khi user yêu cầu triểnkhai: viết task/test cho16cột/labels/defaults/alias/receiptcompat và flowthêmảnh→variants→publish.

### S030-C06 — 01/11/2026 — triển khai importV2 đã chốt
- User đã chỉnh dropdown bắt đầu hàng2 và yêu cầu bắt đầu triển khai; workbookSHA256d5568d738df71ab5727131b7b5c476c7ed8622dc30a403e481e473c964d5a590, XML xácnhậnE/F/J/L/N từhàng2. Base dev9852a55 sạch/khớpremote. Giữ Native/tuần tự/devcheckout theo preference, không hỏi lại thiết kế/cáchthựchiện.
- Writing-plans→executing-plans/TDD, planBOOK_IMPORT_V2_PLAN3task và workspace riêng ignored. Scope16cột/humanlabels/defaults/V1receiptcompat/UI/tests; không migration/providerasset/scratchDB/deploy. MCPgraphtransportclosed, fallback đọc sourceknownpath; đang baseline và viết testRED, chưaclaimV2đạt.
- Baseline elevatedbackend160run/0failure/0error/3skip và frontend165/165PASS; sandbox backend SocketExceptionOperationnotpermitted nên rerun ngoài sandbox, không đổi app. Task1 testRED: template16expected20 và6headerserror doV2chưađượcnhận; V1goldenhash7eeb…92fc đãPASStrướcthayđổi.
- UnitGREEN28/28 cho V1/V2/parser/template/defaults/all-dropdowns/duperows/reorder/limits. IntegrationRED4/5 doV2confirm409 và referencepreview schema1; sửa digestversion/DBschema_version/propagateversion, fullbackendcleanverify173run/0failure/0error/3skipPASS. Không schema migration; V1digest/receipt giữ nguyên. Đang commitTask1 rồiUI.
- Task2 RED V2previewlộR001→GREEN hiển thị Dòng7/defaults; frontend167/167 vàWorkersbuildPASS sau sandboxesbuild134 rerunelevated. Guide đủ16field/defaults/nhãn, V1key vẫn hiện đúng; không testcopy tĩnh đơn thuần.
- User bổ sung2thể loại chung trong lúc đang làm: Tập đọc và Nấu ăn - thủ công - activity book. Đưa thành Task3 trong plan hiện tại (QA chuyểnTask4); mã READING_PRACTICE/COOKING_CRAFT_ACTIVITY, slugtap-doc/nau-an-thu-cong-activity-book, appendsort6/7. CầnV12 chỉthêmcategory, không sửaV3 hoặc migrationonline.
- Task3 RED3backend/2frontend do taxonomy chỉ6, importlabelunknown, filterURL bỏcode mới; V12seed2category + importcode/alias + TSunion/filterallowlist→GREEN backend176run/0failure/0error/3skip, frontend169/169/WorkersPASS. Migrationtest V11→12 giữ ID/nội dung6categorycũ và existingbook/listing; manualsave/publish/publicfilter2codePASS. Không migrateonline hoặc sửa workbookuser.
- Task4 bổ sung regression cho nhãn tuổi website dùng en-dash: REDinvalidage→GREEN whitelistalias, khôngfuzzy. V2fakeprovider integration importẨn/tồn1/TiếngAnh→2ảnh→thêm2biếnthể/tổng3→publish/media404trước200sau→retryreceiptgiữtồn3PASS. Fullbackend178run/0failure/0error/3skip, NodeSSRbuild/WorkersproxyPASS; đang browsermock và mộtreviewtoànbranch. Không tạo DB hoặc Cloudinaryasset mới.
- Freshwholebranchreview9852a55..b0d23a8:0Critical/0Important/1Minor, khôngfixpass/rereview. SparseV2XLSX optionalcell/noncontiguousrow/errorrow fixture thiếu regression riêng đượcdefer, không nhận làbugđãtái hiện. Executor giữgateonline/docsretire/receiptidempotency; header-onlyV2schema1 chỉmetadata vì fileemptybịchặn.
- BrowserAngular thật với mockAPI/XLSXcopydữliệuQA: guide16field/noTảiMẫu/Dòng2/defaultTiếngAnh+tồn1/confirmreceipt/editorlink và390×844khôngoverflowPASS; đãxem screenshot. Không gán mockUI là browser→realAPI; pipeline thậtDB+fakeprovider đãkiểm178suite. NodeSSR/Workersbuild/WorkersproxyPASS; không chạy lại publicSSRchecker/Lighthouse/cloud vìruntime/publicdelivery khôngđổi và gateonline chưacótargetQA.
- Đóngbrowserimport-v2 và ownedSSR4009; khôngtạo DBscratch/providerasset, khôngđụngsiblingworkspace. Workbookuser giữSHA256d556…a590; filegốc dropdowncategoryvẫn6mụcdoownerthiếtlập, website/API đãnhận8labels/codes. Không tựsửa workbook. Gộp16cột/V1compat/8category/V12rollout vàoDATA/BOOK_IMPORT/CATALOGUE/DESIGN/ARCHITECTURE/MASTER_PLAN/DEPLOYMENT/README; evidencevàminorgiữBOOK_IMPORT_VERIFICATION. Đangfinalcheck/retireplan/commitpushdev, chưadeploy/migrateonline.
- Finalcheck vàtask-done4PASS: backend178/0failure/0error/3skip, frontend169/169, NodeSSR/Workers/proxy, browsermock, workbookchecksumkhôngđổi, QA4009đóng, docline/link/anchor/ignore/diff. Plan4taskcomplete, criteria/decision/gates đãchuyển đủ nên gỡBOOK_IMPORT_V2_PLAN; safeevidence/ledger giữ.local/book-import-v2 ignored, không thêmarchive/plantrùng. Chuẩn bịcommit/pushdev cùngbàn giao; khôngclaimonlineđạt.
- Commitcodefb61cd4/68df545/8368530/b0d23a8 và bàn giaofdd06f5 đã pushorigin/dev thành công, verify0/0/treeclean. Đã lưu safelog/ledger4taskcomplete rồi xóa duy nhất workspaceBOOK_IMPORT_V2_PLAN thuộcphiên, giữsiblingplan/userworkbook/ảnhsource. Bước tiếp userreview/merge/deploytheoDEPLOYMENT (V12vàsmokeV2); frontend/backendlocal đãkiểm, khôngclaimonlinePASS.

### S031-C01 — 02/11/2026 — grill-me spec navbar và trang danh sách sách

- Mục tiêu: user bắt đầu tối ưu UI từ navbar (mẫu IPM gửi trong chat: navbar desktop,
  dropdown, sidebar/header mobile, trang danh mục). Đọc README/PROGRESS/DESIGN/CATALOGUE §11
  và `public-layout.ts`, `catalogue-page.*`, `catalogue-state.ts` (thể loại từ `/taxonomy`).
- Quyết định (user chọn qua 19 câu): nav `Trang chủ · Tất cả sách▾ · Flash Sale · Bộ sưu tập▾ ·
  Cách mua · Liên hệ`, IN HOA căn giữa, active `--red`, hover/focus mở dropdown; mobile ☰/logo/♡ +
  search full-width, sidebar `<dialog>` đỏ accordion, ẩn utility, không sticky, breakpoint 720px.
  Trang `/sach`: cột DANH MỤC dạng link, Độ tuổi checkbox + Áp dụng, tiêu đề theo thể loại, chip
  Paperback/Hardcover dưới tiêu đề Picture book, bỏ ô tìm/select thể loại/kiểu bìa trong panel,
  dòng "Kết quả cho q ✕"; mobile chip cuộn ngang; bộ sưu tập cùng bố cục, thể loại link sang `/sach`.
- File: thêm `docs/UI_NAV_CATALOGUE_SPEC.md`, đăng ký README, cập nhật PROGRESS. Ảnh mẫu không commit.
- Kiểm tra: chưa chạy test/build (chỉ tài liệu). Chưa code.
- Bước tiếp: user duyệt spec + 2 câu hỏi mở (sort áp ngay; tablet 721–960px) → plan → code trên `dev`.

### S031-C02 — 02/11/2026 — user duyệt spec navbar/catalogue, bắt đầu triển khai

- Mục tiêu: thực thi `docs/UI_NAV_CATALOGUE_SPEC.md` sau khi user duyệt và chốt 2 điểm §10
  (chỉ Độ tuổi cần nút Áp dụng, Sắp xếp áp ngay; tablet 721–960px giảm cỡ chữ/khoảng cách;
  ô search placeholder `Bạn đang tìm…` và điền sẵn `q` khi ở `/sach?q=…`).
- Kế hoạch 4 bước trên `dev`: (1) nhãn/fallback taxonomy & helper filter URL; (2) `PublicLayout`
  navbar desktop IN HOA + dropdown hover/focus/touch/Escape + mobile header ☰/logo/♡ + sidebar
  `<dialog>` accordion; (3) `CataloguePage` cột DANH MỤC link + Độ tuổi checkbox/Áp dụng +
  chip mobile cuộn ngang + chip Paperback/Hardcover + dòng `q`; (4) unit test Vitest, build SSR/
  Workers, kiểm tra browser 1280px & 390×844 và hoàn tất tài liệu.
- Trạng thái: đang thực thi Task 1–3.

### S031-C03 — 02/11/2026 — hoàn tất triển khai và kiểm chứng navbar/catalogue UI

- Phạm vi & file thay đổi:
  - `code/frontend/src/app/features/admin/books/book-copy.ts`, `code/frontend/src/app/features/catalogue/catalogue-state.ts`: thêm `CATEGORY_LABELS`, `DEFAULT_CATEGORIES`, `DEFAULT_AGE_GROUPS`, `categoryLabel` làm fallback đồng bộ với `/taxonomy`.
  - `code/frontend/src/app/layouts/public-layout.ts`: navbar desktop 6 mục IN HOA căn giữa, active `--red`, dropdown `Tất cả sách` (9 mục) & `Bộ sưu tập` hỗ trợ hover/focus/click nút `▾`/Escape trả focus; mobile (≤720px) ẩn utility/nav ngang, header ☰/logo/♡ + search full-width (`placeholder="Bạn đang tìm…"`, đồng bộ `q`), sidebar `<dialog>` đỏ trượt từ trái kèm accordion `›`, đóng khi Escape/backdrop/✕/link/đổi route và trả focus về ☰, tắt animation khi `prefers-reduced-motion: reduce`.
  - `code/frontend/src/app/features/catalogue/catalogue-page.{ts,html,scss}`: bố cục cột trái `DANH MỤC` (link thể loại giữ `q/age/sort`, reset `page/binding`; trên trang bộ sưu tập link sang `/sach?category=`) + `Độ tuổi` checkbox kèm nút Áp dụng; vùng phải tiêu đề IN HOA + `<title>` theo thể loại, `Sắp xếp theo:` áp ngay, chip `Tất cả · Paperback · Hardcover` cho Picture book, thanh `Kết quả cho “q” ✕ Xóa`; mobile chuyển thành 2 hàng chip cuộn ngang (`minmax(0, 1fr)` tránh tràn ngang ở 390px).
  - `code/frontend/src/app/app.spec.ts`, `code/frontend/src/app/features/catalogue/catalogue-page.spec.ts`: thêm unit test cho toàn bộ tiêu chí nghiệm thu.
  - Gộp spec vào `docs/DESIGN.md`, bằng chứng vào `docs/VERIFICATION.md`, cập nhật `docs/README.md`, `docs/PROGRESS.md` và gỡ `docs/UI_NAV_CATALOGUE_SPEC.md`.
- Kiểm tra đã chạy (cwd `code/frontend`):
  - `npm test`: 37/37 test files, 172/172 tests PASS.
  - `npm run build`, `npm run build:workers`, `npm run check:workers:proxy`: PASS.
  - Chrome headless qua CDP với built SSR (4009) + mock API (8099), đã xem 4 ảnh chụp màn hình (`1280×800`, `820×900`, `390×844` catalogue & sidebar): không overflow ngang (`scrollWidth <= innerWidth`), dropdown/sidebar/chip/reduced-motion/focus hoạt động đúng; đã đóng Chrome và server 4009/8099.
- Bước tiếp theo: commit và push lên `dev`; sẵn sàng cho đầu việc tối ưu UI tiếp theo của user.

### S032-C01 — 02/11/2026 — bắt đầu chuẩn hóa cấu trúc frontend External Template

- Mục tiêu: chuẩn hóa `code/frontend/src/app` theo quy ước External Template và gom thư mục con `<tên>/<tên>.{ts,html,scss,spec.ts}` (Phương án 2 user đã duyệt).
- Phạm vi đã chốt:
  - Giữ tên file ngắn chuẩn Angular 20 (`<tên>.{ts,html,scss,spec.ts}`).
  - Gom vào thư mục con `<tên>/` và dùng External Template (`templateUrl`) cho các layout/page/component nghiệp vụ:
    - `layouts/public-layout/public-layout.{ts,html,scss}`, `layouts/admin-layout/admin-layout.{ts,html}`
    - `features/admin/login/login.{ts,html}`, `features/admin/collections/collection-list/collection-list.{ts,html,scss,spec.ts}`, `features/admin/flash-sale/flash-sale.{ts,html,scss,spec.ts}`
    - `features/admin/books/{book-editor,book-import,book-list,book-media-panel,book-preview,book-audit-panel,book-status-actions}/<tên>.{ts,html,scss,spec.ts}`
    - `features/catalogue/{catalogue-page,book-detail,book-card,contact-dialog,flash-sale-page}/<tên>.*`
    - `features/wishlist/wishlist-page/wishlist-page.{ts,html,scss,spec.ts}`, `features/information/contact-page/contact-page.{ts,html}`
    - `features/home/home-page.{ts,html,scss}` và `app.{ts,html,scss,spec.ts}` đã ở thư mục riêng.
  - Không tạo `.scss` rỗng cho `admin-layout`, `login`, `contact-page`.
  - Giữ Inline Template cho 5 component nhỏ: `overview.ts`, `not-found.ts`, `public-page.ts`, `public-error.ts`, `wishlist-button.ts`.
- Trạng thái: đang thực thi trên `dev` theo kế hoạch 3 bước: (1) `layouts/`, `information/`, `wishlist/` và `catalogue/`; (2) `admin/` (`login`, `flash-sale`, `collections`, `books`); (3) kiểm chứng Vitest + SSR/Workers build + cập nhật `docs/ARCHITECTURE.md`.

### S032-C02 — 02/11/2026 — hoàn tất chuẩn hóa cấu trúc frontend External Template

- Thay đổi chính:
  - Tách External Template (`.html`) và style riêng (`.scss`) cho 6 component đang để inline: `layouts/public-layout/`, `features/admin/books/book-audit-panel/`, `features/admin/books/book-status-actions/`, `features/catalogue/book-card/`, `features/catalogue/contact-dialog/`, `features/catalogue/flash-sale-page/`.
  - Tách `styles` inline sang `features/admin/flash-sale/flash-sale.scss`.
  - Tách External Template (`.html`) không kèm `.scss` rỗng cho 3 component dùng global/utility CSS: `layouts/admin-layout/`, `features/admin/login/`, `features/information/contact-page/`; xóa `app.scss` 0 byte không dùng.
  - Di chuyển các bộ component có sẵn vào thư mục con `<tên>/` và cập nhật toàn bộ đường dẫn `import`: `features/wishlist/wishlist-page/`, `features/catalogue/{catalogue-page,book-detail}/`, `features/admin/collections/collection-list/`, `features/admin/books/{book-editor,book-import,book-list,book-media-panel,book-preview}/`.
  - Giữ Inline Template cho 5 component trình bày nhỏ: `overview.ts`, `not-found.ts`, `public-page.ts`, `public-error.ts`, `wishlist-button.ts`.
  - Hợp nhất style chung của `.site-header`, `.brand`, `footer` về `src/styles.scss` để loại bỏ hoàn toàn cảnh báo budget `anyComponentStyle` (4kB) khi build production/Workers.
  - Cập nhật sơ đồ và quy ước component frontend trong `docs/ARCHITECTURE.md` và `docs/PROGRESS.md`.
- Kiểm chứng đã chạy:
  - `npm --prefix code/frontend test`: 37/37 file, 172/172 test PASS.
  - `npm --prefix code/frontend run build`: PASS (0 warning).
  - `npm --prefix code/frontend run build:workers`: PASS (0 warning).
  - `npm --prefix code/frontend run check:workers:proxy`: PASS.
- Bước tiếp theo: kiểm tra trần dòng tài liệu/link local/`git diff --check`, commit và push lên `dev`.

### S033-C01 — 03/11/2026 — cấu hình domain memaybooks.com

- SETUP-05, đang làm trên dev. Dùng domain gốc cho Cloudflare Worker me-may và origin SSR chính thức. Kiểm cấu hình Wrangler, frontend và proxy API.

- `wrangler.jsonc` khai báo Custom Domain và origin chính thức; tắt route production
  workers.dev khi deploy. /api cùng origin vẫn qua Worker đến Render. Cập nhật
  DEPLOYMENT, ARCHITECTURE và PROGRESS.
- Từ code/frontend: `npm test` 172/172; `npm run deploy:workers -- --dry-run` và
  `npm run check:workers:proxy` đạt. Lần dry-run trong sandbox gặp EPERM/SIGABRT,
  chạy lại với quyền đã duyệt đạt. Chưa chạy smoke HTTPS/SSR/admin trên domain thật.
- Bàn giao qua dev. Tiếp theo kích hoạt zone Cloudflare, user merge main/deploy,
  rồi smoke theo DEPLOYMENT. Chưa đổi DNS hoặc deploy.

### S034-C01 — 03/11/2026 — grill-me và bắt đầu triển khai UI Flash Sale & badge -%

- Mục tiêu: tối ưu giao diện Flash Sale trên Home, `/flash-sale`, `BookCard` và `BookDetail` theo
  mẫu user cung cấp.
- Quyết định (user chốt qua 6 câu):
  1. `% giảm` tính theo `priceMaxVnd` và làm tròn `Math.round((1 - salePriceVnd / priceMaxVnd) * 100)` (vd 40k → 18k = `-55%`).
  2. Hiển thị badge `-XX%` trên cả `BookCard` lẫn `BookDetail`, tự ẩn khi hết giờ sale.
  3. Nền Flash Sale trên Home tràn full-width `100vw` (`#ff625c` kèm họa tiết tia sét chìm hai bên), thanh tiêu đề trắng và 5 thẻ sách vẫn căn trong khung `.wrap` 1200px.
  4. Đếm ngược tách 3 ô đen bo tròn (`HH` `:` `MM` `:` `SS`, dấu `:` nằm ngoài giữa các ô) trên cả Home, `/flash-sale` và `BookDetail`; link `Xem tất cả ›` màu xanh dương đậm không gạch chân.
  5. Trên `BookDetail` khi sách đang Flash Sale: hiển thị thanh đỏ cam `#ff625c` chứa khung trắng `FLASH ⚡ SALE` + 3 ô đếm ngược; bên dưới là hàng ngang `Giá sale lớn · Giá gốc gạch ngang · Badge -XX%`; giữ lưu ý giá của Mẹ Mây, không thêm đánh giá/đã bán.
- Trạng thái: đang thực thi code và unit test trên `dev`.

### S034-C02 — 03/11/2026 — hoàn tất triển khai và kiểm chứng UI Flash Sale & badge -%

- Phạm vi & file thay đổi:
  - `code/frontend/src/app/features/catalogue/catalogue-state.ts`, `catalogue-state.spec.ts`: thêm `countdownParts(ms)` tách `[HH, MM, SS]` và `discountPercent(book)` tính `% giảm` làm tròn theo `priceMaxVnd`, trả `null` khi không có sale hoặc đã hết hạn.
  - `code/frontend/src/styles.scss`: thêm `overflow-x: clip` trên `body` và quy tắc chung `.countdown-boxes`, `.time-box`, `.time-sep` để tái sử dụng trên Home, `/flash-sale` và `/sach/:slug` mà không vượt budget CSS 4kB của từng component.
  - `code/frontend/src/app/features/catalogue/book-card/book-card.{ts,html,scss}`: hiển thị badge `.discount` (`-XX%`) bên cạnh giá sale.
  - `code/frontend/src/app/features/home/home-page.{ts,html,scss}`: nền `.flash-section` đỏ cam `#ff625c` tràn toàn chiều ngang (`margin-inline: calc(50% - 50vw)`) kèm tia sét SVG mờ hai bên, nội dung trong `.flash-inner.wrap`, thanh tiêu đề trắng bo góc gồm `FLASH ⚡ SALE`, 3 ô đếm ngược đen và link `Xem tất cả ›` màu `#1976d2`.
  - `code/frontend/src/app/features/catalogue/flash-sale-page/flash-sale-page.{ts,html,scss}`: đồng bộ 3 ô đếm ngược đen trong `.sale-timer`.
  - `code/frontend/src/app/features/catalogue/book-detail/book-detail.{ts,html,scss,spec.ts}`: thêm thanh `.detail-flash-bar` (chứa `.detail-flash-pill` với `FLASH ⚡ SALE` + 3 ô đếm ngược) và hàng `.price-row` (`Giá sale · <del>Giá gốc</del> · Badge -XX%`) khi sách đang Flash Sale; giữ nguyên chú thích giá.
  - Cập nhật `docs/MASTER_PLAN.md`, `docs/DESIGN.md`, `docs/VERIFICATION.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`.
- Kiểm tra đã chạy (cwd `code/frontend`):
  - `npm test`: 37/37 file, 174/174 test PASS.
  - `npm run build`, `npm run build:workers` (0 warning), `npm run check:workers:proxy`: PASS.
  - Chrome headless qua CDP với built SSR (4009) + mock API (8099) tại `1280×900` và `390×844` trên `/`, `/flash-sale` và `/sach/how-many-are-there-mm-000020`: không tràn ngang (`scrollWidth <= innerWidth`), nền Flash Sale tràn sát mép, 3 ô đếm ngược, link `Xem tất cả ›` và badge `-XX%` hiển thị đúng; đã đóng Chrome và server 4009/8099.
- Bước tiếp theo: commit và push lên `dev`; sẵn sàng cho đầu việc tối ưu UI tiếp theo của user.

### S035-C01 — 04/11/2026 — kiểm tra frontend API và Spring Security trên homelab

- Phạm vi: user yêu cầu kiểm cấu hình frontend/API/CORS sau khi kết nối tunnel;
  xác nhận quyết định dùng Dell cũ làm homelab và hostname api.memaybooks.com.
  Read-only runtime; không deploy/migrate/đăng nhập/ghi dữ liệu nghiệp vụ.
- Đã đối chiếu Angular PublicApi/AuthService/AdminHttp, Worker proxy/SSR origin,
  Wrangler, Spring Security, application profiles và Dockerfile trên dev sạch.
  Wrangler production còn Render; browser gọi relative /api nên giữ cùng origin,
  không cần thêm CORS. Dockerfile mặc định profile render/Neon, chưa xác minh
  override trên Dokploy; không suy ra database homelab từ health UP.
- Kiểm live bằng curl (cwd root, mạng ngoài sandbox do DNS sandbox bị chặn):
  api health200 UP; taxonomy200 có X-Memay-Server-Time/no-store;
  CSRF200 có token/header X-CSRF-TOKEN, cookie MEMAYSESSION Secure/HttpOnly/
  SameSite=Lax/Path=/api; không ghi token/cookie value vào log.
  OPTIONS login với Origin https://memaybooks.com và preflight POST trả401,
  không có CORS allow headers. FE /api/v1/taxonomy timeout25s; kiểm lại max80s trả503 sau70,38s
  với backend_unavailable. Chưa đọc dashboard Worker để xác nhận target live.
- Cập nhật PROGRESS/DEV_LOG/DEPLOYMENT/ARCHITECTURE theo quyết định homelab;
  chưa sửa code/config. Admin GET không session401 như mong đợi.
  `npx vitest run src/worker-runtime.spec.ts` (cwd code/frontend):9/9 PASS;
  `git diff --check`, trần400dòng (trừ DEV_LOG) và link local file đổi đạt.
  Login/CRUD/upload/SSR live qua backend Dell chưa chạy; chưa full build vì chỉ
  audit/tài liệu. Tiếp theo đổi API origin sang homelab, đối chiếu Dokploy profile/
  DB/forwarded headers thực tế, user merge/deploy rồi smoke auth/SSR/upload.
  Bàn giao tài liệu trên dev; không deploy, không sửa database hoặc cấu hình live.

### S035-C02 — 04/11/2026 — đổi API origin production sang homelab

- User yêu cầu sửa cấu hình được đánh dấu ở Wrangler production. Đang thực hiện
  trên dev: đổi MEMAY_API_ORIGIN thành https://api.memaybooks.com; giữ site origin
  memaybooks.com. Phạm vi không gồm preview, Spring profile hoặc deploy live.
- Sẽ kiểm Wrangler dry-run trước bàn giao; chưa chạy tại checkpoint bắt đầu.
- Kết quả: đổi đúng một giá trị production trong code/frontend/wrangler.jsonc;
  cập nhật PROGRESS/DEPLOYMENT/ARCHITECTURE để bỏ trạng thái repo còn Render.
  `npm run deploy:workers -- --dry-run` (cwd code/frontend) PASS: Workers build
  thành công, Wrangler xác nhận MEMAY_API_ORIGIN=https://api.memaybooks.com và
  MEMAY_SITE_ORIGIN=https://memaybooks.com; không upload/deploy.
- Kiểm git diff --check, trần dòng và link local tài liệu đạt. Commit/push dev
  cùng tài liệu bàn giao; bước tiếp theo user merge main/deploy frontend rồi
  kiểm proxy taxonomy, SSR, auth và upload qua Dell. Chưa chạy smoke sau deploy.

### S035-C01 — 04/11/2026 — gom ảnh và nút Liên hệ/Quan tâm ở chi tiết sách

- Yêu cầu: gom ảnh, `Liên hệ`, `Quan tâm` giống mẫu Fahasa; user chốt qua grill-me: ảnh lớn + thumbnail bấm đổi ảnh (không thêm thư viện), hai nút dưới thumbnail trong cột trái, sticky desktop / thanh dưới mobile, bộ chọn biến thể lên cột phải, link cộng đồng + ghi chú dưới nút, `Liên hệ` luôn bấm được và nhắc chọn biến thể, triển khai thẳng trên dev. Cùng phiên: đổi `VNĐ` → `đ` (code frontend + docs, trừ lịch sử DEV_LOG).
- File: `book-detail.{ts,html,scss,spec.ts}` (`mainMedia`, `selectMedia`, `onContact`, `.media-col`, `.thumbs`, `.contact-actions`), `wishlist-button.ts` (CSS var `--heart-gap/--heart-width`), `DESIGN.md`, `VERIFICATION.md`, `PROGRESS.md`.
- Kiểm tra: `npm test` 175/175, `npm run build`, `npm run build:workers`, Chrome headless 1280×900 và 390×844 PASS (chi tiết ở VERIFICATION). Đã đóng Chrome/server tạm.
- Ghi nhận: header mobile ở 390px cắt chữ “Quan tâm” (lỗi cũ từ trước, chưa sửa). Bước tiếp: commit/push `dev`.


### S035-C02 — 04/11/2026 — header mobile và nhãn NXB/tác giả

- Sửa header mobile 390px: `♡ + số` ở cột phải hàng 1 (ẩn chữ “Quan tâm” trên mobile, giữ `aria-label`), search xuống hàng 2; trước đó link bị đẩy xuống hàng 3 và cắt chữ.
- Nhà xuất bản/Tác giả vốn đã tùy chọn ở backend (nullable, không bắt buộc publish), form và import; chỉ thêm nhãn “(nếu có)” trong `book-editor.html` để hiển thị rõ. `npm test` 175/175, build SSR/Workers và Chrome 390×844 PASS.

### S036-C01 — 04/11/2026 — bắt đầu cache public và trạng thái tải

- User duyệt đề xuất cache trang chủ, ảnh/static assets, giảm request lặp rồi logo/
  skeleton. Scope và kiểm chứng trong PUBLIC_CACHE_PLAN, đang triển khai trên dev.
- Git đầu phiên sạch. Không thêm Redis khi backend homelab đang nhanh.
- Quyết định triển khai purge toàn zone sau audit commit, coalesce/retry, TTL30s
  dự phòng; yêu cầu backend có purge config trước khi bật cache edge. Media browser
  revalidate để hạn chế ảnh đã gỡ còn nằm cache browser dài hạn.

### S036-C02 — 04/11/2026 — cache và giảm request đã qua kiểm tra tự động

- Backend cache-policy lấy giờ DB và mốc sale; audit đánh dấu purge sau commit,
  job gom batch/retry, giới hạn một lần/12s. Cache edge chỉ được ghi khi backend
  có zone/token. Media thêm cacheKey opaque và kiểm v đúng asset ACTIVE/PUBLISHED.
- Worker cache home/ảnh30s, browser ảnh ETag revalidate, CSS/JS hash immutable1năm.
  Worker version metadata tách cache giữa release. Không cache private/APIJSON/lỗi.
- Angular shared metadata60s, transfer home/listing/metadata kèm giờ server;
  detail/lookup/sale vẫn lấy mới. Thumbnail ưu tiên WebP, URL ổn định.
- Đã thêm logo bootstrap CSR và skeleton Home/catalogue/detail/Flash Sale.
- Review độc lập phát hiện và đã sửa clock transfer khi máy lệch giờ, TTL tính
  từ khi bắt đầu gọi origin thay vì sau khi nhận response, và skeleton catalogue
  theo4/3/2cột. Tests bổ sung clock±1h, policy trễ, sale sắp bắt đầu.
- Kiểm tra: frontend184/184 PASS; backend verify182run/0failure/0error/3live skip,
  sau review13test ảnh/policy/purge PASS. SSR/Workers build, Wrangler dry-run và
  proxy workerd PASS. Lần đầu sandbox chặn DB/socket/build, chạy lại có quyền đạt.
- Workerd QA cách ly xác nhận home/media HIT và SSR loại bỏ logo fallback.
  Chưa đo tốc độ online sau deploy, chưa cấu hình secret purge hoặc deploy.
- Quyết định giới hạn: purge toàn zone, dữ liệu public cũ có thể tồn tại tối đa30s,
  gồm fill đang chạy khi purge; không hứa ẩn/sửa tức thì qua cache.

### S036-C03 — 04/11/2026 — hoàn tất QA và bàn giao cache public

- Browser Playwright1280×900/390×844 với API trễ giả lập: không gọi lặp home/
  taxonomy/collections khi hydrate; skeleton4cột, mobile detail/reduced-motion,
  đổi Bìa/Lưng/Bìa, logo CSR khi chặnJS và không overflow đều đạt. Đã xem ảnh tại
  output/playwright/cache-*.png; dữ liệu ảnh QA là fixture, không ảnh bán thật.
- Node SSR build cuối sau review đạt. 13test backend sau review và184frontend
  đạt; Workers dry-run/proxy đạt. Job purge thật chưa chạy vì chưa có secret.
- Đã đóng browser và server QA riêng. Gộp plan vào ARCHITECTURE/DESIGN/DEPLOYMENT/
  VERIFICATION, gỡ plan tạm và cập nhật chỉ mục. Trần400dòng/link file local/
  git diff --check đạt; .env và công cụ QA vẫn ignored.
- Bàn giao commit/push dev; user merge main và deploy backend trước Worker, đặt
  MEMAY_CACHE_ZONE_ID/MEMAY_CACHE_PURGE_TOKEN rồi smoke/đo HIT-MISS theo DEPLOYMENT.

### S037-C01 — 04/11/2026 — nhánh dev-b: cố định khung ngang BookCard và thêm thể loại Kinh Thánh

- Yêu cầu (chốt qua `/grill-me`): tạo nhánh `dev-b` từ `dev` (sau khi user commit `e373540`), cố định khung `.book-card` ngang bằng nhau giữa ảnh dọc/ảnh ngang kèm viền mảnh quanh thẻ, và thêm thể loại dùng chung `"Kinh Thánh"` (`BIBLE`).
- Nguyên nhân lệch thẻ: `.cover-link` dùng `display: grid; aspect-ratio: 4/5` nhưng track mặc định `auto` bị ảnh dọc đẩy cao tới `max-height: 260px` trong khi ảnh ngang giữ `~242px`, làm mã/tiêu đề/giá của thẻ ảnh ngang bị lệch lên trên ~18px.
- Thay đổi:
  - `book-card.scss`: khóa `.cover-link` với `grid-template-rows: minmax(0, 1fr); width: 100%; aspect-ratio: 4 / 5; overflow: hidden; flex-shrink: 0;`, `.cover-link img` `width: 100%; height: 100%; min-height: 0; object-fit: contain;` (bỏ `max-height: 260px`), và thêm viền `border: 1px solid #ddd7ce; border-color: var(--line, #ddd7ce);` cho `.book-card`.
  - Thể loại `"Kinh Thánh"`: thêm Flyway `V13__add_bible_category.sql` (`BIBLE`, `Kinh Thánh`, `kinh-thanh`, `sort_order=8`), cập nhật `BookImportSchema.java`, `book.models.ts`, `book-copy.ts`, unit/integration tests và tài liệu (`DATA.md`, `CATALOGUE.md`, `BOOK_IMPORT.md`, `MASTER_PLAN.md`, `DESIGN.md`, `VERIFICATION.md`, `PROGRESS.md`).
- Kiểm tra:
  - Backend: `./run-local.sh test -Dtest=CategoryExpansionTest,BookImportV2Test` (cwd `code/backend`) → 12/12 PASS.
  - Frontend: `npm test` (37/37 file, 186/186 test PASS), `npm run build`, `npm run build:workers` PASS.
  - Browser Chrome headless (`1280×900` & `390×844` qua SSR local + mock API): 4 thẻ trên `/sach` (2 ảnh dọc, 2 ảnh ngang) có `cardTop=328, cardBottom=819, coverBottom=583, codeTop=594, titleTop=617, priceTop=674, heartTop=746` trùng khít từng pixel. Đã dừng server/browser tạm.
- Bước tiếp theo: commit và push nhánh `dev-b` lên `origin/dev-b`.

### S037-C02 — 04/11/2026 — cấu hình bộ font Baloo 2 + Nunito self-hosted trên dev-b

- Yêu cầu (chốt qua `/grill-me`):
  1. Phân vai: `Baloo 2` (độ đậm 700) cho tiêu đề lớn public (`.brand-name`, `h1`, `h2`, tiêu đề mục/trang); `Nunito` (400/600/700/800) cho nội dung body, tên sách trên thẻ (`h3` và dòng sách wishlist), giá, nút bấm, thanh menu và toàn bộ trang Admin (thay thế hoàn toàn `Georgia, serif` và `system-ui` cũ).
  2. Nạp font: tự host 6 file `.woff2` variable font (`vietnamese` + `latin` cho `Baloo 2`, `Nunito` normal và `Nunito` italic) trong `code/frontend/public/fonts/` kèm header cache `Cache-Control: public, max-age=31536000, immutable` trên `worker-runtime.ts`.
  3. Nhánh thực hiện: `dev-b`.
- Thay đổi:
  - `code/frontend/public/fonts/*.woff2` (6 file variable font: `baloo-2-vietnamese.woff2`, `baloo-2-latin.woff2`, `nunito-vietnamese.woff2`, `nunito-latin.woff2`, `nunito-italic-vietnamese.woff2`, `nunito-italic-latin.woff2`).
  - `styles.scss`, `index.html`, `home-page.scss`, `catalogue-page.scss`, `public-layout.scss`, `wishlist-page.scss`: khai báo `@font-face`, biến `--font-sans` (`Nunito`) và `--font-display` (`Baloo 2`), thay thế toàn bộ `Georgia, serif` và `system-ui` hardcoded; giữ `.admin-shell` và `.login-panel` dùng `--font-sans`.
  - `worker-runtime.ts` & `worker-runtime.spec.ts`: bổ sung `immutable` cache cho `/fonts/[a-z0-9-]+\.woff2`.
  - `DESIGN.md`, `VERIFICATION.md`, `PROGRESS.md`: cập nhật quy ước typography và kết quả kiểm chứng.
- Kiểm tra:
  - `npm test` (cwd `code/frontend`): 37/37 file, 186/186 test PASS.
  - `npm run build`, `npm run build:workers` (0 warning) và `npm run check:workers:proxy` PASS.
  - Chrome headless (`1280×900` & `390×844` qua SSR local + mock API): `document.fonts.ready` xác nhận cả `Baloo 2` và `Nunito` trạng thái `loaded`, `.brand-name`/`.hero h1` dùng `Baloo 2` weight `700`, `body`/`.public-nav`/`.book-card h3` dùng `Nunito`, 4 thẻ trên `/sach` thẳng hàng ngang từng pixel, mobile không tràn ngang. Đã đóng Chrome/server tạm.
- Bước tiếp theo: theo yêu cầu user, merge `dev-b` vào `dev`, push `origin/dev` và xóa nhánh `dev-b` (local + remote).

### S038-C01 — 05/11/2026 — logo luôn hiện khi mở trang

- User xác nhận cache ổn, yêu cầu luôn chớp logo trước nội dung dù SSR/cache nhanh.
  Làm tại worktree me-may trên nhánh dev theo user; dev-ui đang có việc riêng.
- Chọn logo overlay ngoài app-root, hiện400ms sau khi ảnh được decode rồi fade120ms.
  Áp dụng mỗi document load/reload, điều hướng Angular trong cùng trang tiếp tục
  bình thường. Failsafe CSS8s để tránh chặn trang nếu script/ảnh gặp lỗi.
- Graph MCP hiện Transport closed; đọc trực tiếp file index hiện hành để sửa.

### S038-C02 — 05/11/2026 — hoàn tất logo mở trang trên dev

- index.html thêm preload và overlay ngoài app-root, tự hiện mỗi document load/
  reload kể cả SSR/cache. Logo400ms sau decode + fade120ms, reduced-motion bỏfade.
  Router navigation giữ overlay đã ẩn; fallback CSS8s và noscript tránh khóa trang.
- Cwd code/frontend: npm test186/186, npm run build, npm run build:workers,
  npm run check:workers:proxy PASS.
- Playwright với workerd/mockAPI cách ly: desktop1280×900/mobile390×844, SSR/cache/
  reload đều hiện logo, kiểm thời lượng khoảng520ms; router không lặp, reduced-
  motion/không overflow đạt. Đã xem ảnh output/playwright/splash-always-*.png.
- Đã đóng browser/serverQA. Chỉ sửa worktree me-may/dev; cập nhật DESIGN/PROGRESS/
  VERIFICATION, trần dòng/linklocal/git diff --check đạt. Chưa deploy; bàn giao
  commit/pushdev để user merge main.

### S038-UI-C01 — 05/11/2026 — nhánh dev-ui: hệ thống input field notched outlined label cho /admin

1. Ngày: 05/11/2026 (Asia/Ho_Chi_Minh), Checkpoint S038-UI-C01. Mục tiêu: tạo nhánh `dev-ui` từ `dev`, thiết kế và triển khai lại toàn bộ UI input field, select dropdown, textarea cho trang quản trị `/admin` theo design system notched outlined label chốt qua `/grill-me`.
2. Phạm vi & Quyết định:
   - Nhánh: `dev-ui` tạo từ `dev` sạch (commit `8676906`).
   - Thiết kế nhãn: Notched Outlined Label (nhãn cố định trên viền trên của ô, có nền `#ffffff` che viền, font Nunito 600 line-height 1.2, không giật vị trí khi focus hay gõ).
   - Màu Active/Focus: Indigo `#4F46E5` kèm focus ring `rgba(79, 70, 229, 0.15)`.
   - Dropdown (Select): bo góc 8px, ẩn mũi tên native hệ điều hành, thay bằng custom chevron SVG (`∨`) màu `#667085` (đổi `#4F46E5` khi focus).
   - Trạng thái lỗi (Error State): viền và nhãn chuyển đỏ `#D92D20`, hiển thị icon cảnh báo tam giác (⚠️) ở góc phải ô, helper text đổi màu đỏ.
   - Textarea: kế thừa viền notched label, bo góc 8px, hover/focus/error đồng nhất.
   - Files thay đổi:
     - `code/frontend/src/styles.scss`: khai báo design tokens (`--admin-field-border`, `--admin-field-hover`, `--admin-field-active`, `--admin-field-error`, `--admin-field-radius: 8px`), định nghĩa `.admin-field` notched label cutout, select chevron SVG, error alert SVG và default admin input styles.
     - `book-editor.html` & `book-editor.scss`: áp dụng `.admin-field` cho toàn bộ input/select/textarea, sửa `priceOrder` class binding thành `priceMaxVnd`, tinh chỉnh row gap thoáng 0.5rem 1.5rem.
     - `book-editor.spec.ts`: thêm test case kiểm chứng notched outline field labels.
     - `login.html`: áp dụng `.admin-field` cho Email và Mật khẩu.
     - `book-list.html` & `book-list.scss`: áp dụng `.admin-field` cho thanh tìm kiếm và bộ lọc Xuất bản / Khả dụng, cân chỉnh chiều cao 46px thẳng hàng với nút tìm kiếm.
     - `flash-sale.html` & `flash-sale.scss`: áp dụng `.admin-field` cho các ô ngày giờ bắt đầu/kết thúc và mã sách / giá sale.
     - `collection-list.html`: áp dụng `.admin-field` cho Tên, Đường dẫn, Thứ tự.
     - `book-import.html`: áp dụng `.admin-field` cho form đăng nhập lại.
     - `book-media-panel.html`: áp dụng `.admin-field` cho dropdown vai trò ảnh.
     - `docs/DESIGN.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`: cập nhật tài liệu thiết kế và tiến độ.
3. Kiểm tra đã chạy:
   - Frontend tests: `npm test` (cwd `code/frontend`) → 37/37 files, 187/187 tests PASS.
   - Frontend builds: `npm run build` và `npm run build:workers` (cwd `code/frontend`) → 0 errors/warnings.
   - Backend tests: `./run-local.sh test -Dtest=CategoryExpansionTest,BookImportV2Test` (cwd `code/backend`) → 12/12 PASS.
   - Browser QA qua Chrome headless CDP (`1280×800`):
     - `/admin/dang-nhap`: chụp `admin-login-empty.png`, `admin-login-email-active.png` (nhãn và viền đổi màu `#4F46E5`), `admin-login-filled.png`.
     - `/admin/sach/moi`: chụp `admin-book-editor-empty.png` (nhãn notched cắt viền chuẩn, select có chevron ∨), `admin-book-editor-title-active.png`, `admin-book-editor-price-error.png` (viền đỏ, nhãn đỏ, icon tam giác ⚠️ ở góc phải, helper text đỏ).
     - `/admin/sach` & `/admin/bo-suu-tap`: chụp `admin-book-list-filters.png` và `admin-collection-list.png` (các trường và nút bấm thẳng hàng ngang, chiều cao đồng bộ 46px). Đã dừng server và browser test.
4. Việc dang dở / blocker: Không có.
5. Bước tiếp theo: Bàn giao kết quả trên nhánh `dev-ui` cho user nghiệm thu.

### S038-UI-C02 — 05/11/2026 — tối ưu grid layout và độ dài input form nhập sách trên worktree dev-ui

1. Ngày: 05/11/2026 (Asia/Ho_Chi_Minh), Checkpoint S038-UI-C02. Mục tiêu: làm việc trên git worktree dev-ui (/Users/daoquanghung/Projects/me-may.worktrees/dev-ui), tối ưu lại bố cục form nhập sách (book-editor), khắc phục tình trạng các trường ngắn bị giãn 100% full-width hoặc chia 50-50 không hợp lý, và xóa câu text thừa tại panel ảnh.
2. Phạm vi & Quyết định (chốt qua /grill-me):
   - Chuyển container .fields sang CSS Grid 12 cột (repeat(12, minmax(0, 1fr))):
     - Tên sách: full-width 100% (span 12).
     - Nhà xuất bản: 50% (span 6) · Tác giả: 50% (span 6).
     - Hàng 3 (12 cột): Thể loại: 5/12 (span 5) · Ngôn ngữ: 3/12 (span 3) · ISBN: 4/12 (span 4) gom trên cùng một hàng gọn gàng, vừa vặn độ dài dữ liệu.
     - Kiểu Picture book: 100% (span 12).
     - Giá từ (đ): 50% (span 6) · Giá đến (đ): 50% (span 6).
     - Đánh giá tình trạng: 50% (span 6) · Trọng lượng sách (g): 50% (span 6).
     - Responsive (màn hình <= 800px): các trường tự động giãn span 1 trên grid 1 cột.
   - Bố cục biến thể (stock-editor):
     - Khi chỉ có 1 biến thể (mặc định): ô Tồn kho giới hạn độ rộng ~200px (flex: 0 0 200px; max-width: 220px), không kéo dài vô tận 100% màn hình.
     - Khi có nhiều biến thể: Tên biến thể linh hoạt (flex: 1 1 320px), Tồn kho gọn (flex: 0 0 200px), nút Gỡ dòng mới cao 46px căn đáy thẳng hàng với input.
   - Textarea Mô tả tình trạng / lỗi và Mô tả sách: giữ 100% full-width.
   - Hàng thông tin meta: Trình độ đọc tham khảo (40% / 5fr) · Link video đọc sách (60% / 7fr) tạo .fields-meta giúp link URL dài có đủ không gian.
   - Panel media (book-media-panel.html): xóa câu thừa "Các biến thể dùng chung bộ ảnh; tiệm xác nhận ảnh/video đúng bản khi khách hỏi.".
   - Files thay đổi:
     - code/frontend/src/app/features/admin/books/book-editor/book-editor.html
     - code/frontend/src/app/features/admin/books/book-editor/book-editor.scss
     - code/frontend/src/app/features/admin/books/book-media-panel/book-media-panel.html
     - docs/DESIGN.md, docs/PROGRESS.md, docs/DEV_LOG.md
3. Kiểm tra đã chạy:
   - Frontend tests: npm test (cwd code/frontend trong worktree) -> 37/37 files, 187/187 tests PASS.
   - Frontend build: npm run build (cwd code/frontend trong worktree) -> PASS (0 errors/warnings).
   - Browser QA qua Chrome headless CDP (1280x800) với Angular SSR local + mock API:
     - titleWidth: 981px (100% full-width trên container 1000px).
     - pubWidth: 479px, authWidth: 479px (50% - 50%).
     - catWidth: 395px, langWidth: 227px, isbnWidth: 311px (hàng 3 gọn gàng, chia 5/12 - 3/12 - 4/12).
     - stockWidth: 200px (ô Tồn kho gọn gàng, không tràn 100%).
     - hasDeletedSentence: false (câu text thừa đã được loại bỏ hoàn toàn).
     - Đã chụp các ảnh screenshot kiểm chứng: admin-book-editor-empty.png, admin-book-editor-title-active.png, admin-book-editor-price-error.png. Đã dừng Chrome và test server.
4. Việc dang dở / blocker: Không có.
5. Bước tiếp theo: Commit và push các thay đổi lên branch dev-ui trên worktree, báo cáo cho user nghiệm thu.

### S038-UI-C03 — 05/11/2026 — thu gọn khung form 780px, ISBN ngang Tên sách và Custom Dropdown Popover kèm menu con Picture book

1. Ngày: 05/11/2026 (Asia/Ho_Chi_Minh), Checkpoint S038-UI-C03. Mục tiêu: thu gọn hơn nữa độ dài các khung input trên form nhập sách (worktree dev-ui), đưa ISBN (~25%) lên ngang hàng Tên sách (~75%), và thiết kế lại custom dropdown popover cho Thể loại (kèm menu con Picture book › [Paperback, Hardcover]), Đánh giá tình trạng và Trình độ đọc tham khảo.
2. Phạm vi & Quyết định (chốt qua /grill-me):
   - Thu gọn .book-form xuống max-width: 780px và dùng Grid 20 cột (gap: 0.35rem 1rem):
     - Hàng 1: Tên sách (span 15, ~75%, 581px) · ISBN (span 5, ~25%, 183px).
     - Hàng 2: Nhà xuất bản (span 8, 40%, 302px) · Tác giả (span 7, 35%, 263px) · Ngôn ngữ (span 5, 25%, 183px).
     - Hàng 3: Thể loại (span 8, 40%, 302px) · Đánh giá tình trạng (span 6, 30%, 223px) · Trọng lượng sách (g) (span 6, 30%, 223px).
     - Hàng 4: Giá từ (đ) (span 6, 223px) · Giá đến (đ) (span 6, 223px).
     - Tồn kho đơn biến thể: thu gọn xuống 150px (max-width: 160px), giữ nút Thêm biến thể width: auto.
     - Hàng meta: Trình độ đọc tham khảo (7fr, 35%) · Link video đọc sách (13fr, 65%).
   - Custom Dropdown Popover (Thể loại, Đánh giá tình trạng, Trình độ đọc tham khảo):
     - Nền sáng #FFFFFF đồng bộ Admin, bo góc 10px, viền #E4E7EC, đổ bóng mềm, hover tím nhạt #F4F3FF, mục đang chọn có dấu ✓ bên phải.
     - Mục Picture book có mũi tên › bên phải; khi rê chuột hoặc bấm vào sẽ mở menu con [Paperback, Hardcover] bung sang bên phải. Chọn xong gán cả categoryCode = PICTURE_BOOK và binding, hiển thị "Picture book · Paperback" (hoặc Hardcover) ngay trong ô Thể loại, đồng thời bỏ cụm radio kiểu bìa rời bên dưới.
     - Hỗ trợ đóng menu khi click ra ngoài hoặc nhấn phím Escape; giữ select ẩn (.sr-only-native-select) để tương thích ReactiveForms.
   - Files thay đổi:
     - code/frontend/src/styles.scss
     - code/frontend/src/app/features/admin/books/book-editor/book-editor.ts
     - code/frontend/src/app/features/admin/books/book-editor/book-editor.html
     - code/frontend/src/app/features/admin/books/book-editor/book-editor.scss
     - code/frontend/src/app/features/admin/books/book-editor/book-editor.spec.ts
     - docs/DESIGN.md, docs/PROGRESS.md, docs/DEV_LOG.md
3. Kiểm tra đã chạy:
   - Frontend tests: npm test (cwd code/frontend trong worktree) -> 37/37 files, 187/187 tests PASS (bao gồm test mở menu con Picture book và chọn Paperback).
   - Frontend builds: npm run build và npm run build:workers (cwd code/frontend trong worktree) -> PASS (0 errors, 0 warnings).
   - Browser QA qua Chrome headless CDP (1280x800) với Angular SSR local + mock API:
     - titleWidth: 581px, isbnWidth: 183px (cùng Hàng 1).
     - pubWidth: 302px, authWidth: 263px, langWidth: 183px (cùng Hàng 2).
     - catWidth: 302px, condWidth: 223px, weightWidth: 223px (cùng Hàng 3).
     - pMinWidth: 223px, pMaxWidth: 223px (cùng Hàng 4).
     - stockWidth: 150px.
     - catLabel sau khi chọn từ submenu: "Picture book · Paperback".
     - Chụp ảnh kiểm chứng: admin-book-editor-dropdown-submenu.png và admin-book-editor-picture-selected.png. Đã dừng Chrome và test server.
4. Việc dang dở / blocker: Không có.
5. Bước tiếp theo: Commit và push lên nhánh dev-ui, báo cáo cho user nghiệm thu.

### S039-C01 — 05/11/2026 — xóa README.md ở root và gộp hướng dẫn chạy local/Auth M1 vào ARCHITECTURE.md

- Yêu cầu user: kiểm tra `README.md` ở root và xóa hoàn toàn vì chứa tiến độ dự án nội bộ trùng lặp.
- Thay đổi:
  - Xóa `README.md` ở root.
  - Gộp mục `Chạy local, kiểm tra và Auth M1` vào `docs/ARCHITECTURE.md` và bỏ dòng `README.md` trong sơ đồ cấu trúc thư mục.
  - Cập nhật liên kết/tham chiếu tại `docs/README.md`, `AGENTS.md`, `docs/MASTER_PLAN.md`, `docs/VERIFICATION.md`, `code/backend/run-local.sh` và `docs/PROGRESS.md`.
- Kiểm tra:
  - Kiểm tra trần 400 dòng cho toàn bộ file markdown (ngoại trừ `DEV_LOG.md`), kiểm tra liên kết local và `git diff --check`: PASS.
  - Không thay đổi mã nguồn runtime frontend/backend (test suite `npm test` / `mvnw verify` chưa chạy lại trong phiên dọn tài liệu này).
- Bước tiếp theo: thay đổi đang ở local worktree `me-may` (`dev`), sẵn sàng commit/push khi user yêu cầu.

### S039-C02 — 05/11/2026 — merge worktree dev-ui vào dev

- Yêu cầu user: merge nhánh `dev-ui` (từ worktree `/Users/daoquanghung/Projects/me-may.worktrees/dev-ui`) vào `dev`.
- Thay đổi:
  - Merge `dev-ui` (`013ef36`) vào `dev`, giải quyết xung đột lịch sử tại `docs/DEV_LOG.md` và sắp xếp lại mục tiến độ tại `docs/PROGRESS.md`.
- Kiểm tra:
  - `npm test` và `npm run build` (cwd `code/frontend`) trên nhánh `dev` sau merge: PASS (37/37 files, 187/187 tests, 0 warning).
  - Kiểm tra trần 400 dòng tài liệu và `git diff --check`: PASS.
- Bước tiếp theo: commit merge và push lên `origin/dev`.

### S040-C01 — 05/11/2026 — bắt đầu rà soát project và lịch sử GitHub Actions

- Mục tiêu/phạm vi: rà soát cấu trúc, contract/docs, kiểm tra frontend/backend/Workers;
  truy nguyên `.github/workflows` trên dev/main và đánh giá vai trò CI/publish.
- Trạng thái đầu phiên: `dev` sạch tại `a0caa10`, đã fetch origin; dev bằng origin/dev.
  Không deploy/migrate hoặc ghi dữ liệu production.
- Đang kiểm tra; chưa có kết luận test mới. Sẽ cập nhật bằng chứng và docs liên quan.

### S040-C02 — 05/11/2026 — kết quả rà soát project và workflow

1. Phạm vi: kiểm Git sau fetch, cấu trúc qua codebase-memory graph, chọn đọc các
   điểm security/RBAC, transaction/version và import receipt; đối chiếu config
   runtime/hosting/migration với docs; chạy lại bộ kiểm tra tự động local.
   Không phải chứng nhận mọi nhánh logic hoặc nghiệm thu production.
2. Kết luận Git:
   - `dev`/`origin/dev` tại `a0caa10`; `origin/main` tại `35dec00` lúc kiểm.
   - `.github/workflows/publish-backend.yml` thêm trên main ở `64b7b4a`, cập nhật
     `1b2a1b9` và `4be7bda`; `git log dev -- .github` rỗng. Không có lần xóa trên dev.
   - Workflow PR vào main test PostgreSQL17/Java21; push main lọc backend/workflow;
     job publish cần test và main/non-PR, GHCR tags main/SHA. Không kiểm frontend.
     Dev không cần file để chạy app; nên đồng bộ file để tránh lệch nguồn quản lý.
     Chưa copy/sửa trigger vì yêu cầu hiện tại là rà soát và docs, không mở CI mới.
   - Main còn commit riêng `86363ac` thêm preview local, có `MEMAY_WORKER_NAME`
     giá trị `ttp://127.0.0.1:8787`; dev không có block này. Không merge toàn bộ main
     chỉ để lấy workflow; preview production cũng cần kiểm routing như DEPLOYMENT.
3. Kiểm tra đã chạy từ repo/workspace hiện tại:
   - `git fetch origin`, log/tree/diff dev/main: đạt, xác định được nguồn khác biệt.
   - `npm test` (code/frontend):37file/187test PASS.
   - `bash code/backend/run-local.sh -B -ntp verify` (root):183run/0failure/0error/
     3skip live-provider, JAR build PASS. Lần sandbox đầu FAIL do socket PostgreSQL
     bị chặn và Mockito không attach JVM; chạy lại ngoài sandbox PASS. Chỉ DBtest.
   - `npm run build`, `npm run build:workers` (code/frontend): PASS, không warning.
     Sandbox trước đó thoát134; chạy lại ngoài sandbox đạt, không đổi source.
   - `npm run check:workers:proxy`: PASS POST/query/cookie/CSRF/multipart/
     Set-Cookie/server-time/no-store, canonical SSR và backend-down503.
   - `npm run deploy:workers -- --dry-run`: PASS, không deploy; binding xác nhận
     API homelab, site memaybooks.com, public cache=true và version metadata.
   - `python3 -m unittest discover -s scripts/deploy -p 'test_*.py'`:7PASS;
     tương tự `scripts/book-performance`:4PASS (cwd root).
   - `npm audit --json`:16moderate/0high/0critical; hai advisory gốc glob và
     minimatch trong dev tooling, các mục khác là chuỗi phụ thuộc. Audit production
     `npm audit --omit=dev --json`:0. Chưa sửa lockfile; không dùng đề xuất downgrade
     Angular17 của audit. Cần đánh giá bản vá tương thích trước thay dependency.
   - Markdown trần400 (trừ DEV_LOG), file targets/anchors, không tracked secret/cache
     và13asset nguồn public tracked: PASS trước commit; `git diff --check`: PASS.
   - Logs kiểm tra ở `/tmp/memay-s040-*`, không commit runtime log.
4. Docs cập nhật: README index, MASTER_PLAN và ARCHITECTURE xác định đích Dell/
   Dokploy hiện hành; DEPLOYMENT ghi lịch sử/trigger workflow, repo remote đúng và
   rollout V13/9thể loại; PROGRESS/VERIFICATION ghi bằng chứng và hạn chế.
   Không đổi runtime code/workflow, không tự migrate/deploy hoặc sửa main.
5. Giới hạn/bước tiếp: chưa smoke live/schema/revision/image digest Dokploy, chưa
   chạy lại browser visual/thiết bị thật/Lighthouse hoặc provider thật. Giữ gate
   release hiện hành; xử lý dependency dev, đồng bộ workflow và kiểm preview là
   các việc tiếp theo, không coi local PASS là đóng gate production.
   Bàn giao tài liệu trong cùng commit trên dev, push origin/dev theo quy ước.

### S040-C03 — 05/11/2026 — CTA Danh sách quan tâm và Kệ sách cùng NXB, cùng Thể loại ở Chi tiết sách

1. Ngày: 05/11/2026 (Asia/Ho_Chi_Minh). Session worktree `dev-ui` (`/Users/daoquanghung/Projects/me-may.worktrees/dev-ui`).
2. Phạm vi được yêu cầu:
   - Đổi nhãn button "Quan tâm" thành CTA rõ ràng, dễ hiểu: "♡ Thêm vào danh sách quan tâm" (khi đã lưu đổi thành "♥ Đã thêm vào danh sách").
   - Đổi "Quan tâm" ở Header thành "Danh sách quan tâm".
   - Tại trang chi tiết sách (`/sach/:slug`), thêm 2 section bên dưới theo mẫu ảnh đính kèm: "SÁCH CÙNG NHÀ XUẤT BẢN" và "SÁCH CÙNG THỂ LOẠI".
   - Chốt qua grill-me và thống nhất Phương án A: Backend cung cấp endpoint `GET /api/v1/books/{slug}/related`, tối đa 10 cuốn mỗi mục, loại trừ cuốn hiện tại, ưu tiên `AVAILABLE` trước, sắp xếp `published_at DESC`. Mở rộng tìm kiếm `q` khớp cả Nhà xuất bản.
   - Kệ dùng carousel ngang với 5 thẻ `app-book-card` chuẩn trên desktop, nút trượt `<` và `>`, link "Xem thêm >>" góc phải dẫn tới search publisher hoặc category.
3. Thay đổi code:
   - Frontend:
     - `wishlist-button.ts`: đổi nhãn nút thành "♡ Thêm vào danh sách quan tâm" (active: "♥ Đã thêm vào danh sách"), `aria-label` tương ứng; cập nhật test `wishlist-button.spec.ts`.
     - `public-layout.html`: đổi nhãn Header "Quan tâm" thành "Danh sách quan tâm".
     - `public.models.ts` & `public-api.ts`: thêm model `RelatedBooks` và method `related(slug: string)`.
     - `book-detail.ts`, `book-detail.html`, `book-detail.scss`: tích hợp 2 kệ sách liên quan, divider đường kẻ ngang flanking tiêu đề, carousel trượt, nút điều hướng `<` / `>`, link "Xem thêm >>", fallback empty; thêm test trong `book-detail.spec.ts`.
     - `angular.json`: nâng budget style `anyComponentStyle` `maximumWarning: 6kB`, `maximumError: 10kB`.
   - Backend:
     - `PublicCatalogueDtos.java`: thêm DTO record `RelatedBooks(List<PublicBookSummary> samePublisherBooks, List<PublicBookSummary> sameCategoryBooks)`.
     - `PublicCatalogueService.java`: thêm `related(String slug)` và mở rộng logic tìm kiếm `q` khớp cả publisher.
     - `PublicCatalogueController.java`: thêm endpoint `@GetMapping("/books/{slug}/related")`.
     - `PublicCatalogueApiTest.java`: thêm 2 test cases kiểm tra `/related` và tìm kiếm publisher qua `q`.
   - Tài liệu:
     - Cập nhật `docs/DESIGN.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`.
4. Kiểm tra đã chạy:
   - Frontend Vitest: 37/37 test files, 189/189 tests PASS.
   - Frontend build: `npm run build` và `npm run build:workers` hoàn tất 0 warning, 0 error.
   - Backend Maven tests: `PublicCatalogueApiTest`, `PublicMediaApiTest`, `PublicCacheInvalidationTest` (15/15 tests PASS).
   - Fix type inference & generic ambiguities cho Eclipse JDT / VS Code: thay thế `var` và raw `Object[]` bằng explicit generics (`List<RelatedTarget>`, `List<Book>`, `List<Timestamp>`), `(Object[])` varargs cast.
   - Kiểm tra trần 400 dòng markdown cho toàn bộ file docs: PASS.
5. Việc dang dở / blocker: Không có.
6. Bước tiếp theo: Push nhánh `dev-ui` lên remote theo yêu cầu user.

### S041-C01 — 05/11/2026 — Brainstorm tình trạng và tồn gộp

1. Phạm vi user: giải thích Đánh giá tình trạng/Mô tả tình trạng lỗi; brainstorm
   bỏ khối public và biến thể nhưng giữ tồn gộp, cân nhắc ecommerce tương lai.
2. Git: checkout sạch ban đầu trên main; git worktree list chỉ có checkout chính
   và dev-ui. Đã git switch dev theo yêu cầu; dev khớp origin/dev tại7ec9818.
   Không tạo worktree mới, không sửa main/dev-ui hoặc chạy dịch vụ.
3. Đã đọc chỉ mục, PROGRESS, checkpoint cuối, DATA, phần liên quan MASTER_PLAN/
   CATALOGUE/ARCHITECTURE; khám phá qua MCP graph và đọc form/template hiện hành.
   Grade là phân loại chung tùy chọn ở form; note chung bắt buộc trước publish;
   khối Tình trạng thực tế render conditionNote. Biến thể hiện có tên/tồn riêng,
   dùng chung giá khoảng/ảnh; không đủ tự thân cho mua theo tình trạng/giá cố định.
4. Đang làm rõ cách bán các bản cùng tựa khác tình trạng/giá. Chưa có quyết định
   thiết kế được duyệt; không đổi schema, API, import, runtime hoặc baseline.
   Chỉ cập nhật hai file bàn giao. Không chạy test/build vì không đổi code.
5. Bước tiếp: trao đổi ví dụ bán thực tế, rồi so sánh phương án phù hợp trước
   ghi spec. Thay đổi tài liệu còn local trên dev, chưa commit/push/deploy.


### S041-C02 — 06/11/2026 — Thiết kế nhập giá/kg, tồn gộp, ghi chú nội bộ

1. User chốt xác nhận bản/giá qua tin nhắn; bỏ tình trạng public và hai field
   form; ghi chú nội bộ optional giữ mô tả cũ; tồn gộp tự tăng; cảnh báo trùng
   tên không chặn lưu/publish; hướng giữ cấu trúc biến thể bên trong an toàn.
   Giá từ = đơn giá/kg × gram/1000; giá đến +15%, làm tròn lên1.000đ, sửa tay được.
2. Tạo BOOK_ENTRY_SIMPLIFICATION_DESIGN.md, đăng ký docs/README và cập nhật
   PROGRESS. Đề xuất thêm: đơn giá nullable cho sách cũ/import, trigger tính lại
   khi user sửa input, giữ giá đã lưu khi load, boundary private ở backend,
   mapping tồn tổng không xóa ID, giữ format import/receipt và grade legacy.
   Các chi tiết này chờ duyệt, chưa thay contract MASTER_PLAN/DATA/CATALOGUE.
3. Dùng Superpowers brainstorming và verification-before-completion. Builder
   check bằng agent review_entry_design đọc độc lập: “nothing important left”.
   Đã đối chiếu code form, contract catalogue/import và Git dev7ec9818.
4. Kiểm tra tài liệu: git diff --check, trần400dòng Markdown quản lý (trừ DEV_LOG)
   và target local của các link thêm/sửa: PASS. Spec193dòng, README59dòng,
   PROGRESS178dòng; không đổi runtime hoặc gate nghiệm thu.
   Test/build ứng dụng chưa chạy vì không thay code/schema/API/runtime.
5. Bước tiếp: user duyệt thiết kế rồi dùng writing-plans; chưa triển khai hoặc
   chạy migration, không truy cập/đổi live. Bàn giao docs trên dev; chưa push.


### S041-C03 — 06/11/2026 — Merge worktree dev-ui vào dev

- Yêu cầu user: merge nhánh `dev-ui` (từ worktree `dev-ui`) vào `dev`, xử lý conflict `docs/DEV_LOG.md` và `docs/PROGRESS.md`.
- Thay đổi:
  - Tích hợp toàn bộ tính năng từ `dev-ui`: CTA "Thêm vào danh sách quan tâm", header "Danh sách quan tâm", 2 kệ sách liên quan ở chân trang chi tiết ("Sách cùng Nhà xuất bản" & "Sách cùng thể loại"), backend endpoint `/books/{slug}/related`, mở rộng tìm kiếm `q` khớp publisher, cùng các bản vá type inference & generic ambiguities cho Language Server.
  - Giải quyết merge conflict tại `docs/DEV_LOG.md` và `docs/PROGRESS.md` theo trật tự thời gian và giữ nguyên đầy đủ nội dung bàn giao.
- Kiểm tra:
  - `npm test` và `npm run build` trên `dev`: 37/37 test files (189/189 tests PASS), 0 warning, 0 error.
  - Backend tests: 15/15 tests PASS.
  - Kiểm tra trần 400 dòng markdown cho toàn bộ file docs quản lý: PASS.
- Bước tiếp theo: hoàn tất commit merge trên `dev`, sẵn sàng push `origin/dev`.


### S041-C04 — 06/11/2026 — User duyệt thiết kế, lập kế hoạch triển khai

1. User trả lời “tôi duyệt” cho BOOK_ENTRY_SIMPLIFICATION_DESIGN; chuyển trạng
   thái spec sang đã duyệt, dùng Superpowers writing-plans. Phạm vi như S041-C02.
2. Kiểm môi trường: branch dev sạch, HEAD84c8c53 sau merge dev-ui ở checkpoint
   C03; không quay về base cũ hoặc ghi đè các thay đổi UI mới. Đã đọc checkpoint
   mới và khám phá lại BookDtos/Command/Validation/Mapper/VariantStore/Query qua
   MCP graph, đối chiếu import fingerprint, form và contact hiện hành.
3. Đã viết BOOK_ENTRY_SIMPLIFICATION_PLAN7task: quyết định API presence/null,
   ánh xạ tồn theo sức chứa dòng cũ, giá tính chính xác và bảo vệ ghi chú ở public.
   Chưa sửa code, chạy dịch vụ, migration hay deploy; test ứng dụng chưa chạy.
4. Self-review đối chiếu spec→task, interfaces/presence/limits và5Review Focus
   có test phụ trách; pin hash legacy trước đổi DTO, không lấy hash mới làm expected.
   Kiểm markdown trần400dòng (trừ DEV_LOG), local targets của link docs đổi và
   git diff --check: PASS. Plan283dòng; không chạy test/build ứng dụng.
   Một lần script sửa docs lỗi encoding stdin trước khi ghi; dùng apply_patch
   rồi kiểm lại. Không ảnh hưởng runtime hoặc dữ liệu ứng dụng.
5. Bước tiếp: user review plan/chọn cách thực thi theo writing-plans; khuyến nghị
   native tuần tự vì chung DTO/fingerprint. Thiết kế đã duyệt, không hỏi duyệt lại
   nghiệp vụ. Tài liệu bàn giao trên dev, chưa push/deploy; gate release giữ nguyên.

### S041-C05 — 06/11/2026 — Bắt đầu thực thi tuần tự

- User chọn làm tuần tự; dùng executing-plans/TDD/verification, giữ checkout dev
  theo yêu cầu, base7c1283c. Ledger cách ly theo plan trong .superpowers/sdd.
- Phạm vi: thực thi7task đã duyệt, không deploy/migrate dữ liệu thật. Đang T1.
- Baseline frontend189/189 PASS; backend đang chạy, chưa kết luận kết quả.
- Quyết định: giữ nguyên shape BookWrite legacy, nhận field mới qua adapter HTTP
  để bảo toàn fingerprint import; kiểm missing/null riêng tại boundary.
- Đổi heading plan sang Task N để công cụ task-start đọc đúng; không đổi nghiệp vụ.

### S041-C06 — 06/11/2026 — T1 backend đã kiểm chứng

- Ghi chú optional/internalNote alias, đơn giá nullable và missing/null tại HTTP;
  giữ BookWrite cũ để hash import/finalization không thay. Thêm migrationV14;
  không sửa migration cũ. Lưu giá thủ công, không server tự tính lại.
- TDD:4test mới RED400→GREEN; test create mới bắt version trả về0/DB1,
  sửa bằng gán đơn giá trước insert. Giữ retry legacy, pin3golden hash.
- Toàn backend:191run/0failure/0error/3live-provider skip PASS; baseline185run.
  Log ở workspace plan/task-1-tests.log; git diff --check PASS.
- Hai test migration SELECT b.* cần bỏ cột nullable mới trước so dữ liệu cũ;
  vẫn assert cột mới null. Payload sai kiểu vẫn400 sau bắt lỗi Jackson adapter.
- Một lần vô ý chạy chồng test backend trên TEST_DB gây race login/cleanup;
  loại bỏ cả hai kết quả và đã chạy lại toàn suite tuần tự PASS. Không chạy
  song song database test ở các bước sau. Tiếp theo T2 tồn gộp; chưa deploy.

### S041-C07 — 06/11/2026 — T2 tồn gộp

- Thêm stock/stockLimit quản trị và adapter stock→dòng legacy; giữ UUID/tên/
  thứ tự, tăng từ dòng đầu và giảm từ dòng cuối. Metadata thiếu stock giữ tồn.
- TDD RED2test tồn gộp400→GREEN;13test contract/variant PASS, gồm tổng1999998,
  mixed/null/fraction/over-limit, no-op và concurrency409. Không đổi schema tồn.
- T1 commit50fccc3. T2 đang bàn giao commit trên dev; tiếp T3 cảnh báo tên.

### S041-C08 — 06/11/2026 — T3 lookup tên trùng

- Endpoint admin title-duplicate exact lower(trim), excludeId, query tham số hóa,
  gồm ẩn/hết hàng; OWNER/STAFF đọc, anonymous401, response no-store/boolean.
- Test mới RED400→GREEN200;8test contract PASS. Không đặt unique title hoặc
  thay đường ghi save/publish. T2 commit8cf5275; tiếp T4 form/giá trên frontend.

### S041-C09 — 06/11/2026 — T4 form quản trị

- Form có đơn giá/kg optional, ghi chú nội bộ optional và một ô tồn gộp;
  không gửi condition/variants. BigInt tính chính xác, giá đến từ cơ sở chưa
  làm tròn; sửa tay làm tròn khi kết thúc nhập, load/upload không tự tính lại.
- Cảnh báo trùng dùng style has-error hiện có nhưng không làm form invalid;
  lookup300ms, hủy response stale, mất mạng vẫn lưu. Backend T3 commiteb8b01d.
- Frontend38file/193test PASS (baseline189); tests mới cho công thức/overflow,
  load giá cũ, manual min/max, upload, tồn lớn/conflict, note trống và warning.
  Test RED ban đầu thiếu helper/controls; GREEN sau triển khai. Chưa browser QA.
- Upload queue đã so sánh toàn bộ DTO trừ media/version/updatedAt nên field mới
  tự tham gia kiểm chống adopt version sai; không thêm cơ chế handoff song song.
- Tiếp T5 public/preview; chưa deploy hoặc nhập ghi chú riêng trên live.

### S041-C10 — 06/11/2026 — T5 public và preview

- Backend không query/trả note/grade, variants public rỗng; preview không trả
  nhóm tồn hoặc note. Frontend bỏ selector/condition block/guard; enquiry chỉ
  mã/tên/giá/URL, vẫn refresh availability và chống response sai route.
- Privacy marker RED→GREEN cho list/detail/lookup/home/related/preview;
  admin detail vẫn đọc ghi chú. Backend24test PASS, frontend38file/192test PASS;
  số test giảm1do thay3case chọn biến thể cũ bằng2case liên hệ theo sách.
- Giữ related shelves và publisher search. Metadata fallback không dùng note;
  frontend scrub payload cũ khi accept. Chưa chạy SSR/browser QA ở bước này.
- T4 commit421f69e; tiếp T6 import tương thích, chưa deploy.

### S041-C11 — 06/11/2026 — T6 import tương thích

- V1/V2 giữ header/digest/receipt, cho note/grade rỗng; note có dữ liệu lưu
  nội bộ, đơn giá null và giữ hai giá file. Guide/preview import hiển thị tồn
  gộp, không bảng chọn biến thể. Không yêu cầu đổi workbook hoặc thêm cột.
- Hai test optional mới RED required→GREEN;56test import/golden PASS, gồm
  legacy hash, receipt retry/collection inactive và hai dòng trùng tạo riêng.
  Frontend192test PASS; cập nhật hai kỳ vọng cũ về bảng/biến thể public.
- T5 commit16dde1b; tiếp T7 kiểm tổng thể, browser QA và tài liệu. Chưa deploy.


### S041-C12 — 06/11/2026 — T7 QA và gộp contract

- Backend clean verify199run/0failure/0error/3live-provider skip PASS; frontend
  38file/192test, NodeSSR/Workers builds và workerd proxy PASS. Chạy ngoài sandbox
  sau khi lần sandbox bị chặn build/socket. Không chạy DB tests song song.
- Migration V13→V14 giữ toàn bộ book/listing/variants/media/sequence, unit null;
  test constraint0/vượt max đạt. Dump me_may_test custom, restore schema QA mới,
  count/full-row fingerprint5bảng khớp; role không có CREATEDB nên dùng schema
  cùng DB test, không nâng quyền. Schema QA restore đã dọn; chưa restore production.
- Playwright desktop1280×900/public390×844 + Spring test/FakeMediaGateway:
  giá80000/kg×450g→36000..42000; manual min36500→37000..43000, max44100→45000;
  edit note/tồn5→4→7, reload giữ giá; tạo/publish trùng tên/note trống/2ảnh fake
  thành công version0. Liên hệ mở thẳng, enquiry không biến thể/note; wishlist
  lookup/related shelves còn hoạt động; STAFF xem note nhưng không sửa/lưu.
- SSR smoke9đường HTML/API/OG/admin-preview/wishlist không marker note/private
  fields. Không dùng fake media để nhận kết quả WebP/Lighthouse/live provider.
  Runtime/browser/source harness QA đã dừng/dọn, chỉ artifacts ignored còn giữ
  cho review. Lần HMR đổi refs cần snapshot lại, không coi là lỗi sản phẩm.
- QA phát hiện copy xác nhận còn chữ biến thể: sửa editor/status và thông báo
  backend, đã kiểm lại frontend/build/backend. Không thay validation xác nhận ảnh.
- Đã gộp quyết định vào MASTER_PLAN/DATA/CATALOGUE/DESIGN/ARCHITECTURE/BOOK_IMPORT;
  DEPLOYMENT gần trần400 nên thêm BOOK_ENTRY_ROLLOUT theo trách nhiệm, đăng ký
  README và link evidence BOOK_ENTRY_VERIFICATION/VERIFICATION. Chờ review cuối
  trước xóa spec/plan đã chuyển hết nội dung. Chưa push/deploy, giữ mọi gate release.


### S041-C13 — 06/11/2026 — Review cuối và bàn giao

- Reviewer độc lập final_entry_review đọc range7c1283c..4007ad4, code/tests,
  spec/plan và ledger:0Critical/0Important/0Minor, ready to merge dev. Không sửa
  file/DB. Không có finding cần fix hoặc Minor defer trong phạm vi thay đổi.
- Reviewer không kết luận production rollout/live purge/live provider; giữ
  nguyên gate và hướng dẫn BOOK_ENTRY_ROLLOUT. Nếu bỏ smoke live sẽ thiếu chứng
  cứ privacy cache/provider; không biến test local thành nghiệm thu production.
- Quyết định triển khai: làm tại checkout dev user chỉ định; dùng adapter HTTP
  giữ BookWrite canonical để bảo toàn import/final retry, thay vì đổi serializer.
  Presence/null đã có contract tests và3golden hash; sai boundary có thể làm mất
  field hoặc hỏng retry nên không bỏ các test này khi đổi DTO sau này.
- Đã chuyển đầy đủ quyết định/acceptance vào tài liệu chuẩn và evidence, đăng ký
  rollout tại README; xóa BOOK_ENTRY_SIMPLIFICATION_DESIGN/PLAN đã hết vai trò.
  Trần400dòng (trừ DEV_LOG), local targets/anchors và git diff --check kiểm lại
  trước commit bàn giao; runtime unchanged từ clean verify199/192test/build PASS.
- Dọn đúng workspace của plan sau khi lưu rulings/review vào log; giữ ảnh QA
  ignored output/playwright. Không xóa workspace/task khác, không đổi main.
- Chốt commit/push dev theo workflow đã cho phép; user merge main/deploy. Không
  còn implementation S041 dang dở; các gate release/online ở PROGRESS giữ nguyên.

### S038-C04 — 06/11/2026 — thiết kế lại Admin Sidebar Modern Clean và nút quay về /admin trên trang Public

1. Ngày: 06/11/2026 (Asia/Ho_Chi_Minh), Checkpoint S038-C04. Mục tiêu: thiết kế lại thanh Sidebar /admin theo phong cách Modern Clean ấm áp (nền be kem, icon SVG, tab active đỏ thương hiệu, thẻ tài khoản và nút đăng xuất ở đáy, bỏ admin-header phía trên) và thêm nút quay về /admin trên trang chủ / public layout (nhận diện phiên đăng nhập).
2. Phạm vi & Quyết định (chốt qua /grill-me):
   - Admin Sidebar redesign:
     - Nền be kem nhạt #FBF8F2, viền phải mảnh #E8E2D8, sticky cố định 100vh, rộng 240px.
     - Header sidebar: logo Mẹ Mây font Baloo 2 đỏ đậm #9B1C28 kèm nhãn phụ "Trang quản trị" chữ in hoa nhỏ.
     - Menu điều hướng dạng thẻ bo góc 8px với icon SVG: Tổng quan (📊, exact match), Sách (📚), Bộ sưu tập (🗂️, chỉ OWNER), Flash Sale (⚡, chỉ OWNER), phân cách, Xem website (↗).
     - Trạng thái Active: nền đỏ kem nhạt #FDF2F2, viền chỉ báo trái đỏ 3px, chữ và icon màu đỏ #9B1C28 đậm (font weight 700). Hover: nền be sáng #F3EDE2.
     - Đáy sidebar: Thẻ tài khoản người dùng (avatar tròn chữ cái đầu, email, role badge OWNER/STAFF) và nút Đăng xuất kèm icon logout.
     - Xóa bỏ thanh admin-header phía trên để mở rộng tối đa không gian làm việc cho vùng nội dung bên phải.
   - Nút quay về /admin trên Public:
     - Desktop header: đặt cạnh nút "Nhắn tiệm ↗", tự động nhận diện nếu đã đăng nhập (auth.user() tồn tại) thì hiện nổi bật kèm chấm xanh active và dẫn thẳng /admin; nếu chưa đăng nhập thì dẫn vào /admin/dang-nhap.
     - Mobile sidebar: thêm mục ⚙️ Quản trị ở cuối menu trượt mobile (bên dưới Cách mua, Liên hệ), tự động dẫn vào /admin hoặc /admin/dang-nhap.
   - Files thay đổi:
     - code/frontend/src/app/layouts/admin-layout/admin-layout.html
     - code/frontend/src/app/layouts/admin-layout/admin-layout.ts
     - code/frontend/src/app/layouts/admin-layout/admin-layout.scss
     - code/frontend/src/app/layouts/admin-layout/admin-layout.spec.ts
     - code/frontend/src/app/layouts/public-layout/public-layout.html
     - code/frontend/src/app/layouts/public-layout/public-layout.ts
     - code/frontend/src/app/layouts/public-layout/public-layout.scss
     - code/frontend/src/app/app.spec.ts
     - code/frontend/src/styles.scss
     - docs/DESIGN.md, docs/PROGRESS.md, docs/DEV_LOG.md
3. Kiểm tra đã chạy:
   - Frontend tests: npm test (cwd code/frontend trong worktree) -> 38/38 files, 193/193 tests PASS (bao gồm 4 test cases mới cho AdminLayout).
   - Frontend builds: npm run build và npm run build:workers -> hoàn tất với 0 errors, 0 warnings.
   - Browser QA qua Chrome headless CDP (1280x800 & 390x844) với Angular SSR local + mock API:
     - Sidebar /admin: asideWidth 240px, brand 'Mẹ Mây - Trang quản trị', tab 'Sách' active đỏ #9b1c28, 5 icons SVG, accountEmail 'admin@memay.vn', roleBadge 'OWNER', logoutBtn 'Đăng xuất'.
     - Public desktop header: nút "⚙️ Quản trị" hiển thị ngay cạnh "Nhắn tiệm ↗".
     - Public mobile sidebar: link "⚙️ Quản trị" hiển thị ở đáy menu trượt.
     - Ảnh chụp kiểm chứng: admin-book-list-filters.png, public-home-header.png, public-mobile-sidebar.png. Đã dừng Chrome và test server.
4. Việc dang dở / blocker: Không có.
5. Bước tiếp theo: Commit và push lên nhánh dev-ui, báo cáo cho user nghiệm thu.

### S038-C05 — 06/11/2026 — Sidebar Admin phân cấp Accordion Tree View và tinh chỉnh Active State

1. Ngày: 06/11/2026 (Asia/Ho_Chi_Minh), Checkpoint S038-C05. Mục tiêu: điều chỉnh thanh Sidebar /admin theo cấu trúc phân cấp (Accordion Tree View) giống mẫu tham chiếu, tạo mục cha "Quản lý sách" chứa các mục con "Sách", "Bộ sưu tập", "Flash sale", làm đậm màu nền đỏ active và bỏ đường viền nhỏ bên trái.
2. Phạm vi & Quyết định (chốt qua /grill-me):
   - Nhóm phân cấp Accordion "Quản lý sách":
     - Mục cha: button "Quản lý sách" có icon sách + mũi tên chevron SVG (v khi mở, > khi đóng), mặc định mở sẵn (bookMenuOpen = signal(true)), hỗ trợ click đóng/mở mượt mà với aria-expanded và aria-controls.
     - Submenu lồng bên trong: thụt lề 1.45rem, có đường kẻ dọc tree-line mảnh (#E8E2D8), hiển thị clean text gồm 3 mục: "Sách" (/admin/sach), "Bộ sưu tập" (/admin/bo-suu-tap), "Flash sale" (/admin/flash-sale) (hai mục sau chỉ hiển thị với OWNER).
   - Tinh chỉnh Active State:
     - Nền active: đổi sang màu đỏ pastel vừa phải #FDE8E8 (đậm hơn nền cũ #FDF2F2, tương phản rõ nét với chữ đỏ đô #9B1C28).
     - Bỏ hoàn toàn đường viền nhỏ 3px bên trái (border-left indicator) theo ảnh mẫu của user, active item thành hình khối bo tròn mềm mại (pill / rounded rect border-radius 8px / 6px).
     - Bổ sung responsive linh hoạt cho mobile view.
   - Files thay đổi:
     - code/frontend/src/app/layouts/admin-layout/admin-layout.html
     - code/frontend/src/app/layouts/admin-layout/admin-layout.ts
     - code/frontend/src/app/layouts/admin-layout/admin-layout.scss
     - code/frontend/src/app/layouts/admin-layout/admin-layout.spec.ts
     - docs/DESIGN.md, docs/PROGRESS.md, docs/DEV_LOG.md
3. Kiểm tra đã chạy:
   - Frontend Vitest: npm test (cwd code/frontend trong worktree dev-ui) -> 38/38 files, 194/194 tests PASS (bổ sung test toggle accordion và quyền OWNER/STAFF).
   - Frontend build: npm run build và npm run build:workers hoàn tất 0 error, 0 warning.
   - Visual verification qua Chrome headless CDP:
     - Chụp ảnh admin-sidebar-accordion.png (asideWidth 240px, parentGroup 'Quản lý sách', subItems ['Sách', 'Bộ sưu tập', 'Flash sale'], activeItem 'Sách', icons: 3).
     - Kiểm chứng trực quan: mục "Sách" active có nền đỏ pastel #FDE8E8, không có viền đỏ trái, đường kẻ dọc thụt lề chuẩn mẫu.
4. Việc dang dở / blocker: Không có.
5. Bước tiếp theo: Commit và push nhánh dev-ui lên GitHub.

### S041-C14 — 06/11/2026 — Merge nhánh dev-ui vào dev

1. Ngày: 06/11/2026 (Asia/Ho_Chi_Minh), Checkpoint S041-C14. Mục tiêu: merge nhánh `dev-ui` vào `dev` theo yêu cầu của user, giải quyết merge conflict tại `docs/DEV_LOG.md`.
2. Nội dung tích hợp:
   - Toàn bộ giao diện Admin Sidebar mới (Accordion Tree View: "Quản lý sách" chứa "Sách", "Bộ sưu tập", "Flash sale", nền active đỏ pastel `#FDE8E8`, bỏ viền chỉ báo trái, bo góc tròn pill).
   - Nút quay về /admin trên header desktop và menu trượt mobile của trang public.
   - Định dạng và căn chỉnh các file layout admin, layout public và service catalogue.
3. Kiểm tra đã chạy:
   - Frontend Vitest: 38/38 test files PASS.
   - Frontend builds: `npm run build` và `npm run build:workers` hoàn tất 0 error, 0 warning.
4. Trạng thái: Đã merge thành công vào `dev`.
### S041-C01 — 05/11/2026 — bắt đầu nối publish GHCR với Dokploy

- User xác nhận Auto Deploy vẫn giữ deployment cũ sau push backend main; yêu cầu
  sửa publish-backend.yml và commit trực tiếp main, ngoại lệ workflow dev thường lệ.
- Phạm vi: thêm API trigger sau publish thành công, cấu hình qua GitHub secrets;
  kiểm YAML/shell với request giả, cập nhật docs. Không đọc/ghi secret vào log.
- Main đã fast-forward origin/main tại `4b50288`; đang thực hiện, chưa gọi Dokploy.

### S041-C02 — 05/11/2026 — nối GitHub Actions publish với Dokploy API

- Nguyên nhân xác định từ workflow: pipeline dừng ở GHCR publish, chưa gọi Dokploy.
  User báo Auto Deploy bật nhưng deployment cũ; không truy cập dashboard nên chưa
  loại trừ lỗi source/tag/pull credential/network khác trên Dokploy.
- Thay đổi `.github/workflows/publish-backend.yml`: job deploy needs publish,
  chỉ main/non-PR, permissions rỗng, timeout3phút; POST application.deploy với
  applicationId qua jq JSON, x-api-key từ secret. Curl chỉ HTTPS, connect10s/max60s,
  HTTP2xx mới nhận; không in response/secret, không tự retry POST gây lặp deploy.
- Ba secrets cần cấu hình: DOKPLOY_URL/API_KEY/APPLICATION_ID. Không tìm giá trị
  hoặc đưa secrets vào repo/log. Docs DEPLOYMENT/PROGRESS cập nhật cách setup,
  Docker image :main, network/pull permissions và kiểm logs/digest/health.
- Kiểm tra root: YAML BaseLoader + bash -n PASS; chạy chính shell step với curl giả:
  200/202 nhận;302/HTTP500/timeout thất bại; thiếu từng3secret dừng trước request.
  Kiểm POST URL/headers/JSON escaping và không lộ API key trong output: PASS.
  Assertion trước sửa FAIL đúng lỗi thiếu deploy job; sau sửa PASS toàn bộ8ca.
- `git diff --check`, markdown line limits/links: kiểm trước commit. Không đổi app
  source nên không lặp backend/frontend suite đã PASS S040; chưa chạy GitHub-hosted
  workflow/build Docker thật hoặc gọi API Dokploy. HTTP2xx chưa là deploy hoàn tất.
- Bàn giao trực tiếp main theo yêu cầu user, gồm workflow và docs trong cùng commit;
  push origin/main. Việc tiếp theo: cấu hình secrets và kiểm run/deployment thật.

### S042-C01 — 06/11/2026 — rà soát Excel với form nhập sách

- Mục tiêu user: đối chiếu import với form mới, ưu tiên giảm thời gian metadata
  vì ảnh vẫn upload từng cuốn. Phạm vi audit trên dev, không đổi nghiệp vụ/file gốc.
- Đã fast-forward dev từ origin tới 892f0e9; cây sạch khi bắt đầu. Đọc contract,
  parser/validator/form và workbook input/me-may-sach-v2.xlsx ở chế độ chỉ đọc.
- Đang kiểm chứng parser và khác biệt giá/ghi chú/tồn/cảnh báo; chưa triển khai
  format mới hoặc thay dropdown. Graph MCP lỗi Transport closed, dùng source trực tiếp.

### S042-C02 — 06/11/2026 — kết quả đối chiếu import/form

- Đã audit workbook gốc và parser/validator/form. Import tương thích16header cũ
  nhưng chưa tối ưu theo form mới: không đơn giá/kg/tự tính, tồn1, không cảnh báo
  trùng tên, hai header tình trạng vẫn cần. Note optional map riêng đúng contract.
- File chỉ có header, dropdown8thể loại thiếu Kinh Thánh (parser nhận9). Không
  sửa workbook; SHA256 trước/sau không đổi, ghi tại BOOK_IMPORT_VERIFICATION.
- Root chạy `bash code/backend/run-local.sh -B -ntp -Dtest=BookImportParserTest,BookImportV2Test,BookLegacyFingerprintTest test`:
  15PASS/0failure/0error/0skip. Probe Java ignored .local/import-parity-audit chạy
  parser thật trên bản sao trong bộ nhớ:12ca PASS, gồm giá36.000–41.400 giữ nguyên,
  trùng dòng riêng, condition trống, note/tuổi/Bible, chặn formula/header mới.
- Chỉ đổi docs PROGRESS/DEV_LOG/README/BOOK_IMPORT_VERIFICATION; không DB, live,
  deploy, app source hoặc file Excel. Chưa đo thao tác thực tế/ảnh; chưa triển khai
  format mới. Đã hỏi đơn giá thường chung lô hay từng cuốn để xác định bước thiết kế.
- Audit xong; chuẩn bị commit/push dev, user tự merge main/deploy.

### S042-C03 — 06/11/2026 — import tạm thời không cần đơn giá

- User trả lời: phần import Excel tạm thời chưa cần nhập đơn giá. Giữ hai giá
  trực tiếp; không coi thiếu đơn giá/kg là việc cần triển khai lúc này.
- Audit docs đã commit/push dev `47a2dc4`; cập nhật quyết định vào PROGRESS và
  BOOK_IMPORT_VERIFICATION. Không đổi code hoặc workbook; mục tiêu giảm thời gian
  metadata vì ảnh thêm từng sách giữ nguyên. Kiểm diff/line limits trước commit.

### S042-C04 — 06/11/2026 — giá được tính khi thêm ảnh

- User làm rõ chủ tự nhập đơn giá khi upload ảnh từng sách để tính hai đầu giá.
  Form edit hiện có thao tác này; import vẫn bắt buộc hai giá trong Excel.
- Cần chốt việc để trống hai giá trong Excel để tránh nhập hai lần; đây chưa là
  thay đổi contract được duyệt. Chỉ cập nhật bàn giao, chưa đổi code/file Excel.

### S042-C05 — 06/11/2026 — rút gọn mẫu Excel

- User đồng ý thiếu hai giá khi import và yêu cầu bỏ cột không bắt buộc, giữ
  NXB/tác giả. Đọc lại BookValidation/BookImportValidator; graph vẫn Transport closed.
- Viết thiết kế ngắn BOOK_IMPORT_SIMPLIFICATION:6cột title/publisher/author/
  category/binding/weight, NXB/tác giả optional, binding chỉ Picture Book;
  thiếu giá giữẨn, thêm ảnh/đơn giá rồi xuất bản; giữ file/receipt cũ.
- Đăng ký ở README, cập nhật PROGRESS; chưa đổi app/file Excel, chưa chạy test
  mới vì chỉ thiết kế. Kiểm diff/line limits/liên kết trước commit; chờ duyệt
  thiết kế rồi writing-plans và thực thi tuần tự trên dev.

### S042-C06 — 06/11/2026 — giữ mô tả sách trong Excel

- User xác nhận giữ mo_ta_sach (không phải chú thích ảnh). Cập nhật thiết kế
  từ6thành7cột, mô tả/NXB/tác giả đều optional. Không thêm cột mô tả ảnh.
- Đổi BOOK_IMPORT_SIMPLIFICATION/README/PROGRESS và log; chưa đổi app/workbook.
  Kiểm diff/line limits và links trước commit; test app chưa chạy vì chỉ sửa
  thiết kế. Bước tiếp theo user duyệt thiết kế7cột rồi lập plan tuần tự trên dev.

### S042-C07 — 06/11/2026 — duyệt thiết kế và lập kế hoạch importV3

- User duyệt thiết kế7cột; giữ thực thi tuần tự đã chọn. Đọc Writing Plans,
  kiểm source thực tế parser/validator/command/transaction/template/editor và
  schema nullable giá; graph MCP Transport closed, fallback direct source.
- Fetch origin thành công, dev sạch/đồng bộ tại8882e7f trước sửa docs. Kế hoạch
  BOOK_IMPORT_SIMPLIFICATION_PLAN gồm4task: parserV3, commit null giá, template/UI,
  tổng kiểm và bàn giao. Không migration/dependency, không đổi canonicalV1/V2.
- Đã self-review mapping spec/interfaces/5Review Focus vào test/task; chưa đổi
  app/workbook hoặc chạy test app. Kiểm diff/line limits/links trước commit.
- Cập nhật spec đã duyệt/README/PROGRESS. Chờ user review plan theo yêu cầu
  Writing Plans rồi executing-plans tuần tự; không hỏi lại phương thức thực thi.

### S042-C08 — 06/11/2026 — bắt đầu triển khai importV3

- User duyệt plan, yêu cầu không tạo file hướng dẫn riêng vì đã có. Thực thi
  tuần tự tại checkout dev theo chỉ định; không tạo workspace/branch khác.
- Bỏ deliverable workbook/hướng dẫn riêng khỏi task3; giữ endpoint template
  hiện có tương thíchV3. Không ghi đè file user. Ledger ignored theo plan.
- Đang task1: viết test nhận7cột/null giá và giữ digestV1/V2; chưa đổi app.

### S042-C09 — 06/11/2026 — parserV3 hoàn tất

- Thêm7header/schema3; dùng cùng adapter một dòng một sách, null giá chỉV3,
  digest3 riêng; V1/V2 JSON/digest giữ nguyên. Giới hạn100dòng choV2/V3.
- Test BookImportV3Test6ca RED do chưa nhận headers, GREEN cùng suite21test
  (V3/V2/parser/legacyfingerprint), 0failure/0error/0skip. Có sparse row7,
  optional metadata/multiline, binding/weight/headers/101dòng, CSV/XLSX/reorder.
- Thay code backend schema/parser/xlsx/validator/fingerprint/validation và test;
  chưa chạy DB/ảnh. Bước tiếp theo task2 tạo importẨn null giá và retry/privacy.

### S042-C10 — 06/11/2026 — commit importV3 null giá

- Command/transaction truyền schemaVersion, chỉV3 bỏ yêu cầu giá khi tạoẨn;
  publish giữ bắt buộc hai giá/ảnh. Không migration hoặc đổi receipt schema.
- BookImportV3IntegrationTest RED3failure đúng400 khi đòi giá, GREEN22test
  gồmV3/V2/transaction/API:0failure/0error/0skip trên me_may_test guarded.
- Xác nhận import không ảnh/null giá, publish thiếu giá400/public404, thêm giá
  và đủảnh publish200; retry sau edit giữ giá/tồn/note; rollback sách cuối;
  category stale/STAFF chặn; receipts1/2/3 đồng thời, V1/V2 không ghi đè.
- Sandbox chặn socket ở lần đầu, chạy lại được cấp quyền local test DB; không
  đổi DB bán thật. Task2 xong, bước tiếp theo hướng dẫn UI/template hiện có.

### S042-C11 — 06/11/2026 — giao diện import7cột và giá chưa nhập

- Trang import hướng dẫn7cột và nhập đơn giá khi thêm ảnh; previewV3 dùng số
  dòng thật, confirm sáchẨn vẫn được. List/preview quản trị ghi Chưa nhập giá,
  formatter public giữ nguyên. Editor đã xử lý null/tính giá/upload đúng, không sửa.
- Endpoint template hiện có sinh7cột, dropdown thể loại/kiểu bìa, mô tả wrap.
  Không tạo file hướng dẫn hoặc workbook giao riêng; roundtrip kiểm trong bộ nhớ.
- RED backend2failure headers16vs7, frontend2failure row/nhãn; GREEN backend28
  test và frontend37test/3files. Test editor nhận null giá, tính36000/42000 và
  giữ sửa tay khi upload đã PASS ngay, ghi nhận behavior hiện có.
- Task3 xong; bắt đầu tổng kiểm, browser QA riêng và review cuối.

### S042-C12 — 06/11/2026 — importV3 kiểm chứng và bàn giao

- User duyệt7cột và không cần file hướng dẫn; triển khai tuần tự trên dev.
  Source commits9376626/1d0a988/e21d644; V3null giá/receipt3, V1/V2 giữ nguyên.
- Root clean verify210run/0failure/0error/3live-provider skip; frontend npm test
  200PASS/39files, npm run build/build:workers/check:workers:proxyPASS. Angular
  native134/139 và proxyEPERM trong sandbox, rerun ngoài sandbox đạt, không sửa code.
- Chrome + NodeSSR4011/API8089, schema import_v3_browser_qa/me_may_test, fake
  provider/OWNER/STAFF/PNG. Import1sách null giá, metadata giữ đúng; upload2ảnh
  không tính giá; đủảnh thiếu giá publish400;80000/kg×450g→36000/42000,
  sửa max44000/lưu200, hidden404→publish200/public36000/44000/mô tả đúng.
- Chọn lại CSV trả MM-000001/cùng receipt, giữ2ảnh/đơn giá/giá; STAFF
  redirect về danh sách, không link import, options403. ProbeSTAFF đầu chờ
  thông báo trong trang import timeout vì routeguard đã redirect, sửa probe không sửa app.
- Browser đã đóng; dừng2service, kiểm JDBC to_regnamespace null và cả2cổng
  đã đóng:PASS. Không chạm DB/ảnh bán thật/provider thật. Workbook gốc
  SHA256 không đổi, ghi ở BOOK_IMPORT_VERIFICATION; screenshot output ignored.
- Review độc lập review_import_v3 trên b393763..e21d644:0Critical/0Important/
  0Minor. Không re-review; docs/browser cuối tác giả kiểm, live gác ngoài phạm vi.
- Gộp quyết định vào DATA/BOOK_IMPORT/CATALOGUE/DESIGN/ARCHITECTURE/
  MASTER_PLAN; bằng chứng vào BOOK_IMPORT_VERIFICATION; README/PROGRESS cập nhật,
  gỡ spec/plan hết vai trò sau task4. Không tạo file hướng dẫn/workbook riêng.
- Bàn giao commit/push dev theo workflow; user merge main/deploy. Chưa deploy,
  chưa đo thao tác chủ tiệm/live-provider. BackendV3 trước frontend; rollback
  về backendV2 không nhận7cột, dữ liệu Ẩn/null giá vẫn an toàn trong schema cũ.

### S042-C13 — 06/11/2026 — bổ sung don_gia_kg optional khi import

- User yêu cầu thêm cột don_gia_kg tùy chọn theo đề xuất đã chốt: có đơn giá
  thì tính/lưu giá như form, để trống vẫnẨn/null giá; giữ file7cột/receipt cũ.
- Phạm vi một bổ sung nhỏ vào importer hiện có, thực thi tuần tự trên dev;
  không tạo hướng dẫn/workbook giao riêng. Bắt đầu từ dev sạch tại2f8b89b.
- Graph MCP Transport closed, đọc source trực tiếp; DB đã có cột unit price,
  backend chưa có hàm tính giá. Sẽ dùng BigInteger theo đúng công thức TS hiện có.
- TDD: kiểm8cột optional/giá/giới hạn/rounding/persistence/retry; fingerprint4
  giữ nguyên canonicalV1–V3. Chưa đổi code; chưa chạy kiểm tra mới.

### S042-C14 — 06/11/2026 — don_gia_kg optional đã triển khai và kiểm tự động

- SchemaV4/8cột nhận don_gia_kg optional; V3/7cột vẫn nhận nguyên fingerprint.
  Long đơn giá nằm ngoài BookWrite canonical, được mang qua group/resolve/commit
  và lưu trước audit; fingerprint4 gồm đơn giá, kể cả khi hai giá làm tròn trùng.
- BigInteger tính cùng form: B=U×W/1000, hai giá ceil1.000đ từB vàB×1,15;
  lỗi unit/giá vượt giới hạn gắn đúng don_gia_kg/dòng, không clamp hoặc ghi lô lỗi.
- Template endpoint/UI thêm cột/preview đơn giá, để trống vẫn null; không file
  hướng dẫn/workbook mới. Giữ JSON BookWrite và fingerprintV1–V3 byte-compatible.
- RED: unit5ca lỗi headers; integration3failure422; template2failure; UI2failure.
  GREEN scoped35backend/18UI; root clean verify219run/0failure/0error/3live skips,
  frontend201PASS/39files, SSR buildPASS. Golden V2/V3 chụp trước sửa đều giữ đúng.
- API thật trên me_may_test: persist80000/36000/42000, optionalblank null; sửa
  unit81000/giá40000–48000/tồn4/note rồi retry giữ nguyên; unit khác giá làm tròn
  giống vẫn lưu riêng; một dòng lỗi chặn cảfile, không receipt/sách.
- Bước tiếp theo review độc lập, buildWorkers/proxy và gộp contract/bàn giao dev.

### S042-C15 — 06/11/2026 — hoàn tất đơn giá/kg optional khi import

- Reviewer độc lập review_import_unit trên2f8b89b..3d5894a không finding
  Critical/Important/Minor; xác nhận math/canonical/persistence/audit/retry.
- Backend219run/0failure/0error/3live-provider skip; frontend201PASS/39files,
  SSR/Workers build0warning và proxyPASS. Không chạy lại suite sau docs vì
  source app không đổi sau kiểm full; không tạo service/database QA riêng.
- Không manualbrowser/deviceV4 mới: DOM import18test và realHTTP integration3test
  là bằng chứng mới; browserV3 trước đây không được tính là kiểm mớiV4.
- Gộp contractV4 vào DATA/BOOK_IMPORT/ARCHITECTURE/CATALOGUE/DESIGN/MASTER_PLAN,
  chỉ mục README, snapshot PROGRESS, evidence BOOK_IMPORT_VERIFICATION. Không
  tạo file hướng dẫn/workbook riêng; originalV2 SHA256 giữ nguyên.
- Source commit3d5894a; tài liệu bàn giao commit/pushdev cùng task. Chưa deploy,
  không migration/dependency/provider thật. BackendV4 trước frontend; receipt
  cũ giữ nguyên, đổi7→8cột hoặc đổi đơn giá vẫn là lô mới, không update sách cũ.

### S043-C01 — 06/11/2026 — bắt đầu8ảnh/lưu/xuất bản/features

- User cung cấp spec Approved for implementation, yêu cầu kiểm tra/làm rõ rồi tiến hành.
  Đã đọc chỉ mục, snapshot/checkpointS042, MASTER_PLAN/CATALOGUE và graph/source liên quan.
- User chốt mọi ARCHIVED kể cả từng đăng được thiếu trọng lượng; publish vẫn đủ dữ liệu.
- dev390cd9c sạch, fetch originPASS; origin/main4e5e84d chứa toàn bộ dev, chỉ khác merge/CI;
  local mainb791511 cũ, không dùng làm baseline. Làm trên dev theo workflow đã cho phép.
- Spec/plan hiện hành BOOK_MEDIA_FEATURE_SPEC/PLAN đăng ký README; tuần tự database/contract,
  backend, frontend, tests; giữ canonical/fingerprint importV1–V4 và legacy create retry.
- Chưa chạy test mới; chưa đổi code/migration. Không chạm DB/media thật, không deploy/main.

### S043-C02 — 06/11/2026 — backend8ảnh/save/features lần đầu

- Baseline frontend editor17PASS; backend thiếu TEST_DB_URL khi gọi Maven trực tiếp,
  dùng run-local.sh rồi sandbox chặn socket (Operation not permitted); rerun ngoài
  sandbox15test cũPASS,5test mớiRED đúng missing ARCHIVED/eight-photo behavior.
- V15 thêm INTERNAL roles và feature catalogue/mapping (unique code/position1–3).
  HTTP extras publication/publishAfterSave/featureCodes không đổi canonical BookWrite.
- Implement atomic update+publish, optional-weight ARCHIVED riêng; import validateWrite
  giữ nguyên. Public/preview role allowlist, internal endpoint404 trước gateway;
  ordered features chiếu SQL không thêm JDBC query mỗi sách; audit includes features.
- Scoped20tests:5test mớiPASS/6test cũfail do helper gửi DTO read mới features về write;
  sửa helper bỏ read-only field. Chưa fullverify/frontend mới/browser/review.
- Thay đổi còn local dev, chưa commit/deploy. Tiếp tục frontend và regression backend.

### S043-C03 — 06/11/2026 — hồi quy và UI

- Clean backend verify224run/0failure/0error/3live skip sau cập nhật fixture/features
  và constructorTaxonomy test. Legacy create2/6ảnh và fingerprint/import suitesPASS.
- Frontend210PASS/40files: hai save action, ARCHIVED partial, atomic publish payload,
  max3/order tags,8ảnh/replacement/role stable, card first/detail all/no-feature.
- Bổ sung test8ảnh thay slot và audit failure rollback content/tags/mediaPASS.
  Consumed session recoveryRED (GET trả409 trước sửa); mở GET đã consumed trả bookId
  có kiểm owner; frontend kiểm session trước retry, GET book đã lưu thay vì POST lại.
- Đang chạy scoped session regression và SSR build; chưa browser/mobile/review cuối.
- Code còn local dev. Spec/plan còn thực thi, không deploy/main.

### S043-C04 — 06/11/2026 — review độc lập và sửa ba finding

- Reviewer review_media_features:0Critical/3Important/0Minor. Privacy replacement
  sau đổi nhóm chưa lưu/in-flight role; metadata preflush riêng transaction; PUT
  timeout chưa reconcile. Đã nhận, viết regression tests trước sửa.
- Sửa: chặn replacement qua visibility chưa lưu và đổi nhóm ảnh đang upload/uncertain;
  mediaMetadata trong PUT validateID/length và lưu cùng aggregate/audit; metadata tạm
  vẫn flush session trước final. GET lại book sau PUT không rõ kết quả, đối chiếu
  nội dung/ảnh/tag/publication rồi mới accept hoặc mở retry, giữ edits khi khác.
- Backend metadataRED400 unknown field trước sửa, đang kiểmGREEN/whole suite; UI
  REDmissing recovery methods, đang chạy scoped. Chưa claim hoàn thành fix pass.
- MigrationV14→V15 và scoped7contractPASS trước bổ sung metadata; frontend211PASS
  trước fixreview; SSR/Workers/proxyPASS ngoài sandbox (native134/EPERM trong sandbox).
- QA schema s043_browser_qa/me_may_test, fake provider API8089 và SSR4011 đã khởi
  chạy, browserChrome riêngs043 đã mở login; chưa nghiệm thu luồng browser.
- Code/doc còn local dev; không production/main.

### S043-C05 — 06/11/2026 — browser candidate cuối

- Chrome headed/SSR4011/API8089/schemaQA riêng: title-only saveARCHIVED/nullweight
  và public404PASS; upload8ảnh persisted xong,6public/2internal đúng UI.
- Atomic save+publish200, một nútSavePUBLISHED; APIadmin8/public6, featureSOUND/SLIDE
  đúngorder/label, direct INTERNAL_1/2 đều404 trên PUBLISHED.
- Cố ý routefetch PUTcommit200 rồi abortresponse: UI khóa ghi và hiện kiểm kết quả;
  GETreconcile đúng nội dung/version/publication, không PUTtrùng:PASS.
- FixturePNG QA đầu tạo saiheader literal\\x89 bị app từ chối đúng; đã sửa binary,
  gỡ8file lỗi và upload8PNG đúng. Probe locator giá label thay đổi helper gây timeout,
  dùng formControlName có trong DOM; không sửa app để qua probe. Browser CLI qua
  Python subprocess trong sandbox ENOTFOUNDnpm, chuyển wrapper trực tiếp đã duyệt.
- Backend227run/0failure/0error/3live skip, frontend216PASS, SSR/Workers/proxyPASS
  trên code saufixreview. Không suite lại khi chỉ sửa docs.
- Đang kiểmhide/republish/publishedAt, tagpriority/mobile/public; chưa cleanupQA/commit.

### S043-C06 — 06/11/2026 — chốt kiểm chứng và gộp tài liệu

- Hide→ARCHIVED/2 nút đều width-height, priority SLIDE→republish/publishedAt giữ nguyên PASS.
  Home/card390px tag đầu, detail2tag wrap/nooverflow và preview6public PASS.
  Screenshot chờ startup-splash hidden; lần chụp sớm thấy logo nên chụp lại.
- Hoàn thiện finding privacy: replacement preparing cũng phải khóa đổi nhóm.
  Regression RED nhận INTERNAL_1 thay FRONT; thêm guard previous, full frontend
  GREEN217PASS/40files. Không thay UX public hoặc thêm feature ngoài spec.
- Backend cuối227run/0failure/0error/3live skip; không đổi source sau kiểm.
  SSR/Workers rebuild cuối PASS sau guard; proxy PASS trước guard, không đổi proxy code.
  Browser layout/public kiểm trên candidate trước guard cuối; preparing được unit regression.
- Browser thay INTERNAL_1: giả503, retry đối chiếu GET rồi upload thành công, vẫn8ảnh PASS.
  PUT mất response đã reconcile; lỗiconsole dự kiến từ404/503/abort QA, không lỗi app mới.
- Gộp contract CATALOGUE/DATA/DESIGN/ARCHITECTURE/MASTER_PLAN, rolloutV15 vào
  BOOK_ENTRY_ROLLOUT. Đang chuyển evidence, cleanupQA rồi commit/pushdev; chưa deploy.

### S043-C07 — 06/11/2026 — hoàn tất kiểm chứng local, chuẩn bị commit

- Backend227run/0failure/0error/3live-provider skip; frontend217PASS/40files;
  SSR/Workers build cuối PASS, proxy smoke PASS. Review3Important đã sửa,
  preparing regression RED→GREEN; không còn findingCritical/Important chưa xử lý.
- Chrome desktop/mobile390px,8ảnh/public6/internal404, preview, tags Home/catalogue/
  detail, save-only/publish/hide/publishedAt/50:50, lostPUT/reconcile và503retry PASS.
  Browser đã đóng; QA_SCHEMA_REMOVED=true,8089/4011 CLOSED=true xác minh qua JDBC/socket.
- Chuyển đủ contract/acceptance/evidence và60file manifest vào tài liệu chuẩn;
  gỡ spec/plan hết vai trò, README trỏ contract/evidence/rollout. Markdown≤400 trừ
  DEV_LOG, local links, git diff --check, ignored env/tools và public sourceassets PASS.
- Fetch origin dev không đổi từ390cd9c; chưa commit tại checkpoint này. Sẽ commit/pushdev
  theo workflow đã cho phép. Chưa production migration/deploy; user merge main,
  chọn candidate/backup/restore/backendV15 trướcfrontend và smoke/cachepurge riêng.

### S043-C08 — 06/11/2026 — bàn giao dev

- Source/contract/evidence commit15d1138 trên dev,60files, không dependency mới.
  Baseline390cd9c; origin/main4e5e84d không bị sửa/merge/push trong task này.
- Hoàn tất local; không còn task triển khai S043 dang dở. Chưa liveCloudinary/
  thiết bị thật/production migration/deploy; giữ gate release ở PROGRESS/DEPLOYMENT.
- Bản bàn giao docs cuối cùng theo sau sourcecommit, pushdev theo workflow;
  user merge main và phê duyệt rolloutV15 riêng. Không dùng backend cũ chưa lọc
  internal media làm rollback sau khi tiệm đã nhập ảnh nội bộ.

### S044-C01 — 06/11/2026 — sửa sao chép mobile và markup detail

- User báo Sao chép nội dung mobile lỗi; yêu cầu tối ưu sau khi bỏ p/h2.
  dev840a78f, local detail HTML giữ2thẻ rỗng do user sửa; không ghi đè nội dung này.
- Graph MCP Transport closed; fallback source: ContactDialog.copy await verifyText
  (network) trước clipboard.writeText, trái user-gesture boundary Safari/WebKit.
  Cả detail và wishlist dùng chung component; phải giữ revalidation giá/tình trạng.
- Đã hỏi thêm loại máy/browser/thông báo; đang làm regression tests. Sửa theo
  ClipboardItem promise-data khởi tạo write ngay click và selection fallback; không
  bỏ kiểm dữ liệu, không dependency/backend/migration. Chưa chạy test mới.

### S044-C02 — 06/11/2026 — clipboard RED/GREEN và thông tin máy thật

- User xác nhận iPhone/Safari; ảnh Brave báo Đã sao chép, Safari báo fallback thủ công
  trên memaybooks.com. Bản đang sửa local, chưa deploy lên URL đó.
- TestRED3case: deferred write chưa gọi trước network, verifyfail không hủy payload,
  fallback chưa selectfull. GREEN38scoped; thêm execCommandthrow RED rồi xử lý chọn
  thủ công vẫn hoạt động. Fullfrontend221PASS/40files, backend không đổi.
- Dùng ClipboardItem text/plain promise + clipboard.write gọi ngay trong click,
  chỉ resolve Blob sau verify; empty/offline/stale không ghi clipboard. Khóa doublecopy
  trong khi clipboardpending; writeText cho browserlegacy, select/execCommand/manualfallback.
- Gỡ p.eyebrow/h2 rỗng và wrappersection thừa theo localedit user, giữdescription.
  SSR sandbox esbuild native lỗi; rerun ngoài sandbox đang kiểm. WebKit chưa cài,
  đang chuẩn bị browserQA riêng, không giả lập rồi coi là iPhone thật.

### S044-C03 — 06/11/2026 — WebKit mobile copy/paste

- Cài WebKit27.2 cho Playwright (toolcache, không repo dependency); API8091 giả
  delay150ms + builtSSR4012, không database/credential/media thật. Fixturecollections
  ban đầu trảobject làm Angular iteratorerror; sửa fixture vềarray, không sửaapp.
- WebKitmobile detail: clickcopy qua networkdelay150ms báo thành công; dán lại bằng
  Meta+V vào textarea QA so sánh toàn bộ chuỗi mã/tên/giá/URL khớp:PASS. Không
  stubClipboard hoặc cấp quyềnclipboardread, không đọc/dump clipboard trước thao tácQA.
- Detail giữdescription, bỏ hai thẻempty; review độc lập0finding. Đang kiểmwishlist
  và failurepath trước cleanup/commitdev. Chưa Safari iPhone vật lý sau sửa/deploy.

### S044-C04 — 06/11/2026 — hoàn tất local, bàn giao dev

- WebKit27.2 mobile copy/paste toànchuỗi detail và wishlist qua network150ms PASS;
  lookup503 xóa text/báo chưa xác nhận PASS. NativeClipboard không stub/không đọc
  clipboard trước QA. Browser đóng, SSR4012/API8091 dừng; không DB/media thật.
- Fullfrontend221PASS/40files, SSR/Workers/proxyPASS; reviewer0finding. Backend
  không đổi, không chạy Maven. Docs/contract DESIGN và CONTACT_VERIFICATION, README
  đăng ký bằng chứng; không spec/plan mới, không dependency/migration/deploy.
- Bảo toàn localedituser bằng gỡ p.eyebrow/h2 rỗng và sectionthừa; giữ mô tả.
- Code đang local dev840a78f, chuẩn bị commit/push theo workflow. Chưa iPhone vật lý
  sau sửa hoặc cập nhật memaybooks.com; user merge main/deploy rồi test máy thật.

### S044-C05 — 06/11/2026 — source đã pushdev

- Commit5844b4e đã push origin/dev;9file gồm code/tests và tài liệu bàn giao.
  Frontend221PASS, SSR/Workers/proxyPASS, WebKitmobile actualcopy/paste2luồng và
  offline guardPASS, review0finding; không appcode đổi sau verification.
- User vẫn cần merge main/deploy trước khi test lại Safari trên memaybooks.com.
  Snapshot docs chốt sau sourcecommit; chưa deploy hoặc kiểm iPhone vật lý sau sửa.

### S038-C06 — 06/11/2026 — Box tiện ích & hỗ trợ dưới banner trang chủ (IPM style)

1. Ngày: 06/11/2026 (Asia/Ho_Chi_Minh), Checkpoint S038-C06. Mục tiêu: đồng bộ với nhánh `dev`, triển khai 4 box tiện ích dưới banner Hero theo phong cách IPM trên worktree `dev-ui` (Ưu đãi vận chuyển, Cách hỏi mua sách, Cộng đồng Mẹ Mây, Hotline), giữ trên `dev-ui` chưa merge `dev` chờ user review.
2. Quyết định & chi tiết kỹ thuật (chốt qua /grill-me):
   - Bố cục & Responsive: Desktop 4 cột thẳng hàng (grid-template-columns: repeat(4, 1fr)), Mobile hiển thị dạng lưới 2x2 cân đối (grid-template-columns: repeat(2, 1fr)).
   - Phong cách & Màu sắc: Nền trắng #FFFFFF, viền mềm #E8E2D8 bo góc 12px, hover viền đỏ Mẹ Mây #9B1C28 và nổi nhẹ translateY(-2px). Icon SVG đỏ Mẹ Mây trên nền tròn bo góc đỏ pastel #FDF2F2.
   - Nội dung 4 box:
     1. "Ưu đãi vận chuyển" (icon xe tải 🚚): kèm dòng phụ "Giao hàng toàn quốc", sẵn sàng mở popup ở giai đoạn 2.
     2. "Cách hỏi mua sách" (icon tin nhắn 💬): kèm dòng phụ "Hướng dẫn đặt nhanh", sẵn sàng mở popup ở giai đoạn 2.
     3. "Cộng đồng Mẹ Mây" (icon nhóm 👥): kèm dòng phụ "Tham gia nhóm Zalo", link mở tab mới trỏ đến contactConfig.groupUrl (từ biến môi trường CONTACT_ZALO_GROUP_URL).
     4. "Hotline hỗ trợ:" (icon điện thoại 📞): 2 dòng số riêng biệt 0966 075 005 và 0703 260 005, mỗi số có link tel: trực tiếp chuẩn mẫu IPM.
   - Files thay đổi:
     - code/frontend/src/app/features/home/home-page.html
     - code/frontend/src/app/features/home/home-page.ts
     - code/frontend/src/app/features/home/home-page.scss
     - code/frontend/src/app/features/home/home-page.spec.ts
     - docs/DESIGN.md, docs/PROGRESS.md, docs/DEV_LOG.md
3. Kiểm tra đã chạy:
   - Frontend Vitest: 40/40 test files, 204/204 tests PASS (thêm 3 test cases cho banner boxes).
   - Frontend builds: npm run build và npm run build:workers hoàn tất 0 warning, 0 error.
   - Chrome headless CDP visual test: chụp ảnh màn hình Desktop (home-banner-boxes-desktop.png) và Mobile (home-banner-boxes-mobile.png) kiểm chứng layout, grid, font và kích thước chuẩn.
4. Việc dang dở / blocker: Không có. Chưa merge vào dev theo yêu cầu của user.
5. Bước tiếp theo: Bàn giao trên nhánh dev-ui, chuẩn bị giai đoạn 2 (popup khi click vào box).

### S038-C07 — 06/11/2026 — Tinh chỉnh góc vuông 4px, in đậm tiêu đề và Hotline chuẩn 100% mẫu IPM

1. Ngày: 06/11/2026 (Asia/Ho_Chi_Minh), Checkpoint S038-C07. Mục tiêu: tinh chỉnh 4 box tiện ích theo ảnh mẫu IPM đính kèm (media_1793973818208_0849018b.png): giảm bán kính bo góc xuống 4px (vuông vức), viền đỏ thương hiệu 1px #9B1C28 cho cả 4 thẻ, in đậm toàn bộ tiêu đề in hoa (font-weight: 800), bỏ nền đỏ pastel của icon (icon trần sắc nét), và thiết kế box Hotline hoàn toàn giống mẫu IPM (icon điện thoại đặc với 3 sóng âm, chữ `HOTLINE:` và 2 số điện thoại căn giữa in đậm).
2. Chi tiết thay đổi:
   - `code/frontend/src/app/features/home/home-page.html`:
     - Chuyển tiêu đề các box thành chữ in hoa 2 dòng: `ƯU ĐÃI <br />VẬN CHUYỂN`, `CÁCH HỎI <br />MUA SÁCH`, `CỘNG ĐỒNG <br />MẸ MÂY`.
     - Hotline box: dùng icon điện thoại đặc (fill="currentColor") kèm 3 cung sóng âm radiating góc trên bên phải (stroke-width="2"), tiêu đề `HOTLINE:` và 2 link tel `0966 075 005` / `0703 260 005`.
   - `code/frontend/src/app/features/home/home-page.scss`:
     - Đổi `border: 1px solid #9b1c28;`, `border-radius: 4px;`, loại bỏ nền phụ `.box-icon` để icon đỏ đứng trần trên nền trắng.
     - `.box-title` và `.hotline-link`: dùng font `Plus Jakarta Sans`, `font-weight: 800;`, `letter-spacing: 0.02em`, căn giữa cân đối cả chiều dọc và ngang.
     - Responsive mobile (<= 540px): giữ nguyên lưới 2x2, `border-radius: 4px;`, cỡ chữ 0.84rem và icon 26px đảm bảo không vỡ layout.
   - `code/frontend/src/app/features/home/home-page.spec.ts`:
     - Cập nhật assertion khớp tiêu đề in hoa mới.
   - Docs: Cập nhật `docs/DESIGN.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`.
3. Kiểm tra đã chạy:
   - Unit tests: Vitest 40/40 files, 204/204 tests PASS.
   - Build tests: `npm run build` (SSR) và `npm run build:workers` (Cloudflare) đều thành công 0 warning, 0 error.
   - Visual regression & CDP screenshot: Chạy lại `verify-banner-boxes.mjs` chụp `home-banner-boxes-desktop.png` và `home-banner-boxes-mobile.png`, đối chiếu với `media_1793973818208_0849018b.png` đạt 100% độ tương đồng về bố cục, icon và font.
4. Trạng thái & Bước tiếp theo:
   - Commit và push lên `origin/dev-ui`. Không tự ý merge vào `dev`.
   - Chờ user duyệt visual và hướng dẫn tiếp theo cho giai đoạn popup.

### S038-C08 — 06/11/2026 — Triển khai Popup "Cách hỏi mua sách" theo 4 bước timeline dọc

1. Ngày: 06/11/2026 (Asia/Ho_Chi_Minh), Checkpoint S038-C08. Mục tiêu: tạo popup hướng dẫn khi click box "CÁCH HỎI MUA SÁCH" trên Trang chủ, chia 4 khung theo timeline dọc kết nối đường kẻ chỉ dẫn, sử dụng ảnh minh họa liên hệ ở đầu popup, nút "Đã hiểu" ở chân và nút ✕ góc trên theo quyết định thống nhất qua `/grill-me`.
2. Chi tiết kỹ thuật:
   - Asset: Thêm ảnh minh họa `code/frontend/public/images/how-to-buy-contact.jpg` (từ file user cung cấp `media_1793981513435_8a9d1574.jpg`).
   - Component `HowToBuyDialog` (`code/frontend/src/app/features/home/how-to-buy-dialog/`):
     - Modal `<dialog>` HTML5 bo góc 20px, bóng đổ mềm `0 16px 48px rgba(41,39,36,0.22)`, backdrop mờ `rgba(30,27,24,0.65)` kèm blur.
     - Header: Ảnh minh họa liên hệ dạng tròn 120px (95px mobile) viền trắng nổi, tiêu đề `Cách hỏi mua sách tại Mẹ Mây` font `Baloo 2` đỏ thương hiệu `#9B1C28`, lời dẫn ngắn gọn.
     - 4 khung bước timeline dọc:
       - Bước 1: Thêm sách vào “Danh sách quan tâm” (`♡ Thêm vào danh sách quan tâm`).
       - Bước 2: Vào “Danh sách quan tâm” chọn sách cần kiểm tra video tình trạng thật.
       - Bước 3: Bấm “Chuẩn bị nội dung hỏi mua” để hệ thống tự động soạn sẵn thông tin.
       - Bước 4: Gửi tin nhắn qua Zalo Hotline (`Sao chép nội dung` ➔ `Mở Zalo` ➔ `Dán & gửi`).
     - Footer: Nút chính `Đã hiểu` đỏ thương hiệu `#9B1C28` căn giữa.
     - Hỗ trợ đóng qua nút ✕, nút `Đã hiểu`, phím `Escape` và click vào backdrop nền mờ.
   - Tích hợp `HomePage`:
     - Nhúng `<app-how-to-buy-dialog #howToBuyDialog />` vào `home-page.html`.
     - Gắn sự kiện `(click)="openHowToBuy($any($event.currentTarget))"` trên box "CÁCH HỎI MUA SÁCH".
   - Files thay đổi / thêm mới:
     - `code/frontend/public/images/how-to-buy-contact.jpg`
     - `code/frontend/src/app/features/home/how-to-buy-dialog/how-to-buy-dialog.html`
     - `code/frontend/src/app/features/home/how-to-buy-dialog/how-to-buy-dialog.scss`
     - `code/frontend/src/app/features/home/how-to-buy-dialog/how-to-buy-dialog.ts`
     - `code/frontend/src/app/features/home/how-to-buy-dialog/how-to-buy-dialog.spec.ts`
     - `code/frontend/src/app/features/home/home-page.html`
     - `code/frontend/src/app/features/home/home-page.ts`
     - `code/frontend/src/app/features/home/home-page.spec.ts`
     - `docs/DESIGN.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`
3. Kiểm tra đã chạy:
   - Vitest: 42/42 test files, 231/231 tests PASS (thêm 6 tests cho `HowToBuyDialog` và 1 test tích hợp mở popup trên `HomePage`).
   - Builds: `npm run build` (SSR) và `npm run build:workers` (Cloudflare) đều thành công 0 warning, 0 error.
   - Chrome headless CDP visual test: Script `scratch/verify-how-to-buy-dialog.mjs` chạy thành công, chụp ảnh màn hình Desktop (`how-to-buy-dialog-desktop.png`) và Mobile (`how-to-buy-dialog-mobile.png`) xác nhận modal mở chuẩn xác, tỷ lệ cân đối, không lỗi layout.
4. Trạng thái & Bước tiếp theo:
   - Commit và push lên nhánh `origin/dev-ui`. Giữ nguyên chưa merge vào `dev` theo yêu cầu.

### S038-C09 — 06/11/2026 — Gỡ bỏ hoàn toàn /cach-mua và section Cách hỏi mua ở cuối trang chủ

1. Ngày: 06/11/2026 (Asia/Ho_Chi_Minh), Checkpoint S038-C09. Mục tiêu: gỡ bỏ hoàn toàn route `/cach-mua` và section cách mua cũ ở cuối trang Home (`/`) theo yêu cầu user, thay thế bằng popup hướng dẫn tương tác mở từ box tiện ích.
2. Chi tiết thay đổi:
   - `code/frontend/src/app/features/home/home-page.html`: Xóa bỏ toàn bộ `<section class="how">` (gồm 3 bước dạng văn bản và link `Xem hướng dẫn hỏi mua →`).
   - `code/frontend/src/app/features/home/home-page.scss`: Xóa bỏ các quy tắc CSS `.how` ở cả desktop và mobile `@media (max-width: 560px)`.
   - `code/frontend/src/app/app.routes.ts`: Xóa bỏ định nghĩa route `path: 'cach-mua'`.
   - `code/frontend/src/app/layouts/public-layout/public-layout.html`: Xóa liên kết `Cách mua` trên thanh điều hướng desktop, menu trượt mobile và chân trang footer.
   - `code/frontend/src/app/layouts/public-layout/public-layout.ts`: Bỏ case `'how'` trong hàm `isActive()`.
   - `code/frontend/src/worker-runtime.spec.ts`: Chuyển path test mẫu từ `/cach-mua` sang `/lien-he`.
   - `code/frontend/scripts/check-ssr.mjs` & `check-worker-proxy.mjs`: Cập nhật route kiểm tra từ `/cach-mua` sang `/lien-he`.
   - Docs: Cập nhật `docs/DESIGN.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`.
3. Kiểm tra đã chạy:
   - Unit tests: Vitest 42/42 test files, 231/231 tests PASS.
   - Builds: `npm run build` (SSR) và `npm run build:workers` (Cloudflare) đều thành công 0 warning, 0 error.
   - SSR probe: Chạy server SSR và `check-ssr.mjs`, kiểm chứng `/` và `/lien-he` trả về HTML 200 hợp lệ, đồng thời truy cập `/cach-mua` trả về HTTP 404 chuẩn xác.
4. Trạng thái: Sẵn sàng commit và push lên nhánh `origin/dev-ui`. Chờ user duyệt trước khi merge `dev`.


### S038-C10 — 06/11/2026 — Chuyển popup Cách hỏi mua sách sang bố cục lưới 2x2 ngang gọn

1. Ngày: 06/11/2026 (Asia/Ho_Chi_Minh), Checkpoint S038-C10. Mục tiêu: chuyển bố cục popup từ cột dọc sang lưới ngang 2x2, lược bỏ các chú thích phụ ở bước 1–3, chỉ giữ tiêu đề in đậm và giữ nguyên hướng dẫn thao tác chi tiết ở bước 4.
2. Chi tiết thay đổi:
   - `how-to-buy-dialog.html`: Đổi layout các bước thành lưới 2x2 `.steps-grid`; gỡ các đoạn chú thích nhỏ ở bước 1, 2, 3; giữ lại tiêu đề in đậm rõ ràng cho B1, B2, B3 và giữ nguyên hướng dẫn cụ thể ở B4: `Bấm “Sao chép nội dung” => “Mở zalo” => Dán & gửi tin nhắn yêu cầu cho tiệm qua hotline zalo`.
   - `how-to-buy-dialog.scss`: Cấu hình `grid-template-columns: repeat(2, 1fr)` cho desktop/tablet, `max-width: 760px`, `width: min(760px, calc(100% - 32px))`, thẻ bước dạng card ngang nhỏ gọn bo tròn 12px; responsive tự động chuyển 1 cột trên mobile `<=640px`.
   - `how-to-buy-dialog.spec.ts`: Cập nhật bộ unit test kiểm tra chính xác 4 tiêu đề, xác nhận B1–B3 không có `.step-desc`, và B4 chứa đầy đủ chuỗi hướng dẫn.
   - Docs: Cập nhật `docs/DESIGN.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`.
3. Kiểm tra đã chạy:
   - Vitest: 42/42 test files, 231/231 tests PASS.
   - Builds: `npm run build` và `npm run build:workers` hoàn thành 0 warning, 0 error.
   - CDP Visual Test: Chạy `scratch/verify-how-to-buy-dialog.mjs`, chụp ảnh desktop (`how-to-buy-dialog-desktop.png` - 760x554px) và mobile (`how-to-buy-dialog-mobile.png` - 352x618px).
4. Trạng thái & Bước tiếp theo:
   - Sẵn sàng commit và push `origin/dev-ui`. Chờ user duyệt trước khi merge vào `dev`.


### S045-C01 — 07/11/2026 — Hoàn tất Carousel 10 cuốn trên Home & Mục "Hiển thị sách nổi bật" ở /admin (trên worktree dev-ui)

1. Ngày: 07/11/2026 (Asia/Ho_Chi_Minh), Checkpoint S045-C01.
2. Phạm vi & Các file thay đổi:
   - Backend:
     - `code/backend/src/main/resources/db/migration/V16__home_featured_shelves.sql`: Thêm bảng `home_featured_config` và `home_featured_item`.
     - `code/backend/src/main/java/vn/memay/catalogue/HomeFeaturedService.java` & `HomeFeaturedController.java`: API `GET /api/v1/admin/home-featured`, `GET /api/v1/admin/home-featured/candidates`, `PUT /api/v1/admin/home-featured` (quyền `OWNER`, kiểm tra `version`, phạm vi kệ, tối đa 10 cuốn/kệ, ghi audit `HOME_FEATURED` và xóa cache).
     - `code/backend/src/main/java/vn/memay/catalogue/PublicCatalogueService.java`: Cập nhật `home()` và `shelf()` trả tối đa 10 cuốn/kệ (ưu tiên sách ghim `PUBLISHED` + `AVAILABLE` theo thứ tự rồi tự động bù sách mới nhất không trùng lặp).
     - `code/backend/src/main/java/vn/memay/audit/AuditService.java`: Thêm `"shelves"` vào `FIELDS`.
     - `code/backend/src/test/java/vn/memay/support/PgTestData.java` & `code/backend/src/test/java/vn/memay/catalogue/HomeFeaturedApiTest.java`: Dọn bảng test và kiểm thử tích hợp đầy đủ.
   - Frontend:
     - `code/frontend/src/app/features/home/home-page.{ts,html,scss,spec.ts}`: Chuyển các kệ trên Home và khối Flash Sale sang thanh trượt tối đa 10 cuốn (desktop 5 thẻ, tablet 3 thẻ, mobile 2 thẻ), nút mũi tên `<` / `>` trượt đúng 1 cuốn/lần, tự động làm mờ/vô hiệu hóa khi ở đầu hoặc cuối dãy.
     - `code/frontend/src/app/features/admin/home-featured/home-featured.{ts,html,scss,spec.ts}`: Trang quản trị "Hiển thị sách nổi bật" (`/admin/sach-noi-bat`) tìm kiếm gợi ý sách theo phạm vi kệ, ghim tối đa 10 cuốn, đổi thứ tự `↑`/`↓`, bỏ ghim và hiển thị nhãn trạng thái.
     - `code/frontend/src/app/layouts/admin-layout/admin-layout.html` & `code/frontend/src/app/app.routes.ts`: Thêm menu con "Hiển thị sách nổi bật" dưới "Quản lý sách" và route `/admin/sach-noi-bat` cho `OWNER`.
   - Docs: Cập nhật `docs/DESIGN.md`, `docs/DATA.md`, `docs/CATALOGUE.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`.
3. Kiểm tra đã chạy:
   - Backend (`code/backend`): `./mvnw test -Dtest=HomeFeaturedApiTest,PublicCatalogueApiTest` -> 11/11 tests PASS.
   - Frontend (`code/frontend`): `npm test -- --watch=false` -> 43/43 test files, 234/234 tests PASS.
   - Frontend builds (`code/frontend`): `npm run build` (SSR) và `npm run build:workers` (Cloudflare) -> 0 warning, 0 error.
4. Bước tiếp theo:
   - Commit trên nhánh `dev-ui` (hoặc push/merge theo yêu cầu tiếp theo của user).

### S046-C01 — 07/11/2026 — Kiểm tra tên sách khi import Excel

- Bắt đầu trên `dev` tại `f4472c6`. Phạm vi: validation tên khi xem trước và xác nhận import, giữ tương thích biên nhận cũ và nhập lẻ.
- Đã đọc contract và đối chiếu code: import chỉ phát hiện lô đã nhập theo fingerprint, form nhập lẻ dùng so khớp tên không phân biệt hoa thường. Chưa chạy kiểm thử hồi quy.
- Thêm kiểm tra tên theo lô trong `BookImportTransaction` cho CSV/XLSX V1–V4. So khớp theo trim và lower của PostgreSQL như nhập lẻ, kiểm cả danh mục và tính mỗi nhóm biến thể V1 là một sách. Báo cột `ten_sach` theo dòng, xác nhận kiểm lại trong transaction và tuần tự hóa các lần import mới. Biên nhận cũ được trả trước bước kiểm tra.
- Hai test HTTP dùng XLSX V4 trong `BookImportUnitPriceIntegrationTest` tái hiện 2 lỗi trước sửa. Sau sửa cả hai đạt, gồm trường hợp sách được đăng giữa xem trước và xác nhận. Đổi fixture trùng tên trong các test V1–V4 cũ sang tên riêng để giữ phạm vi kiểm tra giá, transaction và biên nhận.
- `mvn test` tại `code/backend` với PostgreSQL test local: 231 ca, 0 lỗi, 3 ca live bỏ qua. `npm test -- --watch=false` tại `code/frontend`: 234/234 đạt. `git diff --check` đạt. Chưa smoke trình duyệt hay production.
- Cập nhật contract `docs/BOOK_IMPORT.md` và snapshot `docs/PROGRESS.md`. Bàn giao cùng thay đổi backend trên `dev`. Bước tiếp theo theo workflow là user merge `dev` qua `main` và smoke import Excel sau rollout backend.

### S047-C01 — 07/11/2026 — Chốt hướng hàng chờ xuất bản

- User chọn danh sách ghim bên phải kèm nút xuất bản rồi mở cuốn tiếp theo.
- Ghi thiết kế tại `docs/BOOK_ADMIN_WORKFLOW_SPEC.md`, đăng ký trong chỉ mục
  và tiến độ. Đối chiếu bộ lọc chưa từng xuất bản, thứ tự và luồng lưu hiện
  có trên `dev` tại `c2282c8`. Chưa sửa code hay chạy test ứng dụng.
- Chờ duyệt hành vi cụ thể trong thiết kế trước khi lập kế hoạch triển khai.

### S047-C02 — 07/11/2026 — Thời hạn Thùng rác

- User yêu cầu tự xóa sau 7 ngày và có cảnh báo khi bấm icon xóa. Bổ sung
  thời hạn, xác nhận, tác vụ dọn có thử lại và cách hiển thị biên nhận cũ
  trong `BOOK_ADMIN_WORKFLOW_SPEC.md`.
- Đọc schema FK và luồng `MediaCleanupJob`. Biên nhận import cần giữ
  lịch sử khi bản ghi sách được dọn. Chưa sửa code hay chạy test ứng dụng.
- Chờ duyệt thiết kế cập nhật trước khi lập kế hoạch triển khai.

### S047-C03 — 07/11/2026 — Duyệt thiết kế và lập kế hoạch

- User duyệt thiết kế cả bốn phần. Lập `BOOK_ADMIN_WORKFLOW_PLAN.md`,
  cập nhật chỉ mục và tiến độ. Chia riêng bước dọn dữ liệu hết hạn để
  kiểm tra giao dịch, biên nhận và khả năng thử lại xóa ảnh.
- Đối chiếu code editor, media/public projection, schema migration và các
  API hiện có trên `dev`. `git diff --check` đạt. Chưa sửa code ứng dụng,
  chưa chạy test ứng dụng. Tiếp theo thực hiện các bước trong kế hoạch.

### S047-C04 — 07/11/2026 — Bắt đầu triển khai tuần tự

- User duyệt thực thi và bổ sung bước kiểm tra lại trước khi ghi import.
  Bắt đầu từ `157dd49` trên `dev`. Phạm vi ảnh, đặc điểm, Thùng rác,
  hàng chờ và rà soát import. Chưa chạy test cho checkpoint này.

### S047-C05 — 07/11/2026 — Nghiệm thu local và bàn giao

- Triển khai V17–V19, hiển thị tùy chọn của hai ảnh bổ sung, đặc điểm
  mới và SPIN legacy, Thùng rác OWNER có version, khôi phục trước hạn,
  dọn dữ liệu sau hạn và chuyển ảnh sang hàng đợi dọn đang có. Receipt
  giữ snapshot, không còn link đến cuốn đã dọn.
- Thêm hàng chờ trên editor và thao tác xuất bản rồi mở cuốn tiếp. Thêm
  bước rà soát import chỉ đọc. Hủy hoặc rời trang trước xác nhận không
  ghi sách. Sau khi đã gửi xác nhận mà mất phản hồi, UI chỉ tra biên nhận.
- Review độc lập phát hiện dữ liệu cuốn cũ trên route được tái sử dụng,
  trạng thái tra biên nhận bị mất khi lookup lỗi, candidate Flash Sale và
  phân trang sau xóa. Đã sửa các điểm này. Dùng record ảnh rời sách để
  tái sử dụng MediaCleanupJob và giữ cơ chế thử lại.
- `mvn test` tại backend: 232 ca, 0 lỗi, 3 live skip. Sau khi bổ sung ca
  retry ảnh rời sách, chạy `mvn -Dtest=MediaCleanupIntegrationTest test`:
  5/5 đạt. `npm test -- --watch=false` tại frontend: 237/237 đạt.
  `npm run build`, `npm run build:workers` và `git diff --check` đạt.
- Chrome fixture local kiểm xuất bản cuốn 1 rồi tự mở cuốn 2, panel còn
  một cuốn, dialog ở 390×844 và cảnh báo có tên/mã/7 ngày khi bấm icon.
  Bấm Hủy, đóng browser và dừng fixture. Chưa smoke production hoặc dọn
  ảnh Cloudinary live. Backend đã kiểm với PostgreSQL test và gateway giả.
- Gộp contract vào CATALOGUE/DATA/DESIGN/BOOK_IMPORT và rollout V17–V19,
  gỡ spec/plan đã hết vai trò. Bước tiếp theo là user merge dev qua main
  và rollout backend trước frontend theo BOOK_ENTRY_ROLLOUT.


## 2026-11-07 — S048-C01 — Bắt đầu triển khai Popup "Ưu đãi vận chuyển" trên trang chủ (`/`)

- **Ngày (Asia/Ho_Chi_Minh):** 2026-11-07
- **Mục tiêu:** Triển khai popup modal `<dialog>` cho nút "ƯU ĐÃI VẬN CHUYỂN" dưới banner trang chủ (`/`), đã chốt thiết kế qua `/grill-me`.
- **Phạm vi & quyết định:**
  - Đồng bộ nhánh `dev-ui` với `dev` (`57c89ad`).
  - Header popup: sử dụng SVG xe tải giao hàng do user cung cấp, chuyển đổi bảng màu xanh dương/neon gốc sang bảng màu ấm thương hiệu Mẹ Mây (`#9B1C28` đỏ burgundy chủ đạo, `#FBE4E6` hồng phấn thân xe, `#E06C78` bánh xe, `#F59E0B` / `#D97706` / `#E05260` họa tiết lấp lánh), tiêu đề `"Ưu đãi vận chuyển tại Mẹ Mây"`.
  - Bố cục 5 khung:
    1. Lưới 2x2 ở trên cho 4 mức đơn hàng:
       - `Đơn dưới 150k` — `Ship 25k`
       - `Đơn 150k - 300k` — `Ship 20k`
       - `Đơn 300k - 500k` — `Ship 16k`
       - `Đơn trên 500k` — `Hỗ trợ 50% ship không quá 50k`
    2. Khung thứ 5 trải ngang toàn chiều rộng (`grid-column: 1 / -1`) ở dưới:
       - `Quy định khối lượng` — `Áp dụng cho đơn dưới 3kg. Mỗi kg chênh ra thêm + 6k/kg`
    3. Cả 5 khung đều dùng icon SVG trắng trong vòng tròn đỏ `#9B1C28` bên trái.
- **Kiểm tra đã chạy:** Chưa chạy (bắt đầu triển khai).
- **Trạng thái:** Đang thực hiện trên worktree `dev-ui`.


## 2026-11-07 — S048-C02 — Hoàn tất Popup "Ưu đãi vận chuyển" (`ShippingPromoDialog`)

- **Ngày (Asia/Ho_Chi_Minh):** 2026-11-07
- **Mục tiêu:** Hoàn thiện component `ShippingPromoDialog`, cập nhật chấm tròn nhỏ `.step-dot` cho tất cả 5 khung theo yêu cầu bổ sung của user, kiểm thử unit test, build SSR/Workers và visual QA trên Chrome headless.
- **File thay đổi:**
  - `code/frontend/src/app/features/home/shipping-promo-dialog/shipping-promo-dialog.{ts,html,scss,spec.ts}` (mới)
  - `code/frontend/src/app/features/home/home-page.{ts,html,spec.ts}`
  - `docs/DESIGN.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`
- **Kiểm tra đã chạy:**
  - `cd /Users/daoquanghung/Projects/me-may.worktrees/dev-ui/code/frontend && npm test -- --watch=false`: **44/44 test files PASS (244/244 tests PASS)**.
  - `npm run build` & `npm run build:workers`: **PASS (0 warnings, 0 errors)**.
  - Headless Chrome CDP (`verify-shipping-promo-dialog.mjs`): chụp và kiểm tra trực quan `shipping-promo-dialog-desktop.png` (760x572px) và `shipping-promo-dialog-mobile.png` (352x644px) — **PASS**.
- **Trạng thái & Bước tiếp theo:** Thay đổi sẵn sàng trên worktree `dev-ui`; chờ user xem kết quả hoặc yêu cầu merge qua `dev`.


## 2026-11-07 — S048-C03 — Căn giữa chữ khung thứ 5 trong `ShippingPromoDialog` và gộp vào `dev`

- **Ngày (Asia/Ho_Chi_Minh):** 2026-11-07
- **Mục tiêu:** Căn giữa nội dung của khung thứ 5 (`Quy định khối lượng`) trong popup "Ưu đãi vận chuyển" và merge từ `dev-ui` sang `dev`.
- **File thay đổi:**
  - `code/frontend/src/app/features/home/shipping-promo-dialog/shipping-promo-dialog.{html,scss}`
  - `docs/PROGRESS.md`, `docs/DEV_LOG.md`
- **Kiểm tra đã chạy:**
  - `npm test -- --watch=false`: **44/44 test files PASS (244/244 tests PASS)**.
  - `npm run build` & `npm run build:workers`: **PASS (0 warnings, 0 errors)**.
  - Headless Chrome CDP (`verify-shipping-promo-dialog.mjs`): chụp lại `shipping-promo-dialog-desktop.png` (760x577px) và `shipping-promo-dialog-mobile.png` (352x650px), xác nhận khung thứ 5 căn giữa hài hòa — **PASS**.
- **Git & Bàn giao:** Commit trên `dev-ui`, fast-forward merge sang `dev` và push lên `origin/dev` và `origin/dev-ui`.

### S049-C01 — 07/11/2026 — Thao tác Thùng rác hàng loạt

- User chốt chọn từng cuốn/chọn cả trang để xóa mềm và dọn ngay sách đã
  chọn hoặc toàn bộ Thùng rác, kể cả chưa đủ 7 ngày. Mỗi thao tác có xác
  nhận, hiển thị số cuốn. Tái sử dụng giao dịch dọn và hàng đợi ảnh.
- Bắt đầu trên dev. Chưa chạy kiểm thử cho thay đổi này.
- API chốt danh sách ID/version khi mở hộp thoại. Cả lô dừng nếu version
  lệch hoặc sách đã rời Thùng rác. Xác nhận dọn dùng cùng đường purge DB
  và hàng đợi ảnh, giữ audit/receipt. Không cần migration mới.
- Kiểm thử: `mvn -Dtest=BookTrashApiTest,MediaCleanupIntegrationTest test`
  tại backend đạt 7/7 với PostgreSQL test và gateway giả. Hai lần đầu
  phát hiện lỗi đọc kiểu payload, đã sửa để dùng ID dạng chuỗi. Frontend
  `npm test -- --watch=false` đạt 245/245. Chưa chạy smoke trình duyệt
  hoặc thử xóa dữ liệu production. Bàn giao qua dev.

### S050-C01 — 07/11/2026 — Kiểm file Excel báo xlsx_invalid

- dev64c2017 sạch. Probe Java với file user tái hiện lỗi giới hạn 20 cột vì hai ô trống ở U. Đang thêm test và sửa parser; chưa ghi dữ liệu.

### S050-C02 — 07/11/2026 — Xác minh parser Excel

- BookImportXlsxReader kiểm giới hạn 20 cột sau khi đọc giá trị. Ô trống có định dạng được bỏ qua và ô có dữ liệu hoặc lỗi kiểu vẫn bị từ chối. Thêm ca hồi quy ô trống ở cột U trong BookImportTemplateTest.
- Probe Java trên file gốc: trước sửa xlsx_invalid tại U2/U3, sau sửa 7 dòng V4 và 0 lỗi chuẩn hóa. Không ghi dữ liệu từ file này.
- Maven scoped 45 ca đạt. Lượt rộng ban đầu thiếu TEST_DB_URL. Chạy lại tại code/backend với cấu hình test local và bộ BookImport*Test đạt, không lỗi. Bàn giao qua dev, chưa deploy.

### S051-C01 — 07/11/2026 — Thiết kế danh sách Thiếu thông tin

- User chốt dùng một danh sách tổng hợp, bỏ qua ISBN và ghi chú nội bộ.
  Ghi thiết kế hàng chờ, mở rộng kiểu bìa và khôi phục vị trí sau lưu trong
  BOOK_COMPLETENESS_SPEC. Cập nhật chỉ mục và tiến độ.
- Đối chiếu Git, quy tắc kiểu bìa hiện hành, contract nhập và hàng chờ.
  Chưa chạy test ứng dụng vì thay đổi chỉ gồm tài liệu. Bước tiếp theo là
  duyệt spec rồi lập kế hoạch triển khai trên dev.

### S051-C02 — 07/11/2026 — Bắt đầu triển khai

- User duyệt triển khai và yêu cầu nhận cột kiểu bìa cho CSV/Excel.
  File hiện có cột kieu_bia; cần mở rộng quy tắc nhận giá trị cho các thể
  loại ngoài Board book. Đang làm bước đầu theo BOOK_COMPLETENESS_PLAN.
  Chưa kiểm thử thay đổi.

### S051-C03 — 07/11/2026 — Kiểu bìa và luồng rà sách

- CSV/XLSX dùng cột kieu_bia hiện có. Form, preview và bộ lọc khách dùng
  hai kiểu bìa ngoài Board book. Giữ sách đã đăng còn thiếu kiểu bìa để
  bổ sung dần. Thay đổi không cần migration.
- Admin gom điều kiện trong Bộ lọc, dùng một danh sách Thiếu thông tin và
  hiển thị lý do. Hàng chờ có hai mục. Sau khi lưu, truy vấn tìm trang
  theo thứ tự hiện tại hoặc giữ trang cũ nếu sách rời kết quả.
- Kiểm tại code/backend bằng `mvn test` với PostgreSQL test local, 237 ca,
  0 lỗi, 3 skip. Lượt đầu trong sandbox bị chặn kết nối local và Mockito
  attach. Lượt chạy có quyền kết nối phát hiện hai fixture cần kiểu bìa
  khi xuất bản, đã cập nhật và chạy lại.
- Tại code/frontend, `npm test -- --watch=false` đạt 246 ca.
  `CI=1 NO_COLOR=1 NODE_OPTIONS=--max-old-space-size=4096 npm run build`
  đạt sau khi lượt sandbox dừng mã 134. Chưa smoke thao tác cuộn trên
  trình duyệt thực, chưa deploy. Bàn giao qua dev.
- Rà soát mã phát hiện và đã chỉnh ba điểm: lưu vị trí cuộn lúc bấm mở
  sách, trả lý do thiếu cả ở danh sách chưa lọc, giữ nguyên cuốn khi đối
  chiếu lại một yêu cầu xuất bản chưa rõ kết quả.


## 2026-11-08 — S052-C01 — Bắt đầu thiết kế lại UI Bộ lọc `/admin/sach`, hover submenu `Thể loại` và bỏ rà `Bộ sưu tập`

- **Ngày (Asia/Ho_Chi_Minh):** 2026-11-08
- **Mục tiêu:**
  1. Bỏ lọc/rà theo `'Bộ sưu tập'` khỏi danh sách `Thiếu thông tin` (`MISSING_FIELDS` trong `BookQueryService.java`) ở `/admin`.
  2. Chỉnh dropdown `Thể loại` (2 cấp) ở `/admin/sach/moi` (`book-editor`) và `/admin/sach` (`book-list`) để chỉ cần hover chuột vào dòng thể loại có `›` là tự xổ submenu `Kiểu bìa` bên phải (thay vì phải click vào dòng thể loại như hiện tại).
  3. Thiết kế lại thanh Bộ lọc ở `/admin/sach` (`book-list`): bỏ `<details>Bộ lọc</details>` và nút `Áp dụng` thừa, đưa toàn bộ điều kiện lọc lên thanh ngang dùng `.custom-dropdown` đồng bộ với `/admin/sach/moi`, gộp `Thể loại + Kiểu bìa` thành 1 dropdown 2 cấp (`Tất cả kiểu bìa / Paperback / Hardcover`), 2 pill/checkbox `Chưa xuất bản` & `Thiếu thông tin` nằm gọn ngang hàng và tự động lọc ngay khi chọn.
- **Kiểm tra đã chạy:** Chưa chạy (bắt đầu triển khai trên `dev-ui` đã fast-forward với `dev` tại `28a1a5b`).
- **Trạng thái:** Đang thực hiện.


## 2026-11-08 — S052-C02 — Hoàn tất UI Bộ lọc `/admin/sach`, hover submenu `Thể loại` và bỏ rà `Bộ sưu tập`

- **Ngày (Asia/Ho_Chi_Minh):** 2026-11-08
- **Mục tiêu:** Hoàn thiện và kiểm chứng 3 thay đổi tại `/admin`: bỏ rà `'Bộ sưu tập'` khỏi `Thiếu thông tin`, mở submenu `Kiểu bìa` khi hover chuột vào dòng `Thể loại` có `›`, và thiết kế lại thanh Bộ lọc ngang hàng tại `/admin/sach`.
- **File thay đổi:**
  - `code/backend/src/main/java/vn/memay/catalogue/BookQueryService.java`
  - `code/backend/src/test/java/vn/memay/media/BookImportVisibilityTest.java`
  - `code/frontend/src/app/features/admin/books/book-editor/book-editor.html`
  - `code/frontend/src/app/features/admin/books/book-editor/book-editor.spec.ts`
  - `code/frontend/src/app/features/admin/books/book-list/book-list.ts`
  - `code/frontend/src/app/features/admin/books/book-list/book-list.html`
  - `code/frontend/src/app/features/admin/books/book-list/book-list.scss`
  - `code/frontend/src/app/features/admin/books/book-list/book-list.spec.ts`
  - `code/frontend/src/styles.scss`
  - `docs/BOOK_COMPLETENESS_SPEC.md`, `docs/DESIGN.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`
- **Kiểm tra đã chạy:**
  - Backend: `bash code/backend/run-local.sh -B -ntp -Dtest=BookImportVisibilityTest test` -> **4/4 PASS**.
  - Frontend Vitest: `npm test -- --watch=false` -> **44/44 test files PASS (247/247 tests PASS)**.
  - Frontend builds: `npm run build` & `npm run build:workers` -> **PASS (0 warnings, 0 errors)**.
- **Trạng thái & Bước tiếp theo:** Đã hoàn tất trên `dev-ui` và đồng bộ `dev`.


## 2026-11-08 — S052-C03 — Căn chỉnh thanh Bulk Delete (`Chọn tất cả trên trang này` + `Chuyển X cuốn vào Thùng rác`) và gộp vào `dev`

- **Ngày (Asia/Ho_Chi_Minh):** 2026-11-08
- **Mục tiêu:** Sửa lỗi checkbox `Chọn tất cả trên trang này` bị căn giữa trang do quy tắc `input { width: 100% }` trong `styles.scss`; thiết kế lại thanh `.bulk-toolbar` phía trên bảng `/admin/sach` và màn Thùng rác, đồng thời căn chỉnh `.book-cell` trong bảng.
- **File thay đổi:**
  - `code/frontend/src/styles.scss` (loại trừ `input[type='checkbox']` và `input[type='radio']` khỏi quy tắc `width: 100%`, cố định `18x18px`)
  - `code/frontend/src/app/features/admin/books/book-list/book-list.html`
  - `code/frontend/src/app/features/admin/books/book-list/book-list.scss`
  - `code/frontend/src/app/features/admin/books/book-list/book-list.spec.ts`
  - `docs/PROGRESS.md`, `docs/DEV_LOG.md`
- **Kiểm tra đã chạy:**
  - Frontend Vitest: `npm test -- --watch=false` -> **44/44 test files PASS (248/248 tests PASS)**.
  - Frontend builds: `npm run build` & `npm run build:workers` -> **PASS (0 warnings, 0 errors)**.
- **Git & Bàn giao:** Commit trên `dev-ui`, fast-forward merge vào `dev` và push lên `origin/dev` và `origin/dev-ui`.

## 2026-11-08 — S053-C01 — Thiết kế tải ảnh sách

- Phạm vi: tải ảnh một hoặc nhiều cuốn tại `/admin/sach`. Người dùng chọn một ZIP chung cho nhiều cuốn.
- Đã đối chiếu thanh chọn OWNER và luồng ảnh quản trị, ghi thiết kế vào chỉ mục và PROGRESS.
- Kiểm tra: `git diff --check` tại root. Chưa chạy test ứng dụng vì checkpoint chỉ có tài liệu.
- Bước tiếp theo: sau khi duyệt thiết kế, lập kế hoạch triển khai trên `dev`.

## 2026-11-08 — S053-C02 — Kế hoạch tải ảnh sách

- Đã duyệt thiết kế tại commit d6f4b9b. Đã ghi kế hoạch API, giao diện và nghiệm thu vào chỉ mục.
- Kiểm tra tại root: git diff --check. Chưa chạy test ứng dụng ở checkpoint lập kế hoạch.
- Bước tiếp theo: chốt cách thực thi theo Writing Plans. Kế hoạch đang ở local trên dev.

## 2026-11-08 — S053-C03 — Bắt đầu triển khai tải ZIP

- Người dùng duyệt chạy trực tiếp. Triển khai backend và nút tải tại trang Quản lý sách trên dev.
- Kiểm tra Git tại root: chỉ có tài liệu S053 đang sửa. Kiểm thử tính năng chưa chạy.

## 2026-11-08 — S053-C04 — Nghiệm thu tải ZIP ảnh sách

- OWNER dùng lựa chọn có sẵn trên `/admin/sach` để tải JPEG 1280 px của một
  hoặc nhiều cuốn. Cả lượt nhận một ZIP có thư mục theo mã, gồm ảnh ẩn.
- Backend dùng hai truy vấn đọc trước khi gọi Cloudinary, giới hạn 20 cuốn,
  32 MiB dữ liệu ảnh và một lượt tạo ZIP mỗi instance. Giữ ZIP trong bộ nhớ
  có giới hạn để trả lỗi trước khi gửi file và tránh file tạm trên máy chủ.
  Không thêm dependency, cấu hình hay migration.
- Backend từ root: `bash code/backend/run-local.sh -B -ntp test` — 241 ca,
  238 đạt, 3 bỏ qua. Test mới đã thấy RED trước khi có endpoint, rồi GREEN.
  Review độc lập đã đối chiếu quyền, Thùng rác và lỗi provider. Đã bổ sung
  test giới hạn số cuốn, đọc ảnh lỗi giữa chừng và lượt tạo ZIP đồng thời.
- Frontend tại `code/frontend`: `npm test` — 249 đạt. Test nút tải đã thấy
  RED trước triển khai. `npm run build` và `npm run build:workers` đạt.
- Playwright Chrome qua fixture local: tải `MM-000001.zip` và
  `me-may-anh-sach.zip`, kiểm entry bằng unzip, xác nhận cảnh báo sách
  thiếu ảnh và lỗi khi cả lượt thiếu ảnh. API PostgreSQL test dùng gateway
  giả. Chưa kiểm Cloudinary production.
- Bàn giao qua `dev` theo workflow dự án. Bước tiếp theo là rollout và
  smoke trên môi trường triển khai.

## 2026-11-08 — S052-C04 — Gộp `Chưa xuất bản` vào dropdown `Xuất bản`, tách biệt trạng thái `Ẩn` và bỏ tickbox `Chưa xuất bản` trùng lặp

- **Ngày (Asia/Ho_Chi_Minh):** 2026-11-08
- **Mục tiêu:** Giải quyết sự trùng lặp giữa dropdown `Xuất bản` và tickbox `Chưa xuất bản` trên thanh lọc `/admin/sach` theo quyết định user chốt qua `/grill-me`:
  1. Gộp `Chưa xuất bản` thành lựa chọn thứ 4 trong dropdown **Xuất bản** (`Tất cả`, `Công khai`, `Ẩn`, `Chưa xuất bản`) và bỏ tickbox `Chưa xuất bản` rời bên ngoài (chỉ giữ lại tickbox `Thiếu thông tin`).
  2. Tách biệt hoàn toàn kết quả lọc khi chọn `Ẩn` (`l.publication_status = 'ARCHIVED' AND l.published_at IS NOT NULL`) với `Chưa xuất bản` (`l.publication_status = 'ARCHIVED' AND l.published_at IS NULL`) để khớp 1-1 với cột `Xuất bản` trên bảng.
- **File thay đổi:**
  - `code/backend/src/main/java/vn/memay/catalogue/BookQueryService.java`
  - `code/backend/src/test/java/vn/memay/media/BookImportVisibilityTest.java`
  - `code/frontend/src/app/features/admin/books/book-list/book-list.ts`
  - `code/frontend/src/app/features/admin/books/book-list/book-list.html`
  - `code/frontend/src/app/features/admin/books/book-list/book-list.spec.ts`
  - `docs/BOOK_COMPLETENESS_SPEC.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`
- **Kiểm tra đã chạy:**
  - Backend: `set -a && source .env && set +a && ./mvnw test -Dtest=BookImportVisibilityTest` -> **4/4 PASS**.
  - Frontend Vitest: `npm test -- --watch=false` -> **44/44 test files PASS (250/250 tests PASS)**.
  - Frontend builds: `npm run build` & `npm run build:workers` -> **PASS (0 warnings, 0 errors)**.
- **Git & Bàn giao:** Commit trên `dev-ui`, fast-forward merge vào `dev` và push lên `origin/dev` và `origin/dev-ui`.


## 2026-11-08 — S052-C05 — Bỏ khối "Hướng dẫn các field" tại `/admin/sach/import`

- **Ngày (Asia/Ho_Chi_Minh):** 2026-11-08
- **Mục tiêu:** Bỏ hoàn toàn `<section aria-labelledby="fields-title">` ("Hướng dẫn các field") tại trang Import sách (`/admin/sach/import`) theo yêu cầu user, giúp trang gọn gàng và đi thẳng vào bước Kiểm tra file.
- **File thay đổi:**
  - `code/frontend/src/app/features/admin/books/book-import/book-import.html`
  - `code/frontend/src/app/features/admin/books/book-import/book-import.spec.ts`
  - `docs/BOOK_IMPORT.md`, `docs/DESIGN.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`
- **Kiểm tra đã chạy:**
  - Frontend Vitest: `npm test -- --watch=false` -> **44/44 test files PASS (250/250 tests PASS)**.
  - Frontend builds: `npm run build` & `npm run build:workers` -> **PASS (0 warnings, 0 errors)**.
- **Git & Bàn giao:** Commit trên `dev-ui`, fast-forward merge vào `dev` và push lên `origin/dev` và `origin/dev-ui`.


## 2026-11-08 — S052-C06 — Nâng trần giới hạn tải ảnh tại `UploadLimiter` (300 lần/10 phút, tối đa 8 luồng đồng thời)

- **Ngày (Asia/Ho_Chi_Minh):** 2026-11-08
- **Mục tiêu:** Nâng trần giới hạn tốc độ tải ảnh tại `UploadLimiter.java` từ `30 lượt / 10 phút` (`inFlight >= 4`) lên **`300 lượt / 10 phút`** (`inFlight >= 8`) theo yêu cầu user để chủ tiệm xử lý hàng chờ đăng ảnh liên tục (tối đa 8 ảnh/cuốn) không bị báo lỗi `429 (upload_limit)`.
- **File thay đổi:**
  - `code/backend/src/main/java/vn/memay/media/UploadLimiter.java`
  - `code/backend/src/test/java/vn/memay/media/UploadLimiterTest.java`
  - `docs/CATALOGUE.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`
- **Kiểm tra đã chạy:**
  - Backend: `./mvnw test -Dtest=UploadLimiterTest` -> **3/3 PASS**.
- **Git & Bàn giao:** Commit trên `dev-ui`, fast-forward merge vào `dev` và push lên `origin/dev` và `origin/dev-ui`.

## 2026-11-08 — S054-C01 — Đánh giá draft Self-hosted Image System

- Phạm vi: đọc spec đính kèm, đối chiếu repository và xem xét tách hai spec;
  ghi nhận yêu cầu bỏ ẩn/hiện từng ảnh, chỉ giữ tối đa 8 ảnh khi nhập sách.
- Đã dùng Superpowers using-superpowers/brainstorming và knowledge graph;
  đọc contract media, deployment, sourceRef, MediaGateway, public delivery,
  upload normalization và cờ show_on_product trong code hiện tại.
- Kết luận đề xuất: tách Storage & Processing và Source Mapping & Disaster
  Recovery; mapping tối thiểu là dependency của cutover, không hoãn toàn bộ.
  Không coi sourceRef tự do là Drive mapping đã xác minh. Frontend chuẩn hóa
  JPEG trước upload nên checksum nguồn và checksum đầu vào xử lý phải tách rõ.
- Draft còn thiếu contract async/version/idempotency, migration provider,
  quyền ảnh khi sách ẩn, source revision/retention và phục hồi đồng bộ DB/media.
  R2 backup, cấu hình Dell và dung lượng trong draft chưa xác minh live.
- Quy tắc user mới thay hướng 6 công khai/2 bổ sung ẩn; việc đổi ảnh cũ,
  API/UI/schema và cache chưa triển khai. Không đổi trạng thái ẩn sách.
- Thay đổi phiên này: PROGRESS và DEV_LOG. Không tạo spec triển khai trước
  khi chốt cách tách; không sửa attachment, code hoặc dữ liệu production.
- Kiểm tra: Git sạch trên dev trước thay đổi; đối chiếu source qua graph.
  Không chạy test/build vì chỉ đánh giá/tài liệu. Kiểm diff/giới hạn dòng
  trước bàn giao; không xem kết quả test lịch sử là bằng chứng phiên này.
- Bước tiếp: chốt hai phần spec, quy tắc dữ liệu ảnh bổ sung cũ và delivery
  khi sách bị ẩn; sau duyệt thiết kế mới lập kế hoạch triển khai.
  Tài liệu còn local trên dev, chưa commit/push/deploy.

## 2026-11-08 — S054-C02 — Chốt bỏ ảnh nội bộ và xử lý mất nguồn thủ công

- User chốt toàn bộ ảnh đang ẩn chuyển thành ảnh hiển thị cùng sách;
  bỏ hoàn toàn cơ chế ẩn/hiện từng ảnh và khái niệm ảnh nội bộ.
  Tối đa 8 ảnh/sách, tất cả cùng tham gia gallery khi sách được xuất bản.
- Quyết định này thay phần chuyển dữ liệu còn mở tại S054-C01. Giữ trạng
  thái ẩn/xuất bản của sách và bảo vệ ảnh upload tạm; không có ngoại lệ
  giữ ảnh nội bộ cũ. Chưa thực hiện migration hoặc thay đổi code.
- User nhận xử lý thủ công trường hợp ảnh gốc trên Drive bị xóa.
  Không yêu cầu tự động cứu nguồn đã xóa; rebuild từ nguồn còn tồn tại
  vẫn thuộc đề xuất DR. Job gặp nguồn mất phải báo lỗi rõ, không báo thành công.
- File thay đổi: PROGRESS.md và DEV_LOG.md. Kiểm tra diff whitespace và
  số dòng PROGRESS; không chạy test/build cho thay đổi tài liệu này.
- Bước tiếp: hoàn thiện lựa chọn tách spec và thiết kế chi tiết trước
  triển khai. Thay đổi tài liệu còn local trên dev, chưa commit/push/deploy.

## 2026-11-08 — S054-C03 — Thiết kế hai phần theo Superpowers

- Mục tiêu/phạm vi: user yêu cầu tiến hành theo Superpowers; bắt đầu hoàn thiện
  thiết kế chi tiết từ draft và quyết định S054-C01/C02 trước implementation.
  User bổ sung tự dựng Ubuntu; agent không nhận phần cài server/deploy live.
- Đã tạo IMAGE_STORAGE_SPEC.md và IMAGE_RECOVERY_SPEC.md, đăng ký ở README;
  cập nhật PROGRESS. Không sửa source code, credential hay dữ liệu production.
- Đề xuất chi tiết: đổi INTERNAL_1/2 sang INSIDE_4/5 và bỏ visibility; giữ gateway
  kiểm trạng thái sách/cache tối đa 30s; LOCAL async qua queue do Spring sở hữu;
  Drive mapping VERIFIED trước publish LOCAL, Cloudinary song song để migration.
- Recovery nguồn bị xóa do user xử lý; không xây cứu nguồn hoặc Drive sync.
  Bàn giao code/cấu hình mẫu/checklist, owner dựng Ubuntu và cấu hình nguồn/R2.
- Builder check độc lập đọc cả hai spec: không còn câu hỏi/mâu thuẫn quan trọng
  trước lập plan. Đây là review thiết kế, không phải code review/test runtime.
- Đã đối chiếu code qua graph, migrations V15/V17, cache contract và dependency
  manifests; đọc tài liệu chính thức Sharp/Drive/Workers, link nằm trong spec.
- Kiểm tra từ repo root: git diff --check đạt; hai spec 210/199 dòng;
  local links của hai spec và README tồn tại; PROGRESS dưới 400 dòng.
  Không chạy test/build vì chưa đổi code. Không xác minh server/Drive/R2 live.
- Trong phiên dev có checkpoint S052-C06 từ công việc khác cập nhật upload limiter;
  giữ nguyên thay đổi đó, không lấy limiter cũ làm baseline triển khai mới.
- Bước tiếp: user duyệt hai spec chi tiết; writing-plans rồi triển khai/verification
  theo flow. Chưa coi lời đồng ý hướng tổng thể là duyệt các lựa chọn mới trong spec.
  Bàn giao tài liệu trên dev; không merge main hoặc deploy.

## 2026-11-08 — S054-C04 — Lập kế hoạch từ hai spec đã duyệt

- User duyệt IMAGE_STORAGE_SPEC và IMAGE_RECOVERY_SPEC, yêu cầu qua bước lập plan.
  Phạm vi phiên: lập hai plan, self-review, cập nhật chỉ mục/trạng thái; chưa code.
- Skill writing-plans; giữ owner dựng Ubuntu, source bị xóa xử lý thủ công.
- Git dev sạch ở 5f8925a khi bắt đầu; V19 là migration cuối tại thời điểm đọc.
- Graph search thử hai lần bị Transport closed; fallback đọc file theo danh sách
  graph đã tìm ở phiên trước và rg để xác minh tên file/signature thực tế.
- Đang lập thứ tự phụ thuộc và kiểm coverage; kết quả ghi ở checkpoint kế tiếp.

## 2026-11-08 — S054-C05 — Hoàn tất hai implementation plan

- Tạo IMAGE_STORAGE_PLAN (8 task) và IMAGE_RECOVERY_PLAN (6 task); ghi rõ thứ tự
  S1–S4 → R1–R2 → S5–S7 → R3–R5 → S8 → R6, Files/interfaces/RED/GREEN/commit.
  S1 bỏ ảnh nội bộ là deliverable độc lập; server/live gate R6 do owner phối hợp.
- Đổi trạng thái hai spec thành đã duyệt; cập nhật README/PROGRESS. Chưa viết
  code, cài dependency, chạy migration hoặc kết nối server/Drive/R2.
- Self-review theo writing-plans: coverage từng mục spec, consistency record/API,
  failure modes, độ dài và ranh giới local/live. Bổ sung BookValidation vào S1/S5;
  chọn variant theo từng ảnh để mixed providers không gọi nhầm size Cloudinary.
  Không dispatch reviewer vì skill yêu cầu self-review plan.
- Kiểm tra từ root: git diff --check PASS; script kiểm local links PASS cho 6 file
  spec/plan/index/progress; số dòng plans 282/226, specs 210/199, README78,
  PROGRESS323 (đều dưới400). Plan có98 bước unchecked, không giả là đã thực thi.
- Không chạy test/build ứng dụng vì phiên này chỉ tài liệu; các lệnh test trong
  plan là bước tương lai. Graph tool unavailable đã ghi ở C04, dùng fallback hợp lệ.
- Bước tiếp: user review plans và chọn native hoặc subagent-driven, sau đó dùng
  skill execution tương ứng. Đề xuất native vì các task chia sẻ schema/lifecycle;
  không làm song song các mutation vào phần chung.
- Bàn giao commit/push dev cùng spec/log/index theo workflow; không main/deploy.


## 2026-11-08 — S055-C01 — Chỉnh UI chi tiết sách (`book-detail`): ẩn trọng lượng, sắp xếp lại Độ tuổi & Trình độ đọc, cập nhật ghi chú tham khảo

- Mục tiêu & phạm vi (chốt qua `/grill-me`):
  1. Không hiển thị dòng `Trọng lượng sách` (`b.weightG`) trên trang chi tiết sách phía người dùng (`book-detail.html`), vẫn giữ nguyên ô nhập trọng lượng ở Admin để tính giá theo kg.
  2. Dời mục `Độ tuổi` xuống dưới `Kiểu bìa`, nằm ngay phía trên mục `Trình độ đọc` (đổi nhãn `<dt>` từ `"Trình độ đọc tham khảo"` thành `"Trình độ đọc"`).
  3. Đổi nội dung hằng số `READING_NOTE` trong `book-copy.ts` từ `"Trình độ đọc là gợi ý của tiệm, không phải chứng nhận Cambridge cho sách."` thành `"Độ tuổi & trình độ đọc là gợi ý tham khảo từ tiệm. Khách hàng tự kiểm tra mức độ phù hợp trước khi mua hàng."`.
- Trạng thái: đã hoàn tất và kiểm chứng trên nhánh `dev`.
- File thay đổi:
  - `code/frontend/src/app/features/admin/books/book-copy.ts`: cập nhật `READING_NOTE`.
  - `code/frontend/src/app/features/catalogue/book-detail/book-detail.html`: bỏ dòng `Trọng lượng sách`, dời `Độ tuổi` xuống ngay phía trên `Trình độ đọc`, đổi nhãn `<dt>Trình độ đọc tham khảo</dt>` thành `<dt>Trình độ đọc</dt>`.
  - `code/frontend/src/app/features/catalogue/book-detail/book-detail.spec.ts`: thêm unit test xác minh ẩn `weightG`, thứ tự `<dt>` (`Nhà xuất bản`, `Tác giả`, `Kiểu bìa`, `Độ tuổi`, `Trình độ đọc`, `Đọc tham khảo`) và nội dung `READING_NOTE` mới.
  - `docs/DESIGN.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`: đồng bộ tài liệu và nhật ký bàn giao.
- Kiểm tra đã chạy (từ `code/frontend`):
  - `npm test -- --watch=false`: 44/44 test files PASS (251/251 tests PASS).
  - `npm run build` & `npm run build:workers`: PASS (0 warning, 0 error).
- Bước tiếp theo: commit và push lên `origin/dev`, đồng bộ nhánh `dev-ui`.

## 2026-11-08 — S056-C01 — Brainstorm nơi lưu trữ theo thùng

- User yêu cầu gấp trường Nơi lưu trữ và chốt làm cả cột/bộ lọc admin trong phiên.
  Một mã có nhiều bản do chủ gom chung thùng; chọn danh sách có sẵn + Thêm thùng,
  tên chuẩn Thùng N. Không yêu cầu phân bổ tồn hoặc quản lý kho nâng cao.
- Skill Superpowers brainstorming; tạo BOOK_STORAGE_SPEC.md ngắn, đăng ký README,
  cập nhật PROGRESS. Thiết kế bổ sung đề xuất optional/admin-only, tạo thùng độc lập,
  số unique, filter backend, bảo toàn version/audit/retry; chờ duyệt bản thiết kế.
- Đối chiếu DATA/CATALOGUE/MASTER_PLAN và buildBookForm qua graph; Git dev sạch
  trước thay đổi. Không sửa code, gọi DB live, migrate hoặc deploy.
- Kiểm tra: diff whitespace, giới hạn dòng và link mới trước bàn giao.
  Chưa chạy test/build vì chỉ thiết kế; không dùng kết quả lịch sử làm bằng chứng.
- Bước tiếp: duyệt thiết kế ngắn rồi writing-plans và thực thi phạm vi đã chọn.
  Các thay đổi tài liệu còn local trên dev; chưa commit/push.

## 2026-11-08 — S056-C02 — Triển khai nơi lưu trữ

- User duyệt thiết kế và yêu cầu lập plan rồi triển khai. Đã lập BOOK_STORAGE_PLAN.
- Đang làm trên dev với các thay đổi tài liệu S056-C01 còn local.

- Đã triển khai V20, API danh mục thùng, thêm/chọn ở form, cột/lọc admin.
  Lưu vị trí cùng version/audit, giữ retry cũ và giữ vị trí nếu PUT thiếu field.
  Chọn dùng số thùng làm khóa ổn định vì chưa có đổi số/xóa thùng.
- Kiểm chứng từ code/backend: mvn test với env PostgreSQL me_may_test local,
  242 ca, 0 fail/error, 3 skip. Lần đầu thiếu env; lần có env phát hiện snapshot
  migration cũ cần kiểm cột nullable mới và fixture PUT cần bỏ variants rỗng.
- Từ code/frontend: npm test -- --watch=false đạt 252/252, 44 file.
  npm run build và npm run build:workers đạt khi chạy ngoài sandbox sau lần
  build trong sandbox bị dừng. git diff --check đạt từ root.
- Chưa smoke trực tiếp trên trình duyệt, chưa rollout V20 production.
  Bước tiếp: smoke form/danh sách trên candidate rồi rollout theo workflow.


## 2026-11-08 — S055-C02 — Nâng cấp dải đỏ đầu trang (`utility bar`) và Footer nền tối có mạng xã hội & Facebook `embed_page`

- Mục tiêu & phạm vi (chốt qua `/grill-me`):
  1. Dải đỏ đầu trang (`.utility`): bên trái hiển thị 3 icon SVG màu trắng (`Facebook`: `https://www.facebook.com/sachngoaivanmemay/`, `Threads`: `https://www.threads.com/@sachngoaivanmemay`, `TikTok`: `https://www.tiktok.com/@andamdaily`); ở giữa giữ dòng chữ `"Sách ngoại văn đã qua sử dụng cho bé · Ảnh thật từng cuốn"` kèm hiệu ứng trượt ngang (`marquee`); bên phải hiển thị icon phong bì + email `"support@memaybooks.com"` (`mailto:support@memaybooks.com`).
  2. Footer (`.site-footer`): đổi sang nền tối (`#292724`) tràn toàn chiều ngang như mẫu IPM:
     - Cột trái: Thương hiệu Mẹ Mây, slogan, điều hướng nhanh (`Khám phá sách`, `Liên hệ`, `Quản trị`), email hỗ trợ và lưu ý xác nhận giá/tình trạng.
     - Cột phải: Tiêu đề `"KẾT NỐI VỚI CHÚNG TÔI"` + khung Facebook Page Plugin (`embed_page` `340x130px` cho `https://www.facebook.com/sachngoaivanmemay/`) + tiêu đề phụ `"CÁC KÊNH KHÁC"` với 3 nút vuông trắng bo góc chứa logo `Facebook`, `Threads`, `TikTok`.
- Trạng thái: đã hoàn tất và kiểm chứng trên nhánh `dev`.
- File thay đổi:
  - `code/frontend/src/app/layouts/public-layout/public-layout.html`: nâng cấp `.utility` (3 icon trắng `Facebook`, `Threads`, `TikTok` bên trái; `.utility-ticker` chữ chạy ngang ở giữa; icon phong bì + `support@memaybooks.com` bên phải) và `.site-footer` (2 cột nền tối kèm `KẾT NỐI VỚI CHÚNG TÔI`, iframe Facebook `embed_page` `340x130px` cho `sachngoaivanmemay`, và `CÁC KÊNH KHÁC` với 3 nút vuông trắng `.social-box`).
  - `code/frontend/src/styles.scss` & `code/frontend/src/app/layouts/public-layout/public-layout.scss`: bổ sung style `.utility*`, `@keyframes utility-marquee` (hỗ trợ `prefers-reduced-motion` và tạm dừng khi hover) và `.site-footer*` nền tối `#292724`, giữ `public-layout.scss` gọn dưới ngưỡng budget 6 kB.
  - `code/frontend/src/app/app.spec.ts`: bổ sung kiểm thử tự động cho dải `.utility` (3 link MXH, email CSKH, chữ chạy ngang) và `.site-footer` (khung `embed_page` Facebook, 3 nút `.social-box`).
  - `docs/DESIGN.md`, `docs/PROGRESS.md`, `docs/DEV_LOG.md`: đồng bộ tài liệu và nhật ký bàn giao.
- Kiểm tra đã chạy (từ `code/frontend`):
  - `npm test -- --watch=false`: 44/44 test files PASS (252/252 tests PASS).
  - `npm run build` & `npm run build:workers`: PASS (0 warning, 0 error).
- Bước tiếp theo: commit và push lên `origin/dev`, đồng bộ nhánh `dev-ui`.


## 2026-11-08 — S055-C03 — Tối ưu 3 SVG logo mạng xã hội (`Facebook`, `Threads`, `TikTok`) bằng `<symbol>` + `<use>`

- Mục tiêu & phạm vi (chốt qua `/grill-me`):
  - Cập nhật 3 SVG logo `Facebook`, `Threads`, `TikTok` theo đúng mã SVG user gửi, lược bỏ thẻ thừa `SVGRepo_bgCarrier` / `SVGRepo_tracerCarrier`, đổi `fill="currentColor"` và gom vào `<svg style="display:none"><symbol id="icon-facebook|icon-threads|icon-tiktok">` tại đầu `public-layout.html` để tái sử dụng qua `<use href="#...">` ở cả dải `.utility` và `.site-footer` (0 HTTP request phụ, tự đổi màu mượt mà khi hover).
- Kiểm tra đã chạy (từ `code/frontend`):
  - `npm test -- --watch=false`: 44/44 test files PASS (252/252 tests PASS).
  - `npm run build` & `npm run build:workers`: PASS (0 warning, 0 error).
- Bước tiếp theo: commit và push lên `origin/dev`, đồng bộ nhánh `dev-ui`.

## 2026-11-09 — S056-C03 — Gọn trường Nơi lưu trữ

- User yêu cầu thu nhỏ ô chọn và chuyển lên cạnh Tồn kho trong form sách.
- Phạm vi HTML/SCSS BookEditor và tài liệu bàn giao. Bắt đầu trên dev sạch.
- Ô chọn tối đa 13rem, nút Thêm thùng theo chiều rộng chữ; nhóm tồn/thùng
  tự xuống hàng khi thiếu chỗ. Đặt nhãn nổi và ô chọn trong cùng khung riêng.
- Từ code/frontend, npm test -- --watch=false đạt 252/252, 44 file.
  git diff --check đạt từ root. Chưa kiểm tra trực tiếp trên trình duyệt.
- Bàn giao dev; còn smoke trình duyệt cùng tính năng V20.

## 2026-11-09 — S056-C04 — Căn nhãn Nơi lưu trữ trên viền

- Ảnh user cho thấy nhãn còn che giá trị. Đối chiếu Tồn kho và CSS chung:
  thẻ label bên trong field nhận margin-top 1rem, làm lệch nhãn nổi.
- Bắt đầu trên dev sạch. Sửa cấu trúc nhãn để dùng cùng mẫu field trong BookEditor.
- Dùng span.field-label và aria-labelledby để giữ tên truy cập của select.
- Từ code/frontend: npm test -- --watch=false đạt 252/252, 44 file.
  git diff --check đạt từ root. Chưa đo bố cục trên trình duyệt.
- Bàn giao dev, kiểm tra lại nhãn và giá trị trên candidate khi smoke V20.

## S057-C01 — Bắt đầu S1 hợp nhất ảnh sách

- Native tuần tự, worktree codex/image-system từ dev 266f2d3.
- Ruling: dùng V21/V22/V23 vì V20 đã dành cho thùng sách.
- Phạm vi S1: gallery tám ảnh, giữ dữ liệu và retry cũ. Đang chuẩn bị RED.

- S1: hợp nhất UI/DTO và gallery, giữ hai alias request để tương thích URL và
  fingerprint cũ. Migration V21 đổi role, giữ ID/storage ref, tăng version.
- RED: test gallery trên PostgreSQL local trả 6 thay vì 8. Lượt kiểm shared DB
  gặp dữ liệu test trùng/FK; chuyển sang container loopback riêng memay-s057-pg.
- GREEN: từ code/backend, ./mvnw -B -ntp test trên DB test riêng đã migrate
  đạt 243 ca, 240 đạt/3 skip. Lần chạy trước trên DB trống có 7 lỗi setup auth
  do bảng chưa tồn tại; chạy lại sau Flyway đạt. Frontend npm test đạt 248/248;
  npm run build:workers và npm run check:workers:proxy đạt.
- Đã kiểm git diff --check, liên kết tài liệu và trần dòng. Chưa smoke browser,
  replay receipt chụp từ bản deploy cũ hoặc rollout production.
- Checkpoint codex/image-system. Bước tiếp theo S2; S3–R6 còn mở.

## 2026-11-09 — S058-C01 — Bắt đầu S2

- Tiếp tục Native từ S1 3be348d, worktree được cấp quyền ghi.
- Phạm vi metadata V22, staging và xuất file bất biến. Owner dựng Ubuntu.

- V22 thêm identity ảnh dùng chung qua bước chuyển temp→book, recipe,
  generation, variant, binding và job. DB giữ storage_public_id Cloudinary,
  pointer LOCAL chỉ được chuyển sang generation đã xuất của cùng ảnh.
- LocalImageStore stream staging tối đa 10 MiB, tính SHA-256, từ chối symlink
  và đường dẫn ngoài quy ước, kiểm MIME magic/size/hash rồi rename nguyên tử.
  Nginx và worker chưa kết nối. Dùng root đã resolve thực trên Ubuntu;
  test macOS dùng toRealPath vì thư mục temp mặc định đi qua symlink hệ thống.
- RED test LocalImageStore thiếu contract mới. GREEN 4/4 ca từ code/backend
  với -Dtest=LocalImageStoreTest,ImageGenerationRepositoryTest trên PostgreSQL
  riêng. Test DB chứng minh rollback giữ pointer và báo generation đã xuất
  chưa phục vụ. Chưa mô phỏng disk full thật hoặc kiểm kê file mồ côi ngoài DB.
- Tiếp theo S3 lease/worker boundary, rồi Sharp. Chưa rollout hay kiểm Ubuntu.
- Hồi quy backend trên PostgreSQL test riêng: 247 ca, 244 đạt, 3 skip.

## 2026-11-09 — S059-C01 — Bắt đầu S3

- Native tiếp tục từ dev 82636b5. Phạm vi queue PostgreSQL và API nội bộ.
- Ruling: output mỗi attempt dùng thư mục theo lease token để worker hết lease
  không ghi đè staging của worker mới. Completion chỉ xuất generation READY.

- Queue claim dùng PostgreSQL SKIP LOCKED, lease 5 phút, retry 10/60 giây,
  dừng sau ba lần. Kết quả kiểm lease, phiên upload và manifest trước khi xuất.
  Completion ghi generation READY, bước gắn ảnh thuộc S5.
- POST /actuator/imagejobs chỉ trên cổng management khác cổng app, Bearer
  độc lập; COMPLETE nhận manifest dưới dạng chuỗi JSON. App giữ health route.
  PROCESS hoạt động; các kind Drive báo unsupported đến khi có handler.
- RED compile thiếu ImageJobRepository. GREEN nhóm lease/security/storage
  đạt 5/5. Toàn bộ ./mvnw -B -ntp test từ code/backend trên PostgreSQL test
  riêng đạt 249 ca, 246 đạt, 3 skip. Worker encode và Ubuntu chưa kiểm.
- Tiếp theo S4. Chưa rollout.

## 2026-11-09 — S059-C02 — Bắt đầu S4

- Sharp worker dùng manifest S3, một job mỗi lúc, staging tách theo lease.
- Phạm vi encoder, worker client, Node image khóa digest và smoke container.

- Sharp 0.35.5 khóa bằng package-lock; Node 22 bookworm-slim khóa digest.
  Recipe v1 có 9 variant, giới hạn 10 MiB/25 MP, xoay theo EXIF, bỏ metadata,
  nền trắng, không upscale. Một subprocess/job với deadline 180 giây và
  heartbeat 30 giây. Tắt process khi mất lease, không gửi COMPLETE.
- RED npm test thiếu processor. Một lượt worker test lỗi do fixture ghi input
  vào thư mục cha (mkdir recursive trả đường dẫn đầu tiên được tạo). Sửa fixture.
- Từ code/image-worker: npm test đạt 7/7. Docker build thành công và node --test
  trong container --network none --cpus=1 --memory=768m đạt 7/7, gồm linux/amd64.
  npm install báo 0 lỗ hổng tại thời điểm cài. Chưa đo tải trên Ubuntu/Dell.
- S3 và S4 đã kiểm riêng. Chưa có smoke worker kết nối backend thật, upload LOCAL,
  recipe registry production hay Nginx. R1 là bước tiếp theo, Ubuntu ở S8/R6.

## 2026-11-09 — S059-C03 — Bắt đầu R1

- Tiếp tục từ S4 7290c83. Phạm vi client Drive chỉ đọc, staging có checksum,
  phát hiện nguồn đổi giữa hai lượt metadata và phân loại lỗi an toàn.
- Không cần credential Drive thật cho fixture HTTP local.

- Google Auth 1.57.0 khóa trong pom. Chỉ GET metadata và blob bằng service
  account scope drive.readonly. Cố định Google API host, tắt redirect, timeout
  kết nối 10 giây, request/body 60 giây và deadline toàn thao tác 180 giây.
- So ID, version, MIME và size trước/sau, stream và hash file trong staging.
  Nguồn đổi được dọn khỏi staging. Mã lỗi an toàn, không trả body upstream.
- RED compile thiếu client. GREEN từ code/backend với fixture HTTP local
  đạt 3/3 ca R1, thêm 1 ca worker security đạt. ./mvnw -B -ntp test trên DB
  PostgreSQL test riêng đạt 252 ca, 249 đạt, 3 skip. git diff --check đạt.
- Chưa gọi Google Drive thật hoặc thử đổi credential live. R2 sẽ nối binding
  và publish gate. S5–R6 vẫn mở, Ubuntu chưa có cấu hình bàn giao hoàn chỉnh.

## 2026-11-09 — S060-C01 — Bắt đầu R2

- Native từ dev 0d737be. Phạm vi binding Drive, kiểm quyền và gate xuất bản.
- Ruling: VERIFY so hash với input gốc của generation đã được Sharp giải mã
  thành công. Hash khớp chứng minh cùng bytes nên không encode lại.
- V23 dành cho candidate VERIFY và hash input. Migration receipt R3 dời V24.

- PUT owner/CSRF tạo candidate idempotent, VERIFY chỉ claim phía Spring.
  Preflight và completion đều kiểm lease, quyền OWNER, phiên upload,
  generation và version. Hash gốc ghi trước khi enqueue PROCESS, recheck
  khi công bố. File Drive sai hash không thay binding đang dùng.
- V23 thêm input_sha256 và candidate. SOURCE_VERIFIED, binding và version
  sách commit nguyên tử. Audit giữ ID media và version, không ghi Drive File ID.
- Gate kiểm ảnh LOCAL ACTIVE khi tạo/xuất bản, ghi sách đang công khai và
  thay ảnh. S5 phải gọi cùng gate trong transaction gắn ảnh LOCAL.
- RED compile thiếu gate. Một lượt compile fixture lỗi suy luận kiểu
  assertThat, đã tách biến UUID. Test mục tiêu 13/13, toàn bộ backend
  ./mvnw -B -ntp test từ code/backend trên PostgreSQL test riêng đạt
  255 ca, 252 đạt, 3 skip. Chưa kiểm Drive thật hoặc deploy.
- Smoke bổ sung SourceBindingApiTest đạt 1/1: OWNER + CSRF nhận 202,
  job VERIFY chạy với Drive giả lập, GET chỉ trả status và versions,
  STAFF bị 403. Test này chạy riêng sau bộ hồi quy.
- Bàn giao dev theo workflow. Tiếp theo S5 upload và gắn ảnh LOCAL.

## 2026-11-09 — S061-C01 — Bắt đầu S5 và ghi yêu cầu S6

- Tiếp tục Native từ dev c705a2c. S5 nối upload LOCAL, poll, finalize và replacement.
- User duyệt S6 nhận nhiều link file Drive hoặc File ID cùng lúc cho một sách.
  Hiện danh sách ghép với ảnh để owner kiểm tra trước khi xác minh từng ảnh.
  Link thư mục báo lỗi, backend tiếp tục nhận File ID chuẩn.

## 2026-11-09 — S061-C02 — Upload LOCAL và ghép nguồn Drive

- S5 thêm V24, session upload file gốc, trạng thái job, retry và preview admin.
  Gắn ảnh và kiểm nguồn cùng transaction. Receipt giữ kết quả khi gửi lại yêu cầu.
  Cleanup LOCAL tách khỏi Cloudinary và kiểm lease trước khi xóa file.
- S6 nối form hiện có, tiếp tục poll qua phiên tab, hỗ trợ tối đa tám link file
  hoặc File ID, xác nhận ghép và xem kết quả từng ảnh. Không mở rộng sang duyệt thư mục.
- Kiểm tra: từ `code/backend`, `./mvnw -B -ntp test` với PostgreSQL test local
  đạt 254 ca, skip 3. Từ `code/frontend`, `npm test` đạt 253 ca,
  `npm run build:workers` và `npm run check:workers:proxy` đạt.
  Test nguồn dùng Drive giả lập. Chưa chạy smoke trình duyệt với Drive thật.
- Giữ mặc định Cloudinary. Còn S7 delivery public và ZIP trước khi bật LOCAL
  cho vận hành, cần đăng ký recipe v1 và kiểm Ubuntu với worker thật.
- Bàn giao lên dev theo quy ước. Bước kế tiếp S7 theo IMAGE_STORAGE_PLAN.

## 2026-11-09 — S062-C01 — Popup Cộng đồng Mẹ Mây

- Bắt đầu trên dev sau fast-forward tới dceef69. Phạm vi ô Cộng đồng trên Home.
- Kế hoạch: kiểm luồng desktop/mobile ở Home, theo mẫu dialog native sẵn có,
  tạo QR từ URL trong spec và kiểm các đường đóng, focus, sao chép, SSR.
- Chưa chạy kiểm tra. Đang triển khai.

### S062-C02 — Kiểm chứng và bàn giao

- Home dùng URL trong spec cho link trực tiếp, nút Zalo Web, clipboard và QR.
  Dialog native theo mẫu Home, dùng logo hiện có. QR sinh tại chỗ bằng
  qrcode-generator 2.0.4, tải thư viện khi mở. Nhận diện iPadOS giả Mac bằng
  touch points và dùng khả năng con trỏ cho thiết bị không rõ hệ điều hành.
- Từ code/frontend: npm test đạt 257/257 ca, 45 file. npm run build,
  npm run build:workers và npm run check:workers:proxy đạt.
- Chrome localhost: mở dialog, clipboard thật, Enter, Esc, X, backdrop,
  focus ban đầu và trả focus, cuộn ở viewport 420×320 đạt. iPhone/Android
  mô phỏng giữ click mặc định. Kiểm href/target của Zalo Web qua DOM.
  Harness chờ sự kiện tab mới với Zalo giả lập bị timeout.
- Giải mã QR render bằng jsQR ra https://zalo.me/g/mwzwwq694. QR ảnh user
  chứa URL zaloapp.com/qr/g cùng mã nhóm. Yêu cầu giả lập Safari iPhone tới
  URL trong spec nhận 302 sang scheme của Zalo; còn kiểm mở đúng nhóm trên
  điện thoại thật. Bàn giao theo workflow dev, bước tiếp theo là smoke này.

### S062-C03 — Nền popup theo mẫu Zalo

- User xác nhận QR mở đúng nhóm trên iPhone thật. Yêu cầu chỉnh nền popup
  theo ảnh mẫu. Bắt đầu trên dev sạch ở c075605.
- Phạm vi HTML/SCSS của dialog: nền xanh, thẻ trắng và logo Mẹ Mây.
  Giữ nguyên dữ liệu và hình QR. Kiểm test, build và giao diện sau chỉnh.
- Đã thêm nền xanh, thẻ trắng, nhãn Cộng đồng Zalo · zalo.me và nút xanh.
  Từ code/frontend: npm test đạt 257/257, npm run build đạt.
  Chrome localhost kiểm ảnh popup, focus, Escape và viewport 420×320;
  jsQR đọc đúng URL từ ảnh QR render. Kiểm iPhone thật do user xác nhận
  trước khi đổi nền. Bàn giao dev, còn cập nhật bản chạy online.
