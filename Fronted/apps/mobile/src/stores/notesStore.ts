import type {
    NoteFolder,
    NoteShare,
    NoteTag,
    NoteTemplate,
    } from '@beeapp/shared-types';

import type {
    NoteListItem,
    } from '../services/notesService';
import { createModuleSnapshot } from '../services/moduleSnapshot';


let notes: NoteListItem[] = [];
let folders: NoteFolder[] = [];
let tags: NoteTag[] = [];
let templates: NoteTemplate[] = [];
let receivedShares: NoteShare[] = [];


export function getNotes(): NoteListItem[] {
    return notes;
}


function persistNotes(): void {
    notesSnapshot.schedule({
        notes,
        folders,
        tags,
        templates,
        receivedShares,
    });
}

export function setNotes(
    nextNotes: NoteListItem[],
    ): void {
    notes = nextNotes;
    persistNotes();
}


export function getNoteById(
    noteId: string,
    ): NoteListItem | undefined {
    return notes.find(
        (note) => note.id === noteId,
    );
}


export function upsertNote(
    nextNote: NoteListItem,
    ): void {
    const currentIndex = notes.findIndex(
        (note) => note.id === nextNote.id,
    );

    if (currentIndex === -1) {
        notes = [nextNote, ...notes];
        persistNotes();
        return;
    }

    const previousNote = notes[currentIndex];

    notes = notes.map((note) =>
        note.id === nextNote.id
        ? {
            ...nextNote,
            sharedWithNames:
                nextNote.sharedWithNames
                ?? previousNote.sharedWithNames,
        }
        : note,
    );
    persistNotes();
}


export function removeNote(
    noteId: string,
    ): void {
    notes = notes.filter(
        (note) => note.id !== noteId,
    );
    persistNotes();
}


export function getFolders(): NoteFolder[] {
    return folders;
}


export function setFolders(
    nextFolders: NoteFolder[],
    ): void {
    folders = nextFolders;
    persistNotes();
}


export function upsertFolder(
    nextFolder: NoteFolder,
    ): void {
    const currentIndex = folders.findIndex(
        (folder) => folder.id === nextFolder.id,
    );

    if (currentIndex === -1) {
        folders = [...folders, nextFolder];
        persistNotes();
        return;
    }

    folders = folders.map((folder) =>
        folder.id === nextFolder.id
        ? nextFolder
        : folder,
    );
    persistNotes();
}


export function removeFolder(
    folderId: string,
    ): void {
    folders = folders.filter(
        (folder) => folder.id !== folderId,
    );
    persistNotes();
}


export function getTags(): NoteTag[] {
    return tags;
}


export function setTags(
    nextTags: NoteTag[],
    ): void {
    tags = nextTags;
    persistNotes();
}


export function upsertTag(
    nextTag: NoteTag,
    ): void {
    const currentIndex = tags.findIndex(
        (tag) => tag.id === nextTag.id,
    );

    if (currentIndex === -1) {
        tags = [...tags, nextTag];
        persistNotes();
        return;
    }

    tags = tags.map((tag) =>
        tag.id === nextTag.id
        ? nextTag
        : tag,
    );
    persistNotes();
}


export function removeTag(
    tagId: string,
    ): void {
    tags = tags.filter(
        (tag) => tag.id !== tagId,
    );

    notes = notes.map((note) => ({
        ...note,
        tagIds: note.tagIds.filter(
        (assignedTagId) =>
            assignedTagId !== tagId,
        ),
    }));
    persistNotes();
}


export function getTemplates(): NoteTemplate[] {
    return templates;
}


export function setTemplates(
    nextTemplates: NoteTemplate[],
    ): void {
    templates = nextTemplates;
    persistNotes();
}


export function getReceivedShares(): NoteShare[] {
    return receivedShares;
}


export function setReceivedShares(
    nextShares: NoteShare[],
    ): void {
    receivedShares = nextShares;
    persistNotes();
}

const notesSnapshot = createModuleSnapshot<{
    notes: NoteListItem[];
    folders: NoteFolder[];
    tags: NoteTag[];
    templates: NoteTemplate[];
    receivedShares: NoteShare[];
}>('notes');

export async function hydrateNotesStore(): Promise<boolean> {
    const stored = await notesSnapshot.read();

    if (!stored) {
        return false;
    }

    notes = Array.isArray(stored.notes) ? stored.notes : [];
    folders = Array.isArray(stored.folders) ? stored.folders : [];
    tags = Array.isArray(stored.tags) ? stored.tags : [];
    templates = Array.isArray(stored.templates) ? stored.templates : [];
    receivedShares = Array.isArray(stored.receivedShares)
        ? stored.receivedShares
        : [];

    return (
        notes.length > 0
        || folders.length > 0
        || tags.length > 0
    );
}

export async function clearNotesStore(): Promise<void> {
    notes = [];
    folders = [];
    tags = [];
    templates = [];
    receivedShares = [];
    await notesSnapshot.clear();
}