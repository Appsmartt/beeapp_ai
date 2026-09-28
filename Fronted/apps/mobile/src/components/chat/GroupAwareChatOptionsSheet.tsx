import {
  type ComponentProps,
  useEffect,
  useState,
} from 'react';
import {
  getChatConversation,
  getChatParticipants,
} from '@beeapp/api-client';
import { Alert } from 'react-native';
import type {
  ChatConversation,
} from '@beeapp/shared-types';

import { getValidSessionCredentials } from '../../services/authSession';
import ChatOptionsSheet from './ChatOptionsSheet';
import GroupManagementModal from './GroupManagementModal';

type ManagementMode = 'owner' | 'admins';

type OptionsProps = ComponentProps<typeof ChatOptionsSheet>;

interface GroupAwareChatOptionsSheetProps extends OptionsProps {
  identityId: string | null;
  onGroupUpdated?: () => void;
  onDeleteGroupAfterTransfer?: (conversationId: string) => Promise<void>;
}

export default function GroupAwareChatOptionsSheet({
  chat,
  identityId,
  onClose,
  onDelete,
  onGroupUpdated,
  onDeleteGroupAfterTransfer,
  ...options
}: GroupAwareChatOptionsSheetProps) {
  const [detail, setDetail] = useState<{
    conversationId: string;
    identityId: string;
    conversation: ChatConversation;
  } | null>(null);
  const [management, setManagement] = useState<{
    conversationId: string;
    identityId: string;
    mode: ManagementMode;
    exitAfterTransfer?: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    if (!chat?.isGroup || !identityId) {
      return () => { cancelled = true; };
    }
    void (async () => {
      try {
        const auth = await getValidSessionCredentials();
        if (!auth || auth.scheme !== 'Bearer') return;
        const result = await getChatConversation(auth, chat.id);
        if (
          !cancelled
          && result.conversation.conversation_type === 'group'
          && result.conversation.own_participant?.identity_id === identityId
        ) {
          setDetail({
            conversationId: chat.id,
            identityId,
            conversation: result.conversation,
          });
        }
      } catch {
        if (!cancelled) setDetail(null);
      }
    })();
    return () => { cancelled = true; };
  }, [chat?.id, chat?.isGroup, identityId]);

  const loadedForThisChat = (
    detail?.conversationId === chat?.id
    && detail?.identityId === identityId
  );
  const cachedPermissions = (
    chat?.isGroup
    && chat.raw.own_participant?.identity_id === identityId
    && chat.raw.permissions?.is_active_participant
  ) ? chat.raw.permissions : null;
  const permissions = loadedForThisChat
    ? (
        detail.conversation.permissions?.is_active_participant
          ? detail.conversation.permissions
          : null
      )
    : cachedPermissions;

  const openManagement = (mode: ManagementMode) => {
    if (!chat || !identityId || !permissions) return;
    if (
      (mode === 'owner' && !permissions.can_transfer_ownership)
      || (
        mode === 'admins'
        && !permissions.can_promote_members
        && !permissions.can_demote_admins
      )
    ) return;
    setManagement({ conversationId: chat.id, identityId, mode });
    setDetail(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!chat?.isGroup) {
      onDelete();
      return;
    }
    if (!identityId) {
      onClose();
      Alert.alert('No fue posible eliminar', 'No se identificó tu identidad en el grupo.');
      return;
    }
    try {
      const auth = await getValidSessionCredentials();
      if (!auth || auth.scheme !== 'Bearer') {
        throw new Error('Inicia sesión para eliminar el grupo.');
      }
      const result = await getChatConversation(auth, chat.id);
      const group = result.conversation;
      if (
        group.conversation_type !== 'group'
        || group.own_participant?.identity_id !== identityId
        || !group.permissions?.is_active_participant
      ) {
        throw new Error('No tienes una participación activa en este grupo.');
      }
      if (group.permissions.own_role === 'owner') {
        const participants = await getChatParticipants(auth, chat.id);
        const others = participants.participants.filter(
          (participant) => (
            participant.identity_id !== identityId
            && !participant.left_at
            && !participant.removed_at
          ),
        );
        if (others.length > 0) {
          if (!group.permissions.can_transfer_ownership || !onDeleteGroupAfterTransfer) {
            throw new Error('Primero cambia el owner desde el menú del grupo.');
          }
          setManagement({
            conversationId: chat.id,
            identityId,
            mode: 'owner',
            exitAfterTransfer: true,
          });
          onClose();
          return;
        }
      }
      onDelete();
    } catch (failure) {
      onClose();
      Alert.alert(
        'No fue posible eliminar',
        failure instanceof Error ? failure.message : 'Inténtalo nuevamente.',
      );
    }
  };

  return (
    <>
      <ChatOptionsSheet
        {...options}
        chat={chat}
        onClose={onClose}
        onDelete={() => { void handleDelete(); }}
        loadingGroupOptions={Boolean(chat?.isGroup && !permissions && !loadedForThisChat)}
        canChangeOwner={Boolean(
          chat?.isGroup && permissions?.can_transfer_ownership,
        )}
        canManageAdmins={Boolean(
          chat?.isGroup
          && (
            permissions?.can_promote_members
            || permissions?.can_demote_admins
          ),
        )}
        onChangeOwner={() => openManagement('owner')}
        onManageAdmins={() => openManagement('admins')}
      />
      <GroupManagementModal
        conversationId={management?.conversationId || null}
        identityId={management?.identityId || null}
        mode={management?.mode || 'admins'}
        exitAfterTransfer={
          management?.exitAfterTransfer && onDeleteGroupAfterTransfer
            ? () => onDeleteGroupAfterTransfer(management.conversationId)
            : undefined
        }
        onClose={() => setManagement(null)}
        onUpdated={() => {
          setDetail(null);
          onGroupUpdated?.();
        }}
      />
    </>
  );
}
