import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing } from '@beeapp/design-system';
import { ChevronLeft, Timer, Search, BellOff, Image as ImageIcon, LogOut } from 'lucide-react-native';
import ScreenSafeArea from '../layout/ScreenSafeArea';
import { useModuleNav, useScreenParams } from '../embedded/EmbeddedNavContext';
import ChatProfileHeader from './ChatProfileHeader';
import ChatProfileRow from './ChatProfileRow';
import MemberListSection from './MemberListSection';
import AddMemberModal from './AddMemberModal';
import DisappearingMessagesModal, { DisappearingInterval, disappearingLabel } from './DisappearingMessagesModal';
import { MOCK_CHATS, GroupMember } from '../../mocks/chats';
import { MY_CONTACTS, ALL_CONTACT_DETAILS } from '../../mocks/contacts';
import SocialNetworksSection from '../profile/SocialNetworksSection';

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

/**
 * Profile of a chat, reached by tapping the avatar or the name in the
 * conversation header. Groups can be renamed and manage their members;
 * one-to-one chats only show the contact info. Everything is mock.
 */
export default function ChatProfileScreen() {
  const router = useModuleNav();
  const params = useScreenParams();
  const chatId = params.id as string;

  const chat = MOCK_CHATS.find((c) => c.id === chatId);
  const isGroup = !!chat?.isGroup;

  const [name, setName] = useState(chat?.name ?? 'Conversación');
  const [members, setMembers] = useState<GroupMember[]>(chat?.members ?? []);
  const [muted, setMuted] = useState(!!chat?.isMuted);

  // Disappearing messages: off by default, the interval only shows when on
  const [disappearingOn, setDisappearingOn] = useState(false);
  const [interval, setIntervalValue] = useState<DisappearingInterval>('24h');
  const [intervalModal, setIntervalModal] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);

  // The logged user is the admin of the mock group
  const isAdmin = members.some((m) => m.isCurrentUser && m.role === 'admin');

  const contact = MY_CONTACTS.find((c) => c.name === chat?.name);
  const meta = isGroup
    ? `${members.length} ${members.length === 1 ? 'miembro' : 'miembros'}`
    : [contact?.profession, contact?.company].filter(Boolean).join(' · ') || 'Contacto de BeeApp';

  const toggleDisappearing = (value: boolean) => {
    setDisappearingOn(value);
    // Turning it on asks right away for how often the messages disappear
    if (value) setIntervalModal(true);
  };

  const confirmLeave = () => {
    Alert.alert(
      isGroup ? 'Salir del grupo' : 'Eliminar chat',
      isGroup
        ? '¿Seguro que quieres salir de este grupo?'
        : '¿Seguro que quieres eliminar esta conversación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: isGroup ? 'Salir' : 'Eliminar', style: 'destructive' },
      ]
    );
  };

  return (
    <ScreenSafeArea style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.neutral.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{isGroup ? 'Perfil del grupo' : 'Perfil del contacto'}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ChatProfileHeader
          isGroup={isGroup}
          name={name}
          onChangeName={setName}
          meta={meta}
          initials={initialsOf(name)}
          onChangePhoto={() => Alert.alert('Foto del grupo', 'Aquí se elegiría una nueva foto (mock).')}
        />

        <View style={styles.divider} />

        <ChatProfileRow
          icon={Timer}
          label="Mensajes temporales"
          subtitle={disappearingOn ? disappearingLabel(interval) : 'Desactivado'}
          switchValue={disappearingOn}
          onSwitchChange={toggleDisappearing}
          onPress={disappearingOn ? () => setIntervalModal(true) : undefined}
        />

        {isGroup && (
          <>
            <View style={styles.divider} />
            <MemberListSection
              members={members}
              canManage={isAdmin}
              onAdd={() => setAddMemberModal(true)}
              onRemove={(memberId) => setMembers((list) => list.filter((m) => m.id !== memberId))}
            />
          </>
        )}

        <View style={styles.divider} />

        {/* Social Links for 1-on-1 */}
        {!isGroup && contact && (() => {
          const detail = ALL_CONTACT_DETAILS[contact.id];
          if (detail?.socialLinks) {
            return <SocialNetworksSection socialLinks={detail.socialLinks} />;
          }
          return null;
        })()}

        <View style={styles.divider} />

        <ChatProfileRow icon={Search} label="Buscar en la conversación" onPress={() => {}} />
        <ChatProfileRow
          icon={BellOff}
          label="Silenciar notificaciones"
          switchValue={muted}
          onSwitchChange={setMuted}
        />
        <ChatProfileRow icon={ImageIcon} label="Archivos multimedia compartidos" onPress={() => {}} />

        <View style={styles.divider} />

        <ChatProfileRow
          icon={LogOut}
          label={isGroup ? 'Salir del grupo' : 'Eliminar chat'}
          danger
          onPress={confirmLeave}
        />
      </ScrollView>

      <DisappearingMessagesModal
        visible={intervalModal}
        value={interval}
        onSave={(next) => {
          setIntervalValue(next);
          setIntervalModal(false);
        }}
        onClose={() => setIntervalModal(false)}
      />

      <AddMemberModal
        visible={addMemberModal}
        memberIds={members.map((m) => m.id)}
        onAdd={(added) => {
          setMembers((list) => [...list, ...added]);
          setAddMemberModal(false);
        }}
        onClose={() => setAddMemberModal(false)}
      />
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    padding: 4,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  content: {
    paddingBottom: 140,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.gray100,
    marginVertical: spacing.xs,
  },
});
