"use client";

import { Paper } from '@/types/pages/paper';

interface SidebarLeftProps {
  papers: Paper[];
  onSelect: (paper: Paper) => void;
  selectedId?: string | null;
}

export default function SidebarLeft({ papers, onSelect, selectedId }: SidebarLeftProps) {
  return (
    <div className="h-full flex flex-col bg-white">
      <h2 className="text-[16px] font-bold px-4 pt-4 pb-2 text-black uppercase tracking-tight">
        论文列表
      </h2>
      <div className="flex-1 overflow-y-auto">
        {papers.map((paper, index) => {
          const isOrigin = index === 0;
          const isSelected = selectedId === paper.id;

          return (
            <div key={paper.id} className="relative group">
              {/* 论文主体容器 */}
              <div 
                onClick={() => onSelect(paper)}
                className={`
                  px-4 py-6 cursor-pointer transition-all relative
                  /* 背景逻辑 */
                  /* 1. 选中状态：较深的灰色 bg-gray-100 */
                  /* 2. 未选中 Origin：浅紫色 bg-[#a07ba526] */
                  /* 3. 未选中普通：白色 bg-white */
                  ${isSelected ? 'bg-gray-100!' : (isOrigin ? 'bg-[#a07ba526]!' : 'bg-white!')}
                  
                  /* 悬停背景逻辑：hover 优先级高，bg-gray-50 比 bg-gray-100 浅，满足需求 */
                  hover:bg-gray-50!
                `}
              >
                <div className="flex flex-col gap-1">
                  {/* 1. Origin 标签 */}
                  {isOrigin && (
                    <span className={`
                      text-[13px] font-bold uppercase mb-0 transition-colors
                      /* 标签颜色随状态变化：悬停或选中时紫色，默认也是紫色 */
                      text-[#5d2f91]
                    `}>
                      Origin paper
                    </span>
                  )}

                  <div className="flex flex-col gap-2">
                    {/* 2. 标题 */}
                    <div className={`
                      text-[16px] leading-snug line-clamp-3 transition-colors font-medium
                      
                      /* 文字颜色逻辑 */
                      ${isOrigin 
                        ? (isSelected ? 'text-[#5d2f91]' : 'text-black group-hover:text-[#5d2f91]') 
                        : (isSelected ? 'text-[#02662c]' : 'text-black group-hover:text-[#02662c]')
                      }
                    `}>
                      {paper.title}
                    </div>

                    {/* 3. 作者与年份 */}
                    <div className={`
                      text-[11px] mt-0 transition-colors
                      /* 作者颜色：悬停或选中时颜色变深或维持原样 */
                      ${isSelected || isOrigin ? 'text-slate-500' : 'text-gray-400 group-hover:text-slate-500'}
                    `}>
                      {paper.author} · {paper.year}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. 断开式分割线 */}
              {index !== papers.length - 1 && (
                <div className={`mx-4 border-b ${isOrigin || isSelected || (papers[index+1].id === selectedId) ? 'border-transparent' : 'border-gray-100'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}