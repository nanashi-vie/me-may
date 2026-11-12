# Vận hành ảnh Mẹ Mây trên Ubuntu

Cập nhật 12/11/2026. Contract/tổng quan ở [IMAGES](IMAGES.md), bằng chứng và
tiêu chí nghiệm thu ở [IMAGE_VERIFICATION](IMAGE_VERIFICATION.md). Owner đã
xác nhận upload mượt; các lệnh dưới đây dành cho operator trên môi trường
được xác nhận, không là yêu cầu chạy lại upload hoặc migrate ảnh thật.

## 1. Chuẩn bị Ubuntu

- Dùng Docker Engine và Compose v2. Chọn filesystem SSD bền vững. Root
  `/srv/memay/images`, `staging` và `derived` cùng filesystem, đường dẫn thật
  không qua symlink. Mount root ở backend và worker, mount riêng `derived` đọc
  ở Nginx. UID/GID của cả ba service là `10001:10001`.
- Dùng `findmnt -T` và `df -h` cho cả hai thư mục. Kiểm tra owner, khả năng ghi
  và quyền đọc của container trước khi bật queue. Không mount SSD của live
  trong drill restore.

```sh
sudo install -d -o 10001 -g 10001 -m 0750 \
  /srv/memay/images /srv/memay/images/staging /srv/memay/images/derived
docker network create --internal --subnet "$MEMAY_IMAGE_SUBNET" memay-images
```

Đặt `MEMAY_IMAGE_SUBNET` theo dải không trùng LAN hoặc các Docker network hiện
có. Gắn backend hiện hữu vào `memay-images` với IP riêng cố định và alias
`backend-images` trong cấu hình triển khai backend để giữ IP và alias qua
redeploy. Giữ kết nối DB, Drive và mạng Tunnel của backend hiện có.
Compose chỉ tạo worker và Nginx, lấy mạng đã tạo từ `MEMAY_IMAGE_NETWORK`.

## 2. Diễn tập migration trên bản sao V23

Giữ Flyway V21–V23 của chấm công nguyên vẹn. Tạo database cách ly từ backup
V23 và xác nhận tên đích, host và bản ghi Flyway trước khi migrate. Chạy
`./mvnw '-Dflyway.ignoreMigrationPatterns=*:future,*:pending' flyway:validate`
từ `code/backend` trên `dev`, với cấu hình kết nối riêng cho bản sao. Sau đó
chạy `./mvnw flyway:migrate flyway:validate` để áp dụng và kiểm lại toàn bộ
checksum. Giữ backend/worker ở chế độ cách ly trong drill.

| Phiên bản | Migration ảnh |
|---|---|
| V24 | Unified book photos |
| V25 | Image generations and jobs |
| V26 | Image source verification |
| V27 | Local image uploads |
| V28 | Image operation receipts |
| V29 | Image migration apply |
| V30 | Image recovery operations |
| V31 | Drive image batches/items |

Đối chiếu trước/sau đủ tám bảng chấm công, sách, listing, media và lịch sử
Flyway V1–V23. V24 đổi role `INTERNAL_1/2` thành `INSIDE_4/5`, bỏ cờ
`show_on_product` và tăng version một lần cho mỗi sách có ảnh đổi role.
V25 giữ storage reference Cloudinary, thêm provider/generation. V27 bổ sung
provider/generation cho ảnh tạm. Kiểm Flyway V24–V31 đều thành công và
kiểm tất cả bảng Image Server mới.

DB local từng chạy chuỗi ảnh đánh số cũ V21–V27 cần dựng lại từ fixture hoặc
restore bản V23 đúng chuỗi chấm công. Giữ lịch sử/checksum production nguyên vẹn.

## 3. Cấu hình backend và service ảnh

