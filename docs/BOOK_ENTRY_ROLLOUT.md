# Rollout nhập sách, tồn gộp và ghi chú nội bộ

Contract06/11/2026 ở [DATA](DATA.md), [CATALOGUE](CATALOGUE.md) và
[ARCHITECTURE](ARCHITECTURE.md). Bằng chứng local ở
[BOOK_ENTRY_VERIFICATION](BOOK_ENTRY_VERIFICATION.md#nhập-sách-tồn-gộp-và-ghi-chú-nội-bộ--06112026).
Đây là hướng dẫn vận hành, chưa là biên bản đã chạy online.

## Trước rollout

1. User merge dev→main và chọn cùng candidate frontend/backend. Đối chiếu
   revision/image digest, schema/profile/DB đang phục vụ; không suy từ log local.
2. Backup DB/media refs và kiểm khả năng restore. Ghi counts/hash các bảng
   book_copy/listing/book_variant/book_media, mã/slug/ID/publishedAt/sequence,
   tổng tồn từng sách; giữ snapshot riêng, không chép note/secret vào log công khai.
3. Kiểm đủ migration đang thiếu tới V14, không sửa checksum migration đã chạy.
   V14 chỉ thêm unit_price_per_kg_vnd nullable với CHECK1..999999999999.
   Không gộp/xóa biến thể hoặc tự điền U/giá; condition_note không copy/xóa.
4. Tránh ghi trong cửa sổ đổi backend/frontend. Chưa cho nhập ghi chú riêng mới
   trước khi boundary public và cache được kiểm chứng.

## Backend trước, frontend sau

1. Backend mới chấp nhận cả legacy variants/conditionNote và input mới
   stock/internalNote/unitPricePerKgVnd. Thiếu field mới khi update giữ dữ liệu,
   null explicit xóa optional; stock=null hoặc mixed stock+variants bị từ chối.
2. Smoke anonymous list/detail/home/related/lookup và admin preview: grade/note
   null, variants rỗng; không chứa marker ghi chú, đơn giá hoặc tên nhóm tồn.
   Admin OWNER/STAFF vẫn xem note; STAFF không sửa, anonymous không đọc admin.
3. Purge cache public/SSR, kiểm version/deploy key và nhiều POP khi có thể.
   Cache hiện hành có TTL30s và purge eventual; chờ hết cửa sổ stale kể cả fill
   đang dở rồi kiểm lại. Không thể thu hồi HTML đã gửi hoặc nội dung công khai cũ.
4. Frontend mới: form không có hai field tình trạng/biến thể; note optional,
   tồn gộp đúng tổng cũ, mở sách không đổi giá. Đổi U/W→giá mới, manual override,
   tên trùng vẫn lưu/publish; sửa ảnh/metadata không tự tính giá.
5. Kiểm create/final retry, media, phiên/version409/audit, import V1/V2/receipt
   và note rỗng/có, ẩn/hết hàng, enquiry/wishlist không chọn biến thể.
6. Tab còn JavaScript cũ cần reload sau rollout frontend để bỏ guard chọn
   biến thể. Không đưa lại tên nhóm tồn hoặc note public để hỗ trợ tab cũ.
7. Đối chiếu lại snapshot/counts/stock/ID/slug/media/sequence và giá cũ chưa sửa.
   Chỉ mở ghi sau smoke; public không nhận số tồn nội bộ hoặc dữ liệu sách ẩn.

## Rollback giữ privacy

- Giữ V14 nullable khi rollback frontend; không drop cột hoặc xóa dòng tồn/note.
- Backend rollback phải vẫn redact condition_note/grade/nhóm tồn public.
  Không đưa backend legacy đọc note ra public trở lại sau khi đã nhập note riêng.
- Nếu không có revision rollback giữ boundary, tạm ngừng public qua cấu hình
  vận hành được duyệt cho tới khi có bản an toàn; không coi downgrade legacy
  thông thường là rollback chấp nhận được. Restore DB cần đối chiếu ghi phát sinh.
- Local đã có migration/schema restore; chưa drill rollback app/schema/data
  online, retention/offhost backup hoặc nghiệm thu hosting. Giữ các gate
  [PROGRESS](PROGRESS.md), không đánh dấu production hoàn tất từ test local.
