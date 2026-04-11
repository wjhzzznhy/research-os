import { apiClient } from './client';
import type { SearchResponse, IconSearchResponse } from '@/types/api';

export interface UnifiedSearchRequest {
  query: string;
  types?: string[];
  limit?: number;
}

export const searchApi = {
  unified: async (request: UnifiedSearchRequest): Promise<SearchResponse> => {
    const response = await apiClient.post<SearchResponse>('/search/unified', request, {
      timeout: 60000,
    });
    return response.data;
  },

  icons: async (query: string, options?: { limit?: number; category?: string }): Promise<IconSearchResponse> => {
    const params = new URLSearchParams({
      q: query,
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.category && { category: options.category }),
    });
    const response = await apiClient.get<IconSearchResponse>(`/icons/search/text?${params}`, {
      timeout: 60000,
    });
    return response.data;
  },
};
