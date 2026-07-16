# Global Status — 3MINUTES

## Baseline keputusan

- Package manager: npm workspaces, Node.js 20 LTS, single `package-lock.json`.
- Mobile: React Native + Expo, Expo Development Build, Expo Prebuild/CNG.
- AR: `@reactvision/react-viro` + ARKit, iPhone physical device.
- API: seluruh HTTP interface camelCase; Python/database snake_case dengan alias conversion terpusat.
- Identity: tidak ada auth/login/account. Resident memakai `installationId` anonim; Admin memakai `DEMO_BUILDING_ID` server-side; Guest memakai opaque QR token.
- Bootstrap: satu Bootstrap Engineer pusat, lalu Bootstrap Reviewer.
- Guest: anonymous opaque token, marker-based tracking; WebXR hanya progressive enhancement.

## Gate sebelum domain coding

- Bootstrap/runtime smoke lulus.
- iOS Development Build terpasang pada iPhone.
- ViroReact AR capability spike lulus atau blocker eksplisit tercatat.
- Contract v1 dan fixtures dibekukan Architect.

## Backlog aksesibilitas suara

| ID | Owner | Task | Dependency |
|---|---|---|---|
| ACC-001 | Architect/D3 | Freeze `AccessibilityMode`, `GuidanceEvent`, dan GuestRoute hazard/safe-zone fields | contracts v1 |
| D1-ACC-01 | Domain 1 | Mode selector, persistensi pilihan, dan Expo TTS adapter | ACC-001 |
| D2-ACC-01 | Domain 2 | Guidance decision engine dari pose/route/hazard/posture/state | ACC-001 + ARKit spike |
| D4-ACC-01 | Domain 4 | Mode selector dan browser speech guidance pada Guest WebAR | ACC-001 |
| QA-ACC-01 | QA | Verifikasi audio utama tanpa ketergantungan pada UI visual | D1/D2/D4 completed |

---

# Checkpoint Phase 2 — 2026-07-16

Diperbarui oleh: Orchestrator (01) + Architect (02). Basis: inspeksi nyata, bukan asumsi.

## 1. Runtime matrix (terverifikasi)

| Runtime | Status | Command | Dependency hilang | Owner |
|---|---|---|---|---|
| Toolchain Node | BLOCKED | `nvm install 20 && nvm use 20` | Node aktif v25.2.1, `.nvmrc` meminta 20. nvm terpasang tanpa versi Node apa pun. | Semua |
| Toolchain Python | BLOCKED | `python3.12 -m venv .venv` | Python aktif 3.14.0, `.python-version` meminta 3.12. `python3.12` tersedia di `/opt/homebrew/bin/python3.12`. Belum ada venv. | Domain 3 |
| npm workspaces | IN_PROGRESS | `npm install` | `node_modules` dan `package-lock.json` BELUM PERNAH ada. Gate environment.md §16 belum pernah lulus. | Semua |
| Resident Mobile | NOT_CHECKED | `npm run start:mobile` | Menunggu install + device | Domain 1 |
| AR module | NOT_CHECKED | mengikuti mobile | `@reactvision/react-viro` belum terpasang; capability spike belum jalan | Domain 2 |
| API | NOT_CHECKED | `npm run dev:api` | venv + deps | Domain 3 |
| PostgreSQL | NOT_CHECKED | `npm run docker:up` | Docker 28.4.0 tersedia; container belum dijalankan | Domain 3 |
| Admin Portal | NOT_CHECKED | `npm run dev:admin` | Menunggu install | Domain 4 |
| Guest WebAR | NOT_CHECKED | `npm run dev:guest` | Menunggu install + cert mkcert | Domain 4 |

Catatan penting: status `SCAFFOLDED` pada scratchpad lama menyesatkan. Scaffold berarti file ada, bukan runtime pernah boot. Tidak ada satu pun runtime yang terbukti berjalan.

## 2. Contract status

| Contract | Owner | Status | File | Consumer |
|---|---|---|---|---|
| Coordinate3D / SpatialObject / Tier / ErrorCode | Architect | FROZEN v1 | `contracts/src/schemas/common.ts` | All |
| AccessibilityMode / GuidanceEvent | Architect | FROZEN v1 | `contracts/src/schemas/accessibility.ts` | D1/D2/D4 |
| SpatialMap (+ minimum safe/exit) | Architect/D3 | FROZEN v1 | `contracts/src/schemas/spatial.ts` | D1/D2 |
| DrillMetrics / DrillCompletionResponse | Architect/D3 | FROZEN v1 | `contracts/src/schemas/drill.ts` | D1/D2 |
| DrillLaunchInput / DrillOutcome | Architect | FROZEN v1 | `contracts/src/schemas/drill.ts` | D1↔D2 |
| ResidentHome / Rewards / History | D3 | FROZEN v1 | `contracts/src/schemas/resident.ts` | D1 |
| AnalyticsSummary | D3 | FROZEN v1 | `contracts/src/schemas/analytics.ts` | D4 |
| Building / Location / FloorPlan / QR / Compliance | D3 | FROZEN v1 | `contracts/src/schemas/location.ts` | D4 |
| GuestRoute | D3 | FROZEN v1 | `contracts/src/schemas/location.ts` | D4 |
| ApiError + HTTP mapping | Architect | FROZEN v1 | `contracts/src/schemas/common.ts` | All |

Perubahan berikutnya WAJIB melalui Contract Change Request di `prompts/memory/change-requests/`.

## 3. Task board

