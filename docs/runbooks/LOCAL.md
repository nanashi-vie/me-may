# Chạy Mẹ Mây trên máy phát triển

## Chạy local, kiểm tra và Auth M1

- Yêu cầu local: Java 21, Node 22.12+ (nhánh 22), npm và container PostgreSQL local (`localhost:5432`) với hai database tách biệt `me_may_dev` (ứng dụng) và `me_may_test` (integration test, role `me_may_app`). Credential đặt tại root `.env` (`0600`, Git ignored; mẫu ở `.env.example`).
- Chạy backend local (từ root): `bash code/backend/run-local.sh` (`http://127.0.0.1:8080`, health `/actuator/health`). Integration test + JAR: `bash code/backend/run-local.sh -B -ntp verify` (chỉ chạy trên `me_may_test`).
- Chạy frontend dev/test (từ `code/frontend`): `npm ci && npm start` (`http://127.0.0.1:4200`, giữ cùng hostname `127.0.0.1` cho cookie session), `npm test`, `npm run build`, `npm audit`. Node SSR local: `PORT=4000 npm run serve:ssr:me-may-web` rồi `node scripts/check-ssr.mjs http://127.0.0.1:4000`.
- Workers local (từ `code/frontend`): `npm run dev:workers` (`http://127.0.0.1:8787`, dùng `wrangler.local.jsonc`), kiểm bằng `node scripts/check-ssr.mjs http://127.0.0.1:8787` và `npm run check:workers:proxy` (probe workerd `8788`/`9231`, mock backend).
- Trên `me_may_test` với `CLOUDINARY_NAMESPACE=memay/test`, hai ca `MediaLiveTest` và `CloudinaryLiveTest` dùng cờ `MEMAY_LIVE_MEDIA_TEST=true`. Ca `CloudinaryVariantLiveTest` dùng cờ riêng `MEMAY_LIVE_VARIANTS_TEST=true`.
- Auth/API M1 (session in-memory 30 phút, cookie `HttpOnly`/`SameSite=Lax`, `Secure=true` ngoài profile local; cấp owner bằng `python3 scripts/deploy/create_owner.py` với `--target local`):
  - `GET /api/v1/auth/csrf` (`{headerName, token}`, `no-store`)
  - `POST /api/v1/auth/login` (form-urlencoded `username`, `password` + CSRF → user DTO hoặc `401`)
  - `GET /api/v1/auth/me` (user hiện tại hoặc `401` JSON)
  - `POST /api/v1/auth/logout` (CSRF mới sau login → `204`, hủy session/cookie)
  - `GET /api/v1/admin/access` (kiểm tra `OWNER`/`STAFF`) và `GET /api/v1/admin/owner-access` (chỉ `OWNER`, `STAFF` trả `403`)
