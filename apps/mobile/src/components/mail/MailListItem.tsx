
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Star, Paperclip, MailOpen, Archive, Trash2 } from 'lucide-react-native';
import VerifiedBadge from '../VerifiedBadge';
import { EmailItem } from '../../mocks/emails';

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

interface MailListItemProps {
  item: EmailItem;
  isSwipeActive: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggleStar: (e: any) => void;
  onToggleRead: (e: any) => void;
  onArchive: (e: any) => void;
  onDelete: (e: any) => void;
}

export default function MailListItem({
  item,
  isSwipeActive,
  onPress,
  onLongPress,
  onToggleStar,
  onToggleRead,
  onArchive,
  onDelete,
}: MailListItemProps) {
  return (
    <View style={styles.mailWrapper}>
      <TouchableOpacity
        style={[styles.mailRow, !item.isRead && styles.mailRowUnread]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
      >
        {/* Sender Color Avatar */}
        <View style={[styles.avatarCircle, { backgroundColor: item.initialsColor }]}>
          <Text style={styles.avatarText}>{getInitials(item.senderName)}</Text>
        </View>

        {/* Mail description preview */}
        <View style={styles.mailDetailsCol}>
          <View style={styles.senderTimeRow}>
            <View style={styles.senderNameWrap}>
              <Text style={[styles.senderNameText, !item.isRead && styles.senderNameTextUnread]} numberOfLines={1}>
                {item.senderName}
              </Text>
              {item.senderVerified && <VerifiedBadge size={13} />}
            </View>
            <Text style={styles.mailTimeText}>{item.time}</Text>
          </View>

          <Text style={[styles.subjectText, !item.isRead && styles.subjectTextUnread]} numberOfLines={1}>
            {item.subject}
          </Text>

          <Text style={styles.bodyPreviewText} numberOfLines={2}>
            {item.bodyPreview}
          </Text>

          {/* Icons Row (Attachment & Account) */}
          <View style={styles.metaRow}>
            {item.hasAttachment && (
              <View style={styles.attachmentBadge}>
                <Paperclip size={10} color={colors.neutral.gray600} style={{ marginRight: 4 }} />
                <Text style={styles.attachmentCountText}>Adjunto</Text>
              </View>
            )}
            <View style={[styles.accountTag, { borderColor: item.initialsColor }]}>
              <Text style={[styles.accountTagText, { color: item.initialsColor }]}>
                {item.account.split('@')[0]}
              </Text>
            </View>
          </View>
        </View>

        {/* Star Icon triggers */}
        <TouchableOpacity onPress={onToggleStar} style={styles.starTouchArea} activeOpacity={0.7}>
          <Star
            size={18}
            color={item.isStarred ? '#F59E0B' : colors.neutral.gray400}
            fill={item.isStarred ? '#F59E0B' : 'transparent'}
          />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Swipe Actions Simulation */}
      {isSwipeActive && (
        <View style={styles.actionsPanel}>
          <TouchableOpacity
            style={[styles.swipeBtn, { backgroundColor: colors.neutral.gray100 }]}
            onPress={onToggleRead}
            activeOpacity={0.8}
          >
            <MailOpen size={16} color={colors.neutral.gray600} />
            <Text style={styles.swipeBtnText}>{item.isRead ? 'No leído' : 'Leído'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.swipeBtn, { backgroundColor: colors.neutral.gray100 }]}
            onPress={onArchive}
            activeOpacity={0.8}
          >
            <Archive size={16} color={colors.neutral.gray600} />
            <Text style={styles.swipeBtnText}>Archivar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.swipeBtn, { backgroundColor: colors.semantic.error + '15' }]}
            onPress={onDelete}
            activeOpacity={0.8}
          >
            <Trash2 size={16} color={colors.semantic.error} />
            <Text style={[styles.swipeBtnText, { color: colors.semantic.error }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mailWrapper: {
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  mailRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.neutral.white,
  },
  mailRowUnread: {
    backgroundColor: colors.brand.primary + '08',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  avatarText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '400',
  },
  mailDetailsCol: {
    flex: 1,
    paddingRight: 24,
  },
  senderTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderNameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  senderNameText: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.neutral.text,
    fontWeight: '600',
  },
  senderNameTextUnread: {
    fontWeight: '700',
  },
  mailTimeText: {
    fontSize: 11,
    color: colors.neutral.gray600,
  },
  subjectText: {
    fontSize: 13,
    color: colors.neutral.text,
    fontWeight: '400',
    marginBottom: 4,
  },
  subjectTextUnread: {
    fontWeight: '400',
    color: colors.brand.primary,
  },
  bodyPreviewText: {
    fontSize: 12,
    color: colors.neutral.gray700,
    lineHeight: 16,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  attachmentCountText: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  accountTag: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
  },
  accountTagText: {
    fontSize: 9,
    fontWeight: '400',
  },
  starTouchArea: {
    position: 'absolute',
    right: 16,
    bottom: 14,
    padding: 4,
  },
  actionsPanel: {
    flexDirection: 'row',
    height: '100%',
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    width: 210,
  },
  swipeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeBtnText: {
    fontSize: 9,
    fontWeight: '400',
    color: colors.neutral.text,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
