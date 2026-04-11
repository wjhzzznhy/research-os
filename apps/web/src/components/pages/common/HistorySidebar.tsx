//通用的历史记录中间栏
'use client';
import { useHistory } from '@/context/HistoryContext';
import { LeftOutlined, RightOutlined, SearchOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';

interface HistorySidebarProps {
  className?: string;
  position?: 'left' | 'right';
  shadowClassName?: string;
  borderClassName?: string;
  bgClassName?: string;
}

export const HistorySidebar = ({ 
  className = '', 
  position = 'left',
  shadowClassName,
  borderClassName,
  bgClassName
}: HistorySidebarProps) => {
  const { historyState, closeHistory, getModuleHistory } = useHistory();
  const { isOpen, activeModule, title } = historyState;

  if (!isOpen || !activeModule) return null;

  const list = getModuleHistory(activeModule);
  const isRight = position === 'right';

  return (
    <div className={`w-80 h-full flex flex-col animate-in duration-300
      ${borderClassName || (isRight ? 'border-l border-gray-200' : 'border-r border-gray-200')}
      ${shadowClassName || ''}
      ${bgClassName || ''}
      ${isRight ? 'slide-in-from-right' : 'slide-in-from-left'}
      ${className}
    `}
      style={{
        background: bgClassName ? undefined : `
          radial-gradient(circle at top right, rgba(200, 253, 209, 0.08), transparent 60%),
          radial-gradient(circle at bottom left, rgba(200, 253, 232, 0.06), transparent 60%),
          linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(200, 253, 209, 0.03) 50%, rgba(200, 253, 232, 0.03) 100%)
        `
      }}
    >
      {/* 头部 */}
      <div className="p-4 flex items-center justify-between text-gray-600!">
        <div className="flex items-center gap-2 font-bold ">
          <ClockCircleOutlined style={{ fontSize: '16px' }}/>
          <span className='text-[14px]'>{title}</span>
        </div>
        <button onClick={closeHistory} className="p-1 rounded hover:bg-black/5 transition-colors cursor-pointer">
          {isRight ? <RightOutlined /> : <LeftOutlined />}
        </button>
      </div>

      {/* 搜索 */}
      <div className="px-4 mb-4">
        <Input 
          prefix={<SearchOutlined className="text-gray-800/70! cursor-pointer" />} 
          placeholder="请输入搜索内容" 
          // 使用 variant="filled" 或 "borderless" 可以极大减少默认样式的干扰
          variant="filled"
          className="rounded-lg bg-gray-50! hover:bg-white! transition-all"
          style={{ border: '1px solid rgba(0, 0, 0, 0.45)' }} 
        />
      </div>

      {/* 列表渲染 */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {list.length > 0 ? (
          list.map(item => (
            <div key={item.id} className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all border border-transparent hover:border-primary/20">
              <p className="text-sm font-medium line-clamp-2">{item.title}</p>
              <span className="text-[11px] text-gray-400">
                {new Date(item.timestamp).toLocaleDateString()}
              </span>
            </div>
          ))
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-gray-400">
            <p className="text-[14px]">暂无历史记录</p>
          </div>
        )}
      </div>
    </div>
  );
};