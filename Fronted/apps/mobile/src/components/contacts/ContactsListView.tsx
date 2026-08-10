import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import {
  Users,
  Globe,
  Info,
  Phone,
  MessageSquare,
  ArrowDownLeft,
  ArrowUpRight,
  PhoneOff,
  Video,
  PhoneCall,
} from 'lucide-react-native';
import { useModuleNav } from '../embedded/EmbeddedNavContext';
import VerifiedBadge from '../VerifiedBadge';
import { ContactItem, CallLogItem, MY_CONTACTS, DISCOVER_CONTACTS, CALL_LOGS } from '../../mocks/contacts';
import CreateContactModal from './CreateContactModal';
import ContactsTabs, { ContactsTab } from './ContactsTabs';
import { contactsStyles as styles } from './contactsStyles';

interface ContactsListViewProps {
  /** Abre el modal de crear contacto (lo dispara la cabecera de la pantalla anfitriona) */
  creating?: boolean;
  onCloseCreate?: () => void;
}

const callIconOf = (type: CallLogItem['type']) => {
  if (type === 'incoming') return <ArrowDownLeft size={14} color={colors.semantic.success} />;
  if (type === 'outgoing') return <ArrowUpRight size={14} color={colors.semantic.info} />;
  return <PhoneOff size={14} color={colors.semantic.error} />;
};

const callLabelOf = (type: CallLogItem['type']) => {
  if (type === 'incoming') return 'Entrante';
  if (type === 'outgoing') return 'Saliente';
  return 'Perdida';
};

/**
 * Lista de contactos con sus pestañas (mis contactos, descubrir red y registro
 * de llamadas). La comparten la pantalla de Contactos y la pestaña Contactos
 * del módulo de Chat.
 */
export default function ContactsListView({ creating = false, onCloseCreate }: ContactsListViewProps) {
  const router = useModuleNav();
  const [activeTab, setActiveTab] = useState<ContactsTab>('my');
  // Re-render after a new contact lands in the mock list
  const [, setContactsTick] = useState(0);

  const items: (ContactItem | CallLogItem)[] =
    activeTab === 'calls' ? CALL_LOGS : activeTab === 'my' ? MY_CONTACTS : DISCOVER_CONTACTS;

  const openCall = (contactName: string, isVideo: boolean) => {
    router.push({
      pathname: '/(main)/chat/call',
      params: { name: contactName, isVideo: isVideo ? 'true' : 'false' },
    });
  };

  const openContact = (contactId: string) => {
    router.push({ pathname: '/(main)/contacts/detail', params: { id: contactId } });
  };

  const openConversation = (contact: ContactItem) => {
    router.push({
      pathname: '/(main)/chat/conversation',
      params: { id: contact.id, name: contact.name, isGroup: 'false', online: 'true' },
    });
  };

  return (
    <>
      <ContactsTabs activeTab={activeTab} onChange={setActiveTab} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'discover' && (
          <View style={styles.privacyNotice}>
            <Info size={16} color={colors.brand.primary} style={styles.noticeIcon} />
            <Text style={styles.noticeText}>
              Solo aparecen en la red empresarial los usuarios de la plataforma que activaron su
              &quot;Visibilidad en la red&quot; desde la sección Perfil.
            </Text>
          </View>
        )}

        {items.length > 0 ? (
          <View style={styles.contactsList}>
            {activeTab === 'calls'
              ? (items as CallLogItem[]).map((log, index) => (
                  <TouchableOpacity
                    key={log.id}
                    style={[styles.contactRow, index < items.length - 1 && styles.rowSeparator]}
                    onPress={() => openContact(log.contactId)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.avatarWrap, { backgroundColor: log.color }]}>
                      <Text style={styles.avatarText}>{log.initials}</Text>
                    </View>

                    <View style={styles.detailsCol}>
                      <View style={styles.nameRow}>
                        <Text style={styles.contactName}>{log.name}</Text>
                        {log.verified && <VerifiedBadge size={13} style={styles.nameBadge} />}
                      </View>
                      <View style={styles.callMetaRow}>
                        {callIconOf(log.type)}
                        <Text
                          style={[styles.callTypeText, log.type === 'missed' && styles.callTypeTextMissed]}
                        >
                          {callLabelOf(log.type)}
                        </Text>
                        <Text style={styles.callMetaDivider}>·</Text>
                        <Text style={styles.callMetaText}>{log.isVideo ? 'Video' : 'Voz'}</Text>
                      </View>
                      <Text style={styles.callTimeText}>
                        {log.time} {log.type !== 'missed' && `(${log.duration})`}
                      </Text>
                    </View>

                    <View style={styles.actionsCol}>
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => openCall(log.name, false)}
                        activeOpacity={0.7}
                      >
                        <PhoneCall size={13} color={colors.brand.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => openCall(log.name, true)}
                        activeOpacity={0.7}
                      >
                        <Video size={13} color={colors.brand.primary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              : (items as ContactItem[]).map((contact, index) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={[styles.contactRow, index < items.length - 1 && styles.rowSeparator]}
                    onPress={() => openContact(contact.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.avatarWrap, { backgroundColor: contact.color }]}>
                      <Text style={styles.avatarText}>{contact.initials}</Text>
                    </View>

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

                    <View style={styles.actionsCol}>
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => openCall(contact.name, false)}
                        activeOpacity={0.7}
                      >
                        <Phone size={13} color={colors.brand.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => openConversation(contact)}
                        activeOpacity={0.7}
                      >
                        <MessageSquare size={13} color={colors.brand.primary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Users size={48} color={colors.neutral.gray400} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyDesc}>Todavía no hay registros en esta pestaña.</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <CreateContactModal
        visible={creating}
        onSave={(contact) => {
          MY_CONTACTS.unshift(contact);
          setContactsTick((t) => t + 1);
          setActiveTab('my');
          onCloseCreate?.();
        }}
        onClose={() => onCloseCreate?.()}
      />
    </>
  );
}
