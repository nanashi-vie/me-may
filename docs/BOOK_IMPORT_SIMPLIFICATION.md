# Rút gọn Excel và nhập giá khi thêm ảnh

Trạng thái: thiết kế ngắn chờ user duyệt, 06/11/2026. Thay contract import hiện
hành chỉ sau triển khai/kiểm chứng; nguồn nền ở [BOOK_IMPORT](BOOK_IMPORT.md).

## Mục tiêu và quyết định của user

- Giảm thời gian nhập metadata vì chủ vẫn thêm ảnh riêng cho từng sách.
- Excel chưa cần đơn giá/kg. Chủ nhập đơn giá ở bước thêm ảnh, tính hai đầu giá
  theo công thức form đã duyệt, làm tròn lên1.000đ và cho sửa tay.
- Cho phép thiếu hai giá khi import, giữ sáchẨn; phải có giá hợp lệ khi xuất bản.
- Bỏ các cột không bắt buộc khỏi mẫu mới, riêng Nhà xuất bản/Tác giả vẫn giữ.
- Giữ hướng tương thích an toàn với file và receipt import cũ.

## Hướng được chọn và phương án khác

- Mẫu tối thiểu: theo yêu cầu bỏ cột optional, giữ hai ngoại lệ nêu trên; giảm
  từ16 xuống6cột. Không cần chủ phân biệt cột nào nên điền trong mẫu dài.
- Giữ16cột và nới validation cũng hỗ trợ giá trống, nhưng vẫn giữ các cột user
  đã yêu cầu loại bỏ. Chỉ giữ khả năng đọc file cũ cho tương thích.

## Mẫu mới đề xuất

| Header | Nội dung | Bắt buộc giá trị |
|---|---|---|
| ten_sach | Tên sách | Có |
| nha_xuat_ban | Nhà xuất bản | Không |
| tac_gia | Tác giả | Không |
| the_loai | Thể loại | Có |
| kieu_bia | Paperback/Hardcover | Chỉ Picture Book |
| trong_luong_g | Trọng lượng nguyên gram | Có |

- Bỏ ISBN, hai giá, hai cột tình trạng, độ tuổi, mô tả sách, trình độ đọc,
  link video và bộ sưu tập khỏi mẫu. Những field hiện có trên form vẫn sửa được.
- Mỗi dòng vẫn tạo một sáchẨn, mặc định Tiếng Anh/tồn1. Không tự gộp theo tên.
- Tạo mẫu mới riêng, giữ workbook gốc user cung cấp; dropdown thể loại đủ9mục.

## Tương thích và điều kiện nghiệm thu

- Format mới có nhận diện/digest riêng; giữ nguyên canonical/fingerprint và
  receipt của V1/V2, retry không sinh thêm sách hoặc ghi đè sách đã sửa.
- File cũ có giá giữ nguyên giá; format mới không dùng giá0 hoặc giá giả.
- Preview/list/editor xử lý rõ sách chưa có giá; sách thiếu giá không lộ public,
  không được xuất bản. Không tự tính lại giá khi load hoặc upload ảnh.
- Khi chủ nhập đơn giá/kg, form tính từ trọng lượng có sẵn; sửa hai giá được.
- Chỉ nới thiếu giá cho import tạo sáchẨn; giữ kiểm tra các giá trị đã nhập,
  các field bắt buộc khác, quyền/CSRF/atomic commit và giới hạn file hiện hành.
- Kiểm parser CSV/XLSX6cột, conditional binding, null giá tới edit/publish;
  old-format receipts/retry, giá cũ và privacy. Không đổi luồng upload ảnh.

## Bước tiếp theo

User duyệt thiết kế ngắn này, sau đó lập kế hoạch triển khai tuần tự trên dev.
