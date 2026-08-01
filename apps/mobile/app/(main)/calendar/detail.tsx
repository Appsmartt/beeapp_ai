import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Edit2, Plus, Trash2, CheckCircle, HelpCircle, XCircle } from 'lucide-react-native';
import { getEvents, setEvents, CalendarEvent } from '../../../src/stores/calendarStore';
import { MainDetailsCard, ConfigAndInviteesSection } from '../../../src/components/calendar/CalendarDetailSections';
import ReminderBottomSheet from '../../../src/components/calendar/ReminderBottomSheet';

export default function EventDetailScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const eventId = params.id as string;

  const [eventItem, setEventItem] = useState<CalendarEvent | null>(null);
  const [userResponse, setUserResponse] = useState<'accepted' | 'maybe' | 'declined' | 'pending'>('pending');
  const [reminderSheetVisible, setReminderSheetVisible] = useState(false);

  useEffect(() => {
    if (eventId) {
      const found = getEvents().find((e) => e.id === eventId);
      if (found) {
        setEventItem(found);
        setUserResponse(found.userResponse || 'pending');
      }
    }
  }, [eventId]);

  if (!eventItem) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Evento no encontrado</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    );
  }

  const handleDelete = () => {
    Alert.alert('Eliminar Evento', '¿Estás seguro de que deseas eliminar este evento de tu agenda?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setEvents(getEvents().filter((e) => e.id !== eventItem.id));
          alert('Reunión/Evento eliminado.');
          router.back();
        },
      },
    ]);
  };

  const handleDuplicate = () => {
    const duplicated: CalendarEvent = { ...eventItem, id: `e-dup-${Date.now()}`, title: `${eventItem.title} (Copia)` };
    setEvents([...getEvents(), duplicated]);
    Alert.alert('Evento Duplicado', 'Se ha creado una copia idéntica del evento.');
  };

  const handleSelectReminder = (newReminder: string) => {
    const updated = getEvents().map((e) => (e.id === eventItem.id ? { ...e, reminder: newReminder } : e));
    setEvents(updated);
    setEventItem((prev) => (prev ? { ...prev, reminder: newReminder } : null));
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalle del Evento</Text>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(main)/calendar/edit', params: { id: eventItem.id, type: eventItem.type } })}
            style={styles.editBtn}
            activeOpacity={0.7}
          >
            <Edit2 size={18} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <MainDetailsCard
            eventItem={eventItem}
            onCopyLink={() => alert('Enlace de la videollamada copiado al portapapeles.')}
            onShareLink={() => alert('Enlace compartido con tus invitados.')}
            onJoinCall={() => router.push({ pathname: '/(main)/chat/call', params: { name: eventItem.title, isVideo: 'true' } })}
          />

          <ConfigAndInviteesSection
            eventItem={eventItem}
            onOpenReminderSheet={() => setReminderSheetVisible(true)}
          />

          {/* Tu respuesta RSVP */}
          <Text style={styles.sectionHeader}>Tu respuesta</Text>
          <View style={styles.rsvpCard}>
            <Text style={styles.rsvpQuestion}>¿Asistirás a esta reunión/evento?</Text>
            <View style={styles.rsvpButtons}>
              <TouchableOpacity
                style={[styles.rsvpBtn, userResponse === 'accepted' && styles.rsvpBtnActive]}
                onPress={() => setUserResponse('accepted')}
                activeOpacity={0.7}
              >
                <CheckCircle size={14} color={userResponse === 'accepted' ? colors.neutral.white : '#10B981'} />
                <Text style={[styles.rsvpBtnText, userResponse === 'accepted' && styles.rsvpBtnTextActive]}>Aceptar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rsvpBtn, userResponse === 'maybe' && styles.rsvpBtnActiveMaybe]}
                onPress={() => setUserResponse('maybe')}
                activeOpacity={0.7}
              >
                <HelpCircle size={14} color={userResponse === 'maybe' ? colors.neutral.white : '#F59E0B'} />
                <Text style={[styles.rsvpBtnText, userResponse === 'maybe' && styles.rsvpBtnTextActive]}>Tal vez</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rsvpBtn, userResponse === 'declined' && styles.rsvpBtnActiveDecline]}
                onPress={() => setUserResponse('declined')}
                activeOpacity={0.7}
              >
                <XCircle size={14} color={userResponse === 'declined' ? colors.neutral.white : '#EF4444'} />
                <Text style={[styles.rsvpBtnText, userResponse === 'declined' && styles.rsvpBtnTextActive]}>Rechazar</Text>
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

        <ReminderBottomSheet
          visible={reminderSheetVisible}
          selectedReminder={eventItem.reminder || '30 minutos antes'}
          onSelect={handleSelectReminder}
          onClose={() => setReminderSheetVisible(false)}
        />
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.gray50 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.neutral.white, borderBottomWidth: 1, borderColor: colors.neutral.gray100 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  editBtn: { padding: 4 },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  sectionHeader: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray600, uppercase: true, letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  rsvpCard: { backgroundColor: colors.neutral.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral.gray200, padding: 16 },
  rsvpQuestion: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray700, marginBottom: 12 },
  rsvpButtons: { flexDirection: 'row', gap: 8 },
  rsvpBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral.gray200, backgroundColor: colors.neutral.gray50 },
  rsvpBtnActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  rsvpBtnActiveMaybe: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  rsvpBtnActiveDecline: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  rsvpBtnText: { fontSize: 12, fontWeight: '400', color: colors.neutral.text },
  rsvpBtnTextActive: { color: colors.neutral.white, fontWeight: '600' },
  actionsPanel: { marginTop: 20, gap: 8 },
  panelBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.neutral.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral.gray200, padding: 14 },
  panelBtnText: { fontSize: 13, fontWeight: '400', color: colors.neutral.text },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  backLink: { marginTop: 12 },
  backLinkText: { fontSize: 14, color: colors.brand.primary, fontWeight: '600' },
});
