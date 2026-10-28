# M5 — hiệu năng và tạo sách không có nháp

Trạng thái: **đề xuất, chờ user duyệt**. Ngày28/10/2026, Asia/Ho_Chi_Minh.
Thay thế các quyết định DRAFT/quyền ghi STAFF trong M2_SPEC, DESIGN và
MASTER_PLAN sau khi được duyệt. Không thay các gate bảo mật/recovery/SEO M5.

## 1. Mục tiêu và nguồn quyết định

- User yêu cầu bảng P0/P1/P2: logoWebP đúng kích thước; xác định LCP và phần
  chờ; mediaWebP có JPEGfallback; hai cỡ ảnh public; dimensions/CLS; chuẩn hóa
  upload/cảnh báo ảnh lớn; đánh giá cache ảnh public có kiểm soát.
- User yêu cầu bỏ hoàn toàn việc tạo nháp. Đã xác nhận nhập đủ thông tin và
  ba ảnh rồi đăng ngay; chỉ OWNER thêm/sửa/đăng, STAFF chỉ xem quản trị.
- User chọn upload từng ảnh vào vùng tạm rồi tạo+đăng một lần. Tài nguyên
  upload tạm không phải BookCopy/Listing và không có trang public.
- User bổ sung chọn nhiều ảnh cùng lúc, kéo file vào để upload và kéo đổi
  thứ tự ảnh khi chọn sai; vẫn giữ đúng ba vai trò FRONT/BACK/INSIDE.
- Tiếp tục Angular/Spring Boot/Cloudinary authenticated/Workers/Render/Neon.
  Không thêm order/checkout, AI pipeline, thư viện UI hoặc dịch vụ nền mới.
- Gate performance vẫn mở: JSON sau deploy cho MM-000019 có median
  LCP4,23s/CLS1,173; cải thiện ảnh chưa giải quyết hết nguyên nhân.

## 2. Các phương án đã xem xét

| Phương án | Đánh đổi | Quyết định |
|---|---|---|
| Upload từng ảnh tạm, final tạo+đăng | Có vòng đời ảnh tạm/cleanup; thử lại đúng ảnh lỗi, request nhỏ, không cần sách nháp | User chọn |
| Gửi form và ba ảnh trong một multipart | Ít bước API; phải gửi lại cả bộ khi lỗi, dễ vượt multipart11MB và Worker70s hiện tại | Không chọn |

Chi tiết cỡ ảnh, thời hạn vùng tạm và cách retry dưới đây là đề xuất của agent.

## 3. Luồng OWNER mới

1. Mở Thêm sách: nhập thông tin và chọn nhiều ảnh hoặc kéo file từ máy vào
   vùng upload trên cùng form; xem preview rồi chỉnh lại thứ tự nếu cần.
2. Ảnh được kiểm tra, chuẩn hóa và đưa vào hàng đợi upload riêng; hiện
   preview/progress/lỗi từng ảnh. Không tạo BookCopy, Listing, mã sách hoặc
   audit CREATE lúc này. Quy tắc chọn/thả/sắp xếp ở mục3.1.
3. Nút **Đăng sách** chỉ khả dụng khi form hợp lệ, ba ảnh READY và đã xác
   nhận ảnh/tình trạng đúng cuốn thật. Backend kiểm lại toàn bộ điều kiện.
4. Final request tạo BookCopy+ListingPUBLISHED, gắn đủ ba ảnh, cấp mã/slug,
   set availabilityAVAILABLE/published_at và audit trong một transaction.
5. Thành công mở trang quản trị cuốn vừa tạo. Không còn nút Lưu nháp,
   bộ lọc Nháp hoặc chuyển trạng thái qua DRAFT trong luồng mới.
6. Lỗi form/final giữ dữ liệu trên màn hình; lỗi một ảnh chỉ retry slot đó.
   Rời form còn dữ liệu chưa đăng có cảnh báo. Không hứa phục hồi form sau
   đóng tab/reload; không lưu nội dung sách chưa đăng thành bản nháp.

