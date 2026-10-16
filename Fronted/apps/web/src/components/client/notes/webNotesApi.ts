import {
    attachCurrentWebExistingFileToNote,
    createCurrentWebNote,
    createCurrentWebNoteFolder,
    createCurrentWebNoteTag,
    deleteCurrentWebNoteAttachment,
    deleteCurrentWebNoteFolder,
    deleteCurrentWebNoteTag,
    getCurrentWebNote,
    getCurrentWebNoteAttachmentAccess,
    getCurrentWebNoteAttachments,
    getCurrentWebNoteFolders,
    getCurrentWebNoteTags,
    getCurrentWebNoteTemplates,
    getCurrentWebNotes,
    getCurrentWebReceivedNoteShares,
    getCurrentWebTagsForNote,
    hideCurrentWebReceivedNoteShare,
    moveCurrentWebNoteFolder,
    moveCurrentWebNoteToTrash,
    permanentlyDeleteCurrentWebNote,
    renameCurrentWebNoteFolder,
    replaceCurrentWebNoteTags,
    restoreCurrentWebNote,
    updateCurrentWebNote,
    updateCurrentWebNoteAttachment,
    updateCurrentWebNoteTag,
    uploadCurrentWebNoteAttachments,
    } from '@beeapp/api-client';
import type {
    CreateNoteAttachmentPayload,
    CreateNoteAttachmentResponse,
    CreateNoteFolderPayload,
    CreateNoteFolderResponse,
    CreateNotePayload,
    CreateNoteResponse,
    CreateNoteTagPayload,
    CreateNoteTagResponse,
    NoteAttachmentAccessResponse,
    GetNoteAttachmentsResponse,
    GetNoteFoldersResponse,
    GetNoteResponse,
    GetNoteTagsResponse,
    GetNoteTemplatesResponse,
    GetNotesResponse,
    GetReceivedNoteSharesResponse,
    MoveNoteFolderPayload,
    NotesQuery,
    RenameNoteFolderPayload,
    ReplaceNoteTagsPayload,
    UpdateNoteAttachmentPayload,
    UpdateNoteAttachmentResponse,
    UpdateNoteFolderResponse,
    UpdateNotePayload,
    UpdateNoteResponse,
    UpdateNoteTagPayload,
    UpdateNoteTagResponse,
    UpdateNoteShareResponse,
    UploadNoteAttachmentsResponse,
    } from '@beeapp/shared-types';

/*
 * Adaptador de la API de Notas para Web.
 *
 * La autenticación usa la cookie HttpOnly de sesión web. No se reciben
 * ni se almacenan tokens en el navegador.
 */
export const webNotesApi = {
    /* Notas */

    getNotes(query: NotesQuery): Promise<GetNotesResponse> {
        return getCurrentWebNotes(query);
    },

    getNote(noteId: string): Promise<GetNoteResponse> {
        return getCurrentWebNote(noteId);
    },

    createNote(payload: CreateNotePayload): Promise<CreateNoteResponse> {
        return createCurrentWebNote(payload);
    },

    updateNote(
        noteId: string,
        payload: UpdateNotePayload,
    ): Promise<UpdateNoteResponse> {
        return updateCurrentWebNote(noteId, payload);
    },

    moveToTrash(noteId: string): Promise<void> {
        return moveCurrentWebNoteToTrash(noteId);
    },

    restoreNote(noteId: string): Promise<UpdateNoteResponse> {
        return restoreCurrentWebNote(noteId);
    },

    permanentlyDeleteNote(noteId: string): Promise<void> {
        return permanentlyDeleteCurrentWebNote(noteId);
    },

    /* Carpetas */

    getFolders(): Promise<GetNoteFoldersResponse> {
        return getCurrentWebNoteFolders();
    },

    createFolder(
        payload: CreateNoteFolderPayload,
    ): Promise<CreateNoteFolderResponse> {
        return createCurrentWebNoteFolder(payload);
    },

    renameFolder(
        folderId: string,
        payload: RenameNoteFolderPayload,
    ): Promise<UpdateNoteFolderResponse> {
        return renameCurrentWebNoteFolder(folderId, payload);
    },

    moveFolder(
        folderId: string,
        payload: MoveNoteFolderPayload,
    ): Promise<UpdateNoteFolderResponse> {
        return moveCurrentWebNoteFolder(folderId, payload);
    },

    deleteFolder(folderId: string): Promise<void> {
        return deleteCurrentWebNoteFolder(folderId);
    },

    /* Etiquetas */

    getTags(): Promise<GetNoteTagsResponse> {
        return getCurrentWebNoteTags();
    },

    createTag(
        payload: CreateNoteTagPayload,
    ): Promise<CreateNoteTagResponse> {
        return createCurrentWebNoteTag(payload);
    },

    updateTag(
        tagId: string,
        payload: UpdateNoteTagPayload,
    ): Promise<UpdateNoteTagResponse> {
        return updateCurrentWebNoteTag(tagId, payload);
    },

    deleteTag(tagId: string): Promise<void> {
        return deleteCurrentWebNoteTag(tagId);
    },

    getTagsForNote(noteId: string): Promise<GetNoteTagsResponse> {
        return getCurrentWebTagsForNote(noteId);
    },

    replaceTags(
        noteId: string,
        payload: ReplaceNoteTagsPayload,
    ): Promise<GetNoteTagsResponse> {
        return replaceCurrentWebNoteTags(noteId, payload);
    },

    /* Plantillas */

    getTemplates(): Promise<GetNoteTemplatesResponse> {
        return getCurrentWebNoteTemplates(false);
    },

    /* Adjuntos */

    getAttachments(noteId: string): Promise<GetNoteAttachmentsResponse> {
        return getCurrentWebNoteAttachments(noteId);
    },

    attachExistingFile(
        noteId: string,
        payload: CreateNoteAttachmentPayload,
    ): Promise<CreateNoteAttachmentResponse> {
        return attachCurrentWebExistingFileToNote(noteId, payload);
    },

    uploadAttachments(
        noteId: string,
        formData: FormData,
    ): Promise<UploadNoteAttachmentsResponse> {
        return uploadCurrentWebNoteAttachments(noteId, formData);
    },

    updateAttachment(
        noteId: string,
        attachmentId: string,
        payload: UpdateNoteAttachmentPayload,
    ): Promise<UpdateNoteAttachmentResponse> {
        return updateCurrentWebNoteAttachment(noteId, attachmentId, payload);
    },

    deleteAttachment(
        noteId: string,
        attachmentId: string,
    ): Promise<void> {
        return deleteCurrentWebNoteAttachment(noteId, attachmentId);
    },

    getAttachmentAccess(
        noteId: string,
        attachmentId: string,
        download = false,
    ): Promise<NoteAttachmentAccessResponse> {
        return getCurrentWebNoteAttachmentAccess(
        noteId,
        attachmentId,
        download,
        );
    },

    /* Notas recibidas por compartición */

    getReceivedShares(): Promise<GetReceivedNoteSharesResponse> {
        return getCurrentWebReceivedNoteShares({
        include_hidden: false,
        limit: 100,
        offset: 0,
        });
    },

    hideReceivedShare(
        shareId: string,
    ): Promise<UpdateNoteShareResponse> {
        return hideCurrentWebReceivedNoteShare(shareId);
    },
};