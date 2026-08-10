import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { Check, X } from 'lucide-react-native';
import { REMINDER_OPTIONS } from '../../stores/calendarStore';

interface ReminderBottomSheetProps {
  visible: boolean;
  selectedReminder: string;
  onSelect: (reminder: string) => void;
  onClose: () => void;
}

/** Bottom sheet for selecting event reminder intervals in mobile */
export default function ReminderBottomSheet({
  visible,
  selectedReminder,
  onSelect,
  onClose,
}: ReminderBottomSheetProps) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Recordatorio</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.neutral.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {REMINDER_OPTIONS.map((option) => {
              const isSelected = selectedReminder === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={styles.row}
                  onPress={() => {
                    onSelect(option);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>
                    {option}
                  </Text>
                  {isSelected && <Check size={18} color={colors.brand.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  rowText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  rowTextSelected: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
});
