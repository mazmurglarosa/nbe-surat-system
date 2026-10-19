/**
 * NBE Standard Date Formatter Utility
 * Formats dates strictly as DD/MMM/YYYY
 * - DD   : 2 digits day (e.g., 01, 15, 30)
 * - MMM  : 3-letter uppercase month abbreviation (e.g., OCT, SEP, DES)
 * - YYYY : 4 digits year (e.g., 2020, 2023, 2026)
 * - /    : delimiter between day, month, and year
 */

const MONTHS_ID = [
  'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN',
  'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'
];

const MONTHS_EN = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const MONTH_NAME_MAP: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, ags: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oct: 10, oktober: 10, october: 10,
  nov: 11, nop: 11, november: 11,
  des: 12, dec: 12, desember: 12, december: 12,
};

/**
 * Parses any date format string or Date object into { day, month, year }
 */
export function parseDateParts(input?: string | Date | null): { day: number; month: number; year: number } {
  const fallback = new Date();
  const defaultParts = {
    day: fallback.getDate(),
    month: fallback.getMonth() + 1,
    year: fallback.getFullYear(),
  };

  if (!input) return defaultParts;

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return defaultParts;
    return {
      day: input.getDate(),
      month: input.getMonth() + 1,
      year: input.getFullYear(),
    };
  }

  const str = String(input).trim();
  if (!str) return defaultParts;

  // 1. Matches YYYY-MM-DD (e.g. 2026-10-19)
  const matchIso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchIso) {
    return {
      year: parseInt(matchIso[1], 10),
      month: parseInt(matchIso[2], 10),
      day: parseInt(matchIso[3], 10),
    };
  }

  // 2. Matches DD/MM/YYYY or DD-MM-YYYY (all numbers)
  const matchSlashNum = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (matchSlashNum) {
    return {
      day: parseInt(matchSlashNum[1], 10),
      month: parseInt(matchSlashNum[2], 10),
      year: parseInt(matchSlashNum[3], 10),
    };
  }

  // 3. Matches DD/MMM/YYYY or DD-MMM-YYYY (e.g. 19/OCT/2026 or 19-OKT-2026)
  const matchSlashWord = str.match(/^(\d{1,2})[/-]([a-zA-Z]{3,10})[/-](\d{4})$/);
  if (matchSlashWord) {
    const d = parseInt(matchSlashWord[1], 10);
    const mStr = matchSlashWord[2].toLowerCase();
    const y = parseInt(matchSlashWord[3], 10);
    const m = MONTH_NAME_MAP[mStr] || 10;
    return { day: d, month: m, year: y };
  }

  // 4. Matches "19 Oktober 2026" or "19 Oct 2026" or "19-Okt-2026"
  const matchSpaceWord = str.match(/^(\d{1,2})\s+([a-zA-Z]{3,10})\s+(\d{4})/);
  if (matchSpaceWord) {
    const d = parseInt(matchSpaceWord[1], 10);
    const mStr = matchSpaceWord[2].toLowerCase();
    const y = parseInt(matchSpaceWord[3], 10);
    const m = MONTH_NAME_MAP[mStr] || 10;
    return { day: d, month: m, year: y };
  }

  // 5. Fallback via new Date(str)
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return {
      day: parsed.getDate(),
      month: parsed.getMonth() + 1,
      year: parsed.getFullYear(),
    };
  }

  return defaultParts;
}

/**
 * Formats date into DD/MMM/YYYY
 * e.g. 19/OCT/2026 (EN) or 19/OKT/2026 (ID)
 */
export function formatNbeStandardDate(
  input?: string | Date | null,
  lang: 'id' | 'en' | 'bi' = 'id'
): string {
  const { day, month, year } = parseDateParts(input);
  const dd = String(day).padStart(2, '0');
  const mIndex = Math.max(0, Math.min(11, month - 1));
  const mmmList = (lang === 'en' || lang === 'bi') ? MONTHS_EN : MONTHS_ID;
  const mmm = mmmList[mIndex];
  const yyyy = String(year);

  return `${dd}/${mmm}/${yyyy}`;
}
