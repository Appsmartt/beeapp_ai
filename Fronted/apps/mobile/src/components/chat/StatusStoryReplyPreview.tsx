import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ImageOff,
  Play,
  Sparkles,
} from 'lucide-react-native';
import type {
  StatusStory,
} from '@beeapp/shared-types';
import {
  colors,
} from '@beeapp/design-system';
import {
  getStatusVideoThumbnail,
} from '../../services/statusVideoThumbnail';

interface StatusStoryReplyPreviewProps {
  isAvailable: boolean;
  isUser: boolean;
  status: StatusStory | null;
  onPress?: () => void;
}

function getStoryText(
  status: StatusStory,
): string {
  return (
    status.text_content?.trim()
    || status.caption?.trim()
    || 'Historia'
  );
}

function getTextBackgroundColor(
  status: StatusStory,
): string {
  const value = status.editor_metadata?.background_color;

  return (
    typeof value === 'string'
    && /^#[0-9A-Fa-f]{6}$/.test(value)
  )
    ? value
    : '#1D3557';
}

export default function StatusStoryReplyPreview({
  isAvailable,
  isUser,
  status,
  onPress,
}: StatusStoryReplyPreviewProps) {
  const [videoThumbnailUri, setVideoThumbnailUri] = useState<
    string | null
  >(null);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);

  const isVideo = status?.kind === 'video';
  const mediaUrl = status?.media?.url?.trim() || null;
  const imageUri = isVideo
    ? videoThumbnailUri
    : mediaUrl;
  const canOpen = Boolean(
    isAvailable
    && status
    && onPress,
  );

  useEffect(() => {
    let active = true;

    if (!isVideo || !mediaUrl) {
      setVideoThumbnailUri(null);
      setThumbnailLoading(false);
      return () => {
        active = false;
      };
    }

    setThumbnailLoading(true);
    setVideoThumbnailUri(null);

    void getStatusVideoThumbnail(mediaUrl)
      .then((uri) => {
        if (active) {
          setVideoThumbnailUri(uri);
        }
      })
      .finally(() => {
        if (active) {
          setThumbnailLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    isVideo,
    mediaUrl,
  ]);

  if (!isAvailable || !status) {
    return (
      <View
        style={styles.unavailableCard}
        accessibilityLabel="Esta historia ya no está disponible"
      >
        <View style={styles.unavailableIcon}>
          <ImageOff
            size={16}
            color={colors.neutral.gray500}
          />
        </View>

        <View style={styles.unavailableTextWrap}>
          <Text style={styles.unavailableTitle}>
            Historia no disponible
          </Text>

          <Text style={styles.unavailableText}>
            Esta historia ya no está disponible
          </Text>
        </View>
      </View>
    );
  }

  const isTextStory = status.kind === 'text';
  const authorName = (
    status.actor.display_name?.trim()
    || 'Usuario Buddy'
  );
  const content = getStoryText(status);

  const contentView = isTextStory ? (
    <View
      style={[
        styles.textPreview,
        {
          backgroundColor: getTextBackgroundColor(status),
        },
      ]}
    >
      <Text
        style={styles.textPreviewContent}
        numberOfLines={3}
      >
        {content}
      </Text>
    </View>
  ) : (
    <View style={styles.mediaPreview}>
      {imageUri ? (
        <Image
          source={{
            uri: imageUri,
          }}
          style={styles.mediaImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.mediaFallback}>
          {thumbnailLoading ? (
            <ActivityIndicator
              size="small"
              color={colors.neutral.white}
            />
          ) : (
            <Sparkles
              size={20}
              color={colors.neutral.white}
            />
          )}
        </View>
      )}

      {isVideo ? (
        <View style={styles.videoIndicator}>
          <Play
            size={13}
            color={colors.neutral.white}
            fill={colors.neutral.white}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      disabled={!canOpen}
      onPress={onPress}
      style={[
        styles.card,
        isUser
          ? styles.cardUser
          : styles.cardOther,
      ]}
      accessibilityRole={canOpen ? 'button' : undefined}
      accessibilityLabel={
        canOpen
          ? `Abrir historia de ${authorName}`
          : `Historia de ${authorName}`
      }
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.label,
            isUser
              ? styles.labelUser
              : styles.labelOther,
          ]}
          numberOfLines={1}
        >
          Historia
        </Text>

        <Text
          style={[
            styles.author,
            isUser
              ? styles.authorUser
              : styles.authorOther,
          ]}
          numberOfLines={1}
        >
          {authorName}
        </Text>
      </View>

      {contentView}

      {!isTextStory && status.caption?.trim() ? (
        <Text
          style={[
            styles.caption,
            isUser
              ? styles.captionUser
              : styles.captionOther,
          ]}
          numberOfLines={2}
        >
          {status.caption.trim()}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
    width: 218,
  },
  cardUser: {
    backgroundColor: '#5F52C5',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
  },
  cardOther: {
    backgroundColor: '#F7F7FB',
    borderColor: '#E5E7F0',
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 9,
    paddingTop: 8,
  },
  label: {
    color: colors.brand.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  labelUser: {
    color: '#FFFFFF',
  },
  labelOther: {
    color: colors.brand.primary,
  },
  author: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
  },
  authorUser: {
    color: '#E6E3FF',
  },
  authorOther: {
    color: colors.neutral.gray600,
  },
  mediaPreview: {
    backgroundColor: '#202B43',
    height: 122,
    marginHorizontal: 8,
    marginTop: 7,
    overflow: 'hidden',
  },
  mediaImage: {
    height: '100%',
    width: '100%',
  },
  mediaFallback: {
    alignItems: 'center',
    backgroundColor: '#263250',
    flex: 1,
    justifyContent: 'center',
  },
  videoIndicator: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.46)',
    borderRadius: 16,
    bottom: 8,
    height: 32,
    justifyContent: 'center',
    left: 8,
    position: 'absolute',
    width: 32,
  },
  textPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    marginTop: 7,
    minHeight: 104,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textPreviewContent: {
    color: colors.neutral.white,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  caption: {
    color: colors.neutral.gray700,
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  captionUser: {
    color: '#FFFFFF',
  },
  captionOther: {
    color: colors.neutral.gray700,
  },
  unavailableCard: {
    alignItems: 'center',
    backgroundColor: '#F8F9FC',
    borderColor: '#E4E7EF',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    width: 218,
  },
  unavailableIcon: {
    alignItems: 'center',
    backgroundColor: '#ECEEF4',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginRight: 9,
    width: 32,
  },
  unavailableTextWrap: {
    flex: 1,
  },
  unavailableTitle: {
    color: colors.neutral.gray700,
    fontSize: 11,
    fontWeight: '800',
  },
  unavailableText: {
    color: colors.neutral.gray500,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
});
