export type DocumentTypeCode = 'SOP' | 'WIK' | 'MNL' | 'KB';

export type DocumentLanguage = 'id' | 'en' | 'bi';

export type DivisionCode = 'GNR' | 'ENG' | 'OPR' | 'FNC';

export type ApproverCode = 'CEO' | 'CTO' | 'COO' | 'CFO' | 'MNG' | 'SPV';

export type DocumentStatus = 'Draft' | 'In Review' | 'Approved' | 'Published' | 'Archived';

export interface RevisionRecord {
  revision: number;
  date: string;
  description: string;
  revisedBy: string;
}

export interface DocumentFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string; // Base64 data or object URL for local preview
  fileUrl?: string; // Direct URL if hosted
  googleDriveLink?: string; // Direct link to file in Google Drive
  driveFileId?: string;
  relativePath?: string; // Path inside folder (e.g. subfolder/file.pdf)
  uploadedAt?: string;
}

export interface DocumentRecord {
  id: string;
  code: string; // e.g. "0001-CSMS-GP/AI-FNC-CFO-IX-2026"
  seqNumber: number; // sequential number per document type
  typeCode: string; // SOP, WIK, MNL, KB, CSMS, etc.
  subCategoryCode?: string; // GP, KM, PB, PE, PR, etc. (Kode ZZ)
  subSubCategoryCode?: string; // AI, PB, PD, IK, etc. (Kode AA)
  divisionCode: string; // GNR, ENG, OPR, FNC
  approverCode: string; // CEO, CTO, COO, CFO, MNG, SPV
  monthRoman: string; // e.g. IX
  year: number; // e.g. 2026
  
  title: string;
  description?: string;
  revision: number;
  status: DocumentStatus;
  
  createdBy: string;
  approvedBy?: string;
  verifiedBy?: string;
  issueDate: string; // YYYY-MM-DD
  language?: DocumentLanguage; // id | en | bi
  
  // File Storage & Google Drive
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileData?: string; // Base64 data or object URL for local preview
  fileUrl?: string; // Direct URL if hosted (e.g. /0001-SOP-GNR-CEO-IX-2026.pdf)
  googleDriveLink?: string; // Link to Google Drive file or folder
  driveFolderId?: string; // ID of dedicated folder created in Google Drive for this document
  driveFolderUrl?: string; // Direct link to the dedicated folder in Google Drive
  isFixed?: boolean; // Flag indicating if the document code has been fixed

  // Multi-File & Folder Support
  isFolder?: boolean;
  folderName?: string;
  files?: DocumentFileItem[];

  // Legacy / Manual override flag
  isManualCode?: boolean;
  legacyNotes?: string;
  
  revisions: RevisionRecord[];
  
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  documentCode?: string;
  type: 'create' | 'update' | 'delete' | 'export' | 'system';
}

export interface CodeDefinition {
  code: string;
  label: string;
  description: string;
  isCustom?: boolean;
}

export interface MasterCodesState {
  documentTypes: CodeDefinition[];
  subCategories: CodeDefinition[];
  subSubCategories: CodeDefinition[];
  divisions: CodeDefinition[];
  approvers: CodeDefinition[];
}

export const DOCUMENT_TYPES: CodeDefinition[] = [
  { code: 'SOP', label: 'Standard Operating Procedure (SOP)', description: 'Prosedur operasional baku organisasi dan departemen' },
  { code: 'FOR', label: 'Formulir (FOR)', description: 'Formulir isian baku dan format rekaman mutu operasional' },
  { code: 'POL', label: 'Policy / Kebijakan (POL)', description: 'Kebijakan perusahaan dan panduan tingkat direksi' },
  { code: 'WIK', label: 'Work Instruction (WIK)', description: 'Instruksi kerja rinci operasional cross-departemen & spesifik' },
  { code: 'MNL', label: 'Manual (MNL)', description: 'Panduan sistem manajemen terintegrasi perusahaan' },
  { code: 'KB', label: 'Policy (KB)', description: 'Kebijakan utama dan arahan strategis perusahaan' },
  { code: 'CSMS', label: 'Contractor Safety Management System (CSMS)', description: 'Untuk dokumen khusus dengan peruntukan kelengkapan prosedur CSMS' },
];

