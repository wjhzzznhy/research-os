'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { HistoryItem, HistoryModule, HistoryState } from '@/types/pages/history';
import { useLayout } from './LayoutContext';

interface HistoryContextType {
  historyState: HistoryState;
  openHistory: (module: HistoryModule, title?: string) => void;
  closeHistory: () => void;
  // 获取当前模块的历史记录列表
  getModuleHistory: (module: HistoryModule) => HistoryItem[];
  addHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
}

const HistoryContext = createContext<HistoryContextType | null>(null);

export const HistoryProvider = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn } = useLayout();
  const [ historyState, setHistoryState ] = useState<HistoryState>({
    isOpen: false,
    activeModule: null,
    title: '历史记录', //默认值
  });

  // 这里模拟本地存储的历史记录，实际开发中会从后端 API 获取
  const [allHistory, setAllHistory] = useState<HistoryItem[]>([]);

  // 打开方法：支持传入模块名和自定义标题
  const openHistory = useCallback((module: HistoryModule, title?: string) => {
    setHistoryState({ isOpen: true, activeModule: module, title: title });
  }, []);

  const closeHistory = useCallback(() => {
    setHistoryState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const getModuleHistory = useCallback((module: HistoryModule) => {
    if (!isLoggedIn) return []; // 未登录返回空
    return allHistory.filter(item => item.type === module);
  }, [allHistory, isLoggedIn]);

  const addHistory = useCallback((item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    if (!isLoggedIn) return;
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    setAllHistory(prev => [newItem, ...prev]);
  }, [isLoggedIn]);

  return (
    <HistoryContext.Provider value={{ historyState, openHistory, closeHistory, getModuleHistory, addHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (!context) throw new Error("useHistory must be used within HistoryProvider");
  return context;
};