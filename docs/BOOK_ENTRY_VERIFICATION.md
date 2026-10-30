# Kiểm chứng nhập sách, tồn kho và biến thể

Ngày 30/10/2026, checkpoint S025; chỉ local/test, chưa migrate hoặc deploy online.
Quyết định hiện hành ở [DATA](DATA.md#tồn-kho-và-biến-thể--quyết-định-30102026),
[DESIGN](DESIGN.md#tối-ưu-nhập-sách-và-biến-thể-duyệt3010) và
[ARCHITECTURE](ARCHITECTURE.md#tồn-theo-biến-thể--contract-30102026).

## Tự động

| Kiểm tra | Kết quả |
|---|---|
| Backend `bash code/backend/run-local.sh -B -ntp clean verify`, cwd root | 114 run, 0 failure/error, 3 live-provider skipped |
| Frontend `npm test`, cwd code/frontend | 124/124 PASS, 30 files, sau sửa reviewer |
| `npm run build` / `npm run build:workers`, cwd code/frontend | PASS, hai output NodeSSR/Workers riêng |
| `npm run check:workers:proxy`, cwd code/frontend | PASS POST/query/cookie/CSRF/multipart/Set-Cookie/time/no-store/backend-down |
| `node scripts/check-ssr.mjs http://127.0.0.1:4005`, cwd code/frontend | PASS HTML/OG/404, admin/wishlist privacy, media JPEG/WebP320/640/MIME/magic/no-store |

- Migration V9→V10 chạy schema test riêng: AVAILABLE→1/SOLD→0; giữ mã/ID/slug/ảnh,
  giá/publishedAt/grade/sequence; CHECK tồn và tên trùng đạt. Không chạy migration dev/online.
- API kiểm tồn2+1→0+1→0+0, no-op/version/audit, row thiếu/trùng/foreignID,
  tên trống/trùng case, tồn null/âm/phân số/chuỗi/overflow, OWNER/STAFF/CSRF.
- Final retry giữ cùng ID sách/biến thể/tổng tồn; payload đổi tồn409. Hai mutation cùng
  version chỉ một thắng. Lookup/admin filter/Flash Sale đồng bộ khi tổng về0.
- Hai grade mới và ba mã legacy roundtrip; legacy không bị tự đổi ý nghĩa.

## Browser thực tế

- Playwright CLI trên API8084/SSR4005, DB mới `me_may_entry_qa`, namespace `memay/test`.
  Tài khoản và hai PNG640×800 là giả lập, không dùng sách/khách bán thật.
- OWNER tạo một sách2biến thể2+1 với2ảnh: trước final không có sách; abort response sau
  commit rồi retry chỉ có1sách/2variantID/tổng3/2ảnh. Không upload lại khi thêm biến thể.
- Mở editor: dropdown ngay lập tức FRONT/BACK đúng, không có nút lên/xuống hoặc kéo card;
  preview hiện tổng3 và từng dòng. Giữ chọn file/thay/gỡ/retry ảnh theo quyền.
- Public chọn tình trạng mới cho liên hệ, text kèm tên và khoảng giá chung. Sửa tồn0+1
  khi dialog đang mở: copy kiểm lại, không copy biến thể cũ, textarea rỗng, yêu cầu chọn lại.
- Hai tab sửa tồn: bản mới0+0→SOLD; bản cũ nhập5 nhận409, vẫn giữ5, server tổng0/media2.
- Mobile390×844 không tràn ngang; radio chọn bằng Space, biến thể hết riêng disabled.
  Screenshot `output/playwright/book-entry-mobile.png` đã xem trực tiếp, giữ ignored.
- Wishlist theo mã sách vẫn tồn tại sau điều hướng; refresh tổng0 hiển thị hết hàng,
  checkbox hỏi mua disabled, không tự gán biến thể. Không đổi schema localStorage.
- Tạo sách QA thứ hai có một biến thể tên riêng/tồn1; xóa toàn bộ tên rồi nhập tên mới,
  lưu giữ đúng một biến thể/tồn1. Gõ giá21000→21.000, nối chữ số, Backspace/chèn giữa chuỗi
  giữ đúng số; 21.50 invalid; API lưu21000. Ngôn ngữ mới “Tiếng Anh”, sửa được.
- STAFF mở sách với tồn/add disabled, không nút lưu; gọi thẳng PUT trả403.

## Review, cleanup và giới hạn

- Reviewer độc lập:0Critical/1Important/0Minor, không loại hành vi nào khỏi review.
  Lỗi ô tên biến thể duy nhất mất khi xóa chữ đã có RED→GREEN, suite124/124 và browser đạt.
- QA phát hiện thêm dropdown BACK hiển thị FRONT và fallback text khi selection mất;
  cả hai có regression RED→GREEN. Không ghi kết quả dự kiến thành bằng chứng.
- Đã destroy4asset QA qua provider, xóa tham chiếu media tạm/active; scratch còn2sách
  đã ARCHIVED/3biến thể, book_media0/temporary_media0. Dừng API/SSR và browser QA.
- Không sửa catalogue/DB/media bán thật; không drop scratch. Flash Sale được kiểm bằng API
  integration, không lặp toàn bộ màn hình cấu hình chiến dịch trong browser phiên này.
- M5 online performance/recovery/vận hành vẫn tạm gác; unit/local không thay nghiệm thu
  production. Rollout V10 cần backup, restore scratch và dừng ghi theo [DEPLOYMENT](DEPLOYMENT.md).
