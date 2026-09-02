import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  Check,
  Clock3,
  Inbox,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';
import type {
  ChatGroupInvite,
  StatusFollowListItem,
} from '@beeapp/shared-types';

export type SocialActivityTab =
  | 'invites'
  | 'requests'
  | 'followers';

interface SocialActivitySheetProps {
  visible: boolean;
  activeTab: SocialActivityTab;
  invites: ChatGroupInvite[];
  requests: StatusFollowListItem[];
  followers: StatusFollowListItem[];
  loading: boolean;
  error: string | null;
  actingId: string | null;
  onChangeTab: (tab: SocialActivityTab) => void;
  onAcceptInvite: (invite: ChatGroupInvite) => void;
  onRejectInvite: (invite: ChatGroupInvite) => void;
  onAcceptRequest: (request: StatusFollowListItem) => void;
  onRejectRequest: (request: StatusFollowListItem) => void;
  onClose: () => void;
}

const TABS: Array<{
  id: SocialActivityTab;
  label: string;
}> = [
  {
    id: 'invites',
    label: 'Invitaciones',
  },
  {
    id: 'requests',
    label: 'Solicitudes',
  },
  {
    id: 'followers',
    label: 'Seguidores',
  },
];

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

function getInviteGroupName(invite: ChatGroupInvite): string {
  return (
    invite.conversation?.name?.trim()
    || 'Grupo BeeApp'
  );
}

function getInviteSenderName(invite: ChatGroupInvite): string {
  return (
    invite.invited_by_identity?.display_name?.trim()
    || 'Un usuario'
  );
}

function getFollowersTitle(
  activeTab: SocialActivityTab,
): string {
  if (activeTab === 'invites') {
    return 'Invitaciones a grupos';
  }

  if (activeTab === 'requests') {
    return 'Solicitudes de seguimiento';
  }

  return 'Tus seguidores';
}

function getEmptyCopy(
  activeTab: SocialActivityTab,
): {
  title: string;
  description: string;
} {
  if (activeTab === 'invites') {
    return {
      title: 'No tienes invitaciones pendientes',
      description: (
        'Cuando alguien te invite a un grupo, aparecerá aquí.'
      ),
    };
  }

  if (activeTab === 'requests') {
    return {
      title: 'No tienes solicitudes pendientes',
      description: (
        'Las solicitudes para seguir tu perfil aparecerán aquí.'
      ),
    };
  }

  return {
    title: 'Aún no tienes seguidores',
    description: (
      'Comparte estados y descubre personas para conectar.'
    ),
  };
}

