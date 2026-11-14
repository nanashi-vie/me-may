# Chỉ mục tài liệu Mẹ Mây

Cập nhật12/11/2026. Đây là chỉ mục duy nhất. Phạm vi mới khách hàng12/11
đã triển khai local; các gate release chưa đạt vẫn giữ. Quy tắc ở [AGENTS](../AGENTS.md).

## Bắt đầu hoặc tiếp tục phiên

1. Đọc [PROGRESS](PROGRESS.md) để biết hướng hiện tại và gate còn mở.
2. Đọc checkpoint cuối [DEV_LOG](DEV_LOG.md); chỉ đọc lịch sử khi liên quan.
3. Chọn tài liệu theo bảng dưới, kiểm Git/môi trường trước khi làm. Bằng chứng
   local hoặc release cũ không thay kiểm tra live của candidate mới.

## Đọc theo đầu việc

| Đầu việc | Nguồn hiện hành |
|---|---|
| Thay banner hero, tối đa10banner và tự chuyển5giây | [Contract, vận hành và bằng chứng](HERO_BANNERS.md) |
| Quản lý khách hàng: hồ sơ, username, trùng SĐT, quyền và lưu trữ | [Contract](CUSTOMERS.md), [bằng chứng local](CUSTOMER_VERIFICATION.md) |
| Ảnh self-host: upload máy/Drive, ghép nguồn, cảnh báo thiếu nguồn vẫn xuất bản12/11 | [Hệ thống ảnh](IMAGES.md) |
| Hồ sơ nhân viên, lịch, chấm công và Excel | [Chấm công](ATTENDANCE_SPEC.md) |
| Nơi lưu trữ sách: contract, tiêu chí và kiểm tra còn mở | [Contract](CATALOGUE.md#nơi-lưu-trữ-sách), [Thiết kế](BOOK_STORAGE_SPEC.md), [Kế hoạch](BOOK_STORAGE_PLAN.md) |
| Vận hành ảnh, migration, backup/restore, rebuild và benchmark | [Runbook](IMAGE_OPERATIONS.md), [bằng chứng và tiêu chí](IMAGE_VERIFICATION.md), [gate hiện hành](PROGRESS.md) |
| Phạm vi MVP, giới hạn, DoD | [MASTER_PLAN](MASTER_PLAN.md), [PROGRESS — gate](PROGRESS.md#gate-tồn-đọng--tổng-hợp0111) |
| CTA Quan tâm/Đã quan tâm và tim wiggle | [Contract](DESIGN.md#danh-sách-quan-tâm--khách-mobile), [bằng chứng WISHLIST-CTA-C03](DEV_LOG.md) |
| Tối ưu giao diện public/admin | [DESIGN](DESIGN.md), [DATA](DATA.md), [CATALOGUE — hành vi cần giữ](CATALOGUE.md#11-hành-vi-cần-bảo-toàn-khi-tối-ưu-ui) |
| Rà sách thiếu thông tin, kiểu bìa và quay lại sau lưu | [Thiết kế](BOOK_COMPLETENESS_SPEC.md) |
| Nhập/sửa/publish, quyền, API và media | [CATALOGUE](CATALOGUE.md), [DATA — field](DATA.md#field-nhập-liệu-hiện-hành-sau-m5) |
| Tải ảnh sách thành ZIP | [CATALOGUE](CATALOGUE.md#tải-ảnh-sách-từ-trang-quản-trị), [bằng chứng](DEV_LOG.md#2026-11-08--s053-c04--nghiệm-thu-tải-zip-ảnh-sách) |
| Nhập giá/kg, tồn gộp, ghi chú nội bộ06/11 | [DATA](DATA.md#nhập-giá-theo-kg-và-sửa-tay-06112026), [CATALOGUE](CATALOGUE.md#payload-nhập-sách-và-field-optional-0611), [bằng chứng](BOOK_ENTRY_VERIFICATION.md#nhập-sách-tồn-gộp-và-ghi-chú-nội-bộ--06112026) |
| Tồn kho/biến thể | [DATA](DATA.md#tồn-gộp-và-tương-thích-biến-thể--quyết-định06112026), [ARCHITECTURE](ARCHITECTURE.md#tồn-gộp-và-tương-thích-biến-thể--contract06112026), [bằng chứng](BOOK_ENTRY_VERIFICATION.md) |
| Sao chép hỏi sách trên Safari/mobile | [Contract](DESIGN.md#chi-tiết-cuốn--khách-mobile), [bằng chứng](CONTACT_VERIFICATION.md) |
| Public catalogue, Flash Sale, wishlist, SSR/runtime | [ARCHITECTURE](ARCHITECTURE.md), [DESIGN](DESIGN.md) |
| Import CSV/XLSX | [BOOK_IMPORT](BOOK_IMPORT.md), [DATA — V4/8cột, đơn giá optional và V1–V3compat](DATA.md#format-file-import--contract-duyệt31102026), [bằng chứng](BOOK_IMPORT_VERIFICATION.md), [đối chiếu form06/11](BOOK_IMPORT_VERIFICATION.md#đối-chiếu-form-mới-và-workbook-user--06112026) |
| Chạy local, auth, lệnh test/build | [ARCHITECTURE — chạy local và Auth M1](ARCHITECTURE.md#chạy-local-kiểm-tra-và-auth-m1), [CATALOGUE](CATALOGUE.md) |
| GitHub Actions, chênh lệch dev/main | [DEPLOYMENT — Git workflow](DEPLOYMENT.md#git-workflow), [DEV_LOG — rà soát](DEV_LOG.md#s040-c02--05112026--kết-quả-rà-soát-project-và-workflow) |
| Rollout nhập sách06/11/V14 và privacy ghi chú | [BOOK_ENTRY_ROLLOUT](BOOK_ENTRY_ROLLOUT.md), [bằng chứng](BOOK_ENTRY_VERIFICATION.md#nhập-sách-tồn-gộp-và-ghi-chú-nội-bộ--06112026) |
| Rollout migration/backfill, recovery/rollback | [DEPLOYMENT](DEPLOYMENT.md), [PROGRESS](PROGRESS.md) |
| Đo hiệu năng và smoke sau UI | [DEPLOYMENT — đo QA](DEPLOYMENT.md#quy-trình-đo-qa-còn-phải-thực-hiện), [smoke](DEPLOYMENT.md#smoke-còn-mở-sau-rollout-và-sau-ui-cuối), [bằng chứng nhập/publish](BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md) |
| Đối chiếu kiểm chứng nền tảng/pilot/online/Lighthouse | [VERIFICATION](VERIFICATION.md), [DEV_LOG](DEV_LOG.md) khi cần lịch sử cụ thể |

## Phần còn thực thi

- Bộ lọc chung admin: [contract](DESIGN.md#hệ-thống-input-field--custom-dropdown-popover-quản-trị-admin-duyệt-0511), duyệt14/11; bằng chứng ADMIN-FILTER-C03 trong DEV_LOG.

- Switch sáng/tối Rive public: [contract](DESIGN.md#sángtối-public--duyệt14112026),
  [bằng chứng](THEME_VERIFICATION.md), đã kiểm local14/11, chưa deploy.

- Ảnh bổ sung, đặc điểm, Thùng rác và hàng chờ tại [CATALOGUE](CATALOGUE.md)
  và [DESIGN](DESIGN.md). Rà soát import tại [BOOK_IMPORT](BOOK_IMPORT.md).
  Rollout V17–V19 tại [BOOK_ENTRY_ROLLOUT](BOOK_ENTRY_ROLLOUT.md).

- 8ảnh/lưu/features06/11 đã gộp vào [CATALOGUE](CATALOGUE.md), [DATA](DATA.md),
  [DESIGN](DESIGN.md); [bằng chứng](BOOK_ENTRY_VERIFICATION.md),
  [rolloutV15](BOOK_ENTRY_ROLLOUT.md). Chưa deployproduction.


- ImportV4/8cột/đơn giá optional đã triển khai/kiểm local; [contract](BOOK_IMPORT.md),
  [schema](DATA.md#format-file-import--contract-duyệt31102026),
  [bằng chứng](BOOK_IMPORT_VERIFICATION.md). Spec/plan đã gộp và gỡ;
  giữ fileV1–V3/receipt cũ, chưa deployV4 online.

- Cache public và trạng thái tải đã gộp contract vào [ARCHITECTURE](ARCHITECTURE.md#cache-public-và-giảm-request--04112026),
  thao tác bật/smoke ở [DEPLOYMENT](DEPLOYMENT.md#cache-public--cấu-hình-và-smoke-04112026),
  bằng chứng local ở [VERIFICATION](VERIFICATION.md#cache-public-và-trạng-thái-tải--04112026).

- Format importV2/16cột và2thểloại01/11 đã triển khai/kiểm local;
  [contract](BOOK_IMPORT.md#format-v2--chốt0111), [bằng chứng](BOOK_IMPORT_VERIFICATION.md#importv2-và-thể-loại-chung-01112026).
  Chưa migrate/deployonlineV12; gate nằmPROGRESS/DEPLOYMENT, không mở lại feature khác.

- Gate còn mở và điều kiện đóng chỉ theo [PROGRESS](PROGRESS.md); thao tác/tiêu chí
  chi tiết ở DEPLOYMENT. Nhập sách06/11 đã triển khai/kiểm local, gộp contract
  vào DATA/CATALOGUE/DESIGN/ARCHITECTURE/BOOK_IMPORT; spec/plan đã hết vai trò
  được gỡ, rollout riêng ở BOOK_ENTRY_ROLLOUT. Chưa nghiệm thu production.
- Spec/plan M2, M5 completion và hiệu năng nhập/publish đã gộp thành contract,
  quy trình đo và bằng chứng rồi gỡ01/11; không tạo archive hoặc plan trùng.
- Tối ưu UI: đợt 1 (navbar desktop dropdown 8 thể loại, mobile header + sidebar `<dialog>`,
  trang `/sach` và `/bo-suu-tap/:slug` cột DANH MỤC/chip) đã gộp vào [DESIGN](DESIGN.md) và
  [VERIFICATION](VERIFICATION.md#tối-ưu-ui-navbar-và-trang-danh-sách-sách--02112026). Không
  tự triển khai thiết kế ngoài phạm vi duyệt hoặc bỏ gate bảo mật/khôi phục/SEO.
- Commit/pushdev; user merge main/deploy. Không tự migrate/backfill dữ liệu bán thật.

Contract/spec và ba plan ảnh 08–11/11 đã hợp nhất vào IMAGES, runbook và
bằng chứng nêu trên ngày12/11; tiêu chí chưa đạt được chuyển, không tự đóng.

## Giữ tài liệu gọn

Tài liệu hiện hành giữ contract hoặc bằng chứng có giá trị; chỉ PROGRESS là backlog.
DEV_LOG giữ lịch sử nối tiếp, không xóa/rút gọn lịch sử; Git giữ bản spec/plan cũ.
Markdown tối đa400dòng trừ DEV_LOG; không tạo INDEX.md hoặc thư mục archive trùng.
Asset nguồn `code/frontend/public/` tiếp tục tracked; `.env`, skill local, dump,
cookie và QA workspace ignored. `docs/assets/`/`fixtures/` là tham khảo M0 có nhãn,
không là ảnh bán thật hoặc file importer hiện hành.

- Cloudflare bỏ lỡ merge main → [trigger Builds](CLOUDFLARE_BUILDS.md): bằng chứng, giới hạn và bước owner kiểm ở lần merge sau.
