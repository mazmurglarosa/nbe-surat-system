import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  BorderStyle,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  TabStopType,
  ShadingType,
  convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";
import { DocxTableData } from "./docxExtractor";
import { formatNbeStandardDate } from "./dateFormatter";
import { paginateHtmlContent } from "./docxOriginalExtractor";

export type LanguageMode = "id" | "en" | "bi";

export interface NbeDocumentPayload {
  docCode: string;
  titleId: string;
  titleEn: string;
  categoryNameId: string;
  divisionName: string;
  revisionNo: string;
  issueDateId: string;
  issueDateEn: string;
  preparedBy: string;
  preparedRole: string;
  verifiedBy: string;
  verifiedRole: string;
  approvedBy: string;
  approvedRole: string;
  language: LanguageMode;
  coverLogoBuffer?: ArrayBuffer | null;
  kopLogoBuffer?: ArrayBuffer | null;
  coverLogoWidthInches?: number;
  kopLogoWidthInches?: number;
  tocList?: Array<{ num: string; title: string; isSub?: boolean }>;
  bodyPages?: string[][];
  isProcedureOrSop?: boolean;
  preservedBodyParagraphs?: string[];
  bodyTables?: DocxTableData[];
  revisionRows?: Array<{ rev: string; date: string; description: string; revisedBy: string }>;
  paperSize?: "A4" | "F4";
  bodyPagesHtml?: string[];
  originalHtmlBody?: string;
}

export function cleanRole(role?: string): string {
  if (!role) return "";
  let clean = role.trim();
  while (clean.startsWith("(") && clean.endsWith(")")) {
    clean = clean.substring(1, clean.length - 1).trim();
  }
  return clean;
}

const COLOR_BLACK = "000000";
const COLOR_BODY = "3B3838";
const COLOR_NAVY = "003366";
const COLOR_HEADER_FILL = "D9E1F2";
const COLOR_ALT_ROW = "F9FBFD";
const COLOR_BORDER = "BFBFBF";

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER };
const tableBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
  insideHorizontal: thinBorder,
  insideVertical: thinBorder,
};
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

interface FormattedSpan {
  text: string;
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  size?: number;
  font?: string;
}

function parseColorToHex(colorStr?: string): string | undefined {
  if (!colorStr) return undefined;
  const c = colorStr.trim().toLowerCase();
  if (c.startsWith("#")) {
    const hex = c.replace("#", "");
    if (hex.length === 3) {
      return hex.split("").map((x) => x + x).join("").toUpperCase();
    }
    return hex.toUpperCase();
  }
  const rgbMatch = c.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, "0");
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, "0");
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, "0");
    return `${r}${g}${b}`.toUpperCase();
  }
  if (c === "black") return "000000";
  if (c === "white") return "FFFFFF";
  if (c === "navy") return "003366";
  if (c === "gray" || c === "grey") return "808080";
  return undefined;
}

function parseFontSizeToPt(sizeStr?: string): number | undefined {
  if (!sizeStr) return undefined;
  const s = sizeStr.trim().toLowerCase();
  if (s.endsWith("pt")) return parseFloat(s);
  if (s.endsWith("px")) return parseFloat(s) * 0.75;
  if (s.endsWith("rem") || s.endsWith("em")) return parseFloat(s) * 12;
  return undefined;
}

function parseDimensionToTwip(dimStr?: string): number {
  if (!dimStr) return 0;
  const s = dimStr.trim().toLowerCase();
  if (s.endsWith("in")) return Math.round(parseFloat(s) * 1440);
  if (s.endsWith("cm")) return Math.round(parseFloat(s) * 567);
  if (s.endsWith("mm")) return Math.round(parseFloat(s) * 56.7);
  if (s.endsWith("pt")) return Math.round(parseFloat(s) * 20);
  if (s.endsWith("px")) return Math.round(parseFloat(s) * 15);
  return 0;
}

type AlignmentTypeValue = (typeof AlignmentType)[keyof typeof AlignmentType];

function getParagraphAlignment(alignStr?: string): AlignmentTypeValue {
  switch (alignStr?.toLowerCase()) {
    case "center": return AlignmentType.CENTER;
    case "right": return AlignmentType.RIGHT;
    case "justify": return AlignmentType.JUSTIFIED;
    default: return AlignmentType.LEFT;
  }
}

function parseFormattedSpans(node: Node, currentFormat: FormattedSpan = { text: "" }): FormattedSpan[] {
  const spans: FormattedSpan[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    if (text) {
      spans.push({ ...currentFormat, text });
    }
    return spans;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    if (tagName === "br") {
      spans.push({ ...currentFormat, text: "\n" });
      return spans;
    }

    const nextFormat: FormattedSpan = { ...currentFormat, text: "" };

    if (tagName === "b" || tagName === "strong") nextFormat.bold = true;
    if (tagName === "i" || tagName === "em") nextFormat.italics = true;
    if (tagName === "u") nextFormat.underline = true;
    if (tagName === "s" || tagName === "strike" || tagName === "del") nextFormat.strike = true;

    const style = el.style;
    if (style) {
      if (style.fontWeight === "bold" || parseInt(style.fontWeight, 10) >= 600) nextFormat.bold = true;
      if (style.fontStyle === "italic") nextFormat.italics = true;
      if (style.textDecoration && style.textDecoration.includes("underline")) nextFormat.underline = true;
      if (style.textDecoration && style.textDecoration.includes("line-through")) nextFormat.strike = true;
      if (style.color) {
        const hex = parseColorToHex(style.color);
        if (hex) nextFormat.color = hex;
      }
      if (style.fontSize) {
        const pt = parseFontSizeToPt(style.fontSize);
        if (pt) nextFormat.size = Math.round(pt * 2);
      }
      if (style.fontFamily) {
        const primary = style.fontFamily.split(",")[0].replace(/['"]/g, "").trim();
        if (primary) nextFormat.font = primary;
      }
    }

    el.childNodes.forEach((child) => {
      spans.push(...parseFormattedSpans(child, nextFormat));
    });
  }

  return spans;
}

function spansToTextRuns(spans: FormattedSpan[], options?: { isHeader?: boolean; isHeading?: boolean }): TextRun[] {
  if (spans.length === 0) {
    return [new TextRun({ text: "" })];
  }

  return spans.map((span) => {
    return new TextRun({
      text: span.text,
      font: span.font || "Arial",
      size: span.size || (options?.isHeader ? 18 : options?.isHeading ? 24 : 21),
      bold: span.bold !== undefined ? span.bold : (options?.isHeader || options?.isHeading ? true : false),
      italics: span.italics || false,
      underline: span.underline ? {} : undefined,
      strike: span.strike || false,
      color: span.color || (options?.isHeader || options?.isHeading ? COLOR_BLACK : COLOR_BODY),
    });
  });
}

function convertTableElementToDocx(tableEl: HTMLTableElement): Table | null {
  const trElements = Array.from(tableEl.querySelectorAll("tr"));
  if (trElements.length === 0) return null;

  let maxCols = 1;
  trElements.forEach((tr) => {
    const cells = Array.from(tr.querySelectorAll("th, td"));
    let count = 0;
    cells.forEach((c) => {
      const span = parseInt(c.getAttribute("colspan") || "1", 10) || 1;
      count += span;
    });
    if (count > maxCols) maxCols = count;
  });

  const firstRowCells = Array.from(trElements[0].querySelectorAll("th, td"));
  const colWidths: number[] = [];
  let explicitWidthsTotal = 0;
  firstRowCells.forEach((c) => {
    const wStr = (c as HTMLElement).style?.width || c.getAttribute("width") || "";
    const pctMatch = wStr.match(/([0-9.]+)%/);
    if (pctMatch) {
      const val = parseFloat(pctMatch[1]);
      colWidths.push(val);
      explicitWidthsTotal += val;
    } else {
      colWidths.push(0);
    }
  });

  const finalColWidths: number[] = [];
  if (colWidths.length === maxCols && explicitWidthsTotal >= 90 && explicitWidthsTotal <= 110) {
    colWidths.forEach((w) => finalColWidths.push(Math.round((w / explicitWidthsTotal) * 100)));
  } else {
    const defaultColWidth = Math.floor(100 / maxCols);
    for (let i = 0; i < maxCols; i++) {
      finalColWidths.push(defaultColWidth);
    }
  }

  const docxRows: TableRow[] = trElements.map((tr, rIdx) => {
    const cellElements = Array.from(tr.querySelectorAll("th, td"));
    const isHeaderRow = rIdx === 0 || tr.parentElement?.tagName.toLowerCase() === "thead" || cellElements.every(c => c.tagName.toLowerCase() === "th");

    const rowCells: TableCell[] = [];
    let colIdx = 0;

    cellElements.forEach((cellEl) => {
      const htmlCell = cellEl as HTMLElement;
      const isTh = htmlCell.tagName.toLowerCase() === "th";
      const colSpan = parseInt(htmlCell.getAttribute("colspan") || "1", 10) || 1;
      const rowSpan = parseInt(htmlCell.getAttribute("rowspan") || "1", 10) || 1;

      let cellWidth = 0;
      for (let s = 0; s < colSpan; s++) {
        cellWidth += finalColWidths[colIdx + s] || Math.floor(100 / maxCols);
      }
      colIdx += colSpan;

      let cellFill = isHeaderRow ? COLOR_HEADER_FILL : rIdx % 2 === 0 ? "FFFFFF" : COLOR_ALT_ROW;
      const bg = htmlCell.style?.backgroundColor || htmlCell.getAttribute("bgcolor") || "";
      if (bg) {
        const hex = parseColorToHex(bg);
        if (hex) cellFill = hex;
      }

      const alignStr = htmlCell.style?.textAlign || (isHeaderRow || isTh ? "center" : "left");
      const alignment = getParagraphAlignment(alignStr);

      const cellParagraphs: Paragraph[] = [];
      const childParas = Array.from(htmlCell.querySelectorAll("p, div"));

      if (childParas.length > 0) {
        childParas.forEach((cp) => {
          const spans = parseFormattedSpans(cp);
          const cpAlign = getParagraphAlignment((cp as HTMLElement).style?.textAlign || alignStr);
          cellParagraphs.push(
            new Paragraph({
              alignment: cpAlign,
              spacing: { before: 40, after: 40, line: 260 },
              children: spansToTextRuns(spans, { isHeader: isHeaderRow || isTh }),
            })
          );
        });
      } else {
        const spans = parseFormattedSpans(htmlCell);
        cellParagraphs.push(
          new Paragraph({
            alignment: alignment,
            spacing: { before: 50, after: 50, line: 260 },
            children: spansToTextRuns(spans, { isHeader: isHeaderRow || isTh }),
          })
        );
      }

      if (cellParagraphs.length === 0) {
        cellParagraphs.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
      }

      rowCells.push(
        new TableCell({
          columnSpan: colSpan > 1 ? colSpan : undefined,
          rowSpan: rowSpan > 1 ? rowSpan : undefined,
          width: { size: cellWidth, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: cellFill, type: ShadingType.CLEAR },
          children: cellParagraphs,
        })
      );
    });

    // Pad row with empty cells if colIdx < maxCols to ensure table geometry is preserved
    while (colIdx < maxCols) {
      rowCells.push(
        new TableCell({
          width: { size: finalColWidths[colIdx] || Math.floor(100 / maxCols), type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: isHeaderRow ? COLOR_HEADER_FILL : rIdx % 2 === 0 ? "FFFFFF" : COLOR_ALT_ROW, type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: "" })] })],
        })
      );
      colIdx++;
    }

    return new TableRow({
      cantSplit: true,
      tableHeader: isHeaderRow,
      children: rowCells,
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: docxRows,
  });
}

