import { ChatCategory } from '../../mocks/chats';
import CreateCategoryModal from './CreateCategoryModal';
import AssignCategoryModal from './AssignCategoryModal';

interface ChatCategoryModalsProps {
  categories: ChatCategory[];
  creating: boolean;
  onCreate: (category: Omit<ChatCategory, 'id'>) => void;
  onCloseCreate: () => void;
  assigningChat: { name: string; categoryIds?: string[] } | null;
  onSaveAssign: (categoryIds: string[]) => void;
  onCloseAssign: () => void;
}

/** Los dos modales de categorías del módulo de Chat, agrupados */
export default function ChatCategoryModals({
  categories,
  creating,
  onCreate,
  onCloseCreate,
  assigningChat,
  onSaveAssign,
  onCloseAssign,
}: ChatCategoryModalsProps) {
  return (
    <>
      <CreateCategoryModal visible={creating} onCreate={onCreate} onClose={onCloseCreate} />

      <AssignCategoryModal
        visible={!!assigningChat}
        chatName={assigningChat?.name}
        categories={categories}
        selectedIds={assigningChat?.categoryIds ?? []}
        onSave={onSaveAssign}
        onClose={onCloseAssign}
      />
    </>
  );
}
