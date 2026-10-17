import JSZip from 'jszip';

export interface DocxTableData {
  rows: string[][];
}

export interface ExtractedDocxData {
  paragraphs: string[];
  tables: DocxTableData[];
  rawText: string;
}

/**
 * Ekstraktor Paragraf, Tabel & Isi Dokumen Microsoft Word (.docx) murni
 * Berfungsi mengekstrak isi asli dokumen dari berkas Word yang diunggah
 * tanpa mengubah struktur pokok dokumen (Content Preservation Guardrail).
 */
export async function extractDocxData(fileOrBlob: File | Blob | string): Promise<ExtractedDocxData> {
  try {
    let blob: Blob;

    if (typeof fileOrBlob === 'string') {
      if (fileOrBlob.startsWith('data:')) {
        const res = await fetch(fileOrBlob);
        blob = await res.blob();
      } else {
        const byteCharacters = atob(fileOrBlob);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
      }
    } else {
      blob = fileOrBlob;
    }

    const zip = new JSZip();
    const zipDoc = await zip.loadAsync(blob);
    const documentXmlFile = zipDoc.file('word/document.xml');

    if (!documentXmlFile) {
      console.warn('word/document.xml not found in .docx archive');
      return { paragraphs: [], tables: [], rawText: '' };
    }

    const xmlText = await documentXmlFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    // Helper to check if a node is inside a table cell
    const isInsideTable = (node: Node): boolean => {
      let parent = node.parentNode;
      while (parent) {
        const tag = parent.nodeName.toLowerCase();
        if (tag === 'w:tbl' || tag === 'tbl') {
          return true;
        }
        parent = parent.parentNode;
      }
      return false;
    };

    // 1. Ekstrak Paragraf
    const paragraphs: string[] = [];
    const allParagraphs: string[] = [];
    const pNodes = xmlDoc.getElementsByTagName('w:p');

    for (let i = 0; i < pNodes.length; i++) {
      const p = pNodes[i];
      const tNodes = p.getElementsByTagName('w:t');
      let lineText = '';

      for (let j = 0; j < tNodes.length; j++) {
        lineText += tNodes[j].textContent || '';
      }

      const trimmed = lineText.trim();
      if (trimmed.length > 0) {
        allParagraphs.push(trimmed);
        if (!isInsideTable(p)) {
          paragraphs.push(trimmed);
        }
      }
    }

    // 2. Ekstrak Tabel
    const tables: DocxTableData[] = [];
    const tblNodes = xmlDoc.getElementsByTagName('w:tbl');

    for (let i = 0; i < tblNodes.length; i++) {
      const tbl = tblNodes[i];
      const trNodes = tbl.getElementsByTagName('w:tr');
      const rows: string[][] = [];

      for (let r = 0; r < trNodes.length; r++) {
        const tr = trNodes[r];
        const tcNodes = tr.getElementsByTagName('w:tc');
        const cells: string[] = [];

        for (let c = 0; c < tcNodes.length; c++) {
          const tc = tcNodes[c];
          const tNodes = tc.getElementsByTagName('w:t');
          let cellText = '';
          for (let t = 0; t < tNodes.length; t++) {
            cellText += tNodes[t].textContent || '';
          }
          cells.push(cellText.trim());
        }

        if (cells.some((cell) => cell.length > 0)) {
          rows.push(cells);
        }
      }

      if (rows.length > 0) {
        tables.push({ rows });
      }
    }

    // Gunakan paragraphs murni jika ada, atau allParagraphs jika tidak ada tabel
    const finalParagraphs = paragraphs.length > 0 ? paragraphs : (tables.length === 0 ? allParagraphs : []);

    return {
      paragraphs: finalParagraphs,
      tables,
      rawText: allParagraphs.join('\n'),
    };
  } catch (error) {
    console.warn('Gagal membaca isi berkas .docx:', error);
    return { paragraphs: [], tables: [], rawText: '' };
  }
}

export async function extractDocxParagraphs(fileOrBlob: File | Blob | string): Promise<string[]> {
  const data = await extractDocxData(fileOrBlob);
  return data.paragraphs;
}

/**
 * Paragraf default standar operasional prosedur NBE
 * Digunakan jika dokumen baru dibuat atau tidak memiliki isi asli
 */
export const DEFAULT_NBE_BODY_PARAGRAPHS = [
  '1.0 OBJECTIVE & TUJUAN',
  'Prosedur ini menetapkan tata kelola baku pelaksanaan operasional dan kepatuhan sistem kendali terintegrasi (Integrated Management Systems / IMS) di lingkungan PT Nirwana Bhumi Energy.',
  '2.0 SCOPE & RUANG LINGKUP',
  'Meliputi seluruh kegiatan operasional, keteknikan, kepatuhan HSE, audit internal, administrasi dokumentasi, serta seluruh personil yang ditunjuk dalam struktur organisasi.',
  '3.0 RESPONSIBILITY & TANGGUNG JAWAB',
  '3.1 Direksi bertanggung jawab atas pengesahan, alokasi sumber daya, dan penerapan kebijakan mutu serta keselamatan kerja.',
  '3.2 Tim Document Control Center (DCC) bertanggung jawab atas registrasi kode surat, kendali versi, pengarsipan Google Drive, dan distribusi dokumen terkendali.',
  '3.3 Seluruh kepala divisi dan penanggung jawab operasional wajib memastikan seluruh staf mematuhi prosedur yang berlaku.',
  '4.0 DEFINITIONS & ISTILAH',
  'Dokumen Terkendali adalah dokumen resmi yang telah melalui verifikasi, persetujuan direksi, dan terdaftar dalam sistem penomoran resmi PT Nirwana Bhumi Energy.',
  '5.0 DETAILED PROCEDURE & LANGKAH KERJA',
  '5.1 Setiap pembuatan dokumen baru wajib diawali dengan registrasi kode resmi melalui sistem penomoran terpusat.',
  '5.2 Penomoran terdiri atas 6 segmen baku: [Nomor Urut 4 Digit]-[Kode Kategori]-[Divisi]-[Approver]-[Bulan Romawi]-[Tahun].',
  '5.3 Dokumen wajib melalui tahapan verifikasi oleh pejabat berwenang sebelum diajukan pengesahan akhir oleh Direktur Utama (CEO).',
  '5.4 Setelah disetujui, dokumen diarsipkan secara hierarkis 4 tingkat pada Google Drive perusahaan.',
  '6.0 REFERENCED STANDARDS & DOKUMEN TERKAIT',
  'Standar Sistem Manajemen Keselamatan Pertambangan (SMKP), ISO 9001:2015, ISO 14001:2015, dan ISO 45001:2018.',
  '7.0 ATTACHMENTS & LAMPIRAN',
  'Formulir Status Temuan Audit, Formulir Permintaan Perubahan Dokumen, dan Lembar Distribusi Dokumen Terkendali.',
];
