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
  Download,
  Search,
  Copy,
  Check,
  Eye,
  Edit3,
  Trash2,
  FileCheck,
  HardDrive,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { DocumentRecord, DOCUMENT_TYPES, DIVISIONS, DocumentStatus } from '../types';
import { exportToCSV, exportToJSON } from '../services/storage';

interface DashboardViewProps {
  documents: DocumentRecord[];
  onNavigateToCreate: () => void;
  onViewDocument: (doc: DocumentRecord) => void;
  onEditDocument: (doc: DocumentRecord) => void;
  onDeleteDocument: (id: string) => void;
  filterApproverRole?: string; // e.g. CEO, CTO, COO, CFO
  roleTitle?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  documents,
  onNavigateToCreate,
  onViewDocument,
  onEditDocument,
  onDeleteDocument,
  filterApproverRole,
  roleTitle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // If filtered by specific director role (from sidebar)
  const baseDocs = filterApproverRole
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

  // Type Breakdown
  const typeCounts = DOCUMENT_TYPES.map((t) => ({
    ...t,
    count: baseDocs.filter((d) => d.typeCode === t.code).length,
  }));

  // Division Breakdown
  const divisionCounts = DIVISIONS.map((d) => ({
    ...d,
    count: baseDocs.filter((d) => d.divisionCode === d.code).length,
  }));

  // Filtered documents list
  const filteredDocs = baseDocs.filter((doc) => {
    const matchesSearch =
      doc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.approvedBy && doc.approvedBy.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = selectedType === 'ALL' || doc.typeCode === selectedType;
    const matchesDivision = selectedDivision === 'ALL' || doc.divisionCode === selectedDivision;

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
            {roleTitle ? `Dashboard Dokumen — ${roleTitle}` : 'Dashboard & Kontrol Dokumen'}
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
        </div>
      </div>

      {/* 1. TOP STATS CARDS (JUMLAH SURAT) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Total Dokumen */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Surat Terdaftar
            </span>
            <div style={{ background: 'var(--primary-glow)', padding: '0.45rem', borderRadius: '10px' }}>
              <FileText size={20} color="var(--primary)" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }} className="mono">
            {total}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Tersimpan aman & permanen
          </div>
        </div>

        {/* Diterbitkan (Published) */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Surat Diterbitkan
            </span>
            <div style={{ background: 'var(--success-bg)', padding: '0.45rem', borderRadius: '10px' }}>
              <CheckCircle2 size={20} color="var(--success)" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.5rem' }} className="mono">
            {publishedCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Resmi berlaku di NBE
          </div>
        </div>

        {/* Review & Draft */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Review & Draft
            </span>
            <div style={{ background: 'var(--warning-bg)', padding: '0.45rem', borderRadius: '10px' }}>
              <Clock size={20} color="var(--warning)" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.5rem' }} className="mono">
            {inReviewCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Menunggu verifikasi/approval
          </div>
        </div>

        {/* Approved */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Disetujui (Approved)
            </span>
            <div style={{ background: 'rgba(2, 132, 199, 0.15)', padding: '0.45rem', borderRadius: '10px' }}>
              <Shield size={20} color="#38bdf8" />
            </div>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.5rem' }} className="mono">
            {approvedCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Telah divalidasi direksi
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
        <div className="glass-card" style={{ padding: '1.5rem' }}>
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
        <div className="glass-card" style={{ padding: '1.5rem' }}>
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
              const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <div key={d.code}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="badge badge-blue mono">{d.code}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{d.label.split('(')[0]}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }} className="mono">
                      {d.count} surat ({pct}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '7px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. APA SAJA YANG SUDAH TERDAFTAR (DAFTAR SURAT) */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
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
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Daftar Surat & Dokumen yang Sudah Terdaftar ({filteredDocs.length})
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Telusuri berkas, buka pratinjau PDF, dan salin kode resmi dokumen.
            </p>
          </div>

          {/* Quick Search */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                placeholder="Cari kode atau judul surat..."
                className="form-input"
                style={{ paddingLeft: '2.3rem', width: '240px', fontSize: '0.85rem' }}
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-select"
              style={{ width: '130px', fontSize: '0.825rem' }}
            >
              <option value="ALL">Kategori</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code}
                </option>
              ))}
            </select>

            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="form-select"
              style={{ width: '120px', fontSize: '0.825rem' }}
            >
              <option value="ALL">Divisi</option>
              {DIVISIONS.map((d) => (
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
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.18)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
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
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{doc.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {doc.createdBy} • Terbit: {doc.issueDate}
                    </div>
                  </td>

                  {/* Kategori & Divisi */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <span className="badge badge-purple">{doc.typeCode}</span>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {(doc.fileData || doc.fileUrl) && (
                        <button
                          onClick={() => onViewDocument(doc)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0.2rem 0.45rem', color: 'var(--primary)', fontSize: '0.72rem' }}
                        >
                          <FileCheck size={13} /> PDF
                        </button>
                      )}
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
                          if (confirm(`Hapus surat "${doc.title}"?`)) {
                            onDeleteDocument(doc.id);
                          }
                        }}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.3rem 0.5rem' }}
                        title="Hapus Surat"
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
