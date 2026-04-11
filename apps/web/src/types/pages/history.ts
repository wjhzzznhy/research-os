export type HistoryModule = 'reading' | 'search' | 'writing' | 'tree';

export interface HistoryItem {
  id: string;
  title: string;
  timestamp: number;
  type: HistoryModule;
  metadata?: Record<string, string | number>; // 扩展信息
}

export interface HistoryState {
  isOpen: boolean;
  activeModule: HistoryModule | null;
  title?: string; // 保存当前页面的自定义标题
}