import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft,
  BadgeCheck,
  ShieldCheck,
  Store,
  Search,
  MessageCircle,
  Check,
  Clock,
} from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import VerifiedBadge, { VERIFIED_COLOR } from '../../../src/components/VerifiedBadge';

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: 'Identidad confirmada',
    desc: 'La insignia azul aparece junto a tu nombre en chats, contactos, estados y publicaciones.',
  },
  {
    icon: Store,
    title: 'Más confianza al vender',
    desc: 'Los clientes ven que tu negocio fue revisado por el equipo de BeeApp.',
  },
  {
    icon: Search,
    title: 'Mejor posición en la red',
    desc: 'Las cuentas verificadas se destacan en los resultados de búsqueda de la red empresarial.',
  },
  {
    icon: MessageCircle,
    title: 'Menos suplantación',
    desc: 'Nadie podrá hacerse pasar por tu empresa: la insignia distingue tu cuenta real.',
  },
];

const REQUIREMENTS = [
  { text: 'Perfil completo: nombre, ocupación y foto de perfil', done: true },
  { text: 'Número de celular verificado por SMS', done: true },
  { text: 'Datos de empresa registrados (nombre y actividad)', done: true },
  { text: 'Documento de identidad o RUT de la empresa', done: false },
  { text: 'Al menos 30 días de actividad en BeeApp', done: false },
];

/**
 * Bee Verify: explains the verified badge, what it is for, how it looks and
 * which requirements the account needs. The request itself is visual only.
 */
export default function VerificationScreen() {
  const router = useRouter();
  const pending = REQUIREMENTS.filter((r) => !r.done).length;

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verificación</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <BadgeCheck size={40} color={VERIFIED_COLOR} />
            </View>
            <View style={styles.servicePill}>
              <Text style={styles.servicePillText}>Bee Verify</Text>
            </View>
            <Text style={styles.heroTitle}>Consigue tu insignia de verificado</Text>
            <Text style={styles.heroDesc}>
              Bee Verify es el servicio con el que el equipo de BeeApp revisa tu identidad y la de tu
              empresa. Al aprobarla, tu cuenta recibe la palomita azul de cuenta verificada.
            </Text>
          </View>

          {/* Badge preview */}
          <Text style={styles.sectionTitle}>Así se verá tu cuenta</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <View style={styles.previewAvatar}>
                <Text style={styles.previewAvatarText}>SV</Text>
              </View>
              <View style={styles.previewCol}>
                <View style={styles.previewNameRow}>
                  <Text style={styles.previewName}>Santiago Valencia</Text>
                  <VerifiedBadge size={15} />
                </View>
                <Text style={styles.previewSub}>Consultores Asociados S.A.S.</Text>
              </View>
            </View>
            <Text style={styles.previewNote}>
              La insignia acompaña tu nombre en toda la app: chats, contactos, estados y tus productos/servicios.
            </Text>
          </View>

          {/* Benefits */}
          <Text style={styles.sectionTitle}>Para qué sirve</Text>
          <View style={styles.listCard}>
            {BENEFITS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <View
                  key={item.title}
                  style={[styles.benefitRow, idx === BENEFITS.length - 1 && styles.lastRow]}
                >
                  <View style={styles.benefitIcon}>
                    <Icon size={17} color={VERIFIED_COLOR} />
                  </View>
                  <View style={styles.benefitCol}>
                    <Text style={styles.benefitTitle}>{item.title}</Text>
                    <Text style={styles.benefitDesc}>{item.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Requirements */}
          <Text style={styles.sectionTitle}>Requisitos</Text>
          <View style={styles.listCard}>
            {REQUIREMENTS.map((req, idx) => (
              <View
                key={req.text}
                style={[styles.reqRow, idx === REQUIREMENTS.length - 1 && styles.lastRow]}
              >
                <View style={[styles.reqCheck, req.done ? styles.reqCheckDone : styles.reqCheckPending]}>
                  {req.done ? (
                    <Check size={12} color={colors.neutral.white} strokeWidth={3} />
                  ) : (
                    <Clock size={12} color={colors.neutral.gray600} />
                  )}
                </View>
                <Text style={[styles.reqText, !req.done && styles.reqTextPending]}>{req.text}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.reqSummary}>
            {pending === 0
              ? 'Cumples todos los requisitos para solicitar la verificación.'
              : `Te faltan ${pending} requisitos por completar. Puedes enviar la solicitud y adjuntarlos después.`}
          </Text>

          {/* Request */}
          <TouchableOpacity style={styles.requestBtn} activeOpacity={0.85}>
            <BadgeCheck size={18} color={colors.neutral.white} />
            <Text style={styles.requestBtnText}>Solicitar verificación</Text>
          </TouchableOpacity>
          <Text style={styles.footnote}>
            La revisión es manual y tarda hasta 48 horas hábiles. Recibirás la respuesta por
            notificación dentro de la app.
          </Text>
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
  hero: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 20,
    alignItems: 'center',
  },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  servicePill: {
    backgroundColor: '#EBF5FF',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginBottom: 8,
  },
  servicePillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: VERIFIED_COLOR,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  heroDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 22,
    marginBottom: 10,
  },
  previewCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 14,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  previewCol: {
    flex: 1,
  },
  previewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  previewSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  previewNote: {
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.neutral.gray500,
    lineHeight: 15,
    marginTop: 12,
  },
  listCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    overflow: 'hidden',
  },
  benefitRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitCol: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  benefitDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.neutral.gray600,
    lineHeight: 16,
    marginTop: 2,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  reqCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  reqCheckDone: {
    backgroundColor: colors.semantic.success,
  },
  reqCheckPending: {
    backgroundColor: colors.neutral.gray100,
  },
  reqText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.text,
    lineHeight: 17,
  },
  reqTextPending: {
    color: colors.neutral.gray600,
    fontWeight: '500',
  },
  reqSummary: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray600,
    lineHeight: 15,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: VERIFIED_COLOR,
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 20,
  },
  requestBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  footnote: {
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.neutral.gray500,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 10,
  },
});
