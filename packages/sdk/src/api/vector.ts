import { apiClient } from './client';
import type {
  VectorSearchRequest,
  VectorSearchResponse,
  VectorAddItemRequest,
  VectorAddItemResponse,
  VectorStatsResponse,
} from '@research-os/types';

export const vectorApi = {
  search: async (request: VectorSearchRequest): Promise<VectorSearchResponse> => {
    const response = await apiClient.post<VectorSearchResponse>('/qa/search', request);
    return response.data;
  },

  addItem: async (request: VectorAddItemRequest): Promise<VectorAddItemResponse> => {
    const response = await apiClient.post<VectorAddItemResponse>('/materials/upload', request);
    return response.data;
  },

  deleteItem: async (id: string) => {
    const response = await apiClient.delete(`/materials/${id}`);
    return response.data;
  },

  getStats: async (): Promise<VectorStatsResponse> => {
    const response = await apiClient.get<VectorStatsResponse>('/system/stats');
    return response.data;
  },
};
