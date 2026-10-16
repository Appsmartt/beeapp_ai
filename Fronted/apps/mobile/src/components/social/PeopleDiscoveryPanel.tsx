import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
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

import PeopleAvatar from '../chat/PeopleAvatar';
import VerifiedBadge from '../VerifiedBadge';
import {
  useModuleNav,
} from '../embedded/EmbeddedNavContext';
import {
  canOpenDiscoveredPersonProfile,
  getDiscoveredPersonProfileHref,
  getFollowLabel,
  type UnifiedPerson,
} from '../../features/social/peopleDiscovery';
import {
  usePeopleDiscovery,
} from '../../features/social/usePeopleDiscovery';

type PeopleDiscoveryPanelProps = {
  identityId?: string | null;
  onFollowChange?: () => void;
  onOpenConversation: (conversation: {
    id: string;
    name: string;
    isGroup: boolean;
    isAI: boolean;
    online: boolean;
  }) => void;
};

export default function PeopleDiscoveryPanel({
  identityId = null,
  onFollowChange,
  onOpenConversation,
}: PeopleDiscoveryPanelProps) {
  const router = useModuleNav();

  const openPersonProfile = (person: UnifiedPerson) => {
    const href = getDiscoveredPersonProfileHref(person);
    if (!href) {
      return;
    }
    router.push(href);
  };

  const {
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
  } = usePeopleDiscovery({
    identityId,
    onFollowChange,
  });

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

  const renderContent = () => {
    if (!canSearch) {
      return (
        <View style={styles.stateWrap}>
          <Text style={styles.stateTitle}>
            Busca personas
          </Text>
          <Text style={styles.stateText}>
            Escribe al menos 2 caracteres: nombre, correo o teléfono.
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
        renderItem={({ item }) => (
          <PersonRow
            item={item}
            chattingPersonKey={chattingPersonKey}
            followingPersonKey={followingPersonKey}
            onChat={() => {
              void handleStartChat(item, onOpenConversation);
            }}
            onFollow={() => {
              handleFollowPress(item);
            }}
            onOpenProfile={() => {
              openPersonProfile(item);
            }}
          />
        )}
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

  return (
    <>
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
          accessibilityLabel="Buscar personas"
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
                  void confirmFollowAction();
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
    </>
  );
}

function PersonRow({
  item,
  chattingPersonKey,
  followingPersonKey,
  onChat,
  onFollow,
  onOpenProfile,
}: {
  item: UnifiedPerson;
  chattingPersonKey: string | null;
  followingPersonKey: string | null;
  onChat: () => void;
  onFollow: () => void;
  onOpenProfile: () => void;
}) {
  const isChatting = chattingPersonKey === item.key;
  const isFollowing = followingPersonKey === item.key;
  const followLabel = getFollowLabel(item.followState);
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
  const canOpenProfile = canOpenDiscoveredPersonProfile(item);

  return (
    <View style={styles.personRow}>
      <TouchableOpacity
        style={styles.personMain}
        onPress={onOpenProfile}
        disabled={
          !canOpenProfile
          || isChatting
          || isFollowing
        }
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${item.displayName}`}
      >
        <PeopleAvatar
          displayName={item.displayName}
          avatarFileId={item.avatarFileId}
          avatarUrl={item.avatarUrl}
          size={44}
        />
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
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.chatButton,
            !item.identityId ? styles.actionDisabled : null,
          ]}
          onPress={onChat}
          disabled={
            !item.identityId
            || isChatting
            || isFollowing
          }
          activeOpacity={0.75}
          accessibilityLabel={`Iniciar chat con ${item.displayName}`}
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
            followIsMuted ? styles.followButtonMuted : null,
            !item.isAvailable ? styles.actionDisabled : null,
          ]}
          onPress={onFollow}
          disabled={
            isChatting
            || isFollowing
            || !item.isAvailable
          }
          activeOpacity={0.75}
          accessibilityLabel={`${followLabel} a ${item.displayName}`}
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
}

const styles = StyleSheet.create({
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
  personMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  chatButton: {
    alignItems: 'center',
    backgroundColor: '#F3F5FF',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minWidth: 76,
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
    minWidth: 76,
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
  stateTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 43, 67, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  confirmationCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: radii.xl,
    maxWidth: 340,
    padding: 22,
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
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
  },
  confirmationBody: {
    color: colors.neutral.gray600,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  confirmationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: radii.lg,
    flex: 1,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    flex: 1,
    paddingVertical: 12,
  },
  confirmButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
