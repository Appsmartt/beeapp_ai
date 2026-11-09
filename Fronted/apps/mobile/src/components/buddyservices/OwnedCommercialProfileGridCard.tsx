import {
  ActivityIndicator,
  Platform,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BadgeCheck,
  BarChart3,
  ChevronRight,
  Eye,
  FilePenLine,
  MapPin,
  MoreHorizontal,
  Store,
  Tag,
} from "lucide-react-native";

import type { CommercialOwnedProfile } from "@beeapp/shared-types";

import CommercialLogoAvatar from "./CommercialLogoAvatar";
import { myBusinessesVisual as v } from "./myBusinessesVisual";

interface OwnedCommercialProfileGridCardProps {
  profile: CommercialOwnedProfile;
  isUpdating?: boolean;
  onPress: () => void;
  onEdit: () => void;
  onView: () => void;
  onTogglePublication?: () => void;
  onMoreActions?: () => void;
}

export function getOwnedProfileCategoryLabel(
  profile: CommercialOwnedProfile,
): string {
  const categoryName = profile.categories?.[0]?.category?.name?.trim();
  if (categoryName) {
    return categoryName;
  }

  const customActivity = profile.custom_activity_text?.trim();
  if (customActivity) {
    return customActivity;
  }

  if (profile.offer_type === "products") {
    return "Productos";
  }

  if (profile.offer_type === "services") {
    return "Servicios";
  }

  return "Otros";
}

function getPublicationHeadline(profile: CommercialOwnedProfile): string {
  if (profile.publication_status === "published") {
    return "Publicado";
  }

  if (profile.publication_status === "paused") {
    return "Pausado";
  }

  if (profile.publication_status === "archived") {
    return "Desactivado";
  }

  return "Suspendido";
}

