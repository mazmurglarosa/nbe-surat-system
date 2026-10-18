import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  PageBreak,
  HeightRule,
} from 'docx';
import { RevisionRecord, DocumentLanguage } from '../types';

export interface DocumentTemplateData {
  title: string;
  code: string;
  systemName?: string;
  docTypeLabel?: string;
  issueDateFormatted: string;
  issueDateFormattedEn?: string;
  revision: number;
  preparedBy: string;
  verifiedBy: string;
  approvedBy: string;
  description?: string;
  revisions: RevisionRecord[];
  bodyContent?: string;
  language?: DocumentLanguage;
}

/**
 * Membuat berkas Microsoft Word (.docx) resmi PT Nirwana Bhumi Energy
 * TEPAT 4 HALAMAN BAKU SESUAI "PANDUAN LENGKAP & PROMPT TERINTEGRASI - SISTEM WEB DOKUMEN NBE":
 * - Halaman 1: Cover Page (Logo tengah, PT NBE, Judul SK, Nomor Dokumen, Blok Otorisasi Kanan Bawah)
 * - Halaman 2: Kop Resmi NBE + Tabel Revision Index (BERSIH tanpa Catatan Kendali)
 * - Halaman 3: Permulaan Isi Surat Resmi (Konsiderans Menimbang/Mengingat, Diktum KESATU)
 * - Halaman 4: Diktum KEDUA s.d. KELIMA, Tabel Tim DCC (4 Kolom), Tempat/Tanggal, Tabel TTD 3 Kolom
 * Mendukung 3 Opsi Bahasa: 'id' (Bahasa Indonesia), 'en' (British English), 'bi' (Bilingual Parallel).
 */
