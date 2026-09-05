import {
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  ImagePlus,
  LoaderCircle,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  useRouter,
} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import type {
  CommercialCategory,
  CommercialModality,
  CommercialOfferType,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../src/features/buddyservices/commercialErrors';
import {
  buddyServicesManageBusinessRoute,
} from '../../../src/features/buddyservices/commercialRoutes';
import {
  createOwnedCommercialProfile,
  loadPublicCommercialCategories,
} from '../../../src/services/commercialService';
import {
  LocalCommercialLogo,
  uploadCommercialLogo,
} from '../../../src/services/commercialLogoService';
import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';

const OFFER_TYPES: Array<{
  value: CommercialOfferType;
  label: string;
}> = [
  {
    value: 'products',
    label: 'Productos',
  },
  {
    value: 'services',
    label: 'Servicios',
  },
  {
    value: 'mixed',
    label: 'Productos y servicios',
  },
];

const MODALITIES: Array<{
  value: CommercialModality;
  label: string;
}> = [
  {
    value: 'at_establishment',
    label: 'En establecimiento',
  },
  {
    value: 'in_person',
    label: 'Presencial',
  },
  {
    value: 'virtual',
    label: 'Virtual',
  },
  {
    value: 'home_visit',
    label: 'Visita a domicilio',
  },
  {
    value: 'delivery',
    label: 'Entrega a domicilio',
  },
  {
    value: 'pickup',
    label: 'Recoger',
  },
  {
    value: 'phone_call',
    label: 'Llamada telefónica',
  },
  {
    value: 'buddy_chat',
    label: 'Chat de BeeApp',
  },
];

function normalizeOptionalText(
  value: string,
): string | null {
  const normalizedValue = value.trim();

  return normalizedValue || null;
}

function requiresAddress(
  modalities: CommercialModality[],
): boolean {
  return (
    modalities.includes('at_establishment')
    || modalities.includes('in_person')
  );
}

export default function BuddyServicesCreateBusinessScreen() {
  const router = useRouter();

  const [offerType, setOfferType] = useState<
    CommercialOfferType
  >('products');
  const [categories, setCategories] = useState<
    CommercialCategory[]
  >([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(
    true,
  );
  const [categoriesError, setCategoriesError] = useState<
    string | null
  >(null);

  const [categoryId, setCategoryId] = useState<string | null>(
    null,
  );
  const [customActivityText, setCustomActivityText] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [countryCode, setCountryCode] = useState('CO');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [locationReference, setLocationReference] = useState('');
  const [isAddressPublic, setIsAddressPublic] = useState(false);
  const [phoneDialCode, setPhoneDialCode] = useState('57');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isPhonePublic, setIsPhonePublic] = useState(false);
  const [publicEmail, setPublicEmail] = useState('');
  const [isEmailPublic, setIsEmailPublic] = useState(false);
  const [modalities, setModalities] = useState<
    CommercialModality[]
  >([]);
  const [logo, setLogo] = useState<
    LocalCommercialLogo | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(
    null,
  );

  const filteredCategories = useMemo(
    () => categories.filter((category) => (
      offerType === 'mixed'
      || category.offer_type === offerType
    )),
    [categories, offerType],
  );

  const loadCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    setCategoriesError(null);

    try {
      const response = await loadPublicCommercialCategories({
        offer_type: offerType,
      });

      setCategories(response.categories);
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setCategoriesError(uiError.message);
      setCategories([]);
    } finally {
      setIsCategoriesLoading(false);
    }
  }, [offerType]);

  useEffect(() => {
    setCategoryId(null);
    void loadCategories();
  }, [loadCategories]);

  const selectLogo = useCallback(async () => {
    setFormError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setFormError(
        'Necesitamos permiso para seleccionar el logo del negocio.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset) {
      setFormError(
        'No fue posible leer la imagen seleccionada.',
      );
      return;
    }

    const fallbackName = (
      `logo-${Date.now()}.${(
        asset.mimeType === 'image/png'
          ? 'png'
          : asset.mimeType === 'image/webp'
            ? 'webp'
            : 'jpg'
      )}`
    );

    setLogo({
      uri: asset.uri,
      name: asset.fileName || fallbackName,
      mimeType: asset.mimeType || 'image/jpeg',
      sizeBytes: asset.fileSize,
    });
  }, []);

  const toggleModality = useCallback((
    modality: CommercialModality,
  ) => {
    setModalities((currentModalities) => (
      currentModalities.includes(modality)
        ? currentModalities.filter(
          (value) => value !== modality,
        )
        : [...currentModalities, modality]
    ));
  }, []);

  const submit = useCallback(async () => {
    setFormError(null);

    const normalizedDisplayName = displayName.trim();
    const normalizedDescription = description.trim();
    const normalizedCity = city.trim();
    const normalizedAddress = normalizeOptionalText(address);
    const normalizedPhoneNumber = normalizeOptionalText(
      phoneNumber,
    );
    const normalizedPublicEmail = normalizeOptionalText(
      publicEmail,
    );

    if (!logo) {
      setFormError('Selecciona el logo del negocio.');
      return;
    }

    if (!normalizedDisplayName) {
      setFormError('Escribe el nombre del negocio.');
      return;
    }

    if (!normalizedDescription) {
      setFormError('Escribe una descripción del negocio.');
      return;
    }

    if (!normalizedCity) {
      setFormError('Escribe la ciudad del negocio.');
      return;
    }

    if (!categoryId && !customActivityText.trim()) {
      setFormError(
        'Selecciona una categoría o escribe la actividad del negocio.',
      );
      return;
    }

    if (modalities.length === 0) {
      setFormError('Selecciona al menos una modalidad.');
      return;
    }

    if (
      requiresAddress(modalities)
      && !normalizedAddress
    ) {
      setFormError(
        'La dirección es obligatoria para atención presencial.',
      );
      return;
    }

    if (isPhonePublic && !normalizedPhoneNumber) {
      setFormError(
        'Agrega un teléfono antes de hacerlo público.',
      );
      return;
    }

    if (isEmailPublic && !normalizedPublicEmail) {
      setFormError(
        'Agrega un email antes de hacerlo público.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const credentials = await getValidSessionCredentials();

      if (!credentials) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const uploadedLogo = await uploadCommercialLogo(
        credentials,
        logo,
      );

      const response = await createOwnedCommercialProfile({
        offer_type: offerType,
        category_id: categoryId,
        custom_activity_text: (
          categoryId
            ? null
            : normalizeOptionalText(customActivityText)
        ),
        display_name: normalizedDisplayName,
        description: normalizedDescription,
        country_code: countryCode.trim().toUpperCase(),
        city: normalizedCity,
        address: normalizedAddress,
        neighborhood: normalizeOptionalText(neighborhood),
        location_reference: normalizeOptionalText(
          locationReference,
        ),
        is_address_public: isAddressPublic,
        phone_dial_code: normalizedPhoneNumber
          ? phoneDialCode.trim()
          : null,
        phone_number: normalizedPhoneNumber,
        is_phone_public: isPhonePublic,
        public_email: normalizedPublicEmail,
        is_email_public: isEmailPublic,
        logo_file_id: uploadedLogo.id,
        is_public: false,
        is_available: true,
        modalities,
        hours: [],
      });

      router.replace(
        buddyServicesManageBusinessRoute(
          response.profile.id,
        ),
      );
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setFormError(uiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    address,
    categoryId,
    city,
    countryCode,
    customActivityText,
    description,
    displayName,
    isAddressPublic,
    isEmailPublic,
    isPhonePublic,
    logo,
    locationReference,
    modalities,
    neighborhood,
    offerType,
    phoneDialCode,
    phoneNumber,
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
          accessibilityLabel="Volver a mis negocios"
          accessibilityRole="button"
          activeOpacity={0.8}
          disabled={isSubmitting}
          onPress={() => router.back()}
          style={{
            alignItems: 'center',
            backgroundColor: '#F4EDF9',
            borderRadius: 14,
            height: 42,
            justifyContent: 'center',
            opacity: isSubmitting ? 0.55 : 1,
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
            fontSize: 19,
            fontWeight: '800',
          }}
        >
          Crear negocio
        </Text>

        <View
          style={{
            width: 42,
          }}
        />
      </View>

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
            fontSize: 23,
            fontWeight: '900',
          }}
        >
          Crea tu perfil comercial
        </Text>

        <Text
          style={{
            color: '#786593',
            fontSize: 14,
            lineHeight: 21,
            marginTop: 7,
          }}
        >
          Se creará inicialmente como borrador privado.
          Podrás completar su configuración antes de publicar.
        </Text>

        {formError ? (
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
              {formError}
            </Text>
          </View>
        ) : null}

        <Text
          style={{
            color: '#261743',
            fontSize: 15,
            fontWeight: '800',
            marginTop: 22,
          }}
        >
          Logo del negocio
        </Text>

        <TouchableOpacity
          accessibilityHint="Abre la galería para seleccionar una imagen"
          accessibilityLabel="Seleccionar logo del negocio"
          accessibilityRole="button"
          activeOpacity={0.82}
          disabled={isSubmitting}
          onPress={() => {
            void selectLogo();
          }}
          style={{
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderColor: '#DCCBEE',
            borderRadius: 17,
            borderStyle: 'dashed',
            borderWidth: 1,
            flexDirection: 'row',
            marginTop: 10,
            minHeight: 76,
            opacity: isSubmitting ? 0.55 : 1,
            paddingHorizontal: 14,
          }}
        >
          {logo ? (
            <Image
              source={{
                uri: logo.uri,
              }}
              style={{
                borderRadius: 16,
                height: 50,
                width: 50,
              }}
            />
          ) : (
            <View
              style={{
                alignItems: 'center',
                backgroundColor: '#F6EAFE',
                borderRadius: 16,
                height: 50,
                justifyContent: 'center',
                width: 50,
              }}
            >
              <ImagePlus
                color="#7427D5"
                size={23}
              />
            </View>
          )}

          <View
            style={{
              flex: 1,
              marginLeft: 12,
            }}
          >
            <Text
              style={{
                color: '#261743',
                fontSize: 14,
                fontWeight: '800',
              }}
            >
              {logo
                ? 'Cambiar logo'
                : 'Seleccionar logo'}
            </Text>

            <Text
              numberOfLines={1}
              style={{
                color: '#786593',
                fontSize: 12,
                marginTop: 3,
              }}
            >
              {logo
                ? logo.name
                : 'JPG, PNG o WebP · máximo 5 MB'}
            </Text>
          </View>
        </TouchableOpacity>

        <Text
          style={{
            color: '#261743',
            fontSize: 15,
            fontWeight: '800',
            marginTop: 24,
          }}
        >
          Tipo de negocio
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 10,
          }}
        >
          {OFFER_TYPES.map((item) => {
            const isSelected = offerType === item.value;

            return (
              <TouchableOpacity
                accessibilityLabel={`Tipo: ${item.label}`}
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSubmitting}
                key={item.value}
                onPress={() => setOfferType(item.value)}
                style={{
                  backgroundColor: isSelected
                    ? '#7427D5'
                    : '#FFFFFF',
                  borderColor: isSelected
                    ? '#7427D5'
                    : '#DCCBEE',
                  borderRadius: 99,
                  borderWidth: 1,
                  opacity: isSubmitting ? 0.55 : 1,
                  paddingHorizontal: 13,
                  paddingVertical: 9,
                }}
              >
                <Text
                  style={{
                    color: isSelected
                      ? '#FFFFFF'
                      : '#4E3B68',
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text
          style={{
            color: '#261743',
            fontSize: 15,
            fontWeight: '800',
            marginTop: 24,
          }}
        >
          Categoría o actividad
        </Text>

        {isCategoriesLoading ? (
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              marginTop: 11,
            }}
          >
            <LoaderCircle
              color="#7427D5"
              size={17}
            />

            <Text
              style={{
                color: '#786593',
                fontSize: 13,
                marginLeft: 8,
              }}
            >
              Cargando categorías…
            </Text>
          </View>
        ) : categoriesError ? (
          <Text
            style={{
              color: '#B42318',
              fontSize: 13,
              lineHeight: 19,
              marginTop: 10,
            }}
          >
            {categoriesError}
          </Text>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 10,
            }}
          >
            {filteredCategories.map((category) => {
              const isSelected = categoryId === category.id;

              return (
                <TouchableOpacity
                  accessibilityLabel={`Categoría: ${category.name}`}
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  disabled={isSubmitting}
                  key={category.id}
                  onPress={() => {
                    setCategoryId(category.id);
                    setCustomActivityText('');
                  }}
                  style={{
                    backgroundColor: isSelected
                      ? '#EBDCFD'
                      : '#FFFFFF',
                    borderColor: isSelected
                      ? '#7427D5'
                      : '#DCCBEE',
                    borderRadius: 99,
                    borderWidth: 1,
                    opacity: isSubmitting ? 0.55 : 1,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected
                        ? '#54209E'
                        : '#4E3B68',
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <TextInput
          accessibilityLabel="Actividad personalizada"
          editable={!isSubmitting}
          onChangeText={(value) => {
            setCustomActivityText(value);
            if (value.trim()) {
              setCategoryId(null);
            }
          }}
          placeholder="O escribe una actividad personalizada"
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
          value={customActivityText}
        />

        <Text
          style={{
            color: '#261743',
            fontSize: 15,
            fontWeight: '800',
            marginTop: 24,
          }}
        >
          Información principal
        </Text>

        <TextInput
          accessibilityLabel="Nombre del negocio"
          editable={!isSubmitting}
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
            marginTop: 10,
            minHeight: 48,
            paddingHorizontal: 13,
          }}
          value={displayName}
        />

        <TextInput
          accessibilityLabel="Descripción del negocio"
          editable={!isSubmitting}
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
            editable={!isSubmitting}
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
            editable={!isSubmitting}
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
          Modalidades
        </Text>

        <Text
          style={{
            color: '#786593',
            fontSize: 12,
            lineHeight: 18,
            marginTop: 5,
          }}
        >
          Selecciona cómo atiendes a tus clientes.
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginTop: 10,
          }}
        >
          {MODALITIES.map((item) => {
            const isSelected = modalities.includes(item.value);

            return (
              <TouchableOpacity
                accessibilityLabel={`Modalidad: ${item.label}`}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: isSelected,
                }}
                activeOpacity={0.82}
                disabled={isSubmitting}
                key={item.value}
                onPress={() => toggleModality(item.value)}
                style={{
                  alignItems: 'center',
                  backgroundColor: isSelected
                    ? '#EBDCFD'
                    : '#FFFFFF',
                  borderColor: isSelected
                    ? '#7427D5'
                    : '#DCCBEE',
                  borderRadius: 99,
                  borderWidth: 1,
                  flexDirection: 'row',
                  opacity: isSubmitting ? 0.55 : 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                {isSelected ? (
                  <Check
                    color="#54209E"
                    size={14}
                  />
                ) : null}

                <Text
                  style={{
                    color: isSelected
                      ? '#54209E'
                      : '#4E3B68',
                    fontSize: 12,
                    fontWeight: '700',
                    marginLeft: isSelected ? 5 : 0,
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text
          style={{
            color: '#261743',
            fontSize: 15,
            fontWeight: '800',
            marginTop: 24,
          }}
        >
          Ubicación y contacto
        </Text>

        <TextInput
          accessibilityLabel="Dirección"
          editable={!isSubmitting}
          onChangeText={setAddress}
          placeholder={
            requiresAddress(modalities)
              ? 'Dirección obligatoria para esta modalidad'
              : 'Dirección opcional'
          }
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
          editable={!isSubmitting}
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
          editable={!isSubmitting}
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
              Puedes usar la zona sin revelar la dirección exacta.
            </Text>
          </View>

          <Switch
            accessibilityLabel="Mostrar dirección públicamente"
            disabled={isSubmitting}
            onValueChange={setIsAddressPublic}
            value={isAddressPublic}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            marginTop: 12,
          }}
        >
          <TextInput
            accessibilityLabel="Indicativo telefónico"
            editable={!isSubmitting}
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
            editable={!isSubmitting}
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
            disabled={isSubmitting}
            onValueChange={setIsPhonePublic}
            value={isPhonePublic}
          />
        </View>

        <TextInput
          accessibilityLabel="Email público"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
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
            disabled={isSubmitting}
            onValueChange={setIsEmailPublic}
            value={isEmailPublic}
          />
        </View>

        <TouchableOpacity
          accessibilityLabel="Crear perfil comercial"
          accessibilityRole="button"
          activeOpacity={0.82}
          disabled={isSubmitting}
          onPress={() => {
            void submit();
          }}
          style={{
            alignItems: 'center',
            backgroundColor: '#7427D5',
            borderRadius: 15,
            flexDirection: 'row',
            justifyContent: 'center',
            marginTop: 28,
            minHeight: 52,
            opacity: isSubmitting ? 0.65 : 1,
            paddingHorizontal: 18,
          }}
        >
          {isSubmitting ? (
            <LoaderCircle
              color="#FFFFFF"
              size={20}
            />
          ) : null}

          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: '800',
              marginLeft: isSubmitting ? 9 : 0,
            }}
          >
            {isSubmitting
              ? 'Creando negocio…'
              : 'Crear negocio'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenSafeArea>
  );
}
