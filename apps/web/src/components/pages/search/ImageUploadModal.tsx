'use client';
import { Modal, Button } from 'antd';
import { CloudUploadOutlined } from '@ant-design/icons';
import { BaseUploader } from '@/components/pages/common/BaseUploader';
import { useEffect } from 'react';
import type { RcFile } from 'antd/es/upload/interface';

interface ImageUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: (file: RcFile) => void;
}

export const ImageUploadModal = ({ open, onClose, onUploadSuccess }: ImageUploadModalProps) => {
  
  useEffect(() => {
    if (!open) return;
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image")) {
          const file = items[i].getAsFile();
          if (file) onUploadSuccess(file as RcFile);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [open, onUploadSuccess]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={560} // 保持 Modal 较宽
      closable={true}
      styles={{ 
        body: { 
              padding: '27px 20px', // 增加左右间距，让内容在长方形中心
              display: 'flex',
              justifyContent: 'center'
            }
      }}
    >
      {/* w-[480px] 决定了内部虚线框的横向宽度，py-6 决定了高度 */}
      <div className="w-full max-w-[480px]"> 
        <BaseUploader onSuccess={onUploadSuccess}>
          <div className="
            flex flex-col items-center justify-center py-6 px-6 cursor-pointer 
            border border-dashed border-primary/40! rounded-2xl
            hover:border-primary! hover:bg-gray-50 transition-all
          ">
            <CloudUploadOutlined className="text-4xl text-primary/80! mb-3" />
            <p className="text-gray-600 font-medium text-[15px] mb-1">拖拽、Ctrl + V 粘贴图片至此</p>
            <p className="text-gray-400 text-xs mb-5 text-center">支持 JPG, PNG, WEBP 等格式</p>
            <Button type="primary" className="rounded-lg px-10 h-9 bg-primary! hover:bg-primary/90! border-none">
              上传图片
            </Button>
            </div>
        </BaseUploader>
      </div>
    </Modal>
  );
};