import type {
  StatusStory,
  StatusTextBackground,
  StatusViewer,
} from '@beeapp/shared-types';

import type {
  StatusItem,
  StatusTextLayer,
  StatusViewedBy,
} from '../mocks/statuses';
import {
  normalizeStatusFontFamily,
} from '../components/chat/status/statusTypography';

const DEFAULT_STATUS_BACKGROUND = '#1D3557';
const DEFAULT_AUTHOR_COLOR = '#F3E8FF';
const DEFAULT_TEXT_COLOR = '#FFFFFF';

function getInitials(
  displayName: string | null | undefined,
): string {
  const initials = (displayName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || '?';
}

function formatRelativeTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const elapsedMs = Date.now() - date.getTime();

  if (elapsedMs < 60_000) {
    return 'Ahora';
  }

  const elapsedMinutes = Math.floor(
    elapsedMs / 60_000,
  );

  if (elapsedMinutes < 60) {
    return `hace ${elapsedMinutes} min`;
  }

  const elapsedHours = Math.floor(
    elapsedMinutes / 60,
  );

  if (elapsedHours < 24) {
    return `hace ${elapsedHours} h`;
  }

  const elapsedDays = Math.floor(
    elapsedHours / 24,
  );

  return `hace ${elapsedDays} d`;
}

function resolveTextBackgroundColor(
  story: StatusStory,
  backgroundsById: Map<string, StatusTextBackground>,
): string {
  if (!story.text_background_id) {
    return DEFAULT_STATUS_BACKGROUND;
  }

  return (
    backgroundsById.get(
      story.text_background_id,
    )?.hex_color
    || DEFAULT_STATUS_BACKGROUND
  );
}

function getFirstNonEmptyText(
  story: StatusStory,
): string {
  return (
    story.text_content?.trim()
    || story.caption?.trim()
    || ''
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value),
  );
}

function asFiniteNumber(
  value: unknown,
  fallback: number,
): number {
  return (
    typeof value === 'number'
    && Number.isFinite(value)
  )
    ? value
    : fallback;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}

function getEditorMetadata(
  story: StatusStory,
): Record<string, unknown> {
  return isRecord(story.editor_metadata)
    ? story.editor_metadata
    : {};
}

function getEditorBackgroundColor(
  story: StatusStory,
): string | null {
  const value = getEditorMetadata(
    story,
  ).background_color;

  if (
    typeof value !== 'string'
    || !/^#[0-9A-Fa-f]{6}$/.test(value)
  ) {
    return null;
  }

  return value.toUpperCase();
}

function getTextLayers(
  story: StatusStory,
): StatusTextLayer[] {
  const metadata = getEditorMetadata(story);
  const rawLayers = metadata.text_layers;

  if (!Array.isArray(rawLayers)) {
    return [];
  }

  const metadataFontFamily = normalizeStatusFontFamily(
    metadata.text_font_family,
  );

  return rawLayers.flatMap((rawLayer, index) => {
    if (!isRecord(rawLayer)) {
      return [];
    }

    const content = String(
      rawLayer.content || '',
    ).trim();

    if (!content) {
      return [];
    }

    const fontWeight = (
      rawLayer.font_weight === '700'
      || rawLayer.font_weight === 700
    )
      ? '700'
      : '400';

    return [{
      id: String(rawLayer.id || `text_${index}`),
      content,
      x: clamp(
        asFiniteNumber(rawLayer.x, 50),
        0,
        100,
      ),
      y: clamp(
        asFiniteNumber(rawLayer.y, 50),
        0,
        100,
      ),
      scale: clamp(
        asFiniteNumber(rawLayer.scale, 1),
        0.5,
        3,
      ),
      rotation: clamp(
        asFiniteNumber(rawLayer.rotation, 0),
        -360,
        360,
      ),
      fontSize: clamp(
        asFiniteNumber(rawLayer.font_size, 24),
        12,
        72,
      ),
      fontWeight,
      color: String(
        rawLayer.color || DEFAULT_TEXT_COLOR,
      ),
      fontFamily: normalizeStatusFontFamily(
        rawLayer.font_family || metadataFontFamily,
      ),
    }];
  });
}

function getLegacyTextLayer(
  text: string,
): StatusTextLayer | null {
  if (!text) {
    return null;
  }

  return {
    id: 'legacy_text',
    content: text,
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
    fontSize: 24,
    fontWeight: '400',
    color: DEFAULT_TEXT_COLOR,
    fontFamily: normalizeStatusFontFamily(null),
  };
}

export function createStatusBackgroundMap(
  backgrounds: StatusTextBackground[],
): Map<string, StatusTextBackground> {
  return new Map(
    backgrounds.map((background) => [
      background.id,
      background,
    ]),
  );
}

export function mapStatusViewerToUi(
  viewer: StatusViewer,
): StatusViewedBy {
  return {
    contactId: viewer.profile_id,
    contactName: viewer.display_name,
    viewedAt: formatRelativeTime(viewer.viewed_at),
  };
}

export function mapStatusStoryToUi(
  story: StatusStory,
  backgroundsById: Map<string, StatusTextBackground>,
): StatusItem {
  const isMedia = (
    story.kind === 'image'
    || story.kind === 'gif'
    || story.kind === 'video'
  );

  const type: StatusItem['type'] = (
    story.kind === 'video'
      ? 'video'
      : story.kind === 'gif'
        ? 'gif'
        : isMedia
          ? 'photo'
          : 'text'
  );

  const authorName = (
    story.actor?.display_name?.trim()
    || 'Usuario Buddy'
  );

  const text = getFirstNonEmptyText(story);
  const restoredTextLayers = getTextLayers(story);
  const textLayers = restoredTextLayers.length > 0
    ? restoredTextLayers
    : [
        getLegacyTextLayer(text),
      ].filter((
        layer,
      ): layer is StatusTextLayer => Boolean(layer));
  const primaryTextLayer = textLayers[0] || null;

  return {
    id: story.id,
    authorId: story.actor.actor_id,
    authorName,
    authorInitials: getInitials(authorName),
    authorColor: DEFAULT_AUTHOR_COLOR,
    authorAvatarUrl: story.actor.avatar_url?.trim() || null,
    type,
    text,
    photoUrl: isMedia
      ? story.media?.url || null
      : null,
    bgColor: isMedia
      ? null
      : (
          getEditorBackgroundColor(story)
          || resolveTextBackgroundColor(
            story,
            backgroundsById,
          )
        ),
    linkedProduct: null,
    textPosition: {
      x: primaryTextLayer?.x ?? 50,
      y: primaryTextLayer?.y ?? 50,
    },
    textSize: primaryTextLayer?.fontSize ?? 24,
    textWeight: primaryTextLayer?.fontWeight ?? '400',
    textFontFamily: primaryTextLayer?.fontFamily
      || normalizeStatusFontFamily(null),
    textColor: primaryTextLayer?.color ?? DEFAULT_TEXT_COLOR,
    textLayers,
    timestamp: formatRelativeTime(story.created_at),
    createdAt: story.created_at,
    isOwn: story.is_owner,
    viewed: story.is_viewed,
    viewedBy: story.is_owner
      ? []
      : undefined,
    viewerCount: story.viewer_count ?? 0,
  };
}
