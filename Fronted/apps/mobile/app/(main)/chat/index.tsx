import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SquarePen,
  UserPlus,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';
import {
  bootstrapChat,
  getChatGroupInvites,
  getCurrentProfile,
  getChatIdentities,
  respondToChatGroupInvite,
} from '@beeapp/api-client';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';
import ModuleNotificationBell from '../../../src/components/ModuleNotificationBell';

import ChatListView from '../../../src/components/chat/ChatListView';
import StatusCirclesRow from '../../../src/components/chat/StatusCirclesRow';
import StatusViewer from '../../../src/components/chat/StatusViewer';
import CreateStatusModal, {
  type SelectedStatusMedia,
} from '../../../src/components/chat/CreateStatusModal';
import StatusCreationEntryModal from '../../../src/components/chat/status/StatusCreationEntryModal';
import MyStatusesModal from '../../../src/components/chat/status/MyStatusesModal';
import ChatTabs, {
  type ChatTab,
} from '../../../src/components/chat/ChatTabs';
import ChatOptionsSheet from '../../../src/components/chat/ChatOptionsSheet';
import ChatCreateMenu from '../../../src/components/chat/ChatCreateMenu';
import DiscoverPeopleModal from '../../../src/components/chat/DiscoverPeopleModal';
import SocialActivitySheet, {
  type SocialActivityTab,
} from '../../../src/components/chat/SocialActivitySheet';
import PinLockModal from '../../../src/components/security/PinLockModal';

import {
  useChatConversations,
} from '../../../src/hooks/useChat';
import type {
  ChatListItemModel,
} from '../../../src/services/chatService';

import {
  useStatuses,
} from '../../../src/hooks/useStatuses';
import {
  acceptStatusFollow,
  archiveCurrentStatus,
  followStatusTarget,
  loadStatusFollowers,
  loadStatusFollowing,
  loadStatusFollowRequests,
  markStatusViewed as registerStatusView,
  publishMediaStatus,
  publishTextStatus,
  rejectStatusFollow,
  searchStatusFollowTargets,
} from '../../../src/services/statusesService';
import type {
  StatusEditorPublishDraft,
} from '../../../src/components/chat/CreateStatusModal';
import type {
  ChatGroupInvite,
  StatusFollowDiscoverItem,
  StatusFollowListItem,
} from '@beeapp/shared-types';
import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';
import {
  getProfileAvatarUrl,
} from '../../../src/services/profileAvatarService';

import {
  hasPin,
  isProtected as isLegacyProtected,
} from '../../../src/stores/pinStore';

type PinAction = {
  type: 'open' | 'add' | 'remove';
  chat?: ChatListItemModel;
};

