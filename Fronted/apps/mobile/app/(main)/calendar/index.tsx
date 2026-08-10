import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useNavigation } from 'expo-router';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { getEvents, setEvents, CalendarEvent, TODAY_STR } from '../../../src/stores/calendarStore';
import CalendarMonthGrid from '../../../src/components/calendar/CalendarMonthGrid';
import CalendarWeekStrip from '../../../src/components/calendar/CalendarWeekStrip';
import CalendarHourlyAgenda from '../../../src/components/calendar/CalendarHourlyAgenda';
import CalendarEventsList from '../../../src/components/calendar/CalendarEventsList';
import { CalendarContextMenu, CalendarFabMenu, FAB_BOTTOM_OFFSET } from '../../../src/components/calendar/CalendarMenus';
import { CalendarHeader, CalendarFilterChips, ViewMode, FilterChip } from '../../../src/components/calendar/CalendarHeader';
import { MonthPickerModal, YearPickerModal } from '../../../src/components/calendar/CalendarPickerModals';
import { addDays, addMonths, periodLabel, parseDate, monthName, formatDate } from '../../../src/utils/dateHelpers';

export default function CalendarIndexScreen() {
  const router = useModuleNav();
  const navigation = useNavigation();

  // Calendar States
  const [events, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_STR);
  const [currentView, setCurrentView] = useState<ViewMode>('week');
  // Search moved to the global Home search bar: the module keeps the filter dormant
  const [searchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('upcoming');

  // Menu / Modal states
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

  const handleSelectMonth = (monthIdx: number) => {
    const cur = parseDate(selectedDate);
    const updated = new Date(cur.getFullYear(), monthIdx, Math.min(cur.getDate(), 28));
    setSelectedDate(formatDate(updated));
  };

  const handleSelectYear = (year: number) => {
    const cur = parseDate(selectedDate);
    const updated = new Date(year, cur.getMonth(), Math.min(cur.getDate(), 28));
    setSelectedDate(formatDate(updated));
  };

  // Load events
  useEffect(() => {
    setLocalEvents(getEvents());
    const unsubscribe = navigation.addListener('focus', () => {
      setLocalEvents(getEvents());
    });
    return unsubscribe;
  }, [navigation]);

  const syncEvents = (newEvents: CalendarEvent[]) => {
    setLocalEvents(newEvents);
    setEvents(newEvents);
  };

  // Delete event
  const handleDeleteEvent = (event: CalendarEvent) => {
    const updated = events.filter((e) => e.id !== event.id);
    syncEvents(updated);
    alert('Reunión/Evento eliminado.');
    setContextMenuVisible(false);
    setActiveEvent(null);
  };

  // Duplicate event
  const handleDuplicateEvent = (event: CalendarEvent) => {
    const duplicated: CalendarEvent = {
      ...event,
      id: `e-dup-${Date.now()}`,
      title: `${event.title} (Copia)`,
      date: TODAY_STR,
    };
    syncEvents([...events, duplicated]);
    alert('Elemento duplicado para Hoy.');
    setContextMenuVisible(false);
    setActiveEvent(null);
  };

  // Filter events logic
  const getFilteredEvents = () => {
    let list = events;

    // 1. Search Query
    if (searchQuery) {
      list = list.filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()));
    } else {
      // If not searching, filter by selected date
      list = list.filter((e) => e.date === selectedDate);
    }

    // 2. Filter chips
    const todayNum = new Date(TODAY_STR).getTime();
    if (activeFilter === 'upcoming') {
      list = list.filter((e) => new Date(e.date).getTime() >= todayNum);
    } else if (activeFilter === 'past') {
      list = list.filter((e) => new Date(e.date).getTime() < todayNum);
    } else if (activeFilter === 'meetings') {
      list = list.filter((e) => e.type === 'meeting');
    } else if (activeFilter === 'events') {
      list = list.filter((e) => e.type === 'event');
    }

    return list.sort((a, b) => a.timeStart.localeCompare(b.timeStart));
  };

  // Side arrows: move a day / a week / a month depending on the active view
  const shiftPeriod = (direction: -1 | 1) => {
    if (currentView === 'month') {
      setSelectedDate(addMonths(selectedDate, direction));
    } else {
      setSelectedDate(addDays(selectedDate, currentView === 'day' ? direction : direction * 7));
    }
  };

  const handleFabAction = (type: 'meeting' | 'event') => {
    setFabMenuVisible(false);
    router.push({
      pathname: '/(main)/calendar/edit',
      params: { type, date: selectedDate },
    });
  };

  const openContextMenu = (event: CalendarEvent) => {
    setActiveEvent(event);
    setContextMenuVisible(true);
  };

  const goToDetail = (event: CalendarEvent) => {
    router.push({
      pathname: '/(main)/calendar/detail',
      params: { id: event.id },
    });
  };

  const filteredEvents = getFilteredEvents();

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <CalendarHeader
          onBack={router.canGoBack ? () => router.back() : undefined}
          onAction={router.embedded ? () => setFabMenuVisible(!fabMenuVisible) : undefined}
          onToday={() => setSelectedDate(TODAY_STR)}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {/* Compact day strip (default) or the full month grid under "Mes" */}
        {currentView === 'month' ? (
          <View style={styles.monthViewport}>
            <View style={styles.navRow}>
              <TouchableOpacity style={styles.navBtn} onPress={() => shiftPeriod(-1)} activeOpacity={0.7}>
                <ChevronLeft size={18} color={colors.brand.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMonthPickerVisible(true)} activeOpacity={0.7}>
                <Text style={styles.navLabel}>{periodLabel(selectedDate, 'month')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={() => shiftPeriod(1)} activeOpacity={0.7}>
                <ChevronRight size={18} color={colors.brand.primary} />
              </TouchableOpacity>
            </View>
            <CalendarMonthGrid events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </View>
        ) : (
          <CalendarWeekStrip
            events={events}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onShift={shiftPeriod}
            label={periodLabel(selectedDate, currentView)}
            onOpenMonthPicker={() => setMonthPickerVisible(true)}
            onOpenYearPicker={() => setYearPickerVisible(true)}
          />
        )}

        <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
          {/* Filter Chips */}
          <CalendarFilterChips activeFilter={activeFilter} onChange={setActiveFilter} />

          {/* Day planner (only in "Día") */}
          {currentView === 'day' && (
            <View style={styles.plannerContainer}>
              <Text style={styles.plannerSelectedDay}>Planificación por horas</Text>
              <CalendarHourlyAgenda
                events={events}
                selectedDate={selectedDate}
                onEventPress={goToDetail}
                onEventLongPress={openContextMenu}
              />
            </View>
          )}

          {/* Events of the selected day */}
          <Text style={styles.sectionTitle}>
            {`Eventos del ${parseDate(selectedDate).getDate()} de ${monthName(parseDate(selectedDate))}`}
          </Text>
          <CalendarEventsList
            events={filteredEvents}
            onEventPress={goToDetail}
            onEventLongPress={openContextMenu}
          />

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Month and Year Pickers */}
        <MonthPickerModal
          visible={monthPickerVisible}
          selectedDate={selectedDate}
          onClose={() => setMonthPickerVisible(false)}
          onSelectMonth={handleSelectMonth}
        />
        <YearPickerModal
          visible={yearPickerVisible}
          selectedDate={selectedDate}
          onClose={() => setYearPickerVisible(false)}
          onSelectYear={handleSelectYear}
        />

        {/* Options Context Menu Overlay */}
        <CalendarContextMenu
          visible={contextMenuVisible}
          event={activeEvent}
          onClose={() => setContextMenuVisible(false)}
          onViewDetail={goToDetail}
          onEdit={(event) =>
            router.push({
              pathname: '/(main)/calendar/edit',
              params: { id: event.id, type: event.type },
            })
          }
          onDuplicate={handleDuplicateEvent}
          onDelete={handleDeleteEvent}
        />

        {/* FAB Menu Selection Drawer */}
        <CalendarFabMenu
          embedded={router.embedded}
          visible={fabMenuVisible}
          onClose={() => setFabMenuVisible(false)}
          onAction={handleFabAction}
        />

        {/* FAB (+) Trigger - standalone only: embedded it lives in the header */}
        {!router.embedded && (
          <TouchableOpacity
            style={styles.createFab}
            onPress={() => setFabMenuVisible(!fabMenuVisible)}
            activeOpacity={0.8}
          >
            <Plus size={24} color={colors.neutral.white} />
          </TouchableOpacity>
        )}

        {/* Tab Menu bar */}
        {!router.embedded && <FloatingTabBar activeTab="explore" />}
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
});
