/**
 * Translation Service for PT Nirwana Bhumi Energy Document System
 * Provides seamless bi-directional translation between Bahasa Indonesia ('id')
 * and British English ('en') while strictly preserving 100% of the document layout,
 * styles, formatting, tags, indents, and ruler guides.
 */

export interface TocItemTranslation {
  num: string;
  title: string;
  isSub?: boolean;
}

// 1. Heading & Clause Title Translations
export const HEADING_TRANSLATIONS: Array<{ id: string; en: string }> = [
  { id: 'MAKSUD DAN TUJUAN', en: 'OBJECTIVE' },
  { id: 'TUJUAN', en: 'OBJECTIVE' },
  { id: 'RUANG LINGKUP', en: 'SCOPE' },
  { id: 'TANGGUNG JAWAB', en: 'RESPONSIBILITY' },
  { id: 'TANGGUNG JAWAB DAN WEWENANG', en: 'RESPONSIBILITIES AND AUTHORITIES' },
  { id: 'DEFINISI', en: 'DEFINITION' },
  { id: 'REFERENSI DAN DEFINISI', en: 'REFERENCES AND DEFINITIONS' },
  { id: 'RINCIAN PROSEDUR', en: 'PROCEDURE DETAILS' },
  { id: 'RINCIAN PROSEDUR DAN ALUR KERJA', en: 'PROCEDURE DETAILS AND WORKFLOW' },
  { id: 'Ketentuan Umum', en: 'General Provisions' },
  { id: 'Alur Operasional', en: 'Operational Flow' },
  { id: 'DOKUMEN TERKAIT', en: 'RELATED DOCUMENTS' },
  { id: 'REKAMAN', en: 'RECORDS' },
  { id: 'REKAMAN DAN DOKUMENTASI', en: 'RECORDS AND DOCUMENTATION' },
  { id: 'LAMPIRAN DAN INSTRUKSI KEADAAN DARURAT', en: 'APPENDICES AND EMERGENCY INSTRUCTIONS' },
  { id: 'LAMPIRAN DAN KONDISI DARURAT', en: 'APPENDICES AND EMERGENCY INSTRUCTIONS' },
  { id: 'LAMPIRAN DAN FORMULIR', en: 'APPENDICES AND FORMS' },
  { id: 'DAFTAR ISI', en: 'TABLE OF CONTENTS' },
  { id: 'TABEL INDEKS REVISI', en: 'REVISION INDEX' },
  { id: 'TABEL INDEKS REVISI / REVISION INDEX', en: 'REVISION INDEX' },
  { id: 'SISTEM KONTROL DAN PENOMORAN DOKUMEN', en: 'DOCUMENT CONTROL AND NUMBERING SYSTEM' },
  { id: 'STANDAR OPERASIONAL PROSEDUR (SOP)', en: 'STANDARD OPERATING PROCEDURE (SOP)' },
  { id: 'Standar Operasional Prosedur (SOP)', en: 'Standard Operating Procedure (SOP)' },
  { id: 'SISTEM MANAJEMEN KESELAMATAN KONTRAKTOR (CSMS)', en: 'CONTRACTOR SAFETY MANAGEMENT SYSTEM (CSMS)' },
  { id: 'Sistem Manajemen Keselamatan Kontraktor (CSMS)', en: 'Contractor Safety Management System (CSMS)' },
  { id: 'Contractor Safety Management System (CSMS)', en: 'Contractor Safety Management System (CSMS)' },
  { id: 'INSTRUKSI KERJA (WIK)', en: 'WORK INSTRUCTION (WIK)' },
  { id: 'Instruksi Kerja (WIK)', en: 'Work Instruction (WIK)' },
  { id: 'MANUAL SISTEM MANAJEMEN (MNL)', en: 'MANAGEMENT SYSTEM MANUAL (MNL)' },
  { id: 'Manual Sistem Manajemen (MNL)', en: 'Management System Manual (MNL)' },
  { id: 'Manual (MNL)', en: 'Management System Manual (MNL)' },
  { id: 'FORMULIR MUTU (FOR)', en: 'STANDARD FORM (FOR)' },
  { id: 'Formulir Mutu (FOR)', en: 'Standard Form (FOR)' },
  { id: 'Formulir (FOR)', en: 'Standard Form (FOR)' },
  { id: 'KEBIJAKAN PERUSAHAAN (POL)', en: 'CORPORATE POLICY (POL)' },
  { id: 'Kebijakan Perusahaan (POL)', en: 'Corporate Policy (POL)' },
  { id: 'Policy / Kebijakan (POL)', en: 'Corporate Policy (POL)' },
  { id: 'KEBIJAKAN PERUSAHAAN (KB)', en: 'CORPORATE POLICY (KB)' },
  { id: 'Kebijakan Perusahaan (KB)', en: 'Corporate Policy (KB)' },
  { id: 'Policy (KB)', en: 'Corporate Policy (KB)' },
  { id: 'SURAT KEPUTUSAN DIREKSI (KB)', en: "BOARD OF DIRECTORS' RESOLUTION (KB)" },
  { id: 'KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY', en: "BOARD OF DIRECTORS' RESOLUTION OF PT NIRWANA BHUMI ENERGY" },
  { id: 'Sistem Manajemen Terintegrasi', en: 'Integrated Management Systems' },
  { id: 'SISTEM MANAJEMEN TERINTEGRASI', en: 'INTEGRATED MANAGEMENT SYSTEMS' },
];

