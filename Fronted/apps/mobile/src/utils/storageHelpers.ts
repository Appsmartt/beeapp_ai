import type { StorageItem } from '../stores/storageStore';

export type SortOption =
  | 'name'
  | 'date'
  | 'size'
  | 'type';

export type StorageFilter =
  | 'all'
  | 'recent'
  | 'docs'
  | 'media'
  | 'signed'
  | 'shared'
  | 'trash';

export function getSortedItems(
  list: StorageItem[],
  sortBy: SortOption,
): StorageItem[] {
  return [...list].sort((first, second) => {
    if (first.type === 'folder' && second.type !== 'folder') {
      return -1;
    }

    if (first.type !== 'folder' && second.type === 'folder') {
      return 1;
    }

    if (sortBy === 'name') {
      return first.name.localeCompare(
        second.name,
        'es',
      );
    }

    if (sortBy === 'date') {
      return (
        new Date(second.createdAt || 0).getTime()
        - new Date(first.createdAt || 0).getTime()
      );
    }

    if (sortBy === 'size') {
      return (
        (second.sizeBytes || 0)
        - (first.sizeBytes || 0)
      );
    }

    return first.type.localeCompare(second.type);
  });
}

export function getFilteredItems(
  items: StorageItem[],
  searchQuery: string,
  currentFolderId: string | null,
  activeFilter: StorageFilter,
  sortBy: SortOption,
): StorageItem[] {
  const normalizedQuery =
    searchQuery.trim().toLowerCase();

  let list = normalizedQuery
    ? items.filter((item) =>
      item.name.toLowerCase().includes(
        normalizedQuery,
      ),
    )
    : items.filter(
      (item) => item.parentId === currentFolderId,
    );

  if (activeFilter === 'docs') {
    list = list.filter(
      (item) =>
        item.type === 'pdf'
        || item.type === 'doc',
    );
  }

  if (activeFilter === 'media') {
    list = list.filter(
      (item) =>
        item.type === 'image'
        || item.type === 'video'
        || item.type === 'audio',
    );
  }

  if (activeFilter === 'signed') {
    list = list.filter((item) => item.isSigned);
  }

  if (activeFilter === 'shared') {
    list = list.filter((item) => item.isShared);
  }

  return getSortedItems(list, sortBy);
}