# Tiến độ Mẹ Mây

Cập nhật 22/10/2026 (Asia/Ho_Chi_Minh). Bắt đầu từ [chỉ mục](README.md), checkpoint mới nhất ở cuối [DEV_LOG](DEV_LOG.md). Luôn kiểm tra lại Git/process/môi trường.

## Trạng thái hiện tại

- M0 và M1 local đã được duyệt. M2 đã duyệt spec/plan và triển khai tuần tự task1–10; gate kỹ thuật task11 đã kiểm chứng, **chờ chủ nhập/đối chiếu 10–20 cuốn thật để nghiệm thu M2**. Người dùng đã xác nhận sẵn sàng làm pilot trên local.
- Giữ [M2_SPEC](M2_SPEC.md) và [M2_PLAN](M2_PLAN.md) hiện hành khi pilot còn mở; chưa gộp/xóa hoặc chuyển M3.
- Branch `feat/m2-admin-catalogue`; task1–10 đã commit local, kiểm tra cuối/review/bàn giao được lưu cùng thay đổi liên quan. Không push/merge/deploy.

## Đã kiểm chứng

- Schema BookCopy/Listing, taxonomy cố định, mã tăng dần MM-000001 bất biến và có thể khuyết; aggregate version/audit, Owner/Staff, publication độc lập availability.
- API admin strict JSON, tìm kiếm literal, collections, preview/audit; ảnh authenticated Cloudinary, ba slot, bounded upload và cleanup recoverable. Timeout chưa rõ kết quả giữ intent chờ 1h, không dọn sớm.
- Angular list/editor/collection/media/status/preview/audit; CSRF mới, không replay POST tạo, giữ form khi lỗi/xung đột/hết phiên; dirty guard gồm file/metadata ảnh; admin noindex/no-store, giá vi-VN.
- Backend verify73 PASS +2 live skipped mặc định; live Cloudinary2/2 PASS riêng; frontend34/34 và build PASS; SSR public/404/admin headers PASS. Chi tiết mới ở [VERIFICATION](VERIFICATION.md#m2--gate-kỹ-thuật-và-pilot).
- Browser Owner flow và Staff restriction; hai tab stale, offline, cookie expiry, dirty navigation và keyboard focus đã thử trên me_may_test/memay/test, không dùng dữ liệu tiệm làm synthetic fixture.
- Backup trước dev migration; restore scratch giữ auth và M2 data/audit/code sequence/media reference; asset test đã cleanup. Không coi đây là gate production/backup media độc lập.
- Review độc lập toàn nhánh: 4 finding đã có RED→GREEN; giữ thêm gate pilot thật, không lấy dữ liệu/ảnh giả để nghiệm thu.

## Chạy local / pilot

Backend 8080 và frontend 4200 được để chạy để chủ thử; kiểm tra lại khi tiếp tục phiên. Mở [Quản lý sách](http://127.0.0.1:4200/admin/sach), đăng nhập bằng BOOTSTRAP_OWNER_EMAIL/PASSWORD trong `.env` local; không gửi secret qua chat. Hướng dẫn nhập/pilot ở [README](../README.md#nhập-sách-và-pilot-m2).

Dev dùng me_may_dev; tests dùng me_may_test có guard; Cloudinary đã được cấu hình và xác minh. Không dùng `.local/*-browser.json` hoặc tài khoản fixture test cho pilot. Không reset sequence; sách bán thật do tiệm nhập thủ công. Dữ liệu synthetic trong browser test đã xóa khỏi DB/cloud.

## Bước tiếp theo

1. Chủ nhập 10–20 cuốn thật: mã/nhãn, giá/tình trạng, ba ảnh; tự tìm/sửa/preview/publish/sold/ẩn/khôi phục; ghi thời gian nhập/tìm/sửa và các điểm vướng. Chưa có kết quả pilot thì M2 còn mở.
2. Nếu có lỗi pilot: tái hiện, sửa có kiểm chứng và ghi checkpoint. Khi chủ duyệt gate M2, chuyển hết quyết định/bằng chứng vào tài liệu chuẩn rồi mới xóa spec/plan hết vai trò.
3. M3 catalogue/detail/contact cần đặc tả tiếp; link Zalo hotline/nhóm thật cần trước nghiệm thu contact. M4 wishlist trên thiết bị; import CSV/Excel tạo mới thành nháp ngay sau MVP.
4. Cloudflare render/SEO/OG spike, staging/VPS/Dokploy, production roles/domains/CORS/CSRF, CI/CD, backup ngoài VPS còn các gate riêng, chưa triển khai từ phiên này.

## Bàn giao và tài liệu

- Một chỉ mục docs/README; Markdown tối đa 400 dòng/file, không có tối thiểu bắt buộc; DEV_LOG ngoại lệ. Không tạo proposal trùng phạm vi hoặc thêm .gitignore con.
- Log/artifact/backup/cookie local nằm trong `.superpowers/`, `.local/`, `output/playwright/` được ignore; không commit secret/dump/ảnh pilot. Source asset public/logo vẫn theo dõi Git.
- Knowledge graph project Users-daoquanghung-Projects-me-may đã refresh trong M2, có thể thiếu file media do default exclusion; dùng fallback khi không đủ kết quả. Lần refresh graph cuối báo Transport closed; không giả định index chứa frontend mới. Skill ở `.agents/` local, không giả định có trong clone.
