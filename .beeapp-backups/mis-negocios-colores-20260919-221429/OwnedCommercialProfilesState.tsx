import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Building2,
  RefreshCw,
} from 'lucide-react-native';

interface OwnedCommercialProfilesStateProps {
  kind: 'loading' | 'empty' | 'error';
  message?: string;
  onRetry?: () => void;
}

export default function OwnedCommercialProfilesState({
  kind,
  message,
  onRetry,
}: OwnedCommercialProfilesStateProps) {
  if (kind === 'loading') {
    return (
      <View
        style={{
          alignItems: 'center',
          paddingHorizontal: 30,
          paddingTop: 70,
        }}
      >
        <ActivityIndicator
          color="#7427D5"
          size="large"
        />

        <Text
          style={{
            color: '#786593',
            fontSize: 14,
            marginTop: 15,
            textAlign: 'center',
          }}
        >
          Cargando tus negocios…
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingTop: 70,
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
        <Building2
          color="#7427D5"
          size={28}
        />
      </View>

      <Text
        style={{
          color: '#261743',
          fontSize: 18,
          fontWeight: '800',
          marginTop: 18,
          textAlign: 'center',
        }}
      >
        {kind === 'empty'
          ? 'Aún no tienes negocios'
          : 'No fue posible cargar tus negocios'}
      </Text>

      <Text
        style={{
          color: '#786593',
          fontSize: 14,
          lineHeight: 21,
          marginTop: 9,
          textAlign: 'center',
        }}
      >
        {message || (
          kind === 'empty'
            ? 'Cuando el backend habilite la creación, tus perfiles comerciales aparecerán aquí.'
            : 'Revisa tu conexión e inténtalo nuevamente.'
        )}
      </Text>

      {kind === 'error' && onRetry ? (
        <TouchableOpacity
          accessibilityLabel="Reintentar cargar mis negocios"
          accessibilityRole="button"
          activeOpacity={0.82}
          onPress={onRetry}
          style={{
            alignItems: 'center',
            backgroundColor: '#7427D5',
            borderRadius: 13,
            flexDirection: 'row',
            marginTop: 23,
            minHeight: 44,
            paddingHorizontal: 16,
          }}
        >
          <RefreshCw
            color="#FFFFFF"
            size={17}
          />

          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '800',
              marginLeft: 8,
            }}
          >
            Reintentar
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
