import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  Building2,
  PlusCircle,
  FileSpreadsheet,
  Search,
  Copy,
  Check,
  Eye,
  Edit3,
  Trash2,
  FileCheck,
  HardDrive,
  BarChart3,
  History,
  FolderPlus,
  Folder,
  TrendingUp,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { DocumentRecord, CodeDefinition, DocumentStatus } from '../types';
import { exportToCSV } from '../services/storage';
import { getMasterCodes } from '../services/masterCodes';

interface DashboardViewProps {
  documents: DocumentRecord[];
  onNavigateToCreate: () => void;
  onNavigateToCreateFolder?: () => void;
  onViewDocument: (doc: DocumentRecord) => void;
  onEditDocument: (doc: DocumentRecord) => void;
  onReviseDocument?: (doc: DocumentRecord) => void;
  onDeleteDocument: (id: string) => void;
  filterApproverRole?: string; // e.g. CEO, CTO, COO, CFO
  filterDivisionCode?: string; // e.g. GNR, ENG, OPR, FNC
  roleTitle?: string;
  documentTypes?: CodeDefinition[];
  divisions?: CodeDefinition[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  documents,
  onNavigateToCreate,
  onNavigateToCreateFolder,
  onViewDocument,
  onEditDocument,
  onReviseDocument,
  onDeleteDocument,
  filterApproverRole,
  filterDivisionCode,
  roleTitle,
  documentTypes,
  divisions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // If filtered by specific publishing division or director role (from sidebar)
  const baseDocs = filterDivisionCode
    ? documents.filter(
        (d) => (d.divisionCode || '').toUpperCase() === filterDivisionCode.toUpperCase()
      )
    : filterApproverRole
    ? documents.filter(
        (d) =>
          d.approverCode.toUpperCase() === filterApproverRole.toUpperCase() ||
          (d.approvedBy && d.approvedBy.toUpperCase().includes(filterApproverRole.toUpperCase()))
      )
    : documents;

  const total = baseDocs.length;
  const publishedCount = baseDocs.filter((d) => d.status === 'Published').length;
  const inReviewCount = baseDocs.filter((d) => d.status === 'In Review' || d.status === 'Draft').length;
  const approvedCount = baseDocs.filter((d) => d.status === 'Approved').length;

  // Load dynamic master codes if not provided via props, or fallback to stored master codes
  const baseMasterCodes = getMasterCodes();
  const effectiveDocTypes =
    documentTypes && documentTypes.length > 0
      ? documentTypes
      : baseMasterCodes.documentTypes;

  const effectiveDivisions =
    divisions && divisions.length > 0
      ? divisions
      : baseMasterCodes.divisions;

  // Include any extra document type codes present in documents that might not be in master list
  const knownTypeCodes = new Set(effectiveDocTypes.map((t) => t.code.toUpperCase()));
  const extraTypes: CodeDefinition[] = [];
  baseDocs.forEach((d) => {
    if (d.typeCode && !knownTypeCodes.has(d.typeCode.toUpperCase())) {
      knownTypeCodes.add(d.typeCode.toUpperCase());
      extraTypes.push({
        code: d.typeCode.toUpperCase(),
        label: d.typeCode.toUpperCase(),
        description: 'Kategori Tambahan',
        isCustom: true,
      });
    }
  });
  const allDocTypes = [...effectiveDocTypes, ...extraTypes];

  // Include any extra division codes present in documents
  const knownDivCodes = new Set(effectiveDivisions.map((d) => d.code.toUpperCase()));
  const extraDivs: CodeDefinition[] = [];
  baseDocs.forEach((d) => {
    if (d.divisionCode && !knownDivCodes.has(d.divisionCode.toUpperCase())) {
      knownDivCodes.add(d.divisionCode.toUpperCase());
      extraDivs.push({
        code: d.divisionCode.toUpperCase(),
        label: d.divisionCode.toUpperCase(),
        description: 'Divisi Tambahan',
        isCustom: true,
      });
    }
  });
  const allDivisions = [...effectiveDivisions, ...extraDivs];

  // Dynamic Type Breakdown (otomatis update jika ada penambahan kategori surat)
  const typeCounts = allDocTypes.map((t) => ({
    ...t,
    count: baseDocs.filter((d) => d.typeCode.toUpperCase() === t.code.toUpperCase()).length,
  }));

  // Dynamic Division Breakdown (otomatis update jika ada penambahan divisi)
  const divisionCounts = allDivisions.map((d) => ({
    ...d,
    count: (filterDivisionCode ? documents : baseDocs).filter(
      (doc) => (doc.divisionCode || '').toUpperCase() === d.code.toUpperCase()
    ).length,
  }));

  // Filtered documents list
  const filteredDocs = baseDocs.filter((doc) => {
    const matchesSearch =
      doc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.approvedBy && doc.approvedBy.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = selectedType === 'ALL' || doc.typeCode === selectedType;
    const matchesDivision = filterDivisionCode
      ? true
      : selectedDivision === 'ALL' || doc.divisionCode === selectedDivision;

    return matchesSearch && matchesType && matchesDivision;
  });

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'Published':
        return <span className="badge badge-success">Published</span>;
      case 'Approved':
        return <span className="badge badge-primary">Approved</span>;
      case 'In Review':
        return <span className="badge badge-blue">In Review</span>;
      case 'Draft':
        return <span className="badge badge-warning">Draft</span>;
      case 'Archived':
        return <span className="badge badge-danger">Archived</span>;
      default:
        return <span className="badge badge-primary">{status}</span>;
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          margin: '1.75rem 0 1.5rem 0',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
            }}
          >
            <BarChart3 color="var(--primary)" size={26} />
            {roleTitle ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span>Dashboard Dokumen</span>
                <span className="badge badge-primary" style={{ fontSize: '0.8125rem', padding: '0.2rem 0.6rem' }}>
                  {roleTitle}
                </span>
              </span>
            ) : (
              'Dashboard & Kontrol Dokumen'
            )}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
            Ringkasan jumlah surat, statistik kategori, dan daftar lengkap dokumen yang telah terdaftar resmi di PT Nirwana Bhumi Energi.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => exportToCSV(documents)}
            className="btn btn-secondary btn-sm"
            title="Ekspor ke CSV / Google Sheets"
          >
            <FileSpreadsheet size={15} color="#10b981" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={onNavigateToCreate}
            className="btn btn-primary btn-sm"
          >
            <PlusCircle size={15} />
            <span>+ Daftarkan Surat Baru</span>
          </button>
          {onNavigateToCreateFolder && (
            <button
              onClick={onNavigateToCreateFolder}
              className="btn btn-secondary btn-sm"
              style={{
                borderColor: '#0284c7',
                color: '#38bdf8',
                background: 'rgba(2, 132, 199, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              title="Daftarkan banyak file / direktori folder sekaligus"
            >
              <FolderPlus size={15} />
              <span>+ Daftarkan Folder</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. 21ST.DEV STYLE BENTO GRID METRICS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        {/* Bento Hero Card: Total Dokumen & Live Ratio */}
        <div 
          className="bento-card" 
          style={{ 
            padding: '1.6rem',
            gridColumn: 'span 2',
            background: 'linear-gradient(135deg, rgba(0, 212, 178, 0.06) 0%, var(--bg-card) 100%)',
            border: '1px solid var(--border-accent)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '190px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span className="badge badge-primary" style={{ padding: '0.2rem 0.55rem' }}>
                  <Activity size={13} />
                  <span>Sistem Arsip Resmi NBE</span>
                </span>
                <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span>Cloud Active</span>
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Diperbarui Real-time
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                {total}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Total Surat Terdaftar di Seluruh Divisi
              </div>
            </div>
          </div>

          {/* Micro Distribution Bar (21st.dev Signature) */}
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              <span>Distribusi Status:</span>
              <span style={{ fontWeight: 600 }}>
                {publishedCount} Terbit · {approvedCount} Setuju · {inReviewCount} Review
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '6px', overflow: 'hidden', display: 'flex', gap: '2px' }}>
              <div 
                style={{ 
                  width: total > 0 ? `${(publishedCount / total) * 100}%` : '0%', 
                  background: 'var(--success)', 
                  transition: 'width 0.3s ease' 
                }} 
                title={`Diterbitkan: ${publishedCount}`}
              />
              <div 
                style={{ 
                  width: total > 0 ? `${(approvedCount / total) * 100}%` : '0%', 
                  background: '#38bdf8', 
                  transition: 'width 0.3s ease' 
                }} 
                title={`Disetujui: ${approvedCount}`}
              />
              <div 
                style={{ 
                  width: total > 0 ? `${(inReviewCount / total) * 100}%` : '0%', 
                  background: 'var(--warning)', 
                  transition: 'width 0.3s ease' 
                }} 
                title={`In Review: ${inReviewCount}`}
              />
            </div>
          </div>
        </div>

        {/* Bento Cell: Diterbitkan (Published) */}
        <div className="bento-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Surat Diterbitkan
              </span>
              <div style={{ background: 'var(--success-bg)', padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <CheckCircle2 size={18} color="var(--success)" />
              </div>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.65rem', fontVariantNumeric: 'tabular-nums' }}>
              {publishedCount}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Efektivitas</span>
            <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
              {total > 0 ? Math.round((publishedCount / total) * 100) : 0}% Aktif
            </span>
          </div>
        </div>

        {/* Bento Cell: Menunggu Review (Actionable) */}
        <div 
          className="bento-card" 
          style={{ 
            padding: '1.5rem', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            border: inReviewCount > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : undefined,
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Menunggu Review
              </span>
              <div style={{ background: 'var(--warning-bg)', padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                <Clock size={18} color="var(--warning)" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginTop: '0.65rem' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>
                {inReviewCount}
              </div>
              {inReviewCount > 0 && (
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                  Perlu Verifikasi
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status Dokumen</span>
            <span style={{ fontSize: '0.75rem', color: inReviewCount > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: 600 }}>
              {inReviewCount > 0 ? 'Menunggu Approval' : 'Semua Bersih'}
            </span>
          </div>
        </div>

        {/* Bento Cell: Disetujui Direksi */}
        <div className="bento-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                Disetujui Direksi
              </span>
              <div style={{ background: 'rgba(2, 132, 199, 0.15)', padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(2, 132, 199, 0.25)' }}>
                <Shield size={18} color="#38bdf8" />
              </div>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.65rem', fontVariantNumeric: 'tabular-nums' }}>
              {approvedCount}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tingkat Validasi</span>
            <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
              {total > 0 ? Math.round((approvedCount / total) * 100) : 0}% Disetujui
            </span>
          </div>
        </div>
      </div>

      {/* 2. STATISTIK KATEGORI & DIVISI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Distribusi Kategori Surat */}
        <div className="bento-card" style={{ padding: '1.5rem' }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Layers size={17} color="var(--primary)" />
            Statistik Kategori Surat (Document Type)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {typeCounts.map((t) => {
              const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
              return (
                <div key={t.code}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="badge badge-purple mono">{t.code}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.label.split('(')[0]}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }} className="mono">
                      {t.count} surat ({pct}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #818cf8, var(--primary))', borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribusi Divisi */}
        <div className="bento-card" style={{ padding: '1.5rem' }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Building2 size={17} color="#0284c7" />
            Statistik Divisi Penerbit (Division)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {divisionCounts.map((d) => {
              const divTotal = filterDivisionCode ? documents.length : total;
              const pct = divTotal > 0 ? Math.round((d.count / divTotal) * 100) : 0;
              const isCurrent = filterDivisionCode
                ? d.code.toUpperCase() === filterDivisionCode.toUpperCase()
                : false;

              return (
                <div
                  key={d.code}
                  style={
                    isCurrent
                      ? {
                          background: 'rgba(2, 132, 199, 0.08)',
                          padding: '0.4rem 0.5rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(2, 132, 199, 0.2)',
                        }
                      : undefined
                  }
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className={`badge ${isCurrent ? 'badge-primary' : 'badge-blue'} mono`}>{d.code}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: isCurrent ? 800 : 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>{d.label.split('(')[0]}</span>
                        {isCurrent && <Check size={14} color="var(--primary)" />}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }} className="mono">
                      {d.count} surat ({pct}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: isCurrent
                          ? 'linear-gradient(90deg, #0284c7, #38bdf8)'
                          : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. APA SAJA YANG SUDAH TERDAFTAR (DAFTAR SURAT) */}
      <div className="bento-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span className="badge badge-primary mono" style={{ fontSize: '0.7rem' }}>LIVE ARSIP</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Daftar Surat & Dokumen Terdaftar ({filteredDocs.length})
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Telusuri berkas, buka pratinjau PDF, dan salin kode resmi dokumen.
            </p>
          </div>

          {/* Quick Search with 21st.dev Kbd Hint */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari kode atau judul..."
                className="form-input"
                style={{ paddingLeft: '2.3rem', paddingRight: '2.75rem', width: '250px', fontSize: '0.85rem' }}
              />
              <span
                className="kbd"
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              >
                ⌘K
              </span>
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-select"
              style={{ width: '130px', fontSize: '0.825rem' }}
            >
              <option value="ALL">Kategori</option>
              {allDocTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code}
                </option>
              ))}
            </select>

            <select
              value={filterDivisionCode ? filterDivisionCode : selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              disabled={!!filterDivisionCode}
              className="form-select"
              style={{
                width: '120px',
                fontSize: '0.825rem',
                opacity: filterDivisionCode ? 0.75 : 1,
                cursor: filterDivisionCode ? 'not-allowed' : 'pointer',
              }}
              title={filterDivisionCode ? `Terkunci pada Divisi ${filterDivisionCode}` : 'Filter Divisi'}
            >
              <option value="ALL">Divisi</option>
              {allDivisions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table of Registered Documents */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead className="table-sticky-header">
              <tr style={{ background: 'rgba(0,0,0,0.22)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Kode Surat</th>
                <th style={{ padding: '0.75rem 1rem' }}>Judul Dokumen</th>
                <th style={{ padding: '0.75rem 1rem' }}>Kategori & Divisi</th>
                <th style={{ padding: '0.75rem 1rem' }}>Penyetuju (Approver)</th>
                <th style={{ padding: '0.75rem 1rem' }}>Rev</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Berkas / Drive</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr
                  key={doc.id}
                  className="table-row-hover"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  {/* Kode Surat */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        className="mono"
                        style={{
                          fontWeight: 700,
                          color: 'var(--primary)',
                          background: 'rgba(0,0,0,0.25)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                        }}
                      >
                        {doc.code}
                      </span>
                      <button
                        onClick={() => handleCopy(doc.code, doc.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.2rem' }}
                        title="Salin Kode Surat"
                      >
                        {copiedId === doc.id ? (
                          <Check size={14} color="var(--success)" />
                        ) : (
                          <Copy size={14} color="var(--text-muted)" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Judul Dokumen */}
                  <td style={{ padding: '0.75rem 1rem', maxWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {doc.isFolder && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(2, 132, 199, 0.2)',
                            color: '#38bdf8',
                            border: '1px solid rgba(2, 132, 199, 0.45)',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          <Folder size={11} /> Folder ({doc.files?.length || 1} berkas)
                        </span>
                      )}
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{doc.title}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {doc.createdBy} • Terbit: {doc.issueDate}
                    </div>
                  </td>

                  {/* Kategori & Divisi */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-purple">{doc.typeCode}</span>
                      {doc.subCategoryCode && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(6, 182, 212, 0.15)',
                            color: '#22d3ee',
                            border: '1px solid rgba(6, 182, 212, 0.35)',
                          }}
                          title={`Sub-Kategori: ${doc.subCategoryCode}`}
                        >
                          {doc.subCategoryCode}
                        </span>
                      )}
                      <span className="badge badge-blue">{doc.divisionCode}</span>
                    </div>
                  </td>

                  {/* Penyetuju */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="badge badge-warning">{doc.approverCode}</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      {doc.approvedBy || doc.approverCode}
                    </div>
                  </td>

                  {/* Rev */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className="badge badge-primary mono">Rev {doc.revision}</span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '0.75rem 1rem' }}>{getStatusBadge(doc.status)}</td>

                  {/* Berkas & Drive */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {doc.isFolder ? (
                        <button
                          onClick={() => onViewDocument(doc)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0.2rem 0.45rem', color: '#38bdf8', fontSize: '0.72rem' }}
                          title="Lihat semua berkas dalam folder"
                        >
                          <Folder size={13} /> {doc.files?.length || 1} Berkas
                        </button>
                      ) : (doc.fileData || doc.fileUrl) ? (
                        <button
                          onClick={() => onViewDocument(doc)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0.2rem 0.45rem', color: 'var(--primary)', fontSize: '0.72rem' }}
                        >
                          <FileCheck size={13} /> PDF
                        </button>
                      ) : null}

                      {doc.googleDriveLink && (
                        <a
                          href={doc.googleDriveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0.2rem 0.45rem', color: '#38bdf8', fontSize: '0.72rem' }}
                        >
                          <HardDrive size={13} /> Drive
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Aksi */}
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                      <button
                        onClick={() => onViewDocument(doc)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.5rem' }}
                        title="Lihat Pratinjau Dokumen"
                      >
                        <Eye size={13} />
                      </button>
                      {onReviseDocument && (
                        <button
                          onClick={() => onReviseDocument(doc)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '0.3rem 0.5rem',
                            color: '#c084fc',
                            borderColor: 'rgba(168, 85, 247, 0.4)',
                          }}
                          title="Revisi Dokumen (Upload Berkas Baru)"
                        >
                          <History size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => onEditDocument(doc)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.3rem 0.5rem' }}
                        title="Edit Dokumen / Ubah Kode"
                      >
                        <Edit3 size={13} color="#f59e0b" />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Apakah Anda yakin ingin menghapus surat "${doc.title}" (${doc.code})?\n\nPerhatian: Folder dan berkas terkait di Google Drive juga otomatis akan dihapus.`
                            )
                          ) {
                            onDeleteDocument(doc.id);
                          }
                        }}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.3rem 0.5rem' }}
                        title="Hapus Surat & Drive"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
