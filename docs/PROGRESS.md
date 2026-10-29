# Tiến độ Mẹ Mây

Cập nhật 29/10/2026 (Asia/Ho_Chi_Minh). Đọc [chỉ mục](README.md) và checkpoint S024 cuối [DEV_LOG](DEV_LOG.md); đối chiếu môi trường khi tiếp tục.

## M5 online — đang nghiệm thu, chưa chốt MVP

- User đã deploy Workers/Render/Neon. Website: https://me-may.dqhungg8357.workers.dev; API: https://me-may-api.onrender.com. Render dashboard lần kiểm tra trước Live e264523; fetch28/10 thấy origin/main f04adea đã merge origin-fix, trạng thái deploy mới chưa xác minh.
- Online checker28/10 PASS gồm detailinitialHTML/OG/publicimage/no-store/404/privacy; kiểm thêm MM-000020 đủ3ảnh FRONT/BACK/INSIDE và searchmã PASS. Public hiện20cuốn/1trang,20AVAILABLE/0SOLD; không suy thành tổng số sách trong admin.
- OWNER đăng nhập qua Worker200, giữ phiên/quyền owner; cookie Secure/HttpOnly/SameSite=Lax, thiếu/stale CSRF403, logout204 rồi me401. API/admin anonymous401, Render actuator/env401. Không sửa tài khoản hoặc sách.
- Neon snapshot27/10 có schemaV5/1owner, chưa sách; user đã nhập sách online28/10. Không copydev hoặc sửa data thật trong QA. Backup mới28/10 chứa21sách/63media reference và đã restore scratch local thành công.
- User28/10 xác nhận **publish20desktop+1mobile thành công21/21**, mởZalo/copy/ẩn/FlashSale ổn và sau đó báo đã test xong các case người dùng còn lại; không yêu cầu nhập lại21cuốn. Chi tiết thiết bị/từng kết quả chưa được lưu thành biên bản; gate kỹ thuật tiếp tục M5.
- Lighthouse Mobile warm trước sửa: Home median score91/LCP0,9s/CLS0 PASS; detail MM-000020 median score51/LCP7,8s/CLS0,579 FAIL; wishlist median score99/LCP0,8s/CLS0,008, một run CLS0,183. User gửi3 JSON sau deploy cho detail MM-000019: LCP4,2/5,9/4,2s, CLS1,173/1,173/0,579, TTFB0,97/0,87/0,87s; ảnh đã nhỏ hơn nhưng gate vẫn FAIL. Khác mã sách nên không so sánh LCP trước/sau như cùng một mẫu. Cold-start Render chưa đo có kiểm soát.

- Backup Neon public mới file0600 đã restore scratch riêng; user xác nhận đủ12bảng/21sách, kiểm sequence/fingerprint theo drill. Nguồn63ảnh tại ignored `input/books` đọc được, không trùng checksum; manifest0600 verify63/63. Upload ảnh nguồn thật vào Cloudinary namespace recovery cách ly, đối chiếu metadata và cleanup PASS. User xác nhận đã chép DB/ảnh/manifest lên Drive; chưa xác minh quyền/lịch/retention bằng công cụ.

## Việc cần làm để đóng M5

