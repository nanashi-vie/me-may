# Đơn giản hóa nhập sách và tồn gộp

Ngày 06/11/2026, session S041 (trao đổi từ05/11). Trạng thái: **user đã duyệt06/11/2026**.
Đây là phạm vi mới user yêu cầu sau khi khép MVP; chưa là contract đã triển khai.
Sau khi duyệt, tài liệu này thay quyết định liên quan tình trạng/biến thể/nhập giá
trong MASTER_PLAN, DATA, CATALOGUE, DESIGN, ARCHITECTURE và BOOK_IMPORT.
Các phần khác và gate release trong PROGRESS giữ nguyên.

## 1. Mục tiêu và giới hạn

- Tiệm xác nhận bản sách, tình trạng và giá chốt qua tin nhắn.
- Khách xem một mục sách với khoảng giá tham khảo; không chọn biến thể.
- Chủ nhập một số tồn gộp, tự tăng tồn ở mục đã có khi có sách trùng.
- Nhập đơn giá/kg và trọng lượng để tính giá; vẫn được sửa tay hai đầu giá.
- Bỏ hai field tình trạng, giữ thông tin hữu ích thành ghi chú nội bộ optional.
- Cảnh báo tên sách trùng để tránh nhập lặp, vẫn cho lưu và xuất bản.
- Giữ Angular/Spring JDBC/PostgreSQL, RBAC, version/audit, mã/slug và ảnh hiện có.
- Không xây order/checkout/thanh toán, tự gộp theo tên/ISBN, tồn từng bản,
  giá/ảnh theo tình trạng hoặc đồng bộ bán hàng qua tin nhắn.

## 2. Các hướng đã cân nhắc

| Hướng | Đánh đổi | Kết luận |
|---|---|---|
| Giữ giao diện biến thể | Giữ phân nhóm tồn nhưng không hợp cách tiệm đang bán; vẫn thiếu giá/ảnh riêng cho ecommerce | Không chọn |
| Giao diện tồn gộp, giữ cấu trúc cũ bên trong | Đơn giản thao tác, giữ định danh/dữ liệu cũ; cần lớp chuyển đổi tổng tồn | **User chọn** |
| Xóa ngay cấu trúc biến thể | Schema gọn hơn nhưng tăng rủi ro migration/rollback và mất phân nhóm cũ | Không chọn |

Giữ cấu trúc cũ không phải cam kết đã sẵn sàng ecommerce. Khi có nhu cầu bán theo
bản/tình trạng sẽ thiết kế riêng; tổng tồn mới không tự khôi phục phân nhóm thực tế.

## 3. Những gì user đã chốt

- Bỏ “Đánh giá tình trạng” và “Mô tả tình trạng/lỗi” khỏi form nhập/sửa sách.
- Bỏ khối “Tình trạng thực tế” ở trang chi tiết public.
- “Ghi chú nội bộ” **optional**, chuyển mô tả tình trạng cũ sang đây.
- Bỏ giao diện biến thể; tồn sách trùng do chủ tự tăng, không tự gộp.
- Giá từ dựa đơn giá/kg × gram ÷ 1.000; Giá đến tăng 15%.
- Hai giá làm tròn lên bội số 1.000đ; số đã chẵn nghìn giữ nguyên.
- Hai giá tự tính nhưng vẫn sửa được.
- Tên trùng dùng kiểu cảnh báo user gửi: viền/nhãn đỏ, icon, helper bên dưới;
  cảnh báo không chặn lưu hoặc xuất bản.
- Chọn hướng tương thích an toàn, giữ cấu trúc biến thể bên trong.

Các quy tắc chi tiết ở mục4–8 do agent đề xuất, được user duyệt cùng toàn bộ
thiết kế06/11/2026. Không coi là bằng chứng code đã được triển khai.

## 4. Ghi chú nội bộ và loại bỏ tình trạng public

