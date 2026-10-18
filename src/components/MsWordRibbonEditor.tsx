import React, { useState, useRef, useEffect, useCallback } from "react";

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
  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0,0,0,0.06)",
  borderRadius: "4px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  border: "1px solid #e2e8f0",
};

export interface MsWordEditorProps {
  isEditing: boolean;
  onToggleEdit: () => void;
  onSaveDocument: (updatedHtmlPages: string[]) => void;
  initialHtmlPages: string[];
  // Render Kop Header & Cover yang sudah diisi otomatis oleh sistem (Dibiarkan & Terjaga)
  renderSystemCoverPage: () => React.ReactNode;
  renderSystemRevisionPage: (totalPages: number) => React.ReactNode;
  renderSystemTocPage: (totalPages: number) => React.ReactNode;
  renderRunningKopHeader: () => React.ReactNode;
  activePageTab?: 'all' | number;
}

export const MsWordRibbonEditor: React.FC<MsWordEditorProps> = ({
  isEditing,
  onToggleEdit,
  onSaveDocument,
  initialHtmlPages,
  renderSystemCoverPage,
  renderSystemRevisionPage,
  renderSystemTocPage,
  renderRunningKopHeader,
  activePageTab = 'all',
}) => {
  // Setiap elemen array mewakili HTML isi dari 1 halaman body (mulai Halaman 4 dst.)
  const [bodyPagesHtml, setBodyPagesHtml] = useState<string[]>(
    initialHtmlPages && initialHtmlPages.length > 0
      ? initialHtmlPages
      : ["<p style='text-align: justify; font-size: 10.5pt; font-family: Arial;'>1.0\tOBJECTIVE</p>"]
  );

  // Update bodyPagesHtml saat initialHtmlPages berubah dari luar (misal berganti dokumen)
  useEffect(() => {
    if (initialHtmlPages && initialHtmlPages.length > 0) {
      setBodyPagesHtml(initialHtmlPages);
    }
  }, [initialHtmlPages]);

  const [activeTab, setActiveTab] = useState<"Home" | "Insert" | "Layout" | "Review" | "View">("Home");
  const [currentFontFamily, setCurrentFontFamily] = useState<string>("Arial");
  const [currentFontSizePt, setCurrentFontSizePt] = useState<number>(10.5);
  const [currentAlign, setCurrentAlign] = useState<"left" | "center" | "right" | "justify">("justify");
  const [activePageIdx, setActivePageIdx] = useState<number>(0);
  const [formatPainterStyle, setFormatPainterStyle] = useState<{
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    color?: string;
  } | null>(null);

  // Refs ke setiap container isi halaman A4 untuk menghitung overflow & menghapus halaman kosong
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const savedRangeRef = useRef<Range | null>(null);

  // Simpan posisi kursor/seleksi terakhir sebelum user mengklik tombol di Ribbon Bar
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

  // Deteksi format (Font Size & Alignment) pada posisi kursor saat ini secara real-time
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
        const ptSize = Math.round((pxSize * 0.75) * 2) / 2;
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
  // 1. MESIN AUTO-PAGINATION (AUTO-OVERFLOW KE HALAMAN BARU & AUTO-HAPUS HALAMAN KOSONG)
  // ============================================================================
  const runAutoPaginationPass = useCallback(() => {
    let domChanged = false;
    const currentContainers = pageRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (currentContainers.length === 0) return;

    // A. Cek Overflow: Jika tinggi isi halaman melebihi batas kertas A4, pindahkan elemen bawah ke halaman berikutnya
    for (let i = 0; i < currentContainers.length; i++) {
      const container = currentContainers[i];
      if (container.scrollHeight > MAX_BODY_HEIGHT_PX && container.children.length > 1) {
        const overflowingNodes: string[] = [];
        while (container.scrollHeight > MAX_BODY_HEIGHT_PX && container.children.length > 1) {
          const lastChild = container.lastElementChild as HTMLElement;
          if (!lastChild) break;
          overflowingNodes.unshift(lastChild.outerHTML);
          container.removeChild(lastChild);
        }

        if (overflowingNodes.length > 0) {
          domChanged = true;
          const movedHtml = overflowingNodes.join("");
          if (i + 1 < currentContainers.length) {
            // Masukkan ke awal halaman berikutnya yang sudah ada
            currentContainers[i + 1].innerHTML = movedHtml + currentContainers[i + 1].innerHTML;
          } else {
            // Buat halaman baru secara otomatis dengan Header & Footer yang sama
            setBodyPagesHtml((prev) => {
              const updated = currentContainers.map((c) => c.innerHTML);
              updated.push(movedHtml);
              return updated;
            });
            return;
          }
        }
      }
    }

    // B. Cek Halaman Kosong: Jika halaman kosong dan ada lebih dari 1 halaman isi, otomatis hapus halaman tersebut
    if (currentContainers.length > 1) {
      const nonEmptyPages: string[] = [];
      let removedAnyEmpty = false;

      currentContainers.forEach((container, idx) => {
        const plainText = container.innerText.replace(/\u200B/g, "").trim();
        const hasMediaOrTable = container.querySelector("table, img, hr") !== null;
        if (plainText === "" && !hasMediaOrTable && currentContainers.length > 1) {
          removedAnyEmpty = true;
          // Pindahkan fokus kursor ke halaman sebelumnya
          const prevContainer = currentContainers[Math.max(0, idx - 1)];
          if (prevContainer) {
            prevContainer.focus();
          }
        } else {
          nonEmptyPages.push(container.innerHTML);
        }
      });

      if (removedAnyEmpty) {
        setBodyPagesHtml(nonEmptyPages.length > 0 ? nonEmptyPages : ["<p><br/></p>"]);
        return;
      }
    }

    if (domChanged) {
      setBodyPagesHtml(currentContainers.map((c) => c.innerHTML));
    }
  }, []);

  // ============================================================================
  // 2. FITUR RATA KIRI, RATA TENGAH, RATA KANAN, & RATA KIRI-KANAN (JUSTIFY)
  // ============================================================================
  const applyAlignment = (alignment: "left" | "center" | "right" | "justify") => {
    restoreSelection();
    setCurrentAlign(alignment);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    const activeContainer = pageRefs.current[activePageIdx];
    if (!activeContainer) return;

    // Cari seluruh elemen blok (<p>, <div>, <h1>-<h6>, <li>, <td>) yang bersinggungan dengan seleksi kursor
    const blockElements = activeContainer.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6, li, td");
    let matchedBlock = false;

    blockElements.forEach((el) => {
      if (sel.containsNode(el, true) || el.contains(range.commonAncestorContainer)) {
        (el as HTMLElement).style.textAlign = alignment;
        matchedBlock = true;
      }
    });

    if (!matchedBlock) {
      let parent: Node | null = range.commonAncestorContainer;
      while (parent && parent !== activeContainer) {
        if (parent instanceof HTMLElement && ["P", "DIV", "H1", "H2", "H3", "H4", "LI", "TD"].includes(parent.tagName)) {
          parent.style.textAlign = alignment;
          matchedBlock = true;
          break;
        }
        parent = parent.parentNode;
      }
    }

    // Fallback jika teks belum terbungkus tag blok spesifik
    if (!matchedBlock) {
      const cmdMap = {
        left: "justifyLeft",
        center: "justifyCenter",
        right: "justifyRight",
        justify: "justifyFull",
      };
      document.execCommand(cmdMap[alignment], false);
    }

    saveCurrentSelection();
  };

  // ============================================================================
  // 3. FITUR UKURAN FONT PRESISI (DALAM SATUAN PT + TOMBOL A^ DAN Av)
  // ============================================================================
  const applyFontSizePt = (newSizePt: number) => {
    const clampedSize = Math.max(6, Math.min(72, newSizePt));
    restoreSelection();
    setCurrentFontSizePt(clampedSize);

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if (!range.collapsed) {
      // Jika ada teks yang diblok, terapkan ukuran font tepat ke teks yang diblok
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
        // Jika seleksi melintasi beberapa paragraf, ubah ukuran font masing-masing paragraf
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
      // Jika kursor hanya berada di dalam paragraf tanpa memblok, ubah ukuran font paragraf tersebut
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

  // Fungsi ubah jenis Font Family
  const applyFontFamily = (fontName: string) => {
    restoreSelection();
    setCurrentFontFamily(fontName);
    document.execCommand("fontName", false, fontName);
    saveCurrentSelection();
  };

  // Format Painter (Salin / Terapkan gaya font)
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
          // Ignore range error
        }
      }
      setFormatPainterStyle(null);
    }
  };

  // Change Case (Aa): Huruf Besar / Huruf Kecil / Judul
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

  // ============================================================================
  // 4. FITUR PAGE BREAK NYATA (MEMOTONG HALAMAN DI POSISI KURSOR KE HALAMAN BARU)
  // ============================================================================
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

    // Sinkronkan isi semua halaman saat ini dan sisipkan halaman baru tepat di bawah halaman aktif
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

  // Simpan seluruh perubahan dari DOM kertas A4
  const handleSaveAll = () => {
    const updatedHtmls = pageRefs.current
      .filter((el): el is HTMLDivElement => el !== null)
      .map((el) => el.innerHTML)
      .filter((html) => html.replace(/<[^>]*>/g, "").trim().length > 0);

    const finalPages = updatedHtmls.length > 0 ? updatedHtmls : bodyPagesHtml;
    setBodyPagesHtml(finalPages);
    onSaveDocument(finalPages);
  };

  const totalDocumentPages = 3 + bodyPagesHtml.length;

  return (
    <div className="w-full">
      {/* ========================================================================
          MS WORD RIBBON BAR (MUNCUL KETIKA USER MENEKAN TOMBOL EDIT)
         ======================================================================== */}
      {isEditing && (
        <div className="sticky top-2 z-50 mb-6 rounded-t-xl shadow-xl border border-slate-300 bg-[#F3F2F1] select-none no-print overflow-hidden">
          {/* 1. Top Title & Menu Bar Biru khas MS Word (#185ABD) */}
          <div className="bg-[#185ABD] text-white px-4 py-1.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveAll}
                title="Simpan Dokumen (Save)"
                className="hover:bg-white/20 p-1 rounded flex items-center gap-1 font-semibold"
              >
                💾 Simpan
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand("undo"); }}
                title="Undo (Ctrl+Z)"
                className="hover:bg-white/20 px-1.5 py-0.5 rounded"
              >
                ↩️
              </button>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); document.execCommand("redo"); }}
                title="Redo (Ctrl+Y)"
                className="hover:bg-white/20 px-1.5 py-0.5 rounded"
              >
                ↪️
              </button>
              <span className="opacity-40">|</span>
              {["File", "Home", "Insert", "Draw", "Design", "Layout", "References", "Review", "View"].map((tabName) => (
                <button
                  key={tabName}
                  type="button"
                  onClick={() => {
                    if (["Home", "Insert", "Layout", "Review", "View"].includes(tabName)) {
                      setActiveTab(tabName as any);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-t font-medium transition ${
                    activeTab === tabName
                      ? "bg-[#F3F2F1] text-[#185ABD] font-bold"
                      : "hover:bg-white/15 text-white"
                  }`}
                >
                  {tabName}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="font-semibold hidden md:inline">Document Editor — Word Mode</span>
              <button
                type="button"
                onClick={() => {
                  handleSaveAll();
                  onToggleEdit();
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded shadow"
              >
                ✓ Selesai & Simpan Edit
              </button>
            </div>
          </div>

          {/* 2. Isi Ribbon Bar (Clipboard | Font | Paragraph | Page Break | Styles) */}
          <div className="p-2.5 bg-[#F3F2F1] border-b border-slate-300 flex flex-wrap items-stretch gap-3 text-slate-800">
            {/* GRUP CLIPBOARD */}
            <div className="flex flex-col justify-between pr-3 border-r border-slate-300">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (navigator.clipboard) {
                      navigator.clipboard.readText().then((t) => document.execCommand("insertText", false, t));
                    }
                  }}
                  className="flex flex-col items-center px-2 py-1 hover:bg-slate-200 rounded text-xs"
                >
                  <span className="text-lg">📋</span>
                  <span>Paste</span>
                </button>
                <div className="flex flex-col gap-0.5 text-[11px]">
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand("cut"); }} className="hover:bg-slate-200 px-1.5 py-0.5 rounded text-left">✂️ Cut</button>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand("copy"); }} className="hover:bg-slate-200 px-1.5 py-0.5 rounded text-left">📄 Copy</button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleToggleFormatPainter(); }}
                    className={`hover:bg-slate-200 px-1.5 py-0.5 rounded text-left flex items-center gap-1 ${formatPainterStyle ? 'bg-sky-200 text-sky-800 font-bold' : ''}`}
                    title="Format Painter (Salin / Terapkan Format Teks)"
                  >
                    🖌️ Painter
                  </button>
                </div>
              </div>
              <span className="text-[10px] text-center text-slate-500 mt-1">Clipboard</span>
            </div>

            {/* GRUP FONT (Font Family, Ukuran Font Pt, A^, Av, Change Case, Clear, Bold, Italic, Underline, Strikethrough, Sub/Superscript, Color) */}
            <div className="flex flex-col justify-between pr-3 border-r border-slate-300">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  {/* Dropdown Jenis Font */}
                  <select
                    value={currentFontFamily}
                    onMouseDown={saveCurrentSelection}
                    onChange={(e) => applyFontFamily(e.target.value)}
                    className="border border-slate-300 bg-white px-2 py-1 text-xs rounded w-32 focus:outline-none"
                  >
                    {FONT_FAMILIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>

                  {/* Dropdown Ukuran Font (Berfungsi Nyata dalam satuan Pt) */}
                  <select
                    value={currentFontSizePt}
                    onMouseDown={saveCurrentSelection}
                    onChange={(e) => applyFontSizePt(parseFloat(e.target.value))}
                    className="border border-slate-300 bg-white px-1.5 py-1 text-xs rounded w-16 focus:outline-none font-semibold"
                  >
                    {FONT_SIZES_PT.map((sz) => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>

                  {/* Tombol Perbesar Font (A^) & Perkecil Font (Av) */}
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelection(); applyFontSizePt(currentFontSizePt + 1); }}
                    title="Increase Font Size (A^)"
                    className="px-2 py-1 hover:bg-slate-200 border border-transparent hover:border-slate-300 rounded text-xs font-bold"
                  >
                    A▲
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelection(); applyFontSizePt(currentFontSizePt - 1); }}
                    title="Decrease Font Size (Av)"
                    className="px-2 py-1 hover:bg-slate-200 border border-transparent hover:border-slate-300 rounded text-[11px] font-bold"
                  >
                    A▼
                  </button>

                  {/* Change Case (Aa) */}
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleChangeCase(); }}
                    title="Change Case (Aa: Huruf Besar / Huruf Kecil / Judul)"
                    className="px-1.5 py-1 hover:bg-slate-200 rounded text-xs font-semibold"
                  >
                    Aa
                  </button>

                  {/* Clear Formatting */}
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand("removeFormat"); }}
                    title="Clear All Formatting"
                    className="px-1.5 py-1 hover:bg-slate-200 rounded text-xs"
                  >
                    🧹
                  </button>
                </div>

                {/* Baris Bawah Grup Font: B, I, U, abc, x2, x^2, Highlight, Font Color */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand("bold"); }}
                    className="w-7 h-7 hover:bg-slate-200 rounded font-bold text-xs"
                    title="Bold (Ctrl+B)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand("italic"); }}
                    className="w-7 h-7 hover:bg-slate-200 rounded italic font-serif text-xs"
                    title="Italic (Ctrl+I)"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand("underline"); }}
                    className="w-7 h-7 hover:bg-slate-200 rounded underline text-xs"
                    title="Underline (Ctrl+U)"
                  >
                    U
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand("strikeThrough"); }}
                    className="w-7 h-7 hover:bg-slate-200 rounded line-through text-xs"
                    title="Strikethrough (abc)"
                  >
                    abc
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand("subscript"); }}
                    className="w-7 h-7 hover:bg-slate-200 rounded text-xs"
                    title="Subscript (x₂)"
                  >
                    x₂
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand("superscript"); }}
                    className="w-7 h-7 hover:bg-slate-200 rounded text-xs"
                    title="Superscript (x²)"
                  >
                    x²
                  </button>

                  {/* Highlight Color */}
                  <div className="flex items-center gap-0.5 pl-1" title="Highlight Color (Warna Stabilo)">
                    <span className="text-[11px]">🖍️</span>
                    <input
                      type="color"
                      defaultValue="#ffff00"
                      onChange={(e) => { restoreSelection(); document.execCommand("hiliteColor", false, e.target.value); }}
                      className="w-5 h-5 cursor-pointer border-0 bg-transparent rounded"
                    />
                  </div>

                  {/* Font Color */}
                  <div className="flex items-center gap-0.5 pl-1" title="Font Color (Warna Teks A)">
                    <span className="text-xs font-bold text-red-600">A</span>
                    <input
                      type="color"
                      defaultValue="#000000"
                      onChange={(e) => { restoreSelection(); document.execCommand("foreColor", false, e.target.value); }}
                      className="w-5 h-5 cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-center text-slate-500 mt-1">Font</span>
            </div>

            {/* GRUP PARAGRAPH (Rata Kiri, Rata Tengah, Rata Kanan, Rata Kiri-Kanan / Justify, Bullet, Indent, Line Spacing) */}
            <div className="flex flex-col justify-between pr-3 border-r border-slate-300">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand("insertUnorderedList"); }}
                    title="Bullets"
                    className="px-2 py-1 hover:bg-slate-200 rounded text-xs"
                  >
                    •≡
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand("insertOrderedList"); }}
                    title="Numbering"
                    className="px-2 py-1 hover:bg-slate-200 rounded text-xs"
                  >
                    1≡
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand("outdent"); }}
                    title="Decrease Indent"
                    className="px-2 py-1 hover:bg-slate-200 rounded text-xs"
                  >
                    ⇤
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); document.execCommand("indent"); }}
                    title="Increase Indent"
                    className="px-2 py-1 hover:bg-slate-200 rounded text-xs"
                  >
                    ⇥
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
                    title="Line Spacing (Jarak Baris)"
                    className="border border-slate-300 bg-white px-1 py-0.5 text-xs rounded focus:outline-none"
                    defaultValue="1.6"
                  >
                    <option value="1.0">1.0</option>
                    <option value="1.15">1.15</option>
                    <option value="1.5">1.5</option>
                    <option value="1.6">1.6</option>
                    <option value="2.0">2.0</option>
                  </select>
                </div>

                {/* 4 Tombol Perataan Paragraf (Berfungsi 100% Nyata) */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelection(); applyAlignment("left"); }}
                    title="Rata Kiri (Align Left)"
                    className={`px-2 py-1 rounded text-xs font-semibold border ${
                      currentAlign === "left"
                        ? "bg-slate-300 border-slate-400 text-slate-900"
                        : "border-transparent hover:bg-slate-200"
                    }`}
                  >
                    ⫷ Kiri
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelection(); applyAlignment("center"); }}
                    title="Rata Tengah (Center)"
                    className={`px-2 py-1 rounded text-xs font-semibold border ${
                      currentAlign === "center"
                        ? "bg-slate-300 border-slate-400 text-slate-900"
                        : "border-transparent hover:bg-slate-200"
                    }`}
                  >
                    ⫸ Tengah
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelection(); applyAlignment("right"); }}
                    title="Rata Kanan (Align Right)"
                    className={`px-2 py-1 rounded text-xs font-semibold border ${
                      currentAlign === "right"
                        ? "bg-slate-300 border-slate-400 text-slate-900"
                        : "border-transparent hover:bg-slate-200"
                    }`}
                  >
                    ⫸ Kanan
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); saveCurrentSelection(); applyAlignment("justify"); }}
                    title="Rata Kiri-Kanan (Justify)"
                    className={`px-2 py-1 rounded text-xs font-semibold border ${
                      currentAlign === "justify"
                        ? "bg-slate-300 border-slate-400 text-slate-900"
                        : "border-transparent hover:bg-slate-200"
                    }`}
                  >
                    ☰ Justify
                  </button>
                </div>
              </div>
              <span className="text-[10px] text-center text-slate-500 mt-1">Paragraph</span>
            </div>

            {/* GRUP PAGE BREAK & HALAMAN */}
            <div className="flex flex-col justify-between pr-3 border-r border-slate-300">
              <div className="flex items-center gap-2 h-full">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    saveCurrentSelection();
                    handleInsertPageBreak();
                  }}
                  title="Potong Halaman di Posisi Kursor ke Halaman Baru (Ctrl+Enter)"
                  className="px-3 py-2 bg-white hover:bg-sky-50 border border-slate-300 rounded-lg shadow-sm flex flex-col items-center justify-center text-xs font-bold text-[#185ABD] transition hover:scale-105 active:scale-95"
                >
                  <span className="text-base">📄✂️</span>
                  <span>Page Break</span>
                </button>
              </div>
              <span className="text-[10px] text-center text-slate-500 mt-1">Pages</span>
            </div>

            {/* GRUP STYLES CEPAT KHAS MS WORD */}
            <div className="flex flex-col justify-between">
              <div className="flex items-center gap-1.5">
                {[
                  { label: "Normal", size: 10.5, align: "justify" as const },
                  { label: "No Spacing", size: 10, align: "left" as const },
                  { label: "Heading 1", size: 12, align: "left" as const },
                  { label: "Heading 2", size: 11, align: "left" as const },
                  { label: "Title", size: 18, align: "center" as const },
                  { label: "Subtitle", size: 11, align: "left" as const },
                ].map((st) => (
                  <button
                    key={st.label}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveCurrentSelection();
                      applyFontSizePt(st.size);
                      applyAlignment(st.align);
                    }}
                    className="bg-white border border-slate-300 hover:border-sky-500 px-2.5 py-1.5 rounded flex flex-col items-center transition hover:bg-slate-50"
                  >
                    <span className="text-xs font-semibold text-slate-800">AaBbCc</span>
                    <span className="text-[10px] text-slate-500">{st.label}</span>
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-center text-slate-500 mt-1">Styles</span>
            </div>
          </div>

          {/* 3. Horizontal Ruler (Penggaris Kertas MS Word 2 - 18 cm) */}
          <div className="bg-[#E1DFDD] py-1 px-6 border-b border-slate-300 flex items-center justify-center">
            <div className="w-[210mm] max-w-full bg-white h-4 border border-slate-400 flex items-center justify-between px-8 text-[9px] font-mono text-slate-500 shadow-inner">
              {[2, 4, 6, 8, 10, 12, 14, 16, 18].map((cm) => (
                <span key={cm} className="relative flex flex-col items-center">
                  <span>{cm}</span>
                  <span className="h-1 w-px bg-slate-400 -mt-0.5" />
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          KANVAS DOKUMEN A4 (HAL 1 COVER, HAL 2 REVISI, HAL 3 TOC TERJAGA SISTEM;
          HAL 4+ AUTO-PAGINATION & DAPAT DIEDIT BEBAS DENGAN RIBBON BAR)
         ======================================================================== */}
      <div
        id="nbe-single-a4-preview-canvas"
        className="a4-print-container space-y-8"
        style={{
          padding: "2.5rem 1rem",
          background: "var(--bg-tertiary, #e2e8f0)",
          overflowY: "auto",
          maxHeight: "900px",
        }}
      >
        {/* Halaman 1, 2, 3 yang diisi otomatis oleh sistem dibiarkan tetap terjaga */}
        {renderSystemCoverPage()}
        {renderSystemRevisionPage(totalDocumentPages)}
        {renderSystemTocPage(totalDocumentPages)}

        {/* Halaman 4+: Halaman Isi Dinamis dengan Auto-Overflow & Auto-Delete Empty Page */}
        {bodyPagesHtml.map((pageHtml, idx) => {
          const pageNum = 4 + idx;
          const isPageVisible = !activePageTab || activePageTab === 'all' || activePageTab === pageNum;
          return (
            <div
              key={idx}
              style={a4PageStyle}
              id={`nbe-page-${pageNum}`}
              className={`a4-page-preview a4-print-page flex flex-col justify-between ${
                !isPageVisible ? 'screen-hidden' : ''
              }`}
            >
            <div>
              {/* Kop Header Otomatis Sama dengan Halaman Sebelumnya (Terkunci/Terjaga Sistem contentEditable=false) */}
              <div contentEditable={false} className="select-none">
                {renderRunningKopHeader()}
              </div>

              {/* Area Isi Kertas yang Dapat Diedit dengan MS Word Ribbon Bar */}
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
                }}
                onKeyUp={() => {
                  saveCurrentSelection();
                  handleSelectionChange();
                  runAutoPaginationPass();
                }}
                onKeyDown={(e) => {
                  // Pintasan Ctrl + Enter untuk langsung membuat Page Break
                  if (e.ctrlKey && e.key === "Enter") {
                    e.preventDefault();
                    saveCurrentSelection();
                    handleInsertPageBreak();
                  }
                }}
                style={{
                  minHeight: `${MAX_BODY_HEIGHT_PX}px`,
                  fontFamily: currentFontFamily,
                }}
                className={`outline-none text-[#3B3838] leading-relaxed ${
                  isEditing ? "ring-1 ring-sky-300/70 rounded p-1" : ""
                }`}
              />
            </div>

            {/* Footer Nomor Halaman Otomatis (Terkunci / Terjaga Sistem) */}
            <div
              contentEditable={false}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #e2e8f0",
                paddingTop: "0.5rem",
                fontSize: "8pt",
                color: "#94a3b8",
              }}
              className="select-none"
            >
              <span>PT Nirwana Bhumi Energy | Corporate Standard Document</span>
              <span>Page {4 + idx} of {totalDocumentPages}</span>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};
