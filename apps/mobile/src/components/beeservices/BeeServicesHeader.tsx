import { View, Text } from 'react-native';
import { BEE_SERVICES_USER } from '../../mocks/beeServicesExplore';
import { styles } from './beeServicesStyles';

interface BeeServicesHeaderProps {
    initials?: string;
}

export default function BeeServicesHeader({
    initials = BEE_SERVICES_USER.initials,
    }: BeeServicesHeaderProps) {
    return (
        <View style={styles.header}>
        <View style={styles.headerTextColumn}>
            <Text style={styles.headerTitle}>BeeServices</Text>
            <Text style={styles.headerSubtitle}>
            Conecta necesidades con soluciones
            </Text>
        </View>

        <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
        </View>
        </View>
    );
}