import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BellOff,
  ChevronLeft,
  Image as ImageIcon,
  LogOut,
  MessageSquareText,
} from 'lucide-react-native';
import {
  colors,
  spacing,
} from '@beeapp/design-system';

import ScreenSafeArea from '../layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../embedded/EmbeddedNavContext';

import ChatProfileHeader from './ChatProfileHeader';
import ChatProfileRow from './ChatProfileRow';
import MemberListSection from './MemberListSection';
import AddMemberModal from './AddMemberModal';
import EditGroupModal from './EditGroupModal';

import {
  useChatConversations,
  useChatMessages,
} from '../../hooks/useChat';
import {
  getInitials,
} from '../../services/chatService';

export default function ChatProfileScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const chatId = String(params.id || '').trim();
  const isNewlyCreatedGroup = (
    params.newlyCreated === 'true'
  );

  const {
    conversation,
    participants,
    loading,
    error,
    privateIdentityId,
    loadConversation,
    loadParticipants,
    addParticipants,
    removeParticipant,
    leaveGroup,
  } = useChatMessages({
    conversationId: chatId || null,
    autoLoad: Boolean(chatId),
  });

  const {
    updateConversation,
  } = useChatConversations({
    autoLoad: false,
  });

  const [muted, setMuted] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [editGroupModal, setEditGroupModal] = useState(false);
  const [updatingPostingPolicy, setUpdatingPostingPolicy] = useState(false);

  const isGroup = (
    conversation?.conversation_type === 'group'
  );

  const permissions = conversation?.permissions || null;

  const activeParticipants = useMemo(
    () => participants.filter((participant) => (
      !participant.left_at
      && !participant.removed_at
    )),
    [participants],
  );

  const groupName = (
    conversation?.name?.trim()
    || 'Grupo BeeApp'
  );

  const groupDescription = (
    conversation?.description?.trim()
    || null
  );

  const isAnnouncementsGroup = (
    conversation?.posting_policy === 'admins_only'
  );

  const hasLoadedGroupDetail = Boolean(
    conversation
    && conversation.conversation_type === 'group'
    && Array.isArray(participants)
  );

  useEffect(() => {
    setMuted(Boolean(conversation?.is_muted));
  }, [
    conversation?.is_muted,
  ]);

  const reloadGroupData = async () => {
    await Promise.all([
      loadConversation(),
      loadParticipants(),
    ]);
  };

  const handleAddMembers = async (
    identityIds: string[],
  ) => {
    if (!identityIds.length) {
      return;
    }

    await addParticipants(identityIds);
    await reloadGroupData();
  };

  const handleRemoveMember = (
    identityId: string,
    displayName: string,
  ) => {
    Alert.alert(
      'Quitar participante',
      `¿Seguro que quieres quitar a ${displayName}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: () => {
            void removeParticipant(identityId)
              .then(() => reloadGroupData())
              .catch((removeError) => {
                Alert.alert(
                  'No fue posible quitar al participante',
                  removeError instanceof Error
                    ? removeError.message
                    : 'Inténtalo nuevamente.',
                );
              });
          },
        },
      ],
    );
  };

  const handleEditGroup = async (payload: {
    name: string;
    description: string | null;
    postingPolicy: 'all_members' | 'admins_only';
  }) => {
    if (!permissions?.can_update_group) {
      throw new Error(
        'Solo el owner puede editar este grupo.',
      );
    }

    await updateConversation(chatId, {
      name: payload.name,
      description: payload.description,
      postingPolicy: payload.postingPolicy,
    });

    await reloadGroupData();
  };

  const handlePostingPolicyChange = async (
    adminsOnly: boolean,
  ) => {
    if (
      !permissions?.can_update_group
      || updatingPostingPolicy
    ) {
      return;
    }

    try {
      setUpdatingPostingPolicy(true);

      await updateConversation(chatId, {
        postingPolicy: adminsOnly
          ? 'admins_only'
          : 'all_members',
      });

      await reloadGroupData();
    } catch (updateError) {
      Alert.alert(
        'No fue posible actualizar el grupo',
        updateError instanceof Error
          ? updateError.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setUpdatingPostingPolicy(false);
    }
  };

  const handleLeaveGroup = () => {
    if (!permissions?.can_leave_group) {
      Alert.alert(
        'No puedes salir del grupo',
        permissions?.own_role === 'owner'
          ? (
              'Como owner, debes transferir la propiedad '
              + 'o desactivar el grupo antes de salir.'
            )
          : (
              'No tienes permiso para salir de este grupo.'
            ),
      );

      return;
    }

    Alert.alert(
      'Salir del grupo',
      'Dejarás de recibir mensajes y el grupo se ocultará de tu lista de chats.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => {
            void leaveGroup()
              .then(() => {
                router.replace('/(main)/chat');
              })
              .catch((leaveError) => {
                Alert.alert(
                  'No fue posible salir del grupo',
                  leaveError instanceof Error
                    ? leaveError.message
                    : 'Inténtalo nuevamente.',
                );
              });
          },
        },
      ],
    );
  };

  if (!chatId) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorText}>
            No fue posible identificar el grupo.
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }

  if (loading || !conversation || !hasLoadedGroupDetail) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
          />

          <Text style={styles.loadingText}>
            Cargando información del grupo...
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }

  if (!isGroup) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorText}>
            Esta pantalla solo está disponible para grupos.
          </Text>

          <TouchableOpacity
            style={styles.backToChatButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backToChatButtonText}>
              Volver
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>
            Información del grupo
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {error}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  void reloadGroupData().catch(() => {
                    // El hook mantiene el mensaje de error.
                  });
                }}
              >
                <Text style={styles.retryText}>
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isNewlyCreatedGroup ? (
            <View style={styles.createdGroupBox}>
              <Text style={styles.createdGroupTitle}>
                Grupo creado
              </Text>

              <Text style={styles.createdGroupText}>
                Agrega participantes para enviarles una invitación.
                Podrán unirse cuando la acepten.
              </Text>
            </View>
          ) : null}

          <ChatProfileHeader
            isGroup
            name={groupName}
            onChangeName={() => {
              if (!permissions?.can_update_group) {
                Alert.alert(
                  'Sin permiso',
                  'Solo el owner puede editar este grupo.',
                );
                return;
              }

              setEditGroupModal(true);
            }}
            meta={
              `${activeParticipants.length} `
              + `${activeParticipants.length === 1
                ? 'miembro'
                : 'miembros'}`
            }
            initials={getInitials(groupName)}
            onChangePhoto={() => {
              Alert.alert(
                'Foto del grupo',
                (
                  'La carga de foto se conectará cuando '
                  + 'implementemos el flujo de Storage.'
                ),
              );
            }}
          />

          {groupDescription ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>
                Descripción
              </Text>

              <Text style={styles.descriptionText}>
                {groupDescription}
              </Text>
            </View>
          ) : null}

          {permissions?.can_update_group ? (
            <View style={styles.postingPolicyRow}>
              <View style={styles.postingPolicyIcon}>
                <MessageSquareText
                  size={19}
                  color={colors.brand.primary}
                />
              </View>

              <View style={styles.postingPolicyTextWrap}>
                <Text style={styles.postingPolicyTitle}>
                  Solo owner y administradores pueden escribir
                </Text>

                <Text style={styles.postingPolicyDescription}>
                  {isAnnouncementsGroup
                    ? (
                        'Está activado. Los miembros solo pueden '
                        + 'leer los mensajes.'
                      )
                    : (
                        'Está desactivado. Todos los miembros '
                        + 'pueden enviar mensajes.'
                      )}
                </Text>
              </View>

              {updatingPostingPolicy ? (
                <ActivityIndicator
                  size="small"
                  color={colors.brand.primary}
                />
              ) : (
                <Switch
                  value={isAnnouncementsGroup}
                  onValueChange={(value) => {
                    void handlePostingPolicyChange(value);
                  }}
                  disabled={updatingPostingPolicy}
                  trackColor={{
                    false: colors.neutral.gray300,
                    true: colors.brand.primary,
                  }}
                  thumbColor={colors.neutral.white}
                />
              )}
            </View>
          ) : null}

          <View style={styles.divider} />

          <MemberListSection
            members={activeParticipants}
            currentIdentityId={privateIdentityId}
            canInvite={Boolean(
              permissions?.can_invite_members,
            )}
            canRemove={Boolean(
              permissions?.can_remove_members,
            )}
            onAdd={() => {
              setAddMemberModal(true);
            }}
            onRemove={handleRemoveMember}
          />

          <View style={styles.divider} />

          <ChatProfileRow
            icon={BellOff}
            label="Silenciar notificaciones"
            switchValue={muted}
            onSwitchChange={(nextValue) => {
              setMuted(nextValue);

              Alert.alert(
                'Preferencia no disponible',
                (
                  'El backend actual todavía no expone una '
                  + 'operación para actualizar esta preferencia.'
                ),
              );
            }}
          />

          <ChatProfileRow
            icon={ImageIcon}
            label="Archivos multimedia compartidos"
            onPress={() => {
              Alert.alert(
                'Archivos compartidos',
                (
                  'Esta vista se conectará cuando agreguemos '
                  + 'el explorador de adjuntos de Chat.'
                ),
              );
            }}
          />

          <View style={styles.divider} />

          <ChatProfileRow
            icon={LogOut}
            label="Salir del grupo"
            danger
            onPress={handleLeaveGroup}
          />
        </ScrollView>

        <AddMemberModal
          visible={addMemberModal}
          memberIdentityIds={activeParticipants.map(
            (participant) => participant.identity_id,
          )}
          onAdd={handleAddMembers}
          onClose={() => {
            setAddMemberModal(false);
          }}
        />

        <EditGroupModal
          visible={editGroupModal}
          initialName={groupName}
          initialDescription={conversation.description}
          initialPostingPolicy={conversation.posting_policy}
          onSave={handleEditGroup}
          onClose={() => {
            setEditGroupModal(false);
          }}
        />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.neutral.white,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: colors.neutral.gray600,
    fontSize: 14,
    fontWeight: '600',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    padding: 4,
  },
  topBarTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    paddingBottom: 140,
  },
  createdGroupBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: 12,
  },
  createdGroupTitle: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800',
  },
  createdGroupText: {
    color: '#166534',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  descriptionBox: {
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    padding: 12,
  },
  descriptionLabel: {
    color: colors.neutral.gray600,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  descriptionText: {
    color: colors.neutral.text,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  postingPolicyRow: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    borderTopColor: colors.neutral.gray100,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  postingPolicyIcon: {
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginRight: 11,
    width: 36,
  },
  postingPolicyTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  postingPolicyTitle: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  postingPolicyDescription: {
    color: colors.neutral.gray600,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  divider: {
    backgroundColor: colors.neutral.gray100,
    height: 1,
    marginVertical: spacing.xs,
  },
  errorBox: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: 12,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  retryText: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 7,
  },
  backToChatButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  backToChatButtonText: {
    color: colors.neutral.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
