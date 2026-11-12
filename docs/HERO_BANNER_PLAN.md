# Hero Banners Implementation Plan

> **For agentic workers:** dùng superpowers:executing-plans, làm từng task
> tuần tự, test RED→GREEN và review độc lập toàn branch sau cùng.

**Goal:** OWNER quản lý tối đa10banner Home, tự chuyển5000ms, mọi ảnh link `/sach`.
**Architecture:** Config/version riêng trong PostgreSQL; ảnh dùng image_asset/
generation/job PROCESS và recipe v1 đã có, namespace filesystem `banners/`.
Angular thêm editor độc lập trong trang ghim sách và carousel SSR-safe.
**Tech Stack:** Angular21/RxJS/Vitest, Java21/Spring JDBC/Flyway, worker Sharp sẵn có.
**Spec:** [HERO_BANNER_SPEC](HERO_BANNER_SPEC.md), owner duyệt và chỉ định triển
khai tuần tự12/11. Không hỏi lại cách thực thi đã được chỉ định.

## Global Constraints

- 0–10banner,5000ms, đích `/sach`, khung3:1 contain; fallback asset hiện tại.
- OWNER toàn quyền; STAFF403 ở API quản trị banner; anonymous401.
- JPEG/PNG/WebP tĩnh,10MiB,25MP; recipe v1 nguyên trạng, không thêm dependency.
- Lưu banner riêng với shelves; version409 giữ draft; source book/Drive không đổi.
- Upload chưa lưu không public; ảnh từng public giữ24h sau bỏ; backup namespace.
- SSR có ảnh đầu; một ảnh không timer; pause/focus/hidden/reduced-motion hoạt động.
- Đã được lệnh triển khai; plan được tự rà trước thực thi, không dừng ở handoff
  để xin lại quyền triển khai. Không migrate/deploy production.

## Review Focus

1. File upload hoàn tất sau đổi/xóa hàng: không ghi đè draft mới (Task3).
2. Save/worker complete/cleanup đồng thời: không xóa ảnh còn dùng hoặc public draft (Task2).
3. Broken slide hoặc tab hidden lâu: fallback, không timer nhảy dồn (Task4).
4. Save banner trong khi shelves dirty: giữ nguyên draft shelves và ngược lại (Task3).
5. Retry upload cùng key nhưng bytes khác, owner khác: không lấy nhầm ảnh (Task2).

## File map

Các path tính từ root; BE=`code/backend/src/main/java/vn/memay`,
BT=`code/backend/src/test/java/vn/memay`, FE=`code/frontend/src/app`.

| Tạo/sửa | Trách nhiệm |
|---|---|
| BE/catalogue/HeroBannerService.java | config DTO/read/update/public list/version/audit |
| BE/media/HeroBannerMedia.java | upload/status/storage/private-public content/cleanup |
| BE/media/HeroBannerController.java | admin/public REST, streaming HTTP/cache |
| BE/media/ImageJobService.java | chọn store theo namespace, lock/finish banner PROCESS |
| BE/media/LocalImageStore.java | primitive mở variant đã xác minh, không lộ path tùy ý |
| BE/auth/SecurityConfiguration.java | OWNER-only banner admin; public content GET |
| BE/catalogue/PublicCatalogueDtos.java, PublicCatalogueService.java | Home.banners trong SSR/API hiện có |
| code/backend/src/main/resources/db/migration/V33__hero_banners.sql | singleton config, upload, item; không sửa bảng sách |
| BT/catalogue/HeroBannerApiTest.java | quyền/version/config/publicHome/migration |
| BT/media/HeroBannerMediaTest.java | namespace/upload/worker/private/public/cleanup/race |
| BT/support/PgTestData.java | clean riêng banner trước admin_user, guard DB test giữ nguyên |
| code/image-worker/src/index.mjs | chấp nhận namespace banners cho staging/output |
| code/image-worker/test/worker.test.mjs | namespace, symlink/path và hồi quy worker sách |
| FE/features/admin/home-featured/hero-banner-editor.{ts,html,scss,spec.ts} | uploader/editor save độc lập |
| FE/features/admin/home-featured/home-featured.{ts,html,spec.ts} | nhúng editor/dirty chung |
| FE/features/home/hero-carousel.{ts,html,scss,spec.ts} | SSR markup/timer/navigation/fallback |
| FE/features/home/home-page.{ts,html,spec.ts} | dùng carousel thay img cố định |
| FE/features/catalogue/public.models.ts | type public banner, tương thích fixture cũ |
| docs/README/PROGRESS/DEV_LOG và contract chuẩn | trạng thái/rollout/bằng chứng |

