# 3MINUTES Backend

FastAPI + SQLAlchemy 2 + PostgreSQL backend for the 3MINUTES platform.

## Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

Use Python 3.12 as specified by the repository. Unix/macOS activation is `source .venv/bin/activate`.

## Environment

Copy the root `.env.example` to `backend/.env` or export equivalent variables.

- `DATABASE_URL`: PostgreSQL connection string.
- `GEMINI_API_KEY`: optional. With an empty key and `ENABLE_SPATIAL_FALLBACK=true`, scans use the deterministic fallback.
- `GEMINI_MODEL`: defaults to `gemini-3.5-flash` when omitted or blank.
- `DEMO_BUILDING_ID`: authoritative scope for every admin endpoint.
- `QR_TOKEN_SECRET`: server-only pepper for hashing opaque guest tokens.
- `GUEST_BASE_URL`: Guest WebAR origin used by generated QR URLs.
- `STORAGE_DIR`: floor plan, QR, and PDF storage; defaults to `backend/storage`.

Rating settings, upload limits, CORS origins, and decay/reward windows can be overridden using the field names in `app/core/config.py` as uppercase environment variables.

## Database

```bash
docker compose up -d
python -m app.fixtures.seed
```

The seed is idempotent. Rebuild an outdated development schema after model changes with:

```bash
python -m app.fixtures.reset
```

The reset command refuses to run unless `APP_ENV` is `development` or `test`.

## Run and test

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pytest tests/ -q
```

From the repository root, `npm run dev:api` starts the API. OpenAPI documentation is available at `http://localhost:8000/docs` in development.

## Endpoint matrix

| Endpoint | Scope/identity | Output |
|---|---|---|
| `POST /api/scans/spatial-map` | Anonymous `installationId`; 15 JPEG, max 4 MB | Persisted Gemini/fallback `SpatialMap` |
| `GET /api/resident/home` | `installationId` | Rating, reward state, last drill, spatial readiness |
| `GET /api/resident/rewards` | `installationId` | Rolling eligibility and issuance records |
| `GET /api/resident/history` | `installationId` | Cursor-paginated drills |
| `POST /api/drills/{drillId}/complete` | Owner derived from `scanId` | Server rating/tier/reward result |
| `GET /api/admin/analytics` | Server `DEMO_BUILDING_ID` only | Participation, shelter time, trends, heatmap |
| `POST/GET /api/admin/floor-plans` | Server demo building | Validated PNG/JPEG/PDF metadata and file |
| `POST/GET /api/admin/locations` | Server demo building | Route/origin/exit context |
| `POST /api/admin/locations/{id}/rescue-qr` | Server demo building | Opaque guest URL and QR file URLs |
| `GET /api/admin/qr/{id}.svg` or `.png` | Server demo building | Native-scannable QR asset |
| `GET /api/guest/rescue/{token}` | Anonymous opaque token | Minimal guest route context |
| `POST/GET /api/admin/compliance-reports` | Server demo building | Generated report state/PDF |

## Rating policy

- Weights: reaction 35%, evacuation 35%, posture 30%.
- Reaction: full score at 5 seconds, zero at 30 seconds.
- Evacuation: full score at 45 seconds, zero at 180 seconds.
- Tiers: Platinum `>=85`, Gold `>=70`, otherwise Silver.
- Reward: at most one issuance per rolling seven-day window.
- Decay: 5% per unprocessed seven-day cycle after 30 inactive days.

All values are server configuration. Clients never submit an authoritative rating, tier, or reward decision.

## Key decisions

- No auth, login, JWT, or session; residents use anonymous `installationId`.
- Admin routes always use server-side `DEMO_BUILDING_ID`.
- Gemini uses official `google-genai` with an eight-second async hard timeout.
- Invalid Gemini JSON/schema may use a compatible fallback; timeout returns `504` without silent fallback.
- Guest tokens are cryptographically random and only their SHA-256 hash is stored.
- Compliance PDF generation is synchronous for the demo dataset.

The automated suite uses isolated SQLite. PostgreSQL clean-seed, live Gemini, and physical QR scanning are environment integration checks.