function convertHeadingElementToDocx(el: HTMLElement): Paragraph | null {
  const rawText = (el.textContent || "").trim();
  if (!rawText) return null;

  // Bersihkan bullet atau titik liar
  const text = rawText.replace(/^[.·•\u2022\uF0B7-]\s*/, "").trim();

  // Fleksibel: mendukung baik ada spasi maupun tanpa spasi setelah titik (1.PURPOSE maupun 1. PURPOSE)
  const matchHeading = text.match(/^([0-9]+(?:\.[0-9]+)*\.?|[IVXLCDM]+\.?)\s*(.*)$/);
  const tagName = el.tagName.toLowerCase();
  const isMainH = tagName === "h1" || (matchHeading && (!matchHeading[1].includes(".") || matchHeading[1].endsWith(".0")));
  const isKnownSop = /^(URAIAN\s*PROSEDUR|LAMPIRAN|PROCEDURE\s*DESCRIPTION|ATTACHMENTS|TUJUAN|RUANG\s*LINGKUP|DEFINISI|REFERENSI|PURPOSE(\s*[/&]\s*OBJECTIVE)?|SCOPE|REFERENCES|DEFINITIONS)$/i.test(text);

  if (matchHeading && matchHeading[2].trim()) {
    const [, numPart, titlePart] = matchHeading;
    const cleanNum = numPart.endsWith(".") ? numPart : `${numPart}.`;
    return new Paragraph({
      tabStops: [{ type: TabStopType.LEFT, position: 720 }],
      spacing: { before: isMainH ? 240 : 160, after: 80, line: 276 },
      children: [
        new TextRun({
          text: `${cleanNum}\t${titlePart.trim()}`,
          font: "Arial",
          size: isMainH ? 24 : 22,
          bold: true,
          color: COLOR_BLACK,
        }),
      ],
    });
  }

  const spans = parseFormattedSpans(el);
  return new Paragraph({
    spacing: { before: isMainH || isKnownSop ? 240 : 160, after: 80, line: 276 },
    children: spansToTextRuns(spans, { isHeading: true }),
  });
}

function convertParagraphElementToDocx(el: HTMLElement): Paragraph | null {
  const textContent = el.textContent || "";
  const rawTrimmed = textContent.trim();

  if (!rawTrimmed && el.querySelector("img, table") === null) {
    return new Paragraph({ spacing: { before: 0, after: 120 } });
  }

  // Bersihkan bullet atau titik liar
  const trimmed = rawTrimmed.replace(/^[.·•\u2022\uF0B7-]\s*/, "").trim();

  // Fleksibel: mendukung baik ada spasi maupun tanpa spasi setelah titik (1.PURPOSE maupun 1. PURPOSE)
  const matchHeading = trimmed.match(/^([0-9]+(?:\.[0-9]+)*\.?|[IVXLCDM]+\.?)\s*(.*)$/);
  const isBold = el.style?.fontWeight === "bold" || el.querySelector("b, strong") !== null;
  const isKnownSop = /^(URAIAN\s*PROSEDUR|LAMPIRAN|PROCEDURE\s*DESCRIPTION|ATTACHMENTS|TUJUAN|RUANG\s*LINGKUP|DEFINISI|REFERENSI|PURPOSE(\s*[/&]\s*OBJECTIVE)?|SCOPE|REFERENCES|DEFINITIONS)$/i.test(trimmed);

  if (matchHeading && matchHeading[2].trim() && (isBold || trimmed.length < 90)) {
    const [, numPart, titlePart] = matchHeading;
    const cleanNum = numPart.endsWith(".") ? numPart : `${numPart}.`;
    const isMainHeading = !numPart.includes(".") || numPart.endsWith(".0");
    return new Paragraph({
      tabStops: [{ type: TabStopType.LEFT, position: 720 }],
      spacing: { before: isMainHeading ? 220 : 140, after: 80, line: 276 },
      children: [
        new TextRun({
          text: `${cleanNum}\t${titlePart.trim()}`,
          font: "Arial",
          size: isMainHeading ? 24 : 22,
          bold: true,
          color: COLOR_BLACK,
        }),
      ],
    });
  }

  if (isKnownSop) {
    const isMajor = /^(URAIAN\s*PROSEDUR|LAMPIRAN|PROCEDURE\s*DESCRIPTION|ATTACHMENTS)$/i.test(trimmed);
    const spans = parseFormattedSpans(el);
    return new Paragraph({
      spacing: { before: isMajor ? 240 : 180, after: 90, line: 276 },
      children: spansToTextRuns(spans, { isHeading: true }),
    });
  }

  const isCapsHeading = /^[A-Z0-9\s:/-]{4,60}$/.test(trimmed) && trimmed.length < 50;
  const alignment = getParagraphAlignment(el.style?.textAlign || (isCapsHeading ? "left" : "justify"));
  const spans = parseFormattedSpans(el);

  let indentTwip = isCapsHeading ? 0 : 720;
  if (el.style?.paddingLeft) {
    indentTwip = parseDimensionToTwip(el.style.paddingLeft);
  } else if (el.style?.marginLeft) {
    indentTwip = parseDimensionToTwip(el.style.marginLeft);
  }

  let hangingTwip = 0;
  if (el.style?.textIndent) {
    const ti = parseDimensionToTwip(el.style.textIndent);
    if (ti < 0) hangingTwip = Math.abs(ti);
  }

  return new Paragraph({
    alignment: alignment,
    indent: indentTwip > 0 ? { left: indentTwip, hanging: hangingTwip > 0 ? hangingTwip : undefined } : undefined,
    tabStops: [{ type: TabStopType.LEFT, position: 720 }],
    spacing: { before: isCapsHeading ? 180 : 0, after: isCapsHeading ? 100 : 80, line: 276 },
    children: spansToTextRuns(spans, { isHeading: isCapsHeading }),
  });
}

