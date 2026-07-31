import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useNavigation } from 'expo-router';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Plus, FolderOpen, ArrowUpDown } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import NoteListRow from '../../../src/components/notes/NoteListRow';
import NotesGridView from '../../../src/components/notes/NotesGridView';
import ViewModeToggle, { ViewMode } from '../../../src/components/layout/ViewModeToggle';
import { notesListStyles as styles } from '../../../src/components/notes/notesListStyles';
import { MOCK_MODULE_NOTES, NoteItem } from '../../../src/mocks/notesModule';
import PinLockModal from '../../../src/components/security/PinLockModal';
import { getProtectedIds, isProtected } from '../../../src/stores/pinStore';

export default function NotesListScreen() {
  const router = useModuleNav();

  // Layout states
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'reminder' | 'favorite' | 'trash'>('all');
  // Search moved to the global Home search bar: the module keeps the filter dormant
  const [searchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'updated' | 'created' | 'alpha'>('updated');
  const [swipeActiveId, setSwipeActiveId] = useState<string | null>(null);
  // List by default; the grid is an adaptive 2/3-column layout
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // PIN protection (mock, global store)
  const [protectedIds, setProtectedIds] = useState<string[]>(getProtectedIds());
  const navigation = useNavigation();

  // Protection is toggled inside the note: refresh the indicators on return
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => setProtectedIds([...getProtectedIds()]));
    return unsubscribe;
  }, [navigation]);
  const [lockedNoteId, setLockedNoteId] = useState<string | null>(null);

  // Mock Notes list data
  const [notes, setNotes] = useState<NoteItem[]>(MOCK_MODULE_NOTES);

  const handleToggleFavorite = (id: string, e: any) => {
    e.stopPropagation();
    setNotes(
      notes.map((note) =>
        note.id === id ? { ...note, isFavorite: !note.isFavorite } : note
      )
    );
  };

  const handleDeleteNote = (id: string, e: any) => {
    e.stopPropagation();
    setNotes(
      notes.map((note) =>
        note.id === id ? { ...note, folder: 'trash' } : note
      )
    );
    setSwipeActiveId(null);
    alert('Nota movida a la Papelera.');
  };

  const handlePermanentDelete = (id: string, e: any) => {
    e.stopPropagation();
    setNotes(notes.filter((n) => n.id !== id));
    setSwipeActiveId(null);
    alert('Nota eliminada permanentemente.');
  };

  // Filter application
  const filteredNotes = notes.filter((note) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!note.title.toLowerCase().includes(q) && !note.content.toLowerCase().includes(q)) {
        return false;
      }
    }

    // 2. Folder/Filter Toggles
    if (activeFilter === 'trash') {
      return note.folder === 'trash';
    } else {
      if (note.folder !== 'notes') return false;
      
      if (activeFilter === 'favorite') return note.isFavorite;
      if (activeFilter === 'reminder') return !!note.reminderDate;
      if (activeFilter === 'recent') {
        // Assume notes updated in the last 2 days
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 2);
        return new Date(note.updatedAt) >= limitDate;
      }
    }

    return true;
  });

  // Sort application
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (sortOption === 'alpha') {
      return a.title.localeCompare(b.title);
    }
    if (sortOption === 'created') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const handleSelectSort = () => {
    const options: Array<typeof sortOption> = ['updated', 'created', 'alpha'];
    const nextIdx = (options.indexOf(sortOption) + 1) % options.length;
    setSortOption(options[nextIdx]);
  };

  const getSortLabel = () => {
    if (sortOption === 'alpha') return 'A-Z';
    if (sortOption === 'created') return 'Creado';
    return 'Modificado';
  };

  // Open a note, asking for the PIN when it is protected
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

  const hasNotes = sortedNotes.length > 0;

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header toolbar */}
        <View style={styles.header}>
          <View style={styles.headerLeftCol}>
            {router.canGoBack && (
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
                <ChevronLeft size={24} color={colors.neutral.text} />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>Mis Notas</Text>
          </View>

          <View style={styles.headerRightCol}>
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />

            <TouchableOpacity onPress={handleSelectSort} style={styles.sortToggleBtn} activeOpacity={0.7}>
              <ArrowUpDown size={16} color={colors.brand.primary} style={{ marginRight: 4 }} />
              <Text style={styles.sortToggleText}>{getSortLabel()}</Text>
            </TouchableOpacity>

            {/* Create action in the header while embedded (instead of a FAB) */}
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

        {/* Horizontal Navigation filter chips */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            {[
              { id: 'all', label: 'Todas' },
              { id: 'recent', label: 'Recientes' },
              { id: 'reminder', label: 'Con recordatorio' },
              { id: 'favorite', label: 'Favoritas' },
              { id: 'trash', label: 'Papelera' },
            ].map((chip) => {
              const isActive = activeFilter === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => {
                    setActiveFilter(chip.id as any);
                    setSwipeActiveId(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Notes listing area */}
        {hasNotes ? (
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            {viewMode === 'grid' ? (
              <NotesGridView notes={sortedNotes} protectedIds={protectedIds} onOpen={handleOpenNote} />
            ) : (
              sortedNotes.map((note, index) => (
                <NoteListRow
                  key={note.id}
                  note={note}
                  isProtected={protectedIds.includes(note.id)}
                  showSeparator={index < sortedNotes.length - 1}
                  onPress={() => handleOpenNote(note.id)}
                  onToggleFavorite={(e) => handleToggleFavorite(note.id, e)}
                />
              ))
            )}
            <View style={{ height: 120 }} />
          </ScrollView>
        ) : (
          // Empty State Layout
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <FolderOpen size={40} color={colors.neutral.gray500} />
            </View>
            <Text style={styles.emptyTitle}>Sin Notas</Text>
            <Text style={styles.emptyDesc}>
              No hay notas en esta carpeta. Haz clic en el botón flotante para escribir una nota nueva.
            </Text>
          </View>
        )}

        {/* Create Note FAB - standalone only: embedded it lives in the header */}
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

        {/* PIN required to open a protected note */}
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

        {/* Tab Menu navigation */}
        {!router.embedded && <FloatingTabBar activeTab="home" />}
      </View>
    </ScreenSafeArea>
  );
}