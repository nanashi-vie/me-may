# Kiểm chứng nhập sách và tồn kho

Ngày 30/10/2026, checkpoint S025; chỉ local/test, chưa migrate hoặc deploy online.
Quyết định hiện hành ở [DATA](DATA.md#tồn-gộp-và-tương-thích-biến-thể--quyết-định06112026),
[DESIGN](DESIGN.md#nhập-giá-theo-kg-và-tồn-gộp--duyệt0611) và
[ARCHITECTURE](ARCHITECTURE.md#tồn-gộp-và-tương-thích-biến-thể--contract06112026).

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

## Nhập sách, tồn gộp và ghi chú nội bộ — 06/11/2026

Thiết kế user duyệt, thực thi tuần tự S041; chỉ local/test. Contract mới thay
phần tình trạng/biến thể của checkpoint30/10 phía trên; lịch sử được giữ làm
bằng chứng. Quy tắc hiện hành tại DATA/CATALOGUE/DESIGN/ARCHITECTURE;
[rollout riêng](BOOK_ENTRY_ROLLOUT.md) chưa chạy online.

- TDD backend:4test ghi chú/unit mới RED400→GREEN; create đơn giá bắt lỗi
  version trả về0/DB1, sửa gán field trước insert. Giữ BookWrite serialization
  legacy,3golden hash final/importV1/V2 không đổi; final retry không nhân sách.
- Tồn gộp: giữ UUID/tên/thứ tự; metadata giữ phân bổ, tăng/giảm/0 chính xác;
  tổng1999998 vẫn sửa được, null/float/mixed/over-limit bị từ chối; no-op,
  aggregate concurrency409 và audit rollback được kiểm.
- Lookup tên trùng qua mọi publication/availability, trim/case/exclude chính
  ID, literal wildcard, OWNER/STAFF/anonymous; cảnh báo không unique/chặn lưu.
- Frontend38file/192test PASS sau bỏ3test chọn biến thể cũ và thêm2test liên hệ
  theo sách. Có giá cơ sở chưa làm tròn, BigInt overflow, manual min/max,
  load/upload không tính lại, note trống publish, tồn lớn/conflict và stale lookup.
- Backend `bash code/backend/run-local.sh -B -ntp clean verify`:199run/0failure/
  0error/3live-provider skipped, gồm migration V13→V14 riêng1PASS. Bản cuối
  sau sửa copy xác nhận đã clean verify; review ghi ở DEV_LOG.
- NodeSSR/Workers builds và workerd proxy PASS. Sandbox lần đầu chặn socket/
  build; chạy lại ngoài sandbox đạt. Không cài dependency hoặc đổi framework.
- Migration V13→V14 đối chiếu toàn bộ BookCopy, listing, variants, media và
  sequence: cột mới null, dữ liệu cũ giữ nguyên; constraint0/vượt max bị từ chối.
- Dump me_may_test dạng custom, restore schema QA mới trong cùng DB: counts và
  full-row fingerprints book_copy/listing/book_variant/book_media/admin_user
  khớp5/5. Role không có CREATEDB nên không restore sang database mới; schema
  restore dùng chính role test và được dọn. Không nghiệm thu restore production.
- Playwright Chrome desktop1280×900 và public390×844 với Spring test runtime,
  PostgreSQL me_may_test và FakeMediaGateway; dữ liệu/ảnh hoàn toàn giả lập.
  Kiểm80000×450→36000..42000, manual min36500→37000..43000,
  max44100→45000; save/reload giữ giá, tăng/giảm tồn, note rỗng/có và warning đỏ.
- Browser đã tạo/publish mục trùng tên với note trống,2ảnh fake, tồn1 và version0;
  edit sách legacy tổng5→4→7, note riêng và hai giá thủ công được giữ khi reload.
- Public mobile không overflow hoặc hiện note/selector; liên hệ mở thẳng và
  enquiry không có note/tên biến thể; wishlist lookup vẫn giữ đúng sách.
- SSR smoke9đường HTML/API gồm detail/OG, home, list, lookup, related và
  admin-preview/wishlist noindex: không marker note/field nội bộ. Provider fake
  không thay chứng cứ media WebP/Lighthouse/thiết bị thật hoặc smoke production.
- Ảnh QA ignored trong output/playwright; không đưa note/credential thật vào log.
  Không chạy đồng thời các test backend vì dùng chung TEST_DB; hai lần overlap
  đầu phiên bị loại, mọi kết quả dùng bàn giao là các lần chạy tuần tự.
- Browser STAFF đọc được ghi chú nhưng toàn bộ field/save bị khóa; server
  mutation403 đã có test. Runtime QA/browser đã dừng, dữ liệu test được dọn.
