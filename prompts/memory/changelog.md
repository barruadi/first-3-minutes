# Changelog dan Decision Log — 3MINUTES

## 2026-07-16 — Domain 3 backend implementation

- Type: ARCHITECTURE | SECURITY | INTEGRATION
- Author/role: Domain 3 Coder
- Status: ACCEPTED
- Related tasks: Spatial AI, rating, resident reads, analytics, floor/location, QR/guest, PDF
- Context: Bootstrap routes and fixtures were replaced with database-backed implementation.
- Decision/change: Rating uses configurable weights 35/35/30, Platinum >=85, Gold >=70; Gemini uses official `google-genai` with default `gemini-3.5-flash`; admin scope remains server-side `DEMO_BUILDING_ID`; QR persists only a SHA-256 token hash.
- Reason summary: Complete demo critical paths while preserving camelCase contracts and anonymous identity.
- Impact Domain 1: Multipart fields are `scanId`, `installationId`, optional `locationId`, and exactly 15 JPEG files under `images`.
- Impact Domain 2: Completion sends existing `DrillMetrics`; rating/reward are server results.
- Impact Domain 3: Recreate the development schema once because bootstrap tables gained fields and indexes.
- Impact Domain 4: Admin endpoints now return real data/files; generated Guest URLs resolve real opaque tokens.
- Migration/action required: For an old demo database run `python -m app.fixtures.reset`; configure `QR_TOKEN_SECRET`, `GUEST_BASE_URL`, and optionally `GEMINI_API_KEY`.
- Verification: SQLite API/unit suite 24 passed; live PostgreSQL/Gemini/device checks remain.

## Tujuan

Dokumen ini mencatat perubahan yang perlu diketahui lintas agent:

- Perubahan requirement interpretation.
- Keputusan arsitektur.
- Contract change.
- Toolchain freeze.
- Migration.
- Perubahan ownership.
- Fix penting yang memengaruhi integration.

Perubahan lokal kecil cukup dicatat di commit/task dan scratchpad. Changelog tidak perlu berisi setiap edit styling.

## Format entry

```markdown
## YYYY-MM-DD HH:mm — <judul>
- Type: PRODUCT | ARCHITECTURE | CONTRACT | ENVIRONMENT | INTEGRATION | SECURITY | FIX
- Author/role:
- Status: PROPOSED | ACCEPTED | SUPERSEDED | ROLLED_BACK
- Related tasks:
- Context:
- Decision/change:
- Reason summary:
- Impact Domain 1:
- Impact Domain 2:
- Impact Domain 3:
- Impact Domain 4:
- Migration/action required:
- Verification:
```

Jangan mencatat private chain-of-thought. `Reason summary` berisi alasan singkat yang dapat dibagikan.

---

## Initial decisions

## 2026-07-16 — Product scope baseline

- Type: PRODUCT
- Author/role: Product owner specification
- Status: ACCEPTED
- Related tasks: All
- Context: Empat domain bekerja dalam hackathon 30 jam.
- Decision/change: Seluruh product backlog wajib dipertahankan dan diimplementasikan end-to-end.
- Reason summary: Repository agentic dibuat agar setiap anggota memiliki konteks, role, skill, dan contract yang jelas.
- Impact Domain 1: Full Resident flow wajib.
- Impact Domain 2: Full shelter dan escape drill wajib.
- Impact Domain 3: Full backend/AI/rating/analytics/QR/PDF wajib.
- Impact Domain 4: Full Admin dan Guest WebAR wajib.
- Migration/action required: Tidak ada.
- Verification: PRD traceability matrix.

## 2026-07-16 — QR scope correction

- Type: PRODUCT
- Author/role: Product owner specification
- Status: ACCEPTED
- Related tasks: PRD-07, PRD-08
- Context: QR harus dapat dipindai orang random/traveler.
- Decision/change: QR hanya digunakan untuk Guest/Traveler dan bukan mekanisme wajib pekerja.
- Reason summary: Traveler membutuhkan frictionless access tanpa akun; pekerja terhubung melalui account/building context.
- Impact Domain 1: Tidak ada worker QR flow.
- Impact Domain 2: Tidak ada QR dependency.
- Impact Domain 3: QR token resolves guest location.
- Impact Domain 4: Admin provisions guest QR; Guest opens without login.
- Migration/action required: Hapus wording worker mandatory QR bila ditemukan.
- Verification: UI copy dan E2E Guest.

