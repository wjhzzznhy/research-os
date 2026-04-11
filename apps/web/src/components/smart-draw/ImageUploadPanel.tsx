'use client';

import { useState, useCallback } from 'react';
import { Modal, Button, App, Segmented, Spin } from 'antd';
import { DeleteOutlined, PlusOutlined, FileImageOutlined, FileTextOutlined } from '@ant-design/icons';
import { BaseUploader } from '@/components/pages/common/BaseUploader';
import type { RcFile } from 'antd/es/upload/interface';

type UploadMode = 'image' | 'excalidraw';

interface ImageUploadPanelProps {
  onImageSelect?: (file: RcFile, preview: string) => void;
  onImageRemove?: (index: number) => void;
  maxCount?: number;
  className?: string;
}

interface UploadedItem {
  file: RcFile;
  preview: string;
  iconId?: string;
  type: 'image' | 'excalidraw';
}

function isExcalidrawFile(file: RcFile): boolean {
  const name = file.name.toLowerCase();
  const isExcalidrawExt = name.endsWith('.excalidraw') || name.endsWith('.excalidrawlib');
  const isJsonFile = name.endsWith('.json');
  return isExcalidrawExt || isJsonFile;
}

function isImageFile(file: RcFile): boolean {
  return file.type.startsWith('image/');
}

