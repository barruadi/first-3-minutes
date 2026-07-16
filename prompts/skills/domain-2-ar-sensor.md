# Skill Catalog Domain 2 — AR, Sensor, dan Gameplay

## D2-PROVIDER-PROBE — Validasi AR provider pada device

**Tujuan:** Membuktikan provider dapat membuka camera scene dan render object.

**Langkah:**

1. Inspeksi dependency existing.
2. Build minimal scene pada device target.
3. Render satu object/arrow.
4. Cek camera permission.
5. Cek lifecycle/background.
6. Catat limitation.

**Output:** Keputusan provider untuk Architect/changelog.

**Guardrail:** Jangan membangun seluruh feature sebelum probe lulus.

---

## D2-MODULE-BOUNDARY — Membuat drill module interface

**Tujuan:** Menjaga Domain 2 terintegrasi dengan Domain 1 tanpa coupling.

**Langkah:**

- Implement entry component/service.
- Typed input/output.
- Lifecycle callbacks.
- Debug harness injection optional.
- No backend rating calls.

---

## D2-COORDINATE-NORMALIZER — SpatialMap ke AR coordinate

**Tujuan:** Mengubah backend relative coordinate ke provider coordinate.

**Langkah:**

1. Baca convention Architect.
2. Buat pure adapter.
3. Test axis/sign/scale.
4. Render fixture markers.
5. Jangan mutate source map.

---

## D2-SAFE-ZONE-SELECTION — Pilih target safe zone

**Tujuan:** Menentukan safe zone valid secara deterministic.

**Langkah:**

- Filter valid element.
- Gunakan start pose/nearest bila tersedia.
- Stable tie-break.
- Handle empty map sebagai error.

---

## D2-AR-DIRECTION-ARROW — Render arrow ke target

**Tujuan:** Menampilkan neon-green arrow di floor plane.

**Langkah:**

- Create lightweight geometry.
- Align direction.
- Reuse material.
- Update based on pose.
- Keep instruction readable.

**Verifikasi:** Arrow menunjuk fixture safe/exit pada device.

---

## D2-EARTHQUAKE-AUDIO — Rumbling audio lifecycle

**Tujuan:** Memulai/menghentikan loop deterministik.

**Langkah:** preload kecil, start on state, stop on transition, cleanup on unmount.

---

## D2-CAMERA-SHAKE — Simulasi shake bounded

**Tujuan:** Memberi efek gempa tanpa merusak readability.

**Langkah:** seeded/random offsets bounded, no permanent transform drift, stop/reset on state exit.

---

## D2-MONOTONIC-COUNTDOWN — Timer 30 detik

**Tujuan:** Countdown presisi milidetik.

**Langkah:**

1. Record monotonic start.
2. Derive remaining from clock, bukan decrement interval.
3. Render formatted milliseconds.
4. Emit timeout once.
5. Test fake clock.

---

## D2-LIGHT-CAPABILITY — Ambient light adapter

**Tujuan:** Mendapat lux atau explicit unavailable.

**Langkah:** detect support, subscribe, normalize, timestamp, cleanup, expose capability.

**Guardrail:** Null tidak dianggap `<10`.

---

## D2-CAMERA-BRIGHTNESS — Mean darkness analyzer

**Tujuan:** Mengukur mean brightness camera frame.

**Langkah:**

- Sample frame at controlled frequency.
- Downsample for performance.
- Compute luminance mean.
- Calibrate threshold.
- Timestamp.
- Avoid storing frame.

---

## D2-GYRO-ROLLING-VARIANCE — Stability measurement

**Tujuan:** Menghitung variance <0.05 pada rolling window.

**Langkah:**

1. Normalize rate/timestamps.
2. Maintain fixed-duration buffer.
3. Compute per-axis/combined variance sesuai decision.
4. Handle insufficient samples.
5. Unit test known sequences.

---

## D2-SHELTER-FUSION — Combined validation

**Tujuan:** Memvalidasi darkness + stability continuous tiga detik.

**Langkah:**

