import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useNavigation,
} from 'expo-router';
import {
  Archive,
  Check,
  ChevronLeft,
  Eye,
  Folder,
  MoreVertical,
  Pin,
  Save,
  Share2,
  Star,
  Tag,
  Trash2,
  Undo2,
  X,
} from 'lucide-react-native';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';
import {
  createNote,
  getNote,
  getNoteAttachmentAccess,
  getSharedNote,
  getTagsForNote,
  moveNoteToTrash,
  permanentlyDeleteNote,
  replaceNoteTags,
  restoreNote,
  updateNote,
} from '@beeapp/api-client';
import type {
  NoteAttachment,
  NoteContent,
  NoteFolder,
  NoteTag,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
  useScreenParams,
} from '../../../src/components/embedded/EmbeddedNavContext';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import NoteAttachmentsSection from '../../../src/components/notes/NoteAttachmentsSection';
import NoteBlocksEditor from '../../../src/components/notes/NoteBlocksEditor';
import NoteBlocksRenderer from '../../../src/components/notes/NoteBlocksRenderer';
import NoteShareModal from '../../../src/components/notes/NoteShareModal';
import {
  noteEditStyles as sharedStyles,
} from '../../../src/components/notes/noteEditStyles';
import {
  sanitizeNoteContent,
} from '../../../src/components/notes/noteBlocks';
import {
  createEmptyNoteContent,
  ensureNoteContent,
  mapNoteToListItem,
  normalizeNoteTitle,
} from '../../../src/services/notesService';
import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';
import {
  getFolders,
  getTags,
  getTemplates,
  removeNote,
  upsertNote,
} from '../../../src/stores/notesStore';


type EditorLoadingState =
  | 'loading'
  | 'ready'
  | 'saving'
  | 'error';


const DEFAULT_NOTE_COLOR = '#6025D2';


