# Domain 1 — Resident Mobile

Status: IMPLEMENTED_PENDING_VERIFICATION

Runtime: Expo Development Build. Domain 1 memiliki home, scan, rewards, history, dan mobile shell.

## 2026-07-16 — Implementasi vertical slice resident

- Task: D1-SCAN, D1-RESIDENT-READ-MODELS, D1-DESIGN-SYSTEM
- Implemented: reusable mobile theme/components, anonymous installation ID, typed/error-aware API client, Home/Rewards/History loading-error-empty-refresh states, scan permission/state machine, 45-second monotonic cutoff, deterministic 15 timestamps, video thumbnail extraction, JPEG resize/compression, 4 MB validation, multipart upload, SpatialMap validation/store, TTS scan guidance, and accessibility guidance adapter.
- Contract used: existing `ResidentProfile`, `SpatialMap`, `DrillMetrics`, and `DrillCompletionResponse` from `@3minutes/contracts`; no shared contract changed.
- Domain 2 handoff: `src/services/spatialSession.ts` exposes the latest validated map and scan ID; `src/services/accessibilityGuidance.ts` exposes persisted mode and announcement adapter.
- Verification passed: `git diff --check`.
- Verification blocked: clean `npm install` could not reach dependency resolution in the current environment; therefore Jest/typecheck and physical-device 45/15/4 MB evidence are not claimed.
- Backend dependency: Rewards and History endpoints currently return bootstrap placeholder/empty payloads. UI handles these states, but real records require Domain 3.
- Device dependency: Expo Development Build/iPhone camera smoke test remains required.
