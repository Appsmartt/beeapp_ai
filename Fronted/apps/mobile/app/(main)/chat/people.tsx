import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ChevronLeft,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import PeopleDiscoveryPanel from '../../../src/components/social/PeopleDiscoveryPanel';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';

export default function PeopleScreen() {
  const router = useModuleNav();
  const params = useScreenParams();

  const context = String(params.context || '').trim();
  const businessId = String(params.businessId || '').trim();
  const requestedIdentityId = String(
    params.identityId || '',
  ).trim() || null;

  const isCommercialContext = (
    context === 'commercial'
    && Boolean(businessId)
    && Boolean(requestedIdentityId)
  );

  const openConversation = (
    conversation: {
      id: string;
      name: string;
      isGroup: boolean;
      isAI: boolean;
      online: boolean;
    },
  ) => {
    router.replace({
      pathname: '/(main)/chat/conversation',
      params: {
        id: conversation.id,
        name: conversation.name,
        isGroup: conversation.isGroup ? 'true' : 'false',
        isAi: conversation.isAI ? 'true' : 'false',
        online: conversation.online ? 'true' : 'false',
        ...(isCommercialContext
          ? {
              context: 'commercial',
              businessId,
              identityId: requestedIdentityId || '',
            }
          : {}),
      },
    });
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
            accessibilityLabel="Volver"
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>
              Personas
            </Text>
            <Text style={styles.headerSubtitle}>
              Inicia conversaciones y sigue estados
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <PeopleDiscoveryPanel
          identityId={requestedIdentityId}
          onOpenConversation={openConversation}
        />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.neutral.gray50,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  headerCopy: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: colors.neutral.text,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: colors.neutral.gray600,
    fontSize: 11,
    marginTop: 2,
  },
  headerSpacer: {
    width: 34,
  },
});
