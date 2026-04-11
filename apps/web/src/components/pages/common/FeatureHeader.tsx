'use client';
import React from 'react';

interface FeatureHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;       // 接收任意图标组件，可选
  tag?: string;                // 标签可选
  colorClass?: string;         // 自定义渐变色，例如 "from-blue-500 to-blue-700"
  align?: 'left' | 'center';   // 对齐方式，默认左对齐
}

export const FeatureHeader = ({ 
  title, 
  tag, 
  description, 
  icon, 
  colorClass = "from-[#208848] to-[#1a5c3a]" ,
  align = 'left'
}: FeatureHeaderProps) => {
  if (align === 'center') {
    return (
      <div className="w-full mb-8 text-center animate-in fade-in zoom-in-95 duration-700">
        <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3 tracking-tight">
          {title}
          {tag && (
            <span className="text-[13px] font-medium px-4 py-1.5 rounded-xl border border-green-200 bg-green-50 text-primary shadow-sm">
              {tag}
            </span>
          )}
        </h1>
        {description && <p className="text-gray-500 mt-4 text-[15px]">{description}</p>}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl flex items-start gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* 渐变图标容器 */}
      <div className={`w-16 h-16 bg-linear-to-br ${colorClass} rounded-full flex items-center justify-center shadow-lg shadow-green-900/10 shrink-0`}>
        <div className="text-white text-2xl flex items-center justify-center">
          {icon}
        </div>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold text-gray-800 tracking-tight">{title}</h1>
          {tag && (
            <span className="bg-linear-to-r from-primary to-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium shadow-sm">
              {tag}
            </span>
          )}
        </div>
        <p className="text-gray-500 text-[15px] max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};