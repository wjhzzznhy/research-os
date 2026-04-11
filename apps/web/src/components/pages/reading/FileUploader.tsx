'use client';

import { Button } from 'antd';
import { UploadOutlined, LayoutOutlined } from '@ant-design/icons';
import { BaseUploader } from '@/components/pages/common/BaseUploader';
import { useReading } from '@/context/ReadingContext';

export const FileUploader = ({ onLibraryClick }: { onLibraryClick: () => void }) => {
  const { startParsing, isParsing } = useReading();
  
  return (
    <div className="w-full max-w-4xl group">
      <div className="
        rounded-[40px] overflow-hidden border border-dashed 
        border-primary/60! transition-all duration-300
        group-hover:border-primary! group-hover:bg-white/60!
        bg-white/40! backdrop-blur-md
      ">
        <BaseUploader 
          onSuccess={(file) => startParsing(file)}
          accept="application/pdf"
          className="hover:border-none!"
        >
          <div className="flex flex-col items-center justify-center py-20 cursor-pointer">
            {/* 4. 根据解析状态显示不同的文字 */}
            <h2 className="text-primary text-xl font-medium mb-2">
              {isParsing ? '正在准备解析资源...' : '拖放或点击可上传文件'}
            </h2>
            <p className="text-gray-400 text-sm mb-10">支持PDF文件，不超过50M</p>

            <div className="flex gap-4">
              <Button 
                icon={<UploadOutlined />} 
                size="large" 
                className="rounded-xl!"
                loading={isParsing} // 解析时显示加载圈
              >
                上传本地文献
              </Button>
              <Button 
                icon={<LayoutOutlined />} 
                size="large" 
                className="rounded-xl!"
                onClick={(e) => { e.stopPropagation(); onLibraryClick(); }}
              >
                前往我的知识库
              </Button>
            </div>
          </div>
        </BaseUploader>
      </div>
    </div>
  );
};