import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Save,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  ClipboardPaste,
  Paintbrush,
  Eraser,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Highlighter,
  Baseline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  FileText,
  Table,
  Plus,
  Trash2,
  Search,
  Sparkles,
  ChevronDown,
  Check,
  SplitSquareVertical,
  Calendar,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Heading1,
  Heading2,
  Type,
  Minus,
  Rows,
  Columns,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Grid,
} from "lucide-react";
import "./ms-word-ribbon.css";
import { DocumentLanguage } from "../types";
import { translateHtmlContent } from "../utils/translationService";

// Ukuran batas tinggi maksimum area isi per halaman A4 (di luar Kop Header & Footer)
const MAX_BODY_HEIGHT_PX = 720;

const FONT_FAMILIES = [
  "Arial",
  "Calibri",
  "Times New Roman",
  "Segoe UI",
  "Tahoma",
  "Verdana",
  "Georgia",
];

const FONT_SIZES_PT = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 28, 36];

// Styling baku lembar A4 NBE (210mm x 297mm)
const a4PageStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "820px",
  minHeight: "1160px",
  margin: "0 auto 2.5rem auto",
  background: "#ffffff",
  color: "#3B3838",
  fontFamily: "Arial, sans-serif",
  padding: "75px 75px 65px 83px", // Left: 2.2cm (~83px), Right/Top/Bottom: 2.0cm (~75px)
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0,0,0,0.04)",
  borderRadius: "6px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  border: "1px solid #cbd5e1",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
};

export interface KopTableSettings {
  logoWidthPercent: number;
  paddingY: number;
  fontSizeScale: number;
  borderWidth: number;
  logoScale?: number;
}

export interface MsWordEditorProps {
  isEditing: boolean;
  onToggleEdit: () => void;
  onSaveDocument: (updatedHtmlPages: string[]) => void;
  onAutoSaveBodyPages?: (updatedHtmlPages: string[]) => void;
  initialHtmlPages: string[];
  renderSystemCoverPage: () => React.ReactNode;
  renderSystemRevisionPage: (totalPages: number) => React.ReactNode;
  renderSystemTocPage: (totalPages: number) => React.ReactNode;
  renderRunningKopHeader: () => React.ReactNode;
  activePageTab?: "all" | number;
  autoSaveStatus?: 'saved' | 'saving' | 'idle';
  lastSavedTime?: string | null;
  onResetToTemplate?: () => void;
  kopSettings?: KopTableSettings;
  onUpdateKopSetting?: (key: keyof KopTableSettings, val: number) => void;
  documentYear?: string;
  language?: DocumentLanguage;
  paperSize?: "A4" | "F4";
  documentId?: string;
}

export function repairCorruptedEditorHtml(html: string): string {
  if (!html) return html;
  let res = html;
  // 1. Repair flex-based clause divs that had broken narrow widths
  res = res.replace(
    /<div[^>]*style="[^"]*display:\s*flex[^"]*"[^>]*>\s*<span[^>]*style="[^"]*width:\s*0\.5in[^"]*"[^>]*>([0-9]+\.[0-9]+)<\/span>\s*<span[^>]*>(.*?)<\/span>\s*<\/div>/gi,
    '<p class="nbe-clause-heading" style="margin: 0.5rem 0 0.3rem 0; font-weight: bold; color: #000000; font-size: 10.5pt; font-family: Arial; line-height: 1.5; padding-left: 0.5in; text-indent: -0.5in; word-break: normal; overflow-wrap: break-word;"><span style="display: inline-block; min-width: 0.5in;">$1</span>$2</p>'
  );
  // 2. Remove narrow width: 0.5in from any span or div that broke text into narrow syllables
  res = res.replace(/style="([^"]*?)width:\s*0\.5in;?([^"]*?)"/gi, (match, before, after) => {
    const cleaned = `${before} ${after}`.replace(/\s+/g, ' ').trim();
    return cleaned ? `style="${cleaned}"` : '';
  });
  // 3. Remove inline flex / narrow containers
  res = res.replace(/display:\s*inline-block;\s*width:\s*0\.5in;/gi, 'display: inline;');
  return res;
}

