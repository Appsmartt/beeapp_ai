import {
  useCallback,
  useEffect,
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
  ChevronLeft,
  CheckCircle,
  Edit2,
  Plus,
  Trash2,
  XCircle,
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
  MainDetailsCard,
  ConfigAndInviteesSection,
} from '../../../src/components/calendar/CalendarDetailSections';
import ReminderBottomSheet from '../../../src/components/calendar/ReminderBottomSheet';
import {
  useCalendar,
} from '../../../src/hooks/useCalendar';
import {
  addDaysToDateString,
  createDateTimeWithOffset,
  getReminderMinutes,
} from '../../../src/services/calendarService';
import type {
  CalendarEvent,
} from '../../../src/stores/calendarStore';


type DetailStatus =
  | 'loading'
  | 'ready'
  | 'saving'
  | 'error';


export default function EventDetailScreen() {
  const router = useModuleNav();
  const params = useScreenParams();


  const eventId = typeof params.id === 'string'
    ? params.id
    : '';


  const {
    getEventById,
    updateEvent,
    deleteEvent,
    duplicateEvent,
    respondToInvitation,
  } = useCalendar();


  const [status, setStatus] = useState<DetailStatus>(
    'loading',
  );


  const [error, setError] = useState<string | null>(
    null,
  );


  const [eventItem, setEventItem] =
    useState<CalendarEvent | null>(null);


  const [reminderSheetVisible, setReminderSheetVisible] =
    useState(false);


  const loadEvent = useCallback(async () => {
    if (!eventId) {
      setStatus('error');
      setError('No fue posible identificar el evento.');
      return;
    }


    setStatus('loading');
    setError(null);


    try {
      const event = await getEventById(
        eventId,
        true,
      );


      setEventItem(event);
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
    eventId,
    getEventById,
  ]);


  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);


  const handleDelete = () => {
    if (!eventItem) {
      return;
    }


    Alert.alert(
      'Eliminar evento',
      (
        `¿Estás seguro de eliminar `
        + `“${eventItem.title}”?`
      ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void confirmDelete();
          },
        },
      ],
    );
  };


  const confirmDelete = async () => {
    if (!eventItem) {
      return;
    }


    try {
      setStatus('saving');


      await deleteEvent(eventItem.id);


      Alert.alert(
        'Evento eliminado',
        'El evento fue eliminado de tu agenda.',
        [
          {
            text: 'Entendido',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (deleteError) {
      setStatus('ready');


      Alert.alert(
        'No fue posible eliminar el evento',
        deleteError instanceof Error
          ? deleteError.message
          : 'Intenta nuevamente.',
      );
    }
  };


  const handleDuplicate = () => {
    if (!eventItem) {
      return;
    }


    Alert.alert(
      'Duplicar evento',
      (
        `Se creará una copia de `
        + `“${eventItem.title}” para hoy.`
      ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Duplicar',
          onPress: () => {
            void confirmDuplicate();
          },
        },
      ],
    );
  };


  const confirmDuplicate = async () => {
    if (!eventItem) {
      return;
    }


    const today = new Date();
    const todayDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');


    try {
      setStatus('saving');


      if (eventItem.isAllDay) {
        await duplicateEvent(
          eventItem.id,
          {
            starts_on: todayDate,
            ends_on: addDaysToDateString(
              todayDate,
              1,
            ),
            include_attendees: false,
            include_reminders: true,
            include_recurrence: false,
          },
        );
      } else {
        await duplicateEvent(
          eventItem.id,
          {
            starts_at: createDateTimeWithOffset(
              todayDate,
              eventItem.timeStart,
            ),
            ends_at: createDateTimeWithOffset(
              todayDate,
              eventItem.timeEnd,
            ),
            include_attendees: false,
            include_reminders: true,
            include_recurrence: false,
          },
        );
      }


      setStatus('ready');


      Alert.alert(
        'Evento duplicado',
        'Se creó una copia del evento para hoy.',
      );
    } catch (duplicateError) {
      setStatus('ready');


      Alert.alert(
        'No fue posible duplicar el evento',
        duplicateError instanceof Error
          ? duplicateError.message
          : 'Intenta nuevamente.',
      );
    }
  };


  const handleSelectReminder = async (
    reminder: string,
  ) => {
    if (!eventItem) {
      return;
    }


    const offsetMinutes = getReminderMinutes(
      reminder,
    );


    try {
      setStatus('saving');


      const updatedEvent = await updateEvent(
        eventItem.id,
        {
          reminders: offsetMinutes === null
            ? []
            : [
              {
                channel: 'push',
                offset_minutes: offsetMinutes,
              },
            ],
        },
      );


      setEventItem(updatedEvent);
      setReminderSheetVisible(false);
      setStatus('ready');
    } catch (updateError) {
      setStatus('ready');


      Alert.alert(
        'No fue posible actualizar el recordatorio',
        updateError instanceof Error
          ? updateError.message
          : 'Intenta nuevamente.',
      );
    }
  };


  const handleRsvp = async (
    responseStatus: 'accepted' | 'declined',
  ) => {
    if (!eventItem) {
      return;
    }


    try {
      setStatus('saving');


      await respondToInvitation(
        eventItem.id,
        responseStatus,
      );


      const updatedEvent = await getEventById(
        eventItem.id,
        true,
      );


      setEventItem(updatedEvent);
      setStatus('ready');
    } catch (rsvpError) {
      setStatus('ready');


      Alert.alert(
        'No fue posible registrar tu respuesta',
        rsvpError instanceof Error
          ? rsvpError.message
          : 'Intenta nuevamente.',
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


  if (!eventItem || status === 'error') {
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
  const canRespond = eventItem.userResponse !== undefined;


  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>


          <Text style={styles.headerTitle}>
            Detalle del evento
          </Text>


          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: '/(main)/calendar/edit',
                params: {
                  id: eventItem.id,
                  type: eventItem.type,
                },
              });
            }}
            style={styles.editBtn}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            <Edit2
              size={18}
              color={colors.brand.primary}
            />
          </TouchableOpacity>
        </View>


        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <MainDetailsCard
            eventItem={eventItem}
            onCopyLink={() => {
              Alert.alert(
                'Enlace de videollamada',
                eventItem.videoUrl
                  || 'Este evento no tiene enlace.',
              );
            }}
            onShareLink={() => {
              Alert.alert(
                'Compartir enlace',
                eventItem.videoUrl
                  ? (
                    'Puedes copiar y compartir el enlace '
                    + 'de videollamada.'
                  )
                  : 'Este evento no tiene enlace.',
              );
            }}
            onJoinCall={() => {
              if (!eventItem.videoUrl) {
                Alert.alert(
                  'Sin enlace',
                  (
                    'Este evento no tiene un enlace de '
                    + 'videollamada configurado.'
                  ),
                );
                return;
              }


              router.push({
                pathname: '/(main)/chat/call',
                params: {
                  name: eventItem.title,
                  isVideo: 'true',
                  joinUrl: eventItem.videoUrl,
                },
              });
            }}
          />


          <ConfigAndInviteesSection
            eventItem={eventItem}
            onOpenReminderSheet={() =>
              setReminderSheetVisible(true)
            }
          />


          {canRespond && (
            <>
              <Text style={styles.sectionHeader}>
                Tu respuesta
              </Text>


              <View style={styles.rsvpCard}>
                <Text style={styles.rsvpQuestion}>
                  ¿Asistirás a este evento?
                </Text>


                <View style={styles.rsvpButtons}>
                  <TouchableOpacity
                    style={[
                      styles.rsvpBtn,
                      eventItem.userResponse === 'accepted'
                        && styles.rsvpBtnAccepted,
                    ]}
                    onPress={() => {
                      void handleRsvp('accepted');
                    }}
                    activeOpacity={0.7}
                    disabled={isSaving}
                  >
                    <CheckCircle
                      size={14}
                      color={
                        eventItem.userResponse === 'accepted'
                          ? colors.neutral.white
                          : '#10B981'
                      }
                    />


                    <Text
                      style={[
                        styles.rsvpBtnText,
                        eventItem.userResponse === 'accepted'
                          && styles.rsvpBtnTextActive,
                      ]}
                    >
                      Aceptar
                    </Text>
                  </TouchableOpacity>


                  <TouchableOpacity
                    style={[
                      styles.rsvpBtn,
                      eventItem.userResponse === 'declined'
                        && styles.rsvpBtnDeclined,
                    ]}
                    onPress={() => {
                      void handleRsvp('declined');
                    }}
                    activeOpacity={0.7}
                    disabled={isSaving}
                  >
                    <XCircle
                      size={14}
                      color={
                        eventItem.userResponse === 'declined'
                          ? colors.neutral.white
                          : '#EF4444'
                      }
                    />


                    <Text
                      style={[
                        styles.rsvpBtnText,
                        eventItem.userResponse === 'declined'
                          && styles.rsvpBtnTextActive,
                      ]}
                    >
                      Rechazar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}


          <View style={styles.actionsPanel}>
            <TouchableOpacity
              style={styles.panelBtn}
              onPress={handleDuplicate}
              activeOpacity={0.7}
              disabled={isSaving}
            >
              <Plus
                size={16}
                color={colors.neutral.text}
              />


              <Text style={styles.panelBtnText}>
                Duplicar para hoy
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.panelBtn}
              onPress={handleDelete}
              activeOpacity={0.7}
              disabled={isSaving}
            >
              <Trash2
                size={16}
                color={colors.semantic.error}
              />


              <Text
                style={[
                  styles.panelBtnText,
                  styles.deleteText,
                ]}
              >
                Eliminar
              </Text>
            </TouchableOpacity>
          </View>


          <View style={styles.bottomSpacer} />
        </ScrollView>


        {isSaving && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator
              size="small"
              color={colors.brand.primary}
            />


            <Text style={styles.savingText}>
              Guardando cambios...
            </Text>
          </View>
        )}


        <ReminderBottomSheet
          visible={reminderSheetVisible}
          selectedReminder={eventItem.reminder}
          onSelect={(reminder) => {
            void handleSelectReminder(reminder);
          }}
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
  editBtn: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
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
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  rsvpCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
  },
  rsvpQuestion: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
    marginBottom: 12,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.gray50,
  },
  rsvpBtnAccepted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  rsvpBtnDeclined: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  rsvpBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral.text,
  },
  rsvpBtnTextActive: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
  actionsPanel: {
    marginTop: 20,
    gap: 8,
  },
  panelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 14,
  },
  panelBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral.text,
  },
  deleteText: {
    color: colors.semantic.error,
  },
  bottomSpacer: {
    height: 80,
  },
  savingOverlay: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  savingText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral.text,
  },
});