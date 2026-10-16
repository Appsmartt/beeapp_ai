import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeft, Search } from 'lucide-react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import ContactsListView from '../../../src/components/contacts/ContactsListView';
import { contactsStyles as styles } from '../../../src/components/contacts/contactsStyles';

export default function ContactsScreen() {
  const router = useModuleNav();

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
            onPress={() => router.push('/(main)/chat/people')}
            accessibilityLabel="Buscar personas"
          >
            <Search size={20} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

        <ContactsListView />

        {!router.embedded && <FloatingTabBar activeTab="explore" />}
      </View>
    </ScreenSafeArea>
  );
}
