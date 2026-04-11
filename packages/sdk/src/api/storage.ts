import { apiClient } from './client';

export interface PresignedUrlRequest {
  filename: string;
  bucket?: string;
  expiresIn?: number;
}

export const storageApi = {
  getAsset: async (objectName: string) => {
    const response = await apiClient.get(`/storage/assets/${objectName}`);
    return response.data;
  },

  getPaper: async (objectName: string) => {
    const response = await apiClient.get(`/storage/papers/${objectName}`);
    return response.data;
  },
};
