import mammoth from "mammoth";
import JSZip from "jszip";

export interface TocHeadingItem {
  num: string;
  title: string;
  isSub?: boolean;
}

export interface ExtractedDocSection {
  tocHeadings: TocHeadingItem[];
  originalHtmlBody: string; // Berisi <p>, <h1>-<h4>, dan <table> asli dari file .docx
  translatedEnHtmlBody?: string;
  bilingualHtmlBody?: string;
  rawText?: string;
}

/**
 * Fallback parser menggunakan JSZip untuk membaca word/document.xml jika mammoth memerlukan fallback
 */
async function fallbackXmlExtractor(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(arrayBuffer);
    const docXml = loadedZip.file("word/document.xml");
    if (!docXml) return "";

    const xmlString = await docXml.async("text");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    const bodyNode = xmlDoc.getElementsByTagName("w:body")[0];
    if (!bodyNode) return "";

    let html = "";
    for (let i = 0; i < bodyNode.childNodes.length; i++) {
      const child = bodyNode.childNodes[i];
      const tag = child.nodeName.toLowerCase();

      if (tag === "w:p" || tag === "p") {
        const textNodes = (child as Element).getElementsByTagName("w:t");
        let pText = "";
        for (let t = 0; t < textNodes.length; t++) {
          pText += textNodes[t].textContent || "";
        }
        const trimmed = pText.trim();
        if (trimmed) {
          html += `<p>${trimmed}</p>`;
        }
      } else if (tag === "w:tbl" || tag === "tbl") {
        const trNodes = (child as Element).getElementsByTagName("w:tr");
        let tblHtml = "<table>";
        for (let r = 0; r < trNodes.length; r++) {
          tblHtml += "<tr>";
          const tcNodes = trNodes[r].getElementsByTagName("w:tc");
          for (let c = 0; c < tcNodes.length; c++) {
            const cellTextNodes = tcNodes[c].getElementsByTagName("w:t");
            let cellText = "";
            for (let ct = 0; ct < cellTextNodes.length; ct++) {
              cellText += cellTextNodes[ct].textContent || "";
            }
            const isHeader = r === 0;
            tblHtml += isHeader ? `<th>${cellText.trim()}</th>` : `<td>${cellText.trim()}</td>`;
          }
          tblHtml += "</tr>";
        }
        tblHtml += "</table>";
        html += tblHtml;
      }
    }
    return html;
  } catch (err) {
    console.warn("Fallback XML extraction error:", err);
    return "";
  }
}

/**
 * 1. Mengekstrak isi asli (paragraf, penomoran, dan TABEL ASLI) dari file .docx yang diunggah user
 */