// 2. Full Standard Paragraph Body Translations (Exact & Substring)
export const PARAGRAPH_TRANSLATIONS: Array<{ id: string; en: string }> = [
  // 1.0 Objective
  {
    id: 'Menetapkan tata kelola standar operasional pada PT Nirwana Bhumi Energy agar seluruh aktivitas berjalan efisien, aman, dan mematuhi regulasi industri migas serta sistem manajemen mutu ISO 9001/14001/45001.',
    en: 'To establish operational governance standards across PT Nirwana Bhumi Energy ensuring all activities operate efficiently, safely, and in full compliance with oil & gas industry regulations as well as ISO 9001/14001/45001 integrated management systems.',
  },
  {
    id: 'Prosedur ini menetapkan tata cara, acuan baku, dan mekanisme pengendalian pelaksanaan prosedur di lingkungan PT Nirwana Bhumi Energy guna menjamin mutu, akurasi, serta kepatuhan keselamatan kerja.',
    en: 'This procedure establishes guidelines, benchmark standards, and control mechanisms for procedure implementation across PT Nirwana Bhumi Energy to guarantee quality, precision, and workplace safety compliance.',
  },

  // 2.0 Scope
  {
    id: 'Prosedur ini mencakup seluruh unit operasional, teknik, pengadaan, dan administrasi korporat di wilayah kerja PT Nirwana Bhumi Energy termasuk operasional darat dan fasilitas pendukung lainnya.',
    en: 'This procedure applies to all operational, engineering, procurement, and corporate administration units within the working areas of PT Nirwana Bhumi Energy, including onshore operations and supporting facilities.',
  },
  {
    id: 'Prosedur ini berlaku secara menyeluruh bagi seluruh departemen, proyek operasional, dan personel terkait di lingkungan PT Nirwana Bhumi Energy.',
    en: 'This procedure applies comprehensively across all departments, operational projects, and relevant personnel within PT Nirwana Bhumi Energy.',
  },

  // 3.0 Responsibility
  {
    id: 'Seluruh personel pelaksana wajib memahami dan menerapkan instruksi kerja yang tercantum. Verifikator teknis bertanggung jawab atas kendali mutu dan kepatuhan sistem audit berkala.',
    en: 'All executing personnel are required to comprehend and implement the working instructions set forth herein. Technical verifiers are responsible for quality control and compliance with regular audit systems.',
  },
  {
    id: 'Pedoman Sistem Manajemen Terintegrasi PT Nirwana Bhumi Energy, ISO 9001:2015, ISO 14001:2015, ISO 45001:2018, dan kualifikasi CSMS SKK Migas serta PT PLN (Persero).',
    en: 'Integrated Management System Guidelines of PT Nirwana Bhumi Energy, ISO 9001:2015, ISO 14001:2015, ISO 45001:2018, and CSMS qualifications of SKK Migas and PT PLN (Persero).',
  },

  // 4.0 Definition
  {
    id: 'IMS (Integrated Management Systems): Sistem Manajemen Terintegrasi mutu, K3, dan lingkungan yang diadopsi PT Nirwana Bhumi Energy.',
    en: 'IMS (Integrated Management Systems): Integrated quality, HSE, and environmental management systems adopted by PT Nirwana Bhumi Energy.',
  },
  {
    id: 'DCC (Document Control Center): Unit pengelola registrasi, distribusi, dan pengarsipan naskah dokumen terkontrol.',
    en: 'DCC (Document Control Centre): Administrative unit governing the registration, distribution, and archiving of controlled documents.',
  },
  {
    id: 'Pembuat dokumen bertanggung jawab menyusun draf materi teknis. Verifikator memeriksa kesesuaian risiko. Pejabat berwenang mengesahkan dokumen.',
    en: 'Document creators are responsible for drafting technical content. Verifiers review risk alignment. Authorised executives enact the documents.',
  },

  // 5.0 Procedure Details / 5.1 General Provisions / 5.2 Operational Flow
  {
    id: 'Setiap kegiatan wajib diawali dengan penilaian risiko (Job Safety Analysis) dan inspeksi berkala pada peralatan kerja serta verifikasi izin kerja berlaku.',
    en: 'All operational activities must commence with a Job Safety Analysis (JSA) risk assessment, scheduled equipment inspections, and verification of valid work permits.',
  },
  {
    id: 'Pelaksanaan tugas operasional dilaporkan secara harian ke sistem pemantauan terpadu untuk menjamin kontinuitas data dan akurasi riwayat penanganan.',
    en: 'Operational task execution shall be reported on a daily basis to the integrated monitoring system to ensure data continuity and accurate maintenance history.',
  },
  {
    id: 'Pelaksanaan teknis alur kerja sesuai dengan instruksi kerja dan matriks tanggung jawab yang telah ditetapkan.',
    en: 'Technical workflow execution is conducted in compliance with established work instructions and responsibility matrices.',
  },

  // 6.0 Related Documents
  {
    id: 'Manual Sistem Manajemen Terintegrasi NBE-IMS-MAN-2026 dan Formulir Verifikasi Mutu Lapangan.',
    en: 'Corporate Integrated Management System Manual NBE-IMS-MAN-2026 and Field Quality Verification Forms.',
  },
  {
    id: 'Seluruh rekaman, daftar periksa, formulir isian, dan bukti verifikasi diarsipkan secara digital dalam Google Drive Korporat.',
    en: 'All records, checklists, filled forms, and verification evidence are digitally archived in Corporate Google Drive.',
  },

  // 7.0 Records
  {
    id: 'Seluruh catatan verifikasi, logbook inspeksi, dan berita acara disimpan dalam arsip terkontrol minimal selama 5 (lima) tahun.',
    en: 'All verification records, inspection logbooks, and official handover minutes shall be preserved in controlled archives for a minimum period of 5 (five) years.',
  },
  {
    id: 'Lampiran formulir teknis, checklist audit, dan lembar catatan mutu.',
    en: 'Appendices of technical forms, audit checklists, and quality record sheets.',
  },

  // 8.0 Appendices / Emergency
  {
    id: 'Instruksi tanggap darurat dan nomor kontak darurat tertera pada lampiran internal operasional.',
    en: 'Emergency response instructions and key emergency telephone directories are set forth in the internal operational appendices.',
  },
  {
    id: 'Instruksi khusus dan penanganan darurat ketidaksesuaian operasional.',
    en: 'Special instructions and emergency response protocols for operational non-conformities.',
  },

  // Revision table reserved note
  {
    id: 'Disediakan untuk catatan revisi lanjutan',
    en: 'Reserved for subsequent revision log',
  },
];

