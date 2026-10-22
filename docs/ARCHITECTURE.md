# Cấu trúc repo — tham khảo Ellora, phù hợp Mẹ Mây

Cập nhật 22/10/2026: scaffold M1 đã có; các feature catalogue/media bên dưới là hướng tổ chức cho milestone sau. Giữ các thư mục `code/frontend`, `code/backend`, `database`, `docs` đang có. Không tạo thêm `frontend/` hoặc `backend/` ở root gây hai nguồn code.

## Phần đã tham khảo

Graph của Ellora cho thấy code chính ở `code/frontend` và `code/backend`. Frontend dùng `features`, `layouts`, `shared` cùng config/services/models/guards/interceptors; backend phân lớp controller/service/repository/entity/dto. Đã đọc thêm `docs/architecture-and-stack.md`, `docs/frontend-guidelines.md`, `docs/backend-guidelines.md` của Ellora.

Học cách tách giao diện public/admin và shared component, nhưng gom API/model của từng feature vào gần nơi sử dụng, tránh thêm nhiều thư mục dùng chung chỉ có một consumer. Backend vẫn controller → service → repository, nhóm theo domain như master plan để một thay đổi cuốn sách không trải khắp nhiều thư mục lớn.

Không kế thừa Cognito/Amplify, booking, payment, branding, private env, dependency hoặc `ddl-auto: update`. Mẹ Mây dùng session quản trị và Flyway. Không copy source Ellora trong M0.

## Layout dự kiến

```text
me-may/
├── AGENTS.md
├── README.md                     # Entrypoint tài liệu khi bắt đầu triển khai
├── .agents/                      # Skill local, Git ignored
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
│       ├── run-local.sh          # Chạy backend local; Dockerfile đang hoãn
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
├── ops/                          # Chỉ tạo khi làm vận hành; Docker/CI/deploy đang hoãn
└── docs/                         # Tên cố định, ghi đè bản hiện hành
    ├── README.md                 # Mục lục và quy tắc tài liệu
    ├── MASTER_PLAN.md
    ├── DESIGN.md
    ├── DATA.md
    ├── ARCHITECTURE.md
    ├── VERIFICATION.md
    ├── PROGRESS.md
    ├── DEV_LOG.md
    ├── assets/                   # Ảnh tham khảo và wireframe
    └── fixtures/                 # Dữ liệu minh họa có nhãn
```

Package thực tế ở M1 là `vn.memay`; các domain chưa dùng trong sơ đồ không phải module đã triển khai. Không tạo các file/thư mục trống chỉ để giống sơ đồ. Không thêm Nx, Maven multi-module, NgRx hoặc module “AI/order/email” khi chưa dùng.

## Trách nhiệm và phụ thuộc

- Home lấy public catalogue/taxonomy; không đọc trực tiếp database hoặc API quản trị.
- Wishlist dùng ID công khai và storage adapter chỉ chạy ở browser; xác minh lại dữ liệu qua public API, không giữ snapshot làm nguồn giá cuối cùng.
- Admin dùng endpoint có session/CSRF; guard chỉ hỗ trợ UI, backend là nơi quyết định quyền.
- Media xử lý provider; catalogue/listing chỉ dùng định danh và metadata media cần thiết.
- Test đặt gần feature theo convention framework, test backend nằm trong src/test; tránh folder test cấp root rời ngữ cảnh khi chưa cần.
- `database/` không chứa dump production/PII; `ops/` không chứa secret hoặc data volume. Mọi config mẫu chỉ có tên biến và giá trị demo an toàn.

## Hệ quả triển khai

Cloudflare build root là `code/frontend`; Spring build context `code/backend`. PostgreSQL là service riêng của Dokploy, có volume và private network. Không nhét database binary hoặc file ảnh thật lớn vào repo. Dockerfile/Compose/CI được hoãn theo yêu cầu; chốt khi quay lại milestone triển khai.


## Khảo sát khả năng tận dụng Web Shop cũ

Ngày khảo sát: 21/10/2026. Mã nguồn tham chiếu nằm tại `/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop`. Commit đầu nhánh local quan sát được: `a3eaaeb6` (`docs: update formatting and improve readability in README`).

Khảo sát dùng codebase-memory-mcp để lập chỉ mục tạm, tìm cấu trúc và đọc symbol; đọc trực tiếp các file cấu hình/tài liệu. Không sửa project cũ, không chạy ứng dụng hoặc kiểm thử. Chỉ mục không lưu artifact vào repo cũ.

### Bằng chứng khảo sát

Các số dòng dưới đây thuộc bản local tại thời điểm khảo sát.

