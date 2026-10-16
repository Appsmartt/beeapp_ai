import {
  Image,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { Check, CheckCheck, BellOff, Users, Lock, MoreVertical, Pin, Phone } from 'lucide-react-native';
import VerifiedBadge from '../VerifiedBadge';
import { getCategoryIcon } from './categoryIcons';

interface ChatListItemProps {
  id: string;
  name: string;
  lastMessage: string;
  reactionPreview?: string | null;
  isCallNotice?: boolean;
  time: string;
  unreadCount: number;
  isGroup: boolean;
  avatarUrl?: string | null;
  verified?: boolean;
  status: 'sent' | 'delivered' | 'read';
  isOwnLastMessage: boolean;
  online?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  isProtected?: boolean;
  categories?: { id: string; name: string; icon: string; color: string }[];
  onPress: () => void;
  onMorePress?: () => void;
}

export default function ChatListItem({
  name,
  lastMessage,
  reactionPreview = null,
  isCallNotice = false,
  time,
  unreadCount,
  isGroup,
  avatarUrl,
  verified,
  status,
  isOwnLastMessage,
  online,
  isPinned,
  isMuted,
  isProtected,
  categories = [],
  onPress,
  onMorePress,
}: ChatListItemProps) {
  return (
    <TouchableOpacity
      style={styles.mainRow}
      onPress={onPress}
      onLongPress={onMorePress}
      activeOpacity={0.7}
      accessibilityLabel={`${name}${isPinned ? ', chat fijado' : ''}`}
    >
      {/* Avatar Section */}
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={[
              styles.avatarImage,
              isGroup
                ? styles.groupAvatarImage
                : styles.directAvatarImage,
              isPinned
                && !isGroup
                && styles.avatarImagePinned,
            ]}
          />
        ) : isGroup ? (
          <View style={styles.groupAvatar}>
            <Users size={22} color={colors.neutral.gray600} />
          </View>
        ) : (
          <View
            style={[
              styles.avatarCircle,
              isPinned && styles.avatarCirclePinned,
            ]}
          >
            <Text style={styles.avatarText}>
              {name.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}
        {online && !isGroup && <View style={styles.onlineBadge} />}
        {isProtected && (
          <View style={styles.lockBadge}>
            <Lock size={9} color={colors.neutral.white} />
          </View>
        )}
      </View>

      {/* Text Details Section */}
      <View style={styles.textContainer}>
        <View style={styles.nameTimeRow}>
          <View style={styles.nameWrap}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {verified && <VerifiedBadge size={14} />}
            {categories.slice(0, 3).map((category) => {
              const Icon = getCategoryIcon(category.icon);
              return (
                <View
                  key={category.id}
                  style={[styles.categoryBadge, { backgroundColor: category.color }]}
                  accessibilityLabel={`Categoría ${category.name}`}
                >
                  <Icon size={11} color={colors.neutral.gray700} />
                </View>
              );
            })}
            {isPinned && (
              <Pin size={13} color={colors.brand.primary} accessibilityLabel="Chat fijado" />
            )}
          </View>
          <Text style={[styles.time, unreadCount > 0 && styles.timeUnread]}>
            {time}
          </Text>
        </View>

        <View style={styles.messageStatusRow}>
          <View style={styles.messageWrap}>
            {isMuted && <BellOff size={12} color={colors.neutral.gray500} style={styles.mutedIcon} />}
            {!isProtected && reactionPreview ? (
              <View style={styles.reactionPreviewBadge}>
                <Text style={styles.reactionPreviewIcon}>✦</Text>
              </View>
            ) : !isProtected && isCallNotice ? (
              <Phone size={14} color="#7A55BA" style={styles.callNoticeIcon} />
            ) : null}
            <Text
              style={[
                styles.lastMessage,
                isCallNotice && !isProtected && !reactionPreview && styles.callNoticeText,
                Boolean(reactionPreview) && !isProtected && styles.reactionPreviewText,
                isProtected && { color: colors.neutral.gray400, fontStyle: 'italic' }
              ]}
              numberOfLines={1}
            >
              {isProtected ? 'Chat protegido' : reactionPreview || lastMessage}
            </Text>
          </View>

          {/* Read/Unread Indicators */}
          {unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          ) : (
            !isProtected && !isCallNotice && isOwnLastMessage && (
              <View style={[
                styles.statusCheck,
                status === 'read' && styles.readStatusCheck,
              ]}>
                {status === 'sent' && <Check size={15} color={colors.neutral.gray500} />}
                {status === 'delivered' && <CheckCheck size={15} color={colors.neutral.gray600} />}
                {status === 'read' && <CheckCheck size={16} strokeWidth={2.5} color="#087F70" />}
              </View>
            )
          )}
        </View>
      </View>

      {/* Botón de tres puntos siempre visible a la derecha */}
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
  categoryBadge: { width: 19, height: 19, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginLeft: 3 },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCirclePinned: {
    borderColor: colors.brand.primary,
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    resizeMode: 'cover',
  },
  directAvatarImage: {
    borderRadius: 24,
  },
  groupAvatarImage: {
    borderRadius: 16,
  },
  avatarImagePinned: {
    borderColor: colors.brand.primary,
    borderWidth: 2,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#62A98E',
    borderWidth: 2,
    borderColor: colors.neutral.white,
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
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  nameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: spacing.sm,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  time: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  timeUnread: {
    fontWeight: '700',
  },
  messageStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  mutedIcon: {
    marginRight: 4,
  },
  callNoticeIcon: {
    marginRight: 5,
  },
  callNoticeText: {
    color: '#7A55BA',
    fontWeight: '600',
  },
  reactionPreviewBadge: {
    width: 19,
    height: 19,
    borderRadius: 7,
    backgroundColor: '#F0EBFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  reactionPreviewIcon: {
    color: '#7659AB',
    fontSize: 13,
    fontWeight: '700',
  },
  reactionPreviewText: {
    color: '#6E5897',
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 12.5,
    color: colors.neutral.gray600,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    minWidth: 19,
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    shadowColor: '#9CA9CF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.16,
    shadowRadius: 3,
    elevation: 1,
  },
  unreadBadgeText: {
    color: colors.neutral.white,
    fontSize: 10,
    fontWeight: '400',
  },
  statusCheck: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  readStatusCheck: {
    backgroundColor: '#DDF7EF',
    borderRadius: 7,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  moreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
  },
});
