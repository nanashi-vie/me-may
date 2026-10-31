# Deploy test — Workers + Render + Neon

Phạm vi đã chọn26/10/2026: AngularSSR trên Worker `me-may`, Spring Boot Docker
trên Render `me-may-api`, PostgreSQL Neon đã migrate schema. User đã deploy hai
service qua dashboard27/10; online smoke đạt, M5 chưa đóng. Local DB_URL/TEST_DB_URL không đổi; không chuyển sách/ảnh dev.

## Git workflow

Code được agent bàn giao trên `dev`; user tự merge qua `main` khi sẵn sàng. Hai
service production vẫn theo branch `main`, không tự đổi deployment sang dev.

## 1. Cloudflare Workers Git integration

- Repository: `nanashi193/me-may`, production branch `main`.
- Root directory/Path: `code/frontend` (ảnh dashboard đang chọn thư mục frontend).
- Worker name: **me-may**, phải khớp `wrangler.jsonc`.
- Build command: để trống; Wrangler custom build tự chạy `npm run build:workers`.
- Deploy command: `npm run deploy:workers` (hoặc `npx wrangler deploy`).
- Node.js:22.12+; có thể đặt build variable `NODE_VERSION=22`.
- Không đặt output browser làm SPA/Pages: entry là `dist/me-may-workers/server/server.mjs`.
- Không cần copy account token vào Git; token do dashboard tạo dùng cho Git integration.

Cấu hình `code/frontend/wrangler.jsonc`: Workers Assets+AngularSSR, workers.dev bật,
preview URLs tắt, không SPA fallback. API origin dự kiến
`https://me-may-api.onrender.com`; nếu Render cấp tên khác, sửa MEMAY_API_ORIGIN rồi
redeploy. Backend chưa lên thì route cần dữ liệu có thể503; shell vẫn chạy.

URL đã xác minh: `https://me-may.dqhungg8357.workers.dev`. Worker chỉ nhận URL HTTPS
`me-may.<account>.workers.dev` đúng mẫu, dùng origin đó cho SSR/canonical/enquiry.
Khi gắn custom domain đặt `MEMAY_SITE_ORIGIN=https://domain-thật` trong config rồi
redeploy; URL request phải khớp origin. Không wildcard allowed hosts. Forwarded
headers bị bỏ trước Angular để không ép CSR hoặc thay origin. Site origin được
chuyển qua TransferState; backend/DB secret không đưa vào browser.

Không dùng `wrangler.local.jsonc` cho deploy. Local: `npm run dev:workers`8787.
`npm run deploy:workers -- --dry-run` chỉ build/kiểm bundle, không upload.

## 2. Render Web Service

Tạo **Web Service**, tên `me-may-api`, repository/branch `main`, runtime **Docker**.
Chọn region gần Neon khi có lựa chọn; project hiện ở AWS US East Ohio.

