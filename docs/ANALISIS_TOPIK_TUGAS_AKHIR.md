# Analisis Proyek dan Pembagian Topik Tugas Akhir
## Sistem Valuasi Ekonomi Ekosistem Pesisir & Laut — PKSPL IPB

Dasar analisis: source code, README, `docs/`, dan test fixtures di repository. Aplikasi tidak dijalankan. Yang dibaca langsung: layanan valuasi (`Services/Valuation`), layanan AI (`Services/AI`), fixture CVM dan ITCM, dan dokumen aturan bisnis. Modul frontend dan review/chat hanya dibaca dari README dan struktur direktorinya.

---

## A. Ringkasan Proyek

**Tujuan.** Mendigitalkan alur peneliti dari pemetaan area sampai laporan, dengan keluaran TEV, NPV, dan BCR untuk mangrove, terumbu karang, lamun, dan estuari.

**Masalah utama.** Valuasi ekonomi pesisir biasanya dikerjakan manual di Excel. Metodenya beragam, rawan salah hitung, rawan *double counting*, sulit direview, dan hasilnya tidak transparan bagi publik.

**Komponen (terverifikasi di kode):**
- **Stack:** Laravel 13, PostgreSQL/PostGIS, React 18, Leaflet, Laravel Reverb.
- **Modul spasial:** unggah shapefile, *boundary lookup* wilayah, peta publik dengan filter dan perbandingan program antar-tahun.
- **Mesin valuasi (~5.000 baris):**
  - Kalkulator Provisioning, Regulating, Supporting, dan Cultural.
  - Estimator TCM, CVM, dan HPM.
  - Library matematika buatan sendiri: OLS, Poisson, Logit, Probit, distribusi.
  - WTP nonparametrik (Turnbull, KMT, class median).
  - `BenefitCostPresentValues`, `TevCalculator`, `DoubleCountingChecker`.
- **Kolaborasi dan review:** review, komentar, notifikasi, *activity log*, chat real-time.
- **Modul AI:** orkestrator Gemini/OpenAI, pencarian di database, ekstraksi referensi, `ConfidenceCalculator`.

**Peluang riset:**
1. Estimator CVM, TCM, dan HPM dibangun dari nol di PHP. Kebenarannya bisa divalidasi terhadap Excel (`perhitungan cvm.xlsx`, `ITCM.xlsx`) dan simulasi.
2. Skor kepercayaan AI hanya heuristik (100 jika dari database, 20 jika tanpa referensi, selain itu skor referensi tertinggi). Belum ada evaluasi atau kalibrasi.
3. NPV dan BCR bergantung pada *discount rate*, horizon, dan inflasi, tetapi belum ada analisis sensitivitas atau ketidakpastian.
4. Pengecekan *double counting* berbasis aturan (EOP vs Food Production) dan belum dievaluasi akurasinya.

**Temuan yang perlu diklarifikasi:**
- `PKSPL-Backend/docs/business-rules.md` menyebut "tidak ada autentikasi" dan "AI hanya disimpan". Ini bertentangan dengan README dan kode (Sanctum, RBAC, Gemini). Dokumen itu tampaknya usang dan tidak boleh dijadikan rujukan bab sistem.
- Satu-satunya data responden adalah fixture CVM (100 responden) dan ITCM (60 responden). Keduanya tampak sebagai data latihan dari file xlsx, bukan data lapangan PKSPL.

---

## B. Daftar 9 Judul TA (TA 7 dan 8 tambahan prototype, TA 9 tambahan skripsi kualitatif/campuran)

