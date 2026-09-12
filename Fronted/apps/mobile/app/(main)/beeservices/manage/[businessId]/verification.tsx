import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import type { CommercialVerificationRequest } from "@beeapp/shared-types";

import ScreenSafeArea from "../../../../../src/components/layout/ScreenSafeArea";
import { toCommercialUiError } from "../../../../../src/features/buddyservices/commercialErrors";
import {
  loadOwnedCommercialProfile,
  loadOwnedCommercialVerification,
  saveOwnedCommercialVerificationRequest,
  submitOwnedCommercialVerificationRequest,
  attachOwnedCommercialVerificationPdf,
} from "../../../../../src/services/commercialService";
import {
  uploadCommercialVerificationPdf,
  validateCommercialVerificationPdf,
  type UploadableCommercialVerificationPdf,
} from "../../../../../src/services/commercialVerificationDocumentService";
import { getValidSessionCredentials } from "../../../../../src/services/authSession";

const DECLARATION_VERSION = "v1";

function optionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function verificationLabel(
  status: CommercialVerificationRequest["status"] | "not_requested",
): string {
  if (status === "verified") {
    return "Verificado";
  }

  if (status === "pending_review") {
    return "Verificación solicitada";
  }

  if (status === "requires_correction" || status === "rejected") {
    return "Verificación rechazada";
  }

  if (status === "suspended") {
    return "Verificación suspendida";
  }

  return "Sin verificación solicitada";
}

