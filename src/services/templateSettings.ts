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
  coverLogoDataUrl?: string;
  coverLogoWidthInches?: number;
  kopLogoDataUrl?: string;
  kopLogoWidthInches?: number;
  useAsMasterTemplate?: boolean;
  masterStyleConfig?: any;
  lastUpdated?: string;
}

export const DEFAULT_TEMPLATE_GUIDELINES = `=== ACUAN TEMPLATE DOKUMEN (STANDAR TEKS & LOGIKA SURAT KEPUTUSAN DIREKSI NBE) ===
KODE KLASIFIKASI DOKUMEN : [NomorUrut4Digit]-[Kategori]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun]
KATEGORI SURAT          : KEBIJAKAN PERUSAHAAN (KB) / COMPANY POLICY
DIVISI PENERBIT         : GENERAL & MANAGEMENT (GNR)
PEJABAT PENGESAH        : CEO / PRESIDENT DIRECTOR (BIMA SATRYO HARTANTO)
STATUS DISTRIBUSI       : TERKONTROL (CONTROLLED COPY)

--------------------------------------------------------------------------------
1. ACUAN STRUKTUR HEADER KOP (HALAMAN 2 KE ATAS)
--------------------------------------------------------------------------------
- Baris 1 Kolom Tengah : GENERAL & MANAGEMENT (GNR)
- Baris 2 Kolom Tengah : KEBIJAKAN PERUSAHAAN (COMPANY POLICY / KB)
- Baris 3 Kolom Tengah : SURAT KEPUTUSAN DIREKSI: SISTEM PENGENDALIAN DOKUMEN & TIM DCC
- Baris 4 Kiri         : Revision: [NomorRevisi] (Contoh: Revision: 0)
- Baris 4 Tengah       : [NomorDokumen6Segmen] (Contoh: 0002-KB-GNR-CEO-X-2026)
- Baris 4 Kanan        : Date : [TanggalBulanTahun] (Contoh: Date : 17 Oktober 2026)

--------------------------------------------------------------------------------
2. ACUAN STRUKTUR HALAMAN MUKA (COVER PAGE - HALAMAN 1)
--------------------------------------------------------------------------------
- Posisi Logo          : Tengah (Centered), Logo resmi PT Nirwana Bhumi Energy
- Nama Entitas         : PT NIRWANA BHUMI ENERGY (Arial 20 pt Bold, Centered)
- Jenis Surat          : SURAT KEPUTUSAN DIREKSI (Arial 15-16 pt Bold, Centered)
- Judul Surat          : TENTANG PENETAPAN SISTEM MANAJEMEN PENGENDALIAN DOKUMEN DAN PENUNJUKAN TIM DOCUMENT CONTROL CENTER (DCC)
- Nomor Dokumen        : Nomor Dokumen: 0002-KB-GNR-CEO-X-2026 (Arial 11 pt Bold, Biru Navy)
- Jeda Vertikal        : Didorong ke kuadran bawah dengan spacer vertikal proporsional
- Blok Otorisasi Bawah : Ujung Kanan Bawah (Right Indent / Left Indent 3.4 - 3.65 inci):
  Approved by   : Bima Satryo Hartanto (President Director / CEO)
  Verified by    : Dennis Raditya (Director of Operations & Technology / CTO)
  Prepared by   : Mazmur Gusti Agung Larosa (Director of Finance & Engineering / DCC Lead)
- Penutup Halaman      : Explicit Page Break ke Halaman 2

--------------------------------------------------------------------------------
3. ACUAN STRUKTUR TABEL REVISI (REVISION INDEX - HALAMAN 2)
--------------------------------------------------------------------------------
- Judul Halaman        : REVISION INDEX (Arial 12 pt Bold, Centered)
- Struktur Kolom Tabel : [Rev.] | [Date] | [Description] | [Prepared By]
- Baris Revisi 0       : 0 | 17 Oktober 2026 | Initial Edition – Penetapan Sistem Manajemen Pengendalian Dokumen dan Penunjukan Tim Document Control Center (DCC) PT Nirwana Bhumi Energy | Mazmur Gusti Agung Larosa
- Aturan Mutlak        : Bagian "Catatan Kendali Dokumen" DITIADAKAN/DIHAPUS. Halaman 2 hanya berisi Tabel Revision Index dan Ringkasan Baku.
- Penutup Halaman      : Explicit Page Break ke Halaman 3

--------------------------------------------------------------------------------
4. ACUAN STRUKTUR ISI SURAT (HALAMAN 3: KONSIDERANS & DIKTUM KESATU)
--------------------------------------------------------------------------------
- Judul Dokumen        : SURAT KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY
- Nomor Surat          : NOMOR: 0002-KB-GNR-CEO-X-2026
- Perihal / Tentang    : TENTANG PENETAPAN SISTEM MANAJEMEN PENGENDALIAN DOKUMEN DAN PENUNJUKAN TIM DOCUMENT CONTROL CENTER (DCC)
- Diktum Pembuka       : DIREKSI PT NIRWANA BHUMI ENERGY,
- Konsiderans Menimbang: Poin a, b, dan c (Standardisasi tata kelola dokumen & kepatuhan IMS ISO 9001, 14001, 45001, CSMS)
- Konsiderans Mengingat: Poin 1 s.d. 5 (UU No 40/2007, ISO 9001 Klausul 7.5, CSMS SKK Migas/PLN, SOP 0001-SOP-GNR-CEO-IX-2026, Kebijakan Mutu)
- Pernyataan Memutuskan: MEMUTUSKAN: Menetapkan: KEPUTUSAN DIREKSI...
- Diktum KESATU        : Memberlakukan Standar Penomoran 6 Segmen [NomorUrut4Digit]-[Kategori]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun] (Asas 1 Kode Unik Mutlak = 1 Dokumen Sah)
- Penutup Halaman      : Explicit Page Break ke Halaman 4

--------------------------------------------------------------------------------
5. ACUAN STRUKTUR ISI SURAT (HALAMAN 4: TIM DCC, DIKTUM PENUTUP, & PENGESAHAN)
--------------------------------------------------------------------------------
- Diktum KEDUA         : Menunjuk Tim Document Control Center (DCC) dalam Tabel 4 Kolom:
  * Personel 1: Bima Satryo Hartanto (President Director / CEO) - Otorisasi & Pengesah Puncak
  * Personel 2: Dennis Raditya (Technical Director / CTO) - Verifikator Standar Teknis & QA
  * Personel 3: Mazmur Gusti Agung Larosa (Finance Director / Lead DCC) - Lead Controller & Admin Cloud Register
- Diktum KETIGA        : Protokol "Fix Kode" dan pengarsipan otomatis ke Google Drive DCC (Folder ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF)
- Diktum KEEMPAT       : Tata kelola revisi (-rev1, tanda obsolete) dan pencatatan Master Register
- Diktum KELIMA        : Ketentuan mulai berlaku dan klausul perbaikan kekeliruan
- Klausul Penanggalan  : Ditetapkan di Semarang / Tuban pada tanggal [Tanggal]
- Tabel Tanda Tangan   : 3 Kolom Selebar Halaman:
  * Kolom 1 (Kiri)     : Disetujui Oleh (CEO - Bima Satryo Hartanto) + Meterai Rp 10.000 + TTD & Cap
  * Kolom 2 (Tengah)   : Diverifikasi Oleh (CTO - Dennis Raditya) + TTD & Cap
  * Kolom 3 (Kanan)    : Disiapkan Oleh (CFO / Lead DCC - Mazmur Gusti Agung Larosa) + TTD & Cap
=== AKHIR ACUAN TEMPLATE DOKUMEN TXT ===`;

