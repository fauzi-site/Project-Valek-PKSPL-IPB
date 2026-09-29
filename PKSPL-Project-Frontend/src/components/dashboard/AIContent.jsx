import React from 'react'

export default function AIContent() {
  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 text-sm leading-relaxed text-slate-700 animate-fade-in">
      {/* AI Analysis Label */}
      <div>
        <span className="text-xs font-semibold text-blue-600 tracking-wide uppercase">AI Analysis</span>
      </div>

      {/* Main Title */}
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        📊 Rekomendasi Pengelolaan Kawasan
      </h2>

      {/* Opening Paragraph */}
      <p className="text-slate-600 leading-7">
        Berdasarkan hasil analisis valuasi ekonomi yang telah dilakukan, sistem mengidentifikasi beberapa strategi pengelolaan yang berpotensi meningkatkan keberlanjutan ekosistem sekaligus mempertahankan nilai ekonomi kawasan.
      </p>

      {/* Numbered Recommendations */}
      <div className="space-y-5">
        {/* Point 1 */}
        <div className="group">
          <h3 className="text-sm font-bold text-slate-800 mb-1.5 flex items-start gap-2">
            <span className="shrink-0">🌱</span>
            <span>1. Prioritaskan Konservasi Ekosistem</span>
          </h3>
          <p className="text-slate-600 leading-7 pl-7">
            Fokuskan upaya perlindungan pada area yang memiliki nilai jasa ekosistem tertinggi, khususnya ekosistem yang berperan dalam penyediaan habitat, perlindungan pantai, dan penyimpanan karbon. Konservasi pada area ini diperkirakan memberikan manfaat ekonomi jangka panjang yang lebih besar dibandingkan eksploitasi jangka pendek.
          </p>
        </div>

        {/* Point 2 */}
        <div className="group">
          <h3 className="text-sm font-bold text-slate-800 mb-1.5 flex items-start gap-2">
            <span className="shrink-0">📈</span>
            <span>2. Optimalkan Pemanfaatan Secara Berkelanjutan</span>
          </h3>
          <p className="text-slate-600 leading-7 pl-7">
            Aktivitas pemanfaatan sumber daya, seperti perikanan atau wisata pesisir, sebaiknya dilakukan sesuai daya dukung lingkungan. Pendekatan ini dapat menjaga keseimbangan antara peningkatan pendapatan masyarakat dan kelestarian ekosistem.
          </p>
        </div>

        {/* Point 3 */}
        <div className="group">
          <h3 className="text-sm font-bold text-slate-800 mb-1.5 flex items-start gap-2">
            <span className="shrink-0">🤝</span>
            <span>3. Tingkatkan Partisipasi Masyarakat</span>
          </h3>
          <p className="text-slate-600 leading-7 pl-7">
            Melibatkan masyarakat lokal dalam pengelolaan kawasan dapat meningkatkan efektivitas program konservasi serta memperkuat keberlanjutan ekonomi melalui pengelolaan sumber daya yang lebih bertanggung jawab.
          </p>
        </div>

        {/* Point 4 */}
        <div className="group">
          <h3 className="text-sm font-bold text-slate-800 mb-1.5 flex items-start gap-2">
            <span className="shrink-0">📝</span>
            <span>4. Perkuat Monitoring dan Evaluasi</span>
          </h3>
          <p className="text-slate-600 leading-7 pl-7">
            Disarankan untuk melakukan pemantauan secara berkala terhadap kondisi ekosistem dan perubahan nilai ekonomi agar kebijakan yang diterapkan tetap relevan terhadap kondisi aktual di lapangan.
          </p>
        </div>
      </div>

      {/* Insight Block */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-5 mt-6">
        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
          💡 <span>Insight Utama</span>
        </h3>
        <p className="text-slate-600 leading-7">
          Hasil analisis menunjukkan bahwa jasa regulating dan provisioning memberikan kontribusi terbesar terhadap Total Economic Value (TEV) pada kawasan yang dievaluasi. Oleh karena itu, strategi pengelolaan sebaiknya memprioritaskan perlindungan fungsi ekologis yang mendukung kedua komponen tersebut.
        </p>
      </div>

      {/* Disclaimer Block */}
      <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
          ⚠️ <span>Catatan</span>
        </h3>
        <p className="text-slate-600 leading-7">
          Rekomendasi ini dihasilkan berdasarkan data dan parameter yang tersedia pada proses valuasi ekonomi. Hasil dapat berubah apabila terdapat pembaruan data, perubahan kondisi ekosistem, atau penggunaan metode valuasi yang berbeda.
        </p>
      </div>
    </div>
  )
}