export default function NoteEditScreen() {
  const router = useModuleNav();
  const navigation = useNavigation();
  const params = useScreenParams();

  const noteId = typeof params.id === 'string'
    ? params.id
    : undefined;

  const templateId = typeof params.templateId === 'string'
    ? params.templateId
    : undefined;

  const isShared = params.shared === 'true';

  const [status, setStatus] =
    useState<EditorLoadingState>(
      noteId ? 'loading' : 'ready',
    );

  const [error, setError] = useState<string | null>(
    null,
  );

  const [title, setTitle] = useState('');

  const [content, setContent] = useState<NoteContent>(
    createEmptyNoteContent(),
  );

  const [folderId, setFolderId] = useState<
    string | null
  >(null);

  const [tagIds, setTagIds] = useState<string[]>([]);

  const [isFavorite, setIsFavorite] = useState(false);

  const [isPinned, setIsPinned] = useState(false);

  const [isArchived, setIsArchived] = useState(false);

  const [color, setColor] = useState(
    DEFAULT_NOTE_COLOR,
  );

  const [preview, setPreview] = useState(false);

  const [isInTrash, setIsInTrash] = useState(false);

  const [folderPickerVisible, setFolderPickerVisible] =
    useState(false);

  const [tagPickerVisible, setTagPickerVisible] =
    useState(false);

  const [actionsVisible, setActionsVisible] =
    useState(false);

  const [shareModalVisible, setShareModalVisible] =
    useState(false);

  const [sharedByName, setSharedByName] = useState<
    string | null
  >(null);

  const folders = useMemo(
    () => getFolders(),
    [],
  );

  const tags = useMemo(
    () => getTags(),
    [],
  );

  const templates = useMemo(
    () => getTemplates(),
    [],
  );


  const selectedFolder = useMemo(
    () =>
      folders.find(
        (folder) => folder.id === folderId,
      ) || null,
    [folderId, folders],
  );


  const selectedTags = useMemo(
    () =>
      tags.filter((tag) =>
        tagIds.includes(tag.id),
      ),
    [tagIds, tags],
  );


  const loadNote = useCallback(async () => {
    if (!noteId) {
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const auth =
        await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      if (isShared) {
        const response = await getSharedNote(
          auth,
          noteId,
        );

        const sharedNote = response.note;
        const sharedBy = response.share.shared_by;

        setTitle(sharedNote.title || '');
        setContent(
          ensureNoteContent(sharedNote.content),
        );
        setFolderId(sharedNote.folder_id);
        setIsFavorite(sharedNote.is_favorite);
        setIsPinned(sharedNote.is_pinned);
        setIsArchived(sharedNote.is_archived);
        setIsInTrash(false);
        setColor(
          sharedNote.color || DEFAULT_NOTE_COLOR,
        );
        setSharedByName(
          sharedBy
            ? (
              `${sharedBy.first_name} `
              + `${sharedBy.last_name}`
            ).trim()
            : 'Usuario de Buddy',
        );

        setStatus('ready');
        return;
      }

      const [
        noteResponse,
        noteTagsResponse,
      ] = await Promise.all([
        getNote(auth, noteId),
        getTagsForNote(auth, noteId),
      ]);

      const note = noteResponse.note;

      setTitle(note.title || '');
      setContent(
        ensureNoteContent(note.content),
      );
      setFolderId(note.folder_id);
      setTagIds(
        noteTagsResponse.tags.map(
          (tag) => tag.id,
        ),
      );
      setIsFavorite(note.is_favorite);
      setIsPinned(note.is_pinned);
      setIsArchived(note.is_archived);
      setIsInTrash(Boolean(note.deleted_at));
      setColor(
        note.color || DEFAULT_NOTE_COLOR,
      );

      setStatus('ready');
    } catch (loadError) {
      setStatus('error');
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar la nota.',
      );
    }
  }, [isShared, noteId]);


  useEffect(() => {
    void loadNote();
  }, [loadNote]);


  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'focus',
      () => {
        if (noteId) {
          void loadNote();
        }
      },
    );

    return unsubscribe;
  }, [loadNote, navigation, noteId]);


  useEffect(() => {
    if (!noteId && templateId) {
      const template = templates.find(
        (item) => item.id === templateId,
      );

      if (!template) {
        return;
      }

      setTitle(template.name);
      setContent(
        ensureNoteContent(template.content),
      );
      setColor(
        template.color || DEFAULT_NOTE_COLOR,
      );
    }
  }, [noteId, templateId, templates]);


  const createThenUpdateNote = async () => {
    const auth =
      await getValidSessionCredentials();

    if (!auth) {
      throw new Error(
        'Tu sesión expiró. Inicia sesión nuevamente.',
      );
    }

    const initialTitle = title.trim() || 'Sin título';

    const createResponse = await createNote(auth, {
      title: initialTitle,
      template_id: templateId || null,
      folder_id: folderId,
    });

    const createdNote = createResponse.note;

    const updatedResponse = await updateNote(
      auth,
      createdNote.id,
      {
        title: initialTitle,
        content: sanitizeNoteContent(content),
        color,
        folder_id: folderId,
        is_favorite: isFavorite,
        is_pinned: isPinned,
        is_archived: isArchived,
        last_opened_at: new Date().toISOString(),
      },
    );

    await replaceNoteTags(
      auth,
      createdNote.id,
      {
        tag_ids: tagIds,
      },
    );

    return updatedResponse.note;
  };


  const updateExistingNote = async () => {
    if (!noteId) {
      throw new Error(
        'No fue posible identificar la nota.',
      );
    }

    const auth =
      await getValidSessionCredentials();

    if (!auth) {
      throw new Error(
        'Tu sesión expiró. Inicia sesión nuevamente.',
      );
    }

    const updatedResponse = await updateNote(
      auth,
      noteId,
      {
        title: title.trim() || 'Sin título',
        content: sanitizeNoteContent(content),
        color,
        folder_id: folderId,
        is_favorite: isFavorite,
        is_pinned: isPinned,
        is_archived: isArchived,
        last_opened_at: new Date().toISOString(),
      },
    );

    const updatedTagsResponse =
      await replaceNoteTags(
        auth,
        noteId,
        {
          tag_ids: tagIds,
        },
      );

    upsertNote(
      mapNoteToListItem(updatedResponse.note, {
        tagIds: updatedTagsResponse.tags.map(
          (tag) => tag.id,
        ),
      }),
    );

    return updatedResponse.note;
  };


  const handleAttachmentCreated = (
    attachment: NoteAttachment,
  ) => {
    const isImage =
      attachment.attachment_type === 'image'
      || attachment.file.kind === 'image';

    setContent((currentContent) => ({
      ...currentContent,
      blocks: [
        ...currentContent.blocks,
        {
          id: 'attachment-' + attachment.id,
          type: isImage
            ? 'image'
            : 'file',
          attachment_id: attachment.id,
          file_id: attachment.file_id,
          caption: attachment.file.display_name,
        },
      ],
    }));
  };


  const handleAttachmentDeleted = (
    attachmentId: string,
  ) => {
    setContent((currentContent) => ({
      ...currentContent,
      blocks: currentContent.blocks
        .map((block) => {
          if (block.type === 'file_list') {
            return {
              ...block,
              attachments: block.attachments.filter(
                (attachment) =>
                  attachment.attachment_id
                  !== attachmentId,
              ),
            };
          }

          return block;
        })
        .filter((block) => {
          if (
            block.type === 'image'
            || block.type === 'file'
          ) {
            return block.attachment_id !== attachmentId;
          }

          return true;
        }),
    }));
  };


  const handleOpenAttachment = async (
    attachmentId: string,
    download = false,
  ) => {
    if (!noteId) {
      return;
    }

    try {
      const auth =
        await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const response = await getNoteAttachmentAccess(
        auth,
        noteId,
        attachmentId,
        download,
      );

      const canOpen = await Linking.canOpenURL(
        response.url,
      );

      if (!canOpen) {
        throw new Error(
          'El dispositivo no puede abrir este archivo.',
        );
      }

      await Linking.openURL(response.url);
    } catch (openError) {
      Alert.alert(
        'No fue posible abrir el adjunto',
        openError instanceof Error
          ? openError.message
          : 'Intenta nuevamente.',
      );
    }
  };


  const handleSave = async () => {
    if (isShared || isInTrash) {
      router.back();
      return;
    }

    setStatus('saving');
    setError(null);

    try {
      const savedNote = noteId
        ? await updateExistingNote()
        : await createThenUpdateNote();

      if (!noteId) {
        const auth =
          await getValidSessionCredentials();

        if (auth) {
          const savedTagsResponse =
            await getTagsForNote(
              auth,
              savedNote.id,
            );

          upsertNote(
            mapNoteToListItem(savedNote, {
              tagIds: savedTagsResponse.tags.map(
                (tag) => tag.id,
              ),
            }),
          );
        }
      }

      router.replace('/(main)/notes');
    } catch (saveError) {
      setStatus('error');
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'No fue posible guardar la nota.',
      );
    } finally {
      setStatus('ready');
    }
  };


  const handleMoveToTrash = () => {
    if (!noteId) {
      return;
    }

    Alert.alert(
      'Mover a papelera',
      (
        'La nota se moverá a la papelera. '
        + 'Podrás restaurarla más adelante.'
      ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Mover',
          style: 'destructive',
          onPress: () => {
            void confirmMoveToTrash();
          },
        },
      ],
    );
  };


  const confirmMoveToTrash = async () => {
    if (!noteId) {
      return;
    }

    try {
      setStatus('saving');

      const auth =
        await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      await moveNoteToTrash(auth, noteId);

      removeNote(noteId);

      router.replace('/(main)/notes');
    } catch (trashError) {
      Alert.alert(
        'No fue posible mover la nota',
        trashError instanceof Error
          ? trashError.message
          : 'Intenta nuevamente.',
      );
    } finally {
      setStatus('ready');
    }
  };


  const handleRestoreNote = async () => {
    if (!noteId) {
      return;
    }

    try {
      setStatus('saving');

      const auth =
        await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      const response = await restoreNote(
        auth,
        noteId,
      );

      const tagsResponse = await getTagsForNote(
        auth,
        noteId,
      );

      upsertNote(
        mapNoteToListItem(response.note, {
          tagIds: tagsResponse.tags.map(
            (tag) => tag.id,
          ),
        }),
      );

      router.replace('/(main)/notes');
    } catch (restoreError) {
      Alert.alert(
        'No fue posible restaurar la nota',
        restoreError instanceof Error
          ? restoreError.message
          : 'Intenta nuevamente.',
      );
    } finally {
      setStatus('ready');
    }
  };


  const handlePermanentlyDelete = () => {
    if (!noteId) {
      return;
    }

    Alert.alert(
      'Eliminar permanentemente',
      (
        'Esta nota se eliminará definitivamente. '
        + 'Esta acción no se puede deshacer.'
      ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar definitivamente',
          style: 'destructive',
          onPress: () => {
            void confirmPermanentlyDelete();
          },
        },
      ],
    );
  };


  const confirmPermanentlyDelete = async () => {
    if (!noteId) {
      return;
    }

    try {
      setStatus('saving');

      const auth =
        await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      await permanentlyDeleteNote(auth, noteId);

      removeNote(noteId);

      router.replace('/(main)/notes');
    } catch (deleteError) {
      Alert.alert(
        'No fue posible eliminar la nota',
        deleteError instanceof Error
          ? deleteError.message
          : 'Intenta nuevamente.',
      );
    } finally {
      setStatus('ready');
    }
  };


  const handleDiscard = () => {
    if (status === 'saving') {
      return;
    }

    if (isShared || isInTrash) {
      router.back();
      return;
    }

    Alert.alert(
      'Descartar cambios',
      'Los cambios que no hayas guardado se perderán.',
      [
        {
          text: 'Seguir editando',
          style: 'cancel',
        },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ],
    );
  };


  const toggleTag = (
    tag: NoteTag,
  ) => {
    setTagIds((currentIds) =>
      currentIds.includes(tag.id)
        ? currentIds.filter(
          (id) => id !== tag.id,
        )
        : [...currentIds, tag.id],
    );
  };


  if (status === 'loading') {
    return (
      <ScreenSafeArea style={sharedStyles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors.brand.primary}
          />

          <Text style={styles.centerStateText}>
            Cargando nota...
          </Text>
        </View>
      </ScreenSafeArea>
    );
  }


  if (status === 'error' && !title && noteId) {
    return (
      <ScreenSafeArea style={sharedStyles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            No fue posible cargar la nota
          </Text>

          <Text style={styles.errorText}>
            {error || 'Intenta nuevamente.'}
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void loadNote()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenSafeArea>
    );
  }


  const isReadOnly = isShared || isInTrash;

  return (
    <ScreenSafeArea style={sharedStyles.safeArea}>
      <View style={sharedStyles.container}>
        <View style={sharedStyles.header}>
          <TouchableOpacity
            onPress={handleDiscard}
            style={sharedStyles.backBtn}
            activeOpacity={0.7}
            accessibilityLabel="Volver"
          >
            <ChevronLeft
              size={24}
              color={colors.neutral.text}
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text
              style={sharedStyles.headerTitle}
              numberOfLines={1}
            >
              {isShared
                ? 'Nota compartida'
                : isInTrash
                  ? 'Nota en papelera'
                  : noteId
                    ? 'Editar nota'
                    : 'Nueva nota'}
            </Text>

            {isShared && sharedByName && (
              <Text style={styles.sharedHeaderText}>
                De {sharedByName}
              </Text>
            )}
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setPreview((value) => !value)}
              style={sharedStyles.saveHeaderBtn}
              accessibilityLabel={
                preview
                  ? 'Editar nota'
                  : 'Vista previa'
              }
              activeOpacity={0.7}
            >
              <Eye
                size={19}
                color={colors.neutral.text}
              />
            </TouchableOpacity>

            {!isReadOnly && (
              <TouchableOpacity
                onPress={() => {
                  void handleSave();
                }}
                style={sharedStyles.saveHeaderBtn}
                accessibilityLabel="Guardar nota"
                activeOpacity={0.8}
                disabled={status === 'saving'}
              >
                {status === 'saving' ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.brand.primary}
                  />
                ) : (
                  <Save
                    size={20}
                    color={colors.brand.primary}
                  />
                )}
              </TouchableOpacity>
            )}

            {noteId && !isShared && (
              <TouchableOpacity
                onPress={() => setActionsVisible(true)}
                style={sharedStyles.saveHeaderBtn}
                accessibilityLabel="Más acciones"
                activeOpacity={0.7}
              >
                <MoreVertical
                  size={20}
                  color={colors.neutral.text}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {error && (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>
              {error}
            </Text>

            <TouchableOpacity
              onPress={() => setError(null)}
              activeOpacity={0.7}
            >
              <X
                size={16}
                color={colors.semantic.error}
              />
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={sharedStyles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isReadOnly || preview ? (
            <>
              <Text style={styles.previewTitle}>
                {normalizeNoteTitle(title)}
              </Text>

              <NoteMetaReadOnly
                folder={selectedFolder}
                tags={selectedTags}
                isFavorite={isFavorite}
                isPinned={isPinned}
                isArchived={isArchived}
              />

              <View style={styles.previewContent}>
                <NoteBlocksRenderer
                  content={content}
                  onOpenAttachment={handleOpenAttachment}
                />
              </View>
            </>
          ) : (
            <>
              <TextInput
                style={sharedStyles.titleInput}
                placeholder="Título de la nota..."
                placeholderTextColor={
                  colors.neutral.gray500
                }
                value={title}
                onChangeText={setTitle}
                maxLength={500}
              />

              <NoteEditorMeta
                selectedFolder={selectedFolder}
                selectedTags={selectedTags}
                isFavorite={isFavorite}
                isPinned={isPinned}
                isArchived={isArchived}
                onOpenFolderPicker={() =>
                  setFolderPickerVisible(true)
                }
                onOpenTagPicker={() =>
                  setTagPickerVisible(true)
                }
                onToggleFavorite={() =>
                  setIsFavorite((value) => !value)
                }
                onTogglePinned={() =>
                  setIsPinned((value) => !value)
                }
                onToggleArchived={() =>
                  setIsArchived((value) => !value)
                }
              />

              <NoteBlocksEditor
                value={content}
                onChange={setContent}
              />
            </>
          )}

          <NoteAttachmentsSection
            noteId={noteId}
            readOnly={isReadOnly}
            onAttachmentCreated={handleAttachmentCreated}
            onAttachmentDeleted={handleAttachmentDeleted}
          />

          <View style={{ height: 130 }} />
        </ScrollView>

        {!isReadOnly && (
          <TouchableOpacity
            style={styles.saveFab}
            onPress={() => {
              void handleSave();
            }}
            activeOpacity={0.8}
            disabled={status === 'saving'}
          >
            {status === 'saving' ? (
              <ActivityIndicator
                size="small"
                color={colors.neutral.white}
              />
            ) : (
              <Check
                size={19}
                color={colors.neutral.white}
              />
            )}

            <Text style={styles.saveFabText}>
              Guardar
            </Text>
          </TouchableOpacity>
        )}

        {!router.embedded && (
          <FloatingTabBar activeTab="home" />
        )}

        <FolderPickerModal
          visible={folderPickerVisible}
          folders={folders}
          selectedFolderId={folderId}
          onClose={() => setFolderPickerVisible(false)}
          onSelect={(nextFolderId) => {
            setFolderId(nextFolderId);
            setFolderPickerVisible(false);
          }}
        />

        <TagPickerModal
          visible={tagPickerVisible}
          tags={tags}
          selectedTagIds={tagIds}
          onClose={() => setTagPickerVisible(false)}
          onToggle={toggleTag}
        />

        <NoteActionsModal
          visible={actionsVisible}
          isInTrash={isInTrash}
          onClose={() => setActionsVisible(false)}
          onShare={() => {
            setActionsVisible(false);
            setShareModalVisible(true);
          }}
          onMoveToTrash={() => {
            setActionsVisible(false);
            handleMoveToTrash();
          }}
          onRestore={() => {
            setActionsVisible(false);
            void handleRestoreNote();
          }}
          onPermanentlyDelete={() => {
            setActionsVisible(false);
            handlePermanentlyDelete();
          }}
        />

        <NoteShareModal
          visible={shareModalVisible}
          noteId={noteId}
          noteTitle={title}
          onClose={() => setShareModalVisible(false)}
          onShared={() => {
            setShareModalVisible(false);
          }}
        />
      </View>
    </ScreenSafeArea>
  );
}


function NoteActionsModal({
  visible,
  isInTrash,
  onClose,
  onShare,
  onMoveToTrash,
  onRestore,
  onPermanentlyDelete,
}: {
  visible: boolean;
  isInTrash: boolean;
  onClose: () => void;
  onShare: () => void;
  onMoveToTrash: () => void;
  onRestore: () => void;
  onPermanentlyDelete: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Acciones de la nota
            </Text>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X
                size={19}
                color={colors.neutral.gray600}
              />
            </TouchableOpacity>
          </View>

          {isInTrash ? (
            <>
              <ActionOption
                icon={
                  <Undo2
                    size={19}
                    color={colors.brand.primary}
                  />
                }
                title="Restaurar nota"
                description="La nota volverá a tus notas activas."
                onPress={onRestore}
              />

              <ActionOption
                danger
                icon={
                  <Trash2
                    size={19}
                    color={colors.semantic.error}
                  />
                }
                title="Eliminar permanentemente"
                description="No podrás recuperar esta nota."
                onPress={onPermanentlyDelete}
              />
            </>
          ) : (
            <>
              <ActionOption
                icon={
                  <Share2
                    size={19}
                    color={colors.brand.primary}
                  />
                }
                title="Compartir nota"
                description="Enviar esta nota a otro usuario."
                onPress={onShare}
              />

              <ActionOption
                danger
                icon={
                  <Trash2
                    size={19}
                    color={colors.semantic.error}
                  />
                }
                title="Mover a papelera"
                description="Podrás restaurarla más adelante."
                onPress={onMoveToTrash}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}


function ActionOption({
  icon,
  title,
  description,
  danger = false,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.actionOption}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.actionOptionIcon,
          danger && styles.actionOptionIconDanger,
        ]}
      >
        {icon}
      </View>

      <View style={styles.actionOptionCopy}>
        <Text
          style={[
            styles.actionOptionTitle,
            danger && styles.actionOptionTitleDanger,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.actionOptionDescription}>
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}


function NoteEditorMeta({
  selectedFolder,
  selectedTags,
  isFavorite,
  isPinned,
  isArchived,
  onOpenFolderPicker,
  onOpenTagPicker,
  onToggleFavorite,
  onTogglePinned,
  onToggleArchived,
}: {
  selectedFolder: NoteFolder | null;
  selectedTags: NoteTag[];
  isFavorite: boolean;
  isPinned: boolean;
  isArchived: boolean;
  onOpenFolderPicker: () => void;
  onOpenTagPicker: () => void;
  onToggleFavorite: () => void;
  onTogglePinned: () => void;
  onToggleArchived: () => void;
}) {
  return (
    <View style={styles.metaContainer}>
      <View style={styles.metaActionsRow}>
        <MetaActionButton
          icon={
            <Folder
              size={15}
              color={colors.neutral.gray700}
            />
          }
          label={selectedFolder?.name || 'Sin carpeta'}
          onPress={onOpenFolderPicker}
        />

        <MetaActionButton
          icon={
            <Tag
              size={15}
              color={colors.neutral.gray700}
            />
          }
          label={
            selectedTags.length > 0
              ? String(selectedTags.length)
                + ' etiqueta'
                + (
                  selectedTags.length === 1
                    ? ''
                    : 's'
                )
              : 'Etiquetas'
          }
          onPress={onOpenTagPicker}
        />
      </View>

      <View style={styles.metaActionsRow}>
        <MetaToggleButton
          icon={
            <Star
              size={15}
              color={
                isFavorite
                  ? '#F59E0B'
                  : colors.neutral.gray600
              }
              fill={
                isFavorite
                  ? '#F59E0B'
                  : 'transparent'
              }
            />
          }
          label="Favorita"
          active={isFavorite}
          onPress={onToggleFavorite}
        />

        <MetaToggleButton
          icon={
            <Pin
              size={15}
              color={
                isPinned
                  ? colors.brand.primary
                  : colors.neutral.gray600
              }
            />
          }
          label="Fijar"
          active={isPinned}
          onPress={onTogglePinned}
        />

        <MetaToggleButton
          icon={
            <Archive
              size={15}
              color={
                isArchived
                  ? colors.brand.primary
                  : colors.neutral.gray600
              }
            />
          }
          label="Archivar"
          active={isArchived}
          onPress={onToggleArchived}
        />
      </View>

      {selectedTags.length > 0 && (
        <View style={styles.selectedTagsRow}>
          {selectedTags.map((tag) => (
            <View
              key={tag.id}
              style={[
                styles.selectedTag,
                {
                  borderColor: tag.color,
                  backgroundColor: tag.color + '15',
                },
              ]}
            >
              <Text
                style={[
                  styles.selectedTagText,
                  {
                    color: tag.color,
                  },
                ]}
              >
                {tag.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}


function NoteMetaReadOnly({
  folder,
  tags,
  isFavorite,
  isPinned,
  isArchived,
}: {
  folder: NoteFolder | null;
  tags: NoteTag[];
  isFavorite: boolean;
  isPinned: boolean;
  isArchived: boolean;
}) {
  const items = [
    folder
      ? {
        icon: Folder,
        label: folder.name,
      }
      : null,
    isFavorite
      ? {
        icon: Star,
        label: 'Favorita',
      }
      : null,
    isPinned
      ? {
        icon: Pin,
        label: 'Fijada',
      }
      : null,
    isArchived
      ? {
        icon: Archive,
        label: 'Archivada',
      }
      : null,
  ].filter(Boolean) as {
    icon: typeof Folder;
    label: string;
  }[];

  if (
    items.length === 0
    && tags.length === 0
  ) {
    return null;
  }

  return (
    <View style={styles.readOnlyMeta}>
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <View
            key={item.label}
            style={styles.readOnlyBadge}
          >
            <Icon
              size={13}
              color={colors.neutral.gray600}
            />

            <Text style={styles.readOnlyBadgeText}>
              {item.label}
            </Text>
          </View>
        );
      })}

      {tags.map((tag) => (
        <View
          key={tag.id}
          style={[
            styles.readOnlyBadge,
            {
              backgroundColor: tag.color + '15',
              borderColor: tag.color,
            },
          ]}
        >
          <Tag
            size={12}
            color={tag.color}
          />

          <Text
            style={[
              styles.readOnlyBadgeText,
              {
                color: tag.color,
              },
            ]}
          >
            {tag.name}
          </Text>
        </View>
      ))}
    </View>
  );
}


function MetaActionButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.metaActionButton}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {icon}

      <Text
        style={styles.metaActionText}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}


function MetaToggleButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.metaToggleButton,
        active && styles.metaToggleButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {icon}

      <Text
        style={[
          styles.metaToggleText,
          active && styles.metaToggleTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}


function FolderPickerModal({
  visible,
  folders,
  selectedFolderId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  folders: NoteFolder[];
  selectedFolderId: string | null;
  onClose: () => void;
  onSelect: (folderId: string | null) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Seleccionar carpeta
            </Text>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X
                size={19}
                color={colors.neutral.gray600}
              />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <FolderOption
              label="Sin carpeta"
              selected={selectedFolderId === null}
              onPress={() => onSelect(null)}
            />

            {folders.map((folder) => (
              <FolderOption
                key={folder.id}
                label={folder.name}
                selected={
                  selectedFolderId === folder.id
                }
                onPress={() => onSelect(folder.id)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


function FolderOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.modalOption}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Folder
        size={18}
        color={
          selected
            ? colors.brand.primary
            : colors.neutral.gray600
        }
      />

      <Text
        style={[
          styles.modalOptionText,
          selected && styles.modalOptionTextSelected,
        ]}
      >
        {label}
      </Text>

      {selected && (
        <Check
          size={18}
          color={colors.brand.primary}
        />
      )}
    </TouchableOpacity>
  );
}


function TagPickerModal({
  visible,
  tags,
  selectedTagIds,
  onClose,
  onToggle,
}: {
  visible: boolean;
  tags: NoteTag[];
  selectedTagIds: string[];
  onClose: () => void;
  onToggle: (tag: NoteTag) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Etiquetas de la nota
            </Text>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X
                size={19}
                color={colors.neutral.gray600}
              />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {tags.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Tag
                  size={26}
                  color={colors.neutral.gray500}
                />

                <Text style={styles.modalEmptyText}>
                  No hay etiquetas disponibles. Crea una
                  desde la pantalla principal de notas.
                </Text>
              </View>
            ) : (
              tags.map((tag) => {
                const selected = selectedTagIds.includes(
                  tag.id,
                );

                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={styles.modalOption}
                    onPress={() => onToggle(tag)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.tagColorDot,
                        {
                          backgroundColor: tag.color,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.modalOptionText,
                        selected
                          && styles.modalOptionTextSelected,
                      ]}
                    >
                      {tag.name}
                    </Text>

                    {selected && (
                      <Check
                        size={18}
                        color={colors.brand.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  centerStateText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 8,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.brand.primary,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerActions: {
    minWidth: 100,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sharedHeaderText: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.semantic.error + '40',
    backgroundColor: colors.semantic.error + '12',
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: colors.semantic.error,
    lineHeight: 17,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  previewTitle: {
    fontSize: 23,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 14,
  },
  previewContent: {
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.xl,
    backgroundColor: colors.neutral.white,
  },
  metaContainer: {
    gap: 9,
    marginBottom: 18,
  },
  metaActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaActionButton: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.neutral.white,
  },
  metaActionText: {
    maxWidth: 160,
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  metaToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.md,
    paddingVertical: 7,
    paddingHorizontal: 9,
    backgroundColor: colors.neutral.white,
  },
  metaToggleButtonActive: {
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primary + '12',
  },
  metaToggleText: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  metaToggleTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  selectedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedTag: {
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  selectedTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  readOnlyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 14,
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: radii.full,
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: colors.neutral.white,
  },
  readOnlyBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral.gray700,
  },
  saveFab: {
    position: 'absolute',
    right: 20,
    bottom: 105,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 24,
    paddingHorizontal: 18,
    backgroundColor: colors.brand.primary,
    shadowColor: colors.brand.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  saveFabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.white,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(26, 26, 46, 0.35)',
  },
  modalSheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.neutral.white,
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  modalOptionTextSelected: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  modalEmpty: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 36,
    gap: 10,
  },
  modalEmptyText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 19,
  },
  tagColorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  actionOptionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.brand.primary + '12',
  },
  actionOptionIconDanger: {
    backgroundColor: colors.semantic.error + '12',
  },
  actionOptionCopy: {
    flex: 1,
  },
  actionOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  actionOptionTitleDanger: {
    color: colors.semantic.error,
  },
  actionOptionDescription: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
});