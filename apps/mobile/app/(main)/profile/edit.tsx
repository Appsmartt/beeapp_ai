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
import { ChevronLeft, Camera, Building, Mail } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { COUNTRIES, Country } from '../../../src/mocks/countries';

const OFERTAS_EMPRESA = [
  { id: 'productos', label: 'Productos' },
  { id: 'servicios', label: 'Servicios' },
  { id: 'ambos', label: 'Ambos' },
];

export default function EditProfileScreen() {
  const router = useRouter();

  // Initial Mock Profile State
  const [name, setName] = useState('Santiago Valencia');
  const [email, setEmail] = useState('santiago@appsmartt.com');
  const [phone, setPhone] = useState('3001234567');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Colombia by default
  const [occupation, setOccupation] = useState('CEO & Consultor Estratégico');
  const [location, setLocation] = useState('Bogotá, Colombia');

  // Corporate Section Collapsible State
  const [hasCompany, setHasCompany] = useState(true);
  const [companyName, setCompanyName] = useState('Consultores Asociados S.A.S.');
  const [offerType, setOfferType] = useState('servicios');
  const [whatSells, setWhatSells] = useState('Asesorías y planeación estratégica para pymes');

  // Modal / Country search states
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Email format validation (requires @ and .)
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

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Perfil</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Avatar Setup */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircleBig}>
              <Text style={styles.avatarTextBig}>SV</Text>
              <TouchableOpacity style={styles.cameraBadge} activeOpacity={0.8} onPress={() => alert('Selector de foto mock')}>
                <Camera size={14} color={colors.neutral.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.avatarTip}>Cambiar foto de perfil</Text>
          </View>

          {/* Form: Mi Perfil */}
          <Text style={styles.sectionTitle}>Datos Personales</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre Completo *</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Ingresa tu nombre..."
              placeholderTextColor={colors.neutral.gray500}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email Field with Validation */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Correo electrónico *</Text>
            <View style={[styles.inputFieldRow, !isEmailValid && styles.inputError]}>
              <Mail size={16} color={colors.neutral.gray500} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputFieldText}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.neutral.gray500}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>
            {!isEmailValid && <Text style={styles.errorText}>Ingresa un correo válido</Text>}
          </View>

          {/* Phone Field with Country Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Número de Teléfono *</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.prefixBadge}
                activeOpacity={0.7}
                onPress={() => {
                  setSearchQuery('');
                  setModalVisible(true);
                }}
              >
                <Text style={styles.flag}>{selectedCountry.flag}</Text>
                <Text style={styles.prefixText}>{selectedCountry.dialCode}</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.inputField, { flex: 1 }]}
                placeholder="300 000 0000"
                placeholderTextColor={colors.neutral.gray500}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(text) => setPhone(text.replace(/\D/g, ''))}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>¿A qué te dedicas? *</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Ej. Desarrollador, Abogado..."
              placeholderTextColor={colors.neutral.gray500}
              value={occupation}
              onChangeText={setOccupation}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ciudad o Dirección</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Ej. Bogotá, Colombia..."
              placeholderTextColor={colors.neutral.gray500}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Collapsible Empresa Section */}
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setHasCompany(!hasCompany)}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleHeaderLeft}>
              <Building size={18} color={colors.brand.primary} style={{ marginRight: 10 }} />
              <Text style={styles.collapsibleTitle}>Datos de Empresa</Text>
            </View>
            <Building size={18} color="transparent" />
          </TouchableOpacity>

          {hasCompany && (
            <View style={styles.collapsibleContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre de la Empresa</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Nombre corporativo"
                  placeholderTextColor={colors.neutral.gray500}
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tipo de Oferta</Text>
                <View style={styles.offerRow}>
                  {OFERTAS_EMPRESA.map((item) => {
                    const isSelected = offerType === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.offerCard, isSelected && styles.offerCardActive]}
                        onPress={() => setOfferType(item.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.offerCardText, isSelected && styles.offerCardTextActive]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>¿Qué vendes / ofreces?</Text>
                <TextInput
                  style={[styles.inputField, { height: 60 }]}
                  placeholder="Describe tus servicios o productos..."
                  placeholderTextColor={colors.neutral.gray500}
                  multiline
                  value={whatSells}
                  onChangeText={setWhatSells}
                />
              </View>
            </View>
          )}

          {/* Action buttons */}
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

      {/* Country Selector Modal */}
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
                <TextInput
                  style={styles.searchBar}
                  placeholder="Buscar país o indicativo..."
                  placeholderTextColor={colors.neutral.gray500}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.countryRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedCountry(item);
                        setModalVisible(false);
                      }}
                    >
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
  collapsibleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.neutral.white, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.neutral.gray200, marginTop: 8, marginBottom: 14 },
  collapsibleHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  collapsibleTitle: { fontSize: 14, fontWeight: '700', color: colors.neutral.text },
  collapsibleContent: { backgroundColor: colors.neutral.white, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.neutral.gray200, marginBottom: 20 },
  offerRow: { flexDirection: 'row', gap: 8 },
  offerCard: { flex: 1, backgroundColor: colors.neutral.gray50, borderWidth: 1, borderColor: colors.neutral.gray200, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  offerCardActive: { borderColor: colors.brand.primary, backgroundColor: '#F5F3FF' },
  offerCardText: { fontSize: 12, fontWeight: '600', color: colors.neutral.gray700 },
  offerCardTextActive: { color: colors.brand.primary, fontWeight: '700' },
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
