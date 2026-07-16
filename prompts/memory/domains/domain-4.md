# Domain 4 — Admin Portal dan Guest WebAR

Status: IN_PROGRESS — Guest WebAR running, waiting on backend service for live integration

## Guest WebAR — Current state (2026-07-16)

- **Dev server**: `https://localhost:5174` (run `npm run dev:guest` or `bun run dev` in `frontend/guest-webar`)
- **Styling**: Tailwind CSS v4 with `@tailwindcss/vite` plugin (refactored from inline styles)
- **TypeScript**: clean (0 errors after adding `vite/client` types)
- **Tests**: 12/12 passing (guidance engine + accessibility guardrails)
- **AR scene**: Three.js luminous arrows on live camera, orientation via DeviceOrientation API
- **Accessibility**: VISUAL_ONLY / VISUAL_AND_AUDIO / AUDIO_PRIMARY modes with browser TTS

### Blocker: backend service not confirmed running

- `VITE_GUEST_API_BASE_URL` defaults to `http://localhost:8000`
- Guest WebAR calls `GET /api/guest/rescue/{token}` on load
- If backend is down → app stays in `api_error` state (safe, shows "cek koneksi" message)
- **Demo token** once backend is up: `demo-token-loc-demo-001`
- **Test URL**: `https://localhost:5174/rescue/demo-token-loc-demo-001`

### Tailwind v4 setup

- Package: `tailwindcss@4.3.3` + `@tailwindcss/vite@4.3.3`
- Config: CSS-first via `src/index.css` (`@import "tailwindcss"` + `@theme` custom colors)
- Custom colors: `--color-navy: #0a2947`, `--color-warm-beige: #f3e4c9`, `--color-neon-green: #39ff14`, `--color-hazard: #8b5e3c`
- No `tailwind.config.js` needed (v4 CSS-first approach)

---

## Backend contracts for Domain 4 (all VERIFIED working)

Backend runs at `http://localhost:8000`. No auth required on any endpoint.

---

### Guest WebAR — `GET /api/guest/rescue/{token}`

**This is the primary endpoint for WebAR.** Parse the opaque token from the URL and call this.

```typescript
// Response shape (camelCase JSON):
{
  locationRef: string,        // e.g. "floor-4-room-402"
  origin: { x, y, z },       // QR marker = (0,0,0) world origin
  routePoints: [{ x, y, z }, ...],  // waypoints to follow
  hazardPoints: [{ x, y, z }, ...], // avoid these
  safeZones: [{ x, y, z }, ...],    // safe locations
  exitPoint: { x, y, z }     // final destination
}
```

**Demo token for testing**: `demo-token-loc-demo-001`
**Full URL**: `http://localhost:8000/api/guest/rescue/demo-token-loc-demo-001`

**Zod schema**: `GuestRouteSchema` from `@3minutes/contracts`

**Error**: Invalid/expired token → HTTP 404 `{"error":{"code":"QR_TOKEN_INVALID","message":"..."}}`

---

### Admin Analytics — `GET /api/admin/analytics`

No query params needed. Server always uses DEMO_BUILDING_ID.

```typescript
// Response (camelCase):
{
  buildingId: string,
  participationRatePercentage: number,  // 0-100
  averageShelterTimeMs: number,
  escapeRouteTrends: [{ period: "YYYY-Www", averageEvacuationTimeMs: number }],
  heatmapCells: [{
    locationRef: string,
    failureRatePercentage: number,
    averageEvacuationTimeMs: number,
    sampleCount: number
  }]
}
```

**Zod schema**: `AnalyticsSummarySchema` from `@3minutes/contracts`

---

### Admin Locations — `GET /api/admin/locations`

Returns array of locations.

```typescript
// Array of:
{
  id: string,
  buildingId: string,
  floorPlanId: string | null,
  locationRef: string,
  label: string,
  origin: { x, y, z },
  routePoints: [{ x, y, z }],
  exitPoint: { x, y, z },
  createdAt: string  // ISO datetime
}
```

**Zod schema**: `LocationListSchema` from `@3minutes/contracts`

---

### Admin Floor Plans — `GET /api/admin/floor-plans`

Returns `{ items: FloorPlan[] }` (NOT a bare array).

```typescript
{
  items: [{
    id: string,
    buildingId: string,
    name: string,
    fileUrl: string | null,
    metadata: Record<string, unknown>,
    createdAt: string
  }]
}
```

**Zod schema**: `FloorPlanListSchema` from `@3minutes/contracts`

---

### Admin Upload Floor Plan — `POST /api/admin/floor-plans` (multipart/form-data)

Fields: `file` (binary), `name` (optional string)

Returns `FloorPlanResponse`.

---

### Admin Create Location — `POST /api/admin/locations`

```typescript
// Request body (camelCase JSON):
{
  locationRef: string,     // unique ref within building
  label: string,           // display name
  floorPlanId?: string,
  origin?: { x, y, z },   // defaults to {0,0,0}
  routePoints: [{ x, y, z }],  // 1-100 points required
  exitPoint: { x, y, z }
}
// Note: buildingId is optional and ignored by server (uses DEMO_BUILDING_ID)
```

---

### Generate QR — `POST /api/admin/locations/{locationId}/rescue-qr`

No body required.

```typescript
// Response:
{
  locationId: string,
  guestUrl: string,         // full URL for guest/traveler
  qrSvgUrl: string,         // relative URL to download SVG
  qrPngUrl: string          // relative URL to download PNG
}
```

Download via `GET http://localhost:8000{qrSvgUrl}` or `GET http://localhost:8000{qrPngUrl}`.

**Zod schema**: `QrProvisionResponseSchema` from `@3minutes/contracts`

---

### Compliance Reports

**Create**: `POST /api/admin/compliance-reports`
```typescript
{ periodFrom: string, periodTo: string }  // ISO datetimes, no buildingId
```
Returns `{ reportId: string, status: "pending" }`

**Check status**: `GET /api/admin/compliance-reports/{reportId}`
Returns `{ reportId, status, downloadUrl: string|null, generatedAt: string|null }`

**Download**: `GET /api/admin/compliance-reports/{reportId}/download` → PDF blob

---

## Error envelope (all errors)

```typescript
{
  error: {
    code: string,   // e.g. "QR_TOKEN_INVALID", "VALIDATION_ERROR"
    message: string,
    details?: any
  }
}
```

---

## CORS

Allowed origins: `http://localhost:5173`, `http://localhost:5174`, `http://localhost:3000`
