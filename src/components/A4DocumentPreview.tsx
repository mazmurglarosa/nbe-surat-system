import React, { useState, useEffect } from 'react';
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
import { MsWordRibbonEditor } from './MsWordRibbonEditor';
import { loadTemplateSettings, DocumentTemplateSettings } from '../services/templateSettings';

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

  // Global corporate master logo & template settings
  const [masterSettings, setMasterSettings] = useState<DocumentTemplateSettings>(() => loadTemplateSettings());

  useEffect(() => {
    const handleTemplateSync = (e: any) => {
      setMasterSettings(e.detail || loadTemplateSettings());
    };
    window.addEventListener('nbe_template_settings_updated', handleTemplateSync);
    window.addEventListener('nbe-template-settings-updated', handleTemplateSync);
    return () => {
      window.removeEventListener('nbe_template_settings_updated', handleTemplateSync);
      window.removeEventListener('nbe-template-settings-updated', handleTemplateSync);
    };
  }, []);

  const effectiveCoverLogoDataUrl = coverLogoDataUrl || masterSettings.coverLogoDataUrl || undefined;
  const effectiveKopLogoDataUrl = kopLogoDataUrl || masterSettings.kopLogoDataUrl || undefined;
  const effectiveCoverLogoWidthInches = coverLogoWidthInches || masterSettings.coverLogoWidthInches || 3.2;
  const effectiveKopLogoWidthInches = kopLogoWidthInches || masterSettings.kopLogoWidthInches || 0.95;

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
      if (effectiveCoverLogoDataUrl) {
        try {
          const res = await fetch(effectiveCoverLogoDataUrl);
          coverBuffer = await res.arrayBuffer();
        } catch (e) {
          console.warn('Could not convert effectiveCoverLogoDataUrl to buffer:', e);
        }
      }
      if (effectiveKopLogoDataUrl) {
        try {
          const res = await fetch(effectiveKopLogoDataUrl);
          kopBuffer = await res.arrayBuffer();
        } catch (e) {
          console.warn('Could not convert effectiveKopLogoDataUrl to buffer:', e);
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
        coverLogoWidthInches: effectiveCoverLogoWidthInches || 3.2,
        kopLogoWidthInches: effectiveKopLogoWidthInches || 0.95,
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
            {effectiveKopLogoDataUrl ? (
              <img
                src={effectiveKopLogoDataUrl}
                alt="Logo Kop NBE"
                style={{
                  width: effectiveKopLogoWidthInches ? `${effectiveKopLogoWidthInches}in` : '0.95in',
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

  const renderRunningKopHeader = () => renderSharedKopHeader();

  const initialHtmlPages = React.useMemo(() => {
    if (effectiveBodyPages && effectiveBodyPages.length > 0) {
      return effectiveBodyPages.map((pageLines) => {
        return pageLines
          .map((line) => {
            const matchH = line.trim().match(/^([0-9]+\.[0-9]+)\s+(.*)$/);
            if (matchH) {
              const [, numPart, titlePart] = matchH;
              const isMainH = numPart.endsWith('.0');
              return `<div style="display: flex; align-items: baseline; font-weight: bold; color: #000000; padding-top: ${
                isMainH ? '0.75rem' : '0.4rem'
              }; margin-bottom: 0.3rem; font-size: ${
                isMainH ? '11pt' : '10.5pt'
              }; font-family: Arial;"><span style="display: inline-block; width: 0.5in; flex-shrink: 0;">${numPart}</span><span>${titlePart}</span></div>`;
            }
            return `<p style="padding-left: 0.5in; text-align: justify; line-height: 1.6; margin-bottom: 0.5rem; font-size: 10pt; font-family: Arial;">${line}</p>`;
          })
          .join('');
      });
    }
    return [
      "<p style='text-align: justify; font-size: 10.5pt; font-family: Arial;'>1.0\tOBJECTIVE</p>",
    ];
  }, [effectiveBodyPages]);

  const handleSaveFromRibbonEditor = (updatedHtmlPages: string[]) => {
    const extractedParagraphs: string[] = [];
    updatedHtmlPages.forEach((pageHtml) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = pageHtml;
      const blocks = Array.from(tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, li'));
      if (blocks.length > 0) {
        blocks.forEach((el) => {
          const txt = (el as HTMLElement).innerText.trim();
          if (txt && !extractedParagraphs.includes(txt)) {
            extractedParagraphs.push(txt);
          }
        });
      } else {
        const lines = tempDiv.innerText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        extractedParagraphs.push(...lines);
      }
    });

    const finalParagraphs = extractedParagraphs.length > 0 ? extractedParagraphs : editableParagraphs;
    setEditableParagraphs(finalParagraphs);

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

    setSaveSuccessNotice('Perubahan dokumen berhasil disimpan ke format Word & Pratinjau!');
    setTimeout(() => {
      setSaveSuccessNotice(null);
    }, 4000);
  };

  const renderSystemCoverPage = () => (
    <div
      style={a4PageStyle}
      id="nbe-page-1"
      className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(1) ? 'screen-hidden' : ''}`}
    >
      <div style={{ flex: 1, minHeight: '1.5rem' }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {effectiveCoverLogoDataUrl ? (
            <img
              src={effectiveCoverLogoDataUrl}
              alt="Logo Cover NBE"
              style={{
                width: effectiveCoverLogoWidthInches ? `${effectiveCoverLogoWidthInches}in` : '3.2in',
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

        <div
          style={{
            textAlign: 'center',
            marginTop: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            width: '100%',
          }}
        >
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

          <div style={{ padding: '0 1.5rem', textAlign: 'center' }}>
            <div
              style={{
                fontSize: '15pt',
                fontWeight: 'bold',
                color: '#000000',
                lineHeight: 1.4,
                fontFamily: 'Arial, sans-serif',
                textTransform: 'uppercase',
              }}
            >
              {displayTitle}
            </div>
          </div>

          <div
            style={{
              display: 'inline-block',
              margin: '0.5rem auto 0 auto',
              padding: '6px 20px',
              background: '#F0F4F8',
              border: '1.5px solid #003366',
              borderRadius: '4px',
              fontSize: '12pt',
              fontWeight: 'bold',
              color: '#003366',
              letterSpacing: '0.04em',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {language === 'en' ? 'DOCUMENT NO:' : 'NOMOR DOKUMEN:'} {effectiveCode}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '1.5rem' }} />

      {/* Tabel Otorisasi Cover (Terjaga Sistem / contentEditable=false) */}
      <div
        contentEditable={false}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          border: '1px solid #BFBFBF',
          background: '#FAFBFD',
          padding: '0.75rem 1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          textAlign: 'center',
        }}
        className="select-none"
      >
        <div style={{ marginBottom: '0.35rem' }}>
          <div style={{ fontWeight: 'bold', color: '#000000', fontSize: '7.8pt' }}>
            {language === 'en' ? 'Approved by:' : 'Approved by (Disetujui):'}
          </div>
          <div style={{ fontWeight: 'bold', color: '#003366', fontSize: '8.5pt', marginTop: '1px' }}>
            {effectiveApprovedBy}
          </div>
          <div style={{ fontSize: '7.2pt', color: '#64748b', marginTop: '0.5px' }}>
            President Director (CEO)
          </div>
        </div>

        <div style={{ marginBottom: '0.35rem' }}>
          <div style={{ fontWeight: 'bold', color: '#000000', fontSize: '7.8pt' }}>
            {language === 'en' ? 'Verified by:' : 'Verified by (Diverifikasi):'}
          </div>
          <div style={{ fontWeight: 'bold', color: '#003366', fontSize: '8.5pt', marginTop: '1px' }}>
            {effectiveVerifiedBy}
          </div>
          <div style={{ fontSize: '7.2pt', color: '#64748b', marginTop: '0.5px' }}>
            Technical Director (CTO)
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 'bold', color: '#000000', fontSize: '7.8pt' }}>
            {language === 'en' ? 'Prepared by:' : 'Prepared by (Disiapkan):'}
          </div>
          <div style={{ fontWeight: 'bold', color: '#003366', fontSize: '8.5pt', marginTop: '1px' }}>
            {effectivePreparedBy}
          </div>
          <div style={{ fontSize: '7.2pt', color: '#64748b', marginTop: '0.5px' }}>
            Lead Document Controller & Finance Director
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <div
        contentEditable={false}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '0.5rem',
          fontSize: '8pt',
          color: '#94a3b8',
        }}
        className="select-none"
      >
        <span>PT Nirwana Bhumi Energy | Corporate Document Management System</span>
        <span>Page 1 of {totalPages}</span>
      </div>
    </div>
  );

  const renderSystemRevisionPage = (calcTotalPages: number) => (
    <div
      style={a4PageStyle}
      id="nbe-page-2"
      className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(2) ? 'screen-hidden' : ''}`}
    >
      {renderSharedKopHeader()}

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

      <table
        contentEditable={false}
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #BFBFBF',
          marginBottom: '2rem',
        }}
        className="select-none"
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
          {effectiveRevisions.map((rev, idx) => (
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
          ))}
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

      <div
        contentEditable={false}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '0.5rem',
          fontSize: '8pt',
          color: '#94a3b8',
        }}
        className="select-none"
      >
        <span>{effectiveCode} | PT Nirwana Bhumi Energy</span>
        <span>Page 2 of {calcTotalPages || totalPages}</span>
      </div>
    </div>
  );

  const renderSystemTocPage = (calcTotalPages: number) => {
    if (isProceduralDoc) {
      return (
        <div
          style={a4PageStyle}
          id="nbe-page-3"
          className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(3) ? 'screen-hidden' : ''}`}
        >
          {renderSharedKopHeader()}

          <div style={{ textAlign: 'center', margin: '1.25rem 0' }}>
            <h4 style={{ fontSize: '13pt', fontWeight: 'bold', color: '#000000', margin: 0, textTransform: 'uppercase' }}>
              TABLE OF CONTENTS
            </h4>
          </div>

          <div
            contentEditable={false}
            style={{
              marginTop: '1.5rem',
              marginBottom: '2rem',
              padding: '0.5rem 0',
            }}
            className="select-none"
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
                <span style={{ display: 'inline-block', width: '0.5in', flexShrink: 0 }}>
                  {item.num}
                </span>
                <span>{item.title}</span>
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <div
            contentEditable={false}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '0.5rem',
              fontSize: '8pt',
              color: '#94a3b8',
            }}
            className="select-none"
          >
            <span>{effectiveCode} | PT Nirwana Bhumi Energy</span>
            <span>Page 3 of {calcTotalPages || totalPages}</span>
          </div>
        </div>
      );
    }

    return (
      <div
        style={a4PageStyle}
        id="nbe-page-3"
        className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(3) ? 'screen-hidden' : ''}`}
      >
        {renderSharedKopHeader()}
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
        </div>

        <div style={{ flex: 1 }} />
        <div
          contentEditable={false}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '0.5rem',
            fontSize: '8pt',
            color: '#94a3b8',
          }}
          className="select-none"
        >
          <span>{effectiveCode} | PT Nirwana Bhumi Energy</span>
          <span>Page 3 of {calcTotalPages || totalPages}</span>
        </div>
      </div>
    );
  };

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

      {/* MS WORD RIBBON BAR & AUTO-PAGINATION DOCUMENT CANVAS */}
      <MsWordRibbonEditor
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onSaveDocument={handleSaveFromRibbonEditor}
        initialHtmlPages={initialHtmlPages}
        renderSystemCoverPage={renderSystemCoverPage}
        renderSystemRevisionPage={renderSystemRevisionPage}
        renderSystemTocPage={renderSystemTocPage}
        renderRunningKopHeader={renderRunningKopHeader}
        activePageTab={activePageTab}
      />

    </div>
  );
};
