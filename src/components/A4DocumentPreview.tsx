import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  Eye,
  Layers,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { DocumentLanguage, RevisionRecord } from '../types';
import { generateAndDownloadNbeDocx } from '../utils/nbeDocxGenerator';
import { DocxTableData } from '../utils/docxExtractor';
import { WordRibbonBar } from './WordRibbonBar';

export interface DocumentSavePayload {
  title: string;
  code: string;
  issueDate: string;
  revision: number;
  preparedBy: string;
  verifiedBy: string;
  approvedBy: string;
  revisions?: RevisionRecord[];
  bodyContent?: string;
  preservedBodyParagraphs?: string[];
  bodyTables?: DocxTableData[];
}

export interface A4DocumentPreviewProps {
  language: DocumentLanguage;
  title: string;
  code: string;
  issueDate: string;
  revision?: number;
  revisions?: RevisionRecord[];
  preparedBy?: string;
  verifiedBy?: string;
  approvedBy?: string;
  typeLabel?: string;
  divisionLabel?: string;
  approverLabel?: string;
  categoryCode?: string;
  bodyContent?: string;
  preservedBodyParagraphs?: string[];
  bodyTables?: DocxTableData[];
  coverLogoDataUrl?: string | null;
  kopLogoDataUrl?: string | null;
  coverLogoWidthInches?: number;
  kopLogoWidthInches?: number;
  tocList?: Array<{ num: string; title: string; isSub?: boolean }>;
  bodyPages?: string[][];
  onCopyCode?: () => void;
  onDownloadDocx?: () => void;
  onSaveDocument?: (updated: DocumentSavePayload) => void;
}

