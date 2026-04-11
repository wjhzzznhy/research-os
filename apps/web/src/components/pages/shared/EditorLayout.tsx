'use client';
import { useEffect, useRef, useState, ReactNode } from 'react';
import { CloseOutlined } from '@ant-design/icons';

type DividerType = 'file' | 'preview' | 'chat';

interface DragState {
  type: DividerType;
  startX: number;
  startWidth: number;
}

export interface PanelConfig {
  icon: ReactNode;
  label: string;
  closeTip: string;
  closedText: string;
  closedSubText: string;
  closedIcon: ReactNode;
}

export interface EditorLayoutProps {
  /** localStorage key prefix, e.g. 'writing' or 'code' */
  storagePrefix: string;
  /** Default active file name */
  defaultFile: string;
  /** Hide the preview panel entirely (e.g. when preview is embedded in editor) */
  hidePreview?: boolean;
  /** Panel labels and icons */
  panelConfig: {
    file: PanelConfig;
    editor: PanelConfig;
    preview: PanelConfig;
    chat: PanelConfig;
  };
  /** Render functions for each panel */
  renderFileExplorer: (props: { onFileSelect: (id: string, name: string) => void }) => ReactNode;
  renderEditor: (props: { activeFile: string; onSendToAi: (text: string) => void }) => ReactNode;
  renderPreview: () => ReactNode;
  renderChat: (props: { aiPrompt: string; onPromptConsumed: () => void }) => ReactNode;
}

