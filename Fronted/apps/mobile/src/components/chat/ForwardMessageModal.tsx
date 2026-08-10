import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Search, X, Forward, Check } from 'lucide-react-native';
import { colors } from '@beeapp/design-system';
import { MOCK_CHATS } from '../../mocks/chats';

interface ForwardMessageModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectChat: (chatName: string) => void;
}

export default function ForwardMessageModal({
  visible,
  onClose,
  onSelectChat,
}: ForwardMessageModalProps) {
  const [search, setSearch] = useState('');

  const filteredChats = MOCK_CHATS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <Forward size={18} color={colors.brand.primary} />
                  <Text style={styles.headerTitle}>Reenviar mensaje a...</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={18} color={colors.neutral.gray500} />
                </TouchableOpacity>
              </View>

              {/* Search input */}
              <View style={styles.searchWrap}>
                <Search size={16} color={colors.neutral.gray400} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar chat..."
                  placeholderTextColor={colors.neutral.gray400}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

              {/* Chats List */}
              <ScrollView style={styles.chatList} showsVerticalScrollIndicator={false}>
                {filteredChats.map((chat) => (
                  <TouchableOpacity
                    key={chat.id}
                    style={styles.chatRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelectChat(chat.name);
                      onClose();
                    }}
                  >
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{chat.name[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.chatInfo}>
                      <Text style={styles.chatName}>{chat.name}</Text>
                      <Text style={styles.chatLastMsg} numberOfLines={1}>
                        {chat.lastMessage}
                      </Text>
                    </View>
                    <Forward size={16} color={colors.neutral.gray400} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: 20,
    maxHeight: 440,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  closeBtn: {
    padding: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray100,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral.text,
  },
  chatList: {
    maxHeight: 300,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.brand.primary,
  },
  chatInfo: {
    flex: 1,
    marginRight: 8,
  },
  chatName: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.text,
  },
  chatLastMsg: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.neutral.gray500,
    marginTop: 1,
  },
});
