import type {
    AuthCredentials,
    CreateNoteAttachmentPayload,
    CreateNoteAttachmentResponse,
    CreateNoteFolderPayload,
    CreateNoteFolderResponse,
    CreateNotePayload,
    CreateNoteResponse,
    CreateNoteSharePayload,
    CreateNoteShareResponse,
    CreateNoteTagPayload,
    CreateNoteTagResponse,
    GetNoteAttachmentsResponse,
    GetNoteFoldersResponse,
    GetNoteResponse,
    GetNoteShareRecipientsResponse,
    GetNoteTagsResponse,
    GetNoteTemplatesResponse,
    GetNotesResponse,
    GetReceivedNoteSharesResponse,
    GetSharedNoteResponse,
    MoveNoteFolderPayload,
    NoteFoldersQuery,
    NotesQuery,
    ReceivedNoteSharesQuery,
    RenameNoteFolderPayload,
    ReplaceNoteTagsPayload,
    UpdateNoteAttachmentPayload,
    UpdateNoteAttachmentResponse,
    UpdateNoteFolderResponse,
    UpdateNotePayload,
    UpdateNoteResponse,
    UpdateNoteShareResponse,
    UpdateNoteTagPayload,
    UpdateNoteTagResponse,
    UploadNoteAttachmentsResponse,
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

function notePath(
    noteId: string,
    ): string {
    return `/notes/${encodeURIComponent(noteId)}/`;
}

function folderPath(
    folderId: string,
    ): string {
    return `/notes/folders/${encodeURIComponent(folderId)}/`;
}

function tagPath(
    tagId: string,
    ): string {
    return `/notes/tags/${encodeURIComponent(tagId)}/`;
}

/* =========================================================
   Mobile API: token/session is passed explicitly.
   ========================================================= */

/* Notes */

export function getNotes(
    auth: AuthCredentials,
    query: NotesQuery = {},
    ): Promise<GetNotesResponse> {
    return api.get<GetNotesResponse>(
        `/notes/${buildQuery(query)}`,
        { auth },
    );
}

export function getNote(
    auth: AuthCredentials,
    noteId: string,
    ): Promise<GetNoteResponse> {
    return api.get<GetNoteResponse>(
        notePath(noteId),
        { auth },
    );
}

export function createNote(
    auth: AuthCredentials,
    payload: CreateNotePayload = {},
    ): Promise<CreateNoteResponse> {
    return api.post<CreateNoteResponse>(
        '/notes/',
        payload,
        { auth },
    );
}

export function updateNote(
    auth: AuthCredentials,
    noteId: string,
    payload: UpdateNotePayload,
    ): Promise<UpdateNoteResponse> {
    return api.patch<UpdateNoteResponse>(
        notePath(noteId),
        payload,
        { auth },
    );
}

export async function moveNoteToTrash(
    auth: AuthCredentials,
    noteId: string,
    ): Promise<void> {
    await api.post<void>(
        `${notePath(noteId)}trash/`,
        undefined,
        { auth },
    );
}

export function restoreNote(
    auth: AuthCredentials,
    noteId: string,
    ): Promise<UpdateNoteResponse> {
    return api.post<UpdateNoteResponse>(
        `${notePath(noteId)}restore/`,
        undefined,
        { auth },
    );
}

export async function permanentlyDeleteNote(
    auth: AuthCredentials,
    noteId: string,
    ): Promise<void> {
    await api.delete<void>(
        notePath(noteId),
        { auth },
    );
}

/* Folders */

export function getNoteFolders(
    auth: AuthCredentials,
    query: NoteFoldersQuery = {},
    ): Promise<GetNoteFoldersResponse> {
    return api.get<GetNoteFoldersResponse>(
        `/notes/folders/${buildQuery(query)}`,
        { auth },
    );
}

export function createNoteFolder(
    auth: AuthCredentials,
    payload: CreateNoteFolderPayload,
    ): Promise<CreateNoteFolderResponse> {
    return api.post<CreateNoteFolderResponse>(
        '/notes/folders/',
        payload,
        { auth },
    );
}

export function renameNoteFolder(
    auth: AuthCredentials,
    folderId: string,
    payload: RenameNoteFolderPayload,
    ): Promise<UpdateNoteFolderResponse> {
    return api.patch<UpdateNoteFolderResponse>(
        folderPath(folderId),
        payload,
        { auth },
    );
}

export function moveNoteFolder(
    auth: AuthCredentials,
    folderId: string,
    payload: MoveNoteFolderPayload,
    ): Promise<UpdateNoteFolderResponse> {
    return api.patch<UpdateNoteFolderResponse>(
        folderPath(folderId),
        payload,
        { auth },
    );
}

export async function deleteNoteFolder(
    auth: AuthCredentials,
    folderId: string,
    ): Promise<void> {
    await api.delete<void>(
        folderPath(folderId),
        { auth },
    );
}

/* Tags */

export function getNoteTags(
    auth: AuthCredentials,
    ): Promise<GetNoteTagsResponse> {
    return api.get<GetNoteTagsResponse>(
        '/notes/tags/',
        { auth },
    );
}

export function createNoteTag(
    auth: AuthCredentials,
    payload: CreateNoteTagPayload,
    ): Promise<CreateNoteTagResponse> {
    return api.post<CreateNoteTagResponse>(
        '/notes/tags/',
        payload,
        { auth },
    );
}

export function updateNoteTag(
    auth: AuthCredentials,
    tagId: string,
    payload: UpdateNoteTagPayload,
    ): Promise<UpdateNoteTagResponse> {
    return api.patch<UpdateNoteTagResponse>(
        tagPath(tagId),
        payload,
        { auth },
    );
}

export async function deleteNoteTag(
    auth: AuthCredentials,
    tagId: string,
    ): Promise<void> {
    await api.delete<void>(
        tagPath(tagId),
        { auth },
    );
}

export function getTagsForNote(
    auth: AuthCredentials,
    noteId: string,
    ): Promise<GetNoteTagsResponse> {
    return api.get<GetNoteTagsResponse>(
        `${notePath(noteId)}tags/`,
        { auth },
    );
}

export function replaceNoteTags(
    auth: AuthCredentials,
    noteId: string,
    payload: ReplaceNoteTagsPayload,
    ): Promise<GetNoteTagsResponse> {
    return api.put<GetNoteTagsResponse>(
        `${notePath(noteId)}tags/`,
        payload,
        { auth },
    );
}

/* Templates */

export function getNoteTemplates(
    auth: AuthCredentials,
    includeInactive = false,
    ): Promise<GetNoteTemplatesResponse> {
    return api.get<GetNoteTemplatesResponse>(
        `/notes/templates/${buildQuery({
        include_inactive: includeInactive,
        })}`,
        { auth },
    );
}

/* Attachments */

export function getNoteAttachments(
    auth: AuthCredentials,
    noteId: string,
    ): Promise<GetNoteAttachmentsResponse> {
    return api.get<GetNoteAttachmentsResponse>(
        `${notePath(noteId)}attachments/`,
        { auth },
    );
}

export function attachExistingFileToNote(
    auth: AuthCredentials,
    noteId: string,
    payload: CreateNoteAttachmentPayload,
    ): Promise<CreateNoteAttachmentResponse> {
    return api.post<CreateNoteAttachmentResponse>(
        `${notePath(noteId)}attachments/`,
        payload,
        { auth },
    );
}

export function uploadNoteAttachments(
    auth: AuthCredentials,
    noteId: string,
    formData: FormData,
    ): Promise<UploadNoteAttachmentsResponse> {
    return api.upload<UploadNoteAttachmentsResponse>(
        `${notePath(noteId)}attachments/upload/`,
        formData,
        { auth },
    );
}

export function updateNoteAttachment(
    auth: AuthCredentials,
    noteId: string,
    attachmentId: string,
    payload: UpdateNoteAttachmentPayload,
    ): Promise<UpdateNoteAttachmentResponse> {
    return api.patch<UpdateNoteAttachmentResponse>(
        `${notePath(noteId)}attachments/${encodeURIComponent(
        attachmentId,
        )}/`,
        payload,
        { auth },
    );
}

export async function deleteNoteAttachment(
    auth: AuthCredentials,
    noteId: string,
    attachmentId: string,
    ): Promise<void> {
    await api.delete<void>(
        `${notePath(noteId)}attachments/${encodeURIComponent(
        attachmentId,
        )}/`,
        { auth },
    );
}

export function getNoteAttachmentAccess(
    auth: AuthCredentials,
    noteId: string,
    attachmentId: string,
    download = false,
    ): Promise<{
    attachment: import('@beeapp/shared-types').NoteAttachment;
    url: string;
    expires_in_seconds: number;
    download: boolean;
    }> {
    return api.get(
        `${notePath(noteId)}attachments/${encodeURIComponent(
        attachmentId,
        )}/access/?download=${download}`,
        { auth },
    );
}

/* Sharing */

export function searchNoteShareRecipients(
    auth: AuthCredentials,
    searchValue: string,
    limit = 10,
    ): Promise<GetNoteShareRecipientsResponse> {
    return api.get<GetNoteShareRecipientsResponse>(
        `/notes/share-recipients/${buildQuery({
        q: searchValue,
        limit,
        })}`,
        { auth },
    );
}

export function createNoteShare(
    auth: AuthCredentials,
    noteId: string,
    payload: CreateNoteSharePayload,
    ): Promise<CreateNoteShareResponse> {
    return api.post<CreateNoteShareResponse>(
        `${notePath(noteId)}shares/`,
        payload,
        { auth },
    );
}

export function getReceivedNoteShares(
    auth: AuthCredentials,
    query: ReceivedNoteSharesQuery = {},
    ): Promise<GetReceivedNoteSharesResponse> {
    return api.get<GetReceivedNoteSharesResponse>(
        `/notes/shares/received/${buildQuery(query)}`,
        { auth },
    );
}

export function getSharedNote(
    auth: AuthCredentials,
    noteId: string,
    ): Promise<GetSharedNoteResponse> {
    return api.get<GetSharedNoteResponse>(
        `/notes/shared/${encodeURIComponent(noteId)}/`,
        { auth },
    );
}

export function revokeNoteShare(
    auth: AuthCredentials,
    shareId: string,
    ): Promise<UpdateNoteShareResponse> {
    return api.post<UpdateNoteShareResponse>(
        `/notes/shares/${encodeURIComponent(shareId)}/revoke/`,
        undefined,
        { auth },
    );
}

export function hideReceivedNoteShare(
    auth: AuthCredentials,
    shareId: string,
    ): Promise<UpdateNoteShareResponse> {
    return api.post<UpdateNoteShareResponse>(
        `/notes/shares/${encodeURIComponent(shareId)}/hide/`,
        undefined,
        { auth },
    );
}

/* =========================================================
   Web API: authentication uses the HttpOnly web-session cookie.
   ========================================================= */

/* Notes */

export function getCurrentWebNotes(
    query: NotesQuery = {},
    ): Promise<GetNotesResponse> {
    return api.get<GetNotesResponse>(
        `/notes/${buildQuery(query)}`,
        WEB_OPTIONS,
    );
}

export function getCurrentWebNote(
    noteId: string,
    ): Promise<GetNoteResponse> {
    return api.get<GetNoteResponse>(
        notePath(noteId),
        WEB_OPTIONS,
    );
}

export function createCurrentWebNote(
    payload: CreateNotePayload = {},
    ): Promise<CreateNoteResponse> {
    return api.post<CreateNoteResponse>(
        '/notes/',
        payload,
        WEB_OPTIONS,
    );
}

export function updateCurrentWebNote(
    noteId: string,
    payload: UpdateNotePayload,
    ): Promise<UpdateNoteResponse> {
    return api.patch<UpdateNoteResponse>(
        notePath(noteId),
        payload,
        WEB_OPTIONS,
    );
}

export async function moveCurrentWebNoteToTrash(
    noteId: string,
    ): Promise<void> {
    await api.post<void>(
        `${notePath(noteId)}trash/`,
        undefined,
        WEB_OPTIONS,
    );
}

export function restoreCurrentWebNote(
    noteId: string,
    ): Promise<UpdateNoteResponse> {
    return api.post<UpdateNoteResponse>(
        `${notePath(noteId)}restore/`,
        undefined,
        WEB_OPTIONS,
    );
}

export async function permanentlyDeleteCurrentWebNote(
    noteId: string,
    ): Promise<void> {
    await api.delete<void>(
        notePath(noteId),
        WEB_OPTIONS,
    );
}

/* Folders */

export function getCurrentWebNoteFolders(
    query: NoteFoldersQuery = {},
    ): Promise<GetNoteFoldersResponse> {
    return api.get<GetNoteFoldersResponse>(
        `/notes/folders/${buildQuery(query)}`,
        WEB_OPTIONS,
    );
}

export function createCurrentWebNoteFolder(
    payload: CreateNoteFolderPayload,
    ): Promise<CreateNoteFolderResponse> {
    return api.post<CreateNoteFolderResponse>(
        '/notes/folders/',
        payload,
        WEB_OPTIONS,
    );
}

export function renameCurrentWebNoteFolder(
    folderId: string,
    payload: RenameNoteFolderPayload,
    ): Promise<UpdateNoteFolderResponse> {
    return api.patch<UpdateNoteFolderResponse>(
        folderPath(folderId),
        payload,
        WEB_OPTIONS,
    );
}

export function moveCurrentWebNoteFolder(
    folderId: string,
    payload: MoveNoteFolderPayload,
    ): Promise<UpdateNoteFolderResponse> {
    return api.patch<UpdateNoteFolderResponse>(
        folderPath(folderId),
        payload,
        WEB_OPTIONS,
    );
}

export async function deleteCurrentWebNoteFolder(
    folderId: string,
    ): Promise<void> {
    await api.delete<void>(
        folderPath(folderId),
        WEB_OPTIONS,
    );
}

/* Tags */

export function getCurrentWebNoteTags(): Promise<GetNoteTagsResponse> {
    return api.get<GetNoteTagsResponse>(
        '/notes/tags/',
        WEB_OPTIONS,
    );
}

export function createCurrentWebNoteTag(
    payload: CreateNoteTagPayload,
    ): Promise<CreateNoteTagResponse> {
    return api.post<CreateNoteTagResponse>(
        '/notes/tags/',
        payload,
        WEB_OPTIONS,
    );
}

export function updateCurrentWebNoteTag(
    tagId: string,
    payload: UpdateNoteTagPayload,
    ): Promise<UpdateNoteTagResponse> {
    return api.patch<UpdateNoteTagResponse>(
        tagPath(tagId),
        payload,
        WEB_OPTIONS,
    );
}

export async function deleteCurrentWebNoteTag(
    tagId: string,
    ): Promise<void> {
    await api.delete<void>(
        tagPath(tagId),
        WEB_OPTIONS,
    );
}

export function getCurrentWebTagsForNote(
    noteId: string,
    ): Promise<GetNoteTagsResponse> {
    return api.get<GetNoteTagsResponse>(
        `${notePath(noteId)}tags/`,
        WEB_OPTIONS,
    );
}

export function replaceCurrentWebNoteTags(
    noteId: string,
    payload: ReplaceNoteTagsPayload,
    ): Promise<GetNoteTagsResponse> {
    return api.put<GetNoteTagsResponse>(
        `${notePath(noteId)}tags/`,
        payload,
        WEB_OPTIONS,
    );
}

/* Templates */

export function getCurrentWebNoteTemplates(
    includeInactive = false,
    ): Promise<GetNoteTemplatesResponse> {
    return api.get<GetNoteTemplatesResponse>(
        `/notes/templates/${buildQuery({
        include_inactive: includeInactive,
        })}`,
        WEB_OPTIONS,
    );
}

/* Attachments */

export function getCurrentWebNoteAttachments(
    noteId: string,
    ): Promise<GetNoteAttachmentsResponse> {
    return api.get<GetNoteAttachmentsResponse>(
        `${notePath(noteId)}attachments/`,
        WEB_OPTIONS,
    );
}

export function attachCurrentWebExistingFileToNote(
    noteId: string,
    payload: CreateNoteAttachmentPayload,
    ): Promise<CreateNoteAttachmentResponse> {
    return api.post<CreateNoteAttachmentResponse>(
        `${notePath(noteId)}attachments/`,
        payload,
        WEB_OPTIONS,
    );
}

export function uploadCurrentWebNoteAttachments(
    noteId: string,
    formData: FormData,
    ): Promise<UploadNoteAttachmentsResponse> {
    return api.upload<UploadNoteAttachmentsResponse>(
        `${notePath(noteId)}attachments/upload/`,
        formData,
        WEB_OPTIONS,
    );
}

export function updateCurrentWebNoteAttachment(
    noteId: string,
    attachmentId: string,
    payload: UpdateNoteAttachmentPayload,
    ): Promise<UpdateNoteAttachmentResponse> {
    return api.patch<UpdateNoteAttachmentResponse>(
        `${notePath(noteId)}attachments/${encodeURIComponent(
        attachmentId,
        )}/`,
        payload,
        WEB_OPTIONS,
    );
}

export async function deleteCurrentWebNoteAttachment(
    noteId: string,
    attachmentId: string,
    ): Promise<void> {
    await api.delete<void>(
        `${notePath(noteId)}attachments/${encodeURIComponent(
        attachmentId,
        )}/`,
        WEB_OPTIONS,
    );
}

export function getCurrentWebNoteAttachmentAccess(
    noteId: string,
    attachmentId: string,
    download = false,
    ): Promise<{
    attachment: import('@beeapp/shared-types').NoteAttachment;
    url: string;
    expires_in_seconds: number;
    download: boolean;
    }> {
    return api.get(
        `${notePath(noteId)}attachments/${encodeURIComponent(
        attachmentId,
        )}/access/?download=${download}`,
        WEB_OPTIONS,
    );
}

/* Sharing */

export function searchCurrentWebNoteShareRecipients(
    searchValue: string,
    limit = 10,
    ): Promise<GetNoteShareRecipientsResponse> {
    return api.get<GetNoteShareRecipientsResponse>(
        `/notes/share-recipients/${buildQuery({
        q: searchValue,
        limit,
        })}`,
        WEB_OPTIONS,
    );
}

export function createCurrentWebNoteShare(
    noteId: string,
    payload: CreateNoteSharePayload,
    ): Promise<CreateNoteShareResponse> {
    return api.post<CreateNoteShareResponse>(
        `${notePath(noteId)}shares/`,
        payload,
        WEB_OPTIONS,
    );
}

export function getCurrentWebReceivedNoteShares(
    query: ReceivedNoteSharesQuery = {},
    ): Promise<GetReceivedNoteSharesResponse> {
    return api.get<GetReceivedNoteSharesResponse>(
        `/notes/shares/received/${buildQuery(query)}`,
        WEB_OPTIONS,
    );
}

export function getCurrentWebSharedNote(
    noteId: string,
    ): Promise<GetSharedNoteResponse> {
    return api.get<GetSharedNoteResponse>(
        `/notes/shared/${encodeURIComponent(noteId)}/`,
        WEB_OPTIONS,
    );
}

export function revokeCurrentWebNoteShare(
    shareId: string,
    ): Promise<UpdateNoteShareResponse> {
    return api.post<UpdateNoteShareResponse>(
        `/notes/shares/${encodeURIComponent(shareId)}/revoke/`,
        undefined,
        WEB_OPTIONS,
    );
}

export function hideCurrentWebReceivedNoteShare(
    shareId: string,
    ): Promise<UpdateNoteShareResponse> {
    return api.post<UpdateNoteShareResponse>(
        `/notes/shares/${encodeURIComponent(shareId)}/hide/`,
        undefined,
        WEB_OPTIONS,
    );
}