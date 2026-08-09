import { View, Text, TouchableOpacity } from 'react-native';
import { Menu } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { styles } from './beeServicesStyles';

interface BeeServicesHeaderProps {
    onMenuPress: () => void;
}

export default function BeeServicesHeader({
    onMenuPress,
    }: BeeServicesHeaderProps) {
    return (
        <View style={styles.header}>
        <View style={styles.headerTextColumn}>
            <Text style={styles.headerTitle}>BeeServices</Text>

            <Text style={styles.headerSubtitle}>
            Conecta necesidades con soluciones
            </Text>
        </View>

        <TouchableOpacity
            onPress={onMenuPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Abrir menú"
            hitSlop={10}
            style={{
            width: 42,
            height: 42,
            alignItems: 'center',
            justifyContent: 'center',
            }}
        >
            <Menu
            size={27}
            color={colors.neutral.text}
            strokeWidth={2.2}
            />
        </TouchableOpacity>
        </View>
    );
}