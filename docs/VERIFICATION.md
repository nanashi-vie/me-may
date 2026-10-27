# Kiểm chứng local — M1 và M2

Ngày: 22/10/2026. Phần M1 là bằng chứng lịch sử; trạng thái M2 mới nhất ở cuối. Không phải nghiệm thu staging/production.

## Kết quả

| Kiểm tra | Kết quả thực tế |
|---|---|
| Backend `bash run-local.sh -B -ntp verify` | 13 tests pass; JAR đóng gói thành công |
| Frontend `npm test` | 7 tests pass trong 3 file |
| Frontend `npm run build` ngoài sandbox | Browser + server bundles thành công; initial browser bundle khoảng 280 kB raw |
| SSR check dev ở 127.0.0.1:4200 | Home và Cách mua có content/title/description/OG/canonical trong HTML đầu tiên; URL lạ trả 404 |
| SSR check production build local ở 127.0.0.1:4000 | Cùng các kiểm tra trên: PASS sau khi cấu hình allowlist local |
| Browser qua Playwright CLI | /admin anonymous chuyển login; Owner đăng nhập vào admin, đăng xuất về login; mật khẩu sai giữ trang login và hiện lỗi |
| npm audit | 0 vulnerability tại thời điểm kiểm tra |
| Credential scan | Mật khẩu local không có trong file dự kiến commit hoặc frontend build artifacts; .env được ignored |
| Review độc lập | Một P2 về noindex sau điều hướng từ 404; đã có test RED→GREEN và sửa |

## Các hành vi được bảo vệ bởi test

- CSRF bắt buộc cho login/logout; token sau login cần làm mới.
- Anonymous/expired session trả 401 JSON, không redirect HTML; STAFF vào admin nhưng không vào endpoint OWNER.
- Login sai và user inactive không tạo authenticated session; DTO không trả password/hash.
- Login đổi session ID; cookie cũ không thể vào admin; logout hủy session.
- Health public tối giản; Actuator khác không được public.
- Bootstrap Owner hash BCrypt, normalize email, không reset account cũ, không tự nâng Staff thành Owner, từ chối mật khẩu yếu.
- Frontend lấy CSRF trước POST, bảo toàn ký tự đặc biệt của mật khẩu qua form encoding, xử lý 401/session hết hạn và logout.
- Public page trả navigation thật; robots noindex của 404 được xóa khi quay lại Home.

## Lỗi đã phát hiện và xử lý

1. npm10 Arborist lỗi nội bộ edgesOut: cài bằng npm11 tạm thời; lockfile được lưu. Không thay npm toàn hệ thống.
2. Dev dependencies Vite/MCP SDK có advisory: override bản vá cùng major 7.3.7 và 1.32.0, audit sạch; không force upgrade Angular.
3. Build SSR trong sandbox bị abort/esbuild deadlock: build ngoài sandbox thành công. Unit tests chạy được trong sandbox.
4. Production server ban đầu trả CSR vì allowedHosts rỗng trong scaffold: smoke thất bại ở content ban đầu; log server xác định host bị chặn. Allowlist chỉ localhost/127.0.0.1, bind SSR local loopback; smoke production sau sửa PASS. Không dùng wildcard.
5. Khi thêm bind host, TypeScript báo kiểu port từ env là string; chuyển sang Number và validate port trước listen, build thành công.
6. Review phát hiện noindex bị giữ sau trang 404: test tái hiện failure, thêm reset robots trong metadata public; suite 7/7 pass.

Các test backend có cảnh báo Mockito/JDK về agent tự attach từ test infrastructure; không có test failure. Một test run frontend trùng thời điểm dependency install báo missing module; chạy lại sau install hoàn tất đã pass.

`git diff --cached --check` toàn repo báo trailing spaces trong skill nhập nguyên trạng và Markdown master plan có hard line breaks; giữ nguyên để không thay đổi checksum nguồn. Check scoped code/tài liệu M1 không có whitespace error. Git có cảnh báo chuẩn hóa CRLF cho Maven Windows wrapper và CSV demo khi checkout; không thay đổi hành vi ứng dụng.

