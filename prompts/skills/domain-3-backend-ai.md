# Skill Catalog Domain 3 — Backend, AI, Rating, Analytics, QR, PDF

## D3-API-BOOTSTRAP — FastAPI baseline

**Tujuan:** Menjalankan API demo dengan config, CORS, dan error envelope sederhana.

**Verifikasi:** endpoint demo pertama merespons dan clean start.

---

## D3-DB-BOOTSTRAP — PostgreSQL schema demo

**Langkah:** configure connection, buat schema dari model, reset aman untuk database demo, seed command.

**Guardrail:** No manual untracked schema edits.

---

## D3-PYDANTIC-CONTRACTS — Mirror shared schema

**Tujuan:** Field/type/enum sama dengan TypeScript.

**Langkah:** implement schemas, validate fixtures, add contract tests, reject duplicate divergent schemas.

---

## D3-SEED-DEMO — Repeatable demo seed

**Isi:** resident, admin, building, floor, locations, spatial map, drills, analytics-ready data, guest route.

**Verifikasi:** reset + seed twice deterministic.

---

## D3-UPLOAD-VALIDATION — Validate 15 JPEG

**Langkah:** exactly 15, file size, total size, MIME, decode, dimension, safe temp handling.

**Guardrail:** Do not trust filename/MIME only.

---

## D3-SCAN-IDEMPOTENCY — Duplicate scan handling

**Tujuan:** Menentukan behavior retry.

**Langkah:** inspect existing scan by ID/user, return existing result or conflict according frozen policy, transaction safe.

---

## D3-GEMINI-PROMPT — Spatial mapping prompt

**Tujuan:** Meminta pure JSON SAFE/HAZARD/EXIT relative coordinate.

**Langkah:** build fixed system instruction, attach 15 images efficiently, require schema/minimum, no markdown.

**Guardrail:** Prompt change that alters schema requires Architect review.

---

## D3-AI-TIMEOUT — Hard timeout 8s

**Tujuan:** Mengembalikan 504 setelah limit.

**Langkah:** wrap async call, cancel/abandon safely, map timeout code, test with injected slow client, measure actual.

---

## D3-JSON-EXTRACTION — Robust pure JSON parse

**Langkah:** strip fence, locate object, json decode, schema validate, sanitize labels, reject impossible structures.

---

## D3-SPATIAL-FALLBACK — Valid fallback map

**Trigger:** JSON decode/schema/minimum failure, bukan hard timeout.

**Output:** Same SpatialMap contract, `source=fallback`, safe+exit minimum.

**Guardrail:** Fallback is configured, not random.

---

## D3-SPATIAL-PERSISTENCE — Save scan/map

**Langkah:** statuses, user association, source, timestamps, transaction, read endpoint if needed.

---

## D3-RESIDENT-INSTALLATION-SCOPE — Resident demo persistence

**Tujuan:** Scan/drill/history dikorelasikan ke `installationId` anonim perangkat, tanpa akun atau autentikasi.

---

## D3-DRILL-VALIDATION — Validate metrics

**Langkah:** type/range, scan ownership, finite values, timestamp server authority, duplicate policy.

---

## D3-RATING-FORMULA — Server-side rating

**Langkah:** normalized reflex/speed/posture, configurable weights, clamp, tier thresholds, boundary tests.

**Guardrail:** Never return formula inputs from client as authoritative score.

---

## D3-REWARD-WINDOW — Rolling seven-day anti-abuse

**Langkah:** query latest issuance, compare server timestamp, transaction/lock, issue once, concurrent test.

---

## D3-DRILL-TRANSACTION — Atomic complete flow

**Tujuan:** Drill, profile, reward commit together.

**Verifikasi:** forced failure rollback.

---

## D3-DECAY-JOB — Weekly 5% decay

**Langkah:** inactive >30d, hitung minggu yang belum diterapkan saat profile dibaca/disimpan, update profile secara idempotent.

---

## D3-HOME-READ-MODEL — Resident home aggregate

**Tujuan:** One endpoint for score/tier/status/reward/last drill.

**Guardrail:** Avoid N+1.

---

## D3-REWARDS-HISTORY — Resident read endpoints

**Langkah:** eligibility response, records, paginated history, stable ordering, index.

---

## D3-ADMIN-DEMO-SCOPE — Admin tanpa login

**Langkah:** ambil `DEMO_BUILDING_ID` dari settings server, jangan buat login, password hash, token/session, atau membership.

---

## D3-BUILDING-GUARD — Repository-level scope

**Tujuan:** Semua admin data terfilter building.

**Langkah:** repository menerima demo building scope dari settings; test membuktikan parameter building dari client diabaikan.

---

## D3-ANALYTICS-AGGREGATION — KPI dan trends

**Langkah:** define denominator participation, shelter average, route trend periods, heatmap cells, query/index, seed validation.

**Output:** Analytics contract.

---

## D3-FLOORPLAN-STORAGE — Floor plan upload

**Langkah:** validate file, safe object/path, metadata, building association, retrieval.

---

## D3-LOCATION-MANAGEMENT — Room/grid location

**Langkah:** create/list, unique ref, route points, exit, building/floor consistency.

---

## D3-OPAQUE-TOKEN — Generate QR token

**Langkah:** cryptographic random, hash SHA-256/truncated representation policy, store mapping, never expose coordinate in query.

---

## D3-QR-RENDER — SVG dan PNG QR

**Tujuan:** Native-scannable high-res output.

**Langkah:** build guest URL, generate SVG/PNG, set MIME/disposition, test native camera.

---

## D3-GUEST-ROUTE — Token resolver

**Langkah:** hash lookup, revoked/invalid fail closed, return minimal GuestRoute, no auth, rate/abuse consideration.

---

## D3-PDF-COMPLIANCE — Generate report

**Langkah:** validate period, scope data, table layout, generate PDF, MIME/disposition, measure under 3s.

---

## D3-ERROR-MAPPER — Stable error envelope

**Tujuan:** Exception → HTTP/code/message/request ID.

**Guardrail:** No stack/secret client.

---

---

## D3-CONTRACT-TEST — API schema verification

**Langkah:** validate response against fixture/schema for every public endpoint.

---

## D3-SECURITY-TEST — QR token/upload tests

**Coverage:** client building override diabaikan, QR token tamper, malformed upload, secret scan.

---

## D3-PERFORMANCE-TEST — Backend budget

**Measure:** AI timeout, analytics query, QR generation, PDF generation, seed dataset.

---

## D3-HANDOFF — Backend handoff

**Output wajib:** base URL, env, schema/seed commands, endpoint matrix, installation identity/demo scope, fixtures, known errors, timing, consumer notes.
