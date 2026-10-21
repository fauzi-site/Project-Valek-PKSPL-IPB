import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_manual_book_pptx():
    prs = Presentation()
    
    # Set to A4 Portrait: 210mm x 297mm (8.27 in x 11.69 in)
    prs.slide_width = Inches(8.27)
    prs.slide_height = Inches(11.69)
    blank_layout = prs.slide_layouts[6] # blank layout
    
    # Palette
    C_OCEAN_DARK = RGBColor(12, 74, 110)    # #0c4a6e
    C_SLATE_DARK = RGBColor(15, 23, 42)     # #0f172a
    C_OCEAN_BLUE = RGBColor(2, 132, 199)    # #0284c7
    C_CYAN_LIGHT = RGBColor(14, 165, 233)   # #0ea5e9
    C_WHITE      = RGBColor(255, 255, 255)
    C_CARD_BG    = RGBColor(248, 250, 252)  # #f8fafc
    C_CARD_BORDER= RGBColor(226, 232, 240)  # #e2e8f0
    C_TEXT_DARK  = RGBColor(30, 41, 59)     # #1e293b
    C_TEXT_MUTED = RGBColor(100, 116, 139)  # #64748b
    C_PURPLE     = RGBColor(147, 51, 234)
    C_EMERALD    = RGBColor(16, 185, 129)
    C_AMBER      = RGBColor(245, 158, 11)

    def add_header_footer(slide, title_text, page_num):
        # Header
        tb_hdr = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(6.67), Inches(0.4))
        p_hdr = tb_hdr.text_frame.paragraphs[0]
        p_hdr.text = f"MANUAL BOOK • {title_text.upper()}"
        p_hdr.font.name = "Arial"
        p_hdr.font.size = Pt(8.5)
        p_hdr.font.bold = True
        p_hdr.font.color.rgb = C_OCEAN_BLUE
        
        # Header line
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.75), Inches(6.67), Inches(0.015))
        line.fill.solid()
        line.fill.fore_color.rgb = C_CARD_BORDER
        line.line.color.rgb = C_CARD_BORDER

        # Footer line
        line_f = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(11.1), Inches(6.67), Inches(0.015))
        line_f.fill.solid()
        line_f.fill.fore_color.rgb = C_CARD_BORDER
        line_f.line.color.rgb = C_CARD_BORDER

        # Footer text
        tb_ftr = slide.shapes.add_textbox(Inches(0.8), Inches(11.15), Inches(4.5), Inches(0.35))
        p_ftr = tb_ftr.text_frame.paragraphs[0]
        p_ftr.text = "PKSPL IPB University • Sistem Valuasi Jasa Ekosistem"
        p_ftr.font.name = "Arial"
        p_ftr.font.size = Pt(8)
        p_ftr.font.color.rgb = C_TEXT_MUTED

        # Page Number
        tb_num = slide.shapes.add_textbox(Inches(5.5), Inches(11.15), Inches(2.0), Inches(0.35))
        p_num = tb_num.text_frame.paragraphs[0]
        p_num.alignment = PP_ALIGN.RIGHT
        p_num.text = f"Halaman {page_num}"
        p_num.font.name = "Arial"
        p_num.font.size = Pt(8)
        p_num.font.bold = True
        p_num.font.color.rgb = C_TEXT_MUTED

    # ==========================================
    # SLIDE 1: COVER
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    img_path = "cover_bg.jpg"
    if os.path.exists(img_path):
        s1.shapes.add_picture(img_path, 0, 0, Inches(8.27), Inches(11.69))
    
    # Dark Overlay box for readable typography
    overlay = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(8.27), Inches(11.69))
    overlay.fill.solid()
    overlay.fill.fore_color.rgb = C_SLATE_DARK
    # In python-pptx, transparency is simulated via solid color or dark gradient
    # Since Canva supports full alpha, we use a stylish dark card overlay
    overlay.fill.transparency = 0.35
    overlay.line.fill.background()

    # Top Brand Card
    hdr_box = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.8), Inches(6.67), Inches(1.1))
    hdr_box.fill.solid()
    hdr_box.fill.fore_color.rgb = C_SLATE_DARK
    hdr_box.fill.transparency = 0.2
    hdr_box.line.color.rgb = C_OCEAN_BLUE
    
    tf_h = hdr_box.text_frame
    tf_h.margin_left = Inches(0.3)
    tf_h.margin_top = Inches(0.2)
    p1 = tf_h.paragraphs[0]
    p1.text = "PKSPL IPB UNIVERSITY"
    p1.font.bold = True
    p1.font.size = Pt(11)
    p1.font.color.rgb = C_CYAN_LIGHT
    
    p2 = tf_h.add_paragraph()
    p2.text = "Pusat Kajian Sumberdaya Pesisir dan Lautan • Institut Pertanian Bogor"
    p2.font.size = Pt(9.5)
    p2.font.color.rgb = C_WHITE

    # Title Card Center
    main_card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.6), Inches(6.67), Inches(5.8))
    main_card.fill.solid()
    main_card.fill.fore_color.rgb = C_SLATE_DARK
    main_card.fill.transparency = 0.15
    main_card.line.color.rgb = C_OCEAN_BLUE

    tf_m = main_card.text_frame
    tf_m.margin_left = Inches(0.4)
    tf_m.margin_top = Inches(0.4)
    tf_m.margin_right = Inches(0.4)
    
    p_tag = tf_m.paragraphs[0]
    p_tag.text = "USER MANUAL & OPERATIONAL GUIDE"
    p_tag.font.bold = True
    p_tag.font.size = Pt(10)
    p_tag.font.color.rgb = C_CYAN_LIGHT

    p_t1 = tf_m.add_paragraph()
    p_t1.text = "BUKU PANDUAN PENGGUNA"
    p_t1.font.bold = True
    p_t1.font.size = Pt(26)
    p_t1.font.color.rgb = C_WHITE

    p_t2 = tf_m.add_paragraph()
    p_t2.text = "Sistem Informasi Valuasi Jasa Ekosistem Pesisir & Lautan"
    p_t2.font.bold = True
    p_t2.font.size = Pt(14)
    p_t2.font.color.rgb = C_CYAN_LIGHT

    p_desc = tf_m.add_paragraph()
    p_desc.space_before = Pt(16)
    p_desc.text = (
        "Panduan operasional komprehensif bagi Peneliti dan Super Admin untuk "
        "menghitung Total Economic Value (TEV), integrasi WebGIS spasial, "
        "katalog master biota, spreadsheet valuasi, hingga penerbitan laporan resmi."
    )
    p_desc.font.size = Pt(10)
    p_desc.font.color.rgb = RGBColor(226, 232, 240)

    # Footer Card on Cover
    ftr_card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(8.9), Inches(6.67), Inches(1.8))
    ftr_card.fill.solid()
    ftr_card.fill.fore_color.rgb = C_SLATE_DARK
    ftr_card.fill.transparency = 0.15
    ftr_card.line.color.rgb = C_OCEAN_BLUE
    
    tf_f = ftr_card.text_frame
    tf_f.margin_left = Inches(0.4)
    tf_f.margin_top = Inches(0.3)
    
    pf1 = tf_f.paragraphs[0]
    pf1.text = "Sasaran Pengguna : Peneliti Riset & Super Administrator Global"
    pf1.font.size = Pt(9.5)
    pf1.font.bold = True
    pf1.font.color.rgb = C_WHITE
    
    pf2 = tf_f.add_paragraph()
    pf2.text = "Teknologi Platform : React SPA + Laravel 11 API + Leaflet WebGIS"
    pf2.font.size = Pt(9.5)
    pf2.font.color.rgb = RGBColor(203, 213, 225)

    pf3 = tf_f.add_paragraph()
    pf3.text = "Edisi Dokumen       : Versi 2.0 (Tahun 2026) • Hak Cipta PKSPL IPB"
    pf3.font.size = Pt(9.5)
    pf3.font.color.rgb = C_CYAN_LIGHT

    # ==========================================
    # SLIDE 2: DAFTAR ISI
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    add_header_footer(s2, "Daftar Isi Manual Book", 2)
    
    tb = s2.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(6.67), Inches(0.8))
    p = tb.text_frame.paragraphs[0]
    p.text = "Daftar Isi & Struktur Pembahasan"
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    chapters = [
        ("01", "Bab 1 — Tentang Aplikasi & Formula TEV", "Latar belakang, formula saintifik TEV, dan alur kerja umum.", "Hal 3"),
        ("02", "Bab 2 — Akses Sistem, Autentikasi & Sesi", "Prosedur login, Google OAuth, timeout sesi 2 jam, lupa password.", "Hal 4"),
        ("03", "Bab 3 — Struktur Role & Hak Akses (RBAC)", "Pemisahan tugas Peneliti vs Super Admin dan matriks perizinan.", "Hal 5"),
        ("04", "Bab 4 — Panduan Kerja Peneliti (Langkah 01-02)", "01 Proyek (pembuatan riset) dan 02 Maps (WebGIS upload SHP).", "Hal 6"),
        ("05", "Bab 4 — Panduan Kerja Peneliti (Langkah 03-04)", "03 Index (tutupan lahan) dan 04 Data Master (katalog biota lokal).", "Hal 7"),
        ("06", "Bab 4 — Panduan Kerja Peneliti (Langkah 05-06)", "05 Jasa & Metode dan 06 Data Valuasi (Spreadsheet & autocomplete).", "Hal 8"),
        ("07", "Bab 4 — Panduan Kerja Peneliti (Langkah 07-08)", "07 Perhitungan TEV (breakdown rumus) dan 08 Analitik Grafik.", "Hal 9"),
        ("08", "Bab 4 — Panduan Kerja Peneliti (Langkah 09)", "09 Review Laporan 11 bagian, Cetak PDF, dan Ekspor Excel 13-Sheet.", "Hal 10"),
        ("09", "Bab 5 — Panduan Super Admin: Dasbor & Master Data", "Monitoring TEV nasional dan CRUD Master Data Global se-Indonesia.", "Hal 11"),
        ("10", "Bab 5 — Panduan Super Admin: User & Audit Log", "Manajemen pengguna, pelacakan presensi, dan audit trail data diff.", "Hal 12"),
        ("11", "Bab 6 — Modul Komunikasi & Chat Real-Time", "Pusat pesan WebSocket, pengiriman file GIS/dokumen, read receipt.", "Hal 13"),
        ("12", "Bab 7 — Spesifikasi Teknis & Integritas Sistem", "Tech stack, datum WGS 1984, pencegahan double counting, kontak.", "Hal 14"),
    ]

    y_pos = Inches(1.8)
    for num, title, desc, page in chapters:
        box = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), y_pos, Inches(6.67), Inches(0.68))
        box.fill.solid()
        box.fill.fore_color.rgb = C_CARD_BG
        box.line.color.rgb = C_CARD_BORDER
        
        tf = box.text_frame
        tf.margin_left = Inches(0.2)
        tf.margin_top = Inches(0.08)
        
        p1 = tf.paragraphs[0]
        p1.text = f"{num}  {title}"
        p1.font.bold = True
        p1.font.size = Pt(10.5)
        p1.font.color.rgb = C_TEXT_DARK
        
        p2 = tf.add_paragraph()
        p2.text = f"     {desc}   [{page}]"
        p2.font.size = Pt(8.5)
        p2.font.color.rgb = C_TEXT_MUTED
        
        y_pos += Inches(0.74)

    # Helper function for standard content slides
    def create_content_slide(slide_title, chapter_badge, heading_text, page_number):
        s = prs.slides.add_slide(blank_layout)
        add_header_footer(s, slide_title, page_number)
        
        # Badge
        badge = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.95), Inches(2.2), Inches(0.32))
        badge.fill.solid()
        badge.fill.fore_color.rgb = C_OCEAN_BLUE
        badge.line.fill.background()
        p_b = badge.text_frame.paragraphs[0]
        p_b.text = chapter_badge.upper()
        p_b.font.size = Pt(8.5)
        p_b.font.bold = True
        p_b.font.color.rgb = C_WHITE
        p_b.alignment = PP_ALIGN.CENTER
        
        # Heading
        tb_hd = s.shapes.add_textbox(Inches(0.8), Inches(1.3), Inches(6.67), Inches(0.6))
        p_h = tb_hd.text_frame.paragraphs[0]
        p_h.text = heading_text
        p_h.font.size = Pt(17)
        p_h.font.bold = True
        p_h.font.color.rgb = C_TEXT_DARK
        
        return s

    # ==========================================
    # SLIDE 3: BAB 1 TENTANG APLIKASI
    # ==========================================
    s3 = create_content_slide("Bab 1 • Tentang Aplikasi", "Pendahuluan", "1. Tentang Aplikasi & Formula Saintifik TEV", 3)
    
    # Overview Box
    ov_box = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(6.67), Inches(1.7))
    ov_box.fill.solid()
    ov_box.fill.fore_color.rgb = C_CARD_BG
    ov_box.line.color.rgb = C_OCEAN_BLUE
    tf_ov = ov_box.text_frame
    tf_ov.margin_left = Inches(0.3)
    tf_ov.margin_top = Inches(0.2)
    p_ov1 = tf_ov.paragraphs[0]
    p_ov1.text = "TENTANG SISTEM VALUASI PKSPL IPB"
    p_ov1.font.bold = True
    p_ov1.font.size = Pt(10.5)
    p_ov1.font.color.rgb = C_OCEAN_DARK
    p_ov2 = tf_ov.add_paragraph()
    p_ov2.space_before = Pt(4)
    p_ov2.text = (
        "Sistem Valuasi PKSPL adalah instrumen komputasi terpadu berbasis web yang dikembangkan oleh "
        "PKSPL IPB University untuk mendigitalisasi penghitungan Total Economic Value (TEV) jasa ekosistem "
        "pesisir (mangrove, terumbu karang, padang lamun, estuari). Menggantikan spreadsheet manual yang "
        "rentan salah rumus, sistem ini menjamin akurasi kuantitatif untuk tata ruang dan ekonomi biru."
    )
    p_ov2.font.size = Pt(9.5)
    p_ov2.font.color.rgb = C_TEXT_DARK

    # Formula Box
    f_box = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(3.9), Inches(6.67), Inches(1.1))
    f_box.fill.solid()
    f_box.fill.fore_color.rgb = C_SLATE_DARK
    f_box.line.color.rgb = C_CYAN_LIGHT
    tf_f = f_box.text_frame
    tf_f.margin_top = Inches(0.2)
    pf_1 = tf_f.paragraphs[0]
    pf_1.text = "PERSAMAAN UTAMA TOTAL ECONOMIC VALUE (TEV)"
    pf_1.alignment = PP_ALIGN.CENTER
    pf_1.font.bold = True
    pf_1.font.size = Pt(9.5)
    pf_1.font.color.rgb = C_CYAN_LIGHT
    pf_2 = tf_f.add_paragraph()
    pf_2.space_before = Pt(4)
    pf_2.text = "TEV = Provisioning + Regulating + Supporting + Cultural"
    pf_2.alignment = PP_ALIGN.CENTER
    pf_2.font.bold = True
    pf_2.font.size = Pt(14)
    pf_2.font.color.rgb = C_WHITE

    # 4 Cards
    cards_data = [
        ("A. Provisioning (Penyediaan)", "Manfaat fisik yang dipanen langsung (ikan, kepiting, kayu mangrove, garam).", "Metode: Market Price Method & Effect on Production (EOP).", C_OCEAN_DARK, Inches(0.8), Inches(5.2)),
        ("B. Regulating (Pengaturan)", "Fungsi pelindung alam (peredam abrasi, serapan & simpanan karbon biru).", "Metode: Replacement Cost, Carbon Blue, Avoided Cost, HPM.", C_OCEAN_BLUE, Inches(4.25), Inches(5.2)),
        ("C. Supporting (Pendukung)", "Layanan penopang biologi (habitat pemijahan atau nursery ground, siklus hara).", "Metode: Habitat Nursery Ground Method & Nutrient Cycling.", C_PURPLE, Inches(0.8), Inches(7.5)),
        ("D. Cultural (Budaya & Wisata)", "Manfaat non-material (ekowisata bahari, edukasi, nilai estetika rekreasi).", "Metode: Travel Cost Method (TCM), CVM, Choice Experiment.", C_AMBER, Inches(4.25), Inches(7.5)),
    ]
    for c_title, c_desc, c_met, c_col, cx, cy in cards_data:
        cb = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, Inches(3.22), Inches(2.05))
        cb.fill.solid()
        cb.fill.fore_color.rgb = C_CARD_BG
        cb.line.color.rgb = c_col
        tfc = cb.text_frame
        tfc.margin_left = Inches(0.2)
        tfc.margin_top = Inches(0.2)
        tfc.margin_right = Inches(0.2)
        
        pc1 = tfc.paragraphs[0]
        pc1.text = c_title
        pc1.font.bold = True
        pc1.font.size = Pt(10)
        pc1.font.color.rgb = c_col
        
        pc2 = tfc.add_paragraph()
        pc2.space_before = Pt(4)
        pc2.text = c_desc
        pc2.font.size = Pt(8.5)
        pc2.font.color.rgb = C_TEXT_DARK
        
        pc3 = tfc.add_paragraph()
        pc3.space_before = Pt(4)
        pc3.text = c_met
        pc3.font.size = Pt(8.5)
        pc3.font.italic = True
        pc3.font.color.rgb = C_TEXT_MUTED

    # Flow ribbon bottom
    fl_box = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(9.8), Inches(6.67), Inches(1.0))
    fl_box.fill.solid()
    fl_box.fill.fore_color.rgb = C_CARD_BG
    fl_box.line.color.rgb = C_CARD_BORDER
    tff = fl_box.text_frame
    tff.margin_top = Inches(0.15)
    tff.margin_left = Inches(0.2)
    p_fl1 = tff.paragraphs[0]
    p_fl1.text = "ALUR KERJA LINIER 9 LANGKAH PENELITIAN :"
    p_fl1.font.bold = True
    p_fl1.font.size = Pt(9)
    p_fl1.font.color.rgb = C_OCEAN_DARK
    p_fl2 = tff.add_paragraph()
    p_fl2.space_before = Pt(2)
    p_fl2.text = "01 Proyek → 02 Maps → 03 Index → 04 Master → 05 Metode → 06 Valuasi → 07 TEV → 08 Analitik → 09 Laporan"
    p_fl2.font.size = Pt(8.5)
    p_fl2.font.color.rgb = C_TEXT_MUTED

    # ==========================================
    # SLIDE 4: BAB 2 LOGIN & AUTENTIKASI
    # ==========================================
    s4 = create_content_slide("Bab 2 • Akses & Autentikasi", "Autentikasi", "2. Prosedur Masuk (Login) & Manajemen Sesi", 4)
    
    # Left: Steps
    st_box = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(3.9), Inches(5.2))
    st_box.fill.solid()
    st_box.fill.fore_color.rgb = C_CARD_BG
    st_box.line.color.rgb = C_CARD_BORDER
    tfs = st_box.text_frame
    tfs.margin_left = Inches(0.25)
    tfs.margin_top = Inches(0.25)
    tfs.margin_right = Inches(0.25)
    
    ps_0 = tfs.paragraphs[0]
    ps_0.text = "PANDUAN LANGKAH LOGIN"
    ps_0.font.bold = True
    ps_0.font.size = Pt(11)
    ps_0.font.color.rgb = C_OCEAN_DARK

    login_steps = [
        "1. Akses Portal Resmi:\nBuka browser dan buka rute /login.",
        "2. Masukkan Kredensial:\nKetikkan Email institusi atau Username pada kolom pertama.",
        "3. Masukkan Kata Sandi:\nKetik Password akun Anda. Klik ikon mata (👁) untuk memastikan karakter tepat.",
        "4. Centang 'Ingat Saya' (Opsional):\nAgar email Anda tersimpan otomatis untuk kunjungan berikutnya.",
        "5. Klik Tombol 'Masuk':\nSistem memverifikasi akun dan mengarahkan ke ruang kerja Anda.",
        "6. Opsi Google OAuth:\nKlik 'Masuk dengan Google' untuk single sign-on jika email Anda telah tertaut."
    ]
    for st in login_steps:
        p_st = tfs.add_paragraph()
        p_st.space_before = Pt(6)
        p_st.text = st
        p_st.font.size = Pt(8.5)
        p_st.font.color.rgb = C_TEXT_DARK

    # Right: Login Mockup Card
    m_box = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(4.9), Inches(2.0), Inches(2.57), Inches(5.2))
    m_box.fill.solid()
    m_box.fill.fore_color.rgb = C_SLATE_DARK
    m_box.line.color.rgb = C_CYAN_LIGHT
    tf_mb = m_box.text_frame
    tf_mb.margin_left = Inches(0.2)
    tf_mb.margin_top = Inches(0.3)
    tf_mb.margin_right = Inches(0.2)
    
    pm1 = tf_mb.paragraphs[0]
    pm1.text = "ANTARMUKA LOGIN"
    pm1.font.bold = True
    pm1.font.size = Pt(10)
    pm1.font.color.rgb = C_CYAN_LIGHT

    pm2 = tf_mb.add_paragraph()
    pm2.space_before = Pt(8)
    pm2.text = "Email / Username\n[ peneliti@gmail.com ]"
    pm2.font.size = Pt(8.5)
    pm2.font.color.rgb = C_WHITE

    pm3 = tf_mb.add_paragraph()
    pm3.space_before = Pt(8)
    pm3.text = "Password\n[ ••••••••••••  👁 ]"
    pm3.font.size = Pt(8.5)
    pm3.font.color.rgb = C_WHITE

    pm4 = tf_mb.add_paragraph()
    pm4.space_before = Pt(12)
    pm4.text = "☑ Ingat Saya\nLupa Kata Sandi?"
    pm4.font.size = Pt(8)
    pm4.font.color.rgb = RGBColor(148, 163, 184)

    pm5 = tf_mb.add_paragraph()
    pm5.space_before = Pt(12)
    pm5.text = "[ MASUK WORKSPACE ]"
    pm5.font.bold = True
    pm5.font.size = Pt(9.5)
    pm5.font.color.rgb = C_CYAN_LIGHT

    # Bottom Warnings and Rules
    b_warn = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(7.45), Inches(6.67), Inches(3.3))
    b_warn.fill.solid()
    b_warn.fill.fore_color.rgb = C_CARD_BG
    b_warn.line.color.rgb = C_CARD_BORDER
    tf_bw = b_warn.text_frame
    tf_bw.margin_left = Inches(0.3)
    tf_bw.margin_top = Inches(0.25)
    tf_bw.margin_right = Inches(0.3)
    
    pbw1 = tf_bw.paragraphs[0]
    pbw1.text = "KETENTUAN SESI & PENGALIHAN PERAN (ROLE-BASED REDIRECTION)"
    pbw1.font.bold = True
    pbw1.font.size = Pt(10)
    pbw1.font.color.rgb = C_OCEAN_DARK

    bw_rules = [
        ("• Proteksi Sesi 2 Jam (Idle Timeout):", "Untuk melindungi kerahasiaan data riset, bila pengguna tidak aktif selama 2 jam berturut-turut, sesi akan diputus otomatis dan kembali ke login."),
        ("• Pengalihan Otomatis Peneliti:", "Setelah login, akun Peneliti otomatis diarahkan ke /peneliti/projects (Daftar Proyek)."),
        ("• Pengalihan Otomatis Super Admin:", "Setelah login, akun Super Admin otomatis diarahkan ke /admin/dashboard (Dasbor Eksekutif)."),
        ("• Pemulihan Kata Sandi (Forgot Password):", "Klik tautan 'Lupa Kata Sandi?' di halaman login, masukkan email terdaftar, dan ikuti instruksi reset dari email.")
    ]
    for r_title, r_desc in bw_rules:
        pr1 = tf_bw.add_paragraph()
        pr1.space_before = Pt(6)
        pr1.text = f"{r_title} {r_desc}"
        pr1.font.size = Pt(8.5)
        pr1.font.color.rgb = C_TEXT_DARK

    # ==========================================
    # SLIDE 5: BAB 3 STRUKTUR ROLE & RBAC
    # ==========================================
    s5 = create_content_slide("Bab 3 • Struktur Role & RBAC", "Otoritas Akses", "3. Struktur Role & Hak Akses (RBAC)", 5)
    
    # 2 Column Boxes for Roles
    r1_box = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(3.22), Inches(3.8))
    r1_box.fill.solid()
    r1_box.fill.fore_color.rgb = C_CARD_BG
    r1_box.line.color.rgb = C_EMERALD
    tfr1 = r1_box.text_frame
    tfr1.margin_left = Inches(0.2)
    tfr1.margin_top = Inches(0.2)
    
    pr1 = tfr1.paragraphs[0]
    pr1.text = "ROLE: PENELITI (RESEARCHER)"
    pr1.font.bold = True
    pr1.font.size = Pt(11)
    pr1.font.color.rgb = C_EMERALD
    
    peneliti_duties = [
        "Fungsi: Pelaksana teknis riset valuasi pada proyek tertentu.",
        "✓ Membuat & mengedit proyek riset miliknya.",
        "✓ Upload peta polygon tutupan lahan (SHP).",
        "✓ Konfigurasi 1 metode ilmiah per jasa ekosistem.",
        "✓ Input data lapangan di Spreadsheet & impor Excel.",
        "✓ Memeriksa kalkulasi TEV & visualisasi analitik.",
        "✓ Cetak laporan resmi PDF & ekspor Excel 13-sheet.",
        "✗ Tidak dapat mengubah Master Data Global nasional.",
        "✗ Tidak dapat mengelola akun pengguna lain."
    ]
    for d in peneliti_duties:
        pd = tfr1.add_paragraph()
        pd.space_before = Pt(3)
        pd.text = d
        pd.font.size = Pt(8)
        pd.font.color.rgb = C_TEXT_DARK

    # Super Admin Box
    r2_box = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(4.25), Inches(2.0), Inches(3.22), Inches(3.8))
    r2_box.fill.solid()
    r2_box.fill.fore_color.rgb = C_SLATE_DARK
    r2_box.line.color.rgb = C_PURPLE
    tfr2 = r2_box.text_frame
    tfr2.margin_left = Inches(0.2)
    tfr2.margin_top = Inches(0.2)
    
    pr2 = tfr2.paragraphs[0]
    pr2.text = "ROLE: SUPER ADMIN (GLOBAL)"
    pr2.font.bold = True
    pr2.font.size = Pt(11)
    pr2.font.color.rgb = C_PURPLE
    
    admin_duties = [
        "Fungsi: Pengendali standar nasional dan keamanan sistem.",
        "✓ Dasbor Eksekutif portofolio riset se-Indonesia.",
        "✓ CRUD Penuh Master Data Global standar nasional.",
        "✓ Manajemen pengguna (tambah/edit role/nonaktif).",
        "✓ Monitoring & preview laporan seluruh proyek riset.",
        "✓ Akses konsol Audit Trail & data diff forensik.",
        "✓ Ekspor dokumen resmi Audit Log ke format PDF.",
        "✓ Asistensi peneliti via Pusat Pesan Real-Time.",
        "✓ Memiliki seluruh hak akses operasional Peneliti."
    ]
    for d in admin_duties:
        pd = tfr2.add_paragraph()
        pd.space_before = Pt(3)
        pd.text = d
        pd.font.size = Pt(8)
        pd.font.color.rgb = C_WHITE

    # Table of permissions
    tb_mat = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.05), Inches(6.67), Inches(4.7))
    tb_mat.fill.solid()
    tb_mat.fill.fore_color.rgb = C_CARD_BG
    tb_mat.line.color.rgb = C_CARD_BORDER
    tfm = tb_mat.text_frame
    tfm.margin_left = Inches(0.25)
    tfm.margin_top = Inches(0.2)
    tfm.margin_right = Inches(0.25)
    
    pm_t = tfm.paragraphs[0]
    pm_t.text = "MATRIKS OTORITAS PERIZINAN MODUL APLIKASI"
    pm_t.font.bold = True
    pm_t.font.size = Pt(10)
    pm_t.font.color.rgb = C_OCEAN_DARK

    matrix_rows = [
        "Modul 01 Proyek (Daftar & Buat Proyek)  |  Peneliti: Akses Penuh  |  Super Admin: Akses Penuh",
        "Modul 02 Maps (WebGIS Upload SHP)       |  Peneliti: Akses Penuh  |  Super Admin: Akses Penuh",
        "Modul 03 Index (Area Tutupan Lahan)     |  Peneliti: Akses Penuh  |  Super Admin: Akses Penuh",
        "Modul 04 Data Master Proyek             |  Peneliti: Baca & Taut  |  Super Admin: Akses Penuh",
        "Modul 05 Jasa & Metode Valuasi          |  Peneliti: Akses Penuh  |  Super Admin: Akses Penuh",
        "Modul 06 Spreadsheet Data Valuasi       |  Peneliti: Input & Edit |  Super Admin: Peninjau",
        "Modul 07 Perhitungan TEV (Read-Only)    |  Peneliti: Baca Rumus   |  Super Admin: Baca Rumus",
        "Modul 08 Analitik Grafik Interaktif     |  Peneliti: Akses Penuh  |  Super Admin: Akses Penuh",
        "Modul 09 Review & Cetak Laporan Final   |  Peneliti: Cetak/Ekspor |  Super Admin: Verifikasi",
        "Master Data Global (Standar Nasional)   |  Peneliti: TIDAK        |  Super Admin: CRUD Penuh",
        "Manajemen Pengguna & Hak Akses Akun     |  Peneliti: TIDAK        |  Super Admin: CRUD Penuh",
        "Riwayat Aktivitas & Audit Log Data Diff |  Peneliti: TIDAK        |  Super Admin: Akses Penuh",
        "Pusat Pesan Real-Time (WebSocket Chat)  |  Peneliti: Chat Admin   |  Super Admin: Chat Peneliti"
    ]
    for mr in matrix_rows:
        pmr = tfm.add_paragraph()
        pmr.space_before = Pt(3)
        pmr.text = mr
        pmr.font.size = Pt(8)
        pmr.font.color.rgb = C_TEXT_DARK

    # ==========================================
    # SLIDE 6: BAB 4 PENELITI LANGKAH 01 - 02
    # ==========================================
    s6 = create_content_slide("Bab 4 • Alur Peneliti (01-02)", "Workflow Peneliti", "4. Alur Kerja Peneliti: Tahap 01 & 02", 6)
    
    # Step 01
    s1_box = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(6.67), Inches(4.2))
    s1_box.fill.solid()
    s1_box.fill.fore_color.rgb = C_CARD_BG
    s1_box.line.color.rgb = C_OCEAN_BLUE
    t1 = s1_box.text_frame
    t1.margin_left = Inches(0.3)
    t1.margin_top = Inches(0.2)
    t1.margin_right = Inches(0.3)
    
    pt1_0 = t1.paragraphs[0]
    pt1_0.text = "LANGKAH 01 — PROYEK PENELITIAN (/peneliti/projects)"
    pt1_0.font.bold = True
    pt1_0.font.size = Pt(11)
    pt1_0.font.color.rgb = C_OCEAN_DARK

    p1_desc = t1.add_paragraph()
    p1_desc.space_before = Pt(4)
    p1_desc.text = (
        "Titik awal riset valuasi. Peneliti mendaftarkan identitas riset dan mengunci lokasi geografis "
        "(Provinsi dan Kabupaten/Kota). Penguncian lokasi ini penting karena sistem akan otomatis "
        "menyaring ketersediaan Data Master Biota dan harga acuan lokal sesuai wilayah tersebut."
    )
    p1_desc.font.size = Pt(9)
    p1_desc.font.color.rgb = C_TEXT_DARK

    p1_steps = [
        "1. Klik tombol '+ Proyek Baru' di sudut kanan atas tabel portofolio.",
        "2. Sistem secara otomatis men-generate Kode Proyek unik (misal: PRJ-001 / PKS-994KY1).",
        "3. Ketikkan Nama Penelitian secara lengkap (misal: Kajian Valuasi Mangrove Teluk Ciletuh).",
        "4. Pilih Provinsi dan Kabupaten/Kota dari pemilih wilayah (LocationSelector).",
        "5. (Opsional) Tuliskan catatan ringkas pada kolom Deskripsi.",
        "6. Klik 'Simpan'. Sistem membuka workspace dan langsung mengarahkan Anda ke Langkah 02."
    ]
    for st in p1_steps:
        pst = t1.add_paragraph()
        pst.space_before = Pt(3)
        pst.text = st
        pst.font.size = Pt(8.5)
        pst.font.color.rgb = C_TEXT_DARK

    # Step 02
    s2_box = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.4), Inches(6.67), Inches(4.35))
    s2_box.fill.solid()
    s2_box.fill.fore_color.rgb = C_CARD_BG
    s2_box.line.color.rgb = C_OCEAN_BLUE
    t2 = s2_box.text_frame
    t2.margin_left = Inches(0.3)
    t2.margin_top = Inches(0.2)
    t2.margin_right = Inches(0.3)
    
    pt2_0 = t2.paragraphs[0]
    pt2_0.text = "LANGKAH 02 — MAPS & TUTUPAN LAHAN WEBGIS (/peneliti/projects/:id/maps)"
    pt2_0.font.bold = True
    pt2_0.font.size = Pt(11)
    pt2_0.font.color.rgb = C_OCEAN_DARK

    p2_desc = t2.add_paragraph()
    p2_desc.space_before = Pt(4)
    p2_desc.text = (
        "Modul pemetaan interaktif berbasis Leaflet GIS. Berfungsi merender poligon tutupan lahan, "
        "mengekstrak luasan hektare secara presisi dari atribut shapefile, dan memproyeksikan nilai TEV."
    )
    p2_desc.font.size = Pt(9)
    p2_desc.font.color.rgb = C_TEXT_DARK

    p2_rules = [
        "• Ketentuan Berkas SHP: Satukan berkas .shp, .dbf, .prj, dan .shx ke dalam 1 arsip .ZIP.",
        "• Proyeksi Koordinat Wajib: Menggunakan standar datum WGS 1984 (EPSG:4326).",
        "• Deep Zooming: Mendukung pembesaran hingga level 24 tanpa kehilangan konteks visual peta.",
        "• Interaksi Poligon: Klik poligon di peta untuk melihat atribut luas, indeks, dan nilai TEV riil.",
        "• Bypass Spasial: Jika belum memiliki berkas peta, klik 'Lewati untuk Sekarang' untuk lanjut manual."
    ]
    for r in p2_rules:
        pr = t2.add_paragraph()
        pr.space_before = Pt(3)
        pr.text = r
        pr.font.size = Pt(8.5)
        pr.font.color.rgb = C_TEXT_DARK

    # ==========================================
    # SLIDE 7: BAB 4 PENELITI LANGKAH 03 - 04
    # ==========================================
    s7 = create_content_slide("Bab 4 • Alur Peneliti (03-04)", "Workflow Peneliti", "4. Alur Kerja Peneliti: Tahap 03 & 04", 7)
    
    # Step 03
    s3_box = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(6.67), Inches(4.2))
    s3_box.fill.solid()
    s3_box.fill.fore_color.rgb = C_CARD_BG
    s3_box.line.color.rgb = C_OCEAN_BLUE
    t3 = s3_box.text_frame
    t3.margin_left = Inches(0.3)
    t3.margin_top = Inches(0.2)
    t3.margin_right = Inches(0.3)
    
    pt3_0 = t3.paragraphs[0]
    pt3_0.text = "LANGKAH 03 — INDEX TUTUPAN LAHAN (/peneliti/projects/:id/index)"
    pt3_0.font.bold = True
    pt3_0.font.size = Pt(11)
    pt3_0.font.color.rgb = C_OCEAN_DARK

    p3_desc = t3.add_paragraph()
    p3_desc.space_before = Pt(4)
    p3_desc.text = (
        "Satu 'Index' merepresentasikan satu zonasi atau unit area kajian. Dalam satu index, peneliti "
        "dapat mengelompokkan satu atau beberapa tipe tutupan lahan (misal: Mangrove Alami & Rehabilitasi). "
        "Modul ini menghubungkan entitas spasial dengan lembar kerja perhitungan ekonomi."
    )
    p3_desc.font.size = Pt(9)
    p3_desc.font.color.rgb = C_TEXT_DARK

    p3_steps = [
        "• Otomasi Spasial: Jika SHP telah diunggah di Langkah 02, daftar Index & luas Ha terisi otomatis.",
        "• Pembuatan Manual: Klik '+ Buat Index', tentukan nomor index, lalu klik '+ Tambah Tutupan'.",
        "• Input Luasan Hektare: Masukkan angka luas hektar tutupan lahan dengan tanda koma/titik desimal.",
        "• Menautkan ke Poligon Peta: Klik badge 'Belum terhubung' untuk memilih poligon yang tersedia di peta.",
        "• Filter & Paginasi: Tersedia filter status (Draft/Selesai), koneksi spasial, dan pencarian cepat."
    ]
    for st in p3_steps:
        pst = t3.add_paragraph()
        pst.space_before = Pt(3)
        pst.text = st
        pst.font.size = Pt(8.5)
        pst.font.color.rgb = C_TEXT_DARK

    # Step 04
    s4_box = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.4), Inches(6.67), Inches(4.35))
    s4_box.fill.solid()
    s4_box.fill.fore_color.rgb = C_CARD_BG
    s4_box.line.color.rgb = C_OCEAN_BLUE
    t4 = s4_box.text_frame
    t4.margin_left = Inches(0.3)
    t4.margin_top = Inches(0.2)
    t4.margin_right = Inches(0.3)
    
    pt4_0 = t4.paragraphs[0]
    pt4_0.text = "LANGKAH 04 — DATA MASTER JASA EKOSISTEM (/peneliti/projects/:id/data-master)"
    pt4_0.font.bold = True
    pt4_0.font.size = Pt(11)
    pt4_0.font.color.rgb = C_OCEAN_DARK

    p4_desc = t4.add_paragraph()
    p4_desc.space_before = Pt(4)
    p4_desc.text = (
        "Pusat basis data acuan ilmiah biota dan parameter ekonomi. Sistem secara otomatis menyaring "
        "katalog master sehingga hanya data acuan yang sesuai dengan Kabupaten/Provinsi proyek Anda "
        "yang akan ditampilkan, menjamin akurasi demografis dan harga riil."
    )
    p4_desc.font.size = Pt(9)
    p4_desc.font.color.rgb = C_TEXT_DARK

    p4_features = [
        "• Tab Kategori Jasa: Pilah data: Semua, Provisioning, Regulating, Supporting, atau Cultural.",
        "• Template Standar PKSPL: Klik 'Terapkan Template' untuk menginjeksi 8 parameter acuan standar.",
        "• Tautkan ke Tutupan: Klik 'Tautkan' pada biota untuk menghubungkannya langsung ke Spreadsheet 06.",
        "• Detail Ilmiah: Klik ikon mata (👁) untuk memeriksa klasifikasi TEV (DUV/IUV) & jurnal pustaka rujukan.",
        "• Ekspor Basis Data: Klik 'Ekspor CSV' untuk mengunduh seluruh basis data acuan proyek Anda."
    ]
    for f in p4_features:
        pf = t4.add_paragraph()
        pf.space_before = Pt(3)
        pf.text = f
        pf.font.size = Pt(8.5)
        pf.font.color.rgb = C_TEXT_DARK

    # ==========================================
    # SLIDE 8: BAB 4 PENELITI LANGKAH 05 - 06
    # ==========================================
    s8 = create_content_slide("Bab 4 • Alur Peneliti (05-06)", "Workflow Peneliti", "4. Alur Kerja Peneliti: Tahap 05 & 06", 8)
    
    # Step 05
    s5_box = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(6.67), Inches(4.2))
    s5_box.fill.solid()
    s5_box.fill.fore_color.rgb = C_CARD_BG
    s5_box.line.color.rgb = C_OCEAN_BLUE
    t5 = s5_box.text_frame
    t5.margin_left = Inches(0.3)
    t5.margin_top = Inches(0.2)
    t5.margin_right = Inches(0.3)
    
    pt5_0 = t5.paragraphs[0]
    pt5_0.text = "LANGKAH 05 — JASA & METODE VALUASI (/peneliti/projects/:id/services-methods)"
    pt5_0.font.bold = True
    pt5_0.font.size = Pt(11)
    pt5_0.font.color.rgb = C_OCEAN_DARK

    p5_desc = t5.add_paragraph()
    p5_desc.space_before = Pt(4)
    p5_desc.text = (
        "Ruang perumusan metodologi ilmiah. Peneliti mengaktifkan jasa ekosistem dan memilih tepat "
        "1 metode valuasi per jasa untuk masing-masing tutupan lahan guna mencegah perhitungan ganda "
        "(double counting). Perubahan otomatis tersimpan seketika (autosave)."
    )
    p5_desc.font.size = Pt(9)
    p5_desc.font.color.rgb = C_TEXT_DARK

    p5_methods = [
        "A. Provisioning : Pilihan metode 'Market Price Method' atau 'Effect on Production (EOP)'.",
        "B. Regulating   : Pilihan 'Replacement Cost', 'Carbon Blue Storage', 'Avoided Cost', atau 'HPM'.",
        "C. Supporting   : Pilihan 'Habitat Nursery Ground Method' atau 'Nutrient Cycling'.",
        "D. Cultural     : Pilihan 'Travel Cost Method (TCM)', 'CVM (WTP)', atau 'Choice Experiment'.",
        "Catatan Keamanan: Mengganti metode TIDAK menghapus data lama di spreadsheet, melainkan diarsipkan."
    ]
    for m in p5_methods:
        pm = t5.add_paragraph()
        pm.space_before = Pt(3)
        pm.text = m
        pm.font.size = Pt(8.5)
        pm.font.color.rgb = C_TEXT_DARK

    # Step 06
    s6_box = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.4), Inches(6.67), Inches(4.35))
    s6_box.fill.solid()
    s6_box.fill.fore_color.rgb = C_CARD_BG
    s6_box.line.color.rgb = C_OCEAN_BLUE
    t6 = s6_box.text_frame
    t6.margin_left = Inches(0.3)
    t6.margin_top = Inches(0.2)
    t6.margin_right = Inches(0.3)
    
    pt6_0 = t6.paragraphs[0]
    pt6_0.text = "LANGKAH 06 — DATA VALUASI SPREADSHEET (/peneliti/projects/:id/valuation-data)"
    pt6_0.font.bold = True
    pt6_0.font.size = Pt(11)
    pt6_0.font.color.rgb = C_OCEAN_DARK

    p6_desc = t6.add_paragraph()
    p6_desc.space_before = Pt(4)
    p6_desc.text = (
        "Pusat lembar kerja spreadsheet reaktif. Di sinilah peneliti mengisikan variabel produktivitas, "
        "kuantitas panen, harga satuan, dan koefisien biofisik lapangan yang menjadi bahan kalkulasi TEV."
    )
    p6_desc.font.size = Pt(9)
    p6_desc.font.color.rgb = C_TEXT_DARK

    p6_features = [
        "• Autocomplete Cerdas: Pada kolom Biota, ketik 1-2 huruf awal untuk memilih biota & harga lokal.",
        "• Sub-Tab Flora & Fauna: Khusus Market Price, tersedia tab terpisah untuk tumbuhan & hewan.",
        "• Impor Berkas Excel (.xlsx): Unggah file Excel; sistem memetakan kolom variabel secara otomatis.",
        "• Kolom Kustom: Klik '+ Tambah Kolom' untuk menambahkan variabel spesifik riset Anda.",
        "• Sinkronisasi Otomatis: Setiap penambahan baris atau edit sel langsung tersimpan ke database server."
    ]
    for f in p6_features:
        pf = t6.add_paragraph()
        pf.space_before = Pt(3)
        pf.text = f
        pf.font.size = Pt(8.5)
        pf.font.color.rgb = C_TEXT_DARK

    # ==========================================
    # SLIDE 9: BAB 4 PENELITI LANGKAH 07 - 08
    # ==========================================
    s9 = create_content_slide("Bab 4 • Alur Peneliti (07-08)", "Workflow Peneliti", "4. Alur Kerja Peneliti: Tahap 07 & 08", 9)
    
    # Step 07
    s7_box = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(6.67), Inches(4.2))
    s7_box.fill.solid()
    s7_box.fill.fore_color.rgb = C_CARD_BG
    s7_box.line.color.rgb = C_OCEAN_BLUE
    t7 = s7_box.text_frame
    t7.margin_left = Inches(0.3)
    t7.margin_top = Inches(0.2)
    t7.margin_right = Inches(0.3)
    
    pt7_0 = t7.paragraphs[0]
    pt7_0.text = "LANGKAH 07 — PERHITUNGAN TEV (READ-ONLY) (/peneliti/projects/:id/calculation)"
    pt7_0.font.bold = True
    pt7_0.font.size = Pt(11)
    pt7_0.font.color.rgb = C_OCEAN_DARK

    p7_desc = t7.add_paragraph()
    p7_desc.space_before = Pt(4)
    p7_desc.text = (
        "Pusat verifikasi hasil agregasi Total Economic Value (TEV). Halaman ini bersifat Hanya-Baca "
        "(Read-Only) guna memastikan keabsahan data bahwa seluruh angka murni bersumber dari spreadsheet."
    )
    p7_desc.font.size = Pt(9)
    p7_desc.font.color.rgb = C_TEXT_DARK

    p7_features = [
        "• Hero Banner Grand TEV: Menampilkan angka nominal TEV raksasa (Rp), rata-rata/Ha, dan baris variabel.",
        "• Inspeksi Rumus Transparan: Klik 'Lihat Detail Perhitungan' untuk membuka modal breakdown formula.",
        "• Formula Terbuka: Memperlihatkan perkalian riil: Produktivitas × Luas Ha × Harga Satuan = Subtotal.",
        "• Filter Multi-Cakupan: Centang indeks/tutupan tertentu di kolom kiri untuk melihat TEV parsial kawasan.",
        "• Rekapitulasi per Area: Tabel distribusi nilai per tutupan lahan dengan fitur paginasi dan sorting."
    ]
    for f in p7_features:
        pf = t7.add_paragraph()
        pf.space_before = Pt(3)
        pf.text = f
        pf.font.size = Pt(8.5)
        pf.font.color.rgb = C_TEXT_DARK

    # Step 08
    s8_box = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.4), Inches(6.67), Inches(4.35))
    s8_box.fill.solid()
    s8_box.fill.fore_color.rgb = C_CARD_BG
    s8_box.line.color.rgb = C_OCEAN_BLUE
    t8 = s8_box.text_frame
    t8.margin_left = Inches(0.3)
    t8.margin_top = Inches(0.2)
    t8.margin_right = Inches(0.3)
    
    pt8_0 = t8.paragraphs[0]
    pt8_0.text = "LANGKAH 08 — ANALITIK VALUASI EKONOMI (/peneliti/projects/:id/analytics)"
    pt8_0.font.bold = True
    pt8_0.font.size = Pt(11)
    pt8_0.font.color.rgb = C_OCEAN_DARK

    p8_desc = t8.add_paragraph()
    p8_desc.space_before = Pt(4)
    p8_desc.text = (
        "Dasbor eksekutif yang merender visualisasi data interaktif menggunakan pustaka Recharts "
        "untuk memudahkan interpretasi rasio ekonomi kawasan bagi pengambil kebijakan."
    )
    p8_desc.font.size = Pt(9)
    p8_desc.font.color.rgb = C_TEXT_DARK

    p8_features = [
        "• Donut Pie Chart: Menampilkan proporsi rasio kontribusi 4 jasa ekosistem terhadap TEV.",
        "• Bar Chart Vertikal: Membandingkan perolehan nominal setiap metode valuasi yang digunakan.",
        "• Bar Chart Horizontal: Membandingkan kontribusi ekonomi antar area tutupan lahan (auto-agregasi).",
        "• Ringkasan Objek Terinput: Akordeon daftar biota & parameter; klik item untuk melihat modal detail.",
        "• Analitik Historis (Time-Series): Grafik garis perkembangan TEV multi-tahun jika ada data survei lalu."
    ]
    for f in p8_features:
        pf = t8.add_paragraph()
        pf.space_before = Pt(3)
        pf.text = f
        pf.font.size = Pt(8.5)
        pf.font.color.rgb = C_TEXT_DARK

    # ==========================================
    # SLIDE 10: BAB 4 PENELITI LANGKAH 09
    # ==========================================
    s10 = create_content_slide("Bab 4 • Alur Peneliti (09)", "Workflow Peneliti", "4. Alur Kerja Peneliti: Tahap 09 (Review & Laporan)", 10)
    
    rev_box = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(6.67), Inches(8.75))
    rev_box.fill.solid()
    rev_box.fill.fore_color.rgb = C_CARD_BG
    rev_box.line.color.rgb = C_OCEAN_BLUE
    tr = rev_box.text_frame
    tr.margin_left = Inches(0.3)
    tr.margin_top = Inches(0.25)
    tr.margin_right = Inches(0.3)
    
    ptr_0 = tr.paragraphs[0]
    ptr_0.text = "LANGKAH 09 — REVIEW & LAPORAN AKHIR (/peneliti/projects/:id/review)"
    ptr_0.font.bold = True
    ptr_0.font.size = Pt(11)
    ptr_0.font.color.rgb = C_OCEAN_DARK

    pr_desc = tr.add_paragraph()
    pr_desc.space_before = Pt(4)
    pr_desc.text = (
        "Kompilasi dokumen final yang menyatukan seluruh 8 langkah sebelumnya ke dalam satu dokumen "
        "ilmiah utuh 11 bagian yang siap ditinjau, dicetak resmi (PDF A4), atau diekspor ke Excel 13-sheet."
    )
    pr_desc.font.size = Pt(9)
    pr_desc.font.color.rgb = C_TEXT_DARK

    sections_11 = [
        "1. Informasi Umum Proyek (Nama, Kode, Ketua Peneliti, Wilayah, Ekosistem, Tahun)",
        "2. Seksi 01 — Index & Area Tutupan Lahan (Tabel status spasial dan luasan zonasi)",
        "3. Seksi 02 — Data Spasial & Pemetaan (Metrik spasial dan WebGIS Viewer mini)",
        "4. Seksi 03 — Data Master (Katalog biota acuan lokal yang diadopsi)",
        "5. Seksi 04 — Jasa & Metode Valuasi (Tabel konfigurasi 1 metode ilmiah per jasa)",
        "6. Seksi 05 — Data Valuasi (Tabel lengkap seluruh variabel spreadsheet A.1 Flora s.d. D Cultural)",
        "7. Seksi 06 — Perhitungan (Subtotal nominal agregasi masing-masing jasa)",
        "8. Seksi 07 — Rekapitulasi Resmi (Tabel resmi persentase kontribusi terhadap TEV)",
        "9. Seksi 08 — Analitik & Visualisasi (Pratinjau grafik distribusi dan indikator ekonomi)",
        "10. Banner Pengesahan Grand TEV (Pernyataan sah nilai moneter akhir kawasan)",
        "11. Panel Aksi Ekspor & Verifikasi Admin (Pintasan cetak, unduh Excel, dan chat admin)"
    ]
    p_sec = tr.add_paragraph()
    p_sec.space_before = Pt(6)
    p_sec.text = "STRUKTUR 11 BAGIAN LAPORAN AKHIR :"
    p_sec.font.bold = True
    p_sec.font.size = Pt(9.5)
    p_sec.font.color.rgb = C_OCEAN_DARK

    for sc in sections_11:
        psc = tr.add_paragraph()
        psc.space_before = Pt(2)
        psc.text = f"• {sc}"
        psc.font.size = Pt(8)
        psc.font.color.rgb = C_TEXT_DARK

    p_acts = tr.add_paragraph()
    p_acts.space_before = Pt(8)
    p_acts.text = "TATA CARA PENERBITAN & EKSPOR DOKUMEN :"
    p_acts.font.bold = True
    p_acts.font.size = Pt(9.5)
    p_acts.font.color.rgb = C_OCEAN_DARK

    acts = [
        "A. Cetak Dokumen Resmi PDF: Klik 'Preview Laporan' -> Tekan Ctrl+P -> Simpan PDF ukuran A4 (Centang opsi Background graphics).",
        "B. Ekspor Workbook Excel (13 Sheet): Klik 'Export Excel' -> Sistem menyusun berkas .xlsx berisi 13 sheet terstruktur lengkap.",
        "C. Konsultasi Super Admin: Klik 'Hubungi Super Admin' untuk membuka konsultasi langsung berkonteks proyek via Pusat Pesan."
    ]
    for ac in acts:
        pac = tr.add_paragraph()
        pac.space_before = Pt(2)
        pac.text = ac
        pac.font.size = Pt(8)
        pac.font.color.rgb = C_TEXT_DARK

    # ==========================================
    # SLIDE 11: BAB 5 SUPER ADMIN (BAGIAN 1)
    # ==========================================
    s11 = create_content_slide("Bab 5 • Super Admin (1)", "Konsol Global", "5. Panduan Super Admin: Dasbor & Master Data", 11)
    
    # 5.1 Dashboard
    a1_box = s11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(6.67), Inches(4.2))
    a1_box.fill.solid()
    a1_box.fill.fore_color.rgb = C_CARD_BG
    a1_box.line.color.rgb = C_PURPLE
    ta1 = a1_box.text_frame
    ta1.margin_left = Inches(0.3)
    ta1.margin_top = Inches(0.2)
    ta1.margin_right = Inches(0.3)
    
    pta1_0 = ta1.paragraphs[0]
    pta1_0.text = "5.1. DASBOR EKSEKUTIF PORTOFOLIO NASIONAL (/admin/dashboard)"
    pta1_0.font.bold = True
    pta1_0.font.size = Pt(11)
    pta1_0.font.color.rgb = C_PURPLE

    pa1_desc = ta1.add_paragraph()
    pa1_desc.space_before = Pt(4)
    pa1_desc.text = (
        "Pusat pengawasan makro valuasi ekonomi pesisir di seluruh Indonesia. Mengagregasikan akumulasi "
        "nilai TEV nasional dari seluruh proyek penelitian yang terdaftar di bawah PKSPL IPB."
    )
    pa1_desc.font.size = Pt(9)
    pa1_desc.font.color.rgb = C_TEXT_DARK

    a1_points = [
        "• 4 Kartu KPI Global: Total TEV Nasional (Rp Miliar), Total Proyek, Luas Wilayah (Ha), Pengguna Terdaftar.",
        "• Grafik Distribusi Ekosistem: Membandingkan TEV Mangrove, Terumbu Karang, Lamun, dan Estuari.",
        "• Grafik Cakupan Jasa: Donut Chart adopsi 4 pilar jasa ekosistem secara nasional.",
        "• Grafik Tren & Komparasi: ComposedChart (Area + Bar) bulanan/tahunan dengan komparasi delta nominal.",
        "• Portofolio Proyek Terkini: Tabel riset nasional dengan pencarian instan dan tombol 'Buka Modul'.",
        "• Ekspor Ringkasan Eksekutif: Unduh laporan eksekutif lengkap dengan grafik visual dalam format PDF."
    ]
    for pt in a1_points:
        ppt = ta1.add_paragraph()
        ppt.space_before = Pt(3)
        ppt.text = pt
        ppt.font.size = Pt(8.5)
        ppt.font.color.rgb = C_TEXT_DARK

    # 5.2 Master Data Global
    a2_box = s11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.4), Inches(6.67), Inches(4.35))
    a2_box.fill.solid()
    a2_box.fill.fore_color.rgb = C_CARD_BG
    a2_box.line.color.rgb = C_PURPLE
    ta2 = a2_box.text_frame
    ta2.margin_left = Inches(0.3)
    ta2.margin_top = Inches(0.2)
    ta2.margin_right = Inches(0.3)
    
    pta2_0 = ta2.paragraphs[0]
    pta2_0.text = "5.2. MASTER DATA GLOBAL STANDAR NASIONAL (/admin/master-data)"
    pta2_0.font.bold = True
    pta2_0.font.size = Pt(11)
    pta2_0.font.color.rgb = C_PURPLE

    pa2_desc = ta2.add_paragraph()
    pa2_desc.space_before = Pt(4)
    pa2_desc.text = (
        "Jantung standardisasi PKSPL. Super Admin memiliki wewenang CRUD Penuh untuk menetapkan standar "
        "harga pasar biota, upah regional, koefisien serapan karbon, dan biaya seawall seluruh Indonesia."
    )
    pa2_desc.font.size = Pt(9)
    pa2_desc.font.color.rgb = C_TEXT_DARK

    a2_points = [
        "• Filter Cascading Bertingkat: Pilih Provinsi -> Dropdown Kabupaten/Kota tersaring otomatis.",
        "• Tambah Data Baru: Klik '+ Tambah Data Master', tentukan Kategori Jasa, Wilayah, & Nilai Acuan (Rp).",
        "• Parameter Wajib: Nama Indonesia, Nama Latin, Nama Daerah, Satuan, dan Sumber Jurnal Ilmiah.",
        "• Sunting & Hapus: Ikon pensil (✏) untuk memperbarui harga pasar inflasi; ikon sampah (🗑) untuk hapus.",
        "• Integrasi Proyek: Data yang diinput di sini akan otomatis ditarik oleh Peneliti di Langkah 04 & 06."
    ]
    for pt in a2_points:
        ppt = ta2.add_paragraph()
        ppt.space_before = Pt(3)
        ppt.text = pt
        ppt.font.size = Pt(8.5)
        ppt.font.color.rgb = C_TEXT_DARK

    # ==========================================
    # SLIDE 12: BAB 5 SUPER ADMIN (BAGIAN 2)
    # ==========================================
    s12 = create_content_slide("Bab 5 • Super Admin (2)", "Konsol Global", "5. Panduan Super Admin: Pengguna & Audit Trail", 12)
    
    # 5.3 Users
    u_box = s12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(6.67), Inches(4.2))
    u_box.fill.solid()
    u_box.fill.fore_color.rgb = C_CARD_BG
    u_box.line.color.rgb = C_PURPLE
    tu = u_box.text_frame
    tu.margin_left = Inches(0.3)
    tu.margin_top = Inches(0.2)
    tu.margin_right = Inches(0.3)
    
    ptu_0 = tu.paragraphs[0]
    ptu_0.text = "5.3. MANAJEMEN PENGGUNA & HAK AKSES (/admin/users)"
    ptu_0.font.bold = True
    ptu_0.font.size = Pt(11)
    ptu_0.font.color.rgb = C_PURPLE

    pu_desc = tu.add_paragraph()
    pu_desc.space_before = Pt(4)
    pu_desc.text = (
        "Tata kelola akun seluruh staf, dosen, peneliti, dan administrator yang terdaftar di platform."
    )
    pu_desc.font.size = Pt(9)
    pu_desc.font.color.rgb = C_TEXT_DARK

    u_points = [
        "• Tambah Pengguna Baru: Klik '+ Tambah Pengguna', masukkan Nama, Email, Password, & Role Akses.",
        "• Pilihan Role Akses: Super Admin, Peneliti (Researcher), atau Guest (Tamu).",
        "• Presensi Online Real-Time: Titik hijau (Online) dan titik abu-abu (Offline) beserta waktu aktif terakhir.",
        "• Penangguhan Akun: Ubah status menjadi 'Nonaktif' untuk memblokir akses pengguna yang purna tugas.",
        "• Inspeksi Profil: Klik 'Lihat Profil' untuk memeriksa portofolio riset dan riwayat login pengguna."
    ]
    for pt in u_points:
        ppt = tu.add_paragraph()
        ppt.space_before = Pt(3)
        ppt.text = pt
        ppt.font.size = Pt(8.5)
        ppt.font.color.rgb = C_TEXT_DARK

    # 5.5 Audit
    ad_box = s12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.4), Inches(6.67), Inches(4.35))
    ad_box.fill.solid()
    ad_box.fill.fore_color.rgb = C_CARD_BG
    ad_box.line.color.rgb = C_PURPLE
    tad = ad_box.text_frame
    tad.margin_left = Inches(0.3)
    tad.margin_top = Inches(0.2)
    tad.margin_right = Inches(0.3)
    
    ptad_0 = tad.paragraphs[0]
    ptad_0.text = "5.5. RIWAYAT AKTIVITAS & AUDIT TRAIL DATA DIFF (/admin/activity)"
    ptad_0.font.bold = True
    ptad_0.font.size = Pt(11)
    ptad_0.font.color.rgb = C_PURPLE

    pad_desc = tad.add_paragraph()
    pad_desc.space_before = Pt(4)
    pad_desc.text = (
        "Pencatatan permanen setiap transaksi data (Create, Update, Delete, Import, Export, Login) "
        "untuk menjamin kepatuhan audit forensik lingkungan dan transparansi sistem."
    )
    pad_desc.font.size = Pt(9)
    pad_desc.font.color.rgb = C_TEXT_DARK

    ad_points = [
        "• Filter Multi-Kriteria: Pilah log berdasarkan Peran, Tipe Aksi, Proyek Tertentu, dan Rentang Waktu.",
        "• Forensik Jaringan: Mencatat Alamat IP pengguna, jenis peramban (User Agent), dan latensi eksekusi (ms).",
        "• Inspeksi Data Diff: Klik 'Detail' untuk melihat perbandingan Nilai Sebelum (merah) vs Sesudah (hijau).",
        "• Penyamaran Rahasia: Password, token, dan hash otomatis disamarkan demi keamanan privasi.",
        "• Ekspor PDF Audit Trail: Klik 'Ekspor Log Audit' untuk mengunduh dokumen resmi audit berseri PKSPL."
    ]
    for pt in ad_points:
        ppt = tad.add_paragraph()
        ppt.space_before = Pt(3)
        ppt.text = pt
        ppt.font.size = Pt(8.5)
        ppt.font.color.rgb = C_TEXT_DARK

    # ==========================================
    # SLIDE 13: BAB 6 MODUL KOMUNIKASI
    # ==========================================
    s13 = create_content_slide("Bab 6 • Komunikasi & Pesan", "Pusat Pesan", "6. Modul Komunikasi & Kolaborasi Real-Time", 13)
    
    msg_box = s13.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(6.67), Inches(8.75))
    msg_box.fill.solid()
    msg_box.fill.fore_color.rgb = C_CARD_BG
    msg_box.line.color.rgb = C_EMERALD
    tm = msg_box.text_frame
    tm.margin_left = Inches(0.3)
    tm.margin_top = Inches(0.25)
    tm.margin_right = Inches(0.3)
    
    ptm_0 = tm.paragraphs[0]
    ptm_0.text = "PUSAT PESAN DUA ARAH REAL-TIME (WEBSOCKET LARAVEL REVERB)"
    ptm_0.font.bold = True
    ptm_0.font.size = Pt(11)
    ptm_0.font.color.rgb = C_EMERALD

    pm_desc = tm.add_paragraph()
    pm_desc.space_before = Pt(4)
    pm_desc.text = (
        "Saluran komunikasi langsung antara Peneliti dan Super Admin di dalam peramban web tanpa reload. "
        "Berfungsi untuk konsultasi metodologi valuasi, validasi data lapangan, dan asistensi teknis."
    )
    pm_desc.font.size = Pt(9)
    pm_desc.font.color.rgb = C_TEXT_DARK

    msg_features = [
        ("1. Memulai Obrolan Baru:", "Klik tombol '+' pada daftar percakapan, pilih pengguna dari direktori PKSPL dengan indikator online, ketik pesan, lalu kirim."),
        ("2. Lampiran Berkas (Attachments):", "Klik ikon penjepit kertas (📎) untuk mengirim gambar foto habitat, berkas dokumen PDF/Word, atau arsip geospasial GIS (.zip / SHP)."),
        ("3. Edit Pesan Terkirim:", "Klik ikon titik tiga (⋮) pada pesan Anda -> pilih 'Edit' untuk membetulkan salah ketik. Pesan diberi tanda keterangan 'diedit'."),
        ("4. Hapus / Tarik Pesan:", "Klik ikon titik tiga (⋮) -> pilih 'Hapus'. Pesan ditarik dan diganti teks penanda 'Pesan telah dihapus'."),
        ("5. Tanda Baca (Read Receipts):", "Dilengkapi indikator centang ganda biru saat pesan telah dibuka dan dibaca oleh lawan bicara."),
        ("6. Indikator Mengetik (Typing):", "Menampilkan status '[Nama] sedang mengetik...' secara real-time saat lawan bicara mengetik balasan."),
        ("7. Saran Balasan Cepat (Quick Replies):", "Pilihan template balasan instan standar PKSPL untuk mempercepat respon operasional.")
    ]
    p_mf = tm.add_paragraph()
    p_mf.space_before = Pt(6)
    p_mf.text = "FITUR KUNCI MODUL PERPESANAN :"
    p_mf.font.bold = True
    p_mf.font.size = Pt(9.5)
    p_mf.font.color.rgb = C_EMERALD

    for mf_t, mf_d in msg_features:
        pmf = tm.add_paragraph()
        pmf.space_before = Pt(3)
        pmf.text = f"• {mf_t} {mf_d}"
        pmf.font.size = Pt(8)
        pmf.font.color.rgb = C_TEXT_DARK

    # ==========================================
    # SLIDE 14: BAB 7 SPESIFIKASI TEKNIS & PENUTUP
    # ==========================================
    s14 = create_content_slide("Bab 7 • Spesifikasi Teknis", "Arsitektur Sistem", "7. Spesifikasi Teknis & Integritas Arsitektur", 14)
    
    # Tech Stack Box
    tc_box = s14.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(2.0), Inches(6.67), Inches(4.3))
    tc_box.fill.solid()
    tc_box.fill.fore_color.rgb = C_CARD_BG
    tc_box.line.color.rgb = C_OCEAN_BLUE
    ttc = tc_box.text_frame
    ttc.margin_left = Inches(0.3)
    ttc.margin_top = Inches(0.2)
    ttc.margin_right = Inches(0.3)
    
    ptc_0 = ttc.paragraphs[0]
    ptc_0.text = "TUMPUKAN TEKNOLOGI (TECHNOLOGY STACK)"
    ptc_0.font.bold = True
    ptc_0.font.size = Pt(11)
    ptc_0.font.color.rgb = C_OCEAN_DARK

    stacks = [
        "• Antarmuka (Frontend)   : React 18 SPA + Vite Bundler + Tailwind CSS Framework",
        "• Backend & API Gateway  : Laravel 11 (PHP 8.2+) RESTful Architecture + Sanctum Auth",
        "• Pemetaan Spasial GIS   : Leaflet.js Engine + Shapefile Parser (CRS WGS 1984 / EPSG:4326)",
        "• Visualisasi Grafik     : Recharts SVG Interactive Graphics Library",
        "• Pusat Pesan Realtime   : Laravel Reverb Server + Pusher Protocol (WebSocket)",
        "• Pelaporan Dokumen PDF  : jsPDF + jspdf-autotable + html2canvas (A4 Portrait Standard)",
        "• Ekspor Spreadsheet     : XML Structured Custom Engine (Workbook 13-Sheet Excel .xlsx)",
        "• Infrastruktur Server   : Docker Containerized Services + Nginx Reverse Proxy"
    ]
    for stk in stacks:
        pstk = ttc.add_paragraph()
        pstk.space_before = Pt(2.5)
        pstk.text = stk
        pstk.font.size = Pt(8)
        pstk.font.color.rgb = C_TEXT_DARK

    # Security & Integrity Box
    sec_box = s14.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.5), Inches(6.67), Inches(2.3))
    sec_box.fill.solid()
    sec_box.fill.fore_color.rgb = C_CARD_BG
    sec_box.line.color.rgb = C_OCEAN_BLUE
    tsec = sec_box.text_frame
    tsec.margin_left = Inches(0.3)
    tsec.margin_top = Inches(0.18)
    tsec.margin_right = Inches(0.3)
    
    ptsec_0 = tsec.paragraphs[0]
    ptsec_0.text = "PENJAMINAN INTEGRITAS DATA & SAINS VALUASI"
    ptsec_0.font.bold = True
    ptsec_0.font.size = Pt(10)
    ptsec_0.font.color.rgb = C_OCEAN_DARK

    sec_rules = [
        "1. Single Source of Truth: Angka di Langkah 07, 08, 09, & Dasbor murni berasal dari spreadsheet 06.",
        "2. Pencegahan Double Counting: Pembatasan ketat tepat 1 metode per jasa mencegah overestimasi nilai.",
        "3. Presisi Desimal Tinggi: Variabel dihitung dengan floating-point 4 desimal sebelum pembulatan Rupiah."
    ]
    for sr in sec_rules:
        psr = tsec.add_paragraph()
        psr.space_before = Pt(2)
        psr.text = sr
        psr.font.size = Pt(8)
        psr.font.color.rgb = C_TEXT_DARK

    # Formal Institution Footer Card
    end_box = s14.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(9.0), Inches(6.67), Inches(1.8))
    end_box.fill.solid()
    end_box.fill.fore_color.rgb = C_SLATE_DARK
    end_box.line.color.rgb = C_CYAN_LIGHT
    te = end_box.text_frame
    te.margin_left = Inches(0.3)
    te.margin_top = Inches(0.2)
    
    pe1 = te.paragraphs[0]
    pe1.text = "PUSAT KAJIAN SUMBERDAYA PESISIR DAN LAUTAN (PKSPL)"
    pe1.alignment = PP_ALIGN.CENTER
    pe1.font.bold = True
    pe1.font.size = Pt(11)
    pe1.font.color.rgb = C_WHITE
    
    pe2 = te.add_paragraph()
    pe2.space_before = Pt(2)
    pe2.text = "Institut Pertanian Bogor (IPB University) • Kampus IPB Baranangsiang, Bogor 16144"
    pe2.alignment = PP_ALIGN.CENTER
    pe2.font.size = Pt(8.5)
    pe2.font.color.rgb = RGBColor(203, 213, 225)

    pe3 = te.add_paragraph()
    pe3.space_before = Pt(3)
    pe3.text = "Surel: pkspl@ipb.ac.id • Laman Resmi: pkspl.ipb.ac.id"
    pe3.alignment = PP_ALIGN.CENTER
    pe3.font.size = Pt(8.5)
    pe3.font.color.rgb = C_CYAN_LIGHT

    # Save to file
    out_filename = "Manual_Book_PKSPL.pptx"
    prs.save(out_filename)
    print(f"Presentation saved successfully as {out_filename}")

if __name__ == "__main__":
    create_manual_book_pptx()
