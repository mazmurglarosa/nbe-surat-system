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
  convertInchesToTwip,
  PageBreak,
  Header,
} from 'docx';
import { RevisionRecord } from '../types';

export interface DocumentTemplateData {
  title: string;
  code: string;
  systemName?: string; // e.g. "SISTEM PENGENDALI INTERNAL" / "SISTEM MANAJEMEN TERINTEGRASI"
  docTypeLabel?: string; // e.g. "Standar Operasional Prosedur (SOP)"
  issueDateFormatted: string; // e.g. "30 September 2026"
  revision: number;
  preparedBy: string;
  verifiedBy: string;
  approvedBy: string;
  description?: string;
  revisions: RevisionRecord[];
  bodyContent?: string;
}

/**
 * Membuat berkas Microsoft Word (.docx) resmi dengan Cover, Kop Header, dan Tabel Index Revisi
 * sesuai standar format baku PT Nirwana Bhumi Energi (sebagaimana ditentukan pada prom surat.docx).
 */
export async function generateStandardNbeDocx(
  data: DocumentTemplateData
): Promise<{ blob: Blob; base64: string; dataUrl: string }> {
  const borderThin = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '000000',
  };

  const bordersBox = {
    top: borderThin,
    bottom: borderThin,
    left: borderThin,
    right: borderThin,
  };

  const systemName = data.systemName || 'SISTEM PENGENDALI INTERNAL';
  const docTypeLabel = data.docTypeLabel || 'Standar Operasional Prosedur (SOP)';
  const docTitle = data.title.trim().toUpperCase() || 'UNTITLED PROCEDURE';

  // Format Revision Index Rows
  const revisionRows: TableRow[] = [
    // Header Row
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 1000, type: WidthType.DXA },
          borders: bordersBox,
          shading: { fill: 'E2E8F0' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Revisi', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 2000, type: WidthType.DXA },
          borders: bordersBox,
          shading: { fill: 'E2E8F0' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Tanggal', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 4500, type: WidthType.DXA },
          borders: bordersBox,
          shading: { fill: 'E2E8F0' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Deskripsi Perubahan', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 2000, type: WidthType.DXA },
          borders: bordersBox,
          shading: { fill: 'E2E8F0' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Direvisi Oleh', bold: true, size: 18 })],
            }),
          ],
        }),
      ],
    }),
  ];

  // If revisions exist, add them; otherwise add initial Rev 0
  const effectiveRevisions =
    data.revisions && data.revisions.length > 0
      ? data.revisions
      : [
          {
            revision: data.revision || 0,
            date: data.issueDateFormatted,
            description: `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${data.code})`,
            revisedBy: data.preparedBy || 'Staff NBE',
          },
        ];

  effectiveRevisions.forEach((rev) => {
    revisionRows.push(
      new TableRow({
        children: [
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(rev.revision), size: 18 })],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: rev.date, size: 18 })],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                children: [new TextRun({ text: rev.description, size: 18 })],
              }),
            ],
          }),
          new TableCell({
            borders: bordersBox,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: rev.revisedBy, size: 18 })],
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
        new TableCell({ borders: bordersBox, children: [new Paragraph({ text: ' ' })] }),
        new TableCell({ borders: bordersBox, children: [new Paragraph({ text: ' ' })] }),
        new TableCell({ borders: bordersBox, children: [new Paragraph({ text: ' ' })] }),
        new TableCell({ borders: bordersBox, children: [new Paragraph({ text: ' ' })] }),
      ],
    })
  );

  // KOP HEADER TABLE (Page 2)
  const kopTable = new Table({
    width: { size: 9500, type: WidthType.DXA },
    borders: bordersBox,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            rowSpan: 3,
            width: { size: 2400, type: WidthType.DXA },
            borders: bordersBox,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'NBE', bold: true, size: 36, color: '0284C7' }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Nirwana Bhumi Energy',
                    size: 14,
                    bold: true,
                    color: '0F172A',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 7100, type: WidthType.DXA },
            borders: bordersBox,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: systemName, bold: true, size: 20 })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 7100, type: WidthType.DXA },
            borders: bordersBox,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: docTypeLabel, size: 18, bold: true })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 7100, type: WidthType.DXA },
            borders: bordersBox,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: docTitle, bold: true, size: 22 })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 2400, type: WidthType.DXA },
            borders: bordersBox,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `Revisi: ${data.revision || 0}`, size: 16 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 7100, type: WidthType.DXA },
            borders: bordersBox,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${data.code}   |   Tanggal: ${data.issueDateFormatted}`,
                    bold: true,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Construct Document
  const doc = new DocxDocument({
    sections: [
      // SECTION 1: COVER PAGE
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
            },
          },
        },
        children: [
          new Paragraph({ text: '', spacing: { before: 1200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Nirwana Bhumi Energy',
                bold: true,
                size: 44,
                color: '0284C7',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 180, after: 1800 },
            children: [
              new TextRun({
                text: 'PT Nirwana Bhumi Energi',
                size: 26,
                color: '334155',
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 2400 },
            children: [
              new TextRun({
                text: docTitle,
                bold: true,
                size: 36,
                color: '0F172A',
              }),
            ],
          }),
          new Paragraph({ text: '', spacing: { before: 2000 } }),

          // Bottom Approval Info on Cover
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'Approved by  : ', bold: true, size: 20 }),
              new TextRun({ text: data.approvedBy || 'Direktur Keuangan (CFO)', size: 20 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 120 },
            children: [
              new TextRun({ text: 'Verified by    : ', bold: true, size: 20 }),
              new TextRun({ text: data.verifiedBy || 'Auditor Internal Utama', size: 20 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 120 },
            children: [
              new TextRun({ text: 'Prepared by  : ', bold: true, size: 20 }),
              new TextRun({ text: data.preparedBy || 'Staff NBE', size: 20 }),
            ],
          }),

          // Page Break to Page 2
          new Paragraph({
            children: [new PageBreak()],
          }),

          // SECTION 2: PAGE 2 - KOP HEADER & REVISION INDEX
          kopTable,

          new Paragraph({
            spacing: { before: 600, after: 200 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Revision Index',
                bold: true,
                size: 24,
                color: '0F172A',
              }),
            ],
          }),

          new Table({
            width: { size: 9500, type: WidthType.DXA },
            borders: bordersBox,
            rows: revisionRows,
          }),

          new Paragraph({
            spacing: { before: 800, after: 400 },
            children: [
              new TextRun({
                text: 'Ringkasan & Lingkup Prosedur:',
                bold: true,
                size: 22,
                color: '0284C7',
              }),
            ],
          }),

          new Paragraph({
            spacing: { after: 300 },
            children: [
              new TextRun({
                text:
                  data.description ||
                  `Dokumen prosedur baku sistem manajemen terintegrasi PT Nirwana Bhumi Energi dengan nomor resmi ${data.code}. Berlaku untuk seluruh divisi operasional dan unit bisnis korporat.`,
                size: 20,
              }),
            ],
          }),

          ...(data.bodyContent
            ? [
                new Paragraph({
                  spacing: { before: 400, after: 200 },
                  children: [
                    new TextRun({
                      text: 'Isi Dokumen Terlampir:',
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
                new Paragraph({
                  children: [new TextRun({ text: data.bodyContent, size: 18 })],
                }),
              ]
            : []),
        ],
      },
    ],
  });

  const base64 = await Packer.toBase64String(doc);
  const blob = await Packer.toBlob(doc);
  const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;

  return { blob, base64, dataUrl };
}
