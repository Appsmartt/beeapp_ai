'use client';

import { useState } from 'react';
import {
    Archive,
    ChevronDown,
    ChevronRight,
    Folder,
    FolderPlus,
    MoreHorizontal,
    Pencil,
    Pin,
    Plus,
    Star,
    Tag,
    Tags,
    Trash2,
    } from 'lucide-react';
import type { NoteFolder, NoteTag } from '@beeapp/shared-types';
import type { NotesViewId } from './notesWebTypes';

interface NotesSidebarProps {
    activeView: NotesViewId;
    folders: NoteFolder[];
    tags: NoteTag[];
    folderCounts: Record<string, number>;
    tagCounts: Record<string, number>;
    systemCounts: {
        all: number;
        favorites: number;
        pinned: number;
        archived: number;
        trash: number;
        shared: number;
    };
    onSelectView: (view: NotesViewId) => void;
    onCreateNote: () => void;
    onCreateFolder: (name: string) => Promise<void>;
    onRenameFolder: (folder: NoteFolder, name: string) => Promise<void>;
    onDeleteFolder: (folder: NoteFolder) => Promise<void>;
    onCreateTag: (name: string) => Promise<void>;
    onRenameTag: (tag: NoteTag, name: string) => Promise<void>;
    onDeleteTag: (tag: NoteTag) => Promise<void>;
}

interface CreateInlineFormProps {
    placeholder: string;
    submitLabel: string;
    onCancel: () => void;
    onSubmit: (name: string) => Promise<void>;
}

function CreateInlineForm({
    placeholder,
    submitLabel,
    onCancel,
    onSubmit,
    }: CreateInlineFormProps) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
        const normalized = name.trim();

        if (!normalized || saving) {
        return;
        }

        try {
        setSaving(true);
        await onSubmit(normalized);
        setName('');
        onCancel();
        } finally {
        setSaving(false);
        }
    };

    return (
        <div className="px-2 pb-2">
        <input
            autoFocus
            value={name}
            maxLength={80}
            placeholder={placeholder}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
            if (event.key === 'Enter') {
                void handleSubmit();
            }

            if (event.key === 'Escape') {
                onCancel();
            }
            }}
            className="w-full h-8 rounded-lg border border-neutral-200 bg-white px-2 text-xs text-neutral-800 outline-none focus:border-brand-primary"
        />

        <div className="flex items-center justify-end gap-1 mt-1.5">
            <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-2 py-1 rounded-md text-[11px] text-neutral-500 hover:bg-neutral-100"
            >
            Cancelar
            </button>

            <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!name.trim() || saving}
            className="px-2 py-1 rounded-md text-[11px] font-medium text-white bg-brand-primary hover:bg-brand-dark disabled:opacity-50"
            >
            {saving ? '...' : submitLabel}
            </button>
        </div>
        </div>
    );
}

interface SectionItemMenuProps {
    onRename: () => void;
    onDelete: () => void;
}

