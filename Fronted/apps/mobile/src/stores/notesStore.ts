import type {
    NoteFolder,
    NoteShare,
    NoteTag,
    NoteTemplate,
    } from '@beeapp/shared-types';

import type {
    NoteListItem,
    } from '../services/notesService';


let notes: NoteListItem[] = [];
let folders: NoteFolder[] = [];
let tags: NoteTag[] = [];
let templates: NoteTemplate[] = [];
let receivedShares: NoteShare[] = [];


export function getNotes(): NoteListItem[] {
    return notes;
}


export function setNotes(
    nextNotes: NoteListItem[],
    ): void {
    notes = nextNotes;
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
        return;
    }

    notes = notes.map((note) =>
        note.id === nextNote.id
        ? nextNote
        : note,
    );
}


export function removeNote(
    noteId: string,
    ): void {
    notes = notes.filter(
        (note) => note.id !== noteId,
    );
}


export function getFolders(): NoteFolder[] {
    return folders;
}


export function setFolders(
    nextFolders: NoteFolder[],
    ): void {
    folders = nextFolders;
}


export function upsertFolder(
    nextFolder: NoteFolder,
    ): void {
    const currentIndex = folders.findIndex(
        (folder) => folder.id === nextFolder.id,
    );

    if (currentIndex === -1) {
        folders = [...folders, nextFolder];
        return;
    }

    folders = folders.map((folder) =>
        folder.id === nextFolder.id
        ? nextFolder
        : folder,
    );
}


export function removeFolder(
    folderId: string,
    ): void {
    folders = folders.filter(
        (folder) => folder.id !== folderId,
    );
}


export function getTags(): NoteTag[] {
    return tags;
}


export function setTags(
    nextTags: NoteTag[],
    ): void {
    tags = nextTags;
}


export function upsertTag(
    nextTag: NoteTag,
    ): void {
    const currentIndex = tags.findIndex(
        (tag) => tag.id === nextTag.id,
    );

    if (currentIndex === -1) {
        tags = [...tags, nextTag];
        return;
    }

    tags = tags.map((tag) =>
        tag.id === nextTag.id
        ? nextTag
        : tag,
    );
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
}


export function getTemplates(): NoteTemplate[] {
    return templates;
}


export function setTemplates(
    nextTemplates: NoteTemplate[],
    ): void {
    templates = nextTemplates;
}


export function getReceivedShares(): NoteShare[] {
    return receivedShares;
}


export function setReceivedShares(
    nextShares: NoteShare[],
    ): void {
    receivedShares = nextShares;
}