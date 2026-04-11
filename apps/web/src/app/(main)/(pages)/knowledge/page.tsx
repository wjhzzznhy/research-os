'use client';
import { useState } from 'react';
import KnowledgeSidebar from '@/components/pages/knowledge/KnowledgeSidebar';
import KnowledgeContent from '@/components/pages/knowledge/KnowledgeContent';

export default function KnowledgePage() {
  const [activeItem, setActiveItem] = useState('all-docs');

  return (
    // h-full 填满父容器高度; bg-white 覆盖底部默认绿色背景色
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* 中间栏 - 功能选择 */}
      <KnowledgeSidebar 
        activeItem={activeItem} 
        onItemSelect={setActiveItem} 
      />
      {/* 右侧内容区 */}
      <KnowledgeContent 
        activeItem={activeItem} 
        onItemSelect={setActiveItem} 
      />
    </div>
  );
}
