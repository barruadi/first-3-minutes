# Skill Registry — 3MINUTES

## Tujuan

Folder ini mendefinisikan tindakan yang dapat dipilih oleh Orchestrator, Architect, Coder, Reviewer, atau QA. Skill bukan persona; skill adalah prosedur kerja berulang dengan input, langkah, output, dan verifikasi yang jelas.

Setiap skill memiliki ID stabil agar task board dapat menulis:

```yaml
recommended_skills:
  - D1-SCAN-STATE-MACHINE
  - D1-FRAME-SAMPLING
  - D3-SPATIAL-AI-PIPELINE
```

## Cara menggunakan skill

1. Pilih skill sesuai domain owner.
2. Pastikan prerequisite terpenuhi.
3. Baca contract yang disebut.
4. Jalankan langkah secara berurutan.
5. Simpan artifact/output.
6. Jalankan verification.
7. Catat hasil pada scratchpad.

Skill tidak memberi izin untuk melanggar ownership. Domain 1 tidak boleh menjalankan skill rating Domain 3 hanya karena skill tersedia.

## Struktur skill

Setiap skill memuat:

- **ID**: identifier.
- **Tujuan**: hasil yang diinginkan.
- **Gunakan ketika**: trigger.
- **Input**: file/data/contract.
- **Langkah**: prosedur.
- **Output**: artifact.
- **Verifikasi**: bukti completion.
- **Guardrail**: larangan/risiko.

## Skill lintas role

Walaupun file dibagi per domain, semua coder harus menerapkan pola umum:

### REPO-INSPECT

Inspeksi struktur, command, lockfile, env, dan perubahan existing sebelum edit.

### CONTRACT-READ

Baca shared contract dan fixture; jangan membuat type lokal duplicate.

### TEST-FIRST-BOUNDARY

Buat test untuk timing, calculation, parser, dan state transition yang rawan error sebelum atau bersamaan dengan implementation.

### RESOURCE-CLEANUP

Pastikan camera, sensor, timer, audio, file, subscription, dan object URL dibersihkan.

### ERROR-STATE-COMPLETE

Setiap async flow memiliki loading, success, error, retry/cancel yang sesuai.

### HANDOFF-WRITE

Catat entry point, output, contract, command test, known limitation, dan next owner.

### MEMORY-UPDATE

Perbarui scratchpad dan changelog.

## Skill invocation output

Agent yang menjalankan skill harus melaporkan:

```markdown
## Skill execution
- Skill ID:
- Input:
- Files changed:
- Commands:
- Result:
- Evidence:
- Contract impact:
- Follow-up:
```