Đầu việc mới28/10: user yêu cầu tối ưu theo bảng P0/P1/P2 (logoWebP,
LCP/CLS, mediaWebP+JPEG và2cỡ, chuẩn hóa upload, đánh giá cache), đồng thời
bỏ hoàn toàn tạo nháp. Đã chốt chỉ OWNER thêm/sửa/đăng, STAFF chỉ xem;
user chọn upload ảnh tạm rồi tạo+đăng một lần. User duyệt spec ngày29/10.
Đã lập [M5_COMPLETION_PLAN](M5_COMPLETION_PLAN.md),7task thay plan cũ;
user đã duyệt và chọn Native thực hiện tuần tự trong chat này.
Task1 local đạt: frontend97/97/builtSSR/browser390+laptop, fixhydration
CLS; logoWebP10KB. Task2local media4variant/normalize/frontend100/100/backendverifyđạt,
live1assettest+cleanupPASS; chưabackfill63ảnhbánthật. Task3 V6/fields/roles/giá local đạt98backend/102frontend; browserfields
để QA tíchhợp task6/7. Task4 V7/phiênảnh/cleanup đạt102backend, chưaUI.
Task5 V8/final/retry/reorder/OWNER-only đạt106backend0lỗi,3live skip.
Đangtask6 editor/multi-upload/reorder/readonlySTAFF; chưađổi workflowUIxong. Baseline mới: frontend95/95PASS; backend
verify93run/0failure/0error/2live skippedPASS sau rerun ngoài sandbox.
Bổ sung29/10: trọng lượng sách (đề xuất gram), khoảng giá từ–đến và giữ
nguyên chú thích giá. Chọn/thả2–6ảnh, bìa/lưng bắt buộc, thứ tự mặc định
bìa/lưng/gáy/nội dung1/nội dung2/nội dung3; các vai trò sau bìa/lưng tùy
chọn. Có kéo sắp xếp/nút bàn phím/mobile, giữ ID khi upload async.
Spec/plan đã duyệt, đang thực thi; chưa migrate/deploy/data online.

1. Fixorigin enquiry/canonical: đã tái hiện entryadminCSR→public không có TransferState, tokenfallbacklocalhost; sửa dùng documentlocationorigin, regression93/93PASS/WorkersbuildPASS, review0finding. BrowserQA admin→public→enquiry/canonical đúngorigin8792PASS; đã pushdev7d88358 và main merge f04adea. Sau deploy smoke lại single/multibook enquiry; chưa xác minh release live. Không tự deploy.
2. User báo đã hoàn tất checklist chức năng ở VERIFICATION; nếu cần audit chi tiết mới xin kết quả từng thiết bị/case. Trước mắt tập trung gate kỹ thuật theo ưu tiên của user, không lặp pilot21cuốn.
3. User đã chép dump DB +63ảnh+manifest lên Drive; cần giữ quyềnRestricted/chốt lịch-retention. Fix performance đã lên online cho MM-000019 (HTML có fetchpriority=high, ảnh FRONT~139KB); báo cáo vẫn FAIL do LCP và CLS. Cần xác định layout shift của `main#main.wrap`, đo lại cùng mã MM-000020 và wishlist; tách warm TTFB khỏi cold-start Render bằng phép đo riêng trước khi cân nhắc nâng gói. Sau đó tiếp cold-start/quotas, rollback, rate limit và role runtime tối thiểu.
4. Production VPS/Dokploy vẫn là gate hạ tầng riêng trong master plan. Không tự chuyển Render/Neon test thành nghiệm thu production.

## Git và môi trường

- `origin/main` đã merge origin fix ở f04adea; performance fix đã commit/push `dev` ở 60c0404. User tự merge `dev` sang `main` rồi deploy. `code/frontend/src/index.html` là thay đổi có sẵn của user, giữ riêng.
- M0/M1 local đã duyệt; M2 gate kỹ thuật và M3/M4 local có bằng chứng tại VERIFICATION. ImportCSV/Excel, phoneauth và chỉnh visual bổ sung để sauMVP.
- DBdev/test/localservices giữ nguyên. .env/.local/dump/cookie không commit; asset public/logo tracked. Markdown≤400dòng trừ DEV_LOG.

## Đọc tiếp

- [VERIFICATION](VERIFICATION.md#m5-online--27102026): bằng chứng và các gate còn mở.
- [DEPLOYMENT](DEPLOYMENT.md): URL, env, rollout/rollback và checklist pilot.
- [MASTER_PLAN §9](MASTER_PLAN.md#9-definition-of-done--nghiệm-thu-mvp): DoD còn hiệu lực.
