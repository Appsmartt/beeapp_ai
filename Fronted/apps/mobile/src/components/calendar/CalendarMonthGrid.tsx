
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { CalendarEvent, TODAY_STR } from '../../stores/calendarStore';
import { parseDate, formatDate } from '../../utils/dateHelpers';

interface CalendarMonthGridProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
}

export default function CalendarMonthGrid({ events, selectedDate, onSelectDate }: CalendarMonthGridProps) {
  // Check if date has events
  const dateHasEvents = (dateStr: string) => {
    return events.some((e) => e.date === dateStr);
  };

  // Grid of the month the selected date belongs to (weeks start on Monday)
  const selected = parseDate(selectedDate);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday
  const prefixes = Array.from({ length: firstWeekday });
  const monthDays = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(year, month, i + 1);
    return { dayNum: i + 1, dateStr: formatDate(date) };
  });

  return (
    <View style={styles.monthGrid}>
      {/* Days of Week Header */}
      {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((day) => (
        <Text key={day} style={styles.gridDayHeader}>{day}</Text>
      ))}

      {prefixes.map((_, i) => (
        <View key={`pre-${i}`} style={styles.gridDayBoxEmpty} />
      ))}

      {monthDays.map(({ dayNum, dateStr }) => {
        const isToday = dateStr === TODAY_STR;
        const isSelected = dateStr === selectedDate;
        const hasEvent = dateHasEvents(dateStr);

        return (
          <TouchableOpacity
            key={dateStr}
            style={[
              styles.gridDayBox,
              isToday && styles.gridDayBoxToday,
              isSelected && styles.gridDayBoxSelected,
            ]}
            onPress={() => onSelectDate(dateStr)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.gridDayText,
                isToday && styles.gridDayTextToday,
                isSelected && styles.gridDayTextSelected,
              ]}
            >
              {dayNum}
            </Text>
            {hasEvent && (
              <View
                style={[
                  styles.gridEventDot,
                  isSelected && { backgroundColor: colors.neutral.white },
                ]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  gridDayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginBottom: 8,
  },
  gridDayBox: {
    width: '14.28%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 4,
    position: 'relative',
  },
  gridDayBoxEmpty: {
    width: '14.28%',
    height: 44,
  },
  gridDayBoxToday: {
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
  },
  gridDayBoxSelected: {
    backgroundColor: colors.brand.primary,
  },
  gridDayText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  gridDayTextToday: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  gridDayTextSelected: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
  gridEventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand.primary,
    position: 'absolute',
    bottom: 6,
  },
});
