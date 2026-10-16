import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
} from 'react-native';
import type {
  StatusFollowDiscoverItem,
} from '@beeapp/shared-types';

import {
  useChatConversations,
} from '../../hooks/useChat';
import {
  followStatusTarget,
  removeStatusFollow,
  searchStatusFollowTargets,
} from '../../services/statusesService';
import {
  type FollowConfirmation,
  getFollowConfirmation,
  mapSocialTarget,
  type UnifiedPerson,
} from './peopleDiscovery';

type UsePeopleDiscoveryOptions = {
  identityId?: string | null;
  onFollowChange?: () => void;
};

export function usePeopleDiscovery({
  identityId = null,
  onFollowChange,
}: UsePeopleDiscoveryOptions = {}) {
  const {
    createDirectConversation,
  } = useChatConversations({
    autoLoad: false,
    identityId,
  });

  const [query, setQuery] = useState('');
  const [socialResults, setSocialResults] = useState<
    StatusFollowDiscoverItem[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
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

  const updatePersonFollow = useCallback((
    personKey: string,
    followId: string | null,
    followState: UnifiedPerson['followState'],
  ) => {
    setSocialResults((current) => current.map((target) => {
      const targetKey = mapSocialTarget(target)?.key;

      return targetKey === personKey
        ? {
            ...target,
            follow_id: followId,
            follow_state: followState,
          }
        : target;
    }));
  }, []);

  const handleStartChat = useCallback(async (
    person: UnifiedPerson,
    openConversation: (conversation: {
      id: string;
      name: string;
      isGroup: boolean;
      isAI: boolean;
      online: boolean;
    }) => void,
  ) => {
    const identity = person.identityId;

    if (
      !identity
      || chattingPersonKey
      || followingPersonKey
    ) {
      return;
    }

    try {
      setChattingPersonKey(person.key);

      const conversation = await createDirectConversation(
        identity,
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
  }, [
    chattingPersonKey,
    createDirectConversation,
    followingPersonKey,
  ]);

  const handleFollow = useCallback(async (person: UnifiedPerson) => {
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
        target_commercial_profile_id: person.commercialProfileId,
      });

      updatePersonFollow(
        person.key,
        response.follow.id,
        response.follow.state,
      );
      onFollowChange?.();
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
  }, [
    onFollowChange,
    updatePersonFollow,
  ]);

  const handleFollowPress = useCallback((person: UnifiedPerson) => {
    if (followingPersonKey || chattingPersonKey) {
      return;
    }

    const nextConfirmation = getFollowConfirmation(person);

    if (nextConfirmation) {
      setConfirmation(nextConfirmation);
      return;
    }

    void handleFollow(person);
  }, [
    chattingPersonKey,
    followingPersonKey,
    handleFollow,
  ]);

  const confirmFollowAction = useCallback(async () => {
    const followId = confirmation?.person.followId;

    if (!confirmation || !followId) {
      return;
    }

    try {
      setFollowingPersonKey(confirmation.person.key);
      await removeStatusFollow(followId);
      updatePersonFollow(
        confirmation.person.key,
        null,
        null,
      );
      onFollowChange?.();
    } catch (error) {
      Alert.alert(
        'No fue posible actualizar el seguimiento',
        error instanceof Error
          ? error.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setFollowingPersonKey(null);
      setConfirmation(null);
    }
  }, [
    confirmation,
    onFollowChange,
    updatePersonFollow,
  ]);

  return {
    query,
    setQuery,
    canSearch,
    people,
    loading,
    searchError,
    chattingPersonKey,
    followingPersonKey,
    confirmation,
    setConfirmation,
    handleStartChat,
    handleFollowPress,
    confirmFollowAction,
  };
}
