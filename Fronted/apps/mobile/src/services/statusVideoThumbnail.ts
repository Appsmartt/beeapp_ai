import * as VideoThumbnails from 'expo-video-thumbnails';

const VIDEO_STATUS_THUMBNAIL_TIME_MILLISECONDS = 1000;

const videoStatusThumbnailCache = new Map<
  string,
  string | null
>();

const videoStatusThumbnailRequests = new Map<
  string,
  Promise<string | null>
>();

function normalizeVideoUri(
  value: string | null | undefined,
): string | null {
  const normalizedValue = String(value || '').trim();

  return normalizedValue || null;
}

export async function getStatusVideoThumbnail(
  videoUri: string | null | undefined,
): Promise<string | null> {
  const normalizedVideoUri = normalizeVideoUri(videoUri);

  if (!normalizedVideoUri) {
    return null;
  }

  if (videoStatusThumbnailCache.has(normalizedVideoUri)) {
    return videoStatusThumbnailCache.get(normalizedVideoUri) || null;
  }

  const existingRequest = videoStatusThumbnailRequests.get(
    normalizedVideoUri,
  );

  if (existingRequest) {
    return existingRequest;
  }

  const request = VideoThumbnails.getThumbnailAsync(
    normalizedVideoUri,
    {
      time: VIDEO_STATUS_THUMBNAIL_TIME_MILLISECONDS,
      quality: 0.7,
    },
  )
    .then((result) => {
      const thumbnailUri = String(result.uri || '').trim() || null;

      videoStatusThumbnailCache.set(
        normalizedVideoUri,
        thumbnailUri,
      );

      return thumbnailUri;
    })
    .catch(() => {
      videoStatusThumbnailCache.set(
        normalizedVideoUri,
        null,
      );

      return null;
    })
    .finally(() => {
      videoStatusThumbnailRequests.delete(
        normalizedVideoUri,
      );
    });

  videoStatusThumbnailRequests.set(
    normalizedVideoUri,
    request,
  );

  return request;
}
