import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronLeft,
  Plus,
  Settings2,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';


import ModuleNotificationBell from '../ModuleNotificationBell';


export type ViewMode =
  | 'day'
  | 'week'
  | 'month';


export type FilterChip =
  | 'upcoming'
  | 'past'
  | 'meetings'
  | 'events';


interface CalendarHeaderProps {
  onBack?: () => void;
  onAction?: () => void;
  onOpenExternalCalendars?: () => void;
  onToday: () => void;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}


export function CalendarHeader({
  onBack,
  onAction,
  onOpenExternalCalendars,
  onToday,
  currentView,
  onViewChange,
}: CalendarHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.headerLeftCol}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backBtn}
              activeOpacity={0.7}
              accessibilityLabel="Volver"
            >
              <ChevronLeft
                size={24}
                color={colors.neutral.text}
              />
            </TouchableOpacity>
          ) : null}

          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            Agenda
          </Text>
        </View>

        <View style={styles.headerActions}>
          <ModuleNotificationBell moduleId="calendar" />

          {onOpenExternalCalendars ? (
            <TouchableOpacity
              onPress={onOpenExternalCalendars}
              style={styles.externalCalendarsBtn}
              activeOpacity={0.7}
              accessibilityLabel="Configurar calendarios externos"
            >
              <Settings2
                size={18}
                color={colors.brand.primary}
              />
            </TouchableOpacity>
          ) : null}

          {onAction ? (
            <TouchableOpacity
              onPress={onAction}
              style={styles.headerActionBtn}
              activeOpacity={0.8}
              accessibilityLabel="Crear evento"
            >
              <Plus
                size={18}
                color={colors.neutral.white}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.bottomRow}>
        <TouchableOpacity
          onPress={onToday}
          style={styles.todayBtn}
          activeOpacity={0.7}
          accessibilityLabel="Ir a hoy"
        >
          <Text style={styles.todayBtnText}>
            Hoy
          </Text>
        </TouchableOpacity>

        <View style={styles.viewSegment}>
          {([
            'day',
            'week',
            'month',
          ] as ViewMode[]).map((view) => {
            const isActive = currentView === view;

            return (
              <TouchableOpacity
                key={view}
                style={[
                  styles.segmentBtn,
                  isActive
                    ? styles.segmentBtnActive
                    : undefined,
                ]}
                onPress={() => onViewChange(view)}
                activeOpacity={0.7}
                accessibilityLabel={`Ver agenda por ${
                  view === 'day'
                    ? 'día'
                    : view === 'week'
                      ? 'semana'
                      : 'mes'
                }`}
              >
                <Text
                  style={[
                    styles.segmentText,
                    isActive
                      ? styles.segmentTextActive
                      : undefined,
                  ]}
                >
                  {view === 'day'
                    ? 'Día'
                    : view === 'week'
                      ? 'Sem'
                      : 'Mes'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}


const FILTER_CHIPS: Array<{
  id: FilterChip;
  label: string;
}> = [
  {
    id: 'upcoming',
    label: 'Próximos',
  },
  {
    id: 'past',
    label: 'Pasados',
  },
  {
    id: 'meetings',
    label: 'Reuniones',
  },
  {
    id: 'events',
    label: 'Eventos',
  },
];


interface CalendarFilterChipsProps {
  activeFilter: FilterChip;
  onChange: (filter: FilterChip) => void;
}


export function CalendarFilterChips({
  activeFilter,
  onChange,
}: CalendarFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filtersScroll}
      contentContainerStyle={styles.filtersContent}
    >
      {FILTER_CHIPS.map((filter) => {
        const isActive = activeFilter === filter.id;

        return (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              isActive
                ? styles.filterChipActive
                : undefined,
            ]}
            onPress={() => onChange(filter.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                isActive
                  ? styles.filterChipTextActive
                  : undefined,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLeftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  externalCalendarsBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.gray50,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.brand.primary,
  },
  viewSegment: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.neutral.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  segmentTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  headerActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersScroll: {
    marginVertical: 14,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  filterChipActive: {
    backgroundColor: colors.brand.primary + '15',
    borderColor: colors.brand.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  filterChipTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
});