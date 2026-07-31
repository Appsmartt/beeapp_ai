'use client';

import { ContactItem } from '@/mocks/contacts';
import { StatusItem } from '@/mocks/statuses';
import { ChatCategory } from '@/mocks/chats';
import CreateStatusModal from './CreateStatusModal';
import CreateCategoryModal from './modals/CreateCategoryModal';
import CreateCommunityModal from './modals/CreateCommunityModal';
import CreateContactModal from '../contacts/CreateContactModal';

export type ChatModalKey = 'status' | 'category' | 'community' | 'contact' | null;

interface ChatModalsProps {
  open: ChatModalKey;
  onClose: () => void;
  onPublishStatus: (status: Omit<StatusItem, 'id' | 'timestamp' | 'viewed'>) => void;
  onCreateCategory: (category: Omit<ChatCategory, 'id'>) => void;
  onCreateCommunity: (name: string, description: string, category: string) => void;
  onCreateContact: (contact: ContactItem) => void;
}

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
        visible={open === 'status'}
        onClose={onClose}
        onPublish={onPublishStatus}
      />

      <CreateCategoryModal
        isOpen={open === 'category'}
        onClose={onClose}
        onCreate={onCreateCategory}
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
