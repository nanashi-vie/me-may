# Thiết kế bàn giao knowledge base Mẹ Mây

Ngày 18/11/2026. Owner đã chọn phương án B. Bản thiết kế chờ duyệt.
Mốc kiểm kê là dev tại 6eadf95. Phạm vi là tài liệu dự án trong Git,
đường dẫn dùng tài liệu và hướng dẫn chung cho agent. Repo có 31 Markdown
trong docs trước thay đổi, ngoài ra có AGENTS và hai README gần code/script.
Bằng chứng dưới đây lấy từ repo. Tình trạng máy chủ cần xác minh riêng.

## Cách tiếp quản

Agent bắt đầu ở docs/README.md, đọc PROGRESS và checkpoint cuối DEV_LOG,
rồi theo câu hỏi nghiệp vụ đến nguồn chính. Ví dụ, muốn sửa giữ tồn thì
đọc product/ORDERS.md; muốn rollout V37 thì đọc runbook và gate hiện tại.
Mỗi kết quả nghiệm thu có ngày, revision nếu biết, môi trường, giới hạn và
liên kết tới hành vi hiện hành. DEV_LOG giữ nguyên các checkpoint lịch sử.

A giữ các đường dẫn hiện có và viết lại chỉ mục, chi phí chuyển thấp song
khó phân biệt tài liệu theo vai trò khi duyệt thư mục. B gom theo vai trò,
phải cập nhật các đường dẫn trong cùng thay đổi. Owner chọn B để agent
khác có thể tiếp quản. Quyết định đề xuất dưới đây cần duyệt trước khi di chuyển.

## Ánh xạ 31 nguồn hiện tại

Tên file dưới đây đều tính từ docs. Đích giữ tên nguồn trừ khi ghi rõ.

| Nguồn | Đích và nội dung cần xử lý |
|---|---|
| README.md | Giữ ở gốc làm chỉ mục duy nhất, gồm đường đọc theo công việc và các spec còn thực thi. |
| PROGRESS.md | Giữ ở gốc, rút gọn 400 dòng thành việc đang làm, gate, điều kiện đóng và bước tiếp theo. Đối chiếu từng mục trước khi chuyển lịch sử. |
| DEV_LOG.md | Giữ ở gốc, chỉ nối checkpoint. Đường dẫn cũ trong mô tả lịch sử đọc theo revision tương ứng. |
| MASTER_PLAN.md | context/MASTER_PLAN.md giữ baseline, lộ trình và DoD. Nêu quyết định thay thế gần quy tắc cũ, đặc biệt public hỏi mua và admin quản lý đơn. |
| ARCHITECTURE.md | context/ARCHITECTURE.md giữ ranh giới module và runtime. Chuyển topology sang context/INFRASTRUCTURE.md, thao tác chạy local sang runbooks. |
| DATA.md | context/DATA.md giữ schema, quyền sở hữu dữ liệu và tương thích. |
| DESIGN.md | product/DESIGN.md giữ quy tắc UX dùng chung. |
| CATALOGUE.md | product/CATALOGUE.md giữ hành vi catalogue, nhập sách, lưu trữ và các quy tắc rà sách. |
| BOOK_IMPORT.md | product/BOOK_IMPORT.md giữ format và quy tắc hiện hành cùng khả năng đọc file cũ. |
| CUSTOMERS.md, ORDERS.md | product/ giữ hai contract riêng cho hồ sơ khách và giao dịch nội bộ. |
| PAGINATION.md, HERO_BANNERS.md | product/ giữ hành vi; tách bằng chứng đang lẫn trong contract khi cần để giữ giới hạn dòng. |
| IMAGES.md | product/IMAGES.md giữ luồng upload máy/Drive, nguồn LOCAL, legacy và cảnh báo xuất bản. |
| DEPLOYMENT.md, IMAGE_OPERATIONS.md | runbooks/ giữ trình tự rollout, khôi phục và thao tác ảnh. Gắn từng lệnh với môi trường áp dụng. |
| CLOUDFLARE_BUILDS.md, BOOK_ENTRY_ROLLOUT.md | runbooks/ giữ kiểm tra trigger lúc merge main và rollout theo migration. Chỉ đóng khi có bằng chứng đúng môi trường. |
| ATTENDANCE_SPEC.md | product/ATTENDANCE.md. S063-C03 đã gộp plan, V21–V23 có trong repo. Cập nhật đề xuất cũ theo luồng hồ sơ, lịch và ghi chú chung theo kỳ. |
| BOOK_COMPLETENESS_SPEC.md | Gộp quy tắc kiểu bìa, thiếu thông tin, trở về danh sách vào catalogue và import. S051-C03 đã triển khai; lưu phép thử cuộn/trở về trên browser nếu chưa có bằng chứng về sau. |
| BOOK_STORAGE_SPEC.md | Gộp phần duy nhất vào catalogue/data, gồm quyền, thiếu field khác null, tương thích retry, lọc trước phân trang và dữ liệu admin-only. |
| BOOK_STORAGE_PLAN.md | S056-C02 đã triển khai V20. Chuyển việc smoke form và danh sách trước rollout sang PROGRESS và runbook, rồi gỡ checklist. Smoke riêng bộ lọc chưa bao phủ toàn luồng. |
| VERIFICATION.md | verification/ giữ kết quả theo mốc M1–M5 và host đã đo; tách mục theo trách nhiệm khi vượt trần. Render/Neon là bằng chứng lịch sử. |
| BOOK_ENTRY_VERIFICATION.md | verification/ giữ V14–V15, số liệu và giới hạn QA về giá, tồn, quyền và media. |
| BOOK_IMPORT_VERIFICATION.md | verification/ giữ V1–V4, parser, retry, workload và kiểm tra file cũ. Gắn mốc cho nhận xét về trùng tên trước thay đổi 07/11. |
| BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md | verification/ giữ baseline d1cca7b và candidate 5fd1663. Chỉ so sánh cùng workload; phân biệt môi trường đo cũ với target hiện tại. |
| CONTACT_VERIFICATION.md | verification/ giữ ca WebKit copy/paste thật với API trễ và giới hạn iPhone vật lý. |
| CUSTOMER_VERIFICATION.md | verification/ giữ V32, quyền và QA. Dòng 83 mô tả thời điểm 12/11; thêm tham chiếu tới triển khai đơn 17–18/11. |
| IMAGE_VERIFICATION.md | verification/ giữ benchmark và drill. Sửa hàng Publication trong ma trận mục 3 theo hotfix 12/11 ở đầu file; giữ phép thử chặn cũ có ngày trong lịch sử. |
| ORDER_VERIFICATION.md | verification/ giữ hai mốc V34–V36 và V37. Bổ sung giới hạn browser gửi lại/hoàn từ ORDER-BILL-EXEC; backup/restore và rollout theo dõi riêng. |
| THEME_VERIFICATION.md | verification/ giữ QA Rive, khóa input và fallback, phân biệt browser local với Lighthouse production và thiết bị thật. |

