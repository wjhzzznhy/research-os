//右边侧边栏组件。
"use client";
import { Paper } from '@/types/pages/paper';
import { Star, FileText, Globe, BookOpen } from 'lucide-react';
import { useLayout } from '@/context/LayoutContext';

export default function SidebarRight({ paper }: { paper: Paper | null }) {
  const { isLoggedIn, setIsLoginModalOpen, favoriteIds, toggleFavorite } = useLayout();

  if (!paper) {
    return (
      <div className="h-full flex items-center justify-center text-primary font-bold">
        点击节点查看详情
      </div>
    );
  }

  const isFavorited = favoriteIds?.includes(paper.id) ?? false;

  const handleFavoriteClick = () => {
    if (!isLoggedIn) {
      setIsLoginModalOpen(true);
      return;
    }
    toggleFavorite(paper.id);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto bg-white scrollbar-thin">
      {/* 标题 */}
      <h2 className="text-xl font-bold text-slate-900 leading-tight">
        {paper.title}
      </h2>
    
      {/* 作者、年份、引用数 & 收藏按钮区域 */}
      <div className="mt-4 mb-1 flex justify-between items-end">
        {/* 左侧元数据 */}
        <div className="flex flex-col gap-2 text-[14px] text-gray-600">
          <p><span className="text-[14px] text-gray-900">作者:</span> {paper.author}</p>
          <p><span className="text-[14px] text-gray-900">年份:</span> {paper.year}</p>
          <p><span className="text-[14px] text-gray-900">引用数:</span> {paper.citations}</p>
        </div>

        {/* 右侧收藏按钮 */}
        <button 
          onClick={handleFavoriteClick}
          className={`flex items-center gap-1.5 px-4 h-[32px] rounded-full border transition-all cursor-pointer
            ${isFavorited 
              ? 'bg-[#2d5f5f]/10 border-[#2d5f5f]/40 text-[#2d5f5f]' 
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
        >
          <Star size={13} fill={isFavorited ? "currentColor" : "none"} />
          <span className="font-bold text-[13px]">{isFavorited ? "已收藏" : "收藏"}</span>
        </button>
      </div>

      {/* 来源区域 */}
      <div className="mt-3 mb-2">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold text-slate-700 shrink-0">来源:</span>
          <div className="flex gap-2">
            {/* 模拟不同来源图标跳转 */}
            <a 
              href={paper.url} target="_blank" title="arXiv / PDF"
              className="p-2 bg-slate-50 rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#2d5f5f] transition-all border border-slate-100"
            >
              <FileText size={18} />
            </a>
            <a 
              href={`https://scholar.google.com/scholar?q=${paper.title}`} target="_blank" title="Google Scholar"
              className="p-2 bg-slate-50 rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#2d5f5f] transition-all border border-slate-100"
            >
              <Globe size={18} />
            </a>
            <a 
              href="#" target="_blank" title="Publisher"
              className="p-2 bg-slate-50 rounded-md text-slate-500 hover:bg-slate-100 hover:text-[#2d5f5f] transition-all border border-slate-100"
            >
              <BookOpen size={18} />
            </a>
          </div>
        </div>
      </div>

      {/* 摘要区域 */}
      <div className="mt-3">
        <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wider">
          摘要
        </h3>
        <p className="text-[13px] text-slate-600 leading-relaxed text-justify">
          {paper.abstract}
        </p>
      </div>
    </div>
  );
}