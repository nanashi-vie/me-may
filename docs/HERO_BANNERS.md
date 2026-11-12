# Banner trang chủ

Contract hiện hành12/11/2026, thay spec/plan đã triển khai. OWNER duyệt tối đa10ảnh,
5000ms và đích cố định `/sach`; sau đó duyệt3200px/WebP88 và đổi khung sang3:1.

## Sử dụng

- Vào `/admin/sach-noi-bat`, khối **Banner trang chủ** trên các kệ sách.
- OWNER thêm/thay/xóa/lên/xuống, nhập mô tả ảnh tối đa300ký tự rồi **Lưu banner**.
  Rỗng dùng mô tả mặc định.
  Mô tả là alt cho accessibility và SEO; nên mô tả nội dung thật, không nhồi từ khóa. STAFF không thấy khối này, API quản trị403.
- Lưu banner và lưu kệ sách độc lập. Đổi phần này không mất draft phần kia;
  rời trang có một cảnh báo chung. Save409 giữ draft để đối chiếu/tải lại.
- Chọn ảnh mới chưa đổi trang chủ. Chờ xử lý READY mới lưu; upload lỗi giữ ảnh
  cũ. Quá180giây có nút kiểm tra lại job, không tự gửi lại file đã được nhận.
- Retry upload chưa nhận kết quả dùng cùng requestKey/hash; thay file dùng key mới.
  Phản hồi cũ sau thay/xóa/đổi phiên không được ghi vào draft mới.

## Chuẩn bị ảnh

| Hạng mục | Contract/khuyến nghị |
|---|---|
| Khung | Tràn ngang3:1, cover căn giữa; cắt phần dư trên/dưới |
| File thiết kế gốc |3240×1080 hoặc3840×1280, chữ lớn/ít chữ, cách mép khoảng5% |
| Input | JPEG/PNG/WebP tĩnh; tối đa10MiB và25MP; kiểm bytes/giải mã ở worker |
| Output | recipe `hero-v1`,800/1600/3200px, JPEG90 và WebP88, sRGB/strip metadata |
| Nguồn nhỏ | Không upscale; nguồn đã mờ không thể phục hồi bằng tăng kích thước |
| Dung lượng | Mục tiêu bản web lớn200–600KB tùy nội dung, không là giới hạn bắt buộc |

Ảnh test cũ1584×396 (4:1) chỉ là fallback. Ảnh mẫu Kim Đồng1920×775 được dùng
đối chiếu tỉ lệ; không đưa artwork đó vào repo hoặc cấu hình public.

## Public và carousel

- `GET /api/v1/home` thêm `banners`, theo thứ tự đã lưu. Rỗng dùng asset fallback.
- Mỗi banner `{id,alt,src,srcset,width,height}`; srcset800/1600/3200, sizes100vw.
  Khung do CSS giữ3:1 và cover, metadata width3200/height1067. Mọi ảnh link `/sach`, cùng tab.
- Một ảnh không controls/timer. Hai đến10ảnh tự chuyển5000ms, quay vòng;
  nút trước/sau, chấm chọn, tạm dừng/chạy lại hỗ trợ keyboard và target>=44px.
- Theo owner đổi12/11: tự chuyển trượt trái→phải trong550ms (ảnh mới
  từtrái, ảnh cũ sangphải); nútTrước đảo chiều, chấm chọn theoLTR.
  Hai lớp ảnh đồng bộ khi bấm nhanh; lớp cũ aria-hidden, hếtanimation dọn.
  Reduced-motion đổi ảnh ngay, không trượt kể cả bật autoplay thủcông.
- Hover/focus/tab ẩn dừng timer; resume/manual navigation bắt đầu5giây mới,
  không nhảy bù. Reduced motion mặc định tắt autoplay, có thể bật chủ động.
- Ảnh lỗi bị bỏ qua, tất cả lỗi dùng fallback; fallback lỗi có tên tiệm/link sách.
- SSR xuất ảnh đầu/srcset/dimensions/high priority ngay trong HTML; timer chỉ chạy
  sau render phía browser và được dọn khi rời trang. Ảnh sau lazy/priority thấp.
