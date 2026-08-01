import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Check } from 'lucide-react-native';
import { getEvents, setEvents, CalendarEvent, Invitee } from '../../../src/stores/calendarStore';
import { CalendarEditFormFields, CalendarEditInviteesSection } from '../../../src/components/calendar/CalendarEditFields';
import ReminderBottomSheet from '../../../src/components/calendar/ReminderBottomSheet';

export default function EditEventScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const eventId = params.id as string;
  const initialType = (params.type as 'meeting' | 'event') || 'meeting';
  const preSelectedDate = (params.date as string) || '';

  const [eventType, setEventType] = useState<'meeting' | 'event'>(initialType);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(preSelectedDate || '2026-07-28');
  const [timeStart, setTimeStart] = useState('15:00');
  const [timeEnd, setTimeEnd] = useState('16:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [reminder, setReminder] = useState<string>('30 minutos antes');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvitees, setSelectedInvitees] = useState<Omit<Invitee, 'status'>[]>([]);
  const [reminderSheetVisible, setReminderSheetVisible] = useState(false);

  useEffect(() => {
    if (eventId) {
      const existing = getEvents().find((e) => e.id === eventId);
      if (existing) {
        setEventType(existing.type);
        setTitle(existing.title);
        setDate(existing.date);
        setTimeStart(existing.timeStart);
        setTimeEnd(existing.timeEnd);
        setIsAllDay(existing.timeStart === '00:00' && existing.timeEnd === '23:59');
        setLocation(existing.location || '');
        setDescription(existing.description || '');
        setReminder(existing.reminder || '30 minutos antes');
        setRepeat(existing.repeat);
        setSelectedInvitees(existing.invitees.map(({ id, name, initials, color }) => ({ id, name, initials, color })));
      }
    }
  }, [eventId]);

  const handleToggleInvitee = (contact: Omit<Invitee, 'status'>) => {
    if (selectedInvitees.some((i) => i.id === contact.id)) {
      setSelectedInvitees(selectedInvitees.filter((i) => i.id !== contact.id));
    } else {
      setSelectedInvitees([...selectedInvitees, contact]);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Datos requeridos', 'Por favor ingresa un título para el evento/reunión.');
      return;
    }

    const startHr = parseInt(timeStart.split(':')[0]) || 15;
    const startMin = parseInt(timeStart.split(':')[1]) || 0;
    const endHr = parseInt(timeEnd.split(':')[0]) || 16;
    const endMin = parseInt(timeEnd.split(':')[1]) || 0;
    const totalMinutes = (endHr * 60 + endMin) - (startHr * 60 + startMin);

    let durStr = '30 min';
    if (totalMinutes > 0) {
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      durStr = hrs > 0 ? `${hrs} hora${hrs > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''}` : `${mins} min`;
    }

    const inviteesWithStatus: Invitee[] = selectedInvitees.map((c) => ({ ...c, status: 'pending' }));
    let mockVideoUrl = undefined;
    if (eventType === 'meeting') {
      const meetId = Math.random().toString(36).substring(2, 7).toUpperCase();
      mockVideoUrl = `https://video.beeapp.ai/meet/m-${meetId}`;
    }

    const savedEvent: CalendarEvent = {
      id: eventId || `e-${Date.now()}`,
      title: title.trim(),
      type: eventType,
      date,
      timeStart: isAllDay ? '00:00' : timeStart,
      timeEnd: isAllDay ? '23:59' : timeEnd,
      duration: isAllDay ? 'Todo el día' : durStr,
      isVirtual: eventType === 'meeting',
      videoUrl: mockVideoUrl,
      location: eventType === 'event' ? location : undefined,
      description,
      reminder,
      repeat,
      invitees: inviteesWithStatus,
    };

    const updatedList = eventId
      ? getEvents().map((e) => (e.id === eventId ? savedEvent : e))
      : [...getEvents(), savedEvent];

    setEvents(updatedList);
    Alert.alert(
      eventId ? 'Elemento Editado' : 'Reunión/Evento Guardado',
      eventType === 'meeting' ? 'Reunión virtual agendada con éxito.' : 'Evento presencial agendado con éxito.',
      [{ text: 'Entendido', onPress: () => router.back() }]
    );
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{eventId ? 'Editar Evento' : 'Nuevo Evento'}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} activeOpacity={0.7}>
            <Check size={22} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <CalendarEditFormFields
            eventType={eventType} setEventType={setEventType}
            title={title} setTitle={setTitle}
            date={date} setDate={setDate}
            timeStart={timeStart} setTimeStart={setTimeStart}
            timeEnd={timeEnd} setTimeEnd={setTimeEnd}
            isAllDay={isAllDay} setIsAllDay={setIsAllDay}
            location={location} setLocation={setLocation}
            description={description} setDescription={setDescription}
            reminder={reminder}
            onOpenReminderSheet={() => setReminderSheetVisible(true)}
          />

          <CalendarEditInviteesSection
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            selectedInvitees={selectedInvitees} onToggleInvitee={handleToggleInvitee}
          />

          <View style={{ height: 60 }} />
        </ScrollView>

        <ReminderBottomSheet
          visible={reminderSheetVisible}
          selectedReminder={reminder}
          onSelect={setReminder}
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
  saveBtn: { padding: 4 },
  scrollView: { flex: 1, paddingHorizontal: 20 },
});
