# Domain 3 — Backend dan AI

Status: RUNNING

Canonical schema: organizations, buildings, floor_plans, locations, spatial_scans, spatial_maps, drills, drill_metrics, device_profiles, reward_issuances, qr_tokens, compliance_reports.

## Runtime (2026-07-16 — VERIFIED)

- **Database**: Local Homebrew PostgreSQL@14 pada port 5432 (bukan Docker).
- **Backend**: FastAPI via `.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000`
- **Seed**: `cd backend && .venv/bin/python -m app.fixtures.seed` — COMPLETED SUCCESSFULLY
- **Health**: `curl http://localhost:8000/api/health` → `{"status":"ok"}`

## Endpoints verified (all returning correct responses)

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/health` | OK | - |
| `GET /api/guest/rescue/{token}` | OK | Demo token: `demo-token-loc-demo-001` |
| `GET /api/admin/analytics` | OK | Returns buildingId, participation, shelter, trends, heatmap |
| `GET /api/admin/locations` | OK | Returns location array with route_points, exit_point |
| `GET /api/admin/floor-plans` | OK | Returns `{items:[...]}` |
| `POST /api/admin/locations/{id}/rescue-qr` | OK | Returns locationId, guestUrl, qrSvgUrl, qrPngUrl |
| `GET /api/resident/home?installationId=X` | OK | Returns safetyRating, rewardEligibility, lastDrill, spatialReadiness |
| `GET /api/resident/rewards?installationId=X` | OK | - |
| `GET /api/resident/history?installationId=X` | OK | - |
| `POST /api/scans/spatial-map` | IMPLEMENTED | Gemini AI + fallback; needs GEMINI_API_KEY |
| `POST /api/drills/{drill_id}/complete` | IMPLEMENTED | Rating engine, reward eligibility |

## Contract status

All v1 contracts FROZEN — see `contracts/src/schemas/`. Pydantic models in `backend/app/schemas/` mirror these exactly.

- GuestRoute response camelCase: `locationRef`, `origin`, `routePoints`, `hazardPoints`, `safeZones`, `exitPoint`
- All 3D coordinates: `{x, y, z}` floats

## .env location

`backend/.env` — DATABASE_URL=postgresql+psycopg://three_minutes:change_me@localhost:5432/three_minutes

## Start command

```bash
# From backend/ directory
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
