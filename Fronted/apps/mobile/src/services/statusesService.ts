import {
  acceptStatusFollowRequest,
  archiveStatus,
  createMediaStatus,
  createStatusFollow,
  createTextStatus,
  deleteStatusFollow,
  discoverStatusFollowTargets,
  getMyStatuses,
  getStatusDetail,
  getStatusFeed,
  getStatusFollowRequests,
  getStatusFollowers,
  getStatusFollowing,
  getStatusTextBackgrounds,
  getStatusViewers,
  registerStatusView,
  rejectStatusFollowRequest,
  sendStatusReply,
  type StatusUploadFile,
} from '@beeapp/api-client';
import type {
  ArchiveStatusResponse,
  CreateMediaStatusPayload,
  CreateStatusFollowPayload,
  CreateStatusFollowResponse,
  CreateStatusResponse,
  CreateTextStatusPayload,
  GetStatusDetailResponse,
  GetStatusFeedResponse,
  GetStatusFollowDiscoverResponse,
  GetStatusFollowRequestsResponse,
  GetStatusFollowersResponse,
  GetStatusFollowingResponse,
  GetStatusTextBackgroundsResponse,
  GetStatusViewersResponse,
  RegisterStatusViewResponse,
  SendStatusReplyPayload,
  StatusDetailQuery,
  StatusFeedQuery,
  StatusFollowDiscoverQuery,
  StatusFollowListQuery,
  StatusFollowersQuery,
  StatusMineQuery,
  StatusMineResponse,
  UpdateStatusFollowResponse,
} from '@beeapp/shared-types';

import {
  getValidSessionCredentials,
} from './authSession';

async function getRequiredStatusCredentials() {
  const credentials = await getValidSessionCredentials();

  if (!credentials) {
    throw new Error(
      'Tu sesión expiró. Inicia sesión nuevamente.',
    );
  }

  return credentials;
}

export async function loadStatusTextBackgrounds(): Promise<
  GetStatusTextBackgroundsResponse
> {
  return getStatusTextBackgrounds(
    await getRequiredStatusCredentials(),
  );
}

export async function loadStatusFeed(
  query: StatusFeedQuery = {},
): Promise<GetStatusFeedResponse> {
  return getStatusFeed(
    await getRequiredStatusCredentials(),
    query,
  );
}

export async function searchStatusFollowTargets(
  query: StatusFollowDiscoverQuery,
): Promise<GetStatusFollowDiscoverResponse> {
  return discoverStatusFollowTargets(
    await getRequiredStatusCredentials(),
    query,
  );
}

export async function followStatusTarget(
  payload: CreateStatusFollowPayload,
): Promise<CreateStatusFollowResponse> {
  return createStatusFollow(
    await getRequiredStatusCredentials(),
    payload,
  );
}

export async function loadStatusFollowing(
  query: StatusFollowListQuery = {},
): Promise<GetStatusFollowingResponse> {
  return getStatusFollowing(
    await getRequiredStatusCredentials(),
    query,
  );
}

export async function loadStatusFollowers(
  query: StatusFollowersQuery = {},
): Promise<GetStatusFollowersResponse> {
  return getStatusFollowers(
    await getRequiredStatusCredentials(),
    query,
  );
}

export async function loadStatusFollowRequests(
  query: StatusFollowListQuery = {},
): Promise<GetStatusFollowRequestsResponse> {
  return getStatusFollowRequests(
    await getRequiredStatusCredentials(),
    query,
  );
}

export async function acceptStatusFollow(
  followId: string,
): Promise<UpdateStatusFollowResponse> {
  return acceptStatusFollowRequest(
    await getRequiredStatusCredentials(),
    followId,
  );
}

export async function rejectStatusFollow(
  followId: string,
): Promise<UpdateStatusFollowResponse> {
  return rejectStatusFollowRequest(
    await getRequiredStatusCredentials(),
    followId,
  );
}

export async function removeStatusFollow(
  followId: string,
): Promise<void> {
  await deleteStatusFollow(
    await getRequiredStatusCredentials(),
    followId,
  );
}

export async function loadMyStatuses(
  query: StatusMineQuery = {},
): Promise<StatusMineResponse> {
  return getMyStatuses(
    await getRequiredStatusCredentials(),
    query,
  );
}

export async function loadStatusDetail(
  statusId: string,
  query: StatusDetailQuery = {},
): Promise<GetStatusDetailResponse> {
  return getStatusDetail(
    await getRequiredStatusCredentials(),
    statusId,
    query,
  );
}

export async function publishTextStatus(
  payload: CreateTextStatusPayload,
): Promise<CreateStatusResponse> {
  return createTextStatus(
    await getRequiredStatusCredentials(),
    payload,
  );
}

export async function publishMediaStatus(
  payload: CreateMediaStatusPayload,
  file: StatusUploadFile,
): Promise<CreateStatusResponse> {
  return createMediaStatus(
    await getRequiredStatusCredentials(),
    payload,
    file,
  );
}

export async function archiveCurrentStatus(
  statusId: string,
): Promise<ArchiveStatusResponse> {
  return archiveStatus(
    await getRequiredStatusCredentials(),
    statusId,
  );
}

export async function markStatusViewed(
  statusId: string,
): Promise<RegisterStatusViewResponse> {
  return registerStatusView(
    await getRequiredStatusCredentials(),
    statusId,
  );
}

export async function loadStatusViewers(
  statusId: string,
): Promise<GetStatusViewersResponse> {
  return getStatusViewers(
    await getRequiredStatusCredentials(),
    statusId,
  );
}

export async function replyToStatus(
  statusId: string,
  payload: SendStatusReplyPayload,
): Promise<unknown> {
  return sendStatusReply(
    await getRequiredStatusCredentials(),
    statusId,
    payload,
  );
}
