import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronLeft,
  MessageCircle,
  Search,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react-native';
import {
  colors,
  radii,
} from '@beeapp/design-system';
import type {
  StatusFollowDiscoverItem,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';
import VerifiedBadge from '../../../src/components/VerifiedBadge';
import {
  useChatConversations,
} from '../../../src/hooks/useChat';
import {
  followStatusTarget,
  removeStatusFollow,
  searchStatusFollowTargets,
} from '../../../src/services/statusesService';

type UnifiedPerson = {
  key: string;
  actorType: 'profile' | 'commercial_profile';
  profileId: string | null;
  commercialProfileId: string | null;
  identityId: string | null;
  displayName: string;
  avatarFileId: string | null;
  followId: string | null;
  followState: 'pending' | 'accepted' | 'rejected' | null;
  isAvailable: boolean;
  verified: boolean;
  occupation: string | null;
  location: string | null;
};

type FollowConfirmation = {
  person: UnifiedPerson;
  action: 'cancel_pending' | 'unfollow';
};

function getActorKey(
  actorType: 'profile' | 'commercial_profile',
  profileId: string | null,
  commercialProfileId: string | null,
): string | null {
  if (actorType === 'profile' && profileId) {
    return `profile:${profileId}`;
  }

  if (
    actorType === 'commercial_profile'
    && commercialProfileId
  ) {
    return `commercial_profile:${commercialProfileId}`;
  }

  return null;
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || '?';
}

function getFollowLabel(
  followState: UnifiedPerson['followState'],
): string {
  if (followState === 'accepted') {
    return 'Siguiendo';
  }

  if (followState === 'pending') {
    return 'Esperando aprobación';
  }

  return 'Seguir';
}

function getFollowConfirmation(
  person: UnifiedPerson,
): FollowConfirmation | null {
  if (!person.followId) {
    return null;
  }

  if (person.followState === 'accepted') {
    return {
      person,
      action: 'unfollow',
    };
  }

  if (person.followState === 'pending') {
    return {
      person,
      action: 'cancel_pending',
    };
  }

  return null;
}

function mapSocialTarget(
  target: StatusFollowDiscoverItem,
): UnifiedPerson | null {
  const key = getActorKey(
    target.actor_type,
    target.profile_id,
    target.commercial_profile_id,
  );

  if (!key) {
    return null;
  }

  return {
    key,
    actorType: target.actor_type,
    profileId: target.profile_id,
    commercialProfileId: target.commercial_profile_id,
    identityId: target.identity_id,
    displayName: target.display_name,
    avatarFileId: target.avatar_file_id,
    followId: target.follow_id,
    followState: target.follow_state,
    isAvailable: true,
    verified: false,
    occupation: null,
    location: null,
  };
}



export default function PeopleScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const context = String(params.context || '').trim();
  const businessId = String(params.businessId || '').trim();
  const requestedIdentityId = String(
    params.identityId || '',
  ).trim() || null;

  const isCommercialContext = (
    context === 'commercial'
    && Boolean(businessId)
    && Boolean(requestedIdentityId)
  );

  const {
    createDirectConversation,
  } = useChatConversations({
    autoLoad: false,
    identityId: requestedIdentityId,
  });

  const [query, setQuery] = useState('');
  const [socialResults, setSocialResults] = useState<
    StatusFollowDiscoverItem[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<
    string | null
  >(null);
  const [chattingPersonKey, setChattingPersonKey] = useState<
    string | null
  >(null);
  const [followingPersonKey, setFollowingPersonKey] = useState<
    string | null
  >(null);
  const [confirmation, setConfirmation] = useState<
    FollowConfirmation | null
  >(null);
  const requestRef = useRef(0);

  const normalizedQuery = query.trim();
  const canSearch = normalizedQuery.length >= 2;

  useEffect(() => {
    if (!canSearch) {
      requestRef.current += 1;
      setSocialResults([]);
      setSearchError(null);
      setLoading(false);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    const timeoutId = setTimeout(() => {
      setLoading(true);

      void searchStatusFollowTargets({
        q: normalizedQuery,
      })
        .then((response) => {
          if (requestRef.current !== requestId) {
            return;
          }

          setSocialResults(response.items);
          setSearchError(null);
        })
        .catch((error) => {
          if (requestRef.current !== requestId) {
            return;
          }

          setSocialResults([]);
          setSearchError(
            error instanceof Error
              ? error.message
              : 'No fue posible buscar personas.',
          );
        })
        .finally(() => {
          if (requestRef.current === requestId) {
            setLoading(false);
          }
        });
    }, 320);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    canSearch,
    normalizedQuery,
  ]);

  const people = useMemo(() => (
    socialResults
      .map(mapSocialTarget)
      .filter(
        (
          person,
        ): person is UnifiedPerson => Boolean(person),
      )
      .sort((left, right) => (
        left.displayName.localeCompare(
          right.displayName,
          'es',
        )
      ))
  ), [
    socialResults,
  ]);


  const openConversation = (
    conversation: {
      id: string;
      name: string;
      isGroup: boolean;
      isAI: boolean;
      online: boolean;
    },
  ) => {
    router.replace({
      pathname: '/(main)/chat/conversation',
      params: {
        id: conversation.id,
        name: conversation.name,
        isGroup: conversation.isGroup ? 'true' : 'false',
        isAi: conversation.isAI ? 'true' : 'false',
        online: conversation.online ? 'true' : 'false',
        ...(isCommercialContext
          ? {
              context: 'commercial',
              businessId,
              identityId: requestedIdentityId || '',
            }
          : {}),
      },
    });
  };

  const handleStartChat = async (person: UnifiedPerson) => {
    if (
      !person.identityId
      || chattingPersonKey
      || followingPersonKey
    ) {
      return;
    }

    try {
      setChattingPersonKey(person.key);

      const conversation = await createDirectConversation(
        person.identityId,
      );

      openConversation({
        id: conversation.id,
        name: conversation.name,
        isGroup: conversation.isGroup,
        isAI: conversation.isAI,
        online: conversation.online,
      });
    } catch (error) {
      Alert.alert(
        'No fue posible abrir el chat',
        error instanceof Error
          ? error.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setChattingPersonKey(null);
    }
  };

  const updatePersonFollow = (
    personKey: string,
    followId: string | null,
    followState: UnifiedPerson['followState'],
  ) => {
    setSocialResults((current) => current.map((target) => {
      const targetKey = getActorKey(
        target.actor_type,
        target.profile_id,
        target.commercial_profile_id,
      );

      return targetKey === personKey
        ? {
            ...target,
            follow_id: followId,
            follow_state: followState,
          }
        : target;
    }));
  };

  const handleFollow = async (person: UnifiedPerson) => {
    if (
      !person.profileId
      && !person.commercialProfileId
    ) {
      return;
    }

    try {
      setFollowingPersonKey(person.key);

      const response = await followStatusTarget({
        target_actor_type: person.actorType,
        target_profile_id: person.profileId,
        target_commercial_profile_id: (
          person.commercialProfileId
        ),
      });

      updatePersonFollow(
        person.key,
        response.follow.id,
        response.follow.state,
      );
    } catch (error) {
      Alert.alert(
        'No fue posible seguir esta cuenta',
        error instanceof Error
          ? error.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setFollowingPersonKey(null);
    }
  };

  const handleFollowPress = (person: UnifiedPerson) => {
    if (followingPersonKey || chattingPersonKey) {
      return;
    }

    const nextConfirmation = getFollowConfirmation(person);

    if (nextConfirmation) {
      setConfirmation(nextConfirmation);
      return;
    }

    void handleFollow(person);
  };

  const handleConfirmRemoval = async () => {
    if (
      !confirmation
      || !confirmation.person.followId
    ) {
      return;
    }

    const {
      person,
      action,
    } = confirmation;

    try {
      setFollowingPersonKey(person.key);

      await removeStatusFollow(person.followId);

      updatePersonFollow(
        person.key,
        null,
        null,
      );

      setConfirmation(null);
    } catch (error) {
      Alert.alert(
        action === 'cancel_pending'
          ? 'No fue posible cancelar la solicitud'
          : 'No fue posible dejar de seguir',
        error instanceof Error
          ? error.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setFollowingPersonKey(null);
    }
  };

  const renderContent = () => {
    if (!canSearch) {
      return (
        <View style={styles.stateWrap}>
          <View style={styles.stateIcon}>
            <Search
              size={24}
              color={colors.brand.primary}
            />
          </View>

          <Text style={styles.stateTitle}>
            Busca personas y negocios
          </Text>

          <Text style={styles.stateText}>
            Escribe al menos dos caracteres para iniciar un
            chat o seguir sus estados.
          </Text>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.stateWrap}>
          <ActivityIndicator
            size="small"
            color={colors.brand.primary}
          />

          <Text style={styles.stateText}>
            Buscando personas...
          </Text>
        </View>
      );
    }

    if (searchError) {
      return (
        <View style={styles.stateWrap}>
          <Text style={styles.errorText}>
            {searchError}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={people}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => {
          const isChatting = chattingPersonKey === item.key;
          const isFollowing = followingPersonKey === item.key;
          const followLabel = getFollowLabel(
            item.followState,
          );
          const followIsMuted = (
            item.followState === 'accepted'
            || item.followState === 'pending'
          );
          const description = item.occupation
            || item.location
            || (
              item.actorType === 'commercial_profile'
                ? 'Cuenta comercial'
                : 'Cuenta personal'
            );

          return (
            <View style={styles.personRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(item.displayName)}
                </Text>
              </View>

              <View style={styles.personCopy}>
                <View style={styles.personNameRow}>
                  <Text
                    style={styles.personName}
                    numberOfLines={1}
                  >
                    {item.displayName}
                  </Text>

                  {item.verified ? (
                    <VerifiedBadge size={13} />
                  ) : null}
                </View>

                <Text
                  style={styles.personDescription}
                  numberOfLines={1}
                >
                  {description}
                </Text>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[
                    styles.chatButton,
                    !item.identityId
                      ? styles.actionDisabled
                      : null,
                  ]}
                  onPress={() => {
                    void handleStartChat(item);
                  }}
                  disabled={
                    !item.identityId
                    || isChatting
                    || isFollowing
                  }
                  activeOpacity={0.75}
                  accessibilityLabel={
                    `Iniciar chat con ${item.displayName}`
                  }
                >
                  {isChatting ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.brand.primary}
                    />
                  ) : (
                    <>
                      <MessageCircle
                        size={14}
                        color={colors.brand.primary}
                      />

                      <Text style={styles.chatButtonText}>
                        Chat
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.followButton,
                    followIsMuted
                      ? styles.followButtonMuted
                      : null,
                    !item.isAvailable
                      ? styles.actionDisabled
                      : null,
                  ]}
                  onPress={() => {
                    handleFollowPress(item);
                  }}
                  disabled={
                    isChatting
                    || isFollowing
                    || !item.isAvailable
                  }
                  activeOpacity={0.75}
                  accessibilityLabel={
                    `${followLabel} a ${item.displayName}`
                  }
                >
                  {isFollowing ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        followIsMuted
                          ? colors.brand.primary
                          : colors.neutral.white
                      }
                    />
                  ) : (
                    <>
                      {item.followState === 'accepted' ? (
                        <UserCheck
                          size={14}
                          color={colors.brand.primary}
                        />
                      ) : (
                        <UserPlus
                          size={14}
                          color={
                            followIsMuted
                              ? colors.brand.primary
                              : colors.neutral.white
                          }
                        />
                      )}

                      <Text
                        style={[
                          styles.followButtonText,
                          followIsMuted
                            ? styles.followButtonMutedText
                            : null,
                        ]}
                      >
                        {followLabel}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={(
          <View style={styles.stateWrap}>
            <Text style={styles.stateTitle}>
              Sin resultados
            </Text>

            <Text style={styles.stateText}>
              Prueba con otro nombre, correo o teléfono.
            </Text>
          </View>
        )}
        contentContainerStyle={styles.resultsContent}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  const confirmationTitle = confirmation?.action === 'cancel_pending'
    ? '¿Cancelar solicitud?'
    : '¿Dejar de seguir?';

  const confirmationBody = confirmation?.action === 'cancel_pending'
    ? `Cancelarás la solicitud enviada a ${confirmation.person.displayName}.`
    : `Dejarás de seguir los estados de ${confirmation?.person.displayName || ''}.`;

  const confirmationActionLabel = (
    confirmation?.action === 'cancel_pending'
      ? 'Cancelar solicitud'
      : 'Dejar de seguir'
  );

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
            disabled={
              Boolean(chattingPersonKey)
              || Boolean(followingPersonKey)
            }
            accessibilityLabel="Volver"
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>
              Personas
            </Text>

            <Text style={styles.headerSubtitle}>
              Inicia conversaciones y sigue estados
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchWrap}>
          <Search
            size={18}
            color={colors.neutral.gray500}
          />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Nombre, correo o teléfono"
            placeholderTextColor={colors.neutral.gray500}
            autoCapitalize="none"
            autoCorrect={false}
            editable={
              !chattingPersonKey
              && !followingPersonKey
            }
            style={styles.searchInput}
            accessibilityLabel="Buscar personas y negocios"
          />

          {query ? (
            <TouchableOpacity
              onPress={() => setQuery('')}
              accessibilityLabel="Limpiar búsqueda"
              activeOpacity={0.7}
            >
              <X
                size={18}
                color={colors.neutral.gray500}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {renderContent()}
      </View>

      <Modal
        transparent
        visible={Boolean(confirmation)}
        animationType="fade"
        onRequestClose={() => {
          if (!followingPersonKey) {
            setConfirmation(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationCard}>
            <View style={styles.confirmationIcon}>
              <UserCheck
                size={22}
                color={colors.brand.primary}
              />
            </View>

            <Text style={styles.confirmationTitle}>
              {confirmationTitle}
            </Text>

            <Text style={styles.confirmationBody}>
              {confirmationBody}
            </Text>

            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConfirmation(null)}
                disabled={Boolean(followingPersonKey)}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelButtonText}>
                  Volver
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  void handleConfirmRemoval();
                }}
                disabled={Boolean(followingPersonKey)}
                activeOpacity={0.75}
              >
                {followingPersonKey ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.neutral.white}
                  />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {confirmationActionLabel}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  headerCopy: {
    alignItems: 'center',
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
  headerSpacer: {
    width: 34,
  },
  searchWrap: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  searchInput: {
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.neutral.text,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  resultsContent: {
    paddingBottom: 28,
  },
  personRow: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderColor: '#D7DFF2',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  personCopy: {
    flex: 1,
    minWidth: 0,
  },
  personNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  personName: {
    color: colors.neutral.text,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  personDescription: {
    color: colors.neutral.gray600,
    fontSize: 11,
    marginTop: 3,
  },
  actions: {
    alignItems: 'flex-end',
    gap: 7,
  },
  chatButton: {
    alignItems: 'center',
    backgroundColor: '#F3F5FF',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minWidth: 86,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chatButtonText: {
    color: colors.brand.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  followButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minWidth: 86,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  followButtonMuted: {
    backgroundColor: '#F3F5FF',
  },
  followButtonText: {
    color: colors.neutral.white,
    fontSize: 11,
    fontWeight: '700',
  },
  followButtonMutedText: {
    color: colors.brand.primary,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 44,
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 14,
    width: 56,
  },
  stateTitle: {
    color: colors.neutral.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: colors.neutral.gray600,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    textAlign: 'center',
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 43, 67, 0.34)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  confirmationCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 22,
    maxWidth: 340,
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: '100%',
  },
  confirmationIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  confirmationTitle: {
    color: colors.neutral.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },
  confirmationBody: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    width: '100%',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: colors.neutral.text,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  confirmButtonText: {
    color: colors.neutral.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
