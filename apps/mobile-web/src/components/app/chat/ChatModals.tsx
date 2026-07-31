'use client';

import { ContactItem } from '@/mocks/contacts';
import CreateStatusModal from './CreateStatusModal';
import CreateCategoryModal from './modals/CreateCategoryModal';
import CreateCommunityModal from './modals/CreateCommunityModal';
import CreateContactModal from '../contacts/CreateContactModal';

/** Cuál de los modales de creación está abierto (null si ninguno) */
export type ChatModalKey = 'status' | 'category' | 'community' | 'contact' | null;

interface ChatModalsProps {
  open: ChatModalKey;
  onClose: () => void;
  onPublishStatus: (text: string, bgColor: string) => void;
  onCreateCategory: (name: string, color: string) => void;
  onCreateCommunity: (name: string, description: string, category: string) => void;
  onCreateContact: (contact: ContactItem) => void;
}

/** Modales de creación del módulo de Chat, agrupados para no inflar ChatModule */
export default function ChatModals({
  open,
  onClose,
  onPublishStatus,
  onCreateCategory,
  onCreateCommunity,
  onCreateContact,
}: ChatModalsProps) {
  return (
    <>
      <CreateStatusModal
        isOpen={open === 'status'}
        onClose={onClose}
        onPublish={onPublishStatus}
      />

      <CreateCategoryModal
        isOpen={open === 'category'}
        onClose={onClose}
        onCreate={(name, _iconName, color) => onCreateCategory(name, color)}
      />

      <CreateCommunityModal
        isOpen={open === 'community'}
        onClose={onClose}
        onCreate={onCreateCommunity}
      />

      <CreateContactModal
        isOpen={open === 'contact'}
        onClose={onClose}
        onCreate={onCreateContact}
      />
    </>
  );
}