| No | Judul TA | Jenis | Permasalahan | Fokus dan batasan | Teknologi/metode utama | Hasil akhir | Kesulitan |
|---|---|---|---|---|---|---|---|
| 1 | Perbandingan Estimator Nonparametrik (Turnbull, KMT) dan Parametrik (Logit/Probit) untuk WTP pada CVM Dichotomous Choice dengan Evaluasi Simulasi Monte Carlo | Skripsi | Belum diketahui estimator WTP mana yang paling akurat dan stabil pada ukuran sampel dan desain *bid* tipikal survei pesisir | Hanya CVM dichotomous choice. Tidak mencakup TCM, HPM, CE | Turnbull/KMT, Logit/Probit (MLE), Monte Carlo, *bootstrap* CI | Rekomendasi estimator dan ukuran sampel minimum, serta validasi implementasi | Sedang–Tinggi |
| 2 | Perbandingan Model Count Data (OLS Semilog, Poisson, Negative Binomial) untuk Estimasi Surplus Konsumen TCM Ekowisata Mangrove | Skripsi | Kunjungan wisata berupa data cacah dengan potensi overdispersi, sehingga OLS dapat bias | Hanya TCM individual (ITCM), 1 lokasi wisata | Poisson, NB2, OLS semilog, uji overdispersi, AIC/BIC | Rekomendasi model per karakteristik data, serta perbaikan modul TCM | Sedang–Tinggi |
| 3 | Analisis Sensitivitas dan Ketidakpastian NPV dan BCR Valuasi Ekosistem Pesisir dengan Simulasi Monte Carlo | Skripsi | NPV dan BCR sangat bergantung pada *discount rate*, horizon, dan harga, tetapi hanya disajikan sebagai satu angka | Hanya NPV dan BCR atas benefit/cost yang sudah dihitung. Tidak mengevaluasi estimator hulu | One-way/tornado, Monte Carlo, Sobol/Spearman, distribusi parameter dari literatur | Modul analisis ketidakpastian dengan visualisasi dan interval kelayakan | Sedang |
| 4 | Evaluasi dan Kalibrasi Keandalan Asisten AI (LLM dengan Grounding Database) untuk Rekomendasi Metode Valuasi Ekonomi | Skripsi | Skor kepercayaan AI hanya heuristik dan belum terbukti mencerminkan ketepatan jawaban atau risiko halusinasi | Hanya tugas rekomendasi dan penjelasan metode. Bukan prediksi nilai ekonomi | LLM, RAG sederhana, ECE/Brier, penilaian pakar, Cohen's κ | Bukti keandalan AI, serta *confidence* baru yang terkalibrasi | Tinggi |
| 5 | Pengembangan Modul Pemetaan Spasial Tutupan Lahan dan Perbandingan Program Antar-Tahun Berbasis PostGIS | Prototype | Pemetaan area, tutupan lahan, dan peta publik harus akurat, cepat, dan mudah dipakai | Shapefile ke tutupan lahan ke peta publik. Tidak mencakup perhitungan nilai ekonomi | PostGIS, Leaflet, shpjs, validasi geometri, uji performa | Modul spasial teruji (akurasi luas, waktu muat, UAT/SUS) | Sedang |
| 6 | Pengembangan Modul Review Kolaboratif, Audit Trail, dan Notifikasi Real-Time pada Alur Verifikasi Laporan Valuasi | Prototype | Verifikasi laporan antara peneliti dan admin tidak terlacak dan lambat | Alur review, komentar, notifikasi, audit log, chat. Tidak mencakup mesin valuasi | Laravel Reverb/WebSocket, policy RBAC, *load test*, SUS | Modul review teruji (latensi, ketepatan hak akses, usabilitas) | Sedang |
| 7 | Pengembangan Modul Pengumpulan Data Survei Lapangan (Kuesioner CVM/TCM) dengan Validasi Kualitas Data Responden | Prototype | Data responden saat ini dimasukkan lewat panel input di spreadsheet. Belum ada kuesioner terstruktur, validasi kualitas, dan dukungan kerja di lapangan | Form kuesioner CVM dan TCM, validasi input, deteksi data janggal berbasis aturan, ekspor ke format estimator. Tidak mencakup analisis estimasi WTP/TCM | React (form dinamis), Laravel (`SurveyValuationController`), validasi aturan, PWA/offline bila disepakati | Modul survei teruji (kelengkapan data, tingkat error input, SUS enumerator) | Sedang |
| 8 | Pengembangan Modul Pelaporan Valuasi Otomatis dan Dashboard Analitik dengan Verifikasi Konsistensi Angka | Prototype | Laporan valuasi disusun manual, dan angka di laporan dapat berbeda dari hasil kalkulasi | Penyusunan laporan terstruktur (cetak/ekspor), dashboard analitik, pengecekan konsistensi angka laporan vs kalkulasi. Tidak mengubah estimator | `ReportPrintView`, Recharts, ekspor PDF/XLSX, uji rekonsiliasi angka, SUS | Modul laporan teruji (kesesuaian angka 100%, waktu penyusunan, kepuasan pengguna) | Sedang |

| 9 | Analisis Penerimaan dan Kegunaan Sistem Valuasi Ekonomi Pesisir oleh Peneliti dan Pemangku Kepentingan dengan Pendekatan UTAUT dan Wawancara (Mixed Methods) | Skripsi | Belum diketahui faktor yang mendorong atau menghambat peneliti dan pemangku kepentingan memakai sistem, padahal adopsi menentukan manfaat sistem | Pengguna peneliti, admin, dan pemangku kepentingan publik. Tidak menilai kebenaran perhitungan | UTAUT/TAM, kuesioner Likert, regresi/PLS-SEM bila n cukup, wawancara semi-terstruktur, analisis tematik | Model faktor penerimaan, temuan hambatan, dan rekomendasi perbaikan sistem | Sedang |

### Pendekatan Penelitian Setiap Skripsi

| TA | Pendekatan | Alasan |
|---|---|---|
| 1 CVM | **Kuantitatif** (eksperimental, simulasi) | Pertanyaan berupa bias dan RMSE estimator, dijawab dengan angka dari simulasi terkontrol |
| 2 TCM | **Kuantitatif** (komparatif model statistik) | Membandingkan model regresi pada data kunjungan dengan kriteria AIC/BIC dan surplus konsumen |
| 3 Sensitivitas NPV/BCR | **Kuantitatif** (simulasi dan analisis sensitivitas) | Mengukur pengaruh parameter terhadap NPV/BCR secara numerik |
| 4 Asisten AI | **Campuran**: kuantitatif (akurasi, ECE, Brier) dan kualitatif (penilaian pakar atas kesalahan dan halusinasi) | Metrik menunjukkan seberapa sering salah, penilaian pakar menjelaskan jenis kesalahannya |
| 9 Penerimaan sistem | **Campuran** (*explanatory sequential*): kuesioner kuantitatif lalu wawancara kualitatif | Angka menunjukkan faktor yang berpengaruh, wawancara menjelaskan alasannya |

