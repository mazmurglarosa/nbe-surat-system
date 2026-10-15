import React, { useState } from 'react';
import {
  Copy,
  Check,
  Upload,
  FileCheck,
  AlertTriangle,
  Lock,
  Unlock,
  ShieldCheck,
  HardDrive,
  ExternalLink,
  Sparkles,
  FileText,
  X,
  CheckCircle2,
  Bot,
  Loader2,
  AlertCircle,
  Code2,
  RotateCcw,
  Save,
  FolderPlus,
  Link as LinkIcon,
} from 'lucide-react';
import {
  DOCUMENT_TYPES,
  SUB_CATEGORIES,
  SUB_SUB_CATEGORIES,
  DIVISIONS,
  APPROVERS,
  DocumentRecord,
  DocumentStatus,
  CodeDefinition,
} from '../types';
import {
  generateDocumentCode,
  getNextSequenceNumber,
  isCodeDuplicate,
  validateDocumentCode,
  formatSequence,
  getRomanMonth,
} from '../utils/numbering';
import { GoogleDriveSettings, saveGoogleDriveSettings } from '../services/storage';
import {
  uploadFileToDriveViaBot,
  registerDocumentInDriveViaBot,
  createDocumentFolderInDriveViaBot,
  ensureCategoryFolderInDriveViaBot,
  createCategoryFolderInDriveViaBot,
  TARGET_FOLDER_URL,
  TARGET_FOLDER_ID,
} from '../services/googleDriveBot';
import { addSubCategory, addSubSubCategory, addDocumentType } from '../services/masterCodes';
import { pushAllLocalDataToCloud } from '../services/cloudSync';

function generateDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getNowIsoString(): string {
  return new Date().toISOString();
}

function formatIssueDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface DocumentGeneratorProps {
  documents: DocumentRecord[];
  onSaveDocument: (doc: DocumentRecord) => Promise<void>;
  driveSettings: GoogleDriveSettings;
  onNavigateToDocuments: () => void;
  onOpenDriveSettings?: () => void;
  documentTypes?: CodeDefinition[];
  subCategories?: CodeDefinition[];
  subSubCategories?: CodeDefinition[];
  divisions?: CodeDefinition[];
  approvers?: CodeDefinition[];
  onNavigateToMasterCategories?: () => void;
  onAddSubCategory?: (item: CodeDefinition) => void;
  onAddSubSubCategory?: (item: CodeDefinition) => void;
  onAddDocumentType?: (item: CodeDefinition) => void;
}

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  documents,
  onSaveDocument,
  driveSettings,
  onNavigateToDocuments,
  onOpenDriveSettings,
  documentTypes,
  subCategories,
  subSubCategories,
  divisions,
  approvers,
  onNavigateToMasterCategories,
  onAddSubCategory,
  onAddSubSubCategory,
  onAddDocumentType,
}) => {
  const docTypes = documentTypes && documentTypes.length > 0 ? documentTypes : DOCUMENT_TYPES;
  const subCats = subCategories && subCategories.length > 0 ? subCategories : SUB_CATEGORIES;
  const subSubCats = subSubCategories && subSubCategories.length > 0 ? subSubCategories : SUB_SUB_CATEGORIES;
  const divs = divisions && divisions.length > 0 ? divisions : DIVISIONS;
  const apprvs = approvers && approvers.length > 0 ? approvers : APPROVERS;

  // Step selections
  const [selectedType, setSelectedType] = useState<string>(docTypes[0]?.code || 'SOP');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>(subCats[0]?.code || 'GP');
  const [selectedSubSubCategory, setSelectedSubSubCategory] = useState<string>(subSubCats[0]?.code || 'AI');
  const [selectedDivision, setSelectedDivision] = useState<string>(divs[0]?.code || 'GNR');
  const [selectedApprover, setSelectedApprover] = useState<string>(apprvs[0]?.code || 'CEO');

  // Quick Add Modal state for Document Types, Sub Categories, and Sub-sub Categories
  const [quickAddModal, setQuickAddModal] = useState<'type' | 'subcategory' | 'subsubcategory' | null>(null);
  const [quickCode, setQuickCode] = useState('');
  const [quickLabel, setQuickLabel] = useState('');
  const [quickDesc, setQuickDesc] = useState('');
  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [isCreatingCategoryFolder, setIsCreatingCategoryFolder] = useState<boolean>(false);

  // Date selections
  const [issueDate, setIssueDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [monthNumber, setMonthNumber] = useState<number>(() =>
    new Date().getMonth() + 1
  );
  const [year, setYear] = useState<number>(() => new Date().getFullYear());

  // Manual / Backdating Override Mode
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [customSequence, setCustomSequence] = useState<number | ''>('');
  const [legacyNotes, setLegacyNotes] = useState<string>('');

  // Metadata
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<string>('');
  const [approvedBy, setApprovedBy] = useState<string>(
    () => apprvs.find((a) => a.code === (approvers?.[0]?.code || 'CEO'))?.label || 'President Director (CEO)'
  );
  const [verifiedBy, setVerifiedBy] = useState<string>('Management Representative (MR)');
  const [status, setStatus] = useState<DocumentStatus>('Published');
  const [revision, setRevision] = useState<number>(0);

  // File Upload & Google Drive
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl?: string;
  } | null>(null);
  const [googleDriveLink, setGoogleDriveLink] = useState<string>('');

  // UI States
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittingStatus, setSubmittingStatus] = useState<string>('Menyimpan dokumen...');
  const [autoDriveUploaded, setAutoDriveUploaded] = useState<boolean>(false);
  const [savedSuccessDoc, setSavedSuccessDoc] = useState<DocumentRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-update sequence number when document type changes
  const autoSequence = getNextSequenceNumber(documents, selectedType);
  const effectiveSequence =
    isManualOverride && customSequence !== '' ? Number(customSequence) : autoSequence;

  // Auto-calculated code (Format baru: 0000-XXX-ZZ/AA-YYY-OOO-IX-YYYY)
  const autoGeneratedCode = generateDocumentCode(
    effectiveSequence,
    selectedType,
    selectedSubCategory,
    selectedSubSubCategory,
    selectedDivision,
    selectedApprover,
    monthNumber,
    year
  );

  // The active code being used
  const activeCode = isManualOverride && manualCode.trim() ? manualCode.trim().toUpperCase() : autoGeneratedCode;

  // Check 1 code 1 document uniqueness rule
  const duplicate = isCodeDuplicate(activeCode, documents);
  const conflictingDoc = duplicate
    ? documents.find((d) => d.code.toUpperCase() === activeCode.toUpperCase())
    : null;

  // Fixed Code and Dedicated Google Drive Folder State (1-Click Fix Rule)
  const [fixedFoldersMap, setFixedFoldersMap] = useState<
    Record<string, { id: string; url: string; name: string }>
  >({});
  const [isFixingCode, setIsFixingCode] = useState<boolean>(false);
  const [fixNotification, setFixNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    isOldScriptError?: boolean;
    categoryNotFound?: boolean;
    categoryCode?: string;
    categoryLabel?: string;
  } | null>(null);

  // 1-Click Fix Rule: can only be clicked once per new letter code
  const currentFixedFolder = fixedFoldersMap[activeCode] || null;
  const isCodeFixed = Boolean(currentFixedFolder);

  // Bypass folder creation if user explicitly chooses to save in root folder
  const handleBypassFolderCreation = () => {
    const fallbackFolder = {
      id: driveSettings.folderId || TARGET_FOLDER_ID,
      url: driveSettings.folderUrl || TARGET_FOLDER_URL,
      name: activeCode,
    };
    setFixedFoldersMap((prev) => ({ ...prev, [activeCode]: fallbackFolder }));
    setFixNotification({
      type: 'success',
      message: `✓ Kode di-fix dengan folder utama. Berkas akan disimpan di folder root Google Drive.`,
    });
  };

  const [quickWebhookUrl, setQuickWebhookUrl] = useState<string>('');

  // Simpan Webhook URL baru & langsung otomatis buat folder Google Drive
  const handleSaveQuickWebhookAndFix = async () => {
    const trimmed = quickWebhookUrl.trim();
    if (!trimmed || !trimmed.startsWith('https://script.google.com')) {
      alert('URL Webhook harus berformat: https://script.google.com/macros/s/.../exec');
      return;
    }

    const updatedSettings = {
      ...driveSettings,
      botWebhookUrl: trimmed,
    };
    saveGoogleDriveSettings(updatedSettings);

    setIsFixingCode(true);
    setFixNotification(null);

    try {
      const typeDef = docTypes.find((dt) => dt.code.toUpperCase() === selectedType.toUpperCase());
      const folderResult = await createDocumentFolderInDriveViaBot(
        activeCode,
        selectedType,
        typeDef?.label,
        trimmed,
        updatedSettings.folderId || TARGET_FOLDER_ID
      );

      if (folderResult.success && folderResult.folderId) {
        const newFolderData = {
          id: folderResult.folderId,
          url:
            folderResult.folderUrl ||
            `https://drive.google.com/drive/folders/${folderResult.folderId}`,
          name: activeCode,
        };
        setFixedFoldersMap((prev) => ({ ...prev, [activeCode]: newFolderData }));
        setGoogleDriveLink(newFolderData.url);
        setFixNotification({
          type: 'success',
          message: `✓ Selesai! Webhook disimpan & folder "${activeCode}" otomatis dibuat di kategori "${folderResult.categoryFolderName || selectedType}"!`,
        });
        setQuickWebhookUrl('');
      } else {
        setFixNotification({
          type: 'error',
          message:
            folderResult.error ||
            'Gagal membuat folder dengan URL ini. Pastikan setelan akses Web App diatur ke "Anyone (Siapa saja)".',
          isOldScriptError: (folderResult.error || '').includes('versi lama'),
        });
      }
    } catch (err: any) {
      setFixNotification({
        type: 'error',
        message: `Terjadi kendala: ${err.message}`,
      });
    } finally {
      setIsFixingCode(false);
    }
  };

  // Handler for Fix Button: Locks code and auto-creates folder in Google Drive inside its Category folder
  const handleFixCode = async () => {
    if (isCodeFixed || isFixingCode) return;

    if (duplicate) {
      setErrorMsg(
        `Kode "${activeCode}" sudah digunakan untuk dokumen lain. Tidak dapat di-fix.`
      );
      return;
    }

    setIsFixingCode(true);
    setFixNotification(null);

    try {
      if (driveSettings.botWebhookUrl) {
        const typeDef = docTypes.find((dt) => dt.code.toUpperCase() === selectedType.toUpperCase());
        const subDef = subCats.find((sc) => sc.code.toUpperCase() === selectedSubCategory.toUpperCase());
        const subSubDef = subSubCats.find((ssc) => ssc.code.toUpperCase() === selectedSubSubCategory.toUpperCase());
        const effectiveDocTitle = title.trim() || activeCode;

        const folderResult = await createDocumentFolderInDriveViaBot(
          activeCode,
          selectedType,
          typeDef?.label,
          driveSettings.botWebhookUrl,
          driveSettings.folderId || TARGET_FOLDER_ID,
          {
            documentTitle: effectiveDocTitle,
            subCategoryCode: selectedSubCategory,
            subCategoryLabel: subDef?.label,
            subSubCategoryCode: selectedSubSubCategory,
            subSubCategoryLabel: subSubDef?.label,
          }
        );

        if (folderResult.categoryNotFound) {
          setFixNotification({
            type: 'error',
            message:
              folderResult.error ||
              `Folder Kategori '${selectedType}' belum ditemukan di Google Drive. Silakan buat atau perbarui folder kategori di web terlebih dahulu.`,
            categoryNotFound: true,
            categoryCode: selectedType,
            categoryLabel: typeDef?.label,
          });
          return;
        }

        if (folderResult.success && folderResult.folderId) {
          const newFolderData = {
            id: folderResult.folderId,
            url:
              folderResult.folderUrl ||
              `https://drive.google.com/drive/folders/${folderResult.folderId}`,
            name: folderResult.folderName || effectiveDocTitle,
          };
          setFixedFoldersMap((prev) => ({ ...prev, [activeCode]: newFolderData }));
          setGoogleDriveLink(newFolderData.url);
          const pathMsg = folderResult.folderPath ? ` (${folderResult.folderPath})` : '';
          setFixNotification({
            type: 'success',
            message: `✓ Kode berhasil di-FIX! Folder Google Drive untuk "${effectiveDocTitle}" otomatis disiapkan${pathMsg}. Dokumen yang diunggah akan otomatis disimpan ke dalam folder ini.`,
          });
        } else {
          // GAGAL MEMBUAT FOLDER: Jangan kunci tombol agar user bisa Coba Lagi setelah update script!
          setFixNotification({
            type: 'error',
            message:
              folderResult.error ||
              'Bot Google Drive gagal membuat folder baru. Silakan periksa atau perbarui script bot.',
            isOldScriptError:
              (folderResult.error || '').includes('versi lama') ||
              (folderResult.error || '').includes('create_folder') ||
              (folderResult.error || '').includes('Argument cannot be null'),
          });
        }
      } else {
        const localFolder = {
          id: driveSettings.folderId || TARGET_FOLDER_ID,
          url: driveSettings.folderUrl || TARGET_FOLDER_URL,
          name: activeCode,
        };
        setFixedFoldersMap((prev) => ({ ...prev, [activeCode]: localFolder }));
        setFixNotification({
          type: 'success',
          message: `✓ Kode berhasil di-FIX secara lokal! (Tips: pasang URL Webhook Bot di Pengaturan Google Drive untuk sinkronisasi otomatis ke cloud).`,
        });
      }
    } catch (err: any) {
      setFixNotification({
        type: 'error',
        message: `Terjadi kendala saat menghubungkan ke Google Drive: ${err.message}`,
      });
    } finally {
      setIsFixingCode(false);
    }
  };

  const handleCreateCategoryFolderNow = async () => {
    if (!driveSettings.botWebhookUrl) {
      alert('URL Webhook Bot Google Apps Script belum disetel. Buka Pengaturan Google Drive untuk memasang bot.');
      return;
    }
    const typeDef = docTypes.find((dt) => dt.code.toUpperCase() === selectedType.toUpperCase());
    setIsCreatingCategoryFolder(true);
    try {
      const res = await createCategoryFolderInDriveViaBot(
        selectedType,
        typeDef?.label,
        driveSettings.botWebhookUrl,
        driveSettings.folderId || TARGET_FOLDER_ID
      );
      if (res.success) {
        setFixNotification({
          type: 'success',
          message: `✓ Folder kategori "${selectedType}" berhasil dibuat di Google Drive! Melanjutkan proses penyiapan folder dokumen...`,
        });
        setTimeout(() => {
          handleFixCode();
        }, 500);
      } else {
        alert(res.error || 'Gagal membuat folder kategori di Google Drive.');
      }
    } catch (err: any) {
      alert(`Terjadi kendala: ${err.message}`);
    } finally {
      setIsCreatingCategoryFolder(false);
    }
  };

  // Sync date changes with month and year
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateStr = e.target.value;
    setIssueDate(newDateStr);
    if (newDateStr) {
      const d = new Date(newDateStr);
      if (!isNaN(d.getTime())) {
        setMonthNumber(d.getMonth() + 1);
        setYear(d.getFullYear());
      }
    }
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Bot Upload State
  const [isBotUploading, setIsBotUploading] = useState<boolean>(false);
  const [botUploadSuccess, setBotUploadSuccess] = useState<{
    viewUrl: string;
    fileName: string;
  } | null>(null);
  const [botUploadError, setBotUploadError] = useState<string | null>(null);

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBotUploadSuccess(null);
      setBotUploadError(null);
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Bot Upload Handler to Target Google Drive
  const handleUploadViaBot = async () => {
    if (!uploadedFile || !uploadedFile.dataUrl) {
      setBotUploadError('Pilih file dokumen terlebih dahulu sebelum mengunggah via Bot.');
      return;
    }

    if (!driveSettings.botWebhookUrl) {
      if (onOpenDriveSettings) {
        onOpenDriveSettings();
      } else {
        alert(
          'URL Webhook Bot Google Apps Script belum disetel. Silakan buka Pengaturan Google Drive untuk memasang script bot.'
        );
      }
      return;
    }

    setIsBotUploading(true);
    setBotUploadError(null);
    try {
      const targetFolderId = currentFixedFolder?.id || driveSettings.folderId || TARGET_FOLDER_ID;
      const result = await uploadFileToDriveViaBot(
        uploadedFile.dataUrl,
        uploadedFile.name,
        uploadedFile.type,
        driveSettings.botWebhookUrl,
        {
          folderId: targetFolderId,
          documentCode: activeCode,
          uploadedBy: createdBy.trim() || 'Staff NBE',
        }
      );

      if (result.success && result.viewUrl) {
        setGoogleDriveLink(result.viewUrl);
        setBotUploadSuccess({
          viewUrl: result.viewUrl,
          fileName: uploadedFile.name,
        });
      } else {
        setBotUploadError(result.error || 'Bot Google Drive gagal memproses unggahan file.');
      }
    } catch (err: any) {
      setBotUploadError(`Koneksi bot bermasalah: ${err.message}`);
    } finally {
      setIsBotUploading(false);
    }
  };

  // Toggle manual override
  const handleToggleManual = () => {
    if (!isManualOverride) {
      setIsManualOverride(true);
      setManualCode(autoGeneratedCode);
      setCustomSequence(autoSequence);
    } else {
      setIsManualOverride(false);
      setManualCode('');
      setCustomSequence('');
    }
  };

  // Submit and save document
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Judul Dokumen wajib diisi.');
      return;
    }

    if (!createdBy.trim()) {
      setErrorMsg('Nama Pembuat Dokumen (Created By) wajib diisi.');
      return;
    }

    // Strict 1 Kode 1 Dokumen check
    if (duplicate) {
      setErrorMsg(
        `Kode "${activeCode}" sudah digunakan untuk dokumen "${conflictingDoc?.title}". 1 kode dokumen hanya boleh berlaku untuk 1 dokumen saja.`
      );
      return;
    }

    // Validate format if manual code
    if (isManualOverride && manualCode) {
      const validation = validateDocumentCode(manualCode);
      if (!validation.isValid) {
        setErrorMsg(validation.message || 'Format kode dokumen tidak valid.');
        return;
      }
    }

    setIsSubmitting(true);
    setSubmittingStatus('Menyiapkan dokumen...');
    setAutoDriveUploaded(false);

    try {
      const romanMonth = getRomanMonth(monthNumber);

      // Auto Bot Google Drive upload / registration
      let finalDriveLink = googleDriveLink.trim();
      const targetFolderId = currentFixedFolder?.id || driveSettings.folderId || TARGET_FOLDER_ID;

      if (driveSettings.botWebhookUrl) {
        setSubmittingStatus('Bot sedang mendaftarkan dokumen ke Google Drive...');
        try {
          const botResult = await registerDocumentInDriveViaBot(
            {
              code: activeCode,
              title: title.trim(),
              typeCode: selectedType,
              divisionCode: selectedDivision,
              approverCode: selectedApprover,
              createdBy: createdBy.trim(),
              approvedBy: approvedBy.trim() || undefined,
              issueDate: issueDate,
              description: description.trim() || undefined,
            },
            uploadedFile
              ? {
                  dataUrl: uploadedFile.dataUrl,
                  name: uploadedFile.name,
                  type: uploadedFile.type,
                }
              : null,
            driveSettings.botWebhookUrl,
            targetFolderId
          );

          if (botResult.success && botResult.viewUrl) {
            finalDriveLink = botResult.viewUrl;
            setAutoDriveUploaded(true);
          } else {
            console.warn('Bot Drive info:', botResult.error);
          }
        } catch (botErr) {
          console.warn('Bot Drive communication error:', botErr);
        }
      } else {
        // Fallback to company folder if no direct link entered
        if (!finalDriveLink) {
          finalDriveLink = currentFixedFolder?.url || driveSettings.folderUrl || TARGET_FOLDER_URL;
        }
      }

      setSubmittingStatus('Menyimpan ke sistem...');

      const newDoc: DocumentRecord = {
        id: generateDocumentId(),
        code: activeCode,
        seqNumber: effectiveSequence,
        typeCode: selectedType,
        subCategoryCode: selectedSubCategory,
        subSubCategoryCode: selectedSubSubCategory,
        divisionCode: selectedDivision,
        approverCode: selectedApprover,
        monthRoman: romanMonth,
        year: year,
        title: title.trim(),
        description: description.trim() || undefined,
        revision: revision,
        status: status,
        createdBy: createdBy.trim(),
        approvedBy: approvedBy.trim() || undefined,
        verifiedBy: verifiedBy.trim() || undefined,
        issueDate: issueDate,
        fileName: uploadedFile?.name,
        fileSize: uploadedFile?.size,
        fileType: uploadedFile?.type,
        fileData: uploadedFile?.dataUrl,
        googleDriveLink: finalDriveLink || undefined,
        driveFolderId: currentFixedFolder?.id,
        driveFolderUrl: currentFixedFolder?.url,
        isFixed: isCodeFixed,
        isManualCode: isManualOverride,
        legacyNotes: legacyNotes.trim() || undefined,
        revisions: [
          {
            revision: revision,
            date: formatIssueDate(issueDate),
            description: revision === 0 ? 'Initial Issue' : 'Penerbitan Baru',
            revisedBy: createdBy.trim(),
          },
        ],
        createdAt: getNowIsoString(),
        updatedAt: getNowIsoString(),
      };

      await onSaveDocument(newDoc);
      setSavedSuccessDoc(newDoc);

      // Reset form partially
      setTitle('');
      setDescription('');
      setUploadedFile(null);
      setGoogleDriveLink('');
      setFixNotification(null);
      if (isManualOverride) {
        setIsManualOverride(false);
        setManualCode('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan dokumen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* Success Notification Modal / Banner */}
      {savedSuccessDoc && (
        <div
          className="glass-card animate-fade-in"
          style={{
            margin: '1.5rem 0',
            padding: '1.75rem',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            background: 'rgba(16, 185, 129, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div
                style={{
                  background: 'var(--success)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>
                    Dokumen Berhasil Didaftarkan & Disimpan!
                  </h3>
                  {autoDriveUploaded && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.5)',
                        color: '#34d399',
                        padding: '0.15rem 0.6rem',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <Bot size={13} /> Bot Terdaftar ke Google Drive
                    </span>
                  )}
                </div>

                <p style={{ marginTop: '0.35rem', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                  Kode Dokumen:{' '}
                  <span
                    className="mono"
                    style={{
                      fontWeight: 700,
                      background: 'rgba(0,0,0,0.3)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      color: 'var(--primary)',
                    }}
                  >
                    {savedSuccessDoc.code}
                  </span>
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  Judul: <strong>{savedSuccessDoc.title}</strong> | Dibuat oleh:{' '}
                  {savedSuccessDoc.createdBy}
                </p>

                {savedSuccessDoc.googleDriveLink && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <a
                      href={savedSuccessDoc.googleDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm"
                      style={{
                        background: 'rgba(5, 150, 105, 0.25)',
                        border: '1px solid rgba(16, 185, 129, 0.5)',
                        color: '#34d399',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontWeight: 600,
                      }}
                    >
                      <HardDrive size={14} />
                      <span>Buka File di Google Drive</span>
                      <ExternalLink size={12} />
                    </a>

                    <a
                      href={TARGET_FOLDER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--text-secondary)',
                        textDecoration: 'underline',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      Buka Folder NBE Drive <ExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={onNavigateToDocuments}
                className="btn btn-primary btn-sm"
              >
                Lihat di Database Dokumen
              </button>
              <button
                onClick={() => setSavedSuccessDoc(null)}
                className="btn btn-secondary btn-sm"
              >
                Buat Dokumen Lainnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intro Header */}
      <div style={{ margin: '1.75rem 0 1.25rem 0' }}>
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
          <Sparkles color="var(--primary)" size={26} />
          Generator & Penomoran Dokumen Otomatis
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.95rem' }}>
          Format standar penomoran dokumen PT Nirwana Bhumi Energi:{' '}
          <span className="mono" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            0000-XXX-YYY-OOO-IX-2026
          </span>
          . Pilih parameter di bawah untuk menghasilkan kode resmi.
        </p>
      </div>

      {/* 21st.dev Interactive Code Hero */}
      <div
        className="bento-card"
        style={{
          padding: '1.75rem',
          marginBottom: '2rem',
          border: duplicate
            ? '1px solid var(--danger)'
            : isCodeFixed
            ? '1px solid rgba(16, 185, 129, 0.5)'
            : '1px solid var(--border-accent)',
          background: duplicate
            ? 'rgba(239, 68, 68, 0.08)'
            : 'var(--bg-card)',
          position: 'relative',
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
          <div style={{ flex: '1 1 500px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.65rem',
                flexWrap: 'wrap',
              }}
            >
              <span className="badge badge-primary mono" style={{ fontSize: '0.7rem' }}>
                KODE GENERATOR RESMI
              </span>
              {isManualOverride ? (
                <span className="badge badge-warning">
                  <Unlock size={12} />
                  Mode Edit Manual Aktif
                </span>
              ) : (
                <span className="badge badge-primary">
                  <Lock size={12} />
                  Auto-Sequence Aktif
                </span>
              )}
              {isCodeFixed && (
                <span className="badge badge-success">
                  <CheckCircle2 size={12} />
                  Drive Folder Siap
                </span>
              )}
              {duplicate && (
                <span className="badge badge-danger">
                  <AlertCircle size={12} />
                  Duplikat Terdeteksi
                </span>
              )}
            </div>

            {/* The Main Code Display Box */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                marginTop: '0.25rem',
                marginBottom: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 'clamp(1.4rem, 3.2vw, 2.2rem)',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: duplicate ? 'var(--danger)' : 'var(--text-main)',
                  wordBreak: 'break-all',
                }}
              >
                {activeCode}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                  title="Salin kode ke clipboard"
                >
                  {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                  <span>{copied ? 'Tersalin' : 'Copy'}</span>
                  <span className="kbd" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>⌘C</span>
                </button>
              </div>
            </div>

            {/* Code Breakdown Explanation Pills */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.4rem',
              }}
            >
              <span className="badge badge-blue">
                No: {formatSequence(effectiveSequence)}
              </span>
              <span className="badge badge-purple">
                Tipe: {selectedType}
              </span>
              <span className="badge badge-info" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                Sub (ZZ): {selectedSubCategory}
              </span>
              <span className="badge" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                Sub-sub (AA): {selectedSubSubCategory}
              </span>
              <span className="badge badge-primary">Divisi: {selectedDivision}</span>
              <span className="badge badge-warning">Approver: {selectedApprover}</span>
              <span className="badge badge-blue">Bulan: {getRomanMonth(monthNumber)}</span>
              <span className="badge badge-purple">Tahun: {year}</span>
            </div>
          </div>

          {/* Action Buttons: Fix Code & Manual Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', alignSelf: 'center' }}>
            <button
              type="button"
              onClick={handleFixCode}
              disabled={isCodeFixed || isFixingCode || Boolean(duplicate)}
              className={`btn btn-lg ${isCodeFixed ? 'btn-success' : 'btn-warning'}`}
              style={{
                minWidth: '160px',
                background: isCodeFixed
                  ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                  : 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
                borderColor: isCodeFixed ? '#10b981' : '#f59e0b',
                color: '#ffffff',
                fontWeight: 600,
                cursor: isCodeFixed ? 'default' : duplicate ? 'not-allowed' : 'pointer',
                opacity: duplicate ? 0.6 : 1,
              }}
              title={
                isCodeFixed
                  ? 'Kode telah di-Fix dan folder Google Drive telah dibuat'
                  : 'Kunci kode surat ini & otomatis buat folder baru di Google Drive'
              }
            >
              {isFixingCode ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Membuat Folder...</span>
                </>
              ) : isCodeFixed ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Fix Terkunci</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Fix Kode</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleToggleManual}
              className="btn btn-secondary btn-sm"
              title="Ubah kode dokumen secara manual jika diperlukan"
            >
              {isManualOverride ? <Lock size={14} /> : <Unlock size={14} />}
              <span>{isManualOverride ? 'Kunci Kembali ke Auto' : 'Ubah Kode Manual'}</span>
            </button>
          </div>
        </div>

        {/* Fix Code Notification Banner */}
        {fixNotification && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.9rem 1.15rem',
              borderRadius: 'var(--radius-md)',
              background:
                fixNotification.type === 'success'
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${
                fixNotification.type === 'success'
                  ? 'var(--success)'
                  : 'var(--danger)'
              }`,
              color:
                fixNotification.type === 'success' ? '#6ee7b7' : '#fca5a5',
              display: 'flex',
              flexDirection: fixNotification.type === 'error' ? 'column' : 'row',
              alignItems: fixNotification.type === 'error' ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flex: 1, width: '100%' }}>
              {fixNotification.type === 'success' ? (
                <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div style={{ lineHeight: 1.5, flex: 1 }}>
                <div>{fixNotification.message}</div>
                {fixNotification.type === 'error' && fixNotification.categoryNotFound && (
                  <div style={{ marginTop: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={handleCreateCategoryFolderNow}
                      disabled={isCreatingCategoryFolder}
                      className="btn btn-sm btn-primary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        fontWeight: 600,
                        boxShadow: '0 2px 10px rgba(2, 132, 199, 0.4)',
                      }}
                    >
                      {isCreatingCategoryFolder ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <FolderPlus size={14} />
                      )}
                      <span>Buat Folder Kategori "{fixNotification.categoryCode || selectedType}" di Google Drive Sekarang</span>
                    </button>
                  </div>
                )}
                {fixNotification.type === 'error' && fixNotification.isOldScriptError && (
                  <div style={{ marginTop: '0.4rem', color: '#fed7aa', fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                      <Sparkles size={14} color="#f59e0b" />
                      <strong>Solusi:</strong>
                    </div>
                    Klik tombol <em>"Salin Script Bot Terbaru"</em> di bawah, buka proyek Apps Script Anda, timpa/paste kodenya, lalu klik <strong>Deploy &gt; Kelola deployment &gt; Edit &gt; Versi Baru &gt; Terapkan</strong>.
                  </div>
                )}
              </div>
            </div>

            {fixNotification.type === 'success' && currentFixedFolder?.url && (
              <a
                href={currentFixedFolder.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  borderColor: 'var(--success)',
                  color: '#fff',
                  whiteSpace: 'nowrap',
                }}
              >
                <HardDrive size={14} />
                <span>Buka Folder Drive</span>
                <ExternalLink size={12} />
              </a>
            )}

            {fixNotification.type === 'error' && (
              <>
                <div
                  style={{
                    width: '100%',
                    marginTop: '0.65rem',
                    padding: '0.75rem 0.9rem',
                    borderRadius: '6px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '0.4rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <LinkIcon size={14} />
                    <span>Sudah memiliki URL Webhook Baru dari script.google.com? Tempel di sini:</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      value={quickWebhookUrl}
                      onChange={(e) => setQuickWebhookUrl(e.target.value)}
                      className="form-input"
                      style={{
                        flex: 1,
                        minWidth: '240px',
                        fontSize: '0.8rem',
                        padding: '0.45rem 0.75rem',
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid var(--border-accent)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveQuickWebhookAndFix}
                      disabled={isFixingCode || !quickWebhookUrl.trim()}
                      className="btn btn-sm btn-success"
                      style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    >
                      {isFixingCode ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      <span>Simpan &amp; Buat Folder</span>
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    marginTop: '0.35rem',
                    width: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  {onOpenDriveSettings && (
                    <button
                      type="button"
                      onClick={onOpenDriveSettings}
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: '0.8rem' }}
                    >
                      <Code2 size={14} />
                      <span>Salin Script Bot Terbaru</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFixCode}
                    disabled={isFixingCode}
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '0.8rem' }}
                  >
                    <RotateCcw size={14} className={isFixingCode ? 'animate-spin' : ''} />
                    <span>Coba Fix Lagi</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBypassFolderCreation}
                    className="btn btn-sm btn-ghost"
                    style={{ fontSize: '0.78rem', color: '#94a3b8' }}
                    title="Gunakan folder root utama tanpa membuat subfolder khusus"
                  >
                    <span>Lewati &amp; Simpan di Folder Utama</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Duplicate Warning Alert Banner (1 KODE 1 DOKUMEN RULE) */}
        {duplicate && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.9rem 1.15rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#fca5a5',
            }}
          >
            <AlertTriangle size={22} color="var(--danger)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem' }}>
              <strong style={{ color: '#fff' }}>
                PERINGATAN: KODE DOKUMEN SUDAH DIGUNAKAN!
              </strong>
              <p style={{ marginTop: '0.15rem' }}>
                Kode <code className="mono">{activeCode}</code> sudah terdaftar pada dokumen:{' '}
                <strong>"{conflictingDoc?.title}"</strong>.
                <br />
                Sesuai aturan NBE:{' '}
                <em>"1 kode surat hanya berlaku untuk 1 dokumen saja, tidak boleh lebih."</em>{' '}
                Silakan naikkan nomor urut atau sesuaikan parameter penerbitan.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Manual Override Editor Panel */}
      {isManualOverride && (
        <div
          className="glass-card animate-fade-in"
          style={{
            padding: '1.5rem',
            marginBottom: '2rem',
            border: '1px solid var(--warning)',
            background: 'rgba(245, 158, 11, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              color: 'var(--warning)',
            }}
          >
            <Unlock size={20} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              Panel Akses Ubah Kode Dokumen (Untuk Dokumen Pra-Sistem / Backdating)
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Anda dapat mengubah langsung teks kode atau mengatur nomor urut dan tanggal penerbitan
            lampau untuk mengarsipkan dokumen yang sudah terbit sebelum sistem ini hadir.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <div className="form-group">
              <label className="form-label">Teks Kode Dokumen Langsung</label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="0001-CSMS-GP/AI-FNC-CFO-IX-2026"
                className="form-input mono"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Format standar: 0000-XXX-ZZ/AA-YYY-OOO-BLN-THN
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Nomor Urut Manual</label>
              <input
                type="number"
                min="1"
                value={customSequence}
                onChange={(e) => {
                  const val = e.target.value ? parseInt(e.target.value, 10) : '';
                  setCustomSequence(val);
                  if (val !== '') {
                    setManualCode(
                      generateDocumentCode(
                        val,
                        selectedType,
                        selectedSubCategory,
                        selectedSubSubCategory,
                        selectedDivision,
                        selectedApprover,
                        monthNumber,
                        year
                      )
                    );
                  }
                }}
                className="form-input mono"
                placeholder="Contoh: 15"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Catatan Dokumen Lampau (Legacy)</label>
              <input
                type="text"
                value={legacyNotes}
                onChange={(e) => setLegacyNotes(e.target.value)}
                placeholder="Contoh: Dokumen fisik lama tahun 2024"
                className="form-input"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Multi-Step Generator Form */}
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {/* STEP 1: Pilih Kategori Surat (Document Type code) */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  1
                </div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Pilih Kategori Surat (Document Type)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddModal('type')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: 'var(--primary)' }}
                title="Tambah Kategori Surat Baru"
              >
                + Tambah
              </button>
            </div>

            <div className="code-list-scroll">
              {docTypes.map((dt) => (
                <div
                  key={dt.code}
                  onClick={() => setSelectedType(dt.code)}
                  style={{
                    padding: '0.75rem 0.95rem',
                    borderRadius: 'var(--radius-md)',
                    border:
                      selectedType === dt.code
                        ? '1.5px solid var(--primary)'
                        : '1px solid var(--border-subtle)',
                    background:
                      selectedType === dt.code
                        ? 'var(--primary-glow)'
                        : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {dt.label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.15rem',
                      }}
                    >
                      {dt.description}
                    </div>
                  </div>
                  <span
                    className="badge badge-purple mono"
                    style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                  >
                    {dt.code}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 2: Pilih Sub Kategori Surat (Sub Category - Kode ZZ) */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#06b6d4',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  2
                </div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Pilih Sub-Kategori Surat (Kode ZZ)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddModal('subcategory')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#06b6d4' }}
                title="Tambah Sub-Kategori Surat Baru (ZZ)"
              >
                + Tambah
              </button>
            </div>

            <div className="code-list-scroll">
              {subCats.map((sc) => (
                <div
                  key={sc.code}
                  onClick={() => setSelectedSubCategory(sc.code)}
                  style={{
                    padding: '0.75rem 0.95rem',
                    borderRadius: 'var(--radius-md)',
                    border:
                      selectedSubCategory === sc.code
                        ? '1.5px solid #06b6d4'
                        : '1px solid var(--border-subtle)',
                    background:
                      selectedSubCategory === sc.code
                        ? 'rgba(6, 182, 212, 0.15)'
                        : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {sc.label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.15rem',
                      }}
                    >
                      {sc.description}
                    </div>
                  </div>
                  <span
                    className="badge mono"
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.2rem 0.5rem',
                      background: 'rgba(6, 182, 212, 0.25)',
                      color: '#22d3ee',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                    }}
                  >
                    {sc.code}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* STEP 3: Pilih Sub-sub Kategori Surat (Kode AA) */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#8b5cf6',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  3
                </div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Pilih Sub-sub Kategori Surat (Kode AA)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddModal('subsubcategory')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#a855f7' }}
                title="Tambah Sub-sub Kategori Baru (AA)"
              >
                + Tambah
              </button>
            </div>

            <div className="code-list-scroll">
              {subSubCats.map((ssc) => (
                <div
                  key={ssc.code}
                  onClick={() => setSelectedSubSubCategory(ssc.code)}
                  style={{
                    padding: '0.75rem 0.95rem',
                    borderRadius: 'var(--radius-md)',
                    border:
                      selectedSubSubCategory === ssc.code
                        ? '1.5px solid #8b5cf6'
                        : '1px solid var(--border-subtle)',
                    background:
                      selectedSubSubCategory === ssc.code
                        ? 'rgba(139, 92, 246, 0.15)'
                        : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {ssc.label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.15rem',
                      }}
                    >
                      {ssc.description}
                    </div>
                  </div>
                  <span
                    className="badge mono"
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.2rem 0.5rem',
                      background: 'rgba(139, 92, 246, 0.25)',
                      color: '#c084fc',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    {ssc.code}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 4: Pilih Penerbit Surat (Division code) */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--accent-blue)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  4
                </div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Pilih Penerbit Surat (Division)
                </h2>
              </div>
              {onNavigateToMasterCategories && (
                <button
                  type="button"
                  onClick={onNavigateToMasterCategories}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#38bdf8' }}
                >
                  + Kelola
                </button>
              )}
            </div>

            <div className="code-list-scroll">
              {divs.map((div) => (
                <div
                  key={div.code}
                  onClick={() => setSelectedDivision(div.code)}
                  style={{
                    padding: '0.75rem 0.95rem',
                    borderRadius: 'var(--radius-md)',
                    border:
                      selectedDivision === div.code
                        ? '1.5px solid var(--accent-blue)'
                        : '1px solid var(--border-subtle)',
                    background:
                      selectedDivision === div.code
                        ? 'rgba(2, 132, 199, 0.15)'
                        : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {div.label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.15rem',
                      }}
                    >
                      {div.description}
                    </div>
                  </div>
                  <span
                    className="badge badge-blue mono"
                    style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                  >
                    {div.code}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 5: Orang Yang Menyetujui (Approving Authority code) - Memanjang Horizontal ke Samping */}
          <div
            className="glass-card"
            style={{
              padding: '1.5rem',
              gridColumn: '1 / -1', // Memanjang ke samping horizontal
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--warning)',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  5
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                    Orang Yang Menyetujui (Approver)
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                    Pilih pejabat yang berwenang menandatangani dan mengesahkan dokumen ini
                  </p>
                </div>
              </div>
              {onNavigateToMasterCategories && (
                <button
                  type="button"
                  onClick={onNavigateToMasterCategories}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#f59e0b' }}
                >
                  + Kelola
                </button>
              )}
            </div>

            {/* Opsi Approver Memanjang Horizontal ke Samping */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {apprvs.map((app) => {
                const isSelected = selectedApprover === app.code;
                return (
                  <div
                    key={app.code}
                    onClick={() => {
                      setSelectedApprover(app.code);
                      setApprovedBy(app.label);
                    }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected
                        ? '1.5px solid var(--warning)'
                        : '1px solid var(--border-subtle)',
                      background: isSelected
                        ? 'var(--warning-bg)'
                        : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected
                        ? '0 4px 12px rgba(245, 158, 11, 0.2)'
                        : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.35rem',
                      }}
                    >
                      <span
                        className="badge badge-warning mono"
                        style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                      >
                        {app.code}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: 'var(--warning)',
                            background: 'rgba(245, 158, 11, 0.15)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                          }}
                        >
                          Dipilih
                        </span>
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: 'var(--text-main)',
                        }}
                      >
                        {app.label}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          marginTop: '0.15rem',
                          lineHeight: 1.3,
                        }}
                      >
                        {app.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* STEP 4: Metadata Dokumen, Upload & Google Drive */}
        <div className="glass-card" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
          <h2
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <FileText size={20} color="var(--primary)" />
            Detail & Data Dokumen
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Judul Dokumen */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                Judul Dokumen / Nama Prosedur <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: DOCUMENTS AND RECORDS CONTROL PROCEDURE"
                className="form-input"
              />
            </div>

            {/* Tanggal Terbit */}
            <div className="form-group">
              <label className="form-label">Tanggal Penerbitan</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="date"
                  value={issueDate}
                  onChange={handleDateChange}
                  className="form-input"
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Bulan: {getRomanMonth(monthNumber)} | Tahun: {year}
              </span>
            </div>

            {/* Dibuat Oleh */}
            <div className="form-group">
              <label className="form-label">
                Dibuat Oleh (Created By) <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="Contoh: Abdul Q / Staff Name"
                className="form-input"
              />
            </div>

            {/* Diverifikasi Oleh */}
            <div className="form-group">
              <label className="form-label">Diverifikasi Oleh (Verified By)</label>
              <input
                type="text"
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="Contoh: Management Representative (MR)"
                className="form-input"
              />
            </div>

            {/* Disetujui Oleh */}
            <div className="form-group">
              <label className="form-label">Disetujui Oleh (Approved By)</label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Contoh: President Director (CEO)"
                className="form-input"
              />
            </div>

            {/* Status Dokumen */}
            <div className="form-group">
              <label className="form-label">Status Dokumen</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                className="form-select"
              >
                <option value="Published">Published (Diterbitkan & Berlaku)</option>
                <option value="Approved">Approved (Telah Disetujui)</option>
                <option value="In Review">In Review (Sedang Direview)</option>
                <option value="Draft">Draft (Konsep)</option>
                <option value="Archived">Archived (Diarsipkan / Digantikan)</option>
              </select>
            </div>

            {/* Revisi Index */}
            <div className="form-group">
              <label className="form-label">Nomor Revisi</label>
              <input
                type="number"
                min="0"
                value={revision}
                onChange={(e) => setRevision(parseInt(e.target.value, 10) || 0)}
                className="form-input mono"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Revisi 0 adalah penerbitan perdana (Initial Issue)
              </span>
            </div>

            {/* Deskripsi / Lingkup */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Deskripsi / Ruang Lingkup Dokumen</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Keterangan singkat maksud dan tujuan dokumen..."
                className="form-textarea"
              />
            </div>
          </div>

          {/* Upload Dokumen & Google Drive Section */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Tombol Upload Dokumen */}
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Upload size={14} color="var(--primary)" />
                Upload File Dokumen (PDF, Word, Excel)
              </label>

              <div
                style={{
                  border: '2px dashed var(--border-accent)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: 'var(--bg-secondary)',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />

                {uploadedFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    <FileCheck size={28} color="var(--primary)" />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {uploadedFile.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {(uploadedFile.size / 1024).toFixed(1)} KB • {uploadedFile.type || 'Dokumen'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                        setBotUploadSuccess(null);
                        setBotUploadError(null);
                      }}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0.2rem', color: 'var(--danger)' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={24} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      Klik atau Seret file dokumen ke sini
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Mendukung PDF, Word (.docx), Excel, gambar
                    </p>
                  </div>
                )}
              </div>

              {/* Tombol Upload ke Google Drive via Bot */}
              {uploadedFile && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleUploadViaBot}
                    disabled={isBotUploading}
                    className="btn btn-sm"
                    style={{
                      background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
                      cursor: isBotUploading ? 'wait' : 'pointer',
                    }}
                  >
                    {isBotUploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Bot sedang mengunggah dokumen ke Google Drive...</span>
                      </>
                    ) : (
                      <>
                        <Bot size={16} />
                        <span>Unggah ke Google Drive via Bot</span>
                      </>
                    )}
                  </button>

                  {botUploadSuccess && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid var(--success)',
                        color: 'var(--success)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={16} />
                        <span>Berhasil diunggah oleh Bot ke Google Drive!</span>
                      </div>
                      <a
                        href={botUploadSuccess.viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#38bdf8',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          textDecoration: 'underline',
                        }}
                      >
                        <ExternalLink size={12} /> Buka di Drive
                      </a>
                    </div>
                  )}

                  {botUploadError && (
                    <div
                      style={{
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid var(--danger)',
                        color: '#fca5a5',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <AlertCircle size={15} />
                        <span>{botUploadError}</span>
                      </div>
                      {onOpenDriveSettings && (
                        <button
                          type="button"
                          onClick={onOpenDriveSettings}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#38bdf8' }}
                        >
                          Pasang Bot
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Integrasi Database Google Drive */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                }}
              >
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <HardDrive size={14} color="#38bdf8" />
                  Database Google Drive (Link Arsip Cloud)
                </label>
                <a
                  href={driveSettings.folderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#38bdf8' }}
                >
                  <ExternalLink size={12} /> Buka Folder Drive
                </a>
              </div>

              <input
                type="url"
                value={googleDriveLink}
                onChange={(e) => setGoogleDriveLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="form-input"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                Tempel link Google Drive dokumen agar seluruh tim dapat menelusuri kembali arsip dokumen lama kapan saja.
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger)',
              color: '#fca5a5',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            <AlertTriangle size={18} color="var(--danger)" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Submit */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
            flexWrap: 'wrap',
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          {/* Bot Status Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: driveSettings.botWebhookUrl ? '#10b981' : '#f59e0b',
                boxShadow: driveSettings.botWebhookUrl
                  ? '0 0 10px rgba(16, 185, 129, 0.8)'
                  : '0 0 10px rgba(245, 158, 11, 0.8)',
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: '0.85rem' }}>
              {driveSettings.botWebhookUrl ? (
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#34d399' }}>Bot Drive Aktif:</strong> Saat tombol ditekan, bot langsung mendaftarkan ke Google Drive NBE.
                </span>
              ) : (
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#fbbf24' }}>Bot Belum Terhubung:</strong>{' '}
                  <button
                    type="button"
                    onClick={onOpenDriveSettings}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    Atur Webhook Bot di sini
                  </button>{' '}
                  agar upload langsung otomatis.
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || duplicate}
            style={{
              background: duplicate
                ? '#374151'
                : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              boxShadow: duplicate
                ? 'none'
                : '0 4px 16px rgba(5, 150, 105, 0.4)',
              borderRadius: '10px',
              padding: '0.85rem 2rem',
              fontSize: '1.02rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              cursor: duplicate || isSubmitting ? 'not-allowed' : 'pointer',
              opacity: duplicate ? 0.6 : 1,
              transition: 'all 0.2s ease',
              minWidth: '240px',
            }}
            onMouseEnter={(e) => {
              if (!duplicate && !isSubmitting) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(5, 150, 105, 0.55)';
              }
            }}
            onMouseLeave={(e) => {
              if (!duplicate && !isSubmitting) {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(5, 150, 105, 0.4)';
              }
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>{submittingStatus}</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                <span>Daftarkan & Simpan Dokumen</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* MODAL CEPAT TAMBAH KODE KATEGORI / SUB-KATEGORI */}
      {quickAddModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card modal-content"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {quickAddModal === 'subsubcategory'
                  ? 'Tambah Sub-sub Kategori Baru (AA)'
                  : quickAddModal === 'subcategory'
                  ? 'Tambah Sub-Kategori Surat Baru (ZZ)'
                  : 'Tambah Kategori Surat Baru (Document Type)'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setQuickAddModal(null);
                  setQuickCode('');
                  setQuickLabel('');
                  setQuickDesc('');
                  setQuickAddError(null);
                }}
                className="btn-icon"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {quickAddError && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--danger)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  fontSize: '0.825rem',
                }}
              >
                {quickAddError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setQuickAddError(null);
                const cCode = quickCode.trim().toUpperCase();
                const cLabel = quickLabel.trim();
                const cDesc = quickDesc.trim();

                if (!cCode) {
                  setQuickAddError('Kode wajib diisi.');
                  return;
                }
                if (!/^[A-Z0-9_-]{2,8}$/.test(cCode)) {
                  setQuickAddError('Kode harus 2-8 karakter alfanumerik (misal: AI, PE, CSMS).');
                  return;
                }
                if (!cLabel) {
                  setQuickAddError('Nama lengkap wajib diisi.');
                  return;
                }

                try {
                  const newItem: CodeDefinition = {
                    code: cCode,
                    label: `${cLabel} (${cCode})`,
                    description: cDesc || cLabel,
                    isCustom: true,
                  };

                  if (quickAddModal === 'subsubcategory') {
                    if (onAddSubSubCategory) {
                      onAddSubSubCategory(newItem);
                    } else {
                      addSubSubCategory(newItem);
                      pushAllLocalDataToCloud().catch(console.warn);
                    }
                    setSelectedSubSubCategory(cCode);
                  } else if (quickAddModal === 'subcategory') {
                    if (onAddSubCategory) {
                      onAddSubCategory(newItem);
                    } else {
                      addSubCategory(newItem);
                      pushAllLocalDataToCloud().catch(console.warn);
                    }
                    setSelectedSubCategory(cCode);
                  } else {
                    if (onAddDocumentType) {
                      onAddDocumentType(newItem);
                    } else {
                      addDocumentType(newItem);
                      pushAllLocalDataToCloud().catch(console.warn);
                    }
                    setSelectedType(cCode);
                    // Otomatis buat folder kategori di Google Drive jika bot aktif
                    if (driveSettings.botWebhookUrl) {
                      ensureCategoryFolderInDriveViaBot(
                        cCode,
                        newItem.label,
                        driveSettings.botWebhookUrl,
                        driveSettings.folderId || TARGET_FOLDER_ID
                      ).catch(console.error);
                    }
                  }

                  setQuickAddModal(null);
                  setQuickCode('');
                  setQuickLabel('');
                  setQuickDesc('');
                } catch (err: any) {
                  setQuickAddError(err.message || 'Gagal menambahkan kode.');
                }
              }}
            >
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  Kode Singkatan {quickAddModal === 'subsubcategory' ? '(2 Karakter, misal: AI, PB)' : quickAddModal === 'subcategory' ? '(2-4 Karakter, misal: PE, QC)' : '(misal: CSMS, IK)'} *
                </label>
                <input
                  type="text"
                  className="form-input mono"
                  placeholder={quickAddModal === 'subsubcategory' ? 'Contoh: AI' : quickAddModal === 'subcategory' ? 'Contoh: PE' : 'Contoh: CSMS'}
                  value={quickCode}
                  onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  required
                  autoFocus
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={
                    quickAddModal === 'subsubcategory'
                      ? 'Contoh: Audit Internal'
                      : quickAddModal === 'subcategory'
                      ? 'Contoh: Peralatan & Mesin'
                      : 'Contoh: Contractor Safety Management System'
                  }
                  value={quickLabel}
                  onChange={(e) => setQuickLabel(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                  Deskripsi / Keterangan Dokumen
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Keterangan singkat fungsi kategori ini"
                  value={quickDesc}
                  onChange={(e) => setQuickDesc(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddModal(null);
                    setQuickCode('');
                    setQuickLabel('');
                    setQuickDesc('');
                    setQuickAddError(null);
                  }}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  Simpan & Pilih
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
