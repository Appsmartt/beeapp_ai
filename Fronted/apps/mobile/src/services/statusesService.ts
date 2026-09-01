import {
  archiveStatus,
  createMediaStatus,
  createTextStatus,
  getMyStatuses,
  getStatusDetail,
  getStatusFeed,
  getStatusTextBackgrounds,
  getStatusViewers,
  registerStatusView,
  sendStatusReply,
  type StatusUploadFile,
} from '@beeapp/api-client';
import type {
  ArchiveStatusResponse,
  CreateMediaStatusPayload,
  CreateStatusResponse,
  CreateTextStatusPayload,
  GetStatusDetailResponse,
  GetStatusFeedResponse,
  GetStatusTextBackgroundsResponse,
  GetStatusViewersResponse,
  RegisterStatusViewResponse,
  SendStatusReplyPayload,
  StatusDetailQuery,
  StatusFeedQuery,
  StatusMineQuery,
  StatusMineResponse,
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
