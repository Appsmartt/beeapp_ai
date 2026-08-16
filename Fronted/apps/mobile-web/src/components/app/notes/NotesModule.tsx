'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Grid2x2,
  List,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import type {
  Note,
  NoteFolder,
  NoteTag,
  NoteTemplate,
} from '@beeapp/shared-types';
import NotesOptionsBar from './NotesOptionsBar';
import NotesSidebar from './NotesSidebar';
import NotesListPanel from './NotesListPanel';
import NoteEdit from './NoteEdit';
import CreateNoteModal from './CreateNoteModal';
import {
  EMPTY_NOTE_CONTENT,
  cloneTemplateContent,
  type NotesViewId,
} from './notesWebTypes';
import { webNotesApi } from './webNotesApi';

type ViewMode = 'list' | 'grid';

const NOTES_PAGE_SIZE = 50;

function getViewTitle(
  view: NotesViewId,
  folders: NoteFolder[],
  tags: NoteTag[],
): string {
  if (view === 'all') return 'Todas las notas';
  if (view === 'favorites') return 'Favoritas';
  if (view === 'pinned') return 'Fijadas';
  if (view === 'archived') return 'Archivadas';
  if (view === 'trash') return 'Papelera';
  if (view === 'shared') return 'Compartidas';

  if (view.startsWith('folder:')) {
    const folderId = view.slice('folder:'.length);
    return folders.find((folder) => folder.id === folderId)?.name || 'Carpeta';
  }

  if (view.startsWith('tag:')) {
    const tagId = view.slice('tag:'.length);
    return tags.find((tag) => tag.id === tagId)?.name || 'Etiqueta';
  }

  return 'Mis notas';
}

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((left, right) => {
    if (left.is_pinned !== right.is_pinned) {
      return Number(right.is_pinned) - Number(left.is_pinned);
    }

    return (
      new Date(right.updated_at).getTime() -
      new Date(left.updated_at).getTime()
    );
  });
}