| Ô cấu hình | Giá trị |
|---|---|
| Root Directory | `code/backend` |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` (root directory đã chọn) |
| Docker Command | để trống, dùng ENTRYPOINT trong image |
| Health Check Path | `/actuator/health` |
| Instance | Free cho test theo lựa chọn hiện tại |

Image multi-stage Temurin Java21, chạy UID10001, bind0.0.0.0 và PORT Render cấp;
heap tối đa65% RAM. Không lấy secret qua Docker build args. .dockerignore allowlist
chỉ source/Maven cần thiết; .env/target/local tool không vào context.

Tạo file env private trên máy, từ repo root:

```bash
python3 scripts/deploy/prepare_render_env.py
```

File `.local/render.env` (0600, ignored) đã được tạo cho môi trường hiện tại.
Trong Render Environment dùng **Add from .env** để nhập nội dung file này qua editor;
không gửi file/secret vào chat hoặc commit. File là dotenv cho import, không phải
shell script để source. Nó chứa:

- SPRING_PROFILES_ACTIVE=render, SERVER_ADDRESS=0.0.0.0.
- NEON_JDBC_URL: pooled, NEON_JDBC_URL_UNPOOLED: direct; cùng user/password tách riêng
  NEON_DB_USER/NEON_DB_PASSWORD. TLS verify-full + JVM trusted CA + channel binding.
- CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET nếu có trong root.env; namespace riêng
  `memay/online-test`, không dùng chung dev hoặc integration-test.
- CONTACT_ZALO_HOTLINE_URL/GROUP_URL nếu có.
- Không chứa OWNER_EMAIL/OWNER_PASSWORD hoặc BOOTSTRAP_*; Render không cần credential tạo tài khoản.

### Owner cố định, tạo riêng một lần

Tài khoản owner được operator tạo trước deploy, không có startup bootstrap. Đặt
`OWNER_EMAIL` và `OWNER_PASSWORD` trong root `.env` private; password tối thiểu16
ký tự Unicode và tối đa72byte UTF-8. Nên quote giá trị có ký tự đặc biệt.

```bash
python3 scripts/deploy/create_owner.py
```

Lệnh build JAR mới rồi dùng operator entry point riêng (không mở Spring web server,
không chạy migration/scheduler/media jobs), kết nối Neon directTLS. Chỉ thêm OWNER
khi chưa có owner; chạy lại cùng credential là no-op. Từ chối account STAFF/disabled,
password không khớp hoặc owner email khác; không reset password/nâng quyền tự động.
Lock transaction bảo vệ khi hai lệnh chạy cùng lúc. Không ghi email/password ra stdout.

Owner đã được tạo trên Neon27/10 bằng đúng OWNER_EMAIL/PASSWORD user đặt. Đăng nhập
qua `/admin/dang-nhap` bằng credential đó; backend restart/redeploy giữ nguyên account.
CookieSecure/HttpOnly/SameSiteLax và CSRF giữ nguyên. Nếu trước đây đã nhập BOOTSTRAP_*
trên Render thì xóa các biến cũ; import lại `.local/render.env` mới (không có secret
owner). Không đặt OWNER_PASSWORD vào Render/Cloudflare, image hoặc Git.

DBlocal có owner cũ thì giữ nguyên. Máy local mới cần owner có thể dùng
`python3 scripts/deploy/create_owner.py --target local`; chỉ cho phép loopback
`me_may_dev`, không dùng với DB dự án khác. Không có public signup/đổi/quên mật khẩu
trong task này; auth sốđiệnthoại để sauMVP.

Free host có thể ngủ/restart, session in-memory mất và public timeout10s có thể ngắn
hơn cold-start; khi vừa deploy hãy mở health endpoint Render trước rồi thử website.
Không tắt CSRF/Secure cookie hoặc dùng browser gọi Render khác site để né lỗi.

## 3. Neon migration và vận hành

Root.env giữ raw NEON_DATABASE_URL. Nếu chưa có direct URL, script derive direct
cùng endpoint bằng cách bỏ -pooler và validate cùng host/database/role; endpoint đã
đối chiếu Neon API và kết nối TLS thành công. Có thể đặt NEON_DATABASE_URL_UNPOOLED
explicit; script từ chối nếu khác database/role. Không đổi DB_URL/TEST_DB_URL local.

Đã migrate V1–V5 bằng Flyway12.4.0, schema **public**, validate tracking. Chỉ schema,
taxonomy seed và campaign singleton tắt;0sách/0ảnh saumigration. Owner cố định đã được cấp riêng27/10.
Schema neon_auth có sẵn thuộc dịch vụ khác, app không dùng hoặc thay đổi.

Lệnh cho lần sau (root repo, Java21/Maven Wrapper, credentials ở ignored.env):

```bash
python3 scripts/deploy/migrate_neon.py --info-only
python3 scripts/deploy/migrate_neon.py
```

Migrate idempotent qua Flyway history; không sửa SQL V1–V5 đã áp dụng. Schema mới cần
migration version tiếp theo. Plugin và render profile cùng direct URL/public schema,
clean bị khóa, baseline-on-migrate=false. Startup Render kiểm tra/apply migration
pending; người vận hành nên thử migration mới ở branch riêng trước.

Logs đầy đủ trong `.local/neon-migration.log` mode0600; không commit hoặc đưa log
chứa endpoint/credential ra public. Migrate script không dùng local DB_URL. Branch
Neon `m5-migration-verification` đã xóa sau khi user xác nhận, giữ kết quả/log thử.
Không chạy backend integration tests trên Neon; tests yêu cầu me_may_test local.

## 4. Kiểm tra sau khi user deploy

1. Render `/actuator/health`200; không log chi tiết health hoặc secrets ra public.
2. Worker Home/detail có HTML đầu tiên/title/OG/canonical đúng origin; route thiếu404.
3. /quan-tam và /admin/** noindex/no-store; API/media không cache dữ liệu cũ.
4. Đăng nhập/CSRF, CRUD/version/audit, ảnh trong namespace online-test, wishlist và
   copy→Zalo; test thật Safari/Chrome/in-app khi có thiết bị.
5. Đo CPU/quota Workers/cold-start Render, kiểm tra backend-down503, DB connections,
   quyền/token/domain TLS và backup/restore trước nghiệm thu online/release.

Local dry-run/workerd/Docker không thay kết quả triển khai online. Chưa bật CI/CD
release khác hoặc provision Render/Cloudflare resources trong task code này.

Nguồn đối chiếu: [Cloudflare Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/),
[Render Docker](https://render.com/docs/docker),
[Neon pooling](https://neon.com/docs/connect/connection-pooling).

## 5. Kết quả online và bước chốt M5 — 27/10/2026

- [Website](https://me-may.dqhungg8357.workers.dev), [admin](https://me-may.dqhungg8357.workers.dev/admin/dang-nhap), [API health](https://me-may-api.onrender.com/actuator/health).
- Render Live `e264523`; Worker version `e4f62cc2`,100%Ready, nguồn build main.
  Health/SSR/privacy/auth smoke đạt; chi tiết và giới hạn ở [VERIFICATION](VERIFICATION.md#m5-online--27102026).
- Online chưa có sách/ảnh. Chủ đăng nhập bằng owner đã cấp; không provision lại.
  Nhập10–20cuốn thật, đủ FRONT/BACK/INSIDE, kiểm preview rồi publish; không copy
  DBdev/fixture vào online. Đánh dấu sold, kiểm URL cũ và wishlist cảnh báo; ẩn
  listing, kiểm public API/detail/media không còn lộ. Ghi mã/kết quả, không ghi secrets.
- Sau có dữ liệu, từ `code/frontend` chạy:
  `node scripts/check-ssr.mjs https://me-may.dqhungg8357.workers.dev`.
  Với catalogue rỗng, checker bỏ qua detail/OG/media; không dùng PASS đó để đóng gate.
