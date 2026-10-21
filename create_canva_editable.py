"""
Manual Book PKSPL - Canva-Compatible PPTX Generator
Menggunakan elemen SEDERHANA agar semua bisa diedit di Canva:
- Kotak warna solid (no gradients, no shadows)
- Text boxes standar (Arial only)
- Tidak ada efek kompleks
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

prs = Presentation()

# A4 Portrait: 210mm x 297mm
prs.slide_width = Inches(8.27)
prs.slide_height = Inches(11.69)
BLANK = prs.slide_layouts[6]

# =========================================================
# PALET WARNA (hanya solid, tidak ada gradien)
# =========================================================
NAVY     = RGBColor(15, 23, 42)      # #0f172a
OCEAN    = RGBColor(2, 132, 199)     # #0284c7
CYAN     = RGBColor(14, 165, 233)    # #0ea5e9
WHITE    = RGBColor(255, 255, 255)
SLATE50  = RGBColor(248, 250, 252)   # bg kartu terang
SLATE200 = RGBColor(226, 232, 240)   # border
SLATE700 = RGBColor(51, 65, 85)      # teks gelap sedang
DARK     = RGBColor(30, 41, 59)      # teks utama gelap
MUTED    = RGBColor(100, 116, 139)   # teks abu-abu
PURPLE   = RGBColor(124, 58, 237)    # bab admin
EMERALD  = RGBColor(5, 150, 105)     # bab pesan
AMBER    = RGBColor(217, 119, 6)     # cultural
RED50    = RGBColor(254, 242, 242)   # warning bg
AMBER50  = RGBColor(255, 251, 235)   # note bg
BLUE50   = RGBColor(239, 246, 255)   # info bg

# =========================================================
# HELPER FUNCTIONS
# =========================================================
def add_rect(slide, x, y, w, h, fill_color, border_color=None):
    from pptx.util import Inches
    shape = slide.shapes.add_shape(1, x, y, w, h)  # MSO_SHAPE_TYPE.RECTANGLE = 1
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(0.75)
    else:
        shape.line.fill.background()
    return shape

def add_textbox(slide, x, y, w, h, text, size=10, bold=False, color=None,
                align=PP_ALIGN.LEFT, italic=False, wrap=True):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.name = "Arial"
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color if color else DARK
    return tb

def add_multiline_textbox(slide, x, y, w, h, lines, base_size=9, base_color=None):
    """lines: list of (text, size, bold, color, italic)"""
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    first = True
    for (text, size, bold, color, italic) in lines:
        if first:
            p = tf.paragraphs[0]
            first = False
        else:
            p = tf.add_paragraph()
        run = p.add_run()
        run.text = text
        run.font.name = "Arial"
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.italic = italic
        run.font.color.rgb = color if color else (base_color if base_color else DARK)
    return tb

def add_header_footer(slide, chapter_text, page_num):
    # Header line
    add_rect(slide, Inches(0.5), Inches(0.45), Inches(7.27), Inches(0.02), SLATE200)
    # Header text
    add_textbox(slide, Inches(0.5), Inches(0.3), Inches(5.5), Inches(0.32),
                chapter_text.upper(), size=7.5, bold=True, color=OCEAN)
    add_textbox(slide, Inches(5.8), Inches(0.3), Inches(2.0), Inches(0.32),
                f"Halaman  {page_num}", size=7.5, color=MUTED, align=PP_ALIGN.RIGHT)
    # Footer line
    add_rect(slide, Inches(0.5), Inches(11.2), Inches(7.27), Inches(0.02), SLATE200)
    add_textbox(slide, Inches(0.5), Inches(11.25), Inches(5.5), Inches(0.3),
                "PKSPL IPB University  •  Pusat Kajian Sumberdaya Pesisir dan Lautan", size=7, color=MUTED)

def card(slide, x, y, w, h, title, body_lines, title_color=None, bg=None, border=None):
    """Kartu sederhana dengan judul dan isi"""
    bg_col = bg if bg else SLATE50
    brd_col = border if border else SLATE200
    add_rect(slide, x, y, w, h, bg_col, brd_col)
    add_textbox(slide, x + Inches(0.15), y + Inches(0.12), w - Inches(0.3), Inches(0.28),
                title, size=9.5, bold=True, color=title_color if title_color else OCEAN)
    body_tb = slide.shapes.add_textbox(x + Inches(0.15), y + Inches(0.42),
                                        w - Inches(0.3), h - Inches(0.55))
    body_tf = body_tb.text_frame
    body_tf.word_wrap = True
    first = True
    for line in body_lines:
        if first:
            p = body_tf.paragraphs[0]
            first = False
        else:
            p = body_tf.add_paragraph()
        run = p.add_run()
        run.text = line
        run.font.name = "Arial"
        run.font.size = Pt(8.5)
        run.font.color.rgb = DARK

# =========================================================
# SLIDE 1: COVER
# =========================================================
s1 = prs.slides.add_slide(BLANK)

# Background gelap navy
add_rect(s1, 0, 0, Inches(8.27), Inches(11.69), NAVY)

# Garis aksen biru di sebelah kiri
add_rect(s1, 0, 0, Inches(0.08), Inches(11.69), OCEAN)

# Box gambar sampul (gunakan cover_bg.jpg jika ada)
cover_img = "cover_bg.jpg"
if os.path.exists(cover_img):
    s1.shapes.add_picture(cover_img, Inches(3.5), Inches(0), Inches(4.77), Inches(11.69))
    # Overlay gelap di atas gambar
    ov = add_rect(s1, Inches(3.5), 0, Inches(4.77), Inches(11.69), NAVY)
    ov.fill.transparency = 0.42

# Header badge institusi
add_rect(s1, Inches(0.5), Inches(0.55), Inches(2.8), Inches(0.04), OCEAN)
add_textbox(s1, Inches(0.5), Inches(0.2), Inches(6.5), Inches(0.4),
            "PKSPL  IPB  UNIVERSITY", size=8.5, bold=True, color=CYAN)
add_textbox(s1, Inches(0.5), Inches(0.55), Inches(6.0), Inches(0.35),
            "Pusat Kajian Sumberdaya Pesisir dan Lautan", size=8, color=RGBColor(203, 213, 225))

# Badge "Dokumen Resmi"
add_rect(s1, Inches(5.8), Inches(0.2), Inches(1.97), Inches(0.38), OCEAN)
add_textbox(s1, Inches(5.8), Inches(0.2), Inches(1.97), Inches(0.38),
            "Dokumen Resmi v2.0", size=8, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

# Judul besar
add_textbox(s1, Inches(0.5), Inches(1.5), Inches(4.5), Inches(0.45),
            "USER MANUAL & OPERATIONAL GUIDE", size=9, bold=True, color=CYAN)
add_textbox(s1, Inches(0.5), Inches(2.0), Inches(4.5), Inches(1.6),
            "BUKU PANDUAN\nPENGGUNA SISTEM", size=32, bold=True, color=WHITE)
add_textbox(s1, Inches(0.5), Inches(3.7), Inches(4.3), Inches(0.5),
            "Sistem Informasi Valuasi Jasa Ekosistem Pesisir & Lautan", size=11, bold=True, color=CYAN)

# Garis pembatas
add_rect(s1, Inches(0.5), Inches(4.35), Inches(2.0), Inches(0.06), OCEAN)

# Deskripsi
add_textbox(s1, Inches(0.5), Inches(4.5), Inches(4.3), Inches(1.8),
            "Panduan komprehensif operasional platform digital untuk penghitungan Total Economic Value (TEV), integrasi WebGIS spasial, basis data master biota, spreadsheet valuasi, hingga penerbitan laporan resmi berbasis peran Peneliti dan Super Admin.",
            size=9.5, color=RGBColor(203, 213, 225))

# Footer info box
add_rect(s1, Inches(0.5), Inches(9.8), Inches(4.3), Inches(1.55), RGBColor(30, 41, 59), OCEAN)
add_multiline_textbox(s1, Inches(0.65), Inches(9.95), Inches(4.0), Inches(1.3), [
    ("Sasaran Pengguna  :  Peneliti Riset & Super Administrator Global", 8.5, True, WHITE, False),
    ("Teknologi Platform  :  React SPA + Laravel 11 API + Leaflet WebGIS", 8.5, False, RGBColor(203,213,225), False),
    ("Edisi Dokumen       :  Versi 2.0  •  2026  •  Hak Cipta PKSPL IPB", 8.5, False, CYAN, False),
])

# =========================================================
# SLIDE 2: DAFTAR ISI
# =========================================================
s2 = prs.slides.add_slide(BLANK)
add_header_footer(s2, "Daftar Isi Manual Book", 2)

add_rect(s2, Inches(0.5), Inches(0.7), Inches(0.08), Inches(0.55), OCEAN)
add_textbox(s2, Inches(0.65), Inches(0.72), Inches(5.0), Inches(0.35),
            "Daftar Isi & Struktur Pembahasan", size=18, bold=True, color=DARK)
add_textbox(s2, Inches(0.65), Inches(1.05), Inches(5.0), Inches(0.3),
            "Navigasi keseluruhan bab dan sub-pembahasan sistem", size=8.5, color=MUTED)

chapters = [
    ("BAB 1", "Tentang Aplikasi & Kerangka Konseptual TEV", "Pengenalan sistem, formula TEV, dan alur kerja 9 langkah.", "Hal 3", OCEAN),
    ("BAB 2", "Akses Sistem, Autentikasi & Manajemen Sesi",  "Prosedur login, Google OAuth, idle timeout 2 jam, reset sandi.", "Hal 4", OCEAN),
    ("BAB 3", "Struktur Role & Hak Akses (RBAC)",             "Pemisahan tugas Peneliti vs Super Admin dan matriks perizinan.", "Hal 5", OCEAN),
    ("BAB 4", "Panduan Role Peneliti — Langkah 01 & 02",      "01 Proyek (pembuatan riset) dan 02 Maps (WebGIS upload SHP).", "Hal 6", OCEAN),
    ("BAB 4", "Panduan Role Peneliti — Langkah 03 & 04",      "03 Index tutupan lahan dan 04 Data Master biota lokal.", "Hal 7", OCEAN),
    ("BAB 4", "Panduan Role Peneliti — Langkah 05 & 06",      "05 Jasa & Metode ilmiah dan 06 Spreadsheet Data Valuasi.", "Hal 8", OCEAN),
    ("BAB 4", "Panduan Role Peneliti — Langkah 07 & 08",      "07 Perhitungan TEV (breakdown rumus) dan 08 Analitik Grafik.", "Hal 9", OCEAN),
    ("BAB 4", "Panduan Role Peneliti — Langkah 09",           "09 Review 11 bagian, Cetak PDF, Ekspor Excel 13-Sheet.", "Hal 10", OCEAN),
    ("BAB 5", "Panduan Super Admin — Dasbor & Master Data",   "Monitoring portofolio nasional dan CRUD Master Data Global.", "Hal 11", PURPLE),
    ("BAB 5", "Panduan Super Admin — Pengguna & Audit Log",   "Manajemen akun pengguna dan audit trail data diff forensik.", "Hal 12", PURPLE),
    ("BAB 6", "Modul Komunikasi & Kolaborasi Real-Time",      "Chat WebSocket instan, lampiran berkas GIS, read receipts.", "Hal 13", EMERALD),
    ("BAB 7", "Spesifikasi Teknis & Integritas Sistem",       "Tech stack, WGS 1984, engine TEV, dan ekspor 13-sheet.", "Hal 14", SLATE700),
]

y = Inches(1.4)
for (bab, judul, desk, hal, col) in chapters:
    # Badge bab
    add_rect(s2, Inches(0.5), y, Inches(0.72), Inches(0.52), col)
    add_textbox(s2, Inches(0.5), y + Inches(0.12), Inches(0.72), Inches(0.3),
                bab, size=7.5, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    # Background kartu
    add_rect(s2, Inches(1.27), y, Inches(6.5), Inches(0.52), SLATE50, SLATE200)
    # Teks judul
    add_textbox(s2, Inches(1.38), y + Inches(0.04), Inches(4.8), Inches(0.25),
                judul, size=9.5, bold=True, color=DARK)
    # Deskripsi kecil
    add_textbox(s2, Inches(1.38), y + Inches(0.27), Inches(4.8), Inches(0.22),
                desk, size=8, color=MUTED)
    # Nomor halaman
    add_textbox(s2, Inches(6.7), y + Inches(0.12), Inches(1.0), Inches(0.28),
                hal, size=8.5, bold=True, color=col, align=PP_ALIGN.RIGHT)
    y += Inches(0.58)

# =========================================================
# FUNGSI: Buat slide konten standar
# =========================================================
def content_slide(bab_label, bab_color, judul_utama, page_num):
    s = prs.slides.add_slide(BLANK)
    add_header_footer(s, f"{bab_label}  •  {judul_utama}", page_num)
    # Badge bab
    add_rect(s, Inches(0.5), Inches(0.72), Inches(1.0), Inches(0.35), bab_color)
    add_textbox(s, Inches(0.5), Inches(0.72), Inches(1.0), Inches(0.35),
                bab_label, size=8.5, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    # Garis aksen kiri
    add_rect(s, Inches(1.6), Inches(0.72), Inches(0.06), Inches(0.35), bab_color)
    add_textbox(s, Inches(1.72), Inches(0.72), Inches(5.5), Inches(0.35),
                judul_utama, size=14, bold=True, color=DARK)
    return s

def section_box(slide, x, y, w, h, step_badge, step_color, title, body_items, bg=None):
    """Kotak seksi alur kerja dengan badge langkah"""
    bg_col = bg if bg else SLATE50
    add_rect(slide, x, y, w, h, bg_col, SLATE200)
    # Badge step
    add_rect(slide, x, y, Inches(0.9), Inches(0.38), step_color)
    add_textbox(slide, x, y, Inches(0.9), Inches(0.38),
                step_badge, size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    # Judul seksi
    add_textbox(slide, x + Inches(0.96), y + Inches(0.06), w - Inches(1.1), Inches(0.28),
                title, size=10, bold=True, color=DARK)
    # Isi
    body_tb = slide.shapes.add_textbox(x + Inches(0.15), y + Inches(0.42),
                                        w - Inches(0.3), h - Inches(0.52))
    body_tf = body_tb.text_frame
    body_tf.word_wrap = True
    first = True
    for item in body_items:
        if first:
            p = body_tf.paragraphs[0]
            first = False
        else:
            p = body_tf.add_paragraph()
        run = p.add_run()
        run.text = item
        run.font.name = "Arial"
        run.font.size = Pt(8.5)
        run.font.color.rgb = DARK

# =========================================================
# SLIDE 3: BAB 1 TENTANG APLIKASI
# =========================================================
s3 = content_slide("BAB 1", OCEAN, "Tentang Aplikasi & Kerangka Konseptual TEV", 3)

# Kotak intro
add_rect(s3, Inches(0.5), Inches(1.2), Inches(7.27), Inches(1.5), BLUE50, OCEAN)
add_textbox(s3, Inches(0.65), Inches(1.25), Inches(7.0), Inches(0.28),
            "Tentang Sistem Valuasi PKSPL IPB", size=10, bold=True, color=OCEAN)
add_textbox(s3, Inches(0.65), Inches(1.5), Inches(7.0), Inches(1.1),
            "Sistem Valuasi PKSPL adalah platform digital terintegrasi yang dikembangkan oleh PKSPL IPB University untuk mendigitalisasi penghitungan Total Economic Value (TEV) jasa ekosistem wilayah pesisir dan lautan. Sistem ini menggantikan metode spreadsheet manual yang rentan salah rumus, ketiadaan standarisasi harga, dan tidak ada audit trail, dengan komputasi terstandar berbasis web yang aman dan dapat dipertanggungjawabkan secara akademik.",
            size=9, color=DARK)

# Kotak formula TEV
add_rect(s3, Inches(0.5), Inches(2.8), Inches(7.27), Inches(0.9), NAVY)
add_textbox(s3, Inches(0.5), Inches(2.82), Inches(7.27), Inches(0.28),
            "PERSAMAAN TOTAL ECONOMIC VALUE (TEV)", size=8.5, bold=True, color=CYAN, align=PP_ALIGN.CENTER)
add_textbox(s3, Inches(0.5), Inches(3.1), Inches(7.27), Inches(0.45),
            "TEV  =  Provisioning  +  Regulating  +  Supporting  +  Cultural", size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

# 4 kartu jasa
jasa = [
    ("A. Provisioning\n(Penyediaan)", "Manfaat fisik dipanen langsung (ikan, kepiting, kayu mangrove, garam).\nMetode: Market Price & Effect on Production (EOP).", CYAN, Inches(0.5), Inches(3.8)),
    ("B. Regulating\n(Pengaturan)", "Fungsi pelindung alam (peredam abrasi, serapan karbon biru, pemurnian air).\nMetode: Replacement Cost, Blue Carbon, Avoided Cost, HPM.", OCEAN, Inches(4.0), Inches(3.8)),
    ("C. Supporting\n(Pendukung)", "Fondasi ekologis (nursery ground, siklus hara/nutrisi bagi rantai makanan).\nMetode: Nursery Ground Method & Nutrient Cycling.", PURPLE, Inches(0.5), Inches(5.55)),
    ("D. Cultural\n(Budaya & Wisata)", "Manfaat non-material (ekowisata bahari, edukasi, estetika rekreasi pantai).\nMetode: Travel Cost (TCM), CVM (WTP), Choice Experiment.", AMBER, Inches(4.0), Inches(5.55)),
]
for (title, body, col, cx, cy) in jasa:
    add_rect(s3, cx, cy, Inches(3.27), Inches(1.5), SLATE50, col)
    add_textbox(s3, cx + Inches(0.12), cy + Inches(0.1), Inches(3.0), Inches(0.45),
                title, size=9.5, bold=True, color=col)
    add_textbox(s3, cx + Inches(0.12), cy + Inches(0.55), Inches(3.0), Inches(0.85),
                body, size=8.5, color=DARK)

# Bagan alur
add_rect(s3, Inches(0.5), Inches(7.2), Inches(7.27), Inches(0.72), SLATE50, SLATE200)
add_textbox(s3, Inches(0.65), Inches(7.25), Inches(3.0), Inches(0.28),
            "Alur Kerja 9 Langkah Penelitian:", size=9, bold=True, color=DARK)
add_textbox(s3, Inches(0.65), Inches(7.5), Inches(7.0), Inches(0.35),
            "01 Proyek → 02 Maps GIS → 03 Index → 04 Data Master → 05 Jasa & Metode → 06 Valuasi → 07 TEV → 08 Analitik → 09 Laporan", size=8.5, color=OCEAN)

# =========================================================
# SLIDE 4: BAB 2 LOGIN
# =========================================================
s4 = content_slide("BAB 2", OCEAN, "Prosedur Login & Manajemen Sesi Sistem", 4)

# Kotak langkah login
add_rect(s4, Inches(0.5), Inches(1.2), Inches(4.2), Inches(5.5), SLATE50, OCEAN)
add_textbox(s4, Inches(0.65), Inches(1.27), Inches(3.8), Inches(0.3),
            "Panduan Langkah Login Sistem", size=10, bold=True, color=OCEAN)
login_steps = [
    "1.  Buka browser (Chrome/Edge/Firefox) dan akses URL portal resmi sistem.",
    "2.  Masukkan Email institusi atau Username pada kolom pertama.",
    "3.  Masukkan Password akun Anda. Klik ikon mata (👁) untuk melihat karakter.",
    "4.  Centang 'Ingat Saya' agar email tersimpan otomatis untuk kunjungan berikutnya.",
    "5.  Klik tombol 'Masuk ke Workspace'. Sistem memverifikasi ke server.",
    "6.  Alternatif: Klik 'Masuk dengan Google' untuk Single Sign-On (Google OAuth).",
    "",
    "Lupa Kata Sandi:",
    "→  Klik 'Lupa Kata Sandi?' di halaman login.",
    "→  Masukkan email terdaftar, lalu buka email untuk tautan reset sandi.",
]
step_tb = s4.shapes.add_textbox(Inches(0.65), Inches(1.6), Inches(3.85), Inches(4.8))
step_tf = step_tb.text_frame
step_tf.word_wrap = True
first = True
for st in login_steps:
    if first:
        p = step_tf.paragraphs[0]
        first = False
    else:
        p = step_tf.add_paragraph()
    run = p.add_run()
    run.text = st
    run.font.name = "Arial"
    run.font.size = Pt(8.5)
    run.font.color.rgb = DARK

# Mockup antarmuka login
add_rect(s4, Inches(5.0), Inches(1.2), Inches(2.77), Inches(5.5), NAVY, CYAN)
add_textbox(s4, Inches(5.1), Inches(1.3), Inches(2.55), Inches(0.32),
            "Antarmuka Login Sistem", size=9, bold=True, color=CYAN)
add_rect(s4, Inches(5.1), Inches(1.7), Inches(2.55), Inches(0.02), OCEAN)
fields = [
    ("Email / Username", "peneliti@gmail.com"),
    ("Password", "•••••••••••  👁"),
]
fy = Inches(1.8)
for (label, val) in fields:
    add_textbox(s4, Inches(5.12), fy, Inches(2.5), Inches(0.25), label, size=7.5, color=MUTED)
    add_rect(s4, Inches(5.12), fy + Inches(0.25), Inches(2.5), Inches(0.38), RGBColor(30, 41, 59), OCEAN)
    add_textbox(s4, Inches(5.22), fy + Inches(0.28), Inches(2.3), Inches(0.3), val, size=8.5, color=WHITE)
    fy += Inches(0.78)
add_textbox(s4, Inches(5.12), fy + Inches(0.1), Inches(2.5), Inches(0.25),
            "☑  Ingat Saya          Lupa Kata Sandi?", size=7.5, color=MUTED)
add_rect(s4, Inches(5.12), fy + Inches(0.45), Inches(2.5), Inches(0.45), OCEAN)
add_textbox(s4, Inches(5.12), fy + Inches(0.45), Inches(2.5), Inches(0.45),
            "MASUK WORKSPACE", size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
add_rect(s4, Inches(5.12), fy + Inches(1.0), Inches(2.5), Inches(0.4), RGBColor(30, 41, 59), CYAN)
add_textbox(s4, Inches(5.12), fy + Inches(1.0), Inches(2.5), Inches(0.4),
            "G   Masuk dengan Google", size=8.5, color=CYAN, align=PP_ALIGN.CENTER)

# Kotak sesi & role redirect
add_rect(s4, Inches(0.5), Inches(6.85), Inches(7.27), Inches(3.9), AMBER50, RGBColor(245, 158, 11))
add_textbox(s4, Inches(0.65), Inches(6.92), Inches(7.0), Inches(0.3),
            "⚠  Proteksi Sesi & Pengalihan Otomatis Berbasis Peran (Role-Based Redirection)", size=9.5, bold=True, color=RGBColor(180, 83, 9))
rules = [
    "•  Idle Session Timeout 2 Jam: Bila tidak ada aktivitas mouse/keyboard selama 2 jam, sistem otomatis melakukan logout (auto-logout) untuk menjaga keamanan data.",
    "•  Pengalihan Peneliti: Setelah login, akun Peneliti langsung diarahkan ke /peneliti/projects (Daftar Proyek).",
    "•  Pengalihan Super Admin: Setelah login, akun Super Admin langsung diarahkan ke /admin/dashboard (Dasbor Eksekutif).",
    "•  Proteksi Rute: Pengguna yang mengakses rute di luar hak perannya akan otomatis diblokir & dikembalikan.",
]
rule_tb = s4.shapes.add_textbox(Inches(0.65), Inches(7.27), Inches(7.0), Inches(3.3))
rule_tf = rule_tb.text_frame
rule_tf.word_wrap = True
first = True
for r in rules:
    if first:
        p = rule_tf.paragraphs[0]
        first = False
    else:
        p = rule_tf.add_paragraph()
    run = p.add_run()
    run.text = r
    run.font.name = "Arial"
    run.font.size = Pt(8.5)
    run.font.color.rgb = DARK

# =========================================================
# SLIDE 5: BAB 3 RBAC
# =========================================================
s5 = content_slide("BAB 3", OCEAN, "Struktur Role & Matriks Hak Akses (RBAC)", 5)

# 2 kartu role
add_rect(s5, Inches(0.5), Inches(1.2), Inches(3.4), Inches(4.5), SLATE50, EMERALD)
add_rect(s5, Inches(4.37), Inches(1.2), Inches(3.4), Inches(4.5), NAVY, PURPLE)

add_textbox(s5, Inches(0.65), Inches(1.28), Inches(3.1), Inches(0.32),
            "ROLE: PENELITI (Researcher)", size=10, bold=True, color=EMERALD)
add_textbox(s5, Inches(4.52), Inches(1.28), Inches(3.1), Inches(0.32),
            "ROLE: SUPER ADMIN (Global)", size=10, bold=True, color=PURPLE)

peneliti_items = [
    "Fungsi: Pelaksana riset valuasi pada proyek tertentu.",
    "✓  Buat & kelola proyek riset miliknya sendiri.",
    "✓  Upload peta shapefile tutupan lahan (SHP).",
    "✓  Konfigurasi 1 metode ilmiah per jasa ekosistem.",
    "✓  Input data variabel lapangan di Spreadsheet.",
    "✓  Impor data dari berkas Excel (.xlsx).",
    "✓  Periksa kalkulasi TEV & grafik analitik.",
    "✓  Cetak laporan PDF & ekspor Excel 13-sheet.",
    "✗  Tidak dapat ubah Master Data Global nasional.",
    "✗  Tidak dapat kelola akun pengguna lain.",
    "✗  Tidak dapat akses konsol Audit Log.",
]
admin_items = [
    "Fungsi: Pengendali standar nasional & keamanan.",
    "✓  Dasbor portofolio riset nasional se-Indonesia.",
    "✓  CRUD Penuh Master Data Global standar nasional.",
    "✓  Manajemen akun (tambah/edit/nonaktifkan).",
    "✓  Monitoring & preview seluruh proyek peneliti.",
    "✓  Akses konsol Audit Trail & Data Diff forensik.",
    "✓  Ekspor dokumen Audit Log ke format PDF.",
    "✓  Asistensi teknis via Pusat Pesan Real-Time.",
    "✓  Memiliki seluruh hak akses operasional Peneliti.",
]

p_tb = s5.shapes.add_textbox(Inches(0.65), Inches(1.65), Inches(3.1), Inches(3.8))
p_tf = p_tb.text_frame; p_tf.word_wrap = True
a_tb = s5.shapes.add_textbox(Inches(4.52), Inches(1.65), Inches(3.1), Inches(3.8))
a_tf = a_tb.text_frame; a_tf.word_wrap = True

for i, item in enumerate(peneliti_items):
    p = p_tf.paragraphs[0] if i == 0 else p_tf.add_paragraph()
    run = p.add_run(); run.text = item
    run.font.name = "Arial"; run.font.size = Pt(8); run.font.color.rgb = DARK

for i, item in enumerate(admin_items):
    p = a_tf.paragraphs[0] if i == 0 else a_tf.add_paragraph()
    run = p.add_run(); run.text = item
    run.font.name = "Arial"; run.font.size = Pt(8); run.font.color.rgb = WHITE

# Tabel matriks
add_rect(s5, Inches(0.5), Inches(5.85), Inches(7.27), Inches(4.85), SLATE50, SLATE200)
add_textbox(s5, Inches(0.65), Inches(5.92), Inches(7.0), Inches(0.3),
            "Matriks Perizinan Modul Aplikasi", size=10, bold=True, color=OCEAN)
# Header tabel
add_rect(s5, Inches(0.5), Inches(6.27), Inches(7.27), Inches(0.35), OCEAN)
add_textbox(s5, Inches(0.65), Inches(6.3), Inches(4.5), Inches(0.28), "Modul Sistem", size=8.5, bold=True, color=WHITE)
add_textbox(s5, Inches(5.2), Inches(6.3), Inches(1.1), Inches(0.28), "Peneliti", size=8.5, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
add_textbox(s5, Inches(6.35), Inches(6.3), Inches(1.3), Inches(0.28), "Super Admin", size=8.5, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

matrix_rows = [
    ("01 Proyek (Buat & Kelola Proyek Riset)", "✓ Penuh", "✓ Penuh"),
    ("02-06 Workflow Valuasi & Spreadsheet", "✓ Penuh", "✓ Penuh"),
    ("07-09 Kalkulasi TEV, Analitik & Laporan", "✓ Penuh", "✓ Penuh"),
    ("Master Data Global (Standar Nasional)", "✗ Tidak Dapat", "✓ CRUD Penuh"),
    ("Manajemen Pengguna & Hak Akses Akun", "✗ Tidak Dapat", "✓ CRUD Penuh"),
    ("Audit Trail, Log Aktivitas & Data Diff", "✗ Tidak Dapat", "✓ Akses Penuh"),
    ("Pusat Pesan Real-Time (WebSocket Chat)", "Chat ke Admin", "Chat ke Peneliti"),
    ("Dasbor Portofolio Riset Nasional", "✗ Tidak Dapat", "✓ Akses Penuh"),
]
row_y = Inches(6.62)
for i, (modul, pnl, adm) in enumerate(matrix_rows):
    bg = WHITE if i % 2 == 0 else SLATE50
    add_rect(s5, Inches(0.5), row_y, Inches(7.27), Inches(0.36), bg, SLATE200)
    add_textbox(s5, Inches(0.65), row_y + Inches(0.05), Inches(4.4), Inches(0.26), modul, size=8, color=DARK)
    pc = EMERALD if "✓" in pnl else RGBColor(200, 80, 80)
    ac = EMERALD if "✓" in adm else RGBColor(200, 80, 80)
    add_textbox(s5, Inches(5.2), row_y + Inches(0.05), Inches(1.05), Inches(0.26), pnl, size=7.5, color=pc, align=PP_ALIGN.CENTER)
    add_textbox(s5, Inches(6.35), row_y + Inches(0.05), Inches(1.35), Inches(0.26), adm, size=7.5, color=ac, align=PP_ALIGN.CENTER)
    row_y += Inches(0.36)

# =========================================================
# HELPER untuk slide alur 9 langkah (2 seksi per slide)
# =========================================================
def workflow_2steps(step1_badge, step1_title, step1_desc, step1_items,
                     step2_badge, step2_title, step2_desc, step2_items,
                     slide_label, page_num):
    s = content_slide("BAB 4", OCEAN, slide_label, page_num)
    for (badge, title, desc, items, y_start) in [
        (step1_badge, step1_title, step1_desc, step1_items, Inches(1.2)),
        (step2_badge, step2_title, step2_desc, step2_items, Inches(5.7)),
    ]:
        add_rect(s, Inches(0.5), y_start, Inches(7.27), Inches(4.35), SLATE50, OCEAN)
        add_rect(s, Inches(0.5), y_start, Inches(1.05), Inches(0.4), OCEAN)
        add_textbox(s, Inches(0.5), y_start, Inches(1.05), Inches(0.4),
                    badge, size=10, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        add_textbox(s, Inches(1.65), y_start + Inches(0.05), Inches(6.0), Inches(0.3),
                    title, size=10.5, bold=True, color=DARK)
        add_textbox(s, Inches(0.65), y_start + Inches(0.45), Inches(7.0), Inches(0.7),
                    desc, size=9, color=DARK)
        # Item bullet
        body_tb = s.shapes.add_textbox(Inches(0.65), y_start + Inches(1.2), Inches(7.0), Inches(3.0))
        body_tf = body_tb.text_frame; body_tf.word_wrap = True
        first = True
        for item in items:
            p = body_tf.paragraphs[0] if first else body_tf.add_paragraph()
            first = False
            run = p.add_run(); run.text = item
            run.font.name = "Arial"; run.font.size = Pt(8.5); run.font.color.rgb = DARK
    return s

# =========================================================
# SLIDE 6: LANGKAH 01 & 02
# =========================================================
workflow_2steps(
    "LANGKAH 01", "Proyek Penelitian  (/peneliti/projects)",
    "Titik awal riset valuasi. Peneliti mendaftarkan entitas kajian baru dan mengunci wilayah administratif (Provinsi & Kabupaten/Kota). Penguncian lokasi ini menjadi acuan filter otomatis Master Data Biota lokal.",
    ["1.  Klik tombol '+ Proyek Baru' di pojok kanan atas tabel portofolio proyek.",
     "2.  Sistem otomatis men-generate Kode Proyek unik (contoh: PRJ-001 atau PKS-994KY1).",
     "3.  Ketikkan Nama Penelitian secara lengkap dan deskriptif.",
     "4.  Pilih Provinsi dan Kabupaten/Kota pada pemilih wilayah (LocationSelector).",
     "5.  (Opsional) Isi kolom Deskripsi dengan catatan latar belakang kajian.",
     "6.  Klik 'Simpan'. Sistem membuka workspace dan langsung mengarahkan ke Langkah 02.",
    ],
    "LANGKAH 02", "Maps & Tutupan Lahan WebGIS  (/peneliti/projects/:id/maps)",
    "Modul pemetaan interaktif berbasis Leaflet GIS. Berfungsi merender poligon tutupan lahan, mengekstrak luasan hektare presisi dari atribut shapefile, dan memproyeksikan nilai TEV per kawasan di atas peta.",
    ["•  Format Berkas: Unggah arsip .ZIP berisi .shp (geometri), .dbf (atribut), .prj (proyeksi), .shx (indeks).",
     "•  Proyeksi Wajib: Datum WGS 1984 (EPSG:4326) untuk kompatibilitas penuh dengan sistem koordinat global.",
     "•  Deep Zoom: Leaflet mendukung pembesaran peta hingga level 24 tanpa kehilangan konteks visual.",
     "•  Interaksi Poligon: Klik poligon di peta untuk melihat atribut luas (ha), kode indeks, dan nilai TEV.",
     "•  Bypass Spasial: Klik 'Lewati untuk Sekarang' jika belum ada data peta — lanjutkan secara manual.",
    ],
    "Panduan Role Peneliti — Langkah 01 & 02", 6
)

# =========================================================
# SLIDE 7: LANGKAH 03 & 04
# =========================================================
workflow_2steps(
    "LANGKAH 03", "Index Tutupan Lahan  (/peneliti/projects/:id/index)",
    "Satu 'Index' merepresentasikan satu unit zonasi area kajian. Di dalamnya dapat memuat satu atau lebih tipe tutupan lahan (contoh: Mangrove Alami + Mangrove Rehabilitasi). Modul ini menghubungkan entitas spasial peta dengan lembar kerja ekonomi.",
    ["•  Otomasi Spasial: Jika SHP diunggah di Langkah 02, daftar Index & luas Ha akan terisi otomatis.",
     "•  Buat Manual: Klik '+ Buat Index', tentukan nomor indeks, lalu klik '+ Tambah Tutupan'.",
     "•  Input Luasan: Masukkan nilai luas dalam satuan Hektare (contoh: 125.50) pada kolom luasan.",
     "•  Tautkan Poligon: Klik badge 'Belum terhubung' untuk memilih poligon peta yang sesuai.",
     "•  Filter: Tersedia filter Status (Draft/Selesai), koneksi spasial, dan pencarian nama tutupan.",
    ],
    "LANGKAH 04", "Data Master Jasa Ekosistem  (/peneliti/projects/:id/data-master)",
    "Katalog acuan ilmiah biota dan parameter ekonomi. Sistem menerapkan penyaringan otomatis berbasis lokasi — hanya menampilkan data acuan yang relevan dengan Provinsi/Kabupaten dari proyek aktif Anda.",
    ["•  Tab Jasa: Pilah data referensi berdasarkan Provisioning, Regulating, Supporting, atau Cultural.",
     "•  Template PKSPL: Klik 'Terapkan Template' untuk injeksi 8 parameter standar nasional secara instan.",
     "•  Tautkan: Klik 'Tautkan' pada biota untuk menghubungkannya ke tutupan lahan & spreadsheet Langkah 06.",
     "•  Detail Ilmiah: Klik ikon mata (👁) untuk periksa TEV (DUV/IUV), produktivitas, harga, & pustaka jurnal.",
     "•  Ekspor: Klik 'Ekspor CSV' untuk mengunduh seluruh katalog data master proyek.",
    ],
    "Panduan Role Peneliti — Langkah 03 & 04", 7
)

# =========================================================
# SLIDE 8: LANGKAH 05 & 06
# =========================================================
workflow_2steps(
    "LANGKAH 05", "Jasa & Metode Valuasi Ilmiah  (/peneliti/projects/:id/services-methods)",
    "Ruang perumusan metodologi penelitian. Peneliti mengaktifkan jasa ekosistem dan memilih tepat 1 metode valuasi per jasa untuk setiap area tutupan lahan guna mencegah perhitungan ganda (double counting). Sistem menyimpan perubahan secara otomatis (autosave).",
    ["A. Provisioning  :  Market Price Method  atau  Effect on Production (EOP).",
     "B. Regulating    :  Replacement Cost, Carbon Blue Storage, Avoided Cost, atau HPM.",
     "C. Supporting    :  Habitat Nursery Ground Method  atau  Nutrient Cycling.",
     "D. Cultural      :  Travel Cost (TCM), Contingent Valuation (CVM), atau Choice Experiment.",
     "Proteksi: Mengganti metode TIDAK menghapus data spreadsheet lama — data diarsipkan aman.",
    ],
    "LANGKAH 06", "Data Valuasi Spreadsheet Workspace  (/peneliti/projects/:id/valuation-data)",
    "Pusat lembar kerja spreadsheet reaktif. Peneliti mengisikan variabel produktivitas, kuantitas, dan harga satuan berdasarkan data survei lapangan. Kolom spreadsheet menyesuaikan secara dinamis dengan metode yang dipilih di Langkah 05.",
    ["•  Autocomplete Cerdas: Ketik 1-2 huruf biota → sistem menyarankan nama & harga acuan lokal otomatis.",
     "•  Sub-Tab Flora & Fauna: Metode Market Price menyediakan sub-tab terpisah vegetasi & hewan.",
     "•  Impor Excel: Upload .xlsx/.csv; sistem memetakan kolom variabel & mendeteksi kolom kustom.",
     "•  Kolom Kustom: Klik '+ Tambah Kolom' untuk membuat variabel penelitian spesifik Anda.",
     "•  Auto-Sync: Setiap penambahan baris / edit sel langsung tersinkronisasi ke server.",
    ],
    "Panduan Role Peneliti — Langkah 05 & 06", 8
)

# =========================================================
# SLIDE 9: LANGKAH 07 & 08
# =========================================================
workflow_2steps(
    "LANGKAH 07", "Perhitungan Total Economic Value / TEV  (/peneliti/projects/:id/calculation)",
    "Pusat verifikasi agregasi TEV. Halaman ini bersifat Hanya-Baca (Read-Only) guna memastikan semua angka murni bersumber dari spreadsheet Langkah 06. Sistem mengompilasi nilai dari seluruh kawasan menjadi satu nominal akhir.",
    ["•  Hero Banner Grand TEV: Menampilkan angka nominal TEV, rata-rata/Ha, dan jumlah baris variabel.",
     "•  Inspeksi Rumus Transparan: Klik 'Lihat Detail Perhitungan' → Modal breakdown formula per baris.",
     "•  Contoh Formula Terbuka: Produktivitas (450 kg/ha)  ×  Luas (82.50 ha)  ×  Harga (Rp 65.000) = Subtotal.",
     "•  Filter Multi-Cakupan: Centang indeks/tutupan tertentu untuk menghitung TEV parsial kawasan.",
     "•  Kembali Edit: Klik 'Buka Data Valuasi' untuk memperbaiki angka input di Langkah 06.",
    ],
    "LANGKAH 08", "Analitik & Visualisasi Data Valuasi  (/peneliti/projects/:id/analytics)",
    "Dasbor visualisasi menggunakan pustaka Recharts. Mengubah tabel angka menjadi wawasan visual interaktif untuk memudahkan interpretasi komposisi nilai ekonomi kawasan bagi pengambil kebijakan.",
    ["•  Donut Pie Chart: Proporsi rasio kontribusi 4 jasa ekosistem (P/R/S/C) terhadap TEV.",
     "•  Bar Chart Vertikal: Membandingkan perolehan nominal setiap metode valuasi yang digunakan.",
     "•  Bar Chart Horizontal: Membandingkan kontribusi ekonomi antar area tutupan lahan.",
     "•  3 Kartu Indikator: Nilai per Hektare, Jasa Dominan, dan Keseimbangan Distribusi Jasa.",
     "•  Time-Series Historis: Grafik tren TEV multi-tahun jika ada data survei masa lalu.",
    ],
    "Panduan Role Peneliti — Langkah 07 & 08", 9
)

# =========================================================
# SLIDE 10: LANGKAH 09
# =========================================================
s10 = content_slide("BAB 4", OCEAN, "Panduan Role Peneliti — Langkah 09: Review & Laporan", 10)

add_rect(s10, Inches(0.5), Inches(1.2), Inches(7.27), Inches(1.55), SLATE50, OCEAN)
add_textbox(s10, Inches(0.65), Inches(1.27), Inches(7.0), Inches(0.3),
            "LANGKAH 09 — Review & Laporan Akhir  (/peneliti/projects/:id/review)", size=10, bold=True, color=OCEAN)
add_textbox(s10, Inches(0.65), Inches(1.58), Inches(7.0), Inches(1.0),
            "Kompilasi dokumen final yang menyatukan seluruh 8 langkah sebelumnya ke dalam 11 bagian laporan ilmiah utuh yang siap ditinjau, dicetak ke format PDF A4 resmi, atau diekspor ke workbook Excel 13-sheet. Semua data terkunci sebagai Hanya-Baca (Read-Only) untuk menjaga keaslian sebelum penerbitan resmi.",
            size=9, color=DARK)

add_rect(s10, Inches(0.5), Inches(2.88), Inches(7.27), Inches(3.5), SLATE50, SLATE200)
add_textbox(s10, Inches(0.65), Inches(2.93), Inches(7.0), Inches(0.3),
            "Struktur 11 Bagian Dokumen Laporan Final", size=9.5, bold=True, color=OCEAN)
sections = [
    "1. Informasi Umum Proyek (Nama, Kode, Ketua Peneliti, Wilayah, Ekosistem, Tahun Anggaran)",
    "2. Index & Area Tutupan Lahan (Tabel status spasial, luas Ha, dan ringkasan zonasi)",
    "3. Data Spasial & Pemetaan GIS (Metrik integrasi spasial dan WebGIS Viewer mini)",
    "4. Data Master Acuan (Katalog biota & parameter ilmiah lokal yang diadopsi proyek)",
    "5. Jasa & Metode Valuasi (Tabel konfigurasi 1 metode ilmiah per jasa per tutupan)",
    "6. Data Valuasi Lengkap (Seluruh tabel spreadsheet variabel A.1 Flora s.d. D Cultural)",
    "7. Subtotal Perhitungan (Agregasi nominal setiap jasa ekosistem secara terpisah)",
    "8. Rekapitulasi Resmi TEV (Tabel proporsi kontribusi % keempat jasa terhadap TEV)",
    "9. Analitik & Visualisasi (Pratinjau grafik distribusi dan indikator nilai ekonomi kawasan)",
    "10. Banner Pengesahan Grand TEV (Pernyataan sah nilai moneter akhir kawasan penelitian)",
    "11. Panel Aksi Finalisasi (Tombol cetak PDF, unduh Excel 13-sheet, dan chat Super Admin)",
]
sec_tb = s10.shapes.add_textbox(Inches(0.65), Inches(3.28), Inches(7.0), Inches(3.0))
sec_tf = sec_tb.text_frame; sec_tf.word_wrap = True
first = True
for sc in sections:
    p = sec_tf.paragraphs[0] if first else sec_tf.add_paragraph()
    first = False
    run = p.add_run(); run.text = sc
    run.font.name = "Arial"; run.font.size = Pt(8); run.font.color.rgb = DARK

# 2 kotak ekspor
add_rect(s10, Inches(0.5), Inches(6.5), Inches(3.55), Inches(4.8), BLUE50, OCEAN)
add_textbox(s10, Inches(0.65), Inches(6.57), Inches(3.2), Inches(0.32),
            "Cetak Dokumen Resmi (PDF A4)", size=9.5, bold=True, color=OCEAN)
pdf_steps = [
    "1. Klik tombol 'Preview Laporan' di bilah kanan atas halaman.",
    "2. Halaman pratinjau resmi ber-KOP PKSPL IPB akan terbuka.",
    "3. Tekan Ctrl + P di keyboard peramban Anda.",
    "4. Pada dialog cetak, pilih 'Save as PDF' (ukuran A4 Portrait).",
    "5. Di pengaturan lanjutan, centang 'Background graphics' agar warna & grafik tercetak sempurna.",
    "6. Klik Save untuk menyimpan laporan PDF resmi.",
]
pdf_tb = s10.shapes.add_textbox(Inches(0.65), Inches(6.92), Inches(3.2), Inches(4.0))
pdf_tf = pdf_tb.text_frame; pdf_tf.word_wrap = True
first = True
for st in pdf_steps:
    p = pdf_tf.paragraphs[0] if first else pdf_tf.add_paragraph()
    first = False
    run = p.add_run(); run.text = st
    run.font.name = "Arial"; run.font.size = Pt(8.5); run.font.color.rgb = DARK

add_rect(s10, Inches(4.22), Inches(6.5), Inches(3.55), Inches(4.8), BLUE50, EMERALD)
add_textbox(s10, Inches(4.37), Inches(6.57), Inches(3.2), Inches(0.32),
            "Ekspor Workbook Excel (13 Sheet)", size=9.5, bold=True, color=EMERALD)
excel_lines = [
    "Klik tombol 'Export Excel'. Sistem mengompilasi seluruh basis data proyek ke berkas .xlsx berisi 13 lembar kerja terstruktur:",
    "",
    "Sheet 1: Ringkasan Eksekutif & TEV",
    "Sheet 2: Katalog Indeks & Tutupan",
    "Sheet 3: Data Atribut Geospasial",
    "Sheet 4: Katalog Data Master Acuan",
    "Sheet 5: Konfigurasi Jasa & Metode",
    "Sheet 6-13: Individual tiap metode valuasi (Market Price, Replacement Cost, Blue Carbon, Nursery Ground, TCM, CVM, dll.)",
]
exc_tb = s10.shapes.add_textbox(Inches(4.37), Inches(6.92), Inches(3.2), Inches(4.0))
exc_tf = exc_tb.text_frame; exc_tf.word_wrap = True
first = True
for line in excel_lines:
    p = exc_tf.paragraphs[0] if first else exc_tf.add_paragraph()
    first = False
    run = p.add_run(); run.text = line
    run.font.name = "Arial"; run.font.size = Pt(8.5); run.font.color.rgb = DARK

# =========================================================
# SLIDE 11: BAB 5 DASBOR & MASTER DATA
# =========================================================
s11 = content_slide("BAB 5", PURPLE, "Panduan Super Admin — Dasbor & Master Data Global", 11)

section_box(s11, Inches(0.5), Inches(1.2), Inches(7.27), Inches(4.35),
            "5.1 DASBOR", PURPLE,
            "Dasbor Eksekutif Portofolio Riset Nasional  (/admin/dashboard)",
            [
                "Deskripsi: Pusat pengawasan makro valuasi ekonomi pesisir se-Indonesia. Mengagregasikan akumulasi nilai TEV nasional dari seluruh proyek penelitian di bawah PKSPL IPB.",
                "•  4 Kartu KPI Global: Total TEV Nasional (Rp Miliar), Total Proyek Riset, Luas Kawasan (Ha), Pengguna Terdaftar.",
                "•  Grafik Distribusi Ekosistem: Membandingkan TEV Mangrove, Terumbu Karang, Padang Lamun, dan Estuari.",
                "•  Grafik Cakupan Jasa: Donut Chart adopsi 4 pilar jasa ekosistem secara nasional.",
                "•  Tren & Komparasi Waktu: ComposedChart bulanan/tahunan dengan toggle perbandingan antar periode.",
                "•  Ekspor Ringkasan PDF: Unduh laporan eksekutif lengkap dengan tangkapan visual grafik.",
            ])

section_box(s11, Inches(0.5), Inches(5.7), Inches(7.27), Inches(5.05),
            "5.2 MASTER DATA", PURPLE,
            "Master Data Global — Standar Valuasi Nasional  (/admin/master-data)",
            [
                "Deskripsi: Jantung standardisasi PKSPL. Super Admin memiliki wewenang CRUD Penuh untuk menetapkan standar harga pasar biota, upah regional, koefisien serapan karbon, dan parameter valuasi se-Indonesia.",
                "•  Filter Cascading: Pilih Provinsi → Dropdown Kabupaten/Kota tersaring otomatis → Pilih Kategori Jasa.",
                "•  Tambah Baru: Klik '+ Tambah Data Master', masukkan Kategori Jasa, Provinsi, Kabupaten, Tutupan Lahan, Nama Indonesia, Nama Latin, Nilai Acuan (Rp), Satuan, dan Sumber Jurnal Ilmiah.",
                "•  Edit & Perbarui: Klik ikon pensil (✏) untuk memperbarui nilai harga referensi berdasarkan data inflasi terbaru.",
                "•  Hapus: Klik ikon sampah (🗑) → konfirmasi penghapusan permanen data referensi.",
                "•  Integrasi Proyek: Data yang ditetapkan di sini secara otomatis ditarik oleh Peneliti di Langkah 04 & 06.",
            ])

# =========================================================
# SLIDE 12: BAB 5 PENGGUNA & AUDIT
# =========================================================
s12 = content_slide("BAB 5", PURPLE, "Panduan Super Admin — Manajemen Pengguna & Audit Trail", 12)

section_box(s12, Inches(0.5), Inches(1.2), Inches(7.27), Inches(4.35),
            "5.3 PENGGUNA", PURPLE,
            "Manajemen Pengguna & Hak Akses Akun  (/admin/users)",
            [
                "Deskripsi: Tata kelola akun seluruh staf, dosen, peneliti, dan administrator yang terdaftar di platform.",
                "•  Tambah Pengguna Baru: Klik '+ Tambah Pengguna', masukkan Nama, Email, Password, dan Role.",
                "•  Pilihan Role: Super Admin (ungu), Peneliti/Researcher (hijau), Guest/Tamu (abu-abu).",
                "•  Presensi Online Real-Time: Titik hijau = Online (aktif sekarang); titik abu-abu = Offline + waktu terakhir aktif.",
                "•  Edit Role & Status: Klik 'Edit Role' untuk ubah hak akses atau menonaktifkan akun yang purna tugas.",
                "•  Profil Pengguna: Klik 'Lihat Profil' untuk inspeksi portofolio riset dan riwayat login pengguna.",
            ])

section_box(s12, Inches(0.5), Inches(5.7), Inches(7.27), Inches(5.05),
            "5.5 AUDIT TRAIL", PURPLE,
            "Riwayat Aktivitas & Audit Trail Data Diff  (/admin/activity)",
            [
                "Deskripsi: Pencatatan permanen setiap transaksi data (Create, Update, Delete, Import, Export, Login, Logout) untuk memenuhi standar kepatuhan audit forensik lingkungan.",
                "•  Filter Multi-Kriteria: Pilah log berdasarkan Peran, Tipe Aksi (Create/Update/Delete), Proyek, dan Rentang Waktu.",
                "•  Forensik Jaringan: Mencatat Alamat IP pengguna, jenis peramban (User Agent), dan latensi eksekusi (ms).",
                "•  Data Diff Forensik: Klik 'Detail' → Tampilkan perbandingan Nilai Sebelum (merah) vs Nilai Sesudah (hijau).",
                "•  Penyamaran Rahasia: Password, token, dan hash otomatis disembunyikan demi keamanan privasi akun.",
                "•  Ekspor PDF Audit Trail: Klik 'Ekspor Log Audit' → dokumen PDF audit berseri resmi PKSPL IPB.",
            ])

# =========================================================
# SLIDE 13: BAB 6 PESAN
# =========================================================
s13 = content_slide("BAB 6", EMERALD, "Modul Komunikasi & Kolaborasi Real-Time", 13)

add_rect(s13, Inches(0.5), Inches(1.2), Inches(7.27), Inches(1.55), SLATE50, EMERALD)
add_textbox(s13, Inches(0.65), Inches(1.27), Inches(7.0), Inches(0.3),
            "Pusat Pesan Instan Berbasis WebSocket (Laravel Reverb + Echo)", size=10, bold=True, color=EMERALD)
add_textbox(s13, Inches(0.65), Inches(1.58), Inches(7.0), Inches(1.0),
            "Saluran komunikasi dua arah langsung antara Peneliti dan Super Admin di dalam peramban web tanpa perlu memuat ulang halaman (realtime tanpa refresh). Berfungsi untuk konsultasi metodologi valuasi, validasi data lapangan sebelum finalisasi laporan, dan pertukaran berkas lampiran.",
            size=9, color=DARK)

msg_features = [
    ("Memulai Obrolan Baru", "Klik tombol '+' pada panel daftar percakapan kiri, pilih pengguna dari direktori PKSPL (indikator hijau = online), ketik pesan pembuka, lalu kirim.", EMERALD),
    ("Lampiran Berkas (Attachment)", "Klik ikon penjepit kertas (📎) untuk mengirim foto habitat lapangan, berkas dokumen PDF/Word/Excel, atau arsip geospasial GIS (.zip berisi SHP).", OCEAN),
    ("Edit Pesan Terkirim", "Klik ikon titik tiga (⋮) pada pesan Anda sendiri → pilih 'Edit' → perbaiki teks → Simpan. Pesan diberi tanda keterangan '(diedit)'.", OCEAN),
    ("Hapus / Tarik Pesan", "Klik ikon titik tiga (⋮) → pilih 'Hapus'. Pesan ditarik dan diganti teks penanda 'Pesan telah dihapus'.", RGBColor(200, 80, 80)),
    ("Tanda Baca (Read Receipts)", "Centang satu abu-abu = terkirim ke server.  Centang dua abu-abu = diterima perangkat.  Centang dua biru = sudah dibaca penerima.", OCEAN),
    ("Indikator Mengetik (Typing)", "Saat lawan bicara mengetik balasan, sistem menampilkan notifikasi '[Nama] sedang mengetik...' secara real-time.", EMERALD),
    ("Saran Balasan Cepat", "Template balasan instan standar operasional PKSPL untuk mempercepat respons teknis.", EMERALD),
    ("Notifikasi Pesan Baru", "Badge angka merah pada menu 'Pesan' di sidebar menampilkan jumlah pesan yang belum terbaca secara real-time.", OCEAN),
]
y_m = Inches(2.88)
for i, (title, body, col) in enumerate(msg_features):
    add_rect(s13, Inches(0.5) if i % 2 == 0 else Inches(4.15),
             y_m, Inches(3.42), Inches(1.1), SLATE50, col)
    add_textbox(s13, (Inches(0.65) if i % 2 == 0 else Inches(4.3)),
                y_m + Inches(0.06), Inches(3.1), Inches(0.3), title, size=9, bold=True, color=col)
    add_textbox(s13, (Inches(0.65) if i % 2 == 0 else Inches(4.3)),
                y_m + Inches(0.35), Inches(3.1), Inches(0.68), body, size=8, color=DARK)
    if i % 2 == 1:
        y_m += Inches(1.2)

# =========================================================
# SLIDE 14: BAB 7 SPESIFIKASI TEKNIS
# =========================================================
s14 = content_slide("BAB 7", SLATE700, "Spesifikasi Teknis & Integritas Arsitektur Sistem", 14)

add_rect(s14, Inches(0.5), Inches(1.2), Inches(7.27), Inches(0.35), SLATE700)
add_textbox(s14, Inches(0.65), Inches(1.23), Inches(4.0), Inches(0.28),
            "Tumpukan Teknologi (Technology Stack)", size=9.5, bold=True, color=WHITE)

stacks = [
    ("Antarmuka (Frontend)", "React 18 SPA + Vite Bundler + Tailwind CSS"),
    ("Backend & API",        "Laravel 11 (PHP 8.2+) RESTful Architecture"),
    ("Pemetaan Spasial GIS", "Leaflet.js + Shapefile Parser (WGS 1984)"),
    ("Visualisasi Grafik",   "Recharts SVG Interactive Chart Library"),
    ("Komunikasi Realtime",  "Laravel Reverb Server + WebSocket (Pusher Protocol)"),
    ("Pelaporan PDF",        "jsPDF + jspdf-autotable + html2canvas (A4 Portrait)"),
    ("Ekspor Spreadsheet",   "Custom XML Engine — Workbook Excel 13-Sheet .xlsx"),
    ("Infrastruktur Server", "Docker Containerized + Nginx Reverse Proxy"),
]
header_y = Inches(1.62)
add_rect(s14, Inches(0.5), header_y, Inches(3.5), Inches(0.32), OCEAN)
add_rect(s14, Inches(4.05), header_y, Inches(3.72), Inches(0.32), OCEAN)
add_textbox(s14, Inches(0.65), header_y + Inches(0.04), Inches(3.2), Inches(0.24), "Lapisan Arsitektur", size=8, bold=True, color=WHITE)
add_textbox(s14, Inches(4.2), header_y + Inches(0.04), Inches(3.4), Inches(0.24), "Teknologi Utama", size=8, bold=True, color=WHITE)

row_y = header_y + Inches(0.32)
for i, (layer, tech) in enumerate(stacks):
    bg = WHITE if i % 2 == 0 else SLATE50
    add_rect(s14, Inches(0.5), row_y, Inches(7.27), Inches(0.38), bg, SLATE200)
    add_textbox(s14, Inches(0.65), row_y + Inches(0.06), Inches(3.2), Inches(0.26), layer, size=8.5, bold=True, color=DARK)
    add_textbox(s14, Inches(4.2), row_y + Inches(0.06), Inches(3.4), Inches(0.26), tech, size=8.5, color=OCEAN)
    row_y += Inches(0.38)

# Integritas data
add_rect(s14, Inches(0.5), row_y + Inches(0.15), Inches(7.27), Inches(2.2), SLATE50, SLATE200)
add_textbox(s14, Inches(0.65), row_y + Inches(0.22), Inches(7.0), Inches(0.3),
            "Penjaminan Integritas Data & Sains Valuasi", size=10, bold=True, color=OCEAN)
integrity_items = [
    "1. Single Source of Truth: Seluruh angka pada modul Perhitungan, Analitik, dan Laporan bersumber tunggal langsung dari sel spreadsheet Langkah 06, tidak ada kalkulasi paralel yang bisa menyebabkan inkonsistensi.",
    "2. Pencegahan Double Counting: Sistem membatasi peneliti memilih tepat 1 metode per jasa ekosistem pada satu area tutupan lahan, mencegah penggelembungan (overestimation) nilai ekonomi kawasan.",
    "3. Presisi Desimal Tinggi: Variabel matematis dihitung dengan floating-point 4 angka desimal sebelum dibulatkan ke satuan Rupiah (Rp 1) pada tahap agregasi subtotal akhir.",
]
int_tb = s14.shapes.add_textbox(Inches(0.65), row_y + Inches(0.55), Inches(7.0), Inches(1.7))
int_tf = int_tb.text_frame; int_tf.word_wrap = True
first = True
for it in integrity_items:
    p = int_tf.paragraphs[0] if first else int_tf.add_paragraph()
    first = False
    run = p.add_run(); run.text = it
    run.font.name = "Arial"; run.font.size = Pt(8.5); run.font.color.rgb = DARK

# Kotak penutup institusi
close_y = row_y + Inches(2.5)
add_rect(s14, Inches(0.5), close_y, Inches(7.27), Inches(1.7), NAVY)
add_textbox(s14, Inches(0.5), close_y + Inches(0.15), Inches(7.27), Inches(0.35),
            "PUSAT KAJIAN SUMBERDAYA PESISIR DAN LAUTAN (PKSPL)", size=11.5, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
add_textbox(s14, Inches(0.5), close_y + Inches(0.5), Inches(7.27), Inches(0.32),
            "Institut Pertanian Bogor (IPB University) • Kampus Baranangsiang, Bogor 16144", size=9, color=RGBColor(203, 213, 225), align=PP_ALIGN.CENTER)
add_textbox(s14, Inches(0.5), close_y + Inches(0.82), Inches(7.27), Inches(0.3),
            "Surel: pkspl@ipb.ac.id  •  Laman Resmi: pkspl.ipb.ac.id", size=9, color=CYAN, align=PP_ALIGN.CENTER)
add_rect(s14, Inches(0.5), close_y + Inches(1.18), Inches(7.27), Inches(0.04), CYAN)
add_textbox(s14, Inches(0.5), close_y + Inches(1.3), Inches(7.27), Inches(0.28),
            "Buku Panduan Pengguna Resmi Sistem Valuasi PKSPL IPB  •  Versi 2.0  •  © 2026  •  Dokumen Terkendali", size=7.5, color=MUTED, align=PP_ALIGN.CENTER)

# =========================================================
# SAVE
# =========================================================
output = "Manual_Book_PKSPL_Canva.pptx"
prs.save(output)
print(f"Berhasil disimpan: {output}")
print(f"Total slide: {len(prs.slides)}")