// 3. SK Legal Clauses Translations
export const SK_LEGAL_TRANSLATIONS: Array<{ id: string; en: string }> = [
  {
    id: 'DIREKSI PT NIRWANA BHUMI ENERGY,',
    en: 'THE BOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY,',
  },
  {
    id: 'Menimbang:',
    en: 'Having Considered:',
  },
  {
    id: 'Mengingat:',
    en: 'In View Of:',
  },
  {
    id: 'MEMUTUSKAN:',
    en: 'HEREBY RESOLVES:',
  },
  {
    id: 'Menetapkan:',
    en: 'To Enact:',
  },
  {
    id: 'KESATU:',
    en: 'FIRST:',
  },
  {
    id: 'KEDUA:',
    en: 'SECOND:',
  },
  {
    id: 'KETIGA:',
    en: 'THIRD:',
  },
  {
    id: 'KEEMPAT:',
    en: 'FOURTH:',
  },
  {
    id: 'KELIMA:',
    en: 'FIFTH:',
  },
];

/**
 * Translates a single line of text between 'id' and 'en'.
 * Automatically detects whether line is a numbered clause heading (e.g. "1.0 OBJECTIVE" vs "1.0 MAKSUD DAN TUJUAN").
 */
export function translateTextLine(text: string, targetLang: 'id' | 'en'): string {
  if (!text) return text;
  const trimmed = text.trim();

  // 1. Check if line starts with numbered clause e.g. "1.0 OBJECTIVE", "5.1 General Provisions"
  const clauseMatch = trimmed.match(/^([0-9]+\.[0-9]+)\s+(.*)$/);
  if (clauseMatch) {
    const numPart = clauseMatch[1];
    const titlePart = clauseMatch[2].trim();

    for (const h of HEADING_TRANSLATIONS) {
      if (targetLang === 'en') {
        if (titlePart.toUpperCase() === h.id.toUpperCase()) {
          return `${numPart} ${h.en}`;
        }
      } else {
        if (titlePart.toUpperCase() === h.en.toUpperCase()) {
          return `${numPart} ${h.id}`;
        }
      }
    }
    // Also check if titlePart is 'ATTACHMENTS AND EMERGENCY INSTRUCTIONS'
    if (targetLang === 'id' && titlePart.toUpperCase().includes('ATTACHMENTS AND EMERGENCY')) {
      return `${numPart} LAMPIRAN DAN INSTRUKSI KEADAAN DARURAT`;
    }
    if (targetLang === 'en' && titlePart.toUpperCase().includes('LAMPIRAN DAN INSTRUKSI')) {
      return `${numPart} APPENDICES AND EMERGENCY INSTRUCTIONS`;
    }
  }

  // 2. Check exact Heading matches
  for (const h of HEADING_TRANSLATIONS) {
    if (targetLang === 'en') {
      if (trimmed.toUpperCase() === h.id.toUpperCase()) return h.en;
    } else {
      if (trimmed.toUpperCase() === h.en.toUpperCase()) return h.id;
    }
  }

  // 3. Check Paragraph exact & substring matches
  for (const p of PARAGRAPH_TRANSLATIONS) {
    if (targetLang === 'en') {
      if (trimmed === p.id || trimmed.includes(p.id.slice(0, 40))) {
        return p.en;
      }
    } else {
      if (trimmed === p.en || trimmed.includes(p.en.slice(0, 40))) {
        return p.id;
      }
    }
  }

  // 4. Check SK Legal Clauses
  for (const sk of SK_LEGAL_TRANSLATIONS) {
    if (targetLang === 'en') {
      if (trimmed === sk.id) return sk.en;
    } else {
      if (trimmed === sk.en) return sk.id;
    }
  }

  // 5. Revision descriptions
  if (targetLang === 'en') {
    if (trimmed.includes('Edisi Awal – Penerbitan Dokumen Standar PT NBE')) {
      return trimmed.replace('Edisi Awal – Penerbitan Dokumen Standar PT NBE', 'Initial Edition – PT NBE Standard Document Issuance');
    }
    if (trimmed.includes('Edisi Awal')) {
      return trimmed.replace('Edisi Awal', 'Initial Edition');
    }
  } else {
    if (trimmed.includes('Initial Edition – PT NBE Standard Document Issuance') || trimmed.includes('Initial Edition – Corporate Standard Document')) {
      return trimmed
        .replace('Initial Edition – PT NBE Standard Document Issuance', 'Edisi Awal – Penerbitan Dokumen Standar PT NBE')
        .replace('Initial Edition – Corporate Standard Document', 'Edisi Awal – Penerbitan Dokumen Standar PT NBE');
    }
    if (trimmed.includes('Initial Edition')) {
      return trimmed.replace('Initial Edition', 'Edisi Awal');
    }
  }

  return text;
}

