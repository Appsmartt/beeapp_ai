import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft,
  Users,
  Globe,
  Info,
  Phone,
  MessageSquare,
  UserPlus,
  ArrowDownLeft,
  ArrowUpRight,
  PhoneOff,
  Video,
  PhoneCall,
} from 'lucide-react-native';
import VerifiedBadge from '../../../src/components/VerifiedBadge';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { ContactItem, CallLogItem, MY_CONTACTS, DISCOVER_CONTACTS, CALL_LOGS } from '../../../src/mocks/contacts';
import CreateContactModal from '../../../src/components/contacts/CreateContactModal';
import ContactsTabs, { ContactsTab } from '../../../src/components/contacts/ContactsTabs';
import { contactsStyles as styles } from '../../../src/components/contacts/contactsStyles';


export default function ContactsScreen() {
  const router = useModuleNav();
  const [activeTab, setActiveTab] = useState<ContactsTab>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingContact, setCreatingContact] = useState(false);
  // Re-render after a new contact lands in the mock list
  const [, setContactsTick] = useState(0);

  // Tab Filtering & Query Searches
  const getFilteredItems = () => {
    const query = searchQuery.toLowerCase();

    if (activeTab === 'calls') {
      return CALL_LOGS.filter((c) =>
        c.name.toLowerCase().includes(query)
      );
    }

    const currentList = activeTab === 'my' ? MY_CONTACTS : DISCOVER_CONTACTS;
    return currentList.filter((c) =>
      c.name.toLowerCase().includes(query) ||
      c.profession.toLowerCase().includes(query) ||
      (c.company && c.company.toLowerCase().includes(query)) ||
      c.activity.toLowerCase().includes(query) ||
      c.interests.some((interest) => interest.toLowerCase().includes(query))
    );
  };

  const handleActionPress = (contactName: string, isVideo: boolean) => {
    // Navigate directly to Call screen
    router.push({
      pathname: '/(main)/chat/call',
      params: { name: contactName, isVideo: isVideo ? 'true' : 'false' },
    });
  };

  const handleContactPress = (contactId: string) => {
    router.push({
      pathname: '/(main)/contacts/detail',
      params: { id: contactId },
    });
  };

  const renderCallIcon = (type: CallLogItem['type']) => {
    if (type === 'incoming') {
      return <ArrowDownLeft size={14} color="#10B981" />;
    }
    if (type === 'outgoing') {
      return <ArrowUpRight size={14} color="#3B82F6" />;
    }
    return <PhoneOff size={14} color="#EF4444" />;
  };

  const renderCallLabel = (type: CallLogItem['type']) => {
    if (type === 'incoming') return 'Entrante';
    if (type === 'outgoing') return 'Saliente';
    return 'Perdida';
  };

  const filteredItems = getFilteredItems();

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {router.canGoBack && (
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                <ChevronLeft size={24} color={colors.neutral.text} />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>Contactos</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.7}
            onPress={() => setCreatingContact(true)}
            accessibilityLabel="Crear contacto"
          >
            <UserPlus size={20} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

        <ContactsTabs
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setSearchQuery('');
          }}
        />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Privacy/Notice callout in discover mode */}
          {activeTab === 'discover' && (
            <View style={styles.privacyNotice}>
              <Info size={16} color={colors.brand.primary} style={styles.noticeIcon} />
              <Text style={styles.noticeText}>
                Solo aparecen en la red empresarial los usuarios de la plataforma que activaron su "Visibilidad en la red" desde la sección Perfil.
              </Text>
            </View>
          )}

          {/* Directory / Logs List */}
          {filteredItems.length > 0 ? (
            <View style={styles.contactsList}>
              {activeTab === 'calls' ? (
                // Calls history render
                (filteredItems as CallLogItem[]).map((log, index) => (
                  <TouchableOpacity
                    key={log.id}
                    style={[styles.contactRow, index < filteredItems.length - 1 && styles.rowSeparator]}
                    onPress={() => handleContactPress(log.contactId)}
                    activeOpacity={0.7}
                  >
                    {/* Left Column: Avatar */}
                    <View style={[styles.avatarWrap, { backgroundColor: log.color }]}>
                      <Text style={styles.avatarText}>{log.initials}</Text>
                    </View>

                    {/* Middle Column: Call info */}
                    <View style={styles.detailsCol}>
                      <View style={styles.nameRow}>
                        <Text style={styles.contactName}>{log.name}</Text>
                        {log.verified && <VerifiedBadge size={13} style={styles.nameBadge} />}
                      </View>
                      <View style={styles.callMetaRow}>
                        {renderCallIcon(log.type)}
                        <Text
                          style={[
                            styles.callTypeText,
                            log.type === 'missed' && styles.callTypeTextMissed,
                          ]}
                        >
                          {renderCallLabel(log.type)}
                        </Text>
                        <Text style={styles.callMetaDivider}>•</Text>
                        <Text style={styles.callMetaText}>{log.isVideo ? 'Video' : 'Voz'}</Text>
                      </View>
                      <Text style={styles.callTimeText}>
                        {log.time} {log.type !== 'missed' && `(${log.duration})`}
                      </Text>
                    </View>

                    {/* Right Column: Callback actions */}
                    <View style={styles.actionsCol}>
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => handleActionPress(log.name, false)}
                        activeOpacity={0.7}
                      >
                        <PhoneCall size={13} color={colors.brand.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => handleActionPress(log.name, true)}
                        activeOpacity={0.7}
                      >
                        <Video size={13} color={colors.brand.primary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                // Standard contact list render
                (filteredItems as ContactItem[]).map((contact, index) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={[styles.contactRow, index < filteredItems.length - 1 && styles.rowSeparator]}
                    onPress={() => handleContactPress(contact.id)}
                    activeOpacity={0.7}
                  >
                    {/* Left Column: Avatar */}
                    <View style={[styles.avatarWrap, { backgroundColor: contact.color }]}>
                      <Text style={styles.avatarText}>{contact.initials}</Text>
                    </View>

                    {/* Middle Column: Details */}
                    <View style={styles.detailsCol}>
                      <View style={styles.nameRow}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        {contact.verified && <VerifiedBadge size={13} style={styles.nameBadge} />}
                        {contact.isFavorite && (
                          <View style={styles.favBadge}>
                            <Text style={styles.favBadgeText}>Fav</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.contactSubtitle} numberOfLines={1}>
                        {contact.company ? `${contact.profession} · ${contact.company}` : contact.profession}
                      </Text>
                    </View>

                    {/* Right Column: Quick Call/Chat */}
                    <View style={styles.actionsCol}>
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => handleActionPress(contact.name, false)}
                        activeOpacity={0.7}
                      >
                        <Phone size={13} color={colors.brand.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => {
                          // Redirect to chat
                          router.push({
                            pathname: '/(main)/chat/conversation',
                            params: { id: contact.id, name: contact.name, isGroup: 'false', online: 'true' },
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <MessageSquare size={13} color={colors.brand.primary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : (
            // Empty state
            <View style={styles.emptyState}>
              <Users size={48} color={colors.neutral.gray400} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? `No encontramos registros que coincidan con la búsqueda "${searchQuery}".`
                  : 'Todavía no hay registros en esta pestaña.'}
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Tab Menu bar */}
        <CreateContactModal
          visible={creatingContact}
          onSave={(contact) => {
            MY_CONTACTS.unshift(contact);
            setContactsTick((t) => t + 1);
            setCreatingContact(false);
            setActiveTab('my');
          }}
          onClose={() => setCreatingContact(false)}
        />

        {!router.embedded && <FloatingTabBar activeTab="explore" />}
      </View>
    </ScreenSafeArea>
  );
}