| Nhận định | Bằng chứng |
|---|---|
| README khác cấu hình thực tế | [README](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/README.md) ghi Angular 17/Spring Boot 3.0; [package.json](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/frontend/package.json) có Angular `^20.3.0`; [pom.xml](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/pom.xml) dùng parent Boot `3.5.6`, Java `21` |
| Có API catalogue phân trang | [CustomerProductController.java:21](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/controllers/CustomerProductController.java:21): `getProductsForCustomer`, tham số page/size/categoryName/search; trang chi tiết theo ID |
| Có tìm kiếm và lọc cơ bản | [ProductRepository.java:29](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/repositories/ProductRepository.java:29): `search` theo keyword/SKU/category/price và Pageable; query join variants, cần đổi theo sách |
| Product gắn schema và nghiệp vụ cũ | [Product.java:21](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/entity/products/Product.java:21): category, variants, images, billDetails, cartItems, promotions, reviews; mô tả `nvarchar(max)` |
| Variant không phù hợp sách từng cuốn | [ProductVariant.java:16](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/entity/products/ProductVariant.java:16): color, size, quantity, price, SKU, quan hệ cart/bill |
| Có lưu định danh ảnh cloud | [ProductImages.java:9](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/entity/products/ProductImages.java:9): imageUrl và publicId unique; tối đa 5 ảnh |
| Upload cần cải thiện xử lý lỗi từng bước | [ProductController.java:70](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/controllers/ProductController.java:70): `uploadImage`, kiểm tra 10 MB/content type, gọi storage.upload rồi createProductImages; catch trả bad request. Trong method đọc được chưa thấy bước xóa bù ảnh nếu lưu record thất bại; đây là rủi ro cần kiểm chứng khi chuyển, không phải kết luận về mọi lớp storage |
| Giới hạn tổng số ảnh nằm ở service | [ProductService.java:199](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/services/ProductService.java:199): `createProductImages` đếm ảnh và từ chối khi đủ 5; lưu URL và publicId |
| Authentication frontend phụ thuộc browser | [auth.service.ts:23](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/frontend/src/app/services/auth.service.ts:23): khởi tạo BehaviorSubject từ helper đọc localStorage; lưu token/profile ở localStorage |
| Có thể tham khảo BCrypt và Spring Security | [SecurityConfig.java:16](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/configurations/SecurityConfig.java:16): UserDetailsService, BCryptPasswordEncoder, AuthenticationProvider |
| Không nên copy nguyên cấu hình endpoint | [WebSecurityConfig.java:24](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/src/main/java/com/g5/techdevices/techstore/configurations/WebSecurityConfig.java:24): stateless JWT, CSRF disabled, `/actuator/**` permitAll, nhiều nhóm role và endpoint commerce |
| Có nhiều phụ thuộc ngoài phạm vi catalogue | [pom.xml](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/shop/backend/pom.xml): PayOS, mail, Thymeleaf, websocket, Faker, metrics; Actuator khai báo hai lần; websocket pin `3.5.7` trong project parent `3.5.6` |
| Hạ tầng cũ vượt nhu cầu catalogue ban đầu | [docker-compose.yml](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/docker-compose.yml): SQL Server, 2 backend replica, nginx, Prometheus và Grafana; không phải đề xuất production nguyên trạng |
| CI có thể làm mẫu nhưng cần tách publish | [docker-publish.yml](/Users/daoquanghung/Documents/FBT/5/isp392/project-isp/Web-Shop/web-shop/.github/workflows/docker-publish.yml): trigger push/pull_request main; job login registry và build với `push: true`; chưa thấy bước test riêng trong workflow này |

### Giới hạn kết luận

- Có code một tính năng không chứng minh tính năng đã hoạt động đúng trong môi trường hiện tại.
- Chưa chạy build/test, thử credential cloud, xác minh deployment hoặc đo hiệu năng. Chưa đưa ra tỷ lệ code tái sử dụng.
- Không thấy node test từ truy vấn graph đã dùng; điều đó chưa chứng minh toàn repository không có test. Khi triển khai cần kiểm kê test thực tế và thêm kiểm tra cho phần được chuyển.
- Không coi cấu hình có Actuator permitAll là bằng chứng mọi endpoint nhạy cảm đang được expose; vẫn cần xem exposure configuration khi đánh giá deployment. Tuy nhiên không nên copy whitelist này cho dự án mới.
- Giao diện và cấu trúc catalogue có thể tận dụng làm tham khảo; nội dung, ảnh và branding của shop điện tử không tự động phù hợp thương hiệu Mẹ Mây.

### Cách chuyển phần hữu ích khi bắt đầu triển khai

1. Tạo baseline Angular–Spring đúng phiên bản đã chốt và database mới.
2. Chuyển từng phần tiện ích cần dùng: bảo vệ quản trị, kết nối kho ảnh, CRUD và phân trang.
3. Mỗi phần chuyển phải đổi package/config/domain name và kiểm tra hành vi theo sách, không import toàn bộ các module cart/bill/payment.
4. Chỉ đưa dữ liệu sách thật do cửa hàng cung cấp vào môi trường mới; chưa có yêu cầu di chuyển user/order/data của shop cũ.
5. Chạy kiểm tra API công khai/quản trị, SSR và upload lỗi trước khi coi module đã tái sử dụng thành công.

Đây là phương pháp dự kiến, không phải các thao tác đã thực hiện.
