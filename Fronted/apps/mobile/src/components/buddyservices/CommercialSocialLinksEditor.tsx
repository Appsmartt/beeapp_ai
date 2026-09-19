import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AtSign,
  Briefcase,
  Globe,
  Music2,
  Plus,
  Trash2,
  Video,
} from 'lucide-react-native';

import type {
  CommercialProfileSocialLink,
  CommercialSocialPlatform,
} from '@beeapp/shared-types';

const PLATFORM_OPTIONS: Array<{
  platform: CommercialSocialPlatform;
  label: string;
  placeholder: string;
  Icon: typeof AtSign;
}> = [
  {
    platform: 'instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/tu-negocio',
    Icon: AtSign,
  },
  {
    platform: 'facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/tu-negocio',
    Icon: Globe,
  },
  {
    platform: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/company/tu-negocio',
    Icon: Briefcase,
  },
  {
    platform: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@tu-negocio',
    Icon: Music2,
  },
  {
    platform: 'youtube',
    label: 'YouTube',
    placeholder: 'https://youtube.com/@tu-negocio',
    Icon: Video,
  },
  {
    platform: 'threads',
    label: 'Threads',
    placeholder: 'https://threads.net/@tu-negocio',
    Icon: AtSign,
  },
  {
    platform: 'website',
    label: 'Sitio web',
    placeholder: 'https://tu-negocio.com',
    Icon: Globe,
  },
];

function getPlatformOption(
  platform: CommercialSocialPlatform,
) {
  return PLATFORM_OPTIONS.find(
    (option) => option.platform === platform,
  );
}

