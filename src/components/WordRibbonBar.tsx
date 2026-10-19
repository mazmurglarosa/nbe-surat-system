import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Copy,
  Clipboard,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Table as TableIcon,
  Search,
  Save,
  X,
  Undo2,
  Redo2,
  Lightbulb,
  Share2,
  Check,
  ChevronDown,
  Palette,
  Eraser,
  Heading1,
  Heading2,
  Type,
  FileText,
  Minus,
} from 'lucide-react';

export interface WordRibbonBarProps {
  onSave?: () => void;
  onCancel?: () => void;
  activeFontFamily?: string;
  activeFontSize?: string;
  onInsertTable?: () => void;
  onAddRow?: () => void;
  onDeleteRow?: () => void;
}

export const WordRibbonBar: React.FC<WordRibbonBarProps> = ({
  onSave,
  onCancel,
  activeFontFamily = 'Arial',
  activeFontSize = '11',
  onInsertTable,
  onAddRow,
  onDeleteRow,
}) => {
  const [activeTab, setActiveTab] = useState<'Home' | 'Insert' | 'Layout' | 'View'>('Home');
  const [fontFamily, setFontFamily] = useState<string>(activeFontFamily);
  const [fontSize, setFontSize] = useState<string>(activeFontSize);
  const [fontColor, setFontColor] = useState<string>('#000000');
  const [highlightColor, setHighlightColor] = useState<string>('#ffff00');
  const [lineSpacing, setLineSpacing] = useState<string>('1.15');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState<boolean>(false);
  const [showTableMenu, setShowTableMenu] = useState<boolean>(false);
  const [showFindModal, setShowFindModal] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 2500);
  };

  // Accessible keyboard Escape handler for find & replace modal (R-32 Accessibility)
  useEffect(() => {
    if (!showFindModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFindModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFindModal]);

  const exec = (command: string, value: string | undefined = undefined) => {
    try {
      document.execCommand(command, false, value);
    } catch (e) {
      console.warn('execCommand failed:', e);
    }
  };

  const handleFontChange = (newFont: string) => {
    setFontFamily(newFont);
    exec('fontName', newFont);
  };

  const handleFontSizeChange = (newSize: string) => {
    setFontSize(newSize);
    // document.execCommand('fontSize') accepts 1-7, but we can set direct font size on selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        const span = document.createElement('span');
        span.style.fontSize = `${newSize}pt`;
        range.surroundContents(span);
        return;
      }
    }
    exec('fontSize', '3');
  };

  const handleFontGrow = () => {
    const current = parseFloat(fontSize) || 11;
    const next = current + 1;
    handleFontSizeChange(String(next));
  };

  const handleFontShrink = () => {
    const current = parseFloat(fontSize) || 11;
    const next = Math.max(8, current - 1);
    handleFontSizeChange(String(next));
  };

  const handleApplyCase = (type: 'upper' | 'lower' | 'title') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const text = selection.toString();
    if (!text) return;

    let transformed = text;
    if (type === 'upper') transformed = text.toUpperCase();
    if (type === 'lower') transformed = text.toLowerCase();
    if (type === 'title') {
      transformed = text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
    exec('insertText', transformed);
  };

  const handleStyleClick = (styleType: 'normal' | 'noSpacing' | 'h1' | 'h2' | 'title' | 'subtitle' | 'subtleEm') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    const span = document.createElement('span');
    if (styleType === 'normal') {
      span.style.fontSize = '10.5pt';
      span.style.fontFamily = 'Arial, sans-serif';
      span.style.fontWeight = 'normal';
      span.style.color = '#3B3838';
      span.style.lineHeight = '1.5';
    } else if (styleType === 'noSpacing') {
      span.style.fontSize = '10pt';
      span.style.fontFamily = 'Arial, sans-serif';
      span.style.fontWeight = 'normal';
      span.style.color = '#000000';
      span.style.lineHeight = '1.0';
    } else if (styleType === 'h1') {
      span.style.fontSize = '14pt';
      span.style.fontFamily = 'Arial, sans-serif';
      span.style.fontWeight = 'bold';
      span.style.color = '#2f5496';
    } else if (styleType === 'h2') {
      span.style.fontSize = '12pt';
      span.style.fontFamily = 'Arial, sans-serif';
      span.style.fontWeight = 'bold';
      span.style.color = '#2f5496';
    } else if (styleType === 'title') {
      span.style.fontSize = '18pt';
      span.style.fontFamily = 'Arial, sans-serif';
      span.style.fontWeight = 'bold';
      span.style.color = '#000000';
    } else if (styleType === 'subtitle') {
      span.style.fontSize = '11pt';
      span.style.fontFamily = 'Arial, sans-serif';
      span.style.fontStyle = 'italic';
      span.style.color = '#595959';
    } else if (styleType === 'subtleEm') {
      span.style.fontSize = '10pt';
      span.style.fontFamily = 'Arial, sans-serif';
      span.style.fontStyle = 'italic';
      span.style.color = '#595959';
    }

    if (!range.collapsed) {
      try {
        range.surroundContents(span);
        showNotice(`Gaya "${styleType.toUpperCase()}" berhasil diterapkan.`);
      } catch {
        exec('formatBlock', styleType === 'h1' ? 'h1' : styleType === 'h2' ? 'h2' : 'p');
      }
    } else {
      exec('formatBlock', styleType === 'h1' ? 'h1' : styleType === 'h2' ? 'h2' : 'p');
    }
  };

  const handleFindReplace = () => {
    if (!findQuery) return;
    const editableElements = document.querySelectorAll('[contenteditable="true"]');
    let replacedCount = 0;
    editableElements.forEach((el) => {
      if (el.innerHTML.includes(findQuery)) {
        el.innerHTML = el.innerHTML.replaceAll(findQuery, replaceQuery);
        replacedCount++;
      }
    });
    showNotice(replacedCount > 0 ? `Berhasil mengganti ${replacedCount} kemunculan teks.` : 'Teks tidak ditemukan.');
    setShowFindModal(false);
  };

  return (
    <div
      className="word-ribbon-container no-print"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%',
        boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif",
        userSelect: 'none',
        marginBottom: '1rem',
      }}
    >
      {/* 1. TOP TITLE / TAB BAR (Classic Word Deep Blue #2b579a) */}
      <div
        style={{
          background: '#2b579a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0.5rem',
          height: '38px',
          borderBottom: '1px solid #1f4788',
        }}
      >
        {/* Left: File Button & Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {/* File Tab Button */}
          <button
            type="button"
            onClick={() => showNotice('Menu Dokumen Microsoft Word NBE Aktif')}
            style={{
              background: '#19478a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '12px',
              padding: '0 14px',
              height: '100%',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              letterSpacing: '0.02em',
            }}
          >
            File
          </button>

          {/* Main Tabs */}
          {(['Home', 'Insert', 'Layout', 'View'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  background: isActive ? '#f3f2f1' : 'transparent',
                  color: isActive ? '#106ebe' : '#ffffff',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '12px',
                  padding: '0 14px',
                  height: '100%',
                  border: 'none',
                  cursor: 'pointer',
                  borderTop: isActive ? '2px solid #106ebe' : 'none',
                  transition: 'background 0.15s ease',
                }}
              >
                {tab}
              </button>
            );
          })}
          {/* Additional decorative Word tabs */}
          {['Draw', 'Design', 'References', 'Mailings', 'Review', 'Help', 'Acrobat'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => showNotice(`Tab ${tab} Microsoft Word NBE`)}
              className="hidden lg:inline-block"
              style={{
                background: 'transparent',
                color: '#e2e8f0',
                fontWeight: 500,
                fontSize: '12px',
                padding: '0 10px',
                height: '100%',
                border: 'none',
                cursor: 'pointer',
                opacity: 0.85,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Center: "Tell me what you want to do" Search Box */}
        <div
          className="hidden md:flex items-center"
          style={{
            background: 'rgba(255, 255, 255, 0.18)',
            color: '#ffffff',
            borderRadius: '4px',
            padding: '2px 10px',
            fontSize: '12px',
            width: '260px',
            gap: '6px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
          }}
        >
          <Lightbulb size={13} color="#fef08a" />
          <input
            type="text"
            placeholder="Tell me what you want to do"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '11px',
              width: '100%',
            }}
          />
        </div>

        {/* Right: Quick Action Controls (Save / Cancel / Share) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            onClick={() => exec('undo')}
            title="Undo (Ctrl+Z)"
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
          >
            <Undo2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => exec('redo')}
            title="Redo (Ctrl+Y)"
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
          >
            <Redo2 size={14} />
          </button>

          {/* Share Button (Matching user screenshot) */}
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Dokumen Resmi NBE', url: window.location.href }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                showNotice('Tautan dokumen berhasil disalin.');
              }
            }}
            style={{
              background: 'transparent',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: '3px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Share Document"
          >
            <Share2 size={12} />
            <span>Share</span>
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '3px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
              title="Batalkan proses edit"
            >
              <X size={12} />
              <span>Batal</span>
            </button>
          )}

          {onSave && (
            <button
              type="button"
              onClick={onSave}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '3px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}
              title="Simpan seluruh hasil ketikan & format ke berkas dokumen"
            >
              <Save size={13} />
              <span>Simpan Perubahan</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. RIBBON BODY (Classic Microsoft Office Ribbon Bar) */}
      <div
        style={{
          background: '#f3f2f1',
          borderBottom: '1px solid #dad9d8',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'stretch',
          gap: '8px',
          overflowX: 'auto',
          minHeight: '96px',
        }}
      >
        {activeTab === 'Home' && (
          <>
            {/* GROUP 1: CLIPBOARD */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                paddingRight: '8px',
                borderRight: '1px solid #dad9d8',
                minWidth: '100px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Large Paste Button */}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.readText().then((txt) => exec('insertText', txt)).catch(() => exec('paste'));
                  }}
                  className="word-ribbon-btn"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    background: 'transparent',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: '#201f1e',
                  }}
                  title="Paste (Ctrl+V)"
                >
                  <Clipboard size={22} color="#0078d4" />
                  <span style={{ fontSize: '10.5px', marginTop: '2px' }}>Paste</span>
                </button>

                {/* Small Cut, Copy, Format Painter Stack */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={() => exec('cut')}
                    className="word-ribbon-tool-btn"
                    title="Cut (Ctrl+X)"
                  >
                    <Scissors size={12} color="#323130" />
                    <span>Cut</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exec('copy')}
                    className="word-ribbon-tool-btn"
                    title="Copy (Ctrl+C)"
                  >
                    <Copy size={12} color="#323130" />
                    <span>Copy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => showNotice('Format Painter Aktif: Pilih teks tujuan untuk menerapkan format.')}
                    className="word-ribbon-tool-btn"
                    title="Format Painter"
                  >
                    <span style={{ fontSize: '12px' }}>🖌️</span>
                    <span>Painter</span>
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#605e5c', fontWeight: 600 }}>
                Clipboard
              </div>
            </div>

            {/* GROUP 2: FONT */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                paddingRight: '8px',
                borderRight: '1px solid #dad9d8',
              }}
            >
              {/* Row 1: Font Family, Size, Grow, Shrink, Case, Clear */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <select
                  value={fontFamily}
                  onChange={(e) => handleFontChange(e.target.value)}
                  style={{
                    height: '24px',
                    fontSize: '11px',
                    fontFamily: fontFamily,
                    border: '1px solid #8a8886',
                    borderRadius: '2px',
                    background: '#ffffff',
                    padding: '0 4px',
                    width: '125px',
                    outline: 'none',
                  }}
                  title="Font Family"
                >
                  <option value="Arial">Arial</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Segoe UI">Segoe UI</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Sunda v Unpad">Sunda v Unpad</option>
                </select>

                <select
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(e.target.value)}
                  style={{
                    height: '24px',
                    fontSize: '11px',
                    border: '1px solid #8a8886',
                    borderRadius: '2px',
                    background: '#ffffff',
                    padding: '0 2px',
                    width: '45px',
                    outline: 'none',
                  }}
                  title="Font Size (pt)"
                >
                  {['8', '9', '10', '10.5', '11', '12', '14', '16', '18', '20', '22', '24', '28', '36'].map((sz) => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleFontGrow}
                  className="word-ribbon-icon-btn"
                  title="Increase Font Size (Ctrl+Shift+>)"
                >
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>A<sup>▲</sup></span>
                </button>
                <button
                  type="button"
                  onClick={handleFontShrink}
                  className="word-ribbon-icon-btn"
                  title="Decrease Font Size (Ctrl+Shift+<)"
                >
                  <span style={{ fontSize: '11px', fontWeight: 700 }}>A<sup>▼</sup></span>
                </button>

                {/* Change Case Aa */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => handleApplyCase('upper')}
                    className="word-ribbon-icon-btn"
                    title="Change Case (UPPERCASE)"
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700 }}>Aa</span>
                  </button>
                </div>

                {/* Clear Formatting */}
                <button
                  type="button"
                  onClick={() => exec('removeFormat')}
                  className="word-ribbon-icon-btn"
                  title="Clear All Formatting"
                >
                  <Eraser size={13} color="#e11d48" />
                </button>
              </div>

              {/* Row 2: Bold, Italic, Underline, Strikethrough, Sub, Super, Highlight, Color */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '3px' }}>
                <button
                  type="button"
                  onClick={() => exec('bold')}
                  className="word-ribbon-icon-btn font-bold"
                  title="Bold (Ctrl+B)"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => exec('italic')}
                  className="word-ribbon-icon-btn italic"
                  title="Italic (Ctrl+I)"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => exec('underline')}
                  className="word-ribbon-icon-btn underline"
                  title="Underline (Ctrl+U)"
                >
                  <Underline size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => exec('strikeThrough')}
                  className="word-ribbon-icon-btn line-through"
                  title="Strikethrough"
                >
                  <Strikethrough size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => exec('subscript')}
                  className="word-ribbon-icon-btn"
                  title="Subscript (x₂)"
                >
                  <Subscript size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => exec('superscript')}
                  className="word-ribbon-icon-btn"
                  title="Superscript (x²)"
                >
                  <Superscript size={13} />
                </button>

                {/* Text Highlight Color */}
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    type="button"
                    onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                    className="word-ribbon-icon-btn"
                    title="Text Highlight Color"
                    style={{ position: 'relative' }}
                  >
                    <Highlighter size={13} color="#ca8a04" />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '4px',
                        right: '4px',
                        height: '3px',
                        background: highlightColor,
                        borderRadius: '1px',
                      }}
                    />
                  </button>
                  {showHighlightPicker && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 9999,
                        background: '#ffffff',
                        border: '1px solid #8a8886',
                        borderRadius: '3px',
                        padding: '4px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 18px)',
                        gap: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    >
                      {['#ffff00', '#84cc16', '#06b6d4', '#f43f5e', '#a855f7', '#fb923c', '#ffffff'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setHighlightColor(c);
                            exec('hiliteColor', c);
                            setShowHighlightPicker(false);
                          }}
                          style={{
                            width: '18px',
                            height: '18px',
                            background: c,
                            border: '1px solid #cbd5e1',
                            borderRadius: '2px',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Font Color */}
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="word-ribbon-icon-btn"
                    title="Font Color"
                    style={{ position: 'relative' }}
                  >
                    <span style={{ fontWeight: 800, fontSize: '13px', color: fontColor }}>A</span>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '4px',
                        right: '4px',
                        height: '3px',
                        background: fontColor,
                        borderRadius: '1px',
                      }}
                    />
                  </button>
                  {showColorPicker && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 9999,
                        background: '#ffffff',
                        border: '1px solid #8a8886',
                        borderRadius: '3px',
                        padding: '4px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 18px)',
                        gap: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    >
                      {['#000000', '#003366', '#1e40af', '#047857', '#b91c1c', '#6b7280', '#ffffff'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setFontColor(c);
                            exec('foreColor', c);
                            setShowColorPicker(false);
                          }}
                          style={{
                            width: '18px',
                            height: '18px',
                            background: c,
                            border: '1px solid #cbd5e1',
                            borderRadius: '2px',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#605e5c', fontWeight: 600 }}>
                Font
              </div>
            </div>

            {/* GROUP 3: PARAGRAPH */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                paddingRight: '8px',
                borderRight: '1px solid #dad9d8',
              }}
            >
              {/* Row 1: Bullets, Numbering, Indents */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <button
                  type="button"
                  onClick={() => exec('insertUnorderedList')}
                  className="word-ribbon-icon-btn"
                  title="Bullets"
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => exec('insertOrderedList')}
                  className="word-ribbon-icon-btn"
                  title="Numbering"
                >
                  <ListOrdered size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => exec('outdent')}
                  className="word-ribbon-icon-btn"
                  title="Decrease Indent"
                >
                  <Outdent size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => exec('indent')}
                  className="word-ribbon-icon-btn"
                  title="Increase Indent"
                >
                  <Indent size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => showNotice('Show/Hide Paragraph marks toggled.')}
                  className="word-ribbon-icon-btn"
                  title="Show/Hide Paragraph marks"
                >
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>¶</span>
                </button>
              </div>

              {/* Row 2: Alignments, Line Spacing, Shading, Borders */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                <button
                  type="button"
                  onClick={() => exec('justifyLeft')}
                  className="word-ribbon-icon-btn"
                  title="Align Left (Ctrl+L)"
                >
                  <AlignLeft size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => exec('justifyCenter')}
                  className="word-ribbon-icon-btn"
                  title="Center (Ctrl+E)"
                >
                  <AlignCenter size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => exec('justifyRight')}
                  className="word-ribbon-icon-btn"
                  title="Align Right (Ctrl+R)"
                >
                  <AlignRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => exec('justifyFull')}
                  className="word-ribbon-icon-btn"
                  title="Justify (Ctrl+J)"
                >
                  <AlignJustify size={13} />
                </button>

                {/* Table actions dropdown */}
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    type="button"
                    onClick={() => setShowTableMenu(!showTableMenu)}
                    className="word-ribbon-icon-btn"
                    title="Table / Borders"
                  >
                    <TableIcon size={13} />
                    <ChevronDown size={9} />
                  </button>
                  {showTableMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 9999,
                        background: '#ffffff',
                        border: '1px solid #8a8886',
                        borderRadius: '3px',
                        padding: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        width: '140px',
                        fontSize: '11px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (onInsertTable) onInsertTable();
                          setShowTableMenu(false);
                          showNotice('Tabel baru ditambahkan ke dokumen.');
                        }}
                        style={{ width: '100%', textAlign: 'left', padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        ➕ Sisipkan Tabel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onAddRow) onAddRow();
                          setShowTableMenu(false);
                          showNotice('Baris baru ditambahkan.');
                        }}
                        style={{ width: '100%', textAlign: 'left', padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        ⬇️ Tambah Baris
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onDeleteRow) onDeleteRow();
                          setShowTableMenu(false);
                          showNotice('Baris tabel dihapus.');
                        }}
                        style={{ width: '100%', textAlign: 'left', padding: '4px 8px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#dc2626' }}
                      >
                        🗑️ Hapus Baris
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#605e5c', fontWeight: 600 }}>
                Paragraph
              </div>
            </div>

            {/* GROUP 4: STYLES GALLERY (Matching image AaBbCc tiles) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                paddingRight: '8px',
                borderRight: '1px solid #dad9d8',
                maxWidth: '420px',
                overflowX: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {/* Normal */}
                <button
                  type="button"
                  onClick={() => handleStyleClick('normal')}
                  className="word-style-tile"
                  title="Apply Normal Style"
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#2b579a' }}>AaBbCc</span>
                  <span style={{ fontSize: '9.5px', color: '#605e5c' }}>Normal</span>
                </button>

                {/* No Spacing */}
                <button
                  type="button"
                  onClick={() => handleStyleClick('noSpacing')}
                  className="word-style-tile"
                  title="Apply No Spacing Style"
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#323130' }}>AaBbCc</span>
                  <span style={{ fontSize: '9.5px', color: '#605e5c' }}>No Spac...</span>
                </button>

                {/* Heading 1 */}
                <button
                  type="button"
                  onClick={() => handleStyleClick('h1')}
                  className="word-style-tile"
                  title="Apply Heading 1 Style"
                >
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#2f5496' }}>AaBbC</span>
                  <span style={{ fontSize: '9.5px', color: '#605e5c' }}>Heading 1</span>
                </button>

                {/* Heading 2 */}
                <button
                  type="button"
                  onClick={() => handleStyleClick('h2')}
                  className="word-style-tile"
                  title="Apply Heading 2 Style"
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#2f5496' }}>AaBbC</span>
                  <span style={{ fontSize: '9.5px', color: '#605e5c' }}>Heading 2</span>
                </button>

                {/* Title */}
                <button
                  type="button"
                  onClick={() => handleStyleClick('title')}
                  className="word-style-tile"
                  title="Apply Title Style"
                >
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#000000' }}>AaB</span>
                  <span style={{ fontSize: '9.5px', color: '#605e5c' }}>Title</span>
                </button>

                {/* Subtitle */}
                <button
                  type="button"
                  onClick={() => handleStyleClick('subtitle')}
                  className="word-style-tile"
                  title="Apply Subtitle Style"
                >
                  <span style={{ fontSize: '11px', fontStyle: 'italic', color: '#595959' }}>AaBbCc</span>
                  <span style={{ fontSize: '9.5px', color: '#605e5c' }}>Subtitle</span>
                </button>

                {/* Subtle Emphasis (Matching user screenshot) */}
                <button
                  type="button"
                  onClick={() => handleStyleClick('subtleEm')}
                  className="word-style-tile"
                  title="Apply Subtle Emphasis Style"
                >
                  <span style={{ fontSize: '11px', fontStyle: 'italic', color: '#595959' }}>AaBbC</span>
                  <span style={{ fontSize: '9.5px', color: '#605e5c' }}>Subtle Em...</span>
                </button>
              </div>
              <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#605e5c', fontWeight: 600 }}>
                Styles
              </div>
            </div>

            {/* GROUP 5: EDITING */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                paddingLeft: '4px',
                paddingRight: '6px',
                borderRight: '1px solid #dad9d8',
                minWidth: '65px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => setShowFindModal(true)}
                  className="word-ribbon-tool-btn"
                  title="Find & Replace"
                >
                  <Search size={12} color="#0078d4" />
                  <span>Find</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFindModal(true)}
                  className="word-ribbon-tool-btn"
                  title="Replace"
                >
                  <span style={{ fontSize: '11px' }}>🔄</span>
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  onClick={() => exec('selectAll')}
                  className="word-ribbon-tool-btn"
                  title="Select All (Ctrl+A)"
                >
                  <Check size={12} color="#16a34a" />
                  <span>Select</span>
                </button>
              </div>
              <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#605e5c', fontWeight: 600 }}>
                Editing
              </div>
            </div>

            {/* GROUP 6: ADOBE ACROBAT (Matching user screenshot) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                paddingLeft: '6px',
                paddingRight: '6px',
                borderRight: '1px solid #dad9d8',
                alignItems: 'center',
                minWidth: '68px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="word-ribbon-btn"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 6px',
                  borderRadius: '3px',
                  background: 'transparent',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: '#201f1e',
                }}
                title="Create a PDF / Cetak dokumen format PDF"
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: '1.5px solid #dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    fontWeight: 'bold',
                    fontSize: '9px',
                    background: '#fef2f2',
                  }}
                >
                  PDF
                </div>
                <span style={{ fontSize: '9.5px', marginTop: '2px', textAlign: 'center', lineHeight: 1.1 }}>
                  Create<br />a PDF
                </span>
              </button>
              <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#605e5c', fontWeight: 600 }}>
                Adobe Acrobat
              </div>
            </div>

            {/* GROUP 7: ADD-INS (Matching user screenshot) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                paddingLeft: '6px',
                alignItems: 'center',
                minWidth: '55px',
              }}
            >
              <button
                type="button"
                onClick={() => showNotice('Office Add-ins & Template Generator siap digunakan.')}
                className="word-ribbon-btn"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 6px',
                  borderRadius: '3px',
                  background: 'transparent',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: '11px',
                  color: '#201f1e',
                }}
                title="Office Add-ins"
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#f97316',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: '0 1px 3px rgba(249, 115, 22, 0.4)',
                  }}
                >
                  ●
                </div>
                <span style={{ fontSize: '10px', marginTop: '6px' }}>Add-ins</span>
              </button>
              <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#605e5c', fontWeight: 600 }}>
                Add-ins
              </div>
            </div>
          </>
        )}

        {activeTab === 'Insert' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
            <button
              type="button"
              onClick={() => {
                if (onInsertTable) onInsertTable();
                showNotice('Tabel disisipkan ke dalam dokumen.');
              }}
              className="word-style-tile"
              style={{ minWidth: '70px', padding: '6px' }}
            >
              <TableIcon size={20} color="#0078d4" />
              <span style={{ fontSize: '10px', marginTop: '2px' }}>Table</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exec('insertHorizontalRule');
                showNotice('Garis pemisah disisipkan.');
              }}
              className="word-style-tile"
              style={{ minWidth: '70px', padding: '6px' }}
            >
              <Minus size={20} color="#0078d4" />
              <span style={{ fontSize: '10px' }}>Divider</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exec('insertParagraph');
                showNotice('Page Break disisipkan.');
              }}
              className="word-style-tile"
              style={{ minWidth: '70px', padding: '6px' }}
            >
              <FileText size={20} color="#0d9488" />
              <span style={{ fontSize: '10px', marginTop: '2px' }}>Page Break</span>
            </button>
          </div>
        )}

        {activeTab === 'Layout' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
            <div style={{ fontSize: '11px', color: '#334155' }}>
              <strong>Ukuran Kertas:</strong> A4 (210 mm x 297 mm) | <strong>Margin Baku:</strong> Kiri 2.2 cm, Kanan/Atas/Bawah 2.0 cm (Standar NBE ISO & CSMS).
            </div>
          </div>
        )}

        {activeTab === 'View' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0' }}>
            <div style={{ fontSize: '11px', color: '#334155' }}>
              <strong>Tampilan Halaman:</strong> Print Layout A4 Nyata | Running Kop Header Aktif di Hal 2+
            </div>
          </div>
        )}
      </div>

      {/* 3. HORIZONTAL RULER (Exact Microsoft Word Ruler from user image) */}
      <div
        style={{
          background: '#fbfbfb',
          borderBottom: '1px solid #e1dfdd',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: '#595959',
          position: 'relative',
        }}
      >
        {/* Far Left Tab Stop Icon (L-shape matching Word screenshot) */}
        <div
          style={{
            position: 'absolute',
            left: '12px',
            top: '4px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#605e5c',
            lineHeight: 1,
            userSelect: 'none',
          }}
          title="Left Tab Stop"
        >
          └
        </div>

        <div
          style={{
            width: '100%',
            maxWidth: '820px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 83px 0 75px', // Exact margin padding matching A4 preview!
            position: 'relative',
          }}
        >
          {/* Left margin marker hourglass at position 2 (matching user screenshot) */}
          <div
            style={{
              position: 'absolute',
              left: '73px',
              top: '3px',
              fontSize: '11px',
              color: '#3b82f6',
              lineHeight: 1,
            }}
            title="First Line & Hanging Indent: 2.2 cm"
          >
            ⏳
          </div>

          {/* Centimeter scale numbers */}
          {[2, 4, 6, 8, 10, 12, 14, 16, 18].map((num) => (
            <div key={num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontWeight: 500 }}>{num}</span>
              <span style={{ fontSize: '7px', color: '#9ca3af' }}>|</span>
            </div>
          ))}

          {/* Right margin marker triangle */}
          <div
            style={{
              position: 'absolute',
              right: '83px',
              top: '3px',
              fontSize: '10px',
              color: '#3b82f6',
              lineHeight: 1,
            }}
            title="Right Margin: 2.0 cm"
          >
            ▲
          </div>
        </div>
      </div>

      {/* Status Notice Toast */}
      {statusNotice && (
        <div
          style={{
            background: '#ecfdf5',
            color: '#065f46',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 12px',
            borderBottom: '1px solid #a7f3d0',
            textAlign: 'center',
          }}
        >
          {statusNotice}
        </div>
      )}

      {/* Find & Replace Modal */}
      {showFindModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="nbe-word-find-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFindModal(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '6px',
              padding: '1.25rem',
              width: '340px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              border: '1px solid #cbd5e1',
            }}
          >
            <h4 id="nbe-word-find-title" style={{ margin: '0 0 0.75rem 0', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
              Find and Replace (Microsoft Word)
            </h4>
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Find what:
              </label>
              <input
                type="text"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
                style={{ width: '100%', padding: '4px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                placeholder="Kata atau teks yang dicari..."
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                Replace with:
              </label>
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                style={{ width: '100%', padding: '4px 8px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                placeholder="Ganti dengan teks baru..."
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowFindModal(false)}
                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleFindReplace}
                style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '4px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
              >
                Ganti Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Internal CSS for Word Ribbon Buttons */}
      <style>{`
        .word-ribbon-btn:hover,
        .word-ribbon-tool-btn:hover,
        .word-ribbon-icon-btn:hover,
        .word-style-tile:hover {
          background: #e1dfdd !important;
          border-color: #8a8886 !important;
        }
        .word-ribbon-tool-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 5px;
          border-radius: 2px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          font-size: 11px;
          color: #323130;
          height: 20px;
        }
        .word-ribbon-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px 4px;
          border-radius: 2px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          min-width: 22px;
          height: 22px;
          color: #323130;
        }
        .word-style-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          justifyContent: center;
          padding: 3px 6px;
          border-radius: 3px;
          border: 1px solid transparent;
          background: #ffffff;
          cursor: pointer;
          min-width: 58px;
          height: 48px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
};
