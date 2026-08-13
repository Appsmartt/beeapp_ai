import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AtSign,
  Briefcase,
  ChevronLeft,
  Globe,
  Mail,
  MapPin,
  Music2,
  UserRound,
  Video,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import {
  getCurrentProfile,
  updateProfile,
} from '@beeapp/api-client';
import type {
  AuthCredentials,
  SocialPlatform,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import {
  COUNTRIES,
  Country,
} from '../../../src/mocks/countries';
import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';

type SocialField = {
  platform: SocialPlatform;
  label: string;
  placeholder: string;
  icon: React.ElementType;
};

const SOCIAL_FIELDS: SocialField[] = [
  {
    platform: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/usuario',
    icon: AtSign,
  },
  {
    platform: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/usuario',
    icon: Globe,
  },
  {
    platform: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/usuario',
    icon: Briefcase,
  },
  {
    platform: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@usuario',
    icon: Music2,
  },
  {
    platform: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@usuario',
    icon: Video,
  },
  {
    platform: 'threads',
    label: 'Threads',
    placeholder: 'https://threads.net/@usuario',
    icon: AtSign,
  },
  {
    platform: 'website',
    label: 'Sitio web',
    placeholder: 'https://tusitio.com',
    icon: Globe,
  },
];

function getInitials(
  firstName: string,
  lastName: string,
): string {
  const firstInitial = firstName.trim().charAt(0);
  const lastInitial = lastName.trim().charAt(0);

  return `${firstInitial}${lastInitial}`.toUpperCase() || '?';
}

function getCountryByDialCode(
  dialCode: string | null,
): Country {
  const normalizedDialCode = dialCode
    ? `+${dialCode.replace('+', '')}`
    : '';

  return (
    COUNTRIES.find(
      (country) => country.dialCode === normalizedDialCode,
    ) || COUNTRIES[0]
  );
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'http:'
      || url.protocol === 'https:'
    );
  } catch {
    return false;
  }
}

