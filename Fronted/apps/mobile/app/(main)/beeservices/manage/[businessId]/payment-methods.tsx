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
  Building2,
  CreditCard,
  Edit3,
  KeyRound,
  Plus,
  Save,
  ShieldAlert,
  Smartphone,
  X,
  CheckCircle2,
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
  CommercialBankAccount,
  CommercialMobilePaymentAccount,
  CommercialMobileWalletType,
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
  loadOwnedCommercialProfile,
  loadOwnedPaymentMethods,
  updateOwnedCommercialProfile,
  updateOwnedPaymentMethod,
} from '../../../../../src/services/commercialService';

type PaymentMethodEditorState = {
  method: CommercialOwnedPaymentMethod | null;
  paymentMethodType: CommercialPaymentMethodType;
  displayName: string;
  paymentKey: string;
  accountHolderName: string;
  accountHolderDocumentType: string;
  accountHolderDocumentNumber: string;
  bankName: string;
  bankAccountType: string;
  accountNumber: string;
  sortOrder: string;
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

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

function isMobileType(
  type: CommercialPaymentMethodType,
): type is CommercialMobileWalletType {
  return type === 'nequi'
    || type === 'daviplata'
    || type === 'breb';
}

function typeLabel(
  type: CommercialPaymentMethodType,
): string {
  return PAYMENT_METHOD_TYPES.find(
    (item) => item.value === type,
  )?.label || type;
}

function maskValue(value: string): string {
  const normalizedValue = String(value || '').trim();

  if (!normalizedValue) {
    return 'Sin dato';
  }

  if (normalizedValue.length <= 4) {
    return '••••';
  }

  return `•••• ${normalizedValue.slice(-4)}`;
}

function createPaymentMethodEditor(): PaymentMethodEditorState {
  return {
    method: null,
    paymentMethodType: 'nequi',
    displayName: '',
    paymentKey: '',
    accountHolderName: '',
    accountHolderDocumentType: '',
    accountHolderDocumentNumber: '',
    bankName: '',
    bankAccountType: '',
    accountNumber: '',
    sortOrder: '0',
  };
}

function editPaymentMethodEditor(
  method: CommercialOwnedPaymentMethod,
): PaymentMethodEditorState {
  const mobileAccount = method.mobile_account;
  const bankAccount = method.bank_account;

  return {
    method,
    paymentMethodType: method.payment_method_type,
    displayName: method.display_name,
    paymentKey: mobileAccount?.payment_key || '',
    accountHolderName: mobileAccount?.account_holder_name
      || bankAccount?.account_holder_name
      || '',
    accountHolderDocumentType: (
      bankAccount?.account_holder_document_type || ''
    ),
    accountHolderDocumentNumber: (
      bankAccount?.account_holder_document_number || ''
    ),
    bankName: bankAccount?.bank_name || '',
    bankAccountType: bankAccount?.account_type || '',
    accountNumber: bankAccount?.account_number || '',
    sortOrder: String(method.sort_order),
  };
}

function inputStyle(marginTop = 10) {
  return {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCCBEE',
    borderRadius: 13,
    borderWidth: 1,
    color: '#261743',
    fontSize: 14,
    marginTop,
    minHeight: 48,
    paddingHorizontal: 13,
  } as const;
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
  const [isCashOnDeliveryEnabled, setIsCashOnDeliveryEnabled] = (
    useState(false)
  );
  const [isUpdatingCashOnDelivery, setIsUpdatingCashOnDelivery] = (
    useState(false)
  );
  const [cashOnDeliveryFeedback, setCashOnDeliveryFeedback] = useState<{
    tone: 'success' | 'blocked' | 'error';
    title: string;
    message: string;
  } | null>(null);
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

      const profileResponse = await loadOwnedCommercialProfile(
        businessId,
      );

      setIsCashOnDeliveryEnabled(
        Boolean(
          profileResponse.profile.cash_on_delivery_enabled,
        ),
      );
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
  }, [isSaving]);

  const updateEditor = useCallback((
    updates: Partial<Exclude<PaymentMethodEditorState, null>>,
  ) => {
    setEditor((currentEditor) => (
      currentEditor
        ? {
          ...currentEditor,
          ...updates,
        }
        : currentEditor
    ));
  }, []);

  const saveMethod = useCallback(async () => {
    if (!editor || !businessId) {
      return;
    }

    const displayName = editor.displayName.trim();
    const sortOrder = Number(editor.sortOrder.trim());
    const paymentType = editor.paymentMethodType;

    if (!displayName) {
      setEditorError('Escribe un nombre para identificar este método.');
      return;
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setEditorError(
        'El orden debe ser un número entero igual o mayor que cero.',
      );
      return;
    }

    let mobileAccount: CommercialMobilePaymentAccount | undefined;
    let bankAccount: CommercialBankAccount | undefined;

    if (isMobileType(paymentType)) {
      const paymentKey = paymentType === 'breb'
        ? editor.paymentKey.trim()
        : normalizePhone(editor.paymentKey);

      if (!paymentKey) {
        setEditorError(
          paymentType === 'breb'
            ? 'Escribe la llave Bre-B.'
            : 'Escribe el número de celular.',
        );
        return;
      }

      if (
        paymentType !== 'breb'
        && !/^3\d{9}$/.test(paymentKey)
      ) {
        setEditorError(
          'Nequi y Daviplata requieren un celular colombiano de 10 dígitos que empiece por 3.',
        );
        return;
      }

      mobileAccount = {
        wallet_type: paymentType,
        payment_key: paymentKey,
        account_holder_name: (
          editor.accountHolderName.trim() || null
        ),
      };
    } else {
      const bankValues = {
        account_holder_name: editor.accountHolderName.trim(),
        account_holder_document_type: (
          editor.accountHolderDocumentType.trim()
        ),
        account_holder_document_number: (
          editor.accountHolderDocumentNumber.trim()
        ),
        bank_name: editor.bankName.trim(),
        account_type: editor.bankAccountType.trim(),
        account_number: editor.accountNumber.trim(),
      };

      const missingBankField = Object.values(bankValues).some(
        (value) => !value,
      );

      if (missingBankField) {
        setEditorError(
          'Completa todos los datos de la cuenta bancaria.',
        );
        return;
      }

      bankAccount = bankValues;
    }

    setIsSaving(true);
    setEditorError(null);

    try {
      if (editor.method) {
        await updateOwnedPaymentMethod(
          businessId,
          editor.method.id,
          {
            display_name: displayName,
            sort_order: sortOrder,
            mobile_account: mobileAccount,
            bank_account: bankAccount,
          },
        );
      } else {
        await createOwnedPaymentMethod(
          businessId,
          {
            payment_method_type: paymentType,
            display_name: displayName,
            sort_order: sortOrder,
            mobile_account: mobileAccount,
            bank_account: bankAccount,
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

  const toggleCashOnDelivery = useCallback(async (
    nextValue: boolean,
  ) => {
    if (!businessId || isUpdatingCashOnDelivery) {
      return;
    }

    const previousValue = isCashOnDeliveryEnabled;

    setIsUpdatingCashOnDelivery(true);
    setIsCashOnDeliveryEnabled(nextValue);
    setErrorMessage(null);

    try {
      const response = await updateOwnedCommercialProfile(
        businessId,
        {
          cash_on_delivery_enabled: nextValue,
        },
      );

      const confirmedValue = Boolean(
        response.profile.cash_on_delivery_enabled,
      );

      setIsCashOnDeliveryEnabled(confirmedValue);

      if (confirmedValue !== nextValue) {
        setCashOnDeliveryFeedback({
          tone: 'error',
          title: 'Cambio sin confirmar',
          message:
            'El servidor devolvió un estado diferente. '
            + 'Mostramos el valor confirmado.',
        });
        return;
      }

      setCashOnDeliveryFeedback(
        confirmedValue
          ? {
              tone: 'success',
              title: 'Pago contraentrega habilitado',
              message:
                'Tus clientes ya podrán pagar al recibir su pedido.',
            }
          : {
              tone: 'blocked',
              title: 'Pago contraentrega bloqueado',
              message:
                'Tus clientes ya no verán esta opción al pedir.',
            },
      );
    } catch (error) {
      setIsCashOnDeliveryEnabled(previousValue);

      const uiError = toCommercialUiError(error);
      setErrorMessage(uiError.message);
      setCashOnDeliveryFeedback({
        tone: 'error',
        title: 'No se pudo guardar el cambio',
        message:
          uiError.message
          || 'Revisa tu conexión e inténtalo nuevamente.',
      });
    } finally {
      setIsUpdatingCashOnDelivery(false);
    }
  }, [
    businessId,
    isCashOnDeliveryEnabled,
    isUpdatingCashOnDelivery,
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

  const currentType = editor?.paymentMethodType || 'nequi';
  const editingMobileAccount = isMobileType(currentType);
  const mobileLabel = currentType === 'breb'
    ? 'Llave Bre-B'
    : 'Número de celular';
  const mobilePlaceholder = currentType === 'breb'
    ? 'Ejemplo: 3001234567, correo o alias'
    : '3001234567';

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
          <ArrowLeft color="#3D245E" size={21} />
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
          <Plus color="#FFFFFF" size={21} />
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
          <ActivityIndicator color="#7427D5" size="large" />
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
          <ShieldAlert color="#B42318" size={34} />
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
              Datos de pago para tus clientes
            </Text>
            <Text
              style={{
                color: '#704900',
                fontSize: 12,
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              Configura los datos que tus clientes verán cuando tengan una solicitud de pago activa.
            </Text>
          </View>

          <View
            style={{
              alignItems: 'center',
              backgroundColor: isCashOnDeliveryEnabled
                ? '#ECFDF3'
                : '#F7F3FA',
              borderColor: isCashOnDeliveryEnabled
                ? '#A6EBC2'
                : '#E0D3EC',
              borderRadius: 16,
              borderWidth: 1,
              flexDirection: 'row',
              marginTop: 12,
              padding: 14,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: isCashOnDeliveryEnabled
                  ? '#D1FADF'
                  : '#EEE5F6',
                borderRadius: 12,
                height: 42,
                justifyContent: 'center',
                width: 42,
              }}
            >
              <CreditCard
                color={
                  isCashOnDeliveryEnabled
                    ? '#177245'
                    : '#7427D5'
                }
                size={20}
              />
            </View>

            <View
              style={{
                flex: 1,
                marginLeft: 12,
                paddingRight: 8,
              }}
            >
              <Text
                style={{
                  color: '#261743',
                  fontSize: 14,
                  fontWeight: '900',
                }}
              >
                Pago contraentrega
              </Text>

              <Text
                style={{
                  color: '#786593',
                  fontSize: 12,
                  lineHeight: 18,
                  marginTop: 3,
                }}
              >
                {isCashOnDeliveryEnabled
                  ? 'Tus clientes podrán elegir pagar al recibir su pedido.'
                  : 'Esta opción está bloqueada para tus clientes.'}
              </Text>

              <Text
                style={{
                  color: isCashOnDeliveryEnabled
                    ? '#177245'
                    : '#6D6875',
                  fontSize: 11,
                  fontWeight: '800',
                  marginTop: 5,
                }}
              >
                {isUpdatingCashOnDelivery
                  ? 'Guardando…'
                  : isCashOnDeliveryEnabled
                    ? 'Habilitado'
                    : 'Bloqueado'}
              </Text>
            </View>

            <Switch
              accessibilityLabel="Habilitar pago contraentrega"
              accessibilityHint="Activa o bloquea el pago cuando el cliente recibe su pedido"
              disabled={isUpdatingCashOnDelivery || isSaving}
              onValueChange={(value) => {
                void toggleCashOnDelivery(value);
              }}
              thumbColor={
                isCashOnDeliveryEnabled
                  ? '#FFFFFF'
                  : '#FFFFFF'
              }
              trackColor={{
                false: '#C8B8D8',
                true: '#40A96B',
              }}
              value={isCashOnDeliveryEnabled}
            />
          </View>

          {methods.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                paddingHorizontal: 28,
                paddingTop: 70,
              }}
            >
              <CreditCard color="#7427D5" size={32} />
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
                <Plus color="#FFFFFF" size={18} />
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
            <View style={{ marginTop: 16 }}>
              {methods.map((method) => {
                const detail = method.mobile_account
                  ? maskValue(method.mobile_account.payment_key)
                  : method.bank_account
                    ? `${method.bank_account.bank_name} · ${maskValue(method.bank_account.account_number)}`
                    : 'Sin datos';

                return (
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
                        <Text
                          style={{
                            color: '#54209E',
                            fontSize: 12,
                            fontWeight: '700',
                            marginTop: 6,
                          }}
                        >
                          {detail}
                        </Text>
                      </View>
                      <TouchableOpacity
                        accessibilityLabel={`Editar ${method.display_name}`}
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={isSaving}
                        onPress={() => {
                          setEditorError(null);
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
                        <Edit3 color="#7427D5" size={18} />
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
                          color: '#177245',
                          fontSize: 12,
                          fontWeight: '800',
                        }}
                      >
                        Activo
                      </Text>
                      <TouchableOpacity
                        accessibilityLabel={`Archivar ${method.display_name}`}
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={isSaving}
                        onPress={() => {
                          setArchiveConfirmation({ method });
                        }}
                        style={{
                          alignItems: 'center',
                          flexDirection: 'row',
                          opacity: isSaving ? 0.55 : 1,
                        }}
                      >
                        <Archive color="#B42318" size={15} />
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
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => setCashOnDeliveryFeedback(null)}
        transparent
        visible={cashOnDeliveryFeedback !== null}
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
              backgroundColor:
                cashOnDeliveryFeedback?.tone === 'success'
                  ? '#F0FDF4'
                  : cashOnDeliveryFeedback?.tone === 'blocked'
                    ? '#FAF7FD'
                    : '#FFF4F2',
              borderColor:
                cashOnDeliveryFeedback?.tone === 'success'
                  ? '#A6EBC2'
                  : cashOnDeliveryFeedback?.tone === 'blocked'
                    ? '#E0D3EC'
                    : '#FECACA',
              borderRadius: 22,
              borderWidth: 1,
              padding: 20,
              width: '100%',
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor:
                  cashOnDeliveryFeedback?.tone === 'success'
                    ? '#D1FADF'
                    : cashOnDeliveryFeedback?.tone === 'blocked'
                      ? '#EEE5F6'
                      : '#FEE4E2',
                borderRadius: 26,
                height: 52,
                justifyContent: 'center',
                width: 52,
              }}
            >
              {cashOnDeliveryFeedback?.tone === 'success' ? (
                <CheckCircle2 color="#177245" size={27} />
              ) : cashOnDeliveryFeedback?.tone === 'blocked' ? (
                <CreditCard color="#7427D5" size={25} />
              ) : (
                <ShieldAlert color="#B42318" size={26} />
              )}
            </View>

            <Text
              style={{
                color: '#261743',
                fontSize: 19,
                fontWeight: '900',
                marginTop: 15,
              }}
            >
              {cashOnDeliveryFeedback?.title}
            </Text>

            <Text
              style={{
                color: '#786593',
                fontSize: 14,
                lineHeight: 21,
                marginTop: 8,
              }}
            >
              {cashOnDeliveryFeedback?.message}
            </Text>

            <TouchableOpacity
              accessibilityLabel="Cerrar confirmación de pago contraentrega"
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={() => setCashOnDeliveryFeedback(null)}
              style={{
                alignItems: 'center',
                alignSelf: 'flex-start',
                backgroundColor:
                  cashOnDeliveryFeedback?.tone === 'error'
                    ? '#B42318'
                    : '#7427D5',
                borderRadius: 12,
                justifyContent: 'center',
                marginTop: 20,
                minHeight: 44,
                paddingHorizontal: 16,
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: '800',
                }}
              >
                Entendido
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                {editor?.method ? 'Editar método' : 'Crear método'}
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
                <X color="#3D245E" size={19} />
              </TouchableOpacity>
            </View>

            {editorError ? (
              <View
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
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
                  Tipo de método
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
                    const isSelected = currentType === option.value;

                    return (
                      <TouchableOpacity
                        accessibilityLabel={`Tipo ${option.label}`}
                        accessibilityRole="button"
                        activeOpacity={0.82}
                        disabled={isSaving}
                        key={option.value}
                        onPress={() => {
                          updateEditor({
                            paymentMethodType: option.value,
                            paymentKey: '',
                            accountHolderName: '',
                            accountHolderDocumentType: '',
                            accountHolderDocumentNumber: '',
                            bankName: '',
                            bankAccountType: '',
                            accountNumber: '',
                          });
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

            <Text
              style={{
                color: '#261743',
                fontSize: 14,
                fontWeight: '800',
                marginTop: 20,
              }}
            >
              Nombre personalizado
            </Text>
            <TextInput
              accessibilityLabel="Nombre personalizado del método de pago"
              editable={!isSaving}
              onChangeText={(value) => updateEditor({
                displayName: value,
              })}
              placeholder={
                currentType === 'bank_account'
                  ? 'Ejemplo: Cuenta Bancolombia principal'
                  : `Ejemplo: ${typeLabel(currentType)} principal`
              }
              placeholderTextColor="#A692B7"
              style={inputStyle(9)}
              value={editor?.displayName || ''}
            />

            {editingMobileAccount ? (
              <>
                <View
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    marginTop: 20,
                  }}
                >
                  {currentType === 'breb' ? (
                    <KeyRound color="#7427D5" size={18} />
                  ) : (
                    <Smartphone color="#7427D5" size={18} />
                  )}
                  <Text
                    style={{
                      color: '#261743',
                      fontSize: 14,
                      fontWeight: '800',
                      marginLeft: 8,
                    }}
                  >
                    {mobileLabel}
                  </Text>
                </View>
                <TextInput
                  accessibilityLabel={mobileLabel}
                  autoCapitalize="none"
                  editable={!isSaving}
                  keyboardType={
                    currentType === 'breb'
                      ? 'default'
                      : 'phone-pad'
                  }
                  maxLength={
                    currentType === 'breb'
                      ? 320
                      : 10
                  }
                  onChangeText={(value) => updateEditor({
                    paymentKey: currentType === 'breb'
                      ? value
                      : normalizePhone(value),
                  })}
                  placeholder={mobilePlaceholder}
                  placeholderTextColor="#A692B7"
                  style={inputStyle(9)}
                  value={editor?.paymentKey || ''}
                />
                <Text
                  style={{
                    color: '#786593',
                    fontSize: 12,
                    lineHeight: 18,
                    marginTop: 6,
                  }}
                >
                  {currentType === 'breb'
                    ? 'Ingresa la llave que usas para recibir pagos por Bre-B.'
                    : 'Ingresa un celular colombiano de 10 dígitos que empiece por 3.'}
                </Text>

                <Text
                  style={{
                    color: '#261743',
                    fontSize: 14,
                    fontWeight: '800',
                    marginTop: 18,
                  }}
                >
                  Nombre del titular (opcional)
                </Text>
                <TextInput
                  accessibilityLabel="Nombre del titular opcional"
                  editable={!isSaving}
                  onChangeText={(value) => updateEditor({
                    accountHolderName: value,
                  })}
                  placeholder="Ejemplo: Andrea Mendoza"
                  placeholderTextColor="#A692B7"
                  style={inputStyle(9)}
                  value={editor?.accountHolderName || ''}
                />
              </>
            ) : (
              <>
                <View
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    marginTop: 20,
                  }}
                >
                  <Building2 color="#7427D5" size={18} />
                  <Text
                    style={{
                      color: '#261743',
                      fontSize: 14,
                      fontWeight: '800',
                      marginLeft: 8,
                    }}
                  >
                    Datos de la cuenta bancaria
                  </Text>
                </View>

                <TextInput
                  accessibilityLabel="Nombre del titular de la cuenta"
                  editable={!isSaving}
                  onChangeText={(value) => updateEditor({
                    accountHolderName: value,
                  })}
                  placeholder="Nombre completo o razón social"
                  placeholderTextColor="#A692B7"
                  style={inputStyle(10)}
                  value={editor?.accountHolderName || ''}
                />
                <TextInput
                  accessibilityLabel="Tipo de documento del titular"
                  editable={!isSaving}
                  onChangeText={(value) => updateEditor({
                    accountHolderDocumentType: value,
                  })}
                  placeholder="Ejemplo: CC, NIT, CE"
                  placeholderTextColor="#A692B7"
                  style={inputStyle()}
                  value={editor?.accountHolderDocumentType || ''}
                />
                <TextInput
                  accessibilityLabel="Documento del titular"
                  editable={!isSaving}
                  keyboardType="number-pad"
                  onChangeText={(value) => updateEditor({
                    accountHolderDocumentNumber: value,
                  })}
                  placeholder="Número de documento"
                  placeholderTextColor="#A692B7"
                  style={inputStyle()}
                  value={
                    editor?.accountHolderDocumentNumber || ''
                  }
                />
                <TextInput
                  accessibilityLabel="Nombre del banco"
                  editable={!isSaving}
                  onChangeText={(value) => updateEditor({
                    bankName: value,
                  })}
                  placeholder="Ejemplo: Bancolombia"
                  placeholderTextColor="#A692B7"
                  style={inputStyle()}
                  value={editor?.bankName || ''}
                />
                <TextInput
                  accessibilityLabel="Tipo de cuenta"
                  editable={!isSaving}
                  onChangeText={(value) => updateEditor({
                    bankAccountType: value,
                  })}
                  placeholder="Ejemplo: Ahorros"
                  placeholderTextColor="#A692B7"
                  style={inputStyle()}
                  value={editor?.bankAccountType || ''}
                />
                <TextInput
                  accessibilityLabel="Número de cuenta"
                  editable={!isSaving}
                  keyboardType="number-pad"
                  onChangeText={(value) => updateEditor({
                    accountNumber: value,
                  })}
                  placeholder="Número de cuenta"
                  placeholderTextColor="#A692B7"
                  style={inputStyle()}
                  value={editor?.accountNumber || ''}
                />
              </>
            )}

            <TouchableOpacity
              accessibilityLabel="Guardar método de pago"
              accessibilityRole="button"
              accessibilityState={{
                busy: isSaving,
                disabled: isSaving,
              }}
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
              <Save color="#FFFFFF" size={19} />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 15,
                  fontWeight: '800',
                  marginLeft: 8,
                }}
              >
                {isSaving ? 'Guardando…' : 'Guardar método'}
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
              El método dejará de estar disponible para nuevas instrucciones de pago. Su historial se conservará.
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
                  {isSaving ? 'Archivando…' : 'Archivar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenSafeArea>
  );
}
