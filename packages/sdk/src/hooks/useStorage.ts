import { useState, useCallback } from 'react';
import { storageApi } from '../api';

export interface UseStorageReturn {
  uploading: boolean;
  uploadProgress: number;
  getPresignedUrl: (filename: string, bucket?: string, expiresIn?: number) => Promise<string>;
  uploadWithPresignedUrl: (file: File, presignedUrl: string, options?: { onProgress?: (progress: number) => void }) => Promise<void>;
  deleteFile: (filename: string, bucket?: string) => Promise<any>;
  error: Error | null;
}

export function useStorage(): UseStorageReturn {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const getPresignedUrl = useCallback(async (filename: string, bucket?: string, expiresIn?: number): Promise<string> => {
    setError(null);
    try {
      return await storageApi.getPresignedUrl({ filename, bucket, expiresIn });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get presigned URL'));
      throw err;
    }
  }, []);

  const uploadWithPresignedUrl = useCallback(
    async (file: File, presignedUrl: string, options?: { onProgress?: (progress: number) => void }): Promise<void> => {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      try {
        await storageApi.uploadWithPresignedUrl(file, presignedUrl, {
          onProgress: (progress) => {
            setUploadProgress(progress);
            options?.onProgress?.(progress);
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Upload failed'));
        throw err;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const deleteFile = useCallback(async (filename: string, bucket?: string) => {
    setError(null);
    try {
      return await storageApi.delete(filename, bucket);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete file'));
      throw err;
    }
  }, []);

  return {
    uploading,
    uploadProgress,
    getPresignedUrl,
    uploadWithPresignedUrl,
    deleteFile,
    error,
  };
}
