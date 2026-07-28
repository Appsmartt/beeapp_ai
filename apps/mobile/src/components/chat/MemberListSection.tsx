import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { UserPlus, X } from 'lucide-react-native';
import { GroupMember } from '../../mocks/chats';

interface MemberListSectionProps {
  members: GroupMember[];
  /** Only an admin can add or remove people */
  canManage: boolean;
  onAdd: () => void;
  onRemove: (memberId: string) => void;
}

const ROLE_LABEL: Record<GroupMember['role'], string> = {
  admin: 'Admin',
  member: 'Miembro',
};

/** Group members as flat rows, with the logged user first */
export default function MemberListSection({ members, canManage, onAdd, onRemove }: MemberListSectionProps) {
  const ordered = [...members].sort((a, b) => Number(!!b.isCurrentUser) - Number(!!a.isCurrentUser));

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Miembros ({members.length})</Text>

        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.7}>
            <UserPlus size={16} color={colors.brand.primary} />
            <Text style={styles.addBtnText}>Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      {ordered.map((member) => (
        <View key={member.id} style={styles.row}>
          <View style={[styles.avatar, { backgroundColor: member.color }]}>
            <Text style={styles.avatarText}>{member.initials}</Text>
          </View>

          <View style={styles.texts}>
            <Text style={styles.name} numberOfLines={1}>
              {member.name}
              {member.isCurrentUser ? ' · Tú' : ''}
            </Text>
            <Text style={styles.role}>{ROLE_LABEL[member.role]}</Text>
          </View>

          {canManage && member.role !== 'admin' && (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemove(member.id)}
              activeOpacity={0.7}
              accessibilityLabel={`Quitar a ${member.name}`}
            >
              <X size={18} color={colors.neutral.gray500} />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.primary,
  },
  texts: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  name: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  role: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 2,
  },
  removeBtn: {
    padding: 6,
  },
});
