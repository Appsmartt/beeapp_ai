import {
  useState,
} from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Store,
  ShoppingBag,
  Sparkles,
  UserRound,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

import VoiceAssistantScreen from './assistant/VoiceAssistantScreen';

export default function VoiceAssistantFab() {
  const [voiceVisible, setVoiceVisible] = useState(false);

  return (
    <>
      <View
        style={styles.floatingMenu}
        accessibilityLabel="Accesos rápidos"
      >
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.profileButton,
          ]}
          activeOpacity={0.76}
          accessibilityLabel="Perfil"
          accessibilityHint="Próximamente"
        >
          <UserRound
            size={22}
            color="#7C6AA5"
            strokeWidth={2.1}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.aiButton,
          ]}
          activeOpacity={0.8}
          onPress={() => setVoiceVisible(true)}
          accessibilityLabel="Abrir asistente de IA"
        >
          <Sparkles
            size={23}
            color={colors.neutral.white}
            strokeWidth={2.2}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.shopButton,
          ]}
          activeOpacity={0.76}
          accessibilityLabel="Comprar"
          accessibilityHint="Próximamente"
        >
          <ShoppingBag
            size={20}
            color="#C58B72"
            strokeWidth={2.1}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.businessButton,
          ]}
          activeOpacity={0.76}
          accessibilityLabel="Negocio"
          accessibilityHint="Próximamente"
        >
          <Store
            size={20}
            color="#5D9D8C"
            strokeWidth={2.1}
          />
        </TouchableOpacity>
      </View>

      <VoiceAssistantScreen
        visible={voiceVisible}
        onClose={() => setVoiceVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  floatingMenu: {
    alignItems: 'center',
    alignSelf: 'center',
    width: '70%',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#E7DFF5',
    borderRadius: 28,
    borderWidth: 1,
    bottom: 20,
    elevation: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 12,
    position: 'absolute',
    shadowColor: '#8D73C9',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.22,
    shadowRadius: 13,
    zIndex: 999,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  profileButton: {
    backgroundColor: '#F1ECFA',
    borderColor: '#E2D8F2',
    borderWidth: 1,
  },
  aiButton: {
    backgroundColor: '#8D73C9',
    elevation: 4,
    shadowColor: '#8D73C9',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6,
    transform: [
      {
        translateY: -5,
      },
    ],
  },
  shopButton: {
    backgroundColor: '#FBEDE7',
    borderColor: '#F5DCD1',
    borderWidth: 1,
  },
  businessButton: {
    backgroundColor: '#E6F4EF',
    borderColor: '#D2EAE1',
    borderWidth: 1,
  },
});
