import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LLMConfig } from '@/types/api';
import { ConfirmDialogState, NotificationState } from '@/lib/smart-draw/types';

interface DrawState {
  // 核心状态
  engineType: 'drawio' | 'excalidraw';
  setEngineType: (type: 'drawio' | 'excalidraw') => void;

  // 配置状态
  config: LLMConfig | null;
  setConfig: (config: LLMConfig | null) => void;
  usePassword: boolean;
  setUsePassword: (use: boolean) => void;

  // 模态框状态
  isHistoryModalOpen: boolean;
  setIsHistoryModalOpen: (open: boolean) => void;
  isCombinedSettingsOpen: boolean;
  setIsCombinedSettingsOpen: (open: boolean) => void;

  // 交互状态
  confirmDialog: ConfirmDialogState;
  setConfirmDialog: (state: ConfirmDialogState) => void;
  closeConfirmDialog: () => void;
  
  // 待恢复的历史记录（用于跨引擎恢复）
  pendingHistory: any | null; // using any to avoid circular deps or complex imports for now, or import HistoryItem
  setPendingHistory: (history: any | null) => void;

  notification: NotificationState;
  setNotification: (state: NotificationState) => void;
  showNotification: (title: string, message: string, type?: NotificationState['type']) => void;
  closeNotification: () => void;

  // UI 布局
  chatPanelWidth: number;
  setChatPanelWidth: (width: number) => void;
}

export const useDrawStore = create<DrawState>()(
  persist(
    (set) => ({
      // 初始状态
      engineType: 'drawio',
      setEngineType: (type) => set({ engineType: type }),

      config: null,
      setConfig: (config) => set({ config }),
      usePassword: false,
      setUsePassword: (usePassword) => set({ usePassword }),

      isHistoryModalOpen: false,
      setIsHistoryModalOpen: (open) => set({ isHistoryModalOpen: open }),
      isCombinedSettingsOpen: false,
      setIsCombinedSettingsOpen: (open) => set({ isCombinedSettingsOpen: open }),

      confirmDialog: {
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'warning',
      },
      setConfirmDialog: (confirmDialog) => set({ confirmDialog }),
      closeConfirmDialog: () => set((state) => ({ 
        confirmDialog: { ...state.confirmDialog, isOpen: false } 
      })),

      pendingHistory: null,
      setPendingHistory: (pendingHistory) => set({ pendingHistory }),

      notification: {
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
      },
      setNotification: (notification) => set({ notification }),
      showNotification: (title, message, type = 'info') => set({
        notification: { isOpen: true, title, message, type }
      }),
      closeNotification: () => set((state) => ({
        notification: { ...state.notification, isOpen: false }
      })),

      chatPanelWidth: 0,
      setChatPanelWidth: (chatPanelWidth) => set({ chatPanelWidth }),
    }),
    {
      name: 'smart-diagram-storage', // unique name
      partialize: (state) => ({ engineType: state.engineType }), // only persist engineType
    }
  )
);
