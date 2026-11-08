# Image Storage & Processing

Ngày 08/11/2026. User đã duyệt thiết kế; đang lập kế hoạch, chưa implementation.
Nguồn: draft Self-hosted Image System user cung cấp và quyết định S054.
Phần liên quan: [Source Mapping & Disaster Recovery](IMAGE_RECOVERY_SPEC.md).

## 1. Phạm vi và quyết định

- User yêu cầu bỏ hoàn toàn ẩn/hiện từng ảnh và khái niệm ảnh nội bộ.
  Tối đa 8 ảnh/sách; ảnh cũ đang ẩn chuyển thành ảnh hiển thị cùng sách.
- User phụ trách dựng Ubuntu server. Agent làm code, kiểm thử local,
  cấu hình mẫu và checklist tích hợp; không SSH/cài server/deploy production.
- Giữ Angular, Spring Boot, PostgreSQL/JDBC, authenticated admin và audit.
  Self-host dùng Sharp/libvips, persistent SSD và Nginx; không MinIO/Redis.
- Tách hai spec để storage và recovery có tiêu chí nghiệm thu riêng.
  Source mapping tối thiểu là điều kiện chuyển ảnh production, không hoãn hết.
- Quy mô mục tiêu 3.000 sách/24.000 ảnh là workload thiết kế, chưa benchmark.
- Giữ ẩn/xuất bản sách, Thùng rác, ghi chú nội bộ và import CSV/XLSX hiện có.
  Không thêm quản lý Drive, AI, checkout hoặc tự đồng bộ thư mục.

## 2. Phương án và đề xuất kỹ thuật

Đã đối chiếu phương án một spec chung với hai spec theo trách nhiệm.
Hai spec được đề xuất vì vòng đời upload khác phục hồi; dùng chung contract
metadata, không tạo hai hệ quản lý media hoặc hai queue độc lập.

Đề xuất triển khai theo bước: bỏ ảnh nội bộ trên provider hiện tại trước;
thêm self-host song song Cloudinary; migrate từng lô; ngừng Cloudinary sau drill.
Không big-bang vì đường upload, ZIP, gallery, cleanup và rollback đều bị tác động.

Các lựa chọn dưới đây đã được duyệt; cấu hình tài nguyên vẫn cần kiểm nghiệm:
- Giữ public gateway Spring và cache tối đa 30 giây như contract hiện tại.
  Nginx phục vụ file ở mạng nội bộ cho gateway; không mở SSD trực tiếp ra web.
  Đây là điều chỉnh so với sơ đồ Nginx public trong draft để giữ quyền theo sách.
- Giữ URL `/api/v1/books/{slug}/media/{role}`; hostname `img.memaybooks.com`
  là alias tùy chọn sau nghiệm thu, phải đi qua cùng authorization/cache policy.
- Không bật tự xuất bản trong background: UI chờ ảnh READY rồi gọi final/save
  với version hiện tại; lỗi chờ vẫn giữ form, user có thể thử lại.
- Drive manifest hoặc File ID trong metadata admin; không xây Google Picker.

## 3. Loại bỏ ảnh nội bộ

Contract mới: FRONT, BACK, SPINE, INSIDE_1..INSIDE_5, mỗi role tối đa một ACTIVE.
Hai role INTERNAL_1/INTERNAL_2 đổi thành INSIDE_4/INSIDE_5; giữ media ID,
storage reference, alt, thứ tự, ảnh và liên kết sách. Không upload lại để đổi role.
FRONT/BACK vẫn cần khi xuất bản; lưu sách Ẩn vẫn được thiếu ảnh.

- Bỏ nhóm ảnh nội bộ, biểu tượng khóa, checkbox và payload showOnProduct.
- Bỏ logic isInternal/isPublic phân loại visibility ở backend/frontend/Worker.
- Public và preview lấy mọi ảnh ACTIVE của sách theo thứ tự role nói trên.
- Bỏ cột show_on_product bằng migration mới sau khi rollout đồng bộ được chuẩn bị;
  không sửa V15/V17 đã chạy, không giữ visibility như một tính năng ngầm.
