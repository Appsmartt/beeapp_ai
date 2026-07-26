import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft,
  Calendar,
  Clock,
  Video,
  MapPin,
  Copy,
  Share2,
  Edit2,
  Trash2,
  Plus,
  CheckCircle,
  HelpCircle,
  XCircle,
  Bell,
  RefreshCw,
} from 'lucide-react-native';
import { getEvents, setEvents, CalendarEvent, Invitee } from '../../../src/stores/calendarStore';

export default function EventDetailScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const eventId = params.id as string;

  const [eventItem, setEventItem] = useState<CalendarEvent | null>(null);

  // Simulated user response state (as a guest)
  const [userResponse, setUserResponse] = useState<'accepted' | 'declined' | 'pending'>('pending');

  useEffect(() => {
    if (eventId) {
      const found = getEvents().find((e) => e.id === eventId);
      if (found) {
        setEventItem(found);
        // Find if user is in list or just set a default response status
        setUserResponse('pending');
      }
    }
  }, [eventId]);

  if (!eventItem) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Evento no encontrado</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Evento',
      '¿Estás seguro de que deseas eliminar este evento de tu agenda?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const updated = getEvents().filter((e) => e.id !== eventItem.id);
            setEvents(updated);
            alert('Reunión/Evento eliminado.');
            router.back();
          },
        },
      ]
    );
  };

  const handleDuplicate = () => {
    const duplicated: CalendarEvent = {
      ...eventItem,
      id: `e-dup-${Date.now()}`,
      title: `${eventItem.title} (Copia)`,
    };
    setEvents([...getEvents(), duplicated]);
    Alert.alert('Evento Duplicado', 'Se ha creado una copia idéntica del evento.');
  };

  const handleCopyLink = () => {
    if (eventItem.videoUrl) {
      alert('Enlace de la videollamada copiado al portapapeles.');
    }
  };

  const handleShareLink = () => {
    if (eventItem.videoUrl) {
      alert('Enlace compartido con tus invitados.');
    }
  };

  const handleJoinCall = () => {
    // Navigate to call screen passing meeting name and videocall parameters
    router.push({
      pathname: '/(main)/chat/call',
      params: {
        name: eventItem.title,
        isVideo: 'true',
        isGroup: eventItem.invitees.length > 1 ? 'true' : 'false',
      },
    });
  };

  const handleGuestResponse = (status: 'accepted' | 'declined') => {
    setUserResponse(status);
    Alert.alert(
      'Respuesta enviada',
      status === 'accepted'
        ? 'Has aceptado la invitación a la reunión.'
        : 'Has declinado la invitación a la reunión.'
    );
  };

  const renderStatusIcon = (status: Invitee['status']) => {
    if (status === 'accepted') return <CheckCircle size={14} color="#10B981" />;
    if (status === 'declined') return <XCircle size={14} color="#EF4444" />;
    return <HelpCircle size={14} color="#F59E0B" />;
  };

  const renderStatusLabel = (status: Invitee['status']) => {
    if (status === 'accepted') return 'Aceptado';
    if (status === 'declined') return 'Rechazado';
    return 'Pendiente';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle del Evento</Text>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(main)/calendar/edit',
                params: { id: eventItem.id, type: eventItem.type },
              })
            }
            style={styles.editBtn}
            activeOpacity={0.7}
          >
            <Edit2 size={18} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Title and Category indicator */}
          <View style={styles.mainDetailsCard}>
            <View
              style={[
                styles.typeBadge,
                eventItem.type === 'meeting' ? styles.badgeMeeting : styles.badgeEvent,
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  eventItem.type === 'meeting' ? { color: '#7C3AED' } : { color: '#059669' },
                ]}
              >
                {eventItem.type === 'meeting' ? 'Reunión Virtual' : 'Evento Presencial'}
              </Text>
            </View>

            <Text style={styles.titleText}>{eventItem.title}</Text>

            {/* Date & Time Row */}
            <View style={styles.timeInfoRow}>
              <View style={styles.timeSubBox}>
                <Calendar size={15} color={colors.neutral.gray600} />
                <Text style={styles.timeSubText}>{eventItem.date}</Text>
              </View>
              <View style={styles.timeSubBox}>
                <Clock size={15} color={colors.neutral.gray600} />
                <Text style={styles.timeSubText}>
                  {eventItem.timeStart} - {eventItem.timeEnd} ({eventItem.duration})
                </Text>
              </View>
            </View>

            {/* Location (if presencial) */}
            {eventItem.type === 'event' && (
              <View style={[styles.timeSubBox, { marginTop: 8 }]}>
                <MapPin size={15} color={colors.neutral.gray600} />
                <Text style={styles.timeSubText}>{eventItem.location || 'Presencial'}</Text>
              </View>
            )}
          </View>

          {/* Video meeting link actions card (if meeting) */}
          {eventItem.type === 'meeting' && eventItem.videoUrl && (
            <View style={styles.videoLinkCard}>
              <View style={styles.videoHeader}>
                <Video size={18} color="#7C3AED" />
                <Text style={styles.videoCardTitle}>Enlace de Videollamada</Text>
              </View>

              <Text style={styles.videoLinkUrl} numberOfLines={1}>
                {eventItem.videoUrl}
              </Text>

              <View style={styles.videoActionsRow}>
                <TouchableOpacity style={styles.videoActionBtn} onPress={handleCopyLink} activeOpacity={0.7}>
                  <Copy size={14} color={colors.neutral.text} />
                  <Text style={styles.videoActionText}>Copiar enlace</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.videoActionBtn} onPress={handleShareLink} activeOpacity={0.7}>
                  <Share2 size={14} color={colors.neutral.text} />
                  <Text style={styles.videoActionText}>Compartir</Text>
                </TouchableOpacity>
              </View>

              {/* Call to action button */}
              <TouchableOpacity
                style={styles.joinMeetingButton}
                onPress={handleJoinCall}
                activeOpacity={0.8}
              >
                <Video size={18} color={colors.neutral.white} />
                <Text style={styles.joinMeetingText}>Unirse a la videollamada</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Description */}
          <Text style={styles.sectionHeader}>Descripción / Agenda</Text>
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>
              {eventItem.description || 'Sin descripción adicional cargada para esta sesión.'}
            </Text>
          </View>

          {/* Configuration Summary details */}
          <Text style={styles.sectionHeader}>Configuración</Text>
          <View style={styles.configCard}>
            <View style={styles.configItem}>
              <Bell size={15} color={colors.neutral.gray600} />
              <Text style={styles.configLabel}>Recordatorio:</Text>
              <Text style={styles.configValue}>
                {eventItem.reminder === '10m'
                  ? '10 minutos antes'
                  : eventItem.reminder === '30m'
                  ? '30 minutos antes'
                  : eventItem.reminder === '1h'
                  ? '1 hora antes'
                  : '1 día antes'}
              </Text>
            </View>

            <View style={[styles.configItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <RefreshCw size={15} color={colors.neutral.gray600} />
              <Text style={styles.configLabel}>Repetición:</Text>
              <Text style={styles.configValue}>
                {eventItem.repeat === 'none'
                  ? 'No se repite'
                  : eventItem.repeat === 'daily'
                  ? 'Diaria'
                  : eventItem.repeat === 'weekly'
                  ? 'Semanal'
                  : 'Mensual'}
              </Text>
            </View>
          </View>

          {/* Invitees List */}
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
                  <Text style={styles.inviteeStatusLabel}>{renderStatusLabel(invitee.status)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* RSVP Guest response bar (simulated guest invitation options) */}
          <Text style={styles.sectionHeader}>Tu respuesta</Text>
          <View style={styles.rsvpCard}>
            <Text style={styles.rsvpQuestion}>¿Asistirás a esta reunión/evento?</Text>
            <View style={styles.rsvpButtons}>
              <TouchableOpacity
                style={[
                  styles.rsvpBtn,
                  styles.rsvpAcceptBtn,
                  userResponse === 'accepted' && styles.rsvpBtnActive,
                ]}
                onPress={() => handleGuestResponse('accepted')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.rsvpBtnText,
                    userResponse === 'accepted' && styles.rsvpBtnTextActive,
                  ]}
                >
                  Aceptar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rsvpBtn,
                  styles.rsvpDeclineBtn,
                  userResponse === 'declined' && styles.rsvpBtnActive,
                ]}
                onPress={() => handleGuestResponse('declined')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.rsvpBtnText,
                    userResponse === 'declined' && styles.rsvpBtnTextActive,
                  ]}
                >
                  Rechazar
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* General Actions Panel */}
          <View style={styles.actionsPanel}>
            <TouchableOpacity style={styles.panelBtn} onPress={handleDuplicate} activeOpacity={0.7}>
              <Plus size={16} color={colors.neutral.text} />
              <Text style={styles.panelBtnText}>Duplicar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.panelBtn} onPress={handleDelete} activeOpacity={0.7}>
              <Trash2 size={16} color={colors.semantic.error} />
              <Text style={[styles.panelBtnText, { color: colors.semantic.error }]}>Eliminar</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
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
  editBtn: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  mainDetailsCard: {
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 20,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 12,
    borderWidth: 0.5,
  },
  badgeMeeting: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  badgeEvent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: 12,
  },
  timeInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeSubBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSubText: {
    fontSize: 11,
    color: colors.neutral.gray700,
    fontWeight: '600',
  },
  videoLinkCard: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    marginTop: 16,
    padding: 16,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  videoCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  videoLinkUrl: {
    fontSize: 12,
    color: '#7C3AED',
    backgroundColor: '#FAF5FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 12,
  },
  videoActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  videoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  videoActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  joinMeetingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  joinMeetingText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.neutral.white,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  descriptionCard: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
  },
  descriptionText: {
    fontSize: 12,
    color: colors.neutral.text,
    lineHeight: 18,
    fontWeight: '500',
  },
  configCard: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  configItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    gap: 8,
  },
  configLabel: {
    fontSize: 12,
    color: colors.neutral.gray600,
    fontWeight: '600',
  },
  configValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  inviteesCard: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  inviteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  inviteeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inviteeAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  inviteeName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  inviteeStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inviteeStatusLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  rsvpCard: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
    alignItems: 'center',
  },
  rsvpQuestion: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.text,
    marginBottom: 12,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  rsvpBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
  },
  rsvpAcceptBtn: {
    borderColor: '#10B981',
  },
  rsvpDeclineBtn: {
    borderColor: '#EF4444',
  },
  rsvpBtnActive: {
    backgroundColor: colors.neutral.gray50,
  },
  rsvpBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  rsvpBtnTextActive: {
    fontWeight: '900',
  },
  actionsPanel: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginVertical: 20,
    gap: 12,
  },
  panelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 6,
  },
  panelBtnText: {
    fontSize: 12,
    fontWeight: '700',
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
