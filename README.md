# Evacuo

**WebAR-based evacuation readiness platform** that transforms emergency preparedness into an interactive, measurable experience, accessible from any mobile browser, no app install required.

---

## Background

Indonesia ranks as the third most disaster-prone country in the world (WorldRiskIndex 2022). Despite this, emergency preparedness practices across organizations vary significantly from comprehensive drills to passive safety videos that most employees ignore.

The core problem is a lack of measurability: organizations can provide emergency training, but they have no reliable way to evaluate whether employees are truly prepared to evacuate.

Evacuo addresses this gap by combining interactive WebAR evacuation guidance with behavioral analytics, giving safety managers and HSE teams objective, data-driven insight into evacuation readiness.

---

## Features

### For Building Occupants (Guests)
- **QR Code Access** — Scan a nearby QR code to start immediately; no app installation required
- **Exploration Mode** — Independently learn the nearest evacuation routes and familiarize yourself with the building layout
- **AR Guidance Mode** — Real-time directional overlay via WebAR, navigating users toward the nearest safe exit during drills or actual emergencies

### For Administrators & HSE Teams
- **Building & Floor Plan Management** — Upload floor plans and define evacuation routes, assembly points, and QR code checkpoint locations
- **LiDAR-Assisted Spatial Mapping** — AI-powered processing of building scans to generate accurate digital evacuation maps
- **Analytics Dashboard** — Visualize route heatmaps, completion funnels, daily trends, hourly patterns, and duration distributions
- **QR Code Generator** — Generate and manage QR codes for placement throughout the building
- **Compliance Reports** — Export PDF reports to support internal documentation and regulatory reporting

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Admin Portal | React, React Router, Vite, TypeScript |
| Guest WebAR | React, Three.js, TailwindCSS, jsQR, Vite, TypeScript |

### Backend
| Layer | Technology |
|---|---|
| API | FastAPI (Python 3.12) |
| Database | PostgreSQL + SQLAlchemy + Alembic |
| AI / Spatial | Google Gemini (spatial map processing) |
| Report Generation | ReportLab (PDF) |
| QR Generation | qrcode + Pillow |

---

## Project Structure

```
ROOT/
├── backend/              # FastAPI + PostgreSQL API
│   ├── app/
│   │   ├── api/v1/       # Route handlers (admin, guest, building, drill, scan, etc.)
│   │   ├── services/     # Business logic (spatial AI, QR, compliance, ratings)
│   │   ├── models/       # SQLAlchemy ORM models
│   │   └── schemas/      # Pydantic request/response schemas
│   └── alembic/          # Database migrations
├── frontend/
│   ├── admin-portal/     # HSE admin dashboard (React + Vite)
│   ├── guest-webar/      # Guest WebAR experience (React + Three.js)
│   └── packages/
│       ├── contracts/    # Shared TypeScript + Zod contracts
│       └── design-tokens/# Brand palette + spacing tokens
├── docker-compose.yml
└── package.json          # Yarn workspaces root
```

---

## Getting Started

### Prerequisites
- Node.js >= 20
- Python 3.12
- Docker + Docker Compose

### Installation

```bash
# Install JS dependencies
yarn install

# Set up Python environment
cd backend
python3.12 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt

# Configure environment variables
cp .env.example .env
# Edit .env: set GEMINI_API_KEY, QR_TOKEN_SECRET, DATABASE_URL

# Start database and seed data
yarn docker:up
cd backend && python -m app.fixtures.seed
```

### Running the App

```bash
yarn dev:api      # FastAPI backend         → http://localhost:8000
yarn dev:admin    # Admin Portal            → http://localhost:5173
yarn dev:guest    # Guest WebAR (HTTPS)     → http://localhost:5174
```

---

## Contributors

| Name | Role |
|---|---|
| Adinda Putri | Hipster |
| Azfa Radhiyya Hakim | Hacker |
| Barru Adi Utomo | Hacker |
| Rafif Farras | Hustler |

---

*Built at Garudahacks 7.0*