export default function EditProfileScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  const [selectedCountry, setSelectedCountry] =
    useState<Country>(COUNTRIES[0]);
  const [socialLinks, setSocialLinks] = useState<
    Record<SocialPlatform, string>
  >({
    instagram: '',
    facebook: '',
    linkedin: '',
    tiktok: '',
    youtube: '',
    threads: '',
    website: '',
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isEmailValid = (
    email.trim() === ''
    || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );

  const filteredCountries = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();

    return COUNTRIES.filter(
      (country) => (
        country.name.toLowerCase().includes(normalizedQuery)
        || country.dialCode.includes(searchQuery)
      ),
    );
  }, [searchQuery]);

  const initials = useMemo(
    () => getInitials(firstName, lastName),
    [firstName, lastName],
  );

  const getCredentials = async (): Promise<AuthCredentials> => {
    const credentials = await getValidSessionCredentials();

    if (!credentials) {
      throw new Error(
        'Tu sesión no está disponible. '
        + 'Inicia sesión nuevamente.',
      );
    }

    return credentials;
  };

  const loadProfile = async () => {
    try {
      setIsLoading(true);

      const credentials = await getCredentials();
      const response = await getCurrentProfile(credentials);
      const { profile } = response;

      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone_number || '');
      setOccupation(profile.occupation || '');
      setLocation(profile.location || '');
      setSelectedCountry(
        getCountryByDialCode(profile.phone_dial_code),
      );

      const nextSocialLinks: Record<SocialPlatform, string> = {
        instagram: '',
        facebook: '',
        linkedin: '',
        tiktok: '',
        youtube: '',
        threads: '',
        website: '',
      };

      profile.social_links.forEach((socialLink) => {
        nextSocialLinks[socialLink.platform] = socialLink.url;
      });

      setSocialLinks(nextSocialLinks);
    } catch (error) {
      Alert.alert(
        'No fue posible cargar tu perfil',
        error instanceof Error
          ? error.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const updateSocialLink = (
    platform: SocialPlatform,
    value: string,
  ) => {
    setSocialLinks((currentSocialLinks) => ({
      ...currentSocialLinks,
      [platform]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!firstName.trim()) {
      Alert.alert('Campo requerido', 'Ingresa tu nombre.');

      return false;
    }

    if (!lastName.trim()) {
      Alert.alert('Campo requerido', 'Ingresa tu apellido.');

      return false;
    }

    if (!email.trim() || !isEmailValid) {
      Alert.alert(
        'Correo inválido',
        'Ingresa un correo electrónico válido.',
      );

      return false;
    }

    if (!phone.trim()) {
      Alert.alert(
        'Campo requerido',
        'Ingresa tu número de teléfono.',
      );

      return false;
    }

    const invalidSocialField = SOCIAL_FIELDS.find((field) => {
      const url = socialLinks[field.platform].trim();

      return url && !isValidUrl(url);
    });

    if (invalidSocialField) {
      Alert.alert(
        'URL inválida',
        `Ingresa una URL completa y válida para ${invalidSocialField.label}.`,
      );

      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      const credentials = await getCredentials();

      const payloadSocialLinks = SOCIAL_FIELDS
        .map((field) => ({
          platform: field.platform,
          url: socialLinks[field.platform].trim(),
        }))
        .filter((socialLink) => Boolean(socialLink.url));

      await updateProfile(credentials, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone_dial_code: selectedCountry.dialCode.replace('+', ''),
        phone_number: phone.replace(/\D/g, ''),
        occupation: occupation.trim() || null,
        location: location.trim() || null,
        social_links: payloadSocialLinks,
      });

      Alert.alert(
        'Perfil actualizado',
        'Tus cambios se guardaron correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'No fue posible guardar el perfil',
        error instanceof Error
          ? error.message
          : 'Inténtalo nuevamente.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
          />

          <Text style={styles.loadingText}>
            Cargando perfil...
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Editar Perfil
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircleBig}>
              <Text style={styles.avatarTextBig}>
                {initials}
              </Text>
            </View>

            <Text style={styles.avatarTip}>
              Tus iniciales
            </Text>
          </View>

          <Text style={styles.sectionTitle}>
            Datos personales
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Nombre *
            </Text>

            <View style={styles.inputFieldRow}>
              <UserRound
                size={16}
                color={colors.neutral.gray500}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.inputFieldText}
                placeholder="Ingresa tu nombre"
                placeholderTextColor={colors.neutral.gray500}
                value={firstName}
                onChangeText={setFirstName}
                editable={!isSaving}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Apellido *
            </Text>

            <View style={styles.inputFieldRow}>
              <UserRound
                size={16}
                color={colors.neutral.gray500}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.inputFieldText}
                placeholder="Ingresa tu apellido"
                placeholderTextColor={colors.neutral.gray500}
                value={lastName}
                onChangeText={setLastName}
                editable={!isSaving}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Correo electrónico *
            </Text>

            <View
              style={[
                styles.inputFieldRow,
                !isEmailValid && styles.inputError,
              ]}
            >
              <Mail
                size={16}
                color={colors.neutral.gray500}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.inputFieldText}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.neutral.gray500}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!isSaving}
              />
            </View>

            {!isEmailValid ? (
              <Text style={styles.errorText}>
                Ingresa un correo válido
              </Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Número de teléfono *
            </Text>

            <View style={styles.phoneRow}>
              <TouchableOpacity
                style={styles.prefixBadge}
                activeOpacity={0.7}
                onPress={() => {
                  setSearchQuery('');
                  setModalVisible(true);
                }}
                disabled={isSaving}
              >
                <Text style={styles.flag}>
                  {selectedCountry.flag}
                </Text>

                <Text style={styles.prefixText}>
                  {selectedCountry.dialCode}
                </Text>
              </TouchableOpacity>

              <TextInput
                style={[styles.inputField, styles.phoneInput]}
                placeholder="300 000 0000"
                placeholderTextColor={colors.neutral.gray500}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value.replace(/\D/g, ''));
                }}
                editable={!isSaving}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Información profesional
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Ocupación
            </Text>

            <View style={styles.inputFieldRow}>
              <Briefcase
                size={16}
                color={colors.neutral.gray500}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.inputFieldText}
                placeholder="Ej. Desarrollador de software"
                placeholderTextColor={colors.neutral.gray500}
                value={occupation}
                onChangeText={setOccupation}
                editable={!isSaving}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Ubicación
            </Text>

            <View style={styles.inputFieldRow}>
              <MapPin
                size={16}
                color={colors.neutral.gray500}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.inputFieldText}
                placeholder="Ej. Bogotá, Colombia"
                placeholderTextColor={colors.neutral.gray500}
                value={location}
                onChangeText={setLocation}
                editable={!isSaving}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Redes sociales
          </Text>

          {SOCIAL_FIELDS.map((field) => {
            const Icon = field.icon;

            return (
              <View
                key={field.platform}
                style={styles.inputGroup}
              >
                <Text style={styles.inputLabel}>
                  {field.label}
                </Text>

                <View style={styles.inputFieldRow}>
                  <Icon
                    size={16}
                    color={colors.neutral.gray500}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.inputFieldText}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.neutral.gray500}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    value={socialLinks[field.platform]}
                    onChangeText={(value) => {
                      updateSocialLink(field.platform, value);
                    }}
                    editable={!isSaving}
                  />
                </View>
              </View>
            );
          })}

          <View style={styles.actionsBar}>
            <TouchableOpacity
              style={styles.discardBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
              disabled={isSaving}
            >
              <Text style={styles.discardBtnText}>
                Descartar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                isSaving && styles.saveBtnDisabled,
              ]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator
                  size="small"
                  color={colors.neutral.white}
                />
              ) : (
                <Text style={styles.saveBtnText}>
                  Guardar cambios
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        <FloatingTabBar activeTab="profile" />

        <Modal
          animationType="slide"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      Selecciona un país
                    </Text>

                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.closeButtonText}>
                        Cerrar
                      </Text>
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
                        <Text style={styles.countryFlag}>
                          {item.flag}
                        </Text>

                        <Text style={styles.countryName}>
                          {item.name}
                        </Text>

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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarCircleBig: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DDD6FE',
    marginBottom: 10,
  },
  avatarTextBig: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  avatarTip: {
    fontSize: 12,
    color: colors.neutral.gray600,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral.gray700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.neutral.text,
    fontWeight: '500',
  },
  inputFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 14,
  },
  inputFieldText: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.neutral.text,
    fontWeight: '500',
  },
  inputIcon: {
    marginRight: 8,
  },
  inputError: {
    borderColor: colors.semantic.error,
  },
  errorText: {
    color: colors.semantic.error,
    fontSize: 12,
    marginTop: 6,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInput: {
    flex: 1,
  },
  prefixBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },
  flag: {
    fontSize: 16,
    marginRight: 6,
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  discardBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  discardBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.gray700,
  },
  saveBtn: {
    flex: 1.5,
    backgroundColor: colors.brand.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  bottomSpacing: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 46, 0.4)',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.neutral.gray100,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  searchBar: {
    backgroundColor: colors.neutral.gray100,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.neutral.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  countryList: {
    maxHeight: 300,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 14,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  countryDialCode: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.brand.primary,
  },
});