- Chủ thử Safari iPhone/Chrome Android và Facebook/Zalo in-app: tìm/lọc/back,
  baảnh, wishlist/reload, chọn nhiều cuốn/copy và dán Zalo; fallback thủ công.
  Không có cam kết tự gửi hoặc điền sẵn. User27/10 xác nhận chưa thử các bước này.

### Recovery và rollout/rollback

- Đã dump schema public từ Neon direct vào máy operator, restore vào database
  scratch `me_may_m5_s022_restore` trong container local; không đè dev/test/Neon.
  Artifact `.local/backups/S022-neon-online/` ignored/private; dump chứa account hash,
  không chia sẻ/commit. Bản hiện tại0sách/0ảnh không chứng minh khôi phục dữ liệu pilot.
- Trước mỗi thay đổi schema/release: backup direct bằng `pg_dump -Fc`, file0600,
  kiểm manifest và restore vào scratch riêng; đối chiếu bảng/auth/audit/media refs
  và sequence last_value/is_called. Chốt người phụ trách, lịch/retention và bản sao
  ngoài host; chưa có lịch backup tự động hoặc chính sách recovery được nghiệm thu.
- Media: giữ3ảnh nguồn theo mã sách ngoài Cloudinary; xác minh restore/upload lại
  và cập nhật reference bằng workflow được duyệt. Chưa có ảnh online nên chưa drill.