## Chưa kiểm chứng / để sau

Cloudflare runtime compatibility, SEO/OG sách thật, cookie/CORS trên domain thật, Dokploy deployment, production role separation/rate limit, backup/restore ngoài VPS, media upload và dữ liệu pilot. Không coi local Node SSR là phương án Cloudflare đã được chấp thuận.

Home hiện là shell nền tảng; chưa phải Home nhiều hàng sách trong wireframe M0. Không có CRUD sách, upload hoặc wishlist thực ở M1. Tài khoản Staff được kiểm tra trong test database; chưa có giao diện quản lý tài khoản.

## M2 — gate kỹ thuật và pilot

Ngày 22/10/2026, branch `feat/m2-admin-catalogue`. Task1–10 hoàn tất; task11 còn **pilot chủ tiệm10–20 cuốn thật**, người dùng đã xác nhận sẵn sàng tự nhập/đối chiếu. Chưa đánh dấu M2 hoàn tất hoặc chuyển M3.

| Kiểm tra mới | Kết quả |
|---|---|
| Backend `bash code/backend/run-local.sh -B -ntp verify` |73 PASS,2 live opt-in skipped mặc định; JAR đóng gói PASS |
| Live `MediaLiveTest,CloudinaryLiveTest` |2/2 PASS với me_may_test/memay/test; authenticated JPEG/PNG upload, unsigned original/derived bị chặn, admin stream, replacement, NOT_FOUND, scoped cleanup |
| Frontend `npm test` |34/34 PASS; không token/admin drafts trong browser storage |
| Frontend `npm run build` ngoài sandbox | Browser/server bundles PASS; sandbox build từng đứng, chạy lại ngoài sandbox |
| `node scripts/check-ssr.mjs http://127.0.0.1:4200` | Home/Cách mua initial content/meta,404; HTML admin noindex/no-store PASS |
| Browser Owner qua proxy test4201→8081 | Create→ba ảnh cloud thật→preview→publish→sold→ẩn→khôi phục nháp PASS; ba ảnh load được và default alt đúng mã |
| Browser lỗi/quyền/bàn phím | Hai tab409 giữ nội dung; offline không báo thành công; cookie bị xóa→401 giữ form/hiện reauth; dirty route confirm; Staff không Owner action/menu collection; Tab có focus outline |
| Backup trước dev migration | Custom dump me_may_dev mode0600; restore scratch giữ đúng auth rows; V1→V3 dev đã áp sau backup |
| Restore dữ liệu M2 | Snapshot me_may_test vào me_may_restore_test riêng:9 bảng/auth/audit bằng nguồn, last_value/is_called giữ nguyên, nextval vượt high-water; signed preview từ media reference phục hồi load được |
| Cleanup kiểm thử | Browser fixture riêng cùng3 asset memay/test đã xóa sau restore gate; giữ sequence. Live gate finally chỉ dọn IDs tự tạo; không xóa asset khác hoặc ảnh pilot |
| Review độc lập toàn nhánh |4 finding đã sửa một lượt, test RED→GREEN; không còn finding treo từ lượt review, không dispatch re-review |

Các sửa từ review: timeout upload chưa rõ kết quả giữ UPLOADING đến stale cutoff1h để tránh orphan; media alt/source/file pending tham gia dirty guard; raw/Spring optimistic409 có currentVersion sau rollback; audit media đúng ATTACHED/REPLACED/UPDATED/REMOVED. Browser còn phát hiện format giá en-US, đã thay Intl vi-VN có test; CSR admin cần noindex ở HTTP header, đã thêm cùng regression SSR.

Live rerun sau suite từng dừng ở safety guard vì có pending fixture khác; finally vẫn xóa asset của gate. Worker đã tách đường dọn theo operation UUID dùng chung với batch, live chỉ kiểm trên operation tự tạo; lần sau2/2 PASS. Không bỏ guard hoặc dọn rộng database để làm gate xanh.