## Phân bổ nội dung khi chuyển

- context/PROJECT.md mô tả người dùng, các luồng public/admin và phạm vi đã duyệt.
  context/BUSINESS.md ghi bán qua Page/livestream, xác nhận sách, tồn và ranh giới
  với website. Với combo, ghi quyết định đã có và phần cần chủ tiệm xác nhận.
- context/INFRASTRUCTURE.md phân biệt cấu hình Git, rollout do owner báo và
  bằng chứng live có ngày. Xác minh từng thông tin về Ubuntu, Swarm, SSH và
  Cloudflare Access từ nguồn dự án trước khi ghi thành hiện trạng.
- context/SECURITY.md tập hợp ranh giới OWNER/STAFF, private media, truy cập
  hạ tầng và các gate còn mở; liên kết contract/kiểm tra nơi có chi tiết.
  context/DECISIONS.md ghi quyết định, lý do, phương án đã loại và nguồn.
- AGENTS.md dẫn vào chỉ mục và sửa giới hạn MVP đã được thay thế. CLAUDE.md
  là adapter ngắn. Giữ hai README cạnh frontend và script benchmark, cập nhật
  tham chiếu cần thiết. Giữ tài liệu đủ dùng khi máy mới chưa cài skill/MCP.
- Tác giả triển khai quyết định cách tách các file gần 400 dòng theo trách nhiệm.
  Giữ tài sản và fixture M0 với nhãn phạm vi. Không sao chép dữ liệu khách,
  thông tin đăng nhập hoặc cấu hình bí mật sang knowledge base.

## Kiểm tra trước bàn giao

Đối chiếu từng nguồn trên với file đích và mọi tiêu chí còn mở trước khi gỡ
file. Rà link, anchor, đường dẫn trong script/workflow và hướng dẫn gốc;
khi đổi đường dẫn liên kết lịch sử, giữ nguyên nội dung và mốc kiểm chứng.
Kiểm giới hạn 400 dòng trừ DEV_LOG, diff và Git tracking/ignore. Thử đi từ
chỉ mục đến bốn câu trả lời: rollout V37, lỗi ảnh thiếu nguồn, quyền chấm
công và smoke lưu trữ. Spec hoàn tất được gộp vào nguồn chính; Git giữ lịch sử.