- Home fullwidth; các kệ giữ chiều rộng1200px/lề20px; Flash Sale giữ dải tràn ngang.

## API quản trị và dữ liệu

| Method/path (prefix `/api/v1`) | Hành vi |
|---|---|
| GET `/admin/hero-banners` | `{version,banners}` cùng snapshot SQL |
| PUT `/admin/hero-banners` | `{version,banners:[{id,alt}]}`; tối đa10, uniqueID |
| POST `/admin/hero-banners/uploads` | Multipart `file`,`requestKey` UUID;202 Upload |
| GET `/admin/hero-banners/uploads/{id}` | Upload `{id,jobId,status,previewUrl,errorCode}` |
| GET `/admin/hero-banners/uploads/{id}/content` | Preview800JPEG, OWNER có quyền, no-store |
| GET `/hero-banners/{id}/content?size=800&format=webp` | Public đã publish, size800/1600/3200, jpg/webp |

- Session/CSRF/activeOWNER kiểm backend; anonymous401, STAFF403, thiếuCSRF403.
- V33 thêm `hero_banner_config` singleton/version, `hero_banner_item` position0–9,
  `hero_banner_upload` liên kết asset/generation/job/owner/key/hash/expiry/publication.
- Save khóa config rồi upload theo thứ tựUUID; chỉ READY/còn hạn/đúng owner hoặc
  ảnh từng publish được nhận. Version stale409; no-op không tăng version/audit.
- Version/order/metadata/audit nguyên tử, audit lỗi rollback, invalidate Home sau
  commit; không sửa home_featured_config/version hoặc dữ liệu sách/Drive.
- Tối đa30draft còn hạn/owner, TTL24h. Key owner-scoped: cùng bytes trả cùng upload,
  khác bytes409. Upload limit dùng300attempts/10phút/owner, tối đa8inflight chung.
- Metadata public chỉ sau READY+save. Ảnh đang dùng không hết hạn; bỏ ảnh giữ24h.
  Public content chỉ ảnh từng publish còn hạn; immutable24h/ETag/304. Private và
  error no-store; Workers chỉ giữ cache cho route/params/status public hợp lệ.
- Mỗi response kiểm checksum, no-symlink, đọc tối đa10MiB vào bytes trước khi gửi,
  tránh mở lại file sau xác minh. Không trả input key/storage path ra public.

## Worker, backup và rollout

- Backend/worker dùng cùng root thật, không symlink. Banner nằm **`root/banners/`**:
  input `banners/staging/<uuid>/input`, output trong namespace
  `derived/<media>/<generation>/<size>.<format>`. Namespace sách không đổi.
- PROCESS dùng queue/lease5phút/heartbeat hiện có; banner kiểm đúng recipe và đủ6
  variants trước READY. Recipe sáchv1 không thay. Không có Drive gate cho banner.
- LOCAL disabled: GET config vẫn được, upload503 `local_media_unavailable`;
  recipe chưa đăng ký:503 `banner_recipe_unavailable`. Không coi503 là upload đạt.
- Cleanup mỗi giờ: khóa config, skip job đang khóa/lease active, giữ current và
  draft hợp lệ/grace24h; xóa idempotent files/rows hết hạn. Isolated restore không
  cleanup hoặc ghi. Không phục vụ namespace banner trực tiếp qua Nginx công khai.
- **Backup phải gồm DB và toàn bộ `root/banners`, cả staging gốc lẫn derived**.
  Không áp quy tắc loại mọi staging lên namespace này: input của ảnh đã lưu là
  nguồn phục hồi, không phải cache. Giữ quyền truy cập backup như DB/media khác.
- Restore vào DB/mount riêng, chế độ `MEMAY_MEDIA_RECOVERY_MODE=isolated`, đối
  chiếu hash originals/variants, config/version/order và public image đọc được.
  Banner không dùng rebuild Drive R5; phục hồi từ snapshot đầy đủ của banner.