- Một textarea “Ghi chú nội bộ (không bắt buộc)”, plain text tối đa 4.000 ký tự.
- Chuỗi chỉ có khoảng trắng lưu null. Để trống vẫn tạo/lưu/publish được.
- OWNER sửa; OWNER/STAFF đọc theo quyền quản trị hiện hành. Không mở thêm quyền.
- Tận dụng cột condition_note đang có, ánh xạ thành internalNote ở DTO quản trị;
  đây là chuyển ý nghĩa và boundary truy cập, không copy/xóa nội dung cũ.
- Giữ condition_grade legacy trong DB, không còn field nhập/logic nghiệp vụ mới.
  Lưu qua form mới không tự xóa giá trị grade cũ.
- Không đưa internalNote hoặc nội dung condition_note vào DTO public, preview
  mô phỏng public, SSR/transfer-state, metadata/JSON-LD, wishlist, enquiry hoặc
  nội dung copy/liên hệ. Grade cũng không còn hiển thị public.
- Nếu cần giữ key conditionNote/conditionGrade cho client public cũ, chỉ trả null;
  không trả nội dung thật rồi chỉ ẩn HTML. Admin audit vẫn được bảo vệ như hiện tại.
- Backend bỏ yêu cầu condition_note khi create/publish/update sách PUBLISHED.
- Giữ đối chiếu ảnh thật trước xuất bản; sửa lời xác nhận cho phù hợp bộ ảnh chung
  của mục sách, không hứa ảnh đại diện chính xác mọi bản vật lý trong tồn gộp.
- Giữ ghi chú giá tham khảo và việc tiệm xác nhận tình trạng/bản cụ thể qua tin nhắn.

## 5. Đơn giá/kg và tính giá

### Dữ liệu và phép tính

- Thêm unitPricePerKgVnd nullable vào BookCopy/DTO quản trị; số nguyên VND/kg,
  1..999999999999 khi có giá trị. Không hiển thị public.
- Đề xuất **optional** để sách cũ và import chưa có đơn giá vẫn sửa được bằng giá
  đã lưu; sách mới có thể nhập đơn giá để tính hoặc nhập trực tiếp đủ hai giá.
- Trọng lượng gram và cặp giá cuối cùng vẫn theo validation/publish hiện hành.
- Gọi R(x) = ceil(x / 1.000) × 1.000; dùng tính toán nguyên chính xác để tránh
  sai số dấu phẩy động, không nhân Number vượt miền an toàn.
- Khi đơn giá U và trọng lượng W hợp lệ:
  - Cơ sở chưa làm tròn B = U × W / 1.000.
  - Giá từ = R(B).
  - Giá đến = R(B × 115 / 100), tính từ B chưa làm tròn.
- Ví dụ U=80.000, W=450: B=36.000; khoảng 36.000–42.000đ.
- Ví dụ U=81.000, W=450: B=36.450; khoảng 37.000–42.000đ.
  Ví dụ này phân biệt rõ với lấy giá từ đã làm tròn để nhân 15%.
- Kết quả vượt giới hạn cặp giá hiện hành phải báo lỗi, không clamp/tràn số/lưu sai.

### Tự tính và sửa tay

- Chỉ thay đổi đơn giá hoặc trọng lượng do người dùng mới tính lại cả hai giá.
  Giá đang sửa tay sẽ được thay bằng kết quả mới; helper nói rõ hành vi này.
- Đơn giá/trọng lượng trống hoặc không hợp lệ: không ghi đè hai giá bằng 0/NaN;
  giữ giá đang có, hiển thị lỗi input nếu có giá trị sai.
- Sửa tay Giá từ: hoàn tất nhập thì làm tròn lên nghìn, tính Giá đến bằng 115%
  của Giá từ vừa sửa và làm tròn lên nghìn. Không tính lại đơn giá.
- Sửa tay Giá đến: hoàn tất nhập thì làm tròn lên nghìn; giữ nguyên Giá từ.
- Có thể xử lý lúc blur để không nhảy giá/caret khi đang gõ. Không ép giá cũ
  phải tròn nghìn chỉ vì mở hoặc lưu một trường khác.
- Mở form sửa/nhận response upload/refresh version không kích hoạt tính lại.
  Chỉ thay ghi chú/tồn/ảnh cũng không tự đổi giá.
