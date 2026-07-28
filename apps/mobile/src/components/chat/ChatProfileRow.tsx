import { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { Search } from 'lucide-react-native';

interface ChatProfileRowProps {
  icon: typeof Search;
  label: string;
  subtitle?: string;
  /** Paints the icon and the label in red (destructive action) */
  danger?: boolean;
  onPress?: () => void;
  /** When provided the row shows a switch on the right instead of nothing */
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  right?: ReactNode;
}

/** Flat action row of the chat profile: icon, label, optional subtitle and right slot */
export default function ChatProfileRow({
  icon: Icon,
  label,
  subtitle,
  danger,
  onPress,
  switchValue,
  onSwitchChange,
  right,
}: ChatProfileRowProps) {
  const tint = danger ? colors.semantic.error : colors.neutral.gray700;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      // Rows that only carry a switch are not tappable themselves
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <Icon size={20} color={tint} />

      <View style={styles.texts}>
        <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {onSwitchChange ? (
        <Switch
          value={!!switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.neutral.gray300, true: colors.brand.primary }}
          thumbColor={colors.neutral.white}
        />
      ) : (
        right
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  texts: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  labelDanger: {
    color: colors.semantic.error,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
});
