import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft, Camera, Mail, Instagram, Facebook, Linkedin, Music2, Youtube, AtSign, Globe, Briefcase, Video,
} from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { COUNTRIES, Country } from '../../../src/mocks/countries';

export default function EditProfileScreen() {
  const router = useRouter();

  const [name, setName] = useState('Santiago Valencia');
  const [email, setEmail] = useState('santiago@appsmartt.com');
  const [phone, setPhone] = useState('3001234567');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);

  const [instagram, setInstagram] = useState('https://instagram.com/santiagovalencia');
  const [facebook, setFacebook] = useState('');
  const [linkedin, setLinkedin] = useState('https://linkedin.com/in/santiagovalencia');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');
  const [threads, setThreads] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isEmailValid = email.trim() === '' || (email.includes('@') && email.includes('.'));

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.dialCode.includes(searchQuery)
    );
  }, [searchQuery]);

  const handleSave = () => {
    if (!name.trim()) return alert('El nombre es obligatorio.');
    if (!email.trim() || !isEmailValid) return alert('Ingresa un correo electrónico válido.');
    if (!phone.trim()) return alert('El teléfono es obligatorio.');
    alert('Cambios guardados con éxito.');
    router.back();
  };

  const socialFields = [
    { label: 'Instagram', icon: Instagram || Camera, value: instagram, onChange: setInstagram, placeholder: 'https://instagram.com/usuario' },
    { label: 'Facebook', icon: Facebook || Globe, value: facebook, onChange: setFacebook, placeholder: 'https://facebook.com/usuario' },
    { label: 'LinkedIn', icon: Linkedin || Briefcase, value: linkedin, onChange: setLinkedin, placeholder: 'https://linkedin.com/in/usuario' },
    { label: 'TikTok', icon: Music2 || Camera, value: tiktok, onChange: setTiktok, placeholder: 'https://tiktok.com/@usuario' },
    { label: 'YouTube', icon: Youtube || Video, value: youtube, onChange: setYoutube, placeholder: 'https://youtube.com/@usuario' },
    { label: 'Threads', icon: AtSign || Globe, value: threads, onChange: setThreads, placeholder: 'https://threads.net/@usuario' },
  ];

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircleBig}>
              <Text style={styles.avatarTextBig}>SV</Text>
              <TouchableOpacity style={styles.cameraBadge} activeOpacity={0.8} onPress={() => alert('Selector de foto mock')}>
                <Camera size={14} color={colors.neutral.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarTip}>Cambiar foto de perfil</Text>
          </View>

          <Text style={styles.sectionTitle}>Datos Personales</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre Completo *</Text>
            <TextInput style={styles.inputField} placeholder="Ingresa tu nombre..." placeholderTextColor={colors.neutral.gray500} value={name} onChangeText={setName} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Correo electrónico *</Text>
            <View style={[styles.inputFieldRow, !isEmailValid && styles.inputError]}>
              <Mail size={16} color={colors.neutral.gray500} style={{ marginRight: 8 }} />
              <TextInput style={styles.inputFieldText} placeholder="correo@ejemplo.com" placeholderTextColor={colors.neutral.gray500} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            </View>
            {!isEmailValid && <Text style={styles.errorText}>Ingresa un correo válido</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Número de Teléfono *</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={styles.prefixBadge} activeOpacity={0.7} onPress={() => { setSearchQuery(''); setModalVisible(true); }}>
                <Text style={styles.flag}>{selectedCountry.flag}</Text>
                <Text style={styles.prefixText}>{selectedCountry.dialCode}</Text>
              </TouchableOpacity>
              <TextInput style={[styles.inputField, { flex: 1 }]} placeholder="300 000 0000" placeholderTextColor={colors.neutral.gray500} keyboardType="phone-pad" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, ''))} />
            </View>
          </View>

          {/* Redes Sociales Section */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Redes Sociales</Text>
          {socialFields.map((sf, idx) => {
            const Icon = sf.icon || Globe;
            return (
              <View key={idx} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{sf.label}</Text>
                <View style={styles.inputFieldRow}>
                  <Icon size={16} color={colors.neutral.gray500} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.inputFieldText}
                    placeholder={sf.placeholder}
                    placeholderTextColor={colors.neutral.gray500}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={sf.value}
                    onChangeText={sf.onChange}
                  />
                </View>
              </View>
            );
          })}

          <View style={styles.actionsBar}>
            <TouchableOpacity style={styles.discardBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.discardBtnText}>Descartar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Guardar Cambios</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <FloatingTabBar />
      </View>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Selecciona un País</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
                <TextInput style={styles.searchBar} placeholder="Buscar país o indicativo..." placeholderTextColor={colors.neutral.gray500} value={searchQuery} onChangeText={setSearchQuery} />
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.countryRow} activeOpacity={0.7} onPress={() => { setSelectedCountry(item); setModalVisible(false); }}>
                      <Text style={styles.countryFlag}>{item.flag}</Text>
                      <Text style={styles.countryName}>{item.name}</Text>
                      <Text style={styles.countryDialCode}>{item.dialCode}</Text>
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: 300 }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.gray50 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.neutral.white, borderBottomWidth: 1, borderColor: colors.neutral.gray100 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.neutral.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarCircleBig: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#DDD6FE', position: 'relative', marginBottom: 10 },
  avatarTextBig: { fontSize: 36, fontWeight: '800', color: colors.brand.primary },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.brand.primary, borderWidth: 2.5, borderColor: colors.neutral.white, alignItems: 'center', justifyContent: 'center' },
  avatarTip: { fontSize: 12, color: colors.neutral.gray600, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.neutral.gray700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 16 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: colors.neutral.gray600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputField: { backgroundColor: colors.neutral.white, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral.gray200, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.neutral.text, fontWeight: '500' },
  inputFieldRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.white, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral.gray200, paddingHorizontal: 14 },
  inputFieldText: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.neutral.text, fontWeight: '500' },
  inputError: { borderColor: colors.semantic.error },
  errorText: { color: colors.semantic.error, fontSize: 12, marginTop: 6 },
  prefixBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.white, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral.gray200, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 },
  flag: { fontSize: 16, marginRight: 6 },
  prefixText: { fontSize: 14, fontWeight: '700', color: colors.neutral.text },
  actionsBar: { flexDirection: 'row', gap: 12, marginTop: 32, marginBottom: 40 },
  discardBtn: { flex: 1, borderWidth: 1, borderColor: colors.neutral.gray300, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  discardBtnText: { fontSize: 14, fontWeight: '700', color: colors.neutral.gray700 },
  saveBtn: { flex: 1.5, backgroundColor: colors.brand.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colors.neutral.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 26, 46, 0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.neutral.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.neutral.text },
  closeButton: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.neutral.gray100, borderRadius: 8 },
  closeButtonText: { fontSize: 13, fontWeight: '600', color: colors.neutral.gray700 },
  searchBar: { backgroundColor: colors.neutral.gray100, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.neutral.text, marginBottom: 16, borderWidth: 1, borderColor: colors.neutral.gray200 },
  countryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral.gray100 },
  countryFlag: { fontSize: 20, marginRight: 14 },
  countryName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.neutral.text },
  countryDialCode: { fontSize: 15, fontWeight: '700', color: colors.brand.primary },
});
