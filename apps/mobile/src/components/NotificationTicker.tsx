
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors } from '@beeapp/design-system';
import {
  Mail,
  CalendarDays,
  HardDrive,
  StickyNote,
  FileCheck2,
  MessageCircle,
  PhoneMissed,
  Users,
} from 'lucide-react-native';
import { TickerItem, TickerKind } from '../mocks/tabNotifications';

export const KIND_ICONS: Record<TickerKind, typeof Mail> = {
  mail: Mail,
  event: CalendarDays,
  storage: HardDrive,
  note: StickyNote,
  doc: FileCheck2,
  message: MessageCircle,
  call: PhoneMissed,
  group: Users,
};

export const KIND_COLORS: Record<TickerKind, string> = {
  mail: '#1E88E5',
  event: colors.brand.primary,
  storage: '#D97706',
  note: '#D97706',
  doc: '#2E7D32',
  message: '#2E7D32',
  call: '#D03B3B',
  group: colors.brand.primary,
};

interface NotificationTickerProps {
  items: TickerItem[];
  intervalMs?: number;
}

/**
 * One-line notification strip that rotates through its items with a
 * smooth fade + slide swap (mock data, purely visual).
 */
export default function NotificationTicker({ items, intervalMs = 3500 }: NotificationTickerProps) {
  const [index, setIndex] = useState(0);
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setIndex((i) => (i + 1) % items.length);
        Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [items.length, intervalMs]);

  const item = items[index];
  if (!item) return null;

  const Icon = KIND_ICONS[item.kind];
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });

  return (
    <Animated.View style={[styles.row, { opacity: anim, transform: [{ translateY }] }]}>
      <Icon size={10} color={KIND_COLORS[item.kind]} style={styles.icon} />
      <Text style={styles.text} numberOfLines={1}>
        {item.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    maxWidth: '100%',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    flex: 1,
    fontSize: 9,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
});
