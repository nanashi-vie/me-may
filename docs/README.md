# Knowledge base Mẹ Mây

Bắt đầu bằng [tổng quan dự án](context/PROJECT.md), [việc đang mở](PROGRESS.md)
và checkpoint cuối [nhật ký](DEV_LOG.md). Từ repo root, dùng
`tail -40 docs/DEV_LOG.md` để đọc bàn giao gần nhất. [AGENTS.md](../AGENTS.md)
quy định cách xác minh, ghi log và bàn giao qua dev.

## Đọc theo đầu việc

| Khi cần | Nguồn chính |
|---|---|
| Hiểu cách bán qua Page, livestream, website; tồn hoặc combo | [Nghiệp vụ tiệm](context/BUSINESS.md) |
| Hiểu phạm vi đã duyệt, lý do chọn và roadmap | [Quyết định](context/DECISIONS.md), [master plan và DoD](context/MASTER_PLAN.md), [tiến độ](PROGRESS.md) |
| Tìm module, luồng SSR, cache, PostgreSQL, schema | [Kiến trúc](context/ARCHITECTURE.md), [dữ liệu](context/DATA.md) |
| Phân biệt cấu hình repo và tình trạng máy chủ, kiểm quyền hoặc truy cập | [Hạ tầng](context/INFRASTRUCTURE.md), [bảo mật](context/SECURITY.md) |
| Chạy backend/frontend, auth hoặc test trên máy mới | [Chạy local](runbooks/LOCAL.md) |
| Sửa giao diện public/admin, wishlist, CTA, phân trang, banner | [Thiết kế](product/DESIGN.md), [phân trang](product/PAGINATION.md), [banner](product/HERO_BANNERS.md) |
| Nhập, sửa, xuất bản, rà sách thiếu, lọc thùng | [Catalogue](product/CATALOGUE.md), [import CSV/XLSX](product/BOOK_IMPORT.md), [rollout nhập sách](runbooks/BOOK_ENTRY_ROLLOUT.md) |
| Sửa đánh dấu hết hàng, tải ảnh từ `/admin/sach` | [Thao tác danh sách](product/CATALOGUE_ACTIONS.md) |
| Xóa, khôi phục, dọn sách/khách/đơn; Thùng rác chung | [Thùng rác](product/TRASH.md) |
| Kiểm tra tạo thùng → lưu → mở lại → lọc trên candidate | [Nơi lưu trữ](product/CATALOGUE.md#nơi-lưu-trữ-sách), [smoke V20](runbooks/ROLLOUT_CHECKS.md#nơi-lưu-trữ-v20) |
| Điều tra cảnh báo nguồn ảnh, upload máy/Drive và phục hồi | [Quy tắc xuất bản](product/IMAGES.md#10-xác-minh-nguồn-và-chống-ghi-đè), [vận hành ảnh](runbooks/IMAGE_OPERATIONS.md), [bằng chứng](verification/IMAGE_VERIFICATION.md) |
| Sửa hồ sơ khách, đơn keep, giao nhận, tiền và bill | [Khách hàng](product/CUSTOMERS.md), [đơn nội bộ](product/ORDERS.md) |
| Sửa Nhận cọc/Hoàn tiền, ảnh bill chuyển khoản, COD | [Nhận tiền và ảnh bill](product/ORDER_PAYMENTS.md) |
| Sửa trang chi tiết đơn, tab Xuất bill, cân kiện gợi ý, bill gửi khách | [Chi tiết đơn và bill](product/ORDER_BILL.md) |
| Sửa tab, số đếm, bộ lọc danh sách đơn | [Tab danh sách](product/ORDERS.md#41-tab-danh-sách-owner-chốt-2511-sửa-26112026) |
| Sửa chọn khách, thêm sách, gợi ý/cảnh báo sách trùng trong đơn | [Sách trong đơn và chọn khách](product/ORDER_ITEMS.md) |
| Chuẩn bị rollout V37–V39 | [Kiểm tra trước và sau rollout](runbooks/ROLLOUT_CHECKS.md#đơn-nội-bộ-và-bill-v37), [V39](runbooks/ROLLOUT_CHECKS.md#ảnh-bill-hoàn-đơn-một-bước-và-danh-sách-đơn-v39), [bằng chứng đơn](verification/ORDER_VERIFICATION.md), [gate](PROGRESS.md) |
| Kiểm quyền chấm công, lịch, ca và xuất Excel | [Hồ sơ, quyền và PIN](product/ATTENDANCE.md), [bảo mật](context/SECURITY.md) |
| Deploy, backup/restore, rollback, điều tra Cloudflare bỏ lỡ merge | [Runbook triển khai](runbooks/DEPLOYMENT.md), [trigger Builds](runbooks/CLOUDFLARE_BUILDS.md), [phục hồi ảnh](runbooks/IMAGE_OPERATIONS.md) |

## Bằng chứng theo phạm vi

| Cần biết đã kiểm đến đâu | Biên bản |
|---|---|
| Nền tảng M1–M5, pilot, SEO và Lighthouse | [Nền tảng](verification/VERIFICATION.md) |
| Giá, tồn kho, ghi chú nội bộ và nhập sách | [Nhập sách](verification/BOOK_ENTRY_VERIFICATION.md), [import](verification/BOOK_IMPORT_VERIFICATION.md), [hiệu năng publish](verification/BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md) |
| Ảnh, worker, migration, phục hồi | [Hệ ảnh](verification/IMAGE_VERIFICATION.md) |
| Sao chép hỏi mua và switch sáng/tối | [Clipboard](verification/CONTACT_VERIFICATION.md), [theme](verification/THEME_VERIFICATION.md) |
| Khách, đơn hàng và bill | [Khách hàng](verification/CUSTOMER_VERIFICATION.md), [đơn](verification/ORDER_VERIFICATION.md) |

## Duy trì tài liệu

Đăng ký spec/plan đang thực thi dưới `docs/specs/` tại chỉ mục này.
Hiện các contract đã bàn giao nằm trong `product/`; việc kiểm chứng còn mở
nằm tại [PROGRESS](PROGRESS.md). Khi kết thúc một plan, chuyển quyết định,
tiêu chí còn mở và bằng chứng về đúng nguồn. Git lưu phiên bản trước.

Tài liệu Markdown dự án tối đa 400 dòng, ngoại lệ là nhật ký nối tiếp.
Wireframe và fixture M0 trong `assets/` và `fixtures/` là mẫu tham khảo.
Hình trong `assets/order-management/` minh họa thiết kế quản lý đơn.