Ảnh tạm đã upload vẫn riêng tư; backend chỉ cho OWNER của phiên upload
xem/sửa/xóa. STAFF đọc được màn quản trị nhưng mọi endpoint ghi bị403,
kể cả tự gọi API. Login/logout/session hoạt động như hiện tại.

### 3.1. Chọn nhiều ảnh, kéo thả và sắp xếp

- Nút chọn file hỗ trợ chọn1–3ảnh cùng lúc; vùng upload nhận một hoặc nhiều
  file kéo từ máy vào. Hai cách dùng cùng validation, chuẩn hóa và hàng đợi.
  Hiện hướng dẫn ngắn, trạng thái đang kéo vào và lỗi ngay tại vùng upload.
- Ba thẻ ảnh có số thứ tự và nhãn rõ: **1.Bìa trước(FRONT)**,
  **2.Mặt sau(BACK)**, **3.Trang nội dung(INSIDE)**. Thứ tự ban đầu theo
  danh sách file nhận được; OWNER xem preview và kéo thẻ để đổi vị trí.
  Không suy vai trò từ tên file hoặc thứ tự hoàn thành upload.
- Có nút Đưa lên/Đưa xuống tương đương kéo đổi thứ tự, dùng được bằng bàn
  phím và trên điện thoại. Sau đổi vị trí cập nhật nhãn/thứ tự và thông báo
  cho công nghệ hỗ trợ; không bắt buộc thao tác kéo để hoàn tất form.
- Có thể thêm từng đợt vào vị trí còn trống, xóa hoặc thay một ảnh. Tổng
  không quá3ảnh; nếu đợt mới vượt số vị trí trống, báo rõ và không nhận
  đợt đó. Không tự ghi đè ảnh đã chọn; thay ảnh cần thao tác Thay ảnh rõ.
- Một lần chọn nhiều ảnh vẫn upload từng ảnh theo giới hạn concurrency
  hiện có; không gộp cả bộ vào một multipart. Lỗi một ảnh không hủy các
  ảnh hợp lệ; retry/xóa/thay xử lý theo ID ảnh riêng, không theo số vị trí.
- Cho phép đổi thứ tự trong lúc đang chờ/đang upload. Kết quả async luôn
  gắn đúng ID ảnh; kéo đổi thứ tự không upload lại ảnh đã READY. Final
  gửi ánh xạ IDảnh→vai trò theo thứ tự mới nhất và khóa thao tác ảnh trong
  lúc đang đăng để tránh giao diện đổi sau khi request đã gửi.
- Trên màn sửa sách ẩn/công khai cũng cho sửa thứ tự: preview thay đổi trên
  form, chỉ áp dụng sau Lưu thành công. Backend kiểm đúng ba ảnh thuộc
  cuốn và đổi ánh xạ vai trò trong một transaction có version/audit; không
  có trạng thái public tạm thiếu ảnh hoặc gán một ảnh vào hai vai trò.

## 4. Transaction, retry và vòng đời ảnh tạm

- Phiên upload có ID khó đoán, gắn OWNER, ba slot và hạn24giờ. Lưu intent
  trước gọi Cloudinary để có đường cleanup kể cả process bị dừng.
- Upload qua backend như hiện tại; không đưa provider secret/signedURL ra
  client; giữ CSRF, giới hạn upload/concurrency và kiểm owner tại backend.
  Slot thay thế dùng asset mới rồi swap; thất bại giữ slot READY cũ.
- Final khóa phiên, kiểm owner/hạn/ba slot, validation và confirmation rồi
  tạo aggregate/gắn ảnh/đánh dấu đã dùng trong cùng transaction DB.
  Kiểm ánh xạ đủ ba vai trò khác nhau và ba IDảnh READY khác nhau thuộc
  chính phiên đó; không nhận ID từ phiên khác hoặc ảnh đã bị xóa/thay.