Skripsi yang murni **kualitatif** (misalnya studi kasus atau fenomenologi) tidak diusulkan sebagai judul tersendiri. Di proyek ini sebagian besar pertanyaan bisa diukur, dan kualitatif lebih bernilai sebagai pelengkap, seperti pada TA 4 dan TA 9. Jika kampus mensyaratkan satu skripsi kualitatif murni, wawancara pada TA 9 dapat dijadikan porsi utamanya.

Catatan: TA 5 dan 6 sudah banyak terimplementasi. TA-nya bukan "membuat dari nol", tetapi merancang ulang, menguji, dan mengevaluasi secara terukur. Pembimbing perlu menetapkan sejak awal bagian yang menjadi kontribusi mahasiswa.

---

## C. Rincian Setiap Judul

### TA 1 — Estimator WTP pada CVM (Skripsi)

**Latar belakang.** CVM mengukur WTP dari respons ya/tidak terhadap *bid*. Estimator nonparametrik (Turnbull/KMT) konservatif karena memakai batas bawah kelas. Estimator parametrik (Logit/Probit) memakai kovariat tetapi sensitif terhadap asumsi distribusi. Sistem sudah mengimplementasikan keduanya (`NonparametricWtp.php`, `ContingentValuationEstimator.php`, `Math/`).

**Rumusan masalah.**
1. Seberapa akurat implementasi sistem dibanding perhitungan referensi (Excel/R)?
2. Bagaimana bias dan varians tiap estimator pada variasi ukuran sampel dan jumlah/rentang *bid*?
3. Estimator mana yang direkomendasikan untuk kondisi survei pesisir?

**Tujuan.** Memvalidasi implementasi, membandingkan bias, RMSE, dan lebar CI antar-estimator, lalu menyusun rekomendasi desain survei.

**Batasan.** Hanya *single-bounded dichotomous choice*. Tanpa *double-bounded*, *payment card*, ataupun CE. Satu ekosistem sebagai studi kasus.

**Kontribusi.** Bukti empiris kinerja estimator WTP pada skenario terkontrol, plus perangkat validasi untuk sistem. Klaim kebaruan global tidak dibuat dan harus diverifikasi lewat tinjauan pustaka.

**Data dan sumber daya.**
- Fixture `cvm_respondents.json` (100 responden: *bid*, wtp, income) sebagai uji kebenaran.
- Data simulasi dengan WTP sebenarnya diketahui (ini yang membuat evaluasi valid).
- Data survei nyata PKSPL bila tersedia.
- R/Python sebagai pembanding.

**Tahapan.**
1. Studi literatur.
2. Verifikasi kode terhadap Excel dan R.
3. Rancang skenario simulasi (n = 50/100/200/500, jumlah *bid* 4/6/8, distribusi WTP log-normal/logistik, kesalahan spesifikasi).
4. Jalankan 1.000+ replikasi per skenario.
5. Analisis hasil.
6. Rekomendasi.

**Metodologi.**
- **Pendekatan:** kuantitatif eksperimental (simulasi), dengan studi kasus data fixture.
- **Metode utama:** Turnbull/KMT, Logit, Probit. Alasannya: sudah ada di kode, standar CVM, dan perbedaan konseptualnya bisa diuji.
- **Variabel:** *bid*, respons (0/1), income. Kovariat lain hanya jika ada data nyata.
- **Pengolahan data:** PAVA (*pool-adjacent-violators*) sudah ada di kode untuk pelanggaran monotonisitas. Dokumentasikan dampaknya.
- **Evaluasi:** bias, RMSE, *coverage* CI 95%, proporsi kegagalan konvergensi.
- **Pembanding:** R (`survival`/`glm`) atau statsmodels. Excel referensi untuk kasus fixture.
- **Menghindari evaluasi tidak valid:** jangan mengevaluasi hanya pada 100 responden fixture, karena itu satu sampel tanpa WTP sebenarnya. Pakai simulasi dengan seed tetap yang dilaporkan.
- **Risiko:** kemungkinan bug numerik di library buatan sendiri. Itu temuan yang sah, bukan kegagalan TA.

**Indikator keberhasilan.** Selisih hasil sistem terhadap pembanding < 0,1%. Matriks bias/RMSE lengkap. Rekomendasi didukung data.

---

### TA 2 — Model Count Data pada TCM (Skripsi)

**Latar belakang.** Jumlah kunjungan adalah bilangan cacah non-negatif. OLS dapat memberi estimasi surplus konsumen yang bias. Poisson atau NB lebih sesuai tetapi peka terhadap overdispersi. Sistem sudah memiliki `TravelCostEstimator.php` dan `PoissonRegression.php`. Negative Binomial belum terlihat di kode.

**Rumusan masalah.**
1. Apakah data kunjungan menunjukkan overdispersi?
2. Bagaimana surplus konsumen berbeda antar-model?
3. Model mana yang paling sesuai berdasarkan kriteria statistik?

**Tujuan.** Menambah NB ke modul, membandingkan model, dan merekomendasikan prosedur pemilihan model.

**Batasan.** TCM individual (ITCM) satu lokasi. Tanpa *zonal TCM*, *multi-site*, dan *truncated/zero-inflated* kecuali data memerlukannya.

**Kontribusi.** Prosedur pemilihan model yang dapat dipakai ulang dan modul NB terverifikasi.

**Data.** `itcm_respondents.json` (60 responden: visits, tc, edu, inc, lpj). Ukurannya kecil, sehingga hasil bersifat eksploratif. Perlu simulasi tambahan atau data lapangan.

