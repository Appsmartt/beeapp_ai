import { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import {
  getBusinessChatUnreadCounts,
  LIST_CACHE_TTL,
  OWNED_COMMERCIAL_PROFILES_CACHE_KEY,
  readRequestCache,
} from '@beeapp/api-client';
import type { CommercialOwnedProfile } from '@beeapp/shared-types';
import { colors } from '@beeapp/design-system';

import CommercialOwnedBusinessPickerSheet from '../buddyservices/CommercialOwnedBusinessPickerSheet';
import {
  buddyServicesCommercialRoute,
  buddyServicesMyBusinessesRoute,
} from '../../features/buddyservices/commercialRoutes';
import { loadOwnedCommercialProfiles } from '../../services/commercialService';
import { getValidSessionCredentials } from '../../services/authSession';

export default function HomeBusinessChatsQuickAction() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ownedBusinesses, setOwnedBusinesses] = useState<
    CommercialOwnedProfile[]
  >([]);
  const [businessUnreadById, setBusinessUnreadById] = useState<
    Record<string, number>
  >({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        const cachedProfiles = await readRequestCache<{
          profiles: CommercialOwnedProfile[];
        }>(
          OWNED_COMMERCIAL_PROFILES_CACHE_KEY,
          {
            ttlMs: LIST_CACHE_TTL.standard,
            allowStale: true,
          },
        );
        if (cachedProfiles?.profiles?.length && !cancelled) {
          setOwnedBusinesses(cachedProfiles.profiles);
        }

        const auth = await getValidSessionCredentials();
        if (!auth || auth.scheme !== 'Bearer') {
          return;
        }

        try {
          const [profiles, unread] = await Promise.all([
            loadOwnedCommercialProfiles(),
            getBusinessChatUnreadCounts(auth),
          ]);

          if (cancelled) {
            return;
          }

          setOwnedBusinesses(profiles.profiles);
          setBusinessUnreadById(Object.fromEntries(
            unread.businesses.map((business) => [
              business.business_id,
              Number(business.unread_count) || 0,
            ]),
          ));
        } catch {
          if (!cancelled) {
            setOwnedBusinesses([]);
            setBusinessUnreadById({});
          }
        }
      };

      void load();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const businessUnreadTotal = useMemo(
    () => Object.values(businessUnreadById).reduce(
      (total, count) => total + count,
      0,
    ),
    [businessUnreadById],
  );

  if (!ownedBusinesses.length) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.actionButton, styles.chatBusinessButton]}
        activeOpacity={0.76}
        onPress={() => setSheetOpen(true)}
        accessibilityLabel="Chats de mis negocios"
        accessibilityHint="Abre los chats comerciales de tus negocios"
      >
        <MessageCircle
          size={22}
          color={colors.neutral.text}
          strokeWidth={2.1}
        />

        {businessUnreadTotal > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {businessUnreadTotal > 9 ? '9+' : businessUnreadTotal}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <CommercialOwnedBusinessPickerSheet
        businesses={ownedBusinesses}
        eyebrow="Chats del negocio"
        onClose={() => setSheetOpen(false)}
        onSelect={(businessId) => {
          setSheetOpen(false);
          router.push(buddyServicesCommercialRoute(businessId));
        }}
        onViewAllPress={() => {
          setSheetOpen(false);
          router.push(buddyServicesMyBusinessesRoute());
        }}
        selectedBusinessId={null}
        title="Elige un negocio"
        unreadByBusinessId={businessUnreadById}
        visible={sheetOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    position: 'relative',
    width: 52,
  },
  chatBusinessButton: {
    backgroundColor: '#EEF2FF',
    borderColor: '#D7DFF2',
    borderWidth: 1,
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: '#7427D5',
    borderColor: '#FFFFFF',
    borderRadius: 9,
    borderWidth: 2,
    minWidth: 18,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -2,
    top: -2,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
