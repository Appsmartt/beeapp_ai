import type {
  StorageFile,
  StorageFolder,
  StorageSummary,
} from '@beeapp/shared-types';

export type StorageItemType =
  | 'folder'
  | 'pdf'
  | 'image'
  | 'video'
  | 'doc'
  | 'audio'
  | 'archive'
  | 'other';

export interface StorageItem {
  id: string;
  name: string;
  type: StorageItemType;
  size?: string;
  sizeBytes?: number;
  updatedAt: string;
  parentId: string | null;
  itemCount?: number;
  isSigned?: boolean;
  signerName?: string;
  signedAt?: string;
  isShared?: boolean;
  categoryIds?: string[];
  mimeType?: string;
  status?: 'uploading' | 'ready' | 'failed' | 'trashed';
  createdAt?: string;
}

export interface StorageCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const MOCK_STORAGE_CATEGORIES: StorageCategory[] = [
  {
    id: 'scat-personal',
    name: 'Personal',
    icon: 'User',
    color: '#EBF5FF',
  },
  {
    id: 'scat-work',
    name: 'Trabajo',
    icon: 'Briefcase',
    color: '#F1F3F5',
  },
  {
    id: 'scat-important',
    name: 'Importante',
    icon: 'Star',
    color: '#FEF3C7',
  },
];

let storageItems: StorageItem[] = [];
let storageSummary: StorageSummary | null = null;

export function addStorageCategory(
  category: Omit<StorageCategory, 'id'>,
): StorageCategory {
  const created: StorageCategory = {
    ...category,
    id: `scat_${Date.now().toString(36)}`,
  };

  MOCK_STORAGE_CATEGORIES.push(created);

  return created;
}

export function setItemCategories(
  itemId: string,
  categoryIds: string[],
): void {
  storageItems = storageItems.map((item) =>
    item.id === itemId
      ? { ...item, categoryIds }
      : item,
  );
}

export function getItems(): StorageItem[] {
  return storageItems;
}

export function setItems(
  items: StorageItem[],
): void {
  storageItems = items;
}

export function getStorageSummary(): StorageSummary | null {
  return storageSummary;
}

export function setStorageSummary(
  summary: StorageSummary | null,
): void {
  storageSummary = summary;
}

export function mapStorageFolderToItem(
  folder: StorageFolder,
  itemCount = 0,
): StorageItem {
  return {
    id: folder.id,
    name: folder.name,
    type: 'folder',
    parentId: folder.parent_id,
    itemCount,
    updatedAt: formatStorageDate(folder.updated_at),
    createdAt: folder.created_at,
  };
}

export function mapStorageFileToItem(
  file: StorageFile,
): StorageItem {
  return {
    id: file.id,
    name: file.display_name,
    type: mapFileKindToItemType(file),
    parentId: file.folder_id,
    size: formatBytes(file.size_bytes),
    sizeBytes: file.size_bytes,
    updatedAt: formatStorageDate(file.updated_at),
    mimeType: file.mime_type,
    status: file.status,
    createdAt: file.created_at,
  };
}

function mapFileKindToItemType(
  file: StorageFile,
): StorageItemType {
  if (file.kind === 'image') {
    return 'image';
  }

  if (file.kind === 'video') {
    return 'video';
  }

  if (file.kind === 'audio') {
    return 'audio';
  }

  if (file.mime_type === 'application/pdf') {
    return 'pdf';
  }

  if (
    file.kind === 'document'
    || file.kind === 'spreadsheet'
    || file.kind === 'presentation'
  ) {
    return 'doc';
  }

  if (file.kind === 'archive') {
    return 'archive';
  }

  return 'other';
}

export function formatBytes(
  bytes: number,
): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = bytes / 1024 ** exponent;
  const decimals = exponent === 0 ? 0 : value >= 10 ? 1 : 2;

  return `${value.toFixed(decimals)} ${units[exponent]}`;
}

export function formatStorageDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();

  if (isToday) {
    return `Hoy, ${date.toLocaleTimeString(
      'es-CO',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    )}`;
  }

  return date.toLocaleDateString(
    'es-CO',
    {
      day: '2-digit',
      month: 'short',
    },
  );
}