- Rollout: user merge dev→main, đối chiếu commit Render và Worker, health trước,
  smoke SSR/auth/public detail/media sau. Lỗi: dừng nhập/sửa, ghi version và lỗi,
  rollback application về **bản đã kiểm chứng tương thích schema**, rồi smoke lại.
  Không tự rollback về bản bootstrap cũ6044848. Không sửa Flyway history hoặc
  restore đè Neon khi chưa có kế hoạch/xác nhận cụ thể; DB migration ưu tiên forward fix.
- Dashboard có rollback control không chứng minh rollback drill đã đạt. Production
  VPS/Dokploy, role runtime tối thiểu/rate limit, LCP mobile/cold-start/quotas và
  recovery DB/media vẫn cần kiểm chứng trước nghiệm thu release theo master plan.

## 6. Pilot đã chạy và lỗi origin — 28/10/2026

User xác nhận publish21/21(20desktop+1mobile),copy/mởZalo/ẩn/FlashSale ổn.
OnlineSSR/detail/3ảnh thật đạt; checklist còn thiếu tại
[VERIFICATION28/10](VERIFICATION.md#m5-pilot-và-link-hỏi-sách--28102026).
Originfix dùng documentlocation khi entryadminCSR không có SSRTransferState;
user merge dev→main rồi Workersbuild/deploy. Saudeploy thử entryadmin→public và
entrypublictrực tiếp, enquiry1/nhiềucuốn/canonical dùng đúng domainWorkers/custom.
Hardreload một lần để bỏ appbundle cũ; đây chỉ là smoke saufix, không phải cách né bug.
Không cần sửa URL trong DB hoặc tạo lại sách; backend/schema không đổi.

### Gate release M5 media mới
- Trước deployfrontendpicture, tạo và verifyđủ320/640×jpg/webp trên mọi ACTIVE media bằng scripts/deploy/backfill_public_media.py, dryrun/expectedcount rồi thử1asset cókiểmsoát. Checkpointmới .local/backups/public-variants-v2.done, không dùng checkpoint640JPEGcũ. Chưa chạy applyassetbánthật trong task2; thiếuWebP cóthể làm picturekhôngtải dùJPEGcũvẫnđược.
- Backendphải deploycontractvariants trướcfrontend; giữbackups/rollback/gateonline như checklist hiện hành. Không coi liveprobe một assetmemay/test là backfillđãxong.

### Rollout contract M5 (chưa chạy online)

1. Tạm dừng ghi; chụp backup DB/media/manifest mới và kiểm restore scratch. Ghi schema/version/counts book/listing/media/audit, giá/ID/asset/published_at fingerprint, sequence high-water mark; giữ bản release cũ.
2. Thử nâng V5→V10 trên scratch từ backup: giá cũ→hai đầu bằng nhau, INSIDE→INSIDE_1, DRAFT→ARCHIVED, weight cũ null; không mất asset hoặc tựẩn sách công khai. Đối chiếu audit/counts/fingerprint sau nâng.
3. Deploy backend V6–V10 trước frontend đồng bộ contract; không cho frontend cũ ghi vào API mới. Chạy backfill4variant với expectedcount và checkpointv2 ở gate trên, verify response MIME/magic/dimensions.
4. Deploy frontend sau backend/backfill; smoke OWNER tạo2/6ảnh/đổi vai trò bằng dropdown/ẩn/hiện và tồn biến thể về0 và STAFF403, giá khoảng/weight/ảnh public/no-store. Không ghi synthetic QA vào catalogue bán thật.
5. Migration không có down tự động. Nếu lỗi contract/data: dừng ghi, rollback app cùng DB backup đã xác minh và đối chiếu mọi ghi mới trước mở lại; không restore đè khi còn ghi hoặc reset sequence mù quáng. Rollback drill vẫn là gate chưa đạt.
6. Đo lại Mobile Lighthouse3lần mỗi Home/detailMM-000020/wishlist cùng dữliệu, từngrun LCP≤2,5s/CLS≤0,1; coldstart riêng. Local test không thay kết quả online. User thực hiện merge main/deploy; phiên này không triển khai online.

### Bổ sung rollout tồn kho/biến thể V10 (chưa chạy online)

- Sau V6–V9, V10 thêm một dòng tồn cho mỗi sách cũ: AVAILABLE→1, SOLD→0; giữ mã/URL,
  ảnh/giá/publishedAt/grade. Đối chiếu số dòng bằng số sách; chủ kiểm tồn thực trước mở ghi.
- Backup/restore scratch trước rollout; fingerprint dữ liệu cũ và sequence giữ nguyên.
- Backend mới bắt buộc payload variants; frontend cũ không ghi được. Giữ cửa sổ dừng ghi
  tới khi frontend mới sẵn sàng; endpoint availability cũ trả409, không tự chuyển thành tồn.
- Smoke OWNER thêm/sửa biến thể với cùng ảnh/giá, tổng3→1→0, public chọn riêng/hỏi mua,
  STAFF403 và retry không nhân sách/tồn; không nhập synthetic vào catalogue bán thật.
- Rollback phải phối hợp app/DB theo bước5 ở trên, không chỉ hạ frontend về contract cũ.
  Giữ gate backfill4variant ảnh, Lighthouse/cold-start và vận hành M5 chưa đạt.

## Gate đo hiệu năng nhập sách

Codehiện hành giữauthenticated/eagersync/no-store; khôngcần migration mới
cho tốiưu này. Usermerge/deploy theo workflowdev→main nhưcũ.
Muốn nghiệmthu5lượt Renderwarm cần serviceQA vớiDBQA/media namespacecáchly,
cùngrevisionfrontend/backend vàảnhworkload trong evidence, không đổi DBservice
đang bán. Agentchưa deploy/tạoservice hoặc migrateonline trong phiên30/10.

Bật `MEMAY_PERFORMANCE_ENABLED=true` trênQA khiđo; mặcđịnhfalse khi chạy thường.
FrontendQA opt-in bằng sessionStorage key `memay-performance=1` trước reload,
xóa key sau đo; chỉghi numericmetadata/UserTiming, khônglưu form/secret.
Giữ limiter4inflight/30attempt10phút, chiađợt cho5vòng2và6ảnh; warm-up riêng,
first-hit/coldRender/Neonresume cólog xácnhận vàkhông trộn với warm.
So before/after cùngmôitrường/revisionworkload, giữ HARđãlọc, querycount vàbytes;
khôngđánhdấu hoànthànhonline từ sốđolocal. VPSchỉđối chứng nếuđãcó vàvẫnchậm.
Bằngchứng: [BOOK_PUBLISH_PERFORMANCE_VERIFICATION](BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md).

## Import CSV/XLSX — V11

Candidate local thêm FlywayV11 `book_import_batch`/`book_import_item`; cầnV10 trước.
Chưa migrate online. Sao lưu database và kiểm restore trước rollout; dùng đúng
Neon direct migration target, không dev/test hoặc DB bán thật ngoài phạm vi duyệt.
User merge/deploy theo workflow. Smoke OWNER mẫuCSV/XLSX→preview→ARCHIVED→ảnh→publish,
STAFF403/private/no-store, retry cùngfile/cùngID; không dùng dữ liệu khách làm test.
Sau khi có dữ liệu import, không drop receipt hoặc rollback migration bằng xóa bảng:
receipt là hàng rào chống tạo lại sách. Nếu rollback app, tắt đường import mới và
giữV11/dữ liệu/backup; version cũ không có importer cần được kiểm tương thích trước.

Gate còn mở: workload100sách/500biến thể trên RenderQA/Neon tách biệt, warm/cold
riêng, timeout/mất phản hồi và retry, peakheap/RSS/quota/query/locks. Local chỉ một
mẫu đo; không đủ median/p95 hoặc kết luận host. Nếu vượt ngân sách, giảm giới hạn
trước rollout và cập nhật contract/tests. Không bỏ validation/audit để tăng tốc.
Backend quota memory từnginstance; nhiềuinstance cần đánh giá thêm, chưa có distributedgate.
[Contract](BOOK_IMPORT.md), [bằng chứng local](BOOK_IMPORT_VERIFICATION.md).
