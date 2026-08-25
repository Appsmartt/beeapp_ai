import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bell,
  Check,
  ChevronRight,
  MapPin,
  Search,
  Video,
} from 'lucide-react-native';
import {
  colors,
} from '@beeapp/design-system';

import type {
  CalendarUserOption,
} from '../../services/calendarService';
import type {
  CalendarEventType,
} from '../../stores/calendarStore';


interface CalendarEditFormFieldsProps {
  eventType: CalendarEventType;
  setEventType: (
    eventType: CalendarEventType,
  ) => void;
  title: string;
  setTitle: (title: string) => void;
  date: string;
  setDate: (date: string) => void;
  timeStart: string;
  setTimeStart: (time: string) => void;
  timeEnd: string;
  setTimeEnd: (time: string) => void;
  isAllDay: boolean;
  setIsAllDay: (isAllDay: boolean) => void;
  location: string;
  setLocation: (location: string) => void;
  description: string;
  setDescription: (description: string) => void;
  reminder: string;
  onOpenReminderSheet: () => void;
  conferenceUrl: string;
  setConferenceUrl: (value: string) => void;
}


export function CalendarEditFormFields({
  eventType,
  setEventType,
  title,
  setTitle,
  date,
  setDate,
  timeStart,
  setTimeStart,
  timeEnd,
  setTimeEnd,
  isAllDay,
  setIsAllDay,
  location,
  setLocation,
  description,
  setDescription,
  reminder,
  onOpenReminderSheet,
  conferenceUrl,
  setConferenceUrl,
}: CalendarEditFormFieldsProps) {
  return (
    <>
      <Text style={styles.sectionHeader}>
        Tipo de compromiso
      </Text>


      <View style={styles.typeSelectorRow}>
        <TouchableOpacity
          style={[
            styles.typeOption,
            eventType === 'meeting'
              && styles.typeOptionActiveMeeting,
          ]}
          onPress={() => setEventType('meeting')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.typeOptionText,
              eventType === 'meeting'
                && styles.typeOptionTextActiveMeeting,
            ]}
          >
            Reunión virtual
          </Text>
        </TouchableOpacity>


        <TouchableOpacity
          style={[
            styles.typeOption,
            eventType === 'event'
              && styles.typeOptionActiveEvent,
          ]}
          onPress={() => setEventType('event')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.typeOptionText,
              eventType === 'event'
                && styles.typeOptionTextActiveEvent,
            ]}
          >
            Evento presencial
          </Text>
        </TouchableOpacity>
      </View>


      <Text style={styles.sectionHeader}>
        Información general
      </Text>


      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Título del evento *
          </Text>


          <TextInput
            style={styles.textInput}
            placeholder="Ej: Sincronización semanal"
            placeholderTextColor={colors.neutral.gray400}
            value={title}
            onChangeText={setTitle}
            maxLength={300}
          />
        </View>


        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Fecha (YYYY-MM-DD) *
          </Text>


          <TextInput
            style={styles.textInput}
            placeholder="2026-08-17"
            placeholderTextColor={colors.neutral.gray400}
            value={date}
            onChangeText={setDate}
            maxLength={10}
            autoCapitalize="none"
          />
        </View>


        <View style={styles.rowTwoInputs}>
          <View style={styles.halfInputGroup}>
            <Text style={styles.inputLabel}>
              Hora inicio
            </Text>


            <TextInput
              style={[
                styles.textInput,
                isAllDay && styles.textInputDisabled,
              ]}
              placeholder="09:00"
              placeholderTextColor={colors.neutral.gray400}
              value={timeStart}
              onChangeText={setTimeStart}
              editable={!isAllDay}
              maxLength={5}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
          </View>


          <View style={styles.halfInputGroup}>
            <Text style={styles.inputLabel}>
              Hora fin
            </Text>


            <TextInput
              style={[
                styles.textInput,
                isAllDay && styles.textInputDisabled,
              ]}
              placeholder="10:00"
              placeholderTextColor={colors.neutral.gray400}
              value={timeEnd}
              onChangeText={setTimeEnd}
              editable={!isAllDay}
              maxLength={5}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />
          </View>
        </View>


        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>
              Todo el día
            </Text>


            <Text style={styles.switchHint}>
              El evento no tendrá una hora específica.
            </Text>
          </View>


          <Switch
            value={isAllDay}
            onValueChange={setIsAllDay}
            trackColor={{
              false: colors.neutral.gray200,
              true: colors.brand.primary,
            }}
          />
        </View>
      </View>


      <Text style={styles.sectionHeader}>
        Configuración
      </Text>


      <View style={styles.formCard}>
        <TouchableOpacity
          style={styles.reminderTouch}
          onPress={onOpenReminderSheet}
          activeOpacity={0.7}
        >
          <View style={styles.reminderLeft}>
            <Bell
              size={16}
              color={colors.brand.primary}
            />


            <Text style={styles.inputLabel}>
              Recordatorio
            </Text>
          </View>


          <View style={styles.reminderRight}>
            <Text style={styles.reminderValue}>
              {reminder}
            </Text>


            <ChevronRight
              size={16}
              color={colors.neutral.gray400}
            />
          </View>
        </TouchableOpacity>


        {eventType === 'meeting' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Enlace de videollamada
            </Text>


            <View style={styles.iconInputRow}>
              <Video
                size={16}
                color={colors.neutral.gray400}
              />


              <TextInput
                style={styles.flexInput}
                placeholder="https://meet.google.com/..."
                placeholderTextColor={colors.neutral.gray400}
                value={conferenceUrl}
                onChangeText={setConferenceUrl}
                autoCapitalize="none"
                keyboardType="url"
                autoCorrect={false}
              />
            </View>


            <Text style={styles.inputHint}>
              Opcional. Si agregas un enlace, aparecerá
              en el detalle de la reunión.
            </Text>
          </View>
        )}


        {eventType === 'event' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Ubicación
            </Text>


            <View style={styles.iconInputRow}>
              <MapPin
                size={16}
                color={colors.neutral.gray400}
              />


              <TextInput
                style={styles.flexInput}
                placeholder="Sala de conferencias A"
                placeholderTextColor={colors.neutral.gray400}
                value={location}
                onChangeText={setLocation}
                maxLength={300}
              />
            </View>
          </View>
        )}


        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Descripción / agenda
          </Text>


          <TextInput
            style={[
              styles.textInput,
              styles.textArea,
            ]}
            placeholder="Temas a tratar, información relevante..."
            placeholderTextColor={colors.neutral.gray400}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            maxLength={10000}
          />
        </View>
      </View>
    </>
  );
}


