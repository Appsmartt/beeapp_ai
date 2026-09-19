import {
  Image,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors } from '@beeapp/design-system';
import { Check, CheckCheck, BellOff, Users, Lock, MoreVertical } from 'lucide-react-native';
import VerifiedBadge from '../VerifiedBadge';

interface ChatListItemProps {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isGroup: boolean;
  avatarUrl?: string | null;
  verified?: boolean;
  status: 'sent' | 'delivered' | 'read';
  online?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  isProtected?: boolean;
  onPress: () => void;
  onMorePress?: () => void;
}

export default function ChatListItem({
  name,
  lastMessage,
  time,
  unreadCount,
  isGroup,
  avatarUrl,
  verified,
  status,
  online,
  isPinned,
  isMuted,
  isProtected,
  onPress,
  onMorePress,
}: ChatListItemProps) {
  return (
    <TouchableOpacity
      style={styles.mainRow}
      onPress={onPress}
      activeOpacity={0.7}
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
          </View>
          <Text style={[styles.time, unreadCount > 0 && styles.timeUnread]}>
            {time}
          </Text>
        </View>

        <View style={styles.messageStatusRow}>
          <View style={styles.messageWrap}>
            {isMuted && <BellOff size={12} color={colors.neutral.gray500} style={styles.mutedIcon} />}
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

          {/* Read/Unread Indicators */}
          {unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          ) : (
            !isProtected && (
              <View style={styles.statusCheck}>
                {status === 'sent' && <Check size={14} color={colors.neutral.gray500} />}
                {status === 'delivered' && <CheckCheck size={14} color={colors.neutral.gray500} />}
                {status === 'read' && <CheckCheck size={14} color={colors.brand.primary} />}
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
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDFBFF',
    borderColor: '#E2DDF5',
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#B4A1D8',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    elevation: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 13,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3ECFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8C8F0',
    shadowColor: '#A68ABF',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarCirclePinned: {
    borderColor: '#9A7AC5',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#76549C',
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#E7F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7DFF3',
  },
  avatarImage: {
    width: 52,
    height: 52,
    resizeMode: 'cover',
  },
  directAvatarImage: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#DECFF0',
  },
  groupAvatarImage: {
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#D3E5F2',
  },
  avatarImagePinned: {
    borderColor: '#9B7BC2',
    borderWidth: 2,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#8BC9B3',
    borderWidth: 2,
    borderColor: '#FCFAFF',
  },
  lockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#9B7BC2',
    borderWidth: 1.5,
    borderColor: '#FCFAFF',
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
    marginBottom: 6,
  },
  nameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 10,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#443354',
  },
  time: {
    fontSize: 11,
    color: '#927E9D',
  },
  timeUnread: {
    color: '#8E67B9',
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
  lastMessage: {
    fontSize: 13,
    color: '#7D718B',
    lineHeight: 17,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#A57BC7',
    borderRadius: 10,
    minWidth: 19,
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    shadowColor: '#A68ABF',
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
  moreBtn: {
    alignItems: 'center',
    backgroundColor: '#F3ECFA',
    borderRadius: 12,
    height: 32,
    justifyContent: 'center',
    marginLeft: 8,
    width: 32,
  },
});
