import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BadgeCheck,
  ChevronRight,
  MapPin,
  Store,
} from 'lucide-react-native';

import type {
  CommercialPublicProfile,
} from '@beeapp/shared-types';

interface CommercialRecentBusinessesProps {
  profiles: CommercialPublicProfile[];
  onPressProfile: (
    profile: CommercialPublicProfile,
  ) => void;
}

function initials(value: string): string {
  const result = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return result || 'B';
}

function modalitiesLabel(
  modalities: CommercialPublicProfile['modalities'],
): string {
  const labels: Record<string, string> = {
    at_establishment: 'En establecimiento',
    in_person: 'Presencial',
    virtual: 'Virtual',
    home_visit: 'A domicilio',
    delivery: 'Domicilio',
    pickup: 'Recoger',
    phone_call: 'Llamada',
    buddy_chat: 'Chat Buddy',
  };

  const values = modalities
    .slice(0, 2)
    .map((item) => labels[item] || item);

  if (modalities.length > 2) {
    values.push(`+${modalities.length - 2}`);
  }

  return values.join(' · ');
}

function BusinessLogo({
  profile,
}: {
  profile: CommercialPublicProfile;
}) {
  if (profile.logo_file_id) {
    return (
      <View style={styles.logoFallback}>
        <Store
          color="#7B2DD9"
          size={24}
        />
      </View>
    );
  }

  return (
    <View style={styles.logoFallback}>
      <Text style={styles.logoInitials}>
        {initials(profile.display_name)}
      </Text>
    </View>
  );
}

export default function CommercialRecentBusinesses({
  profiles,
  onPressProfile,
}: CommercialRecentBusinessesProps) {
  if (profiles.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Negocios recientes
      </Text>

      {profiles.map((profile) => (
        <TouchableOpacity
          key={profile.id}
          accessibilityLabel={
            `Ver negocio ${profile.display_name}`
          }
          accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => onPressProfile(profile)}
          style={styles.card}
        >
          <BusinessLogo profile={profile} />

          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text
                numberOfLines={1}
                style={styles.title}
              >
                {profile.display_name}
              </Text>

              {profile.is_verified ? (
                <BadgeCheck
                  color="#5B2DC7"
                  fill="#EDE2FF"
                  size={17}
                />
              ) : null}
            </View>

            <Text
              numberOfLines={2}
              style={styles.description}
            >
              {profile.description}
            </Text>

            <View style={styles.metaRow}>
              <MapPin
                color="#8A72B2"
                size={13}
              />

              <Text
                numberOfLines={1}
                style={styles.metaText}
              >
                {profile.city}, {profile.country_code}
              </Text>
            </View>

            {profile.modalities.length > 0 ? (
              <Text
                numberOfLines={1}
                style={styles.modalities}
              >
                {modalitiesLabel(profile.modalities)}
              </Text>
            ) : null}
          </View>

          <ChevronRight
            color="#8A72B2"
            size={21}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 27,
  },
  sectionTitle: {
    color: '#261743',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
    marginBottom: 13,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F0EAF3',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 11,
    minHeight: 104,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  logoFallback: {
    alignItems: 'center',
    backgroundColor: '#F6EAFE',
    borderRadius: 15,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56,
  },
  logoInitials: {
    color: '#7B2DD9',
    fontSize: 17,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    marginHorizontal: 12,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  title: {
    color: '#2D2141',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  description: {
    color: '#786593',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 7,
  },
  metaText: {
    color: '#8A72B2',
    flex: 1,
    fontSize: 11,
    marginLeft: 4,
  },
  modalities: {
    color: '#69478E',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
  },
});
