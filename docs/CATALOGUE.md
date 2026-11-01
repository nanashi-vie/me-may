# Catalogue quản trị — contract hiện hành

Cập nhật01/11/2026. Gộp quyết định M2/M5 và điều chỉnh nhập sách30/10 đã triển khai
local; không là nghiệm thu online. Không còn spec/plan triển khai M2/M5 song song.
[DATA](DATA.md) giữ field; [DESIGN](DESIGN.md) giữ UX; [ARCHITECTURE](ARCHITECTURE.md)
giữ runtime/public/tồn và hiệu năng; [PROGRESS](PROGRESS.md#gate-tồn-đọng--tổng-hợp0111)
giữ backlog còn mở, [DEPLOYMENT](DEPLOYMENT.md) giữ rollout/đo đạc.

## 1. Phạm vi

OWNER tạo/sửa/ẩn/hiện sách, tồn và collection; STAFF chỉ đọc quản trị. Nhập thủ công
upload vào phiên tạm trước rồi final tạoPUBLISHED nguyên tử; import tạoARCHIVED có
receipt theo [BOOK_IMPORT](BOOK_IMPORT.md). Không có DRAFT/harddelete sách/order/
checkout/giữ chỗ/đồng bộ đa kênh. Mã MM là một mục sách với biến thể có tồn riêng,
dùng chung ảnh và khoảng giá. Không lưu hoặc import dữ liệu khách/ngày bán.

## 2. Kiến trúc và giao dịch

- Kế thừa session/CSRF/OWNER/STAFF của M1. Angular dùng standalone, Reactive Forms và HttpClient; không thêm state framework/UI kit.
- Backend giữ modular monolith: catalogue điều phối aggregate, listing quản lý xuất bản, taxonomy cung cấp nhãn/collection, media quản lý provider, audit lưu lịch sử.
- Controller chỉ bind/validate DTO; service kiểm quyền và điều phối transaction; Spring JDBC truy cập PostgreSQL/Flyway hiện có.
- BookCopy là gốc aggregate: mọi thay đổi nội dung, Listing, age/collection mapping, ảnh hoặc trạng thái đều phải kiểm và tăng version của BookCopy.
- Một transaction DB gồm thay đổi dữ liệu và AuditEvent; lỗi audit thì rollback dữ liệu. Không giữ transaction/row lock trong lúc gọi Cloudinary.
- Listing không có version độc lập trong M2 để tránh hai cơ chế chống ghi đè. Đây là cụ thể hóa mô hình version minh họa trong master.
- API aggregate thay ví dụ tạo BookCopy/Listing hai bước; auth hiện hành không đổi.

## 3. Mã cuốn, định danh và trạng thái

- `book_code_seq` PostgreSQL tăng từ 1, NO CYCLE; service lấy nextval, định dạng `MM-` + tối thiểu sáu chữ số (MM-000001).
- Sau 999999 phải thành MM-1000000, không cắt số. Không dùng COUNT/MAX+1, không reset theo năm hoặc tái sử dụng số rollback.
- Sequence có thể khuyết và các request đồng thời có thể commit khác thứ tự cấp số; không hứa đánh số liên tục theo thời điểm commit.
- `book_code` do server cấp, unique, bất biến; client gửi mã khi create/update bị từ chối. ID nội bộ khác mã nghiệp vụ.
- Slug sinh cùng lúc: mã chuyển lowercase, ví dụ `mm-000001`; unique, bất biến dù tên thay đổi. Đường dẫn public `/sach/mm-000001`.
- Create final tạo BookCopy + Listing PUBLISHED + media ACTIVE cùng transaction, availability dẫn xuất từ tổng tồn; bắt buộc OWNER xác nhận.
- Publication chỉ PUBLISHED↔ARCHIVED trực tiếp; hiện lại phải qua validation và xác nhận.
- Không còn DRAFT; không có hard delete sách/listing trong M2. “Ẩn” không xóa mã, ảnh hoặc audit.
- Availability chỉ AVAILABLE/SOLD, độc lập publication; SOLD không tự archive. OWNER sửa tồn biến thể để chuyển AVAILABLE/SOLD.

## 4. Schema và bất biến

Các bảng/constraint hiện hành; FK không cascade-delete bằng chứng/audit. Timestamp dùng TIMESTAMPTZ UTC, UI hiển thị giờ Việt Nam.

| Bảng | Dữ liệu và constraint chính |
|---|---|
| book_copy | bigint identity PK; book_code varchar(32) UNIQUE NOT NULL; title varchar(300) nullable; isbn varchar(32), publisher/author varchar(200), language varchar(50) nullable; binding varchar(16) nullable; condition_grade varchar(16) nullable; condition_note varchar(4000) nullable; weight_g bigint nullable CHECK 1..9007199254740991; availability NOT NULL CHECK; version bigint NOT NULL >=0; created_at/updated_at NOT NULL |
| listing | bigint identity PK; book_copy_id UNIQUE NOT NULL FK; slug varchar(80) UNIQUE NOT NULL; price_min_vnd/price_max_vnd bigint nullable theo cặp CHECK 1..999999999999 và min≤max; description varchar(10000) nullable; category_id nullable FK; reading_level varchar(8),  reading_video_url varchar(2048) nullable; publication_status NOT NULL CHECK; published_at nullable; updated_at NOT NULL |
| category | Sáu bản ghi seed có code UNIQUE cố định, name, slug UNIQUE, sort_order; một FK category/listing, không có many-to-many category |
| listing_age_group | listing_id FK + age_group CHECK, composite PK chống trùng |
| collection | bigint identity PK; name varchar(100) NOT NULL; slug varchar(120) UNIQUE NOT NULL; sort_order integer >=0; active boolean; version bigint; timestamps |
| listing_collection | listing_id FK + collection_id FK, composite PK |
| book_media | UUID PK; book_copy_id FK NOT NULL; role CHECK FRONT/BACK/SPINE/INSIDE_1/INSIDE_2/INSIDE_3; state CHECK UPLOADING/ACTIVE/DELETE_PENDING; storage_public_id UNIQUE NOT NULL; cloud asset ID/format/bytes/dimensions nullable trước upload; alt varchar(300), source_ref varchar(500) nullable; created_at/updated_at |
| book_variant | UUID PK; book_copy_id FK; name tối đa100; stock0..999999; thứ tự và unique tên trong sách; chi tiết ở ARCHITECTURE/DATA |
| audit_event | bigint identity PK; actor_id FK admin_user; target_type/target_id; action; before/after JSONB chỉ chứa field cho phép; aggregate_version; created_at |

- upload_session/temporary_media giữ intent/owner/expiry/state/fingerprint; V7/V9 và lifecycle ở mục7. Importreceipt V11 ở BOOK_IMPORT.
- book_media có unique partial index `(book_copy_id, role)` khi state ACTIVE: tối đa một ảnh hoạt động mỗi vai trò.
- Thêm index listing(publication_status, published_at), book_copy(availability), updated_at/id và FK/mapping phục vụ bảng quản trị.
- Seed category codes: BOARD_BOOK, PICTURE_BOOK, ENCYCLOPEDIA_SCIENCE, HISTORY, CHAPTER, STORY_COLLECTION; nhãn theo DATA.
- age_group codes: AGE_0_3, AGE_4_6, AGE_7_9, AGE_10_PLUS; một cuốn chọn nhiều, có thể để trống nếu chưa xác định.
- binding: PAPERBACK/HARDCOVER; category PICTURE_BOOK bắt buộc đúng một binding cả khi lưu sách ẩn; category khác phải binding=null.
- Đổi category phải gửi binding tương thích ngay trong cùng request. Không lưu ALL/Tất cả; đó chỉ là thao tác bộ lọc M3.
- condition_grade: HIGH_FRESHNESS/MINOR_FLAWS cho nhập mới; legacy VERY_GOOD/GOOD/FAIR chỉ giữ khi đọc, không thay condition_note.
- reading_level: PRE_A1/A1/A2/B1/B2/C1/C2 hoặc null; không yêu cầu căn cứ khi gán mức.
- Nhãn và thứ tự đọc theo DATA, Flyers/Key chung A2. Không suy ra level/tuổi từ nhau hoặc từ category.
- Các enum cố định được seed/định nghĩa trong code, không làm trình chỉnh sửa danh sách mức/tuổi/thể loại trong M2.
- Owner quản lý collection; collection inactive không được gán mới, mapping cũ giữ nguyên và hiện rõ là ngừng dùng. Không tự ẩn sách thành viên.
- Không migrate bảng bán hàng trong ảnh; không chép tên khách hoặc coi giá bán lịch sử là giá tham khảo mới.

## 5. Validation, xuất bản và preview

- Chuỗi trim đầu/cuối; chuỗi trắng thành null; không tự sửa tên sách, dịch nội dung hoặc đoán ISBN/author/language.
- Không tạo/lưu nháp; import là đường tạo ARCHIVED riêng có receipt. Khi sửa sách ARCHIVED có thể thiếu title/category/condition/ảnh nhưng weight bắt buộc và giá nếu có phải đủ cặp; binding/mức đọc phải hợp lệ.
- Khoảng giá nếu có: hai số nguyên 1..999999999999 VND, min≤max; không nhận float, âm, zero hoặc chuỗi có dấu phân cách. UI hiển thị theo vi-VN.
- Nội dung là plain text, Angular escape; không nhận HTML editor hoặc render nội dung bằng innerHTML.
- Link video tùy chọn, absolute HTTPS, không userinfo/control characters; backend không fetch URL hoặc oEmbed (tránh SSRF).
- Publish cần title, category, priceMinVnd/priceMaxVnd, weightG nguyên dương, condition_note, binding nếu Picture book và 2–6 media ACTIVE có FRONT/BACK, không trùng role.
- Owner phải xác nhận đã đối chiếu các ảnh bắt buộc/tình trạng với đúng cuốn (`confirmedActualCopy=true` trong request publish); ghi xác nhận vào audit.
- Checkbox xác nhận không phải thuật toán chứng minh ảnh thật; pilot vẫn cần người đối chiếu vật thể. Không tự publish dữ liệu demo M0.
- Publish không bắt tuổi, author/publisher, ISBN, description, level hoặc video. Có level không yêu cầu căn cứ nội bộ.
- Lần publish đầu set published_at; hide/restore không xóa mốc này, publish lại không biến cuốn cũ thành mới đăng.
- Mọi cập nhật lên listing PUBLISHED phải giữ điều kiện publish; không được xóa ảnh bắt buộc hoặc làm rỗng giá/title/condition/category.
- Muốn sửa thành dữ liệu chưa hoàn chỉnh: Owner ẩn để chỉnh lại; hiện lại kiểm đầy đủ. Thay một ảnh khi published dùng swap nguyên tử ở mục 8.
- Preview là route admin được bảo vệ, có noindex/no-store; chiếu DTO public, không hiển thị source_ref/audit.
- Preview thiếu dữ liệu được ghi rõ “Chưa đủ điều kiện xuất bản”; không biến thành URL public chia sẻ được.
- Giá luôn có note về tình trạng; level chưa xác định ẩn trường; title ghép bỏ thành phần thiếu/dấu phân cách thừa theo DATA.

## 6. Quyền và lỗi

| Thao tác | STAFF | OWNER |
|---|---|---|
| List/detail/audit/preview quản trị | Có, mọi trạng thái | Có |
| Tạo sách; sửa nội dung/ảnh/collection mapping mọi trạng thái | Không | Có |
| Sửa PUBLISHED hoặc ARCHIVED, kể cả ảnh | Không | Có |
| Đổi publication hoặc availability | Không | Có |
| Tạo/sửa/ẩn collection | Không | Có |

- Check role và trạng thái hiện tại trong service/transaction; frontend guard/nút ẩn không thay backend enforcement.
- Dùng principal/session để lấy actor, không tin actor/version/timestamps do client giả làm metadata server.
- Không có session trả 401, vượt quyền/CSRF trả 403; request trái quyền không sinh ảnh cloud hoặc audit thành công.
- Entity không có trả 404 ở admin đã xác thực. Không có endpoint public cho sách ẩn hoặc ảnh tạm.
- Tất cả JSON admin, preview và ảnh admin có `Cache-Control: no-store`; HttpClient không đưa admin data vào SSR transfer cache.
- Lỗi nghiệp vụ JSON `{error, message, fieldErrors?, currentVersion?}`; fieldErrors là map đường dẫn field→mảng thông báo tiếng Việt.
- 400: validation/enum/query; 409: version_conflict/transition_conflict/slug_conflict; 413: upload quá lớn; 415: format không hỗ trợ.
- 502: provider trả lỗi; 503: media chưa cấu hình/không truy cập được; không trả secret, signed cloud URL hoặc stack trace.
- Version thiếu/sai kiểu là 400, version cũ là 409; auth/CSRF M1 giữ `{error}` hiện có, không đổi contract login để ép cùng error envelope.

## 7. API quản trị catalogue

Các path dưới đây có prefix `/api/v1/admin`. ID bigint trả qua JSON dưới dạng chuỗi; version là số nguyên không âm. Không trả entity lưu trữ trực tiếp.

| Method/path | Input / kết quả |
|---|---|
| GET /books | q?, publication?, availability?, unpublishedOnly?, page=0, size=20 (1..100); 200 Page<BookSummary> |
| POST /books | {write:BookWrite,uploadSessionId,media:[{mediaId,role}],confirmedActualCopy}; 201 BookDetail; cùng payload retry trả cùng sách |
| GET /books/{id} | 200 BookDetail hoặc 404 |
| PUT /books/{id} | BookWrite + version + media? [{mediaId,role}]; thay toàn bộ field nội dung và mapping ảnh nguyên tử, 200 BookDetail mới |
| PATCH /books/{id}/publication | {version, status, confirmedActualCopy?}; 200 BookDetail |
| PATCH /books/{id}/availability | API legacy: OWNER409 stock_managed_availability, STAFF403; cập nhật variants qua PUT |
| GET /books/{id}/preview | 200 PreviewBook (chỉ field public) |
| POST /books/{id}/media/{role} | multipart file, alt?, sourceRef?, version; 201 BookDetail; tạo mới hoặc thay slot |
| PATCH /books/{id}/media/{role} | {version,alt,sourceRef}; sửa metadata ACTIVE theo quyền, 200 BookDetail |
| DELETE /books/{id}/media/{role}?version=n | 200 BookDetail mới; PUBLISHED chỉ gỡ ảnh tùy chọn, giữ FRONT/BACK |
| GET /books/{id}/media/{role}/content | Stream bytes của media ACTIVE, kiểm session; không redirect sang cloud |
| GET /books/{id}/audit | page/size như list, 200 Page<AuditSummary>, mới nhất trước |
| GET /taxonomy | category/ageGroups/bindings/readingLevels kèm code, label, sortOrder |
| GET /collections | Danh sách collection active và inactive cho admin |
| POST /collections | {name,slug,sortOrder,active}; Owner, 201 Collection |
| PUT /collections/{id} | {version,name,sortOrder,active}; Owner, 200 Collection; slug bất biến |

- BookWrite gồm title,isbn,publisher,author,language,binding,conditionGrade,conditionNote,weightG,priceMinVnd,priceMaxVnd,description,categoryCode,ageGroups,readingLevel,readingVideoUrl,collectionIds,variants.
- Field BookWrite nullable theo quy tắc sửa ARCHIVED; create/hiện lại kiểm đầy đủ, ageGroups/collectionIds là mảng không trùng (tối đa 4/100); PUT gửi đủ field, không chứa code/slug/publication/availability.
- Field unknown/server-managed bị trả 400; không mass assignment. Tạo không nhận availability hoặc publication từ client.
- BookDetail gồm id,bookCode,slug,version, các field BookWrite,publication,availability,publishedAt,createdAt,updatedAt và media[{id,role,alt,sourceRef,contentPath}],variants,totalStock.
- BookSummary là id,bookCode,title,priceMinVnd,priceMaxVnd,publication,availability,version,updatedAt,frontContentPath?,totalStock,publishedAt; không có cloud URL hoặc dữ liệu nội bộ.
- PreviewBook gồm bookCode,slug,title,publisher,author,ageGroups,categoryCode,binding,conditionGrade,conditionNote,weightG,priceMinVnd,priceMaxVnd,description,readingLevel,readingVideoUrl,availability,media,variants,totalStock; không có source_ref.
- Page<T> = {items,page,size,totalElements,totalPages}; sort list updated_at DESC,id DESC, audit created_at DESC,id DESC.
- q trim, tối đa 200 ký tự; mã so khớp không phân biệt hoa/thường, tên tìm substring không phân biệt hoa/thường, escape wildcard và bind SQL parameters.
- Không hứa tìm admin tiếng Việt không dấu; publicsearch ở ARCHITECTURE. Filter admin không tự thêm filter public.
- Metadata taxonomy giữ thứ tự DATA. Collection slug do Owner nhập, lowercase ASCII [a-z0-9]+(-[a-z0-9]+)*, tối đa 120; duplicate trả 409.
- Collection response gồm id,name,slug,sortOrder,active,version,createdAt,updatedAt; GET /collections sắp sortOrder ASC,id ASC. AuditSummary gồm id,actorId,action,before,after,aggregateVersion,createdAt.
- Mọi mutation gửi CSRF token mới theo cơ chế M1, credentials và version hiện tại; GET không thay dữ liệu.
- Public/wishlist có contract riêng tại ARCHITECTURE; import tại BOOK_IMPORT.

### Phiên upload ảnh

- POST `/upload-sessions` tạo phiên OWNER24giờ; GET/DELETE `/{id}` đọc/hủy.
- POST `/{id}/media`: multipart file/alt/sourceRef, replaceId? và requestKey?; cùng key+hash trả cùng READY, khác payload409. PATCH `/{id}/media/{mediaId}` sửa alt/sourceRef; GET `/{id}/media/{mediaId}` stream và DELETE cùng path có boundary owner/session.
- Chưa có BookCopy/Listing/mã/audit CREATE trước final. Cleanup khóa session cùng final, ảnh UPLOADING có grace1giờ; ACTIVE không bị dọn.
- Final khóa phiên, recheck OWNER/expiry, fingerprint normalizedpayload; cùng request trả cùng book, khác409. Audit lỗi rollback cả aggregate và giữ ảnh READY để retry.
- PUT reorder nhận đủ activeID/role, expectedversion; đổi mapping/audit nguyên tử, không upload lại.
- UI normalize trước upload: nguồn JPEG/PNG ≤10MB/25MP, cảnh báo>5MB; EXIF, không upscale, cạnh dài≤2560, alpha trắng, JPEG0,85. Chọn/thả file giữ clientID khi async; đổi vai trò bằng dropdown, không có nút lên/xuống.

## 8. Vòng đời 2–6 ảnh

Chọn **upload qua backend**, tránh hai bước client tự attach URL. File nhỏ và tối đa sáu ảnh/cuốn cho phép kiểm quyền/validation tại một boundary; direct signed upload chưa thuộc contract hiện hành.

- Chỉ JPEG/PNG, tối đa 10 MiB/file và 25 megapixel; kiểm magic/decode/kích thước bằng ImageIO, không tin extension/content-type do trình duyệt gửi.
- UI báo rõ định dạng; HEIC/WebP/PDF/SVG/video bị từ chối có hướng dẫn đổi JPEG/PNG. Không cài bộ chuyển HEIC trong M2.
- Upload giới hạn 30 lần/10 phút/admin và tối đa bốn upload provider đồng thời/instance, vượt trả 429 trước gọi cloud; limiter in-memory có dọn entry hết hạn cho bản local một instance. Rate limit login triển khai ở hardening, không coi cơ chế upload đã bảo vệ login.
- Backend tạo public_id ngẫu nhiên trong namespace môi trường `memay/dev/<UUID>`; không dùng tên khách hoặc tên file làm key, không overwrite cloud asset cũ.
- Upload Cloudinary với resource_type=image và delivery type=authenticated; eager tạo admin JPEG1280 và public JPEG/WebP320/640, giữ tỉ lệ, tự xoay theo EXIF và bỏ metadata vị trí.
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
- Xóa ảnh tùy chọn atomically đánh dấu DELETE_PENDING + tăng version + audit; published không được thiếu FRONT/BACK; gỡ ảnh bắt buộc trả409.
- Hide/restore giữ ảnh authenticated, không xóa cloud asset; không hứa thu hồi ảnh đã tải về. Publicdelivery/no-store ở ARCHITECTURE.
- Asset ACTIVE không bị cleanup; retry delete ảnh cũ không tác động ảnh mới vì public_id không tái sử dụng.
- Publish không chuyển Cloudinary asset thành public. Adminstream không thay kiểm chứng publicdelivery.

## 9. Optimistic locking và audit

- Mỗi mutation có expected version; update BookCopy có điều kiện version hiện tại rồi tăng một lần trong transaction, cả khi chỉ đổi field Listing/media.
- Hai request cùng version: tối đa một request thành công; request còn lại rollback toàn bộ và trả 409 currentVersion, không tự merge hoặc retry mutation.
- Kiểm quyền theo trạng thái hiện tại và kiểm version trong cùng transaction; mọi ghi kiểm OWNER đang active tại transaction.
- No-op trả snapshot hiện tại, không tăng version hoặc tạo audit; vẫn phải qua quyền/version/validation. Request publication cùng trạng thái không tạo mốc publish mới.
- Audit ghi CREATE, UPDATE, PUBLICATION_CHANGED, MEDIA_ATTACHED/REPLACED/UPDATED/REMOVED; collection có CREATE/UPDATE riêng.
- Before/after chỉ field nghiệp vụ thay đổi; media ghi ID/role thay vì signed URL, source_ref nội bộ không public. Actor/time/version lấy server; không audit cookie/password/token/file bytes.
- Audit API chỉ đọc, không có sửa/xóa. Lỗi cloud upload hoặc request bị từ chối không sinh event thành công; dùng technical log không có secret để điều tra.

## 10. Migration và vận hành

- FlywayV1–V11 là nguồn schema duy nhất; không sửa checksum migration đã chạy. Rollout/backup/restore/V10–V11 tại DEPLOYMENT.
- Test dùng me_may_test với guard tên DB như M1; chỉ xóa fixture test, không truncate bảng/dev/database dùng chung của Docker.
- Chỉ seed taxonomy/reference; không seed sách bán thật hoặc fixture SYNTHETIC dưới trạng thái published.
- Thêm biến mẫu CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_NAMESPACE (memay/dev, memay/test hoặc memay/online-test) vào .env.example bằng giá trị mẫu; credential thật chỉ trong .env ignored, không gửi qua chat/log.
- Thiếu config media vẫn chạy auth/đọc sách; upload/đọc ảnh trả 503 có hướng dẫn. Publish vẫn phải có2–6ảnh ACTIVE gồmFRONT/BACK đã upload/xác minh, không dùng ảnh giả hoặc local-only URL để vượt gate.
- Cloudinary SDK qua backend, version khóa ở pom.xml; frontend không có providersecret hoặc SDKcloud.
- Unit/integration tự động dùng media gateway giả có lỗi chủ động; live Cloudinary dùng namespace riêng/test image, cleanup kiểm chứng trước khi dùng ảnh pilot.
- Backup/restore DB local trước khi thử migration trên dữ liệu pilot; ghi cách khôi phục và bảo toàn sequence/code/media references. Không tự làm migration down hoặc reset code.
- Nếu DB restore không có đủ lịch sử số đã cấp, đối chiếu high-water mark và mã trên nhãn trước mở lại ghi; không reset sequence từ MAX của tập sách còn lại một cách mù quáng.
- Media cleanup là job trong app, không thêm broker/Redis/outbox framework. Bản local một instance; retry an toàn theo key asset, không hứa vận hành nhiều instance khi chưa thử.


## 11. Hành vi cần bảo toàn khi tối ưu UI

- Luồng tạo ảnh trên cùng form→metadata/variants→xác nhận→final; không sinh mã trước
  final thủ công. File/form ở memorytab, không hứa khôi phục sau reload/đóngtab.
- Giữ đúng clientID/serverID/role khi async; thêm nhiều đợt không quá6ảnh, đợt vượt
  slot bị từ chối cảđợt; retry từngảnh, không tự ghiđè ảnhREADY hoặc uploadlại khi đổi role.
- Hai ảnhFRONT/BACK hoặc sáuảnh hợp lệ; thiếu/trùngrole/ID, foreign/expired/nonREADY
  bị chặn. Sáchpublished không tạm thiếu ảnh; thay/gỡ/đổi role nguyên tử/version/audit.
- 400giữform/focuslỗi;409giữform để đốichiếu, không tựmerge;401giữfile/form đểreauth.
  Mất finalresponse giữ đúng payload/session để retrycùngID, không tạo sách mới.
- Nếu session410, khôi phục bằng luồng phiênảnh mới hiện có, giữform và file còn giữ;
  không tái dùng IDREADY hết hạn. Uploadmấtresponse phải đốichiếu snapshot mới trước
  adoptversion; không đè cập nhật khác của tab2.
- Dropdown vai trò dùng được bằng bànphím; chọn/thả1–6file và progress/lỗi/thay/gỡ;
  viewerEscape/returnfocus, khungcontain đúng ngang/dọc/EXIF, không đổi ảnh che lỗi.
- Publicẩn/temp404, STAFFwrite403/anonymous401/CSRF403; auditrollback nguyên tử;
  stock0→SOLD, hide/restore giữpublishedAt; wishlist/copy/FlashSale không dùng giá cũ.
- Quyền/version/validation nằm backend; không nới để làm UI nhanh hoặc ít bước hơn.

Bằng chứng: [VERIFICATION](VERIFICATION.md), [nhập sách/biến thể](BOOK_ENTRY_VERIFICATION.md),
[hiệu năng nhập/publish](BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md),
[import](BOOK_IMPORT_VERIFICATION.md). Lịch sử task/RED→GREEN ở DEV_LOG/Git;
không đọc checkbox cũ như backlog mới.
