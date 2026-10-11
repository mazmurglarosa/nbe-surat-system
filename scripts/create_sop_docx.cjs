const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  HeadingLevel,
  ImageRun,
} = require('docx');

// Colors matching PT Nirwana Bhumi Energi Corporate Identity
const COLOR = {
  NAVY_DARK: '0A2540',
  NAVY_LIGHT: '1E3A8A',
  ENERGY_BLUE: '0284C7',
  CYAN_TEAL: '00D4B2',
  TEXT_MAIN: '1E293B',
  TEXT_MUTED: '64748B',
  BG_LIGHT: 'F8FAFC',
  BG_CARD: 'F1F5F9',
  BG_ACCENT: 'E0F2FE',
  BG_GREEN: 'ECFDF5',
  BG_AMBER: 'FFFBEB',
  BG_ROSE: 'FFF1F2',
  BORDER: 'CBD5E1',
  BORDER_ACCENT: '38BDF8',
  SUCCESS: '10B981',
  WARNING: 'F59E0B',
  DANGER: 'EF4444',
  WHITE: 'FFFFFF',
};

// Common cell borders
const borderStandard = {
  top: { style: BorderStyle.SINGLE, size: 1, color: COLOR.BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR.BORDER },
  left: { style: BorderStyle.SINGLE, size: 1, color: COLOR.BORDER },
  right: { style: BorderStyle.SINGLE, size: 1, color: COLOR.BORDER },
};



const cellPaddingStandard = {
  top: 100, // 5pt
  bottom: 100,
  left: 140, // 7pt
  right: 140,
};



// Helper to create Header Cell
function createHeaderCell(text, widthDxa, align = AlignmentType.CENTER) {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    margins: cellPaddingStandard,
    shading: { fill: COLOR.NAVY_DARK, type: ShadingType.CLEAR },
    borders: borderStandard,
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            bold: true,
            color: COLOR.WHITE,
            size: 19, // 9.5 pt
            font: 'Arial',
          }),
        ],
      }),
    ],
  });
}

// Helper to create Data Cell
function createDataCell(
  content,
  widthDxa,
  {
    align = AlignmentType.LEFT,
    bold = false,
    color = COLOR.TEXT_MAIN,
    bg = COLOR.WHITE,
    italic = false,
    size = 19,
  } = {}
) {
  const paragraphs = Array.isArray(content)
    ? content.map((c) =>
        typeof c === 'string'
          ? new Paragraph({
              alignment: align,
              children: [
                new TextRun({
                  text: c,
                  bold,
                  italic,
                  color,
                  size,
                  font: 'Arial',
                }),
              ],
            })
          : c
      )
    : [
        new Paragraph({
          alignment: align,
          children: [
            new TextRun({
              text: String(content),
              bold,
              italic,
              color,
              size,
              font: 'Arial',
            }),
          ],
        }),
      ];

  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    margins: cellPaddingStandard,
    shading: { fill: bg, type: ShadingType.CLEAR },
    borders: borderStandard,
    children: paragraphs,
  });
}

// Helper for Section Headings
function createH1(title, number = '') {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 140 },
    children: [
      new TextRun({
        text: number ? `${number}. ` : '',
        bold: true,
        color: COLOR.ENERGY_BLUE,
        size: 30, // 15 pt
        font: 'Arial',
      }),
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        color: COLOR.NAVY_DARK,
        size: 30, // 15 pt
        font: 'Arial',
      }),
    ],
  });
}

function createH2(title, number = '') {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text: number ? `${number} ` : '',
        bold: true,
        color: COLOR.ENERGY_BLUE,
        size: 24, // 12 pt
        font: 'Arial',
      }),
      new TextRun({
        text: title,
        bold: true,
        color: COLOR.NAVY_LIGHT,
        size: 24, // 12 pt
        font: 'Arial',
      }),
    ],
  });
}

function createH3(title, number = '') {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text: number ? `${number} ` : '',
        bold: true,
        color: COLOR.ENERGY_BLUE,
        size: 21, // 10.5 pt
        font: 'Arial',
      }),
      new TextRun({
        text: title,
        bold: true,
        color: COLOR.TEXT_MAIN,
        size: 21, // 10.5 pt
        font: 'Arial',
      }),
    ],
  });
}

// Helper for standard paragraph text
function createP(text, { bold = false, italic = false, color = COLOR.TEXT_MAIN, spaceAfter = 120 } = {}) {
  return new Paragraph({
    spacing: { before: 0, after: spaceAfter, line: 260 },
    children: [
      new TextRun({
        text,
        bold,
        italic,
        color,
        size: 20, // 10 pt
        font: 'Arial',
      }),
    ],
  });
}

// Helper for rich text runs inside a paragraph
function createRichP(runs, { spaceAfter = 120, align = AlignmentType.LEFT } = {}) {
  return new Paragraph({
    alignment: align,
    spacing: { before: 0, after: spaceAfter, line: 260 },
    children: runs.map((r) =>
      new TextRun({
        text: r.text,
        bold: r.bold || false,
        italic: r.italic || false,
        color: r.color || COLOR.TEXT_MAIN,
        size: r.size || 20,
        font: r.font || 'Arial',
      })
    ),
  });
}

// Callout / Note Box
function createCalloutBox(title, bodyText, type = 'info') {
  let bg = COLOR.BG_ACCENT;
  let borderColor = COLOR.BORDER_ACCENT;
  let icon = 'ℹ️ PENTING: ';
  let titleColor = COLOR.ENERGY_BLUE;

  if (type === 'success') {
    bg = COLOR.BG_GREEN;
    borderColor = COLOR.SUCCESS;
    icon = '✅ ATURAN: ';
    titleColor = '065F46';
  } else if (type === 'warning') {
    bg = COLOR.BG_AMBER;
    borderColor = COLOR.WARNING;
    icon = '⚠️ PERINGATAN: ';
    titleColor = '92400E';
  } else if (type === 'danger') {
    bg = COLOR.BG_ROSE;
    borderColor = COLOR.DANGER;
    icon = '🛑 KETENTUAN MUTLAK: ';
    titleColor = '991B1B';
  }

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    margins: cellPaddingStandard,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: bg, type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
              left: { style: BorderStyle.SINGLE, size: 8, color: borderColor }, // Thick left border
              right: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
            },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [
                  new TextRun({
                    text: `${icon}${title}`,
                    bold: true,
                    color: titleColor,
                    size: 21,
                    font: 'Arial',
                  }),
                ],
              }),
              new Paragraph({
                spacing: { before: 0, after: 0, line: 250 },
                children: [
                  new TextRun({
                    text: bodyText,
                    color: COLOR.TEXT_MAIN,
                    size: 19,
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
}

// Flowchart Box Helper
function createFlowchartStepBox({
  stepNumber,
  stepName,
  actor,
  systemAction,
  decisionText,
  isDecision = false,
  isEnd = false,
  isStart = false,
}) {
  let bg = COLOR.BG_LIGHT;
  let borderColor = COLOR.ENERGY_BLUE;
  let titleColor = COLOR.NAVY_DARK;
  let badgeText = `LANGKAH ${stepNumber}`;

  if (isStart) {
    bg = 'E0F2FE';
    borderColor = COLOR.ENERGY_BLUE;
    badgeText = 'START / AWAL';
  } else if (isEnd) {
    bg = 'DCFCE7';
    borderColor = COLOR.SUCCESS;
    badgeText = 'FINISH / SELESAI';
    titleColor = '166534';
  } else if (isDecision) {
    bg = 'FEF3C7';
    borderColor = COLOR.WARNING;
    badgeText = 'DECISION / PERCABANGAN';
    titleColor = '92400E';
  }

  const contentParas = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: `[ ${badgeText} ]`,
          bold: true,
          size: 17,
          color: isDecision ? 'B45309' : COLOR.ENERGY_BLUE,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text: stepName,
          bold: true,
          size: 21,
          color: titleColor,
          font: 'Arial',
        }),
      ],
    }),
  ];

  if (actor) {
    contentParas.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30 },
        children: [
          new TextRun({ text: 'Pelaksana: ', bold: true, size: 18, color: COLOR.TEXT_MUTED, font: 'Arial' }),
          new TextRun({ text: actor, bold: true, size: 18, color: COLOR.TEXT_MAIN, font: 'Arial' }),
        ],
      })
    );
  }

  if (systemAction) {
    contentParas.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 30 },
        children: [
          new TextRun({ text: 'Aktivitas / Respon Sistem: ', bold: true, size: 18, color: COLOR.TEXT_MUTED, font: 'Arial' }),
          new TextRun({ text: systemAction, size: 18, color: COLOR.TEXT_MAIN, font: 'Arial' }),
        ],
      })
    );
  }

  if (decisionText) {
    contentParas.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 30, after: 0 },
        children: [
          new TextRun({ text: 'Kondisi Keputusan: ', bold: true, size: 18, color: 'B45309', font: 'Arial' }),
          new TextRun({ text: decisionText, italic: true, size: 18, color: '92400E', font: 'Arial' }),
        ],
      })
    );
  }

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9360, type: WidthType.DXA },
            shading: { fill: bg, type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: borderColor },
              left: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
              right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
            },
            margins: { top: 80, bottom: 80, left: 160, right: 160 },
            children: contentParas,
          }),
        ],
      }),
    ],
  });
}

