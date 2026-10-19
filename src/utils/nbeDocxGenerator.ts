import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  BorderStyle,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  TabStopType,
  ShadingType,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";
import { DocxTableData } from "./docxExtractor";

export type LanguageMode = "id" | "en" | "bi";

export interface NbeDocumentPayload {
  docCode: string;
  titleId: string;
  titleEn: string;
  categoryNameId: string;
  divisionName: string;
  revisionNo: string;
  issueDateId: string;
  issueDateEn: string;
  preparedBy: string;
  preparedRole: string;
  verifiedBy: string;
  verifiedRole: string;
  approvedBy: string;
  approvedRole: string;
  language: LanguageMode;
  coverLogoBuffer?: ArrayBuffer | null;
  kopLogoBuffer?: ArrayBuffer | null;
  coverLogoWidthInches?: number;
  kopLogoWidthInches?: number;
  tocList?: Array<{ num: string; title: string; isSub?: boolean }>;
  bodyPages?: string[][];
  isProcedureOrSop?: boolean;
  preservedBodyParagraphs?: string[];
  bodyTables?: DocxTableData[];
  revisionRows?: Array<{ rev: string; date: string; description: string; revisedBy: string }>;
}

const COLOR_BLACK = "000000";
const COLOR_BODY = "3B3838";
const COLOR_NAVY = "003366";
const COLOR_HEADER_FILL = "D9E1F2";
const COLOR_ALT_ROW = "F9FBFD";
const COLOR_BORDER = "BFBFBF";

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER };
const tableBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
  insideHorizontal: thinBorder,
  insideVertical: thinBorder,
};
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

function buildRunningHeader(data: NbeDocumentPayload): Header {
  const isKB = data.docCode.includes("-KB-") || (data.categoryNameId && data.categoryNameId.toUpperCase().includes("KEBIJAKAN"));
  const kopTitle = isKB
    ? (data.language === "en"
      ? `BOARD OF DIRECTORS' RESOLUTION: ${(data.titleEn || data.titleId).toUpperCase()}`
      : data.language === "bi"
      ? `SURAT KEPUTUSAN DIREKSI / BOARD RESOLUTION: ${data.titleId.toUpperCase()}`
      : `SURAT KEPUTUSAN DIREKSI: ${data.titleId.toUpperCase()}`)
    : `${(data.categoryNameId || "STANDAR OPERASIONAL PROSEDUR").toUpperCase()}: ${data.titleId.toUpperCase()}`;

  const dateStr = data.language === "en" ? data.issueDateEn : data.issueDateId;

  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                rowSpan: 4,
                width: { size: 22, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  ...(data.kopLogoBuffer
                    ? [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new ImageRun({
                              data: data.kopLogoBuffer,
                              transformation: {
                                width: data.kopLogoWidthInches ? Math.round(data.kopLogoWidthInches * 72) : 105,
                                height: data.kopLogoWidthInches ? Math.round(data.kopLogoWidthInches * 72 * 0.69) : 72,
                              },
                              type: "png",
                            }),
                          ],
                        }),
                      ]
                    : []),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "PT NIRWANA BHUMI ENERGY", font: "Arial", size: 16, bold: true, color: COLOR_NAVY })],
                  }),
                ],
              }),
              new TableCell({
                columnSpan: 3,
                width: { size: 78, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: data.divisionName || "GENERAL & MANAGEMENT (GNR)", font: "Arial", size: 18, bold: true, color: COLOR_BLACK })],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                columnSpan: 3,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: data.categoryNameId || "KEBIJAKAN PERUSAHAAN (COMPANY POLICY / KB)", font: "Arial", size: 17, bold: true, color: COLOR_BODY })],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                columnSpan: 3,
                verticalAlign: VerticalAlign.CENTER,
                shading: { fill: COLOR_HEADER_FILL, type: ShadingType.CLEAR },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: kopTitle, font: "Arial", size: 17, bold: true, color: COLOR_BLACK })],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `Revision: ${data.revisionNo}`, font: "Arial", size: 16, color: COLOR_BODY })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: data.docCode, font: "Arial", size: 16, bold: true, color: COLOR_NAVY })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `Date : ${dateStr}`, font: "Arial", size: 16, color: COLOR_BODY })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 160 } }),
    ],
  });
}

