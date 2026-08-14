import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronLeft,
  FileText,
  Folder,
  Info,
  Share2,
  Trash2,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@beeapp/api-client';
import type {
  AppNotification,
} from '@beeapp/shared-types';

import FloatingTabBar from '../../src/components/FloatingTabBar';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import {
  getValidSessionCredentials,
} from '../../src/services/authSession';


type NotificationFilter =
  | 'all'
  | 'unread'
  | 'read';

type DateGroup =
  | 'Hoy'
  | 'Ayer'
  | 'Anteriores';


function getDateGroup(
  createdAt: string,
): DateGroup {
  const date = new Date(createdAt);
  const today = new Date();

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(
    yesterdayStart.getDate() - 1,
  );

  if (date >= todayStart) {
    return 'Hoy';
  }

  if (date >= yesterdayStart) {
    return 'Ayer';
  }

  return 'Anteriores';
}


function formatNotificationTime(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const today = new Date();

  const isToday =
    date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();

  if (isToday) {
    return date.toLocaleTimeString(
      'es-CO',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  }

  return date.toLocaleDateString(
    'es-CO',
    {
      day: '2-digit',
      month: 'short',
    },
  );
}


function NotificationIcon({
  notification,
}: {
  notification: AppNotification;
}) {
  const iconProps = {
    size: 17,
    color: colors.neutral.gray600,
  };

  if (
    notification.type === 'file_shared'
    || notification.type === 'file_share_revoked'
  ) {
    return <Share2 {...iconProps} />;
  }

  if (
    notification.type === 'file_trashed'
    || notification.type === 'file_deleted'
  ) {
    return <Trash2 {...iconProps} />;
  }

  if (
    notification.type === 'upload_success'
    || notification.type === 'upload_failed'
    || notification.type === 'file_restored'
  ) {
    return <Folder {...iconProps} />;
  }

  if (notification.module === 'storage') {
    return <FileText {...iconProps} />;
  }

  return <Info {...iconProps} />;
}


export default function NotificationsScreen() {
  const router = useRouter();

  const [filter, setFilter] =
    useState<NotificationFilter>('all');

  const [notifications, setNotifications] = useState<
    AppNotification[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);


  const loadNotifications = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const auth = await getValidSessionCredentials();

        if (!auth) {
          throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
          );
        }

        const response = await getNotifications(auth, {
          limit: 100,
          offset: 0,
        });

        setNotifications(response.notifications);
      } catch (error) {
        Alert.alert(
          'No fue posible cargar notificaciones',
          error instanceof Error
            ? error.message
            : 'Intenta nuevamente.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );


  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);


  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        if (filter === 'unread') {
          return !notification.read_at;
        }

        if (filter === 'read') {
          return Boolean(notification.read_at);
        }

        return true;
      }),
    [filter, notifications],
  );


  const groups = useMemo(() => {
    const nextGroups: Record<
      DateGroup,
      AppNotification[]
    > = {
      Hoy: [],
      Ayer: [],
      Anteriores: [],
    };

    filteredNotifications.forEach((notification) => {
      nextGroups[
        getDateGroup(notification.created_at)
      ].push(notification);
    });

    return nextGroups;
  }, [filteredNotifications]);


  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.read_at,
      ).length,
    [notifications],
  );


  const handleOpenNotification = async (
    notification: AppNotification,
  ) => {
    try {
      if (!notification.read_at) {
        const auth = await getValidSessionCredentials();

        if (!auth) {
          throw new Error(
            'Tu sesión expiró. Inicia sesión nuevamente.',
          );
        }

        const response = await markNotificationAsRead(
          auth,
          notification.id,
        );

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? response.notification
              : item,
          ),
        );
      }

      const fileId = notification.metadata.file_id;

      if (
        notification.module === 'storage'
        && typeof fileId === 'string'
      ) {
        router.push({
          pathname: '/(main)/storage/preview',
          params: {
            id: fileId,
          },
        });
      }
    } catch (error) {
      Alert.alert(
        'No fue posible actualizar la notificación',
        error instanceof Error
          ? error.message
          : 'Intenta nuevamente.',
      );
    }
  };


  const handleMarkAllRead = async () => {
    if (!unreadCount || updating) {
      return;
    }

    try {
      setUpdating(true);

      const auth = await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      await markAllNotificationsAsRead(auth);

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at:
            notification.read_at
            || new Date().toISOString(),
        })),
      );
    } catch (error) {
      Alert.alert(
        'No fue posible marcar las notificaciones',
        error instanceof Error
          ? error.message
          : 'Intenta nuevamente.',
      );
    } finally {
      setUpdating(false);
    }
  };


  const hasNotifications =
    filteredNotifications.length > 0;


  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ChevronLeft
                size={24}
                color={colors.neutral.text}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              Notificaciones
            </Text>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={() => {
                void handleMarkAllRead();
              }}
              disabled={updating}
              activeOpacity={0.7}
            >
              {updating ? (
                <ActivityIndicator
                  size="small"
                  color={colors.brand.primary}
                />
              ) : (
                <Text style={styles.markAllRead}>
                  Marcar leídas
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            {[
              {
                id: 'all',
                label: 'Todas',
              },
              {
                id: 'unread',
                label: 'No leídas',
              },
              {
                id: 'read',
                label: 'Leídas',
              },
            ].map((item) => {
              const active = filter === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setFilter(
                      item.id as NotificationFilter,
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterText,
                      active && styles.filterTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={colors.brand.primary}
            />
          </View>
        ) : hasNotifications ? (
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void loadNotifications(true);
                }}
                tintColor={colors.brand.primary}
              />
            }
          >
            {(
              [
                'Hoy',
                'Ayer',
                'Anteriores',
              ] as DateGroup[]
            ).map((group) => {
              const groupItems = groups[group];

              if (!groupItems.length) {
                return null;
              }

              return (
                <View key={group}>
                  <Text style={styles.groupTitle}>
                    {group}
                  </Text>

                  <View style={styles.groupContainer}>
                    {groupItems.map(
                      (notification, index) => {
                        const unread =
                          !notification.read_at;

                        return (
                          <TouchableOpacity
                            key={notification.id}
                            style={[
                              styles.notificationRow,
                              unread
                                && styles.notificationRowUnread,
                              index === groupItems.length - 1
                                && styles.lastRow,
                            ]}
                            onPress={() => {
                              void handleOpenNotification(
                                notification,
                              );
                            }}
                            activeOpacity={0.72}
                          >
                            <View style={styles.iconWrap}>
                              <NotificationIcon
                                notification={notification}
                              />
                            </View>

                            <View style={styles.details}>
                              <View style={styles.titleRow}>
                                <Text
                                  style={[
                                    styles.title,
                                    unread && styles.titleUnread,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {notification.title}
                                </Text>

                                <Text style={styles.time}>
                                  {formatNotificationTime(
                                    notification.created_at,
                                  )}
                                </Text>
                              </View>

                              <Text
                                style={styles.body}
                                numberOfLines={2}
                              >
                                {notification.body}
                              </Text>
                            </View>

                            {unread && (
                              <View style={styles.unreadDot} />
                            )}
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>
                </View>
              );
            })}

            <View style={styles.bottomSpace} />
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Bell
                size={40}
                color={colors.neutral.gray500}
              />
            </View>

            <Text style={styles.emptyTitle}>
              Sin notificaciones
            </Text>

            <Text style={styles.emptyDescription}>
              No tienes notificaciones para mostrar.
            </Text>
          </View>
        )}

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  markAllRead: {
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: `${colors.brand.primary}15`,
    borderColor: colors.brand.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  filterTextActive: {
    fontWeight: '600',
    color: colors.brand.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flex: 1,
  },
  groupTitle: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupContainer: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    backgroundColor: colors.neutral.white,
  },
  notificationRowUnread: {
    backgroundColor: `${colors.brand.primary}08`,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: colors.neutral.gray100,
  },
  details: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    marginRight: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  titleUnread: {
    fontWeight: '700',
    color: colors.brand.primary,
  },
  time: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.neutral.gray700,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 10,
    backgroundColor: colors.brand.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: colors.neutral.gray100,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  emptyTitle: {
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  emptyDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: colors.neutral.gray600,
  },
  bottomSpace: {
    height: 110,
  },
});