## 2026-07-16 — Technology baseline

- Type: ARCHITECTURE
- Author/role: Product owner specification
- Status: ACCEPTED
- Related tasks: All bootstrap
- Context: Platform terdiri dari mobile, API, portal, dan Guest WebAR.
- Decision/change: React Native untuk Resident, FastAPI untuk backend, React untuk Admin, WebAR/WebXR untuk Guest, Gemini untuk spatial mapping.
- Reason summary: Teknologi sudah ditentukan oleh scope produk.
- Impact Domain 1: React Native.
- Impact Domain 2: Module di project React Native.
- Impact Domain 3: FastAPI/Gemini.
- Impact Domain 4: React + WebAR.
- Migration/action required: Pin exact versions setelah clean boot.
- Verification: Runtime matrix.

## 2026-07-16 — Visual palette

- Type: PRODUCT
- Author/role: Product owner specification
- Status: ACCEPTED
- Related tasks: Design implementation
- Context: Palette design lama diganti.
- Decision/change: Brand menggunakan `#0A2947`, `#F3E4C9`, `#D3D4C0`, `#8B5E3C`.
- Reason summary: Palette final yang disetujui tim.
- Impact Domain 1: Mobile tokens.
- Impact Domain 2: Brand overlays; functional safety color remains contextual.
- Impact Domain 3: Tidak ada UI utama.
- Impact Domain 4: Admin/Guest tokens.
- Migration/action required: Hapus old palette hardcode.
- Verification: Design QA.

## 2026-07-16 — Agentic repository structure

- Type: ARCHITECTURE
- Author/role: Documentation setup
- Status: ACCEPTED
- Related tasks: Agent bootstrap
- Context: Tim membutuhkan role, skill, dan state yang lebih terstruktur.
- Decision/change: Repository menggunakan config/docs/agents/skills/memory dengan Orchestrator, Architect, four Coders, Reviewer, dan QA.
- Reason summary: Memisahkan keputusan, eksekusi, review, dan verification agar pekerjaan paralel konsisten.
- Impact Domain 1: Prompt dan skill domain tersedia.
- Impact Domain 2: Prompt dan skill domain tersedia.
- Impact Domain 3: Prompt dan skill domain tersedia.
- Impact Domain 4: Prompt dan skill domain tersedia.
- Migration/action required: Gunakan source priority pada README.
- Verification: Seluruh file tersedia.

---

## Pending ADRs

Architect harus mengisi keputusan berikut setelah repository/device inspection:

### ADR-001 — JavaScript Package Manager

- Status: ACCEPTED
- Keputusan: npm workspaces, Node.js 20 LTS, satu `package-lock.json`. pnpm, Yarn, dan Bun ditolak.

### ADR-002 — Resident Mobile Runtime

- Status: ACCEPTED
- Keputusan: React Native + Expo Development Build, Expo Prebuild/CNG, `@reactvision/react-viro`, ARKit, iPhone physical device. Expo Go tidak digunakan untuk AR; build iOS dari Windows memakai EAS.

### ADR-003 — Sensor capability fallback

- Status: PROPOSED
- Keputusan: LightSensor dan camera luminance harus diverifikasi melalui capability spike; unsupported device menghasilkan state jelas.

### ADR-004 — Anonymous Demo Identity dan Admin Scope

- Status: ACCEPTED
- Keputusan: Tidak ada auth, login, JWT, session, password, atau user account. Resident memakai `installationId` anonim untuk persistensi perangkat. Admin memakai `DEMO_BUILDING_ID` dari settings server. Guest memakai opaque QR token untuk resolve lokasi, bukan autentikasi.

### ADR-005 — Exact rating weights dan tier thresholds

- Status: PROPOSED
- Keputusan: TBD; harus server-side tanpa mengubah PRD.

