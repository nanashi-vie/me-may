# Kiểm chứng hệ thống ảnh

Cập nhật 12/11/2026. Tài liệu này giữ bằng chứng và tiêu chí nghiệm thu đã
chuyển từ ba plan Storage/Recovery/Drive batch; không là kế hoạch triển khai
mới. Contract ở [IMAGES](IMAGES.md), thao tác ở [runbook](IMAGE_OPERATIONS.md),
gate hiện hành ở [PROGRESS](PROGRESS.md). Kết quả dưới đây có ngày/phạm vi,
không thay kiểm live của revision mới.

Hotfix12/11: nguồn LOCAL chưa xác minh chuyển thành cảnh báo, không chặn
xuất bản. FE339/339, BE320total/3skip, SSR/Workers đạt; browser fixture
1440/390 kiểm cả7ô nềnđỏnhạt và dòngverified không tô. Regression RED→GREEN
kiểm createpublic/publish/sửa/thayảnh và READY/version giữ; review không finding.
Bằng chứng/giới hạn: [IMG-HF-C02](DEV_LOG.md#2026-11-12--img-hf-c02--nghiệm-thu-hotfix-cảnh-báo-nguồn).
Chưa deploy hoặc kiểm Drive thật cho hotfix; không dùng kếtquảlocal đónggatekhác.

## 1. Mốc đã có bằng chứng

| Mốc | Bằng chứng | Giới hạn |
|---|---|---|
| 09/11 — S1–S7, R1–R5 | Backend fixtures: lifecycle, source, quyền, mixed provider, migration/recovery; worker và CLI tests | Không phải nghiệm thu server production |
| 09–10/11 — S8 | 266 backend total/3 skip, 262 frontend, 10 worker, 4 CLI, 4 restore; SSR/Workers/proxy và browser loopback | Snapshot checkpoint S066, không là tổng test hiện tại |
| 10/11 — R6.1 | Owner cung cấp ca Drive thật: input1.382.115bytes, encode/verify READY, nguồn VERIFIED version1 | Agent không tự chạy lại live; không suy thành mọi ca nguồn lỗi đã thử |
| 11/11 — R6 | Owner xác nhận V30, management8081/private bind, recipe v1, catalogue200; restore R2 đạt theo owner | Không kiểm lại lịch backup/retention/RTO từ xác nhận này |
| 11/11 — Drive batch | Clean verify293total/3skip; FE284, worker10, CLI4, build/proxy; V30→V31 giữ dữ liệu/checksum; rebuild fixture | Lô8Drive thật/latency/RSS chưa có số đo |
| 11/11 — import vào sách đã lưu | FE286; commit từng ảnh dùng pendingLocal/version, build/proxy | Không tự deploy |
| 11/11 — xác nhận/refresh | FE289; backend295total/3skip; API gắn5ảnh/replay, browser fixture reload giữa các lần gắn | Backend snapshot sau thêm regression |
| 11/11 — source gate cũ | FE291, Workers build; từng chặn xuất bản thiếu nguồn | Được hotfix12/11 thay bằng cảnh báo, xem IMAGES §10 |
| 11/11 — MATCH HTTP | Backend298total/3skip; FE292; request bookId chuỗi/target snapshot optional, ghép8hash đảo thứ tự | Fixture khác Drive thật |
| 11/11 — UI gắn cả lô | FE294, Workers/proxy, browser fixture: một bộ5ảnh, counter5/5, một nút; lỗi/retry queue | Không đổi backend/schema |
| 12/11 — owner nghiệm thu | Owner xác nhận upload ảnh đã test mượt; cho dọn fixture QA | Không tự đóng benchmark/migration/rollback gate |
| 12/11 — cleanup QA | Xóa memay-drive-flow-test, memay-s057-pg và volume riêng, 29 file tạm; DB đang dùng giữ nguyên | Cần tạo fixture mới để tái lập các ca DB |

Các checkpoint chi tiết trong [DEV_LOG](DEV_LOG.md), gồm S057–S067 và các
mục Drive button, Drive flow, Publish source error, MATCH, gắn cả lô.
Counts trên thuộc từng lượt chạy; không cộng dồn thành một bộ test.

## 2. Benchmark local S8

Mac arm64, macOS15.7.9, Node22, Spring + PostgreSQL loopback; catalogue fixture
50 sách. Baseline API đo trước encode, mức warm chưa bằng lượt dưới tải.
Harness gọi Sharp processor tuần tự và probe API cùng lúc, chưa tính trọn
Drive/network/claim/lease/Docker scheduling/CDN.

| Lô | Encode p50/p95 | API trước tải p50/p95 | API dưới tải p50/p95 | CPU | Peak RSS | Input/output | Block output |
|---|---:|---:|---:|---:|---:|---:|---:|
| 20×2 | 157,33/226,29ms | 35,09/48,63ms | 22,64/47,32ms | 7,22s | 195MiB | 17,28/20,38MB | 21,22MB |
| 50×8 | 157,12/196,21ms | 31,42/40,29ms | 22,13/31,67ms | 71,37s | 218MiB | 173,36/204,00MB | 212,38MB |

440 lượt encode và 771 probe API không lỗi; harness wall6,73s và65,51s,
bao gồm cleanup output tạm. Không kết luận API nhanh hơn do worker; phép đo
warm khác nhau. Không ngoại suy throughput/RTO24.000ảnh hoặc năng lực Dell.

Docker local đã kiểm cgroup1CPU/768MiB, Nginx JPEG/WebP, chặn staging/symlink/
variant sai, mount derived read-only. Worker amd64 gặp ENOSPC trên tmpfs64KiB:
không complete, giải phóng dung lượng rồi retry được. Kill claimant, rút ngắn
lease đúng job fixture và khởi động worker thật nhận READY trên DB test.

Browser với backend/worker thật ở loopback kiểm0/2/8ảnh, từ chối vượt8,
reload phiên, link folder sai, lưuẨn/thaybìa/versionconflict, gallery8ảnh ở
desktop/mobile viewport, ZIP OWNER8entry. SSR fixture public200 rồi Ẩn404.
Publication fixture dùng DB setup; nguồn VERIFIED có backend tests fakeDrive.
Viewport không thay bằng chứng thiết bị thật hoặc chất lượng chữ ảnh bán thật.

## 3. Ma trận tiêu chí cần bảo toàn

Các hàng này là acceptance contract được chuyển từ spec/plan cũ. Test tự
động hiện có bao phủ phần mềm; khi release thay đổi, chọn lại các ca liên quan.
Không đánh tất cả là live PASS chỉ vì owner đã test luồng chính.

| Nhóm | Hành vi phải giữ | Nguồn kiểm chính |
|---|---|---|
| Role/migration | Đổi INTERNAL_1/2→INSIDE_4/5, giữ ID/ref/thứ tự, bỏ visibility; không publish sách ẩn | UnifiedBookPhotos, migration tests |
| Legacy receipts | Retry raw payload/alias/showOnProduct cũ vẫn trả receipt cũ; không thêm sách/audit | Finalization/feature migration tests |
| Giới hạn | 0/2/8/9ảnh; replace khi đủ8; reservation cạnh upload khác/two tabs | UploadSession, DriveBatchIntegration |
| Validation | Fake magic, byte/pixel vượt, ảnh động, HEIC/SVG, EXIF/alpha, ảnh nhỏ không upscale | ImageValidator, worker processor tests |
| Filesystem | Traversal/symlink từ chối; disk full/DB rollback không mất generation đang dùng | LocalImageStore/worker tests |
| Async upload | Original File giữ bytes LOCAL; cloud vẫn normalize; stale capability báo rõ | Queue/LocalUploadIntegration |
| Idempotency | Upload/final/commit lost response không nhân đôi; cùng key khác payload conflict | Finalization/LocalUpload/queue |
| Lease | Kill/restart/lease expiry/late completion; tối đa3attempts; claimant cũ không publish | ImageJobLease/worker |
| Worker auth | Worker token chỉ management port, không ghi sách/admin; thiếu token bị chặn | ImageWorkerSecurity |
| Generation | Output đủ/hash/MIME/size đúng mới publish; không resurrect media đã gỡ/thay | ImageJob/recovery tests |
| Source | Đúng bytes mới VERIFIED; nguồn mất/đổi/403/404/429/5xx có mã, không xóa derived tốt | Drive client/binding tests |
| Source race | Binding candidate/book version/session ownership được kiểm lại, không ghi đè nguồn mới | SourceBindingIntegration |
| Publication | LOCAL unverified chặn create/update/publish/replacement công khai; lưuẨn được | SourcePublicationGate |
| IMPORT | Input tải một lần bàn giao PROCESS, admission chỉ sau confirm; pending không finalize | DriveBatchImport/Confirm |
| MATCH | 8hash đảo thứ tự; hash trùng chọn một-một; không đổi media/role/encode | DriveBatchConfirm/Recovery |
| JSON boundary | bookId string64-bit; target chỉ mediaId; generation explicit thiếu version bị từ chối | DriveBatchIntegration/API |
| Batch errors | Duplicate File ID/folder/provider sai, partial success, nguồn đổi trước confirm | Drive parser/batch tests |
| Batch lifecycle | TTL/session consume/cancel trả slot, restart retry, callback cũ và staging cleanup | DriveBatchImport/Download |
| Batch receipts | Confirm atomic theo tập chọn, payload khác409; receipt giữ qua consume | DriveBatchConfirm/Recovery |
| UI | Dropdown đúng state, counter thay ảnh lặp, bulk attach tuần tự, lỗi giữ phần thành công | Panel/queue tests, browser fixture |
| Reload | Không mất role hoặc resurrect ảnh đã gỡ; session ảnh còn hợp lệ mới hydrate | DriveBatch/queue |
| Poll/auth | Một poller, pause tab ẩn, logout hủy; cache CSRF theo epoch, csrf_invalid retry1lần | Auth/AdminHttp/DriveBatch |
| Delivery | Mixed providers, hidden/temp/trash/version sai404; DTO/ZIP không lộ nguồn/key | PublicMedia/LocalUpload/PhotoDownload |
| Thiếu ảnh | Không phát URL biết hỏng; FRONT placeholder cố định, race GET có fallback | Public variant/UI tests |
| Cleanup | Không xóa ACTIVE/lease đang chạy, không xóa cloud ref còn rollback | MediaCleanup/LocalImageCleanup |
| Manifest | Duplicate/foreign/role/book/version sai; limit100, receipt24h; owner-only | MigrationPreview |
| Apply | Source/book đổi sau preview bị chặn; nhiều ảnh một sách bump version1lần | MigrationApply |
| Rollback | Không đè ảnh mới thay; LOCAL-only vẫn đọc trên binary tương thích | MigrationApply/restore |
| Rebuild | Đúng manifest/hash/key, dedupe, không tự dùng recipe mới; RECIPE_MISMATCH giữ ảnh tốt | RecoveryIntegration |
| Restore | Profile isolated khóa outbound/claim/cleanup; orphan chỉ report/quarantine | RestoreIsolation/drill |
| Cache | No-store admin, edge30s/purge, alias/version không vượt quyền, lỗi không cache | Worker/proxy/public tests |

Tên trong bảng là nhóm/class kiểm thử, không là lời hứa mọi ca đều đã chạy
trên production. Khi cần tái lập, đọc test thật và checkpoint ghi lệnh/revision.

## 4. Gate vận hành còn phải theo dõi

Các gate dưới đây kế thừa R6 và Task7. Chúng đã được chuyển đầy đủ nên không
cần giữ implementation plan cũ để theo dõi. PROGRESS giữ snapshot của chúng.

| Gate | Trạng thái/bằng chứng cần bổ sung |
|---|---|
| Upload UX | Owner đã xác nhận12/11; không yêu cầu lặp lại chỉ vì phiên mới |
| Drive thật | Ca đúng nguồn đã được owner xác nhận; ghi riêng ca hash lệch/thiếu quyền/lỗi thật nếu cần đóng security smoke |
| Lô8 IMPORT/MATCH thật | Đo browser requests, provider metadata/byte download, queue/download/encode/end-to-end, CPU/RSS/bytes; cold/warm riêng |
| Lô20–50 sách trên Dell | Đo API baseline vs worker, peakRSS/CPU/SSD/inode/network, ảnh chữ owner duyệt và p95 chấp nhận; ngoài LAN/thiết bị thật |
| Backup R2 | Restore đã được owner xác nhận; lịch/retention/off-host custody/RPO, counts/FK/recipes/binding/receipts và RTO vẫn phải có hồ sơ vận hành |
| Disaster recovery | Đo tới FRONT đầu tiên/toàn lô trên mount/DB cách ly; nguồn thiếu/đổi báo riêng; xác nhận mức thiếu ảnh chấp nhận |
| Mixed provider live | Kiểm một sách LOCAL mới cùng một sách Cloudinary cũ: gallery, admin, preview, ZIP, quyền/cache |
| Migration sách cũ | Owner hoãn; chỉ mở theo scope/preview/backup khi yêu cầu chuyển, không mặc định là việc còn phải chạy ngay |
| Rollback sách cũ | Drill pointer/version sau migration cùng gate đợt đó; không giả local test là drill live |
| Monitoring | Queue age/lease/attempts/failures, disk/inode, worker chết, source errors, 404/5xx và HIT/MISS có cảnh báo/owner phụ trách |
| Release/runtime | Namespace/mount/private8081/Nginx đúng, recipe/image digest khớp, backup trước migration, app/worker tương thích |

Việc xóa container QA12/11 chỉ dọn fixture local. Không đổi lifecycle ảnh thật,
không xóa nguồn Drive, generation production hoặc Cloudinary assets.

## 5. Tái lập kiểm tra và giới hạn

- Backend: DB PostgreSQL riêng tên `me_may_test`; dùng TEST_DB_URL và DB_USER/
  DB_PASSWORD qua cấu hình riêng, từ `code/backend` chạy `./mvnw -o clean verify`
  nếu dependency đã có. Không source credential production hoặc chạy nhầm DB.
- Frontend: từ `code/frontend`, `npm test`, `npm run build:workers`,
  `npm run check:workers:proxy`; chạy SSR build khi thay SSR/public behavior.
- Worker: `npm --prefix code/image-worker test`.
- CLI: từ root, `node --test scripts/image-system/media-operations.test.mjs`.
- Recipe/validation smoke có thể dùng fixture tổng hợp; chữ, màu và nén của
  ảnh bán thật cần owner xem, không thay bằng test fixture JPEG nhỏ.
- Test live cần namespace thử/explicit opt-in; các ca bị skip không là PASS.
  Không dựng lại QA hoặc chạy download/migration/rebuild trên ảnh thật chỉ để
  cập nhật tài liệu; cần scope/authorization tương ứng của đợt vận hành.

Runbook giữ lệnh chuẩn bị server, export/preview/apply/rollback/inventory/
rebuild và benchmark. Kết quả lịch sử giữ nguyên trong DEV_LOG, không xóa để
giảm số dòng hoặc biến snapshot cũ thành trạng thái deploy hiện tại.
