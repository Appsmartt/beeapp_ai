import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Construction } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import ScreenSafeArea from '../layout/ScreenSafeArea';

interface CommercialPendingScreenProps {
  title: string;
  description: string;
}

export default function CommercialPendingScreen({
  title,
  description,
}: CommercialPendingScreenProps) {
  const router = useRouter();

  return (
    <ScreenSafeArea
      style={{
        backgroundColor: '#FFFCF9',
        flex: 1,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: 28,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#F6EAFE',
            borderRadius: 30,
            height: 60,
            justifyContent: 'center',
            width: 60,
          }}
        >
          <Construction
            color="#7427D5"
            size={28}
          />
        </View>

        <Text
          style={{
            color: '#261743',
            fontSize: 21,
            fontWeight: '800',
            marginTop: 18,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            color: '#786593',
            fontSize: 14,
            lineHeight: 21,
            marginTop: 10,
            textAlign: 'center',
          }}
        >
          {description}
        </Text>

        <TouchableOpacity
          accessibilityLabel="Volver a BuddyServices"
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{
            alignItems: 'center',
            backgroundColor: '#7427D5',
            borderRadius: 14,
            flexDirection: 'row',
            marginTop: 26,
            minHeight: 46,
            paddingHorizontal: 18,
          }}
        >
          <ArrowLeft
            color="#FFFFFF"
            size={18}
          />

          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '700',
              marginLeft: 8,
            }}
          >
            Volver
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenSafeArea>
  );
}
