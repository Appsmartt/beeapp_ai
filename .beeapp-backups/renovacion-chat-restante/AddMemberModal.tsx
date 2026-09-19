import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check,
  Search,
  X,
} from 'lucide-react-native';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';

import type {
  GroupMember,
} from '../../mocks/chats';
import {
  MY_CONTACTS,
} from '../../mocks/contacts';
import {
  useChatConversations,
} from '../../hooks/useChat';
import {
  getInitials,
  type ChatUserOption,
} from '../../services/chatService';

interface RealGroupAddMemberModalProps {
  visible: boolean;
  memberIdentityIds: string[];
  onAdd: (
    identityIds: string[],
  ) => Promise<void> | void;
  onClose: () => void;
  memberIds?: never;
}

interface MockCommunityAddMemberModalProps {
  visible: boolean;
  memberIds: string[];
  onAdd: (
    members: GroupMember[],
  ) => void;
  onClose: () => void;
  memberIdentityIds?: never;
}

type AddMemberModalProps =
  | RealGroupAddMemberModalProps
  | MockCommunityAddMemberModalProps;

function isRealGroupProps(
  props: AddMemberModalProps,
): props is RealGroupAddMemberModalProps {
  return 'memberIdentityIds' in props;
}

function RealGroupAddMemberModal({
  visible,
  memberIdentityIds,
  onAdd,
  onClose,
}: RealGroupAddMemberModalProps) {
  const {
    searchUsers,
  } = useChatConversations({
    autoLoad: false,
  });

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    ChatUserOption[]
  >([]);

  const [selectedIds, setSelectedIds] = useState<
    string[]
  >([]);

  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setQuery('');
    setResults([]);
    setSelectedIds([]);
    setSearching(false);
    setSubmitting(false);
    setError(null);
  }, [
    visible,
  ]);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (!visible || normalizedQuery.length < 2) {
      setResults([]);
      setSearching(false);
      setError(null);

      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      setSearching(true);
      setError(null);

      void searchUsers(normalizedQuery)
        .then((users) => {
          if (!cancelled) {
            setResults(users);
          }
        })
        .catch((searchError) => {
          if (cancelled) {
            return;
          }

          setResults([]);
          setError(
            searchError instanceof Error
              ? searchError.message
              : 'No fue posible buscar cuentas.',
          );
        })
        .finally(() => {
          if (!cancelled) {
            setSearching(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    query,
    searchUsers,
    visible,
  ]);

  const availableResults = useMemo(
    () => results.filter(
      (user) => !memberIdentityIds.includes(user.id),
    ),
    [
      memberIdentityIds,
      results,
    ],
  );

  const toggleIdentity = (
    identityId: string,
  ) => {
    if (submitting) {
      return;
    }

    setSelectedIds((current) => (
      current.includes(identityId)
        ? current.filter((id) => id !== identityId)
        : [
            ...current,
            identityId,
          ]
    ));
  };

  const handleAdd = async () => {
    if (!selectedIds.length || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await onAdd(selectedIds);
      onClose();
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : 'No fue posible enviar las invitaciones.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (query.trim().length < 2) {
      return (
        <View style={styles.stateWrap}>
          <Search
            size={22}
            color={colors.neutral.gray500}
          />

          <Text style={styles.stateText}>
            Escribe al menos dos caracteres para buscar
            cuentas privadas o comerciales.
          </Text>
        </View>
      );
    }

    if (searching) {
      return (
        <View style={styles.stateWrap}>
          <ActivityIndicator
            size="small"
            color={colors.brand.primary}
          />

          <Text style={styles.stateText}>
            Buscando cuentas...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateWrap}>
          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      );
    }

    if (availableResults.length === 0) {
      return (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>
            No encontramos cuentas disponibles para invitar.
          </Text>
        </View>
      );
    }

    return availableResults.map((user) => {
      const selected = selectedIds.includes(user.id);

      return (
        <TouchableOpacity
          key={user.id}
          style={styles.row}
          onPress={() => {
            toggleIdentity(user.id);
          }}
          disabled={submitting}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(user.name)}
            </Text>
          </View>

          <View style={styles.rowTexts}>
            <Text
              style={styles.rowName}
              numberOfLines={1}
            >
              {user.name}
            </Text>

            <Text
              style={styles.rowMeta}
              numberOfLines={1}
            >
              {user.occupation
                || user.location
                || 'Cuenta BeeApp'}
            </Text>
          </View>

          <View
            style={[
              styles.selection,
              selected
                ? styles.selectionActive
                : null,
            ]}
          >
            {selected ? (
              <Check
                size={15}
                color={colors.neutral.white}
              />
            ) : null}
          </View>
        </TouchableOpacity>
      );
    });
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          onPress={onClose}
          disabled={submitting}
          activeOpacity={1}
        />

        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.title}>
                Invitar participantes
              </Text>

              <Text style={styles.subtitle}>
                Las personas recibirán una invitación que
                deberán aceptar para unirse.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.7}
              accessibilityLabel="Cerrar"
            >
              <X
                size={20}
                color={colors.neutral.gray600}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Search
              size={17}
              color={colors.neutral.gray500}
            />

            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar cuentas"
              placeholderTextColor={colors.neutral.gray500}
              editable={!submitting}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderContent()}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.addButton,
              (
                selectedIds.length === 0
                || submitting
              )
                ? styles.addButtonDisabled
                : null,
            ]}
            disabled={
              selectedIds.length === 0
              || submitting
            }
            onPress={() => {
              void handleAdd();
            }}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator
                size="small"
                color={colors.neutral.white}
              />
            ) : (
              <Text style={styles.addButtonText}>
                {selectedIds.length === 1
                  ? 'Enviar 1 invitación'
                  : `Enviar ${selectedIds.length} invitaciones`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function MockCommunityAddMemberModal({
  visible,
  memberIds,
  onAdd,
  onClose,
}: MockCommunityAddMemberModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<
    string[]
  >([]);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIds([]);
    }
  }, [
    visible,
  ]);

  const availableContacts = useMemo(() => {
    const text = query.trim().toLowerCase();

    return MY_CONTACTS.filter((contact) => (
      !memberIds.includes(contact.id)
      && (
        text === ''
        || contact.name.toLowerCase().includes(text)
      )
    ));
  }, [
    memberIds,
    query,
  ]);

  const toggleContact = (
    contactId: string,
  ) => {
    setSelectedIds((current) => (
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [
            ...current,
            contactId,
          ]
    ));
  };

  const handleAdd = () => {
    const members: GroupMember[] = MY_CONTACTS
      .filter((contact) => (
        selectedIds.includes(contact.id)
      ))
      .map((contact) => ({
        id: contact.id,
        name: contact.name,
        role: 'member',
        initials: contact.initials,
        color: contact.color,
      }));

    onAdd(members);
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouch}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>
              Agregar miembro
            </Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Cerrar"
            >
              <X
                size={20}
                color={colors.neutral.gray600}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Search
              size={17}
              color={colors.neutral.gray500}
            />

            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar contacto"
              placeholderTextColor={colors.neutral.gray500}
            />
          </View>

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {availableContacts.length === 0 ? (
              <View style={styles.stateWrap}>
                <Text style={styles.stateText}>
                  No hay contactos disponibles para agregar.
                </Text>
              </View>
            ) : (
              availableContacts.map((contact) => {
                const selected = selectedIds.includes(
                  contact.id,
                );

                return (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.row}
                    onPress={() => {
                      toggleContact(contact.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: contact.color,
                        },
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {contact.initials}
                      </Text>
                    </View>

                    <View style={styles.rowTexts}>
                      <Text
                        style={styles.rowName}
                        numberOfLines={1}
                      >
                        {contact.name}
                      </Text>

                      <Text
                        style={styles.rowMeta}
                        numberOfLines={1}
                      >
                        {contact.profession}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.selection,
                        selected
                          ? styles.selectionActive
                          : null,
                      ]}
                    >
                      {selected ? (
                        <Check
                          size={15}
                          color={colors.neutral.white}
                        />
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.addButton,
              selectedIds.length === 0
                ? styles.addButtonDisabled
                : null,
            ]}
            disabled={selectedIds.length === 0}
            onPress={handleAdd}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>
              {selectedIds.length === 1
                ? 'Agregar 1 miembro'
                : `Agregar ${selectedIds.length} miembros`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function AddMemberModal(
  props: AddMemberModalProps,
) {
  if (isRealGroupProps(props)) {
    return <RealGroupAddMemberModal {...props} />;
  }

  return <MockCommunityAddMemberModal {...props} />;
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheetHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.neutral.gray600,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    maxWidth: 270,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    color: colors.neutral.text,
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  list: {
    marginTop: spacing.sm,
    minHeight: 220,
  },
  stateWrap: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  stateText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  avatarText: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  rowTexts: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  rowName: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowMeta: {
    color: colors.neutral.gray600,
    fontSize: 12,
    marginTop: 2,
  },
  selection: {
    alignItems: 'center',
    borderColor: colors.neutral.gray300,
    borderRadius: 11,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  selectionActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 48,
  },
  addButtonDisabled: {
    backgroundColor: colors.neutral.gray400,
  },
  addButtonText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
