import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Check, Sparkles, Database, AlertCircle, RefreshCw, CreditCard } from 'lucide-react-native';
import { BENEFICIOS_PLUS } from '../../../src/mocks/subscription';
import FloatingTabBar from '../../../src/components/FloatingTabBar';


export default function SubscriptionScreen() {
  const router = useRouter();

  // Local state to simulate subscription plan stages:
  // 'free' | 'plus_active' | 'plus_cancelled'
  const [subStatus, setSubStatus] = useState<'free' | 'plus_active' | 'plus_cancelled'>('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const priceText = billingCycle === 'monthly' ? '$9.99 USD' : '$7.99 USD';
  const billingPeriod = billingCycle === 'monthly' ? '/mes' : '/mes (facturado anual)';

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancelar Suscripción',
      '¿Estás seguro de que deseas cancelar tu plan BeeApp Plus? Mantendrás el acceso a todas las funciones premium hasta el 15 de Agosto de 2026.',
      [
        {
          text: 'Volver',
          style: 'cancel',
        },
        {
          text: 'Confirmar Cancelación',
          style: 'destructive',
          onPress: () => {
            setSubStatus('plus_cancelled');
            Alert.alert('Suscripción Cancelada', 'Tu plan se cancelará al finalizar el ciclo de facturación actual.');
          },
        },
      ]
    );
  };

  const handleReactivateSubscription = () => {
    setSubStatus('plus_active');
    Alert.alert('Suscripción Reactivada', '¡Gracias por continuar con BeeApp Plus!');
  };

  const handleUpgradeSubscription = () => {
    setSubStatus('plus_active');
    Alert.alert('¡Mejorado a Plus!', 'Tu cuenta ha sido mejorada al plan BeeApp Plus con éxito.');
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Planes y Suscripción</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* AJUSTE 4: Seccion de MI PLAN ACTUAL */}
          <Text style={styles.sectionHeader}>Mi Plan Actual</Text>
          
          {subStatus === 'free' && (
            <View style={styles.planStatusCard}>
              <View style={styles.statusBadgeRow}>
                <View style={[styles.statusDot, { backgroundColor: colors.neutral.gray500 }]} />
                <Text style={styles.statusLabelText}>Plan Activo: BeeApp Gratis</Text>
              </View>
              <Text style={styles.statusDescription}>
                Tu plan actual es gratuito. Tienes funciones de organización básicas con límites de almacenamiento.
              </Text>
              <View style={styles.divider} />
              <View style={styles.storageHeaderRow}>
                <Database size={16} color={colors.neutral.gray600} style={{ marginRight: 8 }} />
                <Text style={styles.storageText}>8.2 GB de 15 GB usados (55%)</Text>
              </View>
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleUpgradeSubscription}
                activeOpacity={0.8}
              >
                <Sparkles size={14} color={colors.neutral.white} style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionBtnText}>Mejorar a BeeApp Plus</Text>
              </TouchableOpacity>
            </View>
          )}

          {subStatus === 'plus_active' && (
            <View style={[styles.planStatusCard, styles.planStatusCardPremium]}>
              <View style={styles.statusBadgeRow}>
                <View style={[styles.statusDot, { backgroundColor: colors.semantic.success }]} />
                <Text style={[styles.statusLabelText, { color: colors.brand.primary }]}>
                  Plan Activo: BeeApp Plus
                </Text>
                <View style={styles.activePlanPill}>
                  <Sparkles size={10} color={colors.brand.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.activePlanPillText}>Premium</Text>
                </View>
              </View>
              <Text style={styles.statusDescription}>
                Tu suscripción está activa y se renovará automáticamente.
              </Text>
              
              <View style={styles.subDetailBox}>
                <View style={styles.subDetailRow}>
                  <CreditCard size={14} color={colors.neutral.gray700} style={{ marginRight: 8 }} />
                  <Text style={styles.subDetailText}>Método de Pago: Visa terminada en 4242</Text>
                </View>
                <View style={styles.subDetailRow}>
                  <RefreshCw size={14} color={colors.neutral.gray700} style={{ marginRight: 8 }} />
                  <Text style={styles.subDetailText}>Próximo Cobro: 15 de Agosto, 2026 ($7.99 USD)</Text>
                </View>
              </View>

              <View style={styles.divider} />
              <View style={styles.storageHeaderRow}>
                <Database size={16} color={colors.brand.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.storageText, { color: colors.neutral.text }]}>
                  8.2 GB de Almacenamiento Ilimitado usado
                </Text>
              </View>
              <TouchableOpacity
                style={styles.dangerActionBtn}
                onPress={handleCancelSubscription}
                activeOpacity={0.8}
              >
                <Text style={styles.dangerActionBtnText}>Cancelar Suscripción</Text>
              </TouchableOpacity>
            </View>
          )}

          {subStatus === 'plus_cancelled' && (
            <View style={[styles.planStatusCard, styles.planStatusCardWarning]}>
              <View style={styles.statusBadgeRow}>
                <View style={[styles.statusDot, { backgroundColor: colors.semantic.error }]} />
                <Text style={[styles.statusLabelText, { color: colors.semantic.error }]}>
                  Suscripción en Fase de Cancelación
                </Text>
              </View>
              <Text style={styles.statusDescription}>
                Has cancelado tu suscripción. Perderás el acceso a los beneficios premium el 15 de Agosto de 2026.
              </Text>
              
              <View style={styles.warningAlertBox}>
                <AlertCircle size={16} color="#B45309" style={{ marginRight: 8 }} />
                <Text style={styles.warningAlertText}>
                  Vence el 15 de Agosto, 2026. Al vencer, tu almacenamiento volverá al límite de 15 GB.
                </Text>
              </View>

              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleReactivateSubscription}
                activeOpacity={0.8}
              >
                <RefreshCw size={14} color={colors.neutral.white} style={{ marginRight: 6 }} />
                <Text style={styles.primaryActionBtnText}>Reactivar Suscripción</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Comparative Plans Section */}
          <Text style={[styles.sectionHeader, { marginTop: 28 }]}>Planes Disponibles</Text>

          {/* Billing Cycle Switch */}
          <View style={styles.cycleSwitchContainer}>
            <TouchableOpacity
              style={[styles.cycleBtn, billingCycle === 'monthly' && styles.cycleBtnActive]}
              onPress={() => setBillingCycle('monthly')}
              activeOpacity={0.7}
            >
              <Text style={[styles.cycleBtnText, billingCycle === 'monthly' && styles.cycleBtnTextActive]}>
                Mensual
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cycleBtn, billingCycle === 'yearly' && styles.cycleBtnActive]}
              onPress={() => setBillingCycle('yearly')}
              activeOpacity={0.7}
            >
              <View style={styles.yearlyBtnContent}>
                <Text style={[styles.cycleBtnText, billingCycle === 'yearly' && styles.cycleBtnTextActive]}>
                  Anual
                </Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>-20%</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Plan Comparison Cards */}
          <View style={styles.plansColumn}>
            
            {/* Plan BeeApp Plus (Premium - Highlighted) */}
            <View style={styles.premiumCard}>
              <View style={styles.premiumBadgeRow}>
                <Sparkles size={14} color={colors.neutral.white} style={{ marginRight: 6 }} />
                <Text style={styles.premiumBadgeText}>RECOMENDADO</Text>
              </View>

              <Text style={styles.planNameTextPremium}>BeeApp Plus</Text>
              <Text style={styles.planDescTextPremium}>
                Acceso completo e ilimitado para potenciar tu productividad corporativa.
              </Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceNumberPremium}>{priceText}</Text>
                <Text style={styles.pricePeriodPremium}>{billingPeriod}</Text>
              </View>

              {subStatus !== 'plus_active' ? (
                <TouchableOpacity
                  style={styles.premiumBtn}
                  onPress={handleUpgradeSubscription}
                  activeOpacity={0.8}
                >
                  <Text style={styles.premiumBtnText}>Mejorar a Plus</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.alreadyActivePremiumBadge}>
                  <Text style={styles.alreadyActivePremiumText}>Plan Activo</Text>
                </View>
              )}

              <View style={styles.dividerPremium} />

              <Text style={styles.beneficiosTitlePremium}>Incluye todos los beneficios:</Text>
              <View style={styles.beneficiosList}>
                {BENEFICIOS_PLUS.map((ben, i) => (
                  <View key={i} style={styles.beneficioRow}>
                    <View style={styles.checkWrapPremium}>
                      <Check size={10} color={colors.brand.primary} strokeWidth={3} />
                    </View>
                    <Text style={styles.beneficioTextPremium}>{ben}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Plan Gratis (Standard) */}
            <View style={styles.standardCard}>
              <Text style={styles.planNameText}>BeeApp Gratis</Text>
              <Text style={styles.planDescText}>
                Plan básico ideal para organizar tus tareas y notas iniciales.
              </Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceNumber}>$0 USD</Text>
                <Text style={styles.pricePeriod}>/siempre gratis</Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.beneficiosTitle}>Características de plan gratuito:</Text>
              <View style={styles.beneficiosList}>
                <View style={styles.beneficioRow}>
                  <View style={styles.checkWrap}>
                    <Check size={10} color={colors.neutral.gray600} strokeWidth={3} />
                  </View>
                  <Text style={styles.beneficioText}>Hasta 15 GB de almacenamiento</Text>
                </View>
                <View style={styles.beneficioRow}>
                  <View style={styles.checkWrap}>
                    <Check size={10} color={colors.neutral.gray600} strokeWidth={3} />
                  </View>
                  <Text style={styles.beneficioText}>Soporte para 1 dispositivo</Text>
                </View>
                <View style={styles.beneficioRow}>
                  <View style={styles.checkWrap}>
                    <Check size={10} color={colors.neutral.gray600} strokeWidth={3} />
                  </View>
                  <Text style={styles.beneficioText}>Integración básica de correo</Text>
                </View>
              </View>
            </View>

          </View>

          {/* Clearance for the floating menu */}
          <View style={{ height: 100 }} />
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
