'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  FileText,
  FolderInput,
  MoreVertical,
  Pencil,
  Pin,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';
import type { Note, NoteFolder, NoteTag } from '@beeapp/shared-types';
import {
  getNoteColor,
  getNotePreview,
  getNoteTimestamp,
} from './notesWebTypes';

interface NotesListPanelProps {
  notes: Note[];
  selectedId?: string;
  viewMode: 'list' | 'grid';
  folders: NoteFolder[];
  tagsByNote: Record<string, NoteTag[]>;
  isTrashView: boolean;
  onSelect: (note: Note) => void;
  onRename: (note: Note, title: string) => void;
  onToggleFavorite: (note: Note) => void;
  onTogglePinned: (note: Note) => void;
  onToggleArchived: (note: Note) => void;
  onMoveToFolder: (note: Note, folderId: string | null) => void;
  onMoveToTrash: (note: Note) => void;
  onRestore: (note: Note) => void;
  onPermanentlyDelete: (note: Note) => void;
}

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  viewMode: 'list' | 'grid';
  folders: NoteFolder[];
  tags: NoteTag[];
  isTrashView: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onToggleFavorite: () => void;
  onTogglePinned: () => void;
  onToggleArchived: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onMoveToTrash: () => void;
  onRestore: () => void;
  onPermanentlyDelete: () => void;
}

interface NoteActionsMenuProps {
  note: Note;
  folders: NoteFolder[];
  isTrashView: boolean;
  onRename: (title: string) => void;
  onToggleFavorite: () => void;
  onTogglePinned: () => void;
  onToggleArchived: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onMoveToTrash: () => void;
  onRestore: () => void;
  onPermanentlyDelete: () => void;
}