## Task 1: Cấu hình và API Home

**Interfaces:** HeroBannerService.Banner(id:String,alt:String,src:String,
srcset:String,width:int,height:int); Config(version:long,banners:List<Banner>);
Item(id:UUID,alt:String); Update(version:Long,banners:List<Item>).
get(AdminUser):Config; save(AdminUser,Update):Config; published():List<Banner>.
Upload metadata gồm media_id/generation_id/job_id/owner_id/request_key/input_key/
sha256/created_at/expires_at/published_at. Item thứ tự0–9, unique media_id.

- [ ] Viết HeroBannerApiTest trên CatalogueTestSupport/PGQA: config mặc định
  version0/banners[]; seed READY upload của OWNER bằng fixture SQL; save2ảnh
  rồi reorder/remove, assert version tăng, Home.banners đúng thứ tự, link path
  không nhận tùy ý;0ảnh cho[] để FE fallback.10đạt,11trả400, duplicateID400.
- [ ] Thêm assertions STAFF GET/PUT403, anonymous401, thiếuCSRF403, stale409;
  upload owner khác chưa publish bị từ chối, chưaREADY/expired bị từ chối;
  no-op không tăngversion/audit; audit lỗi rollback config/items.
- [ ] Chạy `mvn -Dtest=HeroBannerApiTest test` trên me_may_test riêng, kỳ vọng
  đỏ API/schema thiếu; tuyệt đối không dùng me_may_dev cho cleaner.
- [ ] Xác minh số Flyway kế tiếp vẫn33; tạo singleton config riêng, uploadFK
  image_asset/generation/job và owner; itemFK upload. Mỗi configsave khóa
  config trước, kiểm version/READY/owner/expiry và row theo thứ tự ổn định.
  Metadata alt tối đa300, trim; rỗng mặc định “Xem tất cả sách tại Mẹ Mây”.
- [ ] Cài service/publicHome DTO. Save giữ ảnh mới vô thời hạn khi đang dùng;
  bỏ ảnh đặt expires_at=now+24h, published_at vẫn giữ để content cũ còn đọc.
  Chỉ ảnh từng publish mới có public URL. Audit items chỉ ID/alt, invalidate
  Home sau commit; shelves/config/version khác không bị sửa.
- [ ] API GET/PUT `/api/v1/admin/hero-banners`, OWNER-only trước rule GET admin
  chung. Public content GET được whitelist chính xác, không mở admin uploads.
- [ ] Chạy test xanh; commit `feat: add hero banner configuration` kèm log.

## Task 2: Upload/self-host qua worker hiện có

**Interfaces:** HeroBannerMedia upload(AdminUser,UUID requestKey,InputStream):Upload;
status(AdminUser,UUID):Upload; lockUpload(UUID media,UUID generation):boolean;
store():LocalImageStore; cleanup():void. Upload(id,jobId,status,previewUrl,
errorCode). Content descriptor gồm MIME/ETag/bytes và stream đã xác minh.
Input job `banners/staging/<uuid>/input`; store dùng root/banners, manifest vẫn
`derived/<media>/<generation>/<size>.<format>` tương đối trong namespace đó.

