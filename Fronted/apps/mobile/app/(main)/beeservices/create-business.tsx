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
  LoaderCircle,
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

function normalizeCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
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
    false,
  );
  const [categoriesError, setCategoriesError] = useState<
    string | null
  >(null);

  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [newCategoryNames, setNewCategoryNames] = useState<
    string[]
  >([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
const latestCategorySearchRequestRef = useRef(0);
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

  const normalizedCategorySearchQuery = useMemo(
    () => categorySearchQuery.trim().toLocaleLowerCase('es-CO'),
    [categorySearchQuery],
  );

  const normalizedNewCategoryName = useMemo(
    () => normalizeCategoryName(categorySearchQuery),
    [categorySearchQuery],
  );

  const selectedCategories = useMemo(
    () => categories.filter((category) => (
      categoryIds.includes(category.id)
    )),
    [categories, categoryIds],
  );

  const filteredCategories = useMemo(
() => categories.filter((category) => (
category.name.toLocaleLowerCase("es-CO").includes(
normalizedCategorySearchQuery,
)
)),
[
categories,
normalizedCategorySearchQuery,
],
);

const totalSelectedCategories = (
    categoryIds.length + newCategoryNames.length
  );
  const canAddCategory = totalSelectedCategories < 5;

  const hasExistingCategoryMatch = useMemo(
    () => categories.some((category) => (
      category.name.toLocaleLowerCase('es-CO')
      === normalizedNewCategoryName.toLocaleLowerCase('es-CO')
    )),
    [categories, normalizedNewCategoryName],
  );

  const hasTemporaryCategoryMatch = useMemo(
    () => newCategoryNames.some((categoryName) => (
      categoryName.toLocaleLowerCase('es-CO')
      === normalizedNewCategoryName.toLocaleLowerCase('es-CO')
    )),
    [newCategoryNames, normalizedNewCategoryName],
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
    normalizedCategorySearchQuery,
    offerType,
  ]);

  useEffect(() => {
    if (offerType === 'mixed') {
      setNewCategoryNames([]);
    }
  }, [offerType]);

  useEffect(() => {
    setCategoryIds((currentCategoryIds) => (
      currentCategoryIds.filter((categoryId) => {
        const category = categories.find(
          (item) => item.id === categoryId,
        );

        if (!category) {
          return true;
        }

        return (
          offerType === 'mixed'
          || category.offer_type === offerType
          || category.offer_type === 'mixed'
        );
      })
    ));
  }, [
    categories,
    offerType,
  ]);

  const selectLogo = useCallback(async () => {
    setFormError(null);

    const permission = (
      await ImagePicker.requestMediaLibraryPermissionsAsync()
    );

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

  const toggleCategory = useCallback((
    categoryId: string,
  ) => {
    setCategoryIds((currentCategoryIds) => {
      if (currentCategoryIds.includes(categoryId)) {
        return currentCategoryIds.filter(
          (value) => value !== categoryId,
        );
      }

      if (
        currentCategoryIds.length + newCategoryNames.length
        >= 5
      ) {
        setFormError(
          'Puedes seleccionar o agregar hasta 5 categorías.',
        );
        return currentCategoryIds;
      }

      setFormError(null);

      return [...currentCategoryIds, categoryId];
    });
  }, [newCategoryNames.length]);

  const removeTemporaryCategory = useCallback((
    categoryName: string,
  ) => {
    setNewCategoryNames((currentCategoryNames) => (
      currentCategoryNames.filter(
        (value) => value !== categoryName,
      )
    ));
    setFormError(null);
  }, []);

  const addTemporaryCategory = useCallback(() => {
    if (offerType === 'mixed') {
      setFormError(
        'No se pueden crear categorías nuevas para Servicios y productos.',
      );
      return;
    }

    if (!normalizedNewCategoryName) {
      setFormError('Escribe el nombre de la categoría.');
      return;
    }

    if (!canAddCategory) {
      setFormError(
        'Puedes seleccionar o agregar hasta 5 categorías.',
      );
      return;
    }

    if (hasExistingCategoryMatch) {
      setFormError(
        'Esta categoría ya existe. Selecciónala en los resultados.',
      );
      return;
    }

    if (hasTemporaryCategoryMatch) {
      setFormError(
        'Esta categoría ya fue agregada temporalmente.',
      );
      return;
    }

    setNewCategoryNames((currentCategoryNames) => [
      ...currentCategoryNames,
      normalizedNewCategoryName,
    ]);
    setCategorySearchQuery('');
    setFormError(null);
  }, [
    canAddCategory,
    hasExistingCategoryMatch,
    hasTemporaryCategoryMatch,
    normalizedNewCategoryName,
    offerType,
  ]);

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

    if (
      categoryIds.length === 0
      && newCategoryNames.length === 0
    ) {
      setFormError(
        'Selecciona o crea al menos una categoría.',
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
        category_ids: categoryIds,
        new_category_names: newCategoryNames,
        custom_activity_text: null,
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
    categoryIds,
    city,
    countryCode,
    description,
    displayName,
    isAddressPublic,
    isEmailPublic,
    isPhonePublic,
    logo,
    locationReference,
    modalities,
    neighborhood,
    newCategoryNames,
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
          {'\n'}
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
          Categorías o actividad
        </Text>

        {totalSelectedCategories > 0 ? (
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
              {`Categorías seleccionadas (${totalSelectedCategories}/5)`}
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
                  disabled={isSubmitting}
                  key={category.id}
                  onPress={() => toggleCategory(category.id)}
                  style={{
                    alignItems: 'center',
                    backgroundColor: '#EBDCFD',
                    borderColor: '#7427D5',
                    borderRadius: 99,
                    borderWidth: 1,
                    flexDirection: 'row',
                    opacity: isSubmitting ? 0.55 : 1,
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

              {newCategoryNames.map((categoryName) => (
                <TouchableOpacity
                  accessibilityLabel={
                    `Quitar categoría nueva ${categoryName}`
                  }
                  accessibilityRole="button"
                  activeOpacity={0.82}
                  disabled={isSubmitting}
                  key={`new-${categoryName}`}
                  onPress={() => removeTemporaryCategory(categoryName)}
                  style={{
                    alignItems: 'center',
                    backgroundColor: '#FFF4D8',
                    borderColor: '#E7A12B',
                    borderRadius: 99,
                    borderWidth: 1,
                    flexDirection: 'row',
                    opacity: isSubmitting ? 0.55 : 1,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Check
                    color="#9A5A00"
                    size={14}
                  />

                  <Text
                    style={{
                      color: '#8A5200',
                      fontSize: 12,
                      fontWeight: '700',
                      marginLeft: 5,
                    }}
                  >
                    {`${categoryName} · Nueva`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <TextInput
          accessibilityLabel="Buscar categoría"
          editable={!isSubmitting}
          onChangeText={setCategorySearchQuery}
          placeholder={
            offerType === 'mixed'
              ? 'Busca una categoría'
              : 'Busca una categoría o escribe una nueva'
          }
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
          value={categorySearchQuery}
        />

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
          <>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 10,
              }}
            >
              {filteredCategories.map((category) => {
                const isSelected = categoryIds.includes(category.id);

                return (
                  <TouchableOpacity
                    accessibilityLabel={`Categoría: ${category.name}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: isSelected,
                    }}
                    activeOpacity={0.82}
                    disabled={isSubmitting}
                    key={category.id}
                    onPress={() => toggleCategory(category.id)}
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
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {offerType !== 'mixed'
              && normalizedNewCategoryName
              && !hasExistingCategoryMatch
              && !hasTemporaryCategoryMatch ? (
              <TouchableOpacity
                accessibilityLabel={
                  `Agregar nueva categoría ${normalizedNewCategoryName}`
                }
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSubmitting || !canAddCategory}
                onPress={addTemporaryCategory}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#FFF8E8',
                  borderColor: '#E7A12B',
                  borderRadius: 13,
                  borderWidth: 1,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginTop: 10,
                  minHeight: 46,
                  opacity: (
                    isSubmitting || !canAddCategory
                      ? 0.55
                      : 1
                  ),
                  paddingHorizontal: 13,
                }}
              >
                <Text
                  style={{
                    color: '#8A5200',
                    fontSize: 13,
                    fontWeight: '800',
                  }}
                >
                  {`Agregar categoría “${normalizedNewCategoryName}”`}
                </Text>
              </TouchableOpacity>
            ) : null}

            {filteredCategories.length === 0
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
          </>
        )}

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
: 'Las categorías nuevas se guardarán únicamente al crear el negocio.'}
        </Text>

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
          <TouchableOpacity
            accessibilityHint="Abre las opciones de país disponibles"
            accessibilityLabel="Seleccionar país: Colombia"
            accessibilityRole="button"
            activeOpacity={0.82}
            disabled={isSubmitting}
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
              opacity: isSubmitting ? 0.55 : 1,
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
              flex: 0.52,
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
    borderBottomColor: '#F0EAF3',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  countryModalTitle: {
    color: '#261743',
    fontSize: 17,
    fontWeight: '800',
  },
  countryModalCloseButton: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  countryOption: {
    alignItems: 'center',
    borderBottomColor: '#F3EEF6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 20,
  },
  countryOptionText: {
    color: '#38294E',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
  },
});
