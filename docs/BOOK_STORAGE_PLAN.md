# Nơi lưu trữ — kế hoạch triển khai

Thực thi trực tiếp theo [thiết kế đã duyệt](BOOK_STORAGE_SPEC.md).

- [x] Backend: V20 tạo danh mục số thùng và FK nullable trên BookCopy. API
  GET/POST /api/v1/admin/books/storage-boxes dùng số nguyên dương, OWNER ghi.
- [x] BookEntryInput nhận storageBoxNumber với ngữ nghĩa thiếu/null riêng.
  BookCommandService lưu trong transaction, audit vị trí và chỉ mở rộng
  fingerprint nếu vị trí khác null để giữ retry cũ.
- [x] BookMapper/BookQueryService trả vị trí admin. BookFilter nhận
  storageBoxNumber, 0 lọc chưa phân thùng, số dương lọc đúng thùng trước paging.
- [x] BookApi/BookEditor: danh sách và tạo inline, tự chọn sau thành công,
  không đổi dữ liệu form nếu lỗi. BookList thêm cột và filter URL.
- [x] Kiểm tra validation, trùng, quyền, tạo/sửa/xóa vị trí, phân trang,
  hồi quy import/retry, chạy Maven và Vitest/build, ghi bằng chứng bàn giao.

- [ ] Smoke trên trình duyệt với môi trường chạy thật trước rollout.
