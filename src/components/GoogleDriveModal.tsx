import React, { useState } from 'react';
import {
  X,
  HardDrive,
  ExternalLink,
  Save,
  FileSpreadsheet,
  CheckCircle2,
  Bot,
  Copy,
  Check,
  Code2,
  Zap,
  Loader2,
  AlertCircle,
  FolderPlus,
  Cloud,
  UploadCloud,
  FolderArchive,
} from 'lucide-react';
import {
  GoogleDriveSettings,
  exportToCSV,
  getStoredDocumentsSync,
} from '../services/storage';
import { DocumentRecord, CodeDefinition } from '../types';
import {
  TARGET_FOLDER_URL,
  extractDriveFolderId,
  formatDriveFolderUrl,
  getGoogleAppsScriptBotCode,
  testBotConnection,
  syncAllCategoriesToDriveViaBot,
  organizeTxtFilesInDriveViaBot,
} from '../services/googleDriveBot';
import { pushAllLocalDataToCloud } from '../services/cloudSync';

interface GoogleDriveModalProps {
  settings: GoogleDriveSettings;
  onSaveSettings: (settings: GoogleDriveSettings) => void;
  onClose: () => void;
  documents: DocumentRecord[];
  documentTypes?: CodeDefinition[];
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  settings: initialSettings,
  onSaveSettings,
  onClose,
  documents,
  documentTypes = [],
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
  const [copiedPhoneLink, setCopiedPhoneLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'botScript'>('settings');

  // Dynamic folder ID detection
  const detectedFolderId = extractDriveFolderId(folderUrl);
  const effectiveDetectedUrl = formatDriveFolderUrl(folderUrl);
  const activeSavedFolderUrl = initialSettings.folderUrl || TARGET_FOLDER_URL;
  const activeSavedFolderId = initialSettings.folderId || extractDriveFolderId(activeSavedFolderUrl);

  // Test connection state
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    botName?: string;
  } | null>(null);

  // Sync category folders state
  const [isSyncingCategories, setIsSyncingCategories] = useState(false);
  const [syncCategoriesResult, setSyncCategoriesResult] = useState<{
    success: boolean;
    count: number;
    folders: string[];
    error?: string;
  } | null>(null);

