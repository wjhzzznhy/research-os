'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { historyManager } from '@/lib/smart-draw/history-manager';
import { configService } from '@/lib/smart-draw/config-service';
import { parseSSEStream, parseSSEStreamAlt } from '@/lib/smart-draw/sse-parser';
import { LLMConfig, LLMMessage, LLMMessageContentPart } from '@/types/api';

interface Attachment {
  file?: File;
  type?: string;
  name?: string;
  kind?: 'image' | 'file';
  [key: string]: any;
}

interface ImagePayload {
  data: string;
  mimeType: string;
  name: string;
}

interface UserMessage extends LLMMessage {
  imagePayloads?: ImagePayload[];
}

interface SendMessageParams {
  input: string;
  attachments?: Attachment[];
  chartType?: string;
  systemPrompt: string;
  userPromptTemplate: (input: string, chartType: string) => string;
  postProcessFn: (code: string) => string;
  sseParserFn?: typeof parseSSEStream;
  editor: 'drawio' | 'excalidraw';
  showNotification?: (notification: { title: string; message: string; type: 'error' | 'success' | 'info' }) => void;
}

interface RetryMessageParams {
  targetIndex: number;
  systemPrompt: string;
  postProcessFn: (code: string) => string;
  sseParserFn?: typeof parseSSEStream;
  editor: 'drawio' | 'excalidraw';
  showNotification?: (notification: { title: string; message: string; type: 'error' | 'success' | 'info' }) => void;
}

/**
 * 共享的引擎逻辑 Hook
 * 提供两个引擎（Draw.io 和 Excalidraw）的通用功能
 */
