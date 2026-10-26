# Chỉ mục tài liệu Mẹ Mây

Cập nhật: 26/10/2026. Đây là **chỉ mục duy nhất** để chọn tài liệu cần đọc theo đầu việc; không cần đọc toàn bộ tài liệu mỗi phiên. Quy tắc bắt buộc nằm trong [AGENTS](../AGENTS.md#giữ-tài-liệu-gọn-sau-mỗi-thay-đổi).

## Bắt đầu hoặc tiếp tục phiên

1. Đọc [PROGRESS](PROGRESS.md) để biết milestone, việc dang dở và bước kế tiếp.
2. Đọc **checkpoint mới nhất** ở cuối [DEV_LOG](DEV_LOG.md); chỉ tìm/đọc checkpoint cũ khi cần đối chiếu việc liên quan, không nạp cả nhật ký.
3. Chọn hàng phù hợp bên dưới và chỉ đọc các file/mục phục vụ đầu việc. Đối chiếu Git/môi trường thực tế trước khi tiếp tục; log không phải bằng chứng dịch vụ vẫn chạy.

## Đọc theo đầu việc

| Đầu việc | File/mục cần đọc |
|---|---|
| Chốt hoặc thay đổi phạm vi | [MASTER_PLAN — quyết định](MASTER_PLAN.md#0-chốt-quyết-định-và-giới-hạn), [MVP](MASTER_PLAN.md#3-đặc-tả-phạm-vi-mvp-đủ-để-mở-ticket), [milestones](MASTER_PLAN.md#8-kế-hoạch-triển-khai-theo-milestones-1-full-stack-developer) |
| M2: nhập sách, taxonomy, publication, media | Đọc [M2_SPEC — đã duyệt](M2_SPEC.md) cùng [M2_PLAN — đang thực thi](M2_PLAN.md); đối chiếu [DATA — field](DATA.md#field-nhập-liệu-baseline-trước-m2), [ca dữ liệu](DATA.md#ca-dữ-liệu-cần-review), [DESIGN — quyền](DESIGN.md#quyền-thiết-kế-m0), [editor](DESIGN.md#editor--desktop) khi cần |
| M3: Home/catalogue/detail, bộ lọc, Flash Sale và liên hệ | [ARCHITECTURE — contract public](ARCHITECTURE.md#public-m3--contract-đã-triển-khai), [DESIGN — Home](DESIGN.md#home-theo-mẫu-nxb-kim-đồng), [catalogue](DESIGN.md#catalogue--collection--khách-mobile), [detail](DESIGN.md#chi-tiết-cuốn--khách-mobile); bằng chứng ở VERIFICATION |
| M4: wishlist và nội dung hỏi sách | [DESIGN — danh sách quan tâm](DESIGN.md#danh-sách-quan-tâm--khách-mobile), [ARCHITECTURE — contract/lifecycle](ARCHITECTURE.md#wishlist-m4-local), [VERIFICATION — bằng chứng M4](VERIFICATION.md#m4-local--wishlist-và-hỏi-mua-nhiều-cuốn), [README root — sử dụng](../README.md#wishlist-m4-local) |
| Sửa foundation M1, chạy local hoặc kiểm tra auth | [README root — chạy local](../README.md#chạy-trên-máy-hiện-tại), [auth/API](../README.md#authapi-m1), [VERIFICATION — kết quả/giới hạn](VERIFICATION.md) |
| Tổ chức code hoặc khảo sát nguồn cũ | [ARCHITECTURE — layout](ARCHITECTURE.md#layout-dự-kiến), [trách nhiệm](ARCHITECTURE.md#trách-nhiệm-và-phụ-thuộc); chỉ đọc [khảo sát Web Shop](ARCHITECTURE.md#khảo-sát-khả-năng-tận-dụng-web-shop-cũ) khi cần tái sử dụng |
| Staging/deploy, SEO/OG, bảo mật hạ tầng, backup/restore | [ARCHITECTURE — hạ tầng triển khai](ARCHITECTURE.md#hạ-tầng-triển-khai), [MASTER_PLAN — nghiệm thu MVP](MASTER_PLAN.md#9-definition-of-done--nghiệm-thu-mvp), [VERIFICATION — chưa kiểm chứng](VERIFICATION.md#chưa-kiểm-chứng--để-sau) |
| Deploy Workers/Render và migrate Neon | [DEPLOYMENT — dashboard/env/commands](DEPLOYMENT.md), [VERIFICATION](VERIFICATION.md); setup đang thực thi theo DEPLOY_PLAN |
| Chuẩn bị M5 khi chưa có VPS | [MASTER_PLAN — Workers/Neon đã chốt](MASTER_PLAN.md), [ARCHITECTURE — SSR/runtime/Neon env](ARCHITECTURE.md#điều-chỉnh-trước-m5--25102026); Neon read-only và Workers SSR local đạt, chưa migration/deploy; còn backend/domain/online SSR gate |
| Import CSV/Excel ngay sau MVP | [DATA — import](DATA.md#import-ngay-sau-mvp), [MASTER_PLAN — phân kỳ](MASTER_PLAN.md#7-phân-kỳ-sản-phẩm-và-đường-lên-capstone); chưa triển khai importer trong MVP |

## Spec và plan đang thực thi

- [DEPLOY_PLAN](DEPLOY_PLAN.md): Workers online/Render Docker/Neon migration theo yêu cầu26/10; đang triển khai, không tự deploy services.

- Frontend Workers local26/10 đã kiểm chứng; cách chạy ở [README root](../README.md#frontend-workers-local), runtime/proxy ở [ARCHITECTURE](ARCHITECTURE.md#frontend-workers-local--26102026), bằng chứng ở [VERIFICATION](VERIFICATION.md#frontend-workers-local--26102026).

- M3/M4 local user xác nhận đã test xong25/10 và yêu cầu publish GitHub. Contract/UX/bằng chứng đã gộp vào tài liệu chuẩn, plan hết vai trò đã xóa. Frontend Workers local đã hoàn tất26/10; phần online M5 chưa triển khai.

- [M2_SPEC](M2_SPEC.md): **đã được người dùng duyệt**, gồm contract dữ liệu/API/quyền/media và gate nghiệm thu local; không thay bằng fixture/wireframe cũ.
- [M2_PLAN](M2_PLAN.md): **đã duyệt, thực thi tuần tự**, 11 task theo phụ thuộc; task1–10 xong, task11 còn pilot chủ tiệm; đọc cả spec và task liên quan. Tiến độ task/checkpoint ở PROGRESS/DEV_LOG.

## Vai trò của từng tài liệu

| Tài liệu | Nguồn thông tin hiện hành |
|---|---|
| [AGENTS](../AGENTS.md) | Quy tắc làm việc, giới hạn Markdown, cập nhật và bàn giao |
| [PROGRESS](PROGRESS.md) | Snapshot trạng thái, việc dang dở, blocker và bước tiếp theo |
| [MASTER_PLAN](MASTER_PLAN.md) | Baseline sản phẩm/provider, phân kỳ, milestone và gate nghiệm thu |
| [DESIGN](DESIGN.md) | Sitemap, quyền, Home và UX public/admin theo baseline trước M2 |
| [DATA](DATA.md) | Field, phân loại/mức đọc, giới hạn fixture cũ và quy trình pilot thật |
| [ARCHITECTURE](ARCHITECTURE.md) | Tổ chức code, chi tiết hạ tầng và bằng chứng khảo sát nguồn cũ |
| [VERIFICATION](VERIFICATION.md) | Kiểm tra ứng dụng và giới hạn; chưa phải nghiệm thu production |
| [DEV_LOG](DEV_LOG.md) | Checkpoint lịch sử nối tiếp; đọc theo mục liên quan, được miễn trần 400 dòng |

## Cập nhật và tài nguyên

- Theo [quy tắc tài liệu trong AGENTS](../AGENTS.md#giữ-tài-liệu-gọn-sau-mỗi-thay-đổi): tối đa 400 dòng/file, tài liệu lớn hướng tới 200–400, không có tối thiểu bắt buộc; DEV_LOG là ngoại lệ. Khi chuyển/tách nội dung, cập nhật chỉ mục và liên kết, giữ một nguồn hiện hành cho mỗi chủ đề.
- Không tạo INDEX.md hoặc chỉ mục song song; lịch sử phiên bản do Git quản lý. DEV_LOG có thể nhắc đường dẫn cũ như bằng chứng lịch sử, không phải liên kết tài liệu hiện hành.
- Ảnh tham khảo/wireframe ở `assets/`, CSV minh họa ở `fixtures/`; chúng chưa chuyển sang baseline trước M2 và không phải dữ liệu thương mại. Logo nguồn ở `code/frontend/public/logo.jpg` (tính từ root), chưa tích hợp UI.
- Skill Ellora giữ local trong `.agents/`, được Git ignore; chọn theo AGENTS, không nạp toàn bộ hoặc coi Git clone sẽ có sẵn skill.
