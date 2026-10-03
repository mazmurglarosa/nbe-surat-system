import React, { useState } from 'react';
import {
  X,
  HardDrive,
  ExternalLink,
  Save,
  Download,
  FolderPlus,
  FileSpreadsheet,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { GoogleDriveSettings, exportToCSV } from '../services/storage';
import { DocumentRecord } from '../types';

interface GoogleDriveModalProps {
  settings: GoogleDriveSettings;
  onSaveSettings: (settings: GoogleDriveSettings) => void;
  onClose: () => void;
  documents: DocumentRecord[];
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  settings: initialSettings,
  onSaveSettings,
  onClose,
  documents,
}) => {
  const [folderUrl, setFolderUrl] = useState(initialSettings.folderUrl);
  const [driveDatabaseSheetUrl, setDriveDatabaseSheetUrl] = useState(
    initialSettings.driveDatabaseSheetUrl || ''
  );
  const [autoOpen, setAutoOpen] = useState(initialSettings.autoOpenDriveOnUpload);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      folderUrl: folderUrl.trim() || 'https://drive.google.com/drive/my-drive',
      driveDatabaseSheetUrl: driveDatabaseSheetUrl.trim() || undefined,
      autoOpenDriveOnUpload: autoOpen,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-fade-in"
        style={{ maxWidth: '680px' }}
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
            <HardDrive size={22} color="#38bdf8" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Integrasi & Database Google Drive NBE
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.35rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.75rem' }}>
          {/* Quick Explanation */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            <strong style={{ color: '#38bdf8' }}>Penyimpanan & Penelusuran Dokumen:</strong>
            <p style={{ marginTop: '0.35rem', lineHeight: 1.5 }}>
              Agar seluruh dokumen lama maupun baru dapat ditelusuri kembali kapan saja, Anda dapat
              menghubungkan folder Google Drive perusahaan dan mengekspor rekapitulasi database dokumen
              ke Google Sheets.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">
                Link Folder Utama Google Drive Perusahaan (NBE Documents)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="url"
                  required
                  value={folderUrl}
                  onChange={(e) => setFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="form-input"
                />
                <a
                  href={folderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  title="Buka Folder Google Drive"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Folder tempat menyimpan file PDF resmi (SOP, WIK, Manual, Policy).
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Link Database Google Sheets (Opsional)</label>
              <input
                type="url"
                value={driveDatabaseSheetUrl}
                onChange={(e) => setDriveDatabaseSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="form-input"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tautkan file Google Sheets rekapitulasi surat jika tim Anda menggunakan Google Workspace.
              </span>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <input
                type="checkbox"
                id="autoOpen"
                checked={autoOpen}
                onChange={(e) => setAutoOpen(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="autoOpen" style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                Otomatis tampilkan panduan link Google Drive setelah membuat dokumen
              </label>
            </div>

            {savedSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--success-bg)',
                  border: '1px solid var(--success)',
                  color: 'var(--success)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                <CheckCircle2 size={16} />
                <span>Pengaturan Google Drive berhasil disimpan!</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1.5rem' }}>
              <Save size={16} />
              <span>Simpan Pengaturan Google Drive</span>
            </button>
          </form>

          {/* Export to Google Drive / CSV Action */}
          <div
            style={{
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileSpreadsheet size={16} color="#10b981" />
              Ekspor Database Lengkap ke Google Drive / Sheets
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Unduh rekapitulasi data seluruh ({documents.length}) dokumen dalam format CSV yang dapat
              langsung diunggah ke Google Drive atau dibuka dengan Google Sheets.
            </p>
            <button
              onClick={() => exportToCSV(documents)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', gap: '0.5rem' }}
            >
              <Download size={14} />
              <span>Download Database CSV untuk Google Sheets</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
