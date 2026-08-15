import type {
    AuthCredentials,
    CreateFileSharePayload,
    CreateFileShareResponse,
    CreateStorageFolderPayload,
    CreateStorageFolderResponse,
    CreateStorageTagPayload,
    CreateStorageTagResponse,
    CreateStorageUploadResponse,
    GetReceivedSharesResponse,
    GetStorageFileAccessResponse,
    GetStorageFilesResponse,
    GetStorageFileTagsResponse,
    GetStorageFoldersResponse,
    GetStorageShareRecipientsResponse,
    GetStorageSummaryResponse,
    GetStorageTagsResponse,
    MoveStorageFilePayload,
    MoveStorageFolderPayload,
    ReceivedSharesQuery,
    ReplaceFileTagsPayload,
    ReplaceFileTagsResponse,
    StorageFilesQuery,
    StorageFoldersQuery,
    UpdateFileShareResponse,
    UpdateStorageFilePayload,
    UpdateStorageFileResponse,
    UpdateStorageFolderPayload,
    UpdateStorageFolderResponse,
    UpdateStorageTagPayload,
    UpdateStorageTagResponse,
    } from '@beeapp/shared-types';

import { api } from './client';

const WEB_OPTIONS = {
    credentials: 'include' as RequestCredentials,
};

function buildQuery(
    params: object,
    ): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (
        value !== undefined
        && value !== null
        && value !== ''
        ) {
        searchParams.set(key, String(value));
        }
    });

    const query = searchParams.toString();

    return query ? `?${query}` : '';
}

/* Mobile API: auth is explicit. */

export function getStorageSummary(
    auth: AuthCredentials,
    ): Promise<GetStorageSummaryResponse> {
    return api.get<GetStorageSummaryResponse>(
        '/storage/summary/',
        { auth },
    );
}

export function getStorageFiles(
    auth: AuthCredentials,
    query: StorageFilesQuery = {},
    ): Promise<GetStorageFilesResponse> {
    return api.get<GetStorageFilesResponse>(
        `/storage/files/${buildQuery(query)}`,
        { auth },
    );
}

export function getStorageFolders(
    auth: AuthCredentials,
    query: StorageFoldersQuery = {},
    ): Promise<GetStorageFoldersResponse> {
    return api.get<GetStorageFoldersResponse>(
        `/storage/folders/${buildQuery(query)}`,
        { auth },
    );
}

export function createStorageFolder(
    auth: AuthCredentials,
    payload: CreateStorageFolderPayload,
    ): Promise<CreateStorageFolderResponse> {
    return api.post<CreateStorageFolderResponse>(
        '/storage/folders/',
        payload,
        { auth },
    );
}

export function renameStorageFolder(
    auth: AuthCredentials,
    folderId: string,
    payload: UpdateStorageFolderPayload,
    ): Promise<UpdateStorageFolderResponse> {
    return api.patch<UpdateStorageFolderResponse>(
        `/storage/folders/${encodeURIComponent(folderId)}/`,
        payload,
        { auth },
    );
}

export function moveStorageFolder(
    auth: AuthCredentials,
    folderId: string,
    payload: MoveStorageFolderPayload,
    ): Promise<UpdateStorageFolderResponse> {
    return api.patch<UpdateStorageFolderResponse>(
        `/storage/folders/${encodeURIComponent(folderId)}/`,
        payload,
        { auth },
    );
}

export async function deleteStorageFolder(
    auth: AuthCredentials,
    folderId: string,
    ): Promise<void> {
    await api.delete<void>(
        `/storage/folders/${encodeURIComponent(folderId)}/`,
        { auth },
    );
}

export function renameStorageFile(
    auth: AuthCredentials,
    fileId: string,
    payload: UpdateStorageFilePayload,
    ): Promise<UpdateStorageFileResponse> {
    return api.patch<UpdateStorageFileResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/`,
        payload,
        { auth },
    );
}

export function moveStorageFile(
    auth: AuthCredentials,
    fileId: string,
    payload: MoveStorageFilePayload,
    ): Promise<UpdateStorageFileResponse> {
    return api.patch<UpdateStorageFileResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/`,
        payload,
        { auth },
    );
}

export async function uploadStorageFiles(
    auth: AuthCredentials,
    formData: FormData,
    ): Promise<CreateStorageUploadResponse> {
    return api.upload<CreateStorageUploadResponse>(
        '/storage/uploads/',
        formData,
        { auth },
    );
}

export const uploadStorageFile = uploadStorageFiles;

