'use client';

import { ClockCircleOutlined } from '@ant-design/icons';
import { useHistory } from '@/context/HistoryContext';
import { HistoryModule } from '@/types/pages/history';

interface HistoryTriggerProps {
  module: HistoryModule;
  title?: string;
  className?: string; // 允许外部微调位置
}

export const HistoryTrigger = ({ module, title, className = "top-4 left-4" }: HistoryTriggerProps) => {
  const { openHistory, historyState } = useHistory();
  const { isOpen } = historyState;

  // 当历史记录栏打开时，按钮直接消失
  if (isOpen) return null;

  return (
    <div 
      className={`absolute cursor-pointer flex items-center justify-center 
        p-2 rounded-full transition-colors hover:bg-black/5 active:bg-black/10 z-10 ${className}`} 
      onClick={() => openHistory(module, title)}
    >
      <ClockCircleOutlined style={{ fontSize: '20px' }} className="text-gray-600!" />
    </div>
  );
};