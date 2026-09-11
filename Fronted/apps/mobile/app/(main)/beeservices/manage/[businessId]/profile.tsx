import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ImagePlus,
  Save,
  X,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import type {
  CommercialCategory,
  CommercialModality,
  CommercialOfferType,
  CommercialOwnedProfile,
} from '@beeapp/shared-types';

import CommercialLogoAvatar from '../../../../../src/components/buddyservices/CommercialLogoAvatar';
import ScreenSafeArea from '../../../../../src/components/layout/ScreenSafeArea';
import {
  LocalCommercialLogo,
  uploadCommercialLogo,
} from '../../../../../src/services/commercialLogoService';
import {
  getValidSessionCredentials,
} from '../../../../../src/services/authSession';
import {
  toCommercialUiError,
} from '../../../../../src/features/buddyservices/commercialErrors';
import {
  loadOwnedCommercialProfile,
  loadPublicCommercialCategories,
  updateOwnedCommercialProfile,
} from '../../../../../src/services/commercialService';


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

  const [offerType, setOfferType] = useState<
    CommercialOfferType
  >('products');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [countryCode, setCountryCode] = useState('CO');
  const [isCountryPickerVisible, setIsCountryPickerVisible] = (
    useState(false)
  );
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
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [categoryDetailsById, setCategoryDetailsById] = useState<
    Record<string, CommercialCategory>
  >({});
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const latestCategorySearchRequestRef = useRef(0);
  const [categories, setCategories] = useState<CommercialCategory[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [modalities, setModalities] = useState<
    CommercialModality[]
  >([]);
  const [logo, setLogo] = useState<
    LocalCommercialLogo | null
  >(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<
      'displayName' | 'description' | 'city' | 'categories' | 'modalities',
      string
    >>
  >({});
  const [categoryLimitNotice, setCategoryLimitNotice] = useState<
    string | null
  >(null);

  const clearFieldError = useCallback((
    field: 'displayName' | 'description' | 'city' | 'categories' | 'modalities',
  ) => {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];

      return nextErrors;
    });
  }, []);

  const showCategoryLimitNotice = useCallback(() => {
    setCategoryLimitNotice(
      'Máximo 5 categorías. Quita una para agregar otra.',
    );

    setTimeout(() => {
      setCategoryLimitNotice(null);
    }, 3000);
  }, []);

  const applyProfile = useCallback((
    nextProfile: CommercialOwnedProfile,
  ) => {
    setProfile(nextProfile);
    setOfferType(nextProfile.offer_type);
    setDisplayName(nextProfile.display_name);
    setDescription(nextProfile.description);
    setCountryCode(nextProfile.country_code || 'CO');
    setCity(nextProfile.city);
    setAddress(nextProfile.address || '');
    setNeighborhood(nextProfile.neighborhood || '');
    setLocationReference(nextProfile.location_reference || '');
    setIsAddressPublic(nextProfile.is_address_public);
    setPhoneDialCode(nextProfile.phone_dial_code || '57');
    setPhoneNumber(nextProfile.phone_number || '');
    setIsPhonePublic(nextProfile.is_phone_public);
    setPublicEmail(nextProfile.public_email || '');
    setIsEmailPublic(nextProfile.is_email_public);
    setCategoryIds(nextProfile.category_ids ?? []);
    setCategoryDetailsById((currentCategoriesById) => {
      const nextCategoriesById = {
        ...currentCategoriesById,
      };

      (nextProfile.categories ?? []).forEach((relation) => {
        const category = relation.category;

        if (category) {
          nextCategoriesById[category.id] = category;
        }
      });

      return nextCategoriesById;
    });
    setModalities(
      nextProfile.modalities
        .filter((item) => item.status !== 'archived')
        .map((item) => item.modality),
    );
    setFieldErrors({});
    setCategoryLimitNotice(null);
  }, []);

  const normalizedCategorySearchQuery = useMemo(
    () => categorySearchQuery.trim().toLocaleLowerCase('es-CO'),
    [categorySearchQuery],
  );

  const selectedCategories = useMemo(
    () => categoryIds.map((categoryId) => (
      categoryDetailsById[categoryId]
    )).filter((
      category,
    ): category is CommercialCategory => Boolean(category)),
    [categoryDetailsById, categoryIds],
  );

  useEffect(() => {
    if (categories.length === 0 || categoryIds.length === 0) {
      return;
    }

    setCategoryDetailsById((currentCategoriesById) => {
      const nextCategoriesById = {
        ...currentCategoriesById,
      };
      let hasChanges = false;

      categories.forEach((category) => {
        if (
          categoryIds.includes(category.id)
          && !nextCategoriesById[category.id]
        ) {
          nextCategoriesById[category.id] = category;
          hasChanges = true;
        }
      });

      return hasChanges
        ? nextCategoriesById
        : currentCategoriesById;
    });
  }, [categories, categoryIds]);

  const recommendedCategories = useMemo(
    () => categories.filter((category) => (
      !categoryIds.includes(category.id)
      && category.name.toLocaleLowerCase('es-CO').includes(
        normalizedCategorySearchQuery,
      )
    )).slice(0, 5),
    [
      categories,
      categoryIds,
      normalizedCategorySearchQuery,
    ],
  );

  useEffect(() => {
    const search = normalizedCategorySearchQuery;
    const requestId = latestCategorySearchRequestRef.current + 1;
    latestCategorySearchRequestRef.current = requestId;

    if (search.length === 1) {
      setCategoriesError(null);
      setIsCategoriesLoading(false);
      return undefined;
    }

    setIsCategoriesLoading(true);
    setCategoriesError(null);

    const loadCategories = () => {
      void loadPublicCommercialCategories({
        offer_type: offerType,
        ...(search.length >= 2 ? { search } : {}),
        limit: 5,
      }).then((response) => {
        if (latestCategorySearchRequestRef.current !== requestId) {
          return;
        }

        setCategories(response.categories);
        setCategoryDetailsById((currentCategoriesById) => {
          const nextCategoriesById = {
            ...currentCategoriesById,
          };

          response.categories.forEach((category) => {
            nextCategoriesById[category.id] = category;
          });

          return nextCategoriesById;
        });
      }).catch((error) => {
        if (latestCategorySearchRequestRef.current !== requestId) {
          return;
        }

        const uiError = toCommercialUiError(error);
        setCategoriesError(uiError.message);
        setCategories([]);
      }).finally(() => {
        if (latestCategorySearchRequestRef.current === requestId) {
          setIsCategoriesLoading(false);
        }
      });
    };

    if (search.length >= 2) {
      const timeoutId = setTimeout(loadCategories, 250);

      return () => {
        clearTimeout(timeoutId);
      };
    }

    loadCategories();

    return undefined;
  }, [
    latestCategorySearchRequestRef,
    normalizedCategorySearchQuery,
    offerType,
  ]);

  const selectLogo = useCallback(async () => {
    setErrorMessage(null);

    const permission = (
      await ImagePicker.requestMediaLibraryPermissionsAsync()
    );

    if (!permission.granted) {
      setErrorMessage(
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
      setErrorMessage(
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
        ? currentModalities.filter((value) => value !== modality)
        : [...currentModalities, modality]
    ));
    clearFieldError('modalities');
  }, [clearFieldError]);

  const toggleCategory = useCallback((categoryId: string) => {
    if (categoryIds.includes(categoryId)) {
      setCategoryIds((currentCategoryIds) => (
        currentCategoryIds.filter((value) => value !== categoryId)
      ));
      setErrorMessage(null);
      return;
    }

    if (categoryIds.length >= 5) {
      showCategoryLimitNotice();
      return;
    }

    const category = categories.find((item) => item.id === categoryId);

    if (!category) {
      setErrorMessage(
        'No pudimos encontrar los datos de esta categoría. Intenta buscarla nuevamente.',
      );
      return;
    }

    setCategoryIds((currentCategoryIds) => [
      ...currentCategoryIds,
      categoryId,
    ]);
    setCategoryDetailsById((currentCategoriesById) => ({
      ...currentCategoriesById,
      [category.id]: category,
    }));
    clearFieldError('categories');
    setErrorMessage(null);
  }, [
    categories,
    categoryIds,
    clearFieldError,
    showCategoryLimitNotice,
  ]);

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
    const normalizedCity = city.trim();
    const normalizedAddress = optionalText(address);
    const normalizedPhoneNumber = optionalText(phoneNumber);
    const normalizedPublicEmail = optionalText(publicEmail);

    const nextFieldErrors: Partial<Record<
      'displayName' | 'description' | 'city' | 'categories' | 'modalities',
      string
    >> = {};

    if (!normalizedDisplayName) {
      nextFieldErrors.displayName = 'Escribe el nombre del negocio.';
    }

    if (!normalizedDescription) {
      nextFieldErrors.description = (
        'Escribe una descripción del negocio.'
      );
    }

    if (!normalizedCity) {
      nextFieldErrors.city = 'Escribe la ciudad del negocio.';
    }

    if (categoryIds.length === 0) {
      nextFieldErrors.categories = (
        'Selecciona al menos una categoría.'
      );
    }

    if (modalities.length === 0) {
      nextFieldErrors.modalities = (
        'Selecciona al menos una modalidad.'
      );
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    if (
      normalizedPhoneNumber
      && !phoneDialCode.trim()
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
      const credentials = logo
        ? await getValidSessionCredentials()
        : null;

      if (logo && !credentials) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const uploadedLogo = (
        logo && credentials
          ? await uploadCommercialLogo(credentials, logo)
          : null
      );

      const response = await updateOwnedCommercialProfile(
        profile.id,
        {
          offer_type: offerType,
          category_ids: categoryIds,
          display_name: normalizedDisplayName,
          description: normalizedDescription,
          country_code: countryCode.trim().toUpperCase(),
          city: normalizedCity,
          address: normalizedAddress,
          neighborhood: optionalText(neighborhood),
          location_reference: optionalText(locationReference),
          is_address_public: isAddressPublic,
          phone_dial_code: normalizedPhoneNumber
            ? phoneDialCode.trim()
            : null,
          phone_number: normalizedPhoneNumber,
          is_phone_public: isPhonePublic,
          public_email: normalizedPublicEmail,
          is_email_public: isEmailPublic,
          logo_file_id: uploadedLogo
            ? uploadedLogo.id
            : profile.logo_file_id,
          modalities,
          hours: profile.hours,
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
    categoryIds,
    city,
    countryCode,
    description,
    displayName,
    isAddressPublic,
    isEmailPublic,
    isPhonePublic,
    locationReference,
    logo,
    modalities,
    neighborhood,
    offerType,
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
        <>
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
            Editar negocio
          </Text>

          <Text
            style={{
              color: '#786593',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 6,
            }}
          >
            Actualiza la información pública y operativa de tu negocio.
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
            disabled={isSaving}
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
              opacity: isSaving ? 0.55 : 1,
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
            ) : profile.logo_file_id ? (
              <CommercialLogoAvatar
                displayName={profile.display_name}
                logoFileId={profile.logo_file_id}
                size={50}
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
                  : profile.logo_file_id
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
                  : profile.logo_file_id
                    ? 'Logo actual cargado · toca para cambiarlo'
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
                  disabled={isSaving}
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
                    opacity: isSaving ? 0.55 : 1,
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
            Información principal
          </Text>

          <TextInput
            accessibilityLabel="Nombre del negocio"
            editable={!isSaving}
            onChangeText={(value) => {
              setDisplayName(value);
              clearFieldError('displayName');
            }}
            placeholder="Nombre del negocio"
            placeholderTextColor="#A692B7"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: fieldErrors.displayName
                ? '#E5484D'
                : '#DCCBEE',
              borderRadius: 13,
              borderWidth: fieldErrors.displayName ? 2 : 1,
              color: '#261743',
              fontSize: 14,
              marginTop: 10,
              minHeight: 48,
              paddingHorizontal: 13,
            }}
            value={displayName}
          />

          {fieldErrors.displayName ? (
            <Text style={styles.fieldErrorText}>
              {fieldErrors.displayName}
            </Text>
          ) : null}

          <TextInput
            accessibilityLabel="Descripción del negocio"
            editable={!isSaving}
            multiline
            numberOfLines={4}
            onChangeText={(value) => {
              setDescription(value);
              clearFieldError('description');
            }}
            placeholder="Describe lo que ofreces"
            placeholderTextColor="#A692B7"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: fieldErrors.description
                ? '#E5484D'
                : '#DCCBEE',
              borderRadius: 13,
              borderWidth: fieldErrors.description ? 2 : 1,
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

          {fieldErrors.description ? (
            <Text style={styles.fieldErrorText}>
              {fieldErrors.description}
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              marginTop: 10,
            }}
          >
            <TouchableOpacity
              accessibilityHint="Abre las opciones de país disponibles"
              accessibilityLabel="Seleccionar país: Colombia"
              accessibilityRole="button"
              activeOpacity={0.82}
              disabled={isSaving}
              onPress={() => setIsCountryPickerVisible(true)}
              style={{
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                flex: 0.48,
                flexDirection: 'row',
                minHeight: 48,
                opacity: isSaving ? 0.55 : 1,
                paddingHorizontal: 12,
              }}
            >
              <ColombiaCircularFlag />

              <Text
                numberOfLines={1}
                style={{
                  color: '#261743',
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '700',
                  marginLeft: 8,
                }}
              >
                Colombia
              </Text>

              <ChevronDown
                color="#786593"
                size={18}
              />
            </TouchableOpacity>

            <TextInput
              accessibilityLabel="Ciudad"
              editable={!isSaving}
              onChangeText={(value) => {
                setCity(value);
                clearFieldError('city');
              }}
              placeholder="Ciudad"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: fieldErrors.city
                  ? '#E5484D'
                  : '#DCCBEE',
                borderRadius: 13,
                borderWidth: fieldErrors.city ? 2 : 1,
                color: '#261743',
                flex: 0.52,
                fontSize: 14,
                minHeight: 48,
                paddingHorizontal: 13,
              }}
              value={city}
            />
          </View>

          {fieldErrors.city ? (
            <Text style={styles.fieldErrorText}>
              {fieldErrors.city}
            </Text>
          ) : null}

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
                  disabled={isSaving}
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
                    opacity: isSaving ? 0.55 : 1,
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

          {fieldErrors.modalities ? (
            <Text style={styles.fieldErrorText}>
              {fieldErrors.modalities}
            </Text>
          ) : null}

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
              onChangeText={(value) => {
                setPhoneNumber(value);

                if (!optionalText(value)) {
                  setIsPhonePublic(false);
                }
              }}
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
              disabled={
                isSaving
                || !optionalText(phoneNumber)
              }
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
            onChangeText={(value) => {
              setPublicEmail(value);

              if (!optionalText(value)) {
                setIsEmailPublic(false);
              }
            }}
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
              disabled={
                isSaving
                || !optionalText(publicEmail)
              }
              onValueChange={setIsEmailPublic}
              value={isEmailPublic}
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
            Categorías o actividad
          </Text>

          {categoryIds.length > 0 ? (
            <View
              style={{
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  color: '#786593',
                  fontSize: 12,
                  fontWeight: '700',
                  marginBottom: 8,
                }}
              >
                {`Categorías seleccionadas (${categoryIds.length}/5)`}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {selectedCategories.map((category) => (
                  <TouchableOpacity
                    accessibilityLabel={`Quitar categoría ${category.name}`}
                    accessibilityRole="button"
                    activeOpacity={0.82}
                    disabled={isSaving}
                    key={category.id}
                    onPress={() => toggleCategory(category.id)}
                    style={{
                      alignItems: 'center',
                      backgroundColor: '#EBDCFD',
                      borderColor: '#7427D5',
                      borderRadius: 99,
                      borderWidth: 1,
                      flexDirection: 'row',
                      opacity: isSaving ? 0.55 : 1,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Check
                      color="#54209E"
                      size={14}
                    />

                    <Text
                      style={{
                        color: '#54209E',
                        fontSize: 12,
                        fontWeight: '700',
                        marginLeft: 5,
                      }}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <TextInput
            accessibilityLabel="Buscar categoría"
            editable={!isSaving}
            onChangeText={setCategorySearchQuery}
            placeholder="Busca una categoría"
            placeholderTextColor="#A692B7"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: fieldErrors.categories
                ? '#E5484D'
                : '#DCCBEE',
              borderRadius: 13,
              borderWidth: fieldErrors.categories ? 2 : 1,
              color: '#261743',
              fontSize: 14,
              marginTop: 12,
              minHeight: 48,
              paddingHorizontal: 13,
            }}
            value={categorySearchQuery}
          />

          {fieldErrors.categories ? (
            <Text style={styles.fieldErrorText}>
              {fieldErrors.categories}
            </Text>
          ) : null}

          {categoryLimitNotice ? (
            <View style={styles.categoryLimitNotice}>
              <Text style={styles.categoryLimitNoticeText}>
                {categoryLimitNotice}
              </Text>
            </View>
          ) : null}

          {isCategoriesLoading ? (
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                marginTop: 11,
              }}
            >
              <ActivityIndicator
                color="#7427D5"
                size="small"
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
              {recommendedCategories.map((category) => (
                <TouchableOpacity
                  accessibilityLabel={`Agregar categoría ${category.name}`}
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  disabled={isSaving || categoryIds.length >= 5}
                  key={category.id}
                  onPress={() => toggleCategory(category.id)}
                  style={{
                    alignItems: 'center',
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DCCBEE',
                    borderRadius: 99,
                    borderWidth: 1,
                    flexDirection: 'row',
                    opacity: (
                      isSaving || categoryIds.length >= 5
                        ? 0.55
                        : 1
                    ),
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      color: '#4E3B68',
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {recommendedCategories.length === 0
          && normalizedCategorySearchQuery.length >= 2
          && !isCategoriesLoading ? (
            <Text
              style={{
                color: '#786593',
                fontSize: 12,
                lineHeight: 18,
                marginTop: 10,
              }}
            >
              No encontramos categorías con esa búsqueda.
            </Text>
          ) : null}

          <Text
            style={{
              color: '#786593',
              fontSize: 12,
              lineHeight: 18,
              marginTop: 6,
            }}
          >
            {normalizedCategorySearchQuery.length === 0
              ? 'Elige una sugerencia o escribe al menos 2 letras para buscar.'
              : normalizedCategorySearchQuery.length === 1
                ? 'Escribe una letra más para buscar categorías.'
                : 'Puedes agregar o quitar categorías existentes.'}
          </Text>

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

        <Modal
          animationType="slide"
          onRequestClose={() => setIsCountryPickerVisible(false)}
          transparent
          visible={isCountryPickerVisible}
        >
          <Pressable
            onPress={() => setIsCountryPickerVisible(false)}
            style={styles.countryModalBackdrop}
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={styles.countryModalSheet}
            >
              <View style={styles.countryModalHeader}>
                <Text style={styles.countryModalTitle}>
                  Selecciona un país
                </Text>

                <TouchableOpacity
                  accessibilityLabel="Cerrar selector de país"
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => setIsCountryPickerVisible(false)}
                  style={styles.countryModalCloseButton}
                >
                  <X
                    color="#523C70"
                    size={21}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                accessibilityLabel="Colombia"
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={() => {
                  setCountryCode('CO');
                  setIsCountryPickerVisible(false);
                }}
                style={styles.countryOption}
              >
                <ColombiaCircularFlag size={24} />

                <Text style={styles.countryOptionText}>
                  Colombia
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
          </Modal>
        </>
      ) : null}
    </ScreenSafeArea>
  );
}


function ColombiaCircularFlag({
  size = 18,
}: {
  size?: number;
}) {
  return (
    <View
      style={[
        styles.colombiaFlag,
        {
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      <View
        style={[
          styles.colombiaFlagYellow,
          {
            height: size / 2,
          },
        ]}
      />

      <View
        style={[
          styles.colombiaFlagBlue,
          {
            height: size / 4,
          },
        ]}
      />

      <View
        style={[
          styles.colombiaFlagRed,
          {
            height: size / 4,
          },
        ]}
      />

      <View
        style={[
          styles.colombiaFlagBorder,
          {
            borderRadius: size / 2,
            height: size,
            width: size,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldErrorText: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  categoryLimitNotice: {
    backgroundColor: '#FFF4D8',
    borderColor: '#E7A12B',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  categoryLimitNoticeText: {
    color: '#8A5200',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  colombiaFlag: {
    backgroundColor: '#FCD116',
    overflow: 'hidden',
  },
  colombiaFlagYellow: {
    backgroundColor: '#FCD116',
    width: '100%',
  },
  colombiaFlagBlue: {
    backgroundColor: '#003893',
    width: '100%',
  },
  colombiaFlagRed: {
    backgroundColor: '#CE1126',
    width: '100%',
  },
  colombiaFlagBorder: {
    borderColor: 'rgba(38, 23, 67, 0.16)',
    borderWidth: 1,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  countryModalBackdrop: {
    backgroundColor: 'rgba(24, 11, 49, 0.44)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  countryModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 28,
  },
  countryModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  countryModalTitle: {
    color: '#261743',
    fontSize: 18,
    fontWeight: '900',
  },
  countryModalCloseButton: {
    alignItems: 'center',
    backgroundColor: '#F4EDF9',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  countryOption: {
    alignItems: 'center',
    borderBottomColor: '#EEE7F4',
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginTop: 16,
    minHeight: 58,
    paddingHorizontal: 20,
  },
  countryOptionText: {
    color: '#261743',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
});
