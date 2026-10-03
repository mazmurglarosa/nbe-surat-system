import React, { useState, useEffect } from 'react';
import { Sidebar, SidebarTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DocumentGenerator } from './components/DocumentGenerator';
import { ActivityLogsView } from './components/ActivityLogsView';
import { JobDeskView, AgendaView, FinanceView, DataView } from './components/DirectorPortalViews';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { EditDocumentModal } from './components/EditDocumentModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { PdfGuideModal } from './components/PdfGuideModal';
import { DocumentRecord, ActivityLog } from './types';
import {
  loadDocuments,
  saveDocument,
  deleteDocument,
  saveAllDocuments,
  getGoogleDriveSettings,
  saveGoogleDriveSettings,
  GoogleDriveSettings,
  getStoredDocumentsSync,
} from './services/storage';
import { loadActivityLogs, addActivityLog } from './services/activityLogs';
import {
  Moon,
  Sun,
  HardDrive,
  BookOpen,
  Download,
  Menu,
  X,
  Bell,
  Search,
} from 'lucide-react';

export function App() {
  const [documents, setDocuments] = useState<DocumentRecord[]>(() =>
    getStoredDocumentsSync()
  );
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() =>
    loadActivityLogs()
  );
  const [driveSettings, setDriveSettings] = useState<GoogleDriveSettings>(() =>
    getGoogleDriveSettings()
  );

  // Modals state
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isPdfGuideOpen, setIsPdfGuideOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('nbe_theme') as 'dark' | 'light') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nbe_theme', theme);
  }, [theme]);

  // Load from storage on mount
  useEffect(() => {
    loadDocuments().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setDocuments(loaded);
      }
    });
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Handlers for documents with activity logging
  const handleSaveDocument = async (newDoc: DocumentRecord) => {
    const updated = await saveDocument(newDoc);
    setDocuments(updated);

    const updatedLogs = addActivityLog({
      userName: 'Mazmur Gusti Agung Larosa',
      userRole: 'Direktur Keuangan',
      action: 'Penerbitan Surat Baru',
      details: `Mendaftarkan surat "${newDoc.title}" dengan kode resmi ${newDoc.code}`,
      documentCode: newDoc.code,
      type: 'create',
    });
    setActivityLogs(updatedLogs);
  };

  const handleUpdateDocument = async (updatedDoc: DocumentRecord) => {
    const updated = await saveDocument(updatedDoc);
    setDocuments(updated);
    if (viewingDoc && viewingDoc.id === updatedDoc.id) {
      setViewingDoc(updatedDoc);
    }

    const updatedLogs = addActivityLog({
      userName: 'Mazmur Gusti Agung Larosa',
      userRole: 'Direktur Keuangan',
      action: 'Pembaruan Dokumen / Ubah Kode',
      details: `Memperbarui dokumen ${updatedDoc.code} ("${updatedDoc.title}")`,
      documentCode: updatedDoc.code,
      type: 'update',
    });
    setActivityLogs(updatedLogs);
  };

  const handleDeleteDocument = async (id: string) => {
    const target = documents.find((d) => d.id === id);
    const updated = await deleteDocument(id);
    setDocuments(updated);
    if (viewingDoc && viewingDoc.id === id) {
      setViewingDoc(null);
    }

    const updatedLogs = addActivityLog({
      userName: 'Mazmur Gusti Agung Larosa',
      userRole: 'Direktur Keuangan',
      action: 'Penghapusan Surat',
      details: `Menghapus surat ${target?.code || id} ("${target?.title || ''}")`,
      documentCode: target?.code,
      type: 'delete',
    });
    setActivityLogs(updatedLogs);
  };

  const handleRestoreDocuments = async (restoredDocs: DocumentRecord[]) => {
    await saveAllDocuments(restoredDocs);
    setDocuments(restoredDocs);

    const updatedLogs = addActivityLog({
      userName: 'Mazmur Gusti Agung Larosa',
      userRole: 'Direktur Keuangan',
      action: 'Pemulihan Database Cadangan',
      details: `Memulihkan ${restoredDocs.length} dokumen dari file backup JSON`,
      type: 'system',
    });
    setActivityLogs(updatedLogs);
  };

  const handleSaveDriveSettings = (settings: GoogleDriveSettings) => {
    saveGoogleDriveSettings(settings);
    setDriveSettings(settings);

    const updatedLogs = addActivityLog({
      userName: 'Mazmur Gusti Agung Larosa',
      userRole: 'Direktur Keuangan',
      action: 'Pengaturan Google Drive',
      details: 'Memperbarui konfigurasi link folder Google Drive perusahaan',
      type: 'system',
    });
    setActivityLogs(updatedLogs);
  };

  const handleLogout = () => {
    if (confirm('Apakah Anda ingin keluar dari sesi sistem?')) {
      alert('Anda telah keluar dari sesi kerja. Untuk masuk kembali silakan muat ulang halaman.');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar Desktop */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsMobileSidebarOpen(false);
        }}
        documentCount={documents.length}
        onOpenSettings={() => setIsBackupModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main App Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Navbar */}
        <header
          style={{
            height: '64px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Left Title / Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#2563eb',
                letterSpacing: '-0.02em',
              }}
            >
              PT Nirwana Bhumi Energi
            </span>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {activeTab === 'dashboard' && 'Dashboard Dokumen'}
              {activeTab === 'create' && 'Daftarkan Surat Baru'}
              {activeTab === 'jobdesk' && 'Job Desk Direksi'}
              {activeTab === 'agenda' && 'Agenda Kegiatan'}
              {activeTab === 'finance' && 'Laporan Keuangan (FNC)'}
              {activeTab === 'personal' && 'Data Pribadi'}
              {activeTab === 'shared' && 'Data Bersama'}
              {activeTab === 'dir-ceo' && 'Direktur Utama'}
              {activeTab === 'dir-cto' && 'Direktur Engineering'}
              {activeTab === 'dir-coo' && 'Direktur Operation'}
              {activeTab === 'dir-cfo' && 'Direktur Keuangan (Saya)'}
              {activeTab === 'logs' && 'Log Aktivitas'}
            </span>
          </div>

          {/* Right Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Google Drive Shortcut */}
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="btn btn-secondary btn-sm"
              title="Folder Google Drive Dokumen"
            >
              <HardDrive size={15} color="#38bdf8" />
              <span>Google Drive</span>
            </button>

            {/* Pedoman PDF */}
            <button
              onClick={() => setIsPdfGuideOpen(true)}
              className="btn btn-secondary btn-sm"
              title="Buka Pedoman SOP NBE (0001-SOP-GNR-CEO-IX-2026)"
            >
              <BookOpen size={15} color="#00d4b2" />
              <span>Pedoman PDF</span>
            </button>

            {/* Backup JSON */}
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="btn btn-secondary btn-sm"
              title="Pusat Cadangan & Restore Data"
            >
              <Download size={15} />
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.45rem' }}
              title={`Ganti ke mode ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
            >
              {theme === 'dark' ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} color="#2563eb" />}
            </button>
          </div>
        </header>

        {/* View Switcher based on Sidebar selection */}
        <main style={{ flex: 1 }}>
          {activeTab === 'dashboard' && (
            <DashboardView
              documents={documents}
              onNavigateToCreate={() => setActiveTab('create')}
              onViewDocument={(doc) => setViewingDoc(doc)}
              onEditDocument={(doc) => setEditingDoc(doc)}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === 'create' && (
            <DocumentGenerator
              documents={documents}
              onSaveDocument={handleSaveDocument}
              driveSettings={driveSettings}
              onNavigateToDocuments={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'logs' && (
            <ActivityLogsView logs={activityLogs} />
          )}

          {activeTab === 'jobdesk' && <JobDeskView />}
          {activeTab === 'agenda' && <AgendaView />}
          {activeTab === 'finance' && (
            <FinanceView
              documents={documents}
              onNavigateToCreate={() => setActiveTab('create')}
              onViewDocument={(doc) => setViewingDoc(doc)}
            />
          )}
          {activeTab === 'personal' && <DataView type="personal" />}
          {activeTab === 'shared' && <DataView type="shared" />}

          {/* Director Divisions Filters */}
          {activeTab === 'dir-ceo' && (
            <DashboardView
              documents={documents}
              filterApproverRole="CEO"
              roleTitle="Direktur Utama (CEO)"
              onNavigateToCreate={() => setActiveTab('create')}
              onViewDocument={(doc) => setViewingDoc(doc)}
              onEditDocument={(doc) => setEditingDoc(doc)}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === 'dir-cto' && (
            <DashboardView
              documents={documents}
              filterApproverRole="CTO"
              roleTitle="Direktur Engineering (CTO)"
              onNavigateToCreate={() => setActiveTab('create')}
              onViewDocument={(doc) => setViewingDoc(doc)}
              onEditDocument={(doc) => setEditingDoc(doc)}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === 'dir-coo' && (
            <DashboardView
              documents={documents}
              filterApproverRole="COO"
              roleTitle="Direktur Operation (COO)"
              onNavigateToCreate={() => setActiveTab('create')}
              onViewDocument={(doc) => setViewingDoc(doc)}
              onEditDocument={(doc) => setEditingDoc(doc)}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === 'dir-cfo' && (
            <DashboardView
              documents={documents}
              filterApproverRole="CFO"
              roleTitle="Direktur Keuangan (CFO - Saya)"
              onNavigateToCreate={() => setActiveTab('create')}
              onViewDocument={(doc) => setViewingDoc(doc)}
              onEditDocument={(doc) => setEditingDoc(doc)}
              onDeleteDocument={handleDeleteDocument}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      {viewingDoc && (
        <DocumentDetailModal
          document={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onUpdateDocument={handleUpdateDocument}
        />
      )}

      {editingDoc && (
        <EditDocumentModal
          document={editingDoc}
          allDocuments={documents}
          onClose={() => setEditingDoc(null)}
          onSave={handleUpdateDocument}
        />
      )}

      {isDriveModalOpen && (
        <GoogleDriveModal
          settings={driveSettings}
          onSaveSettings={handleSaveDriveSettings}
          onClose={() => setIsDriveModalOpen(false)}
          documents={documents}
        />
      )}

      {isBackupModalOpen && (
        <BackupRestoreModal
          documents={documents}
          onRestoreDocuments={handleRestoreDocuments}
          onClose={() => setIsBackupModalOpen(false)}
        />
      )}

      {isPdfGuideOpen && (
        <PdfGuideModal onClose={() => setIsPdfGuideOpen(false)} />
      )}
    </div>
  );
}

export default App;