function convertHtmlPageToDocxElements(pageHtml: string): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  if (typeof DOMParser === "undefined") {
    return elements;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(pageHtml, "text/html");
  const children = Array.from(doc.body.children);

  if (children.length === 0 && doc.body.textContent?.trim()) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: 720 },
        spacing: { before: 0, after: 100, line: 276 },
        children: [new TextRun({ text: doc.body.textContent.trim(), font: "Arial", size: 21, color: COLOR_BODY })],
      })
    );
    return elements;
  }

  children.forEach((el) => {
    const tagName = el.tagName.toLowerCase();

    if (tagName === "table") {
      const table = convertTableElementToDocx(el as HTMLTableElement);
      if (table) {
        elements.push(table);
        elements.push(new Paragraph({ spacing: { after: 180 } }));
      }
      return;
    }

    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)) {
      const p = convertHeadingElementToDocx(el as HTMLElement);
      if (p) elements.push(p);
      return;
    }

    if (tagName === "ul" || tagName === "ol") {
      const listItems = Array.from(el.querySelectorAll("li"));
      listItems.forEach((li, liIdx) => {
        const bulletText = tagName === "ol" ? `${liIdx + 1}.\t` : "•\t";
        const spans = parseFormattedSpans(li);
        elements.push(
          new Paragraph({
            indent: { left: 720, hanging: 360 },
            tabStops: [{ type: TabStopType.LEFT, position: 720 }],
            spacing: { before: 40, after: 60, line: 276 },
            children: [
              new TextRun({ text: bulletText, font: "Arial", size: 21, bold: true, color: COLOR_BLACK }),
              ...spansToTextRuns(spans),
            ],
          })
        );
      });
      return;
    }

    const p = convertParagraphElementToDocx(el as HTMLElement);
    if (p) elements.push(p);
  });

  return elements;
}

export function extractTocFromContent(
  bodyPagesHtml?: string[],
  preservedParagraphs?: string[]
): Array<{ num: string; title: string; isSub?: boolean }> {
  const items: Array<{ num: string; title: string; isSub?: boolean }> = [];
  const seen = new Set<string>();

  const processLine = (text: string, isFromHeadingTag: boolean = false) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const match = trimmed.match(/^([0-9]+(?:\.[0-9]+)*\.?|[IVXLCDM]+\.?)\s+([A-Za-z0-9\s/&,()._-]+)$/);
    if (match) {
      let num = match[1].replace(/\.$/, "");
      if (/^[0-9]+$/.test(num)) {
        num = `${num}.0`;
      }
      const title = match[2].trim().toUpperCase();
      const key = `${num}_${title}`;
      if (!seen.has(key)) {
        seen.add(key);
        const isSub = num.includes(".") && !num.endsWith(".0");
        items.push({ num, title, isSub });
      }
    } else if (isFromHeadingTag && trimmed.length < 80) {
      const nextNum = `${items.length + 1}.0`;
      const key = `${nextNum}_${trimmed.toUpperCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ num: nextNum, title: trimmed.toUpperCase(), isSub: false });
      }
    }
  };

  if (bodyPagesHtml && bodyPagesHtml.length > 0 && typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    bodyPagesHtml.forEach((pageHtml) => {
      const doc = parser.parseFromString(pageHtml, "text/html");
      const headingsAndParas = doc.body.querySelectorAll("h1, h2, h3, h4, p, div");
      headingsAndParas.forEach((el) => {
        const isH = ["h1", "h2", "h3", "h4"].includes(el.tagName.toLowerCase());
        const isBold = (el as HTMLElement).style?.fontWeight === "bold" || el.querySelector("b, strong") !== null;
        const text = (el as HTMLElement).innerText || el.textContent || "";
        if (isH || isBold || /^[0-9]+(?:\.[0-9]+)*\.?\s+/.test(text.trim())) {
          processLine(text, isH);
        }
      });
    });
  } else if (preservedParagraphs && preservedParagraphs.length > 0) {
    preservedParagraphs.forEach((p) => processLine(p));
  }

  return items;
}

function buildRunningHeader(data: NbeDocumentPayload): Header {
  const isKB = data.docCode.includes("-KB-") || (data.categoryNameId && data.categoryNameId.toUpperCase().includes("KEBIJAKAN"));
  const kopTitle = isKB
    ? (data.language === "en"
      ? `BOARD OF DIRECTORS' RESOLUTION: ${(data.titleEn || data.titleId).toUpperCase()}`
      : data.language === "bi"
      ? `SURAT KEPUTUSAN DIREKSI / BOARD RESOLUTION: ${data.titleId.toUpperCase()}`
      : `SURAT KEPUTUSAN DIREKSI: ${data.titleId.toUpperCase()}`)
    : `${(data.categoryNameId || "STANDAR OPERASIONAL PROSEDUR").toUpperCase()}: ${data.titleId.toUpperCase()}`;

  const rawDate = data.language === "en" ? data.issueDateEn : data.issueDateId;
  const dateStr = formatNbeStandardDate(rawDate, data.language === "en" ? "en" : "id");

  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                rowSpan: 4,
                width: { size: 22, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  ...(data.kopLogoBuffer
                    ? [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [
                            new ImageRun({
                              data: data.kopLogoBuffer,
                              transformation: {
                                width: data.kopLogoWidthInches ? Math.round(data.kopLogoWidthInches * 72) : 105,
                                height: data.kopLogoWidthInches ? Math.round(data.kopLogoWidthInches * 72 * 0.69) : 72,
                              },
                              type: "png",
                            }),
                          ],
                        }),
                      ]
                    : []),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "PT NIRWANA BHUMI ENERGY", font: "Arial", size: 16, bold: true, color: COLOR_NAVY })],
                  }),
                ],
              }),
              new TableCell({
                columnSpan: 3,
                width: { size: 78, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: data.divisionName || "GENERAL & MANAGEMENT (GNR)", font: "Arial", size: 18, bold: true, color: COLOR_BLACK })],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                columnSpan: 3,
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: data.categoryNameId || "KEBIJAKAN PERUSAHAAN (COMPANY POLICY / KB)", font: "Arial", size: 17, bold: true, color: COLOR_BODY })],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                columnSpan: 3,
                verticalAlign: VerticalAlign.CENTER,
                shading: { fill: COLOR_HEADER_FILL, type: ShadingType.CLEAR },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: kopTitle, font: "Arial", size: 17, bold: true, color: COLOR_BLACK })],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `Revision: ${data.revisionNo}`, font: "Arial", size: 16, color: COLOR_BODY })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 33, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: data.docCode, font: "Arial", size: 16, bold: true, color: COLOR_NAVY })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `Date : ${dateStr}`, font: "Arial", size: 16, color: COLOR_BODY })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ spacing: { after: 160 } }),
    ],
  });
}

