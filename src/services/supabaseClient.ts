import { createClient } from '@supabase/supabase-js';
import { DocumentRecord, MasterCodesState, ActivityLog } from '../types';

// Baca konfigurasi dari environment variables
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

/**
 * Konversi baris database Supabase (snake_case) ke format TypeScript DocumentRecord (camelCase)
 */
export function mapDbToDocumentRecord(row: any): DocumentRecord {
  return {
    id: row.id,
    code: row.code,
    seqNumber: Number(row.seq_number) || 0,
    typeCode: row.type_code,
    subCategoryCode: row.sub_category_code || undefined,
    subSubCategoryCode: row.sub_sub_category_code || undefined,
    divisionCode: row.division_code,
    approverCode: row.approver_code,
    monthRoman: row.month_roman,
    year: Number(row.year) || new Date().getFullYear(),
    title: row.title,
    description: row.description || undefined,
    revision: Number(row.revision) || 0,
    status: row.status || 'Published',
    createdBy: row.created_by,
    approvedBy: row.approved_by || undefined,
    verifiedBy: row.verified_by || undefined,
    issueDate: row.issue_date,
    fileName: row.file_name || undefined,
    fileSize: row.file_size ? Number(row.file_size) : undefined,
    fileType: row.file_type || undefined,
    fileUrl: row.file_url || undefined,
    googleDriveLink: row.google_drive_link || undefined,
    driveFolderId: row.drive_folder_id || undefined,
    driveFolderUrl: row.drive_folder_url || undefined,
    isFixed: Boolean(row.is_fixed),
    isFolder: Boolean(row.is_folder),
    folderName: row.folder_name || undefined,
    files: Array.isArray(row.files) ? row.files : [],
    isManualCode: Boolean(row.is_manual_code),
    legacyNotes: row.legacy_notes || undefined,
    revisions: Array.isArray(row.revisions) ? row.revisions : [],
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Konversi DocumentRecord ke baris Supabase database (snake_case)
 */
export function mapDocumentRecordToDb(doc: DocumentRecord): any {
  return {
    id: doc.id,
    code: doc.code,
    seq_number: doc.seqNumber,
    type_code: doc.typeCode,
    sub_category_code: doc.subCategoryCode || null,
    sub_sub_category_code: doc.subSubCategoryCode || null,
    division_code: doc.divisionCode,
    approver_code: doc.approverCode,
    month_roman: doc.monthRoman,
    year: doc.year,
    title: doc.title,
    description: doc.description || null,
    revision: doc.revision,
    status: doc.status,
    created_by: doc.createdBy,
    approved_by: doc.approvedBy || null,
    verified_by: doc.verifiedBy || null,
    issue_date: doc.issueDate,
    file_name: doc.fileName || null,
    file_size: doc.fileSize || null,
    file_type: doc.fileType || null,
    file_url: doc.fileUrl || null,
    google_drive_link: doc.googleDriveLink || null,
    drive_folder_id: doc.driveFolderId || null,
    drive_folder_url: doc.driveFolderUrl || null,
    is_fixed: Boolean(doc.isFixed),
    is_folder: Boolean(doc.isFolder),
    folder_name: doc.folderName || null,
    files: Array.isArray(doc.files) ? doc.files : [],
    is_manual_code: Boolean(doc.isManualCode),
    legacy_notes: doc.legacyNotes || null,
    revisions: Array.isArray(doc.revisions) ? doc.revisions : [],
  };
}

/**
 * Ambil seluruh dokumen dari Supabase
 */
export async function fetchDocumentsFromSupabase(): Promise<DocumentRecord[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Gagal memuat dokumen dari Supabase:', error.message);
      return [];
    }
    return (data || []).map(mapDbToDocumentRecord);
  } catch (err: any) {
    console.warn('Supabase fetch error:', err.message);
    return [];
  }
}

/**
 * Simpan atau perbarui dokumen di Supabase (Upsert berdasarkan ID atau Code)
 */
export async function saveDocumentToSupabase(doc: DocumentRecord): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = mapDocumentRecordToDb(doc);
    const { error } = await supabase
      .from('documents')
      .upsert(row, { onConflict: 'code' });

    if (error) {
      console.error('Gagal menyimpan dokumen ke Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Supabase save error:', err.message);
    return false;
  }
}

/**
 * Hapus dokumen dari Supabase
 */
export async function deleteDocumentFromSupabase(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) {
      console.error('Gagal menghapus dokumen dari Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Supabase delete error:', err.message);
    return false;
  }
}

/**
 * Catat log aktivitas ke Supabase
 */
export async function logActivityToSupabase(log: ActivityLog): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('activity_logs').insert({
      id: log.id,
      user_name: log.userName,
      user_role: log.userRole,
      action: log.action,
      details: log.details,
      document_code: log.documentCode || null,
      type: log.type,
      timestamp: log.timestamp || new Date().toISOString(),
    });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Ambil master codes dari Supabase
 */
export async function fetchMasterCodesFromSupabase(): Promise<Partial<MasterCodesState> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('master_codes').select('*');
    if (error || !data) return null;

    const result: Partial<MasterCodesState> = {
      documentTypes: [],
      subCategories: [],
      subSubCategories: [],
      divisions: [],
      approvers: [],
    };

    data.forEach((row: any) => {
      const group = row.category_group as keyof MasterCodesState;
      if (result[group]) {
        result[group]!.push({
          code: row.code,
          label: row.label,
          description: row.description || '',
          isCustom: Boolean(row.is_custom),
        });
      }
    });

    return result;
  } catch {
    return null;
  }
}
