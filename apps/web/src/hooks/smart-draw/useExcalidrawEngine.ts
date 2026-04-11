'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { fixJSON } from '@/lib/smart-draw/fixUnclosed';
import { optimizeExcalidrawCode } from '@/lib/smart-draw/optimizeArrows';
import { hydrateExcalidrawImages } from '@/lib/smart-draw/excalidraw-image-processor';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from '@/lib/smart-draw/prompts/excalidraw';
import { excalidrawProcessor } from '@/lib/smart-draw/code-processor';
import { useEngineShared } from './useEngineShared';

import { IconAsset } from '@/types/api';
import type { BinaryFiles } from '@/lib/smart-draw/excalidraw/types';

export function useExcalidrawEngine() {
  const shared = useEngineShared();
  const [excalidrawFiles, setExcalidrawFiles] = useState<BinaryFiles>({});
  const filesRef = useRef<BinaryFiles>({});

  const syncFiles = useCallback((files: BinaryFiles) => {
    if (files && typeof files === 'object' && Object.keys(files).length > 0) {
      const validFiles: BinaryFiles = {};
      for (const [key, value] of Object.entries(files)) {
        if (value && (value as any).dataURL) {
          validFiles[key] = value;
        }
      }
      if (Object.keys(validFiles).length > 0) {
        setExcalidrawFiles(prev => ({ ...prev, ...validFiles }));
        filesRef.current = { ...filesRef.current, ...validFiles };
      }
    }
  }, []);

  const {
    usedCode,
    setUsedCode,
    messages,
    isGenerating,
    streamingContent,
    conversationId,
    lastError,
    handleSendMessageTemplate,
    handleNewChat,
    saveToHistory,
    restoreHistoryBase,
    parseSSEStreamAlt,
    handleRetryMessageTemplate,
  } = shared;

  /**
   * 插入图标到 Excalidraw
   */
  const handleInsertIcon = useCallback(async (icon: IconAsset) => {
    console.log('[Excalidraw] 开始插入图标:', icon);
    
    // 获取当前视口中心位置（需要在Canvas组件中计算）
    // 通过事件传递图标信息，让Canvas组件获取视口位置后插入
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('excalidraw-insert-icon-at-viewport', { 
        detail: { icon } 
      }));
    }
  }, []);

  /**
   * 后处理 Excalidraw JSON 代码：使用代码处理管道
   */
  const postProcessExcalidrawCode = useCallback((code: string) => {
    return excalidrawProcessor.process(code);
  }, []);

  /**
   * 将 JSON 文本解析为 Excalidraw elements 数组
   */
  const parseElements = useCallback((jsonText: string) => {
    try {
      const optimized = optimizeExcalidrawCode(jsonText);
      const data = JSON.parse(optimized);

      return Array.isArray(data) ? data : (data.elements || []);
    } catch (e) {
      return [];
    }
  }, []);

  /**
   * 应用代码到画布：
   * - 解析 / 修复 / 优化 JSON
   * - 下载并注入图片资源 (Hydration)
   * - 更新 usedCode
   * - 写入本地状态
   */
  const handleApplyCode = useCallback(
    async (code: string) => {
      try {
        const processed = postProcessExcalidrawCode(code || '');
        const fixed = fixJSON(processed);
        const optimized = optimizeExcalidrawCode(fixed);

        let elements = [];
        try {
          const data = JSON.parse(optimized);
          if (Array.isArray(data)) elements = data;
          else if (data && Array.isArray(data.elements)) elements = data.elements;
        } catch {
        }

        if (elements.length > 0) {
          const { elements: hydratedElements, files } = await hydrateExcalidrawImages(elements);
          
          setUsedCode(JSON.stringify(hydratedElements));
          syncFiles(files);
        } else {
          setUsedCode(optimized);
        }
      } catch (error) {
        console.error('Apply code error:', error);
      }
    },
    [postProcessExcalidrawCode, setUsedCode, syncFiles],
  );

  /**
   * 发送消息并调用 LLM：
   * 使用模板方法，只需提供 Excalidraw 特定的后处理逻辑
   * 注意：不再自动应用到画布，由用户通过编辑器点击"应用"按钮
   */
  const handleSendMessage = useCallback(
    async (
      input: string,
      attachments: any[] = [],
      chartType: string = 'auto',
      _unusedConfig?: any,
      showNotification?: (n: any) => void
    ) => {
      try {
        // 调用模板方法，传入 Excalidraw 特定的配置
        // 生成的代码会通过 streamingContent 传递给编辑器
        await handleSendMessageTemplate({
          input,
          attachments,
          chartType,
          systemPrompt: SYSTEM_PROMPT,
          userPromptTemplate: USER_PROMPT_TEMPLATE,
          postProcessFn: postProcessExcalidrawCode,
          sseParserFn: parseSSEStreamAlt, // Excalidraw 使用备用解析器
          editor: 'excalidraw',
          showNotification,
        });

        // 不再自动应用到画布，由用户通过编辑器点击"应用"按钮
      } catch (error) {
        // 错误已在模板方法中处理
        console.error('Excalidraw message send error:', error);
      }
    },
    [handleSendMessageTemplate, postProcessExcalidrawCode, parseSSEStreamAlt]
  );

  /**
   * 针对指定的 assistant 消息执行重试：
   * - 截断该消息及其之后的历史
   * - 复用其前一条 user 消息重新调用 LLM
   */
  const handleRetryMessage = useCallback(
    async (targetIndex: number, showNotification?: (n: any) => void) => {
      try {
        await handleRetryMessageTemplate({
          targetIndex,
          systemPrompt: SYSTEM_PROMPT,
          postProcessFn: postProcessExcalidrawCode,
          sseParserFn: parseSSEStreamAlt,
          editor: 'excalidraw',
          showNotification,
        });
      } catch (error) {
        console.error('Excalidraw message retry error:', error);
      }
    },
    [handleRetryMessageTemplate, postProcessExcalidrawCode, parseSSEStreamAlt]
  );

  const handleCanvasChange = useCallback(
    (elements: any, files?: BinaryFiles) => {
      try {
        const code = JSON.stringify(elements);
        setUsedCode(code);
        if (files) {
          syncFiles(files);
        }
      } catch (error) {
        console.error('Canvas change error:', error);
      }
    },
    [setUsedCode, syncFiles],
  );

  /**
   * 恢复历史对话：
   * - 恢复 conversationId
   * - 恢复 messages
   * - 应用 usedCode 到画布
   */
  const handleRestoreHistory = useCallback(
    async (history: any) => {
      await restoreHistoryBase(history, handleApplyCode);
    },
    [restoreHistoryBase, handleApplyCode],
  );

  /**
   * 新建对话（带保存）：
   * - 保存当前对话到历史记录
   * - 清空画布
   * - 重置状态
   */
  const handleNewChatWithSave = useCallback(
    async (chartType: string = 'auto') => {
      const latestCode = shared.usedCodeRef?.current ?? usedCode;
      console.log('[handleNewChatWithSave] Called with chartType:', chartType, 'usedCode:', latestCode?.slice(0, 50));
      await handleNewChat('excalidraw', chartType, latestCode, true);
    },
    [handleNewChat, usedCode, shared.usedCodeRef],
  );

  // 注意：自动 hydration 已移到 ExcalidrawCanvas 组件中
  // 当 convertedElements 包含 URL fileId 的图片元素时，Canvas 会自动调用 hydrateExcalidrawImages
  // 这里不再需要自动 hydration effect，避免循环更新导致的卡顿

  return {
    ...shared,
    handleInsertIcon,
    postProcessExcalidrawCode,
    handleApplyCode,
    handleSendMessage,
    handleRetryMessage,
    handleCanvasChange,
    handleNewChat: handleNewChatWithSave,
    saveToHistory,
    handleRestoreHistory,
    extraData: {
        files: excalidrawFiles
    }
  };
}
