# Nhập ảnh Drive và ghép nguồn theo lô

Thiết kế được owner duyệt ngày 11/11/2026. Bổ sung IMAGE_RECOVERY_SPEC và
IMAGE_STORAGE_SPEC ở luồng ảnh LOCAL. Owner đã chọn nhập bằng link Drive,
tự ghép SHA-256 khi đã upload file và giảm request.

## Mục tiêu và phạm vi

Owner dán 1–8 link Drive theo thứ tự bất kỳ. Khi nhập trực tiếp từ Drive,
backend tải file gốc, lưu metadata nguồn và encode qua worker hiện có.
Owner xem thumbnail, chọn vai trò rồi xác nhận dùng ảnh cho sách.

Nếu đã upload file trước, cùng luồng lô tự ghép nguồn theo SHA-256.
Giữ upload file và xác minh từng ảnh đang dùng. Nhập Drive cho sách mới và thêm ảnh
cho sách đã lưu; ảnh cũ tiếp tục được phục vụ theo provider đã lưu. Chuyển ảnh Cloudinary
thực hiện theo phạm vi recovery hiện có.

## Phương án đã trao đổi

- Thêm thumbnail vào bảng ghép hiện tại. Thay đổi nhỏ, vẫn cần owner ghép tay.
- Ghép nguồn theo SHA-256 với ảnh đã upload. Owner chọn ngày 11/11, phù hợp
  trường hợp đã có file trên máy và dán link lộn thứ tự.
- Nhập bằng link Drive. Owner bổ sung và chọn ngày 11/11 để khỏi tải cùng ảnh
  hai lần bằng tay. Dùng chung client Drive và pipeline LOCAL, thêm nhánh
  IMPORT bên cạnh MATCH trong operation lô.

Đề xuất agent là operation lô có lease trong DB, polling có backoff,
và cache CSRF theo phiên. Đây là mở rộng cả frontend/backend và dữ liệu.

## Luồng người dùng

1. Trong bộ ảnh chung, owner chọn Nhập từ Drive hoặc ghép nguồn cho ảnh đã tải.
2. Dán tối đa 8 link file/File ID, phân cách xuống dòng, khoảng trắng hoặc
   dấu phẩy. Parser hiện tại chỉ tách khoảng trắng, cần bổ sung dấu phẩy.
   Chuẩn hóa và từ chối File ID lặp, báo vị trí dòng trùng.
3. Bấm Tải ảnh từ Drive hoặc Tự ghép nguồn. Hiện tiến độ chung và từng nguồn.
4. IMPORT hiển thị thumbnail từ derived LOCAL và chọn vai trò. Thứ tự link
   chỉ quyết định thứ tự trình bày, owner xác nhận vai trò bằng thumbnail.
   Có thể gợi ý các vai trò còn trống nhưng không suy luận bìa/lưng từ tên file.
5. MATCH dùng SHA-256 file gốc để tìm ảnh LOCAL READY đã upload.
   Hiện thumbnail và vai trò của ảnh đã khớp. Nếu hash trùng ở nhiều ảnh hoặc
   nhiều nguồn, owner chọn từng cặp một-một trong tập cùng hash.
6. Owner xác nhận một lần cho các dòng thành công đã chọn. Dòng lỗi thiếu
   quyền/mất nguồn/hash sai hiển thị riêng. Owner có thể bỏ dòng lỗi và
   xác nhận phần thành công, phần chưa chọn cần operation mới để xử lý sau.

Thumbnail dùng endpoint admin hiện có, không tải thêm preview từ Drive.
Dropdown phải hiển thị đúng vai trò/ảnh được chọn trong dữ liệu, kể cả lần
đầu tạo options động. Nếu chưa cho xác nhận, hiển thị lý do cụ thể (chưa
chọn ảnh/vai trò, trùng ảnh/vai trò, vai trò đã có hoặc quá 8 ảnh). Làm mới
giữ lựa chọn hiện tại và dùng digest mới khi thử xác nhận lại; retry do mất
response vẫn giữ request key nếu snapshot không đổi. Sau khi gắn ảnh vào
sách, thumbnail dùng đường dẫn ảnh của sách thay vì temporary media đã consume.
Nguồn/ghi chú nội bộ vẫn là field văn bản riêng.

## Xử lý và lưu dữ liệu

- Operation có mode IMPORT/MATCH, requestKey, owner, namespace, upload session,
  tập File ID, phiên bản đích và trạng thái. Item có ordinal, File ID, lease,
  attempts, lỗi, staging/generation/media, snapshot nguồn và kết quả ghép.
- Tạo bảng operation/items riêng bằng migration kế tiếp, dự kiến V31 nhưng
  kiểm lại số trước triển khai. image_job hiện cần media/generation nên
  không dùng một VERIFY job gắn tùy ý vào media để dò nguồn chưa biết ảnh đích.
- Tái sử dụng mẫu lease/retry/receipt, DriveSourceClient và LocalImageStore.
  Có một bộ xử lý tải Drive giới hạn concurrency, mặc định tuần tự.
  Tải mạng ngoài transaction, commit ngắn có kiểm lease.
