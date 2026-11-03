import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { appAlert } from '../../../src/components/feedback/appAlert';
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
import {
  homeSearchEmptyCopy,
  useHomeModuleSearch,
} from '../../../src/components/home/HomeSearchContext';
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
  type CalendarAccountFilter,
  type CalendarAccountOption,
  type CalendarActiveFilter,
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
  useCalendarIntegrations,
} from '../../../src/hooks/useCalendarIntegrations';
import {
  subscribeConnectedAccountsSynced,
} from '../../../src/services/connectedAccountSync';
import {
  TODAY_STR,
  type CalendarEvent,
} from '../../../src/stores/calendarStore';
import {
  addDaysToDateString,
  createDateTimeWithOffset,
  getPastCalendarEventStartMessage,
} from '../../../src/services/calendarService';


const RANGE_WINDOW_DAYS = 7;


function getPastDateWindow(): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: addDays(
      TODAY_STR,
      -RANGE_WINDOW_DAYS,
    ),
    endDate: addDays(
      TODAY_STR,
      -1,
    ),
  };
}


function getUpcomingDateWindow(): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: TODAY_STR,
    endDate: addDays(
      TODAY_STR,
      RANGE_WINDOW_DAYS,
    ),
  };
}


function getRangeLoadBounds(
  window: {
    startDate: string;
    endDate: string;
  },
): {
  rangeStart: string;
  rangeEnd: string;
} {
  return {
    rangeStart: createDateTimeWithOffset(
      window.startDate,
      '00:00',
    ),
    rangeEnd: createDateTimeWithOffset(
      addDaysToDateString(
        window.endDate,
        1,
      ),
      '00:00',
    ),
  };
}


function isDateInInclusiveRange(
  date: string,
  startDate: string,
  endDate: string,
): boolean {
  const timestamp = parseDate(date).getTime();
  const start = parseDate(startDate).getTime();
  const end = parseDate(endDate).getTime();

  return timestamp >= start
    && timestamp <= end;
}


