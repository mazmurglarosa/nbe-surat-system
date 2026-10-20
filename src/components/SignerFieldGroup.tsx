import React, { useState, useEffect, useId } from 'react';
import { Sparkles, Save, Check, X, Trash2, UserCheck, ShieldCheck } from 'lucide-react';
import {
  getSignersDatabase,
  saveSignerToDatabase,
  deleteSignerFromDatabase,
  OfficialSigner,
} from '../services/signersService';

interface SignerFieldGroupProps {
  labelName: string;
  labelRole: string;
  name: string;
  role: string;
  onNameChange: (name: string) => void;
  onRoleChange: (role: string) => void;
  required?: boolean;
  namePlaceholder?: string;
  rolePlaceholder?: string;
}

export const SignerFieldGroup: React.FC<SignerFieldGroupProps> = ({
  labelName,
  labelRole,
  name,
  role,
  onNameChange,
  onRoleChange,
  required = false,
  namePlaceholder = 'Contoh: Mazmur Gusti Agung Larosa',
  rolePlaceholder = 'Contoh: Director of Finance and Internal Affairs / CFO',
}) => {
  const [signers, setSigners] = useState<OfficialSigner[]>(() => getSignersDatabase());
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const selectId = useId();

  // Muat ulang daftar pejabat jika ada pembaruan dari komponen lain
  useEffect(() => {
    const handleUpdate = () => {
      setSigners(getSignersDatabase());
    };
    window.addEventListener('nbe-signers-updated', handleUpdate);
    return () => window.removeEventListener('nbe-signers-updated', handleUpdate);
  }, []);

  // Cek apakah kombinasi nama saat ini cocok dengan salah satu pejabat di database
  const matchedSigner = signers.find(
    (s) => s.name.trim().toLowerCase() === name.trim().toLowerCase()
  );

  // Nilai aktif untuk select dropdown
  const currentSelectValue = isCustomMode
    ? '__CUSTOM__'
    : matchedSigner
    ? matchedSigner.id
    : name.trim() === ''
    ? ''
    : '__CUSTOM__';

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setIsDismissed(false);
    setSavedSuccess(false);

    if (val === '__CUSTOM__') {
      setIsCustomMode(true);
      // Biarkan nama dan jabatan tetap ada jika ingin diedit mandiri
    } else {
      setIsCustomMode(false);
      const chosen = signers.find((s) => s.id === val);
      if (chosen) {
        onNameChange(chosen.name);
        onRoleChange(chosen.role);
      }
    }
  };

  // Tangani penyimpanan ke database
  const handleSaveToDatabase = () => {
    if (!name.trim() || !role.trim()) return;
    const newOfficial = saveSignerToDatabase(name.trim(), role.trim());
    setSigners(getSignersDatabase());
    setIsCustomMode(false);
    setSavedSuccess(true);
    setIsDismissed(true);

    setTimeout(() => {
      setSavedSuccess(false);
    }, 4000);
  };

  // Hapus pejabat kustom jika user ingin menghapus dari database
  const handleDeleteCustomSigner = (e: React.MouseEvent, id: string, officialName: string) => {
    e.stopPropagation();
    if (window.confirm(`Hapus "${officialName}" dari database opsi pejabat?`)) {
      deleteSignerFromDatabase(id);
      setSigners(getSignersDatabase());
      setIsCustomMode(true);
    }
  };

  // Pejabat terdeteksi baru jika nama & role diisi, tapi tidak cocok dengan siapapun di database
  const isNewPerson =
    name.trim().length > 2 &&
    role.trim().length > 2 &&
    !signers.some(
      (s) =>
        s.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        s.role.trim().toLowerCase() === role.trim().toLowerCase()
    );

  const selectedOfficial = signers.find((s) => s.id === currentSelectValue);

  return (
    <>
      {/* Kolom 1: NAMA PEJABAT DENGAN DROPDOWN OTOMATIS */}
      <div className="form-group" style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.35rem',
            gap: '0.5rem',
          }}
        >
          <label className="form-label" style={{ marginBottom: 0 }}>
            {labelName} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
          </label>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--primary)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              background: 'rgba(2, 132, 199, 0.08)',
              padding: '1px 6px',
              borderRadius: '4px',
            }}
          >
            <UserCheck size={11} /> Auto-Fill
          </span>
        </div>

        {/* Dropdown Pejabat Resmi */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.45rem' }}>
          <select
            id={selectId}
            value={currentSelectValue}
            onChange={handleSelectChange}
            className="form-select"
            style={{
              fontWeight: 600,
              fontSize: '0.84rem',
              borderColor: matchedSigner ? 'rgba(2, 132, 199, 0.4)' : undefined,
              background: matchedSigner ? 'rgba(2, 132, 199, 0.03)' : undefined,
            }}
          >
            <option value="" disabled>
              -- Pilih Nama Pejabat --
            </option>
            <optgroup label="Pejabat Utama NBE (Default Database)">
              {signers
                .filter((s) => s.isDefault)
                .map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {idx + 1}. {s.name} ({s.role})
                  </option>
                ))}
            </optgroup>

            {signers.some((s) => !s.isDefault) && (
              <optgroup label="Pejabat Tambahan (Tersimpan)">
                {signers
                  .filter((s) => !s.isDefault)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      ⭐ {s.name} ({s.role})
                    </option>
                  ))}
              </optgroup>
            )}

            <option value="__CUSTOM__">✍️ Ketik Nama & Jabatan Baru (Kustom)...</option>
          </select>

          {/* Tombol Hapus Pejabat Kustom jika sedang dipilih */}
          {selectedOfficial && !selectedOfficial.isDefault && (
            <button
              type="button"
              onClick={(e) => handleDeleteCustomSigner(e, selectedOfficial.id, selectedOfficial.name)}
              className="btn btn-ghost btn-sm"
              title={`Hapus "${selectedOfficial.name}" dari database opsi`}
              style={{
                color: 'var(--danger)',
                padding: '0.35rem 0.5rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Input Nama Lengkap (Selalu dapat disesuaikan) */}
        <input
          type="text"
          required={required}
          value={name}
          onChange={(e) => {
            onNameChange(e.target.value);
            setIsDismissed(false);
            setSavedSuccess(false);
          }}
          placeholder={namePlaceholder}
          className="form-input"
          style={{ fontSize: '0.88rem' }}
        />
      </div>

      {/* Kolom 2: JABATAN PEJABAT (OTOMATIS MENGIKUTI) */}
      <div className="form-group" style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.35rem',
          }}
        >
          <label className="form-label" style={{ marginBottom: 0 }}>
            {labelRole}
          </label>
          {matchedSigner && (
            <span
              style={{
                fontSize: '0.7rem',
                color: '#10b981',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <ShieldCheck size={11} /> Terhubung Database
            </span>
          )}
        </div>

        {/* Input Jabatan (Terisi otomatis namun tetap bisa diketik mandiri) */}
        <input
          type="text"
          value={role}
          onChange={(e) => {
            onRoleChange(e.target.value);
            setIsDismissed(false);
            setSavedSuccess(false);
          }}
          placeholder={rolePlaceholder}
          className="form-input"
          style={{ fontSize: '0.88rem' }}
        />

        {/* Toast Sukses Tersimpan */}
        {savedSuccess && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: '0.45rem',
              fontSize: '0.75rem',
              color: '#059669',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.35rem 0.6rem',
              borderRadius: '5px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 600,
            }}
          >
            <Check size={14} color="#10b981" />
            <span>Pejabat & Jabatan berhasil direkam ke database!</span>
          </div>
        )}
      </div>

      {/* KOTAK PILIHAN KHUSUS: REKAM NAMA & JABATAN BARU KE DATABASE */}
      {isNewPerson && !isDismissed && (
        <div
          className="animate-fade-in"
          style={{
            gridColumn: '1 / -1',
            background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(56, 189, 248, 0.04) 100%)',
            border: '1px solid rgba(2, 132, 199, 0.35)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginTop: '-0.25rem',
            marginBottom: '0.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '240px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                }}
              >
                <Sparkles size={15} color="#0284c7" />
                <span>Nama & Jabatan Baru Terdeteksi</span>
              </div>
              <p
                style={{
                  margin: '0.25rem 0 0 0',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                }}
              >
                Ingin merekam <strong>"{name}"</strong> dengan jabatan <em>"{role}"</em> sebagai opsi resmi di database agar otomatis muncul di dokumen selanjutnya?
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <button
                type="button"
                onClick={handleSaveToDatabase}
                className="btn btn-primary btn-sm"
                style={{
                  fontSize: '0.76rem',
                  padding: '0.35rem 0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 600,
                }}
              >
                <Save size={13} />
                <span>Ya, Rekam ke Database</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="btn btn-ghost btn-sm"
                title="Abaikan dan gunakan hanya untuk dokumen ini"
                style={{
                  fontSize: '0.76rem',
                  padding: '0.35rem 0.65rem',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={13} />
                <span>Hanya Dokumen Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
