import React, { useState, useRef } from 'react';
import {
  CodeDefinition,
  MasterCodesState,
  SUB_SUB_CATEGORIES,
} from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  Save,
  Info,
  FileText,
  Upload,
  FileCode,
  Sliders,
  Sparkles,
  BookOpen,
  Layers,
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  loadTemplateSettings,
  saveTemplateSettings,
  resetTemplateSettings,
  DocumentTemplateSettings,
  DEFAULT_TEMPLATE_GUIDELINES,
  DEFAULT_TEMPLATE_SETTINGS,
} from '../services/templateSettings';

interface MasterCategoriesViewProps {
  masterCodes: MasterCodesState;
  onAddDocumentType: (item: CodeDefinition) => void;
  onUpdateDocumentType: (code: string, item: Partial<CodeDefinition>) => void;
  onDeleteDocumentType: (code: string) => void;
  onAddSubCategory: (item: CodeDefinition) => void;
  onUpdateSubCategory: (code: string, item: Partial<CodeDefinition>) => void;
  onDeleteSubCategory: (code: string) => void;
  onAddSubSubCategory: (item: CodeDefinition) => void;
  onUpdateSubSubCategory: (code: string, item: Partial<CodeDefinition>) => void;
  onDeleteSubSubCategory: (code: string) => void;
  onAddDivision: (item: CodeDefinition) => void;
  onUpdateDivision: (code: string, item: Partial<CodeDefinition>) => void;
  onDeleteDivision: (code: string) => void;
  onAddApprover: (item: CodeDefinition) => void;
  onUpdateApprover: (code: string, item: Partial<CodeDefinition>) => void;
  onDeleteApprover: (code: string) => void;
  onResetDefaults: () => void;
  initialTab?: ActiveCategoryTab;
}

type ActiveCategoryTab = 'types' | 'subcategories' | 'subsubcategories' | 'divisions' | 'approvers' | 'template';

