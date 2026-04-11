'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { hydrateExcalidrawImages } from '@/lib/smart-draw/excalidraw-image-processor';
import type {
  BinaryFileData,
  BinaryFiles,
  ExcalidrawElement,
  ExcalidrawImperativeAPI,
} from '@/lib/smart-draw/excalidraw/types';

// Dynamically import Excalidraw with no SSR
const Excalidraw = dynamic<any>(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false }
);

// Dynamically import utils
const loadUtils = async () => {
  const excalidrawModule = await import('@excalidraw/excalidraw');
  return {
    convertToExcalidrawElements: excalidrawModule.convertToExcalidrawElements,
    getSceneVersion: excalidrawModule.getSceneVersion
  };
};

const loadLibraryItems = async (retries = 6, delayMs = 1200) => {
  try {
    const res = await fetch('/api/v1/icons/stats/overview');
    if (res.ok) {
      return { libraryItems: [] };
    }
  } catch (error) {
    console.warn('素材库加载失败，使用空数据:', error);
  }
  
  return { libraryItems: [] };
};

interface ExcalidrawCanvasProps {
  elements: any[];
  initialFiles?: BinaryFiles;
  onChange: (elements: readonly ExcalidrawElement[], appState: any, files: BinaryFiles) => void;
  showNotification: (notification: { title: string; message: string; type: 'success' | 'error' | 'info' }) => void;
}

interface ExcalidrawUtils {
  convertToExcalidrawElements: ((elements: any[]) => ExcalidrawElement[]) | null;
  getSceneVersion: ((elements: readonly ExcalidrawElement[]) => number) | null;
}

// Helper to deduplicate elements by ID to avoid React key errors
const deduplicateElements = (elements: any[]) => {
  const seen = new Set();
  return elements.filter((el) => {
    if (!el.id) return true;
    if (seen.has(el.id)) return false;
    seen.add(el.id);
    return true;
  });
};

const ensureLinearElementPoints = (elements: any[]): any[] => {
  return elements.map((el) => {
    if (el.type !== 'arrow' && el.type !== 'line') return el;
    if (Array.isArray(el.points) && el.points.length > 0) return el;
    const w = el.width || 0;
    const h = el.height || 0;
    return { ...el, points: [[0, 0], [w, h]] };
  });
};

