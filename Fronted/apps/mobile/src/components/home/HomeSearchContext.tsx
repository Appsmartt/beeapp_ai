import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  useModuleNav,
} from '../embedded/EmbeddedNavContext';
import type {
  SearchFilterType,
} from './searchFilters';

export function normalizeHomeSearchText(
  value: string,
): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

type HomeSearchContextValue = {
  filter: SearchFilterType | null;
  query: string;
  setFilter: (filter: SearchFilterType | null) => void;
  setQuery: (query: string) => void;
  clearSearch: () => void;
  matchesQuery: (
    ...parts: Array<string | null | undefined>
  ) => boolean;
  hasActiveQuery: boolean;
};

const FALLBACK_SEARCH: HomeSearchContextValue = {
  filter: null,
  query: '',
  setFilter: () => undefined,
  setQuery: () => undefined,
  clearSearch: () => undefined,
  matchesQuery: () => true,
  hasActiveQuery: false,
};

const HomeSearchContext = createContext<
  HomeSearchContextValue | null
>(null);

export function HomeSearchProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [filter, setFilter] = useState<
    SearchFilterType | null
  >(null);
  const [query, setQuery] = useState('');

  const clearSearch = useCallback(() => {
    setFilter(null);
    setQuery('');
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
    setFilter,
    setQuery,
    clearSearch,
    matchesQuery,
    hasActiveQuery: query.trim().length > 0,
  }), [
    clearSearch,
    filter,
    matchesQuery,
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
  expected: SearchFilterType | SearchFilterType[],
) {
  const search = useHomeSearch();
  const { embedded } = useModuleNav();
  const expectedFilters = Array.isArray(expected)
    ? expected
    : [expected];
  const active = embedded
    && search.filter !== null
    && expectedFilters.includes(search.filter);

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

export function homeSearchEmptyCopy(
  query: string,
): {
  title: string;
  description: string;
} {
  const label = query.trim();

  return {
    title: `Sin resultados para "${label}"`,
    description: 'Prueba con otro texto o quita el filtro.',
  };
}
