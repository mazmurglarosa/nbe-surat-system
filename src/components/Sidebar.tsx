import React from 'react';
import {
  LayoutGrid,
  FilePlus,
  FolderPlus,
  Briefcase,
  History,
  Settings,
  LogOut,
  ChevronRight,
  FolderKanban,
  Building2,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { CodeDefinition, DocumentRecord, DIVISIONS } from '../types';

export type SidebarTab =
  | 'dashboard'
  | 'create'
  | 'create-folder'
  | 'master-categories'
  | 'template-settings'
  | 'logs'
  | 'settings'
  | 'dir-ceo'
  | 'dir-cto'
  | 'dir-coo'
  | 'dir-cfo'
  | `div-${string}`;

interface SidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  documentCount: number;
  divisions?: CodeDefinition[];
  documents?: DocumentRecord[];
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  documentCount,
  divisions = DIVISIONS,
  documents = [],
  onOpenSettings,
  onLogout,
}) => {
  return (
    <aside
      style={{
        width: '270px',
        minWidth: '270px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        zIndex: 40,
        boxShadow: '2px 0 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Top Part: Logo, Profile & Main Navigation */}
      <div
        style={{
          overflowY: 'auto',
          padding: '1.25rem 1rem 1rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Company Logo Header */}
        <div
          style={{
            padding: '0.25rem 0.5rem 0.5rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <img
              src="/+BG.png"
              alt="PT Nirwana Bhumi Energi"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo.png';
              }}
              style={{
                height: '36px',
                width: 'auto',
                objectFit: 'contain',
                borderRadius: '6px',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#0284c7',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                }}
              >
                PT NIRWANA BHUMI ENERGI
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Document Control System
              </span>
            </div>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              alignSelf: 'flex-start',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.68rem',
              fontWeight: 600,
              background: 'rgba(2, 132, 199, 0.1)',
              color: '#38bdf8',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              letterSpacing: '0.03em',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 6px #10b981',
                display: 'inline-block',
              }}
            />
            <span>Enterprise Cloud Active</span>
          </div>
        </div>


        {/* Menu Items List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {/* 1. Dashboard */}
          <button
            onClick={() => onSelectTab('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.7rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background:
                activeTab === 'dashboard'
                  ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                  : 'transparent',
              color: activeTab === 'dashboard' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'dashboard' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow:
                activeTab === 'dashboard'
                  ? '0 4px 12px rgba(2, 132, 199, 0.35)'
                  : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <LayoutGrid size={18} />
              <span>Dashboard</span>
            </div>
            {activeTab === 'dashboard' ? (
              <ChevronRight size={16} />
            ) : (
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  background: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                {documentCount}
              </span>
            )}
          </button>

          {/* 2. Daftarkan Surat */}
          <button
            onClick={() => onSelectTab('create')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.7rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background:
                activeTab === 'create'
                  ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                  : 'transparent',
              color: activeTab === 'create' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'create' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow:
                activeTab === 'create'
                  ? '0 4px 12px rgba(2, 132, 199, 0.35)'
                  : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FilePlus size={18} />
              <span>Daftarkan Surat</span>
            </div>
            {activeTab === 'create' && <ChevronRight size={16} />}
          </button>

          {/* 2b. Daftarkan Folder */}
          <button
            onClick={() => onSelectTab('create-folder')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.7rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background:
                activeTab === 'create-folder'
                  ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                  : 'transparent',
              color: activeTab === 'create-folder' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'create-folder' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow:
                activeTab === 'create-folder'
                  ? '0 4px 12px rgba(2, 132, 199, 0.35)'
                  : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FolderPlus size={18} />
              <span>Daftarkan Folder</span>
            </div>
            {activeTab === 'create-folder' && <ChevronRight size={16} />}
          </button>

          {/* 3. Kelola Kategori & Kode */}
          <button
            onClick={() => onSelectTab('master-categories')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.7rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background:
                activeTab === 'master-categories'
                  ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                  : 'transparent',
              color: activeTab === 'master-categories' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'master-categories' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow:
                activeTab === 'master-categories'
                  ? '0 4px 12px rgba(2, 132, 199, 0.35)'
                  : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FolderKanban size={18} />
              <span>Kelola Kategori & Kode</span>
            </div>
            {activeTab === 'master-categories' && <ChevronRight size={16} />}
          </button>

          {/* 3b. Acuan Template Dokumen (Tahap 3) */}
          <button
            onClick={() => onSelectTab('template-settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.7rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background:
                activeTab === 'template-settings'
                  ? 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)'
                  : 'transparent',
              color: activeTab === 'template-settings' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'template-settings' ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow:
                activeTab === 'template-settings'
                  ? '0 4px 12px rgba(99, 102, 241, 0.35)'
                  : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileCode size={18} color={activeTab === 'template-settings' ? '#ffffff' : '#818cf8'} />
              <span>Acuan Template Dokumen</span>
            </div>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.1rem 0.4rem',
                borderRadius: '6px',
                background: activeTab === 'template-settings' ? 'rgba(255,255,255,0.2)' : 'rgba(99, 102, 241, 0.2)',
                color: activeTab === 'template-settings' ? '#ffffff' : '#818cf8',
              }}
            >
              BARU
            </span>
          </button>

          {/* Section Divider: DIVISI PENERBIT SURAT */}
          <div
            style={{
              padding: '0.85rem 0.5rem 0.35rem 0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              DIVISI PENERBIT SURAT
            </span>
            <button
              onClick={() => onSelectTab('master-categories')}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '0.68rem',
                color: '#0284c7',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '2px 4px',
                borderRadius: '4px',
              }}
              title="Kelola & Tambah Divisi Baru"
            >
              + Kelola
            </button>
          </div>

          {/* Dynamic Publishing Divisions */}
          {divisions.map((div) => {
            const tabId = `div-${div.code.toLowerCase()}` as SidebarTab;
            const isActive = activeTab === tabId;
            const count = documents.filter(
              (d) => (d.divisionCode || '').toUpperCase() === div.code.toUpperCase()
            ).length;
            const cleanLabel = div.label.replace(/\s*\([A-Z0-9-]+\)\s*$/i, '');

            return (
              <button
                key={div.code}
                onClick={() => onSelectTab(tabId)}
                title={`${div.label} - ${div.description || ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.62rem 0.85rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isActive
                    ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                    : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(2, 132, 199, 0.35)' : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    minWidth: 0,
                    overflow: 'hidden',
                  }}
                >
                  <Building2
                    size={16}
                    color={isActive ? '#ffffff' : '#0284c7'}
                    style={{ flexShrink: 0 }}
                  />
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {cleanLabel || div.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.12rem 0.4rem',
                      borderRadius: '4px',
                      background: isActive
                        ? 'rgba(255, 255, 255, 0.22)'
                        : 'var(--bg-tertiary)',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {div.code}
                  </span>
                  {count > 0 && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.38rem',
                        borderRadius: '4px',
                        background: isActive ? '#ffffff' : 'rgba(2, 132, 199, 0.12)',
                        color: isActive ? '#0369a1' : '#0284c7',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {count}
                    </span>
                  )}
                  {isActive && <ChevronRight size={14} />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Part: Log Aktivitas, Pengaturan Akun, Keluar */}
      <div
        style={{
          padding: '0.75rem 1rem 1.25rem 1rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          background: 'var(--bg-secondary)',
        }}
      >
        {/* Log Aktivitas */}
        <button
          onClick={() => onSelectTab('logs')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 0.9rem',
            borderRadius: '10px',
            border: 'none',
            background:
              activeTab === 'logs'
                ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                : 'transparent',
            color: activeTab === 'logs' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: activeTab === 'logs' ? 700 : 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <History size={18} />
          <span>Log Aktivitas</span>
        </button>

        {/* Pengaturan Akun */}
        <button
          onClick={onOpenSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 0.9rem',
            borderRadius: '10px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontWeight: 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Settings size={18} />
          <span>Pengaturan Akun</span>
        </button>

        {/* Keluar */}
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 0.9rem',
            borderRadius: '10px',
            border: 'none',
            background: 'transparent',
            color: '#ef4444',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <LogOut size={18} color="#ef4444" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
};
