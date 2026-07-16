# Konteks Environment dan Bootstrap — 3MINUTES

## 1. Tujuan

Dokumen ini menetapkan struktur repository, toolchain, command, environment variable, dan gate bootstrap agar empat domain dapat dikembangkan secara paralel tanpa perbedaan setup.

## 2. Struktur repository final

```text
ROOT/
├── prompts/
│   ├── config/
│   ├── docs/
│   ├── agents/
│   ├── skills/
│   └── memory/
├── backend/                       # FastAPI — Domain 3
├── frontend/
│   ├── resident-mobile/          # React Native — Domain 1 dan 2
│   ├── admin-portal/             # React web — Domain 4
│   ├── guest-webar/              # WebAR — Domain 4
│   └── packages/
│       ├── contracts/
│       └── design-tokens/
├── package.json
├── package-lock.json
├── tsconfig.base.json
├── docker-compose.yml
├── .env.example
├── .gitignore
├── .nvmrc
└── README.md
```

Jangan membuat folder root alternatif seperti `frontend/`, `services/`, atau `packages/`. Gunakan struktur existing `frontend/`, `backend/`, dan `prompts/`.

## 3. Runtime baseline

| Komponen | Baseline final |
|---|---|
| Node.js | 20 LTS |
| Package manager | npm workspaces |
| Lockfile | `package-lock.json` tunggal di root |
| TypeScript | 5.x |
| React Native | React Native + Expo Development Build |
| React web | React + TypeScript + Vite |
| Python | 3.12 |
| API | FastAPI + Uvicorn |
| ORM | SQLAlchemy 2; schema demo dibuat dari model/seed sederhana |
| Database | PostgreSQL 15+ |
| Testing JS | Jest/Vitest sesuai runtime |
| Testing Python | Pytest |
| Browser WebAR | Safari iOS, marker-based tracking |

Resident AR baseline: `@reactvision/react-viro` dengan ARKit pada iPhone fisik. Expo Go tidak digunakan untuk AR; gunakan Expo Prebuild/CNG dan Expo Development Build melalui EAS dari Windows.

Versi exact dipin saat clean install pertama. Jangan melakukan upgrade mayor setelah integration checkpoint pertama kecuali ada blocker yang disetujui Architect.

## 4. npm workspace

Root `package.json` menggunakan:

```json
{
  "private": true,
  "workspaces": [
    "frontend/resident-mobile",
    "frontend/admin-portal",
    "frontend/guest-webar",
    "frontend/packages/*"
  ]
}
```

Nama package:

```text
@3minutes/resident-mobile
@3minutes/admin-portal
@3minutes/guest-webar
@3minutes/contracts
@3minutes/design-tokens
```

Dilarang menambahkan lockfile package manager lain:

```text
pnpm-lock.yaml
yarn.lock
bun.lockb
```

Semua anggota menggunakan npm dan mengkomit `package-lock.json`.

## 5. Command root

Command minimum:

```bash
npm install
npm run start:mobile
npm run build:ios:dev
npm run dev:admin
npm run dev:guest
npm run dev:api
npm run docker:up
npm run docker:down
npm run lint
npm run typecheck
npm run test
npm run test:js
npm run test:api
npm run bootstrap:check
```

Script root harus cross-platform dan dapat dipakai pada Windows PowerShell. Jika backend memerlukan aktivasi virtual environment, README root harus menyediakan command Windows dan Unix secara terpisah.

## 6. Version pinning

Buat dan commit:

```text
.nvmrc
.python-version
package-lock.json
backend/requirements.txt atau backend/pyproject.toml
```

Catat versi exact pada `prompts/memory/changelog.md`.

## 7. Environment variables

Buat `.env.example` tanpa secret nyata:

