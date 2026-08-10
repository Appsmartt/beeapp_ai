
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Plus } from 'lucide-react-native';
import ModuleNotificationBell from '../ModuleNotificationBell';

export type ViewMode = 'day' | 'week' | 'month';
export type FilterChip = 'upcoming' | 'past' | 'meetings' | 'events';

interface CalendarHeaderProps {
  /** Omitted when there is nothing to go back to (root of an embedded module) */
  onBack?: () => void;
  /** Create action shown in the header while embedded (instead of a FAB) */
  onAction?: () => void;
  onToday: () => void;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function CalendarHeader({ onBack, onAction, onToday, currentView, onViewChange }: CalendarHeaderProps) {
  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeftCol}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <ChevronLeft size={24} color={colors.neutral.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Agenda</Text>
        </View>

        {/* Today and View triggers */}
        <View style={styles.headerActions}>
          <ModuleNotificationBell moduleId="calendar" />
          <TouchableOpacity onPress={onToday} style={styles.todayBtn} activeOpacity={0.7}>
            <Text style={styles.todayBtnText}>Hoy</Text>
          </TouchableOpacity>

          <View style={styles.viewSegment}>
            {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.segmentBtn, currentView === v && styles.segmentBtnActive]}
                onPress={() => onViewChange(v)}
              >
                <Text style={[styles.segmentText, currentView === v && styles.segmentTextActive]}>
                  {v === 'day' ? 'Día' : v === 'week' ? 'Sem' : 'Mes'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {onAction && (
            <TouchableOpacity onPress={onAction} style={styles.headerActionBtn} activeOpacity={0.8}>
              <Plus size={18} color={colors.neutral.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}

const FILTER_CHIPS: { id: FilterChip; label: string }[] = [
  { id: 'upcoming', label: 'Próximos' },
  { id: 'past', label: 'Pasados' },
  { id: 'meetings', label: 'Reuniones' },
  { id: 'events', label: 'Eventos' },
];

interface CalendarFilterChipsProps {
  activeFilter: FilterChip;
  onChange: (filter: FilterChip) => void;
}

export function CalendarFilterChips({ activeFilter, onChange }: CalendarFilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersContent}>
      {FILTER_CHIPS.map((f) => {
        const active = activeFilter === f.id;
        return (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onChange(f.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontWeight: '400',
    color: colors.brand.primary,
  },
  viewSegment: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.neutral.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
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
