import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Crown,
  Shield,
  UserPlus,
  X,
} from 'lucide-react-native';
import {
  colors,
  spacing,
} from '@beeapp/design-system';
import type {
  ChatParticipant,
  ChatParticipantRole,
} from '@beeapp/shared-types';

import type {
  GroupMember,
} from '../../mocks/chats';
import {
  getInitials,
} from '../../services/chatService';

interface RealGroupMemberListProps {
  members: ChatParticipant[];
  currentIdentityId: string | null;
  canInvite: boolean;
  canRemove: boolean;
  onAdd: () => void;
  onRemove: (
    identityId: string,
    displayName: string,
  ) => void;
  memberIds?: never;
}

interface MockCommunityMemberListProps {
  members: GroupMember[];
  canManage: boolean;
  onAdd: () => void;
  onRemove: (
    memberId: string,
  ) => void;
  currentIdentityId?: never;
  canInvite?: never;
  canRemove?: never;
}

type MemberListSectionProps =
  | RealGroupMemberListProps
  | MockCommunityMemberListProps;

function getRealDisplayName(
  participant: ChatParticipant,
): string {
  const name = [
    participant.user?.first_name,
    participant.user?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name || 'Usuario BeeApp';
}

function getRoleLabel(
  role: ChatParticipantRole,
): string {
  if (role === 'owner') {
    return 'Owner';
  }

  if (role === 'admin') {
    return 'Admin';
  }

  return 'Miembro';
}

function getRoleIcon(
  role: ChatParticipantRole,
) {
  if (role === 'owner') {
    return Crown;
  }

  if (role === 'admin') {
    return Shield;
  }

  return null;
}

function isRealGroupProps(
  props: MemberListSectionProps,
): props is RealGroupMemberListProps {
  return 'currentIdentityId' in props;
}

function RealGroupMemberList({
  members,
  currentIdentityId,
  canInvite,
  canRemove,
  onAdd,
  onRemove,
}: RealGroupMemberListProps) {
  const orderedMembers = [...members].sort(
    (left, right) => {
      const leftIsCurrent = (
        left.identity_id === currentIdentityId
      );

      const rightIsCurrent = (
        right.identity_id === currentIdentityId
      );

      if (leftIsCurrent !== rightIsCurrent) {
        return leftIsCurrent
          ? -1
          : 1;
      }

      const roleOrder: Record<
        ChatParticipantRole,
        number
      > = {
        owner: 0,
        admin: 1,
        member: 2,
      };

      const roleDifference = (
        roleOrder[left.role]
        - roleOrder[right.role]
      );

      if (roleDifference !== 0) {
        return roleDifference;
      }

      return getRealDisplayName(left).localeCompare(
        getRealDisplayName(right),
        'es',
      );
    },
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Miembros ({members.length})
        </Text>

        {canInvite ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAdd}
            activeOpacity={0.7}
          >
            <UserPlus
              size={16}
              color={colors.brand.primary}
            />

            <Text style={styles.addButtonText}>
              Agregar
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {orderedMembers.map((member) => {
        const name = getRealDisplayName(member);
        const isCurrentUser = (
          member.identity_id === currentIdentityId
        );

        const RoleIcon = getRoleIcon(member.role);

        const canRemoveThisMember = (
          canRemove
          && !isCurrentUser
          && member.role !== 'owner'
        );

        return (
          <View
            key={member.id}
            style={styles.row}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(name)}
              </Text>
            </View>

            <View style={styles.texts}>
              <Text
                style={styles.name}
                numberOfLines={1}
              >
                {name}
                {isCurrentUser ? ' · Tú' : ''}
              </Text>

              <View style={styles.roleRow}>
                {RoleIcon ? (
                  <RoleIcon
                    size={12}
                    color={
                      member.role === 'owner'
                        ? '#B7791F'
                        : colors.brand.primary
                    }
                  />
                ) : null}

                <Text style={styles.role}>
                  {getRoleLabel(member.role)}
                </Text>
              </View>
            </View>

            {canRemoveThisMember ? (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => {
                  onRemove(
                    member.identity_id,
                    name,
                  );
                }}
                activeOpacity={0.7}
                accessibilityLabel={`Quitar a ${name}`}
              >
                <X
                  size={18}
                  color={colors.neutral.gray500}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function MockCommunityMemberList({
  members,
  canManage,
  onAdd,
  onRemove,
}: MockCommunityMemberListProps) {
  const orderedMembers = [...members].sort(
    (left, right) => (
      Number(Boolean(right.isCurrentUser))
      - Number(Boolean(left.isCurrentUser))
    ),
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Miembros ({members.length})
        </Text>

        {canManage ? (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAdd}
            activeOpacity={0.7}
          >
            <UserPlus
              size={16}
              color={colors.brand.primary}
            />

            <Text style={styles.addButtonText}>
              Agregar
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {orderedMembers.map((member) => (
        <View
          key={member.id}
          style={styles.row}
        >
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: member.color,
              },
            ]}
          >
            <Text style={styles.avatarText}>
              {member.initials}
            </Text>
          </View>

          <View style={styles.texts}>
            <Text
              style={styles.name}
              numberOfLines={1}
            >
              {member.name}
              {member.isCurrentUser ? ' · Tú' : ''}
            </Text>

            <Text style={styles.role}>
              {member.role === 'admin'
                ? 'Admin'
                : 'Miembro'}
            </Text>
          </View>

          {canManage && member.role !== 'admin' ? (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(member.id)}
              activeOpacity={0.7}
              accessibilityLabel={`Quitar a ${member.name}`}
            >
              <X
                size={18}
                color={colors.neutral.gray500}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function MemberListSection(
  props: MemberListSectionProps,
) {
  if (isRealGroupProps(props)) {
    return <RealGroupMemberList {...props} />;
  }

  return <MockCommunityMemberList {...props} />;
}

const styles = StyleSheet.create({
  section: {
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  addButtonText: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.neutral.gray100,
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 10,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderColor: '#DDD6FE',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  avatarText: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  texts: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  name: {
    color: colors.neutral.text,
    fontSize: 14,
    fontWeight: '600',
  },
  roleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 3,
  },
  role: {
    color: colors.neutral.gray600,
    fontSize: 12,
    marginTop: 3,
  },
  removeButton: {
    padding: 6,
  },
});
