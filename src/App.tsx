import React, { useState, useEffect } from 'react';
import { Sidebar, SidebarTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DocumentGenerator } from './components/DocumentGenerator';
import { ActivityLogsView } from './components/ActivityLogsView';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { EditDocumentModal } from './components/EditDocumentModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { PdfGuideModal } from './components/PdfGuideModal';
import { MasterCategoriesView } from './components/MasterCategoriesView';
import { ReviseDocumentModal } from './components/ReviseDocumentModal';
import { DocumentRecord, ActivityLog, CodeDefinition, MasterCodesState } from './types';
import {
  deleteDocumentAndFolderFromDriveViaBot,
  ensureCategoryFolderInDriveViaBot,
} from './services/googleDriveBot';
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
  getMasterCodes,
  addDocumentType,
  updateDocumentType,
  deleteDocumentType,
  addSubCategory,
  updateSubCategory,
  deleteSubCategory,
  addDivision,
  updateDivision,
  deleteDivision,
  addApprover,
  updateApprover,
  deleteApprover,
  resetMasterCodesToDefaults,
} from './services/masterCodes';
import {
  Moon,
  Sun,
  BookOpen,
  Download,
  Bot,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import {
  setupRealtimeSync,
  pushDocumentToCloud,
  removeDocumentFromCloud,
  syncFromCloud,
  pushAllLocalDataToCloud,
  CloudSyncState,
} from './services/cloudSync';

export function App() {
  const [documents, setDocuments] = useState<DocumentRecord[]>(() =>
    getStoredDocumentsSync()
  );
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() =>
    loadActivityLogs()
  );
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>({
    isConfigured: false,
    isSyncing: false,
    lastSyncedAt: null,
    cloudDocumentCount: 0,
    lastError: null,
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [driveSettings, setDriveSettings] = useState<GoogleDriveSettings>(() =>
    getGoogleDriveSettings()
  );
  const [masterCodes, setMasterCodes] = useState<MasterCodesState>(() =>
    getMasterCodes()
  );

  // Modals state
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
  const [revisingDoc, setRevisingDoc] = useState<DocumentRecord | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isPdfGuideOpen, setIsPdfGuideOpen] = useState(false);

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

  // Live Cloud Synchronization across all devices (Every 8 seconds & on window focus)
  useEffect(() => {
    const unsubscribe = setupRealtimeSync({
      onDocumentsUpdated: (freshDocs) => {
        // Jangan pernah menimpa dokumen lokal yang ada jika data fresh bernilai kosong
        if (Array.isArray(freshDocs) && freshDocs.length > 0) {
          setDocuments(freshDocs);
        }
      },
      onMasterCodesUpdated: (freshCodes) => {
        setMasterCodes(freshCodes);
      },
      onSyncStatusChanged: (status) => {
        setCloudSyncState(status);
      },
      intervalMs: 8000,
    });

    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const res = await syncFromCloud();
      if (res.success && res.documents && res.documents.length > 0) {
        setDocuments(res.documents);
        if (res.masterCodes) setMasterCodes(res.masterCodes);
      }
    } finally {
      setTimeout(() => setIsManualSyncing(false), 600);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Handlers for documents with activity logging
  const handleSaveDocument = async (newDoc: DocumentRecord) => {
    const updated = await saveDocument(newDoc);
    setDocuments(updated);
    pushDocumentToCloud(newDoc); // Sinkronisasi instan ke Cloud Google Drive
    setTimeout(() => {
      pushAllLocalDataToCloud().catch(console.warn);
    }, 1200);

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
    pushDocumentToCloud(updatedDoc); // Sinkronisasi instan ke Cloud Google Drive
    setTimeout(() => {
      pushAllLocalDataToCloud().catch(console.warn);
    }, 1200);
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
    if (!target) return;

    // Hapus juga dari Cloud Google Drive
    removeDocumentFromCloud(id, target.code);

    // Otomatis hapus folder dan file di Google Drive via Bot jika Webhook disetel
    if (driveSettings.botWebhookUrl) {
      try {
        await deleteDocumentAndFolderFromDriveViaBot(
          {
            folderId: target.driveFolderId,
            documentCode: target.code,
          },
          driveSettings.botWebhookUrl
        );
      } catch (driveErr) {
        console.warn('Gagal menghapus folder Google Drive:', driveErr);
      }
    }

    const updated = await deleteDocument(id);
    setDocuments(updated);
    if (viewingDoc && viewingDoc.id === id) {
      setViewingDoc(null);
    }
    if (editingDoc && editingDoc.id === id) {
      setEditingDoc(null);
    }
    if (revisingDoc && revisingDoc.id === id) {
      setRevisingDoc(null);
    }

    const updatedLogs = addActivityLog({
      userName: 'Mazmur Gusti Agung Larosa',
      userRole: 'Direktur Keuangan',
      action: 'Penghapusan Surat & Folder Drive',
      details: `Menghapus surat ${target?.code || id} ("${target?.title || ''}") dan folder terkait di Google Drive`,
      documentCode: target?.code,
      type: 'delete',
    });
    setActivityLogs(updatedLogs);
  };

  const handleSaveRevision = async (updatedDoc: DocumentRecord) => {
    const updated = await saveDocument(updatedDoc);
    setDocuments(updated);
    pushDocumentToCloud(updatedDoc); // Sinkronisasi revisi ke Cloud Google Drive
    setTimeout(() => {
      pushAllLocalDataToCloud().catch(console.warn);
    }, 1200);
    if (viewingDoc && viewingDoc.id === updatedDoc.id) {
      setViewingDoc(updatedDoc);
    }

    const updatedLogs = addActivityLog({
      userName: 'Mazmur Gusti Agung Larosa',
      userRole: 'Direktur Keuangan',
      action: `Penerbitan Revisi Dokumen (Rev ${updatedDoc.revision})`,
      details: `Mengunggah berkas revisi baru untuk dokumen ${updatedDoc.code} ("${updatedDoc.title}")`,
      documentCode: updatedDoc.code,
      type: 'update',
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

  // Master Categories & Codes Handlers
  const handleAddDocType = (item: CodeDefinition) => {
    const updated = addDocumentType(item);
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Tambah Kategori Surat',
        details: `Menambahkan kategori dokumen baru: [${item.code}] ${item.label}`,
        type: 'system',
      })
    );

    // Otomatis buat folder kategori baru di Google Drive jika bot webhook terkonfigurasi
    if (driveSettings.botWebhookUrl) {
      ensureCategoryFolderInDriveViaBot(
        item.code,
        item.label,
        driveSettings.botWebhookUrl,
        driveSettings.folderId
      ).then((res) => {
        if (res.success) {
          setActivityLogs(
            addActivityLog({
              userName: 'Google Drive Bot',
              userRole: 'Sistem Integrasi',
              action: 'Buat Folder Kategori Drive',
              details: `Berhasil membuat folder Drive kategori [${item.code}]: "${res.folderName}"`,
              type: 'system',
            })
          );
        }
      }).catch((err) => {
        console.error('Failed to auto-create category folder in Drive:', err);
      });
    }
  };

  const handleUpdateDocType = (code: string, item: Partial<CodeDefinition>) => {
    const updated = updateDocumentType(code, item);
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Ubah Kategori Surat',
        details: `Memperbarui kategori dokumen: [${code}] ${item.label || ''}`,
        type: 'system',
      })
    );
  };

  const handleDeleteDocType = (code: string) => {
    const updated = deleteDocumentType(code);
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Hapus Kategori Surat',
        details: `Menghapus kategori dokumen: [${code}]`,
        type: 'system',
      })
    );
  };

  // Sub-Categories (ZZ) Handlers
  const handleAddSubCategory = (item: CodeDefinition) => {
    const updated = addSubCategory(item);
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Tambah Sub-Kategori Surat',
        details: `Menambahkan sub-kategori baru [${item.code}]: ${item.label}`,
        type: 'system',
      })
    );
  };

  const handleUpdateSubCategory = (code: string, item: Partial<CodeDefinition>) => {
    const updated = updateSubCategory(code, item);
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Ubah Sub-Kategori Surat',
        details: `Memperbarui sub-kategori: [${code}] ${item.label || ''}`,
        type: 'system',
      })
    );
  };

  const handleDeleteSubCategory = (code: string) => {
    const updated = deleteSubCategory(code);
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Hapus Sub-Kategori Surat',
        details: `Menghapus sub-kategori: [${code}]`,
        type: 'system',
      })
    );
  };

  const handleAddDivision = (item: CodeDefinition) => {
    const updated = addDivision(item);
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Tambah Divisi Penerbit',
        details: `Menambahkan divisi penerbit baru: [${item.code}] ${item.label}`,
        type: 'system',
      })
    );
  };

  const handleUpdateDivision = (code: string, item: Partial<CodeDefinition>) => {
    const updated = updateDivision(code, item);
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Ubah Divisi Penerbit',
        details: `Memperbarui divisi penerbit: [${code}] ${item.label || ''}`,
        type: 'system',
      })
    );
  };

  const handleDeleteDivision = (code: string) => {
    const updated = deleteDivision(code);
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Hapus Divisi Penerbit',
        details: `Menghapus divisi penerbit: [${code}]`,
        type: 'system',
      })
    );
  };

  const handleAddApprover = (item: CodeDefinition) => {
    const updated = addApprover(item);
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Tambah Otoritas Pengesahan',
        details: `Menambahkan otoritas pengesahan baru: [${item.code}] ${item.label}`,
        type: 'system',
      })
    );
  };

  const handleUpdateApprover = (code: string, item: Partial<CodeDefinition>) => {
    const updated = updateApprover(code, item);
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Ubah Otoritas Pengesahan',
        details: `Memperbarui otoritas pengesahan: [${code}] ${item.label || ''}`,
        type: 'system',
      })
    );
  };

  const handleDeleteApprover = (code: string) => {
    const updated = deleteApprover(code);
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Hapus Otoritas Pengesahan',
        details: `Menghapus otoritas pengesahan: [${code}]`,
        type: 'system',
      })
    );
  };

  const handleResetMasterCodes = () => {
    const updated = resetMasterCodesToDefaults();
    setMasterCodes(updated);
    setActivityLogs(
      addActivityLog({
        userName: 'Mazmur Gusti Agung Larosa',
        userRole: 'Direktur Keuangan',
        action: 'Reset Master Kategori & Kode',
        details: 'Mengembalikan master kategori, divisi, dan otoritas ke standar bawaan SOP NBE',
        type: 'system',
      })
    );
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
              {activeTab === 'master-categories' && 'Kelola Master Kategori & Kode'}
              {activeTab === 'dir-ceo' && 'Direktur Utama'}
              {activeTab === 'dir-cto' && 'Direktur Engineering'}
              {activeTab === 'dir-coo' && 'Direktur Operation'}
              {activeTab === 'dir-cfo' && 'Direktur Keuangan (Saya)'}
              {activeTab === 'logs' && 'Log Aktivitas'}
            </span>
          </div>

          {/* Right Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Real-time Cloud Sync Badge & Button */}
            <button
              onClick={() => {
                if (cloudSyncState.isConfigured) {
                  handleManualSync();
                } else {
                  setIsDriveModalOpen(true);
                }
              }}
              disabled={isManualSyncing || (cloudSyncState.isConfigured && cloudSyncState.isSyncing)}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                border: cloudSyncState.isConfigured
                  ? '1px solid rgba(16, 185, 129, 0.45)'
                  : '1px solid rgba(245, 158, 11, 0.45)',
                background: cloudSyncState.isConfigured
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(245, 158, 11, 0.1)',
                color: cloudSyncState.isConfigured ? 'var(--success)' : '#f59e0b',
                padding: '0.35rem 0.75rem',
                cursor: 'pointer',
              }}
              title={
                cloudSyncState.isConfigured
                  ? 'Cloud Database Real-Time Aktif (Multi-Device Sinkron Otomatis). Klik untuk refresh instan.'
                  : 'Perangkat ini belum terhubung ke Bot Google Drive. Klik untuk menghubungkan bot.'
              }
            >
              <RefreshCw
                size={13}
                style={{
                  animation:
                    isManualSyncing || cloudSyncState.isSyncing
                      ? 'spin 1s linear infinite'
                      : 'none',
                }}
              />
              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                {cloudSyncState.isSyncing || isManualSyncing
                  ? 'Sinkron...'
                  : cloudSyncState.isConfigured
                  ? 'Cloud Real-Time'
                  : 'Cloud Offline (Hubungkan)'}
              </span>
            </button>

            {/* Bot & Google Drive Shortcut */}
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="btn btn-secondary btn-sm"
              title="Folder Google Drive Dokumen & Pengaturan Bot"
            >
              <Bot size={15} color="#38bdf8" />
              <span>Bot Google Drive</span>
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
              documentTypes={masterCodes.documentTypes}
              divisions={masterCodes.divisions}
              onNavigateToCreate={() => setActiveTab('create')}
              onViewDocument={(doc) => setViewingDoc(doc)}
              onEditDocument={(doc) => setEditingDoc(doc)}
              onReviseDocument={(doc) => setRevisingDoc(doc)}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === 'create' && (
            <DocumentGenerator
              documents={documents}
              onSaveDocument={handleSaveDocument}
              driveSettings={driveSettings}
              onNavigateToDocuments={() => setActiveTab('dashboard')}
              onOpenDriveSettings={() => setIsDriveModalOpen(true)}
              documentTypes={masterCodes.documentTypes}
              subCategories={masterCodes.subCategories}
              divisions={masterCodes.divisions}
              approvers={masterCodes.approvers}
              onAddSubCategory={handleAddSubCategory}
              onAddDocumentType={handleAddDocType}
              onNavigateToMasterCategories={() => setActiveTab('master-categories')}
            />
          )}

          {activeTab === 'master-categories' && (
            <MasterCategoriesView
              masterCodes={masterCodes}
              onAddDocumentType={handleAddDocType}
              onUpdateDocumentType={handleUpdateDocType}
              onDeleteDocumentType={handleDeleteDocType}
              onAddSubCategory={handleAddSubCategory}
              onUpdateSubCategory={handleUpdateSubCategory}
              onDeleteSubCategory={handleDeleteSubCategory}
              onAddDivision={handleAddDivision}
              onUpdateDivision={handleUpdateDivision}
              onDeleteDivision={handleDeleteDivision}
              onAddApprover={handleAddApprover}
              onUpdateApprover={handleUpdateApprover}
              onDeleteApprover={handleDeleteApprover}
              onResetDefaults={handleResetMasterCodes}
            />
          )}

          {activeTab === 'logs' && (
            <ActivityLogsView logs={activityLogs} />
          )}

          {/* Director Divisions Filters */}
          {activeTab === 'dir-ceo' && (
            <DashboardView
              documents={documents}
              documentTypes={masterCodes.documentTypes}
              divisions={masterCodes.divisions}
              filterApproverRole="CEO"
              roleTitle="Direktur Utama (CEO)"
              onNavigateToCreate={() => setActiveTab('create')}
              onViewDocument={(doc) => setViewingDoc(doc)}
              onEditDocument={(doc) => setEditingDoc(doc)}
              onReviseDocument={(doc) => setRevisingDoc(doc)}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === 'dir-cto' && (
            <DashboardView
              documents={documents}
              documentTypes={masterCodes.documentTypes}
              divisions={masterCodes.divisions}
              filterApproverRole="CTO"
              roleTitle="Direktur Engineering (CTO)"
              onNavigateToCreate={() => setActiveTab('create')}
              onViewDocument={(doc) => setViewingDoc(doc)}
              onEditDocument={(doc) => setEditingDoc(doc)}
              onReviseDocument={(doc) => setRevisingDoc(doc)}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === 'dir-coo' && (
            <DashboardView
              documents={documents}
              documentTypes={masterCodes.documentTypes}
              divisions={masterCodes.divisions}
              filterApproverRole="COO"
              roleTitle="Direktur Operation (COO)"
              onNavigateToCreate={() => setActiveTab('create')}
              onViewDocument={(doc) => setViewingDoc(doc)}
              onEditDocument={(doc) => setEditingDoc(doc)}
              onReviseDocument={(doc) => setRevisingDoc(doc)}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === 'dir-cfo' && (
            <DashboardView
              documents={documents}
              documentTypes={masterCodes.documentTypes}
              divisions={masterCodes.divisions}
              filterApproverRole="CFO"
              roleTitle="Direktur Keuangan (CFO - Saya)"
              onNavigateToCreate={() => setActiveTab('create')}
              onViewDocument={(doc) => setViewingDoc(doc)}
              onEditDocument={(doc) => setEditingDoc(doc)}
              onReviseDocument={(doc) => setRevisingDoc(doc)}
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
          onReviseDocument={(doc) => {
            setViewingDoc(null);
            setRevisingDoc(doc);
          }}
        />
      )}

      {revisingDoc && (
        <ReviseDocumentModal
          document={revisingDoc}
          driveSettings={driveSettings}
          onClose={() => setRevisingDoc(null)}
          onSaveRevision={handleSaveRevision}
          onOpenDriveSettings={() => {
            setRevisingDoc(null);
            setIsDriveModalOpen(true);
          }}
        />
      )}

      {editingDoc && (
        <EditDocumentModal
          document={editingDoc}
          allDocuments={documents}
          onClose={() => setEditingDoc(null)}
          onSave={handleUpdateDocument}
          driveSettings={driveSettings}
          onOpenDriveSettings={() => setIsDriveModalOpen(true)}
        />
      )}

      {isDriveModalOpen && (
        <GoogleDriveModal
          settings={driveSettings}
          onSaveSettings={handleSaveDriveSettings}
          onClose={() => setIsDriveModalOpen(false)}
          documents={documents}
          documentTypes={masterCodes.documentTypes}
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
