
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, ArrowUpDown, Plus } from 'lucide-react-native';
import { SortOption } from '../../utils/storageHelpers';
import ViewModeToggle, { ViewMode } from '../layout/ViewModeToggle';
import ModuleNotificationBell from '../ModuleNotificationBell';

interface StorageHeaderProps {
  /** Omitted when there is nothing to go back to (root of an embedded module) */
  onBack?: () => void;
  /** Create/upload action shown in the header while embedded (instead of a FAB) */
  onAction?: () => void;
  sortBy: SortOption;
  onSortChange: (next: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function StorageHeader({ onBack, onAction, sortBy, onSortChange, viewMode, onViewModeChange }: StorageHeaderProps) {
  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <View style={styles.headerLeftCol}>
            {onBack && (
              <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                <ChevronLeft size={24} color={colors.neutral.text} />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>Almacenamiento</Text>
          </View>

          <View style={styles.headerControls}>
            <ModuleNotificationBell moduleId="files" />
            {onAction && (
              <TouchableOpacity onPress={onAction} style={styles.headerActionBtn} activeOpacity={0.8}>
                <Plus size={18} color={colors.neutral.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.bottomRow}>
          <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
          <TouchableOpacity
            onPress={() => {
              const nextSort: Record<SortOption, SortOption> = { name: 'date', date: 'size', size: 'type', type: 'name' };
              onSortChange(nextSort[sortBy]);
            }}
            style={styles.controlIconBtn}
            activeOpacity={0.7}
            accessibilityLabel="Ordenar archivos"
          >
            <ArrowUpDown size={18} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  headerLeftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
