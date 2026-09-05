import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Archive,
  CreditCard,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  Save,
  ShieldAlert,
  X,
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
  CommercialOwnedPaymentMethod,
  CommercialPaymentMethodType,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../../../src/components/layout/ScreenSafeArea';
import {
  toCommercialUiError,
} from '../../../../../src/features/buddyservices/commercialErrors';
import {
  archiveOwnedPaymentMethod,
  createOwnedPaymentMethod,
  loadOwnedPaymentMethods,
  updateOwnedPaymentMethod,
} from '../../../../../src/services/commercialService';

type PaymentMethodEditorState = {
  method: CommercialOwnedPaymentMethod | null;
  paymentMethodType: CommercialPaymentMethodType;
  displayName: string;
  publicDetailsText: string;
  privateDetailsText: string;
  publicInstructions: string;
  privateInstructions: string;
  availableBeforeAcceptance: boolean;
  sortOrder: string;
  isActive: boolean;
} | null;

type ArchiveConfirmation = {
  method: CommercialOwnedPaymentMethod;
} | null;

const PAYMENT_METHOD_TYPES: Array<{
  value: CommercialPaymentMethodType;
  label: string;
}> = [
  {
    value: 'nequi',
    label: 'Nequi',
  },
  {
    value: 'daviplata',
    label: 'Daviplata',
  },
  {
    value: 'breb',
    label: 'Bre-B',
  },
  {
    value: 'bank_account',
    label: 'Cuenta bancaria',
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

function prettyJson(
  value: Record<string, unknown>,
): string {
  return JSON.stringify(value || {}, null, 2);
}

function parseJsonObject(
  value: string,
  label: string,
): Record<string, unknown> {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return {};
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(normalizedValue);
  } catch {
    throw new Error(`${label} debe ser un objeto JSON válido.`);
  }

  if (
    !parsedValue
    || typeof parsedValue !== 'object'
    || Array.isArray(parsedValue)
  ) {
    throw new Error(`${label} debe ser un objeto JSON.`);
  }

  return parsedValue as Record<string, unknown>;
}

function createPaymentMethodEditor(): PaymentMethodEditorState {
  return {
    method: null,
    paymentMethodType: 'nequi',
    displayName: '',
    publicDetailsText: '{}',
    privateDetailsText: '{}',
    publicInstructions: '',
    privateInstructions: '',
    availableBeforeAcceptance: false,
    sortOrder: '0',
    isActive: true,
  };
}

function editPaymentMethodEditor(
  method: CommercialOwnedPaymentMethod,
): PaymentMethodEditorState {
  return {
    method,
    paymentMethodType: method.payment_method_type,
    displayName: method.display_name,
    publicDetailsText: prettyJson(method.public_details),
    privateDetailsText: prettyJson(method.private_details),
    publicInstructions: method.public_instructions || '',
    privateInstructions: method.private_instructions || '',
    availableBeforeAcceptance: method.available_before_acceptance,
    sortOrder: String(method.sort_order),
    isActive: method.status === 'active',
  };
}

function typeLabel(
  type: CommercialPaymentMethodType,
): string {
  return PAYMENT_METHOD_TYPES.find(
    (item) => item.value === type,
  )?.label || type;
}

export default function BuddyServicesPaymentMethodsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    businessId?: string | string[];
  }>();

  const businessId = normalizeBusinessId(params.businessId);

  const [methods, setMethods] = useState<
    CommercialOwnedPaymentMethod[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);
  const [editor, setEditor] = useState<
    PaymentMethodEditorState
  >(null);
  const [editorError, setEditorError] = useState<
    string | null
  >(null);
  const [archiveConfirmation, setArchiveConfirmation] = useState<
    ArchiveConfirmation
  >(null);
  const [showPrivateValues, setShowPrivateValues] = useState(false);

  const loadMethods = useCallback(async () => {
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
      const response = await loadOwnedPaymentMethods(
        businessId,
        {
          include_archived: false,
        },
      );

      setMethods(response.payment_methods);
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setMethods([]);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void loadMethods();
  }, [loadMethods]);

  const closeEditor = useCallback(() => {
    if (isSaving) {
      return;
    }

    setEditor(null);
    setEditorError(null);
    setShowPrivateValues(false);
  }, [isSaving]);

  const saveMethod = useCallback(async () => {
    if (!editor || !businessId) {
      return;
    }

    const normalizedDisplayName = editor.displayName.trim();
    const parsedSortOrder = Number(editor.sortOrder.trim());

    if (!normalizedDisplayName) {
      setEditorError('Escribe el nombre visible del método.');
      return;
    }

    if (
      !Number.isInteger(parsedSortOrder)
      || parsedSortOrder < 0
    ) {
      setEditorError(
        'El orden debe ser un número entero igual o mayor que cero.',
      );
      return;
    }

    let publicDetails: Record<string, unknown>;
    let privateDetails: Record<string, unknown>;

    try {
      publicDetails = parseJsonObject(
        editor.publicDetailsText,
        'Los detalles públicos',
      );
      privateDetails = parseJsonObject(
        editor.privateDetailsText,
        'Los detalles privados',
      );
    } catch (error) {
      setEditorError(
        error instanceof Error
          ? error.message
          : 'Revisa el JSON de los detalles.',
      );
      return;
    }

    const normalizedPrivateInstructions = (
      editor.privateInstructions.trim() || null
    );

    if (
      Object.keys(privateDetails).length === 0
      && !normalizedPrivateInstructions
    ) {
      setEditorError(
        'Agrega detalles privados o instrucciones privadas del pago.',
      );
      return;
    }

    setIsSaving(true);
    setEditorError(null);

    try {
      if (editor.method) {
        await updateOwnedPaymentMethod(
          businessId,
          editor.method.id,
          {
            display_name: normalizedDisplayName,
            public_details: publicDetails,
            private_details: privateDetails,
            public_instructions: (
              editor.publicInstructions.trim() || null
            ),
            private_instructions: normalizedPrivateInstructions,
            available_before_acceptance: (
              editor.availableBeforeAcceptance
            ),
            sort_order: parsedSortOrder,
            is_active: editor.isActive,
          },
        );
      } else {
        await createOwnedPaymentMethod(
          businessId,
          {
            payment_method_type: editor.paymentMethodType,
            display_name: normalizedDisplayName,
            public_details: publicDetails,
            private_details: privateDetails,
            public_instructions: (
              editor.publicInstructions.trim() || null
            ),
            private_instructions: normalizedPrivateInstructions,
            available_before_acceptance: (
              editor.availableBeforeAcceptance
            ),
            sort_order: parsedSortOrder,
            is_active: editor.isActive,
          },
        );
      }

      closeEditor();
      await loadMethods();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setEditorError(uiError.message);
    } finally {
      setIsSaving(false);
    }
  }, [
    businessId,
    closeEditor,
    editor,
    loadMethods,
  ]);

  const archiveMethod = useCallback(async () => {
    if (!archiveConfirmation || !businessId) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await archiveOwnedPaymentMethod(
        businessId,
        archiveConfirmation.method.id,
      );

      setArchiveConfirmation(null);
      await loadMethods();
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
      setArchiveConfirmation(null);
    } finally {
      setIsSaving(false);
    }
  }, [
    archiveConfirmation,
    businessId,
    loadMethods,
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
          Métodos de pago
        </Text>

        <TouchableOpacity
          accessibilityLabel="Crear método de pago"
          accessibilityRole="button"
          activeOpacity={0.82}
          disabled={isLoading || isSaving}
          onPress={() => {
            setEditorError(null);
            setShowPrivateValues(false);
            setEditor(createPaymentMethodEditor());
          }}
          style={{
            alignItems: 'center',
            backgroundColor: '#7427D5',
            borderRadius: 14,
            height: 42,
            justifyContent: 'center',
            opacity: isLoading || isSaving ? 0.55 : 1,
            width: 42,
          }}
        >
          <Plus
            color="#FFFFFF"
            size={21}
          />
        </TouchableOpacity>
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
            Cargando métodos de pago…
          </Text>
        </View>
      ) : errorMessage ? (
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 30,
          }}
        >
          <ShieldAlert
            color="#B42318"
            size={34}
          />

          <Text
            style={{
              color: '#261743',
              fontSize: 19,
              fontWeight: '800',
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            No fue posible cargar los métodos
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
            accessibilityLabel="Reintentar cargar métodos de pago"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => {
              void loadMethods();
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
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: 38,
            paddingHorizontal: 18,
            paddingTop: 22,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor: '#FFF4DE',
              borderColor: '#F3D6A3',
              borderRadius: 15,
              borderWidth: 1,
              padding: 14,
            }}
          >
            <Text
              style={{
                color: '#704900',
                fontSize: 13,
                fontWeight: '900',
              }}
            >
              Información privada
            </Text>

            <Text
              style={{
                color: '#704900',
                fontSize: 12,
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              Los datos privados solo se muestran aquí al
              owner del negocio y no se comparten públicamente.
            </Text>
          </View>

          {methods.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                paddingHorizontal: 28,
                paddingTop: 70,
              }}
            >
              <CreditCard
                color="#7427D5"
                size={32}
              />

              <Text
                style={{
                  color: '#261743',
                  fontSize: 18,
                  fontWeight: '800',
                  marginTop: 16,
                  textAlign: 'center',
                }}
              >
                Aún no tienes métodos de pago
              </Text>

              <TouchableOpacity
                accessibilityLabel="Crear primer método de pago"
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={() => {
                  setEditorError(null);
                  setShowPrivateValues(false);
                  setEditor(createPaymentMethodEditor());
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#7427D5',
                  borderRadius: 14,
                  flexDirection: 'row',
                  marginTop: 22,
                  minHeight: 46,
                  paddingHorizontal: 16,
                }}
              >
                <Plus
                  color="#FFFFFF"
                  size={18}
                />

                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '800',
                    marginLeft: 8,
                  }}
                >
                  Crear método
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={{
                marginTop: 16,
              }}
            >
              {methods.map((method) => (
                <View
                  key={method.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E7DDF2',
                    borderRadius: 16,
                    borderWidth: 1,
                    marginBottom: 11,
                    padding: 14,
                  }}
                >
                  <View
                    style={{
                      alignItems: 'flex-start',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        paddingRight: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: '#261743',
                          fontSize: 16,
                          fontWeight: '800',
                        }}
                      >
                        {method.display_name}
                      </Text>

                      <Text
                        style={{
                          color: '#786593',
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        {typeLabel(method.payment_method_type)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      accessibilityLabel={`Editar ${method.display_name}`}
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      disabled={isSaving}
                      onPress={() => {
                        setEditorError(null);
                        setShowPrivateValues(false);
                        setEditor(editPaymentMethodEditor(method));
                      }}
                      style={{
                        alignItems: 'center',
                        backgroundColor: '#F6EAFE',
                        borderRadius: 12,
                        height: 38,
                        justifyContent: 'center',
                        opacity: isSaving ? 0.55 : 1,
                        width: 38,
                      }}
                    >
                      <Edit3
                        color="#7427D5"
                        size={18}
                      />
                    </TouchableOpacity>
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
                        color: method.status === 'active'
                          ? '#177245'
                          : '#6D6875',
                        fontSize: 12,
                        fontWeight: '800',
                      }}
                    >
                      {method.status === 'active'
                        ? 'Activo'
                        : 'Archivado'}
                    </Text>

                    <TouchableOpacity
                      accessibilityLabel={`Archivar ${method.display_name}`}
                      accessibilityRole="button"
                      activeOpacity={0.82}
                      disabled={isSaving}
                      onPress={() => {
                        setArchiveConfirmation({
                          method,
                        });
                      }}
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        opacity: isSaving ? 0.55 : 1,
                      }}
                    >
                      <Archive
                        color="#B42318"
                        size={15}
                      />

                      <Text
                        style={{
                          color: '#B42318',
                          fontSize: 12,
                          fontWeight: '800',
                          marginLeft: 6,
                        }}
                      >
                        Archivar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        animationType="slide"
        onRequestClose={closeEditor}
        transparent
        visible={Boolean(editor)}
      >
        <View
          style={{
            backgroundColor: 'rgba(38, 23, 67, 0.38)',
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          <ScrollView
            contentContainerStyle={{
              backgroundColor: '#FFFCF9',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 30,
              paddingHorizontal: 18,
              paddingTop: 18,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  color: '#261743',
                  fontSize: 19,
                  fontWeight: '900',
                }}
              >
                {editor?.method
                  ? 'Editar método'
                  : 'Crear método'}
              </Text>

              <TouchableOpacity
                accessibilityLabel="Cerrar formulario de pago"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={closeEditor}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F4EDF9',
                  borderRadius: 13,
                  height: 38,
                  justifyContent: 'center',
                  opacity: isSaving ? 0.55 : 1,
                  width: 38,
                }}
              >
                <X
                  color="#3D245E"
                  size={19}
                />
              </TouchableOpacity>
            </View>

            {editorError ? (
              <View
                style={{
                  backgroundColor: '#FFF0F0',
                  borderColor: '#F7B2B2',
                  borderRadius: 13,
                  borderWidth: 1,
                  marginTop: 16,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    color: '#B42318',
                    fontSize: 13,
                    lineHeight: 19,
                  }}
                >
                  {editorError}
                </Text>
              </View>
            ) : null}

            {!editor?.method ? (
              <>
                <Text
                  style={{
                    color: '#261743',
                    fontSize: 14,
                    fontWeight: '800',
                    marginTop: 18,
                  }}
                >
                  Tipo
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 9,
                  }}
                >
                  {PAYMENT_METHOD_TYPES.map((option) => {
                    const isSelected = (
                      editor?.paymentMethodType === option.value
                    );

                    return (
                      <TouchableOpacity
                        accessibilityLabel={`Tipo ${option.label}`}
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={isSaving}
                        key={option.value}
                        onPress={() => {
                          setEditor((currentEditor) => (
                            currentEditor
                              ? {
                                ...currentEditor,
                                paymentMethodType: option.value,
                              }
                              : currentEditor
                          ));
                        }}
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
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected
                              ? '#FFFFFF'
                              : '#4E3B68',
                            fontSize: 12,
                            fontWeight: '800',
                          }}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}

            <TextInput
              accessibilityLabel="Nombre visible del método de pago"
              editable={!isSaving}
              onChangeText={(value) => {
                setEditor((currentEditor) => (
                  currentEditor
                    ? {
                      ...currentEditor,
                      displayName: value,
                    }
                    : currentEditor
                ));
              }}
              placeholder="Ejemplo: Nequi principal"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                color: '#261743',
                fontSize: 14,
                marginTop: 18,
                minHeight: 48,
                paddingHorizontal: 13,
              }}
              value={editor?.displayName || ''}
            />

            <Text
              style={{
                color: '#261743',
                fontSize: 14,
                fontWeight: '800',
                marginTop: 20,
              }}
            >
              Detalles públicos JSON
            </Text>

            <TextInput
              accessibilityLabel="Detalles públicos JSON"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSaving}
              multiline
              onChangeText={(value) => {
                setEditor((currentEditor) => (
                  currentEditor
                    ? {
                      ...currentEditor,
                      publicDetailsText: value,
                    }
                    : currentEditor
                ));
              }}
              placeholder='{"alias":"Pagos BeeApp"}'
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                color: '#261743',
                fontFamily: 'monospace',
                fontSize: 13,
                marginTop: 9,
                minHeight: 82,
                paddingHorizontal: 13,
                paddingTop: 12,
                textAlignVertical: 'top',
              }}
              value={editor?.publicDetailsText || ''}
            />

            <TextInput
              accessibilityLabel="Instrucciones públicas"
              editable={!isSaving}
              multiline
              onChangeText={(value) => {
                setEditor((currentEditor) => (
                  currentEditor
                    ? {
                      ...currentEditor,
                      publicInstructions: value,
                    }
                    : currentEditor
                ));
              }}
              placeholder="Instrucciones públicas opcionales"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                color: '#261743',
                fontSize: 14,
                marginTop: 10,
                minHeight: 76,
                paddingHorizontal: 13,
                paddingTop: 12,
                textAlignVertical: 'top',
              }}
              value={editor?.publicInstructions || ''}
            />

            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 21,
              }}
            >
              <Text
                style={{
                  color: '#261743',
                  fontSize: 14,
                  fontWeight: '900',
                }}
              >
                Datos privados
              </Text>

              <TouchableOpacity
                accessibilityLabel={
                  showPrivateValues
                    ? 'Ocultar datos privados'
                    : 'Mostrar datos privados'
                }
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={() => {
                  setShowPrivateValues((currentValue) => (
                    !currentValue
                  ));
                }}
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                }}
              >
                {showPrivateValues ? (
                  <EyeOff
                    color="#7427D5"
                    size={16}
                  />
                ) : (
                  <Eye
                    color="#7427D5"
                    size={16}
                  />
                )}

                <Text
                  style={{
                    color: '#54209E',
                    fontSize: 12,
                    fontWeight: '800',
                    marginLeft: 6,
                  }}
                >
                  {showPrivateValues
                    ? 'Ocultar'
                    : 'Mostrar'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={{
                color: '#786593',
                fontSize: 12,
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              Solo visible dentro de esta administración autorizada.
            </Text>

            {showPrivateValues ? (
              <>
                <TextInput
                  accessibilityLabel="Detalles privados JSON"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSaving}
                  multiline
                  onChangeText={(value) => {
                    setEditor((currentEditor) => (
                      currentEditor
                        ? {
                          ...currentEditor,
                          privateDetailsText: value,
                        }
                        : currentEditor
                    ));
                  }}
                  placeholder='{"numero":"3000000000"}'
                  placeholderTextColor="#A692B7"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DCCBEE',
                    borderRadius: 13,
                    borderWidth: 1,
                    color: '#261743',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    marginTop: 10,
                    minHeight: 92,
                    paddingHorizontal: 13,
                    paddingTop: 12,
                    textAlignVertical: 'top',
                  }}
                  value={editor?.privateDetailsText || ''}
                />

                <TextInput
                  accessibilityLabel="Instrucciones privadas"
                  editable={!isSaving}
                  multiline
                  onChangeText={(value) => {
                    setEditor((currentEditor) => (
                      currentEditor
                        ? {
                          ...currentEditor,
                          privateInstructions: value,
                        }
                        : currentEditor
                    ));
                  }}
                  placeholder="Instrucciones privadas del pago"
                  placeholderTextColor="#A692B7"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DCCBEE',
                    borderRadius: 13,
                    borderWidth: 1,
                    color: '#261743',
                    fontSize: 14,
                    marginTop: 10,
                    minHeight: 92,
                    paddingHorizontal: 13,
                    paddingTop: 12,
                    textAlignVertical: 'top',
                  }}
                  value={editor?.privateInstructions || ''}
                />
              </>
            ) : (
              <View
                style={{
                  backgroundColor: '#F6EAFE',
                  borderRadius: 13,
                  marginTop: 10,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    color: '#54209E',
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  Los detalles privados permanecen ocultos. Activa
                  Mostrar solo si necesitas editarlos.
                </Text>
              </View>
            )}

            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 20,
              }}
            >
              <Text
                style={{
                  color: '#261743',
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                Disponible antes de aceptación
              </Text>

              <Switch
                accessibilityLabel="Disponible antes de aceptación"
                disabled={isSaving}
                onValueChange={(value) => {
                  setEditor((currentEditor) => (
                    currentEditor
                      ? {
                        ...currentEditor,
                        availableBeforeAcceptance: value,
                      }
                      : currentEditor
                  ));
                }}
                value={editor?.availableBeforeAcceptance || false}
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
                Método activo
              </Text>

              <Switch
                accessibilityLabel="Método activo"
                disabled={isSaving}
                onValueChange={(value) => {
                  setEditor((currentEditor) => (
                    currentEditor
                      ? {
                        ...currentEditor,
                        isActive: value,
                      }
                      : currentEditor
                  ));
                }}
                value={editor?.isActive || false}
              />
            </View>

            <TextInput
              accessibilityLabel="Orden del método de pago"
              editable={!isSaving}
              keyboardType="number-pad"
              onChangeText={(value) => {
                setEditor((currentEditor) => (
                  currentEditor
                    ? {
                      ...currentEditor,
                      sortOrder: value,
                    }
                    : currentEditor
                ));
              }}
              placeholder="0"
              placeholderTextColor="#A692B7"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCCBEE',
                borderRadius: 13,
                borderWidth: 1,
                color: '#261743',
                fontSize: 14,
                marginTop: 14,
                minHeight: 48,
                paddingHorizontal: 13,
              }}
              value={editor?.sortOrder || ''}
            />

            <TouchableOpacity
              accessibilityLabel="Guardar método de pago"
              accessibilityRole="button"
              activeOpacity={0.82}
              disabled={isSaving}
              onPress={() => {
                void saveMethod();
              }}
              style={{
                alignItems: 'center',
                backgroundColor: '#7427D5',
                borderRadius: 15,
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 23,
                minHeight: 50,
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
                  : 'Guardar método'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          if (!isSaving) {
            setArchiveConfirmation(null);
          }
        }}
        transparent
        visible={Boolean(archiveConfirmation)}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: 'rgba(38, 23, 67, 0.42)',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFCF9',
              borderRadius: 20,
              padding: 20,
              width: '100%',
            }}
          >
            <Text
              style={{
                color: '#261743',
                fontSize: 19,
                fontWeight: '900',
              }}
            >
              Archivar método de pago
            </Text>

            <Text
              style={{
                color: '#786593',
                fontSize: 14,
                lineHeight: 21,
                marginTop: 9,
              }}
            >
              El método dejará de estar disponible para nuevas
              instrucciones de pago. Su historial se conservará.
            </Text>

            <Text
              style={{
                color: '#4E3B68',
                fontSize: 13,
                fontWeight: '700',
                marginTop: 13,
              }}
            >
              {archiveConfirmation?.method.display_name || ''}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                justifyContent: 'flex-end',
                marginTop: 22,
              }}
            >
              <TouchableOpacity
                accessibilityLabel="Cancelar archivo de método de pago"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  setArchiveConfirmation(null);
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#F4EDF9',
                  borderRadius: 12,
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: isSaving ? 0.55 : 1,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    color: '#3D245E',
                    fontSize: 13,
                    fontWeight: '800',
                  }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Confirmar archivo de método de pago"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  void archiveMethod();
                }}
                style={{
                  alignItems: 'center',
                  backgroundColor: '#B42318',
                  borderRadius: 12,
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: isSaving ? 0.55 : 1,
                  paddingHorizontal: 14,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: '800',
                  }}
                >
                  {isSaving
                    ? 'Archivando…'
                    : 'Archivar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenSafeArea>
  );
}
