import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSearch } from '../hooks';

interface SearchBarProps {
  placeholder?: string;
  onSearchResults?: (results: any) => void;
  searchType?: 'unified' | 'icons';
  className?: string;
  debounceMs?: number;
}

export function SearchBar({
  placeholder = 'Search...',
  onSearchResults,
  searchType = 'unified',
  className = '',
  debounceMs = 300,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { unifiedSearch, searchIcons, searching, error } = useSearch();

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        onSearchResults?.(null);
        return;
      }

      setIsSearching(true);
      try {
        let results;
        switch (searchType) {
          case 'icons':
            results = await searchIcons(searchQuery);
            break;
          default:
            results = await unifiedSearch(searchQuery);
        }
        onSearchResults?.(results);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [searchType, unifiedSearch, searchIcons, onSearchResults]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setQuery(newQuery);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        performSearch(newQuery);
      }, debounceMs);
    },
    [performSearch, debounceMs]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      performSearch(query);
    },
    [query, performSearch]
  );

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {(searching || isSearching) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
          </div>
        )}
      </form>
      {error && <p className="text-red-500 mt-2 text-sm">{error.message}</p>}
    </div>
  );
}
