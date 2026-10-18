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
} from "lucide-react";
import "./ms-word-ribbon.css";

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
}) => {
  const hasUserEditedRef = useRef<boolean>(false);
  const autoSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Setiap elemen array mewakili HTML isi dari 1 halaman body (mulai Halaman 4 dst.)
  const [bodyPagesHtml, setBodyPagesHtml] = useState<string[]>(() => {
    // Try to load any previously auto-saved body pages from localStorage
    try {
      const draft = localStorage.getItem("nbe_doc_autosave_latest");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.bodyPagesHtml && Array.isArray(parsed.bodyPagesHtml) && parsed.bodyPagesHtml.length > 0) {
          hasUserEditedRef.current = true;
          return parsed.bodyPagesHtml;
        }
      }
    } catch (e) {}

    return initialHtmlPages && initialHtmlPages.length > 0
      ? initialHtmlPages
      : ["<p style='text-align: justify; font-size: 10.5pt; font-family: Arial;'>1.0\tOBJECTIVE</p>"];
  });

  // Only sync initialHtmlPages if user has NOT yet made any edits
  useEffect(() => {
    if (hasUserEditedRef.current) return;
    if (initialHtmlPages && initialHtmlPages.length > 0) {
      setBodyPagesHtml(initialHtmlPages);
    }
  }, [initialHtmlPages]);

  const [activeTab, setActiveTab] = useState<"Home" | "Insert" | "Layout" | "View">("Home");
  const [currentFontFamily, setCurrentFontFamily] = useState<string>("Arial");
  const [currentFontSizePt, setCurrentFontSizePt] = useState<number>(10.5);
  const [currentAlign, setCurrentAlign] = useState<"left" | "center" | "right" | "justify">("justify");
  const [activePageIdx, setActivePageIdx] = useState<number>(0);
  const [highlightColor, setHighlightColor] = useState<string>("#ffff00");
  const [textColor, setTextColor] = useState<string>("#000000");
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [saveToast, setSaveToast] = useState<string | null>(null);

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
  };

  // ============================================================================
  // MESIN AUTO-PAGINATION
  // ============================================================================
  const runAutoPaginationPass = useCallback(() => {
    let domChanged = false;
    const currentContainers = pageRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (currentContainers.length === 0) return;

    // A. Overflow check
    for (let i = 0; i < currentContainers.length; i++) {
      const container = currentContainers[i];
      if (container.scrollHeight > MAX_BODY_HEIGHT_PX && container.children.length > 1) {
        const overflowingNodes: string[] = [];
        while (container.scrollHeight > MAX_BODY_HEIGHT_PX && container.children.length > 1) {
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
      {/* ========================================================================
          MS WORD 365 MODERN RIBBON BAR (MUNCUL KETIKA MODE EDIT AKTIF)
         ======================================================================== */}
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
              { id: "View", label: "Tampilan (View)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`ms-word-tab ${activeTab === tab.id ? "active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 3. RIBBON COMMAND BODY */}
          <div className="ms-word-ribbon-body">
            {/* ================= TAB BERANDA (HOME) ================= */}
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
                          document.execCommand("outdent");
                        }}
                        className="ms-word-tool-btn"
                        title="Kurangi Indentasi (Decrease Indent)"
                      >
                        <Outdent size={15} />
                      </button>

                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          document.execCommand("indent");
                        }}
                        className="ms-word-tool-btn"
                        title="Tambah Indentasi (Increase Indent)"
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

            {/* ================= TAB SISIPKAN (INSERT) ================= */}
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
                      <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>—</span>
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

            {/* ================= TAB TATA LETAK (LAYOUT) ================= */}
            {activeTab === "Layout" && (
              <>
                {/* KONTROL UKURAN TABEL KOP SURAT */}
                <div className="ms-word-group">
                  <div className="ms-word-group-content" style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem" }}>
                      <span style={{ fontWeight: 600, minWidth: "95px" }}>Lebar Logo Kop:</span>
                      {[16, 20, 25, 30].map((w) => (
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

            {/* ================= TAB TAMPILAN (VIEW) ================= */}
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

          {/* 4. HORIZONTAL RULER */}
          {showRuler && (
            <div className="ms-word-ruler">
              <div className="ms-word-ruler-track">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((cm) => (
                  <div key={cm} className="ms-word-ruler-mark">
                    <span>{cm}</span>
                    <div className="ms-word-ruler-tick" />
                  </div>
                ))}
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

      {/* ========================================================================
          KANVAS DOKUMEN A4
         ======================================================================== */}
      <div
        id="nbe-single-a4-preview-canvas"
        className="a4-print-container"
        style={{
          padding: "2rem 1rem",
          background: "var(--bg-tertiary, #e2e8f0)",
          overflowY: "auto",
          maxHeight: "950px",
          transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
          transformOrigin: "top center",
          transition: "transform 0.2s ease",
        }}
      >
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
              style={a4PageStyle}
              id={`nbe-page-${pageNum}`}
              className={`a4-page-preview a4-print-page ${!isPageVisible ? "screen-hidden" : ""}`}
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
                    }
                  }}
                  style={{
                    minHeight: `${MAX_BODY_HEIGHT_PX}px`,
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
                <span>PT Nirwana Bhumi Energy | Corporate Standard Document</span>
                <span>
                  Page {4 + idx} of {totalDocumentPages}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