export async function extractOriginalDocxContent(
  fileOrBlobOrBuffer: File | Blob | ArrayBuffer | string
): Promise<ExtractedDocSection> {
  let arrayBuffer: ArrayBuffer;

  if (typeof fileOrBlobOrBuffer === "string") {
    if (fileOrBlobOrBuffer.startsWith("data:")) {
      const res = await fetch(fileOrBlobOrBuffer);
      const blob = await res.blob();
      arrayBuffer = await blob.arrayBuffer();
    } else {
      const byteCharacters = atob(fileOrBlobOrBuffer);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      arrayBuffer = byteArray.buffer;
    }
  } else if (fileOrBlobOrBuffer instanceof ArrayBuffer) {
    arrayBuffer = fileOrBlobOrBuffer;
  } else if (fileOrBlobOrBuffer instanceof Blob) {
    arrayBuffer = await fileOrBlobOrBuffer.arrayBuffer();
  } else {
    throw new Error("Format berkas Word (.docx) tidak dikenali");
  }

  let rawHtml = "";

  try {
    // Konversi .docx asli menjadi HTML murni dengan mempertahankan seluruh tabel (<table>, <tr>, <td>)
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h2:fresh",
          "p[style-name='Heading 2'] => h3:fresh",
          "p[style-name='Heading 3'] => h4:fresh",
          "p[style-name='Title'] => h1:fresh",
        ],
      }
    );
    rawHtml = result.value || "";
  } catch (err) {
    console.warn("Mammoth conversion note, falling back to direct XML:", err);
  }

  // Jika mammoth menghasilkan HTML kosong, gunakan fallback XML
  if (!rawHtml.trim()) {
    rawHtml = await fallbackXmlExtractor(arrayBuffer);
  }

  // Parsing DOM untuk mengekstrak daftar judul bab asli (untuk halaman 3: Table of Contents)
  // sekaligus merapikan tampilan tabel asli tanpa mengubah struktur baris/kolomnya
  const parser = new DOMParser();
  const htmlDoc = parser.parseFromString(rawHtml, "text/html");

  const tocHeadings: TocHeadingItem[] = [];

  htmlDoc.body.querySelectorAll("p, h1, h2, h3, h4, li").forEach((el) => {
    const text = (el.textContent || "").trim();
    if (!text) return;

    // Deteksi pola bab utama seperti "1. TUJUAN", "1.0 TUJUAN", "5. URAIAN PROSEDUR", "VI. LAMPIRAN"
    const mainMatch = text.match(/^([0-9]+(?:\.0)?\.?|[IVXLCDM]+\.?)\s+([A-Z\s&/()-]{3,})$/);
    if (mainMatch) {
      const numPart = mainMatch[1].endsWith(".") ? mainMatch[1] : `${mainMatch[1]}.`;
      tocHeadings.push({
        num: numPart,
        title: mainMatch[2].trim(),
        isSub: false,
      });
      el.setAttribute(
        "style",
        "font-family: Arial, sans-serif; font-size: 11pt; font-weight: bold; color: #000000; margin-top: 14px; margin-bottom: 6px; line-height: 1.4;"
      );
      return;
    }

    // Deteksi pola sub-bab seperti "3.1 ...", "4.1 ...", "5.1 ..."
    const subMatch = text.match(/^([0-9]+\.[1-9][0-9]*\.?)\s+(.*)$/);
    if (subMatch) {
      // Jika di bawah bab utama, masukkan juga sebagai sub-bab jika judulnya cukup jelas
      if (subMatch[2].length < 60 && !subMatch[2].includes(",") && !subMatch[2].includes("adalah")) {
        tocHeadings.push({
          num: subMatch[1].endsWith(".") ? subMatch[1] : `${subMatch[1]}.`,
          title: subMatch[2].trim(),
          isSub: true,
        });
      }
      el.setAttribute(
        "style",
        "font-family: Arial, sans-serif; font-size: 10.5pt; color: #3B3838; margin-left: 0.5in; text-align: justify; margin-bottom: 4px; line-height: 1.5;"
      );
    } else {
      el.setAttribute(
        "style",
        "font-family: Arial, sans-serif; font-size: 10.5pt; color: #3B3838; text-align: justify; margin-bottom: 6px; line-height: 1.5;"
      );
    }
  });

  // Pertahankan seluruh Tabel Asli di dalam dokumen (contoh: Tabel Kegiatan | Penanggungjawab)
  htmlDoc.body.querySelectorAll("table").forEach((tbl) => {
    tbl.setAttribute(
      "style",
      "width: 100%; border-collapse: collapse; margin: 14px 0; font-family: Arial, sans-serif; font-size: 10pt;"
    );
    tbl.querySelectorAll("tr").forEach((tr, rIdx) => {
      tr.querySelectorAll("td, th").forEach((cell) => {
        const isHeaderRow = rIdx === 0 || cell.tagName === "TH";
        cell.setAttribute(
          "style",
          `border: 1px solid #BFBFBF; padding: 6px 10px; vertical-align: top; ${
            isHeaderRow
              ? "background-color: #D9E1F2; font-weight: bold; text-align: center; color: #000000;"
              : "color: #3B3838; text-align: justify;"
          }`
        );
      });
    });
  });

  // Jika tidak ditemukan bab bernomor, coba ekstrak dari heading tag h1-h4
  if (tocHeadings.length === 0) {
    htmlDoc.body.querySelectorAll("h1, h2, h3, h4").forEach((h, idx) => {
      const hText = (h.textContent || "").trim();
      if (hText) {
        tocHeadings.push({
          num: `${idx + 1}.0`,
          title: hText.toUpperCase(),
          isSub: h.tagName === "H3" || h.tagName === "H4",
        });
      }
    });
  }

  const finalToc =
    tocHeadings.length > 0
      ? tocHeadings
      : [{ num: "1.0", title: "ISI DOKUMEN", isSub: false }];

  return {
    tocHeadings: finalToc,
    originalHtmlBody: htmlDoc.body.innerHTML,
    rawText: htmlDoc.body.textContent || "",
  };
}

/**
 * Kamus istilah baku dokumen SOP K3, CSMS, dan Prosedur Operasional NBE
 */
