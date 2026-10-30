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

## Sau tối ưu — candidate5fd1663

Cùng nguồn/viewport/APIQA/provider và5vòng/workload; tiếp tục upload1, eager5bản.
Handoff/metadata cache/audit giảm request; chưa tuyên bố Cloudinary nhanh hơn.
Candidate cuộn khung đầu vào viewport để tải thumbnail; ghi editorReady riêng.
Baseline đã tải toànbộ preview sớm, nên phần kết thúc có khác biệt nhỏ về thao tác cuộn.

| Chỉ số median | Trước | Sau | Nhận xét |
|---|---:|---:|---|
|2ảnh:chọn→editor+ảnhđầu|5048ms|4848ms|giảm4,0%; dao động còn lớn|
|6ảnh:chọn→editor+ảnhđầu|14469ms|14322ms|giảm1,0%; chưa chứng minh lợi ích lớn|
|2ảnh:upload cảbộ|4495ms|4324ms|giảm3,8%|
|6ảnh:upload cảbộ|13507ms|13725ms|tăng1,6%; provider/network dao động|
|2ảnh:POST/books|55,96ms|59,84ms|không cải thiện nhất quán|
|6ảnh:POST/books|75,50ms|45,38ms|giảm39,9% trong workload này|
|2ảnh:DBexecutions/publish|39|30|giảm9|
|6ảnh:DBexecutions/publish|47|38|giảm9|
|Detailmapping/publish|3|1|DTO bằng stored detail; audit giữ nguyên|

5mẫu elapsed sau(ms),2ảnh:5281,4593,4848,5824,4732; min4593/max5824.
6ảnh:12396,14322,14769,13976,14426; min12396/max14769.
5mẫu upload sau(ms),2ảnh:4692,3999,4324,4982,4157;
6ảnh:11754,13725,14133,13355,13869.
5mẫu publish→editor+ảnhđầu sau(ms),2ảnh:545,570,504,811,546;
6ảnh:532,567,614,595,521. Không lấy warm-up làm mẫu.

Mỗi5vòng:GETbook sauPOST5→0; taxonomy10→5; collections10→5; audit tựđộng10→0.
Audit chỉtải khi mở: browserclosed0/open1. Cachememory TTL60s, auth epoch;
handoff mộtlần10s, khônglocalStorage/history. Refresh/deep-link vẫnđọcserver.

Cùng FRONTasset,5request mỗi cỡ, appwarm/providerCDNfirst-hit vẫn giữ trong mẫu:

| Cỡ | Bytes/ảnh | Totalmedian | Waitmedian | Sendmedian | Receivemedian |
|---|---:|---:|---:|---:|---:|
|JPEG320|10129|118,88ms|118,35ms|0ms|0,41ms|
|JPEG1280|417513|211,10ms|208,35ms|0ms|0,89ms|

Giảm97,6%bytes, không đổi viewer lớn. HAR của các gallery đóng sau ảnhđầu có
request ảnh khác chưa xong(timing=-1); không dùng chúng tính mediancontent
hoặc coi byteunknown bằng0. HaiHAR5request/size hoàn tất ở evidence riêng.
Grid dùng viewportdefer, native lazy/async, khung220px/contain; ngoài viewport
browserhard-load có0ảnh. Có trạng thái tải preview riêng với trạng thái đãupload.

## Regression và review

- Frontend145/145, backend123run/0failure/0error/3live-provider skipsPASS.
  NodeSSR/Workersbuild, proxychecker và SSRchecker4007PASS(HTML/OG/privateadmin/
  wishlist/no-store/public4media variants/MIME/magic/2–6ảnh).
- Browser OWNER:viewer lớn giữ width1200 cho nguồn1200(không phóng lớn), Escape;
  auditlazy; ẩn publicdetail/media404/admin200; sửa6→5→4→3ảnh giữfront/back;
  timeoutuploadretry và mấtfinalresponse→retry cùngbookID21. STAFF khôngwrite
  controls, vẫn2viewer, directPOST403. Bộ2/6 có10vòng tạo thật trênQA.
- Prefetch1/decode1/uploadserial: tests giữrole/requestKey/replace/expire/remove/
  destroy/retry/versionconflict; finalatomicrollback vàconcurrentfinal regressionPASS.
  Source guard vẫn10MB/25MP, EXIF/JPEG0,85/whitealpha/2560; READY nhảpreparedblob.
- Missing320→1280 kiểm bằng providerfixture;401/403/timeout/5xx khôngfallback.
  Probe thật chỉeager1280 vẫn nhận được320, chưa ép được missingderived404;
  không coi probe đó là bằng chứng nhánhfallback đã chạy. ProbeUUID đãxóa đúngledger.
- Review độc lập0Critical/1Important/1Minor. Importantstreamfailure sauheader
  committed đãREDrequestok→GREENrequesterror/HTTP200/exactly1terminalevent;
  fullbackend123run đạt. Khôngrereview theo workflow. Minor deferred: replace()
  chưa ghi selectedAt nên edittimingready thiếu phầnprepare; không ảnh hưởng
  dữ liệu hoặc benchmarknhậpmới. Cần bổ sung trước khi dùng edittiming kết luận.
- Previewloading được bổ sung sau kiểm screenshot chuyển tiếp; dùng overlay
  trongkhungcốđịnh, không gọi blankplaceholder là bằng chứng ảnh đãhiện.

## Evidence và cleanup

Evidence đã lọc lưu localignored tại `.local/book-performance/`:20HAR5vòng,
2HARcontent5request, results/comparison/manifest/environment, servertimings
metadata-only vàledgercleanup. Không giữ cookie/header/body trong safeHAR;
size/format chỉ nhận giá trị allowlist. Sanitizer4/4PASS.
ẢnhnguồnQA đượcgiữ để táilập; không dùng hoặc xóa ảnhnguồn của chủ tiệm.

Cleanup xácnhận destroy83assetQA cònlại,0absent;3ảnhoptional đãđược cleanupjob
xửlý trước đó. Hai probe độc lập có ledgerdeleted. DBscratch giữ23sáchđãẩn,
23variant/media0/temporary0. ĐãdừngAPI/SSR vàđóngbrowserQA; khôngdropDB.
Không thayDB/ảnh bánthật, khôngmerge/deploymain.

## Gate còn mở

- RenderQA đúngrevision/DBmedia cáchly chưa được userdeploy;5vòngwarm/cold/logs/
  Neonquota/pool/lock chưa có bằng chứng. Health online chỉ từng thấyUP.
- Giữ upload1: chưa có memory/headroom/lock/A-B trên Render–Neon. Không bật
  eagerasync/publicmedia; không giảm5derived cònconsumer. Có thể đánhgiá lại
  sau phép đo targetQA; không coi kết quả local là bằng chứng đã đủ điều kiện.
- VPSQA chưa có; chỉ đối chứng nếu vẫnchậm sau đo targetwarm, cùngrevision/
  ảnh/workload/DB. Khôngmua/tạohost hoặc tựdeploy trong phiên này.
- Collection-heavy batching/index chưa đổi vì baseline không gán collections;
  cần đo workload đó trước quyếtđịnh. M5SEO/recovery/security gates vẫn giữ.