export const MasterCategoriesView: React.FC<MasterCategoriesViewProps> = ({
  initialTab = 'types',
  masterCodes,
  onAddDocumentType,
  onUpdateDocumentType,
  onDeleteDocumentType,
  onAddSubCategory,
  onUpdateSubCategory,
  onDeleteSubCategory,
  onAddSubSubCategory,
  onUpdateSubSubCategory,
  onDeleteSubSubCategory,
  onAddDivision,
  onUpdateDivision,
  onDeleteDivision,
  onAddApprover,
  onUpdateApprover,
  onDeleteApprover,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveCategoryTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Acuan Template Dokumen state
  const [templateSettings, setTemplateSettings] = useState<DocumentTemplateSettings>(() => loadTemplateSettings());
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const txtInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTargetCode, setEditingTargetCode] = useState<string>('');

  // Close modal on Escape key (R-32 Accessibility)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Form fields
  const [formCode, setFormCode] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showSuccessBanner = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const handleTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setTemplateSettings((prev) => ({
        ...prev,
        txtGuidelinesName: file.name,
        txtGuidelinesContent: content,
      }));
      showSuccessBanner(`Berkas teks acuan utama "${file.name}" berhasil dimuat!`);
    };
    reader.readAsText(file);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setTemplateSettings((prev) => ({
        ...prev,
        pdfLayoutName: file.name,
        pdfLayoutDataUrl: dataUrl,
      }));
      showSuccessBanner(`Berkas PDF acuan visual "${file.name}" berhasil dimuat!`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTemplate = () => {
    setIsSavingTemplate(true);
    saveTemplateSettings(templateSettings);
    setTimeout(() => {
      setIsSavingTemplate(false);
      showSuccessBanner('Acuan Template Dokumen (.txt & .pdf) berhasil disimpan dan disinkronkan ke seluruh sistem!');
    }, 400);
  };

  const handleResetTemplate = () => {
    if (confirm('Kembalikan Acuan Template Dokumen ke standar baku SOP PT Nirwana Bhumi Energi?')) {
      const res = resetTemplateSettings();
      setTemplateSettings(res);
      showSuccessBanner('Acuan Template Dokumen telah dikembalikan ke standar baku SOP NBE.');
    }
  };

  const handleDownloadTxtGuidelines = () => {
    const blob = new Blob([templateSettings.txtGuidelinesContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateSettings.txtGuidelinesName || 'Panduan_Standar_Dokumen_NBE_CSMS.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingTargetCode('');
    setFormCode('');
    setFormLabel('');
    setFormDesc('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CodeDefinition) => {
    setModalMode('edit');
    setEditingTargetCode(item.code);
    setFormCode(item.code);
    setFormLabel(item.label);
    setFormDesc(item.description);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = formCode.trim().toUpperCase();
    const cleanLabel = formLabel.trim();
    const cleanDesc = formDesc.trim();

    if (!cleanCode) {
      setFormError('Kode tidak boleh kosong.');
      return;
    }
    if (!/^[A-Z0-9_-]{2,8}$/.test(cleanCode)) {
      setFormError('Kode harus berupa 2-8 karakter huruf kapital/angka (contoh: GP, SK, MEM, HRD).');
      return;
    }
    if (!cleanLabel) {
      setFormError('Nama / Label lengkap wajib diisi.');
      return;
    }

    try {
      const itemData: CodeDefinition = {
        code: cleanCode,
        label: cleanLabel,
        description: cleanDesc || cleanLabel,
        isCustom: true,
      };

      if (modalMode === 'add') {
        if (activeTab === 'types') {
          onAddDocumentType(itemData);
          showSuccessBanner(`Kategori Surat "${cleanCode}" berhasil ditambahkan!`);
        } else if (activeTab === 'subcategories') {
          onAddSubCategory(itemData);
          showSuccessBanner(`Sub-Kategori Surat "${cleanCode}" berhasil ditambahkan!`);
        } else if (activeTab === 'subsubcategories') {
          onAddSubSubCategory(itemData);
          showSuccessBanner(`Sub-sub Kategori Surat "${cleanCode}" berhasil ditambahkan!`);
        } else if (activeTab === 'divisions') {
          onAddDivision(itemData);
          showSuccessBanner(`Divisi Penerbit "${cleanCode}" berhasil ditambahkan!`);
        } else {
          onAddApprover(itemData);
          showSuccessBanner(`Otoritas Pengesahan "${cleanCode}" berhasil ditambahkan!`);
        }
      } else {
        if (activeTab === 'types') {
          onUpdateDocumentType(editingTargetCode, itemData);
          showSuccessBanner(`Kategori Surat "${cleanCode}" berhasil diperbarui!`);
        } else if (activeTab === 'subcategories') {
          onUpdateSubCategory(editingTargetCode, itemData);
          showSuccessBanner(`Sub-Kategori Surat "${cleanCode}" berhasil diperbarui!`);
        } else if (activeTab === 'subsubcategories') {
          onUpdateSubSubCategory(editingTargetCode, itemData);
          showSuccessBanner(`Sub-sub Kategori Surat "${cleanCode}" berhasil diperbarui!`);
        } else if (activeTab === 'divisions') {
          onUpdateDivision(editingTargetCode, itemData);
          showSuccessBanner(`Divisi Penerbit "${cleanCode}" berhasil diperbarui!`);
        } else {
          onUpdateApprover(editingTargetCode, itemData);
          showSuccessBanner(`Otoritas Pengesahan "${cleanCode}" berhasil diperbarui!`);
        }
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan data.');
    }
  };

  const handleDelete = (item: CodeDefinition) => {
    const tabName =
      activeTab === 'types'
        ? 'Kategori Surat'
        : activeTab === 'subcategories'
        ? 'Sub-Kategori Surat'
        : activeTab === 'subsubcategories'
        ? 'Sub-sub Kategori Surat'
        : activeTab === 'divisions'
        ? 'Divisi Penerbit'
        : 'Otoritas Pengesahan';

    if (
      confirm(
        `Apakah Anda yakin ingin menghapus ${tabName} "${item.code} - ${item.label}"?`
      )
    ) {
      try {
        if (activeTab === 'types') {
          onDeleteDocumentType(item.code);
        } else if (activeTab === 'subcategories') {
          onDeleteSubCategory(item.code);
        } else if (activeTab === 'subsubcategories') {
          onDeleteSubSubCategory(item.code);
        } else if (activeTab === 'divisions') {
          onDeleteDivision(item.code);
        } else {
          onDeleteApprover(item.code);
        }
        showSuccessBanner(`${tabName} "${item.code}" berhasil dihapus.`);
      } catch (err: any) {
        alert(err.message || 'Gagal menghapus data.');
      }
    }
  };

  const handleReset = () => {
    if (
      confirm(
        'Kembalikan seluruh daftar Kategori Surat, Divisi, dan Otoritas Pengesahan ke standar bawaan SOP NBE?'
      )
    ) {
      onResetDefaults();
      showSuccessBanner('Semua kategori telah direset ke standar bawaan SOP.');
    }
  };

  // Filter current list
  const currentList =
    activeTab === 'types'
      ? masterCodes.documentTypes
      : activeTab === 'subcategories'
      ? masterCodes.subCategories
      : activeTab === 'subsubcategories'
      ? (masterCodes.subSubCategories && masterCodes.subSubCategories.length > 0
          ? masterCodes.subSubCategories
          : SUB_SUB_CATEGORIES)
      : activeTab === 'divisions'
      ? masterCodes.divisions
      : masterCodes.approvers;

  const filteredList = currentList.filter(
    (item) =>
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      {/* Header View */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
            }}
          >
            Kelola Master Kategori & Kode Surat
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              marginTop: '0.35rem',
            }}
          >
            Tambahkan atau kelola Kategori Dokumen (Document Type), Divisi Penerbit Surat, dan Otoritas Pengesahan (Approver) sesuai perkembangan perusahaan.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={activeTab === 'template' ? handleResetTemplate : handleReset}
            className="btn btn-secondary btn-sm"
            title={activeTab === 'template' ? 'Kembalikan acuan template ke standar bawaan SOP NBE' : 'Kembalikan ke standar awal SOP'}
          >
            <RotateCcw size={15} />
            <span>{activeTab === 'template' ? 'Reset Template SOP' : 'Reset ke Default SOP'}</span>
          </button>
          {activeTab === 'template' ? (
            <button
              onClick={handleSaveTemplate}
              disabled={isSavingTemplate}
              className="btn btn-primary btn-sm"
              style={{
                background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
                border: 'none',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 10px rgba(2, 132, 199, 0.25)',
              }}
            >
              <Save size={16} />
              <span>{isSavingTemplate ? 'Menyimpan...' : 'Simpan Acuan Template'}</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAdd}
              className="btn btn-primary btn-sm"
              style={{
                background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
                border: 'none',
                fontWeight: 600,
              }}
            >
              <Plus size={16} />
              <span>
                {activeTab === 'types'
                  ? '+ Tambah Kategori Surat'
                  : activeTab === 'subcategories'
                  ? '+ Tambah Sub-Kategori (ZZ)'
                  : activeTab === 'subsubcategories'
                  ? '+ Tambah Sub-sub Kategori (AA)'
                  : activeTab === 'divisions'
                  ? '+ Tambah Divisi Penerbit'
                  : '+ Tambah Otoritas Pengesahan'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Success notification */}
      {actionSuccess && (
        <div
          className="glass-card animate-fade-in"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid var(--success)',
            color: 'var(--success)',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* TOP HORIZONTAL PILL NAVIGATION: 6 TABS */}
      <div
        style={{
          display: 'flex',
          gap: '0.45rem',
          background: 'var(--bg-secondary)',
          padding: '0.5rem',
          borderRadius: '14px',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        }}
      >
        <button
          type="button"
          onClick={() => { setActiveTab('types'); setSearchQuery(''); }}
          className={`btn btn-sm ${activeTab === 'types' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', borderRadius: '8px', fontWeight: activeTab === 'types' ? 800 : 500 }}
        >
          1. Kategori Dokumen ({masterCodes.documentTypes.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('subcategories'); setSearchQuery(''); }}
          className={`btn btn-sm ${activeTab === 'subcategories' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', borderRadius: '8px', fontWeight: activeTab === 'subcategories' ? 800 : 500 }}
        >
          2. Sub-Kategori ZZ ({masterCodes.subCategories.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('subsubcategories'); setSearchQuery(''); }}
          className={`btn btn-sm ${activeTab === 'subsubcategories' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', borderRadius: '8px', fontWeight: activeTab === 'subsubcategories' ? 800 : 500 }}
        >
          3. Sub-sub Kategori AA ({(masterCodes.subSubCategories || SUB_SUB_CATEGORIES).length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('divisions'); setSearchQuery(''); }}
          className={`btn btn-sm ${activeTab === 'divisions' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', borderRadius: '8px', fontWeight: activeTab === 'divisions' ? 800 : 500 }}
        >
          4. Divisi Penerbit ({masterCodes.divisions.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('approvers'); setSearchQuery(''); }}
          className={`btn btn-sm ${activeTab === 'approvers' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', borderRadius: '8px', fontWeight: activeTab === 'approvers' ? 800 : 500 }}
        >
          5. Otoritas Pengesahan ({masterCodes.approvers.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('template'); setSearchQuery(''); }}
          className={`btn btn-sm ${activeTab === 'template' ? 'btn-primary' : 'btn-ghost'}`}
          style={{
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            borderRadius: '8px',
            fontWeight: activeTab === 'template' ? 800 : 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            border: activeTab === 'template' ? 'none' : '1px solid var(--border-subtle)',
          }}
        >
          <Sparkles size={15} color={activeTab === 'template' ? '#fff' : 'var(--accent)'} />
          <span>6. Acuan Template Dokumen & Panduan Standardisasi Bot</span>
          <span
            className="badge"
            style={{
              fontSize: '0.62rem',
              background: activeTab === 'template' ? 'rgba(255,255,255,0.25)' : 'rgba(2, 132, 199, 0.15)',
              color: activeTab === 'template' ? '#ffffff' : '#0284c7',
              padding: '0.1rem 0.45rem',
              borderRadius: '4px',
              fontWeight: 800,
            }}
          >
            BARU
          </span>
        </button>
      </div>

      {/* 6 Main Tabs Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* TAB 1: Document Type */}
        <div
          onClick={() => {
            setActiveTab('types');
            setSearchQuery('');
          }}
          style={{
            cursor: 'pointer',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border:
              activeTab === 'types'
                ? '2px solid #10b981'
                : '1px solid var(--border-subtle)',
            background:
              activeTab === 'types'
                ? 'rgba(16, 185, 129, 0.1)'
                : 'var(--bg-secondary)',
            transition: 'all 0.2s ease',
            boxShadow:
              activeTab === 'types'
                ? '0 4px 16px rgba(16, 185, 129, 0.15)'
                : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                1
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Kategori Surat
              </h3>
            </div>
            <span
              className="badge mono"
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
                fontWeight: 700,
              }}
            >
              {masterCodes.documentTypes.length} Jenis
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Document Type Code (contoh: SOP, WIK, MNL, KB, CSMS)
          </p>
        </div>

        {/* TAB 2: Sub-Category (Kode ZZ) */}
        <div
          onClick={() => {
            setActiveTab('subcategories');
            setSearchQuery('');
          }}
          style={{
            cursor: 'pointer',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border:
              activeTab === 'subcategories'
                ? '2px solid #06b6d4'
                : '1px solid var(--border-subtle)',
            background:
              activeTab === 'subcategories'
                ? 'rgba(6, 182, 212, 0.1)'
                : 'var(--bg-secondary)',
            transition: 'all 0.2s ease',
            boxShadow:
              activeTab === 'subcategories'
                ? '0 4px 16px rgba(6, 182, 212, 0.15)'
                : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#06b6d4',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                2
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Sub-Kategori Surat
              </h3>
            </div>
            <span
              className="badge mono"
              style={{
                background: 'rgba(6, 182, 212, 0.2)',
                color: '#06b6d4',
                fontWeight: 700,
              }}
            >
              {(masterCodes.subCategories || []).length} Sub-Tipe
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Kode ZZ (contoh: GP, KM, PB, PE, PR)
          </p>
        </div>

        {/* TAB 3: Sub-sub Category (Kode AA) */}
        <div
          onClick={() => {
            setActiveTab('subsubcategories');
            setSearchQuery('');
          }}
          style={{
            cursor: 'pointer',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border:
              activeTab === 'subsubcategories'
                ? '2px solid #8b5cf6'
                : '1px solid var(--border-subtle)',
            background:
              activeTab === 'subsubcategories'
                ? 'rgba(139, 92, 246, 0.1)'
                : 'var(--bg-secondary)',
            transition: 'all 0.2s ease',
            boxShadow:
              activeTab === 'subsubcategories'
                ? '0 4px 16px rgba(139, 92, 246, 0.15)'
                : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#8b5cf6',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                3
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Sub-sub Kategori
              </h3>
            </div>
            <span
              className="badge mono"
              style={{
                background: 'rgba(139, 92, 246, 0.2)',
                color: '#8b5cf6',
                fontWeight: 700,
              }}
            >
              {(masterCodes.subSubCategories && masterCodes.subSubCategories.length > 0
                ? masterCodes.subSubCategories.length
                : SUB_SUB_CATEGORIES.length)} Sub-sub Tipe
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Kode AA (contoh: AI, PB, PD, IK, BP, PR, KR, PM, MR, PK)
          </p>
        </div>

        {/* TAB 4: Division */}
        <div
          onClick={() => {
            setActiveTab('divisions');
            setSearchQuery('');
          }}
          style={{
            cursor: 'pointer',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border:
              activeTab === 'divisions'
                ? '2px solid #0284c7'
                : '1px solid var(--border-subtle)',
            background:
              activeTab === 'divisions'
                ? 'rgba(2, 132, 199, 0.1)'
                : 'var(--bg-secondary)',
            transition: 'all 0.2s ease',
            boxShadow:
              activeTab === 'divisions'
                ? '0 4px 16px rgba(2, 132, 199, 0.15)'
                : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                4
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Penerbit Surat (Divisi)
              </h3>
            </div>
            <span
              className="badge mono"
              style={{
                background: 'rgba(2, 132, 199, 0.2)',
                color: '#0284c7',
                fontWeight: 700,
              }}
            >
              {masterCodes.divisions.length} Divisi
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Division Code (contoh: GNR, ENG, OPR, FNC, HRD, HSE)
          </p>
        </div>

        {/* TAB 5: Approver */}
        <div
          onClick={() => {
            setActiveTab('approvers');
            setSearchQuery('');
          }}
          style={{
            cursor: 'pointer',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border:
              activeTab === 'approvers'
                ? '2px solid #f59e0b'
                : '1px solid var(--border-subtle)',
            background:
              activeTab === 'approvers'
                ? 'rgba(245, 158, 11, 0.1)'
                : 'var(--bg-secondary)',
            transition: 'all 0.2s ease',
            boxShadow:
              activeTab === 'approvers'
                ? '0 4px 16px rgba(245, 158, 11, 0.15)'
                : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                5
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Otoritas Pengesahan
              </h3>
            </div>
            <span
              className="badge mono"
              style={{
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#f59e0b',
                fontWeight: 700,
              }}
            >
              {masterCodes.approvers.length} Posisi
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Approving Authority Code (contoh: CEO, CTO, COO, CFO, MNG, SPV)
          </p>
        </div>

        {/* TAB 6: Acuan Template Dokumen (NEW TAB TAHAP 3) */}
        <div
          onClick={() => {
            setActiveTab('template');
            setSearchQuery('');
          }}
          style={{
            cursor: 'pointer',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border:
              activeTab === 'template'
                ? '2px solid #0284c7'
                : '1px solid var(--border-subtle)',
            background:
              activeTab === 'template'
                ? 'rgba(2, 132, 199, 0.12)'
                : 'var(--bg-secondary)',
            transition: 'all 0.2s ease',
            boxShadow:
              activeTab === 'template'
                ? '0 4px 16px rgba(2, 132, 199, 0.18)'
                : 'none',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-10px',
              right: '12px',
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '0.62rem',
              fontWeight: 800,
              padding: '0.15rem 0.5rem',
              borderRadius: '6px',
              letterSpacing: '0.04em',
            }}
          >
            TAHAP 3 • BARU
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                6
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Acuan Template Dokumen & Panduan Standardisasi Bot
              </h3>
            </div>
            <span
              className="badge mono"
              style={{
                background: 'rgba(2, 132, 199, 0.2)',
                color: '#0284c7',
                fontWeight: 700,
              }}
            >
              TXT & PDF
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Pedoman Dasar Utama (.txt) & Acuan Visual Tata Letak (.pdf) untuk Bot AI & Konverter Dokumen
          </p>
        </div>
      </div>

      {/* TAB CONTENT: EITHER TEMPLATE PANEL OR MASTER CODES TABLE */}
      {activeTab === 'template' ? (
        <div className="glass-card animate-fade-in" style={{ padding: '1.75rem' }}>
          {/* Hidden File Inputs */}
          <input
            ref={txtInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={handleTxtUpload}
            style={{ display: 'none' }}
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handlePdfUpload}
            style={{ display: 'none' }}
          />

          {/* Context Banner */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <Sparkles size={22} />
            </div>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Acuan Template Dokumen & Panduan Standardisasi Bot
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                  }}
                >
                  ● Terhubung dengan Bot AI & Konverter Dokumen
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.45rem', lineHeight: 1.5 }}>
                Sesuai alur baku sistem: <strong>File (.txt)</strong> bertindak sebagai <em>acuan dasar utama</em> untuk mengedit keseluruhan isi dan halaman dokumen Word yang telah diunggah. <strong>File (.pdf)</strong> bertindak sebagai <em>acuan dasar kedua</em> untuk tata letak visual, proporsi, margin, dan looks halaman.
              </p>
            </div>
          </div>

          {/* TWO MAIN UPLOAD COLUMNS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.5rem',
              marginBottom: '1.75rem',
            }}
          >
            {/* COLUMN 1: ACUAN DASAR UTAMA (.TXT) */}
            <div
              className="glass-card"
              style={{
                padding: '1.35rem',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        padding: '0.35rem',
                        borderRadius: '6px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                      }}
                    >
                      <FileCode size={18} />
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      1. Acuan Dasar Utama: File Panduan Teks (.txt)
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    Pedoman teks utama bot untuk membedah, menyusun Cover, Kop Header, Tabel Revisi, serta Bab 1-7 Prosedur Word.
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Acuan Pokok
                </span>
              </div>

              {/* Upload Box for .TXT */}
              <div
                onClick={() => txtInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(56, 189, 248, 0.4)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: 'rgba(56, 189, 248, 0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)')}
              >
                <Upload size={24} color="#38bdf8" style={{ margin: '0 auto 0.4rem auto' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Klik untuk Unggah Berkas Acuan (.txt) Baru
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Berkas aktif: <strong style={{ color: '#38bdf8' }}>{templateSettings.txtGuidelinesName || 'Panduan_Standar_Dokumen_NBE_CSMS.txt'}</strong>
                </div>
              </div>

              {/* Live Textarea of Guidelines */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    ISI PANDUAN TEKS AKTIF (DAPAT DIEDIT LANGSUNG):
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={handleDownloadTxtGuidelines}
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: '0.72rem', color: '#38bdf8' }}
                      title="Unduh berkas .txt"
                    >
                      <FileText size={12} />
                      <span>Unduh .txt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(templateSettings.txtGuidelinesContent);
                        showSuccessBanner('Isi panduan .txt disalin ke clipboard!');
                      }}
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: '0.72rem' }}
                      title="Salin isi ke clipboard"
                    >
                      <Copy size={12} />
                      <span>Salin</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={9}
                  value={templateSettings.txtGuidelinesContent}
                  onChange={(e) =>
                    setTemplateSettings((prev) => ({
                      ...prev,
                      txtGuidelinesContent: e.target.value,
                    }))
                  }
                  className="form-input mono"
                  style={{
                    fontSize: '0.76rem',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    background: 'rgba(0, 0, 0, 0.25)',
                  }}
                  placeholder="Ketik atau tempel pedoman standarisasi format teks di sini..."
                />
              </div>
            </div>

            {/* COLUMN 2: ACUAN DASAR KEDUA (.PDF) */}
            <div
              className="glass-card"
              style={{
                padding: '1.35rem',
                border: '1px solid rgba(0, 212, 178, 0.3)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        padding: '0.35rem',
                        borderRadius: '6px',
                        background: 'rgba(0, 212, 178, 0.15)',
                        color: '#00d4b2',
                      }}
                    >
                      <BookOpen size={18} />
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                      2. Acuan Dasar Kedua: File Visual Layout (.pdf)
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                    Acuan tata letak, bentuk, proporsi garis tabel 1.5pt, margin, dan looks visual dokumen.
                  </p>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    background: 'rgba(0, 212, 178, 0.15)',
                    color: '#00d4b2',
                    border: '1px solid rgba(0, 212, 178, 0.3)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Acuan Visual
                </span>
              </div>

              {/* Upload Box for .PDF */}
              <div
                onClick={() => pdfInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(0, 212, 178, 0.4)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: 'rgba(0, 212, 178, 0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#00d4b2')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(0, 212, 178, 0.4)')}
              >
                <Upload size={24} color="#00d4b2" style={{ margin: '0 auto 0.4rem auto' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Klik untuk Unggah Berkas Acuan Visual (.pdf)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Berkas aktif: <strong style={{ color: '#00d4b2' }}>{templateSettings.pdfLayoutName || 'Contoh_Visual_Layout_Standar_NBE.pdf'}</strong>
                </div>
              </div>

              {/* Visual Layout Representation */}
              <div
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1rem',
                  background: 'rgba(0,0,0,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Struktur Visual Tata Letak (Berdasarkan PDF Acuan):
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  {/* Miniature Cover */}
                  <div
                    style={{
                      border: '1px solid #94a3b8',
                      borderRadius: '4px',
                      background: '#ffffff',
                      color: '#0f172a',
                      padding: '0.65rem',
                      height: '130px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      fontSize: '0.55rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 800, color: '#0284c7' }}>NBE</span>
                      <span style={{ fontSize: '0.5rem', color: '#64748b' }}>Nirwana Bhumi Energy</span>
                    </div>
                    <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.6rem', color: '#000' }}>
                      [JUDUL DOKUMEN PROSEDUR]
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.48rem', color: '#475569', borderTop: '0.5px solid #e2e8f0', paddingTop: '0.2rem' }}>
                      <div>Approved by: Director</div>
                      <div>Verified by: Internal Auditor</div>
                      <div>Prepared by: Staff</div>
                    </div>
                  </div>

                  {/* Miniature Header & Revision Table */}
                  <div
                    style={{
                      border: '1px solid #94a3b8',
                      borderRadius: '4px',
                      background: '#ffffff',
                      color: '#0f172a',
                      padding: '0.65rem',
                      height: '130px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                      fontSize: '0.52rem',
                    }}
                  >
                    <div style={{ border: '1px solid #000', padding: '0.2rem', textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.55rem' }}>SISTEM PENGENDALI INTERNAL</div>
                      <div style={{ fontSize: '0.48rem' }}>Standar Operasional Prosedur (SOP)</div>
                    </div>
                    <div style={{ border: '1px solid #000', padding: '0.2rem', flex: 1 }}>
                      <div style={{ fontWeight: 700, borderBottom: '0.5px solid #000', paddingBottom: '0.1rem' }}>
                        Tabel Revision Index (4 Kolom)
                      </div>
                      <div style={{ fontSize: '0.48rem', color: '#475569', marginTop: '0.15rem' }}>
                        Rev 0 | Tgl | Initial Edition | Nama
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.45rem', color: '#94a3b8' }}>
                      Page 2 of X
                    </div>
                  </div>
                </div>

                {templateSettings.pdfLayoutDataUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const w = window.open('');
                      w?.document.write(`<iframe src="${templateSettings.pdfLayoutDataUrl}" style="width:100%; height:100%; border:none;"></iframe>`);
                    }}
                    className="btn btn-secondary btn-xs"
                    style={{ marginTop: '0.25rem', width: '100%', justifyContent: 'center' }}
                  >
                    <ExternalLink size={12} />
                    <span>Buka File PDF Acuan di Tab Baru</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: PENGATURAN UKURAN KERTAS & STANDAR FORMAT (KONDISI NYATA) */}
          <div
            className="glass-card"
            style={{
              padding: '1.35rem 1.5rem',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Sliders size={18} color="var(--primary)" />
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                3. Pengaturan Ukuran Kertas & Standar Cetak (Kondisi Nyata Dokumen)
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {/* Ukuran Kertas */}
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  Ukuran Kertas Baku *
                </label>
                <select
                  value={templateSettings.paperSize}
                  onChange={(e) =>
                    setTemplateSettings((prev) => ({
                      ...prev,
                      paperSize: e.target.value as any,
                    }))
                  }
                  className="form-select"
                  style={{ fontWeight: 700 }}
                >
                  <option value="A4">A4 (210 × 297 mm) (Standar Baku NBE)</option>
                  <option value="Letter">Letter (215.9 × 279.4 mm)</option>
                  <option value="F4">F4 / Folio (215 × 330 mm)</option>
                </select>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Sesuai ketentuan ISO & CSMS perusahaan.
                </span>
              </div>

              {/* Orientasi */}
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  Orientasi Kertas
                </label>
                <select
                  value={templateSettings.orientation}
                  onChange={(e) =>
                    setTemplateSettings((prev) => ({
                      ...prev,
                      orientation: e.target.value as any,
                    }))
                  }
                  className="form-select"
                >
                  <option value="portrait">Portrait (Tegak - Default Standar Prosedur)</option>
                  <option value="landscape">Landscape (Mendatar - Lampiran Bagan)</option>
                </select>
              </div>

              {/* Margin Kertas */}
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  Margin Atas & Bawah (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="5"
                  value={templateSettings.marginTopCm}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 2.54;
                    setTemplateSettings((prev) => ({
                      ...prev,
                      marginTopCm: v,
                      marginBottomCm: v,
                    }));
                  }}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  Margin Kiri & Kanan (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max="5"
                  value={templateSettings.marginLeftCm}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 2.54;
                    setTemplateSettings((prev) => ({
                      ...prev,
                      marginLeftCm: v,
                      marginRightCm: v,
                    }));
                  }}
                  className="form-input"
                />
              </div>

              {/* Font Family */}
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  Tipografi / Font Baku
                </label>
                <select
                  value={templateSettings.fontFamily}
                  onChange={(e) =>
                    setTemplateSettings((prev) => ({
                      ...prev,
                      fontFamily: e.target.value,
                    }))
                  }
                  className="form-select"
                >
                  <option value="Arial, sans-serif">Arial (Standar NBE)</option>
                  <option value="Calibri, sans-serif">Calibri</option>
                  <option value="'Times New Roman', serif">Times New Roman</option>
                </select>
              </div>
            </div>
          </div>

          {/* ACTIONS BAR */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingTop: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Terakhir diperbarui: {new Date(templateSettings.lastUpdated || Date.now()).toLocaleString('id-ID')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={handleResetTemplate}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                <RotateCcw size={15} />
                <span>Reset ke Standar Baku SOP NBE</span>
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isSavingTemplate}
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
                  border: 'none',
                  padding: '0.65rem 1.75rem',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  boxShadow: '0 2px 10px rgba(2, 132, 199, 0.25)',
                }}
              >
                <Save size={16} />
                <span>{isSavingTemplate ? 'Menyimpan...' : 'Simpan Acuan Template Dokumen'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* MASTER CODES FILTER & LIST CARD (FOR TABS 1 - 5) */
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          {/* Action Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder={`Cari kode, nama, atau deskripsi ${
                  activeTab === 'types'
                    ? 'kategori surat'
                    : activeTab === 'subcategories'
                    ? 'sub-kategori surat'
                    : activeTab === 'subsubcategories'
                    ? 'sub-sub kategori surat'
                    : activeTab === 'divisions'
                    ? 'divisi'
                    : 'otoritas'
                }...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>

            <button
              onClick={handleOpenAdd}
              className="btn btn-primary btn-sm"
              style={{
                background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
                border: 'none',
                fontWeight: 600,
              }}
            >
              <Plus size={16} />
              <span>
                {activeTab === 'types'
                  ? '+ Tambah Kategori Baru'
                  : activeTab === 'subcategories'
                  ? '+ Tambah Sub-Kategori Baru'
                  : activeTab === 'subsubcategories'
                  ? '+ Tambah Sub-sub Kategori Baru'
                  : activeTab === 'divisions'
                  ? '+ Tambah Divisi Baru'
                  : '+ Tambah Otoritas Baru'}
              </span>
            </button>
          </div>

          {/* Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredList.map((item) => {
              const badgeColor =
                activeTab === 'types'
                  ? '#10b981'
                  : activeTab === 'subcategories'
                  ? '#06b6d4'
                  : activeTab === 'subsubcategories'
                  ? '#8b5cf6'
                  : activeTab === 'divisions'
                  ? '#0284c7'
                  : '#f59e0b';

              return (
                <div
                  key={item.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '240px' }}>
                    <span
                      className="badge mono"
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        padding: '0.35rem 0.75rem',
                        background: `${badgeColor}22`,
                        color: badgeColor,
                        border: `1px solid ${badgeColor}55`,
                        letterSpacing: '0.05em',
                        minWidth: '55px',
                        textAlign: 'center',
                      }}
                    >
                      {item.code}
                    </span>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{item.label}</span>
                        {item.isCustom && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                            }}
                          >
                            Kustom
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          marginTop: '0.2rem',
                        }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="btn btn-secondary btn-sm"
                      title="Ubah Nama & Deskripsi"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                    >
                      <Edit2 size={13} />
                      <span>Ubah</span>
                    </button>

                    <button
                      onClick={() => handleDelete(item)}
                      className="btn btn-ghost btn-sm"
                      title="Hapus Kategori"
                      style={{ padding: '0.35rem 0.65rem', color: '#ef4444', fontSize: '0.78rem' }}
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  color: 'var(--text-muted)',
                }}
              >
                <Info size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontWeight: 600 }}>Tidak ada data yang cocok dengan pencarian.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Silakan gunakan tombol tambah untuk mendaftarkan kode baru.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content animate-fade-in"
            style={{ maxWidth: '540px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-tertiary)',
              }}
            >
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {modalMode === 'add' ? 'Tambah ' : 'Ubah '}
                {activeTab === 'types'
                  ? 'Kategori Surat (Document Type)'
                  : activeTab === 'subcategories'
                  ? 'Sub-Kategori Surat (Sub Category - Kode ZZ)'
                  : activeTab === 'subsubcategories'
                  ? 'Sub-sub Kategori Surat (Sub-sub Category - Kode AA)'
                  : activeTab === 'divisions'
                  ? 'Divisi Penerbit (Division)'
                  : 'Otoritas Pengesahan (Approver)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.35rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} style={{ padding: '1.5rem' }}>
              {/* Kode Input */}
              <div className="form-group">
                <label className="form-label">
                  Kode Singkatan (2-8 Karakter Kapital) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder={
                    activeTab === 'types'
                      ? 'Contoh: SK, MEM, ND, CSMS'
                      : activeTab === 'subcategories'
                      ? 'Contoh: GP, KM, PB, PE, PR'
                      : activeTab === 'subsubcategories'
                      ? 'Contoh: AI, PB, PD, IK, MR'
                      : activeTab === 'divisions'
                      ? 'Contoh: HRD, HSE, PRC, MKT'
                      : 'Contoh: HRM, COM, HOD'
                  }
                  className="form-input mono"
                  style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}
                  disabled={modalMode === 'edit'}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                  {modalMode === 'edit'
                    ? 'Kode tidak dapat diubah agar tidak merusak relasi penomoran dokumen terdahulu.'
                    : 'Kode ini akan langsung digunakan pada generator nomor surat (misal: 0001-CSMS-GP/AI-FNC-CFO-IX-2026).'}
                </span>
              </div>

              {/* Nama / Label Lengkap */}
              <div className="form-group">
                <label className="form-label">
                  Nama Lengkap / Label <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder={
                    activeTab === 'types'
                      ? 'Contoh: Surat Keputusan (SK)'
                      : activeTab === 'subcategories'
                      ? 'Contoh: General Procedure (GP)'
                      : activeTab === 'subsubcategories'
                      ? 'Contoh: Audit Internal (AI)'
                      : activeTab === 'divisions'
                      ? 'Contoh: Human Resources Department (HRD)'
                      : 'Contoh: Human Resources Manager (HRM)'
                  }
                  className="form-input"
                />
              </div>

              {/* Deskripsi */}
              <div className="form-group">
                <label className="form-label">Deskripsi / Ruang Lingkup Penggunaan</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Keterangan singkat maksud dan tujuan kategori/divisi/jabatan ini..."
                  className="form-textarea"
                />
              </div>

              {/* Error warning */}
              {formError && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--danger)',
                    color: '#fca5a5',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
                    border: 'none',
                    minWidth: '130px',
                  }}
                >
                  <Save size={16} />
                  <span>{modalMode === 'add' ? 'Simpan' : 'Perbarui'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
