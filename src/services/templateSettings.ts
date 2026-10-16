export interface DocumentTemplateSettings {
  txtGuidelinesName?: string;
  txtGuidelinesContent: string;
  pdfLayoutName?: string;
  pdfLayoutDataUrl?: string;
  paperSize: 'A4' | 'Letter' | 'F4';
  orientation: 'portrait' | 'landscape';
  marginTopCm: number;
  marginBottomCm: number;
  marginLeftCm: number;
  marginRightCm: number;
  fontFamily: string;
  lastUpdated?: string;
}

export const DEFAULT_TEMPLATE_GUIDELINES = `PANDUAN STANDARISASI DOKUMEN & FORMAT PROSEDUR RESMI
PT NIRWANA BHUMI ENERGI (NBE)
Sistem Manajemen Terintegrasi & Pengendalian Dokumen Terkontrol (CSMS / ISO 9001 / ISO 45001)

1. ATURAN UMUM FORMAT DOKUMEN
   - Seluruh dokumen prosedur wajib memiliki Halaman Cover, Kop Header Resmi, dan Tabel Revision Index.
   - Ukuran kertas baku: A4 (210 mm x 297 mm), Orientasi: Portrait (Tegak).
   - Margin standar: Atas 2.54 cm, Bawah 2.54 cm, Kiri 2.54 cm, Kanan 2.54 cm.
   - Tipografi: Font Arial atau Calibri dengan keterbacaan tinggi.
   - Nomor halaman diletakkan di pojok kanan bawah (contoh: Page X of Y).

2. TATA LETAK HALAMAN COVER (HALAMAN 1)
   - Bagian Atas: Logo resmi PT Nirwana Bhumi Energi (Nirwana Bhumi Energy).
   - Bagian Tengah: Judul Dokumen (Title) ditulis dengan huruf kapital tebal (Uppercase Bold), ukuran 16-18pt, letter-spacing proporsional.
   - Bagian Bawah Kanan: Blok pengesahan otorisasi 3 tingkat:
     * Approved by : Otoritas Penyetuju (misal: Direktur Keuangan / CFO)
     * Verified by : Otoritas Verifikasi (misal: Auditor Internal Utama / MR)
     * Prepared by : Pembuat Dokumen (misal: Mazmur L)

3. TATA LETAK KOP HEADER & REVISION INDEX (HALAMAN 2)
   - Kop Header Dokumen berbentuk tabel kotak tertutup dengan garis hitam tegas 1.5pt:
     * Sisi Kiri: Logo NBE dan akronim "NBE".
     * Sisi Kanan:
       Baris 1: "SISTEM PENGENDALI INTERNAL" (Bold, rata tengah)
       Baris 2: "Standar Operasional Prosedur (SOP)" / Kategori Surat
       Baris 3: Judul Prosedur Dokumen (Bold Uppercase)
       Baris 4: Informasi metadata 3 kolom:
         [Revisi: X] | [Nomor Kode Resmi NBE] | [Tanggal Penerbitan]
   - Tabel Revision Index tepat di bawah Kop Header:
     * Memiliki 4 kolom utama: Revisi, Tanggal, Deskripsi Perubahan, Direvisi Oleh.
     * Revisi 0 diisi: "Initial Edition – Penerbitan Dokumen Standar [Judul Dokumen] ([Kode Dokumen])".
     * Baris revisi selanjutnya ditambahkan secara berurutan sesuai pembaruan isi.

4. STRUKTUR BAB ISI PROSEDUR (HALAMAN 3 DAN SETERUSNYA)
   Setiap berkas dokumen Word yang distandarisasi oleh Bot wajib memuat bab-bab pokok berikut:
   1. TUJUAN (OBJECTIVE): Maksud dan sasaran spesifik penerapan prosedur.
   2. RUANG LINGKUP (SCOPE): Batasan departemen, area kerja, dan personel yang terkait.
   3. REFERENSI & DEFINISI (DEFINITIONS): Rujukan perundangan, ISO/CSMS, dan istilah teknis.
   4. TANGGUNG JAWAB & WEWENANG (RESPONSIBILITIES): Peran pihak pembuat, pelaksana, dan pemeriksa.
   5. URAIAN PROSEDUR & TAHAPAN KERJA (PROCEDURE WORKFLOW): Alur operasional langkah demi langkah.
   6. DOKUMEN TERKAIT & REKAMAN (RECORDS): Formulir, checklist, dan bukti pelaksanaan.
   7. LAMPIRAN (ATTACHMENTS): Format lampiran isian resmi.

5. ATURAN KONVERSI & BOT GOOGLE DOCS
   - Bot akan membedah setiap file Word (.docx) atau hasil konversi PDF.
   - Bot mempertahankan teks inti dokumen asli, lalu membungkusnya secara otomatis dengan Cover standar, Kop Header resmi, dan Tabel Index Revisi sesuai acuan template ini.
   - Seluruh dokumen Word dapat dikonversi ke Google Docs menggunakan MCP Google Docs untuk kolaborasi real-time.`;

