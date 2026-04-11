import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GraphNodeData } from '@/types/pages/graph';

const GraphNode = ({ data, selected, dragging}: NodeProps<GraphNodeData>) => {
  const { label, isRoot, isSelected, translation } = data;
  
  // 动态样式计算
  const isHighlighted = isSelected || selected; // 支持 ReactFlow 的默认选中和自定义选中
  
  // 基础圆圈样式
  const baseStyle = `
    relative flex flex-col items-center justify-center text-center
    rounded-full transition-all duration-500 ease-out
    backdrop-blur-md border border-white/20 shadow-lg
    hover:scale-105 hover:shadow-xl hover:z-50
  `;

  // 呼吸灯效果 (仅对 Root 或 Highlighted 生效)
  const pulseEffect = (isRoot || isHighlighted) ? 'animate-pulse-slow' : '';


  // 颜色主题（统一为高级绿体系）
  // Root根节点：主色深绿底 + 白字，自带微弱的深绿光晕
  // Highlighted选中/高亮：亮绿色底 + 白字 + 绿色光晕
  // Normal普通节点：15px 范围的翠绿光晕
  let colorTheme = '';
  if (isRoot) {
    // 【深绿光晕】：把范围拉大到 30px，透明度直接拉高到 0.8 甚至 0.9，才能透出浓郁的绿光
    colorTheme = 'bg-[#1a5c3a]! text-white! border-[#14532d]! hover:shadow-[0_0_30px_rgba(26,92,58,0.85)]!';
  } else if (isHighlighted) {
    // 【亮绿光晕】：范围 25px，透明度 0.8
    colorTheme = 'bg-emerald-500! text-white! border-emerald-400! hover:shadow-[0_0_25px_rgba(16,185,129,0.8)]!';
  } else {
    // 【悬停光晕】：普通节点悬停时稍微调亮一点
    colorTheme = 'bg-white/90! text-[#1a5c3a]! border-emerald-200! hover:border-emerald-400! hover:bg-white! hover:shadow-[0_0_20px_rgba(16,185,129,0.6)]!';
  }

  //外圈光晕主色深绿
 const dragEffect = dragging ? 'shadow-[0_0_30px_rgba(52,211,153,0.5)]! scale-110 z-[100]' : '';

  return (
    <div className={`${baseStyle} ${colorTheme} ${pulseEffect} ${dragEffect} w-full h-full overflow-hidden p-2`}>
      {/* 连接点 - 隐藏但功能存在 */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      
      <div className="flex flex-col items-center justify-center w-full h-full pointer-events-none select-none">
        {/* 标题 - 自动折行 */}
        <div className={`font-bold leading-tight break-words w-full px-1
          ${(isRoot || isHighlighted) ? 'text-[13px] md:text-[14px]' : 'text-[10px] md:text-[11px]'}
        `}>
          {label}
        </div>
        
        {/* 英文翻译 - 必须显示 */}
        {translation && (
          <div className={`mt-1 opacity-80 italic font-medium leading-tight w-full px-1
            ${(isRoot || isHighlighted) ? 'text-[10px]' : 'text-[8px]'}
          `}>
            {translation}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(GraphNode);