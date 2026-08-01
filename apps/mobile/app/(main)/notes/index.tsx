import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useNavigation } from 'expo-router';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Plus, FolderPlus } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import ViewModeToggle, { ViewMode } from '../../../src/components/layout/ViewModeToggle';
import ModuleNotificationBell from '../../../src/components/ModuleNotificationBell';
import NoteCategoryGrid from '../../../src/components/notes/NoteCategoryGrid';
import CreateNoteCategoryModal from '../../../src/components/notes/CreateNoteCategoryModal';
import NotesListView, { NotesFilter } from '../../../src/components/notes/NotesListView';
import { notesListStyles as styles } from '../../../src/components/notes/notesListStyles';
import { MOCK_MODULE_NOTES, NoteItem } from '../../../src/mocks/notesModule';
import {
  FIXED_NOTE_CATEGORIES,
  MOCK_NOTE_CATEGORIES,
  NoteCategory,
} from '../../../src/mocks/noteCategories';
import PinLockModal from '../../../src/components/security/PinLockModal';
import { getProtectedIds, isProtected } from '../../../src/stores/pinStore';

export default function NotesListScreen() {
  const router = useModuleNav();

  // Vista principal: null = cuadrícula de categorías; con valor = lista filtrada
  const [category, setCategory] = useState<NoteCategory | null>(null);
  const [categories, setCategories] = useState<NoteCategory[]>([
    ...FIXED_NOTE_CATEGORIES,
    ...MOCK_NOTE_CATEGORIES,
  ]);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [activeFilter, setActiveFilter] = useState<NotesFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // PIN protection (mock, global store)
  const [protectedIds, setProtectedIds] = useState<string[]>(getProtectedIds());
  const navigation = useNavigation();

  // Protection is toggled inside the note: refresh the indicators on return
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () =>
      setProtectedIds([...getProtectedIds()])
    );
    return unsubscribe;
  }, [navigation]);
  const [lockedNoteId, setLockedNoteId] = useState<string | null>(null);

  const [notes, setNotes] = useState<NoteItem[]>(MOCK_MODULE_NOTES);

  const handleToggleFavorite = (id: string, e: any) => {
    e.stopPropagation();
    setNotes(notes.map((note) => (note.id === id ? { ...note, isFavorite: !note.isFavorite } : note)));
  };

  /** Notas que pertenecen a una categoría, sin aplicar todavía los chips */
  const notesOf = (target: NoteCategory) =>
    notes.filter((note) => {
      if (target.id === 'all') return note.folder === 'notes';
      if (target.id === 'protected') return protectedIds.includes(note.id);
      return note.categoryId === target.id && note.folder === 'notes';
    });

  const filteredNotes = category
    ? notesOf(category).filter((note) => {
        if (activeFilter === 'trash') return note.folder === 'trash';
        if (note.folder !== 'notes') return false;
        if (activeFilter === 'favorite') return note.isFavorite;
        if (activeFilter === 'reminder') return !!note.reminderDate;
        if (activeFilter === 'recent') {
          const limit = new Date();
          limit.setDate(limit.getDate() - 2);
          return new Date(note.updatedAt) >= limit;
        }
        return true;
      })
    : [];

  // Más recientes primero, por fecha de modificación
  const sortedNotes = [...filteredNotes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const openNote = (noteId: string) => {
    router.push({ pathname: '/(main)/notes/edit', params: { id: noteId } });
  };

  const handleOpenNote = (noteId: string) => {
    if (isProtected(noteId)) {
      setLockedNoteId(noteId);
      return;
    }
    openNote(noteId);
  };

  const goBack = () => {
    if (category) {
      setCategory(null);
      setActiveFilter('all');
      return;
    }
    router.back();
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeftCol}>
            {(category || router.canGoBack) && (
              <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
                <ChevronLeft size={24} color={colors.neutral.text} />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>{category ? category.name : 'Mis Notas'}</Text>
          </View>

          <View style={styles.headerRightCol}>
            <ModuleNotificationBell moduleId="notes" />

            {category ? (
              <ViewModeToggle mode={viewMode} onChange={setViewMode} />
            ) : (
              <TouchableOpacity
                onPress={() => setCreatingCategory(true)}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <FolderPlus size={20} color={colors.neutral.text} />
              </TouchableOpacity>
            )}

            {router.embedded && (
              <TouchableOpacity
                onPress={() => router.push('/(main)/notes/edit')}
                style={styles.headerActionBtn}
                activeOpacity={0.8}
              >
                <Plus size={18} color={colors.neutral.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {category ? (
          <NotesListView
            notes={sortedNotes}
            protectedIds={protectedIds}
            viewMode={viewMode}
            activeFilter={activeFilter}
            onChangeFilter={setActiveFilter}
            onOpen={handleOpenNote}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : (
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <NoteCategoryGrid
              categories={categories}
              countOf={(item) => notesOf(item).length}
              onOpen={(item) => {
                setCategory(item);
                setActiveFilter('all');
              }}
              onRemove={(id) => setCategories(categories.filter((item) => item.id !== id))}
            />
            <View style={{ height: 120 }} />
          </ScrollView>
        )}

        {!router.embedded && (
          <TouchableOpacity
            style={styles.createFab}
            onPress={() => router.push('/(main)/notes/edit')}
            activeOpacity={0.8}
          >
            <Plus size={20} color={colors.neutral.white} style={{ marginRight: 6 }} />
            <Text style={styles.createFabText}>Nueva Nota</Text>
          </TouchableOpacity>
        )}

        <CreateNoteCategoryModal
          visible={creatingCategory}
          onCreate={(draft) => {
            setCategories([...categories, { ...draft, id: `cat_${Date.now().toString(36)}` }]);
            setCreatingCategory(false);
          }}
          onClose={() => setCreatingCategory(false)}
        />

        <PinLockModal
          visible={!!lockedNoteId}
          itemName={notes.find((n) => n.id === lockedNoteId)?.title}
          onClose={() => setLockedNoteId(null)}
          onSuccess={() => {
            const id = lockedNoteId;
            setLockedNoteId(null);
            if (id) openNote(id);
          }}
        />

        {!router.embedded && <FloatingTabBar activeTab="home" />}
      </View>
    </ScreenSafeArea>
  );
}