export const STORAGE_KEY_TEMPLATE_SETTINGS = 'nbe_master_template_settings_v1';

export const DEFAULT_TEMPLATE_SETTINGS: DocumentTemplateSettings = {
  txtGuidelinesName: 'Panduan_Standar_Dokumen_NBE_CSMS.txt',
  txtGuidelinesContent: DEFAULT_TEMPLATE_GUIDELINES,
  pdfLayoutName: 'Contoh_Visual_Layout_Standar_NBE.pdf',
  pdfLayoutDataUrl: '',
  paperSize: 'A4',
  orientation: 'portrait',
  marginTopCm: 2.54,
  marginBottomCm: 2.54,
  marginLeftCm: 2.54,
  marginRightCm: 2.54,
  fontFamily: 'Arial, sans-serif',
  lastUpdated: new Date().toISOString(),
};

import { supabase } from './supabaseClient';

export function loadTemplateSettings(): DocumentTemplateSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATE_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_TEMPLATE_SETTINGS,
        ...parsed,
      };
    }
  } catch (err) {
    console.error('Failed reading template settings:', err);
  }
  return DEFAULT_TEMPLATE_SETTINGS;
}

export function saveTemplateSettings(settings: DocumentTemplateSettings): void {
  try {
    const payload = {
      ...settings,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_TEMPLATE_SETTINGS, JSON.stringify(payload));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nbe_template_settings_updated', { detail: payload }));
    }

    // Persist to Supabase Cloud
    if (supabase) {
      (async () => {
        try {
          const { error } = await supabase
            .from('document_templates')
            .upsert({
              id: 'primary_template',
              txt_guidelines_name: settings.txtGuidelinesName,
              txt_guidelines_content: settings.txtGuidelinesContent,
              pdf_layout_name: settings.pdfLayoutName,
              pdf_layout_data_url: settings.pdfLayoutDataUrl || null,
              paper_size: settings.paperSize,
              orientation: settings.orientation,
              margin_top_cm: settings.marginTopCm,
              margin_bottom_cm: settings.marginBottomCm,
              margin_left_cm: settings.marginLeftCm,
              margin_right_cm: settings.marginRightCm,
              font_family: settings.fontFamily,
              last_updated: payload.lastUpdated,
            });
          if (error) {
            console.warn('Supabase template upsert warning:', error.message);
          }
        } catch (err: any) {
          console.warn('Supabase template upsert error:', err?.message || err);
        }
      })();
    }
  } catch (err) {
    console.error('Failed saving template settings:', err);
  }
}

export async function syncTemplateSettingsFromSupabase(): Promise<DocumentTemplateSettings | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', 'primary_template')
      .maybeSingle();

    if (error || !data) return null;

    const cloudSettings: DocumentTemplateSettings = {
      txtGuidelinesName: data.txt_guidelines_name || DEFAULT_TEMPLATE_SETTINGS.txtGuidelinesName,
      txtGuidelinesContent: data.txt_guidelines_content || DEFAULT_TEMPLATE_SETTINGS.txtGuidelinesContent,
      pdfLayoutName: data.pdf_layout_name || DEFAULT_TEMPLATE_SETTINGS.pdfLayoutName,
      pdfLayoutDataUrl: data.pdf_layout_data_url || '',
      paperSize: data.paper_size || 'A4',
      orientation: data.orientation || 'portrait',
      marginTopCm: Number(data.margin_top_cm) || 2.54,
      marginBottomCm: Number(data.margin_bottom_cm) || 2.54,
      marginLeftCm: Number(data.margin_left_cm) || 2.54,
      marginRightCm: Number(data.margin_right_cm) || 2.54,
      fontFamily: data.font_family || 'Arial, sans-serif',
      lastUpdated: data.last_updated || new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY_TEMPLATE_SETTINGS, JSON.stringify(cloudSettings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nbe_template_settings_updated', { detail: cloudSettings }));
    }
    return cloudSettings;
  } catch (err) {
    console.warn('Sync template from Supabase error:', err);
    return null;
  }
}

export function resetTemplateSettings(): DocumentTemplateSettings {
  try {
    localStorage.removeItem(STORAGE_KEY_TEMPLATE_SETTINGS);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nbe_template_settings_updated', { detail: DEFAULT_TEMPLATE_SETTINGS }));
    }
    if (supabase) {
      saveTemplateSettings(DEFAULT_TEMPLATE_SETTINGS);
    }
  } catch (err) {
    console.error('Failed resetting template settings:', err);
  }
  return DEFAULT_TEMPLATE_SETTINGS;
}

// Background sync on load if browser is active
if (typeof window !== 'undefined') {
  syncTemplateSettingsFromSupabase();
}

