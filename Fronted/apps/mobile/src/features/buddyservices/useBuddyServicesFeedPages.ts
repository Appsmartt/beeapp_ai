import type {
  MutableRefObject,
} from 'react';
import {
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  LIST_CACHE_TTL,
  publicCommercialProductFeedCacheKey,
  readRequestCache,
} from '@beeapp/api-client';
import type {
  CommercialModality,
  CommercialOfferType,
  CommercialPublicOffer,
  CommercialPublicProfile,
  GetPublicCommercialProductFeedResponse,
} from '@beeapp/shared-types';

import {
  BUDDY_SERVICES_LIST_PAGE_SIZE,
} from './buddyServicesListPagination';
import {
  toCommercialUiError,
  type CommercialUiError,
} from './commercialErrors';
import {
  loadPublicCommercialProductFeed,
} from '../../services/commercialService';

type FeedListTarget = 'offers' | 'profiles' | 'both';

interface UseBuddyServicesFeedPagesOptions {
  onError: (error: CommercialUiError | null) => void;
}

interface UseBuddyServicesFeedPagesResult {
  productFeed: CommercialPublicOffer[];
  searchProfiles: CommercialPublicProfile[];
  offersPage: number;
  offersTotalCount: number;
  profilesPage: number;
  profilesTotalCount: number;
  loadingProductFeed: boolean;
  pagingOffers: boolean;
  pagingProfiles: boolean;
  searchRequestVersionRef: MutableRefObject<number>;
  loadProductFeed: (
    options?: {
      search?: string;
      seed?: string;
      offerType?: CommercialOfferType | null;
      modality?: CommercialModality | null;
    },
  ) => Promise<void>;
  goToOffersPage: (page: number) => Promise<void>;
  goToProfilesPage: (page: number) => Promise<void>;
}

