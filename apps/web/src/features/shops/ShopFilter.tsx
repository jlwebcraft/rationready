import React from 'react';
import { Filter, Search } from 'lucide-react';

interface ShopFilterProps {
  localities: string[];
  selectedLocality: string;
  onLocalityChange: (locality: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCount: number;
}

export const ShopFilter: React.FC<ShopFilterProps> = ({
  localities,
  selectedLocality,
  onLocalityChange,
  searchQuery,
  onSearchChange,
  totalCount,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Locality Selector */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-brand-700 shrink-0" />
          <label htmlFor="locality-select" className="text-xs font-bold text-slate-700 uppercase">
            Locality:
          </label>
          <select
            id="locality-select"
            value={selectedLocality}
            onChange={(e) => onLocalityChange(e.target.value)}
            className="text-xs sm:text-sm bg-slate-50 border border-slate-300 text-slate-900 rounded-md px-3 py-1.5 min-h-11 focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="ALL">All Localities</option>
            {localities.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by shop name or landmark..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-md min-h-11 focus:outline-none focus:ring-2 focus:ring-brand-600 placeholder-slate-400"
            aria-label="Search shops"
          />
        </div>
      </div>

      <div className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center justify-between">
        <span>
          Showing {totalCount} Fair Price Shop{totalCount === 1 ? '' : 's'}
        </span>
        <span className="text-[11px] text-brand-700 font-semibold">Demo Locality A Active</span>
      </div>
    </div>
  );
};