- Trước rollout: backup DB/media, migrateV33, build/pin worker có `hero-v1`,
  đăng ký recipe với OCI worker digest và SHA256 cấu hình từ đúng revision.
  Dùng quy trình [IMAGE_OPERATIONS](IMAGE_OPERATIONS.md#3-cấu-hình-backend-và-service-ảnh).
  Hash riêng: `createHash('sha256').update(JSON.stringify(recipes['hero-v1']))`.
  Insert `image_recipe('hero-v1',workerDigest,{'sha256':recipeHash})`, đối chiếu
  record đã có, không ghi đè recipe. QA marker `local-qa` không dùng production.
- Smoke OWNER upload/save/refresh/public, STAFF403, một/hai ảnh, image sizes/cache,
  rollback/recovery. Lưu danh sách ID/alt/version trước đổi để rollback bằng save
  version mới; rollback phần mềm không dropV33 hay xóa media đang được tham chiếu.
- Không deploy/migrate production trong task này. Thiết bị thật, artwork chính
  thức, live digest/mount/backup/monitoring vẫn là gate rollout do owner thực hiện.

## Bằng chứng local12/11

- Test backend: config10/11/duplicates/READY/owner/expired/no-op/auditrollback,
  race2editors, controlled GET/save snapshot, CSRF/STAFF/anonymous.
- Integration encode Sharp thật, requestkey/hash, private/public/grace, quota30,
  cleanup giữcurrent/draft/lease; fake/oversize failed, worker animated/25MP rejected.
- Frontend: saves độc lập/leaveguard, upload stale/epoch/retry/timeout/conflict,
 5000ms/wrap/pause/focus/hidden/reducedmotion/brokenfallback/destroy, SSR markup.
- Browser thực dùng DBQA riêng/worker thật: upload2ảnh/private trước save/save và
  refresh; đổi thứ tự/thay ảnh/fakefile giữ public; conflict409 giữ draft.
  Desktop1280/mobile390:3:1, không tràn, target44px/keyboard/link/pause/autoplay.
- Hai finding Important từ review: snapshot GET và FlashSale fullwidth; đã có
  controlled test/browser ca RED→GREEN. Không có Critical hoặc minor deferred.
- Drill backup/restore: DB riêng +22files, originals/derivatives SHA256 khớp;
  hai banner×3WebP sizes đọc200, mutation isolated409.
- FE332/332(58files), BE319total/3skip/0failure/error, worker13/13; build SSR,
  Workers và proxy đạt. Commit tích hợp xem checkpoint cuối DEV_LOG/PROGRESS.
  Không dùng fixture/QA làm bằng chứng cho production hoặc dữ liệu khách thật.

## Localhost4200 sau bàn giao

- Owner chọn bật self-host local; dev-ui đã merge dev, giữ2chỉnhUI riêng,
  test333/333. Backend8080, management8081 loopback, Nginx18084 loopback.
- Helper private tại root checkout: `python3 .local/hero-banners/run.py backend`
  và `python3 .local/hero-banners/run.py worker` (hai tiến trình riêng). Token
  trong runtime.json mode0600, ảnh tại `.local/hero-banners/images`, không Git.
- Backup private `.local/hero-banners/before-v33.dump`; đã migrate localV33 và
  đăng ký hai recipe v1/hero-v1 marker local-source, không dùng marker trên live.
- Không sửa `.env`; chạy lại bằng helper để giữ cờ self-host. Đăng nhập
  lại sau restartbackend. Nginx chỉ mountbookderived; banner vẫn đọc quaAPI.
- Bật LOCAL cũng chuyển upload ảnh sách mới sangself-host theo owner đã duyệt;
  các quy tắc ảnh sách/Drive hiện có vẫn giữ. Không tạo dữ liệu QA
  vào DB dev khi bàn giao; nghiệm thu upload thực đã chạy trên DBQA riêng.
