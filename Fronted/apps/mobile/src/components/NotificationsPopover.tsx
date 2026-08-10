
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { colors } from '@beeapp/design-system';
import { X, ChevronRight } from 'lucide-react-native';
import { TickerItem } from '../mocks/tabNotifications';
import { KIND_ICONS, KIND_COLORS } from './NotificationTicker';

interface NotificationsPopoverProps {
  visible: boolean;
  title: string;
  items: TickerItem[];
  /** Ids already opened: they lose the unread dot and no longer count */
  readIds: string[];
  onClose: () => void;
  onSelectItem: (item: TickerItem) => void;
}

/**
 * Small window anchored above the floating tab bar listing ALL the
 * notifications of one category. Tapping an item opens that element
 * (handled by the caller, inside the embedded module — no route change).
 */
export default function NotificationsPopover({ visible, title, items, readIds, onClose, onSelectItem }: NotificationsPopoverProps) {
  const unreadCount = items.filter((i) => !readIds.includes(i.id)).length;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.panelTitle}>{title}</Text>
              {unreadCount > 0 && (
                <View style={styles.headerCount}>
                  <Text style={styles.headerCountText}>{unreadCount > 9 ? '9+' : unreadCount} sin leer</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={16} color={colors.neutral.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {items.map((item, idx) => {
              const Icon = KIND_ICONS[item.kind];
              const tint = KIND_COLORS[item.kind];
              const isUnread = !readIds.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.row, idx === items.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => onSelectItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rowIconWrap, { backgroundColor: `${tint}18` }]}>
                    <Icon size={16} color={tint} />
                  </View>
                  <View style={styles.rowTextCol}>
                    <Text style={[styles.rowText, !isUnread && styles.rowTextRead]} numberOfLines={2}>
                      {item.text}
                    </Text>
                    <Text style={styles.rowTime}>{item.time}</Text>
                  </View>
                  {isUnread && <View style={styles.unreadDot} />}
                  <ChevronRight size={14} color={colors.neutral.gray400} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(26, 26, 46, 0.3)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 120 : 108,
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    maxHeight: '55%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCount: {
    backgroundColor: colors.semantic.error + '15',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  headerCountText: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.semantic.error,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.semantic.error,
    marginRight: 8,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  rowText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  rowTextRead: {
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  rowTime: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray500,
    marginTop: 2,
  },
});