const SOP_TRANSLATION_MAP: Array<[RegExp, string]> = [
  // Heading Bab Utama
  [/\bMAKSUD DAN TUJUAN\b/gi, "PURPOSE AND OBJECTIVE"],
  [/\bTUJUAN\b/gi, "PURPOSE / OBJECTIVE"],
  [/\bRUANG LINGKUP\b/gi, "SCOPE"],
  [/\bREFERENSI\b/gi, "REFERENCES"],
  [/\bDEFINISI\b/gi, "DEFINITIONS"],
  [/\bTANGGUNG JAWAB DAN WEWENANG\b/gi, "RESPONSIBILITIES AND AUTHORITIES"],
  [/\bTANGGUNG JAWAB\b/gi, "RESPONSIBILITIES"],
  [/\bURAIAN PROSEDUR\b/gi, "PROCEDURE DESCRIPTION"],
  [/\bRINCIAN PROSEDUR\b/gi, "PROCEDURE DETAILS"],
  [/\bPROSEDUR OPERASIONAL\b/gi, "OPERATIONAL PROCEDURE"],
  [/\bALUR KERJA\b/gi, "WORKFLOW"],
  [/\bKETENTUAN UMUM\b/gi, "GENERAL PROVISIONS"],
  [/\bKetentuan Umum\b/g, "General Provisions"],
  [/\bALUR OPERASIONAL\b/gi, "OPERATIONAL FLOW"],
  [/\bAlur Operasional\b/g, "Operational Flow"],
  [/\bDOKUMEN TERKAIT\b/gi, "RELATED DOCUMENTS"],
  [/\bREKAMAN MUTU\b/gi, "QUALITY RECORDS"],
  [/\bREKAMAN\b/gi, "RECORDS"],
  [/\bLAMPIRAN DAN INSTRUKSI KEADAAN DARURAT\b/gi, "ATTACHMENTS AND EMERGENCY INSTRUCTIONS"],
  [/\bLAMPIRAN\b/gi, "ATTACHMENTS"],
  [/\bFORMULIR TERKAIT\b/gi, "ASSOCIATED FORMS"],

  // Istilah Tabel & Peran
  [/\bKegiatan\b/g, "Activity"],
  [/\bPenanggungjawab\b/gi, "Person in Charge"],
  [/\bPenanggung Jawab\b/gi, "Person in Charge"],
  [/\bPelaksana\b/gi, "Executor"],
  [/\bPengunjung\b/g, "Visitor"],
  [/\bSatpam\b/g, "Security Officer"],
  [/\bPetugas Satpam yang sedang jaga\b/gi, "Security Officer on duty"],
  [/\bPetugas Keamanan\b/gi, "Security Personnel"],
  [/\bYang Menerima Tamu\b/g, "Host / Receptionist"],
  [/\bTamu\b/g, "Guest"],
  [/\bKontraktor\b/gi, "Contractor"],
  [/\bKaryawan\b/gi, "Employee"],
  [/\bTidak ada\b/gi, "None"],
  [/\bKeterangan\b/gi, "Remarks"],
  [/\bNomor Dokumen\b/gi, "Document Number"],
  [/\bTanggal Berlaku\b/gi, "Effective Date"],
  [/\bTanggal Penerbitan\b/gi, "Issue Date"],
  [/\bStatus Revisi\b/gi, "Revision Status"],
  [/\bBuku Tamu\b/gi, "Guest Book"],
  [/\bUndang-Undang No\b/gi, "Law No."],
  [/\bPermenaker No\b/gi, "Ministerial Regulation No."],
  [/\bsub\.\s*Elemen\b/gi, "Sub-element"],

  // Frasa Spesifik SOP & K3 (Visitor & Contractor Briefing)
  [/\bProsedur ini dibuat untuk memastikan bahwa semua pengunjung termasuk tamu dan pihak ke tiga mengetahui informasi K3 yang harus ditaati selama berada di lingkungan\b/gi, "This procedure is established to ensure that all visitors, including guests and third parties, are aware of the HSE information that must be complied with while within the premises of"],
  [/\bProsedur ini dibuat untuk memastikan\b/gi, "This procedure is established to ensure"],
  [/\bProsedur ini mencakup kegiatan pemberian briefing kepada pengunjung termasuk tamu dan pihak ketiga mengenai Kebijakan K3 dan Peraturan K3 yang berlaku di Kantor dan kantor lapangan\b/gi, "This procedure covers the provision of briefings to visitors, including guests and third parties, regarding the HSE Policies and HSE Regulations applicable at the Head Office and field offices"],
  [/\bProsedur ini mencakup kegiatan pemberian briefing\b/gi, "This procedure covers briefing activities"],
  [/\bBriefing adalah petunjuk lisan untuk melaksanakan tugas \/ pekerjaan yang harus dijadikan panduan\b/gi, "Briefing is oral guidance for carrying out tasks / work that must serve as reference"],
  [/\bPengunjung adalah semua pihak yang tidak terikat oleh kontrak yang atas kemauan sendiri atau atas undangan\b/gi, "Visitors refer to all parties not bound by a contract who, of their own accord or upon invitation"],
  [/\byang memerlukan atau yang diperlukan kehadirannya di area kantor atau area kerja\b/gi, "whose presence is required or necessary in the office area or operational site"],
  [/\bPihak ke tiga adalah pihak yang diikat oleh Kontrak Kerja dengan\b/gi, "Third party refers to any party bound by an Employment/Work Contract with"],
  [/\bPengunjung \(termasuk tamu, PKL dan pihak ke tiga\) baik yang datang maupun yang pulang diwajibkan lapor kepada petugas Satpam yang sedang jaga\b/gi, "Visitors (including guests, interns, and third parties), both arriving and departing, are required to report to the Security Officer on duty"],
  [/\bMelakukan identifikasi baik terhadap orang maupun terhadap barang bawaannya jika kondisi mengharuskannya\b/gi, "Conduct identification of both persons and their luggage/belongings if conditions require"],
  [/\bMemberikan briefing, kepada pengunjung \(termasuk tamu dan pihak ke tiga\) mengenai Kebijakan K3 dan Peraturan K3 yang berlaku di lingkungan\b/gi, "Provide briefings to visitors (including guests and third parties) regarding the HSE Policy and HSE Regulations applicable within the premises of"],
  [/\bBagi pengunjung yang sering datang ke kantor atau tempat kerja\b/gi, "For frequent visitors to the office or operational workplace"],
  [/\bcukup diberi briefing pada saat kunjungan pertama dan dapat diulang untuk kunjungan berikutnya\b/gi, "a briefing upon the first visit suffices and may be repeated for subsequent visits"],
  [/\bProsedur ini menetapkan tata cara\b/gi, "This procedure establishes the guidelines and protocols"],
  [/\bProsedur ini berlaku untuk\b/gi, "This procedure applies to"],
  [/\bSeluruh pekerja, kontraktor, dan pengunjung\b/gi, "All workers, contractors, and visitors"],
  [/\bAlat Pelindung Diri\b/gi, "Personal Protective Equipment (PPE)"],
  [/\bKeselamatan dan Kesehatan Kerja\b/gi, "Occupational Health and Safety (HSE)"],
  [/\bKondisi Darurat\b/gi, "Emergency Condition"],
  [/\bIzin Kerja Aman\b/gi, "Permit to Work (PTW)"],
  [/\bInduksi Keselamatan\b/gi, "Safety Induction / Briefing"],
];

