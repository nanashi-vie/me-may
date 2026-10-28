# Tiến độ Mẹ Mây

Cập nhật 28/10/2026 (Asia/Ho_Chi_Minh). Đọc [chỉ mục](README.md) và checkpoint S023 cuối [DEV_LOG](DEV_LOG.md); đối chiếu môi trường khi tiếp tục.

## M5 online — đang nghiệm thu, chưa chốt MVP

- User đã deploy Workers/Render/Neon. Website: https://me-may.dqhungg8357.workers.dev; API: https://me-may-api.onrender.com. Render dashboard lần kiểm tra trước Live e264523; fetch28/10 thấy origin/main f04adea đã merge origin-fix, trạng thái deploy mới chưa xác minh.
- Online checker28/10 PASS gồm detailinitialHTML/OG/publicimage/no-store/404/privacy; kiểm thêm MM-000020 đủ3ảnh FRONT/BACK/INSIDE và searchmã PASS. Public hiện20cuốn/1trang,20AVAILABLE/0SOLD; không suy thành tổng số sách trong admin.
- OWNER đăng nhập qua Worker200, giữ phiên/quyền owner; cookie Secure/HttpOnly/SameSite=Lax, thiếu/stale CSRF403, logout204 rồi me401. API/admin anonymous401, Render actuator/env401. Không sửa tài khoản hoặc sách.
- Neon snapshot27/10 có schemaV5/1owner, chưa sách; user đã nhập sách online28/10. Không copydev hoặc sửa data thật trong QA. Backup mới28/10 chứa21sách/63media reference và đã restore scratch local thành công.
- User28/10 xác nhận **publish20desktop+1mobile thành công21/21**, mởZalo/copy/ẩn/FlashSale ổn và sau đó báo đã test xong các case người dùng còn lại; không yêu cầu nhập lại21cuốn. Chi tiết thiết bị/từng kết quả chưa được lưu thành biên bản; gate kỹ thuật tiếp tục M5.
- Lighthouse Mobile warm thủ công28/10, mỗi route3lần: Home median score91/LCP0,9s/CLS0 PASS; detail MM-000020 median score51/LCP7,8s/CLS0,579 FAIL; wishlist median score99/LCP0,8s/CLS0,008 nhưng một run CLS0,183. Đã sửa local khung ảnh/biến thể public 640px/wishlist và backfill Cloudinary63/63; chờ user merge/deploy rồi đo lại online. Cold-start Render chưa đo có kiểm soát.

- Backup Neon public mới file0600 đã restore scratch riêng; user xác nhận đủ12bảng/21sách, kiểm sequence/fingerprint theo drill. Nguồn63ảnh tại ignored `input/books` đọc được, không trùng checksum; manifest0600 verify63/63. Upload ảnh nguồn thật vào Cloudinary namespace recovery cách ly, đối chiếu metadata và cleanup PASS. User xác nhận đã chép DB/ảnh/manifest lên Drive; chưa xác minh quyền/lịch/retention bằng công cụ.

## Việc cần làm để đóng M5

1. Fixorigin enquiry/canonical: đã tái hiện entryadminCSR→public không có TransferState, tokenfallbacklocalhost; sửa dùng documentlocationorigin, regression93/93PASS/WorkersbuildPASS, review0finding. BrowserQA admin→public→enquiry/canonical đúngorigin8792PASS; đã pushdev7d88358 và main merge f04adea. Sau deploy smoke lại single/multibook enquiry; chưa xác minh release live. Không tự deploy.
2. User báo đã hoàn tất checklist chức năng ở VERIFICATION; nếu cần audit chi tiết mới xin kết quả từng thiết bị/case. Trước mắt tập trung gate kỹ thuật theo ưu tiên của user, không lặp pilot21cuốn.
3. User đã chép dump DB +63ảnh+manifest lên Drive; cần giữ quyềnRestricted/chốt lịch-retention. Fix performance local: frontend95/95, backend93/93 (2 live skipped), Workersbuild PASS, Cloudinary variant63/63; browser local bìa/wishlist1sách PASS. Sau user merge/deploy, kiểm ảnh ngang và đo Lighthouse Mobile3lần/route; tiếp cold-start/quotas, rollback, rate limit và role runtime tối thiểu.
4. Production VPS/Dokploy vẫn là gate hạ tầng riêng trong master plan. Không tự chuyển Render/Neon test thành nghiệm thu production.

## Git và môi trường

- `origin/main` đã merge origin fix ở f04adea; performance fix đã commit/push `dev` ở 60c0404. User tự merge `dev` sang `main` rồi deploy. `code/frontend/src/index.html` là thay đổi có sẵn của user, giữ riêng.
- M0/M1 local đã duyệt; M2 gate kỹ thuật và M3/M4 local có bằng chứng tại VERIFICATION. ImportCSV/Excel, phoneauth và chỉnh visual bổ sung để sauMVP.
- DBdev/test/localservices giữ nguyên. .env/.local/dump/cookie không commit; asset public/logo tracked. Markdown≤400dòng trừ DEV_LOG.

## Đọc tiếp

- [VERIFICATION](VERIFICATION.md#m5-online--27102026): bằng chứng và các gate còn mở.
- [DEPLOYMENT](DEPLOYMENT.md): URL, env, rollout/rollback và checklist pilot.
- [MASTER_PLAN §9](MASTER_PLAN.md#9-definition-of-done--nghiệm-thu-mvp): DoD còn hiệu lực.
