import React, { useState, useRef, useEffect } from "react";
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
  ShadingType,
  TabStopType,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Table as TableIcon,
  Plus,
  Trash2,
  FileText,
  Save,
  CheckCircle2,
  Download,
  Copy,
  Upload,
  Sliders,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  FolderTree,
} from "lucide-react";
import {
  convertWordToGoogleDocViaMcp,
  saveGoogleDocEntry,
  SyncedGoogleDoc,
} from "../services/googleDocsService";
import {
  loadTemplateSettings,
  saveTemplateSettings,
  DocumentTemplateSettings,
} from "../services/templateSettings";

export interface TocItem {
  num: string; // Contoh: "1.0" atau "5.1"
  title: string; // Contoh: "OBJECTIVE"
  isSub?: boolean;
}

export interface RevisionItem {
  rev: string;
  date: string;
  description: string;
  revisedBy: string;
}

export interface MasterStyleConfig {
  fontFamily: string;
  titleFontSizePt: number;
  headingFontSizePt: number;
  bodyFontSizePt: number;
  marginLeftCm: number;
  marginRightCm: number;
  marginTopCm: number;
  marginBottomCm: number;
  tableHeaderHex: string;
  tableZebraHex: string;
  coverLogoDataUrl: string | null;
  coverLogoBuffer: ArrayBuffer | null;
  coverLogoWidthInches: number;
  kopLogoDataUrl: string | null;
  kopLogoBuffer: ArrayBuffer | null;
  kopLogoWidthInches: number;
}

export interface NbeDocState {
  id: string;
  fileName: string;
  docTitle: string;
  docCode: string;
  categoryLabel: string;
  revisionNo: string;
  issueDate: string;
  approvedBy: string;
  approvedRole: string;
  verifiedBy: string;
  verifiedRole: string;
  createdBy: string;
  createdRole: string;
  revisions: RevisionItem[];
  tocList: TocItem[];
  // Halaman isi dokumen (array per lembar halaman A4)
  bodyPages: string[][];
  googleDocUrl?: string;
}

// Helper konversi file gambar yang diupload menjadi DataURL & ArrayBuffer untuk Word (.docx)
export async function readUploadedImage(file: File): Promise<{ dataUrl: string; buffer: ArrayBuffer }> {
  const buffer = await file.arrayBuffer();
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
  return { dataUrl, buffer };
}

// Fallback dummy initial queue jika pengguna membuka workspace tanpa queue
export const DEFAULT_NBE_DOCS_QUEUE: NbeDocState[] = [
  {
    id: "doc-1",
    fileName: "0001-SOP-AUD-CEO-X-2026.docx",
    docTitle: "INTERNAL AUDIT PROCEDURES",
    docCode: "0001-SOP-AUD-CEO-X-2026",
    categoryLabel: "Standard Operating Procedure (SOP)",
    revisionNo: "0",
    issueDate: "17 Oktober 2026",
    approvedBy: "Bima Satryo Hartanto",
    approvedRole: "President Director / CEO",
    verifiedBy: "Dennis Raditya",
    verifiedRole: "Director of Operations & Technology / CTO",
    createdBy: "Mazmur Gusti Agung Larosa",
    createdRole: "Director of Finance & Engineering / DCC Lead",
    revisions: [
      {
        rev: "0",
        date: "17 Oktober 2026",
        description: "Initial Edition – Standarisasi Prosedur Audit Internal IMS ISO & CSMS",
        revisedBy: "Mazmur Gusti Agung Larosa",
      },
    ],
    tocList: [
      { num: "1.0", title: "OBJECTIVE" },
      { num: "2.0", title: "SCOPE" },
      { num: "3.0", title: "REFERENCES AND DEFINITIONS" },
      { num: "4.0", title: "RESPONSIBILITIES AND AUTHORITIES" },
      { num: "5.0", title: "PROCEDURE DETAILS AND WORKFLOW" },
      { num: "5.1", title: "Annual Audit Plan and Risk Assessment", isSub: true },
      { num: "5.2", title: "Audit Execution and Evidence Gathering", isSub: true },
      { num: "5.3", title: "Non-Conformance Reporting (CAR)", isSub: true },
      { num: "6.0", title: "RECORDS AND DOCUMENTATION" },
      { num: "7.0", title: "APPENDICES AND FORMS" },
      { num: "8.0", title: "ATTACHMENTS AND EMERGENCY INSTRUCTIONS" },
    ],
    bodyPages: [
      [
        "1.0 OBJECTIVE",
        "Prosedur ini menetapkan tata cara, acuan baku, dan mekanisme pengendalian pelaksanaan Audit Internal Sistem Manajemen Terintegrasi (IMS) dan CSMS di seluruh unit operasi PT Nirwana Bhumi Energy guna memastikan kepatuhan standar dan mitigasi risiko secara terukur.",
        "2.0 SCOPE",
        "Ruang lingkup prosedur ini mencakup seluruh tahapan perencanaan, pelaksanaan, pelaporan, dan tindak lanjut temuan audit internal untuk seluruh divisi operasional, teknis, dan keuangan di kantor pusat maupun area kerja lapangan.",
        "3.0 REFERENCES AND DEFINITIONS",
        "Pedoman ini berpedoman pada ISO 9001:2015 Klausul 9.2 (Internal Audit), ISO 14001:2015, ISO 45001:2018, dan kualifikasi CSMS SKK Migas serta PT PLN (Persero). Dokumen terkontrol adalah dokumen resmi yang telah diverifikasi dan disahkan oleh pejabat berwenang.",
      ],
      [
        "4.0 RESPONSIBILITIES AND AUTHORITIES",
        "Lead Auditor bertanggung jawab atas penyusunan jadwal audit tahunan dan independensi tim auditor. Auditee berkewajiban menyediakan akses bukti kerja dan dokumen rekaman. Direksi bertanggung jawab meninjau laporan audit dalam Rapat Tinjauan Manajemen (RTM).",
        "5.0 PROCEDURE DETAILS AND WORKFLOW",
        "5.1 Annual Audit Plan and Risk Assessment",
        "Audit tahunan disusun berbasis analisis tingkat risiko proses kerja dan hasil evaluasi audit periode sebelumnya. Jadwal disetujui selambat-lambatnya 30 hari sebelum dimulainya tahun anggaran berjalan.",
        "5.2 Audit Execution and Evidence Gathering",
        "Pelaksanaan audit mencakup pertemuan pembuka (opening meeting), pengujian sampel dokumen, observasi lapangan, wawancara personel, dan verifikasi kepatuhan SOP.",
        "5.3 Non-Conformance Reporting (CAR)",
        "Setiap ketidaksesuaian wajib dicatat dalam Formulir Permintaan Tindakan Korektif (Corrective Action Request / CAR) dengan tenggat waktu penyelesaian maksimal 30 hari kalender.",
      ],
      [
        "6.0 RECORDS AND DOCUMENTATION",
        "Seluruh dokumen kerja, daftar periksa audit (audit checklist), temuan CAR, dan risalah rapat wajib diarsipkan secara digital pada Google Drive DCC Korporat PT Nirwana Bhumi Energy selama minimal 5 tahun.",
        "7.0 APPENDICES AND FORMS",
        "Lampiran formulir mencakup: Audit Plan Matrix, Internal Audit Checklist, Corrective Action Request Form, dan Ringkasan Laporan Penutupan Temuan Audit.",
        "8.0 ATTACHMENTS AND EMERGENCY INSTRUCTIONS",
        "Instruksi penanganan darurat ketidaksesuaian kritis (critical finding) yang berpotensi menghentikan operasi lapangan atau membahayakan keselamatan kerja (HSE stop-work authority).",
      ],
    ],
  },
];

