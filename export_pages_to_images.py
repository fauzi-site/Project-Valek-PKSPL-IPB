import os
import pymupdf

def export_pdf_to_images():
    pdf_path = "Manual_Book_PKSPL.pdf"
    output_dir = "Halaman_Canva"
    os.makedirs(output_dir, exist_ok=True)
    
    doc = pymupdf.open(pdf_path)
    total_pages = len(doc)
    print(f"Total pages in PDF: {total_pages}")
    
    page_names = [
        "Halaman_01_Cover.png",
        "Halaman_02_Daftar_Isi.png",
        "Halaman_03_Bab1_Tentang_Aplikasi.png",
        "Halaman_04_Bab2_Login_Autentikasi.png",
        "Halaman_05_Bab3_Struktur_Role_RBAC.png",
        "Halaman_06_Bab4_Peneliti_Langkah_01_02.png",
        "Halaman_07_Bab4_Peneliti_Langkah_03_04.png",
        "Halaman_08_Bab4_Peneliti_Langkah_05_06.png",
        "Halaman_09_Bab4_Peneliti_Langkah_07_08.png",
        "Halaman_10_Bab4_Peneliti_Langkah_09_Review.png",
        "Halaman_11_Bab5_Super_Admin_Dasbor_MasterData.png",
        "Halaman_12_Bab5_Super_Admin_Users_Audit.png",
        "Halaman_13_Bab6_Modul_Komunikasi_Pesan.png",
        "Halaman_14_Bab7_Spesifikasi_Teknis_Penutup.png",
    ]
    
    # 2x scale for ultra crisp quality (approx 150-200 dpi)
    zoom = 2.0
    mat = pymupdf.Matrix(zoom, zoom)
    
    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=mat, alpha=False)
        name = page_names[i] if i < len(page_names) else f"Halaman_{i+1:02d}.png"
        out_file = os.path.join(output_dir, name)
        pix.save(out_file)
        print(f"Exported: {out_file}")

if __name__ == "__main__":
    export_pdf_to_images()