### ADR-006 — Upload/temp storage dan file retention

- Status: PROPOSED
- Keputusan: TBD

### ADR-007 — Guest AR marker/origin provider

- Status: PROPOSED
- Keputusan: marker image menjadi origin `(0,0,0)`; WebXR hanya progressive enhancement; kamera overlay menjadi fallback.


## Final repository layout: prompts/backend/frontend

- **Decision:** Repository menggunakan root `prompts/`, `backend/`, dan `frontend/`.
- **Reason:** Menyesuaikan struktur repository tim yang sudah ada dan mengurangi migrasi folder yang tidak memberi nilai pada hackathon.
- **Frontend runtimes:** `frontend/resident-mobile`, `frontend/admin-portal`, `frontend/guest-webar`.
- **Shared packages:** `frontend/packages/contracts` dan `frontend/packages/design-tokens`.
- **Backend:** `backend/`.
- **Agentic documents:** `prompts/`.
- **Package manager:** npm workspaces dengan `package-lock.json` tunggal.
- **Impact:** Seluruh path pada prompt, skill, environment, ownership, dan bootstrap telah diperbarui. Requirement produk dan kontrak logis tidak berubah.

## 2026-07-16 — Anonymous hackathon runtime

- Type: ARCHITECTURE
- Author/role: Product owner decision
- Status: ACCEPTED
- Related tasks: Bootstrap, ARCH-001, D1, D3, D4
- Context: Hackathon tidak memerlukan akun atau login.
- Decision/change: Hapus auth, login, JWT, session, password, users, dan building memberships. Resident memakai `installationId` anonim untuk persistensi demo; Admin memakai `DEMO_BUILDING_ID` server-side; Guest memakai opaque QR token hanya untuk resolve lokasi.
- Reason summary: Mengurangi kompleksitas implementasi tanpa memutus alur demo resident, admin, dan guest.
- Impact Domain 1: Kirim dan simpan `installationId` anonim bila memakai profile/history.
- Impact Domain 2: Tidak ada perubahan gameplay.
- Impact Domain 3: Hilangkan middleware auth dan gunakan `device_profiles`.
- Impact Domain 4: Hapus login/protected route; Admin langsung membuka dashboard demo.
- Migration/action required: Kontrak, migration, fixture, dan QA tidak boleh membuat route/token auth.
- Verification: Bootstrap check dan contract tests setelah implementasi.

## 2026-07-16 — Domain 1 resident scan and read-model implementation

- Type: INTEGRATION
- Author/role: Coder Domain 1
- Status: ACCEPTED
- Related tasks: D1 scan pipeline, resident home, rewards, history, accessibility adapter
- Context: Bootstrap mobile screens were placeholders and used a hard-coded demo resident identity.
- Decision/change: Domain 1 now persists an anonymous installation ID, calls the existing `/api` contracts, validates spatial/rating responses, and hands a validated in-memory SpatialMap to Domain 2. Scan processing uses 15 target timestamps from 3,000 through 45,000 ms and retains all 15 frames while enforcing a 4 MB aggregate budget.
- Reason summary: Implements the resident-owned vertical slices without moving rating/reward decisions to the client or changing frozen shared contracts.
- Impact Domain 1: Real camera/file/TTS pipeline and production-like data states are available pending device verification.
- Impact Domain 2: Consume `spatialSession` and `accessibilityGuidance`; no navigation ownership change.
- Impact Domain 3: Mobile targets the frozen `/api` surface; real rewards/history data remains a backend dependency.
- Impact Domain 4: None.
- Migration/action required: Run npm install to produce/update the single root lockfile, then typecheck/Jest and test on the iPhone Development Build.
- Verification: `git diff --check` passed; dependency install and device verification remain open and are not claimed.

---

## 2026-07-16 — Bootstrap scaffold selesai

