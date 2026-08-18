import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useNavigation,
} from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
} from '../../../src/components/embedded/EmbeddedNavContext';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import CalendarMonthGrid from '../../../src/components/calendar/CalendarMonthGrid';
import CalendarWeekStrip from '../../../src/components/calendar/CalendarWeekStrip';
import CalendarHourlyAgenda from '../../../src/components/calendar/CalendarHourlyAgenda';
import CalendarEventsList from '../../../src/components/calendar/CalendarEventsList';
import {
  CalendarContextMenu,
  CalendarFabMenu,
  FAB_BOTTOM_OFFSET,
} from '../../../src/components/calendar/CalendarMenus';
import {
  CalendarFilterChips,
  CalendarHeader,
  type FilterChip,
  type ViewMode,
} from '../../../src/components/calendar/CalendarHeader';
import {
  MonthPickerModal,
  YearPickerModal,
} from '../../../src/components/calendar/CalendarPickerModals';
import {
  addDays,
  addMonths,
  formatDate,
  monthName,
  parseDate,
  periodLabel,
  startOfWeek,
} from '../../../src/utils/dateHelpers';
import {
  useCalendar,
} from '../../../src/hooks/useCalendar';
import {
  TODAY_STR,
  type CalendarEvent,
} from '../../../src/stores/calendarStore';
import {
  addDaysToDateString,
  createDateTimeWithOffset,
} from '../../../src/services/calendarService';


function getMonthRange(
  selectedDate: string,
): {
  rangeStart: string;
  rangeEnd: string;
} {
  const date = parseDate(selectedDate);
  const year = date.getFullYear();
  const month = date.getMonth();


  const firstDay = new Date(
    year,
    month,
    1,
  );


  const firstDayOfNextMonth = new Date(
    year,
    month + 1,
    1,
  );


  return {
    rangeStart: createDateTimeWithOffset(
      formatDate(firstDay),
      '00:00',
    ),
    rangeEnd: createDateTimeWithOffset(
      formatDate(firstDayOfNextMonth),
      '00:00',
    ),
  };
}


function getWeekRange(
  selectedDate: string,
): {
  rangeStart: string;
  rangeEnd: string;
} {
  const weekStart = startOfWeek(
    parseDate(selectedDate),
  );


  const weekEnd = new Date(weekStart);
  weekEnd.setDate(
    weekEnd.getDate() + 7,
  );


  return {
    rangeStart: createDateTimeWithOffset(
      formatDate(weekStart),
      '00:00',
    ),
    rangeEnd: createDateTimeWithOffset(
      formatDate(weekEnd),
      '00:00',
    ),
  };
}


function getDayRange(
  selectedDate: string,
): {
  rangeStart: string;
  rangeEnd: string;
} {
  return {
    rangeStart: createDateTimeWithOffset(
      selectedDate,
      '00:00',
    ),
    rangeEnd: createDateTimeWithOffset(
      addDaysToDateString(
        selectedDate,
        1,
      ),
      '00:00',
    ),
  };
}


function getVisibleRange(
  selectedDate: string,
  currentView: ViewMode,
): {
  rangeStart: string;
  rangeEnd: string;
} {
  if (currentView === 'month') {
    return getMonthRange(selectedDate);
  }


  if (currentView === 'day') {
    return getDayRange(selectedDate);
  }


  return getWeekRange(selectedDate);
}


function getFilteredEvents(
  events: CalendarEvent[],
  selectedDate: string,
  activeFilter: FilterChip,
): CalendarEvent[] {
  const todayTimestamp = parseDate(
    TODAY_STR,
  ).getTime();


  return events
    .filter((event) =>
      event.date === selectedDate,
    )
    .filter((event) => {
      if (activeFilter === 'meetings') {
        return event.type === 'meeting';
      }


      if (activeFilter === 'events') {
        return event.type === 'event';
      }


      if (activeFilter === 'past') {
        return parseDate(
          event.date,
        ).getTime() < todayTimestamp;
      }


      if (activeFilter === 'upcoming') {
        return parseDate(
          event.date,
        ).getTime() >= todayTimestamp;
      }


      return true;
    })
    .sort((left, right) => {
      if (left.isAllDay && !right.isAllDay) {
        return -1;
      }


      if (!left.isAllDay && right.isAllDay) {
        return 1;
      }


      return left.timeStart.localeCompare(
        right.timeStart,
      );
    });
}


