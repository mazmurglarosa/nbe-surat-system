import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  Eye,
  Layers,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { DocumentLanguage, RevisionRecord } from '../types';
import { generateAndDownloadNbeDocx, cleanRole, extractTocFromContent } from '../utils/nbeDocxGenerator';
import { DocxTableData } from '../utils/docxExtractor';
import { MsWordRibbonEditor, KopTableSettings } from './MsWordRibbonEditor';
import { loadTemplateSettings, DocumentTemplateSettings } from '../services/templateSettings';
import { translateTocList, translateTextLine, translateHtmlContent } from '../utils/translationService';
import { formatNbeStandardDate, parseDateParts } from '../utils/dateFormatter';
import {
  translateExtractedHtml,
  translateTocHeadings,
  paginateHtmlContent,
  TocHeadingItem,
} from '../utils/docxOriginalExtractor';

export type { KopTableSettings };

export interface DocumentSavePayload {
  title: string;
  code: string;
  companyName?: string;
  typeLabel?: string;
  issueDate: string;
  revision: number;
  preparedBy: string;
  preparedRole?: string;
  verifiedBy: string;
  verifiedRole?: string;
  approvedBy: string;
  approvedRole?: string;
  revisions?: RevisionRecord[];
  tocList?: Array<{ num: string; title: string; isSub?: boolean }>;
  bodyContent?: string;
  bodyPagesHtml?: string[];
  preservedBodyParagraphs?: string[];
  bodyTables?: DocxTableData[];
  kopSettings?: KopTableSettings;
}

export interface A4DocumentPreviewProps {
  language: DocumentLanguage;
  title: string;
  code: string;
  issueDate: string;
  revision?: number;
  revisions?: RevisionRecord[];
  preparedBy?: string;
  preparedRole?: string;
  verifiedBy?: string;
  verifiedRole?: string;
  approvedBy?: string;
  approvedRole?: string;
  typeLabel?: string;
  divisionLabel?: string;
  approverLabel?: string;
  categoryCode?: string;
  bodyContent?: string;
  preservedBodyParagraphs?: string[];
  bodyTables?: DocxTableData[];
  coverLogoDataUrl?: string | null;
  kopLogoDataUrl?: string | null;
  coverLogoWidthInches?: number;
  kopLogoWidthInches?: number;
  tocList?: Array<{ num: string; title: string; isSub?: boolean }>;
  bodyPages?: string[][];
  originalHtmlBody?: string;
  tocHeadings?: TocHeadingItem[];
  documentId?: string;
  onCopyCode?: () => void;
  onDownloadDocx?: () => void;
  onSaveDocument?: (updated: DocumentSavePayload) => void;
  initialPaperSize?: 'A4' | 'F4';
  paperSize?: 'A4' | 'F4';
  onPaperSizeChange?: (size: 'A4' | 'F4') => void;
}