- Type: ARCHITECTURE
- Author/role: Bootstrap Engineer (00-bootstrap-engineer)
- Status: ACCEPTED
- Related tasks: BOOT-001
- Context: Repository garudahacks7.0-public dimulai dari nol (hanya README.md).
- Decision/change: Seluruh fondasi dibuat sesuai spesifikasi 00-bootstrap-engineer.md.
- Reason summary: Empat domain perlu fondasi bersama sebelum implementasi paralel.
- Impact Domain 1: `frontend/resident-mobile/` scaffold siap — screens, navigation, API client, permissions.
- Impact Domain 2: `src/features/drill/` dan `src/test-harness/sensors/` scaffolded sebagai integration surface.
- Impact Domain 3: `backend/` scaffold siap — FastAPI, SQLAlchemy models, Pytest, fixture seed, placeholder routes.
- Impact Domain 4: `frontend/admin-portal/` dan `frontend/guest-webar/` scaffold siap — semua routes, pages, components.
- Migration/action required: Jalankan `npm install` dan `npm run docker:up && cd backend && python -m app.fixtures.seed`.
- Verification: `npm run bootstrap:check`, `pytest tests/`, `npm run test:js`

## 2026-07-16 — Toolchain versions fixed

- Type: ENVIRONMENT
- Author/role: Bootstrap Engineer
- Status: ACCEPTED
- Related tasks: BOOT-001
- Context: Exact versions ditentukan saat bootstrap.
- Decision/change:
  - Node.js: 20 LTS (`.nvmrc`)
  - Python: 3.12 (`.python-version`)
  - Expo SDK: 51
  - Vite: 5.x
  - React: 18
  - Three.js: 0.166
  - Zod: 3.x
  - SQLAlchemy: 2.x
  - FastAPI: 0.111+
- Reason summary: Freeze eksplisit mencegah version drift antar domain.
- Impact Domain 1: Expo SDK 51 menentukan versi React Native (0.74.x) dan dependencies.
- Impact Domain 2: @reactvision/react-viro BELUM dipin — perlu capability spike.
- Impact Domain 3: psycopg 3 (bukan psycopg2) — gunakan `postgresql+psycopg://` di DATABASE_URL.
- Impact Domain 4: Three.js 0.166 — gunakan `@types/three` yang sesuai.
- Migration/action required: Jangan upgrade major versions tanpa approval Architect.
- Verification: `npm run typecheck` dan `pytest` pada versi terinstall.

## 2026-07-16 — Stack confirmation: React Native, bukan all-web WebXR

- Type: PRODUCT
- Author/role: Product owner (dikonfirmasi via review pra-Phase 2)
- Status: ACCEPTED
- Related tasks: PRD-01, PRD-03, PRD-04, ASM-001
- Context: Kolom Notes pada `First3Minutes - product-backlog.csv` (PRD-01) berisi "Using all web, not flutter/react native; instead using webxr". Catatan ini bertentangan dengan seluruh `prompts/` dan hasil bootstrap yang sudah memakai React Native. File CSV belum ter-commit dan dimodifikasi setelah commit scaffold, sehingga catatan tidak dapat diasumsikan usang tanpa konfirmasi.
- Decision/change: Resident Mobile tetap React Native + Expo Development Build. Catatan CSV all-web/WebXR DITOLAK untuk Domain 1 dan Domain 2. Guest WebAR (Domain 4) tetap berbasis web sesuai PRD §9 — keputusan ini tidak mengubahnya.
- Reason summary: Target demo adalah iPhone fisik. iOS Safari tidak mendukung WebXR `immersive-ar`, sehingga jalur all-web akan menghilangkan PRD-03 dan PRD-04. ARKit juga diperlukan untuk floor plane, posture estimation, dan hardware-validated compliance yang menjadi diferensiasi produk (PRD §3.3).
- Impact Domain 1: Tidak ada perubahan. Lanjutkan scan pipeline di React Native.
- Impact Domain 2: Tidak ada perubahan. ARKit via `@reactvision/react-viro` tetap baseline; capability spike masih WAJIB.
- Impact Domain 3: Tidak ada perubahan.
- Impact Domain 4: Tidak ada perubahan. Guest WebAR tetap marker-based web, bukan `immersive-ar`.
- Migration/action required: Commit file CSV ke git agar seluruh anggota melihat backlog yang sama. Catatan CSV yang bertentangan dengan `prompts/docs/prd.md` mengikuti urutan sumber kebenaran pada `prompts/README.md`.
- Verification: Konfirmasi eksplisit product owner; target device iPhone fisik.