```dotenv
APP_ENV=development

API_HOST=0.0.0.0
API_PORT=8000
API_BASE_URL=http://localhost:8000

POSTGRES_DB=three_minutes
POSTGRES_USER=three_minutes
POSTGRES_PASSWORD=change_me
DATABASE_URL=postgresql+psycopg://three_minutes:change_me@localhost:5432/three_minutes

GEMINI_API_KEY=
GEMINI_MODEL=

DEMO_BUILDING_ID=building-demo-001
QR_TOKEN_SECRET=

MOBILE_API_BASE_URL=http://<LAN_IP>:8000
VITE_ADMIN_API_BASE_URL=http://localhost:8000
VITE_GUEST_API_BASE_URL=http://localhost:8000
VITE_GUEST_BASE_URL=https://localhost:5174

ENABLE_SPATIAL_FALLBACK=true
LOG_LEVEL=INFO
```

Aturan:

- Mobile fisik tidak memakai `localhost` komputer; gunakan IP LAN atau tunnel.
- Guest WebAR harus berjalan pada secure context HTTPS untuk camera.
- Secret backend tidak boleh masuk bundle frontend.
- CORS hanya mengizinkan origin yang diperlukan.

## 8. Docker dan database

`docker-compose.yml` minimal menyediakan PostgreSQL. Credential yang dikomit hanya untuk local development.

Schema demo memuat fondasi tabel:

```text
organizations
buildings
floor_plans
locations
spatial_scans
spatial_maps
drills
drill_metrics
device_profiles
reward_issuances
qr_tokens
compliance_reports
```

Seed demo harus idempotent dan menggunakan identifier konsisten:

```text
resident-demo-001
admin-demo-001
building-demo-001
scan-demo-001
floorplan-demo-001
floor-4-room-402
```

## 9. Resident Mobile bootstrap

Lokasi:

```text
frontend/resident-mobile/
```

Struktur internal:

```text
src/
├── app/
├── navigation/
├── components/
├── services/
├── store/
├── theme/
├── test-harness/
└── features/
    ├── home/                      # Domain 1
    ├── scan/                      # Domain 1
    ├── drill/                     # Domain 2
    ├── rewards/                   # Domain 1
    └── history/                   # Domain 1
```

Checklist bootstrap:

- Expo + React Native + TypeScript berhasil dibuat.
- iOS Development Build dapat dibuat lewat EAS dan dipasang pada iPhone, atau blocker signing dicatat.
- Navigation membuka Home, Scan, Drill, Rewards, dan History.
- Shared contracts dan design tokens dapat diimport.
- API client, error boundary, loading, empty state, dan permission abstraction tersedia.
- Domain 2 mendapat integration surface di `features/drill/`.
- Fitur recording, sensor fusion, smoke, dan QTE belum diimplementasikan penuh pada fase bootstrap.

## 10. Backend bootstrap

Lokasi:

```text
backend/
```

Struktur internal:

```text
backend/
├── app/
│   ├── main.py
│   ├── api/
│   ├── core/
│   ├── models/
│   ├── schemas/
│   ├── repositories/
│   ├── services/
│   └── fixtures/
├── tests/
├── pyproject.toml atau requirements.txt
└── README.md
```

Checklist bootstrap:

- API demo, settings, CORS, error envelope, SQLAlchemy session, dan Pytest tersedia.
- Router placeholder tersedia untuk scan, drill, resident, admin, location, QR, guest, dan compliance.
- Endpoint yang belum diimplementasikan diberi `501 Not Implemented` atau flag placeholder eksplisit.
- Gemini belum dipanggil pada bootstrap; hanya interface, config, fallback fixture, dan test double eksplisit.

## 11. Admin Portal bootstrap

Lokasi:

```text
frontend/admin-portal/
```

Gunakan React + TypeScript + Vite + React Router + Vitest.

Route minimum:

```text
/
/dashboard
/analytics
/locations
/locations/:locationId
/compliance
```

Sediakan app shell, loading/error/empty state, chart placeholder, spatial matrix placeholder, location page, QR page, dan compliance export page. Jangan mengimplementasikan seluruh bisnis dashboard pada bootstrap.

