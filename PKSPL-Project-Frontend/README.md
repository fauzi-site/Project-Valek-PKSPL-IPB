# PKSPL Project Frontend

Aplikasi web Single Page Application (SPA) berbasis **React 18** dan **Vite 5** untuk Sistem Valuasi Ekonomi Ekosistem Pesisir & Laut — PKSPL IPB.

## Fitur Utama

- **Peta Interaktif & Shapefile Parser**: Visualisasi spasial wilayah pesisir dan upload Shapefile langsung di browser via Leaflet & shpjs.
- **9 Alur Kerja Peneliti**:
  1. Pemetaan Geospasial & Tutupan Lahan
  2. Indeks Ekonomi
  3. Master Data Proyek
  4. Identifikasi Jasa Ekosistem & Metode Valuasi
  5. Spreadsheet Input Data Valuasi
  6. Perhitungan Otomatis TEV, BCR, dan NPV
  7. Analitik & Grafik Visualisasi (Recharts)
  8. Laporan & Pratinjau Cetak / PDF
  9. Diskusi Interaktif & Realtime Chat
- **Konsol Super Admin**: Manajemen Pengguna, Master Data Global, Pemantauan Proyek, dan Log Aktivitas.
- **Landing Page Publik**: Halaman publik yang menyajikan informasi valuasi dan peta sebaran proyek.

## Teknologi

- React 18
- Vite 5
- Tailwind CSS 3
- React Router DOM 6
- Leaflet & React Leaflet
- Recharts
- Laravel Echo & Pusher-js (WebSocket Reverb)
- i18next & react-i18next
- SheetJS (xlsx)
- Lucide React

## Cara Menjalankan

1. Salin konfigurasi environment:
   ```bash
   cp .env.example .env
   ```
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Jalankan server development:
   ```bash
   npm run dev
   ```
4. Build untuk produksi:
   ```bash
   npm run build
   ```

## Lisensi & Kepemilikan

PKSPL IPB University.
