# Aturan bisnis

Dokumen ini membedakan aturan yang **ditegakkan source code** dari alur domain yang **masih konseptual**.

## Ditegakkan oleh skema, model, atau validasi

- Satu role memiliki banyak user; setiap user wajib memiliki tepat satu role yang ada.
- Role master yang diseed adalah `admin`, `analyst`, `peneliti`, dan `guest`; endpoint role hanya baca.
- Email user unik; user berstatus `Aktif` atau `Nonaktif`; password di-hash melalui cast model.
- Satu user dapat memiliki banyak proyek, analisis AI, histori, dan validasi.
- Satu proyek wajib memiliki user pemilik, tujuan valuasi, lokasi, tahun, dan status `Draft`, `Proses`, `Selesai`, atau `Dibatalkan`.
- Satu proyek memiliki satu batas geometri GeoJSON dan dapat menyimpan komponen shapefile opsional; satu proyek memiliki banyak index.
- Satu index wajib terkait ke satu proyek dan memiliki banyak jenis tutupan lahan; kode index unik dalam satu proyek.
- Setiap jenis tutupan lahan wajib terkait ke satu index serta menyimpan kategori, luas, satuan luas, dan geometri GeoJSON opsional.
- Setiap entri service wajib terkait ke satu jenis tutupan lahan dan menyimpan `nilai`; foreign key memakai pembaruan cascade dan penghapusan restrict.
- Hasil valuasi wajib terkait ke satu jenis tutupan lahan dan satu metode valuasi, menyimpan lima komponen nilai (DUV, IUV, OV, EV, BV), `tev`, dan tanggal hitung.
- Nama metode valuasi unik; metode, ekosistem, dataset, dan basis data AI berstatus `Aktif` atau `Nonaktif`.
- Validasi analyst wajib menghubungkan satu hasil valuasi dengan satu user, dan statusnya hanya `Valid`, `Revisi`, atau `Ditolak`; metode analisis hanya `Manual` atau `AI`.
- Analisis AI wajib menyimpan proyek, user, pertanyaan, jawaban, dan tipe `Chat`, `Ringkasan`, `Rekomendasi`, atau `Prediksi`.
- `histori` dan `analisis_ai` hanya memiliki timestamp pembuatan dan API-nya hanya index/store/show.
- Seluruh foreign key domain memakai `restrictOnDelete`, jadi parent tidak dapat dihapus jika masih dirujuk child.

## Belum ditegakkan / tidak boleh diasumsikan

- Tidak ada validasi bahwa user pembuat validasi memiliki role `analyst`.
- Tidak ada autentikasi, otorisasi per role, atau pemeriksaan kepemilikan proyek pada route API.
- Tidak ada kewajiban bahwa sebuah jenis tutupan lahan harus memiliki tepat satu entri pada masing-masing dari empat jenis service; relasinya one-to-many.
- Nilai provisioning dihitung dari produktivitas, harga pasar, dan luas pemanfaatan; nilai cultural dihitung dari jumlah pengunjung, biaya perjalanan, dan frekuensi. Nilai regulating dan supporting merupakan nilai ekonomi yang diinput/dirujuk.
- TEV jenis tutupan lahan dihitung sebagai penjumlahan DUV, IUV, OV, EV, dan BV; TEV proyek tidak disimpan sebagai snapshot, tetapi diagregasi saat dashboard dibaca.
- Validasi tidak mengubah status proyek/hasil valuasi dan histori tidak dibuat otomatis.
- Data AI hanya disimpan; tidak ada provider, retrieval, embedding, atau interpretasi AI yang benar-benar berjalan.
