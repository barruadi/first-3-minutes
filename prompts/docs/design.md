# Design System dan UI/UX Flow — 3MINUTES

## 1. Arah visual

3MINUTES menggunakan visual yang tenang, tepercaya, dan grounded agar produk keselamatan tidak terasa seperti alarm yang terus-menerus menegangkan. Kontras tinggi dan warna fungsional tetap digunakan ketika simulasi berlangsung.

Brand palette utama:

| Token | Hex | Peran |
|---|---|---|
| Deep Navy | `#0A2947` | Primary brand, header, primary text, navigation, CTA utama |
| Warm Cream | `#F3E4C9` | Background utama, panel informasi, warm surface |
| Muted Sage | `#D3D4C0` | Secondary surface, chart neutral, status area |
| Earth Brown | `#8B5E3C` | Accent, secondary CTA, progress emphasis, decorative anchor |

Functional safety colors yang disebut di PRD tetap diperbolehkan hanya dalam konteks simulasi:

- Neon green untuk directional arrow dan safe target.
- Red untuk danger warning.
- Dark gray/black untuk smoke overlay.

Warna fungsional tidak menggantikan brand palette pada halaman umum.

## 2. Prinsip desain

### 2.1 Calm before urgency

Home, rewards, history, dan admin dashboard menggunakan ritme tenang. Saat drill dimulai, visual beralih ke mode urgency dengan countdown, shake, smoke, dan warning.

### 2.2 Safety information first

Informasi utama harus terbaca dalam satu pandangan:

- Score.
- Tier.
- Status lokasi.
- Tombol latihan.
- Arah safe zone.
- Countdown.
- Warning postur.

### 2.3 Physical interaction clarity

Setiap state drill memberi satu instruksi primer. Jangan menampilkan banyak CTA bersamaan.

### 2.4 Consistent cross-platform identity

Mobile, Admin, dan Guest WebAR memakai warna, spacing, shape, dan icon language yang sama, namun density disesuaikan.

### 2.5 No decorative clutter

Tidak ada gradient yang tidak perlu, glassmorphism berlebihan, atau shadow berat. Depth diperoleh melalui surface contrast, border tipis, dan spacing.

## 3. Design tokens

### 3.1 Color tokens

```css
:root {
  --color-primary-900: #0A2947;
  --color-surface-warm: #F3E4C9;
  --color-surface-muted: #D3D4C0;
  --color-accent-earth: #8B5E3C;

  --color-text-primary: #0A2947;
  --color-text-on-primary: #FFFFFF;
  --color-text-secondary: #475665;
  --color-border: rgba(10, 41, 71, 0.22);
  --color-surface-white: #FFFFFF;

  --color-safety-safe: #39FF14;
  --color-safety-danger: #D93025;
  --color-smoke: #30343B;
}
```

### 3.2 Typography

Gunakan dua voice:

- **Display/editorial** untuk headline dan score besar.
- **Sans-serif struktural** untuk body, label, button, chart, dan instruction.

Rekomendasi implementasi:

- Mobile dan Admin: Inter atau system sans sebagai default untuk performa dan keterbacaan.
- Headline dapat memakai serif editorial yang tersedia pada asset project, dengan fallback system serif.
- Guest WebAR menggunakan system font untuk menjaga bundle.

Type scale:

| Role | Mobile | Desktop | Weight |
|---|---:|---:|---:|
| Display score | 48 | 64 | 700 |
| H1 | 32 | 48 | 700 |
| H2 | 24 | 32 | 650/700 |
| H3 | 20 | 24 | 600 |
| Body | 16 | 16 | 400 |
| Body small | 14 | 14 | 400 |
| Caption | 12 | 12 | 500 |
| Button | 16 | 15 | 600/700 |
| Drill countdown | 48 | N/A | 700 tabular numerals |

### 3.3 Spacing

Gunakan grid 4 px:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

Mobile horizontal padding: 20–24 px.

