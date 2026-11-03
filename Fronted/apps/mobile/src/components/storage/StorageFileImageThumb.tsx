import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '@beeapp/design-system';

import CachedImage from '../CachedImage';
import { renderItemIcon } from './storageItemIcon';
import type { StorageItem } from '../../stores/storageStore';
import {
  useStorageFileAccessUrl,
} from '../../hooks/useStorageFileAccessUrl';

type StorageFileImageThumbProps = {
  item: StorageItem;
  variant: 'grid' | 'list';
};

export default function StorageFileImageThumb({
  item,
  variant,
}: StorageFileImageThumbProps) {
  const isImage = item.type === 'image';
  const { url, loading, failed, cacheKey } =
    useStorageFileAccessUrl(
      isImage ? item.id : undefined,
      isImage,
    );

  if (!isImage) {
    return (
      <View
        style={
          variant === 'grid'
            ? styles.gridIconCircle
            : styles.listIconCircle
        }
      >
        {renderItemIcon(
          item,
          variant === 'grid' ? 26 : 20,
        )}
      </View>
    );
  }

  const wrapStyle = variant === 'grid'
    ? styles.gridThumbWrap
    : styles.listThumbWrap;

  if (loading) {
    return (
      <View style={[wrapStyle, styles.loader]}>
        <ActivityIndicator
          size="small"
          color={colors.brand.primary}
        />
      </View>
    );
  }

  if (failed || !url) {
    return (
      <View style={[wrapStyle, styles.fallback]}>
        {renderItemIcon(item, variant === 'grid' ? 26 : 20)}
      </View>
    );
  }

  return (
    <View style={wrapStyle}>
      <CachedImage
        uri={url}
        cacheKey={cacheKey}
        style={styles.image}
        resizeMode="cover"
        accessibilityLabel={item.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gridThumbWrap: {
    width: '100%',
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: colors.neutral.gray100,
  },
  listThumbWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: colors.neutral.gray100,
  },
  gridIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray50,
    marginBottom: 2,
  },
  listIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.gray50,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loader: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