- Phiên final là khóa chống tạo trùng: retry cùng nội dung trả lại sách đã
  tạo; nội dung khác hoặc phiên đã dùng sai mục đích trả409. Không retry
  tạo ra mã/sách thứ hai khi client mất response.
- Final lỗi không tạo sách nửa chừng; ảnh READY giữ đến hạn để retry.
  Phiên hết hạn/hủy và asset cũ được cleanup bằng cơ chế retry/scheduler
  hiện có; không xóa asset đã gắn vào sách. Kiểm failure/restart/retry.
- Chỉ final thành công phát audit CREATE/PUBLISHED với xác nhận ảnh thật.
  Lịch sử thao tác ảnh vẫn không chứa binary, secret hoặc signedURL.

## 5. Trạng thái, dữ liệu cũ và chỉnh sửa

- Trạng thái sản phẩm còn **PUBLISHED/ARCHIVED**; availabilityAVAILABLE/SOLD
  vẫn độc lập. Ẩn chuyểnPUBLISHED→ARCHIVED; hiện lại đi thẳng→PUBLISHED sau
  validation/confirmation. Giữ mốc published_at đầu tiên và slug/mã cũ.
- Migration chuyển DRAFT đang có thành ARCHIVED, không tự đăng hoặc xóa
  dữ liệu. Trước migrate kiểm số lượng, backup và đối chiếu sau migrate.
- Nháp cũ có thể chưa đủ dữ liệu: OWNER hoàn thiện trên màn sửa sách ẩn;
  chỉ được hiện công khai khi đủ điều kiện. Không gọi các bản này là nháp.
- API không nhận trạng tháiDRAFT; bỏ enum/check/filter/action đang dùng nó.
  Audit JSON lịch sử giữ nguyên giá trị cũ để không sửa lịch sử.
- Sách PUBLISHED luôn giữ trường bắt buộc và đủ ba ảnh; thay ảnh nguyên tử,
  cập nhật version/audit, conflict409 như hiện tại. Sách ẩn không lộ public.
- Import sau MVP phải theo luồng mới khi được đặc tả; không giữ yêu cầu
  “import tạo nháp” trái quyết định mới trong baseline tài liệu.

## 6. Logo, media và upload

- Tạo logoWebP208×208 từ logo nguồn2000×2000; giữ nguồn tracked. Dùng cho
  logo trên web với width/height CSS ổn định; mục tiêu≤20KiB, kiểm hình thật.
  Không vẽ lại logo hoặc đổi nhận diện. Favicon/OG chỉ đổi khi liên quan.
- Public media có hai cỡ giới hạn chiều rộng320px(thumbnail)/640px(detail),
  không phóng lớn ảnh nhỏ và không crop. Mỗi cỡ có WebP và JPEG fallback.
  Admin preview1280px tiếp tục phục vụ kiểm tra ảnh.
- Endpoint chỉ nhận size/format trong allowlist; trả MIME chính xác,
  nosniff, không redirect provider. URL cũ mặc định JPEG640 còn hoạt động.
- Frontend dùng picture/srcset/sizes theo khung thực; LCPFRONT eager và
  fetchpriorityhigh; ảnh khác lazy khi phù hợp. Khung giữ trọn ảnh bằng
  contain. Kiểm ảnh ngang/dọc và xoayEXIF trước/sau tải.
- Upload JPEG/PNG: cảnh báo khi nguồn>5MB; reject nguồn>10MB hoặc25MP như
  giới hạn backend. Chuẩn hóa bản upload về cạnh dài≤2560px, đúng chiều
  EXIF, JPEGquality0,85/nền trắng cho ảnh trong suốt; giữ file nguồn người
  dùng ngoài ứng dụng. Backend vẫn validate, không tin client.
