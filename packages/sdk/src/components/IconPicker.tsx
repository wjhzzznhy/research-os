import { useState, useEffect } from 'react';
import { useSearch } from '../hooks';
import type { IconAsset } from '@research-os/types';

interface IconPickerProps {
  onIconSelect?: (icon: IconAsset) => void;
  category?: string;
  limit?: number;
  className?: string;
}

export function IconPicker({
  onIconSelect,
  category,
  limit = 50,
  className = '',
}: IconPickerProps) {
  const [query, setQuery] = useState('');
  const { searchIcons, searching, iconResults, error } = useSearch();

  useEffect(() => {
    searchIcons(query || '', { category, limit });
  }, []);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    await searchIcons(searchQuery, { category, limit });
  };

  return (
    <div className={className}>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search icons..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
      />
      
      {searching && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto" />
        </div>
      )}

      {error && <p className="text-red-500 text-sm mb-2">{error.message}</p>}

      <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
        {iconResults?.icons?.map((icon) => (
          <button
            key={icon.id}
            onClick={() => onIconSelect?.(icon)}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
            title={icon.name || icon.id}
          >
            {icon.url ? (
              <img src={icon.url} alt={icon.name || icon.id} className="w-6 h-6 object-contain" />
            ) : (
              <span className="text-gray-400">Icon</span>
            )}
          </button>
        ))}
      </div>

      {!searching && iconResults?.icons?.length === 0 && (
        <p className="text-gray-500 text-center py-4">No icons found</p>
      )}
    </div>
  );
}
