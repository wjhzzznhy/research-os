import { apiClient } from './client';

export interface MaterialAsset {
  id: string;
  name: string;
  url: string;
  kind?: string | null;
  preview_url?: string | null;
  tags?: string[];
  category?: string | null;
  description?: string | null;
  status?: string | null;
  metadata?: Record<string, any>;
}

export interface UploadMaterialOptions {
  category?: string;
  tags?: string[];
  source?: string;
  description?: string;
}

export const materialsApi = {
  upload: async (file: File, name: string, options?: UploadMaterialOptions): Promise<MaterialAsset> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (options?.category) formData.append('category', options.category);
    if (options?.tags?.length) formData.append('tags', options.tags.join(','));
    if (options?.source) formData.append('source', options.source);
    if (options?.description) formData.append('description', options.description);

    const response = await apiClient.upload<MaterialAsset>('/materials/upload', file, {
      formData,
    });
    return response.data;
  },

  uploadExcalidrawFile: async (
    file: File,
    name: string,
    options?: UploadMaterialOptions & { preview?: File },
  ): Promise<MaterialAsset> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (options?.category) formData.append('category', options.category);
    if (options?.tags?.length) formData.append('tags', options.tags.join(','));
    if (options?.source) formData.append('source', options.source);
    if (options?.description) formData.append('description', options.description);
    if (options?.preview) formData.append('preview', options.preview);

    const response = await apiClient.upload<MaterialAsset>('/materials/upload-excalidraw-file', file, {
      formData,
    });
    return response.data;
  },

  delete: async (materialId: string): Promise<{ id: string; deleted: boolean }> => {
    const response = await apiClient.delete(`/materials/${materialId}`);
    return response.data;
  },
};
