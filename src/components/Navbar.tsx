import React from 'react';
import {
  Cloud,
  HardDrive,
  Download,
  BookOpen,
  Moon,
  Sun,
  Layers,
  PlusCircle,
  BarChart3,
} from 'lucide-react';
import { isConvexConfigured } from '../services/convexClient';

interface NavbarProps {
  activeTab: 'generator' | 'documents' | 'analytics';
  setActiveTab: (tab: 'generator' | 'documents' | 'analytics') => void;
  documentCount: number;
  onOpenDriveModal: () => void;
  onOpenBackupModal: () => void;
  onOpenPdfGuide: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  documentCount,
  onOpenDriveModal,
  onOpenBackupModal,
  onOpenPdfGuide,
  theme,
  toggleTheme,
}) => {
  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '0.9rem',
          paddingBottom: '0.9rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Logo Perusahaan +BG */}
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-accent)',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
              flexShrink: 0,
            }}
          >
            <img
              src="/+BG.png"
              alt="Logo PT Nirwana Bhumi Energi"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: '#2563eb',
                  background: 'linear-gradient(90deg, #38bdf8 0%, #2563eb 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 10px rgba(37, 99, 235, 0.2)',
                }}
              >
                PT Nirwana Bhumi Energi
              </span>
              <span className="badge badge-blue" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                NBE IMS
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 500 }}>
              Documents and Records Control & Numbering System
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-tertiary)',
            padding: '0.3rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            gap: '0.25rem',
          }}
        >
          <button
            onClick={() => setActiveTab('generator')}
            className={`btn btn-sm ${
              activeTab === 'generator' ? 'btn-primary' : 'btn-ghost'
            }`}
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <PlusCircle size={15} />
            Buat & Nomor Dokumen
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`btn btn-sm ${
              activeTab === 'documents' ? 'btn-primary' : 'btn-ghost'
            }`}
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <Layers size={15} />
            Database Dokumen
            <span
              style={{
                marginLeft: '0.35rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
                fontSize: '0.7rem',
                background:
                  activeTab === 'documents'
                    ? 'rgba(0,0,0,0.2)'
                    : 'var(--border-subtle)',
                color: activeTab === 'documents' ? '#000' : 'var(--text-main)',
                fontWeight: 700,
              }}
            >
              {documentCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`btn btn-sm ${
              activeTab === 'analytics' ? 'btn-primary' : 'btn-ghost'
            }`}
            style={{ borderRadius: 'var(--radius-sm)' }}
          >
            <BarChart3 size={15} />
            Statistik & Distribusi
          </button>
        </div>

        {/* Utility Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Database indicator */}
          <div
            title={
              isConvexConfigured
                ? 'Convex Realtime Cloud DB Aktif'
                : 'Penyimpanan Lokal Persisten Terenkripsi (IndexedDB + Backup Siap Cloud)'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: isConvexConfigured
                ? 'var(--success-bg)'
                : 'rgba(2, 132, 199, 0.1)',
              border: `1px solid ${
                isConvexConfigured
                  ? 'rgba(16, 185, 129, 0.3)'
                  : 'rgba(2, 132, 199, 0.3)'
              }`,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: isConvexConfigured ? 'var(--success)' : '#38bdf8',
            }}
          >
            {isConvexConfigured ? (
              <>
                <Cloud size={14} />
                <span>Convex Cloud</span>
              </>
            ) : (
              <>
                <HardDrive size={14} />
                <span>Penyimpanan Aman</span>
              </>
            )}
          </div>

          {/* Google Drive Button */}
          <button
            onClick={onOpenDriveModal}
            className="btn btn-secondary btn-sm"
            title="Kelola Database & Folder Google Drive"
          >
            <HardDrive size={15} color="#38bdf8" />
            <span>Google Drive</span>
          </button>

          {/* Pedoman NBE SOP PDF */}
          <button
            onClick={onOpenPdfGuide}
            className="btn btn-secondary btn-sm"
            title="Buka Pedoman Prosedur Pengendalian Dokumen NBE"
          >
            <BookOpen size={15} color="#00d4b2" />
            <span>Pedoman PDF</span>
          </button>

          {/* Backup / Export */}
          <button
            onClick={onOpenBackupModal}
            className="btn btn-secondary btn-sm"
            title="Cadangkan / Ekspor Data"
          >
            <Download size={15} />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.4rem' }}
            title={`Ganti ke mode ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
          >
            {theme === 'dark' ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
};