## 2026-07-16 — Demo device: iPhone fisik

- Type: ENVIRONMENT
- Author/role: Product owner
- Status: ACCEPTED
- Related tasks: ASM-001, D1-001, D2-001
- Context: ASM-001 ("device target mendukung provider AR terpilih") menunggu konfirmasi.
- Decision/change: Demo final berjalan pada iPhone fisik. ASM-001 ditutup.
- Reason summary: Menentukan baseline AR dan menghilangkan opsi all-web untuk drill.
- Impact Domain 1: Build lokal via `expo run:ios` menggunakan Xcode pada macOS. EAS Build dan Apple Developer Program berbayar TIDAK diperlukan untuk hackathon; personal team provisioning (7 hari) memadai. Catatan `prompts/config/environment.md` §3 yang mengasumsikan EAS "dari Windows" tidak berlaku untuk setup ini.
- Impact Domain 2: ARKit tersedia. Ambient light sensor iOS TIDAK tersedia — shelter darkness wajib memakai camera luminance sesuai `03-coder/domain-2` iOS sensor rules.
- Impact Domain 3: Tidak ada.
- Impact Domain 4: Guest WebAR diuji pada Safari iOS.
- Migration/action required: Pastikan Xcode terpasang dan iPhone terdaftar pada personal team.
- Verification: Device build terpasang; capability spike Domain 2.

---

## Phase 2 — Contract Freeze v1

## 2026-07-16 — Contract v1 FROZEN

- Type: CONTRACT
- Author/role: Architect (02-architect)
- Status: ACCEPTED
- Related tasks: ARCH-001, ACC-001
- Context: Empat domain akan dikerjakan empat orang secara paralel. Sebelum freeze, seluruh contract berstatus DRAFT dan beberapa tipe yang disebut prompt coder tidak ada di source code mana pun.
- Decision/change: `frontend/packages/contracts/**` dan mirror Pydantic `backend/app/schemas/**` dibekukan sebagai v1. Perubahan berikutnya memerlukan Contract Change Request pada `prompts/memory/change-requests/`.
- Reason summary: Consumer tidak boleh menebak bentuk data; producer dan consumer harus memvalidasi fixture yang sama.
- Impact Domain 1: `ResidentHomeResponse`, `DrillLaunchInput`, `DrillOutcome`, `AccessibilityMode` tersedia. Jangan membuat type lokal duplicate.
- Impact Domain 2: `DrillOutcome`, `DrillFailureReason`, `GuidanceEvent` tersedia. SpatialMap dijamin punya minimal satu safeZone dan satu exitPoint.
- Impact Domain 3: Mirror Pydantic wajib tetap identik. Enum tidak boleh dilonggarkan menjadi `str`.
- Impact Domain 4: `AnalyticsSummary`, `GuestRoute`, `ComplianceReportRequest`, `FloorPlan`, `GuidanceEvent` tersedia dan siap dikonsumsi.
- Migration/action required: Jalankan `npm run test:js` dan `pytest tests/` setelah install.
- Verification: `contracts.test.ts` dan `backend/tests/test_contracts.py` memvalidasi fixture yang sama.

### ADR-001 — Freeze AccessibilityMode dan GuidanceEvent (ACC-001)

- Status: Accepted
- Konteks: `architecture.md` §8.8 mendefinisikan `AccessibilityMode` dan `GuidanceEvent`, tetapi keduanya tidak ada pada file source mana pun. Tiga domain (1, 2, 4) membutuhkannya; tanpa freeze masing-masing akan membuat versi sendiri.
- Keputusan: Dibuat `contracts/src/schemas/accessibility.ts`. Ditambahkan `GUIDANCE_AUDIO_POLICY` dengan nilai debounce dan ducking yang dibekukan agar Domain 1 (Expo TTS) dan Domain 4 (browser speech) berperilaku sama.
- Alternatif yang dipertimbangkan: Membiarkan tiap domain mendefinisikan sendiri — ditolak karena menjamin divergence.
- Dampak Domain 1: D1-ACC-01 memakai `AccessibilityMode` + adapter TTS.
- Dampak Domain 2: D2-ACC-01 memancarkan `GuidanceEvent`; tidak memanggil TTS langsung.
- Dampak Domain 3: Tidak ada; event dihitung client.
- Dampak Domain 4: D4-ACC-01 memakai schema dan policy yang sama.
- Risiko: Nilai debounce/ducking mungkin perlu kalibrasi di device; perubahan nilai bukan breaking change struktural.
- Cara verifikasi: Unit test menolak action di luar enum (mis. `FOLLOW_GREEN_ARROW`).

