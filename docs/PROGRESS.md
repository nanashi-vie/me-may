# Tiến độ Mẹ Mây

Cập nhật01/11/2026 (Asia/Ho_Chi_Minh). Đọc [chỉ mục](README.md) và checkpoint mới nhất
[DEV_LOG](DEV_LOG.md); đây là snapshot theo bằng chứng đã ghi, không là kiểm tra live mới.

## Hướng hiện tại — đóng phạm vi tính năng, chuyển tối ưu giao diện

User muốn khép phần xây tính năng MVP tại đây để tối ưu UI. Giữ chức năng hiện có,
không mở thêm feature trong lần tổng hợp này. Chưa đánh dấu nghiệm thu release/
production vì các gate kỹ thuật dưới đây chưa đủ bằng chứng. Chưa thiết kế/code UI mới. Điều chỉnh format importV2 user yêu cầu sau đó được
ghi riêng bên dưới, không mở lại phạm vi tính năng khác.

- Import CSV/XLSX tạoẨn→thêmảnh→OWNERpublish, tồn riêng theo
  biến thể, upload đứng đầu editor và hướng dẫn import ngắn đã triển khai local.
- Backend178run/0failure/0error/3live-provider skips; frontend169/169; NodeSSR/Workers/
  proxy/SSR và browserQA có bằng chứng tại các file kiểm chứng; lần đổi copy cuối
  chạy169frontend và Workersbuild. Không coi các kết quả này là smoke online mới.
- Pilot21/21 và các ca chức năng user đã báo test xong được giữ; không yêu cầu nhập
  lại sách hoặc lặp toàn bộ M2/M3/M4. Thiết bị/case chưa có biên bản chỉ ghi thiếu
  bằng chứng chi tiết, không tự chuyển ca đã được user xác nhận sang FAIL.
- Đã dọn7DB QA/restore tạm và10asset của QA import; giữdev/test/postgres, backupdump
  và media production. QA/browser đã dừng. Các DBscratch trong log cũ không còn.

## Import V2 và hai thể loại — đã triển khai local01/11

-16cột/mỗi dòng=một sáchẨn/defaultTiếngAnh/tồn1; nhãn dễđọc/code/aliasheader;
  V1/20cột và digest/receipt cũ giữ retry. OWNER thêmảnh/sửa tồn/biếnthể rồi publish.
- V12 thêm Tập đọc và Nấu ăn - thủ công - activity book vào taxonomy chung, form,
  publicfilter và importer; giữ6categorycũ/sáchcũ. Chưa migrateonline/dev trongphiên.
- Backend178run/0failure/0error/3skip, frontend169/169, NodeSSR/Workers/proxyPASS;
  browserUI với mockAPI và realDB/fakeproviderintegrationảnh→variants→publishPASS.
- Review0Critical/0Important/1Minor: sparseXLSXfixture/errorrow thiếuregression riêng,
  defer; không giả là đãtest. Workbookuser không đổi; browser/SSRQA riêng đãdừng.
