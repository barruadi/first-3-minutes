# Domain 3 — Backend dan AI

Status: IMPLEMENTED

Canonical schema: organizations, buildings, floor_plans, locations, spatial_scans, spatial_maps, drills, drill_metrics, device_profiles, reward_issuances, qr_tokens, compliance_reports.

Checkpoint 2026-07-16:

- Spatial upload validates exactly 15 decoded JPEG files and a 4 MB aggregate payload.
- Gemini uses `google-genai`, default `gemini-3.5-flash`, async hard timeout 8 seconds, strict JSON extraction, and deterministic fallback.
- Scan/map persistence, rating/tier, rolling reward, read-time decay, and resident reads are database-backed.
- Admin analytics, floor plan/location, opaque QR, Guest route, and compliance PDF are implemented.
- Evidence: `backend/.venv/Scripts/python.exe -m pytest tests -q --durations=8` -> 24 passed in 0.72s.
- Remaining environment checks: PostgreSQL clean reset/seed, live Gemini call, native camera QR scan, and Python 3.12. Local verification host only has Python 3.11.9.