export async function generateStandardNbeDocx(
  data: DocumentTemplateData
): Promise<{ blob: Blob; base64: string; dataUrl: string }> {
  const lang: DocumentLanguage = data.language || 'id';

  // Standar Margin: Kiri = 2.2 cm (1247 dxa), Kanan = 2.0 cm (1134 dxa), Atas = 2.0 cm (1134 dxa), Bawah = 2.0 cm (1134 dxa)
  const pageMargin = {
    top: 1134,
    bottom: 1134,
    left: 1247,
    right: 1134,
  };

  const borderThin = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: 'BFBFBF',
  };

  const bordersBox = {
    top: borderThin,
    bottom: borderThin,
    left: borderThin,
    right: borderThin,
  };

  const borderBlack = {
    style: BorderStyle.SINGLE,
    size: 2,
    color: '000000',
  };

  const bordersBoxBlack = {
    top: borderBlack,
    bottom: borderBlack,
    left: borderBlack,
    right: borderBlack,
  };

  const docTitle = (data.title || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN').trim().toUpperCase();
  const docCode = (data.code || '0001-KB-GNR-CEO-X-2026').trim().toUpperCase();
  const docTypeLabel = data.docTypeLabel || 'Standar Operasional Prosedur (SOP)';
  const dateStr = data.issueDateFormatted || '17 Oktober 2026';
  const dateStrEn = data.issueDateFormattedEn || '17 October 2026';

  // -------------------------------------------------------------
  // HALAMAN 2: REVISION ROWS TABLE
  // -------------------------------------------------------------
  const revisionRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 1000, type: WidthType.DXA },
          borders: bordersBox,
          shading: { fill: 'D9E1F2' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: lang === 'en' ? 'Rev' : 'Revisi',
                  bold: true,
                  size: 19,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 2200, type: WidthType.DXA },
          borders: bordersBox,
          shading: { fill: 'D9E1F2' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: lang === 'en' ? 'Date' : 'Tanggal',
                  bold: true,
                  size: 19,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 4500, type: WidthType.DXA },
          borders: bordersBox,
          shading: { fill: 'D9E1F2' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: lang === 'en' ? 'Description of Changes' : 'Deskripsi Perubahan',
                  bold: true,
                  size: 19,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 2100, type: WidthType.DXA },
          borders: bordersBox,
          shading: { fill: 'D9E1F2' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: lang === 'en' ? 'Prepared By' : 'Disusun Oleh',
                  bold: true,
                  size: 19,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];

  const effectiveRevisions =
    data.revisions && data.revisions.length > 0
      ? data.revisions
      : [
          {
            revision: data.revision || 0,
            date: lang === 'en' ? dateStrEn : dateStr,
            description:
              lang === 'en'
                ? `Initial Edition – Corporate Standard Document (${docCode})`
                : lang === 'bi'
                ? `Edisi Awal – Penerbitan Dokumen Standar / Initial Edition (${docCode})`
                : `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${docCode})`,
            revisedBy: data.preparedBy || 'Mazmur Gusti Agung Larosa',
          },
        ];

  effectiveRevisions.forEach((rev, idx) => {
    const isZebra = idx % 2 === 1;
    revisionRows.push(
      new TableRow({
        children: [
          new TableCell({
            borders: bordersBox,
            shading: isZebra ? { fill: 'F9FBFD' } : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(rev.revision), bold: true, size: 18, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            shading: isZebra ? { fill: 'F9FBFD' } : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: rev.date, size: 18, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            shading: isZebra ? { fill: 'F9FBFD' } : undefined,
            children: [
              new Paragraph({
                children: [new TextRun({ text: rev.description, size: 18, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            shading: isZebra ? { fill: 'F9FBFD' } : undefined,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: rev.revisedBy, size: 18, font: 'Arial' })],
              }),
            ],
          }),
        ],
      })
    );
  });

  // Empty row for future revision template
  revisionRows.push(
    new TableRow({
      children: [
        new TableCell({ borders: bordersBox, children: [new Paragraph({ text: '-' })] }),
        new TableCell({ borders: bordersBox, children: [new Paragraph({ text: '-' })] }),
        new TableCell({
          borders: bordersBox,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: lang === 'en' ? 'Reserved for subsequent revisions' : 'Disediakan untuk revisi selanjutnya',
                  italics: true,
                  size: 16,
                  color: '64748B',
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
        new TableCell({ borders: bordersBox, children: [new Paragraph({ text: '-' })] }),
      ],
    })
  );

  // -------------------------------------------------------------
  // HALAMAN 2: KOP RESMI NBE TABLE
  // -------------------------------------------------------------
  const kopTable = new Table({
    width: { size: 9800, type: WidthType.DXA },
    borders: bordersBoxBlack,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            rowSpan: 3,
            width: { size: 2400, type: WidthType.DXA },
            borders: bordersBoxBlack,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, after: 60 },
                children: [
                  new TextRun({
                    text: 'NBE',
                    bold: true,
                    size: 26,
                    color: '003366',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 7400, type: WidthType.DXA },
            columnSpan: 2,
            borders: bordersBoxBlack,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Integrated Management Systems',
                    size: 22,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 7400, type: WidthType.DXA },
            columnSpan: 2,
            borders: bordersBoxBlack,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: docTypeLabel || 'Procedure',
                    size: 21,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 7400, type: WidthType.DXA },
            columnSpan: 2,
            borders: bordersBoxBlack,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: docTitle.toUpperCase(),
                    bold: true,
                    size: 22,
                    color: '000000',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            borders: bordersBoxBlack,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: `Revision: ${data.revision || 0}`,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 5400, type: WidthType.DXA },
            borders: bordersBoxBlack,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Number: ${docCode}`,
                    bold: true,
                    size: 19,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2000, type: WidthType.DXA },
            borders: bordersBoxBlack,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: `Revised: ${data.revision && data.revision > 0 ? (lang === 'en' ? dateStrEn : dateStr) : '-'}`,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // -------------------------------------------------------------
  // HALAMAN 4: TIM DCC TABLE (4 Kolom, Header #D9E1F2, Alternating Fill)
  // -------------------------------------------------------------
  const dccTable = new Table({
    width: { size: 9800, type: WidthType.DXA },
    borders: bordersBox,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 700, type: WidthType.DXA },
            borders: bordersBox,
            shading: { fill: 'D9E1F2' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'No', bold: true, size: 18, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2700, type: WidthType.DXA },
            borders: bordersBox,
            shading: { fill: 'D9E1F2' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: lang === 'en' ? 'Personnel Name' : 'Nama Personel',
                    bold: true,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2800, type: WidthType.DXA },
            borders: bordersBox,
            shading: { fill: 'D9E1F2' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: lang === 'en' ? 'Structural Position' : 'Jabatan Struktural',
                    bold: true,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 3600, type: WidthType.DXA },
            borders: bordersBox,
            shading: { fill: 'D9E1F2' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: lang === 'en' ? 'DCC Role & Responsibilities' : 'Peran & Tanggung Jawab DCC',
                    bold: true,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '1', bold: true, size: 18, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                children: [new TextRun({ text: data.preparedBy || 'Mazmur Gusti Agung Larosa', bold: true, size: 18, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: lang === 'en' ? 'Director of Finance & Engineering' : 'Direktur Keuangan & Teknik',
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text:
                      lang === 'en'
                        ? 'Lead Document Controller & System Administrator: Validates manuscripts, registers unique codes, executes Fix Code, and synchronises Google Drive archives.'
                        : 'Lead Document Controller & System Administrator: Memvalidasi naskah, registrasi kode unik, eksekusi Tombol Fix Kode, dan sinkronisasi arsip Google Drive.',
                    size: 17,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: bordersBox,
            shading: { fill: 'F9FBFD' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '2', bold: true, size: 18, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            shading: { fill: 'F9FBFD' },
            children: [
              new Paragraph({
                children: [new TextRun({ text: data.verifiedBy || 'Dennis Raditya', bold: true, size: 18, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            shading: { fill: 'F9FBFD' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: lang === 'en' ? 'Director of Operations & Technology' : 'Direktur Operasional & Teknologi',
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            shading: { fill: 'F9FBFD' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text:
                      lang === 'en'
                        ? 'Technical Verifier & QA Approver: Verifies technical formatting, sub-pixel layout, and compliance with IMS & CSMS quality standards.'
                        : 'Technical Verifier & QA Approver: Memeriksa kesesuaian format teknis, layout sub-pixel, serta kepatuhan standar mutu IMS & CSMS.',
                    size: 17,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '3', bold: true, size: 18, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Abdul Qodir Al Jailani', bold: true, size: 18, font: 'Arial' }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: lang === 'en' ? 'Commissioner / IMS Lead' : 'Komisaris / IMS Lead',
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text:
                      lang === 'en'
                        ? 'Independent Compliance Overseer: Oversees periodic audits of controlled documents, backdating control, and archive retention integrity.'
                        : 'Independent Compliance Overseer: Mengawasi audit berkala dokumen terkontrol, penomoran masa lalu (backdating), dan integritas retensi arsip.',
                    size: 17,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // -------------------------------------------------------------
  // HALAMAN 4: TABEL TANDA TANGAN 3 KOLOM
  // -------------------------------------------------------------
  const signatureTable = new Table({
    width: { size: 9800, type: WidthType.DXA },
    borders: bordersBox,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 3266, type: WidthType.DXA },
            borders: bordersBox,
            shading: { fill: 'F1F5F9' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: lang === 'en' ? 'Approved By' : 'Disetujui Oleh',
                    bold: true,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: lang === 'en' ? 'President Director (CEO)' : 'Direktur Utama (CEO)',
                    size: 15,
                    color: '64748B',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 3266, type: WidthType.DXA },
            borders: bordersBox,
            shading: { fill: 'F1F5F9' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: lang === 'en' ? 'Verified By' : 'Diverifikasi Oleh',
                    bold: true,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: lang === 'en' ? 'Technical Director (CTO)' : 'Direktur Teknik (CTO)',
                    size: 15,
                    color: '64748B',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 3268, type: WidthType.DXA },
            borders: bordersBox,
            shading: { fill: 'F1F5F9' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: lang === 'en' ? 'Prepared By' : 'Disiapkan Oleh',
                    bold: true,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text:
                      lang === 'en'
                        ? 'Finance Director (CFO) / DCC Lead'
                        : 'Direktur Keuangan / Lead DCC',
                    size: 15,
                    color: '64748B',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        height: { value: 1400, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 200 },
                children: [
                  new TextRun({
                    text: '[ Meterai Rp 10.000 ]',
                    size: 15,
                    color: '94A3B8',
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80 },
                children: [
                  new TextRun({
                    text: '[ Tanda Tangan & Cap ]',
                    size: 16,
                    bold: true,
                    color: '003366',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 400 },
                children: [
                  new TextRun({
                    text: '[ Tanda Tangan & Cap ]',
                    size: 16,
                    bold: true,
                    color: '003366',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 400 },
                children: [
                  new TextRun({
                    text: '[ Tanda Tangan & Cap ]',
                    size: 16,
                    bold: true,
                    color: '003366',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: bordersBox,
            shading: { fill: 'F8FAFC' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'BIMA SATRYO HARTANTO',
                    bold: true,
                    size: 18,
                    color: '000000',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            shading: { fill: 'F8FAFC' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'DENNIS RADITYA',
                    bold: true,
                    size: 18,
                    color: '000000',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            shading: { fill: 'F8FAFC' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'MAZMUR GUSTI AGUNG LAROSA',
                    bold: true,
                    size: 18,
                    color: '000000',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // -------------------------------------------------------------
  // DOKUMEN UTAMA: 4 HALAMAN TERKONTROL
  // -------------------------------------------------------------
  const doc = new DocxDocument({
    sections: [
      {
        properties: {
          page: {
            margin: pageMargin,
          },
        },
        children: [
          // ==============================================================
          // HALAMAN 1: COVER PAGE
          // ==============================================================
          new Paragraph({ text: '', spacing: { before: 600 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'PT NIRWANA BHUMI ENERGY',
                bold: true,
                size: 40, // 20 pt
                color: '000000',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 1200 },
            children: [
              new TextRun({
                text: 'DOCUMENT CONTROL CENTER & INTEGRATED MANAGEMENT SYSTEMS',
                size: 20,
                color: '003366',
                bold: true,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 800 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? "BOARD OF DIRECTORS' RESOLUTION"
                    : lang === 'bi'
                    ? "SURAT KEPUTUSAN DIREKSI / BOARD RESOLUTION"
                    : 'SURAT KEPUTUSAN DIREKSI',
                bold: true,
                size: 32, // 16 pt
                color: '000000',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
            children: [
              new TextRun({
                text: `${lang === 'en' ? 'REGARDING:' : 'TENTANG:'} ${docTitle}`,
                bold: true,
                size: 23, // 11.5 pt
                color: '3B3838',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 1800 },
            children: [
              new TextRun({
                text: `${lang === 'en' ? 'NUMBER:' : 'NOMOR:'} ${docCode}`,
                bold: true,
                size: 22, // 11 pt
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),

          // 5 baris spacer pendorong ke kuadran bawah
          new Paragraph({ text: '', spacing: { before: 400 } }),
          new Paragraph({ text: '', spacing: { before: 400 } }),
          new Paragraph({ text: '', spacing: { before: 400 } }),
          new Paragraph({ text: '', spacing: { before: 400 } }),
          new Paragraph({ text: '', spacing: { before: 400 } }),

          // Blok Otorisasi Ujung Kanan Bawah
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `${lang === 'en' ? 'Approved by:' : 'Approved by (Disetujui):'} `,
                bold: true,
                size: 19,
                font: 'Arial',
              }),
              new TextRun({
                text: `${data.approvedBy || 'Bima Satryo Hartanto'} (CEO)`,
                bold: true,
                size: 19,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 120 },
            children: [
              new TextRun({
                text: `${lang === 'en' ? 'Verified by:' : 'Verified by (Diverifikasi):'} `,
                bold: true,
                size: 19,
                font: 'Arial',
              }),
              new TextRun({
                text: `${data.verifiedBy || 'Dennis Raditya'} (CTO)`,
                bold: true,
                size: 19,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 120 },
            children: [
              new TextRun({
                text: `${lang === 'en' ? 'Prepared by:' : 'Prepared by (Disiapkan):'} `,
                bold: true,
                size: 19,
                font: 'Arial',
              }),
              new TextRun({
                text: `${data.preparedBy || 'Mazmur Gusti Agung Larosa'} (Lead DCC / CFO)`,
                bold: true,
                size: 19,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),

          // PAGE BREAK KE HALAMAN 2
          new Paragraph({ children: [new PageBreak()] }),

          // ==============================================================
          // HALAMAN 2: REVISION INDEX (BERSIH)
          // ==============================================================
          kopTable,

          new Paragraph({
            spacing: { before: 360, after: 240 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: lang === 'en' ? 'REVISION INDEX' : 'TABEL INDEKS REVISI (REVISION INDEX)',
                bold: true,
                size: 24, // 12 pt
                color: '000000',
                font: 'Arial',
              }),
            ],
          }),

          new Table({
            width: { size: 9800, type: WidthType.DXA },
            borders: bordersBox,
            rows: revisionRows,
          }),

          new Paragraph({
            spacing: { before: 500, after: 150 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? 'Summary & Procedure Scope:'
                    : 'Ringkasan & Lingkup Pengendalian Dokumen:',
                bold: true,
                size: 20,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text:
                  data.description ||
                  (lang === 'en'
                    ? `Official document of PT Nirwana Bhumi Energy registered under code ${docCode}. Governed under the corporate Documents and Records Control Procedure (0001-SOP-GNR-CEO-IX-2026), ISO 9001, ISO 45001, and CSMS. Exactly one code strictly governs one document.`
                    : `Dokumen resmi PT Nirwana Bhumi Energy yang teregistrasi dengan kode unik ${docCode}. Diterbitkan mengacu pada Pedoman Pengendalian Dokumen dan Rekaman Baku (0001-SOP-GNR-CEO-IX-2026), standar ISO 9001, ISO 45001, dan CSMS. Satu kode terdaftar berlaku unik mutlak hanya untuk 1 dokumen sah.`),
                size: 19,
                font: 'Arial',
              }),
            ],
          }),

          // PAGE BREAK KE HALAMAN 3
          new Paragraph({ children: [new PageBreak()] }),

          // ==============================================================
          // HALAMAN 3: PERMULAAN ISI SURAT RESMI
          // ==============================================================
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? "BOARD OF DIRECTORS' RESOLUTION OF PT NIRWANA BHUMI ENERGY"
                    : lang === 'bi'
                    ? "KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY / BOARD RESOLUTION"
                    : 'KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY',
                bold: true,
                size: 24,
                color: '000000',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80 },
            children: [
              new TextRun({
                text: `${lang === 'en' ? 'NUMBER:' : 'NOMOR:'} ${docCode}`,
                bold: true,
                size: 21,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 300 },
            children: [
              new TextRun({
                text: `${lang === 'en' ? 'REGARDING:' : 'TENTANG:'} ${docTitle}`,
                bold: true,
                size: 21,
                color: '000000',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? 'THE BOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY,'
                    : 'DIREKSI PT NIRWANA BHUMI ENERGY,',
                bold: true,
                size: 22,
                font: 'Arial',
              }),
            ],
          }),

          // Menimbang / Having Considered
          new Paragraph({
            children: [
              new TextRun({
                text: lang === 'en' ? 'Having Considered:' : 'Menimbang:',
                bold: true,
                size: 20,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? 'a. that in order to establish corporate documentation standards, administrative governance, and quality assurance within PT Nirwana Bhumi Energy;'
                    : 'a. bahwa dalam rangka tertib administrasi, standardisasi persuratan, dan penjaminan mutu tata kelola dokumen di lingkungan PT Nirwana Bhumi Energy;',
                size: 19,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? 'b. that to ensure compliance with the Integrated Management System (IMS), ISO 9001, ISO 45001, and CSMS document control standards;'
                    : 'b. bahwa untuk menjamin kepatuhan sistem kontrol dokumen terhadap standar Integrated Management System (IMS), ISO 9001, ISO 45001, dan CSMS;',
                size: 19,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80, after: 200 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? `c. that in view of the considerations set forth above, it is deemed necessary to enact a Board of Directors' Resolution regarding ${docTitle};`
                    : `c. bahwa berdasarkan pertimbangan sebagaimana dimaksud dalam huruf a dan b di atas, perlu menetapkan Keputusan Direksi tentang ${docTitle};`,
                size: 19,
                font: 'Arial',
              }),
            ],
          }),

          // Mengingat / In View Of
          new Paragraph({
            children: [
              new TextRun({
                text: lang === 'en' ? 'In View Of:' : 'Mengingat:',
                bold: true,
                size: 20,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? '1. Law Number 40 of 2007 concerning Limited Liability Companies;'
                    : '1. Undang-Undang Nomor 40 Tahun 2007 tentang Perseroan Terbatas;',
                size: 19,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? '2. Documents and Records Control Procedure (0001-SOP-GNR-CEO-IX-2026);'
                    : '2. Prosedur Baku Pengendalian Dokumen PT NBE (0001-SOP-GNR-CEO-IX-2026);',
                size: 19,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? '3. Integrated Management System (IMS) Manual of PT Nirwana Bhumi Energy;'
                    : '3. Manual Sistem Manajemen Terintegrasi (IMS) PT Nirwana Bhumi Energy;',
                size: 19,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? '4. Corporate Quality, Health, Safety, and Environment (QHSE) Policy;'
                    : '4. Kebijakan Mutu, Keselamatan Kerja, dan Lindung Lingkungan (K3LL);',
                size: 19,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80, after: 260 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? '5. Articles of Association and Resolutions of General Meeting of Shareholders;'
                    : '5. Anggaran Dasar dan Ketetapan Rapat Umum Pemegang Saham (RUPS) PT Nirwana Bhumi Energy;',
                size: 19,
                font: 'Arial',
              }),
            ],
          }),

          // MEMUTUSKAN / HEREBY RESOLVES
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 150 },
            children: [
              new TextRun({
                text: lang === 'en' ? 'HEREBY RESOLVES:' : 'MEMUTUSKAN:',
                bold: true,
                size: 22,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? `To Enact: RESOLUTION OF THE BOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY REGARDING ${docTitle}.`
                    : `Menetapkan: KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY TENTANG ${docTitle}.`,
                bold: true,
                size: 20,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: lang === 'en' ? 'FIRST:' : 'KESATU:',
                bold: true,
                size: 20,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? `To establish the 6-Segment Integrated Document Numbering Standard with format [4DigitSeq]-[Category]-[Division]-[Approver]-[RomanMonth]-[Year] as the sole legal corporate identifier. Exactly one registered code applies uniquely and strictly to 1 (one) document.`
                    : `Menetapkan Standar Penomoran Dokumen Resmi Terintegrasi 6-Segmen dengan format baku [NomorUrut4Digit]-[Kategori]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun] sebagai satu-satunya identitas resmi dokumen korporat PT Nirwana Bhumi Energy. Setiap satu kode surat hanya berlaku unik mutlak untuk 1 (satu) dokumen saja dan dilarang digunakan ganda untuk dokumen lain.`,
                size: 19,
                font: 'Arial',
              }),
            ],
          }),

          // PAGE BREAK KE HALAMAN 4
          new Paragraph({ children: [new PageBreak()] }),

          // ==============================================================
          // HALAMAN 4: LANJUTAN DIKTUM, TIM DCC, & TANDA TANGAN 3 KOLOM
          // ==============================================================
          new Paragraph({
            children: [
              new TextRun({
                text: lang === 'en' ? 'SECOND:' : 'KEDUA:',
                bold: true,
                size: 20,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 80, after: 200 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? 'To appoint the Document Control Center (DCC) Team with the following personnel and organizational responsibilities:'
                    : 'Menunjuk Tim Document Control Center (DCC) PT Nirwana Bhumi Energy dengan susunan personel serta peran tanggung jawab sebagai berikut:',
                size: 19,
                font: 'Arial',
              }),
            ],
          }),

          dccTable,

          new Paragraph({
            spacing: { before: 240 },
            children: [
              new TextRun({
                text: lang === 'en' ? 'THIRD:' : 'KETIGA:',
                bold: true,
                size: 20,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? 'All finalized documents shall be locked via the "Fix Code" protocol and automatically archived into the Corporate Google Drive Document Control Center (Root Folder ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF).'
                    : 'Seluruh dokumen yang telah final wajib dikunci melalui fungsi "Fix Kode" dan diarsipkan secara otomatis ke direktori Google Drive Document Control Center (Root Folder ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF).',
                size: 18,
                font: 'Arial',
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 180 },
            children: [
              new TextRun({
                text: lang === 'en' ? 'FOURTH:' : 'KEEMPAT:',
                bold: true,
                size: 20,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? 'Any subsequent amendments shall follow the formal Revision Index workflow (-rev1, obsolete mark) and remain audited within the central register.'
                    : 'Setiap pembaruan dokumen wajib melalui alur penerbitan revisi resmi (-rev1, tanda kedaluwarsa/obsolete) dan tercatat dalam Master Register.',
                size: 18,
                font: 'Arial',
              }),
            ],
          }),

          new Paragraph({
            spacing: { before: 180 },
            children: [
              new TextRun({
                text: lang === 'en' ? 'FIFTH:' : 'KELIMA:',
                bold: true,
                size: 20,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 60, after: 240 },
            children: [
              new TextRun({
                text:
                  lang === 'en'
                    ? 'This Resolution takes effect from the date of issuance with the stipulation that any inadvertent errors shall be rectified accordingly.'
                    : 'Keputusan ini mulai berlaku sejak tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diperbaiki sebagaimana mestinya.',
                size: 18,
                font: 'Arial',
              }),
            ],
          }),

          // Tempat & Tanggal Penetapan
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `${
                  lang === 'en' ? 'Enacted in Semarang / Tuban on:' : 'Ditetapkan di Semarang / Tuban pada tanggal:'
                } ${lang === 'en' ? dateStrEn : dateStr}`,
                size: 18,
                font: 'Arial',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 40, after: 180 },
            children: [
              new TextRun({
                text: 'PT NIRWANA BHUMI ENERGY',
                bold: true,
                size: 19,
                color: '003366',
                font: 'Arial',
              }),
            ],
          }),

          // Tabel Tanda Tangan 3 Kolom
          signatureTable,
        ],
      },
    ],
  });

  const base64 = await Packer.toBase64String(doc);
  const blob = await Packer.toBlob(doc);
  const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;

  return { blob, base64, dataUrl };
}