- [ ] Viết HeroBannerMediaTest với LOCAL=true/management port riêng/root ảnh QA:
  upload202 → claim PROCESS → encode Sharp thật → complete →READY; private
  preview OWNER200, owner khác403, public trước save404/sau save200, MIME/bytes/
  ETag/304 đúng. Requestkey cùng owner+bytes trả cùng upload, khácbytes409.
- [ ] Thêm test sai bytes/format/animated/quá10MiB/25MP bị chặn hoặc FAILED,
  không đổi config public; expired/notREADY save409; cleanup không xóa current/
  valid draft/active lease, retired<24h giữ và>24h dọn; workerComplete/save/
  cleanup không làm public ảnh chưa được lưu. Không gọi cleanup trên DB dev.
- [ ] Chạy test đỏ; thêm worker.test namespace banner nằm đúngroot/banners,
  không chấp nhận namespace khác/symlink/../; `npm test` ở code/image-worker đỏ.
- [ ] Cài upload streaming qua LocalImageStore.stage và UploadLimiter sẵn có;
  root/banners là store riêng không đăng ký thêm bean LocalImageStore để tránh
  phá injection hiện tại. requestkey owner-scoped có hash; upload TTL24h,
  tối đa30draft chưa publish/owner. Transaction rollback dọn staged input mới.
- [ ] Cài endpoints POST `/api/v1/admin/hero-banners/uploads` multipart file,
  requestKey; GET `/uploads/{id}` status; GET `/uploads/{id}/content` preview.
  Khi LOCAL disabled, upload503 rõ ràng; đọc config vẫn được.
- [ ] ImageJobService chỉ mở thêm prefix banners, chọn đúng store cho hash/
  publishAttempt; PROCESS banner khóa upload metadata thay temporary_media,
  kiểm đúngmedia/generation/recipe và validate đủ variants v1 trước READY.
  Job readiness chung tái sử dụng; không tạo SourceBinding/Drive gate cho banner.
- [ ] Worker paths chấp nhận prefix banners, dùng root/banners cho input/output;
  recipe v1/processor/giới hạn/concurrency không đổi. Không đổi worker protocol.
- [ ] Public GET `/api/v1/hero-banners/{id}/content?size=640|1400&format=jpg|webp`:
  chỉ published_at!=NULL và current hoặc còn grace; input allowlist; stream
  variant no symlink/checksum; cache immutable24h và ETag. Private no-store.
- [ ] Cleanup khóa config rồi job (SKIP LOCKED) và upload trước xóa; tránh
  active lease/current/draft hợp lệ. Xóa files/rows idempotent, không động
  namespace sách; mode restore-isolated không chạy cleanup/mutation.
- [ ] Chạy backend/worker xanh; commit `feat: process hero banner uploads`.

## Task 3: Editor trong trang sách nổi bật

**Interfaces:** HeroBannerEditor standalone selector app-hero-banner-editor;
dirty:boolean, uploading/busy/error state, load/save/move/remove/replace.
Config dùng GET/PUT riêng; savebody {version,banners:[{id,alt}]}.

- [ ] Viết test component: thêm/thay/reorder/remove,10ảnhkhóa nút thêm, upload
  failed giữ ảnh cũ; requestkey không đổi khi retry cùngfile; response cũ sau
  replace/remove/logout không sửa draft mới. status FAILED/timeout có thông báo.
- [ ] Viết test parent: shelves dirty + savebanner không reset shelves; banners
  dirty + saveshelves không reset banner; rời trang một dirty confirm chung.
  API409 giữ toàn bộ draft, double-submit một PUT. Chạy test đỏ.
- [ ] Cài editor có thumbnail, mô tả ảnh, lên/xuống, thay/xóa, thêm và Lưu banner.
  Theo UI admin đỏ hiện có. Dùng AdminHttp/CSRF/credential/no transferCache;
  uploadrequestKey UUID/file, polling status1s có timeout180s/cancel destroy;
  timeout giữ uploadId để kiểm lại, không tự POST lại; save khóa khi pending.
