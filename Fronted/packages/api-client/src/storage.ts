import type {
    AuthCredentials,
    CreateStorageFolderPayload,
    CreateStorageFolderResponse,
    CreateStorageUploadResponse,
    GetStorageFileAccessResponse,
    GetStorageFilesResponse,
    GetStorageFoldersResponse,
    GetStorageSummaryResponse,
    StorageFilesQuery,
    StorageFoldersQuery,
    UpdateStorageFolderPayload,
    UpdateStorageFolderResponse,
    } from '@beeapp/shared-types';

import { api } from './client';

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

export async function deleteStorageFolder(
    auth: AuthCredentials,
    folderId: string,
    ): Promise<void> {
    await api.delete<void>(
        `/storage/folders/${encodeURIComponent(folderId)}/`,
        { auth },
    );
}

export async function uploadStorageFile(
    auth: AuthCredentials,
    formData: FormData,
    ): Promise<CreateStorageUploadResponse> {
    return api.upload<CreateStorageUploadResponse>(
        '/storage/uploads/',
        formData,
        { auth },
    );
}

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