export const SUB_CATEGORIES: CodeDefinition[] = [
  { code: 'GP', label: 'General Procedure (GP)', description: 'Prosedur umum operasional' },
  { code: 'KM', label: 'Komitmen Management (KM)', description: 'Kebijakan komitmen manajemen dan kepemimpinan' },
  { code: 'PB', label: 'Pembinaan (PB)', description: 'Pembinaan, pelatihan, dan pengembangan kompetensi' },
  { code: 'PE', label: 'Peralatan (PE)', description: 'Pengelolaan, inspeksi, dan sertifikasi peralatan' },
  { code: 'PR', label: 'Procedure (PR)', description: 'Prosedur teknis dan operasional spesifik' },
];

export const SUB_SUB_CATEGORIES: CodeDefinition[] = [
  { code: 'AI', label: 'Audit Internal (AI)', description: 'Audit Internal' },
  { code: 'PB', label: 'Pembatasan Area Berbahaya (PB)', description: 'Pembatasan Area Berbahaya' },
  { code: 'PD', label: 'Pengendalian Dokumen (PD)', description: 'Pengendalian Dokumen' },
  { code: 'IK', label: 'Izin kerja Beresiko Tinggi (IK)', description: 'Izin kerja Beresiko Tinggi' },
  { code: 'BP', label: 'Pemberian Briefing de Briefing kepada pelanggan (BP)', description: 'Pemberian Briefing de Briefing kepada pelanggan' },
  { code: 'PR', label: 'Pengendalian Rancangan (PR)', description: 'Pengendalian Rancangan' },
  { code: 'KR', label: 'Prosedur Kalibrasi (KR)', description: 'Prosedur Kalibrasi' },
  { code: 'PM', label: 'Penanganan Manual & Mekanis (PM)', description: 'Penanganan Manual & Mekanis' },
  { code: 'MR', label: 'Management Resiko (MR)', description: 'Management Resiko' },
  { code: 'PK', label: 'Pengelolaan Data K3 (PK)', description: 'Pengelolaan Data K3' },
];

export const DIVISIONS: CodeDefinition[] = [
  { code: 'GNR', label: 'General (GNR)', description: 'Umum, Perusahaan, dan Lintas Divisi' },
  { code: 'ENG', label: 'Engineering (ENG)', description: 'Divisi Teknik & Rekayasa' },
  { code: 'OPR', label: 'Operation (OPR)', description: 'Divisi Operasional Lapangan & Pabrik' },
  { code: 'FNC', label: 'Finance (FNC)', description: 'Divisi Keuangan, Akuntansi & Perpajakan' },
  { code: 'AUD', label: 'Internal Audit (AUD)', description: 'Audit Internal & Kepatuhan' },
  { code: 'HSE', label: 'Health, Safety & Environment (HSE)', description: 'Keselamatan, Kesehatan Kerja & Lingkungan' },
  { code: 'IMS', label: 'Integrated Management System (IMS)', description: 'Sistem Manajemen Terintegrasi' },
  { code: 'HRD', label: 'Human Resources (HRD)', description: 'Sumber Daya Manusia' },
];

export const APPROVERS: CodeDefinition[] = [
  { code: 'CEO', label: 'President Director (CEO)', description: 'Direktur Utama - Pengesahan Dokumen Utama / General' },
  { code: 'CTO', label: 'Technical Director (CTO)', description: 'Direktur Teknik - Pengesahan Prosedur Engineering' },
  { code: 'COO', label: 'Operational Director (COO)', description: 'Direktur Operasional - Pengesahan Prosedur Operation' },
  { code: 'CFO', label: 'Finance Director (CFO)', description: 'Direktur Keuangan - Pengesahan Prosedur Finance' },
  { code: 'MNG', label: 'Manager (MNG)', description: 'Kepala Bagian / Departemen Manager' },
  { code: 'SPV', label: 'Supervisor (SPV)', description: 'Penyelia / Supervisor Lapangan' },
];

export const ROMAN_MONTHS: { [key: number]: string } = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
  11: 'XI',
  12: 'XII',
};

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
