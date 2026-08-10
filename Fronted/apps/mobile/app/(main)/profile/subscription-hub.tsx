import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, ChevronRight, CreditCard, BadgeCheck } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { VERIFIED_COLOR } from '../../../src/components/VerifiedBadge';

// Mock account state shown as a summary above the two options
const MOCK_PLAN = 'BeeApp Gratis';
const MOCK_VERIFIED = false;

/** Entry point of the account section: subscription plan and Bee Verify. */
export default function SubscriptionHubScreen() {
  const router = useRouter();

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Suscripción y Verificación</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Current state */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Plan actual</Text>
              <Text style={styles.statusValue}>{MOCK_PLAN}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Verificación</Text>
              <Text style={[styles.statusValue, MOCK_VERIFIED && styles.statusValueOn]}>
                {MOCK_VERIFIED ? 'Cuenta verificada' : 'Sin verificar'}
              </Text>
            </View>
          </View>

          {/* Options */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push('/(main)/profile/subscription')}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#FEF3C7' }]}>
              <CreditCard size={20} color="#D97706" />
            </View>
            <View style={styles.optionCol}>
              <Text style={styles.optionTitle}>Mi plan</Text>
              <Text style={styles.optionDesc}>
                Consulta tu plan, los beneficios de BeeApp Plus y tu almacenamiento disponible.
              </Text>
            </View>
            <ChevronRight size={18} color={colors.neutral.gray500} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push('/(main)/profile/verification')}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#EBF5FF' }]}>
              <BadgeCheck size={20} color={VERIFIED_COLOR} />
            </View>
            <View style={styles.optionCol}>
              <View style={styles.optionTitleRow}>
                <Text style={styles.optionTitle}>Verificación</Text>
                <View style={styles.servicePill}>
                  <Text style={styles.servicePillText}>Bee Verify</Text>
                </View>
              </View>
              <Text style={styles.optionDesc}>
                Consigue la insignia azul de cuenta verificada y gana confianza en la red.
              </Text>
            </View>
            <ChevronRight size={18} color={colors.neutral.gray500} />
          </TouchableOpacity>
        </ScrollView>

        {/* Assistant always within reach */}
        <FloatingTabBar />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  statusCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  statusDivider: {
    height: 1,
    backgroundColor: colors.neutral.gray100,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  statusValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  statusValueOn: {
    color: VERIFIED_COLOR,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 14,
    marginBottom: 12,
  },
  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionCol: {
    flex: 1,
    paddingRight: 8,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  servicePill: {
    backgroundColor: '#EBF5FF',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  servicePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: VERIFIED_COLOR,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  optionDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.neutral.gray600,
    marginTop: 3,
    lineHeight: 16,
  },
});
