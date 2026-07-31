import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, UserPlus } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import ContactsListView from '../../../src/components/contacts/ContactsListView';
import { contactsStyles as styles } from '../../../src/components/contacts/contactsStyles';

/**
 * Pantalla de Contactos. Ya no es un módulo del Home: la lista vive también
 * como pestaña dentro del módulo de Chat, y ambas comparten `ContactsListView`.
 */
export default function ContactsScreen() {
  const router = useModuleNav();
  const [creatingContact, setCreatingContact] = useState(false);

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {router.canGoBack && (
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                <ChevronLeft size={24} color={colors.neutral.text} />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>Contactos</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.7}
            onPress={() => setCreatingContact(true)}
            accessibilityLabel="Crear contacto"
          >
            <UserPlus size={20} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

        <ContactsListView
          creating={creatingContact}
          onCloseCreate={() => setCreatingContact(false)}
        />

        {!router.embedded && <FloatingTabBar activeTab="explore" />}
      </View>
    </ScreenSafeArea>
  );
}