export default function OwnedCommercialProfileGridCard({
  profile,
  isUpdating = false,
  onPress,
  onEdit,
  onView,
  onTogglePublication,
  onMoreActions,
}: OwnedCommercialProfileGridCardProps) {
  const isArchived = profile.publication_status === "archived";
  const isPaused = profile.publication_status === "paused";
  const isSuspended = profile.publication_status === "suspended";
  const isPublished = profile.publication_status === "published";
  const isLive = isPublished && profile.is_available;
  const canTogglePublication = Boolean(onTogglePublication && !isSuspended);
  const categoryLabel = getOwnedProfileCategoryLabel(profile);
  const isVerified = profile.verification_status === "verified"
    && profile.verification_badge_visible;

  const stateBackground = isLive ? v.publishedBg : "#FFF6E8";
  const stateColor = isLive ? v.publishedText : "#9A5B00";
  const stateIconBackground = isLive ? v.publishedIconBg : "#FFEFC9";

  const availabilitySubtitle = isLive
    ? "Disponible para clientes"
    : isPaused
      ? "Oculto para clientes"
      : isArchived
        ? "No visible para clientes"
        : "No disponible para clientes";

  return (
    <View
      style={{
        backgroundColor: v.cardBg,
        borderColor: v.cardBorder,
        borderRadius: v.cardRadius,
        borderWidth: 1,
        overflow: "hidden",
        shadowColor: v.cardShadow,
        shadowOffset: { height: 4, width: 0 },
        shadowOpacity: 0.07,
        shadowRadius: 9,
        elevation: 2,
      }}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <CommercialLogoAvatar
            displayName={profile.display_name}
            logoFileId={profile.logo_file_id}
            logoUrl={profile.logo_url}
            rectangleAspect="square"
            shape="rectangle"
            size={v.logoSize}
          />

          <View style={{ flex: 1, marginLeft: 14, minWidth: 0 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  flex: 1,
                  flexDirection: "row",
                  paddingRight: 4,
                }}
              >
                <Text
                  numberOfLines={2}
                  style={{
                    color: v.name,
                    flexShrink: 1,
                    fontSize: v.nameSize,
                    fontWeight: "800",
                    letterSpacing: -0.3,
                    lineHeight: 23,
                  }}
                >
                  {profile.display_name}
                </Text>
                {isVerified ? (
                  <BadgeCheck
                    accessibilityLabel="Negocio verificado"
                    color="#5B2DC7"
                    fill="#EDE2FF"
                    size={18}
                    style={{ marginLeft: 6 }}
                  />
                ) : null}
              </View>

              <TouchableOpacity
                accessibilityLabel={`Más opciones de ${profile.display_name}`}
                accessibilityRole="button"
                activeOpacity={0.75}
                hitSlop={{ bottom: 10, left: 10, right: 10, top: 10 }}
                onPress={onMoreActions ?? onEdit}
                style={{
                  alignItems: "center",
                  height: 24,
                  justifyContent: "center",
                  width: 24,
                }}
              >
                <MoreHorizontal color="#A8B0C3" size={22} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                marginTop: 6,
              }}
            >
              <MapPin color={v.meta} size={13} strokeWidth={2.2} />

              <Text
                numberOfLines={1}
                style={{
                  color: v.meta,
                  flex: 1,
                  fontSize: v.metaSize,
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
                backgroundColor: v.categoryBg,
                borderRadius: 999,
                flexDirection: "row",
                marginTop: 10,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Tag color={v.categoryText} size={12} strokeWidth={2.4} />

              <Text
                numberOfLines={1}
                style={{
                  color: v.categoryText,
                  fontSize: 11,
                  fontWeight: "700",
                  marginLeft: 5,
                  maxWidth: 150,
                }}
              >
                {categoryLabel}
              </Text>
            </View>
          </View>
        </View>

        {profile.description?.trim() ? (
          <Text
            numberOfLines={2}
            style={{
              color: v.slogan,
              fontSize: v.sloganSize,
              fontStyle: "italic",
              lineHeight: 19,
              marginTop: 14,
            }}
          >
            {profile.description}
          </Text>
        ) : null}
      </View>

      <View
        style={{
          alignItems: "center",
          backgroundColor: stateBackground,
          borderRadius: 14,
          flexDirection: "row",
          marginHorizontal: 16,
          marginTop: 14,
          minHeight: 52,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: stateIconBackground,
            borderRadius: 999,
            height: 34,
            justifyContent: "center",
            width: 34,
          }}
        >
          <Store color={stateColor} size={17} strokeWidth={2.1} />
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={{
              color: stateColor,
              fontSize: 13,
              fontWeight: "800",
            }}
          >
            {getPublicationHeadline(profile)}
          </Text>

          <Text
            style={{
              color: stateColor,
              fontSize: 11,
              fontWeight: "600",
              marginTop: 2,
              opacity: 0.92,
            }}
          >
            {availabilitySubtitle}
          </Text>
        </View>

        {canTogglePublication ? (
          isUpdating ? (
            <ActivityIndicator color={stateColor} size="small" />
          ) : (
            <Switch
              accessibilityLabel={`Cambiar visibilidad de ${profile.display_name}`}
              onValueChange={() => {
                onTogglePublication?.();
              }}
              style={
                Platform.OS === "android"
                  ? { transform: [{ scaleX: 1.05 }, { scaleY: 1.05 }] }
                  : undefined
              }
              thumbColor="#FFFFFF"
              ios_backgroundColor={v.publishedSwitchOff}
              trackColor={{
                false: v.publishedSwitchOff,
                true: isLive ? v.publishedSwitchTrackOn : v.publishedSwitchOff,
              }}
              value={isLive}
            />
          )
        ) : null}
      </View>

      {isSuspended ? (
        <View
          style={{
            backgroundColor: "#FFF4F2",
            marginHorizontal: 16,
            marginTop: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              color: "#B42318",
              fontSize: 11,
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
          flexDirection: "row",
          gap: 10,
          marginTop: 14,
          paddingBottom: 14,
          paddingHorizontal: 14,
        }}
      >
        <TouchableOpacity
          accessibilityLabel={`Administrar ${profile.display_name}`}
          accessibilityRole="button"
          activeOpacity={0.88}
          onPress={onPress}
          style={{
            alignItems: "center",
            backgroundColor: v.primaryBtn,
            borderRadius: v.primaryBtnRadius,
            flex: 1,
            flexDirection: "row",
            minHeight: 48,
            paddingHorizontal: 14,
          }}
        >
          <BarChart3 color="#FFFFFF" size={18} strokeWidth={2.4} />

          <Text
            numberOfLines={1}
            style={{
              color: "#FFFFFF",
              flex: 1,
              fontSize: 14,
              fontWeight: "800",
              marginLeft: 8,
            }}
          >
            Administrar
          </Text>

          <View
            style={{
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.22)",
              borderRadius: 999,
              height: 26,
              justifyContent: "center",
              width: 26,
            }}
          >
            <ChevronRight color="#FFFFFF" size={16} strokeWidth={2.6} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel={`Editar ${profile.display_name}`}
          accessibilityRole="button"
          activeOpacity={0.88}
          onPress={onEdit}
          style={{
            alignItems: "center",
            backgroundColor: v.secondaryBtnBg,
            borderColor: v.secondaryBtnBorder,
            borderRadius: v.primaryBtnRadius,
            borderWidth: 1,
            height: 48,
            justifyContent: "center",
            width: 52,
          }}
        >
          <FilePenLine
            color={v.secondaryBtnIcon}
            size={20}
            strokeWidth={2.2}
          />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel={`Ver ${profile.display_name}`}
          accessibilityRole="button"
          activeOpacity={0.88}
          onPress={onView}
          style={{
            alignItems: "center",
            backgroundColor: v.secondaryBtnBg,
            borderColor: v.secondaryBtnBorder,
            borderRadius: v.primaryBtnRadius,
            borderWidth: 1,
            height: 48,
            justifyContent: "center",
            width: 52,
          }}
        >
          <Eye color={v.secondaryBtnIcon} size={20} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
