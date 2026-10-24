import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Info } from 'lucide-react-native';
import { useModuleNav } from '../embedded/EmbeddedNavContext';
import PeopleDiscoveryPanel from '../social/PeopleDiscoveryPanel';
import FollowingContactsPanel from '../social/FollowingContactsPanel';
import ContactsTabs, { ContactsTab } from './ContactsTabs';
import { contactsStyles as styles } from './contactsStyles';

interface ContactsListViewProps {
  onFollowChange?: () => void;
}

export default function ContactsListView({
  onFollowChange,
}: ContactsListViewProps) {
  const router = useModuleNav();
  const [activeTab, setActiveTab] = useState<ContactsTab>('my');

  const openConversation = (conversation: {
    id: string;
    name: string;
    isGroup: boolean;
    isAI: boolean;
    online: boolean;
  }) => {
    router.push({
      pathname: '/(main)/chat/conversation',
      params: {
        id: conversation.id,
        name: conversation.name,
        isGroup: conversation.isGroup ? 'true' : 'false',
        isAi: conversation.isAI ? 'true' : 'false',
        online: conversation.online ? 'true' : 'false',
      },
    });
  };

  return (
    <>
      <ContactsTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'discover' ? (
        <View style={styles.discoverPanel}>
          <View style={styles.privacyNotice}>
            <Info size={16} color={colors.brand.primary} style={styles.noticeIcon} />
            <Text style={styles.noticeText}>
              Solo aparecen usuarios con visibilidad pública en la red. Al seguir
              a alguien, verás sus estados en Chat.
            </Text>
          </View>
          <PeopleDiscoveryPanel
            onFollowChange={onFollowChange}
            onOpenConversation={openConversation}
          />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {activeTab === 'my' ? (
            <FollowingContactsPanel
              onOpenConversation={openConversation}
              onPressDiscover={() => setActiveTab('discover')}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                Registro de llamadas
              </Text>
              <Text style={styles.emptyDesc}>
                El historial de llamadas estará disponible próximamente.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </>
  );
}