interface CalendarEditInviteesSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: CalendarUserOption[];
  selectedInvitees: CalendarUserOption[];
  searching: boolean;
  onToggleInvitee: (
    invitee: CalendarUserOption,
  ) => void;
}


export function CalendarEditInviteesSection({
  searchQuery,
  setSearchQuery,
  searchResults,
  selectedInvitees,
  searching,
  onToggleInvitee,
}: CalendarEditInviteesSectionProps) {
  const normalizedQuery = searchQuery.trim();


  return (
    <>
      <Text style={styles.sectionHeader}>
        Invitados ({selectedInvitees.length})
      </Text>


      <View style={styles.formCard}>
        <View style={styles.iconInputRow}>
          <Search
            size={16}
            color={colors.neutral.gray400}
          />


          <TextInput
            style={styles.flexInput}
            placeholder="Nombre, correo o teléfono"
            placeholderTextColor={colors.neutral.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>


        <Text style={styles.inputHint}>
          Escribe al menos 3 caracteres para buscar
          usuarios de Buddy.
        </Text>


        {selectedInvitees.length > 0 && (
          <View style={styles.selectedInviteesWrap}>
            {selectedInvitees.map((invitee) => (
              <TouchableOpacity
                key={invitee.id}
                style={styles.selectedInviteeChip}
                onPress={() => onToggleInvitee(invitee)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.selectedInviteeAvatar,
                    {
                      backgroundColor: invitee.color,
                    },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {invitee.initials}
                  </Text>
                </View>


                <Text
                  style={styles.selectedInviteeText}
                  numberOfLines={1}
                >
                  {invitee.name}
                </Text>


                <Text style={styles.selectedInviteeRemove}>
                  ×
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}


        {normalizedQuery.length > 0
          && normalizedQuery.length < 3 && (
          <Text style={styles.searchStateText}>
            Escribe {3 - normalizedQuery.length} carácter
            {3 - normalizedQuery.length === 1
              ? ''
              : 'es'} más para iniciar la búsqueda.
          </Text>
        )}


        {searching && (
          <View style={styles.searchLoading}>
            <ActivityIndicator
              size="small"
              color={colors.brand.primary}
            />


            <Text style={styles.searchStateText}>
              Buscando usuarios...
            </Text>
          </View>
        )}


        {!searching
          && normalizedQuery.length >= 3
          && searchResults.length === 0 && (
          <Text style={styles.searchStateText}>
            No se encontraron usuarios.
          </Text>
        )}


        {searchResults.length > 0 && (
          <View style={styles.contactsList}>
            {searchResults.map((invitee) => {
              const isSelected =
                selectedInvitees.some(
                  (selectedInvitee) =>
                    selectedInvitee.id === invitee.id,
                );


              return (
                <TouchableOpacity
                  key={invitee.id}
                  style={styles.contactRow}
                  onPress={() =>
                    onToggleInvitee(invitee)
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: invitee.color,
                      },
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {invitee.initials}
                    </Text>
                  </View>


                  <View style={styles.contactCopy}>
                    <Text style={styles.contactName}>
                      {invitee.name}
                    </Text>


                    {(invitee.email || invitee.phone) && (
                      <Text
                        style={styles.contactSubtitle}
                        numberOfLines={1}
                      >
                        {invitee.email || invitee.phone}
                      </Text>
                    )}
                  </View>


                  <View
                    style={[
                      styles.checkCircle,
                      isSelected
                        && styles.checkCircleSelected,
                    ]}
                  >
                    {isSelected && (
                      <Check
                        size={14}
                        color={colors.neutral.white}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </>
  );
}


const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
  },
  typeOptionActiveMeeting: {
    backgroundColor: '#FAF5FF',
    borderColor: '#7C3AED',
  },
  typeOptionActiveEvent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  typeOptionTextActiveMeeting: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  typeOptionTextActiveEvent: {
    color: '#059669',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  halfInputGroup: {
    flex: 1,
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  inputHint: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray500,
    lineHeight: 16,
  },
  textInput: {
    height: 42,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.neutral.text,
    backgroundColor: colors.neutral.gray50,
  },
  textInputDisabled: {
    backgroundColor: colors.neutral.gray100,
    color: colors.neutral.gray500,
  },
  textArea: {
    height: 96,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  rowTwoInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    gap: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral.text,
  },
  switchHint: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray500,
    marginTop: 2,
  },
  reminderTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  iconInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.neutral.gray50,
    minHeight: 42,
  },
  flexInput: {
    flex: 1,
    minHeight: 40,
    fontSize: 13,
    color: colors.neutral.text,
  },
  selectedInviteesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedInviteeChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.brand.primary + '50',
    backgroundColor: colors.brand.primary + '12',
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  selectedInviteeAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedInviteeText: {
    maxWidth: 140,
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral.text,
  },
  selectedInviteeRemove: {
    fontSize: 18,
    lineHeight: 18,
    color: colors.neutral.gray600,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  searchStateText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
    lineHeight: 16,
  },
  contactsList: {
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  contactCopy: {
    flex: 1,
    marginLeft: 10,
  },
  contactName: {
    fontSize: 13,
    color: colors.neutral.text,
    fontWeight: '500',
  },
  contactSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: colors.neutral.gray600,
    fontWeight: '400',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
});