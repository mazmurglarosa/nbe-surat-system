import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  HardDrive,
  FileText,
  History,
  Plus,
  Eye,
  Folder,
  File,
  ExternalLink,
} from 'lucide-react';
import { DocumentRecord, RevisionRecord } from '../types';

interface DocumentDetailModalProps {
  document: DocumentRecord;
  onClose: () => void;
  onUpdateDocument: (doc: DocumentRecord) => Promise<void>;
  onReviseDocument?: (doc: DocumentRecord) => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document: doc,
  onClose,
  onUpdateDocument,
  onReviseDocument,
}) => {
  const [copied, setCopied] = useState(false);
  const [showAddRevision, setShowAddRevision] = useState(false);
  const [newRevisionDesc, setNewRevisionDesc] = useState('');
  const [revisedBy, setRevisedBy] = useState('');
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(doc.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRevisionDesc.trim() || !revisedBy.trim()) return;

    const nextRevNum = (doc.revision || 0) + 1;
    const newRevItem: RevisionRecord = {
      revision: nextRevNum,
      date: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      description: newRevisionDesc.trim(),
      revisedBy: revisedBy.trim(),
    };

    const updatedDoc: DocumentRecord = {
      ...doc,
      revision: nextRevNum,
      revisions: [...(doc.revisions || []), newRevItem],
      updatedAt: new Date().toISOString(),
    };

    await onUpdateDocument(updatedDoc);
    setNewRevisionDesc('');
    setRevisedBy('');
    setShowAddRevision(false);
  };

  const selectedFileItem = doc.files && doc.files.length > 0 ? doc.files[activeFileIndex] : null;
  const fileSource = doc.fileData || doc.fileUrl;
  const currentPreviewSource = selectedFileItem?.dataUrl || selectedFileItem?.fileUrl || fileSource;
  const currentPreviewName = selectedFileItem?.name || doc.fileName;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-fade-in"
        style={{ maxWidth: '900px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-tertiary)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span
                className="mono"
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                }}
              >
                {doc.code}
              </span>
              <button
                onClick={handleCopyCode}
                className="btn btn-ghost btn-sm"
                title="Salin Kode Dokumen"
              >
                {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
              </button>
            </div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                marginTop: '0.4rem',
              }}
            >
              {doc.title}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {onReviseDocument && (
              <button
                onClick={() => onReviseDocument(doc)}
                className="btn btn-sm"
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  borderColor: 'rgba(168, 85, 247, 0.4)',
                  color: '#c084fc',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
                title="Unggah berkas revisi baru untuk dokumen ini"
              >
                <History size={15} />
                <span>Revisi Dokumen</span>
              </button>
            )}
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.4rem' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.75rem' }}>
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              padding: '1.25rem',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Kategori Dokumen
              </span>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {doc.typeCode}
              </div>
            </div>

            {doc.subCategoryCode && (
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Sub-Kategori (ZZ)
                </span>
                <div style={{ fontWeight: 600, color: '#22d3ee', marginTop: '0.2rem' }}>
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(6, 182, 212, 0.15)',
                      color: '#22d3ee',
                      border: '1px solid rgba(6, 182, 212, 0.35)',
                    }}
                  >
                    {doc.subCategoryCode}
                  </span>
                </div>
              </div>
            )}

            {doc.subSubCategoryCode && (
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Sub-sub Kategori (AA)
                </span>
                <div style={{ fontWeight: 600, color: '#c084fc', marginTop: '0.2rem' }}>
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: '#c084fc',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                    }}
                  >
                    {doc.subSubCategoryCode}
                  </span>
                </div>
              </div>
            )}

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Divisi Penerbit
              </span>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {doc.divisionCode}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Otoritas Pengesahan
              </span>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {doc.approverCode} ({doc.approvedBy || 'Direktur'})
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Revisi / Status
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem' }}>
                <span className="badge badge-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>Rev {doc.revision}</span>
                <span className="badge badge-success">{doc.status}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Dibuat Oleh
              </span>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {doc.createdBy}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Tanggal Penerbitan
              </span>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {doc.issueDate} ({doc.monthRoman}-{doc.year})
              </div>
            </div>
          </div>

          {/* Description */}
          {doc.description && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Deskripsi / Lingkup Dokumen
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {doc.description}
              </p>
            </div>
          )}

          {/* FOLDER & MULTI-FILES LIST (if doc.files exists) */}
          {doc.files && doc.files.length > 0 && (
            <div
              style={{
                marginBottom: '1.75rem',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid rgba(2, 132, 199, 0.35)',
                background: 'rgba(2, 132, 199, 0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Folder size={18} color="#38bdf8" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Berkas dalam Folder ({doc.files.length} berkas)
                  </h4>
                </div>

                {doc.googleDriveLink && (
                  <a
                    href={doc.googleDriveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#38bdf8', fontSize: '0.78rem' }}
                  >
                    <HardDrive size={13} />
                    <span>Buka Folder di Google Drive</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>

              {/* Table of files inside this document folder */}
              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-secondary)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>#</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Nama Berkas</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Ukuran</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doc.files.map((file, idx) => {
                      const isActive = activeFileIndex === idx;
                      return (
                        <tr
                          key={file.id || idx}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: isActive ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', width: '30px' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <File size={14} color="#38bdf8" />
                              <div>
                                <span style={{ fontWeight: isActive ? 700 : 500, color: 'var(--text-main)' }}>
                                  {file.name}
                                </span>
                                {file.relativePath && file.relativePath !== file.name && (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {file.relativePath}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>
                            {file.size > 0 ? (file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${Math.round(file.size / 1024)} KB`) : '-'}
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                              {(file.dataUrl || file.fileUrl) && (
                                <button
                                  type="button"
                                  onClick={() => setActiveFileIndex(idx)}
                                  className="btn btn-ghost btn-sm"
                                  style={{
                                    padding: '0.2rem 0.45rem',
                                    fontSize: '0.72rem',
                                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                    fontWeight: isActive ? 700 : 400,
                                  }}
                                  title="Pilih untuk pratinjau di bawah"
                                >
                                  <Eye size={13} /> {isActive ? 'Aktif' : 'Pratinjau'}
                                </button>
                              )}
                              {(file.dataUrl || file.fileUrl) && (
                                <a
                                  href={file.dataUrl || file.fileUrl}
                                  download={file.name}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '0.2rem 0.35rem', color: 'var(--primary)' }}
                                  title="Download Berkas Ini"
                                >
                                  <Download size={13} />
                                </a>
                              )}
                              {file.googleDriveLink && (
                                <a
                                  href={file.googleDriveLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '0.2rem 0.35rem', color: '#38bdf8' }}
                                  title="Buka Berkas di Google Drive"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Document File / Google Drive Links (Single File or Overall Summary) */}
          {(!doc.files || doc.files.length === 0) && (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-accent)',
                background: 'rgba(0, 212, 178, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.75rem',
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={16} color="var(--primary)" />
                  File Terlampir:{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {doc.fileName || 'Belum ada file langsung'}
                  </span>
                </h4>
                {doc.googleDriveLink && (
                  <p style={{ fontSize: '0.8rem', color: '#38bdf8', marginTop: '0.25rem' }}>
                    Link Google Drive aktif dan terhubung.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {doc.googleDriveLink && (
                  <a
                    href={doc.googleDriveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#38bdf8' }}
                  >
                    <HardDrive size={14} />
                    <span>Buka di Google Drive</span>
                  </a>
                )}

                {fileSource && (
                  <a
                    href={fileSource}
                    download={doc.fileName || `${doc.code}.pdf`}
                    className="btn btn-primary btn-sm"
                  >
                    <Download size={14} />
                    <span>Download File</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Embedded Viewer (Current Selected File or Main Document) */}
          {currentPreviewSource && (
            <div style={{ marginBottom: '2rem' }}>
              <h4
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Eye size={16} color="var(--primary)" />
                Pratinjau Berkas {currentPreviewName ? `: ${currentPreviewName}` : '(PDF Viewer)'}
              </h4>
              <div
                style={{
                  width: '100%',
                  height: '420px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid var(--border-subtle)',
                  background: '#1a1a1a',
                }}
              >
                <iframe
                  src={currentPreviewSource}
                  title="Document Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            </div>
          )}

          {/* REVISION INDEX TABLE (Standard NBE IMS Procedure Page 2) */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.85rem',
              }}
            >
              <h4
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <History size={16} color="var(--primary)" />
                REVISION INDEX (Riwayat Perubahan Sesuai Prosedur NBE)
              </h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {onReviseDocument && (
                  <button
                    onClick={() => onReviseDocument(doc)}
                    className="btn btn-sm"
                    style={{
                      background: 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)',
                      borderColor: '#a855f7',
                      color: '#fff',
                    }}
                    title="Unggah berkas revisi baru (-rev1, -rev2)"
                  >
                    <History size={14} />
                    <span>Unggah Berkas Revisi</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAddRevision(!showAddRevision)}
                  className="btn btn-secondary btn-sm"
                >
                  <Plus size={14} />
                  <span>Catatan Revisi</span>
                </button>
              </div>
            </div>

            {/* Add revision inline form */}
            {showAddRevision && (
              <form
                onSubmit={handleAddRevision}
                className="glass-card"
                style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  border: '1px solid var(--border-accent)',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Deskripsi Perubahan</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Pembaruan bagan alur proses & lampiran"
                      value={newRevisionDesc}
                      onChange={(e) => setNewRevisionDesc(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Direvisi Oleh</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama perevisi"
                      value={revisedBy}
                      onChange={(e) => setRevisedBy(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ height: '42px' }}>
                    Simpan Revisi {(doc.revision || 0) + 1}
                  </button>
                </div>
              </form>
            )}

            {/* Revision Table */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.65rem 1rem', width: '90px' }}>Revision</th>
                    <th style={{ padding: '0.65rem 1rem', width: '130px' }}>Date</th>
                    <th style={{ padding: '0.65rem 1rem' }}>Description of Changes</th>
                    <th style={{ padding: '0.65rem 1rem', width: '160px' }}>Revised By</th>
                  </tr>
                </thead>
                <tbody>
                  {(doc.revisions && doc.revisions.length > 0) ? (
                    doc.revisions.map((rev, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 700 }} className="mono">
                          {rev.revision}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>
                          {rev.date}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: 'var(--text-main)' }}>
                          {rev.description}
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>
                          {rev.revisedBy}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{ padding: '0.65rem 1rem', fontWeight: 700 }} className="mono">
                        {doc.revision}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>
                        {doc.issueDate}
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: 'var(--text-main)' }}>
                        Initial Issue
                      </td>
                      <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>
                        {doc.createdBy}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
