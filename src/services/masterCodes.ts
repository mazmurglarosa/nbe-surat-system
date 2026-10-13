import { CodeDefinition, MasterCodesState, DOCUMENT_TYPES, SUB_CATEGORIES, SUB_SUB_CATEGORIES, DIVISIONS, APPROVERS } from '../types';

const MASTER_CODES_STORAGE_KEY = 'nbe_master_codes_v1';

export const DEFAULT_MASTER_CODES: MasterCodesState = {
  documentTypes: DOCUMENT_TYPES.map((d) => ({ ...d, isCustom: false })),
  subCategories: SUB_CATEGORIES.map((s) => ({ ...s, isCustom: false })),
  subSubCategories: SUB_SUB_CATEGORIES.map((s) => ({ ...s, isCustom: false })),
  divisions: DIVISIONS.map((d) => ({ ...d, isCustom: false })),
  approvers: APPROVERS.map((d) => ({ ...d, isCustom: false })),
};

/**
 * Normalisasi data MasterCodes agar menjamin semua kategori bawaan (termasuk sub-sub kategori AA)
 * selalu ada dan lengkap, baik yang datang dari cloud maupun localStorage.
 */
export function normalizeMasterCodes(raw: any): MasterCodesState {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_MASTER_CODES;
  }

  // 1. Document Types
  const storedDocTypes: CodeDefinition[] =
    Array.isArray(raw.documentTypes) && raw.documentTypes.length > 0
      ? raw.documentTypes
      : DEFAULT_MASTER_CODES.documentTypes;
  const existingTypeCodes = new Set(storedDocTypes.map((dt) => dt.code.toUpperCase()));
  const mergedDocTypes = [...storedDocTypes];
  DEFAULT_MASTER_CODES.documentTypes.forEach((defType) => {
    if (!existingTypeCodes.has(defType.code.toUpperCase())) {
      mergedDocTypes.push(defType);
      existingTypeCodes.add(defType.code.toUpperCase());
    }
  });

  // 2. Sub Categories (ZZ)
  const storedSubCats: CodeDefinition[] =
    Array.isArray(raw.subCategories) && raw.subCategories.length > 0
      ? raw.subCategories
      : DEFAULT_MASTER_CODES.subCategories;
  const existingSubCodes = new Set(storedSubCats.map((sc) => sc.code.toUpperCase()));
  const mergedSubCats = [...storedSubCats];
  DEFAULT_MASTER_CODES.subCategories.forEach((defSub) => {
    if (!existingSubCodes.has(defSub.code.toUpperCase())) {
      mergedSubCats.push(defSub);
      existingSubCodes.add(defSub.code.toUpperCase());
    }
  });

  // 3. Sub-sub Categories (AA)
  const storedSubSubCats: CodeDefinition[] =
    Array.isArray(raw.subSubCategories) && raw.subSubCategories.length > 0
      ? raw.subSubCategories
      : DEFAULT_MASTER_CODES.subSubCategories;
  const existingSubSubCodes = new Set(storedSubSubCats.map((ssc) => ssc.code.toUpperCase()));
  const mergedSubSubCats = [...storedSubSubCats];
  DEFAULT_MASTER_CODES.subSubCategories.forEach((defSubSub) => {
    if (!existingSubSubCodes.has(defSubSub.code.toUpperCase())) {
      mergedSubSubCats.push(defSubSub);
      existingSubSubCodes.add(defSubSub.code.toUpperCase());
    }
  });

  // 4. Divisions
  const storedDivisions: CodeDefinition[] =
    Array.isArray(raw.divisions) && raw.divisions.length > 0
      ? raw.divisions
      : DEFAULT_MASTER_CODES.divisions;
  const existingDivCodes = new Set(storedDivisions.map((d) => d.code.toUpperCase()));
  const mergedDivisions = [...storedDivisions];
  DEFAULT_MASTER_CODES.divisions.forEach((defDiv) => {
    if (!existingDivCodes.has(defDiv.code.toUpperCase())) {
      mergedDivisions.push(defDiv);
      existingDivCodes.add(defDiv.code.toUpperCase());
    }
  });

  // 5. Approvers
  const storedApprovers: CodeDefinition[] =
    Array.isArray(raw.approvers) && raw.approvers.length > 0
      ? raw.approvers
      : DEFAULT_MASTER_CODES.approvers;
  const existingAppCodes = new Set(storedApprovers.map((a) => a.code.toUpperCase()));
  const mergedApprovers = [...storedApprovers];
  DEFAULT_MASTER_CODES.approvers.forEach((defApp) => {
    if (!existingAppCodes.has(defApp.code.toUpperCase())) {
      mergedApprovers.push(defApp);
      existingAppCodes.add(defApp.code.toUpperCase());
    }
  });

  return {
    documentTypes: mergedDocTypes,
    subCategories: mergedSubCats,
    subSubCategories: mergedSubSubCats,
    divisions: mergedDivisions,
    approvers: mergedApprovers,
  };
}

