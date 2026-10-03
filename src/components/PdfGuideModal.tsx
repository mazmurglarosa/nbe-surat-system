import React from 'react';
import { X, BookOpen, Download, ExternalLink } from 'lucide-react';

interface PdfGuideModalProps {
  onClose: () => void;
}

export const PdfGuideModal: React.FC<PdfGuideModalProps> = ({ onClose }) => {
  const pdfUrl = '/0001-SOP-GNR-CEO-IX-2026.pdf';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-fade-in"
        style={{ maxWidth: '980px', height: '90vh', display: 'flex', flexDirection: 'column' }}
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
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <BookOpen size={22} color="var(--primary)" />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Pedoman Resmi Prosedur Pengendalian Dokumen NBE
              </h2>
              <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>
                0001-SOP-GNR-CEO-IX-2026 (DOCUMENTS AND RECORDS CONTROL PROCEDURE)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a
              href={pdfUrl}
              download="0001-SOP-GNR-CEO-IX-2026.pdf"
              className="btn btn-secondary btn-sm"
              title="Unduh File PDF Prosedur"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </a>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.35rem' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewer */}
        <div style={{ flex: 1, padding: '0.5rem', background: '#111827', position: 'relative' }}>
          <iframe
            src={pdfUrl}
            title="Pedoman Dokumen NBE"
            style={{ width: '100%', height: '100%', border: 'none', borderRadius: 'var(--radius-sm)' }}
          />
        </div>
      </div>
    </div>
  );
};
