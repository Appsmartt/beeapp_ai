import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { colors, radii } from '@beeapp/design-system';
import { MessageCircle, Users, Megaphone } from 'lucide-react-native';

interface ChatCreateMenuProps {
  visible: boolean;
  onNewChat: () => void;
  onNewGroup: () => void;
  onNewCommunity: () => void;
  onClose: () => void;
}

/** Menu anchored under the create button of the chat module header */
export default function ChatCreateMenu({
  visible,
  onNewChat,
  onNewGroup,
  onNewCommunity,
  onClose,
}: ChatCreateMenuProps) {
  const options = [
    { icon: MessageCircle, label: 'Nuevo chat', onPress: onNewChat },
    { icon: Users, label: 'Nuevo grupo', onPress: onNewGroup },
    { icon: Megaphone, label: 'Nueva comunidad', onPress: onNewCommunity },
  ];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      {/* Tapping anywhere outside closes the menu */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.menu}>
          {options.map((option, index) => {
            const Icon = option.icon;
            return (
              <TouchableOpacity
                key={option.label}
                style={[styles.row, index < options.length - 1 && styles.rowSeparator]}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <Icon size={18} color={colors.brand.primary} />
                <Text style={styles.label}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.2)',
  },
  // Anchored right under the header button
  menu: {
    position: 'absolute',
    top: 96,
    right: 20,
    minWidth: 200,
    backgroundColor: colors.neutral.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: colors.neutral.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
});
