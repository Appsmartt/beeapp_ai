import type {
  ArchiveStatusResponse,
  AuthCredentials,
  CreateMediaStatusPayload,
  CreateStatusResponse,
  CreateTextStatusPayload,
  GetStatusDetailResponse,
  GetStatusFeedResponse,
  GetStatusTextBackgroundsResponse,
  GetStatusViewersResponse,
  RegisterStatusViewResponse,
  SendStatusReplyPayload,
  StatusActorType,
  StatusDetailQuery,
  StatusFeedQuery,
  StatusMineQuery,
  StatusMineResponse,
} from '@beeapp/shared-types';

import {
  api,
} from './client';

function toQueryString(
  values: Record<
    string,
    string | number | boolean | null | undefined
  >,
): string {
  const parameters = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (
      value === null
      || value === undefined
    ) {
      return;
    }

    parameters.set(key, String(value));
  });

  const query = parameters.toString();

  return query ? `?${query}` : '';
}

function appendOptionalString(
  formData: FormData,
  key: string,
  value: string | null | undefined,
): void {
  if (
    value !== null
    && value !== undefined
    && value.trim()
  ) {
    formData.append(key, value.trim());
  }
}

function appendOptionalJson(
  formData: FormData,
  key: string,
  value: Record<string, unknown> | undefined,
): void {
  if (!value) {
    return;
  }

  formData.append(key, JSON.stringify(value));
}

function appendActorFields(
  formData: FormData,
  payload: CreateMediaStatusPayload,
): void {
  if (payload.actor_type) {
    formData.append(
      'actor_type',
      payload.actor_type,
    );
  }

  if (payload.actor_commercial_profile_id) {
    formData.append(
      'actor_commercial_profile_id',
      payload.actor_commercial_profile_id,
    );
  }
}

export interface StatusUploadFile {
  uri: string;
  name: string;
  mimeType: string;
}

export async function getStatusTextBackgrounds(
  auth: AuthCredentials,
): Promise<GetStatusTextBackgroundsResponse> {
  return api.get<GetStatusTextBackgroundsResponse>(
    '/statuses/text-backgrounds/',
    {
      auth,
    },
  );
}

export async function getStatusFeed(
  auth: AuthCredentials,
  query: StatusFeedQuery = {},
): Promise<GetStatusFeedResponse> {
  return api.get<GetStatusFeedResponse>(
    `/statuses/feed/${toQueryString({
      limit: query.limit,
    })}`,
    {
      auth,
    },
  );
}

export async function getMyStatuses(
  auth: AuthCredentials,
  query: StatusMineQuery = {},
): Promise<StatusMineResponse> {
  return api.get<StatusMineResponse>(
    `/statuses/mine/${toQueryString({
      include_archived: query.include_archived,
    })}`,
    {
      auth,
    },
  );
}

export async function getStatusDetail(
  auth: AuthCredentials,
  statusId: string,
  query: StatusDetailQuery = {},
): Promise<GetStatusDetailResponse> {
  return api.get<GetStatusDetailResponse>(
    `/statuses/${encodeURIComponent(statusId)}/${toQueryString({
      include_archived: query.include_archived,
    })}`,
    {
      auth,
    },
  );
}

export async function createTextStatus(
  auth: AuthCredentials,
  payload: CreateTextStatusPayload,
): Promise<CreateStatusResponse> {
  return api.post<CreateStatusResponse>(
    '/statuses/',
    payload,
    {
      auth,
    },
  );
}

export async function createMediaStatus(
  auth: AuthCredentials,
  payload: CreateMediaStatusPayload,
  file: StatusUploadFile,
): Promise<CreateStatusResponse> {
  const formData = new FormData();

  formData.append('kind', payload.kind);

  appendActorFields(formData, payload);
  appendOptionalString(
    formData,
    'caption',
    payload.caption,
  );
  appendOptionalJson(
    formData,
    'editor_metadata',
    payload.editor_metadata,
  );

  if (payload.kind === 'video') {
    if (
      payload.duration_seconds === undefined
      || payload.duration_seconds === null
      || !Number.isFinite(payload.duration_seconds)
      || payload.duration_seconds <= 0
    ) {
      throw new Error(
        'Los estados de video requieren una duración válida.',
      );
    }

    formData.append(
      'duration_seconds',
      String(payload.duration_seconds),
    );
  }

  formData.append(
    'file',
    {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as unknown as Blob,
  );

  return api.upload<CreateStatusResponse>(
    '/statuses/',
    formData,
    {
      auth,
    },
  );
}

export async function archiveStatus(
  auth: AuthCredentials,
  statusId: string,
): Promise<ArchiveStatusResponse> {
  return api.delete<ArchiveStatusResponse>(
    `/statuses/${encodeURIComponent(statusId)}/`,
    {
      auth,
    },
  );
}

export async function registerStatusView(
  auth: AuthCredentials,
  statusId: string,
): Promise<RegisterStatusViewResponse> {
  return api.post<RegisterStatusViewResponse>(
    `/statuses/${encodeURIComponent(statusId)}/views/`,
    undefined,
    {
      auth,
    },
  );
}

export async function getStatusViewers(
  auth: AuthCredentials,
  statusId: string,
): Promise<GetStatusViewersResponse> {
  return api.get<GetStatusViewersResponse>(
    `/statuses/${encodeURIComponent(statusId)}/viewers/`,
    {
      auth,
    },
  );
}

export async function sendStatusReply(
  auth: AuthCredentials,
  statusId: string,
  payload: SendStatusReplyPayload,
): Promise<unknown> {
  return api.post<unknown>(
    `/statuses/${encodeURIComponent(statusId)}/replies/`,
    payload,
    {
      auth,
    },
  );
}

export type {
  StatusActorType,
};
