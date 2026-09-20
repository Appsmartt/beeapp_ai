import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CheckCircle2,
  CirclePause,
  CircleX,
  Eye,
  FilePenLine,
  LayoutDashboard,
  MapPin,
  Play,
  Power,
  Store,
} from "lucide-react-native";

import type { CommercialOwnedProfile } from "@beeapp/shared-types";

import CommercialLogoAvatar from "./CommercialLogoAvatar";

interface OwnedCommercialProfileGridCardProps {
  profile: CommercialOwnedProfile;
  isUpdating?: boolean;
  onPress: () => void;
  onEdit: () => void;
  onView: () => void;
  onTogglePublication?: () => void;
}

function getPublicationMeta(profile: CommercialOwnedProfile): {
  label: string;
  color: string;
  backgroundColor: string;
  Icon: typeof Store;
} {
  if (profile.publication_status === "published") {
    return {
      label: "Publicado",
      color: "#177245",
      backgroundColor: "#E9F7EE",
      Icon: Store,
    };
  }

  if (profile.publication_status === "paused") {
    return {
      label: "Pausado",
      color: "#9A5B00",
      backgroundColor: "#FFF4E0",
      Icon: CirclePause,
    };
  }

  if (profile.publication_status === "archived") {
    return {
      label: "Desactivado",
      color: "#6D6875",
      backgroundColor: "#F1EEF3",
      Icon: CircleX,
    };
  }

  return {
    label: "Suspendido",
    color: "#B42318",
    backgroundColor: "#FFF0F0",
    Icon: CircleX,
  };
}