function SectionItemMenu({ onRename, onDelete }: SectionItemMenuProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative shrink-0">
        <button
            type="button"
            aria-label="Más opciones"
            aria-expanded={open}
            onClick={(event) => {
            event.stopPropagation();
            setOpen((current) => !current);
            }}
            className="p-1 rounded-md text-neutral-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-neutral-100 hover:text-neutral-700 transition-all"
        >
            <MoreHorizontal className="w-3.5 h-3.5" />
        </button>

        {open && (
            <>
            <button
                type="button"
                aria-label="Cerrar opciones"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-20 cursor-default"
            />

            <div className="absolute right-0 top-7 z-30 w-32 rounded-xl border border-neutral-200 bg-white py-1 shadow-xl">
                <button
                type="button"
                onClick={() => {
                    setOpen(false);
                    onRename();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50"
                >
                <Pencil className="w-3.5 h-3.5" />
                Renombrar
                </button>

                <button
                type="button"
                onClick={() => {
                    setOpen(false);
                    onDelete();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
                </button>
            </div>
            </>
        )}
        </div>
    );
}

interface SidebarRowProps {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    count?: number;
    color?: string;
    onClick: () => void;
    trailing?: React.ReactNode;
}

function SidebarRow({
    active,
    icon,
    label,
    count,
    color,
    onClick,
    trailing,
    }: SidebarRowProps) {
    return (
        <div
        className={`group w-full h-9 px-2.5 rounded-xl flex items-center gap-1 text-left transition-colors ${
            active
            ? 'bg-brand-primary/10 text-brand-primary'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
        }`}
        >
        <button
            type="button"
            onClick={onClick}
            className="min-w-0 flex-1 h-full flex items-center gap-2.5 text-left rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
        >
            <span
            className={`w-4 h-4 shrink-0 ${
                active ? 'text-brand-primary' : ''
            }`}
            style={color ? { color } : undefined}
            >
            {icon}
            </span>

            <span className="flex-1 min-w-0 truncate text-xs font-medium">
            {label}
            </span>

            {typeof count === 'number' && (
            <span className="text-[11px] text-neutral-400 tabular-nums">
                {count}
            </span>
            )}
        </button>

        {trailing}
        </div>
    );
}

export default function NotesSidebar({
    activeView,
    folders,
    tags,
    folderCounts,
    tagCounts,
    systemCounts,
    onSelectView,
    onCreateNote,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    onCreateTag,
    onRenameTag,
    onDeleteTag,
    }: NotesSidebarProps) {
    const [foldersOpen, setFoldersOpen] = useState(true);
    const [tagsOpen, setTagsOpen] = useState(true);
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [creatingTag, setCreatingTag] = useState(false);

    const requestRenameFolder = async (folder: NoteFolder) => {
        const nextName = window.prompt(
        'Nuevo nombre de carpeta:',
        folder.name,
        )?.trim();

        if (nextName && nextName !== folder.name) {
        await onRenameFolder(folder, nextName);
        }
    };

    const requestDeleteFolder = async (folder: NoteFolder) => {
        const accepted = window.confirm(
        `¿Eliminar la carpeta “${folder.name}”? Las notas no se eliminarán; quedarán sin carpeta.`,
        );

        if (accepted) {
        await onDeleteFolder(folder);
        }
    };

    const requestRenameTag = async (tag: NoteTag) => {
        const nextName = window.prompt(
        'Nuevo nombre de etiqueta:',
        tag.name,
        )?.trim();

        if (nextName && nextName !== tag.name) {
        await onRenameTag(tag, nextName);
        }
    };

    const requestDeleteTag = async (tag: NoteTag) => {
        const accepted = window.confirm(
        `¿Eliminar la etiqueta “${tag.name}”? Las notas no se eliminarán.`,
        );

        if (accepted) {
        await onDeleteTag(tag);
        }
    };

    return (
        <aside className="w-[252px] shrink-0 border-r border-neutral-200 bg-white flex flex-col">
        <div className="p-3 border-b border-neutral-100">
            <button
            type="button"
            onClick={onCreateNote}
            className="w-full h-10 rounded-xl bg-brand-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-brand-dark transition-colors"
            >
            <Plus className="w-4 h-4" />
            Nueva nota
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
            <p className="px-2.5 mb-2 text-[10px] uppercase tracking-[0.12em] font-semibold text-neutral-400">
            Mis notas
            </p>

            <div className="space-y-1">
            <SidebarRow
                active={activeView === 'all'}
                icon={<Folder className="w-4 h-4" />}
                label="Todas las notas"
                count={systemCounts.all}
                onClick={() => onSelectView('all')}
            />

            <SidebarRow
                active={activeView === 'favorites'}
                icon={<Star className="w-4 h-4" />}
                label="Favoritas"
                count={systemCounts.favorites}
                onClick={() => onSelectView('favorites')}
            />

            <SidebarRow
                active={activeView === 'pinned'}
                icon={<Pin className="w-4 h-4" />}
                label="Fijadas"
                count={systemCounts.pinned}
                onClick={() => onSelectView('pinned')}
            />

            <SidebarRow
                active={activeView === 'archived'}
                icon={<Archive className="w-4 h-4" />}
                label="Archivadas"
                count={systemCounts.archived}
                onClick={() => onSelectView('archived')}
            />

            <SidebarRow
                active={activeView === 'trash'}
                icon={<Trash2 className="w-4 h-4" />}
                label="Papelera"
                count={systemCounts.trash}
                onClick={() => onSelectView('trash')}
            />
            </div>

            <div className="mt-6">
            <div className="h-8 px-2.5 flex items-center gap-1">
                <button
                type="button"
                onClick={() => setFoldersOpen((current) => !current)}
                className="flex-1 min-w-0 flex items-center gap-1 text-left"
                >
                {foldersOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                )}
                <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-neutral-400">
                    Carpetas
                </span>
                </button>

                <button
                type="button"
                onClick={() => {
                    setFoldersOpen(true);
                    setCreatingFolder(true);
                }}
                title="Nueva carpeta"
                className="p-1 rounded-md text-neutral-400 hover:text-brand-primary hover:bg-brand-primary/10"
                >
                <FolderPlus className="w-3.5 h-3.5" />
                </button>
            </div>

            {foldersOpen && (
                <div className="space-y-1">
                {creatingFolder && (
                    <CreateInlineForm
                    placeholder="Nombre de carpeta"
                    submitLabel="Crear"
                    onCancel={() => setCreatingFolder(false)}
                    onSubmit={onCreateFolder}
                    />
                )}

                {folders.map((folder) => (
                    <SidebarRow
                    key={folder.id}
                    active={activeView === `folder:${folder.id}`}
                    icon={<Folder className="w-4 h-4" />}
                    label={folder.name}
                    count={folderCounts[folder.id] ?? 0}
                    onClick={() => onSelectView(`folder:${folder.id}`)}
                    trailing={
                        <SectionItemMenu
                        onRename={() => void requestRenameFolder(folder)}
                        onDelete={() => void requestDeleteFolder(folder)}
                        />
                    }
                    />
                ))}

                {!creatingFolder && folders.length === 0 && (
                    <p className="px-2.5 py-2 text-xs text-neutral-400">
                    Aún no has creado carpetas.
                    </p>
                )}
                </div>
            )}
            </div>

            <div className="mt-5">
            <div className="h-8 px-2.5 flex items-center gap-1">
                <button
                type="button"
                onClick={() => setTagsOpen((current) => !current)}
                className="flex-1 min-w-0 flex items-center gap-1 text-left"
                >
                {tagsOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                )}
                <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-neutral-400">
                    Etiquetas
                </span>
                </button>

                <button
                type="button"
                onClick={() => {
                    setTagsOpen(true);
                    setCreatingTag(true);
                }}
                title="Nueva etiqueta"
                className="p-1 rounded-md text-neutral-400 hover:text-brand-primary hover:bg-brand-primary/10"
                >
                <Tags className="w-3.5 h-3.5" />
                </button>
            </div>

            {tagsOpen && (
                <div className="space-y-1">
                {creatingTag && (
                    <CreateInlineForm
                    placeholder="Nombre de etiqueta"
                    submitLabel="Crear"
                    onCancel={() => setCreatingTag(false)}
                    onSubmit={onCreateTag}
                    />
                )}

                {tags.map((tag) => (
                    <SidebarRow
                    key={tag.id}
                    active={activeView === `tag:${tag.id}`}
                    icon={<Tag className="w-4 h-4" />}
                    color={tag.color}
                    label={tag.name}
                    count={tagCounts[tag.id] ?? 0}
                    onClick={() => onSelectView(`tag:${tag.id}`)}
                    trailing={
                        <SectionItemMenu
                        onRename={() => void requestRenameTag(tag)}
                        onDelete={() => void requestDeleteTag(tag)}
                        />
                    }
                    />
                ))}

                {!creatingTag && tags.length === 0 && (
                    <p className="px-2.5 py-2 text-xs text-neutral-400">
                    Aún no has creado etiquetas.
                    </p>
                )}
                </div>
            )}
            </div>
        </div>
        </aside>
    );
}