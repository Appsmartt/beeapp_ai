import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';

export type ChatTab = 'chats' | 'communities' | 'contacts';

const TABS: { id: ChatTab; label: string }[] = [
  { id: 'chats', label: 'Chats' },
  { id: 'communities', label: 'Comunidades' },
  { id: 'contacts', label: 'Contactos' },
];

interface ChatTabsProps {
  activeTab: ChatTab;
  onChange: (tab: ChatTab) => void;
}

/** Underline tabs of the chat module: conversations, communities or contacts */
export default function ChatTabs({ activeTab, onChange }: ChatTabsProps) {
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.brand.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  labelActive: {
    fontWeight: '600',
    color: colors.brand.primary,
  },
});
