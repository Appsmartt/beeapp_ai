import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { appAlert } from '../../../src/components/feedback/appAlert';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Check, Sparkles, Database, RefreshCw } from 'lucide-react-native';
import {
  cancelSubscription,
  getMySubscription,
  listPublicPlans,
  reactivateSubscription,
  startBillingCheckout,
  type PlanUsage,
  type PublicPlan,
} from '@beeapp/api-client';
import FloatingTabBar from '../../../src/components/FloatingTabBar';

function cop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function gb(bytes: number): string {
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [current, setCurrent] = useState<PublicPlan | null>(null);
  const [usage, setUsage] = useState<PlanUsage>({});
  const [periodEnd, setPeriodEnd] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const load = useCallback(async () => {
    const [subscription, catalog] = await Promise.all([
      getMySubscription(),
      listPublicPlans(),
    ]);
    setPlans(catalog);
    setCurrent(subscription.plan);
    setUsage(subscription.usage || {});
    const end = subscription.subscription?.current_period_end;
    setPeriodEnd(end ? new Date(String(end)).toLocaleString('es-CO') : '');
    setCancelled(Boolean(subscription.subscription?.cancelled_at));
  }, []);

  useEffect(() => {
    load()
      .catch((error: unknown) => {
        appAlert('Planes', error instanceof Error ? error.message : 'No se pudo cargar tu plan.');
      })
      .finally(() => setLoading(false));
  }, [load]);

  const pay = async (plan: PublicPlan) => {
    setBusy(true);
    try {
      const checkout = await startBillingCheckout({
        planId: plan.id,
        billingPeriod: billingCycle,
        redirectUrl: 'beeapp://subscription',
      });
      await WebBrowser.openAuthSessionAsync(checkout.url, 'beeapp://subscription');
      await load();
    } catch (error) {
      appAlert('Pago', error instanceof Error ? error.message : 'No se pudo abrir Wompi.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    appAlert(
      'Cancelar suscripción',
      periodEnd
        ? `Mantienes el plan hasta ${periodEnd}. Después vuelves a Free porque el pago no se renueva solo.`
        : 'El acceso sigue hasta el final del periodo que ya pagaste.',
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            cancelSubscription()
              .then(() => load())
              .catch((error: unknown) => {
                appAlert('Planes', error instanceof Error ? error.message : 'No se pudo cancelar.');
              })
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  };

  const fileLimit = Number(current?.entitlements?.filesGb ?? current?.storage_gb ?? 0);
  const fileLabel = fileLimit > 0
    ? `${gb(Number(usage.filesBytes || 0))} de ${fileLimit} GB`
    : `${gb(Number(usage.filesBytes || 0))} en uso`;
  const purchasable = plans.filter((plan) => plan.purchasable && plan.id !== current?.id);

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Planes y Suscripción</Text>
          <View style={{ width: 32 }} />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionHeader}>Mi Plan Actual</Text>
            <View style={styles.planStatusCard}>
              <View style={styles.statusBadgeRow}>
                <View style={[styles.statusDot, { backgroundColor: current?.id === 'free' ? colors.neutral.gray500 : colors.semantic.success }]} />
                <Text style={styles.statusLabelText}>Plan activo: {current?.name || 'Free'}</Text>
              </View>
              <Text style={styles.statusDescription}>
                {current?.description || 'Tu plan se cobra en pesos, por un periodo.'}
              </Text>
              {periodEnd ? (
                <Text style={styles.storageText}>
                  {cancelled ? `Acceso hasta ${periodEnd}. Luego vuelves a Free.` : `Vigente hasta ${periodEnd}.`}
                </Text>
              ) : null}
              <View style={styles.divider} />
              <View style={styles.storageHeaderRow}>
                <Database size={16} color={colors.neutral.gray600} style={{ marginRight: 8 }} />
                <Text style={styles.storageText}>{fileLabel}</Text>
              </View>
              <Text style={styles.storageText}>
                {`IA: ${Number(usage.aiCredits || 0)} créditos usados este mes · Llamadas: ${Number(usage.callMinutes || 0)} min`}
              </Text>
              {current && current.id !== 'free' ? (
                <TouchableOpacity style={styles.dangerActionBtn} onPress={cancel} disabled={busy}>
                  <Text style={styles.dangerActionBtnText}>
                    {cancelled ? 'Cancelación registrada' : 'No renovar al final del periodo'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {cancelled ? (
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { marginTop: 8 }]}
                  disabled={busy}
                  onPress={() => {
                    setBusy(true);
                    reactivateSubscription()
                      .then(() => load())
                      .catch((error: unknown) => appAlert('Planes', error instanceof Error ? error.message : 'No se pudo reactivar.'))
                      .finally(() => setBusy(false));
                  }}
                >
                  <RefreshCw size={14} color={colors.neutral.white} style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>Quitar la cancelación</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={[styles.sectionHeader, { marginTop: 28 }]}>Planes disponibles</Text>
            <View style={styles.cycleSwitchContainer}>
              <TouchableOpacity
                style={[styles.cycleBtn, billingCycle === 'monthly' && styles.cycleBtnActive]}
                onPress={() => setBillingCycle('monthly')}
              >
                <Text style={[styles.cycleBtnText, billingCycle === 'monthly' && styles.cycleBtnTextActive]}>Mensual</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cycleBtn, billingCycle === 'yearly' && styles.cycleBtnActive]}
                onPress={() => setBillingCycle('yearly')}
              >
                <Text style={[styles.cycleBtnText, billingCycle === 'yearly' && styles.cycleBtnTextActive]}>Anual</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.plansColumn}>
              {purchasable.map((plan) => {
                const price = billingCycle === 'yearly' ? Number(plan.yearly_price) : Number(plan.monthly_price);
                const highlights = Array.isArray(plan.highlights) ? plan.highlights : [];
                return (
                  <View key={plan.id} style={styles.premiumCard}>
                    <View style={styles.premiumBadgeRow}>
                      <Sparkles size={14} color={colors.neutral.white} style={{ marginRight: 6 }} />
                      <Text style={styles.premiumBadgeText}>{plan.name.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.planNameTextPremium}>{plan.name}</Text>
                    <Text style={styles.planDescTextPremium}>{plan.description || ''}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceNumberPremium}>{cop(price)}</Text>
                      <Text style={styles.pricePeriodPremium}>{billingCycle === 'yearly' ? '/año' : '/mes'}</Text>
                    </View>
                    <TouchableOpacity style={styles.premiumBtn} disabled={busy || price <= 0} onPress={() => void pay(plan)}>
                      <Text style={styles.premiumBtnText}>{busy ? 'Abriendo Wompi…' : `Pagar ${plan.name}`}</Text>
                    </TouchableOpacity>
                    <View style={styles.dividerPremium} />
                    <Text style={styles.beneficiosTitlePremium}>Incluye</Text>
                    <View style={styles.beneficiosList}>
                      {highlights.map((item) => (
                        <View key={item} style={styles.beneficioRow}>
                          <View style={styles.checkWrapPremium}>
                            <Check size={10} color={colors.brand.primary} strokeWidth={3} />
                          </View>
                          <Text style={styles.beneficioTextPremium}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
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
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  planStatusCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  planStatusCardPremium: {
    borderColor: '#DDD6FE',
    backgroundColor: '#FBFBFF',
  },
  planStatusCardWarning: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF9',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  activePlanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 10,
  },
  activePlanPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  statusDescription: {
    fontSize: 13,
    color: colors.neutral.gray600,
    lineHeight: 18,
    marginBottom: 14,
  },
  subDetailBox: {
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 14,
  },
  subDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subDetailText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral.text,
  },
  warningAlertBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: 14,
  },
  warningAlertText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
    lineHeight: 16,
    flex: 1,
  },
  storageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  storageText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryActionBtnText: {
    color: colors.neutral.white,
    fontSize: 13,
    fontWeight: '700',
  },
  dangerActionBtn: {
    borderWidth: 1,
    borderColor: colors.semantic.error,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerActionBtnText: {
    color: colors.semantic.error,
    fontSize: 13,
    fontWeight: '700',
  },
  cycleSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    alignSelf: 'center',
    marginBottom: 24,
  },
  cycleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  cycleBtnActive: {
    backgroundColor: '#F3E8FF',
  },
  cycleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  cycleBtnTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  yearlyBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountBadge: {
    backgroundColor: colors.brand.primary,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 6,
  },
  discountBadgeText: {
    color: colors.neutral.white,
    fontSize: 8,
    fontWeight: '900',
  },
  plansColumn: {
    gap: 20,
    marginBottom: 40,
  },
  premiumCard: {
    backgroundColor: colors.brand.primary,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#7C3AED',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  premiumBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  premiumBadgeText: {
    color: colors.neutral.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planNameTextPremium: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.neutral.white,
    marginBottom: 6,
  },
  planDescTextPremium: {
    fontSize: 13,
    color: '#DDD6FE',
    lineHeight: 18,
    marginBottom: 20,
  },
  priceNumberPremium: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.neutral.white,
  },
  pricePeriodPremium: {
    fontSize: 13,
    color: '#DDD6FE',
    marginLeft: 6,
  },
  premiumBtn: {
    backgroundColor: colors.neutral.white,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  premiumBtnText: {
    color: colors.brand.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  alreadyActivePremiumBadge: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  alreadyActivePremiumText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  dividerPremium: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 20,
  },
  beneficiosTitlePremium: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  checkWrapPremium: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  beneficioTextPremium: {
    fontSize: 13,
    color: '#E2D8FF',
    fontWeight: '500',
    flex: 1,
  },
  standardCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  planNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 6,
  },
  planDescText: {
    fontSize: 13,
    color: colors.neutral.gray600,
    lineHeight: 18,
    marginBottom: 20,
  },
  priceNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.neutral.text,
  },
  pricePeriod: {
    fontSize: 13,
    color: colors.neutral.gray600,
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.gray200,
    marginVertical: 14,
  },
  beneficiosTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  checkWrap: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  beneficioText: {
    fontSize: 13,
    color: colors.neutral.text,
    fontWeight: '500',
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  beneficiosList: {
    gap: 10,
  },
  beneficioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
