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

  return 'https://script.google.com/macros/s/AKfycbweEADkAMfpyBXO4j1dBqPTACdrjkR5Pke90h9YxNRGchvA25xP_6JKXHl8e5LPd6bT/exec';
}

export interface CloudSyncState {
  isConfigured: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  cloudDocumentCount: number;
  lastError: string | null;
}

/**
 * Smart Two-Way Merge antara data dokumen Lokal dan Cloud
 * Memastikan tidak ada data yang terhapus secara sepihak
 */
export function mergeDocuments(
  localDocs: DocumentRecord[],
  cloudDocs: DocumentRecord[]
): {
  merged: DocumentRecord[];
  needsCloudPush: boolean;
} {
  const safeLocal = Array.isArray(localDocs) ? localDocs : [];
  const safeCloud = Array.isArray(cloudDocs) ? cloudDocs : [];

  // Jika cloud kosong tapi lokal memiliki dokumen -> JANGAN HAPUS LOKAL!
  if (safeCloud.length === 0 && safeLocal.length > 0) {
    return {
      merged: [...safeLocal],
      needsCloudPush: true,
    };
  }

  // Jika lokal kosong tapi cloud memiliki dokumen -> gunakan cloud
  if (safeLocal.length === 0 && safeCloud.length > 0) {
    return {
      merged: [...safeCloud],
      needsCloudPush: false,
    };
  }

  if (safeLocal.length === 0 && safeCloud.length === 0) {
    return {
      merged: [],
      needsCloudPush: false,
    };
  }

  const map = new Map<string, DocumentRecord>();
  let needsPush = false;

  // 1. Masukkan semua data dari cloud ke Map
  for (const cDoc of safeCloud) {
    if (!cDoc) continue;
    const key = (cDoc.code || cDoc.id || '').trim().toUpperCase();
    if (key) {
      map.set(key, cDoc);
    }
  }

  // 2. Gabungkan data lokal
  for (const lDoc of safeLocal) {
    if (!lDoc) continue;
    const key = (lDoc.code || lDoc.id || '').trim().toUpperCase();
    if (!key) continue;

    const existing = map.get(key);
    if (!existing) {
      // Ada di lokal tapi belum ada di cloud -> pertahankan dan push ke cloud!
      map.set(key, lDoc);
      needsPush = true;
    } else {
      // Ada di kedua tempat -> bandingkan versi terbaru
      const lTime = new Date(lDoc.updatedAt || lDoc.createdAt || 0).getTime();
      const cTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const lRev = typeof lDoc.revision === 'number' ? lDoc.revision : 0;
      const cRev = typeof existing.revision === 'number' ? existing.revision : 0;

      // Jaga kelengkapan data file (base64) jika ada di lokal
      const preferredFileData = lDoc.fileData || existing.fileData;

      if (lRev > cRev || (lRev === cRev && lTime >= cTime)) {
        map.set(key, { ...existing, ...lDoc, fileData: preferredFileData });
        if (lRev > cRev || lTime > cTime) {
          needsPush = true;
        }
      } else {
        map.set(key, { ...lDoc, ...existing, fileData: preferredFileData });
      }
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const tA = new Date(a.createdAt || a.issueDate || 0).getTime();
    const tB = new Date(b.createdAt || b.issueDate || 0).getTime();
    return tB - tA;
  });

  return {
    merged,
    needsCloudPush: needsPush,
  };
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
    if (!res.success) {
      return { success: false, error: res.error || 'Gagal mengambil data dari bot' };
    }

    // Ambil dokumen lokal yang sedang tersimpan
    const localDocs = await loadDocuments();
    const cloudDocs: DocumentRecord[] = Array.isArray(res.documents) ? res.documents : [];

    // Lakukan Smart Two-Way Merge
    const { merged, needsCloudPush } = mergeDocuments(localDocs, cloudDocs);

    // Simpan hasil merge ke storage lokal jika ada dokumen
    if (merged.length > 0) {
      await saveAllDocuments(merged);
    }

    // Jika cloud masih kosong atau ada data lokal yang belum masuk ke cloud,
    // segera unggah data lokal ke Google Drive agar sinkron dan permanen!
    if (needsCloudPush && merged.length > 0) {
      pushAllLocalDataToCloud().catch((pushErr) => {
        console.warn('Auto-push local documents to cloud failed:', pushErr);
      });
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
      documents: merged,
      masterCodes: res.masterCodes,
      activityLogs: res.activityLogs,
      count: merged.length,
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
        if (res.documents.length > 0) {
          callbacks.onDocumentsUpdated(res.documents);
        }
        if (res.masterCodes && callbacks.onMasterCodesUpdated) {
          callbacks.onMasterCodesUpdated(res.masterCodes);
        }
        callbacks.onSyncStatusChanged?.({
          isConfigured: true,
          isSyncing: false,
          lastSyncedAt: new Date(),
          cloudDocumentCount: res.count ?? res.documents.length,
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