/**
 * Menerjemahkan sepotong teks bahasa Indonesia ke British English
 */
export function quickTranslateTextToEn(idText: string): string {
  if (!idText || !idText.trim()) return idText;
  let translated = idText;

  for (const [pattern, replacement] of SOP_TRANSLATION_MAP) {
    translated = translated.replace(pattern, replacement);
  }

  return translated;
}

/**
 * 2. Fungsi Translasi Murni untuk Tombol Pilihan Bahasa (ID / EN-GB / Bilingual)
 * Menerjemahkan teks & sel tabel dari dokumen asli TANPA mengganti substansi dokumen!
 */
export async function translateExtractedHtml(
  originalHtml: string,
  targetMode: "id" | "en" | "bi",
  aiTranslateFn?: (text: string, toLang: "id" | "en-GB") => Promise<string>
): Promise<string> {
  if (targetMode === "id" || !originalHtml || !originalHtml.trim()) {
    return originalHtml;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(originalHtml, "text/html");

  const translateText = async (text: string): Promise<string> => {
    if (!text || !text.trim()) return text;
    if (aiTranslateFn) {
      try {
        return await aiTranslateFn(text, "en-GB");
      } catch (e) {
        console.warn("AI translate error fallback:", e);
      }
    }
    return quickTranslateTextToEn(text);
  };

  if (targetMode === "en") {
    // Mode English: Terjemahkan seluruh text node secara mendalam (termasuk di dalam <strong>, <span>, <td>, <th>, dsb.)
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      if (currentNode.textContent && currentNode.textContent.trim()) {
        textNodes.push(currentNode as Text);
      }
      currentNode = walker.nextNode();
    }

    for (const node of textNodes) {
      const orig = node.textContent || "";
      if (orig.trim()) {
        node.textContent = await translateText(orig);
      }
    }
    return doc.body.innerHTML;
  }

  // Mode Bilingual (ID di Kiri | EN-GB di Kanan, sementara Tabel Asli tetap utuh & dwibahasa di dalam sel)
  const bilingualContainer = document.createElement("div");
  const children = Array.from(doc.body.children);

  for (const child of children) {
    if (child.tagName === "TABLE") {
      // Salin tabel asli apa adanya dan jadikan teks selnya dwibahasa (ID / EN)
      const clonedTable = child.cloneNode(true) as HTMLTableElement;
      const cells = Array.from(clonedTable.querySelectorAll("td, th"));
      for (const cell of cells) {
        const origTxt = (cell.textContent || "").trim();
        if (origTxt) {
          const enTxt = await translateText(origTxt);
          if (enTxt !== origTxt) {
            cell.innerHTML = `<div>${origTxt}</div><div style="font-style: italic; color: #4b5563; margin-top: 4px; font-size: 0.92em;">${enTxt}</div>`;
          }
        }
      }
      bilingualContainer.appendChild(clonedTable);
    } else {
      const origHtml = child.outerHTML;
      const origText = (child.textContent || "").trim();
      const enText = origText ? await translateText(origText) : "";

      const rowWrapper = document.createElement("div");
      rowWrapper.setAttribute(
        "style",
        "display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 6px; align-items: start;"
      );
      rowWrapper.innerHTML = `
        <div>${origHtml}</div>
        <div style="font-family: Arial, sans-serif; font-size: 10.5pt; color: #3B3838; font-style: italic; text-align: justify; line-height: 1.5;">${enText}</div>
      `;
      bilingualContainer.appendChild(rowWrapper);
    }
  }

  return bilingualContainer.innerHTML || originalHtml;
}

