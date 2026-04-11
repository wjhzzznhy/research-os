import { apiClient } from './client';
import type { IconSearchResponse } from '@research-os/types';

export interface UnifiedSearchRequest {
  query: string;
  types?: string[];
  limit?: number;
}

export const searchApi = {
  icons: async (query: string, options?: { top_k?: number }): Promise<IconSearchResponse> => {
    const params = new URLSearchParams({
      q: query,
      ...(options?.top_k && { top_k: options.top_k.toString() }),
    });
    const response = await apiClient.get<IconSearchResponse>(`/icons/search/text?${params}`, {
      timeout: 60000,
    });
    return response.data;
  },

  iconsByImage: async (file: File, options?: { top_k?: number }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.top_k) {
      formData.append('top_k', options.top_k.toString());
    }
    const response = await apiClient.upload('/icons/search/image', file, {
      formData,
    });
    return response.data;
  },
};
