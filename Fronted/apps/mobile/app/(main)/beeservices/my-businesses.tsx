import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { appAlert } from '../../../src/components/feedback/appAlert';
import {
  Briefcase,
  ChevronRight,
  CircleAlert,
  Play,
  Plus,
  Power,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";

import {
  LIST_CACHE_TTL,
  OWNED_COMMERCIAL_PROFILES_CACHE_KEY,
} from "@beeapp/api-client";
import type {
  CommercialOwnedProfile,
  GetOwnedCommercialProfilesResponse,
} from "@beeapp/shared-types";

import { paintCachedValue } from "../../../src/hooks/useCachedResource";

import BeeServicesHeader from "../../../src/components/beeservices/BeeServicesHeader";
import { styles as beeStyles } from "../../../src/components/beeservices/beeServicesStyles";
import OwnedBusinessActionsSheet from "../../../src/components/buddyservices/OwnedBusinessActionsSheet";
import OwnedCommercialProfileGridCard from "../../../src/components/buddyservices/OwnedCommercialProfileGridCard";
import { myBusinessesVisual as v } from "../../../src/components/buddyservices/myBusinessesVisual";
import OwnedCommercialProfilesState from "../../../src/components/buddyservices/OwnedCommercialProfilesState";
import HomeSideMenu from "../../../src/components/home/HomeSideMenu";
import ScreenSafeArea from "../../../src/components/layout/ScreenSafeArea";
import { toCommercialUiError } from "../../../src/features/buddyservices/commercialErrors";
import {
  buddyServicesCommercialRoute,
  buddyServicesCreateBusinessRoute,
  buddyServicesManageProfileRoute,
  buddyServicesPublicProfileRoute,
} from "../../../src/features/buddyservices/commercialRoutes";
import { useDeleteOwnedBusiness } from "../../../src/features/buddyservices/useDeleteOwnedBusiness";
import {
  loadOwnedCommercialProfiles,
  updateOwnedCommercialProfilePublication,
} from "../../../src/services/commercialService";

export default function BuddyServicesMyBusinessesScreen() {
  const router = useRouter();

  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<CommercialOwnedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] =
    useState<CommercialOwnedProfile | null>(null);
  const [actionsProfile, setActionsProfile] =
    useState<CommercialOwnedProfile | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [isSubmittingPublication, setIsSubmittingPublication] = useState(false);
  const [updatingProfileId, setUpdatingProfileId] = useState<string | null>(
    null,
  );

  const deleteFlow = useDeleteOwnedBusiness({
    onDeleted: (deletedId) => {
      setProfiles((currentProfiles) =>
        currentProfiles.filter((profile) => profile.id !== deletedId),
      );
      setActionsProfile(null);
    },
  });
  const checkDeleteStatus = deleteFlow.checkStatus;
  const resetDeleteStatus = deleteFlow.reset;

  useEffect(() => {
    const targetId = actionsProfile?.id;

    if (!targetId) {
      resetDeleteStatus();
      return;
    }

    void checkDeleteStatus(targetId);
  }, [actionsProfile?.id, checkDeleteStatus, resetDeleteStatus]);

  const loadProfiles = useCallback(async (options?: { silent?: boolean }) => {
    setErrorMessage(null);

    const painted = options?.silent
      ? false
      : await paintCachedValue<GetOwnedCommercialProfilesResponse>(
        OWNED_COMMERCIAL_PROFILES_CACHE_KEY,
        LIST_CACHE_TTL.stable,
        (cached) => {
          setProfiles(cached.profiles);
        },
      );

    if (!options?.silent && !painted) {
      setIsLoading(true);
    }

    try {
      const response = await loadOwnedCommercialProfiles();

      setProfiles(response.profiles);
    } catch (error) {
      const uiError = toCommercialUiError(error);

      setErrorMessage(uiError.message);
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadProfiles({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadProfiles]);

  const closePublicationModal = useCallback(() => {
    if (isSubmittingPublication) {
      return;
    }

    setSelectedProfile(null);
    setArchiveReason("");
  }, [isSubmittingPublication]);

  const replaceProfile = useCallback(
    (updatedProfile: CommercialOwnedProfile) => {
      setProfiles((currentProfiles) =>
        currentProfiles.map((profile) =>
          profile.id === updatedProfile.id ? updatedProfile : profile,
        ),
      );
    },
    [],
  );

  const submitPublicationChange = useCallback(async () => {
    if (!selectedProfile) {
      return;
    }

    const isArchived = selectedProfile.publication_status === "archived";
    const isPaused = selectedProfile.publication_status === "paused";
    const isDeactivation = !isArchived && !isPaused;
    const normalizedReason = archiveReason.trim();

    if (isDeactivation && !normalizedReason) {
      appAlert(
        "Motivo requerido",
        "Escribe el motivo para desactivar este negocio.",
      );
      return;
    }

    setIsSubmittingPublication(true);
    setUpdatingProfileId(selectedProfile.id);

    try {
      const response = await updateOwnedCommercialProfilePublication(
        selectedProfile.id,
        isArchived
          ? {
              publication_status: "paused",
            }
          : isPaused
            ? {
                publication_status: "published",
              }
            : {
                publication_status: "archived",
                reason_code: "owner_request",
                reason_text: normalizedReason,
              },
      );

      replaceProfile(response.profile);
      setSelectedProfile(null);
      setArchiveReason("");

      appAlert(
        isArchived
          ? "Negocio restaurado"
          : isPaused
            ? "Negocio activado"
            : "Negocio desactivado",
        isArchived
          ? "Tu negocio fue restaurado como pausado. " +
              "Publícalo cuando esté listo para clientes."
          : isPaused
            ? "Tu negocio ya está publicado y disponible " + "para clientes."
            : "Tu negocio fue desactivado y dejó de estar " +
              "disponible para clientes.",
      );
    } catch (error) {
      const uiError = toCommercialUiError(error);

      appAlert("No fue posible cambiar el estado", uiError.message);
    } finally {
      setIsSubmittingPublication(false);
      setUpdatingProfileId(null);
    }
  }, [archiveReason, replaceProfile, selectedProfile]);

  const openPublicationModal = useCallback(
    (profile: CommercialOwnedProfile) => {
      setSelectedProfile(profile);
      setArchiveReason("");
    },
    [],
  );

  const selectedIsArchived = selectedProfile?.publication_status === "archived";
  const selectedIsPaused = selectedProfile?.publication_status === "paused";
  const selectedIsDeactivation = Boolean(
    selectedProfile && !selectedIsArchived && !selectedIsPaused,
  );

  const renderCreateBusinessCard = (
    hint: string,
  ) => (
    <TouchableOpacity
      accessibilityHint="Abre el formulario para crear un negocio"
      accessibilityLabel="Crear un negocio"
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={() => {
        router.push(buddyServicesCreateBusinessRoute());
      }}
      style={styles.createCard}
    >
      <View style={styles.createIconWrap}>
        <Plus color="#FFFFFF" size={22} strokeWidth={2.6} />
      </View>

      <View style={styles.createTextColumn}>
        <Text style={styles.createTitle}>
          Crear negocio
        </Text>

        <Text style={styles.createHint}>
          {hint}
        </Text>
      </View>

      <View style={styles.createChevron}>
        <ChevronRight color="#7567D9" size={18} strokeWidth={2.4} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenSafeArea style={beeStyles.safeArea}>
      <View style={beeStyles.container}>
        {isLoading ? (
          <OwnedCommercialProfilesState kind="loading" />
        ) : errorMessage ? (
          <View style={beeStyles.content}>
            <BeeServicesHeader
              onBackToMainPress={() => router.back()}
              onMenuPress={() => setSideMenuVisible(true)}
              subtitle="Administra tus espacios comerciales"
              title="Mis negocios"
            />

            <OwnedCommercialProfilesState
              kind="error"
              message={errorMessage}
              onRetry={() => {
                void loadProfiles();
              }}
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={beeStyles.content}
            refreshControl={
              <RefreshControl
                colors={["#7427D5"]}
                onRefresh={() => {
                  void handleRefresh();
                }}
                refreshing={refreshing}
                tintColor="#7427D5"
              />
            }
            showsVerticalScrollIndicator={false}
          >
            <BeeServicesHeader
              onBackToMainPress={() => router.back()}
              onMenuPress={() => setSideMenuVisible(true)}
              subtitle="Administra tus espacios comerciales"
              title="Mis negocios"
            />

            <View style={styles.sectionHeader}>
              <Text style={beeStyles.sectionTitle}>
                Tus espacios
              </Text>

              <View style={styles.countBadge}>
                <Briefcase
                  color={v.countBadgeText}
                  size={14}
                  strokeWidth={2.2}
                />

                <Text style={styles.countBadgeText}>
                  {profiles.length}
                </Text>
              </View>
            </View>

            {profiles.length === 0 ? (
              <View style={beeStyles.section}>
                <OwnedCommercialProfilesState kind="empty" />

                {renderCreateBusinessCard(
                  "Empieza a vender con Buddy Services",
                )}
              </View>
            ) : (
              <View style={beeStyles.section}>
                <View style={styles.profileList}>
                  {profiles.map((profile) => (
                    <OwnedCommercialProfileGridCard
                      isUpdating={updatingProfileId === profile.id}
                      key={profile.id}
                      onEdit={() => {
                        router.push(
                          buddyServicesManageProfileRoute(profile.id),
                        );
                      }}
                      onPress={() => {
                        router.push(
                          buddyServicesCommercialRoute(profile.id),
                        );
                      }}
                      onTogglePublication={() => {
                        openPublicationModal(profile);
                      }}
                      onView={() => {
                        router.push(
                          buddyServicesPublicProfileRoute(profile.id),
                        );
                      }}
                      onMoreActions={() => {
                        setActionsProfile(profile);
                      }}
                      profile={profile}
                    />
                  ))}
                </View>

                {renderCreateBusinessCard(
                  "Agrega otro espacio para vender o prestar servicios",
                )}
              </View>
            )}

            <View style={beeStyles.footer}>
              <Text style={beeStyles.footerText}>
                Impulsando economías locales con Buddy AI
              </Text>

              <View style={beeStyles.footerLine} />
            </View>
          </ScrollView>
        )}

        <HomeSideMenu
          onClose={() => setSideMenuVisible(false)}
          visible={sideMenuVisible}
        />
      </View>

      <OwnedBusinessActionsSheet
        businessName={actionsProfile?.display_name ?? ""}
        deleteDescription={deleteFlow.description}
        deleteState={deleteFlow.state}
        isDeleting={deleteFlow.deleting}
        onClose={() => {
          setActionsProfile(null);
        }}
        onDelete={() => {
          if (!actionsProfile) {
            return;
          }

          void deleteFlow.requestDelete(actionsProfile);
        }}
        onEdit={() => {
          if (!actionsProfile) {
            return;
          }

          router.push(
            buddyServicesManageProfileRoute(actionsProfile.id),
          );
        }}
        onManage={() => {
          if (!actionsProfile) {
            return;
          }

          router.push(
            buddyServicesCommercialRoute(actionsProfile.id),
          );
        }}
        onViewPublic={() => {
          if (!actionsProfile) {
            return;
          }

          router.push(
            buddyServicesPublicProfileRoute(actionsProfile.id),
          );
        }}
        visible={Boolean(actionsProfile)}
      />

      <Modal
        animationType="fade"
        onRequestClose={closePublicationModal}
        transparent
        visible={Boolean(selectedProfile)}
      >
        <View
          style={{
            backgroundColor: "rgba(38, 49, 77, 0.48)",
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#F7F8FF",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingBottom: 30,
              paddingHorizontal: 20,
              paddingTop: 18,
            }}
          >
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  backgroundColor:
                    selectedIsArchived || selectedIsPaused
                      ? "#E9F7EE"
                      : "#FFF0F0",
                  borderRadius: 14,
                  height: 44,
                  justifyContent: "center",
                  width: 44,
                }}
              >
                {selectedIsArchived || selectedIsPaused ? (
                  <Play color="#177245" size={22} />
                ) : (
                  <Power color="#B42318" size={22} />
                )}
              </View>

              <TouchableOpacity
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                disabled={isSubmittingPublication}
                onPress={closePublicationModal}
                style={{
                  alignItems: "center",
                  backgroundColor: "#EEF2FF",
                  borderRadius: 14,
                  height: 40,
                  justifyContent: "center",
                  width: 40,
                }}
              >
                <X color="#5F52C5" size={20} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                color: "#26314D",
                fontSize: 21,
                fontWeight: "900",
                marginTop: 18,
              }}
            >
              {selectedIsArchived
                ? "¿Restaurar este negocio?"
                : selectedIsPaused
                  ? "¿Activar este negocio?"
                  : "¿Desactivar este negocio?"}
            </Text>

            <Text
              style={{
                color: "#6C7892",
                fontSize: 14,
                lineHeight: 21,
                marginTop: 8,
              }}
            >
              {selectedIsArchived
                ? `${selectedProfile?.display_name || "Este negocio"} ` +
                  "se restaurará como pausado. No será visible " +
                  "para clientes hasta que lo publiques."
                : selectedIsPaused
                  ? `${selectedProfile?.display_name || "Este negocio"} ` +
                    "volverá a estar publicado y disponible " +
                    "para clientes."
                  : `${selectedProfile?.display_name || "Este negocio"} ` +
                    "dejará de estar visible y disponible para " +
                    "clientes hasta que decidas activarlo de nuevo."}
            </Text>

            {selectedIsDeactivation ? (
              <>
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: "#FFF7E8",
                    borderColor: "#F7D99A",
                    borderRadius: 12,
                    borderWidth: 1,
                    flexDirection: "row",
                    marginTop: 16,
                    padding: 12,
                  }}
                >
                  <CircleAlert color="#9A5B00" size={18} />

                  <Text
                    style={{
                      color: "#7A4800",
                      flex: 1,
                      fontSize: 12,
                      lineHeight: 18,
                      marginLeft: 8,
                    }}
                  >
                    El motivo es obligatorio y quedará registrado.
                  </Text>
                </View>

                <Text
                  style={{
                    color: "#5F52C5",
                    fontSize: 13,
                    fontWeight: "800",
                    marginBottom: 8,
                    marginTop: 18,
                  }}
                >
                  Motivo de desactivación
                </Text>

                <TextInput
                  accessibilityLabel="Motivo de desactivación"
                  editable={!isSubmittingPublication}
                  maxLength={2000}
                  multiline
                  onChangeText={setArchiveReason}
                  placeholder="Ejemplo: Cierro temporalmente por vacaciones."
                  placeholderTextColor="#A99AB9"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#D9CEE5",
                    borderRadius: 13,
                    borderWidth: 1,
                    color: "#26314D",
                    fontSize: 14,
                    minHeight: 98,
                    padding: 13,
                    textAlignVertical: "top",
                  }}
                  value={archiveReason}
                />
              </>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 22,
              }}
            >
              <TouchableOpacity
                accessibilityLabel="Cancelar cambio de estado"
                accessibilityRole="button"
                disabled={isSubmittingPublication}
                onPress={closePublicationModal}
                style={{
                  alignItems: "center",
                  backgroundColor: "#EEF2FF",
                  borderRadius: 13,
                  flex: 1,
                  justifyContent: "center",
                  minHeight: 48,
                  opacity: isSubmittingPublication ? 0.62 : 1,
                }}
              >
                <Text
                  style={{
                    color: "#5F52C5",
                    fontSize: 14,
                    fontWeight: "800",
                  }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel={
                  selectedIsArchived
                    ? "Confirmar restauración del negocio"
                    : selectedIsPaused
                      ? "Confirmar activación del negocio"
                      : "Confirmar desactivación del negocio"
                }
                accessibilityRole="button"
                disabled={isSubmittingPublication}
                onPress={() => {
                  void submitPublicationChange();
                }}
                style={{
                  alignItems: "center",
                  backgroundColor:
                    selectedIsArchived || selectedIsPaused
                      ? "#177245"
                      : "#B42318",
                  borderRadius: 13,
                  flex: 1,
                  flexDirection: "row",
                  justifyContent: "center",
                  minHeight: 48,
                  opacity: isSubmittingPublication ? 0.7 : 1,
                }}
              >
                {isSubmittingPublication ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : null}

                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: "800",
                    marginLeft: isSubmittingPublication ? 8 : 0,
                  }}
                >
                  {isSubmittingPublication
                    ? "Actualizando…"
                    : selectedIsArchived
                      ? "Sí, restaurar"
                      : selectedIsPaused
                        ? "Sí, activar"
                        : "Sí, desactivar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  countBadge: {
    alignItems: "center",
    backgroundColor: v.countBadgeBg,
    borderColor: v.countBadgeBorder,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countBadgeText: {
    color: v.countBadgeText,
    fontSize: 13,
    fontWeight: "800",
  },
  profileList: {
    gap: 11,
    marginBottom: 14,
  },
  createCard: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: v.createCardBg,
    borderColor: v.createCardBorder,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    paddingBottom: 11,
    paddingLeft: 11,
    paddingRight: 14,
    paddingTop: 11,
    shadowColor: "#5F52C5",
    shadowOffset: {
      height: 4,
      width: 0,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  createIconWrap: {
    alignItems: "center",
    backgroundColor: v.createPlusBg,
    borderRadius: 12,
    height: 37,
    justifyContent: "center",
    width: 37,
  },
  createTextColumn: {
    flex: 1,
    marginLeft: 10,
  },
  createTitle: {
    color: "#26314D",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
  },
  createHint: {
    color: v.subtitle,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  createChevron: {
    alignItems: "center",
    backgroundColor: "#F4EAFE",
    borderColor: v.secondaryBtnBorder,
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    marginLeft: 8,
    width: 32,
  },
});
