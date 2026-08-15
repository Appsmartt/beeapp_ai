import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  colors,
} from '@beeapp/design-system';
import {
  FolderOpen,
} from 'lucide-react-native';

import type {
  NoteListItem,
} from '../../services/notesService';
import type {
  ViewMode,
} from '../layout/ViewModeToggle';
import NoteListRow from './NoteListRow';
import NotesGridView from './NotesGridView';
import {
  notesListStyles as styles,
} from './notesListStyles';

export type NotesFilter =
  | 'all'
  | 'recent'
  | 'favorite'
  | 'trash';

const CHIPS: {
  id: NotesFilter;
  label: string;
}[] = [
  {
    id: 'all',
    label: 'Todas',
  },
  {
    id: 'recent',
    label: 'Recientes',
  },
  {
    id: 'favorite',
    label: 'Favoritas',
  },
  {
    id: 'trash',
    label: 'Papelera',
  },
];

interface NotesListViewProps {
  notes: NoteListItem[];
  viewMode: ViewMode;
  activeFilter: NotesFilter;
  onChangeFilter: (filter: NotesFilter) => void;
  onOpen: (id: string) => void;
  onLongPress: (note: NoteListItem) => void;
  onToggleFavorite: (
    id: string,
    event: unknown,
  ) => void;
}

/**
 * Lista de notas reales. Sus datos vienen del backend;
 * este componente solo se encarga de la presentación.
 */
export default function NotesListView({
  notes,
  viewMode,
  activeFilter,
  onChangeFilter,
  onOpen,
  onLongPress,
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
            const isActive =
              activeFilter === chip.id;

            return (
              <TouchableOpacity
                key={chip.id}
                style={[
                  styles.filterChip,
                  isActive
                    && styles.filterChipActive,
                ]}
                onPress={() =>
                  onChangeFilter(chip.id)
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive
                      && styles.filterChipTextActive,
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {notes.length > 0 ? (
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {viewMode === 'grid' ? (
            <NotesGridView
              notes={notes}
              onOpen={onOpen}
              onLongPress={onLongPress}
            />
          ) : (
            notes.map((note, index) => (
              <NoteListRow
                key={note.id}
                note={note}
                showSeparator={
                  index < notes.length - 1
                }
                onPress={() => onOpen(note.id)}
                onLongPress={() => onLongPress(note)}
                onToggleFavorite={(event) =>
                  onToggleFavorite(
                    note.id,
                    event,
                  )
                }
              />
            ))
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBg}>
            <FolderOpen
              size={40}
              color={colors.neutral.gray500}
            />
          </View>

          <Text style={styles.emptyTitle}>
            Sin notas
          </Text>

          <Text style={styles.emptyDesc}>
            No hay notas en esta vista. Crea una
            nueva nota para empezar.
          </Text>
        </View>
      )}
    </>
  );
}