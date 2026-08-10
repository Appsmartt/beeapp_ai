
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { FILTER_OPTIONS, SearchFilterType } from './searchFilters';

export interface FilterAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SearchFilterMenuProps {
  /** Trigger position in window coords; null keeps the menu closed */
  anchor: FilterAnchor | null;
  activeFilter: SearchFilterType | null;
  onSelect: (filter: SearchFilterType) => void;
  onClose: () => void;
}

const MENU_WIDTH = 220;
const EDGE_GAP = spacing.md;

/**
 * Content-type dropdown for the Home search. Lives in a transparent Modal so it
 * always paints above the chips and the embedded module, anchored to its button.
 */
export default function SearchFilterMenu({ anchor, activeFilter, onSelect, onClose }: SearchFilterMenuProps) {
  if (!anchor) return null;

  // Keep the menu inside the screen no matter where the trigger sits
  const screenWidth = Dimensions.get('window').width;
  const left = Math.min(Math.max(anchor.x, EDGE_GAP), screenWidth - MENU_WIDTH - EDGE_GAP);
  const top = anchor.y + anchor.height + spacing.sm;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {/* Tapping outside closes the menu */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={[styles.menu, { top, left }]}>
          <Text style={styles.title}>¿Qué quieres buscar?</Text>
          {FILTER_OPTIONS.map((opt) => {
            const isActive = activeFilter === opt.id;
            const OptIcon = opt.icon;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.item, isActive && styles.itemActive]}
                onPress={() => onSelect(opt.id)}
                activeOpacity={0.7}
              >
                <OptIcon size={16} color={isActive ? colors.brand.primary : colors.neutral.gray600} />
                <Text style={[styles.itemText, isActive && styles.itemTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  itemActive: {
    backgroundColor: '#F9F5FF',
  },
  itemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  itemTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
});