Artifact/log local ignored: `.superpowers/sdd/M2_PLAN/`, `.local/backups/S010-before-m2.dump`, `.local/backups/S010-m2-test.dump`, `.local/restore-gate.log`, `output/playwright/m2-preview.png`. Dump thứ hai chỉ chứa dữ liệu kiểm thử; asset disposable đã xóa sau đối chiếu, không dùng làm backup sách bán thật. Credential/cookie/dump không commit.

**Chưa kiểm chứng:** pilot 10–20 cuốn thật/thời gian thao tác/nhãn mã do chủ thực hiện; M3 public SEO/OG/contact, M4 wishlist, importer sau MVP, staging/production/Cloudflare và backup ngoài VPS. Database restore local cùng media references không thay cho backup media độc lập hay gate vận hành production.

## M3 local — kết quả kỹ thuật và gate còn mở

Ngày 23/10/2026, branch feat/m3-public-catalogue. User duyệt M3 local + Flash Sale; không deploy/Cloudflare/M4/import. M2 pilot6 cuốn, chưa đủ10–20.

| Kiểm tra | Kết quả / bằng chứng |
|---|---|
| Backend `bash code/backend/run-local.sh -B -ntp verify` | 85 total,83 PASS/2 live skipped, JAR PASS; gồm migration3→latest giữ book/level/media/audit JSON/code sequence, public visibility/media, filters/page, sale expiry/sold/hidden/version/OWNER |
| Frontend `npm test` (code/frontend) |56/56 PASS; level không căn cứ/video optional, URL/query races, failure vs empty, copyfallback/expiredprice, campaign409 giữ edits |
| Angular `npm run build` | Browser+server PASS ngoài sandbox; trong sandbox exit134 tại Building |
| SSR4200 và built4000 | Initial HTML/title/description/canonical/OG ảnh sách, public ảnh thật200/no-store, unknownbook/collection404, admin headersnoindex/no-store PASS qua check-ssr.mjs |
| Backenddown SSR4001 | Home/catalogue/detail/FlashSale503, không falseempty/404 PASS; sale200 được bắt RED rồi sửa GREEN |
| Dev bảo toàn dữ liệu | pg_dump custom mode0600 trước migration; fingerprint books/listing-minus-basis/media/audit/sequence khớp trước/sau;6 cuốn/18ACTIVE; không resetsequence hoặc tạo sale giả |
| Browser thật | Detail390: ảnh3/3load, nooverflow, dialog text/copy/Escape trả focus. FlashSale layout chụp với browser-only responsefixture, không tạo ưu đãi trênDB; PictureHardcover lọc1, Back và tìm mã1 kết quả PASS ở built4000 |

Artifact/testlog ignored trong .superpowers/sdd/M3_PLAN; backup/fingerprint ignored trong .local/backups. Không commit data/ảnh/cookie tiệm.

Hai link Zalo thật đã cấu hình và endpoint public xác nhận có cả hai. Hydrated browser4000: canonical/OG và enquiry giữ origin cấu hình qua TransferState, dialog có Mở Zalo. Chưa mở nativeapp/gửi tin.

Ngày 24/10/2026, người dùng xác nhận bản hiện tại ổn định và duyệt merge vào main trước M4. Xác nhận này chưa bổ sung bằng chứng mở Zalo trên thiết bị thực hoặc cấu hình sale thật. Các gate còn thiếu bằng chứng: Zalo thiết bị, pilot M2 đủ10–20, Cloudflare/crawler/SEO cache/staging/production.

Review độc lập:4 Important đã sửa một lượt, không re-review: server-clock cho directentry/enquiry; refresh cancellation/URL-state; origin TransferState; khóa inputs sale load/save. RED8frontend+1backend→GREEN56 frontend/83 backend,2 live skipped; thêm4RED/GREEN recovery metadata/destroy. Không có Critical/Minor được reviewer nêu. PublicApi dùng credentials omit, X-Memay-Server-Time từ database; CORS expose header này là việc release nếu API khác origin.

## M4 local — wishlist và hỏi mua nhiều cuốn

