'use client';

import { useState, useCallback } from 'react';
import { Tabs, Modal, Button, Spin, Input, App, Popconfirm } from 'antd';
import { AppstoreOutlined, PictureOutlined, DownloadOutlined, SearchOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useSearch } from '@/hooks';
import type { IconAsset } from '@/types/api';

interface IconCardProps {
  icon: IconAsset;
  onPreview: () => void;
}

function IconCard({ icon, onPreview }: IconCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onPreview}
      className="border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary/50 transition-all overflow-hidden group"
    >
      <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden relative">
        {icon.url && !imageError ? (
          <img
            src={icon.url}
            alt={icon.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <PictureOutlined className="text-2xl mb-1" />
            <span className="text-xs">加载失败</span>
          </div>
        )}
      </div>
      <div className="p-2 text-left">
        <div className="text-sm font-medium text-gray-700 truncate">
          {icon.name}
        </div>
        {icon.tags && icon.tags.length > 0 && (
          <div className="text-xs text-gray-400 truncate mt-1">
            {icon.tags.slice(0, 3).join(', ')}
          </div>
        )}
      </div>
    </button>
  );
}

interface IconGalleryProps {
  onIconSelect?: (icon: IconAsset) => void;
  className?: string;
}

export function IconGallery({
  onIconSelect,
  className = '',
}: IconGalleryProps) {
  const { message } = App.useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [previewItem, setPreviewItem] = useState<IconAsset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameModalOpen, setRenameModalOpen] = useState(false);

  const {
    searchIcons,
    searching,
    iconResults,
    error
  } = useSearch();

  const deleteIcon = useCallback(async (iconId: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/icons/${encodeURIComponent(iconId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      message.success('图标已删除');
      setPreviewItem(null);
      setSearchQuery('');
    } catch (err) {
      message.error(`删除失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeleting(false);
    }
  }, [message]);

  const renameIcon = useCallback(async (iconId: string, newName: string) => {
    setRenaming(true);
    try {
      const res = await fetch(`/api/v1/icons/${encodeURIComponent(iconId)}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: '改名失败' }));
        throw new Error(errData.detail || '改名失败');
      }
      message.success('图标已改名');
      setPreviewItem((prev) => prev ? { ...prev, name: newName } : null);
      setRenameModalOpen(false);
    } catch (err) {
      message.error(`改名失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRenaming(false);
    }
  }, [message]);

  const openRenameModal = useCallback((icon: IconAsset) => {
    setRenameValue(icon.name || '');
    setRenameModalOpen(true);
  }, []);

  const executeSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      return;
    }
    searchIcons(searchQuery).catch(() => {});
  }, [searchQuery, searchIcons]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeSearch();
    }
  }, [executeSearch]);

  const handleItemSelect = (item: IconAsset) => {
    onIconSelect?.(item);
    setPreviewItem(null);
  };

  const handleDownload = (item: IconAsset) => {
    if (item.url) {
      const a = document.createElement('a');
      a.href = item.url;
      a.download = item.name || 'download';
      a.target = '_blank';
      a.click();
    }
  };

  const renderGrid = () => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-96 overflow-y-auto p-4">
      {iconResults?.icons?.length === 0 && (
        <div className="col-span-full text-center py-8 text-gray-400">
          未找到图标
        </div>
      )}
      {iconResults?.icons?.map((icon) => (
        <IconCard
          key={icon.id}
          icon={icon}
          onPreview={() => setPreviewItem(icon)}
        />
      ))}
    </div>
  );

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      <div className="px-4 py-3 flex gap-2 items-center">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索图标..."
          className="w-48"
          allowClear
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={executeSearch}
          loading={searching}
          disabled={!searchQuery.trim()}
        >
          搜索
        </Button>
      </div>

      {searching ? (
        <div className="flex justify-center py-8"><Spin /></div>
      ) : (
        renderGrid()
      )}

      {error && (
        <div className="px-4 py-2 text-red-500 text-sm">
          {error.message}
        </div>
      )}

      <Modal
        open={!!previewItem}
        onCancel={() => setPreviewItem(null)}
        footer={null}
        width={480}
        centered
      >
        {previewItem && (
          <div className="p-4">
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
              {previewItem.url ? (
                <img
                  src={previewItem.url}
                  alt={previewItem.name || 'preview'}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <PictureOutlined className="text-4xl text-gray-300" />
              )}
            </div>

            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {previewItem.name || previewItem.id}
            </h3>

            {previewItem.tags && previewItem.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {previewItem.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="primary"
                onClick={() => handleItemSelect(previewItem)}
                className="flex-1"
              >
                使用此图标
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(previewItem)}
              >
                下载
              </Button>
              <Button
                icon={<EditOutlined />}
                onClick={() => openRenameModal(previewItem)}
              >
                改名
              </Button>
              {previewItem.id && (
                <Popconfirm
                  title="确认删除"
                  description="删除后无法恢复，确定要删除此图标吗？"
                  onConfirm={() => deleteIcon(previewItem.id)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true, loading: deleting }}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={deleting}
                  >
                    删除
                  </Button>
                </Popconfirm>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={renameModalOpen}
        title="重命名图标"
        onCancel={() => setRenameModalOpen(false)}
        onOk={() => {
          if (previewItem?.id && renameValue.trim()) {
            renameIcon(previewItem.id, renameValue.trim());
          }
        }}
        okText="确认"
        cancelText="取消"
        confirmLoading={renaming}
        okButtonProps={{ disabled: !renameValue.trim() }}
        centered
      >
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          placeholder="输入新名称"
          onPressEnter={() => {
            if (previewItem?.id && renameValue.trim()) {
              renameIcon(previewItem.id, renameValue.trim());
            }
          }}
        />
      </Modal>
    </div>
  );
}