export default function CommercialVerificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    businessId?: string | string[];
  }>();

  const businessId = Array.isArray(params.businessId)
    ? params.businessId[0]
    : params.businessId;

  const [request, setRequest] = useState<CommercialVerificationRequest | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    legalName?: string;
    taxId?: string;
    businessAddress?: string;
    declarationAccepted?: string;
  }>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [applicantType, setApplicantType] = useState<"natural" | "legal">(
    "natural",
  );
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [selectedPdf, setSelectedPdf] =
    useState<UploadableCommercialVerificationPdf | null>(null);

  const normalizedBusinessId = String(businessId || "").trim();
  const isEditable = request ? request.is_editable : true;
  const statusLabel = verificationLabel(request?.status || "not_requested");

  const applyRequest = useCallback(
    (nextRequest: CommercialVerificationRequest | null) => {
      setRequest(nextRequest);

      if (!nextRequest) {
        return;
      }

      setApplicantType(nextRequest.applicant_type || "natural");
      setLegalName(nextRequest.legal_name || "");
      setTaxId(nextRequest.tax_id || "");
      setBusinessAddress(nextRequest.business_address || "");
      setReviewNote(nextRequest.review_note || "");
      setDeclarationAccepted(Boolean(nextRequest.declaration_accepted_at));
    },
    [],
  );

  const loadVerification = useCallback(async () => {
    if (!normalizedBusinessId) {
      setErrorMessage("No fue posible identificar el negocio solicitado.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [verificationResponse, profileResponse] = await Promise.all([
        loadOwnedCommercialVerification(normalizedBusinessId),
        loadOwnedCommercialProfile(normalizedBusinessId),
      ]);

      applyRequest(verificationResponse.request);

      if (!verificationResponse.request) {
        setLegalName(profileResponse.profile.display_name || "");
        setBusinessAddress(profileResponse.profile.address || "");
      }
    } catch (error) {
      setErrorMessage(toCommercialUiError(error).message);
    } finally {
      setIsLoading(false);
    }
  }, [applyRequest, normalizedBusinessId]);

  useEffect(() => {
    void loadVerification();
  }, [loadVerification]);

  const selectPdf = useCallback(async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset) {
        throw new Error("No fue posible leer el PDF seleccionado.");
      }

      const nextPdf: UploadableCommercialVerificationPdf = {
        uri: asset.uri,
        name: asset.name || null,
        mimeType: asset.mimeType || null,
        size: typeof asset.size === "number" ? asset.size : null,
      };

      validateCommercialVerificationPdf(nextPdf);
      setSelectedPdf(nextPdf);
    } catch (error) {
      setErrorMessage(toCommercialUiError(error).message);
    }
  }, []);

  const saveAndMaybeSubmit = useCallback(
    async (submitAfterSave: boolean) => {
      if (!normalizedBusinessId || !isEditable) {
        return;
      }

      setErrorMessage(null);
      setSuccessMessage(null);

      if (submitAfterSave) {
        const nextFieldErrors: {
          legalName?: string;
          taxId?: string;
          businessAddress?: string;
          declarationAccepted?: string;
        } = {};

        if (!legalName.trim()) {
          nextFieldErrors.legalName =
            "Ingresa el nombre o razón social del titular.";
        }

        if (!taxId.trim()) {
          nextFieldErrors.taxId =
            "Ingresa el NIT, RUT o identificación tributaria.";
        }

        if (!businessAddress.trim()) {
          nextFieldErrors.businessAddress = "Ingresa la dirección del negocio.";
        }

        if (!declarationAccepted) {
          nextFieldErrors.declarationAccepted =
            "Debes activar la declaración para enviar la solicitud.";
        }

        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
          return;
        }
      }

      setFieldErrors({});
      setIsSaving(true);

      try {
        const saved = await saveOwnedCommercialVerificationRequest(
          normalizedBusinessId,
          {
            applicant_type: applicantType,
            legal_name: legalName.trim(),
            tax_id: taxId.trim(),
            business_address: businessAddress.trim(),
            review_note: optionalText(reviewNote),
            declaration_accepted: true,
            declaration_version: DECLARATION_VERSION,
          },
        );

        let nextRequest = saved.request;

        if (selectedPdf) {
          const credentials = await getValidSessionCredentials();

          if (!credentials) {
            throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
          }

          const uploadedPdf = await uploadCommercialVerificationPdf(
            credentials,
            selectedPdf,
          );

          const documentResponse = await attachOwnedCommercialVerificationPdf(
            normalizedBusinessId,
            {
              file_id: uploadedPdf.id,
              note: null,
            },
          );

          nextRequest = documentResponse.request;
          setSelectedPdf(null);
        }

        if (submitAfterSave) {
          const submitted =
            await submitOwnedCommercialVerificationRequest(
              normalizedBusinessId,
            );

          nextRequest = submitted.request;
          setSuccessMessage(
            "Tu solicitud fue enviada y está en espera de revisión.",
          );
        } else {
          setSuccessMessage("Solicitud guardada como borrador.");
        }

        applyRequest(nextRequest);
      } catch (error) {
        setErrorMessage(toCommercialUiError(error).message);
      } finally {
        setIsSaving(false);
      }
    },
    [
      applicantType,
      applyRequest,
      businessAddress,
      declarationAccepted,
      isEditable,
      legalName,
      normalizedBusinessId,
      reviewNote,
      selectedPdf,
      taxId,
    ],
  );

  const subtitle = useMemo(() => {
    if (request?.status === "pending_review") {
      return "Tu solicitud está en revisión. Te avisaremos cuando haya una respuesta.";
    }

    if (
      request?.status === "rejected" ||
      request?.status === "requires_correction"
    ) {
      return "Revisa los comentarios, corrige los datos necesarios y reenvía tu solicitud.";
    }

    if (request?.status === "draft") {
      return "Tienes un borrador guardado. Completa o revisa los datos antes de enviarlo.";
    }

    if (request?.status === "verified") {
      return "Este negocio cuenta con verificación aprobada.";
    }

    if (request?.status === "suspended") {
      return "La verificación está suspendida. Comunícate con soporte si necesitas ayuda.";
    }

    return "Confirma los datos básicos de tu negocio. El PDF de soporte es opcional.";
  }, [request?.status]);

  return (
    <ScreenSafeArea
      style={{
        backgroundColor: "#FFFCF9",
        flex: 1,
      }}
    >
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 18,
          paddingTop: 10,
        }}
      >
        <TouchableOpacity
          accessibilityLabel="Volver a gestión del negocio"
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{
            alignItems: "center",
            backgroundColor: "#F4EDF9",
            borderRadius: 14,
            height: 42,
            justifyContent: "center",
            width: 42,
          }}
        >
          <ArrowLeft color="#3D245E" size={21} />
        </TouchableOpacity>

        <Text
          style={{
            color: "#261743",
            fontSize: 19,
            fontWeight: "800",
          }}
        >
          Verificación
        </Text>

        <View style={{ width: 42 }} />
      </View>

      {isLoading ? (
        <View
          style={{
            alignItems: "center",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color="#7427D5" size="large" />
          <Text
            style={{
              color: "#786593",
              fontSize: 14,
              marginTop: 15,
            }}
          >
            Cargando verificación…
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingBottom: 34,
            paddingHorizontal: 18,
            paddingTop: 21,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              backgroundColor:
                request?.status === "verified"
                  ? "#E9F7EE"
                  : request?.status === "rejected" ||
                      request?.status === "requires_correction"
                    ? "#FFF4ED"
                    : "#F4EDF9",
              borderColor:
                request?.status === "verified"
                  ? "#B7E4C7"
                  : request?.status === "rejected" ||
                      request?.status === "requires_correction"
                    ? "#F9C9A8"
                    : "#E2D1F8",
              borderRadius: 18,
              borderWidth: 1,
              padding: 16,
            }}
          >
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
              }}
            >
              {request?.status === "verified" ? (
                <ShieldCheck color="#177245" size={24} />
              ) : request?.status === "rejected" ||
                request?.status === "requires_correction" ? (
                <ShieldAlert color="#A15C00" size={24} />
              ) : (
                <FileText color="#7427D5" size={24} />
              )}

              <View
                style={{
                  flex: 1,
                  marginLeft: 10,
                }}
              >
                <Text
                  style={{
                    color: "#261743",
                    fontSize: 16,
                    fontWeight: "900",
                  }}
                >
                  {statusLabel}
                </Text>

                <Text
                  style={{
                    color: "#5D4B73",
                    fontSize: 13,
                    lineHeight: 19,
                    marginTop: 3,
                  }}
                >
                  {subtitle}
                </Text>
              </View>
            </View>

            {request?.review_reason_text ? (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderColor: "#F1C8A8",
                  borderRadius: 12,
                  borderWidth: 1,
                  marginTop: 14,
                  padding: 12,
                }}
              >
                <Text
                  style={{
                    color: "#7A3F00",
                    fontSize: 12,
                    fontWeight: "900",
                  }}
                >
                  Comentario de revisión
                </Text>
                <Text
                  style={{
                    color: "#5D4B73",
                    fontSize: 13,
                    lineHeight: 19,
                    marginTop: 5,
                  }}
                >
                  {request.review_reason_text}
                </Text>
              </View>
            ) : null}
          </View>

          {errorMessage ? (
            <View
              style={{
                backgroundColor: "#FFF0F0",
                borderColor: "#F5C2C7",
                borderRadius: 14,
                borderWidth: 1,
                marginTop: 14,
                padding: 13,
              }}
            >
              <Text
                style={{
                  color: "#B42318",
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {successMessage ? (
            <View
              style={{
                backgroundColor: "#E9F7EE",
                borderColor: "#B7E4C7",
                borderRadius: 14,
                borderWidth: 1,
                marginTop: 14,
                padding: 13,
              }}
            >
              <Text
                style={{
                  color: "#177245",
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {successMessage}
              </Text>
            </View>
          ) : null}

          <Text
            style={{
              color: "#261743",
              fontSize: 17,
              fontWeight: "900",
              marginBottom: 11,
              marginTop: 24,
            }}
          >
            Datos de verificación
          </Text>

          <Text
            style={{
              color: "#5D4B73",
              fontSize: 13,
              fontWeight: "800",
              marginBottom: 8,
            }}
          >
            Tipo de persona
          </Text>

          <View
            style={{
              flexDirection: "row",
              marginBottom: 14,
            }}
          >
            {[
              { value: "natural", label: "Natural" },
              { value: "legal", label: "Jurídica" },
            ].map((option) => {
              const isSelected = applicantType === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="button"
                  disabled={!isEditable || isSaving}
                  onPress={() => {
                    setApplicantType(option.value as "natural" | "legal");
                  }}
                  style={{
                    backgroundColor: isSelected ? "#7427D5" : "#FFFFFF",
                    borderColor: isSelected ? "#7427D5" : "#E7DDF2",
                    borderRadius: 12,
                    borderWidth: 1,
                    marginRight: 10,
                    opacity: isEditable ? 1 : 0.65,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                  }}
                >
                  <Text
                    style={{
                      color: isSelected ? "#FFFFFF" : "#5D4B73",
                      fontSize: 13,
                      fontWeight: "800",
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text
            style={{
              color: "#5D4B73",
              fontSize: 13,
              fontWeight: "800",
              marginBottom: 8,
            }}
          >
            Nombre o razón social
          </Text>

          <TextInput
            editable={isEditable && !isSaving}
            onChangeText={(value) => {
              setLegalName(value);
              setFieldErrors((current) => ({
                ...current,
                legalName: undefined,
              }));
            }}
            placeholder="Ej. BeeApp SAS"
            placeholderTextColor="#A294B4"
            value={legalName}
            style={{
              backgroundColor: !isEditable
                ? "#F4F0F7"
                : fieldErrors.legalName
                  ? "#FFF5F5"
                  : "#FFFFFF",
              borderColor: fieldErrors.legalName ? "#E5484D" : "#E7DDF2",
              borderRadius: 12,
              borderWidth: 1,
              color: "#261743",
              fontSize: 14,
              marginBottom: fieldErrors.legalName ? 7 : 14,
              paddingHorizontal: 13,
              paddingVertical: 12,
            }}
          />

          {fieldErrors.legalName ? (
            <Text
              style={{
                color: "#C9363E",
                fontSize: 12,
                fontWeight: "700",
                lineHeight: 18,
                marginBottom: 14,
              }}
            >
              {fieldErrors.legalName}
            </Text>
          ) : null}

          <Text
            style={{
              color: "#5D4B73",
              fontSize: 13,
              fontWeight: "800",
              marginBottom: 8,
            }}
          >
            NIT, RUT o identificación tributaria
          </Text>

          <TextInput
            editable={isEditable && !isSaving}
            onChangeText={(value) => {
              setTaxId(value);
              setFieldErrors((current) => ({
                ...current,
                taxId: undefined,
              }));
            }}
            placeholder="Ej. 901.123.456-7"
            placeholderTextColor="#A294B4"
            value={taxId}
            style={{
              backgroundColor: !isEditable
                ? "#F4F0F7"
                : fieldErrors.taxId
                  ? "#FFF5F5"
                  : "#FFFFFF",
              borderColor: fieldErrors.taxId ? "#E5484D" : "#E7DDF2",
              borderRadius: 12,
              borderWidth: 1,
              color: "#261743",
              fontSize: 14,
              marginBottom: fieldErrors.taxId ? 7 : 14,
              paddingHorizontal: 13,
              paddingVertical: 12,
            }}
          />

          {fieldErrors.taxId ? (
            <Text
              style={{
                color: "#C9363E",
                fontSize: 12,
                fontWeight: "700",
                lineHeight: 18,
                marginBottom: 14,
              }}
            >
              {fieldErrors.taxId}
            </Text>
          ) : null}

          <Text
            style={{
              color: "#5D4B73",
              fontSize: 13,
              fontWeight: "800",
              marginBottom: 8,
            }}
          >
            Dirección del negocio
          </Text>

          <TextInput
            editable={isEditable && !isSaving}
            multiline
            onChangeText={(value) => {
              setBusinessAddress(value);
              setFieldErrors((current) => ({
                ...current,
                businessAddress: undefined,
              }));
            }}
            placeholder="Ej. Calle 100 # 10-20, Bogotá"
            placeholderTextColor="#A294B4"
            value={businessAddress}
            style={{
              backgroundColor: !isEditable
                ? "#F4F0F7"
                : fieldErrors.businessAddress
                  ? "#FFF5F5"
                  : "#FFFFFF",
              borderColor: fieldErrors.businessAddress ? "#E5484D" : "#E7DDF2",
              borderRadius: 12,
              borderWidth: 1,
              color: "#261743",
              fontSize: 14,
              marginBottom: fieldErrors.businessAddress ? 7 : 14,
              minHeight: 80,
              paddingHorizontal: 13,
              paddingTop: 12,
              textAlignVertical: "top",
            }}
          />

          {fieldErrors.businessAddress ? (
            <Text
              style={{
                color: "#C9363E",
                fontSize: 12,
                fontWeight: "700",
                lineHeight: 18,
                marginBottom: 14,
              }}
            >
              {fieldErrors.businessAddress}
            </Text>
          ) : null}

          <Text
            style={{
              color: "#5D4B73",
              fontSize: 13,
              fontWeight: "800",
              marginBottom: 8,
            }}
          >
            Nota para revisión (opcional)
          </Text>

          <TextInput
            editable={isEditable && !isSaving}
            multiline
            maxLength={500}
            onChangeText={setReviewNote}
            placeholder="Explica algún dato que pueda requerir contexto."
            placeholderTextColor="#A294B4"
            value={reviewNote}
            style={{
              backgroundColor: isEditable ? "#FFFFFF" : "#F4F0F7",
              borderColor: "#E7DDF2",
              borderRadius: 12,
              borderWidth: 1,
              color: "#261743",
              fontSize: 14,
              marginBottom: 16,
              minHeight: 88,
              paddingHorizontal: 13,
              paddingTop: 12,
              textAlignVertical: "top",
            }}
          />

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "#E7DDF2",
              borderRadius: 14,
              borderWidth: 1,
              padding: 14,
            }}
          >
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
              }}
            >
              <FileText color="#7427D5" size={21} />

              <View
                style={{
                  flex: 1,
                  marginLeft: 10,
                }}
              >
                <Text
                  style={{
                    color: "#261743",
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  PDF de soporte (opcional)
                </Text>

                <Text
                  style={{
                    color: "#786593",
                    fontSize: 12,
                    lineHeight: 18,
                    marginTop: 3,
                  }}
                >
                  Un solo PDF, máximo 10 MB. Puedes adjuntarlo o reemplazarlo
                  mientras la solicitud sea editable.
                </Text>
              </View>
            </View>

            {request?.document || selectedPdf ? (
              <View
                style={{
                  backgroundColor: "#F7F2FB",
                  borderRadius: 10,
                  marginTop: 12,
                  padding: 11,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: "#5D4B73",
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  {selectedPdf?.name || "PDF de soporte adjunto"}
                </Text>
              </View>
            ) : null}

            {isEditable ? (
              <TouchableOpacity
                accessibilityLabel="Seleccionar PDF de soporte"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  void selectPdf();
                }}
                style={{
                  alignItems: "center",
                  backgroundColor: "#F4EDF9",
                  borderRadius: 11,
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 13,
                  opacity: isSaving ? 0.65 : 1,
                  paddingVertical: 11,
                }}
              >
                <Upload color="#7427D5" size={17} />
                <Text
                  style={{
                    color: "#7427D5",
                    fontSize: 13,
                    fontWeight: "900",
                    marginLeft: 7,
                  }}
                >
                  {request?.document || selectedPdf
                    ? "Reemplazar PDF"
                    : "Adjuntar PDF"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View
            style={{
              backgroundColor: fieldErrors.declarationAccepted
                ? "#FFF5F5"
                : "#F8F4FC",
              borderColor: fieldErrors.declarationAccepted
                ? "#E5484D"
                : "#E7DDF2",
              borderRadius: 14,
              borderWidth: 1,
              marginTop: 18,
              opacity: isEditable ? 1 : 0.65,
              padding: 13,
            }}
          >
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
              }}
            >
              <Switch
                disabled={!isEditable || isSaving}
                onValueChange={(value) => {
                  setDeclarationAccepted(value);
                  setFieldErrors((current) => ({
                    ...current,
                    declarationAccepted: undefined,
                  }));
                }}
                thumbColor={declarationAccepted ? "#7427D5" : "#F4EDF9"}
                trackColor={{
                  false: "#D9D2DF",
                  true: "#DCC8FF",
                }}
                value={declarationAccepted}
              />

              <Text
                style={{
                  color: "#5D4B73",
                  flex: 1,
                  fontSize: 12,
                  lineHeight: 18,
                  marginLeft: 10,
                }}
              >
                Declaro que la información es verdadera, tengo autorización para
                solicitar la verificación y el documento adjunto corresponde a
                este negocio o a su titular.
              </Text>
            </View>

            {fieldErrors.declarationAccepted ? (
              <Text
                style={{
                  color: "#C9363E",
                  fontSize: 12,
                  fontWeight: "700",
                  lineHeight: 18,
                  marginTop: 9,
                }}
              >
                {fieldErrors.declarationAccepted}
              </Text>
            ) : null}
          </View>

          {isEditable ? (
            <View
              style={{
                flexDirection: "row",
                marginTop: 22,
              }}
            >
              <TouchableOpacity
                accessibilityLabel="Guardar borrador de verificación"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  void saveAndMaybeSubmit(false);
                }}
                style={{
                  alignItems: "center",
                  backgroundColor: "#F4EDF9",
                  borderRadius: 13,
                  flex: 1,
                  justifyContent: "center",
                  marginRight: 10,
                  opacity: isSaving ? 0.65 : 1,
                  paddingVertical: 13,
                }}
              >
                <Text
                  style={{
                    color: "#7427D5",
                    fontSize: 14,
                    fontWeight: "900",
                  }}
                >
                  Guardar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel="Enviar solicitud de verificación"
                accessibilityRole="button"
                activeOpacity={0.82}
                disabled={isSaving}
                onPress={() => {
                  void saveAndMaybeSubmit(true);
                }}
                style={{
                  alignItems: "center",
                  backgroundColor: "#7427D5",
                  borderRadius: 13,
                  flex: 1,
                  justifyContent: "center",
                  opacity: isSaving ? 0.65 : 1,
                  paddingVertical: 13,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: "900",
                    }}
                  >
                    {request?.status === "rejected" ||
                    request?.status === "requires_correction"
                      ? "Reenviar"
                      : "Enviar solicitud"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : request?.status === "pending_review" ? (
            <View
              style={{
                alignItems: "center",
                backgroundColor: "#F4EDF9",
                borderRadius: 13,
                marginTop: 22,
                padding: 14,
              }}
            >
              <Text
                style={{
                  color: "#7427D5",
                  fontSize: 13,
                  fontWeight: "900",
                  textAlign: "center",
                }}
              >
                Solicitud enviada · en espera de respuesta
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </ScreenSafeArea>
  );
}
