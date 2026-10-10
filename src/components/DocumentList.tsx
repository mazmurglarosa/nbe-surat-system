import React, { useState } from 'react';
import {
  Search,
  Copy,
  Check,
  Eye,
  Edit3,
  Trash2,
  Download,
  HardDrive,
  FileText,
  Layers,
  FileCheck,
  Sparkles,
  FileSpreadsheet,
  History,
} from 'lucide-react';
import { DocumentRecord, DOCUMENT_TYPES, DIVISIONS, DocumentStatus } from '../types';
import { exportToCSV, exportToJSON } from '../services/storage';

interface DocumentListProps {
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
  onEditDocument: (doc: DocumentRecord) => void;
  onReviseDocument?: (doc: DocumentRecord) => void;
  onDeleteDocument: (id: string) => void;
  onNavigateToGenerator: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onViewDocument,
  onEditDocument,
  onReviseDocument,
  onDeleteDocument,
  onNavigateToGenerator,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract distinct years from documents
  const availableYears = Array.from(
    new Set(documents.map((d) => d.year).filter(Boolean))
  ).sort((a, b) => b - a);

  // Copy code handler
  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.approvedBy && doc.approvedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = selectedType === 'ALL' || doc.typeCode === selectedType;
    const matchesDivision =
      selectedDivision === 'ALL' || doc.divisionCode === selectedDivision;
    const matchesStatus =
      selectedStatus === 'ALL' || doc.status === selectedStatus;
    const matchesYear =
      selectedYear === 'ALL' || String(doc.year) === selectedYear;

