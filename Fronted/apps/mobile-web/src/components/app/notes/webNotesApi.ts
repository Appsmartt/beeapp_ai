import {
    createCurrentWebNote,
    createCurrentWebNoteFolder,
    createCurrentWebNoteTag,
    deleteCurrentWebNoteFolder,
    deleteCurrentWebNoteTag,
    getCurrentWebNote,
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
    updateCurrentWebNoteTag,
    } from '@beeapp/api-client';

import type {
    CreateNoteFolderPayload,
    CreateNoteFolderResponse,
    CreateNotePayload,
    CreateNoteResponse,
    CreateNoteTagPayload,
    CreateNoteTagResponse,
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
    UpdateNoteFolderResponse,
    UpdateNotePayload,
    UpdateNoteResponse,
    UpdateNoteTagPayload,
    UpdateNoteTagResponse,
    UpdateNoteShareResponse,
    } from '@beeapp/shared-types';

/**
 * Adaptador de la API de notas para la versión web.
 *
 * La autenticación se maneja mediante la cookie HttpOnly de sesión web,
 * por lo que este archivo no recibe ni almacena tokens de autenticación.
 *
 * No realiza transformaciones de respuesta: devuelve directamente los
 * contratos definidos en `@beeapp/shared-types`.
 */
export const webNotesApi = {
    /* -----------------------------------------------------------------------
    * Notas
    * --------------------------------------------------------------------- */

    getNotes(query: NotesQuery = {}): Promise<GetNotesResponse> {
        return getCurrentWebNotes(query);
    },

    getNote(noteId: string): Promise<GetNoteResponse> {
        return getCurrentWebNote(noteId);
    },

    createNote(
        payload: CreateNotePayload = {},
    ): Promise<CreateNoteResponse> {
        return createCurrentWebNote(payload);
    },

    updateNote(
        noteId: string,
        payload: UpdateNotePayload,
    ): Promise<UpdateNoteResponse> {
        return updateCurrentWebNote(noteId, payload);
    },

    /**
     * Envía la nota a papelera. No la elimina definitivamente.
     */
    moveToTrash(noteId: string): Promise<void> {
        return moveCurrentWebNoteToTrash(noteId);
    },

    /**
     * Recupera una nota que estaba en la papelera.
     */
    restoreNote(noteId: string): Promise<UpdateNoteResponse> {
        return restoreCurrentWebNote(noteId);
    },

    /**
     * Elimina la nota de manera irreversible.
     * Úsalo únicamente desde la vista Papelera y tras confirmación del usuario.
     */
    permanentlyDeleteNote(noteId: string): Promise<void> {
        return permanentlyDeleteCurrentWebNote(noteId);
    },

    /* -----------------------------------------------------------------------
    * Carpetas
    * --------------------------------------------------------------------- */

    getFolders(): Promise<GetNoteFoldersResponse> {
        return getCurrentWebNoteFolders({});
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

    /**
     * Mueve una carpeta dentro de otra carpeta, o a la raíz si `parent_id`
     * vale `null`.
     */
    moveFolder(
        folderId: string,
        payload: MoveNoteFolderPayload,
    ): Promise<UpdateNoteFolderResponse> {
        return moveCurrentWebNoteFolder(folderId, payload);
    },

    /**
     * Elimina una carpeta. Las notas no se eliminan: el backend debe dejarlas
     * sin carpeta o aplicar la regla definida por su endpoint.
     */
    deleteFolder(folderId: string): Promise<void> {
        return deleteCurrentWebNoteFolder(folderId);
    },

    /* -----------------------------------------------------------------------
    * Etiquetas
    * --------------------------------------------------------------------- */

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

    /**
     * Obtiene todas las etiquetas actualmente asociadas a una nota.
     */
    getTagsForNote(noteId: string): Promise<GetNoteTagsResponse> {
        return getCurrentWebTagsForNote(noteId);
    },

    /**
     * Reemplaza completamente las etiquetas de una nota con `tag_ids`.
     * Para quitar todas, envía `{ tag_ids: [] }`.
     */
    replaceTags(
        noteId: string,
        payload: ReplaceNoteTagsPayload,
    ): Promise<GetNoteTagsResponse> {
        return replaceCurrentWebNoteTags(noteId, payload);
    },

    /* -----------------------------------------------------------------------
    * Plantillas
    * --------------------------------------------------------------------- */

    /**
     * Devuelve solo plantillas activas. Deben aparecer exclusivamente en el
     * modal “Nueva nota”, no como una categoría predeterminada de Mis Notas.
     */
    getTemplates(): Promise<GetNoteTemplatesResponse> {
        return getCurrentWebNoteTemplates(false);
    },

    /* -----------------------------------------------------------------------
    * Notas recibidas por compartición
    * --------------------------------------------------------------------- */

    getReceivedShares(): Promise<GetReceivedNoteSharesResponse> {
        return getCurrentWebReceivedNoteShares({
        include_hidden: false,
        limit: 100,
        offset: 0,
        });
    },

    hideReceivedShare(shareId: string): Promise<UpdateNoteShareResponse> {
        return hideCurrentWebReceivedNoteShare(shareId);
    },
};