- Migration không sửa audit lịch sử hoặc fingerprint/receipt đã lưu.
  Retry payload cũ phải vẫn nhận đúng biên nhận cũ, không tạo sách/ảnh mới.
- Alias INTERNAL_1/2 chỉ dùng ở boundary tương thích URL/request cũ nếu cần;
  không xuất ra DTO mới và không mang ý nghĩa quyền truy cập.
- Khi migrate, tăng version sách bị đổi và invalidate cache; thao tác có báo cáo
  counts, không tự xuất bản sách đang ẩn và không xóa ảnh cũ.
- Với deployment đầu tiên, tạm dừng ghi trong lúc migrate và đổi backend/frontend;
  yêu cầu reload admin cũ. Không rolling deploy hai schema không tương thích.
- Thay đổi này độc lập provider; kiểm toàn bộ gallery/ZIP/reorder/replace/cleanup.

## 4. Contract dữ liệu dùng chung

Tái sử dụng media ID, book/upload-session ownership, role, alt, lifecycle hiện có.
Không gộp trạng thái xử lý vào publication hoặc lifecycle ACTIVE/DELETE_PENDING.

| Nhóm | Dữ liệu bắt buộc |
|---|---|
| Provider | CLOUDINARY hoặc LOCAL; ref cũ giữ khi migrate/rollback |
| Nguồn | source provider/File ID/SHA-256/status; theo spec Recovery |
| Công thức | recipe version bất biến, digest cấu hình và worker image |
| Output | variant, key, MIME, width, height, bytes, SHA-256 |
| Job | ID, media ID, generation, kind, status, attempts, next attempt |
| Lease | token, expiry, heartbeat; ngăn kết quả worker cũ ghi đè |

Một generation có manifest chứa đủ output. Chỉ chuyển pointer sang generation
mới khi mọi output hợp lệ; asset cũ vẫn dùng nếu job hoặc final thất bại.
Không đưa provider key, source ID hoặc credential ra public DTO/log.

## 5. Upload và xử lý

- Giữ kiểm OWNER/CSRF, hạn phiên 24 giờ, requestKey và chống ghi đè version.
- Self-host nhận JPEG/PNG/WebP tĩnh, tối đa 10 MiB/25 megapixel; kiểm magic,
  decode, số frame, dimensions. Không SVG/PDF/HEIC/animated image.
- Frontend self-host gửi bytes gốc, không nén JPEG trước upload; preview local
  không thay đổi file. Cloudinary legacy giữ chuẩn hóa hiện tại khi còn dùng.
- Backend công bố capability provider/formats/limits để UI không đoán provider.
- Ghi input vào staging bền vững, SHA-256 bytes thực; DB tạo job sau khi file
  hoàn tất. Nếu DB fail, sweeper dọn staging mồ côi theo tuổi và tham chiếu.
- Upload trả 202 với media/job ID và status URL khi chưa xong; retry cùng
  requestKey và hash trả cùng operation. Payload khác trả 409.
- UI poll có backoff, dừng khi READY/FAILED/expiry; reload tra session/job,
  không upload lại vì mất response. Poll không làm tăng version sách.
- Tối đa 8 ảnh cuối; cho một replacement tạm ngoài 8 như contract hiện tại.
- Final tạo sách chỉ consume ảnh READY; nếu pending trả conflict có mã rõ,
  không mở transaction chờ worker. Lưu Ẩn có thể bỏ qua ảnh đang lỗi bằng thao tác
  user rõ ràng; không âm thầm bỏ ảnh đã chọn.
- Sửa sách đã có: job READY chưa tự ghi đè slot. UI gọi commit replacement
  với expectedVersion; recheck ownership/session/state/role, cập nhật/audit nguyên tử.
- Giữ ảnh cũ khi xử lý lỗi, mất mạng, session hết hạn hoặc version conflict.
- Publish LOCAL cần mapping VERIFIED cho mọi ảnh đính kèm, theo Recovery.
  Cloudinary legacy chưa migrate vẫn dùng điều kiện publish hiện hành.

## 6. Worker và queue

