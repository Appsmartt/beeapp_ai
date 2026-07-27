
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Inbox, Mail, Send, File, Star, AlertOctagon, Trash2 } from 'lucide-react-native';

export type MailFolder = 'inbox' | 'unread' | 'sent' | 'drafts' | 'starred' | 'spam' | 'trash';

const FOLDERS: { id: MailFolder; label: string; icon: typeof Inbox }[] = [
  { id: 'inbox', label: 'Recibidos', icon: Inbox },
  { id: 'unread', label: 'No leídos', icon: Mail },
  { id: 'sent', label: 'Enviados', icon: Send },
  { id: 'drafts', label: 'Borradores', icon: File },
  { id: 'starred', label: 'Importantes', icon: Star },
  { id: 'spam', label: 'Spam', icon: AlertOctagon },
  { id: 'trash', label: 'Papelera', icon: Trash2 },
];

interface MailFolderChipsProps {
  activeFolder: MailFolder;
  onFolderChange: (folder: MailFolder) => void;
  getUnreadCount: (folder: string) => number;
}

export default function MailFolderChips({ activeFolder, onFolderChange, getUnreadCount }: MailFolderChipsProps) {
  return (
    <View style={styles.foldersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.foldersScroll}>
        {FOLDERS.map((folder) => {
          const isActive = activeFolder === folder.id;
          const unreadCount = getUnreadCount(folder.id);
          const IconComp = folder.icon;

          return (
            <TouchableOpacity
              key={folder.id}
              style={[styles.folderChip, isActive && styles.folderChipActive]}
              onPress={() => onFolderChange(folder.id)}
              activeOpacity={0.7}
            >
              <IconComp size={12} color={isActive ? colors.brand.primary : colors.neutral.gray600} style={{ marginRight: 6 }} />
              <Text style={[styles.folderChipText, isActive && styles.folderChipTextActive]}>
                {folder.label}
              </Text>
              {unreadCount > 0 && (
                <View style={[styles.unreadBadge, isActive && styles.unreadBadgeActive]}>
                  <Text style={[styles.unreadBadgeText, isActive && styles.unreadBadgeTextActive]}>
                    {unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  foldersContainer: {
    paddingVertical: 10,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  foldersScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  folderChipActive: {
    backgroundColor: colors.brand.primary + '15',
    borderColor: colors.brand.primary,
  },
  folderChipText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  folderChipTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.neutral.gray400,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  unreadBadgeActive: {
    backgroundColor: colors.brand.primary,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  unreadBadgeTextActive: {
    color: colors.neutral.white,
  },
});