export const NbeDocumentWorkspace: React.FC<{
  initialDocsQueue?: NbeDocState[];
  onBackToMain?: () => void;
}> = ({ initialDocsQueue = DEFAULT_NBE_DOCS_QUEUE, onBackToMain }) => {
  const [docsQueue, setDocsQueue] = useState<NbeDocState[]>(initialDocsQueue);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);
  const [isGoogleDocsEditMode, setIsGoogleDocsEditMode] = useState<boolean>(false);
  const [useAsMasterTemplate, setUseAsMasterTemplate] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [isSyncingMcp, setIsSyncingMcp] = useState<boolean>(false);

  // State konfigurasi style & logo (Blueprint Template)
  const [styleConfig, setStyleConfig] = useState<MasterStyleConfig>(() => {
    const saved = loadTemplateSettings();
    return {
      fontFamily: saved.fontFamily || "Arial",
      titleFontSizePt: 18,
      headingFontSizePt: 12,
      bodyFontSizePt: 10.5,
      marginLeftCm: saved.marginLeftCm || 2.2,
      marginRightCm: saved.marginRightCm || 2.0,
      marginTopCm: saved.marginTopCm || 2.0,
      marginBottomCm: saved.marginBottomCm || 2.0,
      tableHeaderHex: "D9E1F2",
      tableZebraHex: "F9FBFD",
      coverLogoDataUrl: (saved as any).coverLogoDataUrl || null,
      coverLogoBuffer: null,
      coverLogoWidthInches: (saved as any).coverLogoWidthInches || 3.2,
      kopLogoDataUrl: (saved as any).kopLogoDataUrl || null,
      kopLogoBuffer: null,
      kopLogoWidthInches: (saved as any).kopLogoWidthInches || 0.95,
    };
  });

  const activeDoc = docsQueue[activeDocIndex] || docsQueue[0];
  const editorCanvasRef = useRef<HTMLDivElement>(null);

  // Inisialisasi queue saat props berubah
  useEffect(() => {
    if (initialDocsQueue && initialDocsQueue.length > 0) {
      setDocsQueue(initialDocsQueue);
    }
  }, [initialDocsQueue]);

  // Sinkronisasi otomatis saat Master Logo / Template Settings diperbarui
  useEffect(() => {
    const handleTemplateSync = (e: any) => {
      const updated = e.detail || loadTemplateSettings();
      setStyleConfig((prev) => ({
        ...prev,
        coverLogoDataUrl: updated.coverLogoDataUrl || null,
        coverLogoWidthInches: updated.coverLogoWidthInches || 3.2,
        kopLogoDataUrl: updated.kopLogoDataUrl || null,
        kopLogoWidthInches: updated.kopLogoWidthInches || 0.95,
      }));
    };
    window.addEventListener('nbe_template_settings_updated', handleTemplateSync);
    window.addEventListener('nbe-template-settings-updated', handleTemplateSync);
    return () => {
      window.removeEventListener('nbe_template_settings_updated', handleTemplateSync);
      window.removeEventListener('nbe-template-settings-updated', handleTemplateSync);
    };
  }, []);

  // Poin 1: Handler Upload Logo Cover (Halaman 1)
  const handleUploadCoverLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl, buffer } = await readUploadedImage(file);
      setStyleConfig((prev) => ({
        ...prev,
        coverLogoDataUrl: dataUrl,
        coverLogoBuffer: buffer,
      }));
      // Simpan juga ke settings global
      const currentSettings = loadTemplateSettings();
      saveTemplateSettings({
        ...currentSettings,
        ...( { coverLogoDataUrl: dataUrl } as any ),
      });
      setStatusBanner("Logo Cover berhasil diunggah dan langsung aktif di Halaman 1.");
      setTimeout(() => setStatusBanner(null), 4000);
    } catch (err: any) {
      alert("Gagal membaca file logo cover: " + err.message);
    }
  };

  // Poin 2: Handler Upload Logo Kop Header (Halaman 2 dst.)
  const handleUploadKopLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl, buffer } = await readUploadedImage(file);
      setStyleConfig((prev) => ({
        ...prev,
        kopLogoDataUrl: dataUrl,
        kopLogoBuffer: buffer,
      }));
      // Simpan juga ke settings global
      const currentSettings = loadTemplateSettings();
      saveTemplateSettings({
        ...currentSettings,
        ...( { kopLogoDataUrl: dataUrl } as any ),
      });
      setStatusBanner("Logo Kop Header berhasil diunggah dan aktif di Halaman 2, 3, 4 dst.");
      setTimeout(() => setStatusBanner(null), 4000);
    } catch (err: any) {
      alert("Gagal membaca file logo kop: " + err.message);
    }
  };

  // Poin 4 & 5: Checkbox Jadikan Dokumen Ini Sebagai Master Template
  const handleToggleMasterTemplate = (checked: boolean) => {
    setUseAsMasterTemplate(checked);
    if (checked) {
      // Kloning seluruh blueprint style & struktur otorisasi ke seluruh dokumen di antrean
      setDocsQueue((prevQueue) =>
        prevQueue.map((item, idx) => {
          if (idx === activeDocIndex) return item;
          return {
            ...item,
            approvedBy: activeDoc.approvedBy,
            approvedRole: activeDoc.approvedRole,
            verifiedBy: activeDoc.verifiedBy,
            verifiedRole: activeDoc.verifiedRole,
            createdBy: activeDoc.createdBy,
            createdRole: activeDoc.createdRole,
          };
        })
      );

      // Simpan blueprint ke template settings sistem
      const currentSettings = loadTemplateSettings();
      saveTemplateSettings({
        ...currentSettings,
        fontFamily: styleConfig.fontFamily,
        marginLeftCm: styleConfig.marginLeftCm,
        marginRightCm: styleConfig.marginRightCm,
        marginTopCm: styleConfig.marginTopCm,
        marginBottomCm: styleConfig.marginBottomCm,
        ...( {
          coverLogoDataUrl: styleConfig.coverLogoDataUrl,
          kopLogoDataUrl: styleConfig.kopLogoDataUrl,
          coverLogoWidthInches: styleConfig.coverLogoWidthInches,
          kopLogoWidthInches: styleConfig.kopLogoWidthInches,
          useAsMasterTemplate: true,
        } as any ),
      });

      setStatusBanner(
        "Dokumen ini ditetapkan sebagai Master Template! Font, ukuran margin, logo Cover & Kop, dan arsitektur tabel otomatis diterapkan ke seluruh antrean dokumen."
      );
    } else {
      setStatusBanner("Mode Master Template dinonaktifkan.");
    }
    setTimeout(() => setStatusBanner(null), 5000);
  };

  // Poin 3: Rich-text command helpers untuk WYSIWYG
  const executeFormatting = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
    }
  };

  // Sinkronisasi MCP Google Docs
  const handleSyncToGoogleDocsMcp = async () => {
    setIsSyncingMcp(true);
    setStatusBanner("Menghubungkan ke MCP Google Docs & membuat salinan dokumen live...");
    try {
      const res = await convertWordToGoogleDocViaMcp({
        fileId: activeDoc.id,
        fileName: activeDoc.fileName,
        title: activeDoc.docTitle,
        code: activeDoc.docCode,
        revision: parseInt(activeDoc.revisionNo) || 0,
        issueDate: activeDoc.issueDate,
        preparedBy: activeDoc.createdBy,
        verifiedBy: activeDoc.verifiedBy,
        approvedBy: activeDoc.approvedBy,
        revisions: activeDoc.revisions.map((r) => ({
          revision: parseInt(r.rev) || 0,
          date: r.date,
          description: r.description,
          revisedBy: r.revisedBy,
        })),
      });

      setDocsQueue((prev) =>
        prev.map((d, i) =>
          i === activeDocIndex ? { ...d, googleDocUrl: res.googleDocUrl } : d
        )
      );

      setStatusBanner(
        `Dokumen berhasil tersinkronisasi via MCP Google Docs! URL: ${res.googleDocUrl}`
      );
    } catch (err: any) {
      alert("Koneksi MCP Google Docs gagal: " + err.message);
    } finally {
      setIsSyncingMcp(false);
      setTimeout(() => setStatusBanner(null), 6000);
    }
  };

  // Simpan perubahan hasil pengeditan langsung di web
  const handleSaveDocumentChanges = () => {
    setIsGoogleDocsEditMode(false);
    setStatusBanner("Perubahan dokumen berhasil disimpan dan diperbarui di kanvas A4!");
    setTimeout(() => setStatusBanner(null), 3000);
  };

  // Update field aktif pada dokumen
  const updateActiveDocField = (field: keyof NbeDocState, value: any) => {
    setDocsQueue((prev) =>
      prev.map((doc, idx) => (idx === activeDocIndex ? { ...doc, [field]: value } : doc))
    );
  };

  // Poin 7: Komponen Reusable Kop Surat untuk Preview (Tampil di Hal 2, Hal 3, dan seluruh Hal Isi)
  const renderKopHeaderPreview = () => (
    <table
      className="w-full border-collapse border border-[#BFBFBF] mb-4 text-black bg-white"
      style={{ fontFamily: styleConfig.fontFamily }}
    >
      <tbody>
        <tr>
          <td
            rowSpan={3}
            className="border border-[#BFBFBF] p-2 text-center align-middle w-[24%]"
          >
            {styleConfig.kopLogoDataUrl ? (
              <img
                src={styleConfig.kopLogoDataUrl}
                alt="Logo Kop NBE"
                style={{ width: `${styleConfig.kopLogoWidthInches * 72}px` }}
                className="max-h-12 mx-auto object-contain mb-1"
              />
            ) : (
              <div className="text-base font-extrabold text-blue-900 tracking-wider">
                NBE
              </div>
            )}
            <div className="text-[10px] font-bold text-[#3B3838]">
              PT Nirwana Bhumi Energy
            </div>
          </td>
          <td
            colSpan={2}
            className="border border-[#BFBFBF] py-1.5 px-3 text-center font-bold text-xs text-[#3B3838] bg-[#F9FBFD]"
          >
            SISTEM MANAJEMEN TERINTEGRASI
          </td>
        </tr>
        <tr>
          <td
            colSpan={2}
            className="border border-[#BFBFBF] py-1 px-3 text-center font-bold text-xs text-[#003366]"
          >
            {activeDoc.categoryLabel || "Standard Operating Procedure (SOP)"}
          </td>
        </tr>
        <tr>
          <td
            colSpan={2}
            className="border border-[#BFBFBF] py-1.5 px-3 text-center font-extrabold text-sm text-black uppercase tracking-wide"
          >
            {activeDoc.docTitle}
          </td>
        </tr>
        <tr className="text-[11px] text-[#3B3838]">
          <td className="border border-[#BFBFBF] py-1 px-3 bg-[#F9FBFD]">
            <strong>Revisi:</strong> {activeDoc.revisionNo}
          </td>
          <td className="border border-[#BFBFBF] py-1 px-3">
            <strong>Nomor:</strong> {activeDoc.docCode}
          </td>
          <td className="border border-[#BFBFBF] py-1 px-3 text-right">
            <strong>Tanggal:</strong> {activeDoc.issueDate}
          </td>
        </tr>
      </tbody>
    </table>
  );

  // Poin 1, 2, 6, 7, 8: Generator .DOCX Murni & Terstandarisasi
  const handleDownloadStandardizedDocx = async () => {
    const borderThin = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
    const gridBorders = {
      top: borderThin,
      bottom: borderThin,
      left: borderThin,
      right: borderThin,
      insideHorizontal: borderThin,
      insideVertical: borderThin,
    };
    const noBorders = {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    };

    // Poin 2 & 7: Kop di Running Header untuk semua halaman kecuali Cover (Halaman 1)
    const kopLogoWidthPt = Math.round(styleConfig.kopLogoWidthInches * 72);
    const kopLogoHeightPt = Math.round(kopLogoWidthPt * 0.58);

    const kopLogoParagraphChildren = styleConfig.kopLogoBuffer
      ? [
          new ImageRun({
            data: styleConfig.kopLogoBuffer,
            transformation: { width: kopLogoWidthPt, height: kopLogoHeightPt },
            type: "png",
          }),
        ]
      : [
          new TextRun({
            text: "NBE",
            font: styleConfig.fontFamily,
            size: 22,
            bold: true,
            color: "002060",
          }),
        ];

    const runningHeader = new Header({
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: gridBorders,
          rows: [
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  rowSpan: 3,
                  width: { size: 24, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: kopLogoParagraphChildren,
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "PT Nirwana Bhumi Energy",
                          font: styleConfig.fontFamily,
                          size: 16,
                          bold: true,
                          color: "3B3838",
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  columnSpan: 2,
                  width: { size: 76, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  shading: { fill: "F9FBFD", type: ShadingType.CLEAR },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "SISTEM MANAJEMEN TERINTEGRASI",
                          font: styleConfig.fontFamily,
                          size: 19,
                          bold: true,
                          color: "3B3838",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  columnSpan: 2,
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text:
                            activeDoc.categoryLabel ||
                            "Standard Operating Procedure (SOP)",
                          font: styleConfig.fontFamily,
                          size: 19,
                          bold: true,
                          color: "003366",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  columnSpan: 2,
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: activeDoc.docTitle.toUpperCase(),
                          font: styleConfig.fontFamily,
                          size: 22,
                          bold: true,
                          color: "000000",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: 24, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  shading: { fill: "F9FBFD", type: ShadingType.CLEAR },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Revisi: ${activeDoc.revisionNo}`,
                          font: styleConfig.fontFamily,
                          size: 17,
                          bold: true,
                          color: "3B3838",
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 46, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Nomor: ${activeDoc.docCode}`,
                          font: styleConfig.fontFamily,
                          size: 17,
                          color: "3B3838",
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [
                        new TextRun({
                          text: `Tanggal: ${activeDoc.issueDate}`,
                          font: styleConfig.fontFamily,
                          size: 17,
                          color: "3B3838",
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ spacing: { after: 120 } }),
      ],
    });

    const runningFooter = new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: "Page ",
              font: styleConfig.fontFamily,
              size: 18,
              color: "595959",
            }),
            new TextRun({
              children: [PageNumber.CURRENT],
              font: styleConfig.fontFamily,
              size: 18,
              color: "595959",
            }),
            new TextRun({
              text: " of ",
              font: styleConfig.fontFamily,
              size: 18,
              color: "595959",
            }),
            new TextRun({
              children: [PageNumber.TOTAL_PAGES],
              font: styleConfig.fontFamily,
              size: 18,
              color: "595959",
            }),
          ],
        }),
      ],
    });

    // Poin 1: HALAMAN 1 COVER PAGE DENGAN LOGO COVER KUSTOM
    const coverLogoWidthPt = Math.round(styleConfig.coverLogoWidthInches * 72);
    const coverLogoHeightPt = Math.round(coverLogoWidthPt * 0.35);

    const coverLogoChildren = styleConfig.coverLogoBuffer
      ? [
          new ImageRun({
            data: styleConfig.coverLogoBuffer,
            transformation: { width: coverLogoWidthPt, height: coverLogoHeightPt },
            type: "png",
          }),
        ]
      : [
          new TextRun({
            text: "Nirwana Bhumi Energy",
            font: styleConfig.fontFamily,
            size: 44,
            bold: true,
            color: "0018A8",
          }),
        ];

    const page1Cover = [
      new Paragraph({
        spacing: { before: 400, after: 100 },
        alignment: AlignmentType.CENTER,
        children: coverLogoChildren,
      }),
      new Paragraph({
        spacing: { before: 0, after: 1600 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "PT Nirwana Bhumi Energy",
            font: styleConfig.fontFamily,
            size: 24,
            bold: true,
            color: "000000",
          }),
        ],
      }),
      new Paragraph({
        spacing: { before: 800, after: 2200, line: 276 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: activeDoc.docTitle.toUpperCase(),
            font: styleConfig.fontFamily,
            size: styleConfig.titleFontSizePt * 2,
            bold: true,
            color: "000000",
          }),
        ],
      }),
      new Table({
        indent: { size: convertInchesToTwip(2.15), type: WidthType.DXA },
        borders: noBorders,
        rows: [
          ["Approved By", `: ${activeDoc.approvedBy}\n  (${activeDoc.approvedRole})`],
          ["Verified By", `: ${activeDoc.verifiedBy}\n  (${activeDoc.verifiedRole})`],
          ["Created By", `: ${activeDoc.createdBy}\n  (${activeDoc.createdRole})`],
        ].map(([lbl, val]) =>
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: convertInchesToTwip(1.35), type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: lbl,
                        font: styleConfig.fontFamily,
                        size: 20,
                        bold: true,
                        color: "000000",
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: convertInchesToTwip(3.35), type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: val,
                        font: styleConfig.fontFamily,
                        size: 20,
                        color: "000000",
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        ),
      }),
      new Paragraph({ children: [new PageBreak()] }),
    ];

    // HALAMAN 2: TABEL INDEX REVISI SAJA (Diakhiri Explicit Page Break)
    const page2RevisionIndex = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 240 },
        children: [
          new TextRun({
            text: "REVISION INDEX",
            font: styleConfig.fontFamily,
            size: 26,
            bold: true,
            color: "000000",
          }),
        ],
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: gridBorders,
        rows: [
          new TableRow({
            cantSplit: true,
            tableHeader: true,
            children: ["Revision", "Date", "Description of Changes", "Revised By"].map(
              (col, idx) =>
                new TableCell({
                  width: { size: [12, 18, 50, 20][idx], type: WidthType.PERCENTAGE },
                  shading: { fill: styleConfig.tableHeaderHex, type: ShadingType.CLEAR },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: col,
                          font: styleConfig.fontFamily,
                          size: 19,
                          bold: true,
                          color: "000000",
                        }),
                      ],
                    }),
                  ],
                })
            ),
          }),
          ...activeDoc.revisions.map((r, rIdx) =>
            new TableRow({
              cantSplit: true,
              children: [r.rev, r.date, r.description, r.revisedBy].map((val, cIdx) =>
                new TableCell({
                  shading: {
                    fill: rIdx % 2 === 0 ? styleConfig.tableZebraHex : "FFFFFF",
                    type: ShadingType.CLEAR,
                  },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      alignment: cIdx < 2 ? AlignmentType.CENTER : AlignmentType.LEFT,
                      children: [
                        new TextRun({
                          text: val,
                          font: styleConfig.fontFamily,
                          size: 19,
                          color: "3B3838",
                        }),
                      ],
                    }),
                  ],
                })
              ),
            })
          ),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] }),
    ];

    // Poin 8: HALAMAN 3 KHUSUS DAFTAR ISI (TABLE OF CONTENTS)
    const page3TableOfContents = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 300 },
        children: [
          new TextRun({
            text: "TABLE OF CONTENTS",
            font: styleConfig.fontFamily,
            size: 26,
            bold: true,
            color: "000000",
          }),
        ],
      }),
      ...activeDoc.tocList.map((item) =>
        new Paragraph({
          indent: { left: item.isSub ? 720 : 0 },
          tabStops: [{ type: TabStopType.LEFT, position: item.isSub ? 1440 : 720 }],
          spacing: {
            before: item.isSub ? 30 : 60,
            after: item.isSub ? 30 : 60,
            line: 260,
          },
          children: [
            // Memisahkan nomor bab dan judul bab dengan karakter TAB (\t) agar rapi dan tidak pernah bertumpuk
            new TextRun({
              text: `${item.num}\t${item.title}`,
              font: styleConfig.fontFamily,
              size: 21,
              bold: !item.isSub,
              color: item.isSub ? "3B3838" : "000000",
            }),
          ],
        })
      ),
      // Explicit Page Break setelah Daftar Isi agar Isi Dokumen dimulai di Halaman 4!
      new Paragraph({ children: [new PageBreak()] }),
    ];

    // Poin 6: HALAMAN 4+ ISI DOKUMEN ASLI (TANPA LEMBAR VALIDASI AKHIR!)
    const page4PlusBody: Paragraph[] = [];
    activeDoc.bodyPages.forEach((pageParagraphs, pIdx) => {
      pageParagraphs.forEach((rawLine) => {
        const matchHeading = rawLine.trim().match(/^([0-9]+\.[0-9]+)\s+(.*)$/);
        if (matchHeading) {
          const [, numPart, titlePart] = matchHeading;
          const isMainHeading = numPart.endsWith(".0");
          page4PlusBody.push(
            new Paragraph({
              tabStops: [{ type: TabStopType.LEFT, position: 720 }],
              spacing: { before: isMainHeading ? 220 : 140, after: 80, line: 276 },
              children: [
                new TextRun({
                  text: `${numPart}\t${titlePart}`,
                  font: styleConfig.fontFamily,
                  size: isMainHeading
                    ? styleConfig.headingFontSizePt * 2
                    : (styleConfig.headingFontSizePt - 1) * 2,
                  bold: true,
                  color: "000000",
                }),
              ],
            })
          );
        } else {
          page4PlusBody.push(
            new Paragraph({
              alignment: AlignmentType.JUSTIFIED,
              indent: { left: 720 },
              spacing: { before: 0, after: 100, line: 276 },
              children: [
                new TextRun({
                  text: rawLine,
                  font: styleConfig.fontFamily,
                  size: styleConfig.bodyFontSizePt * 2,
                  color: "3B3838",
                }),
              ],
            })
          );
        }
      });
      if (pIdx < activeDoc.bodyPages.length - 1) {
        page4PlusBody.push(new Paragraph({ children: [new PageBreak()] }));
      }
    });

    const doc = new Document({
      sections: [
        {
          properties: {
            titlePage: true, // Halaman 1 tanpa kop, Halaman 2 dst otomatis running header
            page: {
              size: { width: 11906, height: 16838 }, // A4 standard twip
              margin: {
                left: Math.round(styleConfig.marginLeftCm * 567),
                right: Math.round(styleConfig.marginRightCm * 567),
                top: Math.round(styleConfig.marginTopCm * 567),
                bottom: Math.round(styleConfig.marginBottomCm * 567),
                header: 708,
                footer: 708,
              },
            },
          },
          headers: {
            first: new Header({ children: [] }),
            default: runningHeader,
          },
          footers: {
            first: new Footer({ children: [] }),
            default: runningFooter,
          },
          // Poin 6: TIDAK ADA LAGI Lembar Otorisasi & Validasi Akhir di belakang page4PlusBody!
          children: [
            ...page1Cover,
            ...page2RevisionIndex,
            ...page3TableOfContents,
            ...page4PlusBody,
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${activeDoc.docCode} - ${activeDoc.docTitle}.docx`);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 font-sans text-slate-800">
      {/* HEADER TOP BAR DENGAN NAVIGASI DOKUMEN & ACTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          {onBackToMain && (
            <button
              type="button"
              onClick={onBackToMain}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              <span>Kembali</span>
            </button>
          )}
          <div>
            <span className="text-[11px] font-bold tracking-wider text-sky-700 uppercase bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              Antarmuka Editor Standar & MCP Google Docs
            </span>
            <h2 className="text-base font-extrabold text-slate-900 mt-0.5">
              {activeDoc.docTitle}
            </h2>
            <div className="text-xs text-slate-500 font-mono">
              {activeDoc.docCode} • Rev {activeDoc.revisionNo}
            </div>
          </div>
        </div>

        {/* Antrean Dokumen Selector */}
        {docsQueue.length > 1 && (
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 px-2">Dokumen:</span>
            {docsQueue.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveDocIndex(idx)}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition ${
                  idx === activeDocIndex
                    ? "bg-blue-900 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-200"
                }`}
              >
                {idx + 1}. {item.docCode.split("-")[1] || "DOC"}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncToGoogleDocsMcp}
            disabled={isSyncingMcp}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {isSyncingMcp ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <ExternalLink size={14} />
            )}
            <span>Sinkronkan ke MCP Google Docs</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadStandardizedDocx}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <Download size={14} />
            <span>Unduh Word (.docx)</span>
          </button>
        </div>
      </div>

      {/* PANEL UPLOAD LOGO COVER & LOGO KOP + CHECKBOX MASTER TEMPLATE (POIN 1, 2, 4, 5) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Poin 1: Kolom Upload Logo Cover */}
          <div className="border-2 border-dashed border-sky-200 rounded-xl p-4 bg-sky-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-sky-900 tracking-wide flex items-center gap-1.5">
                  <Upload size={14} className="text-sky-700" />
                  1. Kolom Upload Logo Cover (Halaman 1)
                </span>
                {styleConfig.coverLogoDataUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setStyleConfig((prev) => ({
                        ...prev,
                        coverLogoDataUrl: null,
                        coverLogoBuffer: null,
                      }))
                    }
                    className="text-[11px] text-red-600 hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Logo utama yang ditampilkan rata tengah di kuadran atas Halaman Muka (Cover Page).
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="cursor-pointer px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm transition inline-flex items-center gap-1.5">
                <Upload size={13} />
                <span>Pilih Gambar Logo Cover</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  onChange={handleUploadCoverLogo}
                  className="hidden"
                />
              </label>

              {styleConfig.coverLogoDataUrl && (
                <div className="flex items-center gap-3">
                  <img
                    src={styleConfig.coverLogoDataUrl}
                    alt="Cover Logo"
                    className="h-10 object-contain border border-sky-300 bg-white p-1 rounded-md shadow-sm"
                  />
                  <div className="text-[11px] text-slate-600">
                    <span>Lebar: {styleConfig.coverLogoWidthInches} inci</span>
                    <input
                      type="range"
                      min={1.5}
                      max={4.5}
                      step={0.1}
                      value={styleConfig.coverLogoWidthInches}
                      onChange={(e) =>
                        setStyleConfig((prev) => ({
                          ...prev,
                          coverLogoWidthInches: parseFloat(e.target.value),
                        }))
                      }
                      className="block w-24 h-1.5 bg-sky-200 rounded-lg appearance-none cursor-pointer mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Poin 2: Kolom Upload Logo Kop Header */}
          <div className="border-2 border-dashed border-teal-200 rounded-xl p-4 bg-teal-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-teal-900 tracking-wide flex items-center gap-1.5">
                  <Upload size={14} className="text-teal-700" />
                  2. Kolom Upload Logo Kop Header (Halaman 2 dst.)
                </span>
                {styleConfig.kopLogoDataUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setStyleConfig((prev) => ({
                        ...prev,
                        kopLogoDataUrl: null,
                        kopLogoBuffer: null,
                      }))
                    }
                    className="text-[11px] text-red-600 hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Logo kotak kiri atas (Rowspan 3) pada Kop Surat yang tampil di Halaman 2, 3, 4, dst.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="cursor-pointer px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm transition inline-flex items-center gap-1.5">
                <Upload size={13} />
                <span>Pilih Gambar Logo Kop</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  onChange={handleUploadKopLogo}
                  className="hidden"
                />
              </label>

              {styleConfig.kopLogoDataUrl && (
                <div className="flex items-center gap-3">
                  <img
                    src={styleConfig.kopLogoDataUrl}
                    alt="Kop Logo"
                    className="h-10 object-contain border border-teal-300 bg-white p-1 rounded-md shadow-sm"
                  />
                  <div className="text-[11px] text-slate-600">
                    <span>Lebar: {styleConfig.kopLogoWidthInches} inci</span>
                    <input
                      type="range"
                      min={0.6}
                      max={1.8}
                      step={0.05}
                      value={styleConfig.kopLogoWidthInches}
                      onChange={(e) =>
                        setStyleConfig((prev) => ({
                          ...prev,
                          kopLogoWidthInches: parseFloat(e.target.value),
                        }))
                      }
                      className="block w-24 h-1.5 bg-teal-200 rounded-lg appearance-none cursor-pointer mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Poin 4 & 5: Checkbox Jadikan Dokumen Ini Sebagai Master Template */}
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3.5">
          <input
            type="checkbox"
            id="checkbox-master-template"
            checked={useAsMasterTemplate}
            onChange={(e) => handleToggleMasterTemplate(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-amber-400 text-teal-600 focus:ring-teal-500 cursor-pointer"
          />
          <label htmlFor="checkbox-master-template" className="cursor-pointer select-none">
            <span className="text-sm font-bold text-slate-900 block">
              Jadikan dokumen yang sedang saya edit ini sebagai Master Template untuk dokumen-dokumen selanjutnya
            </span>
            <span className="text-xs text-slate-600 block mt-0.5">
              Jika dicentang, sistem otomatis mengunci ukuran huruf, tata letak gambar, logo Cover & Kop, arsitektur tabel (#D9E1F2), margin (kiri 2.2 cm, atas/bawah/kanan 2.0 cm), dan struktur halaman dari dokumen ini untuk seluruh dokumen antrean berikutnya.
            </span>
          </label>
        </div>

        {/* Poin 3: Floating / Sticky Formatting Toolbar ala Google Docs */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isGoogleDocsEditMode) {
                  handleSaveDocumentChanges();
                } else {
                  setIsGoogleDocsEditMode(true);
                  setStatusBanner("Mode Edit Google Docs aktif! Anda dapat langsung mengetik dan memformat teks di kanvas A4.");
                  setTimeout(() => setStatusBanner(null), 4000);
                }
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5 ${
                isGoogleDocsEditMode
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              }`}
            >
              {isGoogleDocsEditMode ? (
                <>
                  <Save size={14} />
                  <span>Simpan Perubahan (Save)</span>
                </>
              ) : (
                <>
                  <FileText size={14} />
                  <span>Edit Dokumen (Mode Google Docs WYSIWYG)</span>
                </>
              )}
            </button>

            {/* Formatting Tools (Muncul ketika mode edit aktif) */}
            {isGoogleDocsEditMode && (
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 border border-slate-300 rounded-lg p-1 text-xs">
                {/* Font Selector */}
                <select
                  value={styleConfig.fontFamily}
                  onChange={(e) => {
                    setStyleConfig((prev) => ({ ...prev, fontFamily: e.target.value }));
                    executeFormatting("fontName", e.target.value);
                  }}
                  className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold"
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Segoe UI">Segoe UI</option>
                  <option value="Roboto">Roboto</option>
                </select>

                <div className="h-4 w-px bg-slate-300 mx-1" />

                <button
                  type="button"
                  title="Bold (Tebal)"
                  onClick={() => executeFormatting("bold")}
                  className="p-1 hover:bg-white rounded font-bold text-slate-800"
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  title="Italic (Miring)"
                  onClick={() => executeFormatting("italic")}
                  className="p-1 hover:bg-white rounded italic text-slate-800"
                >
                  <Italic size={14} />
                </button>
                <button
                  type="button"
                  title="Underline (Garis Bawah)"
                  onClick={() => executeFormatting("underline")}
                  className="p-1 hover:bg-white rounded underline text-slate-800"
                >
                  <Underline size={14} />
                </button>
                <button
                  type="button"
                  title="Strikethrough (Coret)"
                  onClick={() => executeFormatting("strikeThrough")}
                  className="p-1 hover:bg-white rounded text-slate-800"
                >
                  <Strikethrough size={14} />
                </button>

                <div className="h-4 w-px bg-slate-300 mx-1" />

                <button
                  type="button"
                  title="Rata Kiri"
                  onClick={() => executeFormatting("justifyLeft")}
                  className="p-1 hover:bg-white rounded text-slate-800"
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  type="button"
                  title="Rata Tengah"
                  onClick={() => executeFormatting("justifyCenter")}
                  className="p-1 hover:bg-white rounded text-slate-800"
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  type="button"
                  title="Rata Kanan"
                  onClick={() => executeFormatting("justifyRight")}
                  className="p-1 hover:bg-white rounded text-slate-800"
                >
                  <AlignRight size={14} />
                </button>
                <button
                  type="button"
                  title="Rata Kiri-Kanan (Justify)"
                  onClick={() => executeFormatting("justifyFull")}
                  className="p-1 hover:bg-white rounded text-slate-800"
                >
                  <AlignJustify size={14} />
                </button>

                <div className="h-4 w-px bg-slate-300 mx-1" />

                <button
                  type="button"
                  title="Bullet List"
                  onClick={() => executeFormatting("insertUnorderedList")}
                  className="p-1 hover:bg-white rounded text-slate-800"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  title="Numbered List"
                  onClick={() => executeFormatting("insertOrderedList")}
                  className="p-1 hover:bg-white rounded text-slate-800"
                >
                  <ListOrdered size={14} />
                </button>
                <button
                  type="button"
                  title="Tambah Indentasi"
                  onClick={() => executeFormatting("indent")}
                  className="p-1 hover:bg-white rounded text-slate-800"
                >
                  <Indent size={14} />
                </button>
                <button
                  type="button"
                  title="Kurangi Indentasi"
                  onClick={() => executeFormatting("outdent")}
                  className="p-1 hover:bg-white rounded text-slate-800"
                >
                  <Outdent size={14} />
                </button>
              </div>
            )}
          </div>

          {activeDoc.googleDocUrl && (
            <a
              href={activeDoc.googleDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-sky-700 hover:text-sky-800 inline-flex items-center gap-1 underline"
            >
              <span>Buka Google Docs MCP Live</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        {statusBanner && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
        )}
      </div>

      {/* KANVAS PREVIEW KERTAS A4 NYATA (POIN 1, 2, 6, 7, 8) */}
      <div
        id="nbe-single-a4-preview-canvas"
        ref={editorCanvasRef}
        className="space-y-8 select-text"
      >
        {/* ========================================================================= */}
        {/* LEMBAR 1: COVER PAGE (DENGAN LOGO COVER KUSTOM, TANPA KOP HEADER - POIN 1) */}
        {/* ========================================================================= */}
        <div
          className="a4-page-preview flex flex-col justify-between bg-white text-black shadow-lg mx-auto"
          style={{
            fontFamily: styleConfig.fontFamily,
            padding: `${styleConfig.marginTopCm}cm ${styleConfig.marginRightCm}cm ${styleConfig.marginBottomCm}cm ${styleConfig.marginLeftCm}cm`,
          }}
        >
          {/* Top spacer for vertical centering */}
          <div className="flex-1 min-h-6" />

          {/* Centered Hero Group */}
          <div className="flex flex-col items-center text-center space-y-6 w-full">
            {/* Logo Cover & Entitas */}
            <div className="text-center">
              {styleConfig.coverLogoDataUrl ? (
                <img
                  src={styleConfig.coverLogoDataUrl}
                  alt="Logo Cover NBE"
                  style={{ width: `${styleConfig.coverLogoWidthInches * 72}px` }}
                  className="mx-auto object-contain mb-3"
                />
              ) : (
                <img
                  src="/+BG.png"
                  alt="PT Nirwana Bhumi Energy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo.png';
                  }}
                  style={{ width: '4.7cm' }}
                  className="mx-auto object-contain mb-3"
                />
              )}
              <div className="text-xl font-extrabold text-black uppercase tracking-wide">
                PT NIRWANA BHUMI ENERGY
              </div>
            </div>

            {/* Judul Dokumen Utama */}
            <div
              contentEditable={isGoogleDocsEditMode}
              suppressContentEditableWarning
              onBlur={(e) => updateActiveDocField("docTitle", e.currentTarget.innerText.trim())}
              className="text-center font-bold text-black uppercase px-6 leading-relaxed"
              style={{ fontSize: `${styleConfig.titleFontSizePt}pt` }}
            >
              {activeDoc.docTitle}
            </div>
          </div>

          {/* Bottom spacer for vertical centering */}
          <div className="flex-1 min-h-6" />

          {/* Blok Otorisasi 3 Baris Rata Kanan Bawah */}
          <div className="ml-auto w-84 text-xs text-black space-y-2.5 pb-6">
            <div className="grid grid-cols-3">
              <span className="font-bold">Approved By</span>
              <span className="col-span-2">
                : {activeDoc.approvedBy} ({activeDoc.approvedRole})
              </span>
            </div>
            <div className="grid grid-cols-3">
              <span className="font-bold">Verified By</span>
              <span className="col-span-2">
                : {activeDoc.verifiedBy} ({activeDoc.verifiedRole})
              </span>
            </div>
            <div className="grid grid-cols-3">
              <span className="font-bold">Created By</span>
              <span className="col-span-2">
                : {activeDoc.createdBy} ({activeDoc.createdRole})
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LEMBAR 2: KOP HEADER + TABEL INDEX REVISI SAJA (POIN 7 & 8)                */}
        {/* ========================================================================= */}
        <div
          className="a4-page-preview flex flex-col justify-between bg-white text-black shadow-lg mx-auto"
          style={{
            fontFamily: styleConfig.fontFamily,
            padding: `${styleConfig.marginTopCm}cm ${styleConfig.marginRightCm}cm ${styleConfig.marginBottomCm}cm ${styleConfig.marginLeftCm}cm`,
          }}
        >
          <div>
            {renderKopHeaderPreview()}
            <h4 className="text-center font-bold text-sm text-black my-4 tracking-wider uppercase">
              REVISION INDEX
            </h4>
            <table className="w-full border-collapse border border-[#BFBFBF] text-xs">
              <thead className="bg-[#D9E1F2] font-bold text-black">
                <tr>
                  <th className="border border-[#BFBFBF] p-2 text-center w-[12%]">
                    Revision
                  </th>
                  <th className="border border-[#BFBFBF] p-2 text-center w-[18%]">
                    Date
                  </th>
                  <th className="border border-[#BFBFBF] p-2 text-center w-[50%]">
                    Description of Changes
                  </th>
                  <th className="border border-[#BFBFBF] p-2 text-center w-[20%]">
                    Revised By
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeDoc.revisions.map((r, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 0 ? "bg-[#F9FBFD]" : "bg-white"}
                  >
                    <td className="border border-[#BFBFBF] p-2 text-center font-bold">
                      {r.rev}
                    </td>
                    <td className="border border-[#BFBFBF] p-2 text-center">{r.date}</td>
                    <td className="border border-[#BFBFBF] p-2">{r.description}</td>
                    <td className="border border-[#BFBFBF] p-2 text-center">
                      {r.revisedBy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-right text-xs text-slate-500 pt-4 border-t border-slate-100">
            Page 2 of {3 + activeDoc.bodyPages.length}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LEMBAR 3: KOP HEADER + DAFTAR ISI (TOC) 1 HALAMAN TERSENDIRI (POIN 8)       */}
        {/* ========================================================================= */}
        <div
          className="a4-page-preview flex flex-col justify-between bg-white text-black shadow-lg mx-auto"
          style={{
            fontFamily: styleConfig.fontFamily,
            padding: `${styleConfig.marginTopCm}cm ${styleConfig.marginRightCm}cm ${styleConfig.marginBottomCm}cm ${styleConfig.marginLeftCm}cm`,
          }}
        >
          <div>
            {renderKopHeaderPreview()}
            <h4 className="text-center font-bold text-sm text-black my-5 tracking-wider uppercase">
              TABLE OF CONTENTS
            </h4>
            <div
              contentEditable={isGoogleDocsEditMode}
              suppressContentEditableWarning
              className="space-y-2 text-xs"
            >
              {activeDoc.tocList.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-baseline ${
                    item.isSub
                      ? "pl-[0.5in] font-normal text-[#3B3838]"
                      : "font-bold text-black"
                  }`}
                >
                  {/* Lebar tetap 0.5 inci (w-12 shrink-0) agar nomor bab dan judul TIDAK PERNAH menempel */}
                  <span className="inline-block w-12 shrink-0 font-bold">{item.num}</span>
                  <span>{item.title}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 pt-4 border-t border-slate-100">
            Page 3 of {3 + activeDoc.bodyPages.length}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LEMBAR 4+: KOP HEADER TIAP HALAMAN + ISI DOKUMEN (TANPA LEMBAR VALIDASI AKHIR)*/}
        {/* ========================================================================= */}
        {activeDoc.bodyPages.map((paragraphs, pageIdx) => (
          <div
            key={pageIdx}
            className="a4-page-preview flex flex-col justify-between bg-white text-black shadow-lg mx-auto"
            style={{
              fontFamily: styleConfig.fontFamily,
              padding: `${styleConfig.marginTopCm}cm ${styleConfig.marginRightCm}cm ${styleConfig.marginBottomCm}cm ${styleConfig.marginLeftCm}cm`,
            }}
          >
            <div>
              {renderKopHeaderPreview()}
              <div
                contentEditable={isGoogleDocsEditMode}
                suppressContentEditableWarning
                className="space-y-3 text-xs text-[#3B3838] leading-relaxed"
              >
                {paragraphs.map((line, lIdx) => {
                  const matchH = line.trim().match(/^([0-9]+\.[0-9]+)\s+(.*)$/);
                  if (matchH) {
                    return (
                      <div
                        key={lIdx}
                        className="flex items-baseline font-bold text-black pt-2"
                      >
                        <span className="inline-block w-12 shrink-0">{matchH[1]}</span>
                        <span style={{ fontSize: `${styleConfig.headingFontSizePt}pt` }}>
                          {matchH[2]}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <p
                      key={lIdx}
                      className="pl-12 text-justify leading-relaxed"
                      style={{ fontSize: `${styleConfig.bodyFontSizePt}pt` }}
                    >
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
            <div className="text-right text-xs text-slate-500 pt-4 border-t border-slate-100">
              Page {4 + pageIdx} of {3 + activeDoc.bodyPages.length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
