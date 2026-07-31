import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { Bot, Pin, Sparkles, Lock, MoreVertical } from 'lucide-react-native';

interface AiChatListItemProps {
  name: string;
  lastMessage: string;
  time: string;
  onPress: () => void;
  isProtected?: boolean;
  onMorePress?: () => void;
}

export default function AiChatListItem({
  name,
  lastMessage,
  time,
  onPress,
  isProtected,
  onMorePress,
}: AiChatListItemProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ position: 'relative' }}>
        <View style={styles.avatar}>
          <Bot size={24} color={colors.neutral.white} />
        </View>
        {isProtected && (
          <View style={styles.lockBadge}>
            <Lock size={9} color={colors.neutral.white} />
          </View>
        )}
      </View>

      <View style={styles.texts}>
        <View style={styles.topLine}>
          <View style={styles.nameWrap}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.aiBadge}>
              <Sparkles size={9} color={colors.brand.primary} />
              <Text style={styles.aiBadgeText}>IA</Text>
            </View>
          </View>
          <View style={styles.timeWrap}>
            <Pin size={11} color={colors.brand.primary} />
            <Text style={styles.time}>{time}</Text>
          </View>
        </View>

        <Text
          style={[
            styles.lastMessage,
            isProtected && { color: colors.neutral.gray400, fontStyle: 'italic' }
          ]}
          numberOfLines={1}
        >
          {isProtected ? 'Chat protegido' : lastMessage}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.moreBtn}
        onPress={onMorePress}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MoreVertical size={18} color={colors.neutral.gray400} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand.primary,
    borderWidth: 1.5,
    borderColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  nameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.brand.primary + '15',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '400',
    color: colors.brand.primary,
    letterSpacing: 0.3,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  lastMessage: {
    fontSize: 12.5,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  moreBtn: {
    paddingLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
