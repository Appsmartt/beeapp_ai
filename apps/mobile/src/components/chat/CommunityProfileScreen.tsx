import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, radii } from '@beeapp/design-system';
import { ChevronLeft, BellOff, LogOut, Trash2 } from 'lucide-react-native';
import ScreenSafeArea from '../layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../embedded/EmbeddedNavContext';
import ChatProfileRow from './ChatProfileRow';
import MemberListSection from './MemberListSection';
import AddMemberModal from './AddMemberModal';
import { getCommunity, isCommunityAdmin, CommunityMember, COMMUNITY_CATEGORIES } from '../../mocks/communities';

/** Profile of a community: info, privacy, members and actions */
export default function CommunityProfileScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const community = getCommunity(params.id as string);

  const [name, setName] = useState(community?.name ?? '');
  const [description, setDescription] = useState(community?.description ?? '');
  const [category, setCategory] = useState(community?.category ?? COMMUNITY_CATEGORIES[0]);
  const [members, setMembers] = useState<CommunityMember[]>(community?.members ?? []);
  const [muted, setMuted] = useState(false);
  const [addMemberVisible, setAddMemberVisible] = useState(false);

  if (!community) return null;

  const isAdmin = isCommunityAdmin(community);

  const confirm = (title: string, message: string) =>
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'destructive' },
    ]);

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.neutral.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Perfil de la comunidad</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <View style={[styles.avatar, { backgroundColor: community.color }]}>
            <Text style={styles.avatarText}>{community.initials}</Text>
          </View>

          {isAdmin ? (
            <TextInput
              style={[styles.name, styles.editable]}
              value={name}
              onChangeText={setName}
              placeholder="Nombre de la comunidad"
              placeholderTextColor={colors.neutral.gray500}
              textAlign="center"
            />
          ) : (
            <Text style={styles.name}>{name}</Text>
          )}

          {isAdmin ? (
            <TextInput
              style={[styles.description, styles.editable]}
              value={description}
              onChangeText={setDescription}
              placeholder="¿De qué trata la comunidad?"
              placeholderTextColor={colors.neutral.gray500}
              textAlign="center"
              multiline
            />
          ) : (
            <Text style={styles.description}>{description}</Text>
          )}

          <Text style={styles.memberCount}>
            {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Category: only the admin can change it */}
        <View style={styles.categoryRow}>
          {COMMUNITY_CATEGORIES.map((option) => {
            const isActive = category === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => isAdmin && setCategory(option)}
                disabled={!isAdmin}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        <MemberListSection
          members={members}
          canManage={isAdmin}
          onAdd={() => setAddMemberVisible(true)}
          onRemove={(memberId) => setMembers((list) => list.filter((m) => m.id !== memberId))}
        />

        <View style={styles.divider} />

        <ChatProfileRow
          icon={BellOff}
          label="Silenciar notificaciones"
          switchValue={muted}
          onSwitchChange={setMuted}
        />

        <View style={styles.divider} />

        <ChatProfileRow
          icon={LogOut}
          label="Salir de la comunidad"
          danger
          onPress={() => confirm('Salir de la comunidad', '¿Seguro que quieres salir de esta comunidad?')}
        />

        {isAdmin && (
          <ChatProfileRow
            icon={Trash2}
            label="Eliminar comunidad"
            danger
            onPress={() =>
              confirm('Eliminar comunidad', 'Esta acción eliminaría la comunidad para todos sus miembros.')
            }
          />
        )}
      </ScrollView>

      <AddMemberModal
        visible={addMemberVisible}
        memberIds={members.map((m) => m.id)}
        onAdd={(added) => {
          setMembers((list) => [...list, ...added]);
          setAddMemberVisible(false);
        }}
        onClose={() => setAddMemberVisible(false)}
      />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.neutral.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backBtn: { padding: 4 },
  topBarTitle: { fontSize: 16, fontWeight: '600', color: colors.neutral.text },
  content: { paddingBottom: 140 },
  head: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '600', color: colors.brand.primary },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },
  // Inline editing keeps the same look, just a hairline underneath
  editable: {
    minWidth: 200,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  memberCount: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.gray600,
    marginTop: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.lg,
    backgroundColor: colors.neutral.gray100,
  },
  categoryChipActive: { backgroundColor: colors.brand.primary },
  categoryText: { fontSize: 13, fontWeight: '400', color: colors.neutral.text },
  categoryTextActive: { color: colors.neutral.white, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.neutral.gray100, marginVertical: spacing.xs },
});
