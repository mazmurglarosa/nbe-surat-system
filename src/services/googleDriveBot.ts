export interface BotUploadResult {
  success: boolean;
  fileId?: string;
  viewUrl?: string;
  downloadUrl?: string;
  error?: string;
  message?: string;
}

export interface BotFolderResult {
  success: boolean;
  folderId?: string;
  folderUrl?: string;
  folderName?: string;
  parentFolderId?: string;
  parentFolderName?: string;
  error?: string;
  message?: string;
}

export const TARGET_FOLDER_ID = '1ntut9Zjoc8tT5neNR2wUKMCkxIZvoS8U';
export const TARGET_FOLDER_URL =
  'https://drive.google.com/drive/folders/1ntut9Zjoc8tT5neNR2wUKMCkxIZvoS8U';

/**
 * Ekstrak ID Folder Google Drive dari URL folder atau string ID langsung.
 * Mendukung berbagai format link Google Drive:
 * - https://drive.google.com/drive/folders/1ntut9Zjoc8tT5neNR2wUKMCkxlZvoS8U?usp=sharing
 * - https://drive.google.com/drive/u/0/folders/1ntut9Zjoc8tT5neNR2wUKMCkxlZvoS8U
 * - https://drive.google.com/open?id=1ntut9Zjoc8tT5neNR2wUKMCkxlZvoS8U
 * - 1ntut9Zjoc8tT5neNR2wUKMCkxlZvoS8U (ID langsung)
 */
export function extractDriveFolderId(input?: string): string {
  if (!input) return TARGET_FOLDER_ID;
  const trimmed = input.trim();
  if (!trimmed) return TARGET_FOLDER_ID;

  // Pola /folders/ID
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/i);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // Pola id=ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // Jika input adalah raw ID (karakter alphanum/dash/underscore minimal 15 karakter dan tidak mengandung slash)
  if (!trimmed.includes('/') && /^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed || TARGET_FOLDER_ID;
}

/**
 * Format link folder Google Drive yang valid dari URL atau Folder ID
 */
export function formatDriveFolderUrl(input?: string): string {
  const id = extractDriveFolderId(input);
  return `https://drive.google.com/drive/folders/${id}?usp=sharing`;
}

const CATEGORY_FOLDERS_STORAGE_KEY = 'nbe_gdrive_category_folders';

/**
 * Format nama folder kategori di Google Drive
 * Contoh: "SOP - Standard Operating Procedure", "CSMS - Contractor Safety Management System"
 */
export function getCategoryFolderName(code: string, label?: string): string {
  const cleanCode = code.trim().toUpperCase();
  if (!label) return cleanCode;
  const cleanLabel = label.replace(/\s*\([^)]*\)/g, '').trim();
  return cleanLabel ? `${cleanCode} - ${cleanLabel}` : cleanCode;
}

export function getStoredCategoryFolderIds(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CATEGORY_FOLDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredCategoryFolderId(code: string, folderId: string): void {
  try {
    const current = getStoredCategoryFolderIds();
    current[code.toUpperCase()] = folderId;
    localStorage.setItem(CATEGORY_FOLDERS_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to cache category folder ID:', err);
  }
}

/**
 * Buat folder baru di Google Drive melalui Webhook Bot Google Apps Script.
 */
export async function createFolderInDriveViaBot(
  folderName: string,
  webhookUrl: string,
  parentFolderId: string = TARGET_FOLDER_ID,
  options?: {
    categoryCode?: string;
    categoryName?: string;
  }
): Promise<BotFolderResult> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com')) {
    return {
      success: false,
      error:
        'URL Webhook Bot Google Apps Script belum dikonfigurasi. Silakan buka menu Pengaturan Google Drive.',
    };
  }

  try {
    const payload: Record<string, any> = {
      action: 'create_folder',
      folderName: folderName,
      parentId: parentFolderId,
    };

    if (options?.categoryCode) payload.categoryCode = options.categoryCode;
    if (options?.categoryName) payload.categoryName = options.categoryName;

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.status === 'success' || result.success) {
      return {
        success: true,
        folderId: result.folderId,
        folderUrl:
          result.folderUrl ||
          `https://drive.google.com/drive/folders/${result.folderId}`,
        folderName: result.folderName || folderName,
        parentFolderId: result.parentFolderId || parentFolderId,
        parentFolderName: result.parentFolderName,
        message:
          result.message ||
          `Folder Google Drive '${folderName}' berhasil dibuat!`,
      };
    } else {
      let rawMsg = result.message || '';
      if (rawMsg.includes('Argument cannot be null: data')) {
        rawMsg =
          'Script bot di Google Drive Anda masih versi lama (belum ada fungsi create_folder). Buka Pengaturan Google Drive > Salin Script Bot terbaru > Deploy "Versi Baru" di script.google.com.';
      }
      return {
        success: false,
        error:
          rawMsg || 'Bot Google Drive gagal membuat folder baru.',
      };
    }
  } catch (err: any) {
    let errText = err.message || '';
    if (errText.includes('Argument cannot be null: data')) {
      errText =
        'Script bot di Google Drive Anda masih versi lama (belum ada fungsi create_folder). Buka Pengaturan Google Drive > Salin Script Bot terbaru > Deploy "Versi Baru" di script.google.com.';
    }
    return {
      success: false,
      error: `Koneksi ke Bot Google Drive bermasalah: ${errText}`,
    };
  }
}

