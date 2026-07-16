# Skill Catalog Domain 4 — Admin Portal dan Guest WebAR

## D4-WEB-WORKSPACE — Bootstrap dua web app

**Tujuan:** Admin dan Guest memiliki build terpisah.

**Langkah:** create/inspect projects, env, shared contracts/tokens, independent build, command docs.

**Guardrail:** Guest must not import Admin entry/dependencies.

---

## D4-ADMIN-DEMO-CLIENT — Dashboard tanpa login

**Langkah:** form, submit, secure storage/cookie behavior per backend, protected routes, expiry, logout/error.

---

## D4-API-CLIENT — Typed API client

**Tujuan:** Central base URL/error mapping/blob support tanpa auth.

**Guardrail:** Jangan mengirim building scope; server menggunakan `DEMO_BUILDING_ID`.

---

## D4-ADMIN-SHELL — Navigation/layout

**Tujuan:** Dashboard, Locations, QR, Compliance.

**Verifikasi:** Protected route and responsive layout.

---

## D4-KPI-CARDS — Participation dan shelter metrics

**Langkah:** map aggregate response, loading/error/empty, format values without recalculation.

---

## D4-TREND-CHARTS — Escape route trends

**Tujuan:** Recharts/Chart implementation from backend data.

**Guardrail:** No raw log aggregation.

---

## D4-HEATMAP — Interactive spatial heat-map

**Langkah:** render floor/grid, scale/legend, tooltip, failure/time/sample, keyboard/fallback list where practical.

---

## D4-DASHBOARD-MARKS — Measure ≤2s

**Langkah:** performance mark navigation start, mark after all required widgets settled, measure, log test evidence.

---

## D4-FLOOR-UPLOAD — Upload floor plan

**Langkah:** picker/drop, preview, client validation, progress, API multipart, error/retry, refresh list.

---

## D4-LOCATION-SELECTOR — Select room/grid

**Tujuan:** Memilih location existing/create according API.

**Guardrail:** No route calculation client.

---

## D4-QR-GENERATE — Generate rescue QR

**Langkah:** require location, call API, show preview/location/guest URL, copy, state errors.

---

## D4-QR-DOWNLOAD — SVG/PNG download

**Langkah:** blob/link handling, filename, test native scan.

---

## D4-PDF-EXPORT — Compliance download

**Langkah:** date scope, request blob, loading, download, error, performance marks ≤3s.

---

## D4-GUEST-TOKEN-PARSER — Parse opaque token

**Tujuan:** Extract token only, reject missing/malformed, no coordinate decode.

---

## D4-GUEST-ROUTE-RESOLVE — Fetch GuestRoute

**Langkah:** call no-auth endpoint, validate schema, invalid/expired state, no fake fallback route.

---

## D4-CAMERA-PERMISSION — Web camera flow

**Langkah:** secure context check, explain, request on gesture, grant/deny/blocked, stop tracks cleanup.

---

## D4-WEBAR-PROBE — Provider capability probe

**Tujuan:** Camera scene, marker/origin, one arrow pada target browser.

**Output:** Browser/device support matrix.

---

## D4-LOCAL-ORIGIN — QR/marker as `(0,0,0)`

**Langkah:** initialize tracking, establish transform, expose tracking quality/lost state, test recenter.

---

## D4-ROUTE-NORMALIZER — API route to render coordinates

**Tujuan:** Apply scale/axis convention centrally.

**Guardrail:** Do not mutate API response or invent path.

---

## D4-ARROW-INSTANCING — Luminous directional arrows

**Langkah:** procedural geometry, segment interpolation, orientation, instance/reuse, limit count.

---

## D4-ORIENTATION-LOOP — Smooth update

**Tujuan:** Update scene as hardware turns.

**Langkah:** rAF/provider loop, reuse allocations, smooth transform, pause hidden, cleanup.

---

## D4-TRACKING-RECOVERY — Lost origin state

**Langkah:** detect loss, pause misleading guidance, show recenter instruction, resume when valid.

---

## D4-GUEST-STATE-MACHINE — Landing to active

**States:** resolving, invalid, permission, initializing, searching, active, lost, error.

**Verifikasi:** State transition tests.

---

## D4-BUNDLE-AUDIT — Compressed bundle ≤1.5 MB

**Langkah:** production build, inspect chunks, measure gzip/brotli, remove heavy deps/assets, repeat, record breakdown.

---

## D4-STARTUP-PROFILE — Scene ready ≤3s

**Langkah:** performance marks from landing to operational arrow, test warm/cold network condition defined, optimize critical path.

---

## D4-FPS-PROFILE — Target 60 FPS

**Langkah:** sample rAF deltas, compute average/p95/drop, test device demo, optimize object count/allocation.

---

## D4-UNSUPPORTED-ERROR-UI — Safe failure states

**Coverage:** invalid token, no HTTPS, denied camera, unsupported browser, API unavailable, tracking lost.

---

## D4-ADMIN-E2E — Admin real flow

**Flow:** dashboard demo → floor → location → QR → PDF.

---

## D4-GUEST-E2E — QR real flow

**Flow:** native scan → browser → token → camera → origin → arrow.

## D4-GUEST-ACCESSIBILITY — Browser voice guidance

**Tujuan:** Guest WebAR menyediakan `VISUAL_ONLY`, `VISUAL_AND_AUDIO`, dan `AUDIO_PRIMARY` menggunakan browser speech synthesis.

**Guardrail:** Hitung event dari route, marker, orientation, waypoint, dan hazard; dalam mode audio utama jangan merujuk panah, warna, ikon, atau label.

---

## D4-HANDOFF — Domain 4 handoff

**Output wajib:** Admin/Guest URLs, commands, demo scope, tested browser/device, dashboard/PDF timing, bundle breakdown, startup/FPS, QR evidence, known limitation.