### ADR-002 — DrillLaunchInput/DrillOutcome sebagai batas Domain 1 ↔ Domain 2

- Status: Accepted
- Konteks: Prompt coder Domain 1 menyebut "nama final mengikuti contract package" dan melarang type lokal, tetapi type tersebut tidak ada.
- Keputusan: `DrillOutcome` dibekukan sebagai discriminated union (`success` wajib membawa metrics; `failure` wajib membawa `DrillFailureReason` dari enum tertutup). `DrillLaunchInput` type-only karena memuat callback `announceGuidance`.
- Alternatif yang dipertimbangkan: `status` + optional metrics tanpa union — ditolak karena mengizinkan `success` tanpa metrics.
- Dampak Domain 1: Menerima outcome; satu-satunya pemilik submission metrics dan navigation.
- Dampak Domain 2: Mengembalikan outcome; tidak memanggil endpoint rating.
- Dampak Domain 3: Tidak ada.
- Dampak Domain 4: Tidak ada.
- Risiko: Rendah.
- Cara verifikasi: Test menolak `{status:'success'}` tanpa metrics.

### ADR-003 — ResidentHomeResponse menggantikan ResidentProfile sebagai response Home

- Status: Accepted
- Konteks: Backend memakai `ResidentHomeResponse`, TypeScript memakai `ResidentProfile`; keduanya tidak memuat last drill maupun status scan yang diwajibkan PRD §6.1 dan architecture §10.2.
- Keputusan: `ResidentHomeResponseSchema = ResidentProfileSchema.extend({ lastDrill, spatialReadiness })`. `ResidentProfile` dipertahankan sebagai komposisi, bukan response endpoint. Ditambahkan pula contract Rewards dan History (cursor pagination, urutan `completedAt` DESC).
- Alternatif yang dipertimbangkan: Membiarkan Domain 1 menggabungkan beberapa endpoint — ditolak, melanggar guardrail "Avoid N+1" dan memaksa kalkulasi client.
- Dampak Domain 1: Home/Rewards/History dapat dirender penuh dari response server.
- Dampak Domain 2: Tidak ada.
- Dampak Domain 3: Wajib mengisi `lastDrill` dan `spatialReadiness` pada `GET /api/resident/home`.
- Dampak Domain 4: Tidak ada.
- Risiko: Rendah.
- Cara verifikasi: Fixture `resident-home.valid.json` lulus di TypeScript dan Pydantic; test first-run resident (lastDrill null) lulus.

### ADR-004 — buildingId dihapus dari ComplianceReportRequest

- Status: Accepted
- Konteks: Contract mewajibkan `buildingId`, sedangkan architecture §10.6/§11 mewajibkan server SELALU memakai `DEMO_BUILDING_ID` dan mengabaikan scope client. Contract memaksa Domain 4 mengirim field yang wajib ditolak Domain 3.
- Keputusan: Field dihapus dari TypeScript dan Pydantic. Test membuktikan `buildingId` dari client di-strip, bukan dipakai.
- Alternatif yang dipertimbangkan: Mempertahankan field lalu mengabaikannya di server — ditolak karena contract akan mendokumentasikan perilaku yang salah.
- Dampak Domain 1: Tidak ada.
- Dampak Domain 2: Tidak ada.
- Dampak Domain 3: Endpoint tidak boleh membaca building scope dari body.
- Dampak Domain 4: Jangan mengirim `buildingId`.
- Risiko: Rendah.
- Cara verifikasi: `test_compliance_request_ignores_client_building_scope`.

