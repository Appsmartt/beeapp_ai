import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Phone, Video, MoreVertical, Bot, SlidersHorizontal } from 'lucide-react-native';
import VerifiedBadge from '../VerifiedBadge';

interface ConversationHeaderProps {
  chatName: string;
  isAI: boolean;
  isGroup: boolean;
  isVerified: boolean;
  online: boolean;
  groupMemberCount: number;
  menuOpen: boolean;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenAiSettings: () => void;
  onCall: (video: boolean) => void;
  onToggleMenu: () => void;
}

export default function ConversationHeader({
  chatName,
  isAI,
  isGroup,
  isVerified,
  online,
  groupMemberCount,
  onBack,
  onOpenProfile,
  onOpenAiSettings,
  onCall,
  onToggleMenu,
}: ConversationHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeftCol}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.neutral.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerIdentity}
          onPress={onOpenProfile}
          disabled={isAI}
          activeOpacity={0.7}
        >
          <View style={[styles.avatarCircle, isAI && styles.avatarCircleAI]}>
            {isAI ? (
              <Bot size={20} color={colors.neutral.white} />
            ) : (
              <Text style={styles.avatarText}>{chatName[0]?.toUpperCase() || 'C'}</Text>
            )}
            {online && !isGroup && !isAI && <View style={styles.onlineBadge} />}
          </View>

          <View style={styles.nameMetaCol}>
            <View style={styles.chatNameRow}>
              <Text style={styles.chatName} numberOfLines={1}>
                {chatName}
              </Text>
              {isVerified && <VerifiedBadge size={14} />}
            </View>
            <Text style={styles.chatMeta}>
              {isAI
                ? 'Asistente de BeeApp · siempre disponible'
                : isGroup
                ? `${groupMemberCount} participantes`
                : online
                ? 'En línea'
                : 'Últ. vez hace 1 hora'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.headerRightCol}>
        {isAI ? (
          <TouchableOpacity onPress={onOpenAiSettings} style={styles.headerIconBtn} activeOpacity={0.7}>
            <SlidersHorizontal size={20} color={colors.brand.primary} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity onPress={() => onCall(false)} style={styles.headerIconBtn} activeOpacity={0.7}>
              <Phone size={20} color={colors.neutral.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onCall(true)} style={styles.headerIconBtn} activeOpacity={0.7}>
              <Video size={20} color={colors.neutral.text} />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={onToggleMenu} style={styles.headerIconBtn} activeOpacity={0.7}>
          <MoreVertical size={20} color={colors.neutral.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    zIndex: 10,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
  },
  avatarCircleAI: {
    backgroundColor: colors.brand.primary,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.semantic.success,
    borderWidth: 2,
    borderColor: colors.neutral.white,
  },
  nameMetaCol: {
    flex: 1,
  },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  chatMeta: {
    fontSize: 11,
    color: colors.neutral.gray600,
    marginTop: 2,
    fontWeight: '400',
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 6,
  },
});
