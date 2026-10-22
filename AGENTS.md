# Mẹ Mây — hướng dẫn làm việc cho agent

## Bắt đầu hoặc tiếp tục một phiên

1. Đọc `docs/PROGRESS.md` để biết giai đoạn hiện tại, việc dang dở và bước kế tiếp.
2. Đọc mục mới nhất của `docs/DEV_LOG.md`; nếu đang sửa việc cũ, đọc thêm mục liên quan.
3. Đọc các phần liên quan của `docs/Me-May_MASTER_PLAN_v3.2_2026-10-21.md`. Đây là baseline phạm vi hiện tại, chưa thay cho technical spec được duyệt.
4. Đọc `docs/SKILLS.md`, chọn skill phù hợp và đọc đầy đủ `SKILL.md` của skill đó trước khi áp dụng. Không nạp toàn bộ 19 skill mỗi phiên.
5. Kiểm tra trạng thái file/Git và xác minh lại môi trường thực tế. Log là bản bàn giao, không phải bằng chứng rằng code hoặc dịch vụ hiện tại vẫn hoạt động.

Không khởi động lại công việc đã hoàn tất chỉ vì phiên chat mới. Dùng log để tìm bằng chứng và tiếp tục từ bước chưa xong. Nếu yêu cầu mới thay đổi phạm vi, ghi quyết định đó vào log và cập nhật tiến độ.

## Nguồn quyết định và giới hạn

- Yêu cầu mới nhất của người dùng là nguồn chỉ đạo hiện tại; system/developer instructions vẫn có độ ưu tiên cao hơn file này.
- Master plan v3.2 ưu tiên hơn proposal cũ trong `docs/proposals/` khi có khác biệt. Proposal cũ và legacy assessment là lịch sử/tham khảo.
- Bản spec/ADR được duyệt sau này ghi rõ quyết định nào thay thế master plan. Không âm thầm sửa phạm vi thông qua code hoặc skill.
- Người dùng đã duyệt M0 và M1 local, yêu cầu thực thi ngày 22/10/2026. M1 dùng PostgreSQL Docker hiện có; hoãn Docker hóa ứng dụng, CI/CD và deploy. Plan thực thi: `docs/superpowers/plans/2026-10-22-m1-local.md`.

## Các ràng buộc chính từ master plan

- Angular + Spring Boot modular monolith. Không đổi sang React/Next.js theo mặc định của skill.
- Frontend Cloudflare; backend VPS/Dokploy; PostgreSQL tự quản trên VPS/Dokploy qua Spring JDBC; ảnh Cloudinary. Resend sau MVP.
- Public mobile-first; admin desktop-first; quyền OWNER/STAFF kiểm tra ở backend.
- MVP: catalogue + wishlist trên thiết bị + liên hệ Facebook/Zalo + quản trị. Không tạo order, checkout, payment, reservation, hold timer, đồng bộ đa kênh hay pipeline AI.
- Mỗi cuốn vật lý có mã duy nhất; `BookCopy` tách `Listing`; xuất bản khác khả dụng; giá nguyên VND; audit và chống ghi đè dữ liệu cũ.
- Nháp/ẩn không lộ public. Wishlist không giữ sách và không hứa đồng bộ khác thiết bị.
- Cloudflare render/SEO/OG là spike chưa được xác minh. Không coi Workers Assets là bằng chứng đã chạy Angular SSR; không tự chuyển SSR lên VPS hoặc bỏ tiêu chí SEO.
- Backup/restore database và media, bảo mật, accessibility và kiểm tra hành vi thực tế là yêu cầu của milestone, không cắt bỏ vì skill yêu cầu tối giản.

## Skill tái sử dụng và Superpowers

