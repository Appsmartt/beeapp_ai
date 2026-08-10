
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Calendar as CalendarIcon, Video, MapPin, MoreVertical } from 'lucide-react-native';
import { CalendarEvent } from '../../stores/calendarStore';

interface CalendarEventsListProps {
  events: CalendarEvent[];
  onEventPress: (event: CalendarEvent) => void;
  onEventLongPress: (event: CalendarEvent) => void;
}

export default function CalendarEventsList({ events, onEventPress, onEventLongPress }: CalendarEventsListProps) {
  return (
    <View style={styles.eventsListContainer}>
      {events.length > 0 ? (
        events.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.eventRow, index < events.length - 1 && styles.rowSeparator]}
            onPress={() => onEventPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.cardTimeColumn}>
              <Text style={styles.cardTimeText}>{item.timeStart}</Text>
              <Text style={styles.cardDurationText}>{item.duration}</Text>
            </View>

            <View style={styles.cardBarIndicator} />

            <View style={styles.cardDetailsColumn}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.cardMetaRow}>
                {item.isVirtual ? (
                  <View style={styles.metaBadge}>
                    <Video size={10} color={colors.brand.primary} style={{ marginRight: 3 }} />
                    <Text style={[styles.metaBadgeText, { color: colors.brand.primary }]}>Videollamada</Text>
                  </View>
                ) : (
                  <View style={styles.metaBadge}>
                    <MapPin size={10} color={colors.neutral.gray600} style={{ marginRight: 3 }} />
                    <Text style={[styles.metaBadgeText, { color: colors.neutral.gray600 }]}>
                      {item.location || 'Presencial'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Invitees avatars list */}
              {item.invitees.length > 0 && (
                <View style={styles.avatarsRow}>
                  {item.invitees.slice(0, 3).map((inv, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: inv.color, marginLeft: idx > 0 ? -8 : 0 },
                      ]}
                    >
                      <Text style={styles.avatarText}>{inv.initials}</Text>
                    </View>
                  ))}
                  {item.invitees.length > 3 && (
                    <Text style={styles.moreAvatars}>+{item.invitees.length - 3}</Text>
                  )}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.cardMenuTrigger}
              onPress={() => onEventLongPress(item)}
              activeOpacity={0.7}
            >
              <MoreVertical size={16} color={colors.neutral.gray600} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      ) : (
        // Empty State
        <View style={styles.emptyContainer}>
          <CalendarIcon size={32} color={colors.neutral.gray400} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>Sin eventos para este día</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Flat rows, no cards: the list flows with the screen
  eventsListContainer: {
    backgroundColor: colors.neutral.white,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  rowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  cardTimeColumn: {
    width: 60,
    alignItems: 'center',
  },
  cardTimeText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  cardDurationText: {
    fontSize: 10,
    color: colors.neutral.gray600,
    fontWeight: '400',
    marginTop: 2,
  },
  cardBarIndicator: {
    width: 3,
    height: '80%',
    borderRadius: 2,
    backgroundColor: colors.brand.primary,
    marginHorizontal: 12,
  },
  cardDetailsColumn: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: colors.neutral.gray200,
  },
  metaBadgeText: {
    fontSize: 9,
    fontWeight: '400',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.white,
  },
  avatarText: {
    fontSize: 8,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  moreAvatars: {
    fontSize: 9,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginLeft: 6,
  },
  cardMenuTrigger: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray500,
  },
});
