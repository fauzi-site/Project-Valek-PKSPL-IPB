import os
from pptx import Presentation
from pptx.util import Inches

def create_image_backed_pptx():
    prs = Presentation()
    
    # A4 Portrait: 8.27 in x 11.69 in (210mm x 297mm)
    prs.slide_width = Inches(8.27)
    prs.slide_height = Inches(11.69)
    blank_layout = prs.slide_layouts[6]
    
    img_dir = "Halaman_Canva"
    page_files = [
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
    
    for f in page_files:
        path = os.path.join(img_dir, f)
        if os.path.exists(path):
            slide = prs.slides.add_slide(blank_layout)
            slide.shapes.add_picture(path, 0, 0, Inches(8.27), Inches(11.69))
            print(f"Added slide: {f}")
            
    out_name = "Manual_Book_PKSPL_Presisi.pptx"
    prs.save(out_name)
    print(f"Successfully generated: {out_name}")

if __name__ == "__main__":
    create_image_backed_pptx()
