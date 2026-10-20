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
 * Ekstrak sequence number dari record dokumen.
 * Menjadikan 4-digit awal pada `doc.code` (contoh: "0026-CSMS-..." -> 26) sebagai
 * sumber kebenaran utama (ground truth), dan membandingkan dengan `doc.seqNumber`.
 */
export function extractSequenceNumber(doc: { code?: string; seqNumber?: number }): number {
  if (doc?.code) {
    const match = doc.code.trim().match(/^(\d{1,5})-/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        return Math.max(parsed, doc.seqNumber || 0);
      }
    }
  }
  return doc?.seqNumber && !isNaN(doc.seqNumber) && doc.seqNumber > 0 ? doc.seqNumber : 0;
}

/**
 * Ekstrak kategori dokumen (typeCode / XXX) dari kode surat atau record.
 * Contoh: "0026-CSMS-PE/PL-..." -> "CSMS"
 */
export function extractDocTypeCode(doc: { code?: string; typeCode?: string }): string {
  if (doc?.typeCode && doc.typeCode.trim()) {
    return doc.typeCode.trim().toUpperCase();
  }
  if (doc?.code) {
    const match = doc.code.trim().match(/^\d{1,5}-([A-Za-z0-9]+)-/);
    if (match) {
      return match[1].trim().toUpperCase();
    }
  }
  return '';
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
  const targetType = (typeCode || '').trim().toUpperCase();
  if (!targetType) return 1;

  let maxSeq = 0;
  const existingSeqs = new Set<number>();

  for (const doc of documents || []) {
    const dType = extractDocTypeCode(doc);
    if (dType === targetType) {
      const seq = extractSequenceNumber(doc);
      if (seq > 0) {
        existingSeqs.add(seq);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  let nextSeq = maxSeq + 1;
  // Pastikan nomor urut yang dihasilkan tidak pernah bertabrakan dengan dokumen yang sudah ada
  while (existingSeqs.has(nextSeq)) {
    nextSeq++;
  }

  return nextSeq;
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