export default function NotesModule() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [tags, setTags] = useState<NoteTag[]>([]);
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [tagsByNote, setTagsByNote] = useState<Record<string, NoteTag[]>>({});
  const [activeView, setActiveView] = useState<NotesViewId>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const loadTagsForNotes = async (items: Note[]) => {
    const entries = await Promise.all(
      items.map(async (note) => {
        try {
          const response = await webNotesApi.getTagsForNote(note.id);
          return [note.id, response.tags] as const;
        } catch {
          return [note.id, []] as const;
        }
      }),
    );

    setTagsByNote(Object.fromEntries(entries));
  };

  const loadData = async (withRefresh = false) => {
    try {
      setError(null);

      if (withRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const [
        activeNotesResponse,
        archivedNotesResponse,
        deletedNotesResponse,
        foldersResponse,
        tagsResponse,
        templatesResponse,
      ] = await Promise.all([
        webNotesApi.getNotes({
          deleted: false,
          is_archived: false,
          limit: NOTES_PAGE_SIZE,
          offset: 0,
        }),
        webNotesApi.getNotes({
          deleted: false,
          is_archived: true,
          limit: NOTES_PAGE_SIZE,
          offset: 0,
        }),
        webNotesApi.getNotes({
          deleted: true,
          limit: NOTES_PAGE_SIZE,
          offset: 0,
        }),
        webNotesApi.getFolders(),
        webNotesApi.getTags(),
        webNotesApi.getTemplates(),
      ]);

      const uniqueNotes = new Map<string, Note>();

      [
        ...activeNotesResponse.notes,
        ...archivedNotesResponse.notes,
        ...deletedNotesResponse.notes,
      ].forEach((note) => {
        uniqueNotes.set(note.id, note);
      });

      const nextNotes = Array.from(uniqueNotes.values());

      setNotes(nextNotes);
      setFolders(foldersResponse.folders);
      setTags(tagsResponse.tags);
      setTemplates(
        [...templatesResponse.templates].sort(
          (left, right) => left.display_order - right.display_order,
        ),
      );

      await loadTagsForNotes(nextNotes);
    } catch (loadError) {
      console.error('No se pudieron cargar las notas', loadError);
      setError('No fue posible cargar tus notas. Intenta actualizar la página.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );

  const visibleNotes = useMemo(() => {
    let result = [...notes];

    if (activeView === 'all') {
      result = result.filter(
        (note) => !note.deleted_at && !note.is_archived,
      );
    }

    if (activeView === 'favorites') {
      result = result.filter(
        (note) =>
          !note.deleted_at && !note.is_archived && note.is_favorite,
      );
    }

    if (activeView === 'pinned') {
      result = result.filter(
        (note) =>
          !note.deleted_at && !note.is_archived && note.is_pinned,
      );
    }

    if (activeView === 'archived') {
      result = result.filter((note) => !note.deleted_at && note.is_archived);
    }

    if (activeView === 'trash') {
      result = result.filter((note) => !!note.deleted_at);
    }

    if (activeView === 'shared') {
      result = [];
    }

    if (activeView.startsWith('folder:')) {
      const folderId = activeView.slice('folder:'.length);
      result = result.filter(
        (note) =>
          !note.deleted_at &&
          !note.is_archived &&
          note.folder_id === folderId,
      );
    }

    if (activeView.startsWith('tag:')) {
      const tagId = activeView.slice('tag:'.length);
      result = result.filter(
        (note) =>
          !note.deleted_at &&
          !note.is_archived &&
          (tagsByNote[note.id] ?? []).some((tag) => tag.id === tagId),
      );
    }

    const normalizedSearch = search.trim().toLocaleLowerCase();

    if (normalizedSearch) {
      result = result.filter((note) => {
        const title = (note.title || '').toLocaleLowerCase();
        const noteTags = tagsByNote[note.id] ?? [];

        return (
          title.includes(normalizedSearch) ||
          noteTags.some((tag) =>
            tag.name.toLocaleLowerCase().includes(normalizedSearch),
          )
        );
      });
    }

    return sortNotes(result);
  }, [activeView, notes, search, tagsByNote]);

  const systemCounts = useMemo(
    () => ({
      all: notes.filter((note) => !note.deleted_at && !note.is_archived).length,
      favorites: notes.filter(
        (note) =>
          !note.deleted_at && !note.is_archived && note.is_favorite,
      ).length,
      pinned: notes.filter(
        (note) =>
          !note.deleted_at && !note.is_archived && note.is_pinned,
      ).length,
      archived: notes.filter((note) => !note.deleted_at && note.is_archived)
        .length,
      trash: notes.filter((note) => !!note.deleted_at).length,
      shared: 0,
    }),
    [notes],
  );

  const folderCounts = useMemo(
    () =>
      Object.fromEntries(
        folders.map((folder) => [
          folder.id,
          notes.filter(
            (note) =>
              !note.deleted_at &&
              !note.is_archived &&
              note.folder_id === folder.id,
          ).length,
        ]),
      ),
    [folders, notes],
  );

  const tagCounts = useMemo(
    () =>
      Object.fromEntries(
        tags.map((tag) => [
          tag.id,
          notes.filter(
            (note) =>
              !note.deleted_at &&
              !note.is_archived &&
              (tagsByNote[note.id] ?? []).some(
                (noteTag) => noteTag.id === tag.id,
              ),
          ).length,
        ]),
      ),
    [notes, tags, tagsByNote],
  );

  const setUpdatedNote = (updated: Note) => {
    setNotes((current) =>
      current.map((note) => (note.id === updated.id ? updated : note)),
    );
  };

  const handleSelectView = (view: NotesViewId) => {
    setActiveView(view);
    setSelectedNoteId(null);
  };

  const handleCreateBlank = async () => {
    try {
      setIsCreatingNote(true);

      const response = await webNotesApi.createNote({
        title: 'Nueva nota',
      });

      const content = {
        version: EMPTY_NOTE_CONTENT.version,
        blocks: EMPTY_NOTE_CONTENT.blocks.map((block) => ({
          ...block,
          id: `${block.id}_${Date.now()}`,
        })),
      };

      const updated = await webNotesApi.updateNote(response.note.id, {
        content,
      });

      setNotes((current) => [updated.note, ...current]);
      setTagsByNote((current) => ({
        ...current,
        [updated.note.id]: [],
      }));
      setSelectedNoteId(updated.note.id);
      setIsCreateModalOpen(false);
      setActiveView('all');
    } catch (createError) {
      console.error('No se pudo crear la nota', createError);
      setError('No fue posible crear la nota. Inténtalo otra vez.');
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleCreateFromTemplate = async (template: NoteTemplate) => {
    try {
      setIsCreatingNote(true);

      const response = await webNotesApi.createNote({
        title: template.name,
        template_id: template.id,
      });

      const updated = await webNotesApi.updateNote(response.note.id, {
        title: template.name,
        color: template.color || undefined,
        content: cloneTemplateContent(template.content),
      });

      setNotes((current) => [updated.note, ...current]);
      setTagsByNote((current) => ({
        ...current,
        [updated.note.id]: [],
      }));
      setSelectedNoteId(updated.note.id);
      setIsCreateModalOpen(false);
      setActiveView('all');
    } catch (createError) {
      console.error('No se pudo crear la nota con plantilla', createError);
      setError('No fue posible crear la nota desde la plantilla.');
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleSaveNote = async (
    note: Note,
    payload: {
      title: string;
      content: import('@beeapp/shared-types').NoteContent;
      color: string | null;
      folder_id: string | null;
      is_favorite: boolean;
      is_pinned: boolean;
      is_archived: boolean;
      tag_ids: string[];
    },
  ) => {
    try {
      setSavingNoteId(note.id);
      setError(null);

      const [noteResponse, tagsResponse] = await Promise.all([
        webNotesApi.updateNote(note.id, {
          title: payload.title,
          content: payload.content,
          color: payload.color || undefined,
          folder_id: payload.folder_id,
          is_favorite: payload.is_favorite,
          is_pinned: payload.is_pinned,
          is_archived: payload.is_archived,
        }),
        webNotesApi.replaceTags(note.id, {
          tag_ids: payload.tag_ids,
        }),
      ]);

      setUpdatedNote(noteResponse.note);
      setTagsByNote((current) => ({
        ...current,
        [note.id]: tagsResponse.tags,
      }));

      if (payload.is_archived && activeView !== 'archived') {
        setSelectedNoteId(null);
      }
    } catch (saveError) {
      console.error('No se pudo guardar la nota', saveError);
      setError('No fue posible guardar los cambios de la nota.');
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleQuickUpdate = async (
    note: Note,
    payload: Parameters<typeof webNotesApi.updateNote>[1],
  ) => {
    try {
      const response = await webNotesApi.updateNote(note.id, payload);
      setUpdatedNote(response.note);

      if (
        (payload.is_archived === true && activeView !== 'archived') ||
        (payload.is_archived === false && activeView === 'archived')
      ) {
        setSelectedNoteId(null);
      }
    } catch (updateError) {
      console.error('No se pudo actualizar la nota', updateError);
      setError('No fue posible actualizar la nota.');
    }
  };

  const handleMoveToTrash = async (note: Note) => {
    try {
      await webNotesApi.moveToTrash(note.id);
      setNotes((current) =>
        current.map((item) =>
          item.id === note.id
            ? {
                ...item,
                deleted_at: new Date().toISOString(),
              }
            : item,
        ),
      );
      setSelectedNoteId(null);
    } catch (trashError) {
      console.error('No se pudo mover la nota a papelera', trashError);
      setError('No fue posible mover la nota a la papelera.');
    }
  };

  const handleRestore = async (note: Note) => {
    try {
      const response = await webNotesApi.restoreNote(note.id);
      setUpdatedNote(response.note);
      setSelectedNoteId(response.note.id);
    } catch (restoreError) {
      console.error('No se pudo restaurar la nota', restoreError);
      setError('No fue posible restaurar la nota.');
    }
  };

  const handlePermanentlyDelete = async (note: Note) => {
    try {
      await webNotesApi.permanentlyDeleteNote(note.id);
      setNotes((current) => current.filter((item) => item.id !== note.id));
      setTagsByNote((current) => {
        const next = { ...current };
        delete next[note.id];
        return next;
      });
      setSelectedNoteId(null);
    } catch (deleteError) {
      console.error('No se pudo eliminar la nota', deleteError);
      setError('No fue posible eliminar la nota permanentemente.');
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      const response = await webNotesApi.createFolder({ name });
      setFolders((current) => [...current, response.folder]);
    } catch (folderError) {
      console.error('No se pudo crear la carpeta', folderError);
      setError('No fue posible crear la carpeta.');
      throw folderError;
    }
  };

  const handleRenameFolder = async (folder: NoteFolder, name: string) => {
    try {
      const response = await webNotesApi.renameFolder(folder.id, { name });
      setFolders((current) =>
        current.map((item) =>
          item.id === folder.id ? response.folder : item,
        ),
      );
    } catch (folderError) {
      console.error('No se pudo renombrar la carpeta', folderError);
      setError('No fue posible renombrar la carpeta.');
    }
  };

  const handleDeleteFolder = async (folder: NoteFolder) => {
    try {
      await webNotesApi.deleteFolder(folder.id);

      setFolders((current) => current.filter((item) => item.id !== folder.id));
      setNotes((current) =>
        current.map((note) =>
          note.folder_id === folder.id
            ? { ...note, folder_id: null }
            : note,
        ),
      );

      if (activeView === `folder:${folder.id}`) {
        setActiveView('all');
      }
    } catch (folderError) {
      console.error('No se pudo eliminar la carpeta', folderError);
      setError('No fue posible eliminar la carpeta.');
    }
  };

  const handleCreateTag = async (name: string) => {
    try {
      const response = await webNotesApi.createTag({
        name,
        color: '#7C3AED',
        icon: 'tag',
      });

      setTags((current) => [...current, response.tag]);
    } catch (tagError) {
      console.error('No se pudo crear la etiqueta', tagError);
      setError('No fue posible crear la etiqueta.');
      throw tagError;
    }
  };

  const handleRenameTag = async (tag: NoteTag, name: string) => {
    try {
      const response = await webNotesApi.updateTag(tag.id, { name });

      setTags((current) =>
        current.map((item) => (item.id === tag.id ? response.tag : item)),
      );

      setTagsByNote((current) =>
        Object.fromEntries(
          Object.entries(current).map(([noteId, noteTags]) => [
            noteId,
            noteTags.map((item) =>
              item.id === tag.id ? response.tag : item,
            ),
          ]),
        ),
      );
    } catch (tagError) {
      console.error('No se pudo renombrar la etiqueta', tagError);
      setError('No fue posible renombrar la etiqueta.');
    }
  };

  const handleDeleteTag = async (tag: NoteTag) => {
    try {
      await webNotesApi.deleteTag(tag.id);

      setTags((current) => current.filter((item) => item.id !== tag.id));
      setTagsByNote((current) =>
        Object.fromEntries(
          Object.entries(current).map(([noteId, noteTags]) => [
            noteId,
            noteTags.filter((item) => item.id !== tag.id),
          ]),
        ),
      );

      if (activeView === `tag:${tag.id}`) {
        setActiveView('all');
      }
    } catch (tagError) {
      console.error('No se pudo eliminar la etiqueta', tagError);
      setError('No fue posible eliminar la etiqueta.');
    }
  };

  const title = getViewTitle(activeView, folders, tags);
  const isTrashView = activeView === 'trash';

  return (
    <div className="min-h-full bg-white flex relative">
      <NotesOptionsBar />

      <NotesSidebar
        activeView={activeView}
        folders={folders}
        tags={tags}
        folderCounts={folderCounts}
        tagCounts={tagCounts}
        systemCounts={systemCounts}
        onSelectView={handleSelectView}
        onCreateNote={() => setIsCreateModalOpen(true)}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onCreateTag={handleCreateTag}
        onRenameTag={handleRenameTag}
        onDeleteTag={handleDeleteTag}
      />

      <section className="w-[390px] xl:w-[440px] shrink-0 border-r border-neutral-200 bg-white flex flex-col">
        <header className="px-4 pt-4 pb-3 border-b border-neutral-100">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-neutral-900 truncate">
                {title}
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                {visibleNotes.length}{' '}
                {visibleNotes.length === 1 ? 'nota' : 'notas'}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void loadData(true)}
                title="Actualizar notas"
                disabled={isRefreshing}
                className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>

              <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="Vista de lista"
                  className={`p-1.5 rounded-lg ${
                    viewMode === 'list'
                      ? 'bg-white text-brand-primary shadow-sm'
                      : 'text-neutral-400'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Vista de cuadrícula"
                  className={`p-1.5 rounded-lg ${
                    viewMode === 'grid'
                      ? 'bg-white text-brand-primary shadow-sm'
                      : 'text-neutral-400'
                  }`}
                >
                  <Grid2x2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <label className="relative block mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar notas o etiquetas"
              className="w-full h-9 rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-brand-primary focus:bg-white"
            />
          </label>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="h-full min-h-[280px] flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-7 h-7 mx-auto text-brand-primary animate-spin" />
                <p className="mt-3 text-xs text-neutral-500">
                  Cargando tus notas…
                </p>
              </div>
            </div>
          ) : (
            <NotesListPanel
              notes={visibleNotes}
              selectedId={selectedNoteId ?? undefined}
              viewMode={viewMode}
              folders={folders}
              tagsByNote={tagsByNote}
              isTrashView={isTrashView}
              onSelect={(note) => setSelectedNoteId(note.id)}
              onToggleFavorite={(note) =>
                void handleQuickUpdate(note, {
                  is_favorite: !note.is_favorite,
                })
              }
              onTogglePinned={(note) =>
                void handleQuickUpdate(note, {
                  is_pinned: !note.is_pinned,
                })
              }
              onToggleArchived={(note) =>
                void handleQuickUpdate(note, {
                  is_archived: !note.is_archived,
                })
              }
              onMoveToFolder={(note, folderId) =>
                void handleQuickUpdate(note, {
                  folder_id: folderId,
                })
              }
              onMoveToTrash={(note) => void handleMoveToTrash(note)}
              onRestore={(note) => void handleRestore(note)}
              onPermanentlyDelete={(note) => {
                if (
                  window.confirm(
                    '¿Eliminar esta nota permanentemente? Esta acción no se puede deshacer.',
                  )
                ) {
                  void handlePermanentlyDelete(note);
                }
              }}
            />
          )}
        </div>
      </section>

      <main className="flex-1 min-w-0 bg-neutral-50/50">
        {selectedNote ? (
          <NoteEdit
            key={selectedNote.id}
            note={selectedNote}
            folders={folders}
            tags={tags}
            noteTags={tagsByNote[selectedNote.id] ?? []}
            isSaving={savingNoteId === selectedNote.id}
            isTrashView={!!selectedNote.deleted_at}
            onSave={handleSaveNote}
            onMoveToTrash={(note) => void handleMoveToTrash(note)}
            onRestore={(note) => void handleRestore(note)}
            onPermanentlyDelete={(note) => {
              if (
                window.confirm(
                  '¿Eliminar esta nota permanentemente? Esta acción no se puede deshacer.',
                )
              ) {
                void handlePermanentlyDelete(note);
              }
            }}
          />
        ) : (
          <div className="h-full min-h-[460px] flex items-center justify-center p-10 text-center">
            <div className="max-w-sm">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-neutral-200 shadow-sm flex items-center justify-center">
                <Search className="w-6 h-6 text-neutral-300" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-neutral-700">
                Selecciona una nota
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                Abre una nota de la lista para editarla, o crea una nueva desde
                el botón del sidebar.
              </p>
            </div>
          </div>
        )}
      </main>

      {error && (
        <div className="fixed bottom-5 right-5 z-[90] max-w-sm rounded-2xl border border-red-200 bg-white px-4 py-3 shadow-xl flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">
              Algo no salió bien
            </p>
            <p className="mt-0.5 text-xs text-neutral-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-neutral-400 hover:text-neutral-700"
          >
            ×
          </button>
        </div>
      )}

      <CreateNoteModal
        isOpen={isCreateModalOpen}
        templates={templates}
        isCreating={isCreatingNote}
        onClose={() => {
          if (!isCreatingNote) {
            setIsCreateModalOpen(false);
          }
        }}
        onCreateBlank={() => void handleCreateBlank()}
        onCreateFromTemplate={(template) =>
          void handleCreateFromTemplate(template)
        }
      />
    </div>
  );
}