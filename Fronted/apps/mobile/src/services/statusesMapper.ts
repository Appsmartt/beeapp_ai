import type {
  StatusStory,
  StatusTextBackground,
  StatusViewer,
} from '@beeapp/shared-types';

import type {
  StatusItem,
  StatusViewedBy,
} from '../mocks/statuses';

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

  return {
    id: story.id,
    authorId: story.actor.actor_id,
    authorName,
    authorInitials: getInitials(authorName),
    authorColor: DEFAULT_AUTHOR_COLOR,
    type,
    text,
    photoUrl: isMedia
      ? story.media?.url || null
      : null,
    bgColor: isMedia
      ? null
      : resolveTextBackgroundColor(
          story,
          backgroundsById,
        ),
    linkedProduct: null,
    textPosition: {
      x: 50,
      y: 50,
    },
    textSize: 24,
    textWeight: '400',
    textColor: DEFAULT_TEXT_COLOR,
    timestamp: formatRelativeTime(story.created_at),
    viewed: story.is_viewed,
    viewedBy: story.is_owner
      ? []
      : undefined,
    viewerCount: story.viewer_count ?? 0,
  };
}