export const STORAGE_KEY_TEMPLATE_SETTINGS = 'nbe_master_template_settings_v1';

export const DEFAULT_TEMPLATE_SETTINGS: DocumentTemplateSettings = {
  txtGuidelinesName: 'ACUAN_TEMPLATE_SURAT_KEPUTUSAN_DIREKSI_NBE.txt',
  txtGuidelinesContent: DEFAULT_TEMPLATE_GUIDELINES,
  pdfLayoutName: '0002-KB-GNR-CEO-X-2026.pdf',
  pdfLayoutDataUrl: '',
  paperSize: 'A4',
  orientation: 'portrait',
  marginTopCm: 2.0,
  marginBottomCm: 2.0,
  marginLeftCm: 2.2,
  marginRightCm: 2.0,
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
              cover_logo_data_url: settings.coverLogoDataUrl || null,
              kop_logo_data_url: settings.kopLogoDataUrl || null,
              cover_logo_width_inches: settings.coverLogoWidthInches || 3.2,
              kop_logo_width_inches: settings.kopLogoWidthInches || 0.95,
              use_as_master_template: settings.useAsMasterTemplate || false,
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

/**
 * 1. Analisis Acuan Dasar Utama: File Panduan Teks (.txt / .md)
 * Mengekstrak ukuran kertas, margin, tipografi, dan diktum dari teks panduan.
 */
export function analyzeTextGuidelines(content: string): Partial<DocumentTemplateSettings> {
  const result: Partial<DocumentTemplateSettings> = {};

  if (!content) return result;

  // Analisis Ukuran Kertas
  if (/A4/i.test(content)) {
    result.paperSize = 'A4';
  } else if (/Letter/i.test(content)) {
    result.paperSize = 'Letter';
  } else if (/F4|Folio/i.test(content)) {
    result.paperSize = 'F4';
  }

  // Analisis Margin Kiri (misal: "Kiri = 2.20 cm" atau "Margin Kiri: 2.2")
  const leftMatch = content.match(/kiri\s*[:=]\s*([\d,.]+)\s*cm/i);
  if (leftMatch) {
    result.marginLeftCm = parseFloat(leftMatch[1].replace(',', '.'));
  }

  // Analisis Margin Kanan
  const rightMatch = content.match(/kanan\s*[:=]\s*([\d,.]+)\s*cm/i);
  if (rightMatch) {
    result.marginRightCm = parseFloat(rightMatch[1].replace(',', '.'));
  }

  // Analisis Margin Atas
  const topMatch = content.match(/atas\s*[:=]\s*([\d,.]+)\s*cm/i);
  if (topMatch) {
    result.marginTopCm = parseFloat(topMatch[1].replace(',', '.'));
  }

  // Analisis Margin Bawah
  const bottomMatch = content.match(/bawah\s*[:=]\s*([\d,.]+)\s*cm/i);
  if (bottomMatch) {
    result.marginBottomCm = parseFloat(bottomMatch[1].replace(',', '.'));
  }

  // Analisis Font
  if (/Arial/i.test(content)) {
    result.fontFamily = 'Arial, sans-serif';
  } else if (/Times New Roman/i.test(content)) {
    result.fontFamily = 'Times New Roman, serif';
  } else if (/Calibri/i.test(content)) {
    result.fontFamily = 'Calibri, sans-serif';
  }

  return result;
}

/**
 * 2. Analisis Acuan Dasar Kedua: File Visual Layout (.pdf)
 * Standar crosscheck mutlak untuk tata letak, bentuk, garis, warna, dan looks dokumen.
 */
export function analyzeVisualPdfLayout(
  _fileName: string,
  _dataUrl?: string
): Partial<DocumentTemplateSettings> {
  // Standar Visual Baku NBE dari 0002-KB-GNR-CEO-X-2026.pdf (Master Acuan Visual)
  return {
    paperSize: 'A4',
    orientation: 'portrait',
    marginLeftCm: 2.2, // 2.20 cm
    marginRightCm: 2.0, // 2.00 cm
    marginTopCm: 2.0, // 2.00 cm
    marginBottomCm: 2.0, // 2.00 cm
    fontFamily: 'Arial, sans-serif',
  };
}

/**
 * ATURAN RESOLUSI KONFLIK (ATURAN 6):
 * Membandingkan hasil editan teks dengan kesesuaian tata letak, ukuran, warna, bentuk,
 * dan font dari berkas Visual Layout (.pdf).
 * JIKA TERDAPAT PERBEDAAN, MAKA BOT WAJIB BERPEDOMAN DAN MENGIKUTI FILE VISUAL LAYOUT (.PDF).
 */
export function resolveStandardAndHarmonize(
  txtSettings: Partial<DocumentTemplateSettings>,
  pdfSettings?: Partial<DocumentTemplateSettings>
): DocumentTemplateSettings {
  const current = loadTemplateSettings();
  const merged: DocumentTemplateSettings = {
    ...current,
    ...txtSettings,
  };

  // PDF Visual Layout adalah standar supreme untuk aspek visual, geometri, margin, dan tipografi
  if (pdfSettings) {
    if (pdfSettings.paperSize) merged.paperSize = pdfSettings.paperSize;
    if (pdfSettings.orientation) merged.orientation = pdfSettings.orientation;
    if (pdfSettings.marginLeftCm !== undefined) merged.marginLeftCm = pdfSettings.marginLeftCm;
    if (pdfSettings.marginRightCm !== undefined) merged.marginRightCm = pdfSettings.marginRightCm;
    if (pdfSettings.marginTopCm !== undefined) merged.marginTopCm = pdfSettings.marginTopCm;
    if (pdfSettings.marginBottomCm !== undefined) merged.marginBottomCm = pdfSettings.marginBottomCm;
    if (pdfSettings.fontFamily) merged.fontFamily = pdfSettings.fontFamily;
  }

  return merged;
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

