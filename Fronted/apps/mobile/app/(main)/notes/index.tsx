import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useNavigation,
} from 'expo-router';
import {
  ChevronLeft,
  FolderInput,
  FolderPlus,
  Plus,
  RefreshCw,
  Tags,
  X,
} from 'lucide-react-native';
import {
  colors,
  radii,
  spacing,
} from '@beeapp/design-system';
import {
  createNoteFolder,
  createNoteTag,
  deleteNoteFolder,
  deleteNoteTag,
  hideReceivedNoteShare,
  moveNoteFolder,
  renameNoteFolder,
  updateNoteTag,
} from '@beeapp/api-client';
import type {
  NoteFolder,
} from '@beeapp/shared-types';

import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import {
  useModuleNav,
} from '../../../src/components/embedded/EmbeddedNavContext';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import ViewModeToggle, {
  type ViewMode,
} from '../../../src/components/layout/ViewModeToggle';
import ModuleNotificationBell from '../../../src/components/ModuleNotificationBell';
import NoteCategoryGrid from '../../../src/components/notes/NoteCategoryGrid';
import CreateNoteCategoryModal from '../../../src/components/notes/CreateNoteCategoryModal';
import NoteEntityActionModal from '../../../src/components/notes/NoteEntityActionModal';
import NoteEntityNameModal from '../../../src/components/notes/NoteEntityNameModal';
import NotesListView, {
  type NotesFilter,
} from '../../../src/components/notes/NotesListView';
import {
  notesListStyles as styles,
} from '../../../src/components/notes/notesListStyles';
import {
  getValidSessionCredentials,
} from '../../../src/services/authSession';
import {
  getFixedNotesHomeItems,
  getFixedViewNotes,
  getHomeItemNoteCount,
  mapFolderToHomeItem,
  mapTagToHomeItem,
  mapTemplateToHomeItem,
  sortNotesByUpdatedAt,
  type NoteListItem,
  type NotesFixedViewId,
  type NotesHomeItem,
} from '../../../src/services/notesService';
import {
  useNotes,
} from '../../../src/hooks/useNotes';


type HomeSection =
  | 'folders'
  | 'tags';


type NameModalMode =
  | 'create-folder'
  | 'create-tag'
  | 'rename-folder'
  | 'rename-tag'
  | null;


function isFixedView(
  item: NotesHomeItem,
): item is NotesHomeItem & {
  id: NotesFixedViewId;
  kind: 'fixed';
} {
  return item.kind === 'fixed';
}


function getFolderParentId(
  folderId: string,
  folders: NoteFolder[],
): string | null {
  return folders.find(
    (folder) => folder.id === folderId,
  )?.parent_id || null;
}