function createFlowchartConnector(label = '▼') {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({
        text: label,
        bold: true,
        size: 26,
        color: COLOR.ENERGY_BLUE,
        font: 'Arial',
      }),
    ],
  });
}



console.log('Script initialized, compiling document contents...');

async function main() {
  // Check image buffer
  let logoImageRun = null;
  const logoPath = path.resolve(__dirname, '../public/+BG.png');
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoImageRun = new ImageRun({
      data: logoBuffer,
      transformation: { width: 140, height: 42 },
    });
  }

  // Build the Document Sections
  const doc = new Document({
    title: 'SOP, Workflow & Flowchart Sistem Penomoran & Kontrol Dokumen PT Nirwana Bhumi Energi',
    description: 'Dokumen Prosedur Standar Operasional Resmi, Matriks Alur Kerja dan Flowchart Sistem Penomoran Surat PT Nirwana Bhumi Energi',
    creator: 'Document Control Center (DCC) - PT Nirwana Bhumi Energi',
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 20, // 10 pt
            color: COLOR.TEXT_MAIN,
          },
          paragraph: {
            spacing: { line: 260 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1080, // 0.75 in
              bottom: 1080,
              left: 1080,
              right: 1080,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Table({
                width: { size: 9360, type: WidthType.DXA },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 6000, type: WidthType.DXA },
                        borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR.ENERGY_BLUE } },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: 'PT NIRWANA BHUMI ENERGI',
                                bold: true,
                                color: COLOR.ENERGY_BLUE,
                                size: 18,
                                font: 'Arial',
                              }),
                              new TextRun({
                                text: ' | Integrated Management System',
                                color: COLOR.TEXT_MUTED,
                                size: 16,
                                font: 'Arial',
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 3360, type: WidthType.DXA },
                        borders: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COLOR.ENERGY_BLUE } },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({
                                text: 'Doc No: 0001-SOP-GNR-CEO-X-2026',
                                bold: true,
                                color: COLOR.TEXT_MAIN,
                                size: 16,
                                font: 'Arial',
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Table({
                width: { size: 9360, type: WidthType.DXA },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        width: { size: 6000, type: WidthType.DXA },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1, color: COLOR.BORDER } },
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({
                                text: 'SOP Sistem Penomoran & Kontrol Dokumen | Controlled Copy',
                                italic: true,
                                size: 16,
                                color: COLOR.TEXT_MUTED,
                                font: 'Arial',
                              }),
                            ],
                          }),
                        ],
                      }),
                      new TableCell({
                        width: { size: 3360, type: WidthType.DXA },
                        borders: { top: { style: BorderStyle.SINGLE, size: 1, color: COLOR.BORDER } },
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({
                                text: 'Halaman ',
                                size: 16,
                                color: COLOR.TEXT_MUTED,
                                font: 'Arial',
                              }),
                              new TextRun({
                                children: [PageNumber.CURRENT],
                                bold: true,
                                size: 16,
                                color: COLOR.ENERGY_BLUE,
                                font: 'Arial',
                              }),
                              new TextRun({
                                text: ' dari ',
                                size: 16,
                                color: COLOR.TEXT_MUTED,
                                font: 'Arial',
                              }),
                              new TextRun({
                                children: [PageNumber.TOTAL_PAGES],
                                size: 16,
                                color: COLOR.TEXT_MUTED,
                                font: 'Arial',
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ==================== COVER / JUDUL DOKUMEN ====================
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 2800, type: WidthType.DXA },
                    borders: borderStandard,
                    margins: cellPaddingStandard,
                    shading: { fill: COLOR.WHITE, type: ShadingType.CLEAR },
                    children: [
                      logoImageRun
                        ? new Paragraph({ alignment: AlignmentType.CENTER, children: [logoImageRun] })
                        : new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: 'PT NIRWANA BHUMI ENERGI',
                                bold: true,
                                color: COLOR.ENERGY_BLUE,
                                size: 20,
                              }),
                            ],
                          }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 6560, type: WidthType.DXA },
                    borders: borderStandard,
                    margins: cellPaddingStandard,
                    shading: { fill: COLOR.BG_LIGHT, type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'STANDARD OPERATING PROCEDURE (SOP)',
                            bold: true,
                            size: 26,
                            color: COLOR.NAVY_DARK,
                            font: 'Arial',
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'SISTEM PENOMORAN & PENGENDALIAN DOKUMEN TERINTEGRASI\n(INTEGRATED DOCUMENT CONTROL & NUMBERING MANAGEMENT SYSTEM)',
                            bold: true,
                            size: 20,
                            color: COLOR.ENERGY_BLUE,
                            font: 'Arial',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // Metadata Table
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  createDataCell('Nomor Dokumen', 2340, { bold: true, bg: COLOR.BG_CARD }),
                  createDataCell('0001-SOP-GNR-CEO-X-2026', 2340, { bold: true, color: COLOR.ENERGY_BLUE }),
                  createDataCell('Status Dokumen', 2340, { bold: true, bg: COLOR.BG_CARD }),
                  createDataCell('RESMI TERKONTROL (Controlled)', 2340, { bold: true, color: COLOR.SUCCESS }),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Edisi / Revisi', 2340, { bold: true, bg: COLOR.BG_CARD }),
                  createDataCell('Rev. 00 (Penerbitan Awal)', 2340),
                  createDataCell('Tanggal Efektif', 2340, { bold: true, bg: COLOR.BG_CARD }),
                  createDataCell('10 Oktober 2026', 2340, { bold: true }),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Divisi Pemilik', 2340, { bold: true, bg: COLOR.BG_CARD }),
                  createDataCell('General & Management (GNR)', 2340),
                  createDataCell('Target Google Drive', 2340, { bold: true, bg: COLOR.BG_CARD }),
                  createDataCell('ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF', 2340, { size: 16 }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 180, after: 120 } }),

          // Lembar Pengesahan (Approval Sheet)
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'LEMBAR PENGESAHAN DOKUMEN PERUSAHAAN',
                bold: true,
                color: COLOR.NAVY_DARK,
                size: 22,
                font: 'Arial',
              }),
            ],
          }),

          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('DISIAPKAN OLEH', 3120),
                  createHeaderCell('DIPERIKSA OLEH', 3120),
                  createHeaderCell('DISETUJUI & DISAHKAN OLEH', 3120),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell(
                    [
                      'Document Controller /',
                      'Management Representative',
                      '\n\n\n_________________________',
                      'Tgl: 10 Oktober 2026',
                    ],
                    3120,
                    { align: AlignmentType.CENTER }
                  ),
                  createDataCell(
                    [
                      'Direktur Operasional (COO) &',
                      'Direktur Engineering (CTO)',
                      '\n\n\n_________________________',
                      'Tgl: 10 Oktober 2026',
                    ],
                    3120,
                    { align: AlignmentType.CENTER }
                  ),
                  createDataCell(
                    [
                      'Direktur Utama (CEO) &',
                      'Direktur Keuangan (CFO)',
                      '\n\n\n_________________________',
                      'Tgl: 10 Oktober 2026',
                    ],
                    3120,
                    { align: AlignmentType.CENTER, bold: true }
                  ),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // Riwayat Revisi Dokumen
          createH2('Catatan Riwayat Revisi Dokumen (Document History)', 'A.'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Rev', 700),
                  createHeaderCell('Tanggal', 1400),
                  createHeaderCell('Bagian Diubah', 2260),
                  createHeaderCell('Deskripsi Perubahan', 3500),
                  createHeaderCell('Disetujui', 1500),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('00', 700, { align: AlignmentType.CENTER, bold: true }),
                  createDataCell('10/10/2026', 1400, { align: AlignmentType.CENTER }),
                  createDataCell('Seluruh Dokumen', 2260),
                  createDataCell('Penerbitan awal SOP Sistem Penomoran & Kontrol Dokumen PT Nirwana Bhumi Energi berbasis Web App, Bot Google Drive, dan Alur Revisi Otomatis.', 3500),
                  createDataCell('CEO & CFO', 1500, { align: AlignmentType.CENTER, bold: true }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 300, after: 140 } }),

          // ==================== BAGIAN I: SOP ====================
          createH1('STANDARD OPERATING PROCEDURE (SOP)', 'BAGIAN I'),
          createH2('Sistem Penomoran Dokumen & Kontrol Arsip PT Nirwana Bhumi Energi', '1.'),

          createH3('1.1 TUJUAN (OBJECTIVES)'),
          createP(
            'Prosedur Operasional Standar (SOP) ini diterbitkan dengan tujuan utama:'
          ),
          createRichP([
            { text: '1. ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Menetapkan standarisasi format penomoran surat dan dokumen resmi di lingkungan PT Nirwana Bhumi Energi (NBE) agar terstruktur, seragam, dan mudah ditelusuri.\n' },
            { text: '2. ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Menjamin kepatuhan terhadap prinsip integritas data ', },
            { text: 'SATU KODE UNTUK SATU DOKUMEN (1 Kode = 1 Dokumen)', bold: true },
            { text: ' guna mencegah terjadinya duplikasi nomor dokumen atau tumpang tindih arsip.\n' },
            { text: '3. ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Mengintegrasikan penerbitan dokumen langsung ke penyimpanan awan (Google Drive) korporat secara otomatis melalui fitur ', },
            { text: 'Tombol Fix Kode', bold: true },
            { text: ' dan Bot Google Apps Script yang membuat subfolder khusus dan menyimpan berkas.\n' },
            { text: '4. ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Mengatur alur revisi dokumen terkontrol dengan penamaan otomatis berkas (contoh: ', },
            { text: '-rev1, -rev2', bold: true },
            { text: ') serta pencatatan terstruktur pada indeks revisi (Revision Index).\n' },
            { text: '5. ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Menyediakan mekanisme penataan dokumen masa lalu (backdating) tanpa merusak keabsahan nomor urut berjalan.' },
          ]),

          createH3('1.2 RUANG LINGKUP (SCOPE)'),
          createP(
            'Prosedur ini berlaku mengikat untuk seluruh unit kerja, divisi, dan jajaran manajemen di lingkungan PT Nirwana Bhumi Energi, yang mencakup:'
          ),
          createRichP([
            { text: '• Seluruh Dokumen Sistem Manajemen Terintegrasi: ', bold: true },
            { text: 'Standard Operating Procedure (SOP), Work Instruction / Instruksi Kerja (WIK), Manual Mutu & K3 (MNL), serta Kebijakan Perusahaan / Policy (KB).\n' },
            { text: '• Seluruh Divisi Operasional & Korporat: ', bold: true },
            { text: 'Divisi General/Umum (GNR), Engineering (ENG), Operation/Pembangkit (OPR), dan Finance/Keuangan (FNC).\n' },
            { text: '• Seluruh Pejabat Otoritas Pengesahan: ', bold: true },
            { text: 'President Director (CEO), Technical Director (CTO), Operational Director (COO), dan Finance Director (CFO).\n' },
            { text: '• Seluruh Media Penyimpanan Arsip: ', bold: true },
            { text: 'Aplikasi Web NBE (IndexedDB/LocalStorage), Google Drive Korporat (Folder Utama ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF), dan Salinan Fisik Terarsip.' },
          ]),

          createH3('1.3 REFERENSI & DASAR HUKUM'),
          createP('Penyusunan prosedur ini mengacu pada:'),
          createRichP([
            { text: '1. ISO 9001:2015 Klausul 7.5: ', bold: true },
            { text: 'Informasi Terdokumentasi (Documented Information - Pembuatan, Pembaruan, dan Pengendalian).\n' },
            { text: '2. Prosedur Baku Resmi PT Nirwana Bhumi Energi No: ', bold: true },
            { text: '0001-SOP-GNR-CEO-IX-2026 (Documents and Records Control Procedure).\n' },
            { text: '3. Kebijakan Manajemen Terintegrasi PT Nirwana Bhumi Energi No: ', bold: true },
            { text: '0001-KB-GNR-CEO-X-2026.' },
          ]),

          createH3('1.4 DEFINISI & TERMINOLOGI'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Istilah / Terminologi', 2800),
                  createHeaderCell('Definisi & Pengertian Operasional', 6560),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Document Control Center (DCC)', 2800, { bold: true }),
                  createDataCell('Unit atau petugas yang bertanggung jawab atas registrasi, verifikasi, penerbitan, pendistribusian, dan penarikan dokumen resmi perusahaan.', 6560),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Kode Dokumen Resmi', 2800, { bold: true }),
                  createDataCell('Identitas alfanumerik tunggal yang terdiri atas 6 segmen baku: [NomorUrut]-[Kategori]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun].', 6560),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Tombol Fix Kode', 2800, { bold: true }),
                  createDataCell('Fitur keamanan 1x klik pada sistem web yang mengunci kode dokumen, mencegah nomor dipakai pihak lain, dan secara otomatis memerintahkan Bot Google Apps Script untuk membuat subfolder baru di Google Drive perusahaan.', 6560),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Dokumen Revisi (-revX)', 2800, { bold: true }),
                  createDataCell('Pembaruan resmi terhadap dokumen yang sudah terbit, di mana kode dasar dokumen tetap sama namun berkas fisik diberi imbuhan sufiks -rev1, -rev2, dst., dan disimpan pada folder Google Drive yang sama.', 6560),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Mode Backdating (Manual)', 2800, { bold: true }),
                  createDataCell('Fasilitas otorisasi khusus untuk mendaftarkan dokumen fisik masa lampau yang telah disahkan sebelum implementasi sistem web, tanpa merusak urutan sekuensial dokumen baru.', 6560),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 200, after: 120 } }),

          createH3('1.5 TANGGUNG JAWAB & WEWENANG (RACI MATRIX)'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Peran / Jabatan', 2200),
                  createHeaderCell('Tanggung Jawab Pokok', 5160),
                  createHeaderCell('Status RACI', 2000),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Pemohon / Originator', 2200, { bold: true }),
                  createDataCell('Menyusun draf dokumen, memilih parameter kategori/divisi/pengesah di web app, mengunggah naskah final PDF.', 5160),
                  createDataCell('Responsible (R)', 2000, { align: AlignmentType.CENTER, bold: true, color: COLOR.ENERGY_BLUE }),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Document Controller (DCC)', 2200, { bold: true }),
                  createDataCell('Memvalidasi kepatuhan format, mengeksekusi Tombol Fix Kode, memastikan folder Drive terbentuk, serta mengelola master kategori dan backup data berkala.', 5160),
                  createDataCell('Accountable (A)', 2000, { align: AlignmentType.CENTER, bold: true, color: COLOR.SUCCESS }),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Direksi (CEO/CTO/COO/CFO)', 2200, { bold: true }),
                  createDataCell('Meninjau substansi teknis/operasional/keuangan serta menandatangani pengesahan dokumen sesuai ruang lingkup otoritas.', 5160),
                  createDataCell('Consulted / Approver (C/A)', 2000, { align: AlignmentType.CENTER, bold: true, color: COLOR.NAVY_LIGHT }),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Seluruh Karyawan (All Staff)', 2200, { bold: true }),
                  createDataCell('Mengakses dokumen versi terbaru yang terkontrol dan memusnahkan/tidak menggunakan salinan usang (obsolete).', 5160),
                  createDataCell('Informed (I)', 2000, { align: AlignmentType.CENTER, bold: true, color: COLOR.TEXT_MUTED }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // ==================== STANDAR PENOMORAN RESMI ====================
          createH2('Standar & Prosedur Baku Penomoran Surat PT Nirwana Bhumi Energi', '2.'),

          createH3('2.1 STRUKTUR FORMAT KODE DOKUMEN'),
          createP(
            'Seluruh dokumen resmi PT Nirwana Bhumi Energi wajib menggunakan struktur format baku 6 segmen sebagai berikut:'
          ),

          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 9360, type: WidthType.DXA },
                    shading: { fill: COLOR.NAVY_DARK, type: ShadingType.CLEAR },
                    borders: borderStandard,
                    margins: { top: 120, bottom: 120, left: 160, right: 160 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: '[NomorUrut4Digit] - [KategoriSurat] - [Divisi] - [Pengesah] - [BulanRomawi] - [Tahun]',
                            bold: true,
                            size: 24,
                            color: COLOR.CYAN_TEAL,
                            font: 'Arial',
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 60, after: 0 },
                        children: [
                          new TextRun({
                            text: 'Contoh Prosedur Baku: ',
                            color: COLOR.WHITE,
                            size: 20,
                            font: 'Arial',
                          }),
                          new TextRun({
                            text: '0001-SOP-GNR-CEO-X-2026',
                            bold: true,
                            color: 'FDE047', // Yellow accent
                            size: 22,
                            font: 'Arial',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 140, after: 100 } }),

          createH3('2.2 DEKOMPOSISI SETIAP SEGMEN KODE'),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Segmen', 1400),
                  createHeaderCell('Unsur Kode', 1960),
                  createHeaderCell('Ketentuan & Penjelasan Teknis', 6000),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Segmen 1', 1400, { bold: true, align: AlignmentType.CENTER }),
                  createDataCell('Nomor Urut 4 Digit (0001, 0002, ...)', 1960, { bold: true }),
                  createDataCell('Dihitung otomatis dan sekuensial PER KATEGORI SURAT (Document Type). Contoh: SOP memiliki urutan sendiri (0001-SOP, 0002-SOP), WIK memiliki urutan sendiri (0001-WIK, dst).', 6000),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Segmen 2', 1400, { bold: true, align: AlignmentType.CENTER }),
                  createDataCell('Kategori Dokumen (Doc Type)', 1960, { bold: true, color: COLOR.ENERGY_BLUE }),
                  createDataCell('Kode jenis dokumen baku:\n• SOP: Standard Operating Procedure\n• WIK: Work Instruction (Instruksi Kerja)\n• MNL: Manual (Pedoman Sistem)\n• KB: Kebijakan Perusahaan (Company Policy)', 6000),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Segmen 3', 1400, { bold: true, align: AlignmentType.CENTER }),
                  createDataCell('Divisi Penerbit (Division)', 1960, { bold: true }),
                  createDataCell('Kode divisi penerbit dokumen:\n• GNR: General (Manajemen & Umum)\n• ENG: Engineering (Teknik & Desain)\n• OPR: Operation (Operasional & Lapangan)\n• FNC: Finance (Keuangan & Akuntansi)', 6000),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Segmen 4', 1400, { bold: true, align: AlignmentType.CENTER }),
                  createDataCell('Otoritas Pengesah (Approver)', 1960, { bold: true }),
                  createDataCell('Kode jabatan direksi yang mengesahkan:\n• CEO: President Director (Direktur Utama)\n• CTO: Technical Director (Direktur Teknik)\n• COO: Operational Director (Direktur Operasional)\n• CFO: Finance Director (Direktur Keuangan)', 6000),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Segmen 5', 1400, { bold: true, align: AlignmentType.CENTER }),
                  createDataCell('Bulan Penerbitan (Romawi)', 1960, { bold: true }),
                  createDataCell('Bulan otomatis terkonversi ke angka Romawi berdasarkan tanggal penerbitan dokumen: I (Januari), II (Februari), III (Maret), IV (April), V (Mei), VI (Juni), VII (Juli), VIII (Agustus), IX (September), X (Oktober), XI (November), XII (Desember).', 6000),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('Segmen 6', 1400, { bold: true, align: AlignmentType.CENTER }),
                  createDataCell('Tahun Penerbitan (4 Digit)', 1960, { bold: true }),
                  createDataCell('Tahun kalender masehi 4 digit sesuai tanggal penetapan surat (misal: 2026).', 6000),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 180, after: 120 } }),

          createCalloutBox(
            'ATURAN KETAT UNIK: 1 KODE DOKUMEN = 1 DOKUMEN SAJA',
            'Satu kode dokumen HANYA boleh berlaku untuk 1 dokumen saja di seluruh sistem PT Nirwana Bhumi Energi. Sistem secara otomatis memverifikasi keunikan kode. Jika kode terdeteksi telah terdaftar sebelumnya, sistem akan memblokir tombol pendaftaran dan menampilkan peringatan dokumen duplikat beserta detail dokumen pemilik aslinya.',
            'danger'
          ),

          new Paragraph({ spacing: { before: 180, after: 120 } }),

          // ==================== FITUR TOMBOL FIX KODE ====================
          createH2('Kebijakan Tombol "Fix Kode" (1x Klik) & Auto-Folder Google Drive', '3.'),
          createP(
            'Untuk memastikan kepastian penomoran sebelum dokumen final didistribusikan, sistem dilengkapi mekanisme Tombol "Fix Kode" dengan tata kelola sebagai berikut:'
          ),

          createRichP([
            { text: '1. Aturan Klik Tunggal (1x Klik): ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Tombol "Fix Kode" yang terletak di samping tombol "Copy Kode" HANYA BISA DIKLIK 1 KALI per setiap kode dokumen baru.\n' },
            { text: '2. Penguncian Status Otomatis: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Saat tombol Fix diklik, tombol seketika terkunci (disabled) dan berubah label menjadi ' },
            { text: '"Fix Terkunci"', bold: true, color: COLOR.SUCCESS },
            { text: ' dengan aksen warna hijau.\n' },
            { text: '3. Pemanggilan Otomatis Google Apps Script Bot: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Sistem web secara otomatis mengirimkan sinyal ke Webhook Bot dengan parameter ' },
            { text: 'action: "create_folder"', bold: true },
            { text: ' dan nama folder sesuai kode surat.\n' },
            { text: '4. Pembuatan Subfolder Google Drive: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Bot secara otomatis membuat subfolder baru di dalam Folder Utama Perusahaan (Target Folder ID: ' },
            { text: '1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF', bold: true },
            { text: ') dengan nama persis sesuai kode surat tersebut.\n' },
            { text: '5. Penyimpanan ID & URL Folder: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Sistem menangkap ID dan tautan folder Google Drive yang dikembalikan bot dan menautkannya ke dokumen.\n' },
            { text: '6. Notifikasi & Tautan Cepat: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Muncul banner hijau notifikasi sukses dengan tautan langsung ' },
            { text: '"Buka Folder Drive"', bold: true },
            { text: ' sehingga pengguna dapat langsung meninjau folder tersebut.\n' },
            { text: '7. Reset Dinamis Terkendali: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Jika pengguna mengubah salah satu parameter (kategori, divisi, approver, bulan, atau tahun) sehingga menghasilkan kode surat baru, tombol Fix akan aktif kembali secara otomatis khusus untuk kode baru tersebut.' },
          ]),

          new Paragraph({ spacing: { before: 180, after: 120 } }),

          // ==================== REVISI DOKUMEN ====================
          createH2('Prosedur Revisi Dokumen Terkendali & Penamaan Otomatis (-revX)', '4.'),
          createP(
            'Dokumen yang telah diterbitkan dan memerlukan penyesuaian wajib mengikuti tata cara revisi terkontrol sebagai berikut:'
          ),

          createRichP([
            { text: '1. Akses Tombol Revisi: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Tombol ' },
            { text: '"Revisi"', bold: true, color: COLOR.WARNING },
            { text: ' tersedia secara mencolok di setiap baris dokumen pada Dashboard, Tabel Dokumen Desktop, Kartu Mobile, dan Modal Rincian Dokumen.\n' },
            { text: '2. Modal Unggah Dokumen Revisi: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Saat tombol Revisi ditekan, sistem membuka modal terdedikasi yang berisi formulir unggah berkas revisi (drag & drop), input tanggal revisi, nama perevisi, dan catatan ringkasan revisi.\n' },
            { text: '3. Penamaan Otomatis Berkas (-rev1, -rev2, dst): ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Sistem secara otomatis mengubah nama berkas yang diunggah menjadi format baku: ' },
            { text: '[KodeSurat]-rev1.pdf', bold: true, color: COLOR.ENERGY_BLUE },
            { text: ' untuk revisi pertama, ' },
            { text: '[KodeSurat]-rev2.pdf', bold: true, color: COLOR.ENERGY_BLUE },
            { text: ' untuk revisi kedua, dan seterusnya.\n' },
            { text: '4. Penyimpanan ke Subfolder yang Sama di Google Drive: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Berkas revisi otomatis diunggah dan disimpan langsung ke dalam ' },
            { text: 'folder Google Drive yang SAMA', bold: true },
            { text: ' dengan berkas surat aslinya, sehingga seluruh riwayat versi dokumen tersimpan rapi dalam satu wadah arsip.\n' },
            { text: '5. Pembaruan Status & Indeks Revisi: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Sistem memperbarui nomor revisi dokumen (menjadi Rev 1, Rev 2, dst.), memperbarui tautan berkas utama ke versi terbaru, dan mencatat entri riwayat ke dalam tabel ' },
            { text: '"Revision Index"', bold: true },
            { text: ' yang berisi tanggal, nama perevisi, dan deskripsi perubahan.' },
          ]),

          new Paragraph({ spacing: { before: 180, after: 120 } }),

          // ==================== PENGHAPUSAN DOKUMEN & RETENSI ====================
          createH2('Prosedur Penghapusan Dokumen & Retensi Arsip Google Drive', '5.'),
          createP(
            'Untuk menjaga kerapian basis data sekaligus mencegah hilangnya data penting secara sepihak, penghapusan dokumen diatur sebagai berikut:'
          ),
          createRichP([
            { text: '• Konfirmasi Berlapis: ', bold: true },
            { text: 'Penghapusan hanya dapat dilakukan oleh pengguna yang memiliki otoritas dan wajib mengonfirmasi dialog peringatan.\n' },
            { text: '• Sinkronisasi Sampah Google Drive (setTrashed): ', bold: true },
            { text: 'Saat dokumen dihapus dari sistem, Bot Google Apps Script otomatis memindahkan subfolder surat beserta seluruh berkas di dalamnya ke ' },
            { text: 'Tempat Sampah Google Drive (setTrashed = true)', bold: true, color: COLOR.DANGER },
            { text: ' sehingga berkas tidak lagi tampil di folder aktif namun masih dapat dipulihkan oleh administrator jika terjadi kekeliruan.\n' },
            { text: '• Audit Trail Permanen: ', bold: true },
            { text: 'Setiap aksi penghapusan dokumen dicatat secara permanen di menu "Log Aktivitas & Audit Trail" lengkap dengan nama pelaku, tanggal, dan kode dokumen yang dihapus.' },
          ]),

          new Paragraph({ spacing: { before: 300, after: 140 } }),

          // ==================== BAGIAN II: WORKFLOW ====================
          createH1('WORKFLOW OPERASIONAL & MATRIKS ALUR KERJA', 'BAGIAN II'),
          createH2('Matriks Alur Kerja Pengendalian Dokumen PT Nirwana Bhumi Energi', '1.'),
          createP(
            'Tabel berikut menyajikan matriks alur kerja komprehensif mulai dari inisiasi draf hingga pengarsipan cloud dan revisi dokumen:'
          ),

          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Fase / Siklus', 1400),
                  createHeaderCell('Aktivitas Rinci', 2600),
                  createHeaderCell('Pelaksana', 1360),
                  createHeaderCell('Input Masukan', 1800),
                  createHeaderCell('Output / Hasil', 2200),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('1. Inisiasi Draf', 1400, { bold: true }),
                  createDataCell('Penyusunan naskah dokumen sesuai template standar NBE, penentuan kategori, divisi, dan pejabat pengesah.', 2600),
                  createDataCell('Originator (Pemohon)', 1360),
                  createDataCell('Konsep Kebijakan / SOP / Instruksi Kerja', 1800),
                  createDataCell('Draf Dokumen Final (PDF/Word)', 2200),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('2. Penomoran Sistem', 1400, { bold: true }),
                  createDataCell('Membuka Web App NBE > Memilih Document Type > Memilih Division > Memilih Approver > Memeriksa Kode Tergenerate.', 2600),
                  createDataCell('Document Controller / Originator', 1360),
                  createDataCell('Parameter Surat & Tanggal Efektif', 1800),
                  createDataCell('Kode Dokumen Resmi Tergenerate (cth: 0001-SOP-GNR-CEO-X-2026)', 2200, { bold: true, color: COLOR.ENERGY_BLUE }),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('3. Penguncian Kode', 1400, { bold: true }),
                  createDataCell('Menekan tombol "Fix Kode" (1x klik) > Sistem mengunci kode > Bot membuat subfolder di Google Drive korporat.', 2600),
                  createDataCell('Document Controller / Originator', 1360),
                  createDataCell('Kode Surat Aktif', 1800),
                  createDataCell('Status "Fix Terkunci" + Subfolder Google Drive ID & URL', 2200, { bold: true, color: COLOR.SUCCESS }),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('4. Registrasi & Upload', 1400, { bold: true }),
                  createDataCell('Mengunggah naskah PDF final > Mengisi Judul, Ringkasan, & Nama Pembuat > Menyimpan Dokumen ke Database.', 2600),
                  createDataCell('Document Controller', 1360),
                  createDataCell('Berkas Fisik / PDF & Metadata Surat', 1800),
                  createDataCell('Dokumen Resmi Terdaftar di Sistem + Berkas Terunggah di Folder Drive', 2200),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('5. Pengesahan & Distribusi', 1400, { bold: true }),
                  createDataCell('Penandatanganan oleh Direksi (CEO/CTO/COO/CFO) > Publikasi salinan resmi terkontrol kepada pihak terkait.', 2600),
                  createDataCell('Direksi & DCC', 1360),
                  createDataCell('Dokumen Terdaftar', 1800),
                  createDataCell('Dokumen Resmi Bertanda Tangan (Effective Document)', 2200),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('6. Siklus Revisi (-revX)', 1400, { bold: true }),
                  createDataCell('Menekan tombol "Revisi" > Mengunggah berkas revisi baru > Sistem auto-rename ke [Kode]-rev1.pdf > Upload ke folder Drive yang sama > Catat Revision Index.', 2600),
                  createDataCell('Originator & DCC', 1360),
                  createDataCell('Berkas Revisi Baru + Catatan Perubahan', 1800),
                  createDataCell('Dokumen Terupdate (Rev 1), Arsip Riwayat Lengkap', 2200, { bold: true, color: COLOR.WARNING }),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('7. Retensi / Hapus', 1400, { bold: true }),
                  createDataCell('Penghapusan dokumen usang/batal > Bot otomatis memindahkan subfolder dan berkas ke sampah Drive > Log audit tercatat.', 2600),
                  createDataCell('DCC / Administrator', 1360),
                  createDataCell('Instruksi Pembatalan Dokumen', 1800),
                  createDataCell('Folder di Trash Google Drive + Catatan Audit Trail', 2200, { bold: true, color: COLOR.DANGER }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 200, after: 120 } }),

          // Workflow Naratif Rinci
          createH2('Rincian Langkah Kerja (Detailed Operational Steps)', '2.'),
          createH3('Workflow A: Penerbitan & Penomoran Dokumen Baru'),
          createRichP([
            { text: 'Langkah 1: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Buka aplikasi web Sistem Penomoran & Kontrol Dokumen PT Nirwana Bhumi Energi.\n' },
            { text: 'Langkah 2: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Pilih menu "Daftarkan Surat Baru" pada sidebar eksekutif.\n' },
            { text: 'Langkah 3: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Langkah 1 Form: Pilih Kategori Dokumen (SOP / WIK / MNL / KB), Divisi Penerbit (GNR / ENG / OPR / FNC), dan Otoritas Pengesah (CEO / CTO / COO / CFO).\n' },
            { text: 'Langkah 4: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Langkah 2 Form: Tentukan Tanggal Surat. Sistem secara otomatis mengonversi bulan ke angka Romawi dan menetapkan tahun berjalan.\n' },
            { text: 'Langkah 5: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Periksa Live Code Display. Pastikan tidak ada peringatan duplikasi. Gunakan tombol "Copy Kode" jika ingin menyalin kode ke clipboard.\n' },
            { text: 'Langkah 6: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Klik tombol "Fix Kode". Sistem mengunci tombol menjadi "Fix Terkunci", memanggil Bot Google Apps Script, membuat subfolder baru bernama kode tersebut di Google Drive perusahaan, dan menampilkan banner notifikasi sukses.\n' },
            { text: 'Langkah 7: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Langkah 3 Form: Isi Judul Dokumen, Nama Pembuat / Pengaju, Ringkasan Isi Surat, dan unggah berkas fisik (PDF).\n' },
            { text: 'Langkah 8: ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Klik tombol "Daftarkan & Simpan Dokumen Resmi". Berkas otomatis diunggah ke subfolder Google Drive yang baru dibuat, dokumen tersimpan ke IndexedDB/LocalStorage, dan aksi dicatat ke Log Aktivitas.' },
          ]),

          new Paragraph({ spacing: { before: 140, after: 100 } }),

          createH3('Workflow B: Pelaksanaan Revisi Dokumen Terkendali (-revX)'),
          createRichP([
            { text: 'Langkah 1: ', bold: true, color: COLOR.WARNING },
            { text: 'Identifikasi dokumen yang memerlukan revisi melalui Dashboard atau Menu Pencarian Dokumen.\n' },
            { text: 'Langkah 2: ', bold: true, color: COLOR.WARNING },
            { text: 'Klik tombol "Revisi" (berwarna kuning/oranye) pada baris dokumen atau modal detail.\n' },
            { text: 'Langkah 3: ', bold: true, color: COLOR.WARNING },
            { text: 'Pada modal "Unggah Dokumen Revisi", unggah berkas revisi baru (format PDF/Docx).\n' },
            { text: 'Langkah 4: ', bold: true, color: COLOR.WARNING },
            { text: 'Sistem secara otomatis mengubah nama berkas menjadi ' },
            { text: '[KodeSurat]-rev1.pdf', bold: true },
            { text: ' (atau nomor revisi selanjutnya jika sudah pernah direvisi).\n' },
            { text: 'Langkah 5: ', bold: true, color: COLOR.WARNING },
            { text: 'Isi Tanggal Revisi, Nama Perevisi, dan Catatan Rinci Perubahan yang dilakukan.\n' },
            { text: 'Langkah 6: ', bold: true, color: COLOR.WARNING },
            { text: 'Klik tombol "Simpan & Terapkan Revisi". Berkas revisi diunggah ke subfolder Google Drive yang SAMA dengan berkas aslinya. Sistem memperbarui nomor revisi dokumen dan menambahkan entri ke tabel "Revision Index".' },
          ]),

          new Paragraph({ spacing: { before: 300, after: 140 } }),

          // ==================== BAGIAN III: FLOWCHART ====================
          createH1('DIAGRAM ALIR PROSES (FLOWCHART)', 'BAGIAN III'),
          createH2('Standar Simbol & Notasi Flowchart', '1.'),
          createP(
            'Diagram alir di bawah ini menggunakan standar notasi internasional (ANSI / ISO 5807) dengan perincian simbol sebagai berikut:'
          ),

          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Simbol / Bentuk', 2000),
                  createHeaderCell('Nama Simbol', 2200),
                  createHeaderCell('Fungsi & Makna dalam Sistem Penomoran NBE', 5160),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('[ START / END ]', 2000, { bold: true, align: AlignmentType.CENTER, color: COLOR.ENERGY_BLUE }),
                  createDataCell('Terminator', 2200, { bold: true }),
                  createDataCell('Menandai titik awal dan titik akhir dari suatu siklus prosedur operasional.', 5160),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('[ PROSES / AKSI ]', 2000, { bold: true, align: AlignmentType.CENTER }),
                  createDataCell('Process Block', 2200, { bold: true }),
                  createDataCell('Aktivitas operasional, perhitungan nomor urut sekuensial, konversi Romawi, penyimpanan basis data, atau pengunggahan berkas.', 5160),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('< KEPUTUSAN ? >', 2000, { bold: true, align: AlignmentType.CENTER, color: COLOR.WARNING }),
                  createDataCell('Decision Block', 2200, { bold: true }),
                  createDataCell('Titik percabangan logika (misal: Apakah kode duplikat? Apakah tombol Fix sudah diklik? Apakah mode manual aktif?).', 5160),
                ],
              }),
              new TableRow({
                children: [
                  createDataCell('(( CLOUD / BOT ))', 2000, { bold: true, align: AlignmentType.CENTER, color: COLOR.SUCCESS }),
                  createDataCell('External Webhook / Storage', 2200, { bold: true }),
                  createDataCell('Integrasi eksternal Bot Google Apps Script, pembuatan folder Google Drive, dan pengarsipan cloud.', 5160),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // FLOWCHART 1
          createH2('Flowchart 1: Alur Pembuatan & Penomoran Dokumen Baru', '2.'),
          createP(
            'Berikut adalah representasi diagram alir proses lengkap untuk penerbitan dan penomoran dokumen baru:'
          ),

          createFlowchartStepBox({
            stepNumber: '1.0',
            stepName: 'MULAI: INISIASI DOKUMEN BARU',
            actor: 'Originator / Document Controller',
            systemAction: 'Pengguna mengakses halaman web "Daftarkan Surat Baru".',
            isStart: true,
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '1.1',
            stepName: 'PEMILIHAN PARAMETER SURAT',
            actor: 'Originator / DCC',
            systemAction: 'Pilih Kategori Dokumen (Doc Type) -> Pilih Divisi (Division) -> Pilih Otoritas Pengesah (Approver) -> Tentukan Tanggal Surat.',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '1.2',
            stepName: 'AUTO-GENERATE KODE DOKUMEN',
            actor: 'Engine Sistem Web NBE',
            systemAction: 'Hitung Nomor Urut 4-digit berikutnya (0001, 0002, ...) + Konversi Bulan ke Angka Romawi (I-XII) + Tetapkan Tahun.',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '1.3',
            stepName: 'VALIDASI KEUNIKAN KODE: APAKAH KODE DUPLIKAT?',
            actor: 'Engine Sistem Web NBE',
            systemAction: 'Mengecek basis data lokal (IndexedDB) dan cloud: apakah kode sudah dipakai oleh dokumen lain?',
            decisionText: 'Jika DUPLIKAT: Tampilkan peringatan merah & blokir pendaftaran. Jika UNIK (VALID): Lanjut ke langkah 1.4.',
            isDecision: true,
          }),

          createFlowchartConnector('▼ [JIKA KODE UNIK / VALID]'),

          createFlowchartStepBox({
            stepNumber: '1.4',
            stepName: 'EKSEKUSI TOMBOL "FIX KODE" (1x KLIK)',
            actor: 'Document Controller / Originator',
            systemAction: 'Klik tombol "Fix Kode". Tombol langsung terkunci (disabled) dan berubah label menjadi "Fix Terkunci" berwarna hijau.',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '1.5',
            stepName: 'PEMANGGILAN BOT GOOGLE APPS SCRIPT (CREATE_FOLDER)',
            actor: 'Bot Webhook Google Apps Script',
            systemAction: 'Bot menerima request action: "create_folder" -> Membuat subfolder baru dengan nama [KodeSurat] di Target Folder 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF -> Mengembalikan Folder ID & URL.',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '1.6',
            stepName: 'PENGISIAN METADATA & UPLOAD BERKAS FISIK',
            actor: 'Originator / DCC',
            systemAction: 'Input Judul Dokumen, Pembuat, Ringkasan, dan unggah berkas PDF final ke sistem.',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '1.7',
            stepName: 'SIMPAN DOKUMEN & AUTO-UPLOAD KE GOOGLE DRIVE',
            actor: 'Engine Web NBE & Bot Drive',
            systemAction: 'Berkas PDF otomatis diunggah ke subfolder Google Drive yang baru dibuat -> Data dokumen disimpan ke IndexedDB & LocalStorage -> Log aktivitas dicatat.',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '1.8',
            stepName: 'SELESAI: DOKUMEN RESMI TERDAFTAR & TERKONTROL',
            actor: 'Document Controller',
            systemAction: 'Tampil banner notifikasi sukses dengan tautan langsung "Buka Folder Drive" dan "Buka File". Dokumen aktif terdaftar di Dashboard.',
            isEnd: true,
          }),

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // FLOWCHART 2
          createH2('Flowchart 2: Alur Siklus Revisi Dokumen (-revX)', '3.'),
          createP(
            'Berikut adalah representasi diagram alir proses lengkap untuk pelaksanaan revisi dokumen terkontrol:'
          ),

          createFlowchartStepBox({
            stepNumber: '2.0',
            stepName: 'MULAI: KEBUTUHAN REVISI DOKUMEN',
            actor: 'Originator / Dept Head',
            systemAction: 'Adanya perubahan prosedur, pembaruan regulasi, atau penyesuaian proses operasional.',
            isStart: true,
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '2.1',
            stepName: 'PILIH DOKUMEN & KLIK TOMBOL "REVISI"',
            actor: 'Document Controller / Originator',
            systemAction: 'Buka Dashboard / Tabel Dokumen -> Temukan dokumen sasaran -> Klik tombol "Revisi" (kuning/oranye).',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '2.2',
            stepName: 'FORMULIR UNGGAH REVISI & CATATAN PERUBAHAN',
            actor: 'Originator / DCC',
            systemAction: 'Sistem menampilkan modal "Unggah Dokumen Revisi" -> Pengguna mengunggah naskah revisi baru, mengisi Tanggal Revisi, Nama Perevisi, dan Catatan Revisi.',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '2.3',
            stepName: 'AUTO-RENAME BERKAS: [KodeSurat]-revX.pdf',
            actor: 'Engine Sistem Web NBE',
            systemAction: 'Sistem secara otomatis mengubah nama berkas yang diunggah menjadi format: [KodeSurat]-rev1.pdf (atau -rev2, -rev3, dst.).',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '2.4',
            stepName: 'UNGGAH BERKAS REVISI KE SUBFOLDER DRIVE YANG SAMA',
            actor: 'Bot Webhook Google Apps Script',
            systemAction: 'Bot mengunggah berkas revisi baru langsung ke dalam subfolder Google Drive yang SAMA dengan dokumen aslinya.',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '2.5',
            stepName: 'PEMBARUAN STATUS DOKUMEN & REVISION INDEX',
            actor: 'Engine Sistem Web NBE',
            systemAction: 'Update nomor revisi dokumen (menjadi Rev 1) -> Catat entri riwayat ke tabel "Revision Index" -> Catat log audit revisi.',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '2.6',
            stepName: 'SELESAI: DOKUMEN REVISI AKTIF & SALINAN LAMA SUPERSEDED',
            actor: 'Document Controller',
            systemAction: 'Dokumen revisi resmi berlaku. Dokumen lama otomatis berstatus usang (superseded/obsolete).',
            isEnd: true,
          }),

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // FLOWCHART 3
          createH2('Flowchart 3: Alur Penghapusan Dokumen & Retensi Drive Trash', '4.'),
          createP(
            'Berikut adalah representasi diagram alir proses untuk penghapusan dokumen dan sinkronisasi Google Drive:'
          ),

          createFlowchartStepBox({
            stepNumber: '3.0',
            stepName: 'MULAI: PERMINTAAN PENGHAPUSAN DOKUMEN',
            actor: 'Authorized DCC / Manajemen',
            systemAction: 'Dokumen dibatalkan atau terbukti salah pendaftaran.',
            isStart: true,
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '3.1',
            stepName: 'KONFIRMASI KEAMANAN PENGHAPUSAN',
            actor: 'Pengguna Berwenang',
            systemAction: 'Sistem memunculkan dialog konfirmasi: "Apakah Anda yakin ingin menghapus surat ini beserta seluruh berkas di Google Drive?"',
            isDecision: true,
            decisionText: 'Jika Dibatalkan: Kembali ke daftar. Jika Dikonfirmasi: Lanjut ke langkah 3.2.',
          }),

          createFlowchartConnector('▼ [JIKA DIKONFIRMASI]'),

          createFlowchartStepBox({
            stepNumber: '3.2',
            stepName: 'PEMANGGILAN BOT DRIVE (ACTION: "DELETE")',
            actor: 'Bot Webhook Google Apps Script',
            systemAction: 'Sistem mengirim instruksi delete ke bot -> Bot mengeksekusi DriveApp.getFolderById(folderId).setTrashed(true) -> Memindahkan subfolder beserta seluruh berkas ke Sampah Google Drive.',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '3.3',
            stepName: 'PENGHAPUSAN DATA DARI BASIS DATA SISTEM',
            actor: 'Engine Sistem Web NBE',
            systemAction: 'Hapus record dokumen dari IndexedDB dan LocalStorage.',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '3.4',
            stepName: 'PEREKAMAN AUDIT TRAIL PERMANEN',
            actor: 'Engine Sistem Web NBE',
            systemAction: 'Mencatat entri pada Log Aktivitas: Nama pengguna, tanggal, kode dokumen, dan keterangan "Penghapusan Surat & Folder Drive".',
          }),

          createFlowchartConnector(),

          createFlowchartStepBox({
            stepNumber: '3.5',
            stepName: 'SELESAI: PENGHAPUSAN BERSIH & TERDOKUMENTASI',
            actor: 'Document Controller',
            systemAction: 'Daftar dokumen diperbarui. Data fisik aman di sampah cloud untuk kemungkinan pemulihan darurat.',
            isEnd: true,
          }),

          new Paragraph({ spacing: { before: 300, after: 140 } }),

          // ==================== BAGIAN IV: LAMPIRAN TEKNIS ====================
          createH1('LAMPIRAN TEKNIS & INTEGRASI BOT GOOGLE DRIVE', 'BAGIAN IV'),
          createH2('Script Bot Google Apps Script Siap Pakai', '1.'),
          createP(
            'Kode skrip Google Apps Script di bawah ini merupakan kode resmi siap salin untuk dipasang pada Google Apps Script Web App perusahaan. Skrip ini menangani tiga aksi utama: create_folder, upload, dan delete:'
          ),

          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 9360, type: WidthType.DXA },
                    shading: { fill: '0F172A', type: ShadingType.CLEAR },
                    borders: borderStandard,
                    margins: { top: 120, bottom: 120, left: 160, right: 160 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `/**
 * BOT GOOGLE DRIVE - PT NIRWANA BHUMI ENERGI (NBE)
 * Target Folder ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF
 */
var TARGET_FOLDER_ID = "1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // AKSI 1: BUAT SUBFOLDER BARU (TOMBOL FIX KODE)
    if (data.action === "create_folder") {
      var folderName = data.folderName || data.documentCode || "Dokumen_NBE";
      var parentFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
      var existing = parentFolder.getFoldersByName(folderName);
      var targetFolder = existing.hasNext() ? existing.next() : parentFolder.createFolder(folderName);
      targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        folderId: targetFolder.getId(),
        folderUrl: targetFolder.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // AKSI 2: HAPUS SURAT & FOLDER (PINDAH KE SAMPAH)
    if (data.action === "delete") {
      if (data.folderId && data.folderId !== TARGET_FOLDER_ID) {
        DriveApp.getFolderById(data.folderId).setTrashed(true);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // AKSI 3: UPLOAD BERKAS (AWAL & REVISI -rev1, -rev2, dst)
    var folder = DriveApp.getFolderById(data.folderId || TARGET_FOLDER_ID);
    var fileName = data.fileName || "dokumen.pdf";
    if (data.isRevision && data.documentCode) {
      fileName = data.documentCode + "-rev" + (data.revision || 1) + ".pdf";
    }

    var blob = Utilities.newBlob(Utilities.base64Decode(data.base64), data.mimeType || "application/pdf", fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      fileId: file.getId(),
      viewUrl: file.getUrl()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`,
                            size: 16,
                            color: '38BDF8',
                            font: 'Courier New',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 180, after: 120 } }),

          createH2('Panduan Penerapan (Deployment) Web App Google Apps Script', '2.'),
          createRichP([
            { text: '1. ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Buka Google Drive perusahaan dengan akun yang memiliki hak akses terhadap Target Folder ID ' },
            { text: '1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF', bold: true },
            { text: '.\n' },
            { text: '2. ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Buka script.google.com dan buat proyek baru dengan judul "Bot Google Drive NBE".\n' },
            { text: '3. ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Salin seluruh kode script pada Bagian 1 di atas dan tempelkan ke editor Code.gs.\n' },
            { text: '4. ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Klik Deploy > New Deployment > Pilih tipe "Web app".\n' },
            { text: '5. ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Konfigurasi Deployment:\n' },
            { text: '   • Execute as: "Me" (akun pemilik Google Drive)\n' },
            { text: '   • Who has access: "Anyone" (agar aplikasi web NBE dapat mengirim data via Webhook)\n' },
            { text: '6. ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Klik Deploy, izinkan perizinan akun (Authorize Access), lalu salin URL Web App yang dihasilkan.\n' },
            { text: '7. ', bold: true, color: COLOR.ENERGY_BLUE },
            { text: 'Buka Web App NBE > Klik tombol "Bot Google Drive" di navbar atas > Masukkan URL Web App ke kolom "URL Webhook Google Apps Script" > Klik "Tes Koneksi Bot" > Klik "Simpan Pengaturan".' },
          ]),

          new Paragraph({ spacing: { before: 240, after: 120 } }),

          // Master Prompt
          createH2('Master Prompt Replikasi Sistem Penomoran & Kontrol Dokumen NBE', '3.'),
          createP(
            'Berikut adalah Master Prompt lengkap yang dapat digunakan untuk mereplikasi atau memperluas aplikasi web di lingkungan Antigravity IDE baru:'
          ),

          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 9360, type: WidthType.DXA },
                    shading: { fill: COLOR.BG_LIGHT, type: ShadingType.CLEAR },
                    borders: borderStandard,
                    margins: { top: 120, bottom: 120, left: 160, right: 160 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Buatkan aplikasi web lengkap "Sistem Penomoran & Kontrol Dokumen PT Nirwana Bhumi Energi (NBE)" berbasis React 19, TypeScript, dan Vite dengan estetika modern, responsif, dan kaya fitur tanpa error linter.

### 1. STANDAR PENOMORAN SURAT RESMI (NBE PROCEDURE):
Format penomoran: [NomorUrut4Digit]-[KategoriSurat]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun]
Contoh: 0001-SOP-GNR-CEO-X-2026 (mengacu pada prosedur baku PT Nirwana Bhumi Energi).
- Nomor urut 4 digit (0001, 0002, ...) dihitung otomatis dan sekuensial per Kategori Surat (Document Type).
- Bulan otomatis terkonversi ke angka Romawi (I s/d XII) berdasarkan tanggal surat, dan tahun otomatis sesuai tahun berjalan.
- Kategori bawaan: SOP (Standard Operating Procedure), WIK (Work Instruction), MNL (Manual), KB (Policy).
- Divisi bawaan: GNR (General), ENG (Engineering), OPR (Operation), FNC (Finance).
- Pengesah bawaan: CEO (President Director), CTO (Technical Director), COO (Operational Director), CFO (Finance Director).
- Aturan Unik: 1 Kode Dokumen HANYA boleh berlaku untuk 1 dokumen saja. Jika kode bentrok, tampilkan peringatan dokumen duplikat.
- Sediakan tombol "Ubah Kode Manual" / Mode Backdating untuk memasukkan dokumen lampau yang belum sempat terdata.

