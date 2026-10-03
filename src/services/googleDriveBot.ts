export interface BotUploadResult {
  success: boolean;
  fileId?: string;
  viewUrl?: string;
  downloadUrl?: string;
  error?: string;
  message?: string;
}

export const TARGET_FOLDER_ID = '1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF';
export const TARGET_FOLDER_URL =
  'https://drive.google.com/drive/folders/1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF?usp=sharing';

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
        message: result.message || 'File berhasil diunggah ke Google Drive oleh Bot!',
      };
    } else {
      return {
        success: false,
        error: result.message || 'Bot Google Drive gagal memproses unggahan file.',
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
      message: 'Format URL Webhook salah. Harus diawali dengan https://script.google.com',
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
        message: `Bot aktif dan siap digunakan! (Folder ID: ${result.targetFolder || TARGET_FOLDER_ID})`,
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
 * If file is uploaded, writes the file directly to folder 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF.
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
      mimeType: fileData?.type || (fileData?.dataUrl ? 'application/pdf' : 'text/plain'),
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
        message: result.message || 'Dokumen berhasil didaftarkan langsung ke Google Drive oleh Bot!',
      };
    } else {
      return {
        success: false,
        error: result.message || 'Bot Google Drive gagal memproses pendaftaran dokumen.',
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
 * Mengatur upload & pendaftaran dokumen otomatis ke folder:
 * https://drive.google.com/drive/folders/1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF
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
    var folderId = data.folderId || TARGET_FOLDER_ID;
    var folder = DriveApp.getFolderById(folderId);
    var file;
    var fileName = data.fileName || (data.documentCode ? data.documentCode + ".pdf" : "dokumen-nbe.pdf");

    // Jika ada lampiran berkas (base64)
    if (data.base64 && data.base64.length > 0) {
      var decoded = Utilities.base64Decode(data.base64);
      var mimeType = data.mimeType || 'application/pdf';
      
      // Beri prefix kode surat pada nama file jika belum ada
      if (data.documentCode && !fileName.startsWith(data.documentCode)) {
        fileName = data.documentCode + "_" + fileName;
      }
      
      var blob = Utilities.newBlob(decoded, mimeType, fileName);
      file = folder.createFile(blob);
    } else {
      // Jika surat didaftarkan tanpa lampiran berkas fisik, buat berkas bukti registrasi resmi
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
               "Judul: " + (data.title || "-") + "\\n" +
               "Didaftarkan oleh: " + (data.uploadedBy || data.createdBy || "Staff") + "\\n" +
               "Waktu: " + new Date().toISOString();
    file.setDescription(desc);
    
    // Set permission agar dapat dilihat/diunduh oleh siapa pun yang memiliki link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var response = {
      status: "success",
      success: true,
      fileId: file.getId(),
      fileName: file.getName(),
      viewUrl: file.getUrl(),
      downloadUrl: file.getDownloadUrl(),
      message: "Dokumen (" + (data.documentCode || "NBE") + ") berhasil didaftarkan langsung ke Google Drive oleh Bot!"
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
