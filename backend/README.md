# 3MINUTES Backend

FastAPI + SQLAlchemy 2 + PostgreSQL backend for the 3MINUTES platform.

## Setup

### Unix/macOS
```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

### Windows PowerShell
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

## Database

```bash
# Start PostgreSQL via Docker
docker compose up -d

# Create schema and seed demo data
python -m app.fixtures.seed
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or from root:
```bash
npm run dev:api
```

## Test

```bash
pytest tests/ -v
```

## Key decisions

- No auth, login, JWT, or session — anonymous demo identity via `installationId`
- Admin routes always use `DEMO_BUILDING_ID` from environment (server-side)
- Gemini pipeline not called during bootstrap — returns fixture fallback
- Endpoint 501 stubs are clearly marked as `NOT_IMPLEMENTED`