const DELETED_CODES_STORAGE_KEY = 'nbe_deleted_codes_v1';

export function getDeletedCodes(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CODES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map((s: string) => String(s).toUpperCase()) : []);
  } catch {
    return new Set();
  }
}

export function markCodeAsDeleted(code: string) {
  try {
    const current = getDeletedCodes();
    current.add(code.trim().toUpperCase());
    localStorage.setItem(DELETED_CODES_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn(e);
  }
}

export function unmarkCodeAsDeleted(code: string) {
  try {
    const current = getDeletedCodes();
    current.delete(code.trim().toUpperCase());
    localStorage.setItem(DELETED_CODES_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn(e);
  }
}

export function clearDeletedCodes() {
  try {
    localStorage.removeItem(DELETED_CODES_STORAGE_KEY);
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Menggabungkan master codes dari cloud dengan data lokal yang ada di browser.
 * Menjamin bahwa kode kustom/baru yang dibuat di browser TIDAK PERNAH terhapus oleh cloud.
 */
export function mergeMasterCodes(
  local: MasterCodesState,
  incoming: any
): { merged: MasterCodesState; hasNewLocalCodes: boolean } {
  const normLocal = normalizeMasterCodes(local);
  const normIncoming = normalizeMasterCodes(incoming);
  const deletedCodes = getDeletedCodes();

  let hasNewLocalCodes = false;

  const mergeArray = (
    localArr: CodeDefinition[],
    incomingArr: CodeDefinition[],
    defaultArr: CodeDefinition[]
  ): CodeDefinition[] => {
    const map = new Map<string, CodeDefinition>();

    // 1. Masukkan default SOP codes
    defaultArr.forEach((d) => map.set(d.code.toUpperCase(), d));

    // 2. Masukkan incoming codes dari cloud (kecuali yang pernah ditandai dihapus oleh user)
    incomingArr.forEach((i) => {
      const k = i.code.toUpperCase();
      if (!deletedCodes.has(k)) {
        map.set(k, i);
      }
    });

    // 3. Masukkan local codes (menjamin kode baru yang baru dibuat user tidak tertimpa cloud)
    localArr.forEach((l) => {
      const k = l.code.toUpperCase();
      if (!deletedCodes.has(k)) {
        if (!map.has(k)) {
          map.set(k, l);
          hasNewLocalCodes = true;
        } else {
          // Jika lokal adalah custom, pastikan status custom dan label terbarunya tetap terjaga
          const exist = map.get(k)!;
          if (l.isCustom) {
            map.set(k, { ...exist, ...l });
          }
        }
      }
    });

    return Array.from(map.values());
  };

  const merged: MasterCodesState = {
    documentTypes: mergeArray(
      normLocal.documentTypes,
      normIncoming.documentTypes,
      DEFAULT_MASTER_CODES.documentTypes
    ),
    subCategories: mergeArray(
      normLocal.subCategories,
      normIncoming.subCategories,
      DEFAULT_MASTER_CODES.subCategories
    ),
    subSubCategories: mergeArray(
      normLocal.subSubCategories,
      normIncoming.subSubCategories,
      DEFAULT_MASTER_CODES.subSubCategories
    ),
    divisions: mergeArray(
      normLocal.divisions,
      normIncoming.divisions,
      DEFAULT_MASTER_CODES.divisions
    ),
    approvers: mergeArray(
      normLocal.approvers,
      normIncoming.approvers,
      DEFAULT_MASTER_CODES.approvers
    ),
  };

  return { merged, hasNewLocalCodes };
}

/**
 * Get all master codes from localStorage or defaults
 */
export function getMasterCodes(): MasterCodesState {
  try {
    const raw = localStorage.getItem(MASTER_CODES_STORAGE_KEY);
    if (!raw) {
      saveMasterCodes(DEFAULT_MASTER_CODES);
      return DEFAULT_MASTER_CODES;
    }
    const parsed = JSON.parse(raw);
    const normalized = normalizeMasterCodes(parsed);
    // Jika ada properti baru yang dinormalisasi (seperti subSubCategories), simpan balik ke localStorage
    if (!parsed.subSubCategories || parsed.subSubCategories.length === 0) {
      saveMasterCodes(normalized);
    }
    return normalized;
  } catch (err) {
    console.error('Failed to load master codes from localStorage:', err);
    return DEFAULT_MASTER_CODES;
  }
}

/**
 * Save master codes to localStorage
 */
export function saveMasterCodes(state: MasterCodesState): MasterCodesState {
  try {
    const normalized = normalizeMasterCodes(state);
    localStorage.setItem(MASTER_CODES_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (err) {
    console.error('Failed to save master codes to localStorage:', err);
    return state;
  }
}

/**
 * Add a new Document Type
 */
export function addDocumentType(newItem: CodeDefinition): MasterCodesState {
  const current = getMasterCodes();
  const cleanCode = newItem.code.trim().toUpperCase();

  // Check if code already exists
  if (current.documentTypes.some((dt) => dt.code.toUpperCase() === cleanCode)) {
    throw new Error(`Kode kategori "${cleanCode}" sudah digunakan.`);
  }

  unmarkCodeAsDeleted(cleanCode);
  const updated: MasterCodesState = {
    ...current,
    documentTypes: [
      ...current.documentTypes,
      {
        code: cleanCode,
        label: newItem.label.trim(),
        description: newItem.description.trim(),
        isCustom: true,
      },
    ],
  };

  return saveMasterCodes(updated);
}

/**
 * Update existing Document Type
 */
export function updateDocumentType(
  targetCode: string,
  updatedFields: Partial<CodeDefinition>
): MasterCodesState {
  const current = getMasterCodes();
  const updated: MasterCodesState = {
    ...current,
    documentTypes: current.documentTypes.map((dt) => {
      if (dt.code.toUpperCase() === targetCode.toUpperCase()) {
        return {
          ...dt,
          ...updatedFields,
          code: updatedFields.code ? updatedFields.code.trim().toUpperCase() : dt.code,
        };
      }
      return dt;
    }),
  };
  return saveMasterCodes(updated);
}

/**
 * Delete Document Type
 */
export function deleteDocumentType(targetCode: string): MasterCodesState {
  const current = getMasterCodes();
  if (current.documentTypes.length <= 1) {
    throw new Error('Minimal harus ada 1 Kategori Surat tersisa dalam sistem.');
  }
  markCodeAsDeleted(targetCode);
  const updated: MasterCodesState = {
    ...current,
    documentTypes: current.documentTypes.filter(
      (dt) => dt.code.toUpperCase() !== targetCode.toUpperCase()
    ),
  };
  return saveMasterCodes(updated);
}

/**
 * Add a new Division
 */
export function addDivision(newItem: CodeDefinition): MasterCodesState {
  const current = getMasterCodes();
  const cleanCode = newItem.code.trim().toUpperCase();

  if (current.divisions.some((d) => d.code.toUpperCase() === cleanCode)) {
    throw new Error(`Kode divisi "${cleanCode}" sudah digunakan.`);
  }

  unmarkCodeAsDeleted(cleanCode);
  const updated: MasterCodesState = {
    ...current,
    divisions: [
      ...current.divisions,
      {
        code: cleanCode,
        label: newItem.label.trim(),
        description: newItem.description.trim(),
        isCustom: true,
      },
    ],
  };

  return saveMasterCodes(updated);
}

/**
 * Update existing Division
 */
export function updateDivision(
  targetCode: string,
  updatedFields: Partial<CodeDefinition>
): MasterCodesState {
  const current = getMasterCodes();
  const updated: MasterCodesState = {
    ...current,
    divisions: current.divisions.map((d) => {
      if (d.code.toUpperCase() === targetCode.toUpperCase()) {
        return {
          ...d,
          ...updatedFields,
          code: updatedFields.code ? updatedFields.code.trim().toUpperCase() : d.code,
        };
      }
      return d;
    }),
  };
  return saveMasterCodes(updated);
}

/**
 * Delete Division
 */
export function deleteDivision(targetCode: string): MasterCodesState {
  const current = getMasterCodes();
  if (current.divisions.length <= 1) {
    throw new Error('Minimal harus ada 1 Divisi Penerbit tersisa dalam sistem.');
  }
  markCodeAsDeleted(targetCode);
  const updated: MasterCodesState = {
    ...current,
    divisions: current.divisions.filter(
      (d) => d.code.toUpperCase() !== targetCode.toUpperCase()
    ),
  };
  return saveMasterCodes(updated);
}

/**
 * Add a new Approver
 */
export function addApprover(newItem: CodeDefinition): MasterCodesState {
  const current = getMasterCodes();
  const cleanCode = newItem.code.trim().toUpperCase();

  if (current.approvers.some((a) => a.code.toUpperCase() === cleanCode)) {
    throw new Error(`Kode otoritas/jabatan "${cleanCode}" sudah digunakan.`);
  }

  unmarkCodeAsDeleted(cleanCode);
  const updated: MasterCodesState = {
    ...current,
    approvers: [
      ...current.approvers,
      {
        code: cleanCode,
        label: newItem.label.trim(),
        description: newItem.description.trim(),
        isCustom: true,
      },
    ],
  };

  return saveMasterCodes(updated);
}

/**
 * Update existing Approver
 */
export function updateApprover(
  targetCode: string,
  updatedFields: Partial<CodeDefinition>
): MasterCodesState {
  const current = getMasterCodes();
  const updated: MasterCodesState = {
    ...current,
    approvers: current.approvers.map((a) => {
      if (a.code.toUpperCase() === targetCode.toUpperCase()) {
        return {
          ...a,
          ...updatedFields,
          code: updatedFields.code ? updatedFields.code.trim().toUpperCase() : a.code,
        };
      }
      return a;
    }),
  };
  return saveMasterCodes(updated);
}

/**
 * Delete Approver
 */
export function deleteApprover(targetCode: string): MasterCodesState {
  const current = getMasterCodes();
  if (current.approvers.length <= 1) {
    throw new Error('Minimal harus ada 1 Otoritas Pengesahan tersisa dalam sistem.');
  }
  markCodeAsDeleted(targetCode);
  const updated: MasterCodesState = {
    ...current,
    approvers: current.approvers.filter(
      (a) => a.code.toUpperCase() !== targetCode.toUpperCase()
    ),
  };
  return saveMasterCodes(updated);
}

/**
 * Add a new Sub Category (Kode ZZ)
 */
export function addSubCategory(newItem: CodeDefinition): MasterCodesState {
  const current = getMasterCodes();
  const cleanCode = newItem.code.trim().toUpperCase();

  if (current.subCategories.some((s) => s.code.toUpperCase() === cleanCode)) {
    throw new Error(`Kode sub-kategori "${cleanCode}" sudah digunakan.`);
  }

  unmarkCodeAsDeleted(cleanCode);
  const updated: MasterCodesState = {
    ...current,
    subCategories: [
      ...current.subCategories,
      {
        code: cleanCode,
        label: newItem.label.trim(),
        description: newItem.description.trim(),
        isCustom: true,
      },
    ],
  };

  return saveMasterCodes(updated);
}

/**
 * Update existing Sub Category
 */
export function updateSubCategory(
  targetCode: string,
  updatedFields: Partial<CodeDefinition>
): MasterCodesState {
  const current = getMasterCodes();
  const updated: MasterCodesState = {
    ...current,
    subCategories: current.subCategories.map((s) => {
      if (s.code.toUpperCase() === targetCode.toUpperCase()) {
        return {
          ...s,
          ...updatedFields,
          code: updatedFields.code ? updatedFields.code.trim().toUpperCase() : s.code,
        };
      }
      return s;
    }),
  };
  return saveMasterCodes(updated);
}

/**
 * Delete Sub Category
 */
export function deleteSubCategory(targetCode: string): MasterCodesState {
  const current = getMasterCodes();
  if (current.subCategories.length <= 1) {
    throw new Error('Minimal harus ada 1 Sub-Kategori Surat tersisa dalam sistem.');
  }
  markCodeAsDeleted(targetCode);
  const updated: MasterCodesState = {
    ...current,
    subCategories: current.subCategories.filter(
      (s) => s.code.toUpperCase() !== targetCode.toUpperCase()
    ),
  };
  return saveMasterCodes(updated);
}

/**
 * Add a new Sub-sub Category (Kode AA)
 */
export function addSubSubCategory(newItem: CodeDefinition): MasterCodesState {
  const current = getMasterCodes();
  const cleanCode = newItem.code.trim().toUpperCase();

  if (current.subSubCategories.some((s) => s.code.toUpperCase() === cleanCode)) {
    throw new Error(`Kode sub-sub kategori "${cleanCode}" sudah digunakan.`);
  }

  unmarkCodeAsDeleted(cleanCode);
  const updated: MasterCodesState = {
    ...current,
    subSubCategories: [
      ...current.subSubCategories,
      {
        code: cleanCode,
        label: newItem.label.trim(),
        description: newItem.description.trim(),
        isCustom: true,
      },
    ],
  };

  return saveMasterCodes(updated);
}

/**
 * Update existing Sub-sub Category
 */
export function updateSubSubCategory(
  targetCode: string,
  updatedFields: Partial<CodeDefinition>
): MasterCodesState {
  const current = getMasterCodes();
  const updated: MasterCodesState = {
    ...current,
    subSubCategories: current.subSubCategories.map((s) => {
      if (s.code.toUpperCase() === targetCode.toUpperCase()) {
        return {
          ...s,
          ...updatedFields,
          code: updatedFields.code ? updatedFields.code.trim().toUpperCase() : s.code,
        };
      }
      return s;
    }),
  };
  return saveMasterCodes(updated);
}

/**
 * Delete Sub-sub Category
 */
export function deleteSubSubCategory(targetCode: string): MasterCodesState {
  const current = getMasterCodes();
  if (current.subSubCategories.length <= 1) {
    throw new Error('Minimal harus ada 1 Sub-sub Kategori Surat tersisa dalam sistem.');
  }
  markCodeAsDeleted(targetCode);
  const updated: MasterCodesState = {
    ...current,
    subSubCategories: current.subSubCategories.filter(
      (s) => s.code.toUpperCase() !== targetCode.toUpperCase()
    ),
  };
  return saveMasterCodes(updated);
}

/**
 * Reset all master codes to standard SOP defaults
 */
export function resetMasterCodesToDefaults(): MasterCodesState {
  clearDeletedCodes();
  return saveMasterCodes(DEFAULT_MASTER_CODES);
}