    return (
      matchesSearch &&
      matchesType &&
      matchesDivision &&
      matchesStatus &&
      matchesYear
    );
  });

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
      {/* Header and Quick Stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          margin: '1.75rem 0 1.25rem 0',
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
            <Layers color="var(--primary)" size={26} />
            Database & Arsip Dokumen Terkontrol
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
            Seluruh dokumen dan penomoran resmi PT Nirwana Bhumi Energi tersimpan permanen tanpa
            kehilangan data.
          </p>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => exportToCSV(documents)}
            className="btn btn-secondary btn-sm"
            title="Ekspor ke spreadsheet CSV (kompatibel Google Sheets & Excel)"
          >
            <FileSpreadsheet size={15} color="#10b981" />
            <span>Ekspor CSV / Sheets</span>
          </button>
          <button
            onClick={() => exportToJSON(documents)}
            className="btn btn-secondary btn-sm"
            title="Download file cadangan JSON"
          >
            <Download size={15} />
            <span>Backup JSON</span>
          </button>
          <button onClick={onNavigateToGenerator} className="btn btn-primary btn-sm">
            <Sparkles size={15} />
            <span>+ Buat Nomor Dokumen</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div
        className="glass-card"
        style={{ padding: '1.25rem', marginBottom: '1.5rem' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search
              size={18}
              color="var(--text-muted)"
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kode (0001-SOP...), judul, divisi, atau pengesah..."
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Filter Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-select"
            >
              <option value="ALL">Semua Kategori (Type)</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code} - {t.label.split('(')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Division */}
          <div>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="form-select"
            >
              <option value="ALL">Semua Divisi</option>
              {DIVISIONS.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.label.split('(')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-select"
            >
              <option value="ALL">Semua Status</option>
              <option value="Published">Published</option>
              <option value="Approved">Approved</option>
              <option value="In Review">In Review</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          {/* Filter Year */}
          {availableYears.length > 0 && (
            <div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="form-select"
              >
                <option value="ALL">Semua Tahun</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Active Filter stats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            Menampilkan <strong>{filteredDocuments.length}</strong> dari total{' '}
            <strong>{documents.length}</strong> dokumen terdaftar
          </div>

          {/* Toggle view mode */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              onClick={() => setViewMode('table')}
              className={`btn btn-sm ${
                viewMode === 'table' ? 'btn-primary' : 'btn-ghost'
              }`}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
            >
              Tabel
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`btn btn-sm ${
                viewMode === 'card' ? 'btn-primary' : 'btn-ghost'
              }`}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
            >
              Kartu
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredDocuments.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <FileText size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Tidak ada dokumen yang sesuai filter
          </h3>
          <p style={{ marginTop: '0.4rem', fontSize: '0.9rem' }}>
            Coba ubah kata kunci pencarian atau reset filter kategori di atas.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedType('ALL');
              setSelectedDivision('ALL');
              setSelectedStatus('ALL');
              setSelectedYear('ALL');
            }}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: '1rem' }}
          >
            Reset Semua Filter
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'rgba(0,0,0,0.15)',
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '0.85rem 1rem' }}>Kode Dokumen</th>
                <th style={{ padding: '0.85rem 1rem' }}>Judul Dokumen</th>
                <th style={{ padding: '0.85rem 1rem' }}>Tipe / Divisi</th>
                <th style={{ padding: '0.85rem 1rem' }}>Pengesah (Approver)</th>
                <th style={{ padding: '0.85rem 1rem' }}>Rev</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem' }}>File & Drive</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'transparent')
                  }
                >
                  {/* Kode Dokumen with Copy */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        className="mono"
                        style={{
                          fontWeight: 700,
                          color: 'var(--primary)',
                          background: 'rgba(0,0,0,0.25)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.825rem',
                        }}
                      >
                        {doc.code}
                      </span>
                      <button
                        onClick={() => handleCopy(doc.code, doc.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.2rem' }}
                        title="Salin Kode Dokumen"
                      >
                        {copiedId === doc.id ? (
                          <Check size={14} color="var(--success)" />
                        ) : (
                          <Copy size={14} color="var(--text-muted)" />
                        )}
                      </button>
                    </div>
                    {doc.isManualCode && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--warning)',
                          display: 'block',
                          marginTop: '0.2rem',
                        }}
                      >
                        • Arsip Manual / Pra-Sistem
                      </span>
                    )}
                  </td>

                  {/* Judul Dokumen */}
                  <td style={{ padding: '0.85rem 1rem', maxWidth: '300px' }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                      }}
                    >
                      {doc.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.2rem',
                      }}
                    >
                      Dibuat oleh: {doc.createdBy} • Terbit: {doc.issueDate}
                    </div>
                  </td>

                  {/* Tipe / Divisi */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <span className="badge badge-purple">{doc.typeCode}</span>
                      <span className="badge badge-blue">{doc.divisionCode}</span>
                    </div>
                  </td>

                  {/* Pengesah */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className="badge badge-warning">{doc.approverCode}</span>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.2rem',
                      }}
                    >
                      {doc.approvedBy || doc.approverCode}
                    </div>
                  </td>

                  {/* Revisi */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className="badge badge-primary mono">Rev {doc.revision}</span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {getStatusBadge(doc.status)}
                  </td>

                  {/* File & Drive */}
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {/* Attached File */}
                      {(doc.fileData || doc.fileUrl) && (
                        <button
                          onClick={() => onViewDocument(doc)}
                          className="btn btn-ghost btn-sm"
                          style={{
                            padding: '0.25rem 0.45rem',
                            color: 'var(--primary)',
                            fontSize: '0.72rem',
                          }}
                          title={`Lihat file: ${doc.fileName || 'PDF Dokumen'}`}
                        >
                          <FileCheck size={14} />
                          <span>PDF</span>
                        </button>
                      )}

                      {/* Google Drive Link */}
                      {doc.googleDriveLink && (
                        <a
                          href={doc.googleDriveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{
                            padding: '0.25rem 0.45rem',
                            color: '#38bdf8',
                            fontSize: '0.72rem',
                          }}
                          title="Buka dokumen di Google Drive"
                        >
                          <HardDrive size={14} />
                          <span>Drive</span>
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <button
                        onClick={() => onViewDocument(doc)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.35rem 0.55rem' }}
                        title="Lihat Detail & Riwayat Dokumen"
                      >
                        <Eye size={14} />
                      </button>

                      {onReviseDocument && (
                        <button
                          onClick={() => onReviseDocument(doc)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            padding: '0.35rem 0.55rem',
                            color: '#c084fc',
                            borderColor: 'rgba(168, 85, 247, 0.4)',
                          }}
                          title="Revisi Dokumen (Upload Berkas Revisi Baru)"
                        >
                          <History size={14} />
                        </button>
                      )}

                      <button
                        onClick={() => onEditDocument(doc)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.35rem 0.55rem' }}
                        title="Edit Dokumen / Ubah Kode"
                      >
                        <Edit3 size={14} color="#f59e0b" />
                      </button>

                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Apakah Anda yakin ingin menghapus dokumen "${doc.title}" (${doc.code})?\n\nPerhatian: Folder dan berkas terkait di Google Drive juga otomatis akan dihapus.`
                            )
                          ) {
                            onDeleteDocument(doc.id);
                          }
                        }}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.35rem 0.55rem' }}
                        title="Hapus Dokumen & Hapus Folder Drive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="glass-card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Card Top: Code + Copy */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontWeight: 700,
                      color: 'var(--primary)',
                      background: 'rgba(0,0,0,0.25)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                    }}
                  >
                    {doc.code}
                  </span>
                  <button
                    onClick={() => handleCopy(doc.code, doc.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '0.25rem' }}
                  >
                    {copiedId === doc.id ? (
                      <Check size={14} color="var(--success)" />
                    ) : (
                      <Copy size={14} color="var(--text-muted)" />
                    )}
                  </button>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    lineHeight: 1.4,
                    marginBottom: '0.5rem',
                  }}
                >
                  {doc.title}
                </h3>

                {/* Description snippet */}
                {doc.description && (
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.75rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {doc.description}
                  </p>
                )}

                {/* Badges */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.35rem',
                    marginBottom: '1rem',
                  }}
                >
                  <span className="badge badge-purple">{doc.typeCode}</span>
                  <span className="badge badge-blue">{doc.divisionCode}</span>
                  <span className="badge badge-warning">{doc.approverCode}</span>
                  <span className="badge badge-primary mono">Rev {doc.revision}</span>
                  {getStatusBadge(doc.status)}
                </div>
              </div>

              {/* Card Footer: Metadata and Actions */}
              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '0.75rem',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <div>
                  <span>Dibuat: {doc.createdBy}</span>
                  <br />
                  <span>{doc.issueDate}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    onClick={() => onViewDocument(doc)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.3rem 0.5rem' }}
                    title="Lihat Detail"
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                      title="Revisi Dokumen (Upload Berkas Baru)"
                    >
                      <History size={13} />
                      <span style={{ fontSize: '0.72rem' }}>Revisi</span>
                    </button>
                  )}
                  <button
                    onClick={() => onEditDocument(doc)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.3rem 0.5rem' }}
                    title="Edit Dokumen"
                  >
                    <Edit3 size={13} color="#f59e0b" />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Apakah Anda yakin ingin menghapus dokumen "${doc.title}" (${doc.code})?\n\nPerhatian: Folder dan berkas terkait di Google Drive juga otomatis akan dihapus.`
                        )
                      ) {
                        onDeleteDocument(doc.id);
                      }
                    }}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '0.3rem 0.5rem' }}
                    title="Hapus Dokumen & Drive"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
