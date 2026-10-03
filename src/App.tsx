import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DocumentGenerator } from './components/DocumentGenerator';
import { DocumentList } from './components/DocumentList';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { EditDocumentModal } from './components/EditDocumentModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { PdfGuideModal } from './components/PdfGuideModal';
import { DocumentRecord } from './types';
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

export function App() {
  const [documents, setDocuments] = useState<DocumentRecord[]>(() =>
    getStoredDocumentsSync()
  );
  const [activeTab, setActiveTab] = useState<'generator' | 'documents' | 'analytics'>(
    'generator'
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

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('nbe_theme') as 'dark' | 'light') || 'dark';
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nbe_theme', theme);
  }, [theme]);

  // Load from IndexedDB on initial mount
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

  // Handlers for documents
  const handleSaveDocument = async (newDoc: DocumentRecord) => {
    const updated = await saveDocument(newDoc);
    setDocuments(updated);
  };

  const handleUpdateDocument = async (updatedDoc: DocumentRecord) => {
    const updated = await saveDocument(updatedDoc);
    setDocuments(updated);
    if (viewingDoc && viewingDoc.id === updatedDoc.id) {
      setViewingDoc(updatedDoc);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    const updated = await deleteDocument(id);
    setDocuments(updated);
    if (viewingDoc && viewingDoc.id === id) {
      setViewingDoc(null);
    }
  };

  const handleRestoreDocuments = async (restoredDocs: DocumentRecord[]) => {
    await saveAllDocuments(restoredDocs);
    setDocuments(restoredDocs);
  };

  const handleSaveDriveSettings = (settings: GoogleDriveSettings) => {
    saveGoogleDriveSettings(settings);
    setDriveSettings(settings);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documentCount={documents.length}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenPdfGuide={() => setIsPdfGuideOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Tab Content */}
      <main style={{ flex: 1 }}>
        {activeTab === 'generator' && (
          <DocumentGenerator
            documents={documents}
            onSaveDocument={handleSaveDocument}
            driveSettings={driveSettings}
            onNavigateToDocuments={() => setActiveTab('documents')}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentList
            documents={documents}
            onViewDocument={(doc) => setViewingDoc(doc)}
            onEditDocument={(doc) => setEditingDoc(doc)}
            onDeleteDocument={handleDeleteDocument}
            onNavigateToGenerator={() => setActiveTab('generator')}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            documents={documents}
            onNavigateToGenerator={() => setActiveTab('generator')}
            onFilterByType={() => setActiveTab('documents')}
          />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '1.5rem 0',
          background: 'var(--bg-secondary)',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <strong>PT Nirwana Bhumi Energi</strong> — Integrated Management Systems (IMS)
            <div style={{ marginTop: '0.2rem', color: 'var(--text-secondary)' }}>
              Prosedur Pengendalian Dokumen & Rekaman (0001-SOP-GNR-CEO-IX-2026)
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <span>Database: Persisten & Cloud Ready</span>
            <span>•</span>
            <span>Penomoran Unik 1-Kode-1-Dokumen</span>
          </div>
        </div>
      </footer>

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