export function useBuddyServicesFeedPages(
  options: UseBuddyServicesFeedPagesOptions,
): UseBuddyServicesFeedPagesResult {
  const { onError } = options;
  const searchRequestVersionRef = useRef(0);
  const activeSearchRef = useRef('');
  const offerTypeRef = useRef<CommercialOfferType | null>(null);
  const modalityRef = useRef<CommercialModality | null>(null);
  const productFeedSeedRef = useRef('');
  const offersPageRef = useRef(1);
  const profilesPageRef = useRef(1);
  const offersPagingRequestIdRef = useRef(0);
  const profilesPagingRequestIdRef = useRef(0);

  const [productFeed, setProductFeed] = useState<
    CommercialPublicOffer[]
  >([]);
  const [searchProfiles, setSearchProfiles] = useState<
    CommercialPublicProfile[]
  >([]);
  const [offersPage, setOffersPage] = useState(1);
  const [offersTotalCount, setOffersTotalCount] = useState(0);
  const [profilesPage, setProfilesPage] = useState(1);
  const [profilesTotalCount, setProfilesTotalCount] = useState(0);
  const [loadingProductFeed, setLoadingProductFeed] = useState(true);
  const [pagingOffers, setPagingOffers] = useState(false);
  const [pagingProfiles, setPagingProfiles] = useState(false);

  offersPageRef.current = offersPage;
  profilesPageRef.current = profilesPage;

  const applyFeedResponse = useCallback((
    response: Awaited<
      ReturnType<typeof loadPublicCommercialProductFeed>
    >,
    update: FeedListTarget,
    nextOffersPage: number,
    nextProfilesPage: number,
  ) => {
    productFeedSeedRef.current = response.seed;

    if (update === 'both' || update === 'offers') {
      setProductFeed(response.offers);
      setOffersPage(nextOffersPage);
      setOffersTotalCount(response.count);
    }

    if (update === 'both' || update === 'profiles') {
      setSearchProfiles(response.profiles || []);
      setProfilesPage(nextProfilesPage);
      setProfilesTotalCount(
        response.profiles_count
          ?? response.profiles?.length
          ?? 0,
      );
    }
  }, []);

  const loadFeedPage = useCallback(async (params: {
    search?: string;
    seed?: string;
    offersPage?: number;
    profilesPage?: number;
    update: FeedListTarget;
  }) => {
    const normalizedSearch = String(
      params.search ?? activeSearchRef.current,
    ).trim();
    activeSearchRef.current = normalizedSearch;

    const nextOffersPage = (
      params.offersPage ?? offersPageRef.current
    );
    const nextProfilesPage = (
      params.profilesPage ?? profilesPageRef.current
    );
    const requestVersion = searchRequestVersionRef.current;

    const pageForOffset = params.update === 'profiles'
      ? nextProfilesPage
      : nextOffersPage;
    const requestOffset = (
      pageForOffset - 1
    ) * BUDDY_SERVICES_LIST_PAGE_SIZE;

    let offersPagingRequestId = 0;
    let profilesPagingRequestId = 0;

    if (params.update === 'both') {
      offersPagingRequestIdRef.current += 1;
      profilesPagingRequestIdRef.current += 1;
      setLoadingProductFeed(true);
      setPagingOffers(false);
      setPagingProfiles(false);
    } else if (params.update === 'offers') {
      offersPagingRequestId = (
        offersPagingRequestIdRef.current + 1
      );
      offersPagingRequestIdRef.current = offersPagingRequestId;
      setPagingOffers(true);
    } else {
      profilesPagingRequestId = (
        profilesPagingRequestIdRef.current + 1
      );
      profilesPagingRequestIdRef.current = profilesPagingRequestId;
      setPagingProfiles(true);
    }

    const feedQuery = {
      limit: BUDDY_SERVICES_LIST_PAGE_SIZE,
      offset: requestOffset,
      search: normalizedSearch || undefined,
      offer_type: offerTypeRef.current || undefined,
      modality: modalityRef.current || undefined,
      seed: normalizedSearch
        ? undefined
        : (params.seed ?? productFeedSeedRef.current) || undefined,
    };

    const cachedFeed = await readRequestCache<
      GetPublicCommercialProductFeedResponse
    >(
      publicCommercialProductFeedCacheKey(feedQuery),
      {
        ttlMs: LIST_CACHE_TTL.standard,
        allowStale: true,
      },
    );

    if (
      cachedFeed
      && requestVersion === searchRequestVersionRef.current
    ) {
      applyFeedResponse(
        cachedFeed,
        params.update,
        nextOffersPage,
        nextProfilesPage,
      );

      if (params.update === 'both') {
        setLoadingProductFeed(false);
      }
    }

    try {
      const response = await loadPublicCommercialProductFeed(feedQuery);

      if (requestVersion !== searchRequestVersionRef.current) {
        return;
      }

      if (
        params.update === 'offers'
        && offersPagingRequestId
          !== offersPagingRequestIdRef.current
      ) {
        return;
      }

      if (
        params.update === 'profiles'
        && profilesPagingRequestId
          !== profilesPagingRequestIdRef.current
      ) {
        return;
      }

      applyFeedResponse(
        response,
        params.update,
        nextOffersPage,
        nextProfilesPage,
      );
      onError(null);
    } catch (loadError) {
      if (requestVersion !== searchRequestVersionRef.current) {
        return;
      }

      if (
        params.update === 'offers'
        && offersPagingRequestId
          !== offersPagingRequestIdRef.current
      ) {
        return;
      }

      if (
        params.update === 'profiles'
        && profilesPagingRequestId
          !== profilesPagingRequestIdRef.current
      ) {
        return;
      }

      if (params.update === 'both') {
        setProductFeed([]);
        setSearchProfiles([]);
        setOffersPage(1);
        setProfilesPage(1);
        setOffersTotalCount(0);
        setProfilesTotalCount(0);
      }

      onError(toCommercialUiError(loadError));
    } finally {
      const searchCancelled = (
        requestVersion !== searchRequestVersionRef.current
      );

      if (params.update === 'both') {
        if (!searchCancelled) {
          setLoadingProductFeed(false);
        }
      } else if (params.update === 'offers') {
        if (
          offersPagingRequestId
            === offersPagingRequestIdRef.current
          || searchCancelled
        ) {
          setPagingOffers(false);
        }
      } else if (
        profilesPagingRequestId
          === profilesPagingRequestIdRef.current
        || searchCancelled
      ) {
        setPagingProfiles(false);
      }
    }
  }, [
    applyFeedResponse,
    onError,
  ]);

  const loadProductFeed = useCallback(async (
    loadOptions: {
      search?: string;
      seed?: string;
      offerType?: CommercialOfferType | null;
      modality?: CommercialModality | null;
    } = {},
  ) => {
    const normalizedSearch = String(
      loadOptions.search || '',
    ).trim();
    activeSearchRef.current = normalizedSearch;

    if ('offerType' in loadOptions) {
      offerTypeRef.current = loadOptions.offerType ?? null;
    }

    if ('modality' in loadOptions) {
      modalityRef.current = loadOptions.modality ?? null;
    }

    await loadFeedPage({
      offersPage: 1,
      profilesPage: 1,
      search: normalizedSearch,
      seed: loadOptions.seed,
      update: 'both',
    });
  }, [loadFeedPage]);

  const goToOffersPage = useCallback(async (page: number) => {
    if (page < 1 || pagingOffers || loadingProductFeed) {
      return;
    }

    const totalPages = Math.max(
      1,
      Math.ceil(
        offersTotalCount / BUDDY_SERVICES_LIST_PAGE_SIZE,
      ),
    );

    if (page > totalPages) {
      return;
    }

    await loadFeedPage({
      offersPage: page,
      profilesPage,
      update: 'offers',
    });
  }, [
    loadFeedPage,
    loadingProductFeed,
    offersTotalCount,
    pagingOffers,
    profilesPage,
  ]);

  const goToProfilesPage = useCallback(async (page: number) => {
    if (page < 1 || pagingProfiles || loadingProductFeed) {
      return;
    }

    const totalPages = Math.max(
      1,
      Math.ceil(
        profilesTotalCount / BUDDY_SERVICES_LIST_PAGE_SIZE,
      ),
    );

    if (page > totalPages) {
      return;
    }

    await loadFeedPage({
      offersPage,
      profilesPage: page,
      update: 'profiles',
    });
  }, [
    loadFeedPage,
    loadingProductFeed,
    offersPage,
    pagingProfiles,
    profilesTotalCount,
  ]);

  return {
    productFeed,
    searchProfiles,
    offersPage,
    offersTotalCount,
    profilesPage,
    profilesTotalCount,
    loadingProductFeed,
    pagingOffers,
    pagingProfiles,
    searchRequestVersionRef,
    loadProductFeed,
    goToOffersPage,
    goToProfilesPage,
  };
}