| Nơi | Biến hoặc mount |
|---|---|
| Backend | `MEMAY_IMAGE_ROOT=/srv/memay/images`, bind mount root read/write |
| Backend | `MEMAY_IMAGE_NGINX_ORIGIN=http://image-nginx:8080` |
| Backend | `MANAGEMENT_SERVER_PORT=8081`, `MANAGEMENT_SERVER_ADDRESS` là IP riêng của backend trên `memay-images`, `MEMAY_MANAGEMENT_EXPOSURE=health,imagejobs` |
| Backend + worker | Cùng `MEMAY_IMAGE_WORKER_TOKEN`, token ngẫu nhiên riêng, lưu bằng secret manager hoặc file cấu hình riêng mode `0600` |
| Worker | `MEMAY_IMAGE_WORKER_ORIGIN=http://backend-images:8081`, `MEMAY_IMAGE_WORKER_IMAGE`, `MEMAY_IMAGE_WORKER_DIGEST` |
| Nginx | `MEMAY_IMAGE_NGINX_IMAGE` |
| Backend | `MEMAY_DRIVE_CREDENTIALS_FILE` trỏ vào key service account chỉ đọc, mount riêng và đọc được bởi UID 10001 |
| Backend | Chỉ đặt `MEMAY_IMAGE_LOCAL_ENABLED=true` trong môi trường thử đã chuẩn bị |

Ghim cả hai OCI image bằng `repository@sha256:…`. Nginx dùng image dựa
trên `nginx:alpine` để healthcheck có `wget`. Worker được build từ
`code/image-worker/Dockerfile` cùng revision backend. Dùng digest OCI thật của
image worker đã pin cho `MEMAY_IMAGE_WORKER_DIGEST` và
`image_recipe.worker_digest`. Lưu `image_recipe.configuration.sha256` theo
digest xuất từ cùng source revision. Đăng ký recipe `v1` trước upload; đối
chiếu record đã có, giữ các phiên bản bất biến để rebuild.

```sh
MEMAY_RECIPE_SHA=$(node --input-type=module -e 'import {createHash} from "node:crypto"; import {recipes} from "./code/image-worker/src/recipes.mjs"; console.log(createHash("sha256").update(JSON.stringify(recipes.v1)).digest("hex"))')
```

Sau khi Flyway đã tạo `image_recipe` (V25) và trước khi bật LOCAL, chạy trên
PostgreSQL thử đã chọn. Cấu hình kết nối psql bằng secret manager hoặc service
file. Kết quả phải là `t`, nếu sai thì kiểm image/recipe trước khi chạy upload.

```sh
psql -X -v ON_ERROR_STOP=1 -v worker_digest="$MEMAY_IMAGE_WORKER_DIGEST" \
  -v recipe_sha="$MEMAY_RECIPE_SHA" <<'SQL'
INSERT INTO image_recipe(version, worker_digest, configuration)
VALUES ('v1', :'worker_digest', jsonb_build_object('sha256', :'recipe_sha'))
ON CONFLICT (version) DO NOTHING;
SELECT worker_digest = :'worker_digest' AND configuration->>'sha256' = :'recipe_sha'
FROM image_recipe WHERE version = 'v1';
SQL

docker compose --env-file "$MEMAY_IMAGE_ENV_FILE" -f ops/images/compose.yml config --quiet
docker compose --env-file "$MEMAY_IMAGE_ENV_FILE" -f ops/images/compose.yml up -d
docker compose --env-file "$MEMAY_IMAGE_ENV_FILE" -f ops/images/compose.yml ps
```

File `MEMAY_IMAGE_ENV_FILE` nằm ngoài Git. Chỉ Tunnel đến HTTP app backend
`8080`. Nginx `8080` và management `8081` không publish host port, không khai
báo public ingress. Kiểm từ ngoài LAN rằng host public không đọc được
`/derived/` hoặc `/actuator/imagejobs`.

Compose đặt worker 1 CPU, 768 MiB, concurrency 1 theo worker, restart
`unless-stopped`. Health worker đo kết nối tới management health. Xác minh
thêm bằng một job test thật để kiểm token, lease và encode. Health Nginx đo
listener nội bộ. Khi container unhealthy, kiểm nguyên nhân trong log và Docker
events. Restart policy chỉ phản ứng khi tiến trình thoát.

## 4. Smoke ở namespace thử

### R6.1 — Kiểm Drive với một ảnh riêng tư

