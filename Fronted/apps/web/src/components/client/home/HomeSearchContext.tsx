'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { HomeContentFilter } from './homeSearchFilters';

export function normalizeHomeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export type HomeSearchHit = {
  kind: Exclude<HomeContentFilter, 'todos'>;
  id: string;
};

type HomeSearchContextValue = {
  filter: HomeContentFilter;
  query: string;
  pendingHit: HomeSearchHit | null;
  setFilter: (filter: HomeContentFilter) => void;
  setQuery: (query: string) => void;
  openHit: (hit: HomeSearchHit) => void;
  consumePendingHit: () => void;
  clearSearch: () => void;
  matchesQuery: (
    ...parts: Array<string | null | undefined>
  ) => boolean;
  hasActiveQuery: boolean;
};

const FALLBACK_SEARCH: HomeSearchContextValue = {
  filter: 'todos',
  query: '',
  pendingHit: null,
  setFilter: () => undefined,
  setQuery: () => undefined,
  openHit: () => undefined,
  consumePendingHit: () => undefined,
  clearSearch: () => undefined,
  matchesQuery: () => true,
  hasActiveQuery: false,
};

const HomeSearchContext = createContext<HomeSearchContextValue | null>(null);

export function HomeSearchProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<HomeContentFilter>('todos');
  const [query, setQuery] = useState('');
  const [pendingHit, setPendingHit] = useState<HomeSearchHit | null>(null);

  const clearSearch = useCallback(() => {
    setFilter('todos');
    setQuery('');
    setPendingHit(null);
  }, []);

  const openHit = useCallback((hit: HomeSearchHit) => {
    setPendingHit(hit);
  }, []);

  const consumePendingHit = useCallback(() => {
    setPendingHit(null);
  }, []);

  const matchesQuery = useCallback((
    ...parts: Array<string | null | undefined>
  ) => {
    const needle = normalizeHomeSearchText(query);

    if (!needle) {
      return true;
    }

    return parts.some((part) =>
      normalizeHomeSearchText(part || '').includes(needle),
    );
  }, [query]);

  const value = useMemo(() => ({
    filter,
    query,
    pendingHit,
    setFilter,
    setQuery,
    openHit,
    consumePendingHit,
    clearSearch,
    matchesQuery,
    hasActiveQuery: query.trim().length > 0,
  }), [
    clearSearch,
    consumePendingHit,
    filter,
    matchesQuery,
    openHit,
    pendingHit,
    query,
  ]);

  return (
    <HomeSearchContext.Provider value={value}>
      {children}
    </HomeSearchContext.Provider>
  );
}

export function useHomeSearch(): HomeSearchContextValue {
  return useContext(HomeSearchContext) ?? FALLBACK_SEARCH;
}

export function useHomeModuleSearch(
  expected: HomeContentFilter | HomeContentFilter[],
) {
  const search = useHomeSearch();
  const expectedFilters = Array.isArray(expected)
    ? expected
    : [expected];

  const filterScoped = (
    search.filter !== 'todos'
    && expectedFilters.includes(search.filter)
  );
  const todosScoped = (
    search.filter === 'todos'
    && search.hasActiveQuery
  );
  const active = filterScoped || todosScoped;

  return {
    ...search,
    active,
    query: active ? search.query : '',
    hasActiveQuery: active && search.hasActiveQuery,
    matchesQuery: (
      ...parts: Array<string | null | undefined>
    ) => !active || search.matchesQuery(...parts),
  };
}

export function homeSearchEmptyCopy(query: string): {
  title: string;
  description: string;
} {
  const label = query.trim();

  return {
    title: `Sin resultados para "${label}"`,
    description: 'Prueba con otro texto o cambia el filtro de contenido.',
  };
}
