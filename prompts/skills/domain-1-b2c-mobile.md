# Skill Catalog Domain 1 — B2C Resident Mobile

## D1-REPO-BOOTSTRAP — Bootstrap React Native

**Tujuan:** Menjalankan project mobile pada perangkat fisik dengan TypeScript, navigation, env, contracts, dan theme.

**Gunakan ketika:** Project belum berjalan atau belum memiliki baseline Domain 1.

**Input:** `prompts/config/environment.md`, repository existing, device target.

**Langkah:**

1. Inspeksi package manager dan scaffold existing.
2. Pin toolchain/lockfile.
3. Pastikan iOS Development Build sesuai iPhone demo.
4. Tambahkan env loader tanpa secret.
5. Tambahkan navigation shell.
6. Import shared contracts dan design tokens.
7. Buat API client sederhana untuk endpoint demo.
8. Dokumentasikan run command.

**Output:** App boot, folder ownership, `.env.example`, command dev/build/test.

**Verifikasi:** Clean install dan build pada device.

**Guardrail:** Jangan mengganti scaffold major bila project existing sudah berjalan.

---

## D1-DESIGN-TOKENS — Implementasi design system mobile

**Tujuan:** Menyatukan palette, spacing, typography, radius, dan reusable components.

**Langkah:**

1. Buat token file dari `prompts/docs/design.md`.
2. Buat typed theme.
3. Implement Button, Card, Badge, ScoreCard, Loading, ErrorState.
4. Hindari hardcoded color pada screen.
5. Tambahkan component tests/snapshots bila tersedia.

**Output:** Shared mobile component library.

**Verifikasi:** Search hardcoded old palette; visual check pada device.

**Guardrail:** Neon green/red hanya untuk Domain 2 simulation.

---

## D1-NAVIGATION-SHELL — Resident navigation

**Tujuan:** Menyediakan Home, Rewards, History, scan stack, drill stack, result stack.

**Langkah:**

1. Definisikan typed route params.
2. Pisahkan general tabs dan fullscreen simulation stack.
3. Pastikan SpatialMap tidak dilempar melalui serialization yang tidak aman; gunakan store/ID sesuai architecture.
4. Handle deep state/restart secara minimal.
5. Integrasikan Domain 2 entry route.

**Verifikasi:** Navigate seluruh flow tanpa crash dan back behavior benar.

---

## D1-PERMISSION-GATE — Camera dan file permission

**Tujuan:** Mengelola permission sebelum scan.

**Langkah:**

1. Cek status permission.
2. Request pada user action.
3. Handle granted/denied/blocked.
4. Tampilkan recovery instruction.
5. Jangan masuk recording bila permission tidak granted.

**Verifikasi:** Test fresh install, denied, blocked.

---

## D1-SCAN-STATE-MACHINE — State machine scan

**Tujuan:** Menghindari race antara recording, sampling, compression, upload, dan interruption.

**Langkah:**

1. Definisikan state/event.
2. Pastikan transition legal.
3. Gunakan monotonic clock.
4. Guard completion sekali.
5. Cleanup pada error/unmount/background.
6. Persist hanya state yang diperlukan.

**Output:** Reducer/state machine dengan tests.

**Verifikasi:** Test transition happy path dan interruption.

---

## D1-TEMP-CACHE-PURGE — Purge scan lama

**Tujuan:** Mencegah storage leakage dan data campur.

**Langkah:**

1. Tentukan temporary directory milik scan.
2. Saat Start Scan, hapus file/index previous scan.
3. Buat new scan directory.
4. Cleanup setelah upload/cancel.
5. Log jumlah byte yang dihapus pada debug.

**Verifikasi:** Jalankan dua scan dan cek file system/temp index.

**Guardrail:** Jangan menghapus file di luar app-owned temp directory.

---

## D1-EXACT-45S-RECORDING — Recording cutoff

**Tujuan:** Berhenti tepat 45,0 detik.

**Langkah:**

1. Catat monotonic start.
2. Schedule cutoff.
3. Gunakan elapsed actual untuk UI.
4. Stop recorder sekali.
5. Catat actual duration.
6. Handle library finalization latency terpisah dari capture duration.

**Verifikasi:** Minimal beberapa run pada device; report actual duration dan tolerance.

---

## D1-TTS-GUIDANCE — Guided walkthrough TTS

**Tujuan:** Memberi instruksi scan sinkron dengan teks.

**Langkah:**

1. Definisikan sequence pesan tanpa menambah flow baru.
2. Trigger berdasarkan elapsed milestones.
3. Tampilkan teks yang sama.
4. Stop speech pada completion/cancel/background.
5. Handle TTS unavailable tanpa memblokir scan.

**Verifikasi:** Audio/text sync pada device.

## D1-ACCESSIBILITY-GUIDANCE — AR voice adapter

**Tujuan:** Menyimpan `AccessibilityMode` dan mengucapkan `GuidanceEvent` dari Domain 2 tanpa mengubah keputusan navigasi.

**Guardrail:** Mode `AUDIO_PRIMARY` tidak mengucapkan referensi warna, ikon, teks, atau panah. Event `CRITICAL` melakukan ducking audio ambience/alarm dan event identik di-debounce.

---

## D1-FRAME-TARGETS — Generate target timestamp

**Tujuan:** Menghasilkan tepat 15 target timestamp untuk 45 detik.

**Langkah:**

