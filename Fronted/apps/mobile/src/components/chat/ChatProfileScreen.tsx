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
import { colors, spacing } from '@beeapp/design-system';

import ScreenSafeArea from '../layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../embedded/EmbeddedNavContext';

import ChatProfileHeader from './ChatProfileHeader';
import ChatProfileRow from './ChatProfileRow';
import MemberListSection from './MemberListSection';
import AddMemberModal from './AddMemberModal';
import DisappearingMessagesModal, {
  type DisappearingInterval,
  disappearingLabel,
} from './DisappearingMessagesModal';

import {
  useChatMessages,
} from '../../hooks/useChat';

import type {
  GroupMember,
} from '../../mocks/chats';

function getInitials(
  value: string,
): string {
  const initials = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || '?';
}

export default function ChatProfileScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const chatId = String(params.id || '').trim();

  const {
    conversation,
    participants,
    loading,
    error,
    loadConversation,
    loadParticipants,
    addParticipants,
    removeParticipant,
  } = useChatMessages({
    conversationId: chatId || null,
    autoLoad: Boolean(chatId),
  });

  const [muted, setMuted] =
    useState(false);

  const [disappearingOn, setDisappearingOn] =
    useState(false);

  const [interval, setIntervalValue] =
    useState<DisappearingInterval>('24h');

  const [intervalModal, setIntervalModal] =
    useState(false);

  const [addMemberModal, setAddMemberModal] =
    useState(false);

  const isGroup = (
    conversation?.conversation_type === 'group'
  );

  const name = (
    conversation?.name?.trim()
    || (
      isGroup
        ? 'Grupo de Buddy'
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

  const members = useMemo<GroupMember[]>(
    () => participants.map((participant) => {
      const memberName = [
        participant.user?.first_name,
        participant.user?.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .trim()
        || 'Usuario Buddy';

      return {
        id: participant.user_id,
        name: memberName,
        role: (
          participant.role === 'owner'
          || participant.role === 'admin'
            ? 'admin'
            : 'member'
        ),
        initials: getInitials(memberName),
        color: '#F3E8FF',
      };
    }),
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
    nextMembers: GroupMember[],
  ) => {
    const userIds = nextMembers
      .map((member) => member.id)
      .filter(Boolean);

    if (userIds.length === 0) {
      return;
    }

    try {
      await addParticipants(userIds);
      setAddMemberModal(false);
      await loadParticipants();
    } catch (addError) {
      Alert.alert(
        'No fue posible agregar participantes',
        addError instanceof Error
          ? addError.message
          : 'Inténtalo nuevamente.',
      );
    }
  };

  const handleRemoveMember = (
    memberId: string,
  ) => {
    Alert.alert(
      'Quitar participante',
      '¿Seguro que quieres quitar a este participante?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: () => {
            void removeParticipant(memberId)
              .then(() => loadParticipants())
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
              ? 'Perfil del grupo'
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

          <ChatProfileHeader
            isGroup={Boolean(isGroup)}
            name={name}
            onChangeName={() => {
              Alert.alert(
                'Nombre de grupo',
                (
                  'La edición del nombre se conectará al '
                  + 'endpoint PATCH de conversación en el '
                  + 'siguiente ajuste de backend.'
                ),
              );
            }}
            meta={
              isGroup
                ? (
                    `${members.length} `
                    + `${members.length === 1
                      ? 'miembro'
                      : 'miembros'}`
                  )
                : (
                    conversation?.direct_profile?.occupation
                    || conversation?.direct_profile?.location
                    || 'Contacto de Buddy'
                  )
            }
            initials={getInitials(name)}
            onChangePhoto={() => {
              Alert.alert(
                'Foto del chat',
                (
                  'La carga de foto requiere soporte de '
                  + 'adjuntos para conversaciones.'
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
                members={members}
                canManage
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
                  + 'requiere un endpoint de búsqueda de Chat.'
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
                'Preferencia guardada localmente',
                (
                  'La preferencia de silenciar se sincroniza '
                  + 'desde el menú de la lista de Chats.'
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
                  'Esta vista estará disponible cuando Chat '
                  + 'exponga adjuntos en el backend.'
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
              Alert.alert(
                isGroup
                  ? 'Salir del grupo'
                  : 'Eliminar chat',
                (
                  isGroup
                    ? 'La salida del grupo requiere un endpoint de miembros.'
                    : 'Puedes eliminar el chat desde la lista principal.'
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
          memberIds={members.map(
            (member) => member.id,
          )}
          onAdd={(nextMembers) => {
            void handleAddMembers(nextMembers);
          }}
          onClose={() => {
            setAddMemberModal(false);
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