## 12. Guest WebAR bootstrap

Lokasi:

```text
frontend/guest-webar/
```

Gunakan React + TypeScript + Vite, marker-based tracking, dan fondasi Three.js atau A-Frame yang ringan.

Route minimum:

```text
/rescue/:token
```

State minimum:

```text
Loading
Invalid token
Camera permission required
Camera permission denied
Network error
Unsupported browser
AR scene placeholder
```

Sediakan scene container dan satu placeholder arrow. Jangan mengklaim tracking production selesai. Tambahkan script bundle analysis dan dokumentasi HTTPS local development.

## 13. Shared contracts

Lokasi:

```text
frontend/packages/contracts/
```

Gunakan TypeScript + Zod. Kontrak minimum:

```text
ApiError
Coordinate3D
SpatialObject
SpatialMap
ResidentProfile
SafetyRating
RewardEligibility
DrillSession
DrillMetrics
DrillCompletionResponse
AnalyticsSummary
SafetyMatrixCell
Building
Location
QrProvisionResponse
GuestRoute
ComplianceReportRequest
```

Setiap kontrak memiliki type, runtime schema, fixture valid, fixture invalid, dan unit test. Backend memiliki mirror Pydantic schema dan contract test terhadap fixture JSON yang sama.

Seluruh HTTP interface (JSON, multipart field, query parameter, fixture, TypeScript) menggunakan camelCase. Internal database/Python menggunakan snake_case dengan alias conversion Pydantic terpusat.

Fixture disimpan pada:

```text
frontend/packages/contracts/fixtures/
```

## 14. Shared design tokens

Lokasi:

```text
frontend/packages/design-tokens/
```

Palette final:

```text
Deep Navy   #0A2947
Warm Sand   #F3E4C9
Sage Gray   #D3D4C0
Earth Brown #8B5E3C
```

Export token yang dapat dipakai React Native, Admin Portal, dan Guest WebAR. Detail UI berada di `prompts/docs/design.md`.

## 15. Ownership dan shared paths

### Domain 1

```text
frontend/resident-mobile/src/features/home/**
frontend/resident-mobile/src/features/scan/**
frontend/resident-mobile/src/features/rewards/**
frontend/resident-mobile/src/features/history/**
```

### Domain 2

```text
frontend/resident-mobile/src/features/drill/**
frontend/resident-mobile/src/test-harness/sensors/**
```

### Domain 3

```text
backend/**
```

### Domain 4

```text
frontend/admin-portal/**
frontend/guest-webar/**
```

Shared paths yang memerlukan koordinasi Architect:

```text
package.json
package-lock.json
tsconfig.base.json
.env.example
docker-compose.yml
frontend/resident-mobile/package.json
frontend/resident-mobile/App.tsx
frontend/resident-mobile/src/navigation/**
frontend/packages/contracts/**
frontend/packages/design-tokens/**
```

## 16. Gate sebelum implementasi paralel

- [ ] `npm install` berhasil.
- [ ] Hanya ada satu `package-lock.json`.
- [ ] Seluruh npm workspace terdeteksi.
- [ ] Resident Mobile dapat dibuild atau blocker perangkat tercatat.
- [ ] Admin Portal berjalan.
- [ ] Guest WebAR berjalan melalui HTTPS.
- [ ] Endpoint demo FastAPI dapat diakses.
- [ ] PostgreSQL schema demo dan seed berjalan.
- [ ] Contract fixtures lulus parsing.
- [ ] Design token dapat diimport.
- [ ] Lint, typecheck, dan test dasar lulus.
- [ ] Domain ownership jelas.
- [ ] `prompts/memory/scratchpad.md` dan changelog diperbarui.

Setelah gate terpenuhi, Orchestrator membagi task menjadi vertical slice dan Architect melakukan contract freeze.
