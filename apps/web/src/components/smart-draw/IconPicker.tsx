'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileCode2,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Search,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconAsset } from '@/types/api';

interface IconPickerProps {
  onSelect: (icon: IconAsset) => void;
  onClose: () => void;
}

interface SearchResponse {
  icons: IconAsset[];
  total: number;
}

function isExcalidrawFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.excalidraw') || name.endsWith('.excalidrawlib') || name.endsWith('.json');
}

async function generateExcalidrawPreview(file: File): Promise<Blob | null> {
  try {
    const content = await file.text();
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      return null;
    }

    const elements = data.elements || [];
    const files = data.files || {};
    if (!elements || elements.length === 0) {
      return null;
    }

    const excalidrawModule = await import('@excalidraw/excalidraw');
    const { exportToCanvas } = excalidrawModule;

    const canvas = await exportToCanvas({
      elements,
      appState: { viewBackgroundColor: '#ffffff' },
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
  } catch {
    return null;
  }
}

export default function IconPicker({ onSelect, onClose }: IconPickerProps) {
  const [query, setQuery] = useState('');
  const [icons, setIcons] = useState<IconAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<IconAsset | null>(null);
  const [imageSearchPreview, setImageSearchPreview] = useState<string | null>(null);
  const [imageSearchName, setImageSearchName] = useState<string | null>(null);
  const [imageSearchFile, setImageSearchFile] = useState<File | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const imageSearchInputRef = useRef<HTMLInputElement | null>(null);
  const searchRequestIdRef = useRef(0);
  const [contextMenu, setContextMenu] = useState<{ icon: IconAsset; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameTarget, setRenameTarget] = useState<IconAsset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewIcon, setPreviewIcon] = useState<IconAsset | null>(null);

  const activeHint = useMemo(() => {
    if (imageSearchFile) {
      return '当前已切换为以图搜图，输入关键词会自动回到文本检索';
    }
    if (query.trim()) {
      return `正在按“${query.trim()}”检索图标`;
    }
    return '支持文本检索、上传图标自动向量化、以图搜图';
  }, [imageSearchFile, query]);

  const safeReadJson = async <T,>(res: Response): Promise<T> => {
    const text = await res.text();
    if (!res.ok) {
      try {
        const data = JSON.parse(text) as { detail?: string };
        throw new Error(data.detail || text || `HTTP ${res.status}`);
      } catch {
        throw new Error(text || `HTTP ${res.status}`);
      }
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error('Invalid JSON response');
    }
  };

  const dedupeIcons = useCallback((items: IconAsset[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.id || item.url;
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, []);

  const handleSelect = useCallback((icon: IconAsset) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    onSelect(icon);
  }, [onSelect]);

  const handleDragStart = useCallback((e: React.DragEvent, icon: IconAsset) => {
    // 设置拖拽数据
    e.dataTransfer.setData('application/json', JSON.stringify(icon));
    e.dataTransfer.setData('text/plain', icon.url);
    e.dataTransfer.effectAllowed = 'copy';
    
    // 设置拖拽时的预览图片
    const dragImage = new Image();
    dragImage.src = icon.url;
    dragImage.onload = () => {
      e.dataTransfer.setDragImage(dragImage, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    };
  }, []);

  const loadIcons = useCallback(async (searchQuery: string) => {
    const requestId = ++searchRequestIdRef.current;
    setLoading(true);
    setFetchError(null);

    try {
      if (!searchQuery.trim()) {
        setIcons([]);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.append('q', searchQuery.trim());
      params.append('top_k', '36');

      const res = await fetch(`/api/v1/icons/search/text?${params.toString()}`);
      const data = await safeReadJson<SearchResponse>(res);

      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      setIcons(Array.isArray(data.icons) ? data.icons : []);
    } catch (err) {
      if (requestId !== searchRequestIdRef.current) {
        return;
      }
      console.error('Failed to fetch icons:', err);
      setIcons([]);
      setFetchError(err instanceof Error ? err.message : '图标服务暂时不可用');
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const runImageSearch = useCallback(async (file: File) => {
    const requestId = ++searchRequestIdRef.current;
    setLoading(true);
    setFetchError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('top_k', '36');

      const res = await fetch('/api/v1/icons/search/image', {
        method: 'POST',
        body: formData,
      });
      const data = await safeReadJson<SearchResponse>(res);

      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      setIcons(Array.isArray(data.icons) ? data.icons : []);
      setImageSearchFile(file);
      setImageSearchName(file.name);
      setImageSearchPreview((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return URL.createObjectURL(file);
      });
    } catch (err) {
      if (requestId !== searchRequestIdRef.current) {
        return;
      }
      console.error('Failed to search icons by image:', err);
      setIcons([]);
      setFetchError(err instanceof Error ? err.message : '图片检索失败');
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const clearImageSearch = useCallback((shouldReload = true) => {
    setImageSearchFile(null);
    setImageSearchName(null);
    setImageSearchPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    if (shouldReload && query.trim()) {
      void loadIcons(query);
    }
  }, [loadIcons, query]);

  const handleSearch = useCallback(() => {
    if (imageSearchFile) {
      return;
    }
    void loadIcons(query);
  }, [imageSearchFile, loadIcons, query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleClose = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    clearImageSearch(false);
    onClose();
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (imageSearchFile) {
      clearImageSearch(false);
    }
  };

  const uploadIconWithProgress = async (file: File) => {
    const formData = new FormData();

    if (isExcalidrawFile(file)) {
      const previewBlob = await generateExcalidrawPreview(file);
      if (!previewBlob) {
        throw new Error('Excalidraw 文件预览图生成失败，无法上传。请确保文件内容有效且包含可渲染的元素。');
      }
      const previewFile = new File([previewBlob], 'preview.png', { type: 'image/png' });
      formData.append('file', previewFile);
      formData.append('name', file.name.replace(/\.[^.]+$/, ''));
      formData.append('style', 'excalidraw-file');
      formData.append('source_file', file);
    } else {
      formData.append('file', file);
      formData.append('name', file.name.replace(/\.[^.]+$/, ''));
    }

    return new Promise<IconAsset>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/v1/icons/upload');

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const parsed = JSON.parse(xhr.responseText || '{}') as IconAsset & { detail?: string };
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(parsed);
            return;
          }
          reject(new Error(parsed.detail || '图标上传失败'));
        } catch {
          reject(new Error(xhr.responseText || '图标上传失败'));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('网络异常，图标上传失败')));
      xhr.send(formData);
    });
  };

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const uploaded = await uploadIconWithProgress(file);
      setUploadSuccess(uploaded);
      setIcons((current) => dedupeIcons([uploaded, ...current]));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '图标上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  }, [dedupeIcons]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      for (const item of Array.from(items)) {
        if (!item.type.startsWith('image/')) {
          continue;
        }
        const file = item.getAsFile();
        if (!file) {
          continue;
        }
        setUploadSuccess(null);
        setUploadError(null);
        void handleUpload(file);
        break;
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleUpload]);

  const handleUploadFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    await handleUpload(file);
  };

  const handleImageSearchFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    await runImageSearch(file);
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, icon: IconAsset) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ icon, x: e.clientX, y: e.clientY });
  }, []);

  const deleteIcon = useCallback(async (iconId: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/icons/${encodeURIComponent(iconId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('删除失败');
      }
      setIcons((prev) => prev.filter((i) => i.id !== iconId));
      setContextMenu(null);
    } catch {
    } finally {
      setDeleting(false);
    }
  }, []);

  const openRenameDialog = useCallback((icon: IconAsset) => {
    setRenameTarget(icon);
    setRenameValue(icon.name || '');
    setContextMenu(null);
  }, []);

  const renameIcon = useCallback(async (iconId: string, newName: string) => {
    setRenaming(true);
    try {
      const res = await fetch(`/api/v1/icons/${encodeURIComponent(iconId)}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        throw new Error('改名失败');
      }
      setIcons((prev) =>
        prev.map((i) => (i.id === iconId ? { ...i, name: newName } : i))
      );
      setRenameTarget(null);
    } catch {
    } finally {
      setRenaming(false);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={handleClose}>
      <div
        className="w-full max-w-3xl flex flex-col rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl max-h-[85vh] border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        onClick={(e) => { e.stopPropagation(); setContextMenu(null); }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <ImageIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">图标检索</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{activeHint}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 space-y-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="输入关键词检索图标，例如：数据库、机器人、容器"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <Button
              type="button"
              onClick={handleSearch}
              disabled={loading || !!imageSearchFile}
              className="rounded-xl shrink-0"
              size="sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              搜索
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => uploadInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              上传图标
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => imageSearchInputRef.current?.click()}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              以图搜图
            </Button>
          </div>

          <input
            ref={uploadInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,.excalidraw,.excalidrawlib,.json"
            className="hidden"
            onChange={handleUploadFileChange}
          />
          <input
            ref={imageSearchInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
            className="hidden"
            onChange={handleImageSearchFileChange}
          />

          {imageSearchPreview && (
            <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900/40 dark:bg-blue-950/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={imageSearchPreview} alt={imageSearchName || 'query image'} className="w-10 h-10 rounded-lg object-cover border border-blue-200 dark:border-blue-900/40" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-blue-900 dark:text-blue-200 truncate">{imageSearchName || '图片检索中'}</div>
                  <div className="text-[11px] text-blue-700 dark:text-blue-300">以图搜图模式</div>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" className="rounded-lg text-xs" onClick={() => clearImageSearch()}>
                清除
              </Button>
            </div>
          )}

          {(uploading || uploadError || uploadSuccess) && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 space-y-2">
              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      上传并自动向量化
                    </div>
                    <span className="text-zinc-500">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={uploadSuccess.url} alt={uploadSuccess.name || uploadSuccess.id} className="w-10 h-10 rounded-lg border border-emerald-200 object-contain p-1.5 bg-white" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        上传成功
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {uploadSuccess.name || uploadSuccess.id}
                        {uploadSuccess.category ? ` · ${uploadSuccess.category}` : ''}
                      </div>
                    </div>
                  </div>
                  <Button type="button" size="sm" className="rounded-lg shrink-0" onClick={() => handleSelect(uploadSuccess)}>
                    使用
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 min-h-0">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              <p className="text-sm">正在检索图标...</p>
            </div>
          ) : fetchError ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm text-center px-4">
              {fetchError}
            </div>
          ) : icons.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Search className="w-12 h-12 opacity-20" />
              <p className="text-sm text-center">{imageSearchFile ? '没有找到相似图片，换一张图再试试' : !query.trim() ? '输入关键词后点击搜索按钮查找图标' : '没有匹配的图标，试试换个关键词或先上传你的图标'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {icons.map((icon) => (
                <button
                  key={icon.id}
                  onClick={() => { setPreviewIcon(icon); setContextMenu(null); }}
                  onContextMenu={(e) => handleContextMenu(e, icon)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, icon)}
                  className="group flex flex-col items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-grab active:cursor-grabbing"
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 rounded-xl p-1.5 shadow-sm group-hover:shadow-md transition-shadow relative">
                    <img
                      src={icon.url}
                      alt={icon.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                    {icon.source_file_url && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm" title="Excalidraw 可编辑">
                        <FileCode2 className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="w-full text-center">
                    <span className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate w-full px-0.5">
                      {icon.name}
                    </span>
                    {icon.source_file_url ? (
                      <span className="inline-flex max-w-full rounded-full bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-[9px] text-blue-600 dark:text-blue-300 truncate mt-0.5">
                        Excalidraw
                      </span>
                    ) : icon.category ? (
                      <span className="inline-flex max-w-full rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {icon.category}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
            支持 PNG / JPG / WEBP / GIF / BMP / Excalidraw，粘贴截图也会自动上传
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="rounded-lg">
            关闭
          </Button>
        </div>
      </div>

      {previewIcon && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setPreviewIcon(null)}
        >
          <div
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 p-5 w-[420px] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-zinc-50 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-4 overflow-hidden">
              {previewIcon.url ? (
                <img
                  src={previewIcon.url}
                  alt={previewIcon.name || 'preview'}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <ImageIcon className="w-12 h-12 text-zinc-300" />
              )}
            </div>

            <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-100 mb-2">
              {previewIcon.name || previewIcon.id}
            </h3>

            {previewIcon.tags && previewIcon.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {previewIcon.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1 rounded-xl"
                onClick={() => {
                  handleSelect(previewIcon);
                  setPreviewIcon(null);
                }}
              >
                使用此图标
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  if (previewIcon.url) {
                    const a = document.createElement('a');
                    a.href = previewIcon.url;
                    a.download = previewIcon.name || 'download';
                    a.target = '_blank';
                    a.click();
                  }
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  openRenameDialog(previewIcon);
                  setPreviewIcon(null);
                }}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/40"
                onClick={() => {
                  if (previewIcon.id) {
                    deleteIcon(previewIcon.id);
                  }
                  setPreviewIcon(null);
                }}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-[70] bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 min-w-[140px] overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            onClick={() => openRenameDialog(contextMenu.icon)}
          >
            <Pencil className="w-3.5 h-3.5" />
            重命名
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            onClick={() => {
              if (contextMenu.icon.id) {
                deleteIcon(contextMenu.icon.id);
              }
            }}
            disabled={deleting}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? '删除中...' : '删除图标'}
          </button>
        </div>
      )}

      {renameTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setRenameTarget(null)}
        >
          <div
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 p-5 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">重命名图标</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameValue.trim()) {
                  renameIcon(renameTarget.id, renameValue.trim());
                }
              }}
              placeholder="输入新名称"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setRenameTarget(null)} className="rounded-lg">
                取消
              </Button>
              <Button
                size="sm"
                className="rounded-lg"
                disabled={!renameValue.trim()}
                loading={renaming}
                onClick={() => renameIcon(renameTarget.id, renameValue.trim())}
              >
                确认
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
