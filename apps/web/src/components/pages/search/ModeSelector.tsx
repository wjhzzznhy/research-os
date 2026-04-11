'use client';
import { SearchOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Switch } from 'antd';
import { SearchMode } from '@/types/pages/search';

interface ModeSelectorProps {
  mode: SearchMode;
  setMode: (mode: SearchMode) => void;
  isWebSearch: boolean;
  setIsWebSearch: (val: boolean) => void;
}

export const ModeSelector = ({ mode, setMode, isWebSearch, setIsWebSearch }: ModeSelectorProps) => {
  return (
    <div className="flex items-center gap-2">
      {/* 简单搜索按钮 */}
      <div className="relative h-9 rounded-full overflow-hidden group">
        {mode !== 'simple' && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <div className="absolute -inset-full animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E5E7EB_0%,var(--color-primary)_50%,#E5E7EB_100%)]" />
          </div>
        )}
        <button 
          onClick={() => setMode('simple')}
          className={`relative m-[1.5px] flex items-center gap-2 h-[calc(100%-3px)] px-4 rounded-full transition-all z-10 border-none outline-none cursor-pointer
            ${mode === 'simple' 
              ? 'bg-primary-50 text-primary font-bold shadow-[inset_0_0_0_1px_rgba(26,92,58,0.1)]' 
              : 'bg-white text-gray-600 shadow-[inset_0_0_0_1px_rgba(26,92,58,0.1)]'}`}
        >
          <SearchOutlined className="text-base" />
          <span className="text-[14px]">简单搜索</span>
        </button>
      </div>

      {/* 智能搜索按钮 */}
      <div className="relative h-9 rounded-full overflow-hidden group">
        {mode !== 'smart' && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <div className="absolute -inset-full animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E5E7EB_0%,var(--color-primary)_50%,#E5E7EB_100%)]" />
          </div>
        )}
        <div 
          onClick={() => setMode('smart')}
          className={`relative m-[1.5px] flex items-center h-[calc(100%-3px)] pl-4 pr-2 rounded-full transition-all z-10 cursor-pointer
            ${mode === 'smart' ? 'bg-emerald-50 text-primary font-bold shadow-[inset_0_0_0_1px_rgba(26,92,58,0.1)]' : 'bg-white text-gray-600 shadow-[inset_0_0_0_1px_rgba(26,92,58,0.1)]'}`}
        >
          <ThunderboltOutlined className="text-base mr-2" />
          <span className="text-[14px] mr-2">智能搜索</span>
          {mode === 'smart' && (
            <div 
              className="flex items-center ml-2 relative cursor-pointer" 
              onClick={() => setIsWebSearch(!isWebSearch)}
            >
              {/* 1. 底层 Switch：锁定 54px 宽度 */}
              <Switch 
                size="small" 
                checked={isWebSearch} 
                onChange={setIsWebSearch} 
                className="custom-compact-switch shrink-0" 
              />
              
              {/* 2. 顶层文字层：使用两组绝对定位，互不干扰 */}
              <div className="absolute inset-0 pointer-events-none">
                {/* 联网：固定在左侧 10px 处 */}
                <span className={`absolute left-[10px] top-1/2 -translate-y-1/2 text-[10px] font-bold text-white transition-opacity duration-200 ${isWebSearch ? 'opacity-100' : 'opacity-0'}`}>
                  联网
                </span>
                
                {/* 离线：固定在右侧 10px 处 */}
                <span className={`absolute right-[10px] top-1/2 -translate-y-1/2 text-[10px] font-bold text-white transition-opacity duration-200 ${!isWebSearch ? 'opacity-100' : 'opacity-0'}`}>
                  离线
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
