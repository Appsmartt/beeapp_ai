import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useNavigation } from 'expo-router';
import { useModuleNav } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Plus, FolderOpen, ArrowUpDown } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import NoteListRow from '../../../src/components/notes/NoteListRow';
import PinLockModal from '../../../src/components/security/PinLockModal';
import { getProtectedIds, isProtected } from '../../../src/stores/pinStore';

const FAB_BOTTOM_OFFSET = 105; // Spacing offset to separate FAB from FloatingTabBar

interface NoteItem {
  id: string;
  title: string;
  content: string;
  updatedAt: string; // ISO String format
  createdAt: string; // ISO String format
  isFavorite: boolean;
  colorTag: string; // Hex representation
  reminderDate?: string; // Mock string date
  folder: 'notes' | 'trash';
}

export default function NotesListScreen() {
  const router = useModuleNav();

  // Layout states
  const [activeFilter, setActiveFilter] = useState<'all' | 'recent' | 'reminder' | 'favorite' | 'trash'>('all');
  // Search moved to the global Home search bar: the module keeps the filter dormant
  const [searchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'updated' | 'created' | 'alpha'>('updated');
  const [swipeActiveId, setSwipeActiveId] = useState<string | null>(null);

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
  const [notes, setNotes] = useState<NoteItem[]>([
    {
      id: 'n1',
      title: 'Ideas campaña de Marketing',
      content: '1. Usar videos de formato corto en TikTok sobre BeeApp.\n2. Contactar micro-influencers del sector Pymes.\n3. Crear descuentos por recomendación directa.',
      updatedAt: '2026-07-23T10:00:00Z',
      createdAt: '2026-07-20T08:00:00Z',
      isFavorite: true,
      colorTag: '#A78BFA', // Purple
      folder: 'notes',
    },
    {
      id: 'n2',
      title: 'Lista de compras corporativas',
      content: 'Comprar los siguientes insumos para la oficina de Bogotá:\n- 3 resmas de papel carta.\n- Cafetera nueva de filtro.\n- Teclados y mouse ergonómicos.',
      updatedAt: '2026-07-22T14:30:00Z',
      createdAt: '2026-07-22T14:00:00Z',
      isFavorite: false,
      colorTag: '#F472B6', // Pink
      reminderDate: '28 Jul • 10:00 AM',
      folder: 'notes',
    },
    {
      id: 'n3',
      title: 'Estrategia de Ventas Q4',
      content: 'Definir metas de equipo y metas individuales. Implementar el nuevo CRM. Mejorar los tiempos de respuesta del soporte BeeAI.',
      updatedAt: '2026-07-21T09:00:00Z',
      createdAt: '2026-07-15T11:00:00Z',
      isFavorite: true,
      colorTag: '#60A5FA', // Blue
      folder: 'notes',
    },
    {
      id: 'n4',
      title: 'Claves del Servidor Temp',
      content: 'Claves temporales para base de datos local y puertos habilitados en el router corporativo. Eliminar este archivo el lunes.',
      updatedAt: '2026-07-19T17:15:00Z',
      createdAt: '2026-07-19T17:00:00Z',
      isFavorite: false,
      colorTag: '#FB923C', // Orange
      folder: 'notes',
    },
    {
      id: 'n5',
      title: 'Nota borrada antigua',
      content: 'Esto es una prueba de papelera. Contenido viejo que ya no sirve y fue desechado por el usuario.',
      updatedAt: '2026-07-10T12:00:00Z',
      createdAt: '2026-07-10T12:00:00Z',
      isFavorite: false,
      colorTag: '#9CA3AF', // Gray
      folder: 'trash',
    },
  ]);

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
            {sortedNotes.map((note, index) => (
              <NoteListRow
                key={note.id}
                note={note}
                isProtected={protectedIds.includes(note.id)}
                isSwipeActive={swipeActiveId === note.id}
                showSeparator={index < sortedNotes.length - 1}
                onPress={() => handleOpenNote(note.id)}
                onLongPress={() => setSwipeActiveId(swipeActiveId === note.id ? null : note.id)}
                onToggleFavorite={(e) => handleToggleFavorite(note.id, e)}
                onDelete={(e) => {
                  if (activeFilter === 'trash') {
                    handlePermanentDelete(note.id, e);
                  } else {
                    handleDeleteNote(note.id, e);
                  }
                }}
              />
            ))}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.gray50,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  headerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray50,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  sortToggleText: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  filtersContainer: {
    paddingVertical: 10,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray100,
  },
  filtersScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.neutral.gray50,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  filterChipActive: {
    backgroundColor: colors.brand.primary + '15',
    borderColor: colors.brand.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray700,
  },
  filterChipTextActive: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 120,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 18,
  },
  headerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  createFab: {
    position: 'absolute',
    bottom: FAB_BOTTOM_OFFSET,
    right: 20,
    backgroundColor: colors.brand.primary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  createFabText: {
    color: colors.neutral.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