Admin content max width: 1440 px dengan padding 24–32 px.

### 3.4 Radius

| Element | Radius |
|---|---:|
| Small chip | 8 px |
| Input | 12 px |
| Card | 16 px |
| Primary CTA | 999 px atau 16 px konsisten per platform |
| Drill overlay | 12 px |
| QR preview | 16 px |

Gunakan satu pola button per platform. Jangan mencampur pill dan rectangle tanpa aturan.

### 3.5 Border dan elevation

- Border utama: 1 px navy opacity 16–22%.
- Card shadow sangat halus hanya bila surface sulit dibedakan.
- Tidak ada shadow pada elemen AR.
- Focus ring harus terlihat pada admin web.

## 4. Iconography

- Gunakan outline icon dengan stroke konsisten.
- Icon keselamatan harus literal: home, shield, camera, route, exit, reward, history.
- Jangan memakai icon dekoratif yang dapat disalahartikan.
- Directional arrow AR harus high-contrast, luminous, dan berbeda dari button icon.

## 5. Motion

### General UI

- Transition 150–250 ms.
- Hindari animasi looping pada halaman umum.
- Progress dan score dapat menggunakan count-up singkat.

### Drill

- Camera shake random tetapi dibatasi agar UI instruksi tetap terbaca.
- Smoke bergerak konsisten tanpa menutup seluruh CTA darurat.
- Red warning berkedip dengan frekuensi yang terbaca dan tidak menutupi countdown.
- Arrow bergerak halus mengikuti orientation.

## 6. Accessibility

- Body text minimum 14 px; default 16 px.
- Kontras teks utama terhadap cream/sage harus tinggi.
- Informasi tidak hanya dibedakan dengan warna.
- Warning memiliki warna, border, icon, dan teks.
- Button memiliki hit target minimum 44×44 px.
- TTS scan tidak menjadi satu-satunya instruksi; teks juga tampil.
- Admin dapat dinavigasi keyboard pada flow non-canvas.
- Camera permission denial memberi instruksi pemulihan.

## 7. Komponen global

### 7.1 Primary Button

- Background navy.
- Text white.
- Height minimum 52 px mobile.
- Loading state mempertahankan ukuran.
- Disabled state menggunakan sage dengan text navy opacity.

### 7.2 Secondary Button

- Border navy.
- Background transparent/cream.
- Text navy.

### 7.3 Earth Accent Button

- Background brown.
- Text white.
- Digunakan untuk reward atau secondary action penting, bukan danger.

### 7.4 Card

- Surface white atau cream.
- Radius 16 px.
- Border halus.
- Padding 16–24 px.

### 7.5 Score Ring/Card

Menampilkan:

- Numeric score.
- `/100`.
- Tier.
- Status perubahan.
- Last updated.

### 7.6 Status Badge

Contoh:

- `Terverifikasi Aman`
- `Latihan Dibutuhkan`
- `Reward Eligible`
- `Tidak Eligible Minggu Ini`

Badge menggunakan surface dan icon, bukan warna saja.

### 7.7 Loading/Error/Empty State

Semua screen data wajib memiliki:

- Skeleton atau progress.
- Pesan error.
- Retry.
- Empty copy yang menjelaskan tindakan.

## 8. B2C Resident Mobile flow

### 8.1 Navigation

Bottom navigation atau equivalent:

- Home.
- Rewards.
- History.
- Profile/Location bila dibutuhkan oleh shell existing.

Simulation flow menggunakan stack fullscreen dan tidak menampilkan bottom navigation saat drill.

### 8.2 Home screen

Urutan konten:

1. Header lokasi resident.
2. Safety Score utama.
3. Status lokasi.
4. CTA `Mulai Latihan 180 Detik`.
5. Quick status scan terakhir.
6. Reward summary.
7. Progress/history summary.

State:

- Belum pernah scan.
- Spatial map sedang diproses.
- Siap latihan.
- Rating stale lebih dari 30 hari.
- API error.

