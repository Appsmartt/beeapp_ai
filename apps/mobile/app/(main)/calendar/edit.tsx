import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft,
  Check,
  Search,
  X,
  Calendar,
  Video,
} from 'lucide-react-native';
import { getEvents, setEvents, CalendarEvent, MOCK_CONTACTS, Invitee } from '../../../src/stores/calendarStore';

export default function EditEventScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const eventId = params.id as string;
  const initialType = (params.type as 'meeting' | 'event') || 'meeting';
  const preSelectedDate = (params.date as string) || '';

  // Form Fields State
  const [eventType, setEventType] = useState<'meeting' | 'event'>(initialType);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(preSelectedDate || '2026-07-23');
  const [timeStart, setTimeStart] = useState('15:00');
  const [timeEnd, setTimeEnd] = useState('16:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [reminder, setReminder] = useState<'10m' | '30m' | '1h' | '1d'>('10m');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');

  // Multi-select Invitees Search State
  const [searchContactQuery, setSearchContactQuery] = useState('');
  const [selectedInvitees, setSelectedInvitees] = useState<Omit<Invitee, 'status'>[]>([]);

  // Load existing event data if editing
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
        setReminder(existing.reminder);
        setRepeat(existing.repeat);
        setSelectedInvitees(existing.invitees.map(({ id, name, initials, color }) => ({ id, name, initials, color })));
      }
    }
  }, [eventId]);

  const handleToggleInvitee = (contact: Omit<Invitee, 'status'>) => {
    const exists = selectedInvitees.some((i) => i.id === contact.id);
    if (exists) {
      setSelectedInvitees(selectedInvitees.filter((i) => i.id !== contact.id));
    } else {
      setSelectedInvitees([...selectedInvitees, contact]);
    }
  };

  const getFilteredContacts = () => {
    return MOCK_CONTACTS.filter((c) =>
      c.name.toLowerCase().includes(searchContactQuery.toLowerCase())
    );
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Datos requeridos', 'Por favor ingresa un título para el evento/reunión.');
      return;
    }

    const startHr = parseInt(timeStart.split(':')[0]);
    const startMin = parseInt(timeStart.split(':')[1]);
    const endHr = parseInt(timeEnd.split(':')[0]);
    const endMin = parseInt(timeEnd.split(':')[1]);

    const totalMinutes = (endHr * 60 + endMin) - (startHr * 60 + startMin);
    let durStr = '30 min';
    if (totalMinutes > 0) {
      const hrs = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      if (hrs > 0) {
        durStr = `${hrs} hora${hrs > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''}`;
      } else {
        durStr = `${mins} min`;
      }
    }

    // Map selected invitees to have a 'pending' default status
    const inviteesWithStatus: Invitee[] = selectedInvitees.map((c) => ({
      ...c,
      status: 'pending',
    }));

    // Auto-generate virtual meeting video link if type is meeting
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

    let updatedList: CalendarEvent[];
    if (eventId) {
      updatedList = getEvents().map((e) => (e.id === eventId ? savedEvent : e));
    } else {
      updatedList = [...getEvents(), savedEvent];
    }

    setEvents(updatedList);
    Alert.alert(
      eventId ? 'Elemento Editado' : 'Reunión/Evento Guardado',
      eventType === 'meeting'
        ? `Reunión virtual agendada con éxito. Se ha generado la videollamada.`
        : `Evento presencial agendado con éxito.`,
      [
        {
          text: 'Entendido',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const filteredContacts = getFilteredContacts();

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {eventId ? 'Editar Agenda' : 'Crear Agenda'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} activeOpacity={0.7}>
            <Check size={20} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* View Mode Tabs Selector */}
          <View style={styles.eventTypeTabs}>
            <TouchableOpacity
              style={[styles.typeTab, eventType === 'meeting' && styles.typeTabActive]}
              onPress={() => setEventType('meeting')}
              activeOpacity={0.8}
            >
              <Video size={16} color={eventType === 'meeting' ? colors.brand.primary : colors.neutral.gray600} />
              <Text style={[styles.typeTabText, eventType === 'meeting' && styles.typeTabTextActive]}>
                Reunión Virtual
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeTab, eventType === 'event' && styles.typeTabActive]}
              onPress={() => setEventType('event')}
              activeOpacity={0.8}
            >
              <Calendar size={16} color={eventType === 'event' ? colors.brand.primary : colors.neutral.gray600} />
              <Text style={[styles.typeTabText, eventType === 'event' && styles.typeTabTextActive]}>
                Evento Presencial
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form details */}
          <Text style={styles.sectionTitle}>Detalles del Evento</Text>
          <View style={styles.formCard}>
            {/* Title */}
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Título de la {eventType === 'meeting' ? 'Reunión' : 'Actividad'}</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Planificación Semestral B2B"
                placeholderTextColor={colors.neutral.gray400}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Date */}
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Fecha</Text>
              <TextInput
                style={styles.textInput}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.neutral.gray400}
                value={date}
                onChangeText={setDate}
              />
            </View>

            {/* All Day Event Switch (only for Event) */}
            {eventType === 'event' && (
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Todo el día</Text>
                  <Text style={styles.switchSub}>Ocupa todo el bloque del día</Text>
                </View>
                <Switch
                  value={isAllDay}
                  onValueChange={setIsAllDay}
                  trackColor={{ false: colors.neutral.gray300, true: colors.brand.primary + '80' }}
                  thumbColor={isAllDay ? colors.brand.primary : colors.neutral.gray400}
                />
              </View>
            )}

            {/* Times */}
            {!isAllDay && (
              <View style={styles.timesRow}>
                <View style={[styles.inputBox, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Hora de Inicio</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="15:00"
                    placeholderTextColor={colors.neutral.gray400}
                    value={timeStart}
                    onChangeText={setTimeStart}
                  />
                </View>
                <View style={[styles.inputBox, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Hora de Fin</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="16:00"
                    placeholderTextColor={colors.neutral.gray400}
                    value={timeEnd}
                    onChangeText={setTimeEnd}
                  />
                </View>
              </View>
            )}

            {/* Location (Only for Event) */}
            {eventType === 'event' && (
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Ubicación física</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Oficina 402, Calle 100"
                  placeholderTextColor={colors.neutral.gray400}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            )}

            {/* Description */}
            <View style={[styles.inputBox, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={styles.inputLabel}>Descripción o Agenda</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="Escribe detalles o agenda de la sesión..."
                placeholderTextColor={colors.neutral.gray400}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {/* Configurations */}
          <Text style={styles.sectionTitle}>Recordatorios y Frecuencia</Text>
          <View style={styles.formCard}>
            {/* Reminder */}
            <View style={styles.selectorRow}>
              <Text style={styles.selectorLabel}>Recordatorio</Text>
              <View style={styles.configButtons}>
                {[
                  { val: '10m', label: '10m' },
                  { val: '30m', label: '30m' },
                  { val: '1h', label: '1h' },
                  { val: '1d', label: '1d' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.val}
                    style={[styles.configBtn, reminder === item.val && styles.configBtnActive]}
                    onPress={() => setReminder(item.val as any)}
                  >
                    <Text style={[styles.configBtnText, reminder === item.val && styles.configBtnTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Repeat */}
            <View style={[styles.selectorRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={styles.selectorLabel}>Repetir</Text>
              <View style={styles.configButtons}>
                {[
                  { val: 'none', label: 'No' },
                  { val: 'daily', label: 'D' },
                  { val: 'weekly', label: 'Sem' },
                  { val: 'monthly', label: 'Mes' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.val}
                    style={[styles.configBtn, repeat === item.val && styles.configBtnActive]}
                    onPress={() => setRepeat(item.val as any)}
                  >
                    <Text style={[styles.configBtnText, repeat === item.val && styles.configBtnTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Invitees search list & picker */}
          <Text style={styles.sectionTitle}>Invitados ({selectedInvitees.length})</Text>
          <View style={styles.inviteesCard}>
            {/* Selected chips list */}
            {selectedInvitees.length > 0 && (
              <View style={styles.chipsContainer}>
                {selectedInvitees.map((item) => (
                  <View key={item.id} style={styles.chipItem}>
                    <Text style={styles.chipText}>{item.name}</Text>
                    <TouchableOpacity onPress={() => handleToggleInvitee(item)} style={styles.chipCloseBtn}>
                      <X size={10} color={colors.neutral.gray700} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Contact search finder */}
            <View style={styles.contactSearchBox}>
              <Search size={16} color={colors.neutral.gray500} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.contactSearchInput}
                placeholder="Buscar contactos para invitar..."
                placeholderTextColor={colors.neutral.gray400}
                value={searchContactQuery}
                onChangeText={setSearchContactQuery}
              />
            </View>

            {/* Search list results */}
            <View style={styles.searchResultsList}>
              {filteredContacts.map((contact) => {
                const isSelected = selectedInvitees.some((i) => i.id === contact.id);
                return (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.contactSearchRow}
                    onPress={() => handleToggleInvitee(contact)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.miniAvatar, { backgroundColor: contact.color }]}>
                      <Text style={styles.miniAvatarText}>{contact.initials}</Text>
                    </View>
                    <Text style={styles.contactSearchName}>{contact.name}</Text>
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Check size={10} color={colors.neutral.white} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
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
  saveBtn: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventTypeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    marginTop: 16,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  typeTabActive: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  typeTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  typeTabTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  formCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
  },
  inputBox: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    paddingBottom: 10,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral.gray600,
    marginBottom: 4,
  },
  textInput: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
    paddingVertical: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    marginBottom: 10,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  switchSub: {
    fontSize: 9,
    color: colors.neutral.gray600,
    fontWeight: '500',
    marginTop: 2,
  },
  timesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    marginBottom: 10,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  configButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  configBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.gray50,
  },
  configBtnActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#FAF5FF',
  },
  configBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  configBtnTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  inviteesCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  chipCloseBtn: {
    padding: 2,
  },
  contactSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  contactSearchInput: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  searchResultsList: {
    maxHeight: 180,
  },
  contactSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  miniAvatarText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  contactSearchName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.neutral.gray400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary,
  },
});
