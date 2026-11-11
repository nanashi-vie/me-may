# Cloudflare Workers Builds — trigger production

Checkpoint 11/11/2026, đọc trực tiếp dashboard và GitHub; chỉ đọc, không đổi
cấu hình, không kích hoạt hook và không deploy production trong lần rà này.
Owner chọn tự kiểm tra ở lần merge dev→main tiếp theo.

## Bằng chứng

- Main hiện tại: `0f5ed735f6728865aef6cf49311c7603b3d6431e`, merge PR #36
  lúc 00:00:18 ngày 11/11 giờ Việt Nam (17:00:18 UTC ngày 10/11).
  So với `cd6dc3b`, có 33 file frontend đổi; commit message không có skip CI.
- Production build history không có build cho `0f5ed73`. Build Git gần nhất
  là `cd6dc3b`, build `7eead916-7677-4e1a-9fa2-a23a63786972`.
- Owner gọi deploy hook thành công: build
  `3570bcf6-67d2-4334-a971-d1df161df028`, version `ca091f47`, Ready.
  Hook chứng minh clone/build/deploy hoạt động; không chứng minh trigger Git.
- Dashboard: repo `nanashi-vie/me-may`, production branch `main`, Disable
  builds tắt, include `*`, exclude trống, root `/code/frontend`, deploy
  `npx wrangler deploy`. Build command trống là chủ ý: wrangler.jsonc có
  custom build `npm run build:workers`, không cần thêm lệnh build lần hai.
- GitHub App Cloudflare Workers and Pages vẫn installed, không suspended,
  có quyền repo. Không đổi quyền hoặc reinstall app trong lần kiểm tra.
- Check Cloudflare trên PR #36 là preview **dev** của `e2d5af9`, build
  `eeb7bc0b-fbf6-42e1-b4a0-a010735bff38`; không phải build production merge SHA.
- Sau push trong phiên này, `338fc12` tự tạo preview dev Ready 51s,
  build `0bf69fd4-59aa-4dcf-823c-c49a48d7afa2`, version `23007819`.
  Đây là bằng chứng Git integration hiện vẫn nhận push cho dev.
- Audit 7 ngày, Resource Product=builds và Action Type≠view, chỉ hiện 3
  thao tác tạo/xóa deploy hook. Không có lý do bỏ qua webhook trong audit này;
  không suy từ đó rằng mọi cấu hình lịch sử chắc chắn không đổi.

## Kết luận và giới hạn

Sự kiện merge main bị thiếu **trước khi tạo build**, vì vậy purge cache hoặc
sửa Angular không giải quyết điểm hỏng này. Chưa xác định webhook bị bỏ lỡ
ở GitHub hay Cloudflare xử lý trigger production không tạo build. Cần log
webhook của ứng dụng Cloudflare hoặc đối chứng sự kiện main mới để phân biệt.
Không gọi đây là lỗi đã sửa; không tự disconnect/reinstall app vì có thể ảnh
hưởng các repo/Worker khác và chưa có bằng chứng cần thiết.

Cloudflare công bố một sự cố Worker Builds 13:29–13:41 giờ Việt Nam ngày
11/11, sau thời điểm merge bị bỏ lỡ, nên không đủ căn cứ gán nguyên nhân cho
sự cố đó. Sự cố Event Subscriptions là luồng khác, không tự suy thành Git push.

## Lần merge tiếp theo — owner thực hiện

1. Merge dev→main theo workflow hiện có; ghi merge SHA và giờ merge.
2. Mở Worker me-may → Production → Deployments → Build history. Xác nhận
   có build do Git cho đúng **merge SHA**, không chỉ preview dev hoặc hook.
3. Nếu Ready, đối chiếu active version rồi mở lại form nhập sách. Với đợt
   Drive mới, backend V31 phải deploy trước frontend và smoke một sách nháp.
4. Nếu không có build, giữ merge SHA/thời điểm và xem GitHub checks của SHA
   đó. Hook chỉ là phương án triển khai thủ công; lưu bằng chứng thiếu build
   trước khi dùng hook. Cần Cloudflare hỗ trợ tra nhận webhook/trigger theo
   repo, Worker và mốc thời gian; không tạo empty commit chỉ để thử lặp lại.

Tài liệu chính thức: [Builds](https://developers.cloudflare.com/workers/ci-cd/builds/),
[watch paths](https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/),
[troubleshooting Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/#git-integration-issues),
[sự cố Builds 11/11](https://www.cloudflarestatus.com/incidents/byzl30zyfc47).
