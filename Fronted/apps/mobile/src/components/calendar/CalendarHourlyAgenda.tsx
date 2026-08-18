import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarDays,
  Clock,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import {
  timeToMinutes,
} from '../../services/calendarService';
import type {
  CalendarEvent,
} from '../../stores/calendarStore';


interface CalendarHourlyAgendaProps {
  events: CalendarEvent[];
  selectedDate: string;
  onEventPress: (event: CalendarEvent) => void;
  onEventLongPress: (event: CalendarEvent) => void;
}


function getHourLabel(
  hour: number,
): string {
  return `${String(hour).padStart(2, '0')}:00`;
}


function getEventHour(
  event: CalendarEvent,
): number | null {
  const minutes = timeToMinutes(
    event.timeStart,
  );


  if (minutes === null) {
    return null;
  }


  return Math.floor(minutes / 60);
}


function sortEvents(
  events: CalendarEvent[],
): CalendarEvent[] {
  return [...events].sort((left, right) => {
    const leftMinutes = timeToMinutes(
      left.timeStart,
    ) ?? 0;
    const rightMinutes = timeToMinutes(
      right.timeStart,
    ) ?? 0;


    return leftMinutes - rightMinutes;
  });
}


export default function CalendarHourlyAgenda({
  events,
  selectedDate,
  onEventPress,
  onEventLongPress,
}: CalendarHourlyAgendaProps) {
  const dayEvents = events.filter(
    (event) => event.date === selectedDate,
  );


  const allDayEvents = dayEvents.filter(
    (event) => event.isAllDay,
  );


  const timedEvents = sortEvents(
    dayEvents.filter(
      (event) => !event.isAllDay,
    ),
  );


  const eventsByHour = timedEvents.reduce(
    (accumulator, event) => {
      const hour = getEventHour(event);


      if (hour === null) {
        return accumulator;
      }


      const existing = accumulator.get(hour) || [];


      accumulator.set(
        hour,
        [
          ...existing,
          event,
        ],
      );


      return accumulator;
    },
    new Map<number, CalendarEvent[]>(),
  );


  const eventHours = Array.from(
    eventsByHour.keys(),
  );


  const minEventHour = eventHours.length > 0
    ? Math.min(...eventHours)
    : 6;


  const maxEventHour = eventHours.length > 0
    ? Math.max(...eventHours)
    : 22;


  const startHour = Math.min(6, minEventHour);
  const endHour = Math.max(22, maxEventHour);


  const hours = Array.from(
    {
      length: endHour - startHour + 1,
    },
    (_, index) => startHour + index,
  );


  return (
    <ScrollView
      style={styles.hourlyScroll}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
    >
      {allDayEvents.length > 0 && (
        <View style={styles.allDaySection}>
          <View style={styles.allDayHeader}>
            <CalendarDays
              size={14}
              color={colors.brand.primary}
            />


            <Text style={styles.allDayTitle}>
              Todo el día
            </Text>
          </View>


          <View style={styles.allDayEvents}>
            {allDayEvents.map((event) => (
              <EventBlock
                key={event.id}
                event={event}
                onPress={onEventPress}
                onLongPress={onEventLongPress}
                compact
              />
            ))}
          </View>
        </View>
      )}


      {timedEvents.length === 0 && allDayEvents.length === 0 ? (
        <View style={styles.emptyPlanner}>
          <Clock
            size={28}
            color={colors.neutral.gray400}
          />


          <Text style={styles.emptyPlannerText}>
            No hay eventos con horario para este día.
          </Text>
        </View>
      ) : (
        hours.map((hour) => {
          const hourEvents = eventsByHour.get(hour) || [];


          return (
            <View
              key={hour}
              style={styles.hourRow}
            >
              <Text style={styles.hourLabel}>
                {getHourLabel(hour)}
              </Text>


              <View style={styles.hourLine} />


              <View style={styles.hourBlockContent}>
                {hourEvents.length > 0
                  && hourEvents.map((event) => (
                    <EventBlock
                      key={event.id}
                      event={event}
                      onPress={onEventPress}
                      onLongPress={onEventLongPress}
                    />
                  ))}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}


function EventBlock({
  event,
  onPress,
  onLongPress,
  compact = false,
}: {
  event: CalendarEvent;
  onPress: (event: CalendarEvent) => void;
  onLongPress: (event: CalendarEvent) => void;
  compact?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.hourlyEventCard,
        compact && styles.hourlyEventCardCompact,
        {
          backgroundColor: event.color
            ? event.color + '18'
            : colors.brand.primary + '15',
          borderLeftColor: event.color
            || colors.brand.primary,
        },
      ]}
      onPress={() => onPress(event)}
      onLongPress={() => onLongPress(event)}
      delayLongPress={450}
      activeOpacity={0.8}
    >
      <Text
        style={styles.hourlyEventTitle}
        numberOfLines={1}
      >
        {event.title}
      </Text>


      {!compact && (
        <Text style={styles.hourlyEventMeta}>
          {event.timeStart} - {event.timeEnd}
          {event.duration
            ? ` · ${event.duration}`
            : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
}


const styles = StyleSheet.create({
  hourlyScroll: {
    maxHeight: 340,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    backgroundColor: colors.neutral.white,
    padding: 12,
  },
  allDaySection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  allDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  allDayTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  allDayEvents: {
    gap: 6,
  },
  hourRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  hourLabel: {
    width: 45,
    paddingTop: 5,
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  hourLine: {
    width: 8,
    height: 1,
    marginTop: 11,
    marginRight: 8,
    backgroundColor: colors.neutral.gray200,
  },
  hourBlockContent: {
    flex: 1,
    gap: 6,
    paddingBottom: 6,
  },
  hourlyEventCard: {
    minHeight: 42,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    justifyContent: 'center',
    borderLeftWidth: 3,
  },
  hourlyEventCardCompact: {
    minHeight: 38,
  },
  hourlyEventTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  hourlyEventMeta: {
    fontSize: 9,
    color: colors.neutral.gray600,
    fontWeight: '400',
    marginTop: 2,
  },
  emptyPlanner: {
    alignItems: 'center',
    paddingVertical: 34,
    gap: 10,
  },
  emptyPlannerText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
});