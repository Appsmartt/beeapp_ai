import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Megaphone,
  MessageCircle,
  Users,
} from 'lucide-react-native';
import {
  colors,
  radii,
} from '@beeapp/design-system';

interface ChatCreateMenuProps {
  visible: boolean;
  onNewChat: () => void;
  onNewGroup: () => void;
  onNewCommunity: () => void;
  onClose: () => void;
}

export default function ChatCreateMenu({
  visible,
  onNewChat,
  onNewGroup,
  onNewCommunity,
  onClose,
}: ChatCreateMenuProps) {
  const options = [
    {
      icon: MessageCircle,
      label: 'Nuevo chat',
      onPress: onNewChat,
    },
    {
      icon: Users,
      label: 'Nuevo grupo',
      onPress: onNewGroup,
    },
    {
      icon: Megaphone,
      label: 'Nueva comunidad',
      onPress: onNewCommunity,
    },
  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menu}>
          {options.map((option, index) => {
            const Icon = option.icon;

            return (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.row,
                  index < options.length - 1
                    ? styles.rowSeparator
                    : null,
                ]}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <Icon
                  size={18}
                  color={colors.brand.primary}
                />

                <Text style={styles.label}>
                  {option.label}
                </Text>
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
    backgroundColor: 'rgba(26, 26, 46, 0.2)',
    flex: 1,
  },
  menu: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.lg,
    borderWidth: 1,
    elevation: 6,
    minWidth: 200,
    position: 'absolute',
    right: 20,
    shadowColor: colors.neutral.text,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    top: 96,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowSeparator: {
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
  },
  label: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '400',
  },
});
