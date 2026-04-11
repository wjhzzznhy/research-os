import React from 'react';
import { FileUpload } from './FileUpload';
import { useKnowledge } from '../hooks';

interface KnowledgeUploaderProps {
  onUploadComplete?: (results: any[]) => void;
  onUploadError?: (error: Error) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function KnowledgeUploader({
  onUploadComplete,
  onUploadError,
  accept = '.pdf,.doc,.docx,.txt,.md',
  multiple = true,
  className = '',
  children,
}: KnowledgeUploaderProps) {
  const { upload, uploading, uploadProgress, error } = useKnowledge();

  const handleFilesSelected = async (files: File[]) => {
    try {
      const results = await upload(files);
      onUploadComplete?.(results);
    } catch (err) {
      onUploadError?.(err instanceof Error ? err : new Error('Upload failed'));
    }
  };

  return (
    <div className={className}>
      <FileUpload
        onFilesSelected={handleFilesSelected}
        accept={accept}
        multiple={multiple}
        disabled={uploading}
      >
        {children || (
          <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
            {uploading ? (
              <div>
                <p className="text-gray-600">Uploading...</p>
                {Object.entries(uploadProgress).map(([filename, progress]) => (
                  <div key={filename} className="mt-2">
                    <p className="text-sm text-gray-500">{filename}: {Math.round(progress)}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-gray-600">Click or drag files to upload</p>
                <p className="text-sm text-gray-400 mt-1">Supported formats: PDF, DOC, DOCX, TXT, MD</p>
              </div>
            )}
          </div>
        )}
      </FileUpload>
      {error && <p className="text-red-500 mt-2 text-sm">{error.message}</p>}
    </div>
  );
}
