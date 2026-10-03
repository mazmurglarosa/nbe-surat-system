import React from 'react';
import {
  LayoutGrid,
  FilePlus,
  Briefcase,
  History,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export type SidebarTab =
  | 'dashboard'
  | 'create'
  | 'dir-ceo'
  | 'dir-cto'
  | 'dir-coo'
  | 'dir-cfo'
  | 'logs'
  | 'settings';

interface SidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  documentCount: number;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  documentCount,
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
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          <img
            src="/nbe-logo-horizontal.png"
            alt="Nirwana Bhumi Energy"
            onError={(e) => {
              // fallback if needed
              (e.currentTarget as HTMLImageElement).src = '/+BG.png';
            }}
            style={{
              height: '38px',
              maxWidth: '100%',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* User Profile Card */}
        <div
          style={{
            background: 'rgba(2, 132, 199, 0.05)',
            border: '1px solid rgba(2, 132, 199, 0.15)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontWeight: 500,
              marginBottom: '0.2rem',
            }}
          >
            Login Sebagai
          </div>
          <div
            style={{
              fontSize: '0.925rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              lineHeight: 1.3,
              marginBottom: '0.45rem',
            }}
          >
            Mazmur Gusti Agung Larosa
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              background: 'rgba(37, 99, 235, 0.1)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              fontSize: '0.72rem',
              color: '#2563eb',
              fontWeight: 600,
            }}
          >
            <Briefcase size={12} color="#2563eb" />
            <span>Direktur Keuangan</span>
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

          {/* Section Divider: DIVISI DIREKSI */}
          <div
            style={{
              padding: '0.85rem 0.5rem 0.35rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            DIVISI DIREKSI
          </div>

          {/* Direktur Utama */}
          <button
            onClick={() => onSelectTab('dir-ceo')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background:
                activeTab === 'dir-ceo'
                  ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                  : 'transparent',
              color: activeTab === 'dir-ceo' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'dir-ceo' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Briefcase size={16} />
              <span>Direktur Utama</span>
            </div>
            {activeTab === 'dir-ceo' && <ChevronRight size={14} />}
          </button>

          {/* Direktur Engineering */}
          <button
            onClick={() => onSelectTab('dir-cto')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background:
                activeTab === 'dir-cto'
                  ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                  : 'transparent',
              color: activeTab === 'dir-cto' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'dir-cto' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Briefcase size={16} />
              <span>Direktur Engineering</span>
            </div>
            {activeTab === 'dir-cto' && <ChevronRight size={14} />}
          </button>

          {/* Direktur Operation */}
          <button
            onClick={() => onSelectTab('dir-coo')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background:
                activeTab === 'dir-coo'
                  ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                  : 'transparent',
              color: activeTab === 'dir-coo' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'dir-coo' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Briefcase size={16} />
              <span>Direktur Operation</span>
            </div>
            {activeTab === 'dir-coo' && <ChevronRight size={14} />}
          </button>

          {/* Direktur Keuangan (Saya) */}
          <button
            onClick={() => onSelectTab('dir-cfo')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.9rem',
              borderRadius: '10px',
              border: 'none',
              background:
                activeTab === 'dir-cfo'
                  ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                  : 'transparent',
              color: activeTab === 'dir-cfo' ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: activeTab === 'dir-cfo' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Briefcase size={16} color="#0284c7" />
              <span>Direktur Keuangan (Saya)</span>
            </div>
            {activeTab === 'dir-cfo' && <ChevronRight size={14} />}
          </button>
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
