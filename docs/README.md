# Chỉ mục tài liệu Mẹ Mây

Cập nhật01/11/2026. Đây là chỉ mục duy nhất. User đóng phạm vi tính năng để
chuyển tối ưu UI; các gate release chưa đạt vẫn giữ. Quy tắc ở [AGENTS](../AGENTS.md).

## Bắt đầu hoặc tiếp tục phiên

1. Đọc [PROGRESS](PROGRESS.md) để biết hướng hiện tại và gate còn mở.
2. Đọc checkpoint cuối [DEV_LOG](DEV_LOG.md); chỉ đọc lịch sử khi liên quan.
3. Chọn tài liệu theo bảng dưới, kiểm Git/môi trường trước khi làm. Bằng chứng
   local hoặc release cũ không thay kiểm tra live của candidate mới.

## Đọc theo đầu việc

| Đầu việc | Nguồn hiện hành |
|---|---|
| Phạm vi MVP, giới hạn, DoD | [MASTER_PLAN](MASTER_PLAN.md), [PROGRESS — gate](PROGRESS.md#gate-tồn-đọng--tổng-hợp0111) |
| Tối ưu giao diện public/admin | [DESIGN](DESIGN.md), [DATA](DATA.md), [CATALOGUE — hành vi cần giữ](CATALOGUE.md#11-hành-vi-cần-bảo-toàn-khi-tối-ưu-ui) |
| Nhập/sửa/publish, quyền, API và media | [CATALOGUE](CATALOGUE.md), [DATA — field](DATA.md#field-nhập-liệu-hiện-hành-sau-m5) |
| Tồn kho/biến thể | [DATA](DATA.md#tồn-kho-và-biến-thể--quyết-định-30102026), [ARCHITECTURE](ARCHITECTURE.md#tồn-theo-biến-thể--contract-30102026), [bằng chứng](BOOK_ENTRY_VERIFICATION.md) |
| Public catalogue, Flash Sale, wishlist, SSR/runtime | [ARCHITECTURE](ARCHITECTURE.md), [DESIGN](DESIGN.md), [README root](../README.md) |
| Import CSV/XLSX | [BOOK_IMPORT](BOOK_IMPORT.md), [DATA — V1/20cột](DATA.md#format-file-import--contract-duyệt31102026), [bằng chứng](BOOK_IMPORT_VERIFICATION.md) |
| Chạy local, auth, lệnh test/build | [README root](../README.md), [CATALOGUE](CATALOGUE.md) |
| Rollout migration/backfill, recovery/rollback | [DEPLOYMENT](DEPLOYMENT.md), [PROGRESS](PROGRESS.md) |
| Đo hiệu năng và smoke sau UI | [DEPLOYMENT — đo QA](DEPLOYMENT.md#quy-trình-đo-qa-còn-phải-thực-hiện), [smoke](DEPLOYMENT.md#smoke-còn-mở-sau-rollout-và-sau-ui-cuối), [bằng chứng nhập/publish](BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md) |
| Đối chiếu kiểm chứng nền tảng/pilot/online/Lighthouse | [VERIFICATION](VERIFICATION.md), [DEV_LOG](DEV_LOG.md) khi cần lịch sử cụ thể |

## Phần còn thực thi

- Format importV2/16cột đã chốt theo workbookuser01/11, chưa triển khai;
  [quyết định](BOOK_IMPORT.md#format-v2--chốt0111-chờ-triển-khai) và taskởPROGRESS.

- Gate còn mở và điều kiện đóng chỉ theo [PROGRESS](PROGRESS.md); thao tác/tiêu chí
  chi tiết ở DEPLOYMENT. Không có plan feature đang thực thi sau khi khép scope.
- Spec/plan M2, M5 completion và hiệu năng nhập/publish đã gộp thành contract,
  quy trình đo và bằng chứng rồi gỡ01/11; không tạo archive hoặc plan trùng.
- Tối ưu UI chưa có brief/spec mới được duyệt. Không tự triển khai thiết kế hoặc
  bỏ gate bảo mật/khôi phục/SEO vì chuyển giai đoạn.
- Commit/pushdev; user merge main/deploy. Không tự migrate/backfill dữ liệu bán thật.

## Giữ tài liệu gọn

Tài liệu hiện hành giữ contract hoặc bằng chứng có giá trị; chỉ PROGRESS là backlog.
DEV_LOG giữ lịch sử nối tiếp, không xóa/rút gọn lịch sử; Git giữ bản spec/plan cũ.
Markdown tối đa400dòng trừ DEV_LOG; không tạo INDEX.md hoặc thư mục archive trùng.
Asset nguồn `code/frontend/public/` tiếp tục tracked; `.env`, skill local, dump,
cookie và QA workspace ignored. `docs/assets/`/`fixtures/` là tham khảo M0 có nhãn,
không là ảnh bán thật hoặc file importer hiện hành.