export const A4DocumentPreview: React.FC<A4DocumentPreviewProps> = ({
  language = 'id',
  title,
  code,
  issueDate,
  revision = 0,
  revisions = [],
  preparedBy = 'Mazmur Gusti Agung Larosa',
  verifiedBy = 'Dennis Raditya',
  approvedBy = 'Bima Satryo Hartanto',
  typeLabel = 'Standar Operasional Prosedur (SOP)',
  divisionLabel = 'General (GNR)',
  approverLabel = 'President Director (CEO)',
  categoryCode = 'KB',
  bodyContent,
  preservedBodyParagraphs = [],
  bodyTables = [],
  coverLogoDataUrl = null,
  kopLogoDataUrl = null,
  coverLogoWidthInches = 3.2,
  kopLogoWidthInches = 0.95,
  tocList,
  bodyPages,
  onCopyCode,
  onDownloadDocx,
  onSaveDocument,
}) => {
  const [activePageTab, setActivePageTab] = useState<'all' | number>('all');
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);

  // Direct in-preview interactive editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editableTitle, setEditableTitle] = useState(title || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN');
  const [editableCode, setEditableCode] = useState(code || '0001-KB-GNR-CEO-X-2026');
  const [editableIssueDate, setEditableIssueDate] = useState(issueDate || '2026-10-17');
  const [editableRevision, setEditableRevision] = useState(revision ?? 0);
  const [editablePreparedBy, setEditablePreparedBy] = useState(preparedBy || 'Mazmur Gusti Agung Larosa');
  const [editableVerifiedBy, setEditableVerifiedBy] = useState(verifiedBy || 'Dennis Raditya');
  const [editableApprovedBy, setEditableApprovedBy] = useState(approvedBy || 'Bima Satryo Hartanto');
  const [editableRevisionDesc, setEditableRevisionDesc] = useState(
    revisions?.[0]?.description ||
      `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${code || '0001-KB-GNR-CEO-X-2026'})`
  );
  const [editableParagraphs, setEditableParagraphs] = useState<string[]>(preservedBodyParagraphs || []);
  const [editableTables, setEditableTables] = useState<DocxTableData[]>(bodyTables || []);
  const editableBodyRef = React.useRef<HTMLDivElement>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Synchronize state when props change and not actively in edit mode
  React.useEffect(() => {
    if (!isEditing) {
      setEditableTitle(title || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN');
      setEditableCode(code || '0001-KB-GNR-CEO-X-2026');
      setEditableIssueDate(issueDate || '2026-10-17');
      setEditableRevision(revision ?? 0);
      setEditablePreparedBy(preparedBy || 'Mazmur Gusti Agung Larosa');
      setEditableVerifiedBy(verifiedBy || 'Dennis Raditya');
      setEditableApprovedBy(approvedBy || 'Bima Satryo Hartanto');
      setEditableRevisionDesc(
        revisions?.[0]?.description ||
          `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${code || '0001-KB-GNR-CEO-X-2026'})`
      );
      setEditableParagraphs(preservedBodyParagraphs || []);
      setEditableTables(bodyTables || []);
    }
  }, [title, code, issueDate, revision, preparedBy, verifiedBy, approvedBy, revisions, preservedBodyParagraphs, bodyTables, isEditing]);

  const handleCellEdit = (tableIndex: number, rowIndex: number, cellIndex: number, value: string) => {
    setEditableTables((prev) => {
      const copy = prev.map((t, tIdx) => {
        if (tIdx !== tableIndex) return t;
        const newRows = t.rows.map((row, rIdx) => {
          if (rIdx !== rowIndex) return row;
          const newCells = [...row];
          newCells[cellIndex] = value;
          return newCells;
        });
        return { ...t, rows: newRows };
      });
      return copy;
    });
  };

  const handleInsertTable = () => {
    const newTable: DocxTableData = {
      rows: [
        ['No', 'Item / Klausul', 'Deskripsi Pelaksanaan', 'Status Verifikasi'],
        ['1', '1.0 Pemeriksaan Dokumen', 'Pemeriksaan kelengkapan berkas SOP', 'Memenuhi Syarat'],
        ['2', '2.0 Bukti Implementasi', 'Sampling rekaman kerja dan absensi', 'Sesuai Standar'],
      ],
    };
    setEditableTables((prev) => [...prev, newTable]);
  };

  const handleAddRow = () => {
    if (editableTables.length === 0) {
      handleInsertTable();
      return;
    }
    setEditableTables((prev) => {
      const copy = [...prev];
      const lastTbl = copy[copy.length - 1];
      const colCount = lastTbl.rows[0]?.length || 4;
      const newRow = Array(colCount).fill('Teks baris baru');
      copy[copy.length - 1] = {
        ...lastTbl,
        rows: [...lastTbl.rows, newRow],
      };
      return copy;
    });
  };

  const handleDeleteRow = () => {
    if (editableTables.length === 0) return;
    setEditableTables((prev) => {
      const copy = [...prev];
      const lastTbl = copy[copy.length - 1];
      if (lastTbl.rows.length <= 1) return prev;
      copy[copy.length - 1] = {
        ...lastTbl,
        rows: lastTbl.rows.slice(0, lastTbl.rows.length - 1),
      };
      return copy;
    });
  };

  const displayTitle = (isEditing ? editableTitle : title || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN').trim().toUpperCase();
  const effectiveCode = (isEditing ? editableCode : code || '0001-KB-GNR-CEO-X-2026').trim().toUpperCase();
  const effectivePreparedBy = isEditing ? editablePreparedBy : preparedBy || 'Mazmur Gusti Agung Larosa';
  const effectiveVerifiedBy = isEditing ? editableVerifiedBy : verifiedBy || 'Dennis Raditya';
  const effectiveApprovedBy = isEditing ? editableApprovedBy : approvedBy || 'Bima Satryo Hartanto';
  const effectiveRevision = isEditing ? editableRevision : revision ?? 0;
  const effectiveDateStr = isEditing ? editableIssueDate : issueDate;

  const formattedDate = React.useMemo(() => {
    try {
      const d = effectiveDateStr ? new Date(effectiveDateStr) : new Date();
      if (isNaN(d.getTime())) return '17 Oktober 2026';
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '17 Oktober 2026';
    }
  }, [effectiveDateStr]);

  const formattedDateEn = React.useMemo(() => {
    try {
      const d = effectiveDateStr ? new Date(effectiveDateStr) : new Date();
      if (isNaN(d.getTime())) return '17 October 2026';
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '17 October 2026';
    }
  }, [effectiveDateStr]);

  const effectiveRevisions: RevisionRecord[] = React.useMemo(() => {
    if (revisions && revisions.length > 0) {
      return [
        {
          ...revisions[0],
          revision: effectiveRevision,
          date: formattedDate,
          description: editableRevisionDesc || revisions[0].description,
          revisedBy: effectivePreparedBy,
        },
        ...revisions.slice(1),
      ];
    }
    return [
      {
        revision: effectiveRevision,
        date: formattedDate,
        description:
          editableRevisionDesc ||
          (language === 'en'
            ? `Initial Edition – Corporate Standard Document (${effectiveCode})`
            : language === 'bi'
            ? `Edisi Awal – Penerbitan Dokumen Standar / Initial Edition (${effectiveCode})`
            : `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${effectiveCode})`),
        revisedBy: effectivePreparedBy,
      },
    ];
  }, [revisions, effectiveRevision, formattedDate, language, effectiveCode, effectivePreparedBy, editableRevisionDesc]);

  const isProceduralDoc = React.useMemo(() => {
    if (categoryCode !== 'KB' && !effectiveCode.includes('-KB-')) return true;
    if (tocList && tocList.length > 0) return true;
    if (bodyPages && bodyPages.length > 0) return true;
    if (
      editableParagraphs &&
      editableParagraphs.length > 0 &&
      !editableParagraphs.some((p) => p.toUpperCase().includes('MENIMBANG'))
    ) {
      return true;
    }
    return false;
  }, [categoryCode, effectiveCode, tocList, bodyPages, editableParagraphs]);

  const effectiveTocList = React.useMemo(() => {
    if (tocList && tocList.length > 0) return tocList;
    if (editableParagraphs && editableParagraphs.length > 0) {
      const extracted: Array<{ num: string; title: string; isSub?: boolean }> = [];
      editableParagraphs.forEach((p) => {
        const m = p.trim().match(/^([0-9]+\.[0-9]+)\s+(.*)$/);
        if (m) {
          extracted.push({
            num: m[1],
            title: m[2],
            isSub: !m[1].endsWith('.0'),
          });
        }
      });
      if (extracted.length > 0) return extracted;
    }
    return [
      { num: '1.0', title: 'OBJECTIVE' },
      { num: '2.0', title: 'SCOPE' },
      { num: '3.0', title: 'RESPONSIBILITY' },
      { num: '4.0', title: 'DEFINITION' },
      { num: '5.0', title: 'PROCEDURE DETAILS' },
      { num: '5.1', title: 'General Provisions', isSub: true },
      { num: '5.2', title: 'Operational Flow', isSub: true },
      { num: '6.0', title: 'RELATED DOCUMENTS' },
      { num: '7.0', title: 'RECORDS' },
      { num: '8.0', title: 'ATTACHMENTS AND EMERGENCY INSTRUCTIONS' },
    ];
  }, [tocList, editableParagraphs]);

  const effectiveBodyPages: string[][] = React.useMemo(() => {
    if (bodyPages && bodyPages.length > 0) return bodyPages;
    if (editableParagraphs && editableParagraphs.length > 0) {
      const pages: string[][] = [];
      let currentPage: string[] = [];
      editableParagraphs.forEach((p, idx) => {
        currentPage.push(p);
        if (currentPage.length >= 7 || idx === editableParagraphs.length - 1) {
          pages.push(currentPage);
          currentPage = [];
        }
      });
      return pages.length > 0 ? pages : [editableParagraphs];
    }
    return [
      [
        '1.0 OBJECTIVE',
        'Menetapkan tata kelola standar operasional pada PT Nirwana Bhumi Energy agar seluruh aktivitas berjalan efisien, aman, dan mematuhi regulasi industri migas serta sistem manajemen mutu ISO 9001/14001/45001.',
        '2.0 SCOPE',
        'Prosedur ini mencakup seluruh unit operasional, teknik, pengadaan, dan administrasi korporat di wilayah kerja PT Nirwana Bhumi Energy termasuk operasional darat dan fasilitas pendukung lainnya.',
        '3.0 RESPONSIBILITY',
        'Seluruh personel pelaksana wajib memahami dan menerapkan instruksi kerja yang tercantum. Verifikator teknis bertanggung jawab atas kendali mutu dan kepatuhan sistem audit berkala.',
        '4.0 DEFINITION',
        'IMS (Integrated Management Systems): Sistem Manajemen Terintegrasi mutu, K3, dan lingkungan yang diadopsi PT Nirwana Bhumi Energy.',
        'DCC (Document Control Center): Unit pengelola registrasi, distribusi, dan pengarsipan naskah dokumen terkontrol.',
      ],
      [
        '5.0 PROCEDURE DETAILS',
        '5.1 General Provisions',
        'Setiap kegiatan wajib diawali dengan penilaian risiko (Job Safety Analysis) dan inspeksi berkala pada peralatan kerja serta verifikasi izin kerja berlaku.',
        '5.2 Operational Flow',
        'Pelaksanaan tugas operasional dilaporkan secara harian ke sistem pemantauan terpadu untuk menjamin kontinuitas data dan akurasi riwayat penanganan.',
        '6.0 RELATED DOCUMENTS',
        'Manual Sistem Manajemen Terintegrasi NBE-IMS-MAN-2026 dan Formulir Verifikasi Mutu Lapangan.',
        '7.0 RECORDS',
        'Seluruh catatan verifikasi, logbook inspeksi, dan berita acara disimpan dalam arsip terkontrol minimal selama 5 (lima) tahun.',
        '8.0 ATTACHMENTS AND EMERGENCY INSTRUCTIONS',
        'Instruksi tanggap darurat dan nomor kontak darurat tertera pada lampiran internal operasional.',
      ],
    ];
  }, [bodyPages, editableParagraphs]);

  const totalPages = isProceduralDoc ? 3 + effectiveBodyPages.length : 4;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(effectiveCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
    if (onCopyCode) onCopyCode();
  };

  const handleSave = () => {
    let finalParagraphs = editableParagraphs;
    if (editableBodyRef.current) {
      const pElements = Array.from(editableBodyRef.current.querySelectorAll('p'));
      if (pElements.length > 0) {
        finalParagraphs = pElements
          .map((el) => (el as HTMLElement).innerText.trim())
          .filter((t) => t.length > 0);
      } else {
        const textLines = editableBodyRef.current.innerText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (textLines.length > 0) {
          finalParagraphs = textLines;
        }
      }
      setEditableParagraphs(finalParagraphs);
    }

    const updatedRevs: RevisionRecord[] = [
      {
        revision: effectiveRevision,
        date: formattedDate,
        description: editableRevisionDesc,
        revisedBy: effectivePreparedBy,
      },
      ...(revisions && revisions.length > 1 ? revisions.slice(1) : []),
    ];

    if (onSaveDocument) {
      onSaveDocument({
        title: displayTitle,
        code: effectiveCode,
        issueDate: effectiveDateStr,
        revision: effectiveRevision,
        preparedBy: effectivePreparedBy,
        verifiedBy: effectiveVerifiedBy,
        approvedBy: effectiveApprovedBy,
        revisions: updatedRevs,
        preservedBodyParagraphs: finalParagraphs,
        bodyTables: editableTables,
      });
    }

    setIsEditing(false);
    setSaveSuccessNotice('Perubahan dokumen berhasil disimpan ke format Word & Pratinjau!');
    setTimeout(() => {
      setSaveSuccessNotice(null);
    }, 4000);
  };

  const handleCancelEdit = () => {
    setEditableTitle(title || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN');
    setEditableCode(code || '0001-KB-GNR-CEO-X-2026');
    setEditableIssueDate(issueDate || '2026-10-17');
    setEditableRevision(revision ?? 0);
    setEditablePreparedBy(preparedBy || 'Mazmur Gusti Agung Larosa');
    setEditableVerifiedBy(verifiedBy || 'Dennis Raditya');
    setEditableApprovedBy(approvedBy || 'Bima Satryo Hartanto');
    setEditableRevisionDesc(
      revisions?.[0]?.description ||
        `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${code || '0001-KB-GNR-CEO-X-2026'})`
    );
    setEditableParagraphs(preservedBodyParagraphs || []);
    setEditableTables(bodyTables || []);
    setIsEditing(false);
  };

  const handleDownloadWord = async () => {
    if (onDownloadDocx) {
      onDownloadDocx();
      return;
    }
    setIsDownloadingWord(true);
    try {
      let coverBuffer: ArrayBuffer | null = null;
      let kopBuffer: ArrayBuffer | null = null;
      if (coverLogoDataUrl) {
        try {
          const res = await fetch(coverLogoDataUrl);
          coverBuffer = await res.arrayBuffer();
        } catch (e) {
          console.warn('Could not convert coverLogoDataUrl to buffer:', e);
        }
      }
      if (kopLogoDataUrl) {
        try {
          const res = await fetch(kopLogoDataUrl);
          kopBuffer = await res.arrayBuffer();
        } catch (e) {
          console.warn('Could not convert kopLogoDataUrl to buffer:', e);
        }
      }

      await generateAndDownloadNbeDocx({
        docCode: effectiveCode,
        titleId: displayTitle,
        titleEn: displayTitle,
        categoryNameId: typeLabel,
        divisionName: divisionLabel,
        revisionNo: String(effectiveRevision),
        issueDateId: formattedDate,
        issueDateEn: formattedDateEn,
        preparedBy: effectivePreparedBy,
        preparedRole: 'Director of Finance & Engineering / DCC Lead',
        verifiedBy: effectiveVerifiedBy,
        verifiedRole: 'Director of Operations & Technology / CTO',
        approvedBy: effectiveApprovedBy,
        approvedRole: 'President Director / CEO',
        language: language,
        coverLogoBuffer: coverBuffer,
        kopLogoBuffer: kopBuffer,
        coverLogoWidthInches: coverLogoWidthInches || 3.2,
        kopLogoWidthInches: kopLogoWidthInches || 0.95,
        tocList: effectiveTocList,
        bodyPages: effectiveBodyPages,
        isProcedureOrSop: isProceduralDoc,
        preservedBodyParagraphs: editableParagraphs,
        bodyTables: editableTables,
      });
    } catch (err: any) {
      alert('Gagal mengunduh berkas Word (.docx): ' + err.message);
    } finally {
      setIsDownloadingWord(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanDocTitle = `${effectiveCode} - ${displayTitle}`;
    document.title = cleanDocTitle;

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);

    window.print();

    // Fallback timer if afterprint doesn't trigger
    setTimeout(() => {
      document.title = originalTitle;
    }, 2000);
  };

  const isPageVisibleOnScreen = (pageNum: number) => {
    return activePageTab === 'all' || activePageTab === pageNum;
  };

  // Reusable page frame styling (Exact A4 ratio: 210mm x 297mm)
  const a4PageStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '820px',
    minHeight: '1160px',
    margin: '0 auto 2.5rem auto',
    background: '#ffffff',
    color: '#3B3838',
    fontFamily: 'Arial, sans-serif',
    padding: '75px 75px 65px 83px', // Left: 2.2cm (~83px), Right/Top/Bottom: 2.0cm (~75px)
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
    borderRadius: '4px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    border: '1px solid #e2e8f0',
  };

  const tableHeaderStyle: React.CSSProperties = {
    background: '#D9E1F2',
    color: '#000000',
    fontWeight: 'bold',
    fontSize: '9.5pt',
    border: '1px solid #BFBFBF',
    padding: '7px 9px',
    textAlign: 'center',
    verticalAlign: 'middle',
  };

  const tableCellStyle: React.CSSProperties = {
    border: '1px solid #BFBFBF',
    padding: '7px 9px',
    fontSize: '9pt',
    verticalAlign: 'middle',
  };

  const renderSharedKopHeader = () => (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '1.5px solid #000000',
        marginBottom: '1.25rem',
        fontFamily: 'Arial, sans-serif',
        background: '#FFFFFF',
      }}
    >
      <tbody>
        <tr>
          <td
            rowSpan={3}
            style={{
              width: '24%',
              border: '1px solid #000000',
              padding: '6px 8px',
              textAlign: 'center',
              verticalAlign: 'middle',
            }}
          >
            {kopLogoDataUrl ? (
              <img
                src={kopLogoDataUrl}
                alt="Logo Kop NBE"
                style={{
                  width: kopLogoWidthInches ? `${kopLogoWidthInches}in` : '0.95in',
                  maxHeight: '44px',
                  objectFit: 'contain',
                  margin: '0 auto 4px auto',
                  display: 'block',
                }}
              />
            ) : (
              <img
                src="/+BG.png"
                alt="NBE"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/logo.png';
                }}
                style={{ maxHeight: '38px', maxWidth: '110px', objectFit: 'contain', margin: '0 auto' }}
              />
            )}
            <div style={{ fontSize: '8pt', fontWeight: 'bold', marginTop: '3px', color: '#3B3838' }}>
              PT Nirwana Bhumi Energy
            </div>
          </td>
          <td
            colSpan={2}
            style={{
              border: '1px solid #000000',
              padding: '5px 10px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '10pt',
              background: '#f8fafc',
            }}
          >
            {language === 'en'
              ? 'INTEGRATED MANAGEMENT SYSTEMS'
              : language === 'bi'
              ? 'SISTEM MANAJEMEN TERINTEGRASI / IMS'
              : 'SISTEM MANAJEMEN TERINTEGRASI'}
          </td>
        </tr>
        <tr>
          <td
            colSpan={2}
            style={{
              border: '1px solid #000000',
              padding: '4px 10px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '9pt',
              color: '#003366',
            }}
          >
            {typeLabel}
          </td>
        </tr>
        <tr>
          <td
            colSpan={2}
            style={{
              border: '1px solid #000000',
              padding: '5px 10px',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '10.5pt',
              color: '#000000',
              textTransform: 'uppercase',
            }}
          >
            {displayTitle}
          </td>
        </tr>
        <tr>
          <td
            style={{
              border: '1px solid #000000',
              padding: '4px 8px',
              fontSize: '8.5pt',
              fontWeight: 'bold',
              background: '#f1f5f9',
            }}
          >
            {isEditing ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span>{language === 'en' ? 'Rev:' : 'Revisi:'}</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={editableRevision}
                  onChange={(e) => setEditableRevision(parseInt(e.target.value) || 0)}
                  style={{
                    width: '45px',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '8.5pt',
                    fontWeight: 'bold',
                    border: '1px dashed #0284c7',
                    background: '#f0f9ff',
                    padding: '2px 4px',
                    borderRadius: '4px',
                  }}
                />
              </span>
            ) : (
              <>{language === 'en' ? 'Revision:' : 'Revisi:'} {effectiveRevision}</>
            )}
          </td>
          <td
            style={{
              border: '1px solid #000000',
              padding: '4px 8px',
              fontSize: '8.5pt',
            }}
          >
            <strong>{language === 'en' ? 'Number:' : 'Nomor:'}</strong> {effectiveCode}
          </td>
          <td
            style={{
              border: '1px solid #000000',
              padding: '4px 8px',
              fontSize: '8.5pt',
              textAlign: 'right',
            }}
          >
            <strong>{language === 'en' ? 'Date:' : 'Tanggal:'}</strong> {language === 'en' ? formattedDateEn : formattedDate}
          </td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div
      style={{
        margin: '1.5rem 0',
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}
    >
      {/* Top Preview Action Header (Hidden during print) */}
      <div
        className="no-print"
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
          background: 'var(--bg-card, #ffffff)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              background: 'rgba(0, 51, 102, 0.1)',
              color: '#003366',
              display: 'flex',
            }}
          >
            <Eye size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                }}
              >
                Real-Time Document Preview (Skala Kertas A4 Nyata)
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  background:
                    language === 'id'
                      ? '#ecfdf5'
                      : language === 'en'
                      ? '#eff6ff'
                      : '#fdf4ff',
                  color:
                    language === 'id'
                      ? '#059669'
                      : language === 'en'
                      ? '#2563eb'
                      : '#9333ea',
                  fontWeight: 700,
                  border: '1px solid currentColor',
                }}
              >
                {language === 'id' && '🇮🇩 Bahasa Indonesia (4 Halaman)'}
                {language === 'en' && '🇬🇧 British English (4 Pages)'}
                {language === 'bi' && '🌐 Bilingual (ID - EN 4 Pages)'}
              </span>
            </div>
            <p
              style={{
                margin: '0.15rem 0 0 0',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
              }}
            >
              Mereplikasi 100% tata letak visual baku, kop, tabel revisi bersih, dan tanda tangan 3-kolom.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Edit / Save Document Buttons */}
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#f0fdf4',
                borderColor: '#86efac',
                color: '#166534',
                fontWeight: 700,
              }}
              title="Edit teks dokumen langsung pada lembar pratinjau ini"
            >
              <Edit3 size={14} />
              <span>Edit Dokumen</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: '#fef2f2',
                  borderColor: '#fca5a5',
                  color: '#991b1b',
                  fontWeight: 600,
                }}
                title="Batal mengedit dokumen"
              >
                <X size={14} />
                <span>Batal Edit</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  borderColor: '#059669',
                  color: '#ffffff',
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                }}
                title="Simpan perubahan dokumen ke Word dan Pratinjau"
              >
                <Save size={14} />
                <span>Simpan Perubahan</span>
              </button>
            </>
          )}

          {/* Copy Code Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: isCopied ? '#ecfdf5' : undefined,
              borderColor: isCopied ? '#10b981' : undefined,
              color: isCopied ? '#059669' : undefined,
            }}
            title="Salin Kode Dokumen Unik"
          >
            {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{isCopied ? 'Tersalin!' : 'Salin Kode'}</span>
          </button>

          {/* Download DOCX */}
          <button
            type="button"
            onClick={handleDownloadWord}
            disabled={isDownloadingWord}
            className="btn btn-primary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'linear-gradient(135deg, #003366 0%, #004080 100%)',
            }}
            title="Unduh Dokumen Word 4 Halaman Resmi"
          >
            <Download size={14} />
            <span>{isDownloadingWord ? 'Menyusun .docx...' : 'Unduh Word (.docx)'}</span>
          </button>

          {/* Print / Save PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Cetak atau Simpan PDF format A4"
          >
            <Printer size={14} />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Toast Save Notification */}
      {saveSuccessNotice && (
        <div
          className="no-print"
          style={{
            padding: '0.65rem 1.25rem',
            background: '#ecfdf5',
            color: '#065f46',
            borderBottom: '1px solid #a7f3d0',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={16} color="#059669" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* MICROSOFT WORD RIBBON BAR (SESUAI FOTO MS WORD PENGGUNA) */}
      {isEditing && (
        <WordRibbonBar
          onSave={handleSave}
          onCancel={handleCancelEdit}
          onInsertTable={handleInsertTable}
          onAddRow={handleAddRow}
          onDeleteRow={handleDeleteRow}
        />
      )}

      {/* Page Selector Tabs (Hidden during print) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.65rem 1.25rem',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            marginRight: '0.4rem',
            textTransform: 'uppercase',
          }}
        >
          Halaman:
        </span>
        {[
          { id: 'all', label: `Semua (${totalPages} Halaman)` },
          { id: 1, label: 'Hal 1: Cover Page' },
          { id: 2, label: 'Hal 2: Revision Index' },
          ...(isProceduralDoc
            ? [
                { id: 3, label: 'Hal 3: Table of Contents' },
                ...effectiveBodyPages.map((_, idx) => ({
                  id: 4 + idx,
                  label: `Hal ${4 + idx}: Isi Dokumen (Bag. ${idx + 1})`,
                })),
              ]
            : [
                { id: 3, label: 'Hal 3: Konsiderans SK' },
                { id: 4, label: 'Hal 4: DCC & Tanda Tangan' },
              ]),
        ].map((tab) => (
          <button
            key={String(tab.id)}
            type="button"
            onClick={() => setActivePageTab(tab.id as any)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: activePageTab === tab.id ? 700 : 500,
              border: activePageTab === tab.id ? '1px solid #003366' : '1px solid transparent',
              background: activePageTab === tab.id ? '#003366' : 'transparent',
              color: activePageTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preview Pages Container (Isolated during print) */}
      <div
        id="nbe-single-a4-preview-canvas"
        className="a4-print-container"
        style={{
          padding: '2.5rem 1rem',
          background: 'var(--bg-tertiary, #e2e8f0)',
          overflowY: 'auto',
          maxHeight: '900px',
        }}
      >
        {/* ============================================================== */}
        {/* HALAMAN 1: COVER PAGE                                         */}
        {/* ============================================================== */}
        <div
          style={a4PageStyle}
          id="nbe-page-1"
          className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(1) ? 'screen-hidden' : ''}`}
        >
            {/* Header / Logo Center (width: 1.85 inci / 4.7 cm) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                marginTop: '1.5rem',
              }}
            >
              {coverLogoDataUrl ? (
                <img
                  src={coverLogoDataUrl}
                  alt="Logo Cover NBE"
                  style={{
                    width: coverLogoWidthInches ? `${coverLogoWidthInches}in` : '3.2in',
                    maxHeight: '130px',
                    objectFit: 'contain',
                    marginBottom: '1rem',
                  }}
                />
              ) : (
                <img
                  src="/+BG.png"
                  alt="PT Nirwana Bhumi Energy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/logo.png';
                  }}
                  style={{
                    width: '4.7cm',
                    height: 'auto',
                    objectFit: 'contain',
                    marginBottom: '1rem',
                  }}
                />
              )}
              <div
                style={{
                  fontSize: '20pt',
                  fontWeight: 'bold',
                  color: '#000000',
                  letterSpacing: '0.04em',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                PT NIRWANA BHUMI ENERGY
              </div>
            </div>

            {/* Title Block */}
            <div
              style={{
                textAlign: 'center',
                marginTop: '3.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              {/* Category / Document Type Header */}
              <div
                style={{
                  fontSize: '13pt',
                  fontWeight: 'bold',
                  color: '#003366',
                  letterSpacing: '0.05em',
                  fontFamily: 'Arial, sans-serif',
                  textTransform: 'uppercase',
                }}
              >
                {categoryCode === 'KB' || effectiveCode.includes('-KB-')
                  ? (language === 'en'
                    ? "BOARD OF DIRECTORS' RESOLUTION"
                    : language === 'bi'
                    ? "SURAT KEPUTUSAN DIREKSI / BOARD OF DIRECTORS' RESOLUTION"
                    : 'SURAT KEPUTUSAN DIREKSI')
                  : typeLabel}
              </div>

              {isEditing ? (
                <div style={{ padding: '0 1.5rem', textAlign: 'center' }}>
                  <label style={{ fontSize: '8pt', color: '#0284c7', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    EDIT JUDUL DOKUMEN:
                  </label>
                  <textarea
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value.toUpperCase())}
                    rows={2}
                    style={{
                      width: '100%',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '13.5pt',
                      fontWeight: 'bold',
                      color: '#000000',
                      textAlign: 'center',
                      border: '1.5px dashed #0284c7',
                      background: '#f0f9ff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '15pt',
                    fontWeight: 'bold',
                    color: '#000000',
                    padding: '0 1.5rem',
                    lineHeight: '1.35',
                    letterSpacing: '0.02em',
                  }}
                >
                  {categoryCode === 'KB' || effectiveCode.includes('-KB-')
                    ? `${language === 'en' ? 'REGARDING:' : language === 'bi' ? 'TENTANG / REGARDING:' : 'TENTANG:'} ${displayTitle}`
                    : displayTitle}
                </div>
              )}

              {isEditing ? (
                <div style={{ marginTop: '0.4rem', textAlign: 'center' }}>
                  <label style={{ fontSize: '8pt', color: '#0284c7', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    EDIT NOMOR / KODE DOKUMEN:
                  </label>
                  <input
                    type="text"
                    value={editableCode}
                    onChange={(e) => setEditableCode(e.target.value.toUpperCase())}
                    style={{
                      width: '320px',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '10.5pt',
                      fontWeight: 'bold',
                      color: '#003366',
                      textAlign: 'center',
                      border: '1.5px dashed #0284c7',
                      background: '#f0f9ff',
                      padding: '4px 8px',
                      borderRadius: '6px',
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '11pt',
                    fontWeight: 'bold',
                    color: '#003366',
                    letterSpacing: '0.06em',
                    marginTop: '0.5rem',
                  }}
                >
                  {language === 'en' ? 'NUMBER:' : 'NOMOR:'} {effectiveCode}
                </div>
              )}
            </div>

            {/* Vertical spacer to push authorization block to bottom right */}
            <div style={{ flex: 1, minHeight: '1.5rem' }} />

            {/* Blok Otorisasi Ujung Kanan Bawah (proporsional & kompak) */}
            <div
              style={{
                alignSelf: 'flex-end',
                width: '270px',
                borderLeft: '1.5px solid #003366',
                paddingLeft: '0.65rem',
                marginBottom: '1rem',
                fontSize: '8pt',
                color: '#3B3838',
                lineHeight: 1.25,
              }}
            >
              <div style={{ marginBottom: '0.35rem' }}>
                <div style={{ fontWeight: 'bold', color: '#000000', fontSize: '7.8pt' }}>
                  {language === 'en' ? 'Approved by:' : 'Approved by (Disetujui):'}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editableApprovedBy}
                    onChange={(e) => setEditableApprovedBy(e.target.value)}
                    style={{
                      width: '100%',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '8.2pt',
                      fontWeight: 'bold',
                      color: '#003366',
                      border: '1px dashed #0284c7',
                      background: '#f0f9ff',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      marginTop: '1px',
                      height: '21px',
                      boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <div style={{ fontWeight: 'bold', color: '#003366', fontSize: '8.5pt', marginTop: '1px' }}>
                    {effectiveApprovedBy}
                  </div>
                )}
                <div style={{ fontSize: '7.2pt', color: '#64748b', marginTop: '0.5px' }}>
                  President Director (CEO)
                </div>
              </div>

              <div style={{ marginBottom: '0.35rem' }}>
                <div style={{ fontWeight: 'bold', color: '#000000', fontSize: '7.8pt' }}>
                  {language === 'en' ? 'Verified by:' : 'Verified by (Diverifikasi):'}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editableVerifiedBy}
                    onChange={(e) => setEditableVerifiedBy(e.target.value)}
                    style={{
                      width: '100%',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '8.2pt',
                      fontWeight: 'bold',
                      color: '#003366',
                      border: '1px dashed #0284c7',
                      background: '#f0f9ff',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      marginTop: '1px',
                      height: '21px',
                      boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <div style={{ fontWeight: 'bold', color: '#003366', fontSize: '8.5pt', marginTop: '1px' }}>
                    {effectiveVerifiedBy}
                  </div>
                )}
                <div style={{ fontSize: '7.2pt', color: '#64748b', marginTop: '0.5px' }}>
                  Technical Director (CTO)
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 'bold', color: '#000000', fontSize: '7.8pt' }}>
                  {language === 'en' ? 'Prepared by:' : 'Prepared by (Disiapkan):'}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editablePreparedBy}
                    onChange={(e) => setEditablePreparedBy(e.target.value)}
                    style={{
                      width: '100%',
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '8.2pt',
                      fontWeight: 'bold',
                      color: '#003366',
                      border: '1px dashed #0284c7',
                      background: '#f0f9ff',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      marginTop: '1px',
                      height: '21px',
                      boxSizing: 'border-box',
                    }}
                  />
                ) : (
                  <div style={{ fontWeight: 'bold', color: '#003366', fontSize: '8.5pt', marginTop: '1px' }}>
                    {effectivePreparedBy}
                  </div>
                )}
                <div style={{ fontSize: '7.2pt', color: '#64748b', marginTop: '0.5px' }}>
                  Lead Document Controller & Finance Director
                </div>
              </div>
            </div>

            {/* Page Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.5rem',
                fontSize: '8pt',
                color: '#94a3b8',
              }}
            >
              <span>PT Nirwana Bhumi Energy | Corporate Document Management System</span>
              <span>Page 1 of {totalPages}</span>
            </div>
          </div>

        {/* ============================================================== */}
        {/* HALAMAN 2: REVISION INDEX (BERSIH TANPA KENDALI DOKUMEN)        */}
        {/* ============================================================== */}
        <div
          style={a4PageStyle}
          id="nbe-page-2"
          className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(2) ? 'screen-hidden' : ''}`}
        >
            {/* Header Kop Resmi NBE via Shared Kop Header (Poin 7) */}
            {renderSharedKopHeader()}

            {/* Judul REVISION INDEX Ditebalkan (Arial 12 pt Bold Centered) */}
            <div
              style={{
                textAlign: 'center',
                margin: '18pt 0 12pt 0',
                fontSize: '12pt',
                fontWeight: 'bold',
                color: '#000000',
                letterSpacing: '0.08em',
              }}
            >
              {language === 'en' ? 'REVISION INDEX' : 'TABEL INDEKS REVISI / REVISION INDEX'}
            </div>

            {/* Tabel Revision Index (4 Kolom, Header #D9E1F2) */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #BFBFBF',
                marginBottom: '2rem',
              }}
            >
              <thead>
                <tr>
                  <th style={{ ...tableHeaderStyle, width: '10%' }}>
                    {language === 'en' ? 'Rev' : 'Revisi'}
                  </th>
                  <th style={{ ...tableHeaderStyle, width: '22%' }}>
                    {language === 'en' ? 'Date' : 'Tanggal'}
                  </th>
                  <th style={{ ...tableHeaderStyle, width: '48%' }}>
                    {language === 'en' ? 'Description of Changes' : 'Deskripsi Perubahan'}
                  </th>
                  <th style={{ ...tableHeaderStyle, width: '20%' }}>
                    {language === 'en' ? 'Prepared By' : 'Disusun Oleh'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isEditing ? (
                  <tr style={{ background: '#F0F9FF' }}>
                    <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold' }}>
                      {editableRevision}
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                      {formattedDate}
                    </td>
                    <td style={tableCellStyle}>
                      <textarea
                        value={editableRevisionDesc}
                        onChange={(e) => setEditableRevisionDesc(e.target.value)}
                        rows={2}
                        style={{
                          width: '100%',
                          fontFamily: 'Arial, sans-serif',
                          fontSize: '8.5pt',
                          border: '1px dashed #0284c7',
                          background: '#ffffff',
                          padding: '4px',
                          borderRadius: '4px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </td>
                    <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                      {effectivePreparedBy}
                    </td>
                  </tr>
                ) : (
                  effectiveRevisions.map((rev, idx) => (
                    <tr
                      key={idx}
                      style={{
                        background: idx % 2 === 0 ? '#FFFFFF' : '#F9FBFD',
                      }}
                    >
                      <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold' }}>
                        {rev.revision}
                      </td>
                      <td style={{ ...tableCellStyle, textAlign: 'center' }}>{rev.date}</td>
                      <td style={tableCellStyle}>{rev.description}</td>
                      <td style={{ ...tableCellStyle, textAlign: 'center' }}>{rev.revisedBy}</td>
                    </tr>
                  ))
                )}
                {/* Baris kosong cadangan untuk revisi selanjutnya */}
                <tr style={{ background: '#FFFFFF' }}>
                  <td style={{ ...tableCellStyle, textAlign: 'center', color: '#94a3b8' }}>-</td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', color: '#94a3b8' }}>-</td>
                  <td style={{ ...tableCellStyle, color: '#94a3b8', fontStyle: 'italic' }}>
                    {language === 'en'
                      ? 'Reserved for subsequent revision log'
                      : 'Disediakan untuk catatan revisi lanjutan'}
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', color: '#94a3b8' }}>-</td>
                </tr>
              </tbody>
            </table>

            <div style={{ flex: 1 }} />

            {/* Note: Catatan Kendali Dokumen DITIADAKAN SEPENUHNYA agar Halaman 2 Bersih */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.5rem',
                fontSize: '8pt',
                color: '#94a3b8',
              }}
            >
              <span>{effectiveCode} | PT Nirwana Bhumi Energy</span>
              <span>Page 2 of {totalPages}</span>
            </div>
          </div>

        {isProceduralDoc ? (
          <>
            {/* ============================================================== */}
            {/* HALAMAN 3: TABLE OF CONTENTS (KHUSUS 1 HALAMAN TERSENDIRI - POIN 8) */}
            {/* ============================================================== */}
            <div
              style={a4PageStyle}
              id="nbe-page-3"
              className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(3) ? 'screen-hidden' : ''}`}
            >
              {/* Header Kop Resmi NBE via Shared Kop Header (Poin 7) */}
              {renderSharedKopHeader()}

              <div style={{ textAlign: 'center', margin: '1.25rem 0' }}>
                <h4 style={{ fontSize: '13pt', fontWeight: 'bold', color: '#000000', margin: 0, textTransform: 'uppercase' }}>
                  TABLE OF CONTENTS
                </h4>
              </div>

              <div
                contentEditable={isEditing}
                suppressContentEditableWarning
                style={{
                  marginTop: '1.5rem',
                  marginBottom: '2rem',
                  outline: isEditing ? '1px dashed #0284c7' : 'none',
                  padding: isEditing ? '0.5rem' : '0',
                  borderRadius: '4px',
                  background: isEditing ? 'rgba(2, 132, 199, 0.02)' : 'transparent',
                }}
              >
                {effectiveTocList.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      paddingLeft: item.isSub ? '0.5in' : '0',
                      fontWeight: item.isSub ? 'normal' : 'bold',
                      color: item.isSub ? '#3B3838' : '#000000',
                      marginBottom: '0.45rem',
                      fontSize: '10.5pt',
                    }}
                  >
                    {/* Tab Stop 0.5 inci agar nomor dan judul bab tidak menempel (Poin 8) */}
                    <span style={{ display: 'inline-block', width: '0.5in', flexShrink: 0 }}>
                      {item.num}
                    </span>
                    <span>{item.title}</span>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1 }} />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '0.5rem',
                  fontSize: '8pt',
                  color: '#94a3b8',
                }}
              >
                <span>{effectiveCode} | PT Nirwana Bhumi Energy</span>
                <span>Page 3 of {totalPages}</span>
              </div>
            </div>

            {/* ============================================================== */}
            {/* HALAMAN 4+: ISI DOKUMEN PROSEDUR (POIN 6: TANPA LEMBAR VALIDASI) */}
            {/* ============================================================== */}
            {effectiveBodyPages.map((pageLines, pageIdx) => {
              const pageNum = 4 + pageIdx;
              return (
                <div
                  key={pageIdx}
                  style={a4PageStyle}
                  id={`nbe-page-${pageNum}`}
                  className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(pageNum) ? 'screen-hidden' : ''}`}
                >
                  {/* Header Kop Resmi NBE via Shared Kop Header (Poin 7) */}
                  {renderSharedKopHeader()}

                  <div
                    contentEditable={isEditing}
                    suppressContentEditableWarning
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '10pt',
                      color: '#3B3838',
                      outline: isEditing ? '1px dashed #0284c7' : 'none',
                      background: isEditing ? 'rgba(2, 132, 199, 0.02)' : 'transparent',
                      padding: isEditing ? '0.5rem' : '0',
                      borderRadius: '4px',
                      minHeight: '200px',
                    }}
                  >
                    {pageLines.map((line, lIdx) => {
                      const matchH = line.trim().match(/^([0-9]+\.[0-9]+)\s+(.*)$/);
                      if (matchH) {
                        const [, numPart, titlePart] = matchH;
                        const isMainH = numPart.endsWith('.0');
                        return (
                          <div
                            key={lIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              fontWeight: 'bold',
                              color: '#000000',
                              paddingTop: isMainH ? '0.75rem' : '0.4rem',
                              marginBottom: '0.3rem',
                              fontSize: isMainH ? '11pt' : '10.5pt',
                            }}
                          >
                            <span style={{ display: 'inline-block', width: '0.5in', flexShrink: 0 }}>
                              {numPart}
                            </span>
                            <span>{titlePart}</span>
                          </div>
                        );
                      }
                      return (
                        <p
                          key={lIdx}
                          style={{
                            paddingLeft: '0.5in',
                            textAlign: 'justify',
                            lineHeight: 1.6,
                            marginBottom: '0.5rem',
                          }}
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>

                  <div style={{ flex: 1 }} />

                  {/* Catatan Poin 6: DOKUMEN LANGSUNG SELESAI, TANPA LEMBAR OTORISASI & VALIDASI AKHIR! */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '0.5rem',
                      fontSize: '8pt',
                      color: '#94a3b8',
                    }}
                  >
                    <span>{effectiveCode} | PT Nirwana Bhumi Energy</span>
                    <span>Page {pageNum} of {totalPages}</span>
                  </div>
                </div>
              );
            })}
          </>
        ) : (
          <>
            {/* ============================================================== */}
            {/* HALAMAN 3: PERMULAAN ISI SURAT (LETTER BODY & KESATU)          */}
            {/* ============================================================== */}
            <div
              style={a4PageStyle}
              id="nbe-page-3"
              className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(3) ? 'screen-hidden' : ''}`}
            >
            {/* Header Kop Resmi NBE via Shared Kop Header (Poin 7) */}
            {renderSharedKopHeader()}

            {/* Judul Resmi Dokumen */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#000000', textTransform: 'uppercase' }}>
                {categoryCode === 'KB' || effectiveCode.includes('-KB-')
                  ? (language === 'en'
                    ? "BOARD OF DIRECTORS' RESOLUTION OF PT NIRWANA BHUMI ENERGY"
                    : language === 'bi'
                    ? "KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY / BOARD RESOLUTION"
                    : 'KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY')
                  : displayTitle}
              </div>
              <div style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#003366', marginTop: '4px' }}>
                {language === 'en' ? 'NUMBER:' : 'NOMOR:'} {effectiveCode}
              </div>
              {(categoryCode === 'KB' || effectiveCode.includes('-KB-')) && (
                <>
                  <div style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#000000', marginTop: '4px' }}>
                    {language === 'en' ? 'REGARDING:' : 'TENTANG:'} {displayTitle}
                  </div>
                  <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#000000', marginTop: '14px' }}>
                    {language === 'en'
                      ? 'THE BOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY,'
                      : 'DIREKSI PT NIRWANA BHUMI ENERGY,'}
                  </div>
                </>
              )}
            </div>

            {/* OPSI BODY KONTEN: TABEL ASLI, PARAGRAF ASLI, ATAU TEMPLATE SK */}
            {editableTables && editableTables.length > 0 ? (
              <div
                ref={editableBodyRef}
                style={{
                  outline: isEditing ? '2px dashed #0284c7' : 'none',
                  background: isEditing ? 'rgba(2, 132, 199, 0.04)' : 'transparent',
                  padding: isEditing ? '0.75rem' : '0',
                  borderRadius: '6px',
                  minHeight: '260px',
                }}
              >
                {/* Paragraf pendukung jika ada */}
                {editableParagraphs && editableParagraphs.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    {editableParagraphs.map((paraText, pIdx) => {
                      const isHeading =
                        /^[0-9]+\.[0-9]+/.test(paraText.trim()) ||
                        /^[A-Z0-9\s:/-]{4,}$/.test(paraText.trim());
                      return (
                        <p
                          key={pIdx}
                          contentEditable={isEditing}
                          suppressContentEditableWarning
                          style={{
                            fontFamily: 'Arial, sans-serif',
                            fontWeight: isHeading ? 700 : 400,
                            color: isHeading ? '#000000' : '#3B3838',
                            fontSize: isHeading ? '11pt' : '10pt',
                            marginLeft: isHeading ? 0 : '0.5in',
                            textAlign: isHeading ? 'left' : 'justify',
                            lineHeight: '1.5',
                            marginBottom: isHeading ? '0.5rem' : '0.45rem',
                            marginTop: isHeading ? '0.75rem' : '0',
                          }}
                        >
                          {paraText}
                        </p>
                      );
                    })}
                  </div>
                )}

                {/* Tabel asli berkas pengguna */}
                {editableTables.map((tbl, tIdx) => (
                  <div key={tIdx} style={{ marginBottom: '1.25rem', overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: '1px solid #BFBFBF',
                        fontSize: '8.5pt',
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      <tbody>
                        {tbl.rows.map((row, rIdx) => {
                          const isHeader = rIdx === 0;
                          return (
                            <tr
                              key={rIdx}
                              style={{
                                background: isHeader ? '#D9E1F2' : rIdx % 2 === 0 ? '#FFFFFF' : '#F9FBFD',
                                fontWeight: isHeader ? 'bold' : 'normal',
                                color: isHeader ? '#000000' : '#3B3838',
                              }}
                            >
                              {row.map((cellText, cIdx) => (
                                <td
                                  key={cIdx}
                                  contentEditable={isEditing}
                                  suppressContentEditableWarning
                                  onBlur={(e) => {
                                    if (isEditing) {
                                      handleCellEdit(tIdx, rIdx, cIdx, e.currentTarget.innerText.trim());
                                    }
                                  }}
                                  style={{
                                    border: '1px solid #BFBFBF',
                                    padding: '6px 8px',
                                    textAlign: isHeader ? 'center' : (cIdx === 0 && row.length > 3 ? 'center' : 'left'),
                                    outline: isEditing ? '1px dashed #0284c7' : 'none',
                                  }}
                                >
                                  {cellText}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : editableParagraphs && editableParagraphs.length > 0 ? (
              <div
                ref={editableBodyRef}
                contentEditable={isEditing}
                suppressContentEditableWarning
                style={{
                  outline: isEditing ? '2px dashed #0284c7' : 'none',
                  background: isEditing ? 'rgba(2, 132, 199, 0.04)' : 'transparent',
                  padding: isEditing ? '0.75rem' : '0',
                  borderRadius: '6px',
                  minHeight: '260px',
                }}
              >
                {editableParagraphs.map((paraText, pIdx) => {
                  const isHeading =
                    /^[0-9]+\.[0-9]+/.test(paraText.trim()) ||
                    /^[A-Z0-9\s:/-]{4,}$/.test(paraText.trim());
                  return (
                    <p
                      key={pIdx}
                      style={{
                        fontFamily: 'Arial, sans-serif',
                        fontWeight: isHeading ? 700 : 400,
                        color: isHeading ? '#000000' : '#3B3838',
                        fontSize: isHeading ? '11pt' : '10pt',
                        marginLeft: isHeading ? 0 : '0.5in',
                        textAlign: isHeading ? 'left' : 'justify',
                        lineHeight: '1.5',
                        marginBottom: isHeading ? '0.5rem' : '0.45rem',
                        marginTop: isHeading ? '0.75rem' : '0',
                      }}
                    >
                      {paraText}
                    </p>
                  );
                })}
              </div>
            ) : (categoryCode === 'KB' || effectiveCode.includes('-KB-')) ? (
              language === 'bi' ? (
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1.25rem',
                    fontSize: '8pt',
                    lineHeight: '1.45',
                    outline: isEditing ? '1px dashed #0284c7' : 'none',
                    background: isEditing ? 'rgba(2, 132, 199, 0.02)' : 'transparent',
                    padding: isEditing ? '0.5rem' : '0',
                    borderRadius: '4px',
                  }}
                >
                  {/* Kolom Kiri: Bahasa Indonesia */}
                  <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '1rem' }}>
                    <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.2rem' }}>
                      Menimbang:
                    </div>
                    <ol style={{ paddingLeft: '1.1rem', margin: '0 0 0.6rem 0' }} type="a">
                      <li>
                        bahwa dalam rangka mewujudkan standarisasi, akuntabilitas, serta keterlacakan seluruh dokumen di lingkungan PT Nirwana Bhumi Energy, diperlukan sistem tata kelola dan kontrol dokumen yang baku dan terintegrasi;
                      </li>
                      <li>
                        bahwa guna menjamin kepatuhan terhadap standar IMS (ISO 9001, ISO 14001, ISO 45001) dan CSMS SKK Migas serta PLN, diperlukan penunjukan personel Tim DCC;
                      </li>
                      <li>
                        bahwa berdasarkan pertimbangan a dan b, perlu menetapkan Surat Keputusan Direksi tentang {displayTitle}.
                      </li>
                    </ol>

                    <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.2rem' }}>
                      Mengingat:
                    </div>
                    <ol style={{ paddingLeft: '1.1rem', margin: '0 0 0.6rem 0' }}>
                      <li>Akta Pendirian PT Nirwana Bhumi Energy;</li>
                      <li>Standar ISO 9001:2015 Klausul 7.5 (Documented Information);</li>
                      <li>Pedoman CSMS SKK Migas & PT PLN (Persero);</li>
                      <li>Prosedur Baku No. 0001-SOP-GNR-CEO-IX-2026;</li>
                      <li>Kebijakan Manajemen Terintegrasi No. 0001-KB-GNR-CEO-X-2026.</li>
                    </ol>

                    <div style={{ fontWeight: 'bold', textAlign: 'center', margin: '0.5rem 0' }}>
                      MEMUTUSKAN:
                    </div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.35rem' }}>
                      Menetapkan: SURAT KEPUTUSAN DIREKSI TENTANG {displayTitle.toUpperCase()}.
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#003366' }}>KESATU:</div>
                    <p style={{ margin: '0 0 0.4rem 0' }}>
                      Memberlakukan Standar Penomoran Dokumen 6 Segmen: <strong>[NomorUrut4Digit]-[Kategori]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun]</strong>. Asas mutlak: <strong>SATU KODE UNTUK SATU DOKUMEN (1 Kode = 1 Dokumen Sah)</strong>. Duplikasi nomor dokumen dilarang keras.
                    </p>
                  </div>

                  {/* Kolom Kanan: British English */}
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.2rem' }}>
                      Having Considered:
                    </div>
                    <ol style={{ paddingLeft: '1.1rem', margin: '0 0 0.6rem 0', fontStyle: 'italic' }} type="a">
                      <li>
                        that in order to achieve standardisation, accountability, and traceability of all documents within PT Nirwana Bhumi Energy, a standardised and integrated document control system is required;
                      </li>
                      <li>
                        that to ensure compliance with IMS standards (ISO 9001, ISO 14001, ISO 45001) and CSMS qualifications of SKK Migas and PLN, the appointment of a DCC Team is requisite;
                      </li>
                      <li>
                        that based on considerations a and b, it is necessary to enact this Board of Directors' Resolution regarding {displayTitle}.
                      </li>
                    </ol>

                    <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.2rem' }}>
                      In View Of:
                    </div>
                    <ol style={{ paddingLeft: '1.1rem', margin: '0 0 0.6rem 0', fontStyle: 'italic' }}>
                      <li>The Deed of Establishment of PT Nirwana Bhumi Energy;</li>
                      <li>International Standard ISO 9001:2015 Clause 7.5;</li>
                      <li>CSMS Guidelines of SKK Migas & PT PLN (Persero);</li>
                      <li>Standard Operating Procedure No. 0001-SOP-GNR-CEO-IX-2026;</li>
                      <li>Integrated Management Policy No. 0001-KB-GNR-CEO-X-2026.</li>
                    </ol>

                    <div style={{ fontWeight: 'bold', textAlign: 'center', margin: '0.5rem 0' }}>
                      HEREBY RESOLVES:
                    </div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.35rem', fontStyle: 'italic' }}>
                      To Enact: BOARD OF DIRECTORS' RESOLUTION CONCERNING {displayTitle.toUpperCase()}.
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#003366' }}>FIRST:</div>
                    <p style={{ margin: '0 0 0.4rem 0', fontStyle: 'italic' }}>
                      To officially enact the 6-Segment Document Numbering System: <strong>[4DigitSequentialNo]-[DocCategory]-[Division]-[Authoriser]-[RomanMonth]-[Year]</strong>. Strict principle: <strong>ONE CODE FOR ONE DOCUMENT (1 Code = 1 Valid Document)</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  style={{
                    fontSize: '9pt',
                    lineHeight: '1.5',
                    color: '#3B3838',
                    outline: isEditing ? '1px dashed #0284c7' : 'none',
                    background: isEditing ? 'rgba(2, 132, 199, 0.02)' : 'transparent',
                    padding: isEditing ? '0.5rem' : '0',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'Having Considered:' : 'Menimbang:'}
                  </div>
                  <ol style={{ paddingLeft: '1.4rem', margin: '0 0 0.8rem 0' }} type="a">
                    <li>
                      {language === 'en'
                        ? 'that in order to achieve standardisation, accountability, and traceability of all corporate policy documents, standard operating procedures, work instructions, and technical forms within PT Nirwana Bhumi Energy, a standardised and integrated document governance and control system is required;'
                        : 'bahwa dalam rangka mewujudkan standarisasi, akuntabilitas, serta keterlacakan seluruh dokumen kebijakan, prosedur operasional, instruksi kerja, dan formulir teknis di lingkungan PT Nirwana Bhumi Energy, diperlukan suatu sistem tata kelola dan kontrol dokumen yang baku dan terintegrasi;'}
                    </li>
                    <li>
                      {language === 'en'
                        ? 'that to ensure comprehensive compliance with Integrated Management System (IMS) standards based on ISO 9001:2015, ISO 14001:2015, ISO 45001:2018, and Contractor Safety Management System (CSMS) qualifications of SKK Migas and PT PLN (Persero), the appointment of personnel responsible for document management is requisite;'
                        : 'bahwa guna menjamin kepatuhan menyeluruh terhadap standar Sistem Manajemen Terintegrasi (IMS) berbasis ISO 9001:2015, ISO 14001:2015, ISO 45001:2018, dan kualifikasi Contractor Safety Management System (CSMS) SKK Migas serta PLN, diperlukan penunjukan personel penanggung jawab pengelolaan dokumen;'}
                    </li>
                    <li>
                      {language === 'en'
                        ? `that based on the considerations referred to in paragraphs a and b above, it is deemed necessary to enact a Board of Directors' Resolution concerning ${displayTitle}.`
                        : `bahwa berdasarkan pertimbangan sebagaimana dimaksud dalam huruf a dan b di atas, dipandang perlu untuk menetapkan Surat Keputusan Direksi tentang ${displayTitle}.`}
                    </li>
                  </ol>

                  <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.25rem' }}>
                    {language === 'en' ? 'In View Of:' : 'Mengingat:'}
                  </div>
                  <ol style={{ paddingLeft: '1.4rem', margin: '0 0 0.8rem 0' }}>
                    <li>
                      {language === 'en'
                        ? 'The Deed of Establishment of PT Nirwana Bhumi Energy and prevailing statutory regulations governing limited liability companies;'
                        : 'Akta Pendirian PT Nirwana Bhumi Energy serta peraturan perundang-undangan perseroan terbatas yang berlaku;'}
                    </li>
                    <li>
                      {language === 'en'
                        ? 'International Standard ISO 9001:2015 Clause 7.5 regarding Documented Information;'
                        : 'Standar Internasional ISO 9001:2015 Klausul 7.5 tentang Informasi Terdokumentasi (Documented Information);'}
                    </li>
                    <li>
                      {language === 'en'
                        ? 'Standard Guidelines for the Contractor Safety Management System (CSMS) of SKK Migas and PT PLN (Persero);'
                        : 'Pedoman Baku Contractor Safety Management System (CSMS) SKK Migas dan PT PLN (Persero);'}
                    </li>
                    <li>
                      {language === 'en'
                        ? 'Standard Operating Procedure No. 0001-SOP-GNR-CEO-IX-2026 (Documents and Records Control Procedure);'
                        : 'Prosedur Baku No. 0001-SOP-GNR-CEO-IX-2026 (Documents and Records Control Procedure);'}
                    </li>
                    <li>
                      {language === 'en'
                        ? 'Integrated Management Policy No. 0001-KB-GNR-CEO-X-2026.'
                        : 'Kebijakan Manajemen Terintegrasi No. 0001-KB-GNR-CEO-X-2026.'}
                    </li>
                  </ol>

                  <div
                    style={{
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '10.5pt',
                      margin: '0.85rem 0 0.5rem 0',
                      color: '#000000',
                    }}
                  >
                    {language === 'en' ? 'HEREBY RESOLVES:' : 'MEMUTUSKAN:'}
                  </div>

                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {language === 'en'
                      ? `To Enact: BOARD OF DIRECTORS' RESOLUTION OF PT NIRWANA BHUMI ENERGY CONCERNING ${displayTitle.toUpperCase()}.`
                      : `Menetapkan: SURAT KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY TENTANG ${displayTitle.toUpperCase()}.`}
                  </div>

                  <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.2rem' }}>
                    {language === 'en' ? 'FIRST:' : 'KESATU:'}
                  </div>
                  <p style={{ margin: '0 0 0.65rem 0' }}>
                    {language === 'en'
                      ? `To officially enact the Standard Format and 6-Segment Document Numbering System across all operational areas and the head office of PT Nirwana Bhumi Energy: [4DigitSequentialNo]-[DocCategory]-[Division]-[Authoriser]-[RomanMonth]-[Year]. This numbering provision is strictly unique under the rigorous principle: ONE CODE FOR ONE DOCUMENT (1 Document Code = 1 Valid Document). Any duplication of document numbers or reuse of the same number for different documents is strictly prohibited by the system.`
                      : `Memberlakukan secara resmi Standar Format dan Sistem Penomoran Dokumen 6 Segmen di seluruh lingkungan operasional dan kantor pusat PT Nirwana Bhumi Energy: [NomorUrut4Digit]-[KategoriSurat]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun]. Ketentuan penomoran ini bersifat unik mutlak dengan asas ketat: SATU KODE UNTUK SATU DOKUMEN (1 Kode Dokumen = 1 Dokumen Sah). Duplikasi nomor dokumen atau penggunaan nomor yang sama untuk dokumen berbeda dilarang keras oleh sistem.`}
                  </p>
                </div>
              )
            ) : (
              <div
                contentEditable={isEditing}
                suppressContentEditableWarning
                style={{
                  fontSize: '9pt',
                  lineHeight: '1.5',
                  color: '#3B3838',
                  outline: isEditing ? '1px dashed #0284c7' : 'none',
                  background: isEditing ? 'rgba(2, 132, 199, 0.02)' : 'transparent',
                  padding: isEditing ? '0.5rem' : '0',
                  borderRadius: '4px',
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.4rem' }}>
                  1.0 TUJUAN & RUANG LINGKUP
                </div>
                <p style={{ margin: '0 0 0.6rem 0', textIndent: '0.5in' }}>
                  Dokumen ini menetapkan ketentuan operasional dan standar kepatuhan sistem terintegrasi di lingkungan PT Nirwana Bhumi Energy sesuai standar baku yang berlaku.
                </p>
                <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.4rem' }}>
                  2.0 TATA KELOLA DAN PELAKSANAAN
                </div>
                <p style={{ margin: '0 0 0.6rem 0', textIndent: '0.5in' }}>
                  Pelaksanaan seluruh kegiatan operasional wajib merujuk pada standar tata kerja terkontrol dan kepatuhan sistem kendali mutu terintegrasi PT Nirwana Bhumi Energy.
                </p>
              </div>
            )}

            <div style={{ flex: 1 }} />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.5rem',
                fontSize: '8pt',
                color: '#94a3b8',
              }}
            >
              <span>{effectiveCode} | PT Nirwana Bhumi Energy</span>
              <span>Page 3 of 4</span>
            </div>
          </div>

        {/* ============================================================== */}
        {/* HALAMAN 4: LANJUTAN DIKTUM, TIM DCC, & TANDA TANGAN 3 KOLOM    */}
        {/* ============================================================== */}
        <div
          style={a4PageStyle}
          id="nbe-page-4"
          className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(4) ? 'screen-hidden' : ''}`}
        >
            {/* Header Kop Resmi NBE via Shared Kop Header (Poin 7) */}
            {renderSharedKopHeader()}

            {/* Jika SK Direksi Murni: tampilkan Diktum KEDUA, Tabel Tim DCC, Diktum KETIGA-KELIMA */}
            {(categoryCode === 'KB' || effectiveCode.includes('-KB-')) && (!editableTables || editableTables.length === 0) && (!editableParagraphs || editableParagraphs.length === 0) ? (
              <div
                contentEditable={isEditing}
                suppressContentEditableWarning
                style={{
                  fontSize: '9pt',
                  lineHeight: '1.45',
                  color: '#3B3838',
                  outline: isEditing ? '1px dashed #0284c7' : 'none',
                  background: isEditing ? 'rgba(2, 132, 199, 0.02)' : 'transparent',
                  padding: isEditing ? '0.5rem' : '0',
                  borderRadius: '4px',
                }}
              >
                {language === 'bi' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.15rem' }}>KEDUA:</div>
                      <p style={{ margin: 0 }}>
                        Menunjuk dan menetapkan personel berikut sebagai Tim Document Control Center (DCC) PT Nirwana Bhumi Energy:
                      </p>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.15rem' }}>SECOND:</div>
                      <p style={{ margin: 0, fontStyle: 'italic' }}>
                        To appoint and designate the following personnel as the Document Control Centre (DCC) Team of PT Nirwana Bhumi Energy:
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.2rem' }}>
                      {language === 'en' ? 'SECOND:' : 'KEDUA:'}
                    </div>
                    <p style={{ margin: '0 0 0.5rem 0' }}>
                      {language === 'en'
                        ? 'To appoint and designate the following personnel as the Document Control Centre (DCC) Team of PT Nirwana Bhumi Energy:'
                        : 'Menunjuk dan menetapkan personel berikut sebagai Tim Document Control Center (DCC) PT Nirwana Bhumi Energy:'}
                    </p>
                  </>
                )}

                {/* Tabel Tim DCC (4 Kolom, Full Width, Header #D9E1F2, Zebra Fill) */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid #BFBFBF',
                    marginBottom: '0.75rem',
                    fontSize: '8pt',
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ ...tableHeaderStyle, width: '6%', padding: '5px' }}>No</th>
                      <th style={{ ...tableHeaderStyle, width: '25%', padding: '5px' }}>
                        {language === 'en' ? 'Personnel Name' : language === 'bi' ? 'Nama Personel / Name' : 'Nama Personel'}
                      </th>
                      <th style={{ ...tableHeaderStyle, width: '27%', padding: '5px' }}>
                        {language === 'en' ? 'Structural Position' : language === 'bi' ? 'Jabatan / Position' : 'Jabatan Struktural'}
                      </th>
                      <th style={{ ...tableHeaderStyle, width: '42%', padding: '5px' }}>
                        {language === 'en'
                          ? 'DCC Role & Responsibilities'
                          : language === 'bi'
                          ? 'Peran & Tanggung Jawab / Role & Responsibilities'
                          : 'Peran & Tanggung Jawab DCC'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: '#FFFFFF' }}>
                      <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold', padding: '5px' }}>1</td>
                      <td style={{ ...tableCellStyle, fontWeight: 'bold', padding: '5px' }}>
                        {effectivePreparedBy}
                      </td>
                      <td style={{ ...tableCellStyle, padding: '5px' }}>
                        {language === 'en'
                          ? 'Director of Finance & Engineering'
                          : language === 'bi'
                          ? 'Direktur Keuangan & Teknik / Director of Finance & Engineering'
                          : 'Direktur Keuangan & Teknik'}
                      </td>
                      <td style={{ ...tableCellStyle, padding: '5px' }}>
                        {language === 'en'
                          ? 'Lead Document Controller & System Administrator: Validates manuscripts, registers unique codes, executes Fix Code, and synchronises Google Drive archives.'
                          : language === 'bi'
                          ? 'Lead Document Controller & System Administrator: Validasi naskah, registrasi kode unik, eksekusi Fix Kode & sinkronisasi Google Drive / Validates manuscripts, registers unique codes, executes Fix Code & synchronises archives.'
                          : 'Lead Document Controller & System Administrator: Memvalidasi naskah, registrasi kode unik, eksekusi Tombol Fix Kode, dan sinkronisasi arsip Google Drive.'}
                      </td>
                    </tr>
                    <tr style={{ background: '#F9FBFD' }}>
                      <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold', padding: '5px' }}>2</td>
                      <td style={{ ...tableCellStyle, fontWeight: 'bold', padding: '5px' }}>
                        {effectiveVerifiedBy}
                      </td>
                      <td style={{ ...tableCellStyle, padding: '5px' }}>
                        {language === 'en'
                          ? 'Director of Operations & Technology'
                          : language === 'bi'
                          ? 'Direktur Operasional & Teknologi / Director of Operations & Technology'
                          : 'Direktur Operasional & Teknologi'}
                      </td>
                      <td style={{ ...tableCellStyle, padding: '5px' }}>
                        {language === 'en'
                          ? 'Technical Verifier & QA Approver: Verifies technical formatting, sub-pixel layout, and compliance with IMS & CSMS quality standards.'
                          : language === 'bi'
                          ? 'Technical Verifier & QA Approver: Memeriksa format teknis, layout sub-pixel & standar mutu IMS & CSMS / Verifies technical formatting, sub-pixel layout, and compliance with IMS & CSMS.'
                          : 'Technical Verifier & QA Approver: Memeriksa kesesuaian format teknis, layout sub-pixel, serta kepatuhan standar mutu IMS & CSMS.'}
                      </td>
                    </tr>
                    <tr style={{ background: '#FFFFFF' }}>
                      <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold', padding: '5px' }}>3</td>
                      <td style={{ ...tableCellStyle, fontWeight: 'bold', padding: '5px' }}>Abdul Qodir Al Jailani</td>
                      <td style={{ ...tableCellStyle, padding: '5px' }}>
                        {language === 'en'
                          ? 'Commissioner / IMS Lead'
                          : language === 'bi'
                          ? 'Komisaris / IMS Lead'
                          : 'Komisaris / IMS Lead'}
                      </td>
                      <td style={{ ...tableCellStyle, padding: '5px' }}>
                        {language === 'en'
                          ? 'Independent Compliance Overseer: Oversees periodic audits of controlled documents, backdating control, and archive retention integrity.'
                          : language === 'bi'
                          ? 'Independent Compliance Overseer: Mengawasi audit berkala, kontrol backdating & retensi arsip / Oversees periodic audits, backdating control & archive retention.'
                          : 'Independent Compliance Overseer: Mengawasi audit berkala dokumen terkontrol, penomoran masa lalu (backdating), dan integritas retensi arsip.'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Diktum KETIGA, KEEMPAT, KELIMA */}
                {language === 'bi' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '8pt', lineHeight: '1.4' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.1rem' }}>KETIGA:</div>
                      <p style={{ margin: '0 0 0.35rem 0' }}>
                        Mengatur tata kelola penyimpanan dan registrasi dokumen digital perusahaan melalui fitur Tombol "Fix Kode" pada sistem web, di mana setelah kode diverifikasi dan dikunci, sistem secara otomatis mengintegrasikan dokumen ke Google Drive korporat (Folder Induk ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF) pada subfolder klasifikasi divisi masing-masing.
                      </p>
                      <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.1rem' }}>KEEMPAT:</div>
                      <p style={{ margin: '0 0 0.35rem 0' }}>
                        Menetapkan alur revisi dokumen terkontrol, di mana setiap pembaruan terhadap dokumen yang telah terbit wajib mencantumkan sufiks (-rev1, -rev2, dst.) pada berkas digital, mencatatkan alasan perubahan secara rinci pada tabel Revision Index, serta memusnahkan salinan dokumen usang (obsolete) dari peredaran kerja.
                      </p>
                      <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.1rem' }}>KELIMA:</div>
                      <p style={{ margin: '0 0 0.35rem 0' }}>
                        Surat Keputusan ini mulai berlaku efektif sejak tanggal ditetapkan. Apabila di kemudian hari terdapat kekeliruan atau penyesuaian regulasi industri migas/ketenagalistrikan dalam penetapannya, akan diadakan evaluasi dan perbaikan sebagaimana mestinya.
                      </p>
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.1rem' }}>THIRD:</div>
                      <p style={{ margin: '0 0 0.35rem 0', fontStyle: 'italic' }}>
                        To govern the digital storage and registration of corporate documents via the 'Fix Code' button on the web system, whereby upon code verification and locking, the system automatically synchronises and archives the document into corporate Google Drive (Root Folder ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF) within its respective divisional classification subfolder.
                      </p>
                      <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.1rem' }}>FOURTH:</div>
                      <p style={{ margin: '0 0 0.35rem 0', fontStyle: 'italic' }}>
                        To establish the revision workflow for controlled documents, whereby any subsequent amendment to an issued document must append a suffix (-rev1, -rev2, etc.) to the digital file, record the specific rationale in detail within the Revision Index table, and promptly withdraw and destroy obsolete hard copies and digital versions from active circulation.
                      </p>
                      <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.1rem' }}>FIFTH:</div>
                      <p style={{ margin: '0 0 0.35rem 0', fontStyle: 'italic' }}>
                        This Resolution shall enter into force effectively from the date of its enactment. Should any discrepancies or regulatory adjustments within the oil & gas or power industry arise in the future, due evaluation and rectification shall be executed accordingly.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '8.5pt', lineHeight: '1.45' }}>
                    <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.15rem' }}>
                      {language === 'en' ? 'THIRD:' : 'KETIGA:'}
                    </div>
                    <p style={{ margin: '0 0 0.4rem 0' }}>
                      {language === 'en'
                        ? "To govern the digital storage and registration of corporate documents via the 'Fix Code' button on the web system, whereby upon code verification and locking, the system automatically synchronises and archives the document into corporate Google Drive (Root Folder ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF) within its respective divisional classification subfolder."
                        : 'Mengatur tata kelola penyimpanan dan registrasi dokumen digital perusahaan melalui fitur Tombol "Fix Kode" pada sistem web, di mana setelah kode diverifikasi dan dikunci, sistem secara otomatis mengintegrasikan dokumen ke Google Drive korporat (Folder Induk ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF) pada subfolder klasifikasi divisi masing-masing.'}
                    </p>

                    <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.15rem' }}>
                      {language === 'en' ? 'FOURTH:' : 'KEEMPAT:'}
                    </div>
                    <p style={{ margin: '0 0 0.4rem 0' }}>
                      {language === 'en'
                        ? 'To establish the revision workflow for controlled documents, whereby any subsequent amendment to an issued document must append a suffix (-rev1, -rev2, etc.) to the digital file, record the specific rationale in detail within the Revision Index table, and promptly withdraw and destroy obsolete hard copies and digital versions from active circulation.'
                        : 'Menetapkan alur revisi dokumen terkontrol, di mana setiap pembaruan terhadap dokumen yang telah terbit wajib mencantumkan sufiks (-rev1, -rev2, dst.) pada berkas digital, mencatatkan alasan perubahan secara rinci pada tabel Revision Index, serta memusnahkan salinan dokumen usang (obsolete) dari peredaran kerja.'}
                    </p>

                    <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.15rem' }}>
                      {language === 'en' ? 'FIFTH:' : 'KELIMA:'}
                    </div>
                    <p style={{ margin: '0 0 0.5rem 0' }}>
                      {language === 'en'
                        ? 'This Resolution shall enter into force effectively from the date of its enactment. Should any discrepancies or regulatory adjustments within the oil & gas or power industry arise in the future, due evaluation and rectification shall be executed accordingly.'
                        : 'Surat Keputusan ini mulai berlaku efektif sejak tanggal ditetapkan. Apabila di kemudian hari terdapat kekeliruan atau penyesuaian regulasi industri migas/ketenagalistrikan dalam penetapannya, akan diadakan evaluasi dan perbaikan sebagaimana mestinya.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Untuk Dokumen Non-SK (Formulir, SOP, Dokumen Teknis): Otorisasi Dokumen */
              <div style={{ fontSize: '9pt', lineHeight: '1.5', color: '#3B3838', marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.35rem' }}>
                  LEMBAR OTORISASI & VALIDASI AKHIR DOKUMEN:
                </div>
                <p style={{ margin: '0 0 0.45rem 0', textAlign: 'justify' }}>
                  Seluruh isi teknis, tabel data temuan, dan format yang tercantum dalam dokumen <strong>{displayTitle}</strong> ({effectiveCode}) ini telah diverifikasi, divalidasi, dan disahkan oleh pejabat berwenang PT Nirwana Bhumi Energy yang tertera pada tabel otorisasi berikut.
                </p>
                <p style={{ margin: 0, fontStyle: 'italic', color: '#64748b', fontSize: '8pt' }}>
                  Dokumen terkontrol ini sah berlaku efektif sejak tanggal ditetapkan dan terdokumentasi dalam Sistem Manajemen Pengendalian Dokumen PT Nirwana Bhumi Energy.
                </p>
              </div>
            )}

            {/* Tempat & Tanggal Penetapan */}
            <div style={{ textAlign: 'right', fontSize: '8.5pt', margin: '0.5rem 0 0.35rem 0' }}>
              <div>
                {language === 'en'
                  ? 'Enacted in Semarang / Tuban'
                  : language === 'bi'
                  ? 'Ditetapkan di Semarang / Tuban | Enacted in Semarang / Tuban'
                  : 'Ditetapkan di Semarang / Tuban'}
              </div>
              <div style={{ fontWeight: 'bold', color: '#000000' }}>
                {language === 'en' ? 'On:' : language === 'bi' ? 'Pada tanggal / On:' : 'Pada tanggal:'}{' '}
                {isEditing ? (
                  <input
                    type="date"
                    value={editableIssueDate}
                    onChange={(e) => setEditableIssueDate(e.target.value)}
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '8pt',
                      border: '1px dashed #0284c7',
                      background: '#f0f9ff',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  />
                ) : (
                  language === 'en' ? formattedDateEn : formattedDate
                )}
              </div>
              <div style={{ fontWeight: 'bold', color: '#003366', marginTop: '2px' }}>
                {categoryCode === 'KB' || effectiveCode.includes('-KB-')
                  ? (language === 'en'
                    ? 'BOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY'
                    : language === 'bi'
                    ? 'DIREKSI PT NIRWANA BHUMI ENERGY / BOARD OF DIRECTORS'
                    : 'DIREKSI PT NIRWANA BHUMI ENERGY')
                  : 'PT NIRWANA BHUMI ENERGY'}
              </div>
            </div>

            {/* Tabel Tanda Tangan 3 Kolom */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #BFBFBF',
                marginTop: '0.35rem',
                marginBottom: '0.5rem',
              }}
            >
              <thead>
                <tr style={{ background: '#D9E1F2' }}>
                  <th style={{ ...tableCellStyle, width: '33.33%', textAlign: 'center', fontWeight: 'bold', padding: '6px' }}>
                    {language === 'en'
                      ? 'Approved By:'
                      : language === 'bi'
                      ? 'Disetujui Oleh / Approved By:'
                      : 'Disetujui Oleh:'}
                    <div style={{ fontSize: '7.5pt', color: '#003366', fontWeight: 'normal' }}>
                      President Director / CEO
                    </div>
                  </th>
                  <th style={{ ...tableCellStyle, width: '33.33%', textAlign: 'center', fontWeight: 'bold', padding: '6px' }}>
                    {language === 'en'
                      ? 'Verified By:'
                      : language === 'bi'
                      ? 'Diverifikasi Oleh / Verified By:'
                      : 'Diverifikasi Oleh:'}
                    <div style={{ fontSize: '7.5pt', color: '#003366', fontWeight: 'normal' }}>
                      Director of Operations & Tech (CTO)
                    </div>
                  </th>
                  <th style={{ ...tableCellStyle, width: '33.33%', textAlign: 'center', fontWeight: 'bold', padding: '6px' }}>
                    {language === 'en'
                      ? 'Prepared & Proposed By:'
                      : language === 'bi'
                      ? 'Disiapkan Oleh / Prepared By:'
                      : 'Disiapkan & Diajukan Oleh:'}
                    <div style={{ fontSize: '7.5pt', color: '#003366', fontWeight: 'normal' }}>
                      Director of Finance & Eng (CFO / DCC)
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ height: '65px', verticalAlign: 'middle', background: '#FFFFFF' }}>
                  <td style={{ ...tableCellStyle, textAlign: 'center', padding: '4px' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        border: '1px dashed #94a3b8',
                        fontSize: '7pt',
                        color: '#64748b',
                        marginBottom: '3px',
                      }}
                    >
                      [ Duty Stamp IDR 10,000 / Meterai ]
                    </div>
                    <div style={{ fontSize: '7.5pt', color: '#003366', fontWeight: 'bold' }}>
                      [ Signature & Corporate Seal ]
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', padding: '4px' }}>
                    <div style={{ fontSize: '7.5pt', color: '#003366', fontWeight: 'bold' }}>
                      [ Signature & Stamp ]
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', padding: '4px' }}>
                    <div style={{ fontSize: '7.5pt', color: '#003366', fontWeight: 'bold' }}>
                      [ Signature & Stamp ]
                    </div>
                  </td>
                </tr>
                <tr style={{ background: '#F8FAFC' }}>
                  <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold', color: '#000000', padding: '5px', fontSize: '8pt' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editableApprovedBy}
                        onChange={(e) => setEditableApprovedBy(e.target.value)}
                        style={{
                          width: '95%',
                          fontFamily: 'Arial, sans-serif',
                          fontSize: '8pt',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          border: '1px dashed #0284c7',
                          background: '#f0f9ff',
                          padding: '2px 4px',
                          borderRadius: '4px',
                        }}
                      />
                    ) : (
                      effectiveApprovedBy.toUpperCase()
                    )}
                    <div style={{ fontSize: '7pt', fontWeight: 'normal', color: '#64748b' }}>
                      {language === 'en' ? 'President Director' : 'Direktur Utama'}
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold', color: '#000000', padding: '5px', fontSize: '8pt' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editableVerifiedBy}
                        onChange={(e) => setEditableVerifiedBy(e.target.value)}
                        style={{
                          width: '95%',
                          fontFamily: 'Arial, sans-serif',
                          fontSize: '8pt',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          border: '1px dashed #0284c7',
                          background: '#f0f9ff',
                          padding: '2px 4px',
                          borderRadius: '4px',
                        }}
                      />
                    ) : (
                      effectiveVerifiedBy.toUpperCase()
                    )}
                    <div style={{ fontSize: '7pt', fontWeight: 'normal', color: '#64748b' }}>
                      {language === 'en' ? 'Director of Operations' : 'Direktur Operasional'}
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold', color: '#000000', padding: '5px', fontSize: '8pt' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editablePreparedBy}
                        onChange={(e) => setEditablePreparedBy(e.target.value)}
                        style={{
                          width: '95%',
                          fontFamily: 'Arial, sans-serif',
                          fontSize: '8pt',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          border: '1px dashed #0284c7',
                          background: '#f0f9ff',
                          padding: '2px 4px',
                          borderRadius: '4px',
                        }}
                      />
                    ) : (
                      effectivePreparedBy.toUpperCase()
                    )}
                    <div style={{ fontSize: '7pt', fontWeight: 'normal', color: '#64748b' }}>
                      {language === 'en' ? 'Director of Finance & Eng' : 'Direktur Keuangan & Teknik'}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ flex: 1 }} />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '0.5rem',
                fontSize: '8pt',
                color: '#94a3b8',
              }}
            >
              <span>{effectiveCode} | PT Nirwana Bhumi Energy</span>
              <span>Page 4 of {totalPages}</span>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
};
