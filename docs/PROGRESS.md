# Tiến độ Mẹ Mây

Cập nhật 27/10/2026 (Asia/Ho_Chi_Minh). Đọc [chỉ mục](README.md) và checkpoint S022 cuối [DEV_LOG](DEV_LOG.md); đối chiếu môi trường khi tiếp tục.

## M5 online — đang nghiệm thu, chưa chốt MVP

- User đã deploy Workers/Render/Neon. Website: https://me-may.dqhungg8357.workers.dev; API: https://me-may-api.onrender.com. Render dashboard xác nhận Live commit e264523 (main đã merge dev).
- Đã kiểm chứng online: health200/UP, initial HTML Home/Cách mua + metadata/canonical, public routes/no-store, missing404, wishlist/admin noindex/no-store. Script SSR PASS; nhánh detail/media thật không chạy vì catalogue rỗng.
- OWNER đăng nhập qua Worker200, giữ phiên/quyền owner; cookie Secure/HttpOnly/SameSite=Lax, thiếu/stale CSRF403, logout204 rồi me401. API/admin anonymous401, Render actuator/env401. Không sửa tài khoản hoặc sách.
- Neon public: Flyway5/version5, 1activeOWNER, 0book/0listing/0media/0audit. Không copy dữ liệu local. Browser xác minh Home rỗng, wishlist rỗng, link Zalo hotline/nhóm có cấu hình.
- User xác nhận **chưa thử online trên điện thoại/in-app hoặc pilot10–20 cuốn thật**. M2 pilot vẫn mở; giữ M2_SPEC/M2_PLAN. M3/M4 local đã được user nghiệm thu trước đó.
- Cloudflare dashboard24h tại lúc đọc:193invocations, CPU Time985µs, Errors0; đây là số tổng quan, không phải đo tải/LCP/CPU theo route. Cold-start Render chưa đo có kiểm soát; tab cũ từng báo chưa tải dữ liệu, reload sau warmup chạy bình thường.

- Backup Neon public vào file0600 trên máyoperator và restore scratch riêng đạt:12bảng count/hash,7sequence last_value/is_called khớp, source không đổi. Chưa có sách/ảnh hoặc policy backup định kỳ; xem giới hạn tại VERIFICATION.

## Việc cần làm để đóng M5

1. Chủ tự nhập/publish10–20 cuốn thật với đủ3ảnh; chạy lại online SSR/detail/OG/media, tìm/lọc, sold/ẩn/cache và wishlist/enquiry. Bộ50–100listing kiểm thử theo DoD chưa có; không bịa dữ liệu bán thật.
2. Thử iPhone Safari/Android Chrome/Facebook/Zalo in-app và copy→mở Zalo→dán; agent không tự gửi tin. Ghi thiết bị/kết quả và thời gian owner nhập/sửa.
3. Hoàn tất recovery DB/media, chính sách backup ngoài host và rollback; đo lab mobile LCP≤2,5s/trang đại diện, cold-start/quotas; kiểm tra rate limit và role runtime tối thiểu trước release.
4. Production VPS/Dokploy vẫn là gate hạ tầng riêng trong master plan. Không tự chuyển Render/Neon test thành nghiệm thu production.

## Git và môi trường

- Agent bàn giao/push `dev`, user tự merge sang `main`. Không pushmain hoặc redeploy dịch vụ trong phiên kiểm tra.
- M0/M1 local đã duyệt; M2 gate kỹ thuật và M3/M4 local có bằng chứng tại VERIFICATION. ImportCSV/Excel, phoneauth và chỉnh visual bổ sung để sauMVP.
- DBdev/test/localservices giữ nguyên. .env/.local/dump/cookie không commit; asset public/logo tracked. Markdown≤400dòng trừ DEV_LOG.

## Đọc tiếp

- [VERIFICATION](VERIFICATION.md#m5-online--27102026): bằng chứng và các gate còn mở.
- [DEPLOYMENT](DEPLOYMENT.md): URL, env, rollout/rollback và checklist pilot.
- [MASTER_PLAN §9](MASTER_PLAN.md#9-definition-of-done--nghiệm-thu-mvp): DoD còn hiệu lực.
