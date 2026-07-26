
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { MoreVertical, ShieldCheck, FolderOpen, Lock } from 'lucide-react-native';
import { StorageItem } from '../../stores/storageStore';
import { renderItemIcon } from './storageItemIcon';

interface StorageItemsViewProps {
  items: StorageItem[];
  /** Ids protected with the global PIN: they show a lock and ask for it on open */
  protectedIds: string[];
  viewMode: 'grid' | 'list';
  onOpenItem: (item: StorageItem) => void;
  onOpenMenu: (item: StorageItem) => void;
}

export default function StorageItemsView({ items, protectedIds, viewMode, onOpenItem, onOpenMenu }: StorageItemsViewProps) {
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
    // Grid View
    return (
      <View style={styles.gridViewContainer}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.gridCard}
            onPress={() => onOpenItem(item)}
            onLongPress={() => onOpenMenu(item)}
            activeOpacity={0.7}
          >
            {/* Ellipsis Options trigger */}
            <TouchableOpacity
              style={styles.cardEllipsis}
              onPress={() => onOpenMenu(item)}
              activeOpacity={0.7}
            >
              <MoreVertical size={16} color={colors.neutral.gray600} />
            </TouchableOpacity>

            {/* Visual icon representation */}
            <View style={styles.gridIconBox}>
              {renderItemIcon(item)}
              {protectedIds.includes(item.id) && (
                <View style={styles.lockBadge}>
                  <Lock size={10} color={colors.neutral.white} />
                </View>
              )}
            </View>

            {/* Metadata text */}
            <Text style={styles.gridName} numberOfLines={1}>
              {item.name}
            </Text>

            {item.type === 'folder' ? (
              <Text style={styles.gridSubtext}>
                {item.itemCount || 0} elementos
              </Text>
            ) : (
              <View style={styles.gridMetaRow}>
                <Text style={styles.gridSubtext}>{item.size}</Text>
                {item.isSigned && (
                  <View style={styles.signedTagMini}>
                    <ShieldCheck size={10} color="#7C3AED" />
                    <Text style={styles.signedTagMiniText}>Firmado</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // List View
  return (
    <View style={styles.listViewContainer}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.listRow}
          onPress={() => onOpenItem(item)}
          onLongPress={() => onOpenMenu(item)}
          activeOpacity={0.7}
        >
          <View style={styles.listIconBox}>
            {renderItemIcon(item)}
            {protectedIds.includes(item.id) && (
              <View style={styles.lockBadge}>
                <Lock size={10} color={colors.neutral.white} />
              </View>
            )}
          </View>

          <View style={styles.listDetails}>
            <Text style={styles.listName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.listMetaRow}>
              <Text style={styles.listSubtext}>
                {item.type === 'folder' ? `${item.itemCount || 0} elementos` : item.size}
              </Text>
              <Text style={styles.listDot}>•</Text>
              <Text style={styles.listSubtext}>{item.updatedAt}</Text>

              {item.isSigned && (
                <View style={styles.signedBadgeRow}>
                  <ShieldCheck size={11} color="#7C3AED" />
                  <Text style={styles.signedBadgeRowText}>Firmado</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity onPress={() => onOpenMenu(item)} activeOpacity={0.7} style={styles.listMenuBtn}>
            <MoreVertical size={18} color={colors.neutral.gray600} />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.neutral.white,
  },
  gridViewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    rowGap: 12,
  },
  gridCard: {
    // Percentage keeps exactly 2 columns both full screen and embedded in Home
    width: '48.5%',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 20,
    padding: 16,
    position: 'relative',
  },
  cardEllipsis: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  gridIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray50,
    marginBottom: 12,
  },
  gridName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.text,
    marginBottom: 4,
    paddingRight: 16,
  },
  gridSubtext: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '500',
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signedTagMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    gap: 2,
  },
  signedTagMiniText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#7C3AED',
  },
  listViewContainer: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  listIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray50,
    marginRight: 12,
  },
  listDetails: {
    flex: 1,
    paddingRight: 10,
  },
  listName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listSubtext: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '500',
  },
  listDot: {
    fontSize: 11,
    color: colors.neutral.gray400,
  },
  signedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
    marginLeft: 6,
  },
  signedBadgeRowText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#7C3AED',
  },
  listMenuBtn: {
    padding: 6,
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
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
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