function NoteActionsMenu({
  note,
  folders,
  isTrashView,
  onRename,
  onToggleFavorite,
  onTogglePinned,
  onToggleArchived,
  onMoveToFolder,
  onMoveToTrash,
  onRestore,
  onPermanentlyDelete,
}: NoteActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [showFolders, setShowFolders] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeIfOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setShowFolders(false);
      }
    };

    document.addEventListener('mousedown', closeIfOutside);

    return () => {
      document.removeEventListener('mousedown', closeIfOutside);
    };
  }, []);

  const close = () => {
    setOpen(false);
    setShowFolders(false);
  };

  const handleRename = () => {
    const title = window.prompt(
      'Nuevo título de la nota:',
      note.title || '',
    );

    const normalizedTitle = title?.trim();

    if (normalizedTitle && normalizedTitle !== note.title) {
      onRename(normalizedTitle);
    }

    close();
  };

  return (
    <div
      ref={menuRef}
      className="relative shrink-0"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Opciones de nota"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setShowFolders(false);
        }}
        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-40 w-52 rounded-xl border border-neutral-200 bg-white py-1.5 shadow-xl text-xs">
          {isTrashView ? (
            <>
              <button
                type="button"
                onClick={() => {
                  close();
                  onRestore();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar nota
              </button>

              <button
                type="button"
                onClick={() => {
                  close();
                  onPermanentlyDelete();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar permanentemente
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRename}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50"
              >
                <Pencil className="w-3.5 h-3.5" />
                Renombrar
              </button>

              <button
                type="button"
                onClick={() => {
                  close();
                  onToggleFavorite();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50"
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    note.is_favorite
                      ? 'fill-amber-400 text-amber-400'
                      : ''
                  }`}
                />
                {note.is_favorite ? 'Quitar favorita' : 'Marcar favorita'}
              </button>

              <button
                type="button"
                onClick={() => {
                  close();
                  onTogglePinned();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50"
              >
                <Pin
                  className={`w-3.5 h-3.5 ${
                    note.is_pinned
                      ? 'fill-brand-primary text-brand-primary'
                      : ''
                  }`}
                />
                {note.is_pinned ? 'Quitar fijada' : 'Fijar nota'}
              </button>

              <button
                type="button"
                onClick={() => {
                  close();
                  onToggleArchived();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50"
              >
                <Archive className="w-3.5 h-3.5" />
                {note.is_archived ? 'Desarchivar' : 'Archivar nota'}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFolders((current) => !current)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <span className="flex-1">Mover a carpeta</span>
                  <span className="text-neutral-400">›</span>
                </button>

                {showFolders && (
                  <div className="absolute right-full top-0 mr-1 w-48 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1.5 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        onMoveToFolder(null);
                      }}
                      className="w-full px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50"
                    >
                      Sin carpeta
                    </button>

                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => {
                          close();
                          onMoveToFolder(folder.id);
                        }}
                        className="w-full px-3 py-2 text-left text-neutral-700 hover:bg-neutral-50 truncate"
                      >
                        {folder.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="my-1 border-t border-neutral-100" />

              <button
                type="button"
                onClick={() => {
                  close();
                  onMoveToTrash();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Mover a papelera
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  isSelected,
  viewMode,
  folders,
  tags,
  isTrashView,
  onSelect,
  onRename,
  onToggleFavorite,
  onTogglePinned,
  onToggleArchived,
  onMoveToFolder,
  onMoveToTrash,
  onRestore,
  onPermanentlyDelete,
}: NoteCardProps) {
  const color = getNoteColor(note);
  const preview = getNotePreview(note);
  const timestamp = getNoteTimestamp(note);

  const actions = (
    <NoteActionsMenu
      note={note}
      folders={folders}
      isTrashView={isTrashView}
      onRename={onRename}
      onToggleFavorite={onToggleFavorite}
      onTogglePinned={onTogglePinned}
      onToggleArchived={onToggleArchived}
      onMoveToFolder={onMoveToFolder}
      onMoveToTrash={onMoveToTrash}
      onRestore={onRestore}
      onPermanentlyDelete={onPermanentlyDelete}
    />
  );

  if (viewMode === 'grid') {
    return (
      <article
        onClick={onSelect}
        className={`group relative min-h-[178px] rounded-2xl border bg-white p-4 cursor-pointer transition-all hover:border-brand-primary/45 hover:shadow-sm ${
          isSelected
            ? 'border-brand-primary ring-2 ring-brand-primary/20'
            : 'border-neutral-200'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className="w-3 h-3 mt-1 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-neutral-900 truncate">
              {note.title || 'Sin título'}
            </h3>
          </div>

          {actions}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-neutral-500 line-clamp-4">
          {preview}
        </p>

        <div className="absolute left-4 right-4 bottom-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {note.is_pinned && (
              <Pin className="w-3.5 h-3.5 text-brand-primary fill-brand-primary" />
            )}

            {note.is_favorite && (
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            )}

            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="max-w-[70px] truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  color: tag.color,
                  backgroundColor: `${tag.color}16`,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>

          <span className="text-[10px] text-neutral-400 shrink-0">
            {timestamp}
          </span>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={onSelect}
      className={`group cursor-pointer px-4 py-3 flex items-start gap-3 border-b border-neutral-100 transition-colors ${
        isSelected
          ? 'bg-brand-primary/[0.07] border-l-4 border-l-brand-primary pl-3'
          : 'bg-white hover:bg-neutral-50'
      }`}
    >
      <span
        className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
        style={{
          backgroundColor: `${color}16`,
          color,
        }}
      >
        <FileText className="w-4 h-4" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="flex-1 min-w-0 truncate text-sm font-semibold text-neutral-900">
            {note.title || 'Sin título'}
          </h3>

          {note.is_pinned && (
            <Pin className="w-3.5 h-3.5 text-brand-primary fill-brand-primary shrink-0" />
          )}

          <span className="text-[11px] text-neutral-400 shrink-0">
            {timestamp}
          </span>
        </div>

        <p className="mt-1 text-xs text-neutral-500 truncate">{preview}</p>

        <div className="flex items-center gap-1.5 mt-2 min-w-0">
          {note.is_favorite && (
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
          )}

          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="max-w-[92px] truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                color: tag.color,
                backgroundColor: `${tag.color}16`,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      <div onClick={(event) => event.stopPropagation()}>{actions}</div>
    </article>
  );
}

export default function NotesListPanel({
  notes,
  selectedId,
  viewMode,
  folders,
  tagsByNote,
  isTrashView,
  onSelect,
  onRename,
  onToggleFavorite,
  onTogglePinned,
  onToggleArchived,
  onMoveToFolder,
  onMoveToTrash,
  onRestore,
  onPermanentlyDelete,
}: NotesListPanelProps) {
  if (notes.length === 0) {
    return (
      <div className="h-full min-h-[280px] flex items-center justify-center p-8 text-center">
        <div className="max-w-[220px]">
          <FileText className="w-10 h-10 mx-auto text-neutral-300" />
          <p className="mt-3 text-sm font-medium text-neutral-700">
            No hay notas aquí
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Crea una nota nueva o cambia la vista para encontrar lo que buscas.
          </p>
        </div>
      </div>
    );
  }

  const items = notes.map((note) => (
    <NoteCard
      key={note.id}
      note={note}
      isSelected={selectedId === note.id}
      viewMode={viewMode}
      folders={folders}
      tags={tagsByNote[note.id] ?? []}
      isTrashView={isTrashView}
      onSelect={() => onSelect(note)}
      onRename={(title) => onRename(note, title)}
      onToggleFavorite={() => onToggleFavorite(note)}
      onTogglePinned={() => onTogglePinned(note)}
      onToggleArchived={() => onToggleArchived(note)}
      onMoveToFolder={(folderId) => onMoveToFolder(note, folderId)}
      onMoveToTrash={() => onMoveToTrash(note)}
      onRestore={() => onRestore(note)}
      onPermanentlyDelete={() => onPermanentlyDelete(note)}
    />
  ));

  return viewMode === 'grid' ? (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 p-3">{items}</div>
  ) : (
    <div>{items}</div>
  );
}