#!/usr/bin/env python3
"""
PT NIRWANA BHUMI ENERGY (NBE)
Document Control Center (DCC) & System Engineering
Engine Pemilihan Bahasa pada Backend (Python-Docx)

Membuat dokumen resmi NBE tepat 4 halaman baku sesuai:
"PANDUAN LENGKAP & PROMPT TERINTEGRASI - SISTEM WEB DOKUMEN NBE (ANTIGRAVITY IDE)"
- Halaman 1: Cover Page (Logo Centered, PT NBE, Judul SK, Nomor Dokumen, Blok Otorisasi Kanan Bawah)
- Halaman 2: Kop Resmi NBE + Tabel Revision Index (Bersih tanpa Catatan Kendali)
- Halaman 3: Permulaan Isi Surat (Menimbang, Mengingat, Diktum KESATU)
- Halaman 4: Diktum KEDUA s.d. KELIMA, Tabel Tim DCC 4-Kolom, Tempat/Tanggal, Tabel TTD 3-Kolom
Mendukung 3 Opsi Bahasa: 'id' (Bahasa Indonesia), 'en' (British English), 'bi' (Bilingual Parallel).
"""

import os
import sys
import argparse

try:
    import docx
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.oxml import OxmlElement, parse_xml
    from docx.oxml.ns import nsdecls, qn
except ImportError:
    docx = None

