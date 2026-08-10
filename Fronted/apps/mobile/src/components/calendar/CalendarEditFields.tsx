import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Bell, ChevronRight, MapPin, Search, Check } from 'lucide-react-native';
import { Invitee, MOCK_CONTACTS } from '../../stores/calendarStore';

interface FormFieldsProps {
  eventType: 'meeting' | 'event';
  setEventType: (t: 'meeting' | 'event') => void;
  title: string;
  setTitle: (t: string) => void;
  date: string;
  setDate: (d: string) => void;
  timeStart: string;
  setTimeStart: (t: string) => void;
  timeEnd: string;
  setTimeEnd: (t: string) => void;
  isAllDay: boolean;
  setIsAllDay: (v: boolean) => void;
  location: string;
  setLocation: (l: string) => void;
  description: string;
  setDescription: (d: string) => void;
  reminder: string;
  onOpenReminderSheet: () => void;
}

export function CalendarEditFormFields({
  eventType, setEventType, title, setTitle, date, setDate,
  timeStart, setTimeStart, timeEnd, setTimeEnd, isAllDay, setIsAllDay,
  location, setLocation, description, setDescription, reminder, onOpenReminderSheet,
}: FormFieldsProps) {
  return (
    <>
      <Text style={styles.sectionHeader}>Tipo de Compromiso</Text>
      <View style={styles.typeSelectorRow}>
        <TouchableOpacity
          style={[styles.typeOption, eventType === 'meeting' && styles.typeOptionActiveMeeting]}
          onPress={() => setEventType('meeting')}
          activeOpacity={0.8}
        >
          <Text style={[styles.typeOptionText, eventType === 'meeting' && styles.typeOptionTextActiveMeeting]}>Reunión Virtual</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeOption, eventType === 'event' && styles.typeOptionActiveEvent]}
          onPress={() => setEventType('event')}
          activeOpacity={0.8}
        >
          <Text style={[styles.typeOptionText, eventType === 'event' && styles.typeOptionTextActiveEvent]}>Evento Presencial</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>Información General</Text>
      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Título del evento *</Text>
          <TextInput style={styles.textInput} placeholder="Ej: Sincronización semanal" placeholderTextColor={colors.neutral.gray400} value={title} onChangeText={setTitle} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Fecha (YYYY-MM-DD)</Text>
          <TextInput style={styles.textInput} placeholder="2026-07-28" placeholderTextColor={colors.neutral.gray400} value={date} onChangeText={setDate} />
        </View>

        <View style={styles.rowTwoInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Hora Inicio</Text>
            <TextInput style={styles.textInput} placeholder="14:00" placeholderTextColor={colors.neutral.gray400} value={timeStart} onChangeText={setTimeStart} editable={!isAllDay} />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Hora Fin</Text>
            <TextInput style={styles.textInput} placeholder="15:00" placeholderTextColor={colors.neutral.gray400} value={timeEnd} onChangeText={setTimeEnd} editable={!isAllDay} />
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Todo el día</Text>
          <Switch value={isAllDay} onValueChange={setIsAllDay} trackColor={{ false: colors.neutral.gray200, true: colors.brand.primary }} />
        </View>
      </View>

      <Text style={styles.sectionHeader}>Configuración</Text>
      <View style={styles.formCard}>
        <TouchableOpacity style={styles.reminderTouch} onPress={onOpenReminderSheet} activeOpacity={0.7}>
          <View style={styles.reminderLeft}>
            <Bell size={16} color={colors.brand.primary} />
            <Text style={styles.inputLabel}>Recordatorio</Text>
          </View>
          <View style={styles.reminderRight}>
            <Text style={styles.reminderValue}>{reminder}</Text>
            <ChevronRight size={16} color={colors.neutral.gray400} />
          </View>
        </TouchableOpacity>

        {eventType === 'event' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ubicación</Text>
            <View style={styles.iconInputRow}>
              <MapPin size={16} color={colors.neutral.gray400} />
              <TextInput style={styles.flexInput} placeholder="Sala de conferencias A" placeholderTextColor={colors.neutral.gray400} value={location} onChangeText={setLocation} />
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Descripción / Agenda</Text>
          <TextInput style={[styles.textInput, styles.textArea]} placeholder="Temas a tratar..." placeholderTextColor={colors.neutral.gray400} multiline numberOfLines={3} value={description} onChangeText={setDescription} />
        </View>
      </View>
    </>
  );
}

