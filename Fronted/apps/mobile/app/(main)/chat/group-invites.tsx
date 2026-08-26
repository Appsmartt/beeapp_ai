import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check,
  ChevronLeft,
  Users,
  X,
} from 'lucide-react-native';
import {
  getChatGroupInvites,
  respondToChatGroupInvite,
} from '@beeapp/api-client';
import type {
  ChatGroupInvite,
} from '@beeapp/shared-types';
import {
  colors,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
} from '../../../src/components/embedded/EmbeddedNavContext';
import {
  useChatConversations,
} from '../../../src/hooks/useChat';
import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';

export default function GroupInvitesScreen() {
  const router = useModuleNav();

  const {
    privateIdentityId,
    loadConversations,
  } = useChatConversations({
    autoLoad: false,
  });

  const [invites, setInvites] = useState<
    ChatGroupInvite[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingInviteId, setActingInviteId] = useState<
    string | null
  >(null);

  const loadInvites = useCallback(async (
    options: {
      refresh?: boolean;
    } = {},
  ) => {
    if (options.refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const auth = await getValidSessionCredentials();

      if (!auth || auth.scheme !== 'Bearer') {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const response = await getChatGroupInvites(
        auth,
        {
          identityId: privateIdentityId || undefined,
          status: 'pending',
          limit: 100,
          offset: 0,
        },
      );

      setInvites(response.invites);
    } catch (loadError) {
      Alert.alert(
        'No fue posible cargar invitaciones',
        loadError instanceof Error
          ? loadError.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    privateIdentityId,
  ]);

  useEffect(() => {
    void loadInvites();
  }, [
    loadInvites,
  ]);

  const openAcceptedConversation = (
    invite: ChatGroupInvite,
    conversationId: string,
    conversationName: string,
  ) => {
    router.replace({
      pathname: '/(main)/chat/conversation',
      params: {
        id: conversationId,
        name: conversationName,
        isGroup: 'true',
        isAi: 'false',
        online: 'false',
        inviteId: invite.id,
      },
    });
  };

  const handleRespond = async (
    invite: ChatGroupInvite,
    accept: boolean,
  ) => {
    if (actingInviteId) {
      return;
    }

    try {
      setActingInviteId(invite.id);

      const auth = await getValidSessionCredentials();

      if (!auth || auth.scheme !== 'Bearer') {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const result = await respondToChatGroupInvite(
        auth,
        invite.id,
        accept,
      );

      setInvites((current) => current.filter(
        (item) => item.id !== invite.id,
      ));

      await loadConversations({
        refresh: true,
      });

      if (
        accept
        && result.accepted
        && result.conversation
      ) {
        openAcceptedConversation(
          invite,
          result.conversation.id,
          result.conversation.name?.trim()
            || 'Grupo',
        );

        return;
      }

      if (!accept) {
        Alert.alert(
          'Invitación rechazada',
          'No te unirás a este grupo.',
        );
      }
    } catch (respondError) {
      Alert.alert(
        accept
          ? 'No fue posible aceptar la invitación'
          : 'No fue posible rechazar la invitación',
        respondError instanceof Error
          ? respondError.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setActingInviteId(null);
    }
  };

  const renderInvite = ({
    item: invite,
  }: {
    item: ChatGroupInvite;
  }) => {
    const groupName = (
      invite.conversation?.name?.trim()
      || 'Grupo BeeApp'
    );

    const inviterName = (
      invite.invited_by_identity?.display_name?.trim()
      || 'Un usuario'
    );

    const description = (
      invite.conversation?.description?.trim()
      || null
    );

    const isActing = actingInviteId === invite.id;

    return (
      <View style={styles.inviteCard}>
        <View style={styles.avatar}>
          <Users
            size={23}
            color={colors.brand.primary}
          />
        </View>

        <View style={styles.inviteContent}>
          <Text
            style={styles.groupName}
            numberOfLines={1}
          >
            {groupName}
          </Text>

          <Text style={styles.inviteText}>
            {inviterName} te invitó a un grupo.
          </Text>

          {description ? (
            <Text
              style={styles.description}
              numberOfLines={2}
            >
              {description}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.rejectButton,
                isActing
                  ? styles.buttonDisabled
                  : null,
              ]}
              onPress={() => {
                void handleRespond(invite, false);
              }}
              disabled={isActing}
              activeOpacity={0.75}
            >
              {isActing ? (
                <ActivityIndicator
                  size="small"
                  color={colors.neutral.gray700}
                />
              ) : (
                <>
                  <X
                    size={16}
                    color={colors.neutral.gray700}
                  />

                  <Text style={styles.rejectButtonText}>
                    Rechazar
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptButton,
                isActing
                  ? styles.buttonDisabled
                  : null,
              ]}
              onPress={() => {
                void handleRespond(invite, true);
              }}
              disabled={isActing}
              activeOpacity={0.75}
            >
              {isActing ? (
                <ActivityIndicator
                  size="small"
                  color={colors.neutral.white}
                />
              ) : (
                <>
                  <Check
                    size={16}
                    color={colors.neutral.white}
                  />

                  <Text style={styles.acceptButtonText}>
                    Aceptar
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>
              Invitaciones a grupos
            </Text>

            <Text style={styles.headerSubtitle}>
              Revisa y responde tus invitaciones pendientes
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color={colors.brand.primary}
            />

            <Text style={styles.stateText}>
              Cargando invitaciones...
            </Text>
          </View>
        ) : (
          <FlatList
            data={invites}
            keyExtractor={(invite) => invite.id}
            renderItem={renderInvite}
            contentContainerStyle={[
              styles.listContent,
              invites.length === 0
                ? styles.emptyListContent
                : null,
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void loadInvites({
                    refresh: true,
                  });
                }}
                tintColor={colors.brand.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Users
                    size={30}
                    color={colors.neutral.gray500}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No tienes invitaciones pendientes
                </Text>

                <Text style={styles.emptyDescription}>
                  Cuando alguien te invite a un grupo,
                  aparecerá aquí.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.neutral.gray50,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.neutral.gray600,
    fontSize: 11,
    marginTop: 2,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  inviteCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    padding: 14,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginRight: 12,
    width: 44,
  },
  inviteContent: {
    flex: 1,
  },
  groupName: {
    color: colors.neutral.text,
    fontSize: 15,
    fontWeight: '800',
  },
  inviteText: {
    color: colors.neutral.gray600,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  description: {
    color: colors.neutral.gray500,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 7,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  rejectButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 10,
  },
  rejectButtonText: {
    color: colors.neutral.gray700,
    fontSize: 12,
    fontWeight: '700',
  },
  acceptButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 10,
  },
  acceptButtonText: {
    color: colors.neutral.white,
    fontSize: 12,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  emptyTitle: {
    color: colors.neutral.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.neutral.gray600,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    textAlign: 'center',
  },
});
