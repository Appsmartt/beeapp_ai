import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronRight,
  Clock3,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import { formatTime12Label } from '../../utils/timeFormatHelpers';
import IsoTimePickerSheet from './IsoTimePickerSheet';

type IsoTimePickerFieldProps = {
  label: string;
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  sheetTitle?: string;
  sheetSubtitle?: string;
};

export default function IsoTimePickerField({
  label,
  value,
  onChange,
  placeholder = 'Selecciona una hora',
  disabled = false,
  sheetTitle,
  sheetSubtitle,
}: IsoTimePickerFieldProps) {
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[
          styles.field,
          disabled && styles.fieldDisabled,
        ]}
        onPress={() => setSheetVisible(true)}
        activeOpacity={0.75}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <Clock3
          size={16}
          color={
            disabled
              ? colors.neutral.gray400
              : colors.brand.primary
          }
        />

        <Text
          style={[
            styles.fieldText,
            !value.trim() && styles.placeholderText,
            disabled && styles.fieldTextDisabled,
          ]}
        >
          {value.trim()
            ? formatTime12Label(value)
            : placeholder}
        </Text>

        <ChevronRight
          size={16}
          color={colors.neutral.gray400}
        />
      </TouchableOpacity>

      <IsoTimePickerSheet
        visible={sheetVisible}
        value={value}
        title={sheetTitle}
        subtitle={sheetSubtitle}
        onClose={() => setSheetVisible(false)}
        onConfirm={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.neutral.gray50,
  },
  fieldDisabled: {
    backgroundColor: colors.neutral.gray100,
    opacity: 0.85,
  },
  fieldText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral.text,
  },
  fieldTextDisabled: {
    color: colors.neutral.gray500,
  },
  placeholderText: {
    color: colors.neutral.gray400,
  },
});
