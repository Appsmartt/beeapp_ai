import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { ShieldCheck, Lock } from 'lucide-react-native';
import { StorageItem } from '../../stores/storageStore';
import { renderItemIcon } from './storageItemIcon';
import { useGridColumns } from '../layout/ViewModeToggle';

const GAP = 12;

interface StorageItemsGridProps {
  items: StorageItem[];
  /** Ids protected with the global PIN: they show a lock and ask for it on open */
  protectedIds: string[];
  onOpenItem: (item: StorageItem) => void;
  onOpenMenu: (item: StorageItem) => void;
}

/** Adaptive grid of files and folders: two columns on phones, three from tablet up */
export default function StorageItemsGrid({ items, protectedIds, onOpenItem, onOpenMenu }: StorageItemsGridProps) {
  const columns = useGridColumns();

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.cell, { width: `${100 / columns}%` }]}
          onPress={() => onOpenItem(item)}
          onLongPress={() => onOpenMenu(item)}
          activeOpacity={0.8}
        >
          <View style={styles.card}>
            <View style={styles.iconCircle}>{renderItemIcon(item, 26)}</View>

            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {protectedIds.includes(item.id) && <Lock size={12} color={colors.brand.primary} />}
            </View>

            <Text style={styles.meta} numberOfLines={1}>
              {item.type === 'folder'
                ? `${item.itemCount || 0} ${item.itemCount === 1 ? 'elemento' : 'elementos'}`
                : item.size}
            </Text>

            {item.isSigned && (
              <View style={styles.signedTag}>
                <ShieldCheck size={10} color={colors.brand.primary} />
                <Text style={styles.signedTagText}>Firmado</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 20 - GAP / 2,
    paddingTop: spacing.sm,
  },
  // The width comes from the column count; the gap lives in the padding
  cell: {
    padding: GAP / 2,
  },
  card: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray50,
    marginBottom: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  name: {
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '400',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  meta: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  signedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  signedTagText: {
    fontSize: 9,
    fontWeight: '400',
    color: colors.brand.primary,
  },
});
