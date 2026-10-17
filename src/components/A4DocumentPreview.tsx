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

  const handlePrint = () => {
    window.print();
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
      {/* Top Preview Action Header */}
      <div
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
          {onDownloadDocx && (
            <button
              type="button"
              onClick={onDownloadDocx}
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
              <span>Unduh Word (.docx)</span>
            </button>
          )}

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

      {/* Page Selector Tabs */}
      <div
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

      {/* Preview Pages Container */}
      <div
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
        {(activePageTab === 'all' || activePageTab === 1) && (
          <div style={a4PageStyle} id="nbe-page-1">
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
        )}

        {/* ============================================================== */}
        {/* HALAMAN 2: REVISION INDEX (BERSIH TANPA KENDALI DOKUMEN)        */}
        {/* ============================================================== */}
        {(activePageTab === 'all' || activePageTab === 2) && (
          <div style={a4PageStyle} id="nbe-page-2">
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

            {/* Ringkasan Ringkas & Bersih */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '6px',
                border: '1px solid #BFBFBF',
                background: '#F9FBFD',
                fontSize: '9.5pt',
                lineHeight: '1.6',
                color: '#3B3838',
              }}
            >
              <div
                style={{
                  fontWeight: 'bold',
                  color: '#003366',
                  marginBottom: '0.4rem',
                  fontSize: '10pt',
                }}
              >
                {language === 'en'
                  ? 'Summary & Standard Purpose:'
                  : 'Ringkasan & Maksud Standardisasi Dokumen:'}
              </div>
              <p style={{ margin: 0 }}>
                {language === 'en'
                  ? `Official document of PT Nirwana Bhumi Energy under registration number ${effectiveCode}. Prepared in compliance with the Documents and Records Control Procedure (0001-SOP-GNR-CEO-IX-2026), ISO 9001, ISO 45001, and CSMS standards. One registered code applies strictly and exclusively to one document.`
                  : `Dokumen resmi PT Nirwana Bhumi Energy dengan nomor penetapan ${effectiveCode}. Diterbitkan mengacu pada Pedoman Pengendalian Dokumen dan Rekaman Baku (0001-SOP-GNR-CEO-IX-2026), standar ISO 9001, ISO 45001, dan CSMS. Satu kode terdaftar berlaku unik mutlak hanya untuk 1 (satu) dokumen sah.`}
              </p>
            </div>

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
        )}

        {/* ============================================================== */}
        {/* HALAMAN 3: PERMULAAN ISI SURAT (LETTER BODY & KESATU)          */}
        {/* ============================================================== */}
        {(activePageTab === 'all' || activePageTab === 3) && (
          <div style={a4PageStyle} id="nbe-page-3">
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
                  fontSize: '8.5pt',
                  lineHeight: '1.5',
                }}
              >
                {/* Kolom Kiri: Bahasa Indonesia */}
                <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '1rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.25rem' }}>
                    Menimbang:
                  </div>
                  <ol style={{ paddingLeft: '1.2rem', margin: '0 0 0.8rem 0' }} type="a">
                    <li>
                      bahwa dalam rangka tertib administrasi, standardisasi persuratan, dan penjaminan mutu tata
                      kelola dokumen di lingkungan PT Nirwana Bhumi Energy;
                    </li>
                    <li>
                      bahwa untuk menjamin kepatuhan sistem kontrol dokumen terhadap standar Integrated Management
                      System (IMS), ISO 9001, ISO 45001, dan CSMS;
                    </li>
                    <li>
                      bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a dan b, perlu menetapkan
                      Keputusan Direksi tentang {displayTitle};
                    </li>
                  </ol>

                  <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.25rem' }}>
                    Mengingat:
                  </div>
                  <ol style={{ paddingLeft: '1.2rem', margin: '0 0 0.8rem 0' }}>
                    <li>Undang-Undang Nomor 40 Tahun 2007 tentang Perseroan Terbatas;</li>
                    <li>Prosedur Baku Pengendalian Dokumen PT NBE (0001-SOP-GNR-CEO-IX-2026);</li>
                    <li>Manual Sistem Manajemen Terintegrasi (IMS) PT Nirwana Bhumi Energy;</li>
                    <li>Kebijakan Mutu, Keselamatan Kerja, dan Lindung Lingkungan (K3LL);</li>
                    <li>Anggaran Dasar dan Ketetapan RUPS PT Nirwana Bhumi Energy;</li>
                  </ol>

                  <div style={{ fontWeight: 'bold', textAlign: 'center', margin: '0.6rem 0' }}>
                    MEMUTUSKAN:
                  </div>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.4rem' }}>
                    Menetapkan: KEPUTUSAN DIREKSI TENTANG {displayTitle}.
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#003366' }}>KESATU:</div>
                  <p style={{ margin: '0 0 0.5rem 0' }}>
                    Menetapkan Standar Penomoran Dokumen Terintegrasi 6-Segmen{' '}
                    <strong>[NomorUrut4Digit]-[Kategori]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun]</strong> sebagai
                    identitas resmi dokumen korporat. Satu kode surat hanya berlaku unik mutlak untuk 1 dokumen saja.
                  </p>
                </div>

                {/* Kolom Kanan: British English */}
                <div>
                  <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.25rem' }}>
                    Having Considered:
                  </div>
                  <ol style={{ paddingLeft: '1.2rem', margin: '0 0 0.8rem 0' }} type="a">
                    <li>
                      that in order to ensure administrative governance, documentation standardization, and quality
                      assurance within PT Nirwana Bhumi Energy;
                    </li>
                    <li>
                      that to guarantee full compliance with the Integrated Management System (IMS), ISO 9001, ISO
                      45001, and CSMS frameworks;
                    </li>
                    <li>
                      that in view of the considerations set forth in points a and b, it is necessary to issue a
                      Resolution regarding {displayTitle};
                    </li>
                  </ol>

                  <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.25rem' }}>
                    In View Of:
                  </div>
                  <ol style={{ paddingLeft: '1.2rem', margin: '0 0 0.8rem 0' }}>
                    <li>Law Number 40 of 2007 on Limited Liability Companies;</li>
                    <li>Documents and Records Control Procedure (0001-SOP-GNR-CEO-IX-2026);</li>
                    <li>Integrated Management System (IMS) Manual of PT Nirwana Bhumi Energy;</li>
                    <li>Corporate Quality, Health, Safety, and Environment (QHSE) Policy;</li>
                    <li>Articles of Association and General Meeting of Shareholders Resolutions;</li>
                  </ol>

                  <div style={{ fontWeight: 'bold', textAlign: 'center', margin: '0.6rem 0' }}>
                    HEREBY RESOLVES:
                  </div>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.4rem' }}>
                    To Enact: DIRECTORS' RESOLUTION REGARDING {displayTitle}.
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#003366' }}>FIRST:</div>
                  <p style={{ margin: '0 0 0.5rem 0' }}>
                    To institute the 6-Segment Integrated Document Numbering Standard{' '}
                    <strong>[4DigitSeq]-[Category]-[Division]-[Approver]-[RomanMonth]-[Year]</strong> as the sole corporate
                    identifier. Exactly one code strictly governs one document.
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '9.5pt', lineHeight: '1.6', color: '#3B3838' }}>
                <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.3rem' }}>
                  {language === 'en' ? 'Having Considered:' : 'Menimbang:'}
                </div>
                <ol style={{ paddingLeft: '1.5rem', margin: '0 0 1rem 0' }} type="a">
                  <li>
                    {language === 'en'
                      ? 'that in order to establish administrative order, corporate documentation standards, and rigorous quality assurance within PT Nirwana Bhumi Energy;'
                      : 'bahwa dalam rangka tertib administrasi, standardisasi persuratan, dan penjaminan mutu tata kelola dokumen di lingkungan PT Nirwana Bhumi Energy;'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'that to guarantee strict compliance with the Integrated Management System (IMS), ISO 9001, ISO 45001, and CSMS document control requirements;'
                      : 'bahwa untuk menjamin kepatuhan sistem kontrol dokumen terhadap standar Integrated Management System (IMS), ISO 9001, ISO 45001, dan CSMS;'}
                  </li>
                  <li>
                    {language === 'en'
                      ? `that in view of the considerations set forth in paragraphs a and b above, it is necessary to issue a Board of Directors' Resolution regarding ${displayTitle};`
                      : `bahwa berdasarkan pertimbangan sebagaimana dimaksud dalam huruf a dan b di atas, perlu menetapkan Keputusan Direksi tentang ${displayTitle};`}
                  </li>
                </ol>

                <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.3rem' }}>
                  {language === 'en' ? 'In View Of:' : 'Mengingat:'}
                </div>
                <ol style={{ paddingLeft: '1.5rem', margin: '0 0 1rem 0' }}>
                  <li>
                    {language === 'en'
                      ? 'Law Number 40 of 2007 concerning Limited Liability Companies;'
                      : 'Undang-Undang Nomor 40 Tahun 2007 tentang Perseroan Terbatas;'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Documents and Records Control Procedure (0001-SOP-GNR-CEO-IX-2026);'
                      : 'Prosedur Baku Pengendalian Dokumen PT NBE (0001-SOP-GNR-CEO-IX-2026);'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Integrated Management System (IMS) Manual of PT Nirwana Bhumi Energy;'
                      : 'Manual Sistem Manajemen Terintegrasi (IMS) PT Nirwana Bhumi Energy;'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Corporate Quality, Health, Safety, and Environment (QHSE) Policy;'
                      : 'Kebijakan Mutu, Keselamatan Kerja, dan Lindung Lingkungan (K3LL);'}
                  </li>
                  <li>
                    {language === 'en'
                      ? 'Articles of Association and Resolutions of General Meeting of Shareholders;'
                      : 'Anggaran Dasar dan Ketetapan Rapat Umum Pemegang Saham (RUPS) PT Nirwana Bhumi Energy;'}
                  </li>
                </ol>

                <div
                  style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '11pt',
                    margin: '1.25rem 0 0.85rem 0',
                    color: '#000000',
                  }}
                >
                  {language === 'en' ? 'HEREBY RESOLVES:' : 'MEMUTUSKAN:'}
                </div>

                <div style={{ fontWeight: 'bold', marginBottom: '0.75rem' }}>
                  {language === 'en'
                    ? `To Enact: RESOLUTION OF THE BOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY REGARDING ${displayTitle}.`
                    : `Menetapkan: KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY TENTANG ${displayTitle}.`}
                </div>

                <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.25rem' }}>
                  {language === 'en' ? 'FIRST:' : 'KESATU:'}
                </div>
                <p style={{ margin: '0 0 0.85rem 0' }}>
                  {language === 'en'
                    ? `To establish the 6-Segment Integrated Corporate Document Numbering Standard with format [4DigitSeq]-[Category]-[Division]-[Approver]-[RomanMonth]-[Year] as the sole legal identifier for all corporate documents. Each code applies strictly and uniquely to exactly 1 (one) document.`
                    : `Menetapkan Standar Penomoran Dokumen Resmi Terintegrasi 6-Segmen dengan format baku [NomorUrut4Digit]-[Kategori]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun] sebagai satu-satunya identitas resmi dokumen korporat PT Nirwana Bhumi Energy. Setiap satu kode surat berlaku unik mutlak hanya untuk 1 (satu) dokumen saja dan dilarang digunakan ganda.`}
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
        )}

        {/* ============================================================== */}
        {/* HALAMAN 4: LANJUTAN DIKTUM, TIM DCC, & TANDA TANGAN 3 KOLOM    */}
        {/* ============================================================== */}
        {(activePageTab === 'all' || activePageTab === 4) && (
          <div style={a4PageStyle} id="nbe-page-4">
            {/* Kop Mini Running Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid #003366',
                paddingBottom: '0.5rem',
                marginBottom: '1.25rem',
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
            <div style={{ fontSize: '9.5pt', lineHeight: '1.5', color: '#3B3838' }}>
              <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.25rem' }}>
                {language === 'en' ? 'SECOND:' : 'KEDUA:'}
              </div>
              <p style={{ margin: '0 0 0.65rem 0' }}>
                {language === 'en'
                  ? 'To appoint the Document Control Center (DCC) Team with the following personnel and organizational responsibilities:'
                  : 'Menunjuk Tim Document Control Center (DCC) PT Nirwana Bhumi Energy dengan susunan personel serta peran tanggung jawab sebagai berikut:'}
              </p>

              {/* Tabel Tim DCC (4 Kolom, Full Width, Header #D9E1F2, Zebra Fill) */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #BFBFBF',
                  marginBottom: '1rem',
                }}
              >
                <thead>
                  <tr>
                    <th style={{ ...tableHeaderStyle, width: '6%' }}>No</th>
                    <th style={{ ...tableHeaderStyle, width: '26%' }}>
                      {language === 'en' ? 'Personnel Name' : 'Nama Personel'}
                    </th>
                    <th style={{ ...tableHeaderStyle, width: '28%' }}>
                      {language === 'en' ? 'Structural Position' : 'Jabatan Struktural'}
                    </th>
                    <th style={{ ...tableHeaderStyle, width: '40%' }}>
                      {language === 'en' ? 'DCC Role & Responsibilities' : 'Peran & Tanggung Jawab DCC'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#FFFFFF' }}>
                    <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold' }}>1</td>
                    <td style={{ ...tableCellStyle, fontWeight: 'bold' }}>Bima Satryo Hartanto</td>
                    <td style={tableCellStyle}>
                      {language === 'en' ? 'President Director (CEO)' : 'Direktur Utama (CEO)'}
                    </td>
                    <td style={tableCellStyle}>
                      {language === 'en'
                        ? 'Highest Corporate Document Approval & Authorization'
                        : 'Penanggung Jawab Otorisasi & Pengesah Dokumen Puncak Korporat'}
                    </td>
                  </tr>
                  <tr style={{ background: '#F9FBFD' }}>
                    <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold' }}>2</td>
                    <td style={{ ...tableCellStyle, fontWeight: 'bold' }}>Dennis Raditya</td>
                    <td style={tableCellStyle}>
                      {language === 'en' ? 'Technical Director (CTO)' : 'Direktur Teknik (CTO)'}
                    </td>
                    <td style={tableCellStyle}>
                      {language === 'en'
                        ? 'Technical Standard & Engineering Quality Verification'
                        : 'Verifikator Standar Teknis & Engineering Quality Assurance'}
                    </td>
                  </tr>
                  <tr style={{ background: '#FFFFFF' }}>
                    <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold' }}>3</td>
                    <td style={{ ...tableCellStyle, fontWeight: 'bold' }}>Mazmur Gusti Agung Larosa</td>
                    <td style={tableCellStyle}>
                      {language === 'en'
                        ? 'Finance Director (CFO) / Lead DCC'
                        : 'Direktur Keuangan (CFO) / Lead DCC'}
                    </td>
                    <td style={tableCellStyle}>
                      {language === 'en'
                        ? 'Lead Document Controller, Numbering & Cloud Register Admin'
                        : 'Lead Document Controller, Administrator Sistem Penomoran & Cloud Register'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Diktum KETIGA, KEEMPAT, KELIMA */}
              <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.2rem' }}>
                {language === 'en' ? 'THIRD:' : 'KETIGA:'}
              </div>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                {language === 'en'
                  ? 'All finalized documents shall be locked via the "Fix Code" protocol and automatically archived into the Corporate Google Drive Document Control Center (Root Folder ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF).'
                  : 'Seluruh dokumen yang telah final wajib dikunci melalui fungsi "Fix Kode" dan diarsipkan secara otomatis ke direktori Google Drive Document Control Center (Root Folder ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF).'}
              </p>

              <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.2rem' }}>
                {language === 'en' ? 'FOURTH:' : 'KEEMPAT:'}
              </div>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                {language === 'en'
                  ? 'Any subsequent amendments shall follow the formal Revision Index workflow (-rev1, obsolete mark) and remain audited within the central register.'
                  : 'Setiap pembaruan dokumen wajib melalui alur penerbitan revisi resmi (-rev1, tanda kedaluwarsa/obsolete) dan tercatat dalam Master Register.'}
              </p>

              <div style={{ fontWeight: 'bold', color: '#003366', marginBottom: '0.2rem' }}>
                {language === 'en' ? 'FIFTH:' : 'KELIMA:'}
              </div>
              <p style={{ margin: '0 0 0.75rem 0' }}>
                {language === 'en'
                  ? 'This Resolution takes effect from the date of issuance with the stipulation that any inadvertent errors shall be rectified accordingly.'
                  : 'Keputusan ini mulai berlaku sejak tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diperbaiki sebagaimana mestinya.'}
              </p>
            </div>

            {/* Tempat & Tanggal Penetapan */}
            <div style={{ textAlign: 'right', fontSize: '9pt', margin: '0.85rem 0 0.5rem 0' }}>
              <div>
                {language === 'en'
                  ? 'Enacted in Semarang / Tuban'
                  : 'Ditetapkan di Semarang / Tuban'}
              </div>
              <div style={{ fontWeight: 'bold', color: '#000000' }}>
                {language === 'en' ? 'On:' : 'Pada tanggal:'}{' '}
                {language === 'en' ? formattedDateEn : formattedDate}
              </div>
              <div style={{ fontWeight: 'bold', color: '#003366', marginTop: '2px' }}>
                PT NIRWANA BHUMI ENERGY
              </div>
            </div>

            {/* Tabel Tanda Tangan 3 Kolom */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #BFBFBF',
                marginTop: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <thead>
                <tr style={{ background: '#F1F5F9' }}>
                  <th style={{ ...tableCellStyle, width: '33.33%', textAlign: 'center', fontWeight: 'bold' }}>
                    {language === 'en' ? 'Approved By' : 'Disetujui Oleh'}
                    <div style={{ fontSize: '8pt', color: '#64748b' }}>
                      {language === 'en' ? 'President Director (CEO)' : 'Direktur Utama (CEO)'}
                    </div>
                  </th>
                  <th style={{ ...tableCellStyle, width: '33.33%', textAlign: 'center', fontWeight: 'bold' }}>
                    {language === 'en' ? 'Verified By' : 'Diverifikasi Oleh'}
                    <div style={{ fontSize: '8pt', color: '#64748b' }}>
                      {language === 'en' ? 'Technical Director (CTO)' : 'Direktur Teknik (CTO)'}
                    </div>
                  </th>
                  <th style={{ ...tableCellStyle, width: '33.33%', textAlign: 'center', fontWeight: 'bold' }}>
                    {language === 'en' ? 'Prepared By' : 'Disiapkan Oleh'}
                    <div style={{ fontSize: '8pt', color: '#64748b' }}>
                      {language === 'en' ? 'Finance Director (CFO) / DCC Lead' : 'Direktur Keuangan / Lead DCC'}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ height: '70px', verticalAlign: 'middle', background: '#FFFFFF' }}>
                  <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        border: '1px dashed #94a3b8',
                        fontSize: '7.5pt',
                        color: '#64748b',
                        marginBottom: '4px',
                      }}
                    >
                      [ Meterai Rp 10.000 ]
                    </div>
                    <div style={{ fontSize: '8pt', color: '#003366', fontWeight: 'bold' }}>
                      [ Tanda Tangan & Cap ]
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                    <div style={{ fontSize: '8pt', color: '#003366', fontWeight: 'bold' }}>
                      [ Tanda Tangan & Cap ]
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                    <div style={{ fontSize: '8pt', color: '#003366', fontWeight: 'bold' }}>
                      [ Tanda Tangan & Cap ]
                    </div>
                  </td>
                </tr>
                <tr style={{ background: '#F8FAFC' }}>
                  <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold', color: '#000000' }}>
                    BIMA SATRYO HARTANTO
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold', color: '#000000' }}>
                    DENNIS RADITYA
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold', color: '#000000' }}>
                    MAZMUR GUSTI AGUNG LAROSA
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
        )}
      </div>
    </div>
  );
};
