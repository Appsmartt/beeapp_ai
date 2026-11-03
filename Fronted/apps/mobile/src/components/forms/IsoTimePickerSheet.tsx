import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import {
  formatTime24,
  parseTime24,
  to12HourParts,
  to24Hour,
  type DayPeriod,
} from '../../utils/timeFormatHelpers';

type IsoTimePickerSheetProps = {
  visible: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (time: string) => void;
  title?: string;
  subtitle?: string;
};

const HOURS_12 = Array.from(
  { length: 12 },
  (_, index) => index + 1,
);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);
const PERIODS: DayPeriod[] = ['AM', 'PM'];
const ITEM_HEIGHT = 44;

function padMinute(value: number): string {
  return String(value).padStart(2, '0');
}

function formatPreview12(
  hour12: number,
  minute: number,
  period: DayPeriod,
): string {
  return `${hour12}:${padMinute(minute)} ${period}`;
}

export default function IsoTimePickerSheet({
  visible,
  value,
  onClose,
  onConfirm,
  title = 'Elige una hora',
  subtitle = 'Selecciona hora, minutos y jornada AM o PM.',
}: IsoTimePickerSheetProps) {
  const initial24 = parseTime24(value);
  const initial12 = to12HourParts(initial24.hour);

  const [hour12, setHour12] = useState(initial12.hour12);
  const [minute, setMinute] = useState(initial24.minute);
  const [period, setPeriod] = useState<DayPeriod>(
    initial12.period,
  );

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const next24 = parseTime24(value);
    const next12 = to12HourParts(next24.hour);
    setHour12(next12.hour12);
    setMinute(next24.minute);
    setPeriod(next12.period);

    const scrollTimeout = setTimeout(() => {
      hourScrollRef.current?.scrollTo({
        y: (next12.hour12 - 1) * ITEM_HEIGHT,
        animated: false,
      });
      minuteScrollRef.current?.scrollTo({
        y: next24.minute * ITEM_HEIGHT,
        animated: false,
      });
    }, 0);

    return () => clearTimeout(scrollTimeout);
  }, [visible, value]);

  const handleConfirm = () => {
    const hour24 = to24Hour(hour12, period);
    onConfirm(formatTime24(hour24, minute));
    onClose();
  };

  const renderColumnItem = (
    key: string | number,
    label: string,
    selected: boolean,
    onSelect: () => void,
  ) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.columnItem,
        selected && styles.columnItemSelected,
      ]}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text
        style={[
          styles.columnItemText,
          selected && styles.columnItemTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
      >
        <Pressable
          style={styles.sheet}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Cerrar selector de hora"
            >
              <X
                size={21}
                color={colors.neutral.text}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.previewTime}>
            {formatPreview12(hour12, minute, period)}
          </Text>

          <View style={styles.periodRow}>
            {PERIODS.map((option) => {
              const selected = option === period;

              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.periodChip,
                    selected && styles.periodChipSelected,
                  ]}
                  onPress={() => setPeriod(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={
                    option === 'AM'
                      ? 'Jornada de la mañana'
                      : 'Jornada de la tarde y noche'
                  }
                >
                  <Text
                    style={[
                      styles.periodChipText,
                      selected && styles.periodChipTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.columnsHeader}>
            <Text style={styles.columnTitle}>Hora</Text>
            <Text style={styles.columnTitle}>Minutos</Text>
          </View>

          <View style={styles.columns}>
            <ScrollView
              ref={hourScrollRef}
              style={styles.columnScroll}
              contentContainerStyle={styles.columnContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {HOURS_12.map((hourValue) => renderColumnItem(
                hourValue,
                String(hourValue),
                hourValue === hour12,
                () => setHour12(hourValue),
              ))}
            </ScrollView>

            <View style={styles.columnDivider} />

            <ScrollView
              ref={minuteScrollRef}
              style={styles.columnScroll}
              contentContainerStyle={styles.columnContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {MINUTES.map((minuteValue) => renderColumnItem(
                minuteValue,
                padMinute(minuteValue),
                minuteValue === minute,
                () => setMinute(minuteValue),
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel="Confirmar hora"
          >
            <Text style={styles.confirmButtonText}>
              Confirmar hora
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.neutral.gray600,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray100,
  },
  previewTime: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    color: colors.brand.primary,
    marginBottom: 12,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  periodChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.gray50,
  },
  periodChipSelected: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary + '18',
  },
  periodChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  periodChipTextSelected: {
    color: colors.brand.primary,
    fontWeight: '800',
  },
  columnsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  columnTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  columns: {
    flexDirection: 'row',
    height: ITEM_HEIGHT * 5,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.neutral.gray50,
    marginBottom: 18,
  },
  columnScroll: {
    flex: 1,
  },
  columnContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  columnDivider: {
    width: 1,
    backgroundColor: colors.neutral.gray200,
  },
  columnItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    borderRadius: 10,
  },
  columnItemSelected: {
    backgroundColor: colors.brand.primary,
  },
  columnItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  columnItemTextSelected: {
    color: colors.neutral.white,
  },
  confirmButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.brand.primary,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});
