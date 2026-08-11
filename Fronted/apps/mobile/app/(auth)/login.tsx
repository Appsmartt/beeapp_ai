import { useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@beeapp/design-system';

import AnimatedLogo from '../../src/components/AnimatedLogo';
import ScreenSafeArea from '../../src/components/layout/ScreenSafeArea';
import { COUNTRIES, type Country } from '../../src/mocks/countries';

export default function LoginScreen() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES[0],
  );
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const filteredCountries = useMemo(() => {
    const normalizedQuery = countrySearch.trim().toLowerCase();

    if (!normalizedQuery) {
      return COUNTRIES;
    }

    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(normalizedQuery) ||
        country.dialCode.includes(normalizedQuery),
    );
  }, [countrySearch]);

  const handleContinue = () => {
    const normalizedPhoneNumber = phoneNumber.replace(/\D/g, '');

    if (
      normalizedPhoneNumber.length < 7 ||
      normalizedPhoneNumber.length > 15
    ) {
      setError('Ingresa un número de celular válido.');
      return;
    }

    setError('');

    router.push({
      pathname: '/(auth)/verify',
      params: {
        from: 'login',
        phone: normalizedPhoneNumber,
        dialCode: selectedCountry.dialCode,
        flag: selectedCountry.flag,
      },
    });
  };

  const openCountryModal = () => {
    setCountrySearch('');
    setIsCountryModalVisible(true);
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            <View style={styles.contentContainer}>
              <View style={styles.logoContainer}>
                <AnimatedLogo
                  size={80}
                  showText={false}
                  autoStopAfter={2500}
                />
              </View>

              <Text style={styles.title}>Inicia sesión</Text>

              <Text style={styles.subtitle}>
                Ingresa tu número de celular para continuar.
              </Text>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Número telefónico</Text>

                <View style={styles.phoneInputContainer}>
                  <TouchableOpacity
                    style={styles.prefixBadge}
                    activeOpacity={0.7}
                    onPress={openCountryModal}
                  >
                    <Text style={styles.flag}>{selectedCountry.flag}</Text>

                    <Text style={styles.prefixText}>
                      {selectedCountry.dialCode}
                    </Text>
                  </TouchableOpacity>

                  <TextInput
                    style={styles.phoneInput}
                    placeholder="300 000 0000"
                    placeholderTextColor={colors.neutral.gray500}
                    keyboardType="number-pad"
                    maxLength={15}
                    value={phoneNumber}
                    onChangeText={(value) => {
                      setPhoneNumber(value.replace(/\D/g, ''));

                      if (error) {
                        setError('');
                      }
                    }}
                  />
                </View>

                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.8}
                onPress={handleContinue}
              >
                <Text style={styles.primaryButtonText}>Continuar</Text>
              </TouchableOpacity>

              <View style={styles.registerRow}>
                <Text style={styles.registerText}>
                  ¿No tienes una cuenta?
                </Text>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push('/(auth)/register')}
                >
                  <Text style={styles.registerLink}>Regístrate</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerNotice}>
                Al continuar, aceptas nuestros
              </Text>

              <View style={styles.footerLinksRow}>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/terms')}
                >
                  <Text style={styles.footerLink}>
                    Términos y Condiciones
                  </Text>
                </TouchableOpacity>

                <Text style={styles.footerDot}> • </Text>

                <TouchableOpacity
                  onPress={() => router.push('/(auth)/privacy')}
                >
                  <Text style={styles.footerLink}>
                    Política de Privacidad
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <Modal
        animationType="slide"
        transparent
        visible={isCountryModalVisible}
        onRequestClose={() => setIsCountryModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setIsCountryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Selecciona un país</Text>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsCountryModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.searchBar}
                  placeholder="Buscar país o indicativo..."
                  placeholderTextColor={colors.neutral.gray500}
                  value={countrySearch}
                  onChangeText={setCountrySearch}
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
                        setIsCountryModalVisible(false);
                      }}
                    >
                      <Text style={styles.countryFlag}>{item.flag}</Text>

                      <Text style={styles.countryName}>{item.name}</Text>

                      <Text style={styles.countryDialCode}>
                        {item.dialCode}
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={styles.countryList}
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 20,
    marginBottom: 20,
  },
  title: {
    color: colors.neutral.text,
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.neutral.gray600,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 12,
    textAlign: 'center',
  },
  inputCard: {
    backgroundColor: colors.neutral.white,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 20,
    padding: 16,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  inputLabel: {
    color: colors.neutral.gray700,
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  phoneInputContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  prefixBadge: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 10,
    flexDirection: 'row',
    marginRight: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  flag: {
    fontSize: 16,
    marginRight: 6,
  },
  prefixText: {
    color: colors.neutral.text,
    fontSize: 15,
    fontWeight: '400',
  },
  phoneInput: {
    color: colors.neutral.text,
    flex: 1,
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: 1,
    paddingVertical: 8,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    marginTop: 8,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    elevation: 4,
    marginBottom: 16,
    paddingVertical: 16,
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  primaryButtonText: {
    color: colors.neutral.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  registerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: colors.neutral.gray600,
    fontSize: 13,
    marginRight: 5,
  },
  registerLink: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  footerNotice: {
    color: colors.neutral.gray500,
    fontSize: 12,
    marginBottom: 4,
  },
  footerLinksRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  footerLink: {
    color: colors.brand.primary,
    fontSize: 12,
    fontWeight: '400',
  },
  footerDot: {
    color: colors.neutral.gray500,
    fontSize: 12,
  },
  modalOverlay: {
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.neutral.text,
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: colors.neutral.gray100,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonText: {
    color: colors.neutral.gray700,
    fontSize: 13,
    fontWeight: '400',
  },
  searchBar: {
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.neutral.text,
    fontSize: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countryList: {
    maxHeight: 300,
  },
  countryRow: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 14,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 14,
  },
  countryName: {
    color: colors.neutral.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
  },
  countryDialCode: {
    color: colors.brand.primary,
    fontSize: 15,
    fontWeight: '400',
  },
});