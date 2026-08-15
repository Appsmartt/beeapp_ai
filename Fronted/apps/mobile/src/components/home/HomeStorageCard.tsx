import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bell } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import {
  getNotifications,
  getStorageSummary,
} from '@beeapp/api-client';
import type {
  StorageSummary,
} from '@beeapp/shared-types';

import {
  formatBytes,
  getStorageSummary as getStoredStorageSummary,
  setStorageSummary,
} from '../../stores/storageStore';
import {
  getValidSessionCredentials,
} from '../../services/authSession';

interface HomeStorageCardProps {
  onUpgradePress?: () => void;
}

const STORAGE_NOTIFICATION_MODULE = 'storage';

function getUsagePercentage(
  usedBytes: number,
  quotaBytes: number,
  apiPercentage: number,
): number {
  if (
    Number.isFinite(apiPercentage)
    && apiPercentage >= 0
  ) {
    return Math.min(100, Math.max(0, apiPercentage));
  }

  if (
    !Number.isFinite(usedBytes)
    || !Number.isFinite(quotaBytes)
    || quotaBytes <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, (usedBytes / quotaBytes) * 100),
  );
}

export default function HomeStorageCard({
  onUpgradePress,
}: HomeStorageCardProps) {
  const [summary, setSummary] = useState<StorageSummary | null>(
    getStoredStorageSummary(),
  );

  const [unreadNotifications, setUnreadNotifications] =
    useState(0);

  const [loading, setLoading] = useState(
    !getStoredStorageSummary(),
  );

  const loadCardData = useCallback(async () => {
    try {
      const auth = await getValidSessionCredentials();

      if (!auth) {
        return;
      }

      const [
        summaryResponse,
        notificationsResponse,
      ] = await Promise.all([
        getStorageSummary(auth),
        getNotifications(auth, {
          module: STORAGE_NOTIFICATION_MODULE,
          unread_only: true,
          limit: 1,
          offset: 0,
        }),
      ]);

      setStorageSummary(summaryResponse.storage);
      setSummary(summaryResponse.storage);
      setUnreadNotifications(
        notificationsResponse.unread_count,
      );
    } catch {
      // La card conserva el último resumen disponible si falla la carga.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCardData();
  }, [loadCardData]);

  const usedBytes = summary?.used_bytes ?? 0;
  const quotaBytes = summary?.quota_bytes ?? 0;

  const usagePercentage = getUsagePercentage(
    usedBytes,
    quotaBytes,
    summary?.usage_percentage ?? 0,
  );

  const usageLabel = loading
    ? 'Cargando uso de almacenamiento…'
    : summary
      ? `${formatBytes(usedBytes)} usados de ${formatBytes(
        quotaBytes,
      )}`
      : 'No fue posible cargar el almacenamiento';

  const notificationLabel = unreadNotifications === 1
    ? '1 notificación sin leer de tus archivos'
    : `${unreadNotifications} notificaciones sin leer de tus archivos`;

  return (
    <View style={styles.storageCard}>
      <View style={styles.storageHeaderRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.storageTitle}>
            Espacio de almacenamiento
          </Text>

          <Text style={styles.planBadge}>
            Plan BeeApp Plus
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.upgradeBtn}
          onPress={onUpgradePress}
        >
          <Text style={styles.upgradeBtnText}>
            Mejorar
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.storageProgressBarContainer}>
        <View style={styles.storageProgressBarTrack}>
          <View
            style={[
              styles.storageProgressBarFill,
              {
                width: `${usagePercentage}%`,
              },
            ]}
          />
        </View>

        <View style={styles.usageRow}>
          <Text style={styles.storageLimitText}>
            {usageLabel}
          </Text>

          {summary && !loading && (
            <Text style={styles.usagePercentageText}>
              {Math.round(usagePercentage)}%
            </Text>
          )}
        </View>
      </View>

      <View style={styles.notificationsRow}>
        <View style={styles.notificationIcon}>
          <Bell
            size={14}
            color={colors.brand.primary}
          />
        </View>

        <Text style={styles.notificationsText}>
          {notificationLabel}
        </Text>

        {unreadNotifications > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {unreadNotifications > 99
                ? '99+'
                : unreadNotifications}
            </Text>
          </View>
        )}
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
  titleWrap: {
    flex: 1,
    marginRight: 12,
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
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storageLimitText: {
    flex: 1,
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '500',
    marginRight: 8,
  },
  usagePercentageText: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '700',
  },
  notificationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray100,
  },
  notificationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.brand.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  notificationsText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral.gray600,
  },
  notificationBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});