
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';

export default function HomeStorageCard() {
  return (
    <View style={styles.storageCard}>
      <View style={styles.storageHeaderRow}>
        <View>
          <Text style={styles.storageTitle}>Espacio de Almacenamiento</Text>
          <Text style={styles.planBadge}>Plan BeeApp Plus</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.upgradeBtn}>
          <Text style={styles.upgradeBtnText}>Mejorar</Text>
        </TouchableOpacity>
      </View>
      {/* Progress bar */}
      <View style={styles.storageProgressBarContainer}>
        <View style={styles.storageProgressBarTrack}>
          <View style={[styles.storageProgressBarFill, { width: '55%' }]} />
        </View>
        <Text style={styles.storageLimitText}>8.2 GB de 15 GB usados (55%)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  storageCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    marginBottom: 24,
  },
  storageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  planBadge: {
    fontSize: 11,
    color: colors.brand.primary,
    fontWeight: '700',
  },
  upgradeBtn: {
    backgroundColor: colors.neutral.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  upgradeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  storageProgressBarContainer: {
    width: '100%',
  },
  storageProgressBarTrack: {
    height: 8,
    backgroundColor: colors.neutral.gray100,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  storageProgressBarFill: {
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: 4,
  },
  storageLimitText: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '500',
  },
});
