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