### 8.3 Scan preparation

Konten:

- Penjelasan durasi 45 detik.
- Instruksi mulai dari home position.
- Instruksi berjalan menuju main exit.
- Instruksi panning kiri/kanan.
- Permission status.
- CTA `Start Scan`.

### 8.4 Active scan

Overlay:

- Timer 00:45 menuju 00:00.
- Progress ring/bar.
- Current instruction.
- Frame count dapat ditampilkan sebagai debug-only, bukan fokus user.
- Stop manual tidak menjadi jalur normal; interruption harus dikonfirmasi.

TTS dan teks sinkron.

### 8.5 Processing/upload

Tahap visual:

```text
Menyiapkan 15 frame
Mengompresi gambar
Mengunggah peta ruangan
Menganalisis safe zone
```

Jangan mengklaim Gemini selesai sebelum response diterima.

### 8.6 Spatial result preview

Menampilkan ringkasan:

- Jumlah safe zone.
- Jumlah hazard.
- Exit point.
- CTA lanjut ke drill.

Tidak perlu menambahkan editor spatial karena tidak ada di PRD.

### 8.7 Drill ready screen

- Instruksi berdiri di titik awal.
- Pastikan ruang aman untuk bergerak.
- CTA begin.
- Ringkasan target safe zone.
- Pemilih aksesibilitas: Visual saja, Visual dan panduan suara, atau Audio sebagai panduan utama.
- Mode audio utama menjelaskan tindakan; tidak mengandalkan label warna atau ikon.

### 8.8 Drop–Cover–Hold screen

Layer prioritas:

1. Camera/AR scene.
2. Safe arrow.
3. Countdown.
4. Single instruction.
5. Sensor status minimal.
6. Pause/exit safety control kecil tetapi tersedia.
7. Kontrol mode panduan dan status audio yang dapat diakses screen reader.

Success state:

- Konfirmasi singkat.
- Tidak memutus flow terlalu lama.
- Transisi ke escape phase.

Failure state:

- Timer 0.
- Failure Summary dengan alasan.
- Retry dan kembali.

### 8.9 Smoke escape screen

- Camera scene dengan smoke 70%.
- Arrow ke route/exit.
- Posture warning.
- Obstacle/QTE overlay saat trigger.
- Elapsed time.
- Instruksi suara kontekstual untuk lurus, belok, rintangan, posture, safe zone, exit, dan selesai.

QTE:

- Area tap besar.
- Counter `0/5` sampai `5/5`.
- Window dua detik terlihat.
- Reset jelas bila gagal.

### 8.10 Result screen

Menampilkan:

- Success/failure.
- Reaction time.
- Evacuation time.
- Posture score.
- Safety Rating baru.
- Tier.
- Reward eligibility.
- CTA ke Home/History.

Data rating hanya dari response backend.

### 8.11 Rewards

- Current eligibility.
- Tier.
- Reward/coupon list dari backend.
- Alasan tidak eligible bila payout minggu ini sudah digunakan.
- Last eligible date.

### 8.12 History & Progress

- Grafik reaction time.
- Grafik evacuation time.
- Grafik posture score atau combined progress.
- List drill detail.
- Empty state untuk user baru.

## 9. B2B Admin Portal flow

### 9.1 Demo entry

- Portal langsung membuka dashboard demo tanpa login.
- Tampilkan label building demo aktif.
- Tampilkan loading/error saat data dashboard dimuat.

### 9.2 App shell

Navigation:

- Dashboard.
- Locations/Floor Plan.
- QR Management.
- Compliance.

Building context ditampilkan tetapi tidak dapat dipilih secara bebas bila user hanya memiliki satu scope.

### 9.3 Dashboard

Layout desktop:

1. Header dan date scope.
2. KPI cards.
3. Participation chart.
4. Average shelter time.
5. Escape route trend.
6. Spatial heat-map.
7. Export compliance CTA.

Mobile/tablet responsive tetap dapat membaca metric, tetapi target utama admin adalah desktop.

