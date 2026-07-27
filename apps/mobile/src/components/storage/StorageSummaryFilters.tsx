
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { StorageFilter } from '../../utils/storageHelpers';

// Storage breakdown calculations
const totalSpace = 15; // GB
const usedSpace = 8.2; // GB
const progressPercent = (usedSpace / totalSpace) * 100;

export function StorageSummaryCard() {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryInfo}>
        <Text style={styles.summaryTitle}>Espacio Disponible</Text>
        <Text style={styles.summaryStats}>{usedSpace} GB de {totalSpace} GB usados ({progressPercent.toFixed(0)}%)</Text>
      </View>
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>
      <Text style={styles.breakdownText}>
        Documentos: 3.4 GB | Multimedia: 4.2 GB | Otros: 0.6 GB
      </Text>
    </View>
  );
}

const FILTER_CHIPS: { id: StorageFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'recent', label: 'Recientes' },
  { id: 'docs', label: 'Documentos' },
  { id: 'media', label: 'Fotos y Videos' },
  { id: 'signed', label: 'Firmados' },
  { id: 'shared', label: 'Compartidos' },
];

interface StorageFilterChipsProps {
  activeFilter: StorageFilter;
  onChange: (filter: StorageFilter) => void;
}

export function StorageFilterChips({ activeFilter, onChange }: StorageFilterChipsProps) {
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

interface StorageBreadcrumbsProps {
  pathStack: { id: string | null; name: string }[];
  onPress: (index: number) => void;
}

export function StorageBreadcrumbs({ pathStack, onPress }: StorageBreadcrumbsProps) {
  return (
    <View style={styles.breadcrumbBar}>
      {pathStack.map((stackItem, idx) => (
        <View key={idx} style={styles.breadcrumbItemWrap}>
          {idx > 0 && <Text style={styles.breadcrumbSeparator}>/</Text>}
          <TouchableOpacity onPress={() => onPress(idx)} activeOpacity={0.7}>
            <Text
              style={[
                styles.breadcrumbText,
                idx === pathStack.length - 1 && styles.breadcrumbTextActive,
              ]}
            >
              {stackItem.name}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Summary block, not a card: no background, border or shadow
  summaryCard: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  summaryInfo: {
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  summaryStats: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '400',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.neutral.gray100,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: 4,
  },
  breakdownText: {
    fontSize: 10,
    color: colors.neutral.gray600,
    fontWeight: '400',
  },
  filtersScroll: {
    marginVertical: 12,
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
  breadcrumbBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 4,
  },
  breadcrumbItemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbSeparator: {
    fontSize: 13,
    color: colors.neutral.gray400,
    fontWeight: '400',
  },
  breadcrumbText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  breadcrumbTextActive: {
    color: colors.neutral.text,
    fontWeight: '600',
  },
});
