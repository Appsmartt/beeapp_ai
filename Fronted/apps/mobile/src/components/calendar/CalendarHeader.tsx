import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Plus,
  Settings2,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import ModuleNotificationBell from '../ModuleNotificationBell';
import {
  formatDate,
  parseDate,
} from '../../utils/dateHelpers';


export type ViewMode =
  | 'day'
  | 'week'
  | 'month';


export type FilterChip =
  | 'upcoming'
  | 'past'
  | 'meetings'
  | 'events';

/** Sin chip activo: solo eventos del día seleccionado. */
export type CalendarActiveFilter =
  | FilterChip
  | null;

export type CalendarAccountFilter = 'all' | string;

export interface CalendarAccountOption {
  id: string;
  label: string;
  provider: string;
  isActive: boolean;
}

interface CalendarHeaderProps {
  onBack?: () => void;
  onAction?: () => void;
  onOpenExternalCalendars?: () => void;
  onToday: () => void;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  activeAccount: CalendarAccountFilter;
  accounts: CalendarAccountOption[];
  accountMenuVisible: boolean;
  onToggleAccountMenu: () => void;
  onSelectAccount: (account: CalendarAccountFilter) => void;
}

function providerColor(provider: string): string {
  if (provider === 'google') {
    return '#4285F4';
  }

  if (provider === 'microsoft') {
    return '#0078D4';
  }

  return colors.brand.primary;
}


export function CalendarHeader({
  onBack,
  onAction,
  onOpenExternalCalendars,
  onToday,
  currentView,
  onViewChange,
  activeAccount,
  accounts,
  accountMenuVisible,
  onToggleAccountMenu,
  onSelectAccount,
}: CalendarHeaderProps) {
  const activeAccountLabel = activeAccount === 'all'
    ? 'Todas las cuentas'
    : (
      accounts.find(
        (account) => account.id === activeAccount,
      )?.label
      || 'Cuenta seleccionada'
    );
  const insets = useSafeAreaInsets();

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

      <TouchableOpacity
        style={styles.accountSelectorBtn}
        onPress={onToggleAccountMenu}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Filtrar eventos por cuenta"
      >
        <Text
          style={styles.accountNameText}
          numberOfLines={1}
        >
          {activeAccountLabel}
        </Text>

        <ChevronDown
          size={16}
          color={colors.neutral.gray600}
          style={styles.accountChevron}
        />
      </TouchableOpacity>

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

      <Modal
        visible={accountMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={onToggleAccountMenu}
      >
        <Pressable
          style={[
            styles.accountMenuBackdrop,
            { paddingTop: insets.top + 108 },
          ]}
          onPress={onToggleAccountMenu}
        >
          <Pressable
            style={styles.accountMenu}
            onPress={() => undefined}
          >
          <ScrollView
            style={styles.accountMenuScroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={[
                styles.accountMenuItem,
                activeAccount === 'all'
                  && styles.accountMenuItemActive,
              ]}
              onPress={() => onSelectAccount('all')}
              activeOpacity={0.7}
            >
              <CalendarDays
                size={16}
                color={
                  activeAccount === 'all'
                    ? colors.brand.primary
                    : colors.neutral.gray600
                }
              />

              <Text
                style={[
                  styles.accountMenuText,
                  activeAccount === 'all'
                    && styles.accountMenuTextActive,
                ]}
              >
                Todas las cuentas
              </Text>
            </TouchableOpacity>

            {accounts.map((account) => {
              const isSelected = activeAccount === account.id;

              return (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.accountMenuItem,
                    isSelected
                      && styles.accountMenuItemActive,
                  ]}
                  onPress={() => onSelectAccount(account.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.accountDot,
                      {
                        backgroundColor: providerColor(account.provider),
                        opacity: account.isActive ? 1 : 0.45,
                      },
                    ]}
                  />

                  <View style={styles.accountTextColumn}>
                    <Text
                      style={[
                        styles.accountMenuText,
                        isSelected
                          && styles.accountMenuTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {account.label}
                    </Text>

                    {!account.isActive ? (
                      <Text style={styles.inactiveText}>
                        Requiere reconexión
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  selectedDate: string | null;
  activeFilter: CalendarActiveFilter;
  onChange: (filter: CalendarActiveFilter) => void;
}


export function CalendarFilterChips({
  selectedDate,
  activeFilter,
  onChange,
}: CalendarFilterChipsProps) {
  const todayString = formatDate(new Date());
  const todayTimestamp = parseDate(
    todayString,
  ).getTime();
  const selectedTimestamp = selectedDate
    ? parseDate(selectedDate).getTime()
    : null;
  const isFutureSelectedDay = selectedTimestamp !== null
    && selectedTimestamp > todayTimestamp;

  const visibleChips = FILTER_CHIPS.filter(
    (filter) => {
      if (
        filter.id === 'past'
        && isFutureSelectedDay
      ) {
        return false;
      }

      return true;
    },
  );

  return (
    <View style={styles.filtersRow}>
      {visibleChips.map((filter) => {
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
            onPress={() => {
              onChange(
                isActive
                  ? null
                  : filter.id,
              );
            }}
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
    </View>
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
  accountSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  accountNameText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  accountChevron: {
    marginLeft: 6,
  },
  accountMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  accountMenu: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingVertical: 4,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 18,
  },
  accountMenuScroll: {
    flexGrow: 0,
  },
  accountMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  accountMenuItemActive: {
    backgroundColor: `${colors.brand.primary}15`,
  },
  accountMenuText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.text,
    marginLeft: 12,
    flex: 1,
  },
  accountMenuTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  accountTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  inactiveText: {
    marginLeft: 12,
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral.gray500,
  },
  accountDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 14,
    paddingHorizontal: 20,
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