export function ImageUploadPanel({
  onImageSelect,
  onImageRemove,
  maxCount = 5,
  className = '',
}: ImageUploadPanelProps) {
  const { message } = App.useApp();
  const [items, setItems] = useState<UploadedItem[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [uploadMode, setUploadMode] = useState<UploadMode>('image');
  const [uploading, setUploading] = useState(false);

  const readPreview = useCallback((file: RcFile): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('预览生成失败'));
      reader.readAsDataURL(file);
    });
  }, []);

  const uploadImage = useCallback(async (file: RcFile): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file as File);
    formData.append('name', file.name || `image-${Date.now()}`);
    formData.append('style', 'smart-draw-image');
    formData.append('tags', JSON.stringify(['smart-draw', 'image-upload']));

    const res = await fetch('/api/v1/icons/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    const result = await res.json();
    return result.id;
  }, []);

  const generateExcalidrawPreview = useCallback(async (file: RcFile): Promise<Blob | null> => {
    try {
      const content = await file.text();
      let excalidrawData;
      try {
        excalidrawData = JSON.parse(content);
      } catch {
        console.warn('[ImageUploadPanel] File is not valid JSON, cannot generate Excalidraw preview');
        return null;
      }
      
      const elements = excalidrawData.elements || [];
      const files = excalidrawData.files || {};

      if (!elements || elements.length === 0) {
        console.warn('[ImageUploadPanel] Excalidraw file has no elements to render');
        return null;
      }

      const excalidrawModule = await import('@excalidraw/excalidraw');
      const { exportToCanvas } = excalidrawModule;

      const canvas = await exportToCanvas({
        elements,
        appState: {
          viewBackgroundColor: '#ffffff',
        },
        files,
        scale: 1,
      });

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate preview image'));
          }
        }, 'image/png');
      });
    } catch (error) {
      console.warn('[ImageUploadPanel] Failed to generate Excalidraw preview:', error);
      return null;
    }
  }, []);

  const uploadExcalidrawFile = useCallback(async (file: RcFile): Promise<string> => {
    try {
      const previewBlob = await generateExcalidrawPreview(file);
      
      if (!previewBlob) {
        throw new Error('Excalidraw 文件预览图生成失败，无法上传。请确保文件内容有效且包含可渲染的元素。');
      }
      
      const formData = new FormData();
      
      const previewFile = new File([previewBlob], 'preview.png', { type: 'image/png' });
      formData.append('file', previewFile);
      
      formData.append('name', file.name || `excalidraw-${Date.now()}`);
      formData.append('style', 'excalidraw-file');
      formData.append('tags', JSON.stringify(['excalidraw', 'smart-draw']));
      
      formData.append('source_file', file as File);

      const res = await fetch('/api/v1/icons/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.detail || errorText);
        } catch {
          throw new Error(errorText);
        }
      }
      const result = await res.json();
      return result.id;
    } catch (error) {
      console.error('[ImageUploadPanel] Excalidraw upload error:', error);
      throw error;
    }
  }, [generateExcalidrawPreview]);

  const deleteIcon = useCallback(async (iconId: string) => {
    await fetch(`/api/v1/icons/${encodeURIComponent(iconId)}`, {
      method: 'DELETE',
    });
  }, []);

  const handleUploadSuccess = useCallback(async (file: RcFile) => {
    console.log('[ImageUploadPanel] handleUploadSuccess called with file:', file.name, file.type, file.size);
    
    if (uploading) {
      console.log('[ImageUploadPanel] Already uploading, skipping');
      return;
    }
    
    if (items.length >= maxCount) {
      message.warning(`最多上传 ${maxCount} 个文件`);
      return;
    }

    const isExcalidraw = isExcalidrawFile(file);
    const isImage = isImageFile(file);
    console.log('[ImageUploadPanel] File type check - isExcalidraw:', isExcalidraw, 'isImage:', isImage, 'uploadMode:', uploadMode);

    if (uploadMode === 'image' && !isImage) {
      message.error('当前模式仅支持图片文件，请切换到 Excalidraw 模式上传其他文件');
      return;
    }

    if (uploadMode === 'excalidraw' && !isExcalidraw) {
      message.error('当前模式仅支持 Excalidraw 文件（.excalidraw, .excalidrawlib, .json）');
      return;
    }

    setUploading(true);
    console.log('[ImageUploadPanel] Starting upload...');
    try {
      let preview: string;
      let iconId: string;
      const itemType: 'image' | 'excalidraw' = isExcalidraw ? 'excalidraw' : 'image';

      if (isExcalidraw) {
        console.log('[ImageUploadPanel] Uploading Excalidraw file...');
        preview = '/file-icons/excalidraw.svg';
        iconId = await uploadExcalidrawFile(file);
        console.log('[ImageUploadPanel] Excalidraw upload result:', iconId);
      } else {
        console.log('[ImageUploadPanel] Uploading image file...');
        [preview, iconId] = await Promise.all([readPreview(file), uploadImage(file)]);
        console.log('[ImageUploadPanel] Image upload result:', iconId);
      }

      setItems((prev) => {
        if (prev.length >= maxCount) {
          return prev;
        }
        const newItems = [...prev, { file, preview, iconId, type: itemType }];
        return newItems;
      });
      
      if (itemType === 'image') {
        onImageSelect?.(file, preview);
      }
      
      message.success(isExcalidraw ? 'Excalidraw 文件上传成功' : '图片上传成功，已写入图标库');
      console.log('[ImageUploadPanel] Upload completed successfully');
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      message.error(`上传失败：${text}`);
      console.error('[ImageUploadPanel] Upload error:', error);
    } finally {
      setUploading(false);
    }
  }, [items.length, maxCount, message, onImageSelect, readPreview, uploadImage, uploadExcalidrawFile, uploadMode, uploading]);

  const handleRemove = useCallback((index: number) => {
    const item = items[index];
    if (item?.iconId) {
      void deleteIcon(item.iconId);
    }
    
    setItems((prev) => {
      const newItems = prev.filter((_, i) => i !== index);
      return newItems;
    });
    
    onImageRemove?.(index);
  }, [items, deleteIcon, onImageRemove]);

  const handleClearAll = useCallback(() => {
    setItems((prev) => {
      prev.forEach((item) => {
        if (item.iconId) {
          void deleteIcon(item.iconId);
        }
      });
      return [];
    });
  }, [deleteIcon]);

  const handlePreview = (preview: string) => {
    setPreviewImage(preview);
    setPreviewOpen(true);
  };

  const getAcceptTypes = () => {
    if (uploadMode === 'excalidraw') {
      return '.excalidraw,.excalidrawlib,.json';
    }
    return 'image/*';
  };

  const filteredItems = items.filter(item => {
    if (uploadMode === 'image') return item.type === 'image';
    return item.type === 'excalidraw';
  });

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">素材上传</h3>
            <p className="text-sm text-gray-500 mt-1">上传图片或 Excalidraw 文件</p>
          </div>
          <Segmented
            value={uploadMode}
            onChange={(value) => setUploadMode(value as UploadMode)}
            options={[
              { value: 'image', label: <span className="flex items-center gap-1"><FileImageOutlined /> 图片</span> },
              { value: 'excalidraw', label: <span className="flex items-center gap-1"><FileTextOutlined /> Excalidraw</span> },
            ]}
            size="small"
          />
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {filteredItems.map((item, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
            >
              {item.type === 'image' ? (
                <img
                  src={item.preview}
                  alt={`上传文件 ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => handlePreview(item.preview)}
                />
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => message.info('Excalidraw 文件已上传至图标库')}
                >
                  <FileTextOutlined className="text-3xl text-blue-500 mb-2" />
                  <span className="text-xs text-gray-500 text-center px-2 truncate w-full">{item.file.name}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => handleRemove(items.indexOf(item))}
                />
              </div>
            </div>
          ))}

          {filteredItems.length < maxCount && !uploading && (
            <BaseUploader onSuccess={handleUploadSuccess} accept={getAcceptTypes()}>
              <div className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-primary/50 transition-colors flex flex-col items-center justify-center cursor-pointer">
                <PlusOutlined className="text-xl text-gray-400 mb-1" />
                <span className="text-xs text-gray-400">
                  {uploadMode === 'image' ? '上传图片' : '上传文件'}
                </span>
              </div>
            </BaseUploader>
          )}
          
          {uploading && (
            <div className="aspect-square rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 flex flex-col items-center justify-center">
              <Spin size="small" />
              <span className="text-xs text-primary mt-2">上传中...</span>
            </div>
          )}
        </div>

        {filteredItems.length > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">
              已上传 {filteredItems.length}/{maxCount} 个
            </span>
            <Button
              type="link"
              size="small"
              onClick={handleClearAll}
              className="text-gray-500"
            >
              清空全部
            </Button>
          </div>
        )}

        {filteredItems.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            {uploadMode === 'image' 
              ? '暂无图片，点击上方区域上传' 
              : '暂无 Excalidraw 文件，点击上方区域上传（支持 .excalidraw, .excalidrawlib, .json）'}
          </div>
        )}
      </div>

      <Modal
        open={previewOpen}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        width={600}
        centered
      >
        <img src={previewImage} alt="预览" className="w-full h-auto" />
      </Modal>
    </div>
  );
}
