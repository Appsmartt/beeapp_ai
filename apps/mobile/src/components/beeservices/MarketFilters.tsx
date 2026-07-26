import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { LayoutGrid, Package, Handshake } from 'lucide-react-native';
import { BEE_CATEGORIES, ListingKind } from '../../mocks/beeservices';

export type KindFilter = 'all' | ListingKind;

interface KindTabsProps {
  value: KindFilter;
  onChange: (next: KindFilter) => void;
  counts: Record<KindFilter, number>;
}

const TABS: { id: KindFilter; label: string; icon: typeof Package }[] = [
  { id: 'all', label: 'Todo', icon: LayoutGrid },
  { id: 'product', label: 'Productos', icon: Package },
  { id: 'service', label: 'Servicios', icon: Handshake },
];

/** Segmented control: everything, only products or only services. */
export function KindTabs({ value, onChange, counts }: KindTabsProps) {
  return (
    <View style={styles.tabsRow}>
      {TABS.map((tab) => {
        const active = tab.id === value;
        const Icon = tab.icon;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.8}
          >
            <Icon size={13} color={active ? colors.neutral.white : colors.neutral.gray600} />
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            <Text style={[styles.tabCount, active && styles.tabCountActive]}>{counts[tab.id]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface CategoryRowProps {
  value: string | null;
  onChange: (next: string | null) => void;
}

/** Horizontal category chips; tapping the active one clears the filter. */
export function CategoryRow({ value, onChange }: CategoryRowProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
      <TouchableOpacity
        style={[styles.catChip, value === null && styles.catChipActive]}
        onPress={() => onChange(null)}
        activeOpacity={0.8}
      >
        <View style={[styles.catIcon, { backgroundColor: '#F3E8FF' }]}>
          <LayoutGrid size={13} color={colors.brand.primary} />
        </View>
        <Text style={[styles.catText, value === null && styles.catTextActive]}>Todas</Text>
      </TouchableOpacity>

      {BEE_CATEGORIES.map((cat) => {
        const active = cat.id === value;
        const Icon = cat.icon;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[styles.catChip, active && styles.catChipActive]}
            onPress={() => onChange(active ? null : cat.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
              <Icon size={13} color={cat.color} />
            </View>
            <Text style={[styles.catText, active && styles.catTextActive]}>{cat.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.neutral.gray100,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: colors.brand.primary,
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.neutral.gray700,
  },
  tabTextActive: {
    color: colors.neutral.white,
  },
  tabCount: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.neutral.gray600,
    backgroundColor: colors.neutral.white,
    borderRadius: 7,
    minWidth: 16,
    textAlign: 'center',
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  tabCountActive: {
    color: colors.brand.primary,
  },
  catScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 5,
    paddingRight: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  catChipActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#F9F5FF',
  },
  catIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  catTextActive: {
    color: colors.brand.primary,
    fontWeight: '800',
  },
});