### 9.4 Heat-map

- Floor/location grid.
- Legend jelas.
- Tooltip: participation, failure rate, average time.
- Warna brand digunakan untuk scale dasar; danger color hanya untuk high failure.
- Data berasal dari backend.

### 9.5 Floor plan uploader

- Drag/drop dan file picker.
- Preview.
- Upload progress.
- Floor metadata.
- Error format/size.

### 9.6 Location management

- Floor plan canvas.
- Room/location list.
- Select location.
- Generate QR CTA.
- Preview route metadata yang tersedia.

### 9.7 QR management

- QR preview high resolution.
- Location label.
- Guest URL yang dapat disalin.
- Download SVG/PNG.
- Penjelasan bahwa QR ditujukan untuk guest/traveler.

### 9.8 Compliance export

- Date range/building scope.
- Export loading.
- Success download.
- Error retry.

## 10. Guest/Traveler WebAR flow

### 10.1 Landing

Tujuan landing hanya:

- Brand kecil.
- Lokasi yang ter-resolve bila tersedia.
- Camera permission CTA.
- Penjelasan singkat.

Tidak ada login, registration, reward, history, atau dashboard.

### 10.2 Permission state

- Explain camera use.
- Request permission.
- Bila denied, tampilkan cara membuka browser settings secara umum.

### 10.3 Loading route

- Loading maksimal tiga detik target.
- Jangan memuat asset tidak diperlukan.
- Bila token invalid, hentikan sebelum scene route.

### 10.4 WebAR scene

Layer:

1. Camera feed.
2. Origin/marker tracking.
3. Luminous arrows.
4. Minimal label distance/exit.
5. Recenter instruction bila tracking hilang.
6. Pemilih mode visual, visual+audio, atau audio utama.

Mode audio utama mengucapkan tindakan dan arah tanpa merujuk warna, ikon, atau panah. Tombol mode dan status instruksi harus dapat dioperasikan dengan screen reader.

Tidak ada UI kompleks.

### 10.5 Error state

- Token invalid/expired.
- Browser unsupported.
- Camera denied.
- Route unavailable.
- Tracking lost.

Error tidak boleh menampilkan arrow dummy seolah route valid.

## 11. Chart visual language

- Navy sebagai primary series.
- Brown sebagai secondary series.
- Sage sebagai neutral/background band.
- Cream sebagai chart surface.
- Red hanya untuk failure/high-risk.
- Label dan tooltip menggunakan navy text.
- Grafik tidak bergantung pada warna saja; gunakan marker/label.

## 12. Responsive rules

### Mobile app

Target portrait terlebih dahulu. Drill dapat mengunci orientation yang dipilih Architect berdasarkan AR provider dan demo.

### Admin

- ≥1200 px: multi-column dashboard.
- 768–1199 px: dua kolom.
- <768 px: satu kolom, heat-map dapat scroll/zoom.

### Guest WebAR

Target portrait mobile. Landscape harus tetap tidak crash dan memberi orientation hint bila diperlukan.

## 13. Content tone

- Instruksi langsung dan pendek.
- Hindari jargon teknis pada user-facing copy.
- Gunakan kata kerja tindakan: `Berlindung`, `Tetap rendah`, `Ketuk 5 kali`, `Ikuti panah`.
- Error menjelaskan tindakan pemulihan.

## 14. Design QA checklist

- [ ] Semua halaman memakai palette baru.
- [ ] Functional red/green hanya pada safety context.
- [ ] Home memiliki hierarchy jelas.
- [ ] Timer terbaca di atas camera feed.
- [ ] Warning tidak hanya mengandalkan warna.
- [ ] Button hit target cukup.
- [ ] Admin chart memiliki legend dan tooltip.
- [ ] Guest tidak menampilkan navigasi aplikasi kompleks.
- [ ] Loading/error/empty state tersedia.
- [ ] Contrast dan font size diperiksa pada device nyata.
