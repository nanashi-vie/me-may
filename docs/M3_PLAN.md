# M3 local — implementation plan

> **For agentic workers:** Use superpowers:executing-plans, sequential tasks; TDD and verification-before-completion.

**Goal:** Public catalogue/detail/contact/SSR local; remove reading basis, retain optional video; add truthful Flash Sale.
**Architecture:** Existing Angular SSR app and Boot modular monolith/JDBC/PostgreSQL; authenticated Cloudinary media served through public visibility checks.
**Tech Stack:** Angular21.2, Boot4.1.1/Java21, PostgreSQL/Flyway, Cloudinary; no new dependencies.
**Spec:** User-approved M3 plan in conversation23/10/2026 and MASTER_PLAN/DESIGN; this plan records approved M3 decisions and Flash Sale addition.

## Global constraints
- Preserve6 pilot books/18 ACTIVE images; backup before new Flyway migration. Tests only me_may_test.
- No wishlist/order/payment/import/deploy; no invented promotion statistics. Audit/locking/RBAC remain mandatory.
- Public PUBLISHED only, ACTIVE media only, no-store HTML/API/media. Sold remains visible; Home prefers available.
- Reading basis removed from active contracts/storage; historical audit preserved. Video nullable HTTPS when supplied.
- M2 pilot still open; M3 authorized independently. docs index remains README, max 400 lines/file; DEV_LOG exempt.
- Flash Sale single editable campaign with startsAt/endsAt and per-book sale price; original price is current listing reference price. OWNER edits with campaign version and audit. No sold counts.
- Sale prices apply only while campaign is enabled and server time is in [start,end), published/available books only, salePrice < reference price. List/detail/contact use effective price. No frontend price authority.
- Contact URLs from environment, absent means unavailable; no placeholder link. User provides real links before contact acceptance.

## Review focus
- Archive/media changes never expose draft images; backend/image failures not mistaken for missing books.
- Expired sale and hidden/sold books never retain misleading sale price/CTA; server is price authority.
- URL filters, literal search, invalid pages, back/forward and races yield consistent results.
- SSR errors/status/meta and hydration match; no browser-only clipboard/timer execution on server.
- Existing books/media/audit/version and STAFF restrictions survive migration/features.

## Sequential tasks

### Task1: remove reading basis and keep video optional
**Files:** catalogue DTO/validation/mapper/command, listing entity, audit allowlist; admin form/models/editor; V4 migration and tests.
**Interfaces:** BookWrite/Update/Detail lose readingLevelBasis; readingVideoUrl remains string|null.
- [x] Write API/command and form tests: level without basis succeeds, field absent, video empty succeeds and invalid HTTPS rejected; migration column absent with prior data preserved.
- [x] Run tests RED before implementation.
- [x] Implement removal, new migration (never modify V2), adjust fixtures, clarify label; preserve historical audit JSON.
- [x] Run backend suite and frontend suite GREEN; commit code/docs checkpoint.

### Task2: public catalogue API and media
**Files:** catalogue/PublicCatalogueController/Service/Dtos; media public content service; auth GET whitelist; integration tests.
**Interfaces:** GET /api/v1/books?q&category&binding&age&sort&page (page0-based,size20 fixed); /books/{slug}; /books/{slug}/media/{role}; /taxonomy; /collections; /collections/{slug}; /home; /contact.
- [x] RED public API tests: PUBLISHED-only incl SOLD; ageOR+categoryAND; bindingALL normalization; literal q; sort tieIDdesc; stable page; draft/archive/media404; no internal DTO fields; no-store; anonymous reads/no anonymous admin mutations.
- [x] Implement parameterized JDBC queries and explicit DTO projection; collection active only. Empty real data returns empty, backend failure stays error.
- [x] Media through authenticated provider adapter, no signed URLs exposed; public can only fetch ACTIVE slot of PUBLISHED book. No-store including errors.
- [x] GREEN backend suite; commit/checkpoint.

