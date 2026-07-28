import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';

interface CommunityListItemProps {
  /** Iniciales del avatar circular */
  avatar: string;
  avatarColor: string;
  name: string;
  memberCount: number;
  role: 'admin' | 'member';
  unreadCount?: number;
  onPress: () => void;
}

/** Fila de una comunidad, con la misma anatomía que la lista de chats */
export default function CommunityListItem({
  avatar,
  avatarColor,
  name,
  memberCount,
  role,
  unreadCount = 0,
  onPress,
}: CommunityListItemProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{avatar}</Text>
      </View>

      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {memberCount} {memberCount === 1 ? 'miembro' : 'miembros'}
        </Text>
      </View>

      <View style={styles.rightCol}>
        {role === 'admin' && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        )}
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: '600', color: colors.brand.primary },
  texts: { flex: 1, paddingRight: spacing.sm },
  name: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: colors.neutral.text },
  meta: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600, marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 6 },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.md,
    backgroundColor: `${colors.brand.primary}1A`,
  },
  adminBadgeText: { fontSize: 10, fontWeight: '600', color: colors.brand.primary },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: { fontSize: 11, fontWeight: '600', color: colors.neutral.white },
});