export default function NotesListScreen() {
  const router = useModuleNav();
  const navigation = useNavigation();

  const {
    notes,
    folders,
    tags,
    templates,
    loading,
    refreshing,
    error,
    loadNotes,
  } = useNotes();

  const [selectedItem, setSelectedItem] =
    useState<NotesHomeItem | null>(null);

  const [folderPath, setFolderPath] = useState<
    string[]
  >([]);

  const [activeFilter, setActiveFilter] =
    useState<NotesFilter>('all');

  const [viewMode, setViewMode] =
    useState<ViewMode>('list');

  const [activeEntity, setActiveEntity] =
    useState<NotesHomeItem | null>(null);

  const [entityActionsVisible, setEntityActionsVisible] =
    useState(false);

  const [nameModalMode, setNameModalMode] =
    useState<NameModalMode>(null);

  const [templatePickerVisible, setTemplatePickerVisible] =
    useState(false);

  const [moveFolderVisible, setMoveFolderVisible] =
    useState(false);

  const [submitting, setSubmitting] = useState(false);


  useEffect(() => {
    const unsubscribe = navigation.addListener(
      'focus',
      () => {
        void loadNotes(true);
      },
    );

    return unsubscribe;
  }, [loadNotes, navigation]);


  const fixedItems = useMemo(
    () => getFixedNotesHomeItems(),
    [],
  );

  const currentFolderId =
    folderPath.length > 0
      ? folderPath[folderPath.length - 1]
      : null;

  const currentFolder = useMemo(
    () =>
      currentFolderId
        ? folders.find(
          (folder) =>
            folder.id === currentFolderId,
        ) || null
        : null,
    [currentFolderId, folders],
  );

  const visibleFolderItems = useMemo(
    () =>
      folders
        .filter(
          (folder) =>
            folder.parent_id === currentFolderId,
        )
        .map(mapFolderToHomeItem),
    [currentFolderId, folders],
  );

  const tagItems = useMemo(
    () => tags.map(mapTagToHomeItem),
    [tags],
  );

  const templateItems = useMemo(
    () => templates.map(mapTemplateToHomeItem),
    [templates],
  );


  const currentNotes = useMemo(() => {
    if (!selectedItem) {
      return [];
    }

    if (isFixedView(selectedItem)) {
      return getFixedViewNotes(
        selectedItem.id,
        notes,
      );
    }

    if (selectedItem.kind === 'folder') {
      return notes.filter(
        (note) =>
          note.folderId === selectedItem.folderId
          && !note.deletedAt
          && !note.isShared,
      );
    }

    if (selectedItem.kind === 'tag') {
      return notes.filter(
        (note) =>
          note.tagIds.includes(
            selectedItem.tagId || '',
          )
          && !note.deletedAt
          && !note.isShared,
      );
    }

    return [];
  }, [notes, selectedItem]);


  const filteredNotes = useMemo(() => {
    if (!selectedItem) {
      return [];
    }

    return currentNotes.filter((note) => {
      if (activeFilter === 'all') {
        return true;
      }

      if (activeFilter === 'favorite') {
        return note.isFavorite;
      }

      if (activeFilter === 'recent') {
        const limit = new Date();

        limit.setDate(limit.getDate() - 7);

        return new Date(note.updatedAt) >= limit;
      }

      if (activeFilter === 'trash') {
        return Boolean(note.deletedAt);
      }

      return true;
    });
  }, [
    activeFilter,
    currentNotes,
    selectedItem,
  ]);


  const sortedNotes = useMemo(
    () => sortNotesByUpdatedAt(filteredNotes),
    [filteredNotes],
  );


  const goBack = () => {
    if (selectedItem?.kind === 'folder') {
      const parentId = getFolderParentId(
        selectedItem.folderId || '',
        folders,
      );

      if (parentId) {
        const parentFolder = folders.find(
          (folder) => folder.id === parentId,
        );

        if (parentFolder) {
          setSelectedItem(
            mapFolderToHomeItem(parentFolder),
          );

          setFolderPath((currentPath) =>
            currentPath.slice(0, -1),
          );

          return;
        }
      }
    }

    if (selectedItem) {
      setSelectedItem(null);
      setFolderPath([]);
      setActiveFilter('all');
      return;
    }

    router.back();
  };


  const openNote = (
    note: NoteListItem,
  ) => {
    router.push({
      pathname: '/(main)/notes/edit',
      params: {
        id: note.id,
        shared: note.isShared
          ? 'true'
          : 'false',
        shareId: note.shareId || '',
      },
    });
  };


  const handleToggleFavorite = async (
    noteId: string,
    event: unknown,
  ) => {
    if (
      event
      && typeof event === 'object'
      && 'stopPropagation' in event
      && typeof event.stopPropagation === 'function'
    ) {
      event.stopPropagation();
    }

    const note = notes.find(
      (item) => item.id === noteId,
    );

    if (note) {
      openNote(note);
    }
  };


  const handleOpenItem = (
    item: NotesHomeItem,
  ) => {
    if (item.kind === 'template') {
      router.push({
        pathname: '/(main)/notes/edit',
        params: {
          templateId: item.templateId || '',
        },
      });

      return;
    }

    if (item.kind === 'folder') {
      setFolderPath((currentPath) => [
        ...currentPath,
        item.folderId || '',
      ]);
    }

    setSelectedItem(item);

    setActiveFilter(
      item.id === 'trash'
        ? 'trash'
        : 'all',
    );
  };


  const handleOpenEntityActions = (
    entity: NotesHomeItem,
  ) => {
    setActiveEntity(entity);
    setEntityActionsVisible(true);
  };


  const handleCreateEntity = async (
    draft: {
      name: string;
      iconKey: string;
      color: string;
    },
  ) => {
    try {
      setSubmitting(true);

      const auth =
        await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      if (nameModalMode === 'create-folder') {
        await createNoteFolder(auth, {
          name: draft.name,
          parent_id: currentFolderId,
        });
      }

      if (nameModalMode === 'create-tag') {
        await createNoteTag(auth, {
          name: draft.name,
          icon: draft.iconKey,
          color: draft.color,
        });
      }

      setNameModalMode(null);

      await loadNotes(true);
    } catch (createError) {
      Alert.alert(
        'No fue posible crear',
        createError instanceof Error
          ? createError.message
          : 'Intenta nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };


  const handleRenameEntity = async (
    name: string,
  ) => {
    if (!activeEntity) {
      return;
    }

    try {
      setSubmitting(true);

      const auth =
        await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      if (activeEntity.kind === 'folder') {
        await renameNoteFolder(
          auth,
          activeEntity.folderId || '',
          { name },
        );
      }

      if (activeEntity.kind === 'tag') {
        await updateNoteTag(
          auth,
          activeEntity.tagId || '',
          { name },
        );
      }

      setNameModalMode(null);
      setActiveEntity(null);

      await loadNotes(true);
    } catch (renameError) {
      Alert.alert(
        'No fue posible renombrar',
        renameError instanceof Error
          ? renameError.message
          : 'Intenta nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };


  const handleDeleteEntity = () => {
    if (!activeEntity) {
      return;
    }

    const entity = activeEntity;

    Alert.alert(
      `Eliminar ${
        entity.kind === 'folder'
          ? 'carpeta'
          : 'etiqueta'
      }`,
      entity.kind === 'folder'
        ? (
          `¿Eliminar “${entity.name}”? Las notas `
          + 'asociadas podrían quedar sin carpeta.'
        )
        : (
          `¿Eliminar la etiqueta “${entity.name}”? `
          + 'Se quitará de las notas que la usan.'
        ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void confirmDeleteEntity(entity);
          },
        },
      ],
    );
  };


  const confirmDeleteEntity = async (
    entity: NotesHomeItem,
  ) => {
    try {
      setSubmitting(true);

      const auth =
        await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      if (entity.kind === 'folder') {
        await deleteNoteFolder(
          auth,
          entity.folderId || '',
        );

        if (
          selectedItem?.folderId
          === entity.folderId
        ) {
          setSelectedItem(null);
          setFolderPath([]);
        }
      }

      if (entity.kind === 'tag') {
        await deleteNoteTag(
          auth,
          entity.tagId || '',
        );

        if (
          selectedItem?.tagId
          === entity.tagId
        ) {
          setSelectedItem(null);
        }
      }

      setEntityActionsVisible(false);
      setActiveEntity(null);

      await loadNotes(true);
    } catch (deleteError) {
      Alert.alert(
        'No fue posible eliminar',
        deleteError instanceof Error
          ? deleteError.message
          : 'Intenta nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };


  const handleMoveFolder = async (
    parentId: string | null,
  ) => {
    if (
      !activeEntity
      || activeEntity.kind !== 'folder'
    ) {
      return;
    }

    try {
      setSubmitting(true);

      const auth =
        await getValidSessionCredentials();

      if (!auth) {
        throw new Error(
          'Tu sesión expiró. Inicia sesión nuevamente.',
        );
      }

      await moveNoteFolder(
        auth,
        activeEntity.folderId || '',
        {
          parent_id: parentId,
        },
      );

      setMoveFolderVisible(false);
      setEntityActionsVisible(false);
      setActiveEntity(null);

      await loadNotes(true);
    } catch (moveError) {
      Alert.alert(
        'No fue posible mover la carpeta',
        moveError instanceof Error
          ? moveError.message
          : 'Intenta nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };


  const handleHideReceivedShare = (
    note: NoteListItem,
  ) => {
    if (!note.shareId) {
      return;
    }

    Alert.alert(
      'Ocultar nota compartida',
      (
        'La nota dejará de aparecer en “Compartidas”. '
        + 'Podrás volver a verla cuando exista una '
        + 'vista de compartidas ocultas.'
      ),
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Ocultar',
          style: 'destructive',
          onPress: () => {
            void confirmHideReceivedShare(note);
          },
        },
      ],
    );
  };


  const confirmHideReceivedShare = async (
    note: NoteListItem,
  ) => {
    if (!note.shareId) {
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

      await hideReceivedNoteShare(
        auth,
        note.shareId,
      );

      await loadNotes(true);
    } catch (hideError) {
      Alert.alert(
        'No fue posible ocultar la nota',
        hideError instanceof Error
          ? hideError.message
          : 'Intenta nuevamente.',
      );
    }
  };


  const startNewNote = () => {
    setTemplatePickerVisible(true);
  };


  const renderHomeSection = (
    title: string,
    section: HomeSection,
    items: NotesHomeItem[],
    options: {
      canCreate?: boolean;
      emptyMessage: string;
    },
  ) => (
    <View style={styles.homeSection}>
      <View style={styles.homeSectionHeader}>
        <Text style={styles.homeSectionTitle}>
          {title}
        </Text>

        {options.canCreate && (
          <TouchableOpacity
            style={styles.sectionCreateButton}
            onPress={() => {
              setNameModalMode(
                section === 'folders'
                  ? 'create-folder'
                  : 'create-tag',
              );
            }}
            activeOpacity={0.75}
            disabled={submitting}
          >
            {section === 'folders' ? (
              <FolderPlus
                size={17}
                color={colors.brand.primary}
              />
            ) : (
              <Tags
                size={17}
                color={colors.brand.primary}
              />
            )}

            <Text style={styles.sectionCreateText}>
              Nuevo
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length > 0 ? (
        <NoteCategoryGrid
          categories={items}
          countOf={(item) =>
            getHomeItemNoteCount(item, notes)
          }
          onOpen={handleOpenItem}
          onOpenActions={handleOpenEntityActions}
        />
      ) : (
        <View style={styles.homeEmptySection}>
          <Text style={styles.homeEmptySectionText}>
            {options.emptyMessage}
          </Text>
        </View>
      )}
    </View>
  );


  const screenTitle = selectedItem
    ? selectedItem.name
    : currentFolder
      ? currentFolder.name
      : 'Mis Notas';


  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeftCol}>
            {(selectedItem || router.canGoBack) && (
              <TouchableOpacity
                onPress={goBack}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <ChevronLeft
                  size={24}
                  color={colors.neutral.text}
                />
              </TouchableOpacity>
            )}

            <Text style={styles.headerTitle}>
              {screenTitle}
            </Text>
          </View>

          <View style={styles.headerRightCol}>
            <ModuleNotificationBell moduleId="notes" />

            {selectedItem ? (
              <ViewModeToggle
                mode={viewMode}
                onChange={setViewMode}
              />
            ) : (
              <TouchableOpacity
                onPress={() => void loadNotes(true)}
                style={styles.backBtn}
                activeOpacity={0.7}
                accessibilityLabel="Actualizar notas"
              >
                <RefreshCw
                  size={19}
                  color={colors.neutral.text}
                />
              </TouchableOpacity>
            )}

            {router.embedded && (
              <TouchableOpacity
                onPress={startNewNote}
                style={styles.headerActionBtn}
                activeOpacity={0.8}
              >
                <Plus
                  size={18}
                  color={colors.neutral.white}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color={colors.brand.primary}
            />

            <Text style={styles.centerStateText}>
              Cargando tus notas...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <Text style={styles.errorStateTitle}>
              No fue posible cargar tus notas
            </Text>

            <Text style={styles.errorStateText}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void loadNotes(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        ) : selectedItem ? (
          <View style={styles.selectedContent}>
            {selectedItem.kind === 'folder'
              && visibleFolderItems.length > 0 && (
              <View style={styles.subfolderSection}>
                <View style={styles.subfolderHeader}>
                  <Text style={styles.subfolderTitle}>
                    Subcarpetas
                  </Text>

                  <TouchableOpacity
                    style={styles.subfolderAddButton}
                    onPress={() =>
                      setNameModalMode(
                        'create-folder',
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <FolderPlus
                      size={16}
                      color={colors.brand.primary}
                    />

                    <Text
                      style={styles.subfolderAddText}
                    >
                      Nueva
                    </Text>
                  </TouchableOpacity>
                </View>

                <NoteCategoryGrid
                  categories={visibleFolderItems}
                  countOf={(item) =>
                    getHomeItemNoteCount(item, notes)
                  }
                  onOpen={handleOpenItem}
                  onOpenActions={
                    handleOpenEntityActions
                  }
                />
              </View>
            )}

            <NotesListView
              notes={sortedNotes}
              viewMode={viewMode}
              activeFilter={activeFilter}
              onChangeFilter={setActiveFilter}
              onOpen={(noteId) => {
                const note = sortedNotes.find(
                  (item) => item.id === noteId,
                );

                if (note) {
                  openNote(note);
                }
              }}
              onToggleFavorite={(noteId, event) => {
                const note = sortedNotes.find(
                  (item) => item.id === noteId,
                );

                if (
                  note?.isShared
                  && selectedItem?.id === 'shared'
                ) {
                  if (
                    event
                    && typeof event === 'object'
                    && 'stopPropagation' in event
                    && typeof event.stopPropagation === 'function'
                  ) {
                    event.stopPropagation();
                  }

                  handleHideReceivedShare(note);
                  return;
                }

                void handleToggleFavorite(
                  noteId,
                  event,
                );
              }}
            />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() =>
                  void loadNotes(true)
                }
                tintColor={colors.brand.primary}
              />
            }
          >
            {renderHomeSection(
              'Vistas',
              'folders',
              fixedItems,
              {
                emptyMessage:
                  'No hay vistas disponibles.',
              },
            )}

            {renderHomeSection(
              'Carpetas',
              'folders',
              visibleFolderItems,
              {
                canCreate: true,
                emptyMessage:
                  (
                    'Aún no tienes carpetas. Crea una '
                    + 'para organizar tus notas.'
                  ),
              },
            )}

            {renderHomeSection(
              'Etiquetas',
              'tags',
              tagItems,
              {
                canCreate: true,
                emptyMessage:
                  (
                    'Aún no tienes etiquetas. Crea una '
                    + 'para clasificar tus notas.'
                  ),
              },
            )}

            {renderHomeSection(
              'Plantillas',
              'tags',
              templateItems,
              {
                emptyMessage:
                  (
                    'No hay plantillas disponibles '
                    + 'en este momento.'
                  ),
              },
            )}

            <View style={styles.homeBottomSpacer} />
          </ScrollView>
        )}

        {!router.embedded && (
          <TouchableOpacity
            style={styles.createFab}
            onPress={startNewNote}
            activeOpacity={0.8}
          >
            <Plus
              size={20}
              color={colors.neutral.white}
              style={{ marginRight: 6 }}
            />

            <Text style={styles.createFabText}>
              Nueva Nota
            </Text>
          </TouchableOpacity>
        )}

        <CreateNoteCategoryModal
          visible={false}
          onCreate={() => undefined}
          onClose={() => undefined}
        />

        <NoteEntityActionModal
          visible={entityActionsVisible}
          entity={activeEntity}
          onClose={() => {
            if (!submitting) {
              setEntityActionsVisible(false);
              setActiveEntity(null);
            }
          }}
          onRename={() => {
            if (!activeEntity) {
              return;
            }

            setEntityActionsVisible(false);

            setNameModalMode(
              activeEntity.kind === 'folder'
                ? 'rename-folder'
                : 'rename-tag',
            );
          }}
          onMove={() => {
            setEntityActionsVisible(false);
            setMoveFolderVisible(true);
          }}
          onDelete={handleDeleteEntity}
        />

        <NoteEntityNameModal
          visible={Boolean(nameModalMode)}
          title={
            nameModalMode === 'create-folder'
              ? 'Nueva carpeta'
              : nameModalMode === 'create-tag'
                ? 'Nueva etiqueta'
                : nameModalMode === 'rename-folder'
                  ? 'Renombrar carpeta'
                  : 'Renombrar etiqueta'
          }
          initialValue={
            nameModalMode === 'rename-folder'
            || nameModalMode === 'rename-tag'
              ? activeEntity?.name || ''
              : ''
          }
          placeholder={
            nameModalMode === 'create-folder'
            || nameModalMode === 'rename-folder'
              ? 'Nombre de carpeta'
              : 'Nombre de etiqueta'
          }
          submitLabel={
            nameModalMode === 'create-folder'
            || nameModalMode === 'create-tag'
              ? 'Crear'
              : 'Guardar'
          }
          submitting={submitting}
          onClose={() => {
            if (!submitting) {
              setNameModalMode(null);
            }
          }}
          onSubmit={(name) => {
            if (
              nameModalMode === 'rename-folder'
              || nameModalMode === 'rename-tag'
            ) {
              void handleRenameEntity(name);
              return;
            }

            if (nameModalMode === 'create-folder') {
              void handleCreateEntity({
                name,
                iconKey: 'folder',
                color: '#F57C00',
              });

              return;
            }

            if (nameModalMode === 'create-tag') {
              void handleCreateEntity({
                name,
                iconKey: 'tag',
                color: '#8B5CF6',
              });
            }
          }}
        />

        <TemplatePickerModal
          visible={templatePickerVisible}
          templates={templateItems}
          onClose={() =>
            setTemplatePickerVisible(false)
          }
          onCreateBlank={() => {
            setTemplatePickerVisible(false);

            router.push('/(main)/notes/edit');
          }}
          onSelectTemplate={(item) => {
            setTemplatePickerVisible(false);

            router.push({
              pathname: '/(main)/notes/edit',
              params: {
                templateId: item.templateId || '',
              },
            });
          }}
        />

        <MoveFolderPickerModal
          visible={moveFolderVisible}
          folders={folders}
          folderToMoveId={activeEntity?.folderId || null}
          submitting={submitting}
          onClose={() => {
            if (!submitting) {
              setMoveFolderVisible(false);
            }
          }}
          onSelect={(parentId) => {
            void handleMoveFolder(parentId);
          }}
        />

        {!router.embedded && (
          <FloatingTabBar activeTab="home" />
        )}
      </View>
    </ScreenSafeArea>
  );
}


function TemplatePickerModal({
  visible,
  templates,
  onClose,
  onCreateBlank,
  onSelectTemplate,
}: {
  visible: boolean;
  templates: NotesHomeItem[];
  onClose: () => void;
  onCreateBlank: () => void;
  onSelectTemplate: (
    item: NotesHomeItem,
  ) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />

        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>
              Nueva nota
            </Text>

            <TouchableOpacity
              style={modalStyles.closeButton}
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
            <TouchableOpacity
              style={modalStyles.option}
              onPress={onCreateBlank}
              activeOpacity={0.75}
            >
              <View
                style={[
                  modalStyles.optionIcon,
                  {
                    backgroundColor:
                      colors.brand.primary + '15',
                  },
                ]}
              >
                <Plus
                  size={19}
                  color={colors.brand.primary}
                />
              </View>

              <View style={modalStyles.optionCopy}>
                <Text style={modalStyles.optionTitle}>
                  Nota en blanco
                </Text>

                <Text
                  style={modalStyles.optionDescription}
                >
                  Empieza con un documento vacío.
                </Text>
              </View>
            </TouchableOpacity>

            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={modalStyles.option}
                onPress={() =>
                  onSelectTemplate(template)
                }
                activeOpacity={0.75}
              >
                <View
                  style={[
                    modalStyles.optionIcon,
                    {
                      backgroundColor:
                        template.color + '1A',
                    },
                  ]}
                >
                  <Tags
                    size={18}
                    color={template.color}
                  />
                </View>

                <View style={modalStyles.optionCopy}>
                  <Text style={modalStyles.optionTitle}>
                    {template.name}
                  </Text>

                  <Text
                    style={modalStyles.optionDescription}
                  >
                    Usar plantilla
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


function MoveFolderPickerModal({
  visible,
  folders,
  folderToMoveId,
  submitting,
  onClose,
  onSelect,
}: {
  visible: boolean;
  folders: NoteFolder[];
  folderToMoveId: string | null;
  submitting: boolean;
  onClose: () => void;
  onSelect: (parentId: string | null) => void;
}) {
  const availableFolders = folders.filter(
    (folder) => folder.id !== folderToMoveId,
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={modalStyles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
          disabled={submitting}
        />

        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>
              Mover carpeta
            </Text>

            <TouchableOpacity
              style={modalStyles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
              disabled={submitting}
            >
              <X
                size={19}
                color={colors.neutral.gray600}
              />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <TouchableOpacity
              style={modalStyles.option}
              onPress={() => onSelect(null)}
              activeOpacity={0.75}
              disabled={submitting}
            >
              <View
                style={[
                  modalStyles.optionIcon,
                  {
                    backgroundColor:
                      colors.neutral.gray100,
                  },
                ]}
              >
                <FolderInput
                  size={18}
                  color={colors.neutral.gray700}
                />
              </View>

              <View style={modalStyles.optionCopy}>
                <Text style={modalStyles.optionTitle}>
                  Carpeta principal
                </Text>

                <Text
                  style={modalStyles.optionDescription}
                >
                  Sin carpeta superior.
                </Text>
              </View>
            </TouchableOpacity>

            {availableFolders.map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={modalStyles.option}
                onPress={() => onSelect(folder.id)}
                activeOpacity={0.75}
                disabled={submitting}
              >
                <View
                  style={[
                    modalStyles.optionIcon,
                    {
                      backgroundColor: '#F57C001A',
                    },
                  ]}
                >
                  <FolderPlus
                    size={18}
                    color="#F57C00"
                  />
                </View>

                <View style={modalStyles.optionCopy}>
                  <Text style={modalStyles.optionTitle}>
                    {folder.name}
                  </Text>

                  <Text
                    style={modalStyles.optionDescription}
                  >
                    Mover dentro de esta carpeta.
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(26, 26, 46, 0.35)',
  },
  sheet: {
    maxHeight: '72%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.neutral.white,
    paddingBottom: spacing.lg,
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  closeButton: {
    padding: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  optionDescription: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray600,
  },
});