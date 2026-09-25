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

function groupStatusesForCircles(
  statuses: StatusItem[],
): StatusItem[] {
  const statusesByAuthor = new Map<
    string,
    StatusItem[]
  >();

  statuses
    .filter((status) => (
      !status.isOwn
      || status.authorActorType === 'commercial_profile'
    ))
    .forEach((status) => {
      const authorStatuses = (
        statusesByAuthor.get(status.authorId)
        || []
      );

      authorStatuses.push(status);
      statusesByAuthor.set(
        status.authorId,
        authorStatuses,
      );
    });

  return [...statusesByAuthor.values()]
    .map((authorStatuses) => {
      const latestStatus = authorStatuses[0];
      const unseenStatus = authorStatuses.find(
        (status) => !status.viewed,
      );

      return {
        latestStatus,
        circleStatus: unseenStatus || latestStatus,
      };
    })
    .filter((group): group is {
      latestStatus: StatusItem;
      circleStatus: StatusItem;
    } => Boolean(
      group.latestStatus
      && group.circleStatus,
    ))
    .sort((first, second) => (
      new Date(
        second.latestStatus.createdAt || 0,
      ).getTime()
      - new Date(
        first.latestStatus.createdAt || 0,
      ).getTime()
    ))
    .map((group) => group.circleStatus);
}

export interface UseStatusesOptions {
  commercialProfileId?: string | null;
}

export interface UseStatusesResult {
  statuses: StatusItem[];
  circleStatuses: StatusItem[];
  ownStatuses: StatusItem[];
  backgrounds: StatusTextBackground[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markStatusViewedLocally: (statusId: string) => void;
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
  const [ownStatuses, setOwnStatuses] = useState<StatusItem[]>(
    [],
  );
  const [circleStatuses, setCircleStatuses] = useState<
    StatusItem[]
  >([]);
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

        const mappedOwnStatuses = mapStoriesToUi(
          ownStories,
          backgroundsResponse.backgrounds,
        ).sort((first, second) => (
          new Date(second.createdAt || 0).getTime()
          - new Date(first.createdAt || 0).getTime()
        ));

        const mappedStatuses = mapStoriesToUi(
          sortedStories,
          backgroundsResponse.backgrounds,
        );

        setBackgrounds(backgroundsResponse.backgrounds);
        setOwnStatuses(mappedOwnStatuses);
        setCircleStatuses(
          groupStatusesForCircles(mappedStatuses),
        );
        setStatuses(mappedStatuses);
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

  const markStatusViewedLocally = useCallback(
    (statusId: string) => {
      setStatuses((currentStatuses) => {
        const nextStatuses = currentStatuses.map((status) => (
          status.id === statusId && !status.isOwn
            ? {
                ...status,
                viewed: true,
              }
            : status
        ));

        setCircleStatuses(
          groupStatusesForCircles(nextStatuses),
        );

        return nextStatuses;
      });
    },
    [],
  );

  return {
    statuses,
    circleStatuses,
    ownStatuses,
    backgrounds,
    loading,
    refreshing,
    error,
    refresh,
    markStatusViewedLocally,
  };
}