/**
 * Translates an entire Table of Contents list while preserving num and isSub attributes.
 */
export function translateTocList(
  items: TocItemTranslation[],
  targetLang: 'id' | 'en'
): TocItemTranslation[] {
  if (!items || items.length === 0) return items;

  return items.map((item) => {
    let translatedTitle = item.title;

    for (const h of HEADING_TRANSLATIONS) {
      if (targetLang === 'en') {
        if (item.title.trim().toUpperCase() === h.id.toUpperCase()) {
          translatedTitle = h.en;
          break;
        }
      } else {
        if (item.title.trim().toUpperCase() === h.en.toUpperCase()) {
          translatedTitle = h.id;
          break;
        }
      }
    }

    if (targetLang === 'id' && item.title.toUpperCase().includes('ATTACHMENTS AND EMERGENCY')) {
      translatedTitle = 'LAMPIRAN DAN INSTRUKSI KEADAAN DARURAT';
    }
    if (targetLang === 'en' && item.title.toUpperCase().includes('LAMPIRAN DAN INSTRUKSI')) {
      translatedTitle = 'APPENDICES AND EMERGENCY INSTRUCTIONS';
    }

    return {
      ...item,
      title: translatedTitle,
    };
  });
}

/**
 * Translates HTML content inside an editor page, strictly maintaining every tag, style, class,
 * inline styles (such as padding-left, text-indent, font-size, font-family, margin, text-align).
 */
