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
