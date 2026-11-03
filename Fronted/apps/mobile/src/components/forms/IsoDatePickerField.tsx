import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Calendar,
  ChevronRight,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import { formatDateLongLabel } from '../../utils/dateHelpers';
import IsoDatePickerSheet from './IsoDatePickerSheet';

type IsoDatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  minDate?: string | null;
  sheetTitle?: string;
  sheetSubtitle?: string;
};

export default function IsoDatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Selecciona una fecha',
  minDate = null,
  sheetTitle,
  sheetSubtitle,
}: IsoDatePickerFieldProps) {
  const [sheetVisible, setSheetVisible] = useState(false);

  const displayLabel = value.trim()
    ? formatDateLongLabel(value)
    : placeholder;

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={styles.field}
        onPress={() => setSheetVisible(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Abre el calendario para elegir la fecha"
      >
        <Calendar
          size={16}
          color={colors.brand.primary}
        />

        <Text
          style={[
            styles.fieldText,
            !value.trim() && styles.placeholderText,
          ]}
          numberOfLines={2}
        >
          {displayLabel}
        </Text>

        <ChevronRight
          size={16}
          color={colors.neutral.gray400}
        />
      </TouchableOpacity>

      <IsoDatePickerSheet
        visible={sheetVisible}
        value={value}
        minDate={minDate}
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
  fieldText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral.text,
    textTransform: 'capitalize',
  },
  placeholderText: {
    color: colors.neutral.gray400,
  },
});
