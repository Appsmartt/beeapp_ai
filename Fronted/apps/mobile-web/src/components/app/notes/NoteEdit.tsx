'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Check,
  ChevronDown,
  FileText,
  Heading1,
  Heading2,
  Image,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Minus,
  MoreHorizontal,
  Paperclip,
  Pin,
  Plus,
  Star,
  Tag,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import type {
  Note,
  NoteBlock,
  NoteContent,
  NoteFolder,
  NoteTag,
} from '@beeapp/shared-types';
import {
  createBlockId,
  createEmptyTextBlock,
  getNoteColor,
  normalizeNoteContent,
} from './notesWebTypes';

interface NoteEditProps {
  note: Note;
  folders: NoteFolder[];
  tags: NoteTag[];
  noteTags: NoteTag[];
  isSaving: boolean;
  isTrashView: boolean;
  onSave: (
    note: Note,
    payload: {
      title: string;
      content: NoteContent;
      color: string | null;
      folder_id: string | null;
      is_favorite: boolean;
      is_pinned: boolean;
      is_archived: boolean;
      tag_ids: string[];
    },
  ) => Promise<void>;
  onMoveToTrash: (note: Note) => void;
  onRestore: (note: Note) => void;
  onPermanentlyDelete: (note: Note) => void;
}

type NewBlockType =
  | 'text'
  | 'heading'
  | 'textarea'
  | 'checklist'
  | 'bulleted_list'
  | 'numbered_list'
  | 'divider';

const COLORS = [
  '#7C3AED',
  '#2563EB',
  '#0891B2',
  '#059669',
  '#CA8A04',
  '#EA580C',
  '#DC2626',
  '#DB2777',
];

function copyContent(content: NoteContent): NoteContent {
  return JSON.parse(JSON.stringify(content)) as NoteContent;
}

function createBlock(type: NewBlockType): NoteBlock {
  const id = createBlockId();

  switch (type) {
    case 'heading':
      return {
        id,
        type: 'heading',
        text: '',
        level: 2,
      };
    case 'textarea':
      return {
        id,
        type: 'textarea',
        text: '',
      };
    case 'checklist':
      return {
        id,
        type: 'checklist',
        items: [
          {
            id: createBlockId(),
            text: '',
            checked: false,
          },
        ],
      };
    case 'bulleted_list':
      return {
        id,
        type: 'bulleted_list',
        items: [''],
      };
    case 'numbered_list':
      return {
        id,
        type: 'numbered_list',
        items: [''],
      };
    case 'divider':
      return {
        id,
        type: 'divider',
      };
    default:
      return createEmptyTextBlock();
  }
}

function updateBlock(
  blocks: NoteBlock[],
  blockId: string,
  updater: (block: NoteBlock) => NoteBlock,
): NoteBlock[] {
  return blocks.map((block) => (block.id === blockId ? updater(block) : block));
}

