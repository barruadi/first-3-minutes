# Integration Status — 3MINUTES

Status awal: BOOTSTRAP_PENDING.

Urutan integrasi:

1. Bootstrap Engineer pusat.
2. Bootstrap Reviewer.
3. Expo/ViroReact capability spike pada iPhone fisik/ARKit.
4. Architect contract freeze.
5. Merge foundation ke develop.
6. Empat domain mulai paralel.

Shared paths hanya diubah Bootstrap Engineer atau Architect selama bootstrap.

Admin demo tidak memiliki halaman login. Semua data admin harus berasal dari `DEMO_BUILDING_ID` server-side; Resident menyertakan `installationId` anonim saat membutuhkan persistensi profile/history.

---

## 2026-07-16 — Domain 3 RUNNING (Backend fully verified)

Backend FastAPI berjalan di `http://localhost:8000`. Database: Homebrew PostgreSQL@14 port 5432 (bukan Docker).

Semua endpoint D4 telah diverifikasi mengembalikan response yang tepat:
- `GET /api/guest/rescue/{token}` → GuestRouteResponse ✓
- `GET /api/admin/analytics` → AnalyticsSummaryResponse ✓
- `GET /api/admin/locations` → LocationResponse[] ✓
- `GET /api/admin/floor-plans` → `{items: FloorPlan[]}` ✓
- `POST /api/admin/locations/{id}/rescue-qr` → QrProvisionResponse ✓

**Domain 4 dapat langsung mengintegrasikan endpoint live.** Tidak perlu fixture mock lagi.

Demo token untuk Guest WebAR: `demo-token-loc-demo-001`
Guest URL pattern: `http://localhost:5174/rescue/{token}`

---

## 2026-07-16 — Dependency D4 -> D3: endpoint floor-plan belum contract-shaped

Ditemukan saat Domain 4 mengimplementasikan Admin Slice 3.

| Endpoint | Bentuk sekarang | Bentuk frozen v1 | Dampak |
|---|---|---|---|
| `GET /api/admin/floor-plans` | `{"items": [], "message": "NOT_IMPLEMENTED"}` | `FloorPlan[]` | `adminApi.getFloorPlans()` melempar `VALIDATION_ERROR` |
| `POST /api/admin/floor-plans` | `{"message": "NOT_IMPLEMENTED", "placeholder": true}` | `FloorPlan` | Upload tidak dapat diverifikasi end-to-end |
| `POST /api/admin/locations` | `{"message": "NOT_IMPLEMENTED", "placeholder": true}` | `Location` | Create location tidak dapat diverifikasi |
| `GET /api/admin/locations` | `LocationResponse[]` | `Location[]` | OK — QR flow dapat diintegrasikan sekarang |

- Owner: Domain 3
- Task: D3-003
- Status: OPEN
- Konsumen: Domain 4 Admin Slice 3
- Catatan: Domain 4 membangun UI terhadap contract frozen + fixture `floor-plan.valid.json`. UI TIDAK menyesuaikan diri dengan bentuk placeholder; backend yang harus memenuhi contract.
- Verifikasi: `adminApi.getFloorPlans()` mengembalikan array tanpa `VALIDATION_ERROR`.
