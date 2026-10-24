# M4 — wishlist và hỏi nhiều cuốn

> User duyệt toàn bộ plan trong chat ngày 24/10/2026. Thực hiện tuần tự bằng superpowers:executing-plans, TDD, review độc lập cuối nhánh và verification-before-completion.

**Goal:** Lưu sách trên thiết bị → chọn cuốn → xác minh giá/trạng thái → copy → mở Zalo.
**Architecture:** Angular signals/localStorage, public GET lookup qua Boot/JDBC, tái sử dụng projection/giá sale/đồng hồ server M3; không migration/dependency mới.
**Spec:** Phần quyết định và contract bên dưới là bản plan/spec M4 đã duyệt, bổ sung lựa chọn checkbox của người dùng.

## Quyết định và giới hạn

- Nhánh codex/m4-wishlist từ main a0a2642. Chưa merge/push/release M4 trong scope bàn giao local.
- Local storage memay.wishlist.v1 chứa mảng mã duy nhất theo thứ tự thêm; tối đa100. Chỉ browser sau render, không SSR. Mã nhận mọi giá trị canonical do BookCodeGenerator sinh, kể cả trên6 chữ số.
- Storage hỏng được báo; storage chặn/ghi lỗi dùng bộ nhớ và cảnh báo có thể mất khi tải lại. Đồng bộ storage event giữa tab cùng origin.
- Header badge đếm mọi mã; trái tim ở card chung/detail có aria-pressed. Route /quan-tam có SSR shell/noindex/no-store, không dữ liệu cá nhân SSR.
- Mỗi dòng: ảnh/tên/mã/giá mới/trạng thái/link/xóa/checkbox. Mặc định chưa chọn, chọn tất cả chỉ AVAILABLE. Selection chỉ sống trong trang.
- SOLD giữ thông tin public và cảnh báo, không chọn hỏi mua; mã bị ẩn/không tồn tại chỉ hiện mã và “Không còn hiển thị”, không giữ snapshot tên/ảnh/giá cũ.
- GET /api/v1/books/lookup?code=... lặp, 1–100 mã trước dedupe; sai/thiếu/quá giới hạn400. Response PublicBook[] PUBLISHED gồm SOLD, thứ tự input, mã không public bỏ qua không phân biệt lý do. Projection/giá sale dùng chung M3; no-store/server time/omit credentials.
- Refresh khi vào trang/retry/foreground/mã thay đổi, cancel request cũ. Prepare xác minh lại selection trước khi mở text; giá mới cập nhật, sold/hidden loại và giải thích; zero valid không copy.
- Text gồm mục đích, một dòng `Mã | Tên | Giá tham khảo | URL` cho mỗi cuốn, câu cuối nhờ tiệm xác nhận còn/giá. Native dialog, textarea manual fallback, nút Copy riêng sau tải; thiếu hotline vẫn copy.
- Foreground/sale expiry/xóa mã ở tab khác vô hiệu hóa text cũ và revalidate. Lỗi API xóa text cũ/khóa copy, giữ mã. Response cũ không khôi phục mã đã xóa.
- Không quantity/tổng đơn/order/giữ sách/login khách. Giữ detail SOLD tư vấn tương đương. Không sửa sách/ảnh dev.
- Zalo thiết bị thực, pilot M2 và Cloudflare/release giữ gate bằng chứng riêng; giả lập không thay thiết bị thật.

## Review focus

- Storage blocked/corrupt/clear/same-origin events và SSR không làm mất danh sách âm thầm hoặc lộ dữ liệu.
- Response cũ/đổi selection/xóa ở tab khác không làm copy cuốn đã bỏ.
- Sale expiry và giá/trạng thái mới không bị giá cũ trong dialog ghi đè.
- Nút trái tim/checkbox/copy hoạt động bằng bàn phím, focus/Escape và mobile gesture.
- Lookup không tạo lối lộ nháp/media/admin, mã lớn vẫn hoạt động.

## Task 1 — API lookup

**Files:** PublicCatalogueService/Controller, PublicCatalogueApiTest, PublicApi/public-api.spec.
**Interface:** lookup(List<String> codes) → List<Book>; PublicApi.lookup(codes: string[]) → Observable<PublicBook[]>.
- [ ] Viết RED anonymous visibility/order/dedupe/validation/large-code/sale/header tests.
- [ ] Thêm lookup parameterized dùng chung SELECT/FROM/mapper; giữ public restrictions.
- [ ] Thêm typed frontend transport và test params/credentials.
- [x] GREEN backend verify/frontend, commit/checkpoint (S014-C02).

## Task 2 — storage và trái tim

**Files:** features/wishlist/wishlist-store.ts/spec, wishlist-button.ts/spec; BookCard/BookDetail/PublicLayout.
**Interface:** codes/ready/warning signals, toggle/remove/has; button input bookCode/title.
- [ ] RED persist/reopen/corrupt/blocked/cap100/large-code/storage event/SSR initialization.
- [ ] Store/browser lifecycle + accessible shared button, badge/header.
- [ ] GREEN frontend suite, commit/checkpoint.

## Task 3 — danh sách và enquiry

**Files:** features/wishlist/wishlist-page.ts/html/scss/spec; app.routes/server, ContactDialog, tests.
**Interface:** /quan-tam; rows keyed code, memory-only selection; prepare uses lookup and native text dialog.
- [ ] RED select-all/SOLD/hidden/refresh/races/price-changes/network/expired-sale/cross-tab removal/copy fallback tests.
- [ ] Implement page and revalidation; reuse dialog with explicit text mode without changing single-book behavior.
- [ ] SSR shell/header noindex and navigation restore public SEO tests.
- [ ] GREEN frontend suite/backend regression/build, commit/checkpoint.

## Task 4 — browser, review và bàn giao

- [ ] Browser desktop/mobile360–390, keyboard/heart/reopen/selection/dialog/fallback/SSR/noindex reset; fixture chỉ test hoặc browser intercept.
- [ ] Fresh whole-branch review; một lượt sửa Important/Critical RED→GREEN; ledger rulings/minor.
- [ ] Full npm test, backend verify/JAR, Angular build, SSR checker. Giữ sách/ảnh dev.
- [ ] Gộp quyết định vào tài liệu chuẩn/bằng chứng; cập nhật chỉ mục/PROGRESS/DEV_LOG, xóa plan khi chuyển hết tiêu chí.
- [ ] Bàn giao local, ghi rõ gate Zalo thiết bị thật chưa có bằng chứng nếu chưa thử.