export default function ExcalidrawCanvas({ elements, initialFiles, onChange, showNotification }: ExcalidrawCanvasProps) {
  const [utils, setUtils] = useState<ExcalidrawUtils>({ convertToExcalidrawElements: null, getSceneVersion: null });
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [hydratedElements, setHydratedElements] = useState<ExcalidrawElement[]>([]);
  const [hydratedFiles, setHydratedFiles] = useState<BinaryFiles>({});
  const lastSceneVersionRef = useRef(0);
  const skipProgrammaticChangeRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const libraryLoadedRef = useRef(false);
  const latestFilesRef = useRef<BinaryFiles>(initialFiles || {});
  const initialSyncDoneRef = useRef(false);

  useEffect(() => {
    const originalAddEventListener = window.addEventListener.bind(window) as any;
    const originalRemoveEventListener = window.removeEventListener.bind(window) as any;

    window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
      if (!listener) return;
      originalAddEventListener(type === 'unload' ? 'pagehide' : type, listener, options);
    }) as typeof window.addEventListener;

    window.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) => {
      if (!listener) return;
      originalRemoveEventListener(type === 'unload' ? 'pagehide' : type, listener, options);
    }) as typeof window.removeEventListener;

    return () => {
      window.addEventListener = originalAddEventListener as typeof window.addEventListener;
      window.removeEventListener = originalRemoveEventListener as typeof window.removeEventListener;
    };
  }, []);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!excalidrawAPI) return;
    if (initialSyncDoneRef.current) return;
    if (hydratedElements.length === 0) return;

    initialSyncDoneRef.current = true;

    const mergedFiles = { ...(initialFiles || {}), ...hydratedFiles };
    if (Object.keys(mergedFiles).length > 0) {
      excalidrawAPI.addFiles(Object.values(mergedFiles));
    }
    skipProgrammaticChangeRef.current = true;
    excalidrawAPI.updateScene({ elements: hydratedElements as ExcalidrawElement[] });
  }, [excalidrawAPI, hydratedElements, initialFiles, hydratedFiles]);

  useEffect(() => {
    if (!excalidrawAPI || libraryLoadedRef.current) return;
    libraryLoadedRef.current = true;

    const run = async () => {
      try {
        const items = await loadLibraryItems();
        if (Array.isArray(items) && items.length > 0) {
          await excalidrawAPI.updateLibrary?.({
            libraryItems: items,
            merge: true,
            defaultStatus: 'unpublished',
          });
          showNotification?.({
            title: '素材库已加载',
            message: `已加载 ${items.length} 条素材`,
            type: 'success',
          });
        } else {
          showNotification?.({
            title: '素材库为空',
            message: '未检测到已上传的 Excalidraw 素材库条目。',
            type: 'info',
          });
        }
      } catch (e) {
        showNotification?.({
          title: '素材库加载失败',
          message: (e as Error).message || String(e),
          type: 'error',
        });
      }
    };

    run();
  }, [excalidrawAPI, showNotification]);

  useEffect(() => {
    if (!excalidrawAPI) return;

    const onUpdated = async () => {
      try {
        const items = await loadLibraryItems();
        if (Array.isArray(items) && items.length > 0) {
          await excalidrawAPI.updateLibrary?.({
            libraryItems: items,
            merge: true,
            defaultStatus: 'unpublished',
          });
          showNotification?.({
            title: '素材库已刷新',
            message: `已加载 ${items.length} 条素材`,
            type: 'success',
          });
        } else {
          showNotification?.({
            title: '素材库为空',
            message: '未检测到已上传的 Excalidraw 素材库条目。',
            type: 'info',
          });
        }
      } catch (e) {
        showNotification?.({
          title: '素材库刷新失败',
          message: (e as Error).message || String(e),
          type: 'error',
        });
      }
    };

    window.addEventListener('materials-library-updated', onUpdated as any);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'materials-library-updated') {
        void onUpdated();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('materials-library-updated', onUpdated as any);
      window.removeEventListener('storage', onStorage);
    };
  }, [excalidrawAPI, showNotification]);

  // Load convert function on mount
  useEffect(() => {
    loadUtils().then(loadedUtils => {
      setUtils(loadedUtils as any);
    });
  }, []);

  // Check if elements are already in full Excalidraw format (have version property)
  const isFullExcalidrawFormat = (els: any[]) => {
    if (!els || els.length === 0) return false;
    // Full format elements have version and versionNonce properties
    return els[0].version !== undefined && els[0].versionNonce !== undefined;
  };

  // Convert elements to Excalidraw format (only if needed)
  const { convertedElements, conversionError } = useMemo(() => {
    if (!elements || elements.length === 0) {
      return { convertedElements: [] as ExcalidrawElement[], conversionError: null };
    }

    // If elements are already in full format, use them directly
    if (isFullExcalidrawFormat(elements)) {
      const uniqueElements = deduplicateElements(elements);
      const safeElements = ensureLinearElementPoints(uniqueElements);
      return { convertedElements: safeElements as ExcalidrawElement[], conversionError: null };
    }

    // Otherwise, convert from skeleton format
    if (!utils.convertToExcalidrawElements) {
      return { convertedElements: [] as ExcalidrawElement[], conversionError: null };
    }

    try {
      const converted = utils.convertToExcalidrawElements(elements);
      const uniqueConverted = deduplicateElements(converted);
      const safeConverted = ensureLinearElementPoints(uniqueConverted);
      return {
        convertedElements: safeConverted,
        conversionError: null,
      };
    } catch (error) {
      console.error('Failed to convert elements:', error);
      return { convertedElements: [] as ExcalidrawElement[], conversionError: error };
    }
  }, [elements, utils.convertToExcalidrawElements]);

  // Notify user when conversion fails (side-effect after render)
  useEffect(() => {
    if (conversionError && showNotification) {
      showNotification({
        title: '画布解析失败',
        message: '生成的绘图代码解析时出现问题，请在聊天消息中点击「重新生成」后重试。',
        type: 'error',
      });
    }
  }, [conversionError, showNotification]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      console.log('[ExcalidrawCanvas] convertedElements changed:', convertedElements?.length);
      
      if (!convertedElements || convertedElements.length === 0) {
        console.log('[ExcalidrawCanvas] Clearing canvas, convertedElements is empty');
        setHydratedElements([]);
        setHydratedFiles({});
        
        const api = excalidrawAPIRef.current;
        if (api) {
          console.log('[ExcalidrawCanvas] Calling updateScene with empty elements');
          skipProgrammaticChangeRef.current = true;
          api.updateScene({ elements: [] });
        } else {
          console.log('[ExcalidrawCanvas] API not available yet');
        }
        return;
      }

      const hasPendingImage = convertedElements.some((el) => {
        if (!el || el.type !== 'image') return false;
        const fileId = (el as any).fileId;
        return (
          typeof fileId === 'string' &&
          (fileId.startsWith('http://') || fileId.startsWith('https://') || fileId.startsWith('/'))
        );
      });

      if (!hasPendingImage) {
        const mergedFiles = { ...(initialFiles || {}), ...hydratedFiles };
        setHydratedElements(convertedElements as ExcalidrawElement[]);
        setHydratedFiles(mergedFiles);
        latestFilesRef.current = mergedFiles;

        const api = excalidrawAPIRef.current;
        if (api) {
          if (Object.keys(mergedFiles).length > 0) {
            api.addFiles(Object.values(mergedFiles));
          }
          skipProgrammaticChangeRef.current = true;
          api.updateScene({ elements: convertedElements as ExcalidrawElement[] });
        }
        return;
      }

      try {
        const { elements: nextElements, files } = await hydrateExcalidrawImages(
          convertedElements as ExcalidrawElement[],
          { ...(initialFiles || {}), ...hydratedFiles },
        );

        if (cancelled) return;

        const mergedFiles = { ...(initialFiles || {}), ...hydratedFiles, ...files };
        setHydratedElements(nextElements);
        setHydratedFiles(mergedFiles);
        latestFilesRef.current = mergedFiles;

        const api = excalidrawAPIRef.current;
        if (api) {
          if (Object.keys(mergedFiles).length > 0) {
            api.addFiles(Object.values(mergedFiles));
          }
          skipProgrammaticChangeRef.current = true;
          api.updateScene({ elements: nextElements });
        }
      } catch {
        if (cancelled) return;
        setHydratedElements(convertedElements as ExcalidrawElement[]);
        setHydratedFiles(initialFiles || {});
        latestFilesRef.current = initialFiles || {};
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [convertedElements, initialFiles]);

  useEffect(() => {
    const handleForceSave = () => {
      const api = excalidrawAPIRef.current;
      if (!api) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const elements = api.getSceneElements();
      const files = latestFilesRef.current;

      if (onChangeRef.current) {
        onChangeRef.current(elements, {}, files);
      }
    };

    window.addEventListener('excalidraw-force-save', handleForceSave);
    return () => {
      window.removeEventListener('excalidraw-force-save', handleForceSave);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      const api = excalidrawAPIRef.current;
      if (api && onChangeRef.current) {
        const elements = api.getSceneElements();
        const files = latestFilesRef.current;
        onChangeRef.current(elements, {}, files);
      }
    };
  }, []);

  // 监听插入图标事件（从 useExcalidrawEngine 触发，需要在当前视口中心插入）
  useEffect(() => {
    const handleInsertIconAtViewport = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { icon } = customEvent.detail || {};
      if (!icon) return;

      const api = excalidrawAPIRef.current;
      if (!api) return;

      console.log('[ExcalidrawCanvas] 在视口中心插入图标:', icon);

      const appState = api.getAppState();
      const zoom = appState.zoom?.value ?? 1;
      const scrollX = appState.scrollX ?? 0;
      const scrollY = appState.scrollY ?? 0;
      const offsetLeft = appState.offsetLeft ?? 0;
      const offsetTop = appState.offsetTop ?? 0;

      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;
      const canvasX = -scrollX + (viewportCenterX - offsetLeft) / zoom;
      const canvasY = -scrollY + (viewportCenterY - offsetTop) / zoom;

      try {
        if (icon.source_file_url) {
          const response = await fetch(icon.source_file_url);
          if (!response.ok) throw new Error(`Failed to fetch source file: ${response.status}`);
          const sourceData = await response.json();

          const sourceElements = Array.isArray(sourceData) ? sourceData : (sourceData.elements || []);
          const sourceFiles = sourceData.files || {};

          if (sourceElements.length === 0) {
            console.warn('[ExcalidrawCanvas] Excalidraw 源文件无元素，回退为图片插入');
            throw new Error('No elements in source file');
          }

          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const el of sourceElements) {
            const x = el.x ?? 0;
            const y = el.y ?? 0;
            const w = el.width ?? 0;
            const h = el.height ?? 0;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x + w > maxX) maxX = x + w;
            if (y + h > maxY) maxY = y + h;
          }
          const offsetX = canvasX - (minX + (maxX - minX) / 2);
          const offsetY = canvasY - (minY + (maxY - minY) / 2);

          const timestamp = Date.now();
          const remappedFiles: Record<string, any> = {};
          const fileIdMap: Record<string, string> = {};

          for (const [oldFileId, fileData] of Object.entries(sourceFiles) as [string, any][]) {
            const newFileId = `file_${timestamp}_${oldFileId}`;
            fileIdMap[oldFileId] = newFileId;
            remappedFiles[newFileId] = {
              ...fileData,
              id: newFileId,
            };
          }

          const remappedElements = sourceElements.map((el: any, index: number) => {
            const newEl = {
              ...el,
              id: `${el.id || 'el'}_${timestamp}_${index}`,
              x: (el.x ?? 0) + offsetX,
              y: (el.y ?? 0) + offsetY,
              updated: timestamp,
              version: (el.version ?? 0) + 1,
              versionNonce: timestamp + index,
              seed: (el.seed ?? 0) + timestamp,
            };
            if (el.fileId && fileIdMap[el.fileId]) {
              newEl.fileId = fileIdMap[el.fileId];
              newEl.status = 'saved';
            }
            if (el.boundElements) {
              newEl.boundElements = el.boundElements.map((be: any) => ({
                ...be,
                id: `${be.id || 'be'}_${timestamp}`,
              }));
            }
            return newEl;
          });

          const { elements: hydratedElements, files: newFiles } = await hydrateExcalidrawImages(
            remappedElements,
            remappedFiles,
          );

          const currentElements = api.getSceneElements();
          const lastIndex = currentElements.length > 0
            ? (currentElements[currentElements.length - 1] as any).index
            : null;

          const elementsWithIndex = hydratedElements.map((el: any, i: number) => ({
            ...el,
            index: lastIndex ? lastIndex + 'Z' + i : 'a' + i,
          }));

          if (Object.keys(newFiles).length > 0) {
            api.addFiles(Object.values(newFiles));
            setHydratedFiles((prev) => ({ ...prev, ...newFiles }));
            latestFilesRef.current = { ...latestFilesRef.current, ...newFiles };
          }

          const newSceneElements = [...currentElements, ...elementsWithIndex];
          skipProgrammaticChangeRef.current = true;
          api.updateScene({ elements: newSceneElements });
          setHydratedElements(newSceneElements as ExcalidrawElement[]);

          if (onChangeRef.current) {
            onChangeRef.current(newSceneElements, {}, latestFilesRef.current);
          }

          console.log('[ExcalidrawCanvas] Excalidraw 源文件元素已插入:', hydratedElements.length, '个元素');
          showNotification?.({
            title: '插入成功',
            message: `已插入 ${hydratedElements.length} 个 Excalidraw 元素`,
            type: 'success',
          });
        } else {
          const timestamp = Date.now();
          const tempElement = {
            type: "image",
            id: `icon_${icon.id}_${timestamp}`,
            x: canvasX - 50,
            y: canvasY - 50,
            width: 100,
            height: 100,
            angle: 0,
            strokeColor: "#000000",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 0,
            opacity: 100,
            groupIds: [],
            frameId: null,
            roundness: null,
            seed: timestamp,
            version: 1,
            versionNonce: timestamp,
            isDeleted: false,
            boundElements: null,
            updated: timestamp,
            link: null,
            locked: false,
            fileId: icon.url,
            scale: [1, 1],
            crop: null,
            status: "pending",
          };

          const { elements: hydratedElements, files: newFiles } = await hydrateExcalidrawImages(
            [tempElement as any],
            {},
          );

          const hydratedElement = hydratedElements[0];
          if (!hydratedElement) {
            console.error('[ExcalidrawCanvas] Hydration 失败');
            return;
          }

          const currentElements = api.getSceneElements();
          const lastIndex = currentElements.length > 0
            ? (currentElements[currentElements.length - 1] as any).index
            : null;
          const newIndex = lastIndex ? lastIndex + 'Z' : 'a0';
          (hydratedElement as any).index = newIndex;

          if (Object.keys(newFiles).length > 0) {
            api.addFiles(Object.values(newFiles));
            setHydratedFiles((prev) => ({ ...prev, ...newFiles }));
            latestFilesRef.current = { ...latestFilesRef.current, ...newFiles };
          }

          const newElements = [...currentElements, hydratedElement];
          skipProgrammaticChangeRef.current = true;
          api.updateScene({ elements: newElements });
          setHydratedElements(newElements as ExcalidrawElement[]);

          if (onChangeRef.current) {
            onChangeRef.current(newElements, {}, latestFilesRef.current);
          }

          console.log('[ExcalidrawCanvas] 图片图标已插入');
          showNotification?.({
            title: '插入成功',
            message: '图标已插入到画布',
            type: 'success',
          });
        }
      } catch (error) {
        console.error('[ExcalidrawCanvas] 插入图标失败:', error);
        showNotification?.({
          title: '插入失败',
          message: '图标插入失败，请重试',
          type: 'error',
        });
      }
    };

    window.addEventListener('excalidraw-insert-icon-at-viewport', handleInsertIconAtViewport);
    return () => {
      window.removeEventListener('excalidraw-insert-icon-at-viewport', handleInsertIconAtViewport);
    };
  }, [excalidrawAPI, showNotification]);

  // 监听插入图标事件（兼容旧的直接传递 element+files 的方式）
  useEffect(() => {
    const handleInsertImage = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { element, files } = customEvent.detail || {};
      if (!element) return;

      const api = excalidrawAPIRef.current;
      if (!api) return;

      // 确保图片元素有 status 属性
      if (element.type === 'image' && !element.status) {
        element.status = files && Object.keys(files).length > 0 ? 'saved' : 'pending';
      }

      // 1. 先通过 addFiles 注册图片数据到 Excalidraw 内部
      if (files && Object.keys(files).length > 0) {
        const fileDataArray = Object.values(files);
        api.addFiles(fileDataArray);
        setHydratedFiles((prev) => ({ ...prev, ...files }));
        latestFilesRef.current = { ...latestFilesRef.current, ...files };
      }

      // 2. 获取当前场景元素并添加新元素
      const currentElements = api.getSceneElements();
      const newElements = [...currentElements, element];
      skipProgrammaticChangeRef.current = true;
      api.updateScene({
        elements: newElements,
      });

      setHydratedElements(newElements as ExcalidrawElement[]);

      if (onChangeRef.current) {
        onChangeRef.current(newElements, {}, latestFilesRef.current);
      }

      showNotification?.({
        title: '插入成功',
        message: '图标已插入到画布',
        type: 'success',
      });
    };

    window.addEventListener('excalidraw-insert-image', handleInsertImage);
    return () => {
      window.removeEventListener('excalidraw-insert-image', handleInsertImage);
    };
  }, [excalidrawAPI, showNotification]);

  // 拖拽文件到画布功能
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const api = excalidrawAPIRef.current;
      if (!api) return;

      // 尝试从拖拽数据中解析图标 (从 IconPicker 拖拽)
      const iconData = e.dataTransfer?.getData('application/json');
      if (iconData) {
        try {
          const icon = JSON.parse(iconData);
          if (icon && icon.url) {
            const timestamp = Date.now();

            if (icon.source_file_url) {
              try {
                const response = await fetch(icon.source_file_url);
                if (response.ok) {
                  const sourceData = await response.json();
                  const sourceElements = Array.isArray(sourceData) ? sourceData : (sourceData.elements || []);
                  const sourceFiles = sourceData.files || {};

                  if (sourceElements.length > 0) {
                    const remappedFiles: Record<string, any> = {};
                    const fileIdMap: Record<string, string> = {};

                    for (const [oldFileId, fileData] of Object.entries(sourceFiles) as [string, any][]) {
                      const newFileId = `file_${timestamp}_${oldFileId}`;
                      fileIdMap[oldFileId] = newFileId;
                      remappedFiles[newFileId] = { ...fileData, id: newFileId };
                    }

                    const offsetElements = sourceElements.map((el: any, index: number) => {
                      const newEl = {
                        ...el,
                        id: `${el.id || 'el'}_${timestamp}_${index}`,
                        x: (el.x ?? 0) + 100,
                        y: (el.y ?? 0) + 100,
                        updated: timestamp,
                        version: (el.version ?? 0) + 1,
                        versionNonce: timestamp + index,
                        seed: (el.seed ?? 0) + timestamp,
                      };
                      if (el.fileId && fileIdMap[el.fileId]) {
                        newEl.fileId = fileIdMap[el.fileId];
                        newEl.status = 'saved';
                      }
                      if (el.boundElements) {
                        newEl.boundElements = el.boundElements.map((be: any) => ({
                          ...be,
                          id: `${be.id || 'be'}_${timestamp}`,
                        }));
                      }
                      return newEl;
                    });

                    const { elements: hydratedElements, files: newFiles } = await hydrateExcalidrawImages(
                      offsetElements,
                      remappedFiles,
                    );

                    const currentElements = api.getSceneElements();
                    const lastIndex = currentElements.length > 0
                      ? (currentElements[currentElements.length - 1] as any).index
                      : null;
                    const elementsWithIndex = hydratedElements.map((el: any, i: number) => ({
                      ...el,
                      index: lastIndex ? lastIndex + 'Z' + i : 'a' + i,
                    }));

                    if (Object.keys(newFiles).length > 0) {
                      api.addFiles(Object.values(newFiles));
                      setHydratedFiles((prev) => ({ ...prev, ...newFiles }));
                      latestFilesRef.current = { ...latestFilesRef.current, ...newFiles };
                    }

                    const newSceneElements = [...currentElements, ...elementsWithIndex];
                    skipProgrammaticChangeRef.current = true;
                    api.updateScene({ elements: newSceneElements });
                    setHydratedElements(newSceneElements as ExcalidrawElement[]);

                    if (onChangeRef.current) {
                      onChangeRef.current(newSceneElements, {}, latestFilesRef.current);
                    }

                    showNotification?.({
                      title: '插入成功',
                      message: `已插入 ${hydratedElements.length} 个 Excalidraw 元素`,
                      type: 'success',
                    });
                    return;
                  }
                }
              } catch (fetchErr) {
                console.warn('[ExcalidrawCanvas] 拖拽 Excalidraw 源文件加载失败，回退为图片:', fetchErr);
              }
            }

            const imageElement = {
              type: 'image',
              id: `icon_${icon.id}_${timestamp}`,
              x: 100,
              y: 100,
              width: 100,
              height: 100,
              angle: 0,
              strokeColor: '#000000',
              backgroundColor: 'transparent',
              fillStyle: 'solid',
              strokeWidth: 1,
              strokeStyle: 'solid',
              roughness: 0,
              opacity: 100,
              groupIds: [],
              frameId: null,
              roundness: null,
              seed: timestamp,
              version: 1,
              versionNonce: timestamp,
              isDeleted: false,
              boundElements: null,
              updated: timestamp,
              link: null,
              locked: false,
              fileId: icon.url,
              scale: [1, 1],
              crop: null,
              status: 'pending',
            };

            try {
              const { elements: hydratedElements, files: newFiles } = await hydrateExcalidrawImages(
                [imageElement] as any,
                {},
              );

              if (hydratedElements.length > 0 && Object.keys(newFiles).length > 0) {
                const currentElements = api.getSceneElements();
                const lastIndex = currentElements.length > 0
                  ? (currentElements[currentElements.length - 1] as any).index
                  : null;
                (hydratedElements[0] as any).index = lastIndex ? lastIndex + 'Z' : 'a0';

                api.addFiles(Object.values(newFiles));
                const newElements = [...currentElements, hydratedElements[0]];
                skipProgrammaticChangeRef.current = true;
                api.updateScene({ elements: newElements });
                setHydratedFiles((prev) => ({ ...prev, ...newFiles }));
                latestFilesRef.current = { ...latestFilesRef.current, ...newFiles };
                setHydratedElements(newElements as ExcalidrawElement[]);

                if (onChangeRef.current) {
                  onChangeRef.current(newElements, {}, latestFilesRef.current);
                }
              }
            } catch (hydrateError) {
              console.warn('[ExcalidrawCanvas] 拖拽图标 hydration 失败:', hydrateError);
            }

            showNotification?.({
              title: '插入成功',
              message: `图标已插入: ${icon.name}`,
              type: 'success',
            });
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
          // 处理 Excalidraw 文件 (.excalidraw, .json)
          if (file.name.endsWith('.excalidraw') || file.name.endsWith('.json')) {
            const content = await file.text();
            const data = JSON.parse(content);
            const elements = data.elements || [];
            const droppedFiles = data.files || {};

            if (elements.length > 0) {
              const currentElements = api.getSceneElements();

              // 计算偏移量，避免覆盖
              const offsetX = 100;
              const offsetY = 100;
              const offsetElements = elements.map((el: any) => ({
                ...el,
                x: el.x + offsetX,
                y: el.y + offsetY,
              }));

              if (Object.keys(droppedFiles).length > 0) {
                api.addFiles(Object.values(droppedFiles));
                setHydratedFiles((prev) => ({ ...prev, ...droppedFiles }));
                latestFilesRef.current = { ...latestFilesRef.current, ...droppedFiles };
              }

              const newElements = [...currentElements, ...offsetElements];
              skipProgrammaticChangeRef.current = true;
              api.updateScene({
                elements: newElements,
              });

              setHydratedElements(newElements as ExcalidrawElement[]);

              if (onChangeRef.current) {
                onChangeRef.current(newElements, {}, latestFilesRef.current);
              }

              showNotification?.({
                title: '导入成功',
                message: `已从文件导入 ${elements.length} 个元素: ${file.name}`,
                type: 'success',
              });
            }
          }
          // 处理图片文件
          else if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const dataURL = event.target?.result as string;
              if (!dataURL) return;

              const fileId = Math.random().toString(36).substring(2, 15);
              const currentElements = api.getSceneElements();
              const timestamp = Date.now();

              const imageElement = {
                type: 'image',
                id: `image_${timestamp}`,
                x: 100,
                y: 100,
                width: 200,
                height: 200,
                angle: 0,
                strokeColor: '#000000',
                backgroundColor: 'transparent',
                fillStyle: 'solid',
                strokeWidth: 1,
                strokeStyle: 'solid',
                roughness: 0,
                opacity: 100,
                groupIds: [],
                frameId: null,
                roundness: null,
                seed: timestamp,
                version: 1,
                versionNonce: timestamp,
                isDeleted: false,
                boundElements: null,
                updated: timestamp,
                link: null,
                locked: false,
                fileId: fileId,
                scale: [1, 1],
                crop: null,
                status: 'saved',
              };

              const imageFileData = {
                id: fileId,
                dataURL: dataURL,
                mimeType: file.type || 'image/png',
                created: timestamp,
                lastRetrieved: timestamp,
              };

              api.addFiles([imageFileData]);
              setHydratedFiles((prev) => ({ ...prev, [fileId]: imageFileData }));
              latestFilesRef.current = { ...latestFilesRef.current, [fileId]: imageFileData };

              const lastIndex2 = currentElements.length > 0
                ? (currentElements[currentElements.length - 1] as any).index
                : null;
              (imageElement as any).index = lastIndex2 ? lastIndex2 + 'Z' : 'a0';

              const newElements = [...currentElements, imageElement];
              skipProgrammaticChangeRef.current = true;
              api.updateScene({
                elements: newElements,
              });

              setHydratedElements(newElements as ExcalidrawElement[]);

              if (onChangeRef.current) {
                onChangeRef.current(newElements, {}, latestFilesRef.current);
              }

              showNotification?.({
                title: '插入成功',
                message: `图片已插入: ${file.name}`,
                type: 'success',
              });
            };
            reader.readAsDataURL(file);
          }
        } catch (error) {
          console.error(`处理文件 ${file.name} 失败:`, error);
          showNotification?.({
            title: '导入失败',
            message: `无法导入 ${file.name}: ${error instanceof Error ? error.message : '未知错误'}`,
            type: 'error',
          });
        }
      }
    };

    // 监听整个窗口的拖拽事件
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [excalidrawAPI, showNotification]);

  // Auto zoom to fit content when API is ready and elements change
  useEffect(() => {
    if (excalidrawAPI && hydratedElements.length > 0) {
      // Small delay to ensure elements are rendered
      setTimeout(() => {
        excalidrawAPI.scrollToContent?.(hydratedElements, {
          fitToContent: true,
          animate: true,
          duration: 300,
        });
      }, 100);
    }
  }, [excalidrawAPI, hydratedElements]);

  // Whenever elements are injected from code, remember the version and skip the next change event
  useEffect(() => {
    if (!utils.getSceneVersion) return;
    const injectedVersion = utils.getSceneVersion(hydratedElements || []);
    lastSceneVersionRef.current = injectedVersion;
    skipProgrammaticChangeRef.current = true;
  }, [hydratedElements, utils.getSceneVersion]);

  // Handle changes from Excalidraw - delegate to parent
  // 使用防抖避免拖拽时频繁触发 onChange 导致卡顿
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((nextElements: readonly ExcalidrawElement[], appState: any, files: BinaryFiles) => {
    if (!nextElements || !utils.getSceneVersion) {
      return;
    }

    const currentVersion = utils.getSceneVersion(nextElements);

    if (skipProgrammaticChangeRef.current) {
      skipProgrammaticChangeRef.current = false;
      lastSceneVersionRef.current = currentVersion;
      return;
    }

    if (currentVersion === lastSceneVersionRef.current) {
      return;
    }

    lastSceneVersionRef.current = currentVersion;

    if (files && Object.keys(files).length > 0) {
      const safeFiles: BinaryFiles = {};
      for (const [key, value] of Object.entries(files)) {
        const existing = latestFilesRef.current[key];
        if (existing && existing.dataURL && !(value as any).dataURL) {
          safeFiles[key] = existing;
        } else if ((value as any).dataURL) {
          safeFiles[key] = value as BinaryFileData;
        }
      }
      latestFilesRef.current = { ...latestFilesRef.current, ...safeFiles };
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (onChangeRef.current) {
        onChangeRef.current(nextElements, appState, latestFilesRef.current);
      }
      debounceTimerRef.current = null;
    }, 300);
  }, [utils]);

  return (
    <div className="w-full h-[calc(100vh-64px)]">
      <Excalidraw
        excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
          excalidrawAPIRef.current = api;
          setExcalidrawAPI(api);
        }}
        onChange={handleChange}
        langCode="zh-CN"
        initialData={{
          elements: hydratedElements,
          files: { ...(initialFiles || {}), ...hydratedFiles },
          appState: {
            viewBackgroundColor: '#ffffff',
            currentItemFontFamily: 1,
          },
          scrollToContent: true,
        }}
      />
    </div>
  );
}
