# Cấu trúc repo — tham khảo Ellora, phù hợp Mẹ Mây

Trạng thái: đề xuất M0, chưa tạo scaffold. Giữ các thư mục `code/frontend`, `code/backend`, `database`, `docs` đang có. Không tạo thêm `frontend/` hoặc `backend/` ở root gây hai nguồn code.

## Phần đã tham khảo

Graph của Ellora cho thấy code chính ở `code/frontend` và `code/backend`. Frontend dùng `features`, `layouts`, `shared` cùng config/services/models/guards/interceptors; backend phân lớp controller/service/repository/entity/dto. Đã đọc thêm `docs/architecture-and-stack.md`, `docs/frontend-guidelines.md`, `docs/backend-guidelines.md` của Ellora.

Học cách tách giao diện public/admin và shared component, nhưng gom API/model của từng feature vào gần nơi sử dụng, tránh thêm nhiều thư mục dùng chung chỉ có một consumer. Backend vẫn controller → service → repository, nhóm theo domain như master plan để một thay đổi cuốn sách không trải khắp nhiều thư mục lớn.

Không kế thừa Cognito/Amplify, booking, payment, branding, private env, dependency hoặc `ddl-auto: update`. Mẹ Mây dùng session quản trị và Flyway. Không copy source Ellora trong M0.

## Layout dự kiến

```text
me-may/
├── AGENTS.md
├── README.md                     # Entrypoint tài liệu khi bắt đầu triển khai
├── .agents/                      # Bộ skill đã tái sử dụng
├── code/
│   ├── frontend/                 # Một Angular app
│   │   ├── public/               # Logo/font/icon được phép dùng, không phải ảnh kho sách
│   │   └── src/app/
│   │       ├── app.config.ts
│   │       ├── app.routes.ts
│   │       ├── core/             # HTTP config, session/CSRF, SEO, browser storage adapter
│   │       ├── layouts/          # public-layout, admin-layout
│   │       ├── features/
│   │       │   ├── home/
│   │       │   ├── catalogue/    # list/detail và API/model tương ứng
│   │       │   ├── wishlist/     # trạng thái cục bộ + enquiry text
│   │       │   ├── information/  # giới thiệu/cách mua/liên hệ
│   │       │   └── admin/        # login, editor, table, taxonomy; lazy routes
│   │       └── shared/           # book-card, gallery, pagination, filter control đã dùng chung
│   └── backend/
│       ├── pom.xml
│       ├── Dockerfile
│       └── src/
│           ├── main/java/vn/memay/
│           │   ├── catalogue/   # BookCopy, public catalogue; controller/service/repository/DTO
│           │   ├── listing/     # publication/price
│           │   ├── media/       # Cloudinary adapter + media lifecycle
│           │   ├── taxonomy/    # nhóm/collection
│           │   ├── auth/        # session, OWNER/STAFF
│           │   ├── audit/
│           │   ├── contact/     # contact configuration
│           │   └── common/      # config/error primitives dùng thật, không generic framework
│           ├── main/resources/db/migration/  # Nguồn Flyway duy nhất
│           └── test/            # test theo domain tương ứng
├── database/                     # ERD, fixture/import được duyệt; không nhân đôi Flyway SQL
├── ops/                          # Chỉ tạo khi M1 cần: local Compose, Dokploy/runbook, backup
└── docs/
    ├── PROGRESS.md
    ├── DEV_LOG.md
    ├── SKILLS.md
    ├── m0/                       # Deliverable M0 hiện tại
    ├── decisions/                # ADR khi phát sinh quyết định cần lưu
    └── superpowers/              # Technical spec và implementation plan sau review
```

Tên package Java ở trên là đề xuất, chưa phải namespace đã chốt. Không tạo các file/thư mục trống chỉ để giống sơ đồ. Không thêm Nx, Maven multi-module, NgRx hoặc module “AI/order/email” khi chưa dùng.

## Trách nhiệm và phụ thuộc

- Home lấy public catalogue/taxonomy; không đọc trực tiếp database hoặc API quản trị.
- Wishlist dùng ID công khai và storage adapter chỉ chạy ở browser; xác minh lại dữ liệu qua public API, không giữ snapshot làm nguồn giá cuối cùng.
- Admin dùng endpoint có session/CSRF; guard chỉ hỗ trợ UI, backend là nơi quyết định quyền.
- Media xử lý provider; catalogue/listing chỉ dùng định danh và metadata media cần thiết.
- Test đặt gần feature theo convention framework, test backend nằm trong src/test; tránh folder test cấp root rời ngữ cảnh khi chưa cần.
- `database/` không chứa dump production/PII; `ops/` không chứa secret hoặc data volume. Mọi config mẫu chỉ có tên biến và giá trị demo an toàn.

## Hệ quả triển khai

Cloudflare build root là `code/frontend`; Spring build context `code/backend`. PostgreSQL là service riêng của Dokploy, có volume và private network. Không nhét database binary hoặc file ảnh thật lớn vào repo. Chốt Dockerfile/Compose/CI cụ thể ở M1 sau technical spec.