/**
 * Pastikan folder untuk Kategori Surat (Document Type) sudah dibuat di Google Drive.
 * Contoh: SOP, WIK, MNL, KB, CSMS, dst.
 */
export async function ensureCategoryFolderInDriveViaBot(
  categoryCode: string,
  categoryLabel: string | undefined,
  webhookUrl: string,
  rootFolderId: string = TARGET_FOLDER_ID
): Promise<BotFolderResult> {
  const folderName = getCategoryFolderName(categoryCode, categoryLabel);
  const cachedIds = getStoredCategoryFolderIds();
  const cachedId = cachedIds[categoryCode.toUpperCase()];

  // Buat atau temukan folder kategori di root TARGET_FOLDER_ID
  const result = await createFolderInDriveViaBot(
    folderName,
    webhookUrl,
    rootFolderId
  );

  if (result.success && result.folderId) {
    saveStoredCategoryFolderId(categoryCode, result.folderId);
  } else if (cachedId) {
    // Fallback ke cache jika ada
    return {
      success: true,
      folderId: cachedId,
      folderUrl: `https://drive.google.com/drive/folders/${cachedId}`,
      folderName: folderName,
    };
  }

  return result;
}

/**
 * Buat folder dokumen (misal 0001-SOP-GP-ENG-CTO-IX-2026) langsung DI DALAM folder Kategori Surat yang sesuai.
 */
export async function createDocumentFolderInDriveViaBot(
  documentCode: string,
  categoryCode: string,
  categoryLabel: string | undefined,
  webhookUrl: string,
  rootFolderId: string = TARGET_FOLDER_ID
): Promise<BotFolderResult & { categoryFolderId?: string; categoryFolderName?: string }> {
  const catFolderName = getCategoryFolderName(categoryCode, categoryLabel);

  // 1. Pastikan folder kategori induk sudah ada di Google Drive
  const catResult = await ensureCategoryFolderInDriveViaBot(
    categoryCode,
    categoryLabel,
    webhookUrl,
    rootFolderId
  );

  const parentFolderId = catResult.folderId || rootFolderId;

  // 2. Buat folder untuk dokumen di dalam folder kategori tersebut
  const docFolderResult = await createFolderInDriveViaBot(
    documentCode,
    webhookUrl,
    parentFolderId,
    {
      categoryCode,
      categoryName: catFolderName,
    }
  );

  return {
    ...docFolderResult,
    categoryFolderId: catResult.folderId,
    categoryFolderName: catFolderName,
    message: docFolderResult.success
      ? `Folder Google Drive "${documentCode}" berhasil dibuat di dalam kategori "${catFolderName}"!`
      : docFolderResult.error,
  };
}

/**
 * Sinkronisasikan seluruh folder Kategori Surat yang ada ke Google Drive
 */
