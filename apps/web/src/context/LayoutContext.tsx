'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface LayoutContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isUserLoading: boolean; 
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (v: boolean) => void;
  login: () => void;
  adminLogin: () => void;
  logout: () => void;
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
}

export const LayoutContext = createContext<LayoutContextType | null>(null);

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  // 使用延迟初始化，减少首屏闪烁
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isUserLoading, setIsUserLoading] = useState(true);

  // 初始化逻辑
  useEffect(() => {
    const initAuth = () => {
      try {
        const savedLogin = localStorage.getItem('isLoggedIn') === 'true';
        const savedAdmin = localStorage.getItem('isAdmin') === 'true';
        const savedFavorites = JSON.parse(localStorage.getItem('paper_favorites') || '[]');
        
        setIsLoggedIn(savedLogin);
        setIsAdmin(savedAdmin);
        setFavoriteIds(savedFavorites);
      } catch (e) {
        console.error("Initialization failed", e);
      } finally {
        setIsUserLoading(false);
      }
    };

    initAuth();

    // 多标签页同步：监听其他标签页的操作
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'isLoggedIn') setIsLoggedIn(e.newValue === 'true');
      if (e.key === 'isAdmin') setIsAdmin(e.newValue === 'true');
      if (e.key === 'paper_favorites') setFavoriteIds(JSON.parse(e.newValue || '[]'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 纯粹的持久化方法
  const saveToLocalStorage = useCallback((ids: string[]) => {
    setFavoriteIds(ids);
    localStorage.setItem('paper_favorites', JSON.stringify(ids));
  }, []);

  // toggle逻辑复用上面的方法
  const toggleFavorite = useCallback((id: string) => {
    const isFavorited = favoriteIds.includes(id);
    const next = isFavorited 
      ? favoriteIds.filter(f => f !== id) 
      : [...favoriteIds, id];
    
    saveToLocalStorage(next); // 调用统一的保存逻辑
  }, [favoriteIds, saveToLocalStorage]);

  const login = useCallback(() => {
    setIsLoggedIn(true);
    setIsAdmin(false);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.removeItem('isAdmin');
    setIsLoginModalOpen(false);
  }, []);

  const adminLogin = useCallback(() => {
    setIsLoggedIn(true);
    setIsAdmin(true);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('isAdmin', 'true');
    setIsLoginModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setFavoriteIds([]);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('paper_favorites');
    
    // 强制刷新以清理所有 Context 状态，或者跳转
    window.location.reload();
  }, []);

  const contextValue = useMemo(() => ({
    collapsed,
    setCollapsed,
    isLoggedIn,
    isAdmin,
    isUserLoading,
    isLoginModalOpen,
    setIsLoginModalOpen,
    login,
    adminLogin,
    logout,
    favoriteIds,
    toggleFavorite
  }), [collapsed, isLoggedIn, isAdmin, isUserLoading, isLoginModalOpen, login, adminLogin, logout, favoriteIds, toggleFavorite]);

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) throw new Error("useLayout must be used within LayoutProvider");
  return context;
};