/**
 * 解析 SSE 流
 * @param {Response} response - Fetch response
 * @param {Object} options
 * @param {Function} options.onChunk - 收到增量内容的回调
 * @returns {Promise<string>} 完整内容
 */
interface SSEParserOptions {
  onChunk?: (chunk: string) => void;
}

interface SSEEvent {
  content?: string;
  error?: string;
  detail?: any;
  [key: string]: any;
}

export async function parseSSEStream(
  response: Response,
  { onChunk }: SSEParserOptions
): Promise<string> {
  if (!response.body) return '';
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last partial line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data) as SSEEvent;
            if (parsed && (typeof parsed.error === 'string' && parsed.error.trim())) {
              throw new Error(parsed.error);
            }
            if (parsed && parsed.detail) {
              const detailText = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
              throw new Error(detailText);
            }
            // ResearchOS backend sends { content: "..." }
            if (parsed && parsed.content) {
              accumulated += parsed.content;
              if (onChunk) onChunk(accumulated);
            }
          } catch (e) {
            if (e instanceof Error) {
              throw e;
            }
            console.warn('SSE JSON parse error:', e, data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  return accumulated;
}

/**
 * 备用解析器（如果后端格式不同）
 */
export async function parseSSEStreamAlt(
  response: Response,
  options: SSEParserOptions
): Promise<string> {
  return parseSSEStream(response, options);
}
