# Tiến độ và bàn giao

Cập nhật 23/11/2026 · Asia/Ho_Chi_Minh · branch bàn giao `dev`.

## Trạng thái hiện tại

- `THEME-SWITCH-CSS-01` (23/11, chưa commit): gỡ Rive (runtime/WASM/.riv), thay switch sáng/tối bằng CSS/SVG thuần theo mẫu Uiverse owner chọn. [Bằng chứng](verification/THEME_VERIFICATION.md#thay-rive-bằng-switch-css--2311)
- Đã hoàn tất `DETAIL-MOBILE-THUMBS-01` trên `dev` cho `/sach/:slug`: sửa lỗi CSS Grid `1fr` thiếu `min-width: 0` khiến hàng thumbnail tràn chiều ngang màn hình mobile; đổi kích thước thumbnail mobile sang `54×72px` (`scroll-snap`, căn giữa tương thích mọi iOS Safari) và khóa `overflow-x: clip` trên `html`.
- Đã hoàn tất `DETAIL-ZOOM-GALLERY-05` trên `dev` (`ffb7c5c`) cho `/sach/:slug`: gỡ nhãn pill `"Click để xem"`, thay bằng native `title="Click để xem"` và bỏ icon `.zoom-badge`.
- Đã hoàn tất `PUBLIC-MEDIA-FRAME-01` trên `dev` (`02f3135`): đồng bộ khung ảnh sách public (`/sach/:slug`, `app-book-card`, `/quan-tam`) sang `3:4` `object-fit: cover` không đệm thừa.
- Đã hoàn tất `DETAIL-ZOOM-GALLERY-03` & `DETAIL-ZOOM-GALLERY-04` trên `dev` (`21d3359`) cho `/sach/:slug`: kính lúp chấm caro tròn mờ (`Click để xem`), popup vuông phóng đại bên phải hiện nhẹ (`scale 0.96 -> 1`, `180ms`) và thu nhỏ về tâm khi mất (`scale 1 -> 0.5`, `240ms`), cột thumbnail dọc và Lightbox iOS Photos.
- Đã tổ chức knowledge base theo [chỉ mục](README.md). Quyết định gần nhất
  và cách tái lập kiểm tra nằm ở checkpoint cuối [DEV_LOG](DEV_LOG.md).
- Đơn nội bộ, popup bill, hai tab và tra cứu trùng SĐT đã kiểm local đến V37.
  Phân trang hai trang lân cận mỗi bên đã kiểm local trên public/admin.
  Bằng chứng browser gửi lại/hoàn đơn trong lượt bill còn thiếu.
  [Đơn và bill](verification/ORDER_VERIFICATION.md) · [phân trang](product/PAGINATION.md)
- Owner đã xác nhận V30, cổng management riêng và restore R2 ở R6 ngày 11/11,
  luồng upload ngày 12/11. Revision/schema trên môi trường đích cần kiểm
  trước mỗi rollout. [Mốc ảnh đã kiểm](verification/IMAGE_VERIFICATION.md)

## Gate release và bước tiếp

| Đầu việc | Điều kiện đóng và nguồn |
|---|---|
| Rollout backend/frontend | Owner chọn candidate, kiểm schema thực tế, backup/counts/fingerprint/sequence, rehearsal restore và rollback có xét ghi mới. Đối chiếu migration cần chạy, thứ tự backend trước frontend, smoke domain thật, origin/canonical/enquiry, auth, media, tồn và retry. [Triển khai](runbooks/DEPLOYMENT.md) |
| Catalogue và lưu trữ | Kiểm privacy ghi chú/ảnh riêng, V14–V19 theo môi trường; tạo/chọn thùng, lưu/mở lại, đổi/bỏ và lọc trên nhiều trang, OWNER/STAFF. Kiểm cuộn về sách sau lưu cả khi đổi trang/rời bộ lọc. [Rollout sách](runbooks/BOOK_ENTRY_ROLLOUT.md), [smoke V20](runbooks/ROLLOUT_CHECKS.md) |
| Chấm công, khách, hero và đơn | Xác minh quyền/CSRF, ghi nhận migration V21–V23, V32–V37 trên target; kiểm PIN/bảng công, trùng SĐT, mount/digest/artwork banner, keep/giá chốt/thu/hoàn và bill. [Chấm công](product/ATTENDANCE.md), [hero](product/HERO_BANNERS.md), [rollout đơn](runbooks/ROLLOUT_CHECKS.md) |
| Ảnh | Đo Dell 20–50 sách, tám nguồn Drive thật, ảnh chữ, ngoài LAN, mixed-provider, RSS/latency và monitoring. Với backfill preview public, đối chiếu lại inventory 63 media và đủ 320/640 × JPEG/WebP, MIME, magic và kích thước. Migration sách Cloudinary sang LOCAL hoãn tới đợt owner mở riêng, cần dry-run và drill rollback pointer/version. [Ma trận và gate](verification/IMAGE_VERIFICATION.md) |
| Backup và khôi phục | Xác lập lịch, retention, owner, offhost, RPO/RTO; drill phục hồi DB cùng file media và rollback app/schema/dữ liệu trên bản sao. [Vận hành ảnh](runbooks/IMAGE_OPERATIONS.md), [quy trình release](runbooks/DEPLOYMENT.md) |
| Bảo mật và tải | Kiểm role DB tối thiểu/tách migration, rate limit đăng nhập, secrets, kết nối riêng, HTTPS, pool/quota/memory/load và quyền admin/public. [Bảo mật](context/SECURITY.md) |
| Public, thiết bị và bàn giao | Lighthouse Mobile ba lần mỗi Home/detail cố định/wishlist, từng lần LCP ≤ 2,5 giây và CLS ≤ 0,1. Kiểm 50–100 listing, Safari iPhone/Chrome Android/in-app, clipboard, điều hướng, accessibility, thời gian nhập/tìm/sửa và owner demo. [Đo QA](runbooks/DEPLOYMENT.md), [WebKit đã kiểm](verification/CONTACT_VERIFICATION.md) |
| Hiệu năng nhập/publish và import | QA cách ly đúng revision, năm vòng 2/6 ảnh warm và cold riêng, HAR an toàn, timing/pool/lock/heap. Đo import V1 100 sách/500 variants và V2 100/100, retry/timeout, receipt và rollback. Thiếu selectedAt ở một phép đo editor. [Publish](verification/BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md), [import](verification/BOOK_IMPORT_VERIFICATION.md) |
| Trigger Git của Cloudflare | Owner kiểm build production trùng merge SHA ở lần merge main tiếp theo. [Các bước và chứng cứ](runbooks/CLOUDFLARE_BUILDS.md) |

Ưu tiên xác nhận candidate và bản sao khôi phục trước rollout. Sau rollout,
kiểm dữ liệu, quyền và SEO rồi đo tải/thiết bị trên cùng revision. Owner
merge main và triển khai theo quy ước Git của dự án.
