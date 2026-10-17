import React, { useState } from 'react';
import {
  FileText,
  FileCheck,
  Upload,
  Download,
  RotateCcw,
  Save,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Eye,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import {
  loadTemplateSettings,
  saveTemplateSettings,
  resetTemplateSettings,
  DocumentTemplateSettings,
  DEFAULT_TEMPLATE_SETTINGS,
} from '../services/templateSettings';
import { LanguageSelector } from './LanguageSelector';
import { A4DocumentPreview } from './A4DocumentPreview';
import { DocumentLanguage } from '../types';
import { generateAndDownloadNbeDocx } from '../utils/nbeDocxGenerator';

export const TemplateReferenceView: React.FC = () => {
  const [settings, setSettings] = useState<DocumentTemplateSettings>(() => loadTemplateSettings());
  const [selectedLang, setSelectedLang] = useState<DocumentLanguage>('id');
  const [isSavedBanner, setIsSavedBanner] = useState(false);
  const [txtFileName, setTxtFileName] = useState(settings.txtGuidelinesName || 'ACUAN_TEMPLATE_SURAT_KEPUTUSAN_DIREKSI_NBE.txt');
  const [pdfFileName, setPdfFileName] = useState(settings.pdfLayoutName || '0002-KB-GNR-CEO-X-2026.pdf');
  const [txtContent, setTxtContent] = useState(settings.txtGuidelinesContent);

  // File Upload Handlers
  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTxtFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setTxtContent(text);
        const updated = {
          ...settings,
          txtGuidelinesName: file.name,
          txtGuidelinesContent: text,
        };
        setSettings(updated);
        saveTemplateSettings(updated);
        triggerSuccessBanner();
      }
    };
    reader.readAsText(file);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const updated = {
          ...settings,
          pdfLayoutName: file.name,
          pdfLayoutDataUrl: dataUrl,
        };
        setSettings(updated);
        saveTemplateSettings(updated);
        triggerSuccessBanner();
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerSuccessBanner = () => {
    setIsSavedBanner(true);
    setTimeout(() => setIsSavedBanner(false), 3000);
  };

  const handleSaveAll = () => {
    const updated: DocumentTemplateSettings = {
      ...settings,
      txtGuidelinesName: txtFileName,
      txtGuidelinesContent: txtContent,
      pdfLayoutName: pdfFileName,
    };
    setSettings(updated);
    saveTemplateSettings(updated);
    triggerSuccessBanner();
  };

  const handleResetDefaults = () => {
    if (confirm('Kembalikan konfigurasi Acuan Template Dokumen ke standar baku PT Nirwana Bhumi Energy?')) {
      const def = resetTemplateSettings();
      setSettings(def);
      setTxtFileName(def.txtGuidelinesName || 'ACUAN_TEMPLATE_SURAT_KEPUTUSAN_DIREKSI_NBE.txt');
      setPdfFileName(def.pdfLayoutName || '0002-KB-GNR-CEO-X-2026.pdf');
      setTxtContent(def.txtGuidelinesContent);
      triggerSuccessBanner();
    }
  };

  const handleDownloadSampleDocx = async () => {
    try {
      await generateAndDownloadNbeDocx({
        docCode: '0002-KB-GNR-CEO-X-2026',
        titleId: 'SISTEM MANAJEMEN PENGENDALIAN DOKUMEN DAN PENUNJUKAN TIM DOCUMENT CONTROL CENTER (DCC)',
        titleEn: 'ESTABLISHMENT OF DOCUMENT CONTROL MANAGEMENT SYSTEM AND APPOINTMENT OF DCC TEAM',
        categoryNameId: 'Kebijakan Perusahaan (Company Policy / KB)',
        divisionName: 'General & Management (GNR)',
        revisionNo: '0',
        issueDateId: '17 Oktober 2026',
        issueDateEn: '17 October 2026',
        preparedBy: 'Mazmur Gusti Agung Larosa',
        preparedRole: 'Director of Finance & Engineering / DCC Lead',
        verifiedBy: 'Dennis Raditya',
        verifiedRole: 'Director of Operations & Technology / CTO',
        approvedBy: 'Bima Satryo Hartanto',
        approvedRole: 'President Director / CEO',
        language: selectedLang,
      });
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Gagal mengunduh berkas Word (.docx): ' + err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header View */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              style={{
                padding: '0.45rem',
                borderRadius: '8px',
                background: 'rgba(2, 132, 199, 0.1)',
                color: '#0284c7',
                display: 'flex',
              }}
            >
              <BookOpen size={24} />
            </span>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Acuan Template Dokumen & Panduan Standardisasi NBE
            </h1>
          </div>
          <p
            style={{
              margin: '0.35rem 0 0 0',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            Spesifikasi baku tata letak sub-pixel, kop surat, tabel revisi bersih, dan diktum 4 halaman resmi PT Nirwana Bhumi Energy.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <RotateCcw size={15} />
            <span>Reset ke Default NBE</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="btn btn-primary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'linear-gradient(135deg, #003366 0%, #004080 100%)',
            }}
          >
            <Save size={15} />
            <span>Simpan Acuan Template</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {isSavedBanner && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>Acuan Template Dokumen (.txt & .pdf) berhasil disimpan dan disinkronkan ke seluruh sistem!</span>
        </div>
      )}

      {/* DUA KOLOM UNGGAH BERKAS ACUAN: 1.a (.TXT) & 1.b (.PDF) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* KOLOM 1: BERKAS ACUAN ATURAN TEKS (.TXT) */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  padding: '0.45rem',
                  borderRadius: '6px',
                  background: 'rgba(2, 132, 199, 0.12)',
                  color: '#0284c7',
                }}
              >
                <FileText size={20} />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  1.a Berkas Acuan Aturan Teks (.txt / .md)
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Dasar aturan teks, diktum, dan hierarki logika utama dokumen
                </span>
              </div>
            </div>
            <label
              className="btn btn-secondary btn-sm"
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Upload size={14} />
              <span>Ganti File TXT</span>
              <input
                type="file"
                accept=".txt,.md"
                onChange={handleTxtUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              background: 'var(--bg-tertiary, #f8fafc)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={16} color="#10b981" />
              <strong style={{ color: 'var(--text-primary)' }}>{txtFileName}</strong>
            </div>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Tersinkronisasi Aktif</span>
          </div>

          {/* Textarea editor for txt content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.35rem',
              }}
            >
              Isi Diktum & Aturan Standar Baku:
            </label>
            <textarea
              value={txtContent}
              onChange={(e) => setTxtContent(e.target.value)}
              rows={12}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                lineHeight: '1.5',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* KOLOM 2: BERKAS ACUAN GEOMETRI VISUAL (.PDF) */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  padding: '0.45rem',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                }}
              >
                <BookOpen size={20} />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  1.b Berkas Acuan Geometri Visual (.pdf)
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Dasar geometri visual, posisi logo, margin, kop, dan estetika layout
                </span>
              </div>
            </div>
            <label
              className="btn btn-secondary btn-sm"
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Upload size={14} />
              <span>Ganti File PDF</span>
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              background: 'var(--bg-tertiary, #f8fafc)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCheck size={16} color="#ef4444" />
              <strong style={{ color: 'var(--text-primary)' }}>{pdfFileName}</strong>
            </div>
            <span
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              PDF Layout Baku
            </span>
          </div>

          {/* Quick Links to Reference PDFs in Workspace */}
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              padding: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                display: 'block',
                marginBottom: '0.65rem',
              }}
            >
              Berkas Acuan Baku Tersedia di Sistem:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a
                href="/0002-KB-GNR-CEO-X-2026.pdf"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: '#059669',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <span>📄 0002-KB-GNR-CEO-X-2026 (SK Direksi ID - Revisi Final)</span>
                <ExternalLink size={14} />
              </a>

              <a
                href="/0002-KB-GNR-CEO-X-2026-EN.pdf"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: '#2563eb',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <span>📄 0002-KB-GNR-CEO-X-2026-EN (British English Resolution)</span>
                <ExternalLink size={14} />
              </a>

              <a
                href="/0002-KB-GNR-CEO-X-2026-BI.pdf"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: '#9333ea',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <span>📄 0002-KB-GNR-CEO-X-2026-BI (Bilingual ID - EN Parallel)</span>
                <ExternalLink size={14} />
              </a>

              <a
                href="/ACUAN_TEMPLATE_SURAT_KEPUTUSAN_DIREKSI_NBE.txt"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  color: '#0284c7',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <span>📝 ACUAN_TEMPLATE_SURAT_KEPUTUSAN_DIREKSI_NBE.txt</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Parameter Geometri Baku (Bagian 3) */}
          <div
            style={{
              background: 'rgba(0, 51, 102, 0.04)',
              border: '1px solid rgba(0, 51, 102, 0.15)',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '0.82rem',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: '#003366',
                marginBottom: '0.45rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Sliders size={15} />
              <span>Parameter Geometri Dokumen Baku NBE (A4 4 Halaman):</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              <li>
                <strong>Ukuran Kertas:</strong> A4 Standard (210 x 297 mm)
              </li>
              <li>
                <strong>Margin Baku:</strong> Kiri = 2.2 cm (1247 dxa), Kanan = 2.0 cm, Atas = 2.0 cm, Bawah = 2.0 cm
              </li>
              <li>
                <strong>Tipografi:</strong> Arial untuk seluruh hierarki teks
              </li>
              <li>
                <strong>Palet Warna:</strong> Judul (#000000), Body (#3B3838), Kode (#003366), Header Tabel (#D9E1F2), Alternating Fill (#FFFFFF & #F9FBFD)
              </li>
              <li>
                <strong>Halaman 2:</strong> Catatan Kendali Dokumen DITIADAKAN (bersih hanya tabel revisi)
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* LANGUAGE SELECTOR & REAL PAPER-SIZE PREVIEW */}
      <div style={{ marginTop: '2rem' }}>
        <LanguageSelector
          selectedLang={selectedLang}
          onSelectLang={(l) => setSelectedLang(l)}
        />

        <A4DocumentPreview
          language={selectedLang}
          title="SISTEM KONTROL DAN PENOMORAN DOKUMEN"
          code="0001-KB-GNR-CEO-X-2026"
          issueDate="2026-10-17"
          revision={0}
          preparedBy="Mazmur Gusti Agung Larosa"
          verifiedBy="Dennis Raditya"
          approvedBy="Bima Satryo Hartanto"
          typeLabel="Surat Keputusan Direksi (KB)"
          divisionLabel="General (GNR)"
          approverLabel="President Director (CEO)"
          onDownloadDocx={handleDownloadSampleDocx}
        />
      </div>
    </div>
  );
};