- Mỗi nguồn tải và hash một lần trong lượt xử lý thành công. Client Drive giữ
  kiểm quyền, MIME, giới hạn byte và version trước/sau download. Encode giữ
  kiểm megapixel/ảnh động và recipe của pipeline PROCESS hiện có.
  Retry do lỗi mạng có thể tải lại.
- IMPORT khóa upload session, đặt chỗ cho các item sẽ tạo ảnh để tổng ảnh
  hiện có + reservation của operation không vượt 8. Tính cả upload đang
  chạy đồng thời và ảnh từ operation khác. Retry không chiếm thêm chỗ.
  Dùng temporary_media UPLOADING thuộc operation ngay khi nhận IMPORT để
  đếm chỗ bằng cùng logic của upload thủ công, giữ media ID khi retry.
  Lỗi retryable giữ chỗ. Terminal failure, bỏ chọn, cancel/expire mới trả chỗ.
- Sau download IMPORT, kiểm lại session/lease, gắn input vào temporary media
  và generation rồi enqueue PROCESS bằng cùng input staging đã có. Tái sử
  dụng giao dịch beginLocal và logic enqueue được tách dùng chung nếu cần.
  File được bàn giao cho job encode, không xóa trong finally của downloader.
- Encode READY mới đủ điều kiện chọn ảnh và xác nhận. Chỉ ghi binding VERIFIED
  trong transaction xác nhận, sau khi kiểm snapshot nguồn và đúng generation,
  input_sha256, recipe, File ID. Không cần một lượt tải VERIFY nữa sau import.
- Trước xác nhận IMPORT/MATCH, kiểm metadata version Drive còn khớp snapshot.
  Nguồn đổi hoặc mất quyền không được ghi binding mới từ snapshot cũ.
  Đây là kiểm tại thời điểm xác nhận, không bảo đảm file Drive bất biến về sau.
- Xác nhận IMPORT đưa các temporary media đã chọn vào bộ ảnh chờ lưu sách,
  cùng vai trò đã chọn. Chưa publish hoặc sửa sách tự động.
  Khi sửa sách đã lưu, ảnh nhập có trạng thái chờ gắn (`pendingLocal`),
  owner bấm Gắn ảnh vào sách từng ảnh qua commitReplacement hiện có;
  giữ kiểm version/quyền/admission/nguồn. Reload phục hồi session theo sách.
  Trước xác nhận, item chỉ được xem qua operation. Kiểm admission ở server
  để session view/finalize/consume/replacement không dùng media chưa được chọn,
  kể cả khi biết media ID. Sau xác nhận, mọi lần finalize/consume vẫn dùng
  transaction và publication gate hiện có.
- Khi lưu sách và consume session, đóng/cancel operation còn lại trong cùng
  transaction. Callback tải/confirm muộn bị từ chối, media bỏ lại được cleanup.
  Receipt đã xác nhận tồn tại sau khi temporary media chuyển sang book_media
  để retry xác nhận cùng payload vẫn trả kết quả cũ.
- MATCH kiểm hash và phiên bản generation/binding/sách, khóa sách một lần,
  tăng book version một lần cho transaction. Ghi audit mỗi binding.
  Giữ logic kiểm binding và kiểm quyền dùng chung với xác minh đơn ảnh.
- Xác nhận atomic trên tập dòng được chọn và chỉ một lần/receipt. Xác nhận
  lặp payload giống trả cùng receipt, payload khác trả 409. Binding cũ và
  dữ liệu đã đổi ở tab khác không bị ghi đè.
- Dòng bỏ chọn, operation hủy/hết hạn và download/encode thất bại được trả
  reservation, đánh dấu temporary media/staging cho cleanup theo ownership.
  Job mất lease không bàn giao file hoặc ghi binding. Dọn file theo lifecycle
  hiện có để tránh xóa input mà PROCESS còn dùng.
- Sweeper phải nhận tham chiếu lease/input của operation mới. Bàn giao input
  cho PROCESS đổi pointer/state atomic và kiểm active PROCESS trước xóa,
  kể cả sau restart giữa tải xong và commit.
- TTL tối đa 24 giờ và không vượt hạn upload session. Hết hạn trả 410.
  Theo dõi cả operation sau restart, không tạo operation mới âm thầm.
- Trước khi chốt schema cần kiểm backup/export hiện có bao phủ các bảng mới.
  Giữ V21–V30 nguyên bytes.

## API và frontend

- POST tạo operation, trả 202 ngay với operation ID. OWNER và LOCAL được
  kiểm ở backend. Retry cùng requestKey/payload trả cùng operation.
- GET trạng thái tổng hợp, kết quả từng item, các ảnh đề xuất và phiên bản
  cần cho xác nhận. Endpoint admin không public cache.
- POST xác nhận với requestKey, digest kết quả và tập item/cặp/role đã chọn.
  Giới hạn endpoint, payload và quyền cùng namespace/session phải kiểm server.
- Giữ contract xác minh đơn ảnh và API upload đang chạy, deploy backend trước
  frontend. IMPORT/MATCH cùng sách hoặc session, không ghép xuyên sách.
