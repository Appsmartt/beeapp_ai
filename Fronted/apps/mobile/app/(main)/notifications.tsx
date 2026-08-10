import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft,
  Bell,
  Check,
  Trash2,
  Calendar,
  MessageSquare,
  Info,
  CheckCheck,
  Phone,
} from 'lucide-react-native';
import FloatingTabBar from '../../src/components/FloatingTabBar';

interface NotificationItem {
  id: string;
  type: 'message' | 'call' | 'reminder' | 'system';
  title: string;
  description: string;
  time: string;
  dateGroup: 'Hoy' | 'Ayer' | 'Anteriores';
  isRead: boolean;
  targetPath?: string;
  targetParams?: Record<string, string>;
}

export default function NotificationsScreen() {
  const router = useRouter();
  
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [swipeActiveId, setSwipeActiveId] = useState<string | null>(null);

  // Mock push notifications representing system alerts
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      type: 'message',
      title: 'Mensaje nuevo recibido',
      description: 'Carlos Mendoza: ¿Nos vemos a las 3:00 PM para revisar el NDA?',
      time: '10:30 AM',
      dateGroup: 'Hoy',
      isRead: false,
      targetPath: '/(main)/chat/conversation',
      targetParams: { id: '1', name: 'Carlos Mendoza', isGroup: 'false', online: 'true' },
    },
    {
      id: '2',
      type: 'call',
      title: 'Llamada perdida',
      description: 'Eduardo Torres intentó comunicarse contigo hace unos minutos.',
      time: '09:15 AM',
      dateGroup: 'Hoy',
      isRead: false,
    },
    {
      id: '3',
      type: 'reminder',
      title: 'Recordatorio de reunión',
      description: 'Sincronización Semanal BeeApp empieza en 15 minutos (Sala Virtual).',
      time: '13:45',
      dateGroup: 'Hoy',
      isRead: true,
      targetPath: '/(main)/explore',
      targetParams: { section: 'calendar' },
    },
    {
      id: '4',
      type: 'system',
      title: 'Almacenamiento casi lleno',
      description: 'Tu almacenamiento en la nube de BeeApp está al 90% de capacidad.',
      time: 'Ayer',
      dateGroup: 'Ayer',
      isRead: true,
      targetPath: '/(main)/profile/subscription',
    },
    {
      id: '5',
      type: 'message',
      title: 'Mensaje nuevo de grupo',
      description: 'Desarrollador: Se subió el parche de Expo Router a master.',
      time: 'Ayer',
      dateGroup: 'Ayer',
      isRead: false,
      targetPath: '/(main)/chat/conversation',
      targetParams: { id: '2', name: 'Equipo de Desarrollo 🐝', isGroup: 'true', online: 'false' },
    },
    {
      id: '6',
      type: 'system',
      title: 'Renovación de suscripción exitosa',
      description: 'Tu renovación de plan BeeApp Plus fue procesada correctamente.',
      time: '21 Jul',
      dateGroup: 'Anteriores',
      isRead: true,
      targetPath: '/(main)/profile/subscription',
    },
  ]);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    alert('Todas las notificaciones marcadas como leídas.');
  };

  const handleToggleRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
    setSwipeActiveId(null);
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
    setSwipeActiveId(null);
  };

  const handleNotificationPress = (item: NotificationItem) => {
    // Mark as read when clicked
    if (!item.isRead) {
      setNotifications(
        notifications.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
    }
    
    // Navigate if path is provided
    if (item.targetPath) {
      router.push({
        pathname: item.targetPath,
        params: item.targetParams,
      });
    }
  };

  // Filters application
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.isRead;
    if (activeFilter === 'read') return n.isRead;
    return true; // 'all'
  });

  // Group notifications by Date
  const groups: Record<'Hoy' | 'Ayer' | 'Anteriores', NotificationItem[]> = {
    Hoy: filteredNotifications.filter((n) => n.dateGroup === 'Hoy'),
    Ayer: filteredNotifications.filter((n) => n.dateGroup === 'Ayer'),
    Anteriores: filteredNotifications.filter((n) => n.dateGroup === 'Anteriores'),
  };

  const renderIcon = (type: NotificationItem['type']) => {
    const size = 16;
    switch (type) {
      case 'message':
        return <MessageSquare size={size} color={colors.neutral.gray600} />;
      case 'call':
        return <Phone size={size} color={colors.neutral.gray600} />;
      case 'reminder':
        return <Calendar size={size} color={colors.neutral.gray600} />;
      default:
        return <Info size={size} color={colors.neutral.gray600} />;
    }
  };

  const renderIconBg = (type: NotificationItem['type']) => {
    return colors.neutral.gray100;
  };

  const hasNotifications = filteredNotifications.length > 0;

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeftCol}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <ChevronLeft size={24} color={colors.neutral.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notificaciones</Text>
          </View>
          {hasNotifications && (
            <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
              <Text style={styles.markReadAllBtn}>Marcar leídas</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips Horizontal list - Simplified to Todas / No leídas / Leídas */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            {[
              { id: 'all', label: 'Todas' },
              { id: 'unread', label: 'No leídas' },
              { id: 'read', label: 'Leídas' },
            ].map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => {
                    setActiveFilter(filter.id as any);
                    setSwipeActiveId(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List of Notifications */}
        {hasNotifications ? (
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {(['Hoy', 'Ayer', 'Anteriores'] as const).map((group) => {
              const groupItems = groups[group];
              if (groupItems.length === 0) return null;

              return (
                <View key={group}>
                  <Text style={styles.dateGroupHeader}>{group}</Text>
                  <View style={styles.groupContainer}>
                    {groupItems.map((item) => {
                      const isSwipeActive = swipeActiveId === item.id;
                      return (
                        <View key={item.id} style={styles.itemWrapper}>
                          {/* Main Row layout */}
                          <TouchableOpacity
                            style={[
                              styles.itemRow,
                              !item.isRead && styles.itemRowUnread,
                            ]}
                            onPress={() => handleNotificationPress(item)}
                            onLongPress={() => setSwipeActiveId(isSwipeActive ? null : item.id)}
                            activeOpacity={0.7}
                          >
                            {/* Icon badge */}
                            <View style={[styles.iconWrap, { backgroundColor: renderIconBg(item.type) }]}>
                              {renderIcon(item.type)}
                            </View>

                            {/* Details text */}
                            <View style={styles.detailsCol}>
                              <View style={styles.titleTimeRow}>
                                <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]} numberOfLines={1}>
                                  {item.title}
                                </Text>
                                <Text style={styles.itemTime}>{item.time}</Text>
                              </View>
                              <Text style={styles.itemDescription} numberOfLines={2}>
                                {item.description}
                              </Text>
                            </View>

                            {/* Unread dot indicator */}
                            {!item.isRead && <View style={styles.unreadDot} />}
                          </TouchableOpacity>

                          {/* Inline swipe action buttons simulation (shown on longpress or toggle) */}
                          {isSwipeActive && (
                            <View style={styles.actionsOverlay}>
                              <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: colors.neutral.gray100 }]}
                                onPress={() => handleToggleRead(item.id)}
                                activeOpacity={0.8}
                              >
                                {item.isRead ? (
                                  <Check size={16} color={colors.neutral.gray600} />
                                ) : (
                                  <CheckCheck size={16} color={colors.brand.primary} />
                                )}
                                <Text style={styles.actionBtnText}>{item.isRead ? 'No leído' : 'Leído'}</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: colors.semantic.error + '15' }]}
                                onPress={() => handleDelete(item.id)}
                                activeOpacity={0.8}
                              >
                                <Trash2 size={16} color={colors.semantic.error} />
                                <Text style={[styles.actionBtnText, { color: colors.semantic.error }]}>Eliminar</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
            <View style={{ height: 100 }} />
          </ScrollView>
        ) : (
          // Empty State Layout
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Bell size={40} color={colors.neutral.gray500} />
            </View>
            <Text style={styles.emptyTitle}>Sin Alertas Push</Text>
            <Text style={styles.emptyDesc}>
              No tienes notificaciones del sistema registradas en este momento.
            </Text>
          </View>
        )}

        {/* Tab Menu bar */}
        <FloatingTabBar activeTab="home" />
      </View>
    </ScreenSafeArea>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  markReadAllBtn: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  filtersContainer: {
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  filterChipActive: {
    backgroundColor: colors.brand.primary + '15',
    borderColor: colors.brand.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  filterChipTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  scrollList: {
    flex: 1,
  },
  dateGroupHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  groupContainer: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  itemWrapper: {
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.neutral.white,
  },
  itemRowUnread: {
    backgroundColor: colors.brand.primary + '08', // Subtle purple brand highlight
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  detailsCol: {
    flex: 1,
  },
  titleTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    flex: 1,
    marginRight: 8,
  },
  itemTitleUnread: {
    fontWeight: '700',
    color: colors.brand.primary,
  },
  itemTime: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  itemDescription: {
    fontSize: 12,
    color: colors.neutral.gray700,
    lineHeight: 16,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand.primary,
    marginLeft: 10,
  },
  actionsOverlay: {
    flexDirection: 'row',
    height: '100%',
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    width: 140,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 9,
    fontWeight: '400',
    color: colors.neutral.text,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 18,
  },
});
