import { ActivityLog } from '../types';

const LOGS_STORAGE_KEY = 'nbe_activity_logs_v1';

export const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-09-14T08:00:00.000Z',
    userName: 'Abdul Q',
    userRole: 'Staff IMS',
    action: 'Penerbitan Dokumen',
    details: 'Menerbitkan dokumen 0001-SOP-GNR-CEO-IX-2026 (DOCUMENTS AND RECORDS CONTROL PROCEDURE)',
    documentCode: '0001-SOP-GNR-CEO-IX-2026',
    type: 'create',
  },
  {
    id: 'log-2',
    timestamp: '2026-10-03T16:00:00.000Z',
    userName: 'Mazmur Gusti Agung Larosa',
    userRole: 'Direktur Keuangan',
    action: 'Inisialisasi Sistem',
    details: 'Mengaktifkan Sistem Penomoran & Kontrol Dokumen Digital NBE',
    type: 'system',
  },
];

export function loadActivityLogs(): ActivityLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed reading activity logs:', e);
  }
  return INITIAL_LOGS;
}

export function saveActivityLogs(logs: ActivityLog[]): void {
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed saving activity logs:', e);
  }
}

export function addActivityLog(log: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog[] {
  const current = loadActivityLogs();
  const newLog: ActivityLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [newLog, ...current];
  saveActivityLogs(updated);
  return updated;
}