export default function ChatListScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const context = String(params.context || '').trim();
  const businessId = String(params.businessId || '').trim();
  const isCommercialContext = (
    context === 'commercial'
    && Boolean(businessId)
  );

  const [commercialIdentityId, setCommercialIdentityId] = useState<
    string | null
  >(null);
  const [commercialIdentityError, setCommercialIdentityError] = useState<
    string | null
  >(null);
  const [commercialIdentityLoading, setCommercialIdentityLoading] = useState(
    isCommercialContext,
  );

  useEffect(() => {
    let cancelled = false;

    const resolveCommercialIdentity = async () => {
      if (!isCommercialContext) {
        setCommercialIdentityId(null);
        setCommercialIdentityError(null);
        setCommercialIdentityLoading(false);
        return;
      }

      try {
        setCommercialIdentityLoading(true);
        setCommercialIdentityError(null);

        const auth = await getValidSessionCredentials();

        if (!auth || auth.scheme !== 'Bearer') {
          throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
          );
        }

        await bootstrapChat(auth);

        const response = await getChatIdentities(auth);
        const identity = response.identities.find(
          (item) => (
            item.identity_type === 'commercial_profile'
            && item.commercial_profile_id === businessId
            && item.is_active
          ),
        );

        if (!identity) {
          throw new Error(
            'No fue posible preparar la identidad de Chat de este negocio.',
          );
        }

        if (!cancelled) {
          setCommercialIdentityId(identity.id);
        }
      } catch (error) {
        if (!cancelled) {
          setCommercialIdentityError(
            error instanceof Error
              ? error.message
              : 'No fue posible preparar los chats del negocio.',
          );
          setCommercialIdentityId(null);
        }
      } finally {
        if (!cancelled) {
          setCommercialIdentityLoading(false);
        }
      }
    };

    void resolveCommercialIdentity();

    return () => {
      cancelled = true;
    };
  }, [
    businessId,
    isCommercialContext,
  ]);

  const requestedIdentityId = isCommercialContext
    ? commercialIdentityId
    : null;

  const {
    conversations,
    activeIdentityId,
    loading,
    refreshing,
    error,
    loadConversations,
    updateConversation,
    deleteConversation,
    archiveConversation,
    restoreConversation,
    setProtected,
    isProtected,
  } = useChatConversations({
    autoLoad: !isCommercialContext || Boolean(
      commercialIdentityId,
    ),
    identityId: requestedIdentityId,
  });

  const [menuChat, setMenuChat] = useState<
    ChatListItemModel | null
  >(null);

  const [lockedChatId, setLockedChatId] = useState<
    string | null
  >(null);

  const [pinAction, setPinAction] = useState<
    PinAction | null
  >(null);

  const [activeTab, setActiveTab] = useState<ChatTab>('chats');

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [socialActivityOpen, setSocialActivityOpen] = useState(false);
  const [socialActivityTab, setSocialActivityTab] = useState<
    SocialActivityTab
  >('invites');
  const [socialInvites, setSocialInvites] = useState<
    ChatGroupInvite[]
  >([]);
  const [socialRequests, setSocialRequests] = useState<
    StatusFollowListItem[]
  >([]);
  const [socialFollowers, setSocialFollowers] = useState<
    StatusFollowListItem[]
  >([]);
  const [socialFollowersCount, setSocialFollowersCount] = useState(0);
  const [socialFollowing, setSocialFollowing] = useState<
    StatusFollowListItem[]
  >([]);
  const [socialFollowingCount, setSocialFollowingCount] = useState(0);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialActingId, setSocialActingId] = useState<string | null>(null);
  const [discoverPeopleOpen, setDiscoverPeopleOpen] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverResults, setDiscoverResults] = useState<
    StatusFollowDiscoverItem[]
  >([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [followingTargetKey, setFollowingTargetKey] = useState<
    string | null
  >(null);
  const discoverRequestRef = useRef(0);

  const {
    statuses,
    circleStatuses,
    ownStatuses,
    loading: statusesLoading,
    refreshing: statusesRefreshing,
    error: statusesError,
    refresh: refreshStatuses,
    markStatusViewedLocally,
    backgrounds: statusBackgrounds,
  } = useStatuses({
    commercialProfileId: isCommercialContext
      ? businessId
      : null,
  });

  const [publishingStatus, setPublishingStatus] = useState(false);

  const [viewerIndex, setViewerIndex] = useState<
    number | null
  >(null);

  const handleStatusViewed = (statusId: string) => {
    const status = statuses.find(
      (item) => item.id === statusId,
    );

    if (!status || status.isOwn || status.viewed) {
      return;
    }

    markStatusViewedLocally(statusId);

    void registerStatusView(statusId).catch(() => {
      // La interfaz conserva la vista local para evitar bordes obsoletos.
    });
  };

  const [creatingStatus, setCreatingStatus] = useState(false);
  const [ownStatusAvatarUrl, setOwnStatusAvatarUrl] = useState<
    string | null
  >(null);
  const [
    statusCreationEntryOpen,
    setStatusCreationEntryOpen,
  ] = useState(false);
  const [
    myStatusesOpen,
    setMyStatusesOpen,
  ] = useState(false);
  const [initialStatusMedia, setInitialStatusMedia] = useState<
    SelectedStatusMedia | null
  >(null);
  const [initialStatusMode, setInitialStatusMode] = useState<
    'chooser' | 'editor' | 'text'
  >('chooser');

  const isGroupsTab = activeTab === 'groups';

  useEffect(() => {
    let isMounted = true;

    const loadOwnStatusAvatar = async () => {
      try {
        const credentials = await getValidSessionCredentials();

        if (!credentials) {
          return;
        }

        const response = await getCurrentProfile(credentials);

        if (!response.profile.avatar_file_id) {
          if (isMounted) {
            setOwnStatusAvatarUrl(null);
          }
          return;
        }

        const avatarAccess = await getProfileAvatarUrl(
          credentials,
          response.profile.avatar_file_id,
        );

        if (isMounted) {
          setOwnStatusAvatarUrl(avatarAccess.url);
        }
      } catch {
        if (isMounted) {
          setOwnStatusAvatarUrl(null);
        }
      }
    };

    void loadOwnStatusAvatar();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!discoverPeopleOpen) {
      return;
    }

    const normalizedQuery = discoverQuery.trim();

    if (normalizedQuery.length < 2) {
      setDiscoverResults([]);
      setDiscoverError(null);
      setDiscoverLoading(false);
      return;
    }

    const requestId = discoverRequestRef.current + 1;
    discoverRequestRef.current = requestId;

    const timeoutId = setTimeout(() => {
      void (async () => {
        try {
          setDiscoverLoading(true);
          setDiscoverError(null);

          const response = await searchStatusFollowTargets({
            q: normalizedQuery,
          });

          if (discoverRequestRef.current === requestId) {
            setDiscoverResults(response.items);
          }
        } catch (searchError) {
          if (discoverRequestRef.current === requestId) {
            setDiscoverResults([]);
            setDiscoverError(
              searchError instanceof Error
                ? searchError.message
                : 'No fue posible buscar personas.',
            );
          }
        } finally {
          if (discoverRequestRef.current === requestId) {
            setDiscoverLoading(false);
          }
        }
      })();
    }, 320);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    discoverPeopleOpen,
    discoverQuery,
  ]);

  useEffect(() => {
    if (!socialActivityOpen) {
      return;
    }

    let cancelled = false;

    const loadSocialActivity = async () => {
      try {
        setSocialLoading(true);
        setSocialError(null);

        if (socialActivityTab === 'invites') {
          const auth = await getValidSessionCredentials();

          if (!auth || auth.scheme !== 'Bearer') {
            throw new Error(
              'Tu sesión expiró. Inicia sesión nuevamente.',
            );
          }

          const response = await getChatGroupInvites(
            auth,
            {
              identityId: activeIdentityId || undefined,
              status: 'pending',
              limit: 100,
              offset: 0,
            },
          );

          if (!cancelled) {
            setSocialInvites(response.invites);
          }

          return;
        }

        if (socialActivityTab === 'requests') {
          const response = await loadStatusFollowRequests({
            limit: 50,
          });

          if (!cancelled) {
            setSocialRequests(response.items);
          }

          return;
        }

        if (socialActivityTab === 'followers') {
          const response = await loadStatusFollowers(
            isCommercialContext
              ? {
                  actor_type: 'commercial_profile',
                  commercial_profile_id: businessId,
                  limit: 50,
                }
              : {
                  limit: 50,
                },
          );

          if (!cancelled) {
            setSocialFollowers(response.items);
            setSocialFollowersCount(response.count);
          }

          return;
        }

        const response = await loadStatusFollowing(
          isCommercialContext
            ? {
                actor_type: 'commercial_profile',
                commercial_profile_id: businessId,
                limit: 50,
              }
            : {
                limit: 50,
              },
        );

        if (!cancelled) {
          setSocialFollowing(response.items);
          setSocialFollowingCount(response.count);
        }
      } catch (activityError) {
        if (!cancelled) {
          setSocialError(
            activityError instanceof Error
              ? activityError.message
              : 'No fue posible cargar la actividad.',
          );
        }
      } finally {
        if (!cancelled) {
          setSocialLoading(false);
        }
      }
    };

    void loadSocialActivity();

    return () => {
      cancelled = true;
    };
  }, [
    activeIdentityId,
    businessId,
    isCommercialContext,
    socialActivityOpen,
    socialActivityTab,
  ]);

  const protectedChatIds = useMemo(
    () => new Set(
      conversations
        .filter((chat) => (
          isProtected(chat.id)
          || isLegacyProtected(chat.id)
        ))
        .map((chat) => chat.id),
    ),
    [
      conversations,
      isProtected,
    ],
  );

  const categorizedChats = useMemo(
    () => conversations
      .filter((chat) => (
        chat.isAI
        || chat.isGroup
        || Boolean(
          chat.raw.last_message?.id
          || chat.raw.last_message_at,
        )
      ))
      .map((chat) => ({
        ...chat,
        isProtected: protectedChatIds.has(chat.id),
      })),
    [
      conversations,
      protectedChatIds,
    ],
  );

  const activeChats = useMemo(
    () => categorizedChats.filter(
      (chat) => !chat.isArchived,
    ),
    [categorizedChats],
  );

  const archivedChats = useMemo(
    () => categorizedChats.filter(
      (chat) => (
        chat.isArchived
        && !chat.isAI
      ),
    ),
    [categorizedChats],
  );

  const aiChat = useMemo(
    () => activeTab === 'chats'
      ? activeChats.find((chat) => chat.isAI)
      : undefined,
    [
      activeChats,
      activeTab,
    ],
  );

  const directChats = useMemo(
    () => activeChats.filter(
      (chat) => (
        !chat.isAI
        && !chat.isGroup
      ),
    ),
    [activeChats],
  );

  const groupChats = useMemo(
    () => activeChats.filter(
      (chat) => (
        !chat.isAI
        && chat.isGroup
      ),
    ),
    [activeChats],
  );

  const archivedDirectCount = useMemo(
    () => archivedChats.filter(
      (chat) => !chat.isGroup,
    ).length,
    [archivedChats],
  );

  const archivedGroupCount = useMemo(
    () => archivedChats.filter(
      (chat) => chat.isGroup,
    ).length,
    [archivedChats],
  );

  const openChat = (
    chat: ChatListItemModel,
  ) => {
    router.push({
      pathname: '/(main)/chat/conversation',
      params: {
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup
          ? 'true'
          : 'false',
        isAi: chat.isAI
          ? 'true'
          : 'false',
        online: chat.online
          ? 'true'
          : 'false',
        ...(isCommercialContext
          ? {
              context: 'commercial',
              businessId,
              identityId: activeIdentityId || '',
            }
          : {}),
      },
    });
  };

  const handleChatPress = (
    chat: ChatListItemModel,
  ) => {
    const protectedChat = (
      isProtected(chat.id)
      || isLegacyProtected(chat.id)
    );

    if (protectedChat) {
      setPinAction({
        type: 'open',
        chat,
      });

      setLockedChatId(chat.id);
      return;
    }

    openChat(chat);
  };

  const handlePinSuccess = () => {
    const action = pinAction;

    setLockedChatId(null);
    setPinAction(null);

    if (!action?.chat) {
      return;
    }

    if (action.type === 'open') {
      openChat(action.chat);
      return;
    }

    if (action.type === 'add') {
      setProtected(action.chat.id, true);

      Alert.alert(
        'Chat protegido',
        'El chat quedó protegido con tu PIN.',
      );
      return;
    }

    setProtected(action.chat.id, false);

    Alert.alert(
      'Protección removida',
      'El chat ya no requiere PIN para abrirse.',
    );
  };

  const handleToggleProtection = (
    chat: ChatListItemModel,
  ) => {
    setMenuChat(null);

    if (
      isProtected(chat.id)
      || isLegacyProtected(chat.id)
    ) {
      setPinAction({
        type: 'remove',
        chat,
      });

      setLockedChatId(chat.id);
      return;
    }

    if (!hasPin()) {
      Alert.alert(
        'PIN requerido',
        'Debes crear un PIN primero desde Seguridad.',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Ir a Seguridad',
            onPress: () => {
              router.push(
                '/(main)/profile/security',
              );
            },
          },
        ],
      );

      return;
    }

    setPinAction({
      type: 'add',
      chat,
    });

    setLockedChatId(chat.id);
  };

  const handleTogglePin = async (
    chat: ChatListItemModel,
  ) => {
    try {
      await updateConversation(
        chat.id,
        {
          isPinned: !chat.isPinned,
        },
      );
    } catch (updateError) {
      Alert.alert(
        'No fue posible actualizar el chat',
        updateError instanceof Error
          ? updateError.message
          : 'Inténtalo nuevamente.',
      );
    }
  };

  const handleToggleMute = async (
    chat: ChatListItemModel,
  ) => {
    try {
      await updateConversation(
        chat.id,
        {
          isMuted: !chat.isMuted,
        },
      );
    } catch (updateError) {
      Alert.alert(
        'No fue posible actualizar el chat',
        updateError instanceof Error
          ? updateError.message
          : 'Inténtalo nuevamente.',
      );
    }
  };

  const handleArchive = async (
    chat: ChatListItemModel,
  ) => {
    try {
      await archiveConversation(chat.id);

      Alert.alert(
        'Chat archivado',
        chat.isGroup
          ? 'El grupo ahora está en Grupos archivados.'
          : 'El chat ahora está en Chats archivados.',
      );
    } catch (archiveError) {
      Alert.alert(
        'No fue posible archivar el chat',
        archiveError instanceof Error
          ? archiveError.message
          : 'Inténtalo nuevamente.',
      );
    }
  };

  const handleRestore = async (
    chat: ChatListItemModel,
  ) => {
    try {
      await restoreConversation(chat.id);

      Alert.alert(
        'Chat restaurado',
        chat.isGroup
          ? 'El grupo volvió a la pestaña Grupos.'
          : 'El chat volvió a la pestaña Chats.',
      );
    } catch (restoreError) {
      Alert.alert(
        'No fue posible restaurar el chat',
        restoreError instanceof Error
          ? restoreError.message
          : 'Inténtalo nuevamente.',
      );
    }
  };

  const handleDelete = (
    chat: ChatListItemModel,
  ) => {
    Alert.alert(
      'Eliminar chat',
      (
        `¿Seguro que quieres eliminar `
        + `${chat.isGroup ? 'el grupo' : 'el chat'} `
        + `"${chat.name}" de tu lista?`
      ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void deleteConversation(chat.id)
              .catch((deleteError) => {
                Alert.alert(
                  'No fue posible eliminar el chat',
                  deleteError instanceof Error
                    ? deleteError.message
                    : 'Inténtalo nuevamente.',
                );
              });
          },
        },
      ],
    );
  };

  const handleRefresh = () => {
    void Promise.allSettled([
      loadConversations({
        refresh: true,
      }),
      refreshStatuses(),
    ]);
  };

  const openStatusEditor = (
    options: {
      media?: SelectedStatusMedia | null;
      mode?: 'chooser' | 'editor' | 'text';
    } = {},
  ) => {
    setInitialStatusMedia(options.media || null);
    setInitialStatusMode(
      options.media
        ? 'editor'
        : options.mode || 'chooser',
    );
    setStatusCreationEntryOpen(false);
    setMyStatusesOpen(false);
    setCreatingStatus(true);
  };

  const handleStatusCirclePress = () => {
    if (ownStatuses.length > 0) {
      setMyStatusesOpen(true);
      return;
    }

    setStatusCreationEntryOpen(true);
  };

  const openOwnStatusInViewer = (statusId: string) => {
    const index = statuses.findIndex(
      (status) => status.id === statusId,
    );

    if (index < 0) {
      return;
    }

    const selectedStatus = statuses[index];

    if (selectedStatus) {
      void registerStatusView(selectedStatus.id).catch(() => {
        // El dueño no puede registrar su propia vista.
      });
    }

    setMyStatusesOpen(false);
    setViewerIndex(index);
  };

  const openStatusCreationFromMyStatuses = () => {
    setMyStatusesOpen(false);
    setStatusCreationEntryOpen(true);
  };

  const handleArchiveStatus = async (
    statusId: string,
    returnToMyStatuses: boolean,
  ) => {
    try {
      await archiveCurrentStatus(statusId);
      setViewerIndex(null);
      setMyStatusesOpen(returnToMyStatuses);
      await refreshStatuses();
    } catch (archiveError) {
      throw new Error(
        archiveError instanceof Error
          ? archiveError.message
          : 'No fue posible eliminar el estado.',
      );
    }
  };

  const handlePublishStatus = async (
    draft: StatusEditorPublishDraft,
  ) => {
    if (publishingStatus) {
      return;
    }

    try {
      setPublishingStatus(true);

      if (draft.media) {
        await publishMediaStatus(
          {
            kind: draft.media.kind,
            caption: draft.caption,
            editor_metadata: draft.editorMetadata,
            ...(isCommercialContext
              ? {
                  actor_type: 'commercial_profile' as const,
                  actor_commercial_profile_id: businessId,
                }
              : {}),
            duration_seconds: (
              draft.media.kind === 'video'
                ? draft.media.durationSeconds ?? undefined
                : undefined
            ),
          },
          {
            uri: draft.media.uri,
            name: draft.media.name,
            mimeType: draft.media.mimeType,
          },
        );
      } else {
        const normalizedColor = draft.backgroundColor
          .trim()
          .toUpperCase();

        const selectedBackground = statusBackgrounds.find(
          (background) => (
            background.hex_color.toUpperCase()
            === normalizedColor
          ),
        ) || statusBackgrounds[0];

        if (!selectedBackground) {
          throw new Error(
            'No hay fondos de texto disponibles. Inténtalo nuevamente.',
          );
        }

        await publishTextStatus({
          kind: 'text',
          text_content: draft.textContent,
          text_background_id: selectedBackground.id,
          caption: draft.caption,
          editor_metadata: draft.editorMetadata,
          ...(isCommercialContext
            ? {
                actor_type: 'commercial_profile' as const,
                actor_commercial_profile_id: businessId,
              }
            : {}),
        });
      }

      setCreatingStatus(false);
      setStatusCreationEntryOpen(false);
      setMyStatusesOpen(false);
      setInitialStatusMedia(null);
      setInitialStatusMode('chooser');

      await refreshStatuses();
    } catch (publishError) {
      Alert.alert(
        'No fue posible publicar el estado',
        publishError instanceof Error
          ? publishError.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setPublishingStatus(false);
    }
  };

  const visibleListChats = isGroupsTab
    ? groupChats
    : directChats;

  const archivedCount = isGroupsTab
    ? archivedGroupCount
    : archivedDirectCount;

  const archivedLabel = isGroupsTab
    ? 'Grupos archivados'
    : 'Chats archivados';

  const archivedSubtitle = isGroupsTab
    ? (
        archivedCount === 1
          ? '1 grupo archivado'
          : `${archivedCount} grupos archivados`
      )
    : (
      archivedCount === 1
        ? '1 chat archivado'
        : `${archivedCount} chats archivados`
    );

  const emptyTitle = isGroupsTab
    ? 'Aún no tienes grupos'
    : 'Aún no tienes chats';

  const emptyDescription = isGroupsTab
    ? (
        'Crea un grupo para conversar con varias '
        + 'cuentas de BeeApp.'
      )
    : (
      'Inicia un chat o crea un grupo para comenzar.'
    );

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Chats
          </Text>

          <View style={styles.headerActions}>
            <ModuleNotificationBell moduleId="chat" />

            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => {
                setSocialActivityOpen(true);
              }}
              activeOpacity={0.7}
              accessibilityLabel="Abrir actividad social"
            >
              <UserPlus
                size={20}
                color={colors.neutral.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newChatBtn}
              onPress={() => setCreateMenuOpen(true)}
              activeOpacity={0.7}
              accessibilityLabel="Crear o descubrir personas"
            >
              <SquarePen
                size={20}
                color={colors.neutral.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusesSection}>
          <StatusCirclesRow
            statuses={circleStatuses}
            hasOwnStatus={ownStatuses.length > 0}
            ownAvatarUrl={ownStatusAvatarUrl}
            showLoadingPlaceholders={
              statusesLoading && circleStatuses.length === 0
            }
            onCreate={handleStatusCirclePress}
            onOpen={(index) => {
              const selectedCircleStatus = circleStatuses[index];

              if (!selectedCircleStatus) {
                return;
              }

              const statusIndex = statuses.findIndex(
                (status) => status.id === selectedCircleStatus.id,
              );

              if (statusIndex < 0) {
                return;
              }

              handleStatusViewed(
                selectedCircleStatus.id,
              );

              setViewerIndex(statusIndex);
            }}
          />

          {statusesError ? (
            <View style={styles.statusesInlineState}>
              <Text style={styles.statusesInlineError}>
                No fue posible cargar los estados.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  void refreshStatuses();
                }}
                activeOpacity={0.7}
                accessibilityLabel="Reintentar cargar estados"
              >
                <Text style={styles.statusesInlineRetry}>
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <ChatTabs
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <>
          {(
            commercialIdentityLoading
            || (loading && conversations.length === 0)
          ) ? (
            <View style={styles.loadingState}>
              <ActivityIndicator
                size="large"
                color={colors.brand.primary}
              />

              <Text style={styles.loadingText}>
                Cargando chats...
              </Text>
            </View>
          ) : (
            <View style={styles.listWrap}>
              {commercialIdentityError || error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>
                    {commercialIdentityError || error}
                  </Text>

                  <TouchableOpacity
                    onPress={handleRefresh}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.retryText}>
                      Reintentar
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <ChatListView
                aiChat={
                  isGroupsTab
                    ? undefined
                    : aiChat
                }
                chats={visibleListChats}
                archivedCount={archivedCount}
                archivedLabel={archivedLabel}
                archivedSubtitle={archivedSubtitle}
                onPressArchived={() => {
                  router.push({
                    pathname: '/(main)/chat/archived',
                    params: {
                      kind: isGroupsTab
                        ? 'group'
                        : 'direct',
                      ...(isCommercialContext
                        ? {
                            context: 'commercial',
                            businessId,
                            identityId: activeIdentityId || '',
                          }
                        : {}),
                    },
                  });
                }}
                onOpenChat={handleChatPress}
                onOpenMenu={setMenuChat}
                onPin={() => {
                  // La acción se ejecuta desde ChatOptionsSheet.
                }}
                onMute={() => {
                  // La acción se ejecuta desde ChatOptionsSheet.
                }}
                onDelete={() => {
                  // La acción se ejecuta desde ChatOptionsSheet.
                }}
                refreshControl={
                  <RefreshControl
                    refreshing={
                      refreshing
                      || statusesRefreshing
                    }
                    onRefresh={handleRefresh}
                    tintColor={colors.brand.primary}
                  />
                }
              />

              {visibleListChats.length === 0 && !error ? (
                <View style={styles.emptyOverlay}>
                  <Text style={styles.emptyTitle}>
                    {emptyTitle}
                  </Text>

                  <Text style={styles.emptyDescription}>
                    {emptyDescription}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </>
      </View>

      <StatusViewer
        visible={viewerIndex !== null}
        statuses={statuses}
        index={viewerIndex ?? 0}
        senderIdentityId={activeIdentityId}
        onChangeIndex={setViewerIndex}
        onStatusViewed={handleStatusViewed}
        onArchiveStatus={(statusId) => (
          handleArchiveStatus(statusId, false)
        )}
        onClose={() => {
          setViewerIndex(null);
        }}
      />

      <StatusCreationEntryModal
        visible={statusCreationEntryOpen}
        onChooseText={() => {
          openStatusEditor({
            mode: 'text',
          });
        }}
        onSelectMedia={(media) => {
          openStatusEditor({
            media,
          });
        }}
        onClose={() => {
          setStatusCreationEntryOpen(false);
        }}
      />

      <MyStatusesModal
        visible={myStatusesOpen}
        statuses={ownStatuses}
        onOpenStatus={(status) => {
          openOwnStatusInViewer(status.id);
        }}
        onCreateText={() => {
          openStatusEditor({
            mode: 'text',
          });
        }}
        onOpenCamera={openStatusCreationFromMyStatuses}
        onArchiveStatus={(statusId) => (
          handleArchiveStatus(statusId, false)
        )}
        onClose={() => {
          setMyStatusesOpen(false);
        }}
      />

      <CreateStatusModal
        visible={creatingStatus}
        backgrounds={statusBackgrounds}
        initialMedia={initialStatusMedia}
        initialMode={initialStatusMode}
        isPublishing={publishingStatus}
        onPublish={handlePublishStatus}
        onClose={() => {
          if (!publishingStatus) {
            setCreatingStatus(false);
            setInitialStatusMedia(null);
            setInitialStatusMode('chooser');
          }
        }}
      />

      <PinLockModal
        visible={Boolean(lockedChatId)}
        itemName={
          pinAction?.chat?.name
          || 'Chat protegido'
        }
        onClose={() => {
          setLockedChatId(null);
          setPinAction(null);
        }}
        onSuccess={handlePinSuccess}
      />

      <SocialActivitySheet
        visible={socialActivityOpen}
        activeTab={socialActivityTab}
        allowedTabs={
          isCommercialContext
            ? [
                'invites',
                'followers',
                'following',
              ]
            : undefined
        }
        invites={socialInvites}
        requests={socialRequests}
        followers={socialFollowers}
        followersCount={socialFollowersCount}
        following={socialFollowing}
        followingCount={socialFollowingCount}
        loading={socialLoading}
        error={socialError}
        actingId={socialActingId}
        onChangeTab={setSocialActivityTab}
        onAcceptInvite={(invite) => {
          if (socialActingId) {
            return;
          }

          void (async () => {
            try {
              setSocialActingId(invite.id);
              const auth = await getValidSessionCredentials();

              if (!auth || auth.scheme !== 'Bearer') {
                throw new Error(
                  'Tu sesión expiró. Inicia sesión nuevamente.',
                );
              }

              const result = await respondToChatGroupInvite(
                auth,
                invite.id,
                true,
              );

              setSocialInvites((current) => current.filter(
                (item) => item.id !== invite.id,
              ));

              await loadConversations({
                refresh: true,
              });

              if (
                result.accepted
                && result.conversation
              ) {
                setSocialActivityOpen(false);

                router.push({
                  pathname: '/(main)/chat/conversation',
                  params: {
                    id: result.conversation.id,
                    name: result.conversation.name?.trim()
                      || 'Grupo',
                    isGroup: 'true',
                    isAi: 'false',
                    online: 'false',
                    inviteId: invite.id,
                  },
                });
              }
            } catch (inviteError) {
              setSocialError(
                inviteError instanceof Error
                  ? inviteError.message
                  : 'No fue posible aceptar la invitación.',
              );
            } finally {
              setSocialActingId(null);
            }
          })();
        }}
        onRejectInvite={(invite) => {
          if (socialActingId) {
            return;
          }

          void (async () => {
            try {
              setSocialActingId(invite.id);
              const auth = await getValidSessionCredentials();

              if (!auth || auth.scheme !== 'Bearer') {
                throw new Error(
                  'Tu sesión expiró. Inicia sesión nuevamente.',
                );
              }

              await respondToChatGroupInvite(
                auth,
                invite.id,
                false,
              );

              setSocialInvites((current) => current.filter(
                (item) => item.id !== invite.id,
              ));
            } catch (inviteError) {
              setSocialError(
                inviteError instanceof Error
                  ? inviteError.message
                  : 'No fue posible rechazar la invitación.',
              );
            } finally {
              setSocialActingId(null);
            }
          })();
        }}
        onAcceptRequest={(request) => {
          if (socialActingId) {
            return;
          }

          void (async () => {
            try {
              setSocialActingId(request.id);
              await acceptStatusFollow(request.id);

              setSocialRequests((current) => current.filter(
                (item) => item.id !== request.id,
              ));

              void refreshStatuses();
            } catch (requestError) {
              setSocialError(
                requestError instanceof Error
                  ? requestError.message
                  : 'No fue posible aceptar la solicitud.',
              );
            } finally {
              setSocialActingId(null);
            }
          })();
        }}
        onRejectRequest={(request) => {
          if (socialActingId) {
            return;
          }

          void (async () => {
            try {
              setSocialActingId(request.id);
              await rejectStatusFollow(request.id);

              setSocialRequests((current) => current.filter(
                (item) => item.id !== request.id,
              ));
            } catch (requestError) {
              setSocialError(
                requestError instanceof Error
                  ? requestError.message
                  : 'No fue posible rechazar la solicitud.',
              );
            } finally {
              setSocialActingId(null);
            }
          })();
        }}
        onClose={() => {
          setSocialActivityOpen(false);
          setSocialError(null);
          setSocialActingId(null);
        }}
      />

      <DiscoverPeopleModal
        visible={discoverPeopleOpen}
        query={discoverQuery}
        results={discoverResults}
        loading={discoverLoading}
        error={discoverError}
        followingTargetKey={followingTargetKey}
        onChangeQuery={setDiscoverQuery}
        onFollow={(target) => {
          const targetKey = (
            target.profile_id
            || target.commercial_profile_id
            || target.display_name
          );

          void (async () => {
            try {
              setFollowingTargetKey(targetKey);

              const response = await followStatusTarget({
                target_actor_type: target.actor_type,
                target_profile_id: target.profile_id,
                target_commercial_profile_id: (
                  target.commercial_profile_id
                ),
              });

              setDiscoverResults((current) => (
                current.map((item) => {
                  const itemKey = (
                    item.profile_id
                    || item.commercial_profile_id
                    || item.display_name
                  );

                  return itemKey === targetKey
                    ? {
                      ...item,
                      follow_id: response.follow.id,
                      follow_state: response.follow.state,
                    }
                    : item;
                })
              ));

              void refreshStatuses();
            } catch (followError) {
              setDiscoverError(
                followError instanceof Error
                  ? followError.message
                  : 'No fue posible seguir esta cuenta.',
              );
            } finally {
              setFollowingTargetKey(null);
            }
          })();
        }}
        onClose={() => {
          discoverRequestRef.current += 1;
          setDiscoverPeopleOpen(false);
          setDiscoverQuery('');
          setDiscoverResults([]);
          setDiscoverError(null);
          setFollowingTargetKey(null);
        }}
      />

      <ChatCreateMenu
        visible={createMenuOpen}
        onNewChat={() => {
          setCreateMenuOpen(false);

          router.push(
            isCommercialContext
              ? {
                  pathname: '/(main)/chat/new',
                  params: {
                    context: 'commercial',
                    businessId,
                    identityId: activeIdentityId || '',
                  },
                }
              : '/(main)/chat/new',
          );
        }}
        onNewGroup={() => {
          setCreateMenuOpen(false);

          router.push(
            isCommercialContext
              ? {
                  pathname: '/(main)/chat/new-group',
                  params: {
                    context: 'commercial',
                    businessId,
                    identityId: activeIdentityId || '',
                  },
                }
              : '/(main)/chat/new-group',
          );
        }}
        onDiscoverPeople={() => {
          setCreateMenuOpen(false);
          setDiscoverPeopleOpen(true);
        }}
        onClose={() => {
          setCreateMenuOpen(false);
        }}
      />

      <ChatOptionsSheet
        chat={menuChat}
        isProtected={
          Boolean(menuChat)
          && (
            isProtected(menuChat?.id || '')
            || isLegacyProtected(menuChat?.id || '')
          )
        }
        onToggleProtection={() => {
          if (menuChat) {
            handleToggleProtection(menuChat);
          }
        }}
        onTogglePin={() => {
          if (menuChat) {
            void handleTogglePin(menuChat);
          }

          setMenuChat(null);
        }}
        onToggleMute={() => {
          if (menuChat) {
            void handleToggleMute(menuChat);
          }

          setMenuChat(null);
        }}
        onAssignCategory={() => {
          // La asignación de categorías conserva su flujo existente.
        }}
        onDelete={() => {
          if (menuChat) {
            handleDelete(menuChat);
          }

          setMenuChat(null);
        }}
        onArchive={() => {
          if (menuChat) {
            void handleArchive(menuChat);
          }

          setMenuChat(null);
        }}
        onRestore={() => {
          if (menuChat) {
            void handleRestore(menuChat);
          }

          setMenuChat(null);
        }}
        onClose={() => {
          setMenuChat(null);
        }}
      />

    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F7F8FF',
    flex: 1,
  },
  container: {
    backgroundColor: '#F4F6FF',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#DDE4F4',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderRadius: 22,
    shadowColor: '#9CA9CF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 9,
    elevation: 2,
  },
  title: {
    color: '#303B5A',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  newChatBtn: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderColor: '#D7DFF2',
    borderRadius: 14,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  loadingText: {
    color: colors.neutral.gray600,
    fontSize: 14,
    fontWeight: '600',
  },
  listWrap: {
    flex: 1,
    paddingTop: 4,
  },
  errorBox: {
    alignItems: 'center',
    backgroundColor: '#FFF2F5',
    borderBottomColor: '#F3C4CC',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    textAlign: 'center',
  },
  retryText: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyOverlay: {
    alignItems: 'center',
    backgroundColor: '#F9FAFF',
    borderColor: '#E0E6F4',
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 18,
    paddingHorizontal: 36,
    paddingVertical: 44,
  },
  emptyTitle: {
    color: colors.neutral.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyDescription: {
    color: colors.neutral.gray600,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    textAlign: 'center',
  },
  statusesSection: {
    backgroundColor: '#F9FAFF',
    borderBottomColor: '#DDE4F4',
    borderBottomWidth: 1,
    borderTopColor: '#E7ECF7',
    borderTopWidth: 1,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statusesInlineState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 82,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  statusesInlineText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    fontWeight: '600',
  },
  statusesInlineError: {
    color: colors.semantic.error,
    flex: 1,
    fontSize: 12,
  },
  statusesInlineRetry: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
