import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { colors, radii } from '@beeapp/design-system';
import { List, Grid2x2 } from 'lucide-react-native';

export type ViewMode = 'list' | 'grid';

/** Columns of the adaptive grid: two on phones, three from tablet width up */
export function useGridColumns() {
  const { width } = useWindowDimensions();
  return width > 700 ? 3 : 2;
}

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/** List / grid switch shown in the header of Notes and Storage */
export default function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => onChange('list')}
        activeOpacity={0.7}
        accessibilityLabel="Ver en lista"
      >
        <List size={18} color={mode === 'list' ? colors.brand.primary : colors.neutral.gray500} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => onChange('grid')}
        activeOpacity={0.7}
        accessibilityLabel="Ver en cuadrícula"
      >
        <Grid2x2 size={18} color={mode === 'grid' ? colors.brand.primary : colors.neutral.gray500} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  btn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
