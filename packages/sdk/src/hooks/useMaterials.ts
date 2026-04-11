import { useState } from 'react';
import { materialsApi } from '../api/materials';
import type { MaterialAsset, UploadMaterialOptions } from '../api/materials';

export function useMaterials() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<Error | null>(null);

  const upload = async (
    files: File[],
    options?: UploadMaterialOptions,
  ): Promise<{ items: MaterialAsset[] }> => {
    setUploading(true);
    setError(null);
    const items: MaterialAsset[] = [];

    try {
      for (const file of files) {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
        try {
          const result = await materialsApi.upload(file, file.name, options);
          items.push(result);
          setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
        } catch (err) {
          setUploadProgress((prev) => ({ ...prev, [file.name]: -1 }));
          throw err;
        }
      }
      return { items };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Upload failed'));
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const remove = async (materialId: string): Promise<boolean> => {
    try {
      const result = await materialsApi.delete(materialId);
      return result.deleted;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Delete failed'));
      return false;
    }
  };

  return {
    upload,
    remove,
    uploading,
    uploadProgress,
    error,
  };
}
