import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import { Bell, Mic, MessageCircle, Phone } from 'lucide-react-native';
import VoiceAssistantScreen from './assistant/VoiceAssistantScreen';
import AssistantGlow from './assistant/AssistantGlow';
import NotificationTicker from './NotificationTicker';
import NotificationsPopover from './NotificationsPopover';
import { GENERAL_NOTIFICATIONS, CHAT_NOTIFICATIONS, TickerItem, TickerTarget } from '../mocks/tabNotifications';

interface FloatingTabBarProps {
  // Legacy prop kept so existing screens keep compiling; the bar no longer
  // navigates between tabs (everything lives inside Home).
  activeTab?: 'home' | 'explore' | 'chat' | 'profile';
  // Provided by Home: opens the notification target inside the embedded module.
  onOpenNotificationTarget?: (target: TickerTarget) => void;
}

/** Unread badge: same look on both sides, hidden at 0, capped at "9+" */
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.unreadBadge}>
      <Text style={styles.unreadBadgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

export default function FloatingTabBar({ onOpenNotificationTarget }: FloatingTabBarProps) {
  const router = useRouter();
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [popover, setPopover] = useState<'general' | 'chats' | null>(null);
  // Mock read state: opening a notification marks it read and lowers the badge
  const [readIds, setReadIds] = useState<string[]>([]);

  const generalUnread = GENERAL_NOTIFICATIONS.filter((n) => !readIds.includes(n.id)).length;
  const chatUnread = CHAT_NOTIFICATIONS.filter((n) => !readIds.includes(n.id)).length;

  const handleSelectItem = (item: TickerItem) => {
    setPopover(null);
    setReadIds((ids) => (ids.includes(item.id) ? ids : [...ids, item.id]));
    if (onOpenNotificationTarget) {
      // Inside Home: open the element in the embedded module (no route change)
      onOpenNotificationTarget(item.target);
    } else {
      // Standalone screens fallback: real navigation
      router.push({ pathname: item.target.path, params: item.target.params } as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {/* Notificaciones: everything that is NOT chat/calls. Opens a popover, never navigates */}
        <TouchableOpacity
          style={styles.sideZone}
          onPress={() => setPopover('general')}
          activeOpacity={0.7}
        >
          <View>
            <Bell size={22} color={colors.neutral.gray700} />
            <UnreadBadge count={generalUnread} />
          </View>
          <View style={styles.zoneTextCol}>
            <Text style={styles.label}>Notificaciones</Text>
            <NotificationTicker items={GENERAL_NOTIFICATIONS} intervalMs={3500} />
          </View>
        </TouchableOpacity>

        {/* Central voice assistant button (highlighted) */}
        <View style={styles.aiContainer}>
          <View style={styles.aiButtonWrap}>
            {/* Glow halo: the assistant is the main action of the app */}
            <AssistantGlow size={58} intense={voiceVisible} />
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => setVoiceVisible(true)}
              activeOpacity={0.8}
            >
              <Mic size={26} color={colors.neutral.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.aiLabel}>Asistente</Text>
        </View>

        {/* Chats y llamadas: chat messages and calls only. Opens a popover, never navigates */}
        <TouchableOpacity
          style={styles.sideZone}
          onPress={() => setPopover('chats')}
          activeOpacity={0.7}
        >
          <View>
            <MessageCircle size={22} color={colors.neutral.gray700} />
            <View style={styles.phoneMiniIcon}>
              <Phone size={9} color={colors.neutral.gray700} />
            </View>
            <UnreadBadge count={chatUnread} />
          </View>
          <View style={styles.zoneTextCol}>
            <Text style={styles.label}>Chats y llamadas</Text>
            <NotificationTicker items={CHAT_NOTIFICATIONS} intervalMs={4300} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Immersive voice assistant */}
      <VoiceAssistantScreen visible={voiceVisible} onClose={() => setVoiceVisible(false)} />

      {/* Notification list popovers (anchored above the bar) */}
      <NotificationsPopover
        visible={popover === 'general'}
        title="Notificaciones"
        items={GENERAL_NOTIFICATIONS}
        readIds={readIds}
        onClose={() => setPopover(null)}
        onSelectItem={handleSelectItem}
      />
      <NotificationsPopover
        visible={popover === 'chats'}
        title="Chats y llamadas"
        items={CHAT_NOTIFICATIONS}
        readIds={readIds}
        onClose={() => setPopover(null)}
        onSelectItem={handleSelectItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 16,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 99,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  sideZone: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  zoneTextCol: {
    flex: 1,
    marginLeft: 8,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.neutral.gray800,
  },
  phoneMiniIcon: {
    position: 'absolute',
    bottom: -3,
    right: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: colors.semantic.error,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.neutral.white,
  },
  unreadBadgeText: {
    color: colors.neutral.white,
    fontSize: 8,
    fontWeight: '900',
  },
  aiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    paddingHorizontal: 10,
  },
  aiButtonWrap: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 4,
    borderColor: colors.neutral.white,
  },
  aiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand.primary,
    marginTop: 2,
  },
});
