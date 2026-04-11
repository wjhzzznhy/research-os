import { useState, useCallback } from 'react';
import { knowledgeApi } from '../api';
import type { FileUploadStatus } from '@research-os/types';

export interface UseKnowledgeReturn {
  uploading: boolean;
  uploadProgress: Record<string, number>;
  upload: (files: File[]) => Promise<FileUploadStatus[]>;
  list: () => Promise<any>;
  remove: (id: string) => Promise<any>;
  error: Error | null;
}

export function useKnowledge(): UseKnowledgeReturn {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(async (files: File[]): Promise<FileUploadStatus[]> => {
    setUploading(true);
    setError(null);
    setUploadProgress({});

    try {
      const results = await knowledgeApi.upload({
        files,
        onProgress: (file, progress) => {
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: progress,
          }));
        },
      });
      return results;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Upload failed'));
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const list = useCallback(async () => {
    try {
      return await knowledgeApi.list();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to list knowledge'));
      throw err;
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      return await knowledgeApi.delete(id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete knowledge'));
      throw err;
    }
  }, []);

  return {
    uploading,
    uploadProgress,
    upload,
    list,
    remove,
    error,
  };
}
