# Mẹ Mây — hướng dẫn làm việc cho agent

## Bắt đầu hoặc tiếp tục một phiên

1. Bắt đầu từ [chỉ mục duy nhất](docs/README.md), chọn luồng đọc theo đầu việc; không nạp toàn bộ bộ tài liệu mỗi phiên.
2. Theo chỉ mục, đọc `docs/PROGRESS.md` và checkpoint mới nhất của `docs/DEV_LOG.md` để biết trạng thái/bàn giao; chỉ đọc checkpoint cũ khi liên quan.
3. Chỉ đọc các file/mục mà đầu việc cần theo chỉ mục, gồm baseline `docs/MASTER_PLAN.md` và spec đang thực thi nếu có. Master plan chưa thay cho technical spec được duyệt.
4. Chọn skill phù hợp từ danh mục runtime hoặc `.agents/skills/`, đọc đầy đủ `SKILL.md` trước khi áp dụng. Bộ skill local được bỏ qua bởi Git; không nạp toàn bộ mỗi phiên.
5. Kiểm tra trạng thái file/Git và xác minh lại môi trường thực tế. Log là bản bàn giao, không phải bằng chứng rằng code hoặc dịch vụ hiện tại vẫn hoạt động.

Không khởi động lại công việc đã hoàn tất chỉ vì phiên chat mới. Dùng log để tìm bằng chứng và tiếp tục từ bước chưa xong. Nếu yêu cầu mới thay đổi phạm vi, ghi quyết định đó vào log và cập nhật tiến độ.

## Nguồn quyết định và giới hạn

- Yêu cầu mới nhất của người dùng là nguồn chỉ đạo hiện tại; system/developer instructions vẫn có độ ưu tiên cao hơn file này.
- `docs/MASTER_PLAN.md` là bản kế hoạch duy nhất hiện hành. Thiết kế ở `docs/DESIGN.md`, dữ liệu ở `docs/DATA.md`, kiến trúc/chi tiết hạ tầng và khảo sát nguồn cũ ở `docs/ARCHITECTURE.md`. Lịch sử phiên bản tra bằng Git.
- Bản spec/ADR được duyệt sau này ghi rõ quyết định nào thay thế master plan. Không âm thầm sửa phạm vi thông qua code hoặc skill.
- Người dùng đã duyệt M0 và M1 local, yêu cầu thực thi ngày 22/10/2026. M1 dùng PostgreSQL Docker hiện có; hoãn Docker hóa ứng dụng, CI/CD và deploy. Phạm vi M1 local đã gộp vào master plan; kết quả ở `docs/VERIFICATION.md`, contract/cách chạy ở `README.md`.

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

- Skill project-local nằm ở `.agents/skills/`, sao chép từ `/Users/daoquanghung/Documents/FBT/7/exe/ellora/.agents/` ngày 21/10/2026. Giữ local, không commit `.agents/`, `.agent/`, cấu hình IDE hoặc cache agent. Khi cần trên máy mới, sao chép từ nguồn hoặc cài skill phù hợp; không giả định Git clone có skill. Nếu runtime không liệt kê, đọc trực tiếp `SKILL.md` trong thư mục local. Khi cập nhật skill phải đối chiếu diff với bản đã chỉnh trước đó; ghi nguồn/đổi khác vào DEV_LOG.
- Khi tác vụ phù hợp Superpowers, dùng quy trình tương ứng: brainstorming cho thiết kế mới, writing-plans sau khi spec được duyệt; debugging cho lỗi; verification trước khi tuyên bố hoàn thành.
- Hướng dẫn project-local bổ sung cho Superpowers, không bỏ qua giai đoạn thiết kế/duyệt hiện hành và không tự cấp quyền deploy/publish.
- Áp dụng nguyên tắc gọn, tái sử dụng, ít dependency từ `.agents/rules/ponytail.md`, trong phạm vi đã hiểu và cần thiết.
- Chỉ chọn một hướng visual chính cho từng đầu việc. `design-taste-frontend` chủ yếu dành cho marketing/landing; không áp nguyên bộ quy tắc đó cho bảng/form quản trị.
- Các ví dụ React/Tailwind/GSAP, motion bắt buộc, màu/font và bố cục trong skill là tham khảo có điều kiện. Stack, wireframe được duyệt, khả năng đọc, reduced motion và hiệu năng Mẹ Mây ưu tiên hơn các mặc định đó.
- Không cài thêm framework/library hoặc tạo ảnh chỉ vì một skill có ví dụ dùng chúng. Khi cần image generation, dùng tool/skill imagegen đang có theo phạm vi tác vụ.
- `stitch-design-taste/DESIGN.md` là mẫu đi kèm skill, không phải design system đã duyệt của Mẹ Mây. Skill nhắc tool không có thì ghi giới hạn và dùng lựa chọn phù hợp hiện có.

## Giữ tài liệu gọn sau mỗi thay đổi

- Dùng mục lục `docs/README.md`; mỗi chủ đề có một file hiện hành với tên cố định. Ưu tiên cập nhật ngay file đó, không tạo thêm bản theo ngày/version hoặc proposal trùng phạm vi.
- Markdown do dự án quản lý (context, spec, plan, hướng dẫn và chỉ mục) tối đa **400 dòng/file**. Tài liệu lớn hướng tới **200–400 dòng**; file ngắn hơn giữ ngắn, không thêm chữ cho đủ 200 dòng. Không áp việc sửa này lên skill/dependency bên ngoài được sao chép hoặc sinh tự động.
- Không lách giới hạn bằng dòng dài hoặc gộp đoạn. Khi vượt 400 dòng, tách theo trách nhiệm vào file chủ đề hiện hành hoặc file con cần thiết, chuyển đủ nội dung và cập nhật chỉ mục/liên kết trong cùng thay đổi; không nhân bản quyết định hoặc cắt tiêu chí nghiệm thu để giảm dòng.
- `docs/README.md` là chỉ mục duy nhất: ghi rõ đầu việc → file/mục cần đọc, đăng ký spec/plan đang dùng khi tạo và gỡ liên kết khi chúng hết vai trò. Không tạo thêm INDEX.md hoặc một cây chỉ mục song song.
- Nếu cần file thay thế, chuyển đầy đủ quyết định/nội dung còn giá trị, sửa mọi liên kết đang dùng rồi xóa file cũ trong cùng thay đổi. Không chuyển bản cũ sang thư mục archive để giữ lại sự trùng lặp; lịch sử do Git quản lý.
- Spec/plan mới chỉ tạo khi có phạm vi triển khai mới cần duyệt. Khi hoàn tất, gộp quyết định vào tài liệu chuẩn, bằng chứng vào VERIFICATION/DEV_LOG rồi xóa plan đã hết vai trò. Không xóa spec đang được thực thi hoặc chưa chuyển hết tiêu chí chấp nhận.
- DEV_LOG là **ngoại lệ trần 400 dòng**, giữ checkpoint lịch sử nối tiếp trong một file; không tách/xóa/rút gọn lịch sử chỉ để đạt trần. PROGRESS là snapshot ngắn cập nhật tại chỗ; không sao chép lịch sử vào snapshot. Chỉ đọc log theo checkpoint liên quan.
- Chỉ dùng `.gitignore` ở root cho repo này; quy tắc riêng frontend phải ghi đường dẫn phù hợp trong file root.
- Trước bàn giao: kiểm tra giới hạn dòng và chỉ mục theo rule trên, link local, không còn plan/proposal đã thay thế, `.env` và công cụ local được ignore; `code/frontend/public/` chứa asset nguồn (gồm logo) vẫn được Git theo dõi.

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
