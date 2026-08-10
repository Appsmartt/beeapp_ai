import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { colors } from '@beeapp/design-system';
import { Star, Clock, X, Lock, LockOpen } from 'lucide-react-native';
import { noteEditStyles as styles } from './noteEditStyles';

interface NoteEditMetaProps {
  isFavorite: boolean;
  onToggleFavorite: () => void;
  reminder: string;
  onChangeReminder: (value: string) => void;
  showReminder: boolean;
  onToggleReminder: () => void;
  isProtected: boolean;
  onToggleProtection: () => void;
}

/** Color, favorita, recordatorio y protección con PIN de la nota */
export default function NoteEditMeta(props: NoteEditMetaProps) {
  return (
    <>
      <View style={styles.metaConfigRow}>
        <TouchableOpacity
          onPress={props.onToggleFavorite}
          style={[styles.favToggleBtn, props.isFavorite && styles.favToggleBtnActive]}
          activeOpacity={0.8}
        >
          <Star
            size={14}
            color={props.isFavorite ? '#F59E0B' : colors.neutral.gray600}
            fill={props.isFavorite ? '#F59E0B' : 'transparent'}
          />
          <Text style={[styles.favToggleText, props.isFavorite && styles.favToggleTextActive]}>
            {props.isFavorite ? 'Favorita' : 'Destacar'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.reminderRow}>
        <TouchableOpacity
          style={[styles.reminderBtn, props.showReminder && styles.reminderBtnActive]}
          onPress={props.onToggleReminder}
          activeOpacity={0.8}
        >
          <Clock
            size={14}
            color={props.showReminder ? '#D97706' : colors.neutral.gray600}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.reminderBtnText, props.showReminder && styles.reminderBtnTextActive]}>
            {props.showReminder ? 'Con Recordatorio' : 'Añadir Recordatorio'}
          </Text>
        </TouchableOpacity>

        {props.showReminder && (
          <View style={styles.reminderFieldBox}>
            <TextInput
              style={styles.reminderFieldInput}
              placeholder="Ej: 28 Jul, 2026 • 10:00 AM"
              placeholderTextColor={colors.neutral.gray500}
              value={props.reminder}
              onChangeText={props.onChangeReminder}
            />
            <TouchableOpacity onPress={props.onToggleReminder} style={{ padding: 2 }}>
              <X size={12} color={colors.neutral.gray500} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.protectRow, props.isProtected && styles.protectRowActive]}
        onPress={props.onToggleProtection}
        activeOpacity={0.8}
      >
        <View style={[styles.protectIconWrap, props.isProtected && styles.protectIconWrapActive]}>
          {props.isProtected ? (
            <Lock size={16} color={colors.neutral.white} />
          ) : (
            <LockOpen size={16} color={colors.neutral.gray600} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.protectTitle, props.isProtected && styles.protectTitleActive]}>
            {props.isProtected ? 'Protegida con PIN' : 'Proteger con PIN'}
          </Text>
          <Text style={styles.protectDesc}>
            Pide tu PIN de 4 dígitos cada vez que se abra esta nota.
          </Text>
        </View>
        <Text style={[styles.protectAction, props.isProtected && styles.protectActionActive]}>
          {props.isProtected ? 'Quitar' : 'Activar'}
        </Text>
      </TouchableOpacity>
    </>
  );
}
