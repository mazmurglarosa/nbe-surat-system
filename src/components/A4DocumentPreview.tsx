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
  Sparkles,
} from 'lucide-react';
import { DocumentLanguage, RevisionRecord } from '../types';
import { generateAndDownloadNbeDocx } from '../utils/nbeDocxGenerator';

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
  bodyContent?: string;
  onCopyCode?: () => void;
  onDownloadDocx?: () => void;
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
  bodyContent,
  onCopyCode,
  onDownloadDocx,
}) => {
  const [activePageTab, setActivePageTab] = useState<'all' | 1 | 2 | 3 | 4>('all');
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);

  const displayTitle = (title || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN').trim().toUpperCase();
  const effectiveCode = (code || '0001-KB-GNR-CEO-X-2026').trim().toUpperCase();

  const formattedDate = React.useMemo(() => {
    try {
      const d = issueDate ? new Date(issueDate) : new Date();
      if (isNaN(d.getTime())) return '17 Oktober 2026';
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '17 Oktober 2026';
    }
  }, [issueDate]);

  const formattedDateEn = React.useMemo(() => {
    try {
      const d = issueDate ? new Date(issueDate) : new Date();
      if (isNaN(d.getTime())) return '17 October 2026';
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '17 October 2026';
    }
  }, [issueDate]);

  const effectiveRevisions: RevisionRecord[] = React.useMemo(() => {
    if (revisions && revisions.length > 0) return revisions;
    return [
      {
        revision: revision,
        date: formattedDate,
        description:
          language === 'en'
            ? `Initial Edition – Corporate Standard Document (${effectiveCode})`
            : language === 'bi'
            ? `Edisi Awal – Penerbitan Dokumen Standar / Initial Edition (${effectiveCode})`
            : `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${effectiveCode})`,
        revisedBy: preparedBy || 'Mazmur Gusti Agung Larosa',
      },
    ];
  }, [revisions, revision, formattedDate, language, effectiveCode, preparedBy]);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(effectiveCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
    if (onCopyCode) onCopyCode();
  };

  const handleDownloadWord = async () => {
    if (onDownloadDocx) {
      onDownloadDocx();
      return;
    }
    setIsDownloadingWord(true);
    try {
      await generateAndDownloadNbeDocx({
        docCode: effectiveCode,
        titleId: displayTitle,
        titleEn: displayTitle,
        categoryNameId: typeLabel,
        divisionName: divisionLabel,
        revisionNo: String(revision),
        issueDateId: formattedDate,
        issueDateEn: formattedDateEn,
        preparedBy: preparedBy || 'Mazmur Gusti Agung Larosa',
        preparedRole: 'Director of Finance & Engineering / DCC Lead',
        verifiedBy: verifiedBy || 'Dennis Raditya',
        verifiedRole: 'Director of Operations & Technology / CTO',
        approvedBy: approvedBy || 'Bima Satryo Hartanto',
        approvedRole: 'President Director / CEO',
        language: language,
      });
    } catch (err: any) {
      alert('Gagal mengunduh berkas Word (.docx): ' + err.message);
    } finally {
      setIsDownloadingWord(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanDocTitle =
      language === 'en'
        ? `${effectiveCode} - Board of Directors Resolution (British English)`
        : language === 'bi'
        ? `${effectiveCode} - Surat Keputusan Direksi (Bilingual ID-EN)`
        : `${effectiveCode} - Surat Keputusan Direksi (Revisi Final)`;
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
          { id: 'all', label: 'Semua 4 Halaman' },
          { id: 1, label: 'Hal 1: Cover Page' },
          { id: 2, label: 'Hal 2: Revision Index' },
          { id: 3, label: 'Hal 3: Permulaan Surat' },
          { id: 4, label: 'Hal 4: DCC & Tanda Tangan' },
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
        id="nbe-isolated-document-canvas"
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
              <div
                style={{
                  fontSize: '15.5pt',
                  fontWeight: 'bold',
                  color: '#000000',
                  letterSpacing: '0.05em',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {language === 'en'
                  ? "BOARD OF DIRECTORS' RESOLUTION"
                  : language === 'bi'
                  ? "SURAT KEPUTUSAN DIREKSI / BOARD OF DIRECTORS' RESOLUTION"
                  : 'SURAT KEPUTUSAN DIREKSI'}
              </div>

              <div
                style={{
                  fontSize: '11.5pt',
                  fontWeight: 'bold',
                  color: '#3B3838',
                  padding: '0 2rem',
                  lineHeight: '1.4',
                }}
              >
                {language === 'en' ? 'REGARDING:' : language === 'bi' ? 'TENTANG / REGARDING:' : 'TENTANG:'}{' '}
                {displayTitle}
              </div>

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
            </div>

            {/* Vertical spacer to push authorization block to bottom right */}
            <div style={{ flex: 1, minHeight: '12rem' }} />

            {/* Blok Otorisasi Ujung Kanan Bawah (left indent: 3.5 inci) */}
            <div
              style={{
                alignSelf: 'flex-end',
                width: '320px',
                borderLeft: '2px solid #003366',
                paddingLeft: '1rem',
                marginBottom: '1.5rem',
                fontSize: '9.5pt',
                color: '#3B3838',
              }}
            >
              <div style={{ marginBottom: '0.65rem' }}>
                <span style={{ fontWeight: 'bold', color: '#000000' }}>
                  {language === 'en' ? 'Approved by:' : 'Approved by (Disetujui):'}
                </span>
                <div style={{ fontWeight: 'bold', color: '#003366', fontSize: '10pt' }}>
                  {approvedBy || 'Bima Satryo Hartanto'}
                </div>
                <div style={{ fontSize: '8.5pt', color: '#64748b' }}>President Director (CEO)</div>
              </div>

              <div style={{ marginBottom: '0.65rem' }}>
                <span style={{ fontWeight: 'bold', color: '#000000' }}>
                  {language === 'en' ? 'Verified by:' : 'Verified by (Diverifikasi):'}
                </span>
                <div style={{ fontWeight: 'bold', color: '#003366', fontSize: '10pt' }}>
                  {verifiedBy || 'Dennis Raditya'}
                </div>
                <div style={{ fontSize: '8.5pt', color: '#64748b' }}>Technical Director (CTO)</div>
              </div>

              <div>
                <span style={{ fontWeight: 'bold', color: '#000000' }}>
                  {language === 'en' ? 'Prepared by:' : 'Prepared by (Disiapkan):'}
                </span>
                <div style={{ fontWeight: 'bold', color: '#003366', fontSize: '10pt' }}>
                  {preparedBy || 'Mazmur Gusti Agung Larosa'}
                </div>
                <div style={{ fontSize: '8.5pt', color: '#64748b' }}>
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
              <span>PT Nirwana Bhumi Energy — Corporate Document Management System</span>
              <span>Page 1 of 4</span>
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
            {/* Header Kop Resmi NBE: 4 Baris Sel */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1.5px solid #000000',
                marginBottom: '1.5rem',
              }}
            >
              <tbody>
                <tr>
                  <td
                    rowSpan={3}
                    style={{
                      width: '26%',
                      border: '1px solid #000000',
                      padding: '8px',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    <img
                      src="/+BG.png"
                      alt="NBE"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logo.png';
                      }}
                      style={{ maxHeight: '38px', maxWidth: '110px', objectFit: 'contain' }}
                    />
                    <div style={{ fontSize: '8.5pt', fontWeight: 'bold', marginTop: '4px' }}>
                      PT Nirwana Bhumi Energy
                    </div>
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 12px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '11pt',
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
                    style={{
                      border: '1px solid #000000',
                      padding: '5px 12px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '9.5pt',
                      color: '#003366',
                    }}
                  >
                    {typeLabel}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '6px 12px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '11.5pt',
                      color: '#000000',
                    }}
                  >
                    {displayTitle}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '5px 8px',
                      fontSize: '8.5pt',
                      fontWeight: 'bold',
                      background: '#f1f5f9',
                    }}
                  >
                    {language === 'en' ? 'Revision:' : 'Revisi:'} {revision}
                  </td>
                  <td
                    style={{
                      border: '1px solid #000000',
                      padding: '5px 12px',
                      fontSize: '8.5pt',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      <strong>{language === 'en' ? 'Number:' : 'Nomor:'}</strong> {effectiveCode}
                    </span>
                    <span>
                      <strong>{language === 'en' ? 'Date:' : 'Tanggal:'}</strong>{' '}
                      {language === 'en' ? formattedDateEn : formattedDate}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

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
              <span>{effectiveCode} — PT Nirwana Bhumi Energy</span>
              <span>Page 2 of 4</span>
            </div>
          </div>

        {/* ============================================================== */}
        {/* HALAMAN 3: PERMULAAN ISI SURAT (LETTER BODY & KESATU)          */}
        {/* ============================================================== */}
        <div
          style={a4PageStyle}
          id="nbe-page-3"
          className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(3) ? 'screen-hidden' : ''}`}
        >
            {/* Kop Mini Running Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid #003366',
                paddingBottom: '0.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <span style={{ fontSize: '9pt', fontWeight: 'bold', color: '#000000' }}>
                PT NIRWANA BHUMI ENERGY
              </span>
              <span style={{ fontSize: '8.5pt', color: '#003366', fontWeight: 'bold' }}>
                {effectiveCode}
              </span>
            </div>

            {/* Judul Resmi SK */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '12pt', fontWeight: 'bold', color: '#000000' }}>
                {language === 'en'
                  ? "BOARD OF DIRECTORS' RESOLUTION OF PT NIRWANA BHUMI ENERGY"
                  : language === 'bi'
                  ? "KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY / BOARD RESOLUTION"
                  : 'KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY'}
              </div>
              <div style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#003366', marginTop: '4px' }}>
                {language === 'en' ? 'NUMBER:' : 'NOMOR:'} {effectiveCode}
              </div>
              <div style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#000000', marginTop: '4px' }}>
                {language === 'en' ? 'REGARDING:' : 'TENTANG:'} {displayTitle}
              </div>
              <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#000000', marginTop: '14px' }}>
                {language === 'en'
                  ? 'THE BOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY,'
                  : 'DIREKSI PT NIRWANA BHUMI ENERGY,'}
              </div>
            </div>

            {/* OPSI BILINGUAL (DUAL-COLUMN PARALLEL) vs SINGLE LANGUAGE */}
            {language === 'bi' ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.25rem',
                  fontSize: '8pt',
                  lineHeight: '1.45',
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
              <div style={{ fontSize: '9pt', lineHeight: '1.5', color: '#3B3838' }}>
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
              <span>{effectiveCode} — PT Nirwana Bhumi Energy</span>
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
            {/* Kop Mini Running Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid #003366',
                paddingBottom: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <span style={{ fontSize: '9pt', fontWeight: 'bold', color: '#000000' }}>
                PT NIRWANA BHUMI ENERGY
              </span>
              <span style={{ fontSize: '8.5pt', color: '#003366', fontWeight: 'bold' }}>
                {effectiveCode}
              </span>
            </div>

            {/* Diktum KEDUA: Penunjukan Tim DCC */}
            <div style={{ fontSize: '9pt', lineHeight: '1.45', color: '#3B3838' }}>
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
                      {preparedBy || 'Mazmur Gusti Agung Larosa'}
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
                      {verifiedBy || 'Dennis Raditya'}
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
                {language === 'en' ? formattedDateEn : formattedDate}
              </div>
              <div style={{ fontWeight: 'bold', color: '#003366', marginTop: '2px' }}>
                {language === 'en'
                  ? 'BOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY'
                  : language === 'bi'
                  ? 'DIREKSI PT NIRWANA BHUMI ENERGY / BOARD OF DIRECTORS'
                  : 'DIREKSI PT NIRWANA BHUMI ENERGY'}
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
                    {(approvedBy || 'Bima Satryo Hartanto').toUpperCase()}
                    <div style={{ fontSize: '7pt', fontWeight: 'normal', color: '#64748b' }}>
                      {language === 'en' ? 'President Director' : 'Direktur Utama'}
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold', color: '#000000', padding: '5px', fontSize: '8pt' }}>
                    {(verifiedBy || 'Dennis Raditya').toUpperCase()}
                    <div style={{ fontSize: '7pt', fontWeight: 'normal', color: '#64748b' }}>
                      {language === 'en' ? 'Director of Operations' : 'Direktur Operasional'}
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold', color: '#000000', padding: '5px', fontSize: '8pt' }}>
                    {(preparedBy || 'Mazmur Gusti Agung Larosa').toUpperCase()}
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
              <span>{effectiveCode} — PT Nirwana Bhumi Energy</span>
              <span>Page 4 of 4</span>
            </div>
          </div>
      </div>
    </div>
  );
};
