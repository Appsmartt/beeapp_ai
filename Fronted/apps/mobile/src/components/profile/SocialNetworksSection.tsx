import React from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AtSign,
  Briefcase,
  ExternalLink,
  Globe,
  Music2,
  Video,
} from 'lucide-react-native';
import { colors } from '@beeapp/design-system';

interface SocialNetworksSectionProps {
  socialLinks?: Record<string, string>;
}

const SOCIAL_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
  }
> = {
  instagram: {
    label: 'Instagram',
    icon: AtSign,
  },
  facebook: {
    label: 'Facebook',
    icon: Globe,
  },
  linkedin: {
    label: 'LinkedIn',
    icon: Briefcase,
  },
  tiktok: {
    label: 'TikTok',
    icon: Music2,
  },
  youtube: {
    label: 'YouTube',
    icon: Video,
  },
  threads: {
    label: 'Threads',
    icon: AtSign,
  },
  website: {
    label: 'Sitio web',
    icon: Globe,
  },
};

export default function SocialNetworksSection({
  socialLinks,
}: SocialNetworksSectionProps) {
  if (!socialLinks) {
    return null;
  }

  const activeLinks = Object.entries(socialLinks).filter(
    ([, url]) => Boolean(url?.trim()),
  );

  if (activeLinks.length === 0) {
    return null;
  }

  const handleOpenLink = (
    label: string,
    url: string,
  ) => {
    Alert.alert(
      'Abriendo enlace',
      `Abriendo enlace de ${label}: ${url}`,
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>
        Redes Sociales
      </Text>

      <View style={styles.card}>
        {activeLinks.map(([key, url], index) => {
          const config = SOCIAL_CONFIG[key] || {
            label: key,
            icon: ExternalLink,
          };

          const IconComponent = config.icon;
          const isLast = index === activeLinks.length - 1;

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.row,
                isLast && styles.lastRow,
              ]}
              onPress={() => handleOpenLink(config.label, url)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                <IconComponent
                  size={18}
                  color={colors.brand.primary}
                />
              </View>

              <View style={styles.textCol}>
                <Text style={styles.label}>
                  {config.label}
                </Text>

                <Text
                  style={styles.url}
                  numberOfLines={1}
                >
                  {url}
                </Text>
              </View>

              <ExternalLink
                size={14}
                color={colors.neutral.gray400}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
    gap: 12,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${colors.brand.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  url: {
    fontSize: 11,
    color: colors.neutral.gray600,
    marginTop: 1,
  },
});