  // Cloud Database Sync state
  const [isPushingCloud, setIsPushingCloud] = useState(false);
  const [pushCloudResult, setPushCloudResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Organize TXT registration files state
  const [isOrganizingTxt, setIsOrganizingTxt] = useState(false);
  const [organizeTxtResult, setOrganizeTxtResult] = useState<{
    success: boolean;
    message: string;
    movedCount?: number;
    folderUrl?: string;
  } | null>(null);

  const effectiveDocCount =
    documents && documents.length > 0
      ? documents.length
      : getStoredDocumentsSync().length;

  const handlePushToCloud = async () => {
    if (!botWebhookUrl.trim()) {
      alert('Masukkan URL Webhook Bot terlebih dahulu sebelum melakukan sinkronisasi database cloud.');
      return;
    }
    setIsPushingCloud(true);
    setPushCloudResult(null);
    try {
      const res = await pushAllLocalDataToCloud();
      if (res.success) {
        setPushCloudResult({
          success: true,
          message: `Berhasil mengunggah ${effectiveDocCount} dokumen ke Database Cloud Google Drive! Sekarang seluruh HP & perangkat lain otomatis sinkron real-time.`,
        });
      } else {
        setPushCloudResult({
          success: false,
          message: res.error || 'Gagal mengunggah ke Cloud Google Drive.',
        });
      }
    } catch (err: any) {
      setPushCloudResult({
        success: false,
        message: err.message || 'Terjadi kesalahan jaringan.',
      });
    } finally {
      setIsPushingCloud(false);
    }
  };

  const renderCloudSyncCard = () => (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(16, 185, 129, 0.08))',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h4
            style={{
              fontSize: '0.98rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#38bdf8',
            }}
          >
            <Cloud size={18} />
            Sinkronkan Seluruh Database Lokal ke Cloud (Multi-Device)
          </h4>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginTop: '0.25rem',
              lineHeight: 1.5,
            }}
          >
            Unggah {effectiveDocCount} surat yang ada di perangkat ini ke database Cloud Google Drive (<code>nbe_cloud_database.json</code>).
            Setelah diunggah, seluruh data akan <strong>otomatis muncul dan update real-time di semua HP, laptop, dan komputer lain</strong>!
          </p>
        </div>

        <button
          type="button"
          onClick={handlePushToCloud}
          disabled={isPushingCloud || !botWebhookUrl.trim()}
          className="btn btn-primary"
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          }}
        >
          {isPushingCloud ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Mengunggah ke Cloud...</span>
            </>
          ) : (
            <>
              <UploadCloud size={16} />
              <span>Unggah {effectiveDocCount} Surat ke Cloud Sekarang</span>
            </>
          )}
        </button>
      </div>

      {pushCloudResult && (
        <div
          style={{
            marginTop: '0.85rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: pushCloudResult.success
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${
              pushCloudResult.success ? 'var(--success)' : 'var(--danger)'
            }`,
            color: pushCloudResult.success ? 'var(--success)' : '#fca5a5',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {pushCloudResult.success ? (
            <CheckCircle2 size={17} />
          ) : (
            <AlertCircle size={17} />
          )}
          <span>{pushCloudResult.message}</span>
        </div>
      )}
    </div>
  );

  const handleSyncCategories = async () => {
    if (!botWebhookUrl.trim()) {
      alert('Masukkan URL Webhook Bot terlebih dahulu sebelum melakukan sinkronisasi folder.');
      return;
    }
    setIsSyncingCategories(true);
    setSyncCategoriesResult(null);
    try {
      const targetFolderId = extractDriveFolderId(folderUrl);
      const res = await syncAllCategoriesToDriveViaBot(
        documentTypes,
        botWebhookUrl.trim(),
        targetFolderId
      );
      setSyncCategoriesResult({
        success: res.errors.length === 0,
        count: res.successCount,
        folders: documentTypes.map((t) => `${t.code} - ${t.label}`),
        error: res.errors.length > 0 ? res.errors.join(', ') : undefined,
      });
    } catch (err: unknown) {
      setSyncCategoriesResult({
        success: false,
        count: 0,
        folders: [],
        error: err instanceof Error ? err.message : 'Gagal sinkronisasi folder kategori',
      });
    } finally {
      setIsSyncingCategories(false);
    }
  };

  const handleOrganizeTxtFiles = async () => {
    if (!botWebhookUrl.trim()) {
      alert('Masukkan URL Webhook Bot terlebih dahulu sebelum merapikan file .txt.');
      return;
    }
    setIsOrganizingTxt(true);
    setOrganizeTxtResult(null);
    try {
      const res = await organizeTxtFilesInDriveViaBot(botWebhookUrl.trim());
      if (res.success) {
        setOrganizeTxtResult({
          success: true,
          message:
            res.message ||
            `Berhasil merapikan ${res.movedCount ?? 0} file .txt ke folder Bukti Registrasi Dokumen (TXT)!`,
          movedCount: res.movedCount,
          folderUrl: res.folderUrl,
        });
      } else {
        setOrganizeTxtResult({
          success: false,
          message: res.error || 'Bot Google Drive gagal merapikan file .txt.',
        });
      }
    } catch (err: any) {
      setOrganizeTxtResult({
        success: false,
        message: err.message || 'Terjadi kesalahan jaringan.',
      });
    } finally {
      setIsOrganizingTxt(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedUrl = folderUrl.trim();
    const effectiveFolderId = extractDriveFolderId(cleanedUrl);
    const effectiveFolderUrl = cleanedUrl.startsWith('http')
      ? cleanedUrl
      : formatDriveFolderUrl(effectiveFolderId);

    onSaveSettings({
      folderUrl: effectiveFolderUrl,
      folderId: effectiveFolderId,
      botWebhookUrl: botWebhookUrl.trim(),
      driveDatabaseSheetUrl: driveDatabaseSheetUrl.trim() || undefined,
      autoOpenDriveOnUpload: autoOpen,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCopyScript = () => {
    const currentScript = getGoogleAppsScriptBotCode(folderUrl);
    navigator.clipboard.writeText(currentScript);
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
                Target Folder ID: <code className="mono">{activeSavedFolderId}</code>
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
                  <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <HardDrive size={15} />
                    <span>Folder Target Google Drive Aktif Saat Ini</span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-main)',
                      marginTop: '0.25rem',
                      wordBreak: 'break-all',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {activeSavedFolderUrl}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Folder ID: <code className="mono" style={{ color: '#38bdf8', fontWeight: 700 }}>{activeSavedFolderId}</code>
                  </div>
                </div>
                <a
                  href={activeSavedFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                >
                  <ExternalLink size={14} />
                  <span>Buka Folder Drive</span>
                </a>
              </div>

              {/* Notice when device is offline / webhook not yet set */}
              {!botWebhookUrl.trim() && (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.65rem',
                    fontSize: '0.82rem',
                    color: '#fbbf24',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ lineHeight: 1.5 }}>
                    <strong>Perangkat ini berstatus "Cloud Offline":</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      URL Webhook Bot belum terpasang di perangkat ini. Pilih salah satu cara mudah untuk menghubungkannya:
                      <ol style={{ paddingLeft: '1.1rem', margin: '0.35rem 0 0 0' }}>
                        <li><strong>Cara Tercepat (Otomatis):</strong> Buka laptop utama Anda, klik tombol <em>"Salin Link untuk HP"</em> di modal ini, lalu kirim &amp; buka link tersebut di HP/perangkat ini.</li>
                        <li><strong>Cara Manual:</strong> Tempelkan URL Webhook Bot Google Drive Anda di kolom bawah ini, lalu klik <strong>Simpan Konfigurasi Bot</strong>.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

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

                  {/* Quick Share Link for Mobile / Other Devices */}
                  {botWebhookUrl.trim() && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.65rem 0.85rem',
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', color: '#bae6fd', flex: 1 }}>
                        <strong>Buka di HP atau Komputer Lain:</strong>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          Klik tombol di samping untuk menyalin link instan. Buka di HP, dan HP otomatis terhubung ke cloud tanpa perlu setting manual!
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const origin = window.location.origin;
                          const shareUrl = `${origin}?cloudSync=${encodeURIComponent(botWebhookUrl.trim())}`;
                          navigator.clipboard.writeText(shareUrl);
                          setCopiedPhoneLink(true);
                          setTimeout(() => setCopiedPhoneLink(false), 2500);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        title="Salin tautan ini untuk dikirim via WhatsApp atau dibuka di browser HP"
                      >
                        {copiedPhoneLink ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                        <span>{copiedPhoneLink ? 'Link HP Tersalin!' : 'Salin Link untuk HP'}</span>
                      </button>
                    </div>
                  )}

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'block' }}>
                    Saat Anda menekan tombol "Unggah ke Google Drive via Bot", dokumen langsung terkirim otomatis ke folder Google Drive resmi perusahaan!
                  </span>
                </div>

                {/* Kolom Khusus Ganti Link Google Drive */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-accent, rgba(56, 189, 248, 0.35))',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <label
                      className="form-label"
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        color: '#38bdf8',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                      }}
                    >
                      <HardDrive size={17} />
                      Kolom Ganti Link Folder Google Drive (Target Penyimpanan)
                    </label>

                    {folderUrl.trim() !== TARGET_FOLDER_URL && (
                      <button
                        type="button"
                        onClick={() => setFolderUrl(TARGET_FOLDER_URL)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                        title="Kembalikan link ke folder resmi default PT NBE"
                      >
                        Reset ke Folder Default NBE
                      </button>
                    )}
                  </div>

                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.85rem',
                      lineHeight: 1.5,
                    }}
                  >
                    Paste link folder Google Drive baru yang ingin Anda gunakan di sini. Sistem akan otomatis mendeteksi ID foldernya dan mengarahkan pembuatan folder surat & kategori ke folder baru tersebut.
                  </p>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="url"
                      required
                      value={folderUrl}
                      onChange={(e) => setFolderUrl(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/1ntut9Zjoc8tT5neNR2wUKMCkxlZvoS8U..."
                      className="form-input mono"
                      style={{ flex: 1, fontSize: '0.85rem' }}
                    />
                    <a
                      href={effectiveDetectedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      title="Buka link folder ini di tab baru untuk memastikan folder bisa diakses"
                    >
                      <ExternalLink size={14} />
                      <span>Uji Buka</span>
                    </a>
                  </div>

                  {/* Deteksi ID Folder Live */}
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.08)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#38bdf8' }}>
                      <CheckCircle2 size={15} />
                      <span>ID Folder Terdeteksi:</span>
                      <code
                        className="mono"
                        style={{
                          background: 'rgba(0,0,0,0.25)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                          color: '#bae6fd',
                        }}
                      >
                        {detectedFolderId}
                      </code>
                    </div>

                    {detectedFolderId === activeSavedFolderId ? (
                      <span
                        style={{
                          color: '#10b981',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        ● Aktif & Tersimpan
                      </span>
                    ) : (
                      <span
                        style={{
                          color: '#f59e0b',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <AlertCircle size={14} />
                        <span>Perubahan Belum Disimpan (Klik "Simpan Konfigurasi Bot" di bawah)</span>
                      </span>
                    )}
                  </div>
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
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--success-bg)',
                      border: '1px solid var(--success)',
                      color: 'var(--success)',
                      fontSize: '0.85rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>
                      Pengaturan Bot & Google Drive berhasil disimpan! Folder target aktif: <strong>{detectedFolderId}</strong>
                    </span>
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '1.5rem' }}>
                  <Save size={16} />
                  <span>Simpan Konfigurasi Bot</span>
                </button>
              </form>

              {/* Cloud Database Sync Action (Multi-Device Sync) */}
              {renderCloudSyncCard()}

              {/* Sync Category Folders Action */}
              <div
                style={{
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-subtle)',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8' }}>
                      <FolderPlus size={16} />
                      Sinkronisasi Folder Kategori Surat ke Google Drive
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Bot akan membuat folder terpisah di Google Drive untuk setiap kategori ({documentTypes.length > 0 ? documentTypes.map(t => t.code).join(', ') : 'SOP, WIK, MNL, KB, CSMS'}).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncCategories}
                    disabled={isSyncingCategories || !botWebhookUrl.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
                  >
                    {isSyncingCategories ? (
                      <>
                        <Loader2 size={14} className="spin" />
                        <span>Membuat Folder...</span>
                      </>
                    ) : (
                      <>
                        <FolderPlus size={14} />
                        <span>Sinkronkan {documentTypes.length} Folder Kategori</span>
                      </>
                    )}
                  </button>
                </div>

                {syncCategoriesResult && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: syncCategoriesResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
                      border: `1px solid ${syncCategoriesResult.success ? 'var(--success)' : 'var(--danger)'}`,
                      fontSize: '0.8rem',
                      color: syncCategoriesResult.success ? 'var(--success)' : 'var(--danger)',
                    }}
                  >
                    {syncCategoriesResult.success ? (
                      <div>
                        <strong>Berhasil sinkronisasi {syncCategoriesResult.count} folder kategori di Google Drive:</strong>
                        <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {syncCategoriesResult.folders.map((f, i) => (
                            <span
                              key={i}
                              style={{
                                background: 'rgba(0,0,0,0.15)',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                              }}
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <strong>Gagal membuat folder kategori:</strong> {syncCategoriesResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Kelompokkan & Rapikan File Registrasi (.txt) ke Folder */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(2, 132, 199, 0.06))',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <h4
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        color: '#f59e0b',
                      }}
                    >
                      <FolderArchive size={16} />
                      Kelompokkan File Registrasi (.txt) ke Folder Khusus
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                      Bot akan membuat folder <strong>Bukti Registrasi Dokumen (TXT)</strong> dan otomatis memindahkan seluruh file <code>.txt</code> registrasi yang menumpuk di folder utama agar Google Drive Anda bersih dan rapi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOrganizeTxtFiles}
                    disabled={isOrganizingTxt || !botWebhookUrl.trim()}
                    className="btn btn-primary btn-sm"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                      color: '#ffffff',
                    }}
                  >
                    {isOrganizingTxt ? (
                      <>
                        <Loader2 size={14} className="spin" />
                        <span>Merapikan File .txt...</span>
                      </>
                    ) : (
                      <>
                        <FolderArchive size={14} />
                        <span>Rapikan & Pindahkan File TXT</span>
                      </>
                    )}
                  </button>
                </div>

                {organizeTxtResult && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: organizeTxtResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
                      border: `1px solid ${organizeTxtResult.success ? 'var(--success)' : 'var(--danger)'}`,
                      fontSize: '0.8rem',
                      color: organizeTxtResult.success ? 'var(--success)' : 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {organizeTxtResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>{organizeTxtResult.message}</span>
                    </div>
                    {organizeTxtResult.folderUrl && (
                      <a
                        href={organizeTxtResult.folderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#0284c7' }}
                      >
                        <ExternalLink size={13} />
                        Buka Folder TXT di Drive
                      </a>
                    )}
                  </div>
                )}
              </div>

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
                <strong>Panduan Script Bot Google Apps Script:</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ background: 'rgba(56, 189, 248, 0.06)', padding: '0.85rem', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                    <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                      Pembaruan Bot yang Sudah Ada:
                    </div>
                    <ol style={{ paddingLeft: '1.15rem', margin: 0, fontSize: '0.8rem', lineHeight: 1.6 }}>
                      <li>Buka proyek bot Anda di{' '}
                        <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                          script.google.com
                        </a>.
                      </li>
                      <li>Hapus semua kode lama, lalu <strong>Paste</strong> seluruh kode script terbaru di bawah ini.</li>
                      <li>Klik menu <strong>Deploy (Terapkan)</strong> &gt; pilih <strong>Kelola deployment (Manage deployments)</strong>.</li>
                      <li>Klik ikon <strong>Pensil (Edit)</strong> di kanan atas pop-up.</li>
                      <li>Pada pilihan <strong>Versi (Version)</strong>, pilih <strong>Versi baru (New version)</strong>.</li>
                      <li>Klik <strong>Deploy (Terapkan)</strong>. Selesai! Webhook URL tetap sama, dan bot akan otomatis mengelompokkan seluruh file <code>.txt</code> registrasi ke dalam folder khusus <strong>Bukti Registrasi Dokumen (TXT)</strong> agar Google Drive Anda selalu rapi.</li>
                    </ol>
                  </div>

                  <div style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '0.85rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                      Pemasangan Bot Baru Pertama Kali:
                    </div>
                    <ol style={{ paddingLeft: '1.15rem', margin: 0, fontSize: '0.8rem', lineHeight: 1.6 }}>
                      <li>Buka{' '}
                        <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                          script.google.com
                        </a>{' '}
                        &gt; klik <strong>Proyek Baru</strong>.
                      </li>
                      <li>Hapus kode bawaan, lalu <strong>Paste</strong> seluruh kode di bawah ini.</li>
                      <li>Klik <strong>Deploy</strong> &gt; <strong>Deployment Baru</strong> &gt; tipe <strong>Aplikasi Web</strong>.</li>
                      <li>Pilih: <em>Execute as: Me</em> &amp; <em>Who has access: Anyone</em>.</li>
                      <li>Klik <strong>Deploy</strong>, beri izin akses, dan <strong>Salin URL Aplikasi Web</strong>.</li>
                      <li>Buka tab <em>Pengaturan &amp; Webhook Bot</em> di sini, lalu paste URL tersebut!</li>
                    </ol>
                  </div>

                  <div style={{ background: 'rgba(168, 85, 247, 0.08)', padding: '0.85rem', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.3)', gridColumn: '1 / -1' }}>
                    <div style={{ fontWeight: 700, color: '#c084fc', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                      Penggunaan Akun Bot Resmi di Google Drive:
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Di Google Drive, riwayat pembuat dokumen akan selalu mengikuti akun Google yang melakukan <em>Deploy</em> script bot tersebut. Untuk memakai akun bot khusus:
                    </div>
                    <ol style={{ paddingLeft: '1.15rem', margin: 0, fontSize: '0.8rem', lineHeight: 1.6 }}>
                      <li>Buat 1 akun Google/Gmail baru untuk bot kantor (misalnya: <strong>bot.nbe.surat@gmail.com</strong>).</li>
                      <li>Buka folder Google Drive perusahaan Anda &gt; klik <strong>Bagikan (Share)</strong> &gt; masukkan email bot tersebut dan beri izin sebagai <strong>Editor</strong>.</li>
                      <li>Buka jendela <strong>Incognito / Browser Baru</strong> &gt; login ke akun bot baru tersebut &gt; kunjungi <a href="https://script.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>script.google.com</a>.</li>
                      <li>Paste kode bot di bawah ini &gt; klik <strong>Deploy</strong> &gt; <strong>Deployment Baru</strong> &gt; pilih tipe <strong>Aplikasi Web</strong> &gt; set <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>.</li>
                      <li>Salin URL Webhook dari akun bot tersebut, lalu masukkan ke tab <em>Pengaturan &amp; Webhook Bot</em> di aplikasi ini. Selesai! Semua riwayat di Google Drive akan otomatis berlabel nama Akun Bot Resmi tersebut.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Tombol Unggah Database ke Cloud - Tersedia Langsung di Tab Ini */}
              {renderCloudSyncCard()}

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
                  {getGoogleAppsScriptBotCode(folderUrl)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