Spring sở hữu PostgreSQL queue và transaction; Node/Sharp không giữ credential DB.
Worker nhận việc qua internal API có service credential riêng, không public route.
Một worker, concurrency 1; CPU 1, RAM 768 MiB là cấu hình thử nghiệm.

- Job: PENDING → PROCESSING → READY; lỗi retryable chuyển RETRYING rồi claim lại;
  hết lần thử hoặc input không hợp lệ thành FAILED. Retry thủ công được audit.
- Claim atomic với lease; network/decode không giữ DB transaction/row lock.
- Lease 5 phút, heartbeat 30 giây; claim lại sau expiry. Kết quả token cũ bị từ chối.
- Tối đa 3 attempts tự động, backoff 10/60 giây; job timeout 3 phút/attempt
  ban đầu, cấu hình được và phải đo trên Dell trước production.
- Kill/restart không mất job. Claim lại kiểm output đã tạo để tránh làm trùng.
- Worker chỉ nhận opaque ID/key và recipe allowlist, không nhận path/URL tùy ý.
  Đọc staging, ghi staging output; không có quyền gọi Drive hay thay metadata sách.
- Completion recheck generation, lease và asset chưa bị xóa; kiểm manifest và
  kích thước/hash file trước publish pointer. Job hết hạn không phục sinh ảnh bị gỡ.
- Cleanup không xóa file của lease đang hoạt động; DELETE_PENDING chỉ xóa đúng
  provider/generation không còn tham chiếu, có retry và grace window.

## 7. Recipe và lưu file

Recipe v1 thử nghiệm: auto-orient, bỏ EXIF/GPS, alpha nền trắng, giữ tỷ lệ,
không upscale, WebP quality 82/JPEG quality 85. Chất lượng chữ phải được owner kiểm.
Thumbnail 480 và detail 1400 là bounding box cạnh dài, không crop.
Không tạo variant Internal; admin dùng cùng thumbnail/detail.

Trong chuyển đổi giữ output 320/640 JPEG/WebP và preview JPEG1280 theo URL cũ;
thêm 480/1400 cho LOCAL. Không gọi resize theo request. Chỉ bỏ variant tương thích
sau khi không còn consumer, benchmark và rollback không cần chúng.
Tạo thumbnail cho mọi ảnh để đổi FRONT không phải chờ encode lại; xem lại dung lượng
sau benchmark. Trang danh sách chỉ tải thumbnail FRONT, không preload gallery.
Watermark chưa bật; nếu thêm sau phải tạo recipe version mới, không sửa ảnh gốc.

```text
/srv/memay/images/
  staging/<operation-id>/...
  derived/<media-id>/<generation>/<variant>.<format>
```

Không có cây ảnh nội bộ. Toàn bộ thư mục nằm ngoài public web root trực tiếp.
Bind mount bền vững trên cùng filesystem cho atomic rename; Nginx read-only derived,
worker chỉ cần staging/derived, backend có quyền kiểm và cleanup theo contract.
Keys do server tạo, không dùng book code/filename làm đường dẫn tin cậy.
Manifest công bố sau atomic rename; không overwrite key đã công bố.

## 8. Delivery và cache

Client → Cloudflare Worker hiện có → Tunnel → Spring authorize → Nginx → SSD.
Admin dùng cùng origin/session và no-store; không gửi signed/provider URL ra client.
Public chỉ ACTIVE + PUBLISHED, không Thùng rác; token version cũ/sai trả 404.
Nginx chỉ nhận từ mạng service, không expose host port hoặc alias bỏ qua gateway.

Key có version/hash bất biến về nội dung; không đồng nghĩa browser cache vĩnh viễn.
Giữ browser revalidate, edge tối đa 30 giây và purge sau commit theo ARCHITECTURE.
Khi cache policy/purge chưa sẵn sàng, tắt edge cache. Lỗi/404 không cache.
Không hứa thu hồi ảnh đã tải; độ trễ ẩn tối đa bằng contract cache hiện tại.
Kiểm tất cả query size/format/version, allowlist biến thể; MIME/nosniff chính xác.
ZIP vẫn stream ảnh JPEG chất lượng đọc được, giữ limit/quyền hiện hành.

