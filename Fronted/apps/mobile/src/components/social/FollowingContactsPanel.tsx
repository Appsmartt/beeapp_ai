import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  MessageCircle,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';
import type {
  StatusFollowListItem,
} from '@beeapp/shared-types';

import PeopleAvatar from '../chat/PeopleAvatar';
import {
  useChatConversations,
} from '../../hooks/useChat';
import {
  loadStatusFollowing,
} from '../../services/statusesService';
import {
  contactsStyles as styles,
} from '../contacts/contactsStyles';

type FollowingContactsPanelProps = {
  onOpenConversation: (conversation: {
    id: string;
    name: string;
    isGroup: boolean;
    isAI: boolean;
    online: boolean;
  }) => void;
  onPressDiscover?: () => void;
};

export default function FollowingContactsPanel({
  onOpenConversation,
  onPressDiscover,
}: FollowingContactsPanelProps) {
  const {
    createDirectConversation,
  } = useChatConversations({
    autoLoad: false,
  });
  const [items, setItems] = useState<StatusFollowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chattingId, setChattingId] = useState<string | null>(null);

  const loadFollowing = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await loadStatusFollowing();
      setItems(response.items);
    } catch (loadError) {
      setItems([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar tus contactos.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFollowing();
  }, [loadFollowing]);

  const handleChat = async (item: StatusFollowListItem) => {
    const identityId = item.target.profile_id
      || item.target.commercial_profile_id;

    if (!identityId || chattingId) {
      return;
    }

    try {
      setChattingId(item.id);
      const conversation = await createDirectConversation(
        identityId,
      );
      onOpenConversation({
        id: conversation.id,
        name: conversation.name,
        isGroup: conversation.isGroup,
        isAI: conversation.isAI,
        online: conversation.online,
      });
    } catch {
      setError('No fue posible abrir el chat.');
    } finally {
      setChattingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator color={colors.brand.primary} />
        <Text style={styles.emptyDesc}>
          Cargando contactos...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyDesc}>{error}</Text>
        <TouchableOpacity
          onPress={() => {
            void loadFollowing();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.retryLink}>
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>
          Aún no sigues a nadie
        </Text>
        <Text style={styles.emptyDesc}>
          Busca personas para seguir sus estados y chatear con ellas.
        </Text>
        {onPressDiscover ? (
          <TouchableOpacity
            style={styles.discoverCta}
            onPress={onPressDiscover}
            activeOpacity={0.8}
          >
            <Text style={styles.discoverCtaText}>
              Buscar personas
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.contactsList}>
      {items.map((item, index) => (
        <View
          key={item.id}
          style={[
            styles.contactRow,
            index < items.length - 1 && styles.rowSeparator,
          ]}
        >
          <PeopleAvatar
            displayName={item.target.display_name}
            avatarFileId={item.target.avatar_file_id}
            avatarUrl={item.target.avatar_url}
            size={44}
          />
          <View style={styles.detailsCol}>
            <Text style={styles.contactName} numberOfLines={1}>
              {item.target.display_name}
            </Text>
            <Text style={styles.contactSubtitle}>
              Sigues sus estados
            </Text>
          </View>
          <TouchableOpacity
            style={styles.actionIconButton}
            onPress={() => {
              void handleChat(item);
            }}
            disabled={chattingId === item.id}
            activeOpacity={0.75}
            accessibilityLabel={`Chat con ${item.target.display_name}`}
          >
            {chattingId === item.id ? (
              <ActivityIndicator
                size="small"
                color={colors.brand.primary}
              />
            ) : (
              <MessageCircle
                size={18}
                color={colors.brand.primary}
              />
            )}
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
