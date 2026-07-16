# Shared Operational Scratchpad — 3MINUTES (Deprecated)

Gunakan `global-status.md`, `integration.md`, dan `domains/*.md` untuk update baru. File ini dipertahankan sebagai arsip kompatibilitas dan tidak boleh menjadi tempat tulis bersama seluruh domain.

## Fungsi

Dokumen ini menyimpan state kerja yang perlu diketahui seluruh agent dan anggota tim pada checkpoint saat ini.

Isi yang diperbolehkan:

- Fakta hasil inspeksi.
- Keputusan yang sudah disetujui.
- Task aktif.
- Blocker.
- Asumsi eksplisit yang perlu dikonfirmasi.
- Kontrak yang sedang digunakan.
- File yang berubah.
- Command/test dan hasil.
- Handoff.
- Langkah berikutnya.

Isi yang tidak diperbolehkan:

- Private chain-of-thought.
- Uraian penalaran tersembunyi.
- Secret, API key, password, atau token nyata.
- Klaim test yang tidak dijalankan.

Gunakan ringkasan alasan keputusan, bukan seluruh proses berpikir internal.

---

## 1. Context capsule aktif

```yaml
checkpoint: BOOTSTRAP_COMPLETE
updated_at: "2026-07-16"
updated_by: "00-bootstrap-engineer"
current_goal: Bootstrap selesai. Empat domain dapat mulai coding. Checkpoint A — all runtime boot.
critical_path:
  - contract-and-fixture — DONE (fixtures + Zod schemas + Pydantic mirror)
  - spatial-upload — PLACEHOLDER (fallback fixture active)
  - mobile-scan — PLACEHOLDER (scan screen scaffold only)
  - drill-metrics — PLACEHOLDER (drill screen scaffold only)
  - rating-result — PLACEHOLDER (placeholder response)
  - qr-guest-route — PARTIAL (demo token fixture working)
  - analytics-dashboard-pdf — PARTIAL (analytics fixture DONE, PDF 501)
next_integration_checkpoint: Checkpoint A — all runtime boot
```

## 2. Product invariants

- React Native untuk Resident.
- Domain 2 berada di project mobile yang sama.
- FastAPI untuk backend.
- React untuk Admin.
- WebAR/WebXR untuk Guest.
- Video scan: 45 detik, 15 frame, ≤4 MB.
- Gemini timeout: 8 detik.
- QR hanya untuk Guest/Traveler.
- Rating/reward/decay server-side.
- Guest tanpa login.
- Seluruh fitur PRD wajib diimplementasikan.

## 3. Runtime matrix

| Runtime | Status | Command aktual | URL/device | Owner | Blocker |
|---|---|---|---|---|---|
| Resident Mobile | SCAFFOLDED | `npm run start:mobile` | device fisik iOS | Domain 1 | EAS project ID placeholder; device fisik required |
| AR/Sensor module | SCAFFOLDED | Mengikuti mobile | device fisik | Domain 2 | @reactvision/react-viro belum diinstall — perlu capability spike |
| FastAPI | SCAFFOLDED | `npm run dev:api` | http://localhost:8000 | Domain 3 | Butuh `docker:up + seed` untuk DB connection |
| PostgreSQL | SCAFFOLDED | `npm run docker:up` | localhost:5432 | Domain 3 | - |
| Admin Portal | SCAFFOLDED | `npm run dev:admin` | http://localhost:5173 | Domain 4 | - |
| Guest WebAR | SCAFFOLDED | `npm run dev:guest` | https://localhost:5174 | Domain 4 | HTTPS cert required (mkcert) |

## 4. Toolchain freeze

| Item | Keputusan | Status | Evidence |
|---|---|---|---|
| Package manager | npm workspaces | ACCEPTED | package.json root |
| Node version | 20 LTS | ACCEPTED | .nvmrc |
| Python version | 3.12 | ACCEPTED | .python-version |
| React Native version | Expo SDK 51 + Development Build | ACCEPTED | resident-mobile/package.json |
| AR provider | @reactvision/react-viro + ARKit | PENDING — capability spike needed | Domain 2 |
| Database schema | SQLAlchemy 2 models + seed | ACCEPTED | backend/app/models/ |
| Test runners JS | Vitest (web pkgs), Jest (mobile) | ACCEPTED | package.json |
| Test runners Python | Pytest | ACCEPTED | pyproject.toml |
| Admin build tool | Vite 5 | ACCEPTED | admin-portal/package.json |
| Guest build tool | Vite 5 + Three.js | ACCEPTED | guest-webar/package.json |

## 5. Contract status

| Contract | Owner | Status | Version/file | Consumer |
|---|---|---|---|---|
| Vector3/SpatialMap | Architect/Domain 3 | DRAFT | docs/architecture.md | D1/D2 |
| DrillMetrics/Result | Architect/Domain 3 | DRAFT | docs/architecture.md | D1/D2 |
| Resident Home | Domain 3 | DRAFT | docs/architecture.md | D1 |
| Rewards/History | Domain 3 | DRAFT | docs/architecture.md | D1 |
| Analytics | Domain 3 | DRAFT | docs/architecture.md | D4 |
| Floor/Location | Domain 3 | DRAFT | docs/architecture.md | D4 |
| QR response | Domain 3 | DRAFT | docs/architecture.md | D4 |
| GuestRoute | Domain 3 | DRAFT | docs/architecture.md | D4 |
| Error envelope | Architect/Domain 3 | DRAFT | docs/architecture.md | All |