export default function OwnedCommercialProfileGridCard({
  profile,
  isUpdating = false,
  onPress,
  onEdit,
  onView,
  onTogglePublication,
}: OwnedCommercialProfileGridCardProps) {
  const publication = getPublicationMeta(profile);
  const PublicationIcon = publication.Icon;
  const isArchived = profile.publication_status === "archived";
  const isPaused = profile.publication_status === "paused";
  const isSuspended = profile.publication_status === "suspended";
  const canTogglePublication = Boolean(onTogglePublication && !isSuspended);
  const statusActionLabel = isArchived
    ? "Restaurar"
    : isPaused
      ? "Publicar"
      : "Estado";
  const StatusActionIcon = isArchived || isPaused ? Play : Power;
  const stateColor = profile.is_available ? "#177245" : "#9A5B00";
  const stateBackground = profile.is_available ? "#EFFAF4" : "#FFF8E8";
  const stateIconBackground = profile.is_available ? "#DDF4E7" : "#FFF0C7";

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: isArchived ? "#D8C8EE" : "#E6DDF4",
        borderRadius: 24,
        borderWidth: 1,
        overflow: "hidden",
        shadowColor: "#261743",
        shadowOffset: {
          height: 8,
          width: 0,
        },
        shadowOpacity: 0.06,
        shadowRadius: 18,
      }}
    >
      <TouchableOpacity
        accessibilityHint="Abre la administración de este negocio"
        accessibilityLabel={`Administrar ${profile.display_name}`}
        accessibilityRole="button"
        activeOpacity={0.82}
        onPress={onPress}
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
        }}
      >
        <View
          style={{
            alignItems: "flex-start",
            flexDirection: "row",
          }}
        >
          <CommercialLogoAvatar
            displayName={profile.display_name}
            logoFileId={profile.logo_file_id}
            logoUrl={profile.logo_url}
            size={62}
          />

          <View
            style={{
              flex: 1,
              marginLeft: 12,
              minWidth: 0,
            }}
          >
            <View
              style={{
                alignItems: "flex-start",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text
                numberOfLines={2}
                style={{
                  color: "#261743",
                  flex: 1,
                  fontSize: 18,
                  fontWeight: "900",
                  letterSpacing: -0.25,
                  lineHeight: 23,
                  paddingRight: 8,
                }}
              >
                {profile.display_name}
              </Text>

              {profile.verification_status === "verified" ? (
                <View
                  accessibilityLabel="Negocio verificado"
                  style={{
                    alignItems: "center",
                    backgroundColor: "#E9F7EE",
                    borderRadius: 12,
                    height: 30,
                    justifyContent: "center",
                    width: 30,
                  }}
                >
                  <CheckCircle2 color="#177245" size={17} />
                </View>
              ) : null}
            </View>

            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                marginTop: 5,
              }}
            >
              <MapPin color="#786593" size={15} />

              <Text
                numberOfLines={1}
                style={{
                  color: "#786593",
                  flex: 1,
                  fontSize: 13,
                  marginLeft: 5,
                }}
              >
                {`${profile.city}, ${profile.country_code}`}
              </Text>
            </View>

            <View
              style={{
                alignSelf: "flex-start",
                alignItems: "center",
                backgroundColor: publication.backgroundColor,
                borderRadius: 99,
                flexDirection: "row",
                marginTop: 9,
                paddingHorizontal: 9,
                paddingVertical: 5,
              }}
            >
              <PublicationIcon color={publication.color} size={13} />

              <Text
                style={{
                  color: publication.color,
                  fontSize: 11,
                  fontWeight: "800",
                  marginLeft: 5,
                }}
              >
                {publication.label}
              </Text>
            </View>
          </View>
        </View>

        <Text
          numberOfLines={2}
          style={{
            color: "#786593",
            fontSize: 13,
            lineHeight: 19,
            marginTop: 14,
          }}
        >
          {profile.description}
        </Text>
      </TouchableOpacity>

      <View
        style={{
          alignItems: "center",
          backgroundColor: stateBackground,
          borderRadius: 14,
          flexDirection: "row",
          marginHorizontal: 16,
          marginTop: 14,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: stateIconBackground,
            borderRadius: 10,
            height: 30,
            justifyContent: "center",
            width: 30,
          }}
        >
          <Store color={stateColor} size={16} />
        </View>

        <View
          style={{
            flex: 1,
            marginLeft: 9,
          }}
        >
          <Text
            style={{
              color: stateColor,
              fontSize: 13,
              fontWeight: "900",
            }}
          >
            {profile.is_available ? "Disponible" : "No disponible"}
          </Text>

          <Text
            style={{
              color: profile.is_available ? "#4A7C61" : "#8A6A27",
              fontSize: 11,
              marginTop: 2,
            }}
          >
            {profile.is_available
              ? "Visible para clientes"
              : "No disponible para clientes"}
          </Text>
        </View>

        {canTogglePublication ? (
          <TouchableOpacity
            accessibilityLabel={`${statusActionLabel} ${profile.display_name}`}
            accessibilityRole="button"
            activeOpacity={0.82}
            disabled={isUpdating}
            onPress={onTogglePublication}
            style={{
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderColor: profile.is_available ? "#B7E4C7" : "#F4D88F",
              borderRadius: 10,
              borderWidth: 1,
              flexDirection: "row",
              minHeight: 34,
              opacity: isUpdating ? 0.62 : 1,
              paddingHorizontal: 10,
            }}
          >
            {isUpdating ? (
              <ActivityIndicator color={stateColor} size="small" />
            ) : (
              <StatusActionIcon color={stateColor} size={14} />
            )}

            <Text
              style={{
                color: stateColor,
                fontSize: 11,
                fontWeight: "800",
                marginLeft: 5,
              }}
            >
              {isUpdating ? "Actualizando" : statusActionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {isSuspended ? (
        <View
          style={{
            backgroundColor: "#FFF4F2",
            borderTopColor: "#F5C2C7",
            borderTopWidth: 1,
            marginTop: 14,
            paddingHorizontal: 16,
            paddingVertical: 11,
          }}
        >
          <Text
            style={{
              color: "#B42318",
              fontSize: 12,
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            Este negocio está suspendido y su estado no puede cambiarse aquí.
          </Text>
        </View>
      ) : null}

      <View
        style={{
          borderTopColor: "#E6DDF4",
          borderTopWidth: 1,
          flexDirection: "row",
          gap: 8,
          marginTop: 14,
          padding: 12,
        }}
      >
        <TouchableOpacity
          accessibilityLabel={`Administrar ${profile.display_name}`}
          accessibilityRole="button"
          activeOpacity={0.82}
          onPress={onPress}
          style={{
            alignItems: "center",
            backgroundColor: "#7427D5",
            borderRadius: 13,
            flex: 1.45,
            flexDirection: "row",
            justifyContent: "center",
            minHeight: 46,
            paddingHorizontal: 10,
          }}
        >
          <LayoutDashboard color="#FFFFFF" size={18} />

          <Text
            numberOfLines={1}
            style={{
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: "900",
              marginLeft: 7,
            }}
          >
            Administrar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel={`Editar ${profile.display_name}`}
          accessibilityRole="button"
          activeOpacity={0.82}
          onPress={onEdit}
          style={{
            alignItems: "center",
            backgroundColor: "#F5EEFC",
            borderColor: "#D8C8EE",
            borderRadius: 13,
            borderWidth: 1,
            flex: 1,
            justifyContent: "center",
            minHeight: 46,
          }}
        >
          <FilePenLine color="#7427D5" size={18} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel={`Ver ${profile.display_name}`}
          accessibilityRole="button"
          activeOpacity={0.82}
          onPress={onView}
          style={{
            alignItems: "center",
            backgroundColor: "#F5EEFC",
            borderColor: "#D8C8EE",
            borderRadius: 13,
            borderWidth: 1,
            flex: 1,
            justifyContent: "center",
            minHeight: 46,
          }}
        >
          <Eye color="#7427D5" size={19} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
