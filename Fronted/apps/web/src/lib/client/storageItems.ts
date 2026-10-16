export interface StorageItem {
  id: string;
  name: string;
  type: 'folder' | 'pdf' | 'image' | 'video' | 'doc' | 'zip' | 'sheet';
  size?: string;
  itemCount?: number;
  date: string;
  updatedAt?: string;
  parentId: string | null;
  isSigned?: boolean;
  signerName?: string;
  signedAt?: string;
  isProtected?: boolean;
  categoryIds?: string[];
}

export interface StorageCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}