Ngày24/10/2026, branch `codex/m4-wishlist`, baseline main a0a2642. User duyệt toàn bộ plan và checkbox chọn một phần danh sách. Không migration/dependency mới, không order/giữ sách. Contract và hành vi ở ARCHITECTURE/DESIGN, cách dùng ở README root.

| Kiểm tra | Kết quả/bằng chứng |
|---|---|
| Baseline trước M4 | Frontend56/56; backend85 total/83pass/2live skipped, JAR PASS |
| Lookup | RED404→GREEN87total/85pass/2live skipped; anonymous PUBLISHED/SOLD/order/dedupe/no internal fields/no-store/time; missing/sai/cap100/large-code/Long overflow/sale expiry |
| Storage/trái tim | RED thiếu module→GREEN68 frontend; browser-only init, order/reopen/corrupt/blocked/quota/cap100/large-code/storage event+clear/destroy/aria |
| Trang/enquiry | RED thiếu page→GREEN78; checkbox subset/selectall/SOLD/hidden/giá mới/offline/retry/late response/cross-tab pending+ready/expiry/destroy/clipboard |
| Review và sửa | Fresh reviewer1Important stale copy-success; browser xác nhận thêm async focus→BODY.4RED→GREEN82; thêm recovery stale notice1RED→GREEN82. Không re-review, không deferred Minor |
| Suite cuối | `npm test` tại code/frontend82/82 (25files); root `bash code/backend/run-local.sh -B -ntp verify`87total/85PASS/2live skipped, JAR; `npm run build` ngoài sandbox PASS |
| SSR | `node scripts/check-ssr.mjs http://127.0.0.1:4000` từ frontend PASS: private wishlist shell/noindex/no-store/no saved codes, public metadata/OG/media/404, admin headers |
| Browser thật Chromium | Lưu hai cuốn/reload còn2, selection reset; chọn1 và2 copy đúng mã/tên/giá/canonical; 360/390 và desktop1440 không tràn ngang; ảnh1280 tải thật |
| Browser recovery/privacy | Cross-tab xóa sau copy xóa text/status cũ và focus về heading khi zero; Escape về Prepare khi còn selection; clipboard success callback/denied fallback, SOLD/hidden/offline fixture browser-only và retry; detail bỏ noindex, heart giữ pressed |
| Dev không đổi | Fingerprint book_copy/listing/book_media/audit_event trước–sau byte-identical;6books/18images/46audit giữ nguyên. Không sửa availability/giá/publication hoặc tạo campaign giả |

Log /tmp/me-may-m4-*.log, fingerprint ignored `.local/m4-dev-{before,after}.txt`, ảnh QA ignored `output/playwright/m4-{mobile360,desktop,enquiry390}.png`. Browser inject clipboard callback để kiểm UI và denied fallback; không coi đây là xác nhận OS clipboard/permission trên mọi nền tảng. Console ERR_FAILED duy nhất đến lookup bị abort có chủ đích trong test offline. CLI run-code lần đầu dùng callback destructuring sai, không tính PASS; rerun đúng callback đạt.

**Chưa kiểm chứng/giới hạn:** Safari iPhone/Android Chrome/Facebook/Zalo in-app và mở/dán/gửi Zalo trên thiết bị thật; không gửi tin trong QA. Chưa đo hiệu năng100cuốn thực tế hoặc atomic concurrent tab writes (localStorage best-effort). M2 pilot10–20, Cloudflare/deploy/production/offsite restore/performance giữ gate riêng; M4 chỉ bàn giao local, chờ tiệm nghiệm thu/merge riêng.

## Xác nhận M3/M4 và publish GitHub — 25/10/2026

