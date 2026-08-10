import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { User, Phone, Mail, Building2, Briefcase, ChevronDown } from 'lucide-react-native';
import CountryCodeModal from './CountryCodeModal';
import { COUNTRIES, Country } from '../../mocks/countries';
import { ContactItem } from '../../mocks/contacts';

interface CreateContactModalProps {
  visible: boolean;
  onSave: (contact: ContactItem) => void;
  onClose: () => void;
}

const EMPTY = { firstName: '', lastName: '', phone: '', email: '', company: '', role: '' };

/** Basic new-contact form: name, phone with dial code, email, company and role */
export default function CreateContactModal({ visible, onSave, onClose }: CreateContactModalProps) {
  const [form, setForm] = useState(EMPTY);
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Every time it opens the form starts empty
  useEffect(() => {
    if (visible) {
      setForm(EMPTY);
      setCountry(COUNTRIES[0]);
    }
  }, [visible]);

  const set = (key: keyof typeof EMPTY, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const fullName = `${form.firstName} ${form.lastName}`.trim();

  const handleSave = () =>
    onSave({
      id: 'c_' + Date.now().toString(36),
      name: fullName,
      profession: form.role.trim() || 'Sin cargo',
      company: form.company.trim() || undefined,
      activity: form.company.trim() || 'Contacto personal',
      interests: [],
      initials: fullName
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0]?.toUpperCase() ?? '')
        .join(''),
      color: '#F3E8FF',
    });

  type FieldName = keyof typeof EMPTY;
  const fields: { name: FieldName; icon: typeof User; placeholder: string }[] = [
    { name: 'firstName', icon: User, placeholder: 'Nombre' },
    { name: 'lastName', icon: User, placeholder: 'Apellido' },
    { name: 'email', icon: Mail, placeholder: 'Correo electrónico' },
    { name: 'company', icon: Building2, placeholder: 'Empresa' },
    { name: 'role', icon: Briefcase, placeholder: 'Cargo' },
  ];

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Nuevo contacto</Text>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {fields.slice(0, 2).map((field) => (
              <Field
                key={field.name}
                icon={field.icon}
                placeholder={field.placeholder}
                value={form[field.name]}
                onChange={(value) => set(field.name, value)}
              />
            ))}

            {/* Phone: dial code picker + number */}
            <View style={styles.fieldRow}>
              <Phone size={18} color={colors.neutral.gray500} />
              <TouchableOpacity
                style={styles.dialBtn}
                onPress={() => setPickerVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dialText}>{country.dialCode}</Text>
                <ChevronDown size={14} color={colors.neutral.gray600} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(value) => set('phone', value)}
                placeholder="Teléfono"
                placeholderTextColor={colors.neutral.gray500}
                keyboardType="phone-pad"
              />
            </View>

            {fields.slice(2).map((field) => (
              <Field
                key={field.name}
                icon={field.icon}
                placeholder={field.placeholder}
                value={form[field.name]}
                onChange={(value) => set(field.name, value)}
              />
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !fullName && styles.saveBtnDisabled]}
              disabled={!fullName}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <CountryCodeModal
        visible={pickerVisible}
        onSelect={(next) => {
          setCountry(next);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />
    </Modal>
  );
}

interface FieldProps {
  icon: typeof User;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

/** One flat field of the form: icon on the left, plain input on the right */
function Field({ icon: Icon, placeholder, value, onChange }: FieldProps) {
  return (
    <View style={styles.fieldRow}>
      <Icon size={18} color={colors.neutral.gray500} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral.gray500}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26, 26, 46, 0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  form: { marginTop: spacing.sm },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  input: { flex: 1, fontSize: 14, fontWeight: '400', color: colors.neutral.text, padding: 0 },
  dialBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dialText: { fontSize: 14, fontWeight: '400', color: colors.neutral.text },
  actions: { flexDirection: 'row', gap: 12, marginTop: spacing.md },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '400', color: colors.neutral.gray700 },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.brand.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.neutral.gray400 },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: colors.neutral.white },
});
