'use client';

import { useState, useCallback } from 'react';
import { searchApi } from '@/lib/api';
import type { SearchResponse, IconSearchResponse } from '@/types/api';

export interface UseSearchReturn {
  searching: boolean;
  unifiedResults: SearchResponse | null;
  iconResults: IconSearchResponse | null;
  unifiedSearch: (query: string, options?: { types?: string[]; limit?: number }) => Promise<SearchResponse>;
  searchIcons: (query: string, options?: { limit?: number; category?: string }) => Promise<IconSearchResponse>;
  error: Error | null;
  reset: () => void;
}

export function useSearch(): UseSearchReturn {
  const [searching, setSearching] = useState(false);
  const [unifiedResults, setUnifiedResults] = useState<SearchResponse | null>(null);
  const [iconResults, setIconResults] = useState<IconSearchResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const unifiedSearch = useCallback(
    async (query: string, options?: { types?: string[]; limit?: number }): Promise<SearchResponse> => {
      setSearching(true);
      setError(null);

      try {
        const response = await searchApi.unified({ query, ...options });
        setUnifiedResults(response);
        return response;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unified search failed'));
        throw err;
      } finally {
        setSearching(false);
      }
    },
    []
  );

  const searchIcons = useCallback(
    async (query: string, options?: { limit?: number; category?: string }): Promise<IconSearchResponse> => {
      setSearching(true);
      setError(null);

      try {
        const response = await searchApi.icons(query, options);
        setIconResults(response);
        return response;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Icon search failed'));
        throw err;
      } finally {
        setSearching(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setUnifiedResults(null);
    setIconResults(null);
    setError(null);
  }, []);

  return {
    searching,
    unifiedResults,
    iconResults,
    unifiedSearch,
    searchIcons,
    error,
    reset,
  };
}
