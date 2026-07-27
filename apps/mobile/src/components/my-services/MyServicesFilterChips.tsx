import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radii, typography } from '@beeapp/design-system';
import { LayoutGrid, Package, Wrench } from 'lucide-react-native';

export type MyServicesFilter = 'all' | 'product' | 'service';

const FILTERS: { id: MyServicesFilter; label: string; icon: typeof Package }[] = [
  { id: 'all', label: 'Todos', icon: LayoutGrid },
  { id: 'product', label: 'Productos', icon: Package },
  { id: 'service', label: 'Servicios', icon: Wrench },
];

interface MyServicesFilterChipsProps {
  activeFilter: MyServicesFilter;
  onChange: (filter: MyServicesFilter) => void;
}

/** Content filter of BeeServices, same anatomy as the mail folder chips */
export default function MyServicesFilterChips({ activeFilter, onChange }: MyServicesFilterChipsProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.id;
          const Icon = filter.icon;
          return (
            <TouchableOpacity
              key={filter.id}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => onChange(filter.id)}
              activeOpacity={0.7}
            >
              <Icon size={13} color={isActive ? colors.brand.primary : colors.neutral.gray600} />
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 10,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  chipActive: {
    backgroundColor: colors.brand.primary + '15',
    borderColor: colors.brand.primary,
  },
  chipText: {
    fontSize: parseInt(typography.fontSize.caption, 10),
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  chipTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
});