- [ ] Nhúng đầu trang; parent dirty guard/beforeunload gộp hai phần, riêng load/
  save không discard phần kia. Preview bằng endpoint admin, không URL blob tồn
  lâu hoặc ghi hồ sơ vào localStorage. Revoke objectURL nếu dùng preview tạm.
- [ ] Chạy tests xanh; commit `feat: manage hero banners in home editor`.

## Task 3b: Nâng chất lượng banner theo owner duyệt bổ sung

- Recipe riêng `hero-v1`:800/1600/3200, WebP88/JPEG90; giữ recipev1 sách.
- Test Sharp thật xác minh3240×1080 không bị thu xuống1400; input nhỏ không upscale.
- API/preview/srcset/store validate đổi sang sizes mới, đăng ký recipe riêng
  theo runbook với worker digest/config hash tương ứng; thiếu recipe trả503.
- Quyết định này thay hướng reusev1/640/1400 ở các Task1/2 và preflight cũ.

## Task 4: Carousel và nghiệm thu cuối

**Interfaces:** HeroCarousel input banners:Banner[] (default[]), mọi link/sizes
do code cố định; HomeData.banners optional cho API/fixture rollout tương thích.
activeIndex/paused/brokenIds là trạng thái browser, không persist storage.

- [ ] Test carousel: SSR first img có src/srcset/dimensions/fetchpriority=high,
  bannerlink/sach;0ảnh fallback;1ảnh không timer;2ảnh chưa đổi ở4999ms và đổi
  ở5000ms/quayvòng; arrows/dots không kích hoạtlink. Pause/focus/hidden không
  tăng index; resume bắt đầu5s mới; reduced-motion mặc định pause, destroy dọn.
- [ ] Test broken first/one/all: chọn ảnh còn tốt hoặc fallback, không vòng lặp
  lỗi/timer; input array đổi sau hydrate reset hợp lệ. Chạy tests đỏ.
- [ ] Cài component standalone HTML/CSS khung3:1 contain/fullbleed theo hero cũ;
  controls>=44px/keyboard/aria, reduced motion; timer chỉbrowser sauhydrate,
  dừng khihover/focus/hidden và userpause. Không đọc document/window khi SSR.
- [ ] Thay img cũ bằng component trong Home, giữ h1sr-only và các box/kệ khác.
  Ảnh sau loadinglazy/priority thấp; timer callback không bật khi componentgone.
- [ ] Chạy backend `mvn test` trênPGQA, frontend `npm test`, worker `npm test`,
  buildSSR/Workers/proxy; kiểm customer/book/media regressions và skip thật.
- [ ] Browser QA realbackend/PGQA/Sharp worker: OWNER upload/save2ảnh, public
  đổi5s/link, reorder/replace/error/conflict, private/public URL;1280/390 keyboard.
  SSR initialHTML/bannerLCP markup; xác nhận không dùngmock để nghiệm thuencode.
- [ ] Review độc lập toàn branch theo executing-plans; Important/Critical có
  test đỏ→xanh trong một fixpass, fullsuite xanh; ghi rulings/minor thật.
- [ ] Hợp nhất contract/bằng chứng vào docs chuẩn, gỡ spec/plan sau chuyển đủAC;
  giữ gate live/device/backup/digest/rolloutworker. Kiểm400dòng/local links/env
  ignored, commit/pushdev; sync dev-ui đang phục vụ4200 giữUIriêng, không pushmain.
  RuntimeQA dọn riêng, serverlocal user giữ khi cần test feature.

## Preflight và nghiệm thu

T1→T2 dùng uploadmetadata/READY; T2→T3 Upload/status/content; T1→T4 Home.banners.
T3 parent dirty độc lập shelves, T4 không gọi admin API. Đã rà signature,
specAC1–10 và5Review Focus; kỹ thuật cụ thể trên thuộc lựa chọn builder được giao.
Không tạo recipe mới chỉ để đổi kích thước: dùng640/1400 WebP/JPEG của v1,
giữ ảnh gốc để backup; tránh thay digest/contract recipe sách hiện hành.