## 9. Chuyển đổi, rollback và ranh giới server

1. Bỏ ảnh nội bộ và kiểm hồi quy trên Cloudinary local fake gateway.
2. Thêm LOCAL opt-in, worker và Nginx config; fixtures local không dùng ảnh bán thật.
3. Tích hợp mapping tối thiểu, thử 20–50 sách và một rebuild thực tế từ Drive.
4. Owner dựng server; agent bàn giao env names, mounts, limits, healthchecks,
   network/port requirements, cấu hình Nginx và cách đo từ mạng ngoài.
5. Operator dry-run migration theo allowlist ID; tạo derived mới từ nguồn đã
   xác minh; kiểm hình, checksum và permission trước đổi pointer nguyên tử.
6. Giữ Cloudinary asset/ref cũ; chưa enqueue xóa chỉ vì migration thành công.
   Rollback migrated asset đổi pointer lại, audit/version/purge; không mất ghi mới.
7. Ảnh LOCAL mới không có Cloudinary fallback: rollback code phải dùng bản vẫn
   đọc LOCAL, có thể tắt nhận upload LOCAL. Không rollback về binary chỉ biết cloud.
8. Chỉ bỏ cloud sau khi owner duyệt cutover và Recovery nghiệm thu; không tự deploy.

Server checklist không là yêu cầu agent dựng Ubuntu. Cấu hình Dell/R2/Drive trong
draft là đầu vào user cung cấp; không tuyên bố đã đo dung lượng/quota/restore live.

## 10. Nghiệm thu

- Migration ảnh cũ giữ đủ ID/file/thứ tự, tất cả 8 ảnh xuất hiện khi PUBLISHED;
  sách ẩn/temp/trash không public. Không còn UI/DTO/logic visibility từng ảnh.
- 0/2/8/9 ảnh, thay khi đủ 8, đổi role, retry/final lost-response, hai tab,
  expiry và xóa khi job chạy; không mất ảnh cũ hoặc tạo trùng sách.
- Validation file giả, quá byte/pixel, animated WebP, EXIF xoay, alpha, ảnh nhỏ.
- Worker kill/lease expiry/late completion/DB rollback/disk full; pipeline phục hồi
  đúng, lỗi có mã và có thể retry. Không leak secret/path/source metadata.
- Mixed Cloudinary/LOCAL: public/admin/preview/ZIP/cleanup/purge đúng provider.
- Backend integration trên DB test; frontend tests, SSR/Workers build và proxy check;
  browser desktop/mobile cho upload/retry/gallery/ẩn sách.
- Benchmark 20–50 sách: bytes/output, p50/p95 job time, RSS/CPU/SSD/network,
  ảnh chữ owner xác nhận, đo API dưới tải worker so với baseline cùng host.
- Trước production chốt ngưỡng chấp nhận từ benchmark, đo ngoài LAN;
  1 CPU/768 MiB chưa là bằng chứng máy đủ tải. Không đánh dấu production từ test local.
- Theo dõi pending/failed/lease age, thời gian xử lý, disk, 404/5xx, HIT/MISS;
  cảnh báo worker chết, disk gần đầy, ảnh published thiếu; không coi CDN là backup.

## 11. Nguồn đối chiếu

- Code hiện tại: MediaGateway, MediaService/Transactions, UploadSessionTransactions,
  BookCommandService, PublicCatalogueController, BookUploadQueue, image-upload.ts.
- [Sharp resize](https://sharp.pixelplumbing.com/api-resize/): kích thước/không upscale.
- [Sharp input](https://sharp.pixelplumbing.com/api-constructor/): giới hạn decode.
- [Workers cache](https://developers.cloudflare.com/workers/runtime-apis/cache/).
- Contract hiện hành ở [CATALOGUE](CATALOGUE.md) và [ARCHITECTURE](ARCHITECTURE.md).
  Chỉ thay baseline bằng phần thiết kế được duyệt và triển khai/kiểm chứng.
