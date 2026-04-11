'use client';
import { useRef, useState } from 'react';
import {
  CaretRightOutlined,
  SaveOutlined,
  DownloadOutlined,
  FileTextOutlined,
  CloseOutlined,
  RobotOutlined,
} from '@ant-design/icons';

const MOCK_LATEX_CONTENT = `\\documentclass[11pt,article]{article}

% Basic packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\geometry{a4paper, margin=1in}

% Typography
\\usepackage{times}
\\usepackage{microtype}

% Code listings
\\usepackage{listings}
\\usepackage{xcolor}

% Define colors for code
\\definecolor{codegreen}{rgb}{0,0.6,0}
\\definecolor{codegray}{rgb}{0.5,0.5,0.5}
\\definecolor{codepurple}{rgb}{0.58,0,0.82}
\\definecolor{backcolour}{rgb}{0.95,0.95,0.92}

% Code listing style
\\lstdefinestyle{mystyle}{
  backgroundcolor=\\color{backcolour},
  commentstyle=\\color{codegreen},
  keywordstyle=\\color{blue},
  numberstyle=\\tiny\\color{codegray},
  stringstyle=\\color{codepurple},
  basicstyle=\\ttfamily\\footnotesize,
  breakatwhitespace=false,
  breaklines=true,
  captionpos=b,
  keepspaces=true,
  numbers=left,
  numbersep=5pt,
  showspaces=false,
  showstringspaces=false,
  showtabs=false,
  tabsize=2
}
\\lstset{style=mystyle}

% Hyperlinks
\\usepackage[colorlinks=true,linkcolor=blue,urlcolor=blue]{hyperref}

\\begin{document}

\\title{Modern Web Development:\\\\A Comprehensive Guide to React and TypeScript}
\\author{Technical Documentation Team}
\\date{\\today}

\\maketitle

\\begin{abstract}
This document provides a comprehensive overview of modern web development
practices using React and TypeScript. We explore component architecture,
state management patterns, and best practices for building scalable applications.
The guide covers essential concepts including hooks, context API, and performance
optimization techniques that are crucial for developing production-ready web
applications.
\\end{abstract}

\\section{Introduction to React}
\\label{sec:intro}

React is a JavaScript library for building user interfaces, developed and
maintained by Meta (formerly Facebook). It enables developers to create reusable
UI components that efficiently update and render when data changes.

\\subsection{Core Concepts}

Component-based architecture is at the heart of React development. Each component
encapsulates its own logic, styling, and state, making code more maintainable
and testable.

\\begin{lstlisting}[language=JavaScript,caption=Simple React Component]
function Welcome({ name }) {
  return <h1>Hello, {name}!</h1>;
}
\\end{lstlisting}

\\section{TypeScript Integration}
\\label{sec:typescript}

TypeScript adds static typing to JavaScript, catching errors at compile time
rather than runtime. When combined with React, TypeScript provides excellent
IDE support and autocompletion.

\\end{document}`;

interface Tab {
  id: string;
  name: string;
  modified: boolean;
}

interface WritingLatexEditorProps {
  activeFile?: string;
  onSendToAi?: (text: string) => void;
}