export async function syncAllCategoriesToDriveViaBot(
  categories: { code: string; label?: string }[],
  webhookUrl: string,
  rootFolderId: string = TARGET_FOLDER_ID
): Promise<{ successCount: number; errors: string[] }> {
  let successCount = 0;
  const errors: string[] = [];

  for (const cat of categories) {
    try {
      const res = await ensureCategoryFolderInDriveViaBot(
        cat.code,
        cat.label,
        webhookUrl,
        rootFolderId
      );
      if (res.success) {
        successCount++;
      } else {
        errors.push(`Kategori ${cat.code}: ${res.error || 'Gagal'}`);
      }
    } catch (err: any) {
      errors.push(`Kategori ${cat.code}: ${err.message}`);
    }
  }

  return { successCount, errors };
}

/**
 * Hapus folder dan berkas terkait di Google Drive ketika surat dihapus dari sistem.
 */
export async function deleteDocumentAndFolderFromDriveViaBot(
  options: {
    folderId?: string;
    fileId?: string;
    documentCode?: string;
  },
  webhookUrl: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com')) {
    return {
      success: false,
      error: 'URL Webhook Bot Google Apps Script belum dikonfigurasi.',
    };
  }

  try {
    const payload = {
      action: 'delete',
      folderId: options.folderId,
      fileId: options.fileId,
      documentCode: options.documentCode,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.status === 'success' || result.success) {
      return {
        success: true,
        message:
          result.message ||
          'Folder dan berkas di Google Drive berhasil dihapus.',
      };
    } else {
      return {
        success: false,
        error: result.message || 'Gagal menghapus berkas di Google Drive.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `Koneksi ke Bot Google Drive bermasalah: ${err.message}`,
    };
  }
}

/**
 * Upload file to Google Drive via Google Apps Script Webhook Bot
 */
export async function uploadFileToDriveViaBot(
  base64Data: string,
  fileName: string,
  mimeType: string,
  webhookUrl: string,
  options?: {
    folderId?: string;
    documentCode?: string;
    uploadedBy?: string;
    isRevision?: boolean;
    revision?: number;
  }
): Promise<BotUploadResult> {
  const folderId = options?.folderId || TARGET_FOLDER_ID;

  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com')) {
    return {
      success: false,
      error:
        'URL Webhook Bot Google Apps Script belum dikonfigurasi. Silakan salin & pasang script bot di menu Google Drive.',
    };
  }

  try {
    // Strip header if dataURL format: "data:application/pdf;base64,..."
    const cleanBase64 = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    const payload = {
      action: 'upload',
      folderId: folderId,
      fileName: fileName,
      mimeType: mimeType || 'application/pdf',
      base64: cleanBase64,
      documentCode: options?.documentCode || '',
      uploadedBy: options?.uploadedBy || 'Admin NBE',
      isRevision: options?.isRevision || false,
      revision: options?.revision,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Prevents CORS preflight in Apps Script
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.status === 'success' || result.success) {
      return {
        success: true,
        fileId: result.fileId,
        viewUrl:
          result.viewUrl ||
          `https://drive.google.com/file/d/${result.fileId}/view`,
        downloadUrl: result.downloadUrl,
        message:
          result.message || 'File berhasil diunggah ke Google Drive oleh Bot!',
      };
    } else {
      return {
        success: false,
        error:
          result.message || 'Bot Google Drive gagal memproses unggahan file.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `Koneksi ke Bot Google Drive bermasalah: ${err.message}. Pastikan setting akses Web App di Google Apps Script adalah "Anyone (Siapa saja)".`,
    };
  }
}

/**
 * Test connectivity to Google Apps Script Webhook Bot
 */
export async function testBotConnection(webhookUrl: string): Promise<{
  success: boolean;
  message: string;
  botName?: string;
}> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com')) {
    return {
      success: false,
      message:
        'Format URL Webhook salah. Harus diawali dengan https://script.google.com',
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'GET',
    });

    const result = await response.json();
    if (result.status === 'online' || result.bot) {
      return {
        success: true,
        message: `Bot aktif dan siap digunakan! (Target Folder ID: ${result.targetFolder || TARGET_FOLDER_ID})`,
        botName: result.bot || 'NBE Google Drive Bot',
      };
    } else {
      return {
        success: true,
        message: 'Bot merespons dengan baik, siap menerima unggahan dokumen.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi bot: ${err.message}. Pastikan izin deployment Google Apps Script diatur ke "Who has access: Anyone".`,
    };
  }
}