function BlockActions({
  onRemove,
}: {
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      title="Eliminar bloque"
      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-neutral-300 hover:text-red-600 hover:bg-red-50 transition-all"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
}

export default function NoteEdit({
  note,
  folders,
  tags,
  noteTags,
  isSaving,
  isTrashView,
  onSave,
  onMoveToTrash,
  onRestore,
  onPermanentlyDelete,
}: NoteEditProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<NoteContent>(normalizeNoteContent());
  const [color, setColor] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [showMeta, setShowMeta] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);

  useEffect(() => {
    setTitle(note.title || '');
    setContent(copyContent(normalizeNoteContent(note.content ?? note.template_snapshot)));
    setColor(note.color);
    setFolderId(note.folder_id);
    setIsFavorite(note.is_favorite);
    setIsPinned(note.is_pinned);
    setIsArchived(note.is_archived);
    setTagIds(noteTags.map((tag) => tag.id));
    setShowMeta(false);
    setShowAddBlock(false);
  }, [note.id, noteTags]);

  const selectedTags = useMemo(
    () => tags.filter((tag) => tagIds.includes(tag.id)),
    [tagIds, tags],
  );

  const wordCount = useMemo(() => {
    const text = content.blocks
      .flatMap((block) => {
        switch (block.type) {
          case 'text':
          case 'textarea':
          case 'heading':
            return [block.text];
          case 'field':
            return [block.label, block.value];
          case 'checklist':
            return block.items.map((item) => item.text);
          case 'bulleted_list':
          case 'numbered_list':
            return block.items;
          default:
            return [];
        }
      })
      .join(' ')
      .trim();

    return text ? text.split(/\s+/).length : 0;
  }, [content]);

  const setBlocks = (blocks: NoteBlock[]) => {
    setContent((current) => ({
      ...current,
      blocks,
    }));
  };

  const removeBlock = (blockId: string) => {
    setBlocks(
      content.blocks.length === 1
        ? [createEmptyTextBlock()]
        : content.blocks.filter((block) => block.id !== blockId),
    );
  };

  const addBlock = (type: NewBlockType) => {
    setBlocks([...content.blocks, createBlock(type)]);
    setShowAddBlock(false);
  };

  const toggleTag = (tagId: string) => {
    setTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  };

  const handleSave = async () => {
    await onSave(note, {
      title: title.trim() || 'Sin título',
      content,
      color,
      folder_id: folderId,
      is_favorite: isFavorite,
      is_pinned: isPinned,
      is_archived: isArchived,
      tag_ids: tagIds,
    });
  };

  return (
    <section className="h-full min-w-0 flex flex-col bg-white">
      <header className="min-h-[57px] px-5 border-b border-neutral-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsFavorite((current) => !current)}
            title={isFavorite ? 'Quitar favorita' : 'Marcar favorita'}
            disabled={isTrashView}
            className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
              isFavorite
                ? 'text-amber-500 bg-amber-50'
                : 'text-neutral-400 hover:bg-neutral-100'
            }`}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsPinned((current) => !current)}
            title={isPinned ? 'Quitar fijada' : 'Fijar nota'}
            disabled={isTrashView}
            className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
              isPinned
                ? 'text-brand-primary bg-brand-primary/10'
                : 'text-neutral-400 hover:bg-neutral-100'
            }`}
          >
            <Pin className={`w-4 h-4 ${isPinned ? 'fill-brand-primary' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsArchived((current) => !current)}
            title={isArchived ? 'Desarchivar' : 'Archivar'}
            disabled={isTrashView}
            className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
              isArchived
                ? 'text-brand-primary bg-brand-primary/10'
                : 'text-neutral-400 hover:bg-neutral-100'
            }`}
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isTrashView ? (
            <>
              <button
                type="button"
                onClick={() => onRestore(note)}
                className="h-8 px-3 rounded-full text-xs font-semibold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/15 transition-colors"
              >
                Restaurar
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Eliminar esta nota permanentemente?')) {
                    onPermanentlyDelete(note);
                  }
                }}
                className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                title="Eliminar permanentemente"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onMoveToTrash(note)}
                title="Mover a papelera"
                className="p-2 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="h-8 px-3.5 rounded-full bg-brand-primary text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-dark disabled:opacity-60 transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Guardar
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-7 py-7 lg:px-10 lg:py-9">
          <div className="flex items-start gap-3">
            <span
              className="w-3 h-3 mt-3.5 rounded-full shrink-0"
              style={{ backgroundColor: color || getNoteColor(note) }}
            />

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isTrashView}
              placeholder="Título de la nota"
              className="w-full bg-transparent border-0 outline-none text-3xl leading-tight font-semibold text-neutral-900 placeholder:text-neutral-300 disabled:cursor-default"
            />
          </div>

          <div className="mt-5 pb-5 border-b border-neutral-100">
            <button
              type="button"
              onClick={() => setShowMeta((current) => !current)}
              disabled={isTrashView}
              className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-800 disabled:cursor-default"
            >
              <MoreHorizontal className="w-4 h-4" />
              Propiedades
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMeta ? 'rotate-180' : ''}`} />
            </button>

            {showMeta && !isTrashView && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
                <label className="block">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 mb-2">
                    <FolderInput className="w-3.5 h-3.5" />
                    Carpeta
                  </span>
                  <select
                    value={folderId || ''}
                    onChange={(event) => setFolderId(event.target.value || null)}
                    className="w-full h-9 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs text-neutral-800 outline-none focus:border-brand-primary"
                  >
                    <option value="">Sin carpeta</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 mb-2">
                    <Tag className="w-3.5 h-3.5" />
                    Etiquetas
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => {
                      const selected = tagIds.includes(tag.id);

                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${
                            selected ? '' : 'bg-white border-neutral-200 text-neutral-500'
                          }`}
                          style={
                            selected
                              ? {
                                  color: tag.color,
                                  borderColor: tag.color,
                                  backgroundColor: `${tag.color}12`,
                                }
                              : undefined
                          }
                        >
                          {tag.name}
                        </button>
                      );
                    })}

                    {tags.length === 0 && (
                      <span className="text-xs text-neutral-400">
                        Crea etiquetas desde el sidebar.
                      </span>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className="block text-xs font-medium text-neutral-600 mb-2">
                    Color de la nota
                  </span>
                  <div className="flex items-center gap-2">
                    {COLORS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        aria-label={`Color ${item}`}
                        onClick={() => setColor(item)}
                        className={`w-6 h-6 rounded-full ring-offset-2 transition-all ${
                          color === item ? 'ring-2 ring-neutral-500' : ''
                        }`}
                        style={{ backgroundColor: item }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedTags.length > 0 && !showMeta && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full px-2 py-1 text-[11px] font-medium"
                    style={{
                      color: tag.color,
                      backgroundColor: `${tag.color}14`,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="py-6 space-y-4">
            {content.blocks.map((block, index) => (
              <div key={block.id} className="group relative">
                {block.type === 'text' && (
                  <div className="flex items-start gap-2">
                    <textarea
                      value={block.text}
                      disabled={isTrashView}
                      rows={Math.max(2, block.text.split('\n').length)}
                      placeholder="Escribe algo..."
                      onChange={(event) =>
                        setBlocks(
                          updateBlock(content.blocks, block.id, (current) =>
                            current.type === 'text'
                              ? { ...current, text: event.target.value }
                              : current,
                          ),
                        )
                      }
                      className="flex-1 resize-none border-0 bg-transparent p-0 text-[15px] leading-7 text-neutral-800 outline-none placeholder:text-neutral-300 disabled:cursor-default"
                    />
                    {!isTrashView && <BlockActions onRemove={() => removeBlock(block.id)} />}
                  </div>
                )}

                {block.type === 'textarea' && (
                  <div className="flex items-start gap-2">
                    <textarea
                      value={block.text}
                      disabled={isTrashView}
                      rows={6}
                      placeholder="Escribe contenido..."
                      onChange={(event) =>
                        setBlocks(
                          updateBlock(content.blocks, block.id, (current) =>
                            current.type === 'textarea'
                              ? { ...current, text: event.target.value }
                              : current,
                          ),
                        )
                      }
                      className="flex-1 resize-y rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm leading-6 text-neutral-800 outline-none focus:border-brand-primary focus:bg-white placeholder:text-neutral-300 disabled:cursor-default"
                    />
                    {!isTrashView && <BlockActions onRemove={() => removeBlock(block.id)} />}
                  </div>
                )}

                {block.type === 'heading' && (
                  <div className="flex items-start gap-2">
                    <input
                      value={block.text}
                      disabled={isTrashView}
                      placeholder="Encabezado"
                      onChange={(event) =>
                        setBlocks(
                          updateBlock(content.blocks, block.id, (current) =>
                            current.type === 'heading'
                              ? { ...current, text: event.target.value }
                              : current,
                          ),
                        )
                      }
                      className={`flex-1 border-0 bg-transparent p-0 font-semibold text-neutral-900 outline-none placeholder:text-neutral-300 disabled:cursor-default ${
                        block.level === 1 ? 'text-2xl' : 'text-xl'
                      }`}
                    />
                    {!isTrashView && <BlockActions onRemove={() => removeBlock(block.id)} />}
                  </div>
                )}

                {block.type === 'checklist' && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      {block.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            disabled={isTrashView}
                            onChange={(event) =>
                              setBlocks(
                                updateBlock(content.blocks, block.id, (current) =>
                                  current.type === 'checklist'
                                    ? {
                                        ...current,
                                        items: current.items.map((entry) =>
                                          entry.id === item.id
                                            ? {
                                                ...entry,
                                                checked: event.target.checked,
                                              }
                                            : entry,
                                        ),
                                      }
                                    : current,
                                ),
                              )
                            }
                            className="w-4 h-4 accent-brand-primary"
                          />

                          <input
                            value={item.text}
                            disabled={isTrashView}
                            placeholder="Tarea"
                            onChange={(event) =>
                              setBlocks(
                                updateBlock(content.blocks, block.id, (current) =>
                                  current.type === 'checklist'
                                    ? {
                                        ...current,
                                        items: current.items.map((entry) =>
                                          entry.id === item.id
                                            ? {
                                                ...entry,
                                                text: event.target.value,
                                              }
                                            : entry,
                                        ),
                                      }
                                    : current,
                                ),
                              )
                            }
                            className={`flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-neutral-300 ${
                              item.checked
                                ? 'text-neutral-400 line-through'
                                : 'text-neutral-800'
                            }`}
                          />

                          {!isTrashView && (
                            <button
                              type="button"
                              onClick={() =>
                                setBlocks(
                                  updateBlock(content.blocks, block.id, (current) =>
                                    current.type === 'checklist'
                                      ? {
                                          ...current,
                                          items:
                                            current.items.length === 1
                                              ? [
                                                  {
                                                    id: createBlockId(),
                                                    text: '',
                                                    checked: false,
                                                  },
                                                ]
                                              : current.items.filter(
                                                  (entry) => entry.id !== item.id,
                                                ),
                                        }
                                      : current,
                                  ),
                                )
                              }
                              className="p-1 text-neutral-300 hover:text-red-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {!isTrashView && (
                        <button
                          type="button"
                          onClick={() =>
                            setBlocks(
                              updateBlock(content.blocks, block.id, (current) =>
                                current.type === 'checklist'
                                  ? {
                                      ...current,
                                      items: [
                                        ...current.items,
                                        {
                                          id: createBlockId(),
                                          text: '',
                                          checked: false,
                                        },
                                      ],
                                    }
                                  : current,
                              ),
                            )
                          }
                          className="text-xs text-brand-primary hover:text-brand-dark"
                        >
                          + Agregar tarea
                        </button>
                      )}
                    </div>

                    {!isTrashView && <BlockActions onRemove={() => removeBlock(block.id)} />}
                  </div>
                )}

                {(block.type === 'bulleted_list' || block.type === 'numbered_list') && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      {block.items.map((item, itemIndex) => (
                        <div key={`${block.id}_${itemIndex}`} className="flex items-center gap-2">
                          <span className="w-5 text-right text-sm text-neutral-400">
                            {block.type === 'bulleted_list' ? '•' : `${itemIndex + 1}.`}
                          </span>
                          <input
                            value={item}
                            disabled={isTrashView}
                            placeholder="Elemento"
                            onChange={(event) =>
                              setBlocks(
                                updateBlock(content.blocks, block.id, (current) => {
                                  if (
                                    current.type !== 'bulleted_list' &&
                                    current.type !== 'numbered_list'
                                  ) {
                                    return current;
                                  }

                                  return {
                                    ...current,
                                    items: current.items.map((entry, index) =>
                                      index === itemIndex ? event.target.value : entry,
                                    ),
                                  };
                                }),
                              )
                            }
                            className="flex-1 border-0 bg-transparent p-0 text-sm text-neutral-800 outline-none placeholder:text-neutral-300"
                          />

                          {!isTrashView && (
                            <button
                              type="button"
                              onClick={() =>
                                setBlocks(
                                  updateBlock(content.blocks, block.id, (current) => {
                                    if (
                                      current.type !== 'bulleted_list' &&
                                      current.type !== 'numbered_list'
                                    ) {
                                      return current;
                                    }

                                    return {
                                      ...current,
                                      items:
                                        current.items.length === 1
                                          ? ['']
                                          : current.items.filter(
                                              (_, index) => index !== itemIndex,
                                            ),
                                    };
                                  }),
                                )
                              }
                              className="p-1 text-neutral-300 hover:text-red-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {!isTrashView && (
                        <button
                          type="button"
                          onClick={() =>
                            setBlocks(
                              updateBlock(content.blocks, block.id, (current) => {
                                if (
                                  current.type !== 'bulleted_list' &&
                                  current.type !== 'numbered_list'
                                ) {
                                  return current;
                                }

                                return {
                                  ...current,
                                  items: [...current.items, ''],
                                };
                              }),
                            )
                          }
                          className="text-xs text-brand-primary hover:text-brand-dark"
                        >
                          + Agregar elemento
                        </button>
                      )}
                    </div>

                    {!isTrashView && <BlockActions onRemove={() => removeBlock(block.id)} />}
                  </div>
                )}

                {block.type === 'field' && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-[minmax(120px,0.35fr)_1fr] gap-3 rounded-xl border border-neutral-200 p-3">
                      <input
                        value={block.label}
                        disabled={isTrashView}
                        placeholder="Etiqueta"
                        onChange={(event) =>
                          setBlocks(
                            updateBlock(content.blocks, block.id, (current) =>
                              current.type === 'field'
                                ? { ...current, label: event.target.value }
                                : current,
                            ),
                          )
                        }
                        className="border-0 bg-transparent text-xs font-semibold text-neutral-600 outline-none"
                      />
                      <input
                        value={block.value}
                        disabled={isTrashView}
                        placeholder="Valor"
                        onChange={(event) =>
                          setBlocks(
                            updateBlock(content.blocks, block.id, (current) =>
                              current.type === 'field'
                                ? { ...current, value: event.target.value }
                                : current,
                            ),
                          )
                        }
                        className="border-0 bg-transparent text-sm text-neutral-800 outline-none"
                      />
                    </div>
                    {!isTrashView && <BlockActions onRemove={() => removeBlock(block.id)} />}
                  </div>
                )}

                {block.type === 'date' && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
                      <input
                        value={block.label || ''}
                        disabled={isTrashView}
                        placeholder="Fecha"
                        onChange={(event) =>
                          setBlocks(
                            updateBlock(content.blocks, block.id, (current) =>
                              current.type === 'date'
                                ? { ...current, label: event.target.value }
                                : current,
                            ),
                          )
                        }
                        className="flex-1 border-0 bg-transparent text-xs font-semibold text-neutral-600 outline-none"
                      />
                      <input
                        type="date"
                        value={block.value || ''}
                        disabled={isTrashView}
                        onChange={(event) =>
                          setBlocks(
                            updateBlock(content.blocks, block.id, (current) =>
                              current.type === 'date'
                                ? {
                                    ...current,
                                    value: event.target.value || null,
                                  }
                                : current,
                            ),
                          )
                        }
                        className="border-0 bg-transparent text-sm text-neutral-800 outline-none"
                      />
                    </div>
                    {!isTrashView && <BlockActions onRemove={() => removeBlock(block.id)} />}
                  </div>
                )}

                {block.type === 'date_list' && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 rounded-xl border border-neutral-200 p-3 text-sm text-neutral-500">
                      Lista de fechas: este bloque se conserva y puede editarse desde la app móvil.
                    </div>
                    {!isTrashView && <BlockActions onRemove={() => removeBlock(block.id)} />}
                  </div>
                )}

                {block.type === 'number_list' && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 rounded-xl border border-neutral-200 p-3 text-sm text-neutral-500">
                      Lista numérica: este bloque se conserva y puede editarse desde la app móvil.
                    </div>
                    {!isTrashView && <BlockActions onRemove={() => removeBlock(block.id)} />}
                  </div>
                )}

                {(block.type === 'image' ||
                  block.type === 'file' ||
                  block.type === 'file_list') && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 flex items-center gap-3">
                      {block.type === 'image' ? (
                        <Image className="w-5 h-5 text-neutral-400" />
                      ) : (
                        <Paperclip className="w-5 h-5 text-neutral-400" />
                      )}
                      <span className="text-sm text-neutral-500">
                        Archivo adjunto. La gestión de archivos se conserva para la siguiente fase.
                      </span>
                    </div>
                    {!isTrashView && <BlockActions onRemove={() => removeBlock(block.id)} />}
                  </div>
                )}

                {block.type === 'divider' && (
                  <div className="flex items-center gap-2">
                    <hr className="flex-1 border-neutral-200" />
                    {!isTrashView && <BlockActions onRemove={() => removeBlock(block.id)} />}
                  </div>
                )}

                {index < content.blocks.length - 1 && (
                  <div className="h-1" />
                )}
              </div>
            ))}

            {!isTrashView && (
              <div className="relative pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBlock((current) => !current)}
                  className="h-9 px-3 rounded-xl border border-dashed border-neutral-300 text-xs font-medium text-neutral-500 flex items-center gap-1.5 hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary/[0.03] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Agregar bloque
                </button>

                {showAddBlock && (
                  <div className="absolute left-0 top-12 z-30 w-56 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl">
                    {[
                      { type: 'text' as const, label: 'Texto', icon: Type },
                      { type: 'heading' as const, label: 'Encabezado', icon: Heading1 },
                      { type: 'textarea' as const, label: 'Área de texto', icon: FileText },
                      { type: 'checklist' as const, label: 'Lista de tareas', icon: ListChecks },
                      { type: 'bulleted_list' as const, label: 'Lista con viñetas', icon: List },
                      { type: 'numbered_list' as const, label: 'Lista numerada', icon: ListOrdered },
                      { type: 'divider' as const, label: 'Separador', icon: Minus },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => addBlock(item.type)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-neutral-700 hover:bg-neutral-50"
                        >
                          <Icon className="w-4 h-4 text-neutral-500" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="h-10 px-6 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
        <span>
          Actualizada {new Date(note.updated_at).toLocaleDateString('es-CO')}
        </span>
        <span>
          {wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}
        </span>
      </footer>
    </section>
  );
}