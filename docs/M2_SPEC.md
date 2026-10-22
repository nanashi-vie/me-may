# M2 — Đặc tả quản trị catalogue local

Ngày 22/10/2026. **Bản để review; thiết kế tổng thể đã duyệt, spec này chưa được duyệt để triển khai.**

Baseline: [MASTER_PLAN](MASTER_PLAN.md), [DATA](DATA.md), [UX/quyền](DESIGN.md). Vị trí trong workflow: [chỉ mục](README.md#spec-và-plan-đang-thực-thi).

## 1. Mục tiêu và ranh giới

- Chủ/nhân viên nhập thủ công, tìm và sửa từng cuốn; Owner kiểm tra, xuất bản/ẩn, đổi giá và đánh dấu hết hàng.
- Một màn hình/lần lưu cho BookCopy + Listing, nhưng hai entity riêng; thêm ảnh sau lần tạo nháp đầu tiên.
- Mã do website sinh, dùng để dán nhãn và trao đổi; tiệm chưa có mã trong bảng vận hành hiện tại.
- M2 dùng Angular/Spring/PostgreSQL local hiện có và Cloudinary cho ảnh thật; không đổi stack hoặc môi trường database khác.
- M3 mới xây catalogue/detail public và contact flow; M4 xây wishlist. Preview quản trị của M2 không phải public detail đã hoàn tất.
- Không làm importer, order, khách hàng, ngày bán, trọng lượng/vận chuyển, đồng bộ Excel, in tem, video upload hoặc Zalo API.
- Import CSV/Excel tạo mới thành nháp là bước ngay sau MVP; cập nhật sách đã có qua import để giai đoạn sau nữa.
- Docker hóa app, CI/CD, deploy và gate Cloudflare SEO/OG/backup production giữ trạng thái hoãn; không nghiệm thu chúng từ M2 local.

## 2. Kiến trúc và giao dịch

- Kế thừa session/CSRF/OWNER/STAFF của M1. Angular dùng standalone, Reactive Forms và HttpClient; không thêm state framework/UI kit.
- Backend giữ modular monolith: catalogue điều phối aggregate, listing quản lý xuất bản, taxonomy cung cấp nhãn/collection, media quản lý provider, audit lưu lịch sử.
- Controller chỉ bind/validate DTO; service kiểm quyền và điều phối transaction; repository JPA truy cập PostgreSQL/Flyway hiện có.
- BookCopy là gốc aggregate: mọi thay đổi nội dung, Listing, age/collection mapping, ảnh hoặc trạng thái đều phải kiểm và tăng version của BookCopy.
- Một transaction DB gồm thay đổi dữ liệu và AuditEvent; lỗi audit thì rollback dữ liệu. Không giữ transaction/row lock trong lúc gọi Cloudinary.
- Listing không có version độc lập trong M2 để tránh hai cơ chế chống ghi đè. Đây là cụ thể hóa mô hình version minh họa trong master.
- Khi spec được duyệt, API aggregate dưới đây thay ví dụ tách hai bước tạo BookCopy/Listing và upload-authorization trong master; không đổi API auth M1.

## 3. Mã cuốn, định danh và trạng thái

- `book_code_seq` PostgreSQL tăng từ 1, NO CYCLE; service lấy nextval, định dạng `MM-` + tối thiểu sáu chữ số (MM-000001).
- Sau 999999 phải thành MM-1000000, không cắt số. Không dùng COUNT/MAX+1, không reset theo năm hoặc tái sử dụng số rollback.
- Sequence có thể khuyết và các request đồng thời có thể commit khác thứ tự cấp số; không hứa đánh số liên tục theo thời điểm commit.
- `book_code` do server cấp, unique, bất biến; client gửi mã khi create/update bị từ chối. ID nội bộ khác mã nghiệp vụ.
- Slug sinh cùng lúc: mã chuyển lowercase, ví dụ `mm-000001`; unique, bất biến dù tên thay đổi. Đường dẫn M3 dự kiến `/sach/mm-000001`.
- Create luôn tạo đồng thời BookCopy + Listing DRAFT, availability AVAILABLE; không cho client tự publish trong create.
- Publication cho phép DRAFT→PUBLISHED, PUBLISHED→ARCHIVED, ARCHIVED→DRAFT; xuất bản lại qua DRAFT và kiểm đầy đủ lần nữa.
- Không có PUBLISHED→DRAFT trực tiếp; không có hard delete sách/listing trong M2. “Ẩn” không xóa mã, ảnh hoặc audit.
- Availability chỉ AVAILABLE/SOLD, độc lập publication; SOLD không tự archive. Owner có thể đổi lại AVAILABLE khi tiệm xác nhận.

## 4. Schema và bất biến

Tên dưới đây là contract triển khai đề xuất; FK không cascade-delete bằng chứng/audit. Timestamp dùng TIMESTAMPTZ UTC, UI hiển thị giờ Việt Nam.

| Bảng | Dữ liệu và constraint chính |
|---|---|
| book_copy | bigint identity PK; book_code varchar(32) UNIQUE NOT NULL; title varchar(300) nullable; isbn varchar(32), publisher/author varchar(200), language varchar(50) nullable; binding varchar(16) nullable; condition_grade varchar(16) nullable; condition_note varchar(4000) nullable; availability NOT NULL CHECK; version bigint NOT NULL >=0; created_at/updated_at NOT NULL |
| listing | bigint identity PK; book_copy_id UNIQUE NOT NULL FK; slug varchar(80) UNIQUE NOT NULL; price_vnd bigint nullable CHECK >0 nếu có; description varchar(10000) nullable; category_id nullable FK; reading_level varchar(8), reading_level_basis varchar(1000), reading_video_url varchar(2048) nullable; publication_status NOT NULL CHECK; published_at nullable; updated_at NOT NULL |
| category | Sáu bản ghi seed có code UNIQUE cố định, name, slug UNIQUE, sort_order; một FK category/listing, không có many-to-many category |
| listing_age_group | listing_id FK + age_group CHECK, composite PK chống trùng |
| collection | bigint identity PK; name varchar(100) NOT NULL; slug varchar(120) UNIQUE NOT NULL; sort_order integer >=0; active boolean; version bigint; timestamps |
| listing_collection | listing_id FK + collection_id FK, composite PK |
| book_media | UUID PK; book_copy_id FK NOT NULL; role CHECK FRONT/BACK/INSIDE; state CHECK UPLOADING/ACTIVE/DELETE_PENDING; storage_public_id UNIQUE NOT NULL; cloud asset ID/format/bytes/dimensions nullable trước upload; alt varchar(300), source_ref varchar(500) nullable; created_at/updated_at |
| audit_event | bigint identity PK; actor_id FK admin_user; target_type/target_id; action; before/after JSONB chỉ chứa field cho phép; aggregate_version; created_at |

- book_media có unique partial index `(book_copy_id, role)` khi state ACTIVE: tối đa một ảnh hoạt động mỗi vai trò.
- Thêm index listing(publication_status, published_at), book_copy(availability), updated_at/id và FK/mapping phục vụ bảng quản trị.
- Seed category codes: BOARD_BOOK, PICTURE_BOOK, ENCYCLOPEDIA_SCIENCE, HISTORY, CHAPTER, STORY_COLLECTION; nhãn theo DATA.
- age_group codes: AGE_0_3, AGE_4_6, AGE_7_9, AGE_10_PLUS; một cuốn chọn nhiều, có thể để trống nếu chưa xác định.
- binding: PAPERBACK/HARDCOVER; category PICTURE_BOOK bắt buộc đúng một binding cả khi lưu nháp; category khác phải binding=null.
- Đổi category phải gửi binding tương thích ngay trong cùng request. Không lưu ALL/Tất cả; đó chỉ là thao tác bộ lọc M3.
- condition_grade tùy chọn: VERY_GOOD/GOOD/FAIR; không thay condition_note.
- reading_level: PRE_A1/A1/A2/B1/B2/C1/C2 hoặc null; khi có phải có reading_level_basis không rỗng; khi null, basis=null.
- Nhãn và thứ tự đọc theo DATA, Flyers/Key chung A2. Không suy ra level/tuổi từ nhau hoặc từ category.
- Các enum cố định được seed/định nghĩa trong code, không làm trình chỉnh sửa danh sách mức/tuổi/thể loại trong M2.
- Owner quản lý collection; collection inactive không được gán mới, mapping cũ giữ nguyên và hiện rõ là ngừng dùng. Không tự ẩn sách thành viên.
- Không migrate bảng bán hàng trong ảnh; không chép tên khách hoặc coi giá bán lịch sử là giá tham khảo mới.

## 5. Validation, xuất bản và preview

- Chuỗi trim đầu/cuối; chuỗi trắng thành null; không tự sửa tên sách, dịch nội dung hoặc đoán ISBN/author/language.
- Draft cho phép thiếu title/category/giá/condition/ảnh; riêng binding/mức đọc có giá trị thì phải hợp lệ theo mục 4.
- Giá nếu có: số nguyên 1..999999999999 VND; không nhận float, âm, zero hoặc chuỗi có dấu phân cách. UI hiển thị theo vi-VN.
- Nội dung là plain text, Angular escape; không nhận HTML editor hoặc render nội dung bằng innerHTML.
- Link video tùy chọn, absolute HTTPS, không userinfo/control characters; backend không fetch URL hoặc oEmbed (tránh SSRF).
- Publish cần title, category, price_vnd, condition_note, binding hợp lệ nếu Picture book và ba media ACTIVE với ba role khác nhau.
- Owner phải xác nhận đã đối chiếu ba ảnh/tình trạng với đúng cuốn (`confirmedActualCopy=true` trong request publish); ghi xác nhận vào audit.
- Checkbox xác nhận không phải thuật toán chứng minh ảnh thật; pilot vẫn cần người đối chiếu vật thể. Không tự publish dữ liệu demo M0.
- Publish không bắt tuổi, author/publisher, ISBN, description, level hoặc video. Có level vẫn phải có căn cứ nội bộ.
- Lần publish đầu set published_at; hide/restore không xóa mốc này, publish lại không biến cuốn cũ thành mới đăng.
- Mọi cập nhật lên listing PUBLISHED phải giữ điều kiện publish; không được xóa ảnh bắt buộc hoặc làm rỗng giá/title/condition/category.
- Muốn sửa thành dữ liệu chưa hoàn chỉnh: Owner ẩn rồi khôi phục nháp. Thay một ảnh khi published dùng swap nguyên tử ở mục 8.
- Preview là route admin được bảo vệ, có noindex/no-store; chiếu DTO public dự kiến, không hiển thị căn cứ mức đọc/source_ref/audit.
- Preview thiếu dữ liệu được ghi rõ “Bản nháp/chưa đủ điều kiện xuất bản”; không biến thành URL public chia sẻ được.
- Giá luôn có note về tình trạng; level chưa xác định ẩn trường; title ghép bỏ thành phần thiếu/dấu phân cách thừa theo DATA.

## 6. Quyền và lỗi

| Thao tác | STAFF | OWNER |
|---|---|---|
| List/detail/audit/preview quản trị | Có, mọi trạng thái | Có |
| Tạo sách nháp; sửa nội dung/ảnh/collection mapping của DRAFT | Có | Có |
| Sửa PUBLISHED hoặc ARCHIVED, kể cả ảnh | Không | Có |
| Đổi publication hoặc availability | Không | Có |
| Tạo/sửa/ẩn collection | Không | Có |

- Check role và trạng thái hiện tại trong service/transaction; frontend guard/nút ẩn không thay backend enforcement.
- Dùng principal/session để lấy actor, không tin actor/version/timestamps do client giả làm metadata server.
- Không có session trả 401, vượt quyền/CSRF trả 403; request trái quyền không sinh ảnh cloud hoặc audit thành công.
- Entity không có trả 404 ở admin đã xác thực. M2 không thêm endpoint public cho sách nháp/ẩn.
- Tất cả JSON admin, preview và ảnh admin có `Cache-Control: no-store`; HttpClient không đưa admin data vào SSR transfer cache.
- Lỗi nghiệp vụ JSON `{error, message, fieldErrors?, currentVersion?}`; fieldErrors là map đường dẫn field→mảng thông báo tiếng Việt.
- 400: validation/enum/query; 409: version_conflict/transition_conflict/slug_conflict; 413: upload quá lớn; 415: format không hỗ trợ.
- 502: provider trả lỗi; 503: media chưa cấu hình/không truy cập được; không trả secret, signed cloud URL hoặc stack trace.
- Version thiếu/sai kiểu là 400, version cũ là 409; auth/CSRF M1 giữ `{error}` hiện có, không đổi contract login để ép cùng error envelope.

## 7. API aggregate M2

Các path dưới đây có prefix `/api/v1/admin`. ID bigint trả qua JSON dưới dạng chuỗi; version là số nguyên không âm. Không trả JPA entity trực tiếp.

| Method/path | Input / kết quả |
|---|---|
| GET /books | q?, publication?, availability?, page=0, size=20 (1..100); 200 Page<BookSummary> |
| POST /books | BookWrite không version; 201 BookDetail, Location tới /books/{id} |
| GET /books/{id} | 200 BookDetail hoặc 404 |
| PUT /books/{id} | BookWrite + version; thay toàn bộ field nội dung, 200 BookDetail mới |
| PATCH /books/{id}/publication | {version, status, confirmedActualCopy?}; 200 BookDetail |
| PATCH /books/{id}/availability | {version, availability}; 200 BookDetail |
| GET /books/{id}/preview | 200 PreviewBook (chỉ field public dự kiến) |
| POST /books/{id}/media/{role} | multipart file, alt?, sourceRef?, version; 201 BookDetail; tạo mới hoặc thay slot |
| PATCH /books/{id}/media/{role} | {version,alt,sourceRef}; sửa metadata ACTIVE theo quyền, 200 BookDetail |
| DELETE /books/{id}/media/{role}?version=n | 200 BookDetail mới; chỉ cho phép khi không PUBLISHED |
| GET /books/{id}/media/{role}/content | Stream bytes của media ACTIVE, kiểm session; không redirect sang cloud |
| GET /books/{id}/audit | page/size như list, 200 Page<AuditSummary>, mới nhất trước |
| GET /taxonomy | category/ageGroups/bindings/readingLevels kèm code, label, sortOrder |
| GET /collections | Danh sách collection active và inactive cho admin |
| POST /collections | {name,slug,sortOrder,active}; Owner, 201 Collection |
| PUT /collections/{id} | {version,name,sortOrder,active}; Owner, 200 Collection; slug bất biến |

- BookWrite gồm title,isbn,publisher,author,language,binding,conditionGrade,conditionNote,priceVnd,description,categoryCode,ageGroups,readingLevel,readingLevelBasis,readingVideoUrl,collectionIds.
- Tất cả field BookWrite là nullable/trống theo quy tắc draft, ageGroups/collectionIds là mảng không trùng (tối đa 4/100); PUT gửi đủ field, không chứa code/slug/media/publication/availability.
- Field unknown/server-managed bị trả 400; không mass assignment. Tạo không nhận availability hoặc publication từ client.
- BookDetail gồm id,bookCode,slug,version, các field BookWrite,publication,availability,publishedAt,createdAt,updatedAt và media[{id,role,alt,sourceRef,contentPath}].
- BookSummary là id,bookCode,title,priceVnd,publication,availability,version,updatedAt,frontContentPath?; không có cloud URL/căn cứ mức đọc.
- PreviewBook gồm bookCode,slug,title,publisher,author,ageGroups,categoryCode,binding,conditionGrade,conditionNote,priceVnd,description,readingLevel,readingVideoUrl,availability,media; không có căn cứ nội bộ/source_ref.
- Page<T> = {items,page,size,totalElements,totalPages}; sort list updated_at DESC,id DESC, audit created_at DESC,id DESC.
- q trim, tối đa 200 ký tự; mã so khớp không phân biệt hoa/thường, tên tìm substring không phân biệt hoa/thường, escape wildcard và bind SQL parameters.
- M2 chưa hứa tìm tiếng Việt không dấu; unaccent public search sẽ đặc tả M3. Filter admin publication/availability không làm phát sinh filter public.
- Metadata taxonomy giữ thứ tự DATA. Collection slug do Owner nhập, lowercase ASCII [a-z0-9]+(-[a-z0-9]+)*, tối đa 120; duplicate trả 409.
- Collection response gồm id,name,slug,sortOrder,active,version,createdAt,updatedAt; GET /collections sắp sortOrder ASC,id ASC. AuditSummary gồm id,actorId,action,before,after,aggregateVersion,createdAt.
- Mọi mutation gửi CSRF token mới theo cơ chế M1, credentials và version hiện tại; GET không thay dữ liệu.
- M2 chưa mở các API /api/v1/books public, sitemap/OG hoặc contract wishlist; chúng được đặc tả ở M3/M4.

## 8. Vòng đời ba ảnh

Chọn **upload qua backend**, tránh hai bước client tự attach URL. File nhỏ và ba ảnh/cuốn cho phép kiểm quyền/validation tại một boundary; direct signed upload chưa cần trong M2.

- Chỉ JPEG/PNG, tối đa 10 MiB/file và 25 megapixel; kiểm magic/decode/kích thước bằng ImageIO, không tin extension/content-type do trình duyệt gửi.
- UI báo rõ định dạng; HEIC/WebP/PDF/SVG/video bị từ chối có hướng dẫn đổi JPEG/PNG. Không cài bộ chuyển HEIC trong M2.
- Upload giới hạn 30 lần/10 phút/admin và tối đa bốn upload provider đồng thời/instance, vượt trả 429 trước gọi cloud; limiter in-memory có dọn entry hết hạn cho bản local một instance. Rate limit login triển khai ở hardening, không coi cơ chế upload đã bảo vệ login.
- Backend tạo public_id ngẫu nhiên trong namespace môi trường `memay/dev/<UUID>`; không dùng tên khách hoặc tên file làm key, không overwrite cloud asset cũ.
- Upload Cloudinary với resource_type=image và delivery type=authenticated; eager tạo preview JPEG rộng tối đa 1280px, giữ tỉ lệ, tự xoay theo EXIF và bỏ metadata vị trí.
- Chỉ chỉnh hướng/kích thước/nén, không retouch che lỗi. Lưu Cloudinary asset ID/public_id và metadata response trong DB; không tin URL client gửi.
- URL có chữ private không đủ bảo vệ mọi ảnh dẫn xuất; authenticated bảo vệ cả bản gốc và derived. Không đưa signed cloud URL tới browser hoặc log.
- Admin content endpoint kiểm session/quyền đọc, lấy ACTIVE asset, backend ký/lấy preview từ Cloudinary rồi stream; Content-Type image/jpeg, nosniff, no-store, không redirect.
- URL cloud chỉ dùng phía server; host/resource/path lấy từ config/DB đáng tin, không nhận remote file URL từ client. Không lưu API secret trong frontend.
- Nếu alt rỗng, dùng nhãn vai trò + mã cuốn làm alt; sửa alt/sourceRef qua PATCH không cần tải lại ảnh, vẫn tăng version và audit. Không lấy tên file khách làm alt mặc định.

Quy trình upload/thay slot:

1. Transaction ngắn kiểm quyền/version, tạo book_media UPLOADING với public_id đã định trước; chưa đổi slot ACTIVE hoặc version aggregate.
2. Đóng transaction, upload qua Cloudinary với timeout tổng tối đa 60 giây; provider error/timeout không thay ảnh cũ.
3. Transaction mới kiểm lại quyền, trạng thái sách, version và media vẫn UPLOADING; cập nhật metadata, chuyển ảnh cũ sang DELETE_PENDING, ảnh mới ACTIVE, tăng aggregate version và ghi audit.
4. Nếu bước 3 thất bại/xung đột, ảnh mới chuyển DELETE_PENDING; response không báo lưu ảnh thành công. Khi transaction rollback, job vẫn tìm được UPLOADING đã ghi ở bước 1.
5. Worker trong cùng Spring app chạy mỗi 10 phút: UPLOADING quá 1 giờ→DELETE_PENDING; hủy từng asset bằng public_id/resource_type/type chính xác, invalidate=true.
6. Chỉ xóa record cleanup khi provider xác nhận deleted/not found; lỗi giữ DELETE_PENDING, retry lượt sau, log operation ID và bộ đếm tồn đọng, không log file/secret.

- Chuyển UPLOADING→DELETE_PENDING dùng update có điều kiện state; attach cũng kiểm state để cleanup không xóa ảnh vừa ACTIVE. Worker xử lý tối đa 100 record/lượt.
- Stream/upload timeout phía provider phải có giới hạn, không dùng thread chờ vô hạn. UI tuần tự upload các slot, nhận version mới sau mỗi lần; tab khác có thể gây 409.
- Xóa ảnh nháp atomically đánh dấu DELETE_PENDING + tăng version + audit; published không được thiếu slot nên DELETE bị từ chối 409.
- Hide/restore giữ ảnh authenticated, không xóa cloud asset. Không hứa thu hồi ảnh người đã tải về; M3 phải đặc tả public delivery/cache trước khi phát URL CDN công khai.
- Asset ACTIVE không bị cleanup; retry delete ảnh cũ không tác động ảnh mới vì public_id không tái sử dụng.
- M2 không chuyển ảnh thành Cloudinary public khi publish. M3 sẽ chốt public media/SEO delivery theo gate Cloudflare; không coi admin stream là kiểm chứng hiệu năng public.

## 9. Optimistic locking và audit

- Mỗi mutation có expected version; update BookCopy có điều kiện version hiện tại rồi tăng một lần trong transaction, cả khi chỉ đổi field Listing/media.
- Hai request cùng version: tối đa một request thành công; request còn lại rollback toàn bộ và trả 409 currentVersion, không tự merge hoặc retry mutation.
- Kiểm quyền theo trạng thái hiện tại và kiểm version trong cùng transaction; race Staff sửa nháp/Owner publish không vượt quyền.
- No-op trả snapshot hiện tại, không tăng version hoặc tạo audit; vẫn phải qua quyền/version/validation. Request publication cùng trạng thái không tạo mốc publish mới.
- Audit ghi CREATE, UPDATE, PUBLICATION_CHANGED, AVAILABILITY_CHANGED, MEDIA_ATTACHED/REPLACED/UPDATED/REMOVED; collection có CREATE/UPDATE riêng.
- Before/after chỉ field nghiệp vụ thay đổi; media ghi ID/role thay vì signed URL, source_ref nội bộ không public. Actor/time/version lấy server; không audit cookie/password/token/file bytes.
- Audit API chỉ đọc, không có sửa/xóa. Lỗi cloud upload hoặc request bị từ chối không sinh event thành công; dùng technical log không có secret để điều tra.

## 10. Admin UX và hành vi lỗi

- Route list `/admin/sach`, tạo `/admin/sach/moi`, editor `/admin/sach/:id`, preview `/admin/sach/:id/xem-truoc`; collections `/admin/bo-suu-tap`.
- Dùng guard/auth hiện có; list có search tên/mã, filter publication/availability, pagination, ảnh bìa/mã/tên/giá tham khảo/trạng thái/cập nhật.
- Form mã readonly sau create; trước create hiển thị “Tự tạo khi lưu”. Một nút Lưu nháp tạo hai record; thành công điều hướng editor theo ID để upload.
- Disable nút khi đang lưu để chống double-click. POST create không tự retry sau timeout; báo chưa xác định kết quả và cho kiểm tra danh sách gần đây trước tạo lại.
- Field tuổi multi-select, category single-select; Picture book hiện radio Paperback/Hardcover bắt buộc. Đổi category hiển thị rõ việc xóa binding không còn áp dụng.
- Mức đọc single-select có Chưa xác định, basis xuất hiện khi chọn level; không hứa nhãn Cambridge là chứng nhận. Collection chọn nhiều; mục inactive đã gán hiện readonly và được phép bỏ.
- Ba slot ảnh cố định, bìa là thumbnail; mỗi slot có progress/lỗi/thay/xóa theo quyền. Không kéo sắp thứ tự hoặc đổi vai trò tùy ý.
- Không cho upload khi form còn thay đổi chưa lưu; hướng dẫn lưu trước. Sau upload cập nhật snapshot/version, không làm mất field người dùng đang nhập.
- Khi 400 giữ dữ liệu và focus field đầu tiên; 409 giữ form cũ, cho tải bản server để đối chiếu, không tự reload/ghi đè.
- Session hết hạn giữ nội dung trong memory và báo đăng nhập lại; không lưu dữ liệu quản trị vào localStorage. Reload có thể mất nội dung, UI phải nói rõ.
- Khi rời trang có thay đổi chưa lưu, cảnh báo. Mất mạng không báo thành công, không đổi badge/ảnh cho tới khi server xác nhận.
- Owner có Xuất bản/Ẩn/Khôi phục nháp/Còn hàng-Hết hàng và audit panel; nút nguy hiểm có xác nhận rõ đối tượng/mã, không gọi API vượt quyền từ UI Staff.
- Không dựng menu chết cho chức năng chưa làm: taxonomy cố định lấy từ metadata; quản lý tài khoản/contact config không tự mở rộng vào M2.
- Preview dễ nhận biết là quản trị, dùng dữ liệu đã lưu; đúng ba ảnh, giá note, mức đọc và mô tả lỗi. Không có nút gửi Zalo/nhóm giả hoặc wishlist hoạt động trước M3/M4.
- Form có label/error gắn field, focus rõ, nút trái tim/CTA tương lai không dùng icon không nhãn; badge không chỉ dùng màu, desktop keyboard thao tác được.

## 11. Migration, cấu hình và vận hành local

- Giữ nguyên V1__admin_users.sql; thêm V2__catalogue.sql cho schema/sequence và V3__catalogue_taxonomy.sql cho seed. Không sửa checksum V1 hoặc chạy SQL lên DB khác.
- Test dùng me_may_test với guard tên DB như M1; chỉ xóa fixture test, không truncate bảng/dev/database dùng chung của Docker.
- Chỉ seed taxonomy/reference; không seed sách bán thật hoặc fixture SYNTHETIC dưới trạng thái published.
- Thêm biến mẫu CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_NAMESPACE (memay/dev hoặc memay/test) vào .env.example bằng giá trị mẫu; credential thật chỉ trong .env ignored, không gửi qua chat/log.
- Thiếu config media vẫn chạy auth/CRUD nháp; upload/đọc ảnh trả 503 có hướng dẫn. Publish vẫn phải có ba ảnh ACTIVE đã upload/xác minh, không dùng ảnh giả hoặc local-only URL để vượt gate.
- Backend dùng Cloudinary Java SDK tương thích Java 21; chốt bản stable từ nguồn chính thức ở implementation plan. Frontend không cần Cloudinary SDK hoặc dependency mới.
- Unit/integration tự động dùng media gateway giả có lỗi chủ động; live Cloudinary dùng namespace riêng/test image, cleanup kiểm chứng trước khi dùng ảnh pilot.
- Backup/restore DB local trước khi thử migration trên dữ liệu pilot; ghi cách khôi phục và bảo toàn sequence/code/media references. Không tự làm migration down hoặc reset code.
- Nếu DB restore không có đủ lịch sử số đã cấp, đối chiếu high-water mark và mã trên nhãn trước mở lại ghi; không reset sequence từ MAX của tập sách còn lại một cách mù quáng.
- Media cleanup là job trong app, không thêm broker/Redis/outbox framework. Bản local một instance; retry an toàn theo key asset, không hứa vận hành nhiều instance khi chưa thử.

## 12. Kiểm thử và gate nghiệm thu M2

| Nhóm | Trường hợp phải kiểm chứng |
|---|---|
| Migrations | DB test trống áp V1→V3; DB M1 nâng cấp không mất user/auth; schema validate; seed không lặp |
| Mã/aggregate | Tạo hai cuốn cùng tên/ISBN nhận hai mã khác; concurrent create không trùng; rollback có thể khuyết; mốc 999999→1000000; code/slug không sửa; create/save hai entity nguyên tử |
| Draft/validation | Lưu thiếu field được phép; category một/tuổi nhiều; Picture book thiếu binding/ALL bị từ chối; enum/giá/link sai; level null/basis; không suy tuổi/level |
| Publish | Thiếu từng ảnh hoặc title/category/giá/condition bị chặn; đủ ba ảnh + Owner xác nhận thì pass; SOLD vẫn publish được, archive không đổi availability |
| Quyền | Anonymous/CSRF/Staff gọi thẳng API, Staff sửa published/archived, đổi availability/publication/collection đều bị từ chối; không tạo side effect cloud trước kiểm quyền |
| Races | Hai save, save/publish, upload/publish, hai upload cùng slot, remove/replace: một version thắng, request còn lại không ghi đè; state/media cleanup không đua xóa ACTIVE |
| Media | MIME giả/ảnh hỏng/10 MiB/25 MP/HEIC/SVG; lỗi/timeout cloud; DB lỗi sau upload; thay giữ ảnh cũ; cleanup retry restart và not-found; public không lấy draft image qua content path/unsigned cloud URL |
| Audit | Actor/time/version server; before/after đúng; rollback không có event thành công; không leak basis/source/secret trong preview hoặc public projection |
| Frontend | Search mã/tên, filter admin, paging; create→edit→upload→preview→publish→sold→hide→restore; 400/409/401/network giữ dữ liệu; unsaved warning; keyboard/focus/noindex |
| Regression | Auth/CSRF/session M1, metadata/noindex, frontend build và SSR shell hiện có không hỏng |

- Lệnh dự kiến tại code/backend: `bash run-local.sh -B -ntp verify`; tại code/frontend: `npm test`, `npm run build`; root: `git diff --check` và kiểm link/giới hạn tài liệu.
- Browser thử Owner/Staff qua proxy local; không lấy mock gateway hoặc unit test làm bằng chứng live Cloudinary thành công.
- Pilot 10–20 cuốn thật do chủ chọn: đo thao tác nhập/tìm/sửa, đối chiếu mã và ba ảnh, chủ tự publish/đổi hết hàng; ghi lỗi và thời gian thực tế.
- Thiếu credential hoặc dữ liệu pilot không chặn viết code/spec nhưng phải ghi chưa kiểm chứng; không tuyên bố gate media/pilot đạt bằng dữ liệu giả.
- Nghiệm thu M2 cần integration DB, kiểm quyền/race/media lỗi, frontend và browser pass, live upload/cleanup/privacy và pilot có bằng chứng trong VERIFICATION/DEV_LOG.
- Không đánh dấu M3/M4 hoặc production đạt từ M2. Sau khi spec này được duyệt mới viết implementation plan; sau khi plan được duyệt mới code.

## 13. Nguồn và quyết định cụ thể hóa

- Tiếp tục tuân thủ [gate MVP](MASTER_PLAN.md#9-definition-of-done--nghiệm-thu-mvp) và [chi tiết hạ tầng](ARCHITECTURE.md#hạ-tầng-triển-khai); không cắt bảo mật, accessibility hoặc backup để rút scope.
- Spec chọn aggregate API thay create hai bước, version aggregate duy nhất, sequence mã riêng, upload qua backend và ảnh authenticated; đây là các chi tiết cần duyệt cùng spec, chưa phải code đã chạy.
- Cloudinary: [access control](https://cloudinary.com/documentation/control_access_to_media), [upload/destroy API](https://cloudinary.com/documentation/image_upload_api_reference), [cache invalidation](https://cloudinary.com/documentation/invalidate_cached_media_assets_on_the_cdn). Signed upload không tự làm asset thành private; CDN invalidation cũng không tức thì.
- Không dùng bảng Excel bán hàng làm schema catalogue; taxonomy giá/tuổi/mức đọc/ba ảnh theo DATA và quyết định chủ đã xác nhận qua người dùng.
