import * as MediaLibrary from 'expo-media-library';

export type RecentStatusMediaAsset = {
  id: string;
  uri: string;
  filename: string;
  mediaType: 'image' | 'video';
  mimeType: string | null;
  width: number;
  height: number;
  duration: number;
  creationTime: number;
};

const PAGE_SIZE = 48;

function mapMediaType(
  mediaType: MediaLibrary.MediaTypeValue,
): RecentStatusMediaAsset['mediaType'] | null {
  if (mediaType === 'photo') {
    return 'image';
  }

  if (mediaType === 'video') {
    return 'video';
  }

  return null;
}

export async function requestRecentStatusMediaPermission(): Promise<boolean> {
  const permission = await MediaLibrary.requestPermissionsAsync(
    false,
    ['photo', 'video'],
  );

  return permission.granted;
}

export async function loadRecentStatusMedia(
  after?: string,
): Promise<{
  assets: RecentStatusMediaAsset[];
  endCursor: string | undefined;
  hasNextPage: boolean;
}> {
  const result = await MediaLibrary.getAssetsAsync({
    first: PAGE_SIZE,
    after,
    mediaType: ['photo', 'video'],
    sortBy: [['creationTime', false]],
  });

  return {
    assets: result.assets.flatMap((asset) => {
      const mediaType = mapMediaType(asset.mediaType);

      if (!mediaType) {
        return [];
      }

      return [{
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        mediaType,
        mimeType: null,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        creationTime: asset.creationTime,
      }];
    }),
    endCursor: result.endCursor,
    hasNextPage: result.hasNextPage,
  };
}