export function buildNbeDocument(data: NbeDocumentPayload): Document {
  const isEn = data.language === "en";
  const isBi = data.language === "bi";

  const isKB = data.docCode.includes("-KB-") || (data.categoryNameId && data.categoryNameId.toUpperCase().includes("KEBIJAKAN"));

  const coverDocType = isKB
    ? (isEn
      ? "BOARD OF DIRECTORS' RESOLUTION"
      : isBi
      ? "SURAT KEPUTUSAN DIREKSI / BOARD OF DIRECTORS' RESOLUTION"
      : "SURAT KEPUTUSAN DIREKSI")
    : (data.categoryNameId || "DOKUMEN RESMI STANDAR").toUpperCase();

  const cleanTitleId = data.titleId || "SISTEM MANAJEMEN PENGENDALIAN DOKUMEN";
  const cleanTitleEn = data.titleEn || "ESTABLISHMENT OF DOCUMENT CONTROL MANAGEMENT SYSTEM";

  const coverSubject = isKB
    ? (isEn
      ? `CONCERNING ${cleanTitleEn.toUpperCase()}`
      : isBi
      ? `TENTANG ${cleanTitleId.toUpperCase()}\n(CONCERNING ${cleanTitleEn.toUpperCase()})`
      : `TENTANG ${cleanTitleId.toUpperCase()}`)
    : cleanTitleId.toUpperCase();

  const revDescription =
    data.revisionNo === "0" || data.revisionNo === ""
      ? isEn
        ? `Initial Edition – ${cleanTitleEn} of PT Nirwana Bhumi Energy`
        : isBi
        ? `Initial Edition – ${cleanTitleId} / ${cleanTitleEn}`
        : `Initial Edition – ${cleanTitleId} PT Nirwana Bhumi Energy`
      : `Revision ${data.revisionNo} – Updated Controlled Document`;

  const docYear =
    data.issueDateId?.match(/\b(20\d\d)\b/)?.[1] ||
    data.issueDateEn?.match(/\b(20\d\d)\b/)?.[1] ||
    data.docCode?.match(/\b(20\d\d)\b/)?.[1] ||
    "2026";

  // HALAMAN 1: COVER PAGE
  const coverWidthPt = data.coverLogoWidthInches ? Math.round(data.coverLogoWidthInches * 72) : 220;
  const coverHeightPt = Math.round(coverWidthPt * 0.35);

  const coverLogoParagraphs = data.coverLogoBuffer
    ? [
        new Paragraph({
          spacing: { before: 1800, after: 140 },
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: data.coverLogoBuffer,
              transformation: { width: coverWidthPt, height: coverHeightPt },
              type: "png",
            }),
          ],
        }),
      ]
    : [];

  const page1Children: Paragraph[] = [
    ...coverLogoParagraphs,
    new Paragraph({
      spacing: { before: data.coverLogoBuffer ? 0 : 2200, after: 200 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "PT NIRWANA BHUMI ENERGY", font: "Arial", size: 40, bold: true, color: COLOR_BLACK })],
    }),
    new Paragraph({
      spacing: { before: 240, after: 140 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: coverDocType, font: "Arial", size: 31, bold: true, color: COLOR_BLACK })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 200 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: coverSubject, font: "Arial", size: 23, bold: true, color: COLOR_BODY })],
    }),
    new Paragraph({
      spacing: { before: 100, after: 360 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: isEn ? `Document Number: ${data.docCode}` : `Nomor Dokumen: ${data.docCode}`,
          font: "Arial",
          size: 22,
          bold: true,
          color: COLOR_NAVY,
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 1400, after: 1400 } }),
    new Paragraph({
      indent: { left: convertInchesToTwip(3.45) },
      spacing: { after: 60 },
      children: [
        new TextRun({ text: "Approved by\t: ", font: "Arial", size: 19, bold: true, color: COLOR_BLACK }),
        new TextRun({ text: `${data.approvedBy} (${data.approvedRole})`, font: "Arial", size: 19, color: COLOR_BODY }),
      ],
    }),
    new Paragraph({
      indent: { left: convertInchesToTwip(3.45) },
      spacing: { after: 60 },
      children: [
        new TextRun({ text: "Verified by\t: ", font: "Arial", size: 19, bold: true, color: COLOR_BLACK }),
        new TextRun({ text: `${data.verifiedBy} (${data.verifiedRole})`, font: "Arial", size: 19, color: COLOR_BODY }),
      ],
    }),
    new Paragraph({
      indent: { left: convertInchesToTwip(3.45) },
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "Prepared by\t: ", font: "Arial", size: 19, bold: true, color: COLOR_BLACK }),
        new TextRun({ text: `${data.preparedBy} (${data.preparedRole})`, font: "Arial", size: 19, color: COLOR_BODY }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // HALAMAN 2: REVISION INDEX (Otomatis dari Tabel Index Revisi Dokumen)
  const revisionTableRows = [
    new TableRow({
      cantSplit: true,
      tableHeader: true,
      children: ["Revision", "Date", "Description of Changes", "Revised By"].map((colTitle, idx) =>
        new TableCell({
          width: { size: [12, 18, 50, 20][idx], type: WidthType.PERCENTAGE },
          shading: { fill: COLOR_HEADER_FILL, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: colTitle, font: "Arial", size: 19, bold: true, color: COLOR_BLACK })],
            }),
          ],
        })
      ),
    }),
    ...(data.revisionRows && data.revisionRows.length > 0
      ? data.revisionRows.map((r, rIdx) =>
          new TableRow({
            cantSplit: true,
            children: [r.rev, r.date, r.description, r.revisedBy].map((val, idx) =>
              new TableCell({
                verticalAlign: VerticalAlign.CENTER,
                shading: { fill: rIdx % 2 === 0 ? COLOR_ALT_ROW : "FFFFFF", type: ShadingType.CLEAR },
                children: [
                  new Paragraph({
                    alignment: idx < 2 ? AlignmentType.CENTER : AlignmentType.LEFT,
                    children: [new TextRun({ text: val, font: "Arial", size: 18, color: COLOR_BODY })],
                  }),
                ],
              })
            ),
          })
        )
      : [
          new TableRow({
            cantSplit: true,
            children: [data.revisionNo || "0", isEn ? data.issueDateEn : data.issueDateId, revDescription, data.preparedBy].map(
              (val, idx) =>
                new TableCell({
                  verticalAlign: VerticalAlign.CENTER,
                  shading: { fill: COLOR_ALT_ROW, type: ShadingType.CLEAR },
                  children: [
                    new Paragraph({
                      alignment: idx === 2 ? AlignmentType.LEFT : AlignmentType.CENTER,
                      children: [new TextRun({ text: val, font: "Arial", size: 18, color: COLOR_BODY })],
                    }),
                  ],
                })
            ),
          }),
        ]),
  ];

  const page2Children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 200 },
      children: [new TextRun({ text: data.language === "en" ? "REVISION INDEX" : "TABEL INDEKS REVISI", font: "Arial", size: 24, bold: true, color: COLOR_BLACK })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows: revisionTableRows,
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // POIN 8: HALAMAN 3 KHUSUS DAFTAR ISI (TABLE OF CONTENTS) DALAM 1 HALAMAN TERSENDIRI
  const effectiveTocList = (data.tocList && data.tocList.length > 0)
    ? data.tocList
    : (!isKB
      ? (data.language === "en"
        ? [
            { num: "1.0", title: "OBJECTIVE" },
            { num: "2.0", title: "SCOPE" },
            { num: "3.0", title: "RESPONSIBILITY" },
            { num: "4.0", title: "DEFINITION" },
            { num: "5.0", title: "PROCEDURE DETAILS" },
            { num: "5.1", title: "General Provisions", isSub: true },
            { num: "5.2", title: "Operational Flow", isSub: true },
            { num: "6.0", title: "RELATED DOCUMENTS" },
            { num: "7.0", title: "RECORDS" },
            { num: "8.0", title: "APPENDICES AND EMERGENCY INSTRUCTIONS" },
          ]
        : [
            { num: "1.0", title: "MAKSUD DAN TUJUAN" },
            { num: "2.0", title: "RUANG LINGKUP" },
            { num: "3.0", title: "TANGGUNG JAWAB" },
            { num: "4.0", title: "DEFINISI" },
            { num: "5.0", title: "RINCIAN PROSEDUR" },
            { num: "5.1", title: "Ketentuan Umum", isSub: true },
            { num: "5.2", title: "Alur Operasional", isSub: true },
            { num: "6.0", title: "DOKUMEN TERKAIT" },
            { num: "7.0", title: "REKAMAN" },
            { num: "8.0", title: "LAMPIRAN DAN INSTRUKSI KEADAAN DARURAT" },
          ])
      : null);

  const page3TocChildren: Paragraph[] = [];
  if (effectiveTocList) {
    page3TocChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 300 },
        children: [new TextRun({ text: data.language === "en" ? "TABLE OF CONTENTS" : "DAFTAR ISI", font: "Arial", size: 26, bold: true, color: COLOR_BLACK })],
      }),
      ...effectiveTocList.map((item) =>
        new Paragraph({
          indent: { left: item.isSub ? 720 : 0 },
          tabStops: [{ type: TabStopType.LEFT, position: item.isSub ? 1440 : 720 }],
          spacing: { before: item.isSub ? 30 : 60, after: item.isSub ? 30 : 60, line: 260 },
          children: [
            // Memisahkan nomor bab dan judul bab dengan tab (\t) agar rapi dan tidak pernah menempel (1.0    OBJECTIVE)
            new TextRun({
              text: `${item.num}\t${item.title}`,
              font: "Arial",
              size: 21,
              bold: !item.isSub,
              color: item.isSub ? COLOR_BODY : COLOR_BLACK,
            }),
          ],
        })
      ),
      new Paragraph({ children: [new PageBreak()] })
    );
  }

  // HALAMAN 4+: JIKA DOKUMEN MEMILIKI BODY PAGES / ISI ASLI / TABEL ASLI / DOKUMEN PROSEDUR
  const hasPreservedParagraphs = data.preservedBodyParagraphs && data.preservedBodyParagraphs.length > 0;
  const hasPreservedTables = data.bodyTables && data.bodyTables.length > 0;
  const hasBodyPages = data.bodyPages && data.bodyPages.length > 0;

  if (hasBodyPages || hasPreservedParagraphs || hasPreservedTables || !isKB) {
    const proceduralBodyChildren: (Paragraph | Table)[] = [];

    // Jika memiliki bodyPages array
    if (hasBodyPages && data.bodyPages) {
      data.bodyPages.forEach((pageParagraphs, pIdx) => {
        pageParagraphs.forEach((rawLine) => {
          const matchHeading = rawLine.trim().match(/^([0-9]+\.[0-9]+)\s+(.*)$/);
          if (matchHeading) {
            const [, numPart, titlePart] = matchHeading;
            const isMainHeading = numPart.endsWith(".0");
            proceduralBodyChildren.push(
              new Paragraph({
                tabStops: [{ type: TabStopType.LEFT, position: 720 }],
                spacing: { before: isMainHeading ? 220 : 140, after: 80, line: 276 },
                children: [
                  new TextRun({
                    text: `${numPart}\t${titlePart}`,
                    font: "Arial",
                    size: isMainHeading ? 24 : 22,
                    bold: true,
                    color: COLOR_BLACK,
                  }),
                ],
              })
            );
          } else {
            proceduralBodyChildren.push(
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                indent: { left: 720 },
                spacing: { before: 0, after: 100, line: 276 },
                children: [
                  new TextRun({
                    text: rawLine,
                    font: "Arial",
                    size: 21,
                    color: COLOR_BODY,
                  }),
                ],
              })
            );
          }
        });
        if (pIdx < data.bodyPages!.length - 1) {
          proceduralBodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        }
      });
    } else if (hasPreservedParagraphs && data.preservedBodyParagraphs) {
      // Tambahkan paragraf body asli jika ada
      data.preservedBodyParagraphs.forEach((paraText) => {
        const matchHeading = paraText.trim().match(/^([0-9]+\.[0-9]+)\s+(.*)$/);
        if (matchHeading) {
          const [, numPart, titlePart] = matchHeading;
          const isMainHeading = numPart.endsWith(".0");
          proceduralBodyChildren.push(
            new Paragraph({
              tabStops: [{ type: TabStopType.LEFT, position: 720 }],
              spacing: { before: isMainHeading ? 220 : 140, after: 80, line: 276 },
              children: [
                new TextRun({
                  text: `${numPart}\t${titlePart}`,
                  font: "Arial",
                  size: isMainHeading ? 24 : 22,
                  bold: true,
                  color: COLOR_BLACK,
                }),
              ],
            })
          );
        } else {
          const isCapsHeading = /^[A-Z0-9\s:/-]{4,}$/.test(paraText.trim());
          proceduralBodyChildren.push(
            new Paragraph({
              alignment: isCapsHeading ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
              indent: { left: isCapsHeading ? 0 : 720 },
              tabStops: [{ type: TabStopType.LEFT, position: 720 }],
              spacing: { before: isCapsHeading ? 240 : 80, after: isCapsHeading ? 100 : 80, line: 276 },
              children: [
                new TextRun({
                  text: paraText,
                  font: "Arial",
                  size: isCapsHeading ? 22 : 21,
                  bold: isCapsHeading,
                  color: isCapsHeading ? COLOR_BLACK : COLOR_BODY,
                }),
              ],
            })
          );
        }
      });
    } else if (!isKB) {
      // Fallback standar bab 1 - 8 untuk prosedur/SOP tanpa isian
      const defaultChapters = data.language === "en" ? [
        ["1.0 OBJECTIVE", "To establish operational governance standards across PT Nirwana Bhumi Energy ensuring all activities operate efficiently, safely, and in full compliance with oil & gas industry regulations as well as ISO 9001/14001/45001 integrated management systems."],
        ["2.0 SCOPE", "This procedure applies to all operational, engineering, procurement, and corporate administration units within the working areas of PT Nirwana Bhumi Energy, including onshore operations and supporting facilities."],
        ["3.0 RESPONSIBILITY", "All executing personnel are required to comprehend and implement the working instructions set forth herein. Technical verifiers are responsible for quality control and compliance with regular audit systems."],
        ["4.0 DEFINITION", "IMS (Integrated Management Systems): Integrated quality, HSE, and environmental management systems adopted by PT Nirwana Bhumi Energy.\nDCC (Document Control Centre): Administrative unit governing the registration, distribution, and archiving of controlled documents."],
        ["5.0 PROCEDURE DETAILS", "All operational activities must commence with a Job Safety Analysis (JSA) risk assessment, scheduled equipment inspections, and verification of valid work permits.\nOperational task execution shall be reported on a daily basis to the integrated monitoring system to ensure data continuity and accurate maintenance history."],
        ["6.0 RELATED DOCUMENTS", "Corporate Integrated Management System Manual NBE-IMS-MAN-2026 and Field Quality Verification Forms."],
        ["7.0 RECORDS", "All verification records, inspection logbooks, and official handover minutes shall be preserved in controlled archives for a minimum period of 5 (five) years."],
        ["8.0 APPENDICES AND EMERGENCY INSTRUCTIONS", "Emergency response instructions and key emergency telephone directories are set forth in the internal operational appendices."],
      ] : [
        ["1.0 MAKSUD DAN TUJUAN", "Menetapkan tata kelola standar operasional pada PT Nirwana Bhumi Energy agar seluruh aktivitas berjalan efisien, aman, dan mematuhi regulasi industri migas serta sistem manajemen mutu ISO 9001/14001/45001."],
        ["2.0 RUANG LINGKUP", "Prosedur ini mencakup seluruh unit operasional, teknik, pengadaan, dan administrasi korporat di wilayah kerja PT Nirwana Bhumi Energy termasuk operasional darat dan fasilitas pendukung lainnya."],
        ["3.0 TANGGUNG JAWAB", "Seluruh personel pelaksana wajib memahami dan menerapkan instruksi kerja yang tercantum. Verifikator teknis bertanggung jawab atas kendali mutu dan kepatuhan sistem audit berkala."],
        ["4.0 DEFINISI", "IMS (Integrated Management Systems): Sistem Manajemen Terintegrasi mutu, K3, dan lingkungan yang diadopsi PT Nirwana Bhumi Energy.\nDCC (Document Control Center): Unit pengelola registrasi, distribusi, dan pengarsipan naskah dokumen terkontrol."],
        ["5.0 RINCIAN PROSEDUR", "Setiap kegiatan wajib diawali dengan penilaian risiko (Job Safety Analysis) dan inspeksi berkala pada peralatan kerja serta verifikasi izin kerja berlaku.\nPelaksanaan tugas operasional dilaporkan secara harian ke sistem pemantauan terpadu untuk menjamin kontinuitas data dan akurasi riwayat penanganan."],
        ["6.0 DOKUMEN TERKAIT", "Manual Sistem Manajemen Terintegrasi NBE-IMS-MAN-2026 dan Formulir Verifikasi Mutu Lapangan."],
        ["7.0 REKAMAN", "Seluruh catatan verifikasi, logbook inspeksi, dan berita acara disimpan dalam arsip terkontrol minimal selama 5 (lima) tahun."],
        ["8.0 LAMPIRAN DAN INSTRUKSI KEADAAN DARURAT", "Instruksi tanggap darurat dan nomor kontak darurat tertera pada lampiran internal operasional."],
      ];

      defaultChapters.forEach(([chTitle, chDesc], idx) => {
        const [numPart, ...titleParts] = chTitle.split(" ");
        const titlePart = titleParts.join(" ");
        proceduralBodyChildren.push(
          new Paragraph({
            tabStops: [{ type: TabStopType.LEFT, position: 720 }],
            spacing: { before: 200, after: 60, line: 276 },
            children: [
              new TextRun({
                text: `${numPart}\t${titlePart}`,
                font: "Arial",
                size: 24,
                bold: true,
                color: COLOR_BLACK,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: 720 },
            spacing: { before: 0, after: 120, line: 276 },
            children: [
              new TextRun({
                text: chDesc,
                font: "Arial",
                size: 21,
                color: COLOR_BODY,
              }),
            ],
          })
        );
      });
    }

    // Tambahkan tabel asli dari berkas pengguna jika ada
    if (hasPreservedTables && data.bodyTables) {
      data.bodyTables.forEach((tblData) => {
        if (!tblData.rows || tblData.rows.length === 0) return;
        const colCount = Math.max(...tblData.rows.map((r) => r.length), 1);
        const colWidth = Math.floor(100 / colCount);
        const docxRows = tblData.rows.map((rowCells, rIdx) => {
          const isHeader = rIdx === 0;
          return new TableRow({
            cantSplit: true,
            tableHeader: isHeader,
            children: rowCells.map((cellText) =>
              new TableCell({
                width: { size: colWidth, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                shading: {
                  fill: isHeader ? COLOR_HEADER_FILL : rIdx % 2 === 0 ? "FFFFFF" : COLOR_ALT_ROW,
                  type: ShadingType.CLEAR,
                },
                children: [
                  new Paragraph({
                    alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({
                        text: cellText,
                        font: "Arial",
                        size: isHeader ? 18 : 17,
                        bold: isHeader,
                        color: isHeader ? COLOR_BLACK : COLOR_BODY,
                      }),
                    ],
                  }),
                ],
              })
            ),
          });
        });

        proceduralBodyChildren.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            rows: docxRows,
          }),
          new Paragraph({ spacing: { after: 240 } })
        );
      });
    }

    // Poin 6: DOKUMEN PROSEDUR LANGSUNG BERAKHIR BERSIH TANPA LEMBAR VALIDASI AKHIR!
    return new Document({
      sections: [
        {
          properties: {
            titlePage: true,
            page: {
              size: { width: 11906, height: 16838 },
              margin: { left: 1247, right: 1134, top: 1134, bottom: 1134 },
            },
          },
          headers: {
            first: new Header({ children: [] }),
            default: buildRunningHeader(data),
          },
          footers: {
            first: new Footer({ children: [] }),
            default: new Footer({
              children: [
                new Paragraph({
                  tabStops: [{ type: TabStopType.RIGHT, position: 9525 }],
                  children: [
                    new TextRun({ text: `© ${docYear} PT Nirwana Bhumi Energy\tPage `, font: "Arial", size: 18, color: "595959" }),
                    new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "595959" }),
                    new TextRun({ text: " of ", font: "Arial", size: 18, color: "595959" }),
                    new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 18, color: "595959" }),
                  ],
                }),
              ],
            }),
          },
          children: [...page1Children, ...page2Children, ...page3TocChildren, ...proceduralBodyChildren],
        },
      ],
    });
  }

  // HALAMAN 3 & 4: ISI SURAT & PENGESAHAN
  const dccTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        cantSplit: true,
        tableHeader: true,
        children: (isEn
          ? ["No.", "Personnel Name", "Structural Position", "DCC Role & Responsibilities"]
          : isBi
          ? ["No.", "Nama Personel / Name", "Jabatan / Position", "Peran & Tanggung Jawab / Role & Responsibilities"]
          : ["No.", "Nama Personel", "Jabatan Struktural", "Peran & Tanggung Jawab DCC"]
        ).map((h, i) =>
          new TableCell({
            width: { size: [8, 26, 26, 40][i], type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_HEADER_FILL, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: h, font: "Arial", size: 18, bold: true, color: COLOR_BLACK })],
              }),
            ],
          })
        ),
      }),
      ...[
        [
          "1",
          data.preparedBy || "Mazmur Gusti Agung Larosa",
          isEn ? "Director of Finance & Engineering" : "Direktur Keuangan & Teknik",
          isEn
            ? "Lead Document Controller & System Administrator: Validates manuscripts, registers unique codes, executes Fix Code, and synchronises Google Drive archives."
            : "Lead Document Controller & System Administrator: Memvalidasi naskah, registrasi kode unik, eksekusi Tombol Fix Kode, dan sinkronisasi arsip Google Drive.",
        ],
        [
          "2",
          data.verifiedBy || "Dennis Raditya",
          isEn ? "Director of Operations & Technology" : "Direktur Operasional & Teknologi",
          isEn
            ? "Technical Verifier & QA Approver: Verifies technical formatting, sub-pixel layout, and compliance with IMS & CSMS quality standards."
            : "Technical Verifier & QA Approver: Memeriksa kesesuaian format teknis, layout sub-pixel, serta kepatuhan standar mutu IMS & CSMS.",
        ],
        [
          "3",
          "Abdul Qodir Al Jailani",
          isEn ? "Commissioner / IMS Lead" : "Komisaris / IMS Lead",
          isEn
            ? "Independent Compliance Overseer: Oversees periodic audits of controlled documents, backdating control, and archive retention integrity."
            : "Independent Compliance Overseer: Mengawasi audit berkala dokumen terkontrol, penomoran masa lalu (backdating), dan integritas retensi arsip.",
        ],
      ].map((rowVals, idx) =>
        new TableRow({
          cantSplit: true,
          children: rowVals.map((val, cIdx) =>
            new TableCell({
              shading: { fill: idx % 2 === 1 ? COLOR_ALT_ROW : "FFFFFF", type: ShadingType.CLEAR },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: cIdx === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                  children: [new TextRun({ text: val, font: "Arial", size: 18, bold: cIdx === 1, color: COLOR_BODY })],
                }),
              ],
            })
          ),
        })
      ),
    ],
  });

  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          isEn ? "Approved By:\nPresident Director / CEO" : isBi ? "Disetujui Oleh / Approved By:\nPresident Director / CEO" : "Disetujui Oleh:\nPresident Director / CEO",
          isEn ? "Verified By:\nDirector of Operations & Tech (CTO)" : isBi ? "Diverifikasi Oleh / Verified By:\nDirector of Operations & Tech (CTO)" : "Diverifikasi Oleh:\nDirector of Operations & Tech (CTO)",
          isEn ? "Prepared & Proposed By:\nDirector of Finance & Eng (CFO / DCC)" : isBi ? "Disiapkan Oleh / Prepared By:\nDirector of Finance & Eng (CFO / DCC)" : "Disiapkan & Diajukan Oleh:\nDirector of Finance & Eng (CFO / DCC)",
        ].map((headerText) =>
          new TableCell({
            width: { size: 33.33, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_HEADER_FILL, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: headerText, font: "Arial", size: 17, bold: true, color: COLOR_BLACK })],
              }),
            ],
          })
        ),
      }),
      new TableRow({
        cantSplit: true,
        children: [
          "[ Duty Stamp IDR 10,000 / Meterai ]\n\n[ Signature & Corporate Seal ]",
          "\n[ Signature & Stamp ]\n",
          "\n[ Signature & Stamp ]\n",
        ].map((sigSpace) =>
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 320, after: 320 },
                children: [new TextRun({ text: sigSpace, font: "Arial", size: 16, italics: true, color: COLOR_BODY })],
              }),
            ],
          })
        ),
      }),
      new TableRow({
        cantSplit: true,
        children: [
          `${(data.approvedBy || "BIMA SATRYO HARTANTO").toUpperCase()}\n(${isEn ? "President Director" : "Direktur Utama"})`,
          `${(data.verifiedBy || "DENNIS RADITYA").toUpperCase()}\n(${isEn ? "Director of Operations" : "Direktur Operasional"})`,
          `${(data.preparedBy || "MAZMUR GUSTI AGUNG LAROSA").toUpperCase()}\n(${isEn ? "Director of Finance & Eng" : "Direktur Keuangan & Teknik"})`,
        ].map((person) =>
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: person, font: "Arial", size: 17, bold: true, color: COLOR_BLACK })],
              }),
            ],
          })
        ),
      }),
    ],
  });

  const biRow = (leftText: string, rightText: string, isBold = false) =>
    new TableRow({
      cantSplit: true,
      children: [leftText, rightText].map((txt, i) =>
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: noBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 100 },
              children: [
                new TextRun({
                  text: txt,
                  font: "Arial",
                  size: 18,
                  bold: isBold,
                  italics: i === 1 && !isBold,
                  color: isBold ? COLOR_BLACK : COLOR_BODY,
                }),
              ],
            }),
          ],
        })
      ),
    });

  const page3And4Children: (Paragraph | Table)[] = isBi
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "SURAT KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY\nBOARD OF DIRECTORS' RESOLUTION OF PT NIRWANA BHUMI ENERGY",
              font: "Arial",
              size: 21,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 180 },
          children: [new TextRun({ text: `NOMOR / NUMBER: ${data.docCode}`, font: "Arial", size: 19, bold: true, color: COLOR_NAVY })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [
            biRow("DIREKSI PT NIRWANA BHUMI ENERGY,", "THE BOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY,", true),
            biRow(
              "Menimbang:\na. bahwa dalam rangka mewujudkan standarisasi, akuntabilitas, serta keterlacakan seluruh dokumen di lingkungan PT Nirwana Bhumi Energy, diperlukan sistem tata kelola dan kontrol dokumen yang baku dan terintegrasi;\nb. bahwa guna menjamin kepatuhan terhadap standar IMS (ISO 9001, ISO 14001, ISO 45001) dan CSMS SKK Migas serta PLN, diperlukan penunjukan personel Tim DCC;\nc. bahwa berdasarkan pertimbangan a dan b, perlu menetapkan Surat Keputusan Direksi.",
              "Having Considered:\na. that in order to achieve standardisation, accountability, and traceability of all documents within PT Nirwana Bhumi Energy, a standardised and integrated document control system is required;\nb. that to ensure compliance with IMS standards (ISO 9001, ISO 14001, ISO 45001) and CSMS qualifications of SKK Migas and PLN, the appointment of a DCC Team is requisite;\nc. that based on considerations a and b, it is necessary to enact this Board of Directors' Resolution."
            ),
            biRow(
              "Mengingat:\n1. Akta Pendirian PT Nirwana Bhumi Energy;\n2. Standar ISO 9001:2015 Klausul 7.5 (Documented Information);\n3. Pedoman CSMS SKK Migas & PT PLN (Persero);\n4. Prosedur Baku No. 0001-SOP-GNR-CEO-IX-2026;\n5. Kebijakan Manajemen Terintegrasi No. 0001-KB-GNR-CEO-X-2026.",
              "In View Of:\n1. The Deed of Establishment of PT Nirwana Bhumi Energy;\n2. International Standard ISO 9001:2015 Clause 7.5;\n3. CSMS Guidelines of SKK Migas & PT PLN (Persero);\n4. Standard Operating Procedure No. 0001-SOP-GNR-CEO-IX-2026;\n5. Integrated Management Policy No. 0001-KB-GNR-CEO-X-2026."
            ),
            biRow(
              "MEMUTUSKAN:\nMenetapkan: SURAT KEPUTUSAN DIREKSI TENTANG PENETAPAN SISTEM MANAJEMEN PENGENDALIAN DOKUMEN DAN TIM DCC.",
              "HEREBY RESOLVES:\nTo Enact: BOARD OF DIRECTORS' RESOLUTION CONCERNING THE DOCUMENT CONTROL MANAGEMENT SYSTEM AND DCC TEAM.",
              true
            ),
            biRow(
              "KESATU: Memberlakukan Standar Penomoran Dokumen 6 Segmen:\n[NomorUrut4Digit]-[Kategori]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun]\nAsas mutlak: SATU KODE UNTUK SATU DOKUMEN (1 Kode = 1 Dokumen Sah).",
              "FIRST: To officially enact the 6-Segment Document Numbering System:\n[4DigitSequentialNo]-[DocCategory]-[Division]-[Authoriser]-[RomanMonth]-[Year]\nStrict principle: ONE CODE FOR ONE DOCUMENT (1 Code = 1 Valid Document)."
            ),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [
            biRow(
              "KEDUA: Menunjuk personel berikut sebagai Tim Document Control Center (DCC):",
              "SECOND: To appoint the following personnel as the Document Control Centre (DCC) Team:",
              true
            ),
          ],
        }),
        dccTable,
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [
            biRow(
              "KETIGA: Mengatur registrasi dokumen digital melalui Tombol 'Fix Kode' yang otomatis mengarsipkan dokumen ke Folder Induk Google Drive Korporat NBE (ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF).\nKEEMPAT: Setiap revisi wajib mencantumkan sufiks (-rev1, dst.), mencatat alasan pada Revision Index, dan memusnahkan dokumen usang (obsolete).\nKELIMA: Berlaku efektif sejak tanggal ditetapkan.",
              "THIRD: To govern digital registration via the 'Fix Code' button, automatically archiving documents into the NBE Corporate Google Drive Root Folder (ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF).\nFOURTH: Any amendment must append a suffix (-rev1, etc.), record rationale in the Revision Index, and destroy obsolete copies.\nFIFTH: Enters into force effectively from the date of enactment."
            ),
            biRow(
              `Ditetapkan di : Semarang / Tuban\nPada tanggal : ${data.issueDateId}`,
              `Enacted in : Semarang / Tuban\nOn date : ${data.issueDateEn}`,
              true
            ),
          ],
        }),
        signatureTable,
      ]
    : [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: isEn ? "BOARD OF DIRECTORS' RESOLUTION OF PT NIRWANA BHUMI ENERGY" : "SURAT KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY",
              font: "Arial",
              size: 22,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: `${isEn ? "NUMBER" : "NOMOR"}: ${data.docCode}`, font: "Arial", size: 20, bold: true, color: COLOR_NAVY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: isEn ? `CONCERNING\n${cleanTitleEn.toUpperCase()}` : `TENTANG\n${cleanTitleId.toUpperCase()}`,
              font: "Arial",
              size: 19,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: isEn ? "THE BOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY," : "DIREKSI PT NIRWANA BHUMI ENERGY,",
              font: "Arial",
              size: 19,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: isEn ? "Having Considered:\n" : "Menimbang:\n", font: "Arial", size: 19, bold: true, color: COLOR_BLACK }),
            new TextRun({
              text: isEn
                ? "a. that in order to achieve standardisation, accountability, and traceability of all corporate policy documents, standard operating procedures, work instructions, and technical forms within PT Nirwana Bhumi Energy, a standardised and integrated document governance and control system is required;\nb. that to ensure comprehensive compliance with Integrated Management System (IMS) standards based on ISO 9001:2015, ISO 14001:2015, ISO 45001:2018, and Contractor Safety Management System (CSMS) qualifications of SKK Migas and PT PLN (Persero), the appointment of personnel responsible for document management is requisite;\nc. that based on the considerations referred to in paragraphs a and b above, it is deemed necessary to enact a Board of Directors' Resolution."
                : "a. bahwa dalam rangka mewujudkan standarisasi, akuntabilitas, serta keterlacakan seluruh dokumen kebijakan, prosedur operasional, instruksi kerja, dan formulir teknis di lingkungan PT Nirwana Bhumi Energy, diperlukan suatu sistem tata kelola dan kontrol dokumen yang baku dan terintegrasi;\nb. bahwa guna menjamin kepatuhan menyeluruh terhadap standar Sistem Manajemen Terintegrasi (IMS) berbasis ISO 9001:2015, ISO 14001:2015, ISO 45001:2018, dan kualifikasi Contractor Safety Management System (CSMS) SKK Migas serta PLN, diperlukan penunjukan personel penanggung jawab pengelolaan dokumen;\nc. bahwa berdasarkan pertimbangan sebagaimana dimaksud dalam huruf a dan b di atas, dipandang perlu untuk menetapkan Surat Keputusan Direksi.",
              font: "Arial",
              size: 19,
              color: COLOR_BODY,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({ text: isEn ? "In View Of:\n" : "Mengingat:\n", font: "Arial", size: 19, bold: true, color: COLOR_BLACK }),
            new TextRun({
              text: isEn
                ? "1. The Deed of Establishment of PT Nirwana Bhumi Energy and prevailing statutory regulations;\n2. International Standard ISO 9001:2015 Clause 7.5 regarding Documented Information;\n3. Standard Guidelines for the Contractor Safety Management System (CSMS) of SKK Migas and PT PLN (Persero);\n4. Standard Operating Procedure No. 0001-SOP-GNR-CEO-IX-2026 (Documents and Records Control Procedure);\n5. Integrated Management Policy No. 0001-KB-GNR-CEO-X-2026."
                : "1. Akta Pendirian PT Nirwana Bhumi Energy serta peraturan perundang-undangan perseroan terbatas yang berlaku;\n2. Standar Internasional ISO 9001:2015 Klausul 7.5 tentang Informasi Terdokumentasi (Documented Information);\n3. Pedoman Baku Contractor Safety Management System (CSMS) SKK Migas dan PT PLN (Persero);\n4. Prosedur Baku No. 0001-SOP-GNR-CEO-IX-2026 (Documents and Records Control Procedure);\n5. Kebijakan Manajemen Terintegrasi No. 0001-KB-GNR-CEO-X-2026.",
              font: "Arial",
              size: 19,
              color: COLOR_BODY,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: isEn ? "HEREBY RESOLVES:" : "MEMUTUSKAN:", font: "Arial", size: 20, bold: true, color: COLOR_BLACK })],
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({ text: isEn ? "To Enact:\n" : "Menetapkan:\n", font: "Arial", size: 19, bold: true, color: COLOR_BLACK }),
            new TextRun({
              text: isEn
                ? `BOARD OF DIRECTORS' RESOLUTION OF PT NIRWANA BHUMI ENERGY CONCERNING ${cleanTitleEn.toUpperCase()}.\n\nFIRST:\nTo officially enact the Standard Format and 6-Segment Document Numbering System across all operational areas and the head office of PT Nirwana Bhumi Energy: [4DigitSequentialNo]-[DocCategory]-[Division]-[Authoriser]-[RomanMonth]-[Year]. This numbering provision is strictly unique under the rigorous principle: ONE CODE FOR ONE DOCUMENT (1 Document Code = 1 Valid Document).`
                : `SURAT KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY TENTANG ${cleanTitleId.toUpperCase()}.\n\nKESATU:\nMemberlakukan secara resmi Standar Format dan Sistem Penomoran Dokumen 6 Segmen di seluruh lingkungan operasional dan kantor pusat PT Nirwana Bhumi Energy: [NomorUrut4Digit]-[KategoriSurat]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun]. Ketentuan penomoran ini bersifat unik mutlak dengan asas ketat: SATU KODE UNTUK SATU DOKUMEN (1 Kode Dokumen = 1 Dokumen Sah).`,
              font: "Arial",
              size: 19,
              color: COLOR_BODY,
            }),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: isEn
                ? "SECOND:\nTo appoint and designate the following personnel as the Document Control Centre (DCC) Team of PT Nirwana Bhumi Energy:"
                : "KEDUA:\nMenunjuk dan menetapkan personel berikut sebagai Tim Document Control Center (DCC) PT Nirwana Bhumi Energy:",
              font: "Arial",
              size: 19,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        }),
        dccTable,
        new Paragraph({
          spacing: { before: 160, after: 160 },
          children: [
            new TextRun({
              text: isEn
                ? "THIRD:\nTo govern the digital storage and registration of corporate documents via the 'Fix Code' button on the web system, whereby upon code verification and locking, the system automatically synchronises and archives the document into corporate Google Drive (Root Folder ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF) within its respective divisional classification subfolder.\n\nFOURTH:\nTo establish the revision workflow for controlled documents, whereby any subsequent amendment must append a suffix (-rev1, -rev2, etc.), record the rationale within the Revision Index table, and promptly withdraw and destroy obsolete copies.\n\nFIFTH:\nThis Resolution shall enter into force effectively from the date of its enactment."
                : "KETIGA:\nMengatur tata kelola penyimpanan dan registrasi dokumen digital perusahaan melalui fitur Tombol 'Fix Kode' pada sistem web, di mana setelah kode diverifikasi dan dikunci, sistem secara otomatis mengintegrasikan dokumen ke Google Drive korporat (Folder Induk ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF) pada subfolder klasifikasi divisi masing-masing.\n\nKEEMPAT:\nMenetapkan alur revisi dokumen terkontrol, di mana setiap pembaruan wajib mencantumkan sufiks (-rev1, -rev2, dst.), mencatatkan alasan perubahan pada tabel Revision Index, serta memusnahkan salinan dokumen usang (obsolete).\n\nKELIMA:\nSurat Keputusan ini mulai berlaku efektif sejak tanggal ditetapkan.",
              font: "Arial",
              size: 19,
              color: COLOR_BODY,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: isEn
                ? `Enacted in\t: Semarang / Tuban\nOn date\t\t: ${data.issueDateEn}\nBOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY`
                : `Ditetapkan di\t: Semarang / Tuban\nPada tanggal\t: ${data.issueDateId}\nDIREKSI PT NIRWANA BHUMI ENERGY`,
              font: "Arial",
              size: 19,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        }),
        signatureTable,
      ];

  return new Document({
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            size: { width: 11906, height: 16838 },
            margin: { left: 1247, right: 1134, top: 1134, bottom: 1134 },
          },
        },
        headers: {
          first: new Header({ children: [] }),
          default: buildRunningHeader(data),
        },
        footers: {
          first: new Footer({ children: [] }),
          default: new Footer({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: 9525 }],
                children: [
                  new TextRun({ text: `© ${docYear} PT Nirwana Bhumi Energy\tPage `, font: "Arial", size: 18, color: "595959" }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "595959" }),
                  new TextRun({ text: " of ", font: "Arial", size: 18, color: "595959" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 18, color: "595959" }),
                ],
              }),
            ],
          }),
        },
        children: [...page1Children, ...page2Children, ...page3And4Children],
      },
    ],
  });
}

export async function generateNbeDocxBlob(
  data: NbeDocumentPayload
): Promise<{ blob: Blob; fileName: string; dataUrl: string }> {
  const doc = buildNbeDocument(data);
  const blob = await Packer.toBlob(doc);
  const cleanTitle = data.titleId?.trim() || (data.language === "en" ? "Board of Directors Resolution" : "Surat Keputusan Direksi");
  const fileName = `${data.docCode} - ${cleanTitle}.docx`;

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });

  return { blob, fileName, dataUrl };
}

export async function generateAndDownloadNbeDocx(
  data: NbeDocumentPayload
): Promise<{ blob: Blob; fileName: string }> {
  const { blob, fileName } = await generateNbeDocxBlob(data);
  saveAs(blob, fileName);
  return { blob, fileName };
}

