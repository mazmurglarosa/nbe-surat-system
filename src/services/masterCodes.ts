import { CodeDefinition, MasterCodesState, DOCUMENT_TYPES, DIVISIONS, APPROVERS } from '../types';

const MASTER_CODES_STORAGE_KEY = 'nbe_master_codes_v1';

export const DEFAULT_MASTER_CODES: MasterCodesState = {
  documentTypes: DOCUMENT_TYPES.map((d) => ({ ...d, isCustom: false })),
  divisions: DIVISIONS.map((d) => ({ ...d, isCustom: false })),
  approvers: APPROVERS.map((d) => ({ ...d, isCustom: false })),
};

/**
 * Get all master codes from localStorage or defaults
 */
export function getMasterCodes(): MasterCodesState {
  try {
    const raw = localStorage.getItem(MASTER_CODES_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_MASTER_CODES;
    }
    const parsed = JSON.parse(raw);
    return {
      documentTypes: Array.isArray(parsed.documentTypes) && parsed.documentTypes.length > 0
        ? parsed.documentTypes
        : DEFAULT_MASTER_CODES.documentTypes,
      divisions: Array.isArray(parsed.divisions) && parsed.divisions.length > 0
        ? parsed.divisions
        : DEFAULT_MASTER_CODES.divisions,
      approvers: Array.isArray(parsed.approvers) && parsed.approvers.length > 0
        ? parsed.approvers
        : DEFAULT_MASTER_CODES.approvers,
    };
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
    localStorage.setItem(MASTER_CODES_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save master codes to localStorage:', err);
  }
  return state;
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
  const updated: MasterCodesState = {
    ...current,
    approvers: current.approvers.filter(
      (a) => a.code.toUpperCase() !== targetCode.toUpperCase()
    ),
  };
  return saveMasterCodes(updated);
}

/**
 * Reset all master codes to standard SOP defaults
 */
export function resetMasterCodesToDefaults(): MasterCodesState {
  return saveMasterCodes(DEFAULT_MASTER_CODES);
}
