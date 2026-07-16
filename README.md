# 3MINUTES

Platform latihan keselamatan personal — AR Drill, Spatial AI Mapping, B2B Analytics, Guest WebAR.

## Struktur

```
ROOT/
├── prompts/             # Agentic control plane (dokumen, config, agen, skill, memory)
├── backend/             # FastAPI + PostgreSQL — Domain 3
├── frontend/
│   ├── resident-mobile/ # React Native + Expo — Domain 1 & 2
│   ├── admin-portal/    # React + Vite — Domain 4
│   ├── guest-webar/     # WebAR (Three.js) — Domain 4
│   └── packages/
│       ├── contracts/   # Shared TypeScript + Zod contracts
│       └── design-tokens/ # Brand palette + spacing tokens
├── package.json         # npm workspaces root
├── package-lock.json    # SATU lockfile (jangan komit yang lain)
├── docker-compose.yml
├── .env.example
└── .nvmrc
```

## Setup cepat

### 1. Prerequisites

- Node.js 20 LTS (`nvm use 20` atau sesuai `.nvmrc`)
- Python 3.12
- Docker + Docker Compose

### 2. JavaScript setup

```bash
npm install
```

### 3. Python venv — Unix/macOS

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

### 3. Python venv — Windows PowerShell

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

### 4. Environment variables

```bash
cp .env.example .env
# Edit .env: isi GEMINI_API_KEY, QR_TOKEN_SECRET, DATABASE_URL
```

### 5. Docker & Database

```bash
npm run docker:up
cd backend && python -m app.fixtures.seed
```

## Running runtimes

```bash
npm run dev:api        # FastAPI backend (port 8000)
npm run dev:admin      # Admin Portal Vite (port 5173)
npm run dev:guest      # Guest WebAR HTTPS (port 5174)
npm run start:mobile   # Expo Dev Client (device fisik iOS)
npm run build:ios:dev  # EAS iOS development build
```

## Tests

```bash
npm run test:js         # Semua JS/TS tests
npm run test:api        # Pytest backend (butuh venv aktif)
npm run typecheck       # TypeScript check semua workspace
npm run bootstrap:check # Verifikasi struktur bootstrap
```

## Branch strategy

| Branch | Tujuan |
|---|---|
| `main` | Stable, merge setelah review |
| `develop` | Integration branch |
| `domain-1/*` | Domain 1 — B2C Resident Mobile |
| `domain-2/*` | Domain 2 — AR Drill & Sensor |
| `domain-3/*` | Domain 3 — Backend & AI |
| `domain-4/*` | Domain 4 — Admin Portal & Guest WebAR |

## Domain ownership

| Domain | Area |
|---|---|
| Domain 1 | `frontend/resident-mobile/src/features/home`, `scan`, `rewards`, `history` |
| Domain 2 | `frontend/resident-mobile/src/features/drill`, `src/test-harness/sensors` |
| Domain 3 | `backend/**` |
| Domain 4 | `frontend/admin-portal/**`, `frontend/guest-webar/**` |

## Bootstrap limitations

- Gemini pipeline belum dipanggil — fallback fixture aktif (`ENABLE_SPATIAL_FALLBACK=true`)
- EAS project ID placeholder di `frontend/resident-mobile/app.json`
- Guest WebAR AR tracking adalah placeholder — implementasi Domain 4
- Rating engine placeholder — Domain 3 mengisi setelah bootstrap
- PDF generation: 501 Not Implemented — Domain 3