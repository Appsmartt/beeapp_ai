import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  MapPin,
  MoreVertical,
  Video,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import type {
  CalendarEvent,
} from '../../stores/calendarStore';


interface CalendarEventsListProps {
  events: CalendarEvent[];
  onEventPress: (event: CalendarEvent) => void;
  onEventLongPress: (event: CalendarEvent) => void;
}


export default function CalendarEventsList({
  events,
  onEventPress,
  onEventLongPress,
}: CalendarEventsListProps) {
  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <CalendarIcon
          size={32}
          color={colors.neutral.gray400}
        />


        <Text style={styles.emptyText}>
          Sin eventos para este día
        </Text>


        <Text style={styles.emptyHint}>
          Toca el botón + para crear uno.
        </Text>
      </View>
    );
  }


  return (
    <View style={styles.eventsListContainer}>
      {events.map((item, index) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.eventRow,
            index < events.length - 1
              && styles.rowSeparator,
          ]}
          onPress={() => onEventPress(item)}
          onLongPress={() => onEventLongPress(item)}
          delayLongPress={450}
          activeOpacity={0.7}
        >
          <View style={styles.cardTimeColumn}>
            <Text style={styles.cardTimeText}>
              {item.isAllDay
                ? 'Todo el día'
                : item.timeStart}
            </Text>


            {!item.isAllDay && (
              <Text style={styles.cardDurationText}>
                {item.duration}
              </Text>
            )}
          </View>


          <View
            style={[
              styles.cardBarIndicator,
              {
                backgroundColor: item.color
                  || colors.brand.primary,
              },
            ]}
          />


          <View style={styles.cardDetailsColumn}>
            <Text
              style={styles.cardTitle}
              numberOfLines={2}
            >
              {item.title}
            </Text>


            <View style={styles.cardMetaRow}>
              {item.isVirtual ? (
                <View style={styles.metaBadge}>
                  <Video
                    size={10}
                    color={colors.brand.primary}
                  />


                  <Text
                    style={[
                      styles.metaBadgeText,
                      {
                        color: colors.brand.primary,
                      },
                    ]}
                  >
                    {item.videoUrl
                      ? 'Videollamada'
                      : 'Virtual'}
                  </Text>
                </View>
              ) : (
                <View style={styles.metaBadge}>
                  <MapPin
                    size={10}
                    color={colors.neutral.gray600}
                  />


                  <Text
                    style={[
                      styles.metaBadgeText,
                      {
                        color: colors.neutral.gray600,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.location || 'Presencial'}
                  </Text>
                </View>
              )}
            </View>


            {item.invitees.length > 0 && (
              <View style={styles.avatarsRow}>
                {item.invitees
                  .slice(0, 3)
                  .map((invitee, inviteeIndex) => (
                    <View
                      key={invitee.id}
                      style={[
                        styles.avatarCircle,
                        {
                          backgroundColor: invitee.color,
                          marginLeft: inviteeIndex > 0
                            ? -8
                            : 0,
                        },
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {invitee.initials}
                      </Text>
                    </View>
                  ))}


                {item.invitees.length > 3 && (
                  <Text style={styles.moreAvatars}>
                    +{item.invitees.length - 3}
                  </Text>
                )}
              </View>
            )}
          </View>


          <TouchableOpacity
            style={styles.cardMenuTrigger}
            onPress={() => onEventLongPress(item)}
            activeOpacity={0.7}
            accessibilityLabel={`Opciones de ${item.title}`}
          >
            <MoreVertical
              size={18}
              color={colors.neutral.gray600}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </View>
  );
}


const styles = StyleSheet.create({
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
    width: 68,
    alignItems: 'center',
  },
  cardTimeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  cardDurationText: {
    fontSize: 10,
    color: colors.neutral.gray600,
    fontWeight: '400',
    marginTop: 2,
    textAlign: 'center',
  },
  cardBarIndicator: {
    width: 3,
    minHeight: 52,
    borderRadius: 2,
    marginHorizontal: 12,
  },
  cardDetailsColumn: {
    flex: 1,
    minWidth: 0,
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
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.neutral.gray50,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: colors.neutral.gray200,
  },
  metaBadgeText: {
    maxWidth: 150,
    fontSize: 9,
    fontWeight: '500',
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
    fontWeight: '600',
    color: colors.neutral.text,
  },
  moreAvatars: {
    fontSize: 9,
    fontWeight: '500',
    color: colors.neutral.gray600,
    marginLeft: 6,
  },
  cardMenuTrigger: {
    padding: 6,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  emptyHint: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray500,
  },
});