function sortCalendarEvents(
  events: CalendarEvent[],
  direction: 'asc' | 'desc',
): CalendarEvent[] {
  return [...events].sort((left, right) => {
    const dateCompare = left.date.localeCompare(
      right.date,
    );

    if (dateCompare !== 0) {
      return direction === 'asc'
        ? dateCompare
        : -dateCompare;
    }

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
  viewAnchorDate: string,
  currentView: ViewMode,
  activeFilter: CalendarActiveFilter,
): {
  rangeStart: string;
  rangeEnd: string;
} {
  if (activeFilter === 'past') {
    return getRangeLoadBounds(
      getPastDateWindow(),
    );
  }

  if (activeFilter === 'upcoming') {
    return getRangeLoadBounds(
      getUpcomingDateWindow(),
    );
  }

  if (currentView === 'month') {
    return getMonthRange(viewAnchorDate);
  }

  if (currentView === 'day') {
    return getDayRange(viewAnchorDate);
  }

  return getWeekRange(viewAnchorDate);
}


function syncFilterForSelectedDate(
  date: string,
  filter: CalendarActiveFilter,
): CalendarActiveFilter {
  const isFutureDay = parseDate(date).getTime()
    > parseDate(TODAY_STR).getTime();

  if (isFutureDay && filter === 'past') {
    return null;
  }

  return filter;
}


function applyTypeFilter(
  event: CalendarEvent,
  activeFilter: CalendarActiveFilter,
): boolean {
  if (
    activeFilter === 'meetings'
  ) {
    return event.type === 'meeting';
  }

  if (activeFilter === 'events') {
    return event.type === 'event';
  }

  return true;
}


function getFilteredEvents(
  events: CalendarEvent[],
  selectedDate: string | null,
  activeFilter: CalendarActiveFilter,
): CalendarEvent[] {
  if (activeFilter === 'past') {
    const window = getPastDateWindow();

    return sortCalendarEvents(
      events.filter((event) =>
        isDateInInclusiveRange(
          event.date,
          window.startDate,
          window.endDate,
        )
        && applyTypeFilter(
          event,
          activeFilter,
        ),
      ),
      'desc',
    );
  }

  if (activeFilter === 'upcoming') {
    const window = getUpcomingDateWindow();

    return sortCalendarEvents(
      events.filter((event) =>
        isDateInInclusiveRange(
          event.date,
          window.startDate,
          window.endDate,
        )
        && applyTypeFilter(
          event,
          activeFilter,
        ),
      ),
      'asc',
    );
  }

  if (!selectedDate) {
    return [];
  }

  return sortCalendarEvents(
    events.filter((event) =>
      event.date === selectedDate
      && applyTypeFilter(
        event,
        activeFilter,
      ),
    ),
    'asc',
  );
}


function isRangeFilter(
  filter: CalendarActiveFilter,
): filter is FilterChip {
  return filter === 'past'
    || filter === 'upcoming';
}


export default function CalendarIndexScreen() {
  const router = useModuleNav();
  const homeSearch = useHomeModuleSearch('evento');
  const navigation = useNavigation();

  const {
    events,
    calendars,
    loading,
    refreshing,
    error,
    loadCalendar,
    deleteEvent,
    duplicateEvent,
  } = useCalendar();

  const {
    integrations,
    loadCalendarIntegrations,
    syncIntegration,
  } = useCalendarIntegrations();

  const lastAccountSyncAt = useRef(0);

  const [
    activeAccount,
    setActiveAccount,
  ] = useState<CalendarAccountFilter>('all');

  const [
    accountMenuVisible,
    setAccountMenuVisible,
  ] = useState(false);

  const [viewAnchorDate, setViewAnchorDate] = useState(
    TODAY_STR,
  );

  const [selectedDate, setSelectedDate] = useState<
    string | null
  >(TODAY_STR);

  const [currentView, setCurrentView] = useState<ViewMode>(
    'week',
  );

  const [activeFilter, setActiveFilter] =
    useState<CalendarActiveFilter>(null);

  const applySelectedDate = useCallback((
    date: string,
  ) => {
    setViewAnchorDate(date);
    setSelectedDate(date);
    setActiveFilter((current) => {
      if (
        current === 'past'
        || current === 'upcoming'
      ) {
        return null;
      }

      return syncFilterForSelectedDate(
        date,
        current,
      );
    });
  }, []);

  const handleFilterChange = useCallback((
    filter: CalendarActiveFilter,
  ) => {
    if (filter === 'past' || filter === 'upcoming') {
      setSelectedDate(null);
      setActiveFilter(filter);
      return;
    }

    if (
      filter === 'meetings'
      || filter === 'events'
    ) {
      if (selectedDate === null) {
        setSelectedDate(viewAnchorDate);
      }

      setActiveFilter(filter);
      return;
    }

    setActiveFilter(filter);

    if (
      filter === null
      && selectedDate === null
    ) {
      setSelectedDate(viewAnchorDate);
    }
  }, [
    selectedDate,
    viewAnchorDate,
  ]);

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
    () => {
      if (homeSearch.hasActiveQuery) {
        return getMonthRange(viewAnchorDate);
      }

      return getVisibleRange(
        viewAnchorDate,
        currentView,
        activeFilter,
      );
    },
    [
      activeFilter,
      currentView,
      homeSearch.hasActiveQuery,
      viewAnchorDate,
    ],
  );

  const accountOptions = useMemo<CalendarAccountOption[]>(
    () => integrations.map((integration) => ({
      id: integration.id,
      label: (
        integration.provider_email
        || integration.provider_display_name
        || integration.provider_account_id
        || 'Cuenta conectada'
      ),
      provider: integration.provider,
      isActive: (
        integration.can_sync
        && (
          integration.status === 'active'
          || integration.status === 'connected'
        )
      ),
    })),
    [integrations],
  );

  const accountCalendarIds = useMemo(() => {
    if (activeAccount === 'all') {
      return null;
    }

    return new Set(
      calendars
        .filter((calendar) => (
          calendar.integration_id === activeAccount
        ))
        .map((calendar) => calendar.id),
    );
  }, [
    activeAccount,
    calendars,
  ]);

  const accountEvents = useMemo(() => {
    if (!accountCalendarIds) {
      return events;
    }

    return events.filter((event) => (
      accountCalendarIds.has(event.calendarId)
    ));
  }, [
    accountCalendarIds,
    events,
  ]);

  const filteredEvents = useMemo(
    () => getFilteredEvents(
      accountEvents,
      selectedDate,
      activeFilter,
    ),
    [
      accountEvents,
      activeFilter,
      selectedDate,
    ],
  );

  const listedEvents = useMemo(() => {
    if (!homeSearch.hasActiveQuery) {
      return filteredEvents;
    }

    const typeFilterOnly = (
      activeFilter === 'meetings'
      || activeFilter === 'events'
    )
      ? activeFilter
      : null;

    return sortCalendarEvents(
      accountEvents.filter((event) =>
        applyTypeFilter(
          event,
          typeFilterOnly,
        )
        && homeSearch.matchesQuery(
          event.title,
          event.location,
          event.description,
        ),
      ),
      'asc',
    );
  }, [
    accountEvents,
    activeFilter,
    filteredEvents,
    homeSearch,
  ]);

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

  const syncConnectedAccounts = useCallback(async (
    force = false,
    accounts?: typeof integrations,
  ) => {
    const now = Date.now();

    if (
      !force
      && now - lastAccountSyncAt.current < 90_000
    ) {
      return false;
    }

    const accountIds = (accounts ?? integrations)
      .filter((integration) => (
        integration.can_sync
        && (
          integration.status === 'active'
          || integration.status === 'connected'
        )
      ))
      .map((integration) => integration.id);

    if (accountIds.length === 0) {
      return false;
    }

    lastAccountSyncAt.current = now;
    const failures = await Promise.all(
      accountIds.map(async (accountId) => {
        try {
          await syncIntegration(accountId);
          return null;
        } catch (syncError) {
          return syncError instanceof Error
            ? syncError.message
            : 'No fue posible sincronizar la agenda.';
        }
      }),
    );
    const failure = failures.find((message) => message);

    if (failure) {
      appAlert(
        'Agenda',
        failure,
      );
    }

    return true;
  }, [
    integrations,
    syncIntegration,
  ]);

  useEffect(() => {
    void loadVisibleRange();
  }, [loadVisibleRange]);

  useEffect(() => {
    void (async () => {
      const synced = await syncConnectedAccounts();

      if (synced) {
        await loadVisibleRange(true);
      }
    })();
  }, [
    loadVisibleRange,
    syncConnectedAccounts,
  ]);

  const reloadConnectedAgenda = useCallback(async () => {
    try {
      await loadCalendarIntegrations();
    } catch {
      // El hook ya guardó el error de las cuentas.
    }

    await loadVisibleRange(true);
  }, [
    loadCalendarIntegrations,
    loadVisibleRange,
  ]);

  useEffect(() => {
    return subscribeConnectedAccountsSynced(() => {
      void reloadConnectedAgenda();
    });
  }, [reloadConnectedAgenda]);

  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'focus',
      () => {
        void (async () => {
          let loadedAccounts: typeof integrations | null = null;

          try {
            loadedAccounts = await loadCalendarIntegrations();
          } catch {
            // El hook ya guardó el error de las cuentas.
          }

          await syncConnectedAccounts(
            false,
            loadedAccounts ?? undefined,
          );
          await loadVisibleRange(true);
        })();
      },
    );

    return unsubscribe;
  }, [
    loadCalendarIntegrations,
    loadVisibleRange,
    navigation,
    syncConnectedAccounts,
  ]);

  const handleSelectMonth = (
    monthIndex: number,
  ) => {
    const anchor = selectedDate ?? viewAnchorDate;
    const currentDate = parseDate(anchor);
    const nextDate = new Date(
      currentDate.getFullYear(),
      monthIndex,
      Math.min(
        currentDate.getDate(),
        28,
      ),
    );

    applySelectedDate(
      formatDate(nextDate),
    );
  };

  const handleSelectYear = (
    year: number,
  ) => {
    const anchor = selectedDate ?? viewAnchorDate;
    const currentDate = parseDate(anchor);
    const nextDate = new Date(
      year,
      currentDate.getMonth(),
      Math.min(
        currentDate.getDate(),
        28,
      ),
    );

    applySelectedDate(
      formatDate(nextDate),
    );
  };

  const shiftPeriod = (
    direction: -1 | 1,
  ) => {
    const anchor = selectedDate ?? viewAnchorDate;

    const nextAnchor = currentView === 'month'
      ? addMonths(
        anchor,
        direction,
      )
      : addDays(
        anchor,
        currentView === 'day'
          ? direction
          : direction * 7,
      );

    if (selectedDate === null) {
      setViewAnchorDate(nextAnchor);
      return;
    }

    applySelectedDate(nextAnchor);
  };

  const handleFabAction = (
    type: 'meeting' | 'event',
  ) => {
    setFabMenuVisible(false);

    router.push({
      pathname: '/(main)/calendar/edit',
      params: {
        type,
        date: selectedDate ?? TODAY_STR,
        account: activeAccount === 'all'
          ? ''
          : activeAccount,
      },
    });
  };

  const handleOpenExternalCalendars = () => {
    router.push(
      '/(main)/calendar/external-calendars',
    );
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
    appAlert(
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
    closeContextMenu();

    try {
      await deleteEvent(event.id);

      appAlert(
        'Evento eliminado',
        'El evento fue eliminado de tu agenda.',
      );

      void loadVisibleRange(true);
    } catch (deleteError) {
      appAlert(
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
    const duplicateTargetDate = selectedDate
      ?? event.date
      ?? TODAY_STR;

    appAlert(
      'Duplicar evento',
      (
        `Se creará una copia de “${event.title}” `
        + `para el ${duplicateTargetDate}.`
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
    const duplicateTargetDate = selectedDate
      ?? event.date
      ?? TODAY_STR;

    const pastStartMessage = getPastCalendarEventStartMessage(
      event.isAllDay
        ? {
          date: duplicateTargetDate,
          timeStart: '00:00',
          isAllDay: true,
        }
        : {
          date: duplicateTargetDate,
          timeStart: event.timeStart,
          isAllDay: false,
        },
    );


    if (pastStartMessage) {
      appAlert(
        'Fecha no válida',
        pastStartMessage,
      );
      return;
    }


    try {
      if (event.isAllDay) {
        await duplicateEvent(
          event.id,
          {
            starts_on: duplicateTargetDate,
            ends_on: addDaysToDateString(
              duplicateTargetDate,
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
              duplicateTargetDate,
              event.timeStart,
            ),
            ends_at: createDateTimeWithOffset(
              duplicateTargetDate,
              event.timeEnd,
            ),
            include_attendees: false,
            include_reminders: true,
            include_recurrence: false,
          },
        );
      }

      closeContextMenu();

      appAlert(
        'Evento duplicado',
        (
          `Se creó una copia para el `
          + `${duplicateTargetDate}.`
        ),
      );

      await loadVisibleRange(true);
    } catch (duplicateError) {
      appAlert(
        'No fue posible duplicar el evento',
        duplicateError instanceof Error
          ? duplicateError.message
          : 'Intenta nuevamente.',
      );
    }
  };

  const listSectionTitle = useMemo(() => {
    if (homeSearch.hasActiveQuery) {
      return 'Resultados de búsqueda';
    }

    if (activeFilter === 'past') {
      return 'Eventos de los últimos 7 días';
    }

    if (activeFilter === 'upcoming') {
      return 'Próximos 7 días';
    }

    if (!selectedDate) {
      return 'Eventos';
    }

    const date = parseDate(selectedDate);

    return (
      `Eventos del ${date.getDate()} `
      + `de ${monthName(date)}`
    );
  }, [
    activeFilter,
    homeSearch.hasActiveQuery,
    selectedDate,
  ]);

  const listEmptyCopy = useMemo(() => {
    if (homeSearch.hasActiveQuery) {
      const emptyCopy = homeSearchEmptyCopy(homeSearch.query);

      return {
        emptyHint: emptyCopy.description,
        emptyTitle: emptyCopy.title,
      };
    }

    if (activeFilter === 'past') {
      return {
        emptyHint: 'Prueba otro filtro o crea un evento.',
        emptyTitle: 'Sin eventos en los últimos 7 días',
      };
    }

    if (activeFilter === 'upcoming') {
      return {
        emptyHint: 'Toca el botón + para crear uno.',
        emptyTitle: 'Sin eventos en los próximos 7 días',
      };
    }

    return {
      emptyHint: 'Toca el botón + para crear uno.',
      emptyTitle: 'Sin eventos para este día',
    };
  }, [
    activeFilter,
    homeSearch.hasActiveQuery,
    homeSearch.query,
  ]);

  const showEventDateInList = homeSearch.hasActiveQuery
    || isRangeFilter(activeFilter);

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
          onOpenExternalCalendars={
            router.embedded
              ? undefined
              : handleOpenExternalCalendars
          }
          onToday={() => applySelectedDate(TODAY_STR)}
          currentView={currentView}
          onViewChange={setCurrentView}
          activeAccount={activeAccount}
          accounts={accountOptions}
          accountMenuVisible={accountMenuVisible}
          onToggleAccountMenu={() => {
            setAccountMenuVisible((visible) => !visible);
          }}
          onSelectAccount={(account) => {
            setActiveAccount(account);
            setAccountMenuVisible(false);
          }}
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
                    viewAnchorDate,
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
              events={accountEvents}
              viewDate={viewAnchorDate}
              selectedDate={selectedDate}
              onSelectDate={applySelectedDate}
            />
          </View>
        ) : (
          <CalendarWeekStrip
            events={accountEvents}
            viewDate={viewAnchorDate}
            selectedDate={selectedDate}
            onSelectDate={applySelectedDate}
            onShift={shiftPeriod}
            label={periodLabel(
              viewAnchorDate,
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

        <CalendarFilterChips
          selectedDate={selectedDate}
          activeFilter={activeFilter}
          onChange={handleFilterChange}
        />

        <ScrollView
          style={styles.mainScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void (async () => {
                  await syncConnectedAccounts(true);
                  await loadVisibleRange(true);
                })();
              }}
              tintColor={colors.brand.primary}
            />
          }
        >
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
              {error ? (
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
                      void (async () => {
                        await syncConnectedAccounts(true);
                        await loadVisibleRange(true);
                      })();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.retryButtonText}>
                      Reintentar
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {currentView === 'day'
                && selectedDate
                && !isRangeFilter(activeFilter) ? (
                <View style={styles.plannerContainer}>
                  <Text style={styles.plannerSelectedDay}>
                    Planificación por horas
                  </Text>

                  <CalendarHourlyAgenda
                    events={accountEvents}
                    selectedDate={selectedDate}
                    onEventPress={goToDetail}
                    onEventLongPress={openContextMenu}
                  />
                </View>
              ) : null}

              <Text style={styles.sectionTitle}>
                {listSectionTitle}
              </Text>

              <CalendarEventsList
                events={listedEvents}
                emptyHint={listEmptyCopy.emptyHint}
                emptyTitle={listEmptyCopy.emptyTitle}
                onEventPress={goToDetail}
                onEventLongPress={openContextMenu}
                showEventDate={showEventDateInList}
              />
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <MonthPickerModal
          visible={monthPickerVisible}
          selectedDate={selectedDate ?? viewAnchorDate}
          onClose={() =>
            setMonthPickerVisible(false)
          }
          onSelectMonth={handleSelectMonth}
        />

        <YearPickerModal
          visible={yearPickerVisible}
          selectedDate={selectedDate ?? viewAnchorDate}
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

        {!router.embedded ? (
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
        ) : null}

        {!router.embedded ? (
          <FloatingTabBar activeTab="explore" />
        ) : null}
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