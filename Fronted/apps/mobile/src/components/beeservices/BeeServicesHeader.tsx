import { Text, TouchableOpacity, View } from "react-native";
import {
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  Menu,
  Store,
} from "lucide-react-native";
import { colors } from "@beeapp/design-system";

import { styles } from "./beeServicesStyles";

interface BeeServicesHeaderProps {
  onBackToMainPress: () => void;
  onMenuPress: () => void;
  title?: string;
  selectedBusinessName?: string | null;
  selectedBusinessError?: string | null;
  onChangeBusinessPress?: () => void;
}

export default function BeeServicesHeader({
  onBackToMainPress,
  onMenuPress,
  title = "BuddyServices",
  selectedBusinessName = null,
  selectedBusinessError = null,
  onChangeBusinessPress,
}: BeeServicesHeaderProps) {
  const hasSelectedBusinessContext = Boolean(
    selectedBusinessName || selectedBusinessError,
  );
  const hasBusinessError = Boolean(selectedBusinessError);
  const selectorLabel = selectedBusinessName
    ? `Cambiar negocio: ${selectedBusinessName}`
    : "Elegir otro negocio";
  const selectorText = selectedBusinessName || "Elegir otro negocio";

  return (
    <View style={styles.header}>
      <TouchableOpacity
        accessibilityLabel="Volver al menú principal"
        accessibilityRole="button"
        activeOpacity={0.76}
        hitSlop={10}
        onPress={onBackToMainPress}
        style={styles.headerBackButton}
      >
        <ChevronLeft color="#7567D9" size={23} strokeWidth={2.7} />
      </TouchableOpacity>

      <View style={styles.headerTextColumn}>
        <Text style={styles.headerTitle}>{title}</Text>

        {hasSelectedBusinessContext ? (
          <TouchableOpacity
            accessibilityLabel={selectorLabel}
            accessibilityRole="button"
            activeOpacity={0.78}
            disabled={!onChangeBusinessPress}
            onPress={onChangeBusinessPress}
            style={{
              alignItems: "center",
              alignSelf: "flex-start",
              backgroundColor: hasBusinessError ? "#FFF6E6" : "#F3EEFC",
              borderColor: hasBusinessError ? "#F0D39A" : "#E3D7F5",
              borderRadius: 99,
              borderWidth: 1,
              flexDirection: "row",
              marginTop: 4,
              maxWidth: "100%",
              minHeight: 27,
              paddingBottom: 3,
              paddingLeft: 4,
              paddingRight: 7,
              paddingTop: 3,
            }}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor: hasBusinessError ? "#F9E4B8" : "#E3D7F5",
                borderRadius: 99,
                height: 19,
                justifyContent: "center",
                width: 19,
              }}
            >
              {hasBusinessError ? (
                <CircleAlert color="#A76B00" size={12} strokeWidth={2.4} />
              ) : (
                <Store color="#7567D9" size={12} strokeWidth={2.35} />
              )}
            </View>

            <Text
              numberOfLines={1}
              style={{
                color: hasBusinessError ? "#875700" : "#5E4A83",
                flexShrink: 1,
                fontSize: 11,
                fontWeight: "800",
                marginHorizontal: 6,
              }}
            >
              {selectorText}
            </Text>

            <ChevronDown
              color={hasBusinessError ? "#A76B00" : "#7567D9"}
              size={14}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        ) : (
          <Text style={styles.headerSubtitle}>
            Conecta necesidades con soluciones
          </Text>
        )}
      </View>

      <TouchableOpacity
        accessibilityLabel="Abrir menú"
        accessibilityRole="button"
        activeOpacity={0.7}
        hitSlop={10}
        onPress={onMenuPress}
        style={styles.headerMenuButton}
      >
        <Menu color={colors.neutral.text} size={27} strokeWidth={2.2} />
      </TouchableOpacity>
    </View>
  );
}
