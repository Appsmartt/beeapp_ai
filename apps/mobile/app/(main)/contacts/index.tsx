import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft,
  Search,
  Users,
  Globe,
  Info,
  Phone,
  MessageSquare,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  PhoneOff,
  Video,
  PhoneCall,
} from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { ContactItem, CallLogItem, MY_CONTACTS, DISCOVER_CONTACTS, CALL_LOGS } from '../../../src/mocks/contacts';


export default function ContactsScreen() {
  const router = useModuleNav();
  const [activeTab, setActiveTab] = useState<'my' | 'discover' | 'calls'>('my');
  const [searchQuery, setSearchQuery] = useState('');

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
    <SafeAreaView style={styles.safeArea}>
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
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => alert('Crear contacto nuevo')}>
            <Plus size={20} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

        {/* 3-Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'my' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('my');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <Users size={15} color={activeTab === 'my' ? colors.brand.primary : colors.neutral.gray600} />
            <Text style={[styles.tabBtnText, activeTab === 'my' && styles.tabBtnTextActive]}>
              Mis contactos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'discover' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('discover');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <Globe size={15} color={activeTab === 'discover' ? colors.brand.primary : colors.neutral.gray600} />
            <Text style={[styles.tabBtnText, activeTab === 'discover' && styles.tabBtnTextActive]}>
              Descubrir red
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'calls' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('calls');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <Phone size={15} color={activeTab === 'calls' ? colors.brand.primary : colors.neutral.gray600} />
            <Text style={[styles.tabBtnText, activeTab === 'calls' && styles.tabBtnTextActive]}>
              Llamadas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarBox}>
          <Search size={18} color={colors.neutral.gray500} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'calls'
                ? 'Buscar en historial de llamadas...'
                : activeTab === 'my'
                ? 'Buscar por nombre, cargo, empresa...'
                : 'Buscar por profesión, intereses, rubros...'
            }
            placeholderTextColor={colors.neutral.gray500}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

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
                (filteredItems as CallLogItem[]).map((log) => (
                  <TouchableOpacity
                    key={log.id}
                    style={styles.contactCard}
                    onPress={() => handleContactPress(log.contactId)}
                    activeOpacity={0.7}
                  >
                    {/* Left Column: Avatar */}
                    <View style={[styles.avatarWrap, { backgroundColor: log.color }]}>
                      <Text style={styles.avatarText}>{log.initials}</Text>
                    </View>

                    {/* Middle Column: Call info */}
                    <View style={styles.detailsCol}>
                      <Text style={styles.contactName}>{log.name}</Text>
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
                (filteredItems as ContactItem[]).map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.contactCard}
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
                        {contact.isFavorite && (
                          <View style={styles.favBadge}>
                            <Text style={styles.favBadgeText}>Fav</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.contactProfession}>{contact.profession}</Text>
                      {contact.company && (
                        <Text style={styles.contactCompany}>{contact.company}</Text>
                      )}
                      
                      {/* Tags of interests */}
                      <View style={styles.tagsContainer}>
                        {contact.interests.map((tag, idx) => (
                          <View key={idx} style={styles.tagBadge}>
                            <Text style={styles.tagBadgeText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
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
                No encontramos registros que coincidan con la búsqueda "{searchQuery}".
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Tab Menu bar */}
        {!router.embedded && <FloatingTabBar activeTab="explore" />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  addBtn: {
    padding: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    gap: 4,
    backgroundColor: colors.neutral.gray50,
  },
  tabBtnActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#FBFBFF',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  tabBtnTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral.text,
    paddingVertical: 6,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  privacyNotice: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'flex-start',
  },
  noticeIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: '#6B21A8',
    lineHeight: 15,
    fontWeight: '500',
  },
  contactsList: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  detailsCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  favBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  favBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#D97706',
  },
  contactProfession: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.gray700,
    marginBottom: 2,
  },
  contactCompany: {
    fontSize: 11,
    color: colors.neutral.gray600,
    marginBottom: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tagBadge: {
    backgroundColor: colors.neutral.gray100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 9,
    color: colors.neutral.gray700,
    fontWeight: '500',
  },
  actionsCol: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  actionIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  callTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  callTypeTextMissed: {
    color: '#EF4444',
    fontWeight: '800',
  },
  callMetaDivider: {
    fontSize: 11,
    color: colors.neutral.gray400,
  },
  callMetaText: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '600',
  },
  callTimeText: {
    fontSize: 10,
    color: colors.neutral.gray500,
    marginTop: 4,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 18,
  },
});
