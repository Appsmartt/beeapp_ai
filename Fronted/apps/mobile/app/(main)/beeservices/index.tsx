import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import HomeSideMenu from '../../../src/components/home/HomeSideMenu';
import BeeServicesHeader from '../../../src/components/beeservices/BeeServicesHeader';
import BeeServicesAiSearchCard from '../../../src/components/beeservices/BeeServicesAiSearchCard';
import BeeServicesBusinessCard from '../../../src/components/beeservices/BeeServicesBusinessCard';
import BeeServicesQuickActions from '../../../src/components/beeservices/BeeServicesQuickActions';
import BeeServicesCategoryGrid from '../../../src/components/beeservices/BeeServicesCategoryGrid';
import { styles } from '../../../src/components/beeservices/beeServicesStyles';

export default function BeeServicesScreen() {
    const [sideMenuVisible, setSideMenuVisible] = useState(false);

    return (
        <ScreenSafeArea style={styles.safeArea}>
        <View style={styles.container}>
            <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            >
            <BeeServicesHeader
                onMenuPress={() => setSideMenuVisible(true)}
            />

            <BeeServicesAiSearchCard
                onPressSearch={() => {
                // Búsqueda visual por ahora.
                }}
                onPressVoice={() => {
                // Entrada de voz visual por ahora.
                }}
            />

            <BeeServicesBusinessCard />

            <BeeServicesQuickActions
                onPressAction={() => {
                // Gestión rápida visual por ahora.
                }}
            />

            <BeeServicesCategoryGrid
                onPressCategory={() => {
                // Navegación de categorías pendiente.
                }}
            />

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                Impulsando economías locales con BeeApp AI
                </Text>

                <View style={styles.footerLine} />
            </View>
            </ScrollView>

            <HomeSideMenu
            visible={sideMenuVisible}
            onClose={() => setSideMenuVisible(false)}
            />
        </View>
        </ScreenSafeArea>
    );
}