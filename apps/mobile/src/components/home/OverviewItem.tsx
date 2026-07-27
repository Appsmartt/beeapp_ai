import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '@beeapp/design-system';
import { Lock, Mail } from 'lucide-react-native';
import VerifiedBadge from '../VerifiedBadge';

/** The design-system sizes are CSS strings; React Native needs numbers */
export const FONT = {
  body: parseInt(typography.fontSize.body, 10),
  caption: parseInt(typography.fontSize.caption, 10),
};

/** Dark avatar tints carry white initials, light ones keep dark text */
const isDarkTint = (hex?: string) => {
  if (!hex || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 150;
};

export interface OverviewItemProps {
  /** Initials avatar (contacts, chats, mail) */
  initials?: string;
  avatarColor?: string;
  /** Type icon avatar, used when there are no initials (files, events, listings) */
  icon?: typeof Mail;
  iconColor?: string;
  title: string;
  subtitle: string;
  /** Relative date/hour shown top right ("09:15 AM", "Ayer", "21 Jul") */
  timestamp?: string;
  /** Optional indicators: unread dot, PIN lock, Bee Verify badge */
  unread?: boolean;
  locked?: boolean;
  verified?: boolean;
  /** Hairline below the row; the last row of a section hides it */
  showSeparator?: boolean;
  onPress: () => void;
}

/**
 * Compact single row shared by every section of the "Todas" overview: same
 * anatomy as the mail list (circular avatar, bold title, gray subtitle and
 * timestamp on the right) but flat — no card and no per-module variations.
 */
export default function OverviewItem({
  initials,
  avatarColor,
  icon: Icon,
  iconColor,
  title,
  subtitle,
  timestamp,
  unread,
  locked,
  verified,
  showSeparator = true,
  onPress,
}: OverviewItemProps) {
  const initialsColor = isDarkTint(avatarColor) ? colors.neutral.white : colors.neutral.text;

  return (
    <TouchableOpacity
      style={[styles.row, showSeparator && styles.rowSeparator]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor ?? colors.neutral.gray100 }]}>
        {initials ? (
          <Text style={[styles.avatarText, { color: initialsColor }]}>{initials}</Text>
        ) : Icon ? (
          <Icon size={17} color={iconColor ?? colors.neutral.gray600} />
        ) : null}
      </View>

      <View style={styles.texts}>
        <View style={styles.topLine}>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
              {title}
            </Text>
            {verified && <VerifiedBadge size={13} />}
            {locked && <Lock size={12} color={colors.neutral.gray500} />}
          </View>
          {!!timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
        </View>

        <View style={styles.bottomLine}>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          {unread && <View style={styles.unreadDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: FONT.caption,
    fontWeight: '400',
  },
  texts: {
    flex: 1,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontSize: FONT.body - 1,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  titleUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: FONT.caption - 1,
    fontWeight: '400',
    color: colors.neutral.gray500,
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 3,
  },
  subtitle: {
    flex: 1,
    fontSize: FONT.caption,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brand.primary,
  },
});
