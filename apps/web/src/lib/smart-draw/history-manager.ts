import { addConversationIfMissing, putMessage, listConversations, getConversationMessages, deleteConversation, clearAllStores, putBlob, replaceConversationMessages, generateId as idbGenerateId } from './indexeddb';
import { LLMConfig, LLMMessage, MessageRecord, AttachmentRef, HistoryItem, LLMMessageContentPart } from '@/types/api';

interface FileObj {
  file: File | Blob;
  name?: string;
  type?: string;
  size?: number;
}

interface HistoryData {
  conversationId?: string;
  chartType?: string;
  userInput?: string;
  generatedCode?: string;
  config?: LLMConfig;
  editor?: 'drawio' | 'excalidraw';
  images?: FileObj[];
  files?: FileObj[];
}

interface AddHistoryResult {
    conversationId: string;
    userMessageId: string;
    assistantMessageId: string;
}

class HistoryManager {
  ready: boolean;

  constructor() {
    this.ready = false;
  }

  async ensureReady(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.ready) return;
    this.ready = true;
  }

  generateId(): string {
    return idbGenerateId();
  }

  /**
   * Add a history entry as part of a conversation. If the conversation does not exist, creates it.
   * This stores two messages (user + assistant) and any binary attachments in IndexedDB.
   *
   * data = {
   *   conversationId, chartType, userInput, generatedCode, config,
   *   images: [{ file, name, type }],
   *   files: [{ file, name, type, size }]
   * }
   */
  async addHistory(data: HistoryData): Promise<AddHistoryResult> {
    await this.ensureReady();
    const conversationId = data.conversationId || this.generateId();
    const now = Date.now();

    // Ensure conversation exists
    await addConversationIfMissing({
      id: conversationId,
      title: data.userInput?.slice?.(0, 30) || '对话',
      chartType: data.chartType,
      config: data.config || null,
      editor: data.editor || undefined,
    });

    // Save binary attachments (if any) as blobs and collect references
    const attachmentRefs: AttachmentRef[] = [];
    const saveBlob = async (fileObj: FileObj): Promise<AttachmentRef | null> => {
      try {
        const blobId = this.generateId();
        const file = fileObj?.file; // File or Blob
        if (!file) return null;
        const name = fileObj?.name || (file as File).name || 'file';
        const type = fileObj?.type || file.type || 'application/octet-stream';
        const size = fileObj?.size || file.size || 0;
        await putBlob({ id: blobId, blob: file, name, type, size });
        return { blobId, name, type, size };
      } catch {
        return null;
      }
    };

    // images
    if (Array.isArray(data.images) && data.images.length > 0) {
      for (const im of data.images) {
        const ref = await saveBlob(im);
        if (ref) attachmentRefs.push({ ...ref, kind: 'image' });
      }
    }
    // files
    if (Array.isArray(data.files) && data.files.length > 0) {
      for (const f of data.files) {
        const ref = await saveBlob(f);
        if (ref) attachmentRefs.push({ ...ref, kind: 'file' });
      }
    }

    // Create user message
    const userMsg: MessageRecord = {
      id: this.generateId(),
      conversationId,
      message: {
        role: 'user',
        content: data.userInput || ''
      },
      createdAt: now,
      // Legacy fields (optional, but kept for compatibility if needed elsewhere, though types say they are optional)
      type: 'text',
      attachments: attachmentRefs,
    };
    await putMessage(userMsg);

    // Create assistant message (XML/JSON depends on editor)
    const assistantMsg: MessageRecord = {
      id: this.generateId(),
      conversationId,
      message: {
        role: 'assistant',
        content: data.generatedCode || ''
      },
      createdAt: now + 1,
      type: (data.editor === 'excalidraw') ? 'json' : 'xml',
      attachments: [],
    };
    await putMessage(assistantMsg);

    return { conversationId, userMessageId: userMsg.id, assistantMessageId: assistantMsg.id };
  }

  /**
   * Return conversation previews compatible with HistoryModal UI.
   * Each item includes: { id, chartType, userInput, config, timestamp, editor }
   */
  async getHistories(): Promise<HistoryItem[]> {
    await this.ensureReady();
    const convs = await listConversations();
    const results: HistoryItem[] = [];
    for (const c of convs) {
      const msgs = await getConversationMessages(c.id);

      // v6.0: Messages are in format { id, conversationId, message: { role, content }, createdAt }
      const lastAssistant = [...msgs].reverse().find(m => m.message?.role === 'assistant');
      const lastUser = [...msgs].reverse().find(m => m.message?.role === 'user');

      // Extract user preview from message content
      let userPreview = '';
      if (lastUser?.message?.content) {
        if (typeof lastUser.message.content === 'string') {
          userPreview = lastUser.message.content.trim();
        } else if (Array.isArray(lastUser.message.content)) {
          // Multimodal message: extract text parts
          const textParts = lastUser.message.content
            .filter((part: LLMMessageContentPart) => part?.type === 'text')
            .map((part: LLMMessageContentPart) => part?.text || '');
          userPreview = textParts.join(' ').trim();

          // If no text but has images, show image hint
          if (!userPreview) {
            const imageCount = lastUser.message.content.filter((part: LLMMessageContentPart) =>
              part?.type === 'image' || part?.type === 'image_url'
            ).length;
            if (imageCount > 0) {
              userPreview = `来自图片 (${imageCount}张)`;
            }
          }
        }
      }

      // Extract assistant code from message content
      const assistantCode = typeof lastAssistant?.message?.content === 'string'
        ? lastAssistant.message.content
        : '';

      results.push({
        id: c.id,
        chartType: c.chartType || 'auto',
        userInput: userPreview || '(空消息)',
        config: c.config || null,
        timestamp: c.updatedAt || c.createdAt || Date.now(),
        editor: (() => {
          // Prefer stored editor type
          if (c.editor) return c.editor;
          // Heuristic detection based on assistant content
          try {
            const content = assistantCode.trim();
            if (/<(mxfile|mxGraphModel|diagram)([\s>])/i.test(content)) return 'drawio';
            // Check fenced code hints
            if (/```\s*xml/i.test(content)) return 'drawio';
            if (/```\s*json/i.test(content)) return 'excalidraw';
            // Simple JSON shape hint
            const firstChar = content[0];
            if (firstChar === '[' || firstChar === '{') return 'excalidraw';
          } catch {}
          // Default to drawio if unknown (back-compat)
          return 'drawio';
        })(),
      });
    }
    return results;
  }

  async deleteHistory(id: string): Promise<void> {
    await this.ensureReady();
    await deleteConversation(id);
  }

  async clearAll(): Promise<void> {
    await this.ensureReady();
    await clearAllStores();
  }

  /**
   * Replace a conversation's messages with a new list.
   * messages: array of LLM-native message objects.
   */
  async replaceConversation(conversationId: string, messages: LLMMessage[], editor?: 'drawio' | 'excalidraw', config?: Partial<LLMConfig> | null, chartType?: string): Promise<void> {
    await this.ensureReady();
    await replaceConversationMessages({ conversationId, messages, editor, config, chartType });
  }

  async getConversationMessages(id: string): Promise<LLMMessage[]> {
    await this.ensureReady();
    const msgs = await getConversationMessages(id);
    // 返回LLM原生格式
    return msgs.map(m => m.message);
  }

  /**
   * Add a single message to a conversation (v6.0 refactor)
   * message should be in LLM native format: { role, content }
   * editor: 'drawio' | 'excalidraw' (optional, used for conversation initialization)
   * config: LLM config object (optional, saved to conversation)
   * chartType: diagram type (optional, saved to conversation)
   */
  async addMessage(conversationId: string, message: LLMMessage, editor?: 'drawio' | 'excalidraw', config?: Partial<LLMConfig> | null, chartType?: string): Promise<string> {
    await this.ensureReady();
    const now = Date.now();

    // Ensure conversation exists with editor type, config, and chartType
    await addConversationIfMissing({
      id: conversationId,
      title: '对话',
      editor: editor,
      config: config,
      chartType: chartType,
    });

    // Create message record
    const msgRecord: MessageRecord = {
      id: this.generateId(),
      conversationId,
      message: message, // LLM native format
      createdAt: now,
    };

    await putMessage(msgRecord);
    return msgRecord.id;
  }

}

export const historyManager = new HistoryManager();