**Tahapan.** Literatur, verifikasi Poisson terhadap `ITCM.xlsx`, implementasi NB2, uji overdispersi, perbandingan, interpretasi.

**Metodologi.**
- **Metode:** OLS semilog, Poisson, NB2. Ini hierarki standar untuk data cacah dan perbedaannya langsung menjawab rumusan masalah.
- **Evaluasi:** AIC/BIC, uji overdispersi, *likelihood ratio*, stabilitas surplus konsumen lewat *bootstrap*, dan uji pada data simulasi dengan parameter diketahui.
- **Pembanding:** R `glm`/`MASS::glm.nb` dan statsmodels.
- **Risiko:** n = 60 sangat kecil dan berpotensi tidak ada perbedaan bermakna. Antisipasi dengan simulasi, dan jangan menarik kesimpulan umum dari satu sampel.

**Indikator keberhasilan.** Koefisien dan surplus konsumen sesuai pembanding. Kriteria pemilihan model terdokumentasi. Interval kepercayaan dilaporkan.

---

### TA 3 — Sensitivitas dan Ketidakpastian NPV/BCR (Skripsi)

**Latar belakang.** NPV dan BCR dihitung dengan *discount rate* dan inflasi per proyek (`BenefitCostPresentValues.php`, `EconomicValuationCalculator`). Kesimpulan "layak/tidak layak" dapat berbalik hanya karena perubahan *discount rate*, dan itu belum terlihat oleh pengguna.

**Rumusan masalah.**
1. Parameter mana yang paling mempengaruhi NPV dan BCR?
2. Pada rentang parameter wajar, seberapa besar probabilitas BCR > 1?
3. Apakah visualisasi ketidakpastian membantu peneliti menilai kelayakan?

**Tujuan.** Mengukur sensitivitas, mensimulasikan ketidakpastian, dan menyajikannya dalam modul analisis.

**Batasan.** Hanya ketidakpastian parameter ekonomi (*discount rate*, horizon, harga, inflasi) dan input benefit/cost. Tidak memodelkan ketidakpastian ekologis.

**Kontribusi.** Metode dan modul pelaporan ketidakpastian untuk valuasi pesisir.

**Data.** Proyek seeded/uji dari sistem, plus rentang parameter dari literatur dan pedoman resmi. **Distribusi parameter tidak boleh dikarang.** Setiap rentang harus punya sumber atau dinyatakan sebagai asumsi skenario.

**Tahapan.** Literatur, pilih 3–5 proyek studi kasus, definisi distribusi, implementasi OAT dan Monte Carlo, analisis, antarmuka.

**Metodologi.**
- **Metode:** *one-at-a-time* (tornado) untuk identifikasi awal, lalu Monte Carlo dengan korelasi peringkat atau indeks Sobol untuk kontribusi parameter. Sederhana, tanpa ML, dan hasilnya bisa diaudit.
- **Evaluasi:** konvergensi Monte Carlo (stabilitas P(BCR>1) terhadap jumlah iterasi), konsistensi dengan perhitungan manual Excel, dan SUS bila UI dibuat.
- **Pembanding:** perhitungan deterministik tunggal dan analisis skenario (pesimis/dasar/optimis).
- **Risiko:** kualitas hasil bergantung pada kualitas distribusi input. Tanpa data proyek nyata, kesimpulan hanya ilustratif.

**Indikator keberhasilan.** Peringkat sensitivitas konsisten antar-metode. Hasil Monte Carlo stabil. Modul dapat dijalankan pada proyek nyata.

---

### TA 4 — Evaluasi dan Kalibrasi Asisten AI (Skripsi)

**Latar belakang.** `AIOrchestrator` memanggil LLM lalu memberi skor kepercayaan dari referensi (`ConfidenceCalculator`). Skor 100 untuk hasil database dan 20 untuk jawaban tanpa referensi adalah aturan buatan. Belum ada bukti skor itu berkorelasi dengan kebenaran jawaban.

**Rumusan masalah.**
1. Seberapa akurat rekomendasi metode valuasi dan penjelasan asisten AI dibanding jawaban pakar?
2. Apakah *grounding* ke basis data PKSPL menurunkan halusinasi dibanding LLM tanpa grounding?
3. Seberapa terkalibrasi skor kepercayaan, dan apakah dapat diperbaiki?

**Tujuan.** Mengukur akurasi, tingkat halusinasi, dan kalibrasi pada tiga konfigurasi, lalu mengusulkan *confidence* baru.

**Batasan.** Hanya tugas rekomendasi/penjelasan metode valuasi (acuan: `docs/METODE_VALUASI_PER_JASA.md`). Tidak mencakup prediksi nilai ekonomi atau pelatihan model.

**Kontribusi.** Protokol evaluasi dan kalibrasi untuk asisten domain valuasi pesisir.

**Data.** Kumpulan pertanyaan (disarankan 100–200) yang disusun bersama pakar PKSPL, dengan jawaban acuan berbasis dokumen metode. **Dataset ini harus dibuat dan belum tersedia.** Biaya API LLM dan waktu pakar perlu dijamin.

**Tahapan.** Susun skema evaluasi, buat soal dan kunci jawaban bersama pakar, jalankan tiga konfigurasi, beri anotasi, hitung metrik, kalibrasi.

