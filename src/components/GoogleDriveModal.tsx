import React, { useState } from 'react';
import {
  X,
  HardDrive,
  ExternalLink,
  Save,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Bot,
  Copy,
  Check,
  Code2,
  Sparkles,
  Zap,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { GoogleDriveSettings, exportToCSV } from '../services/storage';
import { DocumentRecord } from '../types';
import {
  GOOGLE_APPS_SCRIPT_BOT_CODE,
  TARGET_FOLDER_ID,
  TARGET_FOLDER_URL,
  testBotConnection,
} from '../services/googleDriveBot';

interface GoogleDriveModalProps {
  settings: GoogleDriveSettings;
  onSaveSettings: (settings: GoogleDriveSettings) => void;
  onClose: () => void;
  documents: DocumentRecord[];
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  settings: initialSettings,
  onSaveSettings,
  onClose,
  documents,
}) => {
  const [folderUrl, setFolderUrl] = useState(
    initialSettings.folderUrl || TARGET_FOLDER_URL
  );
  const [botWebhookUrl, setBotWebhookUrl] = useState(
    initialSettings.botWebhookUrl || ''
  );
  const [driveDatabaseSheetUrl, setDriveDatabaseSheetUrl] = useState(
    initialSettings.driveDatabaseSheetUrl || ''
  );
  const [autoOpen, setAutoOpen] = useState(initialSettings.autoOpenDriveOnUpload);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'botScript'>('settings');

  // Test connection state
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    botName?: string;
  } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      folderUrl: folderUrl.trim() || TARGET_FOLDER_URL,
      folderId: TARGET_FOLDER_ID,
      botWebhookUrl: botWebhookUrl.trim(),
      driveDatabaseSheetUrl: driveDatabaseSheetUrl.trim() || undefined,
      autoOpenDriveOnUpload: autoOpen,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_BOT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleTestBot = async () => {
    if (!botWebhookUrl.trim()) {
      setTestResult({
        success: false,
        message: 'Masukkan URL Webhook terlebih dahulu sebelum menguji koneksi.',
      });
      return;
    }
    setIsTestingBot(true);
    setTestResult(null);
    const result = await testBotConnection(botWebhookUrl.trim());
    setTestResult(result);
    setIsTestingBot(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-fade-in"
        style={{ maxWidth: '780px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-tertiary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Bot size={22} color="#38bdf8" />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                Akun Bot & Integrasi Google Drive NBE
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Target Folder ID: <code className="mono">{TARGET_FOLDER_ID}</code>
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.35rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
            padding: '0.5rem 1.75rem 0 1.75rem',
            gap: '0.5rem',
          }}
        >
          <button
            onClick={() => setActiveTab('settings')}
            className={`btn btn-sm ${
              activeTab === 'settings' ? 'btn-primary' : 'btn-ghost'
            }`}
            style={{ borderRadius: '6px 6px 0 0' }}
          >
            <HardDrive size={14} />
            Pengaturan & Webhook Bot
          </button>
          <button
            onClick={() => setActiveTab('botScript')}
            className={`btn btn-sm ${
              activeTab === 'botScript' ? 'btn-primary' : 'btn-ghost'
            }`}
            style={{ borderRadius: '6px 6px 0 0' }}
          >
            <Code2 size={14} />
            Kode Script Bot Google Drive
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.75rem' }}>
          {activeTab === 'settings' && (
            <>
              {/* Target Folder Banner */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.9rem' }}>
                    📁 Folder Target Google Drive Aktif
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      marginTop: '0.2rem',
                      wordBreak: 'break-all',
                    }}
                  >
                    {TARGET_FOLDER_URL}
                  </div>
                </div>
                <a
                  href={TARGET_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  <ExternalLink size={14} />
                  <span>Buka Folder Drive</span>
                </a>
              </div>

              {/* Form */}
              <form onSubmit={handleSave}>
                {/* Bot Webhook URL with Test Button */}
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Bot size={15} />
                      URL Webhook Bot Google Drive (Google Apps Script Web App)
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('botScript')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Lihat Script Bot & Panduan
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="url"
                      value={botWebhookUrl}
                      onChange={(e) => {
                        setBotWebhookUrl(e.target.value);
                        setTestResult(null);
                      }}
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      className="form-input mono"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleTestBot}
                      disabled={isTestingBot || !botWebhookUrl.trim()}
                      className="btn btn-secondary btn-sm"
                      style={{ flexShrink: 0 }}
                      title="Uji apakah bot Google Apps Script dapat dihubungi"
                    >
                      {isTestingBot ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Menguji...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={14} color="#f59e0b" />
                          <span>Tes Koneksi</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Test result feedback */}
                  {testResult && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${testResult.success ? 'var(--success)' : 'var(--danger)'}`,
                        color: testResult.success ? 'var(--success)' : '#fca5a5',
                      }}
                    >
                      {testResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    Saat Anda menekan tombol "🤖 Upload ke Google Drive via Bot", dokumen langsung terkirim otomatis ke folder Google Drive resmi perusahaan!
                  </span>
                </div>

                {/* Folder URL */}
                <div className="form-group">
                  <label className="form-label">Link Folder Google Drive</label>
                  <input
                    type="url"
                    required
                    value={folderUrl}
                    onChange={(e) => setFolderUrl(e.target.value)}
                    className="form-input"
                  />
                </div>

                {/* Google Sheets Link */}
                <div className="form-group">
                  <label className="form-label">Link Spreadsheet Rekapitulasi (Opsional)</label>
                  <input
                    type="url"
                    value={driveDatabaseSheetUrl}
                    onChange={(e) => setDriveDatabaseSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="form-input"
                  />
                </div>

                {/* Auto open toggle */}
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <input
                    type="checkbox"
                    id="autoOpen"
                    checked={autoOpen}
                    onChange={(e) => setAutoOpen(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="autoOpen" style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                    Otomatis tampilkan panduan Google Drive saat upload dokumen
                  </label>
                </div>

                {savedSuccess && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--success-bg)',
                      border: '1px solid var(--success)',
                      color: 'var(--success)',
                      fontSize: '0.85rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Pengaturan Bot & Google Drive berhasil disimpan!</span>
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1.5rem' }}>
                  <Save size={16} />
                  <span>Simpan Konfigurasi Bot</span>
                </button>
              </form>

              {/* Export to CSV Action */}
              <div
                style={{
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                    Ekspor Database Surat ke Google Drive
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Unduh file CSV database seluruh ({documents.length}) surat yang siap di-drop ke folder Google Drive.
                  </p>
                </div>
                <button
                  onClick={() => exportToCSV(documents)}
                  className="btn btn-secondary btn-sm"
                >
                  <FileSpreadsheet size={15} color="#10b981" />
                  <span>Unduh Database CSV</span>
                </button>
              </div>
            </>
          )}

          {activeTab === 'botScript' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                    Script Bot Google Apps Script (Auto-Upload ke Drive)
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Pasang script ini di akun Google Anda agar bot dapat menerima upload dokumen secara otomatis.
                  </p>
                </div>
                <button onClick={handleCopyScript} className="btn btn-primary btn-sm">
                  {copiedScript ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedScript ? 'Tersalin!' : 'Salin Script Bot'}</span>
                </button>
              </div>

              {/* Instructions Steps */}
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1rem',
                  fontSize: '0.825rem',
                  lineHeight: 1.6,
                }}
              >
                <strong>Cara Pasang Bot dalam 1 Menit:</strong>
                <ol style={{ paddingLeft: '1.25rem', marginTop: '0.4rem' }}>
                  <li>
                    Buka{' '}
                    <a
                      href="https://script.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                    >
                      script.google.com
                    </a>{' '}
                    dan klik <strong>Proyek Baru</strong>.
                  </li>
                  <li>Hapus kode bawaan, lalu <strong>Paste</strong> seluruh kode di bawah ini.</li>
                  <li>
                    Klik <strong>Deploy (Terapkan)</strong> &gt; <strong>Deployment Baru</strong>.
                  </li>
                  <li>
                    Pilih tipe: <strong>Aplikasi Web</strong> (Web app).
                  </li>
                  <li>
                    Setelan akses:
                    <br />
                    • <em>Execute as:</em> <strong>Me (Saya)</strong>
                    <br />
                    • <em>Who has access:</em> <strong>Anyone (Siapa saja)</strong>
                  </li>
                  <li>Klik <strong>Deploy</strong>, izinkan akses Google Drive, dan <strong>Salin URL Aplikasi Web</strong>.</li>
                  <li>Kembali ke tab <em>Pengaturan & Webhook Bot</em> di aplikasi ini, lalu paste link tersebut!</li>
                </ol>
              </div>

              {/* Code display */}
              <div
                style={{
                  background: '#0a0f1d',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  maxHeight: '300px',
                  overflowY: 'auto',
                }}
              >
                <pre className="mono" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {GOOGLE_APPS_SCRIPT_BOT_CODE}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
