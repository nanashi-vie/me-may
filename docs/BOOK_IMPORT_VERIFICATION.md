# Kiểm chứng import CSV/XLSX

Ngày31/10–01/11/2026, code candidate dev7aa8679; kiểm local, không deploy/migrate online.
[Contract](BOOK_IMPORT.md), [schema file](DATA.md#format-file-import--contract-duyệt31102026),
[rolloutV11/gate](DEPLOYMENT.md#import-csvxlsx--v11). Không nghiệm thu toàn bộ MVP.

## Kiểm tự động đã chạy

| Kiểm tra | Lệnh/nơi chạy | Kết quả |
|---|---|---|
| Backend sau reviewfix | root: `bash code/backend/run-local.sh -B -ntp clean verify` |160run,0failure,0error,3live-provider skips |
| Frontend sau reviewfix | code/frontend: `npm test` |165/165,37files |
| Node SSR | code/frontend: `npm run build` |PASS |
| Workers | code/frontend: `npm run build:workers` |PASS |
| Proxy | code/frontend: `npm run check:workers:proxy` |PASS POST/query/cookie/CSRF/multipart/separate Set-Cookie/server-time/no-store/context/backend-down |
| SSR checker | code/frontend: `node scripts/check-ssr.mjs` với origin4009 và QA config |PASS HTML/OG/private routes/4media variants/MIME/magic/no-store/2–6photos |

Parser/validation: CSV quote/comma/multiline/BOM/ISBN0 đầu; reorder headers/rows,
XLSX semantic parity, missing/duplicate/unknown columns, required blank/optional blank,
nhóm lệch/biến thể trùng/tồn0, enums/số/collection inactive, limits và malformed workbook.
Formula/date/boolean/error/macro/external links/ZIP inflate/shared-string budgets bị chặn;
không evaluate/fetch URL. CSV các ô toàn rỗng được bỏ như Excel.

API/domain: preview không ghi DB;1000issue cap; OWNER/STAFF/CSRF/no-store;
413/409/422/429 và permitrelease; fingerprint/idempotency concurrent haiOWNER;
retryreceipt không ghi đè sách sửa/tồn hoặc lỗi vì collection về sau inactive;
import0ảnh ARCHIVED/publishedAtnull→thiếuBACK chặnpublish→đủảnh publish;
public hidden/media404, timestamp đầu giữ khi ẩn/hiện, version409/STAFF403.

Frontend: route import đứng trước:id, retainedFile, stale file/auth/response/destroy,
exactretry pair, auxiliary errors không mở khóa commit, fileHTML chỉ plain text;
realAuthService/HttpTestingController xác nhận loginBusy và supersededcallback.
Đổi file giữa request và các race lifecycle được kiểm ở unit; không gọi đó là browserproof.

## Browser QA thật — scratch riêng

Docker PostgreSQL18.4 `me_may_import_qa`, copied candidate API8088/NodeSSR4009;
account OWNER/STAFF giả, ảnhPNG640×800 giả; Cloudinary `memay/test` authenticated.
Không dùng sách/ảnh bán thật hoặc dữ liệu khách.

| Ca | Kết quả thực tế |
|---|---|
| Thiếu ngon_ngu |1issue, không cho xác nhận; chọn file đúng rồi kiểm lại được |
| CSV100nhóm/500biến thể |Preview hợp lệ, confirm201 tạo100sách Ẩn |
| CSV1sách/2biến thể |MM-000101, stock2+1=3; refresh/chọn lại trả cùng receipt |
| XLSX mẫu website |Tải `me-may-sach.xlsx`, điền cùng dữ liệu CSV; preview trả cùng sách101 |
| Mất phản hồi import |Fetch thật commit303 rồi giả lập lỗi mạng; nút retry trả200/cùngID303 |
| Hết phiên/reauth |401→đăng nhập lại→kiểm mà không chọn lại file→cùng receipt303 |
| Ảnh và xuất bản sách101 |Thêm2ảnh/save/publish; media404 trước,200 sau; ẩn/hiện giữ publishedAt |
| Tồn/variants |Hai biến thể về0→SOLD, phục hồi1+2→tổng3 |
| Admin preview |Thumbnail decode320×400, viewer640×800 theo nguồn640, Escape đóng |
| Mobile |390×844 không overflow ngang |
| Manual2/6ảnh |Sách304 có2ảnh,305 có6ảnh; PUBLISHED/stock1; mất phản hồi final6ảnh retry cùngID305 |
| STAFF |Không linkimport, directroute redirectlist, directmultipartAPI403 |

Ca lostresponse đầu dùng Playwright route.fetch khiến multipart mất bytes, backend422
empty_file đúng; đổi giả lập tại fetchresponse sau realcommit. Lần XHR không phù hợp
vì Angular dùng withFetch; không coi đó là sản phẩm fail. Nhiều lần thử quota429 đúng;
restart riêngQA để tiếp tục, không đổi limit/source. Reauth thành công nhưng notice
bị auth-epoch effect đổi sang “Phiên đăng nhập đã đổi…”; kiểm receipt/file xác nhận
hành vi thay vì phụ thuộc đúng một câu notice. Một số selector QA dùng nhãn quá chặt
đã sửa theo DOM; không thay productcode để chiều harness.
Các lỗi401/ERR_FAILED từ fault injection là dự kiến; không tuyên bố console sạch.

## Workload và giới hạn kết luận

Một mẫu local100sách/500variants, không Cloudinary trong import:

| Chỉ số | Giá trị |
|---|---|
| Chọnfile→preview |120ms |
| Confirm request |1559,496ms |
| Clickconfirm→receipt |1686ms |
| Tổng thao tác |1835ms |
| Backend request |1550,921ms |
| SQL executions/connections |2106/3 |
| JVM usedheap trước/sau snapshot |101366KiB→106226KiB; heapcommitted122880KiB |

Heap là snapshot, không peak/RSS, không đại diện ngân sách Render. Startup API local
3,268s là thời gian khởi động ứng dụng, không baseline cold Render/Neon.
Không đủ mẫu median/p95, không kết luận nút thắt hoặc tốc độ trên targethost.

Rollback fullsize: QA constraint chặn sách cuối của lô100/500; confirm500, trước/sau
book_copy101/listing101/book_variant502/audit_event101/book_import_batch2/book_import_item101
không đổi. Gỡ constraint scratch rồi retry201 tạo100sách; replay200 cùngreceipt.
Preview57,51ms, rollback1365,03ms, retry737,85ms, replay11,69ms (mỗi ca một mẫu).
Sequence bỏ số102–201 sau rollback đúng contract, không hứa mã liền nhau.

## Review và cleanup

Một fresh-context review toànbranch81f1c09..4cf13de:0Critical/2Important/0Minor.
Một fixpass7aa8679, RED→GREEN cho CSVblankrows và login epoch/pendinglock/recovery;
fullbackend/frontend/builds đều chạy saufix. Không rereview, không deferredminor.

Đã ẩn3listing QA đangpublic, đóng browserbook-import, dừng ownAPI8088/SSR4009;
destroy đúng10publicID `memay/test/<UUID>` từ scratch hiện tại, provider DELETED10/10.
User yêu cầu dọn DB tạm các phiên trước; ownership đối chiếu DEV_LOG S010/S022/S023/
M5/entry/performance và marker scratch. Đã DROP đúng7DB:

- me_may_entry_qa
- me_may_import_qa
- me_may_m5_qa
- me_may_m5_s022_restore
- me_may_m5_s023_restore
- me_may_performance_qa
- me_may_restore_test

Chỉ còn me_may_dev/me_may_test/postgres. Bản S023 có2kết nối DBeaver idle được đóng
khi drop theo yêu cầu cleanup; không có request ứng dụng đang chạy trên DB đó.
Không destroy media tham chiếu trong restoreDB vì chứa ảnh production; không xóa
backupdump hoặc DB Neon. Bằng chứng restore lịch sử vẫn hợp lệ, DBscratch đã bỏ.
SafeJSON/cleanupIDs/executionledger/rulings được giữ ignored `.local/book-import/`;
không giữ file/tokens/ảnh/customerdata trong log ứng dụng hoặc commit.

## Gate chưa chạy

RenderQA/Neon warm/cold5vòng, peakheap/RSS/quota/timeouts/locks, V11 migrate/restore
và browser online chưa chạy; cần user rollout QA cách ly theo DEPLOYMENT.
Không mở lại test chốtMVP đã tạm gác, không tự merge main hoặc deploy.

## ImportV2 và thể loại chung —01/11/2026

Candidatecode9852a55..b0d23a8, triển khai local; user yêu cầu bắt đầu V2 và bổ sung
hai thểloại trong cùng phiên. Không migrate/deployonline. Dùng PostgreSQLtest cóguard
hiện có, không tạo DBscratch hoặc assetCloudinary mới. Workbookuser giữ nguyên
SHA256d5568d738df71ab5727131b7b5c476c7ed8622dc30a403e481e473c964d5a590.
Fixturetest là copy header-only/dropdowns hàng2 đã chỉnh, không là sách bán thật.

| Kiểm đã chạy | Kết quả |
|---|---|
| Backend root `bash code/backend/run-local.sh -B -ntp clean verify` |178run,0failure,0error,3live-provider skips |
| Frontend root `npm --prefix code/frontend test` |169/169,37files |
| NodeSSR và Workersbuild |PASS |
| `npm --prefix code/frontend run check:workers:proxy` |PASS workerd POST/query/cookie/CSRF/multipart/separateSetCookie/server-time/no-store/context/backend-down |
| Browser Angular thật, API mô phỏng |XLSXinput/guide16field/defaults/source-rowpreview/receipt-editorlink/mobile390×844 khôngoverflow PASS |
| V2 end-to-end domain với fakeprovider |ImportẨn→2ảnh→thêm biếnthể/tổng3→publish/media404trước200sau→receipt retry giữ edits PASS |

RED→GREEN mới: V2header/template20→16; fingerprintversionconfirm409→201 và
referencepreview schema1→2; taxonomy6→8/migrationgiữdata; URLfilterbỏcode mới→giữ;
V2previewR001→số dòng thật; taxonomyageen-dash bị từchối→knownaliases.

V1goldendigest7eeb28ad04e84becf333f10f1960783d696d9eb76fbe63417e340d3699f992fc
không đổi, V1commit/replay vẫnschema1/cùngreceipt cùng vớiV2schema2.
Hai dòngV2giống nhau tạo2sách/2variants mặcđịnh1, khônggộp; đổi header/roworder,
CSV/XLSX hoặc label/code trongcùngschema trả cùngfingerprint. Replay sau sửa tồn9
không overwrite; referenceerror/STAFF403/rollbacklỗi sáchcuối không ghi mộtphần.
Workbookuser/aliasF1,8categorylabels,2bindinglabels,2grades,4ages/7levels,
optionalblank/missingrequired/unknownlabels/dupealiases/extraXLSXdata/formula và
100/101CSVrows được kiểm. Reader budgets và V1security regressions giữ PASS.

V12: Tập đọc/READING_PRACTICE và Nấu ăn - thủ công - activity book/
COOKING_CRAFT_ACTIVITY append sort6/7. TestV11→12 giữ6categorycũ và existingbook/listing,
taxonomy public/admin đúngnhãn; manualsave/publish/publicfilter2code PASS.
Không sửaV3, sáchcũ, IDs, userworkbook hoặc API quyền. Dropdownfilegốc vẫn6mục
chủ đãthiếtlập; API/app nhận8thểloại, danh sáchExcel phải chỉnh trong file nếu cần.

Một freshreview read-only:0Critical/0Important/1Minor, không rereview. Minor defer:
fixtureV2 chưa trực tiếp bỏcellXMLoptional hoặc dùng dòng thưa/noncontiguous để
kiểm errorrow. Reader đượcreviewđúng nhưng thiếu regression riêng cho input này;
không ghi coverageđó làPASS. Thêmtest trước khi refactor indexing tiếp theo.
Header-onlyV2 báoschema1 nhưng bị chặnemptyfile trước tạo; không ảnh hưởng đường
import dữ liệu, để metadata polishing sau. Samebatchreturnsreceipt là chủđích,
không dùng reimport để cộng tồn hoặc update sách.

Browsermock chỉ chứng minh UI/fileinput/transition, không giả là browser→realAPI
end-to-end. Luồng dữ liệu thật được kiểm qua APIintegration/PostgreSQL vàfakeprovider;
không chạy lại realCloudinary/labLighthouse/publicSSRchecker trong phiên này vì
không đổi publicdelivery/runtime. OnlineV12/V2 smoke và targetperf vẫn là gate.
Browser/SSR4009 riêng đãdừng trước bàn giao; safeledger/results giữ ignored tại
`.local/book-import-v2/`, owned planworkspace dọn sau khi Task4 hoàn tất.
