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
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft,
  MessageSquare,
  Phone,
  Video,
  Mail,
  Briefcase,
  Layers,
  Heart,
  FileText,
  VolumeX,
  Volume2,
  ShieldAlert,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  PhoneOff,
} from 'lucide-react-native';
import VerifiedBadge from '../../../src/components/VerifiedBadge';
import { ALL_CONTACT_DETAILS, CONTACT_CALLS } from '../../../src/mocks/contacts';
import SocialNetworksSection from '../../../src/components/profile/SocialNetworksSection';



export default function ContactDetailScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const contactId = params.id as string || 'c1';

  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const contact = ALL_CONTACT_DETAILS[contactId] || ALL_CONTACT_DETAILS.c1;
  const callLogs = CONTACT_CALLS[contactId] || [];

  const handleAction = (actionName: string, isVideo: boolean = false) => {
    if (actionName === 'chat') {
      router.push({
        pathname: '/(main)/chat/conversation',
        params: { id: contact.id, name: contact.name, isGroup: 'false', online: contact.online ? 'true' : 'false' },
      });
    } else if (actionName === 'call') {
      router.push({
        pathname: '/(main)/chat/call',
        params: { name: contact.name, isVideo: isVideo ? 'true' : 'false' },
      });
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    Alert.alert(isMuted ? 'Notificaciones activadas' : 'Notificaciones silenciadas', `Has ${isMuted ? 'activado' : 'silenciado'} las alertas de este contacto.`);
  };

  const toggleBlock = () => {
    setIsBlocked(!isBlocked);
    Alert.alert(isBlocked ? 'Contacto desbloqueado' : 'Contacto bloqueado', `Has ${isBlocked ? 'desbloqueado' : 'bloqueado'} a ${contact.name}.`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Contacto',
      `¿Estás seguro de que deseas eliminar a ${contact.name} de tus contactos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            alert('Contacto eliminado.');
            router.back();
          },
        },
      ]
    );
  };

  const renderCallIcon = (type: 'incoming' | 'outgoing' | 'missed') => {
    if (type === 'incoming') return <ArrowDownLeft size={13} color="#10B981" />;
    if (type === 'outgoing') return <ArrowUpRight size={13} color="#3B82F6" />;
    return <PhoneOff size={13} color="#EF4444" />;
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Perfil del Contacto</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* User Bio Header */}
          <View style={styles.profileHeaderCard}>
            <View style={[styles.avatarWrap, { backgroundColor: contact.color }]}>
              <Text style={styles.avatarText}>{contact.initials}</Text>
              {contact.online && <View style={styles.onlineBadge} />}
            </View>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{contact.name}</Text>
              {contact.verified && <VerifiedBadge size={18} />}
            </View>
            <Text style={styles.profileProfession}>{contact.profession}</Text>
            <Text style={styles.profileCompany}>{contact.company}</Text>
          </View>

          {/* Quick Actions Row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('chat')} activeOpacity={0.7}>
              <View style={styles.actionIconBg}>
                <MessageSquare size={18} color={colors.brand.primary} />
              </View>
              <Text style={styles.actionLabel}>Mensaje</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('call', false)} activeOpacity={0.7}>
              <View style={styles.actionIconBg}>
                <Phone size={18} color={colors.brand.primary} />
              </View>
              <Text style={styles.actionLabel}>Llamar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={() => handleAction('call', true)} activeOpacity={0.7}>
              <View style={styles.actionIconBg}>
                <Video size={18} color={colors.brand.primary} />
              </View>
              <Text style={styles.actionLabel}>Video</Text>
            </TouchableOpacity>
          </View>

          {/* Info Details Section */}
          <Text style={styles.sectionHeader}>Información General</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Phone size={16} color={colors.neutral.gray600} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Teléfono</Text>
                <Text style={styles.infoValue}>{contact.phone}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Mail size={16} color={colors.neutral.gray600} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Correo Electrónico</Text>
                <Text style={styles.infoValue}>{contact.email}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Briefcase size={16} color={colors.neutral.gray600} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Empresa</Text>
                <Text style={styles.infoValue}>{contact.company}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Layers size={16} color={colors.neutral.gray600} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Actividad Económica</Text>
                <Text style={styles.infoValue}>{contact.activity}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Heart size={16} color={colors.neutral.gray600} />
              <View style={styles.infoTextCol}>
                <Text style={styles.infoLabel}>Intereses</Text>
                <View style={styles.interestsContainer}>
                  {contact.interests.map((item, idx) => (
                    <View key={idx} style={styles.interestBadge}>
                      <Text style={styles.interestBadgeText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Call History specific to this contact */}

          {/* Redes sociales */}
          <SocialNetworksSection socialLinks={contact.socialLinks} />

          <Text style={styles.sectionHeader}>Historial de Llamadas</Text>
          <View style={styles.callsSummaryCard}>
            {/* Quick Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{callLogs.length}</Text>
                <Text style={styles.metricLabel}>Total Llamadas</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>
                  {callLogs.filter(l => l.type !== 'missed').length > 0 ? '18m 10s' : '0s'}
                </Text>
                <Text style={styles.metricLabel}>Tiempo Hablado</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{callLogs[0]?.time.split(',')[0] || 'N/A'}</Text>
                <Text style={styles.metricLabel}>Última Llamada</Text>
              </View>
            </View>

            {/* List details */}
            <View style={styles.callsList}>
              {callLogs.map((log, idx) => (
                <View key={idx} style={[styles.callLogRow, idx === callLogs.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.callLogTypeCol}>
                    {renderCallIcon(log.type)}
                    <Text style={[styles.callLogTypeText, log.type === 'missed' && styles.callLogTypeTextMissed]}>
                      Llamada {log.type === 'incoming' ? 'Entrante' : log.type === 'outgoing' ? 'Saliente' : 'Perdida'}
                    </Text>
                  </View>
                  <View style={styles.callLogMetaCol}>
                    <Text style={styles.callLogTime}>{log.time}</Text>
                    {log.type !== 'missed' && (
                      <Text style={styles.callLogDuration}>{log.duration}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Shared Files and Media mock section */}
          <Text style={styles.sectionHeader}>Archivos Compartidos</Text>
          <View style={styles.sharedFilesCard}>
            <View style={styles.sharedFileItem}>
              <FileText size={18} color="#EF4444" style={styles.sharedFileIcon} />
              <View style={styles.sharedFileDetails}>
                <Text style={styles.sharedFileName} numberOfLines={1}>NDA_Firmado_BeeApp.pdf</Text>
                <Text style={styles.sharedFileMeta}>1.2 MB • Hace 2 días</Text>
              </View>
            </View>

            <View style={[styles.sharedFileItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <FileText size={18} color="#6B7280" style={styles.sharedFileIcon} />
              <View style={styles.sharedFileDetails}>
                <Text style={styles.sharedFileName} numberOfLines={1}>Propuesta_Comercial.docx</Text>
                <Text style={styles.sharedFileMeta}>850 KB • Hace 5 días</Text>
              </View>
            </View>
          </View>

          {/* Privacy actions */}
          <Text style={styles.sectionHeader}>Opciones</Text>
          <View style={styles.optionsCard}>
            <TouchableOpacity style={styles.optionRow} onPress={toggleMute}>
              {isMuted ? (
                <Volume2 size={16} color={colors.neutral.text} />
              ) : (
                <VolumeX size={16} color={colors.neutral.text} />
              )}
              <Text style={styles.optionLabelText}>
                {isMuted ? 'Activar notificaciones' : 'Silenciar notificaciones'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionRow} onPress={toggleBlock}>
              <ShieldAlert size={16} color={colors.neutral.text} />
              <Text style={styles.optionLabelText}>
                {isBlocked ? 'Desbloquear contacto' : 'Bloquear contacto'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionRow, { borderBottomWidth: 0 }]} onPress={handleDelete}>
              <Trash2 size={16} color={colors.semantic.error} />
              <Text style={[styles.optionLabelText, { color: colors.semantic.error }]}>Eliminar contacto</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
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
    paddingHorizontal: 20,
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
  profileHeaderCard: {
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  onlineBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: colors.neutral.white,
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  profileName: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral.text,
  },
  profileProfession: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.gray700,
    marginBottom: 2,
  },
  profileCompany: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    gap: 32,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  actionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    gap: 12,
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  interestBadge: {
    backgroundColor: colors.neutral.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  interestBadgeText: {
    fontSize: 10,
    color: colors.neutral.gray700,
    fontWeight: '600',
  },
  callsSummaryCard: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  metricsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    paddingVertical: 14,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.neutral.gray100,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brand.primary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.neutral.gray600,
    fontWeight: '600',
  },
  callsList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  callLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  callLogTypeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callLogTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  callLogTypeTextMissed: {
    color: '#EF4444',
    fontWeight: '800',
  },
  callLogMetaCol: {
    alignItems: 'flex-end',
  },
  callLogTime: {
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '500',
    marginBottom: 2,
  },
  callLogDuration: {
    fontSize: 9,
    color: colors.neutral.gray500,
    fontWeight: '600',
  },
  sharedFilesCard: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  sharedFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  sharedFileIcon: {
    marginRight: 12,
  },
  sharedFileDetails: {
    flex: 1,
  },
  sharedFileName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  sharedFileMeta: {
    fontSize: 10,
    color: colors.neutral.gray600,
    marginTop: 2,
    fontWeight: '500',
  },
  optionsCard: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    gap: 12,
  },
  optionLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  backLink: {
    marginTop: 12,
  },
  backLinkText: {
    fontSize: 14,
    color: colors.brand.primary,
    fontWeight: '700',
  },
});
