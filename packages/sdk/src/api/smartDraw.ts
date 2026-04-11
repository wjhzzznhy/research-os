import { apiClient } from './client';
import type { SmartDrawRequest, HistoryItem } from '@research-os/types';

export const smartDrawApi = {
  generate: async (request: SmartDrawRequest, options?: {
    onChunk?: (chunk: string) => void;
    onComplete?: (result: string) => void;
  }) => {
    if (options?.onChunk) {
      return new Promise<string>((resolve, reject) => {
        let fullContent = '';

        apiClient.sse('/smart-draw/generate', {
          body: request,
          onMessage: (data) => {
            if (data.content) {
              fullContent += data.content;
              options.onChunk?.(data.content);
            }
            if (data.error) {
              reject(new Error(data.error));
            }
          },
          onError: (error) => {
            reject(error);
          },
          onClose: () => {
            options.onComplete?.(fullContent);
            resolve(fullContent);
          },
        });
      });
    }

    const response = await apiClient.post('/smart-draw/generate', request);
    return response.data;
  },

  getHistory: async (): Promise<HistoryItem[]> => {
    const response = await apiClient.get('/smart-draw/history');
    return response.data;
  },

  saveHistory: async (item: HistoryItem) => {
    const response = await apiClient.post('/smart-draw/history', item);
    return response.data;
  },
};
