# Kiểm chứng sao chép nội dung hỏi sách

## S044 — iPhone/Safari,06/11/2026

- User gửi ảnh memaybooks.com: Brave báo đã sao chép, Safari báo không sao chép
  tự động được. Bản sửa đang local/dev, chưa triển khai trên URL đang chụp.
- Nguyên nhân source: ContactDialog chờ verifyText/network trước writeText, mất
  user activation Safari. Áp dụng ClipboardItem promise-data, gọi write ngay click,
  resolve text/plain Blob sau xác minh; giữ giá/tình trạng mới, không copy stale.
- Dùng chung detail/wishlist. Khóa doublecopy khi chờ clipboard; không có API hoặc
  bị từ chối thì focus/select/setSelectionRange toàn nội dung, thử legacycopy và
  hướng dẫn nhấn giữ sao chép thủ công. Lỗi legacycopy không làm mất lựa chọn.
- User bỏ p/h2 ở detail: gỡ thẻ eyebrow/h2 rỗng và wrappersection không còn heading;
  giữ description và heading tên sách, không xóa dữ liệu hoặc thay format hỏi mua.
- RED3test trước sửa; thêm legacycopythrow RED rồi GREEN. Full frontend npm test
  tại code/frontend:221PASS/40files; SSR/Workers builds và proxy smoke PASS.
- Backend không đổi nên không chạy lại Maven. Không migration/dependency mới.
- Reviewer độc lập review_clipboard_mobile:0Critical/0Important/0Minor.
- WebKit27.2/mobile: SSR4012 + API8091 giả delay150ms; copy rồi Meta+V so sánh
  toàn bộ chuỗi trong detail và wishlist PASS, dùng Clipboard API thật không stub.
  Lookup503: text rỗng và báo chưa xác nhận, không copy giá cũ PASS.
- Browser và hai dịch vụ QA đã đóng. Fixture đầu collections trảobject gây lỗi
  iterator; sửa API giả thànharray rồi QA đạt, không thay app vì lỗi fixture.
- Chưa kiểm iPhone vật lý/Brave sau sửa, chưa deploy lên memaybooks.com hoặc mở/gửi
  tin Zalo. WebKitmobile là bằng chứng engine, không thay nghiệm thu máy thật.
- Tham chiếu [WebKit Async Clipboard](https://webkit.org/blog/10855/async-clipboard-api/)
  và [WebKit issue222262](https://bugs.webkit.org/show_bug.cgi?id=222262): write phải còn user gesture.
