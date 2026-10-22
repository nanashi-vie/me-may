# Tài liệu Mẹ Mây

Cập nhật: 22/10/2026. Mỗi chủ đề chỉ giữ một bản hiện hành; lịch sử bản cũ xem bằng Git.

| Tài liệu | Nội dung |
|---|---|
| [PROGRESS](PROGRESS.md) | Snapshot để tiếp tục phiên sau, việc đang làm và bước kế tiếp |
| [MASTER_PLAN](MASTER_PLAN.md) | Phạm vi, quyết định sản phẩm/hạ tầng và milestone; gồm phạm vi M1 local đã duyệt |
| [DESIGN](DESIGN.md) | Sitemap, quyền, Home và UX các màn hình từ M0 đã duyệt |
| [DATA](DATA.md) | Field schema, fixture giả lập và quy trình pilot thật còn phải làm |
| [ARCHITECTURE](ARCHITECTURE.md) | Tổ chức code và bằng chứng khảo sát Web Shop/Ellora |
| [VERIFICATION](VERIFICATION.md) | Báo cáo kiểm tra ứng dụng mới nhất và giới hạn; chưa phải nghiệm thu production |
| [DEV_LOG](DEV_LOG.md) | Checkpoint theo phiên, quyết định và bằng chứng bàn giao |

Cách chạy/test và auth API: [README ở root](../README.md). Quy tắc làm việc: [AGENTS](../AGENTS.md).

Ảnh tham khảo và wireframe nằm ở `assets/`; CSV minh họa ở `fixtures/`. Đây không phải dữ liệu sách thật được phép xuất bản. Logo nguồn mới ở `code/frontend/public/logo.jpg` (tính từ root repo), chưa tích hợp vào UI.

## Quy tắc cập nhật

1. Sửa trực tiếp file hiện hành thay vì tạo nhiều bản có ngày/version.
2. Khi cần thay file, chuyển nội dung còn giá trị, sửa liên kết và xóa file bị thay trong cùng thay đổi. Không giữ thêm bản archive trùng lặp.
3. Chỉ tạo spec/plan riêng cho phạm vi mới cần duyệt; khi hoàn tất, gộp quyết định/bằng chứng về bộ hiện hành rồi dọn plan hết vai trò.
4. Cập nhật PROGRESS tại chỗ và thêm checkpoint vào DEV_LOG; nhật ký này được giữ nối tiếp để phiên sau làm tiếp.
5. DEV_LOG có thể nhắc đường dẫn cũ như bằng chứng lịch sử; đó không phải tài liệu hiện hành. Dùng `git log --all -- docs` hoặc `git show <commit>:<path>` khi cần tra bản đã xóa.

Skill tái sử dụng từ Ellora nằm local trong `.agents/`, được Git ignore. Hướng dẫn chọn và tương thích Angular/Spring giữ trong AGENTS; máy mới cần sao chép/cài skill riêng.
