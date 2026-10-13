import { ROMAN_MONTHS, DocumentRecord } from '../types';

/**
 * Convert month number (1-12) to Roman numeral
 */
export function getRomanMonth(monthNumber: number): string {
  return ROMAN_MONTHS[monthNumber] || 'I';
}

/**
 * Format sequence number to 4 digits (e.g. 1 -> "0001")
 */
export function formatSequence(seq: number): string {
  return String(seq).padStart(4, '0');
}

/**
 * Calculate the next sequential number for a specific document type.
 * Based on NBE Procedure 4.2:
 * "0000: Sequential number of the document, per document type (XXX)"
 */
export function getNextSequenceNumber(
  documents: DocumentRecord[],
  typeCode: string
): number {
  const filtered = documents.filter(
    (doc) => doc.typeCode.toUpperCase() === typeCode.toUpperCase()
  );

  if (filtered.length === 0) {
    return 1;
  }

  const maxSeq = filtered.reduce((max, doc) => {
    return Math.max(max, doc.seqNumber || 0);
  }, 0);

  return maxSeq + 1;
}

/**
 * Generate full standard document code:
 * Format baru: 0000-XXX-ZZ/AA-YYY-OOO-IX-2026 (dengan Sub-Kategori ZZ & Sub-sub Kategori AA)
 * Format variasi: 0000-XXX-ZZ-YYY-OOO-IX-2026 (hanya Sub-Kategori ZZ)
 * Format lama (fallback): 0000-XXX-YYY-OOO-IX-2026
 * Example: 0001-CSMS-GP/AI-FNC-CFO-IX-2026
 */
export function generateDocumentCode(
  seq: number,
  typeCode: string,
  subCategoryCode: string | undefined,
  subSubCategoryCode: string | undefined,
  divisionCode: string,
  approverCode: string,
  monthNumber: number,
  year: number
): string {
  const seqStr = formatSequence(seq);
  const romanMonth = getRomanMonth(monthNumber);

  const cleanZZ = subCategoryCode?.trim().toUpperCase();
  const cleanAA = subSubCategoryCode?.trim().toUpperCase();

  let subPart = '';
  if (cleanZZ && cleanAA) {
    subPart = `${cleanZZ}/${cleanAA}-`;
  } else if (cleanZZ) {
    subPart = `${cleanZZ}-`;
  } else if (cleanAA) {
    subPart = `${cleanAA}-`;
  }

  return `${seqStr}-${typeCode.toUpperCase()}-${subPart}${divisionCode.toUpperCase()}-${approverCode.toUpperCase()}-${romanMonth}-${year}`;
}

/**
 * Check if a document code already exists in the database.
 * Requirement: 1 kode surat HANYA berlaku untuk 1 dokumen saja, tidak boleh lebih.
 */
export function isCodeDuplicate(
  code: string,
  documents: DocumentRecord[],
  currentDocumentId?: string
): boolean {
  const normalized = code.trim().toUpperCase();
  return documents.some(
    (doc) =>
      doc.code.trim().toUpperCase() === normalized &&
      (!currentDocumentId || doc.id !== currentDocumentId)
  );
}

/**
 * Validate document code format:
 * Mendukung format baru dengan Sub-sub Kategori: 0000-XXX-ZZ/AA-YYY-OOO-IX-YYYY (contoh: 0001-CSMS-GP/AI-FNC-CFO-IX-2026)
 * Mendukung format 7 bagian: 0000-XXX-ZZ-YYY-OOO-IX-YYYY
 * Serta backward-compatible format lama 6 bagian: 0000-XXX-YYY-OOO-IX-YYYY
 */
export function validateDocumentCode(code: string): {
  isValid: boolean;
  message?: string;
  parts?: {
    seq: number;
    type: string;
    subCategory?: string;
    subSubCategory?: string;
    division: string;
    approver: string;
    month: string;
    year: number;
  };
} {
  const trimmed = code.trim();
  if (!trimmed) {
    return { isValid: false, message: 'Kode dokumen tidak boleh kosong.' };
  }

  // 1. Regex pattern baru dengan ZZ/AA: 0000-XXX-ZZ/AA-YYY-OOO-IX-YYYY
  const regexSlash = /^(\d{1,5})-([A-Za-z0-9]+)-([A-Za-z0-9]+)\/([A-Za-z0-9]+)-([A-Za-z0-9]+)-([A-Za-z0-9]+)-([IVXLCDM]+)-(\d{4})$/i;
  const matchSlash = trimmed.match(regexSlash);
  if (matchSlash) {
    const [, seqStr, type, subCategory, subSubCategory, division, approver, month, yearStr] = matchSlash;
    return {
      isValid: true,
      parts: {
        seq: parseInt(seqStr, 10),
        type: type.toUpperCase(),
        subCategory: subCategory.toUpperCase(),
        subSubCategory: subSubCategory.toUpperCase(),
        division: division.toUpperCase(),
        approver: approver.toUpperCase(),
        month: month.toUpperCase(),
        year: parseInt(yearStr, 10),
      },
    };
  }

  // 2. Regex pattern 7 bagian: 0000-XXX-ZZ-YYY-OOO-IX-YYYY
  const regex7 = /^(\d{1,5})-([A-Za-z0-9]+)-([A-Za-z0-9]+)-([A-Za-z0-9]+)-([A-Za-z0-9]+)-([IVXLCDM]+)-(\d{4})$/i;
  const match7 = trimmed.match(regex7);
  if (match7) {
    const [, seqStr, type, subCategory, division, approver, month, yearStr] = match7;
    return {
      isValid: true,
      parts: {
        seq: parseInt(seqStr, 10),
        type: type.toUpperCase(),
        subCategory: subCategory.toUpperCase(),
        division: division.toUpperCase(),
        approver: approver.toUpperCase(),
        month: month.toUpperCase(),
        year: parseInt(yearStr, 10),
      },
    };
  }

  // 3. Regex pattern 6 bagian (format lama tanpa ZZ): 0000-XXX-YYY-OOO-IX-YYYY
  const regex6 = /^(\d{1,5})-([A-Za-z0-9]+)-([A-Za-z0-9]+)-([A-Za-z0-9]+)-([IVXLCDM]+)-(\d{4})$/i;
  const match6 = trimmed.match(regex6);
  if (match6) {
    const [, seqStr, type, division, approver, month, yearStr] = match6;
    return {
      isValid: true,
      parts: {
        seq: parseInt(seqStr, 10),
        type: type.toUpperCase(),
        division: division.toUpperCase(),
        approver: approver.toUpperCase(),
        month: month.toUpperCase(),
        year: parseInt(yearStr, 10),
      },
    };
  }

  return {
    isValid: false,
    message:
      'Format kode dokumen tidak baku. Format standar: 0000-XXX-ZZ/AA-YYY-OOO-IX-YYYY (contoh: 0001-CSMS-GP/AI-FNC-CFO-IX-2026).',
  };
}
