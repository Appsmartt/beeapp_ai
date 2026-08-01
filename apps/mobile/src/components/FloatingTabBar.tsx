import { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import {
  Bell,
  Mic,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  FolderOpen,
  Calendar,
  Users,
  ShoppingBag,
} from 'lucide-react-native';
import VoiceAssistantScreen from './assistant/VoiceAssistantScreen';
import AssistantGlow from './assistant/AssistantGlow';
import NotificationTicker from './NotificationTicker';
import NotificationsPopover from './NotificationsPopover';
import { GENERAL_NOTIFICATIONS, CHAT_NOTIFICATIONS, TickerItem, TickerTarget } from '../mocks/tabNotifications';

interface FloatingTabBarProps {
  activeTab?: 'home' | 'explore' | 'chat' | 'profile';
  onOpenNotificationTarget?: (target: TickerTarget) => void;
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.unreadBadge}>
      <Text style={styles.unreadBadgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

const getIconForModule = (module: string | undefined, kind: string | undefined, fallback: any) => {
  if (!module) return fallback;
  if (module === 'mail') return Mail;
  if (module === 'calendar') return Calendar;
  if (module === 'notes') return FileText;
  if (module === 'files') return FolderOpen;
  if (module === 'contacts') return Users;
  if (module === 'beeservices') return ShoppingBag;
  if (kind === 'call') return Phone;
  if (kind === 'message' || kind === 'group' || module === 'chat') return MessageCircle;
  return fallback;
};

export default function FloatingTabBar({ onOpenNotificationTarget }: FloatingTabBarProps) {
  return null;
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [popover, setPopover] = useState<'general' | 'chats' | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);

  const [currentLeftItem, setCurrentLeftItem] = useState<TickerItem | null>(null);
  const [currentRightItem, setCurrentRightItem] = useState<TickerItem | null>(null);
  const leftIconAnim = useRef(new Animated.Value(1)).current;
  const rightIconAnim = useRef(new Animated.Value(1)).current;

  const handleLeftItemChange = useCallback((item: TickerItem | null) => {
    Animated.timing(leftIconAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setCurrentLeftItem(item);
      Animated.timing(leftIconAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  }, [leftIconAnim]);

  const handleRightItemChange = useCallback((item: TickerItem | null) => {
    Animated.timing(rightIconAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setCurrentRightItem(item);
      Animated.timing(rightIconAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  }, [rightIconAnim]);

  const handleSelectItem = (item: TickerItem) => {
    setPopover(null);
    setReadIds((ids) => (ids.includes(item.id) ? ids : [...ids, item.id]));
    if (onOpenNotificationTarget) {
      onOpenNotificationTarget(item.target);
    } else {
      router.push({ pathname: item.target.path, params: item.target.params } as any);
    }
  };

  const leftBadgeCount = currentLeftItem
    ? GENERAL_NOTIFICATIONS.filter((n) => n.target.module === currentLeftItem.target.module && !readIds.includes(n.id)).length
    : GENERAL_NOTIFICATIONS.filter((n) => !readIds.includes(n.id)).length;

  const rightBadgeCount = currentRightItem
    ? CHAT_NOTIFICATIONS.filter((n) => n.target.module === currentRightItem.target.module && !readIds.includes(n.id)).length
    : CHAT_NOTIFICATIONS.filter((n) => !readIds.includes(n.id)).length;

  const IconLeft = getIconForModule(currentLeftItem?.target.module, currentLeftItem?.kind, Bell);
  const IconRight = getIconForModule(currentRightItem?.target.module, currentRightItem?.kind, MessageCircle);

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {/* Left Side Zone */}
        <TouchableOpacity style={styles.sideZone} onPress={() => setPopover('general')} activeOpacity={0.7}>
          <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={{ opacity: leftIconAnim }}>
              <IconLeft size={22} color={colors.neutral.gray700} />
            </Animated.View>
            <UnreadBadge count={leftBadgeCount} />
          </View>
          <View style={styles.zoneTextCol}>
            <NotificationTicker items={GENERAL_NOTIFICATIONS} intervalMs={3500} onCurrentChange={handleLeftItemChange} showIcon={false} />
          </View>
        </TouchableOpacity>

        {/* Central Assistant Button */}
        <View style={styles.aiContainer}>
          <View style={styles.aiButtonWrap}>
            <AssistantGlow size={58} intense={voiceVisible} />
            <TouchableOpacity style={styles.aiButton} onPress={() => setVoiceVisible(true)} activeOpacity={0.8}>
              <Mic size={26} color={colors.neutral.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.aiLabel}>Asistente</Text>
        </View>

        {/* Right Side Zone */}
        <TouchableOpacity style={styles.sideZone} onPress={() => setPopover('chats')} activeOpacity={0.7}>
          <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={{ opacity: rightIconAnim }}>
              <IconRight size={22} color={colors.neutral.gray700} />
            </Animated.View>
            <UnreadBadge count={rightBadgeCount} />
          </View>
          <View style={styles.zoneTextCol}>
            <NotificationTicker items={CHAT_NOTIFICATIONS} intervalMs={4300} onCurrentChange={handleRightItemChange} showIcon={false} />
          </View>
        </TouchableOpacity>
      </View>

      <VoiceAssistantScreen visible={voiceVisible} onClose={() => setVoiceVisible(false)} />

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
  container: { position: 'absolute', bottom: Platform.OS === 'ios' ? 28 : 16, left: 16, right: 16, alignItems: 'center', zIndex: 99 },
  bar: { flexDirection: 'row', backgroundColor: colors.neutral.white, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.neutral.gray200, shadowColor: colors.brand.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8, alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  sideZone: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  zoneTextCol: { flex: 1, marginLeft: 8, justifyContent: 'center' },
  unreadBadge: { position: 'absolute', top: -4, right: -6, backgroundColor: colors.semantic.error, borderRadius: 7, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.neutral.white },
  unreadBadgeText: { color: colors.neutral.white, fontSize: 8, fontWeight: '400' },
  aiContainer: { alignItems: 'center', justifyContent: 'center', marginTop: -30, paddingHorizontal: 10 },
  aiButtonWrap: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  aiButton: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.75, shadowRadius: 14, elevation: 10, borderWidth: 4, borderColor: colors.neutral.white },
  aiLabel: { fontSize: 10, fontWeight: '400', color: colors.brand.primary, marginTop: 2 },
});
