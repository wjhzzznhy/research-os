'use client';
import { useEffect, useRef, useState } from 'react';
import {
  FolderOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  RobotOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import WritingAiChat from './WritingAiChat';
import WritingFileExplorer from './WritingFileExplorer';
import WritingLatexEditor from './WritingLatexEditor';
import WritingPdfPreview from './WritingPdfPreview';

type DividerType = 'file' | 'pdf' | 'chat';

interface DragState {
  type: DividerType;
  startX: number;
  startWidth: number;
}

export default function WritingLayout() {
  // Load saved widths from localStorage or use defaults
  const [fileWidth, setFileWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('writing_fileWidth');
      return saved ? parseInt(saved, 10) : 220;
    }
    return 220;
  });
  const [pdfWidth, setPdfWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('writing_pdfWidth');
      return saved ? parseInt(saved, 10) : 400;
    }
    return 400;
  });
  const [chatWidth, setChatWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('writing_chatWidth');
      return saved ? parseInt(saved, 10) : 300;
    }
    return 300;
  });
  const [activeFile, setActiveFile] = useState('react_guide.tex');

  // Panel visibility states - load from localStorage or use defaults
  const [showFile, setShowFile] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('writing_showFile');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [showEditor, setShowEditor] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('writing_showEditor');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [showPdf, setShowPdf] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('writing_showPdf');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [showChat, setShowChat] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('writing_showChat');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const dragging = useRef<DragState | null>(null);

  // Save widths to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('writing_fileWidth', fileWidth.toString());
  }, [fileWidth]);

  useEffect(() => {
    localStorage.setItem('writing_pdfWidth', pdfWidth.toString());
  }, [pdfWidth]);

  useEffect(() => {
    localStorage.setItem('writing_chatWidth', chatWidth.toString());
  }, [chatWidth]);

  // Save panel visibility states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('writing_showFile', showFile.toString());
  }, [showFile]);

  useEffect(() => {
    localStorage.setItem('writing_showEditor', showEditor.toString());
  }, [showEditor]);

  useEffect(() => {
    localStorage.setItem('writing_showPdf', showPdf.toString());
  }, [showPdf]);

  useEffect(() => {
    localStorage.setItem('writing_showChat', showChat.toString());
  }, [showChat]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - dragging.current.startX;

      if (dragging.current.type === 'file') {
        // Divider between File and Editor: drag right → file gets wider
        setFileWidth(Math.max(160, Math.min(420, dragging.current.startWidth + delta)));
      } else if (dragging.current.type === 'pdf') {
        // Divider between Editor and PDF: drag right → pdf gets narrower (editor grows)
        setPdfWidth(Math.max(280, Math.min(720, dragging.current.startWidth - delta)));
      } else {
        // Divider between PDF and Chat: drag right → chat gets narrower (pdf grows)
        setChatWidth(Math.max(240, Math.min(500, dragging.current.startWidth - delta)));
      }
    };

    const handleMouseUp = () => {
      if (dragging.current) {
        dragging.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startDrag =
    (type: DividerType, currentWidth: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      dragging.current = { type, startX: e.clientX, startWidth: currentWidth };
    };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Toolbar for reopening closed panels */}
      {(!showFile || !showEditor || !showPdf || !showChat) && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200 shrink-0">
          <span className="text-xs text-gray-500">已关闭面板：</span>
          {!showFile && (
            <button
              onClick={() => setShowFile(true)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded hover:border-primary/50 transition-colors"
            >
              <FolderOutlined style={{ fontSize: '10px' }} />
              <span>文件浏览</span>
            </button>
          )}
          {!showEditor && (
            <button
              onClick={() => setShowEditor(true)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded hover:border-primary/50 transition-colors"
            >
              <FileTextOutlined style={{ fontSize: '10px' }} />
              <span>代码编辑</span>
            </button>
          )}
          {!showPdf && (
            <button
              onClick={() => setShowPdf(true)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded hover:border-primary/50 transition-colors"
            >
              <FilePdfOutlined style={{ fontSize: '10px' }} />
              <span>PDF预览</span>
            </button>
          )}
          {!showChat && (
            <button
              onClick={() => setShowChat(true)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded hover:border-primary/50 transition-colors"
            >
              <RobotOutlined style={{ fontSize: '10px' }} />
              <span>AI助手</span>
            </button>
          )}
        </div>
      )}

      {/* Main panels container */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Panel 1: File Explorer ── */}
        {showFile && (
          <>
            <div
              className="flex-shrink-0 overflow-hidden border-r border-gray-200 relative"
              style={{ width: fileWidth }}
            >
              <button
                onClick={() => setShowFile(false)}
                className="absolute top-2 right-2 z-20 w-5 h-5 flex items-center justify-center bg-white/90 hover:bg-gray-100 rounded shadow-sm border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                title="关闭文件浏览"
              >
                <CloseOutlined style={{ fontSize: '9px' }} />
              </button>
              <WritingFileExplorer
                onFileSelect={(_id, name) => setActiveFile(name)}
              />
            </div>
            <Divider onMouseDown={startDrag('file', fileWidth)} />
          </>
        )}

        {/* ── Middle Area: Editor + PDF (flex-1 to fill space) ── */}
        <div className="flex flex-1 min-w-0 overflow-hidden">
          {/* ── Panel 2: LaTeX Editor ── */}
          {showEditor ? (
            <>
              <div className="flex-1 min-w-0 overflow-hidden relative">
                <button
                  onClick={() => setShowEditor(false)}
                  className="absolute top-2 right-2 z-20 w-5 h-5 flex items-center justify-center bg-white/90 hover:bg-gray-100 rounded shadow-sm border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                  title="关闭代码编辑"
                >
                  <CloseOutlined style={{ fontSize: '9px' }} />
                </button>
                <WritingLatexEditor activeFile={activeFile} />
              </div>
              {showPdf && <Divider onMouseDown={startDrag('pdf', pdfWidth)} />}
            </>
          ) : (
            !showPdf && (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-400">
                  <FileTextOutlined style={{ fontSize: '48px', marginBottom: '12px' }} />
                  <p className="text-sm">代码编辑区已关闭</p>
                  <p className="text-xs mt-1">点击顶部按钮重新打开</p>
                </div>
              </div>
            )
          )}

          {/* ── Panel 3: PDF Preview ── */}
          {showPdf ? (
            <div
              className={`overflow-hidden relative ${showEditor ? 'flex-shrink-0' : 'flex-1'}`}
              style={showEditor ? { width: pdfWidth } : undefined}
            >
              <button
                onClick={() => setShowPdf(false)}
                className="absolute top-2 right-2 z-20 w-5 h-5 flex items-center justify-center bg-white/90 hover:bg-gray-100 rounded shadow-sm border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                title="关闭PDF预览"
              >
                <CloseOutlined style={{ fontSize: '9px' }} />
              </button>
              <WritingPdfPreview />
            </div>
          ) : (
            !showEditor && (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-400">
                  <FilePdfOutlined style={{ fontSize: '48px', marginBottom: '12px' }} />
                  <p className="text-sm">PDF预览区已关闭</p>
                  <p className="text-xs mt-1">点击顶部按钮重新打开</p>
                </div>
              </div>
            )
          )}
        </div>

        {/* ── Panel 4: AI Chat (always pinned to right) ── */}
        {showChat && (
          <>
            <Divider onMouseDown={startDrag('chat', chatWidth)} />
            <div
              className="flex-shrink-0 overflow-hidden relative"
              style={{ width: chatWidth }}
            >
              <button
                onClick={() => setShowChat(false)}
                className="absolute top-2 right-2 z-20 w-5 h-5 flex items-center justify-center bg-white/90 hover:bg-gray-100 rounded shadow-sm border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors"
                title="关闭AI助手"
              >
                <CloseOutlined style={{ fontSize: '9px' }} />
              </button>
              <WritingAiChat />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Divider({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex-shrink-0 cursor-col-resize transition-colors duration-150 relative z-10"
      style={{
        width: '4px',
        background: hovered ? 'rgba(26,92,58,0.5)' : '#e5e7eb',
      }}
    />
  );
}
