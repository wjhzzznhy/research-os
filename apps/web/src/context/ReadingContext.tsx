'use client';
import React, { createContext, useContext, useState } from 'react';
import { ReadingDocument } from '@/types/pages/reading';

interface ReadingContextType {
  currentDoc: ReadingDocument | null;
  setCurrentDoc: (doc: ReadingDocument | null) => void;
  isParsing: boolean;
  startParsing: (file: File) => Promise<void>;
}

export const ReadingContext = createContext<ReadingContextType | null>(null);

export const ReadingProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentDoc, setCurrentDoc] = useState<ReadingDocument | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const startParsing = async (file: File) => {
    setIsParsing(true);
    // 这里封装上传文件并调用后端 AI 解析接口的逻辑
    console.log("开始解析文件:", file.name);
    // ... 模拟 API 请求
    setIsParsing(false);
  };

  return (
    <ReadingContext.Provider value={{ currentDoc, setCurrentDoc, isParsing, startParsing }}>
      {children}
    </ReadingContext.Provider>
  );
};

// 导出方便调用的 Hook 风格函数（虽然放在 Context 文件里）
export const useReading = () => {
  const context = useContext(ReadingContext);
  if (!context) throw new Error('useReading must be used within ReadingProvider');
  return context;
};