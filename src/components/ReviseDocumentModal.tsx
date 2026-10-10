import React, { useState } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  ExternalLink,
  Loader2,
  FileCheck,
  History,
} from 'lucide-react';
import { DocumentRecord, DocumentStatus } from '../types';
import { GoogleDriveSettings } from '../services/storage';
import {
  uploadFileToDriveViaBot,
  TARGET_FOLDER_ID,
} from '../services/googleDriveBot';

interface ReviseDocumentModalProps {
  document: DocumentRecord;
  driveSettings: GoogleDriveSettings;
  onClose: () => void;
  onSaveRevision: (updatedDoc: DocumentRecord) => Promise<void>;
  onOpenDriveSettings?: () => void;
}

export const ReviseDocumentModal: React.FC<ReviseDocumentModalProps> = ({
  document: doc,
  driveSettings,
  onClose,
  onSaveRevision,
  onOpenDriveSettings,
}) => {
  const nextRevision = (doc.revision || 0) + 1;

  const [revisedFile, setRevisedFile] = useState<{
    file: File;
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null>(null);

  const [revisionDate, setRevisionDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [revisedBy, setRevisedBy] = useState<string>(
    doc.createdBy || 'Mazmur Gusti Agung Larosa'
  );
  const [revisionNotes, setRevisionNotes] = useState<string>('');
  const [status, setStatus] = useState<DocumentStatus>(doc.status || 'Published');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittingStatus, setSubmittingStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Suggested revision filename
  const getRevisionFileName = (rawName?: string) => {
    let ext = '.pdf';
    if (rawName && rawName.lastIndexOf('.') !== -1) {
      ext = rawName.substring(rawName.lastIndexOf('.'));
    }
    return `${doc.code}-rev${nextRevision}${ext}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setErrorMsg(null);
      const reader = new FileReader();
      reader.onload = () => {
        setRevisedFile({
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'application/pdf',
          dataUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!revisedFile) {
      setErrorMsg('Silakan pilih berkas dokumen baru yang telah direvisi.');
      return;
    }

    if (!revisionNotes.trim()) {
      setErrorMsg('Catatan / alasan revisi wajib diisi untuk riwayat audit.');
      return;
    }

    if (!revisedBy.trim()) {
      setErrorMsg('Nama staf yang merevisi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setSubmittingStatus('Menyiapkan berkas revisi...');

    try {
      const targetFolderId =
        doc.driveFolderId || driveSettings.folderId || TARGET_FOLDER_ID;
      const targetFileName = getRevisionFileName(revisedFile.name);
      let updatedDriveLink = doc.googleDriveLink;

      // Upload ke Google Drive via Bot
      if (driveSettings.botWebhookUrl) {
        setSubmittingStatus('🤖 Mengunggah berkas revisi ke Google Drive...');
        const botResult = await uploadFileToDriveViaBot(
          revisedFile.dataUrl,
          targetFileName,
          revisedFile.type,
          driveSettings.botWebhookUrl,
          {
            folderId: targetFolderId,
            documentCode: doc.code,
            uploadedBy: revisedBy.trim(),
            isRevision: true,
            revision: nextRevision,
          }
        );

        if (botResult.success && botResult.viewUrl) {
          updatedDriveLink = botResult.viewUrl;
        } else {
          console.warn('Bot Drive warning:', botResult.error);
        }
      }

      setSubmittingStatus('Memperbarui catatan di sistem...');

      // Buat entri riwayat revisi
      const newRevRecord = {
        revision: nextRevision,
        date: new Date(revisionDate).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        description: revisionNotes.trim(),
        revisedBy: revisedBy.trim(),
      };

      const updatedDoc: DocumentRecord = {
        ...doc,
        revision: nextRevision,
        status: status,
        fileName: targetFileName,
        fileSize: revisedFile.size,
        fileType: revisedFile.type,
        fileData: revisedFile.dataUrl,
        googleDriveLink: updatedDriveLink,
        revisions: [...(doc.revisions || []), newRevRecord],
        updatedAt: new Date().toISOString(),
      };

      await onSaveRevision(updatedDoc);
      setSuccessMsg(
        `Dokumen ${doc.code} berhasil diperbarui ke Rev ${nextRevision}!`
      );

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan dokumen revisi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-fade-in"
        style={{ maxWidth: '640px' }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(168, 85, 247, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc',
              }}
            >
              <History size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Unggah Dokumen Revisi
              </h2>
              <span
                className="mono"
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--primary)',
                  fontWeight: 600,
                }}
              >
                {doc.code}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.35rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem 1.75rem' }}>
          {errorMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid var(--danger)',
                color: '#fca5a5',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <AlertCircle size={18} color="var(--danger)" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid var(--success)',
                color: '#6ee7b7',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <CheckCircle2 size={18} color="var(--success)" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Info Banner: Current vs Next Revision */}
          <div
            style={{
              padding: '1rem 1.15rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              marginBottom: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'block',
                  }}
                >
                  Judul Dokumen
                </span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  {doc.title}
                </strong>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span className="badge badge-secondary mono">
                  Rev {doc.revision}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  ➔
                </span>
                <span
                  className="badge badge-purple mono"
                  style={{ fontWeight: 700 }}
                >
                  Rev {nextRevision}
                </span>
              </div>
            </div>

            {/* Auto Google Drive Destination */}
            <div
              style={{
                paddingTop: '0.5rem',
                borderTop: '1px dashed rgba(168, 85, 247, 0.2)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HardDrive size={14} color="#38bdf8" />
                <span>
                  Nama file otomatis di Drive:{' '}
                  <code
                    className="mono"
                    style={{
                      color: 'var(--primary)',
                      fontWeight: 700,
                      background: 'rgba(0,0,0,0.25)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                    }}
                  >
                    {getRevisionFileName(revisedFile?.name)}
                  </code>
                </span>
              </div>

              {doc.driveFolderUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ExternalLink size={13} color="var(--text-muted)" />
                  <span>
                    Tersimpan di folder yang sama:{' '}
                    <a
                      href={doc.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#38bdf8',
                        textDecoration: 'underline',
                        fontWeight: 600,
                      }}
                    >
                      Buka Folder Drive ({doc.code})
                    </a>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Upload Area */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '0.4rem',
              }}
            >
              Pilih File Dokumen Revisi (PDF / DOCX) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>

            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem 1rem',
                border: revisedFile
                  ? '2px solid var(--success)'
                  : '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                background: revisedFile
                  ? 'rgba(16, 185, 129, 0.05)'
                  : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.pptx,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {revisedFile ? (
                <div style={{ textAlign: 'center' }}>
                  <FileCheck size={36} color="var(--success)" />
                  <p
                    style={{
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    {revisedFile.name}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {(revisedFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti
                    berkas
                  </span>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <Upload size={32} color="var(--text-muted)" />
                  <p
                    style={{
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      fontSize: '0.875rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    Klik atau seret berkas revisi baru ke sini
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Mendukung format PDF, Word (.docx), Excel (.xlsx)
                  </span>
                </div>
              )}
            </label>
          </div>

          {/* Form Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginBottom: '0.35rem',
                }}
              >
                Tanggal Terbit Revisi
              </label>
              <input
                type="date"
                value={revisionDate}
                onChange={(e) => setRevisionDate(e.target.value)}
                className="input"
                style={{ width: '100%' }}
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginBottom: '0.35rem',
                }}
              >
                Direvisi Oleh
              </label>
              <input
                type="text"
                value={revisedBy}
                onChange={(e) => setRevisedBy(e.target.value)}
                placeholder="Nama staf perevisi"
                className="input"
                style={{ width: '100%' }}
                required
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginBottom: '0.35rem',
                }}
              >
                Status Dokumen Pasca-Revisi
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                className="input"
                style={{ width: '100%' }}
              >
                <option value="Published">Published (Berlaku Resmi)</option>
                <option value="Approved">Approved (Telah Disetujui)</option>
                <option value="In Review">In Review (Sedang Ditinjau)</option>
                <option value="Draft">Draft (Konsep)</option>
              </select>
            </div>
          </div>

          {/* Catatan Revisi */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Catatan / Alasan Perubahan Revisi <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Contoh: Pembaruan klausul 4.2 terkait alur persetujuan PO dan penambahan lampiran form checklist..."
              className="input"
              style={{ width: '100%', resize: 'vertical' }}
              required
            />
          </div>

          {/* Drive Bot Status Pill */}
          {!driveSettings.botWebhookUrl && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                fontSize: '0.78rem',
                color: '#fcd34d',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>
                Bot Google Apps Script belum aktif. Berkas akan disimpan secara
                lokal.
              </span>
              {onOpenDriveSettings && (
                <button
                  type="button"
                  onClick={onOpenDriveSettings}
                  className="btn btn-ghost btn-sm"
                  style={{
                    color: '#f59e0b',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.75rem',
                  }}
                >
                  Atur Bot
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.25rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !revisedFile}
              className="btn btn-primary"
              style={{
                background:
                  'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                borderColor: '#9333ea',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{submittingStatus || 'Mengunggah Revisi...'}</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Unggah & Simpan Revisi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
