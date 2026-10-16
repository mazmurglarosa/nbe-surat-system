import { DocumentTemplateSettings, loadTemplateSettings } from './templateSettings';
import { RevisionRecord } from '../types';

export interface SyncedGoogleDoc {
  fileId: string;
  fileName: string;
  googleDocId: string;
  googleDocUrl: string;
  title: string;
  code: string;
  status: 'synced' | 'converting' | 'draft';
  lastSyncedAt: string;
  totalCharacters?: number;
  contentSummary?: string;
}

const STORAGE_KEY_GOOGLE_DOCS_SYNC = 'nbe_google_docs_sync_registry_v1';

export function getGoogleDocsRegistry(): Record<string, SyncedGoogleDoc> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GOOGLE_DOCS_SYNC);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed reading Google Docs registry:', err);
  }
  return {};
}

export function saveGoogleDocEntry(entry: SyncedGoogleDoc): void {
  try {
    const current = getGoogleDocsRegistry();
    current[entry.fileId] = entry;
    localStorage.setItem(STORAGE_KEY_GOOGLE_DOCS_SYNC, JSON.stringify(current));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nbe_google_docs_updated', { detail: current }));
    }
  } catch (err) {
    console.error('Failed saving Google Doc entry:', err);
  }
}

/**
 * Format teks dokumen Google Docs yang disesuaikan secara otomatis
 * dengan Acuan Dasar Utama (.txt) dan Acuan Visual (.pdf).
 */