export const A4DocumentPreview: React.FC<A4DocumentPreviewProps> = ({
  language = 'id',
  title,
  code,
  issueDate,
  revision = 0,
  revisions = [],
  preparedBy = 'Mazmur Gusti Agung Larosa',
  preparedRole,
  verifiedBy = 'Dennis Raditya',
  verifiedRole,
  approvedBy = 'Bima Satryo Hartanto',
  approvedRole,
  typeLabel = 'Standar Operasional Prosedur (SOP)',
  divisionLabel = 'General (GNR)',
  approverLabel = 'President Director (CEO)',
  categoryCode = 'KB',
  bodyContent,
  preservedBodyParagraphs = [],
  bodyTables = [],
  coverLogoDataUrl = null,
  kopLogoDataUrl = null,
  coverLogoWidthInches = 3.2,
  kopLogoWidthInches = 0.95,
  tocList,
  bodyPages,
  originalHtmlBody,
  tocHeadings,
  documentId,
  onCopyCode,
  onDownloadDocx,
  onSaveDocument,
  initialPaperSize = 'A4',
  paperSize: propPaperSize,
  onPaperSizeChange,
}) => {
  const [activePageTab, setActivePageTab] = useState<'all' | number>('all');
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>(propPaperSize || initialPaperSize || 'A4');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Sync state if prop changes from outside
  useEffect(() => {
    if (propPaperSize && propPaperSize !== paperSize) {
      setPaperSize(propPaperSize);
    }
  }, [propPaperSize]);

  // Accessible keyboard Escape handler for print paper size modal (R-32 Accessibility)
  useEffect(() => {
    if (!showPrintModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPrintModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPrintModal]);

  // Dynamic @page style injection for print & PDF export
  useEffect(() => {
    let styleTag = document.getElementById('nbe-dynamic-paper-size') as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'nbe-dynamic-paper-size';
      document.head.appendChild(styleTag);
    }

    const isF4Size = paperSize === 'F4';
    const paperWidth = isF4Size ? '215mm' : '210mm';
    const paperHeight = isF4Size ? '330mm' : '297mm';
    const paperPageSize = isF4Size ? '215mm 330mm' : 'A4';

    styleTag.textContent = `
      @media print {
        @page {
          size: ${paperPageSize} portrait !important;
          margin: 0 !important;
        }
        html, body {
          width: ${paperWidth} !important;
          min-height: ${paperHeight} !important;
          height: auto !important;
        }
        #nbe-single-a4-preview-canvas,
        #nbe-isolated-document-canvas,
        .a4-print-container {
          width: ${paperWidth} !important;
        }
        .a4-page-preview,
        .a4-print-page {
          width: ${paperWidth} !important;
          min-height: ${paperHeight} !important;
          max-height: ${paperHeight} !important;
          height: ${paperHeight} !important;
          padding: 20mm 20mm 20mm 22mm !important;
        }
      }
    `;

    return () => {
      const el = document.getElementById('nbe-dynamic-paper-size');
      if (el) {
        el.remove();
      }
    };
  }, [paperSize]);

  // Direct in-preview interactive editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editableTitle, setEditableTitle] = useState(title || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN');
  const [editableCode, setEditableCode] = useState(code || '0001-KB-GNR-CEO-X-2026');
  const [editableCompanyName, setEditableCompanyName] = useState('PT NIRWANA BHUMI ENERGY');
  const [editableDocTypeLabel, setEditableDocTypeLabel] = useState(typeLabel || 'Standar Operasional Prosedur (SOP)');
  const [editableIssueDate, setEditableIssueDate] = useState(issueDate || '2026-10-17');
  const [editableRevision, setEditableRevision] = useState(revision ?? 0);
  const [editablePreparedBy, setEditablePreparedBy] = useState(preparedBy || 'Mazmur Gusti Agung Larosa');
  const [editablePreparedRole, setEditablePreparedRole] = useState(cleanRole(preparedRole) || 'Lead Document Controller & Finance Director');
  const [editableVerifiedBy, setEditableVerifiedBy] = useState(verifiedBy || 'Dennis Raditya');
  const [editableVerifiedRole, setEditableVerifiedRole] = useState(cleanRole(verifiedRole) || 'Director of Operations & Technology / CTO');
  const [editableApprovedBy, setEditableApprovedBy] = useState(approvedBy || 'Bima Satryo Hartanto');
  const [editableApprovedRole, setEditableApprovedRole] = useState(cleanRole(approvedRole) || 'President Director / CEO');
  const [editableRevisionDesc, setEditableRevisionDesc] = useState(
    revisions?.[0]?.description ||
      `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${code || '0001-KB-GNR-CEO-X-2026'})`
  );
  const [editableParagraphs, setEditableParagraphs] = useState<string[]>(preservedBodyParagraphs || []);
  const [editableTables, setEditableTables] = useState<DocxTableData[]>(bodyTables || []);
  const editableBodyRef = React.useRef<HTMLDivElement>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Revisions List State
  const [editableRevisionsList, setEditableRevisionsList] = useState<RevisionRecord[]>(() => {
    if (revisions && revisions.length > 0) return revisions;
    return [
      {
        revision: revision ?? 0,
        date: formatNbeStandardDate(issueDate, language === 'en' ? 'en' : 'id'),
        description: `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${code || '0001-KB-GNR-CEO-X-2026'})`,
        revisedBy: preparedBy || 'Mazmur Gusti Agung Larosa',
      },
    ];
  });

  // Table of Contents State (Diambil dinamis dari heading asli berkas .docx yang diedit)
  const [editableTocItems, setEditableTocItems] = useState<Array<{ num: string; title: string; isSub?: boolean }>>(() => {
    if (tocHeadings && tocHeadings.length > 0) return translateTocHeadings(tocHeadings, language);
    if (tocList && tocList.length > 0) return translateTocList(tocList, language === 'en' ? 'en' : 'id');
    return [
      { num: '1.0', title: language === 'en' ? 'DOCUMENT CONTENT' : 'ISI DOKUMEN', isSub: false },
    ];
  });

  // State untuk menyimpan seluruh halaman HTML yang sedang diedit (WYSIWYG 1:1)
  const [currentHtmlPages, setCurrentHtmlPages] = useState<string[]>([]);

  // Kop Table Sizing Settings State
  const [kopSettings, setKopSettings] = useState<KopTableSettings>(() => {
    try {
      const saved = localStorage.getItem('nbe_kop_table_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.logoScale && parsed.logoScale > 1.0) parsed.logoScale = 1.0;
        return parsed;
      }
    } catch (e) {}
    return {
      logoWidthPercent: 25,
      paddingY: 6,
      fontSizeScale: 1.0,
      borderWidth: 1.5,
      logoScale: 1.0,
    };
  });

  // Auto-Save Management State
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const isUserModifiedRef = useRef<boolean>(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const docStorageKey = `nbe_doc_autosave_${(documentId || code || 'default').trim().toUpperCase()}`;

  // Global corporate master logo & template settings
  const [masterSettings, setMasterSettings] = useState<DocumentTemplateSettings>(() => loadTemplateSettings());

  useEffect(() => {
    const handleTemplateSync = (e: any) => {
      setMasterSettings(e.detail || loadTemplateSettings());
    };
    window.addEventListener('nbe_template_settings_updated', handleTemplateSync);
    window.addEventListener('nbe-template-settings-updated', handleTemplateSync);
    return () => {
      window.removeEventListener('nbe_template_settings_updated', handleTemplateSync);
      window.removeEventListener('nbe-template-settings-updated', handleTemplateSync);
    };
  }, []);

  const effectiveCoverLogoDataUrl = coverLogoDataUrl || masterSettings.coverLogoDataUrl || undefined;
  const effectiveKopLogoDataUrl = kopLogoDataUrl || masterSettings.kopLogoDataUrl || undefined;
  const effectiveCoverLogoWidthInches = coverLogoWidthInches || masterSettings.coverLogoWidthInches || 3.2;
  const effectiveKopLogoWidthInches = kopLogoWidthInches || masterSettings.kopLogoWidthInches || 1.45;

  // Load auto-saved draft on mount or when code changes
  useEffect(() => {
    try {
      const rawSaved = localStorage.getItem(docStorageKey);
      if (rawSaved) {
        // Guardrail: Buang otomatis draf lama jika terkontaminasi teks dummy boilerplate
        if (
          rawSaved.includes('operational governance') ||
          rawSaved.includes('General Provisions') ||
          rawSaved.includes('PT Nirwana Bhumi Energy ensuring all activities operate efficiently') ||
          rawSaved.includes('IMS (Integrated Management Systems)') ||
          rawSaved.includes('1.0 ISI DOKUMEN') ||
          rawSaved.includes('ISI DOKUMEN')
        ) {
          console.warn('Purged legacy dummy draft from localStorage:', docStorageKey);
          localStorage.removeItem(docStorageKey);
          localStorage.removeItem('nbe_doc_autosave_latest');
          return;
        }

        const parsed = JSON.parse(rawSaved);
        if (title) setEditableTitle(title);
        else if (parsed.title) setEditableTitle(parsed.title);

        if (code) setEditableCode(code);
        else if (parsed.code) setEditableCode(parsed.code);

        if (parsed.companyName) setEditableCompanyName(parsed.companyName);

        if (typeLabel) setEditableDocTypeLabel(translateTextLine(typeLabel, language === 'en' ? 'en' : 'id'));
        else if (parsed.typeLabel) setEditableDocTypeLabel(parsed.typeLabel);

        if (issueDate) setEditableIssueDate(issueDate);
        else if (parsed.issueDate) setEditableIssueDate(parsed.issueDate);

        if (typeof revision === 'number') setEditableRevision(revision);
        else if (typeof parsed.revision === 'number') setEditableRevision(parsed.revision);

        if (preparedBy) setEditablePreparedBy(preparedBy);
        else if (parsed.preparedBy) setEditablePreparedBy(parsed.preparedBy);

        if (parsed.preparedRole) setEditablePreparedRole(parsed.preparedRole);

        if (verifiedBy) setEditableVerifiedBy(verifiedBy);
        else if (parsed.verifiedBy) setEditableVerifiedBy(parsed.verifiedBy);

        if (parsed.verifiedRole) setEditableVerifiedRole(parsed.verifiedRole);

        if (approvedBy) setEditableApprovedBy(approvedBy);
        else if (parsed.approvedBy) setEditableApprovedBy(parsed.approvedBy);

        if (parsed.approvedRole) setEditableApprovedRole(parsed.approvedRole);

        if (revisions && revisions.length > 0) {
          setEditableRevisionsList(revisions);
        } else if (parsed.revisions && Array.isArray(parsed.revisions) && parsed.revisions.length > 0) {
          setEditableRevisionsList(parsed.revisions);
        }
        if (!originalHtmlBody && parsed.tocList && Array.isArray(parsed.tocList) && parsed.tocList.length > 0) {
          setEditableTocItems(parsed.tocList);
        }
        if (!originalHtmlBody && parsed.preservedBodyParagraphs && Array.isArray(parsed.preservedBodyParagraphs)) {
          setEditableParagraphs(parsed.preservedBodyParagraphs);
        }
        if (!originalHtmlBody && parsed.bodyTables && Array.isArray(parsed.bodyTables)) {
          setEditableTables(parsed.bodyTables);
        }
        if (parsed.kopSettings) {
          if (parsed.kopSettings.logoScale && parsed.kopSettings.logoScale > 1.0) {
            parsed.kopSettings.logoScale = 1.0;
          }
          setKopSettings(parsed.kopSettings);
        }
        if (parsed.lastSavedFormatted) {
          setLastSavedTime(parsed.lastSavedFormatted);
        }
        isUserModifiedRef.current = true;
        setAutoSaveStatus('saved');
      }
    } catch (err) {
      console.warn('Could not load auto-saved document draft:', err);
    }
  }, [docStorageKey]);

  // Track last synced props to react immediately when parent form values change
  const lastPropsRef = useRef({
    code: code || '',
    title: title || '',
    typeLabel: typeLabel || '',
    issueDate: issueDate || '',
    revision: revision ?? 0,
    revisionsJson: JSON.stringify(revisions || []),
    preparedBy: preparedBy || '',
    preparedRole: preparedRole || '',
    verifiedBy: verifiedBy || '',
    verifiedRole: verifiedRole || '',
    approvedBy: approvedBy || '',
    approvedRole: approvedRole || '',
    documentId: documentId || '',
    tocHeadingsJson: JSON.stringify(tocHeadings || []),
  });

  // Synchronize state whenever props from parent form change
  useEffect(() => {
    const prev = lastPropsRef.current;
    const currentRevsJson = JSON.stringify(revisions || []);
    const currentTocHeadingsJson = JSON.stringify(tocHeadings || []);
    const targetLang = language === 'en' ? 'en' : 'id';

    if (documentId && documentId !== prev.documentId) {
      isUserModifiedRef.current = false;
      if (tocHeadings && tocHeadings.length > 0) {
        setEditableTocItems(translateTocHeadings(tocHeadings, language));
      }
    }
    if (code && code !== prev.code) {
      setEditableCode(code);
    }
    if (title && title !== prev.title) {
      setEditableTitle(title);
    }
    if (typeLabel && typeLabel !== prev.typeLabel) {
      setEditableDocTypeLabel(translateTextLine(typeLabel, targetLang));
    }
    if (issueDate && issueDate !== prev.issueDate) {
      setEditableIssueDate(issueDate);
      setEditableRevisionsList((prevList) => {
        if (prevList.length > 0 && prevList[0].revision === 0) {
          return [
            {
              ...prevList[0],
              date: formatNbeStandardDate(issueDate, targetLang),
            },
            ...prevList.slice(1),
          ];
        }
        return prevList;
      });
    }
    if (typeof revision === 'number' && revision !== prev.revision) {
      setEditableRevision(revision);
    }
    if (revisions && revisions.length > 0 && currentRevsJson !== prev.revisionsJson) {
      setEditableRevisionsList(revisions);
      if (revisions[0]?.description) {
        setEditableRevisionDesc(revisions[0].description);
      }
    }
    if (tocHeadings && tocHeadings.length > 0 && currentTocHeadingsJson !== prev.tocHeadingsJson) {
      setEditableTocItems(translateTocHeadings(tocHeadings, language));
    }
    if (preparedBy && preparedBy !== prev.preparedBy) {
      setEditablePreparedBy(preparedBy);
    }
    if (preparedRole !== undefined && preparedRole !== prev.preparedRole) {
      setEditablePreparedRole(preparedRole);
    }
    if (verifiedBy && verifiedBy !== prev.verifiedBy) {
      setEditableVerifiedBy(verifiedBy);
    }
    if (verifiedRole !== undefined && verifiedRole !== prev.verifiedRole) {
      setEditableVerifiedRole(verifiedRole);
    }
    if (approvedBy && approvedBy !== prev.approvedBy) {
      setEditableApprovedBy(approvedBy);
    }
    if (approvedRole !== undefined && approvedRole !== prev.approvedRole) {
      setEditableApprovedRole(approvedRole);
    }
    if (preservedBodyParagraphs && preservedBodyParagraphs.length > 0) {
      setEditableParagraphs(preservedBodyParagraphs);
    }
    if (bodyTables && bodyTables.length > 0) {
      setEditableTables(bodyTables);
    }

    lastPropsRef.current = {
      code: code || '',
      title: title || '',
      typeLabel: typeLabel || '',
      issueDate: issueDate || '',
      revision: revision ?? 0,
      revisionsJson: currentRevsJson,
      preparedBy: preparedBy || '',
      preparedRole: preparedRole || '',
      verifiedBy: verifiedBy || '',
      verifiedRole: verifiedRole || '',
      approvedBy: approvedBy || '',
      approvedRole: approvedRole || '',
      documentId: documentId || '',
      tocHeadingsJson: currentTocHeadingsJson,
    };
  }, [code, title, typeLabel, issueDate, revision, revisions, preparedBy, preparedRole, verifiedBy, verifiedRole, approvedBy, approvedRole, preservedBodyParagraphs, bodyTables, language, tocHeadings, documentId]);

  // Bi-directional automatic translation when user selects language ('id' <-> 'en')
  const lastDocLanguageRef = useRef<DocumentLanguage>(language);
  useEffect(() => {
    if (!language) return;
    const target = language === 'en' ? 'en' : 'id';
    if (lastDocLanguageRef.current && lastDocLanguageRef.current !== language) {
      setEditableTitle((prev) => {
        const trimmed = (prev || '').trim().toUpperCase();
        if (target === 'en' && trimmed === 'SISTEM KONTROL DAN PENOMORAN DOKUMEN') {
          return 'DOCUMENT CONTROL AND NUMBERING SYSTEM';
        }
        if (target === 'id' && trimmed === 'DOCUMENT CONTROL AND NUMBERING SYSTEM') {
          return 'SISTEM KONTROL DAN PENOMORAN DOKUMEN';
        }
        return translateTextLine(prev, target);
      });

      setEditableDocTypeLabel((prev) => translateTextLine(prev, target));
      setEditableTocItems((prev) => translateTocList(prev, target));
      setEditableParagraphs((prev) => prev.map((p) => translateTextLine(p, target)));

      setEditableRevisionDesc((prev) => {
        if (target === 'en') {
          return prev
            .replace('Edisi Awal – Penerbitan Dokumen Standar PT NBE', 'Initial Edition – PT NBE Standard Document Issuance')
            .replace('Edisi Awal', 'Initial Edition');
        } else {
          return prev
            .replace('Initial Edition – PT NBE Standard Document Issuance', 'Edisi Awal – Penerbitan Dokumen Standar PT NBE')
            .replace('Initial Edition – Corporate Standard Document', 'Edisi Awal – Penerbitan Dokumen Standar PT NBE')
            .replace('Initial Edition', 'Edisi Awal');
        }
      });

      setEditableRevisionsList((prev) =>
        prev.map((r) => ({
          ...r,
          description: translateTextLine(r.description, target),
        }))
      );
    }
    lastDocLanguageRef.current = language;
  }, [language]);

  // Debounced continuous auto-save engine
  const scheduleAutoSave = useCallback((partial?: Partial<any>) => {
    isUserModifiedRef.current = true;
    setAutoSaveStatus('saving');
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      const nowStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const snapshot = {
        title: partial?.title ?? editableTitle,
        code: partial?.code ?? editableCode,
        companyName: partial?.companyName ?? editableCompanyName,
        typeLabel: partial?.typeLabel ?? editableDocTypeLabel,
        issueDate: partial?.issueDate ?? editableIssueDate,
        revision: partial?.revision ?? editableRevision,
        preparedBy: partial?.preparedBy ?? editablePreparedBy,
        preparedRole: partial?.preparedRole ?? editablePreparedRole,
        verifiedBy: partial?.verifiedBy ?? editableVerifiedBy,
        verifiedRole: partial?.verifiedRole ?? editableVerifiedRole,
        approvedBy: partial?.approvedBy ?? editableApprovedBy,
        approvedRole: partial?.approvedRole ?? editableApprovedRole,
        revisions: partial?.revisions ?? editableRevisionsList,
        tocList: partial?.tocList ?? editableTocItems,
        bodyPagesHtml: partial?.bodyPagesHtml ?? undefined,
        preservedBodyParagraphs: partial?.preservedBodyParagraphs ?? editableParagraphs,
        bodyTables: partial?.bodyTables ?? editableTables,
        kopSettings: partial?.kopSettings ?? kopSettings,
        lastSaved: new Date().toISOString(),
        lastSavedFormatted: nowStr,
      };

      try {
        const key = `nbe_doc_autosave_${(snapshot.code || code || 'default').trim().toUpperCase()}`;
        localStorage.setItem(key, JSON.stringify(snapshot));
        localStorage.setItem('nbe_doc_autosave_latest', JSON.stringify(snapshot));
      } catch (e) {
        console.warn('Auto-save error to localStorage:', e);
      }

      setAutoSaveStatus('saved');
      setLastSavedTime(nowStr);

      if (onSaveDocument) {
        onSaveDocument({
          title: snapshot.title,
          code: snapshot.code,
          companyName: snapshot.companyName,
          typeLabel: snapshot.typeLabel,
          issueDate: snapshot.issueDate,
          revision: snapshot.revision,
          preparedBy: snapshot.preparedBy,
          preparedRole: snapshot.preparedRole,
          verifiedBy: snapshot.verifiedBy,
          verifiedRole: snapshot.verifiedRole,
          approvedBy: snapshot.approvedBy,
          approvedRole: snapshot.approvedRole,
          revisions: snapshot.revisions,
          tocList: snapshot.tocList,
          bodyPagesHtml: snapshot.bodyPagesHtml,
          preservedBodyParagraphs: snapshot.preservedBodyParagraphs,
          bodyTables: snapshot.bodyTables,
          kopSettings: snapshot.kopSettings,
        });
      }
    }, 500);
  }, [
    editableTitle,
    editableCode,
    editableCompanyName,
    editableDocTypeLabel,
    editableIssueDate,
    editableRevision,
    editablePreparedBy,
    editablePreparedRole,
    editableVerifiedBy,
    editableVerifiedRole,
    editableApprovedBy,
    editableApprovedRole,
    editableRevisionsList,
    editableTocItems,
    editableParagraphs,
    editableTables,
    kopSettings,
    code,
    onSaveDocument,
  ]);

  const updateKopSetting = (key: keyof KopTableSettings, val: number) => {
    isUserModifiedRef.current = true;
    setKopSettings((prev) => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem('nbe_kop_table_settings', JSON.stringify(next));
      } catch (e) {}
      scheduleAutoSave({ kopSettings: next });
      return next;
    });
  };

  const handleCoverChange = (field: string, val: string) => {
    isUserModifiedRef.current = true;
    switch (field) {
      case 'companyName':
        setEditableCompanyName(val);
        scheduleAutoSave({ companyName: val });
        break;
      case 'typeLabel':
        setEditableDocTypeLabel(val);
        scheduleAutoSave({ typeLabel: val });
        break;
      case 'title':
        setEditableTitle(val);
        scheduleAutoSave({ title: val });
        break;
      case 'code':
        setEditableCode(val);
        scheduleAutoSave({ code: val });
        break;
      case 'approvedBy':
        setEditableApprovedBy(val);
        scheduleAutoSave({ approvedBy: val });
        break;
      case 'approvedRole':
        setEditableApprovedRole(val);
        scheduleAutoSave({ approvedRole: val });
        break;
      case 'verifiedBy':
        setEditableVerifiedBy(val);
        scheduleAutoSave({ verifiedBy: val });
        break;
      case 'verifiedRole':
        setEditableVerifiedRole(val);
        scheduleAutoSave({ verifiedRole: val });
        break;
      case 'preparedBy':
        setEditablePreparedBy(val);
        scheduleAutoSave({ preparedBy: val });
        break;
      case 'preparedRole':
        setEditablePreparedRole(val);
        scheduleAutoSave({ preparedRole: val });
        break;
    }
  };

  const handleResetToTemplate = () => {
    if (window.confirm('Apakah Anda yakin ingin mengembalikan isi dokumen ke template awal sistem? Semua editan yang tersimpan otomatis pada dokumen ini akan dihapus.')) {
      try {
        const key = `nbe_doc_autosave_${(code || 'default').trim().toUpperCase()}`;
        localStorage.removeItem(key);
      } catch (e) {}
      isUserModifiedRef.current = false;
      setEditableTitle(title || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN');
      setEditableCode(code || '0001-KB-GNR-CEO-X-2026');
      setEditableCompanyName('PT NIRWANA BHUMI ENERGY');
      setEditableDocTypeLabel(typeLabel || 'Standar Operasional Prosedur (SOP)');
      setEditableIssueDate(issueDate || '2026-10-17');
      setEditableRevision(revision ?? 0);
      setEditablePreparedBy(preparedBy || 'Mazmur Gusti Agung Larosa');
      setEditablePreparedRole('Lead Document Controller & Finance Director');
      setEditableVerifiedBy(verifiedBy || 'Dennis Raditya');
      setEditableVerifiedRole('Director of Operations & Technology / CTO');
      setEditableApprovedBy(approvedBy || 'Bima Satryo Hartanto');
      setEditableApprovedRole('President Director / CEO');
      setEditableParagraphs(preservedBodyParagraphs || []);
      setEditableTables(bodyTables || []);
      setEditableRevisionsList(revisions && revisions.length > 0 ? revisions : [
        {
          revision: revision ?? 0,
          date: formatNbeStandardDate(issueDate, language === 'en' ? 'en' : 'id'),
          description: `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${code || '0001-KB-GNR-CEO-X-2026'})`,
          revisedBy: preparedBy || 'Mazmur Gusti Agung Larosa',
        },
      ]);
      setEditableTocItems(
        tocHeadings && tocHeadings.length > 0
          ? translateTocHeadings(tocHeadings, language)
          : (tocList && tocList.length > 0
              ? translateTocList(tocList, language === 'en' ? 'en' : 'id')
              : [{ num: '1.0', title: language === 'en' ? 'DOCUMENT CONTENT' : 'ISI DOKUMEN', isSub: false }])
      );
      setKopSettings({
        logoWidthPercent: 25,
        paddingY: 6,
        fontSizeScale: 1.0,
        borderWidth: 1.5,
        logoScale: 1.0,
      });
      setAutoSaveStatus('idle');
      setLastSavedTime(null);
      setSaveSuccessNotice('Dokumen berhasil dikembalikan ke template awal.');
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    }
  };

  const handleAddRevisionRow = () => {
    isUserModifiedRef.current = true;
    const newRevNum = editableRevisionsList.length > 0
      ? (editableRevisionsList[editableRevisionsList.length - 1].revision + 1)
      : 1;
    const newRow: RevisionRecord = {
      revision: newRevNum,
      date: formattedDate,
      description: `Revisi klausul dan pemutakhiran standar operasional (${effectiveCode})`,
      revisedBy: effectivePreparedBy,
    };
    const updated = [...editableRevisionsList, newRow];
    setEditableRevisionsList(updated);
    scheduleAutoSave({ revisions: updated });
  };

  const handleDeleteRevisionRow = () => {
    if (editableRevisionsList.length <= 1) return;
    isUserModifiedRef.current = true;
    const updated = editableRevisionsList.slice(0, editableRevisionsList.length - 1);
    setEditableRevisionsList(updated);
    scheduleAutoSave({ revisions: updated });
  };

  const handleUpdateRevisionCell = (idx: number, field: keyof RevisionRecord, val: any) => {
    isUserModifiedRef.current = true;
    const updated = editableRevisionsList.map((r, rIdx) => {
      if (rIdx !== idx) return r;
      return { ...r, [field]: val };
    });
    setEditableRevisionsList(updated);
    scheduleAutoSave({ revisions: updated });
  };

  const handleAddTocMainClause = () => {
    isUserModifiedRef.current = true;
    const nextNum = `${editableTocItems.length + 1}.0`;
    const newItem = { num: nextNum, title: 'KLAUSUL BARU DOKUMEN', isSub: false };
    const updated = [...editableTocItems, newItem];
    setEditableTocItems(updated);
    scheduleAutoSave({ tocList: updated });
  };

  const handleAddTocSubClause = () => {
    isUserModifiedRef.current = true;
    const parentNum = editableTocItems.length > 0 ? editableTocItems[editableTocItems.length - 1].num.split('.')[0] : '1';
    const subCount = editableTocItems.filter(i => i.isSub && i.num.startsWith(parentNum + '.')).length + 1;
    const nextNum = `${parentNum}.${subCount}`;
    const newItem = { num: nextNum, title: 'Sub-klausul Rincian Teknis', isSub: true };
    const updated = [...editableTocItems, newItem];
    setEditableTocItems(updated);
    scheduleAutoSave({ tocList: updated });
  };

  const handleDeleteTocItem = () => {
    if (editableTocItems.length <= 1) return;
    isUserModifiedRef.current = true;
    const updated = editableTocItems.slice(0, editableTocItems.length - 1);
    setEditableTocItems(updated);
    scheduleAutoSave({ tocList: updated });
  };

  const handleUpdateTocItem = (idx: number, field: 'num' | 'title', val: string) => {
    isUserModifiedRef.current = true;
    const updated = editableTocItems.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, [field]: val };
    });
    setEditableTocItems(updated);
    scheduleAutoSave({ tocList: updated });
  };

  const handleAutoSaveFromRibbon = (updatedHtmlPages: string[]) => {
    isUserModifiedRef.current = true;
    setCurrentHtmlPages(updatedHtmlPages);
    scheduleAutoSave({ bodyPagesHtml: updatedHtmlPages });
  };

  const handleCellEdit = (tableIndex: number, rowIndex: number, cellIndex: number, value: string) => {
    setEditableTables((prev) => {
      const copy = prev.map((t, tIdx) => {
        if (tIdx !== tableIndex) return t;
        const newRows = t.rows.map((row, rIdx) => {
          if (rIdx !== rowIndex) return row;
          const newCells = [...row];
          newCells[cellIndex] = value;
          return newCells;
        });
        return { ...t, rows: newRows };
      });
      return copy;
    });
  };

  const handleInsertTable = () => {
    const newTable: DocxTableData = {
      rows: [
        ['No', 'Item / Klausul', 'Deskripsi Pelaksanaan', 'Status Verifikasi'],
        ['1', '1.0 Pemeriksaan Dokumen', 'Pemeriksaan kelengkapan berkas SOP', 'Memenuhi Syarat'],
        ['2', '2.0 Bukti Implementasi', 'Sampling rekaman kerja dan absensi', 'Sesuai Standar'],
      ],
    };
    setEditableTables((prev) => [...prev, newTable]);
  };

  const handleAddRow = () => {
    if (editableTables.length === 0) {
      handleInsertTable();
      return;
    }
    setEditableTables((prev) => {
      const copy = [...prev];
      const lastTbl = copy[copy.length - 1];
      const colCount = lastTbl.rows[0]?.length || 4;
      const newRow = Array(colCount).fill('Teks baris baru');
      copy[copy.length - 1] = {
        ...lastTbl,
        rows: [...lastTbl.rows, newRow],
      };
      return copy;
    });
  };

  const handleDeleteRow = () => {
    if (editableTables.length === 0) return;
    setEditableTables((prev) => {
      const copy = [...prev];
      const lastTbl = copy[copy.length - 1];
      if (lastTbl.rows.length <= 1) return prev;
      copy[copy.length - 1] = {
        ...lastTbl,
        rows: lastTbl.rows.slice(0, lastTbl.rows.length - 1),
      };
      return copy;
    });
  };

  const displayTitle = (isEditing ? editableTitle : title || editableTitle || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN').trim().toUpperCase();
  const effectiveCode = (isEditing ? editableCode : code || editableCode || '0001-KB-GNR-CEO-X-2026').trim().toUpperCase();
  const effectivePreparedBy = isEditing ? editablePreparedBy : preparedBy || editablePreparedBy || 'Mazmur Gusti Agung Larosa';
  const effectiveVerifiedBy = isEditing ? editableVerifiedBy : verifiedBy || editableVerifiedBy || 'Dennis Raditya';
  const effectiveApprovedBy = isEditing ? editableApprovedBy : approvedBy || editableApprovedBy || 'Bima Satryo Hartanto';
  const effectiveRevision = isEditing ? editableRevision : (typeof revision === 'number' ? revision : editableRevision);
  const effectiveDateStr = isEditing ? editableIssueDate : (issueDate || editableIssueDate);

  const formatRoleDisplay = (role?: string) => {
    if (!role) return '';
    const trimmed = role.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('(') && trimmed.endsWith(')') ? trimmed : `(${trimmed})`;
  };

  const effectivePreparedRole = formatRoleDisplay(
    isEditing ? editablePreparedRole : (preparedRole || editablePreparedRole || 'Lead Document Controller & Finance Director')
  );
  const effectiveVerifiedRole = formatRoleDisplay(
    isEditing ? editableVerifiedRole : (verifiedRole || editableVerifiedRole || 'Director of Operations & Technology / CTO')
  );
  const effectiveApprovedRole = formatRoleDisplay(
    isEditing ? editableApprovedRole : (approvedRole || editableApprovedRole || 'President Director / CEO')
  );

  // Dynamic effective document type label (translated according to selected language)
  const effectiveDocTypeLabel = React.useMemo(() => {
    const raw = (isEditing ? editableDocTypeLabel : (typeLabel || editableDocTypeLabel || 'Standard Operating Procedure (SOP)')).trim();
    return translateTextLine(raw, language === 'en' ? 'en' : 'id');
  }, [isEditing, editableDocTypeLabel, typeLabel, language]);

  const formattedDate = React.useMemo(() => {
    return formatNbeStandardDate(effectiveDateStr, 'id');
  }, [effectiveDateStr]);

  const formattedDateEn = React.useMemo(() => {
    return formatNbeStandardDate(effectiveDateStr, 'en');
  }, [effectiveDateStr]);

  const activeRevRecord = React.useMemo(() => {
    const list = editableRevisionsList && editableRevisionsList.length > 0
      ? editableRevisionsList
      : (revisions && revisions.length > 0 ? revisions : []);
    return list.find((r) => r.revision === effectiveRevision) || list[list.length - 1] || null;
  }, [editableRevisionsList, revisions, effectiveRevision]);

  const revDateDisplay = React.useMemo(() => {
    if (activeRevRecord?.date) {
      return formatNbeStandardDate(activeRevRecord.date, language === 'en' ? 'en' : 'id');
    }
    return language === 'en' ? formattedDateEn : formattedDate;
  }, [activeRevRecord, language, formattedDateEn, formattedDate]);

  const effectiveRevisions: RevisionRecord[] = React.useMemo(() => {
    if (revisions && revisions.length > 0) {
      return [
        {
          ...revisions[0],
          revision: effectiveRevision,
          date: formattedDate,
          description: editableRevisionDesc || revisions[0].description,
          revisedBy: effectivePreparedBy,
        },
        ...revisions.slice(1),
      ];
    }
    return [
      {
        revision: effectiveRevision,
        date: formattedDate,
        description:
          editableRevisionDesc ||
          (language === 'en'
            ? `Initial Edition – Corporate Standard Document (${effectiveCode})`
            : language === 'bi'
            ? `Edisi Awal – Penerbitan Dokumen Standar / Initial Edition (${effectiveCode})`
            : `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${effectiveCode})`),
        revisedBy: effectivePreparedBy,
      },
    ];
  }, [revisions, effectiveRevision, formattedDate, language, effectiveCode, effectivePreparedBy, editableRevisionDesc]);

  const isProceduralDoc = React.useMemo(() => {
    if (categoryCode !== 'KB' && !effectiveCode.includes('-KB-')) return true;
    if (tocList && tocList.length > 0) return true;
    if (bodyPages && bodyPages.length > 0) return true;
    if (
      editableParagraphs &&
      editableParagraphs.length > 0 &&
      !editableParagraphs.some((p) => p.toUpperCase().includes('MENIMBANG'))
    ) {
      return true;
    }
    return false;
  }, [categoryCode, effectiveCode, tocList, bodyPages, editableParagraphs]);

  const effectiveTocList = React.useMemo(() => {
    if (tocHeadings && tocHeadings.length > 0) {
      return translateTocHeadings(tocHeadings, language);
    }
    if (tocList && tocList.length > 0) {
      return translateTocList(tocList, language === 'en' ? 'en' : 'id');
    }
    if (editableTocItems && editableTocItems.length > 0) {
      return translateTocHeadings(editableTocItems, language);
    }
    return [
      { num: '1.0', title: language === 'en' ? 'DOCUMENT CONTENT' : 'ISI DOKUMEN', isSub: false },
    ];
  }, [tocHeadings, tocList, editableTocItems, language]);

  const effectiveBodyPages: string[][] = React.useMemo(() => {
    const target = language === 'en' ? 'en' : 'id';
    if (bodyPages && bodyPages.length > 0) {
      return bodyPages.map((pg) => pg.map((line) => translateTextLine(line, target)));
    }
    const currentParagraphs =
      editableParagraphs && editableParagraphs.length > 0
        ? editableParagraphs
        : preservedBodyParagraphs && preservedBodyParagraphs.length > 0
        ? preservedBodyParagraphs
        : [];

    if (currentParagraphs.length > 0) {
      const pages: string[][] = [];
      let currentPage: string[] = [];
      currentParagraphs.forEach((p, idx) => {
        currentPage.push(translateTextLine(p, target));
        if (currentPage.length >= 7 || idx === currentParagraphs.length - 1) {
          pages.push(currentPage);
          currentPage = [];
        }
      });
      return pages.length > 0 ? pages : [currentParagraphs.map((l) => translateTextLine(l, target))];
    }
    return [];
  }, [bodyPages, editableParagraphs, preservedBodyParagraphs, language]);

  const [translatedHtmlPages, setTranslatedHtmlPages] = useState<string[]>([]);

  useEffect(() => {
    let isCancelled = false;
    const processContent = async () => {
      if (originalHtmlBody && originalHtmlBody.trim()) {
        const translatedHtml = await translateExtractedHtml(originalHtmlBody, language);
        if (!isCancelled) {
          const pages = paginateHtmlContent(translatedHtml);
          setTranslatedHtmlPages(pages);
        }
      } else if (effectiveBodyPages && effectiveBodyPages.length > 0) {
        const pages = effectiveBodyPages.map((pageLines) => {
          return pageLines
            .map((line) => {
              const matchH = line.trim().match(/^([0-9]+(?:\.0)?\.?|[IVXLCDM]+\.?)\s+(.*)$/);
              if (matchH) {
                const [, numPart, titlePart] = matchH;
                const isMainH = numPart.endsWith('.0') || !numPart.includes('.');
                return `<p style="margin: ${
                  isMainH ? '0.75rem' : '0.45rem'
                } 0 0.3rem 0; font-weight: bold; color: #000000; font-size: ${
                  isMainH ? '11pt' : '10.5pt'
                }; font-family: Arial; line-height: 1.5; padding-left: 0.5in; text-indent: -0.5in; word-break: normal; overflow-wrap: break-word;"><span style="display: inline-block; min-width: 0.5in;">${numPart}</span> ${titlePart}</p>`;
              }
              return `<p style="padding-left: 0.5in; text-align: justify; line-height: 1.6; margin-bottom: 0.5rem; font-size: 10pt; font-family: Arial; word-break: normal; overflow-wrap: break-word;">${line}</p>`;
            })
            .join('');
        });
        if (!isCancelled) {
          setTranslatedHtmlPages(pages);
        }
      } else {
        if (!isCancelled) {
          setTranslatedHtmlPages([
            `<p style="font-family: Arial, sans-serif; font-size: 10.5pt; color: #64748b; text-align: justify; padding: 2rem 0; font-style: italic;">${
              language === 'en' ? 'Original document content is loading or empty.' : 'Isi dokumen asli sedang dimuat atau kosong.'
            }</p>`,
          ]);
        }
      }
    };
    processContent();
    return () => {
      isCancelled = true;
    };
  }, [originalHtmlBody, effectiveBodyPages, language]);

  const totalPages = isProceduralDoc ? 3 + Math.max(1, translatedHtmlPages.length || effectiveBodyPages.length) : 4;

  const documentYear = React.useMemo(() => {
    if (editableIssueDate) {
      const match = String(editableIssueDate).match(/\b(20\d\d)\b/);
      if (match) return match[1];
    }
    if (effectiveCode) {
      const match = String(effectiveCode).match(/\b(20\d\d)\b/);
      if (match) return match[1];
    }
    return new Date().getFullYear().toString();
  }, [editableIssueDate, effectiveCode]);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(effectiveCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
    if (onCopyCode) onCopyCode();
  };

  const handleSave = () => {
    let finalParagraphs = editableParagraphs;
    if (editableBodyRef.current) {
      const pElements = Array.from(editableBodyRef.current.querySelectorAll('p'));
      if (pElements.length > 0) {
        finalParagraphs = pElements
          .map((el) => (el as HTMLElement).innerText.trim())
          .filter((t) => t.length > 0);
      } else {
        const textLines = editableBodyRef.current.innerText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (textLines.length > 0) {
          finalParagraphs = textLines;
        }
      }
      setEditableParagraphs(finalParagraphs);
    }

    const updatedRevs: RevisionRecord[] = [
      {
        revision: effectiveRevision,
        date: formattedDate,
        description: editableRevisionDesc,
        revisedBy: effectivePreparedBy,
      },
      ...(revisions && revisions.length > 1 ? revisions.slice(1) : []),
    ];

    if (onSaveDocument) {
      onSaveDocument({
        title: displayTitle,
        code: effectiveCode,
        companyName: editableCompanyName,
        typeLabel: editableDocTypeLabel,
        issueDate: effectiveDateStr,
        revision: effectiveRevision,
        preparedBy: effectivePreparedBy,
        preparedRole: editablePreparedRole,
        verifiedBy: effectiveVerifiedBy,
        verifiedRole: editableVerifiedRole,
        approvedBy: effectiveApprovedBy,
        approvedRole: editableApprovedRole,
        revisions: editableRevisionsList,
        tocList: editableTocItems,
        preservedBodyParagraphs: finalParagraphs,
        bodyTables: editableTables,
        kopSettings: kopSettings,
      });
    }

    setIsEditing(false);
    setSaveSuccessNotice('Perubahan dokumen berhasil disimpan ke format Word & Pratinjau!');
    setTimeout(() => {
      setSaveSuccessNotice(null);
    }, 4000);
  };

  const handleCancelEdit = () => {
    setEditableTitle(title || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN');
    setEditableCode(code || '0001-KB-GNR-CEO-X-2026');
    setEditableIssueDate(issueDate || '2026-10-17');
    setEditableRevision(revision ?? 0);
    setEditablePreparedBy(preparedBy || 'Mazmur Gusti Agung Larosa');
    setEditablePreparedRole(preparedRole || '(Lead Document Controller & Finance Director)');
    setEditableVerifiedBy(verifiedBy || 'Dennis Raditya');
    setEditableVerifiedRole(verifiedRole || '(Director of Operations & Technology / CTO)');
    setEditableApprovedBy(approvedBy || 'Bima Satryo Hartanto');
    setEditableApprovedRole(approvedRole || '(President Director / CEO)');
    setEditableRevisionDesc(
      revisions?.[0]?.description ||
        `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${code || '0001-KB-GNR-CEO-X-2026'})`
    );
    setEditableParagraphs(preservedBodyParagraphs || []);
    setEditableTables(bodyTables || []);
    setIsEditing(false);
  };

  const handleDownloadWord = async () => {
    if (onDownloadDocx) {
      onDownloadDocx();
      return;
    }
    setIsDownloadingWord(true);
    try {
      let coverBuffer: ArrayBuffer | null = null;
      let kopBuffer: ArrayBuffer | null = null;
      if (effectiveCoverLogoDataUrl) {
        try {
          const res = await fetch(effectiveCoverLogoDataUrl);
          coverBuffer = await res.arrayBuffer();
        } catch (e) {
          console.warn('Could not convert effectiveCoverLogoDataUrl to buffer:', e);
        }
      } else {
        try {
          const res = await fetch('/nbe-logo-tight.png');
          coverBuffer = await res.arrayBuffer();
        } catch (e) {}
      }
      if (effectiveKopLogoDataUrl) {
        try {
          const res = await fetch(effectiveKopLogoDataUrl);
          kopBuffer = await res.arrayBuffer();
        } catch (e) {
          console.warn('Could not convert effectiveKopLogoDataUrl to buffer:', e);
        }
      } else {
        try {
          const res = await fetch('/nbe-logo-tight.png');
          kopBuffer = await res.arrayBuffer();
        } catch (e) {}
      }

      await generateAndDownloadNbeDocx({
        docCode: effectiveCode,
        titleId: displayTitle,
        titleEn: displayTitle,
        categoryNameId: editableDocTypeLabel || typeLabel,
        divisionName: divisionLabel,
        revisionNo: String(effectiveRevision),
        issueDateId: formattedDate,
        issueDateEn: formattedDateEn,
        preparedBy: effectivePreparedBy,
        preparedRole: cleanRole(editablePreparedRole) || 'Lead Document Controller & Finance Director',
        verifiedBy: effectiveVerifiedBy,
        verifiedRole: cleanRole(editableVerifiedRole) || 'Director of Operations & Technology / CTO',
        approvedBy: effectiveApprovedBy,
        approvedRole: cleanRole(editableApprovedRole) || 'President Director / CEO',
        language: language,
        coverLogoBuffer: coverBuffer,
        kopLogoBuffer: kopBuffer,
        coverLogoWidthInches: effectiveCoverLogoWidthInches || 3.2,
        kopLogoWidthInches: (effectiveKopLogoWidthInches || 1.45) * (kopSettings.logoScale || 1.25),
        tocList: editableTocItems,
        bodyPages: effectiveBodyPages,
        bodyPagesHtml: currentHtmlPages && currentHtmlPages.length > 0 ? currentHtmlPages : initialHtmlPages,
        isProcedureOrSop: isProceduralDoc,
        preservedBodyParagraphs: editableParagraphs,
        bodyTables: editableTables,
        revisionRows: editableRevisionsList.map((r) => ({
          rev: String(r.revision),
          date: r.date,
          description: r.description,
          revisedBy: r.revisedBy,
        })),
        paperSize: paperSize,
      });
    } catch (err: any) {
      alert('Gagal mengunduh berkas Word (.docx): ' + err.message);
    } finally {
      setIsDownloadingWord(false);
    }
  };

  const executePrint = (targetSize?: 'A4' | 'F4') => {
    const sizeToPrint = targetSize || paperSize;
    if (targetSize && targetSize !== paperSize) {
      setPaperSize(targetSize);
      onPaperSizeChange?.(targetSize);
    }

    const originalTitle = document.title;
    const cleanDocTitle = `${effectiveCode} - ${displayTitle} (${sizeToPrint})`;
    document.title = cleanDocTitle;

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);

    // Timeout ensures browser reflows with the new @page stylesheet
    setTimeout(() => {
      window.print();
    }, 150);

    // Fallback timer if afterprint doesn't trigger
    setTimeout(() => {
      document.title = originalTitle;
    }, 3000);
  };

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const isPageVisibleOnScreen = (pageNum: number) => {
    return activePageTab === 'all' || activePageTab === pageNum;
  };

  // Reusable page frame styling (Exact A4 / F4 ratio)
  const isF4 = paperSize === 'F4';
  const a4PageStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: isF4 ? '840px' : '820px',
    minHeight: isF4 ? '1288px' : '1160px',
    margin: '0 auto 2.5rem auto',
    background: '#ffffff',
    color: '#3B3838',
    fontFamily: 'Arial, sans-serif',
    padding: '75px 75px 65px 83px', // Left: 2.2cm (~83px), Right/Top/Bottom: 2.0cm (~75px)
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
    borderRadius: '4px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    border: '1px solid #e2e8f0',
    transition: 'min-height 0.25s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  const tableHeaderStyle: React.CSSProperties = {
    background: '#D9E1F2',
    color: '#000000',
    fontWeight: 'bold',
    fontSize: '9.5pt',
    border: '1px solid #BFBFBF',
    padding: '7px 9px',
    textAlign: 'center',
    verticalAlign: 'middle',
  };

  const tableCellStyle: React.CSSProperties = {
    border: '1px solid #BFBFBF',
    padding: '7px 9px',
    fontSize: '9pt',
    verticalAlign: 'middle',
  };

  const renderSharedKopHeader = () => {
    const logoColWidth = `${kopSettings.logoWidthPercent}%`;
    const padY = `${kopSettings.paddingY}px`;
    const fontScale = kopSettings.fontSizeScale;
    const borderThick = `${kopSettings.borderWidth}px`;

    return (
      <div style={{ width: '100%' }}>
        {/* Floating Kop Size Tuner Bar when Edit Mode is active */}
        {isEditing && (
          <div className="ms-word-kop-tuner no-print">
            {/* Header Toolbar */}
            <div className="ms-word-kop-tuner-header">
              <span className="ms-word-kop-tuner-title">
                <span>⚙️</span>
                <span>Pengaturan Dimensi & Ukuran Kop Surat</span>
              </span>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                💡 Klik tombol di bawah untuk menyesuaikan ukuran tabel kop secara visual
              </span>
            </div>

            {/* Row 1: Logo Column Width & Logo Scale */}
            <div className="ms-word-kop-tuner-row">
              <div className="ms-word-kop-tuner-group">
                <span className="ms-word-kop-group-label">Lebar Kolom Logo:</span>
                {[20, 25, 30, 35, 40].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => updateKopSetting('logoWidthPercent', w)}
                    className={`ms-word-kop-btn-pill ${kopSettings.logoWidthPercent === w ? 'active' : ''}`}
                    title={`Ubah lebar kolom logo ke ${w}%`}
                  >
                    {w}%
                  </button>
                ))}
              </div>

              <div className="ms-word-kop-tuner-group">
                <span className="ms-word-kop-group-label">Skala Logo:</span>
                {[
                  { val: 0.7, label: '70%' },
                  { val: 0.85, label: '85%' },
                  { val: 0.95, label: '95%' },
                  { val: 1.0, label: '100% (Penuh Kolom)' },
                ].map((ls) => (
                  <button
                    key={ls.val}
                    type="button"
                    onClick={() => updateKopSetting('logoScale', ls.val)}
                    className={`ms-word-kop-btn-pill ${Math.abs((kopSettings.logoScale || 1.0) - ls.val) < 0.05 ? 'active' : ''}`}
                    title={ls.val === 1.0 ? 'Skala terbesar: Logo tepat memenuhi seluruh kolom' : `Ubah skala logo ke ${ls.label}`}
                  >
                    {ls.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Row Height Padding & Font Scale */}
            <div className="ms-word-kop-tuner-row">
              <div className="ms-word-kop-tuner-group">
                <span className="ms-word-kop-group-label">Tinggi Sel / Padding:</span>
                {[
                  { val: 4, label: 'Padat (4px)' },
                  { val: 6, label: 'Standar (6px)' },
                  { val: 9, label: 'Lega (9px)' },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => updateKopSetting('paddingY', p.val)}
                    className={`ms-word-kop-btn-pill ${kopSettings.paddingY === p.val ? 'active' : ''}`}
                    title={`Ubah jarak vertikal sel ke ${p.label}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="ms-word-kop-tuner-group">
                <span className="ms-word-kop-group-label">Skala Font Teks:</span>
                {[
                  { val: 0.9, label: '90%' },
                  { val: 1.0, label: '100%' },
                  { val: 1.1, label: '110%' },
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => updateKopSetting('fontSizeScale', s.val)}
                    className={`ms-word-kop-btn-pill ${kopSettings.fontSizeScale === s.val ? 'active' : ''}`}
                    title={`Ubah skala font teks kop ke ${s.label}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: `${borderThick} solid #000000`,
            marginBottom: '1.25rem',
            fontFamily: 'Arial, sans-serif',
            background: '#FFFFFF',
          }}
        >
          <tbody>
            <tr>
              {/* Kolom Kiri: Logo Memiliki Kolom Terpisah Penuh Dari Atas Sampai Bawah (rowSpan=4) */}
              <td
                rowSpan={4}
                style={{
                  width: logoColWidth,
                  border: '1px solid #000000',
                  padding: (kopSettings.logoScale || 1.0) >= 0.98 ? '2px 4px' : `${padY} 6px`,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  background: '#FFFFFF',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    minHeight: '90px',
                    padding: (kopSettings.logoScale || 1.0) >= 0.98 ? '0' : '2px',
                    boxSizing: 'border-box',
                  }}
                >
                  <img
                    src={effectiveKopLogoDataUrl || '/nbe-logo-tight.png'}
                    alt="Logo Kop PT Nirwana Bhumi Energy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/+BG.png';
                    }}
                    style={{
                      width: `${Math.min(100, Math.round((kopSettings.logoScale || 1.0) * 100))}%`,
                      maxWidth: '100%',
                      maxHeight: (kopSettings.logoScale || 1.0) >= 0.98 ? '118px' : `${Math.round(95 * (kopSettings.logoScale || 0.9))}px`,
                      objectFit: 'contain',
                      margin: '0 auto',
                      display: 'block',
                      transition: 'all 0.15s ease',
                    }}
                  />
                </div>
              </td>

              {/* Baris 1 Sisi Kanan: Integrated Management Systems (colSpan=3) */}
              <td
                colSpan={3}
                style={{
                  border: '1px solid #000000',
                  padding: `${padY} 12px`,
                  textAlign: 'center',
                  fontSize: `${11 * fontScale}pt`,
                  fontWeight: 500,
                  color: '#000000',
                  background: '#FFFFFF',
                  letterSpacing: '0.2px',
                }}
              >
                Integrated Management Systems
              </td>
            </tr>

            {/* Baris 2 Sisi Kanan: Procedure / Document Type (colSpan=3) */}
            <tr>
              <td
                colSpan={3}
                style={{
                  border: '1px solid #000000',
                  padding: `${Math.max(3, kopSettings.paddingY - 1)}px 12px`,
                  textAlign: 'center',
                  fontSize: `${10.5 * fontScale}pt`,
                  fontWeight: 400,
                  color: '#000000',
                  background: '#FFFFFF',
                }}
              >
                <span
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleCoverChange('typeLabel', e.currentTarget.innerText.trim())}
                  className={isEditing ? 'ms-word-editable-inline' : ''}
                  title={isEditing ? 'Klik untuk mengedit Kategori di Kop' : undefined}
                >
                  {effectiveDocTypeLabel}
                </span>
              </td>
            </tr>

            {/* Baris 3 Sisi Kanan: Document Title Bold Uppercase (colSpan=3) */}
            <tr>
              <td
                colSpan={3}
                style={{
                  border: '1px solid #000000',
                  padding: `${padY} 12px`,
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: `${11.5 * fontScale}pt`,
                  color: '#000000',
                  textTransform: 'uppercase',
                  background: '#FFFFFF',
                  letterSpacing: '0.3px',
                }}
              >
                <span
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleCoverChange('title', e.currentTarget.innerText.trim())}
                  className={isEditing ? 'ms-word-editable-inline' : ''}
                  title={isEditing ? 'Klik untuk mengedit Judul di Kop' : undefined}
                >
                  {displayTitle}
                </span>
              </td>
            </tr>

            {/* Baris 4: Tiga Kolom di Sisi Kanan (Bukan di bawah logo!) */}
            <tr>
              {/* Kolom 1 Kanan: Revision */}
              <td
                style={{
                  width: '18%',
                  border: '1px solid #000000',
                  padding: `${Math.max(3, kopSettings.paddingY - 2)}px 8px`,
                  fontSize: `${9 * fontScale}pt`,
                  textAlign: 'left',
                  color: '#000000',
                  background: '#FFFFFF',
                  verticalAlign: 'middle',
                }}
              >
                {isEditing ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>{language === 'en' ? 'Revision:' : 'Revisi:'}</span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={editableRevision}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setEditableRevision(val);
                        scheduleAutoSave({ revision: val });
                      }}
                      style={{
                        width: '45px',
                        fontFamily: 'Arial, sans-serif',
                        fontSize: `${9 * fontScale}pt`,
                        border: '1px dashed #0284c7',
                        background: '#f0f9ff',
                        padding: '2px 4px',
                        borderRadius: '3px',
                      }}
                    />
                  </span>
                ) : (
                  <>{language === 'en' ? 'Revision:' : 'Revisi:'} {effectiveRevision}</>
                )}
              </td>

              {/* Kolom 2 Kanan: Nomor Dokumen Resmi */}
              <td
                style={{
                  width: '38%',
                  border: '1px solid #000000',
                  padding: `${Math.max(3, kopSettings.paddingY - 2)}px 8px`,
                  fontSize: `${9.5 * fontScale}pt`,
                  textAlign: 'center',
                  color: '#000000',
                  background: '#FFFFFF',
                  verticalAlign: 'middle',
                  fontWeight: 500,
                }}
              >
                <span
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleCoverChange('code', e.currentTarget.innerText.trim())}
                  className={isEditing ? 'ms-word-editable-inline' : ''}
                  title={isEditing ? 'Klik untuk mengedit Nomor Dokumen di Kop' : undefined}
                >
                  {effectiveCode}
                </span>
              </td>

              {/* Kolom 3 Kanan: Tanggal Revisi Terbit */}
              <td
                style={{
                  width: '24%',
                  border: '1px solid #000000',
                  padding: `${Math.max(3, kopSettings.paddingY - 2)}px 8px`,
                  fontSize: `${9 * fontScale}pt`,
                  textAlign: 'left',
                  color: '#000000',
                  background: '#FFFFFF',
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleCoverChange('kopDate', e.currentTarget.innerText.trim())}
                  className={isEditing ? 'ms-word-editable-inline' : ''}
                  title={isEditing ? 'Klik untuk mengedit Tanggal di Kop' : undefined}
                >
                  {language === 'en' ? 'Revised:' : 'Revisi:'} {revDateDisplay}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderRunningKopHeader = () => renderSharedKopHeader();

  const initialHtmlPages = React.useMemo(() => {
    if (translatedHtmlPages && translatedHtmlPages.length > 0) {
      return translatedHtmlPages;
    }
    if (originalHtmlBody && originalHtmlBody.trim()) {
      return paginateHtmlContent(originalHtmlBody);
    }
    if (effectiveBodyPages && effectiveBodyPages.length > 0) {
      return effectiveBodyPages.map((pageLines) => {
        return pageLines
          .map((line) => {
            const matchH = line.trim().match(/^([0-9]+(?:\.0)?\.?|[IVXLCDM]+\.?)\s+(.*)$/);
            if (matchH) {
              const [, numPart, titlePart] = matchH;
              const isMainH = numPart.endsWith('.0') || !numPart.includes('.');
              return `<p style="margin: ${
                isMainH ? '0.75rem' : '0.45rem'
              } 0 0.3rem 0; font-weight: bold; color: #000000; font-size: ${
                isMainH ? '11pt' : '10.5pt'
              }; font-family: Arial; line-height: 1.5; padding-left: 0.5in; text-indent: -0.5in; word-break: normal; overflow-wrap: break-word;"><span style="display: inline-block; min-width: 0.5in;">${numPart}</span> ${titlePart}</p>`;
            }
            return `<p style="padding-left: 0.5in; text-align: justify; line-height: 1.6; margin-bottom: 0.5rem; font-size: 10pt; font-family: Arial; word-break: normal; overflow-wrap: break-word;">${line}</p>`;
          })
          .join('');
      });
    }
    return [
      `<p style="font-family: Arial, sans-serif; font-size: 10.5pt; color: #64748b; text-align: justify; padding: 2rem 0; font-style: italic;">${
        language === 'en' ? 'Original document content is loading or empty.' : 'Isi dokumen asli sedang dimuat atau kosong.'
      }</p>`,
    ];
  }, [translatedHtmlPages, originalHtmlBody, effectiveBodyPages, language]);

  // Sync currentHtmlPages whenever initialHtmlPages changes and user hasn't made custom edits
  React.useEffect(() => {
    if (!isUserModifiedRef.current && initialHtmlPages && initialHtmlPages.length > 0) {
      setCurrentHtmlPages(initialHtmlPages);
    }
  }, [initialHtmlPages]);

  // Otomatis ekstrak bab dan klausul asli ke Daftar Isi jika masih kosong atau default
  React.useEffect(() => {
    const isGenericPlaceholder =
      !editableTocItems ||
      editableTocItems.length === 0 ||
      (editableTocItems.length === 1 &&
        (editableTocItems[0].title.includes('DOCUMENT CONTENT') ||
          editableTocItems[0].title.includes('ISI DOKUMEN')));

    if (isGenericPlaceholder && initialHtmlPages && initialHtmlPages.length > 0) {
      const extracted = extractTocFromContent(initialHtmlPages, preservedBodyParagraphs);
      if (extracted.length > 0) {
        setEditableTocItems(extracted);
      }
    }
  }, [initialHtmlPages, preservedBodyParagraphs]);

  const handleSaveFromRibbonEditor = (updatedHtmlPages: string[]) => {
    setCurrentHtmlPages(updatedHtmlPages);
    const extractedParagraphs: string[] = [];
    updatedHtmlPages.forEach((pageHtml) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = pageHtml;
      const blocks = Array.from(tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, li'));
      if (blocks.length > 0) {
        blocks.forEach((el) => {
          const txt = (el as HTMLElement).innerText.trim();
          if (txt && !extractedParagraphs.includes(txt)) {
            extractedParagraphs.push(txt);
          }
        });
      } else {
        const lines = tempDiv.innerText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        extractedParagraphs.push(...lines);
      }
    });

    const finalParagraphs = extractedParagraphs.length > 0 ? extractedParagraphs : editableParagraphs;
    setEditableParagraphs(finalParagraphs);

    const updatedRevs: RevisionRecord[] = [
      {
        revision: effectiveRevision,
        date: formattedDate,
        description: editableRevisionDesc,
        revisedBy: effectivePreparedBy,
      },
      ...(revisions && revisions.length > 1 ? revisions.slice(1) : []),
    ];

    if (onSaveDocument) {
      onSaveDocument({
        title: displayTitle,
        code: effectiveCode,
        issueDate: effectiveDateStr,
        revision: effectiveRevision,
        preparedBy: effectivePreparedBy,
        preparedRole: cleanRole(editablePreparedRole),
        verifiedBy: effectiveVerifiedBy,
        verifiedRole: cleanRole(editableVerifiedRole),
        approvedBy: effectiveApprovedBy,
        approvedRole: cleanRole(editableApprovedRole),
        revisions: updatedRevs,
        tocList: editableTocItems,
        bodyPagesHtml: updatedHtmlPages,
        preservedBodyParagraphs: finalParagraphs,
        bodyTables: editableTables,
      });
    }

    setSaveSuccessNotice('Perubahan dokumen berhasil disimpan ke format Word & Pratinjau!');
    setTimeout(() => {
      setSaveSuccessNotice(null);
    }, 4000);
  };

  const renderSystemCoverPage = () => (
    <div
      style={a4PageStyle}
      id="nbe-page-1"
      className={`a4-page-preview a4-print-page ${isF4 ? 'paper-size-f4' : 'paper-size-a4'} ${!isPageVisibleOnScreen(1) ? 'screen-hidden' : ''}`}
    >
      <div style={{ flex: 1, minHeight: '1.5rem' }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <img
            src={effectiveCoverLogoDataUrl || '/nbe-logo-tight.png'}
            alt="Logo Cover PT Nirwana Bhumi Energy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/+BG.png';
            }}
            style={{
              width: `${effectiveCoverLogoWidthInches || 3.2}in`,
              maxWidth: '92%',
              maxHeight: `${Math.round((effectiveCoverLogoWidthInches || 3.2) * 48)}px`,
              height: 'auto',
              objectFit: 'contain',
              marginBottom: '1rem',
            }}
          />
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => handleCoverChange('companyName', e.currentTarget.innerText.trim())}
            className={isEditing ? 'ms-word-editable-inline' : ''}
            title={isEditing ? 'Klik untuk mengedit Nama Entitas Perusahaan' : undefined}
            style={{
              fontSize: '20pt',
              fontWeight: 'bold',
              color: '#000000',
              letterSpacing: '0.04em',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {editableCompanyName}
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            width: '100%',
          }}
        >
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => handleCoverChange('typeLabel', e.currentTarget.innerText.trim())}
            className={isEditing ? 'ms-word-editable-inline' : ''}
            title={isEditing ? 'Klik untuk mengedit Jenis/Kategori Dokumen' : undefined}
            style={{
              fontSize: '13pt',
              fontWeight: 'bold',
              color: '#003366',
              letterSpacing: '0.05em',
              fontFamily: 'Arial, sans-serif',
              textTransform: 'uppercase',
            }}
          >
            {effectiveDocTypeLabel.toUpperCase()}
          </div>

          <div style={{ padding: '0 1.5rem', textAlign: 'center' }}>
            <div
              contentEditable={isEditing}
              suppressContentEditableWarning
              onBlur={(e) => handleCoverChange('title', e.currentTarget.innerText.trim())}
              className={isEditing ? 'ms-word-editable-inline' : ''}
              title={isEditing ? 'Klik untuk mengedit Judul Dokumen' : undefined}
              style={{
                fontSize: '15pt',
                fontWeight: 'bold',
                color: '#000000',
                lineHeight: 1.4,
                fontFamily: 'Arial, sans-serif',
                textTransform: 'uppercase',
              }}
            >
              {displayTitle}
            </div>
          </div>

          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              const val = e.currentTarget.innerText.trim();
              const cleanVal = val.replace(/^(NOMOR DOKUMEN|DOCUMENT NO):?\s*/i, '');
              handleCoverChange('code', cleanVal);
            }}
            className={isEditing ? 'ms-word-editable-inline' : ''}
            title={isEditing ? 'Klik untuk mengedit Nomor Dokumen' : undefined}
            style={{
              display: 'inline-block',
              margin: '0.5rem auto 0 auto',
              padding: '4px 0',
              fontSize: '11pt',
              fontWeight: 'bold',
              color: '#003366',
              letterSpacing: '0.04em',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {language === 'en' ? 'DOCUMENT NO:' : 'NOMOR DOKUMEN:'} {effectiveCode}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '1.5rem' }} />

      {/* Otorisasi Cover Standar Baku (Tanpa Box/Border, Format List Vertikal Titik Dua Sejajar) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          width: '100%',
          marginBottom: '2rem',
          paddingRight: '1rem',
        }}
      >
        <table
          style={{
            borderCollapse: 'collapse',
            fontSize: '9.5pt',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            lineHeight: 1.4,
          }}
        >
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top', fontWeight: 600, paddingRight: '0.75rem', paddingBottom: '0.5rem', whiteSpace: 'nowrap' }}>
                {language === 'en' ? 'Approved By' : 'Disetujui Oleh'}
              </td>
              <td style={{ verticalAlign: 'top', fontWeight: 600, paddingRight: '0.75rem', paddingBottom: '0.5rem' }}>
                :
              </td>
              <td style={{ verticalAlign: 'top', paddingBottom: '0.5rem' }}>
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleCoverChange('approvedBy', e.currentTarget.innerText.trim())}
                  className={isEditing ? 'ms-word-editable-inline' : ''}
                  title={isEditing ? 'Klik untuk mengedit Nama Penyetuju' : undefined}
                  style={{ fontWeight: 'bold', color: '#000000' }}
                >
                  {effectiveApprovedBy}
                </div>
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleCoverChange('approvedRole', e.currentTarget.innerText.trim())}
                  className={isEditing ? 'ms-word-editable-inline' : ''}
                  title={isEditing ? 'Klik untuk mengedit Jabatan Penyetuju' : undefined}
                  style={{ color: '#000000', fontSize: '9pt' }}
                >
                  {isEditing ? editableApprovedRole : effectiveApprovedRole}
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ verticalAlign: 'top', fontWeight: 600, paddingRight: '0.75rem', paddingBottom: '0.5rem', whiteSpace: 'nowrap' }}>
                {language === 'en' ? 'Verified By' : 'Diverifikasi Oleh'}
              </td>
              <td style={{ verticalAlign: 'top', fontWeight: 600, paddingRight: '0.75rem', paddingBottom: '0.5rem' }}>
                :
              </td>
              <td style={{ verticalAlign: 'top', paddingBottom: '0.5rem' }}>
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleCoverChange('verifiedBy', e.currentTarget.innerText.trim())}
                  className={isEditing ? 'ms-word-editable-inline' : ''}
                  title={isEditing ? 'Klik untuk mengedit Nama Verifikator' : undefined}
                  style={{ fontWeight: 'bold', color: '#000000' }}
                >
                  {effectiveVerifiedBy}
                </div>
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleCoverChange('verifiedRole', e.currentTarget.innerText.trim())}
                  className={isEditing ? 'ms-word-editable-inline' : ''}
                  title={isEditing ? 'Klik untuk mengedit Jabatan Verifikator' : undefined}
                  style={{ color: '#000000', fontSize: '9pt' }}
                >
                  {isEditing ? editableVerifiedRole : effectiveVerifiedRole}
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ verticalAlign: 'top', fontWeight: 600, paddingRight: '0.75rem', whiteSpace: 'nowrap' }}>
                {language === 'en' ? 'Prepared By' : 'Disusun Oleh'}
              </td>
              <td style={{ verticalAlign: 'top', fontWeight: 600, paddingRight: '0.75rem' }}>
                :
              </td>
              <td style={{ verticalAlign: 'top' }}>
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleCoverChange('preparedBy', e.currentTarget.innerText.trim())}
                  className={isEditing ? 'ms-word-editable-inline' : ''}
                  title={isEditing ? 'Klik untuk mengedit Nama Penyusun' : undefined}
                  style={{ fontWeight: 'bold', color: '#000000' }}
                >
                  {effectivePreparedBy}
                </div>
                <div
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleCoverChange('preparedRole', e.currentTarget.innerText.trim())}
                  className={isEditing ? 'ms-word-editable-inline' : ''}
                  title={isEditing ? 'Klik untuk mengedit Jabatan Penyusun' : undefined}
                  style={{ color: '#000000', fontSize: '9pt' }}
                >
                  {isEditing ? editablePreparedRole : effectivePreparedRole}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Page Footer */}
      <div
        contentEditable={false}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '0.5rem',
          fontSize: '8pt',
          color: '#94a3b8',
        }}
        className="select-none"
      >
        <span>© {documentYear} PT Nirwana Bhumi Energy</span>
        <span>Page 1 of {totalPages}</span>
      </div>
    </div>
  );

  const renderSystemRevisionPage = (calcTotalPages: number) => (
    <div
      style={a4PageStyle}
      id="nbe-page-2"
      className={`a4-page-preview a4-print-page ${isF4 ? 'paper-size-f4' : 'paper-size-a4'} ${!isPageVisibleOnScreen(2) ? 'screen-hidden' : ''}`}
    >
      {renderSharedKopHeader()}

      <div
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={isEditing ? 'ms-word-editable-inline' : ''}
        style={{
          textAlign: 'center',
          margin: '18pt 0 12pt 0',
          fontSize: '12pt',
          fontWeight: 'bold',
          color: '#000000',
          letterSpacing: '0.08em',
        }}
      >
        {language === 'en' ? 'REVISION INDEX' : 'TABEL INDEKS REVISI'}
      </div>

      {/* Action Buttons for Revision Rows in Edit Mode */}
      {isEditing && (
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleAddRevisionRow}
            className="btn btn-sm"
            style={{
              background: '#f0fdf4',
              borderColor: '#86efac',
              color: '#166534',
              fontSize: '0.78rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
            }}
          >
            <Plus size={14} />
            <span>Tambah Baris Revisi</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteRevisionRow}
            disabled={editableRevisionsList.length <= 1}
            className="btn btn-sm"
            style={{
              background: '#fef2f2',
              borderColor: '#fca5a5',
              color: '#991b1b',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              opacity: editableRevisionsList.length <= 1 ? 0.5 : 1,
            }}
          >
            <Trash2 size={14} />
            <span>Hapus Baris Terakhir</span>
          </button>
        </div>
      )}

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #BFBFBF',
          marginBottom: '2rem',
        }}
      >
        <thead>
          <tr>
            <th style={{ ...tableHeaderStyle, width: '10%' }}>
              {language === 'en' ? 'Rev' : 'Revisi'}
            </th>
            <th style={{ ...tableHeaderStyle, width: '22%' }}>
              {language === 'en' ? 'Date' : 'Tanggal'}
            </th>
            <th style={{ ...tableHeaderStyle, width: '48%' }}>
              {language === 'en' ? 'Description of Changes' : 'Deskripsi Perubahan'}
            </th>
            <th style={{ ...tableHeaderStyle, width: '20%' }}>
              {language === 'en' ? 'Prepared By' : 'Disusun Oleh'}
            </th>
          </tr>
        </thead>
        <tbody>
          {editableRevisionsList.map((rev, idx) => (
            <tr
              key={idx}
              style={{
                background: idx % 2 === 0 ? '#FFFFFF' : '#F9FBFD',
              }}
            >
              <td
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => handleUpdateRevisionCell(idx, 'revision', parseInt(e.currentTarget.innerText) || 0)}
                className={isEditing ? 'ms-word-editable-inline' : ''}
                title={isEditing ? 'Klik untuk mengedit No. Revisi' : undefined}
                style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 'bold' }}
              >
                {rev.revision}
              </td>
              <td
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => handleUpdateRevisionCell(idx, 'date', e.currentTarget.innerText.trim())}
                className={isEditing ? 'ms-word-editable-inline' : ''}
                title={isEditing ? 'Klik untuk mengedit Tanggal Revisi' : undefined}
                style={{ ...tableCellStyle, textAlign: 'center' }}
              >
                {formatNbeStandardDate(rev.date, language === 'en' ? 'en' : 'id')}
              </td>
              <td
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => handleUpdateRevisionCell(idx, 'description', e.currentTarget.innerText.trim())}
                className={isEditing ? 'ms-word-editable-inline' : ''}
                title={isEditing ? 'Klik untuk mengedit Deskripsi Perubahan' : undefined}
                style={tableCellStyle}
              >
                {rev.description}
              </td>
              <td
                contentEditable={isEditing}
                suppressContentEditableWarning
                onBlur={(e) => handleUpdateRevisionCell(idx, 'revisedBy', e.currentTarget.innerText.trim())}
                className={isEditing ? 'ms-word-editable-inline' : ''}
                title={isEditing ? 'Klik untuk mengedit Penyusun Revisi' : undefined}
                style={{ ...tableCellStyle, textAlign: 'center' }}
              >
                {rev.revisedBy}
              </td>
            </tr>
          ))}
          <tr style={{ background: '#FFFFFF' }}>
            <td style={{ ...tableCellStyle, textAlign: 'center', color: '#94a3b8' }}>-</td>
            <td style={{ ...tableCellStyle, textAlign: 'center', color: '#94a3b8' }}>-</td>
            <td style={{ ...tableCellStyle, color: '#94a3b8', fontStyle: 'italic' }}>
              {language === 'en'
                ? 'Reserved for subsequent revision log'
                : 'Disediakan untuk catatan revisi lanjutan'}
            </td>
            <td style={{ ...tableCellStyle, textAlign: 'center', color: '#94a3b8' }}>-</td>
          </tr>
        </tbody>
      </table>

      <div style={{ flex: 1 }} />

      <div
        contentEditable={false}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '0.5rem',
          fontSize: '8pt',
          color: '#94a3b8',
        }}
        className="select-none"
      >
        <span>© {documentYear} PT Nirwana Bhumi Energy</span>
        <span>Page 2 of {calcTotalPages || totalPages}</span>
      </div>
    </div>
  );

  const renderSystemTocPage = (calcTotalPages: number) => {
    if (isProceduralDoc) {
      return (
        <div
          style={a4PageStyle}
          id="nbe-page-3"
          className={`a4-page-preview a4-print-page ${isF4 ? 'paper-size-f4' : 'paper-size-a4'} ${!isPageVisibleOnScreen(3) ? 'screen-hidden' : ''}`}
        >
          {renderSharedKopHeader()}

          <div style={{ textAlign: 'center', margin: '1.25rem 0' }}>
            <h4
              contentEditable={isEditing}
              suppressContentEditableWarning
              className={isEditing ? 'ms-word-editable-inline' : ''}
              style={{ fontSize: '13pt', fontWeight: 'bold', color: '#000000', margin: 0, textTransform: 'uppercase' }}
            >
              {language === 'en' ? 'TABLE OF CONTENTS' : 'DAFTAR ISI'}
            </h4>
          </div>

          {/* Action Buttons for TOC Items in Edit Mode */}
          {isEditing && (
            <div className="no-print" style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleAddTocMainClause}
                className="btn btn-sm"
                style={{
                  background: '#f0fdf4',
                  borderColor: '#86efac',
                  color: '#166534',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.65rem',
                }}
              >
                <Plus size={14} />
                <span>Tambah Bab Utama (e.g. 9.0)</span>
              </button>
              <button
                type="button"
                onClick={handleAddTocSubClause}
                className="btn btn-sm"
                style={{
                  background: '#eff6ff',
                  borderColor: '#bfdbfe',
                  color: '#1d4ed8',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.65rem',
                }}
              >
                <Plus size={14} />
                <span>Tambah Sub-bab (e.g. 5.3)</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteTocItem}
                disabled={editableTocItems.length <= 1}
                className="btn btn-sm"
                style={{
                  background: '#fef2f2',
                  borderColor: '#fca5a5',
                  color: '#991b1b',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.65rem',
                  opacity: editableTocItems.length <= 1 ? 0.5 : 1,
                }}
              >
                <Trash2 size={14} />
                <span>Hapus Butir Terakhir</span>
              </button>
            </div>
          )}

          <div
            style={{
              marginTop: '1.5rem',
              marginBottom: '2rem',
              padding: '0.5rem 0',
            }}
          >
            {(isEditing ? editableTocItems : effectiveTocList).map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  paddingLeft: item.isSub ? '0.5in' : '0',
                  fontWeight: item.isSub ? 'normal' : 'bold',
                  color: item.isSub ? '#3B3838' : '#000000',
                  marginBottom: '0.45rem',
                  fontSize: '10.5pt',
                }}
              >
                <span
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleUpdateTocItem(idx, 'num', e.currentTarget.innerText.trim())}
                  className={isEditing ? 'ms-word-editable-inline' : ''}
                  title={isEditing ? 'Klik untuk mengedit Nomor Bab' : undefined}
                  style={{ display: 'inline-block', width: '0.5in', flexShrink: 0 }}
                >
                  {item.num}
                </span>
                <span
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={(e) => handleUpdateTocItem(idx, 'title', e.currentTarget.innerText.trim())}
                  className={isEditing ? 'ms-word-editable-inline' : ''}
                  title={isEditing ? 'Klik untuk mengedit Judul Bab' : undefined}
                  style={{ flex: 1 }}
                >
                  {item.title}
                </span>
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <div
            contentEditable={false}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '0.5rem',
              fontSize: '8pt',
              color: '#94a3b8',
            }}
            className="select-none"
          >
            <span>© {documentYear} PT Nirwana Bhumi Energy</span>
            <span>Page 3 of {calcTotalPages || totalPages}</span>
          </div>
        </div>
      );
    }

    return (
      <div
        style={a4PageStyle}
        id="nbe-page-3"
        className={`a4-page-preview a4-print-page ${isF4 ? 'paper-size-f4' : 'paper-size-a4'} ${!isPageVisibleOnScreen(3) ? 'screen-hidden' : ''}`}
      >
        {renderSharedKopHeader()}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => handleCoverChange('title', e.currentTarget.innerText.trim())}
            className={isEditing ? 'ms-word-editable-inline' : ''}
            style={{ fontSize: '12pt', fontWeight: 'bold', color: '#000000', textTransform: 'uppercase' }}
          >
            {categoryCode === 'KB' || effectiveCode.includes('-KB-')
              ? (language === 'en'
                ? "BOARD OF DIRECTORS' RESOLUTION OF PT NIRWANA BHUMI ENERGY"
                : language === 'bi'
                ? "KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY / BOARD RESOLUTION"
                : 'KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY')
              : displayTitle}
          </div>
          <div style={{ fontSize: '10.5pt', fontWeight: 'bold', color: '#003366', marginTop: '4px' }}>
            {language === 'en' ? 'NUMBER:' : 'NOMOR:'} {effectiveCode}
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <div
          contentEditable={false}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '0.5rem',
            fontSize: '8pt',
            color: '#94a3b8',
          }}
          className="select-none"
        >
          <span>© {documentYear} PT Nirwana Bhumi Energy</span>
          <span>Page 3 of {calcTotalPages || totalPages}</span>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        margin: '1.5rem 0',
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}
    >
      {/* Top Preview Action Header (Hidden during print) */}
      <div
        className="no-print"
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.85rem',
          background: 'var(--bg-card, #ffffff)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              background: 'rgba(0, 51, 102, 0.1)',
              color: '#003366',
              display: 'flex',
            }}
          >
            <Eye size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                }}
              >
                Real-Time Document Preview (Skala Kertas A4 Nyata)
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  background: language === 'id' ? '#ecfdf5' : '#eff6ff',
                  color: language === 'id' ? '#059669' : '#2563eb',
                  fontWeight: 700,
                  border: '1px solid currentColor',
                }}
              >
                {language === 'id' && '🇮🇩 Bahasa Indonesia (4 Halaman)'}
                {language === 'en' && '🇬🇧 British English (4 Pages)'}
              </span>
            </div>
            <p
              style={{
                margin: '0.15rem 0 0 0',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
              }}
            >
              Mereplikasi 100% tata letak visual baku, kop, tabel revisi bersih, dan tanda tangan 3-kolom.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Live Auto-Save Status Badge */}
          {isEditing && (
            <div
              className={`ms-word-autosave-badge ${autoSaveStatus === 'saving' ? 'saving' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: autoSaveStatus === 'saving' ? '#fffbeb' : '#f0fdf4',
                color: autoSaveStatus === 'saving' ? '#b45309' : '#15803d',
                border: `1px solid ${autoSaveStatus === 'saving' ? '#fde68a' : '#bbf7d0'}`,
              }}
            >
              <span
                className={`ms-word-autosave-dot ${autoSaveStatus === 'saving' ? 'saving' : ''}`}
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: autoSaveStatus === 'saving' ? '#f59e0b' : '#22c55e',
                  display: 'inline-block',
                }}
              />
              <span>
                {autoSaveStatus === 'saving'
                  ? 'Menyimpan...'
                  : lastSavedTime
                  ? `Tersimpan ${lastSavedTime}`
                  : 'Auto-save aktif'}
              </span>
            </div>
          )}

          {/* Edit / Save Document Buttons */}
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: '#f0fdf4',
                borderColor: '#86efac',
                color: '#166534',
                fontWeight: 700,
              }}
              title="Edit teks dokumen langsung pada lembar pratinjau ini"
            >
              <Edit3 size={14} />
              <span>Edit Dokumen</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: '#fef2f2',
                  borderColor: '#fca5a5',
                  color: '#991b1b',
                  fontWeight: 600,
                }}
                title="Batal mengedit dokumen"
              >
                <X size={14} />
                <span>Batal Edit</span>
              </button>

              <button
                type="button"
                onClick={handleResetToTemplate}
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: '#ffffff',
                  borderColor: '#cbd5e1',
                  color: '#475569',
                  fontWeight: 600,
                }}
                title="Kembalikan semua teks dan tabel ke template awal sistem"
              >
                <RotateCcw size={14} />
                <span>Reset Template</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  borderColor: '#059669',
                  color: '#ffffff',
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                }}
                title="Simpan perubahan dokumen ke Word dan Pratinjau"
              >
                <Save size={14} />
                <span>Simpan Perubahan</span>
              </button>
            </>
          )}

          {/* Copy Code Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: isCopied ? '#ecfdf5' : undefined,
              borderColor: isCopied ? '#10b981' : undefined,
              color: isCopied ? '#059669' : undefined,
            }}
            title="Salin Kode Dokumen Unik"
          >
            {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{isCopied ? 'Tersalin!' : 'Salin Kode'}</span>
          </button>

          {/* Paper Size Quick Selector (A4 vs F4) */}
          <div
            className="no-print"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f1f5f9',
              padding: '2px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              gap: '2px',
            }}
            title="Pilih ukuran kertas dokumen (A4 / F4)"
          >
            <button
              type="button"
              onClick={() => {
                setPaperSize('A4');
                onPaperSizeChange?.('A4');
                setSaveSuccessNotice('📐 Ukuran kertas disesuaikan ke A4 (210 × 297 mm)');
                setTimeout(() => setSaveSuccessNotice(null), 2500);
              }}
              style={{
                padding: '0.28rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: paperSize === 'A4' ? 700 : 500,
                background: paperSize === 'A4' ? '#003366' : 'transparent',
                color: paperSize === 'A4' ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.15s ease',
                boxShadow: paperSize === 'A4' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
              }}
              title="Ganti ukuran halaman ke A4 (210 × 297 mm)"
            >
              <span>A4</span>
              <span style={{ fontSize: '0.68rem', opacity: paperSize === 'A4' ? 0.9 : 0.7 }}>210×297</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPaperSize('F4');
                onPaperSizeChange?.('F4');
                setSaveSuccessNotice('📐 Ukuran kertas disesuaikan ke F4 / Folio (215 × 330 mm)');
                setTimeout(() => setSaveSuccessNotice(null), 2500);
              }}
              style={{
                padding: '0.28rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: paperSize === 'F4' ? 700 : 500,
                background: paperSize === 'F4' ? '#003366' : 'transparent',
                color: paperSize === 'F4' ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.15s ease',
                boxShadow: paperSize === 'F4' ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
              }}
              title="Ganti ukuran halaman ke F4 Folio (215 × 330 mm)"
            >
              <span>F4</span>
              <span style={{ fontSize: '0.68rem', opacity: paperSize === 'F4' ? 0.9 : 0.7 }}>215×330</span>
            </button>
          </div>

          {/* Download DOCX */}
          <button
            type="button"
            onClick={handleDownloadWord}
            disabled={isDownloadingWord}
            className="btn btn-primary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'linear-gradient(135deg, #003366 0%, #004080 100%)',
            }}
            title={`Unduh Dokumen Word (${paperSize}) Resmi`}
          >
            <Download size={14} />
            <span>{isDownloadingWord ? 'Menyusun .docx...' : `Unduh Word (${paperSize})`}</span>
          </button>

          {/* Print / Save PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#ffffff',
              color: '#003366',
              borderColor: '#003366',
              fontWeight: 600,
            }}
            title="Pilih ukuran kertas dan Cetak ke PDF (A4 / F4)"
          >
            <Printer size={15} />
            <span>Cetak / PDF</span>
            <span
              style={{
                background: '#003366',
                color: '#ffffff',
                fontSize: '0.68rem',
                padding: '1px 5px',
                borderRadius: '3px',
                fontWeight: 700,
              }}
            >
              {paperSize}
            </span>
          </button>
        </div>
      </div>

      {/* Toast Save Notification */}
      {saveSuccessNotice && (
        <div
          className="no-print"
          style={{
            padding: '0.65rem 1.25rem',
            background: '#ecfdf5',
            color: '#065f46',
            borderBottom: '1px solid #a7f3d0',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={16} color="#059669" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}


      {/* Page Selector Tabs (Hidden during print) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.65rem 1.25rem',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            marginRight: '0.4rem',
            textTransform: 'uppercase',
          }}
        >
          Halaman:
        </span>
        {[
          { id: 'all', label: `Semua (${totalPages} Halaman)` },
          { id: 1, label: 'Hal 1: Cover Page' },
          { id: 2, label: 'Hal 2: Revision Index' },
          ...(isProceduralDoc
            ? [
                { id: 3, label: 'Hal 3: Table of Contents' },
                ...(translatedHtmlPages && translatedHtmlPages.length > 0 ? translatedHtmlPages : effectiveBodyPages).map((_, idx) => ({
                  id: 4 + idx,
                  label: `Hal ${4 + idx}: Isi Dokumen (Bag. ${idx + 1})`,
                })),
              ]
            : [
                { id: 3, label: 'Hal 3: Konsiderans SK' },
                { id: 4, label: 'Hal 4: DCC & Tanda Tangan' },
              ]),
        ].map((tab) => (
          <button
            key={String(tab.id)}
            type="button"
            onClick={() => setActivePageTab(tab.id as any)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: activePageTab === tab.id ? 700 : 500,
              border: activePageTab === tab.id ? '1px solid #003366' : '1px solid transparent',
              background: activePageTab === tab.id ? '#003366' : 'transparent',
              color: activePageTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MS WORD RIBBON BAR & AUTO-PAGINATION DOCUMENT CANVAS */}
      <MsWordRibbonEditor
        key={`${documentId || effectiveCode}-${language}-${paperSize}-${initialHtmlPages.length}-${(originalHtmlBody || '').length}-${(initialHtmlPages[0] || '').slice(0, 30)}`}
        documentId={documentId || effectiveCode}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onSaveDocument={handleSaveFromRibbonEditor}
        onAutoSaveBodyPages={handleAutoSaveFromRibbon}
        autoSaveStatus={autoSaveStatus}
        lastSavedTime={lastSavedTime}
        onResetToTemplate={handleResetToTemplate}
        kopSettings={kopSettings}
        onUpdateKopSetting={updateKopSetting}
        initialHtmlPages={initialHtmlPages}
        renderSystemCoverPage={renderSystemCoverPage}
        renderSystemRevisionPage={renderSystemRevisionPage}
        renderSystemTocPage={renderSystemTocPage}
        renderRunningKopHeader={renderRunningKopHeader}
        activePageTab={activePageTab}
        documentYear={documentYear}
        language={language}
        paperSize={paperSize}
      />

      {/* MODAL PILIHAN UKURAN KERTAS CETAK PDF (A4 VS F4) */}
      {showPrintModal && (
        <div
          className="no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nbe-print-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrintModal(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(to right, #f8fafc, #ffffff)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #003366 0%, #004080 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 10px rgba(0, 51, 102, 0.25)',
                  }}
                >
                  <Printer size={20} />
                </div>
                <div>
                  <h3 id="nbe-print-modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Cetak Dokumen ke PDF
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Pilih ukuran kertas cetak. Sistem langsung menyesuaikan tata letak dokumen secara otomatis.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                aria-label="Tutup dialog pilihan ukuran kertas cetak"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Cards Pilihan Ukuran Kertas */}
            <div style={{ padding: '1.5rem' }}>
              <div
                className="nbe-paper-size-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                {/* CARD 1: A4 */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={paperSize === 'A4'}
                  aria-label="Pilih format ukuran kertas A4 210 kali 297 milimeter"
                  onClick={() => {
                    setPaperSize('A4');
                    onPaperSizeChange?.('A4');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPaperSize('A4');
                      onPaperSizeChange?.('A4');
                    }
                  }}
                  style={{
                    border: paperSize === 'A4' ? '2.5px solid #003366' : '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    background: paperSize === 'A4' ? '#f0f7ff' : '#ffffff',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: paperSize === 'A4' ? '0 8px 20px rgba(0, 51, 102, 0.12)' : 'none',
                    outline: 'none',
                  }}
                >
                  {paperSize === 'A4' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#003366',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Check size={11} /> Aktif
                    </div>
                  )}

                  <div>
                    {/* Visual Ratio Box for A4 (Ratio 210 x 297 = 1:1.414) */}
                    <div
                      style={{
                        width: '70px',
                        height: '99px',
                        margin: '0 auto 1rem auto',
                        background: '#ffffff',
                        border: paperSize === 'A4' ? '1.5px solid #003366' : '1px solid #cbd5e1',
                        borderRadius: '3px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                        padding: '6px 5px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ height: '10px', border: '1px solid #94a3b8', borderRadius: '1px' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ height: '3px', background: '#e2e8f0', width: '90%' }} />
                        <div style={{ height: '3px', background: '#e2e8f0', width: '75%' }} />
                        <div style={{ height: '3px', background: '#e2e8f0', width: '85%' }} />
                      </div>
                      <div style={{ height: '2px', background: '#cbd5e1', width: '100%' }} />
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#003366', letterSpacing: '0.02em' }}>
                        A4
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                        210 × 297 mm
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                        8.27 × 11.69 inci
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.65rem 0 0 0', lineHeight: 1.4 }}>
                        Standar Internasional ISO 216. Format baku untuk SK Direksi, SOP, & korespondensi umum.
                      </p>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        executePrint('A4');
                        setShowPrintModal(false);
                      }}
                      className="btn btn-sm"
                      style={{
                        background: '#003366',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Printer size={14} />
                      <span>Cetak Sekarang (A4)</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaperSize('A4');
                        onPaperSizeChange?.('A4');
                        setSaveSuccessNotice('📐 Ukuran kertas disesuaikan ke A4 (210 × 297 mm)');
                        setTimeout(() => setSaveSuccessNotice(null), 2500);
                        setShowPrintModal(false);
                      }}
                      style={{
                        background: 'transparent',
                        color: '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        textAlign: 'center',
                      }}
                    >
                      Terapkan ke Layar
                    </button>
                  </div>
                </div>

                {/* CARD 2: F4 / FOLIO */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={paperSize === 'F4'}
                  aria-label="Pilih format ukuran kertas F4 Folio 215 kali 330 milimeter"
                  onClick={() => {
                    setPaperSize('F4');
                    onPaperSizeChange?.('F4');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPaperSize('F4');
                      onPaperSizeChange?.('F4');
                    }
                  }}
                  style={{
                    border: paperSize === 'F4' ? '2.5px solid #003366' : '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    background: paperSize === 'F4' ? '#f0f7ff' : '#ffffff',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: paperSize === 'F4' ? '0 8px 20px rgba(0, 51, 102, 0.12)' : 'none',
                    outline: 'none',
                  }}
                >
                  {paperSize === 'F4' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#003366',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Check size={11} /> Aktif
                    </div>
                  )}

                  <div>
                    {/* Visual Ratio Box for F4 (Ratio 215 x 330 = 1:1.535 - visibly taller) */}
                    <div
                      style={{
                        width: '70px',
                        height: '107px',
                        margin: '0 auto 0.6rem auto',
                        background: '#ffffff',
                        border: paperSize === 'F4' ? '1.5px solid #003366' : '1px solid #cbd5e1',
                        borderRadius: '3px',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                        padding: '6px 5px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ height: '10px', border: '1px solid #94a3b8', borderRadius: '1px' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ height: '3px', background: '#e2e8f0', width: '90%' }} />
                        <div style={{ height: '3px', background: '#e2e8f0', width: '75%' }} />
                        <div style={{ height: '3px', background: '#e2e8f0', width: '85%' }} />
                        <div style={{ height: '3px', background: '#e2e8f0', width: '80%' }} />
                      </div>
                      <div style={{ height: '2px', background: '#cbd5e1', width: '100%' }} />
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#003366', letterSpacing: '0.02em' }}>
                        F4 / Folio
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                        215 × 330 mm
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                        8.46 × 12.99 inci (HVS Panjang)
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0.65rem 0 0 0', lineHeight: 1.4 }}>
                        Standar Folio Indonesia. Ruang vertikal ekstra (+33 mm), ideal untuk prosedur dengan tabel panjang.
                      </p>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        executePrint('F4');
                        setShowPrintModal(false);
                      }}
                      className="btn btn-sm"
                      style={{
                        background: '#003366',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Printer size={14} />
                      <span>Cetak Sekarang (F4)</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaperSize('F4');
                        onPaperSizeChange?.('F4');
                        setSaveSuccessNotice('📐 Ukuran kertas disesuaikan ke F4 / Folio (215 × 330 mm)');
                        setTimeout(() => setSaveSuccessNotice(null), 2500);
                        setShowPrintModal(false);
                      }}
                      style={{
                        background: 'transparent',
                        color: '#475569',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        textAlign: 'center',
                      }}
                    >
                      Terapkan ke Layar
                    </button>
                  </div>
                </div>
              </div>

              {/* Informative Help Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  fontSize: '0.78rem',
                  color: '#475569',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>💡 Petunjuk Pengaturan Cetak Browser (Save as PDF):</span>
                </div>
                <ul style={{ margin: '0 0 0 1rem', padding: 0 }}>
                  <li><strong>Destination:</strong> Pilih <em>"Save as PDF"</em> atau printer yang sesuai.</li>
                  <li><strong>Paper size:</strong> Pilih <strong>A4</strong> atau <strong>Folio / F4</strong> (jika tidak ada opsi F4 di driver browser/printer, pilih <em>Legal</em> atau <em>8.5 × 13 in</em>).</li>
                  <li><strong>Margins:</strong> Pilih <strong>"None"</strong> atau <strong>"Default"</strong> (margin standar 2.0cm / 2.2cm telah tertanam otomatis).</li>
                  <li><strong>Options:</strong> Centang <strong>"Background graphics"</strong> agar warna tabel & logo tercetak sempurna.</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  executePrint(paperSize);
                  setShowPrintModal(false);
                }}
                className="btn btn-primary btn-sm"
                style={{
                  padding: '0.45rem 1.25rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#003366',
                }}
              >
                <Printer size={15} />
                <span>Cetak ({paperSize})</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