- Ghi operation ID theo owner và session/book ở frontend để reload tiếp tục.
  Xóa tham chiếu khi đổi phiên. GET khôi phục luôn kiểm quyền ở server.

## Giảm request và hiệu năng

- AdminHttp chia sẻ CSRF token và in-flight fetch theo auth epoch, chỉ trong
  bộ nhớ. Xóa khi login/logout hoặc invalidate. Response từ epoch cũ không
  được ghi cache mới. Kiểm thực tế masked token của Spring Security khi làm.
- Backend phân biệt lỗi CSRF thật bằng mã riêng với forbidden quyền truy cập.
  Chỉ refresh token và retry một lần nếu server đã từ chối trước mutation
  vì CSRF. Lỗi mạng không tự phát lại mutation.
- Một poller cho cả operation, nhịp 1 giây, 2 giây, sau đó 5 giây.
  Dừng khi terminal, rời form hoặc đổi phiên. Tab ẩn tạm ngừng, hiện lại lấy
  trạng thái một lần. GET cuối đủ cập nhật UI, bỏ GET source riêng từng ảnh.
- Khi IMPORT chạy PROCESS, poll tổng hợp bao gồm trạng thái encode các item,
  tránh mở thêm poller cho từng ảnh của operation.
- UI tái dùng thumbnail và media ID sau thành công. Không encode lại để ghép
  hoặc tải lại nguồn chỉ vì owner bấm xác nhận.
- Hiện tại 8 lượt VERIFY lần đầu cần 32 + tổng số poll từng ảnh, chưa tính
  upload, retry và ảnh preview. Nhánh lô dự kiến một POST tạo, P GET poll,
  một POST xác nhận và tối đa một GET CSRF chưa cache, tức 3 + P.
  Tạo upload session khi chưa có vẫn là request riêng, preview vẫn có request.
- Đo cả IMPORT và MATCH với cùng 8 ảnh. Ghi riêng browser requests, request
  metadata/download Drive, queue wait, CPU/RSS, thời gian toàn lô.
  Giảm request chưa phải kết quả đo latency, mỗi nguồn vẫn cần tải byte gốc.
- Dùng HTTP/polling và worker hiện có, không cần SSE/WebSocket trong phạm vi này.

## Khôi phục ảnh sau này

Vận hành Drive dùng một thư mục gốc chia sẻ Viewer cho service account.
Có thể đặt thư mục con theo mã sách. Nhập theo từng File ID, không cần quét
toàn thư mục khi thêm sách. Ảnh mới cần đặt trong cây đã chia sẻ và cho phép tải.
Folder có limited access hoặc file bên ngoài cây cần kiểm quyền riêng.
Hỗ trợ link thư mục làm đầu vào là phạm vi khác.
Tham chiếu [quyền kế thừa của Drive](https://developers.google.com/workspace/drive/api/guides/manage-sharing).

Database lưu File ID, SHA-256, source version/bytes/MIME, role, generation,
recipe và binding VERIFIED. Khi lưu sách phải giữ đủ liên kết từ temporary
media sang book_media. Backup DB phải giữ các metadata này.

Nếu derived bị mất, R5 dùng binding để tải lại đúng bytes từ Drive và dựng
lại với recipe đã ghim. Chỉ riêng link hoặc key service account không thay
thế được database backup và recipe/image worker tương ứng.

Nếu ảnh gốc bị xóa, đổi nội dung hoặc mất quyền thì báo lỗi riêng, giữ derived
đang tốt. Owner xử lý nguồn thủ công theo quyết định recovery đã duyệt.

## Nghiệm thu

- IMPORT 1/8 link lộn thứ tự, tên mặc định, thumbnail/role đúng, chỉ cần dán link.
- MATCH 8 link xáo thứ tự tự ghép đúng hash. Hash trùng được chọn một-một,
  File ID trùng báo rõ. Link folder và provider Cloudinary xử lý đúng contract.
- Thiếu quyền, nguồn mất/đổi, hash sai, quá dung lượng/megapixel/ảnh động có lỗi.
- Race reservation với upload khác, tab thay ảnh/xóa ảnh, session hết hạn,
  operation restart/retry/xác nhận lặp không mất hoặc nhân đôi binding/job/ảnh.
- Lỗi từng dòng vẫn cho xác nhận tập thành công rõ ràng. Cleanup không xóa
  input/derived mà job hợp lệ hoặc sách đang dùng.
- Auth epoch/CSRF hết hạn, hai mutation đồng thời, upload XHR và đăng nhập
  hiện có đạt test hồi quy. Publication gate và ảnh Cloudinary cũ vẫn đúng.
- Lưu sách từ IMPORT giữ binding VERIFIED. Drill fixture mất derived rồi
  rebuild từ source giả lập đúng recipe/hash. QA dùng Drive thật ở namespace thử.
- Backend integration test trên DB riêng, frontend tests liên quan và build
  Workers, đo request trước/sau. Deploy theo dev/main, smoke một sách nháp mới.
