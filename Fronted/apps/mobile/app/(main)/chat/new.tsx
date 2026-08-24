import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronLeft,
  Search,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
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

  const {
    searchUsers,
    createDirectConversation,
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
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    searchText,
    searchUsers,
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

    return results.map((contact) => (
      <TouchableOpacity
        key={contact.id}
        style={styles.contactRow}
        onPress={() => {
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
      </TouchableOpacity>
    ));
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
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
            Nuevo chat
          </Text>

          <View style={styles.headerSpacer} />
        </View>

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

          <ScrollView
            style={styles.listScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionTitle}>
              Usuarios
            </Text>

            {renderSearchState()}

            <View style={styles.bottomGap} />
          </ScrollView>
        </View>
      </View>

      <Modal
        transparent
        visible={submitting}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          // Opening a chat cannot be cancelled safely.
        }}
      >
        <View style={styles.loadingOverlay}>
          <View
            style={styles.loadingCard}
            accessibilityRole="progressbar"
            accessibilityLabel="Abriendo chat"
          >
            <ActivityIndicator
              size="large"
              color={colors.brand.primary}
            />

            <Text style={styles.loadingTitle}>
              Abriendo chat...
            </Text>

            <Text style={styles.loadingSubtitle}>
              Preparando la conversación
            </Text>
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
  listScroll: {
    flex: 1,
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
  bottomGap: {
    height: 100,
  },
  loadingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.36)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    elevation: 8,
    minWidth: 230,
    paddingHorizontal: 28,
    paddingVertical: 26,
    shadowColor: colors.neutral.text,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  loadingTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
  },
  loadingSubtitle: {
    color: colors.neutral.gray600,
    fontSize: 12,
    marginTop: 6,
  },
});
