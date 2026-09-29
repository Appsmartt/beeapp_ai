import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '@beeapp/design-system';
import {
  getChatConversation,
  setChatGroupParticipantRole,
  transferChatGroupOwnership,
} from '@beeapp/api-client';
import type {
  ChatConversation,
  ChatParticipant,
} from '@beeapp/shared-types';

import { getValidSessionCredentials } from '../../services/authSession';

type ManagementMode = 'owner' | 'admins';

interface GroupManagementModalProps {
  conversationId: string | null;
  identityId: string | null;
  mode: ManagementMode;
  onClose: () => void;
  onUpdated: () => void;
  exitAfterTransfer?: () => Promise<void>;
}

function memberName(participant: ChatParticipant): string {
  return [
    participant.user?.first_name,
    participant.user?.last_name,
  ].filter(Boolean).join(' ').trim() || 'Usuario BeeApp';
}

export default function GroupManagementModal({
  conversationId,
  identityId,
  mode,
  onClose,
  onUpdated,
  exitAfterTransfer,
}: GroupManagementModalProps) {
  const [group, setGroup] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setGroup(null);
    setError(null);
    if (!conversationId || !identityId) {
      return () => { cancelled = true; };
    }
    setLoading(true);
    void (async () => {
      try {
        const auth = await getValidSessionCredentials();
        if (!auth || auth.scheme !== 'Bearer') {
          throw new Error('Inicia sesión para administrar el grupo.');
        }
        const result = await getChatConversation(auth, conversationId);
        if (!cancelled) setGroup(result.conversation);
      } catch (failure) {
        if (!cancelled) {
          setError(failure instanceof Error ? failure.message : 'No fue posible cargar el grupo.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId, identityId]);

  const participants = (group?.participants || []).filter(
    (participant) => !participant.left_at && !participant.removed_at,
  );
  const permissions = group?.permissions;
  const authorized = Boolean(
    group?.conversation_type === 'group'
    && group.own_participant?.identity_id === identityId
    && permissions?.is_active_participant
    && (
      mode === 'owner'
        ? permissions.can_transfer_ownership
        : permissions.can_promote_members || permissions.can_demote_admins
    ),
  );
  const choices = participants.filter((participant) => {
    if (participant.identity_id === identityId) return false;
    if (mode === 'owner') return participant.role !== 'owner';
    if (participant.role === 'member') return Boolean(permissions?.can_promote_members);
    return participant.role === 'admin' && Boolean(permissions?.can_demote_admins);
  });

  const applyChange = async (participant: ChatParticipant) => {
    if (!conversationId || !identityId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const auth = await getValidSessionCredentials();
      if (!auth || auth.scheme !== 'Bearer') {
        throw new Error('Inicia sesión para administrar el grupo.');
      }
      const current = (await getChatConversation(auth, conversationId)).conversation;
      const allowed = current.conversation_type === 'group'
        && current.own_participant?.identity_id === identityId
        && current.permissions?.is_active_participant;
      const target = current.participants?.find(
        (item) => item.identity_id === participant.identity_id
          && !item.left_at && !item.removed_at,
      );
      if (!allowed || !target || target.role !== participant.role) {
        throw new Error('El grupo cambió. Vuelve a abrir este menú.');
      }
      if (mode === 'owner') {
        if (!current.permissions?.can_transfer_ownership) {
          throw new Error('Solo el owner puede transferir el grupo.');
        }
        await transferChatGroupOwnership(auth, conversationId, {
          current_owner_identity_id: identityId,
          new_owner_identity_id: target.identity_id,
        });
        if (exitAfterTransfer) {
          try {
            await exitAfterTransfer();
          } catch (leaveFailure) {
            onUpdated();
            onClose();
            Alert.alert(
              'Propiedad transferida',
              'El nuevo owner ya fue asignado, pero no fue posible salir '
              + 'del grupo. Abre el menú y pulsa Eliminar de nuevo. '
              + (leaveFailure instanceof Error ? leaveFailure.message : ''),
            );
            return;
          }
        }
      } else {
        const nextRole = target.role === 'member' ? 'admin' : 'member';
        if (
          (nextRole === 'admin' && !current.permissions?.can_promote_members)
          || (nextRole === 'member' && !current.permissions?.can_demote_admins)
        ) {
          throw new Error('No tienes permiso para cambiar este rol.');
        }
        await setChatGroupParticipantRole(
          auth,
          conversationId,
          target.identity_id,
          { actor_identity_id: identityId, role: nextRole },
        );
      }
      onUpdated();
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No fue posible actualizar el grupo.');
    } finally {
      setBusy(false);
    }
  };

  const confirmChange = (participant: ChatParticipant) => {
    const label = mode === 'owner'
      ? (exitAfterTransfer ? 'Transferir y salir del grupo' : 'Transferir propiedad')
      : participant.role === 'member' ? 'Nombrar admin' : 'Quitar admin';
    Alert.alert(
      label,
      `¿Confirmas ${label.toLowerCase()} para ${memberName(participant)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => { void applyChange(participant); } },
      ],
    );
  };

  return (
    <Modal
      visible={Boolean(conversationId)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <Text style={styles.title}>
            {mode === 'owner' ? 'Cambiar owner' : 'Gestionar administradores'}
          </Text>
          {loading ? <ActivityIndicator color={colors.brand.primary} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {!loading && !authorized && !error ? (
            <Text style={styles.message}>No tienes permiso para esta acción.</Text>
          ) : null}
          {!loading && authorized ? (
            <ScrollView style={styles.list}>
              {choices.length === 0 ? (
                <Text style={styles.message}>No hay integrantes disponibles.</Text>
              ) : choices.map((participant) => (
                <TouchableOpacity
                  key={participant.identity_id}
                  disabled={busy}
                  style={styles.row}
                  onPress={() => confirmChange(participant)}
                >
                  <Text style={styles.name}>{memberName(participant)}</Text>
                  <Text style={styles.action}>
                    {mode === 'owner' ? 'Elegir owner'
                      : participant.role === 'member' ? 'Nombrar admin' : 'Quitar admin'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
          {busy ? <ActivityIndicator color={colors.brand.primary} /> : null}
          <TouchableOpacity disabled={busy} onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(34, 43, 67, 0.38)',
  },
  panel: {
    maxHeight: '75%',
    padding: 24,
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: { fontSize: 18, fontWeight: '600', color: colors.neutral.text, marginBottom: 16 },
  list: { maxHeight: 360 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  name: { color: colors.neutral.text, fontSize: 16 },
  action: { color: colors.brand.primary, marginTop: 4 },
  error: { color: colors.semantic.error, marginBottom: 12 },
  message: { color: colors.neutral.text, marginBottom: 12 },
  close: { paddingVertical: 12, alignItems: 'center' },
  closeText: { color: colors.brand.primary, fontWeight: '600' },
});
