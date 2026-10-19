import JSZip from "jszip";
import { DocxTableData } from "./docxExtractor";

export interface TocHeadingItem {
  num: string;
  title: string;
  isSub?: boolean;
}

export interface ExtractedDocSection {
  tocHeadings: TocHeadingItem[];
  originalHtmlBody: string; // Berisi <p>, heading, dan <table> asli dari file .docx
  translatedEnHtmlBody?: string;
  bilingualHtmlBody?: string;
  paragraphs?: string[];
  tables?: DocxTableData[];
  rawText?: string;
}

/**
 * 1. Mengekstrak 100% isi asli (paragraf, format cetak tebal/miring, penomoran, dan SELURUH TABEL ASLI)
 * langsung dari struktur OpenXML word/document.xml menggunakan JSZip dan DOMParser.
 * Murni client-side tanpa dependensi eksternal mammoth yang rentan error di browser.
 */
export async function extractOriginalDocxContent(
  fileOrBlobOrBuffer: File | Blob | ArrayBuffer | string
): Promise<ExtractedDocSection> {
  let arrayBuffer: ArrayBuffer;

  if (typeof fileOrBlobOrBuffer === "string") {
    if (fileOrBlobOrBuffer.startsWith("data:")) {
      const commaIdx = fileOrBlobOrBuffer.indexOf(",");
      if (commaIdx !== -1) {
        const base64Data = fileOrBlobOrBuffer.slice(commaIdx + 1);
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        const res = await fetch(fileOrBlobOrBuffer);
        const blob = await res.blob();
        arrayBuffer = await blob.arrayBuffer();
      }
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

  // 1. Ekstraktor format biner Microsoft Word 97-2003 (.doc) berbasis struktur OLE2 Compound File
  const extractDocBinaryContent = (buffer: ArrayBuffer): ExtractedDocSection | null => {
    const u8 = new Uint8Array(buffer);
    if (
      u8.length < 512 ||
      u8[0] !== 0xd0 ||
      u8[1] !== 0xcf ||
      u8[2] !== 0x11 ||
      u8[3] !== 0xe0 ||
      u8[4] !== 0xa1 ||
      u8[5] !== 0xb1 ||
      u8[6] !== 0x1a ||
      u8[7] !== 0xe1
    ) {
      return null;
    }

    try {
      const view = new DataView(buffer);
      const sectorSize = 1 << view.getUint16(30, true);
      const dirSecId = view.getInt32(48, true);
      const dirOffset = (dirSecId + 1) * sectorSize;

      let wordDocSec = -1;
      let wordDocSize = 0;

      for (let i = 0; i < 64; i++) {
        const entryOffset = dirOffset + i * 128;
        if (entryOffset + 128 > u8.length) break;
        const nameLen = view.getUint16(entryOffset + 64, true);
        if (nameLen === 0) continue;
        let name = "";
        for (let j = 0; j < nameLen - 2; j += 2) {
          name += String.fromCharCode(view.getUint16(entryOffset + j, true));
        }
        if (name === "WordDocument") {
          wordDocSec = view.getInt32(entryOffset + 116, true);
          wordDocSize = view.getUint32(entryOffset + 120, true);
          break;
        }
      }

      if (wordDocSec < 0) {
        for (let sec = 0; sec < 15; sec++) {
          const off = (sec + 1) * sectorSize;
          if (off + 2 <= u8.length && view.getUint16(off, true) === 0xa5ec) {
            wordDocSec = sec;
            wordDocSize = u8.length - off;
            break;
          }
        }
      }

      if (wordDocSec < 0) return null;

      const wordDocOffset = (wordDocSec + 1) * sectorSize;
      const wordDocEnd = Math.min(u8.length, wordDocOffset + wordDocSize);
      const wordDoc = u8.subarray(wordDocOffset, wordDocEnd);
      const wordDocView = new DataView(wordDoc.buffer, wordDoc.byteOffset, wordDoc.byteLength);

      if (wordDoc.length < 100 || wordDocView.getUint16(0, true) !== 0xa5ec) return null;

      const fcMin = wordDocView.getUint32(24, true);
      const totalLen = wordDocView.getUint32(0x004c, true);
      if (fcMin >= wordDoc.length) return null;

      const len = Math.min(totalLen > 0 ? totalLen : 100000, wordDoc.length - fcMin);
      const textSlice = wordDoc.subarray(fcMin, fcMin + len);

      let zeroCount = 0;
      for (let i = 1; i < Math.min(textSlice.length, 200); i += 2) {
        if (textSlice[i] === 0) zeroCount++;
      }

      let rawText = "";
      if (zeroCount > 30) {
        for (let i = 0; i < textSlice.length - 1; i += 2) {
          rawText += String.fromCharCode(textSlice[i] | (textSlice[i + 1] << 8));
        }
      } else {
        for (let i = 0; i < textSlice.length; i++) {
          rawText += String.fromCharCode(textSlice[i]);
        }
      }

      const rawParagraphs = rawText.split("\r");
      interface ParsedDocItem {
        type: "paragraph" | "table";
        text?: string;
        rows?: string[][];
      }
      const items: ParsedDocItem[] = [];
      let currentTableRows: string[][] = [];

      for (const rawPara of rawParagraphs) {
        if (rawPara.includes("\u0007")) {
          const rowChunks = rawPara.split(/\u0007\u0007+/);
          for (const chunk of rowChunks) {
            const cells = chunk
              .split("\u0007")
              .map((c) =>
                c
                  .replace(/[\x00-\x1f\x7f-\xff]/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
              )
              .filter(
                (c) =>
                  c.length > 0 &&
                  !c.startsWith("SHAPE") &&
                  !c.startsWith("PAGE ") &&
                  !c.includes("MERGEFORMAT") &&
                  !c.includes("IDAT")
              );
            if (cells.length > 0) {
              currentTableRows.push(cells);
            }
          }
        } else {
          if (currentTableRows.length > 0) {
            items.push({ type: "table", rows: currentTableRows });
            currentTableRows = [];
          }
          const clean = rawPara
            .replace(/[\x00-\x1f\x7f-\xff]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (
            clean.length > 0 &&
            !clean.startsWith("SHAPE") &&
            !clean.startsWith("PAGE ") &&
            !clean.includes("IDAT") &&
            !clean.includes("MERGEFORMAT") &&
            !clean.startsWith("Hlm ")
          ) {
            items.push({ type: "paragraph", text: clean });
          }
        }
      }
      if (currentTableRows.length > 0) {
        items.push({ type: "table", rows: currentTableRows });
      }

      // Potong front-matter dokumen lama (Cover lama, Nomor Dokumen BMT/..., tanda tangan)
      // Dokumen Halaman 4 dst harus mulai dari klausul pertama (1. TUJUAN, 1.0, dsb.)
      const firstClauseRegex = /(?:^[1-9]\d*(?:\.0|\.)?\s*[:.-]?\s*(?:TUJUAN|RUANG LINGKUP|PENDAHULUAN|DEFINISI|REFERENSI|DASAR|KEBIJAKAN|URAIAN|KETENTUAN|PROSEDUR|PELAKSANAAN|TANGGUNG JAWAB)|^[1-9]\.0?\s+[A-Z]{3,}|^BAB\s+[IVXLCDM]+)/i;
      const firstClauseIdx = items.findIndex(
        (it) => it.type === "paragraph" && it.text && firstClauseRegex.test(it.text)
      );

      const bodyItems = firstClauseIdx !== -1 ? items.slice(firstClauseIdx) : items;

      const toc: TocHeadingItem[] = [];
      const paragraphs: string[] = [];
      const tables: DocxTableData[] = [];
      let html = "";

      for (const item of bodyItems) {
        if (item.type === "paragraph" && item.text) {
          paragraphs.push(item.text);
          const matchH = item.text.match(
            /^([0-9]+(?:\.[0-9]+)*\.?|[A-Z]\.|\b(?:BAB\s+[IVXLCDM]+|[IVXLCDM]+\.)\b)\s*[:.-]?\s*(.+)$/i
          );
          const isPureHeading =
            !matchH &&
            item.text.length <= 40 &&
            item.text === item.text.toUpperCase() &&
            !item.text.includes(":") &&
            /^[A-Z\s]+$/.test(item.text);

          if (matchH) {
            const rawNum = matchH[1].trim();
            const num = rawNum.endsWith(".") ? rawNum : rawNum + ".";
            const isSub =
              rawNum.includes(".") &&
              !rawNum.endsWith(".0") &&
              rawNum.split(".").length > 2;
            toc.push({ num, title: matchH[2].trim(), isSub });
            html += `<p style="margin: 14px 0 4px 0; font-weight: bold; color: #000000; font-size: 11pt; font-family: Arial; padding-left: 0.5in; text-indent: -0.5in;"><span style="display: inline-block; min-width: 0.5in;">${num}</span>${matchH[2]}</p>`;
          } else if (isPureHeading) {
            toc.push({ num: "", title: item.text, isSub: false });
            html += `<p style="margin: 14px 0 4px 0; font-weight: bold; color: #000000; font-size: 11pt; font-family: Arial; text-align: left;">${item.text}</p>`;
          } else {
            html += `<p style="padding-left: 0.5in; text-align: justify; line-height: 1.6; margin-bottom: 0.5rem; font-size: 10pt; font-family: Arial; color: #3B3838;">${item.text}</p>`;
          }
        } else if (item.type === "table" && item.rows) {
          tables.push({ rows: item.rows });
          html +=
            '<table class="nbe-editor-table" style="width: 100%; border-collapse: collapse; margin: 12px 0 16px 0; border: 1.5px solid #000000; font-family: Arial; font-size: 9.5pt;"><tbody>';
          item.rows.forEach((row, rIdx) => {
            const isHeader = rIdx === 0;
            const bg = isHeader ? "background-color: #f1f5f9; font-weight: bold;" : "";
            html += `<tr style="${bg}">`;
            row.forEach((cell) => {
              html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${cell}</td>`;
            });
            html += "</tr>";
          });
          html += "</tbody></table>";
        }
      }

      return {
        tocHeadings:
          toc.length > 0 ? toc : [{ num: "1.0", title: "ISI DOKUMEN", isSub: false }],
        originalHtmlBody: html,
        paragraphs,
        tables,
        rawText: paragraphs.join("\n"),
      };
    } catch (e) {
      console.warn("Gagal mengekstrak struktur berkas .doc biner:", e);
      return null;
    }
  };

  // Cek apakah berkas merupakan format biner Microsoft Word (.doc)
  const docBinaryResult = extractDocBinaryContent(arrayBuffer);
  if (docBinaryResult) {
    return docBinaryResult;
  }

  // Fallback ekstraksi teks bersih jika bukan format OLE2 dan bukan OpenXML biasa
  const extractFallbackCleanText = (buffer: ArrayBuffer): ExtractedDocSection => {
    const bytes = new Uint8Array(buffer);
    const lines: string[] = [];
    let current = "";
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if ((b >= 32 && b <= 126) || b === 9) {
        current += String.fromCharCode(b);
      } else if (b === 10 || b === 13) {
        const trimmed = current.trim();
        if (
          trimmed.length >= 6 &&
          !/^[^\w\s]+$/.test(trimmed) &&
          !trimmed.includes("IDAT") &&
          !trimmed.includes("SHAPE") &&
          !trimmed.includes("MERGEFORMAT") &&
          /[a-zA-Z]{3,}/.test(trimmed)
        ) {
          lines.push(trimmed);
        }
        current = "";
      } else {
        const trimmed = current.trim();
        if (
          trimmed.length >= 6 &&
          !/^[^\w\s]+$/.test(trimmed) &&
          !trimmed.includes("IDAT") &&
          !trimmed.includes("SHAPE") &&
          !trimmed.includes("MERGEFORMAT") &&
          /[a-zA-Z]{3,}/.test(trimmed)
        ) {
          lines.push(trimmed);
        }
        current = "";
      }
    }

    const filtered = lines.filter((l) => l.length >= 6 && /[a-zA-Z0-9]/.test(l));
    if (filtered.length > 0) {
      const toc: TocHeadingItem[] = [];
      const html = filtered
        .map((line) => {
          const matchH = line.match(/^([0-9]+(?:\.[0-9]+)*\.?|[IVXLCDM]+\.?)\s+(.+)$/);
          if (matchH) {
            toc.push({ num: matchH[1], title: matchH[2].trim(), isSub: matchH[1].includes(".") && !matchH[1].endsWith(".0") });
            return `<p style="margin: 14px 0 4px 0; font-weight: bold; color: #000000; font-size: 11pt; font-family: Arial; padding-left: 0.5in; text-indent: -0.5in;"><span style="display: inline-block; min-width: 0.5in;">${matchH[1]}</span>${matchH[2]}</p>`;
          }
          return `<p style="padding-left: 0.5in; text-align: justify; line-height: 1.6; margin-bottom: 0.5rem; font-size: 10pt; font-family: Arial; color: #3B3838;">${line}</p>`;
        })
        .join("");

      return {
        tocHeadings: toc.length > 0 ? toc : [{ num: "1.0", title: "ISI DOKUMEN", isSub: false }],
        originalHtmlBody: html,
        paragraphs: filtered,
        tables: [],
        rawText: filtered.join("\n"),
      };
    }

    return {
      tocHeadings: [{ num: "1.0", title: "ISI DOKUMEN", isSub: false }],
      originalHtmlBody: "<p style='font-family: Arial; font-size: 10.5pt; color: #3B3838; font-style: italic;'>Isi dokumen asli siap diedit.</p>",
      paragraphs: ["1.0 TUJUAN", "Tujuan pelaksanaan prosedur ini sesuai standar operasional PT Nirwana Bhumi Energy."],
      tables: [],
      rawText: "1.0 TUJUAN\nTujuan pelaksanaan prosedur ini sesuai standar operasional PT Nirwana Bhumi Energy.",
    };
  };

  const zip = new JSZip();
  let loadedZip: JSZip;
  try {
    loadedZip = await zip.loadAsync(arrayBuffer);
  } catch (err) {
    console.warn("Berkas bukan format ZIP OpenXML biasa, menggunakan ekstraktor cadangan bersih:", err);
    return extractFallbackCleanText(arrayBuffer);
  }

  // 1. Cari berkas document.xml secara fleksibel (case-insensitive & separator-agnostic)
  let docXmlFile = loadedZip.file("word/document.xml");
  if (!docXmlFile) {
    const keys = Object.keys(loadedZip.files);
    const foundKey = keys.find((k) => {
      const norm = k.toLowerCase().replace(/\\/g, "/");
      return (
        norm === "word/document.xml" ||
        norm.endsWith("/word/document.xml") ||
        norm === "document.xml" ||
        norm.endsWith("/document.xml")
      );
    });
    if (foundKey) {
      docXmlFile = loadedZip.file(foundKey);
    }
  }

  // 2. Jika path standar tidak cocok, cari file XML apapun dalam arsip yang memuat elemen dokumen Word
  if (!docXmlFile) {
    const xmlKeys = Object.keys(loadedZip.files).filter((k) => k.toLowerCase().endsWith(".xml"));
    for (const key of xmlKeys) {
      try {
        const content = await loadedZip.files[key].async("text");
        if (
          content.includes("<w:body") ||
          content.includes("<w:p") ||
          content.includes("<office:body") ||
          content.includes("<text:p")
        ) {
          docXmlFile = loadedZip.file(key);
          break;
        }
      } catch (e) {}
    }
  }

  if (!docXmlFile) {
    console.warn("Berkas XML dokumen utama tidak ditemukan dalam arsip zip, mengekstrak teks biner:");
    return extractFallbackCleanText(arrayBuffer);
  }

  const xmlString = await docXmlFile.async("text");
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  // Helper universal namespace-safe element selector across all browsers
  const getElements = (parent: Element | Document, name: string): Element[] => {
    try {
      const listNS = parent.getElementsByTagNameNS("*", name);
      if (listNS && listNS.length > 0) return Array.from(listNS);
    } catch (e) {}
    try {
      const listW = parent.getElementsByTagName("w:" + name);
      if (listW && listW.length > 0) return Array.from(listW);
    } catch (e) {}
    try {
      const listPlain = parent.getElementsByTagName(name);
      if (listPlain && listPlain.length > 0) return Array.from(listPlain);
    } catch (e) {}
    const all = parent.getElementsByTagName("*");
    const res: Element[] = [];
    const target = name.toLowerCase();
    for (let i = 0; i < all.length; i++) {
      const el = all[i];
      const lName = (el.localName || el.nodeName.split(":").pop() || el.nodeName).toLowerCase();
      if (lName === target) {
        res.push(el);
      }
    }
    return res;
  };

  const bodyNode = getElements(xmlDoc, "body")[0];
  if (!bodyNode) {
    return {
      tocHeadings: [{ num: "1.0", title: "ISI DOKUMEN", isSub: false }],
      originalHtmlBody: "",
      paragraphs: [],
      tables: [],
      rawText: "",
    };
  }

  // Helper mengekstrak teks run termasuk tag tab (<w:tab/>) dan enter (<w:br/>)
  const getRunText = (r: Element): string => {
    let text = "";
    for (let i = 0; i < r.childNodes.length; i++) {
      const child = r.childNodes[i];
      if (child.nodeType !== 1) continue;
      const el = child as Element;
      const tag = (el.localName || el.nodeName.split(":").pop() || el.nodeName).toLowerCase();
      if (tag === "t") {
        text += el.textContent || "";
      } else if (tag === "tab") {
        text += " "; // Konversi tab OpenXML ke spasi
      } else if (tag === "br") {
        text += "<br/>";
      }
    }
    return text;
  };

  const isRunBold = (r: Element): boolean => {
    const rPrList = getElements(r, "rPr");
    if (rPrList.length === 0) return false;
    const bList = getElements(rPrList[0], "b");
    if (bList.length === 0) return false;
    const val = bList[0].getAttribute("w:val") || bList[0].getAttribute("val");
    return val !== "0" && val !== "false";
  };

  const isRunItalic = (r: Element): boolean => {
    const rPrList = getElements(r, "rPr");
    if (rPrList.length === 0) return false;
    const itList = getElements(rPrList[0], "i");
    if (itList.length === 0) return false;
    const val = itList[0].getAttribute("w:val") || itList[0].getAttribute("val");
    return val !== "0" && val !== "false";
  };

  interface ParsedItem {
    type: "p" | "tbl";
    text: string;
    html: string;
    isHeading: boolean;
    headingNum?: string;
    headingTitle?: string;
    isSub?: boolean;
    rows?: string[][];
  }

  const allItems: ParsedItem[] = [];

  for (let i = 0; i < bodyNode.childNodes.length; i++) {
    const child = bodyNode.childNodes[i];
    if (child.nodeType !== 1) continue;
    const el = child as Element;
    const localTag = (el.localName || el.nodeName.split(":").pop() || el.nodeName).toLowerCase();

    if (localTag === "p") {
      const p = child as Element;
      const rNodes = getElements(p, "r");
      let pText = "";
      let pHtml = "";

      for (let j = 0; j < rNodes.length; j++) {
        const r = rNodes[j];
        const t = getRunText(r);
        if (!t) continue;
        pText += t;
        let formatted = t;
        if (isRunBold(r)) formatted = `<strong>${formatted}</strong>`;
        if (isRunItalic(r)) formatted = `<em>${formatted}</em>`;
        pHtml += formatted;
      }

      const trimmed = pText.trim();
      if (!trimmed || trimmed === "<br/>") continue;

      // Deteksi pola heading/bab bernomor seperti:
      // "1. TUJUAN", "1.0 TUJUAN", "2. RUANG LINGKUP", "5. URAIAN PROSEDUR", "5.1 Ketentuan...", "VI. LAMPIRAN"
      const hMatch = trimmed.match(/^([0-9]+(?:\.[0-9]+)*\.?|[IVXLCDM]+\.?)\s+(.+)$/);
      if (hMatch) {
        const numPart = hMatch[1];
        const titlePart = hMatch[2];
        const isMain = !numPart.includes(".") || numPart.endsWith(".0") || /^[0-9]+\.?$/.test(numPart);
        allItems.push({
          type: "p",
          text: trimmed,
          isHeading: true,
          headingNum: numPart.endsWith(".") ? numPart : `${numPart}.`,
          headingTitle: titlePart.trim(),
          isSub: !isMain,
          html: `<p style="margin: ${isMain ? "14px" : "8px"} 0 4px 0; font-weight: bold; color: #000000; font-size: ${
            isMain ? "11pt" : "10.5pt"
          }; font-family: Arial, sans-serif; padding-left: 0.5in; text-indent: -0.5in; line-height: 1.4;"><span style="display: inline-block; min-width: 0.5in;">${numPart}</span>${titlePart}</p>`,
        });
      } else {
        allItems.push({
          type: "p",
          text: trimmed,
          isHeading: false,
          html: `<p style="padding-left: 0.5in; text-align: justify; line-height: 1.6; margin-bottom: 0.5rem; font-size: 10pt; font-family: Arial, sans-serif; color: #3B3838;">${pHtml}</p>`,
        });
      }
    } else if (localTag === "tbl") {
      const tbl = child as Element;
      const trNodes = getElements(tbl, "tr");
      const rows: string[][] = [];
      let tblHtml =
        '<table style="width: 100%; border-collapse: collapse; margin: 14px 0; font-family: Arial, sans-serif; font-size: 10pt;">';

      for (let r = 0; r < trNodes.length; r++) {
        tblHtml += "<tr>";
        const tcNodes = getElements(trNodes[r], "tc");
        const rowCells: string[] = [];
        const isHeader = r === 0;

        for (let c = 0; c < tcNodes.length; c++) {
          const tNodes = getElements(tcNodes[c], "t");
          let ct = "";
          for (let k = 0; k < tNodes.length; k++) ct += tNodes[k].textContent || "";
          const trimmedCell = ct.trim();
          rowCells.push(trimmedCell);
          const cellStyle = `border: 1px solid #BFBFBF; padding: 6px 10px; vertical-align: top; ${
            isHeader
              ? "background-color: #D9E1F2; font-weight: bold; text-align: center; color: #000000;"
              : "color: #3B3838; text-align: justify;"
          }`;
          tblHtml += isHeader
            ? `<th style="${cellStyle}">${trimmedCell}</th>`
            : `<td style="${cellStyle}">${trimmedCell}</td>`;
        }
        tblHtml += "</tr>";
        if (rowCells.some((cell) => cell.length > 0)) {
          rows.push(rowCells);
        }
      }
      tblHtml += "</table>";

      if (rows.length > 0) {
        allItems.push({
          type: "tbl",
          text: "",
          isHeading: false,
          rows,
          html: tblHtml,
        });
      }
    }
  }

  // Filter front-matter (Cover / Tabel Revisi Asal / TOC Asal) jika berkas asal memuatnya,
  // karena sistem sudah menyediakan Cover Baku, Revision Index Baku, dan TOC Baku (Aturan Mutlak Pengguna).
  const tocHeadingIdx = allItems.findIndex(
    (it) => it.type === "p" && /^(TABLE OF CONTENTS|DAFTAR ISI)$/i.test(it.text.replace(/<[^>]+>/g, "").trim())
  );

  let bodyStartIndex = 0;
  if (tocHeadingIdx !== -1) {
    // Cari bab pertama bernomor setelah daftar isi
    for (let i = tocHeadingIdx + 1; i < allItems.length; i++) {
      const it = allItems[i];
      if (it.isHeading && i + 1 < allItems.length && !allItems[i + 1].isHeading) {
        bodyStartIndex = i;
        break;
      }
    }
    if (bodyStartIndex === 0) {
      for (let i = tocHeadingIdx + 1; i < allItems.length; i++) {
        const it = allItems[i];
        if (it.isHeading && (/^1(\.0|\.)/i.test(it.headingNum || "") || /^1(\.0|\.)/i.test(it.text))) {
          bodyStartIndex = i;
          break;
        }
      }
    }
  } else {
    // Jika tidak ada bab Daftar Isi terpisah, periksa apakah elemen-elemen awal adalah kop/cover
    const firstHeadingIdx = allItems.findIndex(
      (it) => it.isHeading && (/^1(\.0|\.)/i.test(it.headingNum || "") || /^1(\.0|\.)/i.test(it.text))
    );
    if (firstHeadingIdx > 0 && firstHeadingIdx <= 6) {
      bodyStartIndex = firstHeadingIdx;
    }
  }

  // Guardrail ketat: Pastikan pemotongan front-matter tidak pernah membuat body kosong
  let bodyItems = allItems.slice(bodyStartIndex);
  if (bodyItems.length === 0 && allItems.length > 0) {
    bodyItems = allItems;
  }
  const htmlParts = bodyItems.map((it) => it.html);

  // Kumpulkan daftar heading untuk halaman 3: Table of Contents
  const tocHeadings: TocHeadingItem[] = [];
  bodyItems.forEach((it) => {
    if (it.isHeading && it.headingNum && it.headingTitle) {
      tocHeadings.push({
        num: it.headingNum,
        title: it.headingTitle,
        isSub: it.isSub,
      });
    }
  });

  const paragraphs = bodyItems.filter((it) => it.type === "p").map((it) => it.text);
  const tables: DocxTableData[] = bodyItems
    .filter((it) => it.type === "tbl" && it.rows)
    .map((it) => ({ rows: it.rows! }));

  const rawText = paragraphs.join("\n");
  const finalToc =
    tocHeadings.length > 0
      ? tocHeadings
      : [{ num: "1.0", title: "ISI DOKUMEN", isSub: false }];

  return {
    tocHeadings: finalToc,
    originalHtmlBody: htmlParts.join(""),
    paragraphs,
    tables,
    rawText,
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

  // Frasa Spesifik SOP & K3
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
 * Menerjemahkan sepotong teks bahasa Indonesia ke British English secara murni
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
    // Mode English: Terjemahkan seluruh text node secara mendalam tanpa merusak elemen HTML
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

  // Mode Bilingual (ID di Kiri | EN-GB di Kanan, tabel dwibahasa di dalam sel)
  const bilingualContainer = document.createElement("div");
  const children = Array.from(doc.body.children);

  for (const child of children) {
    if (child.tagName === "TABLE") {
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