def set_cell_background(cell, hex_color):
    """Set background color of a docx table cell."""
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set inner cell padding in dxa."""
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def apply_a4_margins(section):
    """Set A4 page dimensions and strict margins (Left 2.2 cm, others 2.0 cm)."""
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.787)     # 2.0 cm
    section.bottom_margin = Inches(0.787)  # 2.0 cm
    section.left_margin = Inches(0.866)    # 2.2 cm
    section.right_margin = Inches(0.787)   # 2.0 cm

def build_cover_page(doc, lang, code, title, approved_by, verified_by, prepared_by):
    """Halaman 1: Cover Page dengan Logo, Judul, dan Blok Otorisasi Kanan Bawah."""
    p_comp = doc.add_paragraph()
    p_comp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_comp = p_comp.add_run("PT NIRWANA BHUMI ENERGY")
    run_comp.font.name = "Arial"
    run_comp.font.size = Pt(20.0)
    run_comp.font.bold = True
    run_comp.font.color.rgb = RGBColor(0, 0, 0)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("DOCUMENT CONTROL CENTER & INTEGRATED MANAGEMENT SYSTEMS")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(10.0)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(0, 51, 102)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(40)
    doc_heading = (
        "BOARD OF DIRECTORS' RESOLUTION" if lang == "en"
        else "SURAT KEPUTUSAN DIREKSI / BOARD OF DIRECTORS' RESOLUTION" if lang == "bi"
        else "SURAT KEPUTUSAN DIREKSI"
    )
    r_heading = p_title.add_run(doc_heading)
    r_heading.font.name = "Arial"
    r_heading.font.size = Pt(16.0)
    r_heading.font.bold = True

    p_name = doc.add_paragraph()
    p_name.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_name.paragraph_format.space_before = Pt(10)
    r_name = p_name.add_run(f"TENTANG / REGARDING: {title}")
    r_name.font.name = "Arial"
    r_name.font.size = Pt(11.5)
    r_name.font.bold = True
    r_name.font.color.rgb = RGBColor(59, 56, 56)

    p_code = doc.add_paragraph()
    p_code.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_code.paragraph_format.space_before = Pt(8)
    r_code = p_code.add_run(f"NOMOR / NUMBER: {code}")
    r_code.font.name = "Arial"
    r_code.font.size = Pt(11.0)
    r_code.font.bold = True
    r_code.font.color.rgb = RGBColor(0, 51, 102)

    # 5 paragraf kosong line spacing 12 pt untuk mendorong ke kuadran bawah
    for _ in range(5):
        p_sp = doc.add_paragraph()
        p_sp.paragraph_format.space_before = Pt(12)
        p_sp.paragraph_format.space_after = Pt(0)

    # Blok Otorisasi Ujung Kanan Bawah (left indent: 3.5 inci)
    p_app = doc.add_paragraph()
    p_app.paragraph_format.left_indent = Inches(3.5)
    p_app.paragraph_format.space_before = Pt(8)
    r1 = p_app.add_run("Approved by: ")
    r1.font.bold = True
    r1.font.size = Pt(9.5)
    r2 = p_app.add_run(f"{approved_by} (CEO)\n")
    r2.font.bold = True
    r2.font.color.rgb = RGBColor(0, 51, 102)
    r2.font.size = Pt(9.5)

    r3 = p_app.add_run("Verified by: ")
    r3.font.bold = True
    r3.font.size = Pt(9.5)
    r4 = p_app.add_run(f"{verified_by} (CTO)\n")
    r4.font.bold = True
    r4.font.color.rgb = RGBColor(0, 51, 102)
    r4.font.size = Pt(9.5)

    r5 = p_app.add_run("Prepared by: ")
    r5.font.bold = True
    r5.font.size = Pt(9.5)
    r6 = p_app.add_run(f"{prepared_by} (Lead DCC / CFO)")
    r6.font.bold = True
    r6.font.color.rgb = RGBColor(0, 51, 102)
    r6.font.size = Pt(9.5)

    # Explicit page break ke Halaman 2
    doc.add_page_break()

def build_revision_page(doc, lang, code, title, date_str, prepared_by):
    """Halaman 2: Kop Resmi NBE + Tabel Revision Index (Bersih tanpa Catatan Kendali)."""
    # Kop Table 4 baris
    kop = doc.add_table(rows=4, cols=2)
    kop.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Row 0
    kop.cell(0, 0).text = "PT NIRWANA BHUMI ENERGY\nDocument Control"
    kop.cell(0, 1).text = "INTEGRATED MANAGEMENT SYSTEMS (IMS)"
    set_cell_background(kop.cell(0, 1), "F8FAFC")

    # Row 1
    kop.cell(1, 1).text = "Standar Operasional Prosedur (SOP)"

    # Row 2
    kop.cell(2, 1).text = title

    # Row 3
    kop.cell(3, 0).text = "Revisi: 0"
    kop.cell(3, 1).text = f"{code}   |   Tanggal / Date: {date_str}"
    set_cell_background(kop.cell(3, 0), "F1F5F9")

    # Judul REVISION INDEX
    p_rev = doc.add_paragraph()
    p_rev.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_rev.paragraph_format.space_before = Pt(18)
    p_rev.paragraph_format.space_after = Pt(12)
    r_rev = p_rev.add_run("REVISION INDEX" if lang == "en" else "TABEL INDEKS REVISI (REVISION INDEX)")
    r_rev.font.name = "Arial"
    r_rev.font.size = Pt(12.0)
    r_rev.font.bold = True

    # Tabel Revision Index (4 Kolom, Header #D9E1F2)
    table = doc.add_table(rows=3, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Rev", "Date", "Description of Changes", "Prepared By"] if lang == "en" else ["Revisi", "Tanggal", "Deskripsi Perubahan", "Disusun Oleh"]
    for i, h in enumerate(headers):
        cell = table.cell(0, i)
        cell.text = h
        set_cell_background(cell, "D9E1F2")
        set_cell_margins(cell, top=70, bottom=70, left=80, right=80)

    # Row 1 data awal
    table.cell(1, 0).text = "0"
    table.cell(1, 1).text = date_str
    table.cell(1, 2).text = f"Initial Edition – Corporate Standard Document ({code})"
    table.cell(1, 3).text = prepared_by

    # Row 2 reserved
    table.cell(2, 0).text = "-"
    table.cell(2, 1).text = "-"
    table.cell(2, 2).text = "Reserved for subsequent revisions"
    table.cell(2, 3).text = "-"

    # Ringkasan singkat
    p_sum = doc.add_paragraph()
    p_sum.paragraph_format.space_before = Pt(20)
    r_sum_title = p_sum.add_run("Ringkasan & Lingkup Dokumen / Scope:\n")
    r_sum_title.font.bold = True
    r_sum_title.font.color.rgb = RGBColor(0, 51, 102)
    r_sum_body = p_sum.add_run(
        f"Dokumen resmi PT Nirwana Bhumi Energy terdaftar nomor {code}. "
        "Mematuhi 0001-SOP-GNR-CEO-IX-2026, ISO 9001, ISO 45001, dan CSMS. "
        "Satu kode terdaftar berlaku unik mutlak hanya untuk 1 dokumen saja."
    )
    r_sum_body.font.size = Pt(9.5)

    # Catatan Kendali Dokumen DITIADAKAN SEPENUHNYA
    doc.add_page_break()

def build_body_pages(doc, lang, code, title, date_str):
    """Halaman 3 & 4: Permulaan Surat, Diktum KESATU s.d. KELIMA, Tim DCC, dan TTD."""
    # HALAMAN 3
    p_sk = doc.add_paragraph()
    p_sk.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sk = p_sk.add_run("KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY")
    r_sk.font.bold = True
    r_sk.font.size = Pt(12.0)

    p_num = doc.add_paragraph()
    p_num.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_num = p_num.add_run(f"NOMOR: {code}\nTENTANG: {title}\n\nDIREKSI PT NIRWANA BHUMI ENERGY,")
    r_num.font.bold = True
    r_num.font.size = Pt(10.5)

    doc.add_paragraph("Menimbang:\n"
                      "a. bahwa dalam rangka tertib administrasi dan standardisasi dokumen NBE;\n"
                      "b. bahwa untuk menjamin kepatuhan sistem kontrol dokumen terhadap standar IMS, ISO 9001, ISO 45001, dan CSMS;\n"
                      "c. bahwa berdasarkan pertimbangan tersebut, perlu menetapkan Keputusan Direksi;\n")

    doc.add_paragraph("Mengingat:\n"
                      "1. UU No. 40 Tahun 2007 tentang Perseroan Terbatas;\n"
                      "2. Prosedur Baku Pengendalian Dokumen PT NBE (0001-SOP-GNR-CEO-IX-2026);\n"
                      "3. Manual Sistem Manajemen Terintegrasi (IMS) PT Nirwana Bhumi Energy;\n"
                      "4. Kebijakan K3LL dan Ketetapan RUPS PT Nirwana Bhumi Energy;\n")

    p_dec = doc.add_paragraph()
    p_dec.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_dec = p_dec.add_run("MEMUTUSKAN:")
    r_dec.font.bold = True
    r_dec.font.size = Pt(11.0)

    doc.add_paragraph(f"Menetapkan: KEPUTUSAN DIREKSI TENTANG {title}.\n\n"
                      "KESATU:\n"
                      "Menetapkan Standar Penomoran Dokumen Terintegrasi 6-Segmen "
                      "[NomorUrut4Digit]-[Kategori]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun] sebagai satu-satunya identitas resmi. "
                      "1 kode surat berlaku unik mutlak hanya untuk 1 dokumen saja.")

    # Explicit page break ke Halaman 4
    doc.add_page_break()

    # HALAMAN 4
    doc.add_paragraph("KEDUA:\n"
                      "Menunjuk Tim Document Control Center (DCC) PT Nirwana Bhumi Energy:")

    # Tabel Tim DCC
    dcc = doc.add_table(rows=4, cols=4)
    dcc_headers = ["No", "Nama Personel", "Jabatan Struktural", "Peran DCC"]
    for i, h in enumerate(dcc_headers):
        c = dcc.cell(0, i)
        c.text = h
        set_cell_background(c, "D9E1F2")

    dcc.cell(1, 0).text = "1"
    dcc.cell(1, 1).text = "Bima Satryo Hartanto"
    dcc.cell(1, 2).text = "Direktur Utama (CEO)"
    dcc.cell(1, 3).text = "Otorisasi & Pengesah Puncak"

    dcc.cell(2, 0).text = "2"
    dcc.cell(2, 1).text = "Dennis Raditya"
    dcc.cell(2, 2).text = "Direktur Teknik (CTO)"
    dcc.cell(2, 3).text = "Verifikator Standar Teknis"
    set_cell_background(dcc.cell(2, 0), "F9FBFD")
    set_cell_background(dcc.cell(2, 1), "F9FBFD")
    set_cell_background(dcc.cell(2, 2), "F9FBFD")
    set_cell_background(dcc.cell(2, 3), "F9FBFD")

    dcc.cell(3, 0).text = "3"
    dcc.cell(3, 1).text = "Mazmur Gusti Agung Larosa"
    dcc.cell(3, 2).text = "Direktur Keuangan (CFO) / DCC Lead"
    dcc.cell(3, 3).text = "Lead Document Controller & Cloud Register"

    doc.add_paragraph("\nKETIGA:\n"
                      "Seluruh dokumen final wajib dikunci via 'Fix Kode' dan diarsipkan ke Google Drive induk (ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF).\n\n"
                      "KEEMPAT:\n"
                      "Pembaruan dokumen wajib mengikuti alur revisi terkontrol (-rev1, obsolete mark).\n\n"
                      "KELIMA:\n"
                      "Keputusan ini berlaku sejak tanggal ditetapkan.")

    p_date = doc.add_paragraph()
    p_date.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_date.add_run(f"Ditetapkan di Semarang / Tuban, {date_str}\nPT NIRWANA BHUMI ENERGY").font.bold = True

    # Tabel TTD 3 Kolom
    ttd = doc.add_table(rows=3, cols=3)
    ttd.cell(0, 0).text = "Disetujui Oleh:\nDirektur Utama (CEO)"
    ttd.cell(0, 1).text = "Diverifikasi Oleh:\nDirektur Teknik (CTO)"
    ttd.cell(0, 2).text = "Disiapkan Oleh:\nDirektur Keuangan / Lead DCC"

    for i in range(3):
        set_cell_background(ttd.cell(0, i), "F1F5F9")
        ttd.cell(1, i).text = "[ Meterai Rp 10.000 ]\n[ Tanda Tangan & Cap ]" if i == 0 else "[ Tanda Tangan & Cap ]"

    ttd.cell(2, 0).text = "BIMA SATRYO HARTANTO"
    ttd.cell(2, 1).text = "DENNIS RADITYA"
    ttd.cell(2, 2).text = "MAZMUR GUSTI AGUNG LAROSA"

def generate_nbe_letter(target_language="id", output_docx_path=None, code=None, title=None):
    """Fungsi utama pembuatan dokumen 4 halaman resmi NBE."""
    if docx is None:
        raise RuntimeError("python-docx tidak terpasang. Jalankan: pip install python-docx")

    code = code or "0001-KB-GNR-CEO-X-2026"
    title = title or "SISTEM KONTROL DAN PENOMORAN DOKUMEN"
    output_docx_path = output_docx_path or f"{code}-{target_language.upper()}.docx"

    doc = docx.Document()
    apply_a4_margins(doc.sections[0])

    # Halaman 1 Cover
    build_cover_page(doc, target_language, code, title, "Bima Satryo Hartanto", "Dennis Raditya", "Mazmur Gusti Agung Larosa")

    # Halaman 2 Revision Index
    build_revision_page(doc, target_language, code, title, "17 Oktober 2026", "Mazmur Gusti Agung Larosa")

    # Halaman 3 & 4 Isi & TTD
    build_body_pages(doc, target_language, code, title, "17 Oktober 2026")

    doc.save(output_docx_path)
    print(f"[OK] Berhasil menghasilkan dokumen 4 halaman: {output_docx_path}")
    return output_docx_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PT NBE Document Generator Engine")
    parser.add_argument("--lang", default="id", choices=["id", "en", "bi"], help="Bahasa dokumen output")
    parser.add_argument("--code", default="0001-KB-GNR-CEO-X-2026", help="Kode dokumen 6-segmen")
    parser.add_argument("--title", default="SISTEM KONTROL DAN PENOMORAN DOKUMEN", help="Judul surat resmi")
    parser.add_argument("--out", default=None, help="Jalur file output .docx")
    args = parser.parse_args()

    out_path = generate_nbe_letter(
        target_language=args.lang,
        output_docx_path=args.out,
        code=args.code,
        title=args.title,
    )
