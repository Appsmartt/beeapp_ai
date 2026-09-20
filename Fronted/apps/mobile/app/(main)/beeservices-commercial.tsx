import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ClipboardList,
  MessageCircle,
  PackageSearch,
  Store,
  Wrench,
} from "lucide-react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import type {
  CommercialOwnedProfile,
} from "@beeapp/shared-types";

import ScreenSafeArea from "../../src/components/layout/ScreenSafeArea";
import HomeSideMenu from "../../src/components/home/HomeSideMenu";
import BeeServicesHeader from "../../src/components/beeservices/BeeServicesHeader";
import EmbeddedModuleHost from "../../src/components/embedded/EmbeddedModuleHost";
import {
  buddyServicesMyBusinessesRoute,
} from "../../src/features/buddyservices/commercialRoutes";
import {
  toCommercialUiError,
} from "../../src/features/buddyservices/commercialErrors";
import {
  loadOwnedCommercialProfile,
} from "../../src/services/commercialService";
import { styles as beeStyles } from "../../src/components/beeservices/beeServicesStyles";

type CommercialWorkspaceModule =
  | "chat"
  | "requests"
  | "catalogs"
  | "manage";

type CommercialModuleConfig = {
  accessibilityHint: string;
  accessibilityLabel: string;
  icon: "chat" | "requests" | "catalogs" | "manage";
  rootPath?: string;
};

const COMMERCIAL_MODULES: Record<
  CommercialWorkspaceModule,
  CommercialModuleConfig
> = {
  chat: {
    accessibilityHint: "Reinicia los chats del negocio",
    accessibilityLabel: "Chats del negocio",
    icon: "chat",
  },
  requests: {
    accessibilityHint: "Reinicia las solicitudes del negocio",
    accessibilityLabel: "Solicitudes del negocio",
    icon: "requests",
    rootPath: "/(main)/beeservices/manage/[businessId]/requests",
  },
  catalogs: {
    accessibilityHint: "Reinicia los catálogos del negocio",
    accessibilityLabel: "Catálogos y productos del negocio",
    icon: "catalogs",
    rootPath: "/(main)/beeservices/manage/[businessId]/catalogs",
  },
  manage: {
    accessibilityHint: "Reinicia la gestión del negocio",
    accessibilityLabel: "Gestión del negocio",
    icon: "manage",
    rootPath: "/(main)/beeservices/manage/[businessId]",
  },
};

function moduleLabel(module: CommercialWorkspaceModule): string {
  if (module === "chat") {
    return "Chats";
  }

  if (module === "requests") {
    return "Solicitudes";
  }

  if (module === "catalogs") {
    return "Catálogos";
  }

  return "Gestión";
}

