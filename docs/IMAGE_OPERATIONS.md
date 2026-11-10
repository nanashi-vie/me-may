# Vận hành ảnh Mẹ Mây trên Ubuntu

Runbook S8. Owner dựng Ubuntu và chọn namespace kiểm thử trước khi nghiệm thu.
Dùng [Storage plan](IMAGE_STORAGE_PLAN.md) và [Recovery plan](IMAGE_RECOVERY_PLAN.md)
để theo dõi gate R6. Các lệnh dưới đây dành cho owner ở môi trường được xác nhận.

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

Đối chiếu trước/sau đủ tám bảng chấm công, sách, listing, media và lịch sử
Flyway V1–V23. V24 đổi role `INTERNAL_1/2` thành `INSIDE_4/5`, bỏ cờ
`show_on_product` và tăng version một lần cho mỗi sách có ảnh đổi role.
V25 giữ storage reference Cloudinary, thêm provider/generation. V27 bổ sung
provider/generation cho ảnh tạm. Kiểm Flyway V24–V30 đều thành công và
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
4. Kiểm riêng luồng upload từ trình duyệt. JPEG có thể bị mã hóa lại khi
   chuẩn hóa, làm hash khác file Drive. Smoke qua API chỉ xác nhận quyền,
   tải file và đối chiếu hash. R6 vẫn cần kiểm luồng nhập ảnh gốc qua UI.

### Smoke toàn luồng

1. Owner cấp quyền đọc nguồn Drive cho service account. Dùng một sách với
   hai ảnh và một sách tám ảnh. Upload ảnh gốc, xem poll/reload và đối chiếu
   link/file ID. Thử nguồn sai và xuất bản thiếu ảnh đã VERIFIED.
2. Kiểm replace, chuyển Ẩn và phiên bản cũ từ hai tab. Tải gallery, preview và
   ZIP từ desktop/mobile, gồm một lượt ngoài LAN. Kiểm ảnh chữ ở 480/1400 và
   chốt chất lượng thực tế trước khi chuyển lô.
3. Theo dõi tuổi job pending lâu nhất, lease quá hạn, attempts, 429/5xx, Drive
   access errors, RAM/CPU của worker, inode và dung lượng trống của cả staging
   và derived. Đối chiếu request ID/operation ID, giữ credential ngoài log.
4. Trong namespace thử, dừng worker khi job đang chạy rồi bật lại. Kiểm lease
   mới, retry và không có ảnh dở được publish. Thử thiếu dung lượng bằng mount
   riêng, sau đó giải phóng dung lượng và retry. Giữ nguyên ảnh đang phục vụ.
5. Dùng [CLI R3–R5](IMAGE_RECOVERY_PLAN.md) để dry-run mapping, xác nhận từng ảnh,
   apply, rollback có version, inventory và rebuild. Nếu nguồn Drive bị xóa,
   ghi media ID và báo owner xử lý thủ công.
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

## 6. Bằng chứng local S8

Mac arm64, macOS 15.7.9, Node 22, Spring + PostgreSQL test loopback. Catalog
fixture có 50 sách giả lập. Baseline đo trước encode, chưa warm cùng mức với
lượt dưới tải. Số dưới đây dùng để tái lập phép đo, không suy ra tốc độ Dell.

| Lô | Encode p50/p95 | API p50/p95 trước tải | API p50/p95 dưới tải | CPU | Peak RSS | Input/output | Block đĩa output |
|---|---:|---:|---:|---:|---:|---:|---:|
| 20×2 | 157,33/226,29 ms | 35,09/48,63 ms | 22,64/47,32 ms | 7,22 s | 195 MiB | 17,28/20,38 MB | 21,22 MB |
| 50×8 | 157,12/196,21 ms | 31,42/40,29 ms | 22,13/31,67 ms | 71,37 s | 218 MiB | 173,36/204,00 MB | 212,38 MB |

Cả 440 lượt encode và 771 probe API không báo lỗi. Harness wall 6,73 s và
65,51 s. Compose Docker local xác minh cgroup 1 CPU/768 MiB, Nginx phục vụ đúng
JPEG/WebP, từ chối staging/symlink/variant sai và mount derived đọc.
Worker amd64 thử ENOSPC trên tmpfs 64 KiB, không complete và retry thành công
sau khi giải phóng dung lượng. Kill claimant thử, rút ngắn lease đúng job
fixture, khởi động worker thật và nhận READY trên PostgreSQL test.

Playwright với backend/worker thật ở loopback xác nhận form 0/2/8 ảnh, từ chối
lô làm vượt 8 ảnh, khôi phục phiên khi reload, báo link thư mục sai, lưu Ẩn,
thay bìa và giữ nội dung tab bị xung đột version. Gallery đủ tám ảnh trên
viewport desktop/mobile, ZIP OWNER có tám entry. Bản SSR build trả 200 khi
fixture public và 404 sau khi Ẩn. Publication gallery được tạo bằng fixture DB.
Gate nguồn VERIFIED đã kiểm qua backend test với Drive giả lập. Chất lượng
chữ và HTTP ngoài LAN chờ thử nghiệm trên Ubuntu.

## 7. Điều kiện mở R6

- Cần Ubuntu chạy được Nginx/worker, backend fixture truy cập mount/Drive và bản
  backup R2 có thể khôi phục ở đích cách ly.
- Owner chọn lô 20–50 sách thử, duyệt ngưỡng p95 và chất lượng ảnh chữ. Ghi RTO
  đo được, độ phủ binding và RPO DB. Giữ Cloudinary để rollback tới khi chốt
  cutover. Bằng chứng local xem [DEV_LOG](DEV_LOG.md).
