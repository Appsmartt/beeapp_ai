import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFocusEffect } from 'expo-router';
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
  listProtectedChats,
  getAccountSecurityPinStatus,
  protectChatWithPin,
  removeChatPinProtection,
  verifyAccountSecurityPin,
  respondToChatGroupInvite,
  listChatCategories,
  listChatCategoryAssignments,
  type ChatCategoryRecord,
} from '@beeapp/api-client';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';
import ModuleNotificationBell from '../../../src/components/ModuleNotificationBell';

import ChatListView from '../../../src/components/chat/ChatListView';
import ChatCategoryChips from '../../../src/components/chat/ChatCategoryChips';
import CreateCategoryModal from '../../../src/components/chat/CreateCategoryModal';
import AssignCategoryModal from '../../../src/components/chat/AssignCategoryModal';
import ManageChatCategoriesModal from '../../../src/components/chat/ManageChatCategoriesModal';
import {
  createChatCategory,
  deleteChatCategory,
  saveChatConversationCategories,
} from '@beeapp/api-client';
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
import GroupAwareChatOptionsSheet from '../../../src/components/chat/GroupAwareChatOptionsSheet';
import ChatCreateMenu from '../../../src/components/chat/ChatCreateMenu';
import SocialActivitySheet, {
  type SocialActivityTab,
} from '../../../src/components/chat/SocialActivitySheet';
import PinLockModal from '../../../src/components/security/PinLockModal';

import {
  useChatConversations,
} from '../../../src/hooks/useChat';
import { retryBackgroundLoad } from '../../../src/utils/retryBackgroundLoad';
import { useChatListPresence } from '../../../src/hooks/useChatListPresence';
import type {
  ChatListItemModel,
} from '../../../src/services/chatService';

import {
  useStatuses,
} from '../../../src/hooks/useStatuses';
import {
  prepareStatusImageLayerForUpload,
  prepareStatusMediaForUpload,
} from '../../../src/services/statusMediaPreparation';
import {
  logStatusVideoDiagnostic,
} from '../../../src/services/statusVideoDiagnostics';

import {
  acceptStatusFollow,
  archiveCurrentStatus,
  loadStatusFollowers,
  loadStatusFollowing,
  loadStatusFollowRequests,
  markStatusViewed as registerStatusView,
  publishMediaStatus,
  publishTextStatus,
  publishTextStatusWithImageLayers,
  rejectStatusFollow,
} from '../../../src/services/statusesService';
import type {
  StatusEditorPublishDraft,
} from '../../../src/components/chat/CreateStatusModal';
import type {
  ChatGroupInvite,
  StatusFollowListItem,
  StatusImageLayerUpload,
} from '@beeapp/shared-types';
import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';
import {
  getProfileAvatarUrl,
} from '../../../src/services/profileAvatarService';
import {
  loadOwnedCommercialProfile,
} from '../../../src/services/commercialService';

