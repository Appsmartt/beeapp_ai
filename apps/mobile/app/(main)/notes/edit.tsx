import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import ScreenSafeArea from '../../../src/components/layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import { ChevronLeft, Check, Trash2, Eye, Pencil } from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import NoteEditMeta from '../../../src/components/notes/NoteEditMeta';
import NoteCategoryChips from '../../../src/components/notes/NoteCategoryChips';
import NoteFormatToolbar, { FormatAction } from '../../../src/components/notes/NoteFormatToolbar';
import NoteMarkdownText from '../../../src/components/notes/NoteMarkdownText';
import {
  noteEditStyles as styles,
  noteEditExtraStyles as extra,
} from '../../../src/components/notes/noteEditStyles';
import {
  insertAtCursor,
  nextListNumber,
  toggleLinePrefix,
  TextSelection,
  wordCount,
  wrapSelection,
} from '../../../src/components/notes/noteFormat';
import { MOCK_MODULE_NOTES } from '../../../src/mocks/notesModule';
import { hasPin, isProtected, setProtected } from '../../../src/stores/pinStore';

export default function NoteEditScreen() {
  const router = useModuleNav();
  const { id } = useScreenParams();
  const noteId = id as string | undefined;
  const note = MOCK_MODULE_NOTES.find((item) => item.id === noteId);

  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0 });
  /** Solo se pasa al TextInput justo después de dar formato, para mover el cursor */
  const [pendingSelection, setPendingSelection] = useState<TextSelection | undefined>();
  const [categoryIds, setCategoryIds] = useState<string[]>(note?.categoryId ? [note.categoryId] : []);
  const [preview, setPreview] = useState(false);

  const [isFavorite, setIsFavorite] = useState(note?.isFavorite ?? false);
  const [reminder, setReminder] = useState(note?.reminderDate ?? '');
  const [showReminder, setShowReminder] = useState(!!note?.reminderDate);
  const [noteProtected, setNoteProtected] = useState(noteId ? isProtected(noteId) : false);

  /** Aplica el formato sobre lo que hay seleccionado en el TextInput */
  const applyFormat = (action: FormatAction) => {
    const result = (() => {
      switch (action) {
        case 'bold':
          return wrapSelection(content, selection, '**');
        case 'italic':
          return wrapSelection(content, selection, '*');
        case 'bullet':
          return toggleLinePrefix(content, selection, '- ');
        case 'numbered':
          return toggleLinePrefix(content, selection, `${nextListNumber(content, selection.start)}. `);
        case 'heading':
          return toggleLinePrefix(content, selection, '## ');
        case 'link':
          return insertAtCursor(content, selection, '[texto](https://ejemplo.com)');
        case 'image':
          return insertAtCursor(content, selection, '[imagen]');
      }
    })();

    setContent(result.text);
    setSelection(result.selection);
    setPendingSelection(result.selection);
  };

  /** El enlace pide la URL; `Alert.prompt` solo existe en iOS */
  const handleLink = () => {
    if (Platform.OS !== 'ios') {
      applyFormat('link');
      return;
    }
    Alert.prompt('URL:', undefined, (url) => {
      const result = insertAtCursor(content, selection, `[texto](${url || 'https://ejemplo.com'})`);
      setContent(result.text);
      setSelection(result.selection);
      setPendingSelection(result.selection);
    });
  };

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      alert('La nota está vacía y no se guardará.');
      router.back();
      return;
    }
    alert('Nota guardada con éxito.');
    router.replace('/(main)/notes');
  };

  const handleToggleProtection = () => {
    if (!noteId) {
      alert('Guarda la nota primero para poder protegerla con tu PIN.');
      return;
    }
    if (!hasPin()) {
      alert('Aún no tienes PIN de protección. Créalo en Perfil → Seguridad.');
      return;
    }
    const next = !noteProtected;
    setProtected(noteId, next);
    setNoteProtected(next);
  };

  const handleToggleReminder = () => {
    setShowReminder(!showReminder);
    setReminder(showReminder ? '' : '25 Jul, 2026 • 14:00');
  };

  const handleDelete = () => {
    Alert.alert('¿Eliminar esta nota?', 'Esta acción eliminará la nota de tus registros.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => router.replace('/(main)/notes'),
      },
    ]);
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{noteId ? 'Editar Nota' : 'Nueva Nota'}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={() => setPreview(!preview)}
              style={styles.saveHeaderBtn}
              accessibilityLabel={preview ? 'Editar' : 'Vista previa'}
              activeOpacity={0.7}
            >
              {preview ? (
                <Pencil size={19} color={colors.neutral.text} />
              ) : (
                <Eye size={19} color={colors.neutral.text} />
              )}
            </TouchableOpacity>

            {!!noteId && (
              <TouchableOpacity onPress={handleDelete} style={styles.saveHeaderBtn} activeOpacity={0.7}>
                <Trash2 size={20} color={colors.semantic.error} />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn} activeOpacity={0.8}>
              <Check size={20} color={colors.brand.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <TextInput
            style={styles.titleInput}
            placeholder="Título de la nota..."
            placeholderTextColor={colors.neutral.gray500}
            value={title}
            onChangeText={setTitle}
          />

          <View style={extra.chipsRow}>
            <NoteCategoryChips value={categoryIds} onChange={setCategoryIds} />
          </View>

          <View style={extra.divider} />

          <NoteEditMeta
            isFavorite={isFavorite}
            onToggleFavorite={() => setIsFavorite(!isFavorite)}
            reminder={reminder}
            onChangeReminder={setReminder}
            showReminder={showReminder}
            onToggleReminder={handleToggleReminder}
            isProtected={noteProtected}
            onToggleProtection={handleToggleProtection}
          />

          {preview ? (
            <View style={extra.previewBox}>
              <NoteMarkdownText content={content} />
            </View>
          ) : (
            <TextInput
              style={styles.bodyInput}
              placeholder="Empieza a escribir. Usa la barra de abajo para dar formato..."
              placeholderTextColor={colors.neutral.gray500}
              multiline
              value={content}
              onChangeText={setContent}
              selection={pendingSelection}
              onSelectionChange={(event) => {
                setSelection(event.nativeEvent.selection);
                setPendingSelection(undefined);
              }}
            />
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {!preview && (
          <NoteFormatToolbar
            onAction={(action) => (action === 'link' ? handleLink() : applyFormat(action))}
            words={wordCount(content)}
          />
        )}

        {!router.embedded && <FloatingTabBar activeTab="home" />}
      </View>
    </ScreenSafeArea>
  );
}