function normalizeUrl(value: string): string {
  return value.trim();
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);

    return (
      (parsed.protocol === 'http:'
        || parsed.protocol === 'https:')
      && Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

interface CommercialSocialLinksEditorProps {
  disabled?: boolean;
  links: CommercialProfileSocialLink[];
  onChange: (links: CommercialProfileSocialLink[]) => void;
}

export default function CommercialSocialLinksEditor({
  disabled = false,
  links,
  onChange,
}: CommercialSocialLinksEditorProps) {
  const selectedPlatforms = new Set(
    links.map((link) => link.platform),
  );
  const availablePlatforms = PLATFORM_OPTIONS.filter(
    (option) => !selectedPlatforms.has(option.platform),
  );

  const addPlatform = (
    platform: CommercialSocialPlatform,
  ) => {
    onChange([
      ...links,
      {
        platform,
        url: '',
      },
    ]);
  };

  const updateUrl = (
    platform: CommercialSocialPlatform,
    url: string,
  ) => {
    onChange(
      links.map((link) => (
        link.platform === platform
          ? {
              ...link,
              url,
            }
          : link
      )),
    );
  };

  const removePlatform = (
    platform: CommercialSocialPlatform,
  ) => {
    onChange(
      links.filter((link) => link.platform !== platform),
    );
  };

  const validateBeforeBlur = (
    platform: CommercialSocialPlatform,
    url: string,
  ) => {
    const normalizedUrl = normalizeUrl(url);

    if (
      normalizedUrl
      && !isValidHttpUrl(normalizedUrl)
    ) {
      const option = getPlatformOption(platform);

      Alert.alert(
        'URL inválida',
        `Agrega una URL completa de ${option?.label || 'la red'} que comience por http:// o https://.`,
      );
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>
            Redes sociales
          </Text>
          <Text style={styles.description}>
            Agrega enlaces opcionales para que tus clientes conozcan tu negocio.
          </Text>
        </View>

        <View style={styles.optionalBadge}>
          <Text style={styles.optionalBadgeText}>
            Opcional
          </Text>
        </View>
      </View>

      {links.map((link) => {
        const option = getPlatformOption(link.platform);

        if (!option) {
          return null;
        }

        const Icon = option.Icon;

        return (
          <View
            key={link.platform}
            style={styles.linkCard}
          >
            <View style={styles.linkHeader}>
              <View style={styles.platformIdentity}>
                <View style={styles.iconWrap}>
                  <Icon
                    color="#7427D5"
                    size={18}
                  />
                </View>

                <Text style={styles.platformLabel}>
                  {option.label}
                </Text>
              </View>

              <TouchableOpacity
                accessibilityLabel={`Quitar ${option.label}`}
                accessibilityRole="button"
                activeOpacity={0.8}
                disabled={disabled}
                onPress={() => removePlatform(link.platform)}
                style={[
                  styles.removeButton,
                  disabled && styles.disabledControl,
                ]}
              >
                <Trash2
                  color="#B42318"
                  size={17}
                />
              </TouchableOpacity>
            </View>

            <TextInput
              accessibilityLabel={`URL de ${option.label}`}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!disabled}
              keyboardType="url"
              onBlur={() => validateBeforeBlur(
                link.platform,
                link.url,
              )}
              onChangeText={(url) => updateUrl(
                link.platform,
                url,
              )}
              placeholder={option.placeholder}
              placeholderTextColor="#A692B7"
              style={[
                styles.urlInput,
                disabled && styles.disabledControl,
              ]}
              value={link.url}
            />
          </View>
        );
      })}

      {availablePlatforms.length > 0 ? (
        <View style={styles.addArea}>
          <Text style={styles.addLabel}>
            Agregar una red
          </Text>

          <View style={styles.platformOptions}>
            {availablePlatforms.map((option) => {
              const Icon = option.Icon;

              return (
                <Pressable
                  accessibilityLabel={`Agregar ${option.label}`}
                  accessibilityRole="button"
                  disabled={disabled}
                  key={option.platform}
                  onPress={() => addPlatform(option.platform)}
                  style={({ pressed }) => [
                    styles.platformButton,
                    pressed && styles.platformButtonPressed,
                    disabled && styles.disabledControl,
                  ]}
                >
                  <Icon
                    color="#54209E"
                    size={15}
                  />
                  <Text style={styles.platformButtonText}>
                    {option.label}
                  </Text>
                  <Plus
                    color="#54209E"
                    size={14}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {links.length > 0 ? (
        <Text style={styles.helper}>
          Usa enlaces completos que comiencen por https:// o http://.
        </Text>
      ) : null}
    </View>
  );
}

export function normalizeCommercialSocialLinks(
  links: CommercialProfileSocialLink[],
): CommercialProfileSocialLink[] {
  return links
    .map((link) => ({
      ...link,
      url: normalizeUrl(link.url),
    }))
    .filter((link) => Boolean(link.url));
}

export function findInvalidCommercialSocialLink(
  links: CommercialProfileSocialLink[],
): CommercialProfileSocialLink | null {
  const normalizedLinks = normalizeCommercialSocialLinks(links);

  return (
    normalizedLinks.find(
      (link) => !isValidHttpUrl(link.url),
    )
    || null
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#F8F3FD',
    borderColor: '#E4D4F5',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    padding: 14,
  },
  heading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headingCopy: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    color: '#261743',
    fontSize: 15,
    fontWeight: '800',
  },
  description: {
    color: '#786593',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  optionalBadge: {
    backgroundColor: '#EBDCFD',
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  optionalBadgeText: {
    color: '#54209E',
    fontSize: 11,
    fontWeight: '800',
  },
  linkCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DECBEF',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 13,
    padding: 12,
  },
  linkHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  platformIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#F1E7FC',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  platformLabel: {
    color: '#35224F',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 9,
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  urlInput: {
    backgroundColor: '#FFFCFF',
    borderColor: '#DCCBEE',
    borderRadius: 11,
    borderWidth: 1,
    color: '#261743',
    fontSize: 13,
    marginTop: 11,
    minHeight: 45,
    paddingHorizontal: 12,
  },
  addArea: {
    marginTop: 14,
  },
  addLabel: {
    color: '#624782',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  platformOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  platformButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D9C4ED',
    borderRadius: 99,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  platformButtonPressed: {
    backgroundColor: '#F0E4FC',
  },
  platformButtonText: {
    color: '#54209E',
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 5,
  },
  helper: {
    color: '#786593',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
  },
  disabledControl: {
    opacity: 0.55,
  },
});
