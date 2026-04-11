import { useState, useCallback } from 'react';
import { vectorApi } from '../api';
import type {
  VectorSearchRequest,
  VectorSearchResponse,
  VectorAddItemRequest,
  VectorAddItemResponse,
  VectorStatsResponse,
} from '@research-os/types';

export interface UseVectorReturn {
  searching: boolean;
  searchResults: VectorSearchResponse | null;
  search: (request: VectorSearchRequest) => Promise<VectorSearchResponse>;
  addItem: (request: VectorAddItemRequest) => Promise<VectorAddItemResponse>;
  deleteItem: (id: string) => Promise<any>;
  getStats: () => Promise<VectorStatsResponse>;
  stats: VectorStatsResponse | null;
  error: Error | null;
}

export function useVector(): UseVectorReturn {
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<VectorSearchResponse | null>(null);
  const [stats, setStats] = useState<VectorStatsResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (request: VectorSearchRequest): Promise<VectorSearchResponse> => {
    setSearching(true);
    setError(null);

    try {
      const response = await vectorApi.search(request);
      setSearchResults(response);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Vector search failed'));
      throw err;
    } finally {
      setSearching(false);
    }
  }, []);

  const addItem = useCallback(async (request: VectorAddItemRequest): Promise<VectorAddItemResponse> => {
    setError(null);
    try {
      return await vectorApi.addItem(request);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add vector item'));
      throw err;
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setError(null);
    try {
      return await vectorApi.deleteItem(id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete vector item'));
      throw err;
    }
  }, []);

  const getStats = useCallback(async (): Promise<VectorStatsResponse> => {
    setError(null);
    try {
      const response = await vectorApi.getStats();
      setStats(response);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get vector stats'));
      throw err;
    }
  }, []);

  return {
    searching,
    searchResults,
    search,
    addItem,
    deleteItem,
    getStats,
    stats,
    error,
  };
}