export default function BeeServicesCommercialScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    businessId?: string | string[];
  }>();

  const routeBusinessId = Array.isArray(params.businessId)
    ? params.businessId[0]
    : params.businessId;
  const selectedBusinessId = String(routeBusinessId || "").trim();

  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [selectedBusiness, setSelectedBusiness] =
    useState<CommercialOwnedProfile | null>(null);
  const [selectedBusinessError, setSelectedBusinessError] = useState<
    string | null
  >(null);
  const [loadingBusiness, setLoadingBusiness] = useState(
    Boolean(selectedBusinessId),
  );
  const [activeModule, setActiveModule] =
    useState<CommercialWorkspaceModule>("chat");
  const [moduleReloadKey, setModuleReloadKey] = useState(0);

  const loadSelectedBusiness = useCallback(async () => {
    if (!selectedBusinessId) {
      setSelectedBusiness(null);
      setSelectedBusinessError(null);
      setLoadingBusiness(false);
      return;
    }

    setLoadingBusiness(true);

    try {
      const response = await loadOwnedCommercialProfile(selectedBusinessId);

      setSelectedBusiness(response.profile);
      setSelectedBusinessError(null);
    } catch (loadError) {
      setSelectedBusiness(null);
      setSelectedBusinessError(toCommercialUiError(loadError).message);
    } finally {
      setLoadingBusiness(false);
    }
  }, [selectedBusinessId]);

  useFocusEffect(
    useCallback(() => {
      void loadSelectedBusiness();
    }, [loadSelectedBusiness]),
  );

  useEffect(() => {
    setActiveModule("chat");
    setModuleReloadKey((current) => current + 1);
  }, [selectedBusinessId]);

  const handleBusinessAction = useCallback(() => {
    router.push(buddyServicesMyBusinessesRoute());
  }, [router]);

  const openCommercialModule = useCallback((
    nextModule: CommercialWorkspaceModule,
  ) => {
    setActiveModule(nextModule);
    setModuleReloadKey((current) => current + 1);
  }, []);

  const renderModuleIcon = useCallback((
    module: CommercialWorkspaceModule,
    isActive: boolean,
  ) => {
    if (module === "chat") {
      return (
        <MessageCircle
          color={isActive ? "#FFFFFF" : "#7C6AA5"}
          size={21}
          strokeWidth={2.1}
        />
      );
    }

    if (module === "requests") {
      return (
        <ClipboardList
          color={isActive ? "#FFFFFF" : "#6D4DA0"}
          size={22}
          strokeWidth={2.15}
        />
      );
    }

    if (module === "catalogs") {
      return (
        <PackageSearch
          color={isActive ? "#FFFFFF" : "#C58B72"}
          size={20}
          strokeWidth={2.1}
        />
      );
    }

    return (
      <Wrench
        color={isActive ? "#FFFFFF" : "#5D9D8C"}
        size={20}
        strokeWidth={2.1}
      />
    );
  }, []);

  const renderWorkspace = () => {
    if (loadingBusiness) {
      return (
        <View style={localStyles.centeredState}>
          <ActivityIndicator color="#7427D5" size="large" />
          <Text style={localStyles.centeredStateText}>
            Preparando el espacio de trabajo…
          </Text>
        </View>
      );
    }

    if (!selectedBusinessId || selectedBusinessError || !selectedBusiness) {
      return (
        <View style={localStyles.centeredState}>
          <Store color="#7427D5" size={36} />

          <Text style={localStyles.emptyStateTitle}>
            Selecciona un negocio
          </Text>

          <Text style={localStyles.emptyStateText}>
            {selectedBusinessError
              ? selectedBusinessError
              : "Elige el negocio que quieres administrar para abrir sus chats, solicitudes y catálogos."}
          </Text>

          <TouchableOpacity
            accessibilityLabel="Abrir mis negocios"
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={handleBusinessAction}
            style={localStyles.primaryButton}
          >
            <Text style={localStyles.primaryButtonText}>
              Ver mis negocios
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    const config = COMMERCIAL_MODULES[activeModule];
    const rootParams = activeModule === "chat"
      ? {
          businessId: selectedBusinessId,
          context: "commercial",
        }
      : {
          businessId: selectedBusinessId,
        };

    return (
      <View style={localStyles.workspace}>
        <EmbeddedModuleHost
          key={`${activeModule}-${moduleReloadKey}-${selectedBusinessId}`}
          moduleId="chat"
          rootParams={rootParams}
          rootPathOverride={config.rootPath}
        />
      </View>
    );
  };

  return (
    <ScreenSafeArea style={beeStyles.safeArea}>
      <View style={beeStyles.container}>
        <View style={localStyles.headerWrap}>
          <BeeServicesHeader
            title="BuddyService"
            onBackToMainPress={() => router.replace("/(main)")}
            onChangeBusinessPress={
              selectedBusiness || selectedBusinessError
                ? handleBusinessAction
                : undefined
            }
            onMenuPress={() => setSideMenuVisible(true)}
            selectedBusinessError={selectedBusinessError}
            selectedBusinessName={selectedBusiness?.display_name}
          />

          <View style={localStyles.moduleCaption}>
            <Text style={localStyles.moduleCaptionText}>
              {moduleLabel(activeModule)}
            </Text>

            {selectedBusiness ? (
              <Text
                numberOfLines={1}
                style={localStyles.businessCaptionText}
              >
                {selectedBusiness.display_name}
              </Text>
            ) : null}
          </View>
        </View>

        {renderWorkspace()}

        <View
          accessibilityLabel="Menú de trabajo del negocio"
          style={localStyles.floatingBusinessMenu}
        >
          {(
            ["chat", "requests", "catalogs", "manage"] as CommercialWorkspaceModule[]
          ).map((module) => {
            const config = COMMERCIAL_MODULES[module];
            const isActive = activeModule === module;

            return (
              <TouchableOpacity
                key={module}
                accessibilityHint={config.accessibilityHint}
                accessibilityLabel={config.accessibilityLabel}
                accessibilityRole="button"
                activeOpacity={0.78}
                onPress={() => openCommercialModule(module)}
                style={[
                  localStyles.floatingBusinessAction,
                  localStyles[`${module}BusinessAction`],
                  isActive && localStyles.floatingBusinessActionActive,
                ]}
              >
                {renderModuleIcon(module, isActive)}
              </TouchableOpacity>
            );
          })}
        </View>

        <HomeSideMenu
          onClose={() => setSideMenuVisible(false)}
          visible={sideMenuVisible}
        />
      </View>
    </ScreenSafeArea>
  );
}

const localStyles = StyleSheet.create({
  headerWrap: {
    backgroundColor: "#FFFCF9",
    borderBottomColor: "#EEE7F3",
    borderBottomWidth: 1,
  },
  moduleCaption: {
    alignItems: "baseline",
    flexDirection: "row",
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  moduleCaptionText: {
    color: "#38294E",
    fontSize: 14,
    fontWeight: "900",
  },
  businessCaptionText: {
    color: "#836C98",
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
  workspace: {
    backgroundColor: "#F8F7FC",
    flex: 1,
    paddingBottom: 94,
  },
  centeredState: {
    alignItems: "center",
    backgroundColor: "#F8F7FC",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 94,
  },
  centeredStateText: {
    color: "#6D5C7B",
    fontSize: 14,
    marginTop: 14,
    textAlign: "center",
  },
  emptyStateTitle: {
    color: "#38294E",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 15,
    textAlign: "center",
  },
  emptyStateText: {
    color: "#6D5C7B",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#7427D5",
    borderRadius: 14,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  floatingBusinessMenu: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderColor: "#E7DFF5",
    borderRadius: 28,
    borderWidth: 1,
    bottom: 20,
    elevation: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 13,
    paddingVertical: 12,
    position: "absolute",
    shadowColor: "#8D73C9",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.22,
    shadowRadius: 13,
    width: "70%",
    zIndex: 20,
  },
  floatingBusinessAction: {
    alignItems: "center",
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  floatingBusinessActionActive: {
    backgroundColor: "#7427D5",
    elevation: 4,
    shadowColor: "#7427D5",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    transform: [
      {
        translateY: -5,
      },
    ],
  },
  chatBusinessAction: {
    backgroundColor: "#F1ECFA",
    borderColor: "#E2D8F2",
    borderWidth: 1,
  },
  requestsBusinessAction: {
    backgroundColor: "#EEE7F8",
    borderColor: "#E0D5F2",
    borderWidth: 1,
  },
  catalogsBusinessAction: {
    backgroundColor: "#FBEDE7",
    borderColor: "#F5DCD1",
    borderWidth: 1,
  },
  manageBusinessAction: {
    backgroundColor: "#E6F4EF",
    borderColor: "#D2EAE1",
    borderWidth: 1,
  },
});
