import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Check, AlertTriangle, Key, ArrowRight, Sparkles } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface IntegrationItem {
  id: string;
  name: string;
  desc: string;
  connected: boolean;
  email: string;
  syncDetails: string[];
  iconColor: string;
  scopes: string[];
}

export default function IntegrationsScreen() {
  const router = useRouter();

  // Local state for interactive connection toggling
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([
    {
      id: 'gmail',
      name: 'Gmail',
      desc: 'Sincroniza tus correos entrantes, respuestas inteligentes y borradores.',
      connected: true,
      email: 'santiago.valencia@consultores.com',
      syncDetails: ['Correos recibidos', 'Borradores automáticos', 'Etiquetas de negocio'],
      iconColor: '#EA4335',
      scopes: [
        'Ver y gestionar correos electrónicos en Gmail',
        'Redactar y enviar correos mediante BeeAI asistente',
        'Acceso de solo lectura a contactos de Google',
      ],
    },
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      desc: 'Sincroniza tus eventos, agendas de reuniones y recordatorios de tareas.',
      connected: true,
      email: 'santiago.valencia@consultores.com',
      syncDetails: ['Eventos del calendario', 'Reservas de clientes', 'Recordatorios'],
      iconColor: '#4285F4',
      scopes: [
        'Ver tus calendarios de Google',
        'Crear, editar y eliminar eventos en tus calendarios',
      ],
    },
    {
      id: 'outlook',
      name: 'Outlook Mail',
      desc: 'Sincroniza correos de Office 365 e integraciones de Outlook unificado.',
      connected: false,
      email: '',
      syncDetails: ['Correos recibidos', 'Contactos corporativos'],
      iconColor: '#0078D4',
      scopes: [
        'Acceso total a correos corporativos de Microsoft',
        'Crear borradores automatizados con IA',
      ],
    },
    {
      id: 'outlook_calendar',
      name: 'Outlook Calendar',
      desc: 'Agenda reuniones corporativas en Teams y sincroniza con tu Office 365.',
      connected: false,
      email: '',
      syncDetails: ['Eventos de Outlook', 'Reuniones de Microsoft Teams'],
      iconColor: '#107C41',
      scopes: [
        'Ver y actualizar citas de calendario corporativo',
        'Generar links de Teams automáticos',
      ],
    },
  ]);

  const [consentActiveId, setConsentActiveId] = useState<string | null>(null);

  const handleConnectRequest = (id: string) => {
    setConsentActiveId(id);
  };

  const handleAuthorize = () => {
    if (consentActiveId) {
      setIntegrations(
        integrations.map((item) =>
          item.id === consentActiveId
            ? { ...item, connected: true, email: 'santiago.valencia@empresa.com' }
            : item
        )
      );
      setConsentActiveId(null);
      alert('Integración conectada con éxito.');
    }
  };

  const handleDisconnect = (id: string) => {
    setIntegrations(
      integrations.map((item) =>
        item.id === id ? { ...item, connected: false, email: '' } : item
      )
    );
    alert('Integración desconectada.');
  };

  const activeConsentItem = integrations.find((i) => i.id === consentActiveId);

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Integraciones Externas</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.subtitleText}>
            Conecta tus herramientas de trabajo externas para permitir que el asistente BeeAI automatice tus tareas en segundo plano.
          </Text>

          {/* Integrations Listing */}
          <View style={styles.listCol}>
            {integrations.map((item) => (
              <View key={item.id} style={styles.card}>
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={[styles.serviceLogoMock, { backgroundColor: item.iconColor }]}>
                    <Text style={styles.serviceLogoText}>{item.name[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.headerDetailsCol}>
                    <Text style={styles.serviceName}>{item.name}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: item.connected ? colors.semantic.success : colors.neutral.gray500 }]} />
                      <Text style={[styles.statusText, { color: item.connected ? colors.semantic.success : colors.neutral.gray600 }]}>
                        {item.connected ? 'Conectado' : 'No conectado'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.serviceDesc}>{item.desc}</Text>

                {/* Sync Details Panel */}
                <View style={styles.syncDetailsBox}>
                  <Text style={styles.syncBoxTitle}>Datos sincronizados:</Text>
                  {item.syncDetails.map((detail, idx) => (
                    <View key={idx} style={styles.syncRow}>
                      <Check size={12} color={colors.brand.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.syncText}>{detail}</Text>
                    </View>
                  ))}
                </View>

                {/* Button Action */}
                {item.connected ? (
                  <View style={styles.connectedFooterRow}>
                    <Text style={styles.linkedEmailText} numberOfLines={1}>
                      {item.email}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDisconnect(item.id)}
                      style={styles.disconnectBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.disconnectBtnText}>Desconectar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleConnectRequest(item.id)}
                    style={styles.connectBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.connectBtnText}>Conectar Servicio</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Future Integrations Placeholder */}
            <View style={[styles.card, styles.futureCard]}>
              <Sparkles size={24} color={colors.neutral.gray500} style={{ marginBottom: 8 }} />
              <Text style={styles.futureTitle}>Próximas Integraciones</Text>
              <Text style={styles.futureDesc}>
                WhatsApp Business, Slack, Trello, Salesforce y más herramientas corporativas llegarán pronto.
              </Text>
            </View>
          </View>
          {/* Clearance for the floating menu */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Assistant always within reach */}
        <FloatingTabBar />

        {/* OAuth Consent Screen Simulation Modal */}
        {activeConsentItem && (
          <Modal transparent visible={consentActiveId !== null} animationType="slide">
            <View style={styles.modalBackdrop}>
              <View style={styles.consentSheet}>
                
                {/* Sheet Header */}
                <View style={styles.consentHeader}>
                  <View style={styles.shieldWrap}>
                    <Key size={20} color={colors.brand.primary} />
                  </View>
                  <Text style={styles.consentTitle}>Solicitud de Autorización</Text>
                  <Text style={styles.consentSub}>
                    BeeApp solicita vincular tu cuenta para automatizar operaciones.
                  </Text>
                </View>

                {/* Simulated Connection Diagram */}
                <View style={styles.diagramRow}>
                  <View style={styles.appCircle}>
                    <Text style={styles.appCircleText}>🐝</Text>
                  </View>
                  <ArrowRight size={18} color={colors.neutral.gray500} />
                  <View style={[styles.serviceCircle, { backgroundColor: activeConsentItem.iconColor }]}>
                    <Text style={styles.serviceCircleText}>{activeConsentItem.name[0]}</Text>
                  </View>
                </View>

                {/* Consent Email select */}
                <View style={styles.accountBox}>
                  <Text style={styles.accountBoxLabel}>Iniciar sesión con:</Text>
                  <Text style={styles.accountBoxEmail}>santiago.valencia@consultores.com</Text>
                  <Text style={styles.accountBoxMeta}>Cuenta sugerida del sistema</Text>
                </View>

                {/* Consent Permissions Scopes List */}
                <Text style={styles.permissionsLabel}>Permisos solicitados:</Text>
                <ScrollView style={styles.permissionsScroll} showsVerticalScrollIndicator={false}>
                  {activeConsentItem.scopes.map((scope, idx) => (
                    <View key={idx} style={styles.permissionItem}>
                      <View style={styles.permissionDot} />
                      <Text style={styles.permissionText}>{scope}</Text>
                    </View>
                  ))}
                  <View style={styles.warningBox}>
                    <AlertTriangle size={16} color="#D97706" style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={styles.warningText}>
                      BeeApp solo utilizará estos permisos para coordinar las peticiones indicadas por ti en tu chat privado. Tus claves no se guardarán.
                    </Text>
                  </View>
                </ScrollView>

                {/* Consent Buttons Bar */}
                <View style={styles.consentButtonsRow}>
                  <TouchableOpacity
                    style={styles.cancelConsentBtn}
                    onPress={() => setConsentActiveId(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelConsentBtnText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.authorizeBtn}
                    onPress={handleAuthorize}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.authorizeBtnText}>Autorizar Acceso</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          </Modal>
        )}
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
  subtitleText: {
    fontSize: 13,
    color: colors.neutral.gray600,
    lineHeight: 18,
    marginBottom: 24,
    fontWeight: '500',
  },
  listCol: {
    gap: 20,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceLogoMock: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceLogoText: {
    color: colors.neutral.white,
    fontSize: 18,
    fontWeight: '800',
  },
  headerDetailsCol: {
    justifyContent: 'center',
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  serviceDesc: {
    fontSize: 13,
    color: colors.neutral.gray600,
    lineHeight: 18,
    marginBottom: 14,
  },
  syncDetailsBox: {
    backgroundColor: colors.neutral.gray50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    marginBottom: 16,
  },
  syncBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  syncText: {
    fontSize: 12,
    color: colors.neutral.text,
    fontWeight: '500',
  },
  connectBtn: {
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  connectBtnText: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  connectedFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  linkedEmailText: {
    fontSize: 12,
    color: colors.neutral.gray600,
    fontWeight: '600',
    flex: 1,
  },
  disconnectBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  disconnectBtnText: {
    color: colors.semantic.error,
    fontSize: 12,
    fontWeight: '700',
  },
  futureCard: {
    backgroundColor: colors.neutral.gray50,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: colors.neutral.gray300,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  futureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.gray700,
    marginBottom: 4,
  },
  futureDesc: {
    fontSize: 12,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    justifyContent: 'flex-end',
  },
  consentSheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: SCREEN_HEIGHT * 0.75,
    justifyContent: 'space-between',
  },
  consentHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  shieldWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  consentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 6,
  },
  consentSub: {
    fontSize: 12,
    color: colors.neutral.gray600,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  diagramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 14,
  },
  appCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  appCircleText: {
    fontSize: 22,
  },
  serviceCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceCircleText: {
    color: colors.neutral.white,
    fontSize: 22,
    fontWeight: '800',
  },
  accountBox: {
    backgroundColor: colors.neutral.gray50,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    marginBottom: 16,
  },
  accountBoxLabel: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  accountBoxEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.text,
    marginBottom: 2,
  },
  accountBoxMeta: {
    fontSize: 11,
    color: colors.brand.primary,
    fontWeight: '600',
  },
  permissionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  permissionsScroll: {
    flex: 1,
    marginBottom: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingRight: 10,
  },
  permissionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.primary,
    marginTop: 6,
    marginRight: 10,
  },
  permissionText: {
    fontSize: 12,
    color: colors.neutral.text,
    lineHeight: 16,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 12,
  },
  warningText: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
    fontWeight: '600',
    flex: 1,
  },
  consentButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
  },
  cancelConsentBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelConsentBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.gray700,
  },
  authorizeBtn: {
    flex: 1.5,
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  authorizeBtnText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
