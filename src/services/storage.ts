import { DocumentRecord } from '../types';

const STORAGE_KEY = 'nbe_documents_db_v1';
const DRIVE_SETTINGS_KEY = 'nbe_gdrive_config';

export interface GoogleDriveSettings {
  folderUrl: string;
  folderId?: string;
  driveDatabaseSheetUrl?: string;
  autoOpenDriveOnUpload: boolean;
  botWebhookUrl?: string;
}

export const DEFAULT_DRIVE_SETTINGS: GoogleDriveSettings = {
  folderUrl:
    'https://drive.google.com/drive/folders/1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF?usp=sharing',
  folderId: '1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF',
  driveDatabaseSheetUrl: '',
  autoOpenDriveOnUpload: true,
  botWebhookUrl: '',
};

// Initial Seed Document based on the PDF in the folder
export const INITIAL_SEED_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'seed-0001-sop-gnr-ceo-ix-2026',
    code: '0001-SOP-GNR-CEO-IX-2026',
    seqNumber: 1,
    typeCode: 'SOP',
    divisionCode: 'GNR',
    approverCode: 'CEO',
    monthRoman: 'IX',
    year: 2026,
    title: 'DOCUMENTS AND RECORDS CONTROL PROCEDURE',
    description:
      'Prosedur pengendalian dokumen dan rekaman Sistem Manajemen Terintegrasi PT Nirwana Bhumi Energi.',
    revision: 0,
    status: 'Published',
    createdBy: 'Abdul Q',
    approvedBy: 'President Director (CEO)',
    verifiedBy: 'Management Representative (MR)',
    issueDate: '2026-09-14',
    fileName: '0001-SOP-GNR-CEO-IX-2026.pdf',
    fileSize: 852122,
    fileType: 'application/pdf',
    fileUrl: '/0001-SOP-GNR-CEO-IX-2026.pdf',
    googleDriveLink:
      'https://drive.google.com/drive/folders/1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF?usp=sharing',
    revisions: [
      {
        revision: 0,
        date: '14 Sept 2026',
        description: 'Initial Issue',
        revisedBy: 'Abdul Q',
      },
    ],
    createdAt: '2026-09-14T08:00:00.000Z',
    updatedAt: '2026-09-14T08:00:00.000Z',
  },
];

/* =========================================================================
   IndexedDB Storage for Large Files & Records
   ========================================================================= */
const IDB_NAME = 'NBE_DocumentManagementDB';
const IDB_VERSION = 1;
const IDB_STORE_NAME = 'documents_store';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load all documents from localStorage first, then IndexedDB
 */
export async function loadDocuments(): Promise<DocumentRecord[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        let docs: DocumentRecord[] = request.result || [];
        if (docs.length === 0) {
          // Check localStorage fallback
          const localData = localStorage.getItem(STORAGE_KEY);
          if (localData) {
            try {
              docs = JSON.parse(localData);
            } catch (e) {
              console.error('Error parsing local storage:', e);
            }
          }
        }

        if (docs.length === 0) {
          docs = [...INITIAL_SEED_DOCUMENTS];
          saveAllDocuments(docs);
        }

        resolve(docs);
      };

      request.onerror = () => {
        // Fallback to localStorage
        const local = localStorage.getItem(STORAGE_KEY);
        resolve(local ? JSON.parse(local) : [...INITIAL_SEED_DOCUMENTS]);
      };
    });
  } catch (error) {
    console.warn('IndexedDB unavailable, falling back to LocalStorage:', error);
    const local = localStorage.getItem(STORAGE_KEY);
    return local ? JSON.parse(local) : [...INITIAL_SEED_DOCUMENTS];
  }
}

/**
 * Synchronous read from LocalStorage for instantaneous UI boot
 */
export function getStoredDocumentsSync(): DocumentRecord[] {
  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      return JSON.parse(local);
    }
  } catch (e) {
    console.error('Failed reading sync localStorage', e);
  }
  return [...INITIAL_SEED_DOCUMENTS];
}

/**
 * Save all documents to both IndexedDB and LocalStorage
 */