### 2. TOMBOL COPY & TOMBOL FIX KODE (1x KLIK):
- Di sebelah tombol "Copy Kode", buatkan tombol "Fix Kode".
- Aturan tombol Fix: HANYA BISA DIKLIK 1 KALI per setiap kode surat baru.
- Ketika tombol Fix diklik:
  1. Tombol langsung terkunci (disabled) dan berubah label menjadi "Fix Terkunci" dengan warna hijau.
  2. Bot Google Apps Script otomatis dipanggil (aksi "create_folder") untuk membuat folder baru di Google Drive perusahaan dengan nama persis sesuai kode surat tersebut.
  3. Sistem menyimpan ID dan Link folder Google Drive tersebut.
  4. Muncul banner notifikasi sukses dengan tautan langsung "Buka Folder Drive".
  5. Jika user mengubah parameter surat sehingga membentuk kode surat baru, tombol Fix aktif kembali khusus untuk kode baru tersebut.

### 3. INTEGRASI GOOGLE DRIVE BOT & TARGET FOLDER:
- Target Folder ID Utama: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF.
- Sediakan modal "Pengaturan Google Drive & Bot" yang berisi:
  - Input URL Webhook Google Apps Script Web App.
  - Tombol "Tes Koneksi Bot".
  - Tab "Kode Script Bot" yang menyediakan kode Google Apps Script lengkap siap salin yang menangani aksi:
    * "create_folder": otomatis membuat folder baru dengan nama kode surat.
    * "upload": mengunggah berkas ke folder surat tersebut.
    * "delete": otomatis menghapus folder & berkas surat dari Google Drive saat surat dihapus dari sistem.
