import React, { useState } from 'react';
import {
  X,
  Save,
  AlertTriangle,
  Upload,
  FileCheck,
  HardDrive,
  ExternalLink,
  Unlock,
  CheckCircle2,
} from 'lucide-react';
import { DocumentRecord, DocumentStatus } from '../types';
import { isCodeDuplicate, validateDocumentCode } from '../utils/numbering';

interface EditDocumentModalProps {
  document: DocumentRecord;
  allDocuments: DocumentRecord[];
  onClose: () => void;
  onSave: (updatedDoc: DocumentRecord) => Promise<void>;
}

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  document: initialDoc,
  allDocuments,
  onClose,
  onSave,
}) => {
  const [code, setCode] = useState(initialDoc.code);
  const [title, setTitle] = useState(initialDoc.title);
  const [description, setDescription] = useState(initialDoc.description || '');
  const [createdBy, setCreatedBy] = useState(initialDoc.createdBy);
  const [approvedBy, setApprovedBy] = useState(initialDoc.approvedBy || '');
  const [verifiedBy, setVerifiedBy] = useState(initialDoc.verifiedBy || '');
  const [status, setStatus] = useState<DocumentStatus>(initialDoc.status);
  const [issueDate, setIssueDate] = useState(initialDoc.issueDate);
  const [revision, setRevision] = useState(initialDoc.revision);
  const [googleDriveLink, setGoogleDriveLink] = useState(
    initialDoc.googleDriveLink || ''
  );
  const [legacyNotes, setLegacyNotes] = useState(initialDoc.legacyNotes || '');

  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check uniqueness against OTHER documents
  const duplicate = isCodeDuplicate(code, allDocuments, initialDoc.id);
  const conflictingDoc = duplicate
    ? allDocuments.find(
        (d) => d.id !== initialDoc.id && d.code.toUpperCase() === code.trim().toUpperCase()
      )
    : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedCode) {
      setErrorMsg('Kode dokumen tidak boleh kosong.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Judul dokumen wajib diisi.');
      return;
    }

    // Uniqueness validation
    if (duplicate) {
      setErrorMsg(
        `Kode "${trimmedCode}" sudah dipakai oleh dokumen lain: "${conflictingDoc?.title}". 1 kode surat hanya boleh berlaku untuk 1 dokumen.`
      );
      return;
    }

    const validation = validateDocumentCode(trimmedCode);
    if (!validation.isValid) {
      setErrorMsg(validation.message || 'Format kode tidak valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedDoc: DocumentRecord = {
        ...initialDoc,
        code: trimmedCode,
        title: title.trim(),
        description: description.trim() || undefined,
        createdBy: createdBy.trim(),
        approvedBy: approvedBy.trim() || undefined,
        verifiedBy: verifiedBy.trim() || undefined,
        status: status,
        issueDate: issueDate,
        revision: revision,
        googleDriveLink: googleDriveLink.trim() || undefined,
        legacyNotes: legacyNotes.trim() || undefined,
        isManualCode: true, // marked as custom/edited
        updatedAt: new Date().toISOString(),
      };

      if (uploadedFile) {
        updatedDoc.fileName = uploadedFile.name;
        updatedDoc.fileSize = uploadedFile.size;
        updatedDoc.fileType = uploadedFile.type;
        updatedDoc.fileData = uploadedFile.dataUrl;
      }

      await onSave(updatedDoc);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-fade-in"
        style={{ maxWidth: '780px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Unlock size={20} color="var(--warning)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Edit Data Dokumen & Akses Ubah Kode
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.35rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} style={{ padding: '1.75rem' }}>
          {/* Notice about code editing */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}
          >
            <strong style={{ color: 'var(--warning)' }}>Akses Ubah Kode Dokumen:</strong> Anda
            memiliki izin untuk mengubah nomor urut atau kode dokumen ini secara manual, misalnya
            untuk memasukkan nomor dokumen arsip lama (pra-sistem) yang belum sempat terdata.
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Kode Dokumen (Editable) */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label" style={{ color: 'var(--warning)' }}>
                Kode Dokumen (Dapat Diubah) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="form-input mono"
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  borderColor: duplicate ? 'var(--danger)' : undefined,
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Format standar: 0000-XXX-YYY-OOO-IX-YYYY
              </span>
            </div>

            {/* Judul Dokumen */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                Judul Dokumen <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Dibuat Oleh */}
            <div className="form-group">
              <label className="form-label">Dibuat Oleh</label>
              <input
                type="text"
                required
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Tanggal Terbit */}
            <div className="form-group">
              <label className="form-label">Tanggal Penerbitan</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Disetujui Oleh */}
            <div className="form-group">
              <label className="form-label">Disetujui Oleh</label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Status */}
            <div className="form-group">
              <label className="form-label">Status Dokumen</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                className="form-select"
              >
                <option value="Published">Published</option>
                <option value="Approved">Approved</option>
                <option value="In Review">In Review</option>
                <option value="Draft">Draft</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            {/* Nomor Revisi */}
            <div className="form-group">
              <label className="form-label">Nomor Revisi</label>
              <input
                type="number"
                min="0"
                value={revision}
                onChange={(e) => setRevision(parseInt(e.target.value, 10) || 0)}
                className="form-input mono"
              />
            </div>

            {/* Link Google Drive */}
            <div className="form-group">
              <label className="form-label">Link Google Drive</label>
              <input
                type="url"
                value={googleDriveLink}
                onChange={(e) => setGoogleDriveLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="form-input"
              />
            </div>

            {/* Deskripsi */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Deskripsi Dokumen</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
              />
            </div>

            {/* Upload File Baru */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Perbarui File Lampiran (Opsional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
                onChange={handleFileChange}
                className="form-input"
              />
              {uploadedFile && (
                <span style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '0.35rem', display: 'block' }}>
                  File baru dipilih: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
          </div>

          {/* Duplicate Error Warning */}
          {duplicate && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                color: '#fca5a5',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertTriangle size={18} color="var(--danger)" />
              <span>
                Kode "{code}" sudah digunakan oleh dokumen "{conflictingDoc?.title}". 1 kode surat hanya boleh untuk 1 dokumen saja.
              </span>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                color: '#fca5a5',
                fontSize: '0.85rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Action buttons */}
          <div
            style={{
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || duplicate}
              className="btn btn-primary"
              style={{ minWidth: '160px' }}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
