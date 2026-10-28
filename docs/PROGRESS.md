# Tiến độ Mẹ Mây

Cập nhật 28/10/2026 (Asia/Ho_Chi_Minh). Đọc [chỉ mục](README.md) và checkpoint S023 cuối [DEV_LOG](DEV_LOG.md); đối chiếu môi trường khi tiếp tục.

## M5 online — đang nghiệm thu, chưa chốt MVP

- User đã deploy Workers/Render/Neon. Website: https://me-may.dqhungg8357.workers.dev; API: https://me-may-api.onrender.com. Render dashboard xác nhận Live commit e264523 (main đã merge dev).
- Online checker28/10 PASS gồm detailinitialHTML/OG/publicimage/no-store/404/privacy; kiểm thêm MM-000020 đủ3ảnh FRONT/BACK/INSIDE và searchmã PASS. Public hiện20cuốn/1trang,20AVAILABLE/0SOLD; không suy thành tổng số sách trong admin.
- OWNER đăng nhập qua Worker200, giữ phiên/quyền owner; cookie Secure/HttpOnly/SameSite=Lax, thiếu/stale CSRF403, logout204 rồi me401. API/admin anonymous401, Render actuator/env401. Không sửa tài khoản hoặc sách.
- Neon snapshot27/10 có schemaV5/1owner, chưa sách; user đã nhập sách online28/10. Không copydev, không sửa data thật trong QA. Snapshotbackup27/10 chỉ skeleton, chưa backup bộ21sách mới.
- User28/10 xác nhận **publish20desktop+1mobile thành công21/21**, mởZalo/copy/ẩn/FlashSale ổn. Pilot publish đã đạt sốlượng; chưa xác nhận sold/stalewishlist, error/conflict, thiếtbị/browsermatrix hoặc thời gian nhập/sửa. Giữ M2_SPEC/M2_PLAN khi chưa chuyển đủ gate; không yêu cầu nhập lại21cuốn.
- Cloudflare dashboard24h tại lúc đọc:193invocations, CPU Time985µs, Errors0; đây là số tổng quan, không phải đo tải/LCP/CPU theo route. Cold-start Render chưa đo có kiểm soát; tab cũ từng báo chưa tải dữ liệu, reload sau warmup chạy bình thường.

- Backup Neon public vào file0600 trên máyoperator và restore scratch riêng đạt:12bảng count/hash,7sequence last_value/is_called khớp, source không đổi. Chưa có sách/ảnh hoặc policy backup định kỳ; xem giới hạn tại VERIFICATION.

## Việc cần làm để đóng M5

1. Fixorigin enquiry/canonical: đã tái hiện entryadminCSR→public không có TransferState, tokenfallbacklocalhost; sửa dùng documentlocationorigin, regression93/93PASS/WorkersbuildPASS, review0finding. BrowserQA admin→public→enquiry/canonical đúngorigin8792PASS; chuẩn bị publishdev; user mergemain/deploy rồi smoke lại single/multibook enquiry. Không tự deploy.
2. Các case người dùng còn cần xác nhận ở VERIFICATION/checklist28/10: sold→wishlistcũ, reload/addremove, tìm/lọc/back/phântrang, lỗi nhập/ảnh/network/phiên/conflict và browsermatrix. Copy/mởZalo đã usertest đạt, chỉ thử tiếp contextthiếtbị còn thiếu; không tự gửi tin.
3. Hoàn tất recovery DB/media, chính sách backup ngoài host và rollback; đo lab mobile LCP≤2,5s/trang đại diện, cold-start/quotas; kiểm tra rate limit và role runtime tối thiểu trước release.
4. Production VPS/Dokploy vẫn là gate hạ tầng riêng trong master plan. Không tự chuyển Render/Neon test thành nghiệm thu production.

## Git và môi trường

- Phiên28/10 sửa origin trên `dev`, user tự merge sang `main`. Không pushmain hoặc redeploy dịch vụ trong phiên kiểm tra.
- M0/M1 local đã duyệt; M2 gate kỹ thuật và M3/M4 local có bằng chứng tại VERIFICATION. ImportCSV/Excel, phoneauth và chỉnh visual bổ sung để sauMVP.
- DBdev/test/localservices giữ nguyên. .env/.local/dump/cookie không commit; asset public/logo tracked. Markdown≤400dòng trừ DEV_LOG.

## Đọc tiếp

- [VERIFICATION](VERIFICATION.md#m5-online--27102026): bằng chứng và các gate còn mở.
- [DEPLOYMENT](DEPLOYMENT.md): URL, env, rollout/rollback và checklist pilot.
- [MASTER_PLAN §9](MASTER_PLAN.md#9-definition-of-done--nghiệm-thu-mvp): DoD còn hiệu lực.
