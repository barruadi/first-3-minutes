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
