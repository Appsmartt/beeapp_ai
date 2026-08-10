
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { CalendarEvent, TODAY_STR } from '../../stores/calendarStore';
import { parseDate, formatDate, startOfWeek, periodLabel } from '../../utils/dateHelpers';

const WEEK_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface CalendarWeekStripProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onShift: (direction: -1 | 1) => void;
  /** Label of the period being navigated (week range or month) */
  label: string;
  onOpenMonthPicker?: () => void;
  onOpenYearPicker?: () => void;
}

/**
 * Compact horizontal day strip: one visible week in a row, with side arrows
 * to move through time. Replaces the full month grid as the default view.
 */
export default function CalendarWeekStrip({
  events,
  selectedDate,
  onSelectDate,
  onShift,
  label,
  onOpenMonthPicker,
  onOpenYearPicker,
}: CalendarWeekStripProps) {
  const start = startOfWeek(parseDate(selectedDate));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d, str: formatDate(d) };
  });

  return (
    <View style={styles.wrap}>
      {/* Period navigation */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} onPress={() => onShift(-1)} activeOpacity={0.7}>
          <ChevronLeft size={18} color={colors.brand.primary} />
        </TouchableOpacity>
        <View style={styles.labelContainer}>
          <TouchableOpacity onPress={onOpenMonthPicker} activeOpacity={0.7}>
            <Text style={styles.navLabel}>{label}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenYearPicker} activeOpacity={0.7} style={{ marginLeft: 6 }}>
            <Text style={[styles.navLabel, { color: colors.brand.primary }]}>
              {parseDate(selectedDate).getFullYear()}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.navBtn} onPress={() => onShift(1)} activeOpacity={0.7}>
          <ChevronRight size={18} color={colors.brand.primary} />
        </TouchableOpacity>
      </View>

      {/* Days of the visible week */}
      <View style={styles.daysRow}>
        {days.map((day, idx) => {
          const isSelected = day.str === selectedDate;
          const isToday = day.str === TODAY_STR;
          const hasEvents = events.some((e) => e.date === day.str);
          return (
            <TouchableOpacity
              key={day.str}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              onPress={() => onSelectDate(day.str)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                {WEEK_LABELS[idx]}
              </Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected, !isSelected && isToday && styles.dayNumberToday]}>
                {day.date.getDate()}
              </Text>
              <View
                style={[
                  styles.eventDot,
                  hasEvents && styles.eventDotVisible,
                  hasEvents && isSelected && styles.eventDotSelected,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: colors.brand.primary,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginBottom: 2,
  },
  dayLabelSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  dayNumberSelected: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
  dayNumberToday: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  eventDotVisible: {
    backgroundColor: colors.brand.primary,
  },
  eventDotSelected: {
    backgroundColor: colors.neutral.white,
  },
});