- Ketika user mengunggah berkas fisik saat membuat surat, berkas otomatis diunggah langsung ke dalam folder khusus kode surat tersebut di Google Drive.
- Ketika user menghapus surat di sistem, surat di database terhapus DAN bot otomatis memindahkan folder serta berkas surat tersebut di Google Drive ke sampah (setTrashed).

### 4. FITUR REVISI DOKUMEN & PENAMAAN OTOMATIS (-rev1):
- Di daftar dokumen (tabel desktop & card mobile), di dashboard, dan di modal rincian dokumen, buatkan tombol "Revisi" yang mencolok.
- Ketika tombol Revisi diklik:
  1. Langsung muncul modal "Unggah Dokumen Revisi".
  2. Terdapat form drag-and-drop unggah berkas revisi baru, tanggal revisi, nama perevisi, dan catatan revisi.
  3. Nama file otomatis diubah menjadi format: [KodeSurat]-rev1.pdf (atau -rev2, -rev3 jika revisi bertahap).
  4. Berkas revisi otomatis diunggah dan disimpan ke dalam folder Google Drive yang SAMA dengan surat aslinya.
  5. Sistem memperbarui nomor revisi dokumen (Rev 1), nama file, serta mencatat riwayat ke tabel "Revision Index".

### 5. SIDEBAR EKSEKUTIF & NAVIGASI:
- Header sidebar menampilkan logo perusahaan (+BG.png) dengan teks "PT NIRWANA BHUMI ENERGI" berwarna biru (#0284c7) dan badge "Document Control System".
- Menu Navigasi:
  1. Dashboard Utama: Kartu metrik KPI, grafik distribusi per kategori surat, breakdown per divisi, dan tabel ringkasan surat terbaru.
  2. Buat Surat Baru: Generator penomoran langkah 1-2-3 interaktif, tombol Copy, tombol Fix, form upload file, dan pendaftaran dokumen resmi.
  3. Kelola Kategori & Kode: Halaman master data untuk menambah, mengedit, dan menghapus Kategori Surat, Divisi, dan Approver secara dinamis.
  4. Ruang Direksi (Direktur): Tab filter cepat dokumen per pengesah (CEO, CTO, COO, CFO).
  5. Log Aktivitas & Audit Trail: Rekam jejak seluruh aksi (Penerbitan baru, revisi -rev1, ubah kode manual, penghapusan surat & folder drive).
  6. Backup & Restore Data: Fitur ekspor/impor seluruh database ke JSON dan ekspor tabel ke CSV.
  7. Toggle Dark Mode & Light Mode.

### 6. PENYIMPANAN DATA & TEKNOLOGI:
- Penyimpanan dual-engine: IndexedDB + LocalStorage agar data dokumen tidak hilang saat refresh atau tutup browser.
- Sediakan juga skema database Convex di folder convex/ (schema.ts, documents.ts) untuk opsi sinkronisasi cloud.
- Sediakan file konfigurasi Vercel (vercel.json) dengan rewrite routing SPA ke index.html.
- Pastikan kode bersih dari warning linter (oxlint / eslint / react compiler purity rules), tidak ada unused import, dan npm run build sukses 100%.`,
                            size: 18,
                            color: COLOR.TEXT_MAIN,
                            font: 'Arial',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 200, after: 120 } }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 180, after: 0 },
            children: [
              new TextRun({
                text: '=== AKHIR DOKUMEN SOP, WORKFLOW, & FLOWCHART PT NIRWANA BHUMI ENERGI ===',
                bold: true,
                color: COLOR.TEXT_MUTED,
                size: 18,
                font: 'Arial',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const outputPath = path.resolve(__dirname, '../prompt sistem managemet surat.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document successfully generated! Output path: ${outputPath}`);
  console.log(`File size: ${buffer.length} bytes`);
}

main().catch((err) => {
  console.error('Failed to generate document:', err);
  process.exit(1);
});
