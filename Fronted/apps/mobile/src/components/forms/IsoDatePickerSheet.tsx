import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import {
  buildCalendarGridDays,
  formatDate,
  parseDate,
} from '../../utils/dateHelpers';

type IsoDatePickerSheetProps = {
  visible: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (isoDate: string) => void;
  title?: string;
  subtitle?: string;
  /** YYYY-MM-DD; days before this are disabled */
  minDate?: string | null;
};

export default function IsoDatePickerSheet({
  visible,
  value,
  onClose,
  onConfirm,
  title = 'Elige una fecha',
  subtitle = 'Selecciona el día del evento.',
  minDate = null,
}: IsoDatePickerSheetProps) {
  const [pendingDate, setPendingDate] = useState(value);
  const [calendarMonth, setCalendarMonth] = useState(
    () => parseDate(value || formatDate(new Date())),
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const initial = value || formatDate(new Date());
    setPendingDate(initial);
    setCalendarMonth(parseDate(initial));
  }, [visible, value]);

  const calendarMonthLabel = useMemo(
    () => new Intl.DateTimeFormat('es-CO', {
      month: 'long',
      year: 'numeric',
    }).format(calendarMonth),
    [calendarMonth],
  );

  const calendarDays = useMemo(
    () => buildCalendarGridDays(calendarMonth),
    [calendarMonth],
  );

  const selectDay = useCallback((day: number) => {
    const year = calendarMonth.getFullYear();
    const month = String(
      calendarMonth.getMonth() + 1,
    ).padStart(2, '0');
    setPendingDate(
      `${year}-${month}-${String(day).padStart(2, '0')}`,
    );
  }, [calendarMonth]);

  const isDayDisabled = (isoDate: string) => {
    if (!minDate) {
      return false;
    }

    return isoDate < minDate;
  };

  const confirmDisabled = !pendingDate
    || (minDate ? pendingDate < minDate : false);

  const handleConfirm = () => {
    if (confirmDisabled) {
      return;
    }

    onConfirm(pendingDate);
    onClose();
  };

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
              accessibilityLabel="Cerrar calendario"
            >
              <X
                size={21}
                color={colors.neutral.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.navigation}>
            <TouchableOpacity
              onPress={() => setCalendarMonth((current) => (
                new Date(
                  current.getFullYear(),
                  current.getMonth() - 1,
                  1,
                )
              ))}
              style={styles.navButton}
              accessibilityRole="button"
              accessibilityLabel="Mes anterior"
            >
              <ChevronLeft
                size={22}
                color={colors.neutral.text}
              />
            </TouchableOpacity>

            <Text style={styles.monthLabel}>
              {calendarMonthLabel}
            </Text>

            <TouchableOpacity
              onPress={() => setCalendarMonth((current) => (
                new Date(
                  current.getFullYear(),
                  current.getMonth() + 1,
                  1,
                )
              ))}
              style={styles.navButton}
              accessibilityRole="button"
              accessibilityLabel="Mes siguiente"
            >
              <ChevronRight
                size={22}
                color={colors.neutral.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
              <Text
                key={day}
                style={styles.weekdayLabel}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarDays.map((day, index) => {
              if (!day) {
                return (
                  <View
                    key={`empty-${index}`}
                    style={styles.dayCell}
                  />
                );
              }

              const year = calendarMonth.getFullYear();
              const month = String(
                calendarMonth.getMonth() + 1,
              ).padStart(2, '0');
              const isoDate = (
                `${year}-${month}-${String(day).padStart(2, '0')}`
              );
              const disabled = isDayDisabled(isoDate);
              const selected = isoDate === pendingDate;

              return (
                <TouchableOpacity
                  key={isoDate}
                  style={[
                    styles.dayCell,
                    selected && styles.dayCellSelected,
                  ]}
                  disabled={disabled}
                  onPress={() => selectDay(day)}
                  accessibilityRole="button"
                  accessibilityLabel={`Seleccionar día ${day}`}
                  accessibilityState={{
                    disabled,
                    selected,
                  }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      disabled && styles.dayTextDisabled,
                      selected && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              confirmDisabled && styles.confirmButtonDisabled,
            ]}
            disabled={confirmDisabled}
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel="Confirmar fecha"
          >
            <Text style={styles.confirmButtonText}>
              Confirmar fecha
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
    marginBottom: 16,
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
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray50,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
    textTransform: 'capitalize',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray500,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: colors.brand.primary,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.text,
  },
  dayTextDisabled: {
    color: colors.neutral.gray400,
  },
  dayTextSelected: {
    color: colors.neutral.white,
    fontWeight: '700',
  },
  confirmButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.brand.primary,
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});