export default function EditorLayout({
  storagePrefix,
  defaultFile,
  hidePreview = false,
  panelConfig,
  renderFileExplorer,
  renderEditor,
  renderPreview,
  renderChat,
}: EditorLayoutProps) {
  const prefix = storagePrefix;

  // Load saved widths from localStorage or use defaults
  const [fileWidth, setFileWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${prefix}_fileWidth`);
      return saved ? parseInt(saved, 10) : 220;
    }
    return 220;
  });
  const [previewWidth, setPreviewWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${prefix}_previewWidth`);
      return saved ? parseInt(saved, 10) : 400;
    }
    return 400;
  });
  const [chatWidth, setChatWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${prefix}_chatWidth`);
      return saved ? parseInt(saved, 10) : 300;
    }
    return 300;
  });
  const [activeFile, setActiveFile] = useState(defaultFile);
  const [aiPrompt, setAiPrompt] = useState('');

  // Panel visibility states - load from localStorage or use defaults
  const [showFile, setShowFile] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${prefix}_showFile`);
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [showEditor, setShowEditor] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${prefix}_showEditor`);
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [showPreview, setShowPreview] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${prefix}_showPreview`);
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [showChat, setShowChat] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${prefix}_showChat`);
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });

  const dragging = useRef<DragState | null>(null);

  // Save widths to localStorage whenever they change
  useEffect(() => { localStorage.setItem(`${prefix}_fileWidth`, fileWidth.toString()); }, [prefix, fileWidth]);
  useEffect(() => { localStorage.setItem(`${prefix}_previewWidth`, previewWidth.toString()); }, [prefix, previewWidth]);
  useEffect(() => { localStorage.setItem(`${prefix}_chatWidth`, chatWidth.toString()); }, [prefix, chatWidth]);

  // Save panel visibility states to localStorage whenever they change
  useEffect(() => { localStorage.setItem(`${prefix}_showFile`, showFile.toString()); }, [prefix, showFile]);
  useEffect(() => { localStorage.setItem(`${prefix}_showEditor`, showEditor.toString()); }, [prefix, showEditor]);
  useEffect(() => { localStorage.setItem(`${prefix}_showPreview`, showPreview.toString()); }, [prefix, showPreview]);
  useEffect(() => { localStorage.setItem(`${prefix}_showChat`, showChat.toString()); }, [prefix, showChat]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - dragging.current.startX;

      if (dragging.current.type === 'file') {
        setFileWidth(Math.max(160, Math.min(420, dragging.current.startWidth + delta)));
      } else if (dragging.current.type === 'preview') {
        setPreviewWidth(Math.max(280, Math.min(720, dragging.current.startWidth - delta)));
      } else {
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

  const closeBtnClass =
    'absolute top-2 right-2 z-20 w-5 h-5 flex items-center justify-center bg-white/90 hover:bg-gray-100 rounded shadow-sm border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors';
  const reopenBtnClass =
    'flex items-center gap-1 px-2 py-0.5 text-xs text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded hover:border-primary/50 transition-colors';

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Toolbar for reopening closed panels */}
      {(!showFile || !showEditor || (!hidePreview && !showPreview) || !showChat) && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200 shrink-0">
          <span className="text-xs text-gray-500">已关闭面板：</span>
          {!showFile && (
            <button onClick={() => setShowFile(true)} className={reopenBtnClass}>
              {panelConfig.file.icon}
              <span>{panelConfig.file.label}</span>
            </button>
          )}
          {!showEditor && (
            <button onClick={() => setShowEditor(true)} className={reopenBtnClass}>
              {panelConfig.editor.icon}
              <span>{panelConfig.editor.label}</span>
            </button>
          )}
          {!hidePreview && !showPreview && (
            <button onClick={() => setShowPreview(true)} className={reopenBtnClass}>
              {panelConfig.preview.icon}
              <span>{panelConfig.preview.label}</span>
            </button>
          )}
          {!showChat && (
            <button onClick={() => setShowChat(true)} className={reopenBtnClass}>
              {panelConfig.chat.icon}
              <span>{panelConfig.chat.label}</span>
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
              <button onClick={() => setShowFile(false)} className={closeBtnClass} title={panelConfig.file.closeTip}>
                <CloseOutlined style={{ fontSize: '9px' }} />
              </button>
              {renderFileExplorer({ onFileSelect: (_id, name) => setActiveFile(name) })}
            </div>
            <Divider onMouseDown={startDrag('file', fileWidth)} />
          </>
        )}

        {/* ── Middle Area: Editor + Preview (flex-1 to fill space) ── */}
        <div className="flex flex-1 min-w-0 overflow-hidden">
          {/* ── Panel 2: Editor ── */}
          {showEditor ? (
            <>
              <div className="flex-1 min-w-0 overflow-hidden relative">
                <button onClick={() => setShowEditor(false)} className={closeBtnClass} title={panelConfig.editor.closeTip}>
                  <CloseOutlined style={{ fontSize: '9px' }} />
                </button>
                {renderEditor({
                  activeFile,
                  onSendToAi: (text) => {
                    setAiPrompt(text);
                    if (!showChat) setShowChat(true);
                  },
                })}
              </div>
              {!hidePreview && showPreview && <Divider onMouseDown={startDrag('preview', previewWidth)} />}
            </>
          ) : (
            !showPreview && (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-400">
                  {panelConfig.editor.closedIcon}
                  <p className="text-sm">{panelConfig.editor.closedText}</p>
                  <p className="text-xs mt-1">{panelConfig.editor.closedSubText}</p>
                </div>
              </div>
            )
          )}

          {/* ── Panel 3: Preview ── */}
          {!hidePreview && (
            showPreview ? (
              <div
                className={`overflow-hidden relative ${showEditor ? 'flex-shrink-0' : 'flex-1'}`}
                style={showEditor ? { width: previewWidth } : undefined}
              >
                <button onClick={() => setShowPreview(false)} className={closeBtnClass} title={panelConfig.preview.closeTip}>
                  <CloseOutlined style={{ fontSize: '9px' }} />
                </button>
                {renderPreview()}
              </div>
            ) : (
              !showEditor && (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-400">
                    {panelConfig.preview.closedIcon}
                    <p className="text-sm">{panelConfig.preview.closedText}</p>
                    <p className="text-xs mt-1">{panelConfig.preview.closedSubText}</p>
                  </div>
                </div>
              )
            )
          )}
        </div>

        {/* ── Panel 4: AI Chat (always pinned to right) ── */}
        {showChat && (
          <>
            <Divider onMouseDown={startDrag('chat', chatWidth)} />
            <div className="flex-shrink-0 overflow-hidden relative" style={{ width: chatWidth }}>
              <button onClick={() => setShowChat(false)} className={closeBtnClass} title={panelConfig.chat.closeTip}>
                <CloseOutlined style={{ fontSize: '9px' }} />
              </button>
              {renderChat({ aiPrompt, onPromptConsumed: () => setAiPrompt('') })}
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