export function getStorageFileAccess(
    auth: AuthCredentials,
    fileId: string,
    download = false,
    ): Promise<GetStorageFileAccessResponse> {
    return api.get<GetStorageFileAccessResponse>(
        `/storage/files/${encodeURIComponent(
        fileId,
        )}/access/?download=${download}`,
        { auth },
    );
}

export async function moveStorageFileToTrash(
    auth: AuthCredentials,
    fileId: string,
    ): Promise<void> {
    await api.post<void>(
        `/storage/files/${encodeURIComponent(fileId)}/trash/`,
        undefined,
        { auth },
    );
}

export async function restoreStorageFile(
    auth: AuthCredentials,
    fileId: string,
    ): Promise<void> {
    await api.post<void>(
        `/storage/files/${encodeURIComponent(fileId)}/restore/`,
        undefined,
        { auth },
    );
}

export async function permanentlyDeleteStorageFile(
    auth: AuthCredentials,
    fileId: string,
    ): Promise<void> {
    await api.delete<void>(
        `/storage/files/${encodeURIComponent(fileId)}/`,
        { auth },
    );
}

export function getStorageTags(
    auth: AuthCredentials,
    ): Promise<GetStorageTagsResponse> {
    return api.get<GetStorageTagsResponse>(
        '/storage/tags/',
        { auth },
    );
}

export function createStorageTag(
    auth: AuthCredentials,
    payload: CreateStorageTagPayload,
    ): Promise<CreateStorageTagResponse> {
    return api.post<CreateStorageTagResponse>(
        '/storage/tags/',
        payload,
        { auth },
    );
}

export function updateStorageTag(
    auth: AuthCredentials,
    tagId: string,
    payload: UpdateStorageTagPayload,
    ): Promise<UpdateStorageTagResponse> {
    return api.patch<UpdateStorageTagResponse>(
        `/storage/tags/${encodeURIComponent(tagId)}/`,
        payload,
        { auth },
    );
}

export async function deleteStorageTag(
    auth: AuthCredentials,
    tagId: string,
    ): Promise<void> {
    await api.delete<void>(
        `/storage/tags/${encodeURIComponent(tagId)}/`,
        { auth },
    );
}

export function getStorageFileTags(
    auth: AuthCredentials,
    fileId: string,
    ): Promise<GetStorageFileTagsResponse> {
    return api.get<GetStorageFileTagsResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/tags/`,
        { auth },
    );
}

export function replaceStorageFileTags(
    auth: AuthCredentials,
    fileId: string,
    payload: ReplaceFileTagsPayload,
    ): Promise<ReplaceFileTagsResponse> {
    return api.put<ReplaceFileTagsResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/tags/`,
        payload,
        { auth },
    );
}

export function searchStorageShareRecipients(
    auth: AuthCredentials,
    searchValue: string,
    limit = 10,
    ): Promise<GetStorageShareRecipientsResponse> {
    return api.get<GetStorageShareRecipientsResponse>(
        `/storage/share-recipients/${buildQuery({
        q: searchValue,
        limit,
        })}`,
        { auth },
    );
}