**Metodologi.**
- **Pendekatan:** eksperimen perbandingan tiga konfigurasi: (a) pencarian kata kunci database saja, (b) LLM tanpa grounding, (c) LLM dengan grounding.
- **Kalibrasi:** diagram reliabilitas, *Expected Calibration Error* (ECE), Brier score, lalu *Platt/isotonic scaling* jika data cukup.
- **Evaluasi:** akurasi rekomendasi metode, proporsi klaim tanpa dukungan, validitas referensi/DOI, penilaian pakar (Likert) dengan ≥ 2 penilai dan Cohen's κ.
- **Menghindari evaluasi tidak valid:** pisahkan soal tuning dan soal uji (*held-out*). Anotator *blind* terhadap konfigurasi. Catat versi model dan suhu karena LLM tidak sepenuhnya deterministik.
- **Mengapa AI di sini wajar:** AI sudah menjadi bagian sistem. Yang diteliti adalah keandalannya, bukan memaksakan AI pada masalah yang bisa diselesaikan lebih sederhana.
- **Risiko (tertinggi di antara semua judul):** ketersediaan pakar, biaya API, hasil berubah saat model diperbarui, skala soal kecil.

**Indikator keberhasilan.** ECE terukur sebelum dan sesudah kalibrasi. Selisih akurasi antar-konfigurasi diuji secara statistik. κ antar-penilai dilaporkan.

---

### TA 9 — Penerimaan dan Kegunaan Sistem (Skripsi, Mixed Methods)

**Latar belakang.** Sistem dibangun untuk menggantikan alur manual berbasis Excel. Manfaatnya hanya tercapai jika peneliti, admin, dan pemangku kepentingan benar-benar memakainya. Faktor seperti kemudahan, manfaat yang dirasakan, kepercayaan pada hasil otomatis, dan kondisi pendukung belum pernah diukur.

**Rumusan masalah.**
1. Faktor apa yang mempengaruhi niat dan perilaku pengguna memakai sistem?
2. Hambatan dan kebutuhan apa yang dirasakan pengguna dalam alur 9 langkah peneliti?
3. Perbaikan apa yang paling diprioritaskan pengguna?

**Tujuan.** Mengidentifikasi dan menguji faktor penerimaan, menggali hambatan secara mendalam, dan menyusun rekomendasi perbaikan sistem.

**Batasan.** Mengukur persepsi dan penerimaan pengguna, bukan kebenaran perhitungan (itu TA 1–3) dan bukan kinerja teknis (itu TA 5 dan 6). Populasi dibatasi pada pengguna PKSPL dan mitra.

**Kontribusi.** Model faktor penerimaan pada konteks sistem valuasi ekonomi pesisir di lembaga riset, serta daftar prioritas perbaikan yang berbasis bukti. Klaim kebaruan harus diverifikasi lewat tinjauan pustaka.

**Data dan sumber daya.** Responden kuesioner dan narasumber wawancara dari peneliti dan staf PKSPL, serta pemangku kepentingan lain. **Syarat utama: sistem sudah dipakai atau dicoba nyata oleh pengguna.** Perlu izin PKSPL untuk akses responden.

**Tahapan.** Studi literatur UTAUT/TAM, penyusunan hipotesis dan instrumen, uji validitas dan reliabilitas instrumen, penyebaran kuesioner, analisis kuantitatif, wawancara semi-terstruktur, analisis tematik, integrasi temuan, rekomendasi.

