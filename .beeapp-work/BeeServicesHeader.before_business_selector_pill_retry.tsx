import { View, Text, TouchableOpacity } from "react-native";
import { ChevronLeft, Menu } from "lucide-react-native";
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
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              marginTop: 2,
            }}
          >
            <View
              style={{
                backgroundColor: selectedBusinessError ? "#C8841A" : "#7C5FC9",
                borderRadius: 99,
                height: 6,
                marginRight: 6,
                width: 6,
              }}
            />

            <Text
              numberOfLines={1}
              style={[
                styles.headerSubtitle,
                {
                  flex: 1,
                  fontSize: 11,
                  lineHeight: 16,
                  marginTop: 0,
                },
              ]}
            >
              {selectedBusinessName || "No fue posible cargar el negocio"}
            </Text>

            {onChangeBusinessPress ? (
              <TouchableOpacity
                accessibilityLabel="Cambiar negocio seleccionado"
                accessibilityRole="button"
                activeOpacity={0.76}
                hitSlop={8}
                onPress={onChangeBusinessPress}
                style={{
                  marginLeft: 8,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    color: "#7567D9",
                    fontSize: 11,
                    fontWeight: "800",
                  }}
                >
                  Cambiar
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