export function buildNbeDocument(data: NbeDocumentPayload): Document {
  const isEn = data.language === "en";
  const isBi = data.language === "bi";

  const isKB = data.docCode.includes("-KB-") || (data.categoryNameId && data.categoryNameId.toUpperCase().includes("KEBIJAKAN"));

  const coverDocType = isKB
    ? (isEn
      ? "BOARD OF DIRECTORS' RESOLUTION"
      : isBi
      ? "SURAT KEPUTUSAN DIREKSI / BOARD OF DIRECTORS' RESOLUTION"
      : "SURAT KEPUTUSAN DIREKSI")
    : (data.categoryNameId || "DOKUMEN RESMI STANDAR").toUpperCase();

  const cleanTitleId = data.titleId || "SISTEM MANAJEMEN PENGENDALIAN DOKUMEN";
  const cleanTitleEn = data.titleEn || "ESTABLISHMENT OF DOCUMENT CONTROL MANAGEMENT SYSTEM";

  const coverSubject = isKB
    ? (isEn
      ? `CONCERNING ${cleanTitleEn.toUpperCase()}`
      : isBi
      ? `TENTANG ${cleanTitleId.toUpperCase()}\n(CONCERNING ${cleanTitleEn.toUpperCase()})`
      : `TENTANG ${cleanTitleId.toUpperCase()}`)
    : cleanTitleId.toUpperCase();

  const revDescription =
    data.revisionNo === "0" || data.revisionNo === ""
      ? isEn
        ? `Initial Edition – ${cleanTitleEn} of PT Nirwana Bhumi Energy`
        : isBi
        ? `Initial Edition – ${cleanTitleId} / ${cleanTitleEn}`
        : `Initial Edition – ${cleanTitleId} PT Nirwana Bhumi Energy`
      : `Revision ${data.revisionNo} – Updated Controlled Document`;

  const docYear =
    data.issueDateId?.match(/\b(20\d\d)\b/)?.[1] ||
    data.issueDateEn?.match(/\b(20\d\d)\b/)?.[1] ||
    data.docCode?.match(/\b(20\d\d)\b/)?.[1] ||
    "2026";

  // HALAMAN 1: COVER PAGE
  const coverWidthPt = data.coverLogoWidthInches ? Math.round(data.coverLogoWidthInches * 72) : 220;
  const coverHeightPt = Math.round(coverWidthPt * 0.35);

  const coverLogoParagraphs = data.coverLogoBuffer
    ? [
        new Paragraph({
          spacing: { before: 1800, after: 140 },
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: data.coverLogoBuffer,
              transformation: { width: coverWidthPt, height: coverHeightPt },
              type: "png",
            }),
          ],
        }),
      ]
    : [];

  const page1Children: Paragraph[] = [
    ...coverLogoParagraphs,
    new Paragraph({
      spacing: { before: data.coverLogoBuffer ? 0 : 2200, after: 200 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "PT NIRWANA BHUMI ENERGY", font: "Arial", size: 40, bold: true, color: COLOR_BLACK })],
    }),
    new Paragraph({
      spacing: { before: 240, after: 140 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: coverDocType, font: "Arial", size: 31, bold: true, color: COLOR_BLACK })],
    }),
    new Paragraph({
      spacing: { before: 120, after: 200 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: coverSubject, font: "Arial", size: 23, bold: true, color: COLOR_BODY })],
    }),
    new Paragraph({
      spacing: { before: 100, after: 360 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: isEn ? `Document Number: ${data.docCode}` : `Nomor Dokumen: ${data.docCode}`,
          font: "Arial",
          size: 22,
          bold: true,
          color: COLOR_NAVY,
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 1400, after: 1400 } }),
    new Paragraph({
      indent: { left: convertInchesToTwip(3.45) },
      spacing: { after: 60 },
      children: [
        new TextRun({ text: "Approved by\t: ", font: "Arial", size: 19, bold: true, color: COLOR_BLACK }),
        new TextRun({
          text: `${data.approvedBy}${cleanRole(data.approvedRole) ? ` (${cleanRole(data.approvedRole)})` : ""}`,
          font: "Arial",
          size: 19,
          color: COLOR_BODY,
        }),
      ],
    }),
    new Paragraph({
      indent: { left: convertInchesToTwip(3.45) },
      spacing: { after: 60 },
      children: [
        new TextRun({ text: "Verified by\t: ", font: "Arial", size: 19, bold: true, color: COLOR_BLACK }),
        new TextRun({
          text: `${data.verifiedBy}${cleanRole(data.verifiedRole) ? ` (${cleanRole(data.verifiedRole)})` : ""}`,
          font: "Arial",
          size: 19,
          color: COLOR_BODY,
        }),
      ],
    }),
    new Paragraph({
      indent: { left: convertInchesToTwip(3.45) },
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "Prepared by\t: ", font: "Arial", size: 19, bold: true, color: COLOR_BLACK }),
        new TextRun({
          text: `${data.preparedBy}${cleanRole(data.preparedRole) ? ` (${cleanRole(data.preparedRole)})` : ""}`,
          font: "Arial",
          size: 19,
          color: COLOR_BODY,
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // HALAMAN 2: REVISION INDEX (Otomatis dari Tabel Index Revisi Dokumen)
  const revisionTableRows = [
    new TableRow({
      cantSplit: true,
      tableHeader: true,
      children: ["Revision", "Date", "Description of Changes", "Revised By"].map((colTitle, idx) =>
        new TableCell({
          width: { size: [12, 18, 50, 20][idx], type: WidthType.PERCENTAGE },
          shading: { fill: COLOR_HEADER_FILL, type: ShadingType.CLEAR },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: colTitle, font: "Arial", size: 19, bold: true, color: COLOR_BLACK })],
            }),
          ],
        })
      ),
    }),
    ...(data.revisionRows && data.revisionRows.length > 0
      ? data.revisionRows.map((r, rIdx) =>
          new TableRow({
            cantSplit: true,
            children: [r.rev, formatNbeStandardDate(r.date, isEn ? "en" : "id"), r.description, r.revisedBy].map((val, idx) =>
              new TableCell({
                verticalAlign: VerticalAlign.CENTER,
                shading: { fill: rIdx % 2 === 0 ? COLOR_ALT_ROW : "FFFFFF", type: ShadingType.CLEAR },
                children: [
                  new Paragraph({
                    alignment: idx < 2 ? AlignmentType.CENTER : AlignmentType.LEFT,
                    children: [new TextRun({ text: val, font: "Arial", size: 18, color: COLOR_BODY })],
                  }),
                ],
              })
            ),
          })
        )
      : [
          new TableRow({
            cantSplit: true,
            children: [data.revisionNo || "0", isEn ? data.issueDateEn : data.issueDateId, revDescription, data.preparedBy].map(
              (val, idx) =>
                new TableCell({
                  verticalAlign: VerticalAlign.CENTER,
                  shading: { fill: COLOR_ALT_ROW, type: ShadingType.CLEAR },
                  children: [
                    new Paragraph({
                      alignment: idx === 2 ? AlignmentType.LEFT : AlignmentType.CENTER,
                      children: [new TextRun({ text: val, font: "Arial", size: 18, color: COLOR_BODY })],
                    }),
                  ],
                })
            ),
          }),
        ]),
  ];

  const page2Children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 200 },
      children: [new TextRun({ text: data.language === "en" ? "REVISION INDEX" : "TABEL INDEKS REVISI", font: "Arial", size: 24, bold: true, color: COLOR_BLACK })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows: revisionTableRows,
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  // POIN 8: HALAMAN 3 KHUSUS DAFTAR ISI (TABLE OF CONTENTS) DALAM 1 HALAMAN TERSENDIRI
  let effectiveTocList = data.tocList && data.tocList.length > 0 ? data.tocList : null;

  const isGenericPlaceholder =
    !effectiveTocList ||
    (effectiveTocList.length === 1 &&
      (effectiveTocList[0].title.includes("DOCUMENT CONTENT") ||
        effectiveTocList[0].title.includes("ISI DOKUMEN")));

  if (isGenericPlaceholder) {
    const extracted = extractTocFromContent(data.bodyPagesHtml, data.preservedBodyParagraphs);
    if (extracted.length > 0) {
      effectiveTocList = extracted;
    } else if (!isKB) {
      effectiveTocList = [{ num: "1.0", title: isEn ? "DOCUMENT CONTENT" : "ISI DOKUMEN" }];
    }
  }

  const page3TocChildren: Paragraph[] = [];
  if (effectiveTocList) {
    page3TocChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 300 },
        children: [new TextRun({ text: data.language === "en" ? "TABLE OF CONTENTS" : "DAFTAR ISI", font: "Arial", size: 26, bold: true, color: COLOR_BLACK })],
      }),
      ...effectiveTocList.map((item) =>
        new Paragraph({
          indent: { left: item.isSub ? 720 : 0 },
          tabStops: [{ type: TabStopType.LEFT, position: item.isSub ? 1440 : 720 }],
          spacing: { before: item.isSub ? 30 : 60, after: item.isSub ? 30 : 60, line: 260 },
          children: [
            new TextRun({
              text: `${item.num}\t${item.title}`,
              font: "Arial",
              size: 21,
              bold: !item.isSub,
              color: item.isSub ? COLOR_BODY : COLOR_BLACK,
            }),
          ],
        })
      ),
      new Paragraph({ children: [new PageBreak()] })
    );
  }

  // HALAMAN 4+: JIKA DOKUMEN MEMILIKI BODY PAGES / ISI ASLI / TABEL ASLI / DOKUMEN PROSEDUR
  const htmlPagesToUse = (data.bodyPagesHtml && data.bodyPagesHtml.length > 0)
    ? data.bodyPagesHtml
    : (data.originalHtmlBody ? paginateHtmlContent(data.originalHtmlBody) : null);

  const hasBodyPagesHtml = htmlPagesToUse && htmlPagesToUse.length > 0;
  const hasPreservedParagraphs = data.preservedBodyParagraphs && data.preservedBodyParagraphs.length > 0;
  const hasPreservedTables = data.bodyTables && data.bodyTables.length > 0;
  const hasBodyPages = data.bodyPages && data.bodyPages.length > 0;

  if (hasBodyPagesHtml || hasBodyPages || hasPreservedParagraphs || hasPreservedTables || !isKB) {
    const proceduralBodyChildren: (Paragraph | Table)[] = [];

    // Prioritas 1: Jika memiliki bodyPagesHtml atau originalHtmlBody terpaginasi (HTML WYSIWYG presisi)
    if (hasBodyPagesHtml && htmlPagesToUse) {
      htmlPagesToUse.forEach((pageHtml, pIdx) => {
        const pageElements = convertHtmlPageToDocxElements(pageHtml);
        proceduralBodyChildren.push(...pageElements);
        if (pIdx < htmlPagesToUse.length - 1) {
          proceduralBodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        }
      });
    } else if (hasBodyPages && data.bodyPages) {
      data.bodyPages.forEach((pageParagraphs, pIdx) => {
        pageParagraphs.forEach((rawLine) => {
          const matchHeading = rawLine.trim().match(/^([0-9]+(?:\.[0-9]+)*\.?|[IVXLCDM]+\.?)\s*(.*)$/);
          if (matchHeading && matchHeading[2].trim()) {
            const [, numPart, titlePart] = matchHeading;
            const cleanNum = numPart.endsWith(".") ? numPart : `${numPart}.`;
            const isMainHeading = !numPart.includes(".") || numPart.endsWith(".0");
            proceduralBodyChildren.push(
              new Paragraph({
                tabStops: [{ type: TabStopType.LEFT, position: 720 }],
                spacing: { before: isMainHeading ? 220 : 140, after: 80, line: 276 },
                children: [
                  new TextRun({
                    text: `${cleanNum}\t${titlePart.trim()}`,
                    font: "Arial",
                    size: isMainHeading ? 24 : 22,
                    bold: true,
                    color: COLOR_BLACK,
                  }),
                ],
              })
            );
          } else {
            proceduralBodyChildren.push(
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                indent: { left: 720 },
                spacing: { before: 0, after: 100, line: 276 },
                children: [
                  new TextRun({
                    text: rawLine,
                    font: "Arial",
                    size: 21,
                    color: COLOR_BODY,
                  }),
                ],
              })
            );
          }
        });
        if (pIdx < data.bodyPages!.length - 1) {
          proceduralBodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        }
      });
    } else if (hasPreservedParagraphs && data.preservedBodyParagraphs) {
      // Helper untuk membangun tabel docx dari data.bodyTables
      const buildDocxTables = (): (Paragraph | Table)[] => {
        const result: (Paragraph | Table)[] = [];
        if (!data.bodyTables) return result;
        data.bodyTables.forEach((tblData) => {
          if (!tblData.rows || tblData.rows.length === 0) return;
          const colCount = Math.max(...tblData.rows.map((r) => r.length), 1);
          const colWidth = Math.floor(100 / colCount);
          const docxRows = tblData.rows.map((rowCells, rIdx) => {
            const isHeader = rIdx === 0;
            return new TableRow({
              cantSplit: true,
              tableHeader: isHeader,
              children: rowCells.map((cellText) =>
                new TableCell({
                  width: { size: colWidth, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  shading: {
                    fill: isHeader ? COLOR_HEADER_FILL : rIdx % 2 === 0 ? "FFFFFF" : COLOR_ALT_ROW,
                    type: ShadingType.CLEAR,
                  },
                  children: [
                    new Paragraph({
                      alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
                      spacing: { before: 60, after: 60 },
                      children: [
                        new TextRun({
                          text: cellText,
                          font: "Arial",
                          size: isHeader ? 18 : 17,
                          bold: isHeader,
                          color: isHeader ? COLOR_BLACK : COLOR_BODY,
                        }),
                      ],
                    }),
                  ],
                })
              ),
            });
          });

          result.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              rows: docxRows,
            }),
            new Paragraph({ spacing: { after: 240 } })
          );
        });
        return result;
      };

      let tablesInserted = false;

      data.preservedBodyParagraphs.forEach((paraText, idx) => {
        const trimmed = paraText.trim();
        const isTableAnchor = /^(URAIAN\s*PROSEDUR|PROCEDURE\s*DESCRIPTION|5\.0|5\.)/i.test(trimmed);
        const nextPara = idx + 1 < data.preservedBodyParagraphs!.length ? data.preservedBodyParagraphs![idx + 1].trim() : "";
        const isNextAttachment = /^(LAMPIRAN|ATTACHMENTS|6\.0|6\.)/i.test(nextPara);

        const matchHeading = trimmed.match(/^([0-9]+(?:\.[0-9]+)*\.?|[IVXLCDM]+\.?)\s*(.*)$/);
        const isKnownSop = /^(URAIAN\s*PROSEDUR|LAMPIRAN|PROCEDURE\s*DESCRIPTION|ATTACHMENTS|TUJUAN|RUANG\s*LINGKUP|DEFINISI|REFERENSI|PURPOSE(\s*[/&]\s*OBJECTIVE)?|SCOPE|REFERENCES|DEFINITIONS)$/i.test(trimmed);

        if (matchHeading && matchHeading[2].trim()) {
          const [, numPart, titlePart] = matchHeading;
          const cleanNum = numPart.endsWith(".") ? numPart : `${numPart}.`;
          const isMainHeading = !numPart.includes(".") || numPart.endsWith(".0");
          proceduralBodyChildren.push(
            new Paragraph({
              tabStops: [{ type: TabStopType.LEFT, position: 720 }],
              spacing: { before: isMainHeading ? 220 : 140, after: 80, line: 276 },
              children: [
                new TextRun({
                  text: `${cleanNum}\t${titlePart.trim()}`,
                  font: "Arial",
                  size: isMainHeading ? 24 : 22,
                  bold: true,
                  color: COLOR_BLACK,
                }),
              ],
            })
          );
        } else if (isKnownSop) {
          const isMajor = /^(URAIAN\s*PROSEDUR|LAMPIRAN|PROCEDURE\s*DESCRIPTION|ATTACHMENTS)$/i.test(trimmed);
          proceduralBodyChildren.push(
            new Paragraph({
              spacing: { before: isMajor ? 240 : 180, after: 90, line: 276 },
              children: [
                new TextRun({
                  text: trimmed,
                  font: "Arial",
                  size: 24,
                  bold: true,
                  color: COLOR_BLACK,
                }),
              ],
            })
          );
        } else {
          const isCapsHeading = /^[A-Z0-9\s:/-]{4,}$/.test(trimmed) && trimmed.length < 50;
          proceduralBodyChildren.push(
            new Paragraph({
              alignment: isCapsHeading ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
              indent: { left: isCapsHeading ? 0 : 720 },
              tabStops: [{ type: TabStopType.LEFT, position: 720 }],
              spacing: { before: isCapsHeading ? 240 : 80, after: isCapsHeading ? 100 : 80, line: 276 },
              children: [
                new TextRun({
                  text: trimmed,
                  font: "Arial",
                  size: isCapsHeading ? 22 : 21,
                  bold: isCapsHeading,
                  color: isCapsHeading ? COLOR_BLACK : COLOR_BODY,
                }),
              ],
            })
          );
        }

        // Sisipkan tabel di bawah klausul Uraian Prosedur atau tepat sebelum Lampiran!
        if (!tablesInserted && (isTableAnchor || isNextAttachment) && hasPreservedTables) {
          proceduralBodyChildren.push(...buildDocxTables());
          tablesInserted = true;
        }
      });

      // Jika belum disisipkan karena tidak ada kata kunci yang cocok, sisipkan sekarang
      if (!tablesInserted && hasPreservedTables) {
        proceduralBodyChildren.push(...buildDocxTables());
      }
    } else if (!isKB) {
      proceduralBodyChildren.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.LEFT, position: 720 }],
          spacing: { before: 200, after: 60, line: 276 },
          children: [
            new TextRun({
              text: data.language === "en" ? "1.0\tDOCUMENT CONTENT" : "1.0\tISI DOKUMEN",
              font: "Arial",
              size: 24,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        })
      );
    }

    // Poin 6: DOKUMEN PROSEDUR LANGSUNG BERAKHIR BERSIH TANPA LEMBAR VALIDASI AKHIR!
    return new Document({
      sections: [
        {
          properties: {
            titlePage: true,
            page: {
              size: data.paperSize === "F4" ? { width: 12189, height: 18709 } : { width: 11906, height: 16838 },
              margin: { left: 1247, right: 1134, top: 1134, bottom: 1134 },
            },
          },
          headers: {
            first: new Header({ children: [] }),
            default: buildRunningHeader(data),
          },
          footers: {
            first: new Footer({ children: [] }),
            default: new Footer({
              children: [
                new Paragraph({
                  tabStops: [{ type: TabStopType.RIGHT, position: 9525 }],
                  children: [
                    new TextRun({ text: `© ${docYear} PT Nirwana Bhumi Energy\tPage `, font: "Arial", size: 18, color: "595959" }),
                    new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "595959" }),
                    new TextRun({ text: " of ", font: "Arial", size: 18, color: "595959" }),
                    new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 18, color: "595959" }),
                  ],
                }),
              ],
            }),
          },
          children: [...page1Children, ...page2Children, ...page3TocChildren, ...proceduralBodyChildren],
        },
      ],
    });
  }

  // HALAMAN 3 & 4: ISI SURAT & PENGESAHAN
  const dccTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        cantSplit: true,
        tableHeader: true,
        children: (isEn
          ? ["No.", "Personnel Name", "Structural Position", "DCC Role & Responsibilities"]
          : isBi
          ? ["No.", "Nama Personel / Name", "Jabatan / Position", "Peran & Tanggung Jawab / Role & Responsibilities"]
          : ["No.", "Nama Personel", "Jabatan Struktural", "Peran & Tanggung Jawab DCC"]
        ).map((h, i) =>
          new TableCell({
            width: { size: [8, 26, 26, 40][i], type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_HEADER_FILL, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: h, font: "Arial", size: 18, bold: true, color: COLOR_BLACK })],
              }),
            ],
          })
        ),
      }),
      ...[
        [
          "1",
          data.preparedBy || "Mazmur Gusti Agung Larosa",
          isEn ? "Director of Finance & Engineering" : "Direktur Keuangan & Teknik",
          isEn
            ? "Lead Document Controller & System Administrator: Validates manuscripts, registers unique codes, executes Fix Code, and synchronises Google Drive archives."
            : "Lead Document Controller & System Administrator: Memvalidasi naskah, registrasi kode unik, eksekusi Tombol Fix Kode, dan sinkronisasi arsip Google Drive.",
        ],
        [
          "2",
          data.verifiedBy || "Dennis Raditya",
          isEn ? "Director of Operations & Technology" : "Direktur Operasional & Teknologi",
          isEn
            ? "Technical Verifier & QA Approver: Verifies technical formatting, sub-pixel layout, and compliance with IMS & CSMS quality standards."
            : "Technical Verifier & QA Approver: Memeriksa kesesuaian format teknis, layout sub-pixel, serta kepatuhan standar mutu IMS & CSMS.",
        ],
        [
          "3",
          "Abdul Qodir Al Jailani",
          isEn ? "Commissioner / IMS Lead" : "Komisaris / IMS Lead",
          isEn
            ? "Independent Compliance Overseer: Oversees periodic audits of controlled documents, backdating control, and archive retention integrity."
            : "Independent Compliance Overseer: Mengawasi audit berkala dokumen terkontrol, penomoran masa lalu (backdating), dan integritas retensi arsip.",
        ],
      ].map((rowVals, idx) =>
        new TableRow({
          cantSplit: true,
          children: rowVals.map((val, cIdx) =>
            new TableCell({
              shading: { fill: idx % 2 === 1 ? COLOR_ALT_ROW : "FFFFFF", type: ShadingType.CLEAR },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: cIdx === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                  children: [new TextRun({ text: val, font: "Arial", size: 18, bold: cIdx === 1, color: COLOR_BODY })],
                }),
              ],
            })
          ),
        })
      ),
    ],
  });

  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          isEn ? "Approved By:\nPresident Director / CEO" : isBi ? "Disetujui Oleh / Approved By:\nPresident Director / CEO" : "Disetujui Oleh:\nPresident Director / CEO",
          isEn ? "Verified By:\nDirector of Operations & Tech (CTO)" : isBi ? "Diverifikasi Oleh / Verified By:\nDirector of Operations & Tech (CTO)" : "Diverifikasi Oleh:\nDirector of Operations & Tech (CTO)",
          isEn ? "Prepared & Proposed By:\nDirector of Finance & Eng (CFO / DCC)" : isBi ? "Disiapkan Oleh / Prepared By:\nDirector of Finance & Eng (CFO / DCC)" : "Disiapkan & Diajukan Oleh:\nDirector of Finance & Eng (CFO / DCC)",
        ].map((headerText) =>
          new TableCell({
            width: { size: 33.33, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_HEADER_FILL, type: ShadingType.CLEAR },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: headerText, font: "Arial", size: 17, bold: true, color: COLOR_BLACK })],
              }),
            ],
          })
        ),
      }),
      new TableRow({
        cantSplit: true,
        children: [
          "[ Duty Stamp IDR 10,000 / Meterai ]\n\n[ Signature & Corporate Seal ]",
          "\n[ Signature & Stamp ]\n",
          "\n[ Signature & Stamp ]\n",
        ].map((sigSpace) =>
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 320, after: 320 },
                children: [new TextRun({ text: sigSpace, font: "Arial", size: 16, italics: true, color: COLOR_BODY })],
              }),
            ],
          })
        ),
      }),
      new TableRow({
        cantSplit: true,
        children: [
          `${(data.approvedBy || "BIMA SATRYO HARTANTO").toUpperCase()}\n(${isEn ? "President Director" : "Direktur Utama"})`,
          `${(data.verifiedBy || "DENNIS RADITYA").toUpperCase()}\n(${isEn ? "Director of Operations" : "Direktur Operasional"})`,
          `${(data.preparedBy || "MAZMUR GUSTI AGUNG LAROSA").toUpperCase()}\n(${isEn ? "Director of Finance & Eng" : "Direktur Keuangan & Teknik"})`,
        ].map((person) =>
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: person, font: "Arial", size: 17, bold: true, color: COLOR_BLACK })],
              }),
            ],
          })
        ),
      }),
    ],
  });

  const biRow = (leftText: string, rightText: string, isBold = false) =>
    new TableRow({
      cantSplit: true,
      children: [leftText, rightText].map((txt, i) =>
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: noBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { after: 100 },
              children: [
                new TextRun({
                  text: txt,
                  font: "Arial",
                  size: 18,
                  bold: isBold,
                  italics: i === 1 && !isBold,
                  color: isBold ? COLOR_BLACK : COLOR_BODY,
                }),
              ],
            }),
          ],
        })
      ),
    });

  const page3And4Children: (Paragraph | Table)[] = isBi
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "SURAT KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY\nBOARD OF DIRECTORS' RESOLUTION OF PT NIRWANA BHUMI ENERGY",
              font: "Arial",
              size: 21,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 180 },
          children: [new TextRun({ text: `NOMOR / NUMBER: ${data.docCode}`, font: "Arial", size: 19, bold: true, color: COLOR_NAVY })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [
            biRow("DIREKSI PT NIRWANA BHUMI ENERGY,", "THE BOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY,", true),
            biRow(
              "Menimbang:\na. bahwa dalam rangka mewujudkan standarisasi, akuntabilitas, serta keterlacakan seluruh dokumen di lingkungan PT Nirwana Bhumi Energy, diperlukan sistem tata kelola dan kontrol dokumen yang baku dan terintegrasi;\nb. bahwa guna menjamin kepatuhan terhadap standar IMS (ISO 9001, ISO 14001, ISO 45001) dan CSMS SKK Migas serta PLN, diperlukan penunjukan personel Tim DCC;\nc. bahwa berdasarkan pertimbangan a dan b, perlu menetapkan Surat Keputusan Direksi.",
              "Having Considered:\na. that in order to achieve standardisation, accountability, and traceability of all documents within PT Nirwana Bhumi Energy, a standardised and integrated document control system is required;\nb. that to ensure compliance with IMS standards (ISO 9001, ISO 14001, ISO 45001) and CSMS qualifications of SKK Migas and PLN, the appointment of a DCC Team is requisite;\nc. that based on considerations a and b, it is necessary to enact this Board of Directors' Resolution."
            ),
            biRow(
              "Mengingat:\n1. Akta Pendirian PT Nirwana Bhumi Energy;\n2. Standar ISO 9001:2015 Klausul 7.5 (Documented Information);\n3. Pedoman CSMS SKK Migas & PT PLN (Persero);\n4. Prosedur Baku No. 0001-SOP-GNR-CEO-IX-2026;\n5. Kebijakan Manajemen Terintegrasi No. 0001-KB-GNR-CEO-X-2026.",
              "In View Of:\n1. The Deed of Establishment of PT Nirwana Bhumi Energy;\n2. International Standard ISO 9001:2015 Clause 7.5;\n3. CSMS Guidelines of SKK Migas & PT PLN (Persero);\n4. Standard Operating Procedure No. 0001-SOP-GNR-CEO-IX-2026;\n5. Integrated Management Policy No. 0001-KB-GNR-CEO-X-2026."
            ),
            biRow(
              "MEMUTUSKAN:\nMenetapkan: SURAT KEPUTUSAN DIREKSI TENTANG PENETAPAN SISTEM MANAJEMEN PENGENDALIAN DOKUMEN DAN TIM DCC.",
              "HEREBY RESOLVES:\nTo Enact: BOARD OF DIRECTORS' RESOLUTION CONCERNING THE DOCUMENT CONTROL MANAGEMENT SYSTEM AND DCC TEAM.",
              true
            ),
            biRow(
              "KESATU: Memberlakukan Standar Penomoran Dokumen 6 Segmen:\n[NomorUrut4Digit]-[Kategori]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun]\nAsas mutlak: SATU KODE UNTUK SATU DOKUMEN (1 Kode = 1 Dokumen Sah).",
              "FIRST: To officially enact the 6-Segment Document Numbering System:\n[4DigitSequentialNo]-[DocCategory]-[Division]-[Authoriser]-[RomanMonth]-[Year]\nStrict principle: ONE CODE FOR ONE DOCUMENT (1 Code = 1 Valid Document)."
            ),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [
            biRow(
              "KEDUA: Menunjuk personel berikut sebagai Tim Document Control Center (DCC):",
              "SECOND: To appoint the following personnel as the Document Control Centre (DCC) Team:",
              true
            ),
          ],
        }),
        dccTable,
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [
            biRow(
              "KETIGA: Mengatur registrasi dokumen digital melalui Tombol 'Fix Kode' yang otomatis mengarsipkan dokumen ke Folder Induk Google Drive Korporat NBE (ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF).\nKEEMPAT: Setiap revisi wajib mencantumkan sufiks (-rev1, dst.), mencatat alasan pada Revision Index, dan memusnahkan dokumen usang (obsolete).\nKELIMA: Berlaku efektif sejak tanggal ditetapkan.",
              "THIRD: To govern digital registration via the 'Fix Code' button, automatically archiving documents into the NBE Corporate Google Drive Root Folder (ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF).\nFOURTH: Any amendment must append a suffix (-rev1, etc.), record rationale in the Revision Index, and destroy obsolete copies.\nFIFTH: Enters into force effectively from the date of enactment."
            ),
            biRow(
              `Ditetapkan di : Semarang / Tuban\nPada tanggal : ${data.issueDateId}`,
              `Enacted in : Semarang / Tuban\nOn date : ${formatNbeStandardDate(data.issueDateEn || data.issueDateId, isEn ? "en" : "id")}`,
              true
            ),
          ],
        }),
        signatureTable,
      ]
    : [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: isEn ? "BOARD OF DIRECTORS' RESOLUTION OF PT NIRWANA BHUMI ENERGY" : "SURAT KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY",
              font: "Arial",
              size: 22,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: `${isEn ? "NUMBER" : "NOMOR"}: ${data.docCode}`, font: "Arial", size: 20, bold: true, color: COLOR_NAVY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: isEn ? `CONCERNING\n${cleanTitleEn.toUpperCase()}` : `TENTANG\n${cleanTitleId.toUpperCase()}`,
              font: "Arial",
              size: 19,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: isEn ? "THE BOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY," : "DIREKSI PT NIRWANA BHUMI ENERGY,",
              font: "Arial",
              size: 19,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: isEn ? "Having Considered:\n" : "Menimbang:\n", font: "Arial", size: 19, bold: true, color: COLOR_BLACK }),
            new TextRun({
              text: isEn
                ? "a. that in order to achieve standardisation, accountability, and traceability of all corporate policy documents, standard operating procedures, work instructions, and technical forms within PT Nirwana Bhumi Energy, a standardised and integrated document governance and control system is required;\nb. that to ensure comprehensive compliance with Integrated Management System (IMS) standards based on ISO 9001:2015, ISO 14001:2015, ISO 45001:2018, and Contractor Safety Management System (CSMS) qualifications of SKK Migas and PT PLN (Persero), the appointment of personnel responsible for document management is requisite;\nc. that based on the considerations referred to in paragraphs a and b above, it is deemed necessary to enact a Board of Directors' Resolution."
                : "a. bahwa dalam rangka mewujudkan standarisasi, akuntabilitas, serta keterlacakan seluruh dokumen kebijakan, prosedur operasional, instruksi kerja, dan formulir teknis di lingkungan PT Nirwana Bhumi Energy, diperlukan suatu sistem tata kelola dan kontrol dokumen yang baku dan terintegrasi;\nb. bahwa guna menjamin kepatuhan menyeluruh terhadap standar Sistem Manajemen Terintegrasi (IMS) berbasis ISO 9001:2015, ISO 14001:2015, ISO 45001:2018, dan kualifikasi Contractor Safety Management System (CSMS) SKK Migas serta PLN, diperlukan penunjukan personel penanggung jawab pengelolaan dokumen;\nc. bahwa berdasarkan pertimbangan sebagaimana dimaksud dalam huruf a dan b di atas, dipandang perlu untuk menetapkan Surat Keputusan Direksi.",
              font: "Arial",
              size: 19,
              color: COLOR_BODY,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({ text: isEn ? "In View Of:\n" : "Mengingat:\n", font: "Arial", size: 19, bold: true, color: COLOR_BLACK }),
            new TextRun({
              text: isEn
                ? "1. The Deed of Establishment of PT Nirwana Bhumi Energy and prevailing statutory regulations;\n2. International Standard ISO 9001:2015 Clause 7.5 regarding Documented Information;\n3. Standard Guidelines for the Contractor Safety Management System (CSMS) of SKK Migas and PT PLN (Persero);\n4. Standard Operating Procedure No. 0001-SOP-GNR-CEO-IX-2026 (Documents and Records Control Procedure);\n5. Integrated Management Policy No. 0001-KB-GNR-CEO-X-2026."
                : "1. Akta Pendirian PT Nirwana Bhumi Energy serta peraturan perundang-undangan perseroan terbatas yang berlaku;\n2. Standar Internasional ISO 9001:2015 Klausul 7.5 tentang Informasi Terdokumentasi (Documented Information);\n3. Pedoman Baku Contractor Safety Management System (CSMS) SKK Migas dan PT PLN (Persero);\n4. Prosedur Baku No. 0001-SOP-GNR-CEO-IX-2026 (Documents and Records Control Procedure);\n5. Kebijakan Manajemen Terintegrasi No. 0001-KB-GNR-CEO-X-2026.",
              font: "Arial",
              size: 19,
              color: COLOR_BODY,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: isEn ? "HEREBY RESOLVES:" : "MEMUTUSKAN:", font: "Arial", size: 20, bold: true, color: COLOR_BLACK })],
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({ text: isEn ? "To Enact:\n" : "Menetapkan:\n", font: "Arial", size: 19, bold: true, color: COLOR_BLACK }),
            new TextRun({
              text: isEn
                ? `BOARD OF DIRECTORS' RESOLUTION OF PT NIRWANA BHUMI ENERGY CONCERNING ${cleanTitleEn.toUpperCase()}.\n\nFIRST:\nTo officially enact the Standard Format and 6-Segment Document Numbering System across all operational areas and the head office of PT Nirwana Bhumi Energy: [4DigitSequentialNo]-[DocCategory]-[Division]-[Authoriser]-[RomanMonth]-[Year]. This numbering provision is strictly unique under the rigorous principle: ONE CODE FOR ONE DOCUMENT (1 Document Code = 1 Valid Document).`
                : `SURAT KEPUTUSAN DIREKSI PT NIRWANA BHUMI ENERGY TENTANG ${cleanTitleId.toUpperCase()}.\n\nKESATU:\nMemberlakukan secara resmi Standar Format dan Sistem Penomoran Dokumen 6 Segmen di seluruh lingkungan operasional dan kantor pusat PT Nirwana Bhumi Energy: [NomorUrut4Digit]-[KategoriSurat]-[Divisi]-[Pengesah]-[BulanRomawi]-[Tahun]. Ketentuan penomoran ini bersifat unik mutlak dengan asas ketat: SATU KODE UNTUK SATU DOKUMEN (1 Kode Dokumen = 1 Dokumen Sah).`,
              font: "Arial",
              size: 19,
              color: COLOR_BODY,
            }),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: isEn
                ? "SECOND:\nTo appoint and designate the following personnel as the Document Control Centre (DCC) Team of PT Nirwana Bhumi Energy:"
                : "KEDUA:\nMenunjuk dan menetapkan personel berikut sebagai Tim Document Control Center (DCC) PT Nirwana Bhumi Energy:",
              font: "Arial",
              size: 19,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        }),
        dccTable,
        new Paragraph({
          spacing: { before: 160, after: 160 },
          children: [
            new TextRun({
              text: isEn
                ? "THIRD:\nTo govern the digital storage and registration of corporate documents via the 'Fix Code' button on the web system, whereby upon code verification and locking, the system automatically synchronises and archives the document into corporate Google Drive (Root Folder ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF) within its respective divisional classification subfolder.\n\nFOURTH:\nTo establish the revision workflow for controlled documents, whereby any subsequent amendment must append a suffix (-rev1, -rev2, etc.), record the rationale within the Revision Index table, and promptly withdraw and destroy obsolete copies.\n\nFIFTH:\nThis Resolution shall enter into force effectively from the date of its enactment."
                : "KETIGA:\nMengatur tata kelola penyimpanan dan registrasi dokumen digital perusahaan melalui fitur Tombol 'Fix Kode' pada sistem web, di mana setelah kode diverifikasi dan dikunci, sistem secara otomatis mengintegrasikan dokumen ke Google Drive korporat (Folder Induk ID: 1ny_1VhXfSaNrj_XdoOsC7V7BO-z0K8eF) pada subfolder klasifikasi divisi masing-masing.\n\nKEEMPAT:\nMenetapkan alur revisi dokumen terkontrol, di mana setiap pembaruan wajib mencantumkan sufiks (-rev1, -rev2, dst.), mencatatkan alasan perubahan pada tabel Revision Index, serta memusnahkan salinan dokumen usang (obsolete).\n\nKELIMA:\nSurat Keputusan ini mulai berlaku efektif sejak tanggal ditetapkan.",
              font: "Arial",
              size: 19,
              color: COLOR_BODY,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: isEn
                ? `Enacted in\t: Semarang / Tuban\nOn date\t\t: ${formatNbeStandardDate(data.issueDateEn || data.issueDateId, isEn ? "en" : "id")}\nBOARD OF DIRECTORS OF PT NIRWANA BHUMI ENERGY`
                : `Ditetapkan di\t: Semarang / Tuban\nPada tanggal\t: ${data.issueDateId}\nDIREKSI PT NIRWANA BHUMI ENERGY`,
              font: "Arial",
              size: 19,
              bold: true,
              color: COLOR_BLACK,
            }),
          ],
        }),
        signatureTable,
      ];

  return new Document({
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            size: data.paperSize === "F4" ? { width: 12189, height: 18709 } : { width: 11906, height: 16838 },
            margin: { left: 1247, right: 1134, top: 1134, bottom: 1134 },
          },
        },
        headers: {
          first: new Header({ children: [] }),
          default: buildRunningHeader(data),
        },
        footers: {
          first: new Footer({ children: [] }),
          default: new Footer({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: 9525 }],
                children: [
                  new TextRun({ text: `© ${docYear} PT Nirwana Bhumi Energy\tPage `, font: "Arial", size: 18, color: "595959" }),
                  new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "595959" }),
                  new TextRun({ text: " of ", font: "Arial", size: 18, color: "595959" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 18, color: "595959" }),
                ],
              }),
            ],
          }),
        },
        children: [...page1Children, ...page2Children, ...page3And4Children],
      },
    ],
  });
}