export function createStorageFileShare(
    auth: AuthCredentials,
    fileId: string,
    payload: CreateFileSharePayload,
    ): Promise<CreateFileShareResponse> {
    return api.post<CreateFileShareResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/shares/`,
        payload,
        { auth },
    );
}

export function getReceivedStorageShares(
    auth: AuthCredentials,
    query: ReceivedSharesQuery = {},
    ): Promise<GetReceivedSharesResponse> {
    return api.get<GetReceivedSharesResponse>(
        `/storage/shares/received/${buildQuery(query)}`,
        { auth },
    );
}

export function hideReceivedStorageShare(
    auth: AuthCredentials,
    shareId: string,
    ): Promise<UpdateFileShareResponse> {
    return api.post<UpdateFileShareResponse>(
        `/storage/shares/${encodeURIComponent(shareId)}/hide/`,
        undefined,
        { auth },
    );
}

export function revokeStorageFileShare(
    auth: AuthCredentials,
    shareId: string,
    ): Promise<UpdateFileShareResponse> {
    return api.post<UpdateFileShareResponse>(
        `/storage/shares/${encodeURIComponent(shareId)}/revoke/`,
        undefined,
        { auth },
    );
}

/* Web API: authentication uses the HttpOnly web-session cookie. */

export function getCurrentWebStorageSummary(): Promise<GetStorageSummaryResponse> {
    return api.get<GetStorageSummaryResponse>(
        '/storage/summary/',
        WEB_OPTIONS,
    );
}

export function getCurrentWebStorageFiles(
    query: StorageFilesQuery = {},
    ): Promise<GetStorageFilesResponse> {
    return api.get<GetStorageFilesResponse>(
        `/storage/files/${buildQuery(query)}`,
        WEB_OPTIONS,
    );
}

export function getCurrentWebStorageFolders(
    query: StorageFoldersQuery = {},
    ): Promise<GetStorageFoldersResponse> {
    return api.get<GetStorageFoldersResponse>(
        `/storage/folders/${buildQuery(query)}`,
        WEB_OPTIONS,
    );
}

export function createCurrentWebStorageFolder(
    payload: CreateStorageFolderPayload,
    ): Promise<CreateStorageFolderResponse> {
    return api.post<CreateStorageFolderResponse>(
        '/storage/folders/',
        payload,
        WEB_OPTIONS,
    );
}

export function renameCurrentWebStorageFolder(
    folderId: string,
    payload: UpdateStorageFolderPayload,
    ): Promise<UpdateStorageFolderResponse> {
    return api.patch<UpdateStorageFolderResponse>(
        `/storage/folders/${encodeURIComponent(folderId)}/`,
        payload,
        WEB_OPTIONS,
    );
}

export function moveCurrentWebStorageFolder(
    folderId: string,
    payload: MoveStorageFolderPayload,
    ): Promise<UpdateStorageFolderResponse> {
    return api.patch<UpdateStorageFolderResponse>(
        `/storage/folders/${encodeURIComponent(folderId)}/`,
        payload,
        WEB_OPTIONS,
    );
}

export function renameCurrentWebStorageFile(
    fileId: string,
    payload: UpdateStorageFilePayload,
    ): Promise<UpdateStorageFileResponse> {
    return api.patch<UpdateStorageFileResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/`,
        payload,
        WEB_OPTIONS,
    );
}

export function moveCurrentWebStorageFile(
    fileId: string,
    payload: MoveStorageFilePayload,
    ): Promise<UpdateStorageFileResponse> {
    return api.patch<UpdateStorageFileResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/`,
        payload,
        WEB_OPTIONS,
    );
}

export async function uploadCurrentWebStorageFiles(
    formData: FormData,
    ): Promise<CreateStorageUploadResponse> {
    return api.upload<CreateStorageUploadResponse>(
        '/storage/uploads/',
        formData,
        WEB_OPTIONS,
    );
}

export function getCurrentWebStorageFileAccess(
    fileId: string,
    download = false,
    ): Promise<GetStorageFileAccessResponse> {
    return api.get<GetStorageFileAccessResponse>(
        `/storage/files/${encodeURIComponent(
        fileId,
        )}/access/?download=${download}`,
        WEB_OPTIONS,
    );
}

export async function moveCurrentWebStorageFileToTrash(
    fileId: string,
    ): Promise<void> {
    await api.post<void>(
        `/storage/files/${encodeURIComponent(fileId)}/trash/`,
        undefined,
        WEB_OPTIONS,
    );
}

export function getCurrentWebStorageTags(): Promise<GetStorageTagsResponse> {
    return api.get<GetStorageTagsResponse>(
        '/storage/tags/',
        WEB_OPTIONS,
    );
}

export function createCurrentWebStorageTag(
    payload: CreateStorageTagPayload,
    ): Promise<CreateStorageTagResponse> {
    return api.post<CreateStorageTagResponse>(
        '/storage/tags/',
        payload,
        WEB_OPTIONS,
    );
}

export function getCurrentWebStorageFileTags(
    fileId: string,
    ): Promise<GetStorageFileTagsResponse> {
    return api.get<GetStorageFileTagsResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/tags/`,
        WEB_OPTIONS,
    );
}

export function replaceCurrentWebStorageFileTags(
    fileId: string,
    payload: ReplaceFileTagsPayload,
    ): Promise<ReplaceFileTagsResponse> {
    return api.put<ReplaceFileTagsResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/tags/`,
        payload,
        WEB_OPTIONS,
    );
}

export function searchCurrentWebStorageShareRecipients(
    searchValue: string,
    limit = 10,
    ): Promise<GetStorageShareRecipientsResponse> {
    return api.get<GetStorageShareRecipientsResponse>(
        `/storage/share-recipients/${buildQuery({
        q: searchValue,
        limit,
        })}`,
        WEB_OPTIONS,
    );
}

export function createCurrentWebStorageFileShare(
    fileId: string,
    payload: CreateFileSharePayload,
    ): Promise<CreateFileShareResponse> {
    return api.post<CreateFileShareResponse>(
        `/storage/files/${encodeURIComponent(fileId)}/shares/`,
        payload,
        WEB_OPTIONS,
    );
}