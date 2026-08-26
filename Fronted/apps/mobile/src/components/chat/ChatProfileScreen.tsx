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
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BellOff,
  ChevronLeft,
  Image as ImageIcon,
  LogOut,
  Search,
  Timer,
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
import DisappearingMessagesModal, {
  type DisappearingInterval,
  disappearingLabel,
} from './DisappearingMessagesModal';

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

  const [disappearingOn, setDisappearingOn] = useState(false);

  const [interval, setIntervalValue] = useState<
    DisappearingInterval
  >('24h');

  const [intervalModal, setIntervalModal] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [editGroupModal, setEditGroupModal] = useState(false);

  const isGroup = (
    conversation?.conversation_type === 'group'
  );

  const permissions = conversation?.permissions || null;

  const name = (
    conversation?.name?.trim()
    || (
      isGroup
        ? 'Grupo BeeApp'
        : [
            conversation?.direct_profile?.first_name,
            conversation?.direct_profile?.last_name,
          ]
            .filter(Boolean)
            .join(' ')
            .trim()
    )
    || 'Conversación'
  );

  const activeParticipants = useMemo(
    () => participants.filter((participant) => (
      !participant.left_at
      && !participant.removed_at
    )),
    [participants],
  );

  useEffect(() => {
    setMuted(Boolean(conversation?.is_muted));
  }, [
    conversation?.is_muted,
  ]);

  const toggleDisappearing = (
    value: boolean,
  ) => {
    setDisappearingOn(value);

    if (value) {
      setIntervalModal(true);
    }
  };

  const handleAddMembers = async (
    identityIds: string[],
  ) => {
    if (!identityIds.length) {
      return;
    }

    await addParticipants(identityIds);

    await Promise.all([
      loadConversation(),
      loadParticipants(),
    ]);
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
              .then(async () => {
                await Promise.all([
                  loadConversation(),
                  loadParticipants(),
                ]);
              })
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
    if (!isGroup || !permissions?.can_update_group) {
      throw new Error(
        'No tienes permiso para editar este grupo.',
      );
    }

    await updateConversation(chatId, {
      name: payload.name,
      description: payload.description,
      postingPolicy: payload.postingPolicy,
    });

    await Promise.all([
      loadConversation(),
      loadParticipants(),
    ]);
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
            No fue posible identificar el chat.
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }

  if (loading && !conversation) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
          />

          <Text style={styles.loadingText}>
            Cargando información del chat...
          </Text>
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
            {isGroup
              ? 'Información del grupo'
              : 'Perfil del contacto'}
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
                  void Promise.all([
                    loadConversation(),
                    loadParticipants(),
                  ]).catch(() => {
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

          {isGroup && isNewlyCreatedGroup ? (
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
            isGroup={Boolean(isGroup)}
            name={name}
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
              isGroup
                ? (
                    `${activeParticipants.length} `
                    + `${activeParticipants.length === 1
                      ? 'miembro'
                      : 'miembros'}`
                  )
                : (
                    conversation?.direct_profile?.occupation
                    || conversation?.direct_profile?.location
                    || 'Contacto BeeApp'
                  )
            }
            initials={getInitials(name)}
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

          <View style={styles.divider} />

          <ChatProfileRow
            icon={Timer}
            label="Mensajes temporales"
            subtitle={
              disappearingOn
                ? disappearingLabel(interval)
                : 'Desactivado'
            }
            switchValue={disappearingOn}
            onSwitchChange={toggleDisappearing}
            onPress={
              disappearingOn
                ? () => setIntervalModal(true)
                : undefined
            }
          />

          {isGroup ? (
            <>
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
            </>
          ) : null}

          <View style={styles.divider} />

          <ChatProfileRow
            icon={Search}
            label="Buscar en la conversación"
            onPress={() => {
              Alert.alert(
                'Buscar mensajes',
                (
                  'La búsqueda dentro de una conversación '
                  + 'requiere un endpoint específico de Chat.'
                ),
              );
            }}
          />

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
            label={
              isGroup
                ? 'Salir del grupo'
                : 'Eliminar chat'
            }
            danger
            onPress={() => {
              if (isGroup) {
                handleLeaveGroup();
                return;
              }

              Alert.alert(
                'Eliminar chat',
                (
                  'Puedes eliminar el chat desde la lista '
                  + 'principal de Chats.'
                ),
              );
            }}
          />
        </ScrollView>

        <DisappearingMessagesModal
          visible={intervalModal}
          value={interval}
          onSave={(nextInterval) => {
            setIntervalValue(nextInterval);
            setIntervalModal(false);
          }}
          onClose={() => {
            setIntervalModal(false);
          }}
        />

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
          initialName={name}
          initialDescription={conversation?.description}
          initialPostingPolicy={conversation?.posting_policy}
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
  divider: {
    backgroundColor: colors.neutral.gray100,
    height: 1,
    marginVertical: spacing.xs,
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
});