/**
 * Register a document to Google Drive automatically via Bot.
 * If file is uploaded, writes the file directly to the dedicated folder or root target folder.
 * If no file is uploaded, creates an official document registration record in the folder.
 */
export async function registerDocumentInDriveViaBot(
  doc: {
    code: string;
    title: string;
    typeCode: string;
    divisionCode: string;
    approverCode: string;
    createdBy: string;
    approvedBy?: string;
    issueDate: string;
    description?: string;
  },
  fileData: {
    dataUrl?: string;
    name?: string;
    type?: string;
  } | null,
  webhookUrl: string,
  folderId: string = TARGET_FOLDER_ID
): Promise<BotUploadResult> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com')) {
    return {
      success: false,
      error: 'URL Webhook Bot Google Apps Script belum dikonfigurasi.',
    };
  }

  try {
    let cleanBase64 = '';
    if (fileData?.dataUrl) {
      cleanBase64 = fileData.dataUrl.includes(',')
        ? fileData.dataUrl.split(',')[1]
        : fileData.dataUrl;
    }

    const payload = {
      action: fileData?.dataUrl ? 'upload' : 'register',
      folderId: folderId,
      documentCode: doc.code,
      title: doc.title,
      typeCode: doc.typeCode,
      divisionCode: doc.divisionCode,
      approverCode: doc.approverCode,
      createdBy: doc.createdBy,
      approvedBy: doc.approvedBy || '',
      issueDate: doc.issueDate,
      description: doc.description || '',
      fileName: fileData?.name || `${doc.code}_Registrasi.txt`,
      mimeType:
        fileData?.type ||
        (fileData?.dataUrl ? 'application/pdf' : 'text/plain'),
      base64: cleanBase64,
      uploadedBy: doc.createdBy,
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.status === 'success' || result.success) {
      return {
        success: true,
        fileId: result.fileId,
        viewUrl:
          result.viewUrl ||
          `https://drive.google.com/file/d/${result.fileId}/view`,
        downloadUrl: result.downloadUrl,
        message:
          result.message ||
          'Dokumen berhasil didaftarkan langsung ke Google Drive oleh Bot!',
      };
    } else {
      return {
        success: false,
        error:
          result.message ||
          'Bot Google Drive gagal memproses pendaftaran dokumen.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `Koneksi ke Bot Google Drive bermasalah: ${err.message}`,
    };
  }
}

/**
 * Ambil seluruh database dari Cloud Google Drive via Bot Webhook
 */
