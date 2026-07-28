import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Users, Globe, Phone } from 'lucide-react-native';

export type ContactsTab = 'my' | 'discover' | 'calls';

const TABS: { id: ContactsTab; label: string; icon: typeof Users }[] = [
  { id: 'my', label: 'Mis contactos', icon: Users },
  { id: 'discover', label: 'Descubrir red', icon: Globe },
  { id: 'calls', label: 'Llamadas', icon: Phone },
];

interface ContactsTabsProps {
  activeTab: ContactsTab;
  onChange: (tab: ContactsTab) => void;
}

/** Segmented selector of the contacts module */
export default function ContactsTabs({ activeTab, onChange }: ContactsTabsProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, isActive && styles.tabBtnActive]}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.8}
          >
            <Icon size={15} color={isActive ? colors.brand.primary : colors.neutral.gray600} />
            <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: colors.neutral.white,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  tabBtnTextActive: {
    fontWeight: '600',
    color: colors.brand.primary,
  },
});