- [Contract](BOOK_IMPORT.md#format-v2--chốt0111), [bằng chứng](BOOK_IMPORT_VERIFICATION.md#importv2-và-thể-loại-chung-01112026).
  Code/QA local đã pushdev tới fdd06f5; online rollout/backupV12 và smokeV2 tiếp tục theoDEPLOYMENT.

## Gate tồn đọng — tổng hợp01/11

| Gate | Bằng chứng còn thiếu / điều kiện đóng |
|---|---|
| Rollout bản hiện hành | Chưa có xác nhận online candidateV6–V12 và frontend/backend đồng bộ; backup/counts/fingerprint/sequence trước migration, dừng ghi khi đổi payloadvariants; smoke origin/canonical/enquiry sau entryadmin và public, OWNER/STAFF/media/tồn/retry sau deploy |
| Backfill ảnh public |63ACTIVE media mới dryrunpending63, chưaapplyv2 đủ320/640×JPEG/WebP; verify MIME/magic/dimensions trước frontendpicture, không dùng checkpointJPEG640 cũ |
| Hiệu năng public |Lighthouse Mobile3run mỗi Home/detail cố định/wishlist; từngrun LCP≤2,5s/CLS≤0,1; detail lần đo online cuối FAIL, wishlist cóoutlier; sourcefix local chưa có đo lại online, cold Render/Neon đo riêng |
| Backup vận hành |Dump21sách/63mediarefs đãrestorelocal và nguồn63JPG verify; còn lịch backup/retention/người phụ trách/bản saooffhost và bằng chứng khôi phục theo chính sách đó; scratchrestore cũ đã xóa theo user |
| Rollback release |Chưa drill rollback app/schema/data có kiểm soát, đối chiếu ghi phát sinh và recovery media; dashboardrollback/localrestore đơn lẻ chưa đủ |
| Hardening/hosting |RuntimeDBrole tối thiểu/tách migrationrole, loginratelimit và review cấu hình runtime/secrets; quota/pool/connection/memory/load; productionVPS/Dokploy/privateJDBC/HTTPS chưa nghiệm thu, Render/Neon hiện là testhost |
| Quy mô/thiết bị/bàn giao |Bộ50–100listing tải/publicpaging chưa đủ bằng chứng (import100 không thay publicload); ghi rõ iPhoneSafari/AndroidChrome/in-app nào đã thử, smoke nhánh bị UI mới tác động; ownerdemo/thời gian nhập-tìm-sửa và hướng dẫn vận hành ngắn cần rà soát |
| Hiệu năng nhập/publish |QAhost cùngrevision/DBmedia cáchly;5vòng2/6ảnh warm, cold riêng, safeHAR/structuredtiming/Neonquota-pool-lock; local đã5vòng nhưng không thay targethost;1Minor edittiming thiếu selectedAt còndefer |
| Import online (ngoài gate MVP gốc) |V11receipt/V12category rollout/backuprestore; QAworkloadV1=100sách/500variants,V2=100sách/100variants trênQAhost: timeout/retry/peakheap-RSS/quota/lock; một mẫu local1,56s không đủ median/p95; quota hiện memory mỗiinstance |

Nguồn: [VERIFICATION](VERIFICATION.md#m5-pilot-và-link-hỏi-sách--28102026),
[DEPLOYMENT](DEPLOYMENT.md#rollout-contract-m5-chưa-chạy-online),
[hiệu năng nhập/publish](BOOK_PUBLISH_PERFORMANCE_VERIFICATION.md#gate-còn-mở),
[import](BOOK_IMPORT_VERIFICATION.md#gate-chưa-chạy).

## Thứ tự xử lý khi quay lại nghiệm thu

1. Chuẩn bị backup/restore và kế hoạch rollback; rollout backend/migration/backfill
   rồi frontend tương thích theo DEPLOYMENT, user merge/deploy theo workflow.
2. Smoke bảo mật/dữ liệu/SEO và hoàn tất recovery/hardening cần cho release.
3. Sau khi UI ổn định, đo lại Lighthouse/thiết bị/publicload trên bản cuối để tránh
   đo lại nhiều lần. TargetQA upload/import tiếp tục là các gate riêng.
4. VPSQA chỉ đối chứng nếu vẫn chậm sau đo Renderwarm; parallel upload/eagerasync,
   giảmderived hoặc collection-heavy batching chưa là việc bắt buộc phải triển khai.

## Tài liệu cần đọc và Git

- [MASTER_PLAN](MASTER_PLAN.md#9-definition-of-done--nghiệm-thu-mvp): DoD và giới hạn;
  [DESIGN](DESIGN.md): UX hiện hành; [DATA](DATA.md): field và tồn/biến thể.
- [CATALOGUE](CATALOGUE.md) giữ contract quản trị/media hiện hành; các spec/plan
  M2/M5/hiệu năng cũ đã gộp/gỡ01/11. Chỉ theo gate chưa xong ở bảng trên và
  [DEPLOYMENT — quy trình đo](DEPLOYMENT.md#quy-trình-đo-qa-còn-phải-thực-hiện).
- [BOOK_IMPORT](BOOK_IMPORT.md)/[BOOK_IMPORT_VERIFICATION](BOOK_IMPORT_VERIFICATION.md):
  contract/schema/hướng dẫn/bằng chứng và gate rolloutV11.
- Chỉ commit/pushdev; user merge main/deploy. Không đọc/mutate live trong lần tổng
  hợp này, không kiểm quota hoặc tái xác minh revision/schemaonline; không coi
  trạng thái từ phiên trước là kiểm tra live01/11.
