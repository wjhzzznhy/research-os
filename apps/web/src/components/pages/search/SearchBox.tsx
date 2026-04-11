'use client';

import { useState } from 'react';
import { Input, Button } from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import { ImageUploadModal } from './ImageUploadModal';
import type { RcFile } from 'antd/es/upload/interface';
import { SearchMode, SearchRequest } from '@/types/pages/search';

interface SearchBoxProps {
  value: string;
  onChange: (val: string) => void;
  mode: SearchMode;
  bottomExtra?: React.ReactNode;
}

export const SearchBox = ({ value, onChange, mode, bottomExtra }: SearchBoxProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleImageSuccess = (file: RcFile) => {
    console.log("上传成功:", file.name);
    setIsModalOpen(false);
    // 这里可以后续添加将图片显示在输入框的逻辑
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-[24px] shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      <div className="relative p-4 flex gap-2 items-start">
        {mode === 'smart' && (
          <Button 
            icon={<PictureOutlined />} 
            type="text" 
            className="mt-1 hover:text-gray-600! hover:bg-gray-100! rounded-full! w-9 h-9 flex items-center justify-center border border-gray-200! shrink-0" 
            onClick={() => setIsModalOpen(true)}
          />
        )}
        <Input.TextArea 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={mode === 'simple' ? "请输入搜索内容..." : "请输入想检索的问题..."}
          autoSize={{ minRows: 3, maxRows: 8 }}
          variant="borderless"
          className="text-[17px] p-2 resize-none! placeholder:text-gray-200 focus:shadow-none"
        />
      </div>

      <div className="flex justify-between items-center px-4 pb-4">
        {bottomExtra}
      </div>

      {/* 弹窗逻辑独立，不干扰 SearchBox 内部样式 */}
      <ImageUploadModal 
        open={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={handleImageSuccess}
      />
    </div>
  );
};