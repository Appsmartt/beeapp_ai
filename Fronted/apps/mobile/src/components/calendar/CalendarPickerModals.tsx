import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  X,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import {
  parseDate,
} from '../../utils/dateHelpers';


const SHORT_MONTHS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];


interface MonthPickerModalProps {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onSelectMonth: (monthIndex: number) => void;
}


export function MonthPickerModal({
  visible,
  selectedDate,
  onClose,
  onSelectMonth,
}: MonthPickerModalProps) {
  const currentMonth = parseDate(
    selectedDate,
  ).getMonth();


  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />


        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Seleccionar mes
            </Text>


            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <X
                size={18}
                color={colors.neutral.text}
              />
            </TouchableOpacity>
          </View>


          <View style={styles.grid}>
            {SHORT_MONTHS.map((monthName, index) => {
              const isSelected =
                index === currentMonth;


              return (
                <TouchableOpacity
                  key={monthName}
                  style={[
                    styles.monthCell,
                    isSelected
                      && styles.monthCellSelected,
                  ]}
                  onPress={() => {
                    onSelectMonth(index);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.monthText,
                      isSelected
                        && styles.monthTextSelected,
                    ]}
                  >
                    {monthName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}


interface YearPickerModalProps {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onSelectYear: (year: number) => void;
}


export function YearPickerModal({
  visible,
  selectedDate,
  onClose,
  onSelectYear,
}: YearPickerModalProps) {
  const selectedYear = parseDate(
    selectedDate,
  ).getFullYear();


  const currentYear = new Date().getFullYear();


  const firstYear = Math.min(
    selectedYear - 20,
    currentYear - 20,
  );


  const lastYear = Math.max(
    selectedYear + 20,
    currentYear + 20,
  );


  const years = Array.from(
    {
      length: lastYear - firstYear + 1,
    },
    (_, index) => firstYear + index,
  ).reverse();


  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />


        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>
              Seleccionar año
            </Text>


            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <X
                size={18}
                color={colors.neutral.text}
              />
            </TouchableOpacity>
          </View>


          <ScrollView
            style={styles.yearScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.yearList}>
              {years.map((year) => {
                const isSelected =
                  year === selectedYear;


                return (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.yearRow,
                      isSelected
                        && styles.yearRowSelected,
                    ]}
                    onPress={() => {
                      onSelectYear(year);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.yearText,
                        isSelected
                          && styles.yearTextSelected,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  closeBtn: {
    padding: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthCell: {
    width: '30%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  monthCellSelected: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  monthTextSelected: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
  yearScroll: {
    maxHeight: 300,
  },
  yearList: {
    gap: 8,
  },
  yearRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.neutral.gray50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  yearRowSelected: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  yearText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  yearTextSelected: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
});