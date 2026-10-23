# M1 local — báo cáo kiểm tra

Ngày: 22/10/2026. Phạm vi: kế hoạch M1 local đã duyệt; không phải nghiệm thu staging/production.

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
