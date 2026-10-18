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
import { generateAndDownloadNbeDocx } from '../utils/nbeDocxGenerator';
import { DocxTableData } from '../utils/docxExtractor';
import { MsWordRibbonEditor, KopTableSettings } from './MsWordRibbonEditor';
import { loadTemplateSettings, DocumentTemplateSettings } from '../services/templateSettings';

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
  verifiedBy?: string;
  approvedBy?: string;
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
  onCopyCode?: () => void;
  onDownloadDocx?: () => void;
  onSaveDocument?: (updated: DocumentSavePayload) => void;
}

export const A4DocumentPreview: React.FC<A4DocumentPreviewProps> = ({
  language = 'id',
  title,
  code,
  issueDate,
  revision = 0,
  revisions = [],
  preparedBy = 'Mazmur Gusti Agung Larosa',
  verifiedBy = 'Dennis Raditya',
  approvedBy = 'Bima Satryo Hartanto',
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
  onCopyCode,
  onDownloadDocx,
  onSaveDocument,
}) => {
  const [activePageTab, setActivePageTab] = useState<'all' | number>('all');
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);

  // Direct in-preview interactive editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editableTitle, setEditableTitle] = useState(title || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN');
  const [editableCode, setEditableCode] = useState(code || '0001-KB-GNR-CEO-X-2026');
  const [editableCompanyName, setEditableCompanyName] = useState('PT NIRWANA BHUMI ENERGY');
  const [editableDocTypeLabel, setEditableDocTypeLabel] = useState(typeLabel || 'Standar Operasional Prosedur (SOP)');
  const [editableIssueDate, setEditableIssueDate] = useState(issueDate || '2026-10-17');
  const [editableRevision, setEditableRevision] = useState(revision ?? 0);
  const [editablePreparedBy, setEditablePreparedBy] = useState(preparedBy || 'Mazmur Gusti Agung Larosa');
  const [editablePreparedRole, setEditablePreparedRole] = useState('(Lead Document Controller & Finance Director)');
  const [editableVerifiedBy, setEditableVerifiedBy] = useState(verifiedBy || 'Dennis Raditya');
  const [editableVerifiedRole, setEditableVerifiedRole] = useState('(Director of Operations & Technology / CTO)');
  const [editableApprovedBy, setEditableApprovedBy] = useState(approvedBy || 'Bima Satryo Hartanto');
  const [editableApprovedRole, setEditableApprovedRole] = useState('(President Director / CEO)');
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
        date: '17 Oktober 2026',
        description: `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${code || '0001-KB-GNR-CEO-X-2026'})`,
        revisedBy: preparedBy || 'Mazmur Gusti Agung Larosa',
      },
    ];
  });

  // Table of Contents State
  const [editableTocItems, setEditableTocItems] = useState<Array<{ num: string; title: string; isSub?: boolean }>>(() => {
    if (tocList && tocList.length > 0) return tocList;
    return [
      { num: '1.0', title: 'OBJECTIVE' },
      { num: '2.0', title: 'SCOPE' },
      { num: '3.0', title: 'RESPONSIBILITY' },
      { num: '4.0', title: 'DEFINITION' },
      { num: '5.0', title: 'PROCEDURE DETAILS' },
      { num: '5.1', title: 'General Provisions', isSub: true },
      { num: '5.2', title: 'Operational Flow', isSub: true },
      { num: '6.0', title: 'RELATED DOCUMENTS' },
      { num: '7.0', title: 'RECORDS' },
      { num: '8.0', title: 'ATTACHMENTS AND EMERGENCY INSTRUCTIONS' },
    ];
  });

  // Kop Table Sizing Settings State
  const [kopSettings, setKopSettings] = useState<KopTableSettings>(() => {
    try {
      const saved = localStorage.getItem('nbe_kop_table_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      logoWidthPercent: 20,
      paddingY: 6,
      fontSizeScale: 1.0,
      borderWidth: 1.5,
    };
  });

  // Auto-Save Management State
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const isUserModifiedRef = useRef<boolean>(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const docStorageKey = `nbe_doc_autosave_${(code || 'default').trim().toUpperCase()}`;

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
  const effectiveKopLogoWidthInches = kopLogoWidthInches || masterSettings.kopLogoWidthInches || 0.95;

  // Load auto-saved draft on mount or when code changes
  useEffect(() => {
    try {
      const rawSaved = localStorage.getItem(docStorageKey);
      if (rawSaved) {
        const parsed = JSON.parse(rawSaved);
        if (parsed.title) setEditableTitle(parsed.title);
        if (parsed.code) setEditableCode(parsed.code);
        if (parsed.companyName) setEditableCompanyName(parsed.companyName);
        if (parsed.typeLabel) setEditableDocTypeLabel(parsed.typeLabel);
        if (parsed.issueDate) setEditableIssueDate(parsed.issueDate);
        if (typeof parsed.revision === 'number') setEditableRevision(parsed.revision);
        if (parsed.preparedBy) setEditablePreparedBy(parsed.preparedBy);
        if (parsed.preparedRole) setEditablePreparedRole(parsed.preparedRole);
        if (parsed.verifiedBy) setEditableVerifiedBy(parsed.verifiedBy);
        if (parsed.verifiedRole) setEditableVerifiedRole(parsed.verifiedRole);
        if (parsed.approvedBy) setEditableApprovedBy(parsed.approvedBy);
        if (parsed.approvedRole) setEditableApprovedRole(parsed.approvedRole);
        if (parsed.revisions && Array.isArray(parsed.revisions) && parsed.revisions.length > 0) {
          setEditableRevisionsList(parsed.revisions);
        }
        if (parsed.tocList && Array.isArray(parsed.tocList) && parsed.tocList.length > 0) {
          setEditableTocItems(parsed.tocList);
        }
        if (parsed.preservedBodyParagraphs && Array.isArray(parsed.preservedBodyParagraphs)) {
          setEditableParagraphs(parsed.preservedBodyParagraphs);
        }
        if (parsed.bodyTables && Array.isArray(parsed.bodyTables)) {
          setEditableTables(parsed.bodyTables);
        }
        if (parsed.kopSettings) {
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

  // Synchronize state when props change ONLY IF not modified by user
  React.useEffect(() => {
    if (!isUserModifiedRef.current && !isEditing) {
      setEditableTitle(title || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN');
      setEditableCode(code || '0001-KB-GNR-CEO-X-2026');
      setEditableIssueDate(issueDate || '2026-10-17');
      setEditableRevision(revision ?? 0);
      setEditablePreparedBy(preparedBy || 'Mazmur Gusti Agung Larosa');
      setEditableVerifiedBy(verifiedBy || 'Dennis Raditya');
      setEditableApprovedBy(approvedBy || 'Bima Satryo Hartanto');
      setEditableDocTypeLabel(typeLabel || 'Standar Operasional Prosedur (SOP)');
      setEditableRevisionDesc(
        revisions?.[0]?.description ||
          `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${code || '0001-KB-GNR-CEO-X-2026'})`
      );
      setEditableParagraphs(preservedBodyParagraphs || []);
      setEditableTables(bodyTables || []);
    }
  }, [title, code, issueDate, revision, preparedBy, verifiedBy, approvedBy, typeLabel, revisions, preservedBodyParagraphs, bodyTables, isEditing]);

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
      setEditablePreparedRole('(Lead Document Controller & Finance Director)');
      setEditableVerifiedBy(verifiedBy || 'Dennis Raditya');
      setEditableVerifiedRole('(Director of Operations & Technology / CTO)');
      setEditableApprovedBy(approvedBy || 'Bima Satryo Hartanto');
      setEditableApprovedRole('(President Director / CEO)');
      setEditableParagraphs(preservedBodyParagraphs || []);
      setEditableTables(bodyTables || []);
      setEditableRevisionsList(revisions && revisions.length > 0 ? revisions : [
        {
          revision: revision ?? 0,
          date: '17 Oktober 2026',
          description: `Edisi Awal – Penerbitan Dokumen Standar PT NBE (${code || '0001-KB-GNR-CEO-X-2026'})`,
          revisedBy: preparedBy || 'Mazmur Gusti Agung Larosa',
        },
      ]);
      setEditableTocItems(tocList && tocList.length > 0 ? tocList : [
        { num: '1.0', title: 'OBJECTIVE' },
        { num: '2.0', title: 'SCOPE' },
        { num: '3.0', title: 'RESPONSIBILITY' },
        { num: '4.0', title: 'DEFINITION' },
        { num: '5.0', title: 'PROCEDURE DETAILS' },
        { num: '5.1', title: 'General Provisions', isSub: true },
        { num: '5.2', title: 'Operational Flow', isSub: true },
        { num: '6.0', title: 'RELATED DOCUMENTS' },
        { num: '7.0', title: 'RECORDS' },
        { num: '8.0', title: 'ATTACHMENTS AND EMERGENCY INSTRUCTIONS' },
      ]);
      setKopSettings({
        logoWidthPercent: 20,
        paddingY: 6,
        fontSizeScale: 1.0,
        borderWidth: 1.5,
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

  const displayTitle = (isEditing ? editableTitle : title || 'SISTEM KONTROL DAN PENOMORAN DOKUMEN').trim().toUpperCase();
  const effectiveCode = (isEditing ? editableCode : code || '0001-KB-GNR-CEO-X-2026').trim().toUpperCase();
  const effectivePreparedBy = isEditing ? editablePreparedBy : preparedBy || 'Mazmur Gusti Agung Larosa';
  const effectiveVerifiedBy = isEditing ? editableVerifiedBy : verifiedBy || 'Dennis Raditya';
  const effectiveApprovedBy = isEditing ? editableApprovedBy : approvedBy || 'Bima Satryo Hartanto';
  const effectiveRevision = isEditing ? editableRevision : revision ?? 0;
  const effectiveDateStr = isEditing ? editableIssueDate : issueDate;

  const formattedDate = React.useMemo(() => {
    try {
      const d = effectiveDateStr ? new Date(effectiveDateStr) : new Date();
      if (isNaN(d.getTime())) return '17 Oktober 2026';
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '17 Oktober 2026';
    }
  }, [effectiveDateStr]);

  const formattedDateEn = React.useMemo(() => {
    try {
      const d = effectiveDateStr ? new Date(effectiveDateStr) : new Date();
      if (isNaN(d.getTime())) return '17 October 2026';
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '17 October 2026';
    }
  }, [effectiveDateStr]);

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
    if (tocList && tocList.length > 0) return tocList;
    if (editableParagraphs && editableParagraphs.length > 0) {
      const extracted: Array<{ num: string; title: string; isSub?: boolean }> = [];
      editableParagraphs.forEach((p) => {
        const m = p.trim().match(/^([0-9]+\.[0-9]+)\s+(.*)$/);
        if (m) {
          extracted.push({
            num: m[1],
            title: m[2],
            isSub: !m[1].endsWith('.0'),
          });
        }
      });
      if (extracted.length > 0) return extracted;
    }
    return [
      { num: '1.0', title: 'OBJECTIVE' },
      { num: '2.0', title: 'SCOPE' },
      { num: '3.0', title: 'RESPONSIBILITY' },
      { num: '4.0', title: 'DEFINITION' },
      { num: '5.0', title: 'PROCEDURE DETAILS' },
      { num: '5.1', title: 'General Provisions', isSub: true },
      { num: '5.2', title: 'Operational Flow', isSub: true },
      { num: '6.0', title: 'RELATED DOCUMENTS' },
      { num: '7.0', title: 'RECORDS' },
      { num: '8.0', title: 'ATTACHMENTS AND EMERGENCY INSTRUCTIONS' },
    ];
  }, [tocList, editableParagraphs]);

  const effectiveBodyPages: string[][] = React.useMemo(() => {
    if (bodyPages && bodyPages.length > 0) return bodyPages;
    if (editableParagraphs && editableParagraphs.length > 0) {
      const pages: string[][] = [];
      let currentPage: string[] = [];
      editableParagraphs.forEach((p, idx) => {
        currentPage.push(p);
        if (currentPage.length >= 7 || idx === editableParagraphs.length - 1) {
          pages.push(currentPage);
          currentPage = [];
        }
      });
      return pages.length > 0 ? pages : [editableParagraphs];
    }
    return [
      [
        '1.0 OBJECTIVE',
        'Menetapkan tata kelola standar operasional pada PT Nirwana Bhumi Energy agar seluruh aktivitas berjalan efisien, aman, dan mematuhi regulasi industri migas serta sistem manajemen mutu ISO 9001/14001/45001.',
        '2.0 SCOPE',
        'Prosedur ini mencakup seluruh unit operasional, teknik, pengadaan, dan administrasi korporat di wilayah kerja PT Nirwana Bhumi Energy termasuk operasional darat dan fasilitas pendukung lainnya.',
        '3.0 RESPONSIBILITY',
        'Seluruh personel pelaksana wajib memahami dan menerapkan instruksi kerja yang tercantum. Verifikator teknis bertanggung jawab atas kendali mutu dan kepatuhan sistem audit berkala.',
        '4.0 DEFINITION',
        'IMS (Integrated Management Systems): Sistem Manajemen Terintegrasi mutu, K3, dan lingkungan yang diadopsi PT Nirwana Bhumi Energy.',
        'DCC (Document Control Center): Unit pengelola registrasi, distribusi, dan pengarsipan naskah dokumen terkontrol.',
      ],
      [
        '5.0 PROCEDURE DETAILS',
        '5.1 General Provisions',
        'Setiap kegiatan wajib diawali dengan penilaian risiko (Job Safety Analysis) dan inspeksi berkala pada peralatan kerja serta verifikasi izin kerja berlaku.',
        '5.2 Operational Flow',
        'Pelaksanaan tugas operasional dilaporkan secara harian ke sistem pemantauan terpadu untuk menjamin kontinuitas data dan akurasi riwayat penanganan.',
        '6.0 RELATED DOCUMENTS',
        'Manual Sistem Manajemen Terintegrasi NBE-IMS-MAN-2026 dan Formulir Verifikasi Mutu Lapangan.',
        '7.0 RECORDS',
        'Seluruh catatan verifikasi, logbook inspeksi, dan berita acara disimpan dalam arsip terkontrol minimal selama 5 (lima) tahun.',
        '8.0 ATTACHMENTS AND EMERGENCY INSTRUCTIONS',
        'Instruksi tanggap darurat dan nomor kontak darurat tertera pada lampiran internal operasional.',
      ],
    ];
  }, [bodyPages, editableParagraphs]);

  const totalPages = isProceduralDoc ? 3 + effectiveBodyPages.length : 4;

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
    setEditableVerifiedBy(verifiedBy || 'Dennis Raditya');
    setEditableApprovedBy(approvedBy || 'Bima Satryo Hartanto');
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
      }
      if (effectiveKopLogoDataUrl) {
        try {
          const res = await fetch(effectiveKopLogoDataUrl);
          kopBuffer = await res.arrayBuffer();
        } catch (e) {
          console.warn('Could not convert effectiveKopLogoDataUrl to buffer:', e);
        }
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
        preparedRole: editablePreparedRole || 'Lead Document Controller & Finance Director',
        verifiedBy: effectiveVerifiedBy,
        verifiedRole: editableVerifiedRole || 'Director of Operations & Technology / CTO',
        approvedBy: effectiveApprovedBy,
        approvedRole: editableApprovedRole || 'President Director / CEO',
        language: language,
        coverLogoBuffer: coverBuffer,
        kopLogoBuffer: kopBuffer,
        coverLogoWidthInches: effectiveCoverLogoWidthInches || 3.2,
        kopLogoWidthInches: effectiveKopLogoWidthInches || 0.95,
        tocList: editableTocItems,
        bodyPages: effectiveBodyPages,
        isProcedureOrSop: isProceduralDoc,
        preservedBodyParagraphs: editableParagraphs,
        bodyTables: editableTables,
        revisionRows: editableRevisionsList.map((r) => ({
          rev: String(r.revision),
          date: r.date,
          description: r.description,
          revisedBy: r.revisedBy,
        })),
      });
    } catch (err: any) {
      alert('Gagal mengunduh berkas Word (.docx): ' + err.message);
    } finally {
      setIsDownloadingWord(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanDocTitle = `${effectiveCode} - ${displayTitle}`;
    document.title = cleanDocTitle;

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);

    window.print();

    // Fallback timer if afterprint doesn't trigger
    setTimeout(() => {
      document.title = originalTitle;
    }, 2000);
  };

  const isPageVisibleOnScreen = (pageNum: number) => {
    return activePageTab === 'all' || activePageTab === pageNum;
  };

  // Reusable page frame styling (Exact A4 ratio: 210mm x 297mm)
  const a4PageStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '820px',
    minHeight: '1160px',
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
            <div className="ms-word-kop-tuner-group">
              <span style={{ fontWeight: 700 }}>⚙️ Ukuran Kop:</span>
              <span style={{ color: '#0369a1' }}>Lebar Logo:</span>
              {[16, 20, 25, 30].map((w) => (
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
              <span style={{ color: '#0369a1' }}>Tinggi Sel:</span>
              {[
                { val: 4, label: 'Padat' },
                { val: 6, label: 'Standar' },
                { val: 9, label: 'Lega' },
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
              <span style={{ color: '#0369a1' }}>Skala Font:</span>
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
                  padding: `${padY} 10px`,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  background: '#FFFFFF',
                }}
              >
                {effectiveKopLogoDataUrl ? (
                  <img
                    src={effectiveKopLogoDataUrl}
                    alt="Logo Kop NBE"
                    style={{
                      width: effectiveKopLogoWidthInches ? `${effectiveKopLogoWidthInches}in` : '1.35in',
                      maxHeight: kopSettings.paddingY > 6 ? '70px' : '56px',
                      objectFit: 'contain',
                      margin: '0 auto',
                      display: 'block',
                    }}
                  />
                ) : (
                  <img
                    src="/+BG.png"
                    alt="NBE"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/logo.png';
                    }}
                    style={{ maxHeight: kopSettings.paddingY > 6 ? '65px' : '52px', maxWidth: '140px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                  />
                )}
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
                  {editableDocTypeLabel || typeLabel || 'Procedure'}
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
                    <span>Revision:</span>
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
                  <>Revision: {effectiveRevision}</>
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
                Revised: {effectiveRevision > 0 ? (language === 'en' ? formattedDateEn : formattedDate) : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderRunningKopHeader = () => renderSharedKopHeader();

  const initialHtmlPages = React.useMemo(() => {
    if (effectiveBodyPages && effectiveBodyPages.length > 0) {
      return effectiveBodyPages.map((pageLines) => {
        return pageLines
          .map((line) => {
            const matchH = line.trim().match(/^([0-9]+\.[0-9]+)\s+(.*)$/);
            if (matchH) {
              const [, numPart, titlePart] = matchH;
              const isMainH = numPart.endsWith('.0');
              return `<div style="display: flex; align-items: baseline; font-weight: bold; color: #000000; padding-top: ${
                isMainH ? '0.75rem' : '0.4rem'
              }; margin-bottom: 0.3rem; font-size: ${
                isMainH ? '11pt' : '10.5pt'
              }; font-family: Arial;"><span style="display: inline-block; width: 0.5in; flex-shrink: 0;">${numPart}</span><span>${titlePart}</span></div>`;
            }
            return `<p style="padding-left: 0.5in; text-align: justify; line-height: 1.6; margin-bottom: 0.5rem; font-size: 10pt; font-family: Arial;">${line}</p>`;
          })
          .join('');
      });
    }
    return [
      "<p style='text-align: justify; font-size: 10.5pt; font-family: Arial;'>1.0\tOBJECTIVE</p>",
    ];
  }, [effectiveBodyPages]);

  const handleSaveFromRibbonEditor = (updatedHtmlPages: string[]) => {
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
        verifiedBy: effectiveVerifiedBy,
        approvedBy: effectiveApprovedBy,
        revisions: updatedRevs,
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
      className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(1) ? 'screen-hidden' : ''}`}
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
          {effectiveCoverLogoDataUrl ? (
            <img
              src={effectiveCoverLogoDataUrl}
              alt="Logo Cover NBE"
              style={{
                width: effectiveCoverLogoWidthInches ? `${effectiveCoverLogoWidthInches}in` : '3.2in',
                maxHeight: '130px',
                objectFit: 'contain',
                marginBottom: '1rem',
              }}
            />
          ) : (
            <img
              src="/+BG.png"
              alt="PT Nirwana Bhumi Energy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/logo.png';
              }}
              style={{
                width: '4.7cm',
                height: 'auto',
                objectFit: 'contain',
                marginBottom: '1rem',
              }}
            />
          )}
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
            {editableDocTypeLabel}
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
                Approved By
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
                  {editableApprovedRole}
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ verticalAlign: 'top', fontWeight: 600, paddingRight: '0.75rem', paddingBottom: '0.5rem', whiteSpace: 'nowrap' }}>
                Verified By
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
                  {editableVerifiedRole}
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ verticalAlign: 'top', fontWeight: 600, paddingRight: '0.75rem', whiteSpace: 'nowrap' }}>
                Created By
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
                  {editablePreparedRole}
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
        <span>PT Nirwana Bhumi Energy | Corporate Document Management System</span>
        <span>Page 1 of {totalPages}</span>
      </div>
    </div>
  );

  const renderSystemRevisionPage = (calcTotalPages: number) => (
    <div
      style={a4PageStyle}
      id="nbe-page-2"
      className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(2) ? 'screen-hidden' : ''}`}
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
        {language === 'en' ? 'REVISION INDEX' : 'TABEL INDEKS REVISI / REVISION INDEX'}
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
                {rev.date}
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
        <span>{effectiveCode} | PT Nirwana Bhumi Energy</span>
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
          className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(3) ? 'screen-hidden' : ''}`}
        >
          {renderSharedKopHeader()}

          <div style={{ textAlign: 'center', margin: '1.25rem 0' }}>
            <h4
              contentEditable={isEditing}
              suppressContentEditableWarning
              className={isEditing ? 'ms-word-editable-inline' : ''}
              style={{ fontSize: '13pt', fontWeight: 'bold', color: '#000000', margin: 0, textTransform: 'uppercase' }}
            >
              TABLE OF CONTENTS
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
            {editableTocItems.map((item, idx) => (
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
            <span>{effectiveCode} | PT Nirwana Bhumi Energy</span>
            <span>Page 3 of {calcTotalPages || totalPages}</span>
          </div>
        </div>
      );
    }

    return (
      <div
        style={a4PageStyle}
        id="nbe-page-3"
        className={`a4-page-preview a4-print-page ${!isPageVisibleOnScreen(3) ? 'screen-hidden' : ''}`}
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
          <span>{effectiveCode} | PT Nirwana Bhumi Energy</span>
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
                  background:
                    language === 'id'
                      ? '#ecfdf5'
                      : language === 'en'
                      ? '#eff6ff'
                      : '#fdf4ff',
                  color:
                    language === 'id'
                      ? '#059669'
                      : language === 'en'
                      ? '#2563eb'
                      : '#9333ea',
                  fontWeight: 700,
                  border: '1px solid currentColor',
                }}
              >
                {language === 'id' && '🇮🇩 Bahasa Indonesia (4 Halaman)'}
                {language === 'en' && '🇬🇧 British English (4 Pages)'}
                {language === 'bi' && '🌐 Bilingual (ID - EN 4 Pages)'}
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
            title="Unduh Dokumen Word 4 Halaman Resmi"
          >
            <Download size={14} />
            <span>{isDownloadingWord ? 'Menyusun .docx...' : 'Unduh Word (.docx)'}</span>
          </button>

          {/* Print / Save PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Cetak atau Simpan PDF format A4"
          >
            <Printer size={14} />
            <span>Cetak / PDF</span>
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
                ...effectiveBodyPages.map((_, idx) => ({
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
      />

    </div>
  );
};