export default function CalendarIndexScreen() {
  const router = useModuleNav();
  const navigation = useNavigation();


  const {
    events,
    loading,
    refreshing,
    error,
    loadCalendar,
    deleteEvent,
    duplicateEvent,
  } = useCalendar();


  const [selectedDate, setSelectedDate] = useState(
    TODAY_STR,
  );


  const [currentView, setCurrentView] = useState<ViewMode>(
    'week',
  );


  const [activeFilter, setActiveFilter] = useState<FilterChip>(
    'upcoming',
  );


  const [activeEvent, setActiveEvent] =
    useState<CalendarEvent | null>(null);


  const [contextMenuVisible, setContextMenuVisible] =
    useState(false);


  const [fabMenuVisible, setFabMenuVisible] =
    useState(false);


  const [monthPickerVisible, setMonthPickerVisible] =
    useState(false);


  const [yearPickerVisible, setYearPickerVisible] =
    useState(false);


  const visibleRange = useMemo(
    () => getVisibleRange(
      selectedDate,
      currentView,
    ),
    [
      currentView,
      selectedDate,
    ],
  );


  const filteredEvents = useMemo(
    () => getFilteredEvents(
      events,
      selectedDate,
      activeFilter,
    ),
    [
      activeFilter,
      events,
      selectedDate,
    ],
  );


  const loadVisibleRange = useCallback((
    showRefresh = false,
  ) => {
    return loadCalendar(
      visibleRange,
      showRefresh,
    );
  }, [
    loadCalendar,
    visibleRange,
  ]);


  useEffect(() => {
    void loadVisibleRange();
  }, [loadVisibleRange]);


  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'focus',
      () => {
        void loadVisibleRange(true);
      },
    );


    return unsubscribe;
  }, [
    loadVisibleRange,
    navigation,
  ]);


  const handleSelectMonth = (
    monthIndex: number,
  ) => {
    const currentDate = parseDate(selectedDate);
    const nextDate = new Date(
      currentDate.getFullYear(),
      monthIndex,
      Math.min(
        currentDate.getDate(),
        28,
      ),
    );


    setSelectedDate(
      formatDate(nextDate),
    );
  };


  const handleSelectYear = (
    year: number,
  ) => {
    const currentDate = parseDate(selectedDate);
    const nextDate = new Date(
      year,
      currentDate.getMonth(),
      Math.min(
        currentDate.getDate(),
        28,
      ),
    );


    setSelectedDate(
      formatDate(nextDate),
    );
  };


  const shiftPeriod = (
    direction: -1 | 1,
  ) => {
    if (currentView === 'month') {
      setSelectedDate(
        addMonths(
          selectedDate,
          direction,
        ),
      );


      return;
    }


    setSelectedDate(
      addDays(
        selectedDate,
        currentView === 'day'
          ? direction
          : direction * 7,
      ),
    );
  };


  const handleFabAction = (
    type: 'meeting' | 'event',
  ) => {
    setFabMenuVisible(false);


    router.push({
      pathname: '/(main)/calendar/edit',
      params: {
        type,
        date: selectedDate,
      },
    });
  };


  const openContextMenu = (
    event: CalendarEvent,
  ) => {
    setActiveEvent(event);
    setContextMenuVisible(true);
  };


  const closeContextMenu = () => {
    setContextMenuVisible(false);
    setActiveEvent(null);
  };


  const goToDetail = (
    event: CalendarEvent,
  ) => {
    closeContextMenu();


    router.push({
      pathname: '/(main)/calendar/detail',
      params: {
        id: event.id,
      },
    });
  };


  const handleEditEvent = (
    event: CalendarEvent,
  ) => {
    closeContextMenu();


    router.push({
      pathname: '/(main)/calendar/edit',
      params: {
        id: event.id,
        type: event.type,
      },
    });
  };


  const handleDeleteEvent = (
    event: CalendarEvent,
  ) => {
    Alert.alert(
      'Eliminar evento',
      (
        `¿Estás seguro de eliminar `
        + `“${event.title}”?`
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
            void confirmDeleteEvent(event);
          },
        },
      ],
    );
  };


  const confirmDeleteEvent = async (
    event: CalendarEvent,
  ) => {
    try {
      await deleteEvent(event.id);
      closeContextMenu();


      Alert.alert(
        'Evento eliminado',
        'El evento fue eliminado de tu agenda.',
      );


      await loadVisibleRange(true);
    } catch (deleteError) {
      Alert.alert(
        'No fue posible eliminar el evento',
        deleteError instanceof Error
          ? deleteError.message
          : 'Intenta nuevamente.',
      );
    }
  };


  const handleDuplicateEvent = (
    event: CalendarEvent,
  ) => {
    Alert.alert(
      'Duplicar evento',
      (
        `Se creará una copia de “${event.title}” `
        + `para el ${selectedDate}.`
      ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Duplicar',
          onPress: () => {
            void confirmDuplicateEvent(event);
          },
        },
      ],
    );
  };


  const confirmDuplicateEvent = async (
    event: CalendarEvent,
  ) => {
    try {
      if (event.isAllDay) {
        await duplicateEvent(
          event.id,
          {
            starts_on: selectedDate,
            ends_on: addDaysToDateString(
              selectedDate,
              1,
            ),
            include_attendees: false,
            include_reminders: true,
            include_recurrence: false,
          },
        );
      } else {
        await duplicateEvent(
          event.id,
          {
            starts_at: createDateTimeWithOffset(
              selectedDate,
              event.timeStart,
            ),
            ends_at: createDateTimeWithOffset(
              selectedDate,
              event.timeEnd,
            ),
            include_attendees: false,
            include_reminders: true,
            include_recurrence: false,
          },
        );
      }


      closeContextMenu();


      Alert.alert(
        'Evento duplicado',
        (
          `Se creó una copia para el `
          + `${selectedDate}.`
        ),
      );


      await loadVisibleRange(true);
    } catch (duplicateError) {
      Alert.alert(
        'No fue posible duplicar el evento',
        duplicateError instanceof Error
          ? duplicateError.message
          : 'Intenta nuevamente.',
      );
    }
  };


  const selectedDateLabel = useMemo(() => {
    const date = parseDate(selectedDate);


    return (
      `Eventos del ${date.getDate()} `
      + `de ${monthName(date)}`
    );
  }, [selectedDate]);


  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <CalendarHeader
          onBack={
            router.canGoBack
              ? () => router.back()
              : undefined
          }
          onAction={
            router.embedded
              ? () =>
                setFabMenuVisible(
                  (visible) => !visible,
                )
              : undefined
          }
          onToday={() => setSelectedDate(TODAY_STR)}
          currentView={currentView}
          onViewChange={setCurrentView}
        />


        {currentView === 'month' ? (
          <View style={styles.monthViewport}>
            <View style={styles.navRow}>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => shiftPeriod(-1)}
                activeOpacity={0.7}
              >
                <ChevronLeft
                  size={18}
                  color={colors.brand.primary}
                />
              </TouchableOpacity>


              <TouchableOpacity
                onPress={() =>
                  setMonthPickerVisible(true)
                }
                activeOpacity={0.7}
              >
                <Text style={styles.navLabel}>
                  {periodLabel(
                    selectedDate,
                    'month',
                  )}
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => shiftPeriod(1)}
                activeOpacity={0.7}
              >
                <ChevronRight
                  size={18}
                  color={colors.brand.primary}
                />
              </TouchableOpacity>
            </View>


            <CalendarMonthGrid
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </View>
        ) : (
          <CalendarWeekStrip
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onShift={shiftPeriod}
            label={periodLabel(
              selectedDate,
              currentView,
            )}
            onOpenMonthPicker={() =>
              setMonthPickerVisible(true)
            }
            onOpenYearPicker={() =>
              setYearPickerVisible(true)
            }
          />
        )}


        <ScrollView
          style={styles.mainScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadVisibleRange(true);
              }}
              tintColor={colors.brand.primary}
            />
          }
        >
          <CalendarFilterChips
            activeFilter={activeFilter}
            onChange={setActiveFilter}
          />


          {loading && events.length === 0 ? (
            <View style={styles.initialLoading}>
              <ActivityIndicator
                size="large"
                color={colors.brand.primary}
              />


              <Text style={styles.initialLoadingText}>
                Cargando tu agenda...
              </Text>
            </View>
          ) : (
            <>
              {error && (
                <View style={styles.errorCard}>
                  <Text style={styles.errorTitle}>
                    No fue posible cargar Agenda
                  </Text>


                  <Text style={styles.errorText}>
                    {error}
                  </Text>


                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                      void loadVisibleRange(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.retryButtonText}>
                      Reintentar
                    </Text>
                  </TouchableOpacity>
                </View>
              )}


              {currentView === 'day' && (
                <View style={styles.plannerContainer}>
                  <Text style={styles.plannerSelectedDay}>
                    Planificación por horas
                  </Text>


                  <CalendarHourlyAgenda
                    events={events}
                    selectedDate={selectedDate}
                    onEventPress={goToDetail}
                    onEventLongPress={openContextMenu}
                  />
                </View>
              )}


              <Text style={styles.sectionTitle}>
                {selectedDateLabel}
              </Text>


              <CalendarEventsList
                events={filteredEvents}
                onEventPress={goToDetail}
                onEventLongPress={openContextMenu}
              />
            </>
          )}


          <View style={styles.bottomSpacer} />
        </ScrollView>


        <MonthPickerModal
          visible={monthPickerVisible}
          selectedDate={selectedDate}
          onClose={() =>
            setMonthPickerVisible(false)
          }
          onSelectMonth={handleSelectMonth}
        />


        <YearPickerModal
          visible={yearPickerVisible}
          selectedDate={selectedDate}
          onClose={() =>
            setYearPickerVisible(false)
          }
          onSelectYear={handleSelectYear}
        />


        <CalendarContextMenu
          visible={contextMenuVisible}
          event={activeEvent}
          onClose={closeContextMenu}
          onViewDetail={goToDetail}
          onEdit={handleEditEvent}
          onDuplicate={handleDuplicateEvent}
          onDelete={handleDeleteEvent}
        />


        <CalendarFabMenu
          embedded={router.embedded}
          visible={fabMenuVisible}
          onClose={() => setFabMenuVisible(false)}
          onAction={handleFabAction}
        />


        {!router.embedded && (
          <TouchableOpacity
            style={styles.createFab}
            onPress={() =>
              setFabMenuVisible(
                (visible) => !visible,
              )
            }
            activeOpacity={0.8}
          >
            <Plus
              size={24}
              color={colors.neutral.white}
            />
          </TouchableOpacity>
        )}


        {!router.embedded && (
          <FloatingTabBar activeTab="explore" />
        )}
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
  mainScroll: {
    flex: 1,
  },
  monthViewport: {
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingTop: 10,
    paddingBottom: 12,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 16,
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
  navLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  plannerContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  plannerSelectedDay: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray700,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  initialLoading: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  initialLoadingText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  errorCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.semantic.error + '40',
    backgroundColor: colors.semantic.error + '12',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.semantic.error,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  createFab: {
    position: 'absolute',
    bottom: FAB_BOTTOM_OFFSET,
    right: 20,
    backgroundColor: colors.brand.primary,
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomSpacer: {
    height: 130,
  },
});