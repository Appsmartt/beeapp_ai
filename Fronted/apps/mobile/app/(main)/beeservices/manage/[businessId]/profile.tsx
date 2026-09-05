import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Save,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import type {
  CommercialOwnedProfile,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../../../src/features/buddyservices/commercialErrors';
import {
  loadOwnedCommercialProfile,
  updateOwnedCommercialProfile,
} from '../../../../../src/services/commercialService';

function normalizeBusinessId(
  value: string | string[] | undefined,
): string {
  const selectedValue = Array.isArray(value)
    ? value[0]
    : value;

  return String(selectedValue || '').trim();
}

function optionalText(
  value: string,
): string | null {
  const normalizedValue = value.trim();

  return normalizedValue || null;
}

export default function BuddyServicesManageProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    businessId?: string | string[];
  }>();

  const businessId = normalizeBusinessId(params.businessId);

  const [profile, setProfile] = useState<
    CommercialOwnedProfile | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [countryCode, setCountryCode] = useState('CO');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [locationReference, setLocationReference] = useState('');
  const [isAddressPublic, setIsAddressPublic] = useState(false);
  const [phoneDialCode, setPhoneDialCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhonePublic, setIsPhonePublic] = useState(false);
  const [publicEmail, setPublicEmail] = useState('');
  const [isEmailPublic, setIsEmailPublic] = useState(false);
  const [customActivityText, setCustomActivityText] = useState('');

  const applyProfile = useCallback((
    nextProfile: CommercialOwnedProfile,
  ) => {
    setProfile(nextProfile);
    setDisplayName(nextProfile.display_name);
    setDescription(nextProfile.description);
    setCountryCode(nextProfile.country_code);
    setCity(nextProfile.city);
    setAddress(nextProfile.address || '');
    setNeighborhood(nextProfile.neighborhood || '');
    setLocationReference(nextProfile.location_reference || '');
    setIsAddressPublic(nextProfile.is_address_public);
    setPhoneDialCode(nextProfile.phone_dial_code || '');
    setPhoneNumber(nextProfile.phone_number || '');
    setIsPhonePublic(nextProfile.is_phone_public);
    setPublicEmail(nextProfile.public_email || '');
    setIsEmailPublic(nextProfile.is_email_public);
    setCustomActivityText(
      nextProfile.custom_activity_text || '',
    );
  }, []);

  const loadProfile = useCallback(async () => {
    if (!businessId) {
      setErrorMessage(
        'No fue posible identificar el negocio solicitado.',
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await loadOwnedCommercialProfile(
        businessId,
      );

      applyProfile(response.profile);
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    applyProfile,
    businessId,
  ]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const save = useCallback(async () => {
    if (!profile) {
      return;
    }

    const normalizedDisplayName = displayName.trim();
    const normalizedDescription = description.trim();
    const normalizedCountryCode = countryCode.trim().toUpperCase();
    const normalizedCity = city.trim();
    const normalizedAddress = optionalText(address);
    const normalizedPhoneDialCode = optionalText(phoneDialCode);
    const normalizedPhoneNumber = optionalText(phoneNumber);
    const normalizedPublicEmail = optionalText(publicEmail);

    if (!normalizedDisplayName) {
      setErrorMessage('Escribe el nombre del negocio.');
      return;
    }

    if (!normalizedDescription) {
      setErrorMessage('Escribe una descripción del negocio.');
      return;
    }

    if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
      setErrorMessage(
        'El código de país debe tener dos letras, por ejemplo CO.',
      );
      return;
    }

    if (!normalizedCity) {
      setErrorMessage('Escribe la ciudad del negocio.');
      return;
    }

    if (
      (normalizedPhoneDialCode && !normalizedPhoneNumber)
      || (!normalizedPhoneDialCode && normalizedPhoneNumber)
    ) {
      setErrorMessage(
        'El indicativo y el teléfono deben enviarse juntos.',
      );
      return;
    }

    if (isPhonePublic && !normalizedPhoneNumber) {
      setErrorMessage(
        'Agrega un teléfono antes de hacerlo público.',
      );
      return;
    }

    if (isEmailPublic && !normalizedPublicEmail) {
      setErrorMessage(
        'Agrega un email antes de hacerlo público.',
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await updateOwnedCommercialProfile(
        profile.id,
        {
          display_name: normalizedDisplayName,
          description: normalizedDescription,
          country_code: normalizedCountryCode,
          city: normalizedCity,
          address: normalizedAddress,
          neighborhood: optionalText(neighborhood),
          location_reference: optionalText(
            locationReference,
          ),
          is_address_public: isAddressPublic,
          phone_dial_code: normalizedPhoneDialCode,
          phone_number: normalizedPhoneNumber,
          is_phone_public: isPhonePublic,
          public_email: normalizedPublicEmail,
          is_email_public: isEmailPublic,
          ...(
            profile.category_id
              ? {}
              : {
                custom_activity_text: optionalText(
                  customActivityText,
                ),
              }
          ),
        },
      );

      applyProfile(response.profile);
      router.back();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
    } finally {
      setIsSaving(false);
    }
  }, [
    address,
    applyProfile,
    city,
    countryCode,
    customActivityText,
    description,
    displayName,
    isAddressPublic,
    isEmailPublic,
    isPhonePublic,
    locationReference,
    neighborhood,
    phoneDialCode,
    phoneNumber,
    profile,
    publicEmail,
    router,
  ]);

  return (
    <ScreenSafeArea
      style={{
        backgroundColor: '#FFFCF9',
        flex: 1,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 18,
          paddingTop: 10,
        }}
      >
        <TouchableOpacity
          accessibilityLabel="Volver a gestión del negocio"
          accessibilityRole="button"
          activeOpacity={0.8}
          disabled={isSaving}
          onPress={() => router.back()}
          style={{
            alignItems: 'center',
            backgroundColor: '#F4EDF9',
            borderRadius: 14,
            height: 42,
            justifyContent: 'center',
            opacity: isSaving ? 0.55 : 1,
            width: 42,
          }}
        >
          <ArrowLeft
            color="#3D245E"
            size={21}
          />
        </TouchableOpacity>

        <Text
          style={{
            color: '#261743',
            fontSize: 18,
            fontWeight: '800',
          }}
        >
          Perfil del negocio
        </Text>

        <View
          style={{
            width: 42,
          }}
        />
      </View>

      {isLoading ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator
            color="#7427D5"
            size="large"
          />

          <Text
            style={{
              color: '#786593',
              fontSize: 14,
              marginTop: 14,
            }}
          >
            Cargando perfil…
          </Text>
        </View>
      ) : errorMessage && !profile ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 30,
          }}
        >
          <Text
            style={{
              color: '#261743',
              fontSize: 19,
              fontWeight: '800',
              textAlign: 'center',
            }}
          >
            No fue posible abrir el perfil
          </Text>

          <Text
            style={{
              color: '#786593',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 9,
              textAlign: 'center',
            }}
          >
            {errorMessage}
          </Text>

          <TouchableOpacity
            accessibilityLabel="Reintentar cargar perfil"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              void loadProfile();
            }}
            style={{
              backgroundColor: '#7427D5',
              borderRadius: 13,
              marginTop: 22,
              paddingHorizontal: 18,
              paddingVertical: 13,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: '800',
              }}
            >
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      ) : profile ? (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: 38,
            paddingHorizontal: 18,
            paddingTop: 22,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              color: '#261743',
              fontSize: 22,
              fontWeight: '900',
            }}
          >
            Datos principales
          </Text>

          <Text
            style={{
              color: '#786593',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 6,
            }}
          >
            Estos datos se validan y guardan en el backend
            del negocio autorizado.
          </Text>

          {errorMessage ? (
            <View
              style={{
                backgroundColor: '#FFF0F0',
                borderColor: '#F7B2B2',
                borderRadius: 14,
                borderWidth: 1,
                marginTop: 18,
                padding: 13,
              }}
            >
              <Text
                style={{
                  color: '#B42318',
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <TextInput
            accessibilityLabel="Nombre del negocio"
            editable={!isSaving}
            onChangeText={setDisplayName}
            placeholder="Nombre del negocio"
            placeholderTextColor="#A692B7"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#DCCBEE',
              borderRadius: 13,
              borderWidth: 1,
              color: '#261743',
              fontSize: 14,
              marginTop: 20,
              minHeight: 48,
              paddingHorizontal: 13,
            }}
            value={displayName}
          />

          <TextInput
            accessibilityLabel="Descripción del negocio"
            editable={!isSaving}
            multiline
            numberOfLines={4}
            onChangeText={setDescription}
            placeholder="Describe lo que ofreces"
            placeholderTextColor="#A692B7"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#DCCBEE',
              borderRadius: 13,
              borderWidth: 1,
              color: '#261743',
              fontSize: 14,
              lineHeight: 20,
              marginTop: 10,
              minHeight: 96,
              paddingHorizontal: 13,
              paddingTop: 12,
              textAlignVertical: 'top',
            }}
            value={description}
          />

          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              marginTop: 10,
            }}
          >
            <TextInput
              accessibilityLabel="Código de país"
              autoCapitalize="characters"
              editable={!isSaving}
              maxLength={2}
              onChangeText={setCountryCode}
              placeholder="CO"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                color: '#261743',
                flex: 0.32,
                fontSize: 14,
                minHeight: 48,
                paddingHorizontal: 13,
              }}
              value={countryCode}
            />

            <TextInput
              accessibilityLabel="Ciudad"
              editable={!isSaving}
              onChangeText={setCity}
              placeholder="Ciudad"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                color: '#261743',
                flex: 0.68,
                fontSize: 14,
                minHeight: 48,
                paddingHorizontal: 13,
              }}
              value={city}
            />
          </View>

          <Text
            style={{
              color: '#261743',
              fontSize: 15,
              fontWeight: '800',
              marginTop: 24,
            }}
          >
            Ubicación
          </Text>

          <TextInput
            accessibilityLabel="Dirección"
            editable={!isSaving}
            onChangeText={setAddress}
            placeholder="Dirección opcional"
            placeholderTextColor="#A692B7"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#DCCBEE',
              borderRadius: 13,
              borderWidth: 1,
              color: '#261743',
              fontSize: 14,
              marginTop: 10,
              minHeight: 48,
              paddingHorizontal: 13,
            }}
            value={address}
          />

          <TextInput
            accessibilityLabel="Barrio o zona"
            editable={!isSaving}
            onChangeText={setNeighborhood}
            placeholder="Barrio o zona opcional"
            placeholderTextColor="#A692B7"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#DCCBEE',
              borderRadius: 13,
              borderWidth: 1,
              color: '#261743',
              fontSize: 14,
              marginTop: 10,
              minHeight: 48,
              paddingHorizontal: 13,
            }}
            value={neighborhood}
          />

          <TextInput
            accessibilityLabel="Referencia de ubicación"
            editable={!isSaving}
            onChangeText={setLocationReference}
            placeholder="Referencia opcional"
            placeholderTextColor="#A692B7"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#DCCBEE',
              borderRadius: 13,
              borderWidth: 1,
              color: '#261743',
              fontSize: 14,
              marginTop: 10,
              minHeight: 48,
              paddingHorizontal: 13,
            }}
            value={locationReference}
          />

          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 12,
            }}
          >
            <View
              style={{
                flex: 1,
                paddingRight: 14,
              }}
            >
              <Text
                style={{
                  color: '#261743',
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                Mostrar dirección públicamente
              </Text>

              <Text
                style={{
                  color: '#786593',
                  fontSize: 12,
                  lineHeight: 17,
                  marginTop: 2,
                }}
             >
                Puedes mostrar zona sin revelar el detalle.
              </Text>
            </View>

            <Switch
              accessibilityLabel="Mostrar dirección públicamente"
              disabled={isSaving}
              onValueChange={setIsAddressPublic}
              value={isAddressPublic}
            />
          </View>

          <Text
            style={{
              color: '#261743',
              fontSize: 15,
              fontWeight: '800',
              marginTop: 24,
            }}
          >
            Contacto
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              marginTop: 10,
            }}
          >
            <TextInput
              accessibilityLabel="Indicativo telefónico"
              editable={!isSaving}
              keyboardType="phone-pad"
              maxLength={9}
              onChangeText={setPhoneDialCode}
              placeholder="57"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                color: '#261743',
                flex: 0.3,
                fontSize: 14,
                minHeight: 48,
                paddingHorizontal: 13,
              }}
              value={phoneDialCode}
            />

            <TextInput
              accessibilityLabel="Teléfono comercial"
              editable={!isSaving}
              keyboardType="phone-pad"
              onChangeText={setPhoneNumber}
              placeholder="Teléfono opcional"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                color: '#261743',
                flex: 0.7,
                fontSize: 14,
                minHeight: 48,
                paddingHorizontal: 13,
              }}
              value={phoneNumber}
            />
          </View>

          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 12,
            }}
          >
            <Text
              style={{
                color: '#261743',
                fontSize: 14,
                fontWeight: '700',
              }}
            >
              Mostrar teléfono públicamente
            </Text>

            <Switch
              accessibilityLabel="Mostrar teléfono públicamente"
              disabled={isSaving}
              onValueChange={setIsPhonePublic}
              value={isPhonePublic}
            />
          </View>

          <TextInput
            accessibilityLabel="Email público"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSaving}
            keyboardType="email-address"
            onChangeText={setPublicEmail}
            placeholder="Email opcional"
            placeholderTextColor="#A692B7"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#DCCBEE',
              borderRadius: 13,
              borderWidth: 1,
              color: '#261743',
              fontSize: 14,
              marginTop: 12,
              minHeight: 48,
              paddingHorizontal: 13,
            }}
            value={publicEmail}
          />

          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 12,
            }}
          >
            <Text
              style={{
                color: '#261743',
                fontSize: 14,
                fontWeight: '700',
              }}
            >
              Mostrar email públicamente
            </Text>

            <Switch
              accessibilityLabel="Mostrar email públicamente"
              disabled={isSaving}
              onValueChange={setIsEmailPublic}
              value={isEmailPublic}
            />
          </View>

          {!profile.category_id ? (
            <>
              <Text
                style={{
                  color: '#261743',
                  fontSize: 15,
                  fontWeight: '800',
                  marginTop: 24,
                }}
              >
                Actividad personalizada
              </Text>

              <TextInput
                accessibilityLabel="Actividad personalizada"
                editable={!isSaving}
                onChangeText={setCustomActivityText}
                placeholder="Actividad del negocio"
                placeholderTextColor="#A692B7"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#DCCBEE',
                  borderRadius: 13,
                  borderWidth: 1,
                  color: '#261743',
                  fontSize: 14,
                  marginTop: 10,
                  minHeight: 48,
                  paddingHorizontal: 13,
                }}
                value={customActivityText}
              />
            </>
          ) : null}

          <TouchableOpacity
            accessibilityLabel="Guardar perfil comercial"
            accessibilityRole="button"
            activeOpacity={0.82}
            disabled={isSaving}
            onPress={() => {
              void save();
            }}
            style={{
              alignItems: 'center',
              backgroundColor: '#7427D5',
              borderRadius: 15,
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 28,
              minHeight: 52,
              opacity: isSaving ? 0.65 : 1,
              paddingHorizontal: 18,
            }}
          >
            <Save
              color="#FFFFFF"
              size={19}
            />

            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: '800',
                marginLeft: 8,
              }}
            >
              {isSaving
                ? 'Guardando…'
                : 'Guardar perfil'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </ScreenSafeArea>
  );
}
