import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

def create_manual_book_docx():
    doc = docx.Document()
    
    # Page setup A4
    for section in doc.sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Title
    p_inst = doc.add_paragraph()
    r_inst = p_inst.add_run("PUSAT KAJIAN SUMBERDAYA PESISIR DAN LAUTAN (PKSPL) — IPB UNIVERSITY")
    r_inst.font.bold = True
    r_inst.font.size = Pt(9.5)
    r_inst.font.color.rgb = RGBColor(2, 132, 199)

    p_title = doc.add_paragraph()
    r_title = p_title.add_run("BUKU PANDUAN PENGGUNA (MANUAL BOOK)\nSistem Informasi Valuasi Jasa Ekosistem Pesisir & Lautan")
    r_title.font.bold = True
    r_title.font.size = Pt(18)
    r_title.font.color.rgb = RGBColor(15, 23, 42)

    p_meta = doc.add_paragraph()
    r_meta = p_meta.add_run("Versi 2.0 (2026) • Dokumen Panduan Resmi Sistem Valuasi PKSPL")
    r_meta.font.italic = True
    r_meta.font.size = Pt(9)
    r_meta.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph("-" * 80)

    # Read content from Guidebook_PKSPL.md and insert nicely
    md_path = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\2b1c4a94-a90a-405f-adb9-a998bfe1c5fa\\Guidebook_PKSPL.md"
    if os.path.exists(md_path):
        with open(md_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        # Skip the first few lines of markdown header
        for line in lines[4:]:
            text = line.strip()
            if not text:
                continue
            if text.startswith("## "):
                h2 = doc.add_heading(text.replace("## ", ""), level=1)
                h2.paragraph_format.space_before = Pt(14)
                h2.paragraph_format.space_after = Pt(4)
                for r in h2.runs:
                    r.font.color.rgb = RGBColor(12, 74, 110)
            elif text.startswith("### "):
                h3 = doc.add_heading(text.replace("### ", ""), level=2)
                h3.paragraph_format.space_before = Pt(10)
                h3.paragraph_format.space_after = Pt(3)
                for r in h3.runs:
                    r.font.color.rgb = RGBColor(2, 132, 199)
            elif text.startswith("#### "):
                h4 = doc.add_heading(text.replace("#### ", ""), level=3)
                h4.paragraph_format.space_before = Pt(8)
                h4.paragraph_format.space_after = Pt(2)
                for r in h4.runs:
                    r.font.color.rgb = RGBColor(30, 41, 59)
            elif text.startswith("- ") or text.startswith("* "):
                p_b = doc.add_paragraph(text[2:], style='List Bullet')
                p_b.paragraph_format.space_after = Pt(2)
                p_b.paragraph_format.line_spacing = 1.15
            else:
                p_txt = doc.add_paragraph(text)
                p_txt.paragraph_format.space_after = Pt(4)
                p_txt.paragraph_format.line_spacing = 1.15
                for r in p_txt.runs:
                    r.font.size = Pt(10)
                    r.font.name = "Calibri"

    out_docx = "Manual_Book_PKSPL.docx"
    doc.save(out_docx)
    print(f"Word document saved successfully as {out_docx}")

if __name__ == "__main__":
    create_manual_book_docx()
