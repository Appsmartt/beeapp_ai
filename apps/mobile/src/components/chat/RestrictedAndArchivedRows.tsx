import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Lock, Archive, ChevronRight } from 'lucide-react-native';

interface RestrictedAndArchivedRowsProps {
  protectedCount: number;
  archivedCount: number;
  onPressRestricted: () => void;
  onPressArchived: () => void;
}

export default function RestrictedAndArchivedRows({
  protectedCount,
  archivedCount,
  onPressRestricted,
  onPressArchived,
}: RestrictedAndArchivedRowsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.row}
        onPress={onPressRestricted}
        activeOpacity={0.7}
      >
        <View style={styles.leftGroup}>
          <View style={[styles.iconBox, { backgroundColor: colors.brand.primary + '15' }]}>
            <Lock size={16} color={colors.brand.primary} />
          </View>
          <Text style={styles.label}>Chats restringidos</Text>
        </View>

        <View style={styles.rightGroup}>
          {protectedCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{protectedCount}</Text>
            </View>
          )}
          <ChevronRight size={16} color={colors.neutral.gray400} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        onPress={onPressArchived}
        activeOpacity={0.7}
      >
        <View style={styles.leftGroup}>
          <View style={[styles.iconBox, { backgroundColor: colors.neutral.gray200 }]}>
            <Archive size={16} color={colors.neutral.gray700} />
          </View>
          <Text style={styles.label}>Chats archivados</Text>
        </View>

        <View style={styles.rightGroup}>
          {archivedCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.neutral.gray200 }]}>
              <Text style={[styles.badgeText, { color: colors.neutral.gray700 }]}>{archivedCount}</Text>
            </View>
          )}
          <ChevronRight size={16} color={colors.neutral.gray400} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.white,
  },
});
