import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  Upload,
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
  Save,
  FolderPlus,
  Folder,
  File,
  Trash2,
  Eye,
  Plus,
  ChevronRight,
  ChevronLeft,
  FileCheck,
  ArrowRight,
  Layers,
  FileSpreadsheet,
  Download,
  RefreshCw,
  FolderTree,
  Edit3,
  Maximize2,
  Minimize2,
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
  RevisionRecord,
  DocumentLanguage,
} from '../types';
import {
  generateDocumentCode,
  getNextSequenceNumber,
  isCodeDuplicate,
  validateDocumentCode,
  getRomanMonth,
} from '../utils/numbering';
import { GoogleDriveSettings } from '../services/storage';
import {
  uploadFileToDriveViaBot,
  createHierarchicalDocumentFolderViaBot,
  createCategoryFolderInDriveViaBot,
  TARGET_FOLDER_URL,
  TARGET_FOLDER_ID,
  getCleanLongName,
} from '../services/googleDriveBot';
import {
  generateStandardNbeDocx,
  DocumentTemplateData,
} from '../services/docTemplateGenerator';
import {
  loadTemplateSettings,
  DocumentTemplateSettings,
} from '../services/templateSettings';
import {
  getGoogleDocsRegistry,
  saveGoogleDocEntry,
  convertWordToGoogleDocViaMcp,
  SyncedGoogleDoc,
} from '../services/googleDocsService';
import { LanguageSelector } from './LanguageSelector';
import { A4DocumentPreview } from './A4DocumentPreview';
import { generateAndDownloadNbeDocx, generateNbeDocxBlob, NbeDocumentPayload } from '../utils/nbeDocxGenerator';
import { extractDocxData, extractDocxParagraphs, DEFAULT_NBE_BODY_PARAGRAPHS, DocxTableData } from '../utils/docxExtractor';

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
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '');
}

function normalizeNameForCompare(fileName: string): string {
  return stripFileExtension(fileName)
    .toLowerCase()
    .replace(/[_\-\s]+/g, '');
}

export function romanToNumber(roman: string): number {
  const romanMap: Record<string, number> = {
    I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6,
    VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
  };
  return romanMap[roman.toUpperCase()] || 10;
}

export interface ParsedNbeFile {
  hasCode: boolean;
  code?: string;
  seq?: number;
  typeCode?: string;
  divCode?: string;
  apprvCode?: string;
  monthNumber?: number;
  year?: number;
  title: string;
}

export function parseNbeFileName(fileName: string): ParsedNbeFile {
  const base = stripFileExtension(fileName);
  // Pattern: 0001-FOR-AUD-CEO-X-2026 or 0001-KB-GNR-CEO-X-2026 with optional title
  const codeRegex = /^([0-9]{4})-([A-Za-z0-9]+)-([A-Za-z0-9]+)-([A-Za-z0-9]+)-([IVXLCDM]+)-([0-9]{4})(?:\s*[-–]\s*(.*))?$/i;
  const match = base.match(codeRegex);
  if (match) {
    const rawCode = `${match[1]}-${match[2]}-${match[3]}-${match[4]}-${match[5]}-${match[6]}`.toUpperCase();
    const typeCode = match[2].toUpperCase();
    const divCode = match[3].toUpperCase();
    const apprvCode = match[4].toUpperCase();
    const rawTitle = (match[7] || '').trim();
    const title = rawTitle ? rawTitle.toUpperCase().replace(/[_-]/g, ' ') : rawCode;
    return {
      hasCode: true,
      code: rawCode,
      seq: parseInt(match[1]),
      typeCode,
      divCode,
      apprvCode,
      monthNumber: romanToNumber(match[5]),
      year: parseInt(match[6]),
      title,
    };
  }
  return {
    hasCode: false,
    title: base.toUpperCase().replace(/[_-]/g, ' '),
  };
}

