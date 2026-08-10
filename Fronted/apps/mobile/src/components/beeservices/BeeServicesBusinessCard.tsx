import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight, Store } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { styles } from './beeServicesStyles';

interface BeeServicesBusinessCardProps {
    onPress?: () => void;
}

export default function BeeServicesBusinessCard({
    onPress,
    }: BeeServicesBusinessCardProps) {
    const content = (
        <>
        <View style={styles.businessIconWrap}>
            <Store size={25} color="#7B2DD9" />
        </View>

        <View style={styles.businessTextColumn}>
            <Text style={styles.businessTitle}>Gestiona tu negocio</Text>

            <Text style={styles.businessDescription}>
            Crea tu perfil, agrega servicios y recibe solicitudes.
            </Text>
        </View>

        <View style={styles.businessArrowButton}>
            <ChevronRight size={23} color={colors.neutral.white} />
        </View>
        </>
    );

    if (!onPress) {
        return <View style={styles.businessCard}>{content}</View>;
    }

    return (
        <TouchableOpacity
        style={styles.businessCard}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Gestiona tu negocio"
        >
        {content}
        </TouchableOpacity>
    );
}