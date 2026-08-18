import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import type {
  CalendarEvent,
} from '../../stores/calendarStore';
import {
  formatDate,
  parseDate,
  startOfWeek,
} from '../../utils/dateHelpers';


const WEEK_LABELS = [
  'Lun',
  'Mar',
  'Mié',
  'Jue',
  'Vie',
  'Sáb',
  'Dom',
];


interface CalendarWeekStripProps {
  events: CalendarEvent[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onShift: (direction: -1 | 1) => void;
  label: string;
  onOpenMonthPicker?: () => void;
  onOpenYearPicker?: () => void;
}


function getTodayString(): string {
  return formatDate(new Date());
}


export default function CalendarWeekStrip({
  events,
  selectedDate,
  onSelectDate,
  onShift,
  label,
  onOpenMonthPicker,
  onOpenYearPicker,
}: CalendarWeekStripProps) {
  const start = startOfWeek(
    parseDate(selectedDate),
  );


  const days = Array.from(
    {
      length: 7,
    },
    (_, index) => {
      const date = new Date(start);
      date.setDate(
        start.getDate() + index,
      );


      return {
        date,
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
    <View style={styles.wrap}>
      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => onShift(-1)}
          activeOpacity={0.7}
        >
          <ChevronLeft
            size={18}
            color={colors.brand.primary}
          />
        </TouchableOpacity>


        <View style={styles.labelContainer}>
          <TouchableOpacity
            onPress={onOpenMonthPicker}
            activeOpacity={0.7}
          >
            <Text style={styles.navLabel}>
              {label}
            </Text>
          </TouchableOpacity>


          <TouchableOpacity
            onPress={onOpenYearPicker}
            activeOpacity={0.7}
            style={styles.yearTrigger}
          >
            <Text style={styles.yearLabel}>
              {parseDate(selectedDate).getFullYear()}
            </Text>
          </TouchableOpacity>
        </View>


        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => onShift(1)}
          activeOpacity={0.7}
        >
          <ChevronRight
            size={18}
            color={colors.brand.primary}
          />
        </TouchableOpacity>
      </View>


      <View style={styles.daysRow}>
        {days.map((day, index) => {
          const isSelected =
            day.dateString === selectedDate;
          const isToday =
            day.dateString === todayString;
          const dayEvents = eventsByDate.get(
            day.dateString,
          ) || [];
          const primaryColor = dayEvents[0]?.color
            || colors.brand.primary;


          return (
            <TouchableOpacity
              key={day.dateString}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
              ]}
              onPress={() =>
                onSelectDate(day.dateString)
              }
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayLabel,
                  isSelected
                    && styles.dayLabelSelected,
                ]}
              >
                {WEEK_LABELS[index]}
              </Text>


              <Text
                style={[
                  styles.dayNumber,
                  isSelected
                    && styles.dayNumberSelected,
                  !isSelected
                    && isToday
                    && styles.dayNumberToday,
                ]}
              >
                {day.date.getDate()}
              </Text>


              <View
                style={[
                  styles.eventDot,
                  dayEvents.length > 0
                    && {
                      backgroundColor: isSelected
                        ? colors.neutral.white
                        : primaryColor,
                    },
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
  yearTrigger: {
    marginLeft: 6,
  },
  yearLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.primary,
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
});