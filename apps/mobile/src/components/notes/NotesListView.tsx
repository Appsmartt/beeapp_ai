import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '@beeapp/design-system';
import { FolderOpen } from 'lucide-react-native';
import NoteListRow from './NoteListRow';
import NotesGridView from './NotesGridView';
import { notesListStyles as styles } from './notesListStyles';
import { NoteItem } from '../../mocks/notesModule';
import { ViewMode } from '../layout/ViewModeToggle';

export type NotesFilter = 'all' | 'recent' | 'reminder' | 'favorite' | 'trash';

const CHIPS: { id: NotesFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'recent', label: 'Recientes' },
  { id: 'reminder', label: 'Con recordatorio' },
  { id: 'favorite', label: 'Favoritas' },
  { id: 'trash', label: 'Papelera' },
];

interface NotesListViewProps {
  notes: NoteItem[];
  protectedIds: string[];
  viewMode: ViewMode;
  activeFilter: NotesFilter;
  onChangeFilter: (filter: NotesFilter) => void;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string, event: any) => void;
}

/** Lista de notas de una categoría: chips de filtro y filas o cuadrícula */
export default function NotesListView({
  notes,
  protectedIds,
  viewMode,
  activeFilter,
  onChangeFilter,
  onOpen,
  onToggleFavorite,
}: NotesListViewProps) {
  return (
    <>
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {CHIPS.map((chip) => {
            const isActive = activeFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => onChangeFilter(chip.id)}
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

      {notes.length > 0 ? (
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {viewMode === 'grid' ? (
            <NotesGridView notes={notes} protectedIds={protectedIds} onOpen={onOpen} />
          ) : (
            notes.map((note, index) => (
              <NoteListRow
                key={note.id}
                note={note}
                isProtected={protectedIds.includes(note.id)}
                showSeparator={index < notes.length - 1}
                onPress={() => onOpen(note.id)}
                onToggleFavorite={(event) => onToggleFavorite(note.id, event)}
              />
            ))
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <FolderOpen size={40} color={colors.neutral.gray500} />
          </View>
          <Text style={styles.emptyTitle}>Sin Notas</Text>
          <Text style={styles.emptyDesc}>
            No hay notas en esta categoría. Crea una nota nueva para empezar.
          </Text>
        </View>
      )}
    </>
  );
}
