import { apiClient } from './client';
import type { FileUploadStatus, UploadResponse } from '@research-os/types';

export interface UploadKnowledgeRequest {
  files: File[];
  onProgress?: (file: File, progress: number) => void;
}

export const knowledgeApi = {
  upload: async (request: UploadKnowledgeRequest): Promise<FileUploadStatus[]> => {
    const results: FileUploadStatus[] = [];

    for (const file of request.files) {
      try {
        const response = await apiClient.upload<UploadResponse>('/files/upload', file, {
          onUploadProgress: (progress) => {
            request.onProgress?.(file, progress);
          },
        });

        results.push(...response.data.uploaded);
      } catch (error) {
        results.push({
          filename: file.name,
          status: 'error',
          message: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }

    return results;
  },

  list: async () => {
    const response = await apiClient.get('/files/list');
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/files/${id}`);
    return response.data;
  },
};
