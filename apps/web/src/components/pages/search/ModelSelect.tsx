'use client';

import { Select } from 'antd';
import { SendOutlined, DownOutlined } from '@ant-design/icons';
import { ModelOption, SearchMode } from '@/types/pages/search';

interface ModelSelectProps {
  showModelSelector?: boolean;   // 是否显示模型选择器
  options?: ModelOption[];       // 模型列表
  onSend?: () => void;           // 点击发送的回调       
  defaultValue?: string;
  mode?: SearchMode;             // 如果组件需要根据模式变色，也使用全局类型 (提供思路，但暂时不需要)
}

export const ModelSelect = ({ 
  showModelSelector = true, 
  options = [
    { value: 'glm-4.5-air', label: 'GLM-4.5 Air' },
    { value: 'glm-4-plus', label: 'GLM-4 Plus' },
  ],
  onSend,
  defaultValue = "glm-4.5-air"
}: ModelSelectProps) => {
  return (
    <div className="flex items-center gap-3 rounded-full px-2">
      {showModelSelector && (
        <div className="bg-emerald-50 rounded-full items-center shadow-[inset_0_0_0_1px_rgba(26,92,58,0.1)] overflow-hidden">
          <Select
            defaultValue={defaultValue}
            variant="borderless"
            suffixIcon={<DownOutlined className="text-primary! text-[10px]" />}
            // 修复过时警告：使用 classNames 替换 popupClassName
            classNames={{
              popup: {
                root: 'model-select-dropdown'
              }
            }}
            className="model-select-custom h-9 flex items-center [&_.ant-select-selection-item]:text-primary! [&_.ant-select-selection-item]:font-bold!"
              options={options}
          />
        </div>
      )}
      
      {/* 发送按钮 */}
      <button 
        onClick={onSend}
        className="group relative h-10 w-10 flex items-center justify-center rounded-full transition-all duration-300 shadow-sm bg-gray-100 hover:bg-primary border-none outline-none cursor-pointer shrink-0"
      >
        <SendOutlined className="absolute text-lg text-primary! font-bold transition-all duration-300 group-hover:scale-50 group-hover:opacity-0" />
        <SendOutlined className="absolute text-lg text-white! transition-all duration-300 scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 group-hover:-rotate-45" />
      </button>
    </div>
  );
};