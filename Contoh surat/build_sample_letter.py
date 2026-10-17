import os
import shutil
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_margins(cell, top=60, bottom=60, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('w:top', top), ('w:bottom', bottom), ('w:left', left), ('w:right', right)]:
        node = OxmlElement(m)
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    for s in tcPr.xpath('w:shd'):
        tcPr.remove(s)
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    tcPr.append(shd)

def set_cell_vcenter(cell):
    tcPr = cell._tc.get_or_add_tcPr()
    for v in tcPr.xpath('w:vAlign'):
        tcPr.remove(v)
    vAlign = OxmlElement('w:vAlign')
    vAlign.set(qn('w:val'), 'center')
    tcPr.append(vAlign)

def set_row_cant_split(row):
    trPr = row._tr.get_or_add_trPr()
    cantSplit = OxmlElement('w:cantSplit')
    trPr.append(cantSplit)

def style_run(run, font_name='Arial', size_pt=10.0, bold=False, italic=False, color_rgb=(0x3B, 0x38, 0x38)):
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    if color_rgb:
        run.font.color.rgb = RGBColor(*color_rgb)

def generate_document():
    template_path = r'C:\Users\Mazmur Gusti Agung L\Documents\NBE\Template Dokumen.docx'
    target_folder = r'C:\Users\Mazmur Gusti Agung L\Documents\NBE\Contoh surat'
    out_docx_final = os.path.join(target_folder, '0002-KB-GNR-CEO-X-2026 - Surat Keputusan Direksi (Revisi Final).docx')
    out_docx_1 = os.path.join(target_folder, '0002-KB-GNR-CEO-X-2026 - Surat Keputusan Direksi (Halaman Terpisah).docx')
    out_docx_2 = os.path.join(target_folder, '0002-KB-GNR-CEO-X-2026 - Surat Keputusan Direksi Document Control.docx')

    doc = docx.Document(template_path)

    # --- 1. HEADER KOP TABLE (Halaman 2 ke atas) ---
    ht = doc.sections[0].header.tables[0]

    # Row 0: Division
    cell_div = ht.cell(0, 1)
    cell_div.paragraphs[0].text = ''
    r = cell_div.paragraphs[0].add_run('GENERAL & MANAGEMENT (GNR)')
    style_run(r, font_name='Arial', size_pt=9.5, bold=True, color_rgb=(0, 0, 0))
    cell_div.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Row 1: Document Type
    cell_cat = ht.cell(1, 1)
    cell_cat.paragraphs[0].text = ''
    r = cell_cat.paragraphs[0].add_run('KEBIJAKAN PERUSAHAAN (COMPANY POLICY / KB)')
    style_run(r, font_name='Arial', size_pt=9.5, bold=True, color_rgb=(0, 0, 0))
    cell_cat.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Row 2: Document Title
    cell_title = ht.cell(2, 1)
    cell_title.paragraphs[0].text = ''
    r = cell_title.paragraphs[0].add_run('SURAT KEPUTUSAN DIREKSI: SISTEM PENGENDALIAN DOKUMEN & TIM DCC')
    style_run(r, font_name='Arial', size_pt=9.5, bold=True, color_rgb=(0, 0, 0))
    cell_title.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Row 3: Revision, Code, Date
    c_rev = ht.cell(3, 1)
    c_rev.paragraphs[0].text = ''
    r = c_rev.paragraphs[0].add_run('Revision: 0')
    style_run(r, font_name='Arial', size_pt=8.0, bold=False, color_rgb=(0, 0, 0))
    c_rev.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    c_code = ht.cell(3, 2)
    c_code.paragraphs[0].text = ''
    r = c_code.paragraphs[0].add_run('0002-KB-GNR-CEO-X-2026')
    style_run(r, font_name='Arial', size_pt=8.0, bold=True, color_rgb=(0, 0, 0))
    c_code.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    c_date = ht.cell(3, 3)
    c_date.paragraphs[0].text = ''
    r = c_date.paragraphs[0].add_run('Date : 17 Oktober 2026')
    style_run(r, font_name='Arial', size_pt=8.0, bold=False, color_rgb=(0, 0, 0))
    c_date.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    for r_i in range(len(ht.rows)):
        for c_i in range(len(ht.columns)):
            cell = ht.cell(r_i, c_i)
            set_cell_vcenter(cell)
            set_cell_margins(cell, top=50, bottom=50, left=80, right=80)

    # --- 2. COVER PAGE (HALAMAN 1) ---
    p19 = doc.paragraphs[19]
    p19.text = ''
    r = p19.add_run('PT NIRWANA BHUMI ENERGY')
    style_run(r, font_name='Arial', size_pt=20.0, bold=True, color_rgb=(0, 0, 0))
    p19.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p19.paragraph_format.space_before = Pt(12)
    p19.paragraph_format.space_after = Pt(6)

    # P21: Judul Dokumen Cover
    p21 = doc.paragraphs[21]
    p21.text = ''
    r1 = p21.add_run('SURAT KEPUTUSAN DIREKSI\n')
    style_run(r1, font_name='Arial', size_pt=16.0, bold=True, color_rgb=(0, 0, 0))
    r2 = p21.add_run('TENTANG PENETAPAN SISTEM MANAJEMEN PENGENDALIAN DOKUMEN\nDAN PENUNJUKAN TIM DOCUMENT CONTROL CENTER (DCC)\n\n')
    style_run(r2, font_name='Arial', size_pt=11.5, bold=True, color_rgb=(0, 0, 0))
    r3 = p21.add_run('Nomor Dokumen: 0002-KB-GNR-CEO-X-2026')
    style_run(r3, font_name='Arial', size_pt=11.0, bold=True, color_rgb=(0, 51, 102))
    p21.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p21.paragraph_format.space_after = Pt(6)

    # Paragraf kosong proporsional untuk mendorong ke ujung bawah lembar cover
    # 5 paragraf kosong tinggi sedang (12pt) agar P32-P34 tepat berada di kuadran kanan bawah (y ≈ 660-680 pt)
    for p_idx in range(22, 27):
        p = doc.paragraphs[p_idx]
        p.text = ''
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = Pt(13)

    for p_idx in range(27, 32):
        p = doc.paragraphs[p_idx]
        p.text = ''
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = Pt(2)

    # --- PERBAIKAN POIN 1: Approved By, Verified By, Prepared By di UJUNG KANAN BAWAH ---
    # Gunakan left indent 3.65 inci (~5250 dxa) sehingga teks berada di sisi paling kanan lembar cover
    p32 = doc.paragraphs[32]
    p32.text = ''
    p32.paragraph_format.left_indent = Inches(3.65)
    p32.paragraph_format.space_before = Pt(0)
    p32.paragraph_format.space_after = Pt(1)
    p32.paragraph_format.line_spacing = 1.05
    r_l1 = p32.add_run('Approved by   : ')
    style_run(r_l1, font_name='Arial', size_pt=9.0, bold=True, color_rgb=(0, 0, 0))
    r_v1 = p32.add_run('Bima Satryo Hartanto\n(President Director / CEO)')
    style_run(r_v1, font_name='Arial', size_pt=9.0, bold=False, color_rgb=(0, 0, 0))

    p33 = doc.paragraphs[33]
    p33.text = ''
    p33.paragraph_format.left_indent = Inches(3.65)
    p33.paragraph_format.space_before = Pt(3)
    p33.paragraph_format.space_after = Pt(1)
    p33.paragraph_format.line_spacing = 1.05
    r_l2 = p33.add_run('Verified by    : ')
    style_run(r_l2, font_name='Arial', size_pt=9.0, bold=True, color_rgb=(0, 0, 0))
    r_v2 = p33.add_run('Dennis Raditya (Director of\nOperations & Technology / CTO)')
    style_run(r_v2, font_name='Arial', size_pt=9.0, bold=False, color_rgb=(0, 0, 0))

    p34 = doc.paragraphs[34]
    p34.text = ''
    p34.paragraph_format.left_indent = Inches(3.65)
    p34.paragraph_format.space_before = Pt(3)
    p34.paragraph_format.space_after = Pt(0)
    p34.paragraph_format.line_spacing = 1.05
    r_l3 = p34.add_run('Prepared by   : ')
    style_run(r_l3, font_name='Arial', size_pt=9.0, bold=True, color_rgb=(0, 0, 0))
    r_v3 = p34.add_run('Mazmur Gusti Agung Larosa\n(Director of Finance & Engineering / DCC Lead)')
    style_run(r_v3, font_name='Arial', size_pt=9.0, bold=False, color_rgb=(0, 0, 0))

    # P35: Explicit Page Break menutup Halaman 1 (PASTIKAN w:br type="page" ADA!)
    p35 = doc.paragraphs[35]
    p35.text = ''
    p35.add_run().add_break(WD_BREAK.PAGE)

    # --- 3. LEMBAR KEDUA (HALAMAN 2 - HANYA REVISION INDEX) ---
    # --- PERBAIKAN POIN 2: Tulisan "REVISION INDEX" DITEBALKAN (BOLD) ---
    p36 = doc.paragraphs[36]
    p36.text = ''
    r_rev = p36.add_run('REVISION INDEX')
    style_run(r_rev, font_name='Arial', size_pt=12.0, bold=True, color_rgb=(0, 0, 0))
    p36.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p36.paragraph_format.space_before = Pt(18)
    p36.paragraph_format.space_after = Pt(12)

    # Tabel Index Revisi
    t_rev = doc.tables[0]
    set_row_cant_split(t_rev.rows[0])
    set_row_cant_split(t_rev.rows[1])

    # Header row styling
    for cell in t_rev.rows[0].cells:
        set_cell_shading(cell, 'D9E1F2')
        set_cell_vcenter(cell)
        set_cell_margins(cell, top=70, bottom=70, left=90, right=90)
        for p in cell.paragraphs:
            for r in p.runs:
                style_run(r, font_name='Arial', size_pt=9.5, bold=True, color_rgb=(0, 0, 0))

    # Row 1 data
    row1 = t_rev.rows[1]
    row1.cells[0].paragraphs[0].text = '0'
    row1.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    row1.cells[1].paragraphs[0].text = '17 Oktober 2026'
    row1.cells[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    row1.cells[2].paragraphs[0].text = 'First Edition – Penetapan Sistem Manajemen Pengendalian Dokumen dan Penunjukan Tim Document Control Center (DCC) PT Nirwana Bhumi Energy'
    row1.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.LEFT

    row1.cells[3].paragraphs[0].text = 'Mazmur Gusti Agung Larosa'
    row1.cells[3].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.LEFT

    for cell in row1.cells:
        set_cell_shading(cell, 'FFFFFF')
        set_cell_vcenter(cell)
        set_cell_margins(cell, top=70, bottom=70, left=90, right=90)
        for p in cell.paragraphs:
            for r in p.runs:
                style_run(r, font_name='Arial', size_pt=9.0, bold=False, color_rgb=(0x3B, 0x38, 0x38))

    # Hapus row 2 kosong dari template jika ada
    if len(t_rev.rows) > 2:
        tr = t_rev.rows[2]._tr
        tr.getparent().remove(tr)

    # --- PERBAIKAN POIN 3: Catatan Kendali Dokumen DIHAPUS SEPENUHNYA ---
    # Bersihkan paragraf sisa di Halaman 2, lalu langsung beri Page Break ke Halaman 3 (Isi Surat)
    # Bersihkan p37 dan p38
    p37 = doc.paragraphs[37]
    p37.text = ''
    p38 = doc.paragraphs[38]
    p38.text = ''

    # Tambahkan Page Break agar Halaman 2 HANYA berisi Tabel Index Revisi
    p_pb_h2 = doc.add_paragraph()
    p_pb_h2.add_run().add_break(WD_BREAK.PAGE)

    # --- 4. ISI SURAT (HALAMAN 3: JUDUL, KONSIDERAN, DIKTUM KESATU) ---
    def add_p(text='', bold=False, italic=False, size_pt=9.5, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_before=0, space_after=2, left_indent=0, color_rgb=(0x3B, 0x38, 0x38), keep_with_next=False):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.10
        p.paragraph_format.keep_with_next = keep_with_next
        if left_indent > 0:
            p.paragraph_format.left_indent = Inches(left_indent)
        if text:
            r = p.add_run(text)
            style_run(r, font_name='Arial', size_pt=size_pt, bold=bold, italic=italic, color_rgb=color_rgb)
        return p

    # Title of Letter di Halaman 3
    add_p('SURAT KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY', bold=True, size_pt=11.0, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=2, space_after=1, color_rgb=(0, 0, 0), keep_with_next=True)
    add_p('NOMOR: 0002-KB-GNR-CEO-X-2026', bold=True, size_pt=10.0, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2, color_rgb=(0, 51, 102), keep_with_next=True)
    add_p('TENTANG', bold=True, size_pt=9.5, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=1, color_rgb=(0, 0, 0), keep_with_next=True)
    add_p('PENETAPAN SISTEM MANAJEMEN PENGENDALIAN DOKUMEN DAN PENUNJUKAN TIM DOCUMENT CONTROL CENTER (DCC)', bold=True, size_pt=10.0, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=8, color_rgb=(0, 0, 0), keep_with_next=True)

    # Opening
    add_p('DIREKSI PT NIRWANA BHUMI ENERGY,', bold=True, size_pt=9.5, space_before=2, space_after=4, color_rgb=(0, 0, 0), keep_with_next=True)

    # Menimbang
    add_p('Menimbang:', bold=True, size_pt=9.5, space_before=2, space_after=1, color_rgb=(0, 0, 0), keep_with_next=True)
    add_p('a.  bahwa dalam rangka mewujudkan standarisasi, akuntabilitas, serta keterlacakan seluruh dokumen kebijakan, prosedur operasional, instruksi kerja, dan formulir teknis di lingkungan PT Nirwana Bhumi Energy, diperlukan suatu sistem tata kelola dan kontrol dokumen yang baku dan terintegrasi;', left_indent=0.4, space_after=2)
    add_p('b.  bahwa guna menjamin kepatuhan menyeluruh terhadap standar Sistem Manajemen Terintegrasi (IMS) berbasis ISO 9001:2015, ISO 14001:2015, ISO 45001:2018, dan kualifikasi Contractor Safety Management System (CSMS) SKK Migas serta PLN, diperlukan penunjukan personel penanggung jawab pengelolaan dokumen;', left_indent=0.4, space_after=2)
    add_p('c.  bahwa berdasarkan pertimbangan sebagaimana dimaksud dalam huruf a dan b di atas, dipandang perlu untuk menetapkan Surat Keputusan Direksi tentang Penetapan Sistem Manajemen Pengendalian Dokumen dan Penunjukan Tim Document Control Center (DCC) PT Nirwana Bhumi Energy.', left_indent=0.4, space_after=4)

    # Mengingat
    add_p('Mengingat:', bold=True, size_pt=9.5, space_before=2, space_after=1, color_rgb=(0, 0, 0), keep_with_next=True)
    add_p('1.  Akta Pendirian PT Nirwana Bhumi Energy serta peraturan perundang-undangan perseroan terbatas yang berlaku;', left_indent=0.4, space_after=1.5)
    add_p('2.  Standar Internasional ISO 9001:2015 Klausul 7.5 tentang Informasi Terdokumentasi (Documented Information);', left_indent=0.4, space_after=1.5)
    add_p('3.  Pedoman Baku Contractor Safety Management System (CSMS) SKK Migas dan PT PLN (Persero);', left_indent=0.4, space_after=1.5)
    add_p('4.  Prosedur Baku No. 0001-SOP-GNR-CEO-IX-2026 (Documents and Records Control Procedure);', left_indent=0.4, space_after=1.5)
    add_p('5.  Kebijakan Manajemen Terintegrasi No. 0001-KB-GNR-CEO-X-2026.', left_indent=0.4, space_after=4)

    # MEMUTUSKAN
    add_p('MEMUTUSKAN:', bold=True, size_pt=10.0, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=4, space_after=4, color_rgb=(0, 0, 0), keep_with_next=True)

    # Menetapkan
    add_p('Menetapkan:', bold=True, size_pt=9.5, space_after=2, color_rgb=(0, 0, 0), keep_with_next=True)
    add_p('SURAT KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY TENTANG PENETAPAN SISTEM MANAJEMEN PENGENDALIAN DOKUMEN DAN PENUNJUKAN TIM DOCUMENT CONTROL CENTER (DCC).', bold=True, left_indent=0.4, space_after=4, color_rgb=(0, 0, 0), keep_with_next=True)

    # KESATU
    add_p('KESATU :', bold=True, size_pt=9.5, space_before=3, space_after=1, color_rgb=(0, 0, 0), keep_with_next=True)
    add_p('Memberlakukan secara resmi Standar Format dan Sistem Penomoran Dokumen 6 Segmen di seluruh lingkungan operasional dan kantor pusat PT Nirwana Bhumi Energy, dengan struktur baku sebagai berikut:', left_indent=0.4, space_after=2)
    add_p('[NomorUrut4Digit] - [KategoriSurat] - [Divisi] - [Pengesah] - [BulanRomawi] - [Tahun]', bold=True, left_indent=0.6, space_after=2, color_rgb=(0, 51, 102))
    add_p('Ketentuan penomoran ini bersifat unik mutlak dengan asas ketat: SATU KODE UNTUK SATU DOKUMEN (1 Kode Dokumen = 1 Dokumen Sah). Duplikasi nomor dokumen atau penggunaan nomor yang sama untuk dokumen berbeda dilarang keras oleh sistem.', left_indent=0.4, space_after=4)

    # Page Break ke Halaman 4
    p_pb_h3 = doc.add_paragraph()
    p_pb_h3.add_run().add_break(WD_BREAK.PAGE)

    # --- 5. HALAMAN 4: LANJUTAN KEPUTUSAN, TABEL TIM DCC, & TANDA TANGAN ---
    add_p('KEDUA :', bold=True, size_pt=9.5, space_before=2, space_after=2, color_rgb=(0, 0, 0), keep_with_next=True)
    add_p('Menunjuk dan menetapkan personel berikut sebagai Tim Document Control Center (DCC) PT Nirwana Bhumi Energy:', left_indent=0.4, space_after=3, keep_with_next=True)

    # Table for Tim DCC
    table_team = doc.add_table(rows=4, cols=4)
    table_team.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ['No.', 'Nama Personel', 'Jabatan Struktural', 'Peran & Tanggung Jawab DCC']
    col_widths = [Inches(0.4), Inches(1.8), Inches(1.7), Inches(2.5)]

    for c_i, name in enumerate(headers):
        cell = table_team.cell(0, c_i)
        cell.width = col_widths[c_i]
        cell.paragraphs[0].text = name
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_cell_shading(cell, 'D9E1F2')
        set_cell_vcenter(cell)
        set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
        for r in cell.paragraphs[0].runs:
            style_run(r, font_name='Arial', size_pt=8.5, bold=True, color_rgb=(0, 0, 0))

    team_data = [
        ('1.', 'Mazmur Gusti Agung Larosa', 'Direktur Keuangan & Teknik', 'Lead Document Controller & System Administrator:\nMemvalidasi naskah, registrasi kode unik, eksekusi Tombol Fix Kode, dan sinkronisasi arsip Google Drive.'),
        ('2.', 'Dennis Raditya', 'Direktur Operasional & Teknologi', 'Technical Verifier & QA Approver:\nMemeriksa kesesuaian format teknis, layout sub-pixel, serta kepatuhan standar mutu IMS & CSMS.'),
        ('3.', 'Abdul Qodir Al Jailani', 'Komisaris / IMS Lead', 'Independent Compliance Overseer:\nMengawasi audit berkala dokumen terkontrol, penomoran masa lalu (backdating), dan integritas retensi arsip.')
    ]

    for r_i, data in enumerate(team_data, start=1):
        row = table_team.rows[r_i]
        set_row_cant_split(row)
        bg = 'FFFFFF' if r_i % 2 != 0 else 'F9FBFD'
        for c_i, val in enumerate(data):
            cell = row.cells[c_i]
            cell.width = col_widths[c_i]
            cell.paragraphs[0].text = val
            cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER if c_i == 0 else WD_ALIGN_PARAGRAPH.LEFT
            set_cell_shading(cell, bg)
            set_cell_vcenter(cell)
            set_cell_margins(cell, top=50, bottom=50, left=80, right=80)
            for r in cell.paragraphs[0].runs:
                style_run(r, font_name='Arial', size_pt=8.0, bold=False, color_rgb=(0x3B, 0x38, 0x38))

    add_p(space_after=3)

    # KETIGA
    add_p('KETIGA :', bold=True, size_pt=9.5, space_before=3, space_after=1, color_rgb=(0, 0, 0), keep_with_next=True)
    add_p('Mengatur tata kelola penyimpanan dan registrasi dokumen digital perusahaan melalui fitur Tombol "Fix Kode" pada sistem web, di mana setelah kode diverifikasi dan dikunci, sistem secara otomatis mengintegrasikan dokumen ke Google Drive korporat (Folder Induk ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF) pada subfolder klasifikasi divisi masing-masing.', left_indent=0.4, space_after=3)

    # KEEMPAT
    add_p('KEEMPAT :', bold=True, size_pt=9.5, space_before=3, space_after=1, color_rgb=(0, 0, 0), keep_with_next=True)
    add_p('Menetapkan alur revisi dokumen terkontrol, di mana setiap pembaruan terhadap dokumen yang telah terbit wajib mencantumkan sufiks (-rev1, -rev2, dst.) pada berkas digital, mencatatkan alasan perubahan secara rinci pada tabel Revision Index, serta memusnahkan salinan dokumen usang (obsolete) dari peredaran kerja.', left_indent=0.4, space_after=3)

    # KELIMA
    add_p('KELIMA :', bold=True, size_pt=9.5, space_before=3, space_after=1, color_rgb=(0, 0, 0), keep_with_next=True)
    add_p('Surat Keputusan ini mulai berlaku efektif sejak tanggal ditetapkan. Apabila di kemudian hari terdapat kekeliruan atau penyesuaian regulasi industri migas/ketenagalistrikan dalam penetapannya, akan diadakan evaluasi dan perbaikan sebagaimana mestinya.', left_indent=0.4, space_after=6)

    # Closing date and location
    add_p('Ditetapkan di : Semarang / Tuban\nPada tanggal  : 17 Oktober 2026', bold=False, size_pt=9.0, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=3, keep_with_next=True)
    add_p('DIREKSI PT NIRWANA BHUMI ENERGY', bold=True, size_pt=9.5, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=4, color_rgb=(0, 0, 0), keep_with_next=True)

    # Signatures Table (3 columns)
    t_sig = doc.add_table(rows=3, cols=3)
    t_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_row_cant_split(t_sig.rows[0])
    set_row_cant_split(t_sig.rows[1])
    set_row_cant_split(t_sig.rows[2])

    sig_roles = [
        'Disetujui Oleh:\nPresident Director / CEO',
        'Diverifikasi Oleh:\nDirector of Operations & Tech (CTO)',
        'Disiapkan & Diajukan Oleh:\nDirector of Finance & Eng (CFO / DCC)'
    ]
    sig_names = [
        'BIMA SATRYO HARTANTO\nDirektur Utama',
        'DENNIS RADITYA\nDirektur Operasional',
        'MAZMUR GUSTI AGUNG LAROSA\nDirektur Keuangan & Teknik'
    ]

    # Row 0: Roles
    for c_i, role in enumerate(sig_roles):
        cell = t_sig.cell(0, c_i)
        cell.paragraphs[0].text = role
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_cell_vcenter(cell)
        set_cell_margins(cell, top=40, bottom=40, left=60, right=60)
        for r in cell.paragraphs[0].runs:
            style_run(r, font_name='Arial', size_pt=8.0, bold=True, color_rgb=(0, 0, 0))

    # Row 1: Space for signatures / stamp
    for c_i in range(3):
        cell = t_sig.cell(1, c_i)
        cell.paragraphs[0].text = '\n[ Tanda Tangan & Cap ]\n' if c_i != 0 else '\n[ Meterai Rp 10.000 ]\n[ Tanda Tangan & Cap ]\n'
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_cell_vcenter(cell)
        set_cell_margins(cell, top=50, bottom=50, left=60, right=60)
        for r in cell.paragraphs[0].runs:
            style_run(r, font_name='Arial', size_pt=7.5, italic=True, color_rgb=(0x88, 0x88, 0x88))

    # Row 2: Names
    for c_i, name in enumerate(sig_names):
        cell = t_sig.cell(2, c_i)
        cell.paragraphs[0].text = name
        cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_cell_vcenter(cell)
        set_cell_margins(cell, top=40, bottom=40, left=60, right=60)
        for r in cell.paragraphs[0].runs:
            style_run(r, font_name='Arial', size_pt=8.0, bold=True, color_rgb=(0, 0, 0))

    # Save to primary file
    doc.save(out_docx_final)
    print(f'Successfully saved: {out_docx_final}')

    for alt_path in [out_docx_1, out_docx_2]:
        try:
            doc.save(alt_path)
            print(f'Successfully saved: {alt_path}')
        except Exception as e:
            print(f'Note: {os.path.basename(alt_path)} currently in use, skipping overwrite.')

if __name__ == '__main__':
    generate_document()
