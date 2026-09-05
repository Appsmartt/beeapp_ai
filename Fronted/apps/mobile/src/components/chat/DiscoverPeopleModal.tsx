import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  Search,
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

interface DiscoverPeopleModalProps {
  visible: boolean;
  query: string;
  results: StatusFollowDiscoverItem[];
  loading: boolean;
  error: string | null;
  followingTargetKey: string | null;
  onChangeQuery: (value: string) => void;
  onFollow: (
    target: StatusFollowDiscoverItem,
  ) => void;
  onClose: () => void;
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

function getTargetKey(
  target: StatusFollowDiscoverItem,
): string {
  return (
    target.profile_id
    || target.commercial_profile_id
    || target.display_name
  );
}

function getFollowButtonLabel(
  target: StatusFollowDiscoverItem,
): string {
  if (target.follow_state === 'accepted') {
    return 'Siguiendo';
  }

  if (target.follow_state === 'pending') {
    return 'Solicitado';
  }

  return 'Seguir';
}

export default function DiscoverPeopleModal({
  visible,
  query,
  results,
  loading,
  error,
  followingTargetKey,
  onChangeQuery,
  onFollow,
  onClose,
}: DiscoverPeopleModalProps) {
  const normalizedQuery = query.trim();
  const canSearch = normalizedQuery.length >= 2;

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
                    Descubrir personas
                  </Text>
                  <Text style={styles.subtitle}>
                    Encuentra cuentas para seguir sus estados.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                  accessibilityLabel="Cerrar descubrimiento de personas"
                >
                  <X
                    size={20}
                    color={colors.neutral.text}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.searchBox}>
                <Search
                  size={18}
                  color={colors.neutral.gray500}
                />

                <TextInput
                  value={query}
                  onChangeText={onChangeQuery}
                  placeholder="Nombre, correo o teléfono"
                  placeholderTextColor={colors.neutral.gray500}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.searchInput}
                  accessibilityLabel="Buscar personas para seguir"
                />
              </View>

              {!canSearch ? (
                <View style={styles.state}>
                  <View style={styles.stateIcon}>
                    <Search
                      size={22}
                      color={colors.brand.primary}
                    />
                  </View>
                  <Text style={styles.stateTitle}>
                    Busca nuevas personas
                  </Text>
                  <Text style={styles.stateDescription}>
                    Escribe al menos dos caracteres para encontrar
                    perfiles y cuentas comerciales.
                  </Text>
                </View>
              ) : loading ? (
                <View style={styles.state}>
                  <ActivityIndicator
                    size="small"
                    color={colors.brand.primary}
                  />
                  <Text style={styles.stateDescription}>
                    Buscando personas...
                  </Text>
                </View>
              ) : error ? (
                <View style={styles.state}>
                  <Text style={styles.errorText}>
                    {error}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={(item, index) => (
                    item.profile_id
                    || item.commercial_profile_id
                    || `${item.display_name}-${index}`
                  )}
                  renderItem={({ item }) => {
                    const targetKey = getTargetKey(item);
                    const isSubmitting = (
                      followingTargetKey === targetKey
                    );
                    const followLabel = getFollowButtonLabel(
                      item,
                    );
                    const alreadyFollowing = (
                      item.follow_state === 'accepted'
                      || item.follow_state === 'pending'
                    );

                    return (
                      <View style={styles.personRow}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {getInitials(item.display_name)}
                          </Text>
                        </View>

                        <View style={styles.personCopy}>
                          <Text
                            style={styles.personName}
                            numberOfLines={1}
                          >
                            {item.display_name}
                          </Text>
                          <Text style={styles.personType}>
                            {item.actor_type === 'commercial_profile'
                              ? 'Cuenta comercial'
                              : 'Cuenta personal'}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.followButton,
                            alreadyFollowing
                              ? styles.followButtonMuted
                              : null,
                          ]}
                          onPress={() => {
                            if (!alreadyFollowing && !isSubmitting) {
                              onFollow(item);
                            }
                          }}
                          activeOpacity={0.75}
                          disabled={
                            alreadyFollowing
                            || isSubmitting
                          }
                          accessibilityLabel={
                            `${followLabel} a ${item.display_name}`
                          }
                        >
                          {isSubmitting ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.neutral.white}
                            />
                          ) : (
                            <>
                              {!alreadyFollowing ? (
                                <UserPlus
                                  size={14}
                                  color={
                                    colors.neutral.white
                                  }
                                />
                              ) : null}

                              <Text
                                style={[
                                  styles.followButtonText,
                                  alreadyFollowing
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
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.state}>
                      <Text style={styles.stateTitle}>
                        Sin resultados
                      </Text>
                      <Text style={styles.stateDescription}>
                        Prueba con otro nombre, correo o teléfono.
                      </Text>
                    </View>
                  }
                  contentContainerStyle={styles.resultsContent}
                  keyboardShouldPersistTaps="handled"
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
    maxHeight: '82%',
    minHeight: 380,
    paddingBottom: 24,
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
  searchBox: {
    alignItems: 'center',
    backgroundColor: '#F8F6FC',
    borderColor: '#E7DFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 13,
  },
  searchInput: {
    color: colors.neutral.text,
    flex: 1,
    fontSize: 14,
    paddingVertical: 12,
  },
  resultsContent: {
    paddingBottom: 18,
    paddingTop: 12,
  },
  personRow: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 11,
    paddingVertical: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#EEE7FF',
    borderRadius: 22,
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
  },
  personName: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '700',
  },
  personType: {
    color: colors.neutral.gray600,
    fontSize: 11,
    marginTop: 3,
  },
  followButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minWidth: 92,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  followButtonMuted: {
    backgroundColor: '#F1EDFA',
  },
  followButtonText: {
    color: colors.neutral.white,
    fontSize: 11,
    fontWeight: '700',
  },
  followButtonMutedText: {
    color: colors.brand.primary,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  stateIcon: {
    alignItems: 'center',
    backgroundColor: '#F0EAFF',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    marginBottom: 14,
    width: 52,
  },
  stateTitle: {
    color: colors.neutral.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateDescription: {
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