export function useEngineShared() {
  // 生成唯一对话 ID
  const newConversationId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  // 共享状态
  const [usedCode, setUsedCode] = useState('');
  const usedCodeRef = useRef(usedCode);
  useEffect(() => { usedCodeRef.current = usedCode; }, [usedCode]);
  const [messages, setMessages] = useState<LLMMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationId, setConversationId] = useState(newConversationId());
  const [lastError, setLastError] = useState<string | null>(null);

  /**
   * 将图片文件转为 base64
   */
  const fileToBase64 = useCallback(
    (file: File): Promise<string> =>
      new Promise((resolve) => {
        try {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result || '';
            const base64 =
              typeof result === 'string' ? result.split(',')[1] : '';
            resolve(base64 || '');
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        } catch {
          resolve('');
        }
      }),
    [],
  );

  /**
   * 构建 multimodal 用户消息
   */
  const buildUserMessage = useCallback(
    async (textContent: string, attachments: Attachment[] = []): Promise<UserMessage> => {
      const userMessage: UserMessage = {
        role: 'user',
        content: textContent,
      };

      // 处理图片附件
      if (Array.isArray(attachments) && attachments.length > 0) {
        const imageAttachments = attachments.filter(
          (att) => att.kind === 'image',
        );
        if (imageAttachments.length > 0) {
          const encodedImages = await Promise.all(
            imageAttachments.map(async ({ file, type, name }) => ({
              data: file ? await fileToBase64(file) : '',
              mimeType: (file && file.type) || type || 'image/png',
              name: (file && file.name) || name || 'image',
            })),
          );

          const safeImages = encodedImages.filter((img) => !!img.data);

          if (safeImages.length > 0) {
            userMessage.content = [
              { type: 'text', text: textContent },
              ...safeImages.map((img) => ({
                type: 'image_url' as const,
                image_url: {
                  url: `data:${img.mimeType};base64,${img.data}`,
                },
              })),
            ];

            // 保存独立的图像 payload，供不同厂商的 LLM 客户端按需序列化
            userMessage.imagePayloads = safeImages.map((img) => ({
              data: img.data,
              mimeType: img.mimeType,
              name: img.name,
            }));
          }
        }
      }

      return userMessage;
    },
    [fileToBase64],
  );

  /**
   * 构建完整的 messages 数组
   */
  const buildFullMessages = useCallback(
    (systemMessage: LLMMessage, userMessage: LLMMessage, currentMessages: LLMMessage[], historyLimit = 3) => {
      const history = currentMessages
        .filter(
          (m) =>
            ['user', 'assistant'].includes(m.role) &&
            typeof m.content === 'string',
        )
        .slice(-historyLimit);

      return [systemMessage, ...history, userMessage];
    },
    [],
  );

  /**
   * 调用 LLM 流式接口并处理响应
   */
  const callLLMStream = useCallback(async (llmConfig: Partial<LLMConfig>, fullMessages: LLMMessage[]) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 如果启用了访问密码模式，则通过请求头传递 access-password，
    // 由服务端根据环境变量自动注入 apiKey
    if (typeof window !== 'undefined') {
      try {
        const usePassword =
          localStorage.getItem('smart-diagram-use-password') === 'true';
        const accessPassword =
          localStorage.getItem('smart-diagram-access-password') || '';
        if (usePassword && accessPassword) {
          headers['x-access-password'] = accessPassword;
        }
      } catch {
        // ignore
      }
    }

    // 构建请求体：访问密码模式下不传递 config
    const isPasswordMode =
      typeof window !== 'undefined' &&
      localStorage.getItem('smart-diagram-use-password') === 'true';

    const requestBody = isPasswordMode
      ? { messages: fullMessages }
      : { config: llmConfig, messages: fullMessages };

    // Use Python Backend (FastAPI)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const response = await fetch(`${apiUrl}/smart-draw/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorMessage = 'LLM 请求失败';
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
             errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // Failed to parse error response, use status text
        errorMessage = `请求失败 (${response.status}): ${response.statusText}`;
      }
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    }

    return response;
  }, []);

  /**
   * 验证 LLM 配置是否有效
   */
  const validateConfig = useCallback((showNotification?: (n: any) => void): Partial<LLMConfig> | null => {
    const activeConfig = configService.getCurrentConfig();
    const validation = configService.validateConfig(activeConfig);

    if (!validation.isValid) {
      if (showNotification) {
        showNotification({
          title: '配置缺失',
          message: '请先在右上角配置 LLM',
          type: 'error',
        });
      }
      return null;
    }

    const baseConfig = {
      type: activeConfig.type,
      baseUrl: activeConfig.baseUrl,
      model: activeConfig.model,
    };

    // 本地配置模式下才需要在前端携带 apiKey；
    // 访问密码模式下 apiKey 仅存在于服务端环境变量中。
    if (typeof window === 'undefined') {
      return { ...baseConfig, apiKey: activeConfig.apiKey };
    }

    try {
      const usePassword = configService.isPasswordMode();
      if (!usePassword) {
        return { ...baseConfig, apiKey: activeConfig.apiKey };
      }
    } catch {
      // 读取失败时退回到直接返回 apiKey（用于本地配置）
      return { ...baseConfig, apiKey: activeConfig.apiKey };
    }

    // 访问密码模式：不在前端传播 apiKey
    return baseConfig;
  }, []);

  /**
   * 发送消息模板方法（策略模式）
   * 统一处理两个引擎的消息发送流程，只有后处理逻辑不同
   */
  const handleSendMessageTemplate = useCallback(
    async ({
      input,
      attachments = [],
      chartType = 'auto',
      systemPrompt,
      userPromptTemplate,
      postProcessFn,
      sseParserFn = parseSSEStream,
      editor,
      showNotification,
    }: SendMessageParams) => {
      const trimmed = (input || '').trim();
      if (!trimmed && (!attachments || attachments.length === 0)) return;

      try {
        setIsGenerating(true);
        setStreamingContent('');
        setLastError(null);

        // 1. 验证 LLM 配置
        const llmConfig = validateConfig(showNotification);
        if (!llmConfig) return;

        // 2. 构造 System Message
        const systemMessage: LLMMessage = {
          role: 'system',
          content: systemPrompt,
        };

        // 3. 构造 User Message（应用模板）
        const userContent = userPromptTemplate(trimmed, chartType || 'auto');
        const userMessage = await buildUserMessage(userContent, attachments);

        // 4. 组装完整 messages（包含历史）
        const fullMessages = buildFullMessages(systemMessage, userMessage, messages, 3);

        // 追踪 user message
        setMessages((prev) => [...prev, userMessage]);
        await historyManager.addMessage(conversationId, userMessage, editor, llmConfig, chartType);

        // 5. 调用后端流式接口
        const response = await callLLMStream(llmConfig, fullMessages);

        // 6. 处理 SSE 流
        const accumulatedCode = await sseParserFn(response, {
          onChunk: (content) => setStreamingContent(content),
        });

        // 7. 结束流式，清空 streamingContent
        setStreamingContent('');

        // 8. 后处理代码（引擎特定逻辑）
        const finalCode = postProcessFn(accumulatedCode);

        const assistantMessage: LLMMessage = {
          role: 'assistant',
          content: finalCode,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        await historyManager.addMessage(conversationId, assistantMessage, editor, llmConfig, chartType);

        // 返回最终代码（供引擎自动应用）
        return finalCode;
      } catch (error: any) {
        console.error('Generate error:', error);
        setStreamingContent('');

        const errorMessage = error.message || '生成失败';
        setLastError(errorMessage);

        // Add error message to chat
        const errorChatMessage: LLMMessage = {
          role: 'system',
          content: `❌ 错误: ${errorMessage}`,
        };
        setMessages((prev) => [...prev, errorChatMessage]);

        if (showNotification) {
          showNotification({
            title: '生成失败',
            message: errorMessage,
            type: 'error',
          });
        }

        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [
      conversationId,
      messages,
      buildUserMessage,
      buildFullMessages,
      callLLMStream,
      validateConfig,
      setIsGenerating,
      setStreamingContent,
      setMessages,
      setLastError,
    ]
  );

  /**
   * 基于现有消息历史，针对某一条 AI 回复执行「重新生成」
   */
  const handleRetryMessageTemplate = useCallback(
    async ({
      targetIndex,
      systemPrompt,
      postProcessFn,
      sseParserFn = parseSSEStream,
      editor,
      showNotification,
    }: RetryMessageParams) => {
      if (typeof targetIndex !== 'number') return;

      const currentMessages = messages || [];
      if (targetIndex < 0 || targetIndex >= currentMessages.length) return;

      const target = currentMessages[targetIndex];
      if (!target) return;

      // 寻找目标消息之前最近的一条 user 消息
      let userIndex = -1;
      for (let i = targetIndex - 1; i >= 0; i -= 1) {
        const m = currentMessages[i];
        if (m && m.role === 'user') {
          userIndex = i;
          break;
        }
      }
      if (userIndex === -1) return;

      const userMessage = currentMessages[userIndex];

      // messages 截断到目标消息之前（包含 userMessage 本身）
      const truncatedMessages = currentMessages.slice(0, targetIndex);

      // 构造历史：仅使用 userMessage 之前的对话片段
      const historyForBuild = currentMessages.slice(0, userIndex);

      try {
        setIsGenerating(true);
        setStreamingContent('');
        setLastError(null);

        // 验证配置
        const llmConfig = validateConfig(showNotification);
        if (!llmConfig) return;

        const systemMessage: LLMMessage = {
          role: 'system',
          content: systemPrompt,
        };

        const fullMessages = buildFullMessages(
          systemMessage,
          userMessage,
          historyForBuild,
          3
        );

        // 先在前端截断消息列表，立即反映到 UI
        setMessages(truncatedMessages);

        const response = await callLLMStream(llmConfig, fullMessages);

        const accumulatedCode = await sseParserFn(response, {
          onChunk: (content) => setStreamingContent(content),
        });

        setStreamingContent('');

        const finalCode = postProcessFn(accumulatedCode);

        const assistantMessage: LLMMessage = {
          role: 'assistant',
          content: finalCode,
        };

        const nextMessages = [...truncatedMessages, assistantMessage];
        setMessages(nextMessages);
        await historyManager.replaceConversation(
          conversationId,
          nextMessages,
          editor,
          llmConfig
        );

        return finalCode;
      } catch (error: any) {
        console.error('Generate (retry) error:', error);
        setStreamingContent('');

        const errorMessage = error.message || '生成失败';
        setLastError(errorMessage);

        const errorChatMessage: LLMMessage = {
          role: 'system',
          content: `❌ 错误: ${errorMessage}`,
        };
        setMessages((prev) => [...prev, errorChatMessage]);

        if (showNotification) {
          showNotification({
            title: '生成失败',
            message: errorMessage,
            type: 'error',
          });
        }

        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [
      messages,
      conversationId,
      buildFullMessages,
      callLLMStream,
      validateConfig,
      setIsGenerating,
      setStreamingContent,
      setMessages,
      setLastError,
    ]
  );

  /**
   * 新建对话：保存当前对话到历史记录，然后重置状态
   */
  const saveToHistory = useCallback(async (
    editor?: 'drawio' | 'excalidraw',
    currentCode?: string,
  ) => {
    const hasCanvasContent = currentCode && currentCode.trim();
    const shouldSave = messages.length > 0 || hasCanvasContent;

    if (!shouldSave) return;

    try {
      const activeConfig = configService.getCurrentConfig();

      let finalMessages = [...messages];

      if (hasCanvasContent) {
        const lastAssistantIndex = [...finalMessages].reverse().findIndex(m => m.role === 'assistant');
        if (lastAssistantIndex !== -1) {
          const actualIndex = finalMessages.length - 1 - lastAssistantIndex;
          finalMessages = finalMessages.map((m, i) => {
            if (i === actualIndex && m.role === 'assistant') {
              return { ...m, content: currentCode };
            }
            return m;
          });
        } else {
          finalMessages.push({
            id: `canvas-save-${Date.now()}`,
            role: 'assistant',
            content: currentCode,
            timestamp: Date.now(),
          });
        }
      }

      await historyManager.replaceConversation(
        conversationId,
        finalMessages,
        editor,
        activeConfig,
      );
    } catch (error) {
      console.error('保存对话失败:', error);
    }
  }, [messages, conversationId]);

  const handleNewChat = useCallback(async (
    editor?: 'drawio' | 'excalidraw',
    chartType?: string,
    currentCode?: string,
    clearCanvas: boolean = true,
  ) => {
    console.log('[handleNewChat] Called with:', { editor, chartType, currentCode: currentCode?.slice(0, 50), clearCanvas, messagesLength: messages.length });
    
    const hasCanvasContent = currentCode && currentCode.trim();
    const shouldSave = messages.length > 0 || hasCanvasContent;
    
    if (shouldSave) {
      try {
        const activeConfig = configService.getCurrentConfig();
        
        let finalMessages = [...messages];
        
        if (hasCanvasContent) {
          const lastAssistantIndex = [...finalMessages].reverse().findIndex(m => m.role === 'assistant');
          if (lastAssistantIndex !== -1) {
            const actualIndex = finalMessages.length - 1 - lastAssistantIndex;
            finalMessages = finalMessages.map((m, i) => {
              if (i === actualIndex && m.role === 'assistant') {
                return { ...m, content: currentCode };
              }
              return m;
            });
          } else {
            finalMessages.push({
              id: `canvas-save-${Date.now()}`,
              role: 'assistant',
              content: currentCode,
              timestamp: Date.now(),
            });
          }
        }
        
        await historyManager.replaceConversation(
          conversationId,
          finalMessages,
          editor,
          activeConfig,
          chartType,
        );
      } catch (error) {
        console.error('保存对话失败:', error);
      }
    }

    setMessages([]);
    setUsedCode(clearCanvas ? '' : (currentCode || ''));
    setStreamingContent('');
    setLastError(null);
    setConversationId(newConversationId());
  }, [messages, conversationId]);

  /**
   * 恢复历史对话基础逻辑
   */
  const restoreHistoryBase = useCallback(
    async (history: any, applyCodeFn?: (code: string) => Promise<void> | void) => {
      try {
        setConversationId(history.id);

        const msgs = await historyManager.getConversationMessages(history.id);
        const safeMsgs = Array.isArray(msgs) ? msgs : [];
        setMessages(safeMsgs);

        if (applyCodeFn) {
          const lastAssistant = [...safeMsgs].reverse().find(
            (m) => m && m.role === 'assistant' && typeof m.content === 'string',
          );
          const code = (lastAssistant?.content as string) || '';
          await applyCodeFn(code);
        }
      } catch (error) {
        console.error('Restore history error:', error);
      }
    },
    []
  );

  return {
    // 状态
    usedCode,
    usedCodeRef,
    setUsedCode,
    messages,
    setMessages,
    isGenerating,
    setIsGenerating,
    streamingContent,
    setStreamingContent,
    conversationId,
    setConversationId,
    lastError,
    setLastError,

    // 工具函数
    fileToBase64,
    buildUserMessage,
    buildFullMessages,
    callLLMStream,
    validateConfig,

    // 模板方法（核心）
    handleSendMessageTemplate,
    handleRetryMessageTemplate,

    // 操作
    handleNewChat,
    saveToHistory,
    restoreHistoryBase,

    // SSE 解析器（导出供特殊需求使用）
    parseSSEStream,
    parseSSEStreamAlt,
  };
}
