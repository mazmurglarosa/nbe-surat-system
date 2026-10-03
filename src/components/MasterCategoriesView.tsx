import React, { useState } from 'react';
import {
  CodeDefinition,
  MasterCodesState,
} from '../types';
import {
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  UserCheck,
  Search,
  X,
  Save,
  Sparkles,
  Info,
} from 'lucide-react';

interface MasterCategoriesViewProps {
  masterCodes: MasterCodesState;
  onAddDocumentType: (item: CodeDefinition) => void;
  onUpdateDocumentType: (code: string, item: Partial<CodeDefinition>) => void;
  onDeleteDocumentType: (code: string) => void;
  onAddDivision: (item: CodeDefinition) => void;
  onUpdateDivision: (code: string, item: Partial<CodeDefinition>) => void;
  onDeleteDivision: (code: string) => void;
  onAddApprover: (item: CodeDefinition) => void;
  onUpdateApprover: (code: string, item: Partial<CodeDefinition>) => void;
  onDeleteApprover: (code: string) => void;
  onResetDefaults: () => void;
}

type ActiveCategoryTab = 'types' | 'divisions' | 'approvers';

export const MasterCategoriesView: React.FC<MasterCategoriesViewProps> = ({
  masterCodes,
  onAddDocumentType,
  onUpdateDocumentType,
  onDeleteDocumentType,
  onAddDivision,
  onUpdateDivision,
  onDeleteDivision,
  onAddApprover,
  onUpdateApprover,
  onDeleteApprover,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveCategoryTab>('types');
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTargetCode, setEditingTargetCode] = useState<string>('');

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
      setFormError('Kode harus berupa 2-8 karakter huruf kapital/angka (contoh: SK, MEM, HRD, HSE).');
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
            onClick={handleReset}
            className="btn btn-secondary btn-sm"
            title="Kembalikan ke standar awal SOP"
          >
            <RotateCcw size={15} />
            <span>Reset ke Default SOP</span>
          </button>
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
                : activeTab === 'divisions'
                ? '+ Tambah Divisi Penerbit'
                : '+ Tambah Otoritas Pengesahan'}
            </span>
          </button>
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

      {/* 3 Main Tabs as defined in screenshot */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
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
            Document Type Code (contoh: SOP, WIK, MNL, KB, SK, MEMO)
          </p>
        </div>

        {/* TAB 2: Division */}
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
                2
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

        {/* TAB 3: Approver */}
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
                3
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
      </div>

      {/* Filter and Content Card */}
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
                      ? 'Contoh: SK, MEM, ND, FORM'
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
                    : 'Kode ini akan langsung digunakan pada generator nomor surat (misal: 0001-SK-GNR-CEO-X-2026).'}
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
