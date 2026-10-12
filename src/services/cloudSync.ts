import { DocumentRecord, MasterCodesState, ActivityLog } from '../types';
import {
  fetchDatabaseFromCloudBot,
  saveDocumentToCloudBot,
  deleteDocumentRecordFromCloudBot,
  syncAllToCloudBot,
} from './googleDriveBot';
import {
  getGoogleDriveSettings,
  saveAllDocuments,
  loadDocuments,
} from './storage';
import { getMasterCodes, saveMasterCodes } from './masterCodes';
import { loadActivityLogs, saveActivityLogs } from './activityLogs';

/**
 * Dapatkan URL Webhook Bot aktif yang dapat digunakan oleh seluruh device
 */
export function getActiveCloudWebhookUrl(): string {
  try {
    const settings = getGoogleDriveSettings();
    if (settings && settings.botWebhookUrl && settings.botWebhookUrl.startsWith('https://script.google.com')) {
      return settings.botWebhookUrl.trim();
    }
  } catch (e) {
    console.warn('Error reading local gdrive settings:', e);
  }

  // Fallback ke environment variable build-time jika disetel di Vercel / .env
  const envUrl = (import.meta.env.VITE_BOT_WEBHOOK_URL as string) || '';
  if (envUrl && envUrl.startsWith('https://script.google.com')) {
    return envUrl.trim();
  }

  return '';
}

export interface CloudSyncState {
  isConfigured: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  cloudDocumentCount: number;
  lastError: string | null;
}

/**
 * Tarik data terbaru dari Cloud Google Drive dan gabungkan dengan cache lokal
 */
export async function syncFromCloud(): Promise<{
  success: boolean;
  documents?: DocumentRecord[];
  masterCodes?: MasterCodesState;
  activityLogs?: ActivityLog[];
  count?: number;
  error?: string;
}> {
  const webhookUrl = getActiveCloudWebhookUrl();
  if (!webhookUrl) {
    return {
      success: false,
      error: 'URL Webhook Bot Google Drive belum terpasang',
    };
  }

  try {
    const res = await fetchDatabaseFromCloudBot(webhookUrl);
    if (!res.success || !res.documents) {
      return { success: false, error: res.error || 'Gagal mengambil data dari bot' };
    }

    const cloudDocs: DocumentRecord[] = res.documents;

    // Jika cloud memiliki dokumen, perbarui database lokal agar sinkron
    if (Array.isArray(cloudDocs) && cloudDocs.length > 0) {
      await saveAllDocuments(cloudDocs);
    }

    // Jika cloud memiliki master codes kategori
    if (res.masterCodes && typeof res.masterCodes === 'object') {
      try {
        saveMasterCodes(res.masterCodes);
      } catch (errCode) {
        console.warn('Failed to update local master codes from cloud:', errCode);
      }
    }

    // Jika cloud memiliki riwayat log aktivitas
    if (Array.isArray(res.activityLogs) && res.activityLogs.length > 0) {
      try {
        saveActivityLogs(res.activityLogs);
      } catch (errLogs) {
        console.warn('Failed to update local activity logs from cloud:', errLogs);
      }
    }

    return {
      success: true,
      documents: cloudDocs,
      masterCodes: res.masterCodes,
      activityLogs: res.activityLogs,
      count: cloudDocs.length,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Koneksi cloud bermasalah' };
  }
}

/**
 * Unggah atau perbarui 1 dokumen ke Cloud Google Drive secara background
 */
export async function pushDocumentToCloud(doc: DocumentRecord): Promise<boolean> {
  const webhookUrl = getActiveCloudWebhookUrl();
  if (!webhookUrl) return false;

  try {
    const res = await saveDocumentToCloudBot(doc, webhookUrl);
    return res.success;
  } catch (e) {
    console.error('Failed pushing document to cloud:', e);
    return false;
  }
}

/**
 * Hapus 1 dokumen dari Cloud Google Drive
 */
export async function removeDocumentFromCloud(id: string, code: string): Promise<boolean> {
  const webhookUrl = getActiveCloudWebhookUrl();
  if (!webhookUrl) return false;

  try {
    const res = await deleteDocumentRecordFromCloudBot(id, code, webhookUrl);
    return res.success;
  } catch (e) {
    console.error('Failed deleting document from cloud:', e);
    return false;
  }
}

/**
 * Unggah seluruh data lokal saat ini ke Cloud Database (Push All)
 */
export async function pushAllLocalDataToCloud(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const webhookUrl = getActiveCloudWebhookUrl();
  if (!webhookUrl) {
    return {
      success: false,
      error: 'URL Webhook Bot Google Drive belum disetel. Buka Pengaturan Google Drive.',
    };
  }

  try {
    const docs = await loadDocuments();
    const codes = getMasterCodes();
    const logs = loadActivityLogs();

    const res = await syncAllToCloudBot(docs, codes, logs, webhookUrl);
    return res;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Inisialisasi Real-Time Polling & Event Listener untuk Sinkronisasi Antar-Perangkat
 */
export function setupRealtimeSync(callbacks: {
  onDocumentsUpdated: (docs: DocumentRecord[]) => void;
  onMasterCodesUpdated?: (codes: MasterCodesState) => void;
  onSyncStatusChanged?: (status: CloudSyncState) => void;
  intervalMs?: number;
}): () => void {
  const intervalMs = callbacks.intervalMs || 8000;
  let isChecking = false;
  let timerId: any = null;

  const performCheck = async () => {
    const webhookUrl = getActiveCloudWebhookUrl();
    if (!webhookUrl || isChecking) return;

    isChecking = true;
    callbacks.onSyncStatusChanged?.({
      isConfigured: true,
      isSyncing: true,
      lastSyncedAt: null,
      cloudDocumentCount: 0,
      lastError: null,
    });

    try {
      const res = await syncFromCloud();
      if (res.success && res.documents) {
        callbacks.onDocumentsUpdated(res.documents);
        if (res.masterCodes && callbacks.onMasterCodesUpdated) {
          callbacks.onMasterCodesUpdated(res.masterCodes);
        }
        callbacks.onSyncStatusChanged?.({
          isConfigured: true,
          isSyncing: false,
          lastSyncedAt: new Date(),
          cloudDocumentCount: res.count || res.documents.length,
          lastError: null,
        });
      } else {
        callbacks.onSyncStatusChanged?.({
          isConfigured: true,
          isSyncing: false,
          lastSyncedAt: null,
          cloudDocumentCount: 0,
          lastError: res.error || null,
        });
      }
    } catch (err: any) {
      callbacks.onSyncStatusChanged?.({
        isConfigured: true,
        isSyncing: false,
        lastSyncedAt: null,
        cloudDocumentCount: 0,
        lastError: err.message,
      });
    } finally {
      isChecking = false;
    }
  };

  // Jalankan segera saat pertama kali dimuat
  performCheck();

  // Polling interval berkala
  timerId = setInterval(performCheck, intervalMs);

  // Trigger sinkronisasi instan saat user membuka kembali tab / browser (misal dari HP atau switch window)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      performCheck();
    }
  };

  const handleWindowFocus = () => {
    performCheck();
  };

  window.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleWindowFocus);

  // Return cleanup function
  return () => {
    if (timerId) clearInterval(timerId);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleWindowFocus);
  };
}