### ADR-005 — Enum parity antara Pydantic dan Zod

- Status: Accepted
- Konteks: Inspeksi menemukan lima divergence: `SpatialObject.type`, `SafetyRating.tier`, `DrillCompletionResponse.tier`, `SpatialMap.source` bertipe `str` bebas di Pydantic sementara Zod memakai enum tertutup; `escape_route_trends` bertipe `list[dict]` tanpa validasi. Backend akan menerima `tier="Bronze"` tanpa terdeteksi contract test.
- Keputusan: Seluruh enum dipindahkan ke `app/schemas/common.py` sebagai `Literal` dan `contracts/src/schemas/common.ts` sebagai `z.enum`. `SpatialMap.source` kehilangan default `"fallback"`; pemanggil wajib menyatakan sumber secara eksplisit. `escape_route_trends` menjadi `EscapeRouteTrendPoint` dengan `period` ISO week.
- Alternatif yang dipertimbangkan: Membiarkan backend longgar — ditolak; menghilangkan gunanya contract test.
- Dampak Domain 1: Response server dijamin tier valid.
- Dampak Domain 2: `SpatialMap` dijamin memenuhi minimum safe/exit (validator Pydantic + refine Zod).
- Dampak Domain 3: Wajib memakai enum; jangan melonggarkan menjadi `str`.
- Dampak Domain 4: Trend period dijamin `YYYY-Www`.
- Risiko: Placeholder route lama yang mengirim nilai di luar enum akan gagal — itu memang tujuannya.
- Cara verifikasi: Test menolak `tier="Bronze"`, `source="chatgpt"`, `type="COFFEE_ZONE"`, `period="July"`.

### ADR-006 — Error code dan HTTP mapping dibekukan

- Status: Accepted
- Konteks: `03-coder/domain-3` mendaftar 13 error code minimum, tetapi tidak ada satu pun yang dikodekan sebagai contract bersama. Placeholder route memakai code di luar daftar (`INVALID_FRAME_COUNT`, `INVALID_MIME`, `INVALID_TOKEN`, `NOT_IMPLEMENTED`, `INTERNAL_SERVER_ERROR`).
- Keputusan: `ErrorCodeSchema` (TS) dan `ErrorCode` (Pydantic) memuat 13 code. `ERROR_HTTP_STATUS` membekukan mapping non-400. Envelope `ApiError` tetap memvalidasi `code` sebagai string longgar agar client tidak crash ketika server menambah code baru.
- Alternatif yang dipertimbangkan: Memvalidasi `code` sebagai enum ketat pada client — ditolak; menambah code akan menjadi breaking change.
- Dampak Domain 1: Error mapping terpusat memakai code stabil.
- Dampak Domain 2: Tidak ada.
- Dampak Domain 3: Placeholder code lama WAJIB diganti ke daftar frozen (lihat blocker BLK-003).
- Dampak Domain 4: Branching error memakai code frozen.
- Risiko: Rendah.
- Cara verifikasi: `test_error_http_mapping_is_frozen`; fixture error lulus `ErrorCodeSchema`.

### ADR-007 — Perbaikan FIXTURES_DIR pada backend contract test

- Status: Accepted
- Type: FIX
- Konteks: `backend/tests/test_contracts.py` memakai `parents[3]`, yang resolve ke `/Users/<user>/First3Minutes/frontend/...` — satu level DI LUAR repository. Seluruh test pada file tersebut selalu gagal `FileNotFoundError`. Artinya bukti "contract test lulus" pada bootstrap tidak pernah nyata.
- Keputusan: Diperbaiki menjadi `parents[2]`. Ditambahkan `test_fixtures_dir_resolves_inside_repository` sebagai guard agar regresi ini terdeteksi langsung.
- Dampak Domain 3: Contract test kini benar-benar berjalan.
- Risiko: Test yang sebelumnya "hijau karena tidak pernah jalan" dapat menampakkan kegagalan nyata.
- Cara verifikasi: `pytest tests/test_contracts.py -v` setelah venv dibuat.
