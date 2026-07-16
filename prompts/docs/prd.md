# Product Requirements Document — 3MINUTES

## 1. Ringkasan eksekutif

3MINUTES adalah platform latihan keselamatan yang mengubah lingkungan nyata pengguna menjadi arena latihan evakuasi yang personal, terukur, dan dapat digunakan untuk kebutuhan resident, enterprise, serta traveler.

Produk berangkat dari kenyataan bahwa aplikasi mitigasi bencana jarang dibuka setiap hari. Retensi tidak dibangun melalui konten edukasi pasif, tetapi melalui tiga mekanisme yang sudah ditentukan:

1. **B2B safety compliance dan telemetry** untuk pengelola gedung.
2. **B2C Safety Rating dan financial incentive** untuk resident.
3. **Traveler safe-zone certification** untuk hotel, Airbnb, mall, atau tempat asing.

Platform mempunyai tiga pengalaman pengguna:

- **B2C Resident Mobile App** untuk scan ruangan, AR drill, score, reward, dan progress.
- **B2B Property Manager Portal** untuk analytics, floor plan, location, QR traveler, dan compliance report.
- **Guest/Traveler WebAR** untuk navigasi evakuasi instan tanpa login.

## 2. Masalah inti

### 2.1 Panic paralysis dan cognitive overload

Saat bencana terjadi, pengguna dapat freeze dan kehilangan kemampuan mengingat instruksi panjang. Konten teks atau video yang pernah dilihat belum tentu dapat diterapkan saat tekanan tinggi.

### 2.2 Theory versus muscle memory gap

Mengetahui teori keselamatan secara pasif tidak otomatis membentuk refleks motorik. Pengguna membutuhkan latihan fisik di ruangan nyata tempat mereka tinggal atau bekerja.

### 2.3 One-size-fits-all fallacy

Panduan umum tidak mempertimbangkan posisi meja, lemari tinggi, kaca, pintu, dan tata ruang lokal. Keselamatan sangat bergantung pada konteks ruang.

### 2.4 Broken corporate safety induction

Latihan fisik massal mahal, mengganggu produktivitas, dan sering diikuti hanya sebagai formalitas. Pengelola gedung juga sulit mengukur kecakapan individu.

### 2.5 Zero telemetry data

Data compliance sering berhenti pada absensi. Pengelola tidak mengetahui reaction time, shelter time, bottleneck, area failure, atau kecenderungan route.

## 3. Solusi produk

### 3.1 Spatial AI Room Personalization

Resident merekam video ruangan selama 45 detik. Aplikasi mengambil 15 frame, lalu backend menggunakan Gemini Multimodal Vision untuk menghasilkan peta terstruktur:

- `SAFE_ZONE`
- `HAZARD_ZONE`
- `EXIT_POINT`

### 3.2 180-second physical AR drill

Ruangan nyata digunakan sebagai arena simulasi. Pengguna diarahkan menuju safe zone, divalidasi berada di bawah meja, lalu menjalani escape track dengan smoke, posture monitoring, obstacle, dan QTE.

### 3.3 Hardware-validated compliance

Aplikasi menggunakan camera brightness, ambient light, gyroscope, accelerometer, dan interaction timing untuk memastikan latihan memerlukan gerakan fisik.

### 3.4 Active Safety Rating

Drill menghasilkan metrics yang dikirim ke backend. Backend menghitung Safety Rating, tier, reward eligibility, dan decay.

### 3.5 B2B analytics dan traveler WebAR

Property manager mendapat data performa gedung. QR ditempatkan untuk traveler atau tamu acak. QR tidak menjadi kewajiban pekerja.

## 4. Segmen pengguna

### 4.1 B2C Resident

Pengguna rumah, apartemen, atau penghuni yang ingin memetakan ruang dan melatih respons.

Kebutuhan:

- Memahami status keamanan rumah.
- Menjalankan latihan personal.
- Melihat progress dan score.
- Mempertahankan reward eligibility.

### 4.2 B2B Property Manager

Pengelola kantor, apartemen, sekolah, mall, hotel, atau Airbnb.

Kebutuhan:

- Melihat partisipasi dan performa.
- Menemukan titik lambat dan failure area.
- Mengelola floor plan dan location.
- Membuat QR traveler.
- Menghasilkan compliance report.

### 4.3 Guest/Traveler

Tamu yang berada di lokasi asing dan membutuhkan rute evakuasi tanpa akun.

Kebutuhan:

- Akses instan dari QR.
- Tidak menginstal aplikasi.
- Tidak mendaftar akun.
- Melihat arahan kamera ke exit terdekat.