export interface AnalyzedFileItem extends DocumentFileItem {
  fileFormat: 'word' | 'pdf' | 'other';
  isAutoConverted?: boolean;
  pairedWith?: string;
  originalFile?: File;
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export interface FileMetadataCustomization {
  title: string;
  code: string;
  issueDate: string;
  revision: number;
  status: DocumentStatus;
  preparedBy: string;
  verifiedBy: string;
  approvedBy: string;
  description: string;
  revisions: RevisionRecord[];
  typeCode: string;
  subCategoryCode?: string;
  subSubCategoryCode?: string;
  divisionCode: string;
  approverCode: string;
  preservedBodyParagraphs?: string[];
  preservedBodyTables?: DocxTableData[];
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
}) => {
  const docTypes = documentTypes && documentTypes.length > 0 ? documentTypes : DOCUMENT_TYPES;
  const subCats = subCategories && subCategories.length > 0 ? subCategories : SUB_CATEGORIES;
  const subSubCats = subSubCategories && subSubCategories.length > 0 ? subSubCategories : SUB_SUB_CATEGORIES;
  const divs = divisions && divisions.length > 0 ? divisions : DIVISIONS;
  const apprvs = approvers && approvers.length > 0 ? approvers : APPROVERS;

  // CURRENT WORKFLOW STAGE: 1 = Upload, 2 = Analysis & Convert, 3 = Template & Preview, 4 = Drive Hierarchy & Save
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3 | 4>(1);

  // RAW UPLOADED FILES
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [detectedFolderName, setDetectedFolderName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // TAHAP 2: ANALYSIS STATE
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [wordFiles, setWordFiles] = useState<AnalyzedFileItem[]>([]);
  const [pdfFiles, setPdfFiles] = useState<AnalyzedFileItem[]>([]);
  const [autoConvertedCount, setAutoConvertedCount] = useState<number>(0);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'all' | 'word' | 'pdf'>('all');

  // TAHAP 3: STANDARDIZATION & METADATA
  const [selectedWordIndex, setSelectedWordIndex] = useState<number>(0);
  const [fileCustomizations, setFileCustomizations] = useState<Record<string, FileMetadataCustomization>>({});
  const [isGeneratingDocx, setIsGeneratingDocx] = useState<boolean>(false);
  const [selectedLang, setSelectedLang] = useState<DocumentLanguage>('id');

  // Template settings & Google Docs MCP integration
  const [templateSettings, setTemplateSettings] = useState<DocumentTemplateSettings>(() => loadTemplateSettings());
  const [googleDocsRegistry, setGoogleDocsRegistry] = useState<Record<string, SyncedGoogleDoc>>(() => getGoogleDocsRegistry());
  const [isConvertingToDocs, setIsConvertingToDocs] = useState<boolean>(false);
  const [docsModalNotice, setDocsModalNotice] = useState<SyncedGoogleDoc | null>(null);

  useEffect(() => {
    const handleTemplateUpdated = (e: any) => {
      setTemplateSettings(e.detail || loadTemplateSettings());
    };
    const handleDocsUpdated = (e: any) => {
      setGoogleDocsRegistry(e.detail || getGoogleDocsRegistry());
    };
    window.addEventListener('nbe_template_settings_updated', handleTemplateUpdated);
    window.addEventListener('nbe_google_docs_updated', handleDocsUpdated);
    return () => {
      window.removeEventListener('nbe_template_settings_updated', handleTemplateUpdated);
      window.removeEventListener('nbe_google_docs_updated', handleDocsUpdated);
    };
  }, []);

  // GLOBAL PARAMETERS (Shared defaults sesuai ACUAN_TEMPLATE_SURAT_KEPUTUSAN_DIREKSI_NBE)
  const [selectedType, setSelectedType] = useState<string>(docTypes.find((d) => d.code === 'KB')?.code || 'KB');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [selectedSubSubCategory, setSelectedSubSubCategory] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>(divs.find((d) => d.code === 'GNR')?.code || 'GNR');
  const [selectedApprover, setSelectedApprover] = useState<string>(apprvs.find((a) => a.code === 'CEO')?.code || 'CEO');

  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [monthNumber, setMonthNumber] = useState<number>(() => new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(() => new Date().getFullYear());

  const [preparedBy, setPreparedBy] = useState<string>('Mazmur Gusti Agung Larosa');
  const [verifiedBy, setVerifiedBy] = useState<string>('Dennis Raditya');
  const [approvedBy, setApprovedBy] = useState<string>('Bima Satryo Hartanto');
  const [status, setStatus] = useState<DocumentStatus>('Published');
  const [revision, setRevision] = useState<number>(0);

  // Manual code override
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [customSequence, setCustomSequence] = useState<number | ''>('');

  // TAHAP 4: DRIVE HIERARCHY & UPLOAD
  const [isDriveProcessing, setIsDriveProcessing] = useState<boolean>(false);
  const [driveProgress, setDriveProgress] = useState<{ current: number; total: number; currentFileName: string } | null>(null);
  const [hierarchyPath, setHierarchyPath] = useState<string>('');
  const [createdFolderResult, setCreatedFolderResult] = useState<{ id: string; url: string; name: string } | null>(null);
  const [savedSuccessDoc, setSavedSuccessDoc] = useState<DocumentRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreatingCategoryFolder, setIsCreatingCategoryFolder] = useState<boolean>(false);
  const [categoryMissingAlert, setCategoryMissingAlert] = useState<boolean>(false);

  // Accessible keyboard Escape handler for Google Docs modal dialog
  useEffect(() => {
    if (!docsModalNotice) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDocsModalNotice(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [docsModalNotice]);

  // Auto-calculated sequential code
  const autoSequence = getNextSequenceNumber(documents, selectedType);
  const effectiveSequence = isManualOverride && customSequence !== '' ? Number(customSequence) : autoSequence;
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

  // Active file being customized in Tahap 3
  const activeWordFile = wordFiles[selectedWordIndex] || null;
  const parsedActiveFile = activeWordFile ? parseNbeFileName(activeWordFile.name) : null;
  const activeCustomization: FileMetadataCustomization = (activeWordFile && fileCustomizations[activeWordFile.id]) || {
    title: parsedActiveFile?.title || (activeWordFile ? stripFileExtension(activeWordFile.name).toUpperCase().replace(/[_-]/g, ' ') : 'PENETAPAN SISTEM MANAJEMEN PENGENDALIAN DOKUMEN DAN PENUNJUKAN TIM DOCUMENT CONTROL CENTER (DCC)'),
    code: parsedActiveFile?.hasCode ? parsedActiveFile.code : activeCode,
    issueDate: issueDate,
    revision: revision,
    status: status,
    preparedBy: preparedBy,
    verifiedBy: verifiedBy,
    approvedBy: approvedBy,
    description: parsedActiveFile?.hasCode && parsedActiveFile.typeCode !== 'KB'
      ? `${docTypes.find((d) => d.code === parsedActiveFile.typeCode)?.label || parsedActiveFile.typeCode} PT Nirwana Bhumi Energy: ${parsedActiveFile.title}.`
      : `Surat Keputusan Direksi PT Nirwana Bhumi Energy sesuai ACUAN_TEMPLATE_SURAT_KEPUTUSAN_DIREKSI_NBE.`,
    revisions: [
      {
        revision: revision,
        date: formatIssueDate(issueDate),
        description: parsedActiveFile?.hasCode
          ? `Initial Edition – ${parsedActiveFile.title} (${parsedActiveFile.code})`
          : `Initial Edition – Penetapan Surat Keputusan Direksi (${activeCode})`,
        revisedBy: preparedBy,
      },
    ],
    typeCode: parsedActiveFile?.hasCode ? parsedActiveFile.typeCode : selectedType,
    subCategoryCode: selectedSubCategory,
    subSubCategoryCode: selectedSubSubCategory,
    divisionCode: parsedActiveFile?.hasCode ? parsedActiveFile.divCode : selectedDivision,
    approverCode: parsedActiveFile?.hasCode ? parsedActiveFile.apprvCode : selectedApprover,
    preservedBodyParagraphs: (parsedActiveFile?.hasCode && parsedActiveFile.typeCode !== 'KB') ? [] : DEFAULT_NBE_BODY_PARAGRAPHS,
    preservedBodyTables: [],
  };

  // On-demand extraction for active Word file if tables/paragraphs not loaded yet
  useEffect(() => {
    if (!activeWordFile) return;
    const current = fileCustomizations[activeWordFile.id];
    const targetFile = activeWordFile.originalFile || (activeWordFile as any).file;
    if (targetFile && (!current || (!current.preservedBodyTables && !current.preservedBodyParagraphs))) {
      extractDocxData(targetFile)
        .then((extracted) => {
          setFileCustomizations((prev) => {
            const existing = prev[activeWordFile.id] || activeCustomization;
            return {
              ...prev,
              [activeWordFile.id]: {
                ...existing,
                preservedBodyParagraphs: extracted.paragraphs && extracted.paragraphs.length > 0 ? extracted.paragraphs : existing.preservedBodyParagraphs,
                preservedBodyTables: extracted.tables && extracted.tables.length > 0 ? extracted.tables : existing.preservedBodyTables,
              },
            };
          });
        })
        .catch((err) => console.warn('On-demand extraction notice:', err));
    }
  }, [activeWordFile?.id]);

  // Sync date changes with Roman Month
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

  // -------------------------------------------------------------
  // TAHAP 1: UPLOAD HANDLING
  // -------------------------------------------------------------
  const handleSelectFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    // Detect root folder name
    let folderName = '';
    const firstRel = (list[0] as any).webkitRelativePath;
    if (firstRel) {
      const parts = firstRel.split('/');
      if (parts.length > 1) {
        folderName = parts[0];
      }
    }
    if (folderName) {
      setDetectedFolderName(folderName);
    }

    setRawFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const fresh = list.filter((f) => !existingNames.has(f.name));
      return [...prev, ...fresh];
    });
  };

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
      handleSelectFiles(e.dataTransfer.files);
    }
  };

  // -------------------------------------------------------------
  // TAHAP 2: AUTOMATIC ANALYSIS & WORD CONVERSION
  // -------------------------------------------------------------
  const executeAnalysis = async () => {
    if (rawFiles.length === 0) return;
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const words: AnalyzedFileItem[] = [];
      const pdfs: AnalyzedFileItem[] = [];

      for (const file of rawFiles) {
        const lowerName = file.name.toLowerCase();
        const relPath = (file as any).webkitRelativePath || file.name;
        const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        // Read file data URL
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });

        if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
          words.push({
            id,
            name: file.name,
            size: file.size,
            type: file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            dataUrl,
            relativePath: relPath,
            fileFormat: 'word',
            originalFile: file,
          });
        } else if (lowerName.endsWith('.pdf')) {
          pdfs.push({
            id,
            name: file.name,
            size: file.size,
            type: 'application/pdf',
            dataUrl,
            relativePath: relPath,
            fileFormat: 'pdf',
            originalFile: file,
          });
        } else {
          // Other format, treat as word candidate
          words.push({
            id,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            dataUrl,
            relativePath: relPath,
            fileFormat: 'word',
            originalFile: file,
          });
        }
      }

      // Check matching pairs between PDF and Word
      let autoConverted = 0;
      const finalWords = [...words];

      for (const pdf of pdfs) {
        const normPdf = normalizeNameForCompare(pdf.name);
        const matchingWord = words.find((w) => normalizeNameForCompare(w.name) === normPdf);

        if (matchingWord) {
          pdf.pairedWith = matchingWord.name;
          matchingWord.pairedWith = pdf.name;
        } else {
          // PDF DOES NOT HAVE WORD VERSION: Auto-generate Word file (.docx) for it!
          autoConverted++;
          const newDocxName = `${stripFileExtension(pdf.name)}.docx`;
          const cleanTitle = stripFileExtension(pdf.name).toUpperCase().replace(/[_-]/g, ' ');
          const seq = effectiveSequence + finalWords.length;
          const codeForThis = generateDocumentCode(
            seq,
            selectedType,
            selectedSubCategory,
            selectedSubSubCategory,
            selectedDivision,
            selectedApprover,
            monthNumber,
            year
          );

          // Create pure OpenXML Word file for this PDF using docx matching ACUAN_TEMPLATE_SURAT_KEPUTUSAN_DIREKSI_NBE
          const generated = await generateNbeDocxBlob({
            docCode: codeForThis,
            titleId: cleanTitle,
            titleEn: cleanTitle,
            categoryNameId: docTypes.find((d) => d.code === selectedType)?.label || 'KEBIJAKAN PERUSAHAAN (KB)',
            divisionName: divs.find((d) => d.code === selectedDivision)?.label || 'GENERAL & MANAGEMENT (GNR)',
            revisionNo: '0',
            issueDateId: formatIssueDate(issueDate),
            issueDateEn: new Date(issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            preparedBy: preparedBy,
            preparedRole: 'Director of Finance & Engineering / DCC Lead',
            verifiedBy: verifiedBy,
            verifiedRole: 'Director of Operations & Technology / CTO',
            approvedBy: approvedBy,
            approvedRole: 'President Director / CEO',
            language: selectedLang,
          });

          const convertedWordItem: AnalyzedFileItem = {
            id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: newDocxName,
            size: generated.blob.size,
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            dataUrl: generated.dataUrl,
            relativePath: (pdf.relativePath || pdf.name).replace(/\.pdf$/i, '.docx'),
            fileFormat: 'word',
            isAutoConverted: true,
            pairedWith: pdf.name,
          };

          pdf.pairedWith = newDocxName;
          finalWords.push(convertedWordItem);
        }
      }

      setWordFiles(finalWords);
      setPdfFiles(pdfs);
      setAutoConvertedCount(autoConverted);

      // Initialize customizations and standardize every Word file with dynamic content preservation
      const initialCustoms: Record<string, FileMetadataCustomization> = {};
      for (let index = 0; index < finalWords.length; index++) {
        const wf = finalWords[index];
        const parsedFile = parseNbeFileName(wf.name);
        const seq: number = (parsedFile.hasCode && typeof parsedFile.seq === 'number') ? parsedFile.seq : (effectiveSequence + index);
        const docTypeCode: string = (parsedFile.hasCode && parsedFile.typeCode) ? parsedFile.typeCode : selectedType;
        const divCode: string = (parsedFile.hasCode && parsedFile.divCode) ? parsedFile.divCode : selectedDivision;
        const apprvCode: string = (parsedFile.hasCode && parsedFile.apprvCode) ? parsedFile.apprvCode : selectedApprover;
        const codeForThis: string = (parsedFile.hasCode && parsedFile.code)
          ? parsedFile.code
          : generateDocumentCode(
              seq,
              docTypeCode,
              selectedSubCategory,
              selectedSubSubCategory,
              divCode,
              apprvCode,
              monthNumber,
              year
            );
        const cleanTitle: string = parsedFile.title || stripFileExtension(wf.name).toUpperCase().replace(/[_-]/g, ' ');

        // Ekstraksi paragraf dan tabel asli dari berkas docx pengguna (Content Preservation Guardrail)
        let extractedParagraphs: string[] | undefined = undefined;
        let extractedTables: DocxTableData[] | undefined = undefined;
        const targetFile = wf.originalFile || (wf as any).file;
        if (targetFile) {
          try {
            const extracted = await extractDocxData(targetFile);
            if (extracted.paragraphs && extracted.paragraphs.length > 0) {
              extractedParagraphs = extracted.paragraphs;
            }
            if (extracted.tables && extracted.tables.length > 0) {
              extractedTables = extracted.tables;
            }
          } catch (err) {
            console.warn('Docx extraction note in executeAnalysis:', err);
          }
        }

        const isSK = docTypeCode === 'KB';
        const initialParagraphs = extractedParagraphs || (isSK ? DEFAULT_NBE_BODY_PARAGRAPHS : []);
        const initialTables = extractedTables || [];

        initialCustoms[wf.id] = {
          title: cleanTitle || 'PENETAPAN SISTEM MANAJEMEN PENGENDALIAN DOKUMEN DAN PENUNJUKAN TIM DOCUMENT CONTROL CENTER (DCC)',
          code: codeForThis,
          issueDate: issueDate,
          revision: 0,
          status: 'Published',
          preparedBy: preparedBy,
          verifiedBy: verifiedBy,
          approvedBy: approvedBy,
          description: isSK
            ? `Surat Keputusan Direksi PT Nirwana Bhumi Energy sesuai ACUAN_TEMPLATE_SURAT_KEPUTUSAN_DIREKSI_NBE.`
            : `${docTypes.find((d) => d.code === docTypeCode)?.label || docTypeCode} PT Nirwana Bhumi Energy: ${cleanTitle}.`,
          revisions: [
            {
              revision: 0,
              date: formatIssueDate(issueDate),
              description: `Initial Edition – ${cleanTitle} PT Nirwana Bhumi Energy (${codeForThis})`,
              revisedBy: preparedBy,
            },
          ],
          typeCode: docTypeCode,
          subCategoryCode: selectedSubCategory,
          subSubCategoryCode: selectedSubSubCategory,
          divisionCode: divCode,
          approverCode: apprvCode,
          preservedBodyParagraphs: initialParagraphs,
          preservedBodyTables: initialTables,
        };

        // Otomatis standarisasi berkas Word ke template baku OpenXML NBE dengan Cover, Kop, Revision & Konten Asli
        try {
          const typeDef = docTypes.find((d) => d.code === docTypeCode);
          const divDef = divs.find((d) => d.code === divCode);
          const docxStandard = await generateNbeDocxBlob({
            docCode: codeForThis,
            titleId: cleanTitle,
            titleEn: cleanTitle,
            categoryNameId: typeDef?.label || (docTypeCode === 'KB' ? 'KEBIJAKAN PERUSAHAAN (KB)' : docTypeCode),
            divisionName: divDef?.label || (divCode === 'GNR' ? 'GENERAL & MANAGEMENT (GNR)' : divCode),
            revisionNo: '0',
            issueDateId: formatIssueDate(issueDate),
            issueDateEn: new Date(issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
            preparedBy: preparedBy,
            preparedRole: 'Director of Finance & Engineering / DCC Lead',
            verifiedBy: verifiedBy,
            verifiedRole: 'Director of Operations & Technology / CTO',
            approvedBy: approvedBy,
            approvedRole: 'President Director / CEO',
            language: selectedLang,
            preservedBodyParagraphs: initialParagraphs,
            bodyTables: initialTables,
          });
          wf.dataUrl = docxStandard.dataUrl;
          wf.size = docxStandard.blob.size;
        } catch (e) {
          console.warn('Word file standardization note:', e);
        }
      }

      setFileCustomizations(initialCustoms);
      setCurrentStage(2);
    } catch (err: any) {
      setErrorMessage(`Gagal menganalisis berkas: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // -------------------------------------------------------------
  // TAHAP 3: REALTIME CUSTOMIZATION HANDLERS
  // -------------------------------------------------------------
  const handleUpdateActiveCustomization = (patch: Partial<FileMetadataCustomization>) => {
    if (!activeWordFile) return;
    setFileCustomizations((prev) => ({
      ...prev,
      [activeWordFile.id]: {
        ...(prev[activeWordFile.id] || activeCustomization),
        ...patch,
      },
    }));
  };

  const handleTitleChange = (newTitle: string) => {
    if (!activeWordFile) return;
    const current = fileCustomizations[activeWordFile.id] || activeCustomization;
    const updatedRevs = [...(current.revisions || [])];
    if (updatedRevs.length > 0 && updatedRevs[0].revision === 0) {
      updatedRevs[0] = {
        ...updatedRevs[0],
        description: `Initial Edition – ${newTitle} (${current.code})`,
      };
    }
    handleUpdateActiveCustomization({
      title: newTitle,
      revisions: updatedRevs,
    });
  };

  const handleClassificationChange = (
    field: 'typeCode' | 'subCategoryCode' | 'subSubCategoryCode' | 'divisionCode' | 'approverCode',
    val: string
  ) => {
    if (!activeWordFile) return;
    const current = fileCustomizations[activeWordFile.id] || activeCustomization;
    const nextValues = {
      typeCode: field === 'typeCode' ? val : current.typeCode,
      subCategoryCode: field === 'subCategoryCode' ? val : current.subCategoryCode,
      subSubCategoryCode: field === 'subSubCategoryCode' ? val : current.subSubCategoryCode,
      divisionCode: field === 'divisionCode' ? val : current.divisionCode,
      approverCode: field === 'approverCode' ? val : current.approverCode,
    };

    if (field === 'typeCode') setSelectedType(val);
    if (field === 'subCategoryCode') setSelectedSubCategory(val);
    if (field === 'subSubCategoryCode') setSelectedSubSubCategory(val);
    if (field === 'divisionCode') setSelectedDivision(val);
    if (field === 'approverCode') setSelectedApprover(val);

    const seq = effectiveSequence + selectedWordIndex;
    const newCode = isManualOverride && manualCode.trim()
      ? manualCode.trim().toUpperCase()
      : generateDocumentCode(
          seq,
          nextValues.typeCode,
          nextValues.subCategoryCode,
          nextValues.subSubCategoryCode,
          nextValues.divisionCode,
          nextValues.approverCode,
          monthNumber,
          year
        );

    const updatedRevs = [...(current.revisions || [])];
    if (updatedRevs.length > 0 && updatedRevs[0].revision === 0) {
      updatedRevs[0] = {
        ...updatedRevs[0],
        description: `Initial Edition – ${current.title} (${newCode})`,
      };
    }

    handleUpdateActiveCustomization({
      ...nextValues,
      code: newCode,
      revisions: updatedRevs,
    });
  };

  const handleAddRevisionRow = () => {
    if (!activeWordFile) return;
    const current = fileCustomizations[activeWordFile.id] || activeCustomization;
    const revs = current.revisions ? [...current.revisions] : [];
    const maxRev = revs.length > 0 ? Math.max(...revs.map((r) => r.revision)) : 0;
    const nextRev = maxRev + 1;
    const newRow: RevisionRecord = {
      revision: nextRev,
      date: formatIssueDate(current.issueDate),
      description: `Revisi ${nextRev} – Pembaruan Prosedur ${current.title}`,
      revisedBy: current.preparedBy || 'Mazmur L',
    };
    const nextRevs = [...revs, newRow];
    handleUpdateActiveCustomization({
      revision: nextRev,
      revisions: nextRevs,
    });
  };

  const handleUpdateRevisionRow = (idx: number, patch: Partial<RevisionRecord>) => {
    if (!activeWordFile) return;
    const current = fileCustomizations[activeWordFile.id] || activeCustomization;
    const revs = current.revisions ? [...current.revisions] : [];
    if (!revs[idx]) return;
    revs[idx] = { ...revs[idx], ...patch };
    handleUpdateActiveCustomization({ revisions: revs });
  };

  const handleDeleteRevisionRow = (idx: number) => {
    if (!activeWordFile) return;
    const current = fileCustomizations[activeWordFile.id] || activeCustomization;
    const revs = (current.revisions || []).filter((_, i) => i !== idx);
    const newMax = revs.length > 0 ? Math.max(...revs.map((r) => r.revision)) : 0;
    handleUpdateActiveCustomization({
      revision: newMax,
      revisions: revs,
    });
  };

  // Apply current active file parameters to ALL word files
  const handleApplyToAllWordFiles = () => {
    if (!activeWordFile) return;
    const current = fileCustomizations[activeWordFile.id];
    if (!current) return;

    setFileCustomizations((prev) => {
      const next = { ...prev };
      wordFiles.forEach((wf, idx) => {
        const seq = effectiveSequence + idx;
        const code = generateDocumentCode(
          seq,
          current.typeCode,
          current.subCategoryCode,
          current.subSubCategoryCode,
          current.divisionCode,
          current.approverCode,
          monthNumber,
          year
        );
        next[wf.id] = {
          ...current,
          title: stripFileExtension(wf.name).toUpperCase().replace(/[_-]/g, ' '),
          code: code,
          revisions: [
            {
              revision: current.revision,
              date: formatIssueDate(current.issueDate),
              description: `Initial Edition – Penerbitan Dokumen Standar (${code})`,
              revisedBy: current.preparedBy,
            },
          ],
        };
      });
      return next;
    });

    alert('Parameter pengesahan, divisi, kategori, dan tabel revisi berhasil diseragamkan ke semua file Word!');
  };

  // Google Docs MCP Bot Handlers
  const handleConvertToGoogleDoc = async (file: AnalyzedFileItem) => {
    const custom = fileCustomizations[file.id] || activeCustomization;
    setIsConvertingToDocs(true);
    try {
      const res = await convertWordToGoogleDocViaMcp({
        fileId: file.id,
        fileName: file.name,
        title: custom.title,
        code: custom.code,
        revision: custom.revision,
        issueDate: custom.issueDate,
        preparedBy: custom.preparedBy,
        verifiedBy: custom.verifiedBy,
        approvedBy: custom.approvedBy,
        revisions: custom.revisions || [],
      });
      setGoogleDocsRegistry((prev) => ({ ...prev, [file.id]: res }));
      setDocsModalNotice(res);
    } catch (err: any) {
      alert(`Gagal mengonversi ke Google Docs: ${err.message}`);
    } finally {
      setIsConvertingToDocs(false);
    }
  };

  const handleConvertAllToGoogleDocs = async () => {
    if (wordFiles.length === 0) return;
    setIsConvertingToDocs(true);
    let lastDoc: SyncedGoogleDoc | null = null;
    try {
      for (const wf of wordFiles) {
        const custom = fileCustomizations[wf.id] || activeCustomization;
        const res = await convertWordToGoogleDocViaMcp({
          fileId: wf.id,
          fileName: wf.name,
          title: custom.title,
          code: custom.code,
          revision: custom.revision,
          issueDate: custom.issueDate,
          preparedBy: custom.preparedBy,
          verifiedBy: custom.verifiedBy,
          approvedBy: custom.approvedBy,
          revisions: custom.revisions || [],
        });
        lastDoc = res;
      }
      setGoogleDocsRegistry(getGoogleDocsRegistry());
      if (lastDoc) {
        setDocsModalNotice(lastDoc);
      }
    } catch (err: any) {
      alert(`Gagal mengonversi seluruh berkas: ${err.message}`);
    } finally {
      setIsConvertingToDocs(false);
    }
  };

  const handleSelectAndScrollToPreview = (idx: number) => {
    setSelectedWordIndex(idx);
    setTimeout(() => {
      const el = document.getElementById('document-preview-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Download physically generated .docx with Cover, Kop & Revision Index
  const handleDownloadDocxPreview = async (fileItem: AnalyzedFileItem) => {
    const custom = fileCustomizations[fileItem.id] || activeCustomization;
    setIsGeneratingDocx(true);
    try {
      const typeDef = docTypes.find((t) => t.code.toUpperCase() === custom.typeCode.toUpperCase());
      const divDef = divs.find((d) => d.code.toUpperCase() === custom.divisionCode?.toUpperCase());
      await generateAndDownloadNbeDocx({
        docCode: custom.code,
        titleId: custom.title,
        titleEn: custom.title,
        categoryNameId: typeDef?.label || custom.typeCode,
        divisionName: divDef?.label || custom.divisionCode || 'General & Management (GNR)',
        revisionNo: String(custom.revision || 0),
        issueDateId: formatIssueDate(custom.issueDate),
        issueDateEn: new Date(custom.issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        preparedBy: custom.preparedBy || 'Mazmur Gusti Agung Larosa',
        preparedRole: 'Director of Finance & Engineering / DCC Lead',
        verifiedBy: custom.verifiedBy || 'Dennis Raditya',
        verifiedRole: 'Director of Operations & Technology / CTO',
        approvedBy: custom.approvedBy || 'Bima Satryo Hartanto',
        approvedRole: 'President Director / CEO',
        language: selectedLang,
        preservedBodyParagraphs: custom.preservedBodyParagraphs,
        bodyTables: custom.preservedBodyTables,
      });
    } catch (err: any) {
      alert(`Gagal membuat file Word (.docx): ${err.message}`);
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  // -------------------------------------------------------------
  // TAHAP 4: GOOGLE DRIVE 4-LEVEL HIERARCHY & UPLOAD
  // -------------------------------------------------------------
  const executeDriveUploadAndSave = async () => {
    if (wordFiles.length === 0) {
      alert('Tidak ada file Word yang dapat diunggah.');
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

    setIsDriveProcessing(true);
    setErrorMessage(null);
    setCategoryMissingAlert(false);

    try {
      // 1. Resolve Hierarchy parameters
      const primaryCustom = fileCustomizations[wordFiles[0]?.id] || activeCustomization;
      const typeDef = docTypes.find((dt) => dt.code.toUpperCase() === primaryCustom.typeCode.toUpperCase());
      const subDef = subCats.find((sc) => sc.code.toUpperCase() === (primaryCustom.subCategoryCode || '').toUpperCase());
      const subSubDef = subSubCats.find((ssc) => ssc.code.toUpperCase() === (primaryCustom.subSubCategoryCode || '').toUpperCase());

      // Master folder name in Level 4: based on document title / overall folder name
      const masterDocTitle = detectedFolderName || primaryCustom.title || 'Kebijakan Audit Internal';

      // 2. Execute 4-Tier Hierarchy in Google Drive via Bot Webhook
      const hierarchyRes = await createHierarchicalDocumentFolderViaBot({
        documentCode: primaryCustom.code,
        documentTitle: masterDocTitle,
        categoryCode: primaryCustom.typeCode,
        categoryLabel: typeDef?.label,
        subCategoryCode: primaryCustom.subCategoryCode,
        subCategoryLabel: subDef?.label,
        subSubCategoryCode: primaryCustom.subSubCategoryCode,
        subSubCategoryLabel: subSubDef?.label,
        webhookUrl: driveSettings.botWebhookUrl,
        rootFolderId: driveSettings.folderId || TARGET_FOLDER_ID,
      });

      if (hierarchyRes.categoryNotFound) {
        setCategoryMissingAlert(true);
        setErrorMessage(
          hierarchyRes.error ||
            `Folder Kategori '${primaryCustom.typeCode}' belum ditemukan di Google Drive. Silakan buat atau perbarui folder kategori di web terlebih dahulu.`
        );
        setIsDriveProcessing(false);
        return;
      }

      if (!hierarchyRes.success || !hierarchyRes.folderId) {
        throw new Error(hierarchyRes.error || 'Bot gagal membuat struktur folder 4-tingkat di Google Drive.');
      }

      const targetLevel4FolderId = hierarchyRes.folderId;
      const targetLevel4FolderUrl = hierarchyRes.folderUrl || `https://drive.google.com/drive/folders/${targetLevel4FolderId}`;
      setCreatedFolderResult({
        id: targetLevel4FolderId,
        url: targetLevel4FolderUrl,
        name: hierarchyRes.folderName || masterDocTitle,
      });
      setHierarchyPath(hierarchyRes.folderPath || `${primaryCustom.typeCode} > ${subDef?.label || 'General Procedure'} > ${subSubDef?.label || 'Audit Internal'} > ${masterDocTitle}`);

      // 3. Generate standardized .docx with Cover, Kop & Revision Table for EACH file and upload to Level 4
      const uploadedFileItems: DocumentFileItem[] = [];

      for (let i = 0; i < wordFiles.length; i++) {
        const wf = wordFiles[i];
        const custom = fileCustomizations[wf.id] || activeCustomization;

        setDriveProgress({
          current: i + 1,
          total: wordFiles.length,
          currentFileName: `${custom.code} - ${custom.title}.docx`,
        });

        // Generate genuine DOCX matching A4 4-Page Standard and preserved docx content
        const divDef = divs.find((d) => d.code.toUpperCase() === custom.divisionCode?.toUpperCase());
        const docxResult = await generateNbeDocxBlob({
          docCode: custom.code,
          titleId: custom.title,
          titleEn: custom.title,
          categoryNameId: typeDef?.label || custom.typeCode,
          divisionName: divDef?.label || custom.divisionCode || 'General & Management (GNR)',
          revisionNo: String(custom.revision || 0),
          issueDateId: formatIssueDate(custom.issueDate),
          issueDateEn: new Date(custom.issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          preparedBy: custom.preparedBy || 'Mazmur Gusti Agung Larosa',
          preparedRole: 'Director of Finance & Engineering / DCC Lead',
          verifiedBy: custom.verifiedBy || 'Dennis Raditya',
          verifiedRole: 'Director of Operations & Technology / CTO',
          approvedBy: custom.approvedBy || 'Bima Satryo Hartanto',
          approvedRole: 'President Director / CEO',
          language: selectedLang,
          preservedBodyParagraphs: custom.preservedBodyParagraphs,
          bodyTables: custom.preservedBodyTables,
        });

        const uploadFileName = `${custom.code} - ${custom.title}.docx`;

        // Upload via Bot Webhook directly into Level 4 folder
        const uploadRes = await uploadFileToDriveViaBot(
          docxResult.dataUrl,
          uploadFileName,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          driveSettings.botWebhookUrl,
          {
            folderId: targetLevel4FolderId,
            documentCode: custom.code,
            uploadedBy: custom.preparedBy,
          }
        );

        uploadedFileItems.push({
          id: wf.id,
          name: uploadFileName,
          size: docxResult.blob.size,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          dataUrl: docxResult.dataUrl,
          googleDriveLink: uploadRes.viewUrl || targetLevel4FolderUrl,
          driveFileId: uploadRes.fileId,
          relativePath: wf.relativePath,
          uploadedAt: getNowIsoString(),
        });
      }

      // 4. Save Master Folder Document Record to System Database
      const romanMonth = getRomanMonth(monthNumber);
      const totalSize = uploadedFileItems.reduce((acc, f) => acc + f.size, 0);

      const folderDocRecord: DocumentRecord = {
        id: generateDocumentId(),
        code: primaryCustom.code,
        seqNumber: effectiveSequence,
        typeCode: primaryCustom.typeCode,
        subCategoryCode: primaryCustom.subCategoryCode,
        subSubCategoryCode: primaryCustom.subSubCategoryCode,
        divisionCode: primaryCustom.divisionCode,
        approverCode: primaryCustom.approverCode,
        monthRoman: romanMonth,
        year: year,
        title: masterDocTitle,
        description: primaryCustom.description,
        revision: primaryCustom.revision,
        status: primaryCustom.status,
        createdBy: primaryCustom.preparedBy,
        approvedBy: primaryCustom.approvedBy,
        verifiedBy: primaryCustom.verifiedBy,
        issueDate: primaryCustom.issueDate,
        fileName: `${uploadedFileItems.length} berkas Word (${masterDocTitle})`,
        fileSize: totalSize,
        fileType: 'folder',
        fileData: uploadedFileItems[0]?.dataUrl,
        googleDriveLink: targetLevel4FolderUrl,
        driveFolderId: targetLevel4FolderId,
        driveFolderUrl: targetLevel4FolderUrl,
        isFixed: true,
        isFolder: true,
        folderName: masterDocTitle,
        files: uploadedFileItems,
        isManualCode: isManualOverride,
        revisions: primaryCustom.revisions,
        createdAt: getNowIsoString(),
        updatedAt: getNowIsoString(),
      };

      await onSaveDocument(folderDocRecord);
      setSavedSuccessDoc(folderDocRecord);
    } catch (err: any) {
      setErrorMessage(`Kendala saat mengunggah ke Google Drive: ${err.message}`);
    } finally {
      setIsDriveProcessing(false);
      setDriveProgress(null);
    }
  };

  const handleCreateCategoryFolderNow = async () => {
    if (!driveSettings.botWebhookUrl) return;
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
        setCategoryMissingAlert(false);
        setErrorMessage(null);
        alert(`Folder kategori "${selectedType}" berhasil dibuat di Google Drive! Silakan klik Lanjut Upload.`);
      } else {
        alert(res.error || 'Gagal membuat folder kategori.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsCreatingCategoryFolder(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER INTERFACE
  // -------------------------------------------------------------
  return (
    <div className="container" style={{ paddingBottom: '3.5rem' }}>
      {/* SUCCESS MODAL / BANNER (AFTER STAGE 4) */}
      {savedSuccessDoc && (
        <div
          className="glass-card animate-fade-in"
          style={{
            margin: '1.5rem 0',
            padding: '1.75rem',
            border: '1.5px solid rgba(16, 185, 129, 0.5)',
            background: 'rgba(16, 185, 129, 0.08)',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div
              style={{
                background: 'var(--success)',
                color: '#fff',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={26} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                  Seluruh Berkas Berhasil Distandarisasi & Terunggah ke Google Drive!
                </h3>
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
                  <Bot size={13} /> Bot NBE Selesai
                </span>
              </div>

              <p style={{ marginTop: '0.4rem', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                Kode Dokumen Resmi:{' '}
                <span
                  className="mono"
                  style={{
                    fontWeight: 800,
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    color: 'var(--primary)',
                  }}
                >
                  {savedSuccessDoc.code}
                </span>
              </p>

              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,0,0,0.2)',
                  fontSize: '0.82rem',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <FolderTree size={16} />
                <span>
                  <strong>Hierarki Google Drive:</strong> {hierarchyPath}
                </span>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                {createdFolderResult && (
                  <a
                    href={createdFolderResult.url}
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
                      fontWeight: 700,
                    }}
                  >
                    <HardDrive size={15} />
                    <span>Buka Folder di Google Drive</span>
                    <ExternalLink size={13} />
                  </a>
                )}

                <button onClick={onNavigateToDocuments} className="btn btn-primary btn-sm">
                  <span>Lihat di Dashboard Dokumen</span>
                  <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => {
                    setSavedSuccessDoc(null);
                    setCurrentStage(1);
                    setRawFiles([]);
                    setWordFiles([]);
                    setPdfFiles([]);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  <RefreshCw size={14} />
                  <span>Daftarkan Folder Baru</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
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
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #00d4b2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              }}
            >
              <FolderPlus size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Daftarkan Folder Dokumen (Sistem Otomatis Word & Drive)
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Alur 4-Tahap: Upload Folder, Analisis & Konversi Otomatis Word, Standarisasi Cover & Kop, dan Hierarki 4-Tingkat Google Drive.
              </p>
            </div>
          </div>
        </div>

        <button onClick={onNavigateToDocuments} className="btn btn-secondary btn-sm">
          Kembali ke Dashboard
        </button>
      </div>

      {/* 4-STAGE STEPPER INDICATOR */}
      <div
        className="glass-card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.75rem',
        }}
      >
        {[
          { num: 1, title: 'Upload Folder', desc: 'Pilih Berkas & Direktori' },
          { num: 2, title: 'Analisis & Konversi', desc: 'Pemisahan Word & PDF' },
          { num: 3, title: 'Standarisasi & Preview', desc: 'Cover, Kop & Revisi' },
          { num: 4, title: 'Google Drive 4-Tingkat', desc: 'Hierarki Folder & Simpan' },
        ].map((st) => {
          const isActive = currentStage === st.num;
          const isDone = currentStage > st.num;
          return (
            <div
              key={st.num}
              onClick={() => {
                if (isDone) setCurrentStage(st.num as any);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.55rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: isActive
                  ? 'rgba(2, 132, 199, 0.15)'
                  : isDone
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'transparent',
                border: isActive
                  ? '1.5px solid #0284c7'
                  : isDone
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid transparent',
                cursor: isDone ? 'pointer' : 'default',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isActive
                    ? '#0284c7'
                    : isDone
                    ? 'var(--success)'
                    : 'var(--bg-tertiary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  flexShrink: 0,
                }}
              >
                {isDone ? <Check size={14} /> : st.num}
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isActive ? '#38bdf8' : 'var(--text-main)' }}>
                  {st.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{st.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ERROR BANNER */}
      {errorMessage && (
        <div
          className="glass-card animate-fade-in"
          style={{
            margin: '1rem 0',
            padding: '1rem 1.25rem',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            color: '#f87171',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{errorMessage}</span>
          </div>

          {categoryMissingAlert && (
            <button
              onClick={handleCreateCategoryFolderNow}
              disabled={isCreatingCategoryFolder}
              className="btn btn-sm btn-primary"
            >
              {isCreatingCategoryFolder ? 'Membuat...' : 'Buat Folder Kategori di Drive Sekarang'}
            </button>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAHAP 1: UPLOAD FOLDER                                         */}
      {/* ============================================================= */}
      {currentStage === 1 && (
        <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Tahap 1: Pilih / Upload Folder Dokumen</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
              Unggah folder dari komputer Anda. Bot akan secara cerdas membedah file Word & PDF yang ada di dalamnya.
            </p>
          </div>

          <input
            type="file"
            ref={folderInputRef}
            onChange={(e) => e.target.files && handleSelectFiles(e.target.files)}
            style={{ display: 'none' }}
            // @ts-ignore
            webkitdirectory=""
            directory=""
            multiple
          />
          <input
            type="file"
            ref={multiFileInputRef}
            onChange={(e) => e.target.files && handleSelectFiles(e.target.files)}
            multiple
            style={{ display: 'none' }}
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => folderInputRef.current?.click()}
            style={{
              border: isDragging ? '2px dashed var(--primary)' : '2px dashed rgba(2, 132, 199, 0.45)',
              borderRadius: 'var(--radius-lg)',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              background: isDragging ? 'rgba(0, 212, 178, 0.08)' : 'rgba(0, 0, 0, 0.15)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(2, 132, 199, 0.15)',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
              }}
            >
              <Upload size={32} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Tarik & Lepas Folder ke Sini</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Atau klik tombol di bawah untuk memilih folder atau beberapa file sekaligus.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.25rem', fontWeight: 700 }}
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
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                <FileText size={16} />
                <span>Pilih Banyak File</span>
              </button>
            </div>
          </div>

          {/* List of picked files */}
          {rawFiles.length > 0 && (
            <div style={{ marginTop: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {rawFiles.length} Berkas Siap Dianalisis
                  </span>
                  {detectedFolderName && (
                    <span className="badge badge-purple">Folder: {detectedFolderName}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setRawFiles([])}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#f87171' }}
                >
                  <Trash2 size={13} />
                  <span>Kosongkan</span>
                </button>
              </div>

              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                }}
              >
                {rawFiles.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.85rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <File size={15} color={f.name.endsWith('.pdf') ? '#ef4444' : '#38bdf8'} />
                      <span style={{ fontWeight: 600 }}>{f.name}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)' }}>{formatBytes(f.size)}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={executeAnalysis}
                  disabled={isAnalyzing}
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 2rem', fontWeight: 800, fontSize: '0.95rem' }}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Menganalisis Berkas...</span>
                    </>
                  ) : (
                    <>
                      <span>Lanjut ke Tahap 2: Analisis Otomatis</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAHAP 2: AUTOMATIC ANALYSIS & CONVERSION                       */}
      {/* ============================================================= */}
      {currentStage === 2 && (
        <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Tahap 2: Hasil Analisis & Pemisahan Berkas Bot</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
              Bot telah mengelompokkan dokumen ke folder Word dan PDF. File PDF tanpa versi Word otomatis dibuatkan salinan Word (.docx).
            </p>
          </div>

          {/* 4 METRICS CARDS AS SPECIFIED IN DOCX */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.75rem',
            }}
          >
            <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                1. Total Dokumen Diterima
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.3rem' }}>
                {rawFiles.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                File diunggah dalam folder
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
              <div style={{ fontSize: '0.75rem', color: '#f87171', textTransform: 'uppercase' }}>
                2. Jumlah Dokumen PDF
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f87171', marginTop: '0.3rem' }}>
                {pdfFiles.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Diabaikan untuk proses edit
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(2, 132, 199, 0.35)' }}>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase' }}>
                3. Jumlah Dokumen WORD
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.3rem' }}>
                {wordFiles.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Fokus utama standarisasi
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)', textTransform: 'uppercase' }}>
                4. Word Baru Dibuat (Auto-Convert)
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.3rem' }}>
                {autoConvertedCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Dari PDF yang belum ber-Word
              </div>
            </div>
          </div>

          {/* VIRTUAL FOLDER TABS */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              onClick={() => setActiveAnalysisTab('all')}
              className={`btn btn-sm ${activeAnalysisTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Semua Berkas ({rawFiles.length})
            </button>
            <button
              onClick={() => setActiveAnalysisTab('word')}
              className={`btn btn-sm ${activeAnalysisTab === 'word' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderColor: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Folder size={14} />
              <span>Folder "word" ({wordFiles.length}) - Fokus Bot</span>
            </button>
            <button
              onClick={() => setActiveAnalysisTab('pdf')}
              className={`btn btn-sm ${activeAnalysisTab === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderColor: '#f87171', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Folder size={14} />
              <span>Folder "pdf" ({pdfFiles.length})</span>
            </button>
          </div>

          {/* TABLE OF FILES */}
          <div
            style={{
              maxHeight: '280px',
              overflowY: 'auto',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '0.65rem 0.85rem' }}>#</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Nama Berkas</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Format</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Ukuran</th>
                  <th style={{ padding: '0.65rem 0.85rem' }}>Keterangan Analisis Bot</th>
                </tr>
              </thead>
              <tbody>
                {(activeAnalysisTab === 'word' ? wordFiles : activeAnalysisTab === 'pdf' ? pdfFiles : [...wordFiles, ...pdfFiles]).map((item, idx) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <File size={15} color={item.fileFormat === 'pdf' ? '#ef4444' : '#38bdf8'} />
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      <span className={`badge ${item.fileFormat === 'pdf' ? 'badge-danger' : 'badge-blue'}`}>
                        {item.fileFormat.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)' }}>
                      {formatBytes(item.size)}
                    </td>
                    <td style={{ padding: '0.65rem 0.85rem' }}>
                      {item.isAutoConverted ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                          ✓ Baru dibuat oleh bot (Auto-converted dari PDF)
                        </span>
                      ) : item.pairedWith ? (
                        <span style={{ color: '#38bdf8' }}>
                          Terhubung dengan berkas pasangan: {item.pairedWith}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Berkas Word asli</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setCurrentStage(1)} className="btn btn-secondary">
              <ChevronLeft size={16} />
              <span>Kembali ke Upload</span>
            </button>
            <button
              onClick={() => setCurrentStage(3)}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem', fontWeight: 800 }}
            >
              <span>Lanjut ke Tahap 3: Edit Standarisasi & Preview</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAHAP 3: STANDARDIZATION & LIVE PREVIEW (Cover, Kop, Revisi)  */}
      {/* ============================================================= */}
      {currentStage === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* TOP: DAFTAR BERKAS WORD YANG DITERIMA & TOMBOL EDIT */}
          <div className="glass-card animate-fade-in" style={{ padding: '1.35rem 1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <FileText size={20} color="#38bdf8" />
                  <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>
                    Daftar Berkas Word yang Diterima ({wordFiles.length})
                  </h3>
                  {autoConvertedCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#34d399',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                      }}
                    >
                      ✨ {autoConvertedCount} Berkas Dikonversi Otomatis dari PDF
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                  Web menampilkan daftar seluruh berkas Word. Klik tombol <strong style={{ color: '#38bdf8' }}>"Edit & Preview"</strong> pada masing-masing dokumen untuk menyesuaikan Judul (Cover & Kop) serta Tabel Index Revisi.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleConvertAllToGoogleDocs}
                  disabled={isConvertingToDocs}
                  className="btn btn-primary btn-sm"
                  style={{
                    fontSize: '0.78rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 700,
                    background: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                  }}
                  title="Jadikan seluruh file Word menjadi Google Docs yang dapat diedit oleh Bot melalui Google Docs MCP"
                >
                  <Sparkles size={14} />
                  <span>{isConvertingToDocs ? 'Mengonversi ke Docs...' : '⚡ Konversi Seluruh Berkas ke Google Docs (MCP Bot)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleApplyToAllWordFiles}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '0.78rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 700,
                  }}
                  title="Salin parameter divisi, kategori, dan tabel revisi aktif ke semua berkas Word"
                >
                  <Copy size={14} color="var(--primary)" />
                  <span>Seragamkan ke Semua File</span>
                </button>
              </div>
            </div>

            {/* Structured Table of Word Files with Edit & Preview Actions */}
            <div
              style={{
                maxHeight: '270px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '0.65rem 0.75rem', width: '45px' }}>#</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Nama Berkas Word</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Kode Resmi NBE</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Judul Prosedur (Cover & Kop)</th>
                    <th style={{ padding: '0.65rem 0.75rem', width: '140px' }}>Google Docs (MCP)</th>
                    <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', width: '230px' }}>Aksi Bot / Web</th>
                  </tr>
                </thead>
                <tbody>
                  {wordFiles.map((wf, idx) => {
                    const isSelected = selectedWordIndex === idx;
                    const c = fileCustomizations[wf.id] || activeCustomization;
                    const syncedDoc = googleDocsRegistry[wf.id];
                    return (
                      <tr
                        key={wf.id}
                        onClick={() => handleSelectAndScrollToPreview(idx)}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '0.6rem 0.75rem', color: isSelected ? '#38bdf8' : 'var(--text-muted)', fontWeight: 700 }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <File size={15} color="#38bdf8" />
                            <span style={{ fontWeight: 600, color: isSelected ? '#38bdf8' : 'var(--text-main)' }}>
                              {wf.name}
                            </span>
                            {wf.isAutoConverted && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  color: '#34d399',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '6px',
                                }}
                              >
                                Auto-Word
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '1.4rem' }}>
                            {formatBytes(wf.size)}
                            {wf.pairedWith ? ` • Terkait dengan ${wf.pairedWith}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700 }}>
                            {c.code}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '0.6rem 0.75rem',
                            maxWidth: '220px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            {c.title}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          {syncedDoc ? (
                            <span
                              style={{
                                background: 'rgba(99, 102, 241, 0.2)',
                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                color: '#a5b4fc',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                              title="Telah dijadikan Google Docs yang dapat diedit oleh Bot"
                            >
                              <FileText size={12} />
                              <span>Docs Siap Edit</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-muted)',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                              }}
                            >
                              Siap Dikonversi
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAndScrollToPreview(idx);
                              }}
                              className={`btn btn-xs ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                              title="Sunting data & lihat kondisi nyata preview di bawah"
                            >
                              <Edit3 size={12} />
                              <span>{isSelected ? 'Sedang Diedit' : 'Edit & Preview'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConvertToGoogleDoc(wf);
                              }}
                              disabled={isConvertingToDocs}
                              className="btn btn-secondary btn-xs"
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: '#818cf8',
                                borderColor: 'rgba(99, 102, 241, 0.4)',
                              }}
                              title="Buka / Konversi ke Google Docs menggunakan MCP Docs"
                            >
                              <FileText size={12} />
                              <span>Docs</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadDocxPreview(wf);
                              }}
                              disabled={isGeneratingDocx}
                              className="btn btn-secondary btn-xs"
                              style={{ fontSize: '0.72rem' }}
                              title="Unduh berkas Word hasil standarisasi"
                            >
                              <Download size={12} />
                              <span>.docx</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* VERTICAL FORM SECTION (FULL WIDTH) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* 1. Detail & Data Dokumen (image2.png layout) */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={18} color="var(--primary)" />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Detail & Data Dokumen</h3>
                    </div>
                    {activeWordFile && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#38bdf8',
                          background: 'rgba(2, 132, 199, 0.15)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                        }}
                      >
                        File: {activeWordFile.name}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>
                        JUDUL DOKUMEN / NAMA PROSEDUR *
                      </label>
                      <input
                        type="text"
                        value={activeCustomization.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        placeholder="Contoh: INTERNAL AUDIT PROCEDURES"
                        className="form-input"
                        style={{ fontWeight: 700 }}
                      />
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Judul ini otomatis ditampilkan di halaman Cover, Kop Header dokumen Word, dan deskripsi revisi.
                      </div>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>TANGGAL PENERBITAN</label>
                      <input
                        type="date"
                        value={activeCustomization.issueDate}
                        onChange={(e) => {
                          const newD = e.target.value;
                          handleUpdateActiveCustomization({ issueDate: newD });
                          if (newD) {
                            const d = new Date(newD);
                            if (!isNaN(d.getTime())) {
                              setMonthNumber(d.getMonth() + 1);
                              setYear(d.getFullYear());
                            }
                          }
                        }}
                        className="form-input"
                      />
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Bulan: {getRomanMonth(monthNumber)} | Tahun: {year}
                      </div>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>DIBUAT OLEH (CREATED BY) *</label>
                      <input
                        type="text"
                        value={activeCustomization.preparedBy}
                        onChange={(e) => handleUpdateActiveCustomization({ preparedBy: e.target.value })}
                        placeholder="Contoh: Mazmur L"
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>DIVERIFIKASI OLEH (VERIFIED BY)</label>
                      <input
                        type="text"
                        value={activeCustomization.verifiedBy}
                        onChange={(e) => handleUpdateActiveCustomization({ verifiedBy: e.target.value })}
                        placeholder="Auditor Internal Utama"
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>DISETUJUI OLEH (APPROVED BY)</label>
                      <input
                        type="text"
                        value={activeCustomization.approvedBy}
                        onChange={(e) => handleUpdateActiveCustomization({ approvedBy: e.target.value })}
                        placeholder="Direktur Keuangan (CFO)"
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>STATUS DOKUMEN</label>
                      <select
                        value={activeCustomization.status}
                        onChange={(e) => handleUpdateActiveCustomization({ status: e.target.value as DocumentStatus })}
                        className="form-select"
                      >
                        <option value="Published">Published (Diterbitkan & Berlaku)</option>
                        <option value="Approved">Approved (Disetujui)</option>
                        <option value="In Review">In Review</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>NOMOR REVISI</label>
                      <input
                        type="number"
                        min="0"
                        value={activeCustomization.revision}
                        onChange={(e) => handleUpdateActiveCustomization({ revision: parseInt(e.target.value) || 0 })}
                        className="form-input"
                      />
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Revisi 0 adalah edisi awal / perdana (Initial Issue)
                      </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>DESKRIPSI / RUANG LINGKUP DOKUMEN</label>
                      <textarea
                        value={activeCustomization.description}
                        onChange={(e) => handleUpdateActiveCustomization({ description: e.target.value })}
                        placeholder="Keterangan singkat maksud dan tujuan dokumen..."
                        className="form-input"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. TABEL INDEX REVISI CARD (Matching prom surat.docx) */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.85rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileSpreadsheet size={18} color="var(--primary)" />
                      <div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Tabel Index Revisi Dokumen</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                          Otomatis disinkronkan ke Kop Halaman 2 dan berkas Word yang dihasilkan.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddRevisionRow}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Plus size={13} />
                      <span>Tambah Baris Revisi</span>
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem 0.6rem', width: '55px', textAlign: 'center' }}>Revisi</th>
                          <th style={{ padding: '0.5rem 0.6rem', width: '120px' }}>Tanggal</th>
                          <th style={{ padding: '0.5rem 0.6rem' }}>Deskripsi Perubahan</th>
                          <th style={{ padding: '0.5rem 0.6rem', width: '130px' }}>Direvisi Oleh</th>
                          <th style={{ padding: '0.5rem 0.6rem', width: '35px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeCustomization.revisions || []).map((rev, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.35rem 0.5rem' }}>
                              <input
                                type="number"
                                min="0"
                                value={rev.revision}
                                onChange={(e) => handleUpdateRevisionRow(rIdx, { revision: parseInt(e.target.value) || 0 })}
                                className="form-input"
                                style={{ padding: '0.25rem 0.35rem', fontSize: '0.78rem', textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ padding: '0.35rem 0.5rem' }}>
                              <input
                                type="text"
                                value={rev.date}
                                onChange={(e) => handleUpdateRevisionRow(rIdx, { date: e.target.value })}
                                placeholder="16 Okt 2026"
                                className="form-input"
                                style={{ padding: '0.25rem 0.45rem', fontSize: '0.78rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.35rem 0.5rem' }}>
                              <input
                                type="text"
                                value={rev.description}
                                onChange={(e) => handleUpdateRevisionRow(rIdx, { description: e.target.value })}
                                placeholder="Initial Edition – Judul Dokumen"
                                className="form-input"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.35rem 0.5rem' }}>
                              <input
                                type="text"
                                value={rev.revisedBy}
                                onChange={(e) => handleUpdateRevisionRow(rIdx, { revisedBy: e.target.value })}
                                placeholder="Nama Staf"
                                className="form-input"
                                style={{ padding: '0.25rem 0.45rem', fontSize: '0.78rem' }}
                              />
                            </td>
                            <td style={{ padding: '0.35rem 0.4rem', textAlign: 'center' }}>
                              {rIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRevisionRow(rIdx)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: '#f87171', padding: '0.2rem' }}
                                  title="Hapus baris revisi ini"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Klasifikasi Kode Surat NBE (Document Type, ZZ, AA, Division, Approver) */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.85rem' }}>
                    Penomoran Kode Dokumen & Klasifikasi NBE
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Pilih Kategori Surat</label>
                      <select
                        value={activeCustomization.typeCode}
                        onChange={(e) => handleClassificationChange('typeCode', e.target.value)}
                        className="form-select"
                      >
                        {docTypes.map((dt) => (
                          <option key={dt.code} value={dt.code}>
                            {dt.code} - {dt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', color: '#22d3ee' }}>
                        Sub-Kategori Surat (Kode ZZ)
                      </label>
                      <select
                        value={activeCustomization.subCategoryCode}
                        onChange={(e) => handleClassificationChange('subCategoryCode', e.target.value)}
                        className="form-select"
                      >
                        {subCats.map((sc) => (
                          <option key={sc.code} value={sc.code}>
                            {sc.code} - {sc.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', color: '#c084fc' }}>
                        Sub-sub Kategori Surat (Kode AA)
                      </label>
                      <select
                        value={activeCustomization.subSubCategoryCode}
                        onChange={(e) => handleClassificationChange('subSubCategoryCode', e.target.value)}
                        className="form-select"
                      >
                        {subSubCats.map((ssc) => (
                          <option key={ssc.code} value={ssc.code}>
                            {ssc.code} - {ssc.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Penerbit Surat (Division)</label>
                      <select
                        value={activeCustomization.divisionCode}
                        onChange={(e) => handleClassificationChange('divisionCode', e.target.value)}
                        className="form-select"
                      >
                        {divs.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.code} - {d.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Orang Yang Menyetujui (Approver)</label>
                      <select
                        value={activeCustomization.approverCode}
                        onChange={(e) => handleClassificationChange('approverCode', e.target.value)}
                        className="form-select"
                      >
                        {apprvs.map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} - {a.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Kode Resmi Dihasilkan</label>
                      <div
                        className="mono"
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(0,0,0,0.3)',
                          color: 'var(--primary)',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{activeCustomization.code}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activeCustomization.code);
                            alert(`Kode ${activeCustomization.code} berhasil disalin!`);
                          }}
                          className="btn btn-ghost btn-xs"
                          style={{ padding: '0.15rem 0.4rem', color: 'var(--primary)' }}
                          title="Salin kode dokumen"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TOMBOL PILIHAN BAHASA DOKUMEN (LANGUAGE SELECTOR: ID / EN / BI) */}
              <LanguageSelector
                selectedLang={selectedLang}
                onSelectLang={(l) => setSelectedLang(l)}
              />

              {/* REAL-TIME A4 DOCUMENT PREVIEW (4 HALAMAN BAKU SESUAI PANDUAN NBE) */}
              <div id="document-preview-section">
                <A4DocumentPreview
                  language={selectedLang}
                  title={activeCustomization.title}
                  code={activeCustomization.code}
                  issueDate={activeCustomization.issueDate}
                  revision={activeCustomization.revision}
                  revisions={activeCustomization.revisions}
                  preparedBy={activeCustomization.preparedBy}
                  verifiedBy={activeCustomization.verifiedBy}
                  approvedBy={activeCustomization.approvedBy}
                  typeLabel={docTypes.find((d) => d.code === activeCustomization.typeCode)?.label || activeCustomization.typeCode}
                  divisionLabel={divs.find((d) => d.code === activeCustomization.divisionCode)?.label || activeCustomization.divisionCode}
                  approverLabel={apprvs.find((a) => a.code === activeCustomization.approverCode)?.label || activeCustomization.approverCode}
                  categoryCode={activeCustomization.typeCode}
                  preservedBodyParagraphs={activeCustomization.preservedBodyParagraphs}
                  bodyTables={activeCustomization.preservedBodyTables}
                  onCopyCode={() => {
                    navigator.clipboard.writeText(activeCustomization.code);
                    alert(`Kode ${activeCustomization.code} berhasil disalin!`);
                  }}
                  onDownloadDocx={async () => {
                    try {
                      const docTypeLabel = docTypes.find((d) => d.code === activeCustomization.typeCode)?.label || activeCustomization.typeCode;
                      const divisionLabel = divs.find((d) => d.code === activeCustomization.divisionCode)?.label || activeCustomization.divisionCode;
                      await generateAndDownloadNbeDocx({
                        docCode: activeCustomization.code,
                        titleId: activeCustomization.title,
                        titleEn: activeCustomization.title,
                        categoryNameId: docTypeLabel,
                        divisionName: divisionLabel,
                        revisionNo: String(activeCustomization.revision),
                        issueDateId: formatIssueDate(activeCustomization.issueDate),
                        issueDateEn: new Date(activeCustomization.issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                        preparedBy: activeCustomization.preparedBy,
                        preparedRole: 'Director of Finance & Engineering / DCC Lead',
                        verifiedBy: activeCustomization.verifiedBy,
                        verifiedRole: 'Director of Operations & Technology / CTO',
                        approvedBy: activeCustomization.approvedBy,
                        approvedRole: 'President Director / CEO',
                        language: selectedLang,
                        preservedBodyParagraphs: activeCustomization.preservedBodyParagraphs,
                        bodyTables: activeCustomization.preservedBodyTables,
                      });
                    } catch (err: any) {
                      alert('Gagal mengunduh berkas Word (.docx): ' + err.message);
                    }
                  }}
                  onSaveDocument={async (updated) => {
                    if (!activeWordFile) return;
                    const current = fileCustomizations[activeWordFile.id] || activeCustomization;
                    const updatedCustomization: FileMetadataCustomization = {
                      ...current,
                      title: updated.title,
                      code: updated.code,
                      issueDate: updated.issueDate,
                      revision: updated.revision,
                      preparedBy: updated.preparedBy,
                      verifiedBy: updated.verifiedBy,
                      approvedBy: updated.approvedBy,
                      revisions: updated.revisions || current.revisions,
                      preservedBodyParagraphs: updated.preservedBodyParagraphs || current.preservedBodyParagraphs,
                      preservedBodyTables: updated.bodyTables || current.preservedBodyTables,
                    };

                    setFileCustomizations((prev) => ({
                      ...prev,
                      [activeWordFile.id]: updatedCustomization,
                    }));

                    // Regenerate OpenXML Word file blob for activeWordFile in memory
                    try {
                      const docTypeLabel = docTypes.find((d) => d.code === updatedCustomization.typeCode)?.label || updatedCustomization.typeCode;
                      const divisionLabel = divs.find((d) => d.code === updatedCustomization.divisionCode)?.label || updatedCustomization.divisionCode;
                      const regenerated = await generateNbeDocxBlob({
                        docCode: updatedCustomization.code,
                        titleId: updatedCustomization.title,
                        titleEn: updatedCustomization.title,
                        categoryNameId: docTypeLabel,
                        divisionName: divisionLabel,
                        revisionNo: String(updatedCustomization.revision),
                        issueDateId: formatIssueDate(updatedCustomization.issueDate),
                        issueDateEn: new Date(updatedCustomization.issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                        preparedBy: updatedCustomization.preparedBy,
                        preparedRole: 'Director of Finance & Engineering / DCC Lead',
                        verifiedBy: updatedCustomization.verifiedBy,
                        verifiedRole: 'Director of Operations & Technology / CTO',
                        approvedBy: updatedCustomization.approvedBy,
                        approvedRole: 'President Director / CEO',
                        language: selectedLang,
                        preservedBodyParagraphs: updatedCustomization.preservedBodyParagraphs,
                        bodyTables: updatedCustomization.preservedBodyTables,
                      });

                      activeWordFile.dataUrl = regenerated.dataUrl;
                      activeWordFile.size = regenerated.blob.size;

                      setWordFiles((prev) =>
                        prev.map((f) => (f.id === activeWordFile.id ? { ...f, dataUrl: regenerated.dataUrl, size: regenerated.blob.size } : f))
                      );
                    } catch (e) {
                      console.error('Failed to regenerate word blob on save:', e);
                    }
                  }}
                />
              </div>

                {/* STAGE 3 NAVIGATION BUTTONS */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1.75rem',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '1.25rem',
                  }}
                >
                  <button onClick={() => setCurrentStage(2)} className="btn btn-secondary">
                    <ChevronLeft size={16} />
                    <span>Kembali ke Analisis</span>
                  </button>
                  <button
                    onClick={() => setCurrentStage(4)}
                    className="btn btn-primary"
                    style={{
                      padding: '0.85rem 2.25rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      boxShadow: '0 4px 18px rgba(0, 212, 178, 0.35)',
                    }}
                  >
                    <span>Semua File Selesai Diedit • Lanjut Upload ke Google Drive (Tahap 4)</span>
                    <ArrowRight size={17} />
                  </button>
                </div>
            </div>
          )}

      {/* ============================================================= */}
      {/* MODAL NOTICE: GOOGLE DOCS VIA MCP                              */}
      {/* ============================================================= */}
      {docsModalNotice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
          onClick={() => setDocsModalNotice(null)}
        >
          <div
            className="glass-card animate-fade-in"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              border: '1.5px solid rgba(56, 189, 248, 0.4)',
              background: '#0d1322',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={22} color="#38bdf8" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  Google Docs Terhubung (MCP Bot)
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  Berkas telah siap diedit otomatis oleh bot atau dibuka di browser.
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '1.25rem',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.45rem', marginBottom: '0.45rem' }}>
                <span style={{ color: '#94a3b8' }}>Judul Dokumen:</span>
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>{docsModalNotice.title}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.45rem', marginBottom: '0.45rem' }}>
                <span style={{ color: '#94a3b8' }}>Kode Dokumen:</span>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {docsModalNotice.code}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.45rem', marginBottom: '0.45rem' }}>
                <span style={{ color: '#94a3b8' }}>Google Doc ID:</span>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                  {docsModalNotice.googleDocId}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.45rem' }}>
                <span style={{ color: '#94a3b8' }}>Sinkronisasi:</span>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>
                  Aktif (Mengikuti Acuan Template TXT & PDF)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDocsModalNotice(null)}
                className="btn btn-secondary"
              >
                Tutup
              </button>
              <a
                href={docsModalNotice.googleDocUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', textDecoration: 'none' }}
              >
                <ExternalLink size={15} />
                <span>Buka Google Docs di Tab Baru</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAHAP 4: GOOGLE DRIVE 4-LEVEL HIERARCHY & UPLOAD               */}
      {/* ============================================================= */}
      {currentStage === 4 && (
        <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
              Tahap 4: Pembuatan Folder 4-Tingkat di Google Drive & Pendaftaran
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
              Sesuai prosedur baku bot, sistem akan membuat hierarki 4-tingkat di Google Drive perusahaan lalu mengunggah seluruh berkas Word yang telah distandarisasi.
            </p>
          </div>

          {/* VISUAL 4-LEVEL HIERARCHY PREVIEW (as specified in prom surat.docx) */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(2, 132, 199, 0.06)',
              border: '1.5px solid rgba(2, 132, 199, 0.35)',
              marginBottom: '1.75rem',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <FolderTree size={18} color="#38bdf8" />
              <span>Struktur Folder Hierarkis 4-Tingkat Google Drive:</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Level 1: Category */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ background: '#0284c7', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                  TINGKAT 1
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    Folder Kategori (Doc Type): <span style={{ color: '#38bdf8' }}>{selectedType}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Cek keberadaan folder kategori utama di Google Drive perusahaan.
                  </div>
                </div>
              </div>

              {/* Level 2: Sub-category */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  marginLeft: '1.25rem',
                }}
              >
                <div style={{ background: '#0891b2', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                  TINGKAT 2
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    Folder Sub-Kategori (Kode ZZ):{' '}
                    <span style={{ color: '#22d3ee' }}>
                      {getCleanLongName(
                        selectedSubCategory,
                        subCats.find((s) => s.code === selectedSubCategory)?.label
                      )}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Dibuat otomatis sesuai kepanjangan kode "{selectedSubCategory}" (contoh: General Procedure).
                  </div>
                </div>
              </div>

              {/* Level 3: Sub-sub category */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  marginLeft: '2.5rem',
                }}
              >
                <div style={{ background: '#7c3aed', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                  TINGKAT 3
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    Folder Sub-sub Kategori (Kode AA):{' '}
                    <span style={{ color: '#c084fc' }}>
                      {getCleanLongName(
                        selectedSubSubCategory,
                        subSubCats.find((s) => s.code === selectedSubSubCategory)?.label
                      )}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Dibuat otomatis sesuai kepanjangan kode "{selectedSubSubCategory}" (contoh: Audit Internal).
                  </div>
                </div>
              </div>

              {/* Level 4: Master Document Folder */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1.5px solid var(--primary)',
                  marginLeft: '3.75rem',
                }}
              >
                <div style={{ background: 'var(--primary)', color: '#000', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                  TINGKAT 4
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>
                    Folder Dokumen Keseluruhan: "{detectedFolderName || activeCustomization.title || 'Kebijakan Audit Internal'}"
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Tempat seluruh berkas Word distandarisasi akan disimpan dan diarsipkan di Google Drive.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FILES READY FOR UPLOAD */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.65rem' }}>
              Berkas Word yang Akan Diunggah ke Folder Tingkat 4 ({wordFiles.length} berkas):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {wordFiles.map((wf, idx) => {
                const c = fileCustomizations[wf.id] || activeCustomization;
                return (
                  <div
                    key={wf.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <File size={15} color="#38bdf8" />
                      <span className="mono" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                        {c.code}
                      </span>
                      <span>-</span>
                      <span style={{ fontWeight: 600 }}>{c.title}.docx</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Cover & Kop Siap • {formatBytes(wf.size)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PROGRESS BAR WHILE UPLOADING */}
          {driveProgress && (
            <div
              style={{
                margin: '1.25rem 0',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(2, 132, 199, 0.15)',
                border: '1px solid rgba(2, 132, 199, 0.4)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                  Mengunggah berkas {driveProgress.current} dari {driveProgress.total}: {driveProgress.currentFileName}
                </span>
                <span style={{ fontWeight: 800 }}>
                  {Math.round((driveProgress.current / driveProgress.total) * 100)}%
                </span>
              </div>
              <div style={{ height: '7px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(driveProgress.current / driveProgress.total) * 100}%`,
                    background: 'linear-gradient(90deg, #0284c7, #10b981)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <button onClick={() => setCurrentStage(3)} className="btn btn-secondary">
              <ChevronLeft size={16} />
              <span>Kembali ke Edit Standarisasi</span>
            </button>

            <button
              onClick={executeDriveUploadAndSave}
              disabled={isDriveProcessing || wordFiles.length === 0}
              className="btn btn-primary"
              style={{
                padding: '0.85rem 2.25rem',
                fontWeight: 800,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 18px rgba(0, 212, 178, 0.35)',
              }}
            >
              {isDriveProcessing ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Memproses Struktur & Mengunggah...</span>
                </>
              ) : (
                <>
                  <Bot size={18} />
                  <span>Jalankan Bot: Buat Struktur 4-Tingkat & Upload Berkas</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