### Task3: truthful Flash Sale + OWNER management
**Files:** V5 flash campaign/item migration; promotion controller/service/DTO/test; admin promotion page/API/tests.
**Interfaces:** GET /api/v1/flash-sale (campaign metadata/items while active); OWNER GET/PUT /api/v1/admin/flash-sale with version, enabled, startsAt,endsAt,items[{bookCode,salePriceVnd}]. Single campaign id1; version starts0.
- [x] RED tests: start/end boundaries, original/sale/effective prices, invalid schedule/price/duplicates, nonpublic/sold exclusion, OWNER-only, stale edit rollback/no audit, audit on success.
- [x] Implement DB constraints, transaction with locked campaign/version and audit. Edit reference price can invalidate discount; ignore invalid discount publicly rather than show negative reduction.
- [x] Public list/detail/sort/contact derive effective price from same DB clock evaluation; expose saleEndsAt/originalPriceVnd only during applicable sale.
- [x] Admin manual form selects books by code and sale amount; Asia/Ho_Chi_Minh labels, ISO timestamps; unsaved/error/stale protection.
- [x] GREEN backend/frontend suites, commit/checkpoint.

### Task4: public pages, metadata and enquiry
**Files:** frontend catalogue/home/detail components+public API/models; shared book-card/filter/gallery; public-layout; routes; page-metadata; contact dialog; tests.
**Interfaces:** /, /sach, /sach/:slug, /bo-suu-tap/:slug, /cach-mua, /lien-he. QueryURL q/category/binding/age repeated/sort/page (page1-based UI mapped API0-based).
- [x] RED tests public HTTP/route models: query normalization, resetpage, stale-response switchMap, failurevs404, title join, optional fields, price format, enquiry AVAILABLE/SOLD, clipboard fallback, no M4 controls.
- [x] Implement mobile-first catalogue and detail, accessible filter sheet/details desktop panel, manual pagination. Collection shares catalogue query UI.
- [x] Home approved banner/rows with real nonempty collections; Flash Sale directly below hero, original/sale/%/countdown, no sold counters. Timer updates browser only; at expiry refresh API, clear discount and show pending verification while fetch fails.
- [x] Zalo dialog copy/open manual fallback, no automatic send; env contact config server allowlist HTTPS Zalo links. Missing config explicit unavailable.
- [x] SSR fetch uses server-only backend origin, browser relative API. Correct initial content/meta/canonical/OG, no-store and real404/503 status, no admin cookies in public calls/cache.
- [x] GREEN frontend suite/build; commit/checkpoint.

### Task5: browser/SSR/data verification and handoff
**Files:** check-ssr.mjs; docs MASTER_PLAN/DATA/DESIGN/README/VERIFICATION/PROGRESS/DEV_LOG/index.
- [x] Backup/compare dev rows including6 books/18 photos, apply migrations via controlled backend restart only after tests. Never clean/reset dev database.
- [x] Backend suite/frontend suite/build; anonymous SSR HTML and404, metadata image, no-store, draft/hidden media, sort/filter and status refresh tests.
- [x] Browser mobile360/390 and desktop, keyboard/focus, gallery/contact/copy errors, admin regression; fixtures only isolated test environment.
- [x] Fresh whole-branch review, fix Important/Critical once with RED→GREEN; record residual limits.
- [x] Sync docs/check links/line limits/ignore/secrets; retain M2 plan while pilot open and M3 plan until all criteria transferred.

## Bàn giao23/10

Code/API/UI/SSR và review kỹ thuật đã hoàn tất local; frontend56 PASS, backend85 total/83 PASS/2 live skipped, build/JAR PASS. Migration bảo toàn6 cuốn/18 ảnh/audit/sequence; actual campaign mặc định tắt. Ngày24/10 user xác nhận bản hiện tại ổn định, duyệt merge main trước M4. Giữ plan khi tiêu chí chưa chuyển hết và Zalo thiết bị chưa có bằng chứng; pilot M2 còn6 cuốn, không đóng gate10–20. Không deploy/Cloudflare hoặc triển khai M4 trong lần tích hợp này.
