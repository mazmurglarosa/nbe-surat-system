export type DocumentTypeCode = 'SOP' | 'WIK' | 'MNL' | 'KB';

export type DivisionCode = 'GNR' | 'ENG' | 'OPR' | 'FNC';

export type ApproverCode = 'CEO' | 'CTO' | 'COO' | 'CFO' | 'MNG' | 'SPV';

export type DocumentStatus = 'Draft' | 'In Review' | 'Approved' | 'Published' | 'Archived';

export interface RevisionRecord {
  revision: number;
  date: string;
  description: string;
  revisedBy: string;
}

export interface DocumentRecord {
  id: string;
  code: string; // e.g. "0001-SOP-ENG-CTO-IX-2026"
  seqNumber: number; // sequential number per document type
  typeCode: string; // SOP, WIK, MNL, KB
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
  
  // File Storage & Google Drive
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileData?: string; // Base64 data or object URL for local preview
  fileUrl?: string; // Direct URL if hosted (e.g. /0001-SOP-GNR-CEO-IX-2026.pdf)
  googleDriveLink?: string; // Link to Google Drive file or folder
  
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
  divisions: CodeDefinition[];
  approvers: CodeDefinition[];
}

export const DOCUMENT_TYPES: CodeDefinition[] = [
  { code: 'SOP', label: 'Standard Operating Procedure (SOP)', description: 'Prosedur operasional baku organisasi dan departemen' },
  { code: 'WIK', label: 'Work Instruction (WIK)', description: 'Instruksi kerja rinci operasional cross-departemen & spesifik' },
  { code: 'MNL', label: 'Manual (MNL)', description: 'Panduan sistem manajemen terintegrasi perusahaan' },
  { code: 'KB', label: 'Policy (KB)', description: 'Kebijakan utama dan arahan strategis perusahaan' },
];

export const DIVISIONS: CodeDefinition[] = [
  { code: 'GNR', label: 'General (GNR)', description: 'Umum, Perusahaan, dan Lintas Divisi' },
  { code: 'ENG', label: 'Engineering (ENG)', description: 'Divisi Teknik & Rekayasa' },
  { code: 'OPR', label: 'Operation (OPR)', description: 'Divisi Operasional Lapangan & Pabrik' },
  { code: 'FNC', label: 'Finance (FNC)', description: 'Divisi Keuangan, Akuntansi & Perpajakan' },
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
