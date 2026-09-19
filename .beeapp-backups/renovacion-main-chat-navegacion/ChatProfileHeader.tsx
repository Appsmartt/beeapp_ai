import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { Camera } from 'lucide-react-native';

interface ChatProfileHeaderProps {
  isGroup: boolean;
  name: string;
  /** Only groups can rename themselves inline */
  onChangeName: (name: string) => void;
  /** Cargo y empresa (individual) o conteo de miembros (grupo) */
  meta: string;
  initials: string;
  /** Mock: groups can "change" the photo, nothing is uploaded */
  onChangePhoto: () => void;
}

/** Avatar, name and secondary info at the top of the chat profile */
export default function ChatProfileHeader({
  isGroup,
  name,
  onChangeName,
  meta,
  initials,
  onChangePhoto,
}: ChatProfileHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {isGroup && (
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={onChangePhoto}
            activeOpacity={0.8}
            accessibilityLabel="Cambiar la foto del grupo"
          >
            <Camera size={16} color={colors.neutral.white} />
          </TouchableOpacity>
        )}
      </View>

      {isGroup ? (
        <TextInput
          style={[styles.name, styles.nameInput]}
          value={name}
          onChangeText={onChangeName}
          placeholder="Nombre del grupo"
          placeholderTextColor={colors.neutral.gray500}
          textAlign="center"
        />
      ) : (
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      )}

      <Text style={styles.meta} numberOfLines={2}>
        {meta}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  cameraBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.neutral.white,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  // Inline editing keeps the same look, just a hairline underneath
  nameInput: {
    minWidth: 180,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  meta: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 6,
    textAlign: 'center',
  },
});
