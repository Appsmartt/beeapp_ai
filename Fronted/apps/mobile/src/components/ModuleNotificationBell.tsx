import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors } from '@beeapp/design-system';
import { Bell, X, Mail, Calendar, Folder, FileText, MessageCircle, Phone, Users } from 'lucide-react-native';
import {
  GENERAL_NOTIFICATIONS,
  CHAT_NOTIFICATIONS,
  TickerItem,
} from '../mocks/tabNotifications';
import { useModuleNav } from './embedded/EmbeddedNavContext';

interface ModuleNotificationBellProps {
  moduleId: 'chat' | 'mail' | 'notes' | 'files' | 'calendar';
}

const KIND_ICONS: Record<string, typeof Bell> = {
  mail: Mail,
  event: Calendar,
  storage: Folder,
  note: FileText,
  doc: Folder,
  message: MessageCircle,
  call: Phone,
  group: Users,
};

export default function ModuleNotificationBell({ moduleId }: ModuleNotificationBellProps) {
  const router = useModuleNav();
  const [modalVisible, setModalVisible] = useState(false);

  const notifications = useMemo(() => {
    const all = [...GENERAL_NOTIFICATIONS, ...CHAT_NOTIFICATIONS];
    return all.filter((item) => item.target.module === moduleId);
  }, [moduleId]);

  const count = notifications.length;

  const handleOpenItem = (item: TickerItem) => {
    setModalVisible(false);
    if (item.target.params) {
      router.push({ pathname: item.target.path, params: item.target.params });
    } else {
      router.push(item.target.path);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.bellBtn}
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
        accessibilityLabel={`Notificaciones de ${moduleId}`}
      >
        <Bell size={20} color={colors.neutral.gray600} />
        {count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.popoverCard}>
                <View style={styles.popoverHeader}>
                  <View style={styles.titleRow}>
                    <Bell size={18} color={colors.brand.primary} />
                    <Text style={styles.popoverTitle}>Notificaciones</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeBtn}
                  >
                    <X size={18} color={colors.neutral.gray500} />
                  </TouchableOpacity>
                </View>

                {count === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>Sin notificaciones nuevas</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
                    {notifications.map((item) => {
                      const IconComp = KIND_ICONS[item.kind] || Bell;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.notiRow}
                          activeOpacity={0.7}
                          onPress={() => handleOpenItem(item)}
                        >
                          <View style={styles.iconCircle}>
                            <IconComp size={16} color={colors.brand.primary} />
                          </View>
                          <View style={styles.textWrap}>
                            <Text style={styles.notiText}>{item.text}</Text>
                            <Text style={styles.notiTime}>{item.time}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    padding: 6,
    borderRadius: 20,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  popoverCard: {
    width: '100%',
    maxWidth: 340,
    maxHeight: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  popoverTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  closeBtn: {
    padding: 4,
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray500,
  },
  listScroll: {
    maxHeight: 280,
    marginTop: 8,
  },
  notiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  notiText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  notiTime: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray500,
    marginTop: 2,
  },
});
