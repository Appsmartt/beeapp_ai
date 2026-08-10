
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { CalendarEvent } from '../../stores/calendarStore';

const formatHoursList = () => {
  return Array.from({ length: 12 }, (_, i) => {
    const hr = i + 8; // 8:00 to 19:00
    return `${String(hr).padStart(2, '0')}:00`;
  });
};

interface CalendarHourlyAgendaProps {
  events: CalendarEvent[];
  selectedDate: string;
  onEventPress: (event: CalendarEvent) => void;
  onEventLongPress: (event: CalendarEvent) => void;
}

export default function CalendarHourlyAgenda({ events, selectedDate, onEventPress, onEventLongPress }: CalendarHourlyAgendaProps) {
  const hours = formatHoursList();
  const activeEvents = events.filter((e) => e.date === selectedDate);

  return (
    <ScrollView style={styles.hourlyScroll} nestedScrollEnabled>
      {hours.map((hour) => {
        const matchedEvent = activeEvents.find((e) => e.timeStart.startsWith(hour.slice(0, 2)));

        return (
          <View key={hour} style={styles.hourRow}>
            <Text style={styles.hourLabel}>{hour}</Text>
            <View style={styles.hourLine} />
            <View style={styles.hourBlockContent}>
              {matchedEvent ? (
                <TouchableOpacity
                  style={[
                    styles.hourlyEventCard,
                    matchedEvent.type === 'meeting' ? styles.hourlyMeeting : styles.hourlyEvent,
                  ]}
                  onPress={() => onEventPress(matchedEvent)}
                  onLongPress={() => onEventLongPress(matchedEvent)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.hourlyEventTitle} numberOfLines={1}>
                    {matchedEvent.title}
                  </Text>
                  <Text style={styles.hourlyEventMeta}>
                    {matchedEvent.timeStart} - {matchedEvent.timeEnd} ({matchedEvent.duration})
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hourlyScroll: {
    maxHeight: 280,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    backgroundColor: colors.neutral.white,
    padding: 12,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
  },
  hourLabel: {
    width: 45,
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  hourLine: {
    width: 8,
    height: 1,
    backgroundColor: colors.neutral.gray200,
    marginRight: 8,
  },
  hourBlockContent: {
    flex: 1,
    height: '80%',
    justifyContent: 'center',
  },
  hourlyEventCard: {
    flex: 1,
    borderRadius: 8,
    paddingLeft: 10,
    justifyContent: 'center',
    borderLeftWidth: 3,
  },
  hourlyMeeting: {
    backgroundColor: colors.brand.primary + '15',
    borderLeftColor: colors.brand.primary,
  },
  hourlyEvent: {
    backgroundColor: colors.neutral.gray100,
    borderLeftColor: colors.neutral.gray400,
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
});