export async function fetchDatabaseFromCloudBot(webhookUrl: string): Promise<{
  success: boolean;
  documents?: any[];
  masterCodes?: any;
  activityLogs?: any[];
  lastUpdated?: string;
  error?: string;
}> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com')) {
    return { success: false, error: 'Webhook URL belum terkonfigurasi' };
  }

  try {
    // Coba via GET terlebih dahulu
    const getUrl = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}action=get_database&t=${Date.now()}`;
    const res = await fetch(getUrl, {
      method: 'GET',
    });
    const result = await res.json();

    const rawDocs = Array.isArray(result.documents)
      ? result.documents
      : (result.database && Array.isArray(result.database.documents))
      ? result.database.documents
      : null;

    if (rawDocs !== null) {
      return {
        success: true,
        documents: rawDocs,
        masterCodes: result.masterCodes || (result.database && result.database.masterCodes) || null,
        activityLogs: result.activityLogs || (result.database && result.database.activityLogs) || [],
        lastUpdated: result.lastUpdated || result.timestamp,
      };
    }

    // Jika bot hanya merespons status: online (ping lama tanpa database), jangan anggap sebagai database
    if (result.status === 'online' && !result.documents) {
      return {
        success: false,
        error: 'Bot online tapi skrip bot belum diperbarui ke versi cloud database',
      };
    }
  } catch (getErr) {
    // Fallback coba via POST jika GET gagal
    try {
      const postRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'get_database' }),
      });
      const postResult = await postRes.json();
      const rawDocs = Array.isArray(postResult.documents)
        ? postResult.documents
        : (postResult.database && Array.isArray(postResult.database.documents))
        ? postResult.database.documents
        : null;

      if (rawDocs !== null) {
        return {
          success: true,
          documents: rawDocs,
          masterCodes: postResult.masterCodes || null,
          activityLogs: postResult.activityLogs || [],
          lastUpdated: postResult.lastUpdated,
        };
      }
    } catch (postErr: any) {
      return { success: false, error: postErr.message || 'Gagal mengambil database dari cloud' };
    }
  }

  return { success: false, error: 'Respon dari Google Drive bot tidak valid' };
}

/**
 * Simpan atau perbarui 1 dokumen ke Cloud Database Google Drive via Bot
 */
export async function saveDocumentToCloudBot(
  doc: any,
  webhookUrl: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com')) {
    return { success: false, error: 'Webhook URL belum disetel' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'save_document',
        document: doc,
      }),
    });
    const result = await res.json();
    return {
      success: result.status === 'success' || result.success,
      message: result.message,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Hapus dokumen dari Cloud Database Google Drive via Bot
 */
export async function deleteDocumentRecordFromCloudBot(
  docId: string,
  docCode: string,
  webhookUrl: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com')) {
    return { success: false, error: 'Webhook URL belum disetel' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'delete_document_record',
        documentId: docId,
        documentCode: docCode,
      }),
    });
    const result = await res.json();
    return {
      success: result.status === 'success' || result.success,
      message: result.message,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Sinkronkan seluruh koleksi dokumen ke Cloud Database Google Drive via Bot
 */
export async function syncAllToCloudBot(
  documents: any[],
  masterCodes: any,
  activityLogs: any[],
  webhookUrl: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com')) {
    return { success: false, error: 'Webhook URL belum disetel' };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sync_database',
        documents: documents,
        masterCodes: masterCodes,
        activityLogs: activityLogs,
      }),
    });
    const result = await res.json();
    return {
      success: result.status === 'success' || result.success,
      message: result.message,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Ready-to-deploy Google Apps Script Code for the Bot Account (Multi-Device Real-Time Cloud Ready)
 */
export function getGoogleAppsScriptBotCode(folderId: string = TARGET_FOLDER_ID): string {
  const activeFolderId = extractDriveFolderId(folderId);
  return `/**
 * ============================================================
 * BOT GOOGLE DRIVE & CLOUD DATABASE - PT NIRWANA BHUMI ENERGI (NBE)
 * Fitur:
 * 1. REAL-TIME MULTI-DEVICE CLOUD DATABASE (action: "get_database", "sync_database", "save_document")
 * 2. Otomatis buat folder kategori & folder dokumen bersarang (action: "create_folder")
 * 3. Upload dokumen fisik & revisi ke folder kode surat (action: "upload")
 * 4. Otomatis ubah nama file revisi menjadi: [KodeSurat]-rev1, -rev2, dst
 * 5. Otomatis hapus folder dan file di Google Drive saat surat dihapus (action: "delete")
 * ============================================================
 */

var TARGET_FOLDER_ID = "${activeFolderId}";
var DB_FILE_NAME = "nbe_cloud_database.json";

function getDatabaseFile(targetFolder) {
  var files = targetFolder.getFilesByName(DB_FILE_NAME);
  if (files.hasNext()) {
    return files.next();
  }
  return null;
}