Status allowed:

```text
DRAFT
FROZEN
CHANGE_REQUESTED
MIGRATING
VERIFIED
```

## 6. Task board

| ID | Task | Owner | Status | Dependency | Evidence required |
|---|---|---|---|---|---|
| SYS-001 | Inspect repository | Orchestrator | READY | - | runtime matrix |
| ARCH-001 | Freeze contracts v1 | Architect | READY | SYS-001 | fixtures + schema |
| D1-001 | Bootstrap mobile | Domain 1 | BLOCKED | SYS-001 | device build |
| D2-001 | Probe AR/sensors | Domain 2 | BLOCKED | D1-001 | device capability |
| D3-001 | Bootstrap API/DB | Domain 3 | BLOCKED | SYS-001 | API demo + schema/seed |
| D4-001 | Bootstrap Admin/Guest | Domain 4 | BLOCKED | SYS-001 | both apps boot |

## 7. Domain status

### Domain 1

```yaml
owner: null
current_task: null
status: NOT_STARTED
files_changed: []
tests_run: []
contract_used: []
blockers: []
next_action: Inspect and boot React Native on physical device.
```

### Domain 2

```yaml
owner: null
current_task: null
status: NOT_STARTED
files_changed: []
tests_run: []
contract_used: []
blockers:
  - Requires mobile project and device.
next_action: Probe AR provider and sensor capability after Domain 1 boot.
```

### Domain 3

```yaml
owner: null
current_task: null
status: NOT_STARTED
files_changed: []
tests_run: []
contract_used: []
blockers: []
next_action: Boot FastAPI/PostgreSQL and validate schema direction.
```

### Domain 4

```yaml
owner: null
current_task: null
status: NOT_STARTED
files_changed: []
tests_run: []
contract_used: []
blockers:
  - Guest requires HTTPS and target browser.
next_action: Boot separate Admin and Guest projects.
```

## 8. Active blockers

Gunakan format:

```yaml
- id: BLK-001
  severity: S1
  title: string
  discovered_at: timestamp
  owner: domain/role
  affects:
    - task-id
  evidence: command/log
  options:
    - option
  decision: null
  target_resolution: null
```

Belum ada blocker yang dibuktikan.

## 9. Assumptions awaiting confirmation

Semua asumsi harus diberi owner dan deadline.

| ID | Asumsi | Dampak | Owner keputusan | Deadline | Status |
|---|---|---|---|---|---|
| ASM-001 | Device target mendukung provider AR terpilih | Domain 2 critical | Architect | Jam 2 | OPEN |
| ASM-002 | Backend dapat diakses mobile melalui LAN/tunnel | D1↔D3 | Orchestrator | Jam 2 | OPEN |
| ASM-003 | HTTPS preview tersedia untuk Guest | Guest critical | Domain 4 | Jam 2 | OPEN |

## 10. Integration evidence

Catat hanya integrasi nyata.

| Producer | Consumer | Artifact | Result | Evidence |
|---|---|---|---|---|
| - | - | - | NOT_RUN | - |

## 11. Test evidence

| Test ID | Requirement | Environment | Command/steps | Actual result | Status |
|---|---|---|---|---|---|
| - | - | - | - | - | NOT_RUN |

## 12. Fixture/mock removal register

| Fixture/mock | Consumer | Alasan sementara | Replacement owner | Removal task | Status |
|---|---|---|---|---|---|
| spatial-map fixture | D1/D2 | Parallel bootstrap | D3 | TBD | PLANNED |
| analytics fixture | D4 Admin | Parallel bootstrap | D3 | TBD | PLANNED |
| guest-route fixture | D4 Guest | Parallel bootstrap | D3 | TBD | PLANNED |

## 13. Handoff template

```markdown
### Handoff <from> → <to>
- Task:
- Commit/files:
- Entry point:
- Input contract:
- Output contract:
- Run command:
- Test command:
- Evidence:
- Known limitation:
- Required consumer action:
```

## 14. Next actions

1. Domain 3: `npm run docker:up && cd backend && python -m app.fixtures.seed && pytest tests/ -v`
2. Domain 4: Setup mkcert HTTPS, jalankan `npm run dev:admin` dan `npm run dev:guest`
3. Domain 1: Probe iOS device, setup EAS project ID, jalankan `npm run start:mobile`
4. Domain 2: Probe sensor capability via `SensorTestHarness`, spike @reactvision/react-viro
5. Architect: Freeze contract v1 setelah semua runtime boot (Checkpoint A)


## Repository Path Map Final

| Area | Path | Owner |
|---|---|---|
| Agentic control plane | `prompts/**` | Shared/Architect |
| Resident shell, scan, rewards, history | `frontend/resident-mobile/**` sesuai boundary | Domain 1 |
| AR drill dan sensor | `frontend/resident-mobile/src/features/drill/**` | Domain 2 |
| Backend API dan database | `backend/**` | Domain 3 |
| Admin Portal | `frontend/admin-portal/**` | Domain 4 |
| Guest WebAR | `frontend/guest-webar/**` | Domain 4 |
| Shared contracts | `frontend/packages/contracts/**` | Architect + Domain 3 guardian |
| Shared design tokens | `frontend/packages/design-tokens/**` | Architect + Domain 1 guardian |

Package manager: npm. Lockfile: `package-lock.json` tunggal di root.
