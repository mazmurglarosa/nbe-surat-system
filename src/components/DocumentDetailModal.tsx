import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  HardDrive,
  ExternalLink,
  FileText,
  Calendar,
  User,
  ShieldCheck,
  History,
  Plus,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { DocumentRecord, RevisionRecord } from '../types';

interface DocumentDetailModalProps {
  document: DocumentRecord;
  onClose: () => void;
  onUpdateDocument: (doc: DocumentRecord) => Promise<void>;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document: doc,
  onClose,
  onUpdateDocument,
}) => {
  const [copied, setCopied] = useState(false);
  const [showAddRevision, setShowAddRevision] = useState(false);
  const [newRevisionDesc, setNewRevisionDesc] = useState('');
  const [revisedBy, setRevisedBy] = useState('');

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

  const fileSource = doc.fileData || doc.fileUrl;

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

          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.4rem' }}>
            <X size={20} />
          </button>
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
                <span className="badge badge-primary mono">Rev {doc.revision}</span>
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

          {/* Document File / Google Drive Links */}
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

          {/* Embedded PDF Viewer if file exists */}
          {fileSource && (
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
                Pratinjau Dokumen (PDF Viewer)
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
                  src={fileSource}
                  title="PDF Preview"
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
              <button
                onClick={() => setShowAddRevision(!showAddRevision)}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={14} />
                <span>Tambah Revisi</span>
              </button>
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
