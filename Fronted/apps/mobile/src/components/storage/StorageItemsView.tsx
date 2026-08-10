
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { MoreVertical, ShieldCheck, FolderOpen, Lock } from 'lucide-react-native';
import { StorageItem } from '../../stores/storageStore';
import { renderItemIcon } from './storageItemIcon';
import StorageItemsGrid from './StorageItemsGrid';
import { ViewMode } from '../layout/ViewModeToggle';

interface StorageItemsViewProps {
  items: StorageItem[];
  /** Ids protected with the global PIN: they show a lock and ask for it on open */
  protectedIds: string[];
  onOpenItem: (item: StorageItem) => void;
  onOpenMenu: (item: StorageItem) => void;
  /** Flat rows by default; 'grid' delegates to the adaptive card grid */
  viewMode: ViewMode;
}

/**
 * Single-column list of files and folders: flat rows (no cards) with the
 * same anatomy as the mail list — round icon, name, meta and date.
 */
export default function StorageItemsView({ items, protectedIds, onOpenItem, onOpenMenu, viewMode }: StorageItemsViewProps) {
  if (items.length === 0) {
    // Empty State
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <FolderOpen size={40} color={colors.neutral.gray400} />
        </View>
        <Text style={styles.emptyTitle}>Carpeta Vacía</Text>
        <Text style={styles.emptyDesc}>
          No hay archivos ni carpetas que mostrar en este directorio.
        </Text>
      </View>
    );
  }

  if (viewMode === 'grid') {
    return (
      <StorageItemsGrid
        items={items}
        protectedIds={protectedIds}
        onOpenItem={onOpenItem}
        onOpenMenu={onOpenMenu}
      />
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.row, index < items.length - 1 && styles.rowSeparator]}
          onPress={() => onOpenItem(item)}
          activeOpacity={0.7}
        >
          <View style={styles.iconCircle}>{renderItemIcon(item)}</View>

          <View style={styles.details}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              {protectedIds.includes(item.id) && <Lock size={12} color={colors.brand.primary} />}
            </View>
            <Text style={styles.subtext} numberOfLines={1}>
              {item.type === 'folder'
                ? `${item.itemCount || 0} ${item.itemCount === 1 ? 'elemento' : 'elementos'}`
                : item.size}
            </Text>
          </View>

          <View style={styles.metaCol}>
            <Text style={styles.dateText}>{item.updatedAt}</Text>
            {item.isSigned && (
              <View style={styles.signedTag}>
                <ShieldCheck size={10} color={colors.brand.primary} />
                <Text style={styles.signedTagText}>Firmado</Text>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={() => onOpenMenu(item)} activeOpacity={0.7} style={styles.menuBtn}>
            <MoreVertical size={18} color={colors.neutral.gray500} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.neutral.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  rowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray50,
    marginRight: 12,
  },
  details: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  subtext: {
    fontSize: 11.5,
    color: colors.neutral.gray600,
    fontWeight: '400',
    marginTop: 2,
  },
  metaCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: colors.neutral.gray500,
    fontWeight: '400',
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
  menuBtn: {
    paddingLeft: spacing.sm,
    paddingVertical: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  emptyIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 18,
  },
});
