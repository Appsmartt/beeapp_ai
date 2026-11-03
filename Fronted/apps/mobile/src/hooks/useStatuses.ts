import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LIST_CACHE_TTL,
  readRequestCache,
  readRequestCacheSync,
} from '@beeapp/api-client';
import { retryBackgroundLoad } from '../utils/retryBackgroundLoad';

import type {
  GetStatusFeedResponse,
  GetStatusTextBackgroundsResponse,
  StatusMineResponse,
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

type StatusesSnapshot = {
  backgrounds: StatusTextBackground[];
  ownStatuses: StatusItem[];
  circleStatuses: StatusItem[];
  statuses: StatusItem[];
  loading: boolean;
  hasLoaded: boolean;
};

function buildStatusesSnapshotFromCache(
  commercialProfileId: string | null,
): StatusesSnapshot {
  const empty: StatusesSnapshot = {
    backgrounds: [],
    ownStatuses: [],
    circleStatuses: [],
    statuses: [],
    loading: true,
    hasLoaded: false,
  };

  const cachedBackgrounds = readRequestCacheSync<
    GetStatusTextBackgroundsResponse
  >(
    '/statuses/text-backgrounds/',
    {
      ttlMs: LIST_CACHE_TTL.stable,
      allowStale: true,
    },
  );
  const cachedMine = readRequestCacheSync<StatusMineResponse>(
    '/statuses/mine/',
    {
      ttlMs: LIST_CACHE_TTL.fresh,
      allowStale: true,
    },
  );
  const cachedFeed = commercialProfileId
    ? null
    : readRequestCacheSync<GetStatusFeedResponse>(
      '/statuses/feed/',
      {
        ttlMs: LIST_CACHE_TTL.fresh,
        allowStale: true,
      },
    );

  if (!cachedBackgrounds || !cachedMine) {
    return empty;
  }

  const ownStories = commercialProfileId
    ? flattenCommercialStatusStories(
      cachedMine,
      commercialProfileId,
    )
    : flattenMyStatusStories(cachedMine);
  const feedStories = cachedFeed
    ? flattenFeedStories(cachedFeed)
    : [];
  const uniqueStories = new Map<string, StatusStory>();

  [...ownStories, ...feedStories].forEach((story) => {
    uniqueStories.set(story.id, story);
  });

  const sortedStories = [...uniqueStories.values()]
    .sort((first, second) => (
      new Date(second.created_at).getTime()
      - new Date(first.created_at).getTime()
    ));

  const mappedStatuses = mapStoriesToUi(
    sortedStories,
    cachedBackgrounds.backgrounds,
  );

  return {
    backgrounds: cachedBackgrounds.backgrounds,
    ownStatuses: mapStoriesToUi(
      ownStories,
      cachedBackgrounds.backgrounds,
    ),
    circleStatuses: groupStatusesForCircles(mappedStatuses),
    statuses: mappedStatuses,
    loading: false,
    hasLoaded: true,
  };
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

  const initialSnapshot = useMemo(
    () => buildStatusesSnapshotFromCache(
      normalizedCommercialProfileId,
    ),
    [normalizedCommercialProfileId],
  );

  const [statuses, setStatuses] = useState<StatusItem[]>(
    () => initialSnapshot.statuses,
  );
  const [ownStatuses, setOwnStatuses] = useState<StatusItem[]>(
    () => initialSnapshot.ownStatuses,
  );
  const [circleStatuses, setCircleStatuses] = useState<
    StatusItem[]
  >(() => initialSnapshot.circleStatuses);
  const [backgrounds, setBackgrounds] = useState<
    StatusTextBackground[]
  >(() => initialSnapshot.backgrounds);
  const [loading, setLoading] = useState(
    () => initialSnapshot.loading,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(initialSnapshot.hasLoaded);

  const load = useCallback(
    async (options: { refresh?: boolean } = {}) => {
      const isRefresh = Boolean(options.refresh);
      const hadLoaded = hasLoadedRef.current;

      const [cachedBackgrounds, cachedMine, cachedFeed] = await Promise.all([
        readRequestCache<GetStatusTextBackgroundsResponse>(
          '/statuses/text-backgrounds/',
          {
            ttlMs: LIST_CACHE_TTL.stable,
            allowStale: true,
          },
        ),
        readRequestCache<StatusMineResponse>(
          '/statuses/mine/',
          {
            ttlMs: LIST_CACHE_TTL.fresh,
            allowStale: true,
          },
        ),
        normalizedCommercialProfileId
          ? Promise.resolve(null)
          : readRequestCache<GetStatusFeedResponse>(
            '/statuses/feed/',
            {
              ttlMs: LIST_CACHE_TTL.fresh,
              allowStale: true,
            },
          ),
      ]);

      if (cachedBackgrounds && cachedMine) {
        const ownStories = normalizedCommercialProfileId
          ? flattenCommercialStatusStories(
            cachedMine,
            normalizedCommercialProfileId,
          )
          : flattenMyStatusStories(cachedMine);
        const feedStories = cachedFeed
          ? flattenFeedStories(cachedFeed)
          : [];
        const uniqueStories = new Map<string, StatusStory>();

        [...ownStories, ...feedStories].forEach((story) => {
          uniqueStories.set(story.id, story);
        });

        const sortedStories = [...uniqueStories.values()]
          .sort((first, second) => (
            new Date(second.created_at).getTime()
            - new Date(first.created_at).getTime()
          ));

        setBackgrounds(cachedBackgrounds.backgrounds);
        setOwnStatuses(mapStoriesToUi(
          ownStories,
          cachedBackgrounds.backgrounds,
        ));
        const mappedStatuses = mapStoriesToUi(
          sortedStories,
          cachedBackgrounds.backgrounds,
        );
        setCircleStatuses(groupStatusesForCircles(mappedStatuses));
        setStatuses(mappedStatuses);
        hasLoadedRef.current = true;
        setLoading(false);
      } else if (isRefresh && !hadLoaded) {
        setRefreshing(true);
      } else if (!hadLoaded) {
        setLoading(true);
      }

      setError(null);

      try {
        await retryBackgroundLoad(async () => {
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
          hasLoadedRef.current = true;
        });
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