- Khi lưu, server nhận giá cuối cùng đã nhập; không tự tính lại từ đơn giá vì
  sẽ ghi đè ngoại lệ chủ đã sửa. Kiểm số nguyên, cặp giá và min≤max như hiện tại.
- Không cần field chế độ tự động/thủ công hoặc nút khóa; không thêm màn cấu hình.

## 6. Tồn gộp và dữ liệu biến thể cũ

- Form chỉ có ô “Tồn kho”; tạo mới mặc định 1, số nguyên không âm.
- Bỏ thêm biến thể, tên dòng, bộ chọn public và yêu cầu chọn trước khi liên hệ.
  Nội dung liên hệ dùng mã/tên/URL sách, không còn ID/tên biến thể.
- Tổng ban đầu là tổng stock các dòng cũ; không đổi ID sách, mã MM, slug, ảnh,
  publishedAt hoặc số tồn chỉ vì deploy/mở/sửa metadata.
- Backend nhận stock tổng qua contract quản trị mới, thực hiện ánh xạ sang
  book_variant trong cùng transaction/version/audit của aggregate.
- Giữ các UUID/tên legacy, không delete/recreate tập dòng. Khi tổng không đổi,
  giữ phân bổ cũ; khi đổi tổng, cập nhật xác định sao cho tổng dòng bằng số chủ
  nhập và không dòng âm/vượt constraint. Phân bổ sau điều chỉnh không còn đại
  diện tình trạng thực tế; tuyệt đối không đưa lại bộ chọn cũ ra public.
- Tạo mới dùng một dòng không tên. Builder chọn thuật toán phân bổ tương thích
  constraint hiện hành, có test cho giảm/tăng/0 và tổng lớn hơn giới hạn một dòng.
  Không áp trần 999999 cho tổng nếu làm mất hoặc chặn lưu metadata của sách cũ
  có tổng lớn hơn; phải ghi rõ giới hạn tổng thực tế trong plan/API/UI.
- Từ chối payload mới vừa gửi stock tổng vừa gửi tập variants để tránh hai nguồn
  ghi tồn trong một request. Contract legacy còn nhận variants theo quy tắc cũ
  chỉ khi không có stock; không tự coi thiếu stock là 0.
- Availability vẫn dẫn xuất tổng >0/0; publication độc lập. Giữ xung đột409,
  retry/idempotency và audit. Không trừ/giữ kho khi quan tâm hoặc liên hệ.

## 7. Cảnh báo tên trùng

- Chỉ cảnh báo trên form tạo/sửa; không uniqueness constraint hoặc lỗi save.
- So sánh chính xác sau trim đầu/cuối, không phân biệt hoa thường; vẫn phân
  biệt dấu tiếng Việt và khoảng trắng bên trong. Không so gần đúng hoặc theo ISBN.
- Kiểm mọi mục đã lưu, gồm ẩn/hết hàng; khi sửa loại chính ID hiện tại.
- Lookup quản trị có auth, truy vấn tham số hóa; không dùng chỉ trang đầu của
  danh sách hoặc API public vì sẽ bỏ sót sách ẩn.
- Chạy khi tên đã nhập có thay đổi, debounce; bỏ kết quả trả về cũ. Tên trống
  không lookup. Hỏng mạng không được báo “không trùng” hoặc chặn lưu.
- Thông báo: “Tên sách đã tồn tại. Vui lòng kiểm tra sách đã có trước khi thêm mới.”
- Tái dùng kiểu field hiện tại theo ảnh user; warning là trạng thái riêng,
  không set validation error làm form invalid, không disable nút lưu/publish.
- Helper nối với field bằng aria-describedby, thông báo hỗ trợ screen reader;
  lỗi bắt buộc/độ dài thật được ưu tiên hơn warning khi cùng xuất hiện.
- Cảnh báo chỉ hỗ trợ thao tác, không bảo đảm chống trùng khi hai người nhập
  đồng thời. Không tự tăng tồn hoặc chuyển sang sách khác.

## 8. Tương thích import, API và rollout

- Không buộc chủ thay workbook hiện có hoặc thiết kế format mới trong đợt này.
  Giữ nhận V1/V2, header, digest/receipt/retry và nguyên tắc một dòng một mục.
