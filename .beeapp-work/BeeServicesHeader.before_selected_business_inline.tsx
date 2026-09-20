import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft, Menu } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { styles } from './beeServicesStyles';

interface BeeServicesHeaderProps {
  onBackToMainPress: () => void;
  onMenuPress: () => void;
  title?: string;
}

export default function BeeServicesHeader({
  onBackToMainPress,
  onMenuPress,
  title = 'BuddyServices',
}: BeeServicesHeaderProps) {
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
        <ChevronLeft
          color="#7567D9"
          size={23}
          strokeWidth={2.7}
        />
      </TouchableOpacity>

      <View style={styles.headerTextColumn}>
        <Text style={styles.headerTitle}>{title}</Text>

        <Text style={styles.headerSubtitle}>
          Conecta necesidades con soluciones
        </Text>
      </View>

      <TouchableOpacity
        accessibilityLabel="Abrir menú"
        accessibilityRole="button"
        activeOpacity={0.7}
        hitSlop={10}
        onPress={onMenuPress}
        style={styles.headerMenuButton}
      >
        <Menu
          color={colors.neutral.text}
          size={27}
          strokeWidth={2.2}
        />
      </TouchableOpacity>
    </View>
  );
}
