import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  colors,
} from '@beeapp/design-system';

export type ChatTab =
  | 'chats'
  | 'groups';

const TABS: Array<{
  id: ChatTab;
  label: string;
}> = [
  {
    id: 'chats',
    label: 'Chats',
  },
  {
    id: 'groups',
    label: 'Grupos',
  },
];

interface ChatTabsProps {
  activeTab: ChatTab;
  onChange: (tab: ChatTab) => void;
}

export default function ChatTabs({
  activeTab,
  onChange,
}: ChatTabsProps) {
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              isActive
                ? styles.tabActive
                : null,
            ]}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.label,
                isActive
                  ? styles.labelActive
                  : null,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  tab: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    flex: 1,
    paddingVertical: 12,
  },
  tabActive: {
    borderBottomColor: colors.brand.primary,
  },
  label: {
    color: colors.neutral.gray600,
    fontSize: 14,
    fontWeight: '400',
  },
  labelActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
});