- Các số320/640/2560 vàquality là mặc định đề xuất; kiểm bytes/độ rõ thực tế
  trước chốt. Không sửa nội dung63ảnh nguồn hiện có hoặc ghi đè asset gốc.
- Variant authenticated phải eager. Kiểm một asset trước, rồi backfill
  tậpID thực khi WebP có lợi vềbytes/độ rõ, có checkpoint tránh lặp quota;
  kiểm mọi format/size mở được,
  ảnh ẩn/khôngtồntại vẫn404. Không đổi public_id/BookID của sách đang có.

## 7. Điều tra LCP/CLS và đánh giá cache

- Đo cùng route MM-000020 hoặc một route cố định: LCPelement, document
  TTFB, API/media waiting, download và render; tách warm khỏi coldstart.
  Không quy toàn bộ chờ cho RenderFree chỉ từ WorkerTTFB.
- Trace layout-shift bằng browser thật trước sửa. Đối chiếu SSR→hydration,
  loading/refresh và CSS/header/image để tái hiện main dịch chuyển.
  Không tự kết luận ảnh là nguyên nhân duy nhất như vòng sửa trước.
- Sửa nguyên nhân đã tái hiện; không chớp trắng/nảy bố cục khi hydrate hay
  refresh. Giữ privacy/freshness cho sold/ẩn và nội dung hỏi sách.
- Cache là **đánh giá**, chưa là quyết định bật cache. Mặc định no-store
  tiếp tục; chỉ đề xuất chính sách khác nếu chứng minh ẩn/thay ảnh không
  phục vụ dữ liệu cũ, variant không lộ ảnh tạm và có invalidation/test.
  Ghi quyết định, lợi ích và rủi ro trong ARCHITECTURE/VERIFICATION.

## 8. Trình tự và nghiệm thu

1. Tái hiện LCP/CLS, tối ưu logo và sửa nguyên nhân layout/hydration.
2. Làm media2cỡ/WebP/JPEG và chuẩn hóa upload, kiểm provider nhỏ trước.
3. Luồng ảnh tạm→tạoPUBLISHED, quyềnOWNER và migration bỏDRAFT.
4. Regression frontend/backend, Workersbuild, browser QA và handoffdev.
   User merge sangmain/deploy; không tự deploy hoặc migrate DBonline.

Kiểm bắt buộc: STAFFghi403; thiếu trường/ảnh bị chặn; phiên ảnh riêng tư,
hết hạn/cleanup; lỗi từng slot/final; final lặp không tạo trùng; migration
giữ mã/slug/ảnh/audit và không tựpublish; ẩn/hiện/SOLD/wishlist/FlashSale
không hồi quy; media từng format/size đúng MIME và không lộ ảnh ẩn.

UploadUI: chọn và thả một/nhiều file, thêm nhiều đợt, vượt3ảnh, file sai/
quá lớn, lỗi một ảnh và retry; kéo đổi thứ tự trước/trong/sau upload vẫn
gán đúng FRONT/BACK/INSIDE; đổi thứ tự bằng bàn phím/nút trên mobile;
không upload lại ảnh READY; sửa thứ tự sách đã đăng áp dụng nguyên tử,
conflict giữ nội dung form và ảnh public không thay trước khi Lưu thành công.

Performance: LighthouseMobile warm3lần/route Home/detail/wishlist, cùng
cấu hình và dữ liệu wishlist; mỗi lần LCP≤2,5s/CLS≤0,1. Báo observed và
simulated theo report, không cộng/trừ các loại timing khác nhau.
Coldstart/rollback/quota/security M5 vẫn là gate riêng còn phải hoàn tất.

Tài liệu: cập nhật baseline M2_SPEC/master/design/data/architecture và hướng
dẫn admin trong cùng thay đổi. Plan mới chỉ viết sau khi spec này được duyệt;
gộp bằng chứng/tài liệu rồi xóa spec/plan hết vai trò theo AGENTS.
