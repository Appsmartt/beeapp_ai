import { StorageItem } from '../stores/storageStore';

export type SortOption = 'name' | 'date' | 'size' | 'type';

export type StorageFilter = 'all' | 'recent' | 'docs' | 'media' | 'signed' | 'shared' | 'trash';

// Sorting Logic
export function getSortedItems(list: StorageItem[], sortBy: SortOption): StorageItem[] {
  return [...list].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'date') {
      return b.updatedAt.localeCompare(a.updatedAt);
    }
    if (sortBy === 'size') {
      const sizeA = a.size ? parseFloat(a.size) : 0;
      const sizeB = b.size ? parseFloat(b.size) : 0;
      return sizeB - sizeA;
    }
    if (sortBy === 'type') {
      return a.type.localeCompare(b.type);
    }
    return 0;
  });
}

// Filtering Logic
export function getFilteredItems(
  items: StorageItem[],
  searchQuery: string,
  currentFolderId: string | null,
  activeFilter: StorageFilter,
  sortBy: SortOption
): StorageItem[] {
  // 1. Filter by current folder hierarchy (only when query is empty)
  let list = items;
  if (!searchQuery) {
    list = items.filter((item) => item.parentId === currentFolderId);
  } else {
    // If searching, search globally in all subfolders
    list = items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // 2. Filter by chip selections
  if (activeFilter === 'recent') {
    list = list.filter((item) => item.updatedAt.includes('Hoy') || item.updatedAt.includes('Ayer'));
  } else if (activeFilter === 'docs') {
    list = list.filter((item) => item.type === 'pdf' || item.type === 'doc');
  } else if (activeFilter === 'media') {
    list = list.filter((item) => item.type === 'image' || item.type === 'video');
  } else if (activeFilter === 'signed') {
    list = list.filter((item) => item.isSigned);
  } else if (activeFilter === 'shared') {
    list = list.filter((item) => item.isShared);
  }

  return getSortedItems(list, sortBy);
}

// Mock upload file naming
export function buildMockUploadFile(
  type: 'pdf' | 'image' | 'video' | 'doc',
  currentFolderId: string | null,
  customName?: string
): StorageItem {
  let name = '';
  let size = '1.5 MB';
  if (type === 'pdf') {
    name = customName || `Documento_Escaneado_${Date.now().toString().slice(-4)}.pdf`;
    size = '2.1 MB';
  } else if (type === 'image') {
    name = `IMG_${Date.now().toString().slice(-4)}.jpg`;
    size = '1.8 MB';
  } else if (type === 'video') {
    name = `VIDEO_${Date.now().toString().slice(-4)}.mp4`;
    size = '12.4 MB';
  } else {
    name = `Nota_Contrato_${Date.now().toString().slice(-4)}.doc`;
    size = '780 KB';
  }

  return {
    id: `file-${Date.now()}`,
    name,
    type,
    size,
    updatedAt: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    parentId: currentFolderId,
  };
}
