# Bằng chứng hiệu năng nhập và xuất bản

Ngày30/10/2026, Asia/Ho_Chi_Minh. Spec/plan ở [chỉ mục](README.md).
Chưa nghiệm thu Render warm/cold hoặc VPS. Không dùng local thay online.

## Baseline có kiểm soát — d1cca7b

- QA mới `me_may_performance_qa`, PostgreSQL Docker local; API8086/SSR4007,
  Cloudinaryauthenticated memay/test. Tài khoản owner/staff giảlập, không dữ liệu bán thật.
- APIjar và NodeSSR/browserdist đóng băng ngoài target/dist để không bị
  source/build mới thay đổi lúc đo. Browser Chromium1440×1000, loopback tới API;
  provider là Cloudinary thật. Không đo Neon vì DBQA là Docker.
- Bộ nguồn tổng hợp cố định: PNG1200×1600/4092283bytes và1600×1200/4701075bytes;
  SHA256 trong manifestlocal. JPEGbrowser0,85:507603/475921bytes. Không ảnh người dùng.
- Warm-up2ảnh tách riêng;5vòng2ảnh và5vòng6ảnh. Tôn trọng30attempt/10phút,
  có đợi rollingwindow; không restartprod hoặc nới limiter. Không bỏ mẫu chậm.
- RawHAR/result/manifest/ledger/runtime ở `.superpowers/sdd/BOOK_PUBLISH_PERFORMANCE_PLAN/`
  ignored trong lúc thực thi. SanitizedHAR từngvòng chỉmetadata allowlist;
  unit3/3 kiểm bỏsecret/headers/body/host/query/providerURL/IDs.

| Workload | Upload cảbộ:5mẫu(ms) | Median | Publish→editor:5mẫu(ms) | Median |
|---|---|---|---|---|
|2ảnh|4197,4754,5549,4495,4331|4495|806,462,475,497,445|475|
|6ảnh|12719,12589,13507,18612,14481|13507|938,891,927,992,937|937|

Tổng chọn→editor,2ảnh:5048,5245,6069,5012,4796ms; median5048, min4796/max6069.
6ảnh:13681,13506,14469,19627,15444ms; median14469, min13506/max19627.
Không cộng các median thành elapsed và không báo p95 với5mẫu.

HARmedian từngrequest dưới đây (có request ảnh chạy chồng lấn):

| Workload / nhóm | Count | Total(ms) | Wait(ms) | Send(ms) | Receive(ms) | Response bytes |
|---|---:|---:|---:|---:|---:|---:|
|2/upload|10|2079,53|2078,63|0|0,91|242|
|6/upload|30|2196,36|2195,36|0|0,85|242|
|2/publish|5|55,96|55,21|0|0,55|1047|
|6/publish|5|75,50|74,99|0|0,52|1725|
|2/content1280|10|372,69|372,15|0|0,51|313469|
|6/content1280|30|421,08|417,77|0|1,38|313469|
|2/taxonomy|10|18,95|18,27|0|0,77|1143|
|6/taxonomy|10|13,17|12,53|0|0,73|1143|
|2/collections|10|25,00|22,60|0|1,25|2|
|6/collections|10|17,33|16,80|0|0,60|2|

Send0 là độ phân giải HAR/loopback, không chứng minh gửi ảnh không tốn thời gian.
Backendquerycounter ghi39executions cho publish2ảnh/47cho6ảnh; mỗi lần có3mapping.
Taxonomy/collections mỗi vòng2request do tải đầuform và sau navigation.
Đây là bằng chứng roundtrips dư, chưa quy phần chậm online cho Neon/Render.

Cloudinary usage đọc được:credits1,9/25(7,6%), storage205979098bytes,
bandwidth975348367bytes, transformations798; snapshot cập nhật theo provider.
Probe độc lập: JavaJPEG0,85 từ cùngPNG(531726bytes), upload-only2629,85ms,
explicit eager2369,26ms/5derived; khác encoderbrowser và chỉ1mẫu, không phân rã
chính xác call upload+eager của ứng dụng. UUIDprobe có ledger riêng, cleanup exact.

## Kiểm chứng thay đổi — đang thực thi

- Task1 sanitizer3/3PASS; Task2 backend119run/0failure/0error/3live skipped,
  frontend126/126 và NodeSSRbuildPASS. Opt-in timings smoke có query/connection/request.
- Task4 gateway/endpoint9testsPASS, frontend128/128PASS: JPEG320/admin auth,
  default1280, fallback chỉmissingvariant, invalidsize400; viewer read-only cho STAFF.
  Browser và5lượtbytes bản mới chưa chạy; chưa ghi Task4 hoàn tất.
- Task5 cache/handoff/audit đang regression; chưa browser/đo bản mới.

## Gate chưa chạy

- RenderQA đúngrevision/DBmedia cáchly chưa được userdeploy;5vòngwarm/cold/logs/
  Neonquota/Neonpool chưa có bằng chứng. Health online chỉ từng thấyUP.
- VPSQA chưa có; chỉ đối chứng khi còn chậm và môi trường đã sẵn sàng.
- Kết quả sau tối ưu, retry/timeout/privacy/browser/fullchecks/review/cleanup
  toàn bộassetQA sẽ bổ sung trong phiên thực thi; không đánh dấuMVP hoàn tất.