export default function SocialActivitySheet({
  visible,
  activeTab,
  invites,
  requests,
  followers,
  loading,
  error,
  actingId,
  onChangeTab,
  onAcceptInvite,
  onRejectInvite,
  onAcceptRequest,
  onRejectRequest,
  onClose,
}: SocialActivitySheetProps) {
  const emptyCopy = getEmptyCopy(activeTab);

  const renderInvite = ({
    item,
  }: {
    item: ChatGroupInvite;
  }) => {
    const isActing = actingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.groupAvatar}>
          <Users
            size={20}
            color={colors.brand.primary}
          />
        </View>

        <View style={styles.copy}>
          <Text style={styles.name} numberOfLines={1}>
            {getInviteGroupName(item)}
          </Text>
          <Text style={styles.description}>
            {getInviteSenderName(item)} te invitó a un grupo.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isActing ? styles.buttonDisabled : null,
              ]}
              onPress={() => onRejectInvite(item)}
              disabled={isActing}
              activeOpacity={0.75}
              accessibilityLabel={
                `Rechazar invitación a ${getInviteGroupName(item)}`
              }
            >
              <Text style={styles.secondaryText}>
                Rechazar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                isActing ? styles.buttonDisabled : null,
              ]}
              onPress={() => onAcceptInvite(item)}
              disabled={isActing}
              activeOpacity={0.75}
              accessibilityLabel={
                `Aceptar invitación a ${getInviteGroupName(item)}`
              }
            >
              {isActing ? (
                <ActivityIndicator
                  size="small"
                  color={colors.neutral.white}
                />
              ) : (
                <>
                  <Check
                    size={14}
                    color={colors.neutral.white}
                  />
                  <Text style={styles.primaryText}>
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

  const renderRequest = ({
    item,
  }: {
    item: StatusFollowListItem;
  }) => {
    const isActing = actingId === item.id;
    const name = item.target.display_name;

    return (
      <View style={styles.card}>
        <View style={styles.personAvatar}>
          <Text style={styles.avatarText}>
            {getInitials(name)}
          </Text>
        </View>

        <View style={styles.copy}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.description}>
            Quiere seguir tus estados.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isActing ? styles.buttonDisabled : null,
              ]}
              onPress={() => onRejectRequest(item)}
              disabled={isActing}
              activeOpacity={0.75}
              accessibilityLabel={
                `Rechazar solicitud de ${name}`
              }
            >
              <Text style={styles.secondaryText}>
                Rechazar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                isActing ? styles.buttonDisabled : null,
              ]}
              onPress={() => onAcceptRequest(item)}
              disabled={isActing}
              activeOpacity={0.75}
              accessibilityLabel={
                `Aceptar solicitud de ${name}`
              }
            >
              {isActing ? (
                <ActivityIndicator
                  size="small"
                  color={colors.neutral.white}
                />
              ) : (
                <>
                  <Check
                    size={14}
                    color={colors.neutral.white}
                  />
                  <Text style={styles.primaryText}>
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

  const renderFollower = ({
    item,
  }: {
    item: StatusFollowListItem;
  }) => {
    const name = item.target.display_name;

    return (
      <View style={styles.followerRow}>
        <View style={styles.personAvatar}>
          <Text style={styles.avatarText}>
            {getInitials(name)}
          </Text>
        </View>

        <View style={styles.copy}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.description}>
            {item.target.actor_type === 'commercial_profile'
              ? 'Cuenta comercial'
              : 'Sigue tus estados'}
          </Text>
        </View>

        <UserCheck
          size={18}
          color={colors.brand.primary}
        />
      </View>
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>
                    Actividad social
                  </Text>
                  <Text style={styles.subtitle}>
                    {getFollowersTitle(activeTab)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                  accessibilityLabel="Cerrar actividad social"
                >
                  <X
                    size={20}
                    color={colors.neutral.text}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.tabs}>
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;

                  return (
                    <TouchableOpacity
                      key={tab.id}
                      style={[
                        styles.tab,
                        isActive ? styles.tabActive : null,
                      ]}
                      onPress={() => onChangeTab(tab.id)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Ver ${tab.label.toLowerCase()}`}
                    >
                      <Text
                        style={[
                          styles.tabText,
                          isActive
                            ? styles.tabTextActive
                            : null,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {loading ? (
                <View style={styles.state}>
                  <ActivityIndicator
                    size="small"
                    color={colors.brand.primary}
                  />
                  <Text style={styles.stateText}>
                    Cargando actividad...
                  </Text>
                </View>
              ) : error ? (
                <View style={styles.state}>
                  <Text style={styles.errorText}>
                    {error}
                  </Text>
                </View>
              ) : activeTab === 'invites' ? (
                <FlatList<ChatGroupInvite>
                  data={invites}
                  keyExtractor={(item) => item.id}
                  renderItem={renderInvite}
                  ListEmptyComponent={
                    <View style={styles.state}>
                      <View style={styles.emptyIcon}>
                        <Inbox
                          size={24}
                          color={colors.brand.primary}
                        />
                      </View>
                      <Text style={styles.emptyTitle}>
                        {emptyCopy.title}
                      </Text>
                      <Text style={styles.stateText}>
                        {emptyCopy.description}
                      </Text>
                    </View>
                  }
                  contentContainerStyle={styles.content}
                />
              ) : activeTab === 'requests' ? (
                <FlatList<StatusFollowListItem>
                  data={requests}
                  keyExtractor={(item) => item.id}
                  renderItem={renderRequest}
                  ListEmptyComponent={
                    <View style={styles.state}>
                      <View style={styles.emptyIcon}>
                        <Clock3
                          size={24}
                          color={colors.brand.primary}
                        />
                      </View>
                      <Text style={styles.emptyTitle}>
                        {emptyCopy.title}
                      </Text>
                      <Text style={styles.stateText}>
                        {emptyCopy.description}
                      </Text>
                    </View>
                  }
                  contentContainerStyle={styles.content}
                />
              ) : (
                <FlatList<StatusFollowListItem>
                  data={followers}
                  keyExtractor={(item) => item.id}
                  renderItem={renderFollower}
                  ListEmptyComponent={
                    <View style={styles.state}>
                      <View style={styles.emptyIcon}>
                        <Users
                          size={24}
                          color={colors.brand.primary}
                        />
                      </View>
                      <Text style={styles.emptyTitle}>
                        {emptyCopy.title}
                      </Text>
                      <Text style={styles.stateText}>
                        {emptyCopy.description}
                      </Text>
                    </View>
                  }
                  contentContainerStyle={styles.content}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(30, 16, 60, 0.34)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '84%',
    minHeight: 420,
    paddingBottom: 22,
    paddingHorizontal: 20,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: '#DCD3EE',
    borderRadius: 3,
    height: 5,
    marginBottom: 16,
    marginTop: 10,
    width: 44,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.neutral.text,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.neutral.gray600,
    fontSize: 12,
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  tabs: {
    backgroundColor: '#F6F3FB',
    borderRadius: 14,
    flexDirection: 'row',
    marginTop: 18,
    padding: 3,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 11,
    flex: 1,
    paddingVertical: 9,
  },
  tabActive: {
    backgroundColor: colors.neutral.white,
    elevation: 2,
  },
  tabText: {
    color: colors.neutral.gray600,
    fontSize: 11,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.brand.primary,
    fontWeight: '800',
  },
  content: {
    flexGrow: 1,
    paddingBottom: 12,
    paddingTop: 12,
  },
  card: {
    alignItems: 'flex-start',
    backgroundColor: '#FBFAFD',
    borderColor: '#ECE6F6',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 12,
  },
  groupAvatar: {
    alignItems: 'center',
    backgroundColor: '#EEE7FF',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  personAvatar: {
    alignItems: 'center',
    backgroundColor: '#E9F5FF',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  copy: {
    flex: 1,
  },
  name: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '800',
  },
  description: {
    color: colors.neutral.gray600,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 11,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minWidth: 86,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderColor: '#DED6EA',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minWidth: 82,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  primaryText: {
    color: colors.neutral.white,
    fontSize: 11,
    fontWeight: '800',
  },
  secondaryText: {
    color: colors.neutral.gray700,
    fontSize: 11,
    fontWeight: '700',
  },
  followerRow: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 42,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#F0EAFF',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    marginBottom: 14,
    width: 52,
  },
  emptyTitle: {
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
});
