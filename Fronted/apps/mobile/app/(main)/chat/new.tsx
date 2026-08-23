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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Search,
  Users,
  X,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';
import VerifiedBadge from '../../../src/components/VerifiedBadge';

import {
  useChatConversations,
} from '../../../src/hooks/useChat';

import type {
  ChatUserOption,
} from '../../../src/services/chatService';

export default function NewChatScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const {
    searchUsers,
    createDirectConversation,
    createGroupConversation,
  } = useChatConversations({
    autoLoad: false,
  });

  const [searchText, setSearchText] =
    useState('');

  const [results, setResults] =
    useState<ChatUserOption[]>([]);

  const [searching, setSearching] =
    useState(false);

  const [searchError, setSearchError] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [isCreatingGroup, setIsCreatingGroup] =
    useState(params.mode === 'group');

  const [selectedContacts, setSelectedContacts] =
    useState<ChatUserOption[]>([]);

  const [groupStep, setGroupStep] =
    useState(1);

  const [groupName, setGroupName] =
    useState('');

  const [groupDesc, setGroupDesc] =
    useState('');

  useEffect(() => {
    const normalizedQuery = searchText.trim();

    if (normalizedQuery.length < 2) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      setSearching(true);
      setSearchError(null);

      void searchUsers(normalizedQuery)
        .then((users) => {
          if (!cancelled) {
            setResults(users);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setResults([]);
            setSearchError(
              error instanceof Error
                ? error.message
                : 'No fue posible buscar usuarios.',
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearching(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    searchText,
    searchUsers,
  ]);

  const selectedIds = useMemo(
    () => selectedContacts.map(
      (contact) => contact.id,
    ),
    [selectedContacts],
  );

  const toggleSelectedContact = (
    contact: ChatUserOption,
  ) => {
    setSelectedContacts((currentContacts) => {
      const isSelected = currentContacts.some(
        (item) => item.id === contact.id,
      );

      return isSelected
        ? currentContacts.filter(
            (item) => item.id !== contact.id,
          )
        : [
            ...currentContacts,
            contact,
          ];
    });
  };

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
        isGroup: conversation.isGroup
          ? 'true'
          : 'false',
        isAi: conversation.isAI
          ? 'true'
          : 'false',
        online: conversation.online
          ? 'true'
          : 'false',
      },
    });
  };

  const handleDirectChat = async (
    contact: ChatUserOption,
  ) => {
    if (submitting) {
      return;
    }

    try {
      setSubmitting(true);

      const conversation = await createDirectConversation(
        contact.id,
      );

      openConversation({
        id: conversation.id,
        name: conversation.name,
        isGroup: conversation.isGroup,
        isAI: conversation.isAI,
        online: conversation.online,
      });
    } catch (createError) {
      Alert.alert(
        'No fue posible crear el chat',
        createError instanceof Error
          ? createError.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGroupContactPress = (
    contact: ChatUserOption,
  ) => {
    if (submitting) {
      return;
    }

    toggleSelectedContact(contact);
  };

  const handleNextStep = () => {
    if (selectedContacts.length === 0) {
      Alert.alert(
        'Selecciona participantes',
        'Selecciona al menos un participante.',
      );

      return;
    }

    setGroupStep(2);
  };

  const handleCreateGroup = async () => {
    const normalizedName = groupName.trim();

    if (!normalizedName) {
      Alert.alert(
        'Nombre requerido',
        'Ingresa el nombre del grupo.',
      );

      return;
    }

    if (selectedIds.length === 0) {
      Alert.alert(
        'Participantes requeridos',
        'Selecciona al menos un participante.',
      );

      return;
    }

    try {
      setSubmitting(true);

      const conversation = await createGroupConversation({
        name: normalizedName,
        description: groupDesc.trim(),
        participantIds: selectedIds,
      });

      openConversation({
        id: conversation.id,
        name: conversation.name,
        isGroup: true,
        isAI: false,
        online: false,
      });
    } catch (createError) {
      Alert.alert(
        'No fue posible crear el grupo',
        createError instanceof Error
          ? createError.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSelected = (
    contactId: string,
  ) => {
    setSelectedContacts((currentContacts) => (
      currentContacts.filter(
        (contact) => contact.id !== contactId,
      )
    ));
  };

  const renderSearchState = () => {
    if (searching) {
      return (
        <View style={styles.stateWrap}>
          <ActivityIndicator
            size="small"
            color={colors.brand.primary}
          />

          <Text style={styles.stateText}>
            Buscando usuarios...
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

    if (searchText.trim().length < 2) {
      return (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>
            Escribe al menos dos caracteres para buscar usuarios de BeeApp.
          </Text>
        </View>
      );
    }

    if (results.length === 0) {
      return (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>
            No encontramos usuarios con esa búsqueda.
          </Text>
        </View>
      );
    }

    return results.map((contact) => {
      const isSelected = selectedIds.includes(
        contact.id,
      );

      return (
        <TouchableOpacity
          key={contact.id}
          style={styles.contactRow}
          onPress={() => {
            if (isCreatingGroup) {
              handleGroupContactPress(contact);
              return;
            }

            void handleDirectChat(contact);
          }}
          activeOpacity={0.7}
          disabled={submitting}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {contact.initials}
            </Text>
          </View>

          <View style={styles.contactDetails}>
            <View style={styles.contactNameRow}>
              <Text style={styles.contactName}>
                {contact.name}
              </Text>

              {contact.verified ? (
                <VerifiedBadge size={13} />
              ) : null}
            </View>

            <Text
              style={styles.contactStatus}
              numberOfLines={1}
            >
              {contact.occupation
                || contact.location
                || (
                  contact.online
                    ? 'En línea'
                    : 'Usuario BeeApp'
                )}
            </Text>
          </View>

          {isCreatingGroup ? (
            <View
              style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected,
              ]}
            >
              {isSelected ? (
                <Check
                  size={12}
                  color={colors.neutral.white}
                />
              ) : null}
            </View>
          ) : null}
        </TouchableOpacity>
      );
    });
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (
                isCreatingGroup
                && groupStep === 2
              ) {
                setGroupStep(1);
                return;
              }

              router.back();
            }}
            style={styles.backBtn}
            activeOpacity={0.7}
            disabled={submitting}
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {isCreatingGroup
              ? (
                  groupStep === 1
                    ? 'Añadir participantes'
                    : 'Nuevo grupo'
                )
              : 'Nuevo chat'}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {isCreatingGroup && groupStep === 2 ? (
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.avatarSetupSection}>
              <View style={styles.groupAvatarBig}>
                <Users
                  size={32}
                  color={colors.neutral.gray600}
                />
              </View>

              <Text style={styles.avatarHint}>
                La foto del grupo podrá configurarse próximamente.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Nombre del grupo *
              </Text>

              <TextInput
                style={styles.inputField}
                placeholder="Ej. Proyecto Alfa"
                placeholderTextColor={
                  colors.neutral.gray500
                }
                value={groupName}
                onChangeText={setGroupName}
                editable={!submitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Descripción
              </Text>

              <TextInput
                style={[
                  styles.inputField,
                  styles.multilineInput,
                ]}
                placeholder="Describe brevemente el propósito del grupo..."
                placeholderTextColor={
                  colors.neutral.gray500
                }
                multiline
                numberOfLines={3}
                value={groupDesc}
                onChangeText={setGroupDesc}
                editable={!submitting}
              />
            </View>

            <Text style={styles.selectedCountText}>
              Participantes seleccionados ({selectedContacts.length})
            </Text>

            <View style={styles.chipsWrap}>
              {selectedContacts.map((contact) => (
                <View
                  key={contact.id}
                  style={styles.chipMini}
                >
                  <Text style={styles.chipMiniText}>
                    {contact.name.split(' ')[0]}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                submitting && styles.primaryButtonDisabled,
              ]}
              onPress={() => {
                void handleCreateGroup();
              }}
              activeOpacity={0.8}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator
                  color={colors.neutral.white}
                />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Crear grupo
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={styles.selectionContainer}>
            <View style={styles.searchBar}>
              <Search
                size={18}
                color={colors.neutral.gray500}
                style={styles.searchIcon}
              />

              <TextInput
                style={styles.searchInput}
                placeholder="Buscar usuarios de BeeApp..."
                placeholderTextColor={
                  colors.neutral.gray500
                }
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
              />
            </View>

            {isCreatingGroup
            && selectedContacts.length > 0 ? (
              <View style={styles.selectedChipsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={
                    styles.chipsScroll
                  }
                >
                  {selectedContacts.map((contact) => (
                    <View
                      key={contact.id}
                      style={styles.chip}
                    >
                      <View style={styles.chipAvatar}>
                        <Text style={styles.chipAvatarText}>
                          {contact.initials}
                        </Text>
                      </View>

                      <Text
                        style={styles.chipName}
                        numberOfLines={1}
                      >
                        {contact.name.split(' ')[0]}
                      </Text>

                      <TouchableOpacity
                        onPress={() => {
                          handleRemoveSelected(contact.id);
                        }}
                        style={styles.chipRemove}
                        disabled={submitting}
                      >
                        <X
                          size={10}
                          color={colors.neutral.gray600}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <ScrollView
              style={styles.listScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {!isCreatingGroup ? (
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => {
                    setIsCreatingGroup(true);
                    setSelectedContacts([]);
                    setGroupStep(1);
                  }}
                  activeOpacity={0.7}
                  disabled={submitting}
                >
                  <View style={styles.optionIconBadge}>
                    <Users
                      size={18}
                      color={colors.brand.primary}
                    />
                  </View>

                  <Text style={styles.optionText}>
                    Nuevo grupo
                  </Text>
                </TouchableOpacity>
              ) : null}

              <Text style={styles.sectionTitle}>
                Usuarios
              </Text>

              {renderSearchState()}

              <View style={styles.bottomGap} />
            </ScrollView>

            {isCreatingGroup
            && selectedContacts.length > 0 ? (
              <TouchableOpacity
                style={styles.fabNext}
                onPress={handleNextStep}
                activeOpacity={0.8}
                disabled={submitting}
              >
                <ArrowRight
                  size={22}
                  color={colors.neutral.white}
                />
              </TouchableOpacity>
            ) : null}
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 32,
  },
  selectionContainer: {
    flex: 1,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  searchIcon: {
    left: 32,
    position: 'absolute',
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.neutral.text,
    flex: 1,
    fontSize: 14,
    height: 42,
    paddingLeft: 38,
    paddingRight: 16,
  },
  selectedChipsContainer: {
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  chipsScroll: {
    gap: 8,
    paddingHorizontal: 20,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  chipAvatar: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    marginRight: 6,
    width: 20,
  },
  chipAvatarText: {
    color: colors.neutral.white,
    fontSize: 8,
    fontWeight: '800',
  },
  chipName: {
    color: colors.neutral.text,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  chipRemove: {
    backgroundColor: colors.neutral.gray200,
    borderRadius: 8,
    padding: 2,
  },
  listScroll: {
    flex: 1,
  },
  optionRow: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionIconBadge: {
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    marginRight: 14,
    width: 36,
  },
  optionText: {
    color: colors.brand.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.neutral.gray600,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginHorizontal: 20,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  stateWrap: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 30,
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
  contactRow: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatarCircle: {
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginRight: 14,
    width: 40,
  },
  avatarText: {
    color: colors.brand.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  contactDetails: {
    flex: 1,
  },
  contactNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  contactName: {
    color: colors.neutral.text,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  contactStatus: {
    color: colors.neutral.gray600,
    fontSize: 11,
    marginTop: 2,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.neutral.gray300,
    borderRadius: 6,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkboxSelected: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  fabNext: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 28,
    bottom: 24,
    elevation: 6,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    shadowColor: colors.brand.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: 56,
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  avatarSetupSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  groupAvatarBig: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
    borderRadius: 24,
    borderWidth: 1.5,
    height: 80,
    justifyContent: 'center',
    marginBottom: 12,
    width: 80,
  },
  avatarHint: {
    color: colors.neutral.gray600,
    fontSize: 11,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: colors.neutral.gray700,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputField: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectedCountText: {
    color: colors.neutral.gray600,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  chipMini: {
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipMiniText: {
    color: colors.neutral.text,
    fontSize: 12,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    elevation: 4,
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: colors.brand.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bottomGap: {
    height: 100,
  },
});
