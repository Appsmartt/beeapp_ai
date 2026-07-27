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
  mail: colors.neutral.gray600,
  event: colors.neutral.gray600,
  storage: colors.neutral.gray600,
  note: colors.neutral.gray600,
  doc: colors.neutral.gray600,
  message: colors.neutral.gray600,
  call: colors.neutral.gray600,
  group: colors.neutral.gray600,
};

interface NotificationTickerProps {
  items: TickerItem[];
  intervalMs?: number;
  onCurrentChange?: (item: TickerItem | null) => void;
  showIcon?: boolean;
}

export default function NotificationTicker({
  items,
  intervalMs = 3500,
  onCurrentChange,
  showIcon = true,
}: NotificationTickerProps) {
  const [index, setIndex] = useState(0);
  const anim = useRef(new Animated.Value(1)).current;

  // Prevent infinite update loops by holding handler in a ref
  const onCurrentChangeRef = useRef(onCurrentChange);
  useEffect(() => {
    onCurrentChangeRef.current = onCurrentChange;
  }, [onCurrentChange]);

  useEffect(() => {
    onCurrentChangeRef.current?.(items[index] || null);
  }, [index, items]);

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
      {showIcon && <Icon size={10} color={KIND_COLORS[item.kind]} style={styles.icon} />}
      <Text style={styles.text} numberOfLines={1}>
        {item.text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 2, maxWidth: '100%' },
  icon: { marginRight: 4 },
  text: { flex: 1, fontSize: 9, fontWeight: '400', color: colors.neutral.gray600 },
});
