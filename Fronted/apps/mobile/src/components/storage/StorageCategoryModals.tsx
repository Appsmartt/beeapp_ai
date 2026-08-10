import { StorageCategory } from '../../stores/storageStore';
import StorageAssignCategoryModal from './StorageAssignCategoryModal';
import CreateCategoryModal from '../chat/CreateCategoryModal';

interface StorageCategoryModalsProps {
  /** Create modal */
  createVisible: boolean;
  onCreate: (data: Omit<StorageCategory, 'id'>) => void;
  onCloseCreate: () => void;
  /** Assign modal */
  assignVisible: boolean;
  itemName?: string;
  categories: StorageCategory[];
  selectedIds: string[];
  onSave: (categoryIds: string[]) => void;
  onCloseAssign: () => void;
}

/** Wraps both category modals for storage to keep the screen file small */
export default function StorageCategoryModals({
  createVisible,
  onCreate,
  onCloseCreate,
  assignVisible,
  itemName,
  categories,
  selectedIds,
  onSave,
  onCloseAssign,
}: StorageCategoryModalsProps) {
  return (
    <>
      <CreateCategoryModal
        visible={createVisible}
        onCreate={onCreate}
        onClose={onCloseCreate}
      />
      <StorageAssignCategoryModal
        visible={assignVisible}
        itemName={itemName}
        categories={categories}
        selectedIds={selectedIds}
        onSave={onSave}
        onClose={onCloseAssign}
      />
    </>
  );
}