async function ensureLogoBuffers(data: NbeDocumentPayload): Promise<NbeDocumentPayload> {
  const result = { ...data };
  if (!result.coverLogoBuffer || !result.kopLogoBuffer) {
    try {
      if (typeof window !== "undefined" && typeof fetch === "function") {
        const res = await fetch("/nbe-logo-tight.png");
        if (res.ok) {
          const buf = await res.arrayBuffer();
          if (!result.coverLogoBuffer) result.coverLogoBuffer = buf;
          if (!result.kopLogoBuffer) result.kopLogoBuffer = buf;
        }
      }
    } catch (e) {
      console.warn("Could not auto-fetch fallback logo for docx:", e);
    }
  }
  return result;
}

export async function generateNbeDocxBlob(
  rawData: NbeDocumentPayload
): Promise<{ blob: Blob; fileName: string; dataUrl: string }> {
  const data = await ensureLogoBuffers(rawData);
  const doc = buildNbeDocument(data);
  const blob = await Packer.toBlob(doc);
  const cleanTitle = data.titleId?.trim() || (data.language === "en" ? "Board of Directors Resolution" : "Surat Keputusan Direksi");
  const fileName = `${data.docCode} - ${cleanTitle}.docx`;

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });

  return { blob, fileName, dataUrl };
}

export async function generateAndDownloadNbeDocx(
  data: NbeDocumentPayload
): Promise<{ blob: Blob; fileName: string }> {
  const { blob, fileName } = await generateNbeDocxBlob(data);
  saveAs(blob, fileName);
  return { blob, fileName };
}

