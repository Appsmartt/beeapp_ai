import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check,
  ChevronLeft,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';
import {
  CalendarEditFormFields,
  CalendarEditInviteesSection,
} from '../../../src/components/calendar/CalendarEditFields';
import ReminderBottomSheet from '../../../src/components/calendar/ReminderBottomSheet';
import {
  useCalendar,
} from '../../../src/hooks/useCalendar';
import {
  buildCreateCalendarEventPayload,
  buildUpdateCalendarEventPayload,
  getInitialFormValues,
  isValidDateString,
  isValidTimeString,
  timeToMinutes,
  type CalendarUserOption,
} from '../../../src/services/calendarService';
import type {
  CalendarEventType,
} from '../../../src/stores/calendarStore';


type EditorStatus =
  | 'loading'
  | 'ready'
  | 'saving'
  | 'error';


function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1,
  ).padStart(2, '0');
  const day = String(
    today.getDate(),
  ).padStart(2, '0');


  return `${year}-${month}-${day}`;
}


export default function EditEventScreen() {
  const router = useModuleNav();
  const params = useScreenParams();


  const eventId = typeof params.id === 'string'
    ? params.id
    : undefined;


  const initialType = params.type === 'event'
    ? 'event'
    : 'meeting';


  const preSelectedDate = typeof params.date === 'string'
    ? params.date
    : getTodayDateString();


  const {
    getEventById,
    createEvent,
    updateEvent,
    getDefaultCalendarId,
    getTimezone,
    searchUsers,
  } = useCalendar();


  const [status, setStatus] = useState<EditorStatus>(
    eventId
      ? 'loading'
      : 'ready',
  );


  const [error, setError] = useState<string | null>(
    null,
  );


  const [calendarId, setCalendarId] = useState('');


  const [eventType, setEventType] = useState<
    CalendarEventType
  >(initialType);


  const [title, setTitle] = useState('');


  const [date, setDate] = useState(preSelectedDate);


  const [timeStart, setTimeStart] = useState('09:00');


  const [timeEnd, setTimeEnd] = useState('10:00');


  const [isAllDay, setIsAllDay] = useState(false);


  const [location, setLocation] = useState('');


  const [description, setDescription] = useState('');


  const [reminder, setReminder] = useState(
    '30 minutos antes',
  );


  const [conferenceUrl, setConferenceUrl] = useState('');


  const [searchQuery, setSearchQuery] = useState('');


  const [searchResults, setSearchResults] = useState<
    CalendarUserOption[]
  >([]);


  const [selectedInvitees, setSelectedInvitees] = useState<
    CalendarUserOption[]
  >([]);


  const [searchingUsers, setSearchingUsers] = useState(false);


  const [reminderSheetVisible, setReminderSheetVisible] =
    useState(false);


  const defaultCalendarId = getDefaultCalendarId();


  const timezone = getTimezone();


  const selectedInviteeIds = useMemo(
    () => selectedInvitees.map(
      (invitee) => invitee.id,
    ),
    [selectedInvitees],
  );


  const initializeNewEvent = useCallback(() => {
    const availableCalendarId = defaultCalendarId || '';


    setCalendarId(availableCalendarId);
    setEventType(initialType);
    setDate(preSelectedDate);
  }, [
    defaultCalendarId,
    initialType,
    preSelectedDate,
  ]);


  const loadEvent = useCallback(async () => {
    if (!eventId) {
      initializeNewEvent();
      return;
    }


    setStatus('loading');
    setError(null);


    try {
      const event = await getEventById(
        eventId,
        true,
      );


      const values = getInitialFormValues(
        event,
        preSelectedDate,
        defaultCalendarId || event.calendarId,
      );


      setCalendarId(values.calendarId);
      setEventType(values.eventType);
      setTitle(values.title);
      setDate(values.date);
      setTimeStart(values.timeStart);
      setTimeEnd(values.timeEnd);
      setIsAllDay(values.isAllDay);
      setLocation(values.location);
      setDescription(values.description);
      setReminder(values.reminder);
      setConferenceUrl(values.conferenceUrl || '');


      setSelectedInvitees(
        event.invitees
          .filter((invitee) =>
            Boolean(invitee.userId),
          )
          .map((invitee) => ({
            id: invitee.userId || invitee.id,
            name: invitee.name,
            email: null,
            phone: null,
            initials: invitee.initials,
            color: invitee.color,
          })),
      );


      setStatus('ready');
    } catch (loadError) {
      setStatus('error');
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar el evento.',
      );
    }
  }, [
    defaultCalendarId,
    eventId,
    getEventById,
    initializeNewEvent,
    preSelectedDate,
  ]);


  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);


  useEffect(() => {
    if (!eventId && defaultCalendarId) {
      setCalendarId((currentCalendarId) =>
        currentCalendarId || defaultCalendarId,
      );
    }
  }, [
    defaultCalendarId,
    eventId,
  ]);


  useEffect(() => {
    const normalizedQuery = searchQuery.trim();


    if (normalizedQuery.length < 3) {
      setSearchResults([]);
      setSearchingUsers(false);
      return;
    }


    let active = true;


    const timeout = setTimeout(() => {
      void searchUsers(normalizedQuery)
        .then((users) => {
          if (!active) {
            return;
          }


          setSearchResults(users);
        })
        .catch((searchError) => {
          if (!active) {
            return;
          }


          setSearchResults([]);
          setError(
            searchError instanceof Error
              ? searchError.message
              : 'No fue posible buscar usuarios.',
          );
        })
        .finally(() => {
          if (active) {
            setSearchingUsers(false);
          }
        });
    }, 350);


    setSearchingUsers(true);


    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [
    searchQuery,
    searchUsers,
  ]);


  const handleToggleInvitee = (
    invitee: CalendarUserOption,
  ) => {
    setSelectedInvitees((currentInvitees) => {
      const isSelected = currentInvitees.some(
        (currentInvitee) =>
          currentInvitee.id === invitee.id,
      );


      if (isSelected) {
        return currentInvitees.filter(
          (currentInvitee) =>
            currentInvitee.id !== invitee.id,
        );
      }


      return [
        ...currentInvitees,
        invitee,
      ];
    });
  };


  const validateForm = (): string | null => {
    if (!calendarId) {
      return (
        'No se encontró un calendario disponible. '
        + 'Vuelve a Agenda e intenta nuevamente.'
      );
    }


    if (!title.trim()) {
      return 'Ingresa un título para el evento.';
    }


    if (!isValidDateString(date)) {
      return (
        'La fecha debe tener formato YYYY-MM-DD '
        + 'y ser una fecha válida.'
      );
    }


    if (!isAllDay) {
      if (!isValidTimeString(timeStart)) {
        return (
          'La hora de inicio debe tener formato HH:MM.'
        );
      }


      if (!isValidTimeString(timeEnd)) {
        return (
          'La hora final debe tener formato HH:MM.'
        );
      }


      const startMinutes = timeToMinutes(timeStart);
      const endMinutes = timeToMinutes(timeEnd);


      if (
        startMinutes === null
        || endMinutes === null
        || endMinutes <= startMinutes
      ) {
        return (
          'La hora final debe ser posterior '
          + 'a la hora de inicio.'
        );
      }
    }


    if (
      eventType === 'meeting'
      && conferenceUrl.trim()
      && !/^https?:\/\/.+/i.test(
        conferenceUrl.trim(),
      )
    ) {
      return (
        'El enlace de videollamada debe comenzar '
        + 'por http:// o https://.'
      );
    }


    return null;
  };


  const handleSave = async () => {
    const validationMessage = validateForm();


    if (validationMessage) {
      Alert.alert(
        'Revisa la información',
        validationMessage,
      );
      return;
    }


    setStatus('saving');
    setError(null);


    try {
      const values = {
        calendarId,
        eventType,
        title,
        date,
        timeStart,
        timeEnd,
        isAllDay,
        location,
        description,
        reminder,
        selectedAttendeeIds: selectedInviteeIds,
        conferenceUrl: eventType === 'meeting'
          ? conferenceUrl
          : '',
      };


      if (eventId) {
        await updateEvent(
          eventId,
          buildUpdateCalendarEventPayload(
            values,
            timezone,
          ),
        );
      } else {
        await createEvent(
          buildCreateCalendarEventPayload(
            values,
            timezone,
          ),
        );
      }


      Alert.alert(
        eventId
          ? 'Evento actualizado'
          : 'Evento creado',
        eventType === 'meeting'
          ? 'La reunión fue guardada correctamente.'
          : 'El evento fue guardado correctamente.',
        [
          {
            text: 'Entendido',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (saveError) {
      setStatus('ready');
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No fue posible guardar el evento.',
      );
    }
  };


  if (status === 'loading') {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
          />


          <Text style={styles.centerStateText}>
            Cargando evento...
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }


  if (status === 'error' && eventId) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            No fue posible cargar el evento
          </Text>


          <Text style={styles.errorText}>
            {error || 'Intenta nuevamente.'}
          </Text>


          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              void loadEvent();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>
              Reintentar
            </Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backLinkText}>
              Volver
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    );
  }


  const isSaving = status === 'saving';


  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>


          <Text style={styles.headerTitle}>
            {eventId
              ? 'Editar evento'
              : 'Nuevo evento'}
          </Text>


          <TouchableOpacity
            onPress={() => {
              void handleSave();
            }}
            style={styles.saveBtn}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={colors.brand.primary}
              />
            ) : (
              <Check
                size={22}
                color={colors.brand.primary}
              />
            )}
          </TouchableOpacity>
        </View>


        {error && (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>
              {error}
            </Text>
          </View>
        )}


        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <CalendarEditFormFields
            eventType={eventType}
            setEventType={setEventType}
            title={title}
            setTitle={setTitle}
            date={date}
            setDate={setDate}
            timeStart={timeStart}
            setTimeStart={setTimeStart}
            timeEnd={timeEnd}
            setTimeEnd={setTimeEnd}
            isAllDay={isAllDay}
            setIsAllDay={setIsAllDay}
            location={location}
            setLocation={setLocation}
            description={description}
            setDescription={setDescription}
            reminder={reminder}
            onOpenReminderSheet={() =>
              setReminderSheetVisible(true)
            }
            conferenceUrl={conferenceUrl}
            setConferenceUrl={setConferenceUrl}
          />


          <CalendarEditInviteesSection
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            selectedInvitees={selectedInvitees}
            searching={searchingUsers}
            onToggleInvitee={handleToggleInvitee}
          />


          <View style={styles.bottomSpacer} />
        </ScrollView>


        <ReminderBottomSheet
          visible={reminderSheetVisible}
          selectedReminder={reminder}
          onSelect={setReminder}
          onClose={() =>
            setReminderSheetVisible(false)
          }
        />
      </View>
    </ScreenSafeArea>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  saveBtn: {
    minWidth: 30,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  centerStateText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.brand.primary,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  backLink: {
    marginTop: 4,
    padding: 8,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  inlineError: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.semantic.error + '40',
    backgroundColor: colors.semantic.error + '12',
  },
  inlineErrorText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.semantic.error,
    lineHeight: 17,
  },
  bottomSpacer: {
    height: 80,
  },
});