- Người dùng xác nhận “đã test xong m3 và m4”, yêu cầu publish GitHub và để các chỉnh sửa còn lại sau MVP; chưa cung cấp chi tiết chỉnh sửa. Ghi nhận nghiệm thu local của người dùng; không suy thêm thiết bị/trình duyệt hoặc kết quả native Zalo chưa được mô tả.
- Chạy lại trước tích hợp: frontend `npm test`82/82 (25files), backend root `bash code/backend/run-local.sh -B -ntp verify`87total/85PASS/2live skipped, JAR thành công. Không đổi product code hoặc gọi cloud live. Log /tmp/me-may-m3-m4-publish-{frontend,backend}.log.
- M3 đã có trên main a0a2642; M4 source a02b697 gồm4commits cần tích hợp. Trạng thái merge/push/remote cuối ở DEV_LOG/PROGRESS.
- Chưa có VPS; user tự chuẩn bị Cloudflare Pages và nhờ đề xuất backend/database miễn phí. Render Free + Neon Free là đề xuất test, chưa provision/chốt/deploy. Cold-start/auth/DB/render/backup phải kiểm chứng trong spec M5, chưa coi local nghiệm thu là production.

### Workers đã chốt và Neon đã cung cấp — cập nhật25/10

- User sau đó chốt frontend **Workers thay Pages** để giữ SSR, cung cấp Neon trong root .env. Đây là quyết định hạ tầng mới nhất, thay dòng Pages ở checkpoint publish trên. SSR runtime/handler chưa deploy hoặc kiểm chứng trên Worker.
- Static kiểm tra secret-safe thấy URL Neon pooled/TLS ở dòng riêng chưa phải env assignment. Đã chuẩn hóa thành NEON_DATABASE_URL, giữ DB_URL/TEST_DB_URL local. .env ignored; .env.example chỉ thêm tên biến rỗng. Không thay Spring datasource hoặc chạy app với DBcloud.
- `python3 /tmp/me-may-neon-readonly/check.py` dùng JDK21/PostgreSQL JDBC42.7.13 sẵn có, credential qua process env (không argv/log). Transaction read-only + rollback PASS: PostgreSQL18.6, public0base tables, chưa có flyway_schema_history. Không ghi schema/data, bootstrap Owner, tạo project/branch, migrate hoặc di chuyển local books/media.
- Chỉ có pooled URL; direct/non-pooled cho Flyway chưa cung cấp. Chưa đo quota/connection pooling/load/cold-start, chưa dùng Neon MCP để thay tài nguyên. Kiểm tra kết nối không thay nghiệm thu deployment, backup hoặc auth.

## Frontend Workers local — 26/10/2026

- Angular neutral Workers build PASS; Node build PASS. Frontend89/89 (26files), regression
  admin asset-like privacy RED1/89→GREEN89/89; không thay backend/migration.
- workerd8787 check-ssr PASS HTML Home/how-to/catalogue/detail/OG/canonical/images,
  unknown/book/collection404, private wishlist shell và admin noindex/no-store.
- Isolated check-worker-proxy PASS POST/query/body/cookie/CSRF/multipart, separate
  Set-Cookie, server-time/no-store, request context canonical8788 và backend-down503.
  Mock backend ephemeral, không ghi DBdev hoặc dùng Neon.
- Chromium390: hydrate rồi lưu1, badge1/wishlist/chọn1/enquiry URL8787 đúng;
  Escape đóng dialog, detail navigation xóa noindex, không overflow. Không mở/gửi Zalo.
- Chromium desktop1440 direct detail reload: saved heart pressed, không overflow hoặc pageerror;
  anonymous CSRF endpoint giữ MEMAYSESSION và token header, không in token/cookie values.
- npm audit sau override body-parser2.4.0/undici7.30.1:0 vulnerabilities.
  SSR checker Node4002 và Workers8787 final PASS; review độc lập0Critical/Important/Minor; log /tmp/me-may-workers-*.
- Chưa deploy Cloudflare/Render, migrate Neon; chưa bằng chứng production CPU/quota/
  cold-start/TLS/Secure cookie hoặc thiết bị Safari/Chrome/Zalo thật. Backend verify
  không chạy lại vì không thay backend, dữ liệu/schema hoặc contract nghiệp vụ.

Review read-only cded8a7..4a0f463; reviewer tự probe SSR/privacy/404, không chạy lại suite/build/browser. Render/Neon và deployed CPU/quota/TLS/cookie vẫn ngoài scope, chưa được nghiệm thu.

## Deploy setup Workers/Render/Neon — 26/10/2026