function readDatabase(targetFolder) {
  var file = getDatabaseFile(targetFolder);
  if (!file) {
    return {
      documents: [],
      masterCodes: null,
      activityLogs: [],
      lastUpdated: new Date().toISOString()
    };
  }
  try {
    var content = file.getBlob().getDataAsString();
    return JSON.parse(content);
  } catch (err) {
    return {
      documents: [],
      masterCodes: null,
      activityLogs: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

function writeDatabase(targetFolder, dbData) {
  dbData.lastUpdated = new Date().toISOString();
  var content = JSON.stringify(dbData, null, 2);
  var file = getDatabaseFile(targetFolder);
  if (file) {
    file.setContent(content);
  } else {
    file = targetFolder.createFile(DB_FILE_NAME, content, MimeType.PLAIN_TEXT);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}
  }
  return dbData;
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        success: false,
        message: "No payload received"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var rootFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);

    // ========================================================
    // AKSI 1: AMBIL SELURUH DATABASE CLOUD (GET_DATABASE)
    // ========================================================
    if (data.action === "get_database" || data.action === "read_database") {
      var db = readDatabase(rootFolder);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        success: true,
        documents: db.documents || [],
        masterCodes: db.masterCodes || null,
        activityLogs: db.activityLogs || [],
        lastUpdated: db.lastUpdated || new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ========================================================
    // AKSI 2: SINKRONKAN SELURUH DATABASE KE CLOUD (SYNC_DATABASE)
    // ========================================================
    if (data.action === "sync_database" || data.action === "save_all_documents") {
      var currentDb = readDatabase(rootFolder);
      if (Array.isArray(data.documents)) {
        currentDb.documents = data.documents;
      }
      if (data.masterCodes) {
        currentDb.masterCodes = data.masterCodes;
      }
      if (Array.isArray(data.activityLogs)) {
        currentDb.activityLogs = data.activityLogs;
      }
      writeDatabase(rootFolder, currentDb);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        success: true,
        message: "Database cloud berhasil disinkronkan ke Google Drive!",
        totalDocuments: (currentDb.documents || []).length,
        lastUpdated: currentDb.lastUpdated
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ========================================================
    // AKSI 3: SIMPAN / UPDATE 1 DOKUMEN KE CLOUD (SAVE_DOCUMENT)
    // ========================================================
    if (data.action === "save_document") {
      var currentDb = readDatabase(rootFolder);
      var docs = currentDb.documents || [];
      var newDoc = data.document;
      if (newDoc && newDoc.id) {
        var idx = -1;
        for (var i = 0; i < docs.length; i++) {
          if (docs[i].id === newDoc.id || docs[i].code === newDoc.code) {
            idx = i;
            break;
          }
        }
        if (idx >= 0) {
          docs[idx] = newDoc;
        } else {
          docs.unshift(newDoc);
        }
        currentDb.documents = docs;
        writeDatabase(rootFolder, currentDb);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        success: true,
        message: "Dokumen berhasil disimpan ke database cloud Google Drive!",
        totalDocuments: docs.length,
        lastUpdated: currentDb.lastUpdated
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ========================================================
    // AKSI 4: HAPUS DOKUMEN DARI DATABASE CLOUD (DELETE_DOCUMENT_RECORD)
    // ========================================================
    if (data.action === "delete_document_record") {
      var currentDb = readDatabase(rootFolder);
      var docs = currentDb.documents || [];
      var targetId = data.documentId;
      var targetCode = data.documentCode;
      var filtered = [];
      for (var i = 0; i < docs.length; i++) {
        if ((targetId && docs[i].id === targetId) || (targetCode && docs[i].code === targetCode)) {
          continue;
        }
        filtered.push(docs[i]);
      }
      currentDb.documents = filtered;
      writeDatabase(rootFolder, currentDb);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        success: true,
        message: "Dokumen berhasil dihapus dari database cloud Google Drive!",
        totalDocuments: filtered.length,
        lastUpdated: currentDb.lastUpdated
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ========================================================
    // AKSI 5: BUAT / CARI FOLDER DOKUMEN & KATEGORI (TOMBOL FIX KODE)
    // ========================================================
    if (data.action === "create_folder" || data.action === "find_or_create_folder") {
      var folderName = data.folderName || data.documentCode || "Dokumen_NBE";
      var parentId = data.parentId || TARGET_FOLDER_ID;
      var parentFolder = DriveApp.getFolderById(parentId);

      if (data.categoryName || data.categoryCode) {
        var catName = data.categoryName || data.categoryCode;
        var existingCatFolders = parentFolder.getFoldersByName(catName);
        var catFolder;
        if (existingCatFolders.hasNext()) {
          catFolder = existingCatFolders.next();
        } else {
          catFolder = parentFolder.createFolder(catName);
          try {
            catFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (eCatShare) {}
        }
        parentFolder = catFolder;
      }

      var existingFolders = parentFolder.getFoldersByName(folderName);
      var targetFolder;
      if (existingFolders.hasNext()) {
        targetFolder = existingFolders.next();
      } else {
        targetFolder = parentFolder.createFolder(folderName);
      }

      try {
        targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (errSharing) {}

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        success: true,
        folderId: targetFolder.getId(),
        folderUrl: targetFolder.getUrl(),
        folderName: targetFolder.getName(),
        parentFolderId: parentFolder.getId(),
        parentFolderName: parentFolder.getName(),
        message: "Folder Google Drive '" + folderName + "' berhasil disiapkan!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ========================================================
    // AKSI 6: HAPUS SURAT & FOLDER DI GOOGLE DRIVE (DELETE)
    // ========================================================
    if (data.action === "delete" || data.action === "delete_folder") {
      var deletedItems = [];

      if (data.folderId && data.folderId !== TARGET_FOLDER_ID) {
        try {
          var fld = DriveApp.getFolderById(data.folderId);
          fld.setTrashed(true);
          deletedItems.push("Folder ID: " + data.folderId);
        } catch (errFld) {}
      } else if (data.documentCode) {
        try {
          var rootF = DriveApp.getFolderById(TARGET_FOLDER_ID);
          var subFolders = rootF.getFoldersByName(data.documentCode);
          while (subFolders.hasNext()) {
            var sf = subFolders.next();
            sf.setTrashed(true);
            deletedItems.push("Folder: " + sf.getName());
          }
          var catFolders = rootF.getFolders();
          while (catFolders.hasNext()) {
            var cf = catFolders.next();
            var docSub = cf.getFoldersByName(data.documentCode);
            while (docSub.hasNext()) {
              var dsf = docSub.next();
              dsf.setTrashed(true);
              deletedItems.push("Folder (" + cf.getName() + "): " + dsf.getName());
            }
          }
        } catch (errSearch) {}
      }

      if (data.fileId) {
        try {
          var fl = DriveApp.getFileById(data.fileId);
          fl.setTrashed(true);
          deletedItems.push("File ID: " + data.fileId);
        } catch (errFile) {}
      }

      // Hapus juga dari nbe_cloud_database.json
      if (data.documentCode) {
        var currentDb = readDatabase(rootFolder);
        var docs = currentDb.documents || [];
        var filtered = docs.filter(function(d) { return d.code !== data.documentCode; });
        currentDb.documents = filtered;
        writeDatabase(rootFolder, currentDb);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        success: true,
        deletedItems: deletedItems,
        message: "Folder dan dokumen di Google Drive berhasil dihapus otomatis."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ========================================================
    // AKSI 7: UPLOAD DOKUMEN / REVISI DOKUMEN
    // ========================================================
    var folderId = data.folderId || TARGET_FOLDER_ID;
    var folder = DriveApp.getFolderById(folderId);
    var file;
    var rawFileName = data.fileName || (data.documentCode ? data.documentCode + ".pdf" : "dokumen-nbe.pdf");
    var fileName = rawFileName;

    if (data.isRevision && data.documentCode) {
      var revSuffix = "-rev" + (data.revision !== undefined ? data.revision : 1);
      var ext = "";
      var lastDot = rawFileName.lastIndexOf(".");
      if (lastDot !== -1) {
        ext = rawFileName.substring(lastDot);
      } else {
        ext = ".pdf";
      }
      fileName = data.documentCode + revSuffix + ext;
    } else if (data.documentCode && !fileName.startsWith(data.documentCode)) {
      fileName = data.documentCode + "_" + fileName;
    }

    if (data.base64 && typeof data.base64 === 'string' && data.base64.trim().length > 0) {
      var decoded = Utilities.base64Decode(data.base64.trim());
      var mimeType = data.mimeType || 'application/pdf';
      var blob = Utilities.newBlob(decoded, mimeType, fileName);
      file = folder.createFile(blob);
    } else {
      var regFileName = (data.documentCode || "DOC") + "_Registrasi_Sistem.txt";
      var summaryText = "========================================================\\n" +
                        "BUKTI REGISTRASI DOKUMEN RESMI - PT NIRWANA BHUMI ENERGI\\n" +
                        "========================================================\\n\\n" +
                        "Kode Dokumen      : " + (data.documentCode || "-") + "\\n" +
                        "Judul Dokumen     : " + (data.title || "-") + "\\n" +
                        "Kategori (Type)   : " + (data.typeCode || "-") + "\\n" +
                        "Divisi Penerbit   : " + (data.divisionCode || "-") + "\\n" +
                        "Otoritas Pengesah : " + (data.approverCode || "-") + "\\n" +
                        "Dibuat Oleh       : " + (data.createdBy || "-") + "\\n" +
                        "Tanggal Terbit    : " + (data.issueDate || "-") + "\\n" +
                        "Deskripsi         : " + (data.description || "-") + "\\n" +
                        "Waktu Pendaftaran : " + new Date().toISOString() + "\\n";
      file = folder.createFile(regFileName, summaryText, MimeType.PLAIN_TEXT);
    }

    var desc = "Dokumen Resmi PT Nirwana Bhumi Energi\\n" +
               "Kode Surat: " + (data.documentCode || "-") + "\\n" +
               "Nama File: " + fileName + "\\n" +
               "Didaftarkan oleh: " + (data.uploadedBy || data.createdBy || "Staff") + "\\n" +
               "Waktu: " + new Date().toISOString();
    file.setDescription(desc);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (errPerm) {}

    // Otomatis sinkronkan catatan dokumen ini ke nbe_cloud_database.json
    if (data.documentCode) {
      var currentDb = readDatabase(rootFolder);
      var docs = currentDb.documents || [];
      var matched = false;
      for (var k = 0; k < docs.length; k++) {
        if (docs[k].code === data.documentCode) {
          docs[k].googleDriveLink = file.getUrl();
          docs[k].fileName = fileName;
          docs[k].fileSize = file.getSize();
          docs[k].updatedAt = new Date().toISOString();
          matched = true;
          break;
        }
      }
      if (!matched) {
        docs.unshift({
          id: "doc-" + new Date().getTime(),
          code: data.documentCode,
          title: data.title || fileName,
          typeCode: data.typeCode || "SOP",
          divisionCode: data.divisionCode || "GNR",
          approverCode: data.approverCode || "CEO",
          seqNumber: 1,
          revision: data.revision || 0,
          status: "Published",
          createdBy: data.uploadedBy || data.createdBy || "Staff",
          issueDate: data.issueDate || new Date().toISOString().slice(0, 10),
          fileName: fileName,
          fileSize: file.getSize(),
          googleDriveLink: file.getUrl(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      currentDb.documents = docs;
      writeDatabase(rootFolder, currentDb);
    }

    var response = {
      status: "success",
      success: true,
      fileId: file.getId(),
      fileName: file.getName(),
      viewUrl: file.getUrl(),
      downloadUrl: file.getDownloadUrl(),
      message: "Dokumen (" + fileName + ") berhasil diunggah ke folder Google Drive & dicatat ke Database Cloud!"
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errResponse = {
      status: "error",
      success: false,
      message: error.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var rootFolder = DriveApp.getFolderById(TARGET_FOLDER_ID);
    var db = readDatabase(rootFolder);
    return ContentService.createTextOutput(JSON.stringify({
      status: "online",
      bot: "PT Nirwana Bhumi Energi Document Drive Bot",
      targetFolder: TARGET_FOLDER_ID,
      folderUrl: "https://drive.google.com/drive/folders/" + TARGET_FOLDER_ID,
      totalDocuments: (db.documents || []).length,
      documents: db.documents || [],
      masterCodes: db.masterCodes || null,
      activityLogs: db.activityLogs || [],
      lastUpdated: db.lastUpdated || new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "online",
      bot: "PT Nirwana Bhumi Energi Document Drive Bot",
      targetFolder: TARGET_FOLDER_ID,
      error: err.toString(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
}

export const GOOGLE_APPS_SCRIPT_BOT_CODE = getGoogleAppsScriptBotCode();