```yaml
- id: ENV-001
  title: Node 20 + npm install menghasilkan package-lock.json
  owner: integration-owner
  status: IN_PROGRESS
  dependencies: []
  test_evidence_required: [node -v = v20.x, package-lock.json ada dan dikomit]

- id: ENV-002
  title: Backend venv python3.12 + requirements-dev terpasang
  owner: domain-3
  status: READY
  dependencies: []
  test_evidence_required: [pytest tests/ -v berjalan]

- id: ENV-003
  title: Commit product-backlog.csv (saat ini untracked)
  owner: integration-owner
  status: READY
  dependencies: []
  test_evidence_required: [git ls-files menampilkan CSV]

- id: ARCH-001
  title: Freeze contract v1 + fixtures
  owner: architect
  status: IMPLEMENTED
  dependencies: []
  test_evidence_required: [npm run test:js, pytest tests/test_contracts.py]

- id: D3-002
  title: Ganti error code placeholder ke daftar frozen
  source_requirement: PRD-02
  owner: domain-3
  status: READY
  dependencies: [ARCH-001]
  files_expected: [backend/app/api/v1/*.py, backend/app/main.py]
  test_evidence_required: [tidak ada code di luar ErrorCode enum]

- id: D4-001
  title: Admin dashboard konsumsi AnalyticsSummary nyata + performance mark
  source_requirement: PRD-06
  owner: domain-4
  status: READY
  dependencies: [ARCH-001, ENV-001]
  files_expected: [frontend/admin-portal/src/**]
  test_evidence_required: [dashboard_ready <= 2s, mapping test]

- id: D4-002
  title: Guest WebAR token -> GuestRoute -> arrow
  source_requirement: PRD-08
  owner: domain-4
  status: READY
  dependencies: [ARCH-001, ENV-001]
  files_expected: [frontend/guest-webar/src/**]
  test_evidence_required: [bundle <= 1.5MB gzip, scene <= 3s, FPS sample]

- id: D1-001
  title: Scan state machine + 45s cutoff + 15 frame
  source_requirement: PRD-01
  owner: domain-1
  status: BLOCKED
  dependencies: [ENV-001, device]
  test_evidence_required: [durasi aktual, timestamp frame, payload bytes]

- id: D2-001
  title: ViroReact + ARKit capability spike
  source_requirement: PRD-03
  owner: domain-2
  status: BLOCKED
  dependencies: [ENV-001, D1-001, iPhone]
  test_evidence_required: [scene render, camera luminance terbukti]
```

## 4. Blocker aktif

```yaml
- id: BLK-001
  severity: S1
  title: Toolchain tidak sesuai pin (Node 25 vs 20, Python 3.14 vs 3.12)
  discovered_at: 2026-07-16 Phase 2
  owner: integration-owner
  affects: [ENV-001, ENV-002, semua domain]
  evidence: "node -v = v25.2.1; python3 --version = 3.14.0; .nvmrc = 20; .python-version = 3.12"
  options:
    - nvm install 20 && nvm use 20; python3.12 -m venv
  decision: nvm install 20; backend memakai python3.12 venv
  target_resolution: sebelum domain coding

- id: BLK-002
  severity: S1
  title: Gate bootstrap environment.md §16 tidak pernah lulus
  discovered_at: 2026-07-16 Phase 2
  owner: integration-owner
  affects: [semua domain]
  evidence: "node_modules tidak ada; package-lock.json tidak ada; tidak ada venv. Scratchpad menyatakan BOOTSTRAP_COMPLETE tanpa bukti eksekusi."
  options:
    - Jalankan npm install pada Node 20 lalu commit lockfile
  decision: ENV-001
  target_resolution: sebelum domain coding

- id: BLK-003
  severity: S2
  title: Placeholder route memakai error code di luar daftar frozen
  discovered_at: 2026-07-16 Phase 2
  owner: domain-3
  affects: [D3-002]
  evidence: "INVALID_FRAME_COUNT, INVALID_MIME, INVALID_TOKEN, NOT_IMPLEMENTED, INTERNAL_SERVER_ERROR tidak ada pada ErrorCode enum"
  options:
    - Map ke SCAN_FRAME_COUNT_INVALID, SCAN_IMAGE_INVALID, QR_TOKEN_INVALID, INTERNAL_ERROR
  decision: null
  target_resolution: D3 slice pertama

- id: BLK-004
  severity: S2
  title: Backend contract test tidak pernah berjalan (FIXTURES_DIR di luar repo)
  discovered_at: 2026-07-16 Phase 2
  owner: architect
  affects: [ARCH-001]
  evidence: "parents[3] resolve ke /Users/<user>/First3Minutes/frontend — di luar repository"
  options:
    - Perbaiki ke parents[2] + guard test
  decision: RESOLVED — ADR-007
  target_resolution: selesai
```

## 5. CSV backlog vs prompts — konflik yang sudah diputuskan

| Catatan CSV | Keputusan |
|---|---|
| "Using all web, not flutter/react native; instead using webxr" | DITOLAK. React Native tetap; demo iPhone; iOS Safari tidak mendukung WebXR `immersive-ar`. |
| Cron Sunday 00:00 UTC untuk decay | DITOLAK. PRD §7.3 memakai decay on-read/on-save. |
| Admin login dengan credential | DITOLAK. PRD §8.1: tanpa login, `DEMO_BUILDING_ID` server-side. |
| Reward per calendar week | DITOLAK. Rolling tujuh hari (PRD §7.2). |
| Floor plan satu image menggantikan video scan | DITOLAK sebagai pengganti (PRD §5.5); boleh sebagai input tambahan. |

## 6. Rencana berikutnya

1. ENV-001 selesai (Node 20 + `npm install` + commit `package-lock.json`).
2. Verifikasi `npm run test:js` dan `npm run typecheck` terhadap contract v1.
3. ENV-002 oleh Domain 3, lalu `pytest tests/ -v`.
4. Domain 4 mulai D4-001/D4-002 terhadap contract frozen.
5. Domain 1/2 menunggu device dan ENV-001.
