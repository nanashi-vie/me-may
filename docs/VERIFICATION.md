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