- Frontend origin/forwarding RED2→GREEN91/91; Workers build and dry-run PASS,
  bundle1789KiB/gzip421KiB. Không publish Worker. HTTPSworkerd8790 mô phỏng
  me-may.qa.workers.dev + malicious forwarded headers: SSR/canonical/hydration200.
- Python env generator3/3 PASS: percent-decoded credentials, trusted TLS/direct cùng
  target, từ chối host/DB khác, không mang DB_URL/TEST_DB_URL/profilelocal sang Render.
  .local/render.env0600, root.env không đổi; values không xuất chat/log tracked.
- Render bootstrap regression REDmissingowner; testdatasource wiring sửa dùng DBtest,
  startup phát hiện Cloudinary namespace online-test chưa hỗ trợ rồi thêm theo RED.
  Backend verify88total/86PASS/2cloudLiveSkipped, JAR PASS; không chạy test vào Neon.
- Docker multi-stage build PASS; run512MB với Neon verification branch: health200,
  UID10001, PORT10000 hoạt động, RAM271MiB ở probe. Đây là local image, chưa Render.
- Neon branch thử m5-migration-verification: Flyway12.4.0 V1–V5 migrate/validate/info
  PASS. Target supplied .env đối chiếu APIendpoint, public trống trước migration;
  directTLSverify-full/JVMtrust/channelbindingRequire; targetmigrate/validate/info PASS.
  Sau migration5history/version5,0books/0media/0admins/saleDisabled; không copy dev.
- Neon schema neon_auth có sẵn được giữ nguyên. Branch thử đã xóa sau xác nhận
  user; không reset production hoặc bật NeonAuth cho app.
- Chưa: userdeploy Worker/Render, customdomain/TLS/CPUquota/cold-start, login/ảnh thật
  online/nativephone/in-app, backuprestore. Review47be225:0Critical/0Important; một finding current summaries cũ được giải quyết trong bước consolidation bắt buộc.

- Chrome390 với DNSmapping browser-only me-may.qa.workers.dev→workerdHTTPS8790:
  hydrate/save/badge/wishlist/select/enquiry đúng HTTPSorigin, no overflow/Escape PASS.
  Không deploy hoặc gửi Zalo. Chromium mới chưa cài, dùng Chrome đã cài, không đổi app.

Postmerge main9b87e6f: frontend91/91, Python3/3, backend88total86PASS2liveSkipped/JAR
PASS; source publish GitHub. Không deploy Worker/Render; endpoint/DB credentials chỉ
executor kiểm tra live, reviewer không mở secret. Logs /tmp/me-may-deploy-* và .local
ignored; migration info/history xác nhận version5, không thay gate recovery.

## Owner cố định — 27/10/2026

- Command REDmissingclass→GREEN6tests create/idempotence/no-reset/no-elevate/disabled/
  secondowner/validation/concurrency. Mutation bỏ lock cho2owner cùng lúc bị testRED,
  khôi phục lock GREEN. Passwordunicode8emoji bị testRED, codepoint min16 GREEN.
- Render startup giữ legacy bootstrap.enabled=true testREDautocreated→GREEN0admins;
  cấp owner qua command rồi đăng nhập HTTP+CSRF thành công, Secure cookie giữ.
- Backend cleanverify91total/89PASS/2cloudLiveSkipped/JAR PASS. Python7/7 gồm
  không xuất ownersecret vào Render, explicitLocalguard và giữ literal# trong password
  (RED truncation→GREEN), không diễn giải shell hoặc tự dùng BOOTSTRAP cũ.
- Neon trước cấp0admins, sau cấp1activeOWNER, user chọn credential trong root.env;
  operator command OWNER_ACCOUNT=created, không log identity/credential. Idempotent
  rerun trảalready_exists PASS, hash/account không bị ghi đè. Không migration/copydev hoặc triển khai phoneauth.
- Render.env đã tạo lại0600 không OWNER/BOOTSTRAP fields. Reviewa1f7acf0Critical/Important/Minor; chuẩn bị publish dev theo quy ước mới;
  chưa test đăng nhập Render thật vì chưa deploy dịch vụ.
