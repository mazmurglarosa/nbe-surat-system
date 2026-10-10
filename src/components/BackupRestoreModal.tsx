import React, { useRef, useState } from 'react';
import {
  X,
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { DocumentRecord } from '../types';
import { exportToCSV, exportToJSON } from '../services/storage';

interface BackupRestoreModalProps {
  documents: DocumentRecord[];
  onRestoreDocuments: (docs: DocumentRecord[]) => Promise<void>;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  documents,
  onRestoreDocuments,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) {
          throw new Error('Format file cadangan tidak valid (harus array JSON).');
        }

        await onRestoreDocuments(parsed);
        setImportStatus(`Berhasil memulihkan ${parsed.length} dokumen dari cadangan!`);
        setErrorStatus(null);
      } catch (err: any) {
        setErrorStatus(err.message || 'Gagal membaca file JSON.');
        setImportStatus(null);
      }
    };
    reader.readAsText(file);
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
            <Database size={22} color="var(--primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Pusat Pencadangan Data & Jaminan Nol Kehilangan
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.35rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.75rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Sistem dirancang dengan persistensi ganda (IndexedDB + LocalStorage) agar data dokumen
            tidak akan hilang saat browser ditutup atau diperbarui. Anda juga dapat mencadangkan seluruh
            database dalam format JSON atau CSV kapan saja.
          </p>

          {/* Backup Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
            {/* Download JSON Backup */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Download size={16} color="var(--primary)" />
                  Cadangkan Database Penuh (JSON)
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Berisi seluruh {documents.length} dokumen, riwayat revisi, dan metadata lengkap.
                </p>
              </div>
              <button
                onClick={() => exportToJSON(documents)}
                className="btn btn-primary btn-sm"
              >
                Unduh JSON
              </button>
            </div>

            {/* Download CSV / Google Sheets */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileSpreadsheet size={16} color="#10b981" />
                  Ekspor Spreadsheet (CSV / Google Sheets)
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Dapat dibuka di Excel atau diunggah langsung ke Google Drive.
                </p>
              </div>
              <button
                onClick={() => exportToCSV(documents)}
                className="btn btn-secondary btn-sm"
              >
                Unduh CSV
              </button>
            </div>

            {/* Restore from JSON */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Upload size={16} color="#f59e0b" />
                  Pulihkan dari File Cadangan (Restore JSON)
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Muat ulang data dari file cadangan JSON yang pernah Anda unduh.
                </p>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChangeImport}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary btn-sm"
              >
                Pilih File JSON
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {importStatus && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--success-bg)',
                border: '1px solid var(--success)',
                color: 'var(--success)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{importStatus}</span>
            </div>
          )}

          {errorStatus && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                color: '#fca5a5',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function handleFileChangeImport(e: React.ChangeEvent<HTMLInputElement>) {
    handleFileImport(e);
  }
};
