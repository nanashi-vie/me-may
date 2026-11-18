# Frontend Mẹ Mây

Ứng dụng Angular phục vụ catalogue public và các màn hình admin. SSR và
định tuyến API qua Cloudflare Workers được cấu hình trong repo. Môi trường
và cách khởi động backend ở [runbook local](../../docs/runbooks/LOCAL.md).

Chạy từ `code/frontend` sau khi cài dependency theo lockfile:

| Lệnh | Kết quả |
|---|---|
| `npm start` | Dev server tại localhost:4200, chuyển API qua proxy local |
| `npm test` | Vitest chạy một lượt |
| `npm run build` | Build ứng dụng và SSR |
| `npm run build:workers` | Build cấu hình Workers |
| `npm run check:workers:proxy` | Kiểm tra proxy của Worker |

[Thiết kế public/admin](../../docs/product/DESIGN.md) ·
[Kiến trúc và cache](../../docs/context/ARCHITECTURE.md) ·
[Chỉ mục dự án](../../docs/README.md)