1. Tạo Google Cloud project, bật Drive API và dùng quota chuẩn. Giữ Billing
   tắt nếu Console cho phép. Xem [quota Drive API](https://developers.google.com/workspace/drive/api/guides/limits).
2. Tạo service account và chia sẻ riêng một ảnh JPEG thử cho email service
   account với quyền Viewer. Đặt key JSON ở secret mount của backend thử qua
   `MEMAY_DRIVE_CREDENTIALS_FILE`. Giữ key ngoài chat, Git và log.
3. Gửi chính file JPEG đó qua API upload LOCAL dạng multipart để giữ nguyên
   byte. Dán link file vào nguồn ảnh, bấm Xác minh và kiểm trạng thái `VERIFIED`.
   Thử link của ảnh khác để kiểm hash mismatch và file chưa chia sẻ để kiểm
   lỗi quyền truy cập. Giữ ảnh Drive ở chế độ riêng tư.
4. Kiểm riêng luồng upload từ trình duyệt. Khi capability trả `LOCAL`, form
   gửi file gốc trong multipart. Nhánh Cloudinary mới chuẩn hóa ảnh. Xác nhận
   capability của QA là `LOCAL`, tải cùng JPEG và xác minh với cùng file Drive.
   Ca qua API đã đạt theo log owner. Owner đã xác nhận upload UI mượt12/11; hai ca lỗi thật cần ghi bằng chứng riêng nếu chưa có.

### Smoke toàn luồng

QA hiện dùng mạng Docker `memay-images-qa` và backend nội bộ
`http://memay-api-images-qa:8080`. Operator có quyền Docker kiểm health từ
container cùng mạng. Để chạy CLI hiện có, dùng HTTPS QA có kiểm soát truy cập,
hoặc chạy CLI trong cùng network namespace với container backend QA và đặt
`MEMAY_SITE_ORIGIN=http://127.0.0.1:8080`. Giữ giới hạn HTTPS/loopback của CLI.

Ảnh mới nhập bằng file hoặc Drive dùng LOCAL khi đã bật capability. Ảnh
Cloudinary đã lưu vẫn đọc bằng provider cũ. Mapping/migration apply và
rollback con trỏ của sách Cloudinary cũ chỉ thực hiện ở đợt được owner yêu cầu.

`MEMAY_IMAGE_LOCAL_ENABLED` bật khả năng upload LOCAL cho toàn backend.
Cờ này cũng tạo LocalMediaGateway; tắt cờ sẽ mất đường đọc LOCAL, không chỉ dừng upload.
Form sửa sách cũ cũng dùng LOCAL nếu thêm hoặc thay ảnh khi cờ đang bật.
Thêm/thay ảnh trên sách đã lưu cũng dùng LOCAL; không tự chuyển các ảnh
Cloudinary khác. Bước này khác với migration hàng loạt sách cũ.

1. Owner cấp quyền đọc nguồn Drive cho service account. Dùng một sách với
   hai ảnh và một sách tám ảnh. Upload ảnh gốc, xem poll/reload và đối chiếu
   link/file ID. Thử nguồn sai: xuất bản vẫn được, dòng admin phải cảnh báo nguồn.
2. Kiểm replace, chuyển Ẩn và phiên bản cũ từ hai tab. Tải gallery, preview và
   ZIP từ desktop/mobile, gồm một lượt ngoài LAN. Kiểm ảnh chữ ở 480/1400 và
   chốt chất lượng thực tế trước khi mở upload LOCAL. Kiểm lại gallery và
   ZIP của một sách Cloudinary trong cùng môi trường.
3. Theo dõi tuổi job pending lâu nhất, lease quá hạn, attempts, 429/5xx, Drive
   access errors, RAM/CPU của worker, inode và dung lượng trống của cả staging
   và derived. Đối chiếu request ID/operation ID, giữ credential ngoài log.
4. Trong namespace thử, dừng worker khi job đang chạy rồi bật lại. Kiểm lease
   mới, retry và không có ảnh dở được publish. Thử thiếu dung lượng bằng mount
   riêng, sau đó giải phóng dung lượng và retry. Giữ nguyên ảnh đang phục vụ.
5. Dùng [CLI inventory/rebuild](#6-cli-mapping-migration-và-recovery) để inventory và rebuild ảnh LOCAL
   của sách mới trên môi trường cách ly. Nếu nguồn Drive bị xóa, ghi media ID
   và báo owner xử lý thủ công.
6. Owner cung cấp lịch/retention và mẫu backup R2. Restore vào DB + mount riêng
   với profile `restore` mặc định cách ly. Đối chiếu manifest, file ngoài DB,
   recipe digest và lease. Chỉ bật lại kết nối sau khi xác minh namespace,
   mount, credential. Đo thời gian tới ảnh bìa đầu tiên và toàn bộ lô.

## 5. Benchmark

```sh
npm --prefix code/image-worker ci
node scripts/image-system/benchmark.mjs fixture 20x2 /tmp/memay-fixture-20x2
node scripts/image-system/benchmark.mjs fixture 50x8 /tmp/memay-fixture-50x8
node scripts/image-system/benchmark.mjs run /tmp/memay-fixture-20x2/manifest.json --api http://127.0.0.1:18080
node scripts/image-system/benchmark.mjs run /tmp/memay-fixture-50x8/manifest.json --api http://127.0.0.1:18080
```

API là Spring loopback trong môi trường thử. Fixture sinh JPEG giả lập có chữ
và tái dùng 2/8 mẫu. Có thể thay bằng manifest JSON `{"books":[{"images":["a.jpg"]}]}`
với ảnh nằm cùng cây thư mục. JSON kết quả ghi p50/p95 encode/API, CPU, peak RSS,
byte đầu vào/ra, block đĩa và lỗi. `wallMs` tính cả dọn output tạm. Harness gọi cùng Sharp processor tuần tự
trong một process và lấy mẫu API đồng thời. Đo riêng queue, Docker và tốc độ
ngoài LAN ở Dell, vì mẫu này không tính chi phí Drive, claim/lease và cache CDN.

## 6. CLI mapping, migration và recovery

Chạy từ root với `MEMAY_SITE_ORIGIN` là HTTPS đích hoặc loopback đã xác nhận.
`MEMAY_OWNER_SESSION_FILE` trỏ tới JSON mode0600 thuộc user hiện tại,
chứa `cookie` (chỉ MEMAYSESSION) và `csrf` của cùng phiên OWNER. Giữ ngoài
Git; không đưa password/token vào argv hoặc log. CLI gọi API, không ghi DB trực tiếp.

```sh
node scripts/image-system/media-operations.mjs export > mapping.csv
node scripts/image-system/media-operations.mjs preview mapping.csv
node scripts/image-system/media-operations.mjs show <receipt-id>
```

Mỗi trang export tối đa100ảnh; nếu CLI trả cursor, dùng `export <cursor>`.
CSV UTF-8 giữ header `media_id,book_code,role,drive_file_id,expected_book_version`;
điền Drive File ID, giữ guard sách/role/version. Không để credential trong CSV.
Dry-run không đổi sách/media/binding; có operation/receipt/staging tạm.
Receipt READY có currentPhotoPath/previewPath để OWNER đối chiếu qua trình duyệt
đăng nhập; dòng INVALID có mã riêng, receipt hết24h trả410.

Chỉ apply danh sách đã xem và xác nhận. Dùng UUID riêng cho mỗi thao tác;
gửi lại cùng payload thì giữ nguyên UUID để retry idempotent.

```sh
node scripts/image-system/media-operations.mjs apply --receipt <receipt-id> \
  --digest <preview-digest> --request-key <uuid> --confirm-media <media-id>
node scripts/image-system/media-operations.mjs show-apply <receipt-id>
node scripts/image-system/media-operations.mjs rollback --receipt <receipt-id> \
  --request-key <uuid-khac> --expect-book <book-id>:<applied-version>
```

Lặp `--confirm-media` cho từng ảnh và `--expect-book` cho từng sách rollback.
Apply202 xử lý theo queue; show-apply trả kết quả/version theo sách. Nguồn hoặc
book version đổi thì dry-run lại; không sửa receipt để vượt kiểm tra. Cloudinary
ref cũ giữ cho rollback; không xóa cloud hoặc drop schema khi hoàn tất apply.
Đợt chuyển sách cũ hiện được hoãn; có tool không đồng nghĩa đã được duyệt chạy live.

Rebuild mặc định chỉ kiểm kê, apply phải explicit. Mỗi trang tối đa100ảnh;
`--after <next>` cho trang DB, `--after-disk <nextDisk>` cho scan đĩa.

```sh
node scripts/image-system/media-operations.mjs inventory --scope all --scan-disk
node scripts/image-system/media-operations.mjs rebuild --media <media-id>
node scripts/image-system/media-operations.mjs rebuild --media <media-id> --apply --request-key <uuid>
node scripts/image-system/media-operations.mjs show-rebuild <operation-id>
```

Restore DB + mount riêng bằng profile `restore`, để recovery mode mặc định
isolated. Kiểm counts/FK/binding/recipe/pointer, file ngoài DB và lease; không
mount derived live hoặc bật cleanup trong lúc kiểm. Xác nhận namespace, mount,
credential và image/config digest rồi mới đặt `MEMAY_MEDIA_RECOVERY_MODE=active`.
Recipe cần `image_recipe.worker_digest` đúng worker OCI digest và
`configuration.sha256` đúng JSON recipe. Worker nhận `MEMAY_IMAGE_WORKER_DIGEST`
tương ứng. Không tự dùng recipe mới khi rebuild; mismatch phải điều tra.

## 7. Bằng chứng và gate vận hành

Bảng benchmark local S8, ca thực tế và acceptance matrix đã chuyển nguyên
số liệu về [IMAGE_VERIFICATION](IMAGE_VERIFICATION.md). [PROGRESS](PROGRESS.md)
giữ gate còn mở. Upload đã được owner nghiệm thu12/11, restore R2 đã được owner
xác nhận; benchmark Dell/ảnh chữ/ngoài LAN, RPO/retention/RTO và migration/
rollback sách cũ không được tự đánh đạt từ hai xác nhận đó.

## Nhập và ghép nguồn Drive theo lô (V31)

- Chia sẻ một folder gốc quyền Viewer cho email service account; mỗi sách
  có folder con. File thêm sau thường kế thừa quyền; tránh limited access
  hoặc chặn tải xuống. Không cần public folder và không scan cả kho.
- Cho sách mới hoặc thêm ảnh vào sách đã lưu: dán 1–8 link file/File ID,
  ngăn bằng dòng, khoảng trắng
  hoặc dấu phẩy, chọn **Tải ảnh từ Drive**. Link được xử lý tuần tự; xem
  thumbnail LOCAL, chọn vai trò rồi xác nhận một lần. Thứ tự link tùy ý.
  Sau confirm, khối Drive chỉ hiện n/tổng. Sách mới gắn ảnh khi lưu sách;
  sách đã lưu dùng Gắn tất cả ảnh vào sách, tiến độ và retry phần còn lại.
- Đã upload LOCAL: **Tự ghép nguồn** tìm bằng SHA-256 file gốc, không tạo
  thêm ảnh hoặc encode lại. Ảnh đã gắn không cần gắn lại sau MATCH. Hash trùng
  nhiều ảnh cần chọn cặp một-một. Chỉ xác nhận các dòng thành công; dòng lỗi
  báo riêng. File Drive phải giữ nguyên bytes, không dùng JPEG đã nén lại.
- Chưa xác nhận thì ảnh IMPORT chưa dùng để lưu sách. Bỏ lô giải phóng chỗ;
  lô hết hạn theo session, tối đa 24 giờ. Reload tiếp tục operation đang mở.
  Tab ẩn dừng polling, hiện lại lấy một trạng thái chung; không poll từng ảnh.
- Giữ DB/backup chứa source binding File ID, hash, version và recipe. Link
  riêng lẻ không thay thế bản backup DB. Mất derived dùng rebuild R5; nguồn
  Drive bị xóa do owner xử lý thủ công. Ảnh Cloudinary cũ giữ provider cũ.
- Rollout backend V31 trước frontend. V21–V30 không đổi; V31 thêm hai bảng
  `drive_image_batch`, `drive_image_batch_item`. Worker/recipe hiện có được
  tái sử dụng. Nếu rollback UI, giữ schema V31 và tắt thao tác batch mới.
- Trên QA kiểm một sách nháp mới: import đủ ảnh, vai trò theo thumbnail,
  VERIFIED, lưu sách, reload và xem public khi xuất bản. Không cần chạy lại
  restore R2 đã được owner xác nhận; local fixture đã drill mất derived/R5.
- Số request mô hình MATCH là create + P status + confirm, cộng CSRF nếu
  epoch chưa có token. Session/preview/reload/retry tính riêng; chưa đo latency,
  request provider và RSS với lô 8 ảnh thật trên QA.