export default function WritingLatexEditor({ activeFile = 'react_guide.tex', onSendToAi }: WritingLatexEditorProps) {
  const [content, setContent] = useState(MOCK_LATEX_CONTENT);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [selectedText, setSelectedText] = useState('');
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'main', name: activeFile, modified: false },
    { id: 'components', name: 'components.tex', modified: false },
  ]);
  const [activeTab, setActiveTab] = useState('main');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);

  const lines = content.split('\n');
  const lineCount = lines.length;

  const handleScroll = () => {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCursorChange = () => {
    if (textareaRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current;
      const textBefore = content.substring(0, selectionStart);
      const lineNum = textBefore.split('\n').length;
      const col = textBefore.split('\n').pop()!.length + 1;
      setCursorPos({ line: lineNum, col });
      
      // Track selected text
      const selected = content.substring(selectionStart, selectionEnd);
      setSelectedText(selected);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      setTabs((prev) => prev.map((t) => (t.id === activeTab ? { ...t, modified: true } : t)));
      requestAnimationFrame(() => {
        ta.selectionStart = start + 2;
        ta.selectionEnd = start + 2;
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab ? { ...t, modified: true } : t))
    );
  };

  const closeTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);
    if (activeTab === tabId) {
      setActiveTab(newTabs[0].id);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#ffffff' }}>
      {/* Tab bar + Toolbar */}
      <div
        className="flex items-center shrink-0 border-b"
        style={{ background: '#f5f5f5', borderColor: '#e0e0e0' }}
      >
        {/* Tabs */}
        <div className="flex items-center overflow-x-auto flex-1 min-w-0">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer shrink-0 border-r select-none ${
                activeTab === tab.id
                  ? 'text-gray-800 border-t-2 border-t-orange-400'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              style={{
                background: activeTab === tab.id ? '#ffffff' : 'transparent',
                borderRightColor: '#e0e0e0',
              }}
            >
              <FileTextOutlined style={{ color: '#f97316', fontSize: '11px' }} />
              <span>{tab.name}</span>
              {tab.modified && (
                <span style={{ color: '#e2e2e2', fontSize: '8px' }}>●</span>
              )}
              <button
                onClick={(e) => closeTab(e, tab.id)}
                className="text-gray-400 hover:text-gray-700 ml-0.5"
                style={{ fontSize: '11px', lineHeight: 1 }}
              >
                <CloseOutlined />
              </button>
            </div>
          ))}
        </div>

        {/* Toolbar actions */}
        <div className="flex items-center gap-1 px-2 shrink-0">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-white rounded transition-colors"
            style={{ background: '#1a5c3a', fontSize: '12px' }}
          >
            <CaretRightOutlined />
            <span>编译</span>
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
            style={{ color: '#6b7280' }}
            title="保存"
          >
            <SaveOutlined style={{ fontSize: '11px' }} />
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
            style={{ color: '#6b7280' }}
            title="下载"
          >
            <DownloadOutlined style={{ fontSize: '11px' }} />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={() => {
              if (selectedText && onSendToAi) {
                onSendToAi(selectedText);
              }
            }}
            disabled={!selectedText}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ 
              background: selectedText ? '#1a5c3a' : '#d1d5db',
              color: '#ffffff',
              fontSize: '12px'
            }}
            title={selectedText ? '发送选中内容给 AI' : '请先选中文本'}
          >
            <RobotOutlined />
            <span>问 AI</span>
          </button>
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line numbers */}
        <div
          ref={lineNumRef}
          className="select-none overflow-hidden shrink-0 pt-2 pb-2 text-right font-mono border-r"
          style={{
            background: '#fafafa',
            color: '#9ca3af',
            fontSize: '12px',
            lineHeight: '20px',
            width: '44px',
            paddingRight: '8px',
            borderColor: '#e5e7eb',
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} style={{ lineHeight: '20px' }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <div className="flex-1 overflow-hidden" style={{ background: '#ffffff' }}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onClick={handleCursorChange}
            onKeyUp={handleCursorChange}
            spellCheck={false}
            className="w-full h-full resize-none outline-none border-none p-2 pl-1 font-mono"
            style={{
              background: '#ffffff',
              color: '#1f2937',
              fontSize: '13px',
              lineHeight: '20px',
              caretColor: '#1f2937',
              tabSize: 2,
            }}
          />
        </div>
      </div>

      {/* Status bar */}
      <div
        className="flex items-center justify-between px-3 shrink-0 border-t"
        style={{ background: '#1a5c3a', color: '#ffffff', fontSize: '11px', height: '22px', borderColor: '#e5e7eb' }}
      >
        <div className="flex items-center gap-3">
          <span>LaTeX</span>
          <span>UTF-8</span>
          <span>LF</span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            行 {cursorPos.line}, 列 {cursorPos.col}
          </span>
          <span>LaTeX</span>
          <span>Pro</span>
        </div>
      </div>
    </div>
  );
}