interface InviteesProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedInvitees: Omit<Invitee, 'status'>[];
  onToggleInvitee: (c: Omit<Invitee, 'status'>) => void;
}

export function CalendarEditInviteesSection({ searchQuery, setSearchQuery, selectedInvitees, onToggleInvitee }: InviteesProps) {
  const filtered = MOCK_CONTACTS.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <Text style={styles.sectionHeader}>Invitados ({selectedInvitees.length})</Text>
      <View style={styles.formCard}>
        <View style={styles.iconInputRow}>
          <Search size={16} color={colors.neutral.gray400} />
          <TextInput style={styles.flexInput} placeholder="Buscar personas por nombre..." placeholderTextColor={colors.neutral.gray400} value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <View style={styles.contactsList}>
          {filtered.map((contact) => {
            const isSelected = selectedInvitees.some((i) => i.id === contact.id);
            return (
              <TouchableOpacity key={contact.id} style={styles.contactRow} onPress={() => onToggleInvitee(contact)} activeOpacity={0.7}>
                <View style={[styles.avatar, { backgroundColor: contact.color }]}>
                  <Text style={styles.avatarText}>{contact.initials}</Text>
                </View>
                <Text style={styles.contactName}>{contact.name}</Text>
                <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                  {isSelected && <Check size={14} color={colors.neutral.white} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { fontSize: 11, fontWeight: '400', color: colors.neutral.gray600, uppercase: true, letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  typeSelectorRow: { flexDirection: 'row', gap: 10 },
  typeOption: { flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral.gray200, backgroundColor: colors.neutral.white, alignItems: 'center' },
  typeOptionActiveMeeting: { backgroundColor: '#FAF5FF', borderColor: '#7C3AED' },
  typeOptionActiveEvent: { backgroundColor: '#ECFDF5', borderColor: '#059669' },
  typeOptionText: { fontSize: 13, fontWeight: '400', color: colors.neutral.gray600 },
  typeOptionTextActiveMeeting: { color: '#7C3AED', fontWeight: '600' },
  typeOptionTextActiveEvent: { color: '#059669', fontWeight: '600' },
  formCard: { backgroundColor: colors.neutral.white, borderRadius: 16, borderWidth: 1, borderColor: colors.neutral.gray200, padding: 16, gap: 14 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: '400', color: colors.neutral.gray600 },
  textInput: { height: 42, borderWidth: 1, borderColor: colors.neutral.gray200, borderRadius: 12, paddingHorizontal: 12, fontSize: 13, color: colors.neutral.text, backgroundColor: colors.neutral.gray50 },
  textArea: { height: 72, textAlignVertical: 'top', paddingTop: 8 },
  rowTwoInputs: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  switchLabel: { fontSize: 13, fontWeight: '400', color: colors.neutral.text },
  reminderTouch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  reminderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reminderRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderValue: { fontSize: 13, fontWeight: '600', color: colors.neutral.text },
  iconInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.neutral.gray200, borderRadius: 12, paddingHorizontal: 12, backgroundColor: colors.neutral.gray50, height: 42 },
  flexInput: { flex: 1, fontSize: 13, color: colors.neutral.text },
  contactsList: { gap: 8, marginTop: 6 },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '600', color: colors.neutral.text },
  contactName: { flex: 1, fontSize: 13, color: colors.neutral.text, fontWeight: '400', marginLeft: 10 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.neutral.gray300, alignItems: 'center', justifyContent: 'center' },
  checkCircleSelected: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
});
