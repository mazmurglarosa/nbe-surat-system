export interface OfficialSigner {
  id: string;
  name: string;
  role: string;
  isDefault?: boolean;
}

export const DEFAULT_OFFICIAL_SIGNERS: OfficialSigner[] = [
  {
    id: 'bima-satryo',
    name: 'Bima Satryo Hartanto',
    role: 'President Director / CEO',
    isDefault: true,
  },
  {
    id: 'mazmur-larosa',
    name: 'Mazmur Gusti Agung Larosa',
    role: 'Director of Finance and Internal Affairs / CFO',
    isDefault: true,
  },
  {
    id: 'dennis-raditya',
    name: 'Dennis Raditya',
    role: 'Director of Operations & Technology / COO',
    isDefault: true,
  },
  {
    id: 'abdul-qodir',
    name: 'Abdul Qodir Al Jailani',
    role: 'Commissioner / IMS Team Lead / COM',
    isDefault: true,
  },
];

const SIGNERS_STORAGE_KEY = 'nbe_official_signers_database_v1';

/**
 * Memuat daftar seluruh pejabat resmi (Default 4 Pejabat + Pejabat Tambahan dari LocalStorage)
 */
export function getSignersDatabase(): OfficialSigner[] {
  try {
    const raw = localStorage.getItem(SIGNERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SIGNERS_STORAGE_KEY, JSON.stringify(DEFAULT_OFFICIAL_SIGNERS));
      return [...DEFAULT_OFFICIAL_SIGNERS];
    }
    const parsed = JSON.parse(raw) as OfficialSigner[];
    
    // Pastikan 4 default selalu ada dan up-to-date
    const result: OfficialSigner[] = [...DEFAULT_OFFICIAL_SIGNERS];
    
    for (const item of parsed) {
      // Jika bukan default dan belum ada di result
      const exists = result.some(
        (def) => def.name.trim().toLowerCase() === item.name.trim().toLowerCase()
      );
      if (!exists && item.name && item.role) {
        result.push({
          ...item,
          isDefault: false,
        });
      }
    }
    return result;
  } catch (err) {
    console.error('Gagal membaca database pejabat:', err);
    return [...DEFAULT_OFFICIAL_SIGNERS];
  }
}

/**
 * Menyimpan nama dan jabatan baru ke database pejabat
 */
export function saveSignerToDatabase(name: string, role: string): OfficialSigner {
  const current = getSignersDatabase();
  const trimmedName = name.trim();
  const trimmedRole = role.trim();

  const existingIdx = current.findIndex(
    (s) => s.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  let targetSigner: OfficialSigner;

  if (existingIdx >= 0) {
    targetSigner = {
      ...current[existingIdx],
      name: trimmedName,
      role: trimmedRole,
    };
    current[existingIdx] = targetSigner;
  } else {
    targetSigner = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      role: trimmedRole,
      isDefault: false,
    };
    current.push(targetSigner);
  }

  try {
    localStorage.setItem(SIGNERS_STORAGE_KEY, JSON.stringify(current));
    // Notifikasi ke seluruh komponen yang mendengarkan
    window.dispatchEvent(new CustomEvent('nbe-signers-updated', { detail: targetSigner }));
  } catch (err) {
    console.error('Gagal menyimpan pejabat ke database:', err);
  }

  return targetSigner;
}

/**
 * Menghapus pejabat kustom dari database
 */
export function deleteSignerFromDatabase(id: string): void {
  const current = getSignersDatabase();
  const filtered = current.filter((s) => s.id !== id || s.isDefault);
  try {
    localStorage.setItem(SIGNERS_STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('nbe-signers-updated'));
  } catch (err) {
    console.error('Gagal menghapus pejabat dari database:', err);
  }
}

/**
 * Cari pejabat berdasarkan nama lengkap
 */
export function findSignerByName(name: string): OfficialSigner | undefined {
  if (!name) return undefined;
  const list = getSignersDatabase();
  return list.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
}

/**
 * Cek apakah nama dan jabatan sudah ada di database pejabat
 */
export function isSignerInDatabase(name: string, role?: string): boolean {
  if (!name || !name.trim()) return false;
  const signer = findSignerByName(name);
  if (!signer) return false;
  if (!role || !role.trim()) return true;
  return signer.role.trim().toLowerCase() === role.trim().toLowerCase();
}
