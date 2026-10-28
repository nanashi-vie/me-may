# M5 Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giữ trọn ảnh sách, giảm thời gian tải ảnh công khai và chặn layout shift trên detail/wishlist mobile.

**Architecture:** Khung ảnh dùng tỉ lệ hiển thị ổn định và `object-fit: contain`; backend giữ ảnh authenticated, cấp biến thể nhỏ đã eager-generate cho public, giữ preview cũ làm fallback cho ảnh chưa backfill. Wishlist dành chỗ cho nội dung thiết bị khi hydrate.

**Tech Stack:** Angular 21, Spring Boot 4, Cloudinary authenticated/eager, Vitest/JUnit.

**Spec:** Thiết kế ngắn được user duyệt trong chat 28/10/2026: giữ trọn ảnh trong khung ổn định, giảm dung lượng media public, ổn định wishlist; không ép camera 4:3.

## Global Constraints

- Không cắt nội dung ảnh, không đổi ảnh nguồn, ID media hoặc schema DB.
- Giữ `no-store`, ảnh authenticated qua API; không lộ signed Cloudinary URL.
- Không sửa `code/frontend/src/index.html` đang dirty của user.
- Gate online chỉ PASS sau deploy và Lighthouse 3 lần/route đạt LCP≤2,5s, CLS≤0,1.

## Review Focus

- Ảnh ngang/dọc hiển thị nguyên vẹn và khung không đổi khi tải.
- Ảnh cũ chưa có biến thể mới vẫn xem được qua fallback.
- Ảnh ẩn/nháp không lộ qua đường public.
- Wishlist rỗng/nhiều sách không kéo footer trong vùng nhìn khi hydrate.
- Upload mới tạo biến thể public đúng transform và không cho URL ký lộ ra client.

---

### Task 1: Stable frontend layout

**Files:** `code/frontend/src/app/features/catalogue/book-detail.html`, `.scss`, `code/frontend/src/app/features/wishlist/wishlist-page.scss`, tests tương ứng.

- [x] RED: Test DOM khung ảnh đầu có `object-fit: contain`/kích thước ổn định và wishlist host dành chiều cao viewport; chạy test thấy fail.
- [x] GREEN: Sửa CSS/template tối thiểu; full frontend suite 95/95 PASS.
- [ ] Browser QA local: detail ảnh bìa và wishlist 1 sách đã xem ở mobile 390px; còn ảnh ngang/wishlist nhiều sách và đo lại online.

### Task 2: Public media variant

**Files:** `code/backend/src/main/java/vn/memay/media/CloudinaryMediaGateway.java`, `MediaGateway.java`, `PublicCatalogueController.java`, tests tương ứng.

- [x] RED: Test gateway fail vì thiếu biến thể 640px và phương thức public; API no-store đã có integration test.
- [x] GREEN: Variant 640px, fallback chỉ trên HTTP 404, admin preview giữ 1280px; backend suite 93/93 gồm 2 live test skipped.
- [x] Backfill 63 ID ACTIVE từ dump Neon mới bằng Cloudinary explicit; checkpoint private 63/63, không thay asset gốc.

### Task 3: Verify/release handoff

- [x] Build frontend Workers/backend, browser QA local bìa và wishlist 1 sách.
- [x] Cập nhật VERIFICATION/PROGRESS/DEV_LOG, ghi rõ online Lighthouse còn chờ user deploy/đo lại.
- [x] Review diff, commit/push code và docs lên `dev` tại 60c0404; không push `main` hoặc deploy.
