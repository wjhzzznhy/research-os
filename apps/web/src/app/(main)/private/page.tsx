'use client';

import { useState } from 'react';
import { ModeSelector } from '@/components/pages/search/ModeSelector';
import { ModelSelect } from '@/components/pages/search/ModelSelect';
import { FeatureHeader } from '@/components/pages/common/FeatureHeader';
import { SearchBox } from '@/components/pages/search/SearchBox';
import { SearchMode, SearchRequest } from '@/types/pages/search';
import { HistorySidebar } from '@/components/pages/common/HistorySidebar';
import { HistoryTrigger } from '@/components/pages/common/HistoryTrigger';

export default function SearchPage() {
  const [mode, setMode] = useState<SearchMode>('smart');
  const [isWebSearch, setIsWebSearch] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  const handleSend = () => {
  // 未来可在这里构建符合 SearchRequest 接口的对象发给后端
    console.log("执行搜索:", searchValue, "模式:", mode);
  };

  return (
    /* 外层 flex 容器 */
    <div className="flex h-screen w-full overflow-hidden bg-mesh-green">
      {/* 历史侧边栏 */}
      <div className="z-50">
        <HistorySidebar 
          position="left" 
          shadowClassName="shadow-[4px_0_24px_rgba(0,0,0,0.08)]!"
          borderClassName="border-r-gray-600!"
        />
      </div>

      {/* 主内容区：使用 flex-1 占据剩余所有空间 */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-y-auto">
        {/* 触发按钮：相对于【主内容区】定位 */}
        <HistoryTrigger module="search" title="历史对话" className="top-4 left-4" />

        {/* 居中内容 */}
        <div className="flex flex-col items-center justify-center space-y-8 px-4 w-full max-w-5xl">
          <FeatureHeader title="AI 帮你理解科学" tag="GLM-4.6满血版 ✨" align="center" />
          <SearchBox
            value={searchValue}
            onChange={setSearchValue}
            mode={mode}
            bottomExtra={
              <>
                <ModeSelector 
                  mode={mode} 
                  setMode={setMode} 
                  isWebSearch={isWebSearch} 
                  setIsWebSearch={setIsWebSearch} 
                />
                <ModelSelect 
                  showModelSelector={mode === 'smart'} 
                  onSend={handleSend}
                />
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}