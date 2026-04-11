'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  LeftOutlined,
  RightOutlined,
  FullscreenOutlined,
  DownloadOutlined,
  ReloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const MOCK_PDF_PAGES = [
  {
    page: 1,
    content: (
      <div style={{ fontFamily: 'Times New Roman, serif' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <h1
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              lineHeight: 1.3,
              marginBottom: '8px',
            }}
          >
            Modern Web Development:
            <br />
            A Comprehensive Guide to React and TypeScript
          </h1>
          <p style={{ fontSize: '10px', color: '#444', marginBottom: '6px' }}>
            Technical Documentation Team
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '8px', lineHeight: 1.6 }}>
          {/* Left column */}
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '4px', fontSize: '9px' }}>
              Overview
            </p>
            <p style={{ textAlign: 'justify', marginBottom: '8px' }}>
              This document provides a comprehensive overview of modern web development
              practices using React and TypeScript. We explore component architecture,
              state management patterns, and best practices for building scalable
              applications. The guide covers essential concepts including hooks, context
              API, and performance optimization techniques that are crucial for
              developing production-ready web applications.
            </p>
            <p style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '9px' }}>
              1. Introduction to React
            </p>
            <p style={{ textAlign: 'justify', marginBottom: '6px' }}>
              React is a JavaScript library for building user interfaces, developed and
              maintained by Meta (formerly Facebook). It enables developers to create
              reusable UI components that efficiently update and render when data changes.
              The library uses a virtual DOM to optimize rendering performance and provides
              a declarative programming model.
            </p>
            <p style={{ textAlign: 'justify', marginBottom: '6px' }}>
              Component-based architecture is at the heart of React development. Each
              component encapsulates its own logic, styling, and state, making code more
              maintainable and testable. Components can be composed together to build
              complex user interfaces from simple building blocks.
            </p>
            <p style={{ textAlign: 'justify', marginBottom: '6px' }}>
              React Hooks, introduced in version 16.8, revolutionized how developers write
              components. Hooks like useState, useEffect, and useContext allow functional
              components to manage state and side effects without requiring class components.
              This leads to cleaner, more readable code.
            </p>
          </div>
          {/* Right column */}
          <div style={{ flex: 1 }}>
            <p style={{ textAlign: 'justify', marginBottom: '6px' }}>
              TypeScript adds static typing to JavaScript, catching errors at compile time
              rather than runtime. When combined with React, TypeScript provides excellent
              IDE support, autocompletion, and refactoring capabilities. Type definitions
              for props and state make components more predictable and easier to understand.
            </p>
            <p style={{ textAlign: 'justify', marginBottom: '8px' }}>
              Modern React applications often use additional tools and libraries. State
              management solutions like Redux or Zustand help manage global state. Routing
              libraries such as React Router enable navigation between pages. Build tools
              like Vite or Next.js provide optimized development experiences and production
              builds.
            </p>
            <p style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '9px' }}>
              2. Component Patterns
            </p>
            <p style={{ textAlign: 'justify', marginBottom: '6px' }}>
              <strong>Functional Components.</strong> Modern React development primarily
              uses functional components with hooks. These components are simpler to write
              and test compared to class components. They promote better code reuse through
              custom hooks and composition patterns.
            </p>
            <p style={{ textAlign: 'justify', marginBottom: '6px' }}>
              <strong>State Management.</strong> Effective state management is crucial for
              application scalability. Local state should be kept close to where it&apos;s used,
              while shared state can be lifted up or managed through context. For complex
              applications, dedicated state management libraries provide more structure.
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function WritingPdfPreview() {
  const [page, setPage] = useState(1);
  const totalPages = 8;
  const [isCompiled] = useState(true);
  // Load saved zoom from localStorage or use default
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('writing_pdfZoom');
      return saved ? parseInt(saved, 10) : 100;
    }
    return 100;
  });
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Save zoom to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('writing_pdfZoom', zoom.toString());
  }, [zoom]);

  // Handle wheel zoom (Ctrl + wheel)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom((prev) => Math.max(30, Math.min(200, prev + delta)));
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-200">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-white border-b border-gray-200 shrink-0">
        <FileTextOutlined style={{ color: '#ef4444', fontSize: '12px' }} />
        <span className="text-xs text-gray-500 truncate flex-1 ml-1">react_guide.pdf</span>
        <button
          className="flex items-center gap-1 px-2 py-0.5 text-white text-xs rounded transition-colors shrink-0"
          style={{ background: '#1a5c3a', fontSize: '11px' }}
        >
          <ReloadOutlined style={{ fontSize: '10px' }} />
          <span>刷新</span>
        </button>
        <button
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded shrink-0"
          title="下载PDF"
        >
          <DownloadOutlined style={{ fontSize: '11px' }} />
        </button>
        <button
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded shrink-0"
          title="全屏预览"
        >
          <FullscreenOutlined style={{ fontSize: '11px' }} />
        </button>
      </div>

      {/* Page navigation + Zoom */}
      <div className="flex items-center justify-center gap-2 px-3 py-1 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={() => setZoom((z) => Math.max(30, z - 10))}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          title="缩小"
        >
          <ZoomOutOutlined style={{ fontSize: '11px' }} />
        </button>
        <span className="text-xs text-gray-600 w-12 text-center select-none">{zoom}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(200, z + 10))}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          title="放大"
        >
          <ZoomInOutlined style={{ fontSize: '11px' }} />
        </button>
        <div className="w-px h-3 bg-gray-300 mx-1" />
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-30"
        >
          <LeftOutlined style={{ fontSize: '10px' }} />
        </button>
        <span className="text-xs text-gray-600 select-none">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-30"
        >
          <RightOutlined style={{ fontSize: '10px' }} />
        </button>
      </div>

      {/* PDF canvas area */}
      <div 
        ref={pdfContainerRef}
        onWheel={handleWheel}
        className="flex-1 overflow-auto flex items-start justify-center py-4"
      >
        {isCompiled ? (
          <div
            className="bg-white shadow-xl transition-transform origin-top"
            style={{
              width: `${560 * zoom / 100}px`,
              minHeight: `${720 * zoom / 100}px`,
              padding: `${40 * zoom / 100}px`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
          >
            <div style={{ transform: `scale(${100 / zoom})`, transformOrigin: 'top left', width: `${zoom}%` }}>
              {MOCK_PDF_PAGES[0].content}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-gray-400 mt-20">
            <FileTextOutlined style={{ fontSize: '48px', color: '#d1d5db' }} />
            <p className="text-sm">点击「编译」生成 PDF 预览</p>
          </div>
        )}
      </div>
    </div>
  );
}