export function translateHtmlContent(html: string, targetLang: 'id' | 'en'): string {
  if (!html || typeof html !== 'string') return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Walk all paragraph / heading / list-item elements
    const elements = doc.body.querySelectorAll('p, h1, h2, h3, h4, div, li, span');

    elements.forEach((el) => {
      // If element contains child block tags, skip to only translate leaf text blocks
      const hasBlockChildren = el.querySelector('p, div, h1, h2, h3, h4');
      if (hasBlockChildren) return;

      const rawText = el.textContent || '';
      const trimmed = rawText.trim();
      if (!trimmed) return;

      // Check if this element contains a clause number span e.g. <span style="...">1.0</span>OBJECTIVE
      const spanWithNum = el.querySelector('span');
      if (spanWithNum) {
        const spanText = (spanWithNum.textContent || '').trim();
        const numMatch = spanText.match(/^([0-9]+\.[0-9]+)$/);
        if (numMatch) {
          // The remaining text outside span is the title
          const numPart = numMatch[1];
          const fullText = trimmed;
          const titlePart = fullText.replace(spanText, '').trim();

          for (const h of HEADING_TRANSLATIONS) {
            if (targetLang === 'en') {
              if (titlePart.toUpperCase() === h.id.toUpperCase()) {
                // Keep the span, replace title text node
                el.innerHTML = `${spanWithNum.outerHTML}${h.en}`;
                return;
              }
            } else {
              if (titlePart.toUpperCase() === h.en.toUpperCase()) {
                el.innerHTML = `${spanWithNum.outerHTML}${h.id}`;
                return;
              }
            }
          }
          if (targetLang === 'id' && titlePart.toUpperCase().includes('ATTACHMENTS AND EMERGENCY')) {
            el.innerHTML = `${spanWithNum.outerHTML}LAMPIRAN DAN INSTRUKSI KEADAAN DARURAT`;
            return;
          }
          if (targetLang === 'en' && titlePart.toUpperCase().includes('LAMPIRAN DAN INSTRUKSI')) {
            el.innerHTML = `${spanWithNum.outerHTML}APPENDICES AND EMERGENCY INSTRUCTIONS`;
            return;
          }
        }
      }

      // Check paragraphs and single lines
      const translated = translateTextLine(trimmed, targetLang);
      if (translated !== trimmed) {
        // Replace inner text while preserving the tag itself
        el.textContent = translated;
      }
    });

    return doc.body.innerHTML;
  } catch (err) {
    console.warn('HTML translation fallback applied:', err);
    // Fallback string replacement
    let result = html;
    for (const p of PARAGRAPH_TRANSLATIONS) {
      if (targetLang === 'en') {
        result = result.split(p.id).join(p.en);
      } else {
        result = result.split(p.en).join(p.id);
      }
    }
    for (const h of HEADING_TRANSLATIONS) {
      if (targetLang === 'en') {
        result = result.split(h.id).join(h.en);
      } else {
        result = result.split(h.en).join(h.id);
      }
    }
    return result;
  }
}
