import React from 'react';
import {
  FileText,
  Cloud,
  Database,
  HardDrive,
  Download,
  BookOpen,
  Moon,
  Sun,
  Layers,
  PlusCircle,
  BarChart3,
  ExternalLink,
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
          {/* NBE Burst Icon SVG */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0a2540 0%, #00223e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-accent)',
              boxShadow: '0 4px 12px rgba(0, 212, 178, 0.15)',
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Radial Energy Burst rays */}
              <circle cx="50" cy="50" r="10" fill="#00d4b2" opacity="0.3" />
              <path
                d="M50 15L50 28"
                stroke="#00d4b2"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M75 25L65 35"
                stroke="#00d4b2"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M85 50L72 50"
                stroke="#0284c7"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M75 75L65 65"
                stroke="#38bdf8"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M50 85L50 72"
                stroke="#10b981"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M25 75L35 65"
                stroke="#10b981"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M15 50L28 50"
                stroke="#00d4b2"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M25 25L35 35"
                stroke="#0284c7"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(90deg, #ffffff 0%, var(--primary) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                PT Nirwana Bhumi Energi
              </span>
              <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                NBE IMS
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
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
