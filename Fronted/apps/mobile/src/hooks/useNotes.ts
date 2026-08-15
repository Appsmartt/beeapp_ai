import {
    useCallback,
    useEffect,
    useState,
    } from 'react';
import {
    getNoteFolders,
    getNoteTags,
    getNoteTemplates,
    getNotes,
    getReceivedNoteShares,
    getTagsForNote,
    } from '@beeapp/api-client';
import type {
    NoteFolder,
    NoteShare,
    NoteTag,
    NoteTemplate,
    } from '@beeapp/shared-types';

import {
    getFolders,
    getNotes as getStoredNotes,
    getReceivedShares,
    getTags,
    getTemplates,
    setFolders,
    setNotes,
    setReceivedShares,
    setTags,
    setTemplates,
    } from '../stores/notesStore';
import {
    mapNoteToListItem,
    type NoteListItem,
    } from '../services/notesService';
import {
    getValidSessionCredentials,
    } from '../services/authSession';


export interface UseNotesResult {
    notes: NoteListItem[];
    folders: NoteFolder[];
    tags: NoteTag[];
    templates: NoteTemplate[];
    receivedShares: NoteShare[];
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    loadNotes: (showRefresh?: boolean) => Promise<void>;
}


export function useNotes(): UseNotesResult {
    const [notes, setLocalNotes] = useState<NoteListItem[]>(
        getStoredNotes(),
    );

    const [folders, setLocalFolders] = useState<NoteFolder[]>(
        getFolders(),
    );

    const [tags, setLocalTags] = useState<NoteTag[]>(
        getTags(),
    );

    const [templates, setLocalTemplates] = useState<
        NoteTemplate[]
    >(
        getTemplates(),
    );

    const [receivedShares, setLocalReceivedShares] = useState<
        NoteShare[]
    >(
        getReceivedShares(),
    );

    const [loading, setLoading] = useState(
        getStoredNotes().length === 0,
    );

    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState<string | null>(
        null,
    );


    const loadNotes = useCallback(
        async (showRefresh = false) => {
        if (showRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError(null);

        try {
            const auth = await getValidSessionCredentials();

            if (!auth) {
            throw new Error(
                'Tu sesión expiró. Inicia sesión nuevamente.',
            );
            }

            const [
            activeNotesResponse,
            trashedNotesResponse,
            foldersResponse,
            tagsResponse,
            templatesResponse,
            sharedNotesResponse,
            ] = await Promise.all([
            getNotes(auth, {
                deleted: false,
                limit: 100,
                offset: 0,
            }),
            getNotes(auth, {
                deleted: true,
                limit: 100,
                offset: 0,
            }),
            getNoteFolders(auth, {}),
            getNoteTags(auth),
            getNoteTemplates(auth),
            getReceivedNoteShares(auth, {
                include_hidden: false,
                limit: 100,
                offset: 0,
            }),
            ]);

            const ownedNotes = [
            ...activeNotesResponse.notes,
            ...trashedNotesResponse.notes,
            ];

            const tagResponses = await Promise.all(
            ownedNotes.map(async (note) => {
                try {
                const response = await getTagsForNote(
                    auth,
                    note.id,
                );

                return {
                    noteId: note.id,
                    tagIds: response.tags.map(
                    (tag) => tag.id,
                    ),
                };
                } catch {
                return {
                    noteId: note.id,
                    tagIds: [] as string[],
                };
                }
            }),
            );

            const tagIdsByNoteId = new Map(
            tagResponses.map((entry) => [
                entry.noteId,
                entry.tagIds,
            ]),
            );

            const ownedListItems = ownedNotes.map((note) =>
            mapNoteToListItem(note, {
                tagIds: tagIdsByNoteId.get(note.id) || [],
            }),
            );

            const sharedListItems = sharedNotesResponse.shares
            .filter((share) => Boolean(share.note))
            .map((share) => {
                const note = share.note!;

                return mapNoteToListItem(note, {
                share,
                });
            });

            const nextNotes = [
            ...ownedListItems,
            ...sharedListItems,
            ];

            setNotes(nextNotes);
            setFolders(foldersResponse.folders);
            setTags(tagsResponse.tags);
            setTemplates(templatesResponse.templates);
            setReceivedShares(sharedNotesResponse.shares);

            setLocalNotes(nextNotes);
            setLocalFolders(foldersResponse.folders);
            setLocalTags(tagsResponse.tags);
            setLocalTemplates(templatesResponse.templates);
            setLocalReceivedShares(
            sharedNotesResponse.shares,
            );
        } catch (loadError) {
            const message = loadError instanceof Error
            ? loadError.message
            : 'No fue posible cargar tus notas.';

            setError(message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
        },
        [],
    );


    useEffect(() => {
        void loadNotes();
    }, [loadNotes]);


    return {
        notes,
        folders,
        tags,
        templates,
        receivedShares,
        loading,
        refreshing,
        error,
        loadNotes,
    };
}