/**
 * Menerjemahkan array judul TOC asli sesuai bahasa yang dipilih
 */
export function translateTocHeadings(
  headings: TocHeadingItem[],
  language: "id" | "en" | "bi"
): TocHeadingItem[] {
  if (language === "id") return headings;

  return headings.map((h) => {
    const enTitle = quickTranslateTextToEn(h.title);
    if (language === "bi") {
      return {
        ...h,
        title: enTitle !== h.title ? `${h.title} / ${enTitle}` : h.title,
      };
    }
    return {
      ...h,
      title: enTitle,
    };
  });
}

/**
 * 3. Membagi HTML isi dokumen asli menjadi halaman-halaman A4/F4
 * dengan menjaga agar struktur tabel (table) dan paragraf tetap utuh.
 */
export function paginateHtmlContent(htmlContent: string, maxWeightPerPage = 750): string[] {
  if (!htmlContent || !htmlContent.trim()) {
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");
  const children = Array.from(doc.body.children);

  if (children.length === 0) {
    return [htmlContent];
  }

  const pages: string[] = [];
  let currentPageHtml = "";
  let currentWeight = 0;

  for (const child of children) {
    let elementWeight = 45;
    const tag = child.tagName.toLowerCase();

    if (tag === "table") {
      const rowCount = child.querySelectorAll("tr").length;
      elementWeight = Math.max(140, rowCount * 38 + 50);
    } else if (["h1", "h2", "h3", "h4"].includes(tag)) {
      elementWeight = 65;
    } else {
      const textLen = (child.textContent || "").length;
      elementWeight = Math.max(40, Math.ceil(textLen / 75) * 22);
    }

    const textContent = (child.textContent || "").trim();
    const isMajorHeading =
      ["h1", "h2"].includes(tag) ||
      /^([0-9]+(?:\.0)?\.?|[IVXLCDM]+\.?)\s+[A-Z\s&/()-]{3,}$/.test(textContent);

    if (
      currentPageHtml &&
      (currentWeight + elementWeight > maxWeightPerPage ||
        (isMajorHeading && currentWeight > 320))
    ) {
      pages.push(currentPageHtml);
      currentPageHtml = child.outerHTML;
      currentWeight = elementWeight;
    } else {
      currentPageHtml += child.outerHTML;
      currentWeight += elementWeight;
    }
  }

  if (currentPageHtml) {
    pages.push(currentPageHtml);
  }

  return pages.length > 0 ? pages : [htmlContent];
}