- Evaluate capability policy.
- Start candidate timestamp.
- Reset on any false/unknown.
- Emit once after three seconds.
- Record reaction time.
- Measure callback latency.

---

## D2-SENSOR-HARNESS — Injectable sensor streams

**Tujuan:** Menguji tanpa gerakan fisik setiap run.

**Langkah:** define adapter interfaces, fake implementations, fake clock, scenario presets, disable by default.

Scenario minimum:

- dark + stable success.
- dark + unstable fail.
- bright + stable fail.
- condition breaks at 2.9s.
- unsupported.

---

## D2-TRANSITION-FIRE — Earthquake ke fire alarm

**Tujuan:** Cleanup phase satu dan start phase dua atomik.

**Langkah:** stop rumble/shake, record reaction, start alarm, init smoke/obstacle/evac timer.

---

## D2-SMOKE-OVERLAY — Smoke 70%

**Tujuan:** Mengurangi visibilitas tanpa memblokir critical UI.

**Langkah:** lightweight particles/overlay, opacity calibration, lifecycle cleanup, performance profile.

---

## D2-HAZARD-SPAWN — Fallen cabinet pada hazard zone

**Tujuan:** Memakai mapped hazard coordinate.

**Langkah:** select hazard, normalize coordinate, instantiate lightweight model, define interaction trigger.

**Guardrail:** No hardcoded final location.

---

## D2-POSTURE-ESTIMATOR — LOW/TOO_HIGH/UNKNOWN

**Tujuan:** Menyediakan posture state dari provider pose/sensor fusion.

**Langkah:**

1. Implement Architect-selected method.
2. Normalize floor/height.
3. Return UNKNOWN when unreliable.
4. Poll/evaluate 100 ms.
5. Test threshold crossing.

---

## D2-POSTURE-WARNING — Warning ≤100 ms

**Tujuan:** Menampilkan red border/text segera setelah `TOO_HIGH`.

**Langkah:** timestamp reading, update state minimal, render accessible warning, measure latency with harness.

---

## D2-POSTURE-SCORE — Percentage calculation

**Tujuan:** Menghitung percentage berdasarkan valid measurable samples.

**Langkah:** count LOW vs LOW+TOO_HIGH; UNKNOWN excluded or policy documented; clamp 0–100; unit test.

---

## D2-QTE-ENGINE — Lima tap dalam dua detik

**Tujuan:** Mengelola tap window deterministik.

**Langkah:**

- Activate trigger.
- Record first/activation timestamp according contract.
- Accept in-zone taps.
- Count to five.
- Unlock on fifth within window.
- Reset on timeout.
- Unit test boundaries.

---

## D2-EXIT-COMPLETION — Final route completion

**Tujuan:** Menentukan user mencapai exit dan menghentikan timer.

**Langkah:** use provider trigger/distance convention, emit once, stop alarm/smoke/sensors, construct metrics.

---

## D2-METRICS-ASSEMBLY — Build DrillMetrics

**Tujuan:** Menghasilkan output contract valid.

**Langkah:** validate finite/non-negative/range; include scan ID via parent; no rating calculation.

---

## D2-RESOURCE-CLEANUP — Cleanup scene dan sensor

**Tujuan:** Tidak ada camera/audio/listener leak.

**Checklist:** timer, animation loop, sensor subscriptions, frame processor, audio, scene object, app-state listener.

---

## D2-PERFORMANCE-PROFILE — Frame dan latency profiling

**Tujuan:** Mengukur render dan sensor reaction.

**Output:** average frame time, callback latency, polling interval, device.

---

## D2-FAILURE-SUMMARY — Failure reasons

**Tujuan:** Mengembalikan failure reason jelas ke Domain 1.

Reason minimum: timer, sensor unavailable, tracking lost, interrupted, internal error.

---

## D2-HANDOFF — Handoff Domain 2

**Output wajib:** entry component, input/output, provider, capability matrix, test harness use, timing evidence, guidance-event behavior, cleanup behavior, known device limitation.
