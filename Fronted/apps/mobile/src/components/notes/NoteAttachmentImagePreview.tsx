import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ImageIcon } from 'lucide-react-native';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';

import CachedImage from '../CachedImage';
import {
  useNoteAttachmentAccessUrl,
} from '../../hooks/useNoteAttachmentAccessUrl';
import NoteImageViewerModal from './NoteImageViewerModal';

type NoteAttachmentImagePreviewProps = {
  noteId?: string;
  attachmentId?: string;
  caption?: string;
  variant?: 'inline' | 'thumbnail';
  pressable?: boolean;
  accessUrl?: string | null;
  onFallbackPress?: () => void;
};

export default function NoteAttachmentImagePreview({
  noteId,
  attachmentId,
  caption,
  variant = 'inline',
  pressable = true,
  accessUrl,
  onFallbackPress,
}: NoteAttachmentImagePreviewProps) {
  const fetched = useNoteAttachmentAccessUrl(
    accessUrl !== undefined
      ? undefined
      : noteId,
    accessUrl !== undefined
      ? undefined
      : attachmentId,
  );

  const url = accessUrl !== undefined
    ? accessUrl
    : fetched.url;

  const loading = accessUrl !== undefined
    ? false
    : fetched.loading;

  const failed = accessUrl !== undefined
    ? !accessUrl
    : fetched.failed;

  const [viewerVisible, setViewerVisible] =
    useState(false);

  const label = caption || 'Imagen adjunta';
  const isThumbnail = variant === 'thumbnail';

  const openViewer = () => {
    if (url) {
      setViewerVisible(true);
      return;
    }

    onFallbackPress?.();
  };

  if (!noteId || !attachmentId) {
    return (
      <Placeholder
        label={label}
        isThumbnail={isThumbnail}
        onPress={onFallbackPress}
      />
    );
  }

  if (loading) {
    return (
      <View
        style={[
          styles.loaderBox,
          isThumbnail && styles.thumbnailLoader,
        ]}
      >
        <ActivityIndicator
          size="small"
          color={colors.brand.primary}
        />
      </View>
    );
  }

  if (failed || !url) {
    return (
      <Placeholder
        label={label}
        isThumbnail={isThumbnail}
        onPress={onFallbackPress}
      />
    );
  }

  const imageNode = (
    <CachedImage
      uri={url}
      cacheKey={`note-att-${attachmentId}`}
      style={[
        styles.image,
        isThumbnail && styles.thumbnailImage,
      ]}
      resizeMode="cover"
    />
  );

  const wrappedImage = pressable ? (
    <TouchableOpacity
      style={[
        styles.imageWrap,
        isThumbnail && styles.thumbnailWrap,
      ]}
      onPress={openViewer}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Ver imagen: ${label}`}
    >
      {imageNode}
    </TouchableOpacity>
  ) : (
    <View
      style={[
        styles.imageWrap,
        isThumbnail && styles.thumbnailWrap,
      ]}
    >
      {imageNode}
    </View>
  );

  return (
    <>
      {wrappedImage}

      {!isThumbnail && caption ? (
        <Text
          style={styles.caption}
          numberOfLines={2}
        >
          {caption}
        </Text>
      ) : null}

      {pressable ? (
        <NoteImageViewerModal
          visible={viewerVisible}
          url={url}
          caption={caption}
          onClose={() => setViewerVisible(false)}
        />
      ) : null}
    </>
  );
}

function Placeholder({
  label,
  isThumbnail,
  onPress,
}: {
  label: string;
  isThumbnail: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View
        style={[
          styles.iconBadge,
          isThumbnail && styles.thumbnailIconBadge,
        ]}
      >
        <ImageIcon
          size={isThumbnail ? 19 : 21}
          color="#2563EB"
        />
      </View>

      {!isThumbnail ? (
        <Text
          style={styles.placeholderText}
          numberOfLines={2}
        >
          {label}
        </Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[
          styles.placeholderBox,
          isThumbnail && styles.thumbnailPlaceholder,
        ]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.placeholderBox,
        isThumbnail && styles.thumbnailPlaceholder,
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  image: {
    aspectRatio: 4 / 3,
    width: '100%',
  },
  thumbnailWrap: {
    borderRadius: 10,
    width: 48,
  },
  thumbnailImage: {
    aspectRatio: 1,
    height: 48,
    width: 48,
  },
  caption: {
    color: colors.neutral.gray600,
    fontSize: 12,
    marginTop: 6,
  },
  loaderBox: {
    alignItems: 'center',
    aspectRatio: 4 / 3,
    backgroundColor: colors.neutral.gray50,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.lg,
    borderWidth: 1,
    justifyContent: 'center',
    width: '100%',
  },
  thumbnailLoader: {
    aspectRatio: undefined,
    height: 48,
    width: 48,
  },
  placeholderBox: {
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  thumbnailPlaceholder: {
    minHeight: 0,
    padding: 0,
    width: 48,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: '#2563EB14',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  thumbnailIconBadge: {
    height: 48,
    width: 48,
  },
  placeholderText: {
    color: colors.neutral.gray700,
    flex: 1,
    fontSize: 13,
  },
});
