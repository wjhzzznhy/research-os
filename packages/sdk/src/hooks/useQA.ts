import { useState, useCallback } from 'react';
import { qaApi } from '../api';
import type { QAAskRequest, QAAskResponse } from '@research-os/types';

export interface UseQAReturn {
  loading: boolean;
  answer: string;
  sources: any[];
  images: any[];
  ask: (request: QAAskRequest) => Promise<QAAskResponse>;
  askStream: (request: QAAskRequest, options?: { onAnswerChunk?: (chunk: string) => void; onSources?: (sources: any[]) => void }) => Promise<QAAskResponse>;
  error: Error | null;
  reset: () => void;
}

export function useQA(): UseQAReturn {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const ask = useCallback(async (request: QAAskRequest): Promise<QAAskResponse> => {
    setLoading(true);
    setError(null);
    setAnswer('');
    setSources([]);
    setImages([]);

    try {
      const response = await qaApi.ask(request);
      setAnswer(response.answer);
      setSources(response.sources);
      setImages(response.images);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('QA failed'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const askStream = useCallback(
    async (
      request: QAAskRequest,
      options?: {
        onAnswerChunk?: (chunk: string) => void;
        onSources?: (sources: any[]) => void;
      }
    ): Promise<QAAskResponse> => {
      setLoading(true);
      setError(null);
      setAnswer('');
      setSources([]);
      setImages([]);

      try {
        const response = await qaApi.askStream(request, {
          onAnswerChunk: (chunk) => {
            setAnswer((prev) => prev + chunk);
            options?.onAnswerChunk?.(chunk);
          },
          onSources: (newSources) => {
            setSources(newSources);
            options?.onSources?.(newSources);
          },
        });
        return response;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('QA stream failed'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setAnswer('');
    setSources([]);
    setImages([]);
    setError(null);
  }, []);

  return {
    loading,
    answer,
    sources,
    images,
    ask,
    askStream,
    error,
    reset,
  };
}
