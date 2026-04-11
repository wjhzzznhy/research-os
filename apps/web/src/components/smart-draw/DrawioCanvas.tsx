'use client';

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, memo } from 'react';
import { getEmbedUrl } from './drawio/utils/getEmbedUrl';
import { handleEvent } from './drawio/utils/handleEvent';
import { useActions } from './drawio/hooks/useActions';
import { DrawioHandle } from '@/lib/smart-draw/types';

interface DrawioCanvasProps {
  xml?: string | null;
  onSave?: (xml: string) => void;
  onAutosave?: (xml: string) => void;
  onError?: (error: string) => void;
  onLoad?: (data: any) => void;
  onClose?: (data: any) => void;
  onExport?: (data: any) => void;
  autosave?: boolean;
  baseUrl?: string;
  urlParameters?: Record<string, any>;
  configuration?: Record<string, any>;
  exportFormat?: string;
}

const DrawioCanvas = forwardRef<DrawioHandle, DrawioCanvasProps>(function DrawioCanvas(
  {
    xml,
    onSave,
    onAutosave,
    onError,
    onLoad,
    onClose,
    onExport,
    autosave = false,
    baseUrl,
    urlParameters,
    configuration,
    exportFormat = 'xml'
  },
  ref
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const action = useActions(iframeRef as any);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const iframeUrl = getEmbedUrl(baseUrl, urlParameters, !!configuration);

  useImperativeHandle(
    ref,
    () => ({
      ...action,
      exportDiagram: (format: string) => action.exportDiagram({ format }),
      mergeDiagram: (xmlData: string) => action.merge({ xml: xmlData }),
      getXml: action.getXml
    }),
    [action.exportDiagram, action.merge, action.getXml]
  );

  const messageHandler = useCallback((evt: MessageEvent) => {
    handleEvent(
      evt,
      {
        init: () => {
          setIsInitialized(true);
          setIsLoading(false);
        },
        load: (data: any) => {
          if (onLoad) {
            onLoad(data);
          }
        },
        configure: () => {
          if (configuration) {
            action.configure({ config: configuration });
          }
        },
        autosave: (data: any) => {
          if (onSave && data.xml) {
            onSave(data.xml);
          }
        },
        save: (data: any) => {
          if (onSave && data.xml) {
            onSave(data.xml);
          }
        },
        exit: (data: any) => {
          if (onClose) {
            onClose(data);
          }
        },
        export: (data: any) => {
          if (onSave && data.data) {
            onSave(data.data);
          }

          if (onExport) {
            onExport(data);
          }

          if (data.message && data.message.exit && onClose) {
            onClose({
              event: 'exit',
              modified: true,
              parentEvent: data.message.parentEvent || 'export'
            });
          }
        },
        error: (data: any) => {
          const errorMsg = data.message || 'Unknown error occurred';
          setError(errorMsg);
          if (onError) {
            onError(errorMsg);
          }
        },
        merge: (data: any) => {
          if (data.error) {
            console.error('[DrawioCanvas] merge 错误:', data.error, data.message);
            if (onError) {
              onError(`插入失败: ${data.message || data.error}`);
            }
          }
        }
      },
      baseUrl
    );
  }, [action.configure, action.exportDiagram, onSave, onLoad, onClose, onExport, onError, baseUrl, configuration, exportFormat]);

  useEffect(() => {
    window.addEventListener('message', messageHandler);
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [messageHandler]);

  const loadFn = action.load;
  useEffect(() => {
    if (!isInitialized) return;
    const loadObject = {
      xml: xml || '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>',
      autosave: autosave
    };
    loadFn(loadObject);
  }, [isInitialized, xml, autosave, loadFn]);

  // 辅助函数：在当前画布中插入新的 mxCell，保留已有内容
  // 使用自定义事件在 Draw.io iframe 内部执行 JavaScript 来添加 cell
  const insertCellToCanvas = useCallback((newCellXml: string) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) {
      console.warn('[DrawioCanvas] iframe 未就绪');
      return;
    }

    const cellXml = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${newCellXml}</root></mxGraphModel>`;
    action.merge({ xml: cellXml });
  }, [action]);

  const fetchImageBlob = useCallback(async (url: string): Promise<Blob | null> => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.blob();
    } catch (err) {
      console.warn('[DrawioCanvas] 获取图片失败:', url, err);
      return null;
    }
  }, []);

  const insertImageCell = useCallback(async (cellId: string, imageUrl: string, width = 100, height = 100) => {
    if (!isInitialized) {
      console.warn('[DrawioCanvas] Draw.io 尚未初始化，无法插入图标');
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe?.contentWindow?.document) {
      console.warn('[DrawioCanvas] iframe 未就绪');
      return;
    }

    const blob = await fetchImageBlob(imageUrl);
    if (!blob) return;

    try {
      const file = new File([blob], `icon_${Date.now()}.png`, { type: blob.type || 'image/png' });
      const dataTransfer = new iframe.contentWindow.DataTransfer();
      dataTransfer.items.add(file);

      const dropEvent = new iframe.contentWindow.DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer
      });

      iframe.contentWindow.document.dispatchEvent(dropEvent);
    } catch (err) {
      console.error('[DrawioCanvas] 模拟 drop 插入图片失败:', err);
    }
  }, [isInitialized, fetchImageBlob]);

  useEffect(() => {
    const handleInsertIcon = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { icon, imageUrl } = customEvent.detail || {};
      if (!icon || !imageUrl) return;

      if (!isInitialized) {
        console.warn('[DrawioCanvas] Draw.io 尚未初始化，无法插入图标');
        return;
      }

      const newCellId = `icon_${icon.id}_${Date.now()}`;
      insertImageCell(newCellId, imageUrl);
    };

    window.addEventListener('drawio-insert-icon', handleInsertIcon);
    return () => {
      window.removeEventListener('drawio-insert-icon', handleInsertIcon);
    };
  }, [isInitialized, insertImageCell]);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isInitialized) return;

      const iconData = e.dataTransfer?.getData('application/json');
      if (iconData) {
        try {
          const icon = JSON.parse(iconData);
          if (icon && icon.url) {
            const cellId = `dropped_icon_${Date.now()}`;
            insertImageCell(cellId, icon.url);
            return;
          }
        } catch (error) {
          console.warn('Failed to parse icon data:', error);
        }
      }

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (const file of Array.from(files)) {
        try {
          // 处理 Draw.io 文件 (.drawio, .xml)
          if (file.name.endsWith('.drawio') || file.name.endsWith('.xml')) {
            const content = await file.text();
            // 对于文件导入，也使用 export-load 模式避免覆盖
            insertCellToCanvas(content.replace(/<\?xml[^?]*\?>/g, '').replace(/<mxGraphModel[^>]*>/, '').replace(/<\/mxGraphModel>/, '').replace(/<root>/, '').replace(/<\/root>/, '').replace(/<mxCell id="0"[^/]*\/>/, '').replace(/<mxCell id="1"[^/]*\/>/, '').trim());
          }
          // 处理图片文件 - 转换为 base64 data URL
          else if (file.type.startsWith('image/')) {
            insertImageCell(`dropped_image_${Date.now()}`, URL.createObjectURL(file), 200, 200);
          }
        } catch (error) {
          console.error(`处理文件 ${file.name} 失败:`, error);
          if (onError) {
            onError(`无法导入 ${file.name}: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [isInitialized, action, onError]);

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Draw.io editor...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-20 max-w-md">
          <p className="font-bold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={iframeUrl}
        className="w-full h-full border-0 drawio-embed"
        title="Draw.io Editor"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
});

export default memo(DrawioCanvas);
