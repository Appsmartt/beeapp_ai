import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Building2,
  ChevronRight,
  CirclePause,
  CircleX,
  MapPin,
  ShieldCheck,
  Store,
} from 'lucide-react-native';

import type {
  CommercialOwnedProfile,
} from '@beeapp/shared-types';

interface OwnedCommercialProfileCardProps {
  profile: CommercialOwnedProfile;
  onPress: () => void;
}

function getPublicationCopy(
  profile: CommercialOwnedProfile,
): {
  label: string;
  color: string;
  Icon: typeof Store;
} {
  if (profile.publication_status === 'published') {
    return {
      label: 'Publicado',
      color: '#177245',
      Icon: Store,
    };
  }

  if (profile.publication_status === 'paused') {
    return {
      label: 'Pausado',
      color: '#9A5B00',
      Icon: CirclePause,
    };
  }

  if (profile.publication_status === 'archived') {
    return {
      label: 'Archivado',
      color: '#6D6875',
      Icon: CircleX,
    };
  }

  return {
    label: 'Suspendido',
    color: '#B42318',
    Icon: CircleX,
  };
}

function getVerificationCopy(
  profile: CommercialOwnedProfile,
): string {
  if (profile.verification_status === 'verified') {
    return 'Verificado';
  }

  if (profile.verification_status === 'pending_review') {
    return 'Verificación en revisión';
  }

  if (profile.verification_status === 'requires_correction') {
    return 'Verificación requiere corrección';
  }

  if (profile.verification_status === 'rejected') {
    return 'Verificación rechazada';
  }

  if (profile.verification_status === 'suspended') {
    return 'Verificación suspendida';
  }

  return 'Sin verificación solicitada';
}

export default function OwnedCommercialProfileCard({
  profile,
  onPress,
}: OwnedCommercialProfileCardProps) {
  const publication = getPublicationCopy(profile);
  const PublicationIcon = publication.Icon;

  return (
    <TouchableOpacity
      accessibilityHint="Abre la administración de este negocio"
      accessibilityLabel={`Gestionar ${profile.display_name}`}
      accessibilityRole="button"
      activeOpacity={0.82}
      onPress={onPress}
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: '#E7DDF2',
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 12,
        padding: 16,
      }}
    >
      <View
        style={{
          alignItems: 'flex-start',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#F6EAFE',
            borderRadius: 14,
            height: 44,
            justifyContent: 'center',
            width: 44,
          }}
        >
          <Building2
            color="#7427D5"
            size={22}
          />
        </View>

        <ChevronRight
          color="#8D7BA3"
          size={21}
        />
      </View>

      <Text
        numberOfLines={2}
        style={{
          color: '#261743',
          fontSize: 17,
          fontWeight: '800',
          marginTop: 13,
        }}
      >
        {profile.display_name}
      </Text>

      <Text
        numberOfLines={2}
        style={{
          color: '#786593',
          fontSize: 13,
          lineHeight: 19,
          marginTop: 5,
        }}
      >
        {profile.description}
      </Text>

      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          marginTop: 12,
        }}
      >
        <MapPin
          color="#786593"
          size={15}
        />

        <Text
          style={{
            color: '#786593',
            fontSize: 12,
            marginLeft: 5,
          }}
        >
          {`${profile.city}, ${profile.country_code}`}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 14,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: `${publication.color}14`,
            borderRadius: 99,
            flexDirection: 'row',
            paddingHorizontal: 9,
            paddingVertical: 5,
          }}
        >
          <PublicationIcon
            color={publication.color}
            size={13}
          />

          <Text
            style={{
              color: publication.color,
              fontSize: 11,
              fontWeight: '700',
              marginLeft: 5,
            }}
          >
            {publication.label}
          </Text>
        </View>

        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#F4F0F8',
            borderRadius: 99,
            flexDirection: 'row',
            paddingHorizontal: 9,
            paddingVertical: 5,
          }}
        >
          <ShieldCheck
            color="#6A4B91"
            size={13}
          />

          <Text
            style={{
              color: '#6A4B91',
              fontSize: 11,
              fontWeight: '700',
              marginLeft: 5,
            }}
          >
            {getVerificationCopy(profile)}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: profile.is_available
            ? '#177245'
            : '#9A5B00',
          fontSize: 12,
          fontWeight: '700',
          marginTop: 13,
        }}
      >
        {profile.is_available
          ? 'Disponible para clientes'
          : 'No disponible para clientes'}
      </Text>
    </TouchableOpacity>
  );
}