**Metodologi.**
- **Pendekatan:** *mixed methods explanatory sequential*. Kuantitatif dahulu untuk menguji hubungan antar-faktor, lalu kualitatif untuk menjelaskan hasil yang tidak terduga.
- **Metode kuantitatif:** kuesioner skala Likert dengan konstruk UTAUT (performance expectancy, effort expectancy, social influence, facilitating conditions) dan niat penggunaan. Analisis regresi berganda atau PLS-SEM tergantung ukuran sampel.
- **Metode kualitatif:** wawancara semi-terstruktur dengan 6–10 narasumber yang dipilih purposif, dianalisis dengan analisis tematik, dan dicek dengan triangulasi antar-narasumber.
- **Pengolahan data:** uji validitas (loading faktor atau korelasi item-total) dan reliabilitas (Cronbach's alpha), uji asumsi regresi. Wawancara direkam dengan persetujuan dan ditranskrip.
- **Evaluasi dan metrik:** R² dan signifikansi koefisien, alpha ≥ 0,7, serta kejenuhan tema pada wawancara.
- **Pembanding:** tidak ada baseline sistem lain. Jika perlu, bandingkan persepsi antar-peran (peneliti vs admin).
- **Risiko:** populasi pengguna PKSPL kecil, sehingga sampel kuantitatif mungkin di bawah syarat PLS-SEM. Jika n kecil, turunkan ke statistik deskriptif dan regresi sederhana dan akui keterbatasannya, jangan memaksakan generalisasi.

**Indikator keberhasilan.** Instrumen valid dan reliabel. Hasil hipotesis dilaporkan apa adanya (didukung atau tidak). Tema wawancara menjelaskan hasil kuantitatif dan menghasilkan rekomendasi yang dapat ditindaklanjuti.

---

### TA 5 — Modul Spasial (Prototype)

**Latar belakang.** Alur peneliti dimulai dari pemetaan area. Kesalahan geometri, proyeksi, atau luas akan merambat ke seluruh perhitungan nilai (nilai = produktivitas × luas × harga).

**Rumusan masalah.** Bagaimana merancang modul yang menerima shapefile, memvalidasi geometri, menghitung luas, mengelompokkan tutupan lahan, dan menyajikannya di peta publik dengan perbandingan antar-tahun secara akurat dan responsif?

**Tujuan.** Memperbaiki dan menguji modul sampai memenuhi kriteria akurasi, kinerja, dan kegunaan.

**Batasan.** Tidak membuat klasifikasi tutupan lahan otomatis dari citra satelit. Tidak mengubah mesin valuasi.

**Kontribusi.** Modul teruji dengan metrik akurasi luas (PostGIS geografi vs input manual vs pembanding seperti QGIS) dan kinerja.

**Data.** Shapefile uji (minta contoh nyata dari PKSPL), batas administratif dari `Services/Shapefile` dan master wilayah.

**Tahapan.** Analisis kebutuhan, perancangan, perbaikan/implementasi, pengujian fungsional (geometri rusak, CRS berbeda, berkas besar), uji kinerja, UAT dengan SUS.

**Metode pengembangan.** Scrum atau Waterfall (metode pengerjaan, bukan metode penelitian).

**Evaluasi.** Selisih luas terhadap pembanding (%), waktu impor dan render vs ukuran berkas, tingkat keberhasilan kasus uji, skor SUS (target ≥ 68).

**Indikator keberhasilan.** Semua kasus uji kritis lulus. Selisih luas kecil dan terdokumentasi. SUS memenuhi target.

---

### TA 6 — Modul Review Kolaboratif (Prototype)

**Latar belakang.** Laporan valuasi harus diverifikasi sebelum diterbitkan. Kode sudah memiliki `Services/Review`, event, notifikasi, kebijakan akses, dan Reverb.

**Rumusan masalah.** Bagaimana alur review yang menjamin hak akses benar, jejak perubahan lengkap, dan notifikasi real-time yang andal?

**Tujuan.** Menyempurnakan alur review dan membuktikan ketepatan hak akses, latensi notifikasi, dan usabilitas.

**Batasan.** Hanya alur review, komentar, notifikasi, *activity log*, dan chat. Tidak termasuk mesin valuasi dan modul spasial.

**Kontribusi.** Alur verifikasi teruji dengan metrik latensi dan matriks pengujian RBAC.

**Data.** Tidak butuh dataset eksternal. Data uji dibuat lewat seeder.

**Metode pengembangan.** Scrum atau Waterfall.

**Evaluasi.** Matriks uji peran × aksi (pass/fail), latensi pengiriman notifikasi (median/p95) di bawah beban N pengguna, tingkat pengiriman, skor SUS.

**Indikator keberhasilan.** Tidak ada pelanggaran akses pada matriks uji. Latensi sesuai target yang ditetapkan bersama pembimbing. SUS memenuhi target.

---

### TA 7 — Modul Pengumpulan Data Survei Lapangan (Prototype)

**Latar belakang.** Estimator CVM dan TCM bergantung pada kualitas data responden. Di kode sudah ada penginputan responden (`SurveyRespondentModal.tsx`, `RespondentInputPanel.tsx`, `SurveyValuationController.php`, model `CvmData` dan `TcmData`), tetapi masuknya lewat panel spreadsheet. Data lapangan yang kotor (bid kosong, income tidak masuk akal, duplikat) langsung merusak hasil estimasi hulu.

**Rumusan masalah.** Bagaimana merancang modul kuesioner terstruktur yang memudahkan enumerator mengisi data di lapangan, mencegah dan menandai data janggal, dan menghasilkan data yang langsung dapat dipakai estimator?

**Tujuan.** Membangun dan menguji modul survei dengan form CVM/TCM, validasi input, penandaan anomali, dan ekspor ke format estimator.

**Batasan.** Tidak mengubah estimator dan tidak melakukan analisis WTP/surplus konsumen (itu TA 1 dan 2). Anomali dideteksi dengan aturan sederhana (rentang, duplikat, konsistensi antar-field), bukan ML. Dukungan offline hanya jika disepakati pembimbing dan waktu cukup.

**Kontribusi.** Alur pengumpulan data yang terukur kualitasnya, dan kontrak data yang menjadi masukan bersama TA 1 dan 2.

**Data dan sumber daya.** Tidak butuh data nyata untuk dibangun. Uji memakai data sintetis dengan kesalahan yang disisipkan sengaja (jumlah dan jenis kesalahan diketahui). Uji pengguna dengan beberapa calon enumerator atau mahasiswa.

**Tahapan.** Analisis kebutuhan dan skema variabel (mengacu `cvm_respondents.json` dan `itcm_respondents.json`), perancangan, implementasi, pengujian fungsional, uji deteksi anomali, UAT.

**Metode pengembangan.** Scrum atau Waterfall.

**Evaluasi.** Recall dan precision deteksi anomali pada data uji yang diberi kesalahan sengaja, tingkat error input dibanding input spreadsheet lama, waktu isi per responden, SUS.

**Indikator keberhasilan.** Semua kasus uji validasi lulus. Recall deteksi anomali memenuhi target yang disepakati. Data hasil ekspor diterima estimator tanpa perbaikan manual.

---

### TA 8 — Modul Pelaporan Valuasi dan Dashboard Analitik (Prototype)

**Latar belakang.** Keluaran akhir proses valuasi adalah laporan. Kode sudah memiliki `ReportPrintView.tsx`, `ReviewReportPage.tsx`, `AnalyticsPage.tsx`, dan agregasi `ProjectDashboardService`. Risiko utamanya adalah ketidakkonsistenan: angka di laporan cetak berbeda dari angka kalkulasi (kode sendiri sudah mencatat kasus nilai PV basi di `BenefitCostPresentValues`).

**Rumusan masalah.** Bagaimana menyusun laporan valuasi yang terstruktur, dapat diekspor, dan terjamin konsisten dengan hasil kalkulasi sistem?

**Tujuan.** Menyempurnakan modul laporan dan dashboard, serta membangun pengujian rekonsiliasi yang membandingkan angka laporan dengan hasil kalkulasi.

**Batasan.** Tidak mengubah estimator atau rumus. Tidak membuat penulisan narasi dengan AI (itu wilayah TA 4). Format laporan mengikuti template yang disepakati dengan PKSPL.

**Kontribusi.** Laporan dengan jaminan konsistensi angka yang dapat diuji ulang, plus template laporan baku.

**Data dan sumber daya.** Proyek contoh dari seeder, dan contoh laporan valuasi PKSPL sebagai template (minta ke PKSPL).

**Tahapan.** Analisis template laporan, perancangan struktur dan dashboard, implementasi ekspor, pembuatan uji rekonsiliasi otomatis, UAT.

**Metode pengembangan.** Scrum atau Waterfall.

**Evaluasi.** Persentase angka laporan yang cocok dengan kalkulasi (target 100%), waktu penyusunan laporan dibanding manual, kelengkapan terhadap template, SUS.

**Indikator keberhasilan.** Uji rekonsiliasi lulus untuk semua proyek uji. Waktu penyusunan turun terukur. SUS memenuhi target.

---

## D. Hubungan Antar-TA

```
TA5 Spasial ──► luas & tutupan lahan ─┐
                                       ├─► Mesin valuasi ──► TEV/NPV/BCR ──► TA6 Review/Laporan
TA1 CVM ──┐                            │            ▲                          ▲
TA2 TCM ──┴─ estimator nilai budaya ──┘            │                          │
                                       TA3 Sensitivitas (di atas hasil NPV/BCR)
                                       TA4 Asisten AI (menjelaskan metode, tidak menghitung nilai)
```

| TA | Menggunakan bersama | Batas tanggung jawab | Evaluasi mandiri |
|---|---|---|---|
| 1 | Library `Math/`, `NonparametricWtp`, `ContingentValuationEstimator` | Hanya estimator WTP CVM | Simulasi terhadap pembanding |
| 2 | `Math/` (OLS, Poisson), `TravelCostEstimator` | Hanya model permintaan TCM | Perbandingan model dan pembanding R |
| 3 | Keluaran `EconomicValuationCalculator`, `BenefitCostPresentValues` | Hanya sensitivitas NPV/BCR. Tidak mengubah estimator | Konvergensi Monte Carlo |
| 4 | Basis data AI, `METODE_VALUASI_PER_JASA.md` | Hanya layanan AI | Uji soal held-out dengan pakar |
| 5 | Tabel proyek/tutupan lahan, PostGIS | Hanya modul spasial | Akurasi luas, kinerja, SUS |
| 6 | Policy/RBAC, tabel review | Hanya alur review dan kolaborasi | Matriks hak akses, latensi, SUS |
| 7 | Tabel `CvmData`/`TcmData`, `SurveyValuationController` | Hanya input dan kualitas data survei. Tidak menganalisis estimasi | Deteksi anomali dan SUS |
| 8 | `ReportPrintView`, `ProjectDashboardService`, hasil kalkulasi | Hanya penyajian dan konsistensi laporan. Tidak mengubah rumus | Uji rekonsiliasi angka dan SUS |
| 9 | Sistem yang sudah berjalan sebagai objek studi | Hanya persepsi dan penerimaan pengguna. Tidak mengubah kode | Uji instrumen dan analisis tematik |

TA 9 memakai pengguna sebagai sumber data, sehingga idealnya dikerjakan setelah sebagian perbaikan TA 5–8 dapat dicoba pengguna. Temuannya dapat menjadi masukan prioritas bagi TA lainnya, tetapi tidak boleh menjadi bagian evaluasi mereka.

**Pagar untuk menghindari duplikasi:**
- TA 1 dan TA 2 sama-sama memakai `Math/` dan data survei. TA 1 hanya menyentuh `NonparametricWtp` dan `ContingentValuationEstimator`. TA 2 hanya `TravelCostEstimator` dan model count data. Perubahan di `Math/` dibuat lewat satu pull request yang disepakati bersama dan tidak dihitung sebagai kontribusi salah satu pihak.
- TA 3 menerima NPV/BCR apa adanya dan tidak mengubah cara hitung estimator.
- Gunakan *branch* dan *issue* terpisah agar dua mahasiswa tidak memperbaiki bug yang sama.

---

## E. Perbandingan dan Rekomendasi

| Kriteria | TA1 CVM | TA2 TCM | TA3 Sensitivitas | TA4 AI | TA5 Spasial | TA6 Review |
|---|---|---|---|---|---|---|
| Kelayakan akademik | Tinggi | Tinggi | Tinggi | Tinggi | Sedang | Sedang |
| Kesulitan | Sedang–Tinggi | Sedang–Tinggi | Sedang | Tinggi | Sedang | Sedang |
| Waktu/biaya | Biaya rendah, waktu sedang | Biaya rendah, waktu sedang | Biaya rendah | Biaya API + waktu pakar | Rendah | Rendah |
| Ketersediaan data | Sintetis dan fixture ada | Fixture kecil (n=60) | Perlu proyek nyata | Perlu dibuat | Perlu shapefile nyata | Tidak perlu |
| Risiko | Sedang | Sedang | Sedang | Tinggi | Sedang | Sedang |
| Kontribusi ilmiah | Tinggi | Sedang–Tinggi | Sedang–Tinggi | Tinggi | Rendah–Sedang | Rendah–Sedang |
| Kemudahan evaluasi | Tinggi | Tinggi | Tinggi | Sedang | Tinggi | Tinggi |

**Tiga judul terbaik:**
1. **TA 1 (CVM).** Evaluasinya paling objektif karena simulasi memberi nilai sebenarnya. Kodenya sudah ada, tidak butuh data lapangan, dan risikonya terkendali.
2. **TA 3 (Sensitivitas NPV/BCR).** Metodenya sederhana dan tepat sasaran, hasilnya langsung bermanfaat bagi pengguna, dan tidak memaksakan ML. Syarat: dapatkan beberapa proyek nyata dari PKSPL.
3. **TA 2 (TCM).** Kelayakan akademik baik dan ada pembanding Excel. Syarat: akui keterbatasan n = 60 dan lengkapi dengan simulasi.

**Perbandingan prototype tambahan (TA 7 dan 8):**

| Kriteria | TA7 Survei | TA8 Pelaporan |
|---|---|---|
| Kelayakan akademik | Sedang | Sedang |
| Kesulitan | Sedang | Sedang |
| Waktu/biaya | Rendah | Rendah |
| Ketersediaan data | Sintetis cukup | Perlu template laporan PKSPL |
| Risiko | Sedang (offline menambah kompleksitas) | Rendah–Sedang |
| Kontribusi ilmiah | Rendah–Sedang | Rendah–Sedang |
| Kemudahan evaluasi | Tinggi | Tinggi |

TA 7 menjadi pemasok data yang rapi bagi TA 1 dan 2, dan TA 8 menjadi hilir bagi seluruh hasil kalkulasi. Keduanya sudah punya fondasi di kode, jadi kontribusi mahasiswa harus ditetapkan sejak awal seperti pada TA 5 dan 6. TA 7 lebih kuat sebagai TA karena deteksi anomalinya bisa diukur dengan precision/recall.

**TA 9 (Penerimaan sistem)** layak sebagai skripsi non-teknis yang berimbang. Risiko utamanya adalah akses ke pengguna dan ukuran sampel kecil, dan tidak perlu data teknis atau API berbayar. Ia cocok untuk mahasiswa yang lebih kuat di analisis pengguna daripada pemrograman.

**TA 4 (AI)** berpotensi tinggi tetapi berisiko tertinggi. Ambil hanya jika pakar PKSPL bersedia menyusun dan menilai soal, dan anggaran API tersedia. **TA 5 dan TA 6** layak sebagai TA prototype D4, tetapi karena sistem sudah banyak berjalan, kontribusi mahasiswa harus ditetapkan sejak awal agar tidak dianggap sekadar menyelesaikan fitur.

**Rekomendasi akhir:** untuk empat mahasiswa D4, pilih **TA 1, TA 2, TA 3, dan TA 5**. Komposisi ini menyeimbangkan tiga skripsi bermetode jelas dengan satu prototype yang mudah diukur, dan ketiga skripsi tidak bergantung pada pakar atau API berbayar. Tambahkan TA 7, TA 6, TA 8, atau TA 4 untuk mahasiswa kelima dan seterusnya, dengan TA 7 diutamakan di antara prototype.

**Catatan referensi.** DOI dan klaim kebaruan tidak dicantumkan karena belum diverifikasi. Kerangka metodenya baku (CVM/Turnbull, TCM, model count data, analisis ketidakpastian, evaluasi LLM). Mahasiswa dapat mencari jurnal lima tahun terakhir dengan kata kunci tersebut di Scopus, SINTA, atau Google Scholar. Setiap klaim kebaruan harus dibuktikan dari hasil pencarian itu.

---

## Pertanyaan Klarifikasi

1. Apakah PKSPL punya **data survei lapangan nyata** (CVM, TCM) dan **data proyek valuasi lengkap**? Jika hanya fixture, TA 1–3 tetap layak tetapi harus berbasis simulasi.
2. Berapa **mahasiswa** dan berapa **bulan** pengerjaan? Semua D4 atau ada S1?
3. Apakah **pakar PKSPL** bersedia menilai output AI untuk TA 4, dan ada **anggaran API** LLM?
4. Apakah kode sudah dianggap **stabil**, atau mahasiswa diharapkan ikut memperbaiki? Ini menentukan orisinalitas kontribusi TA 5 dan 6.
5. Apakah ada ketentuan kampus yang membedakan **bobot TA prototype dan skripsi**, misalnya wajib hipotesis atau publikasi?

**Asumsi sementara:** data lapangan belum tersedia, durasi satu semester, dan proyek masih aktif dikembangkan.
