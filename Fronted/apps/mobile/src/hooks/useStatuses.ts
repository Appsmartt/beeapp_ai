import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import type {
  StatusStory,
  StatusTextBackground,
} from '@beeapp/shared-types';

import type {
  StatusItem,
} from '../mocks/statuses';
import {
  loadMyStatuses,
  loadStatusFeed,
  loadStatusTextBackgrounds,
} from '../services/statusesService';
import {
  createStatusBackgroundMap,
  mapStatusStoryToUi,
} from '../services/statusesMapper';

function flattenMyStatusStories(
  stories: Awaited<
    ReturnType<typeof loadMyStatuses>
  >,
): StatusStory[] {
  return [
    ...stories.active.profile.stories,
    ...stories.active.commercial_profiles.flatMap(
      (item) => item.stories,
    ),
  ];
}

function flattenCommercialStatusStories(
  stories: Awaited<
    ReturnType<typeof loadMyStatuses>
  >,
  commercialProfileId: string,
): StatusStory[] {
  return stories.active.commercial_profiles
    .filter((item) => (
      item.actor.commercial_profile_id
      === commercialProfileId
    ))
    .flatMap((item) => item.stories);
}

function flattenFeedStories(
  feed: Awaited<
    ReturnType<typeof loadStatusFeed>
  >,
): StatusStory[] {
  return feed.items.flatMap(
    (item) => item.stories,
  );
}

function mapStoriesToUi(
  stories: StatusStory[],
  backgrounds: StatusTextBackground[],
): StatusItem[] {
  const backgroundsById = createStatusBackgroundMap(
    backgrounds,
  );

  return stories.map((story) => (
    mapStatusStoryToUi(
      story,
      backgroundsById,
    )
  ));
}

export interface UseStatusesOptions {
  commercialProfileId?: string | null;
}

export interface UseStatusesResult {
  statuses: StatusItem[];
  backgrounds: StatusTextBackground[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useStatuses(
  {
    commercialProfileId = null,
  }: UseStatusesOptions = {},
): UseStatusesResult {
  const normalizedCommercialProfileId = String(
    commercialProfileId || '',
  ).trim() || null;

  const [statuses, setStatuses] = useState<StatusItem[]>(
    [],
  );
  const [backgrounds, setBackgrounds] = useState<
    StatusTextBackground[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options: { refresh?: boolean } = {}) => {
      const isRefresh = Boolean(options.refresh);

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const [
          backgroundsResponse,
          mineResponse,
        ] = await Promise.all([
          loadStatusTextBackgrounds(),
          loadMyStatuses(),
        ]);

        const ownStories = normalizedCommercialProfileId
          ? flattenCommercialStatusStories(
              mineResponse,
              normalizedCommercialProfileId,
            )
          : flattenMyStatusStories(mineResponse);

        const feedStories = normalizedCommercialProfileId
          ? []
          : flattenFeedStories(
              await loadStatusFeed(),
            );

        const uniqueStories = new Map<string, StatusStory>();

        [...ownStories, ...feedStories].forEach((story) => {
          uniqueStories.set(story.id, story);
        });

        const sortedStories = [...uniqueStories.values()]
          .sort((first, second) => (
            new Date(second.created_at).getTime()
            - new Date(first.created_at).getTime()
          ));

        setBackgrounds(backgroundsResponse.backgrounds);
        setStatuses(
          mapStoriesToUi(
            sortedStories,
            backgroundsResponse.backgrounds,
          ),
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No fue posible cargar los estados.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      normalizedCommercialProfileId,
    ],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(
    async () => {
      await load({
        refresh: true,
      });
    },
    [load],
  );

  return {
    statuses,
    backgrounds,
    loading,
    refreshing,
    error,
    refresh,
  };
}