## 5. Prinsip produk yang mengikat

1. Seluruh backlog wajib diimplementasikan.
2. QR hanya untuk Guest/Traveler.
3. Pekerja tidak diwajibkan scan QR.
4. Video scan 45 detik tetap jalur utama resident.
5. Alternatif single floor-plan image tidak menggantikan acceptance video scan.
6. Rating dan reward dihitung server-side.
7. Guest WebAR tidak memiliki login.
8. Fallback AI mencegah crash, tetapi bentuk data tetap sama.
9. Mobile menggunakan React Native.
10. Backend menggunakan FastAPI dan Gemini.
11. Admin menggunakan React.
12. Guest menggunakan WebAR/WebXR.

## 6. Scope pengalaman B2C Resident

### 6.1 Home

Home menampilkan:

- Safety Score saat ini.
- Tier saat ini: Platinum, Gold, atau Silver.
- Status rumah atau lokasi resident.
- Tombol utama untuk memulai simulation.
- Ringkasan reward.
- Ringkasan latihan terakhir.
- Akses menuju history dan progress.

### 6.2 Spatial Video Scan

Resident menjalankan guided walkthrough.

Alur:

1. User membuka camera screen.
2. User menekan `Start Scan` dari posisi awal.
3. Aplikasi menghapus cache scan sebelumnya.
4. Recording dimulai.
5. TTS meminta user berjalan perlahan menuju main exit sambil panning kiri dan kanan.
6. Recording berhenti otomatis pada 45 detik.
7. Sistem mengambil satu frame setiap tiga detik.
8. Frame di-resize maksimal 1080p.
9. Frame dikonversi JPEG quality 70%.
10. Tepat 15 frame disimpan sementara.
11. Payload dihitung.
12. Bila payload lebih dari 4 MB, aplikasi melakukan penyesuaian kompresi yang tetap mempertahankan 15 frame dan batas 1080p.
13. Aplikasi mengirim `scan_id` dan 15 frame ke backend.
14. SpatialMap diterima dan disimpan pada flow mobile.

Acceptance:

- Recording berakhir tepat 45,0 detik.
- Full scan menghasilkan tepat 15 frame.
- Total payload maksimal 4 MB.
- Cache lama terhapus saat scan baru dimulai.

### 6.3 AR Drop–Cover–Hold

Alur:

1. User berdiri di titik awal.
2. User menekan `Begin Earthquake Drill`.
3. AR view menggunakan SpatialMap.
4. Audio gemuruh diputar.
5. Camera matrix shake mensimulasikan gempa.
6. Neon-green arrow menunjuk safe zone.
7. Countdown 30 detik dimulai.
8. User merangkak dan menempatkan device di bawah meja.
9. Shelter validator memeriksa darkness dan stability selama tiga detik.
10. Bila valid, shelter phase sukses.
11. Bila timer mencapai 0, drill berhenti dan Failure Summary dibuka.

Acceptance:

- Timer menampilkan presisi hingga milidetik.
- Success terdaftar maksimal 500 ms setelah kondisi valid.
- Failure state muncul saat timer 0.

### 6.4 Smoke dan obstacle escape

Alur:

1. Earthquake audio berhenti.
2. Fire alarm dimulai.
3. Smoke overlay mengurangi visibilitas sekitar 70%.
4. Fallen cabinet ditempatkan pada hazard zone.
5. User bergerak menuju exit.
6. Posture diperiksa setiap 100 ms.
7. Bila tinggi melampaui satu meter, red warning muncul.
8. Pada obstacle, user menyelesaikan QTE lima tap dalam dua detik.
9. Path terbuka pada tap kelima valid.
10. User mencapai exit point.

Acceptance:

- Warning tampil maksimal 100 ms setelah pelanggaran.
- QTE unlock pada tap valid kelima.

### 6.5 Result, rating, reward, dan history

Setelah drill:

- Client mengirim `reaction_time_ms`.
- Client mengirim `evacuation_time_ms`.
- Client mengirim `posture_score_percentage`.
- Backend menyimpan log.
- Backend menghitung rating.
- Backend menentukan tier.
- Backend menentukan reward eligibility.
- Mobile menampilkan result.
- Home, rewards, history, dan progress mengambil data backend terbaru.

### 6.6 Panduan aksesibilitas suara untuk AR drill

Resident dapat memilih satu mode sebelum drill dimulai:

- `VISUAL_ONLY` — panah dan instruksi visual.
- `VISUAL_AND_AUDIO` — visual tetap tampil dan panduan suara aktif.
- `AUDIO_PRIMARY` — panduan penting dapat dipahami tanpa warna, teks, ikon, atau panah.

Panduan suara berjalan di simulasi AR yang sama, bersamaan dengan panah, alarm/gempa, sensor, posture, hazard, countdown, dan hasil. Instruksi ditentukan oleh posisi, arah hadap, waypoint aktif, jarak belokan, hazard, safe zone, exit point, posture, dan state drill. Gunakan instruksi tindakan seperti “Berjalan lurus”, “Dalam dua meter, belok kanan”, “Rintangan di depan, bergerak ke kiri”, “Tetap merunduk”, dan “Anda telah mencapai titik evakuasi”.

Larangan: jangan menjadikan warna, teks, ikon, atau panah sebagai satu-satunya cara memahami instruksi; jangan mengucapkan “ikuti panah hijau” atau “tekan tombol berwarna”.

Acceptance:

- Mode dapat dipilih sebelum drill dan diterapkan sepanjang drill.
- `AUDIO_PRIMARY` menyampaikan setiap event keselamatan kritis melalui suara tindakan yang jelas.
- Instruksi belokan menyebut arah dan jarak bila relevan.
- Hazard, posture, safe zone, exit, dan completion menghasilkan instruksi yang sesuai.
- TTS kritis dapat menurunkan volume alarm/gempa sementara tanpa menghentikan state simulasi.

## 7. Scope backend dan Spatial AI

### 7.1 Multimodal VLM Spatial Mapping

Endpoint menerima multipart form:

- `scan_id`
- Tepat 15 JPEG

Backend:

1. Memvalidasi jumlah file.
2. Memvalidasi MIME dan image decode.
3. Memvalidasi payload.
4. Mengirim image ke Gemini.
5. Meminta pure JSON.
6. Mengekstrak JSON.
7. Memvalidasi schema.
8. Menyimpan map.
9. Mengembalikan 200.

Hard timeout:

- Request AI dibatalkan setelah delapan detik.
- Backend mengembalikan 504.

Invalid AI JSON:

- `JSONDecodeError` atau validation error ditangkap.
- Backend menghasilkan fallback layout terkonfigurasi.
- Response tetap mengikuti SpatialMap schema.

### 7.2 Rating engine

Input:

- Reaction time.
- Evacuation time.
- Posture score.
- Timestamp server.
- Drill history.

Aturan:

- Reward eligibility maksimal satu kali per rolling cycle tujuh hari.
- Drill tambahan boleh memperbarui highscore/history.
- Rating dihitung server-side.
- Tier: Platinum, Gold, Silver.
- Formula dan threshold dikonfigurasi server-side dan konsisten.

### 7.3 Decay

Untuk MVP hackathon, decay diterapkan saat profile dibaca atau drill baru disimpan; scheduler mingguan tidak diperlukan.

Bila `current_date - last_drill > 30 days`:

- Safety score berkurang 5% per minggu.
- Proses selesai dalam window maksimal 10 menit.
- Job harus idempotent untuk minggu yang sama.

## 8. Scope B2B Admin Portal

### 8.1 Demo building scope tanpa login

Admin Portal tidak memiliki login atau akun. Seluruh endpoint admin memakai satu `DEMO_BUILDING_ID` yang ditentukan server/environment; portal tidak mengirim atau memilih building arbitrary.

### 8.2 Dashboard analytics

Widgets:

- Participation Rates.
- Average Time to Shelter.
- Escape Route Trends.
- Interactive spatial heat-map.

Acceptance:

- Dashboard initial render lengkap maksimal dua detik pada kondisi demo.

### 8.3 Spatial Floor Plan Uploader

Admin mengunggah floor plan dan mengelola lokasi/room/grid point.

Portal harus:

- Menampilkan upload progress.
- Menampilkan hasil floor plan.
- Memungkinkan pemilihan room/location.
- Mengirim metadata ke backend.

### 8.4 QR Provisioner

Admin:

1. Membuka Location Management.
2. Memilih location.
3. Menekan Generate Rescue QR.
4. Backend membuat opaque location-bound URL.
5. Backend menghasilkan SVG atau PNG high resolution.
6. Portal menampilkan preview dan download.

QR digunakan untuk traveler/tamu, bukan pekerja.

Acceptance:

- QR dapat dipindai camera native.
- URL membuka Guest WebAR.
- Spatial parameter tidak dapat ditamper secara manual.

### 8.5 Compliance PDF

