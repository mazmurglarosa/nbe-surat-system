import React, { useState, useRef } from 'react';
import {
  Copy,
  Check,
  Upload,
  AlertTriangle,
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
  Folder,
  File,
  Trash2,
  Eye,
  Plus,
  Layers,
  ChevronRight,
  FileCheck,
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
  DocumentFileItem,
} from '../types';
import {
  generateDocumentCode,
  getNextSequenceNumber,
  isCodeDuplicate,
  validateDocumentCode,
  getRomanMonth,
} from '../utils/numbering';
import { GoogleDriveSettings, saveGoogleDriveSettings } from '../services/storage';
import {
  uploadFileToDriveViaBot,
  createDocumentFolderInDriveViaBot,
  createCategoryFolderInDriveViaBot,
  TARGET_FOLDER_URL,
  TARGET_FOLDER_ID,
} from '../services/googleDriveBot';
import { addSubCategory, addSubSubCategory, addDocumentType } from '../services/masterCodes';
import { pushAllLocalDataToCloud } from '../services/cloudSync';

function generateDocumentId(): string {
  return `doc-folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface UploadedFileState extends DocumentFileItem {
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface FolderGeneratorProps {
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

export const FolderGenerator: React.FC<FolderGeneratorProps> = ({
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

  // Quick Add Modal state
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

  // MULTI-FILE / FOLDER UPLOAD STATE
  const [folderFiles, setFolderFiles] = useState<UploadedFileState[]>([]);
  const [detectedFolderName, setDetectedFolderName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [previewFile, setPreviewFile] = useState<UploadedFileState | null>(null);

  // Registration Mode: 'single-bundle' = 1 DocumentRecord with multiple files; 'batch' = each file gets sequential code
  const [registrationMode, setRegistrationMode] = useState<'single-bundle' | 'batch'>('single-bundle');

  // Google Drive & Bot states
  const [googleDriveLink, setGoogleDriveLink] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittingStatus, setSubmittingStatus] = useState<string>('Menyimpan dokumen...');
  const [savedSuccessDocs, setSavedSuccessDocs] = useState<DocumentRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Multi-upload progress
  const [isBatchBotUploading, setIsBatchBotUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; currentFileName: string } | null>(null);

  // Refs for file & directory inputs
  const folderInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-update sequence number
  const autoSequence = getNextSequenceNumber(documents, selectedType);
  const effectiveSequence =
    isManualOverride && customSequence !== '' ? Number(customSequence) : autoSequence;

  // Auto-calculated code
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

  const activeCode = isManualOverride && manualCode.trim() ? manualCode.trim().toUpperCase() : autoGeneratedCode;

  // Check uniqueness
  const duplicate = isCodeDuplicate(activeCode, documents);
  const conflictingDoc = duplicate
    ? documents.find((d) => d.code.toUpperCase() === activeCode.toUpperCase())
    : null;

  // 1-Click Fix Code State
  const [fixedFoldersMap, setFixedFoldersMap] = useState<
    Record<string, { id: string; url: string; name: string }>
  >({});
  const [isFixingCode, setIsFixingCode] = useState<boolean>(false);
  const [fixNotification, setFixNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    categoryNotFound?: boolean;
    categoryCode?: string;
    categoryLabel?: string;
  } | null>(null);

  const currentFixedFolder = fixedFoldersMap[activeCode] || null;
  const isCodeFixed = Boolean(currentFixedFolder);

  // Fix Code Handler
  const handleFixCode = async () => {
    if (isCodeFixed || isFixingCode) return;

    if (duplicate) {
      setErrorMsg(`Kode "${activeCode}" sudah digunakan untuk dokumen lain. Tidak dapat di-fix.`);
      return;
    }

    setIsFixingCode(true);
    setFixNotification(null);

    try {
      if (driveSettings.botWebhookUrl) {
        const typeDef = docTypes.find((dt) => dt.code.toUpperCase() === selectedType.toUpperCase());
        const subDef = subCats.find((sc) => sc.code.toUpperCase() === selectedSubCategory.toUpperCase());
        const subSubDef = subSubCats.find((ssc) => ssc.code.toUpperCase() === selectedSubSubCategory.toUpperCase());
        const effectiveDocTitle = title.trim() || detectedFolderName || activeCode;

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
              `Folder Kategori '${selectedType}' belum ditemukan di Google Drive. Silakan buat folder kategori terlebih dahulu.`,
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
            message: `✓ Kode berhasil di-FIX! Folder Google Drive untuk "${effectiveDocTitle}" otomatis disiapkan${pathMsg}. Berkas-berkas di dalam folder ini akan otomatis diunggah ke dalamnya.`,
          });
        } else {
          setFixNotification({
            type: 'error',
            message:
              folderResult.error ||
              'Bot Google Drive gagal membuat folder baru. Silakan periksa webhook bot.',
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
          message: `✓ Kode di-fix secara lokal. (Tips: pasang URL Webhook Bot untuk auto-create folder di Google Drive).`,
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
      alert('URL Webhook Bot Google Apps Script belum disetel.');
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
          message: `✓ Folder kategori "${selectedType}" berhasil dibuat di Google Drive! Menyiapkan folder dokumen...`,
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

  // Date Change
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

  // Copy Code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // FILE PROCESSOR: reads multiple files & base64 preview
  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Detect folder name from webkitRelativePath if available
    let folderName = '';
    const firstPath = (fileArray[0] as any).webkitRelativePath;
    if (firstPath) {
      const parts = firstPath.split('/');
      if (parts.length > 1) {
        folderName = parts[0];
      }
    }

    if (folderName && !title) {
      setTitle(folderName.replace(/[_-]/g, ' '));
      setDetectedFolderName(folderName);
    }

    const readers: Promise<UploadedFileState>[] = fileArray.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        const relPath = (file as any).webkitRelativePath || file.name;
        reader.onload = () => {
          resolve({
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            dataUrl: reader.result as string,
            relativePath: relPath,
            uploadStatus: 'pending',
          });
        };
        reader.onerror = () => {
          resolve({
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            relativePath: relPath,
            uploadStatus: 'pending',
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((newItems) => {
      setFolderFiles((prev) => {
        // Filter duplicate filenames
        const existingNames = new Set(prev.map((f) => f.name));
        const nonDuplicates = newItems.filter((f) => !existingNames.has(f.name));
        return [...prev, ...nonDuplicates];
      });
    });
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleMultiFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFolderFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (previewFile?.id === fileId) {
      setPreviewFile(null);
    }
  };

  const handleClearAllFiles = () => {
    setFolderFiles([]);
    setPreviewFile(null);
  };

  // BATCH GOOGLE DRIVE UPLOAD VIA BOT
  const handleBatchUploadViaBot = async () => {
    if (folderFiles.length === 0) {
      alert('Pilih folder atau berkas-berkas terlebih dahulu.');
      return;
    }

    if (!driveSettings.botWebhookUrl) {
      if (onOpenDriveSettings) {
        onOpenDriveSettings();
      } else {
        alert('URL Webhook Bot Google Apps Script belum disetel.');
      }
      return;
    }

    // Auto fix folder if not yet fixed
    let targetFolderId = currentFixedFolder?.id;
    if (!targetFolderId) {
      await handleFixCode();
      targetFolderId = fixedFoldersMap[activeCode]?.id || driveSettings.folderId || TARGET_FOLDER_ID;
    }

    setIsBatchBotUploading(true);
    let successCount = 0;

    for (let i = 0; i < folderFiles.length; i++) {
      const file = folderFiles[i];
      if (file.uploadStatus === 'success' && file.googleDriveLink) {
        successCount++;
        continue;
      }

      setUploadProgress({
        current: i + 1,
        total: folderFiles.length,
        currentFileName: file.name,
      });

      // Update status to uploading
      setFolderFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, uploadStatus: 'uploading' } : f))
      );

      try {
        if (!file.dataUrl) throw new Error('Data berkas tidak terbaca');

        const uploadRes = await uploadFileToDriveViaBot(
          file.dataUrl,
          file.name,
          file.type,
          driveSettings.botWebhookUrl,
          {
            folderId: targetFolderId,
            documentCode: activeCode,
            uploadedBy: createdBy.trim() || 'Staff NBE',
          }
        );

        if (uploadRes.success && uploadRes.viewUrl) {
          successCount++;
          setFolderFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? {
                    ...f,
                    uploadStatus: 'success',
                    googleDriveLink: uploadRes.viewUrl,
                    driveFileId: uploadRes.fileId,
                  }
                : f
            )
          );
        } else {
          setFolderFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? {
                    ...f,
                    uploadStatus: 'error',
                    errorMessage: uploadRes.error || 'Gagal diunggah',
                  }
                : f
            )
          );
        }
      } catch (err: any) {
        setFolderFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  uploadStatus: 'error',
                  errorMessage: err.message,
                }
              : f
          )
        );
      }
    }

    setIsBatchBotUploading(false);
    setUploadProgress(null);

    const folderUrl = currentFixedFolder?.url || `https://drive.google.com/drive/folders/${targetFolderId}`;
    setGoogleDriveLink(folderUrl);
    alert(`Selesai! ${successCount} dari ${folderFiles.length} berkas berhasil diunggah ke folder Google Drive.`);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Judul Folder / Dokumen wajib diisi.');
      return;
    }

    if (!createdBy.trim()) {
      setErrorMsg('Nama Pembuat Dokumen (Created By) wajib diisi.');
      return;
    }

    if (folderFiles.length === 0) {
      setErrorMsg('Harap pilih minimal 1 berkas atau 1 folder untuk didaftarkan.');
      return;
    }

    // Uniqueness validation
    if (duplicate) {
      setErrorMsg(
        `Kode "${activeCode}" sudah digunakan untuk dokumen "${conflictingDoc?.title}". 1 kode dokumen hanya boleh berlaku untuk 1 entitas dokumen.`
      );
      return;
    }

    if (isManualOverride && manualCode) {
      const validation = validateDocumentCode(manualCode);
      if (!validation.isValid) {
        setErrorMsg(validation.message || 'Format kode dokumen tidak valid.');
        return;
      }
    }

    setIsSubmitting(true);
    setSubmittingStatus('Menyiapkan pendaftaran folder...');

    try {
      const romanMonth = getRomanMonth(monthNumber);
      const targetFolderId = currentFixedFolder?.id || driveSettings.folderId || TARGET_FOLDER_ID;
      const targetFolderUrl = currentFixedFolder?.url || driveSettings.folderUrl || TARGET_FOLDER_URL;

      // MODE A: SINGLE BUNDLE (1 DocumentRecord containing all files)
      if (registrationMode === 'single-bundle') {
        setSubmittingStatus('Mengunggah & menyinkronkan seluruh berkas dalam folder...');

        // Convert files to DocumentFileItem
        const fileItems: DocumentFileItem[] = folderFiles.map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.type,
          dataUrl: f.dataUrl,
          relativePath: f.relativePath,
          googleDriveLink: f.googleDriveLink || targetFolderUrl,
          driveFileId: f.driveFileId,
          uploadedAt: getNowIsoString(),
        }));

        const totalBytes = folderFiles.reduce((acc, f) => acc + f.size, 0);
        const folderDoc: DocumentRecord = {
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
          fileName: `${folderFiles.length} berkas (${detectedFolderName || title.trim()})`,
          fileSize: totalBytes,
          fileType: 'folder',
          fileData: folderFiles[0]?.dataUrl,
          googleDriveLink: googleDriveLink || targetFolderUrl,
          driveFolderId: targetFolderId,
          driveFolderUrl: targetFolderUrl,
          isFixed: isCodeFixed,
          isFolder: true,
          folderName: detectedFolderName || title.trim(),
          files: fileItems,
          isManualCode: isManualOverride,
          legacyNotes: legacyNotes.trim() || undefined,
          revisions: [
            {
              revision: revision,
              date: formatIssueDate(issueDate),
              description: revision === 0 ? 'Pendaftaran Folder Pertama' : 'Pembaruan Folder Dokumen',
              revisedBy: createdBy.trim(),
            },
          ],
          createdAt: getNowIsoString(),
          updatedAt: getNowIsoString(),
        };

        await onSaveDocument(folderDoc);
        setSavedSuccessDocs([folderDoc]);
      } else {
        // MODE B: BATCH REGISTRATION (Each file gets its own sequential document code)
        setSubmittingStatus(`Mendaftarkan ${folderFiles.length} dokumen secara berurutan...`);
        const createdDocs: DocumentRecord[] = [];
        let runningSeq = effectiveSequence;

        for (let i = 0; i < folderFiles.length; i++) {
          const file = folderFiles[i];
          const fileSeq = runningSeq + i;
          const fileCode = generateDocumentCode(
            fileSeq,
            selectedType,
            selectedSubCategory,
            selectedSubSubCategory,
            selectedDivision,
            selectedApprover,
            monthNumber,
            year
          );

          // Clean title from file name
          const cleanDocTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          const docItem: DocumentRecord = {
            id: generateDocumentId(),
            code: fileCode,
            seqNumber: fileSeq,
            typeCode: selectedType,
            subCategoryCode: selectedSubCategory,
            subSubCategoryCode: selectedSubSubCategory,
            divisionCode: selectedDivision,
            approverCode: selectedApprover,
            monthRoman: romanMonth,
            year: year,
            title: `${title.trim()} - ${cleanDocTitle}`,
            description: description.trim() || undefined,
            revision: revision,
            status: status,
            createdBy: createdBy.trim(),
            approvedBy: approvedBy.trim() || undefined,
            verifiedBy: verifiedBy.trim() || undefined,
            issueDate: issueDate,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileData: file.dataUrl,
            googleDriveLink: file.googleDriveLink || targetFolderUrl,
            driveFolderId: targetFolderId,
            driveFolderUrl: targetFolderUrl,
            isFixed: isCodeFixed,
            isFolder: false,
            isManualCode: false,
            revisions: [
              {
                revision: revision,
                date: formatIssueDate(issueDate),
                description: 'Pendaftaran Dokumen Batch',
                revisedBy: createdBy.trim(),
              },
            ],
            createdAt: getNowIsoString(),
            updatedAt: getNowIsoString(),
          };

          await onSaveDocument(docItem);
          createdDocs.push(docItem);
        }

        setSavedSuccessDocs(createdDocs);
      }

      // Reset form
      setTitle('');
      setDescription('');
      setFolderFiles([]);
      setDetectedFolderName('');
      setGoogleDriveLink('');
      setFixNotification(null);
      if (isManualOverride) {
        setIsManualOverride(false);
        setManualCode('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan folder dokumen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalFolderSize = folderFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* SUCCESS MODAL / BANNER */}
      {savedSuccessDocs.length > 0 && (
        <div
          className="glass-card animate-fade-in"
          style={{
            margin: '1.5rem 0',
            padding: '1.75rem',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            background: 'rgba(16, 185, 129, 0.08)',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>
                {savedSuccessDocs.length === 1
                  ? 'Folder Dokumen Berhasil Didaftarkan & Disimpan!'
                  : `${savedSuccessDocs.length} Dokumen Batch Berhasil Didaftarkan!`}
              </h3>

              {savedSuccessDocs.length === 1 ? (
                <>
                  <p style={{ marginTop: '0.4rem', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    Kode Resmi Folder:{' '}
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
                      {savedSuccessDocs[0].code}
                    </span>
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                    Judul: <strong>{savedSuccessDocs[0].title}</strong> | Total Berkas Terlampir:{' '}
                    <strong>{savedSuccessDocs[0].files?.length || 1} file</strong>
                  </p>
                </>
              ) : (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Dokumen-dokumen berikut telah dibuat dengan nomor resmi berurutan:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                    {savedSuccessDocs.map((d) => (
                      <span
                        key={d.id}
                        className="mono"
                        style={{
                          fontSize: '0.78rem',
                          padding: '0.2rem 0.5rem',
                          background: 'rgba(0,0,0,0.25)',
                          borderRadius: '4px',
                          color: '#38bdf8',
                        }}
                      >
                        {d.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                {savedSuccessDocs[0]?.googleDriveLink && (
                  <a
                    href={savedSuccessDocs[0].googleDriveLink}
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
                    <span>Buka Folder di Google Drive</span>
                    <ExternalLink size={12} />
                  </a>
                )}
                <button onClick={onNavigateToDocuments} className="btn btn-primary btn-sm">
                  <span>Lihat di Dashboard Dokumen</span>
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setSavedSuccessDocs([])}
                  className="btn btn-secondary btn-sm"
                >
                  <span>+ Daftarkan Folder Lainnya</span>
                </button>
              </div>
            </div>
            <button
              onClick={() => setSavedSuccessDocs([])}
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.2rem' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* HEADER PAGE */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '1.5rem 0 1.25rem 0',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              }}
            >
              <FolderPlus size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Daftarkan Folder (Multi-File Sekaligus)
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Unggah banyak berkas atau 1 direktori folder sekaligus ke arsip Google Drive dengan penomoran resmi PT Nirwana Bhumi Energi.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onNavigateToDocuments} className="btn btn-secondary btn-sm">
            <span>Kembali ke Dashboard</span>
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div
          className="glass-card animate-fade-in"
          style={{
            margin: '1rem 0',
            padding: '1rem 1.25rem',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#f87171',
          }}
        >
          <AlertCircle size={20} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{errorMsg}</span>
        </div>
      )}

      {/* MAIN REGISTRATION FORM */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {/* STEP 1: CATEGORY SELECTION */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    background: 'var(--primary)',
                    color: '#000',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                  }}
                >
                  1
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Pilih Kategori Dokumen (Document Type Code)
                </h3>
              </div>
              {onNavigateToMasterCategories && (
                <button
                  type="button"
                  onClick={onNavigateToMasterCategories}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.78rem' }}
                >
                  <span>Kelola Master Kode</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {docTypes.map((dt) => {
                const isSelected = selectedType.toUpperCase() === dt.code.toUpperCase();
                return (
                  <div
                    key={dt.code}
                    onClick={() => setSelectedType(dt.code)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected
                        ? '1.5px solid var(--primary)'
                        : '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--primary-glow)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontWeight: 800, fontSize: '0.95rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                        {dt.code}
                      </span>
                      {isSelected && <Check size={16} color="var(--primary)" />}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.3 }}>
                      {dt.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sub-categories if CSMS or selected */}
            {(selectedType.toUpperCase() === 'CSMS' || subCats.length > 0) && (
              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '1rem',
                  borderTop: '1px dashed var(--border-subtle)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#22d3ee' }}>
                    Sub-Kategori (Kode ZZ)
                  </label>
                  <select
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                    className="form-select"
                    style={{ fontSize: '0.85rem' }}
                  >
                    {subCats.map((sc) => (
                      <option key={sc.code} value={sc.code}>
                        {sc.code} - {sc.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: '#c084fc' }}>
                    Sub-sub Kategori (Kode AA)
                  </label>
                  <select
                    value={selectedSubSubCategory}
                    onChange={(e) => setSelectedSubSubCategory(e.target.value)}
                    className="form-select"
                    style={{ fontSize: '0.85rem' }}
                  >
                    {subSubCats.map((ssc) => (
                      <option key={ssc.code} value={ssc.code}>
                        {ssc.code} - {ssc.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2 & 3: DIVISION & APPROVER */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Step 2: Division */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span
                  style={{
                    background: 'var(--primary)',
                    color: '#000',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                  }}
                >
                  2
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Penerbit Surat (Division Code)
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {divs.map((d) => {
                  const isSelected = selectedDivision.toUpperCase() === d.code.toUpperCase();
                  return (
                    <div
                      key={d.code}
                      onClick={() => setSelectedDivision(d.code)}
                      style={{
                        padding: '0.75rem 0.9rem',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected
                          ? '1.5px solid #0284c7'
                          : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(2, 132, 199, 0.15)' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <span className="mono" style={{ fontWeight: 800, color: isSelected ? '#38bdf8' : 'var(--text-main)' }}>
                          {d.code}
                        </span>{' '}
                        - <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{d.label}</span>
                      </div>
                      {isSelected && <Check size={16} color="#38bdf8" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Approver & Date */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span
                  style={{
                    background: 'var(--primary)',
                    color: '#000',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                  }}
                >
                  3
                </span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  Pengesahan & Tanggal Terbit
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    Otoritas Pengesahan (Approver Position)
                  </label>
                  <select
                    value={selectedApprover}
                    onChange={(e) => {
                      setSelectedApprover(e.target.value);
                      const def = apprvs.find((a) => a.code === e.target.value);
                      if (def) setApprovedBy(def.label);
                    }}
                    className="form-select"
                    style={{ fontSize: '0.85rem' }}
                  >
                    {apprvs.map((a) => (
                      <option key={a.code} value={a.code}>
                        {a.code} - {a.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>
                    Tanggal Penerbitan Dokumen
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={handleDateChange}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    Bulan Romawi: <strong className="mono">{getRomanMonth(monthNumber)}</strong> | Tahun: <strong className="mono">{year}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GENERATED NUMBER PREVIEW & FIX CODE ACTION */}
          <div
            className="glass-card"
            style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(0, 212, 178, 0.08) 100%)',
              border: '1.5px solid rgba(0, 212, 178, 0.35)',
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
                <span
                  style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.05em',
                    fontWeight: 700,
                  }}
                >
                  Kode Resmi Dokumen / Folder Otomatis
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(0, 212, 178, 0.4)',
                    }}
                  >
                    {activeCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="btn btn-secondary btn-sm"
                    title="Salin Kode ke Clipboard"
                  >
                    {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                    <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isManualOverride) {
                        setIsManualOverride(true);
                        setManualCode(autoGeneratedCode);
                        setCustomSequence(autoSequence);
                      } else {
                        setIsManualOverride(false);
                        setManualCode('');
                        setCustomSequence('');
                      }
                    }}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.78rem', color: isManualOverride ? '#f59e0b' : 'var(--text-secondary)' }}
                  >
                    <Code2 size={14} />
                    <span>{isManualOverride ? 'Gunakan Auto-Number' : 'Ubah Kode Manual'}</span>
                  </button>
                </div>
              </div>

              {/* 1-Click Fix Code Button */}
              <div>
                <button
                  type="button"
                  onClick={handleFixCode}
                  disabled={isFixingCode || isCodeFixed}
                  className="btn btn-sm"
                  style={{
                    background: isCodeFixed
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'linear-gradient(90deg, #0284c7 0%, #00d4b2 100%)',
                    border: isCodeFixed
                      ? '1px solid rgba(16, 185, 129, 0.5)'
                      : 'none',
                    color: isCodeFixed ? '#34d399' : '#fff',
                    fontWeight: 700,
                    padding: '0.6rem 1.1rem',
                    cursor: isCodeFixed ? 'default' : 'pointer',
                    boxShadow: isCodeFixed ? 'none' : '0 4px 14px rgba(0, 212, 178, 0.3)',
                  }}
                >
                  {isFixingCode ? (
                    <>
                      <Loader2 size={15} className="spin" />
                      <span>Menyiapkan Folder Google Drive...</span>
                    </>
                  ) : isCodeFixed ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>✓ Kode & Folder Drive Telah Di-FIX</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>1-Click FIX Kode & Folder Drive</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Manual Override Inputs */}
            {isManualOverride && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: 'rgba(245, 158, 11, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                <div style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Mode Ubah Kode Manual / Dokumen Lampau (Legacy Backdating)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Nomor Urut Manual</label>
                    <input
                      type="number"
                      value={customSequence}
                      onChange={(e) => setCustomSequence(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Misal: 1"
                      className="form-input"
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Kode Resmi Lengkap</label>
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="0001-SOP-GNR-CEO-X-2026"
                      className="form-input"
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Fix Notification */}
            {fixNotification && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background:
                    fixNotification.type === 'success'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                  border:
                    fixNotification.type === 'success'
                      ? '1px solid rgba(16, 185, 129, 0.35)'
                      : '1px solid rgba(239, 68, 68, 0.35)',
                  color: fixNotification.type === 'success' ? '#34d399' : '#f87171',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span>{fixNotification.message}</span>
                {fixNotification.categoryNotFound && (
                  <button
                    type="button"
                    onClick={handleCreateCategoryFolderNow}
                    disabled={isCreatingCategoryFolder}
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  >
                    {isCreatingCategoryFolder ? 'Membuat...' : 'Buat Folder Kategori Sekarang'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* STEP 4: METADATA DETAILS */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>
              Rincian Dokumen / Folder
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>
                  Judul Folder / Dokumen <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: PROSEDUR PENGENDALIAN DOKUMEN & FORMULIR EVALUASI"
                  className="form-input"
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>
                  Deskripsi / Lingkup Folder Dokumen (Opsional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan isi bundel dokumen atau folder ini..."
                  className="form-input"
                  rows={2}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>
                  Pembuat Dokumen (Created By) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  placeholder="Misal: Mazmur Gusti Agung Larosa"
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>
                  Pemeriksa (Verified By)
                </label>
                <input
                  type="text"
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  placeholder="Management Representative (MR)"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>
                  Pengesah (Approved By)
                </label>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="President Director (CEO)"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.82rem' }}>Status & Revisi</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                    className="form-select"
                  >
                    <option value="Published">Published</option>
                    <option value="Approved">Approved</option>
                    <option value="In Review">In Review</option>
                    <option value="Draft">Draft</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={revision}
                    onChange={(e) => setRevision(parseInt(e.target.value) || 0)}
                    className="form-input"
                    style={{ width: '80px' }}
                    title="Nomor Revisi"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 5: THE CORE MULTI-FILE / FOLDER UPLOADER */}
          <div
            className="glass-card"
            style={{
              padding: '1.75rem',
              border: '1.5px solid rgba(2, 132, 199, 0.4)',
              background: 'rgba(2, 132, 199, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FolderPlus size={22} color="#38bdf8" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                    Upload Banyak File (Folder) Sekaligus
                  </h3>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Pilih 1 folder direktori utuh atau pilih banyak file sekaligus dari komputer Anda.
                </p>
              </div>

              {/* Mode Toggle: 1 Bundle vs Batch Numbers */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-secondary)',
                  padding: '0.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setRegistrationMode('single-bundle')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background:
                      registrationMode === 'single-bundle'
                        ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                        : 'transparent',
                    color: registrationMode === 'single-bundle' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                  title="Seluruh file dikelompokkan dalam 1 Kode Dokumen Folder Resmi"
                >
                  📦 1 Folder Bundel Dokumen
                </button>
                <button
                  type="button"
                  onClick={() => setRegistrationMode('batch')}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background:
                      registrationMode === 'batch'
                        ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                        : 'transparent',
                    color: registrationMode === 'batch' ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                  title="Masing-masing file otomatis dibuatkan nomor urut surat resmi terpisah"
                >
                  ⚡ Batch (Nomor Berurutan per Berkas)
                </button>
              </div>
            </div>

            {/* Hidden native input elements for Folder & Multi-files */}
            <input
              type="file"
              ref={folderInputRef}
              onChange={handleFolderSelect}
              style={{ display: 'none' }}
              // @ts-ignore: React types for webkitdirectory
              webkitdirectory=""
              directory=""
              multiple
            />
            <input
              type="file"
              ref={multiFileInputRef}
              onChange={handleMultiFilesSelect}
              multiple
              style={{ display: 'none' }}
            />

            {/* DRAG & DROP ZONE */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragging
                  ? '2px dashed var(--primary)'
                  : '2px dashed rgba(2, 132, 199, 0.4)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                background: isDragging
                  ? 'rgba(0, 212, 178, 0.08)'
                  : 'rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onClick={() => {
                if (folderFiles.length === 0) {
                  folderInputRef.current?.click();
                }
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(2, 132, 199, 0.15)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                }}
              >
                <Upload size={28} />
              </div>

              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Tarik & Lepas Berkas atau Folder ke Sini
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '520px', margin: '0.35rem auto 1.25rem auto' }}>
                Mendukung PDF, Dokumen Word, Excel, Gambar, maupun seluruh isi subfolder.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    folderInputRef.current?.click();
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.1rem' }}
                >
                  <Folder size={16} />
                  <span>Pilih Folder dari Komputer</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    multiFileInputRef.current?.click();
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.1rem' }}
                >
                  <FileText size={16} />
                  <span>Pilih Banyak File (Multi-File)</span>
                </button>
              </div>
            </div>

            {/* LIST OF SELECTED FILES */}
            {folderFiles.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                      Daftar Berkas Terpilih ({folderFiles.length} berkas)
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '10px',
                        background: 'rgba(2, 132, 199, 0.2)',
                        color: '#38bdf8',
                        fontWeight: 600,
                      }}
                    >
                      Total: {formatBytes(totalFolderSize)}
                    </span>
                    {detectedFolderName && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '10px',
                          background: 'rgba(168, 85, 247, 0.2)',
                          color: '#c084fc',
                          fontWeight: 600,
                        }}
                      >
                        Folder: {detectedFolderName}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Upload to Drive Button */}
                    <button
                      type="button"
                      onClick={handleBatchUploadViaBot}
                      disabled={isBatchBotUploading}
                      className="btn btn-sm"
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#34d399',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                      title="Unggah semua berkas langsung ke folder Google Drive via Bot"
                    >
                      {isBatchBotUploading ? (
                        <>
                          <Loader2 size={13} className="spin" />
                          <span>Mengunggah ke Drive...</span>
                        </>
                      ) : (
                        <>
                          <Bot size={14} />
                          <span>Upload Semua ke Drive Bot</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => multiFileInputRef.current?.click()}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <Plus size={13} />
                      <span>Tambah Berkas</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearAllFiles}
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#f87171', fontSize: '0.75rem' }}
                    >
                      <Trash2 size={13} />
                      <span>Hapus Semua</span>
                    </button>
                  </div>
                </div>

                {/* Multi-upload progress bar */}
                {uploadProgress && (
                  <div
                    style={{
                      margin: '0.75rem 0',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(2, 132, 199, 0.15)',
                      border: '1px solid rgba(2, 132, 199, 0.35)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                        Mengunggah {uploadProgress.current} dari {uploadProgress.total}:{' '}
                        <strong>{uploadProgress.currentFileName}</strong>
                      </span>
                      <span style={{ fontWeight: 700 }}>
                        {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                      </span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                          background: 'linear-gradient(90deg, #0284c7, #10b981)',
                          transition: 'width 0.2s ease',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Table / List of Files */}
                <div
                  style={{
                    maxHeight: '340px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.6rem 0.85rem' }}>#</th>
                        <th style={{ padding: '0.6rem 0.85rem' }}>Nama Berkas</th>
                        <th style={{ padding: '0.6rem 0.85rem' }}>Ukuran</th>
                        <th style={{ padding: '0.6rem 0.85rem' }}>Status Drive</th>
                        <th style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {folderFiles.map((f, idx) => (
                        <tr
                          key={f.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: previewFile?.id === f.id ? 'rgba(2, 132, 199, 0.1)' : 'transparent',
                          }}
                        >
                          <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-muted)', width: '30px' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '0.6rem 0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <File size={15} color="#38bdf8" />
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' }}>
                                  {f.name}
                                </div>
                                {f.relativePath && f.relativePath !== f.name && (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {f.relativePath}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-secondary)' }}>
                            {formatBytes(f.size)}
                          </td>
                          <td style={{ padding: '0.6rem 0.85rem' }}>
                            {f.uploadStatus === 'success' ? (
                              <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600, fontSize: '0.75rem' }}>
                                <CheckCircle2 size={13} /> Terunggah
                              </span>
                            ) : f.uploadStatus === 'uploading' ? (
                              <span style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                                <Loader2 size={13} className="spin" /> Mengunggah...
                              </span>
                            ) : f.uploadStatus === 'error' ? (
                              <span style={{ color: '#f87171', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }} title={f.errorMessage}>
                                <AlertCircle size={13} /> Gagal
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                Lokal (Siap Simpan)
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.6rem 0.85rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                              {f.dataUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewFile(f)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '0.25rem', color: 'var(--primary)' }}
                                  title="Pratinjau Berkas"
                                >
                                  <Eye size={14} />
                                </button>
                              )}
                              {f.googleDriveLink && (
                                <a
                                  href={f.googleDriveLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '0.25rem', color: '#38bdf8' }}
                                  title="Buka Berkas di Google Drive"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(f.id)}
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '0.25rem', color: '#f87171' }}
                                title="Hapus Berkas dari Daftar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PREVIEW MODAL FOR SELECTED FILE */}
            {previewFile && (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Eye size={15} color="var(--primary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pratinjau: {previewFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewFile(null)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '0.2rem' }}
                  >
                    <X size={16} />
                  </button>
                </div>
                {previewFile.type.includes('pdf') || previewFile.name.endsWith('.pdf') ? (
                  <iframe
                    src={previewFile.dataUrl}
                    style={{ width: '100%', height: '360px', border: 'none', borderRadius: 'var(--radius-sm)' }}
                    title={previewFile.name}
                  />
                ) : previewFile.type.startsWith('image/') ? (
                  <img
                    src={previewFile.dataUrl}
                    alt={previewFile.name}
                    style={{ maxHeight: '360px', maxWidth: '100%', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                  />
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Pratinjau langsung tidak didukung untuk tipe file ini ({previewFile.type}). Berkas tetap akan tersimpan dengan aman ke folder resmi.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON FOOTER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '1.5rem',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                {registrationMode === 'single-bundle'
                  ? `Daftarkan 1 Folder Bundel (${folderFiles.length} berkas)`
                  : `Daftarkan ${folderFiles.length} Dokumen Batch`}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Kode Resmi: <strong className="mono" style={{ color: 'var(--primary)' }}>{activeCode}</strong> | Total Ukuran: {formatBytes(totalFolderSize)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onNavigateToDocuments}
                className="btn btn-secondary"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSubmitting || duplicate || folderFiles.length === 0}
                className="btn btn-primary"
                style={{
                  padding: '0.75rem 1.75rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 16px rgba(0, 212, 178, 0.35)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    <span>{submittingStatus}</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Daftarkan & Simpan Folder</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
