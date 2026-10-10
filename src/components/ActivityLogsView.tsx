import React, { useState } from 'react';
import {
  History,
  Search,
  Download,
  Trash2,
} from 'lucide-react';
import { ActivityLog } from '../types';

interface ActivityLogsViewProps {
  logs: ActivityLog[];
  onClearLogs?: () => void;
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({ logs, onClearLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.documentCode && log.documentCode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'ALL' || log.type === filterType;
    return matchesSearch && matchesType;
  });

  const getLogBadge = (type: ActivityLog['type']) => {
    switch (type) {
      case 'create':
        return <span className="badge badge-success">Diterbitkan</span>;
      case 'update':
        return <span className="badge badge-warning">Diperbarui</span>;
      case 'delete':
        return <span className="badge badge-danger">Dihapus</span>;
      case 'export':
        return <span className="badge badge-blue">Ekspor Data</span>;
      case 'system':
      default:
        return <span className="badge badge-purple">Sistem</span>;
    }
  };

  const exportLogsToCSV = () => {
    const headers = ['Waktu', 'Pengguna', 'Jabatan', 'Tipe', 'Aksi', 'Kode Dokumen', 'Detail'];
    const rows = logs.map((l) => [
      `"${new Date(l.timestamp).toLocaleString('id-ID')}"`,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.type}"`,
      `"${l.action}"`,
      `"${l.documentCode || '-'}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nbe-log-aktivitas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          margin: '1.75rem 0 1.25rem 0',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
            }}
          >
            <History color="var(--primary)" size={26} />
            Log Aktivitas & Jejak Audit Sistem
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
            Riwayat lengkap pencatatan, penomoran, pengubahan kode, serta distribusi dokumen PT Nirwana Bhumi Energi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportLogsToCSV} className="btn btn-secondary btn-sm">
            <Download size={14} />
            <span>Ekspor Log CSV</span>
          </button>
          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="btn btn-danger btn-sm"
              title="Bersihkan Semua Log"
            >
              <Trash2 size={14} />
              <span>Bersihkan Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <div style={{ position: 'relative', gridColumn: 'span 2' }}>
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari aksi, nama staf, atau kode dokumen..."
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="form-select"
            >
              <option value="ALL">Semua Tipe Aktivitas</option>
              <option value="create">Penerbitan Dokumen (Create)</option>
              <option value="update">Perubahan Kode / Data (Update)</option>
              <option value="export">Ekspor Database (Export)</option>
              <option value="system">Aktivitas Sistem</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                background: 'rgba(0,0,0,0.15)',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.04em',
              }}
            >
              <th style={{ padding: '0.85rem 1rem' }}>Waktu & Tanggal</th>
              <th style={{ padding: '0.85rem 1rem' }}>Pengguna (User)</th>
              <th style={{ padding: '0.85rem 1rem' }}>Aksi</th>
              <th style={{ padding: '0.85rem 1rem' }}>Kode Dokumen Terkait</th>
              <th style={{ padding: '0.85rem 1rem' }}>Rincian Aktivitas</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {/* Waktu */}
                <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {new Date(log.timestamp).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}{' '}
                    WIB
                  </div>
                </td>

                {/* User */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.userName}</div>
                  <span className="badge badge-blue" style={{ fontSize: '0.68rem', marginTop: '0.2rem' }}>
                    {log.userRole}
                  </span>
                </td>

                {/* Aksi & Badge */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{log.action}</div>
                  {getLogBadge(log.type)}
                </td>

                {/* Kode Dokumen */}
                <td style={{ padding: '0.85rem 1rem' }}>
                  {log.documentCode ? (
                    <span
                      className="mono"
                      style={{
                        fontWeight: 700,
                        color: 'var(--primary)',
                        background: 'rgba(0,0,0,0.25)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                      }}
                    >
                      {log.documentCode}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>
                  )}
                </td>

                {/* Rincian */}
                <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', maxWidth: '350px' }}>
                  {log.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