Admin menekan export. Backend membuat PDF terstruktur berisi data compliance, tabel, dan elemen dokumen yang tersedia pada sistem.

Acceptance:

- Download selesai maksimal tiga detik pada dataset demo.

## 9. Scope Guest/Traveler WebAR

Alur:

1. Traveler memindai QR.
2. Browser default membuka URL.
3. WebAR dimuat tanpa login.
4. Browser meminta camera permission.
5. Token dikirim ke backend.
6. Backend mengembalikan route context.
7. QR/marker menjadi origin lokal `(0,0,0)`.
8. Luminous arrows dirender menuju exit.
9. Arrow menyesuaikan orientasi saat perangkat berputar.
10. Browser menyediakan mode visual, visual+audio, atau audio utama untuk panduan rute yang sama.

Acceptance:

- Scene operational maksimal tiga detik setelah landing.
- Total compressed bundle maksimal 1,5 MB.
- Target tracking/render 60 FPS.
- Invalid token tidak menampilkan route.
- Permission denied memiliki state yang jelas.
- Dalam mode audio utama, waypoint, belokan, hazard, dan exit dapat dipahami tanpa bergantung pada panah atau warna.

## 10. Data yang harus tersedia

### Resident

- User profile.
- Home status.
- Spatial scans.
- Spatial maps.
- Drill logs.
- Safety rating.
- Tier.
- Reward eligibility/history.

### Enterprise

- Admin account/session.
- Building.
- Floor plan.
- Location.
- Aggregated analytics.
- QR token mapping.
- Compliance report request.

### Guest

- Token.
- Location reference.
- Route origin.
- Route points.
- Exit target.

## 11. Error dan edge cases wajib

### Mobile scan

- Permission denied.
- Recording interrupted.
- App backgrounded.
- Kurang dari 15 frame.
- Payload terlalu besar.
- Upload gagal.
- AI timeout.
- Invalid spatial response.

### Drill

- Sensor tidak tersedia.
- Camera access hilang.
- User tidak stabil selama tiga detik.
- Timer habis.
- QTE timeout.
- App backgrounded.
- Metrics upload gagal.

### Backend

- Invalid file count.
- Invalid MIME.
- Duplicate scan ID.
- Gemini timeout.
- Gemini invalid JSON.
- Building demo belum dikonfigurasi.
- Client mencoba mengirim building scope arbitrary dan server mengabaikannya.
- Invalid QR token.
- PDF generation error.

### Admin

- Data dashboard demo kosong atau gagal dimuat.
- Analytics kosong.
- Upload floor plan gagal.
- Location belum dipilih.
- QR generation gagal.
- PDF export gagal.

### Guest

- Invalid/expired token.
- Camera denied.
- Unsupported browser.
- API unavailable.
- Marker/origin belum terdeteksi.
- Low frame rate.

## 12. Non-goals

Non-goals berikut hanya memperjelas batas implementasi dan tidak menghapus fitur PRD:

- QR bukan check-in wajib pekerja.
- Single-image floor plan bukan pengganti video scan resident.
- Client tidak menghitung tier final.
- Guest tidak membuat akun.
- Portal tidak menghitung analytics dari raw log sendiri.
- WebAR tidak menyimpan reward atau score.

## 13. Success metrics hackathon

Demo dianggap berhasil jika:

- Resident flow berjalan end-to-end.
- Admin flow berjalan end-to-end.
- Guest flow berjalan end-to-end.
- Seluruh target waktu/payload yang eksplisit diukur.
- Tidak ada contract mismatch.
- Fallback AI dapat didemokan tanpa crash.
- Building isolation diuji.
- QR traveler dapat dipindai perangkat nyata.

## 14. Traceability matrix

| ID | Story | Domain utama | Consumer/Dependency |
|---|---|---|---|
| PRD-01 | Spatial Video Scan & Frame Sampler | Domain 1 | Domain 3 |
| PRD-02 | Multimodal VLM Spatial Mapping | Domain 3 | Domain 1/2 |
| PRD-03 | AR Drop Cover Hold | Domain 2 | Domain 1/3 |
| PRD-04 | AR Smoke & Obstacle Escape | Domain 2 | Domain 1/3 |
| PRD-05 | Anti-Abuse Core Rating | Domain 3 | Domain 1 |
| PRD-06 | Enterprise Analytics Dashboard | Domain 4 | Domain 3 |
| PRD-07 | Spatial Location QR Provisioner | Domain 3 + 4 | Guest WebAR |
| PRD-08 | Zero-Friction WebAR Escape Pilot | Domain 4 | Domain 3 |