1. Gunakan contract convention Architect.
2. Generate target deterministik.
3. Unit test count, order, bounds.
4. Simpan debug metadata.

**Output:** Pure function.

---

## D1-FRAME-SAMPLING — Extract/select 15 frame

**Tujuan:** Mendapatkan frame terdekat untuk setiap target.

**Langkah:**

1. Baca video/frame stream.
2. Map target ke frame terdekat.
3. Pastikan tidak ada missing/duplicate yang tidak disengaja.
4. Pastikan exactly 15.
5. Fail explicit jika tidak memenuhi.

**Verifikasi:** Report timestamps dan visual sanity check.

---

## D1-IMAGE-RESIZE-COMPRESS — Resize dan JPEG 70%

**Tujuan:** Menyiapkan frame 1080p/JPEG quality 70%.

**Langkah:**

1. Decode metadata.
2. Preserve aspect ratio.
3. Limit long edge/target according to 1080p convention.
4. Encode JPEG 70%.
5. Verify decode output.
6. Record byte size.

**Guardrail:** Jangan menyimpan base64 besar dalam JS state bila file URI dapat dipakai.

---

## D1-PAYLOAD-BUDGET — Menjaga ≤4 MB

**Tujuan:** Total 15 frame tidak melebihi 4 MB.

**Langkah:**

1. Sum actual bytes.
2. Jika >4 MB, jalankan bounded recompression strategy.
3. Jangan mengurangi frame count.
4. Revalidate decode dan total.
5. Bila tetap gagal, tampilkan explicit error/retry scan.

**Verifikasi:** Test high-detail room fixture.

---

## D1-MULTIPART-UPLOAD — Upload spatial scan

**Tujuan:** Mengirim exactly 15 JPEG dan `scan_id`.

**Langkah:**

1. Build multipart dari file URI.
2. Validate local count/size.
3. Sertakan `installationId` anonim sesuai contract.
4. Support cancellation.
5. Parse 200/error envelope/504.
6. Validate SpatialMap dengan shared schema.

**Verifikasi:** Backend log menerima 15; contract test.

---

## D1-SPATIAL-MAP-STORE — Menyimpan spatial context

**Tujuan:** Menyediakan map untuk drill dan status resident.

**Langkah:**

1. Validate response.
2. Store normalized map/ID.
3. Preserve `source` gemini/fallback.
4. Expose selector ke Domain 2 adapter.
5. Clear on new scan as appropriate.

**Guardrail:** Jangan mengubah coordinate di Domain 1.

---

## D1-DRILL-ADAPTER — Integrasi Domain 2

**Tujuan:** Membuka drill dan menerima outcome tanpa coupling internal.

**Langkah:**

1. Import shared input/output type.
2. Pass SpatialMap dan scan ID.
3. Handle success/failure/cancel.
4. Prevent duplicate launch.
5. Navigate result after callback.

**Verifikasi:** Fixture outcome dan real module.

---

## D1-DRILL-SUBMISSION — Submit metrics

**Tujuan:** Mengirim metrics ke backend dan menampilkan result server.

**Langkah:**

1. Validate metrics locally untuk type/range dasar.
2. POST once dengan request state.
3. Parse DrillResult.
4. Jangan hitung rating client.
5. Support retry tanpa duplicate reward melalui backend idempotency policy.
6. Refresh resident queries.

---

## D1-HOME-READ-MODEL — Home screen data

**Tujuan:** Merender Safety Score, tier, status, reward, last drill.

**Langkah:**

1. Fetch endpoint.
2. Map response tanpa business calculation.
3. Implement loading/error/empty.
4. Pull-to-refresh/manual refresh.
5. Update after drill.

---

## D1-REWARDS-SCREEN — Reward eligibility

**Tujuan:** Menampilkan eligible/not eligible dan reward records.

**Guardrail:** Jangan mengubah eligibility berdasarkan local week.

**Verifikasi:** Test dua response fixture/real.

---

## D1-HISTORY-PROGRESS — History dan chart

**Tujuan:** Menampilkan drill list dan progress.

**Langkah:**

1. Fetch paginated history.
2. Sort sesuai server order.
3. Map reaction/evacuation/posture.
4. Render chart ringan.
5. Empty/error states.

**Guardrail:** Chart tidak mengubah raw metrics.

---

## D1-NETWORK-RESILIENCE — Loading, retry, cancellation

**Tujuan:** Membuat flow network tidak crash.

**Langkah:**

- Central error mapping.
- Request cancellation on unmount.
- Retry explicit.
- No infinite retry.
- Preserve prepared frames for retry selama session.
- Cleanup setelah final success/cancel.

---

## D1-DEVICE-PROFILING — Memory dan file profiling

**Tujuan:** Memastikan 15 image tidak menyebabkan memory spike/storage leak.

**Langkah:**

1. Profile before/during/after scan.
2. Hindari base64 array.
3. Confirm temp cleanup.
4. Record payload/memory evidence.

---

## D1-TEST-SUITE — Unit dan integration tests

**Tujuan:** Menutup critical logic.

**Coverage minimum:** state machine, timestamp, 15 frames, byte sum, error mapping, adapter, refetch.

---

## D1-HANDOFF — Handoff Domain 1

**Output wajib:**

- Run command.
- Device tested.
- API base setup.
- Scan evidence.
- Entry point Domain 2.
- Known issues.
- Tests.
- Files owned.
