// components/pages/knowledge/NoteUploadModal.tsx
'use client';
import { Modal, Button, Divider } from 'antd';
import { EditOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { BaseUploader } from '@/components/pages/common/BaseUploader';
import { useEffect } from 'react';
import type { RcFile } from 'antd/es/upload/interface';

interface NoteUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: (file: File | RcFile) => void;
  onNewNote: () => void; // 处理直接新建逻辑
}

export const NoteUploadModal = ({ open, onClose, onUploadSuccess, onNewNote }: NoteUploadModalProps) => {
  
  // 复用粘贴逻辑：支持粘贴文本作为笔记内容
  useEffect(() => {
    if (!open) return;
    const handlePaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text');
      if (text) {
        // 将粘贴的文本转为虚拟 File 对象
        const blob = new Blob([text], { type: 'text/plain' });
        const file = new File([blob], `pasted-note-${Date.now()}.txt`, { type: 'text/plain' });
        onUploadSuccess(file);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [open, onUploadSuccess]);

  return (
    <Modal open={open} onCancel={onClose} footer={null} centered width={500} closable={true}>
      <div className="p-2 flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-6">创建阅读笔记</h3>
        
        {/* 直接新建 */}
        <Button 
          type="primary" 
          icon={<EditOutlined />} 
          size="large" 
          block 
          className="h-14 rounded-xl text-base mb-4 bg-primary!"
          onClick={onNewNote}
        >
          直接新建空白笔记
        </Button>

        <Divider className="my-1">或者</Divider>

        {/* 复用 BaseUploader 上传文件 */}
        <div className="w-full mt-1">
          <BaseUploader 
            accept=".md,.txt,.docx" 
            onSuccess={onUploadSuccess}
          >
            <div className="flex flex-col items-center py-8 border border-dashed hover:border-primary-800! rounded-xl border-primary/40! hover:bg-gray-50 transition-all cursor-pointer">
              <CloudUploadOutlined className="text-3xl text-primary/80! mb-2" />
              <p className="text-sm text-gray-600">拖拽、点击或 Ctrl+V 粘贴内容</p>
              <p className="text-xs text-gray-400 mt-1">支持 .md, .txt, .docx</p>
            </div>
          </BaseUploader>
        </div>
      </div>
    </Modal>
  );
};