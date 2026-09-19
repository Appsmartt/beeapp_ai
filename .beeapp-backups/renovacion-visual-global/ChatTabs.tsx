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
    backgroundColor: '#EEE7FA',
    borderColor: '#D9C8EE',
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    borderRadius: 13,
    flex: 1,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: colors.neutral.white,
    elevation: 2,
    shadowColor: '#A38AC7',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  label: {
    color: '#836C9B',
    fontSize: 13,
    fontWeight: '600',
  },
  labelActive: {
    color: '#6E4C9E',
    fontWeight: '800',
  },
});
