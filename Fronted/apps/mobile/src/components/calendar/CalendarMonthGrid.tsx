import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  colors,
} from '@beeapp/design-system';

import type {
  CalendarEvent,
} from '../../stores/calendarStore';
import {
  formatDate,
  parseDate,
} from '../../utils/dateHelpers';


interface CalendarMonthGridProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}


function getTodayString(): string {
  const today = new Date();


  return formatDate(today);
}


export default function CalendarMonthGrid({
  events,
  selectedDate,
  onSelectDate,
}: CalendarMonthGridProps) {
  const selected = parseDate(selectedDate);
  const year = selected.getFullYear();
  const month = selected.getMonth();


  const totalDays = new Date(
    year,
    month + 1,
    0,
  ).getDate();


  const firstWeekday = (
    new Date(year, month, 1).getDay() + 6
  ) % 7;


  const prefixes = Array.from({
    length: firstWeekday,
  });


  const monthDays = Array.from(
    {
      length: totalDays,
    },
    (_, index) => {
      const date = new Date(
        year,
        month,
        index + 1,
      );


      return {
        dayNumber: index + 1,
        dateString: formatDate(date),
      };
    },
  );


  const eventsByDate = events.reduce(
    (accumulator, event) => {
      const existingEvents = accumulator.get(
        event.date,
      ) || [];


      accumulator.set(
        event.date,
        [
          ...existingEvents,
          event,
        ],
      );


      return accumulator;
    },
    new Map<string, CalendarEvent[]>(),
  );


  const todayString = getTodayString();


  return (
    <View style={styles.monthGrid}>
      {[
        'LUN',
        'MAR',
        'MIÉ',
        'JUE',
        'VIE',
        'SÁB',
        'DOM',
      ].map((day) => (
        <Text
          key={day}
          style={styles.gridDayHeader}
        >
          {day}
        </Text>
      ))}


      {prefixes.map((_, index) => (
        <View
          key={`pre-${index}`}
          style={styles.gridDayBoxEmpty}
        />
      ))}


      {monthDays.map(({
        dayNumber,
        dateString,
      }) => {
        const isToday = dateString === todayString;
        const isSelected = dateString === selectedDate;
        const dayEvents = eventsByDate.get(
          dateString,
        ) || [];
        const primaryColor = dayEvents[0]?.color
          || colors.brand.primary;


        return (
          <TouchableOpacity
            key={dateString}
            style={[
              styles.gridDayBox,
              isToday && styles.gridDayBoxToday,
              isSelected && styles.gridDayBoxSelected,
            ]}
            onPress={() => onSelectDate(dateString)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.gridDayText,
                isToday && styles.gridDayTextToday,
                isSelected && styles.gridDayTextSelected,
              ]}
            >
              {dayNumber}
            </Text>


            {dayEvents.length > 0 && (
              <View
                style={[
                  styles.gridEventDot,
                  {
                    backgroundColor: isSelected
                      ? colors.neutral.white
                      : primaryColor,
                  },
                ]}
              />
            )}


            {dayEvents.length > 1 && (
              <Text
                style={[
                  styles.eventCount,
                  isSelected
                    && styles.eventCountSelected,
                ]}
              >
                {dayEvents.length}
              </Text>
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
    fontWeight: '500',
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
    position: 'absolute',
    bottom: 6,
  },
  eventCount: {
    position: 'absolute',
    top: 3,
    right: 5,
    fontSize: 8,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  eventCountSelected: {
    color: colors.neutral.white,
  },
});