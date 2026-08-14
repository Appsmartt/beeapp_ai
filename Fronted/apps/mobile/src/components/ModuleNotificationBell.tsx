import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  Bell,
  FileText,
  Folder,
  Info,
  Share2,
  Trash2,
  X,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import {
  getNotifications,
  markNotificationAsRead,
} from '@beeapp/api-client';
import type {
  AppNotification,
} from '@beeapp/shared-types';

import {
  useModuleNav,
} from './embedded/EmbeddedNavContext';
import {
  getValidSessionCredentials,
} from '../services/authSession';


interface ModuleNotificationBellProps {
  moduleId: 'chat' | 'mail' | 'notes' | 'files' | 'calendar';
}


function getBackendModule(
  moduleId: ModuleNotificationBellProps['moduleId'],
): string {
  if (moduleId === 'files') {
    return 'storage';
  }

  return moduleId;
}


function formatTime(
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
    size: 16,
    color: colors.brand.primary,
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


export default function ModuleNotificationBell({
  moduleId,
}: ModuleNotificationBellProps) {
  const router = useModuleNav();

  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<
    AppNotification[]
  >([]);


  const backendModule = useMemo(
    () => getBackendModule(moduleId),
    [moduleId],
  );


  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.read_at,
      ).length,
    [notifications],
  );


  const loadNotifications = useCallback(
    async () => {
      try {
        setLoading(true);

        const auth = await getValidSessionCredentials();

        if (!auth) {
          return;
        }

        const response = await getNotifications(auth, {
          module: backendModule,
          unread_only: true,
          limit: 20,
          offset: 0,
        });

        setNotifications(response.notifications);
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    },
    [backendModule],
  );


  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);


  const handleOpen = async (
    notification: AppNotification,
  ) => {
    try {
      const auth = await getValidSessionCredentials();

      if (auth && !notification.read_at) {
        const response = await markNotificationAsRead(
          auth,
          notification.id,
        );

        setNotifications((current) =>
          current.filter(
            (item) =>
              item.id !== response.notification.id,
          ),
        );
      }

      setModalVisible(false);

      const fileId = notification.metadata.file_id;

      if (
        backendModule === 'storage'
        && typeof fileId === 'string'
      ) {
        router.push({
          pathname: '/(main)/storage/preview',
          params: {
            id: fileId,
          },
        });
      }
    } catch {
      setModalVisible(false);
    }
  };


  const handleOpenModal = () => {
    setModalVisible(true);
    void loadNotifications();
  };


  return (
    <>
      <TouchableOpacity
        style={styles.bellButton}
        activeOpacity={0.7}
        onPress={handleOpenModal}
        accessibilityLabel={`Notificaciones de ${moduleId}`}
      >
        <Bell
          size={20}
          color={colors.neutral.gray600}
        />

        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9
                ? '9+'
                : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.popover}>
                <View style={styles.popoverHeader}>
                  <View style={styles.titleRow}>
                    <Bell
                      size={18}
                      color={colors.brand.primary}
                    />

                    <Text style={styles.popoverTitle}>
                      Notificaciones
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      setModalVisible(false)
                    }
                    style={styles.closeButton}
                    activeOpacity={0.7}
                  >
                    <X
                      size={18}
                      color={colors.neutral.gray500}
                    />
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator
                      size="small"
                      color={colors.brand.primary}
                    />
                  </View>
                ) : notifications.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>
                      Sin notificaciones nuevas
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                  >
                    {notifications.map((notification) => (
                      <TouchableOpacity
                        key={notification.id}
                        style={styles.notificationRow}
                        activeOpacity={0.7}
                        onPress={() => {
                          void handleOpen(notification);
                        }}
                      >
                        <View style={styles.iconCircle}>
                          <NotificationIcon
                            notification={notification}
                          />
                        </View>

                        <View style={styles.textWrap}>
                          <Text
                            style={styles.notificationTitle}
                            numberOfLines={1}
                          >
                            {notification.title}
                          </Text>

                          <Text
                            style={styles.notificationBody}
                            numberOfLines={2}
                          >
                            {notification.body}
                          </Text>

                          <Text style={styles.time}>
                            {formatTime(
                              notification.created_at,
                            )}
                          </Text>
                        </View>

                        <View style={styles.unreadDot} />
                      </TouchableOpacity>
                    ))}
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
  bellButton: {
    position: 'relative',
    padding: 6,
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    backgroundColor: colors.semantic.error,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  popover: {
    width: '100%',
    maxWidth: 340,
    maxHeight: 420,
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.neutral.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
  closeButton: {
    padding: 4,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray500,
  },
  list: {
    maxHeight: 290,
    marginTop: 8,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.brand.primary}15`,
  },
  textWrap: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  notificationBody: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: colors.neutral.gray600,
  },
  time: {
    marginTop: 3,
    fontSize: 10,
    color: colors.neutral.gray500,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brand.primary,
  },
});