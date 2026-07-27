import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Check, CheckCheck, BellOff, Pin, Trash2, Users, Lock } from 'lucide-react-native';
import VerifiedBadge from '../VerifiedBadge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChatListItemProps {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isGroup: boolean;
  /** Mock: paints the verified badge next to the name */
  verified?: boolean;
  status: 'sent' | 'delivered' | 'read';
  online?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  isProtected?: boolean;
  onPress: () => void;
  onDelete: () => void;
  onMute: () => void;
  onPin: () => void;
  onLongPress?: () => void;
}

export default function ChatListItem({
  name,
  lastMessage,
  time,
  unreadCount,
  isGroup,
  verified,
  status,
  online,
  isPinned,
  isMuted,
  isProtected,
  onPress,
  onDelete,
  onMute,
  onPin,
  onLongPress,
}: ChatListItemProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={180}
      decelerationRate="fast"
      contentContainerStyle={styles.scrollContainer}
    >
      {/* Main row item occupying full screen width */}
      <TouchableOpacity
        style={styles.mainRow}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
      >
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          {isGroup ? (
            <View style={styles.groupAvatar}>
              <Users size={22} color={colors.neutral.gray600} />
            </View>
          ) : (
            <View style={[styles.avatarCircle, isPinned && styles.avatarCirclePinned]}>
              <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
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
      </TouchableOpacity>

      {/* Swipe Action Buttons on horizontal scroll (width: 180px) */}
      <View style={styles.actionsContainer}>
        {/* Pin Button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.neutral.gray100 }]}
          onPress={onPin}
          activeOpacity={0.8}
        >
          <Pin size={18} color={colors.neutral.gray600} />
          <Text style={styles.actionBtnText}>{isPinned ? 'Desfijar' : 'Fijar'}</Text>
        </TouchableOpacity>

        {/* Mute Button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.neutral.gray100 }]}
          onPress={onMute}
          activeOpacity={0.8}
        >
          <BellOff size={18} color={colors.neutral.gray600} />
          <Text style={styles.actionBtnText}>
            {isMuted ? 'Activar' : 'Silenciar'}
          </Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.semantic.error + '15' }]}
          onPress={onDelete}
          activeOpacity={0.8}
        >
          <Trash2 size={18} color={colors.semantic.error} />
          <Text style={[styles.actionBtnText, { color: colors.semantic.error }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    backgroundColor: colors.neutral.gray50,
  },
  mainRow: {
    width: SCREEN_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand.primary + '30',
  },
  avatarCirclePinned: {
    borderColor: colors.brand.primary,
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.semantic.success,
    borderWidth: 2,
    borderColor: colors.neutral.white,
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
    fontWeight: '600',
    color: colors.neutral.text,
  },
  time: {
    fontSize: 12,
    color: colors.neutral.gray600,
  },
  timeUnread: {
    color: colors.brand.primary,
    fontWeight: '400',
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
    color: colors.neutral.gray600,
    lineHeight: 16,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.brand.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
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
  actionsContainer: {
    flexDirection: 'row',
    width: 180,
    height: '100%',
  },
  actionBtn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  actionBtnText: {
    fontSize: 9,
    fontWeight: '400',
    color: colors.neutral.text,
    marginTop: 4,
    textTransform: 'uppercase',
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
});