export async function saveAllDocuments(docs: DocumentRecord[]): Promise<void> {
  // 1. Save to LocalStorage (without heavy base64 to prevent quota error)
  try {
    const lightweightDocs = docs.map((doc) => {
      // Don't store large base64 data in localStorage to stay under 5MB limit
      if (doc.fileData && doc.fileData.length > 50000) {
        const { fileData: _omit, ...rest } = doc;
        return rest;
      }
      return doc;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweightDocs));
  } catch (e) {
    console.warn('LocalStorage quota warning, data kept in IndexedDB', e);
  }

  // 2. Save full records (including fileData) into IndexedDB
  try {
    const db = await openDatabase();
    const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(IDB_STORE_NAME);

    // Clear existing
    store.clear();

    // Insert all
    for (const doc of docs) {
      store.put(doc);
    }
  } catch (err) {
    console.error('Failed saving to IndexedDB:', err);
  }
}

/**
 * Save or update a single document
 */
export async function saveDocument(newDoc: DocumentRecord): Promise<DocumentRecord[]> {
  const currentDocs = await loadDocuments();
  const index = currentDocs.findIndex((d) => d.id === newDoc.id);

  let updatedDocs: DocumentRecord[];
  if (index >= 0) {
    updatedDocs = [...currentDocs];
    updatedDocs[index] = { ...newDoc, updatedAt: new Date().toISOString() };
  } else {
    updatedDocs = [
      { ...newDoc, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ...currentDocs,
    ];
  }

  await saveAllDocuments(updatedDocs);
  return updatedDocs;
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(id: string): Promise<DocumentRecord[]> {
  const currentDocs = await loadDocuments();
  const updatedDocs = currentDocs.filter((d) => d.id !== id);
  await saveAllDocuments(updatedDocs);
  return updatedDocs;
}

/* =========================================================================
   Google Drive Configuration Storage
   ========================================================================= */
export function getGoogleDriveSettings(): GoogleDriveSettings {
  try {
    const saved = localStorage.getItem(DRIVE_SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_DRIVE_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error reading Google Drive settings:', e);
  }
  return DEFAULT_DRIVE_SETTINGS;
}

export function saveGoogleDriveSettings(settings: GoogleDriveSettings): void {
  localStorage.setItem(DRIVE_SETTINGS_KEY, JSON.stringify(settings));
}

/* =========================================================================
   Export & Backup Utilities
   ========================================================================= */

/**
 * Export all documents to JSON backup file
 */
export function exportToJSON(documents: DocumentRecord[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(documents, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `nbe-surat-database-backup-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Export all documents to CSV (compatible with Excel & Google Sheets/Google Drive)
 */
export function exportToCSV(documents: DocumentRecord[]): void {
  const headers = [
    'Kode Dokumen',
    'Judul Dokumen',
    'Kategori (Type)',
    'Divisi',
    'Penyetuju (Approver)',
    'Nomor Urut',
    'Revisi',
    'Status',
    'Tanggal Terbit',
    'Dibuat Oleh',
    'Disetujui Oleh',
    'Nama File',
    'Ukuran File (Bytes)',
    'Link Google Drive',
    'Catatan / Riwayat',
  ];

  const escapeCSV = (str: string | number | undefined) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = documents.map((doc) => [
    escapeCSV(doc.code),
    escapeCSV(doc.title),
    escapeCSV(doc.typeCode),
    escapeCSV(doc.divisionCode),
    escapeCSV(doc.approverCode),
    escapeCSV(doc.seqNumber),
    escapeCSV(doc.revision),
    escapeCSV(doc.status),
    escapeCSV(doc.issueDate),
    escapeCSV(doc.createdBy),
    escapeCSV(doc.approvedBy || ''),
    escapeCSV(doc.fileName || ''),
    escapeCSV(doc.fileSize || 0),
    escapeCSV(doc.googleDriveLink || ''),
    escapeCSV(doc.description || ''),
  ]);

  const csvContent =
    '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `nbe-database-dokumen-${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
