import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import {
  CheckCircle2,
  CirclePause,
  CircleX,
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
  onTogglePublication,
}: OwnedCommercialProfileGridCardProps) {
  const publication = getPublicationMeta(profile);
  const PublicationIcon = publication.Icon;
  const isArchived = profile.publication_status === "archived";
  const isPaused = profile.publication_status === "paused";
  const isSuspended = profile.publication_status === "suspended";
  const canTogglePublication = Boolean(onTogglePublication && !isSuspended);
  const actionLabel = isArchived
    ? "Restaurar"
    : isPaused
      ? "Activar"
      : "Desactivar";
  const ActionIcon = isArchived || isPaused ? Play : Power;
  const actionColor = isArchived || isPaused ? "#177245" : "#B42318";
  const actionBackground = isArchived || isPaused ? "#E9F7EE" : "#FFF0F0";

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderColor: isArchived ? "#DDD6E3" : "#E8E1F0",
        borderRadius: 22,
        borderWidth: 1,
        minHeight: 238,
        overflow: "hidden",
        width: "48%",
      }}
    >
      <TouchableOpacity
        accessibilityHint="Abre la administración de este negocio"
        accessibilityLabel={`Gestionar ${profile.display_name}`}
        accessibilityRole="button"
        activeOpacity={0.82}
        onPress={onPress}
        style={{
          flex: 1,
          padding: 14,
        }}
      >
        <View
          style={{
            alignItems: "flex-start",
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <CommercialLogoAvatar
            displayName={profile.display_name}
            logoFileId={profile.logo_file_id}
            logoUrl={profile.logo_url}
            size={48}
          />

          {profile.verification_status === "verified" ? (
            <View
              accessibilityLabel="Negocio verificado"
              style={{
                alignItems: "center",
                backgroundColor: "#E9F7EE",
                borderRadius: 10,
                height: 28,
                justifyContent: "center",
                width: 28,
              }}
            >
              <CheckCircle2 color="#177245" size={16} />
            </View>
          ) : null}
        </View>

        <Text
          numberOfLines={2}
          style={{
            color: "#261743",
            fontSize: 15,
            fontWeight: "900",
            lineHeight: 20,
            marginTop: 13,
          }}
        >
          {profile.display_name}
        </Text>

        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            marginTop: 7,
          }}
        >
          <MapPin color="#877599" size={13} />

          <Text
            numberOfLines={1}
            style={{
              color: "#786593",
              flex: 1,
              fontSize: 11,
              marginLeft: 4,
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
            marginTop: 14,
            paddingHorizontal: 8,
            paddingVertical: 5,
          }}
        >
          <PublicationIcon color={publication.color} size={12} />

          <Text
            style={{
              color: publication.color,
              fontSize: 10,
              fontWeight: "800",
              marginLeft: 4,
            }}
          >
            {publication.label}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          style={{
            color: profile.is_available ? "#177245" : "#9A5B00",
            fontSize: 11,
            fontWeight: "700",
            lineHeight: 16,
            marginTop: 11,
          }}
        >
          {profile.is_available
            ? "Disponible para clientes"
            : "No disponible para clientes"}
        </Text>
      </TouchableOpacity>

      {isSuspended ? (
        <View
          style={{
            backgroundColor: "#FFF4F2",
            borderTopColor: "#F5C2C7",
            borderTopWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text
            numberOfLines={2}
            style={{
              color: "#B42318",
              fontSize: 10,
              fontWeight: "800",
              lineHeight: 14,
              textAlign: "center",
            }}
          >
            Estado suspendido
          </Text>
        </View>
      ) : canTogglePublication ? (
        <View
          style={{
            borderTopColor: "#F0EBF5",
            borderTopWidth: 1,
            padding: 10,
          }}
        >
          <TouchableOpacity
            accessibilityLabel={`${actionLabel} ${profile.display_name}`}
            accessibilityRole="button"
            activeOpacity={0.82}
            disabled={isUpdating}
            onPress={onTogglePublication}
            style={{
              alignItems: "center",
              backgroundColor: actionBackground,
              borderRadius: 11,
              flexDirection: "row",
              justifyContent: "center",
              minHeight: 36,
              opacity: isUpdating ? 0.62 : 1,
              paddingHorizontal: 8,
            }}
          >
            {isUpdating ? (
              <ActivityIndicator color={actionColor} size="small" />
            ) : (
              <ActionIcon color={actionColor} size={14} />
            )}

            <Text
              style={{
                color: actionColor,
                fontSize: 11,
                fontWeight: "800",
                marginLeft: 5,
              }}
            >
              {isUpdating ? "Actualizando" : actionLabel}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
