'use client';

import { Search } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
}

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  onFilterChange?: (id: string, value: string) => void;
}

export default function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters = [],
  onFilterChange,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <div className="filter-bar-search-box">
        <Search size={16} className="filter-bar-search-icon" />
        <input
          type="text"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="filter-bar-search-input"
        />
      </div>

      {filters.map((filter) => (
        <select
          key={filter.id}
          value={filter.value}
          onChange={(event) => onFilterChange?.(filter.id, event.target.value)}
          className="filter-bar-select"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