export const MsWordRibbonEditor: React.FC<MsWordEditorProps> = ({
  isEditing,
  onToggleEdit,
  onSaveDocument,
  onAutoSaveBodyPages,
  initialHtmlPages,
  renderSystemCoverPage,
  renderSystemRevisionPage,
  renderSystemTocPage,
  renderRunningKopHeader,
  activePageTab = "all",
  autoSaveStatus = "idle",
  lastSavedTime = null,
  onResetToTemplate,
  kopSettings,
  onUpdateKopSetting,
  documentYear = "2026",
  language = "id",
  paperSize = "A4",
  documentId,
}) => {
  const isF4 = paperSize === "F4";
  const maxBodyHeightPx = isF4 ? 845 : 720;
  const dynamicPageStyle: React.CSSProperties = {
    ...a4PageStyle,
    maxWidth: isF4 ? "840px" : "820px",
    minHeight: isF4 ? "1288px" : "1160px",
    transition: "min-height 0.25s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  const hasUserEditedRef = useRef<boolean>(false);
  const autoSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastLanguageRef = useRef<DocumentLanguage>(language);
  const lastDocumentIdRef = useRef<string | undefined>(documentId);

  // Setiap elemen array mewakili HTML isi dari 1 halaman body (mulai Halaman 4 dst.)
  const [bodyPagesHtml, setBodyPagesHtml] = useState<string[]>(() => {
    return initialHtmlPages && initialHtmlPages.length > 0
      ? initialHtmlPages.map(repairCorruptedEditorHtml)
      : ["<p style='text-align: justify; font-size: 10.5pt; font-family: Arial; color: #3B3838;'>Isi dokumen kosong.</p>"];
  });

  // Sinkronisasi real-time saat dokumen berganti atau konten awal berubah
  useEffect(() => {
    if (documentId !== lastDocumentIdRef.current) {
      lastDocumentIdRef.current = documentId;
      hasUserEditedRef.current = false;
      if (initialHtmlPages && initialHtmlPages.length > 0) {
        setBodyPagesHtml(initialHtmlPages.map(repairCorruptedEditorHtml));
      }
      return;
    }

    if (initialHtmlPages && initialHtmlPages.length > 0) {
      setBodyPagesHtml(initialHtmlPages.map(repairCorruptedEditorHtml));
    }
  }, [documentId, initialHtmlPages]);

  // Auto-translate editor HTML contents in-place when language toggles between 'id' and 'en'
  useEffect(() => {
    if (!language) return;
    if (lastLanguageRef.current && lastLanguageRef.current !== language) {
      const targetLang = language === 'en' ? 'en' : 'id';
      setBodyPagesHtml((prevPages) => {
        const translated = prevPages.map((pgHtml) => translateHtmlContent(pgHtml, targetLang));
        try {
          const docKey = `nbe_doc_autosave_${documentId || 'latest'}`;
          const draft = localStorage.getItem(docKey);
          if (draft) {
            const parsed = JSON.parse(draft);
            parsed.bodyPagesHtml = translated;
            localStorage.setItem(docKey, JSON.stringify(parsed));
          }
        } catch (e) {}
        return translated;
      });
    }
    lastLanguageRef.current = language;
  }, [language, documentId]);

  const [activeTab, setActiveTab] = useState<"Home" | "Insert" | "Layout" | "Table" | "View">("Home");
  const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null);
  const [activeTableCell, setActiveTableCell] = useState<HTMLTableCellElement | null>(null);
  const activeTableCellRef = useRef<HTMLTableCellElement | null>(null);
  const activeTableRef = useRef<HTMLTableElement | null>(null);
  const [currentFontFamily, setCurrentFontFamily] = useState<string>("Arial");
  const [currentFontSizePt, setCurrentFontSizePt] = useState<number>(10.5);
  const [currentAlign, setCurrentAlign] = useState<"left" | "center" | "right" | "justify">("justify");
  const [activePageIdx, setActivePageIdx] = useState<number>(0);
  const [highlightColor, setHighlightColor] = useState<string>("#ffff00");
  const [textColor, setTextColor] = useState<string>("#000000");
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Ruler & Indentation Guide State
  const [activeIndentCm, setActiveIndentCm] = useState<number>(0);
  const [firstLineIndentCm, setFirstLineIndentCm] = useState<number>(0);
  const [rulerHoverCm, setRulerHoverCm] = useState<number | null>(null);
  const [isDraggingRuler, setIsDraggingRuler] = useState<"left" | "first-line" | null>(null);
  const rulerTrackRef = useRef<HTMLDivElement | null>(null);

  // Fitur Smart Finder / Pencarian Fitur Cepat
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const [formatPainterStyle, setFormatPainterStyle] = useState<{
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    color?: string;
  } | null>(null);

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const savedRangeRef = useRef<Range | null>(null);

  const saveCurrentSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const getActiveBlockElement = (): HTMLElement | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const activeContainer = pageRefs.current[activePageIdx];
    if (!activeContainer) return null;

    let node: Node | null = sel.anchorNode;
    while (node && node !== activeContainer) {
      if (
        node instanceof HTMLElement &&
        ["P", "DIV", "LI", "H1", "H2", "H3", "H4", "BLOCKQUOTE"].includes(node.tagName)
      ) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  };

  const handleSelectionChange = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node: Node | null = sel.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement;
    }
    if (node instanceof HTMLElement) {
      const computed = window.getComputedStyle(node);
      const pxSize = parseFloat(computed.fontSize);
      if (!isNaN(pxSize)) {
        const ptSize = Math.round(pxSize * 0.75 * 2) / 2;
        setCurrentFontSizePt(ptSize);
      }
      const align = computed.textAlign as "left" | "center" | "right" | "justify";
      if (["left", "center", "right", "justify"].includes(align)) {
        setCurrentAlign(align);
      }
      if (computed.fontFamily) {
        const primaryFont = computed.fontFamily.split(",")[0].replace(/['"]/g, "").trim();
        if (FONT_FAMILIES.includes(primaryFont)) {
          setCurrentFontFamily(primaryFont);
        }
      }
    }

    const block = getActiveBlockElement();
    if (block) {
      const computed = window.getComputedStyle(block);
      const pLeft = parseFloat(computed.paddingLeft) || parseFloat(computed.marginLeft) || 0;
      const tIndent = parseFloat(computed.textIndent) || 0;
      // 96px = 1in = 2.54cm
      const indentCm = Math.round(((pLeft * 2.54) / 96) * 10) / 10;
      const firstLineCm = Math.round(((tIndent * 2.54) / 96) * 10) / 10;
      setActiveIndentCm(indentCm);
      setFirstLineIndentCm(firstLineCm);
    } else {
      setActiveIndentCm(0);
      setFirstLineIndentCm(0);
    }

    // Deteksi apakah kursor berada di dalam sel tabel (TD/TH)
    let foundCell: HTMLTableCellElement | null = null;
    let foundTable: HTMLTableElement | null = null;
    let currNode: HTMLElement | null = node instanceof HTMLElement ? node : null;
    while (currNode && currNode !== pageRefs.current[activePageIdx]) {
      if (currNode.tagName === "TD" || currNode.tagName === "TH") {
        foundCell = currNode as HTMLTableCellElement;
      }
      if (currNode.tagName === "TABLE") {
        foundTable = currNode as HTMLTableElement;
        break;
      }
      currNode = currNode.parentElement;
    }
    setActiveTableCell(foundCell);
    activeTableCellRef.current = foundCell;
    setActiveTable(foundTable);
    activeTableRef.current = foundTable;
  };

  const adjustParagraphIndent = (deltaInches: number) => {
    restoreSelection();
    const block = getActiveBlockElement();
    if (block) {
      const computed = window.getComputedStyle(block);
      const currentPx = parseFloat(computed.paddingLeft) || 0;
      const currentInches = currentPx / 96;
      const newInches = Math.max(0, Math.round((currentInches + deltaInches) * 100) / 100);

      block.style.paddingLeft = newInches > 0 ? `${newInches}in` : "0";
      const newCm = Math.round(newInches * 2.54 * 10) / 10;
      setActiveIndentCm(newCm);
    } else {
      document.execCommand(deltaInches > 0 ? "indent" : "outdent", false);
    }
    saveCurrentSelection();
    notifyAutoSaveBody();
  };

  const setSpecificIndentCm = (targetCm: number) => {
    restoreSelection();
    const block = getActiveBlockElement();
    if (block) {
      const inches = targetCm / 2.54;
      block.style.paddingLeft = inches > 0 ? `${inches.toFixed(2)}in` : "0";
      setActiveIndentCm(targetCm);
    }
    saveCurrentSelection();
    notifyAutoSaveBody();
  };

  const setFirstLineIndent = (deltaCm: number) => {
    restoreSelection();
    const block = getActiveBlockElement();
    if (block) {
      const inches = deltaCm / 2.54;
      block.style.textIndent = inches !== 0 ? `${inches.toFixed(2)}in` : "0";
      setFirstLineIndentCm(deltaCm);
    }
    saveCurrentSelection();
    notifyAutoSaveBody();
  };

  const setHangingIndent = () => {
    restoreSelection();
    const block = getActiveBlockElement();
    if (block) {
      block.style.paddingLeft = "0.5in";
      block.style.textIndent = "-0.5in";
      setActiveIndentCm(1.27);
      setFirstLineIndentCm(-1.27);
    }
    saveCurrentSelection();
    notifyAutoSaveBody();
  };

  const resetIndent = () => {
    restoreSelection();
    const block = getActiveBlockElement();
    if (block) {
      block.style.paddingLeft = "0";
      block.style.marginLeft = "0";
      block.style.textIndent = "0";
      setActiveIndentCm(0);
      setFirstLineIndentCm(0);
    }
    saveCurrentSelection();
    notifyAutoSaveBody();
  };

  const handleRulerPrintableClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let cm = Math.max(0, Math.min(17.5, clickX / 37.828));
    // Snap to nearest standard 0.5" tab stop (1.27, 2.54, 3.81, 5.08, etc.) or 0.25 cm
    const tabStops = [0, 1.27, 2.54, 3.81, 5.08, 6.35, 7.62, 8.89, 10.16, 11.43, 12.7, 13.97, 15.24, 16.51];
    const nearestTab = tabStops.find((t) => Math.abs(t - cm) < 0.22);
    if (nearestTab !== undefined) {
      cm = nearestTab;
    } else {
      cm = Math.round(cm * 4) / 4;
    }
    setSpecificIndentCm(cm);
  };

  const handleRulerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const cm = Math.max(0, Math.min(17.5, Math.round((mouseX / 37.828) * 10) / 10));
    setRulerHoverCm(cm);
  };

  // Mesin Auto-Pagination
  const runAutoPaginationPass = useCallback(() => {
    let domChanged = false;
    const currentContainers = pageRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (currentContainers.length === 0) return;

    // A. Overflow check
    for (let i = 0; i < currentContainers.length; i++) {
      const container = currentContainers[i];
      if (container.scrollHeight > maxBodyHeightPx && container.children.length > 1) {
        const overflowingNodes: string[] = [];
        while (container.scrollHeight > maxBodyHeightPx && container.children.length > 1) {
          const lastChild = container.lastElementChild;
          if (!lastChild) break;
          overflowingNodes.unshift(lastChild.outerHTML);
          lastChild.remove();
          domChanged = true;
        }

        if (overflowingNodes.length > 0) {
          const joinedOverflowHtml = overflowingNodes.join("");
          if (i + 1 < currentContainers.length) {
            currentContainers[i + 1].innerHTML = joinedOverflowHtml + currentContainers[i + 1].innerHTML;
          } else {
            setBodyPagesHtml((prev) => [...prev, joinedOverflowHtml]);
            return;
          }
        }
      }
    }

    // B. Underflow check: Hapus halaman kosong otomatis
    if (currentContainers.length > 1) {
      for (let i = currentContainers.length - 1; i > 0; i--) {
        const container = currentContainers[i];
        const textContent = container.innerText.trim();
        const hasImagesOrTables = container.querySelector("img, table, hr") !== null;
        if (!textContent && !hasImagesOrTables) {
          domChanged = true;
          setBodyPagesHtml((prev) => {
            if (prev.length <= 1) return prev;
            const updated = [...prev];
            updated.splice(i, 1);
            return updated;
          });
          return;
        }
      }
    }

    if (domChanged) {
      setBodyPagesHtml(currentContainers.map((el) => el.innerHTML));
      notifyAutoSaveBody();
    }
  }, []);

  const notifyAutoSaveBody = useCallback(() => {
    hasUserEditedRef.current = true;
    if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);
    autoSaveDebounceRef.current = setTimeout(() => {
      const currentSnapshots = pageRefs.current
        .filter((el): el is HTMLDivElement => el !== null)
        .map((el) => el.innerHTML);
      if (currentSnapshots.length > 0) {
        setBodyPagesHtml(currentSnapshots);
        if (onAutoSaveBodyPages) {
          onAutoSaveBodyPages(currentSnapshots);
        }
      }
    }, 400);
  }, [onAutoSaveBodyPages]);

  // Format Actions
  const applyAlignment = (alignment: "left" | "center" | "right" | "justify") => {
    restoreSelection();
    setCurrentAlign(alignment);
    const cmdMap: Record<string, string> = {
      left: "justifyLeft",
      center: "justifyCenter",
      right: "justifyRight",
      justify: "justifyFull",
    };
    document.execCommand(cmdMap[alignment], false);
    saveCurrentSelection();
  };

  const applyFontSizePt = (newSizePt: number) => {
    const clampedSize = Math.max(6, Math.min(72, newSizePt));
    restoreSelection();
    setCurrentFontSizePt(clampedSize);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if (!range.collapsed) {
      const span = document.createElement("span");
      span.style.fontSize = `${clampedSize}pt`;
      try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);
      } catch {
        const activeContainer = pageRefs.current[activePageIdx];
        if (activeContainer) {
          activeContainer.querySelectorAll("p, div, span, li, td").forEach((el) => {
            if (sel.containsNode(el, true)) {
              (el as HTMLElement).style.fontSize = `${clampedSize}pt`;
            }
          });
        }
      }
    } else {
      let node: Node | null = range.startContainer;
      while (node && node !== pageRefs.current[activePageIdx]) {
        if (node instanceof HTMLElement && ["P", "DIV", "SPAN", "LI", "TD", "H1", "H2", "H3"].includes(node.tagName)) {
          node.style.fontSize = `${clampedSize}pt`;
          break;
        }
        node = node.parentNode;
      }
    }

    saveCurrentSelection();
    setTimeout(runAutoPaginationPass, 50);
  };

  const applyFontFamily = (fontName: string) => {
    restoreSelection();
    setCurrentFontFamily(fontName);
    document.execCommand("fontName", false, fontName);
    saveCurrentSelection();
  };

  const handleToggleFormatPainter = () => {
    if (!formatPainterStyle) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.anchorNode;
        if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        if (node instanceof HTMLElement) {
          const comp = window.getComputedStyle(node);
          setFormatPainterStyle({
            fontFamily: comp.fontFamily,
            fontSize: comp.fontSize,
            fontWeight: comp.fontWeight,
            fontStyle: comp.fontStyle,
            textDecoration: comp.textDecoration,
            color: comp.color,
          });
        }
      }
    } else {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const span = document.createElement("span");
        if (formatPainterStyle.fontFamily) span.style.fontFamily = formatPainterStyle.fontFamily;
        if (formatPainterStyle.fontSize) span.style.fontSize = formatPainterStyle.fontSize;
        if (formatPainterStyle.fontWeight) span.style.fontWeight = formatPainterStyle.fontWeight;
        if (formatPainterStyle.fontStyle) span.style.fontStyle = formatPainterStyle.fontStyle;
        if (formatPainterStyle.textDecoration) span.style.textDecoration = formatPainterStyle.textDecoration;
        if (formatPainterStyle.color) span.style.color = formatPainterStyle.color;
        try {
          span.appendChild(range.extractContents());
          range.insertNode(span);
        } catch {
          // ignore
        }
      }
      setFormatPainterStyle(null);
    }
  };

  const handleChangeCase = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const text = sel.toString();
    if (!text) return;
    let newText = text.toUpperCase();
    if (text === text.toUpperCase()) {
      newText = text.toLowerCase();
    } else if (text === text.toLowerCase()) {
      newText = text.replace(/\b\w/g, (c) => c.toUpperCase());
    }
    document.execCommand("insertText", false, newText);
  };

  // Insert Features
  const handleInsertPageBreak = () => {
    restoreSelection();
    const activeContainer = pageRefs.current[activePageIdx];
    if (!activeContainer) return;

    const sel = window.getSelection();
    let splitIndex = -1;

    if (sel && sel.rangeCount > 0) {
      let cursorNode: Node | null = sel.anchorNode;
      while (cursorNode && cursorNode.parentNode !== activeContainer) {
        cursorNode = cursorNode.parentNode;
      }
      if (cursorNode && cursorNode.parentNode === activeContainer) {
        splitIndex = Array.from(activeContainer.childNodes).indexOf(cursorNode as ChildNode);
      }
    }

    const allChildren = Array.from(activeContainer.childNodes);
    let stayNodesHtml = "";
    let movedNodesHtml = "";

    if (splitIndex >= 0 && splitIndex < allChildren.length) {
      stayNodesHtml = allChildren
        .slice(0, splitIndex)
        .map((n) => (n instanceof HTMLElement ? n.outerHTML : `<p>${n.textContent}</p>`))
        .join("");
      movedNodesHtml = allChildren
        .slice(splitIndex)
        .map((n) => (n instanceof HTMLElement ? n.outerHTML : `<p>${n.textContent}</p>`))
        .join("");
    } else {
      stayNodesHtml = activeContainer.innerHTML;
      movedNodesHtml = `<p style="text-align: ${currentAlign}; font-size: ${currentFontSizePt}pt; font-family: ${currentFontFamily};"><br/></p>`;
    }

    if (!stayNodesHtml.trim()) {
      stayNodesHtml = `<p style="text-align: ${currentAlign}; font-size: ${currentFontSizePt}pt; font-family: ${currentFontFamily};"><br/></p>`;
    }
    if (!movedNodesHtml.trim()) {
      movedNodesHtml = `<p style="text-align: ${currentAlign}; font-size: ${currentFontSizePt}pt; font-family: ${currentFontFamily};"><br/></p>`;
    }

    const currentSnapshots = pageRefs.current
      .filter((el): el is HTMLDivElement => el !== null)
      .map((el) => el.innerHTML);

    currentSnapshots[activePageIdx] = stayNodesHtml;
    currentSnapshots.splice(activePageIdx + 1, 0, movedNodesHtml);

    setBodyPagesHtml(currentSnapshots);
    setActivePageIdx(activePageIdx + 1);

    setTimeout(() => {
      const nextContainer = pageRefs.current[activePageIdx + 1];
      if (nextContainer) {
        nextContainer.focus();
      }
    }, 80);
  };

  const handleInsertTable = () => {
    restoreSelection();
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 10pt; font-family: Arial;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 2px solid #003366;">
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-weight: bold; width: 8%;">No</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-weight: bold; width: 32%;">Item / Klausul</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-weight: bold; width: 40%;">Deskripsi Pelaksanaan</th>
            <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-weight: bold; width: 20%;">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">1</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Pemeriksaan Awal</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Verifikasi dokumen dan kesesuaian SOP</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Sesuai Standar</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">2</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Evaluasi Lapangan</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Pengujian kepatuhan CSMS & HSE</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">Terverifikasi</td>
          </tr>
        </tbody>
      </table>
      <p><br/></p>
    `;
    document.execCommand("insertHTML", false, tableHtml);
    saveCurrentSelection();
    setTimeout(runAutoPaginationPass, 50);
  };

  // =========================================================================
  // OPERASI MANAJEMEN TABEL INTERAKTIF (KENDALI PENUH UKURAN & TATA LETAK)
  // =========================================================================
  const getActiveTableCell = (): HTMLTableCellElement | null => {
    if (activeTableCellRef.current && document.contains(activeTableCellRef.current)) {
      return activeTableCellRef.current;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    while (node && node instanceof HTMLElement) {
      if (node.tagName === "TD" || node.tagName === "TH") return node as HTMLTableCellElement;
      node = node.parentElement;
    }
    return null;
  };

  const getActiveTable = (): HTMLTableElement | null => {
    if (activeTableRef.current && document.contains(activeTableRef.current)) {
      return activeTableRef.current;
    }
    const cell = getActiveTableCell();
    return cell ? cell.closest("table") : null;
  };

  const focusCell = (targetCell: HTMLElement) => {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(targetCell);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
    setActiveTableCell(targetCell as HTMLTableCellElement);
    activeTableCellRef.current = targetCell as HTMLTableCellElement;
  };

  const insertTableRow = (below: boolean) => {
    restoreSelection();
    const cell = getActiveTableCell();
    if (!cell) return;
    const tr = cell.closest("tr");
    const table = cell.closest("table");
    if (!tr || !table) return;

    const colCount = Math.max(
      ...Array.from(table.rows).map((r) => r.cells.length),
      tr.cells.length
    );
    const newTr = document.createElement("tr");

    for (let i = 0; i < colCount; i++) {
      const newTd = document.createElement("td");
      newTd.style.border = "1px solid #000000";
      newTd.style.padding = "6px 8px";
      newTd.style.verticalAlign = "top";
      newTd.innerHTML = "<br/>";
      newTr.appendChild(newTd);
    }

    if (below) {
      tr.parentNode?.insertBefore(newTr, tr.nextSibling);
    } else {
      tr.parentNode?.insertBefore(newTr, tr);
    }

    const firstCell = newTr.cells[0];
    if (firstCell) {
      focusCell(firstCell);
    }

    saveCurrentSelection();
    runAutoPaginationPass();
    notifyAutoSaveBody();
  };

  const deleteTableRow = () => {
    restoreSelection();
    const cell = getActiveTableCell();
    if (!cell) return;
    const tr = cell.closest("tr");
    const table = cell.closest("table");
    if (!tr || !table) return;

    if (table.rows.length <= 1) {
      table.remove();
      setActiveTable(null);
      setActiveTableCell(null);
      activeTableRef.current = null;
      activeTableCellRef.current = null;
    } else {
      const nextRow = tr.nextElementSibling || tr.previousElementSibling;
      tr.remove();
      if (nextRow && nextRow instanceof HTMLTableRowElement && nextRow.cells[0]) {
        const targetCell = nextRow.cells[Math.min(cell.cellIndex, nextRow.cells.length - 1)];
        focusCell(targetCell);
      }
    }

    saveCurrentSelection();
    runAutoPaginationPass();
    notifyAutoSaveBody();
  };

  const insertTableColumn = (right: boolean) => {
    restoreSelection();
    const cell = getActiveTableCell();
    if (!cell) return;
    const table = cell.closest("table");
    if (!table) return;

    const targetIdx = right ? cell.cellIndex + 1 : cell.cellIndex;

    for (let r = 0; r < table.rows.length; r++) {
      const row = table.rows[r];
      const isHeaderRow =
        row.parentNode?.nodeName.toLowerCase() === "thead" ||
        (r === 0 && row.cells[0]?.tagName.toLowerCase() === "th");
      const newCell = document.createElement(isHeaderRow ? "th" : "td");
      newCell.style.border = "1px solid #000000";
      newCell.style.padding = "6px 8px";
      newCell.style.verticalAlign = "top";
      if (isHeaderRow) {
        newCell.style.backgroundColor = "#f1f5f9";
        newCell.style.fontWeight = "bold";
      }
      newCell.innerHTML = "<br/>";

      if (targetIdx >= row.cells.length) {
        row.appendChild(newCell);
      } else {
        row.insertBefore(newCell, row.cells[targetIdx]);
      }
    }

    saveCurrentSelection();
    runAutoPaginationPass();
    notifyAutoSaveBody();
  };

  const deleteTableColumn = () => {
    restoreSelection();
    const cell = getActiveTableCell();
    if (!cell) return;
    const table = cell.closest("table");
    if (!table) return;

    const colIdx = cell.cellIndex;
    let allRowsHaveOneCol = true;
    for (let r = 0; r < table.rows.length; r++) {
      if (table.rows[r].cells.length > 1) {
        allRowsHaveOneCol = false;
        break;
      }
    }

    if (allRowsHaveOneCol) {
      table.remove();
      setActiveTable(null);
      setActiveTableCell(null);
      activeTableRef.current = null;
      activeTableCellRef.current = null;
    } else {
      for (let r = 0; r < table.rows.length; r++) {
        const row = table.rows[r];
        if (row.cells[colIdx]) {
          row.deleteCell(colIdx);
        }
      }
      setActiveTableCell(null);
      activeTableCellRef.current = null;
    }

    saveCurrentSelection();
    runAutoPaginationPass();
    notifyAutoSaveBody();
  };

  const deleteCurrentTable = () => {
    restoreSelection();
    const table = getActiveTable();
    if (!table) return;
    table.remove();
    setActiveTable(null);
    setActiveTableCell(null);
    activeTableRef.current = null;
    activeTableCellRef.current = null;
    saveCurrentSelection();
    runAutoPaginationPass();
    notifyAutoSaveBody();
  };

  const setTableLayout = (width: string, align: "left" | "center" | "right") => {
    restoreSelection();
    const table = getActiveTable();
    if (!table) return;

    table.style.width = width;
    if (align === "center") {
      table.style.marginLeft = "auto";
      table.style.marginRight = "auto";
    } else if (align === "right") {
      table.style.marginLeft = "auto";
      table.style.marginRight = "0";
    } else {
      table.style.marginLeft = "0";
      table.style.marginRight = "auto";
    }

    saveCurrentSelection();
    notifyAutoSaveBody();
  };

  const adjustActiveColumnWidth = (deltaPercent: number) => {
    restoreSelection();
    const cell = getActiveTableCell();
    if (!cell) return;
    const table = cell.closest("table");
    if (!table) return;

    const colIdx = cell.cellIndex;
    const currentWidthPercent =
      parseFloat(cell.style.width) ||
      100 / (cell.closest("tr")?.cells.length || 2);
    const newWidthPercent = Math.max(
      5,
      Math.min(90, Math.round(currentWidthPercent + deltaPercent))
    );

    for (let r = 0; r < table.rows.length; r++) {
      const c = table.rows[r].cells[colIdx];
      if (c) {
        c.style.width = `${newWidthPercent}%`;
      }
    }

    saveCurrentSelection();
    notifyAutoSaveBody();
  };

  const distributeColumnsEvenly = () => {
    restoreSelection();
    const table = getActiveTable();
    if (!table) return;

    const maxCols = Math.max(
      ...Array.from(table.rows).map((r) => r.cells.length),
      1
    );
    const equalWidth = (100 / maxCols).toFixed(1) + "%";

    for (let r = 0; r < table.rows.length; r++) {
      for (let c = 0; c < table.rows[r].cells.length; c++) {
        table.rows[r].cells[c].style.width = equalWidth;
      }
    }

    saveCurrentSelection();
    notifyAutoSaveBody();
  };

  const moveCellText = (direction: "left" | "right" | "up" | "down") => {
    restoreSelection();
    const cell = getActiveTableCell();
    if (!cell) return;
    const tr = cell.closest("tr");
    const table = cell.closest("table");
    if (!tr || !table) return;

    const rowIdx = tr.rowIndex;
    const colIdx = cell.cellIndex;
    let targetCell: HTMLTableCellElement | null = null;

    if (
      direction === "right" &&
      cell.nextElementSibling instanceof HTMLTableCellElement
    ) {
      targetCell = cell.nextElementSibling;
    } else if (
      direction === "left" &&
      cell.previousElementSibling instanceof HTMLTableCellElement
    ) {
      targetCell = cell.previousElementSibling;
    } else if (
      direction === "down" &&
      table.rows[rowIdx + 1]?.cells[colIdx]
    ) {
      targetCell = table.rows[rowIdx + 1].cells[colIdx];
    } else if (
      direction === "up" &&
      table.rows[rowIdx - 1]?.cells[colIdx]
    ) {
      targetCell = table.rows[rowIdx - 1].cells[colIdx];
    }

    if (targetCell) {
      const currentHtml = cell.innerHTML;
      const targetHtml = targetCell.innerHTML;
      cell.innerHTML = targetHtml || "<br/>";
      targetCell.innerHTML = currentHtml || "<br/>";
      focusCell(targetCell);
    }

    saveCurrentSelection();
    runAutoPaginationPass();
    notifyAutoSaveBody();
  };

  const formatTableHeaderRow = () => {
    restoreSelection();
    const table = getActiveTable();
    if (!table || table.rows.length === 0) return;

    const firstRow = table.rows[0];
    const isAlreadyHeader =
      firstRow.style.backgroundColor.includes("f1f5f9") ||
      firstRow.style.fontWeight === "bold";

    for (let c = 0; c < firstRow.cells.length; c++) {
      const cellEl = firstRow.cells[c];
      if (isAlreadyHeader) {
        cellEl.style.backgroundColor = "transparent";
        cellEl.style.fontWeight = "normal";
      } else {
        cellEl.style.backgroundColor = "#f1f5f9";
        cellEl.style.fontWeight = "bold";
      }
    }

    saveCurrentSelection();
    notifyAutoSaveBody();
  };

  const handleInsertCallout = () => {
    restoreSelection();
    const calloutHtml = `
      <div style="margin: 1.25rem 0; padding: 0.85rem 1.25rem; background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 4px; font-family: Arial; font-size: 10pt; color: #0c4a6e;">
        <strong>CATATAN PENTING / CSMS NOTICE:</strong><br/>
        Seluruh personel dan kontraktor wajib mematuhi ketentuan klausul ini secara mutlak sesuai sistem manajemen mutu PT Nirwana Bhumi Energy.
      </div>
      <p><br/></p>
    `;
    document.execCommand("insertHTML", false, calloutHtml);
    saveCurrentSelection();
    setTimeout(runAutoPaginationPass, 50);
  };

  const handleInsertDivider = () => {
    restoreSelection();
    const dividerHtml = `<hr style="border: 0; height: 1.5px; background: #cbd5e1; margin: 1.5rem 0;" /><p><br/></p>`;
    document.execCommand("insertHTML", false, dividerHtml);
    saveCurrentSelection();
  };

  const handleInsertDate = () => {
    restoreSelection();
    const todayStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    document.execCommand("insertText", false, todayStr);
    saveCurrentSelection();
  };

  // Quick Styles application
  const applyQuickStyle = (styleType: "normal" | "heading1" | "heading2" | "title" | "subtitle") => {
    restoreSelection();
    switch (styleType) {
      case "normal":
        applyFontSizePt(10.5);
        applyAlignment("justify");
        document.execCommand("bold", false);
        break;
      case "heading1":
        applyFontSizePt(13);
        applyAlignment("left");
        document.execCommand("bold", false);
        break;
      case "heading2":
        applyFontSizePt(11.5);
        applyAlignment("left");
        document.execCommand("bold", false);
        break;
      case "title":
        applyFontSizePt(16);
        applyAlignment("center");
        document.execCommand("bold", false);
        break;
      case "subtitle":
        applyFontSizePt(11);
        applyAlignment("center");
        break;
    }
  };

  // Save all pages
  const handleSaveAll = () => {
    const updatedHtmls = pageRefs.current
      .filter((el): el is HTMLDivElement => el !== null)
      .map((el) => el.innerHTML)
      .filter((html) => html.replace(/<[^>]*>/g, "").trim().length > 0);

    const finalPages = updatedHtmls.length > 0 ? updatedHtmls : bodyPagesHtml;
    setBodyPagesHtml(finalPages);
    onSaveDocument(finalPages);

    setSaveToast("Perubahan dokumen berhasil disimpan!");
    setTimeout(() => setSaveToast(null), 3000);
  };

  const totalDocumentPages = 3 + bodyPagesHtml.length;

  // Daftar Fitur untuk Smart Search
  const searchableFeatures = [
    { id: "bold", title: "Tebal (Bold)", shortcut: "Ctrl+B", action: () => document.execCommand("bold") },
    { id: "italic", title: "Miring (Italic)", shortcut: "Ctrl+I", action: () => document.execCommand("italic") },
    { id: "underline", title: "Garis Bawah (Underline)", shortcut: "Ctrl+U", action: () => document.execCommand("underline") },
    { id: "align_left", title: "Rata Kiri (Align Left)", shortcut: "Ctrl+L", action: () => applyAlignment("left") },
    { id: "align_center", title: "Rata Tengah (Center)", shortcut: "Ctrl+E", action: () => applyAlignment("center") },
    { id: "align_right", title: "Rata Kanan (Align Right)", shortcut: "Ctrl+R", action: () => applyAlignment("right") },
    { id: "align_justify", title: "Rata Kiri-Kanan (Justify)", shortcut: "Ctrl+J", action: () => applyAlignment("justify") },
    { id: "page_break", title: "Potong Halaman Baru (Page Break)", shortcut: "Ctrl+Enter", action: handleInsertPageBreak },
    { id: "table", title: "Sisipkan Tabel Baru", shortcut: "Insert", action: handleInsertTable },
    { id: "callout", title: "Sisipkan Kotak Catatan / CSMS Notice", shortcut: "Box", action: handleInsertCallout },
    { id: "divider", title: "Sisipkan Garis Pembatas Horisontal", shortcut: "Line", action: handleInsertDivider },
    { id: "date", title: "Sisipkan Tanggal Resmi Hari Ini", shortcut: "Date", action: handleInsertDate },
    { id: "style_h1", title: "Gaya Heading 1 (Bab Dokumen)", shortcut: "13pt Bold", action: () => applyQuickStyle("heading1") },
    { id: "style_h2", title: "Gaya Heading 2 (Sub-bab)", shortcut: "11.5pt Bold", action: () => applyQuickStyle("heading2") },
    { id: "style_normal", title: "Gaya Normal Standar", shortcut: "10.5pt", action: () => applyQuickStyle("normal") },
    { id: "clear_format", title: "Hapus Semua Format (Clear Formatting)", shortcut: "Eraser", action: () => document.execCommand("removeFormat") },
    { id: "case_change", title: "Ubah Huruf Besar/Kecil (Change Case)", shortcut: "Aa", action: handleChangeCase },
    { id: "save", title: "Simpan Semua Perubahan", shortcut: "Ctrl+S", action: handleSaveAll },
  ];

  const filteredFeatures = searchableFeatures.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ width: "100%" }}>
      {/* MS Word 365 Ribbon Bar (Mode Edit Aktif) */}
      {isEditing && (
        <div className="ms-word-ribbon-container no-print">
          {/* 1. TOP TITLEBAR */}
          <div className="ms-word-titlebar">
            <div className="ms-word-titlebar-left">
              <button
                type="button"
                onClick={handleSaveAll}
                title="Simpan Dokumen (Ctrl+S)"
                className="ms-word-quick-btn"
              >
                <Save size={15} />
                <span>Simpan</span>
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  document.execCommand("undo");
                }}
                title="Undo (Ctrl+Z)"
                className="ms-word-quick-btn"
                style={{ padding: "0.35rem 0.5rem" }}
              >
                <Undo2 size={15} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  document.execCommand("redo");
                }}
                title="Redo (Ctrl+Y)"
                className="ms-word-quick-btn"
                style={{ padding: "0.35rem 0.5rem" }}
              >
                <Redo2 size={15} />
              </button>

              <span style={{ opacity: 0.35, margin: "0 0.25rem" }}>|</span>

              {/* LIVE AUTO-SAVE STATUS INDICATOR */}
              <div
                className="ms-word-autosave-badge"
                title={lastSavedTime ? `Tersimpan otomatis pada ${lastSavedTime}` : "Sistem auto-save aktif"}
              >
                <div
                  className="ms-word-autosave-dot"
                  style={
                    autoSaveStatus === "saving"
                      ? { backgroundColor: "#facc15", boxShadow: "0 0 6px #eab308" }
                      : undefined
                  }
                />
                <span>
                  {autoSaveStatus === "saving"
                    ? "Menyimpan..."
                    : lastSavedTime
                    ? `Tersimpan otomatis (${lastSavedTime})`
                    : "Tersimpan otomatis"}
                </span>
              </div>

              {onResetToTemplate && (
                <button
                  type="button"
                  onClick={onResetToTemplate}
                  title="Kembalikan isi dokumen ke template awal sistem"
                  className="ms-word-quick-btn"
                  style={{
                    background: "rgba(239, 68, 68, 0.18)",
                    borderColor: "rgba(239, 68, 68, 0.35)",
                    color: "#fecaca",
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Reset Dokumen</span>
                </button>
              )}

              <div className="ms-word-status-badge">
                <Sparkles size={13} color="#38bdf8" />
                <span>Word 365 Mode</span>
              </div>
            </div>

            {/* SMART SEARCH / FITUR PENCARIAN CEPAT */}
            <div className="ms-word-search-wrapper">
              <Search size={15} className="ms-word-search-icon" />
              <input
                type="text"
                placeholder="Cari fitur, format, atau aksi... (mis: tabel, heading, garis)"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
                className="ms-word-search-input"
              />

              {isSearchOpen && searchQuery.trim() !== "" && (
                <div className="ms-word-search-dropdown">
                  {filteredFeatures.length > 0 ? (
                    filteredFeatures.map((feat) => (
                      <button
                        key={feat.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          feat.action();
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="ms-word-search-item"
                      >
                        <Sparkles size={14} color="#0284c7" />
                        <span>{feat.title}</span>
                        <span className="ms-word-search-item-shortcut">{feat.shortcut}</span>
                      </button>
                    ))
                  ) : (
                    <div style={{ padding: "0.6rem 1rem", fontSize: "0.78rem", color: "#64748b" }}>
                      Fitur tidak ditemukan. Ketik format lain seperti "tabel", "tebal", atau "page break".
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SELESAI & SIMPAN BUTTON */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => {
                  handleSaveAll();
                  onToggleEdit();
                }}
                className="ms-word-finish-btn"
                title="Simpan Dokumen dan Tutup Editor"
              >
                <Check size={16} />
                <span>Selesai & Simpan Edit</span>
              </button>
            </div>
          </div>

          {/* 2. TAB SELECTION BAR */}
          <div className="ms-word-tabbar">
            {[
              { id: "Home", label: "Beranda (Home)" },
              { id: "Insert", label: "Sisipkan (Insert)" },
              { id: "Layout", label: "Tata Letak (Layout)" },
              {
                id: "Table",
                label: "Desain & Tata Letak Tabel",
                badge: activeTable ? "Aktif" : undefined,
              },
              { id: "View", label: "Tampilan (View)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`ms-word-tab ${activeTab === tab.id ? "active" : ""}`}
                style={
                  tab.id === "Table" && activeTable
                    ? {
                        color: activeTab === "Table" ? "#ffffff" : "#0284c7",
                        fontWeight: 700,
                        backgroundColor:
                          activeTab === "Table" ? undefined : "rgba(2, 132, 199, 0.08)",
                      }
                    : undefined
                }
              >
                {tab.label}
                {tab.badge && (
                  <span
                    style={{
                      marginLeft: "6px",
                      background: activeTab === "Table" ? "#ffffff" : "#0284c7",
                      color: activeTab === "Table" ? "#0284c7" : "#ffffff",
                      fontSize: "0.62rem",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 3. RIBBON COMMAND BODY */}
          <div className="ms-word-ribbon-body">
            {/* Tab Beranda (Home) */}
            {activeTab === "Home" && (
              <>
                {/* GRUP CLIPBOARD */}
                <div className="ms-word-group">
                  <div className="ms-word-group-content" style={{ flexDirection: "row", alignItems: "center", gap: "0.4rem" }}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (navigator.clipboard) {
                          navigator.clipboard.readText().then((t) => document.execCommand("insertText", false, t));
                        }
                      }}
                      className="ms-word-large-btn"
                      title="Tempel Teks (Paste)"
                    >
                      <ClipboardPaste size={20} color="#003366" />
                      <span className="ms-word-large-btn-label">Paste</span>
                    </button>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("cut");
                        }}
                        className="ms-word-tool-btn"
                        title="Potong Teks (Cut - Ctrl+X)"
                      >
                        <Scissors size={14} />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("copy");
                        }}
                        className="ms-word-tool-btn"
                        title="Salin Teks (Copy - Ctrl+C)"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleToggleFormatPainter();
                        }}
                        className={`ms-word-tool-btn ${formatPainterStyle ? "active" : ""}`}
                        title="Format Painter (Salin Gaya Format Teks)"
                      >
                        <Paintbrush size={14} color={formatPainterStyle ? "#0284c7" : "#475569"} />
                      </button>
                    </div>
                  </div>
                  <span className="ms-word-group-label">Clipboard</span>
                </div>

                {/* GRUP FONT */}
                <div className="ms-word-group">
                  <div className="ms-word-group-content">
                    {/* Row 1: Font Family & Size */}
                    <div className="ms-word-group-row">
                      <select
                        value={currentFontFamily}
                        onMouseDown={saveCurrentSelection}
                        onChange={(e) => applyFontFamily(e.target.value)}
                        className="ms-word-select ms-word-select-font"
                        title="Pilih Jenis Huruf (Font Family)"
                      >
                        {FONT_FAMILIES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>

                      <select
                        value={currentFontSizePt}
                        onMouseDown={saveCurrentSelection}
                        onChange={(e) => applyFontSizePt(parseFloat(e.target.value))}
                        className="ms-word-select ms-word-select-size"
                        title="Pilih Ukuran Huruf (Font Size Pt)"
                      >
                        {FONT_SIZES_PT.map((sz) => (
                          <option key={sz} value={sz}>
                            {sz} pt
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          saveCurrentSelection();
                          applyFontSizePt(currentFontSizePt + 1);
                        }}
                        className="ms-word-tool-btn"
                        title="Perbesar Ukuran Huruf (Grow Font)"
                      >
                        <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>A▲</span>
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          saveCurrentSelection();
                          applyFontSizePt(currentFontSizePt - 1);
                        }}
                        className="ms-word-tool-btn"
                        title="Perkecil Ukuran Huruf (Shrink Font)"
                      >
                        <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>A▼</span>
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleChangeCase();
                        }}
                        className="ms-word-tool-btn"
                        title="Ubah Kapitalisasi Huruf (Change Case: Besar / Kecil / Kapital Judul)"
                      >
                        <Type size={14} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("removeFormat");
                        }}
                        className="ms-word-tool-btn"
                        title="Bersihkan Semua Format (Clear Formatting)"
                      >
                        <Eraser size={14} />
                      </button>
                    </div>

                    {/* Row 2: Styling Bold, Italic, Color */}
                    <div className="ms-word-group-row">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("bold");
                        }}
                        className="ms-word-tool-btn"
                        title="Tebal (Bold - Ctrl+B)"
                      >
                        <Bold size={15} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("italic");
                        }}
                        className="ms-word-tool-btn"
                        title="Miring (Italic - Ctrl+I)"
                      >
                        <Italic size={15} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("underline");
                        }}
                        className="ms-word-tool-btn"
                        title="Garis Bawah (Underline - Ctrl+U)"
                      >
                        <Underline size={15} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("strikeThrough");
                        }}
                        className="ms-word-tool-btn"
                        title="Coret Teks (Strikethrough)"
                      >
                        <Strikethrough size={14} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("subscript");
                        }}
                        className="ms-word-tool-btn"
                        title="Subskrip (x₂)"
                      >
                        <Subscript size={14} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("superscript");
                        }}
                        className="ms-word-tool-btn"
                        title="Superskrip (x²)"
                      >
                        <Superscript size={14} />
                      </button>

                      {/* Highlight Color */}
                      <div className="ms-word-color-btn" title="Warna Stabilo (Text Highlight Color)">
                        <Highlighter size={14} color="#d97706" />
                        <div className="ms-word-color-indicator" style={{ backgroundColor: highlightColor }} />
                        <input
                          type="color"
                          value={highlightColor}
                          onChange={(e) => {
                            setHighlightColor(e.target.value);
                            restoreSelection();
                            document.execCommand("hiliteColor", false, e.target.value);
                          }}
                          className="ms-word-color-native-input"
                        />
                      </div>

                      {/* Font Color */}
                      <div className="ms-word-color-btn" title="Warna Huruf (Font Color)">
                        <Baseline size={14} color="#003366" />
                        <div className="ms-word-color-indicator" style={{ backgroundColor: textColor }} />
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => {
                            setTextColor(e.target.value);
                            restoreSelection();
                            document.execCommand("foreColor", false, e.target.value);
                          }}
                          className="ms-word-color-native-input"
                        />
                      </div>
                    </div>
                  </div>
                  <span className="ms-word-group-label">Font</span>
                </div>

                {/* GRUP PARAGRAF */}
                <div className="ms-word-group">
                  <div className="ms-word-group-content">
                    {/* Row 1: Lists & Indents */}
                    <div className="ms-word-group-row">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("insertUnorderedList");
                        }}
                        className="ms-word-tool-btn"
                        title="Daftar Poin (Bullets)"
                      >
                        <List size={15} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("insertOrderedList");
                        }}
                        className="ms-word-tool-btn"
                        title="Daftar Penomoran (Numbering)"
                      >
                        <ListOrdered size={15} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          adjustParagraphIndent(-0.5);
                        }}
                        className="ms-word-tool-btn"
                        title="Kurangi Indentasi / Geser Kiri (Shift+Tab / -1.27 cm)"
                      >
                        <Outdent size={15} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          adjustParagraphIndent(0.5);
                        }}
                        className="ms-word-tool-btn"
                        title="Tambah Indentasi / Geser Kanan (Tab / +1.27 cm)"
                      >
                        <Indent size={15} />
                      </button>

                      {/* Line Spacing */}
                      <select
                        onChange={(e) => {
                          restoreSelection();
                          const activeContainer = pageRefs.current[activePageIdx];
                          if (activeContainer) {
                            const sel = window.getSelection();
                            if (sel && sel.rangeCount > 0) {
                              const range = sel.getRangeAt(0);
                              activeContainer.querySelectorAll("p, div, li").forEach((el) => {
                                if (sel.containsNode(el, true) || el.contains(range.commonAncestorContainer)) {
                                  (el as HTMLElement).style.lineHeight = e.target.value;
                                }
                              });
                            }
                          }
                          saveCurrentSelection();
                        }}
                        className="ms-word-select"
                        style={{ width: "68px" }}
                        title="Jarak Spasi Antar Baris (Line Spacing)"
                        defaultValue="1.6"
                      >
                        <option value="1.0">1.0</option>
                        <option value="1.15">1.15</option>
                        <option value="1.5">1.5</option>
                        <option value="1.6">1.6</option>
                        <option value="2.0">2.0</option>
                      </select>
                    </div>

                    {/* Row 2: Alignments */}
                    <div className="ms-word-group-row">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          saveCurrentSelection();
                          applyAlignment("left");
                        }}
                        className={`ms-word-tool-btn ${currentAlign === "left" ? "active" : ""}`}
                        title="Rata Kiri (Align Left - Ctrl+L)"
                      >
                        <AlignLeft size={15} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          saveCurrentSelection();
                          applyAlignment("center");
                        }}
                        className={`ms-word-tool-btn ${currentAlign === "center" ? "active" : ""}`}
                        title="Rata Tengah (Center - Ctrl+E)"
                      >
                        <AlignCenter size={15} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          saveCurrentSelection();
                          applyAlignment("right");
                        }}
                        className={`ms-word-tool-btn ${currentAlign === "right" ? "active" : ""}`}
                        title="Rata Kanan (Align Right - Ctrl+R)"
                      >
                        <AlignRight size={15} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          saveCurrentSelection();
                          applyAlignment("justify");
                        }}
                        className={`ms-word-tool-btn ${currentAlign === "justify" ? "active" : ""}`}
                        title="Rata Kiri-Kanan (Justify - Ctrl+J)"
                      >
                        <AlignJustify size={15} />
                      </button>
                    </div>
                  </div>
                  <span className="ms-word-group-label">Paragraf</span>
                </div>

                {/* GRUP HALAMAN & BREAK */}
                <div className="ms-word-group">
                  <div className="ms-word-group-content" style={{ alignItems: "center" }}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        saveCurrentSelection();
                        handleInsertPageBreak();
                      }}
                      className="ms-word-large-btn"
                      title="Potong Halaman ke Halaman Baru (Ctrl+Enter)"
                    >
                      <SplitSquareVertical size={20} color="#0284c7" />
                      <span className="ms-word-large-btn-label">Page Break</span>
                    </button>
                  </div>
                  <span className="ms-word-group-label">Halaman</span>
                </div>

                {/* GRUP GAYA CEPAT (STYLES) */}
                <div className="ms-word-group ms-word-group-last">
                  <div className="ms-word-group-content">
                    <div className="ms-word-styles-grid">
                      <div
                        onClick={() => applyQuickStyle("normal")}
                        className="ms-word-style-chip"
                        title="Format Normal: 10.5pt Arial Rata Kiri-Kanan"
                      >
                        <span className="ms-word-style-preview" style={{ fontWeight: 400 }}>AaBbCc</span>
                        <span className="ms-word-style-name">Normal</span>
                      </div>

                      <div
                        onClick={() => applyQuickStyle("heading1")}
                        className="ms-word-style-chip"
                        title="Heading 1: 13pt Arial Bold Rata Kiri"
                      >
                        <span className="ms-word-style-preview" style={{ fontWeight: 700, color: "#003366" }}>AaBbCc</span>
                        <span className="ms-word-style-name">Heading 1</span>
                      </div>

                      <div
                        onClick={() => applyQuickStyle("heading2")}
                        className="ms-word-style-chip"
                        title="Heading 2: 11.5pt Arial Bold Rata Kiri"
                      >
                        <span className="ms-word-style-preview" style={{ fontWeight: 600, color: "#0284c7" }}>AaBbCc</span>
                        <span className="ms-word-style-name">Heading 2</span>
                      </div>

                      <div
                        onClick={() => applyQuickStyle("title")}
                        className="ms-word-style-chip"
                        title="Title: 16pt Arial Bold Rata Tengah"
                      >
                        <span className="ms-word-style-preview" style={{ fontWeight: 800 }}>AABB</span>
                        <span className="ms-word-style-name">Title</span>
                      </div>

                      <div
                        onClick={() => applyQuickStyle("subtitle")}
                        className="ms-word-style-chip"
                        title="Subtitle: 11pt Arial Rata Tengah"
                      >
                        <span className="ms-word-style-preview" style={{ fontStyle: "italic" }}>AaBb</span>
                        <span className="ms-word-style-name">Subtitle</span>
                      </div>
                    </div>
                  </div>
                  <span className="ms-word-group-label">Gaya Cepat</span>
                </div>
              </>
            )}

            {/* Tab Sisipkan (Insert) */}
            {activeTab === "Insert" && (
              <>
                <div className="ms-word-group">
                  <div className="ms-word-group-content" style={{ flexDirection: "row", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleInsertTable();
                      }}
                      className="ms-word-large-btn"
                      title="Sisipkan Tabel Standar NBE"
                    >
                      <Table size={20} color="#003366" />
                      <span className="ms-word-large-btn-label">Tabel</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleInsertCallout();
                      }}
                      className="ms-word-large-btn"
                      title="Sisipkan Kotak Catatan / Warning Standar CSMS"
                    >
                      <FileText size={20} color="#0284c7" />
                      <span className="ms-word-large-btn-label">Kotak Catatan</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleInsertDivider();
                      }}
                      className="ms-word-large-btn"
                      title="Sisipkan Garis Pembatas Horisontal"
                    >
                      <Minus size={20} color="#003366" />
                      <span className="ms-word-large-btn-label">Pemisah</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleInsertDate();
                      }}
                      className="ms-word-large-btn"
                      title="Sisipkan Tanggal Terbit Resmi Hari Ini"
                    >
                      <Calendar size={20} color="#059669" />
                      <span className="ms-word-large-btn-label">Tanggal</span>
                    </button>
                  </div>
                  <span className="ms-word-group-label">Tabel & Elemen Khusus</span>
                </div>

                <div className="ms-word-group ms-word-group-last">
                  <div className="ms-word-group-content">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleInsertPageBreak();
                      }}
                      className="ms-word-large-btn"
                      title="Potong Halaman ke Halaman Baru"
                    >
                      <SplitSquareVertical size={20} color="#0284c7" />
                      <span className="ms-word-large-btn-label">Page Break</span>
                    </button>
                  </div>
                  <span className="ms-word-group-label">Pemisah Halaman</span>
                </div>
              </>
            )}

            {/* Tab Tata Letak (Layout) */}
            {activeTab === "Layout" && (
              <>
                {/* KONTROL UKURAN TABEL KOP SURAT */}
                <div className="ms-word-group">
                  <div className="ms-word-group-content" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}>
                      <span style={{ fontWeight: 600, minWidth: "95px" }}>Lebar Kolom Logo:</span>
                      {[20, 25, 30, 35, 40].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => onUpdateKopSetting && onUpdateKopSetting("logoWidthPercent", w)}
                          className={`ms-word-kop-btn-pill ${kopSettings?.logoWidthPercent === w ? "active" : ""}`}
                          title={`Atur proporsi lebar kolom logo kop ke ${w}%`}
                        >
                          {w}%
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}>
                      <span style={{ fontWeight: 600, minWidth: "95px" }}>Skala Logo:</span>
                      {[
                        { val: 0.7, label: "70%" },
                        { val: 0.85, label: "85%" },
                        { val: 0.95, label: "95%" },
                        { val: 1.0, label: "100% (Penuh Kolom)" },
                      ].map((ls) => (
                        <button
                          key={ls.val}
                          type="button"
                          onClick={() => onUpdateKopSetting && onUpdateKopSetting("logoScale", ls.val)}
                          className={`ms-word-kop-btn-pill ${Math.abs((kopSettings?.logoScale || 1.0) - ls.val) < 0.05 ? "active" : ""}`}
                          title={ls.val === 1.0 ? "Skala Terbesar: Logo tepat memenuhi seluruh kolom" : `Ubah skala logo ke ${ls.label}`}
                        >
                          {ls.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}>
                      <span style={{ fontWeight: 600, minWidth: "95px" }}>Tinggi Sel Kop:</span>
                      {[
                        { val: 4, label: "Padat (4px)" },
                        { val: 6, label: "Standar (6px)" },
                        { val: 9, label: "Lega (9px)" },
                      ].map((p) => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => onUpdateKopSetting && onUpdateKopSetting("paddingY", p.val)}
                          className={`ms-word-kop-btn-pill ${kopSettings?.paddingY === p.val ? "active" : ""}`}
                          title={`Tinggi baris padding sel kop: ${p.label}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}>
                      <span style={{ fontWeight: 600, minWidth: "95px" }}>Skala Font Kop:</span>
                      {[
                        { val: 0.9, label: "90% (Kecil)" },
                        { val: 1.0, label: "100% (Normal)" },
                        { val: 1.1, label: "110% (Besar)" },
                      ].map((s) => (
                        <button
                          key={s.val}
                          type="button"
                          onClick={() => onUpdateKopSetting && onUpdateKopSetting("fontSizeScale", s.val)}
                          className={`ms-word-kop-btn-pill ${kopSettings?.fontSizeScale === s.val ? "active" : ""}`}
                          title={`Skala font teks di dalam kop surat: ${s.label}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="ms-word-group-label">Ukuran Tabel Kop Surat</span>
                </div>

                <div className="ms-word-group">
                  <div className="ms-word-group-content">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <span style={{ fontWeight: 600 }}>Margin Dokumen:</span>
                      <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "0.25rem 0.6rem", borderRadius: "4px", fontWeight: 700 }}>
                        Standar Baku NBE (2.54 cm)
                      </span>
                    </div>
                  </div>
                  <span className="ms-word-group-label">Margin Kertas</span>
                </div>

                <div className="ms-word-group ms-word-group-last">
                  <div className="ms-word-group-content">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <span style={{ fontWeight: 600 }}>Ukuran Kertas:</span>
                      <span style={{ background: "#ecfdf5", color: "#065f46", padding: "0.25rem 0.6rem", borderRadius: "4px", fontWeight: 700 }}>
                        A4 (210 x 297 mm)
                      </span>
                    </div>
                  </div>
                  <span className="ms-word-group-label">Ukuran Standar</span>
                </div>
              </>
            )}

            {/* Tab Desain & Tata Letak Tabel (Table Tools) */}
            {activeTab === "Table" && (
              <>
                {/* GRUP BARIS */}
                <div className="ms-word-group">
                  <div className="ms-word-group-content" style={{ flexDirection: "row", gap: "0.4rem" }}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertTableRow(false);
                      }}
                      className="ms-word-tool-btn"
                      title="Sisipkan Baris Baru di Atas Baris Ini"
                      disabled={!activeTable}
                      style={{ flexDirection: "column", height: "auto", padding: "4px 8px", minWidth: "60px", gap: "3px" }}
                    >
                      <ArrowUp size={16} color="#0284c7" />
                      <span style={{ fontSize: "0.68rem" }}>Baris Atas</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertTableRow(true);
                      }}
                      className="ms-word-tool-btn"
                      title="Sisipkan Baris Baru di Bawah Baris Ini (Bisa juga tekan Tab di sel terakhir)"
                      disabled={!activeTable}
                      style={{ flexDirection: "column", height: "auto", padding: "4px 8px", minWidth: "60px", gap: "3px" }}
                    >
                      <ArrowDown size={16} color="#059669" />
                      <span style={{ fontSize: "0.68rem" }}>Baris Bawah</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        deleteTableRow();
                      }}
                      className="ms-word-tool-btn"
                      title="Hapus Baris Terpilih"
                      disabled={!activeTable}
                      style={{ flexDirection: "column", height: "auto", padding: "4px 8px", minWidth: "60px", gap: "3px" }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                      <span style={{ fontSize: "0.68rem", color: "#dc2626" }}>Hapus Baris</span>
                    </button>
                  </div>
                  <span className="ms-word-group-label">Baris Tabel</span>
                </div>

                {/* GRUP KOLOM */}
                <div className="ms-word-group">
                  <div className="ms-word-group-content" style={{ flexDirection: "row", gap: "0.4rem" }}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertTableColumn(false);
                      }}
                      className="ms-word-tool-btn"
                      title="Sisipkan Kolom Baru di Sebelah Kiri"
                      disabled={!activeTable}
                      style={{ flexDirection: "column", height: "auto", padding: "4px 8px", minWidth: "60px", gap: "3px" }}
                    >
                      <ArrowLeft size={16} color="#0284c7" />
                      <span style={{ fontSize: "0.68rem" }}>Kolom Kiri</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertTableColumn(true);
                      }}
                      className="ms-word-tool-btn"
                      title="Sisipkan Kolom Baru di Sebelah Kanan"
                      disabled={!activeTable}
                      style={{ flexDirection: "column", height: "auto", padding: "4px 8px", minWidth: "60px", gap: "3px" }}
                    >
                      <ArrowRight size={16} color="#059669" />
                      <span style={{ fontSize: "0.68rem" }}>Kolom Kanan</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        deleteTableColumn();
                      }}
                      className="ms-word-tool-btn"
                      title="Hapus Kolom Terpilih"
                      disabled={!activeTable}
                      style={{ flexDirection: "column", height: "auto", padding: "4px 8px", minWidth: "60px", gap: "3px" }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                      <span style={{ fontSize: "0.68rem", color: "#dc2626" }}>Hapus Kolom</span>
                    </button>
                  </div>
                  <span className="ms-word-group-label">Kolom Tabel</span>
                </div>

                {/* GRUP UKURAN & TATA LETAK */}
                <div className="ms-word-group">
                  <div className="ms-word-group-content" style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 600, minWidth: "75px" }}>Lebar Tabel:</span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setTableLayout("100%", "center");
                        }}
                        className="ms-word-kop-btn-pill"
                        title="Atur lebar tabel 100% penuh halaman"
                        disabled={!activeTable}
                      >
                        100% Penuh
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setTableLayout("85%", "center");
                        }}
                        className="ms-word-kop-btn-pill"
                        title="Atur lebar tabel 85% rata tengah"
                        disabled={!activeTable}
                      >
                        85% Tengah
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setTableLayout("70%", "center");
                        }}
                        className="ms-word-kop-btn-pill"
                        title="Atur lebar tabel 70% rata tengah"
                        disabled={!activeTable}
                      >
                        70% Tengah
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 600, minWidth: "75px" }}>Lebar Kolom:</span>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          adjustActiveColumnWidth(5);
                        }}
                        className="ms-word-kop-btn-pill"
                        title="Perlebar kolom aktif (+5%)"
                        disabled={!activeTable}
                      >
                        Lebar +5%
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          adjustActiveColumnWidth(-5);
                        }}
                        className="ms-word-kop-btn-pill"
                        title="Persempit kolom aktif (-5%)"
                        disabled={!activeTable}
                      >
                        Lebar -5%
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          distributeColumnsEvenly();
                        }}
                        className="ms-word-kop-btn-pill"
                        title="Bagi rata proporsi lebar semua kolom"
                        disabled={!activeTable}
                      >
                        <Grid size={11} style={{ marginRight: "3px" }} />
                        Bagi Rata Kolom
                      </button>
                    </div>
                  </div>
                  <span className="ms-word-group-label">Ukuran & Tata Letak</span>
                </div>

                {/* GRUP PINDAHKAN TULISAN */}
                <div className="ms-word-group">
                  <div className="ms-word-group-content" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          moveCellText("up");
                        }}
                        className="ms-word-tool-btn"
                        title="Tukar Tulisan ke Sel Atas"
                        disabled={!activeTableCell}
                      >
                        <ArrowUp size={13} />
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          moveCellText("left");
                        }}
                        className="ms-word-tool-btn"
                        title="Tukar Tulisan ke Sel Kiri"
                        disabled={!activeTableCell}
                      >
                        <ArrowLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          moveCellText("down");
                        }}
                        className="ms-word-tool-btn"
                        title="Tukar Tulisan ke Sel Bawah"
                        disabled={!activeTableCell}
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          moveCellText("right");
                        }}
                        className="ms-word-tool-btn"
                        title="Tukar Tulisan ke Sel Kanan"
                        disabled={!activeTableCell}
                      >
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                  <span className="ms-word-group-label">Pindahkan Tulisan</span>
                </div>

                {/* GRUP GAYA & HAPUS */}
                <div className="ms-word-group ms-word-group-last">
                  <div className="ms-word-group-content" style={{ flexDirection: "row", gap: "0.4rem", alignItems: "center" }}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        formatTableHeaderRow();
                      }}
                      className="ms-word-tool-btn"
                      title="Format Baris Pertama Sebagai Judul Header Tabel (Warna Abu / Bold)"
                      disabled={!activeTable}
                      style={{ flexDirection: "column", height: "auto", padding: "4px 8px", minWidth: "65px", gap: "3px" }}
                    >
                      <Sparkles size={16} color="#0284c7" />
                      <span style={{ fontSize: "0.68rem" }}>Header Abu</span>
                    </button>

                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        deleteCurrentTable();
                      }}
                      className="ms-word-tool-btn"
                      title="Hapus Keseluruhan Tabel Ini dari Dokumen"
                      disabled={!activeTable}
                      style={{ flexDirection: "column", height: "auto", padding: "4px 8px", minWidth: "65px", gap: "3px" }}
                    >
                      <Trash2 size={16} color="#dc2626" />
                      <span style={{ fontSize: "0.68rem", color: "#dc2626", fontWeight: 700 }}>Hapus Tabel</span>
                    </button>
                  </div>
                  <span className="ms-word-group-label">Opsi Tabel</span>
                </div>

                {!activeTable && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0 0.5rem", color: "#64748b", fontSize: "0.78rem" }}>
                    <span>ℹ️ Klik pada sel tabel di halaman untuk mengaktifkan seluruh alat edit tabel di atas.</span>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleInsertTable();
                      }}
                      className="ms-word-kop-btn-pill"
                      style={{ color: "#0284c7", borderColor: "#38bdf8" }}
                    >
                      + Buat Tabel Baru
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Tab Tampilan (View) */}
            {activeTab === "View" && (
              <>
                <div className="ms-word-group">
                  <div className="ms-word-group-content" style={{ flexDirection: "row", gap: "0.4rem" }}>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                      className="ms-word-tool-btn"
                      title="Perkecil Tampilan Kertas (Zoom Out)"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, padding: "0 0.4rem", display: "flex", alignItems: "center" }}>
                      {zoomLevel}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                      className="ms-word-tool-btn"
                      title="Perbesar Tampilan Kertas (Zoom In)"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(100)}
                      className="ms-word-tool-btn"
                      title="Reset Zoom ke 100%"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                  <span className="ms-word-group-label">Skala Zoom</span>
                </div>

                <div className="ms-word-group ms-word-group-last">
                  <div className="ms-word-group-content">
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={showRuler}
                        onChange={(e) => setShowRuler(e.target.checked)}
                      />
                      <span>Tampilkan Penggaris (Ruler)</span>
                    </label>
                  </div>
                  <span className="ms-word-group-label">Alat Bantu</span>
                </div>
              </>
            )}
          </div>

          {/* 4. HORIZONTAL RULER & TAB GUIDE */}
          {showRuler && (
            <div className="ms-word-ruler-wrapper">
              <div className="ms-word-ruler">
                <div
                  ref={rulerTrackRef}
                  className="ms-word-ruler-track"
                  onMouseLeave={() => setRulerHoverCm(null)}
                >
                  {/* Left Margin area (83px / ~2.2cm) */}
                  <div className="ms-word-ruler-margin-left" title="Margin Kiri Kertas A4 (2.2 cm)">
                    <span>2.2 cm</span>
                  </div>

                  {/* Printable area (662px / 0 to 17.5cm) */}
                  <div
                    className="ms-word-ruler-printable"
                    onClick={handleRulerPrintableClick}
                    onMouseMove={handleRulerMouseMove}
                    title="Klik pada penggaris untuk mengatur Tab / Indentasi kalimat aktif"
                  >
                    {/* Centimeter Marks 1..17 */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((cm) => (
                      <div
                        key={cm}
                        className="ms-word-ruler-cm-mark"
                        style={{ left: `${cm * 37.828}px` }}
                      >
                        <span className="ms-word-ruler-cm-num">{cm}</span>
                        <div className="ms-word-ruler-cm-tick" />
                      </div>
                    ))}

                    {/* Half-cm subticks */}
                    {[0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5, 16.5].map((sub) => (
                      <div
                        key={`sub-${sub}`}
                        className="ms-word-ruler-subtick"
                        style={{ left: `${sub * 37.828}px` }}
                      />
                    ))}

                    {/* Standard Tab Stop Markers (0.5", 1.0", 1.5", 2.0"...) */}
                    {[1.27, 2.54, 3.81, 5.08, 6.35, 7.62, 8.89, 10.16, 11.43, 12.7, 13.97, 15.24].map((tabCm) => (
                      <div
                        key={`tab-${tabCm}`}
                        className="ms-word-ruler-tabstop-mark"
                        style={{ left: `${tabCm * 37.828}px` }}
                        title={`Tab Stop ${tabCm / 2.54}" (${tabCm} cm)`}
                      />
                    ))}

                    {/* First Line Indent Marker (Top Inverted Triangle ▼) */}
                    <div
                      className="ms-word-ruler-marker-firstline"
                      style={{
                        left: `${Math.max(0, Math.min(662, (activeIndentCm + firstLineIndentCm) * 37.828))}px`,
                      }}
                      title={`First-Line Indent: ${(activeIndentCm + firstLineIndentCm).toFixed(2)} cm`}
                    />

                    {/* Left / Hanging Indent Marker (Bottom Triangle ▲ + Box ■) */}
                    <div
                      className="ms-word-ruler-marker-left"
                      style={{
                        left: `${Math.max(0, Math.min(662, activeIndentCm * 37.828))}px`,
                      }}
                      title={`Left Indent: ${activeIndentCm.toFixed(2)} cm (${(activeIndentCm / 2.54).toFixed(2)}")`}
                    >
                      <div className="ms-word-ruler-marker-triangle" />
                      <div className="ms-word-ruler-marker-base" />
                    </div>
                  </div>

                  {/* Right Margin area (75px / ~2.0cm) */}
                  <div className="ms-word-ruler-margin-right" title="Margin Kanan Kertas A4 (2.0 cm)">
                    <span>2.0 cm</span>
                  </div>
                </div>

                {/* Quick Shift & Tab Guide Toolbar */}
                <div className="ms-word-ruler-control-bar">
                  <div className="ms-word-ruler-info">
                    <span className="ms-word-ruler-label">📐 Panduan Tab & Pergeseran Kalimat:</span>
                    <span className="ms-word-ruler-val">
                      {activeIndentCm > 0
                        ? `${activeIndentCm.toFixed(2)} cm (${(activeIndentCm / 2.54).toFixed(2)}")`
                        : "Margin 0 cm (Flush Kiri)"}
                    </span>
                    {firstLineIndentCm !== 0 && (
                      <span className="ms-word-ruler-val" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }}>
                        Baris 1: {firstLineIndentCm > 0 ? `+${firstLineIndentCm.toFixed(2)} cm` : `${firstLineIndentCm.toFixed(2)} cm`}
                      </span>
                    )}
                  </div>
                  <div className="ms-word-ruler-buttons">
                    <button
                      type="button"
                      onClick={() => adjustParagraphIndent(-0.5)}
                      className="ms-word-ruler-btn"
                      title="Geser Kiri / Kurangi Indentasi (Shift + Tab / -1.27 cm)"
                    >
                      <Outdent size={13} /> <span>Geser Kiri</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustParagraphIndent(0.5)}
                      className="ms-word-ruler-btn ms-word-ruler-btn-primary"
                      title="Geser Kanan / Tambah Indentasi (Tab / +1.27 cm)"
                    >
                      <Indent size={13} /> <span>Geser Kanan (Tab)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecificIndentCm(1.27)}
                      className={`ms-word-ruler-btn ${Math.abs(activeIndentCm - 1.27) < 0.1 ? "active" : ""}`}
                      title="Atur Tab Stop 1 (0.5 inci / 1.27 cm)"
                    >
                      <span>Tab 1.27 cm (0.5")</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpecificIndentCm(2.54)}
                      className={`ms-word-ruler-btn ${Math.abs(activeIndentCm - 2.54) < 0.1 ? "active" : ""}`}
                      title="Atur Tab Stop 2 (1.0 inci / 2.54 cm)"
                    >
                      <span>Tab 2.54 cm (1.0")</span>
                    </button>
                    <button
                      type="button"
                      onClick={setHangingIndent}
                      className="ms-word-ruler-btn"
                      title="Atur Indentasi Gantung / Klausul (Hanging Indent 0.5 in)"
                    >
                      <span>Indent Gantung</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFirstLineIndent(1.27)}
                      className="ms-word-ruler-btn"
                      title="Geser Kalimat Baris Pertama Saja (+1.27 cm)"
                    >
                      <span>Baris 1 Saja</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetIndent}
                      className="ms-word-ruler-btn ms-word-ruler-btn-danger"
                      title="Kembalikan Indentasi ke Batas Margin Kiri Normal (0 cm)"
                    >
                      <span>Reset 0</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOAST SAVE NOTIFICATION */}
      {saveToast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#065f46",
            color: "#ffffff",
            padding: "0.75rem 1.25rem",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            zIndex: 1000,
            fontSize: "0.85rem",
            fontWeight: 700,
          }}
        >
          <Check size={18} color="#34d399" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Kanvas Dokumen A4 / F4 */}
      <div
        id="nbe-single-a4-preview-canvas"
        className={`a4-print-container ${isF4 ? "paper-size-f4" : "paper-size-a4"}`}
        style={{
          padding: "2rem 1rem",
          background: "var(--bg-tertiary, #e2e8f0)",
          overflowY: "auto",
          maxHeight: "950px",
          transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
          transformOrigin: "top center",
          transition: "transform 0.2s ease",
          position: "relative",
        }}
      >
        {/* Dynamic Vertical Guide Line for measuring tabs and alignment */}
        {showRuler && rulerHoverCm !== null && (
          <div
            className="ms-word-ruler-guide-line no-print"
            style={{
              left: `calc(50% - 410px + 83px + ${rulerHoverCm * 37.828}px)`,
            }}
          >
            <div className="ms-word-ruler-guide-tooltip">
              📐 Panduan Tab: {rulerHoverCm.toFixed(2)} cm ({(rulerHoverCm / 2.54).toFixed(2)}")
            </div>
          </div>
        )}
        {/* Halaman 1, 2, 3 yang diisi otomatis oleh sistem */}
        {renderSystemCoverPage()}
        {renderSystemRevisionPage(totalDocumentPages)}
        {renderSystemTocPage(totalDocumentPages)}

        {/* Halaman 4+: Halaman Isi Dinamis dengan Auto-Pagination */}
        {bodyPagesHtml.map((pageHtml, idx) => {
          const pageNum = 4 + idx;
          const isPageVisible = !activePageTab || activePageTab === "all" || activePageTab === pageNum;
          return (
            <div
              key={idx}
              style={dynamicPageStyle}
              id={`nbe-page-${pageNum}`}
              className={`a4-page-preview a4-print-page ${isF4 ? "paper-size-f4" : "paper-size-a4"} ${!isPageVisible ? "screen-hidden" : ""}`}
            >
              <div>
                {/* Kop Header Otomatis (Terkunci Sistem) */}
                <div contentEditable={false} style={{ userSelect: "none" }}>
                  {renderRunningKopHeader()}
                </div>

                {/* Area Isi Kertas yang Dapat Diedit */}
                <div
                  ref={(el) => {
                    pageRefs.current[idx] = el;
                    if (el && el.innerHTML !== pageHtml && document.activeElement !== el) {
                      el.innerHTML = pageHtml;
                    }
                  }}
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onFocus={() => setActivePageIdx(idx)}
                  onMouseUp={() => {
                    saveCurrentSelection();
                    handleSelectionChange();
                  }}
                  onInput={() => {
                    saveCurrentSelection();
                    runAutoPaginationPass();
                    notifyAutoSaveBody();
                  }}
                  onKeyUp={() => {
                    saveCurrentSelection();
                    handleSelectionChange();
                    runAutoPaginationPass();
                    notifyAutoSaveBody();
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "Enter") {
                      e.preventDefault();
                      saveCurrentSelection();
                      handleInsertPageBreak();
                    } else if (e.key === "Tab") {
                      const currentCell = getActiveTableCell();
                      if (currentCell) {
                        e.preventDefault();
                        const currentTr = currentCell.closest("tr");
                        const currentTable = currentCell.closest("table");
                        if (currentTr && currentTable) {
                          if (e.shiftKey) {
                            const prevCell = currentCell.previousElementSibling as HTMLElement | null;
                            if (prevCell) {
                              focusCell(prevCell);
                            } else {
                              const prevTr = currentTr.previousElementSibling as HTMLTableRowElement | null;
                              if (prevTr && prevTr.cells.length > 0) {
                                focusCell(prevTr.cells[prevTr.cells.length - 1]);
                              }
                            }
                          } else {
                            const nextCell = currentCell.nextElementSibling as HTMLElement | null;
                            if (nextCell) {
                              focusCell(nextCell);
                            } else {
                              const nextTr = currentTr.nextElementSibling as HTMLTableRowElement | null;
                              if (nextTr && nextTr.cells.length > 0) {
                                focusCell(nextTr.cells[0]);
                              } else {
                                // Di sel terakhir dari baris terakhir: otomatis tambahkan baris baru (gaya baku MS Word)
                                insertTableRow(true);
                              }
                            }
                          }
                          return;
                        }
                      }

                      e.preventDefault();
                      saveCurrentSelection();
                      if (e.shiftKey) {
                        // Shift + Tab -> Outdent / Kurangi Indentasi
                        adjustParagraphIndent(-0.5);
                      } else {
                        // Tab -> Indent / Tambah Indentasi atau sisipkan tab space
                        const sel = window.getSelection();
                        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
                          adjustParagraphIndent(0.5);
                        } else if (sel && sel.rangeCount > 0) {
                          const range = sel.getRangeAt(0);
                          const block = getActiveBlockElement();
                          if (block && range.startOffset === 0) {
                            adjustParagraphIndent(0.5);
                          } else {
                            document.execCommand("insertHTML", false, "&emsp;");
                          }
                        } else {
                          adjustParagraphIndent(0.5);
                        }
                      }
                      notifyAutoSaveBody();
                    }
                  }}
                  style={{
                    minHeight: `${maxBodyHeightPx}px`,
                    fontFamily: currentFontFamily,
                    outline: "none",
                    color: "#3B3838",
                    lineHeight: 1.6,
                    padding: isEditing ? "6px" : "0",
                    border: isEditing ? "1px dashed rgba(2, 132, 199, 0.4)" : "none",
                    borderRadius: "4px",
                    transition: "border 0.2s ease",
                  }}
                />
              </div>

              {/* Footer Nomor Halaman Otomatis (Terkunci Sistem) */}
              <div
                contentEditable={false}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid #cbd5e1",
                  paddingTop: "0.5rem",
                  fontSize: "8pt",
                  color: "#94a3b8",
                  userSelect: "none",
                }}
              >
                <span>© {documentYear || "2026"} PT Nirwana Bhumi Energy</span>
                <span>
                  Page {4 + idx} of {totalDocumentPages}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* FLOATING ACTION DOCK UNTUK KENDALI TABEL CEPAT */}
      {isEditing && activeTable && (
        <div className="ms-word-table-dock">
          <div className="ms-word-table-dock-title">
            <Table size={14} color="#38bdf8" />
            <span>Tabel:</span>
          </div>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              insertTableRow(true);
            }}
            className="ms-word-table-dock-btn"
            title="Tambah Baris Baru di Bawah (Bisa juga tekan Tab pada sel terakhir)"
          >
            <Rows size={13} />
            <span>+ Baris</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              insertTableColumn(true);
            }}
            className="ms-word-table-dock-btn"
            title="Tambah Kolom Baru di Kanan"
          >
            <Columns size={13} />
            <span>+ Kolom</span>
          </button>

          <div className="ms-word-table-dock-divider" />

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              adjustActiveColumnWidth(5);
            }}
            className="ms-word-table-dock-btn"
            title="Perlebar Kolom Aktif (+5%)"
          >
            <span>Kolom +</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              adjustActiveColumnWidth(-5);
            }}
            className="ms-word-table-dock-btn"
            title="Persempit Kolom Aktif (-5%)"
          >
            <span>Kolom -</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              distributeColumnsEvenly();
            }}
            className="ms-word-table-dock-btn"
            title="Bagi Rata Lebar Seluruh Kolom"
          >
            <Grid size={13} />
            <span>Bagi Rata</span>
          </button>

          <div className="ms-word-table-dock-divider" />

          {/* Move cell text buttons */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              moveCellText("left");
            }}
            className="ms-word-table-dock-btn"
            title="Pindahkan / Tukar Tulisan Sel ke Kiri"
          >
            <ArrowLeft size={13} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              moveCellText("right");
            }}
            className="ms-word-table-dock-btn"
            title="Pindahkan / Tukar Tulisan Sel ke Kanan"
          >
            <ArrowRight size={13} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              moveCellText("up");
            }}
            className="ms-word-table-dock-btn"
            title="Pindahkan / Tukar Tulisan Sel ke Atas"
          >
            <ArrowUp size={13} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              moveCellText("down");
            }}
            className="ms-word-table-dock-btn"
            title="Pindahkan / Tukar Tulisan Sel ke Bawah"
          >
            <ArrowDown size={13} />
          </button>

          <div className="ms-word-table-dock-divider" />

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              deleteTableRow();
            }}
            className="ms-word-table-dock-btn danger"
            title="Hapus Baris Ini"
          >
            <Trash2 size={13} />
            <span>Hapus Baris</span>
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              deleteTableColumn();
            }}
            className="ms-word-table-dock-btn danger"
            title="Hapus Kolom Ini"
          >
            <Trash2 size={13} />
            <span>Hapus Kolom</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("Table")}
            className="ms-word-table-dock-btn"
            style={{ background: "#0284c7", borderColor: "#38bdf8", color: "#ffffff", fontWeight: 700 }}
            title="Buka Menu Lengkap Tata Letak Tabel di Ribbon"
          >
            <span>Alat Lengkap ⚙️</span>
          </button>
        </div>
      )}
    </div>
  );
};
