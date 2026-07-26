import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useModuleNav, useScreenParams } from '../../../src/components/embedded/EmbeddedNavContext';
import { colors } from '@beeapp/design-system';
import {
  ChevronLeft,
  Star,
  Clock,
  Check,
  X,
  Palette,
  Lock,
  LockOpen,
} from 'lucide-react-native';
import FloatingTabBar from '../../../src/components/FloatingTabBar';
import { hasPin, isProtected, setProtected } from '../../../src/stores/pinStore';

const COLOR_TAGS = [
  '#A78BFA', // Purple
  '#F472B6', // Pink
  '#60A5FA', // Blue
  '#FB923C', // Orange
  '#34D399', // Green
  '#9CA3AF', // Gray
];

interface NoteItem {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  isFavorite: boolean;
  colorTag: string;
  reminderDate?: string;
}

export default function NoteEditScreen() {
  const router = useModuleNav();
  const { id } = useScreenParams();

  // Mock pool of notes to pre-populate if ID matches
  const mockNotes: NoteItem[] = [
    {
      id: 'n1',
      title: 'Ideas campaña de Marketing',
      content: '1. Usar videos de formato corto en TikTok sobre BeeApp.\n2. Contactar micro-influencers del sector Pymes.\n3. Crear descuentos por recomendación directa.',
      updatedAt: '2026-07-23T10:00:00Z',
      isFavorite: true,
      colorTag: '#A78BFA',
    },
    {
      id: 'n2',
      title: 'Lista de compras corporativas',
      content: 'Comprar los siguientes insumos para la oficina de Bogotá:\n- 3 resmas de papel carta.\n- Cafetera nueva de filtro.\n- Teclados y mouse ergonómicos.',
      updatedAt: '2026-07-22T14:30:00Z',
      isFavorite: false,
      colorTag: '#F472B6',
      reminderDate: '28 Jul, 2026 • 10:00 AM',
    },
    {
      id: 'n3',
      title: 'Estrategia de Ventas Q4',
      content: 'Definir metas de equipo y metas individuales. Implementar el nuevo CRM. Mejorar los tiempos de respuesta del soporte BeeAI.',
      updatedAt: '2026-07-21T09:00:00Z',
      isFavorite: true,
      colorTag: '#60A5FA',
    },
    {
      id: 'n4',
      title: 'Claves del Servidor Temp',
      content: 'Claves temporales para base de datos local y puertos habilitados en el router corporativo. Eliminar este archivo el lunes.',
      updatedAt: '2026-07-19T17:15:00Z',
      isFavorite: false,
      colorTag: '#FB923C',
    },
  ];

  const matchedNote = mockNotes.find((n) => n.id === id);

  // States
  const [title, setTitle] = useState(matchedNote ? matchedNote.title : '');
  const [content, setContent] = useState(matchedNote ? matchedNote.content : '');
  const [isFavorite, setIsFavorite] = useState(matchedNote ? matchedNote.isFavorite : false);
  const [colorTag, setColorTag] = useState(matchedNote ? matchedNote.colorTag : COLOR_TAGS[0]);
  const [reminder, setReminder] = useState(matchedNote ? matchedNote.reminderDate : '');
  const [showReminderField, setShowReminderField] = useState(!!(matchedNote && matchedNote.reminderDate));

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      alert('La nota está vacía y no se guardará.');
      router.back();
      return;
    }
    alert('Nota guardada con éxito.');
    router.replace('/(main)/notes');
  };

  // PIN protection of this note (mock global store)
  const noteId = id as string | undefined;
  const [isNoteProtected, setIsNoteProtected] = useState(noteId ? isProtected(noteId) : false);

  const handleToggleProtection = () => {
    if (!noteId) {
      alert('Guarda la nota primero para poder protegerla con tu PIN.');
      return;
    }
    if (!hasPin()) {
      alert('Aún no tienes PIN de protección. Créalo en Perfil → Seguridad.');
      return;
    }
    const next = !isNoteProtected;
    setProtected(noteId, next);
    setIsNoteProtected(next);
    alert(next ? 'Nota protegida con tu PIN.' : 'Protección retirada de la nota.');
  };

  const handleToggleReminder = () => {
    if (showReminderField) {
      setReminder('');
      setShowReminderField(false);
    } else {
      setReminder('25 Jul, 2026 • 14:00');
      setShowReminderField(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.neutral.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{id ? 'Editar Nota' : 'Nueva Nota'}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn} activeOpacity={0.8}>
            <Check size={20} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Note Title Input */}
          <TextInput
            style={styles.titleInput}
            placeholder="Título de la nota..."
            placeholderTextColor={colors.neutral.gray500}
            value={title}
            onChangeText={setTitle}
          />

          {/* Inline configuration row (Color & Fav) */}
          <View style={styles.metaConfigRow}>
            {/* Color tags list selector */}
            <View style={styles.colorSelectorCol}>
              <Palette size={14} color={colors.neutral.gray600} style={{ marginRight: 6 }} />
              <View style={styles.colorsGridRow}>
                {COLOR_TAGS.map((col) => {
                  const isSelected = colorTag === col;
                  return (
                    <TouchableOpacity
                      key={col}
                      style={[styles.colorCircle, { backgroundColor: col }, isSelected && styles.colorCircleSelected]}
                      onPress={() => setColorTag(col)}
                      activeOpacity={0.8}
                    />
                  );
                })}
              </View>
            </View>

            {/* Favorite toggle */}
            <TouchableOpacity
              onPress={() => setIsFavorite(!isFavorite)}
              style={[styles.favToggleBtn, isFavorite && styles.favToggleBtnActive]}
              activeOpacity={0.8}
            >
              <Star
                size={14}
                color={isFavorite ? '#F59E0B' : colors.neutral.gray600}
                fill={isFavorite ? '#F59E0B' : 'transparent'}
              />
              <Text style={[styles.favToggleText, isFavorite && styles.favToggleTextActive]}>
                {isFavorite ? 'Favorita' : 'Destacar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Reminder Toggle row */}
          <View style={styles.reminderRow}>
            <TouchableOpacity
              style={[styles.reminderBtn, showReminderField && styles.reminderBtnActive]}
              onPress={handleToggleReminder}
              activeOpacity={0.8}
            >
              <Clock size={14} color={showReminderField ? '#D97706' : colors.neutral.gray600} style={{ marginRight: 6 }} />
              <Text style={[styles.reminderBtnText, showReminderField && styles.reminderBtnTextActive]}>
                {showReminderField ? 'Con Recordatorio' : 'Añadir Recordatorio'}
              </Text>
            </TouchableOpacity>

            {showReminderField && (
              <View style={styles.reminderFieldBox}>
                <TextInput
                  style={styles.reminderFieldInput}
                  placeholder="Ej: 28 Jul, 2026 • 10:00 AM"
                  placeholderTextColor={colors.neutral.gray500}
                  value={reminder}
                  onChangeText={setReminder}
                />
                <TouchableOpacity onPress={() => handleToggleReminder()} style={{ padding: 2 }}>
                  <X size={12} color={colors.neutral.gray500} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* PIN protection toggle */}
          <TouchableOpacity
            style={[styles.protectRow, isNoteProtected && styles.protectRowActive]}
            onPress={handleToggleProtection}
            activeOpacity={0.8}
          >
            <View style={[styles.protectIconWrap, isNoteProtected && styles.protectIconWrapActive]}>
              {isNoteProtected ? (
                <Lock size={16} color={colors.neutral.white} />
              ) : (
                <LockOpen size={16} color={colors.neutral.gray600} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.protectTitle, isNoteProtected && styles.protectTitleActive]}>
                {isNoteProtected ? 'Protegida con PIN' : 'Proteger con PIN'}
              </Text>
              <Text style={styles.protectDesc}>
                {isNoteProtected
                  ? 'Se pedirá tu PIN de 4 dígitos para abrir esta nota.'
                  : 'Pide tu PIN de 4 dígitos cada vez que se abra esta nota.'}
              </Text>
            </View>
            <Text style={[styles.protectAction, isNoteProtected && styles.protectActionActive]}>
              {isNoteProtected ? 'Quitar' : 'Activar'}
            </Text>
          </TouchableOpacity>

          {/* Body Content Text multiline input */}
          <TextInput
            style={styles.bodyInput}
            placeholder="Empieza a escribir tus notas, recordatorios o tareas corporativas aquí..."
            placeholderTextColor={colors.neutral.gray500}
            multiline
            value={content}
            onChangeText={setContent}
          />

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Tab Menu navigation */}
        {!router.embedded && <FloatingTabBar activeTab="home" />}
      </View>
    </SafeAreaView>
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
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.neutral.text,
  },
  saveHeaderBtn: {
    padding: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.neutral.text,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.neutral.gray200,
    marginBottom: 16,
  },
  metaConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  colorSelectorCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorsGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: colors.neutral.text,
    transform: [{ scale: 1.15 }],
  },
  favToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  favToggleBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  favToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray700,
    marginLeft: 6,
  },
  favToggleTextActive: {
    color: '#D97706',
    fontWeight: 'bold',
  },
  reminderRow: {
    marginBottom: 20,
    gap: 8,
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  reminderBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  reminderBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.gray700,
  },
  reminderBtnTextActive: {
    color: '#D97706',
    fontWeight: 'bold',
  },
  reminderFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reminderFieldInput: {
    flex: 1,
    fontSize: 12,
    color: colors.neutral.text,
    fontWeight: '600',
    paddingVertical: 2,
  },
  protectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 10,
  },
  protectRowActive: {
    borderColor: colors.brand.primary,
    backgroundColor: '#FBFBFF',
  },
  protectIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  protectIconWrapActive: {
    backgroundColor: colors.brand.primary,
  },
  protectTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  protectTitleActive: {
    color: colors.brand.primary,
  },
  protectDesc: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.neutral.gray600,
    marginTop: 2,
    lineHeight: 14,
  },
  protectAction: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
  },
  protectActionActive: {
    color: colors.brand.primary,
  },
  bodyInput: {
    backgroundColor: colors.neutral.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
    padding: 16,
    fontSize: 14,
    color: colors.neutral.text,
    lineHeight: 22,
    fontWeight: '500',
    minHeight: 280,
    textAlignVertical: 'top',
  },
});
