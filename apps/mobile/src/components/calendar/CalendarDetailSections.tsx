import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import {
  Calendar, Clock, MapPin, Video, Copy, Share2, Bell, RefreshCw,
  CheckCircle, HelpCircle, XCircle, Users, ChevronRight,
} from 'lucide-react-native';
import { CalendarEvent, Invitee } from '../../stores/calendarStore';

interface MainDetailsProps {
  eventItem: CalendarEvent;
  onCopyLink: () => void;
  onShareLink: () => void;
  onJoinCall: () => void;
}

export function MainDetailsCard({ eventItem, onCopyLink, onShareLink, onJoinCall }: MainDetailsProps) {
  return (
    <>
      <View style={styles.mainDetailsCard}>
        <View style={[styles.typeBadge, eventItem.type === 'meeting' ? styles.badgeMeeting : styles.badgeEvent]}>
          <Text style={[styles.typeBadgeText, eventItem.type === 'meeting' ? { color: '#7C3AED' } : { color: '#059669' }]}>
            {eventItem.type === 'meeting' ? 'Reunión Virtual' : 'Evento Presencial'}
          </Text>
        </View>
        <Text style={styles.titleText}>{eventItem.title}</Text>
        <View style={styles.timeInfoRow}>
          <View style={styles.timeSubBox}>
            <Calendar size={15} color={colors.neutral.gray600} />
            <Text style={styles.timeSubText}>{eventItem.date}</Text>
          </View>
          <View style={styles.timeSubBox}>
            <Clock size={15} color={colors.neutral.gray600} />
            <Text style={styles.timeSubText}>{eventItem.timeStart} - {eventItem.timeEnd} ({eventItem.duration})</Text>
          </View>
        </View>
        {eventItem.type === 'event' && (
          <View style={[styles.timeSubBox, { marginTop: 8 }]}>
            <MapPin size={15} color={colors.neutral.gray600} />
            <Text style={styles.timeSubText}>{eventItem.location || 'Presencial'}</Text>
          </View>
        )}
      </View>

      {eventItem.type === 'meeting' && eventItem.videoUrl && (
        <View style={styles.videoLinkCard}>
          <View style={styles.videoHeader}>
            <Video size={18} color="#7C3AED" />
            <Text style={styles.videoCardTitle}>Enlace de Videollamada</Text>
          </View>
          <Text style={styles.videoLinkUrl} numberOfLines={1}>{eventItem.videoUrl}</Text>
          <View style={styles.videoActionsRow}>
            <TouchableOpacity style={styles.videoActionBtn} onPress={onCopyLink} activeOpacity={0.7}>
              <Copy size={14} color={colors.neutral.text} />
              <Text style={styles.videoActionText}>Copiar enlace</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.videoActionBtn} onPress={onShareLink} activeOpacity={0.7}>
              <Share2 size={14} color={colors.neutral.text} />
              <Text style={styles.videoActionText}>Compartir</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.joinMeetingButton} onPress={onJoinCall} activeOpacity={0.8}>
            <Video size={18} color={colors.neutral.white} />
            <Text style={styles.joinMeetingText}>Unirse a la videollamada</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

interface ConfigAndInviteesProps {
  eventItem: CalendarEvent;
  onOpenReminderSheet: () => void;
}

export function ConfigAndInviteesSection({ eventItem, onOpenReminderSheet }: ConfigAndInviteesProps) {
  const renderStatusIcon = (status: Invitee['status']) => {
    if (status === 'accepted') return <CheckCircle size={14} color="#10B981" />;
    if (status === 'declined') return <XCircle size={14} color="#EF4444" />;
    return <HelpCircle size={14} color="#F59E0B" />;
  };

  return (
    <>
      <Text style={styles.sectionHeader}>Descripción / Agenda</Text>
      <View style={styles.descriptionCard}>
        <Text style={styles.descriptionText}>
          {eventItem.description || 'Sin descripción adicional cargada para esta sesión.'}
        </Text>
      </View>

      <Text style={styles.sectionHeader}>Configuración</Text>
      <View style={styles.configCard}>
        <TouchableOpacity style={styles.configItemTouch} onPress={onOpenReminderSheet} activeOpacity={0.7}>
          <View style={styles.configItemLeft}>
            <Bell size={15} color={colors.brand.primary} />
            <Text style={styles.configLabel}>Recordatorio:</Text>
            <Text style={styles.configValue}>{eventItem.reminder || '30 minutos antes'}</Text>
          </View>
          <ChevronRight size={16} color={colors.neutral.gray400} />
        </TouchableOpacity>

        <View style={[styles.configItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
          <View style={styles.configItemLeft}>
            <RefreshCw size={15} color={colors.neutral.gray600} />
            <Text style={styles.configLabel}>Repetición:</Text>
            <Text style={styles.configValue}>
              {eventItem.repeat === 'none' ? 'No se repite' : eventItem.repeat === 'daily' ? 'Diaria' : eventItem.repeat === 'weekly' ? 'Semanal' : 'Mensual'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionHeader}>Invitados ({eventItem.invitees.length})</Text>
      <View style={styles.inviteesCard}>
        {eventItem.invitees.map((invitee) => (
          <View key={invitee.id} style={styles.inviteeRow}>
            <View style={[styles.inviteeAvatar, { backgroundColor: invitee.color }]}>
              <Text style={styles.inviteeAvatarText}>{invitee.initials}</Text>
            </View>
            <Text style={styles.inviteeName}>{invitee.name}</Text>
            <View style={styles.inviteeStatusBox}>
              {renderStatusIcon(invitee.status)}
              <Text style={styles.inviteeStatusLabel}>
                {invitee.status === 'accepted' ? 'Aceptado' : invitee.status === 'declined' ? 'Rechazado' : 'Pendiente'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  mainDetailsCard: { backgroundColor: colors.neutral.white, borderBottomWidth: 1, borderColor: colors.neutral.gray200, padding: 20 },
  typeBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 12, borderWidth: 0.5 },
  badgeMeeting: { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' },
  badgeEvent: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  typeBadgeText: { fontSize: 9, fontWeight: '600' },
  titleText: { fontSize: 18, fontWeight: '600', color: colors.neutral.text, marginBottom: 12 },
  timeInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  timeSubBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeSubText: { fontSize: 11, color: colors.neutral.gray700, fontWeight: '400' },
  videoLinkCard: { backgroundColor: colors.neutral.white, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.neutral.gray200, marginTop: 16, padding: 16 },
  videoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  videoCardTitle: { fontSize: 12, fontWeight: '600', color: colors.neutral.text },
  videoLinkUrl: { fontSize: 11, color: colors.neutral.gray600, fontWeight: '400', marginBottom: 12 },
  videoActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  videoActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.neutral.gray100 },
  videoActionText: { fontSize: 11, color: colors.neutral.text, fontWeight: '400' },
  joinMeetingButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.brand.primary, paddingVertical: 12, borderRadius: 12 },
  joinMeetingText: { color: colors.neutral.white, fontSize: 13, fontWeight: '600' },
  sectionHeader: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray600, uppercase: true, letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  descriptionCard: { backgroundColor: colors.neutral.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral.gray200, padding: 16 },
  descriptionText: { fontSize: 13, color: colors.neutral.text, fontWeight: '400', lineHeight: 18 },
  configCard: { backgroundColor: colors.neutral.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral.gray200, padding: 16, gap: 12 },
  configItem: { flexDirection: 'row', items: 'center', justifyContent: 'space-between' },
  configItemTouch: { flexDirection: 'row', items: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100 },
  configItemLeft: { flexDirection: 'row', items: 'center', gap: 8 },
  configLabel: { fontSize: 13, color: colors.neutral.gray600, fontWeight: '400' },
  configValue: { fontSize: 13, color: colors.neutral.text, fontWeight: '600' },
  inviteesCard: { backgroundColor: colors.neutral.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral.gray200, padding: 12, gap: 10 },
  inviteeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inviteeAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  inviteeAvatarText: { fontSize: 12, fontWeight: '600', color: colors.neutral.text },
  inviteeName: { flex: 1, fontSize: 13, color: colors.neutral.text, fontWeight: '400', marginLeft: 10 },
  inviteeStatusBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inviteeStatusLabel: { fontSize: 11, color: colors.neutral.gray600, fontWeight: '400' },
});
