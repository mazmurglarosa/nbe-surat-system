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
 * Format: 0000-XXX-YYY-OOO-IX-2026
 * Example: 0001-SOP-ENG-CTO-IX-2026
 */
export function generateDocumentCode(
  seq: number,
  typeCode: string,
  divisionCode: string,
  approverCode: string,
  monthNumber: number,
  year: number
): string {
  const seqStr = formatSequence(seq);
  const romanMonth = getRomanMonth(monthNumber);
  return `${seqStr}-${typeCode.toUpperCase()}-${divisionCode.toUpperCase()}-${approverCode.toUpperCase()}-${romanMonth}-${year}`;
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
 * Should match 4 digits - Type - Division - Approver - Roman Month - 4 digit Year
 */
export function validateDocumentCode(code: string): {
  isValid: boolean;
  message?: string;
  parts?: {
    seq: number;
    type: string;
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

  // Regex pattern for 0000-XXX-YYY-OOO-IX-YYYY
  const regex = /^(\d{1,5})-([A-Za-z0-9]+)-([A-Za-z0-9]+)-([A-Za-z0-9]+)-([IVXLCDM]+)-(\d{4})$/i;
  const match = trimmed.match(regex);

  if (!match) {
    return {
      isValid: false,
      message:
        'Format kode dokumen tidak baku. Format standar: 0000-XXX-YYY-OOO-IX-YYYY (contoh: 0001-SOP-ENG-CTO-IX-2026).',
    };
  }

  const [, seqStr, type, division, approver, month, yearStr] = match;
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