- Cột tinh_trang legacy vẫn nhận mã hợp lệ khi có; cho phép ô rỗng. Cột
  mo_ta_tinh_trang có thể rỗng; khi có, đi vào ghi chú nội bộ, không public.
  Các header legacy vẫn phải có theo format; nhãn trợ giúp nói rõ ý nghĩa mới.
- File không có đơn giá/kg: lưu null, giữ giá từ/đến trong file; không tự suy
  đơn giá từ một giá đã làm tròn. Không tự sửa giá import hoặc gộp dòng trùng.
- V1 có nhiều biến thể vẫn giữ dữ liệu nhập được, UI quản trị mới đọc tổng tồn;
  không quay lại hiển thị phân nhóm cho khách. Form cảnh báo trùng không biến
  thành bước bắt buộc kiểm trùng cả lô import trong phạm vi này.
- Thêm migration mới cho đơn giá; không sửa migration đã phát hành hoặc drop
  cột/bảng legacy. Các field mới tham gia audit và fingerprint/retry đúng contract.
- Payload legacy và dữ liệu thiếu đơn giá không được xóa giá/grade/ghi chú cũ
  do mặc định null. Quy định alias/missing-field trong plan trước khi code.
- Rollout backend tương thích trước, frontend sau; đối chiếu stock/counts/ID và
  nội dung ghi chú. Dừng ghi trong chuyển đổi nếu cần theo DEPLOYMENT.
- Purge cache public/SSR/preview có dữ liệu tình trạng cũ khi đổi boundary.
  Không thể thu hồi nội dung đã công khai trước đây; rollback backend cũ có thể
  tái lộ ghi chú nên phải có phương án rollback vẫn giữ boundary nội bộ.
- Không tự migrate/deploy dữ liệu thật; user merge main/deploy theo workflow.

## 9. Kiểm chứng bắt buộc và bàn giao

- Unit: công thức, làm tròn, cơ sở chưa làm tròn, sửa từng giá, mở lại không đổi,
  input trống/sai/biên overflow; ghi chú rỗng không chặn xuất bản.
- Backend tích hợp: stock cũ nhiều dòng không mất ID/tổng, đổi tổng đúng, version
  conflict/audit rollback/retry; sách không có đơn giá vẫn lưu được.
- Kiểm không lộ ghi chú/grade qua mọi public DTO/preview, SSR, SEO/JSON-LD,
  wishlist và enquiry; kiểm OWNER/STAFF/unauthenticated như quyền hiện hành.
- Lookup tên: hoa/thường/trim, cùng ID, ẩn/hết, có dấu, debounce/out-of-order/
  lỗi mạng; có cảnh báo vẫn tạo/publish thành công nếu đủ điều kiện khác.
- Import V1/V2 ghi chú rỗng/có, legacy variants, receipt retry không nhân sách.
- Browser QA form theo style hiện tại; detail/contact hoạt động không chọn
  biến thể. Chạy test/build và SSR/Workers/proxy phù hợp phần bị tác động.
- Gộp contract vào docs chuẩn, bằng chứng VERIFICATION/DEV_LOG, cập nhật PROGRESS
  và chỉ mục; xóa spec/plan khi hoàn tất chuyển đủ tiêu chí theo AGENTS.

## 10. Những gì còn giao cho bước lập kế hoạch

- Tên/path endpoint lookup; DTO alias legacy và cách nhận biết missing/null.
- Thuật toán phân bổ stock gộp, giới hạn tổng, truy vấn/index cần thiết.
- File và thứ tự sửa, migration number sau kiểm Git/môi trường thực tế.
- Chi tiết layout giữ style form hiện tại, không thêm dependency/framework.
- Bộ test, dữ liệu QA cách ly và rollout/rollback cụ thể.

User đã duyệt toàn bộ thiết kế06/11/2026. Kế hoạch triển khai tại
[BOOK_ENTRY_SIMPLIFICATION_PLAN](BOOK_ENTRY_SIMPLIFICATION_PLAN.md); chưa sửa code.