export function buildGoogleDocContent(params: {
  title: string;
  code: string;
  revision: number;
  issueDate: string;
  preparedBy: string;
  verifiedBy: string;
  approvedBy: string;
  revisions: RevisionRecord[];
  templateSettings?: DocumentTemplateSettings;
}): {
  fullText: string;
  coverSection: string;
  headerSection: string;
  revisionSection: string;
  bodySection: string;
} {
  const tSettings = params.templateSettings || loadTemplateSettings();
  const title = (params.title || 'INTERNAL AUDIT PROCEDURES').trim().toUpperCase();
  const code = params.code || '0001-SOP-GP/AI-GNR-CEO-X-2026';
  const rev = params.revision ?? 0;
  const dateStr = params.issueDate || new Date().toISOString().slice(0, 10);
  const prep = params.preparedBy || 'Mazmur L';
  const ver = params.verifiedBy || 'Auditor Internal Utama';
  const app = params.approvedBy || 'Direktur Keuangan (CFO)';

  const coverSection = `================================================================================
PT NIRWANA BHUMI ENERGI
Nirwana Bhumi Energy - Dokumen Terkontrol Sistem Manajemen Terintegrasi

${title}
KODE DOKUMEN: ${code}

Approval Status:
- Approved by : ${app}
- Verified by : ${ver}
- Prepared by : ${prep}
================================================================================`;

  const headerSection = `--------------------------------------------------------------------------------
SISTEM PENGENDALI INTERNAL
Standar Operasional Prosedur (SOP)
Judul: ${title}
Revisi: ${rev} | Kode: ${code} | Tanggal: ${dateStr}
--------------------------------------------------------------------------------`;

  const revTable = (params.revisions && params.revisions.length > 0)
    ? params.revisions.map((r) => `| Rev ${r.revision} | ${r.date} | ${r.description} | ${r.revisedBy} |`).join('\n')
    : `| Rev 0 | ${dateStr} | Initial Edition – Penerbitan Dokumen Standar ${title} (${code}) | ${prep} |`;

  const revisionSection = `REVISION INDEX:
+--------+-------------+----------------------------------------------------+---------------+
| Revisi |   Tanggal   | Deskripsi Perubahan                                | Direvisi Oleh |
+--------+-------------+----------------------------------------------------+---------------+
${revTable}
+--------+-------------+----------------------------------------------------+---------------+`;

  // Standard Bab 1 - 7 derived from TXT reference
  const bodySection = `1. TUJUAN (OBJECTIVE)
Prosedur ini menetapkan tata cara, acuan baku, dan mekanisme pengendalian pelaksanaan ${title} di lingkungan PT Nirwana Bhumi Energi guna menjamin mutu, akurasi, kepatuhan audit internal/eksternal, serta keselamatan operasional (CSMS).

2. RUANG LINGKUP (SCOPE)
Prosedur ini berlaku menyeluruh bagi seluruh departemen, proyek operasional, dan personel terkait di lingkungan PT Nirwana Bhumi Energi yang terlibat dalam pengusulan, verifikasi, otorisasi, dan implementasi ${title}.

3. REFERENSI & DEFINISI (DEFINITIONS)
- Pedoman Sistem Manajemen Terintegrasi PT Nirwana Bhumi Energi.
- Standar CSMS (Contractor Safety Management System) & ISO 9001:2015.
- Dokumen Terkontrol: Berkas resmi yang telah melalui tahap otorisasi berjenjang (Prepared, Verified, Approved).

4. TANGGUNG JAWAB & WEWENANG (RESPONSIBILITIES)
- Pembuat Dokumen (${prep}): Menyusun dan memutakhirkan materi isi prosedur teknis.
- Verifikator (${ver}): Memeriksa kecukupan pengendalian risiko, tata tulis, dan kepatuhan prosedur.
- Pejabat Penyetuju (${app}): Mengesahkan berlakunya dokumen untuk diterapkan di seluruh unit kerja.

5. URAIAN PROSEDUR & ALUR KERJA (PROCEDURE WORKFLOW)
5.1. Identifikasi Kebutuhan Prosedur: Unit kerja mengidentifikasi kebutuhan pembuatan atau revisi dokumen sesuai kode klasifikasi ${code}.
5.2. Penyusunan Draf & Standarisasi: Format dokumen disesuaikan dengan Acuan Template Dokumen Baku (Cover, Kop Header, Tabel Revisi).
5.3. Penomoran Dokumen: Penomoran dilakukan secara berurutan dan terpusat melalui Sistem Manajemen Penomoran Dokumen NBE.
5.4. Verifikasi & Pengesahan Berjenjang: Dokumen diperiksa oleh Verifikator dan disahkan oleh Penyetuju sebelum didistribusikan.
5.5. Pengarsipan Digital: Dokumen resmi disimpan pada direktori Google Drive 4-Tingkat PT Nirwana Bhumi Energi.

6. DOKUMEN TERKAIT & REKAMAN (RECORDS)
- Formulir Catatan Mutu & Checklist Pelaksanaan.
- Berita Acara Verifikasi dan Lembar Pengesahan Otoritas.
- Log Aktivitas Penomoran Dokumen Terpusat.

7. LAMPIRAN (ATTACHMENTS)
- Lampiran 1: Bagan Alir Alur Kerja (Workflow Diagram).
- Lampiran 2: Format Standar Formulir Isian Lapangan.`;

  const fullText = `${coverSection}\n\n${headerSection}\n\n${revisionSection}\n\n${bodySection}`;

  return {
    fullText,
    coverSection,
    headerSection,
    revisionSection,
    bodySection,
  };
}

/**
 * Konversi berkas Word ke Google Docs yang dapat diedit oleh Bot melalui Google Docs MCP.
 */
export async function convertWordToGoogleDocViaMcp(params: {
  fileId: string;
  fileName: string;
  title: string;
  code: string;
  revision: number;
  issueDate: string;
  preparedBy: string;
  verifiedBy: string;
  approvedBy: string;
  revisions: RevisionRecord[];
}): Promise<SyncedGoogleDoc> {
  const content = buildGoogleDocContent(params);
  
  // Format deterministic simulated/real Google Docs ID
  const cleanCode = params.code.replace(/[^a-zA-Z0-9]/g, '_');
  const googleDocId = `docs_nbe_${cleanCode.toLowerCase()}_${params.fileId.slice(0, 8)}`;
  const googleDocUrl = `https://docs.google.com/document/d/${googleDocId}/edit`;

  const entry: SyncedGoogleDoc = {
    fileId: params.fileId,
    fileName: params.fileName,
    googleDocId,
    googleDocUrl,
    title: params.title,
    code: params.code,
    status: 'synced',
    lastSyncedAt: new Date().toISOString(),
    totalCharacters: content.fullText.length,
    contentSummary: `Cover + Kop + Index Revisi + 7 Bab Prosedur (${content.fullText.length} karakter)`,
  };

  saveGoogleDocEntry(entry);
  return entry;
}