type PinAction = {
  type: 'open' | 'remove';
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

        const identity = await retryBackgroundLoad(async () => {
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

          return identity;
        }, () => !cancelled);

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
    loadingMore,
    hasMoreConversations,
    loadMoreConversations,
    loadConversations,
    updateConversation,
    deleteConversation,
    archiveConversation,
    restoreConversation,
  } = useChatConversations({
    autoLoad: !isCommercialContext || Boolean(
      commercialIdentityId,
    ),
    identityId: requestedIdentityId,
    paginateInbox: true,
    retryInboxLoads: true,
  });

  const [menuChat, setMenuChat] = useState<
    ChatListItemModel | null
  >(null);

  const [chatCategories, setChatCategories] = useState<ChatCategoryRecord[]>([]);
  const [categoryAssignments, setCategoryAssignments] = useState<Record<string, string[]>>({});
  const [categoryIdentityId, setCategoryIdentityId] = useState<string | null>(null);
  const categoryLoadedIdentity = useRef<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [categoryRefresh, setCategoryRefresh] = useState(0);
  useFocusEffect(useCallback(() => {
    setCategoryRefresh((value) => value + 1);
  }, []));
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [managingCategories, setManagingCategories] = useState(false);
  const [assigningChat, setAssigningChat] = useState<ChatListItemModel | null>(null);
  const [returnToAssignment, setReturnToAssignment] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);

  const categoryConversationIds = useMemo(
    () => conversations.filter((chat) => !chat.isAI).map((chat) => chat.id),
    [conversations],
  );
  const categoryConversationKey = categoryConversationIds.join(',');

  useEffect(() => {
    let cancelled = false;
    if (categoryLoadedIdentity.current !== activeIdentityId) {
      categoryLoadedIdentity.current = activeIdentityId;
      setCategoryIdentityId(null);
      setChatCategories([]);
      setCategoryAssignments({});
      setActiveCategoryId(null);
    }

    if (!activeIdentityId) {
      return () => { cancelled = true; };
    }

    const loadCategories = async () => {
      try {
        const auth = await getValidSessionCredentials();
        if (!auth || auth.scheme !== 'Bearer') return;
        const categoryResponse = await listChatCategories(auth, activeIdentityId);
        const chunks: string[][] = [];
        for (let index = 0; index < categoryConversationIds.length; index += 100) {
          chunks.push(categoryConversationIds.slice(index, index + 100));
        }
        const responses = await Promise.all(
          chunks.map((ids) => listChatCategoryAssignments(auth, activeIdentityId, ids)),
        );
        if (cancelled) return;
        const next: Record<string, string[]> = {};
        responses.flatMap((response) => response.assignments).forEach((entry) => {
          (next[entry.conversation_id] ||= []).push(entry.category_id);
        });
        setChatCategories(categoryResponse.categories);
        setCategoryAssignments(next);
        setCategoryIdentityId(activeIdentityId);
      } catch (categoryError) {
        if (!cancelled) {
          setCategoryIdentityId(null);
          Alert.alert(
            'No fue posible cargar las categorías',
            categoryError instanceof Error ? categoryError.message : 'Inténtalo nuevamente.',
          );
        }
      }
    };
    void loadCategories();
    return () => { cancelled = true; };
  }, [activeIdentityId, categoryConversationKey, categoryRefresh]);

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
  const [statusPublishingPhase, setStatusPublishingPhase] = useState<
    'idle'
    | 'preparing_image'
    | 'preparing_video'
    | 'uploading'
    | 'error'
  >('idle');
  const [statusPublishingMessage, setStatusPublishingMessage] = useState<
    string | null
  >(null);

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
      if (isMounted) {
        setOwnStatusAvatarUrl(null);
      }

      try {
        if (isCommercialContext) {
          const response = await loadOwnedCommercialProfile(
            businessId,
          );
          const logoUrl = response.profile.logo_url?.trim() || null;

          if (isMounted) {
            setOwnStatusAvatarUrl(logoUrl);
          }
          return;
        }

        const credentials = await getValidSessionCredentials();

        if (!credentials) {
          return;
        }

        const response = await getCurrentProfile(credentials);

        if (!response.profile.avatar_file_id) {
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
  }, [
    businessId,
    isCommercialContext,
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

  const [protectedChatIds, setProtectedChatIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [protectionIdentityId, setProtectionIdentityId] = useState<
    string | null
  >(null);
  const [protectionLoaded, setProtectionLoaded] = useState(false);
  const [protectionError, setProtectionError] = useState<string | null>(null);
  const [protectionRefresh, setProtectionRefresh] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setProtectionLoaded(false);
      setProtectionRefresh((value) => value + 1);
      return () => setProtectionLoaded(false);
    }, []),
  );

  useEffect(() => {
    let cancelled = false;
    setProtectionLoaded(false);
    setProtectionError(null);

    const loadProtection = async () => {
      try {
        const auth = await getValidSessionCredentials();
        if (!auth) throw new Error('Inicia sesión para cargar los chats protegidos.');
        const result = await listProtectedChats(auth);
        if (cancelled) return;
        setProtectedChatIds(new Set(result.conversation_ids));
        setProtectionIdentityId(activeIdentityId);
        setProtectionLoaded(true);
      } catch (failure) {
        if (cancelled) return;
        setProtectionError(
          failure instanceof Error
            ? failure.message
            : 'No fue posible cargar la protección de chats.',
        );
        setProtectionLoaded(false);
      }
    };

    void loadProtection();
    return () => {
      cancelled = true;
    };
  }, [activeIdentityId, protectionRefresh]);

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
    () => activeChats
      .filter((chat) => !chat.isAI && !chat.isGroup)
      .sort((left, right) => (
        Number(right.isPinned) - Number(left.isPinned)
      )),
    [activeChats],
  );

  const groupChats = useMemo(
    () => activeChats
      .filter((chat) => !chat.isAI && chat.isGroup)
      .sort((left, right) => Number(right.isPinned) - Number(left.isPinned)),
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
        online: 'false',
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
    const protectedChat = protectedChatIds.has(chat.id);

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

  const verifyChatPin = async (pin: string) => {
    if (!pinAction?.chat) {
      throw new Error('Selecciona un chat e inténtalo nuevamente.');
    }

    const auth = await getValidSessionCredentials();
    if (!auth) throw new Error('Inicia sesión para verificar tu PIN.');

    if (pinAction.type === 'remove') {
      await removeChatPinProtection(auth, pinAction.chat.id, pin);
      return;
    }

    const result = await verifyAccountSecurityPin(auth, pin);
    if (!result.verified) throw new Error('PIN incorrecto. Inténtalo de nuevo.');
  };

  const handlePinSuccess = () => {
    const action = pinAction;
    setLockedChatId(null);
    setPinAction(null);
    if (!action?.chat) return;

    if (action.type === 'open') {
      openChat(action.chat);
      return;
    }

    setProtectedChatIds((current) => {
      const next = new Set(current);
      next.delete(action.chat!.id);
      return next;
    });
    Alert.alert(
      'Protección removida',
      'El chat ya no requiere PIN para abrirse.',
    );
  };

  const handleToggleProtection = async (
    chat: ChatListItemModel,
  ) => {
    setMenuChat(null);

    if (
      protectedChatIds.has(chat.id)
    ) {
      setPinAction({
        type: 'remove',
        chat,
      });

      setLockedChatId(chat.id);
      return;
    }

    try {
      const auth = await getValidSessionCredentials();
      if (!auth) throw new Error('Inicia sesión para proteger el chat.');
      const status = await getAccountSecurityPinStatus(auth);

      if (!status.configured) {
        Alert.alert(
          'PIN requerido',
          'Debes crear un PIN primero desde Seguridad.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ir a Seguridad',
              onPress: () => router.push('/(main)/profile/security'),
            },
          ],
        );
        return;
      }

      await protectChatWithPin(auth, chat.id);
      setProtectedChatIds((current) => new Set(current).add(chat.id));
      Alert.alert('Chat protegido', 'El chat quedó protegido con tu PIN.');
    } catch (failure) {
      Alert.alert(
        'No fue posible proteger el chat',
        failure instanceof Error ? failure.message : 'Inténtalo nuevamente.',
      );
    }
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
        chat.isGroup
          ? (
              `¿Eliminar "${chat.name}"? Si eres integrante, saldrás `
              + 'del grupo y desaparecerá de tu lista. Si eres el único '
              + 'integrante y owner, se desactivará el grupo.'
            )
          : `¿Seguro que quieres eliminar el chat "${chat.name}" de tu lista?`
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
    setCategoryRefresh((value) => value + 1);
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
      setStatusPublishingMessage(null);

      const uploadableImageLayers = draft.imageLayers.filter(
        (layer) => layer.source !== 'commercial_offer',
      );

      const imageLayers: StatusImageLayerUpload[] = await Promise.all(
        uploadableImageLayers.map(async (layer, sortOrder) => {
          const preparedLayer = await prepareStatusImageLayerForUpload({
            uri: layer.uri,
            name: layer.name,
            mimeType: layer.mimeType,
          });

          return {
            id: layer.id,
            uri: preparedLayer.uri,
            name: preparedLayer.name,
            mimeType: preparedLayer.mimeType,
            x: layer.x,
            y: layer.y,
            scale: layer.scale,
            rotation: layer.rotation,
            size: layer.size,
            sortOrder,
          };
        }),
      );

      if (draft.media) {
        setStatusPublishingPhase(
          draft.media.kind === 'video'
            ? 'preparing_video'
            : 'preparing_image',
        );

        const preparedMedia = await prepareStatusMediaForUpload({
          uri: draft.media.uri,
          name: draft.media.name,
          mimeType: draft.media.mimeType,
          kind: draft.media.kind,
          durationSeconds: draft.media.durationSeconds,
          traceId: draft.media.traceId,
          source: draft.media.source,
        });

        if (preparedMedia.kind === 'video') {
          logStatusVideoDiagnostic({
            traceId: draft.media.traceId?.trim() || 'status-video-unknown',
            stage: 'upload_started',
            source: draft.media.source || 'unknown',
            name: preparedMedia.name,
            mimeType: preparedMedia.mimeType,
            sizeBytes: preparedMedia.sizeBytes,
            durationSeconds: preparedMedia.durationSeconds,
          });
        }

        setStatusPublishingPhase('uploading');

        await publishMediaStatus(
          {
            kind: preparedMedia.kind,
            caption: draft.caption,
            editor_metadata: draft.editorMetadata,
            image_layers: imageLayers,
            ...(draft.commercialOfferLink
              ? {
                  commercial_offer_link: draft.commercialOfferLink,
                }
              : {}),
            ...(isCommercialContext
              ? {
                  actor_type: 'commercial_profile' as const,
                  actor_commercial_profile_id: businessId,
                }
              : {}),
            duration_seconds: (
              preparedMedia.kind === 'video'
                ? preparedMedia.durationSeconds ?? undefined
                : undefined
            ),
          },
          {
            uri: preparedMedia.uri,
            name: preparedMedia.name,
            mimeType: preparedMedia.mimeType,
          },
        );

        if (preparedMedia.kind === 'video') {
          logStatusVideoDiagnostic({
            traceId: draft.media.traceId?.trim() || 'status-video-unknown',
            stage: 'upload_completed',
            source: draft.media.source || 'unknown',
            name: preparedMedia.name,
            mimeType: preparedMedia.mimeType,
            sizeBytes: preparedMedia.sizeBytes,
            durationSeconds: preparedMedia.durationSeconds,
          });
        }
      } else {
        const normalizedColor = draft.backgroundColor
          .trim()
          .toUpperCase();

        const selectedBackground = (
          statusBackgrounds.find(
            (background) => (
              background.hex_color.toUpperCase()
              === normalizedColor
            ),
          )
          || statusBackgrounds[0]
        );

        if (!selectedBackground) {
          throw new Error(
            'No hay fondos de texto activos disponibles. Inténtalo nuevamente.',
          );
        }

        setStatusPublishingPhase('uploading');

        const textStatusPayload = {
          kind: 'text' as const,
          text_content: draft.textContent.trim(),
          text_background_id: selectedBackground.id,
          caption: draft.caption,
          editor_metadata: draft.editorMetadata,
          image_layers: imageLayers,
          ...(draft.commercialOfferLink
            ? {
                commercial_offer_link: draft.commercialOfferLink,
              }
            : {}),
          ...(isCommercialContext
            ? {
                actor_type: 'commercial_profile' as const,
                actor_commercial_profile_id: businessId,
              }
            : {}),
        };

        if (imageLayers.length > 0) {
          await publishTextStatusWithImageLayers(
            textStatusPayload,
          );
        } else {
          await publishTextStatus(textStatusPayload);
        }
      }

      setCreatingStatus(false);
      setStatusCreationEntryOpen(false);
      setMyStatusesOpen(false);
      setInitialStatusMedia(null);
      setInitialStatusMode('chooser');
      setStatusPublishingPhase('idle');
      setStatusPublishingMessage(null);

      await refreshStatuses();
    } catch (publishError) {
      setStatusPublishingPhase('error');
      setStatusPublishingMessage(
        publishError instanceof Error
          ? publishError.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setPublishingStatus(false);
    }
  };

  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const handleCreateChatCategory = async (draft: {
    name: string; icon: string; color: string;
  }) => {
    if (!activeIdentityId || savingCategory) return;
    setSavingCategory(true);
    try {
      const auth = await getValidSessionCredentials();
      if (!auth || auth.scheme !== 'Bearer') throw new Error('Tu sesión expiró.');
      const response = await createChatCategory(auth, {
        identity_id: activeIdentityId,
        name: draft.name,
        icon: draft.icon,
        color: draft.color,
      });
      setChatCategories((current) => [...current, response.category]);
      setCategoryRefresh((value) => value + 1);
      setCreatingCategory(false);
      if (!returnToAssignment) setActiveCategoryId(response.category.id);
      setReturnToAssignment(false);
    } catch (categoryError) {
      Alert.alert('No fue posible crear la categoría',
        categoryError instanceof Error ? categoryError.message : 'Inténtalo nuevamente.');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteChatCategory = (category: ChatCategoryRecord) => {
    Alert.alert(
      'Eliminar categoría',
      `¿Eliminar "${category.name}"? Los chats y sus mensajes permanecerán intactos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (!activeIdentityId) return;
              setDeletingCategoryId(category.id);
              try {
                const auth = await getValidSessionCredentials();
                if (!auth || auth.scheme !== 'Bearer') throw new Error('Tu sesión expiró.');
                await deleteChatCategory(auth, activeIdentityId, category.id);
                setChatCategories((current) => current.filter((entry) => entry.id !== category.id));
                setCategoryAssignments((current) => Object.fromEntries(
                  Object.entries(current).map(([id, ids]) => [
                    id, ids.filter((categoryId) => categoryId !== category.id),
                  ]),
                ));
                setActiveCategoryId((current) => current === category.id ? null : current);
                setCategoryRefresh((value) => value + 1);
              } catch (categoryError) {
                Alert.alert('No fue posible eliminar la categoría',
                  categoryError instanceof Error ? categoryError.message : 'Inténtalo nuevamente.');
              } finally {
                setDeletingCategoryId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const handleSaveChatCategories = async (categoryIds: string[]) => {
    const chat = assigningChat;
    if (!chat || !activeIdentityId || savingAssignment) return;
    setSavingAssignment(true);
    try {
      const auth = await getValidSessionCredentials();
      if (!auth || auth.scheme !== 'Bearer') throw new Error('Tu sesión expiró.');
      const response = await saveChatConversationCategories(
        auth, activeIdentityId, chat.id, categoryIds,
      );
      setCategoryAssignments((current) => ({
        ...current, [chat.id]: response.category_ids,
      }));
      setCategoryRefresh((value) => value + 1);
      setAssigningChat(null);
    } catch (categoryError) {
      Alert.alert('No fue posible asignar la categoría',
        categoryError instanceof Error ? categoryError.message : 'Inténtalo nuevamente.');
    } finally {
      setSavingAssignment(false);
    }
  };

  const visibleListChats = (isGroupsTab ? groupChats : directChats)
    .filter((chat) => !activeCategoryId
      || categoryIdentityId !== activeIdentityId
      || (categoryAssignments[chat.id] || []).includes(activeCategoryId));

  const categoriesByConversation = useMemo(() => {
    const byId = new Map(chatCategories.map((category) => [category.id, category]));
    const result: Record<string, ChatCategoryRecord[]> = {};
    Object.entries(categoryAssignments).forEach(([conversationId, ids]) => {
      result[conversationId] = ids
        .map((id) => byId.get(id))
        .filter((category): category is ChatCategoryRecord => Boolean(category));
    });
    return result;
  }, [chatCategories, categoryAssignments]);

  const onlineByIdentity = useChatListPresence(
    activeIdentityId,
    visibleListChats,
  );
  const protectionReady = Boolean(
    activeIdentityId
    && protectionLoaded
    && protectionIdentityId === activeIdentityId
    && !protectionError
  );

  const chatsWithLivePresence = visibleListChats.map((chat) => ({
    ...chat,
    isProtected: protectionReady ? chat.isProtected : true,
    lastMessage: protectionReady ? chat.lastMessage : 'Chat protegido',
    unreadCount: protectionReady ? chat.unreadCount : 0,
    online: Boolean(
      protectionReady
      && !chat.isGroup
      && !chat.isAI
      && chat.raw.other_identity_id
      && onlineByIdentity[chat.raw.other_identity_id]
    ),
  }));

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
        {activeIdentityId && categoryIdentityId === activeIdentityId && (
          <ChatCategoryChips
            categories={chatCategories}
            activeCategoryId={activeCategoryId}
            onChange={setActiveCategoryId}
            onCreate={() => {
              setReturnToAssignment(false);
              setCreatingCategory(true);
            }}
            onManage={() => setManagingCategories(true)}
          />
        )}

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

              {protectionError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{protectionError}</Text>
                  <TouchableOpacity
                    onPress={() => setProtectionRefresh((value) => value + 1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.retryText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
              <ChatListView
                aiChat={
                  isGroupsTab || activeCategoryId
                    ? undefined
                    : aiChat && !protectionReady
                      ? {
                          ...aiChat,
                          isProtected: true,
                          lastMessage: 'Chat protegido',
                        }
                      : aiChat
                }
                chats={chatsWithLivePresence}
                categoriesByConversation={categoriesByConversation}
                onEndReached={
                  protectionReady && hasMoreConversations[
                    isGroupsTab ? 'group' : 'direct'
                  ]
                    ? () => {
                        void loadMoreConversations(
                          isGroupsTab ? 'group' : 'direct',
                        );
                      }
                    : undefined
                }
                loadingMore={loadingMore}
                archivedCount={archivedCount}
                archivedLabel={archivedLabel}
                archivedSubtitle={archivedSubtitle}
                onPressArchived={() => {
                  if (!protectionReady) return;
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
                onOpenChat={(chat) => {
                  if (protectionReady) handleChatPress(chat);
                }}
                onOpenMenu={(chat) => {
                  if (protectionReady) setMenuChat(chat);
                }}
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

              )}

              {visibleListChats.length === 0 && !error && !protectionError ? (
                <View style={styles.emptyOverlay}>
                  <Text style={styles.emptyTitle}>
                    {activeCategoryId ? 'Sin chats en esta categoría' : emptyTitle}
                  </Text>

                  <Text style={styles.emptyDescription}>
                    {activeCategoryId
                      ? 'Los chats asignados aparecerán aquí.'
                      : emptyDescription}
                  </Text>
                  {activeCategoryId && hasMoreConversations[isGroupsTab ? 'group' : 'direct'] && (
                    <TouchableOpacity
                      disabled={loadingMore}
                      onPress={() => {
                        void loadMoreConversations(isGroupsTab ? 'group' : 'direct');
                      }}
                    >
                      <Text style={styles.retryText}>
                        {loadingMore ? 'Buscando...' : 'Buscar en más chats'}
                      </Text>
                    </TouchableOpacity>
                  )}
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
        publishingPhase={statusPublishingPhase}
        publishingMessage={statusPublishingMessage}
        commercialBusinessId={
          isCommercialContext
            ? businessId
            : null
        }
        onDismissPublishingError={() => {
          setStatusPublishingPhase('idle');
          setStatusPublishingMessage(null);
        }}
        onPublish={handlePublishStatus}
        onClose={() => {
          if (!publishingStatus) {
            setCreatingStatus(false);
            setInitialStatusMedia(null);
            setInitialStatusMode('chooser');
            setStatusPublishingPhase('idle');
            setStatusPublishingMessage(null);
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
        verifyPin={verifyChatPin}
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

      <ChatCreateMenu
        visible={createMenuOpen}
        onPeople={() => {
          setCreateMenuOpen(false);

          router.push(
            isCommercialContext
              ? {
                  pathname: '/(main)/chat/people',
                  params: {
                    context: 'commercial',
                    businessId,
                    identityId: activeIdentityId || '',
                  },
                }
              : '/(main)/chat/people',
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
        onClose={() => {
          setCreateMenuOpen(false);
        }}
      />

      <GroupAwareChatOptionsSheet
        chat={menuChat}
        identityId={activeIdentityId}
        onDeleteGroupAfterTransfer={deleteConversation}
        isProtected={
          Boolean(menuChat)
          && (
            protectedChatIds.has(menuChat?.id || '')
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
          const chat = menuChat;
          setMenuChat(null);
          if (!chat || !activeIdentityId) return;
          setAssigningChat(chat);
          if (chatCategories.length === 0) {
            setReturnToAssignment(true);
            setCreatingCategory(true);
          }
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

      <AssignCategoryModal
        visible={Boolean(assigningChat) && !creatingCategory}
        chatName={assigningChat?.name}
        categories={chatCategories}
        selectedIds={assigningChat ? categoryAssignments[assigningChat.id] || [] : []}
        saving={savingAssignment}
        onSave={(ids) => { void handleSaveChatCategories(ids); }}
        onCreateCategory={() => {
          setReturnToAssignment(true);
          setCreatingCategory(true);
        }}
        onClose={() => setAssigningChat(null)}
      />
      <CreateCategoryModal
        visible={creatingCategory}
        saving={savingCategory}
        onCreate={(draft) => { void handleCreateChatCategory(draft); }}
        onClose={() => {
          setCreatingCategory(false);
          setReturnToAssignment(false);
        }}
      />
      <ManageChatCategoriesModal
        visible={managingCategories}
        categories={chatCategories}
        deletingId={deletingCategoryId}
        onDelete={handleDeleteChatCategory}
        onClose={() => setManagingCategories(false)}
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
