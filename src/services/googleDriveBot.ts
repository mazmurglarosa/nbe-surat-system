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
  error?: string;
  message?: string;
}

export const TARGET_FOLDER_ID = '1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF';
export const TARGET_FOLDER_URL =
  'https://drive.google.com/drive/folders/1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF?usp=sharing';

/**
 * Buat folder baru di Google Drive melalui Webhook Bot Google Apps Script.
 * Digunakan ketika user menekan tombol "Fix" kode surat.
 */
export async function createFolderInDriveViaBot(
  folderName: string,
  webhookUrl: string,
  parentFolderId: string = TARGET_FOLDER_ID
): Promise<BotFolderResult> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com')) {
    return {
      success: false,
      error:
        'URL Webhook Bot Google Apps Script belum dikonfigurasi. Silakan buka menu Pengaturan Google Drive.',
    };
  }

  try {
    const payload = {
      action: 'create_folder',
      folderName: folderName,
      parentId: parentFolderId,
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
        folderId: result.folderId,
        folderUrl:
          result.folderUrl ||
          `https://drive.google.com/drive/folders/${result.folderId}`,
        folderName: result.folderName || folderName,
        message:
          result.message ||
          `Folder Google Drive '${folderName}' berhasil dibuat!`,
      };
    } else {
      return {
        success: false,
        error:
          result.message || 'Bot Google Drive gagal membuat folder baru.',
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
 * Ready-to-deploy Google Apps Script Code for the Bot Account
 */
export const GOOGLE_APPS_SCRIPT_BOT_CODE = `/**
 * ============================================================
 * BOT GOOGLE DRIVE - PT NIRWANA BHUMI ENERGI (NBE)
 * Fitur:
 * 1. Otomatis buat folder baru saat tombol FIX diklik (action: "create_folder")
 * 2. Upload dokumen awal & revisi ke folder kode surat (action: "upload")
 * 3. Otomatis ubah nama file revisi menjadi: [KodeSurat]-rev1, -rev2, dst
 * 4. Otomatis hapus folder dan file di Google Drive saat surat dihapus dari sistem (action: "delete")
 * ============================================================
 */

var TARGET_FOLDER_ID = "${TARGET_FOLDER_ID}";

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

    // ========================================================
    // AKSI 1: BUAT / CARI FOLDER DOKUMEN BARU (TOMBOL FIX KODE)
    // ========================================================
    if (data.action === "create_folder" || data.action === "find_or_create_folder") {
      var folderName = data.folderName || data.documentCode || "Dokumen_NBE";
      var parentId = data.parentId || TARGET_FOLDER_ID;
      var parentFolder = DriveApp.getFolderById(parentId);

      // Cek apakah folder sudah ada sebelumnya
      var existingFolders = parentFolder.getFoldersByName(folderName);
      var targetFolder;
      if (existingFolders.hasNext()) {
        targetFolder = existingFolders.next();
      } else {
        targetFolder = parentFolder.createFolder(folderName);
      }

      // Berikan hak akses lihat bagi siapa saja yang memiliki tautan
      try {
        targetFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (errSharing) {}

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        success: true,
        folderId: targetFolder.getId(),
        folderUrl: targetFolder.getUrl(),
        folderName: targetFolder.getName(),
        message: "Folder Google Drive '" + folderName + "' berhasil disiapkan!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ========================================================
    // AKSI 2: HAPUS SURAT & FOLDER DI GOOGLE DRIVE (DELETE)
    // ========================================================
    if (data.action === "delete" || data.action === "delete_folder") {
      var deletedItems = [];

      // Hapus folder dokumen khusus (pastikan bukan root TARGET_FOLDER_ID)
      if (data.folderId && data.folderId !== TARGET_FOLDER_ID) {
        try {
          var fld = DriveApp.getFolderById(data.folderId);
          fld.setTrashed(true);
          deletedItems.push("Folder ID: " + data.folderId);
        } catch (errFld) {}
      } else if (data.documentCode) {
        // Jika folderId tidak spesifik, cari subfolder dengan nama kode surat di TARGET_FOLDER_ID
        try {
          var parentF = DriveApp.getFolderById(TARGET_FOLDER_ID);
          var subFolders = parentF.getFoldersByName(data.documentCode);
          while (subFolders.hasNext()) {
            var sf = subFolders.next();
            sf.setTrashed(true);
            deletedItems.push("Folder: " + sf.getName());
          }
        } catch (errSearch) {}
      }

      // Hapus file dokumen jika fileId spesifik diberikan
      if (data.fileId) {
        try {
          var fl = DriveApp.getFileById(data.fileId);
          fl.setTrashed(true);
          deletedItems.push("File ID: " + data.fileId);
        } catch (errFile) {}
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        success: true,
        deletedItems: deletedItems,
        message: "Folder dan dokumen di Google Drive berhasil dihapus otomatis."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ========================================================
    // AKSI 3: UPLOAD DOKUMEN / REVISI DOKUMEN
    // ========================================================
    var folderId = data.folderId || TARGET_FOLDER_ID;
    var folder = DriveApp.getFolderById(folderId);
    var file;
    var rawFileName = data.fileName || (data.documentCode ? data.documentCode + ".pdf" : "dokumen-nbe.pdf");
    var fileName = rawFileName;

    // Format nama file revisi otomatis: [KodeSurat]-rev1, -rev2, dst
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

    // Jika ada lampiran berkas base64
    if (data.base64 && data.base64.length > 0) {
      var decoded = Utilities.base64Decode(data.base64);
      var mimeType = data.mimeType || 'application/pdf';
      var blob = Utilities.newBlob(decoded, mimeType, fileName);
      file = folder.createFile(blob);
    } else {
      // Jika surat didaftarkan tanpa file fisik, buat berkas bukti registrasi resmi
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

    // Tambahkan keterangan dokumen
    var desc = "Dokumen Resmi PT Nirwana Bhumi Energi\\n" +
               "Kode Surat: " + (data.documentCode || "-") + "\\n" +
               "Nama File: " + fileName + "\\n" +
               "Didaftarkan oleh: " + (data.uploadedBy || data.createdBy || "Staff") + "\\n" +
               "Waktu: " + new Date().toISOString();
    file.setDescription(desc);

    // Set permission agar dapat dilihat/diunduh oleh siapa pun yang memiliki link
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (errPerm) {}

    var response = {
      status: "success",
      success: true,
      fileId: file.getId(),
      fileName: file.getName(),
      viewUrl: file.getUrl(),
      downloadUrl: file.getDownloadUrl(),
      message: "Dokumen (" + fileName + ") berhasil diunggah ke folder Google Drive!"
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
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    bot: "PT Nirwana Bhumi Energi Document Drive Bot",
    targetFolder: TARGET_FOLDER_ID,
    folderUrl: "https://drive.google.com/drive/folders/" + TARGET_FOLDER_ID,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