- Skill project-local nằm ở `.agents/skills/`; bản gốc được sao chép từ Ellora và chưa sửa nội dung. Registry và lưu ý tương thích: `docs/SKILLS.md`.
- Khi tác vụ phù hợp Superpowers, dùng quy trình tương ứng: brainstorming cho thiết kế mới, writing-plans sau khi spec được duyệt; debugging cho lỗi; verification trước khi tuyên bố hoàn thành.
- Hướng dẫn project-local bổ sung cho Superpowers, không bỏ qua giai đoạn thiết kế/duyệt hiện hành và không tự cấp quyền deploy/publish.
- Áp dụng nguyên tắc gọn, tái sử dụng, ít dependency từ `.agents/rules/ponytail.md`, trong phạm vi đã hiểu và cần thiết.
- Chỉ chọn một hướng visual chính cho từng đầu việc. `design-taste-frontend` chủ yếu dành cho marketing/landing; không áp nguyên bộ quy tắc đó cho bảng/form quản trị.
- Các ví dụ React/Tailwind/GSAP, motion bắt buộc, màu/font và bố cục trong skill là tham khảo có điều kiện. Stack, wireframe được duyệt, khả năng đọc, reduced motion và hiệu năng Mẹ Mây ưu tiên hơn các mặc định đó.
- Không cài thêm framework/library hoặc tạo ảnh chỉ vì một skill có ví dụ dùng chúng. Khi cần image generation, dùng tool/skill imagegen đang có theo phạm vi tác vụ.
- `stitch-design-taste/DESIGN.md` là mẫu đi kèm skill, không phải design system đã duyệt của Mẹ Mây. Skill nhắc tool không có thì ghi giới hạn và dùng lựa chọn phù hợp hiện có.

## Ghi log bắt buộc khi thực hiện công việc

Hai file bàn giao dùng chung cho mọi phiên:

- `docs/PROGRESS.md`: snapshot ngắn của trạng thái hiện tại, milestone, việc đang làm, blocker, bước tiếp theo và các tài liệu cần đọc.
- `docs/DEV_LOG.md`: nhật ký theo phiên/checkpoint, thêm mục mới ở cuối, giữ lịch sử. Không thay bằng transcript chat hoặc runtime/application logs.

Trước khi bắt đầu một task code, ghi mục tiêu, ticket/milestone, phạm vi và trạng thái đang làm. Sau mỗi task có kết quả đáng kể, sau kiểm tra quan trọng hoặc trước đổi giai đoạn, cập nhật file. Trước khi kết thúc phiên hoặc bàn giao, cập nhật cả hai; không đợi cuối phiên dài mới ghi mọi thứ.

Mỗi mục log ghi:

1. Ngày theo Asia/Ho_Chi_Minh, session/checkpoint ID và mục tiêu.
2. Phạm vi được yêu cầu; file thay đổi; quyết định và lý do ngắn.
3. Kiểm tra đã chạy: lệnh, thư mục chạy, kết quả, giới hạn. Ghi rõ “chưa chạy” cho kiểm tra còn thiếu; không biến dự kiến thành kết quả.
4. Việc dang dở, lỗi/blocker, các phương án đã thử không hiệu quả để phiên sau không lặp lại.
5. Bước tiếp theo cụ thể, điều kiện cần có; branch/commit/PR nếu tồn tại. Nếu chưa commit, ghi rõ thay đổi còn local.

Giữ `PROGRESS.md` gọn; không sao chép toàn bộ backlog master plan vào đây. Không đánh dấu milestone hoàn thành chỉ vì đã tạo thư mục hoặc viết kế hoạch. Nếu phiên bị ngắt, phiên sau đối chiếu code/file/Git với checkpoint cuối và bổ sung phần phục hồi trước khi tiếp tục.

Không ghi secret, token, connection string có mật khẩu, cookie, nội dung chat khách hoặc thông tin định danh trẻ vào log. Dùng tên biến môi trường và thông tin lỗi đã lược bỏ dữ liệu nhạy cảm.

Khi thực sự có Git repository, đưa các file bàn giao và tài liệu workflow vào cùng commit với thay đổi liên quan theo workflow đã được cho phép. Không tự khởi tạo repo, push hoặc deploy chỉ để có log.

<!-- codebase-memory-mcp:start -->
# Codebase Knowledge Graph (codebase-memory-mcp)

This project uses codebase-memory-mcp to maintain a knowledge graph of the codebase.
ALWAYS prefer MCP graph tools over grep/glob/file-search for code discovery.

## Priority Order
1. `search_graph` — find functions, classes, routes, variables by pattern
2. `trace_path` — trace who calls a function or what it calls
3. `get_code_snippet` — read specific function/class source code
4. `query_graph` — run Cypher queries for complex patterns
5. `get_architecture` — high-level project summary

Run `index_repository` first when the repository is not indexed.

## When to fall back to grep/glob
- Searching for string literals, error messages, config values
- Searching non-code files (Dockerfiles, shell scripts, configs)
- When MCP tools return insufficient results

## Examples
- Find a handler: `search_graph(name_pattern=".*OrderHandler.*")`
- Who calls it: `trace_path(function_name="OrderHandler", direction="inbound")`
- Read source: `get_code_snippet(qualified_name="pkg/orders.OrderHandler")`
<!-- codebase-memory-mcp:end -->
