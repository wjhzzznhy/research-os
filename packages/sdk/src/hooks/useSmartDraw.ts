import { useState, useCallback } from 'react';
import { smartDrawApi } from '../api';
import type { SmartDrawRequest, HistoryItem } from '@research-os/types';

export interface UseSmartDrawReturn {
  generating: boolean;
  generatedResult: string | null;
  generationProgress: string;
  generate: (request: SmartDrawRequest, options?: { onChunk?: (chunk: string) => void }) => Promise<string>;
  history: HistoryItem[];
  fetchHistory: () => Promise<HistoryItem[]>;
  saveHistory: (item: HistoryItem) => Promise<any>;
  error: Error | null;
}

export function useSmartDraw(): UseSmartDrawReturn {
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(
    async (request: SmartDrawRequest, options?: { onChunk?: (chunk: string) => void }): Promise<string> => {
      setGenerating(true);
      setError(null);
      setGenerationProgress('');
      setGeneratedResult(null);

      try {
        const result = await smartDrawApi.generate(request, {
          onChunk: (chunk) => {
            setGenerationProgress((prev) => prev + chunk);
            options?.onChunk?.(chunk);
          },
          onComplete: (result) => {
            setGeneratedResult(result);
          },
        });
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Generation failed'));
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  const fetchHistory = useCallback(async (): Promise<HistoryItem[]> => {
    try {
      const items = await smartDrawApi.getHistory();
      setHistory(items);
      return items;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch history'));
      throw err;
    }
  }, []);

  const saveHistory = useCallback(async (item: HistoryItem) => {
    try {
      const result = await smartDrawApi.saveHistory(item);
      setHistory((prev) => [item, ...prev]);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save history'));
      throw err;
    }
  }, []);

  return {
    generating,
    generatedResult,
    generationProgress,
    generate,
    history,
    fetchHistory,
    saveHistory,
    error,
  };
}
