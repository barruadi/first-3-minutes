# Changelog dan Decision Log — 3MINUTES

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
