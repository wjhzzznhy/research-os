import { apiClient } from './client';
import type { QAAskRequest, QAAskResponse } from '@research-os/types';

export const qaApi = {
  ask: async (request: QAAskRequest): Promise<QAAskResponse> => {
    const response = await apiClient.post<QAAskResponse>('/qa/ask', request);
    return response.data;
  },
};
