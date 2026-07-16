# 3MINUTES — Agentic Development Repository

Folder `prompts/` adalah pusat kendali spesifikasi, konteks sistem, persona agent, daftar skill, dan state kerja untuk implementasi 3MINUTES dalam hackathon 30 jam oleh empat anggota tim.

Dokumen ini tidak menggantikan source code. Source code berada pada:

```text
backend/
frontend/resident-mobile/
frontend/admin-portal/
frontend/guest-webar/
frontend/packages/
```

## Produk yang dibangun

1. **Resident Mobile App** berbasis React Native.
2. **AR Drill dan Sensor Module** di dalam Resident Mobile App yang sama.
3. **FastAPI Backend dan Spatial AI Service**.
4. **B2B Admin Portal** berbasis React.
5. **Guest/Traveler WebAR** tanpa login melalui QR lokasi.

Seluruh fitur dalam PRD wajib dipertahankan. Agent tidak boleh menghapus fitur, menggantinya dengan slide, atau mempertahankan mock pada jalur demo akhir.

## Struktur final

```text
ROOT/
├── prompts/
│   ├── README.md
│   ├── config/
│   ├── docs/
│   ├── agents/
│   ├── skills/
│   └── memory/
├── backend/
└── frontend/
    ├── resident-mobile/
    ├── admin-portal/
    ├── guest-webar/
    └── packages/
        ├── contracts/
        └── design-tokens/
```

## Urutan sumber kebenaran

1. `prompts/config/system.md`
2. `prompts/docs/prd.md`
3. `prompts/docs/architecture.md`
4. `prompts/docs/design.md`
5. `prompts/config/environment.md`
6. Prompt role di `prompts/agents/`
7. Skill di `prompts/skills/`
8. State terbaru di `prompts/memory/scratchpad.md`
9. Riwayat keputusan di `prompts/memory/changelog.md`

Jika dokumen pada tingkat yang sama bertentangan, hentikan perubahan kontrak, catat konflik pada scratchpad, dan minta Architect mengeluarkan keputusan pada changelog.

## Flow kerja final

### Fase 0 — Dokumen agentic

Pastikan seluruh folder `prompts/` sudah ada dan dikomit.

### Fase 1 — Bootstrap framework

Jalankan:

```text
prompts/agents/00-bootstrap-engineer.md
```

Bootstrap membuat fondasi nyata:

- npm workspaces;
- React Native pada `frontend/resident-mobile/`;
- React/Vite pada `frontend/admin-portal/`;
- Guest WebAR pada `frontend/guest-webar/`;
- FastAPI pada `backend/`;
- PostgreSQL schema demo dan seed;
- `frontend/packages/contracts/`;
- `frontend/packages/design-tokens/`;
- fixture dan smoke test.

Audit hasilnya dengan:

```text
prompts/agents/00-bootstrap-reviewer.md
```

Bootstrap baru boleh digabung ke `develop` ketika tidak ada temuan BLOCKER atau HIGH.

### Fase 2 — Orchestration dan contract freeze

Jalankan:

```text
prompts/agents/01-orchestrator.md
prompts/agents/02-architect.md
```

Orchestrator membuat task board dan dependency graph. Architect membekukan kontrak API, schema, ownership, installation identity, spatial coordinate, fixture, dan performance budget.

### Fase 3 — Implementasi paralel

- Anggota 1: `prompts/agents/03-coder/domain-1-b2c-mobile.md`
- Anggota 2: `prompts/agents/03-coder/domain-2-ar-sensor.md`
- Anggota 3: `prompts/agents/03-coder/domain-3-backend-ai.md`
- Anggota 4: `prompts/agents/03-coder/domain-4-b2b-webar.md`

Jangan memberi prompt “implement seluruh domain”. Orchestrator harus membagi domain menjadi vertical slice kecil dengan acceptance criteria, ownership, dependency, dan bukti test yang jelas.

### Fase 4 — Review dan QA per task

Setiap task menjalani:

```text
Coder → Reviewer → Perbaikan → QA → Merge → Integration Test
```

Gunakan:

```text
prompts/agents/04-reviewer.md
prompts/agents/05-qa-tester.md
```

## Pembagian domain dan path

### Domain 1 — B2C Resident Mobile

```text
frontend/resident-mobile/src/features/home/**
frontend/resident-mobile/src/features/scan/**
frontend/resident-mobile/src/features/rewards/**
frontend/resident-mobile/src/features/history/**
```

Domain 1 juga memiliki shell mobile, shared UI mobile, dan integration adapter untuk drill.

### Domain 2 — AR Drill dan Sensor

```text
frontend/resident-mobile/src/features/drill/**
frontend/resident-mobile/src/test-harness/sensors/**
```

Domain 2 berada di aplikasi React Native yang sama dengan Domain 1, bukan aplikasi terpisah.

### Domain 3 — Backend dan AI

```text
backend/**
```

Domain 3 memiliki FastAPI, database, Gemini, rating, anti-abuse, analytics, QR, guest route, dan PDF.

### Domain 4 — B2B Admin dan Guest WebAR

```text
frontend/admin-portal/**
frontend/guest-webar/**
```

Admin Portal dan Guest WebAR adalah dua bundle terpisah karena kebutuhan bundle size dan runtime berbeda.

## Shared paths

Perubahan pada file berikut membutuhkan persetujuan Architect atau integration owner:

```text
package.json
package-lock.json
tsconfig.base.json
.env.example
docker-compose.yml
frontend/resident-mobile/package.json
frontend/resident-mobile/App.tsx
frontend/resident-mobile/src/navigation/**
frontend/packages/contracts/**
frontend/packages/design-tokens/**
```

## Status task standar

```text
BACKLOG
READY
IN_PROGRESS
IMPLEMENTED
IN_REVIEW
CHANGES_REQUESTED
TESTING
BLOCKED
VERIFIED
INTEGRATED
```

Tidak boleh menggunakan status samar seperti “hampir selesai”.

## Invariant produk

- Scan berhenti pada 45 detik.
- Full scan menghasilkan tepat 15 frame.
- Payload 15 JPEG maksimal 4 MB.
- Gemini hard timeout delapan detik.
- Drop–Cover–Hold countdown 30 detik.
- Shelter validation menggabungkan darkness dan stability.
- Smoke/posture polling setiap 100 ms.
- QTE lima tap dalam dua detik.
- Reward eligible sekali per rolling cycle tujuh hari.
- Score decay 5% per minggu setelah lebih dari 30 hari tidak latihan.
- QR hanya untuk Guest/Traveler.
- Guest WebAR tanpa login.
- Guest WebAR bundle maksimal 1,5 MB terkompresi.
- Guest scene siap maksimal tiga detik.
- Dashboard siap maksimal dua detik.
- Compliance PDF diunduh maksimal tiga detik.

## Definition of Done sistem

Tiga alur berikut harus bekerja menggunakan API nyata:

1. Resident: scan → spatial map → AR drill → metrics → rating/reward/history.
2. Admin: dashboard demo → analytics → floor/location → QR → compliance PDF.
3. Guest: QR URL → camera permission → route resolution → WebAR arrows.

Setiap agent wajib memperbarui `prompts/memory/scratchpad.md` dan `prompts/memory/changelog.md` sebelum sesi selesai. Memory berisi fakta operasional, keputusan, bukti test, dan blocker; bukan private chain-of-thought.
